(function () {
  "use strict";

  var Y = window.__YAVER_SQUAD_V1__;
  if (!Y) return;

  Y.main = Y.main || {};

  // v2 main: oyunun tablosunu değiştirmez, bizim panelde gösterir.

  Y.init = function (forceRefresh) {
    if (!Y.util.isMassPage()) {
      UI && UI.ErrorMessage && UI.ErrorMessage("Bu script Mass Scavenging sayfasında çalışır.", 3000);
      return;
    }

    // panel zaten varsa ve force yoksa tekrar render etmesin
    if (!forceRefresh && $("#yaver_squad_panel_v2").length) {
      UI && UI.ErrorMessage && UI.ErrorMessage("Rapor zaten masada Komutanım.", 2000);
      return;
    }

    try {
      var villages = Y.data.extractVillagesFromPage();   // v1 data parse
      var out = Y.compute.buildStats(villages);          // v1 compute: totals + activeCount + maxReturn map

      // UI: v2 panel
      Y.ui.renderPanel(villages, out.statsById, out.totals);

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

  // init alias (loader bunu çağırıyor)
  if (!Y.init) Y.init = Y.main.init;
})();
