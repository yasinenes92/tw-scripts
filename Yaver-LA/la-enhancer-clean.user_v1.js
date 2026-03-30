// ==UserScript==
// @name         LA Enhancer Clean Rebuild
// @namespace    https://github.com/yasinenes92/tw-scripts
// @version      1.0.0
// @description  Clean standalone rebuild of LA Enhancer for Tribal Wars Loot Assistant.
// @author       OpenAI + Fikri Evlat
// @match        https://*.tribalwars.net/game.php*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function() {
  'use strict';

  const SCRIPT_ID = 'la-enhancer-rebuild';
  const VERSION = '1.0.0';
  const PROFILE_PREFIX = 'LAE_PROFILE_';
  const PROFILE_LIST_KEY = 'LAE_PROFILE_LIST';
  const DEFAULT_PROFILE_KEY = 'LAE_DEFAULT_PROFILE';
  const KEYPRESS_KEY = 'LAE_KEYPRESS_SETTINGS';
  const LANGUAGE_KEY = 'LAE_LANGUAGE';
  const WORKING_KEY = 'LAE_WORKING';
  const LAST_SENT_PREFIX = 'LAE_LAST_SENT_';
  const AUTO_RUN_FLAG = 'LAE_AUTO_RUN_TEMP';
  const ALLOWED_CAPTURE_KEYS = new Set(['ArrowLeft', 'ArrowRight']);

  const STRINGS = {
    title: 'LA Enhancer',
    subTitle: 'FA Filter / Rebuild',
    language: 'Language',
    author: 'standalone rebuild',
    startPage: 'Start page',
    endPage: 'End page',
    enableFilters: 'Enable filters',
    allNone: 'All / None',
    blue: 'Blue',
    green: 'Green',
    yellow: 'Yellow',
    redYellow: 'Red / Yellow',
    redBlue: 'Red / Blue',
    red: 'Red',
    orderBy: 'Order by',
    distance: 'Distance',
    date: 'Date',
    direction: 'Direction',
    asc: 'Ascending',
    desc: 'Descending',
    haulFilter: 'Haul filter',
    full: 'Full',
    partial: 'Partial',
    attacks: 'Attack count',
    advanced: 'Advanced',
    walls: 'Walls',
    nextVillageNoFarms: 'Next village if no visible farms',
    distances: 'Distances',
    nextVillageUnits: 'Next village if selected units are depleted',
    continents: 'Continents',
    hide: 'Hide',
    show: 'Show',
    continentList: 'List',
    nextVillageScouts: 'Next village when scouts ≤',
    scoutFilter: 'Scout report resources',
    nextVillageTroops: 'Next village when selected farm units ≤',
    timeFilter: 'Last attack time',
    minutes: 'minutes',
    autoRun: 'Auto run across pages',
    recentFarms: 'Recently sent filter',
    hotkeys: 'Hotkeys',
    priority: 'Priority',
    button: 'Button',
    profile: 'Profile',
    defaultButton: 'Default button',
    skip: 'Skip',
    left: '←',
    right: '→',
    apply: 'Apply',
    reset: 'Reset',
    create: 'Create',
    setDefault: 'Set default',
    delete: 'Delete',
    update: 'Update',
    export: 'Export',
    import: 'Import',
    profileHelp: 'Profiles save and restore the filter configuration shown above.',
    reportHelp: 'Checked report colors are hidden.',
    enableHelp: 'Checked filter blocks rows that match the rule.',
    continentHelp: 'Use continent codes separated by dots, for example: 62.63.72',
    recentHelp: 'Uses local timestamps saved when this script sends a farm command.',
    autoRunProgress: 'Loading page',
    filtered: 'Filters applied',
    bootFailed: 'Boot failed',
    notSelectable: 'That button is not selectable. Skipping row...',
    invalidKey: 'Only letters, numbers, or arrow keys are allowed.',
    noProfileName: 'Profile name is required.',
    profileExists: 'Profile already exists.',
    cannotDeleteDefault: 'The Default profile cannot be deleted.',
    imported: 'Profile imported.',
    exported: 'Profile JSON copied to prompt. Save it somewhere safe.',
    settingsSaved: 'Settings saved.',
    keySaved: 'Hotkeys saved.',
    noRows: 'No visible rows.',
    openLootAssistantFirst: 'Open Loot Assistant first, then run this script.',
    open: 'Open',
    minimize: 'Minimize'
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
    hide_recent_farms: false,
    sent_time_filter: 'hide',
    hide_recent_time: '',
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
    enable_scout: false,
    scout_report_operator: 'greater_than',
    haul_value: '',
    continent_display: 'hide',
    continents_list: '',
    enable_time: false,
    attack_time_filter: 'hide',
    time_value: '',
    enable_auto_run: false,
    next_village_no_farms: false,
    next_village_scouts: false,
    scouts_left: '',
    next_village_farming_troops: false,
    farming_troops_left: '',
    next_village_units: false
  };

  const DEFAULT_KEYS = {
    a_code: 65, a_char: 'A',
    b_code: 66, b_char: 'B',
    c_code: 67, c_char: 'C',
    master_code: 77, master_char: 'M',
    skip_code: 83, skip_char: 'S',
    left_code: 37, left_char: '←',
    right_code: 39, right_char: '→',
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
    profileName: 'Default',
    profile: null,
    keys: null,
    editMode: null,
    initialized: false,
    expandedRows: false,
    sendingBlocked: false
  };

  if (window.LAEnhancerRebuild && typeof window.LAEnhancerRebuild.destroy === 'function') {
    window.LAEnhancerRebuild.destroy();
  }

  if (!window.game_data || window.game_data.screen !== 'am_farm') {
    uiError(STRINGS.openLootAssistantFirst);
    return;
  }

  init();

  function init() {
    try {
      ensureStorage();
      state.keys = loadKeySettings();
      state.profileName = loadDefaultProfileName();
      state.profile = loadProfile(state.profileName);
      injectStyle();
      buildUi();
      exposeGlobals();
      formatBaseTable();
      bindUi();
      applyProfileToUi(state.profile);
      populateProfileSelects();
      applyKeySettingsToUi();
      bindHotkeys();
      updateFocusBindings();

      if (state.profile.enable_auto_run && sessionStorage.getItem(AUTO_RUN_FLAG) !== 'done') {
        sessionStorage.setItem(AUTO_RUN_FLAG, 'pending');
      }

      if (sessionStorage.getItem(AUTO_RUN_FLAG) === 'pending') {
        sessionStorage.setItem(AUTO_RUN_FLAG, 'done');
        void applySettings();
      } else {
        sessionStorage.removeItem(AUTO_RUN_FLAG);
      }

      state.initialized = true;
      uiInfo(`${STRINGS.title} ${VERSION} ready.`, 1500);
    } catch (err) {
      console.error(`[${SCRIPT_ID}] init failed`, err);
      uiError(`${STRINGS.bootFailed}: ${err.message || err}`);
    }
  }

  function destroy() {
    document.removeEventListener('keydown', onKeyDownCapture, true);
    document.removeEventListener('keyup', onKeyUpCapture, true);

    const root = document.getElementById('settingsDiv');
    if (root) root.remove();

    const style = document.getElementById(`${SCRIPT_ID}-style`);
    if (style) style.remove();
  }

  function exposeGlobals() {
    window.LAEnhancerRebuild = { destroy };
    window.applySettings = applySettings;
    window.resetTable = resetTable;
    window.changeProfile = changeProfile;
    window.createProfile = createProfile;
    window.setDefaultProfile = setDefaultProfile;
    window.deleteProfile = deleteProfile;
    window.updateProfile = updateProfile;
    window.exportProfile = exportProfile;
    window.importProfile = importProfile;
    window.updateKeypressSettings = updateKeypressSettings;
    window.setKeyEditMode = setKeyEditMode;
    window.loadLanguage = loadLanguage;
    window.uglyHider = uglyHider;
  }

  function ensureStorage() {
    if (!localStorage.getItem(PROFILE_LIST_KEY)) {
      localStorage.setItem(PROFILE_LIST_KEY, JSON.stringify(['Default']));
    }
    if (!localStorage.getItem(DEFAULT_PROFILE_KEY)) {
      localStorage.setItem(DEFAULT_PROFILE_KEY, 'Default');
    }
    if (!localStorage.getItem(PROFILE_PREFIX + 'Default')) {
      saveProfile('Default', { ...DEFAULT_PROFILE });
    }
    if (!localStorage.getItem(KEYPRESS_KEY)) {
      localStorage.setItem(KEYPRESS_KEY, JSON.stringify(DEFAULT_KEYS));
    }
    if (!localStorage.getItem(LANGUAGE_KEY)) {
      localStorage.setItem(LANGUAGE_KEY, 'en');
    }
  }

  function loadDefaultProfileName() {
    return localStorage.getItem(DEFAULT_PROFILE_KEY) || 'Default';
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

  function loadProfile(name) {
    try {
      const raw = JSON.parse(localStorage.getItem(PROFILE_PREFIX + name) || 'null');
      return { ...DEFAULT_PROFILE, ...(raw || {}) };
    } catch {
      return { ...DEFAULT_PROFILE };
    }
  }

  function saveProfile(name, profile) {
    localStorage.setItem(PROFILE_PREFIX + name, JSON.stringify({ ...DEFAULT_PROFILE, ...profile }));
  }

  function loadKeySettings() {
    try {
      return { ...DEFAULT_KEYS, ...(JSON.parse(localStorage.getItem(KEYPRESS_KEY) || '{}')) };
    } catch {
      return { ...DEFAULT_KEYS };
    }
  }

  function saveKeySettings(settings) {
    localStorage.setItem(KEYPRESS_KEY, JSON.stringify(settings));
  }

  function injectStyle() {
    const style = document.createElement('style');
    style.id = `${SCRIPT_ID}-style`;
    style.textContent = `
      #settingsDiv .settingsTable input[type="text"],
      #settingsDiv .settingsTable select { font-size: 12px; }
      #settingsDiv .hotkey_value { width: 42px; text-align:center; }
      #settingsDiv .lae-small { width: 42px; }
      #settingsDiv .lae-medium { width: 64px; }
      #settingsDiv .lae-mini { width: 12px; text-align:center; }
      #settingsDiv .lae-hidden { display:none; }
      #settingsDiv .hotkey_values td { padding: 2px 4px; }
      #settingsDiv .lae-note { color:#5b3f11; font-size:11px; }
      #settingsDiv .lae-collapse {
        float:right; text-align:center; line-height:100%; width:12px; height:12px;
        margin:0; position:relative; background-color:tan; opacity:.7;
      }
      #settingsDiv .lae-collapse a { text-decoration:none; }
      #settingsDiv .lae-row-hidden { display:none !important; }
      #plunder_list tr.lae-filtered-out { display:none !important; }
      #plunder_list tr.lae-top-row td { background-color: rgb(216,255,216) !important; }
      #settingsDiv .lae-right-controls { float:right; }
      #settingsDiv .lae-left-controls { float:left; }
      #settingsDiv .lae-profile-bar input { margin-left:3px; }
      #settingsDiv .lae-why-box {
        padding:6px 8px; margin-top:6px; font-size:11px; color:#603000;
        background:#fff5da; border:1px solid #d2b48c; display:none;
      }
      #settingsDiv .lae-status { margin-left:8px; font-size:11px; color:#603000; }
      #settingsDiv .lae-title-link { font-weight:normal; }
      #settingsDiv .lae-filter-title { font-weight:bold; }
    `;
    document.head.appendChild(style);
  }

  function buildUi() {
    const h3 = document.querySelector('#contentContainer h3');
    if (!h3) throw new Error('Loot Assistant header not found.');

    const div = document.createElement('div');
    div.className = 'vis';
    div.id = 'settingsDiv';
    div.innerHTML = `
      <table class="settingsTable">
        <thead>
          <tr>
            <th colspan="5" class="vis" style="padding:0;">
              <h4>
                ${STRINGS.title} (${VERSION}) - <span class="lae-title-link">${STRINGS.subTitle}</span> - ${STRINGS.language}:
                <select id="language" style="margin:0;">
                  <option value="en">English</option>
                </select>
                <span style="font-size:10px;float:right;font-weight:normal;font-style:normal">
                  ${STRINGS.author}
                  <div class="lae-collapse"><a href="#" data-target="settingsBody" data-open="-" data-closed="+">-</a></div>
                </span>
              </h4>
            </th>
          </tr>
        </thead>
        <tbody id="settingsBody">
          <tr>
            <td class="col1" style="min-width:200px">
              <span>${STRINGS.startPage}</span>&nbsp;<input type="text" value="" size="2" maxlength="3" id="start_page" class="lae-small">
              &nbsp;<span>${STRINGS.endPage}</span>&nbsp;<input type="text" value="" size="2" maxlength="5" id="end_page" class="lae-small">
            </td>
            <td colspan="3">
              <span class="lae-filter-title">${STRINGS.enableFilters}</span>&nbsp;<img src="graphic/questionmark.png" width="13" height="13" id="enable_help">
            </td>
            <td rowspan="5" valign="top">
              <form>
                <input type="checkbox" id="all_none">&nbsp;<label for="all_none" style="font-weight:bold">${STRINGS.allNone}</label>&nbsp;<img src="graphic/questionmark.png" width="13" height="13" id="report_help"><br>
                <input type="checkbox" id="blue"><label for="blue"><img src="graphic/dots/blue.webp">&nbsp;${STRINGS.blue}</label><br>
                <input type="checkbox" id="green"><label for="green"><img src="graphic/dots/green.webp">&nbsp;${STRINGS.green}</label><br>
                <input type="checkbox" id="yellow"><label for="yellow"><img src="graphic/dots/yellow.webp">&nbsp;${STRINGS.yellow}</label><br>
                <input type="checkbox" id="red_yellow"><label for="red_yellow"><img src="graphic/dots/red_yellow.webp">&nbsp;${STRINGS.redYellow}</label><br>
                <input type="checkbox" id="red_blue"><label for="red_blue"><img src="graphic/dots/red_blue.webp">&nbsp;${STRINGS.redBlue}</label><br>
                <input type="checkbox" id="red"><label for="red"><img src="graphic/dots/red.webp">&nbsp;${STRINGS.red}</label>
              </form>
            </td>
          </tr>
          <tr>
            <td rowspan="2">
              <label for="order_by">${STRINGS.orderBy}:</label>&nbsp;
              <select id="order_by">
                <option value="distance">${STRINGS.distance}</option>
                <option value="date">${STRINGS.date}</option>
              </select><br>
              <label for="direction">${STRINGS.direction}:</label>&nbsp;
              <select id="direction">
                <option value="asc">${STRINGS.asc}</option>
                <option value="desc">${STRINGS.desc}</option>
              </select>
            </td>
            <td style="width:26px"><input type="checkbox" id="enable_hauls"></td>
            <td style="width:110px"><label for="enable_hauls">${STRINGS.haulFilter}</label></td>
            <td>
              <input type="radio" name="hauls" id="full"><label for="full"><img src="graphic/max_loot/1.png">${STRINGS.full}</label>
              &nbsp;
              <input type="radio" name="hauls" id="partial"><label for="partial"><img src="graphic/max_loot/0.png">${STRINGS.partial}</label>
            </td>
          </tr>
          <tr>
            <td><input type="checkbox" id="enable_attacks"></td>
            <td><label for="enable_attacks">${STRINGS.attacks}</label></td>
            <td>
              <select id="attack_operator">
                <option value="greater_than">&gt;</option>
                <option value="less_than">&lt;</option>
                <option value="equal_to">=</option>
              </select>
              &nbsp;<input type="text" id="attack_value" size="2" maxlength="2" value="" class="lae-small">
            </td>
          </tr>
          <tr>
            <td><span class="lae-filter-title">${STRINGS.advanced}</span></td>
            <td><input type="checkbox" id="enable_walls"></td>
            <td><label for="enable_walls">${STRINGS.walls}</label></td>
            <td>
              <select id="wall_operator">
                <option value="greater_than">&gt;</option>
                <option value="less_than">&lt;</option>
                <option value="equal_to">=</option>
              </select>
              &nbsp;<input type="text" id="wall_value" size="2" maxlength="2" value="" class="lae-small">
            </td>
          </tr>
          <tr>
            <td><input type="checkbox" id="next_village_no_farms"><label for="next_village_no_farms">${STRINGS.nextVillageNoFarms}</label></td>
            <td><input type="checkbox" id="enable_distances"></td>
            <td><label for="enable_distances">${STRINGS.distances}</label></td>
            <td>
              <select id="distance_operator">
                <option value="greater_than">&gt;</option>
                <option value="less_than">&lt;</option>
                <option value="equal_to">=</option>
              </select>
              &nbsp;<input type="text" id="distance_value" size="2" maxlength="6" value="" class="lae-medium">
            </td>
          </tr>
          <tr>
            <td><input type="checkbox" id="next_village_units"><label for="next_village_units">${STRINGS.nextVillageUnits}</label></td>
            <td><input type="checkbox" id="enable_continents"></td>
            <td colspan="3">
              <select id="continent_display">
                <option value="hide">${STRINGS.hide}</option>
                <option value="show">${STRINGS.show}</option>
              </select>
              &nbsp;<label for="continents_list">${STRINGS.continentList}</label>
              &nbsp;<input type="text" size="20" maxlength="150" id="continents_list" value="">
              &nbsp;<img src="graphic/questionmark.png" height="13" id="continent_help">
            </td>
          </tr>
          <tr>
            <td><input type="checkbox" id="next_village_scouts"><input type="text" size="2" id="scouts_left" class="lae-small"> ${STRINGS.nextVillageScouts}</td>
            <td><input type="checkbox" id="enable_scout"></td>
            <td colspan="3">
              <label for="enable_scout">${STRINGS.scoutFilter}</label>
              &nbsp;<select id="scout_report_operator">
                <option value="greater_than">&gt;</option>
                <option value="less_than">&lt;</option>
                <option value="equal_to">=</option>
              </select>
              &nbsp;<input type="text" id="haul_value" size="9" maxlength="7" value="">
            </td>
          </tr>
          <tr>
            <td><input type="checkbox" id="next_village_farming_troops"><input type="text" size="2" id="farming_troops_left" class="lae-small"> ${STRINGS.nextVillageTroops}</td>
            <td><input type="checkbox" id="enable_time"></td>
            <td colspan="3">
              <select id="attack_time_filter">
                <option value="hide">${STRINGS.hide}</option>
                <option value="show">${STRINGS.show}</option>
              </select>
              &nbsp;<label for="enable_time">${STRINGS.timeFilter}</label>
              &nbsp;<input type="text" id="time_value" size="2" maxlength="4" value="" class="lae-small">
              <span>${STRINGS.minutes}</span>
            </td>
          </tr>
          <tr>
            <td><input type="checkbox" id="enable_auto_run"><label for="enable_auto_run">${STRINGS.autoRun}</label></td>
            <td><input type="checkbox" id="hide_recent_farms"></td>
            <td colspan="3">
              <select id="sent_time_filter">
                <option value="hide">${STRINGS.hide}</option>
                <option value="show">${STRINGS.show}</option>
              </select>
              &nbsp;${STRINGS.recentFarms}
              <input type="text" size="2" id="hide_recent_time" class="lae-small"> ${STRINGS.minutes}
            </td>
          </tr>
          <tr><th>${STRINGS.hotkeys}</th><th colspan="4">${STRINGS.priority}</th></tr>
          <tr>
            <td rowspan="4">
              <table>
                <tr class="hotkey_values">
                  <td><a href="#" data-key-mode="A" id="button_a" class="farm_icon farm_icon_a"></a></td>
                  <td><a href="#" data-key-mode="B" id="button_b" class="farm_icon farm_icon_b"></a></td>
                  <td><a href="#" data-key-mode="C" id="button_c" class="farm_icon farm_icon_c"></a></td>
                  <td><a href="#" data-key-mode="Master" id="button_master" class="farm_icon farm_icon_m"></a></td>
                </tr>
                <tr class="hotkey_values">
                  <td><input type="text" class="hotkey_value" readonly id="hotkey_value_a" value="A"></td>
                  <td><input type="text" class="hotkey_value" readonly id="hotkey_value_b" value="B"></td>
                  <td><input type="text" class="hotkey_value" readonly id="hotkey_value_c" value="C"></td>
                  <td><input type="text" class="hotkey_value" readonly id="hotkey_value_master" value="M"></td>
                </tr>
                <tr class="hotkey_values">
                  <td colspan="2"><input class="btn tooltip" data-key-mode="Skip" type="button" value="${STRINGS.skip}" style="margin:0" title="${STRINGS.skip}"></td>
                  <td><input class="btn tooltip" data-key-mode="Left" type="button" value="${STRINGS.left}" style="margin:0" title="${STRINGS.left}"></td>
                  <td><input class="btn tooltip" data-key-mode="Right" type="button" value="${STRINGS.right}" style="margin:0" title="${STRINGS.right}"></td>
                </tr>
                <tr class="hotkey_values">
                  <td colspan="2"><input type="text" class="hotkey_value" readonly id="hotkey_value_skip" value="S"></td>
                  <td><input type="text" class="hotkey_value" readonly id="hotkey_value_left" value="←"></td>
                  <td><input type="text" class="hotkey_value" readonly id="hotkey_value_right" value="→"></td>
                </tr>
              </table>
            </td>
            <td><input type="checkbox" id="priorityOneEnabled"></td>
            <td colspan="3">${STRINGS.profile} <select id="priorityOneProfile"></select> ${STRINGS.button} <select id="priorityOneButton">${buttonOptionsHtml()}</select></td>
          </tr>
          <tr>
            <td><input type="checkbox" id="priorityTwoEnabled"></td>
            <td colspan="3">${STRINGS.profile} <select id="priorityTwoProfile"></select> ${STRINGS.button} <select id="priorityTwoButton">${buttonOptionsHtml()}</select></td>
          </tr>
          <tr>
            <td><input type="checkbox" id="priorityThreeEnabled"></td>
            <td colspan="3">${STRINGS.profile} <select id="priorityThreeProfile"></select> ${STRINGS.button} <select id="priorityThreeButton">${buttonOptionsHtml()}</select></td>
          </tr>
          <tr>
            <td colspan="4">${STRINGS.defaultButton} <select id="defaultButton">${buttonOptionsHtml()}</select></td>
          </tr>
          <tr class="lae-profile-bar">
            <td colspan="5">
              <div class="lae-left-controls">
                <input type="button" class="btn" value="${STRINGS.apply}" id="applySettingsBtn">
                <input type="button" class="btn" value="${STRINGS.reset}" id="resetTableBtn">
                <span class="lae-status" id="lae_status"></span>
              </div>
              <div class="lae-right-controls">
                <img src="graphic/questionmark.png" width="13" height="13" id="profile_help">
                &nbsp;<label for="settingsProfile">${STRINGS.profile}:</label>
                &nbsp;<select id="settingsProfile"></select>
                &nbsp;<input type="button" class="btn" value="${STRINGS.create}" id="createProfileBtn">
                &nbsp;<input type="button" class="btn" value="${STRINGS.setDefault}" id="setDefaultProfileBtn">
                &nbsp;<input type="button" class="btn" value="${STRINGS.delete}" id="deleteProfileBtn">
                &nbsp;<input type="button" class="btn" value="${STRINGS.update}" id="updateProfileBtn">
                &nbsp;<input type="button" class="btn" value="${STRINGS.export}" id="exportProfileBtn">
                &nbsp;<input type="button" class="btn" value="${STRINGS.import}" id="importProfileBtn">
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      <div class="lae-why-box" id="lae_why_box"></div>
    `;

    h3.insertAdjacentElement('afterend', div);

    const nativeVis = document.querySelector('#contentContainer .vis');
    if (nativeVis) {
      const firstHeader = nativeVis.querySelector('h4');
      if (firstHeader) {
        const toggle = document.createElement('div');
        toggle.className = 'lae-collapse';
        toggle.innerHTML = `<a href="#" data-target="nativeBody" data-open="+" data-closed="-">+</a>`;
        firstHeader.appendChild(toggle);

        const tableBody = nativeVis.children[1];
        if (tableBody) {
          tableBody.id = 'nativeBody';
          tableBody.style.display = 'none';
        }
      }
    }
  }

  function buttonOptionsHtml() {
    return [
      '<option value="A">A</option>',
      '<option value="B">B</option>',
      '<option value="C">C</option>',
      `<option value="Skip">${STRINGS.skip}</option>`
    ].join('');
  }

  function bindUi() {
    byId('all_none').addEventListener('change', onAllNoneChange);
    byId('language').addEventListener('change', () => loadLanguage(byId('language').value));

    document.querySelectorAll('[data-key-mode]').forEach(el => {
      el.addEventListener('click', (ev) => {
        ev.preventDefault();
        setKeyEditMode(el.getAttribute('data-key-mode'));
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

    byId('createProfileBtn').addEventListener('click', (ev) => {
      ev.preventDefault();
      createProfile();
    });

    byId('setDefaultProfileBtn').addEventListener('click', (ev) => {
      ev.preventDefault();
      setDefaultProfile();
    });

    byId('deleteProfileBtn').addEventListener('click', (ev) => {
      ev.preventDefault();
      deleteProfile();
    });

    byId('updateProfileBtn').addEventListener('click', (ev) => {
      ev.preventDefault();
      updateProfile();
    });

    byId('exportProfileBtn').addEventListener('click', (ev) => {
      ev.preventDefault();
      exportProfile();
    });

    byId('importProfileBtn').addEventListener('click', (ev) => {
      ev.preventDefault();
      importProfile();
    });

    byId('settingsProfile').addEventListener('change', () => changeProfile(byId('settingsProfile').value));

    [
      'priorityOneEnabled','priorityOneProfile','priorityOneButton',
      'priorityTwoEnabled','priorityTwoProfile','priorityTwoButton',
      'priorityThreeEnabled','priorityThreeProfile','priorityThreeButton',
      'defaultButton'
    ].forEach(id => {
      byId(id).addEventListener('change', updateKeypressSettings);
    });

    document.querySelectorAll('.lae-collapse a').forEach(a => {
      a.addEventListener('click', (ev) => {
        ev.preventDefault();
        uglyHider(a);
      });
    });

    addTooltip('report_help', STRINGS.reportHelp);
    addTooltip('enable_help', STRINGS.enableHelp);
    addTooltip('continent_help', STRINGS.continentHelp);
    addTooltip('profile_help', STRINGS.profileHelp);
  }

  function updateFocusBindings() {
    document.querySelectorAll('#settingsBody input, #settingsBody select').forEach(el => {
      el.addEventListener('focus', () => {
        if (!state.editMode) document.removeEventListener('keydown', onKeyDownCapture, true);
      });
      el.addEventListener('blur', () => {
        if (!state.editMode) bindHotkeys();
      });
    });
  }

  function addTooltip(id, text) {
    const el = byId(id);
    if (!el) return;
    el.setAttribute('title', text);
    if (window.UI && typeof UI.ToolTip === 'function') UI.ToolTip(el);
  }

  function onAllNoneChange() {
    const checked = byId('all_none').checked;
    ['blue','green','yellow','red_yellow','red_blue','red'].forEach(id => {
      byId(id).checked = checked;
    });
  }

  function populateProfileSelects() {
    const list = getProfileList();

    ['settingsProfile','priorityOneProfile','priorityTwoProfile','priorityThreeProfile'].forEach(id => {
      const select = byId(id);
      select.innerHTML = '';
      list.forEach(name => {
        const opt = document.createElement('option');
        opt.value = name;
        opt.textContent = name;
        select.appendChild(opt);
      });
    });

    byId('settingsProfile').value = state.profileName;
    state.keys = loadKeySettings();
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
    profile.end_page = profile.end_page === 'max' ? 'max' : sanitizePositive(profile.end_page, 1);
    return profile;
  }

  function applyKeySettingsToUi() {
    const k = state.keys;
    byId('hotkey_value_a').value = k.a_char;
    byId('hotkey_value_b').value = k.b_char;
    byId('hotkey_value_c').value = k.c_char;
    byId('hotkey_value_master').value = k.master_char;
    byId('hotkey_value_skip').value = k.skip_char;
    byId('hotkey_value_left').value = k.left_char;
    byId('hotkey_value_right').value = k.right_char;
    byId('priorityOneEnabled').checked = !!k.priorityOneEnabled;
    byId('priorityOneProfile').value = k.priorityOneProfile;
    byId('priorityOneButton').value = k.priorityOneButton;
    byId('priorityTwoEnabled').checked = !!k.priorityTwoEnabled;
    byId('priorityTwoProfile').value = k.priorityTwoProfile;
    byId('priorityTwoButton').value = k.priorityTwoButton;
    byId('priorityThreeEnabled').checked = !!k.priorityThreeEnabled;
    byId('priorityThreeProfile').value = k.priorityThreeProfile;
    byId('priorityThreeButton').value = k.priorityThreeButton;
    byId('defaultButton').value = k.defaultButton;
    byId('language').value = localStorage.getItem(LANGUAGE_KEY) || 'en';
  }

  async function applySettings() {
    const profile = readProfileFromUi();
    state.profile = profile;
    saveProfile(state.profileName, profile);
    setStatus(STRINGS.settingsSaved);
    localStorage.setItem(WORKING_KEY, '1');

    if (profile.enable_auto_run) {
      await expandPages(profile);
    } else if (state.expandedRows) {
      location.reload();
      return;
    }

    formatBaseTable();
    applyFiltersToRows(profile);
    highlightTopRow();
    maybeGoNextVillage();
    localStorage.setItem(WORKING_KEY, '0');
    uiInfo(STRINGS.filtered, 1200);
  }

  function resetTable() {
    location.reload();
  }

  function changeProfile(name) {
    state.profileName = name;
    state.profile = loadProfile(name);
    applyProfileToUi(state.profile);
    setStatus(`Profile: ${name}`);
  }

  function createProfile() {
    const name = prompt('New profile name:');
    if (!name) {
      uiError(STRINGS.noProfileName);
      return;
    }

    const clean = name.trim();
    if (!clean) {
      uiError(STRINGS.noProfileName);
      return;
    }

    const list = getProfileList();
    if (list.includes(clean)) {
      uiError(STRINGS.profileExists);
      return;
    }

    saveProfile(clean, readProfileFromUi());
    list.push(clean);
    saveProfileList(list);
    state.profileName = clean;
    populateProfileSelects();
    byId('settingsProfile').value = clean;
    setStatus(`Profile created: ${clean}`);
  }

  function setDefaultProfile() {
    localStorage.setItem(DEFAULT_PROFILE_KEY, state.profileName);
    setStatus(`Default profile: ${state.profileName}`);
  }

  function deleteProfile() {
    if (state.profileName === 'Default') {
      uiError(STRINGS.cannotDeleteDefault);
      return;
    }

    if (!confirm(`Delete profile "${state.profileName}"?`)) return;

    localStorage.removeItem(PROFILE_PREFIX + state.profileName);

    const list = getProfileList().filter(name => name !== state.profileName);
    saveProfileList(list.length ? list : ['Default']);

    state.profileName = loadDefaultProfileName();
    if (!getProfileList().includes(state.profileName)) {
      state.profileName = 'Default';
      localStorage.setItem(DEFAULT_PROFILE_KEY, 'Default');
    }

    populateProfileSelects();
    changeProfile(state.profileName);
    setStatus('Profile deleted.');
  }

  function updateProfile() {
    saveProfile(state.profileName, readProfileFromUi());
    setStatus(`Profile updated: ${state.profileName}`);
  }

  function exportProfile() {
    const profile = readProfileFromUi();
    const text = JSON.stringify({ name: state.profileName, profile }, null, 2);
    prompt('Copy profile JSON:', text);
    setStatus(STRINGS.exported);
  }

  function importProfile() {
    const text = prompt('Paste exported profile JSON:');
    if (!text) return;

    try {
      const parsed = JSON.parse(text);
      const name = prompt('Profile name for import:', parsed.name || 'Imported');
      if (!name) return;

      saveProfile(name, { ...DEFAULT_PROFILE, ...(parsed.profile || parsed) });

      const list = getProfileList();
      if (!list.includes(name)) {
        list.push(name);
        saveProfileList(list);
      }

      populateProfileSelects();
      changeProfile(name);
      setStatus(STRINGS.imported);
    } catch (err) {
      uiError(`Import failed: ${err.message || err}`);
    }
  }

  function updateKeypressSettings() {
    const settings = {
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

    state.keys = settings;
    saveKeySettings(settings);
    setStatus(STRINGS.keySaved);
    return false;
  }

  function setKeyEditMode(mode) {
    state.editMode = mode;
    setStatus(`Press a key for ${mode}...`);
    document.addEventListener('keydown', onKeyDownCapture, true);
    document.addEventListener('keyup', onKeyUpCapture, true);
    return false;
  }

  function onKeyDownCapture(event) {
    if (state.editMode) {
      event.preventDefault();
      event.stopPropagation();

      const keyInfo = normalizeKeyCapture(event);
      if (!keyInfo) {
        uiError(STRINGS.invalidKey);
        return;
      }

      assignKey(state.editMode, keyInfo);
      state.editMode = null;
      saveKeySettings(state.keys);
      applyKeySettingsToUi();
      setStatus(STRINGS.keySaved);
      document.removeEventListener('keydown', onKeyDownCapture, true);
      document.removeEventListener('keyup', onKeyUpCapture, true);
      bindHotkeys();
      return;
    }

    if (shouldIgnoreHotkeys(event)) return;

    const row = getFirstVisibleRow();
    if (!row) {
      uiError(STRINGS.noRows);
      return;
    }

    const key = event.which || event.keyCode;

    if (key === state.keys.left_code) {
      event.preventDefault();
      navigateVillage('p');
      return;
    }

    if (key === state.keys.right_code) {
      event.preventDefault();
      navigateVillage('n');
      return;
    }

    if (key === state.keys.skip_code) {
      event.preventDefault();
      row.style.display = 'none';
      highlightTopRow();
      maybeGoNextVillage();
      return;
    }

    if (key === state.keys.a_code) {
      event.preventDefault();
      triggerRowButton(row, 'A');
      return;
    }

    if (key === state.keys.b_code) {
      event.preventDefault();
      triggerRowButton(row, 'B');
      return;
    }

    if (key === state.keys.c_code) {
      event.preventDefault();
      triggerRowButton(row, 'C');
      return;
    }

    if (key === state.keys.master_code) {
      event.preventDefault();
      triggerMaster(row);
    }
  }

  function onKeyUpCapture(event) {
    if (state.editMode) {
      event.preventDefault();
      event.stopPropagation();
    }
  }

  function normalizeKeyCapture(event) {
    if (/^[A-Za-z0-9]$/.test(event.key)) {
      return { code: event.which || event.keyCode, char: event.key.toUpperCase() };
    }

    if (ALLOWED_CAPTURE_KEYS.has(event.key)) {
      if (event.key === 'ArrowLeft') return { code: 37, char: '←' };
      if (event.key === 'ArrowRight') return { code: 39, char: '→' };
    }

    return null;
  }

  function assignKey(mode, info) {
    const mapping = {
      A: ['a_code', 'a_char'],
      B: ['b_code', 'b_char'],
      C: ['c_code', 'c_char'],
      Master: ['master_code', 'master_char'],
      Skip: ['skip_code', 'skip_char'],
      Left: ['left_code', 'left_char'],
      Right: ['right_code', 'right_char']
    }[mode];

    if (!mapping) return;
    state.keys[mapping[0]] = info.code;
    state.keys[mapping[1]] = info.char;
  }

  function bindHotkeys() {
    document.removeEventListener('keydown', onKeyDownCapture, true);
    document.addEventListener('keydown', onKeyDownCapture, true);
  }

  function shouldIgnoreHotkeys(event) {
    const el = event.target;
    if (!el) return false;
    const tag = (el.tagName || '').toLowerCase();
    return tag === 'input' || tag === 'textarea' || tag === 'select' || el.isContentEditable;
  }

  async function expandPages(profile) {
    const pageCount = detectPageCount();
    const startPage = Math.max(1, sanitizePositive(profile.start_page, 1));
    const endPage = profile.end_page === 'max'
      ? pageCount
      : Math.max(startPage, Math.min(pageCount, sanitizePositive(profile.end_page, pageCount)));

    const table = document.querySelector('#plunder_list');
    if (!table) throw new Error('Loot Assistant table not found.');

    const existingRows = Array.from(table.querySelectorAll('tr'));
    const headerRow = existingRows[0] ? existingRows[0].cloneNode(true) : null;
    const newRows = [];

    setStatus(`${STRINGS.autoRunProgress} ${startPage}/${endPage}`);

    for (let page = startPage - 1; page <= endPage - 1; page++) {
      setStatus(`${STRINGS.autoRunProgress} ${page + 1}/${endPage}`);
      const html = await fetchPageHtml(page, profile.order_by, profile.direction);
      const doc = new DOMParser().parseFromString(html, 'text/html');

      Array.from(doc.querySelectorAll('#plunder_list tr')).forEach((tr, idx) => {
        if (idx === 0) return;
        const clone = tr.cloneNode(true);
        newRows.push(clone);
      });
    }

    table.innerHTML = '';
    if (headerRow) table.appendChild(headerRow);
    newRows.forEach(row => table.appendChild(row));

    const nav = document.querySelector('#plunder_list_nav');
    if (nav) nav.style.display = 'none';

    state.expandedRows = true;
  }

  async function fetchPageHtml(page, orderBy, direction) {
    const url = new URL(window.location.origin + window.game_data.link_base_pure + 'am_farm');
    url.searchParams.set('Farm_page', String(page));
    url.searchParams.set('order', orderBy);
    url.searchParams.set('dir', direction);

    const response = await fetch(url.toString(), { credentials: 'same-origin' });
    if (!response.ok) throw new Error(`Failed to load page ${page + 1} (${response.status})`);
    return response.text();
  }

  function detectPageCount() {
    const nav = document.querySelector('#plunder_list_nav');
    if (!nav) return 1;

    const values = Array.from(nav.querySelectorAll('a, strong, option'))
      .map(el => (el.textContent || '').replace(/[^\d]/g, ''))
      .filter(Boolean)
      .map(Number);

    return values.length ? Math.max(...values) : 1;
  }

  function formatBaseTable() {
    const table = document.querySelector('#plunder_list');
    if (!table) return;

    const rows = getDataRows();

    rows.forEach((row, idx) => {
      row.classList.remove('lae-filtered-out', 'lae-top-row');

      if (!row.dataset.laeFormatted) {
        const firstCell = row.children[0];
        if (firstCell) {
          const numCell = document.createElement('td');
          numCell.style.width = '10px';
          numCell.style.fontWeight = 'bold';
          numCell.className = 'lae_row_num';
          row.insertBefore(numCell, firstCell);
        }
        row.dataset.laeFormatted = '1';
      }

      const numCell = row.querySelector('.lae_row_num');
      if (numCell) numCell.textContent = String(idx + 1);

      const data = parseRowData(row);
      const targetCell = data.cells.targetCell;

      if (targetCell && data.attackCount != null) {
        if (!targetCell.querySelector('.lae-attack-count')) {
          const span = document.createElement('span');
          span.className = 'lae-attack-count';
          span.style.fontWeight = 'bold';
          span.textContent = ` (${data.attackCount})`;
          targetCell.appendChild(span);
        } else {
          targetCell.querySelector('.lae-attack-count').textContent = ` (${data.attackCount})`;
        }
      }

      if (data.coord) row.dataset.targetCoord = data.coord;
    });
  }

  function applyFiltersToRows(profile) {
    const why = byId('lae_why_box');
    why.style.display = 'none';
    why.textContent = '';

    getDataRows().forEach(row => {
      const info = parseRowData(row);
      const result = evaluateRowAgainstProfile(info, profile);

      if (result.hide) {
        row.classList.add('lae-filtered-out');
        row.style.display = 'none';
        row.dataset.laeWhy = result.reasons.join('; ');
      } else {
        row.classList.remove('lae-filtered-out');
        row.style.display = '';
        row.dataset.laeWhy = '';
      }
    });

    getDataRows().forEach(row => {
      row.removeEventListener('mouseenter', onRowEnterShowReason);
      row.addEventListener('mouseenter', onRowEnterShowReason);
      row.removeEventListener('mouseleave', onRowLeaveHideReason);
      row.addEventListener('mouseleave', onRowLeaveHideReason);
    });
  }

  function onRowEnterShowReason(event) {
    const row = event.currentTarget;
    if (!row.dataset.laeWhy) return;
    const why = byId('lae_why_box');
    why.textContent = row.dataset.laeWhy;
    why.style.display = 'block';
  }

  function onRowLeaveHideReason() {
    const why = byId('lae_why_box');
    why.style.display = 'none';
    why.textContent = '';
  }

  function evaluateRowAgainstProfile(info, profile) {
    const reasons = [];

    if (profile.blue && info.reportColor === 'blue') reasons.push('Report is blue');
    if (profile.green && info.reportColor === 'green') reasons.push('Report is green');
    if (profile.yellow && info.reportColor === 'yellow') reasons.push('Report is yellow');
    if (profile.red_yellow && info.reportColor === 'red_yellow') reasons.push('Report is red_yellow');
    if (profile.red_blue && info.reportColor === 'red_blue') reasons.push('Report is red_blue');
    if (profile.red && info.reportColor === 'red') reasons.push('Report is red');

    if (profile.enable_hauls) {
      if (profile.full && info.haulType === 'full') reasons.push('Haul is full');
      if (profile.partial && info.haulType === 'partial') reasons.push('Haul is partial');
      if (profile.full && info.haulType === 'none') reasons.push('No haul graphic');
    }

    if (profile.hide_recent_farms && info.coord) {
      const minutes = getMinutesSinceLastSent(info.coord);
      const limit = sanitizePositive(profile.hide_recent_time, 0);
      if (limit > 0) {
        if (profile.sent_time_filter === 'hide' && minutes < limit) reasons.push(`Village was recently sent to ${minutes} minutes ago`);
        if (profile.sent_time_filter === 'show' && minutes > limit) reasons.push('Village was not recently sent to');
      }
    }

    if (profile.enable_attacks) {
      const value = sanitizePositive(profile.attack_value, 0);
      if (compareNumeric(info.attackCount, profile.attack_operator, value)) reasons.push('Outgoing attacks matched');
    }

    if (profile.enable_walls) {
      const value = sanitizePositive(profile.wall_value, 0);
      if (compareNumeric(info.wall, profile.wall_operator, value)) reasons.push('Wall matched');
    }

    if (profile.enable_distances) {
      const value = parseFloat(profile.distance_value || '0');
      if (compareNumeric(info.distance, profile.distance_operator, value)) reasons.push('Distance matched');
    }

    if (profile.enable_scout) {
      const value = sanitizePositive(profile.haul_value, 0);
      if (compareNumeric(info.scoutResources, profile.scout_report_operator, value)) reasons.push('Scout resources matched');
    }

    if (profile.enable_time) {
      const value = sanitizePositive(profile.time_value, 0);
      if (value > 0 && Number.isFinite(info.minutesSinceAttack)) {
        if (profile.attack_time_filter === 'hide' && info.minutesSinceAttack < value) reasons.push(`Village attacked ${info.minutesSinceAttack} minutes ago`);
        if (profile.attack_time_filter === 'show' && info.minutesSinceAttack > value) reasons.push(`Village attacked ${info.minutesSinceAttack} minutes ago`);
      }
    }

    if (byId('enable_continents').checked) {
      const continents = String(profile.continents_list || '').split('.').map(v => v.trim()).filter(Boolean);
      if (continents.length) {
        const hit = continents.includes(String(info.continent));
        if (profile.continent_display === 'hide' && hit) reasons.push('Continent is set to hide');
        if (profile.continent_display === 'show' && !hit) reasons.push('Continent is not set to show');
      }
    }

    return { hide: reasons.length > 0, reasons };
  }

  function parseRowData(row) {
    const cells = Array.from(row.children).filter(el => el.tagName === 'TD');
    const buttonCells = [];

    cells.forEach((td, idx) => {
      if (td.querySelector('a.farm_icon_a, a.farm_icon_b, a.farm_icon_c')) buttonCells.push(idx);
    });

    const firstButtonIndex = buttonCells.length ? Math.min(...buttonCells) : cells.length - 1;
    const targetCell = findTargetCell(cells);
    const targetIndex = cells.indexOf(targetCell);
    const timeCell = targetIndex >= 0 ? cells[targetIndex + 1] : null;
    const scoutCell = targetIndex >= 0 ? cells[firstButtonIndex - 3] : null;
    const wallCell = targetIndex >= 0 ? cells[firstButtonIndex - 2] : null;
    const distanceCell = targetIndex >= 0 ? cells[firstButtonIndex - 1] : null;

    const targetText = cleanText(targetCell ? targetCell.textContent : '');
    const coordMatch = targetText.match(/(\d+)\|(\d+)/);
    const coord = coordMatch ? `${coordMatch[1]}|${coordMatch[2]}` : '';
    const x = coordMatch ? parseInt(coordMatch[1], 10) : 0;
    const reportImg = row.querySelector('img[src*="graphic/dots/"]');
    const haulImg = row.querySelector('img[src*="graphic/max_loot/"]');
    const reportColorMatch = reportImg ? (reportImg.getAttribute('src') || '').match(/dots\/([a-z_]+)\./) : null;
    const wall = sanitizePositive(wallCell ? wallCell.textContent : '0', 0);
    const distance = parseFloat(String(distanceCell ? distanceCell.textContent : '0').replace(',', '.')) || 0;
    const scoutResources = parseScoutCell(scoutCell);
    const attackCount = parseAttackCount(targetCell);
    const minutesSinceAttack = parseAttackAgeMinutes(timeCell);
    const continent = x ? String(Math.floor(x / 100)) : '';

    return {
      row,
      coord,
      x,
      reportColor: reportColorMatch ? reportColorMatch[1] : 'unknown',
      haulType: !haulImg ? 'none' : /max_loot\/1/.test(haulImg.getAttribute('src') || '') ? 'full' : 'partial',
      attackCount,
      wall,
      distance,
      scoutResources,
      minutesSinceAttack,
      continent,
      cells: { targetCell, timeCell, scoutCell, wallCell, distanceCell }
    };
  }

  function findTargetCell(cells) {
    return cells.find(td => /\d+\|\d+/.test(td.textContent || '')) || cells[3] || null;
  }

  function parseScoutCell(cell) {
    if (!cell) return 0;
    const text = cleanText(cell.textContent);
    if (text === '?' || !text) return 0;
    const nums = text.match(/\d+/g);
    return nums ? nums.map(Number).reduce((a,b) => a+b, 0) : 0;
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

  function parseAttackAgeMinutes(cell) {
    if (!cell) return Infinity;
    const text = cleanText(cell.textContent);
    if (!text) return Infinity;

    const now = getServerDateTime();
    const lower = text.toLowerCase();

    let datePart = null;
    let timePart = null;

    const parts = lower.split(/\s+/);
    for (const part of parts) {
      if (part.includes('.')) datePart = part;
      if (part.includes(':')) timePart = part.replace(/[^\d:]/g, '');
    }

    if (!timePart) return Infinity;

    let year = now.getFullYear();
    let month = now.getMonth();
    let day = now.getDate();

    if (lower.includes('yesterday')) day -= 1;

    if (datePart && !lower.includes('today') && !lower.includes('yesterday')) {
      const dm = datePart.split('.');
      day = parseInt(dm[0], 10);
      month = parseInt(dm[1], 10) - 1;
      if (now.getMonth() === 0 && month === 11) year -= 1;
    }

    const [hh, mm, ss] = timePart.split(':').map(n => parseInt(n, 10));
    const attackDate = new Date(year, month, day, hh || 0, mm || 0, ss || 0, 0);
    return Math.abs(Math.floor((now.getTime() - attackDate.getTime()) / 60000));
  }

  function getServerDateTime() {
    const timeEl = document.getElementById('serverTime');
    const dateEl = document.getElementById('serverDate');
    if (!timeEl || !dateEl) return new Date();

    const [hh, mm, ss] = cleanText(timeEl.textContent).split(':').map(n => parseInt(n, 10));
    const [dd, MM, yyyy] = cleanText(dateEl.textContent).split('/').map(n => parseInt(n, 10));
    return new Date(yyyy, MM - 1, dd, hh || 0, mm || 0, ss || 0, 0);
  }

  function getMinutesSinceLastSent(coord) {
    const key = lastSentKey(coord);
    const ts = parseInt(localStorage.getItem(key) || '0', 10);
    if (!ts) return Infinity;
    return Math.abs(Math.floor((Date.now() - ts) / 60000));
  }

  function lastSentKey(coord) {
    const world = (window.game_data && window.game_data.world) || location.host;
    return `${LAST_SENT_PREFIX}${world}_${coord}`;
  }

  function compareNumeric(actual, operator, expected) {
    const a = Number(actual || 0);
    const e = Number(expected || 0);
    if (operator === 'greater_than') return a > e;
    if (operator === 'less_than') return a < e;
    return a === e;
  }

  function getDataRows() {
    return Array.from(document.querySelectorAll('#plunder_list tr')).filter((tr, idx) => idx > 0);
  }

  function getVisibleRows() {
    return getDataRows().filter(row => row.style.display !== 'none' && !row.classList.contains('lae-filtered-out'));
  }

  function getFirstVisibleRow() {
    return getVisibleRows()[0] || null;
  }

  function highlightTopRow() {
    getDataRows().forEach(row => row.classList.remove('lae-top-row'));
    const first = getFirstVisibleRow();
    if (first) first.classList.add('lae-top-row');
  }

  function triggerRowButton(row, buttonName) {
    if (state.sendingBlocked) return;

    const button = row.querySelector(`a.farm_icon_${buttonName.toLowerCase()}`);
    if (!button || button.classList.contains('farm_icon_disabled') || button.innerHTML == null) {
      uiError(STRINGS.notSelectable, 800);
      row.style.display = 'none';
      highlightTopRow();
      maybeGoNextVillage();
      return;
    }

    const info = parseRowData(row);
    if (info.coord) localStorage.setItem(lastSentKey(info.coord), String(Date.now()));

    button.click();
    state.sendingBlocked = true;
    setTimeout(() => { state.sendingBlocked = false; }, 200);
  }

  function triggerMaster(row) {
    const k = state.keys;
    const profiles = [
      { enabled: k.priorityOneEnabled, profile: loadProfile(k.priorityOneProfile), button: k.priorityOneButton },
      { enabled: k.priorityTwoEnabled, profile: loadProfile(k.priorityTwoProfile), button: k.priorityTwoButton },
      { enabled: k.priorityThreeEnabled, profile: loadProfile(k.priorityThreeProfile), button: k.priorityThreeButton }
    ];

    const info = parseRowData(row);
    let choice = k.defaultButton;

    for (const item of profiles) {
      if (!item.enabled) continue;
      const result = evaluateRowAgainstProfile(info, item.profile);
      if (!result.hide) {
        choice = item.button;
        break;
      }
    }

    if (choice === 'Skip') {
      row.style.display = 'none';
      highlightTopRow();
      maybeGoNextVillage();
      return;
    }

    triggerRowButton(row, choice);
  }

  function maybeGoNextVillage() {
    const profile = readProfileFromUi();
    const units = (window.Accountmanager && window.Accountmanager.farm && window.Accountmanager.farm.current_units) || {};

    if (profile.next_village_scouts) {
      const scoutsLeft = sanitizePositive(profile.scouts_left, 0);
      if (Number(units.spy || 0) <= scoutsLeft) {
        navigateVillage('n');
        return true;
      }
    }

    if (profile.next_village_farming_troops) {
      const threshold = sanitizePositive(profile.farming_troops_left, 0);
      const selectedTotal = getSelectedFarmUnitTotal(units);
      if (selectedTotal <= threshold) {
        navigateVillage('n');
        return true;
      }
    }

    if (profile.next_village_units) {
      const selectedTotal = getSelectedFarmUnitTotal(units);
      if (selectedTotal <= 0) {
        navigateVillage('n');
        return true;
      }
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
      if (name) total += parseInt(units[name] || 0, 10);
    });
    return total;
  }

  function navigateVillage(direction) {
    const url = `https://${location.host}/game.php?village=${direction}${window.game_data.village.id}&screen=am_farm`;
    location.href = url;
  }

  function loadLanguage(lang) {
    localStorage.setItem(LANGUAGE_KEY, lang);
    setStatus(`Language: ${lang}`);
    return false;
  }

  function uglyHider(anchor) {
    const targetId = anchor.getAttribute('data-target');
    const target = targetId ? document.getElementById(targetId) : null;
    if (!target) return false;

    const isHidden = target.style.display === 'none';
    target.style.display = isHidden ? '' : 'none';
    anchor.textContent = isHidden
      ? (anchor.getAttribute('data-open') || '-')
      : (anchor.getAttribute('data-closed') || '+');

    return false;
  }

  function byId(id) {
    return document.getElementById(id);
  }

  function sanitizePositive(value, fallback) {
    const n = parseInt(String(value || '').replace(/[^\d-]/g, ''), 10);
    return Number.isFinite(n) && n >= 0 ? n : fallback;
  }

  function cleanText(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function setStatus(text) {
    const el = byId('lae_status');
    if (el) el.textContent = text;
  }

  function uiInfo(msg, timeout) {
    if (window.UI && typeof UI.InfoMessage === 'function') UI.InfoMessage(msg, timeout || 1500);
    setStatus(msg);
  }

  function uiError(msg, timeout) {
    if (window.UI && typeof UI.ErrorMessage === 'function') UI.ErrorMessage(msg, timeout || 2000);
    setStatus(msg);
  }
})();