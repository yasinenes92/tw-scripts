(function () {
  "use strict";

  var Y = window.__YAVER_SQUAD_V1__;
  if (!Y) return;

  Y.main = {};

  Y.init = function (forceRefresh) {
    if (!Y.util.isMassPage()) {
      UI && UI.ErrorMessage && UI.ErrorMessage("Bu script Mass Scavenging sayfasında çalışır.", 3000);
      return;
    }

    // zaten çalışıyorsa ve force yoksa uyar
    if (!forceRefresh && $("#yaver_squad_summary_v1").length) {
      UI && UI.ErrorMessage && UI.ErrorMessage("Rapor zaten masada Komutanım.", 2000);
      return;
    }

    try {
      var villages = Y.data.extractVillagesFromPage();
      var out = Y.compute.buildStats(villages);

      Y.ui.decorate(out.statsById, out.totals);

      // countdown tick
      if (Y.state.tickTimer) clearInterval(Y.state.tickTimer);
      Y.ui.updateCountdowns();
      Y.state.tickTimer = setInterval(function () {
        Y.ui.updateCountdowns();
      }, 1000);

      UI && UI.SuccessMessage && UI.SuccessMessage("Yaver Squad raporu hazır ✅", 2000);
    } catch (e) {
      console.error("Yaver Squad error:", e);
      UI && UI.ErrorMessage && UI.ErrorMessage("Yaver Squad hesaplayamadı: " + (e.message || e), 5000);
    }
  };
})();
