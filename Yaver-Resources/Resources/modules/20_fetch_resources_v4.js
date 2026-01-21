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
    var items = doc.querySelectorAll((Y.data && Y.data.SELECTORS && Y.data.SELECTORS.groupMenuItems) || ".group-menu-item[data-group-id], strong.group-menu-item[data-group-id]");
    var found = {};
    for (var i = 0; i < items.length; i++) {
      var el = items[i];
      var id = el.getAttribute("data-group-id");
      var txt = (el.textContent || "").trim();
      var clean = txt.replace(/\[|\]/g, "").trim();
      if (!id) continue;

      if (clean.toLowerCase() === Y.cfg.GROUP_NAME_PARENTS.toLowerCase()) found.parentsId = parseInt(id, 10);
      if (clean.toLowerCase() === Y.cfg.GROUP_NAME_CHILDREN.toLowerCase()) found.childrenId = parseInt(id, 10);
    }

    if (found.parentsId) Y.state.groups.parentsId = found.parentsId;
    if (found.childrenId) Y.state.groups.childrenId = found.childrenId;

    try {
      localStorage.setItem("YRA.parentsId", String(Y.state.groups.parentsId));
      localStorage.setItem("YRA.childrenId", String(Y.state.groups.childrenId));
    } catch (e) {}

    return found;
  }

  function parseProductionOverviewVillages(doc) {
    var rows = doc.querySelectorAll((Y.data && Y.data.SELECTORS && Y.data.SELECTORS.productionRows) || "#production_table tr.row_a, #production_table tr.row_b");
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
        urlOverview: "/game.php?village=" + vid + "&screen=overview"
      });
    }
    return list;
  }

  function parseIncomingTransports(doc) {
    var rows = doc.querySelectorAll((Y.data && Y.data.SELECTORS && Y.data.SELECTORS.tradesRows) || "#trades_table tr.row_a, #trades_table tr.row_b");
    var inc = new Map();
    var edges = [];

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
      if (!tds || tds.length < 4) continue;

      // Incoming filtresi: direction icon (bazı dünyalarda title yerine data-title gelir)
      var dirTd = tds[1];
      var img = dirTd ? dirTd.querySelector("img") : null;
      var title = "";
      if (img) {
        title = img.getAttribute("data-title") || img.getAttribute("title") || img.getAttribute("alt") || "";
      }
      if (String(title).toLowerCase().indexOf("incoming") === -1) continue;

      // recipient village id: satırdaki info_village linklerinden SONUNCUSU (ilk link genelde origin)
      var links = tr.querySelectorAll('a[href*="screen=info_village"][href*="id="]');
      if (!links || !links.length) continue;

      var aTo = links[links.length - 1];
      var href = aTo.getAttribute("href") || "";
      var vid = Y.util.getParam(href, "id");
      if (!vid) continue;

      // origin village id (varsa) - external/internal ayrımı için
      var fromId = null;
      if (links.length >= 2) {
        var aFrom = links[0];
        var hrefFrom = aFrom.getAttribute("href") || "";
        fromId = Y.util.getParam(hrefFrom, "id");
      }

      // kaynaklar: satırın en sağında span.nowrap + icon.header
      var w = 0, s = 0, ir = 0;
      var chunks = tr.querySelectorAll("span.nowrap");
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
      edges.push({ fromId: fromId, toId: vid, wood: w, stone: s, iron: ir });
    }

    try { Y.state.incomingEdges = edges; } catch (e) {}
    return inc;
  }

  function parseOverviewHourlyProduction(html, doc) {
    // 1) DOM üzerinden (show_prod widget)
    try {
      var root = doc.querySelector("#show_prod .widget_content") || doc.querySelector("#show_prod");
      if (root) {
        var trs = root.querySelectorAll("tr");
        var out = { wood: null, stone: null, iron: null };
        for (var i = 0; i < trs.length; i++) {
          var tr = trs[i];
          var icon = tr.querySelector("span.icon");
          var strong = tr.querySelector("strong");
          if (!icon || !strong) continue;

          var cls = icon.className || "";
          var perHour = Y.util.toInt(strong.textContent || "");
          if (!perHour) continue;

          if (cls.indexOf("wood") >= 0) out.wood = perHour;
          else if (cls.indexOf("stone") >= 0) out.stone = perHour; // clay
          else if (cls.indexOf("iron") >= 0) out.iron = perHour;
        }

        if (out.wood != null && out.stone != null && out.iron != null) return out;
      }
    } catch (e) {}

    // 2) Fallback: TribalWars.updateGameData içinden *_prod (per second) yakala
    try {
      function grab(key) {
        var m = html.match(new RegExp('"' + key + '":([0-9.]+)'));
        if (!m) return null;
        var v = parseFloat(m[1]);
        if (!isFinite(v)) return null;
        return v;
      }

      var wp = grab("wood_prod");
      var sp = grab("stone_prod");
      var ip = grab("iron_prod");
      if (wp != null && sp != null && ip != null) {
        return {
          wood: Math.round(wp * 3600),
          stone: Math.round(sp * 3600),
          iron: Math.round(ip * 3600)
        };
      }
    } catch (e2) {}

    return null;
  }

  Y.fetch.loadAll = async function (onStep) {
    // 1) production(all) -> groups + all villages
    var prodAllUrl = Y.util.urlOverviewProd(0);
    var htmlAll = await ajaxGet(prodAllUrl);
    var docAll = toDoc(htmlAll);
    detectGroupIds(docAll);
    var allVill = parseProductionOverviewVillages(docAll);

    try {
      var p = parseInt(localStorage.getItem("YRA.parentsId"), 10);
      var c = parseInt(localStorage.getItem("YRA.childrenId"), 10);
      if (p) Y.state.groups.parentsId = p;
      if (c) Y.state.groups.childrenId = c;
    } catch (e) {}

    // 2) parents membership
    var prodParentsUrl = Y.util.urlOverviewProd(Y.state.groups.parentsId);
    var htmlP = await ajaxGet(prodParentsUrl);
    var docP = toDoc(htmlP);
    var parentsVill = parseProductionOverviewVillages(docP);
    var parentsSet = new Set();
    parentsVill.forEach(function (v) { parentsSet.add(v.id); });
    Y.state.membership.parents = parentsSet;

    // 3) children membership
    var prodChildrenUrl = Y.util.urlOverviewProd(Y.state.groups.childrenId);
    var htmlC = await ajaxGet(prodChildrenUrl);
    var docC = toDoc(htmlC);
    var childrenVill = parseProductionOverviewVillages(docC);
    var childrenSet = new Set();
    childrenVill.forEach(function (v) { childrenSet.add(v.id); });
    Y.state.membership.children = childrenSet;

    // 4) transports incoming
    var trUrl = Y.util.urlOverviewTraderInc();
    var htmlT = await ajaxGet(trUrl);
    var docT = toDoc(htmlT);
    var incoming = parseIncomingTransports(docT);
    Y.state.incoming = incoming;

    // merge all villages
    Y.state.villages = new Map();
    allVill.forEach(function (v) {
      v.group = parentsSet.has(v.id) ? "parents" : (childrenSet.has(v.id) ? "children" : "other");
      Y.state.villages.set(v.id, v);
    });

    // progress total = 4 + N
    var ids = [];
    Y.state.villages.forEach(function (v) { ids.push(v.id); });
    var total = 4 + ids.length;
    if (typeof onStep === "function") onStep(1, total, "Production(all)");
    if (typeof onStep === "function") onStep(2, total, "Production(Parents)");
    if (typeof onStep === "function") onStep(3, total, "Production(Children)");
    if (typeof onStep === "function") onStep(4, total, "Transports(incoming)");

    // 5) per-village overview production (hourly)
    for (var i = 0; i < ids.length; i++) {
      var vid = ids[i];
      var v = Y.state.villages.get(vid);
      if (!v) continue;

      var url = "/game.php?village=" + vid + "&screen=overview";
      var htmlO = await ajaxGet(url);
      var docO = toDoc(htmlO);
      var prod = parseOverviewHourlyProduction(htmlO, docO);

      if (prod) {
        v.prodH = { wood: prod.wood || 0, stone: prod.stone || 0, iron: prod.iron || 0 };
      } else {
        v.prodH = { wood: 0, stone: 0, iron: 0 };
      }

      if (typeof onStep === "function") onStep(5 + i, total, "Overview prod: " + (i + 1) + "/" + ids.length);
    }

    return true;
  };
})();
