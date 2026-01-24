(function () {
  "use strict";
  var Y = window.__YAVER_RESOURCE_ORCHESTRATOR_V8__;
  if (!Y) return;

  function ajaxGet(url) {
    var x = $.ajax({ url: url, method: "GET", cache: false, timeout: 30000 });
    Y._xhr.push(x);
    return new Promise(function (res, rej) {
      x.done(function (data) { res(String(data || "")); })
       .fail(function (jq, st) { rej(new Error("GET failed: " + url + " (" + (jq && jq.status) + " / " + st + ")")); });
    });
  }

  function toDoc(html) {
    var p = new DOMParser();
    return p.parseFromString(String(html || ""), "text/html");
  }

  function twGet(screen, params) {
    return new Promise(function (resolve, reject) {
      try {
        TribalWars.get(
          screen,
          params || {},
          function (data) { resolve(data); },
          function (err) { reject(err || new Error("TW.get failed")); },
          true
        );
      } catch (e) {
        reject(e);
      }
    });
  }

  function twPost(screen, urlParams, postData) {
    return new Promise(function (resolve, reject) {
      try {
        TribalWars.post(
          screen,
          urlParams || {},
          postData || {},
          function (data) { resolve(data); },
          function (err) { reject(err || new Error("TW.post failed")); }
        );
      } catch (e) {
        reject(e);
      }
    });
  }

  function parseGroupsMenu(data) {
    var out = [{ id: 0, name: "All villages" }];
    var seen = new Set([0]);
    if (!data || !data.result) return out;

    for (var i = 0; i < data.result.length; i++) {
      var it = data.result[i];
      if (!it) continue;
      if (it.type === "separator") continue;
      var gid = parseInt(it.group_id, 10);
      if (!isFinite(gid)) continue;
      if (seen.has(gid)) continue;
      seen.add(gid);
      out.push({ id: gid, name: String(it.name || ("Group " + gid)) });
    }
    out.sort(function (a, b) { return (a.id || 0) - (b.id || 0); });
    return out;
  }

  async function ensureGroups(onStep) {
    if (Y.state.groups && Y.state.groups.length > 1) {
      if (typeof onStep === "function") onStep(1, 3, "Groups cached");
      return true;
    }
    var menu = await twGet("groups", { ajax: "load_group_menu" });
    Y.state.groups = parseGroupsMenu(menu);

    function findIdByName(nm) {
      nm = String(nm || "").toLowerCase();
      for (var i = 0; i < Y.state.groups.length; i++) {
        if (String(Y.state.groups[i].name || "").toLowerCase() === nm) return Y.state.groups[i].id;
      }
      return null;
    }
    var pid = findIdByName("parents");
    var cid = findIdByName("children");
    var coin = findIdByName("coin");

    if (pid != null) {
      Y.state.t3.A.surplusGroupId = pid;
      Y.state.t3.B.senderGroupId = pid;
      Y.state.t3.B.surplusGroupId = pid;
      Y.state.t3.C.surplusGroupId = pid;
    }
    if (cid != null) {
      Y.state.t3.A.targetGroupId = cid;
      Y.state.t3.B.targetGroupId = cid;
    }
    if (coin != null) {
      Y.state.t3.C.targetGroupId = coin;
    }

    if (typeof onStep === "function") onStep(1, 3, "Groups loaded");
    return true;
  }

  function parseProdVillages(doc) {
    var table = doc.querySelector(Y.data.SELECTORS.productionTable) || doc;
    var rows = table.querySelectorAll("tr.row_a, tr.row_b, tr.nowrap.row_a, tr.nowrap.row_b");
    var list = [];

    function findMerchTextFromRow(tr) {
      try {
        var tds = tr.querySelectorAll("td");
        for (var i = 0; i < tds.length; i++) {
          var td = tds[i];
          if (!td) continue;
          if ((td.innerHTML || "").indexOf("screen=market") !== -1) {
            var txt = (td.textContent || "").trim();
            if (txt) return txt;
          }
        }
        if (tds && tds.length > 5) return (tds[5].textContent || "").trim();
        return "0/0";
      } catch (e) {
        return "0/0";
      }
    }

    for (var i = 0; i < rows.length; i++) {
      var tr = rows[i];
      var vn = tr.querySelector("span.quickedit-vn[data-id]");
      if (!vn) continue;
      var vid = parseInt(vn.getAttribute("data-id"), 10);
      if (!vid) continue;

      var nameEl = tr.querySelector(".quickedit-label");
      var name = nameEl ? (nameEl.textContent || "").trim() : ("village_" + vid);

      var tds = tr.querySelectorAll("td");
      if (!tds || tds.length < 4) continue;

      var points = (tds.length > 2) ? Y.util.toInt(tds[2].textContent || "0") : 0;

      var rcell = tr.querySelector("td .res.wood") ? tr.querySelector("td .res.wood").closest("td") : null;
      if (!rcell && tds.length > 3) rcell = tds[3];

      var woodEl = rcell ? rcell.querySelector(".res.wood") : null;
      var stoneEl = rcell ? rcell.querySelector(".res.stone") : null;
      var ironEl = rcell ? rcell.querySelector(".res.iron") : null;

      var wood = Y.util.parseRes(woodEl ? woodEl.textContent : "0");
      var stone = Y.util.parseRes(stoneEl ? stoneEl.textContent : "0");
      var iron = Y.util.parseRes(ironEl ? ironEl.textContent : "0");

      var storage = (tds.length > 4) ? Y.util.parseRes(tds[4].textContent || "0") : 0;

      var merchTxt = findMerchTextFromRow(tr);
      var pair = Y.util.parsePair(merchTxt);

      list.push({
        id: vid,
        name: name,
        coord: Y.util.coordOfName(name),
        points: points,
        wood: wood,
        stone: stone,
        iron: iron,
        storage: storage,
        merchAvail: pair.a,
        merchTotal: pair.b
      });
    }
    return list;
  }

  // -------- FIX START: group members loader ----------
  function getGroupsVillagesBaseLink() {
    // This input exists on most TW pages; safest source.
    var el = document.getElementById("show_groups_villages_link");
    if (el && el.value) return String(el.value).replace(/&amp;/g, "&");

    // Fallback URL (still safe)
    var vid = (window.game_data && game_data.village && game_data.village.id) ? game_data.village.id : 0;
    return "/game.php?village=" + vid + "&screen=groups&ajax=load_villages_from_group&mode=overview";
  }

  function extractVillageIdsFromHtml(html) {
    var doc = toDoc(html);
    var set = new Set();

    // Most reliable: village=123 in href
    var links = doc.querySelectorAll('a[href*="village="]');
    for (var i = 0; i < links.length; i++) {
      var href = links[i].getAttribute("href") || "";
      var m = href.match(/village=(\d+)/);
      if (m) set.add(parseInt(m[1], 10));
    }

    // Fallback: data-id
    var nodes = doc.querySelectorAll("[data-id]");
    for (var j = 0; j < nodes.length; j++) {
      var v = parseInt(nodes[j].getAttribute("data-id"), 10);
      if (v) set.add(v);
    }

    return set;
  }

  async function ensureGroupMembers(gid) {
    gid = parseInt(gid, 10);
    if (!isFinite(gid) || gid <= 0) return null;
    if (Y.state.groupMembers.has(gid)) return Y.state.groupMembers.get(gid);

    // 1) Primary: GET the same endpoint the UI uses
    var baseLink = getGroupsVillagesBaseLink();
    var url = baseLink + (baseLink.indexOf("?") >= 0 ? "&" : "?") + "group_id=" + encodeURIComponent(gid) + "&_=" + Date.now();

    try {
      var raw = await ajaxGet(url);

      // Sometimes server returns JSON (rare), sometimes HTML.
      var set = null;
      if (raw && raw.trim().charAt(0) === "{") {
        try {
          var obj = JSON.parse(raw);
          if (obj && obj.html) set = extractVillageIdsFromHtml(String(obj.html));
          else if (obj && obj.villages && Array.isArray(obj.villages)) {
            set = new Set();
            for (var i = 0; i < obj.villages.length; i++) {
              var id = parseInt(obj.villages[i].id || obj.villages[i].village_id || obj.villages[i], 10);
              if (id) set.add(id);
            }
          }
        } catch (e) {
          // ignore JSON parse, fallback to HTML parse
        }
      }
      if (!set) set = extractVillageIdsFromHtml(raw);

      Y.state.groupMembers.set(gid, set);
      return set;
    } catch (e1) {
      // 2) Secondary fallback: TribalWars.post (in case endpoint differs)
      try {
        var resp = await twPost("groups", { ajax: "load_villages_from_group", mode: "overview" }, { group_id: gid });
        var html = (resp && resp.html) ? String(resp.html) : String(resp || "");
        var set2 = extractVillageIdsFromHtml(html);
        Y.state.groupMembers.set(gid, set2);
        return set2;
      } catch (e2) {
        console.error("[YRO v8] ensureGroupMembers failed:", gid, e1, e2);
        // Store empty set to avoid infinite retries; main will show error message.
        var empty = new Set();
        Y.state.groupMembers.set(gid, empty);
        return empty;
      }
    }
  }
  // -------- FIX END ----------

  function parseMarketIncoming(doc) {
    var tables = doc.querySelectorAll("table.vis");
    var best = null;

    function thText(t) {
      var ths = t.querySelectorAll("th");
      var arr = [];
      for (var i = 0; i < ths.length; i++) arr.push((ths[i].textContent || "").trim().toLowerCase());
      return arr.join("|");
    }

    for (var i = 0; i < tables.length; i++) {
      var t = tables[i];
      var h = thText(t);
      if (h.indexOf("origin") >= 0 && h.indexOf("goods") >= 0 && h.indexOf("arrival") >= 0) {
        best = t;
        break;
      }
    }
    if (!best) return { wood: 0, stone: 0, iron: 0 };

    var rows = best.querySelectorAll("tr");
    var sum = { wood: 0, stone: 0, iron: 0 };

    for (var r = 1; r < rows.length; r++) {
      var tr = rows[r];
      var tds = tr.querySelectorAll("td");
      if (!tds || tds.length < 2) continue;
      var goodsTd = tds[1];

      var spans = goodsTd.querySelectorAll("span.nowrap, span");
      if (!spans || !spans.length) continue;

      for (var k = 0; k < spans.length; k++) {
        var sp = spans[k];
        var icon = sp.querySelector("span.icon.header");
        if (!icon) continue;
        var cls = icon.className || "";
        var val = Y.util.parseRes(sp.textContent || "0");

        if (cls.indexOf("wood") >= 0) sum.wood += val;
        else if (cls.indexOf("stone") >= 0) sum.stone += val;
        else if (cls.indexOf("iron") >= 0) sum.iron += val;
      }
    }

    return sum;
  }

  function parseOverviewProductionWidget(doc) {
    var widget = doc.querySelector("#show_prod") || null;
    if (!widget) return null;

    var rows = widget.querySelectorAll("tr.nowrap");
    if (!rows || !rows.length) return null;

    var perHour = { wood: 0, stone: 0, iron: 0 };

    for (var i = 0; i < rows.length; i++) {
      var tr = rows[i];
      var txt = (tr.textContent || "").toLowerCase();
      var strong = tr.querySelector("strong");
      var num = strong ? Y.util.parseRes(strong.textContent) : Y.util.parseRes(tr.textContent);

      if (txt.indexOf("wood") >= 0) perHour.wood = num;
      else if (txt.indexOf("clay") >= 0 || txt.indexOf("stone") >= 0) perHour.stone = num;
      else if (txt.indexOf("iron") >= 0) perHour.iron = num;
    }

    return perHour;
  }

  Y.fetch.ensureGroups = ensureGroups;
  Y.fetch.ensureGroupMembers = ensureGroupMembers;

  Y.fetch.loadAll = async function (onStep, forceFresh) {
    await ensureGroups(onStep);

    if (!forceFresh && Y.state.all.villages && Y.state.all.villages.length) {
      if (typeof onStep === "function") onStep(2, 3, "Cached");
      if (typeof onStep === "function") onStep(3, 3, "Cached ✅");
      return Y.state.all;
    }

    var htmlP = await ajaxGet(Y.util.urlProdAll());
    var docP = toDoc(htmlP);
    var villages = parseProdVillages(docP);
    Y.state.all.villages = villages;
    if (typeof onStep === "function") onStep(2, 3, "Production loaded");

    var incoming = new Map();
    for (var i = 0; i < villages.length; i++) {
      var v = villages[i];
      try {
        var msg = "Incoming (" + (i + 1) + "/" + villages.length + ")";
        if (typeof onStep === "function") onStep(3, 3, msg);

        var htmlM = await ajaxGet(Y.util.urlMarketTransports(v.id));
        var docM = toDoc(htmlM);
        var inc = parseMarketIncoming(docM);
        incoming.set(v.id, inc);
      } catch (e) {
        incoming.set(v.id, { wood: 0, stone: 0, iron: 0 });
      }
    }
    Y.state.all.incomingRes = incoming;

    var prod24 = new Map();
    for (var j = 0; j < villages.length; j++) {
      var vv = villages[j];
      try {
        if (typeof onStep === "function") onStep(3, 3, "Prod24 (" + (j + 1) + "/" + villages.length + ")");
        var htmlO = await ajaxGet(Y.util.urlVillageOverview(vv.id));
        var docO = toDoc(htmlO);
        var perHour = parseOverviewProductionWidget(docO);

        if (!perHour) perHour = { wood: 0, stone: 0, iron: 0 };
        var w24 = perHour.wood * 24;
        var s24 = perHour.stone * 24;
        var i24 = perHour.iron * 24;
        prod24.set(vv.id, {
          wph: perHour.wood,
          sph: perHour.stone,
          iph: perHour.iron,
          w24: w24,
          s24: s24,
          i24: i24,
          total24: w24 + s24 + i24
        });
      } catch (e2) {
        prod24.set(vv.id, { wph: 0, sph: 0, iph: 0, w24: 0, s24: 0, i24: 0, total24: 0 });
      }
    }
    Y.state.all.prod24 = prod24;

    if (typeof onStep === "function") onStep(3, 3, "Done ✅");
    return Y.state.all;
  };

  Y.fetch.getProdSnapshotFresh = async function () {
    var html = await ajaxGet(Y.util.urlProdAll());
    var doc = toDoc(html);
    var villages = parseProdVillages(doc);
    var m = new Map();
    for (var i = 0; i < villages.length; i++) {
      var v = villages[i];
      m.set(v.id, {
        id: v.id,
        name: v.name,
        wood: v.wood || 0,
        stone: v.stone || 0,
        iron: v.iron || 0,
        storage: v.storage || 0,
        merchAvail: v.merchAvail || 0,
        merchTotal: v.merchTotal || 0
      });
    }
    return m;
  };
})();
