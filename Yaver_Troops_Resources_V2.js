(function () {
  'use strict';

  const SCRIPT = {
    key: 'YAVER_TROOPS_RESOURCES',
    name: 'Yaver Troops + Resources',
    version: '1.0.0',
  };

  // Prevent double-load
  if (window.YTR && window.YTR.version === SCRIPT.version) {
    window.YTR.show();
    return;
  }

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  function toIntLoose(str) {
    // handles "5.179", "5 179", etc.
    const digits = String(str || '').replace(/[^\d]/g, '');
    return digits ? parseInt(digits, 10) : 0;
  }

  function parseHTML(html) {
    const p = new DOMParser();
    return p.parseFromString(html, 'text/html');
  }

  async function httpGet(url) {
    // Prefer fetch, fallback to jQuery if needed
    if (window.fetch) {
      const res = await fetch(url, { credentials: 'include', cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
      return await res.text();
    }
    return await new Promise((resolve, reject) => {
      if (!window.$) return reject(new Error('No fetch and no jQuery available'));
      $.ajax({
        url,
        method: 'GET',
        cache: false,
        success: resolve,
        error: (xhr, _s, err) => reject(new Error(String(err || xhr.status))),
      });
    });
  }

  function buildIcon(unitOrRes) {
    // Use game’s CDN base if available
    const base = (window.image_base || (window.game_data && game_data.image_base) || '/graphic/');
    // units in combined often use webp; in-game usually accepts it
    // For resources, we’ll use TW's <span class="icon header wood"> style in headers.
    return `${base}unit/unit_${unitOrRes}.webp`;
  }

  function getVillageListFromCombined(combinedHtml) {
    const doc = parseHTML(combinedHtml);
    const table = doc.querySelector('#combined_table');
    if (!table) throw new Error('combined_table not found');

    const rows = Array.from(table.querySelectorAll('tr.nowrap'));
    const villages = [];
    for (const tr of rows) {
      const vidEl = tr.querySelector('.quickedit-vn');
      const id = vidEl && vidEl.getAttribute('data-id');
      if (!id) continue;

      const label = tr.querySelector('.quickedit-label');
      const nameText = label ? (label.getAttribute('data-text') || label.textContent || '').trim() : '';
      // fallback: find first village overview link text
      const fallbackText = (tr.querySelector('a[href*="screen=overview"]')?.textContent || '').trim();
      const display = nameText || fallbackText || `Village ${id}`;

      villages.push({
        id: String(id),
        name: display,
      });
    }

    // De-dup (just in case)
    const seen = new Set();
    return villages.filter(v => (seen.has(v.id) ? false : (seen.add(v.id), true)));
  }

  function extractResourcesFromDoc(doc) {
    // from header spans like #wood #stone #iron #storage #pop_current_label #pop_max_label
    const wood = toIntLoose(doc.getElementById('wood')?.textContent);
    const stone = toIntLoose(doc.getElementById('stone')?.textContent);
    const iron = toIntLoose(doc.getElementById('iron')?.textContent);
    const storage = toIntLoose(doc.getElementById('storage')?.textContent);
    const popNow = toIntLoose(doc.getElementById('pop_current_label')?.textContent);
    const popMax = toIntLoose(doc.getElementById('pop_max_label')?.textContent);

    return { wood, stone, iron, storage, popNow, popMax };
  }

  function extractUnitTotalsFromTrainDoc(doc, units) {
    const totals = {};
    for (const u of units) totals[u] = 0;

    // Each unit row includes: <a class="unit_link" data-unit="axe"> ... then
    // a TD with "X/Y" (in village / total). We take Y.
    for (const u of units) {
      const a = doc.querySelector(`a.unit_link[data-unit="${u}"]`);
      if (!a) {
        totals[u] = 0;
        continue;
      }
      const tr = a.closest('tr');
      if (!tr) {
        totals[u] = 0;
        continue;
      }
      const tds = tr.querySelectorAll('td');
      // In your snippet, the "X/Y" cell is the 3rd td (index 2)
      const cell = tds && tds.length >= 3 ? tds[2] : null;
      const txt = (cell ? cell.textContent : '').trim();
      const m = txt.match(/([\d.\s]+)\s*\/\s*([\d.\s]+)/);
      totals[u] = m ? toIntLoose(m[2]) : toIntLoose(txt);
    }

    return totals;
  }

  function unitsForThisWorld() {
    const gd = window.game_data || {};
    const available = Array.isArray(gd.units) ? gd.units : ['spear','sword','axe','archer','spy','light','marcher','heavy','ram','catapult','knight','snob'];
    // We intentionally exclude militia in V1
    const wanted = ['spear','sword','axe','archer','spy','light','marcher','heavy','ram','catapult','knight','snob'];
    return wanted.filter(u => available.includes(u));
  }

  function fmt(n) {
    // TW style: dot as thousands separator (simple)
    const s = String(Math.trunc(Number(n) || 0));
    return s.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }

  function buildTableHTML(units) {
    const unitHeaders = units.map(u => {
      const title = u.charAt(0).toUpperCase() + u.slice(1);
      const icon = buildIcon(u);
      return `<th style="text-align:center"><img src="${icon}" alt="${title}" title="${title}" style="height:18px;vertical-align:middle" onerror="this.style.display='none'"/></th>`;
    }).join('');

    return `
      <table id="ytr_table" class="vis overview_table" width="100%" style="white-space:nowrap; table-layout:auto;">
        <tr>
          <th style="text-align:left">Village</th>
          <th style="text-align:center"><span class="icon header wood"></span></th>
          <th style="text-align:center"><span class="icon header stone"></span></th>
          <th style="text-align:center"><span class="icon header iron"></span></th>
          <th style="text-align:center"><span class="icon header ressources"></span></th>
          <th style="text-align:center"><span class="icon header population"></span></th>
          ${unitHeaders}
        </tr>
        <tbody id="ytr_tbody"></tbody>
      </table>
    `;
  }

  function buildUI(units) {
    const html = `
      <div id="ytr_root">
        <div class="vis" style="padding:8px;">
          <h2 style="margin:4px 0 10px 0;">${SCRIPT.name} <span class="grey">v${SCRIPT.version}</span></h2>

          <div class="vis_item" style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
            <a href="#" class="btn" id="ytr_scan">Scan all villages</a>
            <a href="#" class="btn" id="ytr_copy_tsv">Copy TSV</a>
            <a href="#" class="btn" id="ytr_copy_bb">Copy BBCode</a>
            <a href="#" class="btn" id="ytr_export_json">Export JSON (console)</a>
            <span id="ytr_status" class="grey" style="margin-left:6px;">Ready.</span>
          </div>

          <div style="margin-top:8px;">
            ${buildTableHTML(units)}
          </div>

          <style>
            #ytr_table th, #ytr_table td { padding: 2px 6px; }
            #ytr_table td { text-align: center; }
            #ytr_table td:first-child { text-align: left; }
            #ytr_table tr:hover td { background: rgba(255,255,0,0.08); }
          </style>
        </div>
      </div>
    `;
    if (window.Dialog && Dialog.show) {
      Dialog.show(SCRIPT.key, html);
    } else {
      // fallback
      const wrap = document.createElement('div');
      wrap.innerHTML = html;
      document.body.appendChild(wrap);
    }
  }

  async function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }
    // fallback
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  }

  function rowsToTSV(rows, units) {
    const header = ['Village','Wood','Clay','Iron','Storage','Pop', ...units].join('\t');
    const lines = rows.map(r => {
      const pop = `${r.res.popNow}/${r.res.popMax}`;
      const unitVals = units.map(u => String(r.units[u] || 0));
      return [r.name, r.res.wood, r.res.stone, r.res.iron, r.res.storage, pop, ...unitVals].join('\t');
    });
    return [header, ...lines].join('\n');
  }

  function rowsToBBCode(rows, units) {
  // BBCode'da en sorunsuz yol: TW'nin kendi relative /graphic/ ... .png yolları
  const img = (path) => `[img]${path}[/img]`;

  const headerCells = [
    `[b]Village[/b]`,
    img('/graphic/holz.png'),                 // wood
    img('/graphic/lehm.png'),                 // clay
    img('/graphic/eisen.png'),                // iron
    img('/graphic/buildings/storage.png'),    // storage
    img('/graphic/buildings/farm.png'),       // pop
    ...units.map(u => img(`/graphic/unit/unit_${u}.png`)),
  ].join('[||]');

  const bodyLines = rows.map(r => {
    const pop = `${fmt(r.res.popNow)}/${fmt(r.res.popMax)}`;
    const unitVals = units.map(u => fmt(r.units[u] || 0));
    return [
      r.name,
      fmt(r.res.wood),
      fmt(r.res.stone),
      fmt(r.res.iron),
      fmt(r.res.storage),
      pop,
      ...unitVals
    ].join('[||]');
  });

  return `[table]\n[**]${headerCells}[/**]\n${bodyLines.map(line => `[*]${line}`).join('\n')}\n[/table]`;
}


  async function scanAll() {
    const status = document.getElementById('ytr_status');
    const tbody = document.getElementById('ytr_tbody');

    const units = window.YTR.units;

    const setStatus = (t) => { if (status) status.textContent = t; };

    setStatus('Loading village list from Combined…');

    // Always get the list from combined (group=0)
    const baseVillageId = (window.game_data && game_data.village && game_data.village.id) ? game_data.village.id : null;
    if (!baseVillageId) throw new Error('game_data.village.id not found');

    const combinedUrl = `/game.php?village=${baseVillageId}&screen=overview_villages&mode=combined&group=0&page_size=100`;
    const combinedHtml = await httpGet(combinedUrl);
    const villages = getVillageListFromCombined(combinedHtml);

    if (!villages.length) throw new Error('No villages found in combined');

    const rows = [];
    tbody.innerHTML = '';

    for (let i = 0; i < villages.length; i++) {
      const v = villages[i];
      setStatus(`Scanning ${i + 1}/${villages.length}: ${v.name} …`);

      const trainUrl = `/game.php?village=${v.id}&screen=train`;
      let html;
      try {
        html = await httpGet(trainUrl);
      } catch (e) {
        rows.push({ id: v.id, name: v.name, res: { wood:0,stone:0,iron:0,storage:0,popNow:0,popMax:0 }, units: {} , error: String(e) });
        // still render a row
        const tr = document.createElement('tr');
        tr.className = (i % 2 === 0) ? 'row_a' : 'row_b';
        tr.innerHTML = `<td>${v.name} <span class="grey">(ERR)</span></td>
                        <td colspan="${5 + units.length}" style="text-align:left" class="grey">${String(e)}</td>`;
        tbody.appendChild(tr);
        await sleep(200);
        continue;
      }

      const doc = parseHTML(html);

      const res = extractResourcesFromDoc(doc);
      const unitTotals = extractUnitTotalsFromTrainDoc(doc, units);

      const row = { id: v.id, name: v.name, res, units: unitTotals };
      rows.push(row);

      // Render row (combined-like)
      const tr = document.createElement('tr');
      tr.className = (i % 2 === 0) ? 'row_a' : 'row_b';

      const unitCells = units.map(u => `<td class="unit-item">${fmt(unitTotals[u] || 0)}</td>`).join('');

      tr.innerHTML = `
        <td class="nowrap"><a href="/game.php?village=${v.id}&screen=overview">${v.name}</a></td>
        <td>${fmt(res.wood)}</td>
        <td>${fmt(res.stone)}</td>
        <td>${fmt(res.iron)}</td>
        <td>${fmt(res.storage)}</td>
        <td>${fmt(res.popNow)}/${fmt(res.popMax)}</td>
        ${unitCells}
      `;
      tbody.appendChild(tr);

      // gentle pacing
      await sleep(200);
    }

    window.YTR.lastRows = rows;
    setStatus(`Done. Scanned ${rows.length} villages.`);
    if (window.UI && UI.SuccessMessage) UI.SuccessMessage(`YTR: ${rows.length} villages scanned.`);
  }

  function wireUI() {
    const scanBtn = document.getElementById('ytr_scan');
    const copyTSVBtn = document.getElementById('ytr_copy_tsv');
    const copyBBBtn = document.getElementById('ytr_copy_bb');
    const exportBtn = document.getElementById('ytr_export_json');
    const status = document.getElementById('ytr_status');

    const setStatus = (t) => { if (status) status.textContent = t; };

    scanBtn?.addEventListener('click', async (e) => {
      e.preventDefault();
      try {
        await scanAll();
      } catch (err) {
        console.error('[YTR] scan error:', err);
        setStatus(`Error: ${String(err)}`);
        if (window.UI && UI.ErrorMessage) UI.ErrorMessage(String(err));
      }
    });

    copyTSVBtn?.addEventListener('click', async (e) => {
      e.preventDefault();
      if (!window.YTR.lastRows) return setStatus('Nothing to copy yet. Run Scan first.');
      const tsv = rowsToTSV(window.YTR.lastRows, window.YTR.units);
      await copyToClipboard(tsv);
      setStatus('TSV copied.');
      if (window.UI && UI.SuccessMessage) UI.SuccessMessage('TSV copied.');
    });

    copyBBBtn?.addEventListener('click', async (e) => {
      e.preventDefault();
      if (!window.YTR.lastRows) return setStatus('Nothing to copy yet. Run Scan first.');
      const bb = rowsToBBCode(window.YTR.lastRows, window.YTR.units);
      await copyToClipboard(bb);
      setStatus('BBCode copied.');
      if (window.UI && UI.SuccessMessage) UI.SuccessMessage('BBCode copied.');
    });

    exportBtn?.addEventListener('click', (e) => {
      e.preventDefault();
      if (!window.YTR.lastRows) return setStatus('Nothing to export yet. Run Scan first.');
      console.log('[YTR] export JSON:', JSON.stringify(window.YTR.lastRows, null, 2));
      setStatus('Exported to console (JSON).');
      if (window.UI && UI.SuccessMessage) UI.SuccessMessage('Exported to console.');
    });
  }

  // Public API
  window.YTR = {
    version: SCRIPT.version,
    units: unitsForThisWorld(),
    lastRows: null,
    show: function () {
      buildUI(window.YTR.units);
      wireUI();
    },
  };

  // Init
  window.YTR.show();
})();
