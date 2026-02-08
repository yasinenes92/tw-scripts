(function () {
  "use strict";

  var Y = window.__YAVER_SQUAD_V1__;
  if (!Y) return;

  Y.compute = {};

  Y.compute.buildStats = function (villages) {
    var now = Y.util.getServerNowSec();

    var totals = { wood: 0, stone: 0, iron: 0, total: 0, activeSquads: 0 };
    var statsById = new Map();
    var maxReturnById = new Map();

    (villages || []).forEach(function (v) {
      var vid = String(v.village_id);
      var wood = 0, stone = 0, iron = 0;
      var activeCount = 0;

      var rts = [];

      if (v.options) {
        Object.keys(v.options).forEach(function (k) {
          var opt = v.options[k];
          if (opt && opt.scavenging_squad && opt.scavenging_squad.loot_res) {
            var lr = opt.scavenging_squad.loot_res;
            wood += Number(lr.wood || 0);
            stone += Number(lr.stone || 0);
            iron += Number(lr.iron || 0);
            activeCount++;

            var rt = Number(opt.scavenging_squad.return_time || 0);
            if (rt > 0) rts.push(rt);
          }
        });
      }

      var total = wood + stone + iron;
      var maxRt = rts.length ? Math.max.apply(null, rts) : 0;
      var remain = maxRt > 0 ? Math.max(0, maxRt - now) : 0;

      statsById.set(vid, {
        village_id: vid,
        village_name: v.village_name || ("#" + vid),
        wood: wood, stone: stone, iron: iron, total: total,
        activeCount: activeCount,
        maxReturn: maxRt,
        remain: remain
      });

      if (maxRt > 0) maxReturnById.set(vid, maxRt);

      totals.wood += wood;
      totals.stone += stone;
      totals.iron += iron;
      totals.total += total;
      totals.activeSquads += activeCount;
    });

    Y.state.statsByVillageId = statsById;
    Y.state.maxReturnByVillageId = maxReturnById;
    Y.state.totals = totals;
    return { statsById: statsById, totals: totals };
  };
})();
