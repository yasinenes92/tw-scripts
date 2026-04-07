(function () {
  'use strict';

  var Y = window.YRO_V26;
  if (!Y) return;

  function groupNameById(gid) {
    gid = Y.safeInt(gid, 0);
    var g = (Y.state.groups.list || []).find(function (x) { return Y.safeInt(x.id, 0) === gid; });
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
      out[Y.safeInt(fromId, 0)] = {
        wood: f.wood || 0,
        clay: f.clay || 0,
        iron: f.iron || 0,
        total: f.total || 0
      };
    });
    return out;
  }

  async function loadTables(forceGroupFetch) {
    var st = Y.state;

    var t1gid = Y.safeInt(st.groups.sel1, 0);
    var t1ids = await resolveSelection(t1gid, 't1', forceGroupFetch);
    var t1title = Y.qs('#yro_t1_title_v26');
    if (t1title) t1title.textContent = groupNameById(t1gid);

    var t2gid = Y.safeInt(st.groups.sel2, 0);
    var t2ids = await resolveSelection(t2gid, 't2', forceGroupFetch);
    var t2title = Y.qs('#yro_t2_title_v26');
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
      Y.ui.setMsg('Custom selection saved: ' + key + ' (' + selectedIds.length + ' villages)', '#0a6');
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
      iron: s.iron || 0
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

  function confirmTwoButtons(htmlMsg, onYes, onCancel) {
    var actions = [
      { text: 'Execute', callback: onYes, confirm: true },
      { text: 'Cancel', callback: function () { try { if (onCancel) onCancel(); } catch (e) {} }, cancel: true }
    ];
    if (window.UI && UI.ConfirmationBox) {
      UI.ConfirmationBox(htmlMsg, actions, 'yro_exec_v26', true);
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
    if (!shipments.length) {
      Y.ui.setMsg('No plan to execute.', '#b00');
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

    Y.ui.setMsg('Execute (Tabs): ' + n + ' tabs opened. (Total ' + shipments.length + ')', '#b35b00');
  }

  async function executePlan() {
    var plan = Y.runtime.plan;
    var shipments = (plan && plan.shipments) ? plan.shipments : [];
    if (!shipments.length) {
      Y.ui.setMsg('No plan to execute.', '#b00');
      return;
    }

    var panel = Y.qs('#' + Y.cfg.PANEL_ID);
    var prevDisplay = panel ? panel.style.display : '';
    if (panel) panel.style.display = 'none';

    confirmTwoButtons('Execute?<br/>Shipments: <b>' + shipments.length + '</b>', async function () {
      var ok = 0;
      var fail = 0;

      for (var i = 0; i < shipments.length; i++) {
        var s = shipments[i];
        Y.ui.setProgress(i + 1, shipments.length, 'Sending ' + s.from + ' -> ' + s.to);

        try {
          var resp = await sendOneShipmentAjax(s);
          ok++;
          if (window.UI && UI.SuccessMessage) UI.SuccessMessage((resp && resp.message) ? resp.message : 'Sent OK', 600);
        } catch (e) {
          fail++;
          if (window.UI && UI.ErrorMessage) UI.ErrorMessage('Failed (ok ' + ok + ' / fail ' + fail + ')', 1200);
        }
        await Y.sleep(Y.cfg.SEND_DELAY_MS);
      }

      if (panel) panel.style.display = prevDisplay || '';
      Y.ui.setMsg('Execution finished | ok=' + ok + ' | fail=' + fail, fail ? '#b00' : '#0a6');
    });
  }

  async function planFromMode(mode) {
    mode = String(mode || '').toLowerCase();
    var st = Y.state;

    if (!st.cache || !Object.keys(st.cache.villages || {}).length) {
      Y.ui.setMsg('You must run Full Scan first (Load / Refresh).', '#b00');
      return;
    }

    function getSelValue(id) {
      var el = Y.qs(id);
      return el ? Y.safeInt(el.value, 0) : 0;
    }
    function getNumValue(id, d) {
      var el = Y.qs(id);
      return el ? Y.safeInt(el.value, d) : d;
    }

    var allIds = Object.keys(Y.runtime.snapshotsById || {}).map(function (k) { return Y.safeInt(k, 0); }).filter(Boolean);
    var targetGid = 0;
    var surplusGid = 0;
    var targetIds = [];
    var surplusIds = [];

    if (mode === 'balance') {
      targetGid = getSelValue('#yro_A_target_v26');
      surplusGid = getSelValue('#yro_A_surplus_v26');
      var capA = getNumValue('#yro_A_cap_v26', st.modeA.capPct || 80);
      var scapA = getNumValue('#yro_A_scap_v26', st.modeA.surplusCapPct || 95);

      targetIds = await resolveSelection(targetGid, 'A_target', true);
      surplusIds = await resolveSelection(surplusGid, 'A_surplus', true);

      Y.runtime.plan = Y.compute.planBalance(targetIds, surplusIds, Y.runtime.snapshotsById, st.cache.incomingMap, capA, scapA);
      if (Y.runtime.plan && Y.runtime.plan.meta) {
        Y.runtime.plan.meta.targetGid = targetGid;
        Y.runtime.plan.meta.surplusGid = surplusGid;
      }

      st.groups.A_target = targetGid;
      st.groups.A_surplus = surplusGid;
      st.modeA.capPct = capA;
      st.modeA.surplusCapPct = scapA;
      delete st.modeA.ironDeltaPct;
    } else if (mode === 'push') {
      var parentGid = getSelValue('#yro_B_parents_v26');
      var childGid = getSelValue('#yro_B_children_v26');
      surplusGid = getSelValue('#yro_B_surplus_v26');
      var parentReservePct = getNumValue('#yro_B_parent_reserve_v26', st.modeB.parentReservePct || 1);
      var childrenMaxFillPct = getNumValue('#yro_B_child_max_v26', st.modeB.childrenMaxFillPct || 80);
      var surplusCapPct = getNumValue('#yro_B_scap_v26', st.modeB.surplusCapPct || 95);

      var parentIds = await resolveSelection(parentGid, 'B_parents', true);
      var childIds = await resolveSelection(childGid, 'B_children', true);
      surplusIds = await resolveSelection(surplusGid, 'B_surplus', true);

      Y.runtime.plan = Y.compute.planPush(
        parentIds,
        childIds,
        surplusIds,
        Y.runtime.snapshotsById,
        st.cache.incomingMap,
        childrenMaxFillPct,
        surplusCapPct,
        parentReservePct
      );

      st.groups.B_parents = parentGid;
      st.groups.B_children = childGid;
      st.groups.B_surplus = surplusGid;
      st.modeB.parentReservePct = parentReservePct;
      st.modeB.childrenMaxFillPct = childrenMaxFillPct;
      st.modeB.surplusCapPct = surplusCapPct;
    } else if (mode === 'funnel') {
      targetGid = getSelValue('#yro_C_target_v26');
      surplusGid = getSelValue('#yro_C_surplus_v26');
      var reserveC = getNumValue('#yro_C_reserve_v26', st.modeC.reservePct || 1);
      var capC = getNumValue('#yro_C_cap_v26', st.modeC.capPct || 80);
      var scapC = getNumValue('#yro_C_scap_v26', st.modeC.surplusCapPct || 95);
      var ironDeltaC = getNumValue('#yro_C_iron_v26', st.modeC.ironDeltaPct || 0);

      targetIds = await resolveSelection(targetGid, 'C_target', true);
      surplusIds = await resolveSelection(surplusGid, 'C_surplus', true);

      var rC = Y.compute.planFunnel(allIds, targetIds, surplusIds, Y.runtime.snapshotsById, st.cache.incomingMap, capC, scapC, reserveC, ironDeltaC);
      Y.runtime.plan = {
        mode: mode,
        shipments: rC.shipments,
        meta: {
          cap: capC,
          scap: scapC,
          reserve: reserveC,
          ironDelta: ironDeltaC,
          targetGid: targetGid,
          surplusGid: surplusGid
        },
        targetIds: rC.targetIds,
        senderIds: rC.senderIds,
        surplusIds: rC.surplusIds,
        states: rC.states,
        targetSummary: Y.compute.summarize(rC.states, rC.targetIds),
        surplusSummary: Y.compute.summarize(rC.states, rC.surplusIds)
      };

      st.groups.C_target = targetGid;
      st.groups.C_surplus = surplusGid;
      st.modeC.reservePct = reserveC;
      st.modeC.capPct = capC;
      st.modeC.surplusCapPct = scapC;
      st.modeC.ironDeltaPct = ironDeltaC;
    } else {
      Y.ui.setMsg('Unknown mode: ' + mode, '#b00');
      return;
    }

    st.orchestrator.mode = mode;
    Y.saveState();

    Y.ui.renderPlanTables(Y.runtime.plan, Y.runtime.snapshotsById);
    Y.ui.setMsg('Plan ready | Shipments: ' + ((Y.runtime.plan && Y.runtime.plan.shipments) ? Y.runtime.plan.shipments.length : 0), '#0a6');
  }

  function bbEscape(value) {
    return String(value == null ? '' : value)
      .replace(/\r?\n/g, ' ')
      .replace(/\|/g, '/')
      .trim();
  }

  function bbTable(headers, rows) {
    var lines = ['[table]'];
    lines.push('[**]' + headers.map(bbEscape).join('[||]') + '[/**]');
    if (!rows.length) {
      lines.push('[*]No data[/*]');
    } else {
      rows.forEach(function (row) {
        lines.push('[*]' + row.map(bbEscape).join('[|]') + '[/*]');
      });
    }
    lines.push('[/table]');
    return lines;
  }

  function formatRes(res) {
    return Y.formatTwNumber(res || 0);
  }

  function villageLabel(row) {
    if (!row) return '-';
    var suffix = row.coord ? ' (' + row.coord + ')' : '';
    return String(row.name || ('Village ' + row.id)) + suffix;
  }

  function buildPushMetaLines(plan, title) {
    var lines = ['[quote][b]Yaver Resource Orchestrator[/b] (' + Y.ts() + ')'];
    lines.push('[b]' + bbEscape(title) + '[/b]');
    lines.push('[list]');
    lines.push('[*][b]Mode[/b]: PARENTS -> CHILDREN');
    lines.push('[*][b]Computed Child Fill %[/b]: ' + (plan.meta.computedChildFillPct != null ? plan.meta.computedChildFillPct : '-') + '%');
    lines.push('[*][b]Children Max Fill %[/b]: ' + (plan.meta.childrenMaxFillPct != null ? plan.meta.childrenMaxFillPct : '-') + '%');
    lines.push('[*][b]Parent Reserve %[/b]: ' + (plan.meta.parentReservePct != null ? plan.meta.parentReservePct : '-') + '%');
    lines.push('[*][b]Surplus Cap %[/b]: ' + (plan.meta.surplusCapPct != null ? plan.meta.surplusCapPct : '-') + '%');
    lines.push('[*][b]Child Merch Used[/b]: ' + (plan.meta.childMerchantsUsed != null ? plan.meta.childMerchantsUsed : '-'));
    lines.push('[*][b]Parent Merch Used[/b]: ' + (plan.meta.parentMerchantsUsed != null ? plan.meta.parentMerchantsUsed : '-'));
    if (plan.meta.stopReason) lines.push('[*][b]Stop Reason[/b]: ' + bbEscape(plan.meta.stopReason));
    if (plan.meta.warnings && plan.meta.warnings.length) lines.push('[*][b]Warnings[/b]: ' + bbEscape(plan.meta.warnings.join(' | ')));
    lines.push('[/list]');
    return lines;
  }

  function buildBalanceMetaLines(plan, title) {
    var lines = ['[quote][b]Yaver Resource Orchestrator[/b] (' + Y.ts() + ')'];
    lines.push('[b]' + bbEscape(title) + '[/b]');
    lines.push('[list]');
    lines.push('[*][b]Mode[/b]: INTERNAL EQUALIZER');
    lines.push('[*][b]Computed Fill %[/b]: ' + (plan.meta.computedFillPct != null ? plan.meta.computedFillPct : '-') + '%');
    lines.push('[*][b]Cap Ceiling %[/b]: ' + (plan.meta.capPct != null ? plan.meta.capPct : '-') + '%');
    lines.push('[*][b]Surplus Cap %[/b]: ' + (plan.meta.surplusCapPct != null ? plan.meta.surplusCapPct : '-') + '%');
    lines.push('[*][b]Merch Used[/b]: ' + (plan.meta.merchantsUsed != null ? plan.meta.merchantsUsed : '-'));
    if (plan.meta.stopReason) lines.push('[*][b]Stop Reason[/b]: ' + bbEscape(plan.meta.stopReason));
    if (plan.meta.warnings && plan.meta.warnings.length) lines.push('[*][b]Warnings[/b]: ' + bbEscape(plan.meta.warnings.join(' | ')));
    lines.push('[/list]');
    return lines;
  }

  function buildGenericMetaLines(plan, title) {
    var modeLabel = String(plan.mode || '-').toUpperCase();
    var lines = ['[quote][b]Yaver Resource Orchestrator[/b] (' + Y.ts() + ')'];
    lines.push('[b]' + bbEscape(title) + '[/b]');
    lines.push('[list]');
    lines.push('[*][b]Mode[/b]: ' + modeLabel);
    if (plan.meta && plan.meta.cap != null) lines.push('[*][b]Cap %[/b]: ' + plan.meta.cap + '%');
    if (plan.meta && plan.meta.reserve != null) lines.push('[*][b]Reserve(each) %[/b]: ' + plan.meta.reserve + '%');
    if (plan.meta && plan.meta.scap != null) lines.push('[*][b]Surplus Cap %[/b]: ' + plan.meta.scap + '%');
    lines.push('[*][b]Shipments[/b]: ' + ((plan.shipments || []).length));
    lines.push('[/list]');
    return lines;
  }

  function buildChildrenTableBBCode(plan) {
    var lines = buildPushMetaLines(plan, 'CHILDREN');
    var rows = (plan.childSummary || []).map(function (r) {
      return [
        villageLabel(r),
        formatRes(r.storage),
        formatRes(r.targetEach || 0),
        formatRes(r.before.total),
        formatRes(r.sent.total),
        formatRes(r.recv.total),
        formatRes(r.after.total),
        formatRes(r.after.wood),
        formatRes(r.after.clay),
        formatRes(r.after.iron)
      ];
    });
    lines = lines.concat(bbTable(
      ['Village', 'Storage', 'Target Each', 'Before', 'Sent', 'Recv', 'After', 'Wood', 'Clay', 'Iron'],
      rows
    ));
    lines.push('[/quote]');
    return lines.join('\n');
  }

  function buildBalanceTargetTableBBCode(plan) {
    var lines = buildBalanceMetaLines(plan, 'TARGET GROUP');
    var rows = (plan.targetSummary || []).map(function (r) {
      return [
        villageLabel(r),
        formatRes(r.storage),
        formatRes(r.targetEach || 0),
        formatRes(r.before.total),
        formatRes(r.sent.total),
        formatRes(r.recv.total),
        formatRes(r.after.total),
        formatRes(r.after.wood),
        formatRes(r.after.clay),
        formatRes(r.after.iron),
        formatRes(r.merchUsed || 0)
      ];
    });
    lines = lines.concat(bbTable(
      ['Village', 'Storage', 'Target Each', 'Before', 'Sent', 'Recv', 'After', 'Wood', 'Clay', 'Iron', 'Merch Used'],
      rows
    ));
    lines.push('[/quote]');
    return lines.join('\n');
  }

  function buildParentsTableBBCode(plan) {
    var lines = buildPushMetaLines(plan, (plan.surplusSummary && plan.surplusSummary.length) ? 'PARENTS / SURPLUS' : 'PARENTS');
    var parentRows = (plan.parentSummary || []).map(function (r) {
      return [
        villageLabel(r),
        formatRes(r.storage),
        formatRes(r.reserveEach || 0),
        formatRes(r.before.total),
        formatRes(r.sent.total),
        formatRes(r.after.total),
        formatRes(r.after.wood),
        formatRes(r.after.clay),
        formatRes(r.after.iron),
        formatRes(r.spreadAfter || 0),
        formatRes(r.merchUsed || 0)
      ];
    });
    lines.push('[b]PARENTS[/b]');
    lines = lines.concat(bbTable(
      ['Village', 'Storage', 'Reserve Each', 'Before', 'Sent', 'After', 'Wood', 'Clay', 'Iron', 'Spread', 'Merch Used'],
      parentRows
    ));

    if (plan.surplusSummary && plan.surplusSummary.length) {
      var surplusRows = plan.surplusSummary.map(function (r) {
        return [
          villageLabel(r),
          formatRes(r.storage),
          formatRes(r.capEach || 0),
          formatRes(r.before.total),
          formatRes(r.sent.total),
          formatRes(r.recv.total),
          formatRes(r.after.total),
          formatRes(r.after.wood),
          formatRes(r.after.clay),
          formatRes(r.after.iron)
        ];
      });
      lines.push('[b]SURPLUS[/b]');
      lines = lines.concat(bbTable(
        ['Village', 'Storage', 'Cap Each', 'Before', 'Sent', 'Recv', 'After', 'Wood', 'Clay', 'Iron'],
        surplusRows
      ));
    }

    lines.push('[/quote]');
    return lines.join('\n');
  }

  function buildBalanceSurplusTableBBCode(plan) {
    var lines = buildBalanceMetaLines(plan, 'SURPLUS');
    var rows = (plan.surplusSummary || []).map(function (r) {
      return [
        villageLabel(r),
        formatRes(r.storage),
        formatRes(r.capEach || 0),
        formatRes(r.before.total),
        formatRes(r.sent.total),
        formatRes(r.recv.total),
        formatRes(r.after.total),
        formatRes(r.after.wood),
        formatRes(r.after.clay),
        formatRes(r.after.iron)
      ];
    });
    lines = lines.concat(bbTable(
      ['Village', 'Storage', 'Cap Each', 'Before', 'Sent', 'Recv', 'After', 'Wood', 'Clay', 'Iron'],
      rows
    ));
    lines.push('[/quote]');
    return lines.join('\n');
  }

  function buildGenericSummaryTableBBCode(plan, title, rows) {
    var lines = buildGenericMetaLines(plan, title);
    var tableRows = (rows || []).map(function (r) {
      return [
        villageLabel(r),
        formatRes(r.storage),
        formatRes(r.before.total),
        formatRes(r.sent.total),
        formatRes(r.recv.total),
        formatRes(r.after.total),
        formatRes(r.after.wood),
        formatRes(r.after.clay),
        formatRes(r.after.iron)
      ];
    });
    lines = lines.concat(bbTable(
      ['Village', 'Storage', 'Before', 'Sent', 'Recv', 'After', 'Wood', 'Clay', 'Iron'],
      tableRows
    ));
    lines.push('[/quote]');
    return lines.join('\n');
  }

  function buildShipmentsTableBBCode(plan) {
    var isPush = String(plan.mode || '').toLowerCase() === 'push';
    var isBalance = String(plan.mode || '').toLowerCase() === 'balance';
    var lines = isPush ? buildPushMetaLines(plan, 'SHIPMENTS') : (isBalance ? buildBalanceMetaLines(plan, 'SHIPMENTS') : buildGenericMetaLines(plan, 'SHIPMENTS'));

    if ((isPush || isBalance) && plan.meta && plan.meta.diagnostics && Array.isArray(plan.meta.diagnostics.lines) && plan.meta.diagnostics.lines.length) {
      lines.push('[b]Diagnostics[/b]');
      lines.push('[list]');
      plan.meta.diagnostics.lines.forEach(function (line) {
        lines.push('[*]' + bbEscape(line));
      });
      lines.push('[/list]');
    }

    var rows = (plan.shipments || []).map(function (s, idx) {
      var fromSnap = Y.runtime.snapshotsById[s.from];
      var toSnap = Y.runtime.snapshotsById[s.to];
      return [
        idx + 1,
        (fromSnap ? fromSnap.name : s.from) + ' [' + s.from + ']',
        (toSnap ? toSnap.name : s.to) + ' [' + s.to + ']',
        formatRes(s.wood),
        formatRes(s.clay),
        formatRes(s.iron),
        formatRes(s.total),
        formatRes(s.merch || Math.ceil((s.total || 0) / 1000)),
        s.tag || ''
      ];
    });
    lines = lines.concat(bbTable(
      ['#', 'From', 'To', 'Wood', 'Clay', 'Iron', 'Total', 'Merch', 'Tag'],
      rows
    ));
    lines.push('[/quote]');
    return lines.join('\n');
  }

  function copyText(text, successMsg) {
    var success = successMsg || 'Copied';
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        Y.ui.setMsg(success, '#0a6');
      }).catch(function () {
        window.prompt('Copy BBCode:', text);
      });
      return;
    }
    window.prompt('Copy BBCode:', text);
  }

  function flashButton(id, originalText) {
    var btn = Y.qs(id);
    if (!btn) return;
    var original = originalText || btn.textContent;
    btn.textContent = 'Copied';
    setTimeout(function () {
      if (btn) btn.textContent = original;
    }, 1200);
  }

  function copyPlanTargetBBCode() {
    var plan = Y.runtime.plan;
    if (!plan) {
      Y.ui.setMsg('No plan to copy.', '#b00');
      return;
    }

    var text;
    var mode = String(plan.mode || '').toLowerCase();
    if (mode === 'push') {
      text = buildChildrenTableBBCode(plan);
      flashButton('#yro_copy_plan_target_v26', 'Copy CHILDREN');
      copyText(text, 'CHILDREN BBCode copied');
      return;
    }
    if (mode === 'balance') {
      text = buildBalanceTargetTableBBCode(plan);
      flashButton('#yro_copy_plan_target_v26', 'Copy TARGET GROUP');
      copyText(text, 'TARGET GROUP BBCode copied');
      return;
    }

    text = buildGenericSummaryTableBBCode(plan, 'TARGET', plan.targetSummary || []);
    flashButton('#yro_copy_plan_target_v26', 'Copy TARGET');
    copyText(text, 'TARGET BBCode copied');
  }

  function copyPlanSurplusBBCode() {
    var plan = Y.runtime.plan;
    if (!plan) {
      Y.ui.setMsg('No plan to copy.', '#b00');
      return;
    }

    var text;
    var mode = String(plan.mode || '').toLowerCase();
    if (mode === 'push') {
      text = buildParentsTableBBCode(plan);
      flashButton(
        '#yro_copy_plan_surplus_v26',
        (plan.surplusSummary && plan.surplusSummary.length) ? 'Copy PARENTS / SURPLUS' : 'Copy PARENTS'
      );
      copyText(text, (plan.surplusSummary && plan.surplusSummary.length) ? 'PARENTS / SURPLUS BBCode copied' : 'PARENTS BBCode copied');
      return;
    }
    if (mode === 'balance') {
      text = buildBalanceSurplusTableBBCode(plan);
      flashButton('#yro_copy_plan_surplus_v26', 'Copy SURPLUS');
      copyText(text, 'SURPLUS BBCode copied');
      return;
    }

    text = buildGenericSummaryTableBBCode(plan, 'SURPLUS', plan.surplusSummary || []);
    flashButton('#yro_copy_plan_surplus_v26', 'Copy SURPLUS');
    copyText(text, 'SURPLUS BBCode copied');
  }

  function copyPlanShipmentsBBCode() {
    var plan = Y.runtime.plan;
    if (!plan) {
      Y.ui.setMsg('No plan to copy.', '#b00');
      return;
    }

    var text = buildShipmentsTableBBCode(plan);
    flashButton('#yro_copy_plan_ship_v26', 'Copy SHIPMENTS');
    copyText(text, 'SHIPMENTS BBCode copied');
  }

  function copyBBCode() {
    var plan = Y.runtime.plan || { shipments: [], meta: {} };
    var lines = ['[quote][b]Yaver Resource Orchestrator[/b] (' + Y.ts() + ')', '[list]'];
    lines.push('[*][b]Mode[/b]: ' + String(plan.mode || '-').toUpperCase());

    if (String(plan.mode || '').toLowerCase() === 'push' && plan.meta) {
      lines.push('[*][b]Computed Child Fill %[/b]: ' + (plan.meta.computedChildFillPct != null ? plan.meta.computedChildFillPct : '-') + '%');
      lines.push('[*][b]Children Max Fill %[/b]: ' + (plan.meta.childrenMaxFillPct != null ? plan.meta.childrenMaxFillPct : '-') + '%');
      lines.push('[*][b]Parent Reserve %[/b]: ' + (plan.meta.parentReservePct != null ? plan.meta.parentReservePct : '-') + '%');
      lines.push('[*][b]Surplus Cap %[/b]: ' + (plan.meta.surplusCapPct != null ? plan.meta.surplusCapPct : '-') + '%');
      lines.push('[*][b]Child Merch Used[/b]: ' + (plan.meta.childMerchantsUsed != null ? plan.meta.childMerchantsUsed : '-'));
      lines.push('[*][b]Parent Merch Used[/b]: ' + (plan.meta.parentMerchantsUsed != null ? plan.meta.parentMerchantsUsed : '-'));
      if (plan.meta.stopReason) lines.push('[*][b]Stop Reason[/b]: ' + bbEscape(plan.meta.stopReason));
      if (plan.meta.warnings && plan.meta.warnings.length) lines.push('[*][b]Warnings[/b]: ' + bbEscape(plan.meta.warnings.join(' | ')));
    } else if (String(plan.mode || '').toLowerCase() === 'balance' && plan.meta) {
      lines.push('[*][b]Computed Fill %[/b]: ' + (plan.meta.computedFillPct != null ? plan.meta.computedFillPct : '-') + '%');
      lines.push('[*][b]Cap Ceiling %[/b]: ' + (plan.meta.capPct != null ? plan.meta.capPct : '-') + '%');
      lines.push('[*][b]Surplus Cap %[/b]: ' + (plan.meta.surplusCapPct != null ? plan.meta.surplusCapPct : '-') + '%');
      lines.push('[*][b]Merch Used[/b]: ' + (plan.meta.merchantsUsed != null ? plan.meta.merchantsUsed : '-'));
      if (plan.meta.stopReason) lines.push('[*][b]Stop Reason[/b]: ' + bbEscape(plan.meta.stopReason));
      if (plan.meta.warnings && plan.meta.warnings.length) lines.push('[*][b]Warnings[/b]: ' + bbEscape(plan.meta.warnings.join(' | ')));
    } else {
      lines.push('[*][b]Cap %[/b]: ' + (plan.meta && plan.meta.cap != null ? plan.meta.cap : '-') + '%');
      lines.push('[*][b]Reserve(each) %[/b]: ' + (plan.meta && plan.meta.reserve != null ? plan.meta.reserve : '-') + '%');
      lines.push('[*][b]Surplus Cap %[/b]: ' + (plan.meta && plan.meta.scap != null ? plan.meta.scap : '-') + '%');
    }

    lines.push('[*][b]Shipments[/b]: ' + ((plan.shipments || []).length));
    lines.push('[/list]');

    if ((String(plan.mode || '').toLowerCase() === 'push' || String(plan.mode || '').toLowerCase() === 'balance') && plan.meta && plan.meta.diagnostics && Array.isArray(plan.meta.diagnostics.lines) && plan.meta.diagnostics.lines.length) {
      lines.push('[b]Diagnostics[/b]');
      lines.push('[list]');
      plan.meta.diagnostics.lines.forEach(function (line) {
        lines.push('[*]' + bbEscape(line));
      });
      lines.push('[/list]');
    }

    if (plan.shipments && plan.shipments.length) {
      lines.push('[b]Shipment Plan[/b]');
      lines = lines.concat(bbTable(
        ['#', 'From', 'To', 'Wood', 'Clay', 'Iron', 'Total', 'Merch', 'Tag'],
        plan.shipments.map(function (s, idx) {
          var fromSnap = Y.runtime.snapshotsById[s.from];
          var toSnap = Y.runtime.snapshotsById[s.to];
          return [
            idx + 1,
            (fromSnap ? fromSnap.name : s.from) + ' [' + s.from + ']',
            (toSnap ? toSnap.name : s.to) + ' [' + s.to + ']',
            formatRes(s.wood),
            formatRes(s.clay),
            formatRes(s.iron),
            formatRes(s.total),
            formatRes(s.merch || Math.ceil((s.total || 0) / 1000)),
            s.tag || ''
          ];
        })
      ));
    } else {
      lines.push('[i]No shipments.[/i]');
    }

    lines.push('[/quote]');
    copyText(lines.join('\n'), 'BBCode copied');
  }

  async function loadAll(force) {
    try {
      Y.ui.setMsg('Full Scan started...', '#b35b00');
      Y.ui.setProgress(0, 1, 'Preparing');

      await Y.fetch.fetchGroupsList(!!force);

      Y.ui.fillGroupSelects(Y.state.groups.list);
      Y.ui.buildModesBox(Y.state.groups.list);

      await Y.fetch.fullScanAllVillages(!!force, function (done, total, msg) {
        Y.ui.setProgress(done, total, msg);
      });

      await loadTables(false);

      Y.ui.setProgress(1, 1, 'Ready');
      Y.ui.setMsg('Ready (Full Scan completed)', '#0a6');
    } catch (e) {
      Y.err('loadAll failed', e);
      Y.ui.setMsg('Error (check console log)', '#b00');
    }
  }

  function bindEvents() {
    var st = Y.state;

    Y.on(Y.qs('#yro_close_v26'), 'click', function () { Y.destroy(); });
    Y.on(Y.qs('#yro_load_v26'), 'click', function () { loadAll(true); });

    var search = Y.qs('#yro_search_v26');
    if (search) {
      search.value = st.ui.search || '';
      Y.on(search, 'input', Y.debounce(function () {
        st.ui.search = search.value || '';
        Y.saveState();
        loadTables(false);
      }, 160));
    }

    Y.on(Y.qs('#yro_t1_toggle_v26'), 'click', function () {
      st.ui.minimized1 = !st.ui.minimized1;
      var w = Y.qs('#yro_t1_wrap_v26');
      if (w) w.style.display = st.ui.minimized1 ? 'none' : '';
      var b = Y.qs('#yro_t1_toggle_v26');
      if (b) b.textContent = st.ui.minimized1 ? 'Expand' : 'Minimize';
      Y.saveState();
    });

    Y.on(Y.qs('#yro_t2_toggle_v26'), 'click', function () {
      st.ui.minimized2 = !st.ui.minimized2;
      var w = Y.qs('#yro_t2_wrap_v26');
      if (w) w.style.display = st.ui.minimized2 ? 'none' : '';
      var b = Y.qs('#yro_t2_toggle_v26');
      if (b) b.textContent = st.ui.minimized2 ? 'Expand' : 'Minimize';
      Y.saveState();
    });

    Y.on(Y.qs('#yro_t1_group_sel_v26'), 'change', function (e) {
      st.groups.sel1 = Y.safeInt(e.target.value, 0);
      Y.saveState();
      loadTables(true);
    });

    Y.on(Y.qs('#yro_t2_group_sel_v26'), 'change', function (e) {
      st.groups.sel2 = Y.safeInt(e.target.value, 0);
      Y.saveState();
      loadTables(true);
    });

    Y.on(Y.qs('#yro_t1_pick_v26'), 'click', function () { openPicker('t1'); });
    Y.on(Y.qs('#yro_t2_pick_v26'), 'click', function () { openPicker('t2'); });
    Y.on(Y.qs('#yro_copy_bb_v26'), 'click', function () { copyBBCode(); });
    Y.on(Y.qs('#yro_copy_plan_target_v26'), 'click', function () { copyPlanTargetBBCode(); });
    Y.on(Y.qs('#yro_copy_plan_surplus_v26'), 'click', function () { copyPlanSurplusBBCode(); });
    Y.on(Y.qs('#yro_copy_plan_ship_v26'), 'click', function () { copyPlanShipmentsBBCode(); });

    var modeBox = Y.qs('#yro_modes_v26');
    if (!modeBox) return;

    Y.on(modeBox, 'click', function (e) {
      var t = e.target;
      if (!t) return;

      if (t.id === 'yro_A_plan_v26') return planFromMode('balance');
      if (t.id === 'yro_B_plan_v26') return planFromMode('push');
      if (t.id === 'yro_C_plan_v26') return planFromMode('funnel');

      if (t.id === 'yro_A_exec_v26' || t.id === 'yro_B_exec_v26' || t.id === 'yro_C_exec_v26') return executePlan();

      if (String(t.id || '').startsWith('pick_') && String(t.id || '').endsWith('_v26')) {
        var key = String(t.id).replace('pick_', '').replace('_v26', '');
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
          Y.qsa('#yro_modes_v26 .yro_mode_row').forEach(function (r) { r.classList.remove('active'); });
          row.classList.add('active');
        }
      }
    });

    Y.on(modeBox, 'change', function (e) {
      var t = e.target;
      if (!t || !t.id) return;

      if (t.id === 'yro_A_target_v26') st.groups.A_target = Y.safeInt(t.value, 0);
      else if (t.id === 'yro_A_surplus_v26') st.groups.A_surplus = Y.safeInt(t.value, 0);
      else if (t.id === 'yro_B_parents_v26') st.groups.B_parents = Y.safeInt(t.value, 0);
      else if (t.id === 'yro_B_children_v26') st.groups.B_children = Y.safeInt(t.value, 0);
      else if (t.id === 'yro_B_surplus_v26') st.groups.B_surplus = Y.safeInt(t.value, 0);
      else if (t.id === 'yro_C_target_v26') st.groups.C_target = Y.safeInt(t.value, 0);
      else if (t.id === 'yro_C_surplus_v26') st.groups.C_surplus = Y.safeInt(t.value, 0);
      else if (t.id === 'yro_A_cap_v26') st.modeA.capPct = Y.safeInt(t.value, st.modeA.capPct);
      else if (t.id === 'yro_A_scap_v26') st.modeA.surplusCapPct = Y.safeInt(t.value, st.modeA.surplusCapPct);
      else if (t.id === 'yro_B_parent_reserve_v26') st.modeB.parentReservePct = Y.safeInt(t.value, st.modeB.parentReservePct);
      else if (t.id === 'yro_B_child_max_v26') st.modeB.childrenMaxFillPct = Y.safeInt(t.value, st.modeB.childrenMaxFillPct);
      else if (t.id === 'yro_B_scap_v26') st.modeB.surplusCapPct = Y.safeInt(t.value, st.modeB.surplusCapPct);
      else if (t.id === 'yro_C_reserve_v26') st.modeC.reservePct = Y.safeInt(t.value, st.modeC.reservePct);
      else if (t.id === 'yro_C_cap_v26') st.modeC.capPct = Y.safeInt(t.value, st.modeC.capPct);
      else if (t.id === 'yro_C_scap_v26') st.modeC.surplusCapPct = Y.safeInt(t.value, st.modeC.surplusCapPct);
      else if (t.id === 'yro_C_iron_v26') st.modeC.ironDeltaPct = String(t.value).trim() === '' ? null : Y.safeInt(t.value, 0);

      Y.saveState();
    });
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
      Y.ui.setMsg('Ready (cache available) - run Full Scan if you want fresh data', '#0a6');
    }
  }

  Y.init = init;
  Y.log('main module loaded');
})();
