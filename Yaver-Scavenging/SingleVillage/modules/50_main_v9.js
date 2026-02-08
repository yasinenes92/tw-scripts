(function () {
  "use strict";

  var Y = window.__YSS_SINGLE_V2__;
  if (!Y) return;

  function getSc() { return window.ScavengeScreen; }

  function getCarryFactor() {
    var sc = getSc();
    var f = (sc && sc.village && sc.village.unit_carry_factor != null) ? Number(sc.village.unit_carry_factor) : 1;
    return (isFinite(f) && f > 0) ? f : 1;
  }

  function sumUnits(planUnits) {
    var out = {};
    Y.sendOrderDefault.forEach(function (u) {
      var n = Math.floor(Number(planUnits && planUnits[u] ? planUnits[u] : 0));
      if (n > 0) out[u] = n;
    });
    return out;
  }

  function sumCarryBase(unit_counts) {
    var carry = 0;
    Object.keys(unit_counts || {}).forEach(function (u) {
      carry += (unit_counts[u] || 0) * Y.dom.getCarry(u);
    });
    return carry;
  }

  Y.main = {};

  Y.main.plan = function () {
    var r = Y.math.buildPlan();
    if (!r || !r.ok) {
      Y.state.plan = [];
      Y.ui.renderPlan([], 3600);
      Y.util.msg("❌ " + (r && r.err ? r.err : "Could not generate plan"), "err");
      return;
    }

    Y.state.plan = r.plan;
    Y.state.targetSec = r.targetSec;

    Y.ui.renderPlan(r.plan, r.targetSec);
    var extra = (r.infoHtml ? (r.infoHtml + "<br>") : "");
    Y.util.msg(extra + "✅ PLAN ready. Use START to auto-start.", r.infoKind || "ok");
  };

  // START = oyunla aynı endpoint/payload: send_squads. :contentReference[oaicite:1]{index=1}
  Y.main.startAll = function () {
    if (!Y.state || !Y.state.plan || !Y.state.plan.length) {
      Y.util.msg("Run PLAN first.", "err");
      return;
    }

    var sc = getSc();
    if (!sc || !sc.village || !sc.village.village_id) {
      Y.util.msg("ScavengeScreen is not ready. Refresh the page and try again.", "err");
      return;
    }

    var factor = getCarryFactor();
    var reqs = [];

    for (var i = 0; i < Y.state.plan.length; i++) {
      var row = Y.state.plan[i];
      var unit_counts = sumUnits(row.planUnits);
      if (!Object.keys(unit_counts).length) continue;

      var carryBase = sumCarryBase(unit_counts);
      var carry_max = Math.floor(carryBase * factor);

      reqs.push({
        village_id: Number(sc.village.village_id),
        option_id: Number(row.optId),
        use_premium: false,
        candidate_squad: { unit_counts: unit_counts, carry_max: carry_max }
      });
    }

    if (!reqs.length) {
      Y.util.msg("No valid rows to START.", "err");
      return;
    }

    var btn = document.getElementById("yss_start_all_v5");
    var old = btn ? btn.value : "START";
    if (btn) { btn.disabled = true; btn.value = "SENDING..."; }

    Y.util.msg("⏳ Sending... (" + reqs.length + " squad)", "info");

    try {
      TribalWars.post(
        "scavenge_api",
        { ajaxaction: "send_squads" },
        { squad_requests: reqs },
        function (res) {
          try {
            var sr = (res && Array.isArray(res.squad_responses)) ? res.squad_responses : [];
            var ok = 0, bad = 0, errs = [];
            for (var k = 0; k < sr.length; k++) {
              if (sr[k] && sr[k].success === true) ok++;
              else {
                bad++;
                errs.push((sr[k] && sr[k].error) ? String(sr[k].error) : "UNKNOWN_ERROR");
              }
            }

            if (bad === 0) {
              Y.util.msg("✅ START OK. Sent: <b>" + ok + "</b> squad.", "ok");
            } else {
              Y.util.msg("⚠️ START: OK <b>" + ok + "</b> / ERR <b>" + bad + "</b><br>" + errs.slice(0,3).join("<br>"), "info");
            }

            // UI refresh (best effort)
            try { sc.updateInputs && sc.updateInputs(); } catch (e1) {}
          } finally {
            if (btn) { btn.disabled = false; btn.value = old; }
          }
        }
      );
    } catch (e) {
      console.error(e);
      if (btn) { btn.disabled = false; btn.value = old; }
      Y.util.msg("❌ START failed (check Console).", "err");
    }
  };

  Y.init = async function () {
    // Scavenging sayfasında değilse main, loader tarafından açtırılacak (aşağıdaki bookmarklet).
    if (!Y.util.isScavengePage()) return;

    try {
      await Y.util.waitFor(function () {
        return window.ScavengeScreen && window.ScavengeScreen.village && window.ScavengeScreen.village.options;
      }, 20000);
    } catch (e) {
      if (window.UI && UI.ErrorMessage) UI.ErrorMessage("ScavengeScreen did not load. Press F5 and try again.", 5000);
      return;
    }

    Y.ui.ensureUI();
    Y.ui.renderPickers();

    document.getElementById("yss_plan_v5").onclick = function () { Y.main.plan(); };
    document.getElementById("yss_start_all_v5").onclick = function () { Y.main.startAll(); };

    Y.util.msg("Ready. PLAN → START.", "info");
  };
})();
