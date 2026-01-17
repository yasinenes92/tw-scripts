(function () {
  "use strict";

  var Y = window.__YAVER_MASS_SCAV_V1__;
  if (!Y) return;

  // v2: send_squads payload formatini oyunun SendSquadRequest.getPayload() formatina birebir uyarlar:
  // candidate_squad: { unit_counts: {...}, carry_max: ... } :contentReference[oaicite:1]{index=1}

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
      for (var k in (r.candidate_squad || {})) {
        var n = Number(r.candidate_squad[k] || 0);
        if (n > 0) {
          unit_counts[k] = n;
          sum += n;
        }
      }
      if (sum <= 0) continue;

      // carry_max: mass/single CandidateSquad.carry_max ile ayni mantikta.
      // Plan tarafinda effCarry = baseCarryUsed * carryFactor zaten hesapli.
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