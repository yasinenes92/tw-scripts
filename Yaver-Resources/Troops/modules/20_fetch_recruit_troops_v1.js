(function () {
  "use strict";

  var Y = window.__YAVER_RES_TROOPS_V1__;
  if (!Y) return;

  Y.recruit = {};

  function parseUnitMetaFromHtml(html) {
    // Extract unit_managers.units object-ish fields via regex
    // We only need: pop, build_time, requirements_met
    var meta = {};

    var re = /([a-z_]+)\s*:\s*{\s*[\s\S]*?pop:\s*(\d+)\s*,\s*[\s\S]*?build_time:\s*([\d.]+)\s*,\s*[\s\S]*?requirements_met:\s*(true|false)\s*[\s\S]*?}/g;
    var m;
    while ((m = re.exec(html))) {
      var u = m[1];
      meta[u] = {
        pop: parseInt(m[2], 10),
        build_time: parseFloat(m[3]),
        requirements_met: (m[4] === "true")
      };
    }
    return meta;
  }

  function parseCountsFromRecruitDoc(doc, units) {
    var counts = {};
    units.forEach(function (u) {
      try {
        var a = doc.querySelector("a.unit_link[data-unit='" + u + "']");
        if (!a) return;
        var tr = a.closest("tr");
        if (!tr) return;
        var tds = tr.querySelectorAll("td");
        if (!tds || tds.length < 3) return;

        var txt = (tds[2].textContent || "").trim(); // "in village/total"
        var mm = txt.match(/(\d+)\s*\/\s*(\d+)/);
        if (!mm) return;

        var total = parseInt(mm[2], 10);
        counts[u] = isFinite(total) ? total : 0;
      } catch (e) {}
    });
    return counts;
  }

  Y.recruit.fetchVillageRecruit = async function (villageId, villageName) {
    var url = Y.data.buildUrl(villageId, "train", "mode=train");
    var r = await Y.data.fetchText(url);
    if (!r.ok) throw new Error("train alınamadı (" + villageId + "): " + r.status);

    var doc = new DOMParser().parseFromString(r.text, "text/html");

    var unitMeta = parseUnitMetaFromHtml(r.text);

    // units list: prefer meta keys; fallback to cfg list
    var units = Object.keys(unitMeta);
    if (!units.length) units = Y.cfg.ALL_UNITS.slice();

    var counts = parseCountsFromRecruitDoc(doc, units);

    // prod/day map
    var prodDay = {};
    units.forEach(function (u) {
      var m = unitMeta[u];
      if (m && m.build_time != null) {
        prodDay[u] = Y.util.prodPerDayFromBuildTime(m.build_time, !!m.requirements_met);
      } else {
        prodDay[u] = 0;
      }
    });

    // pop total
    var popTotal = 0;
    Object.keys(counts).forEach(function (u) {
      var c = counts[u] || 0;
      if (c <= 0) return;
      var pop = Y.util.popOf(unitMeta, u);
      popTotal += (c * pop);
    });

    return {
      id: String(villageId),
      name: villageName,
      url: url,
      units: counts,
      unitMeta: unitMeta,
      prodDay: prodDay,
      popTotal: popTotal
    };
  };

})();
