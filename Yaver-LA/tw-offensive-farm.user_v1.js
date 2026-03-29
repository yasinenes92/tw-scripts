// ==UserScript==
// @name         TW Offensive Farm Planner
// @namespace    https://github.com/yasinenes92/tw-scripts
// @version      0.1.0
// @description  Assigns each Loot Assistant target to the nearest eligible village from a chosen group and sends attacks with hotkeys.
// @author       OpenAI + Fikri Evlat
// @match        https://*.tribalwars.net/game.php*screen=am_farm*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  const SCRIPT_ID = 'tw-offensive-farm';
  const STORAGE_KEY = 'tw_offensive_farm_state_v1';
  const DEFAULTS = {
    groupId: 12858,
    maxWall: 0,
    maxDistance: 0,
    allowGreen: true,
    allowBlue: true,
    allowYellow: true,
    allowRedYellow: false,
    allowRedBlue: false,
    allowRed: false,
    allowFullHaul: true,
    allowPartialHaul: true,
    autoRebuildAfterSend: true,
    enterTemplate: 'A',
    holdIntervalMs: 220,
  };

  const state = {
    settings: loadSettings(),
    ui: {},
    metadata: null,
    sources: [],
    targets: [],
    queues: { A: [], B: [] },
    sending: false,
    holdTimer: null,
    holdKey: null,
    logLines: [],
  };

  if (!isLootAssistantPage()) {
    return;
  }

  boot().catch((error) => {
    console.error(`[${SCRIPT_ID}] boot failed`, error);
    notifyError(`Boot failed: ${error.message || error}`);
  });

  async function boot() {
    await waitFor(() => document.querySelector('#plunder_list'));
    injectStyles();
    buildPanel();
    bindHotkeys();
    await refreshAll({ showMessages: true });
  }

  function isLootAssistantPage() {
    return typeof window.game_data !== 'undefined' && window.game_data.screen === 'am_farm';
  }

  function loadSettings() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : { ...DEFAULTS };
    } catch {
      return { ...DEFAULTS };
    }
  }

  function saveSettings() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.settings));
  }

  function injectStyles() {
    if (document.getElementById(`${SCRIPT_ID}-styles`)) return;
    const style = document.createElement('style');
    style.id = `${SCRIPT_ID}-styles`;
    style.textContent = `
      #${SCRIPT_ID}-panel {
        margin: 12px 0;
        border: 1px solid #7d510f;
        background: #f4e4bc;
        box-shadow: 1px 1px 2px rgba(60,30,0,.2);
      }
      #${SCRIPT_ID}-panel h4 {
        margin: 0;
        padding: 4px 6px;
        background: #c1a264;
        font-size: 12px;
      }
      #${SCRIPT_ID}-panel .tof-body {
        padding: 8px;
      }
      #${SCRIPT_ID}-panel .tof-grid {
        display: grid;
        grid-template-columns: repeat(4, minmax(150px, 1fr));
        gap: 8px 12px;
        align-items: end;
      }
      #${SCRIPT_ID}-panel label {
        display: block;
        font-weight: 700;
        margin-bottom: 3px;
      }
      #${SCRIPT_ID}-panel input[type="number"],
      #${SCRIPT_ID}-panel select {
        width: 100%;
        box-sizing: border-box;
      }
      #${SCRIPT_ID}-panel .tof-inline {
        display: flex;
        gap: 10px;
        align-items: center;
        flex-wrap: wrap;
      }
      #${SCRIPT_ID}-panel .tof-buttons {
        margin-top: 10px;
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }
      #${SCRIPT_ID}-panel .tof-stats {
        margin-top: 10px;
        display: flex;
        gap: 12px;
        flex-wrap: wrap;
        font-size: 12px;
      }
      #${SCRIPT_ID}-panel .tof-table-wrap {
        margin-top: 10px;
        max-height: 320px;
        overflow: auto;
        border: 1px solid #b08b4f;
        background: #fff5da;
      }
      #${SCRIPT_ID}-panel table {
        width: 100%;
        border-collapse: collapse;
      }
      #${SCRIPT_ID}-panel th,
      #${SCRIPT_ID}-panel td {
        padding: 4px 6px;
        border-bottom: 1px solid #e5d0a0;
        font-size: 12px;
        text-align: left;
      }
      #${SCRIPT_ID}-panel .tof-log {
        margin-top: 10px;
        max-height: 120px;
        overflow: auto;
        font-size: 12px;
        background: #fff5da;
        border: 1px solid #b08b4f;
        padding: 6px;
        white-space: pre-wrap;
      }
      #${SCRIPT_ID}-panel .tof-tag {
        display: inline-block;
        padding: 2px 6px;
        border: 1px solid #b08b4f;
        background: #f8edd0;
        border-radius: 12px;
        font-size: 11px;
      }
      #${SCRIPT_ID}-panel .tof-muted {
        opacity: .75;
      }
      #${SCRIPT_ID}-panel .tof-row-sent {
        opacity: .55;
        text-decoration: line-through;
      }
    `;
    document.head.appendChild(style);
  }

  function buildPanel() {
    const host = document.createElement('div');
    host.id = `${SCRIPT_ID}-panel`;
    host.innerHTML = `
      <h4>TW Offensive Farm Planner</h4>
      <div class="tof-body">
        <div class="tof-grid">
          <div>
            <label for="${SCRIPT_ID}-group">Group ID</label>
            <input id="${SCRIPT_ID}-group" type="number" min="0" value="${escapeHtml(String(state.settings.groupId))}">
          </div>
          <div>
            <label for="${SCRIPT_ID}-wall">Max wall (0 = any)</label>
            <input id="${SCRIPT_ID}-wall" type="number" min="0" value="${escapeHtml(String(state.settings.maxWall))}">
          </div>
          <div>
            <label for="${SCRIPT_ID}-distance">Max distance (0 = any)</label>
            <input id="${SCRIPT_ID}-distance" type="number" min="0" step="0.1" value="${escapeHtml(String(state.settings.maxDistance))}">
          </div>
          <div>
            <label for="${SCRIPT_ID}-enter-template">Enter hotkey template</label>
            <select id="${SCRIPT_ID}-enter-template">
              <option value="A">A</option>
              <option value="B">B</option>
            </select>
          </div>
        </div>

        <div class="tof-inline" style="margin-top:10px">
          <span class="tof-tag">Result colors</span>
          ${checkbox(`${SCRIPT_ID}-color-green`, 'Green', state.settings.allowGreen)}
          ${checkbox(`${SCRIPT_ID}-color-blue`, 'Blue', state.settings.allowBlue)}
          ${checkbox(`${SCRIPT_ID}-color-yellow`, 'Yellow', state.settings.allowYellow)}
          ${checkbox(`${SCRIPT_ID}-color-red-yellow`, 'Red/Yellow', state.settings.allowRedYellow)}
          ${checkbox(`${SCRIPT_ID}-color-red-blue`, 'Red/Blue', state.settings.allowRedBlue)}
          ${checkbox(`${SCRIPT_ID}-color-red`, 'Red', state.settings.allowRed)}
        </div>

        <div class="tof-inline" style="margin-top:8px">
          <span class="tof-tag">Haul types</span>
          ${checkbox(`${SCRIPT_ID}-haul-full`, 'Full', state.settings.allowFullHaul)}
          ${checkbox(`${SCRIPT_ID}-haul-partial`, 'Partial', state.settings.allowPartialHaul)}
          ${checkbox(`${SCRIPT_ID}-auto-rebuild`, 'Rebuild after send', state.settings.autoRebuildAfterSend)}
        </div>

        <div class="tof-buttons">
          <button class="btn" id="${SCRIPT_ID}-refresh" type="button">Refresh</button>
          <button class="btn" id="${SCRIPT_ID}-build" type="button">Build queue</button>
          <button class="btn" id="${SCRIPT_ID}-send-a" type="button">Send next A</button>
          <button class="btn" id="${SCRIPT_ID}-send-b" type="button">Send next B</button>
        </div>

        <div class="tof-stats" id="${SCRIPT_ID}-stats"></div>

        <div class="tof-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Template</th>
                <th>Source</th>
                <th>Target</th>
                <th>Wall</th>
                <th>Distance</th>
                <th>Result</th>
                <th>Haul</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody id="${SCRIPT_ID}-queue-body"></tbody>
          </table>
        </div>

        <div class="tof-log" id="${SCRIPT_ID}-log"></div>
      </div>
    `;

    const insertionPoint = document.querySelector('#am_widget_Farm') || document.querySelector('#content_value');
    insertionPoint.parentNode.insertBefore(host, insertionPoint);

    state.ui.host = host;
    state.ui.groupId = host.querySelector(`#${SCRIPT_ID}-group`);
    state.ui.maxWall = host.querySelector(`#${SCRIPT_ID}-wall`);
    state.ui.maxDistance = host.querySelector(`#${SCRIPT_ID}-distance`);
    state.ui.enterTemplate = host.querySelector(`#${SCRIPT_ID}-enter-template`);
    state.ui.colorGreen = host.querySelector(`#${SCRIPT_ID}-color-green`);
    state.ui.colorBlue = host.querySelector(`#${SCRIPT_ID}-color-blue`);
    state.ui.colorYellow = host.querySelector(`#${SCRIPT_ID}-color-yellow`);
    state.ui.colorRedYellow = host.querySelector(`#${SCRIPT_ID}-color-red-yellow`);
    state.ui.colorRedBlue = host.querySelector(`#${SCRIPT_ID}-color-red-blue`);
    state.ui.colorRed = host.querySelector(`#${SCRIPT_ID}-color-red`);
    state.ui.haulFull = host.querySelector(`#${SCRIPT_ID}-haul-full`);
    state.ui.haulPartial = host.querySelector(`#${SCRIPT_ID}-haul-partial`);
    state.ui.autoRebuild = host.querySelector(`#${SCRIPT_ID}-auto-rebuild`);
    state.ui.refresh = host.querySelector(`#${SCRIPT_ID}-refresh`);
    state.ui.build = host.querySelector(`#${SCRIPT_ID}-build`);
    state.ui.sendA = host.querySelector(`#${SCRIPT_ID}-send-a`);
    state.ui.sendB = host.querySelector(`#${SCRIPT_ID}-send-b`);
    state.ui.stats = host.querySelector(`#${SCRIPT_ID}-stats`);
    state.ui.queueBody = host.querySelector(`#${SCRIPT_ID}-queue-body`);
    state.ui.log = host.querySelector(`#${SCRIPT_ID}-log`);

    state.ui.enterTemplate.value = state.settings.enterTemplate;

    const persist = () => {
      state.settings.groupId = toInt(state.ui.groupId.value, DEFAULTS.groupId);
      state.settings.maxWall = toInt(state.ui.maxWall.value, 0);
      state.settings.maxDistance = toFloat(state.ui.maxDistance.value, 0);
      state.settings.enterTemplate = state.ui.enterTemplate.value;
      state.settings.allowGreen = state.ui.colorGreen.checked;
      state.settings.allowBlue = state.ui.colorBlue.checked;
      state.settings.allowYellow = state.ui.colorYellow.checked;
      state.settings.allowRedYellow = state.ui.colorRedYellow.checked;
      state.settings.allowRedBlue = state.ui.colorRedBlue.checked;
      state.settings.allowRed = state.ui.colorRed.checked;
      state.settings.allowFullHaul = state.ui.haulFull.checked;
      state.settings.allowPartialHaul = state.ui.haulPartial.checked;
      state.settings.autoRebuildAfterSend = state.ui.autoRebuild.checked;
      saveSettings();
    };

    host.querySelectorAll('input, select').forEach((element) => {
      element.addEventListener('change', persist);
    });

    state.ui.refresh.addEventListener('click', async () => {
      await refreshAll({ showMessages: true });
    });

    state.ui.build.addEventListener('click', () => {
      buildQueues();
      render();
      log('Queue rebuilt.');
    });

    state.ui.sendA.addEventListener('click', () => {
      sendNext('A').catch(reportSendError);
    });

    state.ui.sendB.addEventListener('click', () => {
      sendNext('B').catch(reportSendError);
    });

    render();
  }

  function checkbox(id, text, checked) {
    return `<label style="font-weight:400"><input id="${id}" type="checkbox" ${checked ? 'checked' : ''}> ${text}</label>`;
  }

  async function refreshAll({ showMessages }) {
    try {
      state.metadata = collectMetadata();
      state.sources = await fetchSourceVillages(state.settings.groupId);
      state.targets = await fetchAllTargets();
      buildQueues();
      render();
      if (showMessages) {
        log(`Loaded ${state.sources.length} source villages and ${state.targets.length} targets.`);
        notifySuccess('Offensive farm data refreshed.');
      }
    } catch (error) {
      console.error(`[${SCRIPT_ID}] refresh failed`, error);
      notifyError(`Refresh failed: ${error.message || error}`);
      throw error;
    }
  }

  function collectMetadata() {
    const templateIds = getTemplateIdsFromCurrentPage();
    const templates = getTemplateRequirements(templateIds);
    return {
      csrf: window.game_data?.csrf || window.csrf_token || '',
      currentVillageId: Number(window.game_data?.village?.id || 0),
      currentVillageCoord: {
        x: Number(window.game_data?.village?.x || 0),
        y: Number(window.game_data?.village?.y || 0),
      },
      templateIds,
      templates,
      baseUrl: `${window.location.origin}/game.php`,
      currentQuery: new URLSearchParams(window.location.search),
    };
  }

  function getTemplateIdsFromCurrentPage() {
    const ids = {};
    const a = document.querySelector('#plunder_list a.farm_icon_a');
    const b = document.querySelector('#plunder_list a.farm_icon_b');
    ids.A = a ? extractTemplateId(a.getAttribute('onclick')) : null;
    ids.B = b ? extractTemplateId(b.getAttribute('onclick')) : null;

    if (!ids.A && !ids.B) {
      throw new Error('Could not find template ids on the current LA page.');
    }

    return ids;
  }

  function extractTemplateId(onclickText) {
    const match = onclickText && onclickText.match(/sendUnits\(this,\s*\d+,\s*(\d+)\)/);
    return match ? Number(match[1]) : null;
  }

  function getTemplateRequirements(templateIds) {
    const result = {};
    for (const [key, templateId] of Object.entries(templateIds)) {
      if (!templateId) continue;
      const source = window.Accountmanager?.farm?.templates?.[`t_${templateId}`] || null;
      if (!source) {
        throw new Error(`Template ${key} (${templateId}) not found in Accountmanager.farm.templates.`);
      }
      result[key] = normalizeUnits(source);
    }
    return result;
  }

  async function fetchSourceVillages(groupId) {
    const params = new URLSearchParams({
      village: String(state.metadata.currentVillageId),
      screen: 'overview_villages',
      mode: 'units',
      type: 'complete',
      group: String(groupId),
    });

    const html = await fetchText(`${state.metadata.baseUrl}?${params.toString()}`);
    const doc = parseHtml(html);
    const table = doc.querySelector('#units_table');
    if (!table) {
      throw new Error('Could not parse units overview table for the selected group.');
    }

    const rows = Array.from(table.querySelectorAll('tbody tr'));
    const villages = [];

    for (let index = 0; index < rows.length; index += 5) {
      const head = rows[index];
      if (!head) break;
      const villageCell = head.querySelector('td[rowspan="5"]');
      if (!villageCell) continue;

      const span = villageCell.querySelector('.quickedit-vn');
      const villageId = Number(span?.dataset?.id || 0);
      const label = villageCell.textContent;
      const text = cleanText(label);
      const coordMatch = text.match(/\((\d+)\|(\d+)\)/);
      if (!coordMatch) continue;

      const inVillageRow = rows[index + 1];
      const modeCells = Array.from(inVillageRow.querySelectorAll('td.unit-item'));
      const counts = modeCells.map((cell) => toInt(cell.textContent, 0));
      const units = {
        spear: counts[0] || 0,
        sword: counts[1] || 0,
        axe: counts[2] || 0,
        archer: counts[3] || 0,
        spy: counts[4] || 0,
        light: counts[5] || 0,
        marcher: counts[6] || 0,
        heavy: counts[7] || 0,
        ram: counts[8] || 0,
        catapult: counts[9] || 0,
        knight: counts[10] || 0,
        snob: counts[11] || 0,
        militia: counts[12] || 0,
      };

      villages.push({
        id: villageId,
        name: text,
        shortName: text.replace(/\s*K\d+$/, ''),
        x: Number(coordMatch[1]),
        y: Number(coordMatch[2]),
        units,
      });
    }

    if (!villages.length) {
      throw new Error('No source villages found in the selected group.');
    }

    return villages;
  }

  async function fetchAllTargets() {
    const pageCount = detectPageCountFromCurrentDoc(document);
    const pagePromises = [];

    for (let page = 0; page < pageCount; page += 1) {
      if (page === getCurrentFarmPage()) {
        pagePromises.push(Promise.resolve(document.documentElement.outerHTML));
      } else {
        const params = new URLSearchParams(window.location.search);
        params.set('Farm_page', String(page));
        params.set('screen', 'am_farm');
        pagePromises.push(fetchText(`${state.metadata.baseUrl}?${params.toString()}`));
      }
    }

    const pages = await Promise.all(pagePromises);
    const targets = [];

    for (const html of pages) {
      const doc = parseHtml(html);
      const rows = Array.from(doc.querySelectorAll('#plunder_list tr[id^="village_"]'));
      for (const row of rows) {
        const target = parseTargetRow(row);
        if (target) targets.push(target);
      }
    }

    return dedupeTargets(targets);
  }

  function getCurrentFarmPage() {
    const url = new URL(window.location.href);
    return toInt(url.searchParams.get('Farm_page'), 0);
  }

  function detectPageCountFromCurrentDoc(doc) {
    const nav = doc.querySelector('#plunder_list_nav');
    if (!nav) return 1;
    const numbers = Array.from(nav.querySelectorAll('.paged-nav-item'))
      .map((node) => cleanText(node.textContent).replace(/[^\d]/g, ''))
      .filter(Boolean)
      .map((value) => Number(value));
    const max = numbers.length ? Math.max(...numbers) : 1;
    return Math.max(max, 1);
  }

  function parseTargetRow(row) {
    const idMatch = row.id.match(/village_(\d+)/);
    if (!idMatch) return null;
    const targetId = Number(idMatch[1]);

    const cells = Array.from(row.querySelectorAll('td'));
    if (cells.length < 12) return null;

    const reportLink = cells[3]?.querySelector('a');
    const coordText = cleanText(reportLink?.textContent || '');
    const coordMatch = coordText.match(/\((\d+)\|(\d+)\)/);
    if (!coordMatch) return null;

    const reportIdMatch = reportLink?.getAttribute('href')?.match(/view=(\d+)/);
    const resultSrc = cells[1]?.querySelector('img')?.getAttribute('src') || '';
    const haulTitle = cells[2]?.querySelector('img')?.getAttribute('title') || '';
    const wall = toInt(cells[8]?.textContent, 0);
    const currentDistance = toFloat(cells[9]?.textContent, 0);
    const farmA = cells[10]?.querySelector('a.farm_icon_a');
    const farmB = cells[11]?.querySelector('a.farm_icon_b');

    return {
      id: targetId,
      reportId: reportIdMatch ? Number(reportIdMatch[1]) : null,
      coord: `${coordMatch[1]}|${coordMatch[2]}`,
      x: Number(coordMatch[1]),
      y: Number(coordMatch[2]),
      wall,
      currentDistance,
      resultColor: normalizeResultColor(resultSrc),
      haulType: normalizeHaulType(haulTitle),
      farmDisabled: Boolean(row.querySelector('.farm_icon_disabled')),
      rowClass: row.className,
      availableTemplates: {
        A: Boolean(farmA),
        B: Boolean(farmB),
      },
    };
  }

  function dedupeTargets(targets) {
    const map = new Map();
    for (const target of targets) {
      if (!map.has(target.id)) {
        map.set(target.id, target);
      }
    }
    return Array.from(map.values());
  }

  function normalizeResultColor(src) {
    const match = src.match(/dots\/([a-z_]+)\.webp/);
    return match ? match[1] : 'unknown';
  }

  function normalizeHaulType(title) {
    const lower = title.toLowerCase();
    if (lower.includes('full haul')) return 'full';
    if (lower.includes('partial haul')) return 'partial';
    return 'unknown';
  }

  function buildQueues() {
    const templates = state.metadata.templates;
    const filteredTargets = state.targets.filter((target) => passesFilters(target));

    const sourcePools = {};
    for (const key of Object.keys(templates)) {
      sourcePools[key] = state.sources.map((source) => ({
        ...source,
        units: { ...source.units },
      }));
    }

    state.queues = { A: [], B: [] };

    for (const templateKey of Object.keys(templates)) {
      const templateUnits = templates[templateKey];
      const queue = [];

      for (const target of filteredTargets) {
        const bestSource = chooseNearestEligibleSource(sourcePools[templateKey], target, templateUnits);
        if (!bestSource) continue;

        consumeUnits(bestSource.units, templateUnits);
        queue.push({
          id: `${templateKey}-${target.id}`,
          templateKey,
          templateId: state.metadata.templateIds[templateKey],
          sourceId: bestSource.id,
          sourceName: bestSource.shortName,
          sourceCoord: `${bestSource.x}|${bestSource.y}`,
          targetId: target.id,
          targetCoord: target.coord,
          targetX: target.x,
          targetY: target.y,
          wall: target.wall,
          resultColor: target.resultColor,
          haulType: target.haulType,
          distance: calcDistance(bestSource, target),
          sent: false,
          skipped: false,
          reason: '',
        });
      }

      state.queues[templateKey] = queue;
    }
  }

  function passesFilters(target) {
    if (state.settings.maxWall > 0 && target.wall > state.settings.maxWall) return false;

    if (!isColorAllowed(target.resultColor)) return false;

    if (target.haulType === 'full' && !state.settings.allowFullHaul) return false;
    if (target.haulType === 'partial' && !state.settings.allowPartialHaul) return false;
    if (target.haulType === 'unknown') return false;

    return true;
  }

  function isColorAllowed(color) {
    const map = {
      green: state.settings.allowGreen,
      blue: state.settings.allowBlue,
      yellow: state.settings.allowYellow,
      red_yellow: state.settings.allowRedYellow,
      red_blue: state.settings.allowRedBlue,
      red: state.settings.allowRed,
    };
    return Boolean(map[color]);
  }

  function chooseNearestEligibleSource(sources, target, neededUnits) {
    const eligible = sources
      .filter((source) => hasEnoughUnits(source.units, neededUnits))
      .map((source) => ({ source, distance: calcDistance(source, target) }))
      .filter((item) => state.settings.maxDistance <= 0 || item.distance <= state.settings.maxDistance)
      .sort((left, right) => left.distance - right.distance);

    return eligible.length ? eligible[0].source : null;
  }

  function hasEnoughUnits(available, needed) {
    return Object.entries(needed).every(([unit, count]) => (available[unit] || 0) >= count);
  }

  function consumeUnits(available, needed) {
    for (const [unit, count] of Object.entries(needed)) {
      available[unit] = Math.max(0, (available[unit] || 0) - count);
    }
  }

  function calcDistance(source, target) {
    return Number(Math.hypot(source.x - target.x, source.y - target.y).toFixed(2));
  }

  async function sendNext(templateKey) {
    if (state.sending) {
      log('A send is already in progress.');
      return;
    }

    const queue = state.queues[templateKey] || [];
    const item = queue.find((entry) => !entry.sent && !entry.skipped);
    if (!item) {
      log(`No queued target left for template ${templateKey}.`);
      return;
    }

    state.sending = true;
    render();

    try {
      const response = await sendFarmCommand(item);
      item.sent = true;
      log(`Sent ${templateKey}: ${item.sourceCoord} -> ${item.targetCoord}`);
      notifySuccess(`${templateKey}: ${item.sourceCoord} -> ${item.targetCoord}`);
      applyLocalUnitUpdate(item);
      if (state.settings.autoRebuildAfterSend) {
        buildQueues();
      }
      render();
      return response;
    } finally {
      state.sending = false;
      render();
    }
  }

  async function sendFarmCommand(item) {
    const url = `${state.metadata.baseUrl}?${new URLSearchParams({
      village: String(item.sourceId),
      screen: 'am_farm',
      mode: 'farm',
      ajaxaction: 'farm',
      json: '1',
      h: state.metadata.csrf,
    }).toString()}`;

    const body = new URLSearchParams({
      target: String(item.targetId),
      template_id: String(item.templateId),
      source: String(item.sourceId),
    });

    const response = await fetch(url, {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'X-Requested-With': 'XMLHttpRequest',
      },
      body: body.toString(),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const json = await response.json();
    if (json.error) {
      throw new Error(typeof json.error === 'string' ? json.error : 'Unknown server error');
    }

    return json;
  }

  function applyLocalUnitUpdate(item) {
    const needed = state.metadata.templates[item.templateKey];
    const source = state.sources.find((entry) => entry.id === item.sourceId);
    if (!source) return;
    consumeUnits(source.units, needed);
  }

  function bindHotkeys() {
    document.addEventListener('keydown', (event) => {
      if (shouldIgnoreHotkeys(event)) return;

      const templateKey = resolveTemplateKeyFromHotkey(event);
      if (!templateKey) return;

      event.preventDefault();

      if (event.repeat) {
        if (state.holdKey === templateKey) return;
        startHold(templateKey);
        return;
      }

      void sendNext(templateKey).catch(reportSendError);
      startHold(templateKey);
    });

    document.addEventListener('keyup', (event) => {
      const templateKey = resolveTemplateKeyFromHotkey(event);
      if (!templateKey) return;
      stopHold();
    });

    window.addEventListener('blur', stopHold);
  }

  function resolveTemplateKeyFromHotkey(event) {
    if (event.key === 'Enter') return state.settings.enterTemplate;
    if (event.key.toLowerCase() === 'a') return 'A';
    if (event.key.toLowerCase() === 'b') return 'B';
    return null;
  }

  function shouldIgnoreHotkeys(event) {
    const tag = event.target?.tagName?.toLowerCase();
    return tag === 'input' || tag === 'textarea' || tag === 'select' || event.target?.isContentEditable;
  }

  function startHold(templateKey) {
    stopHold();
    state.holdKey = templateKey;
    state.holdTimer = window.setInterval(() => {
      void sendNext(templateKey).catch(reportSendError);
    }, Math.max(120, state.settings.holdIntervalMs));
  }

  function stopHold() {
    if (state.holdTimer) {
      clearInterval(state.holdTimer);
    }
    state.holdTimer = null;
    state.holdKey = null;
  }

  function render() {
    if (!state.ui.host) return;

    const rows = [];
    for (const templateKey of ['A', 'B']) {
      for (const item of state.queues[templateKey] || []) {
        rows.push(item);
      }
    }

    state.ui.queueBody.innerHTML = rows.length
      ? rows.map((item) => `
          <tr class="${item.sent ? 'tof-row-sent' : ''}">
            <td>${item.templateKey}</td>
            <td>${escapeHtml(item.sourceCoord)}</td>
            <td>${escapeHtml(item.targetCoord)}</td>
            <td>${item.wall}</td>
            <td>${item.distance.toFixed(2)}</td>
            <td>${escapeHtml(item.resultColor)}</td>
            <td>${escapeHtml(item.haulType)}</td>
            <td>${item.sent ? 'sent' : 'queued'}</td>
          </tr>
        `).join('')
      : '<tr><td colspan="8" class="tof-muted">Queue is empty.</td></tr>';

    const totalA = state.queues.A?.filter((item) => !item.sent).length || 0;
    const totalB = state.queues.B?.filter((item) => !item.sent).length || 0;
    const totalTargets = state.targets.length;
    const totalSources = state.sources.length;

    state.ui.stats.innerHTML = [
      `<span class="tof-tag">Sources: ${totalSources}</span>`,
      `<span class="tof-tag">Targets: ${totalTargets}</span>`,
      `<span class="tof-tag">Queue A: ${totalA}</span>`,
      `<span class="tof-tag">Queue B: ${totalB}</span>`,
      `<span class="tof-tag">Sending: ${state.sending ? 'yes' : 'no'}</span>`,
      `<span class="tof-tag">Hotkeys: Enter=${escapeHtml(state.settings.enterTemplate)}, A, B</span>`,
    ].join('');

    state.ui.log.textContent = state.logLines.length ? state.logLines.join('\n') : 'Ready.';
    state.ui.sendA.disabled = state.sending || !totalA;
    state.ui.sendB.disabled = state.sending || !totalB;
  }

  function log(message) {
    const time = new Date().toLocaleTimeString();
    state.logLines.unshift(`[${time}] ${message}`);
    state.logLines = state.logLines.slice(0, 30);
    render();
  }

  function reportSendError(error) {
    console.error(`[${SCRIPT_ID}] send failed`, error);
    log(`Send failed: ${error.message || error}`);
    notifyError(`Send failed: ${error.message || error}`);
  }

  function parseHtml(html) {
    return new DOMParser().parseFromString(html, 'text/html');
  }

  async function fetchText(url) {
    const response = await fetch(url, {
      credentials: 'same-origin',
      headers: { 'X-Requested-With': 'XMLHttpRequest' },
    });
    if (!response.ok) {
      throw new Error(`Request failed (${response.status}) for ${url}`);
    }
    return await response.text();
  }

  function waitFor(predicate, timeoutMs = 10000) {
    return new Promise((resolve, reject) => {
      const startedAt = Date.now();
      const timer = window.setInterval(() => {
        try {
          if (predicate()) {
            clearInterval(timer);
            resolve();
            return;
          }
          if (Date.now() - startedAt > timeoutMs) {
            clearInterval(timer);
            reject(new Error('Timed out while waiting for page elements.'));
          }
        } catch (error) {
          clearInterval(timer);
          reject(error);
        }
      }, 50);
    });
  }

  function normalizeUnits(units) {
    const result = {};
    for (const [unit, value] of Object.entries(units)) {
      result[unit] = Number(value || 0);
    }
    return result;
  }

  function toInt(value, fallback) {
    const parsed = parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function toFloat(value, fallback) {
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function cleanText(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function notifySuccess(message) {
    if (window.UI?.SuccessMessage) {
      window.UI.SuccessMessage(message, 2500);
    }
  }

  function notifyError(message) {
    if (window.UI?.ErrorMessage) {
      window.UI.ErrorMessage(message, 4000);
    }
  }
})();
