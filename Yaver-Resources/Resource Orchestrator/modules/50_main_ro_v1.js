(function () {
  "use strict";

  var Y = window.__YAVER_RESOURCE_ORCHESTRATOR_V1__;
  if (!Y) return;

  Y.main.loadAndRender = async function () {
    try {
      Y.ui.setMsg("Veriler yükleniyor…", "info");
      Y.ui.setProgress(0, 3, "Başlıyor");

      var gid = Y.state.ui.groupId || 0;

      await Y.fetch.load(gid, function (done, total, msg) {
        Y.ui.setProgress(done, total, msg);
      });

      // compute + render
      Y.compute.run();

      // refresh group name (in case groups were newly detected)
      var gname = "All villages";
      for (var i = 0; i < (Y.state.groups || []).length; i++) {
        if (Y.state.groups[i].id === gid) { gname = Y.state.groups[i].name; break; }
      }
      Y.state.ui.groupName = gname;

      Y.ui.ensure();

      Y.ui.setMsg(
        "OK ✅ | Group=" + gname +
          " | Villages=" + (Y.state.villages ? Y.state.villages.length : 0) +
          " | Incoming map ready",
        "ok"
      );

      Y.ui.render();
    } catch (e) {
      console.error("[YRO v1] loadAndRender error:", e);
      Y.ui.setMsg("Hata: " + (e && e.message ? e.message : String(e)), "err");
      if (window.UI && UI.ErrorMessage) UI.ErrorMessage("Resource Orchestrator hata verdi ❌ (Console'a bak)", 6000);
    }
  };

  Y.init = function () {
    Y.ui.ensure();
    var t = setTimeout(function () { Y.main.loadAndRender(); }, 50);
    Y._timers.push(t);
  };
})();
