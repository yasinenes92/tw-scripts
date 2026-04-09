(function () {
  'use strict';

  const SCRIPT = {
    key: 'CREATING_TABLES_V1',
    name: 'Creating Tables',
    version: '1.0.0',
    author: 'Controleng',
  };

  if (window.CREATING_TABLES_V1 && window.CREATING_TABLES_V1.version === SCRIPT.version) {
    window.CREATING_TABLES_V1.show();
    return;
  }

  const REQUIRED_GROUPS = [
    'Children 2',
    'Children 3',
    'Parents 2',
    'Parents 3',
    'Surplus 2',
    'Surplus 3',
    'Coin 2',
    'Coin 3',
  ];

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function parseHTML(html) {
    return new DOMParser().parseFromString(html, 'text/html');
  }

  function toIntLoose(value) {
    const digits = String(value == null ? '' : value).replace(/[^\d]/g, '');
    return digits ? parseInt(digits, 10) : 0;
  }

  function fmtDot(n) {
    const s = String(Math.trunc(Number(n) || 0));
    return s.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }

  function zeroRes() {
    return { wood: 0, stone: 0, iron: 0, total: 0 };
  }

  function cloneRes(r) {
    return {
      wood: Number(r && r.wood) || 0,
      stone: Number(r && r.stone) || 0,
      iron: Number(r && r.iron) || 0,
      total: Number(r && r.total) || 0,
    };
  }

  function addRes(a, b) {
    return {
      wood: (a.wood || 0) + (b.wood || 0),
      stone: (a.stone || 0) + (b.stone || 0),
      iron: (a.iron || 0) + (b.iron || 0),
      total: (a.total || 0) + (b.total || 0),
    };
  }

  function makeRes(wood, stone, iron) {
    const w = Number(wood) || 0;
    const c = Number(stone) || 0;
    const i = Number(iron) || 0;
    return { wood: w, stone: c, iron: i, total: w + c + i };
  }

  async function httpGet(url) {
    const sep = url.includes('?') ? '&' : '?';
    const u = url + sep + 'ctv1=' + Date.now() + '_' + Math.random().toString(16).slice(2);

    if (window.fetch) {
      const res = await fetch(u, { credentials: 'include', cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status} (${url})`);
      return await res.text();
    }

    if (window.$ && $.ajax) {
      return await new Promise((resolve, reject) => {
        $.ajax({
          url: u,
          method: 'GET',
          cache: false,
          success: resolve,
          error: (xhr, _s, err) => reject(new Error(String(err || xhr.status || 'ajax error'))),
        });
      });
    }

    throw new Error('No fetch and no jQuery available');
  }

  function copyTextRaw(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    return Promise.resolve();
  }

  function getBaseVillageId() {
    const gd = window.game_data || {};
    const id = gd && gd.village && gd.village.id;
    if (!id) throw new Error('game_data.village.id not found');
    return String(id);
  }

  function normalizeGroupName(name) {
    return String(name || '')
      .replace(/[><\[\]]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }

  function parseVillageNameFromRow(tr) {
    const label = tr.querySelector('.quickedit-label');
    const dataText = label && label.getAttribute('data-text');
    if (dataText && dataText.trim()) {
      const maybeLink = tr.querySelector('a[href*="screen=overview"]');
      const linkText = maybeLink ? maybeLink.textContent.trim() : '';
      if (linkText && linkText.includes('(')) return linkText;
      return dataText.trim();
    }
    const link = tr.querySelector('a[href*="screen=overview"]');
    return link ? link.textContent.trim() : '';
  }

  function getVillageListFromCombined(combinedHtml) {
    const doc = parseHTML(combinedHtml);
    const table = doc.querySelector('#combined_table');
    if (!table) throw new Error('combined_table not found');

    const rows = Array.from(table.querySelectorAll('tr.nowrap'));
    const villages = [];

    for (const tr of rows) {
      const idEl = tr.querySelector('.quickedit-vn[data-id]');
      const id = idEl ? String(idEl.getAttribute('data-id') || '') : '';
      if (!id) continue;
      const name = parseVillageNameFromRow(tr) || `Village ${id}`;
      villages.push({ id, name });
    }

    const seen = new Set();
    return villages.filter((v) => {
      if (seen.has(v.id)) return false;
      seen.add(v.id);
      return true;
    });
  }

  function parseMerchantsText(txt) {
    const raw = String(txt || '').trim();
    const m = raw.match(/^\s*([\d.\s]+)\s*\/\s*([\d.\s]+)\s*$/);
    if (!m) return { free: 0, total: 0, text: '—' };
    const free = toIntLoose(m[1]);
    const total = toIntLoose(m[2]);
    return { free, total, text: `${free}/${total}` };
  }

  function getMerchantsMapFromProd(prodHtml) {
    const doc = parseHTML(prodHtml);
    const table = doc.querySelector('#production_table');
    if (!table) throw new Error('production_table not found');

    const rows = Array.from(table.querySelectorAll('tr.nowrap'));
    const map = Object.create(null);

    for (const tr of rows) {
      const idEl = tr.querySelector('.quickedit-vn[data-id]');
      const id = idEl ? String(idEl.getAttribute('data-id') || '') : '';
      if (!id) continue;
      const marketLink = tr.querySelector('a[href*="screen=market"]');
      map[id] = parseMerchantsText(marketLink ? marketLink.textContent : '');
    }

    return map;
  }

  function extractCurrentResources(doc) {
    const wood = toIntLoose(doc.getElementById('wood') && doc.getElementById('wood').textContent);
    const stone = toIntLoose(doc.getElementById('stone') && doc.getElementById('stone').textContent);
    const iron = toIntLoose(doc.getElementById('iron') && doc.getElementById('iron').textContent);
    const storage = toIntLoose(doc.getElementById('storage') && doc.getElementById('storage').textContent);
    return {
      current: makeRes(wood, stone, iron),
      storage,
    };
  }

  function parseVillageIdFromHref(href, paramName) {
    if (!href) return '';
    try {
      const u = new URL(href, location.origin);
      return String(u.searchParams.get(paramName) || '');
    } catch (_e) {
      const m = href.match(new RegExp(paramName + '=([0-9]+)'));
      return m ? String(m[1]) : '';
    }
  }

  function extractResFromCell(td) {
    if (!td) return zeroRes();
    const out = zeroRes();
    const spans = Array.from(td.querySelectorAll('span.nowrap'));
    if (!spans.length) {
      const text = td.textContent || '';
      const nums = text.match(/[\d.]+/g) || [];
      if (nums.length >= 3) return makeRes(toIntLoose(nums[0]), toIntLoose(nums[1]), toIntLoose(nums[2]));
      return zeroRes();
    }

    for (const span of spans) {
      const icon = span.querySelector('.icon');
      const cls = icon ? String(icon.className || '') : '';
      const val = toIntLoose(span.textContent || '');
      if (/\bwood\b/.test(cls)) out.wood += val;
      else if (/\bstone\b/.test(cls)) out.stone += val;
      else if (/\biron\b/.test(cls)) out.iron += val;
    }

    out.total = out.wood + out.stone + out.iron;
    return out;
  }

  function parseIncomingRowsFromOverviewInc(doc) {
    const table = doc.querySelector('#trades_table');
    if (!table) return [];

    const rows = [];
    for (const tr of Array.from(table.querySelectorAll('tr.row_a, tr.row_b'))) {
      const tds = Array.from(tr.querySelectorAll('td'));
      if (tds.length < 8) continue;

      const targetLink = tds[4] && tds[4].querySelector('a[href*="screen=info_village"]');
      const targetId = parseVillageIdFromHref(targetLink && targetLink.getAttribute('href'), 'id');
      if (!targetId) continue;

      const resources = extractResFromCell(tds[8] || tds[tds.length - 1]);
      rows.push({
        targetId,
        resources,
      });
    }
    return rows;
  }

  async function fetchIncomingByVillage(baseVillageId, state) {
    const byVillage = Object.create(null);
    const pageSize = 100;
    let totalRows = 0;

    for (let page = 0; page < 25; page++) {
      if (state.cancelled) break;
      state.setStatus(`Loading incoming overview page ${page + 1}…`);

      const url =
        `/game.php?village=${baseVillageId}` +
        `&screen=overview_villages&mode=trader&type=inc&group=0&page_size=${pageSize}&page=${page}`;

      const html = await httpGet(url);
      const doc = parseHTML(html);
      const rows = parseIncomingRowsFromOverviewInc(doc);
      if (!rows.length) break;

      for (const row of rows) {
        if (!byVillage[row.targetId]) byVillage[row.targetId] = zeroRes();
        byVillage[row.targetId] = addRes(byVillage[row.targetId], row.resources);
      }

      totalRows += rows.length;
      if (rows.length < pageSize) break;
      await sleep(state.delayMs);
    }

    return {
      byVillage,
      totalRows,
    };
  }

  function parseGroupsMap(groupsHtml) {
    const doc = parseHTML(groupsHtml);
    const table = doc.querySelector('#group_assign_table');
    if (!table) throw new Error('group_assign_table not found');

    const map = Object.create(null);

    for (const tr of Array.from(table.querySelectorAll('tr'))) {
      const idEl = tr.querySelector('.quickedit-vn[data-id]');
      if (!idEl) continue;
      const id = String(idEl.getAttribute('data-id') || '');
      if (!id) continue;

      const groupsCell = tr.querySelector('[id^="assigned_groups_"][id$="_names"]');
      const raw = groupsCell ? groupsCell.textContent.trim() : '';
      const groups = raw
        ? raw.split(';').map((s) => s.trim()).filter(Boolean)
        : [];

      map[id] = {
        raw,
        groups,
        normalizedSet: new Set(groups.map(normalizeGroupName)),
      };
    }

    return map;
  }

  function computeTotals(rows) {
    const totals = {
      current: zeroRes(),
      incoming: zeroRes(),
      effective: zeroRes(),
      storage: 0,
      merchantsFree: 0,
      merchantsTotal: 0,
    };

    for (const row of rows || []) {
      totals.current = addRes(totals.current, row.current);
      totals.incoming = addRes(totals.incoming, row.incoming);
      totals.effective = addRes(totals.effective, row.effective);
      totals.storage += Number(row.storage) || 0;
      totals.merchantsFree += Number(row.merchants && row.merchants.free) || 0;
      totals.merchantsTotal += Number(row.merchants && row.merchants.total) || 0;
    }

    return totals;
  }

  function tableHeaders() {
    return [
      'Village',
      'Wood Now',
      'Clay Now',
      'Iron Now',
      'Now Total',
      'Storage',
      'Merchants',
      'Wood In',
      'Clay In',
      'Iron In',
      'Incoming Total',
      'Wood Eff',
      'Clay Eff',
      'Iron Eff',
      'Eff Total',
    ];
  }

  function rowToArray(row) {
    return [
      row.name,
      fmtDot(row.current.wood),
      fmtDot(row.current.stone),
      fmtDot(row.current.iron),
      fmtDot(row.current.total),
      fmtDot(row.storage),
      row.merchants.text,
      fmtDot(row.incoming.wood),
      fmtDot(row.incoming.stone),
      fmtDot(row.incoming.iron),
      fmtDot(row.incoming.total),
      fmtDot(row.effective.wood),
      fmtDot(row.effective.stone),
      fmtDot(row.effective.iron),
      fmtDot(row.effective.total),
    ];
  }

  function totalsToArray(rows, totals) {
    return [
      `TOTAL (${rows.length} villages)`,
      fmtDot(totals.current.wood),
      fmtDot(totals.current.stone),
      fmtDot(totals.current.iron),
      fmtDot(totals.current.total),
      fmtDot(totals.storage),
      `${fmtDot(totals.merchantsFree)}/${fmtDot(totals.merchantsTotal)}`,
      fmtDot(totals.incoming.wood),
      fmtDot(totals.incoming.stone),
      fmtDot(totals.incoming.iron),
      fmtDot(totals.incoming.total),
      fmtDot(totals.effective.wood),
      fmtDot(totals.effective.stone),
      fmtDot(totals.effective.iron),
      fmtDot(totals.effective.total),
    ];
  }

  function renderTableInto(tableEl, rows) {
    if (!tableEl) return;
    const headers = tableHeaders();
    const totals = computeTotals(rows);

    let html = '<thead><tr>' +
      headers.map((h, idx) => `<th${idx === 0 ? ' style="text-align:left"' : ''}>${h}</th>`).join('') +
      '</tr></thead><tbody>';

    rows.forEach((row, idx) => {
      const arr = rowToArray(row);
      html += `<tr class="${idx % 2 === 0 ? 'row_a' : 'row_b'}">`;
      arr.forEach((cell, cidx) => {
        if (cidx === 0) {
          html += `<td class="nowrap" style="text-align:left"><a href="/game.php?village=${row.id}&screen=overview" target="_blank" rel="noopener noreferrer">${cell}</a></td>`;
        } else {
          html += `<td>${cell}</td>`;
        }
      });
      html += '</tr>';
    });

    const totalArr = totalsToArray(rows, totals);
    html += '<tr class="yct_total_row">';
    totalArr.forEach((cell, idx) => {
      if (idx === 0) html += `<td style="text-align:left"><b>${cell}</b></td>`;
      else html += `<td><b>${cell}</b></td>`;
    });
    html += '</tr></tbody>';
    tableEl.innerHTML = html;
  }

  function buildGroupSectionHTML(groupName) {
    const idSafe = groupName.toLowerCase().replace(/[^a-z0-9]+/g, '_');
    return `
      <div class="vis_item yct_group_box">
        <div class="yct_group_title">${groupName}</div>
        <table class="vis overview_table yct_table" id="yct_group_${idSafe}"></table>
      </div>
    `;
  }

  function buildUI() {
    const groupsHTML = REQUIRED_GROUPS.map(buildGroupSectionHTML).join('');

    const html = `
      <div id="yct_root" style="display:inline-block;">
        <div class="vis" style="padding:8px; display:inline-block; overflow-x:auto; max-width:calc(100vw - 40px);">
          <h2 style="margin:4px 0 10px 0;">
            ${SCRIPT.name} <span class="grey">v${SCRIPT.version}</span>
            <span class="grey" style="float:right; font-size:12px; margin-top:6px;">Developed by ${SCRIPT.author}</span>
          </h2>

          <div class="vis_item" style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
            <a href="#" class="btn" id="yct_scan">Scan all villages</a>
            <a href="#" class="btn" id="yct_stop">Stop</a>
            <a href="#" class="btn" id="yct_copy_results">Copy Table Results (JSON)</a>
            <a href="#" class="btn" id="yct_export_console">Export JSON (console)</a>
            <span id="yct_status" class="grey" style="margin-left:6px;">Ready.</span>
          </div>

          <div class="vis_item yct_group_box" style="margin-top:8px;">
            <div class="yct_group_title">All Villages</div>
            <table class="vis overview_table yct_table" id="yct_main_table"></table>
          </div>

          <div id="yct_group_tables" style="margin-top:8px;">
            ${groupsHTML}
          </div>

          <style>
            #yct_root .yct_table { white-space: nowrap; width: auto !important; table-layout: auto; }
            #yct_root .yct_table th,
            #yct_root .yct_table td { padding: 2px 6px; text-align: center; }
            #yct_root .yct_table td:first-child,
            #yct_root .yct_table th:first-child { text-align: left; }
            #yct_root .yct_table tr:hover td { background: rgba(255,255,0,0.08); }
            #yct_root .yct_total_row td {
              border-top: 2px solid rgba(0,0,0,0.25);
              background: rgba(255,255,255,0.18);
              font-weight: bold;
            }
            #yct_root .yct_group_box { margin-top: 8px; }
            #yct_root .yct_group_title {
              font-weight: bold;
              margin: 0 0 6px 0;
              font-size: 13px;
            }
          </style>
        </div>
      </div>
    `;

    if (window.Dialog && typeof Dialog.show === 'function') {
      Dialog.show(SCRIPT.key, html);
    } else {
      const wrap = document.createElement('div');
      wrap.innerHTML = html;
      document.body.appendChild(wrap);
    }

    setTimeout(() => {
      const box = document.getElementById('popup_box_' + SCRIPT.key);
      if (box) {
        box.style.width = 'auto';
        box.style.maxWidth = 'none';
      }
      const content = box ? box.querySelector('.popup_box_content') : null;
      if (content) {
        content.style.width = 'auto';
        content.style.maxWidth = 'none';
      }
    }, 0);
  }

  function setStatus(text) {
    const el = document.getElementById('yct_status');
    if (el) el.textContent = text;
  }

  function buildCopyPayload(state) {
    const mainRows = state.lastRows || [];
    const mainTotals = computeTotals(mainRows);

    const groups = REQUIRED_GROUPS.map((groupName) => {
      const rows = mainRows.filter((row) => row.groupSet && row.groupSet.has(normalizeGroupName(groupName)));
      return {
        group: groupName,
        rows: rows.map((row) => ({
          id: row.id,
          name: row.name,
          current: cloneRes(row.current),
          storage: row.storage,
          merchants: { free: row.merchants.free, total: row.merchants.total, text: row.merchants.text },
          incoming: cloneRes(row.incoming),
          effective: cloneRes(row.effective),
          groups: (row.groups || []).slice(),
        })),
        totals: computeTotals(rows),
      };
    });

    return {
      script: {
        name: SCRIPT.name,
        version: SCRIPT.version,
        generatedAt: new Date().toISOString(),
      },
      main: {
        headers: tableHeaders(),
        rows: mainRows.map((row) => ({
          id: row.id,
          name: row.name,
          current: cloneRes(row.current),
          storage: row.storage,
          merchants: { free: row.merchants.free, total: row.merchants.total, text: row.merchants.text },
          incoming: cloneRes(row.incoming),
          effective: cloneRes(row.effective),
          groups: (row.groups || []).slice(),
        })),
        totals: mainTotals,
      },
      groups,
    };
  }

  async function scanAll(state) {
    state.cancelled = false;
    state.lastRows = null;
    state.lastPayload = null;

    const baseVillageId = getBaseVillageId();

    setStatus('Loading combined overview…');
    const combinedHtml = await httpGet(`/game.php?village=${baseVillageId}&screen=overview_villages&mode=combined&group=0&page_size=100`);
    const villages = getVillageListFromCombined(combinedHtml);
    if (!villages.length) throw new Error('No villages found in combined overview.');

    setStatus('Loading production overview…');
    const prodHtml = await httpGet(`/game.php?village=${baseVillageId}&screen=overview_villages&mode=prod&group=0&page_size=100`);
    const merchantsMap = getMerchantsMapFromProd(prodHtml);

    setStatus('Loading groups overview…');
    const groupsHtml = await httpGet(`/game.php?village=${baseVillageId}&screen=overview_villages&mode=groups&type=static&group=0&page_size=100`);
    const groupsMap = parseGroupsMap(groupsHtml);

    const incomingResult = await fetchIncomingByVillage(baseVillageId, {
      cancelled: state.cancelled,
      delayMs: state.delayMs,
      setStatus,
    });
    const incomingByVillage = incomingResult.byVillage || {};

    const rows = [];

    for (let i = 0; i < villages.length; i++) {
      if (state.cancelled) {
        setStatus(`Stopped. Scanned ${rows.length}/${villages.length}.`);
        break;
      }

      const v = villages[i];
      setStatus(`Scanning ${i + 1}/${villages.length}: ${v.name} …`);

      try {
        const overviewHtml = await httpGet(`/game.php?village=${v.id}&screen=overview`);
        const doc = parseHTML(overviewHtml);
        const extracted = extractCurrentResources(doc);
        const current = extracted.current;
        const incoming = cloneRes(incomingByVillage[v.id] || zeroRes());
        incoming.total = incoming.wood + incoming.stone + incoming.iron;
        const effective = addRes(current, incoming);
        const merchants = merchantsMap[v.id] || { free: 0, total: 0, text: '—' };
        const groupInfo = groupsMap[v.id] || { groups: [], normalizedSet: new Set() };

        rows.push({
          id: v.id,
          name: v.name,
          current,
          storage: extracted.storage || 0,
          merchants,
          incoming,
          effective,
          groups: groupInfo.groups || [],
          groupSet: groupInfo.normalizedSet || new Set(),
        });
      } catch (e) {
        rows.push({
          id: v.id,
          name: v.name + ' (ERR)',
          current: zeroRes(),
          storage: 0,
          merchants: merchantsMap[v.id] || { free: 0, total: 0, text: '—' },
          incoming: cloneRes(incomingByVillage[v.id] || zeroRes()),
          effective: cloneRes(incomingByVillage[v.id] || zeroRes()),
          groups: (groupsMap[v.id] && groupsMap[v.id].groups) || [],
          groupSet: (groupsMap[v.id] && groupsMap[v.id].normalizedSet) || new Set(),
          error: String(e),
        });
        console.error('[Creating_Tables_v1] village scan error:', v, e);
      }

      if (state.delayMs > 0) await sleep(state.delayMs);
    }

    rows.sort((a, b) => {
      const na = a.name || '';
      const nb = b.name || '';
      return na.localeCompare(nb, undefined, { numeric: true, sensitivity: 'base' });
    });

    state.lastRows = rows;
    state.lastPayload = buildCopyPayload(state);

    renderTableInto(document.getElementById('yct_main_table'), rows);

    for (const groupName of REQUIRED_GROUPS) {
      const idSafe = groupName.toLowerCase().replace(/[^a-z0-9]+/g, '_');
      const el = document.getElementById('yct_group_' + idSafe);
      const groupRows = rows.filter((row) => row.groupSet && row.groupSet.has(normalizeGroupName(groupName)));
      renderTableInto(el, groupRows);
    }

    setStatus(`Done. Scanned ${rows.length} villages. Incoming rows read: ${incomingResult.totalRows || 0}.`);
    if (window.UI && UI.SuccessMessage) {
      UI.SuccessMessage(`Creating Tables v1: ${rows.length} villages scanned.`);
    }
  }

  function wireUI(state) {
    const scanBtn = document.getElementById('yct_scan');
    const stopBtn = document.getElementById('yct_stop');
    const copyBtn = document.getElementById('yct_copy_results');
    const exportBtn = document.getElementById('yct_export_console');

    scanBtn && scanBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      try {
        await scanAll(state);
      } catch (err) {
        console.error('[Creating_Tables_v1] scan error:', err);
        setStatus(`Error: ${String(err && err.message ? err.message : err)}`);
        if (window.UI && UI.ErrorMessage) UI.ErrorMessage(String(err && err.message ? err.message : err));
      }
    });

    stopBtn && stopBtn.addEventListener('click', (e) => {
      e.preventDefault();
      state.cancelled = true;
      setStatus('Stopping…');
    });

    copyBtn && copyBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      if (!state.lastPayload) {
        setStatus('Nothing to copy yet. Run Scan first.');
        return;
      }
      await copyTextRaw(JSON.stringify(state.lastPayload, null, 2));
      setStatus('Table results JSON copied.');
      if (window.UI && UI.SuccessMessage) UI.SuccessMessage('Table results JSON copied.');
    });

    exportBtn && exportBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (!state.lastPayload) {
        setStatus('Nothing to export yet. Run Scan first.');
        return;
      }
      console.log('[Creating_Tables_v1] export JSON:', JSON.stringify(state.lastPayload, null, 2));
      setStatus('Exported JSON to console.');
      if (window.UI && UI.SuccessMessage) UI.SuccessMessage('Exported JSON to console.');
    });
  }

  const state = {
    delayMs: 100,
    cancelled: false,
    lastRows: null,
    lastPayload: null,
  };

  window.CREATING_TABLES_V1 = {
    version: SCRIPT.version,
    state,
    show() {
      buildUI();
      wireUI(state);
    },
  };

  window.CREATING_TABLES_V1.show();
})();