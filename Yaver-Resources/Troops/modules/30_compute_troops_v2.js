(function () {
  "use strict";

  var Y = window.__YAVER_RES_TROOPS_V1__;
  if (!Y) return;

  Y.compute = {};

  function sumCountsAcrossVillages(unitsList, perVillage) {
    var tot = {};
    unitsList.forEach(function (u) { tot[u] = 0; });

    perVillage.forEach(function (pv) {
      unitsList.forEach(function (u) {
        tot[u] += Number((pv.units && pv.units[u]) || 0);
      });
    });
    return tot;
  }

  function sumProdAcrossVillages(unitsList, perVillage) {
    var tot = {};
    unitsList.forEach(function (u) { tot[u] = 0; });

    perVillage.forEach(function (pv) {
      unitsList.forEach(function (u) {
        tot[u] += Number((pv.prodDay && pv.prodDay[u]) || 0);
      });
    });
    return tot;
  }

  function popTotalForUnits(unitsList, counts, popFallback) {
    var pop = 0;
    unitsList.forEach(function (u) {
      var c = Number(counts[u] || 0);
      if (c <= 0) return;
      var p = popFallback[u] || 0;
      pop += c * p;
    });
    return pop;
  }

  // Build totals: all/def/off
  Y.compute.buildTotals = function () {
    // Build union of unit keys observed (or cfg list)
    var allUnits = Y.cfg.ALL_UNITS.slice();

    // global counts
    var allCounts = sumCountsAcrossVillages(allUnits, Y.state.perVillage);
    var allProd = sumProdAcrossVillages(allUnits, Y.state.perVillage);

    // pop totals use fallback pop values (good enough globally; per-village pop was computed from meta, but totals ok)
    var allPop = popTotalForUnits(allUnits, allCounts, Y.cfg.POP_FALLBACK);

    // defense totals
    var defUnits = Y.cfg.DEF_UNITS.slice();
    var defCounts = sumCountsAcrossVillages(defUnits, Y.state.perVillage);
    var defProd = sumProdAcrossVillages(defUnits, Y.state.perVillage);
    var defPop = popTotalForUnits(defUnits, defCounts, Y.cfg.POP_FALLBACK);

    // offense totals
    var offUnits = Y.cfg.OFF_UNITS.slice();
    var offCounts = sumCountsAcrossVillages(offUnits, Y.state.perVillage);
    var offProd = sumProdAcrossVillages(offUnits, Y.state.perVillage);
    var offPop = popTotalForUnits(offUnits, offCounts, Y.cfg.POP_FALLBACK);

    return {
      all: { counts: allCounts, prod: allProd, pop: allPop, units: allUnits },
      def: { counts: defCounts, prod: defProd, pop: defPop, units: defUnits },
      off: { counts: offCounts, prod: offProd, pop: offPop, units: offUnits }
    };
  };

})();
