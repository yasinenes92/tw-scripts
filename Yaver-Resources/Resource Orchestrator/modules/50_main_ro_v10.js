(function () {
  'use strict';

  var Y = window.YRO_V10;
  if (!Y) return;

  function groupNameById(gid) {
    gid = Y.safeInt(gid, 0);
    var g = (Y.state.groups.list || []).find(function (x) { return Y.safeInt(x.id, 0) === gid; });
    return g ? g.name : String(gid);
  }

  function buildAllById(resRows) {
    var m = {};
    (resRows || []).forEach(function (v) { m[v.id] = v; });
    return m;
  }

  async function loadAll(force) {
    try {
      Y.ui.setMsg('Yükleniyor…', '#b35b00');
      Y.ui.setProgress(0, 3, 'Starting');

      // 1) Groups
      var groups = await Y.fetch.fetchGroupsList(!!force);
      Y.ui.fillGroupSelects(groups);
      Y.ui.buildModesBox(groups);

      Y.ui.setProgress(1, 3, 'Groups ready');
      Y.ui.setMsg('Gruplar hazır ✅', '#0a6');

      // 2) Incoming (global)
      var incomingMap = await Y.fetch.fetchIncomingTransports(!!force);
      Y.ui.setProgress(2, 3, 'Incoming cached');

      // 3) Tables (use selected groups)
      await loadTable1(!!force);
      await loadTable2(!!force);

      Y.ui.setProgress(3, 3, 'Ready');
      Y.ui.setMsg('Hazır ✅', '#0a6');
    } catch (e) {
      Y.err('loadAll failed', e);
      Y.ui.setMsg('Hata ❌ (console log kontrol et)', '#b00');
    }
  }

  async function loadTable1(force) {
    var st = Y.state;
    var gid = Y.safeInt(st.groups.sel1, 0);

    var rows = await Y.fetch.fetchProductionByGroup(gid, !!force);

    var t = Y.qs('#yro_t1_title_v10');
    if (t) t.textContent = groupNameById(gid);

    Y.ui.renderTable1(rows);
  }

  async function loadTable2(force) {
    var st = Y.state;
    var gid = Y.safeInt(st.groups.sel2, 0);

    var rows = await Y.fetch.fetchResourcesByGroup(gid, !!force);

    var t = Y.qs('#yro_t2_title_v10');
    if (t) t.textContent = groupNameById(gid);

    var incomingMap = st.cache.incomingMap || {};
    var inc = Y.compute.computeIncomingForGroup(rows, incomingMap);

    Y.ui.renderTable2(rows, inc.all, inc.external);

    // also keep a convenience cache in runtime for planning
    Y.runtime.lastResRows = rows;
    Y.runtime.lastIncomingAll = inc.all;
  }

  function getRowsForGroupCachedOrFetch(gid) {
    // for planning we need resources rows for selected groups.
    // We fetch fresh from server (robust for dynamic groups)
    return Y.fetch.fetchResourcesByGroup(gid, false);
  }

  async function planFromMode(mode) {
    var st = Y.state;
    var incomingAll = Y.runtime.lastIncomingAll || {};

    // We also need ALL villages rows for Mode C
    var allRows = await getRowsForGroupCachedOrFetch(0);

    // Build allById map from ALL villages (so plan tables can resolve names)
    var allById = buildAllById(allRows);

    var cap, scap, reserve;
    var shipments = [];
    var targetRows = [], senderRows = [], surplusRows = [];
    var targetGid = 0, senderGid = 0, surplusGid = 0;

    if (mode === 'balance') {
      targetGid = Y.safeInt(Y.qs('#yro_A_target_v10').value, 0);
      surplusGid = Y.safeInt(Y.qs('#yro_A_surplus_v10').value, 0);
      cap = Y.safeInt(Y.qs('#yro_A_cap_v10').value, 80);
      scap = Y.safeInt(Y.qs('#yro_A_scap_v10').value, 95);
      reserve = 0;

      targetRows = await getRowsForGroupCachedOrFetch(targetGid);
      surplusRows = await getRowsForGroupCachedOrFetch(surplusGid);

      shipments = Y.compute.computePlan_ModeA(targetRows, surplusRows, incomingAll, cap, scap);
    } else if (mode === 'push') {
      senderGid = Y.safeInt(Y.qs('#yro_B_sender_v10').value, 0);
      targetGid = Y.safeInt(Y.qs('#yro_B_target_v10').value, 0);
      surplusGid = Y.safeInt(Y.qs('#yro_B_surplus_v10').value, 0);
      reserve = Y.safeInt(Y.qs('#yro_B_reserve_v10').value, 1);
      cap = Y.safeInt(Y.qs('#yro_B_cap_v10').value, 80);
      scap = Y.safeInt(Y.qs('#yro_B_scap_v10').value, 95);

      senderRows = await getRowsForGroupCachedOrFetch(senderGid);
      targetRows = await getRowsForGroupCachedOrFetch(targetGid);
      surplusRows = await getRowsForGroupCachedOrFetch(surplusGid);

      shipments = Y.compute.computePlan_ModeB(senderRows, targetRows, surplusRows, incomingAll, cap, scap, reserve);
    } else if (mode === 'funnel') {
      targetGid = Y.safeInt(Y.qs('#yro_C_target_v10').value, 0);
      surplusGid = Y.safeInt(Y.qs('#yro_C_surplus_v10').value, 0);
      reserve = Y.safeInt(Y.qs('#yro_C_reserve_v10').value, 1);
      cap = Y.safeInt(Y.qs('#yro_C_cap_v10').value, 80);
      scap = Y.safeInt(Y.qs('#yro_C_scap_v10').value, 95);

      targetRows = await getRowsForGroupCachedOrFetch(targetGid);
      surplusRows = await getRowsForGroupCachedOrFetch(surplusGid);

      shipments = Y.compute.computePlan_ModeC(allRows, targetRows, surplusRows, cap, scap, reserve);
    }

    // filter shipments: remove zero totals & cap at ints
    shipments = (shipments || [])
      .map(function (s) {
        s.wood = Y.safeInt(s.wood, 0); s.clay = Y.safeInt(s.clay, 0); s.iron = Y.safeInt(s.iron, 0);
        s.total = s.wood + s.clay + s.iron;
        s.merch = Math.ceil(s.total / 1000);
        return s;
      })
      .filter(function (s) { return s.total > 0 && s.from !== s.to; });

    // store plan
    Y.runtime.plan = {
      mode: mode,
      shipments: shipments,
      meta: {
        senderGid: senderGid,
        targetGid: targetGid,
        surplusGid: surplusGid,
        cap: cap,
        scap: scap,
        reserve: reserve,
      },
    };

    // Render plan tables
    var targetIds = targetRows.map(function (v) { return v.id; });
    var surplusIds = surplusRows.map(function (v) { return v.id; });

    Y.ui.renderPlanTables(allById, Y.runtime.plan, targetIds, surplusIds);

    Y.ui.setMsg('Plan hazır ✅ | Shipments: ' + shipments.length, '#0a6');

    // persist orchestrator settings
    st.orchestrator.mode = mode;
    st.orchestrator.cap = cap;
    st.orchestrator.scap = scap;
    st.orchestrator.reserve = reserve;

    // persist group selections in modes
    if (mode === 'balance') {
      st.groups.A_target = targetGid;
      st.groups.A_surplus = surplusGid;
    } else if (mode === 'push') {
      st.groups.B_sender = senderGid;
      st.groups.B_target = targetGid;
      st.groups.B_surplus = surplusGid;
    } else if (mode === 'funnel') {
      st.groups.C_target = targetGid;
      st.groups.C_surplus = surplusGid;
    }
    Y.saveState();
  }

  function executePlanOpenTabs() {
    var plan = Y.runtime.plan;
    var shipments = (plan && plan.shipments) ? plan.shipments : [];
    if (!shipments.length) {
      Y.ui.setMsg('Execute: plan yok.', '#b00');
      return;
    }

    // Open up to 15 tabs to avoid blocker madness
    var limit = 15;
    var n = Math.min(limit, shipments.length);

    for (var i = 0; i < n; i++) {
      var s = shipments[i];
      var url = '/game.php?village=' + s.from +
        '&screen=market&mode=send' +
        '&target=' + s.to +
        '&wood=' + s.wood +
        '&stone=' + s.clay +
        '&iron=' + s.iron;
      window.open(url, '_blank');
    }

    if (shipments.length > limit) {
      Y.ui.setMsg('Execute: ' + limit + ' sekme açıldı. (Toplam ' + shipments.length + ' shipment)', '#b35b00');
    } else {
      Y.ui.setMsg('Execute: sekmeler açıldı ✅ (' + shipments.length + ')', '#0a6');
    }
  }

  function copyBBCode() {
    var st = Y.state;
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
      // fallback prompt
      window.prompt('Copy BBCode:', txt);
    });
  }

  function bindEvents(panel) {
    var st = Y.state;

    // close
    Y.qs('#yro_close_v10').addEventListener('click', function () {
      panel.remove();
    });

    // load
    Y.qs('#yro_load_v10').addEventListener('click', function () {
      loadAll(true);
    });

    // search
    var search = Y.qs('#yro_search_v10');
    search.value = st.ui.search || '';
    search.addEventListener('input', Y.debounce(function () {
      st.ui.search = search.value || '';
      Y.saveState();
      // rerender both using cached rows
      // (table1+table2 rerender by fetching cached data)
      loadTable1(false);
      loadTable2(false);
    }, 180));

    // toggles
    Y.qs('#yro_t1_toggle_v10').addEventListener('click', function () {
      st.ui.minimized1 = !st.ui.minimized1;
      Y.qs('#yro_t1_wrap_v10').style.display = st.ui.minimized1 ? 'none' : '';
      Y.qs('#yro_t1_toggle_v10').textContent = st.ui.minimized1 ? 'Expand' : 'Minimize';
      Y.saveState();
    });

    Y.qs('#yro_t2_toggle_v10').addEventListener('click', function () {
      st.ui.minimized2 = !st.ui.minimized2;
      Y.qs('#yro_t2_wrap_v10').style.display = st.ui.minimized2 ? 'none' : '';
      Y.qs('#yro_t2_toggle_v10').textContent = st.ui.minimized2 ? 'Expand' : 'Minimize';
      Y.saveState();
    });

    // groups selection
    Y.qs('#yro_t1_group_sel_v10').addEventListener('change', function (e) {
      st.groups.sel1 = Y.safeInt(e.target.value, 0);
      Y.saveState();
      loadTable1(true);
    });

    Y.qs('#yro_t2_group_sel_v10').addEventListener('change', function (e) {
      st.groups.sel2 = Y.safeInt(e.target.value, 0);
      Y.saveState();
      loadTable2(true);
    });

    // mode rows activate
    Y.qsa('#yro_modes_v10 .yro_mode_row').forEach(function (row) {
      row.addEventListener('click', function (e) {
        // ignore clicks on inputs/select/buttons
        var tag = (e.target && e.target.tagName) ? e.target.tagName.toLowerCase() : '';
        if (tag === 'select' || tag === 'input' || tag === 'button' || tag === 'option') return;

        var mode = row.getAttribute('data-mode');
        st.orchestrator.mode = mode;
        Y.saveState();

        // update active class
        Y.qsa('#yro_modes_v10 .yro_mode_row').forEach(function (r) { r.classList.remove('active'); });
        row.classList.add('active');
      });
    });

    // plan buttons
    Y.qs('#yro_A_plan_v10').addEventListener('click', function () { planFromMode('balance'); });
    Y.qs('#yro_B_plan_v10').addEventListener('click', function () { planFromMode('push'); });
    Y.qs('#yro_C_plan_v10').addEventListener('click', function () { planFromMode('funnel'); });

    // exec buttons
    Y.qs('#yro_A_exec_v10').addEventListener('click', executePlanOpenTabs);
    Y.qs('#yro_B_exec_v10').addEventListener('click', executePlanOpenTabs);
    Y.qs('#yro_C_exec_v10').addEventListener('click', executePlanOpenTabs);

    // copy bbcode
    Y.qs('#yro_copy_bb_v10').addEventListener('click', copyBBCode);
  }

  async function init() {
    var panel = Y.ui.buildPanel();
    Y.ui.enableDrag(panel);

    bindEvents(panel);

    // initial groups -> then load all
    await loadAll(false);
  }

  init().catch(function (e) {
    Y.err('init failed', e);
    try { Y.ui.setMsg('Init hata ❌ (console)', '#b00'); } catch (e2) {}
  });

  Y.log('main loaded ✅');
})();
