(function () {
  "use strict";

  var Y = window.__YAVER_RESOURCE_ORCHESTRATOR_V2__;
  if (!Y) return;

  function groupNameById(id) {
    for (var i = 0; i < (Y.state.groups || []).length; i++) {
      if (Y.state.groups[i].id === id) return Y.state.groups[i].name;
    }
    return id === 0 ? "All villages" : ("Group " + id);
  }

  function getDataForGroup(gid) {
    return Y.state.cache.get(gid) || { villages: [], incomingRes: new Map() };
  }

  function effVillage(v, inc) {
    inc = inc || { wood: 0, stone: 0, iron: 0 };
    var ew = (v.wood || 0) + (inc.wood || 0);
    var es = (v.stone || 0) + (inc.stone || 0);
    var ei = (v.iron || 0) + (inc.iron || 0);
    return {
      id: v.id,
      name: v.name,
      coord: Y.util.coordOfName(v.name),
      points: v.points || 0,
      storage: v.storage || 0,
      merchAvail: v.merchAvail || 0,
      merchTotal: v.merchTotal || 0,
      base: { wood: v.wood || 0, stone: v.stone || 0, iron: v.iron || 0 },
      inc: { wood: inc.wood || 0, stone: inc.stone || 0, iron: inc.iron || 0 },
      eff: { wood: ew, stone: es, iron: ei, total: ew + es + ei }
    };
  }

  // --- Table 1 ---
  Y.compute.runTable1 = function () {
    var gid = Y.state.table1.groupId || 0;
    Y.state.table1.groupName = groupNameById(gid);

    var data = getDataForGroup(gid);
    var incMap = data.incomingRes || new Map();

    var q = String(Y.state.ui.search || "").trim().toLowerCase();

    var rows = [];
    var totals = {
      count: 0,
      wood: 0, stone: 0, iron: 0, total: 0,
      incWood: 0, incStone: 0, incIron: 0, incTotal: 0
    };

    for (var i = 0; i < data.villages.length; i++) {
      var v = data.villages[i];
      if (!v) continue;

      if (q) {
        var hay = (v.name || "").toLowerCase();
        if (hay.indexOf(q) === -1) continue;
      }

      var inc = incMap.has(v.id) ? incMap.get(v.id) : { wood: 0, stone: 0, iron: 0 };
      var e = effVillage(v, inc);

      totals.count += 1;
      totals.wood += e.eff.wood;
      totals.stone += e.eff.stone;
      totals.iron += e.eff.iron;
      totals.total += e.eff.total;

      totals.incWood += e.inc.wood;
      totals.incStone += e.inc.stone;
      totals.incIron += e.inc.iron;
      totals.incTotal += (e.inc.wood + e.inc.stone + e.inc.iron);

      rows.push(e);
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

    var out = { groupId: gid, groupName: Y.state.table1.groupName, rows: rows, totals: totals, avgs: avgs };
    Y.state.computed.t1 = out;
    return out;
  };

  // Waterfill SUM into caps => integer b array
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

  function sumRes(arr) {
    var s = { wood: 0, stone: 0, iron: 0 };
    for (var i = 0; i < arr.length; i++) {
      var e = arr[i];
      s.wood += e.eff.wood;
      s.stone += e.eff.stone;
      s.iron += e.eff.iron;
    }
    return s;
  }

  function cloneMutable(list, capPct) {
    var out = [];
    for (var i = 0; i < list.length; i++) {
      var e = list[i];
      var cap = Math.floor((e.storage || 0) * capPct);
      out.push({
        id: e.id,
        name: e.name,
        coord: e.coord,
        points: e.points,
        storage: e.storage,
        capEach: cap,
        merchAvail: e.merchAvail,
        merchTotal: e.merchTotal,
        cur: { wood: e.eff.wood, stone: e.eff.stone, iron: e.eff.iron },
        out: { wood: 0, stone: 0, iron: 0 },
        in: { wood: 0, stone: 0, iron: 0 }
      });
    }
    return out;
  }

  function merchCap(v) { return (v.merchAvail || 0) * Y.cfg.MERCHANT_CAP_PER; }
  function outTotal(v) { return (v.out.wood || 0) + (v.out.stone || 0) + (v.out.iron || 0); }
  function capRemain(v) { return Math.max(0, merchCap(v) - outTotal(v)); }

  function mkShipment(from, to, wood, stone, iron, tag) {
    wood = wood || 0; stone = stone || 0; iron = iron || 0;
    var total = wood + stone + iron;
    if (total <= 0) return null;
    return {
      fromId: from.id,
      fromName: from.name,
      toId: to.id,
      toName: to.name,
      toCoord: to.coord,
      wood: wood, stone: stone, iron: iron,
      total: total,
      merchants: Math.ceil(total / Y.cfg.MERCHANT_CAP_PER),
      tag: tag || ""
    };
  }

  function mergeShipments(list) {
    var m = new Map();
    for (var i = 0; i < list.length; i++) {
      var s = list[i];
      var key = s.fromId + "->" + s.toId + "@" + (s.tag || "");
      if (!m.has(key)) {
        m.set(key, {
          fromId: s.fromId, fromName: s.fromName,
          toId: s.toId, toName: s.toName, toCoord: s.toCoord,
          wood: 0, stone: 0, iron: 0, total: 0, merchants: 0,
          tag: s.tag || ""
        });
      }
      var o = m.get(key);
      o.wood += s.wood; o.stone += s.stone; o.iron += s.iron;
      o.total += s.total;
      o.merchants = Math.ceil(o.total / Y.cfg.MERCHANT_CAP_PER);
    }
    return Array.from(m.values()).filter(function (x) { return x.total > 0; });
  }

  function allocateOneResource(donors, receivers, resKey, tag, shipments) {
    donors.sort(function (a, b) { return b.amt - a.amt; });
    receivers.sort(function (a, b) { return b.amt - a.amt; });

    var di = 0, ri = 0;
    while (di < donors.length && ri < receivers.length) {
      var d = donors[di], r = receivers[ri];
      if (d.amt <= 0) { di++; continue; }
      if (r.amt <= 0) { ri++; continue; }

      var from = d.v, to = r.v;
      var space = Math.max(0, (to.capEach || 0) - (to.cur[resKey] || 0));
      if (space <= 0) { ri++; continue; }

      var canSend = Math.min(d.amt, r.amt, space, capRemain(from));
      if (canSend <= 0) { di++; continue; }

      from.cur[resKey] -= canSend; from.out[resKey] += canSend;
      to.cur[resKey] += canSend;   to.in[resKey] += canSend;

      d.amt -= canSend; r.amt -= canSend;

      var w = 0, s = 0, ir = 0;
      if (resKey === "wood") w = canSend;
      if (resKey === "stone") s = canSend;
      if (resKey === "iron") ir = canSend;

      var sh = mkShipment(from, to, w, s, ir, tag);
      if (sh) shipments.push(sh);

      if (d.amt <= 0.0001) di++;
      if (r.amt <= 0.0001) ri++;
    }
  }

  Y.compute.runTable2 = function () {
    var g = Y.state.table2;
    var mode = g.mode || "balance";

    var senderG = g.senderGroupId || 0;
    var targetG = g.targetGroupId || 0;
    var surplusG = g.surplusGroupId || 0;

    var reservePct = Y.util.clamp(g.reservePct, 0, 100);

    var all0 = getDataForGroup(0);
    var targetData = getDataForGroup(targetG);
    var senderData = getDataForGroup(senderG);
    var surplusData = getDataForGroup(surplusG);

    function effListForData(data) {
      var incMap = data.incomingRes || new Map();
      var out = [];
      for (var i = 0; i < (data.villages || []).length; i++) {
        var v = data.villages[i];
        if (!v) continue;
        var inc = incMap.has(v.id) ? incMap.get(v.id) : { wood: 0, stone: 0, iron: 0 };
        out.push(effVillage(v, inc));
      }
      return out;
    }

    var listAll = effListForData(all0);
    var listTarget = effListForData(targetData);
    var listSender = effListForData(senderData);
    var listSurplus = effListForData(surplusData);

    if (mode === "balance") {
      listSender = [];
    } else if (mode === "funnel") {
      var setTarget = new Set(listTarget.map(function (x) { return x.id; }));
      listSender = listAll.filter(function (x) { return !setTarget.has(x.id); });
    }

    // caps and totals
    var capPct = Y.cfg.TARGET_CAP_PCT;
    var targetCaps = listTarget.map(function (e) { return Math.floor((e.storage || 0) * capPct); });
    var capSum = 0; for (var c0 = 0; c0 < targetCaps.length; c0++) capSum += targetCaps[c0];

    var totTarget = sumRes(listTarget);

    // sender supply with reserve(each)
    var senderSupply = { wood: 0, stone: 0, iron: 0 };
    var keepById = new Map();
    for (var i2 = 0; i2 < listSender.length; i2++) {
      var e2 = listSender[i2];
      var keepEach = Math.floor((e2.storage || 0) * (reservePct / 100));
      keepById.set(e2.id, keepEach);
      senderSupply.wood += Math.max(0, e2.eff.wood - keepEach);
      senderSupply.stone += Math.max(0, e2.eff.stone - keepEach);
      senderSupply.iron += Math.max(0, e2.eff.iron - keepEach);
    }

    var Wmax = totTarget.wood + senderSupply.wood;
    var Cmax = totTarget.stone + senderSupply.stone;
    var Imax = totTarget.iron + senderSupply.iron;

    // Bsum per resource, bounded by target caps sum
    var Bsum = Math.min(Wmax, Cmax, Imax, capSum);
    Bsum = Math.max(0, Math.floor(Bsum));

    var bArr = waterfillSum(Bsum, targetCaps);
    var bMap = new Map();
    for (var i3 = 0; i3 < listTarget.length; i3++) bMap.set(listTarget[i3].id, bArr[i3] || 0);

    var mTarget = cloneMutable(listTarget, capPct);
    var mSender = cloneMutable(listSender, 1.0);
    var mSurplus = cloneMutable(listSurplus, Y.cfg.SURPLUS_DEST_CAP_PCT);

    var shipments = [];
    var warnings = [];

    // RESOURCE ORDER = bottleneck-first (fix)
    var order = ["wood", "stone", "iron"].map(function (k) {
      return { k: k, avail: (k === "wood" ? Wmax : (k === "stone" ? Cmax : Imax)) };
    }).sort(function (a, b) { return a.avail - b.avail; }).map(function (x) { return x.k; });

    // Phase 1: internal target balancing
    order.forEach(function (rk) {
      var donors = [];
      var receivers = [];
      for (var i = 0; i < mTarget.length; i++) {
        var v = mTarget[i];
        var b = bMap.get(v.id) || 0;
        var cur = v.cur[rk] || 0;
        var diff = cur - b;
        if (diff > 0) donors.push({ v: v, amt: diff });
        else if (diff < 0) receivers.push({ v: v, amt: -diff });
      }
      allocateOneResource(donors, receivers, rk, "TGT_INTERNAL", shipments);
    });

    // Phase 2: sender -> target fill deficits
    function senderAvail(v, rk) {
      var keep = keepById.has(v.id) ? keepById.get(v.id) : 0;
      return Math.max(0, (v.cur[rk] || 0) - keep);
    }

    order.forEach(function (rk) {
      if (mode === "balance") return;

      var receivers = [];
      for (var i = 0; i < mTarget.length; i++) {
        var tv = mTarget[i];
        var b = bMap.get(tv.id) || 0;
        var need = Math.max(0, b - (tv.cur[rk] || 0));
        if (need > 0) receivers.push({ v: tv, amt: need });
      }

      var donors = [];
      for (var j = 0; j < mSender.length; j++) {
        var sv = mSender[j];
        var a = senderAvail(sv, rk);
        if (a > 0) donors.push({ v: sv, amt: a });
      }

      allocateOneResource(donors, receivers, rk, "SND_TO_TGT", shipments);
    });

    // Remaining deficits (merchant limits or supply limits)
    ["wood", "stone", "iron"].forEach(function (rk) {
      var remNeed = 0;
      for (var i = 0; i < mTarget.length; i++) {
        var v = mTarget[i];
        var b = bMap.get(v.id) || 0;
        remNeed += Math.max(0, b - (v.cur[rk] || 0));
      }
      if (remNeed > 0) warnings.push("Target still missing " + rk + ": " + Y.util.n(remNeed));
    });

    // Phase 3: target surplus -> surplus destination
    function destSpace(v, rk) {
      var cap = Math.floor((v.storage || 0) * Y.cfg.SURPLUS_DEST_CAP_PCT);
      return Math.max(0, cap - (v.cur[rk] || 0));
    }

    // surplus send order: abundant-first (optional) — keep stable by using reverse of bottleneck
    var surplusOrder = order.slice().reverse();

    surplusOrder.forEach(function (rk) {
      var donors = [];
      for (var i = 0; i < mTarget.length; i++) {
        var v = mTarget[i];
        var b = bMap.get(v.id) || 0;
        var exc = Math.max(0, (v.cur[rk] || 0) - b);
        if (exc > 0) donors.push({ v: v, amt: exc });
      }

      var receivers = [];
      for (var j = 0; j < mSurplus.length; j++) {
        var d = mSurplus[j];
        var sp = destSpace(d, rk);
        if (sp > 0) receivers.push({ v: d, amt: sp });
      }

      allocateOneResource(donors, receivers, rk, "TGT_TO_SURPLUS", shipments);

      var leftover = 0;
      for (var z = 0; z < donors.length; z++) leftover += Math.max(0, donors[z].amt);
      if (leftover > 0) warnings.push("Surplus not routed (" + rk + "): " + Y.util.n(leftover));
    });

    shipments = mergeShipments(shipments);

    function snapshot(listEff, mutable) {
      var byId = new Map();
      for (var i = 0; i < listEff.length; i++) {
        byId.set(listEff[i].id, {
          id: listEff[i].id,
          name: listEff[i].name,
          coord: listEff[i].coord,
          points: listEff[i].points,
          storage: listEff[i].storage,
          merchAvail: listEff[i].merchAvail,
          merchTotal: listEff[i].merchTotal,
          before: { wood: listEff[i].eff.wood, stone: listEff[i].eff.stone, iron: listEff[i].eff.iron }
        });
      }
      for (var j = 0; j < mutable.length; j++) {
        var m = mutable[j];
        if (!byId.has(m.id)) continue;
        var o = byId.get(m.id);
        o.sent = { wood: m.out.wood, stone: m.out.stone, iron: m.out.iron };
        o.recv = { wood: m.in.wood, stone: m.in.stone, iron: m.in.iron };
        o.after = { wood: m.cur.wood, stone: m.cur.stone, iron: m.cur.iron };
        o.capEach = m.capEach || 0;
      }
      return Array.from(byId.values());
    }

    var out = {
      mode: mode,
      senderGroupId: senderG,
      targetGroupId: targetG,
      surplusGroupId: surplusG,
      reservePct: reservePct,
      capPct: capPct,
      Bsum: Bsum,
      targetSnap: snapshot(listTarget, mTarget),
      senderSnap: snapshot(listSender, mSender),
      surplusSnap: snapshot(listSurplus, mSurplus),
      shipments: shipments,
      warnings: warnings
    };

    Y.state.computed.t2 = out;
    return out;
  };
})();
