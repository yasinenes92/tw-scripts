// ==UserScript==
// @name         TW Offensive Farm Planner
// @namespace    https://github.com/yasinenes92/tw-scripts
// @version      0.2.0
// @description  Loot Assistant planner with LA Enhancer style filters and nearest-source farming.
// @author       OpenAI + Fikri Evlat
// @match        https://*.tribalwars.net/game.php*screen=am_farm*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  const SCRIPT_ID = 'tw-offensive-farm';
  const STORAGE_KEY = 'tw_offensive_farm_state_v2';
  const DEFAULT_GROUP_ID = Number(window.game_data?.group_id || 12858);

  const DEFAULTS = {
    groupId: DEFAULT_GROUP_ID > 0 ? DEFAULT_GROUP_ID : 12858,
    startPage: 1,
    endPage: 'max',
    orderBy: 'distance',
    direction: 'asc',
    allowGreen: true,
    allowBlue: true,
    allowYellow: true,
    allowRedYellow: false,
    allowRedBlue: false,
    allowRed: false,
    enableHauls: false,
    haulMode: 'both',
    enableWalls: false,
    wallOperator: 'less_than',
    wallValue: 0,
    enableDistances: false,
    distanceOperator: 'less_than',
    distanceValue: 10,
    autoRebuildAfterSend: true,
    enterTemplate: 'A',
    holdIntervalMs: 220,
    debugMode: false,
    collapsed: false,
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
    currentPageCount: 1,
  };

  if (!isLootAssistantPage()) {
    return;
  }

  boot().catch((error) => {
    console.error(`[${SCRIPT_ID}] boot failed`, error);
    log(`Boot failed: ${error.message || error}`);
    notifyError(`Boot failed: ${error.message || error}`);
  });

  async function boot() {
    await waitFor(() => document.querySelector('#plunder_list'));
    injectStyles();
    state.currentPageCount = detectPageCountFromCurrentDoc(document);
    state.metadata = collectMetadata();
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
      #${SCRIPT_ID}-root .settingsTable {
        width: 100%;
        border-collapse: separate;
      }
      #${SCRIPT_ID}-root .settingsTable td {
        padding: 4px 6px;
        vertical-align: top;
      }
      #${SCRIPT_ID}-root .settingsTable label {
        display: inline;
        font-weight: normal;
      }
      #${SCRIPT_ID}-root .settingsTable input[type="text"],
      #${SCRIPT_ID}-root .settingsTable input[type="number"],
      #${SCRIPT_ID}-root .settingsTable select {
        font-size: 8pt;
        box-sizing: border-box;
      }
      #${SCRIPT_ID}-root .settingsTable .smallNumber {
        width: 46px;
      }
      #${SCRIPT_ID}-root .settingsTable .mediumNumber {
        width: 58px;
      }
      #${SCRIPT_ID}-root .settingsTable .wideSelect {
        min-width: 120px;
      }
      #${SCRIPT_ID}-root .settingsActionBar {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        align-items: center;
      }
      #${SCRIPT_ID}-root .settingsSummary {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }
      #${SCRIPT_ID}-root .summaryTag {
        display: inline-block;
        padding: 2px 6px;
        border: 1px solid #7d510f;
        background: #fff5da;
        border-radius: 10px;
        font-size: 11px;
      }
      #${SCRIPT_ID}-root .rightBox {
        min-width: 180px;
      }
      #${SCRIPT_ID}-root .miniToggle {
        float: right;
        text-align: center;
        line-height: 100%;
        width: 12px;
        height: 12px;
        margin: 0;
        position: relative;
        background-color: tan;
        opacity: .7;
      }
      #${SCRIPT_ID}-root .miniToggle a {
        color: #603000;
        text-decoration: none;
        font-weight: bold;
      }
      #${SCRIPT_ID}-root .sectionTitle {
        font-weight: bold;
      }
      #${SCRIPT_ID}-root .inlineWrap {
        display: inline-flex;
        align-items: center;
        gap: 3px;
        flex-wrap: wrap;
      }
      #${SCRIPT_ID}-root .queueBox,
      #${SCRIPT_ID}-root .logBox {
        max-height: 250px;
        overflow: auto;
      }
      #${SCRIPT_ID}-root .queueTable {
        width: 100%;
        border-collapse: collapse;
      }
      #${SCRIPT_ID}-root .queueTable td,
      #${SCRIPT_ID}-root .queueTable th {
        padding: 3px 5px;
      }
      #${SCRIPT_ID}-root .queueTable th {
        white-space: nowrap;
      }
      #${SCRIPT_ID}-root .queueRowSent {
        opacity: .55;
        text-decoration: line-through;
      }
      #${SCRIPT_ID}-root .muted {
        opacity: .75;
      }
      #${SCRIPT_ID}-root .hotkeyTable td {
        padding: 3px 6px;
      }
      #${SCRIPT_ID}-root .statusGreen {
        color: #1b6f2a;
        font-weight: bold;
      }
      #${SCRIPT_ID}-root .statusBrown {
        color: #603000;
        font-weight: bold;
      }
      #${SCRIPT_ID}-root .statusRed {
        color: #a00000;
        font-weight: bold;
      }
      #${SCRIPT_ID}-root .settingsSpacer {
        height: 4px;
      }
    `;

    document.head.appendChild(style);
  }

  function buildPanel() {
    const wrapper = document.createElement('div');
    wrapper.id = `${SCRIPT_ID}-root`;
    wrapper.innerHTML = renderPanelShell();

    const insertionPoint = document.querySelector('#contentContainer h3') || document.querySelector('#am_widget_Farm') || document.querySelector('#content_value');
    if (insertionPoint.parentNode) {
      insertionPoint.parentNode.insertBefore(wrapper, insertionPoint.nextSibling);
    }

    cacheUi(wrapper);
    applySettingsToUi();
    bindUi();
    updateCollapsedState();
    render();
  }

  function renderPanelShell() {
    return `
      <div class="vis" id="${SCRIPT_ID}-settingsDiv">
        <table class="settingsTable">
          <thead>
            <tr>
              <th colspan="5" class="vis" style="padding:0;">
                <h4>
                  TW Offensive Farm Planner - LA Enhancer UI
                  <span style="font-size:10px; float:right; font-weight:normal; font-style:normal;">
                    nearest-source planner
                    <div class="miniToggle"><a href="#" id="${SCRIPT_ID}-collapseLink">${state.settings.collapsed ? '+' : '-'}</a></div>
                  </span>
                </h4>
              </th>
            </tr>
          </thead>
          <tbody id="${SCRIPT_ID}-settingsBody">
            <tr>
              <td class="col1" style="min-width:230px;">
                <span class="sectionTitle">Pages</span>
                &nbsp;start&nbsp;<input type="text" value="" maxlength="3" class="smallNumber" id="${SCRIPT_ID}-start_page">
                &nbsp;end&nbsp;<input type="text" value="" maxlength="5" class="smallNumber" id="${SCRIPT_ID}-end_page">
                <div class="settingsSpacer"></div>
                <span class="sectionTitle">Source group</span>
                &nbsp;<input type="text" value="" maxlength="8" class="mediumNumber" id="${SCRIPT_ID}-group_id">
              </td>
              <td colspan="3">
                <span class="sectionTitle">Order</span>
                &nbsp;
                <select id="${SCRIPT_ID}-order_by" class="wideSelect">
                  <option value="distance">Distance</option>
                  <option value="date">Date</option>
                  <option value="wall">Wall</option>
                </select>
                &nbsp;
                <select id="${SCRIPT_ID}-direction" class="wideSelect">
                  <option value="asc">Ascending</option>
                  <option value="desc">Descending</option>
                </select>
                <div class="settingsSpacer"></div>
                <span class="sectionTitle">Hotkeys</span>
                &nbsp;Enter =
                <select id="${SCRIPT_ID}-enter_template">
                  <option value="A">A</option>
                  <option value="B">B</option>
                </select>
                &nbsp;Hold ms&nbsp;<input type="text" value="" maxlength="4" class="mediumNumber" id="${SCRIPT_ID}-hold_interval">
              </td>
              <td rowspan="4" valign="top" class="rightBox">
                <form>
                  <div class="sectionTitle">Report colors</div>
                  <input type="checkbox" id="${SCRIPT_ID}-green"><label for="${SCRIPT_ID}-green"><img src="/graphic/dots/green.webp">&nbsp;Green</label><br>
                  <input type="checkbox" id="${SCRIPT_ID}-blue"><label for="${SCRIPT_ID}-blue"><img src="/graphic/dots/blue.webp">&nbsp;Blue</label><br>
                  <input type="checkbox" id="${SCRIPT_ID}-yellow"><label for="${SCRIPT_ID}-yellow"><img src="/graphic/dots/yellow.webp">&nbsp;Yellow</label><br>
                  <input type="checkbox" id="${SCRIPT_ID}-red_yellow"><label for="${SCRIPT_ID}-red_yellow"><img src="/graphic/dots/red_yellow.webp">&nbsp;Red/Yellow</label><br>
                  <input type="checkbox" id="${SCRIPT_ID}-red_blue"><label for="${SCRIPT_ID}-red_blue"><img src="/graphic/dots/red_blue.webp">&nbsp;Red/Blue</label><br>
                  <input type="checkbox" id="${SCRIPT_ID}-red"><label for="${SCRIPT_ID}-red"><img src="/graphic/dots/red.webp">&nbsp;Red</label>
                </form>
              </td>
            </tr>
            <tr>
              <td rowspan="2">
                <span class="sectionTitle">Planner mode</span><br>
                <span class="muted">Targets are always assigned to the nearest eligible village from the selected group.</span>
              </td>
              <td style="width:26px"><input type="checkbox" id="${SCRIPT_ID}-enable_hauls"></td>
              <td style="width:110px"><label for="${SCRIPT_ID}-enable_hauls">Haul filter</label></td>
              <td>
                <select id="${SCRIPT_ID}-haul_mode" class="wideSelect">
                  <option value="both">Full + Partial</option>
                  <option value="full">Only Full</option>
                  <option value="partial">Only Partial</option>
                </select>
              </td>
            </tr>
            <tr>
              <td><input type="checkbox" id="${SCRIPT_ID}-enable_walls"></td>
              <td><label for="${SCRIPT_ID}-enable_walls">Wall filter</label></td>
              <td>
                <select id="${SCRIPT_ID}-wall_operator">
                  <option value="greater_than">&gt;</option>
                  <option value="less_than">&lt;</option>
                  <option value="equal_to">=</option>
                </select>
                &nbsp;<input type="text" id="${SCRIPT_ID}-wall_value" maxlength="3" class="smallNumber" value="">
              </td>
            </tr>
            <tr>
              <td><input type="checkbox" id="${SCRIPT_ID}-enable_distances"></td>
              <td><label for="${SCRIPT_ID}-enable_distances">Distance filter</label></td>
              <td>
                <select id="${SCRIPT_ID}-distance_operator">
                  <option value="greater_than">&gt;</option>
                  <option value="less_than">&lt;</option>
                  <option value="equal_to">=</option>
                </select>
                &nbsp;<input type="text" id="${SCRIPT_ID}-distance_value" maxlength="6" class="mediumNumber" value="">
              </td>
            </tr>
            <tr>
              <td>
                <input type="checkbox" id="${SCRIPT_ID}-auto_rebuild"><label for="${SCRIPT_ID}-auto_rebuild">Rebuild queue after send</label>
              </td>
              <td>
                <input type="checkbox" id="${SCRIPT_ID}-debug_mode"><label for="${SCRIPT_ID}-debug_mode">Debug log</label>
              </td>
              <td colspan="2">
                <div class="settingsActionBar">
                  <button class="btn" type="button" id="${SCRIPT_ID}-refresh">Refresh</button>
                  <button class="btn" type="button" id="${SCRIPT_ID}-build">Build queue</button>
                  <button class="btn" type="button" id="${SCRIPT_ID}-send_a">Send next A</button>
                  <button class="btn" type="button" id="${SCRIPT_ID}-send_b">Send next B</button>
                </div>
              </td>
              <td>
                <div class="muted">A = send next A<br>B = send next B<br>Enter = selected default<br>Hold key = repeat send</div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="vis" id="${SCRIPT_ID}-summaryBox">
        <h4>Planner summary</h4>
        <div class="vis_item settingsSummary" id="${SCRIPT_ID}-stats"></div>
      </div>

      <div class="vis" id="${SCRIPT_ID}-queueBox">
        <h4>Planned queue</h4>
        <div class="queueBox">
          <table class="vis queueTable">
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
            <tbody id="${SCRIPT_ID}-queueBody"></tbody>
          </table>
        </div>
      </div>

      <div class="vis" id="${SCRIPT_ID}-hotkeyBox">
        <h4>Hotkey status</h4>
        <table class="vis hotkeyTable" style="width:100%;">
          <tbody>
            <tr>
              <td style="width:180px;"><strong>Enter template</strong></td>
              <td id="${SCRIPT_ID}-hotkeyEnterValue"></td>
              <td style="width:180px;"><strong>Hold interval</strong></td>
              <td id="${SCRIPT_ID}-hotkeyHoldValue"></td>
            </tr>
            <tr>
              <td><strong>Active hold key</strong></td>
              <td id="${SCRIPT_ID}-hotkeyHoldKey"></td>
              <td><strong>Sending now</strong></td>
              <td id="${SCRIPT_ID}-hotkeySending"></td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="vis" id="${SCRIPT_ID}-logBoxWrap">
        <h4>Log</h4>
        <div class="vis_item logBox" id="${SCRIPT_ID}-logBox">Ready.</div>
      </div>
    `;
  }

  function cacheUi(root) {
    state.ui.root = root;
    state.ui.settingsBody = root.querySelector(`#${SCRIPT_ID}-settingsBody`);
    state.ui.collapseLink = root.querySelector(`#${SCRIPT_ID}-collapseLink`);
    state.ui.startPage = root.querySelector(`#${SCRIPT_ID}-start_page`);
    state.ui.endPage = root.querySelector(`#${SCRIPT_ID}-end_page`);
    state.ui.groupId = root.querySelector(`#${SCRIPT_ID}-group_id`);
    state.ui.orderBy = root.querySelector(`#${SCRIPT_ID}-order_by`);
    state.ui.direction = root.querySelector(`#${SCRIPT_ID}-direction`);
    state.ui.enterTemplate = root.querySelector(`#${SCRIPT_ID}-enter_template`);
    state.ui.holdInterval = root.querySelector(`#${SCRIPT_ID}-hold_interval`);
    state.ui.green = root.querySelector(`#${SCRIPT_ID}-green`);
    state.ui.blue = root.querySelector(`#${SCRIPT_ID}-blue`);
    state.ui.yellow = root.querySelector(`#${SCRIPT_ID}-yellow`);
    state.ui.redYellow = root.querySelector(`#${SCRIPT_ID}-red_yellow`);
    state.ui.redBlue = root.querySelector(`#${SCRIPT_ID}-red_blue`);
    state.ui.red = root.querySelector(`#${SCRIPT_ID}-red`);
    state.ui.enableHauls = root.querySelector(`#${SCRIPT_ID}-enable_hauls`);
    state.ui.haulMode = root.querySelector(`#${SCRIPT_ID}-haul_mode`);
    state.ui.enableWalls = root.querySelector(`#${SCRIPT_ID}-enable_walls`);
    state.ui.wallOperator = root.querySelector(`#${SCRIPT_ID}-wall_operator`);
    state.ui.wallValue = root.querySelector(`#${SCRIPT_ID}-wall_value`);
    state.ui.enableDistances = root.querySelector(`#${SCRIPT_ID}-enable_distances`);
    state.ui.distanceOperator = root.querySelector(`#${SCRIPT_ID}-distance_operator`);
    state.ui.distanceValue = root.querySelector(`#${SCRIPT_ID}-distance_value`);
    state.ui.autoRebuild = root.querySelector(`#${SCRIPT_ID}-auto_rebuild`);
    state.ui.debugMode = root.querySelector(`#${SCRIPT_ID}-debug_mode`);
    state.ui.refresh = root.querySelector(`#${SCRIPT_ID}-refresh`);
    state.ui.build = root.querySelector(`#${SCRIPT_ID}-build`);
    state.ui.sendA = root.querySelector(`#${SCRIPT_ID}-send_a`);
    state.ui.sendB = root.querySelector(`#${SCRIPT_ID}-send_b`);
    state.ui.stats = root.querySelector(`#${SCRIPT_ID}-stats`);
    state.ui.queueBody = root.querySelector(`#${SCRIPT_ID}-queueBody`);
    state.ui.logBox = root.querySelector(`#${SCRIPT_ID}-logBox`);
    state.ui.hotkeyEnterValue = root.querySelector(`#${SCRIPT_ID}-hotkeyEnterValue`);
    state.ui.hotkeyHoldValue = root.querySelector(`#${SCRIPT_ID}-hotkeyHoldValue`);
    state.ui.hotkeyHoldKey = root.querySelector(`#${SCRIPT_ID}-hotkeyHoldKey`);
    state.ui.hotkeySending = root.querySelector(`#${SCRIPT_ID}-hotkeySending`);
  }

  function applySettingsToUi() {
    state.ui.startPage.value = String(state.settings.startPage);
    state.ui.endPage.value = String(state.settings.endPage);
    state.ui.groupId.value = String(state.settings.groupId);
    state.ui.orderBy.value = state.settings.orderBy;
    state.ui.direction.value = state.settings.direction;
    state.ui.enterTemplate.value = state.settings.enterTemplate;
    state.ui.holdInterval.value = String(state.settings.holdIntervalMs);
    state.ui.green.checked = state.settings.allowGreen;
    state.ui.blue.checked = state.settings.allowBlue;
    state.ui.yellow.checked = state.settings.allowYellow;
    state.ui.redYellow.checked = state.settings.allowRedYellow;
    state.ui.redBlue.checked = state.settings.allowRedBlue;
    state.ui.red.checked = state.settings.allowRed;
    state.ui.enableHauls.checked = state.settings.enableHauls;
    state.ui.haulMode.value = state.settings.haulMode;
    state.ui.enableWalls.checked = state.settings.enableWalls;
    state.ui.wallOperator.value = state.settings.wallOperator;
    state.ui.wallValue.value = String(state.settings.wallValue);
    state.ui.enableDistances.checked = state.settings.enableDistances;
    state.ui.distanceOperator.value = state.settings.distanceOperator;
    state.ui.distanceValue.value = String(state.settings.distanceValue);
    state.ui.autoRebuild.checked = state.settings.autoRebuildAfterSend;
    state.ui.debugMode.checked = state.settings.debugMode;
  }

  function bindUi() {
    const persist = () => {
      state.settings.startPage = clampPositiveInt(state.ui.startPage.value, 1);
      state.settings.endPage = normalizeEndPage(state.ui.endPage.value);
      state.settings.groupId = clampPositiveInt(state.ui.groupId.value, DEFAULTS.groupId);
      state.settings.orderBy = oneOf(state.ui.orderBy.value, ['distance', 'date', 'wall'], DEFAULTS.orderBy);
      state.settings.direction = oneOf(state.ui.direction.value, ['asc', 'desc'], DEFAULTS.direction);
      state.settings.enterTemplate = oneOf(state.ui.enterTemplate.value, ['A', 'B'], DEFAULTS.enterTemplate);
      state.settings.holdIntervalMs = Math.max(100, clampPositiveInt(state.ui.holdInterval.value, DEFAULTS.holdIntervalMs));
      state.settings.allowGreen = state.ui.green.checked;
      state.settings.allowBlue = state.ui.blue.checked;
      state.settings.allowYellow = state.ui.yellow.checked;
      state.settings.allowRedYellow = state.ui.redYellow.checked;
      state.settings.allowRedBlue = state.ui.redBlue.checked;
      state.settings.allowRed = state.ui.red.checked;
      state.settings.enableHauls = state.ui.enableHauls.checked;
      state.settings.haulMode = oneOf(state.ui.haulMode.value, ['both', 'full', 'partial'], DEFAULTS.haulMode);
      state.settings.enableWalls = state.ui.enableWalls.checked;
      state.settings.wallOperator = oneOf(state.ui.wallOperator.value, ['greater_than', 'less_than', 'equal_to'], DEFAULTS.wallOperator);
      state.settings.wallValue = toInt(state.ui.wallValue.value, 0);
      state.settings.enableDistances = state.ui.enableDistances.checked;
      state.settings.distanceOperator = oneOf(state.ui.distanceOperator.value, ['greater_than', 'less_than', 'equal_to'], DEFAULTS.distanceOperator);
      state.settings.distanceValue = toFloat(state.ui.distanceValue.value, DEFAULTS.distanceValue);
      state.settings.autoRebuildAfterSend = state.ui.autoRebuild.checked;
      state.settings.debugMode = state.ui.debugMode.checked;
      saveSettings();
      render();
    };

    state.ui.root.querySelectorAll('input, select').forEach((node) => {
      node.addEventListener('change', persist);
      node.addEventListener('blur', persist);
    });

    state.ui.collapseLink.addEventListener('click', (event) => {
      event.preventDefault();
      state.settings.collapsed = !state.settings.collapsed;
      saveSettings();
      updateCollapsedState();
    });

    state.ui.refresh.addEventListener('click', async () => {
      persist();
      await refreshAll({ showMessages: true });
    });

    state.ui.build.addEventListener('click', () => {
      persist();
      buildQueues();
      render();
      log('Queue rebuilt from current targets and source pool.');
    });

    state.ui.sendA.addEventListener('click', () => {
      void sendNext('A').catch(reportSendError);
    });

    state.ui.sendB.addEventListener('click', () => {
      void sendNext('B').catch(reportSendError);
    });
  }

  function updateCollapsedState() {
    if (!state.ui.settingsBody || !state.ui.collapseLink) return;
    state.ui.settingsBody.style.display = state.settings.collapsed ? 'none' : '';
    state.ui.collapseLink.textContent = state.settings.collapsed ? '+' : '-';
  }

  async function refreshAll({ showMessages }) {
    try {
      state.currentPageCount = detectPageCountFromCurrentDoc(document);
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
      log(`Refresh failed: ${error.message || error}`);
      notifyError(`Refresh failed: ${error.message || error}`);
      throw error;
    }
  }

  function collectMetadata() {
    const templateIds = getTemplateIdsFromCurrentPage();
    const templates = getTemplateRequirements(templateIds);

    return {
      csrf: String(window.game_data?.csrf || window.csrf_token || ''),
      currentVillageId: Number(window.game_data?.village?.id || 0),
      currentGroupId: Number(window.game_data?.group_id || 0),
      templateIds,
      templates,
      baseUrl: `${window.location.origin}/game.php`,
      worldUnits: Array.isArray(window.game_data?.units) ? [...window.game_data.units] : ['spear', 'sword', 'axe', 'archer', 'spy', 'light', 'marcher', 'heavy', 'ram', 'catapult', 'knight', 'snob', 'militia'],
    };
  }

  function getTemplateIdsFromCurrentPage() {
    const firstA = document.querySelector('#plunder_list a.farm_icon_a');
    const firstB = document.querySelector('#plunder_list a.farm_icon_b');
    const ids = {
      A: firstA ? extractTemplateId(firstA.getAttribute('onclick')) : null,
      B: firstB ? extractTemplateId(firstB.getAttribute('onclick')) : null,
    };

    if (!ids.A && !ids.B) {
      throw new Error('Could not detect farm template ids on the current Loot Assistant page.');
    }

    return ids;
  }

  function extractTemplateId(onclickText) {
    if (!onclickText) return null;
    const match = onclickText.match(/sendUnits\(this,\s*\d+,\s*(\d+)\)/);
    return match ? Number(match[1]) : null;
  }

  function getTemplateRequirements(templateIds) {
    const result = {};

    Object.entries(templateIds).forEach(([key, templateId]) => {
      if (!templateId) return;
      const source = window.Accountmanager?.farm?.templates?.[`t_${templateId}`];
      if (!source) {
        throw new Error(`Template ${key} (${templateId}) is not present in Accountmanager.farm.templates.`);
      }
      result[key] = normalizeUnits(source);
    });

    return result;
  }

  async function fetchSourceVillages(groupId) {
    const attempts = [
      { mode: 'units', group: groupId, type: null, label: 'units+group' },
      { mode: 'units', group: groupId, type: 'complete', label: 'units+group+type=complete' },
      { mode: 'units', group: null, type: null, label: 'units current selection' },
      { mode: 'combined', group: groupId, type: null, label: 'combined+group' },
    ];

    for (const attempt of attempts) {
      const params = new URLSearchParams({
        village: String(state.metadata.currentVillageId),
        screen: 'overview_villages',
        mode: attempt.mode,
        page: '-1',
      });

      if (attempt.group) params.set('group', String(attempt.group));
      if (attempt.type) params.set('type', attempt.type);

      const url = `${state.metadata.baseUrl}?${params.toString()}`;
      debug(`Trying source fetch: ${url}`);
      const html = await fetchText(url);
      const doc = parseHtml(html);

      const villages = parseSourceVillages(doc, url);
      if (villages.length) {
        debug(`Source fetch succeeded via ${attempt.label}. Count=${villages.length}`);
        return villages;
      }

      debug(`Source fetch returned 0 villages via ${attempt.label}.`);
    }

    throw new Error('No source villages found in the selected group.');
  }

  function parseSourceVillages(doc, sourceUrl) {
    const unitsTable = doc.querySelector('#units_table');
    if (unitsTable) {
      const unitsRows = Array.from(unitsTable.querySelectorAll('tr')).filter((row) => row.querySelector('.quickedit-vn'));
      const unitOrder = getUnitOrderFromTable(unitsTable);
      const villages = unitsRows.map((row) => parseUnitsVillageRow(row, unitOrder, sourceUrl)).filter(Boolean);
      if (villages.length) return dedupeSources(villages);
    }

    const combinedTable = doc.querySelector('#combined_table');
    if (combinedTable) {
      const unitOrder = getUnitOrderFromTable(combinedTable);
      const villages = Array.from(combinedTable.querySelectorAll('tr')).filter((row) => row.querySelector('.quickedit-vn')).map((row) => parseUnitsVillageRow(row, unitOrder, sourceUrl)).filter(Boolean);
      if (villages.length) return dedupeSources(villages);
    }

    return [];
  }

  function getUnitOrderFromTable(table) {
    const units = [];
    const seen = new Set();

    Array.from(table.querySelectorAll('th img, td img')).forEach((img) => {
      const source = img.getAttribute('src') || '';
      const match = source.match(/unit_([a-z_]+)\.(?:png|webp)/i);
      if (!match) return;
      const unit = match[1].toLowerCase();
      if (!seen.has(unit)) {
        seen.add(unit);
        units.push(unit);
      }
    });

    if (!units.length) {
      return [...state.metadata.worldUnits];
    }

    return units;
  }

  function parseUnitsVillageRow(row, unitOrder, sourceUrl) {
    const villageNode = row.querySelector('.quickedit-vn');
    if (!villageNode) return null;

    const villageId = toInt(villageNode.getAttribute('data-id'), 0);
    const labelNode = row.querySelector('.quickedit-label');
    const rawName = cleanText(labelNode?.getAttribute('data-text') || labelNode?.textContent || villageNode.textContent || '');
    const coordText = cleanText(labelNode?.textContent || rawName);
    const coordMatch = coordText.match(/(\d+)\|(\d+)/);

    if (!villageId || !coordMatch) return null;

    const unitCells = Array.from(row.querySelectorAll('td.unit-item'));
    const units = createEmptyUnits();

    unitCells.forEach((cell, index) => {
      const unit = unitOrder[index] || state.metadata.worldUnits[index] || null;
      if (!unit || !(unit in units)) return;
      units[unit] = toInt(cell.textContent, 0);
    });

    return {
      id: villageId,
      name: rawName || coordText,
      shortName: (rawName || coordText).replace(/\s*K\d+$/, ''),
      x: Number(coordMatch[1]),
      y: Number(coordMatch[2]),
      coord: `${coordMatch[1]}|${coordMatch[2]}`,
      units,
      sourceUrl,
    };
  }

  function dedupeSources(villages) {
    const map = new Map();
    villages.forEach((village) => {
      if (!map.has(village.id)) {
        map.set(village.id, village);
      }
    });
    return Array.from(map.values());
  }

  async function fetchAllTargets() {
    const pageCount = Math.max(1, state.currentPageCount || detectPageCountFromCurrentDoc(document));
    const normalized = normalizePageRange(pageCount);
    const tasks = [];

    for (let zeroBasedPage = normalized.start - 1; zeroBasedPage <= normalized.end - 1; zeroBasedPage += 1) {
      if (canReuseCurrentDocument(zeroBasedPage)) {
        tasks.push(Promise.resolve(document.documentElement.outerHTML));
      } else {
        tasks.push(fetchText(buildFarmPageUrl(zeroBasedPage)));
      }
    }

    const htmlPages = await Promise.all(tasks);
    const targets = [];

    htmlPages.forEach((html, pageIndex) => {
      const doc = parseHtml(html);
      const rows = Array.from(doc.querySelectorAll('#plunder_list tr[id^="village_"]'));
      rows.forEach((row, rowIndex) => {
        const target = parseTargetRow(row, normalized.start - 1 + pageIndex, rowIndex);
        if (target) targets.push(target);
      });
    });

    return dedupeTargets(targets);
  }

  function normalizePageRange(pageCount) {
    const start = Math.min(pageCount, Math.max(1, clampPositiveInt(state.settings.startPage, 1)));
    const endRaw = state.settings.endPage === 'max' ? pageCount : clampPositiveInt(state.settings.endPage, pageCount);
    const end = Math.min(pageCount, Math.max(start, endRaw));
    return { start, end };
  }

  function canReuseCurrentDocument(zeroBasedPage) {
    const url = new URL(window.location.href);
    const currentPage = toInt(url.searchParams.get('Farm_page'), 0);
    const currentOrder = url.searchParams.get('order') || 'distance';
    const currentDirection = url.searchParams.get('dir') || 'asc';
    return currentPage === zeroBasedPage && currentOrder === state.settings.orderBy && currentDirection === state.settings.direction;
  }

  function buildFarmPageUrl(zeroBasedPage) {
    const url = new URL(state.metadata.baseUrl, window.location.origin);
    url.searchParams.set('village', String(state.metadata.currentVillageId));
    url.searchParams.set('screen', 'am_farm');
    url.searchParams.set('Farm_page', String(zeroBasedPage));
    url.searchParams.set('order', state.settings.orderBy);
    url.searchParams.set('dir', state.settings.direction);
    return url.toString();
  }

  function detectPageCountFromCurrentDoc(doc) {
    const nav = doc.querySelector('#plunder_list_nav');
    if (!nav) return 1;

    const numericText = Array.from(nav.querySelectorAll('a, strong, option'))
      .map((node) => cleanText(node.textContent))
      .map((value) => value.replace(/[^\d]/g, ''))
      .filter(Boolean)
      .map((value) => Number(value));

    return numericText.length ? Math.max(...numericText) : 1;
  }

  function parseTargetRow(row, pageIndex, rowIndex) {
    const idMatch = row.id.match(/village_(\d+)/);
    if (!idMatch) return null;

    const cells = Array.from(row.querySelectorAll('td'));
    if (cells.length < 12) return null;

    const reportLink = cells[3]?.querySelector('a');
    const coordText = cleanText(reportLink?.textContent || '');
    const coordMatch = coordText.match(/(\d+)\|(\d+)/);
    if (!coordMatch) return null;

    const reportHref = reportLink?.getAttribute('href') || '';
    const reportIdMatch = reportHref.match(/view=(\d+)/);
    const resultSrc = cells[1]?.querySelector('img')?.getAttribute('src') || '';
    const haulTitle = cells[2]?.querySelector('img')?.getAttribute('title') || '';
    const wall = toInt(cells[8]?.textContent, 0);
    const currentDistance = toFloat(cells[9]?.textContent, 0);
    const timeText = cleanText(cells[4]?.textContent || '');
    const farmA = cells[10]?.querySelector('a.farm_icon_a');
    const farmB = cells[11]?.querySelector('a.farm_icon_b');

    return {
      id: Number(idMatch[1]),
      reportId: reportIdMatch ? Number(reportIdMatch[1]) : null,
      coord: `${coordMatch[1]}|${coordMatch[2]}`,
      x: Number(coordMatch[1]),
      y: Number(coordMatch[2]),
      wall,
      currentDistance,
      timeText,
      resultColor: normalizeResultColor(resultSrc),
      haulType: normalizeHaulType(haulTitle),
      farmDisabled: Boolean(row.querySelector('.farm_icon_disabled')),
      availableTemplates: {
        A: Boolean(farmA),
        B: Boolean(farmB),
      },
      listOrder: pageIndex * 1000 + rowIndex,
    };
  }

  function dedupeTargets(targets) {
    const map = new Map();
    targets.forEach((target) => {
      if (!map.has(target.id)) map.set(target.id, target);
    });
    return Array.from(map.values());
  }

  function normalizeResultColor(src) {
    const match = src.match(/dots\/([a-z_]+)\./i);
    return match ? match[1].toLowerCase() : 'unknown';
  }

  function normalizeHaulType(title) {
    const lower = String(title || '').toLowerCase();
    if (lower.includes('full haul')) return 'full';
    if (lower.includes('partial haul')) return 'partial';
    return 'unknown';
  }

  function buildQueues() {
    const templateKeys = Object.keys(state.metadata.templates);
    const filteredTargets = state.targets.filter((target) => passesFilters(target));

    state.queues = { A: [], B: [] };

    templateKeys.forEach((templateKey) => {
      const templateUnits = state.metadata.templates[templateKey];
      const sourcePool = state.sources.map((source) => ({ ...source, units: { ...source.units } }));
      const queue = [];

      filteredTargets.forEach((target) => {
        if (!target.availableTemplates[templateKey]) return;
        if (target.farmDisabled) return;

        const bestSource = chooseNearestEligibleSource(sourcePool, target, templateUnits);
        if (!bestSource) return;

        consumeUnits(bestSource.units, templateUnits);

        queue.push({
          id: `${templateKey}-${target.id}`,
          templateKey,
          templateId: state.metadata.templateIds[templateKey],
          sourceId: bestSource.id,
          sourceName: bestSource.shortName,
          sourceCoord: bestSource.coord,
          targetId: target.id,
          targetCoord: target.coord,
          targetX: target.x,
          targetY: target.y,
          wall: target.wall,
          resultColor: target.resultColor,
          haulType: target.haulType,
          listOrder: target.listOrder,
          distance: calcDistance(bestSource, target),
          sent: false,
          skipped: false,
        });
      });

      state.queues[templateKey] = sortQueue(queue);
    });
  }

  function sortQueue(queue) {
    if (state.settings.orderBy === 'distance') {
      return queue.slice().sort((a, b) => compareByDirection(a.distance, b.distance, state.settings.direction));
    }
    if (state.settings.orderBy === 'wall') {
      return queue.slice().sort((a, b) => compareByDirection(a.wall, b.wall, state.settings.direction));
    }
    return queue.slice().sort((a, b) => compareByDirection(a.listOrder, b.listOrder, state.settings.direction));
  }

  function compareByDirection(a, b, direction) {
    return direction === 'desc' ? b - a : a - b;
  }

  function passesFilters(target) {
    if (!isColorAllowed(target.resultColor)) return false;
    if (state.settings.enableHauls && !isHaulAllowed(target.haulType)) return false;
    if (state.settings.enableWalls && !compareNumeric(target.wall, state.settings.wallOperator, state.settings.wallValue)) return false;
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

  function isHaulAllowed(haulType) {
    if (state.settings.haulMode === 'both') return haulType === 'full' || haulType === 'partial';
    return haulType === state.settings.haulMode;
  }

  function chooseNearestEligibleSource(sources, target, neededUnits) {
    const eligible = sources
      .filter((source) => hasEnoughUnits(source.units, neededUnits))
      .map((source) => ({ source, distance: calcDistance(source, target) }))
      .filter((entry) => {
        if (!state.settings.enableDistances) return true;
        return compareNumeric(entry.distance, state.settings.distanceOperator, state.settings.distanceValue);
      })
      .sort((left, right) => left.distance - right.distance);

    return eligible.length ? eligible[0].source : null;
  }

  function compareNumeric(value, operator, threshold) {
    if (operator === 'greater_than') return value > threshold;
    if (operator === 'equal_to') return Math.abs(value - threshold) < 0.0001;
    return value < threshold;
  }

  function hasEnoughUnits(available, needed) {
    return Object.entries(needed).every(([unit, count]) => (available[unit] || 0) >= count);
  }

  function consumeUnits(available, needed) {
    Object.entries(needed).forEach(([unit, count]) => {
      available[unit] = Math.max(0, (available[unit] || 0) - count);
    });
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
      applyLocalUnitUpdate(item);
      log(`Sent ${templateKey}: ${item.sourceCoord} -> ${item.targetCoord}`);
      notifySuccess(`${templateKey}: ${item.sourceCoord} -> ${item.targetCoord}`);

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

    debug(`POST ${url} :: ${body.toString()}`);

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
    const key = String(event.key || '').toLowerCase();
    if (key === 'enter') return state.settings.enterTemplate;
    if (key === 'a') return 'A';
    if (key === 'b') return 'B';
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
    }, Math.max(100, state.settings.holdIntervalMs));
    render();
  }

  function stopHold() {
    if (state.holdTimer) {
      clearInterval(state.holdTimer);
    }
    state.holdTimer = null;
    state.holdKey = null;
    render();
  }

  function render() {
    if (!state.ui.root) return;

    const totalA = state.queues.A.filter((item) => !item.sent).length;
    const totalB = state.queues.B.filter((item) => !item.sent).length;
    const rows = [...state.queues.A, ...state.queues.B];

    state.ui.stats.innerHTML = [
      `<span class="summaryTag">Sources: ${state.sources.length}</span>`,
      `<span class="summaryTag">Targets: ${state.targets.length}</span>`,
      `<span class="summaryTag">Pages: ${normalizePageRange(Math.max(1, state.currentPageCount)).start}-${normalizePageRange(Math.max(1, state.currentPageCount)).end}</span>`,
      `<span class="summaryTag">Queue A: ${totalA}</span>`,
      `<span class="summaryTag">Queue B: ${totalB}</span>`,
      `<span class="summaryTag">Group: ${escapeHtml(String(state.settings.groupId))}</span>`,
    ].join('');

    state.ui.queueBody.innerHTML = rows.length
      ? rows.map((item) => `
          <tr class="${item.sent ? 'queueRowSent' : ''}">
            <td>${item.templateKey}</td>
            <td>${escapeHtml(item.sourceCoord)}</td>
            <td>${escapeHtml(item.targetCoord)}</td>
            <td>${item.wall}</td>
            <td>${item.distance.toFixed(2)}</td>
            <td>${escapeHtml(item.resultColor)}</td>
            <td>${escapeHtml(item.haulType)}</td>
            <td>${item.sent ? '<span class="statusBrown">sent</span>' : '<span class="statusGreen">queued</span>'}</td>
          </tr>
        `).join('')
      : '<tr><td colspan="8" class="muted">Queue is empty.</td></tr>';

    state.ui.hotkeyEnterValue.textContent = state.settings.enterTemplate;
    state.ui.hotkeyHoldValue.textContent = `${state.settings.holdIntervalMs} ms`;
    state.ui.hotkeyHoldKey.textContent = state.holdKey || 'none';
    state.ui.hotkeySending.innerHTML = state.sending ? '<span class="statusRed">yes</span>' : '<span class="statusGreen">no</span>';

    state.ui.logBox.textContent = state.logLines.length ? state.logLines.join('\n') : 'Ready.';
    state.ui.sendA.disabled = state.sending || totalA === 0;
    state.ui.sendB.disabled = state.sending || totalB === 0;
  }

  function log(message) {
    const time = new Date().toLocaleTimeString();
    state.logLines.unshift(`[${time}] ${message}`);
    state.logLines = state.logLines.slice(0, 60);
    render();
  }

  function debug(message) {
    if (!state.settings.debugMode) return;
    log(message);
  }

  function reportSendError(error) {
    console.error(`[${SCRIPT_ID}] send failed`, error);
    log(`Send failed: ${error.message || error}`);
    notifyError(`Send failed: ${error.message || error}`);
  }

  async function fetchText(url) {
    const response = await fetch(url, {
      credentials: 'same-origin',
      headers: { 'X-Requested-With': 'XMLHttpRequest' },
    });
    if (!response.ok) {
      throw new Error(`Request failed (${response.status}) for ${url}`);
    }
    return response.text();
  }

  function parseHtml(html) {
    return new DOMParser().parseFromString(html, 'text/html');
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
            reject(new Error('Timed out while waiting for required Loot Assistant elements.'));
          }
        } catch (error) {
          clearInterval(timer);
          reject(error);
        }
      }, 50);
    });
  }

  function createEmptyUnits() {
    return {
      spear: 0,
      sword: 0,
      axe: 0,
      archer: 0,
      spy: 0,
      light: 0,
      marcher: 0,
      heavy: 0,
      ram: 0,
      catapult: 0,
      knight: 0,
      snob: 0,
      militia: 0,
    };
  }

  function normalizeUnits(units) {
    const result = createEmptyUnits();
    Object.entries(units || {}).forEach(([unit, value]) => {
      if (unit in result) {
        result[unit] = Number(value || 0);
      }
    });
    return result;
  }

  function normalizeEndPage(value) {
    const text = cleanText(value).toLowerCase();
    if (!text || text === 'max') return 'max';
    return clampPositiveInt(text, 1);
  }

  function clampPositiveInt(value, fallback) {
    const parsed = toInt(value, fallback);
    return parsed > 0 ? parsed : fallback;
  }

  function toInt(value, fallback) {
    const parsed = parseInt(String(value ?? '').replace(/[^\d-]/g, ''), 10);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function toFloat(value, fallback) {
    const normalized = String(value ?? '').replace(',', '.').replace(/[^\d.-]/g, '');
    const parsed = parseFloat(normalized);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function oneOf(value, allowed, fallback) {
    return allowed.includes(value) ? value : fallback;
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
      window.UI.ErrorMessage(message, 4500);
    }
  }
})();
