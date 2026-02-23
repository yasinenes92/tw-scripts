(function () {
  'use strict';

  var Y = window.YRO_V18;
  if (!Y) return;

  function groupNameById(gid) {
    gid = Y.safeInt(gid, 0);
    var g = (Y.state.groups.list || []).find(function (x) { return Y.safeInt(x.id, 0) === gid; }, function () { if (panel) panel.style.display = prevDisplay || ''; });
    return g ? g.name : String(gid);
  }

  async function resolveSelection(gid, customKey, forceGroupFetch) {
    gid = Y.safeInt(gid, 0);
    if (gid === -1) return (Y.state.custom[customKey] || []).slice();
    return await Y.fetch.fetchVillageIdsForGroup(gid, !!forceGroupFetch);
  }

  function outgoingByVillageFromMap(outMap) {
    var out = {};
    Object.keys(outMap || {}).forEach(function (fromId) {
      var f = outMap[fromId];
      if (!f) return;
      out[Y.safeInt(fromId, 0)] = { wood: f.wood || 0, clay: f.clay || 0, iron: f.iron || 0, total: f.total || 0 };
    });
    return out;
  }

  async function loadTables(forceGroupFetch) {
    var st = Y.state;

    var t1gid = Y.safeInt(st.groups.sel1, 0);
    var t1ids = await resolveSelection(t1gid, 't1', forceGroupFetch);
    var t1title = Y.qs('#yro_t1_title_v18');
    if (t1title) t1title.textContent = groupNameById(t1gid);

    var t2gid = Y.safeInt(st.groups.sel2, 0);
    var t2ids = await resolveSelection(t2gid, 't2', forceGroupFetch);
    var t2title = Y.qs('#yro_t2_title_v18');
    if (t2title) t2title.textContent = groupNameById(t2gid);

    var incomingMap = st.cache.incomingMap || {};
    var outMap = st.cache.outgoingMap || {};
    var inc = Y.compute.computeIncomingForSet(t2ids, incomingMap);
    var outByVid = outgoingByVillageFromMap(outMap);

    Y.ui.renderTable1(t1ids);
    Y.ui.renderTable2(t2ids, inc.allByVid, inc.externalByVid, outByVid);
  }

  function openPicker(key) {
    var snaps = Y.runtime.snapshotsById || {};
    var ids = Object.keys(snaps).map(function (k) { return Y.safeInt(k, 0); }).filter(Boolean);

    if (!ids.length) {
      Y.ui.setMsg('You must run Full Scan before using the Picker.', '#b00');
      return;
    }

    var candidates = ids.map(function (vid) {
      var s = snaps[vid];
      return { id: vid, name: s.name || ('Village ' + vid), coord: s.coord || '', storage: s.storage || 0 };
    });

    var current = (Y.state.custom[key] || []).slice();
    Y.ui.buildPickerModal(candidates, current, function (selectedIds) {
      Y.state.custom[key] = selectedIds;
      Y.saveState();
      Y.ui.setMsg('Custom selection kaydedildi: ' + key + ' (' + selectedIds.length + ' villages)', '#0a6');
      loadTables(false);
    });
  }

  function splitCoord(coord) {
    var m = String(coord || '').match(/(\d+)\|(\d+)/);
    if (!m) return null;
    return { x: Y.safeInt(m[1], 0), y: Y.safeInt(m[2], 0) };
  }

  function sendOneShipmentAjax(s) {
    var toSnap = Y.runtime.snapshotsById[s.to];
    if (!toSnap || !toSnap.coord) throw new Error('toCoord missing for ' + s.to);
    var xy = splitCoord(toSnap.coord);
    if (!xy) throw new Error('Bad coord: ' + toSnap.coord);

    var data = {
      target_type: 'coord',
      x: xy.x,
      y: xy.y,
      wood: s.wood || 0,
      stone: s.clay || 0,
      iron: s.iron || 0,
    };

    return new Promise(function (resolve, reject) {
      try {
        TribalWars.post('market', { ajaxaction: 'map_send', village: s.from }, data,
          function (resp) { resolve(resp); },
          function (e) { reject(e); }
        );
      } catch (e2) { reject(e2); }
    });
  }

  function confirmTwoButtons(htmlMsg, onYes, onCancel) {
    var actions = [
      { text: 'Execute', callback: onYes, confirm: true },
      { text: 'Cancel', callback: function () { try { if (onCancel) onCancel(); } catch (e) {} }, cancel: true },
    ];
    if (window.UI && UI.ConfirmationBox) {
      UI.ConfirmationBox(htmlMsg, actions, 'yro_exec_v18', true);
    } else {
      var plain = String(htmlMsg)
        .replace(/<br\s*\/?\s*>/gi, '\n')
        .replace(/<[^>]*>/g, '');
      var ok = confirm(plain);
      if (ok) onYes();
      else if (onCancel) onCancel();
    }
  }



  function executeTabs() {
    var plan = Y.runtime.plan;
    var shipments = (plan && plan.shipments) ? plan.shipments : [];
    if (!shipments.length) { Y.ui.setMsg('No plan to execute.', '#b00'); return; }

    var limit = 15;
    var n = Math.min(limit, shipments.length);

    for (var i = 0; i < n; i++) {
      var s = shipments[i];
      var url =
        '/game.php?village=' + s.from +
        '&screen=market&mode=send' +
        '&target=' + s.to +
        '&wood=' + s.wood +
        '&stone=' + s.clay +
        '&iron=' + s.iron;
      window.open(url, '_blank');
    }

    Y.ui.setMsg('Execute (Tabs): ' + n + ' tabs opened. (Total ' + shipments.length + ')', '#b35b00');
  }

  async function executePlan() {
    var plan = Y.runtime.plan;
    var shipments = (plan && plan.shipments) ? plan.shipments : [];
    if (!shipments.length) { Y.ui.setMsg('No plan to execute.', '#b00'); return; }

    var panel = Y.qs('#' + Y.cfg.PANEL_ID);
    var prevDisplay = panel ? panel.style.display : '';
    if (panel) panel.style.display = 'none';

    confirmTwoButtons('Execute?<br/>Shipments: <b>' + shipments.length + '</b>', async function () {
      var ok = 0, fail = 0;

      for (var i = 0; i < shipments.length; i++) {
        var s = shipments[i];
        Y.ui.setProgress(i + 1, shipments.length, 'Sending ' + s.from + ' → ' + s.to);

        try {
          var resp = await sendOneShipmentAjax(s);
          ok++;
          if (window.UI && UI.SuccessMessage) UI.SuccessMessage((resp && resp.message) ? resp.message : 'Sent ✅', 600);
        } catch (e) {
          fail++;
          if (window.UI && UI.ErrorMessage) UI.ErrorMessage('Failed ❌ (ok ' + ok + ' / fail ' + fail + ')', 1200);
        }
        await Y.sleep(Y.cfg.SEND_DELAY_MS);
      }

      if (panel) panel.style.display = prevDisplay || '';
      Y.ui.setMsg('Execution finished ✅ | ok=' + ok + ' | fail=' + fail, fail ? '#b00' : '#0a6');
    }, function () { if (panel) panel.style.display = prevDisplay || ''; });
  }

  async function planFromMode(mode) {
    mode = String(mode || '').toLowerCase();
    var st = Y.state;

    if (!st.cache || !Object.keys(st.cache.villages || {}).length) {
      Y.ui.setMsg('You must run Full Scan first (Load / Refresh).', '#b00');
      return;
    }

    function getSelValue(id) { var el = Y.qs(id); return el ? Y.safeInt(el.value, 0) : 0; }
    function getNumValue(id, d) { var el = Y.qs(id); return el ? Y.safeInt(el.value, d) : d; }

    var cap, scap, reserve;
    var targetGid = 0, senderGid = 0, surplusGid = 0;

    var targetIds = [], senderIds = [], surplusIds = [];
    var allIds = Object.keys(Y.runtime.snapshotsById || {}).map(function (k) { return Y.safeInt(k, 0); }).filter(Boolean);

    if (mode === 'balance') {
      targetGid = getSelValue('#yro_A_target_v18');
      surplusGid = getSelValue('#yro_A_surplus_v18');
      cap = getNumValue('#yro_A_cap_v18', 80);
      scap = getNumValue('#yro_A_scap_v18', 95);
      var ironDelta = getNumValue('#yro_A_iron_v18', 0);
      reserve = 0;

      targetIds = await resolveSelection(targetGid, 'A_target', true);
      surplusIds = await resolveSelection(surplusGid, 'A_surplus', true);

      var r = Y.compute.planBalance(targetIds, surplusIds, Y.runtime.snapshotsById, st.cache.incomingMap, cap, scap, ironDelta);

      Y.runtime.plan = {
        mode: mode,
        shipments: r.shipments,
        meta: { cap: cap, scap: scap, reserve: reserve, ironDelta: ironDelta, targetGid: targetGid, senderGid: 0, surplusGid: surplusGid },
        targetIds: r.targetIds,
        surplusIds: r.surplusIds,
        states: r.states,
        targetSummary: Y.compute.summarize(r.states, r.targetIds),
        surplusSummary: Y.compute.summarize(r.states, r.surplusIds),
      };

    } else if (mode === 'push') {
      senderGid = getSelValue('#yro_B_sender_v18');
      targetGid = getSelValue('#yro_B_target_v18');
      surplusGid = getSelValue('#yro_B_surplus_v18');
      reserve = getNumValue('#yro_B_reserve_v18', 1);
      cap = 0; // auto
      scap = getNumValue('#yro_B_scap_v18', 95);
      var tolPct = getNumValue('#yro_B_tol_v18', 5);
      var ironDeltaRawEl = Y.qs('#yro_B_iron_v18');
      var ironDelta = (ironDeltaRawEl && String(ironDeltaRawEl.value).trim() !== '') ? Y.safeInt(ironDeltaRawEl.value, 0) : null;
      if (ironDeltaRawEl && (ironDelta == null || isNaN(Number(ironDelta)))) ironDeltaRawEl.value = '';

      senderIds = await resolveSelection(senderGid, 'B_sender', true);
      targetIds = await resolveSelection(targetGid, 'B_target', true);
      surplusIds = await resolveSelection(surplusGid, 'B_surplus', true);

      if (!senderIds.length || !targetIds.length) { Y.ui.setMsg('Select both Sender and Target (and run Full Scan).', '#b00'); return; }
      var r2 = Y.compute.planPush(senderIds, targetIds, surplusIds, Y.runtime.snapshotsById, st.cache.incomingMap, cap, scap, reserve, ironDelta, tolPct, st.cache.outgoingMap);

      cap = (r2 && r2.capPct) ? r2.capPct : 0;
      var capEl = Y.qs('#yro_B_cap_v18'); if (capEl) capEl.value = (cap >= 2 ? cap : '');

      if (r2 && r2.trade) {
        var tr = r2.trade;
        var msg = 'Trade suggested: Sell ~' + Y.formatTwNumber(tr.sell.amount) + ' ' + tr.sell.res.toUpperCase() + ' → Buy ~' + Y.formatTwNumber(tr.buy.amount) + ' ' + tr.buy.res.toUpperCase();
        if (tr.suggestedVillage) msg += ' | Suggested village: ' + tr.suggestedVillage;
        Y.ui.setMsg(msg, '#b35b00');
        Y.runtime.plan = null;
        return;
      }

      Y.runtime.plan = {
        mode: mode,
        shipments: r2.shipments,
        meta: { cap: cap, scap: scap, reserve: reserve, tol: (r2 && r2.tolPct!=null?r2.tolPct:tolPct), ironDelta: (r2 && r2.ironTolPct!=null? ( (ironDelta==null)? null : ironDelta ) : ironDelta), targetGid: targetGid, senderGid: senderGid, surplusGid: surplusGid },
        targetIds: r2.targetIds,
        senderIds: r2.senderIds,
        surplusIds: r2.surplusIds,
        states: r2.states,
        targetSummary: Y.compute.summarize(r2.states, r2.targetIds),
        surplusSummary: Y.compute.summarize(r2.states, r2.surplusIds),
      };

    } else if (mode === 'funnel') {
      targetGid = getSelValue('#yro_C_target_v18');
      surplusGid = getSelValue('#yro_C_surplus_v18');
      reserve = getNumValue('#yro_C_reserve_v18', 1);
      cap = getNumValue('#yro_C_cap_v18', 80);
      scap = getNumValue('#yro_C_scap_v18', 95);
      var ironDelta = getNumValue('#yro_C_iron_v18', 0);

      targetIds = await resolveSelection(targetGid, 'C_target', true);
      surplusIds = await resolveSelection(surplusGid, 'C_surplus', true);

      var r3 = Y.compute.planFunnel(allIds, targetIds, surplusIds, Y.runtime.snapshotsById, st.cache.incomingMap, cap, scap, reserve, ironDelta);

      Y.runtime.plan = {
        mode: mode,
        shipments: r3.shipments,
        meta: { cap: cap, scap: scap, reserve: reserve, ironDelta: ironDelta, targetGid: targetGid, senderGid: 0, surplusGid: surplusGid },
        targetIds: r3.targetIds,
        senderIds: r3.senderIds,
        surplusIds: r3.surplusIds,
        states: r3.states,
        targetSummary: Y.compute.summarize(r3.states, r3.targetIds),
        surplusSummary: Y.compute.summarize(r3.states, r3.surplusIds),
      };

    } else {
      Y.ui.setMsg('Bilinmeyen mode: ' + mode, '#b00');
      return;
    }

    st.orchestrator.mode = mode;
    st.orchestrator.cap = cap;
    st.orchestrator.scap = scap;
    st.orchestrator.reserve = reserve;
    if (typeof tolPct !== 'undefined') st.orchestrator.tolerance = tolPct;
    st.orchestrator.ironDelta = (typeof ironDelta !== 'undefined') ? ironDelta : (st.orchestrator.ironDelta != null ? st.orchestrator.ironDelta : null);

    if (mode === 'balance') { st.groups.A_target = targetGid; st.groups.A_surplus = surplusGid; }
    if (mode === 'push') { st.groups.B_sender = senderGid; st.groups.B_target = targetGid; st.groups.B_surplus = surplusGid; }
    if (mode === 'funnel') { st.groups.C_target = targetGid; st.groups.C_surplus = surplusGid; }

    Y.saveState();

    Y.ui.renderPlanTables(Y.runtime.plan, Y.runtime.snapshotsById);
    Y.ui.setMsg('Plan ready ✅ | Shipments: ' + (Y.runtime.plan.shipments ? Y.runtime.plan.shipments.length : 0), '#0a6');
  }

  function copyBBCode() {
    var plan = Y.runtime.plan || { shipments: [] };
    var lines = [];
    lines.push('[quote][b]Yaver Resource Orchestrator[/b] (' + Y.ts() + ')');
    lines.push('[list]');
    lines.push('[*][b]Mode[/b]: ' + String(plan.mode || '-').toUpperCase());
    lines.push('[*][b]Cap%[/b]: ' + (plan.meta && plan.meta.cap != null ? plan.meta.cap : '-') + '%');
    lines.push('[*][b]Reserve(each)%[/b]: ' + (plan.meta && plan.meta.reserve != null ? plan.meta.reserve : '-') + '%');
    lines.push('[*][b]Surplus Cap%[/b]: ' + (plan.meta && plan.meta.scap != null ? plan.meta.scap : '-') + '%');
    lines.push('[*][b]Shipments[/b]: ' + (plan.shipments ? plan.shipments.length : 0));
    lines.push('[/list]');

    if (plan.shipments && plan.shipments.length) {
      lines.push('[b]Shipment Plan[/b]');
      lines.push('[table]');
      lines.push('[**]#[||]From[||]To[||]Wood[||]Clay[||]Iron[||]Total[||]Merch[||]Tag[/**]');
      plan.shipments.forEach(function (s, idx) {
        lines.push(
          '[*]' +
          (idx + 1) + '[|]' +
          s.from + '[|]' +
          s.to + '[|]' +
          Y.formatTwNumber(s.wood) + '[|]' +
          Y.formatTwNumber(s.clay) + '[|]' +
          Y.formatTwNumber(s.iron) + '[|]' +
          Y.formatTwNumber(s.total) + '[|]' +
          (s.merch || Math.ceil(s.total / 1000)) + '[|]' +
          (s.tag || '') +
          '[/*]'
        );
      });
      lines.push('[/table]');
    } else {
      lines.push('[i]No shipments.[/i]');
    }
    lines.push('[/quote]');

    var txt = lines.join('\n');
    navigator.clipboard.writeText(txt).then(function () {
      Y.ui.setMsg('BBCode copied ✅', '#0a6');
    }).catch(function () {
      window.prompt('Copy BBCode:', txt);
    });
  }

  async function loadAll(force) {
    try {
      Y.ui.setMsg('Full Scan started…', '#b35b00');
      Y.ui.setProgress(0, 1, 'Preparing');

      await Y.fetch.fetchGroupsList(!!force);

      // critical: fill selects + build modes
      Y.ui.fillGroupSelects(Y.state.groups.list);
      Y.ui.buildModesBox(Y.state.groups.list);

      await Y.fetch.fullScanAllVillages(!!force, function (done, total, msg) {
        Y.ui.setProgress(done, total, msg);
      });

      await loadTables(false);

      Y.ui.setProgress(1, 1, 'Ready');
      Y.ui.setMsg('Ready ✅ (Full Scan completed)', '#0a6');
    } catch (e) {
      Y.err('loadAll failed', e);
      Y.ui.setMsg('Hata ❌ (console log kontrol et)', '#b00');
    }
  }

  function bindEvents() {
    var st = Y.state;

    Y.on(Y.qs('#yro_close_v18'), 'click', function () { Y.destroy(); });

    Y.on(Y.qs('#yro_load_v18'), 'click', function () { loadAll(true); });

    var search = Y.qs('#yro_search_v18');
    if (search) {
      search.value = st.ui.search || '';
      Y.on(search, 'input', Y.debounce(function () {
        st.ui.search = search.value || '';
        Y.saveState();
        loadTables(false);
      }, 160));
    }

    Y.on(Y.qs('#yro_t1_toggle_v18'), 'click', function () {
      st.ui.minimized1 = !st.ui.minimized1;
      var w = Y.qs('#yro_t1_wrap_v18');
      if (w) w.style.display = st.ui.minimized1 ? 'none' : '';
      var b = Y.qs('#yro_t1_toggle_v18');
      if (b) b.textContent = st.ui.minimized1 ? 'Expand' : 'Minimize';
      Y.saveState();
    });

    Y.on(Y.qs('#yro_t2_toggle_v18'), 'click', function () {
      st.ui.minimized2 = !st.ui.minimized2;
      var w = Y.qs('#yro_t2_wrap_v18');
      if (w) w.style.display = st.ui.minimized2 ? 'none' : '';
      var b = Y.qs('#yro_t2_toggle_v18');
      if (b) b.textContent = st.ui.minimized2 ? 'Expand' : 'Minimize';
      Y.saveState();
    });

    Y.on(Y.qs('#yro_t1_group_sel_v18'), 'change', function (e) {
      st.groups.sel1 = Y.safeInt(e.target.value, 0);
      Y.saveState();
      loadTables(true);
    });

    Y.on(Y.qs('#yro_t2_group_sel_v18'), 'change', function (e) {
      st.groups.sel2 = Y.safeInt(e.target.value, 0);
      Y.saveState();
      loadTables(true);
    });

    Y.on(Y.qs('#yro_t1_pick_v18'), 'click', function () { openPicker('t1'); });
    Y.on(Y.qs('#yro_t2_pick_v18'), 'click', function () { openPicker('t2'); });

    Y.on(Y.qs('#yro_copy_bb_v18'), 'click', function () { copyBBCode(); });

    var modeBox = Y.qs('#yro_modes_v18');
    if (modeBox) {
      // click delegation
      Y.on(modeBox, 'click', function (e) {
        var t = e.target;
        if (!t) return;

        if (t.id === 'yro_A_plan_v18') return planFromMode('balance');
        if (t.id === 'yro_B_plan_v18') return planFromMode('push');
        if (t.id === 'yro_C_plan_v18') return planFromMode('funnel');

        if (t.id === 'yro_A_exec_v18' || t.id === 'yro_B_exec_v18' || t.id === 'yro_C_exec_v18') return executePlan();

        if (String(t.id || '').startsWith('pick_') && String(t.id).endsWith('_v18')) {
          var key = String(t.id).replace('pick_', '').replace('_v18', '');
          return openPicker(key);
        }

        var tag = (t.tagName || '').toLowerCase();
        if (tag === 'select' || tag === 'input' || tag === 'button' || tag === 'option') return;

        var row = t.closest ? t.closest('.yro_mode_row') : null;
        if (row && row.getAttribute) {
          var mode = row.getAttribute('data-mode');
          if (mode) {
            st.orchestrator.mode = mode;
            Y.saveState();
            Y.qsa('#yro_modes_v18 .yro_mode_row').forEach(function (r) { r.classList.remove('active'); });
            row.classList.add('active');
          }
        }
      });

      // change delegation (persist inputs/selects)
      Y.on(modeBox, 'change', function (e) {
        var t = e.target;
        if (!t || !t.id) return;

        if (t.id === 'yro_A_target_v18') st.groups.A_target = Y.safeInt(t.value, 0);
        else if (t.id === 'yro_A_surplus_v18') st.groups.A_surplus = Y.safeInt(t.value, 0);
        else if (t.id === 'yro_B_sender_v18') st.groups.B_sender = Y.safeInt(t.value, 0);
        else if (t.id === 'yro_B_target_v18') st.groups.B_target = Y.safeInt(t.value, 0);
        else if (t.id === 'yro_B_surplus_v18') st.groups.B_surplus = Y.safeInt(t.value, 0);
        else if (t.id === 'yro_C_target_v18') st.groups.C_target = Y.safeInt(t.value, 0);
        else if (t.id === 'yro_C_surplus_v18') st.groups.C_surplus = Y.safeInt(t.value, 0);

        else if (t.id === 'yro_A_cap_v18' || t.id === 'yro_B_cap_v18' || t.id === 'yro_C_cap_v18') st.orchestrator.cap = Y.safeInt(t.value, st.orchestrator.cap);
        else if (t.id === 'yro_A_scap_v18' || t.id === 'yro_B_scap_v18' || t.id === 'yro_C_scap_v18') st.orchestrator.scap = Y.safeInt(t.value, st.orchestrator.scap);
        else if (t.id === 'yro_B_reserve_v18' || t.id === 'yro_C_reserve_v18') st.orchestrator.reserve = Y.safeInt(t.value, st.orchestrator.reserve);

        Y.saveState();
      });
    }
  }

  async function init() {
    var panel = Y.ui.buildPanel();
    Y.ui.enableDrag(panel);

    await Y.fetch.fetchGroupsList(false);
    Y.ui.fillGroupSelects(Y.state.groups.list);
    Y.ui.buildModesBox(Y.state.groups.list);

    bindEvents();

    Y.fetch.rebuildGlobalMapsFromCache();
    await loadTables(false);

    if (!Object.keys(Y.state.cache.villages || {}).length) {
      await loadAll(false);
    } else {
      Y.ui.setMsg('Ready ✅ (cache available) — run Full Scan if you want fresh data', '#0a6');
    }
  }

  Y.init = init;

  Y.log('main module loaded ✅');
})();
