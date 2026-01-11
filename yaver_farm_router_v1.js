/* =======================================================================
   Yaver Farm Router v1.0.0  (TribalWars / DS)

   Goal:
   - Keep the Loot Assistant UI unchanged, but send from the BEST source village
     (shortest distance => fastest return) instead of accidentally sending
     from the currently selected village.

   Controls (hold-to-spam):
   - Hold A: repeatedly send template A on the next eligible row
   - Hold B: repeatedly send template B (spy) on the next eligible row
   - Hold C: repeatedly send template C on the next eligible row
   - Hold M: "Master" mode (rules configurable in panel)

   Master rules (defaults):
   - max distance: 15
   - max wall: 1
   - only send if report time is within last 4 hours
   - light cavalry count must be between min=5 and max=20
     (we check the template light count; if C is outside range, we fall back to A)

   Safety:
   - Rate limit between sends (default 350ms, configurable)
   - On "Not enough units available", tries the next closest source village.
   ======================================================================= */

(function () {
  "use strict";

  const APP = {
    version: "v1.0.0",
    storageKey: "YAVER_FARM_ROUTER_SETTINGS_V1",
    running: false,
    runKey: null,
    keyDown: {},
    timer: null,
    lastSendAt: 0,

    villages: [],         // [{id, coord, x, y, name, enabled}]
    templates: null,      // from page (detected A/B/C template ids)
    settings: null,
  };

  const DEFAULTS = {
    // master
    maxDistance: 15,
    maxWall: 1,
    recentHours: 4,
    minLC: 5,
    maxLC: 20,

    // general
    delayMs: 350,
    showToast: true,

    // which villages are sources (default: all true once detected)
    enabledVillageIds: null,
  };

  function log(...a) { console.log("[YaverFarm]", ...a); }
  function toastOk(msg) { if (DEFAULTS.showToast && window.UI && UI.SuccessMessage) UI.SuccessMessage(msg, 1200); }
  function toastErr(msg) { if (window.UI && UI.ErrorMessage) UI.ErrorMessage(String(msg), 4000); }

  function isFarmScreen() {
    return (window.game_data && game_data.screen === "am_farm") || /screen=am_farm/.test(location.search);
  }

  function getCsrf() {
    return (window.game_data && game_data.csrf) ? game_data.csrf : null;
  }

  function nowMs() {
    // server-ish time
    if (window.game_data && typeof game_data.time_generated === "number") return game_data.time_generated;
    return Date.now();
  }

  function loadSettings() {
    try {
      const raw = localStorage.getItem(APP.storageKey);
      if (!raw) return { ...DEFAULTS };
      const obj = JSON.parse(raw);
      return { ...DEFAULTS, ...obj };
    } catch {
      return { ...DEFAULTS };
    }
  }

  function saveSettings() {
    try {
      localStorage.setItem(APP.storageKey, JSON.stringify(APP.settings));
    } catch {}
  }

  function parseCoord(str) {
    const m = String(str || "").match(/(\d{1,3})\|(\d{1,3})/);
    if (!m) return null;
    return { x: parseInt(m[1], 10), y: parseInt(m[2], 10), coord: `${m[1]}|${m[2]}` };
  }

  function dist(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  // Parse "today at 19:35:37" / "yesterday at 23:50:51"
  function parseReportTime(text) {
    const t = String(text || "").trim().toLowerCase();
    const m = t.match(/(today|yesterday)\s+at\s+(\d{1,2}):(\d{2})(?::(\d{2}))?/);
    if (!m) return null;

    const base = new Date(nowMs());
    if (m[1] === "yesterday") base.setDate(base.getDate() - 1);

    base.setHours(parseInt(m[2], 10), parseInt(m[3], 10), parseInt(m[4] || "0", 10), 0);
    return base.getTime();
  }

  function withinHours(ts, hours) {
    if (!ts) return false;
    const ageMs = nowMs() - ts;
    return ageMs >= 0 && ageMs <= hours * 3600 * 1000;
  }

  function getVillageSwitchOptions() {
    // Common selectors across TW UI
    const sel =
      document.querySelector("#village_switch") ||
      document.querySelector("select#village_switch") ||
      document.querySelector("select[name='village']") ||
      document.querySelector("select.village_switch");

    if (!sel) return [];

    const opts = Array.from(sel.querySelectorAll("option"));
    const out = [];
    for (const o of opts) {
      const id = String(o.value || "").trim();
      const coord = parseCoord(o.textContent || "");
      if (!id || !coord) continue;
      out.push({
        id,
        coord: coord.coord,
        x: coord.x,
        y: coord.y,
        name: (o.textContent || "").trim(),
        enabled: true,
      });
    }
    return out;
  }

  function ensureVillagesLoaded() {
    const v = getVillageSwitchOptions();
    if (!v.length) {
      // fallback: at least current village
      if (window.game_data && game_data.village && game_data.village.id && game_data.village.coord) {
        const c = parseCoord(game_data.village.coord);
        if (c) {
          APP.villages = [{
            id: String(game_data.village.id),
            coord: c.coord,
            x: c.x,
            y: c.y,
            name: game_data.village.display_name || game_data.village.name || c.coord,
            enabled: true,
          }];
        }
      }
      return;
    }
    APP.villages = v;

    // apply saved enabledVillageIds
    if (Array.isArray(APP.settings.enabledVillageIds) && APP.settings.enabledVillageIds.length) {
      const set = new Set(APP.settings.enabledVillageIds.map(String));
      APP.villages.forEach(vil => vil.enabled = set.has(String(vil.id)));
    } else {
      // default: all enabled
      APP.settings.enabledVillageIds = APP.villages.map(vil => String(vil.id));
      saveSettings();
    }
  }

  function getEnabledVillages() {
    return APP.villages.filter(v => v.enabled);
  }

  function urlSendFarm(sourceId) {
    // safest: village param == source param
    return `${location.origin}/game.php?village=${encodeURIComponent(sourceId)}&screen=am_farm&mode=farm&ajaxaction=farm&json=1`;
  }

  function detectRowTemplates(row) {
    // Extract from onclick:
    // return Accountmanager.farm.sendUnits(this, 14704, 11080)
    const a = row.querySelector("a.farm_icon_a");
    const b = row.querySelector("a.farm_icon_b");
    const c = row.querySelector("a.farm_icon_c");

    function parseOnclick(el) {
      if (!el) return null;
      const on = el.getAttribute("onclick") || "";
      const m = on.match(/sendUnits\(\s*this\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/);
      if (!m) return null;
      return { targetId: String(m[1]), templateId: String(m[2]), el };
    }

    const pa = parseOnclick(a);
    const pb = parseOnclick(b);
    // C sometimes is disabled and might not have sendUnits in onclick
    const pc = parseOnclick(c);

    // targetId should match across A/B/C if present
    const targetId = (pa && pa.targetId) || (pb && pb.targetId) || (pc && pc.targetId) || null;

    return {
      targetId,
      A: pa ? { templateId: pa.templateId, el: pa.el } : null,
      B: pb ? { templateId: pb.templateId, el: pb.el } : null,
      C: pc ? { templateId: pc.templateId, el: pc.el } : null,
    };
  }

  function parseRowInfo(row) {
    // Identify target & templates from A/B/C buttons
    const t = detectRowTemplates(row);
    if (!t.targetId) return null;

    const text = row.textContent || "";
    const coord = parseCoord(text);
    if (!coord) return null;

    // report time usually in a dedicated td (e.g. "yesterday at 19:35:37")
    // best-effort: search for "today at" or "yesterday at"
    let timeText = "";
    const mTime = text.match(/(today|yesterday)\s+at\s+\d{1,2}:\d{2}(?::\d{2})?/i);
    if (mTime) timeText = mTime[0];

    const tMs = timeText ? parseReportTime(timeText) : null;

    // Find A cell index to derive wall/distance from preceding cells
    const tds = Array.from(row.querySelectorAll("td"));
    const aCell = row.querySelector("a.farm_icon_a");
    let wall = null;
    let distanceVal = null;
    if (aCell) {
      const aTd = aCell.closest("td");
      const aIdx = tds.indexOf(aTd);
      if (aIdx >= 2) {
        const distTxt = (tds[aIdx - 1]?.textContent || "").trim();
        const wallTxt = (tds[aIdx - 2]?.textContent || "").trim();

        // distance is usually like "11.4"
        if (/^\d+(\.\d+)?$/.test(distTxt)) distanceVal = parseFloat(distTxt);
        if (/^\d+$/.test(wallTxt)) wall = parseInt(wallTxt, 10);
      }
    }

    return {
      row,
      targetId: t.targetId,
      coord,
      timeText,
      timeMs: tMs,
      wall,
      distanceFromCurrent: distanceVal,
      templates: t,
      disabled: {
        A: t.A ? t.A.el.classList.contains("farm_icon_disabled") : true,
        B: t.B ? t.B.el.classList.contains("farm_icon_disabled") : true,
        C: t.C ? t.C.el.classList.contains("farm_icon_disabled") : true,
      },
    };
  }

  function getRows() {
    // Most TW pages have a table with id plunder_list for Farm Assistant
    const table = document.querySelector("#plunder_list") || document.querySelector("#am_widget_Farm table");
    if (!table) return [];
    const rows = Array.from(table.querySelectorAll("tr[id^='village_']"));
    return rows;
  }

  function getTemplateLC(templateId) {
    // If Accountmanager.farm.templates exists on page, use it (static templates)
    try {
      const key = "t_" + String(templateId);
      const tpl = window.Accountmanager && Accountmanager.farm && Accountmanager.farm.templates
        ? Accountmanager.farm.templates[key]
        : null;

      if (!tpl) return null;
      const v = tpl.light;
      if (v === undefined || v === null) return 0;
      const n = parseInt(String(v), 10);
      return Number.isFinite(n) ? n : 0;
    } catch {
      return null;
    }
  }

  function chooseSourcesByDistance(targetCoord) {
    const enabled = getEnabledVillages();
    const arr = enabled
      .map(v => ({ ...v, d: dist(v, targetCoord) }))
      .sort((a, b) => a.d - b.d);
    return arr;
  }

  function buildPanel() {
    const existing = document.querySelector("#yaverFarmPanel");
    if (existing) existing.remove();

    const panel = document.createElement("div");
    panel.id = "yaverFarmPanel";
    panel.style.cssText = `
      background:#fff5bf;border:2px solid #a87e00;padding:10px;margin:10px 0;
      box-shadow:2px 2px 5px rgba(0,0,0,0.25); border-radius:6px;
      font-size:12px;
    `;

    const villagesHtml = getEnabledVillages().map(v => `
      <label style="margin-right:10px;white-space:nowrap;">
        <input type="checkbox" class="yvr-vil" data-id="${v.id}" ${v.enabled ? "checked" : ""}>
        ${v.name}
      </label>
    `).join("");

    panel.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;">
        <div>
          <b>Yaver Farm Router ${APP.version}</b>
          <span style="margin-left:10px;color:#555;">Hold keys: A / B / C / M (release to stop)</span>
        </div>
        <div>
          <button class="btn" id="yvr-save">Save</button>
          <button class="btn" id="yvr-reset">Reset Defaults</button>
        </div>
      </div>

      <div style="margin-top:8px;">
        <b>Sources (villages used for routing):</b>
        <div style="margin-top:4px;">${villagesHtml}</div>
      </div>

      <div style="margin-top:8px;display:flex;gap:18px;flex-wrap:wrap;align-items:flex-end;">
        <div>
          <label>max distance</label><br>
          <input id="yvr-maxDist" type="number" step="0.1" value="${APP.settings.maxDistance}" style="width:90px;">
        </div>
        <div>
          <label>max wall</label><br>
          <input id="yvr-maxWall" type="number" step="1" value="${APP.settings.maxWall}" style="width:90px;">
        </div>
        <div>
          <label>recent hours (Master)</label><br>
          <input id="yvr-recentH" type="number" step="1" value="${APP.settings.recentHours}" style="width:90px;">
        </div>
        <div>
          <label>min LC (Master)</label><br>
          <input id="yvr-minLC" type="number" step="1" value="${APP.settings.minLC}" style="width:90px;">
        </div>
        <div>
          <label>max LC (Master)</label><br>
          <input id="yvr-maxLC" type="number" step="1" value="${APP.settings.maxLC}" style="width:90px;">
        </div>
        <div>
          <label>delay ms</label><br>
          <input id="yvr-delay" type="number" step="10" value="${APP.settings.delayMs}" style="width:90px;">
        </div>
        <div style="min-width:260px;color:#444;">
          <div><b>Status:</b> <span id="yvr-status">idle</span></div>
          <div style="margin-top:3px;"><b>Tip:</b> use <b>B</b> for scouting (1 spy) on many targets; then use <b>M</b> or <b>A/C</b>.</div>
        </div>
      </div>
    `;

    const content = document.querySelector("#content_value") || document.body;
    content.prepend(panel);

    // events
    panel.querySelector("#yvr-save").addEventListener("click", () => {
      const vilChecks = Array.from(panel.querySelectorAll("input.yvr-vil"));
      const enabledIds = [];
      vilChecks.forEach(ch => {
        const id = String(ch.getAttribute("data-id"));
        const enabled = !!ch.checked;
        const v = APP.villages.find(x => String(x.id) === id);
        if (v) v.enabled = enabled;
        if (enabled) enabledIds.push(id);
      });

      APP.settings.maxDistance = parseFloat(panel.querySelector("#yvr-maxDist").value) || DEFAULTS.maxDistance;
      APP.settings.maxWall = parseInt(panel.querySelector("#yvr-maxWall").value, 10);
      if (!Number.isFinite(APP.settings.maxWall)) APP.settings.maxWall = DEFAULTS.maxWall;

      APP.settings.recentHours = parseInt(panel.querySelector("#yvr-recentH").value, 10);
      if (!Number.isFinite(APP.settings.recentHours)) APP.settings.recentHours = DEFAULTS.recentHours;

      APP.settings.minLC = parseInt(panel.querySelector("#yvr-minLC").value, 10);
      if (!Number.isFinite(APP.settings.minLC)) APP.settings.minLC = DEFAULTS.minLC;

      APP.settings.maxLC = parseInt(panel.querySelector("#yvr-maxLC").value, 10);
      if (!Number.isFinite(APP.settings.maxLC)) APP.settings.maxLC = DEFAULTS.maxLC;

      APP.settings.delayMs = parseInt(panel.querySelector("#yvr-delay").value, 10);
      if (!Number.isFinite(APP.settings.delayMs)) APP.settings.delayMs = DEFAULTS.delayMs;

      APP.settings.enabledVillageIds = enabledIds;
      saveSettings();
      toastOk("Saved ✅");
    });

    panel.querySelector("#yvr-reset").addEventListener("click", () => {
      APP.settings = { ...DEFAULTS, enabledVillageIds: APP.villages.map(v => String(v.id)) };
      APP.villages.forEach(v => v.enabled = true);
      saveSettings();
      toastOk("Defaults restored ✅");
      buildPanel();
    });
  }

  function setStatus(text) {
    const el = document.querySelector("#yvr-status");
    if (el) el.textContent = text;
  }

  async function postFarm(sourceId, targetId, templateId) {
    const csrf = getCsrf();
    if (!csrf) throw new Error("CSRF not found (game_data.csrf).");

    const url = urlSendFarm(sourceId);

    return new Promise((resolve) => {
      $.ajax({
        url,
        method: "POST",
        dataType: "json",
        headers: {
          "tribalwars-ajax": "1",
          "x-requested-with": "XMLHttpRequest",
        },
        data: {
          target: targetId,
          template_id: templateId,
          source: sourceId,
          h: csrf,
        },
        success: (data) => resolve({ ok: true, data }),
        error: (xhr) => {
          // sometimes server returns json in responseText
          let msg = "request failed";
          try {
            msg = xhr && xhr.responseJSON && (xhr.responseJSON.error || xhr.responseJSON.message) ? (xhr.responseJSON.error || xhr.responseJSON.message) : msg;
          } catch {}
          resolve({ ok: false, error: msg, xhr });
        },
      });
    });
  }

  function masterChooseTemplate(rowInfo) {
    // Rules:
    // - distance <= maxDistance (using best source distance, computed outside)
    // - wall <= maxWall
    // - report time within recentHours
    // - LC count between min/max (check template definitions)
    const A = rowInfo.templates.A;
    const C = rowInfo.templates.C;

    // Prefer C then A
    if (C && !rowInfo.disabled.C) {
      const lc = getTemplateLC(C.templateId);
      if (lc !== null && lc >= APP.settings.minLC && lc <= APP.settings.maxLC) return C.templateId;
      // if lc is null, we don't know; be conservative and skip C
    }
    if (A && !rowInfo.disabled.A) {
      const lc = getTemplateLC(A.templateId);
      // A is usually fixed 5 LC, so passes default 5..20
      if (lc !== null && lc >= APP.settings.minLC && lc <= APP.settings.maxLC) return A.templateId;
      // if lc is null, allow A as fallback
      if (lc === null) return A.templateId;
    }
    return null;
  }

  function rowPassesBaseFilters(rowInfo, bestSourceDistance) {
    // distance based on best source
    if (bestSourceDistance > APP.settings.maxDistance) return false;

    // wall check if detected
    if (rowInfo.wall !== null && rowInfo.wall !== undefined) {
      if (rowInfo.wall > APP.settings.maxWall) return false;
    }

    return true;
  }

  function rowPassesMasterFilters(rowInfo, bestSourceDistance) {
    if (!rowPassesBaseFilters(rowInfo, bestSourceDistance)) return false;

    // "last 4 hours attacked" interpreted as report time freshness
    if (!rowInfo.timeMs) return false;
    if (!withinHours(rowInfo.timeMs, APP.settings.recentHours)) return false;

    return true;
  }

  function getTemplateIdForKey(rowInfo, key) {
    if (key === "A") return rowInfo.templates.A && !rowInfo.disabled.A ? rowInfo.templates.A.templateId : null;
    if (key === "B") return rowInfo.templates.B && !rowInfo.disabled.B ? rowInfo.templates.B.templateId : null;
    if (key === "C") return rowInfo.templates.C && !rowInfo.disabled.C ? rowInfo.templates.C.templateId : null;
    if (key === "M") return masterChooseTemplate(rowInfo);
    return null;
  }

  function pickNextRowForKey(key) {
    const rows = getRows();

    // Build row infos and filter
    for (const r of rows) {
      if (r.style.display === "none") continue;
      const info = parseRowInfo(r);
      if (!info) continue;

      const candidates = chooseSourcesByDistance(info.coord);
      if (!candidates.length) continue;
      const best = candidates[0];

      // base filters for A/B/C; master uses stricter
      const ok = (key === "M")
        ? rowPassesMasterFilters(info, best.d)
        : rowPassesBaseFilters(info, best.d);

      if (!ok) continue;

      const templateId = getTemplateIdForKey(info, key);
      if (!templateId) continue;

      return { info, candidates, templateId };
    }
    return null;
  }

  async function sendWithBestSource(info, candidates, templateId) {
    // Try sources from nearest to farthest until success or exhausted
    for (const src of candidates) {
      const res = await postFarm(src.id, info.targetId, templateId);

      if (res.ok && res.data) {
        if (res.data.error) {
          // Common error: Not enough units available
          const e = String(res.data.error);
          if (e.includes("Not enough units")) {
            continue; // try next source
          }
          return { ok: false, error: e };
        }

        // Success
        try { info.row.style.display = "none"; } catch {}
        return { ok: true, sourceId: src.id, payload: res.data };
      }

      // network error: try next source
    }
    return { ok: false, error: "No enabled village had enough units (or request failed)." };
  }

  async function loopStep() {
    if (!APP.running || !APP.runKey) return;

    // rate limit
    const elapsed = nowMs() - APP.lastSendAt;
    if (elapsed < APP.settings.delayMs) {
      APP.timer = setTimeout(loopStep, APP.settings.delayMs - elapsed);
      return;
    }

    const pick = pickNextRowForKey(APP.runKey);
    if (!pick) {
      setStatus("no eligible rows (stopped)");
      stopLoop();
      return;
    }

    const { info, candidates, templateId } = pick;

    setStatus(`sending ${APP.runKey} -> target ${info.targetId} (best src ${candidates[0].id})...`);
    APP.lastSendAt = nowMs();

    const res = await sendWithBestSource(info, candidates, templateId);
    if (res.ok) {
      setStatus(`sent ${APP.runKey} from ${res.sourceId} to ${info.targetId}`);
      toastOk(`Sent ${APP.runKey} ✅ (src ${res.sourceId})`);
    } else {
      setStatus(`error: ${res.error}`);
      toastErr(res.error);
      // small pause to avoid spam if error repeats
      APP.lastSendAt = nowMs();
    }

    APP.timer = setTimeout(loopStep, APP.settings.delayMs);
  }

  function startLoop(key) {
    if (APP.running) return;
    APP.running = true;
    APP.runKey = key;
    APP.lastSendAt = 0;
    setStatus(`running (hold ${key})...`);
    loopStep();
  }

  function stopLoop() {
    APP.running = false;
    APP.runKey = null;
    if (APP.timer) clearTimeout(APP.timer);
    APP.timer = null;
    setStatus("idle");
  }

  function bindKeys() {
    document.addEventListener("keydown", (e) => {
      const k = (e.key || "").toUpperCase();
      if (!["A", "B", "C", "M"].includes(k)) return;

      // prevent auto-repeat starting multiple loops
      if (APP.keyDown[k]) return;
      APP.keyDown[k] = true;

      // Don't hijack inputs
      const tag = (e.target && e.target.tagName) ? e.target.tagName.toLowerCase() : "";
      if (tag === "input" || tag === "textarea" || e.target.isContentEditable) return;

      startLoop(k);
    });

    document.addEventListener("keyup", (e) => {
      const k = (e.key || "").toUpperCase();
      if (!["A", "B", "C", "M"].includes(k)) return;
      APP.keyDown[k] = false;
      // Stop only if the released key is the running key
      if (APP.runKey === k) stopLoop();
    });
  }

  function init() {
    if (!isFarmScreen()) {
      toastErr("Yaver Farm Router: open Loot Assistant (screen=am_farm) first.");
      return;
    }
    if (typeof $ === "undefined") {
      toastErr("Yaver Farm Router: jQuery not found.");
      return;
    }
    if (!getCsrf()) {
      toastErr("Yaver Farm Router: CSRF not found (game_data.csrf).");
      return;
    }

    APP.settings = loadSettings();
    ensureVillagesLoaded();
    buildPanel();
    bindKeys();

    toastOk("Yaver Farm Router ready ✅ (Hold A/B/C/M)");
    log("Ready", APP.version, {
      villages: APP.villages.length,
      enabled: getEnabledVillages().length,
      csrf: getCsrf(),
    });
  }

  init();
})();
