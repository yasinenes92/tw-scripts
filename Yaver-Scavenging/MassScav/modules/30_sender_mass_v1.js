(function () {
  "use strict";

  var Y = window.__YAVER_MASS_SCAV_V1__;
  if (!Y) return;

  Y.sender = {};

  Y.sender.buildRequests = function (planRows, usePremiumBoost) {
    usePremiumBoost = !!usePremiumBoost;

    var reqs = [];
    for (var i = 0; i < planRows.length; i++) {
      var r = planRows[i];
      if (!r || r.status !== "OK") continue;

      // candidate_squad must have something >0
      var sum = 0;
      for (var k in r.candidate_squad) sum += Number(r.candidate_squad[k] || 0);
      if (sum <= 0) continue;

      reqs.push({
        village_id: Number(r.village_id),
        option_id: Number(r.option_id),
        candidate_squad: r.candidate_squad,
        use_premium: usePremiumBoost
      });
    }
    return reqs;
  };

  Y.sender.chunk = function (arr, size) {
    size = size || 200;
    var out = [];
    for (var i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
  };

  Y.sender.sendBatch = function (batch) {
    return new Promise(function (resolve, reject) {
      try {
        TribalWars.post(
          "scavenge_api",
          { ajaxaction: "send_squads" },
          { squad_requests: batch },
          function (res) { resolve(res); }
        );
      } catch (e) {
        reject(e);
      }
    });
  };
})();
