(function () {
  "use strict";

  var Y = window.__YAVER_RESOURCE_ORCHESTRATOR_V1__;
  if (!Y) return;

  function getIncoming(vid) {
    return Y.state.incoming && Y.state.incoming.has(vid)
      ? Y.state.incoming.get(vid)
      : { wood: 0, stone: 0, iron: 0 };
  }

  Y.compute.run = function () {
    var rows = [];
    var totals = {
      count: 0,
      wood: 0, stone: 0, iron: 0,
      incWood: 0, incStone: 0, incIron: 0,
      total: 0,
      incTotal: 0
    };

    var q = String(Y.state.ui.search || "").trim().toLowerCase();

    for (var i = 0; i < Y.state.villages.length; i++) {
      var v = Y.state.villages[i];
      if (!v) continue;

      if (q) {
        var hay = (v.name || "").toLowerCase();
        if (hay.indexOf(q) === -1) continue;
      }

      var inc = getIncoming(v.id);

      var effWood = (v.wood || 0) + (inc.wood || 0);
      var effStone = (v.stone || 0) + (inc.stone || 0);
      var effIron = (v.iron || 0) + (inc.iron || 0);

      var incTotal = (inc.wood || 0) + (inc.stone || 0) + (inc.iron || 0);
      var effTotal = effWood + effStone + effIron;

      rows.push({
        id: v.id,
        name: v.name,
        points: v.points || 0,
        storage: v.storage || 0,
        merchAvail: v.merchAvail || 0,
        merchTotal: v.merchTotal || 0,
        base: { wood: v.wood || 0, stone: v.stone || 0, iron: v.iron || 0 },
        inc: { wood: inc.wood || 0, stone: inc.stone || 0, iron: inc.iron || 0 },
        eff: { wood: effWood, stone: effStone, iron: effIron, total: effTotal, incTotal: incTotal }
      });

      totals.count += 1;
      totals.wood += effWood;
      totals.stone += effStone;
      totals.iron += effIron;
      totals.total += effTotal;

      totals.incWood += (inc.wood || 0);
      totals.incStone += (inc.stone || 0);
      totals.incIron += (inc.iron || 0);
      totals.incTotal += incTotal;
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

    Y.state.computed = { rows: rows, totals: totals, avgs: avgs };
    return Y.state.computed;
  };
})();
