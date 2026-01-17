(function () {
  "use strict";

  var Y = window.__YSS_SINGLE_V2__;
  if (!Y) return;

  function getSc() { return window.ScavengeScreen; }

  function getVillageId() {
    var sc = getSc();
    if (sc && sc.village && sc.village.village_id != null) return Number(sc.village.village_id);
    try { if (window.game_data && game_data.village && game_data.village.id != null) return Number(game_data.village.id); } catch (e) {}
    return 0;
  }

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

  function clone(obj) {
    return JSON.parse(JSON.stringify(obj || {}));
  }

  Y.main = {};

  Y.main.fillGameForRow = function (row) {
    Y.dom.clearHighlights();
    Y.apply.applyUnitsToGame(row.planUnits);
    Y.dom.highlightCard(row.baseId);
  };

  Y.main.fillIndex = function (i, advanceIndex) {
    advanceIndex = (advanceIndex !== false);
    var row = Y.state && Y.state.plan ? Y.state.plan[i] : null;
    if (!row) return;

    Y.main.fillGameForRow(row);
    if (advanceIndex) Y.state.idx = i + 1;

    Y.util.msg(
      "Oyun arayüzüne <b>" + (i + 1) + ". satır</b> yazıldı: <b>" + row.name + "</b>. Bu satır için kontrol edeceğin kart: <b>" + row.name + "</b>.",
      "ok"
    );
  };

  Y.main.fillNext = function () {
    if (!Y.state || !Y.state.plan || !Y.state.plan.length) {
      Y.util.msg("Önce PLAN yap.", "err");
      return;
    }
    if (Y.state.idx >= Y.state.plan.length) {
      Y.util.msg("Plan bitti. (FILL NEXT için satır kalmadı)", "ok");
      return;
    }
    Y.main.fillIndex(Y.state.idx, true);
  };

  Y.main.clear = function () {
    Y.dom.clearHighlights();
    Y.apply.clearInputs();
    Y.state.plan = [];
    Y.state.idx = 0;
    Y.ui.renderPlan([], Y.state.targetSec || 3600);
    Y.util.msg("Temizlendi.", "ok");
  };

  Y.main.plan = function () {
    var r = Y.math.buildPlan();
    if (!r || !r.ok) {
      Y.state.plan = [];
      Y.state.idx = 0;
      Y.ui.renderPlan([], 3600);
      Y.util.msg("❌ " + (r && r.err ? r.err : "Plan üretilemedi"), "err");
      return;
    }

    Y.state.plan = r.plan;
    Y.state.idx = 0;
    Y.state.targetSec = r.targetSec;

    Y.ui.renderPlan(r.plan, r.targetSec);
    Y.util.msg(r.infoHtml, r.infoKind);

    if (r.plan.length) {
      // PLAN sonrası 1. satır otomatik oyuna yazılsın
      Y.main.fillIndex(0, true);
      Y.util.msg(
        "PLAN oluşturuldu. Oyun arayüzüne <b>1. satır</b> yazıldı: <b>" + r.plan[0].name + "</b>. START ile hepsini tek seferde otomatik başlatabilirsin.",
        "ok"
      );
    }
  };

  // ====== v6 START: click yerine API ile send_squads ======
  Y.main.startAll = function () {
    if (!Y.state || !Y.state.plan || !Y.state.plan.length) {
      Y.util.msg("Önce PLAN yap.", "err");
      return;
    }

    var vid = getVillageId();
    if (!vid) {
      Y.util.msg("Village ID bulunamadı. Sayfayı yenileyip tekrar dene.", "err");
      return;
    }

    var factor = getCarryFactor();

    // plan satırlarından request listesi üret
    var requests = [];
    var totalsByUnit = {};
    Y.sendOrderDefault.forEach(function (u) { totalsByUnit[u] = 0; });

    for (var i = 0; i < Y.state.plan.length; i++) {
      var row = Y.state.plan[i];
      if (!row) continue;

      var unit_counts = sumUnits(row.planUnits);
      if (!Object.keys(unit_counts).length) continue;

      Object.keys(unit_counts).forEach(function (u) {
        totalsByUnit[u] += unit_counts[u];
      });

      var carryBase = sumCarryBase(unit_counts);
      var carry_max = Math.floor(carryBase * factor);

      requests.push({
        village_id: Number(vid),
        option_id: Number(row.optId),
        use_premium: false,
        candidate_squad: {
          unit_counts: unit_counts,
          carry_max: carry_max
        }
      });
    }

    if (!requests.length) {
      Y.util.msg("START için geçerli satır yok. (Plan boş olabilir)", "err");
      return;
    }

    // client-side güvenlik kontrolü: toplamlar evdeki unit sayısını aşıyor mu?
    var home = {};
    Y.sendOrderDefault.forEach(function (u) { home[u] = Y.dom.getUnitCount(u); });

    var over = [];
    Y.sendOrderDefault.forEach(function (u) {
      if ((totalsByUnit[u] || 0) > (home[u] || 0)) over.push(u + ": " + totalsByUnit[u] + " > " + home[u]);
    });

    if (over.length) {
      Y.util.msg(
        "❌ START iptal: Plan toplam unit sayısı evdeki unitlerden fazla.<br><b>" + over.join(", ") + "</b>",
        "err"
      );
      return;
    }

    var btn = document.getElementById("yss_start_all_v4");
    var oldText = btn ? btn.value : "START";
    if (btn) { btn.disabled = true; btn.value = "SENDING..."; }

    Y.util.msg("⏳ Gönderiliyor... (" + requests.length + " squad)", "info");

    try {
      TribalWars.post(
        "scavenge_api",
        { ajaxaction: "send_squads" },
        { squad_requests: clone(requests) },
        function (res) {
          try {
            var ok = 0, bad = 0;
            var errs = [];

            var sr = (res && res.squad_responses) ? res.squad_responses : [];
            for (var k = 0; k < sr.length; k++) {
              if (sr[k] && sr[k].success === true) ok++;
              else {
                bad++;
                var em = (sr[k] && sr[k].error) ? String(sr[k].error) : "UNKNOWN_ERROR";
                errs.push((k + 1) + ") " + em);
              }
            }

            if (bad === 0) {
              Y.util.msg("✅ START OK. Gönderilen: <b>" + ok + "</b> squad.", "ok");
            } else {
              Y.util.msg(
                "⚠️ START tamamlandı ama hata var. OK: <b>" + ok + "</b> / ERR: <b>" + bad + "</b><br>" +
                "<div class='small'>" + errs.slice(0, 4).join("<br>") + (errs.length > 4 ? "<br>..." : "") + "</div>",
                "info"
              );
            }

            // UI güncelleme denemesi
            try {
              if (window.jQuery && window.TribalWars) window.jQuery(TribalWars).trigger("global_tick.scavenge_screen");
            } catch (e1) {}
            try {
              var sc = getSc();
              if (sc && typeof sc.updateInputs === "function") sc.updateInputs();
            } catch (e2) {}
          } finally {
            if (btn) { btn.disabled = false; btn.value = oldText; }
          }
        }
      );
    } catch (e) {
      console.error(e);
      if (btn) { btn.disabled = false; btn.value = oldText; }
      Y.util.msg("❌ START çağrısı hata verdi (Console'a bak).", "err");
    }
  };

  Y.init = async function () {
    if (!Y.util.isScavengePage()) {
      Y.util.gotoScavengePage();
      return;
    }

    try {
      await Y.util.waitFor(function () {
        return window.ScavengeScreen && window.ScavengeScreen.village && window.ScavengeScreen.village.options && window.ScavengeScreen.candidate_squad;
      }, 20000);
    } catch (e) {
      if (window.UI && UI.ErrorMessage) UI.ErrorMessage("ScavengeScreen yüklenmedi. Sayfayı yenileyip (F5) tekrar dene.", 5000);
      else alert("ScavengeScreen yüklenmedi. F5 ile yenileyip tekrar dene.");
      return;
    }

    // UI
    Y.ui.ensureUI();
    Y.ui.renderPickers();

    document.getElementById("yss_plan_v4").onclick = function () { Y.main.plan(); };
    document.getElementById("yss_fill_next_v4").onclick = function () { Y.main.fillNext(); };
    document.getElementById("yss_clear_v4").onclick = function () { Y.main.clear(); };

    // START artık API ile
    document.getElementById("yss_start_all_v4").onclick = function () { Y.main.startAll(); };

    Y.util.msg("Hazır. Süre/Unit/Kategori seç → <b>PLAN</b>. START, plan satırlarını <b>API ile</b> tek seferde başlatır.", "info");
  };
})();
