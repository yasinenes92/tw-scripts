(function () {
  "use strict";

  var Y = window.__YAVER_RESOURCE_ORCHESTRATOR_V4__;
  if (!Y) return;

  async function ensureGroupLoaded(gid) {
    if (gid == null) gid = 0;
    if (gid === -1) return true; // pseudo
    if (Y.state.cache.has(gid)) return true;
    await Y.fetch.loadGroup(gid, function () {});
    return true;
  }

  async function loadCore(showProgress, forceReload) {
    if (forceReload) Y.fetch.clearCache();

    await Y.fetch.loadGroup(0, function (d, t, m) {
      if (showProgress && Y.ui.setProgress) Y.ui.setProgress(d, t, m);
    });

    await ensureGroupLoaded(Y.state.table1.groupId || 0);

    // ensure groups for all modes that might be used
    var A = Y.state.table2.A;
    var B = Y.state.table2.B;
    var C = Y.state.table2.C;

    await ensureGroupLoaded(A.targetGroupId || 0);
    await ensureGroupLoaded(A.surplusGroupId || 0);

    await ensureGroupLoaded(B.senderGroupId || 0);
    await ensureGroupLoaded(B.targetGroupId || 0);
    await ensureGroupLoaded(B.surplusGroupId || 0);

    await ensureGroupLoaded(C.targetGroupId || 0);
    await ensureGroupLoaded(C.surplusGroupId || 0);
  }

  function sleep(ms) {
    return new Promise(function (r) { setTimeout(r, ms); });
  }

  async function sendOneShipmentAjax(sh) {
    // map_send supports cross-village sending
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

  // split a shipment into a smaller chunk (priority iron -> stone -> wood)
  function takeChunk(sh, maxTotal) {
    maxTotal = Math.max(0, Math.floor(maxTotal));
    if (maxTotal <= 0 || sh.total <= 0) return null;

    var chunk = {
      fromId: sh.fromId,
      fromName: sh.fromName,
      toId: sh.toId,
      toName: sh.toName,
      toCoord: sh.toCoord,
      wood: 0,
      stone: 0,
      iron: 0,
      tag: sh.tag || ""
    };

    var remaining = Math.min(sh.total, maxTotal);

    var t = Math.min(sh.iron, remaining);
    chunk.iron = t; sh.iron -= t; sh.total -= t; remaining -= t;

    t = Math.min(sh.stone, remaining);
    chunk.stone = t; sh.stone -= t; sh.total -= t; remaining -= t;

    t = Math.min(sh.wood, remaining);
    chunk.wood = t; sh.wood -= t; sh.total -= t; remaining -= t;

    chunk.total = chunk.wood + chunk.stone + chunk.iron;
    chunk.merchants = Math.ceil(chunk.total / Y.cfg.MERCHANT_CAP_PER);

    if (chunk.total <= 0) return null;
    return chunk;
  }

  // Build executable list with fresh merchant caps
  async function buildExecutableShipments(planShipments) {
    // Fresh merchant map from production
    var merchMap = await Y.fetch.getMerchantsMapFresh();

    // remainingCap per fromId (in resources)
    var capLeft = new Map();
    merchMap.forEach(function (v, id) {
      capLeft.set(id, (v.avail || 0) * Y.cfg.MERCHANT_CAP_PER);
    });

    var execList = [];

    // copy shipments so we can mutate
    var work = planShipments.map(function (s) {
      return {
        fromId: s.fromId,
        fromName: s.fromName,
        toId: s.toId,
        toName: s.toName,
        toCoord: s.toCoord,
        wood: s.wood || 0,
        stone: s.stone || 0,
        iron: s.iron || 0,
        total: s.total || ((s.wood || 0) + (s.stone || 0) + (s.iron || 0)),
        merchants: s.merchants || Math.ceil((s.total || 0) / Y.cfg.MERCHANT_CAP_PER),
        tag: s.tag || ""
      };
    });

    for (var i = 0; i < work.length; i++) {
      var sh = work[i];
      if (!sh.fromId || !sh.toId) continue;
      if (sh.total <= 0) continue;

      var left = capLeft.has(sh.fromId) ? capLeft.get(sh.fromId) : 0;
      if (left <= 0) {
        // no merchants available at execute-time
        continue;
      }

      // split as needed
      while (sh.total > 0) {
        left = capLeft.has(sh.fromId) ? capLeft.get(sh.fromId) : 0;
        if (left < Y.cfg.MERCHANT_CAP_PER) break; // less than 1 merchant worth

        var chunk = takeChunk(sh, left);
        if (!chunk) break;

        execList.push(chunk);
        capLeft.set(sh.fromId, left - chunk.total);
      }
    }

    return { execList: execList, merchMap: merchMap };
  }

  function confirmTwoButtons(htmlMsg, onYes, onNo) {
    // Hide panel so box is visible
    if (Y.ui.hidePanel) Y.ui.hidePanel();

    var cancel = function () {
      if (Y.ui.showPanel) Y.ui.showPanel();
      if (typeof onNo === "function") onNo();
    };

    var yes = async function () {
      if (Y.ui.showPanel) Y.ui.showPanel();
      await onYes();
    };

    var actions = [
      { text: "Yes, execute", callback: yes, confirm: true },
      { text: "Cancel", callback: cancel, cancel: true }
    ];

    // 4th param true => do NOT auto-inject extra cancel
    if (window.UI && UI.ConfirmationBox) UI.ConfirmationBox(htmlMsg, actions, "yro_exec_v4", true);
    else {
      if (confirm(htmlMsg.replace(/<br\/>/g, "\n").replace(/<[^>]*>/g, ""))) yes();
      else cancel();
    }
  }

  Y.main.loadAndRender = async function (forceReload) {
    try {
      if (Y.ui.setMsg) Y.ui.setMsg("Veriler yükleniyor…", "info");
      if (Y.ui.setProgress) Y.ui.setProgress(0, 3, "Başlıyor");

      await loadCore(true, forceReload);

      Y.compute.runTable1();
      Y.state.computed.t2 = null;

      Y.ui.ensure();
      if (Y.ui.setMsg) Y.ui.setMsg("OK ✅ | Tablo 1 hazır. Tablo 2 için mod satırından Plan bas.", "ok");
      Y.ui.render();
    } catch (e) {
      console.error("[YRO v4] loadAndRender error:", e);
      if (Y.ui.setMsg) Y.ui.setMsg("Hata: " + (e && e.message ? e.message : String(e)), "err");
      if (window.UI && UI.ErrorMessage) UI.ErrorMessage("Resource Orchestrator v4 hata verdi ❌ (Console'a bak)", 6000);
    }
  };

  Y.main.planMode = async function (mode) {
    try {
      Y.state.table2.mode = mode;
      if (Y.ui.setMsg) Y.ui.setMsg("Planlanıyor… (" + mode.toUpperCase() + ")", "info");

      await loadCore(false, false);

      Y.compute.runTable1();
      var c2 = Y.compute.planTable2(mode);

      if (Y.ui.setMsg) Y.ui.setMsg("Plan hazır ✅ | Shipments: " + (c2.shipments ? c2.shipments.length : 0), "ok");
      Y.ui.render();
    } catch (e) {
      console.error("[YRO v4] planMode error:", e);
      if (Y.ui.setMsg) Y.ui.setMsg("Plan hatası: " + (e && e.message ? e.message : String(e)), "err");
    }
  };

  Y.main.executeMode = async function (mode) {
    try {
      // ensure plan exists for this mode
      if (!Y.state.computed.t2 || Y.state.computed.t2.mode !== mode) {
        await Y.main.planMode(mode);
      }
      var c2 = Y.state.computed.t2;
      if (!c2 || !c2.shipments || !c2.shipments.length) {
        if (Y.ui.setMsg) Y.ui.setMsg("Execute: gönderilecek shipment yok.", "err");
        return;
      }

      // Build executable list based on CURRENT merchants
      if (Y.ui.setMsg) Y.ui.setMsg("Execute preflight: canlı tüccar kontrolü…", "info");
      var pre = await buildExecutableShipments(c2.shipments);
      var execList = pre.execList;

      var htmlMsg =
        "Execute <b>" + mode.toUpperCase() + "</b>?<br/>" +
        "Plan shipments: <b>" + c2.shipments.length + "</b><br/>" +
        "Executable (current merchants): <b>" + execList.length + "</b><br/>" +
        "Devam edilsin mi?";

      confirmTwoButtons(htmlMsg, async function () {
        try {
          if (!execList.length) {
            if (Y.ui.setMsg) Y.ui.setMsg("Execute: hiç gönderim yapılamadı (tüccar yok).", "err");
            return;
          }

          if (window.UI && UI.SuccessMessage) UI.SuccessMessage("Başladı: " + execList.length + " gönderim…", 1500);

          for (var i = 0; i < execList.length; i++) {
            var sh = execList[i];
            if (!sh.fromId || !sh.toId || !sh.total) continue;

            if (Y.ui.setProgress) {
              Y.ui.setProgress(i + 1, execList.length, "Sending: " + (sh.fromName || sh.fromId) + " → " + (sh.toName || sh.toId));
            }

            try {
              var resp = await sendOneShipmentAjax(sh);
              if (window.UI && UI.SuccessMessage) UI.SuccessMessage(resp.message || "Sent ✅", 600);
            } catch (e) {
              // If still fails due to merchants, skip (preflight should prevent most cases)
              console.error("[YRO v4 execute] shipment failed", sh, e);
              if (window.UI && UI.ErrorMessage) UI.ErrorMessage("Failed ❌ (" + (i + 1) + "/" + execList.length + ")", 1400);
            }

            await sleep(Y.cfg.SEND_DELAY_MS);
          }

          if (Y.ui.setProgress) Y.ui.setProgress(execList.length, execList.length, "Done");
          if (Y.ui.setMsg) Y.ui.setMsg("Execute bitti ✅ (İstersen Yükle / Yenile ile güncel tabloyu çek.)", "ok");
        } catch (e2) {
          console.error("[YRO v4 execute] fatal", e2);
          if (Y.ui.setMsg) Y.ui.setMsg("Execute hatası: " + (e2 && e2.message ? e2.message : String(e2)), "err");
        }
      }, function () {});
    } catch (e) {
      console.error("[YRO v4] executeMode error:", e);
      if (Y.ui.showPanel) Y.ui.showPanel();
      if (Y.ui.setMsg) Y.ui.setMsg("Execute hatası: " + (e && e.message ? e.message : String(e)), "err");
    }
  };

  Y.init = function () {
    Y.ui.ensure();
    var t = setTimeout(function () { Y.main.loadAndRender(false); }, 50);
    Y._timers.push(t);
  };
})();
