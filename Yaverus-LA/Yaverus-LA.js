(() => {
  "use strict";

  const SCRIPT_NAME = "Yaverus-LA";
  const SCRIPT_VERSION = "1.0.0";
  const STORAGE_KEY = "YaverusLA.settings.v1";
  const PANEL_ID = "yaverus-la-panel";
  const STYLE_ID = "yaverus-la-style";
  const MAX_CONSECUTIVE_ERRORS = 3;
  const SAFE_PACING_MS = 450;
  const IDLE_WAIT_MS = 220;
  const ERROR_WAIT_MS = 900;
  const MUTATION_DEBOUNCE_MS = 120;

  if (
    window.YaverusLA &&
    typeof window.YaverusLA.destroy === "function" &&
    !window.YaverusLA.__destroyed
  ) {
    window.YaverusLA.destroy();
  }

  const Defaults = {
    enabled: true,
    maxDistance: 15,
    repeatIntervalMinutes: 10,
    aMaxWall: 0,
    cMaxWall: 0,
    cMinLight: 15,
    fullHaulUsesC: true,
    minReportAgeEnabled: false,
    minReportAgeMinutes: 30,
    debug: false,
  };

  const App = {
    __destroyed: false,
    settings: null,
    observer: null,
    refreshTimer: null,
    holdRequested: false,
    loopRunning: false,
    consecutiveErrors: 0,
    lastRows: [],
    panel: {
      root: null,
      status: null,
      counts: null,
      cooldown: null,
    },
    cooldown: null,

    init() {
      this.settings = Store.load();
      this.cooldown = CooldownTracker.create(this);

      if (!Guards.isLootAssistantPage()) {
        console.warn(`[${SCRIPT_NAME}] Not on am_farm page, script idle.`);
        this.__destroyed = true;
        return;
      }

      if (!Guards.hasNativeRequirements()) {
        console.error(
          `[${SCRIPT_NAME}] Missing native Loot Assistant objects. Aborting safely.`
        );
        this.__destroyed = true;
        return;
      }

      try {
        this.injectStyle();
        this.renderPanel();
        this.bindPanelEvents();
        this.bindKeyboard();
        this.bindVisibilityGuards();
        this.bindMutationObserver();
        this.applyFilters();
        this.cooldown.ensureLoaded(false);
        this.updateStatus("Ready");
        Logger.info(`Initialized ${SCRIPT_NAME} ${SCRIPT_VERSION}`);
      } catch (error) {
        Logger.error("Initialization failed", error);
        this.__destroyed = true;
      }
    },

    destroy() {
      this.__destroyed = true;
      this.holdRequested = false;

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

      FilterEngine.clearOwnHiddenRows();

      const style = document.getElementById(STYLE_ID);
      if (style) {
        style.remove();
      }

      if (this.panel.root) {
        this.panel.root.remove();
      }

      Logger.info("Destroyed previous instance");
    },

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
  padding: 10px 12px;
  border: 1px solid #7d5f32;
  background: linear-gradient(180deg, #f6ecd0 0%, #ead9af 100%);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.35);
}
#${PANEL_ID} .yla-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 8px;
  font-weight: 700;
}
#${PANEL_ID} .yla-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(155px, 1fr));
  gap: 8px 10px;
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
  width: 74px;
}
#${PANEL_ID} .yla-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 8px;
}
#${PANEL_ID} .yla-meta {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 6px 10px;
  margin-top: 8px;
  font-size: 12px;
}
#${PANEL_ID} .yla-status {
  font-weight: 700;
}
#${PANEL_ID} .yla-subtle {
  color: #5f4a27;
}
tr[data-yla-filtered="1"] {
  display: none !important;
}
      `;
      document.head.appendChild(style);
    },

    renderPanel() {
      const widget = Selectors.widget();
      const body = Selectors.widgetBody();
      if (!widget || !body) {
        throw new Error("Loot Assistant widget root not found.");
      }

      const existing = document.getElementById(PANEL_ID);
      if (existing) {
        existing.remove();
      }

      const panel = document.createElement("div");
      panel.id = PANEL_ID;
      panel.className = "vis";
      panel.innerHTML = `
        <div class="yla-title">
          <span>${SCRIPT_NAME} ${SCRIPT_VERSION}</span>
          <span class="yla-subtle">Current village Loot Assistant helper</span>
        </div>
        <div class="yla-grid">
          <div class="yla-field">
            <label><input type="checkbox" data-setting="enabled"> Enabled</label>
          </div>
          <div class="yla-field">
            <label>Max distance <input type="number" min="0" step="0.1" data-setting="maxDistance"></label>
          </div>
          <div class="yla-field">
            <label>Repeat min <input type="number" min="0" step="1" data-setting="repeatIntervalMinutes"></label>
          </div>
          <div class="yla-field">
            <label>A max wall <input type="number" min="0" step="1" data-setting="aMaxWall"></label>
          </div>
          <div class="yla-field">
            <label>C max wall <input type="number" min="0" step="1" data-setting="cMaxWall"></label>
          </div>
          <div class="yla-field">
            <label>C min light <input type="number" min="0" step="1" data-setting="cMinLight"></label>
          </div>
          <div class="yla-field">
            <label><input type="checkbox" data-setting="fullHaulUsesC"> Full haul uses C</label>
          </div>
          <div class="yla-field">
            <label><input type="checkbox" data-setting="minReportAgeEnabled"> Min report age</label>
          </div>
          <div class="yla-field">
            <label>Age minutes <input type="number" min="0" step="1" data-setting="minReportAgeMinutes"></label>
          </div>
          <div class="yla-field">
            <label><input type="checkbox" data-setting="debug"> Debug</label>
          </div>
        </div>
        <div class="yla-actions">
          <button type="button" class="btn" data-action="apply">Refresh filters</button>
          <button type="button" class="btn" data-action="reload-cooldown">Reload cooldown</button>
          <button type="button" class="btn btn-confirm-yes" data-action="stop">Stop</button>
        </div>
        <div class="yla-meta">
          <div class="yla-status" data-role="status">Status: starting...</div>
          <div data-role="counts">Rows: -</div>
          <div data-role="cooldown">Cooldown: loading...</div>
        </div>
      `;

      widget.insertBefore(panel, body);
      this.panel.root = panel;
      this.panel.status = panel.querySelector('[data-role="status"]');
      this.panel.counts = panel.querySelector('[data-role="counts"]');
      this.panel.cooldown = panel.querySelector('[data-role="cooldown"]');
      this.syncPanelFromSettings();
    },

    syncPanelFromSettings() {
      if (!this.panel.root) {
        return;
      }

      Object.entries(this.settings).forEach(([key, value]) => {
        const input = this.panel.root.querySelector(`[data-setting="${key}"]`);
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

    bindPanelEvents() {
      this.panel.root.addEventListener("input", (event) => {
        const target = event.target;
        if (!(target instanceof HTMLInputElement)) {
          return;
        }

        const key = target.dataset.setting;
        if (!key) {
          return;
        }

        this.settings[key] =
          target.type === "checkbox"
            ? target.checked
            : Store.normalizeValue(key, target.value);
        this.settings = Store.sanitize(this.settings);
        Store.save(this.settings);
        this.applyFilters();
      });

      this.panel.root.addEventListener("click", (event) => {
        const button = event.target.closest("[data-action]");
        if (!button) {
          return;
        }

        const action = button.dataset.action;
        if (action === "apply") {
          this.applyFilters();
        } else if (action === "reload-cooldown") {
          this.cooldown.ensureLoaded(true);
        } else if (action === "stop") {
          this.stopLoop("Stopped from panel");
        }
      });
    },

    bindKeyboard() {
      this.onKeyDown = this.handleKeyDown.bind(this);
      this.onKeyUp = this.handleKeyUp.bind(this);
      document.addEventListener("keydown", this.onKeyDown, true);
      document.addEventListener("keyup", this.onKeyUp, true);
    },

    bindVisibilityGuards() {
      this.onVisibilityChange = () => {
        if (document.visibilityState !== "visible") {
          this.stopLoop("Stopped because page became hidden");
        }
      };

      this.onBeforeUnload = () => {
        this.holdRequested = false;
      };

      document.addEventListener(
        "visibilitychange",
        this.onVisibilityChange,
        true
      );
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
        attributeFilter: ["class", "style", "title", "data-title", "data-units-forecast"],
      });
    },

    scheduleRefresh() {
      if (this.refreshTimer) {
        clearTimeout(this.refreshTimer);
      }

      this.refreshTimer = window.setTimeout(() => {
        this.refreshTimer = null;
        if (!this.__destroyed) {
          this.applyFilters();
        }
      }, MUTATION_DEBOUNCE_MS);
    },

    handleKeyDown(event) {
      if (event.key !== "Enter") {
        return;
      }

      if (!this.settings.enabled) {
        return;
      }

      if (
        this.panel.root &&
        event.target instanceof Element &&
        event.target.closest(`#${PANEL_ID}`)
      ) {
        return;
      }

      if (Dom.isTypingTarget(event.target)) {
        return;
      }

      if (!Guards.isRuntimeSafe()) {
        this.stopLoop("Blocked by page guard");
        return;
      }

      if (Guards.hasBotProtection()) {
        this.stopLoop("Bot protection detected");
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      this.holdRequested = true;
      this.updateStatus("Hold active");

      if (!this.loopRunning) {
        this.runHoldLoop().catch((error) => {
          Logger.error("Hold loop crashed", error);
          this.stopLoop("Stopped after fatal loop error");
        });
      }
    },

    handleKeyUp(event) {
      if (event.key !== "Enter") {
        return;
      }

      this.holdRequested = false;
      if (this.loopRunning) {
        this.updateStatus("Stopping after current request");
      } else {
        this.updateStatus("Idle");
      }
    },

    stopLoop(reason) {
      this.holdRequested = false;
      this.updateStatus(reason);
      Logger.info(reason);
    },

    updateStatus(message) {
      if (this.panel.status) {
        this.panel.status.textContent = `Status: ${message}`;
      }
    },

    updateCounts(rows) {
      if (!this.panel.counts) {
        return;
      }

      const total = rows.length;
      const visible = rows.filter((row) => !row.filteredOut && !row.externallyHidden).length;
      const full = rows.filter((row) => row.haulState === "full").length;
      this.panel.counts.textContent = `Rows: ${visible}/${total} visible, ${full} full haul`;
    },

    updateCooldownStatus(text) {
      if (this.panel.cooldown) {
        this.panel.cooldown.textContent = `Cooldown: ${text}`;
      }
    },

    applyFilters() {
      if (!Guards.isLootAssistantPage()) {
        this.stopLoop("Stopped because page changed");
        return [];
      }

      const rows = RowParser.parseRows();
      this.lastRows = rows;

      if (!this.settings.enabled) {
        FilterEngine.clearOwnHiddenRows();
        rows.forEach((row) => {
          row.filteredOut = false;
        });
        this.updateCounts(rows);
        this.updateStatus(this.loopRunning ? "Hold active" : "Disabled");
        return rows;
      }

      rows.forEach((row) => {
        const result = FilterEngine.evaluate(row, this.settings);
        row.filteredOut = !result.pass;
        row.filterReason = result.reason;
        FilterEngine.applyVisibility(row, result.pass);
      });

      this.updateCounts(rows);
      this.updateCooldownStatus(this.cooldown.describe());
      if (!this.loopRunning) {
        this.updateStatus("Ready");
      }
      return rows;
    },

    async runHoldLoop() {
      this.loopRunning = true;
      this.consecutiveErrors = 0;

      try {
        while (this.holdRequested && !this.__destroyed) {
          if (!this.settings.enabled) {
            this.stopLoop("Stopped because script is disabled");
            break;
          }

          if (!Guards.isRuntimeSafe()) {
            this.stopLoop("Stopped because required page elements are missing");
            break;
          }

          if (Guards.hasBotProtection()) {
            this.stopLoop("Stopped for bot protection");
            break;
          }

          if (this.consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
            this.stopLoop("Stopped after repeated server errors");
            break;
          }

          if (this.settings.repeatIntervalMinutes > 0) {
            await this.cooldown.ensureLoaded(false);
          }

          const rows = this.applyFilters();
          const action = DecisionEngine.choose(rows, this.settings, this.cooldown);

          if (!action) {
            this.updateStatus("Holding: no eligible visible row");
            await Dom.waitInterruptible(this, IDLE_WAIT_MS);
            continue;
          }

          const startedAt = performance.now();
          this.updateStatus(
            `Sending ${action.type} to ${action.row.coord} (${action.row.targetVillageId})`
          );

          try {
            await SendAdapter.send(action);
            if (Number.isFinite(action.arrivalAt)) {
              this.cooldown.addSessionArrival(action.row.coord, action.arrivalAt);
            }
            this.consecutiveErrors = 0;
            this.updateStatus(`Sent ${action.type} to ${action.row.coord}`);
            this.applyFilters();
          } catch (error) {
            this.consecutiveErrors += 1;
            Logger.error("Send failed", error);
            this.updateStatus(`Send failed (${this.consecutiveErrors}/${MAX_CONSECUTIVE_ERRORS})`);
            Dom.showError(error);
            await Dom.waitInterruptible(this, ERROR_WAIT_MS);
            continue;
          }

          const elapsed = performance.now() - startedAt;
          const remaining = Math.max(0, SAFE_PACING_MS - elapsed);
          await Dom.waitInterruptible(this, remaining);
        }
      } finally {
        this.loopRunning = false;
        if (!this.holdRequested && !this.__destroyed) {
          this.updateStatus("Idle");
        }
      }
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
    rows() {
      return Array.from(
        document.querySelectorAll("#plunder_list tr[id^='village_']")
      );
    },
  };

  const Store = {
    load() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) {
          return { ...Defaults };
        }
        return this.sanitize({ ...Defaults, ...JSON.parse(raw) });
      } catch (error) {
        console.warn(`[${SCRIPT_NAME}] Failed to load settings`, error);
        return { ...Defaults };
      }
    },

    save(settings) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.sanitize(settings)));
      } catch (error) {
        console.warn(`[${SCRIPT_NAME}] Failed to save settings`, error);
      }
    },

    normalizeValue(key, value) {
      if (key === "maxDistance") {
        return Dom.toPositiveNumber(value, Defaults.maxDistance, 0);
      }

      if (
        key === "repeatIntervalMinutes" ||
        key === "aMaxWall" ||
        key === "cMaxWall" ||
        key === "cMinLight" ||
        key === "minReportAgeMinutes"
      ) {
        return Dom.toPositiveNumber(value, Defaults[key], 0);
      }

      return value;
    },

    sanitize(settings) {
      return {
        enabled: Boolean(settings.enabled),
        maxDistance: Dom.toPositiveNumber(settings.maxDistance, Defaults.maxDistance, 0),
        repeatIntervalMinutes: Dom.toPositiveNumber(
          settings.repeatIntervalMinutes,
          Defaults.repeatIntervalMinutes,
          0
        ),
        aMaxWall: Dom.toPositiveNumber(settings.aMaxWall, Defaults.aMaxWall, 0),
        cMaxWall: Dom.toPositiveNumber(settings.cMaxWall, Defaults.cMaxWall, 0),
        cMinLight: Dom.toPositiveNumber(settings.cMinLight, Defaults.cMinLight, 0),
        fullHaulUsesC: Boolean(settings.fullHaulUsesC),
        minReportAgeEnabled: Boolean(settings.minReportAgeEnabled),
        minReportAgeMinutes: Dom.toPositiveNumber(
          settings.minReportAgeMinutes,
          Defaults.minReportAgeMinutes,
          0
        ),
        debug: Boolean(settings.debug),
      };
    },
  };

  const Logger = {
    debug(...args) {
      if (App.settings && App.settings.debug) {
        console.debug(`[${SCRIPT_NAME}]`, ...args);
      }
    },
    info(...args) {
      console.info(`[${SCRIPT_NAME}]`, ...args);
    },
    warn(...args) {
      console.warn(`[${SCRIPT_NAME}]`, ...args);
    },
    error(...args) {
      console.error(`[${SCRIPT_NAME}]`, ...args);
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
          window.TribalWars &&
          typeof window.TribalWars.post === "function"
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
        Boolean(Selectors.widgetBody()) &&
        Boolean(Selectors.plunderTable())
      );
    },
  };

  const Dom = {
    toPositiveNumber(value, fallback, minValue) {
      const numeric = Number(String(value).replace(",", "."));
      if (!Number.isFinite(numeric)) {
        return fallback;
      }
      return Math.max(minValue, numeric);
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

    isDisplayed(element) {
      if (!(element instanceof Element)) {
        return false;
      }
      const style = window.getComputedStyle(element);
      return style.display !== "none" && style.visibility !== "hidden";
    },

    getTooltipText(element) {
      if (!(element instanceof Element)) {
        return "";
      }
      return (
        element.getAttribute("data-title") ||
        element.getAttribute("title") ||
        ""
      );
    },

    extractFirstNumber(text) {
      if (!text) {
        return NaN;
      }
      const match = text.replace(",", ".").match(/-?\d+(?:\.\d+)?/);
      return match ? Number(match[0]) : NaN;
    },

    parseDurationSeconds(text) {
      if (!text) {
        return NaN;
      }
      const match = text.match(/(\d+):(\d{2}):(\d{2})/);
      if (!match) {
        return NaN;
      }
      return Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]);
    },

    decodeHtml(text) {
      if (typeof text !== "string") {
        return "";
      }
      const area = document.createElement("textarea");
      area.innerHTML = text;
      return area.value;
    },

    extractQueryParam(href, key) {
      try {
        const url = new URL(href, window.location.origin);
        return url.searchParams.get(key);
      } catch (error) {
        return null;
      }
    },

    wait(ms) {
      return new Promise((resolve) => {
        window.setTimeout(resolve, ms);
      });
    },

    async waitInterruptible(app, ms) {
      let remaining = Math.max(0, ms);
      while (remaining > 0) {
        if (!app.holdRequested || app.__destroyed) {
          return;
        }
        const slice = Math.min(remaining, 60);
        await this.wait(slice);
        remaining -= slice;
      }
    },

    showError(error) {
      const message =
        error instanceof Error ? error.message : String(error || "Unknown error");
      if (window.UI && typeof window.UI.ErrorMessage === "function") {
        window.UI.ErrorMessage(message);
      }
    },

    escapeRegExp(text) {
      return String(text).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    },
  };

  const Time = {
    getServerDateParts() {
      const element = document.getElementById("serverDate");
      if (!element) {
        return null;
      }
      const parts = (element.textContent || "").match(/\d+/g);
      if (!parts || parts.length < 3) {
        return null;
      }
      return parts.slice(0, 3).map(Number);
    },

    nowServerMs() {
      const serverTime = document.getElementById("serverTime");
      if (!serverTime) {
        return Date.now();
      }

      const sourceText =
        serverTime.closest("p")?.textContent || serverTime.textContent || "";
      const parts = sourceText.match(/\d+/g);
      if (!parts || parts.length < 6) {
        return Date.now();
      }

      const [hour, minute, second, day, month, year] = parts.map(Number);
      return new Date(year, month - 1, day, hour, minute, second).getTime();
    },

    parseGameTime(text) {
      if (!text) {
        return NaN;
      }

      const lang = window.lang || {};
      const serverDateParts = this.getServerDateParts();
      if (!serverDateParts) {
        return NaN;
      }

      const buildPattern = (pattern, replacements) => {
        let regex = Dom.escapeRegExp(pattern);
        Object.entries(replacements).forEach(([key, value]) => {
          regex = regex.replace(Dom.escapeRegExp(key), value);
        });
        return new RegExp(`^${regex}$`, "i");
      };

      const normalized = String(text)
        .replace(/\s+/g, " ")
        .replace(/:\s*$/, "")
        .trim();

      const todayPattern = lang["aea2b0aa9ae1534226518faaefffdaad"];
      const tomorrowPattern = lang["57d28d1b211fddbb7a499ead5bf23079"];
      const onPattern = lang["0cb274c906d622fa8ce524bcfbb7552d"];
      const atPattern = lang["850731037a4693bf4338a0e8b06bd2e4"];

      const timeRegex = "([\\d:]+)";
      const dateRegex = "([\\d./-]+)";

      if (todayPattern) {
        const match = buildPattern(todayPattern, { "%s": timeRegex }).exec(normalized);
        if (match) {
          return this.buildTimestamp(serverDateParts, match[1]);
        }
      }

      if (tomorrowPattern) {
        const match = buildPattern(tomorrowPattern, { "%s": timeRegex }).exec(normalized);
        if (match) {
          const tomorrow = [
            serverDateParts[0] + 1,
            serverDateParts[1],
            serverDateParts[2],
          ];
          return this.buildTimestamp(tomorrow, match[1]);
        }
      }

      if (onPattern) {
        const match = buildPattern(onPattern, {
          "%1": dateRegex,
          "%2": timeRegex,
        }).exec(normalized);
        if (match) {
          return this.buildTimestamp(this.parseDateParts(match[1], serverDateParts[2]), match[2]);
        }
      }

      if (atPattern) {
        const match = buildPattern(atPattern, {
          "%1": dateRegex,
          "%2": timeRegex,
        }).exec(normalized);
        if (match) {
          return this.buildTimestamp(this.parseDateParts(match[1], serverDateParts[2]), match[2]);
        }
      }

      const fallbackTime = normalized.match(/(\d{1,2}:\d{2}:\d{2})/);
      const fallbackDate = normalized.match(/(\d{1,4}[./-]\d{1,2}(?:[./-]\d{1,4})?)/);
      if (fallbackTime && fallbackDate) {
        return this.buildTimestamp(
          this.parseDateParts(fallbackDate[1], serverDateParts[2]),
          fallbackTime[1]
        );
      }

      return NaN;
    },

    parseDateParts(text, fallbackYear) {
      const numeric = String(text)
        .split(/[./-]/)
        .filter(Boolean)
        .map(Number);

      if (numeric.length === 2) {
        return [numeric[0], numeric[1], fallbackYear];
      }

      if (numeric.length === 3) {
        if (String(numeric[0]).length === 4) {
          return [numeric[2], numeric[1], numeric[0]];
        }
        return [numeric[0], numeric[1], numeric[2]];
      }

      return [1, 1, fallbackYear];
    },

    buildTimestamp(dateParts, timeText) {
      if (!Array.isArray(dateParts) || dateParts.length < 3) {
        return NaN;
      }

      const timeParts = String(timeText).split(":").map(Number);
      if (timeParts.length < 3) {
        return NaN;
      }

      const [day, month, year] = dateParts;
      const [hour, minute, second, millisecond = 0] = timeParts;
      return new Date(
        Number(year),
        Number(month) - 1,
        Number(day),
        Number(hour),
        Number(minute),
        Number(second),
        Number(millisecond)
      ).getTime();
    },
  };

  const TableColumns = {
    getMap(table) {
      const rows = Array.from(table.querySelectorAll(":scope > tbody > tr, :scope > tr"));
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

      const finalRowIndex = Math.max(0, grid.length - 1);
      const width = grid[finalRowIndex] ? grid[finalRowIndex].length : 0;
      const map = {};
      for (let column = 0; column < width; column += 1) {
        let cell = null;
        for (let rowIndex = finalRowIndex; rowIndex >= 0; rowIndex -= 1) {
          if (grid[rowIndex] && grid[rowIndex][column]) {
            cell = grid[rowIndex][column];
            break;
          }
        }

        if (!cell) {
          continue;
        }

        const text = cell.textContent.replace(/\s+/g, " ").trim().toLowerCase();
        const title =
          (cell.getAttribute("data-title") || cell.getAttribute("title") || "")
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
        } else if (title.includes("distance")) {
          map.distance = column;
        } else if (title.includes("wall")) {
          map.wall = column;
        }
      }
      return map;
    },
  };

  const RowParser = {
    parseRows() {
      const table = Selectors.plunderTable();
      if (!table) {
        return [];
      }

      const columns = TableColumns.getMap(table);
      return Selectors.rows().map((rowElement) => this.parseRow(rowElement, columns));
    },

    parseRow(rowElement, columns) {
      const rowIdMatch = rowElement.id.match(/^village_(\d+)$/);
      const targetVillageId = rowIdMatch ? Number(rowIdMatch[1]) : NaN;
      const reportLink = rowElement.querySelector("a[href*='screen=report'][href*='view=']");
      const reportHref = reportLink ? reportLink.getAttribute("href") || "" : "";
      const reportId = Number(Dom.extractQueryParam(reportHref, "view"));
      const coordText = reportLink?.textContent || "";
      const coordMatch = coordText.match(/(\d{1,3}\|\d{1,3})/);
      const coord = coordMatch ? coordMatch[1] : "";

      const reportDot = rowElement.querySelector("img[src*='/graphic/dots/']");
      const haulImage = rowElement.querySelector("img[src*='/graphic/max_loot/']");
      const aButton = rowElement.querySelector("a.farm_icon_a");
      const cButton = rowElement.querySelector("a.farm_icon_c");
      const aTemplateId = this.parseTemplateId(aButton);
      const aTemplate = this.getTemplate(aTemplateId);
      const cForecast = this.parseForecast(cButton);
      const cForecastLight = Number(cForecast?.light || 0);
      const timeCell = this.getCell(rowElement, columns.time, 4);
      const wallCell = this.getCell(rowElement, columns.wall, this.fallbackWallIndex(rowElement));
      const distanceCell = this.getCell(
        rowElement,
        columns.distance,
        this.fallbackDistanceIndex(rowElement)
      );
      const reportTimeText = timeCell?.textContent?.replace(/\s+/g, " ").trim() || "";

      return {
        rowElement,
        targetVillageId,
        coord,
        reportId: Number.isFinite(reportId) ? reportId : NaN,
        reportColor: this.parseReportColor(reportDot),
        haulState: this.parseHaulState(haulImage),
        reportTimeText,
        reportTimestamp: Time.parseGameTime(reportTimeText),
        wall: Dom.extractFirstNumber(wallCell?.textContent || ""),
        distance: Dom.extractFirstNumber(distanceCell?.textContent || ""),
        aButton,
        cButton,
        aTemplateId,
        aTemplate,
        aTravelSeconds: this.parseTravelSeconds(aButton),
        cTravelSeconds: this.parseTravelSeconds(cButton),
        cForecast,
        cForecastLight: Number.isFinite(cForecastLight) ? cForecastLight : NaN,
        externallyHidden:
          !Dom.isDisplayed(rowElement) && rowElement.dataset.ylaFiltered !== "1",
        hiddenByScript: rowElement.dataset.ylaFiltered === "1",
        aDisabled: this.isDisabledButton(aButton),
        cDisabled: this.isDisabledButton(cButton),
        filteredOut: false,
        filterReason: "",
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
      const codeMatch = src.match(/\/max_loot\/(\d+)\./);
      const code = codeMatch ? codeMatch[1] : "";
      if (code === "1") {
        return "full";
      }
      if (code === "0") {
        return "partial";
      }
      if (code === "2") {
        return "empty";
      }
      return "";
    },

    parseTemplateId(button) {
      const handler = button?.getAttribute("onclick") || "";
      const match = handler.match(/sendUnits\(this,\s*\d+,\s*(\d+)\)/);
      return match ? Number(match[1]) : NaN;
    },

    getTemplate(templateId) {
      if (!Number.isFinite(templateId)) {
        return null;
      }
      return window.Accountmanager?.farm?.templates?.[`t_${templateId}`] || null;
    },

    parseForecast(button) {
      if (!button) {
        return null;
      }

      try {
        if (window.jQuery) {
          const jqueryValue = window.jQuery(button).data("units-forecast");
          if (jqueryValue && typeof jqueryValue === "object") {
            return this.normalizeForecast(jqueryValue);
          }
        }
      } catch (error) {
        Logger.debug("jQuery forecast read failed", error);
      }

      const raw = button.getAttribute("data-units-forecast");
      if (!raw) {
        return null;
      }

      try {
        const decoded = Dom.decodeHtml(raw);
        return this.normalizeForecast(JSON.parse(decoded));
      } catch (error) {
        Logger.debug("Forecast JSON parse failed", error, raw);
        return null;
      }
    },

    normalizeForecast(forecast) {
      if (!forecast || typeof forecast !== "object") {
        return null;
      }

      const normalized = {};
      Object.entries(forecast).forEach(([unit, value]) => {
        normalized[unit] = Number(value) || 0;
      });
      return normalized;
    },

    parseTravelSeconds(button) {
      const tooltip = Dom.getTooltipText(button);
      return Dom.parseDurationSeconds(tooltip);
    },

    isDisabledButton(button) {
      return !button || button.classList.contains("farm_icon_disabled");
    },
  };

  const FilterEngine = {
    evaluate(row, settings) {
      if (row.externallyHidden) {
        return { pass: false, reason: "externally hidden" };
      }

      if (!row.targetVillageId || !row.coord) {
        return { pass: false, reason: "missing target data" };
      }

      if (!Number.isFinite(row.distance)) {
        return { pass: false, reason: "missing distance" };
      }

      if (row.distance > settings.maxDistance) {
        return { pass: false, reason: "distance" };
      }

      if (settings.minReportAgeEnabled && Number.isFinite(row.reportTimestamp)) {
        const minAgeMs = settings.minReportAgeMinutes * 60 * 1000;
        const ageMs = Time.nowServerMs() - row.reportTimestamp;
        if (ageMs < minAgeMs) {
          return { pass: false, reason: "report age" };
        }
      }

      if (settings.fullHaulUsesC && row.haulState === "full") {
        const cStatus = DecisionEngine.checkCBase(row, settings);
        return cStatus.ok
          ? { pass: true, reason: "" }
          : { pass: false, reason: cStatus.reason };
      }

      const aStatus = DecisionEngine.checkABase(row, settings);
      return aStatus.ok
        ? { pass: true, reason: "" }
        : { pass: false, reason: aStatus.reason };
    },

    applyVisibility(row, shouldShow) {
      if (shouldShow) {
        if (row.rowElement.dataset.ylaFiltered === "1") {
          delete row.rowElement.dataset.ylaFiltered;
          row.rowElement.style.removeProperty("display");
        }
        return;
      }

      row.rowElement.dataset.ylaFiltered = "1";
      row.rowElement.style.setProperty("display", "none", "important");
      Logger.debug("Filtered out row", row.coord, row.filterReason);
    },

    clearOwnHiddenRows() {
      document.querySelectorAll("tr[data-yla-filtered='1']").forEach((row) => {
        delete row.dataset.ylaFiltered;
        row.style.removeProperty("display");
      });
    },
  };

  const DecisionEngine = {
    choose(rows, settings, cooldown) {
      const visibleRows = rows.filter(
        (row) => !row.filteredOut && !row.externallyHidden && Dom.isDisplayed(row.rowElement)
      );

      for (const row of visibleRows) {
        const action = this.decideRow(row, settings);
        if (!action) {
          continue;
        }

        if (settings.repeatIntervalMinutes > 0) {
          if (!Number.isFinite(action.travelSeconds)) {
            Logger.debug("Rejected row with missing travel time", row.coord, action.type);
            continue;
          }

          action.arrivalAt = Time.nowServerMs() + action.travelSeconds * 1000;
          if (
            cooldown.hasConflict(
              row.coord,
              action.arrivalAt,
              settings.repeatIntervalMinutes
            )
          ) {
            Logger.debug("Cooldown blocked row", row.coord, action.type);
            continue;
          }
        }

        return action;
      }

      return null;
    },

    decideRow(row, settings) {
      if (settings.fullHaulUsesC && row.haulState === "full") {
        const cStatus = this.checkCBase(row, settings);
        if (!cStatus.ok) {
          // v1 intentionally does not fall back to A on full-haul rows when C is selected.
          Logger.debug("Full haul row rejected for C", row.coord, cStatus.reason);
          return null;
        }

        return {
          type: "C",
          row,
          button: row.cButton,
          reportId: row.reportId,
          travelSeconds: row.cTravelSeconds,
          arrivalAt: NaN,
        };
      }

      const aStatus = this.checkABase(row, settings);
      if (!aStatus.ok) {
        Logger.debug("A row rejected", row.coord, aStatus.reason);
        return null;
      }

      return {
        type: "A",
        row,
        button: row.aButton,
        templateId: row.aTemplateId,
        travelSeconds: row.aTravelSeconds,
        arrivalAt: NaN,
      };
    },

    checkABase(row, settings) {
      if (!row.aButton || row.aDisabled) {
        return { ok: false, reason: "A unavailable" };
      }

      if (!row.aTemplate || !Number.isFinite(row.aTemplateId)) {
        return { ok: false, reason: "A template missing" };
      }

      if (!Number.isFinite(row.wall)) {
        return { ok: false, reason: "missing wall" };
      }

      if (row.wall > settings.aMaxWall) {
        return { ok: false, reason: "A wall" };
      }

      return { ok: true, reason: "" };
    },

    checkCBase(row, settings) {
      if (!row.cButton || row.cDisabled) {
        return { ok: false, reason: "C unavailable" };
      }

      if (!Number.isFinite(row.reportId)) {
        return { ok: false, reason: "missing report id" };
      }

      if (!row.cForecast) {
        return { ok: false, reason: "missing forecast" };
      }

      if (!Number.isFinite(row.cForecastLight)) {
        return { ok: false, reason: "missing forecast light" };
      }

      if (row.cForecastLight < settings.cMinLight) {
        return { ok: false, reason: "C min light" };
      }

      if (!Number.isFinite(row.wall)) {
        return { ok: false, reason: "missing wall" };
      }

      if (row.wall > settings.cMaxWall) {
        return { ok: false, reason: "C wall" };
      }

      return { ok: true, reason: "" };
    },
  };

  const CooldownTracker = {
    create(app) {
      return {
        app,
        staticArrivals: new Map(),
        sessionArrivals: new Map(),
        loadingPromise: null,
        loaded: false,
        lastMode: "loading",

        describe() {
          if (!this.loaded && this.loadingPromise) {
            return "loading commands overview";
          }
          if (this.lastMode === "session-only") {
            return "session-only fallback";
          }
          if (this.lastMode === "loaded") {
            return "commands overview + session memory";
          }
          if (this.lastMode === "disabled") {
            return "disabled";
          }
          return "session memory";
        },

        async ensureLoaded(force) {
          if (this.app.settings.repeatIntervalMinutes <= 0) {
            this.lastMode = "disabled";
            this.app.updateCooldownStatus("disabled");
            return;
          }

          if (this.loaded && !force) {
            return;
          }

          if (this.loadingPromise && !force) {
            return this.loadingPromise;
          }

          this.loadingPromise = this.loadCommandsOverview()
            .then(() => {
              this.loaded = true;
              this.lastMode = "loaded";
              this.app.updateCooldownStatus(this.describe());
            })
            .catch((error) => {
              this.loaded = true;
              this.lastMode = "session-only";
              this.app.updateCooldownStatus(this.describe());
              Logger.warn("Commands overview cooldown load failed, using session-only fallback", error);
            })
            .finally(() => {
              this.loadingPromise = null;
            });

          return this.loadingPromise;
        },

        addSessionArrival(coord, arrivalAt) {
          if (!coord || !Number.isFinite(arrivalAt)) {
            return;
          }
          const list = this.sessionArrivals.get(coord) || [];
          list.push(arrivalAt);
          this.sessionArrivals.set(coord, list);
        },

        hasConflict(coord, arrivalAt, intervalMinutes) {
          if (!coord || !Number.isFinite(arrivalAt) || intervalMinutes <= 0) {
            return false;
          }

          const intervalMs = intervalMinutes * 60 * 1000;
          const now = Time.nowServerMs();
          const allArrivals = [
            ...(this.staticArrivals.get(coord) || []),
            ...(this.sessionArrivals.get(coord) || []),
          ].filter((timestamp) => timestamp >= now - intervalMs);

          if (this.staticArrivals.has(coord)) {
            this.staticArrivals.set(
              coord,
              (this.staticArrivals.get(coord) || []).filter(
                (timestamp) => timestamp >= now - intervalMs
              )
            );
          }

          if (this.sessionArrivals.has(coord)) {
            this.sessionArrivals.set(
              coord,
              (this.sessionArrivals.get(coord) || []).filter(
                (timestamp) => timestamp >= now - intervalMs
              )
            );
          }

          return allArrivals.some(
            (timestamp) => Math.abs(timestamp - arrivalAt) < intervalMs
          );
        },

        async loadCommandsOverview() {
          this.staticArrivals.clear();
          const url = new URL("/game.php", window.location.origin);
          url.searchParams.set("village", String(window.game_data?.village?.id || ""));
          url.searchParams.set("screen", "overview_villages");
          url.searchParams.set("mode", "commands");
          url.searchParams.set("type", "all");
          url.searchParams.set("group", "0");
          url.searchParams.set("page", "-1");

          Logger.debug("Loading commands overview", url.toString());

          const response = await window.fetch(url.toString(), {
            credentials: "same-origin",
          });

          if (!response.ok) {
            throw new Error(`Commands overview HTTP ${response.status}`);
          }

          const html = await response.text();
          const doc = new DOMParser().parseFromString(html, "text/html");
          const commandRows = Array.from(doc.querySelectorAll("#commands_table tr"));

          commandRows.forEach((row) => {
            const command = row.querySelector(".own_command[data-command-type='attack']");
            if (!command) {
              return;
            }

            const label = row.querySelector(".quickedit-label");
            const coordMatch = label?.textContent?.match(/(\d{1,3}\|\d{1,3})/);
            const coord = coordMatch ? coordMatch[1] : "";
            if (!coord) {
              return;
            }

            const arrivalCell = row.cells?.[1];
            if (!arrivalCell) {
              return;
            }

            const arrivalText = arrivalCell.innerHTML
              .replace(/<span[^>]*>.*?<\/span>/gi, "")
              .replace(/<[^>]+>/g, "")
              .replace(/\s+/g, " ")
              .replace(/:\s*$/, "")
              .trim();
            const arrivalAt = Time.parseGameTime(arrivalText);
            if (!Number.isFinite(arrivalAt)) {
              Logger.debug("Skipped unparsable command arrival", arrivalText);
              return;
            }

            const list = this.staticArrivals.get(coord) || [];
            list.push(arrivalAt);
            this.staticArrivals.set(coord, list);
          });

          Logger.debug(
            "Loaded command cooldown map",
            this.staticArrivals.size,
            "targets"
          );
        },
      };
    },
  };

  const SendAdapter = {
    async send(action) {
      if (action.type === "A") {
        return this.sendA(action);
      }
      if (action.type === "C") {
        return this.sendC(action);
      }
      throw new Error(`Unsupported action type: ${action.type}`);
    },

    async sendA(action) {
      if (!window.Accountmanager?.farm?.unitsAppearAvailableAB?.(action.templateId)) {
        throw new Error("Not enough units for template A");
      }

      this.lockButton(action.button);
      const payload = {
        target: action.row.targetVillageId,
        template_id: action.templateId,
        source: window.game_data?.village?.id,
      };
      const response = await this.post(window.Accountmanager.send_units_link, payload);
      if (response?.error) {
        throw new Error(response.error);
      }

      this.applySuccess(action, response, true);
      return response;
    },

    async sendC(action) {
      this.lockButton(action.button);
      const payload = { report_id: action.reportId };
      const response = await this.post(
        window.Accountmanager.send_units_link_from_report,
        payload
      );
      if (response?.error) {
        throw new Error(response.error);
      }

      this.applySuccess(action, response, false);
      return response;
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

    lockButton(button) {
      if (!button) {
        return;
      }
      try {
        if (window.jQuery && window.Accountmanager?.farm?.clickhappyLock) {
          window.Accountmanager.farm.clickhappyLock(window.jQuery(button));
        } else {
          button.dataset.clickhappyLock = "1";
          window.setTimeout(() => {
            delete button.dataset.clickhappyLock;
          }, 400);
        }
      } catch (error) {
        Logger.debug("Lock button fallback failed", error);
      }
    },

    applySuccess(action, response, addDoneClass) {
      const selector = `.farm_village_${action.row.targetVillageId}`;
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
        window.Accountmanager.farm.updateNonAttacked(action.row.targetVillageId);
      }
    },
  };

  window.YaverusLA = App;
  App.init();
})();
