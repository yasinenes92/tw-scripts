(function () {
  "use strict";
  var Y = window.__YAVER_RESOURCE_ORCHESTRATOR_V8__;
  if (!Y) return;

  function groupNameById(id) {
    if (id === -1) return "All except Target";
    for (var i = 0; i < (Y.state.groups || []).length; i++) {
      if (Y.state.groups[i].id === id) return Y.state.groups[i].name;
    }
    return id === 0 ? "All villages" : ("Group " + id);
  }

  function filterByGroup(list, gid, targetSetIfMinusOne) {
    gid = parseInt(gid, 10);
    if (!isFinite(gid) || gid === 0) return list.slice();
    if (gid === -1) {
      var out = [];
      var setT = targetSetIfMinusOne || new Set();
      for (var i = 0; i < list.length; i++) if (!setT.has(list[i].id)) out.push(list[i]);
      return out;
    }

    var set = Y.state.groupMembers.get(gid);

    // ✅ FIX: set yoksa boş dönme; güvenli fallback (all)
    if (!set) return list.slice();

    var res = [];
    for (var j = 0; j < list.length; j++) if (set.has(list[j].id)) res.push(list[j]);
    return res;
  }

  function effRow(v) {
    var inc = Y.state.all.incomingRes.get(v.id) || { wood: 0, stone: 0, iron: 0 };
    var base = { wood: v.wood || 0, stone: v.stone || 0, iron: v.iron || 0 };
    var incoming = { wood: inc.wood || 0, stone: inc.stone || 0, iron: inc.iron || 0 };
    var eff = {
      wood: base.wood + incoming.wood,
      stone: base.stone + incoming.stone,
      iron: base.iron + incoming.iron
    };
    eff.total = eff.wood + eff.stone + eff.iron;

    return {
      id: v.id,
      name: v.name,
      coord: v.coord || Y.util.coordOfName(v.name),
      points: v.points || 0,
      storage: v.storage || 0,
      merchAvail: v.merchAvail || 0,
      merchTotal: v.merchTotal || 0,
      base: base,
      inc: incoming,
      eff: eff
    };
  }

  function effListAll() {
    var list = [];
    var vs = Y.state.all.villages || [];
    for (var i = 0; i < vs.length; i++) list.push(effRow(vs[i]));
    return list;
  }

  // --- Table 1: 24h Production ---
  Y.compute.runTable1 = function () {
    var gid = Y.state.t1.groupId || 0;
    Y.state.t1.groupName = groupNameById(gid);

    var q = String(Y.state.ui.search || "").trim().toLowerCase();
    var base = effListAll();
    base = filterByGroup(base, gid);

    var rows = [];
    var totals = { count: 0, w24: 0, s24: 0, i24: 0, total24: 0 };

    for (var i = 0; i < base.length; i++) {
      var r = base[i];
      if (q) {
        var hay = (r.name || "").toLowerCase();
        if (hay.indexOf(q) === -1) continue;
      }
      var p = Y.state.all.prod24.get(r.id) || { w24: 0, s24: 0, i24: 0, total24: 0, wph: 0, sph: 0, iph: 0 };

      totals.count++;
      totals.w24 += p.w24;
      totals.s24 += p.s24;
      totals.i24 += p.i24;
      totals.total24 += p.total24;

      rows.push({
        id: r.id,
        name: r.name,
        points: r.points,
        w24: p.w24, s24: p.s24, i24: p.i24, total24: p.total24,
        wph: p.wph, sph: p.sph, iph: p.iph
      });
    }

    var out = { groupId: gid, groupName: Y.state.t1.groupName, rows: rows, totals: totals };
    Y.state.computed.t1 = out;
    return out;
  };

  // --- Table 2: Current + Incoming ---
  Y.compute.runTable2 = function () {
    var gid = Y.state.t2.groupId || 0;
    Y.state.t2.groupName = groupNameById(gid);

    var q = String(Y.state.ui.search || "").trim().toLowerCase();
    var list = effListAll();
    list = filterByGroup(list, gid);

    var rows = [];
    var totals = {
      count: 0,
      wood: 0, stone: 0, iron: 0, total: 0,
      incWood: 0, incStone: 0, incIron: 0, incTotal: 0
    };

    for (var i = 0; i < list.length; i++) {
      var r = list[i];
      if (q) {
        var hay = (r.name || "").toLowerCase();
        if (hay.indexOf(q) === -1) continue;
      }
      totals.count += 1;
      totals.wood += r.eff.wood;
      totals.stone += r.eff.stone;
      totals.iron += r.eff.iron;
      totals.total += r.eff.total;

      totals.incWood += r.inc.wood;
      totals.incStone += r.inc.stone;
      totals.incIron += r.inc.iron;
      totals.incTotal += (r.inc.wood + r.inc.stone + r.inc.iron);

      rows.push(r);
    }

    var c = totals.count || 1;
    var avgs = {
      count: totals.count,
      wood: Math.floor(totals.wood / c),
      stone: Math.floor(totals.stone / c),
      iron: Math.floor(totals.iron / c),
      total: Math.floor(totals.total / c),
      incWood: Math.floor(totals.incWood / c),
      incStone: Math.floor(totals.incStone / c),
      incIron: Math.floor(totals.incIron / c),
      incTotal: Math.floor(totals.incTotal / c)
    };

    var out = { groupId: gid, groupName: Y.state.t2.groupName, rows: rows, totals: totals, avgs: avgs };
    Y.state.computed.t2 = out;
    return out;
  };

  // --- helper: waterfill (sum -> per village cap) ---
  function waterfillSum(totalSum, caps) {
    var n = caps.length;
    var idx = [];
    for (var i = 0; i < n; i++) idx.push(i);
    idx.sort(function (a, b) { return (caps[a] || 0) - (caps[b] || 0); });

    totalSum = Math.max(0, Math.floor(totalSum));
    var b = new Array(n).fill(0);

    var prefix = 0;
    var found = false;

    for (var k = 0; k < n; k++) {
      var capK = caps[idx[k]] || 0;
      var remainCount = n - k;
      var remainSum = totalSum - prefix;
      if (remainCount <= 0) break;

      var level = remainSum / remainCount;
      if (level <= capK) {
        for (var j = 0; j < k; j++) b[idx[j]] = caps[idx[j]] || 0;
        for (var j2 = k; j2 < n; j2++) b[idx[j2]] = level;
        found = true;
        break;
      } else {
        prefix += capK;
      }
    }

    if (!found) {
      for (var i2 = 0; i2 < n; i2++) b[i2] = Math.min(caps[i2] || 0, totalSum / n);
    }

    var floorB = b.map(function (x, i) { return Math.min(caps[i] || 0, Math.floor(x)); });
    var sumFloor = 0;
    for (var i3 = 0; i3 < n; i3++) sumFloor += floorB[i3];

    var rem = totalSum - sumFloor;
    if (rem > 0) {
      var order = [];
      for (var i4 = 0; i4 < n; i4++) order.push(i4);
      order.sort(function (a, b) { return ((caps[b] || 0) - floorB[b]) - ((caps[a] || 0) - floorB[a]); });

      var ptr = 0;
      while (rem > 0 && ptr < order.length * 5) {
        var ii = order[ptr % order.length];
        if (floorB[ii] < (caps[ii] || 0)) { floorB[ii] += 1; rem -= 1; }
        ptr += 1;
      }
    }
    return floorB;
  }

  function sumEff(list) {
    var s = { wood: 0, stone: 0, iron: 0 };
    for (var i = 0; i < list.length; i++) {
      s.wood += list[i].eff.wood;
      s.stone += list[i].eff.stone;
      s.iron += list[i].eff.iron;
    }
    return s;
  }

  function mkState(r, capPct, reservePct) {
    var capEach = Math.floor((r.storage || 0) * capPct);
    var keepEach = Math.floor((r.storage || 0) * (reservePct / 100));
    return {
      id: r.id,
      name: r.name,
      coord: r.coord,
      storage: r.storage,
      capEach: capEach,
      keepEach: keepEach,
      base: { wood: r.base.wood, stone: r.base.stone, iron: r.base.iron },
      inc: { wood: r.inc.wood, stone: r.inc.stone, iron: r.inc.iron },
      inP: { wood: 0, stone: 0, iron: 0 },
      outP: { wood: 0, stone: 0, iron: 0 },
      merchantsAvail: r.merchAvail || 0,
      outTo: new Map()
    };
  }

  function effFuture(v, key) { return (v.base[key] + v.inc[key] + v.inP[key] - v.outP[key]) || 0; }
  function canSendNow(v, key) { return Math.max(0, (v.base[key] || 0) - (v.keepEach || 0)); }
  function capSpace(v, key) { return Math.max(0, (v.capEach || 0) - effFuture(v, key)); }

  function getOutTo(v, toId) {
    if (!v.outTo.has(toId)) v.outTo.set(toId, { wood: 0, stone: 0, iron: 0, total: 0, tags: new Set() });
    return v.outTo.get(toId);
  }

  function maxExtraTotalAllowed(v, toId) {
    var rec = getOutTo(v, toId);
    var oldMerch = Y.util.merchNeeded(rec.total);
    var maxTotal = (oldMerch + v.merchantsAvail) * Y.cfg.MERCHANT_CAP_PER;
    return Math.max(0, maxTotal - rec.total);
  }

  function applySend(vFrom, vTo, resKey, amount, tag) {
    amount = Math.floor(amount || 0);
    if (amount <= 0) return 0;

    var maxRes = canSendNow(vFrom, resKey);
    amount = Math.min(amount, maxRes);
    if (amount <= 0) return 0;

    var space = capSpace(vTo, resKey);
    amount = Math.min(amount, space);
    if (amount <= 0) return 0;

    var maxExtra = maxExtraTotalAllowed(vFrom, vTo.id);
    amount = Math.min(amount, maxExtra);
    if (amount <= 0) return 0;

    vFrom.base[resKey] -= amount;
    vFrom.outP[resKey] += amount;

    vTo.inP[resKey] += amount;

    var rec = getOutTo(vFrom, vTo.id);
    var oldTotal = rec.total;
    rec[resKey] += amount;
    rec.total += amount;
    if (tag) rec.tags.add(tag);

    var oldMerch = Y.util.merchNeeded(oldTotal);
    var newMerch = Y.util.merchNeeded(rec.total);
    var delta = newMerch - oldMerch;
    vFrom.merchantsAvail -= delta;
    if (vFrom.merchantsAvail < 0) vFrom.merchantsAvail = 0;

    return amount;
  }

  function buildShipmentsFromStates(statesMap) {
    var shipments = [];
    statesMap.forEach(function (from) {
      from.outTo.forEach(function (rec, toId) {
        if (rec.total <= 0) return;
        var tags = Array.from(rec.tags || []);
        shipments.push({
          fromId: from.id,
          fromName: from.name,
          toId: toId,
          toName: "",
          toCoord: "",
          wood: rec.wood || 0,
          stone: rec.stone || 0,
          iron: rec.iron || 0,
          total: rec.total || 0,
          merchants: Y.util.merchNeeded(rec.total || 0),
          tag: tags.length ? tags.join("+") : ""
        });
      });
    });
    return shipments;
  }

  function snapshot(listEff, stById, capPct) {
    var out = [];
    for (var i = 0; i < listEff.length; i++) {
      var r = listEff[i];
      var st = stById.get(r.id);
      if (!st) continue;

      var beforeEff = { wood: r.eff.wood, stone: r.eff.stone, iron: r.eff.iron };
      var sent = { wood: st.outP.wood, stone: st.outP.stone, iron: st.outP.iron };
      var recv = { wood: st.inP.wood, stone: st.inP.stone, iron: st.inP.iron };

      var after = {
        wood: (r.base.wood - sent.wood) + r.inc.wood + recv.wood,
        stone: (r.base.stone - sent.stone) + r.inc.stone + recv.stone,
        iron: (r.base.iron - sent.iron) + r.inc.iron + recv.iron
      };

      out.push({
        id: r.id,
        name: r.name,
        coord: r.coord,
        storage: r.storage,
        capEach: Math.floor((r.storage || 0) * capPct),
        before: beforeEff,
        sent: sent,
        recv: recv,
        after: after
      });
    }
    return out;
  }

  function fillToInfo(shipments, allVillageMap) {
    for (var i = 0; i < shipments.length; i++) {
      var s = shipments[i];
      var to = allVillageMap.get(s.toId);
      if (to) {
        s.toName = to.name;
        s.toCoord = to.coord;
      }
    }
  }

  // --- Table 3 (Orchestrator) ---
  Y.compute.planTable3 = function (mode) {
    mode = mode || Y.state.t3.mode || "balance";
    Y.state.t3.mode = mode;

    var cfg = (mode === "balance") ? Y.state.t3.A : (mode === "push") ? Y.state.t3.B : Y.state.t3.C;

    var capPct = Y.util.clamp(cfg.capPct, 1, 100) / 100;
    var surplusCapPct = Y.util.clamp(cfg.surplusCapPct, 1, 100) / 100;
    var reservePct = Y.util.clamp(cfg.reservePct, 0, 100);

    var listAll = effListAll();
    var allMap = new Map();
    for (var iA = 0; iA < listAll.length; iA++) allMap.set(listAll[iA].id, listAll[iA]);

    var listTarget = filterByGroup(listAll, cfg.targetGroupId || 0);
    var listSurplus = filterByGroup(listAll, cfg.surplusGroupId || 0);

    var listSender = [];
    if (mode === "push") {
      listSender = filterByGroup(listAll, cfg.senderGroupId || 0);
    } else if (mode === "funnel") {
      var setT = new Set(listTarget.map(function (x) { return x.id; }));
      listSender = filterByGroup(listAll, -1, setT);
    }

    var targetCaps = listTarget.map(function (e) { return Math.floor((e.storage || 0) * capPct); });
    var capSum = 0;
    for (var iC = 0; iC < targetCaps.length; iC++) capSum += targetCaps[iC];

    var totTargetEff = sumEff(listTarget);

    var senderSendable = { wood: 0, stone: 0, iron: 0 };
    for (var iS = 0; iS < listSender.length; iS++) {
      var s = listSender[iS];
      var keepEach = Math.floor((s.storage || 0) * (reservePct / 100));
      senderSendable.wood += Math.max(0, s.base.wood - keepEach);
      senderSendable.stone += Math.max(0, s.base.stone - keepEach);
      senderSendable.iron += Math.max(0, s.base.iron - keepEach);
    }

    var Wmax = totTargetEff.wood + ((mode === "balance") ? 0 : senderSendable.wood);
    var Cmax = totTargetEff.stone + ((mode === "balance") ? 0 : senderSendable.stone);
    var Imax = totTargetEff.iron + ((mode === "balance") ? 0 : senderSendable.iron);

    var Bsum = Math.min(Wmax, Cmax, Imax, capSum);
    Bsum = Math.max(0, Math.floor(Bsum));

    var bArr = waterfillSum(Bsum, targetCaps);
    var bMap = new Map();
    for (var iB = 0; iB < listTarget.length; iB++) bMap.set(listTarget[iB].id, bArr[iB] || 0);

    var stTarget = new Map();
    var stSender = new Map();
    var stSurplus = new Map();

    for (var i = 0; i < listTarget.length; i++) stTarget.set(listTarget[i].id, mkState(listTarget[i], capPct, 0));
    for (var i2 = 0; i2 < listSender.length; i2++) stSender.set(listSender[i2].id, mkState(listSender[i2], 1.0, reservePct));
    for (var i3 = 0; i3 < listSurplus.length; i3++) stSurplus.set(listSurplus[i3].id, mkState(listSurplus[i3], surplusCapPct, 0));

    var order = [
      { k: "wood", a: Wmax },
      { k: "stone", a: Cmax },
      { k: "iron", a: Imax }
    ].sort(function (x, y) { return x.a - y.a; }).map(function (x) { return x.k; });

    var warnings = [];

    function planInternalTarget(resKey) {
      var donors = [];
      var receivers = [];

      stTarget.forEach(function (v) {
        var b = bMap.get(v.id) || 0;
        var curEff = effFuture(v, resKey);
        var excess = curEff - b;
        if (excess > 0.5) {
          var sendNow = Math.min(excess, canSendNow(v, resKey));
          if (sendNow > 0) donors.push({ v: v, amt: sendNow });
        }
        var need = b - curEff;
        if (need > 0.5) receivers.push({ v: v, amt: need });
      });

      donors.sort(function (a, b) { return b.amt - a.amt; });
      receivers.sort(function (a, b) { return b.amt - a.amt; });

      var di = 0, ri = 0;
      while (di < donors.length && ri < receivers.length) {
        var d = donors[di], r = receivers[ri];
        if (d.amt <= 0) { di++; continue; }
        if (r.amt <= 0) { ri++; continue; }

        var amt = Math.min(d.amt, r.amt);
        var sent = applySend(d.v, r.v, resKey, amt, "TGT_INTERNAL");
        d.amt -= sent;
        r.amt -= sent;

        if (sent <= 0) di++;
        else {
          if (d.amt <= 0.5) di++;
          if (r.amt <= 0.5) ri++;
        }
      }
    }

    function planSenderToTarget(resKey) {
      if (mode === "balance") return;

      var donors = [];
      var receivers = [];

      stSender.forEach(function (v) {
        var sendNow = canSendNow(v, resKey);
        if (sendNow > 0) donors.push({ v: v, amt: sendNow });
      });

      stTarget.forEach(function (v) {
        var b = bMap.get(v.id) || 0;
        var curEff = effFuture(v, resKey);
        var need = b - curEff;
        if (need > 0.5) receivers.push({ v: v, amt: need });
      });

      donors.sort(function (a, b) { return b.amt - a.amt; });
      receivers.sort(function (a, b) { return b.amt - a.amt; });

      var di = 0, ri = 0;
      while (di < donors.length && ri < receivers.length) {
        var d = donors[di], r = receivers[ri];
        if (d.amt <= 0) { di++; continue; }
        if (r.amt <= 0) { ri++; continue; }

        var amt = Math.min(d.amt, r.amt);
        var sent = applySend(d.v, r.v, resKey, amt, "SND_TO_TGT");
        d.amt -= sent;
        r.amt -= sent;

        if (sent <= 0) di++;
        else {
          if (d.amt <= 0.5) di++;
          if (r.amt <= 0.5) ri++;
        }
      }
    }

    function planTargetToSurplus(resKey) {
      var donors = [];
      var receivers = [];

      stTarget.forEach(function (v) {
        var b = bMap.get(v.id) || 0;
        var curEff = effFuture(v, resKey);
        var excess = curEff - b;
        if (excess > 0.5) {
          var sendNow = Math.min(excess, canSendNow(v, resKey));
          if (sendNow > 0) donors.push({ v: v, amt: sendNow });
        }
      });

      stSurplus.forEach(function (v) {
        var space = capSpace(v, resKey);
        if (space > 0.5) receivers.push({ v: v, amt: space });
      });

      donors.sort(function (a, b) { return b.amt - a.amt; });
      receivers.sort(function (a, b) { return b.amt - a.amt; });

      var di = 0, ri = 0;
      while (di < donors.length && ri < receivers.length) {
        var d = donors[di], r = receivers[ri];
        if (d.amt <= 0) { di++; continue; }
        if (r.amt <= 0) { ri++; continue; }

        var amt = Math.min(d.amt, r.amt);
        var sent = applySend(d.v, r.v, resKey, amt, "TGT_TO_SURPLUS");
        d.amt -= sent;
        r.amt -= sent;

        if (sent <= 0) di++;
        else {
          if (d.amt <= 0.5) di++;
          if (r.amt <= 0.5) ri++;
        }
      }
    }

    for (var oi = 0; oi < order.length; oi++) planInternalTarget(order[oi]);
    for (var oi2 = 0; oi2 < order.length; oi2++) planSenderToTarget(order[oi2]);
    for (var oi3 = order.length - 1; oi3 >= 0; oi3--) planTargetToSurplus(order[oi3]);

    ["wood", "stone", "iron"].forEach(function (rk) {
      var miss = 0;
      stTarget.forEach(function (v) {
        var b = bMap.get(v.id) || 0;
        miss += Math.max(0, b - effFuture(v, rk));
      });
      if (miss > 0.5) warnings.push("Target still missing " + rk + ": " + Y.util.n(Math.floor(miss)));
    });

    var ship = [];
    ship = ship.concat(buildShipmentsFromStates(stTarget));
    ship = ship.concat(buildShipmentsFromStates(stSender));
    fillToInfo(ship, allMap);

    var targetSnap = snapshot(listTarget, stTarget, capPct);
    var senderSnap = snapshot(listSender, stSender, 1.0);
    var surplusSnap = snapshot(listSurplus, stSurplus, surplusCapPct);

    var out = {
      mode: mode,
      cfg: {
        senderGroupId: cfg.senderGroupId,
        targetGroupId: cfg.targetGroupId,
        surplusGroupId: cfg.surplusGroupId,
        reservePct: reservePct,
        capPct: Math.round(capPct * 100),
        surplusCapPct: Math.round(surplusCapPct * 100)
      },
      Bsum: Bsum,
      warnings: warnings,
      shipments: ship,
      targetSnap: targetSnap,
      senderSnap: senderSnap,
      surplusSnap: surplusSnap
    };

    Y.state.computed.t3 = out;
    return out;
  };

  function effListAll() {
    // Local wrapper (keep same as v8)
    var list = [];
    var vs = Y.state.all.villages || [];
    for (var i = 0; i < vs.length; i++) list.push(effRow(vs[i]));
    return list;
  }

  function effRow(v) {
    var inc = Y.state.all.incomingRes.get(v.id) || { wood: 0, stone: 0, iron: 0 };
    var base = { wood: v.wood || 0, stone: v.stone || 0, iron: v.iron || 0 };
    var incoming = { wood: inc.wood || 0, stone: inc.stone || 0, iron: inc.iron || 0 };
    var eff = {
      wood: base.wood + incoming.wood,
      stone: base.stone + incoming.stone,
      iron: base.iron + incoming.iron
    };
    eff.total = eff.wood + eff.stone + eff.iron;

    return {
      id: v.id,
      name: v.name,
      coord: v.coord || Y.util.coordOfName(v.name),
      points: v.points || 0,
      storage: v.storage || 0,
      merchAvail: v.merchAvail || 0,
      merchTotal: v.merchTotal || 0,
      base: base,
      inc: incoming,
      eff: eff
    };
  }
})();
