(function () {
  "use strict";

  var Y = window.__YSS_SINGLE_V2__;
  if (!Y) return;

  // v3: sadece UI id'leri degisti (v3 panel)
  Y.main = Y.main || {};

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

    // v3 UI
    Y.ui.ensureUI();
    Y.ui.renderPickers();

    // v3 button ids
    document.getElementById("yss_plan_v3").onclick = function () { Y.main.plan(); };
    document.getElementById("yss_fill_next_v3").onclick = function () { Y.main.fillNext(); };
    document.getElementById("yss_clear_v3").onclick = function () { Y.main.clear(); };

    Y.util.msg("Hazır. Süre/Unit/Kategori seç → <b>PLAN</b>. (PLAN sonrası 1. satır otomatik oyuna yazılır.)", "info");
  };
})();
