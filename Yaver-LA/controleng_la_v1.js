(function () {
    "use strict";

    var topWindow = window.top || window;
    if (!topWindow.$) {
        console.error("Controleng LA (1.0.0): Tribal Wars jQuery is required.");
        return;
    }

    if (typeof topWindow.ControlengLA_Cleanup === "function") {
        try {
            topWindow.ControlengLA_Cleanup();
        } catch (cleanupError) {
            console.warn("Controleng LA (1.0.0): previous instance cleanup failed.", cleanupError);
        }
    }

    var $ = topWindow.$;
    var version = "1.0.0";
    var scriptName = "Controleng LA (" + version + ")";
    var logPrefix = "[Controleng LA]";
    var STORAGE_PREFIX = "controleng_la_v1:";
    var DEFAULT_PROFILE_NAME = "Default";
    var HOTKEYS = {
        a: 74,
        b: 75,
        c: 76,
        master: 71,
        skip: 88,
        left: 81,
        right: 69,
        run: 13
    };
    var COLORS = ["blue", "green", "yellow", "red_yellow", "red_blue", "red", "unknown"];
    var TEXT = {
        statusReady: "Ready. Apply filters, then hold Enter to send from the current active village only.",
        statusNeedFarmPage: "Open Loot Assistant / Farm Assistant first. This script only runs on screen=am_farm.",
        statusQueueScope: "Queue scope: current visible filtered rows only.",
        noTargets: "No visible plunder rows were found.",
        noEligibleRows: "No eligible visible rows matched the current filters.",
        authorHtml: "Updated by <a href='https://www.twstats.com/en1/index.php?page=player&id=315027' target='_blank'>controleng</a>",
        cooldownLabel: "Local send cooldown",
        reportAgeLabel: "Report age",
        queueTemplateLabel: "Send template",
        queueBatchLabel: "Batch limit",
        parseStarted: "Parsing loot assistant rows.",
        parseFinished: "Parsing completed.",
        queueReady: "Queue ready.",
        runStopped: "Stop requested. Current in-flight request may finish.",
        runIgnored: "Run ignored because the current Enter key cycle is already consumed.",
        sendBusy: "Dispatch skipped because another request is still running.",
        sendStopped: "Stopping before the next dispatch because Enter is no longer held.",
        enterReleased: "Enter released. No new dispatch will start after the current safe boundary."
    };
    var inlineStyles = "" +
        "#controleng_la_panel{margin:10px 0 14px 0;}" +
        "#controleng_la_panel .controleng-la-head{display:flex;align-items:center;justify-content:space-between;gap:12px;}" +
        "#controleng_la_panel .controleng-la-head .title{font-size:15px;font-weight:bold;}" +
        "#controleng_la_panel .controleng-la-author{font-size:11px;font-weight:normal;}" +
        "#controleng_la_panel .controleng-la-toolbar{display:flex;flex-wrap:wrap;gap:6px;align-items:center;}" +
        "#controleng_la_panel .controleng-la-toolbar label{display:flex;align-items:center;gap:4px;}" +
        "#controleng_la_panel .controleng-la-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:10px;}" +
        "#controleng_la_panel .controleng-la-section{background:rgba(255,255,255,0.03);border:1px solid rgba(80,60,30,0.18);padding:8px;border-radius:4px;}" +
        "#controleng_la_panel .controleng-la-section h5{margin:0 0 6px 0;font-size:12px;}" +
        "#controleng_la_panel .controleng-la-row{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:6px;}" +
        "#controleng_la_panel .controleng-la-row:last-child{margin-bottom:0;}" +
        "#controleng_la_panel .controleng-la-field{display:flex;flex-direction:column;gap:2px;min-width:90px;}" +
        "#controleng_la_panel .controleng-la-field.inline{flex-direction:row;align-items:center;}" +
        "#controleng_la_panel .controleng-la-field.inline input[type='checkbox']{margin-top:0;}" +
        "#controleng_la_panel .controleng-la-field label{font-size:11px;font-weight:bold;}" +
        "#controleng_la_panel input[type='text'],#controleng_la_panel input[type='number'],#controleng_la_panel select{max-width:100%;}" +
        "#controleng_la_panel .controleng-la-colors{display:grid;grid-template-columns:repeat(2,minmax(90px,1fr));gap:4px 8px;}" +
        "#controleng_la_panel .controleng-la-colors label{display:flex;align-items:center;gap:4px;font-weight:normal;}" +
        "#controleng_la_panel .controleng-la-actions{display:flex;flex-wrap:wrap;gap:6px;align-items:center;}" +
        "#controleng_la_panel .controleng-la-status{margin-top:8px;padding:6px 8px;background:#f4e4bc;border:1px solid #c8a86b;color:#4c3514;border-radius:4px;font-size:12px;}" +
        "#controleng_la_panel .controleng-la-status.error{background:#f6d7d7;border-color:#c77;color:#5a1d1d;}" +
        "#controleng_la_panel .controleng-la-status.success{background:#d9efd1;border-color:#8eac76;color:#234b1d;}" +
        "#controleng_la_panel .controleng-la-hint{font-size:11px;color:#5c4219;}" +
        "#controleng_la_panel .controleng-la-hotkeys{display:flex;flex-wrap:wrap;gap:8px 14px;margin-top:6px;font-size:11px;}" +
        "#controleng_la_panel .controleng-la-small{font-size:11px;}" +
        "#controleng_la_panel .controleng-la-divider{margin:2px 0 8px 0;border-top:1px solid rgba(80,60,30,0.18);}" +
        "#controleng_la_panel .controleng-la-hidden-by-filter{display:none !important;}" +
        "#controleng_la_panel .controleng-la-muted{opacity:0.8;}" +
        "#controleng_la_panel .controleng-la-pill{display:inline-block;padding:2px 6px;border-radius:999px;background:#e5d0a3;border:1px solid #b89b67;font-size:11px;}" +
        "#controleng_la_panel .controleng-la-checkbox-list{display:flex;flex-wrap:wrap;gap:8px 12px;}";

    var state = {
        initialized: false,
        currentSettings: null,
        lastParsedRows: [],
        lastFilteredRows: [],
        lastQueue: [],
        lastRunSummary: null,
        isPlanning: false,
        isRunning: false,
        dispatchBusy: false,
        dispatchStarted: false,
        currentQueue: [],
        currentQueueIndex: 0,
        activeVillageId: null,
        activeVillageName: "",
        currentRunSerial: 0,
        dispatchCount: 0,
        stopAfterCurrentDispatch: false,
        stopAfterFirstDispatch: false,
        lastDispatchTimestamp: 0,
        enterCycleConsumed: false,
        enterKeyIsDown: false,
        lastQueueBuiltAt: null,
        dispatchTimerId: null
    };

    function safeClone(value) {
        return JSON.parse(JSON.stringify(value));
    }

    function log(message) {
        console.log(logPrefix + " " + message);
    }

    function logStage(stage, message) {
        console.log(logPrefix + " [" + stage + "] " + message);
    }

    function incrementCounter(map, key) {
        var safeKey = key || "unknown";
        map[safeKey] = (map[safeKey] || 0) + 1;
    }

    function formatCounterMap(counterMap) {
        var keys = Object.keys(counterMap || {});
        if (!keys.length) {
            return "none";
        }
        keys.sort();
        return $.map(keys, function (key) {
            return key + "=" + counterMap[key];
        }).join(", ");
    }

    function notify(type, message) {
        var text = String(message || "");
        if (topWindow.UI && typeof topWindow.UI[type === "error" ? "ErrorMessage" : "SuccessMessage"] === "function") {
            topWindow.UI[type === "error" ? "ErrorMessage" : "SuccessMessage"](text, 2500);
            return;
        }
        console[type === "error" ? "error" : "log"](logPrefix + " " + text);
    }

    function injectStyles() {
        if (topWindow.document.getElementById("controleng-la-style")) {
            return;
        }
        var styleTag = topWindow.document.createElement("style");
        styleTag.id = "controleng-la-style";
        styleTag.type = "text/css";
        styleTag.appendChild(topWindow.document.createTextNode(inlineStyles));
        topWindow.document.head.appendChild(styleTag);
    }

    function storageGetRaw(key) {
        try {
            return topWindow.localStorage.getItem(STORAGE_PREFIX + key);
        } catch (error) {
            logStage("storage", "Failed to read " + key + ": " + error.message);
            return null;
        }
    }

    function storageSetRaw(key, value) {
        try {
            topWindow.localStorage.setItem(STORAGE_PREFIX + key, value);
            return true;
        } catch (error) {
            logStage("storage", "Failed to write " + key + ": " + error.message);
            return false;
        }
    }

    function storageGetJson(key, fallback) {
        var raw = storageGetRaw(key);
        if (raw === null) {
            return safeClone(fallback);
        }
        try {
            return JSON.parse(raw);
        } catch (error) {
            logStage("storage", "Ignoring malformed JSON in " + key + ".");
            return safeClone(fallback);
        }
    }

    function storageSetJson(key, value) {
        storageSetRaw(key, JSON.stringify(value));
    }

    function defaultProfile() {
        return {
            sendTemplate: "A",
            batchLimit: "",
            distanceMin: "",
            distanceMax: "",
            wallMin: "",
            wallMax: "",
            resourcesMin: "",
            resourcesMax: "",
            reportAgeMin: "",
            reportAgeMax: "",
            outgoingMin: "",
            outgoingMax: "",
            haulStatus: "any",
            continentMode: "any",
            continents: "",
            localCooldownEnabled: true,
            localCooldownMinutes: "30",
            showUnknownWallTargets: true,
            showRowsWithoutLootInfo: true,
            allowedColors: {
                blue: true,
                green: true,
                yellow: true,
                red_yellow: true,
                red_blue: true,
                red: true,
                unknown: true
            }
        };
    }

    function normalizeProfile(profile) {
        var merged = $.extend(true, {}, defaultProfile(), profile || {});
        if (!merged.allowedColors) {
            merged.allowedColors = safeClone(defaultProfile().allowedColors);
        }
        $.each(defaultProfile().allowedColors, function (colorKey, colorValue) {
            if (typeof merged.allowedColors[colorKey] === "undefined") {
                merged.allowedColors[colorKey] = colorValue;
            }
        });
        return merged;
    }

    function ensureProfiles() {
        var profiles = storageGetJson("profiles", {});
        if (!profiles || typeof profiles !== "object" || $.isEmptyObject(profiles)) {
            profiles = {};
        }
        if (!profiles[DEFAULT_PROFILE_NAME]) {
            profiles[DEFAULT_PROFILE_NAME] = defaultProfile();
        }
        $.each(profiles, function (profileName, profileValue) {
            profiles[profileName] = normalizeProfile(profileValue);
        });
        storageSetJson("profiles", profiles);
        var selectedProfile = storageGetJson("selectedProfile", DEFAULT_PROFILE_NAME);
        if (!profiles[selectedProfile]) {
            selectedProfile = DEFAULT_PROFILE_NAME;
            storageSetJson("selectedProfile", selectedProfile);
        }
        return {
            profiles: profiles,
            selectedProfile: selectedProfile
        };
    }

    function getProfiles() {
        return ensureProfiles().profiles;
    }

    function getSelectedProfileName() {
        return ensureProfiles().selectedProfile;
    }

    function setSelectedProfileName(profileName) {
        storageSetJson("selectedProfile", profileName);
    }

    function persistProfiles(profiles) {
        storageSetJson("profiles", profiles);
    }

    function sanitizeNumberInput(value) {
        var normalized = $.trim(String(value || ""));
        return normalized === "" ? "" : normalized;
    }

    function parseOptionalNumber(value) {
        var normalized = $.trim(String(value || "")).replace(",", ".");
        if (normalized === "") {
            return null;
        }
        var parsed = normalized.indexOf(".") > -1 ? parseFloat(normalized) : parseInt(normalized, 10);
        return isNaN(parsed) ? null : parsed;
    }

    function normalizeText(text) {
        return $.trim(String(text || "").replace(/\s+/g, " "));
    }

    function normalizeCount(value) {
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

    function parseCoords(text) {
        var match = String(text || "").match(/(\d{1,3})\|(\d{1,3})/);
        if (!match) {
            return null;
        }
        return {
            x: parseInt(match[1], 10),
            y: parseInt(match[2], 10),
            text: match[1] + "|" + match[2]
        };
    }

    function extractQueryParam(url, key) {
        if (!url) {
            return null;
        }
        var match = String(url).match(new RegExp("[?&]" + key + "=([^&#]+)"));
        return match ? decodeURIComponent(match[1]) : null;
    }

    function computeContinent(coords) {
        if (!coords) {
            return null;
        }
        return "K" + Math.floor(coords.y / 100) + Math.floor(coords.x / 100);
    }

    function getServerNow() {
        var serverDateText = normalizeText($("#serverDate").text());
        var serverTimeText = normalizeText($("#serverTime").text());
        if (!serverTimeText) {
            return new Date();
        }
        var timeMatch = serverTimeText.match(/(\d{1,2}):(\d{2}):(\d{2})/);
        if (!timeMatch) {
            return new Date();
        }
        var date = new Date();
        if (serverDateText) {
            var dateMatch = serverDateText.match(/(\d{1,2})[\/.\-](\d{1,2})(?:[\/.\-](\d{2,4}))?/);
            if (dateMatch) {
                var day = parseInt(dateMatch[1], 10);
                var month = parseInt(dateMatch[2], 10) - 1;
                var year = dateMatch[3] ? parseInt(dateMatch[3], 10) : date.getFullYear();
                if (year < 100) {
                    year = 2000 + year;
                }
                date = new Date(year, month, day);
            }
        }
        date.setHours(parseInt(timeMatch[1], 10));
        date.setMinutes(parseInt(timeMatch[2], 10));
        date.setSeconds(parseInt(timeMatch[3], 10));
        date.setMilliseconds(0);
        return date;
    }

    function parseReportTimestamp(cellText, now) {
        var normalized = normalizeText(cellText).toLowerCase();
        var timeMatch = normalized.match(/(\d{1,2}):(\d{2}):(\d{2})/);
        if (!timeMatch) {
            return null;
        }
        var hours = parseInt(timeMatch[1], 10);
        var minutes = parseInt(timeMatch[2], 10);
        var seconds = parseInt(timeMatch[3], 10);
        var baseDate = new Date(now.getTime());
        baseDate.setMilliseconds(0);
        if (normalized.indexOf("today") > -1) {
            baseDate.setHours(hours, minutes, seconds, 0);
            return baseDate;
        }
        if (normalized.indexOf("yesterday") > -1) {
            baseDate.setDate(baseDate.getDate() - 1);
            baseDate.setHours(hours, minutes, seconds, 0);
            return baseDate;
        }
        var dateMatch = normalized.match(/(\d{1,2})\.(\d{1,2})(?:\.(\d{2,4}))?/);
        if (!dateMatch) {
            return null;
        }
        var day = parseInt(dateMatch[1], 10);
        var month = parseInt(dateMatch[2], 10) - 1;
        var year = dateMatch[3] ? parseInt(dateMatch[3], 10) : now.getFullYear();
        if (year < 100) {
            year = 2000 + year;
        }
        if (!dateMatch[3] && now.getMonth() === 0 && month === 11) {
            year = now.getFullYear() - 1;
        }
        return new Date(year, month, day, hours, minutes, seconds, 0);
    }

    function getSendHistory() {
        var history = storageGetJson("sendHistory", {});
        if (!history || typeof history !== "object") {
            history = {};
        }
        return history;
    }

    function getSendHistoryKey(targetVillageId) {
        var world = topWindow.game_data && topWindow.game_data.world ? topWindow.game_data.world : "unknown";
        var sitter = topWindow.game_data && topWindow.game_data.player && topWindow.game_data.player.sitter ? topWindow.game_data.player.sitter : "0";
        return world + ":" + sitter + ":" + String(targetVillageId || "");
    }

    function getLocalCooldownMinutes(targetVillageId, now) {
        var history = getSendHistory();
        var stamp = history[getSendHistoryKey(targetVillageId)];
        if (!stamp) {
            return null;
        }
        var sentAt = new Date(stamp);
        if (!(sentAt instanceof Date) || isNaN(sentAt.getTime())) {
            return null;
        }
        return Math.max(0, Math.round((now.getTime() - sentAt.getTime()) / 60000));
    }

    function markLocalSend(targetVillageId) {
        var history = getSendHistory();
        history[getSendHistoryKey(targetVillageId)] = new Date().toISOString();
        storageSetJson("sendHistory", history);
    }

    function clearOwnRowHides() {
        $("#plunder_list tr.controleng-la-hidden-by-filter").each(function () {
            $(this).removeClass("controleng-la-hidden-by-filter").show();
        });
    }

    function hideRow($row) {
        $row.addClass("controleng-la-hidden-by-filter").hide();
    }

    function findFreshnessCell($row) {
        var found = $();
        $row.children("td").each(function () {
            var $cell = $(this);
            var text = normalizeText($cell.text());
            if (text.indexOf(":") === -1) {
                return;
            }
            if (parseReportTimestamp(text, getServerNow())) {
                found = $cell;
                return false;
            }
        });
        return found;
    }

    function findResourcesCell($row) {
        var found = $();
        $row.children("td").each(function () {
            var $cell = $(this);
            var html = String($cell.html() || "");
            if (html.indexOf("header wood") > -1 && html.indexOf("header stone") > -1 && html.indexOf("header iron") > -1) {
                found = $cell;
                return false;
            }
        });
        return found;
    }

    function parseResourcesCell($cell) {
        if (!$cell || !$cell.length) {
            return null;
        }
        var matches = normalizeText($cell.text()).match(/\d[\d.]*/g);
        if (!matches || matches.length < 3) {
            return null;
        }
        var wood = normalizeCount(matches[0]);
        var stone = normalizeCount(matches[1]);
        var iron = normalizeCount(matches[2]);
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

    function parseWallAndDistance($row, $resourcesCell) {
        var $cells = $row.children("td");
        var resourceIndex = $cells.index($resourcesCell);
        if (resourceIndex < 0) {
            return { wallLevel: null, distance: null, distanceText: "" };
        }
        var wallLevel = null;
        var distanceText = null;
        $cells.slice(resourceIndex + 1).each(function () {
            var $cell = $(this);
            if ($cell.find("a,input,button,select").length) {
                return;
            }
            var text = normalizeText($cell.text());
            if (!text) {
                return;
            }
            if (wallLevel === null && (text === "?" || /^\d+$/.test(text))) {
                wallLevel = text === "?" ? null : parseInt(text, 10);
                return;
            }
            if (distanceText === null && /^\d+(?:[.,]\d+)?$/.test(text)) {
                distanceText = text.replace(",", ".");
                return false;
            }
        });
        return {
            wallLevel: wallLevel,
            distance: distanceText === null ? null : parseFloat(distanceText),
            distanceText: distanceText || ""
        };
    }

    function extractOutgoingCount($row) {
        var count = null;
        $row.children("td").each(function () {
            var $cell = $(this);
            var match = normalizeText($cell.text()).match(/^\((\d+)\)$/);
            if (match) {
                count = parseInt(match[1], 10);
                return false;
            }
            var $img = $cell.find("img").first();
            if ($img.length && typeof $img.prop("tooltipText") !== "undefined") {
                var tooltipDigits = String($img.prop("tooltipText") || "").replace(/[^\d]/g, "");
                if (tooltipDigits) {
                    count = parseInt(tooltipDigits, 10);
                    return false;
                }
            }
        });
        return count === null ? 0 : count;
    }

    function extractReportColor($row) {
        var html = String($row.children("td").eq(1).html() || "");
        if (html.indexOf("red_yellow") > -1) {
            return "red_yellow";
        }
        if (html.indexOf("red_blue") > -1) {
            return "red_blue";
        }
        if (html.indexOf("yellow") > -1) {
            return "yellow";
        }
        if (html.indexOf("green") > -1) {
            return "green";
        }
        if (html.indexOf("blue") > -1) {
            return "blue";
        }
        if (html.indexOf("red") > -1) {
            return "red";
        }
        return "unknown";
    }

    function extractHaulStatus($row) {
        var html = String($row.html() || "");
        if (html.indexOf("max_loot/1") > -1) {
            return "full";
        }
        if (html.indexOf("max_loot/0") > -1) {
            return "partial";
        }
        return "unknown";
    }

    function extractTargetId($row) {
        var nameAttr = normalizeText($row.attr("name"));
        if (/^\d+$/.test(nameAttr)) {
            return nameAttr;
        }
        var rowIdMatch = String($row.attr("id") || "").match(/village_(\d+)/);
        if (rowIdMatch) {
            return String(rowIdMatch[1]);
        }
        var $placeLink = $row.find("a[href*='screen=place'][href*='target=']").first();
        if ($placeLink.length) {
            return extractQueryParam($placeLink.attr("href"), "target");
        }
        return null;
    }

    function extractTargetCoords($row) {
        var candidates = [];
        var $cells = $row.children("td,th");
        if ($cells.length) {
            candidates.push(normalizeText($cells.eq(0).text()));
            candidates.push(normalizeText($cells.eq(1).text()));
            candidates.push(normalizeText($cells.eq(2).text()));
            candidates.push(normalizeText($cells.eq(3).text()));
        }
        $row.find("a[href*='screen=report'], a[href*='screen=place'], a[href*='screen=info_village'], a[href*='screen=overview']").each(function () {
            candidates.push(normalizeText($(this).text()));
        });
        candidates.push(normalizeText($row.text()));
        for (var i = 0; i < candidates.length; i++) {
            var coords = parseCoords(candidates[i]);
            if (coords) {
                return coords;
            }
        }
        return null;
    }

    function extractTemplateMeta($row) {
        function parseAnchor(selector) {
            var $anchor = $row.find(selector).first();
            if (!$anchor.length) {
                return {
                    templateId: null,
                    enabled: false,
                    $anchor: $anchor
                };
            }
            var onclick = String($anchor.attr("onclick") || "");
            var match = onclick.match(/sendUnits\([^,]+,\s*(\d+)\s*,\s*(\d+)\s*\)/);
            return {
                templateId: match ? String(match[2]) : null,
                enabled: !$anchor.hasClass("farm_icon_disabled"),
                $anchor: $anchor
            };
        }
        return {
            a: parseAnchor("a.farm_icon_a"),
            b: parseAnchor("a.farm_icon_b"),
            c: {
                $anchor: $row.find("a.farm_icon_c").first(),
                enabled: $row.find("a.farm_icon_c").first().length > 0 && !$row.find("a.farm_icon_c").first().hasClass("farm_icon_disabled")
            }
        };
    }

    function isCandidateTargetRow($row) {
        if (!$row || !$row.length || !$row.closest("#plunder_list").length) {
            return false;
        }
        var $cells = $row.children("td");
        if ($cells.length < 8) {
            return false;
        }
        var hasTarget = !!extractTargetId($row);
        var hasReportLink = $row.find("a[href*='screen=report'][href*='view=']").length > 0;
        var hasPlaceLink = $row.find("a[href*='screen=place'][href*='target=']").length > 0;
        var hasFarmButtons = $row.find("a.farm_icon_a, a.farm_icon_b, a.farm_icon_c").length > 0;
        var hasResourceEvidence = findResourcesCell($row).length > 0;
        return hasTarget && hasReportLink && hasPlaceLink && hasFarmButtons && hasResourceEvidence;
    }

    function collectCandidateRows(visibleOnly) {
        var details = {
            plunderListExists: false,
            scannedRows: 0,
            candidateRows: $()
        };
        var $plunderList = $("#plunder_list");
        if (!$plunderList.length) {
            return details;
        }
        details.plunderListExists = true;
        var $rows = visibleOnly ? $plunderList.find("tr").filter(":visible") : $plunderList.find("tr");
        details.scannedRows = $rows.length;
        $rows.each(function () {
            var $row = $(this);
            if (isCandidateTargetRow($row)) {
                details.candidateRows = details.candidateRows.add($row);
            }
        });
        return details;
    }

    function serializeRowForDebug(row) {
        return {
            rowIndex: row.rowIndex,
            targetVillageId: row.targetVillageId,
            coords: row.coords,
            continent: row.continent,
            reportAgeMinutes: row.reportAgeMinutes,
            resourcesTotal: row.resourcesTotal,
            resourceBreakdown: row.resourceBreakdown,
            wallLevel: row.wallLevel,
            distance: row.distance,
            distanceText: row.distanceText,
            outgoingCount: row.outgoingCount,
            haulStatus: row.haulStatus,
            reportColor: row.reportColor,
            localCooldownMinutes: row.localCooldownMinutes,
            templateA: {
                templateId: row.templates.a.templateId,
                enabled: row.templates.a.enabled
            },
            templateB: {
                templateId: row.templates.b.templateId,
                enabled: row.templates.b.enabled
            }
        };
    }

    function parseTargetRow($row, rowIndex, result, now) {
        var targetVillageId = extractTargetId($row);
        if (!targetVillageId) {
            incrementCounter(result.malformedCounts, "missing_target_id");
            return null;
        }
        var coords = extractTargetCoords($row);
        if (!coords) {
            incrementCounter(result.malformedCounts, "missing_coords");
            return null;
        }
        var $freshnessCell = findFreshnessCell($row);
        if (!$freshnessCell.length) {
            incrementCounter(result.malformedCounts, "missing_report_age");
            return null;
        }
        var attackedAt = parseReportTimestamp($freshnessCell.text(), now);
        if (!attackedAt) {
            incrementCounter(result.malformedCounts, "invalid_report_age");
            return null;
        }
        var $resourcesCell = findResourcesCell($row);
        var resources = parseResourcesCell($resourcesCell);
        var wallAndDistance = parseWallAndDistance($row, $resourcesCell);
        var rowData = {
            rowIndex: rowIndex,
            targetVillageId: String(targetVillageId),
            coords: coords,
            continent: computeContinent(coords),
            reportAgeMinutes: Math.max(0, Math.round((now.getTime() - attackedAt.getTime()) / 60000)),
            reportAgeText: normalizeText($freshnessCell.text()),
            resourcesKnown: !!resources,
            resourceBreakdown: resources,
            resourcesTotal: resources ? resources.total : null,
            wallLevel: wallAndDistance.wallLevel,
            distance: wallAndDistance.distance,
            distanceText: wallAndDistance.distanceText,
            outgoingCount: extractOutgoingCount($row),
            reportColor: extractReportColor($row),
            haulStatus: extractHaulStatus($row),
            localCooldownMinutes: getLocalCooldownMinutes(targetVillageId, now),
            templates: extractTemplateMeta($row),
            rowElement: $row.get(0)
        };
        result.rows.push(rowData);
        return rowData;
    }

    function parseRows(options) {
        options = options || {};
        var visibleOnly = !!options.visibleOnly;
        var shouldLog = options.log !== false;
        var now = getServerNow();
        var result = {
            rows: [],
            visibleOnly: visibleOnly,
            now: now.toISOString(),
            scannedRows: 0,
            candidateRows: 0,
            malformedCounts: {},
            plunderListExists: false
        };
        if (shouldLog) {
            logStage("parse.start", TEXT.parseStarted + " visibleOnly=" + visibleOnly + ".");
        }
        var details = collectCandidateRows(visibleOnly);
        result.plunderListExists = details.plunderListExists;
        result.scannedRows = details.scannedRows;
        if (!details.plunderListExists) {
            if (shouldLog) {
                logStage("parse.none", "No #plunder_list was found on the page.");
            }
            return result;
        }
        if (!details.scannedRows) {
            if (shouldLog) {
                logStage("parse.none", "#plunder_list exists, but there are no " + (visibleOnly ? "visible " : "") + "rows to scan.");
            }
            return result;
        }
        result.candidateRows = details.candidateRows.length;
        if (shouldLog) {
            logStage("parse.scan", "Scanned " + result.scannedRows + " rows and found " + result.candidateRows + " candidate loot rows.");
        }
        if (!result.candidateRows) {
            if (shouldLog) {
                logStage("parse.none", "#plunder_list exists, but no rows matched the loot-row classifier.");
            }
            return result;
        }
        details.candidateRows.each(function (index) {
            parseTargetRow($(this), index + 1, result, now);
        });
        if (shouldLog) {
            if (!result.rows.length) {
                logStage("parse.none", "Candidate rows were found, but none could be parsed safely. Reasons: " + formatCounterMap(result.malformedCounts) + ".");
            } else {
                logStage("parse.done", TEXT.parseFinished + " Parsed " + result.rows.length + " rows. Malformed: " + formatCounterMap(result.malformedCounts) + ".");
            }
        }
        state.lastParsedRows = $.map(result.rows, serializeRowForDebug);
        return result;
    }

    function firstVisibleCandidateRow() {
        var details = collectCandidateRows(true);
        if (!details.candidateRows.length) {
            return null;
        }
        return details.candidateRows.first();
    }

    function currentSelectedTemplateKey(settings) {
        var template = String((settings && settings.sendTemplate) || "A").toUpperCase();
        return template === "B" ? "b" : "a";
    }

    function currentSelectedTemplateLabel(settings) {
        return currentSelectedTemplateKey(settings) === "b" ? "B" : "A";
    }

    function parseContinentList(raw) {
        var normalized = normalizeText(raw).replace(/[,;]+/g, " ");
        if (!normalized) {
            return [];
        }
        var parts = normalized.split(/\s+/);
        var clean = [];
        for (var i = 0; i < parts.length; i++) {
            var item = parts[i].toUpperCase().replace(/^K/, "");
            if (/^\d{2}$/.test(item)) {
                clean.push("K" + item);
            }
        }
        return clean;
    }

    function rowMatchesFilters(row, settings) {
        var reasons = [];
        var templateKey = currentSelectedTemplateKey(settings);
        var templateData = row.templates[templateKey];
        if (!templateData || !templateData.templateId || !templateData.enabled) {
            reasons.push("selected_template_unavailable");
        }
        var distanceMin = parseOptionalNumber(settings.distanceMin);
        var distanceMax = parseOptionalNumber(settings.distanceMax);
        var wallMin = parseOptionalNumber(settings.wallMin);
        var wallMax = parseOptionalNumber(settings.wallMax);
        var resourcesMin = parseOptionalNumber(settings.resourcesMin);
        var resourcesMax = parseOptionalNumber(settings.resourcesMax);
        var reportAgeMin = parseOptionalNumber(settings.reportAgeMin);
        var reportAgeMax = parseOptionalNumber(settings.reportAgeMax);
        var outgoingMin = parseOptionalNumber(settings.outgoingMin);
        var outgoingMax = parseOptionalNumber(settings.outgoingMax);
        var cooldownMinutes = parseOptionalNumber(settings.localCooldownMinutes);
        var continentList = parseContinentList(settings.continents);

        if (row.distance === null) {
            if (distanceMin !== null || distanceMax !== null) {
                reasons.push("unknown_distance");
            }
        } else {
            if (distanceMin !== null && row.distance < distanceMin) {
                reasons.push("distance_below_min");
            }
            if (distanceMax !== null && row.distance > distanceMax) {
                reasons.push("distance_above_max");
            }
        }

        if (row.wallLevel === null) {
            if (!settings.showUnknownWallTargets) {
                reasons.push("unknown_wall_hidden");
            }
        } else {
            if (wallMin !== null && row.wallLevel < wallMin) {
                reasons.push("wall_below_min");
            }
            if (wallMax !== null && row.wallLevel > wallMax) {
                reasons.push("wall_above_max");
            }
        }

        if (!row.resourcesKnown) {
            if (!settings.showRowsWithoutLootInfo) {
                reasons.push("unknown_loot_hidden");
            }
            if (resourcesMin !== null || resourcesMax !== null) {
                reasons.push("unknown_loot_for_resource_filter");
            }
        } else {
            if (resourcesMin !== null && row.resourcesTotal < resourcesMin) {
                reasons.push("resources_below_min");
            }
            if (resourcesMax !== null && row.resourcesTotal > resourcesMax) {
                reasons.push("resources_above_max");
            }
        }

        if (reportAgeMin !== null && row.reportAgeMinutes < reportAgeMin) {
            reasons.push("report_age_below_min");
        }
        if (reportAgeMax !== null && row.reportAgeMinutes > reportAgeMax) {
            reasons.push("report_age_above_max");
        }

        if (outgoingMin !== null && row.outgoingCount < outgoingMin) {
            reasons.push("outgoing_below_min");
        }
        if (outgoingMax !== null && row.outgoingCount > outgoingMax) {
            reasons.push("outgoing_above_max");
        }

        if (settings.haulStatus !== "any" && row.haulStatus !== settings.haulStatus) {
            reasons.push("haul_" + row.haulStatus);
        }

        if (!settings.allowedColors[row.reportColor]) {
            reasons.push("color_" + row.reportColor);
        }

        if (settings.localCooldownEnabled && cooldownMinutes !== null && row.localCooldownMinutes !== null && row.localCooldownMinutes < cooldownMinutes) {
            reasons.push("local_cooldown");
        }

        if (settings.continentMode === "include" && continentList.length && $.inArray(row.continent, continentList) === -1) {
            reasons.push("continent_not_included");
        }
        if (settings.continentMode === "exclude" && continentList.length && $.inArray(row.continent, continentList) > -1) {
            reasons.push("continent_excluded");
        }

        return {
            visible: !reasons.length,
            reasons: reasons
        };
    }

    function serializeFilteredRows(rows) {
        return $.map(rows, serializeRowForDebug);
    }

    function serializeParseResultForDebug(parseResult) {
        return {
            visibleOnly: !!parseResult.visibleOnly,
            now: parseResult.now,
            scannedRows: parseResult.scannedRows,
            candidateRows: parseResult.candidateRows,
            malformedCounts: safeClone(parseResult.malformedCounts || {}),
            plunderListExists: !!parseResult.plunderListExists,
            rows: $.map(parseResult.rows || [], serializeRowForDebug)
        };
    }

    function applyFilters() {
        var settings = readSettingsFromForm();
        state.currentSettings = settings;
        clearOwnRowHides();
        var parseResult = parseRows({ visibleOnly: false, log: true });
        if (!parseResult.plunderListExists) {
            setStatus(TEXT.statusNeedFarmPage, "error");
            state.lastFilteredRows = [];
            return parseResult;
        }
        var filteredRows = [];
        var hiddenCounts = {};
        $.each(parseResult.rows, function (_, row) {
            var evaluation = rowMatchesFilters(row, settings);
            if (evaluation.visible) {
                filteredRows.push(row);
            } else {
                incrementCounter(hiddenCounts, evaluation.reasons[0]);
                hideRow($(row.rowElement));
            }
        });
        state.lastFilteredRows = serializeFilteredRows(filteredRows);
        state.lastQueue = [];
        var message = "Showing " + filteredRows.length + " of " + parseResult.rows.length + " parsed rows. Hidden reasons: " + formatCounterMap(hiddenCounts) + ".";
        setStatus(message, filteredRows.length ? "success" : "error");
        logStage("filters", message);
        return {
            parseResult: parseResult,
            filteredRows: filteredRows,
            hiddenCounts: hiddenCounts
        };
    }

    function resetFilters() {
        clearOwnRowHides();
        state.lastFilteredRows = [];
        state.lastQueue = [];
        setStatus("All candidate rows are shown again. Form values are unchanged.", "success");
        logStage("filters.reset", "Restored all rows hidden by this script.");
    }

    function buildQueue(options) {
        options = options || {};
        var settings = options.settings || readSettingsFromForm();
        state.currentSettings = settings;
        var parseResult = parseRows({ visibleOnly: true, log: options.log !== false });
        var filteredRows = [];
        var skippedCounts = {};
        $.each(parseResult.rows, function (_, row) {
            var evaluation = rowMatchesFilters(row, settings);
            if (evaluation.visible) {
                filteredRows.push(row);
            } else {
                incrementCounter(skippedCounts, evaluation.reasons[0]);
            }
        });
        if (!parseResult.plunderListExists) {
            state.lastQueue = [];
            return {
                parseResult: parseResult,
                filteredRows: filteredRows,
                queue: [],
                skippedCounts: skippedCounts
            };
        }
        if (!filteredRows.length && options.log !== false) {
            logStage("queue.none", "Visible rows were parsed, but none are eligible for queueing. Reasons: " + formatCounterMap(skippedCounts) + ".");
        }
        var batchLimit = parseOptionalNumber(settings.batchLimit);
        if (batchLimit !== null && batchLimit >= 0) {
            filteredRows = filteredRows.slice(0, batchLimit);
        }
        var templateKey = currentSelectedTemplateKey(settings);
        var queue = [];
        $.each(filteredRows, function (_, row) {
            var templateData = row.templates[templateKey];
            if (!templateData || !templateData.templateId || !templateData.enabled) {
                incrementCounter(skippedCounts, "selected_template_unavailable");
                return;
            }
            queue.push({
                targetVillageId: row.targetVillageId,
                coords: row.coords,
                reportAgeMinutes: row.reportAgeMinutes,
                resourcesTotal: row.resourcesTotal,
                distance: row.distance,
                wallLevel: row.wallLevel,
                outgoingCount: row.outgoingCount,
                reportColor: row.reportColor,
                haulStatus: row.haulStatus,
                templateKey: templateKey,
                templateLabel: templateKey === "a" ? "A" : "B",
                templateId: templateData.templateId,
                rowElement: row.rowElement
            });
        });
        state.lastQueue = $.map(queue, function (job, index) {
            return {
                queueIndex: index + 1,
                targetVillageId: job.targetVillageId,
                coords: job.coords,
                templateLabel: job.templateLabel,
                templateId: job.templateId,
                reportAgeMinutes: job.reportAgeMinutes,
                resourcesTotal: job.resourcesTotal,
                distance: job.distance,
                wallLevel: job.wallLevel,
                outgoingCount: job.outgoingCount,
                reportColor: job.reportColor,
                haulStatus: job.haulStatus
            };
        });
        state.lastQueueBuiltAt = new Date().toISOString();
        if (options.log !== false) {
            logStage("queue", "Built queue with " + queue.length + " jobs from " + filteredRows.length + " eligible visible rows. Skipped: " + formatCounterMap(skippedCounts) + ".");
        }
        return {
            parseResult: parseResult,
            filteredRows: filteredRows,
            queue: queue,
            skippedCounts: skippedCounts
        };
    }

    function currentVillageId() {
        return topWindow.game_data && topWindow.game_data.village ? String(topWindow.game_data.village.id) : null;
    }

    function currentVillageName() {
        return topWindow.game_data && topWindow.game_data.village ? String(topWindow.game_data.village.display_name || topWindow.game_data.village.name || topWindow.game_data.village.id) : "";
    }

    function buildRunSummary(queueResult) {
        return {
            runSerial: state.currentRunSerial,
            startedAt: new Date().toISOString(),
            finishedAt: null,
            activeVillageId: state.activeVillageId,
            activeVillageName: state.activeVillageName,
            selectedTemplate: currentSelectedTemplateLabel(state.currentSettings || readSettingsFromForm()),
            parsedVisibleRows: queueResult.parseResult.rows.length,
            queuedJobs: queueResult.queue.length,
            skippedCounts: safeClone(queueResult.skippedCounts),
            successCount: 0,
            failureCount: 0,
            skipCount: 0,
            dispatchCount: 0,
            result: "running",
            failures: []
        };
    }

    function getDispatchClock() {
        if (topWindow.Timing && typeof topWindow.Timing.getElapsedTimeSinceLoad === "function") {
            return topWindow.Timing.getElapsedTimeSinceLoad();
        }
        return Date.now();
    }

    function requestStop(reason) {
        if (!state.isPlanning && !state.isRunning) {
            return;
        }
        if (!state.dispatchStarted) {
            state.stopAfterFirstDispatch = true;
            logStage("run.stop", reason || "Stop requested before first dispatch. Will stop after the first dispatch if the queue is non-empty.");
            return;
        }
        state.stopAfterCurrentDispatch = true;
        logStage("run.stop", reason || TEXT.runStopped);
    }

    function finishRun(result, message) {
        if (!state.isPlanning && !state.isRunning && !state.dispatchBusy) {
            return;
        }
        state.isPlanning = false;
        state.isRunning = false;
        state.dispatchBusy = false;
        state.dispatchStarted = false;
        state.currentQueue = [];
        state.currentQueueIndex = 0;
        state.stopAfterCurrentDispatch = false;
        state.stopAfterFirstDispatch = false;
        if (state.lastRunSummary) {
            state.lastRunSummary.finishedAt = new Date().toISOString();
            state.lastRunSummary.result = result;
        }
        var tone = result === "completed" ? "success" : (result === "empty" ? "error" : "error");
        setStatus(message || "Run finished: " + result + ".", tone);
        logStage("run.finish", message || ("Run finished with result " + result + "."));
    }

    function validateDispatchPrerequisites() {
        if (topWindow.game_data && topWindow.game_data.screen !== "am_farm") {
            return "The current page is no longer screen=am_farm.";
        }
        if (!currentVillageId()) {
            return "Current active village id is missing.";
        }
        if (currentVillageId() !== state.activeVillageId) {
            return "The active village changed from " + state.activeVillageId + " to " + currentVillageId() + ".";
        }
        if (!topWindow.Accountmanager || !topWindow.Accountmanager.send_units_link) {
            return "Accountmanager.send_units_link is missing.";
        }
        if (!topWindow.TribalWars || typeof topWindow.TribalWars.post !== "function") {
            return "TribalWars.post is unavailable.";
        }
        if ($("#plunder_list").length === 0) {
            return "#plunder_list is no longer available.";
        }
        return null;
    }

    function shouldPauseForDebounce() {
        var now = getDispatchClock();
        if (topWindow.Accountmanager && topWindow.Accountmanager.farm && topWindow.Accountmanager.farm.last_click && now - topWindow.Accountmanager.farm.last_click < 200) {
            return 200 - (now - topWindow.Accountmanager.farm.last_click);
        }
        var sinceLocalDispatch = Date.now() - state.lastDispatchTimestamp;
        if (sinceLocalDispatch < 250) {
            return 250 - sinceLocalDispatch;
        }
        return 0;
    }

    function scheduleNextDispatch(delay) {
        delay = delay || 0;
        topWindow.clearTimeout(state.dispatchTimerId);
        state.dispatchTimerId = topWindow.setTimeout(function () {
            runNextDispatch();
        }, delay);
    }

    function runNextDispatch() {
        if (!state.isRunning) {
            return;
        }
        if (state.dispatchBusy) {
            logStage("dispatch.busy", TEXT.sendBusy);
            scheduleNextDispatch(75);
            return;
        }
        if (!state.currentQueue.length || state.currentQueueIndex >= state.currentQueue.length) {
            finishRun("completed", "Queue finished. Sent " + (state.lastRunSummary ? state.lastRunSummary.successCount : 0) + " and failed " + (state.lastRunSummary ? state.lastRunSummary.failureCount : 0) + ".");
            return;
        }
        if (state.stopAfterCurrentDispatch && state.dispatchStarted) {
            finishRun("stopped", "Stopped before the next dispatch because Enter was released.");
            return;
        }
        var prerequisiteError = validateDispatchPrerequisites();
        if (prerequisiteError) {
            if (state.lastRunSummary) {
                state.lastRunSummary.failures.push(prerequisiteError);
            }
            finishRun("failed", prerequisiteError);
            notify("error", prerequisiteError);
            return;
        }
        var waitMs = shouldPauseForDebounce();
        if (waitMs > 0) {
            scheduleNextDispatch(waitMs);
            return;
        }
        var job = state.currentQueue[state.currentQueueIndex];
        if (!job || !job.rowElement || !topWindow.document.body.contains(job.rowElement)) {
            state.currentQueueIndex += 1;
            if (state.lastRunSummary) {
                state.lastRunSummary.skipCount += 1;
            }
            logStage("dispatch.skip", "Skipping queue item " + state.currentQueueIndex + ": row is no longer in the DOM.");
            scheduleNextDispatch(0);
            return;
        }
        var $row = $(job.rowElement);
        if (!$row.is(":visible")) {
            state.currentQueueIndex += 1;
            if (state.lastRunSummary) {
                state.lastRunSummary.skipCount += 1;
            }
            logStage("dispatch.skip", "Skipping target " + job.coords.text + ": row is no longer visible.");
            scheduleNextDispatch(0);
            return;
        }
        state.dispatchBusy = true;
        state.dispatchStarted = true;
        state.dispatchCount += 1;
        state.lastDispatchTimestamp = Date.now();
        if (state.lastRunSummary) {
            state.lastRunSummary.dispatchCount = state.dispatchCount;
        }
        if (topWindow.Accountmanager && topWindow.Accountmanager.farm) {
            topWindow.Accountmanager.farm.last_click = getDispatchClock();
        }
        logStage("dispatch.start", "Dispatch " + state.dispatchCount + "/" + state.currentQueue.length + " -> " + job.coords.text + " with template " + job.templateLabel + ".");
        topWindow.TribalWars.post(topWindow.Accountmanager.send_units_link, null, {
            target: job.targetVillageId,
            template_id: job.templateId,
            source: state.activeVillageId
        }, function (response) {
            handleDispatchResult(job, true, response);
        }, function (response) {
            handleDispatchResult(job, false, response);
        });
    }

    function handleDispatchResult(job, requestSucceeded, response) {
        state.dispatchBusy = false;
        state.currentQueueIndex += 1;
        var $row = job.rowElement ? $(job.rowElement) : $();
        var responseError = response && response.error ? String(response.error) : "";
        var responseSuccess = response && response.success ? String(response.success) : "";
        var notEnoughUnits = responseError.toLowerCase().indexOf("not enough units") > -1;
        if (requestSucceeded && !responseError) {
            markLocalSend(job.targetVillageId);
            if ($row.length) {
                hideRow($row);
            }
            if (topWindow.Accountmanager && topWindow.Accountmanager.farm && typeof topWindow.Accountmanager.farm.updateOwnUnitsAvailable === "function" && response && response.current_units) {
                try {
                    topWindow.Accountmanager.farm.updateOwnUnitsAvailable(response.current_units);
                } catch (updateUnitsError) {
                    logStage("dispatch.units", "Could not refresh own units: " + updateUnitsError.message);
                }
            }
            if (state.lastRunSummary) {
                state.lastRunSummary.successCount += 1;
            }
            logStage("dispatch.success", "Sent to " + job.coords.text + " with template " + job.templateLabel + ".");
            if (responseSuccess) {
                notify("success", responseSuccess);
            }
        } else {
            var failureText = responseError || normalizeText(response && response.responseText) || String(response || "Unknown send failure");
            if (state.lastRunSummary) {
                state.lastRunSummary.failureCount += 1;
                state.lastRunSummary.failures.push(failureText);
            }
            logStage("dispatch.fail", "Send failed for " + job.coords.text + ": " + failureText);
            notify("error", "Send failed for " + job.coords.text + ": " + failureText);
            if (notEnoughUnits) {
                finishRun("failed", "Stopping because the active village no longer has enough units for the selected template.");
                return;
            }
        }
        if (!state.isRunning) {
            return;
        }
        if (state.stopAfterFirstDispatch && state.dispatchCount >= 1) {
            finishRun("stopped", "Stopped after the first dispatch because Enter was released during the run start.");
            return;
        }
        if (state.stopAfterCurrentDispatch) {
            finishRun("stopped", "Stopped after the current dispatch because Enter was released.");
            return;
        }
        scheduleNextDispatch(0);
    }

    function startRunFromEnter() {
        if (state.isPlanning || state.isRunning) {
            logStage("run.ignore", "Run ignored because a run is already active.");
            return;
        }
        var prerequisiteError = validateDispatchPrerequisites();
        if (prerequisiteError && prerequisiteError !== "#plunder_list is no longer available.") {
            setStatus(prerequisiteError, "error");
            logStage("run.fail", prerequisiteError);
            return;
        }
        state.currentRunSerial += 1;
        state.isPlanning = true;
        state.isRunning = true;
        state.dispatchStarted = false;
        state.dispatchBusy = false;
        state.currentQueueIndex = 0;
        state.currentQueue = [];
        state.stopAfterCurrentDispatch = false;
        state.stopAfterFirstDispatch = false;
        state.dispatchCount = 0;
        state.activeVillageId = currentVillageId();
        state.activeVillageName = currentVillageName();
        logStage("run.start", "Fresh key cycle accepted. Planning run " + state.currentRunSerial + " for " + state.activeVillageName + ".");
        var queueResult = buildQueue({ log: true, settings: readSettingsFromForm() });
        state.lastRunSummary = buildRunSummary(queueResult);
        if (!queueResult.parseResult.plunderListExists) {
            finishRun("failed", TEXT.statusNeedFarmPage);
            return;
        }
        if (!queueResult.queue.length) {
            finishRun("empty", "Queue is empty. Parsed visible rows: " + queueResult.parseResult.rows.length + ". Reasons: " + formatCounterMap(queueResult.skippedCounts) + ".");
            return;
        }
        state.currentQueue = queueResult.queue.slice();
        state.isPlanning = false;
        setStatus("Queue ready: " + state.currentQueue.length + " jobs from the current active village. First dispatch granted.", "success");
        logStage("run.queue", TEXT.queueReady + " " + state.currentQueue.length + " jobs from " + state.activeVillageName + ".");
        scheduleNextDispatch(0);
    }

    function isEditableTarget(eventTarget) {
        var $target = $(eventTarget);
        return $target.is("input, textarea, select") || $target.prop("contenteditable") === "true" || $target.closest("#controleng_la_panel").find("input:focus, textarea:focus, select:focus").length > 0;
    }

    function tryClick($element) {
        if (!$element || !$element.length || $element.hasClass("farm_icon_disabled")) {
            return false;
        }
        $element.get(0).click();
        return true;
    }

    function handleManualMaster() {
        var row = firstVisibleCandidateRow();
        if (!row || !row.length) {
            logStage("manual.master", "No visible candidate row exists for manual master.");
            return;
        }
        var templateKey = currentSelectedTemplateKey(readSettingsFromForm());
        var selector = templateKey === "b" ? "a.farm_icon_b" : "a.farm_icon_a";
        if (!tryClick(row.find(selector).first())) {
            logStage("manual.master", "Selected template " + currentSelectedTemplateLabel(readSettingsFromForm()) + " is disabled on the first visible row.");
        }
    }

    function handleSkipHotkey() {
        var row = firstVisibleCandidateRow();
        if (!row || !row.length) {
            return;
        }
        hideRow(row);
        setStatus("Skipped the first visible row manually.", "success");
    }

    function tryVillageNavigation(direction) {
        var selectors = direction === "prev" ? [
            "#village_switch_left",
            "a.arrowLeft",
            "a[href*='screen=am_farm'][href*='dir=prev']"
        ] : [
            "#village_switch_right",
            "a.arrowRight",
            "a[href*='screen=am_farm'][href*='dir=next']"
        ];
        for (var i = 0; i < selectors.length; i++) {
            var $element = $(selectors[i]).first();
            if ($element.length) {
                var href = $element.is("a") ? $element.attr("href") : $element.find("a").first().attr("href");
                if (href) {
                    topWindow.location.href = href;
                    return true;
                }
            }
        }
        logStage("manual.nav", "No " + direction + " village control was found on the page.");
        return false;
    }

    function bindHotkeys() {
        $(topWindow.document).off(".controlengLaHotkeys");
        $(topWindow.document).on("keydown.controlengLaHotkeys", function (event) {
            var keyCode = event.which || event.keyCode;
            if (isEditableTarget(event.target)) {
                return;
            }
            if (keyCode === HOTKEYS.run) {
                if (state.enterKeyIsDown || state.enterCycleConsumed) {
                    logStage("run.ignore", TEXT.runIgnored);
                    event.preventDefault();
                    return;
                }
                state.enterKeyIsDown = true;
                state.enterCycleConsumed = true;
                startRunFromEnter();
                event.preventDefault();
                return;
            }
            if (state.isPlanning || state.isRunning) {
                requestStop("Manual hotkey " + keyCode + " pressed while the runner was active.");
                event.preventDefault();
                return;
            }
            var $row = firstVisibleCandidateRow();
            switch (keyCode) {
                case HOTKEYS.a:
                    if ($row && $row.length) {
                        tryClick($row.find("a.farm_icon_a").first());
                    }
                    event.preventDefault();
                    break;
                case HOTKEYS.b:
                    if ($row && $row.length) {
                        tryClick($row.find("a.farm_icon_b").first());
                    }
                    event.preventDefault();
                    break;
                case HOTKEYS.c:
                    if ($row && $row.length) {
                        tryClick($row.find("a.farm_icon_c").first());
                    }
                    event.preventDefault();
                    break;
                case HOTKEYS.master:
                    handleManualMaster();
                    event.preventDefault();
                    break;
                case HOTKEYS.skip:
                    handleSkipHotkey();
                    event.preventDefault();
                    break;
                case HOTKEYS.left:
                    tryVillageNavigation("prev");
                    event.preventDefault();
                    break;
                case HOTKEYS.right:
                    tryVillageNavigation("next");
                    event.preventDefault();
                    break;
            }
        });
        $(topWindow.document).on("keyup.controlengLaHotkeys", function (event) {
            var keyCode = event.which || event.keyCode;
            if (keyCode !== HOTKEYS.run) {
                return;
            }
            state.enterKeyIsDown = false;
            state.enterCycleConsumed = false;
            if (state.isPlanning && !state.dispatchStarted) {
                state.stopAfterFirstDispatch = true;
                logStage("run.stop", TEXT.enterReleased + " The first dispatch will still be attempted because planning already started.");
                return;
            }
            if (state.isRunning) {
                requestStop(TEXT.enterReleased);
            }
        });
    }

    function ensureValidPage() {
        if (!topWindow.game_data || topWindow.game_data.screen !== "am_farm") {
            setStatus(TEXT.statusNeedFarmPage, "error");
            notify("error", TEXT.statusNeedFarmPage);
            logStage("bootstrap", "screen=am_farm is required. Current screen: " + (topWindow.game_data ? topWindow.game_data.screen : "unknown") + ".");
            return false;
        }
        if (!$("#plunder_list").length) {
            setStatus("The page is screen=am_farm, but #plunder_list was not found.", "error");
            logStage("bootstrap", "#plunder_list is missing.");
            return false;
        }
        return true;
    }

    function renderPanelHtml() {
        return [
            "<div class='vis' id='controleng_la_panel'>",
            "  <table class='vis controleng-la-table'>",
            "    <thead>",
            "      <tr><th colspan='4'>",
            "        <div class='controleng-la-head'>",
            "          <span class='title'>" + scriptName + "</span>",
            "          <span class='controleng-la-author'>" + TEXT.authorHtml + "</span>",
            "        </div>",
            "      </th></tr>",
            "    </thead>",
            "    <tbody>",
            "      <tr><td colspan='4'>",
            "        <div class='controleng-la-toolbar'>",
            "          <label><span>Profile</span><select id='cla_profile_select'></select></label>",
            "          <input type='button' class='btn' id='cla_profile_new' value='New'>",
            "          <input type='button' class='btn' id='cla_profile_update' value='Update'>",
            "          <input type='button' class='btn' id='cla_profile_delete' value='Delete'>",
            "          <input type='button' class='btn' id='cla_profile_export' value='Export'>",
            "          <input type='button' class='btn' id='cla_profile_import' value='Import'>",
            "        </div>",
            "      </td></tr>",
            "      <tr><td colspan='4'>",
            "        <div class='controleng-la-grid'>",
            "          <div class='controleng-la-section'>",
            "            <h5>Queue & cooldown</h5>",
            "            <div class='controleng-la-row'>",
            "              <div class='controleng-la-field'><label for='cla_send_template'>" + TEXT.queueTemplateLabel + "</label><select id='cla_send_template'><option value='A'>A</option><option value='B'>B</option></select></div>",
            "              <div class='controleng-la-field'><label for='cla_batch_limit'>" + TEXT.queueBatchLabel + "</label><input type='number' id='cla_batch_limit' min='0' step='1'></div>",
            "            </div>",
            "            <div class='controleng-la-row'>",
            "              <div class='controleng-la-field inline'><input type='checkbox' id='cla_local_cooldown_enabled'><label for='cla_local_cooldown_enabled'>" + TEXT.cooldownLabel + "</label></div>",
            "              <div class='controleng-la-field'><label for='cla_local_cooldown_minutes'>Minutes</label><input type='number' id='cla_local_cooldown_minutes' min='0' step='1'></div>",
            "            </div>",
            "            <div class='controleng-la-row'><span class='controleng-la-hint'>" + TEXT.statusQueueScope + "</span></div>",
            "          </div>",
            "          <div class='controleng-la-section'>",
            "            <h5>Distance, wall, resources</h5>",
            "            <div class='controleng-la-row'>",
            "              <div class='controleng-la-field'><label for='cla_distance_min'>Distance min</label><input type='number' id='cla_distance_min' min='0' step='0.1'></div>",
            "              <div class='controleng-la-field'><label for='cla_distance_max'>Distance max</label><input type='number' id='cla_distance_max' min='0' step='0.1'></div>",
            "            </div>",
            "            <div class='controleng-la-row'>",
            "              <div class='controleng-la-field'><label for='cla_wall_min'>Wall min</label><input type='number' id='cla_wall_min' min='0' step='1'></div>",
            "              <div class='controleng-la-field'><label for='cla_wall_max'>Wall max</label><input type='number' id='cla_wall_max' min='0' step='1'></div>",
            "            </div>",
            "            <div class='controleng-la-row'>",
            "              <div class='controleng-la-field'><label for='cla_resources_min'>Resources min</label><input type='number' id='cla_resources_min' min='0' step='1'></div>",
            "              <div class='controleng-la-field'><label for='cla_resources_max'>Resources max</label><input type='number' id='cla_resources_max' min='0' step='1'></div>",
            "            </div>",
            "          </div>",
            "          <div class='controleng-la-section'>",
            "            <h5>Report age, outgoing, continent</h5>",
            "            <div class='controleng-la-row'>",
            "              <div class='controleng-la-field'><label for='cla_report_age_min'>" + TEXT.reportAgeLabel + " min</label><input type='number' id='cla_report_age_min' min='0' step='1'></div>",
            "              <div class='controleng-la-field'><label for='cla_report_age_max'>" + TEXT.reportAgeLabel + " max</label><input type='number' id='cla_report_age_max' min='0' step='1'></div>",
            "            </div>",
            "            <div class='controleng-la-row'>",
            "              <div class='controleng-la-field'><label for='cla_outgoing_min'>Outgoing min</label><input type='number' id='cla_outgoing_min' min='0' step='1'></div>",
            "              <div class='controleng-la-field'><label for='cla_outgoing_max'>Outgoing max</label><input type='number' id='cla_outgoing_max' min='0' step='1'></div>",
            "            </div>",
            "            <div class='controleng-la-row'>",
            "              <div class='controleng-la-field'><label for='cla_continent_mode'>Continent mode</label><select id='cla_continent_mode'><option value='any'>Any</option><option value='include'>Only listed</option><option value='exclude'>Hide listed</option></select></div>",
            "              <div class='controleng-la-field'><label for='cla_continents'>Continents</label><input type='text' id='cla_continents' placeholder='K44 K45'></div>",
            "            </div>",
            "          </div>",
            "          <div class='controleng-la-section'>",
            "            <h5>Haul, report color, unknowns</h5>",
            "            <div class='controleng-la-row'>",
            "              <div class='controleng-la-field'><label for='cla_haul_status'>Haul status</label><select id='cla_haul_status'><option value='any'>Any</option><option value='full'>Full haul</option><option value='partial'>Partial haul</option><option value='unknown'>Unknown haul</option></select></div>",
            "            </div>",
            "            <div class='controleng-la-row controleng-la-checkbox-list'>",
            "              <label><input type='checkbox' id='cla_show_unknown_wall'> Show unknown walls</label>",
            "              <label><input type='checkbox' id='cla_show_unknown_loot'> Show rows without usable loot info</label>",
            "            </div>",
            "            <div class='controleng-la-divider'></div>",
            "            <div class='controleng-la-colors'>",
            "              <label><input type='checkbox' id='cla_color_blue'> Blue</label>",
            "              <label><input type='checkbox' id='cla_color_green'> Green</label>",
            "              <label><input type='checkbox' id='cla_color_yellow'> Yellow</label>",
            "              <label><input type='checkbox' id='cla_color_red_yellow'> Red/yellow</label>",
            "              <label><input type='checkbox' id='cla_color_red_blue'> Red/blue</label>",
            "              <label><input type='checkbox' id='cla_color_red'> Red</label>",
            "              <label><input type='checkbox' id='cla_color_unknown'> Unknown</label>",
            "            </div>",
            "          </div>",
            "        </div>",
            "      </td></tr>",
            "      <tr><td colspan='4'>",
            "        <div class='controleng-la-actions'>",
            "          <input type='button' class='btn' id='cla_apply' value='Apply'>",
            "          <input type='button' class='btn' id='cla_reset' value='Reset'>",
            "          <input type='button' class='btn' id='cla_preview_queue' value='Preview Queue'>",
            "          <span class='controleng-la-pill'>Hold Enter to run</span>",
            "          <span class='controleng-la-small controleng-la-muted'>Current village only. Template A/B only.</span>",
            "        </div>",
            "        <div id='cla_status' class='controleng-la-status'>" + TEXT.statusReady + "</div>",
            "        <div class='controleng-la-hotkeys'>",
            "          <span><strong>J</strong> = A</span>",
            "          <span><strong>K</strong> = B</span>",
            "          <span><strong>L</strong> = C</span>",
            "          <span><strong>G</strong> = Manual Master (selected template)</span>",
            "          <span><strong>X</strong> = Skip first visible row</span>",
            "          <span><strong>Q / E</strong> = Prev / next village (best effort)</span>",
            "        </div>",
            "      </td></tr>",
            "    </tbody>",
            "  </table>",
            "</div>"
        ].join("");
    }

    function renderPanel() {
        $("#controleng_la_panel").remove();
        var $target = $("#contentContainer h3").eq(0);
        if ($target.length) {
            $target.after(renderPanelHtml());
        } else if ($("#content_value").length) {
            $("#content_value").prepend(renderPanelHtml());
        } else {
            $("body").prepend(renderPanelHtml());
        }
    }

    function setStatus(message, tone) {
        var $status = $("#cla_status");
        if (!$status.length) {
            return;
        }
        $status.removeClass("error success");
        if (tone === "error" || tone === "success") {
            $status.addClass(tone);
        }
        $status.text(message);
    }

    function fillProfileSelect() {
        var profiles = getProfiles();
        var selected = getSelectedProfileName();
        var $select = $("#cla_profile_select");
        $select.empty();
        $.each(Object.keys(profiles).sort(), function (_, profileName) {
            $select.append("<option value='" + profileName + "'>" + profileName + "</option>");
        });
        $select.val(selected);
    }

    function readSettingsFromForm() {
        var allowedColors = {};
        $.each(COLORS, function (_, colorKey) {
            allowedColors[colorKey] = $("#cla_color_" + colorKey).prop("checked");
        });
        return normalizeProfile({
            sendTemplate: $("#cla_send_template").val(),
            batchLimit: sanitizeNumberInput($("#cla_batch_limit").val()),
            distanceMin: sanitizeNumberInput($("#cla_distance_min").val()),
            distanceMax: sanitizeNumberInput($("#cla_distance_max").val()),
            wallMin: sanitizeNumberInput($("#cla_wall_min").val()),
            wallMax: sanitizeNumberInput($("#cla_wall_max").val()),
            resourcesMin: sanitizeNumberInput($("#cla_resources_min").val()),
            resourcesMax: sanitizeNumberInput($("#cla_resources_max").val()),
            reportAgeMin: sanitizeNumberInput($("#cla_report_age_min").val()),
            reportAgeMax: sanitizeNumberInput($("#cla_report_age_max").val()),
            outgoingMin: sanitizeNumberInput($("#cla_outgoing_min").val()),
            outgoingMax: sanitizeNumberInput($("#cla_outgoing_max").val()),
            haulStatus: $("#cla_haul_status").val(),
            continentMode: $("#cla_continent_mode").val(),
            continents: $("#cla_continents").val(),
            localCooldownEnabled: $("#cla_local_cooldown_enabled").prop("checked"),
            localCooldownMinutes: sanitizeNumberInput($("#cla_local_cooldown_minutes").val()),
            showUnknownWallTargets: $("#cla_show_unknown_wall").prop("checked"),
            showRowsWithoutLootInfo: $("#cla_show_unknown_loot").prop("checked"),
            allowedColors: allowedColors
        });
    }

    function writeSettingsToForm(settings) {
        settings = normalizeProfile(settings);
        $("#cla_send_template").val(settings.sendTemplate);
        $("#cla_batch_limit").val(settings.batchLimit);
        $("#cla_distance_min").val(settings.distanceMin);
        $("#cla_distance_max").val(settings.distanceMax);
        $("#cla_wall_min").val(settings.wallMin);
        $("#cla_wall_max").val(settings.wallMax);
        $("#cla_resources_min").val(settings.resourcesMin);
        $("#cla_resources_max").val(settings.resourcesMax);
        $("#cla_report_age_min").val(settings.reportAgeMin);
        $("#cla_report_age_max").val(settings.reportAgeMax);
        $("#cla_outgoing_min").val(settings.outgoingMin);
        $("#cla_outgoing_max").val(settings.outgoingMax);
        $("#cla_haul_status").val(settings.haulStatus);
        $("#cla_continent_mode").val(settings.continentMode);
        $("#cla_continents").val(settings.continents);
        $("#cla_local_cooldown_enabled").prop("checked", settings.localCooldownEnabled);
        $("#cla_local_cooldown_minutes").val(settings.localCooldownMinutes);
        $("#cla_show_unknown_wall").prop("checked", settings.showUnknownWallTargets);
        $("#cla_show_unknown_loot").prop("checked", settings.showRowsWithoutLootInfo);
        $.each(COLORS, function (_, colorKey) {
            $("#cla_color_" + colorKey).prop("checked", !!settings.allowedColors[colorKey]);
        });
    }

    function loadProfileIntoForm(profileName) {
        var profiles = getProfiles();
        var profile = profiles[profileName] ? normalizeProfile(profiles[profileName]) : defaultProfile();
        setSelectedProfileName(profileName);
        fillProfileSelect();
        writeSettingsToForm(profile);
        state.currentSettings = profile;
        logStage("profile.load", "Loaded profile " + profileName + ".");
    }

    function saveCurrentFormAsProfile(profileName, overwrite) {
        var profiles = getProfiles();
        if (!overwrite && profiles[profileName]) {
            return false;
        }
        profiles[profileName] = readSettingsFromForm();
        persistProfiles(profiles);
        setSelectedProfileName(profileName);
        fillProfileSelect();
        return true;
    }

    function createProfile() {
        var profileName = topWindow.prompt("New profile name:", "");
        if (profileName === null) {
            return;
        }
        profileName = normalizeText(profileName);
        if (!profileName) {
            notify("error", "Profile name cannot be empty.");
            return;
        }
        if (!saveCurrentFormAsProfile(profileName, false)) {
            notify("error", "A profile with that name already exists.");
            return;
        }
        setStatus("Created profile " + profileName + ".", "success");
    }

    function updateProfile() {
        var profileName = $("#cla_profile_select").val();
        if (!profileName) {
            notify("error", "No profile is selected.");
            return;
        }
        saveCurrentFormAsProfile(profileName, true);
        setStatus("Updated profile " + profileName + ".", "success");
    }

    function deleteProfile() {
        var profileName = $("#cla_profile_select").val();
        if (!profileName || profileName === DEFAULT_PROFILE_NAME) {
            notify("error", "The default profile cannot be deleted.");
            return;
        }
        if (!topWindow.confirm("Delete profile \"" + profileName + "\"?")) {
            return;
        }
        var profiles = getProfiles();
        delete profiles[profileName];
        persistProfiles(profiles);
        setSelectedProfileName(DEFAULT_PROFILE_NAME);
        fillProfileSelect();
        loadProfileIntoForm(DEFAULT_PROFILE_NAME);
        setStatus("Deleted profile " + profileName + ".", "success");
    }

    function exportProfile() {
        var profileName = $("#cla_profile_select").val();
        if (!profileName) {
            notify("error", "No profile is selected.");
            return;
        }
        var profiles = getProfiles();
        var payload = JSON.stringify({
            name: profileName,
            settings: profiles[profileName]
        });
        topWindow.prompt("Copy this profile JSON:", payload);
    }

    function importProfile() {
        var raw = topWindow.prompt("Paste exported profile JSON:", "");
        if (raw === null) {
            return;
        }
        try {
            var parsed = JSON.parse(raw);
            if (!parsed || typeof parsed !== "object" || !parsed.name || !parsed.settings) {
                throw new Error("Invalid profile object.");
            }
            var profileName = normalizeText(parsed.name);
            if (!profileName) {
                throw new Error("Missing profile name.");
            }
            saveCurrentFormAsProfile(profileName, true);
            var profiles = getProfiles();
            profiles[profileName] = normalizeProfile(parsed.settings);
            persistProfiles(profiles);
            loadProfileIntoForm(profileName);
            setStatus("Imported profile " + profileName + ".", "success");
        } catch (error) {
            notify("error", "Could not import profile: " + error.message);
        }
    }

    function previewQueue() {
        var queueResult = buildQueue({ log: true });
        if (!queueResult.parseResult.plunderListExists) {
            setStatus(TEXT.statusNeedFarmPage, "error");
            return;
        }
        if (!queueResult.queue.length) {
            setStatus("Queue preview: 0 jobs. Reasons: " + formatCounterMap(queueResult.skippedCounts) + ".", "error");
            return;
        }
        setStatus("Queue preview: " + queueResult.queue.length + " jobs with template " + currentSelectedTemplateLabel(readSettingsFromForm()) + ".", "success");
    }

    function bindPanelEvents() {
        $("#cla_profile_select").off(".controlengLaUi").on("change.controlengLaUi", function () {
            loadProfileIntoForm($(this).val());
            applyFilters();
        });
        $("#cla_profile_new").off(".controlengLaUi").on("click.controlengLaUi", createProfile);
        $("#cla_profile_update").off(".controlengLaUi").on("click.controlengLaUi", updateProfile);
        $("#cla_profile_delete").off(".controlengLaUi").on("click.controlengLaUi", deleteProfile);
        $("#cla_profile_export").off(".controlengLaUi").on("click.controlengLaUi", exportProfile);
        $("#cla_profile_import").off(".controlengLaUi").on("click.controlengLaUi", importProfile);
        $("#cla_apply").off(".controlengLaUi").on("click.controlengLaUi", function () {
            applyFilters();
        });
        $("#cla_reset").off(".controlengLaUi").on("click.controlengLaUi", function () {
            resetFilters();
        });
        $("#cla_preview_queue").off(".controlengLaUi").on("click.controlengLaUi", function () {
            previewQueue();
        });
    }

    function getStateSnapshot() {
        return {
            version: version,
            isPlanning: state.isPlanning,
            isRunning: state.isRunning,
            dispatchBusy: state.dispatchBusy,
            dispatchStarted: state.dispatchStarted,
            currentQueueIndex: state.currentQueueIndex,
            currentQueueLength: state.currentQueue.length,
            dispatchCount: state.dispatchCount,
            stopAfterCurrentDispatch: state.stopAfterCurrentDispatch,
            stopAfterFirstDispatch: state.stopAfterFirstDispatch,
            enterKeyIsDown: state.enterKeyIsDown,
            enterCycleConsumed: state.enterCycleConsumed,
            activeVillageId: state.activeVillageId,
            activeVillageName: state.activeVillageName,
            lastDispatchTimestamp: state.lastDispatchTimestamp,
            lastQueueBuiltAt: state.lastQueueBuiltAt,
            lastRunSummary: state.lastRunSummary ? safeClone(state.lastRunSummary) : null
        };
    }

    function exposeDebugApi() {
        var debugApi = {
            getState: function () {
                return getStateSnapshot();
            },
            parseRows: function () {
                return serializeParseResultForDebug(parseRows({ visibleOnly: false, log: true }));
            },
            getFilteredRows: function () {
                var settings = readSettingsFromForm();
                var parseResult = parseRows({ visibleOnly: false, log: false });
                var filteredRows = [];
                $.each(parseResult.rows, function (_, row) {
                    if (rowMatchesFilters(row, settings).visible) {
                        filteredRows.push(serializeRowForDebug(row));
                    }
                });
                return filteredRows;
            },
            buildQueue: function () {
                var queueResult = buildQueue({ log: true });
                return {
                    parseResult: serializeParseResultForDebug(queueResult.parseResult),
                    queue: safeClone(state.lastQueue),
                    skippedCounts: safeClone(queueResult.skippedCounts)
                };
            },
            getLastQueue: function () {
                return safeClone(state.lastQueue);
            },
            getLastRunSummary: function () {
                return state.lastRunSummary ? safeClone(state.lastRunSummary) : null;
            }
        };
        topWindow.ControlengLA_Debug = debugApi;
        window.ControlengLA_Debug = debugApi;
    }

    function cleanup() {
        topWindow.clearTimeout(state.dispatchTimerId);
        $(topWindow.document).off(".controlengLaHotkeys");
        $("#controleng_la_panel").remove();
        delete topWindow.ControlengLA_Debug;
        delete window.ControlengLA_Debug;
        delete topWindow.ControlengLA_Cleanup;
    }

    function bootstrap() {
        injectStyles();
        renderPanel();
        fillProfileSelect();
        loadProfileIntoForm(getSelectedProfileName());
        bindPanelEvents();
        bindHotkeys();
        exposeDebugApi();
        topWindow.ControlengLA_Cleanup = cleanup;
        state.initialized = true;
        if (ensureValidPage()) {
            applyFilters();
        }
        log("Initialized. Using " + (topWindow.game_data && topWindow.game_data.screen === "am_farm" ? "screen=am_farm" : "non-farm page") + ".");
    }

    bootstrap();
}());
