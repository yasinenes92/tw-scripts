(function () {
  "use strict";

  var Y = window.__YAVER_MASS_SCAV_V1__;
  if (!Y) return;

  // v2 sender:
  // send_squads payload formatini oyunun SendSquadRequest.getPayload() formatina uyarlar:
  // candidate_squad: { unit_counts: {...}, carry_max: ... }

  Y.sender = {};

  Y.sender.buildRequests = function (planRows, usePremiumBoost) {
    usePremiumBoost = !!usePremiumBoost;

    var reqs = [];
    for (var i = 0; i < planRows.length; i++) {
      var r = planRows[i];
      if (!r || r.status !== "OK") continue;

      // unit_counts: sadece >0 olanlar
      var unit_counts = {};
      var sum = 0;
      for (var u in (r.candidate_squad || {})) {
        var n = Number(r.candidate_squad[u] || 0);
        if (n > 0) {
          unit_counts[u] = n;
          sum += n;
        }
      }
      if (sum <= 0) continue;

      // carry_max: efektif carry (unit_carry_factor dahil) olmali.
      // Plan tarafinda effCarry zaten hesapli (baseCarryUsed * carryFactor).
      var carry_max = Math.floor(Number(r.effCarry || 0));
      if (!(carry_max > 0)) continue;

      reqs.push({
        village_id: Number(r.village_id),
        option_id: Number(r.option_id),
        candidate_squad: {
          unit_counts: unit_counts,
          carry_max: carry_max
        },
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
