(() => {
  "use strict";

  const INSTANCE_KEY = "YaverusLAV2";
  const SCRIPT_NAME = "Yaverus-LA";
  const SCRIPT_VERSION = "2.0.0";
  const PANEL_ID = "yaverus-la-v2-panel";
  const STYLE_ID = "yaverus-la-v2-style";
  const SETTINGS_KEY = "YaverusLAv2.settings";
  const SPEED_CACHE_KEY = `YaverusLAv2.unitSpeeds.${window.game_data?.world || "default"}`;
  const SPEED_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
  const COMMAND_CACHE_TTL_MS = 30 * 1000;
  const LOOP_PACING_MS = 450;
  const IDLE_WAIT_MS = 180;
  const ERROR_WAIT_MS = 900;
  const MUTATION_DEBOUNCE_MS = 150;
  const MAX_CONSECUTIVE_ERRORS = 3;

  if (
    window[INSTANCE_KEY] &&
    typeof window[INSTANCE_KEY].destroy === "function" &&
    !window[INSTANCE_KEY].__destroyed
  ) {
    window[INSTANCE_KEY].destroy();
  }

  const DEFAULT_SETTINGS = {
    enabled: true,
    maxDistance: 15,
    repeatIntervalMinutes: 10,
    aMaxWall: 0,
    cMaxWall: 0,
    cMinLight: 15,
    fullHaulUsesC: true,
    debug: false,
  };

  const REASON_LABELS = {
    "native-hidden": "Hidden by native page",
    "missing-target": "Missing target",
    "missing-distance": "Missing distance",
    "distance-filter": "Distance filter",
    "missing-wall": "Missing wall",
    "a-button-missing": "A button missing",
    "a-button-disabled": "A button disabled",
    "a-template-id-missing": "A template id missing",
    "a-template-missing": "A template missing",
    "a-template-empty": "A template empty",
    "a-units-unavailable": "Not enough units for A",
    "a-wall-filter": "A wall filter",
    "c-button-missing": "C button missing",
    "c-button-disabled": "C button disabled",
    "c-report-id-missing": "C report id missing",
    "c-forecast-missing": "C forecast missing",
    "c-light-filter": "C minimum light filter",
    "c-units-unavailable": "Not enough units for C forecast",
    "c-wall-filter": "C wall filter",
    "travel-time-missing": "Travel time unavailable",
    cooldown: "Cooldown",
  };

  const Logger = {
    debug(...args) {
      if (App.settings?.debug) {
        console.debug(`[${SCRIPT_NAME} v2]`, ...args);
      }
    },
    info(...args) {
      console.info(`[${SCRIPT_NAME} v2]`, ...args);
    },
    warn(...args) {
      console.warn(`[${SCRIPT_NAME} v2]`, ...args);
    },
    error(...args) {
      console.error(`[${SCRIPT_NAME} v2]`, ...args);
    },
  };

  const Selectors = {
    widget() {
      return document.querySelector("#am_widget_Farm");
    },
    widgetBody() {
      return document.querySelector("#am_widget_Farm .body");
    },
    plunderTable() {
      return document.querySelector("#plunder_list");
    },
    lootRows() {
      return Array.from(
        document.querySelectorAll("#plunder_list tr[id^='village_']")
      );
    },
  };

  const Dom = {
    isVisible(element) {
      if (!(element instanceof Element)) {
        return false;
      }
      const style = window.getComputedStyle(element);
      return style.display !== "none" && style.visibility !== "hidden";
    },

    isTypingTarget(target) {
      const active = target instanceof Element ? target : document.activeElement;
      if (!(active instanceof Element)) {
        return false;
      }
      return Boolean(
        active.closest(
          "input, textarea, select, [contenteditable=''], [contenteditable='true']"
        )
      );
    },

    wait(ms) {
      return new Promise((resolve) => {
        window.setTimeout(resolve, ms);
      });
    },

    async waitInterruptible(ms) {
      let remaining = Math.max(0, ms);
      while (remaining > 0) {
        if (!App.state.holdRequested || App.__destroyed) {
          return;
        }
        const slice = Math.min(remaining, 60);
        await this.wait(slice);
        remaining -= slice;
      }
    },

    toNumber(value, fallback = NaN, minValue = null) {
      const numeric = Number(String(value).replace(",", "."));
      if (!Number.isFinite(numeric)) {
        return fallback;
      }
      if (Number.isFinite(minValue)) {
        return Math.max(minValue, numeric);
      }
      return numeric;
    },

    extractFirstNumber(text) {
      if (!text) {
        return NaN;
      }
      const match = String(text).replace(",", ".").match(/-?\d+(?:\.\d+)?/);
      return match ? Number(match[0]) : NaN;
    },

    extractQueryParam(href, key) {
      try {
        const url = new URL(href, window.location.origin);
        return url.searchParams.get(key);
      } catch (error) {
        return null;
      }
    },

    decodeHtml(text) {
      if (typeof text !== "string") {
        return "";
      }
      const area = document.createElement("textarea");
      area.innerHTML = text;
      return area.value;
    },

    escapeHtml(text) {
      return String(text ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
    },

    parseTooltipDurationSeconds(button) {
      if (!(button instanceof Element)) {
        return NaN;
      }
      const raw =
        button.getAttribute("data-title") ||
        button.getAttribute("title") ||
        "";
      const text = this.decodeHtml(raw);
      const match = text.match(/(\d+):(\d{2}):(\d{2})/);
      if (!match) {
        return NaN;
      }
      return (
        Number(match[1]) * 3600 +
        Number(match[2]) * 60 +
        Number(match[3])
      );
    },

    formatDuration(seconds) {
      if (!Number.isFinite(seconds) || seconds < 0) {
        return "--";
      }
      const total = Math.round(seconds);
      const hours = Math.floor(total / 3600);
      const minutes = Math.floor((total % 3600) / 60);
      const secs = total % 60;
      return `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
    },

    formatTime(ms) {
      if (!Number.isFinite(ms)) {
        return "--";
      }
      const date = new Date(ms);
      return `${String(date.getHours()).padStart(2, "0")}:${String(
        date.getMinutes()
      ).padStart(2, "0")}:${String(date.getSeconds()).padStart(2, "0")}`;
    },

    showError(error) {
      const message =
        error instanceof Error ? error.message : String(error || "Unknown error");
      if (window.UI?.ErrorMessage) {
        window.UI.ErrorMessage(message);
      }
    },
  };

  const Time = {
    nowServerMs() {
      const serverTime = document.getElementById("serverTime");
      if (!serverTime) {
        return Date.now();
      }
      const parts = (serverTime.closest("p")?.textContent || serverTime.textContent || "").match(/\d+/g);
      if (!parts || parts.length < 6) {
        return Date.now();
      }
      const [hour, minute, second, day, month, year] = parts.map(Number);
      return new Date(year, month - 1, day, hour, minute, second).getTime();
    },
  };

  const Guards = {
    isLootAssistantPage() {
      const url = new URL(window.location.href);
      const screen = window.game_data?.screen || url.searchParams.get("screen");
      return screen === "am_farm" && Boolean(Selectors.plunderTable());
    },

    hasNativeRequirements() {
      return Boolean(
        window.Accountmanager &&
          window.Accountmanager.farm &&
          typeof window.TribalWars?.post === "function" &&
          window.game_data?.village?.id
      );
    },

    hasBotProtection() {
      const selectors = [
        "#bot_check",
        "#popup_box_bot_protection",
        "[class*='bot-protection']",
        "[id*='bot_protection']",
        "#captcha_container",
        "iframe[src*='captcha']",
      ];
      return selectors.some((selector) => document.querySelector(selector));
    },

    isRuntimeSafe() {
      return (
        this.isLootAssistantPage() &&
        this.hasNativeRequirements() &&
        Boolean(Selectors.widget()) &&
        Boolean(Selectors.widgetBody())
      );
    },
  };

  const Store = {
    load() {
      try {
        const raw = localStorage.getItem(SETTINGS_KEY);
        if (!raw) {
          return { ...DEFAULT_SETTINGS };
        }
        return this.sanitize({ ...DEFAULT_SETTINGS, ...JSON.parse(raw) });
      } catch (error) {
        Logger.warn("Failed to load settings, using defaults", error);
        return { ...DEFAULT_SETTINGS };
      }
    },

    save(settings) {
      try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.sanitize(settings)));
      } catch (error) {
        Logger.warn("Failed to save settings", error);
      }
    },

    sanitize(settings) {
      return {
        enabled: Boolean(settings.enabled),
        maxDistance: Dom.toNumber(settings.maxDistance, DEFAULT_SETTINGS.maxDistance, 0),
        repeatIntervalMinutes: Dom.toNumber(
          settings.repeatIntervalMinutes,
          DEFAULT_SETTINGS.repeatIntervalMinutes,
          0
        ),
        aMaxWall: Dom.toNumber(settings.aMaxWall, DEFAULT_SETTINGS.aMaxWall, 0),
        cMaxWall: Dom.toNumber(settings.cMaxWall, DEFAULT_SETTINGS.cMaxWall, 0),
        cMinLight: Dom.toNumber(settings.cMinLight, DEFAULT_SETTINGS.cMinLight, 0),
        fullHaulUsesC: Boolean(settings.fullHaulUsesC),
        debug: Boolean(settings.debug),
      };
    },
  };

  // FarmGod-derived helpers adapted for a current-village-only script.
  const FarmGodTools = {
    unitSpeeds: null,
    unitSpeedPromise: null,
    unitSpeedSource: "unloaded",

    units() {
      const gameUnits = Array.isArray(window.game_data?.units) ? window.game_data.units : [];
      const currentUnitKeys = Object.keys(window.Accountmanager?.farm?.current_units || {});
      return Array.from(new Set([...gameUnits, ...currentUnitKeys]));
    },

    parseCoord(text) {
      const match = String(text || "").match(/(\d{1,3}\|\d{1,3})/);
      return match ? match[1] : "";
    },

    toCoordParts(coord) {
      const parsed = this.parseCoord(coord);
      if (!parsed) {
        return null;
      }
      const [x, y] = parsed.split("|").map(Number);
      return Number.isFinite(x) && Number.isFinite(y) ? { x, y } : null;
    },

    getDistance(originCoord, targetCoord) {
      const origin = this.toCoordParts(originCoord);
      const target = this.toCoordParts(targetCoord);
      if (!origin || !target) {
        return NaN;
      }
      return Math.hypot(origin.x - target.x, origin.y - target.y);
    },

    readCachedUnitSpeeds() {
      try {
        const raw = localStorage.getItem(SPEED_CACHE_KEY);
        if (!raw) {
          return null;
        }
        const parsed = JSON.parse(raw);
        if (
          !parsed ||
          typeof parsed !== "object" ||
          !parsed.speeds ||
          !parsed.savedAt ||
          Date.now() - Number(parsed.savedAt) > SPEED_CACHE_TTL_MS
        ) {
          return null;
        }
        return parsed.speeds;
      } catch (error) {
        return null;
      }
    },

    saveCachedUnitSpeeds(speeds) {
      try {
        localStorage.setItem(
          SPEED_CACHE_KEY,
          JSON.stringify({
            savedAt: Date.now(),
            speeds,
          })
        );
      } catch (error) {
        Logger.debug("Unable to cache unit speeds", error);
      }
    },

    async ensureUnitSpeeds(force = false) {
      if (!force && this.unitSpeeds) {
        return this.unitSpeeds;
      }

      if (!force) {
        const cached = this.readCachedUnitSpeeds();
        if (cached) {
          this.unitSpeeds = cached;
          this.unitSpeedSource = "cache";
          return this.unitSpeeds;
        }
      }

      if (this.unitSpeedPromise && !force) {
        return this.unitSpeedPromise;
      }

      this.unitSpeedPromise = window
        .fetch("/interface.php?func=get_unit_info", {
          credentials: "same-origin",
        })
        .then((response) => {
          if (!response.ok) {
            throw new Error(`Unit speed request failed (${response.status})`);
          }
          return response.text();
        })
        .then((xmlText) => {
          const xml = new DOMParser().parseFromString(xmlText, "text/xml");
          const speeds = {};
          Array.from(xml.querySelectorAll("config > *")).forEach((node) => {
            const unitName = node.nodeName;
            const speed = Number(node.querySelector("speed")?.textContent || "");
            if (unitName && Number.isFinite(speed)) {
              speeds[unitName] = speed;
            }
          });

          if (!Object.keys(speeds).length) {
            throw new Error("No unit speeds found in unit info response");
          }

          this.unitSpeeds = speeds;
          this.unitSpeedSource = "live";
          this.saveCachedUnitSpeeds(speeds);
          return speeds;
        })
        .catch((error) => {
          const cached = this.readCachedUnitSpeeds();
          if (cached) {
            this.unitSpeeds = cached;
            this.unitSpeedSource = "stale-cache";
            Logger.warn("Using stale cached unit speeds after fetch failure", error);
            return cached;
          }
          this.unitSpeeds = null;
          this.unitSpeedSource = "fallback";
          Logger.warn("Unit speed fetch failed; tooltip fallback may be used", error);
          return null;
        })
        .finally(() => {
          this.unitSpeedPromise = null;
        });

      return this.unitSpeedPromise;
    },

    getSlowestUnitSpeed(units) {
      if (!units || typeof units !== "object") {
        return NaN;
      }

      const speeds = this.unitSpeeds || this.readCachedUnitSpeeds();
      if (!speeds) {
        return NaN;
      }

      let slowest = 0;
      Object.entries(units).forEach(([unit, amount]) => {
        const numericAmount = Number(amount) || 0;
        if (numericAmount <= 0) {
          return;
        }
        const speed = Number(speeds[unit]);
        if (Number.isFinite(speed) && speed > slowest) {
          slowest = speed;
        }
      });

      return slowest > 0 ? slowest : NaN;
    },
  };

  const NativeState = {
    getSourceVillage() {
      return {
        id: Number(window.game_data?.village?.id),
        coord: String(window.game_data?.village?.coord || ""),
        name: String(window.game_data?.village?.display_name || ""),
      };
    },

    getCurrentUnits() {
      const raw = window.Accountmanager?.farm?.current_units || {};
      const normalized = {};
      FarmGodTools.units().forEach((unit) => {
        normalized[unit] = Number(raw[unit]) || 0;
      });
      return normalized;
    },

    getTemplateById(templateId) {
      if (!Number.isFinite(templateId)) {
        return null;
      }

      const raw = window.Accountmanager?.farm?.templates?.[`t_${templateId}`];
      if (!raw || typeof raw !== "object") {
        return null;
      }

      const units = {};
      FarmGodTools.units().forEach((unit) => {
        const amount = Number(raw[unit]) || 0;
        if (amount > 0) {
          units[unit] = amount;
        }
      });

      return {
        id: templateId,
        units,
      };
    },

    unitsAvailableForComposition(units) {
      if (!units || typeof units !== "object") {
        return false;
      }

      const currentUnits = this.getCurrentUnits();
      return Object.entries(units).every(([unit, amount]) => {
        const required = Number(amount) || 0;
        return required <= 0 || (currentUnits[unit] || 0) >= required;
      });
    },

    templateAppearsAvailable(templateId, templateUnits) {
      if (
        typeof window.Accountmanager?.farm?.unitsAppearAvailableAB === "function" &&
        Number.isFinite(templateId)
      ) {
        try {
          return Boolean(window.Accountmanager.farm.unitsAppearAvailableAB(templateId));
        } catch (error) {
          Logger.debug("Native A availability check failed, using local comparison", error);
        }
      }
      return this.unitsAvailableForComposition(templateUnits);
    },
  };

  const TableMap = {
    build(table) {
      const rows = Array.from(table?.rows || []);
      const headerRows = [];
      for (const row of rows) {
        if (row.id && row.id.startsWith("village_")) {
          break;
        }
        if (row.querySelector("th")) {
          headerRows.push(row);
        }
      }

      const grid = [];
      headerRows.forEach((row, rowIndex) => {
        let column = 0;
        Array.from(row.children).forEach((cell) => {
          while (grid[rowIndex]?.[column]) {
            column += 1;
          }

          const colspan = Number(cell.getAttribute("colspan") || 1);
          const rowspan = Number(cell.getAttribute("rowspan") || 1);
          for (let rowOffset = 0; rowOffset < rowspan; rowOffset += 1) {
            for (let columnOffset = 0; columnOffset < colspan; columnOffset += 1) {
              if (!grid[rowIndex + rowOffset]) {
                grid[rowIndex + rowOffset] = [];
              }
              grid[rowIndex + rowOffset][column + columnOffset] = cell;
            }
          }
          column += colspan;
        });
      });

      const lastRowIndex = Math.max(0, grid.length - 1);
      const width = grid[lastRowIndex]?.length || 0;
      const map = {};

      for (let column = 0; column < width; column += 1) {
        let cell = null;
        for (let rowIndex = lastRowIndex; rowIndex >= 0; rowIndex -= 1) {
          if (grid[rowIndex]?.[column]) {
            cell = grid[rowIndex][column];
            break;
          }
        }

        if (!cell) {
          continue;
        }

        const text = cell.textContent.replace(/\s+/g, " ").trim().toLowerCase();
        const title = String(
          cell.getAttribute("data-title") || cell.getAttribute("title") || ""
        )
          .replace(/\s+/g, " ")
          .trim()
          .toLowerCase();
        const imageSrc = cell.querySelector("img")?.getAttribute("src") || "";

        if (text === "village") {
          map.village = column;
        } else if (text === "time") {
          map.time = column;
        } else if (imageSrc.includes("/graphic/buildings/wall")) {
          map.wall = column;
        } else if (imageSrc.includes("/graphic/rechts")) {
          map.distance = column;
        } else if (title.includes("wall")) {
          map.wall = column;
        } else if (title.includes("distance")) {
          map.distance = column;
        }
      }

      return map;
    },
  };

  const RowParser = {
    parseAll() {
      const table = Selectors.plunderTable();
      if (!table) {
        return [];
      }

      const columnMap = TableMap.build(table);
      return Selectors.lootRows()
        .map((rowElement, index) => this.parseRow(rowElement, columnMap, index))
        .filter(Boolean);
    },

    parseRow(rowElement, columnMap, index) {
      const targetVillageId = Number(
        String(rowElement.id || "").replace(/^village_/, "")
      );
      const reportLink = rowElement.querySelector(
        "a[href*='screen=report'][href*='view=']"
      );
      const reportHref = reportLink?.getAttribute("href") || "";
      const reportId = Number(Dom.extractQueryParam(reportHref, "view"));
      const targetCoord = FarmGodTools.parseCoord(reportLink?.textContent || "");
      const reportColorImage = rowElement.querySelector("img[src*='/graphic/dots/']");
      const haulImage = rowElement.querySelector("img[src*='/graphic/max_loot/']");
      const aButton = rowElement.querySelector("a.farm_icon_a");
      const cButton = rowElement.querySelector("a.farm_icon_c");
      const timeCell = this.getCell(rowElement, columnMap.time, 4);
      const wallCell = this.getCell(
        rowElement,
        columnMap.wall,
        this.fallbackWallIndex(rowElement)
      );
      const distanceCell = this.getCell(
        rowElement,
        columnMap.distance,
        this.fallbackDistanceIndex(rowElement)
      );

      return {
        rowElement,
        rowIndex: index,
        hiddenNative: !Dom.isVisible(rowElement),
        targetVillageId,
        targetCoord,
        reportId: Number.isFinite(reportId) ? reportId : NaN,
        reportColor: this.parseReportColor(reportColorImage),
        haulState: this.parseHaulState(haulImage),
        reportTimeText: timeCell?.textContent?.replace(/\s+/g, " ").trim() || "",
        wall: Dom.extractFirstNumber(wallCell?.textContent || ""),
        distance: Dom.extractFirstNumber(distanceCell?.textContent || ""),
        aButton,
        cButton,
        aDisabled: !aButton || aButton.classList.contains("farm_icon_disabled"),
        cDisabled: !cButton || cButton.classList.contains("farm_icon_disabled"),
        aTemplateId: this.parseTemplateId(aButton),
        cForecast: this.parseForecast(cButton),
      };
    },

    getCell(rowElement, mappedIndex, fallbackIndex) {
      const cells = Array.from(rowElement.children).filter((cell) =>
        /^(TD|TH)$/.test(cell.tagName)
      );
      if (Number.isInteger(mappedIndex) && cells[mappedIndex]) {
        return cells[mappedIndex];
      }
      if (Number.isInteger(fallbackIndex) && cells[fallbackIndex]) {
        return cells[fallbackIndex];
      }
      return null;
    },

    fallbackDistanceIndex(rowElement) {
      const aCell = rowElement.querySelector("a.farm_icon_a")?.closest("td");
      if (!aCell) {
        return null;
      }
      const cells = Array.from(rowElement.children).filter((cell) =>
        /^(TD|TH)$/.test(cell.tagName)
      );
      const aIndex = cells.indexOf(aCell);
      return aIndex > 0 ? aIndex - 1 : null;
    },

    fallbackWallIndex(rowElement) {
      const distanceIndex = this.fallbackDistanceIndex(rowElement);
      return Number.isInteger(distanceIndex) && distanceIndex > 0
        ? distanceIndex - 1
        : null;
    },

    parseReportColor(image) {
      const src = image?.getAttribute("src") || "";
      const match = src.match(/\/dots\/([a-z_]+)\./i);
      return match ? match[1].toLowerCase() : "";
    },

    parseHaulState(image) {
      const src = image?.getAttribute("src") || "";
      const match = src.match(/\/max_loot\/(\d+)\./);
      if (!match) {
        return "";
      }
      if (match[1] === "1") {
        return "full";
      }
      if (match[1] === "0") {
        return "partial";
      }
      if (match[1] === "2") {
        return "empty";
      }
      return "";
    },

    parseTemplateId(button) {
      const handler = button?.getAttribute("onclick") || "";
      const match = handler.match(/sendUnits\(this,\s*\d+,\s*(\d+)\)/);
      return match ? Number(match[1]) : NaN;
    },

    parseForecast(button) {
      if (!(button instanceof Element)) {
        return null;
      }

      try {
        const raw = button.getAttribute("data-units-forecast");
        if (raw) {
          const parsed = JSON.parse(raw);
          return this.normalizeForecast(parsed);
        }
      } catch (error) {
        Logger.debug("Direct forecast parsing failed, trying decoded attribute", error);
      }

      try {
        const decoded = Dom.decodeHtml(button.getAttribute("data-units-forecast") || "");
        if (decoded) {
          return this.normalizeForecast(JSON.parse(decoded));
        }
      } catch (error) {
        Logger.debug("Decoded forecast parsing failed", error);
      }

      try {
        if (window.jQuery) {
          const value = window.jQuery(button).data("units-forecast");
          if (value && typeof value === "object") {
            return this.normalizeForecast(value);
          }
        }
      } catch (error) {
        Logger.debug("jQuery forecast lookup failed", error);
      }

      return null;
    },

    normalizeForecast(forecast) {
      if (!forecast || typeof forecast !== "object") {
        return null;
      }
      const normalized = {};
      FarmGodTools.units().forEach((unit) => {
        const amount = Number(forecast[unit]) || 0;
        if (amount > 0) {
          normalized[unit] = amount;
        }
      });
      return normalized;
    },
  };

  const TravelTime = {
    computeSeconds({ sourceCoord, targetCoord, units, fallbackButton }) {
      const distance = FarmGodTools.getDistance(sourceCoord, targetCoord);
      const slowestSpeed = FarmGodTools.getSlowestUnitSpeed(units);
      if (Number.isFinite(distance) && Number.isFinite(slowestSpeed)) {
        return Math.round(distance * slowestSpeed * 60);
      }

      // Tooltip duration is a fallback only when speed data or composition-based
      // calculation is unavailable. It is not the primary travel-time source.
      const tooltipSeconds = Dom.parseTooltipDurationSeconds(fallbackButton);
      return Number.isFinite(tooltipSeconds) ? tooltipSeconds : NaN;
    },
  };

  const CooldownTracker = {
    arrivalsByCoord: new Map(),
    sessionArrivalsByCoord: new Map(),
    lastLoadedAt: 0,
    loadPromise: null,
    statusText: "not loaded",

    invalidate() {
      this.lastLoadedAt = 0;
    },

    async ensureFresh(force = false) {
      if (!force && this.loadPromise) {
        return this.loadPromise;
      }

      if (
        !force &&
        this.lastLoadedAt > 0 &&
        Date.now() - this.lastLoadedAt < COMMAND_CACHE_TTL_MS
      ) {
        return this.arrivalsByCoord;
      }

      this.loadPromise = this.loadCurrentVillageCommands()
        .catch((error) => {
          this.statusText = "session-memory fallback";
          Logger.warn(
            "Current-village command fetch failed; session memory will be used",
            error
          );
          return this.arrivalsByCoord;
        })
        .finally(() => {
          this.loadPromise = null;
        });

      return this.loadPromise;
    },

    async loadCurrentVillageCommands() {
      const url = new URL("/game.php", window.location.origin);
      url.searchParams.set("village", String(window.game_data?.village?.id || ""));
      url.searchParams.set("screen", "place");

      Logger.debug("Loading current-village place page for cooldown truth", url.toString());

      const response = await window.fetch(url.toString(), {
        credentials: "same-origin",
      });
      if (!response.ok) {
        throw new Error(`Place page request failed (${response.status})`);
      }

      const html = await response.text();
      const doc = new DOMParser().parseFromString(html, "text/html");
      const container = doc.querySelector("#commands_outgoings");
      const map = new Map();

      if (container) {
        container.querySelectorAll("tr.command-row").forEach((row) => {
          const attackMarker = row.querySelector(
            ".command_hover_details[data-command-type='attack']"
          );
          if (!attackMarker) {
            return;
          }

          const coord = FarmGodTools.parseCoord(
            row.querySelector(".quickedit-label")?.textContent || ""
          );
          const endtime = Number(row.querySelector("[data-endtime]")?.getAttribute("data-endtime"));
          if (!coord || !Number.isFinite(endtime)) {
            return;
          }

          const list = map.get(coord) || [];
          list.push(endtime * 1000);
          map.set(coord, list);
        });
      }

      this.arrivalsByCoord = map;
      this.lastLoadedAt = Date.now();
      this.statusText = "current-village place snapshot";
      return this.arrivalsByCoord;
    },

    addSessionArrival(coord, arrivalAtMs) {
      if (!coord || !Number.isFinite(arrivalAtMs)) {
        return;
      }
      const list = this.sessionArrivalsByCoord.get(coord) || [];
      list.push(arrivalAtMs);
      this.sessionArrivalsByCoord.set(coord, list);
    },

    hasConflict(coord, candidateArrivalAtMs, repeatIntervalMinutes) {
      if (
        !coord ||
        !Number.isFinite(candidateArrivalAtMs) ||
        !Number.isFinite(repeatIntervalMinutes) ||
        repeatIntervalMinutes <= 0
      ) {
        return false;
      }

      const intervalMs = repeatIntervalMinutes * 60 * 1000;
      const cutoff = Time.nowServerMs() - intervalMs;
      const snapshotArrivals = (this.arrivalsByCoord.get(coord) || []).filter(
        (value) => value >= cutoff
      );
      const sessionArrivals = (this.sessionArrivalsByCoord.get(coord) || []).filter(
        (value) => value >= cutoff
      );

      this.arrivalsByCoord.set(coord, snapshotArrivals);
      this.sessionArrivalsByCoord.set(coord, sessionArrivals);

      return [...snapshotArrivals, ...sessionArrivals].some(
        (arrivalAtMs) => Math.abs(arrivalAtMs - candidateArrivalAtMs) < intervalMs
      );
    },
  };

  const CandidateBuilder = {
    build(settings) {
      const sourceVillage = NativeState.getSourceVillage();
      const rows = RowParser.parseAll();
      const nowMs = Time.nowServerMs();
      const candidates = [];
      const rejectionCounts = {};

      const reject = (candidate, reason) => {
        candidate.eligible = false;
        candidate.rejectionReason = reason;
        rejectionCounts[reason] = (rejectionCounts[reason] || 0) + 1;
        return candidate;
      };

      rows.forEach((row, index) => {
        const actionType =
          settings.fullHaulUsesC && row.haulState === "full" ? "C" : "A";

        const candidate = {
          id: `${actionType}_${row.targetVillageId}`,
          order: index + 1,
          sourceVillageId: sourceVillage.id,
          sourceCoord: sourceVillage.coord,
          targetVillageId: row.targetVillageId,
          targetCoord: row.targetCoord,
          reportId: Number.isFinite(row.reportId) ? row.reportId : null,
          actionType,
          haulState: row.haulState || "",
          wall: row.wall,
          distance: row.distance,
          reportColor: row.reportColor,
          aTemplateId: Number.isFinite(row.aTemplateId) ? row.aTemplateId : null,
          aTemplateUnits: null,
          cForecast: null,
          cForecastLight: 0,
          computedTravelSeconds: NaN,
          computedArrivalAt: NaN,
          eligible: false,
          rejectionReason: "",
          native: row,
        };

        if (row.hiddenNative) {
          candidates.push(reject(candidate, "native-hidden"));
          return;
        }

        if (!candidate.targetVillageId || !candidate.targetCoord) {
          candidates.push(reject(candidate, "missing-target"));
          return;
        }

        if (!Number.isFinite(candidate.distance)) {
          candidates.push(reject(candidate, "missing-distance"));
          return;
        }

        if (candidate.distance > settings.maxDistance) {
          candidates.push(reject(candidate, "distance-filter"));
          return;
        }

        if (!Number.isFinite(candidate.wall)) {
          candidates.push(reject(candidate, "missing-wall"));
          return;
        }

        if (actionType === "A") {
          const processed = this.buildACandidate(
            candidate,
            row,
            sourceVillage,
            settings,
            nowMs,
            reject
          );
          candidates.push(processed);
          return;
        }

        const processed = this.buildCCandidate(
          candidate,
          row,
          sourceVillage,
          settings,
          nowMs,
          reject
        );
        candidates.push(processed);
      });

      const visibleCandidates = candidates.filter((candidate) => candidate.eligible);

      return {
        generatedAt: nowMs,
        sourceVillage,
        rows,
        candidates,
        visibleCandidates,
        rejectionCounts,
      };
    },

    buildACandidate(candidate, row, sourceVillage, settings, nowMs, reject) {
      if (!row.aButton) {
        return reject(candidate, "a-button-missing");
      }
      if (row.aDisabled) {
        return reject(candidate, "a-button-disabled");
      }
      if (!Number.isFinite(row.aTemplateId)) {
        return reject(candidate, "a-template-id-missing");
      }

      const template = NativeState.getTemplateById(row.aTemplateId);
      if (!template) {
        return reject(candidate, "a-template-missing");
      }
      if (!Object.keys(template.units).length) {
        return reject(candidate, "a-template-empty");
      }

      candidate.aTemplateUnits = template.units;

      if (!NativeState.templateAppearsAvailable(row.aTemplateId, template.units)) {
        return reject(candidate, "a-units-unavailable");
      }

      if (candidate.wall > settings.aMaxWall) {
        return reject(candidate, "a-wall-filter");
      }

      candidate.computedTravelSeconds = TravelTime.computeSeconds({
        sourceCoord: sourceVillage.coord,
        targetCoord: candidate.targetCoord,
        units: template.units,
        fallbackButton: row.aButton,
      });

      if (
        settings.repeatIntervalMinutes > 0 &&
        !Number.isFinite(candidate.computedTravelSeconds)
      ) {
        return reject(candidate, "travel-time-missing");
      }

      if (Number.isFinite(candidate.computedTravelSeconds)) {
        candidate.computedArrivalAt = nowMs + candidate.computedTravelSeconds * 1000;
      }

      if (
        Number.isFinite(candidate.computedArrivalAt) &&
        CooldownTracker.hasConflict(
          candidate.targetCoord,
          candidate.computedArrivalAt,
          settings.repeatIntervalMinutes
        )
      ) {
        return reject(candidate, "cooldown");
      }

      candidate.eligible = true;
      return candidate;
    },

    buildCCandidate(candidate, row, sourceVillage, settings, nowMs, reject) {
      if (!row.cButton) {
        return reject(candidate, "c-button-missing");
      }
      if (row.cDisabled) {
        return reject(candidate, "c-button-disabled");
      }
      if (!Number.isFinite(row.reportId)) {
        return reject(candidate, "c-report-id-missing");
      }
      if (!row.cForecast || !Object.keys(row.cForecast).length) {
        return reject(candidate, "c-forecast-missing");
      }

      candidate.cForecast = row.cForecast;
      candidate.cForecastLight = Number(row.cForecast.light) || 0;

      if (candidate.cForecastLight < settings.cMinLight) {
        return reject(candidate, "c-light-filter");
      }

      if (!NativeState.unitsAvailableForComposition(row.cForecast)) {
        return reject(candidate, "c-units-unavailable");
      }

      if (candidate.wall > settings.cMaxWall) {
        return reject(candidate, "c-wall-filter");
      }

      candidate.computedTravelSeconds = TravelTime.computeSeconds({
        sourceCoord: sourceVillage.coord,
        targetCoord: candidate.targetCoord,
        units: row.cForecast,
        fallbackButton: row.cButton,
      });

      if (
        settings.repeatIntervalMinutes > 0 &&
        !Number.isFinite(candidate.computedTravelSeconds)
      ) {
        return reject(candidate, "travel-time-missing");
      }

      if (Number.isFinite(candidate.computedTravelSeconds)) {
        candidate.computedArrivalAt = nowMs + candidate.computedTravelSeconds * 1000;
      }

      if (
        Number.isFinite(candidate.computedArrivalAt) &&
        CooldownTracker.hasConflict(
          candidate.targetCoord,
          candidate.computedArrivalAt,
          settings.repeatIntervalMinutes
        )
      ) {
        return reject(candidate, "cooldown");
      }

      candidate.eligible = true;
      return candidate;
    },
  };

  const Panel = {
    root: null,
    statusEl: null,
    summaryEl: null,
    sourceEl: null,
    rejectionEl: null,
    tableEl: null,

    injectStyle() {
      const existing = document.getElementById(STYLE_ID);
      if (existing) {
        existing.remove();
      }

      const style = document.createElement("style");
      style.id = STYLE_ID;
      style.textContent = `
#${PANEL_ID} {
  margin: 10px 0;
  padding: 12px;
  border: 1px solid #6f5330;
  background: linear-gradient(180deg, #f4e5bf 0%, #e8d19b 100%);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.35);
}
#${PANEL_ID} .yla-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}
#${PANEL_ID} .yla-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
  gap: 8px 12px;
}
#${PANEL_ID} .yla-field {
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 28px;
}
#${PANEL_ID} .yla-field label {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
}
#${PANEL_ID} .yla-field input[type="number"] {
  width: 78px;
}
#${PANEL_ID} .yla-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 10px;
}
#${PANEL_ID} .yla-meta {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 4px 12px;
  margin-top: 10px;
  font-size: 12px;
}
#${PANEL_ID} .yla-status {
  font-weight: 700;
}
#${PANEL_ID} .yla-table-wrap {
  margin-top: 10px;
  max-height: 430px;
  overflow: auto;
}
#${PANEL_ID} table {
  width: 100%;
  border-collapse: collapse;
}
#${PANEL_ID} th,
#${PANEL_ID} td {
  padding: 4px 6px;
  text-align: left;
}
#${PANEL_ID} .yla-tag {
  display: inline-block;
  min-width: 24px;
  text-align: center;
  padding: 1px 6px;
  border-radius: 10px;
  font-weight: 700;
}
#${PANEL_ID} .yla-tag-a {
  background: #c8dca6;
}
#${PANEL_ID} .yla-tag-c {
  background: #b6d5ea;
}
#${PANEL_ID} .yla-subtle {
  color: #614924;
}
      `;
      document.head.appendChild(style);
    },

    ensureRoot() {
      const widget = Selectors.widget();
      const body = Selectors.widgetBody();
      if (!widget || !body) {
        throw new Error("Loot Assistant widget not found");
      }

      if (this.root) {
        return this.root;
      }

      const panel = document.createElement("div");
      panel.id = PANEL_ID;
      panel.className = "vis";
      panel.innerHTML = `
        <div class="yla-head">
          <div>
            <strong>${SCRIPT_NAME} v${SCRIPT_VERSION}</strong>
            <div class="yla-subtle">FarmGod-first current-village candidate runner</div>
          </div>
          <div class="yla-subtle">Hold Enter to send the filtered candidate queue</div>
        </div>
        <div class="yla-grid">
          <div class="yla-field"><label><input type="checkbox" data-setting="enabled"> Enabled</label></div>
          <div class="yla-field"><label>Max distance <input type="number" min="0" step="0.1" data-setting="maxDistance"></label></div>
          <div class="yla-field"><label>Repeat min <input type="number" min="0" step="1" data-setting="repeatIntervalMinutes"></label></div>
          <div class="yla-field"><label>A max wall <input type="number" min="0" step="1" data-setting="aMaxWall"></label></div>
          <div class="yla-field"><label>C max wall <input type="number" min="0" step="1" data-setting="cMaxWall"></label></div>
          <div class="yla-field"><label>C min light <input type="number" min="0" step="1" data-setting="cMinLight"></label></div>
          <div class="yla-field"><label><input type="checkbox" data-setting="fullHaulUsesC"> Full haul uses C</label></div>
          <div class="yla-field"><label><input type="checkbox" data-setting="debug"> Debug</label></div>
        </div>
        <div class="yla-actions">
          <button type="button" class="btn" data-action="refresh">Refresh candidates</button>
          <button type="button" class="btn" data-action="reload-cooldown">Reload cooldown source</button>
          <button type="button" class="btn btn-confirm-yes" data-action="stop">Stop</button>
        </div>
        <div class="yla-meta">
          <div class="yla-status" data-role="status">Status: starting...</div>
          <div data-role="summary">Summary: -</div>
          <div data-role="source">Sources: -</div>
          <div data-role="rejections">Rejected: -</div>
        </div>
        <div class="yla-table-wrap" data-role="table"></div>
      `;

      widget.insertBefore(panel, body);
      this.root = panel;
      this.statusEl = panel.querySelector('[data-role="status"]');
      this.summaryEl = panel.querySelector('[data-role="summary"]');
      this.sourceEl = panel.querySelector('[data-role="source"]');
      this.rejectionEl = panel.querySelector('[data-role="rejections"]');
      this.tableEl = panel.querySelector('[data-role="table"]');

      this.syncSettingsInputs();
      this.bindEvents();
      return this.root;
    },

    syncSettingsInputs() {
      if (!this.root) {
        return;
      }
      Object.entries(App.settings).forEach(([key, value]) => {
        const input = this.root.querySelector(`[data-setting="${key}"]`);
        if (!input) {
          return;
        }
        if (input.type === "checkbox") {
          input.checked = Boolean(value);
        } else {
          input.value = value;
        }
      });
    },

    bindEvents() {
      if (!this.root || this.root.dataset.bound === "1") {
        return;
      }
      this.root.dataset.bound = "1";

      this.root.addEventListener("input", (event) => {
        const target = event.target;
        if (!(target instanceof HTMLInputElement)) {
          return;
        }

        const key = target.dataset.setting;
        if (!key) {
          return;
        }

        App.settings[key] =
          target.type === "checkbox"
            ? target.checked
            : Dom.toNumber(target.value, App.settings[key], 0);
        App.settings = Store.sanitize(App.settings);
        Store.save(App.settings);
        App.requestSync("settings changed", false);
      });

      this.root.addEventListener("click", (event) => {
        const button = event.target.closest("[data-action]");
        if (!button) {
          return;
        }

        const action = button.dataset.action;
        if (action === "refresh") {
          App.requestSync("manual refresh", false);
        } else if (action === "reload-cooldown") {
          App.requestSync("manual cooldown reload", true);
        } else if (action === "stop") {
          App.stopLoop("Stopped from panel");
        }
      });
    },

    setStatus(text) {
      if (this.statusEl) {
        this.statusEl.textContent = `Status: ${text}`;
      }
    },

    render(model) {
      if (!this.root) {
        return;
      }

      const summary = `${model.visibleCandidates.length}/${model.candidates.length} visible candidates from ${model.rows.length} native rows`;
      const speedSource = FarmGodTools.unitSpeedSource;
      const cooldownSource = CooldownTracker.statusText;
      const rejectedSummary = this.buildRejectedSummary(model.rejectionCounts);

      this.summaryEl.textContent = `Summary: ${summary}`;
      this.sourceEl.textContent = `Sources: unit speeds = ${speedSource}, cooldown = ${cooldownSource}`;
      this.rejectionEl.textContent = `Rejected: ${rejectedSummary}`;
      this.tableEl.innerHTML = this.renderTable(model.visibleCandidates);
    },

    buildRejectedSummary(rejectionCounts) {
      const entries = Object.entries(rejectionCounts);
      if (!entries.length) {
        return "none";
      }

      const sorted = entries.sort((a, b) => b[1] - a[1]);
      const compact = sorted
        .slice(0, App.settings.debug ? sorted.length : 4)
        .map(([reason, count]) => `${REASON_LABELS[reason] || reason}: ${count}`)
        .join(" | ");

      return compact;
    },

    renderTable(candidates) {
      if (!candidates.length) {
        return `<div class="yla-subtle">No eligible candidates on the current filtered queue.</div>`;
      }

      const rows = candidates
        .map((candidate, index) => {
          const actionClass = candidate.actionType === "C" ? "yla-tag-c" : "yla-tag-a";
          const haulText = candidate.haulState || "-";
          return `
            <tr class="${index % 2 === 0 ? "row_a" : "row_b"}">
              <td>${index + 1}</td>
              <td>${Dom.escapeHtml(candidate.targetCoord)}</td>
              <td><span class="yla-tag ${actionClass}">${candidate.actionType}</span></td>
              <td>${Dom.escapeHtml(haulText)}</td>
              <td>${Number.isFinite(candidate.wall) ? candidate.wall : "--"}</td>
              <td>${Number.isFinite(candidate.distance) ? candidate.distance.toFixed(2) : "--"}</td>
              <td>${Dom.formatDuration(candidate.computedTravelSeconds)}</td>
              <td>${Dom.formatTime(candidate.computedArrivalAt)}</td>
              <td>Ready</td>
            </tr>
          `;
        })
        .join("");

      return `
        <table class="vis">
          <thead>
            <tr>
              <th>#</th>
              <th>Target</th>
              <th>Action</th>
              <th>Haul</th>
              <th>Wall</th>
              <th>Dist</th>
              <th>Travel</th>
              <th>Arrival</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      `;
    },

    destroy() {
      if (this.root) {
        this.root.remove();
      }
      this.root = null;
      this.statusEl = null;
      this.summaryEl = null;
      this.sourceEl = null;
      this.rejectionEl = null;
      this.tableEl = null;
    },
  };

  const SendAdapter = {
    send(candidate) {
      if (!candidate || !candidate.eligible) {
        return Promise.reject(new Error("Candidate is not sendable"));
      }
      if (candidate.actionType === "A") {
        return this.sendA(candidate);
      }
      if (candidate.actionType === "C") {
        return this.sendC(candidate);
      }
      return Promise.reject(new Error(`Unsupported action type: ${candidate.actionType}`));
    },

    sendA(candidate) {
      this.lockNativeButton(candidate.native.aButton);
      return this.post(window.Accountmanager.send_units_link, {
        target: candidate.targetVillageId,
        template_id: candidate.aTemplateId,
        source: candidate.sourceVillageId,
      }).then((response) => {
        if (response?.error) {
          throw new Error(response.error);
        }
        this.applySuccess(candidate, response, true);
        return response;
      });
    },

    sendC(candidate) {
      this.lockNativeButton(candidate.native.cButton);
      return this.post(window.Accountmanager.send_units_link_from_report, {
        report_id: candidate.reportId,
      }).then((response) => {
        if (response?.error) {
          throw new Error(response.error);
        }
        this.applySuccess(candidate, response, false);
        return response;
      });
    },

    post(url, data) {
      return new Promise((resolve, reject) => {
        try {
          window.TribalWars.post(
            url,
            null,
            data,
            (response) => resolve(response),
            () => reject(new Error("Server request failed"))
          );
        } catch (error) {
          reject(error);
        }
      });
    },

    lockNativeButton(button) {
      if (!(button instanceof Element)) {
        return;
      }
      try {
        if (window.jQuery && typeof window.Accountmanager?.farm?.clickhappyLock === "function") {
          window.Accountmanager.farm.clickhappyLock(window.jQuery(button));
        }
      } catch (error) {
        Logger.debug("Native click lock failed", error);
      }
    },

    applySuccess(candidate, response, addDoneClass) {
      if (typeof response?.success === "string" && window.UI?.SuccessMessage) {
        window.UI.SuccessMessage(response.success, 4000);
      }

      const selector = `.farm_village_${candidate.targetVillageId}`;
      document.querySelectorAll(selector).forEach((button) => {
        button.classList.add("farm_icon_disabled");
        if (addDoneClass) {
          button.classList.add("done");
        }
      });

      if (response?.current_units) {
        window.Accountmanager?.farm?.updateOwnUnitsAvailable?.(response.current_units);
      }

      if (window.Accountmanager?.farm?.hide_attacked) {
        window.Accountmanager.farm.updateNonAttacked(candidate.targetVillageId);
      }
    },
  };

  const App = {
    __destroyed: false,
    settings: null,
    observer: null,
    refreshTimer: null,
    syncPromise: null,
    state: {
      holdRequested: false,
      loopRunning: false,
      consecutiveErrors: 0,
      model: {
        generatedAt: 0,
        rows: [],
        candidates: [],
        visibleCandidates: [],
        rejectionCounts: {},
      },
    },

    init() {
      this.settings = Store.load();

      if (!Guards.isLootAssistantPage()) {
        Logger.warn("Not on am_farm page, v2 did not start");
        this.__destroyed = true;
        return;
      }

      if (!Guards.hasNativeRequirements()) {
        Logger.error("Missing native Tribal Wars requirements, v2 aborted safely");
        this.__destroyed = true;
        return;
      }

      try {
        Panel.injectStyle();
        Panel.ensureRoot();
        this.bindKeyboard();
        this.bindPageGuards();
        this.bindMutationObserver();
        this.bindNativeHooks();
        this.requestSync("initial load", true);
        Logger.info(`Initialized ${SCRIPT_NAME} v${SCRIPT_VERSION}`);
      } catch (error) {
        Logger.error("Initialization failed", error);
        this.__destroyed = true;
      }
    },

    destroy() {
      this.__destroyed = true;
      this.state.holdRequested = false;
      document.removeEventListener("keydown", this.onKeyDown, true);
      document.removeEventListener("keyup", this.onKeyUp, true);
      document.removeEventListener("visibilitychange", this.onVisibilityChange, true);
      window.removeEventListener("beforeunload", this.onBeforeUnload, true);

      if (this.observer) {
        this.observer.disconnect();
        this.observer = null;
      }

      if (this.refreshTimer) {
        clearTimeout(this.refreshTimer);
        this.refreshTimer = null;
      }

      Panel.destroy();
      const style = document.getElementById(STYLE_ID);
      if (style) {
        style.remove();
      }
    },

    bindKeyboard() {
      this.onKeyDown = (event) => {
        if (event.key !== "Enter") {
          return;
        }

        if (!this.settings.enabled) {
          return;
        }

        if (
          event.target instanceof Element &&
          event.target.closest(`#${PANEL_ID}`)
        ) {
          return;
        }

        if (Dom.isTypingTarget(event.target)) {
          return;
        }

        if (!Guards.isRuntimeSafe()) {
          this.stopLoop("Stopped because required page roots are missing");
          return;
        }

        if (Guards.hasBotProtection()) {
          this.stopLoop("Stopped for bot protection");
          return;
        }

        event.preventDefault();
        event.stopPropagation();
        this.state.holdRequested = true;
        Panel.setStatus("Hold active");

        if (!this.state.loopRunning) {
          this.runHoldLoop().catch((error) => {
            Logger.error("Hold loop crashed", error);
            this.stopLoop("Stopped after fatal loop error");
          });
        }
      };

      this.onKeyUp = (event) => {
        if (event.key !== "Enter") {
          return;
        }
        this.state.holdRequested = false;
        if (this.state.loopRunning) {
          Panel.setStatus("Stopping after current request");
        } else {
          Panel.setStatus("Idle");
        }
      };

      document.addEventListener("keydown", this.onKeyDown, true);
      document.addEventListener("keyup", this.onKeyUp, true);
    },

    bindPageGuards() {
      this.onVisibilityChange = () => {
        if (document.visibilityState !== "visible") {
          this.stopLoop("Stopped because page became hidden");
        }
      };
      this.onBeforeUnload = () => {
        this.state.holdRequested = false;
      };

      document.addEventListener("visibilitychange", this.onVisibilityChange, true);
      window.addEventListener("beforeunload", this.onBeforeUnload, true);
    },

    bindMutationObserver() {
      const body = Selectors.widgetBody();
      if (!body) {
        return;
      }

      this.observer = new MutationObserver(() => {
        this.scheduleRefresh();
      });

      this.observer.observe(body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["class", "style", "data-title", "title", "data-units-forecast"],
      });
    },

    bindNativeHooks() {
      if (window.CommandPopup?.hookCommandSent) {
        try {
          window.CommandPopup.hookCommandSent((payload) => {
            if (
              payload?.type === "attack" &&
              Number(payload?.source_village?.id) === Number(window.game_data?.village?.id)
            ) {
              CooldownTracker.invalidate();
              this.scheduleRefresh();
            }
          });
        } catch (error) {
          Logger.debug("CommandPopup hook registration failed", error);
        }
      }
    },

    scheduleRefresh(forceCommands = false) {
      if (this.refreshTimer) {
        clearTimeout(this.refreshTimer);
      }
      this.refreshTimer = window.setTimeout(() => {
        this.refreshTimer = null;
        this.requestSync("mutation refresh", forceCommands);
      }, MUTATION_DEBOUNCE_MS);
    },

    requestSync(reason, forceCommands) {
      this.sync(reason, forceCommands).catch((error) => {
        Logger.error("Sync failed", error);
        Panel.setStatus("Sync failed");
      });
    },

    async sync(reason, forceCommands = false) {
      if (this.syncPromise) {
        return this.syncPromise;
      }

      this.syncPromise = (async () => {
        if (this.__destroyed || !Guards.isRuntimeSafe()) {
          return;
        }

        Logger.debug("Sync start", reason);
        Panel.setStatus(`Syncing (${reason})`);
        await Promise.allSettled([
          FarmGodTools.ensureUnitSpeeds(false),
          CooldownTracker.ensureFresh(forceCommands),
        ]);

        this.state.model = CandidateBuilder.build(this.settings);
        Panel.render(this.state.model);

        if (!this.state.loopRunning) {
          Panel.setStatus(this.settings.enabled ? "Ready" : "Disabled");
        }
      })().finally(() => {
        this.syncPromise = null;
      });

      return this.syncPromise;
    },

    stopLoop(reason) {
      this.state.holdRequested = false;
      Panel.setStatus(reason);
      Logger.info(reason);
    },

    async runHoldLoop() {
      this.state.loopRunning = true;
      this.state.consecutiveErrors = 0;

      try {
        while (this.state.holdRequested && !this.__destroyed) {
          if (!this.settings.enabled) {
            this.stopLoop("Stopped because script is disabled");
            break;
          }

          if (!Guards.isRuntimeSafe()) {
            this.stopLoop("Stopped because page roots changed");
            break;
          }

          if (Guards.hasBotProtection()) {
            this.stopLoop("Stopped for bot protection");
            break;
          }

          if (this.state.consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
            this.stopLoop("Stopped after repeated server errors");
            break;
          }

          await this.sync("hold loop", false);

          const candidate = this.state.model.visibleCandidates[0];
          if (!candidate) {
            Panel.setStatus("Holding: no eligible candidates");
            await Dom.waitInterruptible(IDLE_WAIT_MS);
            continue;
          }

          const startedAt = performance.now();
          Panel.setStatus(
            `Sending ${candidate.actionType} to ${candidate.targetCoord}`
          );

          try {
            await SendAdapter.send(candidate);
            if (Number.isFinite(candidate.computedArrivalAt)) {
              CooldownTracker.addSessionArrival(
                candidate.targetCoord,
                candidate.computedArrivalAt
              );
            }
            this.state.consecutiveErrors = 0;
            Panel.setStatus(
              `Sent ${candidate.actionType} to ${candidate.targetCoord}`
            );
            this.scheduleRefresh(false);
          } catch (error) {
            this.state.consecutiveErrors += 1;
            Logger.error("Send failed", error);
            Dom.showError(error);
            Panel.setStatus(
              `Send failed (${this.state.consecutiveErrors}/${MAX_CONSECUTIVE_ERRORS})`
            );
            await Dom.waitInterruptible(ERROR_WAIT_MS);
            continue;
          }

          const elapsed = performance.now() - startedAt;
          const waitMs = Math.max(0, LOOP_PACING_MS - elapsed);
          await Dom.waitInterruptible(waitMs);
        }
      } finally {
        this.state.loopRunning = false;
        if (!this.__destroyed && !this.state.holdRequested) {
          Panel.setStatus("Idle");
        }
      }
    },
  };

  window[INSTANCE_KEY] = App;
  App.init();
})();
