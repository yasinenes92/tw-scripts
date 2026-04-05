var _____WB$wombat$assign$function_____ = function(name) {return (self._wb_wombat && self._wb_wombat.local_init && self._wb_wombat.local_init(name)) || self[name]; };
if (!self.__WB_pmw) { self.__WB_pmw = function(obj) { this.__WB_source = obj; return this; } }
{
  let window = _____WB$wombat$assign$function_____("window");
  let self = _____WB$wombat$assign$function_____("self");
  let document = _____WB$wombat$assign$function_____("document");
  let location = _____WB$wombat$assign$function_____("location");
  let top = _____WB$wombat$assign$function_____("top");
  let parent = _____WB$wombat$assign$function_____("parent");
  let frames = _____WB$wombat$assign$function_____("frames");
  let opener = _____WB$wombat$assign$function_____("opener");

var version = "3.0.0";
var scriptName = "Yaver LA (3.0.0)";
var scriptURL = "https://cdn.jsdelivr.net/gh/yasinenes92/tw-scripts@main/Yaver-LA/";
var updateNotesURL = "https://github.com/yasinenes92/tw-scripts";
var working = true;
var resourcesLoaded = false;
var scriptLoaded = false;
var pagesLoaded = false;
var filtersApplied = false;
var cansend = true;
var keySetMode = false;
var hideRow = false;
var editingKey = false;
var troubleshoot = false;
var clearProfiles = false;
var reason = [];
var keyToEdit;
var current_units;
var currentGameTime = getCurrentGameTime();
var sitter = "";
if (window.top.game_data.player.sitter != "0") {
    sitter = "t=" + window.top.game_data.player.id + "&";
}
var link = ["https://" + window.location.host + "/game.php?" + sitter + "village=", "&screen=am_farm"];


var userset;
var settingsIndexMap = {
    start_page: 0,
    end_page: 1,
    order_by: 2,
    direction: 3,
    all_none: 4,
    blue: 5,
    green: 6,
    yellow: 7,
    red_yellow: 8,
    red_blue: 9,
    red: 10,
    hide_recent_farms: 11,
    sent_time_filter: 12,
    hide_recent_time: 13,
    enable_hauls: 14,
    full: 15,
    partial: 16,
    enable_attacks: 17,
    attack_operator: 18,
    attack_value: 19,
    enable_walls: 20,
    wall_operator: 21,
    wall_value: 22,
    enable_distances: 23,
    distance_operator: 24,
    distance_value: 25,
    enable_scout: 26,
    scout_report_operator: 27,
    haul_value: 28,
    continent_display: 29,
    continents_list: 30,
    enable_time: 31,
    attack_time_filter: 32,
    time_value: 33,
    enable_auto_run: 34,
    next_village_no_farms: 35,
    next_village_scouts: 36,
    scouts_left: 37,
    next_village_farming_troops: 38,
    farming_troops_left: 39,
    next_village_units: 40
};
var keycodes = {"a": 74, "b": 75, "c": 76, "skip": 88, "right": 69, "left": 81, "master": 71};
var keyPressSettings = {
    "a_code": 74,
    "a_char": "J",
    "b_code": 75,
    "b_char": "K",
    "c_code": 76,
    "c_char": "L",
    "master_code": 71,
    "master_char": "G",
    "skip_code": 88,
    "skip_char": "X",
    "left_code": 81,
    "left_char": "Q",
    "right_code": 69,
    "right_char": "E",
    "priorityOneEnabled": true,
    "priorityOneProfile": "Default",
    "priorityOneButton": "Skip",
    "priorityTwoEnabled": true,
    "priorityTwoProfile": "Default",
    "priorityTwoButton": "Skip",
    "priorityThreeEnabled": true,
    "priorityThreeProfile": "Default",
    "priorityThreeButton": "Skip",
    "defaultButton": "Skip"
};
var availableLangs = ["en"];
var filter_04, filter_05, filter_06, filter_07, filter_08, filter_09, filter_10, filter_11, filter_12, filter_13,
    filter_14, filter_15, filter_16, filter_17, filter_18, filter_19, filter_20, filter_21, filter_22, filter_23,
    filter_24, filter_25, filter_26, filter_30, filter_31, filter_32, filter_33, filter_34, filter_35, filter_36,
    filter_37, filter_38, filter_39, filter_40, filter_41, filter_42, filter_43, filter_44, filter_45, filter_46,
    filter_47, filter_48, filter_49, filter_50, filter_51, filter_52, filter_53, filter_54, filter_55, filter_56,
    filter_57, filter_58, filter_59, filter_60, filter_61, filter_62,
    dialog_02, dialog_03, dialog_04, dialog_05, dialog_06, dialog_07, dialog_08, dialog_09A, dialog_09B, dialog_09C,
    dialog_10, dialog_11, dialog_12,
    profile_01, profile_02, profile_03, profile_04, profile_05, profile_06, profile_07, profile_08, profile_09, profile_10,
    instructions_01, instructions_02, instructions_03, instructions_04, instructions_05;
var inlineStyles = "#settingsDiv .settingsTable{width:100%;border-collapse:separate;border-spacing:0;}\
#settingsDiv .settingsTable td,#settingsDiv .settingsTable th{vertical-align:top;}\
#settingsDiv .settingsTable .col1{white-space:nowrap;}\
#settingsDiv .hotkey_values td{text-align:center;padding:2px 4px;}\
#settingsDiv .hotkey_value{width:38px;text-align:center;}\
#settingsDiv input[type='text']{box-sizing:border-box;}\
#settingsDiv .btn{cursor:pointer;}\
#settingsDiv h4 a{font-weight:normal;}\
#settingsDiv select,#settingsDiv input{max-width:100%;}";
var builtinLanguageResources = {
    en: {
        filter_04: "Start page",
        filter_05: "End page",
        filter_06: "Report filters",
        filter_07: "Include report colors",
        filter_08: "Blue",
        filter_09: "Green",
        filter_10: "Yellow",
        filter_11: "Red/Yellow",
        filter_12: "Red/Blue",
        filter_13: "Red",
        filter_14: "Order by",
        filter_15: "Distance",
        filter_16: "Date",
        filter_17: "Direction",
        filter_18: "Ascending",
        filter_19: "Descending",
        filter_20: "Hauls",
        filter_21: "Full",
        filter_22: "Partial",
        filter_23: "Outgoing attacks",
        filter_24: "Greater than",
        filter_25: "Less than",
        filter_26: "Equal to",
        filter_30: "Walls",
        filter_31: "Distance",
        filter_32: "Hide",
        filter_33: "Show",
        filter_34: "Continents",
        filter_35: "Scouted loot",
        filter_36: "Reports newer than",
        filter_37: "hours",
        filter_38: "Enable auto run",
        filter_39: "Next village if no farms remain",
        filter_40: "Loot Assistant",
        filter_41: "Loading page",
        filter_42: "Language",
        filter_43: "Village conditions",
        filter_44: "Next village if total units are low",
        filter_45: "Next village if scouts are below",
        filter_46: "Next village if farming troops are below",
        filter_47: "Hide recently farmed for",
        filter_48: "minutes",
        filter_49: "Hotkeys",
        filter_50: "Master hotkey priorities",
        filter_51: "Hide the first visible row",
        filter_52: "Previous village",
        filter_53: "Next village",
        filter_54: "If profile",
        filter_55: "then use",
        filter_56: "Skip",
        filter_57: "A",
        filter_58: "B",
        filter_59: "C",
        filter_60: "Otherwise use",
        filter_61: "today",
        filter_62: "yesterday",
        dialog_02: "The default profile cannot be overwritten directly. Create a new profile first?",
        dialog_03: "Enter a profile name",
        dialog_04: "A profile with that name already exists.",
        dialog_05: "Profile name cannot be empty.",
        dialog_06: "The default profile cannot be deleted.",
        dialog_07: "The default profile cannot be exported. Export a custom profile instead.",
        dialog_08: "Copy this export string",
        dialog_09A: "Profile '",
        dialog_09B: "' export string: ",
        dialog_09C: "",
        dialog_10: "Paste an exported profile string",
        dialog_11: "ProfileName,1,1,distance,asc,false,false,false",
        dialog_12: "A profile with that name already exists.",
        profile_01: "Profile",
        profile_02: "Apply",
        profile_03: "Reset",
        profile_04: "Create",
        profile_05: "Set Default",
        profile_06: "Delete",
        profile_07: "Update",
        profile_08: "Export",
        profile_09: "Import",
        profile_10: "Default",
        instructions_01: "Choose which report colors stay visible after filtering.",
        instructions_02: "Enable the filters you want to apply to the Loot Assistant rows.",
        instructions_03: "Show or hide only the continents you list here, separated by commas.",
        instructions_04: "Hide villages that were recently farmed by this script for the selected number of minutes.",
        instructions_05: "Profiles save and restore the full filter configuration and hotkey priority setup."
    }
};
var smartConfig = {
    enter_keycode: 13,
    light_capacity: 80,
    dispatch_interval_ms: 250,
    success_window_minutes: 10,
    minimum_strict_source_rows: 2,
    maximum_table_diagnostics: 8
};
var smartState = {
    isHoldingEnter: false,
    isRunning: false,
    stopRequested: false,
    stopReason: "",
    planningInProgress: false,
    executionInProgress: false,
    lastStopPhase: "",
    lastExecutionStopStage: "",
    globalKeyupBound: false,
    startTimerId: null,
    skipAutoRunOnce: false,
    pendingVillageSwitch: null,
    planningReservations: {},
    targetReservations: {},
    queuedPairs: {},
    sentLedger: {},
    inFlightJobs: {},
    originalVillageId: null,
    originalVillageName: null,
    originalFiltersApplied: false,
    lastPlan: null,
    runSerial: 0
};
function ensureStorageAdapter() {
    if (window.top.$.jStorage && typeof window.top.$.jStorage.get === "function" && typeof window.top.$.jStorage.set === "function") {
        return;
    }
    var prefix = "yaver_la:";
    var memoryStore = {};
    function hasLocalStorage() {
        try {
            var testKey = prefix + "__test__";
            window.top.localStorage.setItem(testKey, "1");
            window.top.localStorage.removeItem(testKey);
            return true;
        } catch (error) {
            return false;
        }
    }
    var useLocalStorage = hasLocalStorage();
    function readRaw(key) {
        if (useLocalStorage) {
            var names = [prefix + key, key];
            for (var i = 0; i < names.length; i++) {
                var value = window.top.localStorage.getItem(names[i]);
                if (value !== null) {
                    return value;
                }
            }
            return null;
        }
        if (Object.prototype.hasOwnProperty.call(memoryStore, key)) {
            return memoryStore[key];
        }
        return null;
    }
    function writeRaw(key, value) {
        if (useLocalStorage) {
            window.top.localStorage.setItem(prefix + key, value);
            return;
        }
        memoryStore[key] = value;
    }
    function deleteRaw(key) {
        if (useLocalStorage) {
            window.top.localStorage.removeItem(prefix + key);
            window.top.localStorage.removeItem(key);
            return;
        }
        delete memoryStore[key];
    }
    window.top.$.jStorage = {
        get: function (key, defaultValue) {
            var raw = readRaw(key);
            if (raw === null) {
                return typeof defaultValue === "undefined" ? null : defaultValue;
            }
            try {
                return JSON.parse(raw);
            } catch (error) {
                return typeof defaultValue === "undefined" ? raw : defaultValue;
            }
        },
        set: function (key, value) {
            writeRaw(key, JSON.stringify(value));
            return value;
        },
        deleteKey: function (key) {
            deleteRaw(key);
        }
    };
}
function ensureNotificationFallbacks() {
    if (typeof window.top.showNotification !== "function") {
        window.top.showNotification = function (type, messages, title) {
            var text = Array.isArray(messages) ? messages.join(" ") : String(messages || "");
            var prefix = title ? title + ": " : "";
            if (window.top.UI && typeof window.top.UI.ErrorMessage === "function" && type === "custom") {
                window.top.UI.ErrorMessage(prefix + text, 3500);
                return;
            }
            console.log(scriptName + " Notification: " + prefix + text);
        };
    }
}
function applyBuiltinLanguage(lang) {
    var resolvedLang = builtinLanguageResources[lang] ? lang : "en";
    var resources = builtinLanguageResources[resolvedLang];
    window.top.$.each(resources, function (key, value) {
        window[key] = value;
    });
    window.top.$.jStorage.set("language", resolvedLang);
    resourcesLoaded = true;
}
function ensureInlineStyles() {
    if (window.top.document.getElementById("yaver-la-inline-style")) {
        return;
    }
    var styleTag = window.top.document.createElement("style");
    styleTag.id = "yaver-la-inline-style";
    styleTag.type = "text/css";
    styleTag.appendChild(window.top.document.createTextNode(inlineStyles));
    window.top.document.head.appendChild(styleTag);
}
function bootstrapSelfContainedRelease() {
    if (!window.top.$) {
        console.error(scriptName + ": jQuery is required on the Tribal Wars page.");
        return;
    }
    ensureStorageAdapter();
    ensureNotificationFallbacks();
    ensureInlineStyles();
    if (window.top.$.jStorage.get("language") == null) {
        setDefaultLanguage();
    }
    applyBuiltinLanguage(window.top.$.jStorage.get("language"));
    scriptLoaded = true;
    smartInstallDebugSurface();
    smartLog("Self-contained bootstrap ready.");
    checkPage();
}
bootstrapSelfContainedRelease();
function run() {
    console.log("run");
    checkVersion();
    checkWorking();
    setVersion();
    makeItPretty();
    showSettings();
    turnOnHotkeys();
    hotkeysOnOff();
    smartBindGlobalKeyup();
    if (userset[settingsIndexMap.enable_auto_run] != false && !smartConsumeSkipAutoRun()) {
        applySettings();
    }
    smartResolvePendingVillageSwitch();
}
function checkVersion() {
    var storedVersion = getVersion();
    if (storedVersion != version) {
        console.log(scriptName + ": legacy update dialog suppressed for version change " + storedVersion + " -> " + version + ".");
    }
}
function checkWorking() {
    var acknowledged = window.top.$.jStorage.get("working");
    if (acknowledged == null) {
        acknowledged = true;
    }
    if (getVersion() != version) {
        acknowledged = true;
    }
    if (working == false || acknowledged == false) {
        console.log(scriptName + ": legacy working warning suppressed.");
    }
    window.top.$.jStorage.set("working", true);
}
function setVersion() {
    window.top.$.jStorage.set("version", version);
}
function getVersion() {
    var ver = window.top.$.jStorage.get("version");
    if (ver == undefined) {
        setVersion();
        return version;
    }
    return ver;
}
function showAllRows() {
    var pages = window.top.$.trim(window.top.$('#plunder_list_nav tr:first td:last').children().last().html().replace(/\D+/g, ''));
    if (window.top.$('#end_page').val() == "max") {
        window.top.$('#end_page').text(pages);
    }
    window.top.$('#am_widget_Farm tr:last').remove();
    if (pages > parseInt(window.top.$('#end_page').val(), 10)) {
        pages = parseInt(window.top.$('#end_page').val(), 10);
    }
    setTimeout(function () {
        getPage((parseInt(window.top.$('#start_page').val(), 10) - 1), pages);
    }, 1);
}
function getPage(i, pages) {
    if (i < pages) {
        changeHeader(filter_41 + " " + (i + 1) + "/" + pages + " <img src='graphic/throbber.gif' height='24' width='24'></img>");
        var url = link[0] + window.top.game_data.village.id + "&order=" + userset[settingsIndexMap.order_by] + "&dir=" + userset[settingsIndexMap.direction] + "&Farm_page=" + i + "&screen=am_farm";
        window.top.$.ajax({
            type: 'GET', url: url, dataType: "html", error: function (xhr, statusText, error) {
                console.log("Get page failed with error: " + error);
            }, success: function (data) {
                window.top.$('#plunder_list tr', data).slice(2).each(function () {
                    window.top.$('#plunder_list tr:last').after("<tr>" + window.top.$(this).html() + "</tr>");
                });
                setTimeout(function () {
                    getPage(i + 1, pages);
                }, 1);
            }
        });
    } else {
        setTimeout(function () {
            addTableInfo();
            applyFilters();
            changeHeader(filter_40);
            highlightRows();
        }, 1);
        window.top.$('#plunder_list').show();
        window.top.Accountmanager.initTooltips();
        pagesLoaded = true;
        cansend = true;
    }
}
function changeHeader(string) {
    window.top.$("h3:first").html(string);
}
function highlightRows() {
    window.top.$('#am_widget_Farm table').each(function () {
        window.top.$('tr:even:gt(0) td', this).not("table:first").css("backgroundColor", "#FFF5DA");
        window.top.$('tr:odd:gt(0) td', this).not("table:first").css("backgroundColor", "#F0E2BE");
    });
}
function getNewVillage(way) {
    //console.log(getNewVillage);
    if (way == "n")
        window.top.UI.InfoMessage('Switching to next village...', 500); else
        window.top.UI.InfoMessage('Switching to previous village...', 500);
    window.onkeydown = function () {
    };
    cansend = false;
    filtersApplied = false;
    Timing.pause();
    fadeThanksToCheese();
    openLoader();
    var vlink = link[0] + way + window.top.game_data.village.id + link[1];
    window.top.$.ajax({
        type: "GET", url: vlink, dataType: "html", error: function (xhr, statusText) {
            alert("Error: " + statusText);
            window.top.$('#fader').remove();
            window.top.$('#loaders').remove();
        }, success: function (data) {
            var v = window.top.$(data);
            var titlePat = /<\s*title\s*>([^<]+)<\/title\s*>/g;
            var titleMatch = titlePat.exec(data);
            var title = titleMatch[1];
            var newGameData = window.top.$.parseJSON(data.split("TribalWars.updateGameData(")[1].split(");")[0]);
            window.top.game_data = newGameData;
            if (typeof history !== 'undefined' && typeof history.pushState === 'function') {
                history.pushState({}, window.top.game_data.village.name + " - Loot Assistant", "https://" + window.top.location.host + game_data.link_base_pure + 'am_farm');
            }
            window.top.$('#header_info').html(window.top.$('#header_info', v).html());
            window.top.$('#topContainer').html(window.top.$('#topContainer', v).html());
            window.top.$('#contentContainer').html(window.top.$('#contentContainer', v).html());
            window.top.$('#quickbar_inner').html(window.top.$('#quickbar_inner', v).html());
            window.top.$('head').find('title').html(title);
            window.top.$('#fader').remove();
            window.top.$('#loaders').remove();
            Timing.resetTickHandlers();
            Timing.pause();
            pagesLoaded = false;
            cansend = false;
            run();
        }
    });
}
function showSettings() {
    ensureInlineStyles();
	window.top.$("#contentContainer h3").eq(0).after(window.top.$("<div class='vis'id='settingsDiv'><table class='settingsTable'><thead><tr><th colspan='5'class='vis'style='padding:0px;'><h4> " + scriptName + " - " + filter_42 + ": <select id='language'style='margin:0px;'onchange='loadLanguage(window.top.$(&quot;#language&quot;).val())'></select><span style='font-size:10px;float:right;font-weight:normal;font-style:normal'>Updated by <a href='https://www.twstats.com/en1/index.php?page=player&id=315027'target='_blank'>controleng</a>&nbsp;<div class='vis'style='float:right;text-align:center;line-height:100%;width:12px;height:12px;margin:0px 0px 0px 0px;position:relative;background-color:tan;opacity:.7'><a href='#'num='2'onclick='uglyHider(window.top.$(this));return false;'>-</a></div></span></h4></th></tr></thead><tbody id='settingsBody'><tr><td class='col1'style='min-width:200px'><span>" + filter_04 + "</span>&nbsp;<input type='text'value=''size='2'maxlength='3'id='start_page'>&nbsp;<span>" + filter_05 + "</span>&nbsp;<input type='text'value=''size='2'maxlength='3'id='end_page'></td><td colspan='3'><span style='font-weight:bold'>" + filter_06 + "</span>&nbsp;<img src='graphic/questionmark.png'width='13'height='13'id='enable_help'></td><td rowspan='5'valign='top'><form><input type='checkbox'id='all_none'>&nbsp;<label for='all_none'style='font-weight:bold'>" + filter_07 + "</label>&nbsp;<img src='graphic/questionmark.png'width='13'height='13'id='report_help'><br><input type='checkbox'id='blue'><label for='blue'><img src='graphic/dots/blue.png'>&nbsp;" + filter_08 + "</label><br><input type='checkbox'id='green'><label for='green'><img src='graphic/dots/green.png'>&nbsp;" + filter_09 + "</label><br><input type='checkbox'id='yellow'><label for='yellow'><img src='graphic/dots/yellow.png'>&nbsp;" + filter_10 + "</label><br><input type='checkbox'id='red_yellow'><label for='red_yellow'><img src='graphic/dots/red_yellow.png'>&nbsp;" + filter_11 + "</label><br><input type='checkbox'id='red_blue'><label for='red_blue'><img src='graphic/dots/red_blue.png'>&nbsp;" + filter_12 + "</label><br><input type='checkbox'id='red'><label for='red'><img src='graphic/dots/red.png'>&nbsp;" + filter_13 + "</label></form></td></tr><tr><td rowspan='2'><label for='order_by'>" + filter_14 + ":</label>&nbsp;<select id='order_by'val='distance'><option value='distance'>" + filter_15 + "</option><option value='date'>" + filter_16 + "</option></select><br><label for='direction'>" + filter_17 + ":</label>&nbsp;<select id='direction'val='desc'><option value='asc'>" + filter_18 + "</option><option value='desc'>" + filter_19 + "</option></select></td><td style='width:26px'><input type='checkbox'id='enable_hauls'></td><td style='width:110px'><label for='enable_hauls'>" + filter_20 + "</label></td><td><input type='radio'name='hauls'id='full'><label for='full'><img src='graphic/max_loot/1.png'>" + filter_21 + "</label>&nbsp;<input type='radio'name='hauls'id='partial'><label for='partial'><img src='graphic/max_loot/0.png'>" + filter_22 + "</label></td></tr><tr><td><input type='checkbox'id='enable_attacks'></td><td><label for='enable_attacks'>" + filter_23 + "</label></td><td><select id='attack_operator'><option value='greater_than'>" + filter_24 + "</option><option value='less_than'>" + filter_25 + "</option><option value='equal_to'>" + filter_26 + "</option></select>&nbsp;<input type='text'id='attack_value'size='2'maxlength='2'value=''></td></tr><tr><td rowspan='1'><span style='font-weight:bold;'>" + filter_43 + "</span></td><td><input type='checkbox'id='enable_walls'></td><td><label for='enable_walls'>" + filter_30 + "</label></td><td><select id='wall_operator'><option value='greater_than'>" + filter_24 + "</option><option value='less_than'>" + filter_25 + "</option><option value='equal_to'>" + filter_26 + "</option></select>&nbsp;<input type='text'id='wall_value'size='2'maxlength='2'value=''></td></tr><tr><td><input type='checkbox'id='next_village_no_farms'><label for='next_village_no_farms'>" + filter_39 + "</label></td><td><input type='checkbox'id='enable_distances'></td><td><label for='enable_distances'>" + filter_31 + "</label></td><td><select id='distance_operator'val='greater_than'><option value='greater_than'>" + filter_24 + "</option><option value='less_than'>" + filter_25 + "</option><option value='equal_to'>" + filter_26 + "</option></select>&nbsp;<input type='text'id='distance_value'size='2'maxlength='2'value=''></td></tr><tr><td><input type='checkbox' id='next_village_units' />" + filter_44 + "</td><td><input type='checkbox' id='enable_continents' /><td colspan='3'><select id='continent_display'><option value='hide'>" + filter_32 + "</option><option value='show'>" + filter_33 + "</option></select>&nbsp;<label for='continents_list'>" + filter_34 + "</label>&nbsp;<input type='text'size='2'maxlength='150'id='continents_list'value=''>&nbsp;<img src='graphic/questionmark.png'height='13'id='continent_help'></td></tr><tr><td><input type='checkbox' id='next_village_scouts' /><input type='text' size='2' id='scouts_left' /> " + filter_45 + "</td><td><input type='checkbox'id='enable_scout'></td><td colspan='3'><label for='enable_scout'>" + filter_35 + "</label>&nbsp;<select id='scout_report_operator'val='greater_than'><option value='greater_than'>" + filter_24 + "</option><option value='less_than'>" + filter_25 + "</option><option value='equal_to'>" + filter_26 + "</option></select>&nbsp;<input type='text'id='haul_value'size='9'maxlength='7'value=''></td></tr><tr><td><input type='checkbox' id='next_village_farming_troops' /><input type='text' size='2' id='farming_troops_left' /> " + filter_46 + "</td><td><input type='checkbox'id='enable_time'></td><td colspan='3'><select id='attack_time_filter'val='hide'><option value='hide'>" + filter_32 + "</option><option value='show'>" + filter_33 + "</option></select>&nbsp;<label for='enable_time'>" + filter_36 + "</label>&nbsp;<input type='text'id='time_value'size='2'maxlength='4'value=''><span>" + filter_37 + "</span></td></tr><tr><td><input type='checkbox'id='enable_auto_run'><label for='enable_autoRun'>" + filter_38 + "</label></td><td><input type='checkbox' id='hide_recent_farms' /></td><td colspan='3'><select id='sent_time_filter'val='hide'><option value='hide'>" + filter_32 + "</option><option value='show'>" + filter_33 + "</option></select>&nbsp;" + filter_47 + " <input type='text' size='2' id='hide_recent_time' /> " + filter_48 + "</td></tr><tr><th>" + filter_49 + "</th><th colspan='4'>" + filter_50 + "</th></tr><tr><td rowspan='4'><table><tr class='hotkey_values'><td><a href='#'onclick='return setKeyEditMode(\"A\")'id='button_a'class='farm_icon farm_icon_a'></a></td><td><a href='#'onclick='return setKeyEditMode(\"B\")'id='button_b'class='farm_icon farm_icon_b'></a></td><td><a href='#'onclick='return setKeyEditMode(\"C\")'id='button_c'class='farm_icon farm_icon_c'></a></td><td><a href='#'onclick='return setKeyEditMode(\"Master\")'id='button_master'class='farm_icon farm_icon_m'></a></td></tr><tr class='hotkey_values'><td><input type='text'class='hotkey_value' READONLY id='hotkey_value_a'value='A'></td><td><input type='text'class='hotkey_value' READONLY id='hotkey_value_b'value='B'></td><td><input type='text'class='hotkey_value' READONLY id='hotkey_value_c'value='C'></td><td><input type='text'class='hotkey_value' READONLY id='hotkey_value_master'value='M'></td></tr><tr class='hotkey_values'><td colspan='2'><input class='btn tooltip'onclick='return setKeyEditMode(\"Skip\")'type='button'value='Skip'style='margin:0px 0px 0px 0px'title='" + filter_51 + "'></td><td><input class='btn tooltip'onclick='return setKeyEditMode(\"Left\")'type='button'value='&#8592;'style='margin:0px 0px 0px 0px'title='" + filter_52 + "'></td><td><input class='btn tooltip'type='button'onclick='return setKeyEditMode(\"Right\")'value='&#8594;'style='margin:0px 0px 0px 0px'title='" + filter_53 + "'></td></tr><tr class='hotkey_values'><td colspan='2'><input type='text'class='hotkey_value' READONLY id='hotkey_value_skip'value='S'></td><td><input type='text'class='hotkey_value' READONLY id='hotkey_value_left'value='&#8592;'></td><td><input type='text'class='hotkey_value' READONLY id='hotkey_value_right'value='&#8594;'></td></tr></table></td><td><input type='checkbox' onchange='return updateKeypressSettings();' id='priorityOneEnabled'/></td><td colspan='3'>" + filter_54 + " <select id='priorityOneProfile' onchange='return updateKeypressSettings();'></select> " + filter_55 + " <select id='priorityOneButton' onchange='return updateKeypressSettings();'><option val='" + filter_56 + "'>" + filter_56 + "</option><option val='" + filter_57 + "'>" + filter_57 + "</option><option val='" + filter_58 + "'>" + filter_58 + "</option><option val='" + filter_59 + "'>" + filter_59 + "</option></select></td></tr><tr><td><input type='checkbox' onchange='return updateKeypressSettings();' id='priorityTwoEnabled'/></td><td colspan='3'>" + filter_54 + " <select id='priorityTwoProfile' onchange='return updateKeypressSettings();'></select> " + filter_55 + " <select id='priorityTwoButton' onchange='return updateKeypressSettings();'><option val='" + filter_56 + "'>" + filter_56 + "</option><option val='" + filter_57 + "'>" + filter_57 + "</option><option val='" + filter_58 + "'>" + filter_58 + "</option><option val='" + filter_59 + "'>" + filter_59 + "</option></select></td></tr><tr><td><input type='checkbox' onchange='return updateKeypressSettings();' id='priorityThreeEnabled'/></td><td colspan='3'>" + filter_54 + " <select id='priorityThreeProfile' onchange='return updateKeypressSettings();'></select> " + filter_55 + " <select id='priorityThreeButton' onchange='return updateKeypressSettings();'><option val='" + filter_56 + "'>" + filter_56 + "</option><option val='" + filter_57 + "'>" + filter_57 + "</option><option val='" + filter_58 + "'>" + filter_58 + "</option><option val='" + filter_59 + "'>" + filter_59 + "</option></select></td></tr><tr><td colspan='4'>" + filter_60 + " <select id='defaultButton' onchange='return updateKeypressSettings();'><option val='" + filter_56 + "'>" + filter_56 + "</option><option val='" + filter_57 + "'>" + filter_57 + "</option><option val='" + filter_58 + "'>" + filter_58 + "</option><option val='" + filter_59 + "'>" + filter_59 + "</option></select></td></tr><tr><td colspan='5'><div style='float:left'><input type='submit'value='" + profile_02 + "'onclick='applySettings()'>&nbsp;<input type='submit'value='" + profile_03 + "'onclick='resetTable()'></div><div style='float:right'><img src='graphic/questionmark.png'width='13'height='13'id='profile_help'>&nbsp;<label for='settingsProfile'>" + profile_01 + ":</label>&nbsp;<select id='settingsProfile'onchange='changeProfile(window.top.$(&quot;#settingsProfile&quot;).val())'></select>&nbsp;<input type='submit'value='" + profile_04 + "'onclick='createProfile()'>&nbsp;<input type='submit'value='" + profile_05 + "'onclick='setDefaultProfile()'>&nbsp;<input type='submit'value='" + profile_06 + "'onclick='deleteProfile()'>&nbsp;<input type='submit'value='" + profile_07 + "'onclick='updateProfile()'>&nbsp;<input type='submit'value='" + profile_08 + "'onclick='exportProfile()'>&nbsp;<input type='submit'value='" + profile_09 + "'onclick='importProfile()'></div></td></tr></tbody></table></div>"));
    formatSettings();
    addLanguages();
    window.top.$("#language option[value='" + window.top.$.jStorage.get("language") + "']").attr("selected", "selected");
}
function formatSettings() {
    window.top.$("#all_none").bind("click", function () {
        window.top.$(this).closest('form').find(':checkbox').prop('checked', this.checked);
    });
    var reportHelp = window.top.$('#report_help');
    reportHelp.attr('title', instructions_01);
    window.top.UI.ToolTip(reportHelp);
    var enableHelp = window.top.$('#enable_help');
    enableHelp.attr('title', instructions_02);
    window.top.UI.ToolTip(enableHelp);
    var continentHelp = window.top.$('#continent_help');
    continentHelp.attr('title', instructions_03);
    window.top.UI.ToolTip(continentHelp);
    var recentHelp = window.top.$('#recent_help');
    recentHelp.attr('title', instructions_04);
    window.top.UI.ToolTip(recentHelp);
    var profileHelp = window.top.$('#profile_help');
    profileHelp.attr('title', instructions_05);
    window.top.UI.ToolTip(profileHelp);
    loadDefaultProfile();
    fillProfileList();
    fillMasterSettings();
    fillKeypressSettings();
}
function removeFirstPage() {
    window.top.$('#plunder_list tr:gt(0)').remove();
    window.top.$('#plunder_list_nav').hide();
}
function customSendUnits(link, target_village, template_id, button) {
    if (!checkIfNextVillage()) {
        button.closest("tr").hide();
        link = window.top.$(link);
        if (link.hasClass('farm_icon_disabled'))return false;
        var data = {target: target_village, template_id: template_id, source: window.top.game_data.village.id};
        window.top.$.post(window.top.Accountmanager.send_units_link, data, function (data) {
            if (data.error) {
                if (userset[settingsIndexMap.next_village_units] && data.error === "Not enough units available") {
                    if (cansend && filtersApplied)
                        getNewVillage("n");
                    return false;
                } else {
                    window.top.UI.ErrorMessage(data.error);
                    button.closest("tr").show();
                }
            } else {
                setLocalStorageRow(target_village);
                if (typeof window.top.$(button).prop('tooltipText') != 'undefined') {
                    var buttext = window.top.$(button).prop('tooltipText');
                }
                var yolo = window.top.$('<div></div>').append(window.top.$(buttext));
                var bolo = window.top.$(yolo).find('img[src*="res.png"]').eq(0).attr('src');
                var sep1 = buttext.split(/<br\s*?\/?>/ig);
                sep1.splice(sep1.length - 2, 1);
                window.top.UI.SuccessMessage(sep1.join(" "), 100);
                window.top.Accountmanager.farm.updateOwnUnitsAvailable(data.current_units);
            }
        }, 'json');
        return false
    }
}
function customSendUnitsFromReport(link, target_village, report_id, button) {
    if (!checkIfNextVillage()) {
        button.closest("tr").hide();
        link = window.top.$(link);
        if (link.hasClass('farm_icon_disabled'))return false;
        var data = {report_id: report_id};
        window.top.$.post(window.top.Accountmanager.send_units_link_from_report, data, function (data) {
            if (data.error) {
                if (userset[settingsIndexMap.next_village_units] && data.error === "Not enough units available") {
                    if (cansend && filtersApplied)
                        getNewVillage("n");
                    return false;
                } else {
                    window.top.UI.ErrorMessage(data.error);
                    button.closest("tr").show();
                }
            } else {
                setLocalStorageRow(target_village);
                if (typeof data.success === 'string') {
                    if (typeof window.top.$(button).prop('tooltipText') != 'undefined') {
                        var buttext = window.top.$(button).prop('tooltipText');
                    }
                    var yolo = window.top.$('<div></div>').append(window.top.$(buttext));
                    var bolo = window.top.$(yolo).find('img[src*="res.png"]').eq(0).attr('src');
                    var sep1 = buttext.split(/<br\s*?\/?>/ig);
                    sep1.splice(sep1.length - 2, 1);
                    window.top.UI.SuccessMessage(sep1.join(" "), 100);
                    window.top.Accountmanager.farm.updateOwnUnitsAvailable(data.current_units);
                }
                ;
            }
        }, 'json');
        return false
    }
}
function setOnclick(button) {
    var clickFunction = button.find('a').attr('onclick');
    if (typeof clickFunction != 'undefined') {
        var parameters = clickFunction.slice(clickFunction.indexOf("(") + 1, clickFunction.indexOf(")"));
        var eachParameter = parameters.split(",");
        if (clickFunction.indexOf("FromReport") == -1) {
            button.find('a').attr('onclick', 'return customSendUnits(' + parameters + ', window.top.$(this))');
        }
        else {
            button.find('a').attr('onclick', 'return customSendUnitsFromReport(' + parameters + '))');
        }
        button.closest('tr').attr('name', window.top.$.trim(eachParameter[1]));
    }
}
function addTableInfo() {
    window.top.$('#am_widget_Farm tr th').slice(0, 1).after("<th></th>");
    window.top.$('#am_widget_Farm tr:not(:first-child)').each(function (i) {
        window.top.$(this).children("td").each(function (j) {
            switch (j) {
                case 1:
                    window.top.$(this).filter(":first").before("<td style='width:10px;font-weight:bold;' id='rowNum'>" + (i + 1) + "</td>")
                    break;
                case 3:
                    var attackImg = window.top.$(this).find('img');
                    var tooltip = window.top.$(this).find('img').prop('tooltipText');
                    if (typeof tooltip != 'undefined') {
                        var numAttacks = tooltip.replace(/\D/g, '');
                        attackImg.after("<span style='font-weight:bold;'> (" + numAttacks + ")</span>");
                    }
                    break;
                case 8:
                    setOnclick(window.top.$(this));
                    break;
                case 9:
                    setOnclick(window.top.$(this));
                    break;
                case 10:
                    setOnclick(window.top.$(this));
                    break;
            }
        });
    });
}
function checkIfNextVillage() {
    current_units = window.top.Accountmanager.farm.current_units;
    if (userset[settingsIndexMap.next_village_scouts]) {
        var scouts = current_units.spy;
        if (scouts <= parseInt(userset[settingsIndexMap.scouts_left])) {
            getNewVillage("n");
            return true;
        }
    }
    if (userset[settingsIndexMap.next_village_farming_troops]) {
        var totalTroops = 0;
        window.top.$('.fm_unit input:checked').each(function (i) {
            var unitName = window.top.$(this).attr('name');
            totalTroops += parseInt(current_units[unitName]);
        });
        if (totalTroops <= parseInt(userset[settingsIndexMap.farming_troops_left])) {
            getNewVillage("n");
            return true;
        }
    }
    if (userset[settingsIndexMap.next_village_no_farms]) {
        if (window.top.$('#plunder_list tr:not(:first-child):visible').length == 0) {
            getNewVillage("n");
            return true;
        }
    }
}
function applySettings() {
    if (!pagesLoaded) {
        setTimeout(function () {
            showAllRows();
        }, 1);
        removeFirstPage();
    }
    else {
        applyFilters();
    }
}
function applyFilters() {
    window.top.$('#am_widget_Farm tr:gt(0)').each(function (i) {
        hideRow = checkRowToHide(window.top.$(this), userset);
        if (hideRow) {
            window.top.$(this).hide();
        }
    });
    changeHeader(filter_40);
    var topContainer = 0;
    if (window.top.$('#topContainer').css('position') == "fixed") {
        topContainer = window.top.$('#topContainer').height();
    }
    if (window.top.$('*:contains("Bot Protection")').length) {
        window.top.$('html, body').animate({scrollTop: (window.top.$('*:contains("Bot Protection")').offset().top - topContainer)}, 500);
        if (typeof showNotification === 'function') {
            showNotification('custom', ['LA Enhancer has encountered bot protection. Please respond to captcha to continue farming.'], null, 'Bot Protection');
        }
        cansend = false;
    } else {
        window.top.$('html, body').animate({scrollTop: (window.top.$('#farm_units').offset().top - topContainer)}, 500);
    }
    filtersApplied = true;
}
function checkRowToHide(row, profileArray) {
    hideRow = false;
    row.children("td").each(function (cell) {
        switch (cell) {
            case 2:
                reportSettings(window.top.$(this), profileArray);
                break;
            case 3:
                haulSettings(window.top.$(this), profileArray);
                break;
            case 4:
                hideRecentlyFarmed(window.top.$(this), profileArray);
                attackSettings(window.top.$(this), profileArray);
                continentSettings(window.top.$(this), profileArray);
                break;
            case 5:
                hideTime(window.top.$(this), profileArray);
                break;
            case 6:
                scoutReportSettings(window.top.$(this), profileArray);
                break;
            case 7:
                wallSettings(window.top.$(this), profileArray);
                break;
            case 8:
                distanceSettings(window.top.$(this), profileArray);
                break;
        }
    });
    if (hideRow) {
        if (troubleshoot)
            console.log(row.find("#rowNum").html() + ": (" + reason.join(',') + ")");
        reason = [];
        return true;
    }
    return false;
}
function resetTable() {
    window.top.$('#plunder_list tr').each(function (i) {
        window.top.$(this).show()
    });
}
function setLocalStorageRow(village) {
    var localTitle = "sitter:" + sitter + ", village:" + village + ", world:" + getURL()[0];
    window.top.$.jStorage.set(localTitle, getCurrentGameTime());
}
function reportSettings(cell, profileArray) {
    if (cell.html().indexOf("blue") >= 0 && profileArray[settingsIndexMap.blue]) {
        reason.push("Report is blue");
        hideRow = true;
        return;
    }
    if (cell.html().indexOf("green") >= 0 && profileArray[settingsIndexMap.green]) {
        reason.push("Report is green");
        hideRow = true;
        return;
    }
    if (cell.html().indexOf("yellow") >= 0 && profileArray[settingsIndexMap.yellow]) {
        reason.push("Report is yellow");
        hideRow = true;
        return;
    }
    if (cell.html().indexOf("red_yellow") >= 0 && profileArray[settingsIndexMap.red_yellow]) {
        reason.push("Report is red_yellow");
        hideRow = true;
        return;
    }
    if (cell.html().indexOf("red_blue") >= 0 && profileArray[settingsIndexMap.red_blue]) {
        reason.push("Report is red_blue");
        hideRow = true;
        return;
    }
    if (cell.html().indexOf("red") >= 0 && profileArray[settingsIndexMap.red]) {
        reason.push("Report is red");
        hideRow = true;
        return;
    }
}
function haulSettings(cell, profileArray) {
    if (profileArray[settingsIndexMap.enable_hauls]) {
        if (cell.html().indexOf("max_loot/1") >= 0 && profileArray[settingsIndexMap.full]) {
            reason.push("Haul is full");
            hideRow = true;
            return;
        }
        if (cell.html().indexOf("max_loot/0") >= 0 && profileArray[settingsIndexMap.partial]) {
            reason.push("Haul is partial");
            hideRow = true;
            return;
        }
        if (cell.html().indexOf("max_loot") == -1 && (profileArray[settingsIndexMap.full])) {
            reason.push("No haul graphic");
            hideRow = true;
            return;
        }
    }
}
function hideRecentlyFarmed(cell, profileArray) {
    if (profileArray[settingsIndexMap.hide_recent_farms]) {
        var village = cell.closest('tr').attr('name');
        localTitle = "sitter:" + sitter + ", village:" + village + ", world:" + getURL()[0];
        var sentTime = new Date(window.top.$.jStorage.get(localTitle));
        var t1 = currentGameTime;
        var t2 = sentTime;
        var dif = t1.getTime() - t2.getTime();
        var minutesBetween = Math.abs(parseInt(dif / 1000 / 60));
        switch (profileArray[settingsIndexMap.sent_time_filter]) {
            case"hide":
                if (minutesBetween < parseInt(profileArray[settingsIndexMap.hide_recent_time])) {
                    reason.push("Village was recently sent to " + minutesBetween + " minutes ago");
                    hideRow = true;
                    return;
                }
                break;
            case"show":
                if (minutesBetween > parseInt(profileArray[settingsIndexMap.hide_recent_time])) {
                    reason.push("Village was not recently sent to");
                    hideRow = true;
                    return;
                }
                break;
        }
    }
}
function attackSettings(cell, profileArray) {
    var numAttacks;
    var attackImg = cell.find('img');
    if (typeof attackImg.prop('tooltipText') != 'undefined') {
        numAttacks = parseInt(attackImg.prop('tooltipText').replace(/\D/g, ''));
    }
    else {
        numAttacks = 0;
    }
    if (profileArray[settingsIndexMap.enable_attacks]) {
        switch (profileArray[settingsIndexMap.attack_operator]) {
            case"greater_than":
                if (numAttacks > parseInt(profileArray[settingsIndexMap.attack_value])) {
                    reason.push("Outgoing attacks is too many");
                    hideRow = true;
                    return;
                }
                break;
            case"less_than":
                if (numAttacks < parseInt(profileArray[settingsIndexMap.attack_value])) {
                    reason.push("Outgoing attacks is too few");
                    hideRow = true;
                    return;
                }
                break;
            case"equal_to":
                if (numAttacks == parseInt(profileArray[settingsIndexMap.attack_value])) {
                    reason.push("Outgoing attacks is equal");
                    hideRow = true;
                    return;
                }
                break;
        }
    }
}
function continentSettings(cell, profileArray) {
    var continent = cell.find('a').html();
    if (typeof continent != 'undefined') {
        continent = continent.substr(continent.length - 2);
        var filteredContinents = profileArray[settingsIndexMap.continents_list].split('.');
        if (window.top.$.inArray(continent, filteredContinents) >= 0 && profileArray[settingsIndexMap.continent_display] == "hide") {
            reason.push("Continent is set to hide");
            hideRow = true;
            return;
        }
        if (window.top.$.inArray(continent, filteredContinents) == -1 && profileArray[settingsIndexMap.continent_display] == "show") {
            reason.push("Continent is not set to show");
            hideRow = true;
            return;
        }
    }
}
function hideTime(cell, profileArray) {
    if (profileArray[settingsIndexMap.enable_time]) {
        var t1 = currentGameTime;
        var t2 = getVillageAttackedTime(cell);
        var dif = t1.getTime() - t2.getTime();
        var minutesBetween = Math.abs(parseInt(dif / 1000 / 60));
        switch (profileArray[settingsIndexMap.attack_time_filter]) {
            case"hide":
                if (minutesBetween < parseInt(profileArray[settingsIndexMap.time_value])) {
                    reason.push("Village attacked " + minutesBetween + " minutes ago.");
                    hideRow = true;
                    return;
                }
                break;
            case"show":
                if (minutesBetween > parseInt(profileArray[settingsIndexMap.time_value])) {
                    reason.push("Village attacked " + minutesBetween + " minutes ago.");
                    hideRow = true;
                    return;
                }
                break;
        }
    }
}
function scoutReportSettings(cell, profileArray) {
    var total;
    if (profileArray[settingsIndexMap.enable_scout]) {
        if (window.top.$.trim(cell.find('span').html()) == "?") {
            total = 0;
        }
        else {
            var wood = parseInt(cell.children('span').eq(0).html().replace(/\D+/g, ''));
            var clay = parseInt(cell.children('span').eq(1).html().replace(/\D+/g, ''));
            var iron = parseInt(cell.children('span').eq(2).html().replace(/\D+/g, ''));
            total = wood + clay + iron;
        }
        switch (profileArray[settingsIndexMap.scout_report_operator]) {
            case"greater_than":
                if (total > parseInt(profileArray[settingsIndexMap.haul_value])) {
                    reason.push("Too many resources");
                    hideRow = true;
                    return;
                }
                break;
            case"less_than":
                if (total < parseInt(profileArray[settingsIndexMap.haul_value])) {
                    reason.push("Not enough resources");
                    hideRow = true;
                    return;
                }
                break;
            case"equal_to":
                if (total == parseInt(profileArray[settingsIndexMap.haul_value])) {
                    reason.push("Exact resources");
                    hideRow = true;
                    return;
                }
                break;
        }
    }
}
function wallSettings(cell, profileArray) {
    if (profileArray[settingsIndexMap.enable_walls]) {
        var wallLvl = parseInt(cell.html());
        if (wallLvl == '?') {
            wallLvl = 0;
        }
        switch (window.top.$.trim(profileArray[settingsIndexMap.wall_operator])) {
            case"greater_than":
                if (wallLvl > parseInt(profileArray[settingsIndexMap.wall_value])) {
                    reason.push("Wall too high");
                    hideRow = true;
                    return;
                }
                break;
            case"less_than":
                if (wallLvl < parseInt(profileArray[settingsIndexMap.wall_value])) {
                    reason.push("Wall too low");
                    hideRow = true;
                    return;
                }
                break;
            case"equal_to":
                if (wallLvl == parseInt(profileArray[settingsIndexMap.wall_value])) {
                    reason.push("Wall is exact");
                    hideRow = true;
                    return;
                }
                break;
        }
    }
}
function distanceSettings(cell, profileArray) {
    if (profileArray[settingsIndexMap.enable_distances]) {
        var distanceLvl = cell.html();
        switch (window.top.$.trim(profileArray[settingsIndexMap.distance_operator])) {
            case"greater_than":
                if (parseFloat(distanceLvl) > parseFloat(profileArray[settingsIndexMap.distance_value])) {
                    reason.push("Village too far");
                    hideRow = true;
                    return;
                }
                break;
            case"less_than":
                if (parseFloat(distanceLvl) < parseFloat(profileArray[settingsIndexMap.distance_value])) {
                    reason.push("Village too close");
                    hideRow = true;
                    return;
                }
                break;
            case"equal_to":
                if (parseFloat(distanceLvl) == parseFloat(profileArray[settingsIndexMap.distance_value])) {
                    reason.push("Village exact distance");
                    hideRow = true;
                    return;
                }
                break;
        }
    }
}
function deleteRecentlyFarmed() {
    window.top.$('#am_widget_Farm tr:gt(0)').each(function (i) {
        window.top.$(this).children("td").each(function (j) {
            if (j == 4) {
                reportLinkText = window.top.$.trim(window.top.$(this).children("a").html());
                localTitle = "sitter:" + sitter + ", village:" + reportLinkText + ", world:" + getURL()[0];
                if (window.top.$.jStorage.get(localTitle) != null) {
                    window.top.$.jStorage.deleteKey(localTitle);
                }
            }
        });
    });
}
function getCurrentGameTime() {
    var serverTime = window.top.$('#serverTime').html().split(':');
    var serverDate = window.top.$('#serverDate').html().split('/');
    return new Date(serverDate[2], serverDate[1] - 1, serverDate[0], serverTime[0], serverTime[1], serverTime[2], 0);
}
function getVillageAttackedTime(cell) {
    var time = cell.html();
    var cellTime = time.split(' ');
    var attackDay;
    var attackTime;
    var cell;
    for (var i = 0; i < cellTime.length; i++) {
        cell = window.top.$.trim(cellTime[i]);
        if (cell.indexOf('.') > -1) {
            attackDay = cell;
        } else if (cell == filter_61) {
            attackDay = filter_61;
        } else if (cell == filter_62) {
            attackDay = filter_62;
        }
        if (cell.indexOf(':') > -1) {
            attackTime = cell;
        }
    }
    if (attackDay == filter_61 || attackDay == filter_62) {
        var day = currentGameTime.getDate();
        if (attackDay == filter_62)
            day--;
        var month = currentGameTime.getMonth();
        var year = currentGameTime.getFullYear();
        var time = attackTime.split(':');
        var hours = time[0];
        var minutes = time[1];
        var seconds = time[2];
        return new Date(year, month, day, hours, minutes, seconds, 0);
    }
    else {
        var cellDay = attackDay.split('.');
        var day = cellDay[0];
        var month = cellDay[1] - 1;
        if (currentGameTime.getMonth() == 0 && month == 11)
            var year = currentGameTime.getFullYear() - 1; else
            var year = currentGameTime.getFullYear();
        var time = attackTime.split(':');
        var hours = time[0];
        var minutes = time[1];
        var seconds = time[2];
        return new Date(year, month, day, hours, minutes, seconds, 0);
    }
}
function loadDefaultProfile() {
    if (window.top.$.jStorage.get("profile:" + profile_10) == null) {
        window.top.$.jStorage.set("profile:" + profile_10, ["1", "1", "distance", "asc", false, false, false, false, false, false, false, false, "hide", "", false, false, false, false, "greater_than", "", false, "greater_than", "", false, "greater_than", "", false, "greater_than", "", "hide", "", false, "hide", "", false, false, false, "", false, "", false]);
        window.top.$.jStorage.deleteKey("profileList");
        window.top.$.jStorage.set("profileList", [profile_10]);
    }
    if (window.top.$.jStorage.get("DefaultProfile") == null) {
        window.top.$.jStorage.set("DefaultProfile", profile_10);
    }
    userset = window.top.$.jStorage.get("profile:" + profile_10);
    loadProfile(profile_10);
    window.top.$('#settingsProfile').val(profile_10);
}
function setDefaultProfile() {
    if (window.top.$('#settingsProfile').val() == profile_10) {
        var newProfile = confirm(dialog_02);
        if (newProfile) {
            createProfile();
            setDefaultProfile();
        } else {
            return false;
        }
    } else {
        var profile = window.top.$.jStorage.get("profile:" + window.top.$('#settingsProfile').val());
        window.top.$.jStorage.set("profile:" + profile_10, profile);
        window.top.$.jStorage.set("DefaultProfile", window.top.$('#settingsProfile').val());
    }
}
function fillProfileList() {
    var profileList = window.top.$.jStorage.get("profileList");
    window.top.$.each(profileList, function (i, val) {
        window.top.$('#settingsProfile').append("<option value='" + val + "'>" + val + "</option>")
    });
    window.top.$('#settingsProfile').val(window.top.$.jStorage.get("DefaultProfile") || profile_10);
}
function createProfile() {
    var profileName = prompt(dialog_03 + ":");
    if (window.top.$.inArray(profileName, window.top.$.jStorage.get("profileList")) != -1) {
        alert(dialog_04);
        createProfile();
        return false;
    }
    if (profileName == "") {
        alert(dialog_05);
        createProfile();
        return false;
    }
    var profiles;
    if (profileName != null && profileName != "") {
        var settings = [];
        settings.push(window.top.$('#start_page').val());
        settings.push(window.top.$('#end_page').val());
        settings.push(window.top.$('#order_by').val());
        settings.push(window.top.$('#direction').val());
        settings.push(window.top.$('#all_none').prop('checked'));
        settings.push(window.top.$('#blue').prop('checked'));
        settings.push(window.top.$('#green').prop('checked'));
        settings.push(window.top.$('#yellow').prop('checked'));
        settings.push(window.top.$('#red_yellow').prop('checked'));
        settings.push(window.top.$('#red_blue').prop('checked'));
        settings.push(window.top.$('#red').prop('checked'));
        settings.push(window.top.$('#hide_recent_farms').prop('checked'));
        settings.push(window.top.$('#sent_time_filter').val());
        settings.push(window.top.$('#hide_recent_time').val());
        settings.push(window.top.$('#enable_hauls').prop('checked'));
        settings.push(window.top.$('#full').prop('checked'));
        settings.push(window.top.$('#partial').prop('checked'));
        settings.push(window.top.$('#enable_attacks').prop('checked'));
        settings.push(window.top.$('#attack_operator').val());
        settings.push(window.top.$('#attack_value').val());
        settings.push(window.top.$('#enable_walls').prop('checked'));
        settings.push(window.top.$('#wall_operator').val());
        settings.push(window.top.$('#wall_value').val());
        settings.push(window.top.$('#enable_distances').prop('checked'));
        settings.push(window.top.$('#distance_operator').val());
        settings.push(window.top.$('#distance_value').val());
        settings.push(window.top.$('#enable_scout').prop('checked'));
        settings.push(window.top.$('#scout_report_operator').val());
        settings.push(window.top.$('#haul_value').val());
        settings.push(window.top.$('#continent_display').val());
        settings.push(window.top.$('#continents_list').val());
        settings.push(window.top.$('#enable_time').prop('checked'));
        settings.push(window.top.$('#attack_time_filter').val());
        settings.push(window.top.$('#time_value').val());
        settings.push(window.top.$('#enable_auto_run').prop('checked'));
        settings.push(window.top.$('#next_village_no_farms').prop('checked'));
        settings.push(window.top.$('#next_village_scouts').prop('checked'));
        settings.push(window.top.$('#scouts_left').val());
        settings.push(window.top.$('#next_village_farming_troops').prop('checked'));
        settings.push(window.top.$('#farming_troops_left').val());
        settings.push(window.top.$('#next_village_units').prop('checked'));
        window.top.$.jStorage.set("profile:" + profileName, settings);
        var profileList = window.top.$.jStorage.get("profileList");
        profileList.push(profileName);
        window.top.$.jStorage.set("profileList", profileList)
        window.top.$('#settingsProfile').append("<option value='" + profileName + "'>" + profileName + "</option>");
        window.top.$('#priorityOneProfile').append("<option value='" + profileName + "'>" + profileName + "</option>");
        window.top.$('#priorityTwoProfile').append("<option value='" + profileName + "'>" + profileName + "</option>");
        window.top.$('#priorityThreeProfile').append("<option value='" + profileName + "'>" + profileName + "</option>");
        window.top.$('#settingsProfile').val(profileName);
    }
}
function loadProfile(profile) {
    var settings = window.top.$.jStorage.get("profile:" + profile);
    userset = settings;
    window.top.$('#start_page').val(settings[0]);
    window.top.$('#end_page').val(settings[1]);
    window.top.$('#order_by').val(settings[2]);
    window.top.$('#direction').val(settings[3]);
    window.top.$('#all_none').prop('checked', settings[4]);
    window.top.$('#blue').prop('checked', settings[5]);
    window.top.$('#green').prop('checked', settings[6]);
    window.top.$('#yellow').prop('checked', settings[7]);
    window.top.$('#red_yellow').prop('checked', settings[8]);
    window.top.$('#red_blue').prop('checked', settings[9]);
    window.top.$('#red').prop('checked', settings[10]);
    window.top.$('#hide_recent_farms').prop('checked', settings[11]);
    window.top.$('#sent_time_filter').val(settings[12]);
    window.top.$('#hide_recent_time').val(settings[13]);
    window.top.$('#enable_hauls').prop('checked', settings[14]);
    window.top.$('#full').prop('checked', settings[15]);
    window.top.$('#partial').prop('checked', settings[16]);
    window.top.$('#enable_attacks').prop('checked', settings[17]);
    window.top.$('#attack_operator').val(settings[18]);
    window.top.$('#attack_value').val(settings[19]);
    window.top.$('#enable_walls').prop('checked', settings[20]);
    window.top.$('#wall_operator').val(settings[21]);
    window.top.$('#wall_value').val(settings[22]);
    window.top.$('#enable_distances').prop('checked', settings[23]);
    window.top.$('#distance_operator').val(settings[24]);
    window.top.$('#distance_value').val(settings[25]);
    window.top.$('#enable_scout').prop('checked', settings[26]);
    window.top.$('#scout_report_operator').val(settings[27]);
    window.top.$('#haul_value').val(settings[28]);
    window.top.$('#continent_display').val(settings[29]);
    window.top.$('#continents_list').val(settings[30]);
    window.top.$('#enable_time').prop('checked', settings[31]);
    window.top.$('#attack_time_filter').val(settings[32]);
    window.top.$('#time_value').val(settings[33]);
    window.top.$('#enable_auto_run').prop('checked', settings[34]);
    window.top.$('#next_village_no_farms').prop('checked', settings[35]);
    window.top.$('#next_village_scouts').prop('checked', settings[36]);
    window.top.$('#scouts_left').val(settings[37]);
    window.top.$('#next_village_farming_troops').prop('checked', settings[38]);
    window.top.$('#farming_troops_left').val(settings[39]);
    window.top.$('#next_village_units').prop('checked', settings[40]);
}
function changeProfile(profile) {
    loadProfile(profile);
    resetTable();
    applyFilters();
}
function deleteProfile() {
    var profileName = window.top.$('#settingsProfile').val();
    if (profileName == profile_10) {
        alert(dialog_06);
    } else {
        var profilesList = window.top.$.jStorage.get("profileList");
        profilesList.splice(profilesList.indexOf(profileName), 1);
        window.top.$.jStorage.set("profileList", profilesList);
        window.top.$.jStorage.deleteKey("profile:" + profileName);
        if (window.top.$.jStorage.get("DefaultProfile") == profileName) {
            window.top.$.jStorage.set("DefaultProfile", profile_10);
        }
        window.top.$("#settingsProfile option[value='" + profileName + "']").remove();
        window.top.$("#priorityOneProfile option[value='" + profileName + "']").remove();
        window.top.$("#priorityTwoProfile option[value='" + profileName + "']").remove();
        window.top.$("#priorityThreeProfile option[value='" + profileName + "']").remove();
        loadDefaultProfile(profile_10);
    }
}
function updateProfile() {
    var profileName = window.top.$('#settingsProfile').val();
    var settings = [];
    settings.push(window.top.$('#start_page').val());
    settings.push(window.top.$('#end_page').val());
    settings.push(window.top.$('#order_by').val());
    settings.push(window.top.$('#direction').val());
    settings.push(window.top.$('#all_none').prop('checked'));
    settings.push(window.top.$('#blue').prop('checked'));
    settings.push(window.top.$('#green').prop('checked'));
    settings.push(window.top.$('#yellow').prop('checked'));
    settings.push(window.top.$('#red_yellow').prop('checked'));
    settings.push(window.top.$('#red_blue').prop('checked'));
    settings.push(window.top.$('#red').prop('checked'));
    settings.push(window.top.$('#hide_recent_farms').prop('checked'));
    settings.push(window.top.$('#sent_time_filter').val());
    settings.push(window.top.$('#hide_recent_time').val());
    settings.push(window.top.$('#enable_hauls').prop('checked'));
    settings.push(window.top.$('#full').prop('checked'));
    settings.push(window.top.$('#partial').prop('checked'));
    settings.push(window.top.$('#enable_attacks').prop('checked'));
    settings.push(window.top.$('#attack_operator').val());
    settings.push(window.top.$('#attack_value').val());
    settings.push(window.top.$('#enable_walls').prop('checked'));
    settings.push(window.top.$('#wall_operator').val());
    settings.push(window.top.$('#wall_value').val());
    settings.push(window.top.$('#enable_distances').prop('checked'));
    settings.push(window.top.$('#distance_operator').val());
    settings.push(window.top.$('#distance_value').val());
    settings.push(window.top.$('#enable_scout').prop('checked'));
    settings.push(window.top.$('#scout_report_operator').val());
    settings.push(window.top.$('#haul_value').val());
    settings.push(window.top.$('#continent_display').val());
    settings.push(window.top.$('#continents_list').val());
    settings.push(window.top.$('#enable_time').prop('checked'));
    settings.push(window.top.$('#attack_time_filter').val());
    settings.push(window.top.$('#time_value').val());
    settings.push(window.top.$('#enable_auto_run').prop('checked'));
    settings.push(window.top.$('#next_village_no_farms').prop('checked'));
    settings.push(window.top.$('#next_village_scouts').prop('checked'));
    settings.push(window.top.$('#scouts_left').val());
    settings.push(window.top.$('#next_village_farming_troops').prop('checked'));
    settings.push(window.top.$('#farming_troops_left').val());
    settings.push(window.top.$('#next_village_units').prop('checked'));
    window.top.$.jStorage.set("profile:" + profileName, settings);
    userset = settings;
}
function exportProfile() {
    var profileName = window.top.$('#settingsProfile').val();
    var settings = window.top.$.jStorage.get("profile:" + profileName);
    if (profileName == profile_10) {
        alert(dialog_07);
    } else {
        var profileSettings = prompt(dialog_08, dialog_09A + "" + profileName + "" + dialog_09B + "" + profileName + "," + settings + "" + dialog_09C);
    }
}
function importProfile() {
    var profileSettings = prompt(dialog_10 + ":", dialog_11);
    profileSettings = profileSettings.split(",");
    var profileName = profileSettings[0];
    profileSettings.shift();
    var profileList = window.top.$.jStorage.get("profileList");
    if (window.top.$.inArray(profileName, profileList) != -1) {
        alert(dialog_12);
        return false;
    } else {
        for (i = 0; i <= profileSettings.length; i++) {
            if (profileSettings[i] === "false" || profileSettings[i] === "true") {
                profileSettings[i] = parseBool(profileSettings[i]);
            }
        }
        window.top.$.jStorage.set("profile:" + profileName, profileSettings);
        profileList.push(profileName);
        window.top.$.jStorage.set("profileList", profileList);
        window.top.$('#settingsProfile').append("<option value='" + profileName + "'>" + profileName + "</option>");
        window.top.$('#settingsProfile').val(profileName);
        loadProfile(profileName);
    }
}
function hotkeysOnOff() {
    var $hotkeyFields = window.top.$('#settingsBody tr:lt(9) input,#settingsBody tr:lt(9) select');
    $hotkeyFields.off("focusin.laSmart focusout.laSmart");
    $hotkeyFields.on("focusin.laSmart", function () {
        window.onkeydown = function () {
        };
    });
    $hotkeyFields.on("focusout.laSmart", function () {
        turnOnHotkeys();
    });
}
function turnOnHotkeys() {
    window.onkeydown = function (e) {
        if (editingKey) {
            editKey(e);
        } else {
            if (e.which === smartConfig.enter_keycode) {
                smartHandleEnterKeydown(e);
                e.preventDefault();
                return;
            }
            if (smartState.startTimerId !== null) {
                clearTimeout(smartState.startTimerId);
                smartState.startTimerId = null;
                smartState.isHoldingEnter = false;
                smartLog("Cancelled pending smart start because manual hotkey " + e.which + " was pressed.");
            }
            if (smartState.isRunning) {
                smartRequestStop("Manual hotkey " + e.which + " pressed.");
                e.preventDefault();
                return;
            }

            var row = window.top.$("#plunder_list tr").filter(":visible").eq(1);
            var aButton = row.children("td").eq(9).children("a");
            var bButton = row.children("td").eq(10).children("a");
            var cButton = row.children("td").eq(11).children("a");
            switch (e.which) {
                case keycodes.a:
                    tryClick(aButton);
                    break;
                case keycodes.b:
                    tryClick(bButton);
                    break;
                case keycodes.c:
                    tryClick(cButton);
                    break;
                case keycodes.skip:
                    row.hide();
                    break;
                case keycodes.master:
                    if (cansend && filtersApplied)
                        selectMasterButton(row);
                    break;
                case keycodes.left:
                    getNewVillage("p");
                    break;
                case keycodes.right:
                    getNewVillage("n");
                    break;
                default:
                    return;
            }
        }
        e.preventDefault();
    };
}
function tryClick(button) {
    if (cansend && filtersApplied) {
        if (!checkIfNextVillage()) {
            console.log(button.html());
            if (button.hasClass("farm_icon_disabled") || button.html() == undefined) {

                window.top.UI.ErrorMessage("That button is not selectable. Skipping row...", 500);
                button.closest('tr').hide();
            }
            else {
                button.click();
                if (userset[settingsIndexMap.next_village_scouts] || userset[settingsIndexMap.next_village_farming_troops]) {
                    doTime(200);
                } else {
                    doTime(200);
                }
            }
        }
    }
}
function doTime(millsec) {
    cansend = false;
    setTimeout(function () {
        cansend = true;
    }, millsec);
}
function smartConsumeSkipAutoRun() {
    if (smartState.skipAutoRunOnce) {
        smartState.skipAutoRunOnce = false;
        return true;
    }
    return false;
}
function smartBindGlobalKeyup() {
    if (smartState.globalKeyupBound) {
        return;
    }
    window.top.$(window.top.document).on("keyup.laSmart", function (e) {
        if (e.which === smartConfig.enter_keycode) {
            smartHandleEnterKeyup(e);
        }
    });
    smartState.globalKeyupBound = true;
}
function smartHandleEnterKeydown() {
    if (editingKey) {
        return;
    }
    if (smartState.isHoldingEnter || smartState.isRunning || smartState.startTimerId !== null) {
        smartState.isHoldingEnter = true;
        return;
    }
    smartState.isHoldingEnter = true;
    smartState.startTimerId = setTimeout(function () {
        smartState.startTimerId = null;
        smartStartRunner();
    }, 0);
}
function smartHandleEnterKeyup() {
    smartState.isHoldingEnter = false;
    if (smartState.startTimerId !== null) {
        clearTimeout(smartState.startTimerId);
        smartState.startTimerId = null;
    }
    if (smartState.isRunning) {
        smartRequestStop("Enter released.");
    }
}
function smartRequestStop(reasonText) {
    if (!smartState.isRunning) {
        return;
    }
    if (!smartState.stopRequested) {
        smartState.stopRequested = true;
        smartState.stopReason = reasonText || "stop requested";
        if (smartState.planningInProgress) {
            smartState.lastStopPhase = "planning";
            smartLogStage("runner.stop", "Stop requested during planning: " + smartState.stopReason + ". Planning will still complete before execution is evaluated.");
        } else if (smartState.executionInProgress) {
            smartState.lastStopPhase = "execution";
            smartLogStage("runner.stop", "Stop requested during execution: " + smartState.stopReason + ". The current request may finish, but no new dispatch will start.");
        } else {
            smartState.lastStopPhase = "between_phases";
            smartLogStage("runner.stop", "Stop requested: " + smartState.stopReason + ".");
        }
        smartShowInfo("Smart mode stopping: " + smartState.stopReason);
    }
}
function smartResolvePendingVillageSwitch() {
    if (!smartState.pendingVillageSwitch) {
        return;
    }
    if (String(window.top.game_data.village.id) === String(smartState.pendingVillageSwitch.villageId)) {
        smartLogStage("execute.switch", "Switched active village to " + window.top.game_data.village.display_name + ".");
        smartState.pendingVillageSwitch = null;
    }
}
function smartLog(message) {
    console.log(scriptName + " Smart: " + message);
}
function smartLogStage(stage, message) {
    smartLog("[" + stage + "] " + message);
}
function smartShowInfo(message) {
    smartLog(message);
    if (window.top.UI && typeof window.top.UI.InfoMessage === "function") {
        window.top.UI.InfoMessage(message, 1500);
    }
}
function smartShowError(message) {
    smartLog("ERROR: " + message);
    if (window.top.UI && typeof window.top.UI.ErrorMessage === "function") {
        window.top.UI.ErrorMessage(message, 2500);
    }
}
function smartDelay(ms) {
    return new Promise(function (resolve) {
        setTimeout(resolve, ms);
    });
}
function smartNormalizeText(text) {
    return window.top.$.trim(String(text || "").replace(/\s+/g, " "));
}
function smartIncrementCounter(counterMap, key) {
    var normalizedKey = key || "unknown";
    counterMap[normalizedKey] = (counterMap[normalizedKey] || 0) + 1;
}
function smartFormatCounterMap(counterMap) {
    var keys = Object.keys(counterMap || {});
    if (!keys.length) {
        return "none";
    }
    keys.sort();
    return window.top.$.map(keys, function (key) {
        return key + "=" + counterMap[key];
    }).join(", ");
}
function smartShouldStopDispatch() {
    return !!smartState.stopRequested;
}
function smartAjaxRequest(options) {
    return new Promise(function (resolve, reject) {
        window.top.$.ajax(window.top.$.extend({}, options, {
            success: function (data) {
                resolve(data);
            },
            error: function (xhr, statusText, errorThrown) {
                reject(new Error((options.type || "GET") + " " + options.url + " failed: " + (errorThrown || statusText || "unknown error")));
            }
        }));
    });
}
function smartParseDocument(html) {
    return new DOMParser().parseFromString(html, "text/html");
}
function smartExtractPageGameData(html) {
    if (!html) {
        return null;
    }
    var parts = String(html).split("TribalWars.updateGameData(");
    if (parts.length < 2) {
        return null;
    }
    try {
        return window.top.$.parseJSON(parts[1].split(");")[0]);
    } catch (error) {
        return null;
    }
}
function smartNormalizeCount(value) {
    if (value === null || typeof value === "undefined") {
        return null;
    }
    if (typeof value === "number") {
        return isNaN(value) ? null : value;
    }
    var cleaned = String(value).replace(/\./g, "").replace(/,/g, ".").replace(/[^\d.\-]/g, "");
    if (cleaned === "") {
        return null;
    }
    var parsed = cleaned.indexOf(".") > -1 ? parseFloat(cleaned) : parseInt(cleaned, 10);
    return isNaN(parsed) ? null : parsed;
}
function smartParseCoords(text) {
    if (!text) {
        return null;
    }
    var match = String(text).match(/(\d{1,3})\|(\d{1,3})/);
    if (!match) {
        return null;
    }
    return {
        x: parseInt(match[1], 10),
        y: parseInt(match[2], 10),
        text: match[1] + "|" + match[2]
    };
}
function smartExtractQueryParam(url, key) {
    if (!url) {
        return null;
    }
    var match = String(url).match(new RegExp("[?&]" + key + "=([^&#]+)"));
    return match ? decodeURIComponent(match[1]) : null;
}
function smartToAbsoluteUrl(url) {
    if (!url) {
        return window.location.origin;
    }
    var anchor = window.top.document.createElement("a");
    anchor.href = url;
    return anchor.href;
}
function smartGetFormValue(serialized, names) {
    for (var i = 0; i < serialized.length; i++) {
        if (window.top.$.inArray(serialized[i].name, names) > -1) {
            return serialized[i].value;
        }
    }
    return null;
}
function smartSerializeForm($form, overrides, submitDescriptor) {
    var serialized = $form.serializeArray();
    var skipNames = {};
    window.top.$.each(overrides || {}, function (name) {
        skipNames[name] = true;
    });
    if (submitDescriptor && submitDescriptor.name) {
        skipNames[submitDescriptor.name] = true;
    }
    var output = [];
    window.top.$.each(serialized, function (_, pair) {
        if (!skipNames[pair.name]) {
            output.push(pair);
        }
    });
    window.top.$.each(overrides || {}, function (name, value) {
        output.push({name: name, value: value});
    });
    if (submitDescriptor && submitDescriptor.name) {
        output.push({name: submitDescriptor.name, value: submitDescriptor.value});
    }
    return output;
}
function smartFindActionSubmit($form, preferredName) {
    var $submit = preferredName ? $form.find("[name='" + preferredName + "']").first() : window.top.$();
    if (!$submit.length) {
        $submit = $form.find("input[type='submit'],button[type='submit'],button[name],input[name='attack'],input[name='submit_confirm']").first();
    }
    if (!$submit.length) {
        return null;
    }
    return {
        name: $submit.attr("name") || preferredName || "submit",
        value: $submit.val() || window.top.$.trim($submit.text()) || "1"
    };
}
function smartFindFreshnessCell($row) {
    var found = window.top.$();
    $row.children("td").each(function () {
        var $cell = window.top.$(this);
        var text = smartNormalizeText($cell.text());
        if (text.indexOf(":") === -1) {
            return;
        }
        var parsed = getVillageAttackedTime($cell);
        if (parsed instanceof Date && !isNaN(parsed.getTime())) {
            found = $cell;
            return false;
        }
    });
    return found;
}
function smartFindResourcesCell($row) {
    var found = window.top.$();
    $row.children("td").each(function () {
        var $cell = window.top.$(this);
        var html = String($cell.html() || "");
        if (html.indexOf("header wood") > -1 && html.indexOf("header stone") > -1 && html.indexOf("header iron") > -1) {
            found = $cell;
            return false;
        }
    });
    return found;
}
function smartParseResourcesCell($cell) {
    var matches = smartNormalizeText($cell.text()).match(/\d[\d.]*/g);
    if (!matches || matches.length < 3) {
        return null;
    }
    var wood = smartNormalizeCount(matches[0]);
    var stone = smartNormalizeCount(matches[1]);
    var iron = smartNormalizeCount(matches[2]);
    if (wood === null || stone === null || iron === null) {
        return null;
    }
    return {
        wood: wood,
        stone: stone,
        iron: iron,
        total: wood + stone + iron
    };
}
function smartParseWallAndDistance($row, $resourcesCell) {
    var $cells = $row.children("td");
    var resourceIndex = $cells.index($resourcesCell);
    if (resourceIndex < 0) {
        return null;
    }
    var wallLevel = null;
    var distanceText = null;
    $cells.slice(resourceIndex + 1).each(function () {
        var $cell = window.top.$(this);
        if ($cell.find("a,input,button,select").length) {
            return;
        }
        var text = smartNormalizeText($cell.text());
        if (text === "") {
            return;
        }
        if (wallLevel === null && (text === "?" || /^\d+$/.test(text))) {
            wallLevel = text === "?" ? 0 : parseInt(text, 10);
            return;
        }
        if (wallLevel !== null && distanceText === null && /^\d+(?:[.,]\d+)?$/.test(text)) {
            distanceText = text.replace(",", ".");
            return false;
        }
    });
    if (wallLevel === null || distanceText === null) {
        return null;
    }
    return {
        wallLevel: wallLevel,
        distanceText: distanceText
    };
}
function smartExtractOutgoingCount($row) {
    var count = 0;
    $row.children("td").each(function () {
        var match = smartNormalizeText(window.top.$(this).text()).match(/^\((\d+)\)$/);
        if (match) {
            count = parseInt(match[1], 10);
            return false;
        }
    });
    return count;
}
function smartGetWallMinimumLight(wallLevel) {
    switch (wallLevel) {
        case 0:
            return 10;
        case 1:
            return 14;
        case 2:
            return 20;
        case 3:
            return 33;
        default:
            return null;
    }
}
function smartClassifyFreshnessRule(freshnessMinutes) {
    if (freshnessMinutes <= 120) {
        return {bucket: "0-2h", sendType: "mixed", factor: 1};
    }
    if (freshnessMinutes <= 180) {
        return {bucket: "2-3h", sendType: "mixed", factor: 0.75};
    }
    if (freshnessMinutes <= 240) {
        return {bucket: "3-4h", sendType: "mixed", factor: 0.5};
    }
    return {bucket: ">4h", sendType: "spy_only", factor: 0};
}
function smartExtractTargetId($row) {
    var targetVillageId = $row.attr("name");
    if (targetVillageId) {
        return String(targetVillageId);
    }
    var rowIdMatch = String($row.attr("id") || "").match(/village_(\d+)/);
    if (rowIdMatch) {
        return String(rowIdMatch[1]);
    }
    var $placeLink = $row.find("a[href*='screen=place'][href*='target=']").first();
    if ($placeLink.length) {
        targetVillageId = smartExtractQueryParam($placeLink.attr("href"), "target");
    }
    return targetVillageId ? String(targetVillageId) : null;
}
function smartExtractTargetCoords($row) {
    var candidates = [];
    var $cells = $row.children("td,th");
    if ($cells.length) {
        candidates.push(smartNormalizeText($cells.eq(0).text()));
    }
    $row.find("a[href*='screen=report'], a[href*='screen=place'], a[href*='screen=info_village']").each(function () {
        candidates.push(smartNormalizeText(window.top.$(this).text()));
    });
    candidates.push(smartNormalizeText($row.text()));
    for (var i = 0; i < candidates.length; i++) {
        var coords = smartParseCoords(candidates[i]);
        if (coords) {
            return coords;
        }
    }
    return null;
}
function smartDescribeTargetClassification(target) {
    if (target.classification === "wall_skip_candidate") {
        return "wall " + target.wallLevel + " exceeds smart limit";
    }
    if (target.classification === "spy_only_candidate") {
        return "older than 4h, spy-only candidate";
    }
    if (target.classification === "below_wall_min_candidate") {
        return target.adjustedLoot + " adjusted loot fully loads only " + target.fullyLoadableLight + " LC, below wall minimum " + target.wallMinimumLight;
    }
    return "mixed candidate";
}
function smartIsNumericIdText(value) {
    return /^\d+$/.test(String(value || ""));
}
function smartIsCandidateTargetRow($row) {
    if (!$row || !$row.length || !$row.closest("#plunder_list").length) {
        return false;
    }
    var $cells = $row.children("td");
    if ($cells.length < 8) {
        return false;
    }
    var nameAttr = smartNormalizeText($row.attr("name"));
    var hasNumericName = smartIsNumericIdText(nameAttr);
    var $placeLink = $row.find("a[href*='screen=place'][href*='target=']").first();
    var $reportLink = $row.find("a[href*='screen=report'][href*='view=']").first();
    var farmButtonCount = $row.find("a.farm_icon_a, a.farm_icon_b, a.farm_icon_c").length;
    var hasResourcesCell = smartFindResourcesCell($row).length > 0;
    if (!hasNumericName && !$placeLink.length) {
        return false;
    }
    if (!$reportLink.length) {
        return false;
    }
    if (!$placeLink.length) {
        return false;
    }
    if (farmButtonCount < 1) {
        return false;
    }
    if (!hasResourcesCell) {
        return false;
    }
    return true;
}
function smartCollectCandidateTargetRows() {
    var details = {
        plunderListExists: false,
        visibleTableRowCount: 0,
        candidateRows: window.top.$()
    };
    var $plunderList = window.top.$("#plunder_list");
    if (!$plunderList.length) {
        return details;
    }
    details.plunderListExists = true;
    var $visibleRows = $plunderList.find("tr").filter(":visible");
    details.visibleTableRowCount = $visibleRows.length;
    $visibleRows.each(function () {
        var $row = window.top.$(this);
        if (smartIsCandidateTargetRow($row)) {
            details.candidateRows = details.candidateRows.add($row);
        }
    });
    return details;
}
function smartParseVisibleTargets() {
    var result = {
        targets: [],
        visibleRowCount: 0,
        candidateRowCount: 0,
        malformedCounts: {}
    };
    var candidateDetails = smartCollectCandidateTargetRows();
    result.visibleRowCount = candidateDetails.visibleTableRowCount;
    if (!candidateDetails.plunderListExists) {
        smartLogStage("targets.none", "Could not find #plunder_list on the current page.");
        return result;
    }
    if (!candidateDetails.visibleTableRowCount) {
        smartLogStage("targets.none", "#plunder_list exists, but no visible rows remain after current LA filtering.");
        return result;
    }
    result.candidateRowCount = candidateDetails.candidateRows.length;
    smartLogStage("targets.scan", "Saw " + result.candidateRowCount + " candidate target rows inside #plunder_list out of " + result.visibleRowCount + " visible rows.");
    if (!result.candidateRowCount) {
        smartLogStage("targets.none", "#plunder_list exists, but no candidate rows matched live loot-row evidence.");
        return result;
    }
    candidateDetails.candidateRows.each(function (index) {
        smartParseTargetRow(window.top.$(this), index + 1, result);
    });
    if (!result.targets.length) {
        smartLogStage("targets.none", "Candidate target rows were found, but none could be parsed safely. Reasons: " + smartFormatCounterMap(result.malformedCounts) + ".");
        return result;
    }
    smartLogStage("targets", "Parsed " + result.targets.length + " visible targets from " + result.candidateRowCount + " candidate rows.");
    if (Object.keys(result.malformedCounts).length) {
        smartLogStage("targets.row", "Ignored malformed candidate rows: " + smartFormatCounterMap(result.malformedCounts) + ".");
    }
    return result;
}
function smartParseTargetRow($row, rowOrder, result) {
    var targetVillageId = smartExtractTargetId($row);
    if (!targetVillageId) {
        smartIncrementCounter(result.malformedCounts, "missing_target_id");
        smartLogStage("targets.row", "Skipping visible row " + rowOrder + ": target village id missing.");
        return null;
    }
    var coords = smartExtractTargetCoords($row);
    if (!coords) {
        smartIncrementCounter(result.malformedCounts, "missing_coords");
        smartLogStage("targets.row", "Skipping visible row " + rowOrder + " target " + targetVillageId + ": coordinates missing from row text.");
        return null;
    }
    var $freshnessCell = smartFindFreshnessCell($row);
    if (!$freshnessCell.length) {
        smartIncrementCounter(result.malformedCounts, "missing_freshness");
        smartLogStage("targets.row", "Skipping visible row " + rowOrder + " target " + coords.text + ": freshness cell missing.");
        return null;
    }
    var attackDate = getVillageAttackedTime($freshnessCell);
    if (!(attackDate instanceof Date) || isNaN(attackDate.getTime())) {
        smartIncrementCounter(result.malformedCounts, "invalid_freshness");
        smartLogStage("targets.row", "Skipping visible row " + rowOrder + " target " + coords.text + ": freshness value could not be parsed.");
        return null;
    }
    var freshnessMinutes = Math.abs(Math.round((currentGameTime.getTime() - attackDate.getTime()) / 60000));
    var $resourcesCell = smartFindResourcesCell($row);
    if (!$resourcesCell.length) {
        smartIncrementCounter(result.malformedCounts, "missing_resources_cell");
        smartLogStage("targets.row", "Skipping visible row " + rowOrder + " target " + coords.text + ": resources cell missing.");
        return null;
    }
    var resources = smartParseResourcesCell($resourcesCell);
    if (!resources || resources.total <= 0) {
        smartIncrementCounter(result.malformedCounts, "invalid_resources");
        smartLogStage("targets.row", "Skipping visible row " + rowOrder + " target " + coords.text + ": expected loot could not be read safely.");
        return null;
    }
    var wallAndDistance = smartParseWallAndDistance($row, $resourcesCell);
    if (!wallAndDistance) {
        smartIncrementCounter(result.malformedCounts, "missing_wall_distance");
        smartLogStage("targets.row", "Skipping visible row " + rowOrder + " target " + coords.text + ": wall/distance cells missing.");
        return null;
    }
    var freshnessRule = smartClassifyFreshnessRule(freshnessMinutes);
    var wallMinimumLight = smartGetWallMinimumLight(wallAndDistance.wallLevel);
    var adjustedLoot = freshnessRule.sendType === "mixed" ? Math.floor(resources.total * freshnessRule.factor) : 0;
    var fullyLoadableLight = freshnessRule.sendType === "mixed" ? Math.floor(adjustedLoot / smartConfig.light_capacity) : 0;
    var classification = "mixed_candidate";
    if (wallAndDistance.wallLevel > 3) {
        classification = "wall_skip_candidate";
    } else if (freshnessRule.sendType === "spy_only") {
        classification = "spy_only_candidate";
    } else if (wallMinimumLight === null || fullyLoadableLight < wallMinimumLight) {
        classification = "below_wall_min_candidate";
    }
    var target = {
        rowOrder: rowOrder,
        targetVillageId: String(targetVillageId),
        coords: coords,
        freshnessText: smartNormalizeText($freshnessCell.text()),
        freshnessMinutes: freshnessMinutes,
        freshnessRule: freshnessRule,
        expectedLoot: resources.total,
        resourceBreakdown: resources,
        adjustedLoot: adjustedLoot,
        fullyLoadableLight: fullyLoadableLight,
        wallLevel: wallAndDistance.wallLevel,
        wallMinimumLight: wallMinimumLight,
        distanceText: wallAndDistance.distanceText,
        outgoingCount: smartExtractOutgoingCount($row),
        classification: classification
    };
    result.targets.push(target);
    return target;
}
async function smartStartRunner() {
    if (smartState.isRunning) {
        return;
    }
    if (!filtersApplied) {
        smartState.isHoldingEnter = false;
        smartShowError("Smart mode requires the current LA filters to be applied first.");
        return;
    }
    smartState.isRunning = true;
    smartState.stopRequested = false;
    smartState.stopReason = "";
    smartState.planningInProgress = false;
    smartState.executionInProgress = false;
    smartState.lastStopPhase = "";
    smartState.lastExecutionStopStage = "";
    smartState.runSerial++;
    smartState.originalVillageId = String(window.top.game_data.village.id);
    smartState.originalVillageName = window.top.game_data.village.name;
    smartState.originalFiltersApplied = !!filtersApplied;
    smartResetPlanningState();
    smartLogStage("runner", "Starting rewritten smart engine from " + window.top.game_data.village.display_name + ".");
    try {
        var plan = await smartBuildExecutionPlan();
        smartState.lastPlan = plan;
        if (!plan.jobs.length) {
            if (plan.diagnostics && plan.diagnostics.noVisibleTargets) {
                smartShowInfo("Smart mode found no visible targets after current LA filtering.");
            } else {
                smartShowInfo("Smart mode found no eligible visible targets.");
            }
            return;
        }
        smartShowInfo("Smart queue ready: " + plan.jobs.length + " jobs from " + plan.groups.length + " villages.");
        if (smartShouldStopDispatch()) {
            smartState.lastExecutionStopStage = "planning_complete_but_execution_stopped";
            smartLogStage("runner.stop", "planning_complete_but_execution_stopped: planning produced " + plan.jobs.length + " jobs, but execution was stopped before dispatch. Reason: " + (smartState.stopReason || "unknown") + ".");
            smartShowInfo("Smart planning completed, but execution was stopped before dispatch.");
            return;
        }
        await smartExecutePlan(plan);
    } catch (error) {
        smartShowError(error.message || String(error));
    } finally {
        smartState.planningInProgress = false;
        smartState.executionInProgress = false;
        var restoreNeeded = smartState.originalVillageId && String(window.top.game_data.village.id) !== String(smartState.originalVillageId);
        if (restoreNeeded) {
            try {
                await smartRestoreOriginalVillage();
            } catch (restoreError) {
                smartShowError("Failed to restore original village: " + (restoreError.message || restoreError));
            }
        }
        smartLogStage("runner", "Runner finished.");
        smartState.isHoldingEnter = false;
        smartState.isRunning = false;
        smartState.stopRequested = false;
        smartResetPlanningState();
    }
}
async function smartBuildExecutionPlan() {
    smartState.planningInProgress = true;
    currentGameTime = getCurrentGameTime();
    var diagnostics = {
        noVisibleTargets: false,
        malformedTargetCounts: {},
        planningSkipCounts: {},
        planningCompleted: false,
        planningInterrupted: false
    };
    try {
        var targetParse = smartParseVisibleTargets();
        diagnostics.noVisibleTargets = !targetParse.candidateRowCount;
        diagnostics.malformedTargetCounts = targetParse.malformedCounts || {};
        if (!targetParse.targets.length) {
            diagnostics.planningCompleted = true;
            return {jobs: [], groups: [], diagnostics: diagnostics};
        }
        var offensiveGroupId = await smartFetchOffensiveGroupId();
        var sourceParse = await smartFetchOffensiveSources(offensiveGroupId);
        var sourcePool = smartCloneSourcePool(sourceParse.sources);
        var jobs = [];
        for (var i = 0; i < targetParse.targets.length; i++) {
            var job = smartPlanJobForTarget(targetParse.targets[i], sourcePool, diagnostics.planningSkipCounts);
            if (job) {
                jobs.push(job);
            }
        }
        diagnostics.planningCompleted = true;
        if (!jobs.length) {
            smartLogStage("plan.none", "Visible targets were parsed (" + targetParse.targets.length + "), but none were eligible. Reasons: " + smartFormatCounterMap(diagnostics.planningSkipCounts) + ".");
        } else {
            smartLogStage("plan", "Planned " + jobs.length + " jobs from " + targetParse.targets.length + " parsed visible targets.");
        }
        return {
            groupId: offensiveGroupId,
            sourceParseResult: sourceParse,
            jobs: jobs,
            groups: smartGroupPlanJobs(jobs),
            diagnostics: diagnostics
        };
    } catch (error) {
        diagnostics.planningInterrupted = true;
        smartLogStage("plan.interrupted", "planning_interrupted: " + (error.message || String(error)));
        throw error;
    } finally {
        smartState.planningInProgress = false;
    }
}
async function smartFetchOffensiveGroupId() {
    var url = window.location.origin + "/game.php?" + sitter + "village=" + window.top.game_data.village.id + "&screen=overview_villages&mode=groups&type=static";
    var html = await smartAjaxRequest({type: "GET", url: url, dataType: "html"});
    var doc = smartParseDocument(html);
    var $doc = window.top.$(doc);
    var candidateIds = {};
    $doc.find("strong.group-menu-item[data-group-id][data-group-type='static']").each(function () {
        var $item = window.top.$(this);
        var text = window.top.$.trim($item.text());
        if (text === "Offensive") {
            var candidateId = $item.attr("data-group-id");
            if (candidateId) {
                candidateIds[String(candidateId)] = true;
            }
        }
    });
    $doc.find("option[value]").each(function () {
        var $option = window.top.$(this);
        var text = window.top.$.trim($option.text());
        if (text === "Offensive") {
            var candidateId = $option.attr("value");
            if (candidateId) {
                candidateIds[String(candidateId)] = true;
            }
        }
    });
    $doc.find("a[href*='group='], a[href*='group_id=']").each(function () {
        var text = window.top.$.trim(window.top.$(this).text());
        if (text === "Offensive") {
            var href = window.top.$(this).attr("href") || "";
            var candidateId = smartExtractQueryParam(href, "group") || smartExtractQueryParam(href, "group_id");
            if (candidateId) {
                candidateIds[String(candidateId)] = true;
            }
        }
    });
    var resolvedIds = Object.keys(candidateIds);
    if (!resolvedIds.length) {
        throw new Error("[group] Could not resolve the static Offensive group id from exact strong, option, or link matches.");
    }
    if (resolvedIds.length > 1) {
        throw new Error("[group] Conflicting Offensive group ids were found across exact strong/option/link matches: " + resolvedIds.join(", ") + ".");
    }
    var groupId = resolvedIds[0];
    smartLogStage("group", "Resolved Offensive group id " + groupId + ".");
    return String(groupId);
}
async function smartFetchOffensiveSources(groupId) {
    var url = window.location.origin + "/game.php?" + sitter + "village=" + window.top.game_data.village.id + "&screen=overview_villages&mode=units&group=" + groupId;
    var html = await smartAjaxRequest({type: "GET", url: url, dataType: "html"});
    var doc = smartParseDocument(html);
    var $doc = window.top.$(doc);
    var parseResult = smartParseOffensiveSources($doc);
    if (!parseResult.sources.length) {
        throw new Error("[sources] The Offensive units overview did not contain any parsable villages.");
    }
    smartLogStage("sources", "Parsed " + parseResult.sources.length + " Offensive villages from table #" + (parseResult.tableIndex + 1) + ".");
    return parseResult;
}
function smartGetDirectTableRows($table) {
    var $rows = $table.children("tbody,thead,tfoot").children("tr");
    if (!$rows.length) {
        $rows = $table.children("tr");
    }
    return $rows;
}
function smartGetUnitsColumnIndexes($table) {
    var indexes = {
        spyIndex: -1,
        lightIndex: -1,
        headerRowIndex: -1,
        valid: false
    };
    var $rows = smartGetDirectTableRows($table);
    $rows.each(function (rowIndex) {
        var spyIndex = -1;
        var lightIndex = -1;
        var $cells = window.top.$(this).children("th,td");
        if ($cells.length < 3) {
            return;
        }
        $cells.each(function (cellIndex) {
            var html = String(window.top.$(this).html() || "");
            if (spyIndex === -1 && html.indexOf("unit_spy") > -1) {
                spyIndex = cellIndex;
            }
            if (lightIndex === -1 && html.indexOf("unit_light") > -1) {
                lightIndex = cellIndex;
            }
        });
        if (spyIndex > -1 && lightIndex > -1 && spyIndex !== lightIndex) {
            indexes.spyIndex = spyIndex;
            indexes.lightIndex = lightIndex;
            indexes.headerRowIndex = rowIndex;
            indexes.valid = spyIndex > 0 && lightIndex > 0;
            return false;
        }
    });
    return indexes;
}
function smartFindSourceVillageLink($row) {
    var $preferred = $row.find("a[href*='village='][href*='screen=overview']").filter(function () {
        return String(window.top.$(this).attr("href") || "").indexOf("screen=overview_villages") === -1;
    }).first();
    if ($preferred.length) {
        return $preferred;
    }
    return $row.find("a[href*='village=']").filter(function () {
        return String(window.top.$(this).attr("href") || "").indexOf("screen=overview_villages") === -1;
    }).first();
}
function smartNormalizeLowerText(value) {
    return smartNormalizeText(value).toLowerCase();
}
function smartIsHelperSourceLabel(textLower) {
    var normalized = String(textLower || "").replace(/\s+/g, " ").trim();
    if (!normalized) {
        return false;
    }
    normalized = normalized.replace(/\(\d+\)$/g, "").replace(/\s+\d+$/g, "").replace(/[:\-]+$/g, "").trim();
    return /^(all|troops|commands|mail|production|combined|overview|overviews|attacks|defenses|villages|units|reports|favorites|favourites|support|your own|here|in village|outwards|in transit|total)$/.test(normalized);
}
function smartClassifySourceRowType(meta) {
    if (!meta || meta.reason) {
        return meta && meta.reason === "helper_row" ? "helper" : "malformed";
    }
    return "village";
}
function smartExtractSourceRowMeta($row) {
    var $cells = $row.children("th,td");
    var $villageLink = smartFindSourceVillageLink($row);
    if (!$villageLink.length) {
        return {reason: "missing_village_link"};
    }
    var villageCellText = $cells.length ? smartNormalizeText($cells.eq(0).text()) : "";
    var rowText = smartNormalizeText($row.text());
    var linkText = smartNormalizeText($villageLink.text());
    var villageCellLower = smartNormalizeLowerText(villageCellText);
    var rowTextLower = smartNormalizeLowerText(rowText);
    var linkTextLower = smartNormalizeLowerText(linkText);
    if (smartIsHelperSourceLabel(villageCellLower) || smartIsHelperSourceLabel(linkTextLower)) {
        return {
            reason: "helper_row",
            villageName: linkText || villageCellText || rowText,
            rowText: rowText,
            villageCellText: villageCellText,
            linkText: linkText
        };
    }
    if ((rowTextLower.indexOf("your own") > -1 || /\bin village\b|\bhere\b|\boutwards\b|\bin transit\b|\btotal\b/.test(rowTextLower)) && !smartParseCoords(villageCellText) && !smartParseCoords(rowText) && !smartParseCoords(linkText)) {
        return {
            reason: "helper_row",
            villageName: linkText || villageCellText || rowText,
            rowText: rowText,
            villageCellText: villageCellText,
            linkText: linkText
        };
    }
    var href = String($villageLink.attr("href") || "");
    var villageId = smartExtractQueryParam(href, "village") || smartExtractQueryParam(href, "id");
    if (!villageId) {
        return {reason: "missing_village_id"};
    }
    var coords = smartParseCoords(villageCellText) || smartParseCoords(rowText) || smartParseCoords(linkText);
    if (!coords) {
        return {
            reason: "missing_coords",
            villageId: String(villageId),
            villageName: linkText || villageCellText || rowText
        };
    }
    return {
        villageId: String(villageId),
        villageName: linkText || villageCellText || ("Village " + villageId),
        coords: coords,
        $cells: $cells,
        rowText: rowText,
        villageCellText: villageCellText,
        linkText: linkText
    };
}
function smartInspectUnitsTable($table, tableIndex) {
    var report = {
        tableIndex: tableIndex,
        $table: $table,
        directRowCount: 0,
        rowsWithVillageLinks: 0,
        rowsWithVillageIds: 0,
        rowsWithCoords: 0,
        rowsWithReadableCounts: 0,
        recognizedRows: 0,
        sendableRows: 0,
        uniqueVillageCount: 0,
        parsedRows: [],
        rejectReason: "",
        unitIndexes: smartGetUnitsColumnIndexes($table)
    };
    var uniqueVillageIds = {};
    var maxColumnIndex = Math.max(report.unitIndexes.spyIndex, report.unitIndexes.lightIndex);
    if (!report.unitIndexes.valid) {
        report.rejectReason = "missing_distinct_spy_light_columns";
        return report;
    }
    var $rows = smartGetDirectTableRows($table);
    report.directRowCount = $rows.length;
    $rows.each(function () {
        var $row = window.top.$(this);
        var rowText = smartNormalizeText($row.text());
        if (rowText === "") {
            return;
        }
        var $villageLink = smartFindSourceVillageLink($row);
        if (!$villageLink.length) {
            return;
        }
        var meta = smartExtractSourceRowMeta($row);
        var rowType = smartClassifySourceRowType(meta);
        if (rowType === "helper") {
            return;
        }
        report.rowsWithVillageLinks++;
        if (meta.reason === "missing_village_id") {
            smartLogStage("sources.row", "Skipping source-like row because the village id could not be extracted from village= or id= query parameters.");
            return;
        }
        if (meta.reason === "missing_coords") {
            smartLogStage("sources.row", "Skipping source-like row for " + (meta.villageName || meta.villageId || "unknown") + " because coordinates could not be extracted from the first village cell or full row text.");
            return;
        }
        if (meta.reason) {
            return;
        }
        report.recognizedRows++;
        report.rowsWithVillageIds++;
        report.rowsWithCoords++;
        var $cells = meta.$cells || $row.children("th,td");
        if ($cells.length <= maxColumnIndex) {
            smartLogStage("sources.row", "Skipping village row for " + meta.villageName + " because the row does not expose enough direct cells for the spy/light columns.");
            return;
        }
        var spyCount = smartNormalizeCount($cells.eq(report.unitIndexes.spyIndex).text());
        var lightCount = smartNormalizeCount($cells.eq(report.unitIndexes.lightIndex).text());
        if (spyCount === null || lightCount === null) {
            smartLogStage("sources.row", "Skipping village row for " + meta.villageName + " because spy/light counts could not be read safely.");
            return;
        }
        report.rowsWithReadableCounts++;
        uniqueVillageIds[meta.villageId] = true;
        report.sendableRows++;
        report.parsedRows.push({
            villageId: meta.villageId,
            villageName: meta.villageName,
            coords: meta.coords,
            rowType: rowType,
            spyCount: Math.max(0, parseInt(spyCount, 10)),
            lightCount: Math.max(0, parseInt(lightCount, 10)),
            rowText: meta.rowText
        });
    });
    report.uniqueVillageCount = Object.keys(uniqueVillageIds).length;
    if (!report.rowsWithVillageLinks) {
        report.rejectReason = "no_village_rows";
    } else if (!report.rowsWithVillageIds) {
        report.rejectReason = "village_ids_missing";
    } else if (!report.rowsWithCoords) {
        report.rejectReason = "coords_missing";
    } else if (!report.rowsWithReadableCounts) {
        report.rejectReason = "unit_counts_missing";
    } else if (report.sendableRows < smartConfig.minimum_strict_source_rows) {
        report.rejectReason = "insufficient_sendable_rows";
    } else if (!report.uniqueVillageCount) {
        report.rejectReason = "no_unique_villages";
    } else {
        report.rejectReason = "";
    }
    return report;
}
function smartSelectOffensiveUnitsTable($doc) {
    var reports = [];
    var bestReport = null;
    $doc.find("table").each(function (tableIndex) {
        var report = smartInspectUnitsTable(window.top.$(this), tableIndex);
        reports.push(report);
        if (report.rejectReason) {
            return;
        }
        if (!bestReport ||
            report.uniqueVillageCount > bestReport.uniqueVillageCount ||
            (report.uniqueVillageCount === bestReport.uniqueVillageCount && report.sendableRows > bestReport.sendableRows) ||
            (report.uniqueVillageCount === bestReport.uniqueVillageCount && report.sendableRows === bestReport.sendableRows && report.rowsWithReadableCounts > bestReport.rowsWithReadableCounts)) {
            bestReport = report;
        }
    });
    if (bestReport) {
        smartLogStage("sources.table", "Selected Offensive units table #" + (bestReport.tableIndex + 1) + " with " + bestReport.uniqueVillageCount + " villages, " + bestReport.sendableRows + " sendable rows, and spy/light columns at indexes " + bestReport.unitIndexes.spyIndex + "/" + bestReport.unitIndexes.lightIndex + ".");
        return bestReport;
    }
    var diagnostics = [];
    for (var i = 0; i < reports.length && diagnostics.length < smartConfig.maximum_table_diagnostics; i++) {
        var report = reports[i];
        if (!report.unitIndexes.valid && report.rejectReason === "missing_distinct_spy_light_columns") {
            continue;
        }
        diagnostics.push("#" + (report.tableIndex + 1) + ": " + report.rejectReason + " (directRows=" + report.directRowCount + ", villageRows=" + report.rowsWithVillageLinks + ", villages=" + report.uniqueVillageCount + ", sendableRows=" + report.sendableRows + ")");
    }
    if (!diagnostics.length) {
        throw new Error("[sources.table] No candidate tables exposed distinct spy/light columns together with direct village rows.");
    }
    smartLogStage("sources.table", "Rejected units-table candidates: " + diagnostics.join("; ") + ".");
    throw new Error("[sources.table] Candidate units tables were found, but none matched the strict village-row criteria.");
}
function smartParseOffensiveSources($doc) {
    var tableReport = smartSelectOffensiveUnitsTable($doc);
    var sourceMap = {};
    for (var i = 0; i < tableReport.parsedRows.length; i++) {
        var row = tableReport.parsedRows[i];
        if (!sourceMap[row.villageId]) {
            sourceMap[row.villageId] = {
                villageId: row.villageId,
                villageName: row.villageName,
                coords: row.coords,
                availableSpy: row.spyCount,
                availableLight: row.lightCount
            };
        } else {
            sourceMap[row.villageId].availableSpy = Math.min(sourceMap[row.villageId].availableSpy, row.spyCount);
            sourceMap[row.villageId].availableLight = Math.min(sourceMap[row.villageId].availableLight, row.lightCount);
        }
    }
    var sources = [];
    window.top.$.each(sourceMap, function (_, entry) {
        if (entry.availableSpy === null || entry.availableLight === null) {
            smartLogStage("sources.row", "Skipping Offensive source " + entry.villageName + " because sendable spy/light availability could not be resolved safely from village rows.");
            return;
        }
        sources.push({
            villageId: String(entry.villageId),
            villageName: entry.villageName,
            coords: entry.coords,
            availableSpy: Math.max(0, parseInt(entry.availableSpy, 10)),
            availableLight: Math.max(0, parseInt(entry.availableLight, 10))
        });
    });
    if (!sources.length) {
        throw new Error("[sources.row] The Offensive units table was found, but no safe source villages remained after conservative availability filtering.");
    }
    return {
        tableIndex: tableReport.tableIndex,
        tableReport: tableReport,
        sources: sources
    };
}
function smartCloneSourcePool(sources) {
    var clones = [];
    for (var i = 0; i < sources.length; i++) {
        clones.push({
            villageId: String(sources[i].villageId),
            villageName: sources[i].villageName,
            coords: {
                x: sources[i].coords.x,
                y: sources[i].coords.y,
                text: sources[i].coords.text
            },
            availableSpy: parseInt(sources[i].availableSpy, 10),
            availableLight: parseInt(sources[i].availableLight, 10)
        });
    }
    return clones;
}
function smartPlanJobForTarget(target, sourcePool, planningSkipCounts) {
    var rowLabel = "row " + target.rowOrder + " target " + target.coords.text;
    if (target.outgoingCount > 0) {
        smartIncrementCounter(planningSkipCounts, "existing_outgoing");
        smartLogStage("plan.skip", "Skipping " + rowLabel + ": existing outgoing attacks (" + target.outgoingCount + ").");
        return null;
    }
    if (target.classification === "wall_skip_candidate") {
        smartIncrementCounter(planningSkipCounts, "wall_above_3");
        smartLogStage("plan.skip", "Skipping " + rowLabel + ": wall " + target.wallLevel + " exceeds smart limit.");
        return null;
    }
    var sendType = target.freshnessRule.sendType;
    var spyCount = sendType === "spy_only" ? 1 : 0;
    var lightCount = 0;
    if (sendType === "mixed") {
        if (target.wallMinimumLight === null) {
            smartIncrementCounter(planningSkipCounts, "unsupported_wall_value");
            smartLogStage("plan.skip", "Skipping " + rowLabel + ": unsupported wall value " + target.wallLevel + ".");
            return null;
        }
        if (target.fullyLoadableLight < target.wallMinimumLight) {
            smartIncrementCounter(planningSkipCounts, "below_wall_min_full_load");
            smartLogStage("plan.skip", "Skipping " + rowLabel + ": " + smartDescribeTargetClassification(target) + ".");
            return null;
        }
        lightCount = target.fullyLoadableLight;
    }
    var bestSource = null;
    var bestDistance = null;
    for (var i = 0; i < sourcePool.length; i++) {
        var source = sourcePool[i];
        if (source.availableSpy < spyCount) {
            continue;
        }
        if (lightCount > 0 && source.availableLight < lightCount) {
            continue;
        }
        var pairKey = source.villageId + ":" + target.targetVillageId;
        if (smartState.planningReservations[pairKey] || smartState.targetReservations[target.targetVillageId] || smartState.queuedPairs[pairKey]) {
            continue;
        }
        var sourceDistance = smartDistance(source.coords, target.coords);
        if (bestSource === null || sourceDistance < bestDistance) {
            bestSource = source;
            bestDistance = sourceDistance;
        }
    }
    if (!bestSource) {
        smartIncrementCounter(planningSkipCounts, "no_eligible_source");
        smartLogStage("plan.skip", "Skipping " + rowLabel + ": no eligible Offensive source village had the required units.");
        return null;
    }
    var key = bestSource.villageId + ":" + target.targetVillageId;
    smartState.planningReservations[key] = true;
    smartState.targetReservations[target.targetVillageId] = true;
    smartState.queuedPairs[key] = true;
    bestSource.availableSpy -= spyCount;
    bestSource.availableLight -= lightCount;
    smartLogStage("plan.queue", "Queued " + rowLabel + " from " + bestSource.villageName + " as " + sendType + " (spy " + spyCount + ", lc " + lightCount + ", distance " + bestDistance.toFixed(2) + ").");
    return {
        key: key,
        sourceVillageId: bestSource.villageId,
        sourceVillageName: bestSource.villageName,
        targetVillageId: target.targetVillageId,
        targetCoords: target.coords,
        freshnessMinutes: target.freshnessMinutes,
        freshnessText: target.freshnessText,
        freshnessBucket: target.freshnessRule.bucket,
        expectedLoot: target.expectedLoot,
        adjustedLoot: target.adjustedLoot,
        wallLevel: target.wallLevel,
        sendType: sendType,
        spyCount: spyCount,
        lightCount: lightCount,
        distance: bestDistance,
        rowOrder: target.rowOrder
    };
}
function smartDistance(sourceCoords, targetCoords) {
    var dx = sourceCoords.x - targetCoords.x;
    var dy = sourceCoords.y - targetCoords.y;
    return Math.sqrt(dx * dx + dy * dy);
}
function smartGroupPlanJobs(jobs) {
    var groups = [];
    var groupMap = {};
    for (var i = 0; i < jobs.length; i++) {
        var job = jobs[i];
        if (!groupMap[job.sourceVillageId]) {
            groupMap[job.sourceVillageId] = {
                sourceVillageId: job.sourceVillageId,
                sourceVillageName: job.sourceVillageName,
                jobs: []
            };
            groups.push(groupMap[job.sourceVillageId]);
        }
        groupMap[job.sourceVillageId].jobs.push(job);
    }
    return groups;
}
async function smartExecutePlan(plan) {
    smartState.executionInProgress = true;
    smartState.lastExecutionStopStage = "";
    var lastDispatchAt = 0;
    try {
        for (var i = 0; i < plan.groups.length; i++) {
            if (smartShouldStopDispatch()) {
                smartState.lastExecutionStopStage = "execution_stopped_before_next_dispatch";
                smartLogStage("runner.stop", "execution_stopped_before_next_dispatch: stop was requested before processing the next source village. Reason: " + (smartState.stopReason || "unknown") + ".");
                return {stopped: true, stage: smartState.lastExecutionStopStage};
            }
            var group = plan.groups[i];
            smartLogStage("execute.group", "Processing " + group.jobs.length + " jobs from " + group.sourceVillageName + ".");
            await smartEnsureActiveVillage(group.sourceVillageId, group.sourceVillageName);
            for (var j = 0; j < group.jobs.length; j++) {
                if (smartShouldStopDispatch()) {
                    smartState.lastExecutionStopStage = "execution_stopped_before_next_dispatch";
                    smartLogStage("runner.stop", "execution_stopped_before_next_dispatch: stop was requested before dispatching the next job. Reason: " + (smartState.stopReason || "unknown") + ".");
                    return {stopped: true, stage: smartState.lastExecutionStopStage};
                }
                var waitFor = lastDispatchAt ? smartConfig.dispatch_interval_ms - (Date.now() - lastDispatchAt) : 0;
                if (waitFor > 0) {
                    await smartDelay(waitFor);
                    if (smartShouldStopDispatch()) {
                        smartState.lastExecutionStopStage = "execution_stopped_before_next_dispatch";
                        smartLogStage("runner.stop", "execution_stopped_before_next_dispatch: stop was requested while waiting for the next dispatch slot. Reason: " + (smartState.stopReason || "unknown") + ".");
                        return {stopped: true, stage: smartState.lastExecutionStopStage};
                    }
                }
                await smartExecuteJob(group.jobs[j]);
                lastDispatchAt = Date.now();
                if (smartShouldStopDispatch()) {
                    smartState.lastExecutionStopStage = "execution_stopped_after_in_flight";
                    smartLogStage("runner.stop", "execution_stopped_after_in_flight: the current request finished, and execution will not dispatch another job. Reason: " + (smartState.stopReason || "unknown") + ".");
                    return {stopped: true, stage: smartState.lastExecutionStopStage};
                }
            }
        }
        return {stopped: false, stage: "execution_completed"};
    } finally {
        smartState.executionInProgress = false;
    }
}
async function smartEnsureActiveVillage(villageId, villageName) {
    if (String(window.top.game_data.village.id) === String(villageId)) {
        return;
    }
    await smartSwitchToVillage(villageId, "Switching smart mode to " + villageName + "...");
    if (String(window.top.game_data.village.id) !== String(villageId)) {
        throw new Error("[execute.switch] Active village mismatch after switching to " + villageName + ".");
    }
}
async function smartSwitchToVillage(villageId, infoMessage) {
    if (infoMessage) {
        smartShowInfo(infoMessage);
    }
    window.onkeydown = function () {
    };
    cansend = false;
    filtersApplied = false;
    smartState.skipAutoRunOnce = true;
    Timing.pause();
    fadeThanksToCheese();
    openLoader();
    var vlink = link[0] + villageId + link[1];
    var data = await smartAjaxRequest({type: "GET", url: vlink, dataType: "html"});
    var v = window.top.$(data);
    var titleMatch = /<\s*title\s*>([^<]+)<\/title\s*>/i.exec(data);
    var title = titleMatch ? titleMatch[1] : window.top.document.title;
    var gameDataParts = data.split("TribalWars.updateGameData(");
    if (gameDataParts.length < 2) {
        throw new Error("[execute.switch] Village switch failed: TribalWars.updateGameData missing for village " + villageId + ".");
    }
    var newGameData = window.top.$.parseJSON(gameDataParts[1].split(");")[0]);
    window.top.game_data = newGameData;
    smartState.pendingVillageSwitch = {villageId: String(villageId)};
    if (typeof history !== "undefined" && typeof history.pushState === "function") {
        history.pushState({}, window.top.game_data.village.name + " - Loot Assistant", "https://" + window.top.location.host + window.top.game_data.link_base_pure + "am_farm");
    }
    window.top.$("#header_info").html(window.top.$("#header_info", v).html());
    window.top.$("#topContainer").html(window.top.$("#topContainer", v).html());
    window.top.$("#contentContainer").html(window.top.$("#contentContainer", v).html());
    window.top.$("#quickbar_inner").html(window.top.$("#quickbar_inner", v).html());
    window.top.$("head").find("title").html(title);
    window.top.$("#fader").remove();
    window.top.$("#loaders").remove();
    Timing.resetTickHandlers();
    Timing.pause();
    pagesLoaded = false;
    cansend = false;
    run();
}
async function smartExecuteJob(job) {
    var ledgerKey = [job.sourceVillageId, job.targetVillageId, job.sendType, job.lightCount, job.spyCount].join(":");
    if (smartState.sentLedger[ledgerKey]) {
        smartLogStage("execute.job", "Skipping duplicate queued job " + ledgerKey + ".");
        return;
    }
    if (smartState.inFlightJobs[ledgerKey]) {
        smartLogStage("execute.job", "Skipping in-flight duplicate job " + ledgerKey + ".");
        return;
    }
    if (String(window.top.game_data.village.id) !== String(job.sourceVillageId)) {
        throw new Error("[execute.job] Active village mismatch before send for " + job.targetCoords.text + ".");
    }
    smartState.inFlightJobs[ledgerKey] = true;
    smartLogStage("execute.job", "Sending " + job.sendType + " job to " + job.targetCoords.text + " from " + job.sourceVillageName + ".");
    try {
        var initialPage = await smartFetchPlacePage(job);
        var initialRequest = smartBuildInitialPlaceRequest(initialPage, job);
        var confirmHtml = await smartAjaxRequest({
            type: "POST",
            url: initialRequest.url,
            dataType: "html",
            data: initialRequest.data
        });
        var confirmDoc = smartParseDocument(confirmHtml);
        var confirmRequest = smartBuildFinalConfirmRequest(confirmDoc, confirmHtml, job);
        var successHtml = await smartAjaxRequest({
            type: "POST",
            url: confirmRequest.url,
            dataType: "html",
            data: confirmRequest.data
        });
        var successDoc = smartParseDocument(successHtml);
        smartVerifyReturnedSuccess(initialPage, successHtml, successDoc, job);
        smartState.sentLedger[ledgerKey] = true;
        setLocalStorageRow(job.targetVillageId);
        smartLogStage("execute.job", "Confirmed success for " + ledgerKey + ".");
    } finally {
        delete smartState.inFlightJobs[ledgerKey];
    }
}
async function smartFetchPlacePage(job) {
    var url = window.location.origin + "/game.php?" + sitter + "village=" + job.sourceVillageId + "&screen=place&target=" + job.targetVillageId;
    var html = await smartAjaxRequest({type: "GET", url: url, dataType: "html"});
    var doc = smartParseDocument(html);
    var $doc = window.top.$(doc);
    var pageGameData = smartExtractPageGameData(html);
    if (!pageGameData || !pageGameData.village || String(pageGameData.village.id) !== String(job.sourceVillageId)) {
        throw new Error("[execute.place] Place page loaded with the wrong active village for " + job.targetCoords.text + ".");
    }
    if (pageGameData.screen !== "place") {
        throw new Error("[execute.place] Place page response is not a place screen for " + job.targetCoords.text + ".");
    }
    return {
        url: url,
        html: html,
        doc: doc,
        pageGameData: pageGameData,
        outgoingSnapshot: smartBuildOutgoingSnapshot($doc, job)
    };
}
function smartBuildInitialPlaceRequest(initialPage, job) {
    var $doc = window.top.$(initialPage.doc);
    var $form = $doc.find("form").filter(function () {
        return window.top.$(this).find("input[name='spy'],input[name='light']").length > 0;
    }).first();
    if (!$form.length) {
        throw new Error("[execute.place] Place page form for " + job.targetCoords.text + " is missing required unit inputs.");
    }
    var $spyInput = $form.find("input[name='spy']").first();
    var $lightInput = $form.find("input[name='light']").first();
    if (!$spyInput.length || !$lightInput.length) {
        throw new Error("[execute.place] Place page form for " + job.targetCoords.text + " does not expose spy/light inputs.");
    }
    var submitDescriptor = smartFindActionSubmit($form, "attack");
    if (!submitDescriptor) {
        throw new Error("[execute.place] Place page form for " + job.targetCoords.text + " is missing the attack submit button.");
    }
    return {
        url: smartToAbsoluteUrl($form.attr("action") || initialPage.url),
        data: smartSerializeForm($form, {
            spy: job.spyCount,
            light: job.lightCount
        }, submitDescriptor)
    };
}
function smartBuildFinalConfirmRequest(doc, confirmHtml, job) {
    var $doc = window.top.$(doc);
    var $form = $doc.find("form").filter(function () {
        var action = window.top.$(this).attr("action") || "";
        return action.indexOf("action=command") > -1 || window.top.$(this).find("[name='submit_confirm']").length > 0;
    }).first();
    if (!$form.length) {
        throw new Error("[execute.confirm] Confirm page for " + job.targetCoords.text + " is missing the final confirm form.");
    }
    var submitDescriptor = smartFindActionSubmit($form, "submit_confirm");
    if (!submitDescriptor) {
        throw new Error("[execute.confirm] Confirm page for " + job.targetCoords.text + " is missing submit_confirm.");
    }
    var formAction = $form.attr("action");
    if (!formAction) {
        throw new Error("[execute.confirm] Confirm page for " + job.targetCoords.text + " is missing the form action URL.");
    }
    var serialized = $form.serializeArray();
    smartVerifyConfirmPayload(serialized, confirmHtml, job);
    return {
        url: smartToAbsoluteUrl(formAction),
        data: smartSerializeForm($form, {}, submitDescriptor)
    };
}
function smartVerifyConfirmPayload(serialized, confirmHtml, job) {
    var sourceVillage = smartGetFormValue(serialized, ["source_village"]);
    if (sourceVillage !== null && String(sourceVillage) !== String(job.sourceVillageId)) {
        throw new Error("[execute.confirm] Confirm page source village mismatch for " + job.targetCoords.text + ".");
    }
    var spyValue = smartGetFormValue(serialized, ["send_units[spy]", "spy"]);
    var lightValue = smartGetFormValue(serialized, ["send_units[light]", "light"]);
    if (spyValue === null) {
        var spyMatch = confirmHtml.match(/"spy"\s*:\s*([0-9]+)/);
        if (spyMatch) {
            spyValue = spyMatch[1];
        }
    }
    if (lightValue === null) {
        var lightMatch = confirmHtml.match(/"light"\s*:\s*([0-9]+)/);
        if (lightMatch) {
            lightValue = lightMatch[1];
        }
    }
    if (spyValue !== null && parseInt(spyValue, 10) !== job.spyCount) {
        throw new Error("[execute.confirm] Confirm page spy count mismatch for " + job.targetCoords.text + ".");
    }
    if (lightValue !== null && parseInt(lightValue, 10) !== job.lightCount) {
        throw new Error("[execute.confirm] Confirm page light count mismatch for " + job.targetCoords.text + ".");
    }
}
function smartBuildOutgoingSnapshot($doc, job) {
    var matches = [];
    var seen = {};
    var $container = $doc.find("#commands_outgoings, [id*='commands_outgoings'], .commands_outgoings").first();
    var $rows = $container.length ? $container.find("tr") : $doc.find("tr");
    $rows.each(function () {
        var $row = window.top.$(this);
        var rowText = smartNormalizeText($row.text());
        if (rowText === "") {
            return;
        }
        var rowHtml = $row.html() || "";
        var targetMatched = rowText.indexOf(job.targetCoords.text) > -1 ||
            rowHtml.indexOf("target=" + job.targetVillageId) > -1 ||
            rowHtml.indexOf("screen=info_village&amp;id=" + job.targetVillageId) > -1 ||
            rowHtml.indexOf("screen=info_village&id=" + job.targetVillageId) > -1;
        if (!targetMatched) {
            return;
        }
        var rowType = (String($row.attr("data-command-type") || "")).toLowerCase();
        var attackLike = rowType === "attack" ||
            rowHtml.indexOf("data-command-type=\"attack\"") > -1 ||
            rowHtml.indexOf("data-command-type='attack'") > -1 ||
            rowText.indexOf("Attack on ") > -1 ||
            rowText.indexOf("Looting attack") > -1 ||
            rowHtml.indexOf("command/farm") > -1 ||
            rowHtml.indexOf("command/attack") > -1 ||
            rowHtml.indexOf("command/spy") > -1;
        if (!attackLike) {
            return;
        }
        var rowId = String($row.attr("data-command-id") || "");
        if (!rowId) {
            var idAttr = String($row.attr("id") || "");
            var idMatch = idAttr.match(/(\d{6,})/);
            if (idMatch) {
                rowId = idMatch[1];
            }
        }
        if (!rowId) {
            $row.find("a[href*='screen=info_command']").each(function () {
                var hrefId = smartExtractQueryParam(window.top.$(this).attr("href"), "id");
                if (hrefId) {
                    rowId = hrefId;
                    return false;
                }
            });
        }
        var fingerprint = rowId || (rowText + "|" + rowHtml.length);
        if (seen[fingerprint]) {
            return;
        }
        seen[fingerprint] = true;
        matches.push({
            id: rowId,
            text: rowText,
            fingerprint: fingerprint
        });
    });
    return {
        count: matches.length,
        matches: matches
    };
}
function smartSnapshotFingerprints(snapshot) {
    var fingerprints = {};
    var ids = {};
    for (var i = 0; i < snapshot.matches.length; i++) {
        fingerprints[snapshot.matches[i].fingerprint] = true;
        if (snapshot.matches[i].id) {
            ids[snapshot.matches[i].id] = true;
        }
    }
    return {
        fingerprints: fingerprints,
        ids: ids
    };
}
function smartVerifyReturnedSuccess(initialPage, successHtml, successDoc, job) {
    var $doc = window.top.$(successDoc);
    var pageGameData = smartExtractPageGameData(successHtml);
    if (!pageGameData || !pageGameData.village || String(pageGameData.village.id) !== String(job.sourceVillageId)) {
        throw new Error("[execute.verify] Success page village mismatch for " + job.targetCoords.text + ".");
    }
    if (pageGameData.screen !== "place") {
        throw new Error("[execute.verify] Success page is not a place screen for " + job.targetCoords.text + ".");
    }
    var afterSnapshot = smartBuildOutgoingSnapshot($doc, job);
    if (afterSnapshot.count > initialPage.outgoingSnapshot.count) {
        return;
    }
    var beforeSets = smartSnapshotFingerprints(initialPage.outgoingSnapshot);
    for (var i = 0; i < afterSnapshot.matches.length; i++) {
        if (!beforeSets.fingerprints[afterSnapshot.matches[i].fingerprint]) {
            return;
        }
        if (afterSnapshot.matches[i].id && !beforeSets.ids[afterSnapshot.matches[i].id]) {
            return;
        }
    }
    throw new Error("[execute.verify] Success could not be verified for " + job.targetCoords.text + ": no new outgoing attack row was detected on the returned place page.");
}
async function smartRestoreOriginalVillage() {
    if (!smartState.originalVillageId) {
        return;
    }
    await smartSwitchToVillage(smartState.originalVillageId, "Restoring " + smartState.originalVillageName + "...");
    if (smartState.originalFiltersApplied) {
        applySettings();
    }
}
function smartResetPlanningState() {
    smartState.planningReservations = {};
    smartState.targetReservations = {};
    smartState.queuedPairs = {};
    smartState.sentLedger = {};
    smartState.inFlightJobs = {};
    smartState.pendingVillageSwitch = null;
}
function smartClonePlainObject(object) {
    return window.top.$.extend(true, {}, object || {});
}
function smartCreateDebugStateSnapshot() {
    return {
        version: version,
        isHoldingEnter: !!smartState.isHoldingEnter,
        isRunning: !!smartState.isRunning,
        planningInProgress: !!smartState.planningInProgress,
        executionInProgress: !!smartState.executionInProgress,
        stopRequested: !!smartState.stopRequested,
        stopReason: smartState.stopReason || "",
        lastStopPhase: smartState.lastStopPhase || "",
        lastExecutionStopStage: smartState.lastExecutionStopStage || "",
        runSerial: smartState.runSerial,
        originalVillageId: smartState.originalVillageId,
        originalVillageName: smartState.originalVillageName,
        pendingVillageSwitch: smartState.pendingVillageSwitch ? {villageId: smartState.pendingVillageSwitch.villageId} : null,
        planningReservationCount: Object.keys(smartState.planningReservations || {}).length,
        targetReservationCount: Object.keys(smartState.targetReservations || {}).length,
        queuedPairCount: Object.keys(smartState.queuedPairs || {}).length,
        sentLedgerCount: Object.keys(smartState.sentLedger || {}).length,
        inFlightJobCount: Object.keys(smartState.inFlightJobs || {}).length,
        lastPlanJobCount: smartState.lastPlan && smartState.lastPlan.jobs ? smartState.lastPlan.jobs.length : 0,
        lastPlanGroupCount: smartState.lastPlan && smartState.lastPlan.groups ? smartState.lastPlan.groups.length : 0
    };
}
async function smartDebugBuildPlan() {
    if (smartState.isRunning || smartState.planningInProgress || smartState.executionInProgress) {
        throw new Error("[debug] Cannot build a diagnostic plan while the smart runner is active.");
    }
    var backup = {
        isHoldingEnter: smartState.isHoldingEnter,
        isRunning: smartState.isRunning,
        planningInProgress: smartState.planningInProgress,
        executionInProgress: smartState.executionInProgress,
        stopRequested: smartState.stopRequested,
        stopReason: smartState.stopReason,
        lastStopPhase: smartState.lastStopPhase,
        lastExecutionStopStage: smartState.lastExecutionStopStage,
        pendingVillageSwitch: smartState.pendingVillageSwitch ? {villageId: smartState.pendingVillageSwitch.villageId} : null,
        planningReservations: smartClonePlainObject(smartState.planningReservations),
        targetReservations: smartClonePlainObject(smartState.targetReservations),
        queuedPairs: smartClonePlainObject(smartState.queuedPairs),
        sentLedger: smartClonePlainObject(smartState.sentLedger),
        inFlightJobs: smartClonePlainObject(smartState.inFlightJobs),
        lastPlan: smartState.lastPlan
    };
    try {
        smartState.stopRequested = false;
        smartState.stopReason = "";
        smartState.lastStopPhase = "";
        smartState.lastExecutionStopStage = "";
        smartResetPlanningState();
        var plan = await smartBuildExecutionPlan();
        smartState.lastPlan = plan;
        return plan;
    } finally {
        smartState.isHoldingEnter = backup.isHoldingEnter;
        smartState.isRunning = backup.isRunning;
        smartState.planningInProgress = backup.planningInProgress;
        smartState.executionInProgress = backup.executionInProgress;
        smartState.stopRequested = backup.stopRequested;
        smartState.stopReason = backup.stopReason;
        smartState.lastStopPhase = backup.lastStopPhase;
        smartState.lastExecutionStopStage = backup.lastExecutionStopStage;
        smartState.pendingVillageSwitch = backup.pendingVillageSwitch;
        smartState.planningReservations = backup.planningReservations;
        smartState.targetReservations = backup.targetReservations;
        smartState.queuedPairs = backup.queuedPairs;
        smartState.sentLedger = backup.sentLedger;
        smartState.inFlightJobs = backup.inFlightJobs;
        smartState.lastPlan = backup.lastPlan;
    }
}
function smartInstallDebugSurface() {
    var debugApi = {
        parseTargets: function () {
            currentGameTime = getCurrentGameTime();
            return smartParseVisibleTargets();
        },
        fetchGroupId: function () {
            return smartFetchOffensiveGroupId();
        },
        fetchSources: async function () {
            var groupId = await smartFetchOffensiveGroupId();
            return smartFetchOffensiveSources(groupId);
        },
        buildPlan: function () {
            return smartDebugBuildPlan();
        },
        getState: function () {
            return smartCreateDebugStateSnapshot();
        }
    };
    window.YaverLA_Debug = debugApi;
    if (window.top) {
        window.top.YaverLA_Debug = debugApi;
    }
}
function editKey(e) {
    if (!((e.keyCode >= 37 && e.keyCode <= 40) || (e.keyCode >= 48 && e.keyCode <= 90))) {
        window.top.UI.ErrorMessage("You can only enter letters, numbers, or arrows. Please try another key.", 1500);
    } else {
        var keyToChar = String.fromCharCode(e.keyCode);
        if (e.keyCode == 37) {
            keyToChar = "â†";
        }
        if (e.keyCode == 38) {
            keyToChar = "â†‘";
        }
        if (e.keyCode == 39) {
            keyToChar = "â†’";
        }
        if (e.keyCode == 40) {
            keyToChar = "â†“";
        }
        switch (keyToEdit) {
            case"A":
                keycodes.a = e.keyCode;
                window.top.$("#hotkey_value_a").val(keyToChar);
                break;
            case"B":
                keycodes.b = e.keyCode;
                window.top.$("#hotkey_value_b").val(keyToChar);
                break;
            case"C":
                keycodes.c = e.keyCode;
                window.top.$("#hotkey_value_c").val(keyToChar);
                break;
            case"Master":
                keycodes.master = e.keyCode;
                window.top.$("#hotkey_value_master").val(keyToChar);
                break;
            case"Skip":
                keycodes.skip = e.keyCode;
                window.top.$("#hotkey_value_skip").val(keyToChar);
                break;
            case"Left":
                keycodes.left = e.keyCode;
                window.top.$("#hotkey_value_left").val(keyToChar);
                break;
            case"Right":
                keycodes.right = e.keyCode;
                window.top.$("#hotkey_value_right").val(keyToChar);
                break;
            default:
                return;
        }
        window.top.UI.SuccessMessage(keyToChar + " is now mapped to the " + keyToEdit + " button.");
        updateKeypressSettings();
        editingKey = false;
    }
}
function updateKeypressSettings() {
    keyPressSettings.a_code = keycodes.a;
    keyPressSettings.a_char = window.top.$("#hotkey_value_a").val();
    keyPressSettings.b_code = keycodes.b;
    keyPressSettings.b_char = window.top.$("#hotkey_value_b").val();
    keyPressSettings.c_code = keycodes.c;
    keyPressSettings.c_char = window.top.$("#hotkey_value_c").val();
    keyPressSettings.master_code = keycodes.master;
    keyPressSettings.master_char = window.top.$("#hotkey_value_master").val();
    keyPressSettings.skip_code = keycodes.skip;
    keyPressSettings.skip_char = window.top.$("#hotkey_value_skip").val();
    keyPressSettings.left_code = keycodes.left;
    keyPressSettings.left_char = window.top.$("#hotkey_value_left").val();
    keyPressSettings.right_code = keycodes.right;
    keyPressSettings.right_char = window.top.$("#hotkey_value_right").val();
    keyPressSettings.priorityOneEnabled = window.top.$('#priorityOneEnabled').prop('checked');
    keyPressSettings.priorityOneProfile = window.top.$('#priorityOneProfile').val();
    keyPressSettings.priorityOneButton = window.top.$('#priorityOneButton').val();
    keyPressSettings.priorityTwoEnabled = window.top.$('#priorityTwoEnabled').prop('checked');
    keyPressSettings.priorityTwoProfile = window.top.$('#priorityTwoProfile').val();
    keyPressSettings.priorityTwoButton = window.top.$('#priorityTwoButton').val();
    keyPressSettings.priorityThreeEnabled = window.top.$('#priorityThreeEnabled').prop('checked');
    keyPressSettings.priorityThreeProfile = window.top.$('#priorityThreeProfile').val();
    keyPressSettings.priorityThreeButton = window.top.$('#priorityThreeButton').val();
    keyPressSettings.defaultButton = window.top.$('#defaultButton').val();
    window.top.$.jStorage.set("keyPressSettings", keyPressSettings);
}
function migrateKeypressSettings(settings) {
    if (!settings) {
        return settings;
    }
    var isLegacyDefault = settings.a_code === 65 && settings.b_code === 66 && settings.c_code === 67 && settings.master_code === 77 && settings.skip_code === 83 && settings.left_code === 37 && settings.right_code === 39;
    if (isLegacyDefault) {
        settings.a_code = 74;
        settings.a_char = "J";
        settings.b_code = 75;
        settings.b_char = "K";
        settings.c_code = 76;
        settings.c_char = "L";
        settings.master_code = 71;
        settings.master_char = "G";
        settings.skip_code = 88;
        settings.skip_char = "X";
        settings.left_code = 81;
        settings.left_char = "Q";
        settings.right_code = 69;
        settings.right_char = "E";
    }
    if (settings.left_char === "ÃƒÂ¢Ã¢â‚¬ Ã‚Â") {
        settings.left_char = "â†";
    }
    if (settings.right_char === "ÃƒÂ¢Ã¢â‚¬ Ã¢â‚¬â„¢") {
        settings.right_char = "â†’";
    }
    return settings;
}
function fillKeypressSettings() {
    if (window.top.$.jStorage.get('keyPressSettings') == null) {
        window.top.$.jStorage.set('keyPressSettings', keyPressSettings);
    }
    keyPressSettings = migrateKeypressSettings(window.top.$.jStorage.get('keyPressSettings'));
    window.top.$.jStorage.set('keyPressSettings', keyPressSettings);
    keycodes.a = keyPressSettings.a_code;
    window.top.$("#hotkey_value_a").val(keyPressSettings.a_char);
    keycodes.b = keyPressSettings.b_code;
    window.top.$("#hotkey_value_b").val(keyPressSettings.b_char);
    keycodes.c = keyPressSettings.c_code;
    window.top.$("#hotkey_value_c").val(keyPressSettings.c_char);
    keycodes.master = keyPressSettings.master_code;
    window.top.$("#hotkey_value_master").val(keyPressSettings.master_char);
    keycodes.skip = keyPressSettings.skip_code;
    window.top.$("#hotkey_value_skip").val(keyPressSettings.skip_char);
    keycodes.left = keyPressSettings.left_code;
    window.top.$("#hotkey_value_left").val(keyPressSettings.left_char);
    keycodes.right = keyPressSettings.right_code;
    window.top.$("#hotkey_value_right").val(keyPressSettings.right_char);
    window.top.$('#priorityOneEnabled').prop('checked', keyPressSettings.priorityOneEnabled);
    window.top.$('#priorityOneProfile').val(keyPressSettings.priorityOneProfile);
    window.top.$('#priorityOneButton').val(keyPressSettings.priorityOneButton);
    window.top.$('#priorityTwoEnabled').prop('checked', keyPressSettings.priorityTwoEnabled);
    window.top.$('#priorityTwoProfile').val(keyPressSettings.priorityTwoProfile);
    window.top.$('#priorityTwoButton').val(keyPressSettings.priorityTwoButton);
    window.top.$('#priorityThreeEnabled').prop('checked', keyPressSettings.priorityThreeEnabled);
    window.top.$('#priorityThreeProfile').val(keyPressSettings.priorityThreeProfile);
    window.top.$('#priorityThreeButton').val(keyPressSettings.priorityThreeButton);
    window.top.$('#defaultButton').val(keyPressSettings.defaultButton);
}
function setKeyEditMode(n) {
    editingKey = true;
    keyToEdit = n;
    window.top.UI.InfoMessage("Press any number, letter, or arrow key to set the hotkey for the <span style='font-weight:bold;'>" + n + "</span> button", 1500);
    return false;
}
function fillMasterSettings() {
    var profileList = window.top.$.jStorage.get("profileList");
    window.top.$.each(profileList, function (i, val) {
        window.top.$('#priorityOneProfile').append("<option value='" + val + "'>" + val + "</option>");
        window.top.$('#priorityTwoProfile').append("<option value='" + val + "'>" + val + "</option>");
        window.top.$('#priorityThreeProfile').append("<option value='" + val + "'>" + val + "</option>");
    });
}
function selectMasterButton(row) {
    var buttonToClick;
    var p1 = window.top.$.jStorage.get("profile:" + keyPressSettings.priorityOneProfile);
    var p2 = window.top.$.jStorage.get("profile:" + keyPressSettings.priorityTwoProfile);
    var p3 = window.top.$.jStorage.get("profile:" + keyPressSettings.priorityThreeProfile);
    var aButton = row.children("td").eq(9).children("a");
    var bButton = row.children("td").eq(10).children("a");
    var cButton = row.children("td").eq(11).children("a");
    buttonToClick = keyPressSettings.defaultButton;
    if (keyPressSettings.priorityThreeEnabled && !checkRowToHide(row, p3)) {
        buttonToClick = keyPressSettings.priorityThreeButton;
    }
    if (keyPressSettings.priorityTwoEnabled && !checkRowToHide(row, p2)) {
        buttonToClick = keyPressSettings.priorityTwoButton;
    }
    if (keyPressSettings.priorityOneEnabled && !checkRowToHide(row, p1)) {
        buttonToClick = keyPressSettings.priorityOneButton;
    }
    switch (buttonToClick) {
        case"A":
            tryClick(aButton);
            break;
        case"B":
            tryClick(bButton);
            break;
        case"C":
            tryClick(cButton);
            break;
        default:
            row.hide();
            break;
    }
}
function setDefaultLanguage() {
    window.top.$.jStorage.set("language", "en");
}
function loadLanguage(lang) {
    if (window.top.$.inArray(lang, availableLangs) < 0) {
        lang = "en";
    }
    applyBuiltinLanguage(lang);
    window.top.$('#settingsDiv').remove();
    changeHeader(filter_40);
    showSettings();
    var selectedProfile = window.top.$.jStorage.get("DefaultProfile") || profile_10;
    if (window.top.$("#settingsProfile option[value='" + selectedProfile + "']").length) {
        window.top.$('#settingsProfile').val(selectedProfile);
        loadProfile(selectedProfile);
    }
}
function addLanguages() {
    window.top.$('#language').append("<option value='en'>English</option>");
}
function parseBool(value) {
    if (typeof value === "boolean") {
        return value;
    }
    if (value === null || typeof value === "undefined") {
        return false;
    }
    return String(value).replace(/^\s+|\s+$/g, "").toLowerCase() === "true";
}
function getURL() {
    var domain = window.location.hostname;
    domain = domain.split('.');
    return domain;
}
function checkPage() {
    console.log("checkPage");
    if (!(window.top.game_data.screen === 'am_farm')) {
        getFA();
    } else {
        run();
    }
}
function getFA() {
    console.log("getFA");
    fadeThanksToCheese();
    openLoader();
    var vlink = link[0] + window.top.game_data.village.id + link[1];
    window.top.$.getScript("https://" + window.top.location.host + "/js/game/Accountmanager.js", function () {
        window.top.$.ajax({
            type: "GET", url: vlink, dataType: "html", error: function (xhr, statusText, error) {
                alert("Get LA error: " + error);
                window.top.$('#fader').remove();
                window.top.$('#loaders').remove();
            }, success: function (data) {
                var v = window.top.$(data);
                var titlePat = /<\s*title\s*>([^<]+)<\/title\s*>/g;
                var titleMatch = titlePat.exec(data);
                var title = titleMatch[1];
                var newGameData = window.top.$.parseJSON(data.split("TribalWars.updateGameData(")[1].split(");")[0]);
                window.top.game_data = newGameData;
                if (typeof history !== 'undefined' && typeof history.pushState === 'function') {
                    history.pushState({}, window.top.game_data.village.name + " - Loot Assistant", "https://" + window.top.location.host + game_data.link_base_pure + 'am_farm');
                }
                window.top.$('#header_info').html(window.top.$('#header_info', v).html());
                window.top.$('#topContainer').html(window.top.$('#topContainer', v).html());
                window.top.$('#contentContainer').html(window.top.$('#contentContainer', v).html());
                window.top.$('head').find('title').html(title);
                window.top.$('#fader').remove();
                window.top.$('#loaders').remove();
                console.log("getFA");
                run();
            }
        });
    });
}
function fadeThanksToCheese() {
    var fader = window.top.document.createElement('div');
    fader.id = 'fader';
    fader.style.position = 'fixed';
    fader.style.height = '100%';
    fader.style.width = '100%';
    fader.style.backgroundColor = 'black';
    fader.style.top = '0px';
    fader.style.left = '0px';
    fader.style.opacity = '0.6';
    fader.style.zIndex = '12000';
    window.top.document.body.appendChild(fader);
}
function openLoader() {
    var widget = window.top.document.createElement('div');
    widget.id = 'loaders';
    widget.style.position = 'fixed';
    widget.style.width = '24px';
    widget.style.height = '24px';
    widget.style.top = '50%';
    widget.style.left = '50%';
    window.top.$(widget).css("margin-left", "-12px");
    window.top.$(widget).css("margin-top", "-12px");
    widget.style.zIndex = 13000;
    window.top.$(widget).append(window.top.$("<img src='graphic/throbber.gif' height='24' width='24'></img>"));
    window.top.$('#contentContainer').append(window.top.$(widget));
}
function makeItPretty() {
    window.top.$('.row_a').css("background-color", "rgb(216, 255, 216)");
    window.top.$('#plunder_list tr').eq(0).remove();
    window.top.$('#plunder_list').find('tr:gt(0)').each(function (index) {
        window.top.$(this).removeClass('row_a');
        window.top.$(this).removeClass('row_b');
        if (index % 2 == 0) {
            window.top.$(this).addClass('row_a');
        } else {
            window.top.$(this).addClass('row_b');
        }
    });
    hideStuffs();
    console.log("makeItPretty");

}
function hideStuffs() {
    window.top.$('#plunder_list').hide();
    window.top.$('#plunder_list_nav').hide();
    window.top.$('#contentContainer').find('div[class="vis"]').eq(0).children().eq(0).append(window.top.$("<div class='vis' style='float:right;text-align:center;line-height:100%;width:12px;height:12px;margin:0px 0px 0px 0px;position:relative;background-color:tan;opacity:.7'><a href='#' num='0' onclick='uglyHider(window.top.$(this));return false;'>+</a></div>"));
    window.top.$('#contentContainer').find('div[class="vis"]').eq(0).children().eq(1).hide();
    window.top.$('#am_widget_Farm').find('h4').eq(0).append(window.top.$("<div class='vis' style='float:right;text-align:center;line-height:100%;width:12px;height:12px;margin:0px 0px 0px 0px;position:relative;background-color:tan;opacity:.7'><a href='#' num='1' onclick='uglyHider(window.top.$(this));return false;'>+</a></div>"));
    window.top.$('#plunder_list_filters').hide();
}
function uglyHider(linker) {
    var basd;
    if (window.top.$('#settingsBody').length > 0) {
        basd = 2;
    } else {
        basd = 1;
    }
    if (window.top.$(linker).text() === "+") {
        window.top.$(linker).text("-");
    } else {
        window.top.$(linker).text("+");
    }
    if (parseInt(window.top.$(linker).attr('num')) == 0) {
        window.top.$('#contentContainer').find('div[class="vis"]').eq(basd).children().eq(1).toggle();
    } else if (parseInt(window.top.$(linker).attr('num')) == 1) {
        window.top.$('#plunder_list_filters').toggle();
    } else if (parseInt(window.top.$(linker).attr('num')) == 2) {
        window.top.$('#settingsBody').toggle();
    }
}


}

