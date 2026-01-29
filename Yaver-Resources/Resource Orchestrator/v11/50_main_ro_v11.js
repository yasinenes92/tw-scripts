(function () {
  'use strict';

  var Y = window.YRO_V11;
  if (!Y) return;

  function groupNameById(gid) {
    gid = Y.safeInt(gid, 0);
    var g = (Y.state.groups.list || []).find(function (x) { return Y.safeInt(x.id, 0) === gid; });
    return g ? g.name : String(gid);
  }

  function tokensToVillageIds(tokens) {
    // tokens can be: numeric id, "123|456", or substring of village name
    var ids = [];
    (tokens || []).forEach(function (t) {
      t = String(t || '').trim();
      if (!t) return;

      // id
      if (/^\d+$/.test(t)) {
        var vid = Y.safeInt(t, 0);
        if (vid) ids.push(vid);
        return;
      }

      // coord
      var m = t.match(/^(\d+)\|(\d+)$/);
      if (m) {
        var key = m[1] + '|' + m[2];
        var v2 = Y.runtime.coordToId[key];
        if (v2) ids.push(v2);
        return;
      }

      // name contains
      var tl = t.toLowerCase();
      Object.keys(Y.runtime.snapshotsById || {}).forEach(function (k) {
        var s = Y.runtime.snapshotsById[k];
        if (s && String(s.name).toLowerCase().indexOf(tl) >= 0) ids.push(Y.safeInt(s.id, 0));
      });
    });

    // uniq
    var m2 = {};
    var out = [];
    ids.forEach(function (v) {
      var k = String(v);
      if (!m2[k]) { m2[k] = true; out.push(v); }
    });
    return out;
  }

  function openPicker(key) {
    var st = Y.state;
    var current = (st.custom[key] || []).join(', ');
    var txt = window.prompt(
      'Custom selection:\n- Village ID veya coord (123|456)\n- Virgül/boşluk/satır sonu ile ayırabilirsin.\n\nÖrnek:\n15945, 431|380\n\nMevcut: ' + current,
      current
    );
    if (txt == null) return;

    var parts = txt.split(/[\s,;\n\r]+/).filter(Boolean);
    var ids = tokensToVillageIds(parts);

    st.custom[key] = ids;
    Y.saveState();
    Y.ui.setMsg('Custom selection güncellendi: ' + key + ' (' + ids.length + ' köy)', '#0a6');
  }

  async function resolveSelection(gid, customKey, forceGroupFetch) {
    gid = Y.safeInt(gid, 0);
    if (gid === -1) {
      return (Y.state.custom[customKey] || []).slice();
    }
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

  async function loadAll(force) {
    try {
      Y.ui.setMsg('Full Scan başlıyor…', '#b35b00');
      Y.ui.setProgress(0, 1, 'Preparing');

      var groups = await Y.fetch.fetchGroupsList(!!force);
      Y.ui.fillGroupSelects(groups);
      Y.ui.buildModesBox(groups);

      // Full scan all villages (market transports per village)
      await Y.fetch.fullScanAllVillages(!!force, function (done, total, msg) {
        Y.ui.setProgress(done, total, msg);
      });

      // Now render tables with current selections
      await loadTables(false);

      Y.ui.setProgress(1, 1, 'Ready');
      Y.ui.setMsg('Hazır ✅ (Full Scan tamam)', '#0a6');
    } catch (e) {
      Y.err('loadAll failed', e);
      Y.ui.setMsg('Hata ❌ (console log kontrol et)', '#b00');
    }
  }

  async function loadTables(forceGroupFetch) {
    var st = Y.state;

    // table1 selection
    var t1gid = Y.safeInt(st.groups.sel1, 0);
    var t1ids = await resolveSelection(t1gid, 't1', forceGroupFetch);
    var t1title = Y.qs('#yro_t1_title_v11');
    if (t1title) t1title.textContent = groupNameById(t1gid);

    // table2 selection
    var t2gid = Y.safeInt(st.groups.sel2, 0);
    var t2ids = await resolveSelection(t2gid, 't2', forceGroupFetch);
    var t2title = Y.qs('#yro_t2_title_v11');
    if (t2title) t2title.textContent = groupNameById(t2gid);

    // incoming map & external calc for table2 set
    var incomingMap = st.cache.incomingMap || {};
    var outMap = st.cache.outgoingMap || {};
    var inc = Y.compute.computeIncomingForSet(t2ids, incomingMap);
    var outByVid = outgoingByVillageFromMap(outMap);

    Y.ui.renderTable1(t1ids);
    Y.ui.renderTable2(t2ids, inc.allByVid, inc.externalByVid, outByVid);
  }

  function buildAllVillageIdsFromCache() {
    // group 0 ids cached OR from snapshots
    var st = Y.state;
    var g0 = st.cache.groupVillageIds['0'];
    if (g0 && Array.isArray(g0.ids) && g0.ids.length) return g0.ids.slice();
    return Object.keys(Y.runtime.snapshotsById || {}).map(function (k) { return Y.safeInt(k, 0); }).filter(Boolean);
  }

  async function planFromMode(mode) {
    mode = String(mode || '').toLowerCase();
    var st = Y.state;

    if (!st.cache || !st.cache.incomingMap || !Object.keys(st.cache.villages || {}).length) {
      Y.ui.setMsg('Önce Full Scan yapmalısın (Yükle/Yenile).', '#b00');
      return;
    }

    var cap, scap, reserve;
    var targetGid = 0, senderGid = 0, surplusGid = 0;

    function getSelValue(id) {
      var el = Y.qs(id);
      return el ? Y.safeInt(el.value, 0) : 0;
    }
    function getNumValue(id, d) {
      var el = Y.qs(id);
      return el ? Y.safeInt(el.value, d) : d;
    }

    var targetIds = [], senderIds = [], surplusIds = [];
    var allIds = buildAllVillageIdsFromCache();

    if (mode === 'balance') {
      targetGid = getSelValue('#yro_A_target_v11');
      surplusGid = getSelValue('#yro_A_surplus_v11');
      cap = getNumValue('#yro_A_cap_v11', 80);
      scap = getNumValue('#yro_A_scap_v11', 95);
      reserve = 0;

      targetIds = await resolveSelection(targetGid, 'A_target', true);
      surplusIds = await resolveSelection(surplusGid, 'A_surplus', true);

      var r = Y.compute.planBalance(targetIds, surplusIds, Y.runtime.snapshotsById, st.cache.incomingMap, cap, scap);

      var targetSummary = Y.compute.summarize(r.states, r.targetIds);
      var surplusSummary = Y.compute.summarize(r.states, r.surplusIds);

      Y.runtime.plan = {
        mode: mode,
        shipments: r.shipments,
        meta: { cap: cap, scap: scap, reserve: reserve, targetGid: targetGid, senderGid: 0, surplusGid: surplusGid },
        targetIds: r.targetIds,
        surplusIds: r.surplusIds,
        states: r.states,
        targetSummary: targetSummary,
        surplusSummary: surplusSummary,
      };

      // persist selections
      st.orchestrator.mode = mode; st.orchestrator.cap = cap; st.orchestrator.scap = scap; st.orchestrator.reserve = reserve;
      st.groups.A_target = targetGid; st.groups.A_surplus = surplusGid;
      Y.saveState();
    } else if (mode === 'push') {
      senderGid = getSelValue('#yro_B_sender_v11');
      targetGid = getSelValue('#yro_B_target_v11');
      surplusGid = getSelValue('#yro_B_surplus_v11');
      reserve = getNumValue('#yro_B_reserve_v11', 1);
      cap = getNumValue('#yro_B_cap_v11', 80);
      scap = getNumValue('#yro_B_scap_v11', 95);

      senderIds = await resolveSelection(senderGid, 'B_sender', true);
      targetIds = await resolveSelection(targetGid, 'B_target', true);
      surplusIds = await resolveSelection(surplusGid, 'B_surplus', true);

      var r2 = Y.compute.planPush(senderIds, targetIds, surplusIds, Y.runtime.snapshotsById, st.cache.incomingMap, cap, scap, reserve);
      var targetSummary2 = Y.compute.summarize(r2.states, r2.targetIds);
      var surplusSummary2 = Y.compute.summarize(r2.states, r2.surplusIds);

      Y.runtime.plan = {
        mode: mode,
        shipments: r2.shipments,
        meta: { cap: cap, scap: scap, reserve: reserve, targetGid: targetGid, senderGid: senderGid, surplusGid: surplusGid },
        targetIds: r2.targetIds,
        senderIds: r2.senderIds,
        surplusIds: r2.surplusIds,
        states: r2.states,
        targetSummary: targetSummary2,
        surplusSummary: surplusSummary2,
      };

      st.orchestrator.mode = mode; st.orchestrator.cap = cap; st.orchestrator.scap = scap; st.orchestrator.reserve = reserve;
      st.groups.B_sender = senderGid; st.groups.B_target = targetGid; st.groups.B_surplus = surplusGid;
      Y.saveState();
    } else if (mode === 'funnel') {
      targetGid = getSelValue('#yro_C_target_v11');
      surplusGid = getSelValue('#yro_C_surplus_v11');
      reserve = getNumValue('#yro_C_reserve_v11', 1);
      cap = getNumValue('#yro_C_cap_v11', 80);
      scap = getNumValue('#yro_C_scap_v11', 95);

      targetIds = await resolveSelection(targetGid, 'C_target', true);
      surplusIds = await resolveSelection(surplusGid, 'C_surplus', true);

      var r3 = Y.compute.planFunnel(allIds, targetIds, surplusIds, Y.runtime.snapshotsById, st.cache.incomingMap, cap, scap, reserve);
      var targetSummary3 = Y.compute.summarize(r3.states, r3.targetIds);
      var surplusSummary3 = Y.compute.summarize(r3.states, r3.surplusIds);

      Y.runtime.plan = {
        mode: mode,
        shipments: r3.shipments,
        meta: { cap: cap, scap: scap, reserve: reserve, targetGid: targetGid, senderGid: 0, surplusGid: surplusGid },
        targetIds: r3.targetIds,
        senderIds: r3.senderIds,
        surplusIds: r3.surplusIds,
        states: r3.states,
        targetSummary: targetSummary3,
        surplusSummary: surplusSummary3,
      };

      st.orchestrator.mode = mode; st.orchestrator.cap = cap; st.orchestrator.scap = scap; st.orchestrator.reserve = reserve;
      st.groups.C_target = targetGid; st.groups.C_surplus = surplusGid;
      Y.saveState();
    } else {
      Y.ui.setMsg('Bilinmeyen mode: ' + mode, '#b00');
      return;
    }

    // Render plan tables
    Y.ui.renderPlanTables(Y.runtime.plan, Y.runtime.snapshotsById);
    Y.ui.setMsg('Plan hazır ✅ | Shipments: ' + (Y.runtime.plan.shipments ? Y.runtime.plan.shipments.length : 0), '#0a6');
  }

  function executeTabs() {
    var plan = Y.runtime.plan;
    var shipments = (plan && plan.shipments) ? plan.shipments : [];
    if (!shipments.length) {
      Y.ui.setMsg('Execute: plan yok.', '#b00');
      return;
    }

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

    if (shipments.length > limit) {
      Y.ui.setMsg('Execute(Tabs): ' + limit + ' sekme açıldı. (Toplam ' + shipments.length + ')', '#b35b00');
    } else {
      Y.ui.setMsg('Execute(Tabs): sekmeler açıldı ✅ (' + shipments.length + ')', '#0a6');
    }
  }

  function splitCoord(coord) {
    var m = String(coord || '').match(/(\d+)\|(\d+)/);
    if (!m) return null;
    return { x: Y.safeInt(m[1], 0), y: Y.safeInt(m[2], 0) };
  }

  function sendOneShipmentAjax(s) {
    // uses map_send
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
        TribalWars.post(
          'market',
          { ajaxaction: 'map_send', village: s.from },
          data,
          function (resp) { resolve(resp); },
          function (e) { reject(e); }
        );
      } catch (e2) {
        reject(e2);
      }
    });
  }

  function confirmTwoButtons(htmlMsg, onYes) {
    var actions = [
      { text: 'Yes, execute', callback: onYes, confirm: true },
      { text: 'Cancel', callback: function () {}, cancel: true },
    ];
    if (window.UI && UI.ConfirmationBox) {
      UI.ConfirmationBox(htmlMsg, actions, 'yro_exec_v11', true);
    } else {
      if (confirm(htmlMsg.replace(/<br\/>/g, '\n').replace(/<[^>]*>/g, ''))) onYes();
    }
  }

  async function executeAuto() {
    var plan = Y.runtime.plan;
    var shipments = (plan && plan.shipments) ? plan.shipments : [];
    if (!shipments.length) {
      Y.ui.setMsg('Execute: plan yok.', '#b00');
      return;
    }

    var htmlMsg =
      'Auto Execute?<br/>' +
      'Shipments: <b>' + shipments.length + '</b><br/>' +
      'Devam edilsin mi?';

    confirmTwoButtons(htmlMsg, async function () {
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

      Y.ui.setMsg('Auto Execute bitti ✅ | ok=' + ok + ' | fail=' + fail, fail ? '#b00' : '#0a6');
      // after execute: recommend refresh
    });
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
      Y.ui.setMsg('BBCode kopyalandı ✅', '#0a6');
    }).catch(function () {
      window.prompt('Copy BBCode:', txt);
    });
  }

  function bindEvents(panel) {
    var st = Y.state;

    // close
    Y.on(Y.qs('#yro_close_v11'), 'click', function () {
      Y.destroy();
    });

    // load
    Y.on(Y.qs('#yro_load_v11'), 'click', function () {
      loadAll(true);
    });

    // search
    var search = Y.qs('#yro_search_v11');
    search.value = st.ui.search || '';
    Y.on(search, 'input', Y.debounce(function () {
      st.ui.search = search.value || '';
      Y.saveState();
      loadTables(false);
    }, 180));

    // toggles
    Y.on(Y.qs('#yro_t1_toggle_v11'), 'click', function () {
      st.ui.minimized1 = !st.ui.minimized1;
      Y.qs('#yro_t1_wrap_v11').style.display = st.ui.minimized1 ? 'none' : '';
      Y.qs('#yro_t1_toggle_v11').textContent = st.ui.minimized1 ? 'Expand' : 'Minimize';
      Y.saveState();
    });

    Y.on(Y.qs('#yro_t2_toggle_v11'), 'click', function () {
      st.ui.minimized2 = !st.ui.minimized2;
      Y.qs('#yro_t2_wrap_v11').style.display = st.ui.minimized2 ? 'none' : '';
      Y.qs('#yro_t2_toggle_v11').textContent = st.ui.minimized2 ? 'Expand' : 'Minimize';
      Y.saveState();
    });

    // group selection changes
    Y.on(Y.qs('#yro_t1_group_sel_v11'), 'change', function (e) {
      st.groups.sel1 = Y.safeInt(e.target.value, 0);
      Y.saveState();
      loadTables(true);
    });

    Y.on(Y.qs('#yro_t2_group_sel_v11'), 'change', function (e) {
      st.groups.sel2 = Y.safeInt(e.target.value, 0);
      Y.saveState();
      loadTables(true);
    });

    // pick buttons for custom selection
    Y.on(Y.qs('#yro_t1_pick_v11'), 'click', function () { openPicker('t1'); loadTables(false); });
    Y.on(Y.qs('#yro_t2_pick_v11'), 'click', function () { openPicker('t2'); loadTables(false); });

    // mode row activate
    Y.qsa('#yro_modes_v11 .yro_mode_row').forEach(function (row) {
      Y.on(row, 'click', function (e) {
        var tag = (e.target && e.target.tagName) ? e.target.tagName.toLowerCase() : '';
        if (tag === 'select' || tag === 'input' || tag === 'button' || tag === 'option') return;

        var mode = row.getAttribute('data-mode');
        st.orchestrator.mode = mode;
        Y.saveState();

        Y.qsa('#yro_modes_v11 .yro_mode_row').forEach(function (r) { r.classList.remove('active'); });
        row.classList.add('active');
      });
    });

    // pickers for mode selects
    var pickerMap = [
      ['pick_A_target_v11', 'A_target'],
      ['pick_A_surplus_v11', 'A_surplus'],
      ['pick_B_sender_v11', 'B_sender'],
      ['pick_B_target_v11', 'B_target'],
      ['pick_B_surplus_v11', 'B_surplus'],
      ['pick_C_target_v11', 'C_target'],
      ['pick_C_surplus_v11', 'C_surplus'],
    ];
    pickerMap.forEach(function (p) {
      var btn = Y.qs('#' + p[0]);
      if (!btn) return;
      Y.on(btn, 'click', function (ev) {
        ev.stopPropagation();
        openPicker(p[1]);
      });
    });

    // plan
    Y.on(Y.qs('#yro_A_plan_v11'), 'click', function (e) { e.stopPropagation(); planFromMode('balance'); });
    Y.on(Y.qs('#yro_B_plan_v11'), 'click', function (e) { e.stopPropagation(); planFromMode('push'); });
    Y.on(Y.qs('#yro_C_plan_v11'), 'click', function (e) { e.stopPropagation(); planFromMode('funnel'); });

    // execute tabs
    Y.on(Y.qs('#yro_A_exec_tabs_v11'), 'click', function (e) { e.stopPropagation(); executeTabs(); });
    Y.on(Y.qs('#yro_B_exec_tabs_v11'), 'click', function (e) { e.stopPropagation(); executeTabs(); });
    Y.on(Y.qs('#yro_C_exec_tabs_v11'), 'click', function (e) { e.stopPropagation(); executeTabs(); });

    // execute auto
    Y.on(Y.qs('#yro_A_exec_auto_v11'), 'click', function (e) { e.stopPropagation(); executeAuto(); });
    Y.on(Y.qs('#yro_B_exec_auto_v11'), 'click', function (e) { e.stopPropagation(); executeAuto(); });
    Y.on(Y.qs('#yro_C_exec_auto_v11'), 'click', function (e) { e.stopPropagation(); executeAuto(); });

    // copy bbcode
    Y.on(Y.qs('#yro_copy_bb_v11'), 'click', function () { copyBBCode(); });
  }

  async function init() {
    var panel = Y.ui.buildPanel();
    Y.ui.enableDrag(panel);

    bindEvents(panel);

    // initial: build groups + rebuild maps if cache exists
    try {
      await Y.fetch.fetchGroupsList(false);
      Y.fetch.rebuildGlobalMapsFromCache();
      await loadTables(false);

      // If cache empty, auto scan once (first run)
      if (!Object.keys(Y.state.cache.villages || {}).length) {
        await loadAll(false);
      } else {
        Y.ui.setMsg('Hazır ✅ (cache var) — istersen Full Scan yap', '#0a6');
      }
    } catch (e) {
      Y.err('init error', e);
      Y.ui.setMsg('Init hata ❌ (console)', '#b00');
    }
  }

  Y.init = init;

  Y.log('main module loaded ✅');
})();
