(function () {
  "use strict";
  var Y = window.__YAVER_RESOURCE_ORCHESTRATOR_V8__;
  if (!Y) return;

  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  async function ensureGroupsAndMembersForTables() {
    // ✅ FIX: burada progress'e dokunma (progress’i 1/3’e düşürüyordu)
    await Y.fetch.ensureGroups();

    var gids = [
      Y.state.t1.groupId || 0,
      Y.state.t2.groupId || 0,
      Y.state.t3.A.targetGroupId || 0,
      Y.state.t3.A.surplusGroupId || 0,
      Y.state.t3.B.senderGroupId || 0,
      Y.state.t3.B.targetGroupId || 0,
      Y.state.t3.B.surplusGroupId || 0,
      Y.state.t3.C.targetGroupId || 0,
      Y.state.t3.C.surplusGroupId || 0
    ];

    for (var i = 0; i < gids.length; i++) {
      var gid = gids[i];
      if (gid > 0 && !Y.state.groupMembers.has(gid)) {
        try {
          await Y.fetch.ensureGroupMembers(gid);
        } catch (e) {
          console.error("[YRO v8] group members load failed:", gid, e);
          if (window.UI && UI.ErrorMessage) UI.ErrorMessage("Group members çekilemedi: " + gid, 4000);
        }
      }
    }
  }

  function confirmTwoButtons(htmlMsg, onYes, onNo) {
    var cancel = function () { if (typeof onNo === "function") onNo(); };
    var yes = async function () { await onYes(); };

    var actions = [
      { text: "Yes, execute", callback: yes, confirm: true },
      { text: "Cancel", callback: cancel, cancel: true }
    ];

    if (window.UI && UI.ConfirmationBox) UI.ConfirmationBox(htmlMsg, actions, "yro_exec_v8", true);
    else {
      if (confirm(htmlMsg.replace(/<br\/>/g, "\n").replace(/<[^>]*>/g, ""))) yes();
      else cancel();
    }
  }

  async function sendOneShipmentAjax(sh) {
    var xy = Y.util.splitCoord(sh.toCoord);
    if (!xy) throw new Error("Bad coord: " + (sh.toCoord || "?"));

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

  function clampShipment(plan, st, reservePct) {
    var keepEach = Math.floor((st.storage || 0) * (reservePct / 100));

    var maxW = Math.max(0, (st.wood || 0) - keepEach);
    var maxS = Math.max(0, (st.stone || 0) - keepEach);
    var maxI = Math.max(0, (st.iron || 0) - keepEach);

    var w = Math.min(plan.wood || 0, maxW);
    var s = Math.min(plan.stone || 0, maxS);
    var i = Math.min(plan.iron || 0, maxI);

    var total = w + s + i;
    if (total <= 0) return null;

    var merchAvail = st.merchAvail || 0;
    if (merchAvail <= 0) return null;

    var maxTotal = merchAvail * Y.cfg.MERCHANT_CAP_PER;
    if (total > maxTotal) {
      var need = total - maxTotal;
      var take = Math.min(w, need); w -= take; need -= take;
      take = Math.min(s, need); s -= take; need -= take;
      take = Math.min(i, need); i -= take; need -= take;
      total = w + s + i;
      if (total <= 0) return null;
    }

    var merchNeed = Y.util.merchNeeded(total);
    if (merchNeed > merchAvail) return null;

    return { wood: w, stone: s, iron: i, total: total, merchants: merchNeed };
  }

  Y.main.loadAndRender = async function (forceReload) {
    try {
      if (Y.ui.setMsg) Y.ui.setMsg("Yükleniyor…", "info");
      if (Y.ui.setProgress) Y.ui.setProgress(0, 3, "Starting");

      await Y.fetch.loadAll(function (d, t, m) {
        if (Y.ui.setProgress) Y.ui.setProgress(d, t, m);
      }, !!forceReload);

      await ensureGroupsAndMembersForTables();

      if (Y.compute.runTable1) Y.compute.runTable1();
      if (Y.compute.runTable2) Y.compute.runTable2();
      // t3 planı otomatik yapma; kullanıcı Plan'a basınca hesaplanır
      // (eski davranışı bozmayalım)
      if (Y.ui.setMsg) Y.ui.setMsg("OK ✅ | Tablolar hazır.", "ok");
      if (Y.ui.render) Y.ui.render();
    } catch (e) {
      console.error("[YRO v8] loadAndRender error:", e);
      if (Y.ui.setMsg) Y.ui.setMsg("Hata: " + (e && e.message ? e.message : String(e)), "err");
    }
  };

  Y.main.planMode = async function (mode) {
    try {
      Y.state.t3.mode = mode;
      if (Y.ui.setMsg) Y.ui.setMsg("Planlanıyor… (" + mode.toUpperCase() + ")", "info");

      await ensureGroupsAndMembersForTables();

      if (Y.compute.runTable1) Y.compute.runTable1();
      if (Y.compute.runTable2) Y.compute.runTable2();

      var cfg = (mode === "balance") ? Y.state.t3.A : (mode === "push") ? Y.state.t3.B : Y.state.t3.C;
      var need = [];
      if (cfg.targetGroupId > 0) need.push(cfg.targetGroupId);
      if (cfg.surplusGroupId > 0) need.push(cfg.surplusGroupId);
      if (mode === "push" && cfg.senderGroupId > 0) need.push(cfg.senderGroupId);

      for (var i = 0; i < need.length; i++) {
        if (!Y.state.groupMembers.has(need[i])) await Y.fetch.ensureGroupMembers(need[i]);
      }

      if (Y.compute.planTable3) Y.compute.planTable3(mode);

      if (Y.ui.setMsg) Y.ui.setMsg("Plan hazır ✅ | Shipments: " + (Y.state.computed.t3 && Y.state.computed.t3.shipments ? Y.state.computed.t3.shipments.length : 0), "ok");
      if (Y.ui.render) Y.ui.render();
    } catch (e) {
      console.error("[YRO v8] planMode error:", e);
      if (Y.ui.setMsg) Y.ui.setMsg("Plan hatası: " + (e && e.message ? e.message : String(e)), "err");
    }
  };

  Y.main.executeMode = async function (mode) {
    try {
      if (!Y.state.computed.t3 || !Y.state.computed.t3.shipments || Y.state.computed.t3.mode !== mode) {
        await Y.main.planMode(mode);
      }
      var c3 = Y.state.computed.t3;
      if (!c3 || !c3.shipments || !c3.shipments.length) {
        if (Y.ui.setMsg) Y.ui.setMsg("Execute: shipment yok.", "err");
        return;
      }

      if (Y.ui.setMsg) Y.ui.setMsg("Execute preflight: taze Production çekiliyor…", "info");
      var snap = await Y.fetch.getProdSnapshotFresh();

      var reservePct = c3.cfg && c3.cfg.reservePct ? c3.cfg.reservePct : 0;

      var st = new Map();
      snap.forEach(function (v, id) {
        st.set(id, { wood: v.wood || 0, stone: v.stone || 0, iron: v.iron || 0, storage: v.storage || 0, merchAvail: v.merchAvail || 0 });
      });

      var execCount = 0;
      for (var i = 0; i < c3.shipments.length; i++) {
        var p = c3.shipments[i];
        var s = st.get(p.fromId);
        if (!s || !p.toCoord) continue;
        var cl = clampShipment(p, s, reservePct);
        if (!cl) continue;
        s.wood -= cl.wood; s.stone -= cl.stone; s.iron -= cl.iron;
        s.merchAvail -= cl.merchants; if (s.merchAvail < 0) s.merchAvail = 0;
        execCount++;
      }

      st = new Map();
      snap.forEach(function (v, id) {
        st.set(id, { wood: v.wood || 0, stone: v.stone || 0, iron: v.iron || 0, storage: v.storage || 0, merchAvail: v.merchAvail || 0 });
      });

      var htmlMsg =
        "Execute <b>" + mode.toUpperCase() + "</b>?<br/>" +
        "Plan shipments: <b>" + c3.shipments.length + "</b><br/>" +
        "Executable (after clamp): <b>" + execCount + "</b><br/>" +
        "Devam edilsin mi?";

      confirmTwoButtons(htmlMsg, async function () {
        var ok = 0, fail = 0, skip = 0;

        for (var i = 0; i < c3.shipments.length; i++) {
          var p = c3.shipments[i];
          var s = st.get(p.fromId);
          if (!s || !p.toCoord) { skip++; continue; }

          var cl = clampShipment(p, s, reservePct);
          if (!cl) { skip++; continue; }

          var sh = {
            fromId: p.fromId, fromName: p.fromName,
            toId: p.toId, toName: p.toName, toCoord: p.toCoord,
            wood: cl.wood, stone: cl.stone, iron: cl.iron,
            total: cl.total, merchants: cl.merchants
          };

          if (Y.ui.setProgress) Y.ui.setProgress(i + 1, c3.shipments.length, "Sending: " + (sh.fromName || sh.fromId) + " → " + (sh.toName || sh.toId));

          try {
            var resp = await sendOneShipmentAjax(sh);
            s.wood -= sh.wood; s.stone -= sh.stone; s.iron -= sh.iron;
            s.merchAvail -= sh.merchants; if (s.merchAvail < 0) s.merchAvail = 0;
            ok++;
            if (window.UI && UI.SuccessMessage) UI.SuccessMessage(resp.message || "Sent ✅", 600);
          } catch (e) {
            console.error("[YRO v8 execute] shipment failed", sh, e);
            fail++;
            if (window.UI && UI.ErrorMessage) UI.ErrorMessage("Failed ❌ (" + ok + " ok / " + fail + " fail)", 1400);
          }

          await sleep(Y.cfg.SEND_DELAY_MS);
        }

        if (Y.ui.setMsg) Y.ui.setMsg("Execute bitti ✅ | ok=" + ok + " | fail=" + fail + " | skip=" + skip, (fail ? "err" : "ok"));
      }, function () {});
    } catch (e) {
      console.error("[YRO v8] executeMode error:", e);
      if (Y.ui.setMsg) Y.ui.setMsg("Execute hatası: " + (e && e.message ? e.message : String(e)), "err");
    }
  };

  Y.init = function () {
    if (Y.ui.ensure) Y.ui.ensure();
    var t = setTimeout(function () { Y.main.loadAndRender(false); }, 60);
    Y._timers.push(t);
  };
})();
