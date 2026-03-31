// ==UserScript==
// @name         LA Enhancer Clean Rebuild v4
// @namespace    https://github.com/yasinenes92/tw-scripts
// @version      4.0.0
// @description  Clean standalone Loot Assistant enhancer with stable table structure, game-time recent filter, safer hotkeys, profile persistence, and redirect to LA.
// @author       OpenAI + Fikri Evlat
// @match        https://*.tribalwars.net/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  const SCRIPT_ID = 'la-enhancer-clean-v4';
  const UI_ID = 'lae4_settingsDiv';
  const STYLE_ID = 'lae4_style';

  const HIDE_CLASS = 'lae4-filtered-out';
  const TOP_CLASS = 'lae4-top-row';

  const PROFILE_PREFIX = 'LAE4_PROFILE_';
  const PROFILE_LIST_KEY = 'LAE4_PROFILE_LIST';
  const DEFAULT_PROFILE_KEY = 'LAE4_DEFAULT_PROFILE';
  const LAST_PROFILE_KEY = 'LAE4_LAST_PROFILE';
  const KEYS_KEY = 'LAE4_KEYS';
  const LAST_SENT_PREFIX = 'LAE4_LAST_SENT_';

  const HOLD_INTERVAL_MS = 160;
  const SEND_THROTTLE_MS = 120;

  const TEXT = {
    title: 'LA Enhancer',
    versionTag: 'clean rebuild v4',
    filterHelp: 'Checked report colors are hidden. Numeric rules also hide rows that match the rule.',
    profileHelp: 'Profiles store the current filter and behavior settings.',
    continentHelp: 'Use continent codes separated by dots. Example: 62.63.72',
    recentHelp: 'Recently sent uses only game time and only records sends performed by this v4 script.',
    startPage: 'Start page',
    endPage: 'End page',
    orderBy: 'Order by',
    direction: 'Direction',
    distance: 'Distance',
    date: 'Date',
    asc: 'Ascending',
    desc: 'Descending',
    filters: 'Filters',
    advanced: 'Advanced',
    allNone: 'All / None',
    blue: 'Blue',
    green: 'Green',
    yellow: 'Yellow',
    redYellow: 'Red / Yellow',
    redBlue: 'Red / Blue',
    red: 'Red',
    haulFilter: 'Haul filter',
    full: 'Full',
    partial: 'Partial',
    attacks: 'Attack count',
    walls: 'Walls',
    distances: 'Distances',
    timeFilter: 'Last attack time',
    minutes: 'minutes',
    scoutFilter: 'Scout report resources',
    continents: 'Continents',
    hide: 'Hide',
    show: 'Show',
    continentList: 'List',
    autoRun: 'Auto run across selected pages',
    nextVillageNoFarms: 'Next village if no visible rows',
    nextVillageScouts: 'Next village when scouts ≤',
    nextVillageTroops: 'Next village when selected farm units ≤',
    nextVillageUnits: 'Next village when selected farm units are depleted',
    recentFarms: 'Recently sent filter',
    hotkeys: 'Hotkeys',
    priority: 'Priority',
    profile: 'Profile',
    button: 'Button',
    defaultButton: 'Default button',
    skip: 'Skip',
    apply: 'Apply',
    reset: 'Reset',
    create: 'Create',
    update: 'Update',
    setDefault: 'Set default',
    delete: 'Delete',
    export: 'Export',
    import: 'Import',
    ready: 'ready',
    noRows: 'No visible farm rows found.',
    invalidProfile: 'Invalid profile name.',
    defaultProtected: 'Default profile cannot be deleted.',
    profileCreated: 'Profile created.',
    profileUpdated: 'Profile updated.',
    profileDeleted: 'Profile deleted.',
    profileImported: 'Profile imported.',
    profileDefault: 'Default profile changed.',
    keySaved: 'Hotkeys saved.',
    filtersApplied: 'Filters applied.',
    nothingToSend: 'Selected row does not have an active button for this key.',
    redirected: 'Not on Loot Assistant. Redirecting...',
    enterMaster: 'Enter = Master',
    recentFresh: 'Recently sent history starts fresh in v4.'
  };

  const DEFAULT_PROFILE = {
    start_page: 1,
    end_page: 1,
    order_by: 'distance',
    direction: 'asc',

    all_none: false,
    blue: false,
    green: false,
    yellow: false,
    red_yellow: false,
    red_blue: false,
    red: false,

    enable_hauls: false,
    full: false,
    partial: false,

    enable_attacks: false,
    attack_operator: 'greater_than',
    attack_value: '',

    enable_walls: false,
    wall_operator: 'greater_than',
    wall_value: '',

    enable_distances: false,
    distance_operator: 'greater_than',
    distance_value: '',

    enable_time: false,
    attack_time_filter: 'hide',
    time_value: '',

    enable_scout: false,
    scout_report_operator: 'greater_than',
    haul_value: '',

    enable_continents: false,
    continent_display: 'hide',
    continents_list: '',

    hide_recent_farms: false,
    sent_time_filter: 'hide',
    hide_recent_time: '',

    enable_auto_run: false,
    next_village_no_farms: false,
    next_village_scouts: false,
    scouts_left: '',
    next_village_farming_troops: false,
    farming_troops_left: '',
    next_village_units: false
  };

  const DEFAULT_KEYS = {
    a_code: 81,      // Q
    a_char: 'Q',
    b_code: 69,      // E
    b_char: 'E',
    c_code: 82,      // R
    c_char: 'R',
    master_code: 13, // Enter
    master_char: 'Enter',
    skip_code: 88,   // X
    skip_char: 'X',
    left_code: 74,   // J
    left_char: 'J',
    right_code: 76,  // L
    right_char: 'L',

    priorityOneEnabled: true,
    priorityOneProfile: 'Default',
    priorityOneButton: 'Skip',

    priorityTwoEnabled: true,
    priorityTwoProfile: 'Default',
    priorityTwoButton: 'Skip',

    priorityThreeEnabled: true,
    priorityThreeProfile: 'Default',
    priorityThreeButton: 'Skip',

    defaultButton: 'Skip'
  };

  const state = {
    initialized: false,
    profileName: 'Default',
    profile: null,
    keys: null,
    editMode: null,
    holdType: null,
    holdTimer: null,
    lastActionAt: 0
  };

  try {
    if (window.LAEnhancerCleanV4 && typeof window.LAEnhancerCleanV4.destroy === 'function') {
      window.LAEnhancerCleanV4.destroy();
    }
  } catch (_) {}

  cleanupLegacyArtifacts();

  if (!isLootAssistantPage()) {
    redirectToLootAssistant();
    return;
  }

  boot();

  function boot() {
    try {
      ensureStorage();

      const profiles = getProfileList();
      const lastProfile = localStorage.getItem(LAST_PROFILE_KEY);
      const defaultProfile = localStorage.getItem(DEFAULT_PROFILE_KEY) || 'Default';

      state.profileName = profiles.includes(lastProfile) ? lastProfile : defaultProfile;
      if (!profiles.includes(state.profileName)) state.profileName = 'Default';

      state.profile = loadProfile(state.profileName);
      state.keys = loadKeys();

      injectStyle();
      buildUi();
      exposeGlobals();
      populateProfileSelects();
      applyProfileToUi(state.profile);
      applyKeySettingsToUi();
      formatRows();
      bindUi();
      bindHotkeys();

      state.initialized = true;
      setStatus(`${TEXT.title} ${TEXT.ready} | ${TEXT.enterMaster}`);
      info(TEXT.recentFresh);
    } catch (err) {
      console.error(`[${SCRIPT_ID}] boot failed`, err);
      error(err.message || String(err));
    }
  }

  function destroy() {
    document.removeEventListener('keydown', onHotkeyDown, true);
    document.removeEventListener('keyup', onHotkeyUp, true);
    clearHold();

    const ui = document.getElementById(UI_ID);
    if (ui) ui.remove();

    const style = document.getElementById(STYLE_ID);
    if (style) style.remove();

    delete window.applySettings;
    delete window.resetTable;
    delete window.changeProfile;
    delete window.createProfile;
    delete window.updateProfile;
    delete window.setDefaultProfile;
    delete window.deleteProfile;
    delete window.exportProfile;
    delete window.importProfile;
    delete window.updateKeypressSettings;
    delete window.setKeyEditMode;
    delete window.uglyHider;
    delete window.LAEnhancerCleanV4;
  }

  function cleanupLegacyArtifacts() {
    const oldScriptObjects = [
      'LAEnhancerRebuild',
      'LAEnhancerCleanV2',
      'LAEnhancerCleanV3'
    ];

    oldScriptObjects.forEach(name => {
      try {
        if (window[name] && typeof window[name].destroy === 'function') {
          window[name].destroy();
        }
      } catch (_) {}
    });

    [
      'settingsDiv',
      'lae2_settingsDiv',
      'lae3_settingsDiv',
      'lae4_settingsDiv'
    ].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.remove();
    });

    [
      'la-enhancer-rebuild-style',
      'lae2_style',
      'lae3_style',
      'lae4_style'
    ].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.remove();
    });

    cleanupRowArtifacts();
  }

  function cleanupRowArtifacts() {
    const rows = getVillageRows();
    rows.forEach(row => {
      row.classList.remove(
        'lae-filtered-out',
        'lae2-filtered-out',
        'lae3-filtered-out',
        'lae4-filtered-out',
        'lae-top-row',
        'lae2-top-row',
        'lae3-top-row',
        'lae4-top-row'
      );

      const numCells = row.querySelectorAll(
        'td.lae-row-num, td.lae2-row-num, td.lae3-row-num, td.lae4-row-num'
      );
      numCells.forEach(cell => cell.remove());

      if (row.style.display === 'none') {
        row.style.display = '';
      }
    });
  }

  function exposeGlobals() {
    window.applySettings = applySettings;
    window.resetTable = resetTable;
    window.changeProfile = changeProfile;
    window.createProfile = createProfile;
    window.updateProfile = updateProfile;
    window.setDefaultProfile = setDefaultProfile;
    window.deleteProfile = deleteProfile;
    window.exportProfile = exportProfile;
    window.importProfile = importProfile;
    window.updateKeypressSettings = updateKeypressSettings;
    window.setKeyEditMode = setKeyEditMode;
    window.uglyHider = uglyHider;
    window.LAEnhancerCleanV4 = { destroy };
  }

  function isLootAssistantPage() {
    try {
      if (window.game_data?.screen === 'am_farm') return true;
      const url = new URL(window.location.href);
      return url.searchParams.get('screen') === 'am_farm';
    } catch {
      return false;
    }
  }

  function redirectToLootAssistant() {
    try {
      const url = new URL(window.location.href);
      const village =
        url.searchParams.get('village') ||
        window.game_data?.village?.id ||
        '';
      url.pathname = '/game.php';
      if (village) url.searchParams.set('village', String(village));
      url.searchParams.set('screen', 'am_farm');
      console.log(`[${SCRIPT_ID}] ${TEXT.redirected}`, url.toString());
      window.location.href = url.toString();
    } catch (err) {
      console.error(`[${SCRIPT_ID}] redirect failed`, err);
    }
  }

  function ensureStorage() {
    if (!localStorage.getItem(PROFILE_LIST_KEY)) {
      localStorage.setItem(PROFILE_LIST_KEY, JSON.stringify(['Default']));
    }
    if (!localStorage.getItem(DEFAULT_PROFILE_KEY)) {
      localStorage.setItem(DEFAULT_PROFILE_KEY, 'Default');
    }
    if (!localStorage.getItem(LAST_PROFILE_KEY)) {
      localStorage.setItem(LAST_PROFILE_KEY, 'Default');
    }
    if (!localStorage.getItem(PROFILE_PREFIX + 'Default')) {
      localStorage.setItem(PROFILE_PREFIX + 'Default', JSON.stringify(DEFAULT_PROFILE));
    }
    if (!localStorage.getItem(KEYS_KEY)) {
      localStorage.setItem(KEYS_KEY, JSON.stringify(DEFAULT_KEYS));
    }
  }

  function loadProfile(name) {
    try {
      const raw = JSON.parse(localStorage.getItem(PROFILE_PREFIX + name) || '{}');
      return { ...DEFAULT_PROFILE, ...raw };
    } catch {
      return { ...DEFAULT_PROFILE };
    }
  }

  function saveProfile(name, profile) {
    localStorage.setItem(PROFILE_PREFIX + name, JSON.stringify({ ...DEFAULT_PROFILE, ...profile }));
  }

  function getProfileList() {
    try {
      const list = JSON.parse(localStorage.getItem(PROFILE_LIST_KEY) || '[]');
      return Array.isArray(list) && list.length ? list : ['Default'];
    } catch {
      return ['Default'];
    }
  }

  function saveProfileList(list) {
    localStorage.setItem(PROFILE_LIST_KEY, JSON.stringify(list));
  }

  function loadKeys() {
    try {
      return { ...DEFAULT_KEYS, ...JSON.parse(localStorage.getItem(KEYS_KEY) || '{}') };
    } catch {
      return { ...DEFAULT_KEYS };
    }
  }

  function saveKeys() {
    localStorage.setItem(KEYS_KEY, JSON.stringify(state.keys));
  }

  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #${UI_ID} .lae4-small { width: 42px; }
      #${UI_ID} .lae4-medium { width: 64px; }
      #${UI_ID} .lae4-hotkey { width: 52px; text-align:center; }
      #${UI_ID} .lae4-collapse {
        float:right; text-align:center; line-height:100%; width:12px; height:12px;
        margin:0; position:relative; background-color:tan; opacity:.7;
      }
      #${UI_ID} .lae4-collapse a { text-decoration:none; font-weight:bold; }
      #${UI_ID} .lae4-note {
        display:block; margin-top:4px; font-size:11px; color:#5b3f11;
      }
      #${UI_ID} .lae4-status {
        margin-left:8px; font-size:11px; color:#603000;
      }
      #${UI_ID} .lae4-help {
        display:block; font-size:11px; color:#5b3f11; margin-top:3px;
      }
      #${UI_ID} .lae4-title-suffix { font-weight:normal; }
      #${UI_ID} .lae4-right { float:right; }
      #${UI_ID} .lae4-left { float:left; }
      #${UI_ID} .lae4-clearfix::after { content:''; display:block; clear:both; }
      #${UI_ID} .lae4-hotkey-table td { padding:2px 4px; }
      #${UI_ID} .lae4-warning {
        margin-top:6px; padding:6px 8px; font-size:11px;
        color:#603000; background:#fff5da; border:1px solid #d2b48c;
      }
      #plunder_list tr.${HIDE_CLASS} { display:none !important; }
      #plunder_list tr.${TOP_CLASS} td { background-color:#d8ffd8 !important; }
    `;
    document.head.appendChild(style);
  }

  function buildUi() {
    const h3 = document.querySelector('#contentContainer h3');
    if (!h3) throw new Error('Loot Assistant header not found.');

    const box = document.createElement('div');
    box.className = 'vis';
    box.id = UI_ID;
    box.innerHTML = `
      <table class="settingsTable">
        <thead>
          <tr>
            <th colspan="5" class="vis" style="padding:0;">
              <h4>
                ${TEXT.title}
                <span class="lae4-title-suffix">(${TEXT.versionTag})</span>
                <span class="lae4-right">
                  <div class="lae4-collapse"><a href="#" data-target="lae4_body" data-open="-" data-closed="+">-</a></div>
                </span>
              </h4>
            </th>
          </tr>
        </thead>
        <tbody id="lae4_body">
          <tr>
            <td style="min-width:210px;">
              <span>${TEXT.startPage}</span>
              &nbsp;<input type="text" id="start_page" class="lae4-small" maxlength="3">
              &nbsp;<span>${TEXT.endPage}</span>
              &nbsp;<input type="text" id="end_page" class="lae4-small" maxlength="5">
            </td>
            <td colspan="3">
              <span style="font-weight:bold">${TEXT.filters}</span>
              <img src="graphic/questionmark.png" width="13" height="13" id="lae4_filter_help">
              <span class="lae4-help">${TEXT.filterHelp}</span>
            </td>
            <td rowspan="5" valign="top">
              <form>
                <input type="checkbox" id="all_none">
                <label for="all_none" style="font-weight:bold">${TEXT.allNone}</label>
                <br>
                <input type="checkbox" id="blue"><label for="blue"><img src="graphic/dots/blue.webp"> ${TEXT.blue}</label><br>
                <input type="checkbox" id="green"><label for="green"><img src="graphic/dots/green.webp"> ${TEXT.green}</label><br>
                <input type="checkbox" id="yellow"><label for="yellow"><img src="graphic/dots/yellow.webp"> ${TEXT.yellow}</label><br>
                <input type="checkbox" id="red_yellow"><label for="red_yellow"><img src="graphic/dots/red_yellow.webp"> ${TEXT.redYellow}</label><br>
                <input type="checkbox" id="red_blue"><label for="red_blue"><img src="graphic/dots/red_blue.webp"> ${TEXT.redBlue}</label><br>
                <input type="checkbox" id="red"><label for="red"><img src="graphic/dots/red.webp"> ${TEXT.red}</label>
              </form>
            </td>
          </tr>

          <tr>
            <td rowspan="2">
              <label for="order_by">${TEXT.orderBy}</label>
              &nbsp;
              <select id="order_by">
                <option value="distance">${TEXT.distance}</option>
                <option value="date">${TEXT.date}</option>
              </select>
              <br>
              <label for="direction">${TEXT.direction}</label>
              &nbsp;
              <select id="direction">
                <option value="asc">${TEXT.asc}</option>
                <option value="desc">${TEXT.desc}</option>
              </select>
            </td>

            <td style="width:26px;"><input type="checkbox" id="enable_hauls"></td>
            <td style="width:120px;"><label for="enable_hauls">${TEXT.haulFilter}</label></td>
            <td>
              <input type="radio" name="lae4_hauls" id="full"><label for="full"><img src="graphic/max_loot/1.png"> ${TEXT.full}</label>
              &nbsp;
              <input type="radio" name="lae4_hauls" id="partial"><label for="partial"><img src="graphic/max_loot/0.png"> ${TEXT.partial}</label>
            </td>
          </tr>

          <tr>
            <td><input type="checkbox" id="enable_attacks"></td>
            <td><label for="enable_attacks">${TEXT.attacks}</label></td>
            <td>
              <select id="attack_operator">
                <option value="greater_than">&gt;</option>
                <option value="less_than">&lt;</option>
                <option value="equal_to">=</option>
              </select>
              &nbsp;<input type="text" id="attack_value" class="lae4-small" maxlength="3">
            </td>
          </tr>

          <tr>
            <td><span style="font-weight:bold">${TEXT.advanced}</span></td>
            <td><input type="checkbox" id="enable_walls"></td>
            <td><label for="enable_walls">${TEXT.walls}</label></td>
            <td>
              <select id="wall_operator">
                <option value="greater_than">&gt;</option>
                <option value="less_than">&lt;</option>
                <option value="equal_to">=</option>
              </select>
              &nbsp;<input type="text" id="wall_value" class="lae4-small" maxlength="3">
            </td>
          </tr>

          <tr>
            <td><input type="checkbox" id="next_village_no_farms"><label for="next_village_no_farms">${TEXT.nextVillageNoFarms}</label></td>
            <td><input type="checkbox" id="enable_distances"></td>
            <td><label for="enable_distances">${TEXT.distances}</label></td>
            <td>
              <select id="distance_operator">
                <option value="greater_than">&gt;</option>
                <option value="less_than">&lt;</option>
                <option value="equal_to">=</option>
              </select>
              &nbsp;<input type="text" id="distance_value" class="lae4-medium" maxlength="6">
            </td>
          </tr>

          <tr>
            <td><input type="checkbox" id="next_village_units"><label for="next_village_units">${TEXT.nextVillageUnits}</label></td>
            <td><input type="checkbox" id="enable_continents"></td>
            <td colspan="3">
              <select id="continent_display">
                <option value="hide">${TEXT.hide}</option>
                <option value="show">${TEXT.show}</option>
              </select>
              &nbsp;<label for="continents_list">${TEXT.continentList}</label>
              &nbsp;<input type="text" id="continents_list" size="20" maxlength="150">
              &nbsp;<img src="graphic/questionmark.png" width="13" height="13" id="lae4_continent_help">
            </td>
          </tr>

          <tr>
            <td><input type="checkbox" id="next_village_scouts"><input type="text" id="scouts_left" class="lae4-small"> ${TEXT.nextVillageScouts}</td>
            <td><input type="checkbox" id="enable_scout"></td>
            <td colspan="3">
              <label for="enable_scout">${TEXT.scoutFilter}</label>
              &nbsp;<select id="scout_report_operator">
                <option value="greater_than">&gt;</option>
                <option value="less_than">&lt;</option>
                <option value="equal_to">=</option>
              </select>
              &nbsp;<input type="text" id="haul_value" size="9" maxlength="7">
            </td>
          </tr>

          <tr>
            <td><input type="checkbox" id="next_village_farming_troops"><input type="text" id="farming_troops_left" class="lae4-small"> ${TEXT.nextVillageTroops}</td>
            <td><input type="checkbox" id="enable_time"></td>
            <td colspan="3">
              <select id="attack_time_filter">
                <option value="hide">${TEXT.hide}</option>
                <option value="show">${TEXT.show}</option>
              </select>
              &nbsp;<label for="enable_time">${TEXT.timeFilter}</label>
              &nbsp;<input type="text" id="time_value" class="lae4-small" maxlength="4">
              &nbsp;${TEXT.minutes}
            </td>
          </tr>

          <tr>
            <td><input type="checkbox" id="enable_auto_run"><label for="enable_auto_run">${TEXT.autoRun}</label></td>
            <td><input type="checkbox" id="hide_recent_farms"></td>
            <td colspan="3">
              <select id="sent_time_filter">
                <option value="hide">${TEXT.hide}</option>
                <option value="show">${TEXT.show}</option>
              </select>
              &nbsp;${TEXT.recentFarms}
              &nbsp;<input type="text" id="hide_recent_time" class="lae4-small">
              &nbsp;${TEXT.minutes}
              &nbsp;<img src="graphic/questionmark.png" width="13" height="13" id="lae4_recent_help">
            </td>
          </tr>

          <tr><th>${TEXT.hotkeys}</th><th colspan="4">${TEXT.priority}</th></tr>

          <tr>
            <td rowspan="4">
              <table class="lae4-hotkey-table">
                <tr>
                  <td><a href="#" data-key-mode="A" class="farm_icon farm_icon_a"></a></td>
                  <td><a href="#" data-key-mode="B" class="farm_icon farm_icon_b"></a></td>
                  <td><a href="#" data-key-mode="C" class="farm_icon farm_icon_c"></a></td>
                  <td><a href="#" data-key-mode="Master" class="farm_icon farm_icon_m"></a></td>
                </tr>
                <tr>
                  <td><input type="text" id="hotkey_value_a" class="lae4-hotkey" readonly></td>
                  <td><input type="text" id="hotkey_value_b" class="lae4-hotkey" readonly></td>
                  <td><input type="text" id="hotkey_value_c" class="lae4-hotkey" readonly></td>
                  <td><input type="text" id="hotkey_value_master" class="lae4-hotkey" readonly></td>
                </tr>
                <tr>
                  <td colspan="2"><input class="btn" data-key-mode="Skip" type="button" value="${TEXT.skip}" style="margin:0"></td>
                  <td><input class="btn" data-key-mode="Left" type="button" value="J" style="margin:0"></td>
                  <td><input class="btn" data-key-mode="Right" type="button" value="L" style="margin:0"></td>
                </tr>
                <tr>
                  <td colspan="2"><input type="text" id="hotkey_value_skip" class="lae4-hotkey" readonly></td>
                  <td><input type="text" id="hotkey_value_left" class="lae4-hotkey" readonly></td>
                  <td><input type="text" id="hotkey_value_right" class="lae4-hotkey" readonly></td>
                </tr>
              </table>
              <span class="lae4-note">Default keys: Q / E / R / Enter / X / J / L</span>
            </td>

            <td><input type="checkbox" id="priorityOneEnabled"></td>
            <td colspan="3">${TEXT.profile} <select id="priorityOneProfile"></select> ${TEXT.button} <select id="priorityOneButton">${buttonOptions()}</select></td>
          </tr>

          <tr>
            <td><input type="checkbox" id="priorityTwoEnabled"></td>
            <td colspan="3">${TEXT.profile} <select id="priorityTwoProfile"></select> ${TEXT.button} <select id="priorityTwoButton">${buttonOptions()}</select></td>
          </tr>

          <tr>
            <td><input type="checkbox" id="priorityThreeEnabled"></td>
            <td colspan="3">${TEXT.profile} <select id="priorityThreeProfile"></select> ${TEXT.button} <select id="priorityThreeButton">${buttonOptions()}</select></td>
          </tr>

          <tr>
            <td colspan="4">${TEXT.defaultButton} <select id="defaultButton">${buttonOptions()}</select></td>
          </tr>

          <tr>
            <td colspan="5" class="lae4-clearfix">
              <div class="lae4-left">
                <input type="button" class="btn" value="${TEXT.apply}" id="applySettingsBtn">
                <input type="button" class="btn" value="${TEXT.reset}" id="resetTableBtn">
                <span class="lae4-status" id="lae4_status"></span>
              </div>
              <div class="lae4-right">
                <img src="graphic/questionmark.png" width="13" height="13" id="lae4_profile_help">
                &nbsp;<label for="settingsProfile">${TEXT.profile}:</label>
                &nbsp;<select id="settingsProfile"></select>
                &nbsp;<input type="button" class="btn" value="${TEXT.create}" id="createProfileBtn">
                &nbsp;<input type="button" class="btn" value="${TEXT.setDefault}" id="setDefaultProfileBtn">
                &nbsp;<input type="button" class="btn" value="${TEXT.delete}" id="deleteProfileBtn">
                &nbsp;<input type="button" class="btn" value="${TEXT.update}" id="updateProfileBtn">
                &nbsp;<input type="button" class="btn" value="${TEXT.export}" id="exportProfileBtn">
                &nbsp;<input type="button" class="btn" value="${TEXT.import}" id="importProfileBtn">
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <div class="lae4-warning">
        Numeric filters hide rows that match the rule. Example: Walls &gt; 1 hides rows with wall above 1.
      </div>
    `;

    h3.insertAdjacentElement('afterend', box);

    const nativeVis = document.querySelector('#contentContainer .vis');
    if (nativeVis) {
      const firstHeader = nativeVis.querySelector('h4');
      const tableBody = nativeVis.children[1];
      if (firstHeader && tableBody && !tableBody.id) {
        tableBody.id = 'lae4_native_body';
        tableBody.style.display = 'none';
        const toggle = document.createElement('div');
        toggle.className = 'lae4-collapse';
        toggle.innerHTML = `<a href="#" data-target="lae4_native_body" data-open="+" data-closed="-">+</a>`;
        firstHeader.appendChild(toggle);
      }
    }
  }

  function buttonOptions() {
    return [
      '<option value="A">A</option>',
      '<option value="B">B</option>',
      '<option value="C">C</option>',
      `<option value="Skip">${TEXT.skip}</option>`
    ].join('');
  }

  function populateProfileSelects() {
    const profiles = getProfileList();

    ['settingsProfile', 'priorityOneProfile', 'priorityTwoProfile', 'priorityThreeProfile'].forEach(id => {
      const select = byId(id);
      select.innerHTML = '';
      profiles.forEach(name => {
        const opt = document.createElement('option');
        opt.value = name;
        opt.textContent = name;
        select.appendChild(opt);
      });
    });

    byId('settingsProfile').value = state.profileName;
    byId('priorityOneProfile').value = state.keys.priorityOneProfile;
    byId('priorityTwoProfile').value = state.keys.priorityTwoProfile;
    byId('priorityThreeProfile').value = state.keys.priorityThreeProfile;
  }

  function applyProfileToUi(profile) {
    Object.keys(DEFAULT_PROFILE).forEach(key => {
      const el = byId(key);
      if (!el) return;
      if (el.type === 'checkbox' || el.type === 'radio') {
        el.checked = !!profile[key];
      } else {
        el.value = profile[key] ?? '';
      }
    });

    byId('settingsProfile').value = state.profileName;
  }

  function readProfileFromUi() {
    const profile = { ...DEFAULT_PROFILE };

    Object.keys(DEFAULT_PROFILE).forEach(key => {
      const el = byId(key);
      if (!el) return;
      if (el.type === 'checkbox' || el.type === 'radio') {
        profile[key] = !!el.checked;
      } else {
        profile[key] = el.value;
      }
    });

    profile.start_page = sanitizePositive(profile.start_page, 1);
    profile.end_page = String(profile.end_page || '').toLowerCase() === 'max'
      ? 'max'
      : sanitizePositive(profile.end_page, 1);

    return profile;
  }

  function applyKeySettingsToUi() {
    byId('hotkey_value_a').value = state.keys.a_char;
    byId('hotkey_value_b').value = state.keys.b_char;
    byId('hotkey_value_c').value = state.keys.c_char;
    byId('hotkey_value_master').value = state.keys.master_char;
    byId('hotkey_value_skip').value = state.keys.skip_char;
    byId('hotkey_value_left').value = state.keys.left_char;
    byId('hotkey_value_right').value = state.keys.right_char;

    byId('priorityOneEnabled').checked = !!state.keys.priorityOneEnabled;
    byId('priorityOneProfile').value = state.keys.priorityOneProfile;
    byId('priorityOneButton').value = state.keys.priorityOneButton;

    byId('priorityTwoEnabled').checked = !!state.keys.priorityTwoEnabled;
    byId('priorityTwoProfile').value = state.keys.priorityTwoProfile;
    byId('priorityTwoButton').value = state.keys.priorityTwoButton;

    byId('priorityThreeEnabled').checked = !!state.keys.priorityThreeEnabled;
    byId('priorityThreeProfile').value = state.keys.priorityThreeProfile;
    byId('priorityThreeButton').value = state.keys.priorityThreeButton;

    byId('defaultButton').value = state.keys.defaultButton;
  }

  function bindUi() {
    byId('all_none').addEventListener('change', onAllNoneChange);

    document.querySelectorAll(`#${UI_ID} [data-key-mode]`).forEach(el => {
      el.addEventListener('click', (ev) => {
        ev.preventDefault();
        setKeyEditMode(el.getAttribute('data-key-mode'));
      });
    });

    document.querySelectorAll(`#${UI_ID} .lae4-collapse a`).forEach(a => {
      a.addEventListener('click', (ev) => {
        ev.preventDefault();
        uglyHider(a);
      });
    });

    byId('applySettingsBtn').addEventListener('click', (ev) => {
      ev.preventDefault();
      void applySettings();
    });

    byId('resetTableBtn').addEventListener('click', (ev) => {
      ev.preventDefault();
      resetTable();
    });

    byId('settingsProfile').addEventListener('change', () => changeProfile(byId('settingsProfile').value));

    byId('createProfileBtn').addEventListener('click', (ev) => { ev.preventDefault(); createProfile(); });
    byId('updateProfileBtn').addEventListener('click', (ev) => { ev.preventDefault(); updateProfile(); });
    byId('setDefaultProfileBtn').addEventListener('click', (ev) => { ev.preventDefault(); setDefaultProfile(); });
    byId('deleteProfileBtn').addEventListener('click', (ev) => { ev.preventDefault(); deleteProfile(); });
    byId('exportProfileBtn').addEventListener('click', (ev) => { ev.preventDefault(); exportProfile(); });
    byId('importProfileBtn').addEventListener('click', (ev) => { ev.preventDefault(); importProfile(); });

    [
      'priorityOneEnabled', 'priorityOneProfile', 'priorityOneButton',
      'priorityTwoEnabled', 'priorityTwoProfile', 'priorityTwoButton',
      'priorityThreeEnabled', 'priorityThreeProfile', 'priorityThreeButton',
      'defaultButton'
    ].forEach(id => {
      byId(id).addEventListener('change', updateKeypressSettings);
    });

    addTooltip('lae4_filter_help', TEXT.filterHelp);
    addTooltip('lae4_profile_help', TEXT.profileHelp);
    addTooltip('lae4_continent_help', TEXT.continentHelp);
    addTooltip('lae4_recent_help', TEXT.recentHelp);
  }

  function addTooltip(id, text) {
    const el = byId(id);
    if (!el) return;
    el.title = text;
    if (window.UI && typeof UI.ToolTip === 'function') UI.ToolTip(el);
  }

  function onAllNoneChange() {
    const checked = byId('all_none').checked;
    ['blue', 'green', 'yellow', 'red_yellow', 'red_blue', 'red'].forEach(id => {
      byId(id).checked = checked;
    });
  }

  async function applySettings() {
    state.profile = readProfileFromUi();
    saveProfile(state.profileName, state.profile);
    localStorage.setItem(LAST_PROFILE_KEY, state.profileName);

    cleanupRowArtifacts();

    if (state.profile.enable_auto_run) {
      await mergeSelectedPages(state.profile);
    }

    formatRows();
    const summary = filterRows(state.profile);
    highlightTopRow();
    maybeGoNextVillage();

    setStatus(
      `Visible ${summary.visible}/${summary.total} | hidden ${summary.hidden} | walls ${summary.reasons.walls || 0} | dist ${summary.reasons.distances || 0} | recent ${summary.reasons.recent || 0}`
    );
    info(TEXT.filtersApplied);
  }

  function resetTable() {
    window.location.reload();
  }

  function changeProfile(name) {
    state.profileName = name;
    state.profile = loadProfile(name);
    applyProfileToUi(state.profile);
    localStorage.setItem(LAST_PROFILE_KEY, name);
    setStatus(`${TEXT.profile}: ${name}`);
  }

  function createProfile() {
    const name = prompt('New profile name:');
    if (!name || !name.trim()) {
      error(TEXT.invalidProfile);
      return;
    }

    const cleanName = name.trim();
    const list = getProfileList();
    if (list.includes(cleanName)) {
      error('Profile already exists.');
      return;
    }

    saveProfile(cleanName, readProfileFromUi());
    list.push(cleanName);
    saveProfileList(list);
    state.profileName = cleanName;
    localStorage.setItem(LAST_PROFILE_KEY, cleanName);
    populateProfileSelects();
    byId('settingsProfile').value = cleanName;
    setStatus(TEXT.profileCreated);
  }

  function updateProfile() {
    saveProfile(state.profileName, readProfileFromUi());
    localStorage.setItem(LAST_PROFILE_KEY, state.profileName);
    setStatus(TEXT.profileUpdated);
  }

  function setDefaultProfile() {
    localStorage.setItem(DEFAULT_PROFILE_KEY, state.profileName);
    setStatus(TEXT.profileDefault);
  }

  function deleteProfile() {
    if (state.profileName === 'Default') {
      error(TEXT.defaultProtected);
      return;
    }

    if (!confirm(`Delete profile "${state.profileName}"?`)) return;

    localStorage.removeItem(PROFILE_PREFIX + state.profileName);
    const nextList = getProfileList().filter(name => name !== state.profileName);
    saveProfileList(nextList.length ? nextList : ['Default']);

    const defaultProfile = localStorage.getItem(DEFAULT_PROFILE_KEY) || 'Default';
    state.profileName = getProfileList().includes(defaultProfile) ? defaultProfile : 'Default';
    localStorage.setItem(LAST_PROFILE_KEY, state.profileName);

    populateProfileSelects();
    changeProfile(state.profileName);
    setStatus(TEXT.profileDeleted);
  }

  function exportProfile() {
    const payload = JSON.stringify({
      name: state.profileName,
      profile: readProfileFromUi()
    }, null, 2);
    prompt('Copy profile JSON:', payload);
  }

  function importProfile() {
    const raw = prompt('Paste profile JSON:');
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw);
      const name = prompt('Profile name:', parsed.name || 'Imported');
      if (!name || !name.trim()) {
        error(TEXT.invalidProfile);
        return;
      }

      const cleanName = name.trim();
      saveProfile(cleanName, { ...DEFAULT_PROFILE, ...(parsed.profile || parsed) });

      const list = getProfileList();
      if (!list.includes(cleanName)) {
        list.push(cleanName);
        saveProfileList(list);
      }

      populateProfileSelects();
      changeProfile(cleanName);
      setStatus(TEXT.profileImported);
    } catch (err) {
      error(`Import failed: ${err.message || err}`);
    }
  }

  function updateKeypressSettings() {
    state.keys = {
      ...state.keys,
      priorityOneEnabled: byId('priorityOneEnabled').checked,
      priorityOneProfile: byId('priorityOneProfile').value,
      priorityOneButton: byId('priorityOneButton').value,
      priorityTwoEnabled: byId('priorityTwoEnabled').checked,
      priorityTwoProfile: byId('priorityTwoProfile').value,
      priorityTwoButton: byId('priorityTwoButton').value,
      priorityThreeEnabled: byId('priorityThreeEnabled').checked,
      priorityThreeProfile: byId('priorityThreeProfile').value,
      priorityThreeButton: byId('priorityThreeButton').value,
      defaultButton: byId('defaultButton').value
    };

    saveKeys();
    applyKeySettingsToUi();
    setStatus(TEXT.keySaved);
  }

  function setKeyEditMode(mode) {
    state.editMode = mode;
    setStatus(`Press a key for ${mode}...`);
  }

  function bindHotkeys() {
    document.removeEventListener('keydown', onHotkeyDown, true);
    document.removeEventListener('keyup', onHotkeyUp, true);
    document.addEventListener('keydown', onHotkeyDown, true);
    document.addEventListener('keyup', onHotkeyUp, true);
  }

  function onHotkeyDown(event) {
    if (state.editMode) {
      event.preventDefault();
      event.stopPropagation();
      captureEditedKey(event);
      return;
    }

    if (shouldIgnoreHotkeys(event)) return;

    const code = event.which || event.keyCode;

    if (code === state.keys.left_code) {
      event.preventDefault();
      navigateVillage('p');
      return;
    }

    if (code === state.keys.right_code) {
      event.preventDefault();
      navigateVillage('n');
      return;
    }

    if (code === state.keys.skip_code) {
      event.preventDefault();
      skipTopRow();
      startHold('SKIP');
      return;
    }

    if (code === state.keys.a_code) {
      event.preventDefault();
      sendTopRow('A');
      startHold('A');
      return;
    }

    if (code === state.keys.b_code) {
      event.preventDefault();
      sendTopRow('B');
      startHold('B');
      return;
    }

    if (code === state.keys.c_code) {
      event.preventDefault();
      sendTopRow('C');
      startHold('C');
      return;
    }

    if (code === state.keys.master_code) {
      event.preventDefault();
      masterSendTopRow();
      startHold('MASTER');
    }
  }

  function onHotkeyUp() {
    clearHold();
  }

  function captureEditedKey(event) {
    const info = normalizeCapturedKey(event);
    if (!info) {
      error('Only letters, digits, arrows, or Enter are allowed.');
      state.editMode = null;
      return;
    }

    const map = {
      A: ['a_code', 'a_char'],
      B: ['b_code', 'b_char'],
      C: ['c_code', 'c_char'],
      Master: ['master_code', 'master_char'],
      Skip: ['skip_code', 'skip_char'],
      Left: ['left_code', 'left_char'],
      Right: ['right_code', 'right_char']
    }[state.editMode];

    if (map) {
      state.keys[map[0]] = info.code;
      state.keys[map[1]] = info.char;
      saveKeys();
      applyKeySettingsToUi();
      setStatus(TEXT.keySaved);
    }

    state.editMode = null;
  }

  function normalizeCapturedKey(event) {
    if (/^[A-Za-z0-9]$/.test(event.key)) {
      return { code: event.which || event.keyCode, char: event.key.toUpperCase() };
    }
    if (event.key === 'Enter') return { code: 13, char: 'Enter' };
    if (event.key === 'ArrowLeft') return { code: 37, char: '←' };
    if (event.key === 'ArrowRight') return { code: 39, char: '→' };
    return null;
  }

  function shouldIgnoreHotkeys(event) {
    const el = event.target;
    if (!el) return false;
    const tag = String(el.tagName || '').toUpperCase();
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
  }

  function startHold(type) {
    if (state.holdType === type && state.holdTimer) return;

    clearHold();
    state.holdType = type;
    state.holdTimer = window.setInterval(() => {
      if (type === 'SKIP') {
        skipTopRow();
      } else if (type === 'A' || type === 'B' || type === 'C') {
        sendTopRow(type);
      } else if (type === 'MASTER') {
        masterSendTopRow();
      }
    }, HOLD_INTERVAL_MS);
  }

  function clearHold() {
    if (state.holdTimer) {
      clearInterval(state.holdTimer);
    }
    state.holdTimer = null;
    state.holdType = null;
  }

  async function mergeSelectedPages(profile) {
    const table = document.querySelector('#plunder_list');
    if (!table) throw new Error('Loot Assistant table not found.');

    const pageCount = detectPageCount();
    const start = Math.max(1, sanitizePositive(profile.start_page, 1));
    const end = String(profile.end_page).toLowerCase() === 'max'
      ? pageCount
      : Math.min(pageCount, Math.max(start, sanitizePositive(profile.end_page, pageCount)));

    const order = profile.order_by || 'distance';
    const direction = profile.direction || 'asc';
    const firstRow = table.querySelector('tr');
    const collected = [];

    for (let page = start - 1; page <= end - 1; page += 1) {
      setStatus(`Loading page ${page + 1}/${end}`);
      const html = await fetchFarmPage(page, order, direction);
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const pageRows = Array.from(doc.querySelectorAll('#plunder_list tr[id^="village_"]'));
      pageRows.forEach(row => collected.push(row.cloneNode(true)));
    }

    table.innerHTML = '';
    if (firstRow) {
      table.appendChild(firstRow.cloneNode(true));
    }
    collected.forEach(row => table.appendChild(row));

    const nav = document.querySelector('#plunder_list_nav');
    if (nav) nav.style.display = 'none';
  }

  async function fetchFarmPage(page, order, direction) {
    const url = new URL(window.location.origin + '/game.php');
    const villageId =
      window.game_data?.village?.id ||
      new URL(window.location.href).searchParams.get('village') ||
      '';
    if (villageId) url.searchParams.set('village', String(villageId));
    url.searchParams.set('screen', 'am_farm');
    url.searchParams.set('Farm_page', String(page));
    url.searchParams.set('order', order);
    url.searchParams.set('dir', direction);

    const response = await fetch(url.toString(), { credentials: 'same-origin' });
    if (!response.ok) {
      throw new Error(`Failed to fetch page ${page + 1}: ${response.status}`);
    }
    return response.text();
  }

  function detectPageCount() {
    const nav = document.querySelector('#plunder_list_nav');
    if (!nav) return 1;

    const numbers = Array.from(nav.querySelectorAll('a, strong, option'))
      .map(el => cleanText(el.textContent).replace(/[^\d]/g, ''))
      .filter(Boolean)
      .map(Number);

    return numbers.length ? Math.max(...numbers) : 1;
  }

  function formatRows() {
    cleanupRowArtifacts();
    highlightTopRow();
  }

  function filterRows(profile) {
    const gameClock = getGameClock();
    const recentMap = getRecentSentMap(gameClock.epoch);

    const reasons = {
      blue: 0, green: 0, yellow: 0, red_yellow: 0, red_blue: 0, red: 0,
      haul_full: 0, haul_partial: 0,
      attacks: 0, walls: 0, distances: 0, time: 0, scout: 0, continents: 0, recent: 0
    };

    let hidden = 0;
    let visible = 0;

    getVillageRows().forEach(row => {
      const data = parseVillageRow(row, gameClock.now);
      const evaluation = evaluateRow(data, profile, recentMap);

      if (evaluation.hide) {
        row.classList.add(HIDE_CLASS);
        row.style.display = 'none';
        hidden += 1;
        evaluation.reasons.forEach(reason => {
          if (reasons[reason] != null) reasons[reason] += 1;
        });
      } else {
        row.classList.remove(HIDE_CLASS);
        row.style.display = '';
        visible += 1;
      }
    });

    return {
      total: hidden + visible,
      hidden,
      visible,
      reasons
    };
  }

  function evaluateRow(data, profile, recentMap) {
    const reasons = [];

    if (profile.blue && data.reportColor === 'blue') reasons.push('blue');
    if (profile.green && data.reportColor === 'green') reasons.push('green');
    if (profile.yellow && data.reportColor === 'yellow') reasons.push('yellow');
    if (profile.red_yellow && data.reportColor === 'red_yellow') reasons.push('red_yellow');
    if (profile.red_blue && data.reportColor === 'red_blue') reasons.push('red_blue');
    if (profile.red && data.reportColor === 'red') reasons.push('red');

    if (profile.enable_hauls) {
      if (profile.full && data.haulType === 'full') reasons.push('haul_full');
      if (profile.partial && data.haulType === 'partial') reasons.push('haul_partial');
    }

    if (profile.enable_attacks) {
      const value = sanitizePositive(profile.attack_value, 0);
      if (compareNumeric(data.attackCount, profile.attack_operator, value)) reasons.push('attacks');
    }

    if (profile.enable_walls) {
      const value = sanitizePositive(profile.wall_value, 0);
      if (compareNumeric(data.wall, profile.wall_operator, value)) reasons.push('walls');
    }

    if (profile.enable_distances) {
      const value = parseFloat(String(profile.distance_value || '0').replace(',', '.')) || 0;
      if (compareNumeric(data.distance, profile.distance_operator, value)) reasons.push('distances');
    }

    if (profile.enable_time) {
      const value = sanitizePositive(profile.time_value, 0);
      if (value > 0 && Number.isFinite(data.minutesSinceAttack)) {
        if (profile.attack_time_filter === 'hide' && data.minutesSinceAttack < value) reasons.push('time');
        if (profile.attack_time_filter === 'show' && data.minutesSinceAttack > value) reasons.push('time');
      }
    }

    if (profile.enable_scout) {
      const value = sanitizePositive(profile.haul_value, 0);
      if (compareNumeric(data.scoutResources, profile.scout_report_operator, value)) reasons.push('scout');
    }

    if (profile.enable_continents) {
      const continents = String(profile.continents_list || '')
        .split('.')
        .map(v => v.trim())
        .filter(Boolean);

      if (continents.length) {
        const hit = continents.includes(data.continent);
        if (profile.continent_display === 'hide' && hit) reasons.push('continents');
        if (profile.continent_display === 'show' && !hit) reasons.push('continents');
      }
    }

    if (profile.hide_recent_farms && data.coord) {
      const limit = sanitizePositive(profile.hide_recent_time, 0);
      const age = recentMap[data.coord];

      if (limit > 0 && Number.isFinite(age)) {
        if (profile.sent_time_filter === 'hide' && age < limit) reasons.push('recent');
        if (profile.sent_time_filter === 'show' && age > limit) reasons.push('recent');
      } else if (limit > 0 && profile.sent_time_filter === 'show') {
        reasons.push('recent');
      }
    }

    return { hide: reasons.length > 0, reasons };
  }

  function parseVillageRow(row, serverNow) {
    const tds = Array.from(row.children).filter(el => el.tagName === 'TD');
    const targetCell = tds.find(td => /\d+\|\d+/.test(td.textContent || '')) || null;
    const targetIdx = tds.indexOf(targetCell);

    const buttonCells = [];
    tds.forEach((td, idx) => {
      if (td.querySelector('a.farm_icon_a, a.farm_icon_b, a.farm_icon_c')) buttonCells.push(idx);
    });

    const firstButtonIdx = buttonCells.length ? Math.min(...buttonCells) : -1;
    const timeCell = targetIdx >= 0 ? tds[targetIdx + 1] : null;
    const scoutCell = firstButtonIdx >= 3 ? tds[firstButtonIdx - 3] : null;
    const wallCell = firstButtonIdx >= 2 ? tds[firstButtonIdx - 2] : null;
    const distanceCell = firstButtonIdx >= 1 ? tds[firstButtonIdx - 1] : null;

    const targetText = cleanText(targetCell ? targetCell.textContent : '');
    const coordMatch = targetText.match(/(\d+)\|(\d+)/);
    const coord = coordMatch ? `${coordMatch[1]}|${coordMatch[2]}` : '';

    const reportImg = row.querySelector('img[src*="graphic/dots/"]');
    const haulImg = row.querySelector('img[src*="graphic/max_loot/"]');
    const reportColorMatch = reportImg ? (reportImg.getAttribute('src') || '').match(/dots\/([a-z_]+)\./) : null;

    const x = coordMatch ? parseInt(coordMatch[1], 10) : 0;

    return {
      row,
      coord,
      targetText,
      reportColor: reportColorMatch ? reportColorMatch[1] : 'unknown',
      haulType: !haulImg
        ? 'none'
        : /max_loot\/1/.test(haulImg.getAttribute('src') || '')
          ? 'full'
          : 'partial',
      attackCount: parseAttackCount(targetCell),
      wall: sanitizePositive(wallCell ? wallCell.textContent : '0', 0),
      distance: parseFloat(String(distanceCell ? distanceCell.textContent : '0').replace(',', '.')) || 0,
      scoutResources: parseScoutResources(scoutCell),
      minutesSinceAttack: parseAttackAgeMinutes(timeCell, serverNow),
      continent: x ? String(Math.floor(x / 100)) : '',
      buttons: {
        A: row.querySelector('a.farm_icon_a'),
        B: row.querySelector('a.farm_icon_b'),
        C: row.querySelector('a.farm_icon_c')
      }
    };
  }

  function parseAttackCount(cell) {
    if (!cell) return 0;

    const imgs = Array.from(cell.querySelectorAll('img'));
    for (const img of imgs) {
      const tip = img.getAttribute('tooltipText') || img.getAttribute('title') || '';
      const digits = tip.replace(/\D+/g, '');
      if (digits) return parseInt(digits, 10);
    }

    const match = cleanText(cell.textContent).match(/\((\d+)\)/);
    return match ? parseInt(match[1], 10) : 0;
  }

  function parseScoutResources(cell) {
    if (!cell) return 0;
    const text = cleanText(cell.textContent);
    if (!text || text === '?') return 0;
    const nums = text.match(/\d+/g);
    return nums ? nums.map(Number).reduce((a, b) => a + b, 0) : 0;
  }

  function parseAttackAgeMinutes(cell, serverNow) {
    if (!cell) return Infinity;
    const text = cleanText(cell.textContent);
    if (!text) return Infinity;

    const lower = text.toLowerCase();
    let datePart = null;
    let timePart = null;

    for (const part of lower.split(/\s+/)) {
      if (part.includes('.')) datePart = part;
      if (part.includes(':')) timePart = part.replace(/[^\d:]/g, '');
    }

    if (!timePart) return Infinity;

    let year = serverNow.getFullYear();
    let month = serverNow.getMonth();
    let day = serverNow.getDate();

    if (lower.includes('yesterday')) day -= 1;

    if (datePart && !lower.includes('today') && !lower.includes('yesterday')) {
      const dm = datePart.split('.');
      if (dm.length >= 2) {
        day = parseInt(dm[0], 10);
        month = parseInt(dm[1], 10) - 1;
        if (serverNow.getMonth() === 0 && month === 11) year -= 1;
      }
    }

    const [hh, mm, ss] = timePart.split(':').map(n => parseInt(n, 10));
    const attackDate = new Date(year, month, day, hh || 0, mm || 0, ss || 0, 0);
    return Math.abs(Math.floor((serverNow.getTime() - attackDate.getTime()) / 60000));
  }

  function getGameClock() {
    const timeEl = byId('serverTime');
    const dateEl = byId('serverDate');

    if (!timeEl || !dateEl) {
      const now = new Date();
      return { ok: false, now, epoch: now.getTime() };
    }

    const timeText = cleanText(timeEl.textContent);
    const dateText = cleanText(dateEl.textContent);

    let hh = 0, mm = 0, ss = 0;
    let dd = 1, MM = 1, yyyy = 1970;

    const tm = timeText.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);
    if (tm) {
      hh = parseInt(tm[1], 10);
      mm = parseInt(tm[2], 10);
      ss = parseInt(tm[3] || '0', 10);
    }

    const dm = dateText.match(/(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})/);
    if (dm) {
      dd = parseInt(dm[1], 10);
      MM = parseInt(dm[2], 10);
      yyyy = parseInt(dm[3], 10);
      if (yyyy < 100) yyyy += 2000;
    } else {
      const now = new Date();
      dd = now.getDate();
      MM = now.getMonth() + 1;
      yyyy = now.getFullYear();
    }

    const now = new Date(yyyy, MM - 1, dd, hh, mm, ss, 0);
    return { ok: true, now, epoch: now.getTime(), dateText, timeText };
  }

  function getRecentSentMap(currentGameEpoch) {
    const world = window.game_data?.world || location.host;
    const map = {};

    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (!key) continue;
      if (!key.startsWith(`${LAST_SENT_PREFIX}${world}_`)) continue;

      const coord = key.substring(`${LAST_SENT_PREFIX}${world}_`.length);
      const ts = parseInt(localStorage.getItem(key) || '0', 10);
      if (!Number.isFinite(ts) || ts <= 0) continue;

      map[coord] = Math.floor((currentGameEpoch - ts) / 60000);
    }

    return map;
  }

  function getVillageRows() {
    return Array.from(document.querySelectorAll('#plunder_list tr[id^="village_"]'));
  }

  function getVisibleRows() {
    return getVillageRows().filter(row => row.style.display !== 'none' && !row.classList.contains(HIDE_CLASS));
  }

  function getTopRow() {
    return getVisibleRows()[0] || null;
  }

  function highlightTopRow() {
    getVillageRows().forEach(row => row.classList.remove(TOP_CLASS));
    const top = getTopRow();
    if (top) top.classList.add(TOP_CLASS);
  }

  function skipTopRow() {
    const row = getTopRow();
    if (!row) {
      info(TEXT.noRows, true);
      return;
    }

    row.style.display = 'none';
    row.classList.add(HIDE_CLASS);
    highlightTopRow();
    maybeGoNextVillage();
  }

  function sendTopRow(buttonName) {
    const nowMs = Date.now();
    if (nowMs - state.lastActionAt < SEND_THROTTLE_MS) return;
    state.lastActionAt = nowMs;

    const row = getTopRow();
    if (!row) {
      info(TEXT.noRows, true);
      return;
    }

    const data = parseVillageRow(row, getGameClock().now);
    const button = data.buttons[buttonName];

    if (!button || button.classList.contains('farm_icon_disabled')) {
      info(TEXT.nothingToSend, true);
      row.style.display = 'none';
      row.classList.add(HIDE_CLASS);
      highlightTopRow();
      maybeGoNextVillage();
      return;
    }

    recordRecentSend(data.coord);
    button.click();

    window.setTimeout(() => {
      try {
        maybeGoNextVillage();
      } catch (_) {}
    }, 250);
  }

  function masterSendTopRow() {
    const row = getTopRow();
    if (!row) {
      info(TEXT.noRows, true);
      return;
    }

    const clock = getGameClock();
    const data = parseVillageRow(row, clock.now);
    const recentMap = getRecentSentMap(clock.epoch);

    const priorities = [
      { enabled: state.keys.priorityOneEnabled, profile: loadProfile(state.keys.priorityOneProfile), button: state.keys.priorityOneButton },
      { enabled: state.keys.priorityTwoEnabled, profile: loadProfile(state.keys.priorityTwoProfile), button: state.keys.priorityTwoButton },
      { enabled: state.keys.priorityThreeEnabled, profile: loadProfile(state.keys.priorityThreeProfile), button: state.keys.priorityThreeButton }
    ];

    let choice = state.keys.defaultButton;

    for (const item of priorities) {
      if (!item.enabled) continue;
      const result = evaluateRow(data, item.profile, recentMap);
      if (!result.hide) {
        choice = item.button;
        break;
      }
    }

    if (choice === 'Skip') {
      skipTopRow();
      return;
    }

    sendTopRow(choice);
  }

  function recordRecentSend(coord) {
    if (!coord) return;
    const world = window.game_data?.world || location.host;
    const gameEpoch = getGameClock().epoch;
    localStorage.setItem(`${LAST_SENT_PREFIX}${world}_${coord}`, String(gameEpoch));
  }

  function maybeGoNextVillage() {
    const profile = readProfileFromUi();
    const units = window.Accountmanager?.farm?.current_units || {};
    const selectedTotal = getSelectedFarmUnitTotal(units);
    const scouts = parseInt(units.spy || 0, 10) || 0;

    if (profile.next_village_scouts) {
      const threshold = sanitizePositive(profile.scouts_left, 0);
      if (scouts <= threshold) {
        navigateVillage('n');
        return true;
      }
    }

    if (profile.next_village_farming_troops) {
      const threshold = sanitizePositive(profile.farming_troops_left, 0);
      if (selectedTotal <= threshold) {
        navigateVillage('n');
        return true;
      }
    }

    if (profile.next_village_units && selectedTotal <= 0) {
      navigateVillage('n');
      return true;
    }

    if (profile.next_village_no_farms && getVisibleRows().length === 0) {
      navigateVillage('n');
      return true;
    }

    return false;
  }

  function getSelectedFarmUnitTotal(units) {
    let total = 0;

    document.querySelectorAll('.fm_unit input:checked').forEach(input => {
      const name = input.getAttribute('name');
      if (!name) return;
      total += parseInt(units[name] || 0, 10) || 0;
    });

    return total;
  }

  function navigateVillage(direction) {
    const url = new URL(window.location.origin + '/game.php');
    url.searchParams.set('village', `${direction}${window.game_data.village.id}`);
    url.searchParams.set('screen', 'am_farm');
    window.location.href = url.toString();
  }

  function uglyHider(anchor) {
    const targetId = anchor.getAttribute('data-target');
    const target = targetId ? document.getElementById(targetId) : null;
    if (!target) return false;

    const hidden = target.style.display === 'none';
    target.style.display = hidden ? '' : 'none';
    anchor.textContent = hidden
      ? (anchor.getAttribute('data-open') || '-')
      : (anchor.getAttribute('data-closed') || '+');

    return false;
  }

  function sanitizePositive(value, fallback) {
    const n = parseInt(String(value || '').replace(/[^\d-]/g, ''), 10);
    return Number.isFinite(n) && n >= 0 ? n : fallback;
  }

  function cleanText(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function compareNumeric(actual, operator, expected) {
    const a = Number(actual || 0);
    const e = Number(expected || 0);
    if (operator === 'greater_than') return a > e;
    if (operator === 'less_than') return a < e;
    return a === e;
  }

  function byId(id) {
    return document.getElementById(id);
  }

  function setStatus(text) {
    const el = byId('lae4_status');
    if (el) el.textContent = text;
  }

  function info(text, isError) {
    setStatus(text);
    if (window.UI?.InfoMessage && !isError) UI.InfoMessage(text, 1800);
    if (window.UI?.ErrorMessage && isError) UI.ErrorMessage(text, 2200);
  }

  function error(text) {
    info(text, true);
  }
})();