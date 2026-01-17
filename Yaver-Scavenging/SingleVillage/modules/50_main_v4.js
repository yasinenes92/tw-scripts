(function () {
  "use strict";

  var Y = window.__YSS_SINGLE_V2__;
  if (!Y) return;

  // v4: v2'nin tüm main mantığı (plan/fill/clear) + v3 UI id'lerine bağlanır.
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
      "Oyun arayüzüne <b>" + (i + 1) + ". satır</b> yazıldı: <b>" + row.name + "</b>. Karttaki <b>Start</b> butonuna sen basacaksın.",
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
      // PLAN basınca 1. satır otomatik oyuna yazılsın
      Y.main.fillIndex(0, true);
      Y.util.msg(
        "PLAN oluşturuldu. Oyun arayüzüne <b>1. satır</b> yazıldı: <b>" + r.plan[0].name + "</b>. Diğerleri için tablodan Fill veya FILL NEXT.",
        "ok"
      );
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

    // v3 UI kur
    Y.ui.ensureUI();
    Y.ui.renderPickers();

    // v3 buton id'leri
    document.getElementById("yss_plan_v3").onclick = function () { Y.main.plan(); };
    document.getElementById("yss_fill_next_v3").onclick = function () { Y.main.fillNext(); };
    document.getElementById("yss_clear_v3").onclick = function () { Y.main.clear(); };

    Y.util.msg("Hazır. Süre/Unit/Kategori seç → <b>PLAN</b>. (PLAN sonrası 1. satır otomatik oyuna yazılır.)", "info");
  };
})();
