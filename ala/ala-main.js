/* Advanced Looting Assistant (ALA) v2.1.0
   - Works via Quickbar loader (no Tampermonkey)
   - Requires: Tribal Wars Loot Assistant (screen=am_farm) and jQuery (already present)
*/
(function () {
  const W = window.top;
  const $ = W.$;

  // Prevent double-load (but allow reload if you click again: we'll clean up)
  if (W.__ALA__ && W.__ALA__.destroy) {
    try { W.__ALA__.destroy(); } catch (e) {}
  }

  const ALA = {};
  W.__ALA__ = ALA;

  // ---------------------------
  // Config (your hard rules)
  // ---------------------------
  const CFG = {
    version: "2.1.0",
    maxDistance: 14,         // HARD: > 14 => NEVER send (both modes)
    minLC: 5,                // HARD: never send < 5 LC
    minScout: 1,             // HARD: always at least 1 scout
    maxRatePerSecond: 2,     // HARD: <= 2 attacks/sec
    tickMs: 150,             // internal loop tick
    historyWindowHours: 5,   // for stability logic
    mediumFactor: 0.60,      // if "medium stable": send 60% of C
    strongCv: 0.25,          // robust CV thresholds
    mediumCv: 0.45,
  };

  function now() { return Date.now(); }
  function hours(h) { return h * 3600 * 1000; }

  function isOnFarm() {
    return (W.game_data && W.game_data.screen === "am_farm") || String(W.location.href).includes("screen=am_farm");
  }

  function toast(msg, ms = 1200) {
    try { W.UI.InfoMessage(msg, ms); } catch (e) {}
  }

  // Bot protection: best-effort detection (yankayis style + common overlays)
  function isBotProtectionActive() {
    try {
      const bp = $("body").data("bot-protect");
      if (bp !== undefined) return true;
      if ($("#bot_check, #bot-protect, .bot_check, .bot-protect").length) return true;
      // Sometimes overlay disables clicks
      if ($(".popup_box:visible:contains('bot')").length) return true;
    } catch (e) {}
    return false;
  }

  // ---------------------------
  // Storage keys (namespaced)
  // ---------------------------
  function nsKey(suffix) {
    const world = (W.game_data && W.game_data.world) ? W.game_data.world : W.location.host;
    const pid = (W.game_data && W.game_data.player && W.game_data.player.id) ? W.game_data.player.id : "0";
    return `ALA:${world}:${pid}:${suffix}`;
  }

  const KEY_SETTINGS = nsKey("settings");
  const KEY_VILLAGES = nsKey("myVillages");
  const KEY_PLAN = nsKey("plan");
  const KEY_STATE = nsKey("state");
  const KEY_CLEARWALL = nsKey("clearWall");
  const KEY_HISTORY = nsKey("history");

  function loadLS(key, fallback) {
    try {
      const raw = W.localStorage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw);
    } catch (e) {
      return fallback;
    }
  }
  function saveLS(key, val) {
    try { W.localStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
  }

  // ---------------------------
  // Settings (Day Start Units customizable + persistent)
  // ---------------------------
  let settings = loadLS(KEY_SETTINGS, {
    dayStartLC: 5,
    dayStartScout: 1
  });

  function normalizeSettings() {
    settings.dayStartLC = Math.max(CFG.minLC, safeParseInt(settings.dayStartLC, 5));
    settings.dayStartScout = Math.max(CFG.minScout, safeParseInt(settings.dayStartScout, 1));
  }
  normalizeSettings();
  saveLS(KEY_SETTINGS, settings);

  // ---------------------------
  // State + data caches
  // ---------------------------
  let state = loadLS(KEY_STATE, {
    running: false,
    mode: "NORMAL", // NORMAL | DAY_START
    idx: 0,
    lastFire: 0,
    pausedReason: null,
    switching: false
  });

  let myVillages = loadLS(KEY_VILLAGES, null);   // [{id, name, coord:{x,y}, light, spy}]
  let planData = loadLS(KEY_PLAN, { plan: [] }); // [{sourceVillageId, targetKey, targetVillageId, reportId, action, factor, ...}]
  let clearWall = loadLS(KEY_CLEARWALL, []);
  let history = loadLS(KEY_HISTORY, {}); // { targetKey: [{ts, lootTotal, reportId}] }

  function saveAll() {
    saveLS(KEY_SETTINGS, settings);
    saveLS(KEY_STATE, state);
    saveLS(KEY_VILLAGES, myVillages);
    saveLS(KEY_PLAN, planData);
    saveLS(KEY_CLEARWALL, clearWall);
    saveLS(KEY_HISTORY, history);
  }

  // ---------------------------
  // Helpers
  // ---------------------------
  function safeParseInt(v, fallback = 0) {
    if (v === null || v === undefined) return fallback;
    const s = String(v).trim();
    if (!s) return fallback;
    // handles "4.097" or "4,097" etc
    const digits = s.replace(/[^\d]/g, "");
    if (!digits) return fallback;
    const n = parseInt(digits, 10);
    return Number.isFinite(n) ? n : fallback;
  }

  function parseCoord(text) {
    const m = String(text).match(/\((\d+)\|(\d+)\)/);
    if (!m) return null;
    return { x: parseInt(m[1], 10), y: parseInt(m[2], 10) };
  }

  function dist(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function getCurrentVillageId() {
    return (W.game_data && W.game_data.village && W.game_data.village.id) ? W.game_data.village.id : null;
  }

  // Read A/B template unit counts from button title (best-effort).
  // If parsing fails, returns {light:5, spy:1} as safe minimum model.
  function parseTemplateUnitsFromTitle($btn) {
    try {
      let t = $btn.attr("title") || "";
      // decode if needed
      t = t.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#039;/g, "'");
      const spyM = t.match(/unit_spy\.(?:webp|png)[^>]*\/>\s*(\d+)/i);
      const lightM = t.match(/unit_light\.(?:webp|png)[^>]*\/>\s*(\d+)/i);
      const spy = spyM ? parseInt(spyM[1], 10) : 1;
      const light = lightM ? parseInt(lightM[1], 10) : 5;
      return { light: Math.max(CFG.minLC, light), spy: Math.max(CFG.minScout, spy) };
    } catch (e) {
      return { light: 5, spy: 1 };
    }
  }

  // ---------------------------
  // UI
  // ---------------------------
  function removeUI() {
    $("#ala_panel").remove();
    $(document).off("keydown.ala");
  }

  function mountUI() {
    removeUI();

    if (!isOnFarm()) {
      toast("ALA: Please open Loot Assistant (screen=am_farm) then click ALA again.", 2500);
      return;
    }

    const html = `
      <div id="ala_panel" class="vis" style="padding:10px; margin:8px 0; background:#f4e4bc;">
        <div style="display:flex; align-items:center; justify-content:space-between; gap:10px; flex-wrap:wrap;">
          <div>
            <b>ALA v${CFG.version}</b>
            <span style="margin-left:10px; color:#444;">Mode:</span>
            <select id="ala_mode" style="margin-left:6px;">
              <option value="DAY_START">Day Start</option>
              <option value="NORMAL">Normal</option>
            </select>
            <span style="margin-left:10px; color:#444;">Max distance:</span>
            <b style="margin-left:6px;">${CFG.maxDistance}</b>
          </div>

          <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
            <button id="ala_btn_update" class="btn">Update My Villages</button>
            <button id="ala_btn_plan" class="btn">Build Plan</button>
            <button id="ala_btn_filters" class="btn">Apply Recommended Filters</button>
            <button id="ala_btn_run" class="btn">Start/Stop (T)</button>
          </div>
        </div>

        <div style="margin-top:8px; display:flex; gap:18px; flex-wrap:wrap;">
          <div>
            <div style="font-weight:bold; margin-bottom:4px;">Day Start Units (saved)</div>
            <label>LC: <input id="ala_day_lc" type="number" min="5" style="width:70px;"></label>
            <label style="margin-left:10px;">Scout: <input id="ala_day_spy" type="number" min="1" style="width:70px;"></label>
            <button id="ala_btn_save_units" class="btn" style="margin-left:10px;">Save</button>
          </div>

          <div>
            <div><b>Status:</b> <span id="ala_status">Ready</span></div>
            <div><b>Planned:</b> <span id="ala_planned">0</span> | <b>Done:</b> <span id="ala_done">0</span></div>
          </div>
        </div>

        <div style="margin-top:10px;">
          <div style="font-weight:bold; margin-bottom:4px;">Plan Table (nearest village, distance, action)</div>
          <div id="ala_plan_wrap" style="max-height:240px; overflow:auto; background:#fff; border:1px solid #c9b27c;"></div>
        </div>

        <div style="margin-top:10px; display:flex; gap:12px; flex-wrap:wrap;">
          <div style="flex:1; min-width:320px;">
            <div style="font-weight:bold; margin-bottom:4px;">Clear Wall List (wall > 1)</div>
            <textarea id="ala_clearwall" rows="4" style="width:100%;"></textarea>
          </div>
          <div style="flex:1; min-width:320px;">
            <div style="font-weight:bold; margin-bottom:4px;">Notes</div>
            <div style="color:#333; font-size:12px; line-height:1.4;">
              - HARD: distance > ${CFG.maxDistance} is skipped (no send).<br>
              - Always at least ${CFG.minLC} LC + ${CFG.minScout} scout.<br>
              - Normal mode uses stability (last ${CFG.historyWindowHours}h) to decide C or fallback A.<br>
              - If bot protection appears, script pauses; solve manually then press <b>T</b> to resume.
            </div>
          </div>
        </div>
      </div>
    `;

    // Insert near top of content
    const $anchor = $("#contentContainer h3").first();
    if ($anchor.length) $anchor.after(html);
    else $("#contentContainer").prepend(html);

    // set UI values
    $("#ala_mode").val(state.mode || "NORMAL");
    $("#ala_day_lc").val(settings.dayStartLC);
    $("#ala_day_spy").val(settings.dayStartScout);

    $("#ala_planned").text(String((planData.plan || []).length));
    $("#ala_done").text(String(state.idx || 0));
    $("#ala_clearwall").val((clearWall || []).map(x => x.coordText).join("\n"));

    renderPlanTable();

    // handlers
    $("#ala_btn_save_units").on("click", () => {
      settings.dayStartLC = safeParseInt($("#ala_day_lc").val(), 5);
      settings.dayStartScout = safeParseInt($("#ala_day_spy").val(), 1);
      normalizeSettings();
      saveLS(KEY_SETTINGS, settings);
      toast("ALA: Day Start units saved.");
    });

    $("#ala_btn_filters").on("click", () => {
      // Best-effort: make list useful for current village raiding
      // (You can still change manually; plan will follow what is shown.)
      const $all = $("#all_village_checkbox");       // show only attacks from this village
      const $att = $("#attacked_checkbox");          // include currently attacking
      const $full = $("#full_losses_checkbox");      // include full losses
      const $part = $("#partial_losses_checkbox");   // include partial losses
      const $hauls = $("#full_hauls_checkbox");      // only full carrying capacity

      if ($all.length && !$all.prop("checked")) $all.trigger("click");
      if ($att.length && !$att.prop("checked")) $att.trigger("click");
      if ($full.length && $full.prop("checked")) $full.trigger("click");
      if ($part.length && !$part.prop("checked")) $part.trigger("click");
      if ($hauls.length && $hauls.prop("checked")) $hauls.trigger("click");

      toast("ALA: Recommended filters applied (best-effort). Rebuild plan if list changed.");
      $("#ala_status").text("Filters applied. If rows changed, click Build Plan.");
    });

    $("#ala_btn_update").on("click", async () => {
      try {
        $("#ala_status").text("Fetching villages (overview units)...");
        myVillages = await fetchMyVillagesHere();
        saveLS(KEY_VILLAGES, myVillages);
        $("#ala_status").text(`My villages updated: ${myVillages.length}`);
        toast("ALA: Villages updated.");
      } catch (e) {
        console.error(e);
        $("#ala_status").text("Error fetching villages.");
        alert("ALA error: " + String(e.message || e));
      }
    });

    $("#ala_btn_plan").on("click", () => {
      try {
        state.mode = $("#ala_mode").val() || "NORMAL";
        const targets = readTargetsFromDOM();

        if (!myVillages || !myVillages.length) myVillages = loadLS(KEY_VILLAGES, null);
        if (!myVillages || !myVillages.length) {
          alert("ALA: Click 'Update My Villages' first.");
          return;
        }

        // Update history snapshot from current visible reports (helps stability over time)
        snapshotHistoryFromTargets(targets);

        const built = buildPlan({ mode: state.mode, targets, myVillages });
        planData = { plan: built.plan };
        clearWall = built.clearWall;

        state.idx = 0;
        state.running = false;
        state.lastFire = 0;
        state.pausedReason = null;

        saveAll();

        $("#ala_planned").text(String(planData.plan.length));
        $("#ala_done").text("0");
        $("#ala_clearwall").val((clearWall || []).map(x => x.coordText).join("\n"));
        $("#ala_status").text(`Plan ready (${planData.plan.length}). Press T to start.`);
        renderPlanTable();

        toast("ALA: Plan built.");
      } catch (e) {
        console.error(e);
        alert("ALA plan error: " + String(e.message || e));
      }
    });

    $("#ala_btn_run").on("click", () => toggleRun("button"));

    // Hotkey T toggle
    $(document).on("keydown.ala", (ev) => {
      const tag = (ev.target && ev.target.tagName) ? ev.target.tagName.toLowerCase() : "";
      if (tag === "input" || tag === "textarea" || tag === "select") return;

      if (String(ev.key).toLowerCase() === "t") {
        ev.preventDefault();
        toggleRun("hotkey");
      }
    });

    $("#ala_status").text("Ready. Update villages → Build plan → press T.");
    toast(`ALA loaded v${CFG.version}`);
  }

  function renderPlanTable() {
    const plan = (planData && planData.plan) ? planData.plan : [];
    if (!plan.length) {
      $("#ala_plan_wrap").html("<div style='padding:8px;'>No plan yet.</div>");
      return;
    }

    let out = `<table class="vis" style="width:100%; border-collapse:collapse;">
      <tr>
        <th>#</th><th>From</th><th>Target</th><th>Dist</th><th>Wall</th><th>Loot</th><th>Action</th>
      </tr>`;

    for (let i = 0; i < Math.min(plan.length, 300); i++) {
      const p = plan[i];
      out += `<tr>
        <td>${i + 1}</td>
        <td>${p.sourceVillageId}</td>
        <td>${p.targetKey}</td>
        <td>${p.distance.toFixed(2)}</td>
        <td>${p.wall ?? ""}</td>
        <td>${p.lootTotal ?? ""}</td>
        <td>${p.action}${p.factor ? " (" + Math.round(p.factor * 100) + "%)" : ""}</td>
      </tr>`;
    }

    out += `</table>`;
    if (plan.length > 300) out += `<div style="padding:6px; font-size:12px; color:#555;">Showing first 300 / ${plan.length}</div>`;
    $("#ala_plan_wrap").html(out);
  }

  // ---------------------------
  // Read targets from Loot Assistant DOM (what you SEE = what we plan)
  // ---------------------------
  function readTargetsFromDOM() {
    const targets = [];

    $("#plunder_list tr").each(function () {
      const $tr = $(this);
      const txt = $tr.text();

      const coord = parseCoord(txt);
      if (!coord) return;

      const key = `${coord.x}|${coord.y}`;

      // reportId from "view=xxxx"
      let reportId = null;
      const href = $tr.find("a[href*='view=']").attr("href") || "";
      const rep = href.match(/view=(\d+)/);
      if (rep) reportId = parseInt(rep[1], 10);

      // From C button onclick: sendUnitsFromReport(this, targetVillageId, reportId, ...)
      let targetVillageId = null;
      const $c = $tr.find(".farm_icon_c").first();
      if ($c.length) {
        const onC = $c.attr("onclick") || "";
        const m = onC.match(/sendUnitsFromReport\([^,]+,\s*(\d+)\s*,\s*(\d+)\s*,/);
        if (m) {
          targetVillageId = parseInt(m[1], 10);
          // reportId in onclick is usually the same; prefer onclick if present
          reportId = parseInt(m[2], 10);
        }
      }

      // Loot (best-effort) from resource icons
      const loot = parseLootFromRow($tr);
      const lootTotal = loot.wood + loot.stone + loot.iron;

      // Wall (best-effort): find the cell after resource cell, first integer 0..20
      const wall = parseWallFromRow($tr);

      targets.push({
        key,
        coord,
        reportId,
        targetVillageId,
        wood: loot.wood, stone: loot.stone, iron: loot.iron,
        lootTotal: lootTotal > 0 ? lootTotal : null,
        wall: (wall !== null && wall !== undefined) ? wall : null
      });
    });

    return targets;
  }

  function parseLootFromRow($tr) {
    // looks like: <span class="icon header wood"> ... </span><span class="warn">4.097</span>
    function valFor(cls) {
      const $icon = $tr.find(`span.icon.header.${cls}`).first();
      if (!$icon.length) return 0;
      const t = $icon.parent().text();
      return safeParseInt(t, 0);
    }
    const wood = valFor("wood");
    const stone = valFor("stone");
    const iron = valFor("iron");
    return { wood, stone, iron };
  }

  function parseWallFromRow($tr) {
    try {
      const $woodIcon = $tr.find("span.icon.header.wood").first();
      if ($woodIcon.length) {
        const $td = $woodIcon.closest("td");
        const $after = $td.nextAll("td");
        let wall = null;
        $after.each(function () {
          const t = $(this).text().trim();
          if (/^\d+$/.test(t)) {
            const n = parseInt(t, 10);
            if (n >= 0 && n <= 20) { wall = n; return false; }
          }
        });
        return wall;
      }

      // fallback: any td with 0..20
      let wall2 = null;
      $tr.find("td").each(function () {
        const t = $(this).text().trim();
        if (/^\d+$/.test(t)) {
          const n = parseInt(t, 10);
          if (n >= 0 && n <= 20) { wall2 = n; return false; }
        }
      });
      return wall2;
    } catch (e) {
      return null;
    }
  }

  // ---------------------------
  // Fetch my villages + units from overview_villages&mode=units&type=there (Here)
  // ---------------------------
  async function fetchMyVillagesHere() {
    // Use TribalWars.buildURL if present (more stable)
    const url = (W.TribalWars && typeof W.TribalWars.buildURL === "function")
      ? W.TribalWars.buildURL("GET", "overview_villages", { mode: "units", type: "there" })
      : `/game.php?village=${getCurrentVillageId()}&screen=overview_villages&mode=units&type=there`;

    const html = await $.get(url);
    const doc = $.parseHTML(html);
    const $doc = $(doc);

    // Find table with many unit icons (units table)
    let $table = null;
    $doc.find("table#units_table, table.vis.overview_table").each(function () {
      const $t = $(this);
      if ($t.find("img").length >= 5 && $t.text().toLowerCase().includes("village")) {
        $table = $t;
        return false;
      }
    });
    if (!$table) throw new Error("ALA: Could not find units table on overview_villages.");

    // Identify header indices for spy + light by icon src
    const $hdr = $table.find("tr").first().children();
    let lightIdx = -1, spyIdx = -1;

    $hdr.each(function (i) {
      const $th = $(this);
      const src = ($th.find("img").attr("src") || "").toLowerCase();
      if (src.includes("unit_light")) lightIdx = i;
      if (src.includes("unit_spy")) spyIdx = i;
    });

    if (lightIdx < 0 || spyIdx < 0) {
      throw new Error("ALA: Could not detect light/spy columns in units table.");
    }

    const villages = [];
    $table.find("tr").slice(1).each(function () {
      const $tr = $(this);
      const $vlink = $tr.find("a[href*='village=']").first();
      if (!$vlink.length) return;

      const href = $vlink.attr("href") || "";
      const vm = href.match(/village=(\d+)/);
      if (!vm) return;

      const id = parseInt(vm[1], 10);
      const nameText = $vlink.text();
      const coord = parseCoord(nameText);
      if (!coord) return;

      const tds = $tr.children("td");
      const light = safeParseInt(tds.eq(lightIdx).text(), 0);
      const spy = safeParseInt(tds.eq(spyIdx).text(), 0);

      villages.push({ id, name: nameText.trim(), coord, light, spy });
    });

    return villages;
  }

  // ---------------------------
  // Stability logic (Normal mode): robust CV (median + MAD)
  // ---------------------------
  function stabilityDecision(list) {
    // list: [{ts, lootTotal, reportId}]
    const recent = (list || []).filter(x => (now() - x.ts) <= hours(CFG.historyWindowHours) && (x.lootTotal || 0) > 0);
    if (recent.length < 2) return { level: "weak", factor: null };

    const vals = recent.map(x => x.lootTotal).sort((a, b) => a - b);
    const med = median(vals);
    if (med <= 0) return { level: "weak", factor: null };

    const absDev = vals.map(v => Math.abs(v - med)).sort((a, b) => a - b);
    const mad = median(absDev);
    const robustSigma = 1.4826 * mad; // approx std
    const robustCv = robustSigma / med;

    if (robustCv <= CFG.strongCv) return { level: "strong", factor: 1.0 };
    if (robustCv <= CFG.mediumCv) return { level: "medium", factor: CFG.mediumFactor };
    return { level: "weak", factor: null };
  }

  function median(arr) {
    if (!arr.length) return 0;
    const mid = Math.floor(arr.length / 2);
    if (arr.length % 2) return arr[mid];
    return (arr[mid - 1] + arr[mid]) / 2;
  }

  function snapshotHistoryFromTargets(targets) {
    const h = history || {};
    const tnow = now();
    for (const t of targets) {
      if (!t || !t.key || !t.lootTotal) continue;
      if (!h[t.key]) h[t.key] = [];
      // avoid duplicates by reportId
      const exists = (t.reportId && h[t.key].some(x => x.reportId === t.reportId));
      if (!exists) {
        h[t.key].push({ ts: tnow, lootTotal: t.lootTotal, reportId: t.reportId || null });
        // keep last ~20 per target
        if (h[t.key].length > 20) h[t.key] = h[t.key].slice(-20);
      }
    }
    history = h;
    saveLS(KEY_HISTORY, history);
  }

  // ---------------------------
  // Build plan: choose nearest my village, apply wall+distance rules, decide action
  // ---------------------------
  function buildPlan({ mode, targets, myVillages }) {
    const plan = [];
    const clearWallOut = [];

    const hist = history || {};

    for (const t of targets) {
      if (!t || !t.coord) continue;

      // Wall rule
      if (t.wall !== null && t.wall > 1) {
        clearWallOut.push({ key: t.key, coordText: `(${t.coord.x}|${t.coord.y}) wall=${t.wall}` });
        continue;
      }

      // pick nearest village within maxDistance AND with minimum units
      let best = null;
      for (const v of myVillages) {
        if (!v || !v.coord) continue;
        const d = dist(v.coord, t.coord);
        if (d > CFG.maxDistance) continue;

        // must have at least minimal LC+spy to be useful at all
        if ((v.light || 0) < CFG.minLC || (v.spy || 0) < CFG.minScout) continue;

        if (!best || d < best.distance) best = { villageId: v.id, distance: d };
      }
      if (!best) continue; // HARD skip if no suitable village in range

      if (mode === "DAY_START") {
        plan.push({
          mode,
          sourceVillageId: best.villageId,
          targetKey: t.key,
          targetCoord: t.coord,
          targetVillageId: t.targetVillageId || null,
          reportId: t.reportId || null,
          wall: t.wall,
          lootTotal: t.lootTotal,
          distance: best.distance,
          action: "REPORT_FIXED" // fixed LC+Scout from settings (via C if possible)
        });
        continue;
      }

      // NORMAL mode: stability decides whether we can use C (scaled or full) or fallback A
      const list = (hist[t.key] || []).filter(x => (now() - x.ts) <= hours(CFG.historyWindowHours));
      const stab = stabilityDecision(list);

      if ((t.reportId && t.targetVillageId) && (stab.level === "strong" || stab.level === "medium")) {
        plan.push({
          mode,
          sourceVillageId: best.villageId,
          targetKey: t.key,
          targetCoord: t.coord,
          targetVillageId: t.targetVillageId,
          reportId: t.reportId,
          wall: t.wall,
          lootTotal: t.lootTotal,
          distance: best.distance,
          action: "REPORT_SCALED",
          factor: stab.factor
        });
      } else {
        plan.push({
          mode,
          sourceVillageId: best.villageId,
          targetKey: t.key,
          targetCoord: t.coord,
          targetVillageId: t.targetVillageId || null,
          reportId: t.reportId || null,
          wall: t.wall,
          lootTotal: t.lootTotal,
          distance: best.distance,
          action: "TEMPLATE_A" // HARD fallback: click A
        });
      }
    }

    // Group by source village then by distance
    plan.sort((a, b) => {
      if (a.sourceVillageId !== b.sourceVillageId) return a.sourceVillageId - b.sourceVillageId;
      if (a.distance !== b.distance) return a.distance - b.distance;
      return (b.lootTotal || 0) - (a.lootTotal || 0);
    });

    return { plan, clearWall: clearWallOut };
  }

  // ---------------------------
  // Execution helpers
  // ---------------------------
  function rowForTargetKey(targetKey) {
    const [x, y] = String(targetKey).split("|");
    if (!x || !y) return null;

    let found = null;
    $("#plunder_list tr").each(function () {
      const $tr = $(this);
      const t = $tr.text();
      if (t.includes(`(${x}|${y})`)) { found = $tr; return false; }
    });
    return found;
  }

  function safeClickFarmButton($row, letter) {
    // user requirement: fallback always Template A -> keep this logic
    const cls = letter === "A" ? ".farm_icon_a" : letter === "B" ? ".farm_icon_b" : ".farm_icon_c";
    const $btn = $row.find(cls).first();
    if (!$btn.length) return false;
    if ($btn.hasClass("farm_icon_disabled")) return false;
    $btn.trigger("click");
    return true;
  }

  // send using C forecast with custom units
  function sendFromReportWithForecast($row, desiredLc, desiredScout) {
    const $c = $row.find(".farm_icon_c").first();
    if (!$c.length || $c.hasClass("farm_icon_disabled")) return false;

    const onC = $c.attr("onclick") || "";
    // sendUnitsFromReport(this, targetVillageId, reportId, units_forecast)
    const m = onC.match(/sendUnitsFromReport\([^,]+,\s*(\d+)\s*,\s*(\d+)\s*,/);
    if (!m) return false;

    const targetVillageId = parseInt(m[1], 10);
    const reportId = parseInt(m[2], 10);

    const forecast = $c.data("units-forecast");
    if (!forecast || !reportId || !targetVillageId) return false;

    const lc = Math.max(CFG.minLC, safeParseInt(desiredLc, CFG.minLC));
    const sc = Math.max(CFG.minScout, safeParseInt(desiredScout, CFG.minScout));

    const f2 = Object.assign({}, forecast);
    f2.light = lc;
    f2.spy = sc;

    // IMPORTANT: 2nd param must be targetVillageId (not current village id)
    const ok = W.Accountmanager.farm.sendUnitsFromReport($c[0], targetVillageId, reportId, f2);
    return !!ok;
  }

  function sendScaledReport($row, factor) {
    const $c = $row.find(".farm_icon_c").first();
    if (!$c.length || $c.hasClass("farm_icon_disabled")) return false;

    const forecast = $c.data("units-forecast");
    if (!forecast) return false;

    const baseLc = safeParseInt(forecast.light, 0);
    if (baseLc <= 0) return false;

    let lc = Math.ceil(baseLc * (factor || 1.0));
    lc = Math.max(lc, CFG.minLC);
    return sendFromReportWithForecast($row, lc, 1);
  }

  // ---------------------------
  // Soft switch village (no full reload) - zecar/ntoombs style
  // ---------------------------
  async function switchToVillage(villageId) {
    state.switching = true;
    saveLS(KEY_STATE, state);

    try {
      toast(`ALA: switching to village ${villageId}...`, 800);

      const url = `/game.php?village=${villageId}&screen=am_farm`;
      const html = await $.ajax({ type: "GET", url, dataType: "html" });

      // title
      const titleM = /<\s*title\s*>([^<]+)<\/title\s*>/i.exec(html);
      if (titleM && titleM[1]) $("head").find("title").html(titleM[1]);

      // game_data update
      if (String(html).includes("TribalWars.updateGameData(")) {
        const jsonStr = html.split("TribalWars.updateGameData(")[1].split(");")[0];
        const newGameData = $.parseJSON(jsonStr);
        W.game_data = newGameData;
      }

      const $v = $(html);

      // replace main parts
      if ($("#header_info").length) $("#header_info").html($v.find("#header_info").html());
      if ($("#topContainer").length) $("#topContainer").html($v.find("#topContainer").html());
      if ($("#contentContainer").length) $("#contentContainer").html($v.find("#contentContainer").html());
      if ($("#quickbar_inner").length) $("#quickbar_inner").html($v.find("#quickbar_inner").html());

      // update URL without reload (best-effort)
      try {
        if (typeof history !== "undefined" && typeof history.pushState === "function" && W.game_data && W.game_data.link_base_pure) {
          history.pushState({}, (W.game_data.village ? W.game_data.village.name : "Village") + " - Loot Assistant",
            "https://" + W.location.host + W.game_data.link_base_pure + "am_farm");
        }
      } catch (e) {}

      // re-init farm assistant
      try { W.Accountmanager && W.Accountmanager.farm && W.Accountmanager.farm.init && W.Accountmanager.farm.init(); } catch (e) {}
      try { W.Accountmanager && W.Accountmanager.initTooltips && W.Accountmanager.initTooltips(); } catch (e) {}

      // remount our UI on the new DOM
      setTimeout(() => { mountUI(); }, 30);
    } catch (e) {
      console.error(e);
      alert("ALA: switch error: " + String(e.message || e));
      // If switch fails, we stop running to avoid confusion
      state.running = false;
    } finally {
      state.switching = false;
      saveLS(KEY_STATE, state);
    }
  }

  // ---------------------------
  // Runner loop (2 attacks/sec max)
  // ---------------------------
  let intervalId = null;
  let inFlight = false;

  $(document).ajaxComplete(function () {
    if (inFlight) inFlight = false;
  });

  function toggleRun(source) {
    if (isBotProtectionActive()) {
      state.running = false;
      state.pausedReason = "Bot protection active (solve manually)";
      saveLS(KEY_STATE, state);
      $("#ala_status").text(`Paused: ${state.pausedReason}`);
      toast("ALA paused: solve bot protection, then press T.", 2500);
      return;
    }

    state.running = !state.running;
    state.pausedReason = null;
    saveLS(KEY_STATE, state);

    if (state.running) {
      $("#ala_status").text("Running... (press T to stop)");
      toast("ALA: running");
      ensureInterval();
    } else {
      $("#ala_status").text("Stopped.");
      toast("ALA: stopped");
    }
  }

  function ensureInterval() {
    if (intervalId) return;
    intervalId = W.setInterval(tick, CFG.tickMs);
  }

  function stopInterval() {
    if (!intervalId) return;
    W.clearInterval(intervalId);
    intervalId = null;
  }

  function tick() {
    if (!state.running) return;
    if (!isOnFarm()) return;
    if (state.switching) return;

    if (isBotProtectionActive()) {
      state.running = false;
      state.pausedReason = "Bot protection active (solve manually)";
      saveAll();
      $("#ala_status").text(`Paused: ${state.pausedReason}`);
      return;
    }

    const plan = (planData && planData.plan) ? planData.plan : [];
    if (!plan.length) {
      state.running = false;
      saveLS(KEY_STATE, state);
      $("#ala_status").text("No plan. Build Plan first.");
      return;
    }
    if (state.idx >= plan.length) {
      state.running = false;
      saveLS(KEY_STATE, state);
      $("#ala_status").text("Done. Plan finished.");
      toast("ALA: plan finished");
      return;
    }

    // Rate limit: <= 2/sec
    const minDelay = Math.ceil(1000 / CFG.maxRatePerSecond);
    if (now() - state.lastFire < minDelay) return;

    if (inFlight) return; // wait for ajax

    const step = plan[state.idx];
    const curVid = getCurrentVillageId();
    if (!curVid) return;

    // Need to be in correct source village
    if (step.sourceVillageId !== curVid) {
      // soft switch (no reload)
      switchToVillage(step.sourceVillageId);
      return;
    }

    const $row = rowForTargetKey(step.targetKey);
    if (!$row || !$row.length) {
      // row not visible (filters/paging changed) -> skip
      state.idx++;
      $("#ala_done").text(String(state.idx));
      saveLS(KEY_STATE, state);
      return;
    }

    // Execute action
    let ok = false;

    if (step.mode === "DAY_START") {
      // Use C if possible (custom fixed), else fallback A
      ok = sendFromReportWithForecast($row, settings.dayStartLC, settings.dayStartScout);
      if (!ok) ok = safeClickFarmButton($row, "A");
    } else {
      if (step.action === "REPORT_SCALED") {
        ok = sendScaledReport($row, step.factor || 1.0);
        if (!ok) ok = safeClickFarmButton($row, "A"); // HARD fallback to A
      } else {
        // HARD fallback to A
        ok = safeClickFarmButton($row, "A");
      }
    }

    // If click/send succeeded, advance
    if (ok) {
      inFlight = true;
      state.lastFire = now();
      state.idx++;
      $("#ala_done").text(String(state.idx));
      saveLS(KEY_STATE, state);

      // optional: hide the row to show progress
      try { $row.css("opacity", 0.35); } catch (e) {}
    } else {
      // Could not send (disabled / not enough units) -> skip this one
      state.idx++;
      $("#ala_done").text(String(state.idx));
      saveLS(KEY_STATE, state);
    }
  }

  // ---------------------------
  // Public destroy (for reload)
  // ---------------------------
  ALA.destroy = function () {
    try { stopInterval(); } catch (e) {}
    try { removeUI(); } catch (e) {}
  };

  // ---------------------------
  // Boot
  // ---------------------------
  function boot() {
    if (!W.game_data || !W.$) {
      setTimeout(boot, 100);
      return;
    }
    if (!isOnFarm()) {
      toast("ALA: open Loot Assistant (am_farm) then click ALA again.", 2500);
      return;
    }
    mountUI();
    // If state was running (rare), we keep stopped by default for safety
    state.running = false;
    saveLS(KEY_STATE, state);
    ensureInterval();
  }

  boot();
})();
