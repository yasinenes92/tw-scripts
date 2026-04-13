(function () {
  'use strict';

  var Y = window.YRO_V33;
  if (!Y) return;

  function cloneRes(r) {
    return { wood: r.wood || 0, clay: r.clay || 0, iron: r.iron || 0, total: (r.wood || 0) + (r.clay || 0) + (r.iron || 0) };
  }
  function addRes(a, b) {
    a.wood += b.wood; a.clay += b.clay; a.iron += b.iron;
    a.total = a.wood + a.clay + a.iron;
    return a;
  }
  function max0(n) { return Math.max(0, Y.safeInt(n, 0)); }

  function uniq(arr) {
    arr = Array.isArray(arr) ? arr : [];
    var seen = Object.create(null);
    var out = [];
    for (var i = 0; i < arr.length; i++) {
      var v = String(arr[i]);
      if (!v || seen[v]) continue;
      seen[v] = true;
      out.push(Y.safeInt(arr[i], 0));
    }
    return out.filter(Boolean);
  }

  function capEach(storage, pct) {
    storage = max0(storage);
    pct = Math.max(0, Math.min(100, Number(pct || 0)));
    return Math.floor(storage * (pct / 100));
  }

  function reserveEach(storage, pct) {
    storage = max0(storage);
    pct = Math.max(0, Math.min(100, Number(pct || 0)));
    return Math.floor(storage * (pct / 100));
  }

  function clamp(n, lo, hi) { n = Number(n || 0); if (n < lo) return lo; if (n > hi) return hi; return n; }
  function pctToFrac(p) { return clamp(p, 0, 100) / 100; }

  function computeGroupTotals(ids, statesMap, incomingMap) {
    var tot = { wood: 0, clay: 0, iron: 0, total: 0, storage: 0, merchFree: 0 };
    (ids || []).forEach(function (vid) {
      vid = Y.toId(vid);
      var s = statesMap.get(vid);
      if (!s) return;
      var inc = incomingMap && incomingMap[vid] ? incomingMap[vid] : { wood: 0, clay: 0, iron: 0 };
      tot.wood += (s.base0.wood || 0) + (inc.wood || 0);
      tot.clay += (s.base0.clay || 0) + (inc.clay || 0);
      tot.iron += (s.base0.iron || 0) + (inc.iron || 0);
      tot.storage += (s.storage || 0);
      tot.merchFree += (s.merchFree0 != null ? s.merchFree0 : s.merchFree);
    });
    tot.total = tot.wood + tot.clay + tot.iron;
    return tot;
  }

  function computeDonorSupply(ids, statesMap, reservePct) {
    var sup = { wood: 0, clay: 0, iron: 0, total: 0, merchFree: 0 };
    var keepById = {};
    (ids || []).forEach(function (vid) {
      vid = Y.toId(vid);
      var s = statesMap.get(vid);
      if (!s) return;
      var keep = reserveEach(s.storage || 0, reservePct);
      keepById[vid] = keep;
      var w = Math.max(0, Math.floor((s.base0.wood || 0) - keep));
      var c = Math.max(0, Math.floor((s.base0.clay || 0) - keep));
      var i = Math.max(0, Math.floor((s.base0.iron || 0) - keep));
      sup.wood += w; sup.clay += c; sup.iron += i;
      sup.merchFree += (s.merchFree0 != null ? s.merchFree0 : s.merchFree);
    });
    sup.total = sup.wood + sup.clay + sup.iron;
    sup.merchBudget = sup.merchFree * (Y.cfg.MERCH_CAP_PER || 1000);
    sup.keepById = keepById;
    return sup;
  }

  function minReqPerRes(baseEach, tolFrac, ironTolFrac) {
    return {
      wood: Math.floor(baseEach * (1 - tolFrac)),
      clay: Math.floor(baseEach * (1 - tolFrac)),
      iron: Math.floor(baseEach * (1 - ironTolFrac)),
    };
  }

  function maxReqPerRes(baseEach, tolFrac, ironTolFrac, storage) {
    return {
      wood: Math.min(storage, Math.ceil(baseEach * (1 + tolFrac))),
      clay: Math.min(storage, Math.ceil(baseEach * (1 + tolFrac))),
      iron: Math.min(storage, Math.ceil(baseEach * (1 + ironTolFrac))),
    };
  }

  function computeAutoCapPctPush(targetIds, targetTotals, donorSupply, tolPct, ironTolPct) {
    // Find the highest capPct such that donors can cover MIN requirements (within tolerance),
    // and total shipped volume fits merchant budget.
    var tolFrac = pctToFrac(tolPct);
    var ironTolFrac = pctToFrac((ironTolPct == null ? tolPct : ironTolPct));

    // upper bound due to tolerance & storage cap
    var hardMax = Math.floor(100 / (1 + Math.max(tolFrac, ironTolFrac)));
    if (hardMax > 99) hardMax = 99;
    if (hardMax < 1) hardMax = 1;

    var lo = 1, hi = hardMax, best = 1;

    // Precompute sum(storage) for targets
    var sumStorage = targetTotals.storage || 0;
    if (sumStorage <= 0) return 0;

    function feasible(capPct) {
      var baseEachSum = sumStorage * (capPct / 100);
      // MIN requirements totals (wood/clay/iron)
      var minWoodTot = baseEachSum * (1 - tolFrac);
      var minClayTot = baseEachSum * (1 - tolFrac);
      var minIronTot = baseEachSum * (1 - ironTolFrac);

      var needW = Math.max(0, Math.ceil(minWoodTot - targetTotals.wood));
      var needC = Math.max(0, Math.ceil(minClayTot - targetTotals.clay));
      var needI = Math.max(0, Math.ceil(minIronTot - targetTotals.iron));

      if (needW > donorSupply.wood) return false;
      if (needC > donorSupply.clay) return false;
      if (needI > donorSupply.iron) return false;

      var needTot = needW + needC + needI;
      if (needTot > donorSupply.merchBudget) return false;
      return true;
    }

    while (lo <= hi) {
      var mid = Math.floor((lo + hi) / 2);
      if (feasible(mid)) {
        best = mid;
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }

    return best;
  }

  function buildTradeSuggestion(targetTotals, donorSupply, capPct, tolPct, ironTolPct) {
    var tolFrac = pctToFrac(tolPct);
    var ironTolFrac = pctToFrac((ironTolPct == null ? tolPct : ironTolPct));

    var sumStorage = targetTotals.storage || 0;
    var baseEachSum = sumStorage * (capPct / 100);

    var minWoodTot = baseEachSum * (1 - tolFrac);
    var minClayTot = baseEachSum * (1 - tolFrac);
    var minIronTot = baseEachSum * (1 - ironTolFrac);

    var needW = Math.max(0, Math.ceil(minWoodTot - targetTotals.wood));
    var needC = Math.max(0, Math.ceil(minClayTot - targetTotals.clay));
    var needI = Math.max(0, Math.ceil(minIronTot - targetTotals.iron));

    var deficit = {
      wood: Math.max(0, needW - donorSupply.wood),
      clay: Math.max(0, needC - donorSupply.clay),
      iron: Math.max(0, needI - donorSupply.iron),
    };

    var defRes = null;
    var defBest = 0;
    ['wood','clay','iron'].forEach(function(r){
      if (deficit[r] > defBest) { defBest = deficit[r]; defRes = r; }
    });
    if (!defRes || defBest <= 0) return null;

    // Surplus to sell: donors' supply above required needs
    var surplus = {
      wood: Math.max(0, donorSupply.wood - needW),
      clay: Math.max(0, donorSupply.clay - needC),
      iron: Math.max(0, donorSupply.iron - needI),
    };

    // Pick the biggest surplus resource to sell
    var sellRes = 'iron';
    var best = -1;
    ['iron','clay','wood'].forEach(function(r){
      if (surplus[r] > best) { best = surplus[r]; sellRes = r; }
    });
    if (best <= 0) {
      // no surplus above needs; sell the largest available anyway
      sellRes = (donorSupply.iron >= donorSupply.clay && donorSupply.iron >= donorSupply.wood) ? 'iron'
               : (donorSupply.clay >= donorSupply.wood ? 'clay' : 'wood');
    }

    var amt = deficit[defRes];
    if (amt <= 0) return null;

    return {
      buy: { res: defRes, amount: amt },
      sell: { res: sellRes, amount: amt },
      reason: defRes.toUpperCase() + ' shortage for selected tolerance.',
    };
  }

  function pickBestSellerVillage(donorIds, statesMap, reservePct, sellRes) {
    var bestVid = null;
    var bestAvail = -1;
    donorIds.forEach(function(vid){
      vid = Y.toId(vid);
      var s = statesMap.get(vid);
      if (!s) return;
      var keep = reserveEach(s.storage || 0, reservePct);
      var avail = Math.max(0, Math.floor((s.base0[sellRes] || 0) - keep));
      if (avail > bestAvail) { bestAvail = avail; bestVid = vid; }
    });
    return bestVid;
  }

  function computeIncomingForSet(villageIds, incomingMap) {
    var set = {};
    (villageIds || []).forEach(function (id) { set[String(id)] = true; });

    var allByVid = {};
    var extByVid = {};

    (villageIds || []).forEach(function (id) {
      var it = incomingMap && incomingMap[id] ? incomingMap[id] : null;
      if (!it) {
        allByVid[id] = { wood: 0, clay: 0, iron: 0, total: 0 };
        extByVid[id] = { wood: 0, clay: 0, iron: 0, total: 0 };
        return;
      }

      allByVid[id] = { wood: it.wood || 0, clay: it.clay || 0, iron: it.iron || 0, total: it.total || 0 };

      var ext = { wood: it.wood || 0, clay: it.clay || 0, iron: it.iron || 0, total: it.total || 0 };
      var byFrom = it.byFrom || {};
      for (var fk in byFrom) {
        if (!Object.prototype.hasOwnProperty.call(byFrom, fk)) continue;
        if (fk !== '0' && set[fk]) {
          ext.wood -= byFrom[fk].wood || 0;
          ext.clay -= byFrom[fk].clay || 0;
          ext.iron -= byFrom[fk].iron || 0;
        }
      }
      ext.wood = max0(ext.wood);
      ext.clay = max0(ext.clay);
      ext.iron = max0(ext.iron);
      ext.total = ext.wood + ext.clay + ext.iron;
      extByVid[id] = ext;
    });

    return { allByVid: allByVid, externalByVid: extByVid };
  }

  function buildPlanState(vids, snapshotsById, incomingMap, capPct, reservePct, capOverrideById) {
    var st = new Map();

    (vids || []).forEach(function (vid) {
      var snap = snapshotsById[vid];
      if (!snap) return;

      var inc = incomingMap && incomingMap[vid] ? cloneRes(incomingMap[vid]) : { wood: 0, clay: 0, iron: 0, total: 0 };
      var base = cloneRes(snap.resNow || { wood: 0, clay: 0, iron: 0 });

      var storage = max0(snap.storage || 0);
      var keep = reserveEach(storage, reservePct);

      var cap = capEach(storage, capPct);
      if (capOverrideById && capOverrideById[vid] != null) cap = max0(capOverrideById[vid]);

      st.set(vid, {
        id: vid,
        name: snap.name || ('Village ' + vid),
        coord: snap.coord || '',
        storage: storage,

        base0: cloneRes(base),
        inc0: cloneRes(inc),

        baseNow: cloneRes(base),
        inPlanned: { wood: 0, clay: 0, iron: 0, total: 0 },
        outPlanned: { wood: 0, clay: 0, iron: 0, total: 0 },

        keepEach: keep,
        capEach: cap,

        merchFree: max0((snap.merch && snap.merch.free != null) ? snap.merch.free : 0),
        merchFree0: max0((snap.merch && snap.merch.free != null) ? snap.merch.free : 0),
        merchTotal: max0((snap.merch && snap.merch.total != null) ? snap.merch.total : 0),
        capEachByRes: null,

        outTo: new Map(), // toVid -> {wood,clay,iron,total,tags:Set}
      });
    });

    return st;
  }

  function getFutureRecvVal(toState, rk) {
    return (toState.baseNow[rk] || 0) + (toState.inc0[rk] || 0) + (toState.inPlanned[rk] || 0);
  }

  function maxPairAdditionalByMerchants(fromState, toState) {
    var rec = fromState.outTo.get(toState.id);
    if (!rec) return fromState.merchFree * Y.cfg.MERCH_CAP_PER;
    var oldTotal = rec.total || 0;
    var oldMerch = Math.ceil(oldTotal / Y.cfg.MERCH_CAP_PER);
    var maxTotalWithMerch = (oldMerch + fromState.merchFree) * Y.cfg.MERCH_CAP_PER;
    return Math.max(0, maxTotalWithMerch - oldTotal);
  }

  function applySend(fromState, toState, rk, amount, tag, phaseOrder, allocations) {
    if (!fromState || !toState) return 0;
    if (!rk || amount <= 0) return 0;
    if (fromState.id === toState.id) return 0;

    amount = Math.floor(amount);

    var avail = (fromState.baseNow[rk] || 0) - fromState.keepEach;
    avail = Math.max(0, Math.floor(avail));
    if (avail <= 0) return 0;

    var cap = Math.max(0, Math.floor((toState.capEachByRes && toState.capEachByRes[rk] != null) ? toState.capEachByRes[rk] : (toState.capEach || 0)));
    var curFuture = getFutureRecvVal(toState, rk);
    var space = cap - curFuture;
    space = Math.max(0, Math.floor(space));
    if (space <= 0) return 0;

    var send = Math.min(amount, avail, space);
    if (send <= 0) return 0;

    var rec = fromState.outTo.get(toState.id);
    if (!rec) {
      rec = { wood: 0, clay: 0, iron: 0, total: 0, tags: new Set(), orders: new Set() };
      fromState.outTo.set(toState.id, rec);
    }

    var oldTotal = rec.total || 0;
    var oldMerch = Math.ceil(oldTotal / Y.cfg.MERCH_CAP_PER);
    var maxSendAllowed = maxPairAdditionalByMerchants(fromState, toState);
    if (maxSendAllowed <= 0) return 0;
    if (send > maxSendAllowed) send = maxSendAllowed;

    var newTotal = oldTotal + send;
    var newMerch = Math.ceil(newTotal / Y.cfg.MERCH_CAP_PER);
    var addMerch = newMerch - oldMerch;
    if (addMerch > fromState.merchFree) return 0;

    fromState.baseNow[rk] -= send;
    fromState.outPlanned[rk] = (fromState.outPlanned[rk] || 0) + send;
    fromState.outPlanned.total += send;

    toState.inPlanned[rk] = (toState.inPlanned[rk] || 0) + send;
    toState.inPlanned.total += send;

    rec[rk] = (rec[rk] || 0) + send;
    rec.total = newTotal;
    rec.tags.add(tag || '');
    if (phaseOrder != null) rec.orders.add(phaseOrder);

    fromState.merchFree -= addMerch;
    if (fromState.merchFree < 0) fromState.merchFree = 0;

    if (Array.isArray(allocations)) {
      allocations.push({
        from: fromState.id,
        to: toState.id,
        resource: rk,
        amount: send,
        phaseTag: tag || '',
        phaseOrder: phaseOrder == null ? 99 : phaseOrder
      });
    }

    return send;
  }

  function compileShipments(statesMap) {
    var shipments = [];
    statesMap.forEach(function (from) {
      from.outTo.forEach(function (rec, toId) {
        if (!rec || (rec.total || 0) <= 0) return;
        var tags = Array.from(rec.tags || []).filter(Boolean);
        shipments.push({
          from: from.id,
          to: toId,
          wood: rec.wood || 0,
          clay: rec.clay || 0,
          iron: rec.iron || 0,
          total: rec.total || 0,
          merch: Math.ceil((rec.total || 0) / Y.cfg.MERCH_CAP_PER),
          phaseOrders: Array.from(rec.orders || []).sort(function (a, b) { return a - b; }),
          phaseOrder: rec.orders && rec.orders.size ? Math.min.apply(null, Array.from(rec.orders)) : 99,
          tag: tags.length ? tags.join('+') : '',
        });
      });
    });
    shipments.sort(function (a, b) {
      if ((a.phaseOrder || 99) !== (b.phaseOrder || 99)) return (a.phaseOrder || 99) - (b.phaseOrder || 99);
      return (b.total || 0) - (a.total || 0);
    });
    return shipments;
  }

  function clamp(n, lo, hi) { n = Number(n || 0); if (n < lo) return lo; if (n > hi) return hi; return n; }

  function ironFactorFromDeltaPct(deltaPct) {
    // deltaPct: -50..+50 (recommended)
    deltaPct = clamp(deltaPct, -90, 300); // hard safety bounds
    return 1 + (deltaPct / 100);
  }

  function desiredTripletFromTotal(totalSum, capEachTarget, ironFactor) {
    totalSum = max0(totalSum);
    capEachTarget = max0(capEachTarget);
    ironFactor = Math.max(0, Number(ironFactor || 1));

    var denom = 2 + ironFactor;
    if (denom <= 0) denom = 3;

    var base = Math.floor(totalSum / denom);
    var wood = Math.min(capEachTarget, base);
    var clay = Math.min(capEachTarget, base);
    var iron = Math.min(capEachTarget, Math.floor(base * ironFactor));

    return { wood: max0(wood), clay: max0(clay), iron: max0(iron) };
  }

  function desiredTripletFromCap(capEachTarget, ironFactor) {
    capEachTarget = max0(capEachTarget);
    ironFactor = Math.max(0, Number(ironFactor || 1));

    var wood, clay, iron;

    if (ironFactor >= 1) {
      iron = capEachTarget;
      var base = (ironFactor === 0) ? capEachTarget : Math.floor(capEachTarget / ironFactor);
      wood = clay = base;
    } else {
      wood = clay = capEachTarget;
      iron = Math.floor(capEachTarget * ironFactor);
    }

    wood = Math.min(capEachTarget, max0(wood));
    clay = Math.min(capEachTarget, max0(clay));
    iron = Math.min(capEachTarget, max0(iron));

    return { wood: wood, clay: clay, iron: iron };
  }

  function normalizeModeASets(targetIds, surplusIds) {
    targetIds = uniq(targetIds);
    var selectedSurplusIds = uniq(surplusIds);
    var warnings = [];
    var excluded = [];
    var targetSet = idSet(targetIds);
    var overlap = selectedSurplusIds.filter(function (id) { return !!targetSet[id]; });
    surplusIds = selectedSurplusIds.slice();
    return {
      targetIds: targetIds,
      surplusIds: surplusIds,
      selectedSurplusIds: selectedSurplusIds,
      sharedTargetSurplusIds: overlap,
      warnings: warnings,
      excludedOverlapIds: excluded
    };
  }

  function buildModeAFillTargets(st, targetIds, ratioPct) {
    return buildModeBTargets(st, targetIds, ratioPct);
  }

  function buildModeAFlatTargets(st, targetIds, flatTargetEach, depotCapPct) {
    return buildModeDTargets(st, targetIds, flatTargetEach, depotCapPct);
  }

  function simulateModeAFillCandidate(targetIds, surplusIds, snapshotsById, incomingMap, ratioPct) {
    var allIds = uniq(targetIds.concat(surplusIds));
    var st = buildPlanState(allIds, snapshotsById, incomingMap, 0, 0, null);
    var allocations = [];
    var targetsById = buildModeAFillTargets(st, targetIds, ratioPct);
    runChildRebalance(st, targetIds, targetsById, allocations);
    return {
      feasible: childrenSatisfied(st, targetIds, targetsById),
      states: st,
      allocations: allocations,
      targetsById: targetsById,
      capsById: null,
      ratioPct: ratioPct,
      flatTargetEach: null
    };
  }

  function simulateModeAFlatCandidate(targetIds, surplusIds, snapshotsById, incomingMap, flatTargetEach, depotCapPct) {
    var allIds = uniq(targetIds.concat(surplusIds));
    var st = buildPlanState(allIds, snapshotsById, incomingMap, 0, 0, null);
    var allocations = [];
    var built = buildModeAFlatTargets(st, targetIds, flatTargetEach, depotCapPct);
    runChildRebalance(st, targetIds, built.targetsById, allocations);
    return {
      feasible: childrenSatisfied(st, targetIds, built.targetsById),
      states: st,
      allocations: allocations,
      targetsById: built.targetsById,
      capsById: built.capsById,
      ratioPct: null,
      flatTargetEach: flatTargetEach
    };
  }

  function sumBaselineTotals(st, ids) {
    var out = zeroRes();
    (ids || []).forEach(function (id) {
      var s = st.get(id);
      if (!s) return;
      out.wood += (s.base0.wood || 0) + (s.inc0.wood || 0);
      out.clay += (s.base0.clay || 0) + (s.inc0.clay || 0);
      out.iron += (s.base0.iron || 0) + (s.inc0.iron || 0);
    });
    return refreshRes(out);
  }

  function sumTargetTotals(ids, targetsById) {
    var out = zeroRes();
    (ids || []).forEach(function (id) {
      var targetEach = max0(targetsById && targetsById[id]);
      out.wood += targetEach;
      out.clay += targetEach;
      out.iron += targetEach;
    });
    return refreshRes(out);
  }

  function merchantBudgetForIds(st, ids) {
    var total = 0;
    (ids || []).forEach(function (id) {
      var s = st.get(id);
      if (!s) return;
      total += max0(s.merchFree0 || 0) * Y.cfg.MERCH_CAP_PER;
    });
    return total;
  }

  function buildModeASurplusRoom(st, surplusIds, surplusCapPct) {
    setSurplusCaps(st, surplusIds, surplusCapPct);
    var total = zeroRes();
    var rows = [];
    (surplusIds || []).forEach(function (id) {
      var s = st.get(id);
      if (!s) return;
      var room = refreshRes({
        wood: surplusSpace(s, 'wood'),
        clay: surplusSpace(s, 'clay'),
        iron: surplusSpace(s, 'iron'),
        total: 0
      });
      if (room.total <= 0) return;
      total.wood += room.wood;
      total.clay += room.clay;
      total.iron += room.iron;
      rows.push({
        id: s.id,
        name: s.name,
        coord: s.coord,
        storage: s.storage || 0,
        capEach: s.capEach || 0,
        room: room
      });
    });
    refreshRes(total);
    rows.sort(function (a, b) {
      return (b.room.total || 0) - (a.room.total || 0) || a.id - b.id;
    });
    return {
      total: total,
      rows: rows,
      villagesWithRoom: rows.length
    };
  }

  function runModeASurplusRouting(st, targetIds, surplusIds, targetsById, surplusCapPct, allocations) {
    if (!surplusIds.length) return;
    setSurplusCaps(st, surplusIds, surplusCapPct);

    ['wood', 'clay', 'iron'].forEach(function (rk) {
      var receivers = surplusIds.map(function (id) {
        var s = st.get(id);
        if (!s) return null;
        var need = surplusSpace(s, rk);
        return need > 0 ? { id: id, need: need, storage: s.storage || 0 } : null;
      }).filter(Boolean);

      receivers.sort(function (a, b) {
        if (b.need !== a.need) return b.need - a.need;
        if (b.storage !== a.storage) return b.storage - a.storage;
        return a.id - b.id;
      });

      receivers.forEach(function (rec) {
        var to = st.get(rec.id);
        if (!to) return;

        while (rec.need > 0) {
          var donors = targetIds.map(function (id) {
            var s = st.get(id);
            if (!s || (s.merchFree || 0) <= 0) return null;
            if (id === rec.id) return null;
            var sendable = childSendable(s, rk, targetsById[id] || 0);
            return sendable > 0 ? { id: id, state: s, sendable: sendable, storage: s.storage || 0 } : null;
          }).filter(Boolean);

          donors.sort(function (a, b) {
            if (b.sendable !== a.sendable) return b.sendable - a.sendable;
            if (b.storage !== a.storage) return b.storage - a.storage;
            return a.id - b.id;
          });

          if (!donors.length) break;
          var donor = donors[0];
          var sent = applySend(donor.state, to, rk, Math.min(donor.sendable, rec.need), 'SUR', Y.cfg.PHASE_ORDER.SUR, allocations);
          if (sent <= 0) break;
          rec.need = surplusSpace(to, rk);
        }
      });
    });
  }

  function buildModeAFillStopReasonDiagnostics(targetIds, surplusIds, snapshotsById, incomingMap, bestRatio, maxFill) {
    var lines = [];
    if (bestRatio >= maxFill) {
      var ceilingText = 'Stopped at the user ceiling (' + Y.formatTwNumber(maxFill) + '%).';
      lines.push(ceilingText);
      return {
        nextRatioPct: null,
        stopReason: ceilingText,
        bottlenecks: [],
        residualNeed: zeroRes(),
        baselineTotals: zeroRes(),
        targetTotals: zeroRes(),
        groupMerchantBudget: 0,
        lockedSupply: { total: zeroRes(), villages: [] },
        lines: lines
      };
    }

    var nextRatio = bestRatio + 1;
    var trial = simulateModeACandidate(targetIds, surplusIds, snapshotsById, incomingMap, nextRatio);
    var residual = sumChildNeeds(trial.states, targetIds, trial.targetsById);
    var baselineTotals = sumBaselineTotals(trial.states, targetIds);
    var targetTotals = sumTargetTotals(targetIds, trial.targetsById);
    var lockedSupply = computeLockedChildSupply(trial.states, targetIds, trial.targetsById);
    var groupMerchantBudget = merchantBudgetForIds(trial.states, targetIds);
    var shortages = zeroRes();
    ['wood', 'clay', 'iron'].forEach(function (rk) {
      shortages[rk] = Math.max(0, (targetTotals[rk] || 0) - (baselineTotals[rk] || 0));
    });
    refreshRes(shortages);

    var bottlenecks = [];
    ['wood', 'clay', 'iron'].forEach(function (rk) {
      if (shortages[rk] > 0) {
        bottlenecks.push({
          type: 'group_' + rk + '_shortage',
          text: 'Target-group ' + rk + ' total ' + Y.formatTwNumber(baselineTotals[rk]) + ' < needed ' + Y.formatTwNumber(targetTotals[rk]) + ' at ' + nextRatio + '%.'
        });
      }
    });

    if (residual.total > 0 && lockedSupply.total.total > 0) {
      bottlenecks.push({
        type: 'merchant_exhaustion',
        text: 'Target-group merchant exhaustion leaves ' + formatResShort(lockedSupply.total) + ' movable current stock stranded at ' + nextRatio + '%.'
      });
    }

    if (!bottlenecks.length && residual.total > 0) {
      bottlenecks.push({
        type: 'current_stock_mobility',
        text: 'Next ratio ' + nextRatio + '% fails under same-run current-stock movement limits.'
      });
    }

    lines.push('Stop reason: ' + (bottlenecks[0] ? bottlenecks[0].text : ('Next ratio ' + nextRatio + '% is not feasible.')));
    if (residual.total > 0) lines.push('Next ' + nextRatio + '% still needs ' + formatResShort(residual) + ' after in-group rebalance.');
    if (lockedSupply.total.total > 0) lines.push('Merchant-stranded current stock at next ratio: ' + formatResShort(lockedSupply.total) + '.');

    return {
      basis: 'fill',
      nextRatioPct: nextRatio,
      nextFlatTarget: null,
      stopReason: bottlenecks.length ? bottlenecks[0].text : ('Next ratio ' + nextRatio + '% is not feasible.'),
      bottlenecks: bottlenecks,
      residualNeed: residual,
      baselineTotals: baselineTotals,
      targetTotals: targetTotals,
      groupMerchantBudget: groupMerchantBudget,
      lockedSupply: lockedSupply,
      lines: lines
    };
  }

  function buildModeAFlatStopReasonDiagnostics(targetIds, surplusIds, snapshotsById, incomingMap, bestFlatTarget, depotCapPct) {
    var lines = [];
    depotCapPct = clamp(depotCapPct, 0, 100);
    var upperBound = 0;
    (targetIds || []).forEach(function (id) {
      var snap = snapshotsById[id];
      if (!snap) return;
      upperBound = Math.max(upperBound, capEach(snap.storage || 0, depotCapPct));
    });

    if (bestFlatTarget >= upperBound) {
      var ceilingText = 'Stopped at the effective depot-cap ceiling. All remaining flat-target growth is capped by village storage.';
      lines.push(ceilingText);
      return {
        basis: 'flat',
        nextRatioPct: null,
        nextFlatTarget: null,
        stopReason: ceilingText,
        bottlenecks: [],
        residualNeed: zeroRes(),
        baselineTotals: zeroRes(),
        targetTotals: zeroRes(),
        groupMerchantBudget: 0,
        lockedSupply: { total: zeroRes(), villages: [] },
        cappedVillages: [],
        lines: lines
      };
    }

    var nextFlatTarget = bestFlatTarget + 1;
    var trial = simulateModeAFlatCandidate(targetIds, surplusIds, snapshotsById, incomingMap, nextFlatTarget, depotCapPct);
    var residual = sumChildNeeds(trial.states, targetIds, trial.targetsById);
    var baselineTotals = sumBaselineTotals(trial.states, targetIds);
    var targetTotals = sumTargetTotals(targetIds, trial.targetsById);
    var lockedSupply = computeLockedChildSupply(trial.states, targetIds, trial.targetsById);
    var groupMerchantBudget = merchantBudgetForIds(trial.states, targetIds);
    var shortages = zeroRes();
    ['wood', 'clay', 'iron'].forEach(function (rk) {
      shortages[rk] = Math.max(0, (targetTotals[rk] || 0) - (baselineTotals[rk] || 0));
    });
    refreshRes(shortages);
    var cappedVillages = buildModeDCappedRows(trial.states, targetIds, trial.capsById, nextFlatTarget);

    var bottlenecks = [];
    ['wood', 'clay', 'iron'].forEach(function (rk) {
      if (shortages[rk] > 0) {
        bottlenecks.push({
          type: 'group_' + rk + '_shortage',
          text: 'Target-group ' + rk + ' total ' + Y.formatTwNumber(baselineTotals[rk]) + ' < needed ' + Y.formatTwNumber(targetTotals[rk]) + ' at flat target ' + Y.formatTwNumber(nextFlatTarget) + '.'
        });
      }
    });
    if (residual.total > 0 && lockedSupply.total.total > 0) {
      bottlenecks.push({
        type: 'merchant_exhaustion',
        text: 'Target-group merchant exhaustion leaves ' + formatResShort(lockedSupply.total) + ' movable current stock stranded at flat target ' + Y.formatTwNumber(nextFlatTarget) + '.'
      });
    }
    if (!bottlenecks.length && residual.total > 0) {
      bottlenecks.push({
        type: 'current_stock_mobility',
        text: 'Next flat target ' + Y.formatTwNumber(nextFlatTarget) + ' fails under same-run current-stock movement limits.'
      });
    }

    lines.push('Stop reason: ' + (bottlenecks[0] ? bottlenecks[0].text : ('Next flat target ' + Y.formatTwNumber(nextFlatTarget) + ' is not feasible.')));
    if (residual.total > 0) lines.push('Next flat target ' + Y.formatTwNumber(nextFlatTarget) + ' still needs ' + formatResShort(residual) + ' after in-group rebalance.');
    if (lockedSupply.total.total > 0) lines.push('Merchant-stranded current stock at next flat target: ' + formatResShort(lockedSupply.total) + '.');
    if (cappedVillages.length) lines.push('Capped villages at next flat target: ' + cappedVillages.map(function (row) { return row.name + ' (' + Y.formatTwNumber(row.capEach) + ')'; }).join(' | '));

    return {
      basis: 'flat',
      nextRatioPct: null,
      nextFlatTarget: nextFlatTarget,
      stopReason: bottlenecks.length ? bottlenecks[0].text : ('Next flat target ' + Y.formatTwNumber(nextFlatTarget) + ' is not feasible.'),
      bottlenecks: bottlenecks,
      residualNeed: residual,
      baselineTotals: baselineTotals,
      targetTotals: targetTotals,
      groupMerchantBudget: groupMerchantBudget,
      lockedSupply: lockedSupply,
      cappedVillages: cappedVillages,
      lines: lines
    };
  }

  function buildModeADiagnostics(finalRun, targetIds, normalized, snapshotsById, incomingMap, acceptedValue, ceilingValue, options, initialSurplusRoom, remainingSurplusRoom) {
    var stop = options.balanceBasis === 'flat'
      ? buildModeAFlatStopReasonDiagnostics(targetIds, normalized.surplusIds, snapshotsById, incomingMap, acceptedValue, options.depotCapPct)
      : buildModeAFillStopReasonDiagnostics(targetIds, normalized.surplusIds, snapshotsById, incomingMap, acceptedValue, ceilingValue);
    var hasUsableSurplusCapacity = !!(normalized.surplusIds.length && initialSurplusRoom && initialSurplusRoom.total && initialSurplusRoom.total.total > 0);
    var excess = buildNonMovableExcessDiagnostics(finalRun.states, targetIds, finalRun.targetsById, hasUsableSurplusCapacity);
    var lines = stop.lines.slice();
    var selectedSurplusCount = (normalized.selectedSurplusIds || []).length;
    var overlapCount = (normalized.sharedTargetSurplusIds || []).length;

    if (!selectedSurplusCount) {
      lines.push('No Surplus group selected for excess parking.');
    } else {
      if (overlapCount) {
        lines.push('Target/Surplus overlap retained for the post-balance sink stage: ' + normalized.sharedTargetSurplusIds.join(', ') + '.');
      }
      if (!initialSurplusRoom || initialSurplusRoom.total.total <= 0) {
        lines.push('Usable Surplus villages remain, but Surplus Cap % leaves no room for excess parking.');
      } else {
        lines.push('Usable Surplus room before parking: ' + formatResShort(initialSurplusRoom.total) + '.');
        if (remainingSurplusRoom && remainingSurplusRoom.total.total > 0) {
          lines.push('Remaining usable Surplus room after parking: ' + formatResShort(remainingSurplusRoom.total) + '.');
        }
      }
    }

    if (excess.totals.arrivalLocked.total > 0) {
      lines.push('Arrival-locked excess: ' + formatResShort(excess.totals.arrivalLocked) + '.');
      var topArrival = topDiagRows(excess.rows, 'arrival_locked', 2);
      if (topArrival.length) lines.push('Top arrival-locked villages: ' + topArrival.join(' | '));
    }
    if (excess.totals.merchantStranded.total > 0) {
      lines.push('Merchant-stranded excess: ' + formatResShort(excess.totals.merchantStranded) + '.');
      var topMerchant = topDiagRows(excess.rows, 'merchant_stranded', 2);
      if (topMerchant.length) lines.push('Top merchant-stranded villages: ' + topMerchant.join(' | '));
    }
    if (excess.totals.sinkBlocked.total > 0) {
      var sinkLabel = 'Residual movable excess still remains after the optional sink stage.';
      if (!selectedSurplusCount) sinkLabel = 'No Surplus group was selected for leftover target-group excess.';
      else if (!initialSurplusRoom || initialSurplusRoom.total.total <= 0) sinkLabel = 'Usable Surplus villages existed, but Surplus Cap % left no room.';
      else if (remainingSurplusRoom && remainingSurplusRoom.total.total <= 0) sinkLabel = 'Usable Surplus sink filled up before all movable excess could be parked.';
      lines.push('Sink-blocked excess: ' + formatResShort(excess.totals.sinkBlocked) + '. ' + sinkLabel);
      var sinkType = hasUsableSurplusCapacity ? 'residual_excess' : 'sink_blocked';
      var topSink = topDiagRows(excess.rows, sinkType, 2);
      if (topSink.length) lines.push('Top sink-blocked villages: ' + topSink.join(' | '));
    }

    return {
      balanceBasis: options.balanceBasis,
      stopReason: stop.stopReason,
      nextRatioPct: stop.nextRatioPct,
      nextFlatTarget: stop.nextFlatTarget,
      bottlenecks: stop.bottlenecks,
      residualNeedAtNextRatio: stop.residualNeed,
      baselineTotalsAtNextRatio: stop.baselineTotals,
      targetTotalsAtNextRatio: stop.targetTotals,
      groupMerchantBudgetAtNextRatio: stop.groupMerchantBudget,
      lockedSupplyAtNextRatio: stop.lockedSupply,
      cappedVillagesAtNextTarget: stop.cappedVillages || [],
      nonMovableExcess: excess,
      surplusRoomBeforeParking: initialSurplusRoom,
      surplusRoomAfterParking: remainingSurplusRoom,
      lines: lines
    };
  }

  function normalizeModeABasisOptions(modeAOptions, surplusCapPct) {
    var out = {};
    if (modeAOptions && typeof modeAOptions === 'object' && !Array.isArray(modeAOptions)) {
      out.balanceBasis = String(modeAOptions.balanceBasis || '').toLowerCase() === 'flat' ? 'flat' : 'fill';
      out.capPct = clamp(modeAOptions.capPct, 0, 100);
      out.depotCapPct = clamp(modeAOptions.depotCapPct, 0, 100);
      out.surplusCapPct = clamp(modeAOptions.surplusCapPct, 0, 100);
    } else {
      out.balanceBasis = 'fill';
      out.capPct = clamp(modeAOptions, 0, 100);
      out.depotCapPct = 80;
      out.surplusCapPct = clamp(surplusCapPct, 0, 100);
    }
    return out;
  }

  function planBalance(targetIds, surplusIds, snapshotsById, incomingMap, modeAOptions, surplusCapPct) {
    var options = normalizeModeABasisOptions(modeAOptions, surplusCapPct);
    var normalized = normalizeModeASets(targetIds, surplusIds);
    targetIds = normalized.targetIds;
    surplusIds = normalized.surplusIds;
    var warnings = normalized.warnings.slice();
    var maxFill = targetIds.length ? options.capPct : 0;
    var maxFlatTarget = 0;
    if (options.balanceBasis === 'flat') {
      targetIds.forEach(function (id) {
        var snap = snapshotsById[id];
        if (!snap) return;
        maxFlatTarget = Math.max(maxFlatTarget, capEach(snap.storage || 0, options.depotCapPct));
      });
    }

    if (!targetIds.length) {
      warnings.push('No Target villages selected.');
      return {
        mode: 'balance',
        states: buildPlanState(uniq(surplusIds), snapshotsById, incomingMap, 0, 0, null),
        targetIds: [],
        surplusIds: surplusIds,
        allocations: [],
        shipments: [],
        targetSummary: [],
        surplusSummary: [],
        meta: {
          balanceBasis: options.balanceBasis,
          balanceBasisLabel: options.balanceBasis === 'flat' ? 'Equal Flat Amount per Village' : 'Equal Fill % by Storage',
          computedFillPct: 0,
          computedFlatTarget: 0,
          capPct: maxFill,
          depotCapPct: options.depotCapPct,
          surplusCapPct: options.surplusCapPct,
          phaseTotals: { CRB: zeroRes(), PIM: zeroRes(), SUR: zeroRes() },
          merchantsUsed: 0,
          stopReason: 'No Target villages selected.',
          diagnostics: {
            balanceBasis: options.balanceBasis,
            stopReason: 'No Target villages selected.',
            nextRatioPct: null,
            nextFlatTarget: null,
            bottlenecks: [],
            residualNeedAtNextRatio: zeroRes(),
            baselineTotalsAtNextRatio: zeroRes(),
            targetTotalsAtNextRatio: zeroRes(),
            groupMerchantBudgetAtNextRatio: 0,
            lockedSupplyAtNextRatio: { total: zeroRes(), villages: [] },
            cappedVillagesAtNextTarget: [],
            nonMovableExcess: { totals: { arrivalLocked: zeroRes(), merchantStranded: zeroRes(), sinkBlocked: zeroRes() }, rows: [] },
            surplusRoomBeforeParking: { total: zeroRes(), rows: [], villagesWithRoom: 0 },
            surplusRoomAfterParking: { total: zeroRes(), rows: [], villagesWithRoom: 0 },
            lines: ['No Target villages selected.']
          },
          warnings: warnings,
          excludedOverlapIds: normalized.excludedOverlapIds,
          normalization: {
            selectedTargetCount: targetIds.length,
            selectedSurplusCount: normalized.selectedSurplusIds.length,
            usableSurplusCount: surplusIds.length,
            excludedOverlapIds: normalized.excludedOverlapIds.slice()
          }
        }
      };
    }

    if (!normalized.selectedSurplusIds.length) {
      warnings.push('No Surplus group selected. Leftover movable excess will stay in the target group.');
    }

    var bestRatio = 0;
    var bestFlatTarget = 0;
    if (options.balanceBasis === 'flat') {
      var lo = 0;
      var hi = maxFlatTarget;
      while (lo <= hi) {
        var mid = Math.floor((lo + hi) / 2);
        var flatTest = simulateModeAFlatCandidate(targetIds, surplusIds, snapshotsById, incomingMap, mid, options.depotCapPct);
        if (flatTest.feasible) {
          bestFlatTarget = mid;
          lo = mid + 1;
        } else {
          hi = mid - 1;
        }
      }
    } else {
      for (var ratio = maxFill; ratio >= 0; ratio--) {
        var test = simulateModeAFillCandidate(targetIds, surplusIds, snapshotsById, incomingMap, ratio);
        if (test.feasible) { bestRatio = ratio; break; }
      }
    }

    var acceptedValue = options.balanceBasis === 'flat' ? bestFlatTarget : bestRatio;
    var finalRun = options.balanceBasis === 'flat'
      ? simulateModeAFlatCandidate(targetIds, surplusIds, snapshotsById, incomingMap, bestFlatTarget, options.depotCapPct)
      : simulateModeAFillCandidate(targetIds, surplusIds, snapshotsById, incomingMap, bestRatio);
    var initialSurplusRoom = buildModeASurplusRoom(finalRun.states, surplusIds, options.surplusCapPct);
    if (!surplusIds.length) {
      initialSurplusRoom = { total: zeroRes(), rows: [], villagesWithRoom: 0 };
    } else if (initialSurplusRoom.total.total <= 0) {
      warnings.push('Usable Surplus villages exist, but Surplus Cap % leaves no usable room.');
    }
    if (surplusIds.length) runModeASurplusRouting(finalRun.states, targetIds, surplusIds, finalRun.targetsById, options.surplusCapPct, finalRun.allocations);
    var remainingSurplusRoom = buildModeASurplusRoom(finalRun.states, surplusIds, options.surplusCapPct);
    var shipments = compileShipments(finalRun.states);
    var diagnostics = buildModeADiagnostics(
      finalRun,
      targetIds,
      normalized,
      snapshotsById,
      incomingMap,
      acceptedValue,
      options.balanceBasis === 'flat' ? maxFlatTarget : maxFill,
      options,
      initialSurplusRoom,
      remainingSurplusRoom
    );
    var targetSummary = options.balanceBasis === 'flat'
      ? buildFlatChildSummary(finalRun.states, targetIds, finalRun.targetsById, finalRun.capsById, bestFlatTarget)
      : buildChildSummary(finalRun.states, targetIds, finalRun.targetsById);

    var plan = {
      mode: 'balance',
      states: finalRun.states,
      targetIds: targetIds,
      surplusIds: surplusIds,
      selectedSurplusIds: normalized.selectedSurplusIds.slice(),
      allocations: finalRun.allocations,
      shipments: shipments,
      targetSummary: targetSummary,
      surplusSummary: buildSurplusSummary(finalRun.states, surplusIds),
      meta: {
        balanceBasis: options.balanceBasis,
        balanceBasisLabel: options.balanceBasis === 'flat' ? 'Equal Flat Amount per Village' : 'Equal Fill % by Storage',
        computedFillPct: bestRatio,
        computedFlatTarget: bestFlatTarget,
        capPct: maxFill,
        depotCapPct: options.depotCapPct,
        surplusCapPct: options.surplusCapPct,
        phaseTotals: buildPhaseTotals(finalRun.allocations),
        merchantsUsed: merchantsUsedForIds(finalRun.states, targetIds),
        stopReason: diagnostics.stopReason,
        diagnostics: diagnostics,
        warnings: warnings,
        excludedOverlapIds: normalized.excludedOverlapIds,
        normalization: {
          selectedTargetCount: targetIds.length,
          selectedSurplusCount: normalized.selectedSurplusIds.length,
          usableSurplusCount: surplusIds.length,
          sharedTargetSurplusIds: normalized.sharedTargetSurplusIds.slice(),
          excludedOverlapIds: normalized.excludedOverlapIds.slice()
        },
        surplusSupport: {
          beforeParking: initialSurplusRoom,
          afterParking: remainingSurplusRoom
        }
      }
    };

    if (options.balanceBasis === 'flat') {
      if (bestFlatTarget === 0 && targetIds.length) plan.meta.warnings.push('Computed flat target is 0. Group resource mix and/or merchants are too tight for a higher common amount.');
    } else {
      if (bestRatio === 0 && targetIds.length) plan.meta.warnings.push('Computed fill is 0%. Group resource mix and/or merchants are too tight for a higher common ratio.');
    }
    return plan;
  }

  function zeroRes() { return { wood: 0, clay: 0, iron: 0, total: 0 }; }
  function refreshRes(res) { res.total = (res.wood || 0) + (res.clay || 0) + (res.iron || 0); return res; }
  function idSet(ids) {
    var out = Object.create(null);
    (ids || []).forEach(function (id) { id = Y.toId(id); if (id) out[id] = true; });
    return out;
  }
  function childTargetEach(st, ratioPct) { return capEach(st.storage || 0, ratioPct); }
  function childBaselineNoParent(st, rk) { return (st.baseNow[rk] || 0) + (st.inc0[rk] || 0) + (st.inPlanned[rk] || 0); }
  function childNeed(st, rk, targetEach) { return Math.max(0, Math.floor(targetEach - childBaselineNoParent(st, rk))); }
  function childSendable(st, rk, targetEach) {
    var spare = Math.max(0, Math.floor(childBaselineNoParent(st, rk) - targetEach));
    return Math.min(Math.max(0, st.baseNow[rk] || 0), spare);
  }
  function parentAvailable(st, rk) { return Math.max(0, Math.floor((st.baseNow[rk] || 0) - (st.keepEach || 0))); }
  function parentAboveReserve(st) {
    return { wood: parentAvailable(st, 'wood'), clay: parentAvailable(st, 'clay'), iron: parentAvailable(st, 'iron') };
  }
  function spreadScore(above) {
    return Math.abs((above.wood || 0) - (above.clay || 0)) + Math.abs((above.wood || 0) - (above.iron || 0)) + Math.abs((above.clay || 0) - (above.iron || 0));
  }
  function friendlySendAmount(st, rk) {
    var above = parentAboveReserve(st);
    var others = rk === 'wood' ? ['clay', 'iron'] : rk === 'clay' ? ['wood', 'iron'] : ['wood', 'clay'];
    return Math.max(0, Math.floor((above[rk] || 0) - (((above[others[0]] || 0) + (above[others[1]] || 0)) / 2)));
  }
  function parentCurrentSpread(st) {
    return spreadScore(parentAboveReserve(st));
  }
  function parentSpreadAfterSend(st, rk, amt) {
    var above = parentAboveReserve(st);
    above[rk] = Math.max(0, (above[rk] || 0) - Math.max(0, Math.floor(amt || 0)));
    return spreadScore(above);
  }
  function parentSpreadDeltaAfterSend(st, rk, amt) {
    return parentSpreadAfterSend(st, rk, amt) - parentCurrentSpread(st);
  }
  function parentRemainingTotalAfterSend(st, rk, amt) {
    var above = parentAboveReserve(st);
    above[rk] = Math.max(0, (above[rk] || 0) - Math.max(0, Math.floor(amt || 0)));
    return (above.wood || 0) + (above.clay || 0) + (above.iron || 0);
  }
  function resourceScarcity(totalNeed, totalSupply) {
    if (totalNeed <= 0) return -1;
    if (totalSupply <= 0) return 1000000000 + totalNeed;
    return totalNeed / totalSupply;
  }
  function computeChildResourceStats(st, childIds, targetsById, rk) {
    var need = 0, supply = 0;
    childIds.forEach(function (id) {
      var s = st.get(id);
      if (!s) return;
      var targetEach = targetsById[id] || 0;
      need += childNeed(s, rk, targetEach);
      supply += childSendable(s, rk, targetEach);
    });
    return { need: need, supply: supply, score: resourceScarcity(need, supply) };
  }
  function computeParentResourceStats(st, parentIds, childIds, targetsById, rk) {
    var need = 0, supply = 0;
    childIds.forEach(function (id) {
      var s = st.get(id);
      if (!s) return;
      need += childNeed(s, rk, targetsById[id] || 0);
    });
    parentIds.forEach(function (id) {
      var s = st.get(id);
      if (!s) return;
      supply += parentAvailable(s, rk);
    });
    return { need: need, supply: supply, score: resourceScarcity(need, supply) };
  }
  function orderResources(statsFn) {
    return ['wood', 'clay', 'iron'].sort(function (a, b) {
      var sa = statsFn(a), sb = statsFn(b);
      if (sb.score !== sa.score) return sb.score - sa.score;
      if (sb.need !== sa.need) return sb.need - sa.need;
      return a.localeCompare(b);
    });
  }
  function normalizeModeBSets(parentIds, childIds, surplusIds) {
    parentIds = uniq(parentIds);
    childIds = uniq(childIds);
    surplusIds = uniq(surplusIds);
    var warnings = [];
    var excluded = [];
    var childSet = idSet(childIds);
    var parentSet = idSet(parentIds);
    function note(ids, label) {
      if (!ids.length) return;
      excluded = uniq(excluded.concat(ids));
      warnings.push(label + ': ' + ids.join(', '));
    }
    var overlapParents = parentIds.filter(function (id) { return !!childSet[id]; });
    note(overlapParents, 'Parents/Children overlap excluded');
    parentIds = parentIds.filter(function (id) { return !childSet[id]; });
    var overlapSurplusChildren = surplusIds.filter(function (id) { return !!childSet[id]; });
    note(overlapSurplusChildren, 'Surplus/Children overlap excluded');
    surplusIds = surplusIds.filter(function (id) { return !childSet[id]; });
    var overlapSurplusParents = surplusIds.filter(function (id) { return !!parentSet[id]; });
    note(overlapSurplusParents, 'Surplus/Parents overlap excluded');
    surplusIds = surplusIds.filter(function (id) { return !parentSet[id]; });
    return { parentIds: parentIds, childIds: childIds, surplusIds: surplusIds, warnings: warnings, excludedOverlapIds: excluded };
  }
  function buildModeBTargets(st, childIds, ratioPct) {
    var out = {};
    childIds.forEach(function (id) {
      var s = st.get(id);
      if (!s) return;
      out[id] = childTargetEach(s, ratioPct);
      s.capEach = out[id];
      s.capEachByRes = { wood: out[id], clay: out[id], iron: out[id] };
    });
    return out;
  }
  function normalizeModeDSets(parentIds, childIds, surplusIds) {
    parentIds = uniq(parentIds);
    childIds = uniq(childIds);
    surplusIds = uniq(surplusIds);
    var warnings = [];
    var excluded = [];
    var childSet = idSet(childIds);
    var parentSet = idSet(parentIds);
    var overlapParents = parentIds.filter(function (id) { return !!childSet[id]; });
    if (overlapParents.length) {
      excluded = uniq(excluded.concat(overlapParents));
      warnings.push('Parents/Children overlap excluded: ' + overlapParents.join(', '));
      parentIds = parentIds.filter(function (id) { return !childSet[id]; });
    }
    var overlapSurplusChildren = surplusIds.filter(function (id) { return !!childSet[id]; });
    if (overlapSurplusChildren.length) {
      excluded = uniq(excluded.concat(overlapSurplusChildren));
      warnings.push('Surplus/Children overlap excluded: ' + overlapSurplusChildren.join(', '));
      surplusIds = surplusIds.filter(function (id) { return !childSet[id]; });
    }
    var overlapSurplusParents = surplusIds.filter(function (id) { return !!parentSet[id]; });
    if (overlapSurplusParents.length) {
      excluded = uniq(excluded.concat(overlapSurplusParents));
      warnings.push('Surplus/Parents overlap excluded: ' + overlapSurplusParents.join(', '));
      surplusIds = surplusIds.filter(function (id) { return !parentSet[id]; });
    }
    return { parentIds: parentIds, childIds: childIds, surplusIds: surplusIds, warnings: warnings, excludedOverlapIds: excluded };
  }
  function buildModeDTargets(st, childIds, flatTargetEach, depotCapPct) {
    var targetsById = {};
    var capsById = {};
    flatTargetEach = max0(flatTargetEach);
    depotCapPct = clamp(depotCapPct, 0, 100);
    childIds.forEach(function (id) {
      var s = st.get(id);
      if (!s) return;
      var cap = capEach(s.storage || 0, depotCapPct);
      var target = Math.min(flatTargetEach, cap);
      capsById[id] = cap;
      targetsById[id] = target;
      s.flatCapEach = cap;
      s.flatTargetEach = target;
      s.capEach = target;
      s.capEachByRes = { wood: target, clay: target, iron: target };
      s.isFlatCapped = target < flatTargetEach;
    });
    return { targetsById: targetsById, capsById: capsById };
  }
  function runChildRebalance(st, childIds, targetsById, allocations) {
    var order = orderResources(function (rk) { return computeChildResourceStats(st, childIds, targetsById, rk); });
    order.forEach(function (rk) {
      var receivers = [], donors = [];
      childIds.forEach(function (id) {
        var s = st.get(id);
        if (!s) return;
        var targetEach = targetsById[id] || 0;
        var need = childNeed(s, rk, targetEach);
        var sendable = childSendable(s, rk, targetEach);
        if (need > 0) receivers.push({ id: id, need: need });
        if (sendable > 0 && (s.merchFree || 0) > 0) donors.push({ id: id, sendable: sendable });
      });
      receivers.sort(function (a, b) { return b.need - a.need || a.id - b.id; });
      donors.sort(function (a, b) { return b.sendable - a.sendable || a.id - b.id; });
      receivers.forEach(function (rec) {
        var to = st.get(rec.id);
        if (!to) return;
        while (rec.need > 0) {
          donors.sort(function (a, b) { return b.sendable - a.sendable || a.id - b.id; });
          var donor = null;
          for (var i = 0; i < donors.length; i++) {
            if (donors[i].id !== rec.id && donors[i].sendable > 0) { donor = donors[i]; break; }
          }
          if (!donor) break;
          var from = st.get(donor.id);
          if (!from || (from.merchFree || 0) <= 0) { donor.sendable = 0; continue; }
          donor.sendable = childSendable(from, rk, targetsById[donor.id] || 0);
          if (donor.sendable <= 0) continue;
          var sent = applySend(from, to, rk, Math.min(donor.sendable, rec.need), 'CRB', Y.cfg.PHASE_ORDER.CRB, allocations);
          if (sent <= 0) { donor.sendable = 0; continue; }
          donor.sendable = childSendable(from, rk, targetsById[donor.id] || 0);
          rec.need = childNeed(to, rk, targetsById[rec.id] || 0);
        }
      });
    });
  }
  function rankParentDonors(st, parentIds, to, rk, needAmount) {
    var tier1 = [], tier2 = [];
    parentIds.forEach(function (id) {
      var s = st.get(id);
      if (!s || (s.merchFree || 0) <= 0) return;
      var avail = parentAvailable(s, rk);
      var pairLimit = maxPairAdditionalByMerchants(s, to);
      if (avail <= 0 || pairLimit <= 0) return;
      var friendly = Math.min(avail, Math.max(0, friendlySendAmount(s, rk)));
      var friendlyChunk = Math.min(needAmount, pairLimit, friendly);
      var fallbackChunk = Math.min(needAmount, pairLimit, avail);
      var currentSpread = parentCurrentSpread(s);
      var row = {
        id: id,
        state: s,
        friendlyChunk: friendlyChunk,
        fallbackChunk: fallbackChunk,
        currentSpread: currentSpread,
        friendlyPostSpread: parentSpreadAfterSend(s, rk, friendlyChunk),
        friendlySpreadDelta: parentSpreadDeltaAfterSend(s, rk, friendlyChunk),
        fallbackPostSpread: parentSpreadAfterSend(s, rk, fallbackChunk),
        fallbackSpreadDelta: parentSpreadDeltaAfterSend(s, rk, fallbackChunk),
        friendlyRemainingTotal: parentRemainingTotalAfterSend(s, rk, friendlyChunk),
        fallbackRemainingTotal: parentRemainingTotalAfterSend(s, rk, fallbackChunk),
        merchFree: s.merchFree || 0
      };
      if (friendlyChunk > 0) tier1.push(row);
      else if (fallbackChunk > 0) tier2.push(row);
    });
    tier1.sort(function (a, b) {
      if (a.friendlySpreadDelta !== b.friendlySpreadDelta) return a.friendlySpreadDelta - b.friendlySpreadDelta;
      if (b.friendlyChunk !== a.friendlyChunk) return b.friendlyChunk - a.friendlyChunk;
      if (a.friendlyPostSpread !== b.friendlyPostSpread) return a.friendlyPostSpread - b.friendlyPostSpread;
      if (b.friendlyRemainingTotal !== a.friendlyRemainingTotal) return b.friendlyRemainingTotal - a.friendlyRemainingTotal;
      if (b.merchFree !== a.merchFree) return b.merchFree - a.merchFree;
      return a.id - b.id;
    });
    tier2.sort(function (a, b) {
      if (a.fallbackSpreadDelta !== b.fallbackSpreadDelta) return a.fallbackSpreadDelta - b.fallbackSpreadDelta;
      if (a.fallbackPostSpread !== b.fallbackPostSpread) return a.fallbackPostSpread - b.fallbackPostSpread;
      if (b.fallbackRemainingTotal !== a.fallbackRemainingTotal) return b.fallbackRemainingTotal - a.fallbackRemainingTotal;
      if (b.merchFree !== a.merchFree) return b.merchFree - a.merchFree;
      return a.id - b.id;
    });
    return tier1.concat(tier2);
  }
  function runParentImport(st, parentIds, childIds, targetsById, allocations) {
    var order = orderResources(function (rk) { return computeParentResourceStats(st, parentIds, childIds, targetsById, rk); });
    order.forEach(function (rk) {
      var receivers = [];
      childIds.forEach(function (id) {
        var child = st.get(id);
        if (!child) return;
        var need = childNeed(child, rk, targetsById[id] || 0);
        if (need > 0) receivers.push({ id: id, need: need });
      });
      receivers.sort(function (a, b) { return b.need - a.need || a.id - b.id; });
      receivers.forEach(function (rec) {
        var to = st.get(rec.id);
        if (!to) return;
        while (rec.need > 0) {
          var donors = rankParentDonors(st, parentIds, to, rk, rec.need);
          if (!donors.length) break;
          var donor = donors[0];
          var sendGoal = donor.friendlyChunk > 0 ? donor.friendlyChunk : donor.fallbackChunk;
          if (sendGoal <= 0) break;
          var sent = applySend(donor.state, to, rk, sendGoal, 'PIM', Y.cfg.PHASE_ORDER.PIM, allocations);
          if (sent <= 0) break;
          rec.need = childNeed(to, rk, targetsById[rec.id] || 0);
        }
      });
    });
  }
  function childrenSatisfied(st, childIds, targetsById) {
    for (var i = 0; i < childIds.length; i++) {
      var id = childIds[i];
      var s = st.get(id);
      if (!s) return false;
      var targetEach = targetsById[id] || 0;
      if (childNeed(s, 'wood', targetEach) > 0) return false;
      if (childNeed(s, 'clay', targetEach) > 0) return false;
      if (childNeed(s, 'iron', targetEach) > 0) return false;
    }
    return true;
  }
  function setSurplusCaps(st, surplusIds, surplusCapPct) {
    surplusIds.forEach(function (id) {
      var s = st.get(id);
      if (!s) return;
      var cap = capEach(s.storage || 0, surplusCapPct);
      s.capEach = cap;
      s.capEachByRes = { wood: cap, clay: cap, iron: cap };
    });
  }
  function surplusSpace(s, rk) {
    var cap = s.capEachByRes && s.capEachByRes[rk] != null ? s.capEachByRes[rk] : (s.capEach || 0);
    return Math.max(0, Math.floor(cap - getFutureRecvVal(s, rk)));
  }
  function runSurplusRouting(st, parentIds, surplusIds, surplusCapPct, allocations) {
    if (!surplusIds.length) return;
    setSurplusCaps(st, surplusIds, surplusCapPct);
    ['wood', 'clay', 'iron'].forEach(function (rk) {
      var receivers = surplusIds.map(function (id) {
        var s = st.get(id);
        if (!s) return null;
        var need = surplusSpace(s, rk);
        return need > 0 ? { id: id, need: need, storage: s.storage || 0 } : null;
      }).filter(Boolean);
      receivers.sort(function (a, b) {
        if (b.need !== a.need) return b.need - a.need;
        if (b.storage !== a.storage) return b.storage - a.storage;
        return a.id - b.id;
      });
      receivers.forEach(function (rec) {
        var to = st.get(rec.id);
        if (!to) return;
        while (rec.need > 0) {
          var donors = rankParentDonors(st, parentIds, to, rk, rec.need);
          if (!donors.length) break;
          var donor = donors[0];
          var sendGoal = donor.friendlyChunk > 0 ? donor.friendlyChunk : donor.fallbackChunk;
          if (sendGoal <= 0) break;
          var sent = applySend(donor.state, to, rk, sendGoal, 'SUR', Y.cfg.PHASE_ORDER.SUR, allocations);
          if (sent <= 0) break;
          rec.need = surplusSpace(to, rk);
        }
      });
    });
  }
  function buildPhaseTotals(allocations) {
    var totals = { COI: zeroRes(), BUF: zeroRes(), CRB: zeroRes(), PIM: zeroRes(), SUR: zeroRes() };
    (allocations || []).forEach(function (a) {
      if (!a || !totals[a.phaseTag]) return;
      totals[a.phaseTag][a.resource] += a.amount || 0;
      refreshRes(totals[a.phaseTag]);
    });
    return totals;
  }
  function merchantsUsedForIds(st, ids) {
    var used = 0;
    (ids || []).forEach(function (id) {
      var s = st.get(id);
      if (!s) return;
      used += Math.max(0, (s.merchFree0 || 0) - (s.merchFree || 0));
    });
    return used;
  }
  function formatResShort(res) {
    res = res || zeroRes();
    var parts = [];
    if (res.wood > 0) parts.push('W ' + Y.formatTwNumber(res.wood));
    if (res.clay > 0) parts.push('C ' + Y.formatTwNumber(res.clay));
    if (res.iron > 0) parts.push('I ' + Y.formatTwNumber(res.iron));
    return parts.length ? parts.join(' / ') : '0';
  }
  function sumChildNeeds(st, childIds, targetsById) {
    var out = zeroRes();
    childIds.forEach(function (id) {
      var s = st.get(id);
      if (!s) return;
      var targetEach = targetsById[id] || 0;
      out.wood += childNeed(s, 'wood', targetEach);
      out.clay += childNeed(s, 'clay', targetEach);
      out.iron += childNeed(s, 'iron', targetEach);
    });
    return refreshRes(out);
  }
  function sumParentAvailability(st, parentIds) {
    var out = zeroRes();
    parentIds.forEach(function (id) {
      var s = st.get(id);
      if (!s) return;
      out.wood += parentAvailable(s, 'wood');
      out.clay += parentAvailable(s, 'clay');
      out.iron += parentAvailable(s, 'iron');
    });
    return refreshRes(out);
  }
  function sumParentMerchantBudget(st, parentIds) {
    var total = 0;
    parentIds.forEach(function (id) {
      var s = st.get(id);
      if (!s) return;
      total += max0(s.merchFree || 0) * Y.cfg.MERCH_CAP_PER;
    });
    return total;
  }
  function sumParentWcCapacity(st, parentIds) {
    var total = 0;
    parentIds.forEach(function (id) {
      var s = st.get(id);
      if (!s) return;
      var merchBudget = max0(s.merchFree || 0) * Y.cfg.MERCH_CAP_PER;
      total += Math.min(merchBudget, parentAvailable(s, 'wood') + parentAvailable(s, 'clay'));
    });
    return total;
  }
  function sumParentAllCapacity(st, parentIds) {
    var total = 0;
    parentIds.forEach(function (id) {
      var s = st.get(id);
      if (!s) return;
      var merchBudget = max0(s.merchFree || 0) * Y.cfg.MERCH_CAP_PER;
      total += Math.min(merchBudget, parentAvailable(s, 'wood') + parentAvailable(s, 'clay') + parentAvailable(s, 'iron'));
    });
    return total;
  }
  function computeLockedChildSupply(st, childIds, targetsById) {
    var total = zeroRes();
    var villages = [];
    childIds.forEach(function (id) {
      var s = st.get(id);
      if (!s) return;
      var row = { id: s.id, name: s.name, coord: s.coord, res: zeroRes() };
      var targetEach = targetsById[id] || 0;
      ['wood', 'clay', 'iron'].forEach(function (rk) {
        var sendable = childSendable(s, rk, targetEach);
        if (sendable > 0 && max0(s.merchFree || 0) <= 0) {
          row.res[rk] += sendable;
          total[rk] += sendable;
        }
      });
      refreshRes(row.res);
      if (row.res.total > 0) villages.push(row);
    });
    villages.sort(function (a, b) { return (b.res.total || 0) - (a.res.total || 0) || a.id - b.id; });
    return { total: refreshRes(total), villages: villages };
  }
  function simulateModeBChildOnly(parentIds, childIds, surplusIds, snapshotsById, incomingMap, ratioPct, reservePct) {
    var allIds = uniq(parentIds.concat(childIds).concat(surplusIds));
    var st = buildPlanState(allIds, snapshotsById, incomingMap, 0, reservePct, null);
    var allocations = [];
    var targetsById = buildModeBTargets(st, childIds, ratioPct);
    runChildRebalance(st, childIds, targetsById, allocations);
    return { states: st, allocations: allocations, targetsById: targetsById };
  }
  function pushDiagVillage(map, type, s, rk, amount) {
    amount = max0(amount);
    if (!amount) return;
    var key = type + ':' + s.id;
    if (!map[key]) {
      map[key] = { type: type, id: s.id, name: s.name, coord: s.coord, res: zeroRes() };
    }
    map[key].res[rk] += amount;
    refreshRes(map[key].res);
  }
  function buildParentNextRatioDiagnostics(st, parentIds) {
    var friendly = zeroRes();
    var noMerchant = zeroRes();
    var reserveBlocked = zeroRes();
    var rowsMap = Object.create(null);

    (parentIds || []).forEach(function (id) {
      var s = st.get(id);
      if (!s) return;
      ['wood', 'clay', 'iron'].forEach(function (rk) {
        var avail = parentAvailable(s, rk);
        var friendlyAmt = Math.min(avail, Math.max(0, friendlySendAmount(s, rk)));
        var blocked = Math.min(max0((s.baseNow && s.baseNow[rk]) || 0), max0(s.keepEach || 0));

        if (friendlyAmt > 0) {
          friendly[rk] += friendlyAmt;
          pushDiagVillage(rowsMap, 'friendly_parent', s, rk, friendlyAmt);
        }
        if (max0(s.merchFree || 0) <= 0 && avail > 0) {
          noMerchant[rk] += avail;
          pushDiagVillage(rowsMap, 'no_merchant_parent', s, rk, avail);
        }
        if (blocked > 0) {
          reserveBlocked[rk] += blocked;
          pushDiagVillage(rowsMap, 'reserve_blocked_parent', s, rk, blocked);
        }
      });
    });

    refreshRes(friendly);
    refreshRes(noMerchant);
    refreshRes(reserveBlocked);

    var rows = Object.keys(rowsMap).map(function (k) { return rowsMap[k]; });
    rows.sort(function (a, b) { return (b.res.total || 0) - (a.res.total || 0) || a.id - b.id; });
    return {
      friendly: friendly,
      noMerchant: noMerchant,
      reserveBlocked: reserveBlocked,
      rows: rows
    };
  }
  function buildNonMovableExcessDiagnostics(st, childIds, targetsById, hasUsableSurplus) {
    var totals = {
      arrivalLocked: zeroRes(),
      merchantStranded: zeroRes(),
      sinkBlocked: zeroRes()
    };
    var rowsMap = Object.create(null);

    childIds.forEach(function (id) {
      var s = st.get(id);
      if (!s) return;
      var targetEach = targetsById[id] || 0;

      ['wood', 'clay', 'iron'].forEach(function (rk) {
        var future = childBaselineNoParent(s, rk);
        var excess = Math.max(0, Math.floor(future - targetEach));
        if (excess <= 0) return;

        var noExistingIncoming = Math.max(0, Math.floor((s.baseNow[rk] || 0) + (s.inPlanned[rk] || 0)));
        var absorbIncoming = Math.max(0, Math.floor(targetEach - noExistingIncoming));
        var arrivalLocked = Math.max(0, Math.floor((s.inc0[rk] || 0) - absorbIncoming));
        if (arrivalLocked > excess) arrivalLocked = excess;

        var remaining = excess - arrivalLocked;
        var merchantStranded = 0;
        var currentExcess = Math.max(0, Math.floor((s.baseNow[rk] || 0) - targetEach));
        if (remaining > 0 && currentExcess > 0 && max0(s.merchFree || 0) <= 0) {
          merchantStranded = Math.min(remaining, currentExcess);
        }

        remaining -= merchantStranded;
        var sinkBlocked = Math.max(0, remaining);

        if (arrivalLocked > 0) {
          totals.arrivalLocked[rk] += arrivalLocked;
          pushDiagVillage(rowsMap, 'arrival_locked', s, rk, arrivalLocked);
        }
        if (merchantStranded > 0) {
          totals.merchantStranded[rk] += merchantStranded;
          pushDiagVillage(rowsMap, 'merchant_stranded', s, rk, merchantStranded);
        }
        if (sinkBlocked > 0) {
          totals.sinkBlocked[rk] += sinkBlocked;
          pushDiagVillage(rowsMap, hasUsableSurplus ? 'residual_excess' : 'sink_blocked', s, rk, sinkBlocked);
        }
      });
    });

    refreshRes(totals.arrivalLocked);
    refreshRes(totals.merchantStranded);
    refreshRes(totals.sinkBlocked);

    var rows = Object.keys(rowsMap).map(function (k) { return rowsMap[k]; });
    rows.sort(function (a, b) { return (b.res.total || 0) - (a.res.total || 0) || a.id - b.id; });
    return { totals: totals, rows: rows };
  }
  function topDiagRows(rows, type, limit) {
    return (rows || [])
      .filter(function (row) { return row.type === type; })
      .slice(0, limit || 2)
      .map(function (row) { return row.name + ' (' + formatResShort(row.res) + ')'; });
  }
  function buildStopReasonDiagnostics(parentIds, childIds, surplusIds, snapshotsById, incomingMap, bestRatio, maxFill, parentReservePct) {
    var lines = [];
    if (bestRatio >= maxFill) {
      var ceilingText = 'Stopped at the user ceiling (' + Y.formatTwNumber(maxFill) + '%).';
      lines.push(ceilingText);
      return {
        nextRatioPct: null,
        stopReason: ceilingText,
        bottlenecks: [],
        residualNeed: zeroRes(),
        parentAvailability: zeroRes(),
        parentMerchantBudget: 0,
        parentWcCapacity: 0,
        parentAllCapacity: 0,
        parentFriendlyAvailability: zeroRes(),
        parentNoMerchantStock: zeroRes(),
        parentReserveBlocked: zeroRes(),
        childLockedSupply: { total: zeroRes(), villages: [] },
        parentConstraintRows: [],
        lines: lines
      };
    }

    var nextRatio = bestRatio + 1;
    var childOnly = simulateModeBChildOnly(parentIds, childIds, surplusIds, snapshotsById, incomingMap, nextRatio, parentReservePct);
    var residual = sumChildNeeds(childOnly.states, childIds, childOnly.targetsById);
    var parentAvail = sumParentAvailability(childOnly.states, parentIds);
    var parentMerchBudget = sumParentMerchantBudget(childOnly.states, parentIds);
    var parentWcCapacity = sumParentWcCapacity(childOnly.states, parentIds);
    var parentAllCapacity = sumParentAllCapacity(childOnly.states, parentIds);
    var parentSupport = buildParentNextRatioDiagnostics(childOnly.states, parentIds);
    var childLockedSupply = computeLockedChildSupply(childOnly.states, childIds, childOnly.targetsById);
    var wcNeed = residual.wood + residual.clay;
    var bottlenecks = [];

    if (!parentIds.length) {
      bottlenecks.push({
        type: 'no_parents',
        text: 'No Parents villages are available for the next ratio.'
      });
    }
    if (wcNeed > parentWcCapacity) {
      bottlenecks.push({
        type: 'parent_wc_ceiling',
        text: 'Parent wood+clay export ceiling ' + Y.formatTwNumber(parentWcCapacity) + ' < needed ' + Y.formatTwNumber(wcNeed) + ' at ' + nextRatio + '%.'
      });
    }
    if (residual.total > parentMerchBudget) {
      bottlenecks.push({
        type: 'parent_merchant_ceiling',
        text: 'Parent merchant ceiling ' + Y.formatTwNumber(parentMerchBudget) + ' < total remaining need ' + Y.formatTwNumber(residual.total) + ' at ' + nextRatio + '%.'
      });
    }
    ['wood', 'clay', 'iron'].forEach(function (rk) {
      if (residual[rk] > parentAvail[rk]) {
        bottlenecks.push({
          type: 'parent_' + rk + '_shortage',
          text: 'Parent ' + rk + ' availability ' + Y.formatTwNumber(parentAvail[rk]) + ' < needed ' + Y.formatTwNumber(residual[rk]) + ' at ' + nextRatio + '%.'
        });
      }
    });
    if (childLockedSupply.total.total > 0) {
      bottlenecks.push({
        type: 'child_merchant_exhaustion',
        text: 'Child merchant exhaustion leaves ' + formatResShort(childLockedSupply.total) + ' current stock stranded before parent import at ' + nextRatio + '%.'
      });
    }
    if (!bottlenecks.length) {
      var generic = residual.total > parentAllCapacity
        ? 'Next ratio ' + nextRatio + '% exceeds total parent shippable volume under current merchant ownership.'
        : 'Next ratio ' + nextRatio + '% fails under current local merchant/pair allocation limits.';
      bottlenecks.push({ type: 'local_allocation', text: generic });
    }

    lines.push('Stop reason: ' + bottlenecks[0].text);
    if (residual.total > 0) lines.push('Next ' + nextRatio + '% still needs ' + formatResShort(residual) + ' after child rebalance.');
    if (childLockedSupply.total.total > 0) lines.push('Internal child stock blocked by merchants: ' + formatResShort(childLockedSupply.total) + '.');
    if (parentAvail.total > 0 || parentMerchBudget > 0) {
      lines.push(
        'Parent export at next ratio: raw above reserve ' + formatResShort(parentAvail) +
        ' | balance-safe ' + formatResShort(parentSupport.friendly) +
        ' | merchant budget ' + Y.formatTwNumber(parentMerchBudget) + '.'
      );
    }
    if (parentSupport.noMerchant.total.total > 0) {
      lines.push('Parents with stock but no merchants: ' + formatResShort(parentSupport.noMerchant) + '.');
      var topNoMerch = topDiagRows(parentSupport.rows, 'no_merchant_parent', 2);
      if (topNoMerch.length) lines.push('Top no-merchant Parents: ' + topNoMerch.join(' | '));
    }
    if (parentReservePct > 0 && parentSupport.reserveBlocked.total.total > 0) {
      lines.push('Parent reserve floor keeps ' + formatResShort(parentSupport.reserveBlocked) + ' at home before the next ratio.');
      var topReserve = topDiagRows(parentSupport.rows, 'reserve_blocked_parent', 2);
      if (topReserve.length) lines.push('Top reserve-blocked Parents: ' + topReserve.join(' | '));
    }
    if (
      residual.total > 0 &&
      (
        residual.wood > parentSupport.friendly.wood ||
        residual.clay > parentSupport.friendly.clay ||
        residual.iron > parentSupport.friendly.iron
      )
    ) {
      lines.push(
        'Balance-safe parent export is already exhausted at the next ratio: friendly ' +
        formatResShort(parentSupport.friendly) + ' vs need ' + formatResShort(residual) + '.'
      );
      var topFriendly = topDiagRows(parentSupport.rows, 'friendly_parent', 2);
      if (topFriendly.length) lines.push('Top balance-safe Parents: ' + topFriendly.join(' | '));
    }
    if (wcNeed > parentWcCapacity && (parentAvail.wood + parentAvail.clay) > parentWcCapacity) {
      lines.push('Some parent wood/clay still exists, but merchant ownership and pair limits keep it from covering the next ratio.');
    }
    if (residual.total > parentMerchBudget && parentAvail.total >= residual.total) {
      lines.push('Raw parent stock is not the only blocker here: merchants run out before enough stock can move.');
    }

    return {
      nextRatioPct: nextRatio,
      stopReason: bottlenecks[0].text,
      bottlenecks: bottlenecks,
      residualNeed: residual,
      parentAvailability: parentAvail,
      parentMerchantBudget: parentMerchBudget,
      parentWcCapacity: parentWcCapacity,
      parentAllCapacity: parentAllCapacity,
      parentFriendlyAvailability: parentSupport.friendly,
      parentNoMerchantStock: parentSupport.noMerchant,
      parentReserveBlocked: parentSupport.reserveBlocked,
      childLockedSupply: childLockedSupply,
      parentConstraintRows: parentSupport.rows,
      lines: lines
    };
  }
  function buildModeBDiagnostics(finalRun, parentIds, childIds, surplusIds, snapshotsById, incomingMap, bestRatio, maxFill, parentReservePct) {
    var stop = buildStopReasonDiagnostics(parentIds, childIds, surplusIds, snapshotsById, incomingMap, bestRatio, maxFill, parentReservePct);
    var excess = buildNonMovableExcessDiagnostics(finalRun.states, childIds, finalRun.targetsById, surplusIds.length > 0);
    var acceptedParentAvail = sumParentAvailability(finalRun.states, parentIds);
    var acceptedParentSupport = buildParentNextRatioDiagnostics(finalRun.states, parentIds);
    var lines = stop.lines.slice();

    if (excess.totals.arrivalLocked.total > 0) {
      lines.push('Arrival-locked excess: ' + formatResShort(excess.totals.arrivalLocked) + '.');
      var topArrival = topDiagRows(excess.rows, 'arrival_locked', 2);
      if (topArrival.length) lines.push('Top arrival-locked villages: ' + topArrival.join(' | '));
    }
    if (excess.totals.merchantStranded.total > 0) {
      lines.push('Merchant-stranded excess: ' + formatResShort(excess.totals.merchantStranded) + '.');
      var topMerchant = topDiagRows(excess.rows, 'merchant_stranded', 2);
      if (topMerchant.length) lines.push('Top merchant-stranded villages: ' + topMerchant.join(' | '));
    }
    if (excess.totals.sinkBlocked.total > 0) {
      var sinkLabel = surplusIds.length
        ? 'Residual excess remains with no child-to-sink route in the current run.'
        : 'No usable Surplus villages were available for child excess.';
      lines.push('Sink-blocked excess: ' + formatResShort(excess.totals.sinkBlocked) + '. ' + sinkLabel);
      var sinkType = surplusIds.length ? 'residual_excess' : 'sink_blocked';
      var topSink = topDiagRows(excess.rows, sinkType, 2);
      if (topSink.length) lines.push('Top sink-blocked villages: ' + topSink.join(' | '));
    }
    if (acceptedParentAvail.total > 0) {
      lines.push(
        'Unused parent stock after the accepted ratio: raw above reserve ' + formatResShort(acceptedParentAvail) +
        ' | balance-safe ' + formatResShort(acceptedParentSupport.friendly) + '.'
      );
    }
    if (acceptedParentSupport.noMerchant.total.total > 0) {
      lines.push('Still trapped on no-merchant Parents after the accepted ratio: ' + formatResShort(acceptedParentSupport.noMerchant) + '.');
    }

    return {
      stopReason: stop.stopReason,
      nextRatioPct: stop.nextRatioPct,
      bottlenecks: stop.bottlenecks,
      residualNeedAtNextRatio: stop.residualNeed,
      parentAvailabilityAtNextRatio: stop.parentAvailability,
      parentMerchantBudgetAtNextRatio: stop.parentMerchantBudget,
      parentWcCapacityAtNextRatio: stop.parentWcCapacity,
      parentAllCapacityAtNextRatio: stop.parentAllCapacity,
      parentFriendlyAvailabilityAtNextRatio: stop.parentFriendlyAvailability,
      parentNoMerchantStockAtNextRatio: stop.parentNoMerchantStock,
      parentReserveBlockedAtNextRatio: stop.parentReserveBlocked,
      childLockedSupplyAtNextRatio: stop.childLockedSupply,
      parentConstraintRowsAtNextRatio: stop.parentConstraintRows,
      unusedParentAvailabilityAtAcceptedRatio: acceptedParentAvail,
      unusedParentFriendlyAvailabilityAtAcceptedRatio: acceptedParentSupport.friendly,
      unusedParentNoMerchantStockAtAcceptedRatio: acceptedParentSupport.noMerchant,
      nonMovableExcess: excess,
      lines: lines
    };
  }
  function buildChildSummary(st, childIds, targetsById) {
    return childIds.map(function (id) {
      var s = st.get(id);
      if (!s) return null;
      var before = addRes(cloneRes(s.base0), cloneRes(s.inc0));
      var after = addRes(cloneRes(s.baseNow), cloneRes(s.inc0));
      after = addRes(after, cloneRes(s.inPlanned));
      return {
        id: s.id, name: s.name, coord: s.coord, storage: s.storage, targetEach: targetsById[id] || 0,
        current: cloneRes(s.base0), incoming: cloneRes(s.inc0),
        before: before, sent: cloneRes(s.outPlanned), recv: cloneRes(s.inPlanned), after: after,
        merchFree: max0(s.merchFree0 || 0), merchTotal: max0(s.merchTotal || 0),
        merchUsed: Math.max(0, (s.merchFree0 || 0) - (s.merchFree || 0))
      };
    }).filter(Boolean);
  }
  function buildParentSummary(st, parentIds) {
    return parentIds.map(function (id) {
      var s = st.get(id);
      if (!s) return null;
      var above = parentAboveReserve(s);
      return {
        id: s.id, name: s.name, coord: s.coord, storage: s.storage, reserveEach: s.keepEach || 0,
        current: cloneRes(s.base0), incoming: cloneRes(s.inc0),
        before: cloneRes(s.base0), sent: cloneRes(s.outPlanned), recv: cloneRes(s.inPlanned), after: cloneRes(s.baseNow),
        aboveReserveAfter: refreshRes({ wood: above.wood || 0, clay: above.clay || 0, iron: above.iron || 0, total: 0 }),
        merchFree: max0(s.merchFree0 || 0), merchTotal: max0(s.merchTotal || 0),
        spreadAfter: spreadScore(above), merchUsed: Math.max(0, (s.merchFree0 || 0) - (s.merchFree || 0))
      };
    }).filter(Boolean);
  }
  function buildSurplusSummary(st, surplusIds) {
    return surplusIds.map(function (id) {
      var s = st.get(id);
      if (!s) return null;
      var before = addRes(cloneRes(s.base0), cloneRes(s.inc0));
      var after = addRes(cloneRes(s.baseNow), cloneRes(s.inc0));
      after = addRes(after, cloneRes(s.inPlanned));
      return {
        id: s.id, name: s.name, coord: s.coord, storage: s.storage, capEach: s.capEach || 0,
        current: cloneRes(s.base0), incoming: cloneRes(s.inc0),
        before: before, sent: cloneRes(s.outPlanned), recv: cloneRes(s.inPlanned), after: after,
        merchFree: max0(s.merchFree0 || 0), merchTotal: max0(s.merchTotal || 0),
        merchUsed: Math.max(0, (s.merchFree0 || 0) - (s.merchFree || 0))
      };
    }).filter(Boolean);
  }
  function simulateModeBCandidate(parentIds, childIds, surplusIds, snapshotsById, incomingMap, ratioPct, reservePct) {
    var allIds = uniq(parentIds.concat(childIds).concat(surplusIds));
    var st = buildPlanState(allIds, snapshotsById, incomingMap, 0, reservePct, null);
    var allocations = [];
    var targetsById = buildModeBTargets(st, childIds, ratioPct);
    runChildRebalance(st, childIds, targetsById, allocations);
    runParentImport(st, parentIds, childIds, targetsById, allocations);
    return { feasible: childrenSatisfied(st, childIds, targetsById), states: st, allocations: allocations, targetsById: targetsById };
  }
  function planPush(parentIds, childIds, surplusIds, snapshotsById, incomingMap, childrenMaxFillPct, surplusCapPct, parentReservePct) {
    var normalized = normalizeModeBSets(parentIds, childIds, surplusIds);
    parentIds = normalized.parentIds;
    childIds = normalized.childIds;
    surplusIds = normalized.surplusIds;
    var warnings = normalized.warnings.slice();
    if (!childIds.length) {
      warnings.push('No Children villages selected.');
      return {
        mode: 'push',
        states: buildPlanState(uniq(parentIds.concat(surplusIds)), snapshotsById, incomingMap, 0, parentReservePct, null),
        parentIds: parentIds,
        childIds: [],
        surplusIds: surplusIds,
        allocations: [],
        shipments: [],
        childSummary: [],
        parentSummary: [],
        surplusSummary: [],
        meta: {
          computedChildFillPct: 0,
          childrenMaxFillPct: clamp(childrenMaxFillPct, 0, 100),
          parentReservePct: clamp(parentReservePct, 0, 100),
          surplusCapPct: clamp(surplusCapPct, 0, 100),
          phaseTotals: { CRB: zeroRes(), PIM: zeroRes(), SUR: zeroRes() },
          childMerchantsUsed: 0,
          parentMerchantsUsed: 0,
          stopReason: 'No Children villages selected.',
          diagnostics: {
            stopReason: 'No Children villages selected.',
            nextRatioPct: null,
            bottlenecks: [],
            residualNeedAtNextRatio: zeroRes(),
            parentAvailabilityAtNextRatio: zeroRes(),
            parentMerchantBudgetAtNextRatio: 0,
            parentWcCapacityAtNextRatio: 0,
            parentAllCapacityAtNextRatio: 0,
            childLockedSupplyAtNextRatio: { total: zeroRes(), villages: [] },
            nonMovableExcess: { totals: { arrivalLocked: zeroRes(), merchantStranded: zeroRes(), sinkBlocked: zeroRes() }, rows: [] },
            lines: ['No Children villages selected.']
          },
          warnings: warnings,
          excludedOverlapIds: normalized.excludedOverlapIds
        }
      };
    }
    if (!parentIds.length) warnings.push('No Parents villages selected. Only current child stock and incoming can contribute.');
    var maxFill = childIds.length ? clamp(childrenMaxFillPct, 0, 100) : 0;
    var bestRatio = 0, found = false;
    for (var ratio = maxFill; ratio >= 0; ratio--) {
      var test = simulateModeBCandidate(parentIds, childIds, surplusIds, snapshotsById, incomingMap, ratio, parentReservePct);
      if (test.feasible) { bestRatio = ratio; found = true; break; }
    }
    if (!found) bestRatio = 0;
    var finalRun = simulateModeBCandidate(parentIds, childIds, surplusIds, snapshotsById, incomingMap, bestRatio, parentReservePct);
    if (surplusIds.length && bestRatio > 0) runSurplusRouting(finalRun.states, parentIds, surplusIds, surplusCapPct, finalRun.allocations);
    var shipments = compileShipments(finalRun.states);
    var diagnostics = buildModeBDiagnostics(finalRun, parentIds, childIds, surplusIds, snapshotsById, incomingMap, bestRatio, maxFill, parentReservePct);
    var plan = {
      mode: 'push',
      states: finalRun.states,
      parentIds: parentIds,
      childIds: childIds,
      surplusIds: surplusIds,
      allocations: finalRun.allocations,
      shipments: shipments,
      childSummary: buildChildSummary(finalRun.states, childIds, finalRun.targetsById),
      parentSummary: buildParentSummary(finalRun.states, parentIds),
      surplusSummary: buildSurplusSummary(finalRun.states, surplusIds),
      meta: {
        computedChildFillPct: bestRatio,
        childrenMaxFillPct: maxFill,
        parentReservePct: clamp(parentReservePct, 0, 100),
        surplusCapPct: clamp(surplusCapPct, 0, 100),
        phaseTotals: buildPhaseTotals(finalRun.allocations),
        childMerchantsUsed: merchantsUsedForIds(finalRun.states, childIds),
        parentMerchantsUsed: merchantsUsedForIds(finalRun.states, parentIds),
        stopReason: diagnostics.stopReason,
        diagnostics: diagnostics,
        warnings: warnings,
        excludedOverlapIds: normalized.excludedOverlapIds
      }
    };
    if (bestRatio === 0 && childIds.length) plan.meta.warnings.push('Computed child fill is 0%. Supply and/or merchants are too tight for a higher ratio.');
    if (!surplusIds.length) plan.meta.warnings.push('No usable Surplus group selected. This does not affect the accepted child target; leftover parent stock simply stays home.');
    return plan;
  }

  function buildFlatChildSummary(st, childIds, targetsById, capsById, flatTargetEach) {
    return childIds.map(function (id) {
      var s = st.get(id);
      if (!s) return null;
      var before = addRes(cloneRes(s.base0), cloneRes(s.inc0));
      var after = addRes(cloneRes(s.baseNow), cloneRes(s.inc0));
      after = addRes(after, cloneRes(s.inPlanned));
      var cap = capsById && capsById[id] != null ? capsById[id] : (s.flatCapEach || 0);
      var target = targetsById && targetsById[id] != null ? targetsById[id] : 0;
      return {
        id: s.id,
        name: s.name,
        coord: s.coord,
        storage: s.storage,
        capEach: cap,
        targetEach: target,
        capped: cap < max0(flatTargetEach),
        current: cloneRes(s.base0),
        incoming: cloneRes(s.inc0),
        before: before,
        sent: cloneRes(s.outPlanned),
        recv: cloneRes(s.inPlanned),
        after: after,
        merchFree: max0(s.merchFree0 || 0),
        merchTotal: max0(s.merchTotal || 0),
        merchUsed: Math.max(0, (s.merchFree0 || 0) - (s.merchFree || 0))
      };
    }).filter(Boolean);
  }
  function simulateModeDChildOnly(parentIds, childIds, snapshotsById, incomingMap, flatTargetEach, reservePct, depotCapPct) {
    var allIds = uniq(parentIds.concat(childIds));
    var st = buildPlanState(allIds, snapshotsById, incomingMap, 0, reservePct, null);
    var allocations = [];
    var built = buildModeDTargets(st, childIds, flatTargetEach, depotCapPct);
    runChildRebalance(st, childIds, built.targetsById, allocations);
    return {
      states: st,
      allocations: allocations,
      targetsById: built.targetsById,
      capsById: built.capsById
    };
  }
  function buildModeDCappedRows(st, childIds, capsById, flatTargetEach) {
    var rows = [];
    (childIds || []).forEach(function (id) {
      var s = st.get(id);
      if (!s) return;
      var cap = capsById && capsById[id] != null ? capsById[id] : 0;
      if (cap < max0(flatTargetEach)) {
        rows.push({ id: s.id, name: s.name, coord: s.coord, capEach: cap });
      }
    });
    rows.sort(function (a, b) { return a.capEach - b.capEach || a.id - b.id; });
    return rows;
  }
  function runModeDChildSurplusParking(st, childIds, surplusIds, targetsById, allocations) {
    if (!surplusIds.length) return;
    ['wood', 'clay', 'iron'].forEach(function (rk) {
      var receivers = surplusIds.map(function (id) {
        var s = st.get(id);
        if (!s) return null;
        var need = surplusSpace(s, rk);
        return need > 0 ? { id: id, need: need, storage: s.storage || 0 } : null;
      }).filter(Boolean);
      receivers.sort(function (a, b) {
        if (b.need !== a.need) return b.need - a.need;
        if (b.storage !== a.storage) return b.storage - a.storage;
        return a.id - b.id;
      });
      receivers.forEach(function (rec) {
        var to = st.get(rec.id);
        if (!to) return;
        while (rec.need > 0) {
          var donors = childIds.map(function (id) {
            var s = st.get(id);
            if (!s || (s.merchFree || 0) <= 0) return null;
            var sendable = childSendable(s, rk, targetsById[id] || 0);
            return sendable > 0 ? { id: id, state: s, sendable: sendable, storage: s.storage || 0 } : null;
          }).filter(Boolean);
          donors.sort(function (a, b) {
            if (b.sendable !== a.sendable) return b.sendable - a.sendable;
            if (b.storage !== a.storage) return b.storage - a.storage;
            return a.id - b.id;
          });
          if (!donors.length) break;
          var donor = donors[0];
          var sent = applySend(donor.state, to, rk, Math.min(donor.sendable, rec.need), 'SUR', Y.cfg.PHASE_ORDER.SUR, allocations);
          if (sent <= 0) break;
          rec.need = surplusSpace(to, rk);
        }
      });
    });
  }
  function runModeDParentSurplusParking(st, parentIds, surplusIds, allocations) {
    if (!surplusIds.length) return;
    ['wood', 'clay', 'iron'].forEach(function (rk) {
      var receivers = surplusIds.map(function (id) {
        var s = st.get(id);
        if (!s) return null;
        var need = surplusSpace(s, rk);
        return need > 0 ? { id: id, need: need, storage: s.storage || 0 } : null;
      }).filter(Boolean);
      receivers.sort(function (a, b) {
        if (b.need !== a.need) return b.need - a.need;
        if (b.storage !== a.storage) return b.storage - a.storage;
        return a.id - b.id;
      });
      receivers.forEach(function (rec) {
        var to = st.get(rec.id);
        if (!to) return;
        while (rec.need > 0) {
          var donors = rankParentDonors(st, parentIds, to, rk, rec.need);
          if (!donors.length) break;
          var donor = donors[0];
          var sendGoal = donor.friendlyChunk > 0 ? donor.friendlyChunk : donor.fallbackChunk;
          if (sendGoal <= 0) break;
          var sent = applySend(donor.state, to, rk, sendGoal, 'SUR', Y.cfg.PHASE_ORDER.SUR, allocations);
          if (sent <= 0) break;
          rec.need = surplusSpace(to, rk);
        }
      });
    });
  }
  function runModeDSurplusRouting(st, parentIds, childIds, surplusIds, targetsById, allocations) {
    if (!surplusIds.length) return;
    setSurplusCaps(st, surplusIds, 100);
    runModeDChildSurplusParking(st, childIds, surplusIds, targetsById, allocations);
    runModeDParentSurplusParking(st, parentIds, surplusIds, allocations);
  }
  function buildModeDStopReasonDiagnostics(parentIds, childIds, snapshotsById, incomingMap, bestFlatTarget, depotCapPct, parentReservePct) {
    var lines = [];
    depotCapPct = clamp(depotCapPct, 0, 100);
    var upperBound = 0;
    (childIds || []).forEach(function (id) {
      var snap = snapshotsById[id];
      if (!snap) return;
      upperBound = Math.max(upperBound, capEach(snap.storage || 0, depotCapPct));
    });

    if (bestFlatTarget >= upperBound) {
      var ceilingText = 'Stopped at the effective depot-cap ceiling. All remaining flat-target growth is capped by child storage.';
      lines.push(ceilingText);
      return {
        nextFlatTarget: null,
        stopReason: ceilingText,
        bottlenecks: [],
        residualNeed: zeroRes(),
        parentAvailability: zeroRes(),
        parentMerchantBudget: 0,
        parentWcCapacity: 0,
        parentAllCapacity: 0,
        parentFriendlyAvailability: zeroRes(),
        parentNoMerchantStock: zeroRes(),
        parentReserveBlocked: zeroRes(),
        childLockedSupply: { total: zeroRes(), villages: [] },
        cappedChildren: [],
        parentConstraintRows: [],
        lines: lines
      };
    }

    var nextFlatTarget = bestFlatTarget + 1;
    var childOnly = simulateModeDChildOnly(parentIds, childIds, snapshotsById, incomingMap, nextFlatTarget, parentReservePct, depotCapPct);
    var residual = sumChildNeeds(childOnly.states, childIds, childOnly.targetsById);
    var parentAvail = sumParentAvailability(childOnly.states, parentIds);
    var parentMerchBudget = sumParentMerchantBudget(childOnly.states, parentIds);
    var parentWcCapacity = sumParentWcCapacity(childOnly.states, parentIds);
    var parentAllCapacity = sumParentAllCapacity(childOnly.states, parentIds);
    var parentSupport = buildParentNextRatioDiagnostics(childOnly.states, parentIds);
    var childLockedSupply = computeLockedChildSupply(childOnly.states, childIds, childOnly.targetsById);
    var cappedChildren = buildModeDCappedRows(childOnly.states, childIds, childOnly.capsById, nextFlatTarget);

    var wcNeed = (residual.wood || 0) + (residual.clay || 0);
    var bottlenecks = [];
    if (wcNeed > parentWcCapacity) {
      bottlenecks.push({
        type: 'parent_wc_ceiling',
        text: 'Parent wood+clay export ceiling ' + Y.formatTwNumber(parentWcCapacity) + ' < needed ' + Y.formatTwNumber(wcNeed) + ' at flat target ' + Y.formatTwNumber(nextFlatTarget) + '.'
      });
    }
    if (residual.total > parentMerchBudget) {
      bottlenecks.push({
        type: 'parent_merchant_ceiling',
        text: 'Parent merchant ceiling ' + Y.formatTwNumber(parentMerchBudget) + ' < total remaining need ' + Y.formatTwNumber(residual.total) + ' at flat target ' + Y.formatTwNumber(nextFlatTarget) + '.'
      });
    }
    ['wood', 'clay', 'iron'].forEach(function (rk) {
      if (residual[rk] > parentAvail[rk]) {
        bottlenecks.push({
          type: 'parent_' + rk + '_shortage',
          text: 'Parent ' + rk + ' availability ' + Y.formatTwNumber(parentAvail[rk]) + ' < needed ' + Y.formatTwNumber(residual[rk]) + ' at flat target ' + Y.formatTwNumber(nextFlatTarget) + '.'
        });
      }
    });
    if (childLockedSupply.total.total > 0) {
      bottlenecks.push({
        type: 'child_merchant_exhaustion',
        text: 'Child merchant exhaustion leaves ' + formatResShort(childLockedSupply.total) + ' current stock stranded before parent import at flat target ' + Y.formatTwNumber(nextFlatTarget) + '.'
      });
    }
    if (!bottlenecks.length) {
      var generic = residual.total > parentAllCapacity
        ? 'Next flat target ' + Y.formatTwNumber(nextFlatTarget) + ' exceeds total parent shippable volume under current merchant ownership.'
        : 'Next flat target ' + Y.formatTwNumber(nextFlatTarget) + ' fails under current local merchant/pair allocation limits.';
      bottlenecks.push({ type: 'local_allocation', text: generic });
    }

    lines.push('Stop reason: ' + bottlenecks[0].text);
    if (residual.total > 0) lines.push('Next flat target ' + Y.formatTwNumber(nextFlatTarget) + ' still needs ' + formatResShort(residual) + ' after child rebalance.');
    if (cappedChildren.length) {
      var cappedPreview = cappedChildren.slice(0, 3).map(function (row) {
        return row.name + ' (cap ' + Y.formatTwNumber(row.capEach) + ')';
      });
      lines.push('Children already capped by Depot Cap % at the next target: ' + cappedPreview.join(' | ') + (cappedChildren.length > 3 ? ' | +' + (cappedChildren.length - 3) + ' more' : '') + '.');
    }
    if (childLockedSupply.total.total > 0) lines.push('Internal child stock blocked by merchants: ' + formatResShort(childLockedSupply.total) + '.');
    if (parentAvail.total > 0 || parentMerchBudget > 0) {
      lines.push(
        'Parent export at next target: raw above reserve ' + formatResShort(parentAvail) +
        ' | balance-safe ' + formatResShort(parentSupport.friendly) +
        ' | merchant budget ' + Y.formatTwNumber(parentMerchBudget) + '.'
      );
    }
    if (parentSupport.noMerchant.total > 0) {
      lines.push('Parents with stock but no merchants: ' + formatResShort(parentSupport.noMerchant) + '.');
      var topNoMerch = topDiagRows(parentSupport.rows, 'no_merchant_parent', 2);
      if (topNoMerch.length) lines.push('Top no-merchant Parents: ' + topNoMerch.join(' | '));
    }
    if (parentReservePct > 0 && parentSupport.reserveBlocked.total > 0) {
      lines.push('Parent reserve floor keeps ' + formatResShort(parentSupport.reserveBlocked) + ' at home before the next target.');
      var topReserve = topDiagRows(parentSupport.rows, 'reserve_blocked_parent', 2);
      if (topReserve.length) lines.push('Top reserve-blocked Parents: ' + topReserve.join(' | '));
    }
    if (
      residual.total > 0 &&
      (
        residual.wood > parentSupport.friendly.wood ||
        residual.clay > parentSupport.friendly.clay ||
        residual.iron > parentSupport.friendly.iron
      )
    ) {
      lines.push(
        'Balance-safe parent export is already exhausted at the next target: friendly ' +
        formatResShort(parentSupport.friendly) + ' vs need ' + formatResShort(residual) + '.'
      );
      var topFriendly = topDiagRows(parentSupport.rows, 'friendly_parent', 2);
      if (topFriendly.length) lines.push('Top balance-safe Parents: ' + topFriendly.join(' | '));
    }
    if (wcNeed > parentWcCapacity && (parentAvail.wood + parentAvail.clay) > parentWcCapacity) {
      lines.push('Some parent wood/clay still exists, but merchant ownership and pair limits keep it from covering the next flat target.');
    }
    if (residual.total > parentMerchBudget && parentAvail.total >= residual.total) {
      lines.push('Raw parent stock is not the only blocker here: merchants run out before enough stock can move.');
    }

    return {
      nextFlatTarget: nextFlatTarget,
      stopReason: bottlenecks[0].text,
      bottlenecks: bottlenecks,
      residualNeed: residual,
      parentAvailability: parentAvail,
      parentMerchantBudget: parentMerchBudget,
      parentWcCapacity: parentWcCapacity,
      parentAllCapacity: parentAllCapacity,
      parentFriendlyAvailability: parentSupport.friendly,
      parentNoMerchantStock: parentSupport.noMerchant,
      parentReserveBlocked: parentSupport.reserveBlocked,
      childLockedSupply: childLockedSupply,
      cappedChildren: cappedChildren,
      parentConstraintRows: parentSupport.rows,
      lines: lines
    };
  }
  function buildModeDDiagnostics(finalRun, parentIds, childIds, surplusIds, snapshotsById, incomingMap, bestFlatTarget, depotCapPct, parentReservePct) {
    var stop = buildModeDStopReasonDiagnostics(parentIds, childIds, snapshotsById, incomingMap, bestFlatTarget, depotCapPct, parentReservePct);
    var hasUsableSurplus = !!(surplusIds && surplusIds.length);
    var excess = buildNonMovableExcessDiagnostics(finalRun.states, childIds, finalRun.targetsById, hasUsableSurplus);
    var acceptedParentAvail = sumParentAvailability(finalRun.states, parentIds);
    var acceptedParentSupport = buildParentNextRatioDiagnostics(finalRun.states, parentIds);
    var acceptedCapped = buildModeDCappedRows(finalRun.states, childIds, finalRun.capsById, bestFlatTarget);
    var lines = stop.lines.slice();

    if (acceptedCapped.length) {
      var cappedAcceptedPreview = acceptedCapped.slice(0, 3).map(function (row) {
        return row.name + ' (cap ' + Y.formatTwNumber(row.capEach) + ')';
      });
      lines.push('Children capped at the accepted flat target: ' + cappedAcceptedPreview.join(' | ') + (acceptedCapped.length > 3 ? ' | +' + (acceptedCapped.length - 3) + ' more' : '') + '.');
    }
    if (excess.totals.arrivalLocked.total > 0) {
      lines.push('Arrival-locked excess: ' + formatResShort(excess.totals.arrivalLocked) + '.');
      var topArrival = topDiagRows(excess.rows, 'arrival_locked', 2);
      if (topArrival.length) lines.push('Top arrival-locked villages: ' + topArrival.join(' | '));
    }
    if (excess.totals.merchantStranded.total > 0) {
      lines.push('Child merchant-stranded excess: ' + formatResShort(excess.totals.merchantStranded) + '.');
      var topMerchant = topDiagRows(excess.rows, 'merchant_stranded', 2);
      if (topMerchant.length) lines.push('Top merchant-stranded villages: ' + topMerchant.join(' | '));
    }
    if (excess.totals.sinkBlocked.total > 0) {
      lines.push(
        hasUsableSurplus
          ? 'Child sink-blocked excess after Surplus parking: ' + formatResShort(excess.totals.sinkBlocked) + '. No remaining usable Surplus room or same-run routing capacity.'
          : 'Child sink-blocked excess: ' + formatResShort(excess.totals.sinkBlocked) + '. No usable Surplus villages remain, so this excess stays home.'
      );
      var sinkType = hasUsableSurplus ? 'residual_excess' : 'sink_blocked';
      var topSink = topDiagRows(excess.rows, sinkType, 2);
      if (topSink.length) lines.push('Top sink-blocked villages: ' + topSink.join(' | '));
    }
    if (acceptedParentAvail.total > 0) {
      lines.push(
        'Unused parent stock after the accepted flat target: raw above reserve ' + formatResShort(acceptedParentAvail) +
        ' | balance-safe ' + formatResShort(acceptedParentSupport.friendly) + '.'
      );
    }
    if (acceptedParentSupport.noMerchant.total > 0) {
      lines.push('Parent no-merchant excess after the accepted flat target: ' + formatResShort(acceptedParentSupport.noMerchant) + '.');
    }
    if (parentReservePct > 0 && acceptedParentSupport.reserveBlocked.total > 0) {
      lines.push('Parent reserve-blocked excess after the accepted flat target: ' + formatResShort(acceptedParentSupport.reserveBlocked) + '.');
    }
    if (!hasUsableSurplus) {
      lines.push('No usable Surplus villages remain for final excess parking.');
    }

    return {
      stopReason: stop.stopReason,
      nextFlatTarget: stop.nextFlatTarget,
      bottlenecks: stop.bottlenecks,
      residualNeedAtNextTarget: stop.residualNeed,
      parentAvailabilityAtNextTarget: stop.parentAvailability,
      parentMerchantBudgetAtNextTarget: stop.parentMerchantBudget,
      parentWcCapacityAtNextTarget: stop.parentWcCapacity,
      parentAllCapacityAtNextTarget: stop.parentAllCapacity,
      parentFriendlyAvailabilityAtNextTarget: stop.parentFriendlyAvailability,
      parentNoMerchantStockAtNextTarget: stop.parentNoMerchantStock,
      parentReserveBlockedAtNextTarget: stop.parentReserveBlocked,
      childLockedSupplyAtNextTarget: stop.childLockedSupply,
      cappedChildrenAtNextTarget: stop.cappedChildren,
      parentConstraintRowsAtNextTarget: stop.parentConstraintRows,
      unusedParentAvailabilityAtAcceptedTarget: acceptedParentAvail,
      unusedParentFriendlyAvailabilityAtAcceptedTarget: acceptedParentSupport.friendly,
      unusedParentNoMerchantStockAtAcceptedTarget: acceptedParentSupport.noMerchant,
      unusedParentReserveBlockedAtAcceptedTarget: acceptedParentSupport.reserveBlocked,
      cappedChildrenAtAcceptedTarget: acceptedCapped,
      nonMovableExcess: excess,
      lines: lines
    };
  }
  function simulateModeDCandidate(parentIds, childIds, surplusIds, snapshotsById, incomingMap, flatTargetEach, reservePct, depotCapPct) {
    var allIds = uniq(parentIds.concat(childIds).concat(surplusIds || []));
    var st = buildPlanState(allIds, snapshotsById, incomingMap, 0, reservePct, null);
    var allocations = [];
    var built = buildModeDTargets(st, childIds, flatTargetEach, depotCapPct);
    runChildRebalance(st, childIds, built.targetsById, allocations);
    runParentImport(st, parentIds, childIds, built.targetsById, allocations);
    return {
      feasible: childrenSatisfied(st, childIds, built.targetsById),
      states: st,
      allocations: allocations,
      targetsById: built.targetsById,
      capsById: built.capsById,
      flatTargetEach: flatTargetEach
    };
  }
  function planFlat(parentIds, childIds, surplusIds, snapshotsById, incomingMap, depotCapPct, parentReservePct) {
    var normalized = normalizeModeDSets(parentIds, childIds, surplusIds);
    parentIds = normalized.parentIds;
    childIds = normalized.childIds;
    surplusIds = normalized.surplusIds;
    var warnings = normalized.warnings.slice();

    depotCapPct = clamp(depotCapPct, 0, 100);
    parentReservePct = clamp(parentReservePct, 0, 100);

    if (!childIds.length) {
      warnings.push('No Children villages selected.');
      return {
        mode: 'flat',
        states: buildPlanState(uniq(parentIds.concat(surplusIds)), snapshotsById, incomingMap, 0, parentReservePct, null),
        parentIds: parentIds,
        childIds: [],
        surplusIds: surplusIds,
        allocations: [],
        shipments: [],
        childSummary: [],
        parentSummary: [],
        surplusSummary: [],
        meta: {
          computedFlatTarget: 0,
          depotCapPct: depotCapPct,
          parentReservePct: parentReservePct,
          phaseTotals: { CRB: zeroRes(), PIM: zeroRes(), SUR: zeroRes() },
          childMerchantsUsed: 0,
          parentMerchantsUsed: 0,
          stopReason: 'No Children villages selected.',
          diagnostics: {
            stopReason: 'No Children villages selected.',
            nextFlatTarget: null,
            bottlenecks: [],
            residualNeedAtNextTarget: zeroRes(),
            parentAvailabilityAtNextTarget: zeroRes(),
            parentMerchantBudgetAtNextTarget: 0,
            parentWcCapacityAtNextTarget: 0,
            parentAllCapacityAtNextTarget: 0,
            childLockedSupplyAtNextTarget: { total: zeroRes(), villages: [] },
            cappedChildrenAtNextTarget: [],
            cappedChildrenAtAcceptedTarget: [],
            nonMovableExcess: { totals: { arrivalLocked: zeroRes(), merchantStranded: zeroRes(), sinkBlocked: zeroRes() }, rows: [] },
            lines: ['No Children villages selected.']
          },
          warnings: warnings,
          excludedOverlapIds: normalized.excludedOverlapIds
        }
      };
    }

    if (!parentIds.length) warnings.push('No Parents villages selected. Only current child stock and incoming can contribute.');
    if (!surplusIds.length) warnings.push('No usable Surplus villages remain. Final excess parking will be skipped.');

    var upperBound = 0;
    childIds.forEach(function (id) {
      var snap = snapshotsById[id];
      if (!snap) return;
      upperBound = Math.max(upperBound, capEach(snap.storage || 0, depotCapPct));
    });

    var lo = 0;
    var hi = upperBound;
    var bestFlatTarget = 0;
    while (lo <= hi) {
      var mid = Math.floor((lo + hi) / 2);
      var test = simulateModeDCandidate(parentIds, childIds, surplusIds, snapshotsById, incomingMap, mid, parentReservePct, depotCapPct);
      if (test.feasible) {
        bestFlatTarget = mid;
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }

    var finalRun = simulateModeDCandidate(parentIds, childIds, surplusIds, snapshotsById, incomingMap, bestFlatTarget, parentReservePct, depotCapPct);
    if (surplusIds.length) runModeDSurplusRouting(finalRun.states, parentIds, childIds, surplusIds, finalRun.targetsById, finalRun.allocations);
    var shipments = compileShipments(finalRun.states);
    var diagnostics = buildModeDDiagnostics(finalRun, parentIds, childIds, surplusIds, snapshotsById, incomingMap, bestFlatTarget, depotCapPct, parentReservePct);
    var plan = {
      mode: 'flat',
      states: finalRun.states,
      parentIds: parentIds,
      childIds: childIds,
      surplusIds: surplusIds,
      targetIds: childIds,
      surplusSummary: buildSurplusSummary(finalRun.states, surplusIds),
      allocations: finalRun.allocations,
      shipments: shipments,
      childSummary: buildFlatChildSummary(finalRun.states, childIds, finalRun.targetsById, finalRun.capsById, bestFlatTarget),
      parentSummary: buildParentSummary(finalRun.states, parentIds),
      meta: {
        computedFlatTarget: bestFlatTarget,
        depotCapPct: depotCapPct,
        parentReservePct: parentReservePct,
        phaseTotals: buildPhaseTotals(finalRun.allocations),
        childMerchantsUsed: merchantsUsedForIds(finalRun.states, childIds),
        parentMerchantsUsed: merchantsUsedForIds(finalRun.states, parentIds),
        stopReason: diagnostics.stopReason,
        diagnostics: diagnostics,
        warnings: warnings,
        excludedOverlapIds: normalized.excludedOverlapIds
      }
    };
    if (bestFlatTarget === 0 && childIds.length) {
      plan.meta.warnings.push('Computed flat target is 0. Supply and/or merchants are too tight for a higher common target.');
    }
    return plan;
  }

  function planFunnel(allIds, targetIds, surplusIds, snapshotsById, incomingMap, capPct, surplusCapPct, reservePct, ironDeltaPct) {
    var tSet = {}; targetIds.forEach(function (v) { tSet[String(v)] = true; });
    var sSet = {}; (surplusIds || []).forEach(function (v) { sSet[String(v)] = true; });

    surplusIds = (surplusIds || []).filter(function (id) { return !tSet[String(id)]; });
    // v33: Sender list should NOT be nulled by Surplus selection; only exclude Targets.
    var senderIds = (allIds || []).filter(function (id) { return !tSet[String(id)]; });

    var allNeeded = uniq(senderIds.concat(targetIds).concat(surplusIds));

    var capOverride = {};
    surplusIds.forEach(function (vid) {
      var snap = snapshotsById[vid];
      if (!snap) return;
      capOverride[vid] = capEach(snap.storage || 0, surplusCapPct);
    });

    var st = buildPlanState(allNeeded, snapshotsById, incomingMap, capPct, reservePct, capOverride);

    targetIds.forEach(function (vid) {
      var t = st.get(vid);
      if (!t) return;
      t.capEach = capEach(t.storage, capPct);
      var ironFactor = ironFactorFromDeltaPct(ironDeltaPct || 0);
      t.desiredByRes = desiredTripletFromCap(t.capEach, ironFactor);
    });

    ['wood', 'clay', 'iron'].forEach(function (rk) {
      var receivers = [];
      targetIds.forEach(function (vid) {
        var t = st.get(vid);
        if (!t) return;
        var want = (t.desiredByRes && t.desiredByRes[rk]) ? t.desiredByRes[rk] : (t.capEach || 0);
        var need = Math.max(0, Math.floor(want - getFutureRecvVal(t, rk)));
        if (need > 0) receivers.push({ id: vid, need: need });
      });
      receivers.sort(function (a, b) { return b.need - a.need; });

      var donors = [];
      senderIds.forEach(function (vid) {
        var s = st.get(vid);
        if (!s) return;
        var avail = Math.max(0, Math.floor((s.baseNow[rk] || 0) - s.keepEach));
        if (avail > 0) donors.push({ id: vid, surplus: avail });
      });
      donors.sort(function (a, b) { return b.surplus - a.surplus; });

      var di = 0, ri = 0;
      while (di < donors.length && ri < receivers.length) {
        var d = donors[di], r = receivers[ri];
        if (d.surplus <= 0) { di++; continue; }
        if (r.need <= 0) { ri++; continue; }

        var from = st.get(d.id);
        var to = st.get(r.id);

        var take = Math.min(d.surplus, r.need);
        var sent = applySend(from, to, rk, take, 'FUN');
        if (sent <= 0) { di++; continue; }
        d.surplus -= sent;
        r.need -= sent;
      }
    });

    if (surplusIds.length) {
      surplusIds.sort(function (a, b) {
        var sa = snapshotsById[a] ? snapshotsById[a].storage : 0;
        var sb = snapshotsById[b] ? snapshotsById[b].storage : 0;
        return sb - sa;
      });

      ['wood', 'clay', 'iron'].forEach(function (rk) {
        var donors2 = [];
        senderIds.forEach(function (vid) {
          var s = st.get(vid);
          if (!s) return;
          var avail = Math.max(0, Math.floor((s.baseNow[rk] || 0) - s.keepEach));
          if (avail > 0) donors2.push({ id: vid, surplus: avail });
        });
        donors2.sort(function (a, b) { return b.surplus - a.surplus; });

        var di = 0;
        for (var si = 0; si < surplusIds.length && di < donors2.length; si++) {
          var to = st.get(surplusIds[si]);
          if (!to) continue;

          while (di < donors2.length) {
            var d = donors2[di];
            if (d.surplus <= 0) { di++; continue; }
            var from = st.get(d.id);
            if (!from) { di++; continue; }

            var space = (to.capEach || 0) - getFutureRecvVal(to, rk);
            if (space <= 0) break;

            var take = Math.min(d.surplus, space);
            var sent = applySend(from, to, rk, take, 'SUR');
            if (sent <= 0) { di++; continue; }
            d.surplus -= sent;
          }
        }
      });
    }

    var shipments = compileShipments(st);
    return { shipments: shipments, states: st, targetIds: targetIds, senderIds: senderIds, surplusIds: surplusIds };
  }

  function cloneOutToMap(outTo) {
    var cloned = new Map();
    outTo.forEach(function (rec, toId) {
      cloned.set(toId, {
        wood: rec.wood || 0,
        clay: rec.clay || 0,
        iron: rec.iron || 0,
        total: rec.total || 0,
        tags: new Set(Array.from(rec.tags || [])),
        orders: new Set(Array.from(rec.orders || []))
      });
    });
    return cloned;
  }

  function clonePlanState(st) {
    var cloned = new Map();
    st.forEach(function (s, id) {
      cloned.set(id, {
        id: s.id,
        name: s.name,
        coord: s.coord,
        storage: s.storage,
        base0: cloneRes(s.base0),
        inc0: cloneRes(s.inc0),
        baseNow: cloneRes(s.baseNow),
        inPlanned: cloneRes(s.inPlanned),
        outPlanned: cloneRes(s.outPlanned),
        keepEach: s.keepEach || 0,
        capEach: s.capEach || 0,
        merchFree: s.merchFree || 0,
        merchFree0: s.merchFree0 || 0,
        capEachByRes: s.capEachByRes ? { wood: s.capEachByRes.wood || 0, clay: s.capEachByRes.clay || 0, iron: s.capEachByRes.iron || 0 } : null,
        outTo: cloneOutToMap(s.outTo || new Map()),
        isSource: !!s.isSource,
        isCoin: !!s.isCoin,
        isBuffer: !!s.isBuffer,
        reserveEach: s.reserveEach || 0,
        bufferCapEach: s.bufferCapEach || 0,
        coinCost: s.coinCost ? cloneRes(s.coinCost) : null,
        baselineCoins: max0(s.baselineCoins || 0),
        plannedCoinGain: max0(s.plannedCoinGain || 0)
      });
    });
    return cloned;
  }

  function cloneAllocations(allocations) {
    return (allocations || []).map(function (a) {
      return {
        from: a.from,
        to: a.to,
        resource: a.resource,
        amount: a.amount,
        phaseTag: a.phaseTag,
        phaseOrder: a.phaseOrder
      };
    });
  }

  function coinCostTotal(cost) {
    if (!cost) return 0;
    return max0(cost.wood || 0) + max0(cost.clay || 0) + max0(cost.iron || 0);
  }

  function minCoinsForCost(res, cost) {
    if (!res || !cost) return 0;
    var wood = max0(cost.wood || 0);
    var clay = max0(cost.clay || 0);
    var iron = max0(cost.iron || 0);
    if (!wood || !clay || !iron) return 0;
    return Math.floor(Math.min(
      (max0(res.wood || 0) / wood),
      (max0(res.clay || 0) / clay),
      (max0(res.iron || 0) / iron)
    ));
  }

  function coinResForCoins(cost, coins) {
    coins = max0(coins || 0);
    return refreshRes({
      wood: coins * max0(cost && cost.wood),
      clay: coins * max0(cost && cost.clay),
      iron: coins * max0(cost && cost.iron),
      total: 0
    });
  }

  function futureResForState(s) {
    return refreshRes({
      wood: max0((s.baseNow && s.baseNow.wood) || 0) + max0((s.inc0 && s.inc0.wood) || 0) + max0((s.inPlanned && s.inPlanned.wood) || 0),
      clay: max0((s.baseNow && s.baseNow.clay) || 0) + max0((s.inc0 && s.inc0.clay) || 0) + max0((s.inPlanned && s.inPlanned.clay) || 0),
      iron: max0((s.baseNow && s.baseNow.iron) || 0) + max0((s.inc0 && s.inc0.iron) || 0) + max0((s.inPlanned && s.inPlanned.iron) || 0),
      total: 0
    });
  }

  function currentCoinsProtected(s) {
    return max0(s.baselineCoins || 0) + max0(s.plannedCoinGain || 0);
  }

  function coinNeedForCount(s, rk, coinCount) {
    if (!s || !s.coinCost) return 0;
    var required = max0(coinCount || 0) * max0(s.coinCost[rk] || 0);
    return Math.max(0, Math.floor(required - futureResForState(s)[rk]));
  }

  function nextCoinDeficitsForState(s) {
    var nextCount = currentCoinsProtected(s) + 1;
    return refreshRes({
      wood: coinNeedForCount(s, 'wood', nextCount),
      clay: coinNeedForCount(s, 'clay', nextCount),
      iron: coinNeedForCount(s, 'iron', nextCount),
      total: 0
    });
  }

  function coinProgressTowardNext(s) {
    if (!s || !s.coinCost) return 0;
    var deficits = nextCoinDeficitsForState(s);
    var totalCost = Math.max(1, coinCostTotal(s.coinCost));
    return Math.max(0, 1 - (deficits.total / totalCost));
  }

  function normalizeModeCSets(sourceIds, coinIds, bufferIds) {
    sourceIds = uniq(sourceIds);
    coinIds = uniq(coinIds);
    bufferIds = uniq(bufferIds);

    var warnings = [];
    var excluded = [];
    var sourceSet = idSet(sourceIds);
    var coinSet = idSet(coinIds);

    var overlapSourceCoin = sourceIds.filter(function (id) { return !!coinSet[id]; });
    if (overlapSourceCoin.length) warnings.push('Sources/Coin overlap retained as coin-first: ' + overlapSourceCoin.join(', '));

    var overlapBufferCoin = bufferIds.filter(function (id) { return !!coinSet[id]; });
    if (overlapBufferCoin.length) {
      excluded = uniq(excluded.concat(overlapBufferCoin));
      warnings.push('Buffer/Coin overlap excluded: ' + overlapBufferCoin.join(', '));
      bufferIds = bufferIds.filter(function (id) { return !coinSet[id]; });
    }

    var overlapBufferSource = bufferIds.filter(function (id) { return !!sourceSet[id]; });
    if (overlapBufferSource.length) {
      excluded = uniq(excluded.concat(overlapBufferSource));
      warnings.push('Buffer/Sources overlap excluded: ' + overlapBufferSource.join(', '));
      bufferIds = bufferIds.filter(function (id) { return !sourceSet[id]; });
    }

    return {
      sourceIds: sourceIds,
      coinIds: coinIds,
      bufferIds: bufferIds,
      warnings: warnings,
      excludedOverlapIds: excluded
    };
  }

  function buildModeCPlanState(sourceIds, coinIds, bufferIds, snapshotsById, incomingMap, reservePct, bufferCapPct, coinCostById) {
    var allIds = uniq(sourceIds.concat(coinIds).concat(bufferIds));
    var st = buildPlanState(allIds, snapshotsById, incomingMap, 0, 0, null);
    var sourceSet = idSet(sourceIds);
    var coinSet = idSet(coinIds);
    var bufferSet = idSet(bufferIds);

    st.forEach(function (s, id) {
      s.isSource = !!sourceSet[id];
      s.isCoin = !!coinSet[id];
      s.isBuffer = !!bufferSet[id];
      s.reserveEach = s.isSource ? reserveEach(s.storage || 0, reservePct) : 0;
      s.keepEach = s.reserveEach;
      s.bufferCapEach = s.isBuffer ? capEach(s.storage || 0, bufferCapPct) : 0;
      if (s.isBuffer) s.capEachByRes = { wood: s.bufferCapEach, clay: s.bufferCapEach, iron: s.bufferCapEach };
      s.coinCost = coinCostById && coinCostById[id] ? cloneRes(coinCostById[id]) : null;
      if (s.coinCost) {
        s.coinCost.total = coinCostTotal(s.coinCost);
        s.baselineCoins = minCoinsForCost(addRes(cloneRes(s.base0), cloneRes(s.inc0)), s.coinCost);
      } else {
        s.baselineCoins = 0;
      }
      s.plannedCoinGain = 0;
    });

    return st;
  }

  function protectedCurrentNeed(s, rk) {
    if (!s || !s.isCoin || !s.coinCost) return 0;
    var protectedCoins = currentCoinsProtected(s);
    if (protectedCoins <= 0) return 0;
    var required = protectedCoins * max0(s.coinCost[rk] || 0);
    var incomingCovered = max0((s.inc0 && s.inc0[rk]) || 0) + max0((s.inPlanned && s.inPlanned[rk]) || 0);
    return Math.max(0, Math.floor(required - incomingCovered));
  }

  function sourceKeepByRes(s, rk) {
    if (!s || !s.isSource) return 0;
    var keep = max0(s.reserveEach || 0);
    if (s.isCoin && s.coinCost) keep = Math.max(keep, protectedCurrentNeed(s, rk));
    return keep;
  }

  function sourceSendable(s, rk) {
    if (!s || !s.isSource) return 0;
    return Math.max(0, Math.floor(max0((s.baseNow && s.baseNow[rk]) || 0) - sourceKeepByRes(s, rk)));
  }

  function sourceSendableNoReserve(s, rk) {
    if (!s || !s.isSource) return 0;
    var keep = 0;
    if (s.isCoin && s.coinCost) keep = protectedCurrentNeed(s, rk);
    return Math.max(0, Math.floor(max0((s.baseNow && s.baseNow[rk]) || 0) - keep));
  }

  function bufferSpaceForState(s, rk) {
    if (!s || !s.isBuffer) return 0;
    return Math.max(0, Math.floor(max0(s.bufferCapEach || 0) - futureResForState(s)[rk]));
  }

  function ensureOutRecord(fromState, toState) {
    var rec = fromState.outTo.get(toState.id);
    if (!rec) {
      rec = { wood: 0, clay: 0, iron: 0, total: 0, tags: new Set(), orders: new Set() };
      fromState.outTo.set(toState.id, rec);
    }
    return rec;
  }

  function applyCoinSend(fromState, toState, rk, amount, receiverNeed, tag, phaseOrder, allocations) {
    if (!fromState || !toState) return 0;
    if (!rk || amount <= 0 || receiverNeed <= 0) return 0;
    if (fromState.id === toState.id) return 0;

    amount = Math.floor(amount);
    var avail = sourceSendable(fromState, rk);
    if (avail <= 0) return 0;

    var send = Math.min(amount, avail, Math.floor(receiverNeed));
    if (send <= 0) return 0;

    var rec = ensureOutRecord(fromState, toState);
    var oldTotal = rec.total || 0;
    var oldMerch = Math.ceil(oldTotal / Y.cfg.MERCH_CAP_PER);
    var maxSendAllowed = maxPairAdditionalByMerchants(fromState, toState);
    if (maxSendAllowed <= 0) return 0;
    if (send > maxSendAllowed) send = maxSendAllowed;
    if (send <= 0) return 0;

    var newTotal = oldTotal + send;
    var newMerch = Math.ceil(newTotal / Y.cfg.MERCH_CAP_PER);
    var addMerch = newMerch - oldMerch;
    if (addMerch > max0(fromState.merchFree || 0)) return 0;

    fromState.baseNow[rk] -= send;
    fromState.outPlanned[rk] = max0((fromState.outPlanned && fromState.outPlanned[rk]) || 0) + send;
    fromState.outPlanned.total = max0(fromState.outPlanned.total || 0) + send;

    toState.inPlanned[rk] = max0((toState.inPlanned && toState.inPlanned[rk]) || 0) + send;
    toState.inPlanned.total = max0(toState.inPlanned.total || 0) + send;

    rec[rk] = max0(rec[rk] || 0) + send;
    rec.total = newTotal;
    rec.tags.add(tag || '');
    if (phaseOrder != null) rec.orders.add(phaseOrder);

    fromState.merchFree -= addMerch;
    if (fromState.merchFree < 0) fromState.merchFree = 0;

    if (Array.isArray(allocations)) {
      allocations.push({
        from: fromState.id,
        to: toState.id,
        resource: rk,
        amount: send,
        phaseTag: tag || '',
        phaseOrder: phaseOrder == null ? 99 : phaseOrder
      });
    }

    return send;
  }

  function sumCoinSourceAvailability(st, sourceIds, excludeTargetId) {
    var out = zeroRes();
    (sourceIds || []).forEach(function (id) {
      if (excludeTargetId && id === excludeTargetId) return;
      var s = st.get(id);
      if (!s) return;
      out.wood += sourceSendable(s, 'wood');
      out.clay += sourceSendable(s, 'clay');
      out.iron += sourceSendable(s, 'iron');
    });
    return refreshRes(out);
  }

  function sumCoinSourceAvailabilityNoReserve(st, sourceIds, excludeTargetId) {
    var out = zeroRes();
    (sourceIds || []).forEach(function (id) {
      if (excludeTargetId && id === excludeTargetId) return;
      var s = st.get(id);
      if (!s) return;
      out.wood += sourceSendableNoReserve(s, 'wood');
      out.clay += sourceSendableNoReserve(s, 'clay');
      out.iron += sourceSendableNoReserve(s, 'iron');
    });
    return refreshRes(out);
  }

  function sumCoinSourceMerchantBudget(st, sourceIds, excludeTargetId) {
    var total = 0;
    (sourceIds || []).forEach(function (id) {
      if (excludeTargetId && id === excludeTargetId) return;
      var s = st.get(id);
      if (!s) return;
      total += max0(s.merchFree || 0) * Y.cfg.MERCH_CAP_PER;
    });
    return total;
  }

  function computeCoinLockedSourceSupply(st, sourceIds, excludeTargetId) {
    var total = zeroRes();
    var rowsMap = Object.create(null);
    (sourceIds || []).forEach(function (id) {
      if (excludeTargetId && id === excludeTargetId) return;
      var s = st.get(id);
      if (!s || max0(s.merchFree || 0) > 0) return;
      ['wood', 'clay', 'iron'].forEach(function (rk) {
        var sendable = sourceSendable(s, rk);
        if (sendable > 0) {
          total[rk] += sendable;
          pushDiagVillage(rowsMap, 'merchant_stranded', s, rk, sendable);
        }
      });
    });
    refreshRes(total);
    var rows = Object.keys(rowsMap).map(function (k) { return rowsMap[k]; });
    rows.sort(function (a, b) { return (b.res.total || 0) - (a.res.total || 0) || a.id - b.id; });
    return { total: total, rows: rows };
  }

  function rankCoinCandidates(st, coinIds) {
    return (coinIds || []).map(function (id) {
      var s = st.get(id);
      if (!s || !s.coinCost) return null;
      var deficits = nextCoinDeficitsForState(s);
      return {
        id: id,
        state: s,
        costTotal: coinCostTotal(s.coinCost),
        deficits: deficits,
        progress: coinProgressTowardNext(s),
        currentCoins: currentCoinsProtected(s)
      };
    }).filter(Boolean).sort(function (a, b) {
      if (a.costTotal !== b.costTotal) return a.costTotal - b.costTotal;
      if (a.deficits.total !== b.deficits.total) return a.deficits.total - b.deficits.total;
      if (b.progress !== a.progress) return b.progress - a.progress;
      return a.id - b.id;
    });
  }

  function resourceOrderForCoinCandidate(st, sourceIds, targetState, nextCoinCount) {
    return ['wood', 'clay', 'iron'].map(function (rk) {
      var need = coinNeedForCount(targetState, rk, nextCoinCount);
      var supply = 0;
      (sourceIds || []).forEach(function (id) {
        if (id === targetState.id) return;
        var s = st.get(id);
        if (!s) return;
        supply += sourceSendable(s, rk);
      });
      var score = need <= 0 ? -1 : resourceScarcity(need, supply);
      return { rk: rk, need: need, supply: supply, score: score };
    }).sort(function (a, b) {
      if (b.score !== a.score) return b.score - a.score;
      if (b.need !== a.need) return b.need - a.need;
      return a.rk.localeCompare(b.rk);
    }).map(function (row) { return row.rk; });
  }

  function rankCoinSourceDonors(st, sourceIds, toState, rk) {
    return (sourceIds || []).map(function (id) {
      if (id === toState.id) return null;
      var s = st.get(id);
      if (!s || max0(s.merchFree || 0) <= 0) return null;
      var sendable = sourceSendable(s, rk);
      var pairLimit = maxPairAdditionalByMerchants(s, toState);
      if (sendable <= 0 || pairLimit <= 0) return null;
      return {
        id: id,
        state: s,
        sendable: Math.min(sendable, pairLimit),
        pairLimit: pairLimit,
        pureSource: s.isSource && !s.isCoin ? 1 : 0,
        merchFree: max0(s.merchFree || 0),
        storage: max0(s.storage || 0)
      };
    }).filter(Boolean).sort(function (a, b) {
      if (b.pureSource !== a.pureSource) return b.pureSource - a.pureSource;
      if (b.sendable !== a.sendable) return b.sendable - a.sendable;
      if (b.merchFree !== a.merchFree) return b.merchFree - a.merchFree;
      if (b.storage !== a.storage) return b.storage - a.storage;
      return a.id - b.id;
    });
  }

  function tryAllocateNextCoin(st, sourceIds, coinId, allocations) {
    var draft = clonePlanState(st);
    var draftAllocations = cloneAllocations(allocations);
    var target = draft.get(coinId);
    if (!target || !target.coinCost) return null;

    var nextCount = currentCoinsProtected(target) + 1;
    var order = resourceOrderForCoinCandidate(draft, sourceIds, target, nextCount);

    for (var oi = 0; oi < order.length; oi++) {
      var rk = order[oi];
      var need = coinNeedForCount(target, rk, nextCount);
      while (need > 0) {
        var donors = rankCoinSourceDonors(draft, sourceIds, target, rk);
        if (!donors.length) return null;
        var sent = 0;
        for (var di = 0; di < donors.length; di++) {
          var donor = donors[di];
          sent = applyCoinSend(donor.state, target, rk, Math.min(donor.sendable, need), need, 'COI', Y.cfg.PHASE_ORDER.COI, draftAllocations);
          if (sent > 0) break;
        }
        if (sent <= 0) return null;
        need = coinNeedForCount(target, rk, nextCount);
      }
    }

    target.plannedCoinGain = max0(target.plannedCoinGain || 0) + 1;
    return { states: draft, allocations: draftAllocations, coinId: coinId };
  }

  function runModeCBufferRouting(st, sourceIds, bufferIds, allocations) {
    if (!bufferIds.length) return;
    ['wood', 'clay', 'iron'].forEach(function (rk) {
      var receivers = bufferIds.map(function (id) {
        var s = st.get(id);
        if (!s) return null;
        var need = bufferSpaceForState(s, rk);
        return need > 0 ? { id: id, state: s, need: need, storage: s.storage || 0 } : null;
      }).filter(Boolean);

      receivers.sort(function (a, b) {
        if (b.need !== a.need) return b.need - a.need;
        if (b.storage !== a.storage) return b.storage - a.storage;
        return a.id - b.id;
      });

      receivers.forEach(function (rec) {
        while (rec.need > 0) {
          var donors = (sourceIds || []).map(function (id) {
            if (id === rec.id) return null;
            var s = st.get(id);
            if (!s || max0(s.merchFree || 0) <= 0) return null;
            var sendable = sourceSendable(s, rk);
            var pairLimit = maxPairAdditionalByMerchants(s, rec.state);
            if (sendable <= 0 || pairLimit <= 0) return null;
            return {
              id: id,
              state: s,
              sendable: Math.min(sendable, pairLimit),
              pureSource: s.isSource && !s.isCoin ? 1 : 0,
              merchFree: max0(s.merchFree || 0),
              storage: max0(s.storage || 0)
            };
          }).filter(Boolean);

          donors.sort(function (a, b) {
            if (b.pureSource !== a.pureSource) return b.pureSource - a.pureSource;
            if (b.sendable !== a.sendable) return b.sendable - a.sendable;
            if (b.merchFree !== a.merchFree) return b.merchFree - a.merchFree;
            if (b.storage !== a.storage) return b.storage - a.storage;
            return a.id - b.id;
          });

          if (!donors.length) break;
          var sent = 0;
          for (var i = 0; i < donors.length; i++) {
            var donor = donors[i];
            sent = applyCoinSend(donor.state, rec.state, rk, Math.min(donor.sendable, rec.need), rec.need, 'BUF', Y.cfg.PHASE_ORDER.BUF, allocations);
            if (sent > 0) break;
          }
          if (sent <= 0) break;
          rec.need = bufferSpaceForState(rec.state, rk);
        }
      });
    });
  }

  function buildModeCCoinSummary(st, coinIds) {
    var rows = [];
    (coinIds || []).forEach(function (id) {
      var s = st.get(id);
      if (!s) return;
      var before = addRes(cloneRes(s.base0), cloneRes(s.inc0));
      var sent = cloneRes(s.outPlanned);
      var recv = cloneRes(s.inPlanned);
      var after = futureResForState(s);
      var baselineCoins = max0(s.baselineCoins || 0);
      var projectedCoins = currentCoinsProtected(s);
      rows.push({
        id: id,
        name: s.name,
        coord: s.coord,
        storage: s.storage,
        coinCost: s.coinCost ? cloneRes(s.coinCost) : null,
        baselineCoins: baselineCoins,
        projectedCoins: projectedCoins,
        additionalCoins: Math.max(0, projectedCoins - baselineCoins),
        nextDeficit: s.coinCost ? nextCoinDeficitsForState(s) : zeroRes(),
        current: cloneRes(s.base0),
        incoming: cloneRes(s.inc0),
        before: before,
        sent: sent,
        recv: recv,
        after: after,
        merchFree: max0(s.merchFree0 || 0),
        merchTotal: max0(s.merchTotal || 0),
        merchUsed: Math.max(0, max0(s.merchFree0 || 0) - max0(s.merchFree || 0))
      });
    });
    rows.sort(function (a, b) {
      var aCost = a.coinCost ? coinCostTotal(a.coinCost) : Number.MAX_SAFE_INTEGER;
      var bCost = b.coinCost ? coinCostTotal(b.coinCost) : Number.MAX_SAFE_INTEGER;
      if (aCost !== bCost) return aCost - bCost;
      if (b.projectedCoins !== a.projectedCoins) return b.projectedCoins - a.projectedCoins;
      return a.id - b.id;
    });
    return rows;
  }

  function buildModeCSourceSummary(st, sourceIds) {
    var rows = [];
    (sourceIds || []).forEach(function (id) {
      var s = st.get(id);
      if (!s) return;
      var before = addRes(cloneRes(s.base0), cloneRes(s.inc0));
      var sent = cloneRes(s.outPlanned);
      var recv = cloneRes(s.inPlanned);
      var after = futureResForState(s);
      var availableLeft = refreshRes({
        wood: sourceSendable(s, 'wood'),
        clay: sourceSendable(s, 'clay'),
        iron: sourceSendable(s, 'iron'),
        total: 0
      });
      rows.push({
        id: id,
        name: s.name,
        coord: s.coord,
        storage: s.storage,
        reserveEach: max0(s.reserveEach || 0),
        current: cloneRes(s.base0),
        incoming: cloneRes(s.inc0),
        before: before,
        sent: sent,
        recv: recv,
        after: after,
        availableLeft: availableLeft,
        merchFree: max0(s.merchFree0 || 0),
        merchTotal: max0(s.merchTotal || 0),
        merchUsed: Math.max(0, max0(s.merchFree0 || 0) - max0(s.merchFree || 0)),
        isCoin: !!s.isCoin
      });
    });
    rows.sort(function (a, b) {
      if ((b.sent.total || 0) !== (a.sent.total || 0)) return (b.sent.total || 0) - (a.sent.total || 0);
      return a.id - b.id;
    });
    return rows;
  }

  function buildModeCBufferSummary(st, bufferIds) {
    var rows = [];
    (bufferIds || []).forEach(function (id) {
      var s = st.get(id);
      if (!s) return;
      rows.push({
        id: id,
        name: s.name,
        coord: s.coord,
        storage: s.storage,
        capEach: max0(s.bufferCapEach || 0),
        current: cloneRes(s.base0),
        incoming: cloneRes(s.inc0),
        before: addRes(cloneRes(s.base0), cloneRes(s.inc0)),
        sent: cloneRes(s.outPlanned),
        recv: cloneRes(s.inPlanned),
        after: futureResForState(s),
        merchFree: max0(s.merchFree0 || 0),
        merchTotal: max0(s.merchTotal || 0),
        merchUsed: Math.max(0, max0(s.merchFree0 || 0) - max0(s.merchFree || 0))
      });
    });
    rows.sort(function (a, b) {
      if ((b.recv.total || 0) !== (a.recv.total || 0)) return (b.recv.total || 0) - (a.recv.total || 0);
      return a.id - b.id;
    });
    return rows;
  }

  function buildModeCArrivalLockedDiagnostics(st, coinIds) {
    var total = zeroRes();
    var rowsMap = Object.create(null);
    (coinIds || []).forEach(function (id) {
      var s = st.get(id);
      if (!s || !s.coinCost) return;
      var projectedCoins = currentCoinsProtected(s);
      ['wood', 'clay', 'iron'].forEach(function (rk) {
        var required = projectedCoins * max0(s.coinCost[rk] || 0);
        var localCurrentAndPlanned = max0((s.baseNow && s.baseNow[rk]) || 0) + max0((s.inPlanned && s.inPlanned[rk]) || 0);
        var locked = Math.max(0, Math.min(max0((s.inc0 && s.inc0[rk]) || 0), Math.floor(required - localCurrentAndPlanned)));
        if (!locked) return;
        total[rk] += locked;
        pushDiagVillage(rowsMap, 'arrival_locked', s, rk, locked);
      });
    });
    refreshRes(total);
    var rows = Object.keys(rowsMap).map(function (k) { return rowsMap[k]; });
    rows.sort(function (a, b) { return (b.res.total || 0) - (a.res.total || 0) || a.id - b.id; });
    return { total: total, rows: rows };
  }

  function buildModeCSinkBlockedDiagnostics(st, sourceIds, hasUsableBuffer) {
    var total = zeroRes();
    var rowsMap = Object.create(null);
    (sourceIds || []).forEach(function (id) {
      var s = st.get(id);
      if (!s) return;
      ['wood', 'clay', 'iron'].forEach(function (rk) {
        var sendable = sourceSendable(s, rk);
        if (!sendable) return;
        total[rk] += sendable;
        pushDiagVillage(rowsMap, hasUsableBuffer ? 'residual_excess' : 'sink_blocked', s, rk, sendable);
      });
    });
    refreshRes(total);
    var rows = Object.keys(rowsMap).map(function (k) { return rowsMap[k]; });
    rows.sort(function (a, b) { return (b.res.total || 0) - (a.res.total || 0) || a.id - b.id; });
    return { total: total, rows: rows };
  }

  function buildModeCStopReasonDiagnostics(st, sourceIds, coinIds, missingCoinIds) {
    var lines = [];
    if ((missingCoinIds || []).length && !(coinIds || []).length) {
      return {
        stopReason: 'No Coin villages with readable academy mint costs were available.',
        candidate: null,
        deficits: zeroRes(),
        sourceAvailability: zeroRes(),
        sourceAvailabilityNoReserve: zeroRes(),
        sourceMerchantBudget: 0,
        lockedSourceSupply: { total: zeroRes(), rows: [] },
        bottlenecks: [{ type: 'missing_coin_cost', text: 'No Coin villages with readable academy mint costs were available.' }],
        lines: ['Stop reason: No Coin villages with readable academy mint costs were available.']
      };
    }

    var candidates = rankCoinCandidates(st, coinIds);
    if (!candidates.length) {
      var noCoinText = 'No Coin villages are available for additional coin planning.';
      return {
        stopReason: noCoinText,
        candidate: null,
        deficits: zeroRes(),
        sourceAvailability: zeroRes(),
        sourceAvailabilityNoReserve: zeroRes(),
        sourceMerchantBudget: 0,
        lockedSourceSupply: { total: zeroRes(), rows: [] },
        bottlenecks: [{ type: 'no_coin_candidates', text: noCoinText }],
        lines: ['Stop reason: ' + noCoinText]
      };
    }

    var candidate = candidates[0];
    var deficits = candidate.deficits;
    var sourceAvailability = sumCoinSourceAvailability(st, sourceIds, candidate.id);
    var sourceAvailabilityNoReserve = sumCoinSourceAvailabilityNoReserve(st, sourceIds, candidate.id);
    var sourceMerchantBudget = sumCoinSourceMerchantBudget(st, sourceIds, candidate.id);
    var lockedSourceSupply = computeCoinLockedSourceSupply(st, sourceIds, candidate.id);
    var bottlenecks = [];

    if (!sourceIds.length) {
      bottlenecks.push({ type: 'no_sources', text: 'No Sources villages are available to feed additional coins.' });
    }
    ['wood', 'clay', 'iron'].forEach(function (rk) {
      if (deficits[rk] > sourceAvailability[rk]) {
        if (deficits[rk] <= sourceAvailabilityNoReserve[rk]) {
          bottlenecks.push({
            type: 'reserve_block_' + rk,
            text: 'Source reserve blocks ' + rk + ': available with reserve ' + Y.formatTwNumber(sourceAvailability[rk]) + ' < needed ' + Y.formatTwNumber(deficits[rk]) + '.'
          });
        } else {
          bottlenecks.push({
            type: 'source_' + rk + '_shortage',
            text: 'Source ' + rk + ' availability ' + Y.formatTwNumber(sourceAvailability[rk]) + ' < needed ' + Y.formatTwNumber(deficits[rk]) + ' for the next coin.'
          });
        }
      }
    });
    if (deficits.total > sourceMerchantBudget) {
      bottlenecks.push({
        type: 'source_merchant_ceiling',
        text: 'Source merchant ceiling ' + Y.formatTwNumber(sourceMerchantBudget) + ' < needed ' + Y.formatTwNumber(deficits.total) + ' for the next coin.'
      });
    }
    if (lockedSourceSupply.total.total > 0) {
      bottlenecks.push({
        type: 'merchant_exhaustion',
        text: 'Source merchant exhaustion leaves ' + formatResShort(lockedSourceSupply.total) + ' movable current stock stranded.'
      });
    }
    if (!bottlenecks.length) {
      bottlenecks.push({
        type: 'local_allocation',
        text: 'The next coin fails under current pair-level merchant and ownership limits.'
      });
    }

    lines.push('Stop reason: ' + bottlenecks[0].text);
    lines.push('Next coin priority: ' + candidate.state.name + ' | cost ' + formatResShort(candidate.state.coinCost) + ' | missing ' + formatResShort(deficits) + '.');
    if (lockedSourceSupply.total.total > 0) lines.push('Merchant-stranded source stock: ' + formatResShort(lockedSourceSupply.total) + '.');

    return {
      stopReason: bottlenecks[0].text,
      candidate: candidate,
      deficits: deficits,
      sourceAvailability: sourceAvailability,
      sourceAvailabilityNoReserve: sourceAvailabilityNoReserve,
      sourceMerchantBudget: sourceMerchantBudget,
      lockedSourceSupply: lockedSourceSupply,
      bottlenecks: bottlenecks,
      lines: lines
    };
  }

  function buildModeCDiagnostics(st, sourceIds, coinIds, bufferIds, missingCoinIds) {
    var stop = buildModeCStopReasonDiagnostics(st, sourceIds, coinIds, missingCoinIds);
    var arrivalLocked = buildModeCArrivalLockedDiagnostics(st, coinIds);
    var sinkBlocked = buildModeCSinkBlockedDiagnostics(st, sourceIds, bufferIds.length > 0);
    var lines = stop.lines.slice();

    if ((missingCoinIds || []).length) {
      lines.push('Missing academy coin cost: ' + missingCoinIds.join(', ') + '.');
    }
    if (arrivalLocked.total.total > 0) {
      lines.push('Arrival-locked coin resources: ' + formatResShort(arrivalLocked.total) + '.');
      var topArrival = topDiagRows(arrivalLocked.rows, 'arrival_locked', 2);
      if (topArrival.length) lines.push('Top arrival-locked Coin villages: ' + topArrival.join(' | '));
    }
    if (stop.lockedSourceSupply.total.total > 0) {
      var topLocked = topDiagRows(stop.lockedSourceSupply.rows, 'merchant_stranded', 2);
      if (topLocked.length) lines.push('Top merchant-stranded Sources: ' + topLocked.join(' | '));
    }
    if (sinkBlocked.total.total > 0) {
      var sinkLabel = bufferIds.length
        ? 'Optional Buffer could not absorb all movable leftovers.'
        : 'No usable Buffer villages were available for leftover movable stock.';
      lines.push('Sink-blocked source stock: ' + formatResShort(sinkBlocked.total) + '. ' + sinkLabel);
      var sinkType = bufferIds.length ? 'residual_excess' : 'sink_blocked';
      var topSink = topDiagRows(sinkBlocked.rows, sinkType, 2);
      if (topSink.length) lines.push('Top sink-blocked Sources: ' + topSink.join(' | '));
    }

    return {
      stopReason: stop.stopReason,
      candidate: stop.candidate,
      deficitsToNextCoin: stop.deficits,
      sourceAvailabilityToNextCoin: stop.sourceAvailability,
      sourceAvailabilityNoReserveToNextCoin: stop.sourceAvailabilityNoReserve,
      sourceMerchantBudgetToNextCoin: stop.sourceMerchantBudget,
      merchantStrandedSource: stop.lockedSourceSupply,
      arrivalLocked: arrivalLocked,
      sinkBlocked: sinkBlocked,
      bottlenecks: stop.bottlenecks,
      lines: lines
    };
  }

  function buildModeCEmptyPlan(sourceIds, coinIds, bufferIds, warnings, missingCoinIds, excludedOverlapIds, sourceReservePct, bufferCapPct) {
    return {
      mode: 'coin',
      shipments: [],
      allocations: [],
      sourceIds: sourceIds || [],
      coinIds: coinIds || [],
      bufferIds: bufferIds || [],
      targetIds: coinIds || [],
      surplusIds: bufferIds || [],
      states: new Map(),
      coinSummary: [],
      sourceSummary: [],
      bufferSummary: [],
      targetSummary: [],
      surplusSummary: [],
      meta: {
        baselineCoinsTotal: 0,
        projectedCoinsTotal: 0,
        additionalCoins: 0,
        sourceReservePct: sourceReservePct,
        bufferCapPct: bufferCapPct,
        merchantsUsed: 0,
        phaseTotals: buildPhaseTotals([]),
        stopReason: 'No feasible coin plan.',
        diagnostics: {
          stopReason: 'No feasible coin plan.',
          bottlenecks: [],
          arrivalLocked: { total: zeroRes(), rows: [] },
          merchantStrandedSource: { total: zeroRes(), rows: [] },
          sinkBlocked: { total: zeroRes(), rows: [] },
          lines: ['Stop reason: No feasible coin plan.']
        },
        warnings: warnings || [],
        missingCoinCostIds: missingCoinIds || [],
        excludedOverlapIds: excludedOverlapIds || []
      }
    };
  }

  function planCoin(sourceIds, coinIds, bufferIds, snapshotsById, incomingMap, coinCostRecords, sourceReservePct, bufferCapPct) {
    sourceReservePct = clamp(sourceReservePct, 0, 100);
    bufferCapPct = clamp(bufferCapPct, 0, 100);

    var norm = normalizeModeCSets(sourceIds, coinIds, bufferIds);
    sourceIds = norm.sourceIds;
    coinIds = norm.coinIds;
    bufferIds = norm.bufferIds;
    var warnings = norm.warnings.slice();
    var excludedOverlapIds = norm.excludedOverlapIds.slice();

    var coinCostById = {};
    var missingCoinCostIds = [];
    (coinIds || []).forEach(function (id) {
      var rec = coinCostRecords && coinCostRecords[id] ? coinCostRecords[id] : null;
      if (rec && rec.cost) {
        coinCostById[id] = rec.cost;
      } else {
        missingCoinCostIds.push(id);
      }
    });

    if ((coinIds || []).length && missingCoinCostIds.length) {
      warnings.push('Missing academy cost excluded: ' + missingCoinCostIds.join(', '));
    }
    if (!sourceIds.length) warnings.push('No Sources villages selected. Only current Coin-village baselines can count.');
    if (!coinIds.length) warnings.push('No Coin villages selected.');
    if (!bufferIds.length && norm.excludedOverlapIds.length && (sourceIds.length || coinIds.length)) {
      warnings.push('No usable Buffer villages remain after overlap exclusion.');
    }

    if (!coinIds.length) {
      var emptyNoCoin = buildModeCEmptyPlan(sourceIds, coinIds, bufferIds, warnings, missingCoinCostIds, excludedOverlapIds, sourceReservePct, bufferCapPct);
      emptyNoCoin.meta.stopReason = 'No Coin villages selected.';
      emptyNoCoin.meta.diagnostics.stopReason = 'No Coin villages selected.';
      emptyNoCoin.meta.diagnostics.lines = ['Stop reason: No Coin villages selected.'];
      return emptyNoCoin;
    }
    if (missingCoinCostIds.length === coinIds.length) {
      var emptyNoCost = buildModeCEmptyPlan(sourceIds, coinIds, bufferIds, warnings, missingCoinCostIds, excludedOverlapIds, sourceReservePct, bufferCapPct);
      emptyNoCost.meta.stopReason = 'No Coin villages with readable academy mint costs were available.';
      emptyNoCost.meta.diagnostics.stopReason = 'No Coin villages with readable academy mint costs were available.';
      emptyNoCost.meta.diagnostics.lines = ['Stop reason: No Coin villages with readable academy mint costs were available.'];
      return emptyNoCost;
    }

    var st = buildModeCPlanState(sourceIds, coinIds, bufferIds, snapshotsById, incomingMap, sourceReservePct, bufferCapPct, coinCostById);
    var allocations = [];

    while (true) {
      var candidates = rankCoinCandidates(st, coinIds);
      if (!candidates.length) break;
      var applied = false;
      for (var i = 0; i < candidates.length; i++) {
        var trial = tryAllocateNextCoin(st, sourceIds, candidates[i].id, allocations);
        if (trial) {
          st = trial.states;
          allocations = trial.allocations;
          applied = true;
          break;
        }
      }
      if (!applied) break;
    }

    if (bufferIds.length) runModeCBufferRouting(st, sourceIds, bufferIds, allocations);

    var shipments = compileShipments(st);
    var coinSummary = buildModeCCoinSummary(st, coinIds);
    var sourceSummary = buildModeCSourceSummary(st, sourceIds);
    var bufferSummary = buildModeCBufferSummary(st, bufferIds);
    var baselineCoinsTotal = 0;
    var projectedCoinsTotal = 0;
    coinSummary.forEach(function (row) {
      baselineCoinsTotal += max0(row.baselineCoins || 0);
      projectedCoinsTotal += max0(row.projectedCoins || 0);
    });
    var diagnostics = buildModeCDiagnostics(st, sourceIds, coinIds, bufferIds, missingCoinCostIds);

    return {
      mode: 'coin',
      shipments: shipments,
      allocations: allocations,
      sourceIds: sourceIds,
      coinIds: coinIds,
      bufferIds: bufferIds,
      targetIds: coinIds,
      surplusIds: bufferIds,
      states: st,
      coinSummary: coinSummary,
      sourceSummary: sourceSummary,
      bufferSummary: bufferSummary,
      targetSummary: coinSummary,
      surplusSummary: bufferSummary,
      meta: {
        baselineCoinsTotal: baselineCoinsTotal,
        projectedCoinsTotal: projectedCoinsTotal,
        additionalCoins: Math.max(0, projectedCoinsTotal - baselineCoinsTotal),
        sourceReservePct: sourceReservePct,
        bufferCapPct: bufferCapPct,
        merchantsUsed: merchantsUsedForIds(st, sourceIds),
        phaseTotals: buildPhaseTotals(allocations),
        stopReason: diagnostics.stopReason,
        diagnostics: diagnostics,
        warnings: warnings,
        missingCoinCostIds: missingCoinCostIds,
        excludedOverlapIds: excludedOverlapIds
      }
    };
  }

  function summarize(statesMap, ids) {
    var rows = [];
    (ids || []).forEach(function (vid) {
      var s = statesMap.get(vid);
      if (!s) return;

      var sent = cloneRes(s.outPlanned);
      var recv = cloneRes(s.inPlanned);

      var before = cloneRes(s.base0);
      addRes(before, s.inc0);

      var afterArrived = cloneRes(s.base0);
      afterArrived.wood = (s.base0.wood - sent.wood) + s.inc0.wood + recv.wood;
      afterArrived.clay = (s.base0.clay - sent.clay) + s.inc0.clay + recv.clay;
      afterArrived.iron = (s.base0.iron - sent.iron) + s.inc0.iron + recv.iron;
      afterArrived.total = afterArrived.wood + afterArrived.clay + afterArrived.iron;

      rows.push({
        id: vid,
        name: s.name,
        coord: s.coord,
        storage: s.storage,
        before: before,
        sent: sent,
        recv: recv,
        after: afterArrived,
      });
    });

    rows.sort(function (a, b) { return (b.storage || 0) - (a.storage || 0); });
    return rows;
  }

  Y.compute = {
    computeIncomingForSet: computeIncomingForSet,
    planBalance: planBalance,
    planPush: planPush,
    planFlat: planFlat,
    planFunnel: planFunnel,
    planCoin: planCoin,
    summarize: summarize,
  };

  Y.log('compute module loaded Ã¢Å“â€¦');
})();


