(function () {
  "use strict";

  var Y = window.__YAVER_RES_TROOPS_V1__;
  if (!Y) return;

  Y.data = {};

  function buildUrl(villageId, screen, extraQS) {
    var qs = "village=" + encodeURIComponent(villageId) + "&screen=" + encodeURIComponent(screen);
    if (extraQS) qs += "&" + extraQS;
    return "/game.php?" + qs;
  }

  async function fetchText(url) {
    var r = await fetch(url, { method: "GET", cache: "no-store", credentials: "same-origin" });
    var t = await r.text();
    return { ok: r.ok, status: r.status, text: t, url: url };
  }

  function parseVillageListFromAmTroops(html) {
    var doc = new DOMParser().parseFromString(html, "text/html");
    var inputs = Array.from(doc.querySelectorAll("input.am_troops_edit"));
    var out = [];
    var seen = new Set();

    inputs.forEach(function (inp) {
      var id = (inp.getAttribute("value") || "").trim();
      if (!/^\d+$/.test(id)) return;
      if (seen.has(id)) return;
      seen.add(id);

      var tr = inp.closest("tr");
      var a = tr ? tr.querySelector("a[href*='screen=info_village']") : null;
      var name = a ? a.textContent.trim() : ("Village " + id);

      out.push({ id: id, name: name });
    });

    return out;
  }

  // Public API
  Y.data.buildUrl = buildUrl;
  Y.data.fetchText = fetchText;

  // Village list: fetch am_troops once and parse all villages
  Y.data.loadVillageList = async function () {
    var curVillage = null;
    try { curVillage = String(game_data.village.id); } catch (e) {}
    if (!curVillage) throw new Error("game_data.village.id bulunamadı.");

    var url = buildUrl(curVillage, "am_troops");
    var r = await fetchText(url);
    if (!r.ok) throw new Error("am_troops alınamadı: " + r.status);

    var villages = parseVillageListFromAmTroops(r.text);
    if (!villages.length) throw new Error("am_troops içinden köy listesi çıkarılamadı.");

    return villages;
  };

})();
