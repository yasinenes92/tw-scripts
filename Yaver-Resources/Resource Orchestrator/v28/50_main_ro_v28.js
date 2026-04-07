(function () {
  'use strict';

  var Y = window.YRO_V28;
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
    var t1title = Y.qs('#yro_t1_title_v28');
    if (t1title) t1title.textContent = groupNameById(t1gid);

    var t2gid = Y.safeInt(st.groups.sel2, 0);
    var t2ids = await resolveSelection(t2gid, 't2', forceGroupFetch);
    var t2title = Y.qs('#yro_t2_title_v28');
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
      UI.ConfirmationBox(htmlMsg, actions, 'yro_exec_v28', true);
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
    if (mode === 'funnel') mode = 'coin';
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
      targetGid = getSelValue('#yro_A_target_v28');
      surplusGid = getSelValue('#yro_A_surplus_v28');
      var capA = getNumValue('#yro_A_cap_v28', st.modeA.capPct || 80);
      var scapA = getNumValue('#yro_A_scap_v28', st.modeA.surplusCapPct || 95);

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
      var parentGid = getSelValue('#yro_B_parents_v28');
      var childGid = getSelValue('#yro_B_children_v28');
      surplusGid = getSelValue('#yro_B_surplus_v28');
      var parentReservePct = getNumValue('#yro_B_parent_reserve_v28', st.modeB.parentReservePct || 1);
      var childrenMaxFillPct = getNumValue('#yro_B_child_max_v28', st.modeB.childrenMaxFillPct || 80);
      var surplusCapPct = getNumValue('#yro_B_scap_v28', st.modeB.surplusCapPct || 95);

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
    } else if (mode === 'coin') {
      var sourceGid = getSelValue('#yro_C_sources_v28');
      var coinGid = getSelValue('#yro_C_coin_v28');
      var bufferGid = getSelValue('#yro_C_buffer_v28');
      var sourceReservePct = getNumValue('#yro_C_reserve_v28', st.modeC.sourceReservePct || 1);
      var bufferCapPct = getNumValue('#yro_C_bcap_v28', st.modeC.bufferCapPct || 95);

      var sourceIds = await resolveSelection(sourceGid, 'C_sources', true);
      var coinIds = await resolveSelection(coinGid, 'C_coin', true);
      var bufferIds = await resolveSelection(bufferGid, 'C_buffer', true);

      Y.ui.setMsg('Mode C: reading academy coin costs...', '#b35b00');
      var coinCosts = await Y.fetch.fetchCoinCostsForVillages(coinIds, true, function (done, total, msg) {
        Y.ui.setProgress(done, total || 1, msg || 'Reading academy costs');
      });

      Y.runtime.plan = Y.compute.planCoin(
        sourceIds,
        coinIds,
        bufferIds,
        Y.runtime.snapshotsById,
        st.cache.incomingMap,
        coinCosts,
        sourceReservePct,
        bufferCapPct
      );

      if (Y.runtime.plan && Y.runtime.plan.meta) {
        Y.runtime.plan.meta.sourceGid = sourceGid;
        Y.runtime.plan.meta.coinGid = coinGid;
        Y.runtime.plan.meta.bufferGid = bufferGid;
      }

      st.groups.C_sources = sourceGid;
      st.groups.C_coin = coinGid;
      st.groups.C_buffer = bufferGid;
      st.modeC.sourceReservePct = sourceReservePct;
      st.modeC.bufferCapPct = bufferCapPct;
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

  function buildCoinMetaLines(plan, title) {
    var lines = ['[quote][b]Yaver Resource Orchestrator[/b] (' + Y.ts() + ')'];
    lines.push('[b]' + bbEscape(title) + '[/b]');
    lines.push('[list]');
    lines.push('[*][b]Mode[/b]: COIN MAXIMIZER');
    lines.push('[*][b]Baseline Coins[/b]: ' + (plan.meta.baselineCoinsTotal != null ? plan.meta.baselineCoinsTotal : '-'));
    lines.push('[*][b]Projected Coins[/b]: ' + (plan.meta.projectedCoinsTotal != null ? plan.meta.projectedCoinsTotal : '-'));
    lines.push('[*][b]Additional Coins[/b]: ' + (plan.meta.additionalCoins != null ? plan.meta.additionalCoins : '-'));
    lines.push('[*][b]Source Reserve %[/b]: ' + (plan.meta.sourceReservePct != null ? plan.meta.sourceReservePct : '-') + '%');
    lines.push('[*][b]Buffer Cap %[/b]: ' + (plan.meta.bufferCapPct != null ? plan.meta.bufferCapPct : '-') + '%');
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

  function buildCoinTableBBCode(plan) {
    var lines = buildCoinMetaLines(plan, 'COIN VILLAGES');
    var rows = (plan.coinSummary || []).map(function (r) {
      return [
        villageLabel(r),
        formatRes(r.storage),
        r.coinCost ? (formatRes(r.coinCost.wood) + '/' + formatRes(r.coinCost.clay) + '/' + formatRes(r.coinCost.iron)) : '-',
        formatRes(r.baselineCoins || 0),
        formatRes(r.projectedCoins || 0),
        formatRes(r.additionalCoins || 0),
        formatRes((r.nextDeficit && r.nextDeficit.total) || 0),
        formatRes(r.before.total),
        formatRes(r.sent.total),
        formatRes(r.recv.total),
        formatRes(r.after.total)
      ];
    });
    lines = lines.concat(bbTable(
      ['Village', 'Storage', 'Coin Cost', 'Base Coins', 'Projected Coins', '+Coins', 'Next Deficit', 'Before', 'Sent', 'Recv', 'After'],
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

  function buildCoinSourcesBufferBBCode(plan) {
    var lines = buildCoinMetaLines(plan, (plan.bufferSummary && plan.bufferSummary.length) ? 'SOURCES / BUFFER' : 'SOURCES');
    var sourceRows = (plan.sourceSummary || []).map(function (r) {
      return [
        villageLabel(r),
        formatRes(r.storage),
        formatRes(r.reserveEach || 0),
        formatRes(r.before.total),
        formatRes(r.sent.total),
        formatRes(r.recv.total),
        formatRes(r.after.total),
        formatRes((r.availableLeft && r.availableLeft.total) || 0),
        formatRes(r.merchUsed || 0)
      ];
    });
    lines.push('[b]SOURCES[/b]');
    lines = lines.concat(bbTable(
      ['Village', 'Storage', 'Reserve Each', 'Before', 'Sent', 'Recv', 'After', 'Available Left', 'Merch Used'],
      sourceRows
    ));

    if (plan.bufferSummary && plan.bufferSummary.length) {
      var bufferRows = plan.bufferSummary.map(function (r) {
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
      lines.push('[b]BUFFER[/b]');
      lines = lines.concat(bbTable(
        ['Village', 'Storage', 'Cap Each', 'Before', 'Sent', 'Recv', 'After', 'Wood', 'Clay', 'Iron'],
        bufferRows
      ));
    }

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
    var isCoin = String(plan.mode || '').toLowerCase() === 'coin';
    var lines = isPush ? buildPushMetaLines(plan, 'SHIPMENTS') : (isBalance ? buildBalanceMetaLines(plan, 'SHIPMENTS') : (isCoin ? buildCoinMetaLines(plan, 'SHIPMENTS') : buildGenericMetaLines(plan, 'SHIPMENTS')));

    if ((isPush || isBalance || isCoin) && plan.meta && plan.meta.diagnostics && Array.isArray(plan.meta.diagnostics.lines) && plan.meta.diagnostics.lines.length) {
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

  function copyText(text, successMsg, promptLabel) {
    var success = successMsg || 'Copied';
    var label = promptLabel || 'Copy BBCode:';
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        Y.ui.setMsg(success, '#0a6');
      }).catch(function () {
        window.prompt(label, text);
      });
      return;
    }
    window.prompt(label, text);
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
      flashButton('#yro_copy_plan_target_v28', 'Copy CHILDREN');
      copyText(text, 'CHILDREN BBCode copied');
      return;
    }
    if (mode === 'balance') {
      text = buildBalanceTargetTableBBCode(plan);
      flashButton('#yro_copy_plan_target_v28', 'Copy TARGET GROUP');
      copyText(text, 'TARGET GROUP BBCode copied');
      return;
    }
    if (mode === 'coin') {
      text = buildCoinTableBBCode(plan);
      flashButton('#yro_copy_plan_target_v28', 'Copy COIN VILLAGES');
      copyText(text, 'COIN VILLAGES BBCode copied');
      return;
    }

    text = buildGenericSummaryTableBBCode(plan, 'TARGET', plan.targetSummary || []);
    flashButton('#yro_copy_plan_target_v28', 'Copy TARGET');
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
        '#yro_copy_plan_surplus_v28',
        (plan.surplusSummary && plan.surplusSummary.length) ? 'Copy PARENTS / SURPLUS' : 'Copy PARENTS'
      );
      copyText(text, (plan.surplusSummary && plan.surplusSummary.length) ? 'PARENTS / SURPLUS BBCode copied' : 'PARENTS BBCode copied');
      return;
    }
    if (mode === 'balance') {
      text = buildBalanceSurplusTableBBCode(plan);
      flashButton('#yro_copy_plan_surplus_v28', 'Copy SURPLUS');
      copyText(text, 'SURPLUS BBCode copied');
      return;
    }
    if (mode === 'coin') {
      text = buildCoinSourcesBufferBBCode(plan);
      flashButton('#yro_copy_plan_surplus_v28', (plan.bufferSummary && plan.bufferSummary.length) ? 'Copy SOURCES / BUFFER' : 'Copy SOURCES');
      copyText(text, (plan.bufferSummary && plan.bufferSummary.length) ? 'SOURCES / BUFFER BBCode copied' : 'SOURCES BBCode copied');
      return;
    }

    text = buildGenericSummaryTableBBCode(plan, 'SURPLUS', plan.surplusSummary || []);
    flashButton('#yro_copy_plan_surplus_v28', 'Copy SURPLUS');
    copyText(text, 'SURPLUS BBCode copied');
  }

  function copyPlanShipmentsBBCode() {
    var plan = Y.runtime.plan;
    if (!plan) {
      Y.ui.setMsg('No plan to copy.', '#b00');
      return;
    }

    var text = buildShipmentsTableBBCode(plan);
    flashButton('#yro_copy_plan_ship_v28', 'Copy SHIPMENTS');
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
    } else if (String(plan.mode || '').toLowerCase() === 'coin' && plan.meta) {
      lines.push('[*][b]Baseline Coins[/b]: ' + (plan.meta.baselineCoinsTotal != null ? plan.meta.baselineCoinsTotal : '-'));
      lines.push('[*][b]Projected Coins[/b]: ' + (plan.meta.projectedCoinsTotal != null ? plan.meta.projectedCoinsTotal : '-'));
      lines.push('[*][b]Additional Coins[/b]: ' + (plan.meta.additionalCoins != null ? plan.meta.additionalCoins : '-'));
      lines.push('[*][b]Source Reserve %[/b]: ' + (plan.meta.sourceReservePct != null ? plan.meta.sourceReservePct : '-') + '%');
      lines.push('[*][b]Buffer Cap %[/b]: ' + (plan.meta.bufferCapPct != null ? plan.meta.bufferCapPct : '-') + '%');
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

    if ((String(plan.mode || '').toLowerCase() === 'push' || String(plan.mode || '').toLowerCase() === 'balance' || String(plan.mode || '').toLowerCase() === 'coin') && plan.meta && plan.meta.diagnostics && Array.isArray(plan.meta.diagnostics.lines) && plan.meta.diagnostics.lines.length) {
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

  function mdEscape(value) {
    return String(value == null ? '' : value)
      .replace(/\r?\n/g, '<br>')
      .replace(/\|/g, '\\|')
      .trim();
  }

  function mdTable(headers, rows) {
    var out = [];
    out.push('| ' + headers.map(mdEscape).join(' | ') + ' |');
    out.push('| ' + headers.map(function () { return '---'; }).join(' | ') + ' |');
    (rows || []).forEach(function (row) {
      out.push('| ' + row.map(mdEscape).join(' | ') + ' |');
    });
    return out.join('\n');
  }

  function mdKeyValueTable(rows) {
    return mdTable(['Key', 'Value'], rows || []);
  }

  function yesNo(flag) {
    return flag ? 'yes' : 'no';
  }

  function getCurrentScreen() {
    try {
      if (window.game_data && game_data.screen) return String(game_data.screen);
    } catch (e1) {}
    try {
      var sp = new URLSearchParams(window.location.search);
      return String(sp.get('screen') || '-');
    } catch (e2) {}
    return '-';
  }

  function getWorldHostText() {
    var world = '';
    try {
      if (window.game_data && game_data.world) world = String(game_data.world);
    } catch (e1) {}
    var host = '';
    try {
      host = String(window.location.host || '');
    } catch (e2) {}
    if (world && host) return world + ' / ' + host;
    return world || host || '-';
  }

  function getActiveModeKey() {
    var active = Y.qs('#yro_modes_v28 .yro_mode_row.active');
    var mode = active && active.getAttribute ? String(active.getAttribute('data-mode') || '') : String(Y.state.orchestrator.mode || '');
    mode = mode.toLowerCase();
    if (mode === 'funnel') mode = 'coin';
    return mode || '-';
  }

  function activeModeLabel(mode) {
    mode = String(mode || '').toLowerCase();
    if (mode === 'balance') return 'Mode A: Internal Equalizer';
    if (mode === 'push') return 'Mode B: Parents -> Children';
    if (mode === 'coin') return 'Mode C: Coin Maximizer';
    return String(mode || '-').toUpperCase();
  }

  function getSelectText(selector, fallbackGroupId) {
    var el = Y.qs(selector);
    if (el && el.options && el.selectedIndex >= 0 && el.options[el.selectedIndex]) {
      return String(el.options[el.selectedIndex].textContent || el.options[el.selectedIndex].innerText || '').trim() || groupNameById(fallbackGroupId);
    }
    return groupNameById(fallbackGroupId);
  }

  function getInputText(selector, fallback) {
    var el = Y.qs(selector);
    if (el && el.value != null) return String(el.value).trim();
    return String(fallback == null ? '' : fallback);
  }

  function buildRunMetadataRows() {
    var snapshots = Y.runtime.snapshotsById || {};
    var plan = Y.runtime.plan;
    return [
      ['Version', Y.cfg.VERSION || 'v28'],
      ['Timestamp', Y.ts()],
      ['World / host', getWorldHostText()],
      ['Current village id', String(Y.getCurrentVillageId() || '-')],
      ['Current screen', getCurrentScreen()],
      ['Active mode', activeModeLabel(getActiveModeKey())],
      ['Scan available?', yesNo(Object.keys(snapshots).length > 0)],
      ['Plan available?', yesNo(!!(plan && plan.meta))]
    ];
  }

  function buildCurrentModeInputRows() {
    var st = Y.state;
    var mode = getActiveModeKey();
    if (mode === 'balance') {
      return [
        ['Mode', activeModeLabel(mode)],
        ['Target', getSelectText('#yro_A_target_v28', st.groups.A_target)],
        ['Surplus', getSelectText('#yro_A_surplus_v28', st.groups.A_surplus)],
        ['Cap %', getInputText('#yro_A_cap_v28', st.modeA.capPct)],
        ['Surplus Cap %', getInputText('#yro_A_scap_v28', st.modeA.surplusCapPct)]
      ];
    }
    if (mode === 'push') {
      return [
        ['Mode', activeModeLabel(mode)],
        ['Parents', getSelectText('#yro_B_parents_v28', st.groups.B_parents)],
        ['Children', getSelectText('#yro_B_children_v28', st.groups.B_children)],
        ['Surplus', getSelectText('#yro_B_surplus_v28', st.groups.B_surplus)],
        ['Parent Reserve %', getInputText('#yro_B_parent_reserve_v28', st.modeB.parentReservePct)],
        ['Children Max Fill %', getInputText('#yro_B_child_max_v28', st.modeB.childrenMaxFillPct)],
        ['Surplus Cap %', getInputText('#yro_B_scap_v28', st.modeB.surplusCapPct)]
      ];
    }
    if (mode === 'coin') {
      return [
        ['Mode', activeModeLabel(mode)],
        ['Sources', getSelectText('#yro_C_sources_v28', st.groups.C_sources)],
        ['Coin', getSelectText('#yro_C_coin_v28', st.groups.C_coin)],
        ['Buffer / Surplus', getSelectText('#yro_C_buffer_v28', st.groups.C_buffer)],
        ['Source Reserve %', getInputText('#yro_C_reserve_v28', st.modeC.sourceReservePct)],
        ['Buffer Cap %', getInputText('#yro_C_bcap_v28', st.modeC.bufferCapPct)]
      ];
    }
    return [['Mode', activeModeLabel(mode)]];
  }

  function sortVillageSnapshots(villageIds) {
    var rows = [];
    (villageIds || []).forEach(function (vid) {
      var s = Y.runtime.snapshotsById[vid];
      if (s) rows.push(s);
    });
    rows.sort(function (a, b) { return String(a.name || '').localeCompare(String(b.name || '')); });
    return rows;
  }

  function buildTable1Markdown(villageIds) {
    var rows = sortVillageSnapshots(villageIds);
    if (!rows.length) return null;

    var headers = ['Village', 'Storage', 'Merch (free/total)', 'Wood /h', 'Clay /h', 'Iron /h', '/h Total', 'Wood 24h', 'Clay 24h', 'Iron 24h', '24h Total'];
    var data = [];
    var sumWH = 0, sumCH = 0, sumIH = 0;
    var sumW24 = 0, sumC24 = 0, sumI24 = 0;

    rows.forEach(function (v) {
      sumWH += v.prodH.wood || 0;
      sumCH += v.prodH.clay || 0;
      sumIH += v.prodH.iron || 0;
      sumW24 += v.prod24.wood || 0;
      sumC24 += v.prod24.clay || 0;
      sumI24 += v.prod24.iron || 0;
      data.push([
        String(v.name || ('Village ' + v.id)),
        formatRes(v.storage || 0),
        formatRes((v.merch && v.merch.free) || 0) + '/' + formatRes((v.merch && v.merch.total) || 0),
        formatRes(v.prodH.wood || 0),
        formatRes(v.prodH.clay || 0),
        formatRes(v.prodH.iron || 0),
        formatRes(v.prodH.total || 0),
        formatRes(v.prod24.wood || 0),
        formatRes(v.prod24.clay || 0),
        formatRes(v.prod24.iron || 0),
        formatRes(v.prod24.total || 0)
      ]);
    });

    data.push([
      'TOTAL (' + rows.length + ' villages)',
      '',
      '',
      formatRes(sumWH),
      formatRes(sumCH),
      formatRes(sumIH),
      formatRes(sumWH + sumCH + sumIH),
      formatRes(sumW24),
      formatRes(sumC24),
      formatRes(sumI24),
      formatRes(sumW24 + sumC24 + sumI24)
    ]);

    return mdTable(headers, data);
  }

  function buildTable2Markdown(villageIds, incomingAllByVid, incomingExternalByVid, outgoingByVid) {
    var rows = [];
    (villageIds || []).forEach(function (vid) {
      var s = Y.runtime.snapshotsById[vid];
      if (!s) return;
      rows.push({
        snap: s,
        incAll: incomingAllByVid && incomingAllByVid[vid] ? incomingAllByVid[vid] : { wood: 0, clay: 0, iron: 0, total: 0 },
        incExt: incomingExternalByVid && incomingExternalByVid[vid] ? incomingExternalByVid[vid] : { wood: 0, clay: 0, iron: 0, total: 0 },
        out: outgoingByVid && outgoingByVid[vid] ? outgoingByVid[vid] : { wood: 0, clay: 0, iron: 0, total: 0 }
      });
    });
    rows.sort(function (a, b) { return String(a.snap.name || '').localeCompare(String(b.snap.name || '')); });
    if (!rows.length) return null;

    var headers = [
      'Village', 'Storage', 'Merch (free/total)',
      'Wood Now', 'Clay Now', 'Iron Now', 'Now Total',
      'Wood Incoming', 'Clay Incoming', 'Iron Incoming', 'In Total',
      'Wood Out', 'Clay Out', 'Iron Out', 'Out Total',
      'Eff (Now+In)', 'In External'
    ];

    var data = [];
    var totals = {
      storage: 0,
      merchFree: 0,
      merchTotal: 0,
      nowW: 0, nowC: 0, nowI: 0, nowT: 0,
      inW: 0, inC: 0, inI: 0, inT: 0,
      outW: 0, outC: 0, outI: 0, outT: 0,
      effT: 0,
      extT: 0
    };

    rows.forEach(function (r) {
      var v = r.snap;
      var now = v.resNow || { wood: 0, clay: 0, iron: 0, total: 0 };
      var effTotal = (now.total || 0) + (r.incAll.total || 0);

      totals.storage += v.storage || 0;
      totals.merchFree += (v.merch && v.merch.free) || 0;
      totals.merchTotal += (v.merch && v.merch.total) || 0;
      totals.nowW += now.wood || 0;
      totals.nowC += now.clay || 0;
      totals.nowI += now.iron || 0;
      totals.nowT += now.total || 0;
      totals.inW += r.incAll.wood || 0;
      totals.inC += r.incAll.clay || 0;
      totals.inI += r.incAll.iron || 0;
      totals.inT += r.incAll.total || 0;
      totals.outW += r.out.wood || 0;
      totals.outC += r.out.clay || 0;
      totals.outI += r.out.iron || 0;
      totals.outT += r.out.total || 0;
      totals.effT += effTotal;
      totals.extT += r.incExt.total || 0;

      data.push([
        String(v.name || ('Village ' + v.id)),
        formatRes(v.storage || 0),
        formatRes((v.merch && v.merch.free) || 0) + '/' + formatRes((v.merch && v.merch.total) || 0),
        formatRes(now.wood || 0),
        formatRes(now.clay || 0),
        formatRes(now.iron || 0),
        formatRes(now.total || 0),
        formatRes(r.incAll.wood || 0),
        formatRes(r.incAll.clay || 0),
        formatRes(r.incAll.iron || 0),
        formatRes(r.incAll.total || 0),
        formatRes(r.out.wood || 0),
        formatRes(r.out.clay || 0),
        formatRes(r.out.iron || 0),
        formatRes(r.out.total || 0),
        formatRes(effTotal),
        formatRes(r.incExt.total || 0)
      ]);
    });

    data.push([
      'TOTAL (' + rows.length + ' villages)',
      formatRes(totals.storage),
      formatRes(totals.merchFree) + '/' + formatRes(totals.merchTotal),
      formatRes(totals.nowW),
      formatRes(totals.nowC),
      formatRes(totals.nowI),
      formatRes(totals.nowT),
      formatRes(totals.inW),
      formatRes(totals.inC),
      formatRes(totals.inI),
      formatRes(totals.inT),
      formatRes(totals.outW),
      formatRes(totals.outC),
      formatRes(totals.outI),
      formatRes(totals.outT),
      formatRes(totals.effT),
      formatRes(totals.extT)
    ]);

    return mdTable(headers, data);
  }

  function findGroupByName(name) {
    var wanted = Y.normalizeGroupName(name);
    var groups = Y.state.groups.list || [];
    for (var i = 0; i < groups.length; i++) {
      if (Y.normalizeGroupName(groups[i].name) === wanted) return groups[i];
    }
    return null;
  }

  async function buildScanTablesByGroupMarkdown() {
    var requiredGroups = ['Parents 2', 'Parents 3', 'Children 2', 'Children 3', 'Surplus 2', 'Surplus 3', 'Coin 2', 'Coin 3'];
    var lines = ['## Scan Tables by Group', ''];
    var scanAvailable = Object.keys(Y.runtime.snapshotsById || {}).length > 0;
    var incomingMap = Y.state.cache.incomingMap || {};
    var outByVid = outgoingByVillageFromMap(Y.state.cache.outgoingMap || {});

    await Y.fetch.fetchGroupsList(false);

    for (var i = 0; i < requiredGroups.length; i++) {
      var groupName = requiredGroups[i];
      lines.push('### Group: ' + groupName);
      var group = findGroupByName(groupName);
      var ids = [];
      var groupError = '';

      if (group) {
        try {
          ids = await Y.fetch.fetchVillageIdsForGroup(group.id, false);
        } catch (e) {
          groupError = e && e.message ? e.message : 'Group village fetch failed.';
        }
      }

      lines.push('#### Table 1');
      if (!group) {
        lines.push('Group not found.');
      } else if (groupError) {
        lines.push('Could not read group villages: ' + groupError);
      } else if (!scanAvailable) {
        lines.push('Scan not available.');
      } else if (!ids.length) {
        lines.push('Group exists but has no villages.');
      } else {
        var table1 = buildTable1Markdown(ids);
        lines.push(table1 || 'Group exists but has no scanned rows.');
      }
      lines.push('');

      lines.push('#### Table 2');
      if (!group) {
        lines.push('Group not found.');
      } else if (groupError) {
        lines.push('Could not read group villages: ' + groupError);
      } else if (!scanAvailable) {
        lines.push('Scan not available.');
      } else if (!ids.length) {
        lines.push('Group exists but has no villages.');
      } else {
        var inc = Y.compute.computeIncomingForSet(ids, incomingMap);
        var table2 = buildTable2Markdown(ids, inc.allByVid, inc.externalByVid, outByVid);
        lines.push(table2 || 'Group exists but has no scanned rows.');
      }
      lines.push('');
    }

    return lines.join('\n');
  }

  function buildActivePlanMetadataMarkdown(plan) {
    var lines = ['## Active Plan Metadata', ''];
    if (!plan || !plan.meta) {
      lines.push('No current plan available.');
      return lines.join('\n');
    }

    var mode = String(plan.mode || '').toLowerCase();
    var rows = [['Mode', activeModeLabel(mode)], ['Shipments', String((plan.shipments || []).length)]];

    if (mode === 'balance') {
      rows.push(['Computed Fill %', String(plan.meta.computedFillPct != null ? plan.meta.computedFillPct : '-')]);
      rows.push(['Cap Ceiling %', String(plan.meta.capPct != null ? plan.meta.capPct : '-')]);
      rows.push(['Surplus Cap %', String(plan.meta.surplusCapPct != null ? plan.meta.surplusCapPct : '-')]);
      rows.push(['Merch Used', String(plan.meta.merchantsUsed != null ? plan.meta.merchantsUsed : '-')]);
    } else if (mode === 'push') {
      rows.push(['Computed Child Fill %', String(plan.meta.computedChildFillPct != null ? plan.meta.computedChildFillPct : '-')]);
      rows.push(['Children Max Fill %', String(plan.meta.childrenMaxFillPct != null ? plan.meta.childrenMaxFillPct : '-')]);
      rows.push(['Parent Reserve %', String(plan.meta.parentReservePct != null ? plan.meta.parentReservePct : '-')]);
      rows.push(['Surplus Cap %', String(plan.meta.surplusCapPct != null ? plan.meta.surplusCapPct : '-')]);
      rows.push(['Child Merch Used', String(plan.meta.childMerchantsUsed != null ? plan.meta.childMerchantsUsed : '-')]);
      rows.push(['Parent Merch Used', String(plan.meta.parentMerchantsUsed != null ? plan.meta.parentMerchantsUsed : '-')]);
    } else if (mode === 'coin') {
      rows.push(['Baseline Coins', String(plan.meta.baselineCoinsTotal != null ? plan.meta.baselineCoinsTotal : '-')]);
      rows.push(['Projected Coins', String(plan.meta.projectedCoinsTotal != null ? plan.meta.projectedCoinsTotal : '-')]);
      rows.push(['Additional Coins', String(plan.meta.additionalCoins != null ? plan.meta.additionalCoins : '-')]);
      rows.push(['Source Reserve %', String(plan.meta.sourceReservePct != null ? plan.meta.sourceReservePct : '-')]);
      rows.push(['Buffer Cap %', String(plan.meta.bufferCapPct != null ? plan.meta.bufferCapPct : '-')]);
      rows.push(['Merch Used', String(plan.meta.merchantsUsed != null ? plan.meta.merchantsUsed : '-')]);
    }

    rows.push(['Stop Reason', plan.meta.stopReason || '-']);
    rows.push(['Warnings', plan.meta.warnings && plan.meta.warnings.length ? plan.meta.warnings.join(' | ') : '-']);
    lines.push(mdKeyValueTable(rows));
    return lines.join('\n');
  }

  function buildMarkdownSection(title, headers, rows, emptyText) {
    var lines = ['### ' + title, ''];
    if (!rows || !rows.length) {
      lines.push(emptyText || 'No rows.');
    } else {
      lines.push(mdTable(headers, rows));
    }
    return lines.join('\n');
  }

  function buildPlanShipmentsRows(plan) {
    return (plan.shipments || []).map(function (s, idx) {
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
  }

  function buildActivePlanMainTablesMarkdown(plan) {
    var lines = ['## Active Plan Main Tables', ''];
    if (!plan || !plan.meta) {
      lines.push('No current plan available.');
      return lines.join('\n');
    }

    var mode = String(plan.mode || '').toLowerCase();
    if (mode === 'balance') {
      lines.push(buildMarkdownSection(
        'TARGET GROUP',
        ['Village', 'Storage', 'Target Each', 'Before', 'Sent', 'Recv', 'After', 'Wood', 'Clay', 'Iron', 'Merch Used'],
        (plan.targetSummary || []).map(function (r) {
          return [
            String(r.name || ('Village ' + r.id)),
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
        }),
        'No target rows.'
      ));
      lines.push('');
      lines.push(buildMarkdownSection(
        'SURPLUS',
        ['Village', 'Storage', 'Cap Each', 'Before', 'Sent', 'Recv', 'After', 'Wood', 'Clay', 'Iron'],
        (plan.surplusSummary || []).map(function (r) {
          return [
            String(r.name || ('Village ' + r.id)),
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
        }),
        'No surplus rows.'
      ));
    } else if (mode === 'push') {
      lines.push(buildMarkdownSection(
        'CHILDREN',
        ['Village', 'Storage', 'Target Each', 'Before', 'Sent', 'Recv', 'After', 'Wood', 'Clay', 'Iron'],
        (plan.childSummary || []).map(function (r) {
          return [
            String(r.name || ('Village ' + r.id)),
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
        }),
        'No child rows.'
      ));
      lines.push('');
      lines.push(buildMarkdownSection(
        'PARENTS',
        ['Village', 'Storage', 'Reserve Each', 'Before', 'Sent', 'After', 'Wood', 'Clay', 'Iron', 'Spread', 'Merch Used'],
        (plan.parentSummary || []).map(function (r) {
          return [
            String(r.name || ('Village ' + r.id)),
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
        }),
        'No parent rows.'
      ));
      if (plan.surplusSummary && plan.surplusSummary.length) {
        lines.push('');
        lines.push(buildMarkdownSection(
          'SURPLUS',
          ['Village', 'Storage', 'Cap Each', 'Before', 'Sent', 'Recv', 'After', 'Wood', 'Clay', 'Iron'],
          plan.surplusSummary.map(function (r) {
            return [
              String(r.name || ('Village ' + r.id)),
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
          }),
          'No surplus rows.'
        ));
      }
    } else if (mode === 'coin') {
      lines.push(buildMarkdownSection(
        'COIN VILLAGES',
        ['Village', 'Storage', 'Coin Cost', 'Base Coins', 'Projected Coins', '+Coins', 'Next Deficit', 'Before', 'Sent', 'Recv', 'After'],
        (plan.coinSummary || []).map(function (r) {
          return [
            String(r.name || ('Village ' + r.id)),
            formatRes(r.storage),
            r.coinCost ? (formatRes(r.coinCost.wood) + '/' + formatRes(r.coinCost.clay) + '/' + formatRes(r.coinCost.iron)) : '-',
            formatRes(r.baselineCoins || 0),
            formatRes(r.projectedCoins || 0),
            formatRes(r.additionalCoins || 0),
            formatRes((r.nextDeficit && r.nextDeficit.total) || 0),
            formatRes(r.before.total),
            formatRes(r.sent.total),
            formatRes(r.recv.total),
            formatRes(r.after.total)
          ];
        }),
        'No coin rows.'
      ));
      lines.push('');
      lines.push(buildMarkdownSection(
        'SOURCES',
        ['Village', 'Storage', 'Reserve Each', 'Before', 'Sent', 'Recv', 'After', 'Available Left', 'Merch Used'],
        (plan.sourceSummary || []).map(function (r) {
          return [
            String(r.name || ('Village ' + r.id)),
            formatRes(r.storage),
            formatRes(r.reserveEach || 0),
            formatRes(r.before.total),
            formatRes(r.sent.total),
            formatRes(r.recv.total),
            formatRes(r.after.total),
            formatRes((r.availableLeft && r.availableLeft.total) || 0),
            formatRes(r.merchUsed || 0)
          ];
        }),
        'No source rows.'
      ));
      if (plan.bufferSummary && plan.bufferSummary.length) {
        lines.push('');
        lines.push(buildMarkdownSection(
          'BUFFER / SURPLUS',
          ['Village', 'Storage', 'Cap Each', 'Before', 'Sent', 'Recv', 'After', 'Wood', 'Clay', 'Iron'],
          plan.bufferSummary.map(function (r) {
            return [
              String(r.name || ('Village ' + r.id)),
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
          }),
          'No buffer rows.'
        ));
      }
    } else {
      lines.push('No current plan available.');
      return lines.join('\n');
    }

    lines.push('');
    lines.push(buildMarkdownSection(
      'SHIPMENTS',
      ['#', 'From', 'To', 'Wood', 'Clay', 'Iron', 'Total', 'Merch', 'Tag'],
      buildPlanShipmentsRows(plan),
      'No shipments.'
    ));

    return lines.join('\n');
  }

  function buildDiagnosticsMarkdown(plan) {
    var lines = ['## Diagnostics', ''];
    if (!plan || !plan.meta) {
      lines.push('- No current diagnostics available.');
      return lines.join('\n');
    }

    var seen = Object.create(null);
    var items = [];

    function add(text) {
      text = String(text || '').trim();
      if (!text || seen[text]) return;
      seen[text] = true;
      items.push(text);
    }

    (plan.meta.warnings || []).forEach(add);
    if (plan.meta.stopReason) add('Stop reason: ' + plan.meta.stopReason);
    if (plan.meta.diagnostics && Array.isArray(plan.meta.diagnostics.lines)) {
      plan.meta.diagnostics.lines.forEach(add);
    }

    if (!items.length) {
      lines.push('- Diagnostics: -');
    } else {
      items.forEach(function (item) {
        lines.push('- ' + item);
      });
    }
    return lines.join('\n');
  }

  async function buildTestResultsMarkdown() {
    var plan = Y.runtime.plan;
    var parts = [
      '# YRO Test Results',
      '',
      '## Run Metadata',
      '',
      mdKeyValueTable(buildRunMetadataRows()),
      '',
      '## Current Mode Inputs',
      '',
      mdKeyValueTable(buildCurrentModeInputRows()),
      '',
      await buildScanTablesByGroupMarkdown(),
      '',
      buildActivePlanMetadataMarkdown(plan),
      '',
      buildActivePlanMainTablesMarkdown(plan),
      '',
      buildDiagnosticsMarkdown(plan)
    ];
    return parts.join('\n').replace(/\n{3,}/g, '\n\n');
  }

  async function copyTestResults() {
    try {
      Y.ui.setMsg('Preparing Markdown test export...', '#b35b00');
      var markdown = await buildTestResultsMarkdown();
      flashButton('#yro_copy_bb_v28', 'Copy Test Results');
      copyText(markdown, 'Test results markdown copied', 'Copy Test Results:');
    } catch (e) {
      Y.err('copyTestResults failed', e);
      Y.ui.setMsg('Test export failed (check console log)', '#b00');
    }
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

    Y.on(Y.qs('#yro_close_v28'), 'click', function () { Y.destroy(); });
    Y.on(Y.qs('#yro_load_v28'), 'click', function () { loadAll(true); });

    var search = Y.qs('#yro_search_v28');
    if (search) {
      search.value = st.ui.search || '';
      Y.on(search, 'input', Y.debounce(function () {
        st.ui.search = search.value || '';
        Y.saveState();
        loadTables(false);
      }, 160));
    }

    Y.on(Y.qs('#yro_t1_toggle_v28'), 'click', function () {
      st.ui.minimized1 = !st.ui.minimized1;
      var w = Y.qs('#yro_t1_wrap_v28');
      if (w) w.style.display = st.ui.minimized1 ? 'none' : '';
      var b = Y.qs('#yro_t1_toggle_v28');
      if (b) b.textContent = st.ui.minimized1 ? 'Expand' : 'Minimize';
      Y.saveState();
    });

    Y.on(Y.qs('#yro_t2_toggle_v28'), 'click', function () {
      st.ui.minimized2 = !st.ui.minimized2;
      var w = Y.qs('#yro_t2_wrap_v28');
      if (w) w.style.display = st.ui.minimized2 ? 'none' : '';
      var b = Y.qs('#yro_t2_toggle_v28');
      if (b) b.textContent = st.ui.minimized2 ? 'Expand' : 'Minimize';
      Y.saveState();
    });

    Y.on(Y.qs('#yro_t1_group_sel_v28'), 'change', function (e) {
      st.groups.sel1 = Y.safeInt(e.target.value, 0);
      Y.saveState();
      loadTables(true);
    });

    Y.on(Y.qs('#yro_t2_group_sel_v28'), 'change', function (e) {
      st.groups.sel2 = Y.safeInt(e.target.value, 0);
      Y.saveState();
      loadTables(true);
    });

    Y.on(Y.qs('#yro_t1_pick_v28'), 'click', function () { openPicker('t1'); });
    Y.on(Y.qs('#yro_t2_pick_v28'), 'click', function () { openPicker('t2'); });
    Y.on(Y.qs('#yro_copy_bb_v28'), 'click', function () { copyTestResults(); });
    Y.on(Y.qs('#yro_copy_plan_target_v28'), 'click', function () { copyPlanTargetBBCode(); });
    Y.on(Y.qs('#yro_copy_plan_surplus_v28'), 'click', function () { copyPlanSurplusBBCode(); });
    Y.on(Y.qs('#yro_copy_plan_ship_v28'), 'click', function () { copyPlanShipmentsBBCode(); });

    var modeBox = Y.qs('#yro_modes_v28');
    if (!modeBox) return;

    Y.on(modeBox, 'click', function (e) {
      var t = e.target;
      if (!t) return;

      if (t.id === 'yro_A_plan_v28') return planFromMode('balance');
      if (t.id === 'yro_B_plan_v28') return planFromMode('push');
      if (t.id === 'yro_C_plan_v28') return planFromMode('coin');

      if (t.id === 'yro_A_exec_v28' || t.id === 'yro_B_exec_v28' || t.id === 'yro_C_exec_v28') return executePlan();

      if (String(t.id || '').startsWith('pick_') && String(t.id || '').endsWith('_v28')) {
        var key = String(t.id).replace('pick_', '').replace('_v28', '');
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
          Y.qsa('#yro_modes_v28 .yro_mode_row').forEach(function (r) { r.classList.remove('active'); });
          row.classList.add('active');
        }
      }
    });

    Y.on(modeBox, 'change', function (e) {
      var t = e.target;
      if (!t || !t.id) return;

      if (t.id === 'yro_A_target_v28') st.groups.A_target = Y.safeInt(t.value, 0);
      else if (t.id === 'yro_A_surplus_v28') st.groups.A_surplus = Y.safeInt(t.value, 0);
      else if (t.id === 'yro_B_parents_v28') st.groups.B_parents = Y.safeInt(t.value, 0);
      else if (t.id === 'yro_B_children_v28') st.groups.B_children = Y.safeInt(t.value, 0);
      else if (t.id === 'yro_B_surplus_v28') st.groups.B_surplus = Y.safeInt(t.value, 0);
      else if (t.id === 'yro_C_sources_v28') st.groups.C_sources = Y.safeInt(t.value, 0);
      else if (t.id === 'yro_C_coin_v28') st.groups.C_coin = Y.safeInt(t.value, 0);
      else if (t.id === 'yro_C_buffer_v28') st.groups.C_buffer = Y.safeInt(t.value, 0);
      else if (t.id === 'yro_A_cap_v28') st.modeA.capPct = Y.safeInt(t.value, st.modeA.capPct);
      else if (t.id === 'yro_A_scap_v28') st.modeA.surplusCapPct = Y.safeInt(t.value, st.modeA.surplusCapPct);
      else if (t.id === 'yro_B_parent_reserve_v28') st.modeB.parentReservePct = Y.safeInt(t.value, st.modeB.parentReservePct);
      else if (t.id === 'yro_B_child_max_v28') st.modeB.childrenMaxFillPct = Y.safeInt(t.value, st.modeB.childrenMaxFillPct);
      else if (t.id === 'yro_B_scap_v28') st.modeB.surplusCapPct = Y.safeInt(t.value, st.modeB.surplusCapPct);
      else if (t.id === 'yro_C_reserve_v28') st.modeC.sourceReservePct = Y.safeInt(t.value, st.modeC.sourceReservePct);
      else if (t.id === 'yro_C_bcap_v28') st.modeC.bufferCapPct = Y.safeInt(t.value, st.modeC.bufferCapPct);

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

