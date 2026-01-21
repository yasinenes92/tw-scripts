(function () {
  "use strict";

  var Y = window.__YAVER_RES_ANALYZER_V1__;
  if (!Y) return;

  function getIncoming(vid) {
    return Y.state.incoming && Y.state.incoming.has(vid)
      ? Y.state.incoming.get(vid)
      : { wood: 0, stone: 0, iron: 0 };
  }

  // v2.1 patch: group totals should not treat internal (same-group) transfers as "new incoming".
  // We still use ALL incoming for per-village effective resources, but the "(+ incoming)" shown at group level
  // counts ONLY incoming whose sender is NOT in the same group set.
  function getIncomingEdges() {
    return (Y.state && Array.isArray(Y.state.incomingEdges)) ? Y.state.incomingEdges : null;
  }

  function incomingExternalForGroup(vid, setIds) {
    var edges = getIncomingEdges();
    // Fallback: if we don't have edge-level info, keep old behavior (all incoming).
    if (!edges) return getIncoming(vid);

    var out = { wood: 0, stone: 0, iron: 0 };
    for (var i = 0; i < edges.length; i++) {
      var e = edges[i];
      if (!e || e.toId !== vid) continue;

      // external if: no fromId (System/Premium/other-player) OR sender not in this group set
      if (!e.fromId || !setIds || !setIds.has(e.fromId)) {
        out.wood += (e.wood || 0);
        out.stone += (e.stone || 0);
        out.iron += (e.iron || 0);
      }
    }
    return out;
  }

  function effVillage(v) {
    var inc = getIncoming(v.id);
    return {
      id: v.id,
      name: v.name,
      group: v.group,
      points: v.points,
      storage: v.storage,
      merchAvail: v.merchAvail,
      merchTotal: v.merchTotal,
      base: { wood: v.wood, stone: v.stone, iron: v.iron },
      inc: { wood: inc.wood || 0, stone: inc.stone || 0, iron: inc.iron || 0 },
      eff: {
        wood: (v.wood || 0) + (inc.wood || 0),
        stone: (v.stone || 0) + (inc.stone || 0),
        iron: (v.iron || 0) + (inc.iron || 0)
      },
      prodH: v.prodH || { wood: 0, stone: 0, iron: 0 }
    };
  }

  function sumGroup(setIds) {
    var out = {
      count: 0,
      wood: 0, stone: 0, iron: 0,
      incWood: 0, incStone: 0, incIron: 0,
      total: 0,
      merchAvail: 0, merchTotal: 0
    };
    setIds.forEach(function (vid) {
      var v = Y.state.villages.get(vid);
      if (!v) return;
      var e = effVillage(v);
      out.count += 1;
      out.wood += e.eff.wood; out.stone += e.eff.stone; out.iron += e.eff.iron;

      // (+ incoming) = sadece grup dışından gelenler
      var incExt = incomingExternalForGroup(v.id, setIds);
      out.incWood += incExt.wood; out.incStone += incExt.stone; out.incIron += incExt.iron;

      out.merchAvail += (v.merchAvail || 0);
      out.merchTotal += (v.merchTotal || 0);
    });
    out.total = out.wood + out.stone + out.iron;
    return out;
  }

  function sumAll() {
    var ids = new Set();
    Y.state.villages.forEach(function (v) { ids.add(v.id); });
    return sumGroup(ids);
  }

  function avgFromSum(s) {
    var c = s.count || 1;
    return {
      count: s.count,
      wood: Math.floor(s.wood / c),
      stone: Math.floor(s.stone / c),
      iron: Math.floor(s.iron / c),
      total: Math.floor((s.wood + s.stone + s.iron) / c)
    };
  }

  function marketAdvice(totalWood, totalStone, totalIron) {
    var S = totalWood + totalStone + totalIron;
    var target = Math.floor(S / 3);

    var dW = totalWood - target;
    var dS = totalStone - target;
    var dI = totalIron - target;

    function mkMoves() {
      var need = {
        wood: Math.max(0, -dW),
        stone: Math.max(0, -dS),
        iron: Math.max(0, -dI)
      };
      var exc = {
        wood: Math.max(0, dW),
        stone: Math.max(0, dS),
        iron: Math.max(0, dI)
      };

      var moves = [];

      function move(from, to) {
        var x = Math.min(exc[from], need[to]);
        if (x > 0) {
          moves.push({ from: from, to: to, amount: x });
          exc[from] -= x;
          need[to] -= x;
        }
      }

      move("stone", "wood"); move("stone", "iron");
      move("iron", "wood"); move("iron", "stone");
      move("wood", "stone"); move("wood", "iron");

      return { target: target, moves: moves };
    }

    return {
      sum: { wood: totalWood, stone: totalStone, iron: totalIron, total: S },
      target: target,
      diff: { wood: dW, stone: dS, iron: dI },
      plan: mkMoves()
    };
  }

  // --- Table 3: Daily production per village ---
  function buildProdTable() {
    var arr = [];
    var totals = { wood: 0, stone: 0, iron: 0, total: 0 };

    Y.state.villages.forEach(function (v) {
      var e = effVillage(v);
      var h = e.prodH || { wood: 0, stone: 0, iron: 0 };
      var d = {
        wood: (h.wood || 0) * 24,
        stone: (h.stone || 0) * 24,
        iron: (h.iron || 0) * 24
      };
      d.total = d.wood + d.stone + d.iron;

      totals.wood += d.wood;
      totals.stone += d.stone;
      totals.iron += d.iron;
      totals.total += d.total;

      arr.push({
        id: e.id,
        name: e.name,
        group: e.group,
        points: e.points || 0,
        perHour: { wood: h.wood || 0, stone: h.stone || 0, iron: h.iron || 0 },
        perDay: d
      });
    });

    // stable sort: group then name
    arr.sort(function (a, b) {
      var ga = a.group || "";
      var gb = b.group || "";
      if (ga !== gb) return ga.localeCompare(gb);
      return String(a.name || "").localeCompare(String(b.name || ""));
    });

    return { rows: arr, totals: totals };
  }

  // --- Optimizer (same as v1) ---
  function buildTransferPlan() {
    var parents = [];
    var children = [];

    Y.state.membership.parents.forEach(function (vid) {
      var v = Y.state.villages.get(vid);
      if (!v) return;
      parents.push(effVillage(v));
    });

    Y.state.membership.children.forEach(function (vid) {
      var v = Y.state.villages.get(vid);
      if (!v) return;
      children.push(effVillage(v));
    });

    var reservePct = Y.cfg.RESERVE_PCT;
    var capPct = Y.cfg.CHILD_CAP_PCT;

    var donors = parents.map(function (p) {
      var r = Math.floor((p.storage || 0) * reservePct);
      var sup = {
        wood: Math.max(0, (p.eff.wood || 0) - r),
        stone: Math.max(0, (p.eff.stone || 0) - r),
        iron: Math.max(0, (p.eff.iron || 0) - r)
      };
      var capGoods = (p.merchAvail || 0) * Y.cfg.MERCHANT_CAP_PER;

      var supSum = sup.wood + sup.stone + sup.iron;
      if (supSum > capGoods && capGoods > 0) {
        var k = capGoods / supSum;
        sup.wood = Math.floor(sup.wood * k);
        sup.stone = Math.floor(sup.stone * k);
        sup.iron = Math.floor(sup.iron * k);
      }
      if (capGoods <= 0) {
        sup.wood = 0; sup.stone = 0; sup.iron = 0;
      }

      return {
        id: p.id,
        name: p.name,
        points: p.points,
        storage: p.storage,
        merchAvail: p.merchAvail,
        merchTotal: p.merchTotal,
        reserveEach: r,
        supply: sup,
        capGoods: capGoods,
        sent: { wood: 0, stone: 0, iron: 0 },
        sentTotal: 0
      };
    });

    var recvs = children.map(function (c) {
      var cap = Math.floor((c.storage || 0) * capPct);
      return {
        id: c.id,
        name: c.name,
        points: c.points,
        storage: c.storage,
        capEach: cap,
        before: { wood: c.eff.wood, stone: c.eff.stone, iron: c.eff.iron },
        after: { wood: c.eff.wood, stone: c.eff.stone, iron: c.eff.iron },
        need: {
          wood: Math.max(0, cap - (c.eff.wood || 0)),
          stone: Math.max(0, cap - (c.eff.stone || 0)),
          iron: Math.max(0, cap - (c.eff.iron || 0))
        },
        recv: { wood: 0, stone: 0, iron: 0 }
      };
    });

    function pickDonor(resKey) {
      var best = null;
      var bestVal = 0;
      for (var i = 0; i < donors.length; i++) {
        var d = donors[i];
        if (d.capGoods <= d.sentTotal) continue;
        var v = d.supply[resKey] || 0;
        if (v > bestVal) { bestVal = v; best = d; }
      }
      return best;
    }

    var low = recvs.filter(function (c) { return (c.points || 0) <= Y.cfg.LOW_POINTS_THRESHOLD; });
    var high = recvs.filter(function (c) { return (c.points || 0) > Y.cfg.LOW_POINTS_THRESHOLD; });

    low.sort(function (a, b) { return (a.points || 0) - (b.points || 0); });
    high.sort(function (a, b) { return (a.points || 0) - (b.points || 0); });

    function anySupply() {
      for (var i = 0; i < donors.length; i++) {
        if ((donors[i].supply.wood + donors[i].supply.stone + donors[i].supply.iron) > 0) return true;
      }
      return false;
    }

    function anyNeed(list) {
      for (var i = 0; i < list.length; i++) {
        var n = list[i].need;
        if ((n.wood + n.stone + n.iron) > 0) return true;
      }
      return false;
    }

    function minResourceKey(c) {
      var w = c.after.wood, s = c.after.stone, ir = c.after.iron;
      if (w <= s && w <= ir) return "wood";
      if (s <= w && s <= ir) return "stone";
      return "iron";
    }

    function allocate(list) {
      while (anySupply() && anyNeed(list)) {
        var bestC = null;
        var bestMin = null;

        for (var i = 0; i < list.length; i++) {
          var c = list[i];
          if ((c.need.wood + c.need.stone + c.need.iron) <= 0) continue;
          var mn = Math.min(c.after.wood, c.after.stone, c.after.iron);
          if (bestC === null || mn < bestMin) {
            bestC = c; bestMin = mn;
          }
        }
        if (!bestC) break;

        var rk = minResourceKey(bestC);
        if (bestC.need[rk] <= 0) {
          rk = bestC.need.wood > 0 ? "wood" : (bestC.need.stone > 0 ? "stone" : "iron");
        }

        var donor = pickDonor(rk);
        if (!donor) {
          var alt = ["wood", "stone", "iron"];
          var found = null;
          for (var a = 0; a < alt.length; a++) {
            donor = pickDonor(alt[a]);
            if (donor && bestC.need[alt[a]] > 0) { rk = alt[a]; found = donor; break; }
          }
          donor = found;
        }
        if (!donor) break;

        var chunk = 1000;
        var canSend = Math.min(
          donor.supply[rk] || 0,
          bestC.need[rk] || 0,
          donor.capGoods - donor.sentTotal,
          chunk
        );
        if (canSend <= 0) {
          donor.supply[rk] = 0;
          continue;
        }

        donor.supply[rk] -= canSend;
        donor.sent[rk] += canSend;
        donor.sentTotal += canSend;

        bestC.need[rk] -= canSend;
        bestC.recv[rk] += canSend;
        bestC.after[rk] += canSend;
      }
    }

    allocate(low);
    allocate(high);

    var parentsSent = { wood: 0, stone: 0, iron: 0, total: 0 };
    donors.forEach(function (d) {
      parentsSent.wood += d.sent.wood;
      parentsSent.stone += d.sent.stone;
      parentsSent.iron += d.sent.iron;
    });
    parentsSent.total = parentsSent.wood + parentsSent.stone + parentsSent.iron;

    donors.forEach(function (d) {
      d.merchantsNeeded = Math.ceil((d.sentTotal || 0) / Y.cfg.MERCHANT_CAP_PER);
      d.merchantsOk = d.merchantsNeeded <= (d.merchAvail || 0);
    });

    return {
      params: { reservePct: reservePct, capPct: capPct, lowPts: Y.cfg.LOW_POINTS_THRESHOLD },
      donors: donors,
      recvs: recvs,
      totals: { parentsSent: parentsSent }
    };
  }

  Y.compute.run = function () {
    var parentsSum = sumGroup(Y.state.membership.parents);
    var childrenSum = sumGroup(Y.state.membership.children);
    var allSum = sumAll();

    var parentsAvg = avgFromSum(parentsSum);
    var childrenAvg = avgFromSum(childrenSum);
    var allAvg = avgFromSum(allSum);

    var adviceAll = marketAdvice(allSum.wood, allSum.stone, allSum.iron);
    var adviceParents = marketAdvice(parentsSum.wood, parentsSum.stone, parentsSum.iron);

    var prod = buildProdTable();
    var plan = buildTransferPlan();

    Y.state.computed = {
      sums: { parents: parentsSum, children: childrenSum, all: allSum },
      avgs: { parents: parentsAvg, children: childrenAvg, all: allAvg },
      advice: { all: adviceAll, parents: adviceParents },
      prod: prod,
      plan: plan
    };

    return Y.state.computed;
  };
})();
