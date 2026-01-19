(function () {
  "use strict";

  var Y = window.__YAVER_RES_ANALYZER_V1__;
  if (!Y) return;

  function ajaxGet(url) {
    var x = $.ajax({
      url: url,
      method: "GET",
      cache: false,
      timeout: 30000
    });
    Y._xhr.push(x);
    return new Promise(function (res, rej) {
      x.done(function (data) {
        res(String(data || ""));
      }).fail(function (jq, st, er) {
        rej(new Error("GET failed: " + url + " (" + (jq && jq.status) + " / " + st + ")"));
      });
    });
  }

  function toDoc(html) {
    var p = new DOMParser();
    return p.parseFromString(String(html || ""), "text/html");
  }

  function detectGroupIds(doc) {
    // Menüde [Parents] [Children] linkleri var (production/trader sayfalarında)
    var items = doc.querySelectorAll(Y.data.SELECTORS.groupMenuItems);
    var found = {};
    for (var i = 0; i < items.length; i++) {
      var el = items[i];
      var id = el.getAttribute("data-group-id");
      var txt = (el.textContent || "").trim();
      // "[Parents]" formatı
      var clean = txt.replace(/\[|\]/g, "").replace(/</g, "").replace(/>/g, "").trim();
      if (!id) continue;

      if (clean.toLowerCase() === Y.cfg.GROUP_NAME_PARENTS.toLowerCase()) found.parentsId = parseInt(id, 10);
      if (clean.toLowerCase() === Y.cfg.GROUP_NAME_CHILDREN.toLowerCase()) found.childrenId = parseInt(id, 10);
    }

    if (found.parentsId) Y.state.groups.parentsId = found.parentsId;
    if (found.childrenId) Y.state.groups.childrenId = found.childrenId;

    // cache
    try {
      localStorage.setItem("YRA.parentsId", String(Y.state.groups.parentsId));
      localStorage.setItem("YRA.childrenId", String(Y.state.groups.childrenId));
    } catch (e) {}

    return found;
  }

  function parseProduction(doc) {
    var rows = doc.querySelectorAll(Y.data.SELECTORS.productionRows);
    var list = [];
    for (var i = 0; i < rows.length; i++) {
      var tr = rows[i];
      var vn = tr.querySelector("span.quickedit-vn[data-id]");
      if (!vn) continue;

      var vid = parseInt(vn.getAttribute("data-id"), 10);
      if (!vid) continue;

      var nameEl = tr.querySelector(".quickedit-label");
      var name = nameEl ? (nameEl.textContent || "").trim() : ("village_" + vid);

      var tds = tr.querySelectorAll("td");
      if (!tds || tds.length < 6) continue;

      // columns: [0]=note, [1]=village, [2]=points, [3]=resources, [4]=warehouse, [5]=merchants
      var points = Y.util.toInt(tds[2] ? tds[2].textContent : "0");

      var rcell = tds[3];
      var woodEl = rcell ? rcell.querySelector(".res.wood") : null;
      var stoneEl = rcell ? rcell.querySelector(".res.stone") : null;
      var ironEl = rcell ? rcell.querySelector(".res.iron") : null;

      var wood = Y.util.parseRes(woodEl ? woodEl.textContent : "0");
      var stone = Y.util.parseRes(stoneEl ? stoneEl.textContent : "0");
      var iron = Y.util.parseRes(ironEl ? ironEl.textContent : "0");

      var storage = Y.util.parseRes(tds[4] ? tds[4].textContent : "0");

      var merchTxt = tds[5] ? tds[5].textContent : "";
      var pair = Y.util.parsePair(merchTxt);
      var merchAvail = pair.a;
      var merchTotal = pair.b;

      list.push({
        id: vid,
        name: name,
        points: points,
        wood: wood,
        stone: stone,
        iron: iron,
        storage: storage,
        merchAvail: merchAvail,
        merchTotal: merchTotal,
        urlOverview: (function () {
          // village link exists
          var a = tr.querySelector('a[href*="screen=overview"]');
          return a ? a.getAttribute("href") : ("/game.php?village=" + vid + "&screen=overview");
        })()
      });
    }
    return list;
  }

  function parseIncomingTransports(doc) {
    var rows = doc.querySelectorAll(Y.data.SELECTORS.tradesRows);
    var inc = new Map();

    function add(vid, w, s, ir) {
      if (!inc.has(vid)) inc.set(vid, { wood: 0, stone: 0, iron: 0 });
      var o = inc.get(vid);
      o.wood += w || 0;
      o.stone += s || 0;
      o.iron += ir || 0;
    }

    for (var i = 0; i < rows.length; i++) {
      var tr = rows[i];
      var tds = tr.querySelectorAll("td");
      if (!tds || tds.length < 5) continue;

      // direction icon in tds[1]
      var img = tds[1] ? tds[1].querySelector("img") : null;
      var title = img ? (img.getAttribute("title") || "") : "";
      if (title.toLowerCase().indexOf("incoming") === -1) continue;

      // recipient village link in tds[5]
      var vtd = tds[5];
      if (!vtd) continue;
      var va = vtd.querySelector('a[href*="info_village"]') || vtd.querySelector("a");
      if (!va) continue;
      var href = va.getAttribute("href") || "";
      var vid = Y.util.getParam(href, "id");
      if (!vid) continue;

      // resources in last td
      var resTd = tds[tds.length - 1];
      if (!resTd) continue;

      var w = 0, s = 0, ir = 0;
      var chunks = resTd.querySelectorAll("span.nowrap");
      for (var k = 0; k < chunks.length; k++) {
        var c = chunks[k];
        var icon = c.querySelector("span.icon.header");
        if (!icon) continue;

        var cls = icon.className || "";
        var val = Y.util.parseRes(c.textContent || "0");

        if (cls.indexOf("wood") >= 0) w += val;
        else if (cls.indexOf("stone") >= 0) s += val;
        else if (cls.indexOf("iron") >= 0) ir += val;
      }
      add(vid, w, s, ir);
    }

    return inc;
  }

  Y.fetch.loadAll = async function (onStep) {
    // 1) production(all) -> group id detect + all villages
    var prodAllUrl = Y.util.urlOverviewProd(0);
    var htmlAll = await ajaxGet(prodAllUrl);
    var docAll = toDoc(htmlAll);
    detectGroupIds(docAll);
    var allVill = parseProduction(docAll);

    // localStorage fallback (eğer menü parsing olmadıysa)
    try {
      var p = parseInt(localStorage.getItem("YRA.parentsId"), 10);
      var c = parseInt(localStorage.getItem("YRA.childrenId"), 10);
      if (p) Y.state.groups.parentsId = p;
      if (c) Y.state.groups.childrenId = c;
    } catch (e) {}

    if (typeof onStep === "function") onStep(1, 4, "Production (all) ok");

    // 2) production(parents) -> membership
    var prodParentsUrl = Y.util.urlOverviewProd(Y.state.groups.parentsId);
    var htmlP = await ajaxGet(prodParentsUrl);
    var docP = toDoc(htmlP);
    var parentsVill = parseProduction(docP);
    var parentsSet = new Set();
    parentsVill.forEach(function (v) { parentsSet.add(v.id); });
    Y.state.membership.parents = parentsSet;

    if (typeof onStep === "function") onStep(2, 4, "Production (Parents) ok");

    // 3) production(children) -> membership
    var prodChildrenUrl = Y.util.urlOverviewProd(Y.state.groups.childrenId);
    var htmlC = await ajaxGet(prodChildrenUrl);
    var docC = toDoc(htmlC);
    var childrenVill = parseProduction(docC);
    var childrenSet = new Set();
    childrenVill.forEach(function (v) { childrenSet.add(v.id); });
    Y.state.membership.children = childrenSet;

    if (typeof onStep === "function") onStep(3, 4, "Production (Children) ok");

    // 4) transports incoming
    var trUrl = Y.util.urlOverviewTraderInc();
    var htmlT = await ajaxGet(trUrl);
    var docT = toDoc(htmlT);
    var incoming = parseIncomingTransports(docT);
    Y.state.incoming = incoming;

    if (typeof onStep === "function") onStep(4, 4, "Transports (incoming) ok");

    // merge all villages to state map
    Y.state.villages = new Map();
    allVill.forEach(function (v) {
      v.group = parentsSet.has(v.id) ? "parents" : (childrenSet.has(v.id) ? "children" : "other");
      Y.state.villages.set(v.id, v);
    });

    return true;
  };
})();
