(function () {
  'use strict';

  var Y = window.YRO_V23;
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

  function planBalance(targetIds, surplusIds, snapshotsById, incomingMap, capPct, surplusCapPct, ironDeltaPct) {
    var tSet = {}; targetIds.forEach(function (v) { tSet[String(v)] = true; });

    surplusIds = (surplusIds || []).filter(function (id) { return !tSet[String(id)]; });

    var allIds = targetIds.concat(surplusIds);

    var capOverride = {};
    surplusIds.forEach(function (vid) {
      var snap = snapshotsById[vid];
      if (!snap) return;
      capOverride[vid] = capEach(snap.storage || 0, surplusCapPct);
    });

    var st = buildPlanState(allIds, snapshotsById, incomingMap, capPct, 0, capOverride);

    targetIds.forEach(function (vid) {
      var s = st.get(vid);
      if (!s) return;
      s.capEach = capEach(s.storage, capPct);
      var ironFactor = ironFactorFromDeltaPct(ironDeltaPct || 0);
      s.desiredByRes = desiredTripletFromCap(s.capEach, ironFactor);
    });

    ['wood', 'clay', 'iron'].forEach(function (rk) {
      var donors = [];
      var receivers = [];

      targetIds.forEach(function (vid) {
        var s = st.get(vid);
        if (!s) return;
        var want = (s.desiredByRes && s.desiredByRes[rk]) ? s.desiredByRes[rk] : 0;
        var cur = getFutureRecvVal(s, rk);
        if (cur > want) donors.push({ id: vid, surplus: cur - want });
        if (cur < want) receivers.push({ id: vid, need: want - cur });
      });

      donors.sort(function (a, b) { return b.surplus - a.surplus; });
      receivers.sort(function (a, b) { return b.need - a.need; });

      var di = 0, ri = 0;
      while (di < donors.length && ri < receivers.length) {
        var d = donors[di];
        var r = receivers[ri];
        if (d.surplus <= 0) { di++; continue; }
        if (r.need <= 0) { ri++; continue; }

        var from = st.get(d.id);
        var to = st.get(r.id);
        if (!from || !to) { di++; continue; }

        var take = Math.min(d.surplus, r.need);
        var sent = applySend(from, to, rk, take, 'BAL');
        if (sent <= 0) {
          var space = (to.capEach || 0) - getFutureRecvVal(to, rk);
          if (space <= 0) ri++; else di++;
          continue;
        }
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
        targetIds.forEach(function (vid) {
          var s = st.get(vid);
          if (!s) return;
          var want = (s.desiredByRes && s.desiredByRes[rk]) ? s.desiredByRes[rk] : 0;
          var cur = getFutureRecvVal(s, rk);
          var extra = Math.max(0, cur - want);
          if (extra > 0) donors2.push({ id: vid, surplus: extra });
        });
        donors2.sort(function (a, b) { return b.surplus - a.surplus; });

        var di = 0;
        for (var si = 0; si < surplusIds.length && di < donors2.length; si++) {
          var toId = surplusIds[si];
          var to = st.get(toId);
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
    return { shipments: shipments, states: st, targetIds: targetIds, surplusIds: surplusIds };
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
  function parentSpreadAfterSend(st, rk, amt) {
    var above = parentAboveReserve(st);
    above[rk] = Math.max(0, (above[rk] || 0) - Math.max(0, Math.floor(amt || 0)));
    return spreadScore(above);
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
      var row = {
        id: id,
        state: s,
        friendlyChunk: friendlyChunk,
        fallbackChunk: fallbackChunk,
        postSpread: parentSpreadAfterSend(s, rk, fallbackChunk),
        remainingTotal: parentRemainingTotalAfterSend(s, rk, fallbackChunk),
        merchFree: s.merchFree || 0
      };
      if (friendlyChunk > 0) tier1.push(row);
      else if (fallbackChunk > 0) tier2.push(row);
    });
    tier1.sort(function (a, b) {
      if (a.postSpread !== b.postSpread) return a.postSpread - b.postSpread;
      if (b.friendlyChunk !== a.friendlyChunk) return b.friendlyChunk - a.friendlyChunk;
      if (b.remainingTotal !== a.remainingTotal) return b.remainingTotal - a.remainingTotal;
      if (b.merchFree !== a.merchFree) return b.merchFree - a.merchFree;
      return a.id - b.id;
    });
    tier2.sort(function (a, b) {
      if (a.postSpread !== b.postSpread) return a.postSpread - b.postSpread;
      if (b.remainingTotal !== a.remainingTotal) return b.remainingTotal - a.remainingTotal;
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
    var totals = { CRB: zeroRes(), PIM: zeroRes(), SUR: zeroRes() };
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
        childLockedSupply: { total: zeroRes(), villages: [] },
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

    return {
      nextRatioPct: nextRatio,
      stopReason: bottlenecks[0].text,
      bottlenecks: bottlenecks,
      residualNeed: residual,
      parentAvailability: parentAvail,
      parentMerchantBudget: parentMerchBudget,
      parentWcCapacity: parentWcCapacity,
      parentAllCapacity: parentAllCapacity,
      childLockedSupply: childLockedSupply,
      lines: lines
    };
  }
  function buildModeBDiagnostics(finalRun, parentIds, childIds, surplusIds, snapshotsById, incomingMap, bestRatio, maxFill, parentReservePct) {
    var stop = buildStopReasonDiagnostics(parentIds, childIds, surplusIds, snapshotsById, incomingMap, bestRatio, maxFill, parentReservePct);
    var excess = buildNonMovableExcessDiagnostics(finalRun.states, childIds, finalRun.targetsById, surplusIds.length > 0);
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

    return {
      stopReason: stop.stopReason,
      nextRatioPct: stop.nextRatioPct,
      bottlenecks: stop.bottlenecks,
      residualNeedAtNextRatio: stop.residualNeed,
      parentAvailabilityAtNextRatio: stop.parentAvailability,
      parentMerchantBudgetAtNextRatio: stop.parentMerchantBudget,
      parentWcCapacityAtNextRatio: stop.parentWcCapacity,
      parentAllCapacityAtNextRatio: stop.parentAllCapacity,
      childLockedSupplyAtNextRatio: stop.childLockedSupply,
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
        before: before, sent: cloneRes(s.outPlanned), recv: cloneRes(s.inPlanned), after: after,
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
        before: cloneRes(s.base0), sent: cloneRes(s.outPlanned), recv: cloneRes(s.inPlanned), after: cloneRes(s.baseNow),
        aboveReserveAfter: refreshRes({ wood: above.wood || 0, clay: above.clay || 0, iron: above.iron || 0, total: 0 }),
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
        before: before, sent: cloneRes(s.outPlanned), recv: cloneRes(s.inPlanned), after: after
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
    if (!surplusIds.length) plan.meta.warnings.push('No Surplus group selected. Leftover parent stock stays home.');
    return plan;
  }

function planFunnel(allIds, targetIds, surplusIds, snapshotsById, incomingMap, capPct, surplusCapPct, reservePct, ironDeltaPct) {
    var tSet = {}; targetIds.forEach(function (v) { tSet[String(v)] = true; });
    var sSet = {}; (surplusIds || []).forEach(function (v) { sSet[String(v)] = true; });

    surplusIds = (surplusIds || []).filter(function (id) { return !tSet[String(id)]; });
    // v23: Sender list should NOT be nulled by Surplus selection; only exclude Targets.
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
    planFunnel: planFunnel,
    summarize: summarize,
  };

  Y.log('compute module loaded ✅');
})();
