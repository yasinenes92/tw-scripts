(function () {
  "use strict";

  var Y = window.__YAVER_RES_ANALYZER_V1__;
  if (!Y) return;

  Y.main.loadAndRender = async function () {
    try {
      Y.ui.setMsg("Veriler yükleniyor…", "info");
      Y.ui.setProgress(0, 1, "Başlıyor");

      await Y.fetch.loadAll(function (done, total, msg) {
        Y.ui.setProgress(done, total, msg);
      });

      Y.compute.run();

      var p = Y.state.groups.parentsId;
      var c = Y.state.groups.childrenId;

      Y.ui.setMsg(
        "OK ✅ | Groups: Parents=" + p + " | Children=" + c +
          " | Incoming transports recipient’e eklendi | Overview production okundu.",
        "ok"
      );

      Y.ui.renderAll();
    } catch (e) {
      console.error("[YRA v2] loadAndRender error:", e);
      Y.ui.setMsg("Hata: " + (e && e.message ? e.message : String(e)), "err");
      if (window.UI && UI.ErrorMessage) UI.ErrorMessage("Yaver Resources Analyzer hata verdi ❌ (Console'a bak)", 6000);
    }
  };

  Y.init = function () {
    Y.ui.ensure();
    var t = setTimeout(function () { Y.main.loadAndRender(); }, 50);
    Y._timers.push(t);
  };
})();
