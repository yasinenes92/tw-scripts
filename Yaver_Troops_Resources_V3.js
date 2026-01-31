(function () {
  'use strict';

  const SCRIPT = {
    key: 'YTR_V3',
    name: 'Yaver Troops + Resources',
    version: '3.0.0',
  };

  // Avoid double-load (reopen UI if already loaded)
  if (window.YTR_V3 && window.YTR_V3.version === SCRIPT.version) {
    window.YTR_V3.show();
    return;
  }

  // ---------- Helpers ----------
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  function toIntLoose(str) {
    const digits = String(str || '').replace(/[^\d]/g, '');
    return digits ? parseInt(digits, 10) : 0;
  }

  function fmtDot(n) {
    const s = String(Math.trunc(Number(n) || 0));
    return s.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }

  function parseHTML(html) {
    return new DOMParser().parseFromString(html, 'text/html');
  }

  async function httpGet(url) {
    // Add a cache-buster to reduce stale results
    const sep = url.includes('?') ? '&' : '?';
    const u = url + sep + 'ytr=' + Date.now() + '_' + Math.random().toString(16).slice(2);

    if (window.fetch) {
      const res = await fetch(u, { credentials: 'include', cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status} (${url})`);
      return await res.text();
    }

    // Fallback to jQuery ajax
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

  function getBaseVillageId() {
    const gd = window.game_data;
    const id = gd && gd.village && gd.village.id;
    if (!id) throw new Error('game_data.village.id not found');
    return String(id);
  }

  function getUnitsForWorld() {
    const gd = window.game_data || {};
    const available = Array.isArray(gd.units)
      ? gd.units
      : ['spear', 'sword', 'axe', 'archer', 'spy', 'light', 'marcher', 'heavy', 'ram', 'catapult', 'knight', 'snob', 'militia'];

    // V3: show common units; exclude militia by default
    const wanted = ['spear', 'sword', 'axe', 'archer', 'spy', 'light', 'marcher', 'heavy', 'ram', 'catapult', 'knight', 'snob'];
    return wanted.filter((u) => available.includes(u));
  }

  function getVillageListFromCombined(combinedHtml) {
    const doc = parseHTML(combinedHtml);
    const table = doc.querySelector('#combined_table');
    if (!table) throw new Error('combined_table not found');

    const rows = Array.from(table.querySelectorAll('tr.nowrap'));
    const villages = [];

    for (const tr of rows) {
      const idEl = tr.querySelector('.quickedit-vn[data-id]');
      const id = idEl ? idEl.getAttribute('data-id') : '';
      if (!id) continue;

      const label = tr.querySelector('.quickedit-label');
      const name = (label?.getAttribute('data-text') || label?.textContent || '').trim()
        || (tr.querySelector('a[href*="screen=overview"]')?.textContent || '').trim()
        || `Village ${id}`;

      villages.push({ id: String(id), name });
    }

    // de-dup
    const seen = new Set();
    return villages.filter(v => (seen.has(v.id) ? false : (seen.add(v.id), true)));
  }

  function extractResources(doc) {
    return {
      wood: toIntLoose(doc.getElementById('wood')?.textContent),
      stone: toIntLoose(doc.getElementById('stone')?.textContent),
      iron: toIntLoose(doc.getElementById('iron')?.textContent),
      storage: toIntLoose(doc.getElementById('storage')?.textContent),
      popNow: toIntLoose(doc.getElementById('pop_current_label')?.textContent),
      popMax: toIntLoose(doc.getElementById('pop_max_label')?.textContent),
    };
  }

  function extractUnitTotalsFromTrain(doc, units) {
    const totals = {};
    for (const u of units) totals[u] = 0;

    for (const u of units) {
      // Most robust: find row via unit link, then find first cell containing X/Y
      const a = doc.querySelector(`a.unit_link[data-unit="${u}"]`);
      const tr = a ? a.closest('tr') : null;
      if (!tr) {
        totals[u] = 0;
        continue;
      }

      const tds = Array.from(tr.querySelectorAll('td'));
      let picked = 0;

      for (const td of tds) {
        const txt = (td.textContent || '').trim();
        const m = txt.match(/([\d.\s]+)\s*\/\s*([\d.\s]+)/);
        if (m) {
          picked = toIntLoose(m[2]); // total
          break;
        }
      }

      // fallback: sometimes only a single number exists
      if (!picked) {
        const txtAll = (tr.textContent || '').trim();
        const m2 = txtAll.match(/([\d.\s]+)\s*\/\s*([\d.\s]+)/);
        picked = m2 ? toIntLoose(m2[2]) : 0;
      }

      totals[u] = picked;
    }

    return totals;
  }

  function bbImg(path) {
    // BBCode images need PNG for best compatibility
    return `[img]${path}[/img]`;
  }

  function rowsToTSV(rows, units) {
    const header = ['Village', 'Wood', 'Clay', 'Iron', 'Storage', 'Pop', ...units].join('\t');
    const lines = rows.map(r => {
      const pop = `${r.res.popNow}/${r.res.popMax}`;
      const unitVals = units.map(u => String(r.units[u] || 0));
      // TSV with raw integers (no dot separators) for Excel
      return [r.name, r.res.wood, r.res.stone, r.res.iron, r.res.storage, pop, ...unitVals].join('\t');
    });
    return [header, ...lines].join('\n');
  }

  // BBCode with ICON HEADERS (requested)
  function rowsToBBCodeIcons(rows, units) {
    const headerCells = [
      `[b]Village[/b]`,
      bbImg('/graphic/holz.png'),
      bbImg('/graphic/lehm.png'),
      bbImg('/graphic/eisen.png'),
      bbImg('/graphic/buildings/storage.png'),
      bbImg('/graphic/buildings/farm.png'),
      ...units.map(u => bbImg(`/graphic/unit/unit_${u}.png`)),
    ].join('[||]');

    const body = rows.map(r => {
      const pop = `${fmtDot(r.res.popNow)}/${fmtDot(r.res.popMax)}`;
      const unitVals = units.map(u => fmtDot(r.units[u] || 0));
      return [
        r.name,
        fmtDot(r.res.wood),
        fmtDot(r.res.stone),
        fmtDot(r.res.iron),
        fmtDot(r.res.storage),
        pop,
        ...unitVals,
      ].join('[||]');
    });

    return `[table]\n[**]${headerCells}[/**]\n${body.map(line => `[*]${line}`).join('\n')}\n[/table]`;
  }

  // Optional: BBCode with TEXT HEADERS (fallback if some area blocks [img])
  function rowsToBBCodeText(rows, units) {
    const headerCells = [
      `[b]Village[/b]`,
      `[b]Wood[/b]`,
      `[b]Clay[/b]`,
      `[b]Iron[/b]`,
      `[b]Storage[/b]`,
      `[b]Pop[/b]`,
      ...units.map(u => `[b]${u}[/b]`),
    ].join('[||]');

    const body = rows.map(r => {
      const pop = `${fmtDot(r.res.popNow)}/${fmtDot(r.res.popMax)}`;
      const unitVals = units.map(u => fmtDot(r.units[u] || 0));
      return [
        r.name,
        fmtDot(r.res.wood),
        fmtDot(r.res.stone),
        fmtDot(r.res.iron),
        fmtDot(r.res.storage),
        pop,
        ...unitVals,
      ].join('[||]');
    });

    return `[table]\n[**]${headerCells}[/**]\n${body.map(line => `[*]${line}`).join('\n')}\n[/table]`;
  }

  async function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  }

  // ---------- UI ----------
  function unitIconHTML(u) {
    // Use TW relative png paths (matches your icon list)
    return `<img src="/graphic/unit/unit_${u}.png" alt="${u}" title="${u}" style="height:18px;vertical-align:middle" />`;
  }

  function resIconHTML(path, title) {
    return `<img src="${path}" alt="${title}" title="${title}" style="height:18px;vertical-align:middle" />`;
  }

  function buildTableHTML(units) {
    const unitHeaders = units.map(u => `<th style="text-align:center">${unitIconHTML(u)}</th>`).join('');

    // IMPORTANT: no width="100%" -> width:auto (requested)
    return `
      <table id="ytr_table" class="vis overview_table" style="white-space:nowrap; width:auto; table-layout:auto;">
        <thead>
          <tr>
            <th style="text-align:left">Village</th>
            <th style="text-align:center">${resIconHTML('/graphic/holz.png', 'Wood')}</th>
            <th style="text-align:center">${resIconHTML('/graphic/lehm.png', 'Clay')}</th>
            <th style="text-align:center">${resIconHTML('/graphic/eisen.png', 'Iron')}</th>
            <th style="text-align:center">${resIconHTML('/graphic/buildings/storage.png', 'Storage')}</th>
            <th style="text-align:center">${resIconHTML('/graphic/buildings/farm.png', 'Population')}</th>
            ${unitHeaders}
          </tr>
        </thead>
        <tbody id="ytr_tbody"></tbody>
      </table>
    `;
  }

  function buildUI(units) {
    // Wrapper is inline-block so panel can shrink to content width
    const html = `
      <div id="ytr_root" style="display:inline-block;">
        <div class="vis" style="padding:8px; display:inline-block; overflow-x:auto; max-width:calc(100vw - 40px);">
          <h2 style="margin:4px 0 10px 0;">
            ${SCRIPT.name} <span class="grey">v${SCRIPT.version}</span>
          </h2>

          <div class="vis_item" style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
            <a href="#" class="btn" id="ytr_scan">Scan all villages</a>
            <a href="#" class="btn" id="ytr_stop">Stop</a>
            <span id="ytr_status" class="grey" style="margin-left:6px;">Ready.</span>
          </div>

          <div class="vis_item" style="display:flex; gap:8px; align-items:center; flex-wrap:wrap; margin-top:6px;">
            <a href="#" class="btn" id="ytr_copy_tsv">Copy TSV</a>
            <a href="#" class="btn" id="ytr_copy_bb_icons">Copy BBCode (Icons)</a>
            <a href="#" class="btn" id="ytr_copy_bb_text">Copy BBCode (Text)</a>
            <a href="#" class="btn" id="ytr_export_json">Export JSON (console)</a>
          </div>

          <div style="margin-top:8px; display:inline-block;">
            ${buildTableHTML(units)}
          </div>

          <style>
            /* Excel-like compact cells */
            #ytr_table th, #ytr_table td { padding: 2px 6px; }
            #ytr_table td { text-align: center; }
            #ytr_table td:first-child { text-align: left; }
            #ytr_table tr:hover td { background: rgba(255,255,0,0.08); }

            /* Ensure the table itself doesn't stretch */
            #ytr_table { width: auto !important; }
          </style>
        </div>
      </div>
    `;

    if (window.Dialog && typeof Dialog.show === 'function') {
      Dialog.show(SCRIPT.key, html);
    } else {
      // fallback inject
      const wrap = document.createElement('div');
      wrap.innerHTML = html;
      document.body.appendChild(wrap);
    }

    // Try to force popup width to auto (TW sometimes sets fixed width)
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
    const el = document.getElementById('ytr_status');
    if (el) el.textContent = text;
  }

  function renderRow(tbody, idx, row, units) {
    const tr = document.createElement('tr');
    tr.className = (idx % 2 === 0) ? 'row_a' : 'row_b';

    const unitCells = units.map(u => `<td class="unit-item">${fmtDot(row.units[u] || 0)}</td>`).join('');

    tr.innerHTML = `
      <td class="nowrap">
        <a href="/game.php?village=${row.id}&screen=overview">${row.name}</a>
        ${row.error ? `<span class="grey"> (ERR)</span>` : ``}
      </td>
      <td>${fmtDot(row.res.wood || 0)}</td>
      <td>${fmtDot(row.res.stone || 0)}</td>
      <td>${fmtDot(row.res.iron || 0)}</td>
      <td>${fmtDot(row.res.storage || 0)}</td>
      <td>${fmtDot(row.res.popNow || 0)}/${fmtDot(row.res.popMax || 0)}</td>
      ${unitCells}
    `;
    tbody.appendChild(tr);
  }

  // ---------- Scan ----------
  async function scanAll(state) {
    const tbody = document.getElementById('ytr_tbody');
    if (!tbody) throw new Error('UI not ready');

    tbody.innerHTML = '';
    state.lastRows = null;
    state.cancelled = false;

    const baseVillageId = getBaseVillageId();

    setStatus('Loading village list from Combined…');
    const combinedUrl = `/game.php?village=${baseVillageId}&screen=overview_villages&mode=combined&group=0&page_size=100`;
    const combinedHtml = await httpGet(combinedUrl);

    const villages = getVillageListFromCombined(combinedHtml);
    if (!villages.length) throw new Error('No villages found');

    const rows = [];
    const delayMs = state.delayMs;

    for (let i = 0; i < villages.length; i++) {
      if (state.cancelled) {
        setStatus(`Stopped. Scanned ${rows.length}/${villages.length}.`);
        state.lastRows = rows;
        return;
      }

      const v = villages[i];
      setStatus(`Scanning ${i + 1}/${villages.length}: ${v.name} …`);

      const trainUrl = `/game.php?village=${v.id}&screen=train`;

      try {
        const html = await httpGet(trainUrl);
        const doc = parseHTML(html);

        const res = extractResources(doc);
        const unitTotals = extractUnitTotalsFromTrain(doc, state.units);

        const row = { id: v.id, name: v.name, res, units: unitTotals };
        rows.push(row);
        renderRow(tbody, i, row, state.units);
      } catch (e) {
        const row = {
          id: v.id,
          name: v.name,
          res: { wood: 0, stone: 0, iron: 0, storage: 0, popNow: 0, popMax: 0 },
          units: Object.fromEntries(state.units.map(u => [u, 0])),
          error: String(e),
        };
        rows.push(row);
        renderRow(tbody, i, row, state.units);
        console.error('[YTR] village scan error:', v, e);
      }

      if (delayMs > 0) await sleep(delayMs);
    }

    state.lastRows = rows;
    setStatus(`Done. Scanned ${rows.length} villages.`);
    if (window.UI && UI.SuccessMessage) UI.SuccessMessage(`YTR: ${rows.length} villages scanned.`);
  }

  function wireUI(state) {
    const scanBtn = document.getElementById('ytr_scan');
    const stopBtn = document.getElementById('ytr_stop');

    const copyTSVBtn = document.getElementById('ytr_copy_tsv');
    const copyBBIconsBtn = document.getElementById('ytr_copy_bb_icons');
    const copyBBTextBtn = document.getElementById('ytr_copy_bb_text');
    const exportBtn = document.getElementById('ytr_export_json');

    scanBtn?.addEventListener('click', async (e) => {
      e.preventDefault();
      try {
        await scanAll(state);
      } catch (err) {
        console.error('[YTR] scan error:', err);
        setStatus(`Error: ${String(err)}`);
        if (window.UI && UI.ErrorMessage) UI.ErrorMessage(String(err));
      }
    });

    stopBtn?.addEventListener('click', (e) => {
      e.preventDefault();
      state.cancelled = true;
      setStatus('Stopping…');
    });

    copyTSVBtn?.addEventListener('click', async (e) => {
      e.preventDefault();
      if (!state.lastRows) {
        setStatus('Nothing to copy yet. Run Scan first.');
        return;
      }
      const tsv = rowsToTSV(state.lastRows, state.units);
      await copyToClipboard(tsv);
      setStatus('TSV copied.');
      if (window.UI && UI.SuccessMessage) UI.SuccessMessage('TSV copied.');
    });

    copyBBIconsBtn?.addEventListener('click', async (e) => {
      e.preventDefault();
      if (!state.lastRows) {
        setStatus('Nothing to copy yet. Run Scan first.');
        return;
      }
      const bb = rowsToBBCodeIcons(state.lastRows, state.units);
      await copyToClipboard(bb);
      setStatus('BBCode (Icons) copied.');
      if (window.UI && UI.SuccessMessage) UI.SuccessMessage('BBCode (Icons) copied.');
    });

    copyBBTextBtn?.addEventListener('click', async (e) => {
      e.preventDefault();
      if (!state.lastRows) {
        setStatus('Nothing to copy yet. Run Scan first.');
        return;
      }
      const bb = rowsToBBCodeText(state.lastRows, state.units);
      await copyToClipboard(bb);
      setStatus('BBCode (Text) copied.');
      if (window.UI && UI.SuccessMessage) UI.SuccessMessage('BBCode (Text) copied.');
    });

    exportBtn?.addEventListener('click', (e) => {
      e.preventDefault();
      if (!state.lastRows) {
        setStatus('Nothing to export yet. Run Scan first.');
        return;
      }
      console.log('[YTR] export JSON:', JSON.stringify(state.lastRows, null, 2));
      setStatus('Exported to console (JSON).');
      if (window.UI && UI.SuccessMessage) UI.SuccessMessage('Exported to console.');
    });
  }

  // ---------- Public API ----------
  const state = {
    units: getUnitsForWorld(),
    lastRows: null,
    cancelled: false,
    delayMs: 200, // gentle pacing
  };

  window.YTR_V3 = {
    version: SCRIPT.version,
    show: function () {
      buildUI(state.units);
      wireUI(state);
    },
    state,
  };

  // Init
  window.YTR_V3.show();
})();
