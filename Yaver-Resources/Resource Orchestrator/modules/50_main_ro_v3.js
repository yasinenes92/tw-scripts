(function () {
  "use strict";

  var Y = window.__YAVER_RESOURCE_ORCHESTRATOR_V2__;
  if (!Y) return;

  async function ensureGroupLoaded(gid) {
    if (gid == null) gid = 0;
    if (gid === -1) return true; // pseudo
    if (Y.state.cache.has(gid)) return true;
    await Y.fetch.loadGroup(gid, function () {});
    return true;
  }

  async function loadNeededAll(showProgress) {
    await Y.fetch.loadGroup(0, function (d, t, m) {
      if (showProgress) Y.ui.setProgress(d, t, m);
    });

    await ensureGroupLoaded(Y.state.table1.groupId || 0);

    var t2 = Y.state.table2;
    await ensureGroupLoaded(t2.targetGroupId || 0);
    await ensureGroupLoaded(t2.surplusGroupId || 0);

    if (t2.mode !== "balance" && t2.mode !== "funnel") {
      await ensureGroupLoaded(t2.senderGroupId || 0);
    } else if (t2.mode === "funnel") {
      await ensureGroupLoaded(0);
    }
  }

  Y.main.loadAndRender = async function (forceReload) {
    try {
      if (forceReload) Y.fetch.clearCache();

      Y.ui.setMsg("Veriler yükleniyor…", "info");
      Y.ui.setProgress(0, 3, "Başlıyor");

      await loadNeededAll(true);

      Y.compute.runTable1();
      Y.state.computed.t2 = null;

      Y.ui.ensure();
      Y.ui.setMsg("OK ✅ | Data loaded. Tablo 2 için “Plan” bas.", "ok");
      Y.ui.render();
    } catch (e) {
      console.error("[YRO v2] loadAndRender error:", e);
      Y.ui.setMsg("Hata: " + (e && e.message ? e.message : String(e)), "err");
      if (window.UI && UI.ErrorMessage) UI.ErrorMessage("Resource Orchestrator v2 hata verdi ❌ (Console'a bak)", 6000);
    }
  };

  Y.main.planTable2 = async function () {
    try {
      Y.ui.setMsg("Tablo 2 planlanıyor…", "info");
      await loadNeededAll(false);

      Y.compute.runTable1();
      var c2 = Y.compute.runTable2();

      Y.ui.setMsg("Plan hazır ✅ | Shipments: " + (c2.shipments ? c2.shipments.length : 0), "ok");
      Y.ui.render();
    } catch (e) {
      console.error("[YRO v2] planTable2 error:", e);
      Y.ui.setMsg("Plan hatası: " + (e && e.message ? e.message : String(e)), "err");
    }
  };

  function sleep(ms) {
    return new Promise(function (r) { setTimeout(r, ms); });
  }

  async function sendOneShipmentAjax(sh) {
    // Use map_send (proven by your console test + Shinko script)
    // Prefer target_id because we have it.
    var data = {
      target_id: sh.toId,
      wood: sh.wood || 0,
      stone: sh.stone || 0,
      iron: sh.iron || 0
    };

    return new Promise(function (resolve, reject) {
      TribalWars.post(
        "market",
        { ajaxaction: "map_send", village: sh.fromId },
        data,
        function (resp) { resolve(resp); },
        function (err) { reject(err); }
      );
    });
  }

  Y.main.executeTable2 = async function () {
    try {
      if (!Y.state.computed.t2) await Y.main.planTable2();
      var c2 = Y.state.computed.t2;

      if (!c2 || !c2.shipments || !c2.shipments.length) {
        Y.ui.setMsg("Execute: gönderilecek shipment yok.", "err");
        return;
      }

      var mode = Y.state.table2.mode || "balance";
      var modeLabel = (mode === "balance") ? "Balance Group" : (mode === "funnel" ? "Funnel / Hoard" : "Push / Feed");

      // Hide panel so confirmation is always visible
      if (Y.ui.hidePanel) Y.ui.hidePanel();

      var htmlMsg =
        "Execute <b>" + modeLabel + "</b>?<br/>" +
        "- Shipments: <b>" + c2.shipments.length + "</b><br/>" +
        "Devam edilsin mi?";

      var run = async function () {
        try {
          // show panel back for progress
          if (Y.ui.showPanel) Y.ui.showPanel();

          var list = c2.shipments.slice(0);
          if (window.UI && UI.SuccessMessage) UI.SuccessMessage("Başladı: " + list.length + " gönderim…", 1500);

          for (var i = 0; i < list.length; i++) {
            var sh = list[i];
            if ((sh.total || 0) <= 0) continue;
            if (!sh.fromId || !sh.toId) continue;

            Y.ui.setProgress(i + 1, list.length, "Sending: " + (sh.fromName || sh.fromId) + " → " + (sh.toName || sh.toId));

            try {
              var resp = await sendOneShipmentAjax(sh);
              if (window.UI && UI.SuccessMessage) UI.SuccessMessage(resp.message || "Sent ✅", 600);
            } catch (e) {
              console.error("[YRO v2 execute] shipment failed", sh, e);
              if (window.UI && UI.ErrorMessage) UI.ErrorMessage("Failed ❌ (" + (i + 1) + "/" + list.length + ")", 1400);
            }

            // pacing to reduce spam blocks
            await sleep(250);
          }

          Y.ui.setProgress(list.length, list.length, "Done");
          Y.ui.setMsg("Execute bitti ✅. (İstersen Yükle / Yenile ile güncel tabloyu çek.)", "ok");
        } catch (e2) {
          console.error("[YRO v2 execute] fatal", e2);
          Y.ui.setMsg("Execute hatası: " + (e2 && e2.message ? e2.message : String(e2)), "err");
        }
      };

      var cancel = function () {
        // show panel back if user cancels
        if (Y.ui.showPanel) Y.ui.showPanel();
      };

      // Use ConfirmationBox WITHOUT auto-cancel injection: 4th param "i" = true
      // So we control exactly 2 buttons (green + red). :contentReference[oaicite:3]{index=3}
      var actions = [
        { text: "Yes, execute", callback: run, confirm: true },
        { text: "Cancel", callback: cancel, cancel: true }
      ];

      if (window.UI && UI.ConfirmationBox) {
        UI.ConfirmationBox(htmlMsg, actions, "yro_exec_v2", true);
      } else {
        // fallback
        if (confirm("Execute " + modeLabel + "?\nShipments: " + c2.shipments.length)) await run();
        else cancel();
      }
    } catch (e) {
      console.error("[YRO v2] executeTable2 error:", e);
      if (Y.ui.showPanel) Y.ui.showPanel();
      Y.ui.setMsg("Execute hatası: " + (e && e.message ? e.message : String(e)), "err");
    }
  };

  Y.init = function () {
    Y.ui.ensure();
    var t = setTimeout(function () { Y.main.loadAndRender(false); }, 50);
    Y._timers.push(t);
  };
})();
