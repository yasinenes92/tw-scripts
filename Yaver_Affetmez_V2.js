// ==UserScript==
// @name         Yaver Affetmez V2 (FAST) — Scout Missing LA
// @namespace    controleng
// @version      2.0.0
// @description  Finds barbarian villages around ALL villages with spies, diffs vs Loot Assistant, and FAST-sends 1 spy using place ajax flow (no new tabs).
// ==/UserScript==

(() => {
  "use strict";

  const KEY = "__YAVER_AFFETMEZ_FAST__";
  if (window[KEY]?.destroy) {
    try { window[KEY].destroy(); } catch (e) {}
  }

  const Y = (window[KEY] = {});
  const $ = window.jQuery;
  if (!$ || !window.TribalWars || !window.game_data) {
    alert("Yaver Affetmez: Bu script için jQuery + TribalWars + game_data gerekli.");
    return;
  }

  // =========================
  // CONFIG / STATE
  // =========================
  Y.CFG = {
    PANEL_ID: "yaver_affetmez_panel",
    STYLE_ID: "yaver_affetmez_style",

    CACHE_VILLAGE_TTL_MS: 6 * 60 * 60 * 1000, // 6h
    OUTER_RADIUS: 15,
    INNER_RADIUS: 0,
    MIN_POINTS: 0,
    MAX_POINTS: 999999,
    MAX_TARGETS: 250,

    // Request pacing
    FETCH_DELAY_MS: 250,          // generic fetch delay
    AUTO_INTERVAL_MS: 300,        // min delay between sends when holding Enter

    // Sending
    UNIT: "spy",
    UNIT_COUNT: 1,

    // UI
    MAX_TABLE_ROWS: 400,
  };

  Y.state = {
    busy: false,
    stop: false,
    auto: false,
    autoTimer: null,

    // planning
    spyVillages: [],   // [{id,name,x,y,spy}]
    laCoords: new Set(),
    candidates: [],    // [{x,y,coord,points}]
    queue: [],         // [{coord,x,y,points,assigned:{id,name,x,y},dist,etaText,status,ok}]
    cache: { villageTxt: null, villageTxtAt: 0, worldConfig: null, unitInfo: null },
  };

  // =========================
  // SMALL UTILS
  // =========================
  const clampInt = (v, d) => {
    const n = parseInt(v, 10);
    return Number.isFinite(n) ? n : d;
  };
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const parseHTML = (html) => new DOMParser().parseFromString(html, "text/html");
  const dist = (x1, y1, x2, y2) => Math.hypot(x1 - x2, y1 - y2);
  const coordKey = (x, y) => `${x}|${y}`;
  const parseCoordKey = (k) => {
    const m = String(k).match(/(\d{1,3})\|(\d{1,3})/);
    return m ? { x: parseInt(m[1], 10), y: parseInt(m[2], 10) } : null;
  };

  function fmtHMS(sec) {
    if (!sec || sec <= 0) return "—";
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = Math.floor(sec % 60);
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  }

  function setStatus(text) {
    $("#y_a_runstatus").text(text);
  }

  function setCounts() {
    $("#y_a_cnt_spy").text(Y.state.spyVillages.length);
    $("#y_a_cnt_la").text(Y.state.laCoords.size);
    $("#y_a_cnt_cand").text(Y.state.candidates.length);
    $("#y_a_cnt_queue").text(Y.state.queue.length);
  }

  function isTypingContext(e) {
    const t = (e?.target?.tagName || "").toLowerCase();
    if (t === "input" || t === "textarea" || t === "select") return true;
    if ($(e?.target).closest(`#${Y.CFG.PANEL_ID} input, #${Y.CFG.PANEL_ID} textarea, #${Y.CFG.PANEL_ID} select`).length) return true;
    return false;
  }

  // =========================
  // GAME INTERFACES (config + unit speed)
  // =========================
  async function getWorldConfig() {
    if (Y.state.cache.worldConfig) return Y.state.cache.worldConfig;
    const xml = await $.get("/interface.php?func=get_config");
    const doc = new DOMParser().parseFromString(xml, "text/xml");
    const speed = parseFloat(doc.querySelector("speed")?.textContent || "1") || 1;
    const unit_speed = parseFloat(doc.querySelector("unit_speed")?.textContent || "1") || 1;
    Y.state.cache.worldConfig = { speed, unit_speed };
    return Y.state.cache.worldConfig;
  }

  async function getUnitInfo() {
    if (Y.state.cache.unitInfo) return Y.state.cache.unitInfo;
    const xml = await $.get("/interface.php?func=get_unit_info");
    const doc = new DOMParser().parseFromString(xml, "text/xml");
    const spySpeedMin =
      parseFloat(doc.querySelector("spy speed")?.textContent || "") ||
      parseFloat(doc.querySelector("unit > spy > speed")?.textContent || "") ||
      null;
    Y.state.cache.unitInfo = { spySpeedMin };
    return Y.state.cache.unitInfo;
  }

  async function estimateSpySeconds(fields) {
    const cfg = await getWorldConfig();
    const ui = await getUnitInfo();
    const baseMin = ui.spySpeedMin != null ? ui.spySpeedMin : 9; // fallback
    const sec = (fields * baseMin * 60) / (cfg.speed * cfg.unit_speed);
    return sec;
  }

  // =========================
  // FETCH: village.txt cache
  // =========================
  async function fetchVillageTxtCached() {
    const now = Date.now();
    if (Y.state.cache.villageTxt && (now - Y.state.cache.villageTxtAt) < Y.CFG.CACHE_VILLAGE_TTL_MS) {
      return Y.state.cache.villageTxt;
    }
    const raw = await $.get("/map/village.txt");
    Y.state.cache.villageTxt = raw;
    Y.state.cache.villageTxtAt = now;
    return raw;
  }

  // =========================
  // FETCH: spy villages (overview_villages combined)
  // =========================
  async function fetchSpyVillages() {
    const url = TribalWars.buildURL("GET", "overview_villages", { mode: "combined", group: 0, page: -1 });
    const html = await $.get(url);
    const doc = parseHTML(html);

    // robust: find absolute column index of spy in header
    const headerRow = doc.querySelector("#combined_table tr");
    const ths = headerRow ? Array.from(headerRow.querySelectorAll("th")) : [];
    let spyCol = -1;
    ths.forEach((th, i) => {
      const img = th.querySelector("img");
      const src = img?.getAttribute("src") || "";
      if (src.includes("unit_spy")) spyCol = i;
    });

    const rows = Array.from(doc.querySelectorAll("#combined_table tr.row_a, #combined_table tr.row_b, #combined_table tr.row_ax, #combined_table tr.row_bx"));
    const out = [];

    for (const tr of rows) {
      const q = tr.querySelector(".quickedit-vn");
      const lbl = tr.querySelector(".quickedit-label");
      if (!q || !lbl) continue;

      const id = parseInt(q.getAttribute("data-id") || q.dataset.id || "0", 10);
      const fullText = (lbl.textContent || "").trim();
      const c = parseCoordKey(fullText);
      if (!c || !id) continue;

      let spyCount = 0;
      if (spyCol >= 0) {
        const tds = Array.from(tr.querySelectorAll("td"));
        const td = tds[spyCol];
        const txt = (td?.textContent || "").replace(/\./g, "").trim();
        const n = parseInt(txt || "0", 10);
        spyCount = Number.isFinite(n) ? n : 0;
      }

      if (spyCount > 0) {
        out.push({
          id: String(id),
          name: (lbl.getAttribute("data-text") || "").trim() || fullText,
          x: c.x,
          y: c.y,
          spy: spyCount
        });
      }
    }

    if (!out.length) {
      const v = window.game_data.village;
      out.push({ id: String(v.id), name: v.display_name, x: parseInt(v.x,10), y: parseInt(v.y,10), spy: 9999 });
    }

    out.sort((a,b) => (b.spy - a.spy));
    return out;
  }

  // =========================
  // FETCH: Loot Assistant coords (all pages)
  // =========================
  function getMaxFarmPageFromNav(doc) {
    const links = Array.from(doc.querySelectorAll("#plunder_list_nav a.paged-nav-item[href*='Farm_page=']"));
    let max = 0;
    for (const a of links) {
      const href = a.getAttribute("href") || "";
      const m = href.match(/Farm_page=(\d+)/);
      if (m) max = Math.max(max, parseInt(m[1], 10));
    }
    return max;
  }

  function extractCoordsFromPlunderList(doc) {
    const out = [];
    doc.querySelectorAll("#plunder_list a[href*='screen=report&mode=all&view=']").forEach(a => {
      const t = (a.textContent || "").trim();
      const m = t.match(/(\d{1,3}\|\d{1,3})/);
      if (m) out.push(m[1]);
    });
    doc.querySelectorAll("#plunder_list tr[id^='village_']").forEach(tr => {
      const t = (tr.textContent || "");
      const m = t.match(/(\d{1,3}\|\d{1,3})/);
      if (m) out.push(m[1]);
    });
    return out;
  }

  async function fetchLootAssistantAllPages() {
    const delay = clampInt($("#y_a_delay").val(), Y.CFG.FETCH_DELAY_MS);

    const url0 = TribalWars.buildURL("GET", "am_farm", { order: "distance", dir: "asc" });
    const html0 = await $.get(url0);
    const doc0 = parseHTML(html0);

    const maxFarmPage = getMaxFarmPageFromNav(doc0);
    const pagesCount = maxFarmPage + 1;

    const coords = new Set();
    extractCoordsFromPlunderList(doc0).forEach(c => coords.add(c));

    for (let p = 1; p < pagesCount; p++) {
      if (Y.state.stop) break;
      setStatus(`Loot Assistant sayfaları okunuyor... (${p + 1}/${pagesCount})`);
      await sleep(delay);

      const url = TribalWars.buildURL("GET", "am_farm", { order: "distance", dir: "asc", Farm_page: p });
      const html = await $.get(url);
      const doc = parseHTML(html);
      extractCoordsFromPlunderList(doc).forEach(c => coords.add(c));
    }

    return coords;
  }

  // =========================
  // PLAN: build candidates from village.txt based on nearest spy village within radius
  // =========================
  async function buildCandidates(spyVillages) {
    const outer = clampInt($("#y_a_outer").val(), Y.CFG.OUTER_RADIUS);
    const inner = clampInt($("#y_a_inner").val(), Y.CFG.INNER_RADIUS);
    const minP = clampInt($("#y_a_minp").val(), Y.CFG.MIN_POINTS);
    const maxP = clampInt($("#y_a_maxp").val(), Y.CFG.MAX_POINTS);
    const maxTargets = clampInt($("#y_a_maxt").val(), Y.CFG.MAX_TARGETS);

    const raw = await fetchVillageTxtCached();
    const lines = raw.trim().split(/\r?\n/);

    const cand = [];
    for (const line of lines) {
      const parts = line.split(",");
      if (parts.length < 6) continue;

      const x = parseInt(parts[2], 10);
      const y = parseInt(parts[3], 10);
      const playerId = parseInt(parts[4], 10);
      const pts = parseInt(parts[5], 10);

      if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(playerId) || !Number.isFinite(pts)) continue;
      if (playerId !== 0) continue;
      if (pts < minP || pts > maxP) continue;

      let best = null;
      let bestD = Infinity;
      for (const sv of spyVillages) {
        const d = dist(x, y, sv.x, sv.y);
        if (d < bestD) { bestD = d; best = sv; }
      }
      if (!best || !Number.isFinite(bestD)) continue;
      if (bestD > outer) continue;
      if (bestD < inner) continue;

      cand.push({ x, y, coord: coordKey(x, y), points: pts, assigned: best, dist: bestD });
    }

    cand.sort((a,b) => (a.dist - b.dist) || (b.points - a.points));
    return cand.slice(0, maxTargets);
  }

  // =========================
  // ASSIGN with spy capacity
  // =========================
  function assignWithCapacity(missing, spyVillages) {
    const cap = new Map(spyVillages.map(v => [v.id, v.spy]));
    const byId = new Map(spyVillages.map(v => [v.id, v]));

    const queue = [];
    for (const t of missing) {
      const ranked = spyVillages
        .map(v => ({ v, d: dist(t.x, t.y, v.x, v.y) }))
        .sort((a,b) => a.d - b.d);

      let chosen = null;
      let chosenD = null;
      for (const r of ranked) {
        const left = cap.get(r.v.id) ?? 0;
        if (left >= Y.CFG.UNIT_COUNT) {
          chosen = r.v;
          chosenD = r.d;
          cap.set(r.v.id, left - Y.CFG.UNIT_COUNT);
          break;
        }
      }

      if (!chosen) {
        queue.push({
          ...t,
          assigned: null,
          dist: null,
          etaText: "—",
          status: "Yetersiz casus",
          ok: false
        });
        continue;
      }

      queue.push({
        ...t,
        assigned: byId.get(chosen.id) || chosen,
        dist: chosenD,
        etaText: "—",
        status: "Bekliyor",
        ok: true
      });
    }

    queue.sort((a,b) => (a.ok === b.ok ? 0 : (a.ok ? -1 : 1)) || ((a.dist ?? 9999) - (b.dist ?? 9999)));
    return queue;
  }

  // =========================
  // FAST SEND: place ajax command -> confirm -> popup_command
  // =========================
  function twGet(screen, params) {
    return new Promise((resolve, reject) => {
      try { TribalWars.get(screen, params, (res) => resolve(res)); }
      catch (e) { reject(e); }
    });
  }

  function twPost(screen, params, data) {
    return new Promise((resolve, reject) => {
      try { TribalWars.post(screen, params, data, (res) => resolve(res)); }
      catch (e) { reject(e); }
    });
  }

  function buildFormDataFromDoc(doc) {
    const form = doc.querySelector("#command-data-form");
    if (!form) throw new Error("command-data-form bulunamadı.");

    const data = [];
    form.querySelectorAll("input, select, textarea").forEach(el => {
      const name = el.getAttribute("name");
      if (!name) return;

      const type = (el.getAttribute("type") || "").toLowerCase();
      if (type === "checkbox" || type === "radio") {
        if (!el.checked) return;
        data.push({ name, value: el.value });
        return;
      }
      data.push({ name, value: el.value ?? "" });
    });

    return data;
  }

  function upsert(data, name, value) {
    const idx = data.findIndex(x => x.name === name);
    if (idx >= 0) data[idx].value = String(value);
    else data.push({ name, value: String(value) });
  }

  function zeroAllUnits(data) {
    (game_data.units || []).forEach(u => upsert(data, u, "0"));
  }

  async function sendOneSpy(sourceVillageId, targetX, targetY) {
    const delay = clampInt($("#y_a_delay").val(), Y.CFG.FETCH_DELAY_MS);

    const cmd = await twGet("place", { village: sourceVillageId, ajax: "command" });
    const docCmd = parseHTML(cmd.dialog || cmd);
    let data = buildFormDataFromDoc(docCmd);

    upsert(data, "source_village", sourceVillageId);
    upsert(data, "target_type", "coord");
    upsert(data, "input", `${targetX}|${targetY}`);
    upsert(data, "x", String(targetX));
    upsert(data, "y", String(targetY));

    zeroAllUnits(data);
    upsert(data, Y.CFG.UNIT, String(Y.CFG.UNIT_COUNT));
    upsert(data, "attack", "l");

    await sleep(delay);
    const conf = await twPost("place", { village: sourceVillageId, ajax: "confirm" }, data);
    const docConf = parseHTML(conf.dialog || conf);

    const maybeBot = (docConf.body?.textContent || "").toLowerCase();
    if (maybeBot.includes("hcaptcha") || maybeBot.includes("bot protection")) {
      throw new Error("Bot protection tetiklendi. Lütfen doğrulama yapıp tekrar dene.");
    }

    const data2 = [];
    docConf.querySelectorAll("#command-data-form input, #command-data-form select, #command-data-form textarea").forEach(el => {
      const name = el.getAttribute("name");
      if (!name) return;
      const type = (el.getAttribute("type") || "").toLowerCase();
      if ((type === "checkbox" || type === "radio") && !el.checked) return;
      data2.push({ name, value: el.value ?? "" });
    });

    await sleep(delay);
    const sent = await twPost("place", { village: sourceVillageId, ajaxaction: "popup_command" }, data2);

    return sent?.message || "OK";
  }

  // =========================
  // UI: panel + tooltips
  // =========================
  function ensurePanel() {
    if (document.getElementById(Y.CFG.PANEL_ID)) return;

    const style = document.createElement("style");
    style.id = Y.CFG.STYLE_ID;
    style.textContent = `
      #${Y.CFG.PANEL_ID}{
        position: fixed; top: 60px; left: 20px; width: 1020px;
        max-height: 90vh; overflow:auto;
        background: #f4e4bc; border: 3px solid #7d510f;
        z-index: 99999; border-radius: 8px;
        font-family: Verdana, Arial; font-size: 12px; color: #333;
        box-shadow: 0 0 15px rgba(0,0,0,.45);
      }
      #${Y.CFG.PANEL_ID} .hdr{
        background:#c1a264; padding:10px; border-bottom:1px solid #7d510f;
        display:flex; justify-content:space-between; align-items:center;
        position:sticky; top:0; z-index:2;
      }
      #${Y.CFG.PANEL_ID} .hdr b{ font-size:14px; }
      #${Y.CFG.PANEL_ID} .btn{ cursor:pointer; padding:5px 10px; border-radius:4px; border:1px solid #333; font-weight:700; }
      #${Y.CFG.PANEL_ID} .btn-green{ background:#238c00; color:#fff; }
      #${Y.CFG.PANEL_ID} .btn-gray{ background:#666; color:#fff; }
      #${Y.CFG.PANEL_ID} .btn-red{ background:#a60000; color:#fff; }
      #${Y.CFG.PANEL_ID} .content{ padding:10px; }
      #${Y.CFG.PANEL_ID} .row{ display:flex; gap:10px; flex-wrap:wrap; align-items:center; margin-bottom:8px; }
      #${Y.CFG.PANEL_ID} .pill{ display:inline-block; padding:2px 6px; background:rgba(0,0,0,.08); border-radius:4px; }
      #${Y.CFG.PANEL_ID} input{ width:70px; padding:3px 4px; }
      #${Y.CFG.PANEL_ID} table{ width:100%; border-collapse:collapse; background:rgba(255,255,255,.25); }
      #${Y.CFG.PANEL_ID} th{ background:#a68448; color:#fff; padding:6px; text-align:left; position:sticky; top:48px; z-index:1; }
      #${Y.CFG.PANEL_ID} td{ border-bottom:1px solid #d0c1a0; padding:5px 6px; }
      #${Y.CFG.PANEL_ID} tr:hover td{ background: rgba(255,255,255,.35); }
      .y_ok{ color:#1b7d12; font-weight:700; }
      .y_bad{ color:#b00000; font-weight:700; }
      .y_muted{ opacity:.75; }
      .y_small{ font-size:11px; }
    `;
    document.head.appendChild(style);

    const el = document.createElement("div");
    el.id = Y.CFG.PANEL_ID;
    el.innerHTML = `
      <div class="hdr">
        <div>
          <b>🕵️ Yaver Affetmez — Map → Loot Assistant Diff → 1 Spy (FAST)</b>
          <span class="pill y_muted" style="margin-left:8px;" data-title="Enter basılı tutulunca sıradaki hedefe otomatik 1 casus gönderir.">Enter-hold: Auto Send</span>
        </div>
        <div style="display:flex; gap:8px; align-items:center;">
          <span class="pill"><b><i>Developed by Controleng</i></b></span>
          <button class="btn btn-red" id="y_a_close">X</button>
        </div>
      </div>

      <div class="content">
        <div class="row">
          <span class="pill" data-title="Her casus köy için, bu yarıçap içindeki barbarlar aday sayılır.">Inner: <input id="y_a_inner" value="${Y.CFG.INNER_RADIUS}"></span>
          <span class="pill" data-title="Her casus köy için, bu yarıçap içindeki barbarlar aday sayılır.">Outer: <input id="y_a_outer" value="${Y.CFG.OUTER_RADIUS}"></span>
          <span class="pill" data-title="Barbar köy puan filtresi (min).">MinP: <input id="y_a_minp" value="${Y.CFG.MIN_POINTS}"></span>
          <span class="pill" data-title="Barbar köy puan filtresi (max).">MaxP: <input id="y_a_maxp" value="${Y.CFG.MAX_POINTS}"></span>
          <span class="pill" data-title="Toplam plan hedefi (global üst sınır).">Max: <input id="y_a_maxt" value="${Y.CFG.MAX_TARGETS}"></span>
          <span class="pill" data-title="TW istek limiti için gecikme. 200–400ms güvenli.">Delay: <input id="y_a_delay" value="${Y.CFG.FETCH_DELAY_MS}"> ms</span>
        </div>

        <div class="row">
          <button class="btn btn-green" id="y_a_scan" data-title="Casus köyleri bulur → barbar adaylarını çıkarır → LA ile farkını alır → kuyruk hazırlar.">Tara + LA karşılaştır</button>
          <button class="btn btn-gray" id="y_a_send_next" data-title="Kuyruktaki sıradaki hedefe 1 casus gönderir.">Sıradakine 1 Casus</button>
          <button class="btn btn-gray" id="y_a_auto" data-title="Enter basılı tutarak otomatik gönderimi aç/kapat.">AUTO: Kapalı</button>
          <button class="btn btn-red" id="y_a_stop" data-title="Tüm işlemleri durdurur.">STOP</button>

          <span class="pill">Durum: <b id="y_a_runstatus">Hazır</b></span>
          <span class="pill">Casus köy: <b id="y_a_cnt_spy">0</b></span>
          <span class="pill">LA toplam: <b id="y_a_cnt_la">0</b></span>
          <span class="pill">Aday barbar: <b id="y_a_cnt_cand">0</b></span>
          <span class="pill">Kuyruk: <b id="y_a_cnt_queue">0</b></span>
        </div>

        <div class="pill y_small" style="margin:8px 0; width:100%; box-sizing:border-box;"
             data-title="LA filtresi: 'Include reports from villages you are currently attacking' ve 'Include reports indicating partial losses' açık olmalı.">
          Not: LA filtresi saldırılan köyleri listede tuttuğu için (attacked/partial losses), Commands kontrolü kullanılmaz.
        </div>

        <div style="max-height:58vh; overflow:auto; border:1px solid #b79b5d;">
          <table>
            <thead>
              <tr>
                <th style="width:40px;">#</th>
                <th style="width:110px;">Koord</th>
                <th style="width:70px;">Puan</th>
                <th style="width:90px;">Kaynak Köy</th>
                <th style="width:70px;">Mesafe</th>
                <th style="width:90px;">ETA (Spy)</th>
                <th style="width:170px;">Durum</th>
                <th style="width:120px;">İşlem</th>
              </tr>
            </thead>
            <tbody id="y_a_tbody">
              <tr><td colspan="8" class="y_muted">Henüz plan yok. “Tara + LA karşılaştır” ile başla.</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    `;
    document.body.appendChild(el);

    if (window.UI?.ToolTip) {
      try { UI.ToolTip($(`#${Y.CFG.PANEL_ID} [data-title]`)); } catch (e) {}
    }

    $("#y_a_close").on("click", () => Y.destroy());
    $("#y_a_stop").on("click", () => {
      Y.state.stop = true;
      setStatus("STOP");
      stopAuto();
    });
    $("#y_a_scan").on("click", () => scanAndBuild());
    $("#y_a_send_next").on("click", () => sendNext());
    $("#y_a_auto").on("click", () => toggleAuto());

    // Enter single
    $(document).on("keydown.yaverAffetmez", (e) => {
      if (e.key !== "Enter") return;
      if (isTypingContext(e)) return;
      if (!document.getElementById(Y.CFG.PANEL_ID)) return;
      if (!Y.state.auto) {
        e.preventDefault();
        sendNext();
      }
    });

    // Enter hold (auto)
    $(document).on("keydown.yaverAffetmezHold", (e) => {
      if (e.key !== "Enter") return;
      if (isTypingContext(e)) return;
      if (!document.getElementById(Y.CFG.PANEL_ID)) return;
      if (!Y.state.auto) return;

      if (Y.state.autoTimer) return;
      e.preventDefault();
      Y.state.autoTimer = setInterval(() => {
        if (Y.state.busy || Y.state.stop) return;
        if (!Y.state.queue.some(q => q.ok && q.status === "Bekliyor")) return;
        sendNext();
      }, Math.max(220, clampInt($("#y_a_delay").val(), Y.CFG.AUTO_INTERVAL_MS)));
    });

    $(document).on("keyup.yaverAffetmezHold", (e) => {
      if (e.key !== "Enter") return;
      if (!Y.state.auto) return;
      if (Y.state.autoTimer) {
        clearInterval(Y.state.autoTimer);
        Y.state.autoTimer = null;
      }
    });
  }

  function toggleAuto() {
    Y.state.auto = !Y.state.auto;
    $("#y_a_auto").text(`AUTO: ${Y.state.auto ? "Açık" : "Kapalı"}`);
    if (!Y.state.auto) stopAuto();
  }

  function stopAuto() {
    if (Y.state.autoTimer) {
      clearInterval(Y.state.autoTimer);
      Y.state.autoTimer = null;
    }
  }

  function renderTable(list) {
    const tb = document.getElementById("y_a_tbody");
    if (!tb) return;
    tb.innerHTML = "";

    if (!list.length) {
      tb.innerHTML = `<tr><td colspan="8" class="y_muted">Eksik hedef yok. (Alan içi barblar LA’da görünüyor olabilir.)</td></tr>`;
      return;
    }

    const shown = list.slice(0, Y.CFG.MAX_TABLE_ROWS);
    shown.forEach((v, idx) => {
      const tr = document.createElement("tr");
      const src = v.assigned ? `${v.assigned.x}|${v.assigned.y}` : "—";
      const distTxt = v.dist != null ? v.dist.toFixed(2) : "—";
      const cls = v.ok ? "y_ok" : "y_bad";

      tr.innerHTML = `
        <td>${idx + 1}</td>
        <td><b>${v.coord}</b></td>
        <td>${v.points ?? "—"}</td>
        <td>${src}</td>
        <td>${distTxt}</td>
        <td>${v.etaText || "—"}</td>
        <td class="${cls}">${v.status}</td>
        <td>
          <button class="btn btn-gray y_small" data-act="send" data-coord="${v.coord}" ${(!v.ok || v.status !== "Bekliyor" || Y.state.busy) ? "disabled" : ""}>Gönder</button>
        </td>
      `;
      tb.appendChild(tr);
    });

    $(`#${Y.CFG.PANEL_ID} button[data-act='send']`).off("click").on("click", async function() {
      const c = $(this).data("coord");
      await sendByCoord(c);
    });

    if (window.UI?.ToolTip) {
      try { UI.ToolTip($(`#${Y.CFG.PANEL_ID} [data-title]`)); } catch (e) {}
    }
  }

  function setRowStatus(coord, statusText, ok) {
    const rowBtn = $(`#${Y.CFG.PANEL_ID} button[data-act='send'][data-coord='${coord}']`);
    if (!rowBtn.length) return;
    const td = rowBtn.closest("tr").find("td").eq(6);
    td.text(statusText);
    td.removeClass("y_ok y_bad").addClass(ok ? "y_ok" : "y_bad");
    rowBtn.prop("disabled", true);
  }

  // =========================
  // MAIN: scan & build
  // =========================
  async function scanAndBuild() {
    if (Y.state.busy) return;
    try {
      Y.state.stop = false;
      Y.state.busy = true;
      setStatus("Casus köyler okunuyor...");
      renderTable([]);

      const spyVillages = await fetchSpyVillages();
      Y.state.spyVillages = spyVillages;

      setStatus("Loot Assistant okunuyor...");
      const la = await fetchLootAssistantAllPages();
      Y.state.laCoords = la;

      setStatus("Barbar adaylar taranıyor...");
      const cand = await buildCandidates(spyVillages);
      Y.state.candidates = cand;

      const missing = cand.filter(b => !la.has(b.coord)).map(b => ({
        x: b.x, y: b.y, coord: b.coord, points: b.points
      }));

      setStatus("Atama + ETA hesaplanıyor...");
      const queue = assignWithCapacity(missing, spyVillages);

      for (const q of queue) {
        if (Y.state.stop) break;
        if (q.ok && q.dist != null) {
          q.etaText = fmtHMS(await estimateSpySeconds(q.dist));
        } else {
          q.etaText = "—";
        }
      }

      Y.state.queue = queue;
      setCounts();
      renderTable(queue);
      setStatus("Hazır");
    } catch (e) {
      console.error(e);
      setStatus("HATA");
      alert("Hata: " + (e?.message || e));
    } finally {
      Y.state.busy = false;
      $(`#${Y.CFG.PANEL_ID} button[data-act='send'], #y_a_send_next`).prop("disabled", false);
    }
  }

  // =========================
  // SENDING: next / by coord
  // =========================
  function findNextPending() {
    return Y.state.queue.find(q => q.ok && q.status === "Bekliyor") || null;
  }

  async function sendNext() {
    const next = findNextPending();
    if (!next) {
      setStatus("Bitti");
      return;
    }
    await sendByCoord(next.coord);
  }

  async function sendByCoord(coord) {
    if (Y.state.busy) return;
    const q = Y.state.queue.find(x => x.coord === coord);
    if (!q) return;
    if (!q.ok) return;

    const p = parseCoordKey(coord);
    if (!p) return;

    const sourceId = q.assigned?.id;
    if (!sourceId) {
      setRowStatus(coord, "Kaynak yok", false);
      q.status = "Kaynak yok";
      q.ok = false;
      return;
    }

    try {
      Y.state.busy = true;
      setStatus(`Gönderiliyor: ${sourceId} → ${coord} ...`);
      setRowStatus(coord, "Gönderiliyor...", true);

      $(`#${Y.CFG.PANEL_ID} button[data-act='send'], #y_a_send_next`).prop("disabled", true);

      await sendOneSpy(sourceId, p.x, p.y);

      q.status = "Gönderildi";
      setRowStatus(coord, "Gönderildi", true);

      await sleep(Math.max(220, clampInt($("#y_a_delay").val(), Y.CFG.AUTO_INTERVAL_MS)));
      setStatus("Hazır");
    } catch (e) {
      console.error(e);
      q.status = "Hata";
      setRowStatus(coord, "Hata: " + (e?.message || e), false);
      setStatus("HATA");
    } finally {
      Y.state.busy = false;
      $(`#${Y.CFG.PANEL_ID} button[data-act='send'], #y_a_send_next`).prop("disabled", false);
    }
  }

  // =========================
  // DESTROY
  // =========================
  Y.destroy = () => {
    stopAuto();
    $(document).off(".yaverAffetmez");
    $(document).off(".yaverAffetmezHold");
    $("#" + Y.CFG.PANEL_ID).remove();
    $("#" + Y.CFG.STYLE_ID).remove();
    delete window[KEY];
  };

  // =========================
  // INIT
  // =========================
  ensurePanel();
})();
