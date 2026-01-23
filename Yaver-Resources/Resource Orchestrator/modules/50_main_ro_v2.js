(function () {
  "use strict";

  var Y = window.__YAVER_RESOURCE_ORCHESTRATOR_V1__;
  if (!Y) return;

  function csrf() {
    // game pages expose csrf_token variable; also game_data.csrf exists
    if (typeof window.csrf_token === "string" && window.csrf_token) return window.csrf_token;
    if (window.game_data && game_data.csrf) return game_data.csrf;
    return null;
  }

  async function ensureGroupLoaded(gid) {
    if (gid == null) gid = 0;
    if (gid === -1) return true; // pseudo: computed from group 0
    if (Y.state.cache.has(gid)) return true;
    await Y.fetch.loadGroup(gid, function () {});
    return true;
  }

  async function loadNeededAll(showProgress) {
    // ensure groups list exists
    await Y.fetch.loadGroup(0, function (d, t, m) {
      if (showProgress) Y.ui.setProgress(d, t, m);
    });

    // Table1 group
    await ensureGroupLoaded(Y.state.table1.groupId || 0);

    // Table2 groups
    var t2 = Y.state.table2;
    if (t2.mode !== "balance") {
      if (t2.mode !== "funnel") {
        await ensureGroupLoaded(t2.senderGroupId || 0);
      } else {
        // need group 0 and target
        await ensureGroupLoaded(0);
        await ensureGroupLoaded(t2.targetGroupId || 0);
      }
    }
    await ensureGroupLoaded(t2.targetGroupId || 0);
    await ensureGroupLoaded(t2.surplusGroupId || 0);
  }

  Y.main.loadAndRender = async function (forceReload) {
    try {
      if (forceReload) Y.fetch.clearCache();

      Y.ui.setMsg("Veriler yükleniyor…", "info");
      Y.ui.setProgress(0, 3, "Başlıyor");

      await loadNeededAll(true);

      // compute Table1
      Y.compute.runTable1();

      // compute Table2 only if already planned before, otherwise leave null
      // (user will press Plan; but initial plan is helpful)
      Y.state.computed.t2 = null;

      Y.ui.ensure();
      Y.ui.setMsg("OK ✅ | Data loaded. Tablo 1 hazır. Tablo 2 için “Plan” bas.", "ok");
      Y.ui.render();
    } catch (e) {
      console.error("[YRO v1] loadAndRender error:", e);
      Y.ui.setMsg("Hata: " + (e && e.message ? e.message : String(e)), "err");
      if (window.UI && UI.ErrorMessage) UI.ErrorMessage("Resource Orchestrator hata verdi ❌ (Console'a bak)", 6000);
    }
  };

  Y.main.planTable2 = async function () {
    try {
      Y.ui.setMsg("Tablo 2 planlanıyor…", "info");
      await loadNeededAll(false);

      // compute both (Table1 stays stable but recalculates fast)
      Y.compute.runTable1();
      var c2 = Y.compute.runTable2();

      Y.ui.setMsg("Plan hazır ✅ | Shipments: " + (c2.shipments ? c2.shipments.length : 0), "ok");
      Y.ui.render();
    } catch (e) {
      console.error("[YRO v1] planTable2 error:", e);
      Y.ui.setMsg("Plan hatası: " + (e && e.message ? e.message : String(e)), "err");
    }
  };

  async function sendOneShipmentAjax(sh) {
    var token = csrf();
    if (!token) throw new Error("csrf_token not found.");

    if (!sh || !sh.fromId || !sh.toCoord) throw new Error("Bad shipment.");
    var xy = Y.util.splitCoord(sh.toCoord);
    if (!xy) throw new Error("Bad coord: " + sh.toCoord);

    var data = {
      target_type: "coord",
      x: xy.x,
      y: xy.y,
      wood: sh.wood || 0,
      stone: sh.stone || 0,
      iron: sh.iron || 0
    };

    return new Promise(function (resolve, reject) {
      try {
        var options = {
          village: sh.fromId,
          ajaxaction: "call",
          h: token
        };

        TribalWars.post(
          "market",
          options,
          data,
          function (resp) {
            // resp may contain success string
            resolve(resp);
          },
          function (err) {
            reject(err);
          }
        );
      } catch (e) {
        reject(e);
      }
    });
  }

  Y.main.executeTable2 = async function () {
    try {
      if (!Y.state.computed.t2) {
        await Y.main.planTable2();
      }
      var c2 = Y.state.computed.t2;
      if (!c2 || !c2.shipments || !c2.shipments.length) {
        Y.ui.setMsg("Execute: gönderilecek shipment yok.", "err");
        return;
      }

      var mode = Y.state.table2.mode || "push";
      var modeLabel = (mode === "balance") ? "Balance Group" : (mode === "funnel" ? "Funnel / Hoard" : "Push / Feed");

      var msg =
        "Execute " + modeLabel + "?\n" +
        "- Shipments: " + c2.shipments.length + "\n" +
        "Devam edilsin mi?";
      var actions = [
        {
          text: "Yes, execute",
          callback: async function () {
            try {
              var list = c2.shipments.slice(0);

              // disable execute button in UI quickly
              if (window.UI && UI.SuccessMessage) UI.SuccessMessage("Başladı: " + list.length + " gönderim…", 1500);

              for (var i = 0; i < list.length; i++) {
                var sh = list[i];

                // skip zero
                if ((sh.total || 0) <= 0) continue;

                Y.ui.setProgress(i + 1, list.length, "Sending: " + (sh.fromName || sh.fromId) + " → " + (sh.toName || sh.toId));
                try {
                  var resp = await sendOneShipmentAjax(sh);
                  if (window.UI && UI.SuccessMessage) UI.SuccessMessage("Sent ✅ (" + (i + 1) + "/" + list.length + ")", 600);
                } catch (e) {
                  console.error("[YRO execute] shipment failed", sh, e);
                  if (window.UI && UI.ErrorMessage) UI.ErrorMessage("Failed ❌ (" + (i + 1) + "/" + list.length + ")", 1200);
                }

                // pacing to avoid spam-block
                await new Promise(function (r) { setTimeout(r, 350); });
              }

              Y.ui.setProgress(list.length, list.length, "Done");
              Y.ui.setMsg("Execute bitti ✅. (Not: gerçek oyun durumu değişmiş olabilir; istersen Yenile.)", "ok");
            } catch (e2) {
              console.error("[YRO execute] fatal", e2);
              Y.ui.setMsg("Execute hatası: " + (e2 && e2.message ? e2.message : String(e2)), "err");
            }
          },
          confirm: true
        },
        {
          text: "Cancel",
          callback: function () {},
          confirm: false
        }
      ];

      if (window.UI && UI.ConfirmationBox) {
        UI.ConfirmationBox(msg.replace(/\n/g, "<br/>"), actions);
      } else {
        if (confirm(msg)) {
          await actions[0].callback();
        }
      }
    } catch (e) {
      console.error("[YRO v1] executeTable2 error:", e);
      Y.ui.setMsg("Execute hatası: " + (e && e.message ? e.message : String(e)), "err");
    }
  };

  Y.init = function () {
    Y.ui.ensure();
    var t = setTimeout(function () {
      Y.main.loadAndRender(false);
    }, 50);
    Y._timers.push(t);
  };
})();
