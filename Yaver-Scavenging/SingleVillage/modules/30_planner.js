(function () {
  "use strict";

  var api = window.Yaver && window.Yaver.ScavSingle;
  if (!api) return;

  var U = api.utils;
  var G = api.game;
  var P = api.planner = api.planner || {};

  P.compute = function (hours, enabledUnits, enabledOptions) {
    var duration = G.getDurationParams();
    if (!duration) {
      return { ok: false, error: "Duration paramları alınamadı (ScavengeScreen bulunamadı)." };
    }

    var available = G.getAvailableUnits();
    var carry = api.config.carry;

    // Total capacity (only enabled units)
    var totalCap = 0;
    Object.keys(enabledUnits).forEach(function (unit) {
      if (!enabledUnits[unit]) return;
      var cnt = available[unit] || 0;
      totalCap += cnt * (carry[unit] || 0);
    });

    if (totalCap <= 0) {
      return { ok: false, error: "Seçili birliklerde toplam taşıma kapasitesi 0 görünüyor." };
    }

    // Base formula (same shape as Sophie script) :contentReference[oaicite:4]{index=4}
    var time = Number(hours) * 3600;
    var inner = (time / duration.duration_factor) - duration.duration_initial_seconds;
    if (inner < 0) inner = 0;

    var baseHaul = Math.pow(Math.pow(inner, (1 / duration.duration_exponent)) / 100, (1 / 2));

    // Needed capacity per option (only enabled options)
    var perOptNeeded = {};
    var totalNeeded = 0;

    ["1", "2", "3", "4"].forEach(function (optId) {
      if (!enabledOptions[optId]) return;
      var lf = api.config.lootFactor[optId];
      var need = (lf > 0) ? (baseHaul / lf) : 0;
      perOptNeeded[optId] = need;
      totalNeeded += need;
    });

    if (totalNeeded <= 0) {
      return { ok: false, error: "Seçili seçeneklerde (1-4) hesaplanabilir plan çıkmadı." };
    }

    // Scale if not enough capacity
    var scale = totalCap >= totalNeeded ? 1 : (totalCap / totalNeeded);

    // Unit ratio approach (units / totalCap) like Sophie uses
    var unitRatio = {};
    Object.keys(enabledUnits).forEach(function (unit) {
      if (!enabledUnits[unit]) return;
      var cnt = available[unit] || 0;
      unitRatio[unit] = cnt / totalCap; // units per capacity
    });

    // Build plan per option: desiredCap -> unit counts
    var plan = {
      ok: true,
      hours: Number(hours),
      duration: duration,
      availableUnits: available,
      totalCapacity: totalCap,
      totalNeededCapacity: totalNeeded,
      scale: scale,
      options: {} // optId -> { desiredCap, units:{...} }
    };

    ["4", "3", "2", "1"].forEach(function (optId) {
      if (!enabledOptions[optId]) return;

      var desiredCap = (perOptNeeded[optId] || 0) * scale;
      var unitsOut = {};

      Object.keys(enabledUnits).forEach(function (unit) {
        if (!enabledUnits[unit]) return;
        var want = desiredCap * (unitRatio[unit] || 0);
        var count = U.floor(want);
        var max = available[unit] || 0;
        if (count > max) count = max;
        unitsOut[unit] = count;
      });

      plan.options[optId] = { desiredCap: desiredCap, units: unitsOut };
    });

    return plan;
  };
})();
