(function () {
  "use strict";

  var Y = window.__YAVER_RESOURCE_ORCHESTRATOR_V5__;
  if (!Y) return;

  async function ensureGroupLoaded(gid) {
    if (gid == null) gid = 0;
    if (gid === -1) return true;
    if (Y.state.cache.has(gid)) return true;
    await Y.fetch.loadGroup(gid, function () {});
    return true;
  }

  async function loadCore(forceReload) {
    if (forceReload) Y.fetch.clearCache();

    await Y.fetch.loadGroup(0, function (d, t, m) {
      if (Y.ui.setProgress) Y.ui.setProgress(d, t, m);
    });

    await ensureGroupLoaded(Y.state.table1.groupId || 0);

    var A = Y.state.table2.A, B = Y.state.table2.B, C = Y.state.table2.C;

    await ensureGroupLoaded(A.targetGroupId || 0);
    await ensureGroupLoaded(A.surplusGroupId || 0);

    await ensureGroupLoaded(B.senderGroupId || 0);
    await ensureGroupLoaded(B.targetGroupId || 0);
    await ensureGroupLoaded(B.surplusGroupId || 0);

    await ensureGroupLoaded(C.targetGroupId || 0);
    await ensureGroupLoaded(C.surplusGroupId || 0);
  }

  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  async function sendOneShipmentAjax(sh) {
    // Use the exact style you tested successfully: target_type=coord + x,y
    var xy = Y.util.splitCoord(sh.toCoord);
    if (!xy) throw new Error("Bad coord for shipment: " + (sh.toCoord || "?"));

    var data = {
      target_type: "coord",
      x: xy.x,
      y: xy.y,
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

  function confirmTwoButtons(htmlMsg, onYes, onNo) {
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

    if (window.UI && UI.ConfirmationBox) UI.ConfirmationBox(htmlMsg, actions, "yro_exec_v5", true);
    else {
      if (confirm(htmlMsg.replace(/<br\/>/g, "\n").replace(/<[^>]*>/g, ""))) yes();
      else cancel();
    }
  }

  // Clamp a planned shipment to current state (resources + merchants)
  function clampShipmentToState(plan, st) {
    // st: { wood, stone, iron, merchantsAvail, storage, reservePct }
    var keepEach = Math.floor((st.storage || 0) * (st.reservePct || 0) / 100);

    var maxW = Math.max(0, (st.wood || 0) - keepEach);
    var maxS = Math.max(0, (st.stone || 0) - keepEach);
    var maxI = Math.max(0, (st.iron || 0) - keepEach);

    var w = Math.min(plan.wood || 0, maxW);
    var s = Math.min(plan.stone || 0, maxS);
    var i = Math.min(plan.iron || 0, maxI);

    var merchantsAvail = st.merchantsAvail || 0;
    if (merchantsAvail <= 0) return null;

    var maxTotal = merchantsAvail * Y.cfg.MERCHANT_CAP_PER;

    var total = w + s + i;
    if (total <= 0) return null;

    // If total exceeds merchant capacity, shrink with priority: iron -> stone -> wood
    if (total > maxTotal) {
      var need = total - maxTotal;
      // remove from wood first? better keep iron priority => remove wood first, then stone, then iron
      var take = Math.min(w, need); w -= take; need -= take;
      take = Math.min(s, need); s -= take; need -= take;
      take = Math.min(i, need); i -= take; need -= take;
      total = w + s + i;
      if (total <= 0) return null;
    }

    var merchUsed = Math.ceil(total / Y.cfg.MERCHANT_CAP_PER);
    if (merchUsed > merchantsAvail) {
      // final guard: reduce to exact merchantsAvail*1000 (already) but keep safe
      var cap = merchantsAvail * Y.cfg.MERCHANT_CAP_PER;
      var cur = w + s + i;
      if (cur > cap) {
        // drop wood then stone then iron
        var nd = cur - cap;
        var tk = Math.min(w, nd); w -= tk; nd -= tk;
        tk = Math.min(s, nd); s -= tk; nd -= tk;
        tk = Math.min(i, nd); i -= tk; nd -= tk;
      }
      total = w + s + i;
      if (total <= 0) return null;
      merchUsed = Math.ceil(total / Y.cfg.MERCHANT_CAP_PER);
      if (merchUsed > merchantsAvail) return null;
    }

    return { wood: w, stone: s, iron: i, total: total, merchants: merchUsed };
  }

  Y.main.loadAndRender = async function (forceReload) {
    try {
      if (Y.ui.setMsg) Y.ui.setMsg("Veriler yükleniyor…", "info");
      if (Y.ui.setProgress) Y.ui.setProgress(0, 3, "Başlıyor");

      await loadCore(forceReload);

      // Table1 compute is assumed from your existing compute module
      if (Y.compute.runTable1) Y.compute.runTable1();

      Y.state.computed.t2 = null;

      if (Y.ui.ensure) Y.ui.ensure();
      if (Y.ui.setMsg) Y.ui.setMsg("OK ✅ | v5 yüklendi. Tablo 2 için Plan/Execute kullan.", "ok");
      if (Y.ui.render) Y.ui.render();
    } catch (e) {
      console.error("[YRO v5] loadAndRender error:", e);
      if (Y.ui.setMsg) Y.ui.setMsg("Hata: " + (e && e.message ? e.message : String(e)), "err");
    }
  };

  Y.main.planMode = async function (mode) {
    try {
      Y.state.table2.mode = mode;
      if (Y.ui.setMsg) Y.ui.setMsg("Planlanıyor… (" + mode.toUpperCase() + ")", "info");

      await loadCore(false);

      if (Y.compute.runTable1) Y.compute.runTable1();
      // PlanTable2 is in your compute module (v4/v5). Keep using it.
      var c2 = (Y.compute.planTable2) ? Y.compute.planTable2(mode) : null;

      Y.state.computed.t2 = c2;

      if (Y.ui.setMsg) Y.ui.setMsg("Plan hazır ✅ | Shipments: " + (c2 && c2.shipments ? c2.shipments.length : 0), "ok");
      if (Y.ui.render) Y.ui.render();
    } catch (e) {
      console.error("[YRO v5] planMode error:", e);
      if (Y.ui.setMsg) Y.ui.setMsg("Plan hatası: " + (e && e.message ? e.message : String(e)), "err");
    }
  };

  Y.main.executeMode = async function (mode) {
    try {
      if (!Y.state.computed.t2 || !Y.state.computed.t2.shipments || Y.state.computed.t2.mode !== mode) {
        await Y.main.planMode(mode);
      }
      var c2 = Y.state.computed.t2;
      if (!c2 || !c2.shipments || !c2.shipments.length) {
        if (Y.ui.setMsg) Y.ui.setMsg("Execute: gönderilecek shipment yok.", "err");
        return;
      }

      // Fresh snapshot for BOTH resources and merchants
      if (Y.ui.setMsg) Y.ui.setMsg("Execute preflight: taze Production (resource+merchant) çekiliyor…", "info");
      var snap = await Y.fetch.getProdSnapshotFresh();

      // Build per-village live state
      var cfg = c2.cfg || {};
      var reservePct = cfg.reservePct || 0;

      var state = new Map();
      snap.forEach(function (v, id) {
        state.set(id, {
          wood: v.wood || 0,
          stone: v.stone || 0,
          iron: v.iron || 0,
          storage: v.storage || 0,
          merchantsAvail: v.merchAvail || 0,
          reservePct: reservePct
        });
      });

      // Estimate executable count by clamping (without sending)
      var execCount = 0;
      for (var i = 0; i < c2.shipments.length; i++) {
        var p = c2.shipments[i];
        var st = state.get(p.fromId);
        if (!st) continue;

        var cl = clampShipmentToState(p, st);
        if (!cl) continue;

        // simulate discrete merchant consumption
        st.wood -= cl.wood;
        st.stone -= cl.stone;
        st.iron -= cl.iron;
        st.merchantsAvail -= cl.merchants;

        if (st.merchantsAvail < 0) st.merchantsAvail = 0;
        execCount += 1;
      }

      // rebuild state again for real execute (fresh)
      state = new Map();
      snap.forEach(function (v, id) {
        state.set(id, {
          wood: v.wood || 0,
          stone: v.stone || 0,
          iron: v.iron || 0,
          storage: v.storage || 0,
          merchantsAvail: v.merchAvail || 0,
          reservePct: reservePct
        });
      });

      var htmlMsg =
        "Execute <b>" + mode.toUpperCase() + "</b>?<br/>" +
        "Plan shipments: <b>" + c2.shipments.length + "</b><br/>" +
        "Executable (after clamp): <b>" + execCount + "</b><br/>" +
        "Devam edilsin mi?";

      confirmTwoButtons(htmlMsg, async function () {
        var ok = 0, fail = 0, skip = 0;

        for (var i = 0; i < c2.shipments.length; i++) {
          var p = c2.shipments[i];
          var st = state.get(p.fromId);
          if (!st) { skip++; continue; }

          var cl = clampShipmentToState(p, st);
          if (!cl) { skip++; continue; }

          // prepare actual shipment
          var sh = {
            fromId: p.fromId,
            fromName: p.fromName,
            toId: p.toId,
            toName: p.toName,
            toCoord: p.toCoord,
            wood: cl.wood,
            stone: cl.stone,
            iron: cl.iron,
            total: cl.total,
            merchants: cl.merchants
          };

          if (Y.ui.setProgress) {
            Y.ui.setProgress(i + 1, c2.shipments.length, "Sending: " + (sh.fromName || sh.fromId) + " → " + (sh.toName || sh.toId));
          }

          try {
            var resp = await sendOneShipmentAjax(sh);

            // success => apply discrete merchant usage
            st.wood -= sh.wood;
            st.stone -= sh.stone;
            st.iron -= sh.iron;
            st.merchantsAvail -= sh.merchants;
            if (st.merchantsAvail < 0) st.merchantsAvail = 0;

            ok++;
            if (window.UI && UI.SuccessMessage) UI.SuccessMessage(resp.message || "Sent ✅", 600);
          } catch (e) {
            console.error("[YRO v5 execute] shipment failed", sh, e);
            fail++;
            if (window.UI && UI.ErrorMessage) UI.ErrorMessage("Failed ❌ (" + ok + " ok / " + fail + " fail)", 1400);

            // If a failure occurs, refresh just once: full snapshot again (safe)
            try {
              var snap2 = await Y.fetch.getProdSnapshotFresh();
              var vv = snap2.get(p.fromId);
              if (vv) {
                state.set(p.fromId, {
                  wood: vv.wood || 0,
                  stone: vv.stone || 0,
                  iron: vv.iron || 0,
                  storage: vv.storage || 0,
                  merchantsAvail: vv.merchAvail || 0,
                  reservePct: reservePct
                });
              }
            } catch (e2) {}
          }

          await sleep(Y.cfg.SEND_DELAY_MS);
        }

        if (Y.ui.setMsg) Y.ui.setMsg("Execute bitti ✅ | ok=" + ok + " | fail=" + fail + " | skip=" + skip, (fail ? "err" : "ok"));
      }, function () {});
    } catch (e) {
      console.error("[YRO v5] executeMode error:", e);
      if (Y.ui.showPanel) Y.ui.showPanel();
      if (Y.ui.setMsg) Y.ui.setMsg("Execute hatası: " + (e && e.message ? e.message : String(e)), "err");
    }
  };

  Y.init = function () {
    if (Y.ui.ensure) Y.ui.ensure();
    var t = setTimeout(function () { Y.main.loadAndRender(false); }, 50);
    Y._timers.push(t);
  };
})();
