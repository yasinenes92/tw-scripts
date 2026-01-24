(function () {
  'use strict';

  var Y = window.YRO_V10;
  if (!Y) return;

  function cloneRes(r) {
    return { wood: r.wood || 0, clay: r.clay || 0, iron: r.iron || 0, total: (r.wood || 0) + (r.clay || 0) + (r.iron || 0) };
  }

  function addRes(a, b) {
    a.wood += b.wood; a.clay += b.clay; a.iron += b.iron;
    a.total = a.wood + a.clay + a.iron;
    return a;
  }

  function subRes(a, b) {
    a.wood -= b.wood; a.clay -= b.clay; a.iron -= b.iron;
    a.total = a.wood + a.clay + a.iron;
    return a;
  }

  function max0(n) { return Math.max(0, Y.safeInt(n, 0)); }

  function computeIncomingForGroup(rows, incomingMap) {
    // rows: [{id, ...}] for current group
    // incomingMap: toVid -> {wood,clay,iron,total, byFrom:{fromVid:{...}}}
    var set = {};
    rows.forEach(function (v) { set[String(v.id)] = true; });

    var incomingAllByVillage = {};      // includes internal
    var incomingExternalByVillage = {}; // excludes internal (from within group)

    rows.forEach(function (v) {
      var vid = String(v.id);
      var it = incomingMap && incomingMap[v.id] ? incomingMap[v.id] : null;
      if (!it) {
        incomingAllByVillage[v.id] = { wood: 0, clay: 0, iron: 0, total: 0 };
        incomingExternalByVillage[v.id] = { wood: 0, clay: 0, iron: 0, total: 0 };
        return;
      }

      // all incoming
      incomingAllByVillage[v.id] = { wood: it.wood || 0, clay: it.clay || 0, iron: it.iron || 0, total: it.total || 0 };

      // external: subtract internal sources that are in set
      var ext = { wood: it.wood || 0, clay: it.clay || 0, iron: it.iron || 0, total: it.total || 0 };
      if (it.byFrom) {
        for (var fk in it.byFrom) {
          if (!Object.prototype.hasOwnProperty.call(it.byFrom, fk)) continue;
          if (fk !== '0' && set[fk]) {
            // internal transfer => remove from external
            ext.wood -= it.byFrom[fk].wood || 0;
            ext.clay -= it.byFrom[fk].clay || 0;
            ext.iron -= it.byFrom[fk].iron || 0;
            ext.total -= it.byFrom[fk].total || 0;
          }
        }
      }
      ext.wood = max0(ext.wood); ext.clay = max0(ext.clay); ext.iron = max0(ext.iron);
      ext.total = ext.wood + ext.clay + ext.iron;

      incomingExternalByVillage[v.id] = ext;
    });

    return { all: incomingAllByVillage, external: incomingExternalByVillage };
  }

  // ---- Shipment planning primitives ----
  // We use merchants capacity: freeMerch * 1000
  function merchCapacity(v) {
    var free = (v.merch && v.merch.free != null) ? v.merch.free : 0;
    return max0(free) * 1000;
  }

  function reserveAmount(v, reservePct) {
    // reservePct is percent of storage, for EACH resource
    var storage = max0(v.storage || 0);
    var keep = Math.floor(storage * (reservePct / 100));
    return { wood: keep, clay: keep, iron: keep };
  }

  function capAmount(v, capPct) {
    var storage = max0(v.storage || 0);
    return Math.floor(storage * (capPct / 100));
  }

  function desiredTriBalance(v, capPct, incomingOptional) {
    // base resources + optional incoming estimate
    var r = cloneRes(v.res || { wood: 0, clay: 0, iron: 0 });
    if (incomingOptional) addRes(r, incomingOptional);

    var cap = capAmount(v, capPct);
    var sum = r.wood + r.clay + r.iron;
    var target = Math.floor(sum / 3);
    target = Math.min(target, cap);

    return { each: target, cap: cap, sum: sum, base: r };
  }

  function pushShipmentsGreedy(donors, receivers, resourceKey, shipments, tag) {
    // donors: [{v, surplus, capLeftMerch}] receivers: [{v, need}]
    var di = 0;
    var ri = 0;

    while (di < donors.length && ri < receivers.length) {
      var d = donors[di];
      var r = receivers[ri];

      if (d.surplus <= 0 || d.capLeftMerch <= 0) { di++; continue; }
      if (r.need <= 0) { ri++; continue; }

      // one unit is 1 resource
      var take = Math.min(d.surplus, r.need, d.capLeftMerch);
      if (take <= 0) { if (d.surplus <= 0) di++; if (r.need <= 0) ri++; continue; }

      // find existing shipment from d->r to pack multiple resources together
      var sh = null;
      for (var i = 0; i < shipments.length; i++) {
        if (shipments[i].from === d.v.id && shipments[i].to === r.v.id && shipments[i].tag === tag) { sh = shipments[i]; break; }
      }
      if (!sh) {
        sh = { from: d.v.id, to: r.v.id, wood: 0, clay: 0, iron: 0, total: 0, merch: 0, tag: tag };
        shipments.push(sh);
      }

      sh[resourceKey] += take;
      sh.total += take;

      d.surplus -= take;
      r.need -= take;
      d.capLeftMerch -= take;

      // update merch (ceil total/1000) for display
      sh.merch = Math.ceil(sh.total / 1000);

      if (d.surplus <= 0 || d.capLeftMerch <= 0) di++;
      if (r.need <= 0) ri++;
    }
  }

  function computePlan_ModeA(targetRows, surplusRows, incomingAllByVillage, capPct, surplusCapPct) {
    // Balance target group internally (tri-balance), then route leftover surplus to surplus group
    var shipments = [];

    // Prepare working copies
    var t = targetRows.map(function (v) {
      var base = cloneRes(v.res);
      var inc = incomingAllByVillage && incomingAllByVillage[v.id] ? cloneRes(incomingAllByVillage[v.id]) : { wood: 0, clay: 0, iron: 0, total: 0 };
      addRes(base, inc); // estimate available after incoming arrives
      return {
        v: v,
        before: cloneRes(base),
        work: cloneRes(base),
        desired: desiredTriBalance(v, capPct, inc).each,
        cap: desiredTriBalance(v, capPct, inc).cap,
        merchCap: merchCapacity(v),
      };
    });

    // internal tri-balance: for each resource, donors vs receivers
    ['wood', 'clay', 'iron'].forEach(function (rk) {
      var donors = [];
      var receivers = [];

      t.forEach(function (x) {
        var cur = x.work[rk];
        var want = x.desired;
        if (cur > want) donors.push({ v: x.v, surplus: cur - want, capLeftMerch: x.merchCap });
        if (cur < want) receivers.push({ v: x.v, need: want - cur });
      });

      // donors sorted by most surplus
      donors.sort(function (a, b) { return b.surplus - a.surplus; });
      receivers.sort(function (a, b) { return b.need - a.need; });

      pushShipmentsGreedy(donors, receivers, rk, shipments, 'BAL');

      // apply to work values
      shipments.forEach(function (sh) {
        if (sh.tag !== 'BAL') return;
        // find from/to in t
        var from = t.find(function (z) { return z.v.id === sh.from; });
        var to = t.find(function (z) { return z.v.id === sh.to; });
        if (!from || !to) return;
        if (sh[rk] > 0) {
          from.work[rk] -= sh[rk];
          to.work[rk] += sh[rk];
        }
      });
    });

    // After balance, route leftover surpluses from target villages to surplus group villages up to surplus cap
    if (surplusRows && surplusRows.length) {
      // build surplus receivers with cap
      var s = surplusRows.map(function (v) {
        var cap = capAmount(v, surplusCapPct);
        var base = cloneRes(v.res);
        return { v: v, cap: cap, work: cloneRes(base) };
      });

      ['wood', 'clay', 'iron'].forEach(function (rk) {
        var donors2 = [];
        t.forEach(function (x) {
          var extra = Math.max(0, x.work[rk] - x.desired); // anything above desired can be moved out
          if (extra > 0) donors2.push({ v: x.v, surplus: extra, capLeftMerch: merchCapacity(x.v) });
        });
        donors2.sort(function (a, b) { return b.surplus - a.surplus; });

        var receivers2 = [];
        s.forEach(function (x) {
          var need = Math.max(0, x.cap - x.work[rk]);
          if (need > 0) receivers2.push({ v: x.v, need: need });
        });
        receivers2.sort(function (a, b) { return b.need - a.need; });

        pushShipmentsGreedy(donors2, receivers2, rk, shipments, 'SUR');

        shipments.forEach(function (sh) {
          if (sh.tag !== 'SUR') return;
          var from = t.find(function (z) { return z.v.id === sh.from; });
          var to = s.find(function (z) { return z.v.id === sh.to; });
          if (!from || !to) return;
          if (sh[rk] > 0) {
            from.work[rk] -= sh[rk];
            to.work[rk] += sh[rk];
          }
        });
      });
    }

    return shipments;
  }

  function computePlan_ModeB(senderRows, targetRows, surplusRows, incomingAllByVillage, capPct, surplusCapPct, reservePct) {
    var shipments = [];

    var targets = targetRows.map(function (v) {
      var base = cloneRes(v.res);
      var inc = incomingAllByVillage && incomingAllByVillage[v.id] ? cloneRes(incomingAllByVillage[v.id]) : { wood: 0, clay: 0, iron: 0, total: 0 };
      addRes(base, inc);
      var d = desiredTriBalance(v, capPct, inc);
      return { v: v, work: cloneRes(base), desired: d.each, cap: d.cap };
    });

    var senders = senderRows.map(function (v) {
      var base = cloneRes(v.res);
      var inc = incomingAllByVillage && incomingAllByVillage[v.id] ? cloneRes(incomingAllByVillage[v.id]) : { wood: 0, clay: 0, iron: 0, total: 0 };
      addRes(base, inc);
      var keep = reserveAmount(v, reservePct);
      return {
        v: v,
        work: cloneRes(base),
        keep: keep,
        merchCap: merchCapacity(v),
      };
    });

    // Fill target deficits from senders
    ['wood', 'clay', 'iron'].forEach(function (rk) {
      var receivers = [];
      targets.forEach(function (t) {
        var need = Math.max(0, t.desired - t.work[rk]);
        if (need > 0) receivers.push({ v: t.v, need: need });
      });
      receivers.sort(function (a, b) { return b.need - a.need; });

      var donors = [];
      senders.forEach(function (s) {
        var avail = Math.max(0, s.work[rk] - s.keep[rk]);
        if (avail > 0) donors.push({ v: s.v, surplus: avail, capLeftMerch: s.merchCap });
      });
      donors.sort(function (a, b) { return b.surplus - a.surplus; });

      pushShipmentsGreedy(donors, receivers, rk, shipments, 'PUSH');

      shipments.forEach(function (sh) {
        if (sh.tag !== 'PUSH') return;
        var from = senders.find(function (z) { return z.v.id === sh.from; });
        var to = targets.find(function (z) { return z.v.id === sh.to; });
        if (!from || !to) return;
        if (sh[rk] > 0) {
          from.work[rk] -= sh[rk];
          to.work[rk] += sh[rk];
        }
      });
    });

    // Remaining sender surplus goes to surplus group
    if (surplusRows && surplusRows.length) {
      var s2 = surplusRows.map(function (v) {
        return { v: v, cap: capAmount(v, surplusCapPct), work: cloneRes(v.res) };
      });

      ['wood', 'clay', 'iron'].forEach(function (rk) {
        var receivers2 = [];
        s2.forEach(function (x) {
          var need = Math.max(0, x.cap - x.work[rk]);
          if (need > 0) receivers2.push({ v: x.v, need: need });
        });
        receivers2.sort(function (a, b) { return b.need - a.need; });

        var donors2 = [];
        senders.forEach(function (s) {
          var avail = Math.max(0, s.work[rk] - s.keep[rk]);
          if (avail > 0) donors2.push({ v: s.v, surplus: avail, capLeftMerch: merchCapacity(s.v) });
        });
        donors2.sort(function (a, b) { return b.surplus - a.surplus; });

        pushShipmentsGreedy(donors2, receivers2, rk, shipments, 'SUR');

        shipments.forEach(function (sh) {
          if (sh.tag !== 'SUR') return;
          var from = senders.find(function (z) { return z.v.id === sh.from; });
          var to = s2.find(function (z) { return z.v.id === sh.to; });
          if (!from || !to) return;
          if (sh[rk] > 0) {
            from.work[rk] -= sh[rk];
            to.work[rk] += sh[rk];
          }
        });
      });
    }

    return shipments;
  }

  function computePlan_ModeC(allRows, targetRows, surplusRows, capPct, surplusCapPct, reservePct) {
    // Funnel: all except target -> target, up to cap; leftover to surplus
    var shipments = [];

    var targetSet = {};
    targetRows.forEach(function (v) { targetSet[String(v.id)] = true; });

    var targets = targetRows.map(function (v) {
      return { v: v, cap: capAmount(v, capPct), work: cloneRes(v.res) };
    });

    var senders = allRows
      .filter(function (v) { return !targetSet[String(v.id)]; })
      .map(function (v) {
        var keep = reserveAmount(v, reservePct);
        return { v: v, work: cloneRes(v.res), keep: keep, merchCap: merchCapacity(v) };
      });

    ['wood', 'clay', 'iron'].forEach(function (rk) {
      var receivers = [];
      targets.forEach(function (t) {
        var need = Math.max(0, t.cap - t.work[rk]);
        if (need > 0) receivers.push({ v: t.v, need: need });
      });
      receivers.sort(function (a, b) { return b.need - a.need; });

      var donors = [];
      senders.forEach(function (s) {
        var avail = Math.max(0, s.work[rk] - s.keep[rk]);
        if (avail > 0) donors.push({ v: s.v, surplus: avail, capLeftMerch: s.merchCap });
      });
      donors.sort(function (a, b) { return b.surplus - a.surplus; });

      pushShipmentsGreedy(donors, receivers, rk, shipments, 'FUN');

      shipments.forEach(function (sh) {
        if (sh.tag !== 'FUN') return;
        var from = senders.find(function (z) { return z.v.id === sh.from; });
        var to = targets.find(function (z) { return z.v.id === sh.to; });
        if (!from || !to) return;
        if (sh[rk] > 0) {
          from.work[rk] -= sh[rk];
          to.work[rk] += sh[rk];
        }
      });
    });

    // leftover to surplus
    if (surplusRows && surplusRows.length) {
      var s2 = surplusRows.map(function (v) {
        return { v: v, cap: capAmount(v, surplusCapPct), work: cloneRes(v.res) };
      });

      ['wood', 'clay', 'iron'].forEach(function (rk) {
        var receivers2 = [];
        s2.forEach(function (x) {
          var need = Math.max(0, x.cap - x.work[rk]);
          if (need > 0) receivers2.push({ v: x.v, need: need });
        });
        receivers2.sort(function (a, b) { return b.need - a.need; });

        var donors2 = [];
        senders.forEach(function (s) {
          var avail = Math.max(0, s.work[rk] - s.keep[rk]);
          if (avail > 0) donors2.push({ v: s.v, surplus: avail, capLeftMerch: merchCapacity(s.v) });
        });
        donors2.sort(function (a, b) { return b.surplus - a.surplus; });

        pushShipmentsGreedy(donors2, receivers2, rk, shipments, 'SUR');
      });
    }

    return shipments;
  }

  function summarizePlan(shipments, allById) {
    // build per-village sent/recv for display tables
    var sent = {}, recv = {};
    shipments.forEach(function (sh) {
      if (!sent[sh.from]) sent[sh.from] = { wood: 0, clay: 0, iron: 0, total: 0 };
      if (!recv[sh.to]) recv[sh.to] = { wood: 0, clay: 0, iron: 0, total: 0 };

      sent[sh.from].wood += sh.wood; sent[sh.from].clay += sh.clay; sent[sh.from].iron += sh.iron;
      sent[sh.from].total += sh.total;

      recv[sh.to].wood += sh.wood; recv[sh.to].clay += sh.clay; recv[sh.to].iron += sh.iron;
      recv[sh.to].total += sh.total;
    });

    function rowFor(vid) {
      var v = allById[vid];
      if (!v) return null;
      var before = cloneRes(v.res || { wood: 0, clay: 0, iron: 0 });
      var s = sent[vid] ? cloneRes(sent[vid]) : { wood: 0, clay: 0, iron: 0, total: 0 };
      var r = recv[vid] ? cloneRes(recv[vid]) : { wood: 0, clay: 0, iron: 0, total: 0 };
      var after = cloneRes(before);
      subRes(after, s);
      addRes(after, r);
      return {
        id: vid,
        name: v.name,
        storage: v.storage || 0,
        before: before,
        sent: s,
        recv: r,
        after: after,
      };
    }

    return { sent: sent, recv: recv, rowFor: rowFor };
  }

  Y.compute = {
    computeIncomingForGroup: computeIncomingForGroup,
    computePlan_ModeA: computePlan_ModeA,
    computePlan_ModeB: computePlan_ModeB,
    computePlan_ModeC: computePlan_ModeC,
    summarizePlan: summarizePlan,
  };

  Y.log('compute module loaded ✅');
})();
