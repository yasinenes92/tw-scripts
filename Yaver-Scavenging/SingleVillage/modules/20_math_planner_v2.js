(function () {
  "use strict";

  var Y = window.__YSS_SINGLE_V2__;
  if (!Y) return;

  Y.math = {};

  Y.math.calcHaulFromTime = function (timeSec, opt) {
    var df = opt.duration_factor || 1;
    var de = opt.duration_exponent || 0.45;
    var di = opt.duration_initial_seconds || 1800;

    var inner = (timeSec / df) - di;
    if (inner <= 0) return 0;

    var a = Math.pow(inner, (1 / de)) / 100;
    if (a <= 0) return 0;

    return Math.sqrt(a);
  };

  Y.math.calcTimeFromCarry = function (carry, opt) {
    var haul = (carry || 0) * (opt.loot_factor || 0);

    var df = opt.duration_factor || 1;
    var de = opt.duration_exponent || 0.45;
    var di = opt.duration_initial_seconds || 1800;

    var x = Math.pow(100 * haul * haul, de);
    return Math.max(0, Math.round(df * (di + x)));
  };

  Y.math.takeTroopsForCarryNoOvershoot = function (carryNeed, troopsAllowed, unitsEnabled) {
    carryNeed = Math.max(0, Math.floor(carryNeed));
    var planUnits = {};
    Y.sendOrderDefault.forEach(function (u) { planUnits[u] = 0; });

    var totalAvailCarry = 0;
    Y.sendOrderDefault.forEach(function (u) {
      if (!unitsEnabled[u]) return;
      var c = Y.dom.getCarry(u);
      var have = troopsAllowed[u] || 0;
      if (c > 0 && have > 0) totalAvailCarry += have * c;
    });

    if (totalAvailCarry <= 0 || carryNeed <= 0) {
      return { planUnits: planUnits, carryUsed: 0 };
    }

    // 1) proportional pass
    Y.sendOrderDefault.forEach(function (u) {
      if (!unitsEnabled[u]) return;
      var c = Y.dom.getCarry(u);
      var have = troopsAllowed[u] || 0;
      if (!c || have <= 0) return;

      var shareCarry = carryNeed * ((have * c) / totalAvailCarry);
      var n = Math.min(have, Math.floor(shareCarry / c));
      planUnits[u] = n;
    });

    var carryUsed = 0;
    Y.sendOrderDefault.forEach(function (u) {
      carryUsed += (planUnits[u] || 0) * Y.dom.getCarry(u);
    });

    var rem = carryNeed - carryUsed;

    // 2) fill remaining with higher carry first
    var pool = Y.sendOrderDefault
      .filter(function (u) { return !!unitsEnabled[u]; })
      .map(function (u) { return { u: u, c: Y.dom.getCarry(u) }; })
      .filter(function (x) { return x.c > 0; })
      .sort(function (a, b) { return b.c - a.c; });

    while (rem > 0) {
      var picked = false;
      for (var i = 0; i < pool.length; i++) {
        var u2 = pool[i].u;
        var c2 = pool[i].c;
        var free = (troopsAllowed[u2] || 0) - (planUnits[u2] || 0);
        if (free <= 0) continue;

        if (c2 <= rem) {
          var add = Math.min(free, Math.floor(rem / c2));
          if (add > 0) {
            planUnits[u2] += add;
            carryUsed += add * c2;
            rem -= add * c2;
            picked = true;
            break;
          }
        }
      }
      if (!picked) break;
    }

    // consume
    Y.sendOrderDefault.forEach(function (u3) {
      var used = planUnits[u3] || 0;
      if (used > 0) troopsAllowed[u3] = (troopsAllowed[u3] || 0) - used;
    });

    return { planUnits: planUnits, carryUsed: carryUsed };
  };

  Y.math.optimizeBalancedCarry = function (carryMap, opts, stepCarry, tolSec, maxIter) {
    tolSec = tolSec || 30;
    maxIter = maxIter || 350;

    function getC(id) { return carryMap.get(id) || 0; }
    function setC(id, v) { carryMap.set(id, Math.max(0, Math.floor(v))); }

    function timeOf(optId) {
      var o = opts.find(function (x) { return x.id === optId; });
      return Y.math.calcTimeFromCarry(getC(optId), o);
    }

    for (var it = 0; it < maxIter; it++) {
      var minId = null, maxId = null;
      var minT = Infinity, maxT = -Infinity;

      opts.forEach(function (o) {
        var t = timeOf(o.id);
        if (t < minT) { minT = t; minId = o.id; }
        if (t > maxT) { maxT = t; maxId = o.id; }
      });

      if ((maxT - minT) <= tolSec) break;
      if (getC(maxId) < stepCarry) break;

      setC(maxId, getC(maxId) - stepCarry);
      setC(minId, getC(minId) + stepCarry);
    }

    return carryMap;
  };

  Y.math.estLootTriplet = function (totalLoot) {
    var each = Math.floor((totalLoot || 0) / 3);
    var r = (totalLoot || 0) - each * 3;
    return { wood: each + (r > 0 ? 1 : 0), stone: each + (r > 1 ? 1 : 0), iron: each };
  };

  // planner: returns {ok, plan, targetSec, infoKind, infoHtml}
  Y.math.buildPlan = function () {
    Y.dom.clearHighlights();

    var st = Y.dom.getUIState();
    var optsAll = Y.dom.listOptions().filter(function (o) {
      return st.optsEnabled.indexOf(o.id) >= 0 && !o.is_locked && !o.scavenging_squad;
    });

    if (!optsAll.length) {
      return { ok: false, err: "Seçili & uygun (OK) kategori yok. (LOCKED/ACTIVE plan dışı)" };
    }

    // internal: loot desc
    var opts = optsAll.slice().sort(function (a, b) { return b.loot_factor - a.loot_factor; });
    var targetSec = Math.max(1, Math.round(st.timeSec));

    var troopsAllowed0 = Y.dom.buildTroopsAllowed(st.unitsEnabled);
    var totalCarryAvail = Y.dom.sumCarry(troopsAllowed0);
    if (totalCarryAvail <= 0) {
      return { ok: false, err: "Seçili askerlerden carry çıkmıyor. Unit seçimini kontrol et." };
    }

    var stepCarry = Y.dom.minCarrySelected(troopsAllowed0);
    var carryAlloc = new Map();

    var infoKind = "ok";
    var infoHtml = "";

    if (st.mode === "priority") {
      var haulTargetP = Y.math.calcHaulFromTime(targetSec, opts[0]);
      if (!haulTargetP) {
        return { ok: false, err: "Bu süre için hesap çıkmadı. Süre çok düşük olabilir (oyun minimum süre sınırı)." };
      }

      var needByOpt = new Map();
      var totalNeed = 0;
      opts.forEach(function (o) {
        var need = Math.floor(haulTargetP / (o.loot_factor || 1));
        needByOpt.set(o.id, need);
        totalNeed += need;
      });

      if (totalCarryAvail >= totalNeed) {
        opts.forEach(function (o) { carryAlloc.set(o.id, needByOpt.get(o.id)); });
        infoKind = "ok";
        infoHtml = "✅ Priority: hedef süre <b>" + Y.util.fmtHMS(targetSec) + "</b>.";
      } else {
        var rem = totalCarryAvail;
        opts.forEach(function (o) {
          if (rem <= 0) return;
          var need2 = needByOpt.get(o.id);
          var give = Math.min(need2, rem);
          carryAlloc.set(o.id, give);
          rem -= give;
        });
        infoKind = "info";
        infoHtml = "⚠️ Troop yetersiz. Priority açık → yüksek kategoriler öncelikli doldu, bazıları boş kalabilir.";
      }
    }

    if (st.mode === "balanced") {
      var haulTargetB = Y.math.calcHaulFromTime(targetSec, opts[0]);
      if (!haulTargetB) {
        return { ok: false, err: "Bu süre için hesap çıkmadı. Süre çok düşük olabilir (oyun minimum süre sınırı)." };
      }

      var invSum = 0;
      opts.forEach(function (o) { invSum += (1 / (o.loot_factor || 1)); });

      var needTotalAtTarget = haulTargetB * invSum;

      var haulUsed = haulTargetB;
      infoKind = "ok";
      infoHtml = "✅ Balanced: hedef süre <b>" + Y.util.fmtHMS(targetSec) + "</b>.";

      if (totalCarryAvail < needTotalAtTarget) {
        haulUsed = totalCarryAvail / invSum;
        var estCommonTime = Y.math.calcTimeFromCarry(haulUsed / (opts[0].loot_factor || 1), opts[0]);
        infoKind = "info";
        infoHtml = "⚠️ Troop yetersiz → Balanced süre düştü: ~ <b>" + Y.util.fmtHMS(estCommonTime) + "</b>.";
      }

      var sum = 0;
      opts.forEach(function (o) {
        var raw = (haulUsed / (o.loot_factor || 1));
        var v = Math.floor(raw / stepCarry) * stepCarry;
        carryAlloc.set(o.id, v);
        sum += v;
      });

      var rem2 = totalCarryAvail - sum;
      while (rem2 >= stepCarry) {
        var minId = null;
        var minT = Infinity;

        opts.forEach(function (o) {
          var t = Y.math.calcTimeFromCarry(carryAlloc.get(o.id) || 0, o);
          if (t < minT) { minT = t; minId = o.id; }
        });

        carryAlloc.set(minId, (carryAlloc.get(minId) || 0) + stepCarry);
        rem2 -= stepCarry;
      }

      Y.math.optimizeBalancedCarry(carryAlloc, opts, stepCarry, 30, 350);
    }

    // build rows by consuming troops
    var troopsState = {};
    Object.keys(troopsAllowed0).forEach(function (k) { troopsState[k] = troopsAllowed0[k]; });

    var plan = [];
    opts.forEach(function (o) {
      var cNeed = carryAlloc.get(o.id) || 0;
      if (cNeed <= 0) return;

      var r = Y.math.takeTroopsForCarryNoOvershoot(cNeed, troopsState, st.unitsEnabled);
      if (r.carryUsed <= 0) return;

      var estSec = Y.math.calcTimeFromCarry(r.carryUsed, o);
      plan.push({
        optId: o.id,
        baseId: o.base_id,
        name: o.name,
        loot: o.loot_factor,
        estSec: estSec,
        carryUsed: r.carryUsed,
        planUnits: r.planUnits,
        mode: st.mode
      });
    });

    // tablo sira: balanced -> 1..4, priority -> 4..1
    if (st.mode === "balanced") plan.sort(function (a, b) { return a.optId - b.optId; });
    else plan.sort(function (a, b) { return b.loot - a.loot; });

    return { ok: true, plan: plan, targetSec: targetSec, infoKind: infoKind, infoHtml: infoHtml };
  };
})();
