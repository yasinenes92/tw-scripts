(function () {
  "use strict";

  var Y = window.__YAVER_RES_TROOPS_V1__;
  if (!Y) return;

  Y.main = {};

  async function loadAll() {
    if (Y.state.isLoading) return;
    Y.state.isLoading = true;

    try {
      Y.ui.setMsg("⏳ Köy listesi alınıyor (am_troops)...", "info");
      Y.ui.setProgress(0, 0);

      var villages = await Y.data.loadVillageList();
      Y.state.villages = villages;

      Y.state.perVillage.clear();
      Y.state.progress.total = villages.length;
      Y.state.progress.done = 0;

      Y.ui.setMsg("⏳ Recruit sayfaları çekiliyor (her köy: screen=train)...", "info");

      for (var i = 0; i < villages.length; i++) {
        var v = villages[i];

        // küçük gecikme: spam gibi görünmesin
        if (i > 0) await Y.util.sleep(150);

        try {
          var pv = await Y.recruit.fetchVillageRecruit(v.id, v.name);
          Y.state.perVillage.set(String(v.id), pv);
        } catch (e) {
          console.warn("Village recruit fetch failed:", v.id, e);
        }

        Y.state.progress.done++;
        Y.ui.setProgress(Y.state.progress.done, Y.state.progress.total);
      }

      // compute totals + render
      Y.state.totals = Y.compute.buildTotals();

      Y.ui.renderPerVillage();
      Y.ui.renderTotals();

      Y.ui.setMsg("✅ Hazır. (Kaynak: am_troops köy listesi + train sayfası troop total + build_time)", "ok");
    } catch (e) {
      console.error(e);
      Y.ui.setMsg("❌ Hata: " + (e.message || e), "err");
    } finally {
      Y.state.isLoading = false;
      Y.ui.setProgress(0, 0);
    }
  }

  Y.init = function () {
    Y.ui.ensure();

    Y.ui.bindButtons(
      function () { loadAll(); },
      function () { loadAll(); }
    );

    // otomatik yükleme (tek tıkta gelsin)
    loadAll();
  };

})();
