(function () {
  "use strict";

  var Y = window.__YAVER_RESOURCE_ORCHESTRATOR_V1__;
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

  function parseGroupsFromDoc(doc) {
    var out = [{ id: 0, name: "All villages" }];
    var items = doc.querySelectorAll((Y.data && Y.data.SELECTORS && Y.data.SELECTORS.groupMenuItems) || ".group-menu-item[data-group-id], strong.group-menu-item[data-group-id]");
    var seen = new Set();

    for (var i = 0; i < items.length; i++) {
      var el = items[i];
      var id = parseInt(el.getAttribute("data-group-id"), 10);
      if (!id && id !== 0) continue;

      var name = (el.textContent || "").replace(/\[|\]/g, "").trim();
      if (!name) continue;

      if (seen.has(id)) continue;
      seen.add(id);

      // 0 genelde "All villages" zaten ekli
      if (id !== 0) out.push({ id: id, name: name });
    }

    // stabil sıralama: id
    out.sort(function (a, b) {
      return (a.id || 0) - (b.id || 0);
    });

    return out;
  }

  function parseProductionVillages(doc) {
    var table = doc.querySelector((Y.data && Y.data.SELECTORS && Y.data.SELECTORS.productionTable) || "#production_table") || doc;
    var rows = table.querySelectorAll("tr.row_a, tr.row_b, tr.nowrap.row_a, tr.nowrap.row_b");

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

      // tipik prod tablo: [0]=?, [1]=village, [2]=points, [3]=res, [4]=storage, [5]=merchants
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

      // direction icon cell genelde 2. td (checkbox sonra)
      var dirTd = tds[1];
      var img = dirTd ? dirTd.querySelector("img") : null;

      // DİL BAĞIMSIZ: incoming.webp ile yakala (Sayfalar.txt’te var)
      var src = img ? (img.getAttribute("src") || "") : "";
      if (src.indexOf("incoming.webp") === -1) continue;

      // hedef köy id: satırdaki info_village linklerinden SONUNCUSU
      var links = tr.querySelectorAll('a[href*="screen=info_village"][href*="id="]');
      if (!links || !links.length) continue;

      var aTo = links[links.length - 1];
      var href = aTo.getAttribute("href") || "";
      var vid = Y.util.getParam(href, "id");
      if (!vid) continue;

      // kaynaklar: en sağ hücrede span.nowrap içinde icon header wood/stone/iron var
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
    }

    return inc;
  }

  Y.fetch.load = async function (groupId, onStep) {
    var gid = groupId == null ? 0 : groupId;

    // 1) groups list (one-time) — prod(all)
    if (!Array.isArray(Y.state.groups) || Y.state.groups.length === 0) {
      var htmlAll = await ajaxGet(Y.util.urlProd(0));
      var docAll = toDoc(htmlAll);
      Y.state.groups = parseGroupsFromDoc(docAll);

      if (typeof onStep === "function") onStep(1, 3, "Groups detected");
    } else {
      if (typeof onStep === "function") onStep(1, 3, "Groups cached");
    }

    // 2) production for selected group
    var htmlP = await ajaxGet(Y.util.urlProd(gid));
    var docP = toDoc(htmlP);
    Y.state.villages = parseProductionVillages(docP);

    if (typeof onStep === "function") onStep(2, 3, "Production loaded");

    // 3) trader transports for selected group (type=all)
    var htmlT = await ajaxGet(Y.util.urlTraderAll(gid));
    var docT = toDoc(htmlT);
    Y.state.incoming = parseIncomingTransports(docT);

    if (typeof onStep === "function") onStep(3, 3, "Incoming transports loaded");

    return true;
  };
})();
