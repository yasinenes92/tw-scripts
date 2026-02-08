(function () {
  "use strict";

  var Y = window.__YAVER_MASS_SCAV_V1__;
  if (!Y) return;

  Y.plan = {};

  function optListFromBases(option_bases, enabled) {
    var out = [];
    enabled.forEach(function (id) {
      var o = option_bases[String(id)] || option_bases[id];
      if (o) out.push(o);
    });
    out.sort(function (a, b) { return (b.loot_factor || 0) - (a.loot_factor || 0); });
    return out;
  }

  function calcHaulFromTime(timeSec, opt) {
    var df = opt.duration_factor || 1;
    var de = opt.duration_exponent || 0.45;
    var di = opt.duration_initial_seconds || 1800;

    var inner = (timeSec / df) - di;
    if (inner <= 0) return 0;

    var a = Math.pow(inner, (1 / de)) / 100;
    if (a <= 0) return 0;

    return Math.sqrt(a);
  }

  function calcTimeFromCarryBase(baseCarry, opt, carryFactor) {
    // haul = effectiveCarry * loot_factor, effectiveCarry = baseCarry * carryFactor
    var haul = (baseCarry || 0) * (carryFactor || 1) * (opt.loot_factor || 0);

    var df = opt.duration_factor || 1;
    var de = opt.duration_exponent || 0.45;
    var di = opt.duration_initial_seconds || 1800;

    var x = Math.pow(100 * haul * haul, de);
    return Math.max(0, Math.round(df * (di + x)));
  }

  function minUnitCarrySelected(unitsMeta, troopsAllowed) {
    var m = Infinity;
    Object.keys(troopsAllowed).forEach(function (u) {
      var have = troopsAllowed[u] || 0;
      if (have <= 0) return;
      var c = unitsMeta[u] ? unitsMeta[u].carry : 0;
      if (c > 0) m = Math.min(m, c);
    });
    return isFinite(m) ? m : 10;
  }

  function sumBaseCarry(unitsMeta, troopsAllowed) {
    var total = 0;
    Object.keys(troopsAllowed).forEach(function (u) {
      var have = troopsAllowed[u] || 0;
      var c = unitsMeta[u] ? unitsMeta[u].carry : 0;
      total += have * c;
    });
    return total;
  }

  // distribute troops for a baseCarry target (no overshoot-ish)
  function takeTroopsForCarry(baseCarryNeed, unitsMeta, troopsAllowed, sendOrder) {
    baseCarryNeed = Math.max(0, Math.floor(baseCarryNeed));
    var planUnits = {};
    sendOrder.forEach(function (u) { planUnits[u] = 0; });

    var totalAvailCarry = sumBaseCarry(unitsMeta, troopsAllowed);
    if (totalAvailCarry <= 0 || baseCarryNeed <= 0) return { planUnits: planUnits, baseCarryUsed: 0 };

    // proportional
    sendOrder.forEach(function (u) {
      var have = troopsAllowed[u] || 0;
      var c = unitsMeta[u] ? unitsMeta[u].carry : 0;
      if (!c || have <= 0) return;

      var shareCarry = baseCarryNeed * ((have * c) / totalAvailCarry);
      var n = Math.min(have, Math.floor(shareCarry / c));
      planUnits[u] = n;
    });

    var baseCarryUsed = 0;
    sendOrder.forEach(function (u) {
      var c = unitsMeta[u] ? unitsMeta[u].carry : 0;
      baseCarryUsed += (planUnits[u] || 0) * c;
    });

    var rem = baseCarryNeed - baseCarryUsed;

    // fill remaining with higher carry units first
    var pool = sendOrder
      .map(function (u) { return { u: u, c: (unitsMeta[u] ? unitsMeta[u].carry : 0) }; })
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
            baseCarryUsed += add * c2;
            rem -= add * c2;
            picked = true;
            break;
          }
        }
      }
      if (!picked) break;
    }

    // consume from troopsAllowed
    sendOrder.forEach(function (u3) {
      var used = planUnits[u3] || 0;
      if (used > 0) troopsAllowed[u3] = (troopsAllowed[u3] || 0) - used;
    });

    return { planUnits: planUnits, baseCarryUsed: baseCarryUsed };
  }

  function optimizeBalancedCarry(carryMap, opts, stepCarry, tolSec, maxIter, carryFactor) {
    tolSec = tolSec || 30;
    maxIter = maxIter || 300;

    function getC(id) { return carryMap.get(id) || 0; }
    function setC(id, v) { carryMap.set(id, Math.max(0, Math.floor(v))); }

    function timeOf(optId) {
      var o = opts.find(function (x) { return String(x.id) === String(optId); });
      return calcTimeFromCarryBase(getC(optId), o, carryFactor);
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
  }

  function lootTriplet(totalLoot) {
    var each = Math.floor((totalLoot || 0) / 3);
    var r = (totalLoot || 0) - each * 3;
    return { wood: each + (r > 0 ? 1 : 0), stone: each + (r > 1 ? 1 : 0), iron: each };
  }

  Y.plan.build = function (cfg, selectedVillageIds) {
    var option_bases = Y.state.optionBases;
    var unitsMeta = Y.state.unitsMeta;

    if (!option_bases || !unitsMeta) {
      return { ok: false, err: "Run LOAD DATA first (options/units data missing)." };
    }

    var enabledOpts = cfg.enabledOptions.slice().sort(function (a, b) { return a - b; });
    var opts = optListFromBases(option_bases, enabledOpts);
    if (!opts.length) return { ok: false, err: "No category selected." };

    var targetSec = cfg.targetSec;
    var mode = cfg.mode;

    var rows = [];
    var vidList = Array.from(selectedVillageIds || []);
    vidList.sort(function (a, b) {
      var va = Y.state.villagesById.get(String(a));
      var vb = Y.state.villagesById.get(String(b));
      return String((va && va.village_name) || "").localeCompare(String((vb && vb.village_name) || ""));
    });

    for (var vi = 0; vi < vidList.length; vi++) {
      var vid = String(vidList[vi]);
      var v = Y.state.villagesById.get(vid);
      if (!v) continue;

      // skip no rally
      if (!v.has_rally_point) {
        rows.push({ village_id: vid, village_name: v.village_name, status: "SKIP", reason: "NO_RALLY" });
        continue;
      }

      var carryFactor = Number(v.unit_carry_factor || 1);

      // build troopsAllowed
      var troopsAllowed = {};
      cfg.sendOrder.forEach(function (u) {
        if (!cfg.unitsEnabled[u]) return;
        var home = (v.unit_counts_home && v.unit_counts_home[u]) ? Number(v.unit_counts_home[u]) : 0;
        var keep = (cfg.keepHome[u] != null) ? Number(cfg.keepHome[u]) : 0;
        var avail = Math.max(0, Math.floor(home - keep));
        troopsAllowed[u] = avail;
      });

      var totalBaseCarryAvail = sumBaseCarry(unitsMeta, troopsAllowed);
      if (totalBaseCarryAvail <= 0) {
        rows.push({ village_id: vid, village_name: v.village_name, status: "SKIP", reason: "NO_TROOPS" });
        continue;
      }

      // eligible options for this village (enabled + not locked + not active)
      var eligible = [];
      opts.forEach(function (ob) {
        var oid = String(ob.id);
        var st = v.options && v.options[oid];
        if (!st) return;
        if (st.is_locked) return;              // locked -> skip
        if (st.scavenging_squad) return;        // ACTIVE -> skip
        eligible.push(ob);
      });

      if (!eligible.length) {
        rows.push({ village_id: vid, village_name: v.village_name, status: "SKIP", reason: "NO_ELIGIBLE_OPTIONS" });
        continue;
      }

      // sort by loot desc for internal logic
      eligible.sort(function (a, b) { return (b.loot_factor || 0) - (a.loot_factor || 0); });

      var stepCarry = minUnitCarrySelected(unitsMeta, troopsAllowed);
      var carryAlloc = new Map(); // option_id -> baseCarry

      if (mode === "priority") {
        var haulTarget = calcHaulFromTime(targetSec, eligible[0]);
        if (!haulTarget) {
          rows.push({ village_id: vid, village_name: v.village_name, status: "SKIP", reason: "TIME_TOO_LOW" });
          continue;
        }

        var needByOpt = new Map();
        var totalNeed = 0;

        eligible.forEach(function (o) {
          // baseCarryNeed = (haul / loot) / carryFactor
          var need = Math.floor((haulTarget / (o.loot_factor || 1)) / carryFactor);
          // snap down to stepCarry
          need = Math.floor(need / stepCarry) * stepCarry;
          needByOpt.set(String(o.id), need);
          totalNeed += need;
        });

        if (totalBaseCarryAvail >= totalNeed) {
          eligible.forEach(function (o) { carryAlloc.set(String(o.id), needByOpt.get(String(o.id))); });
        } else {
          var rem = totalBaseCarryAvail;
          eligible.forEach(function (o) {
            if (rem <= 0) return;
            var need2 = needByOpt.get(String(o.id));
            var give = Math.min(need2, rem);
            carryAlloc.set(String(o.id), give);
            rem -= give;
          });
        }
      } else {
        // balanced
        var haulTargetB = calcHaulFromTime(targetSec, eligible[0]);
        if (!haulTargetB) {
          rows.push({ village_id: vid, village_name: v.village_name, status: "SKIP", reason: "TIME_TOO_LOW" });
          continue;
        }

        var invSum = 0;
        eligible.forEach(function (o) { invSum += (1 / (o.loot_factor || 1)); });

        // need total base carry for exact target time:
        var needTotalEff = haulTargetB * invSum;
        var needTotalBase = needTotalEff / carryFactor;

        var haulUsed = haulTargetB;
        if (totalBaseCarryAvail < needTotalBase) {
          // haulUsed such that totalBaseCarryAvail matches
          haulUsed = (totalBaseCarryAvail * carryFactor) / invSum;
        }

        // IMPORTANT: Balanced mode must respect the user's duration limit.
        // If troops are abundant, we must NOT consume extra carry that would push duration above targetSec.
        // Therefore we cap total base carry used to carryBudget = min(available, needTotalBase).
        var carryBudget = Math.min(totalBaseCarryAvail, needTotalBase);
        carryBudget = Math.floor(carryBudget);

        // initial snap
        var sum = 0;
        eligible.forEach(function (o) {
          var rawBase = (haulUsed / (o.loot_factor || 1)) / carryFactor;
          var vSnap = Math.floor(rawBase / stepCarry) * stepCarry;
          carryAlloc.set(String(o.id), vSnap);
          sum += vSnap;
        });

        // distribute remainder to min time (BUT NOT ABOVE carryBudget)
        var remB = carryBudget - sum;
        while (remB >= stepCarry) {
          var minId = null;
          var minT = Infinity;

          eligible.forEach(function (o) {
            var t = calcTimeFromCarryBase(carryAlloc.get(String(o.id)) || 0, o, carryFactor);
            if (t < minT) { minT = t; minId = String(o.id); }
          });

          carryAlloc.set(minId, (carryAlloc.get(minId) || 0) + stepCarry);
          remB -= stepCarry;
        }

        optimizeBalancedCarry(carryAlloc, eligible, stepCarry, 30, 300, carryFactor);
      }

      // now consume troops into per-option squads
      var troopsState = {};
      cfg.sendOrder.forEach(function (u) { troopsState[u] = troopsAllowed[u] || 0; });

      // build rows per option (UI wants stable order: balanced -> 1..4, priority -> high->low)
      var outOpts = eligible.slice();
      if (mode === "balanced") outOpts.sort(function (a, b) { return a.id - b.id; });
      else outOpts.sort(function (a, b) { return (b.loot_factor || 0) - (a.loot_factor || 0); });

      outOpts.forEach(function (o) {
        var oid = String(o.id);
        var baseCarryNeed = carryAlloc.get(oid) || 0;
        if (baseCarryNeed <= 0) return;

        var r = takeTroopsForCarry(baseCarryNeed, unitsMeta, troopsState, cfg.sendOrder);
        if (r.baseCarryUsed <= 0) return;

        // candidate_squad: include all enabled units in sendOrder (server-side safe)
        var cs = {};
        cfg.sendOrder.forEach(function (u) {
          if (!cfg.unitsEnabled[u]) return;
          cs[u] = Math.floor(r.planUnits[u] || 0);
        });

        var estSec = calcTimeFromCarryBase(r.baseCarryUsed, o, carryFactor);
        var effCarry = Math.floor(r.baseCarryUsed * carryFactor);
        var estLootTotal = Math.floor(effCarry * (o.loot_factor || 0));
        var tri = lootTriplet(estLootTotal);

        rows.push({
          village_id: vid,
          village_name: v.village_name,
          village_coord: v.village_name && v.village_name.match(/\((\d+\|\d+)\)/) ? RegExp.$1 : "",
          option_id: o.id,
          option_name: o.name,
          loot_factor: o.loot_factor,
          targetSec: targetSec,
          estSec: estSec,
          baseCarryUsed: r.baseCarryUsed,
          carryFactor: carryFactor,
          effCarry: effCarry,
          loot: tri,
          candidate_squad: cs,
          status: "OK",
          reason: ""
        });
      });

      // if nothing produced -> skip
      var produced = rows.some(function (rr) { return rr.village_id === vid && rr.status === "OK"; });
      if (!produced) {
        rows.push({ village_id: vid, village_name: v.village_name, status: "SKIP", reason: "NO_OUTPUT" });
      }
    }

    return { ok: true, rows: rows, targetSec: targetSec };
  };
})();
