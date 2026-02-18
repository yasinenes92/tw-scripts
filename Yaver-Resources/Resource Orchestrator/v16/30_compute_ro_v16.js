(function () {
  'use strict';

  var Y = window.YRO_V16;
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

        outTo: new Map(), // toVid -> {wood,clay,iron,total,tags:Set}
      });
    });

    return st;
  }

  function getFutureRecvVal(toState, rk) {
    return (toState.baseNow[rk] || 0) + (toState.inc0[rk] || 0) + (toState.inPlanned[rk] || 0);
  }

  function applySend(fromState, toState, rk, amount, tag) {
    if (!fromState || !toState) return 0;
    if (!rk || amount <= 0) return 0;
    if (fromState.id === toState.id) return 0;

    amount = Math.floor(amount);

    var avail = (fromState.baseNow[rk] || 0) - fromState.keepEach;
    avail = Math.max(0, Math.floor(avail));
    if (avail <= 0) return 0;

    var cap = Math.max(0, Math.floor(toState.capEach || 0));
    var curFuture = getFutureRecvVal(toState, rk);
    var space = cap - curFuture;
    space = Math.max(0, Math.floor(space));
    if (space <= 0) return 0;

    var send = Math.min(amount, avail, space);
    if (send <= 0) return 0;

    var rec = fromState.outTo.get(toState.id);
    if (!rec) {
      rec = { wood: 0, clay: 0, iron: 0, total: 0, tags: new Set() };
      fromState.outTo.set(toState.id, rec);
    }

    var oldTotal = rec.total || 0;
    var oldMerch = Math.ceil(oldTotal / Y.cfg.MERCH_CAP_PER);

    var maxTotalWithMerch = (oldMerch + fromState.merchFree) * Y.cfg.MERCH_CAP_PER;
    var maxSendAllowed = maxTotalWithMerch - oldTotal;
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

    fromState.merchFree -= addMerch;
    if (fromState.merchFree < 0) fromState.merchFree = 0;

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
          tag: tags.length ? tags.join('+') : '',
        });
      });
    });
    shipments.sort(function (a, b) { return b.total - a.total; });
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

  function planPush(senderIds, targetIds, surplusIds, snapshotsById, incomingMap, capPct, surplusCapPct, reservePct, ironDeltaPct) {
    var tSet = {}; targetIds.forEach(function (v) { tSet[String(v)] = true; });
    var sSet = {}; (surplusIds || []).forEach(function (v) { sSet[String(v)] = true; });

    surplusIds = (surplusIds || []).filter(function (id) { return !tSet[String(id)]; });
    // v16: Sender list should NOT be nulled by Surplus selection; only exclude Targets.
    senderIds = (senderIds || []).filter(function (id) { return !tSet[String(id)]; });

    var allIds = uniq(senderIds.concat(targetIds).concat(surplusIds));

    var capOverride = {};
    surplusIds.forEach(function (vid) {
      var snap = snapshotsById[vid];
      if (!snap) return;
      capOverride[vid] = capEach(snap.storage || 0, surplusCapPct);
    });

    var st = buildPlanState(allIds, snapshotsById, incomingMap, capPct, reservePct, capOverride);

    targetIds.forEach(function (vid) {
      var s = st.get(vid);
      if (!s) return;
      s.capEach = capEach(s.storage, capPct);
      var ironFactor = ironFactorFromDeltaPct(ironDeltaPct || 0);
      // v16: PUSH targets are filled toward CAP with a controllable iron ratio.
      // If ironDeltaPct is -30 => 100/100/70, +30 => 100/100/130 (when cap allows)
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
        var d = donors[di], r = receivers[ri];
        if (d.surplus <= 0) { di++; continue; }
        if (r.need <= 0) { ri++; continue; }
        var from = st.get(d.id);
        var to = st.get(r.id);
        var take = Math.min(d.surplus, r.need);
        var sent = applySend(from, to, rk, take, 'BAL');
        if (sent <= 0) { di++; continue; }
        d.surplus -= sent;
        r.need -= sent;
      }
    });

    ['wood', 'clay', 'iron'].forEach(function (rk) {
      var receivers = [];
      targetIds.forEach(function (vid) {
        var t = st.get(vid);
        if (!t) return;
        var want = (t.desiredByRes && t.desiredByRes[rk]) ? t.desiredByRes[rk] : 0;
        var cur = getFutureRecvVal(t, rk);
        var need = Math.max(0, want - cur);
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
        var sent = applySend(from, to, rk, take, 'SND');
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

  function planFunnel(allIds, targetIds, surplusIds, snapshotsById, incomingMap, capPct, surplusCapPct, reservePct, ironDeltaPct) {
    var tSet = {}; targetIds.forEach(function (v) { tSet[String(v)] = true; });
    var sSet = {}; (surplusIds || []).forEach(function (v) { sSet[String(v)] = true; });

    surplusIds = (surplusIds || []).filter(function (id) { return !tSet[String(id)]; });
    // v16: Sender list should NOT be nulled by Surplus selection; only exclude Targets.
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
