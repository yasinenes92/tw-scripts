/* Yaver_Affetmez_V2.js  (FAST / FarmGod-style Enter send)
   - No Commands check
   - Diff vs Loot Assistant (am_farm)
   - Multi-village (all villages with spies)
   - Assign each target to nearest spy village (capacity aware)
   - Enter key sends next (hold Enter works via key-repeat)
*/
(function () {
  "use strict";

  const NS = "__YAVER_AFFETMEZ_V2__";
  if (window[NS] && window[NS].destroy) {
    try { window[NS].destroy(); } catch (e) {}
  }
  const Y = (window[NS] = {});
  const $ = window.jQuery;

  if (!$ || !window.TribalWars || !window.game_data) {
    alert("Yaver Affetmez V2: jQuery + TribalWars + game_data gerekli.");
    return;
  }

  // ========= CONFIG =========
  const CFG = {
    PANEL_ID: "yaver_affetmez_v2_panel",
    STYLE_ID: "yaver_affetmez_v2_style",

    DEFAULT_INNER: 0,
    DEFAULT_OUTER: 15,
    DEFAULT_MINP: 0,
    DEFAULT_MAXP: 999999,
    DEFAULT_MAXTARGETS: 300,

    DEFAULT_DELAY: 260,      // request pacing
    MIN_KEY_INTERVAL: 220,   // Enter spam throttle
    UNIT: "spy",
    UNIT_COUNT: 1,

    VILLAGE_TXT_TTL: 6 * 60 * 60 * 1000, // 6 hours
    PAGE_SIZE_COMBINED: 1000,            // try to get all villages in one page
  };

  // ========= STATE =========
  const S = {
    busy: false,
    stop: false,

    spyVillages: [],   // [{id,name,x,y,spy}]
    laCoords: new Set(),
    queue: [],         // [{coord,x,y,points,src:{...},dist,status,error}]
    lastKeyAt: 0,

    cache: {
      villageTxt: null,
      villageTxtAt: 0,
    }
  };

  // ========= UTILS =========
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const clampInt = (v, d) => {
    const n = parseInt(v, 10);
    return Number.isFinite(n) ? n : d;
  };
  const coordKey = (x, y) => `${x}|${y}`;
  const parseCoordFromText = (t) => {
    const m = String(t || "").match(/(\d{1,3})\|(\d{1,3})/);
    return m ? { x: parseInt(m[1], 10), y: parseInt(m[2], 10) } : null;
  };
  const dist = (x1, y1, x2, y2) => Math.hypot(x1 - x2, y1 - y2);
  const parseHTML = (html) => new DOMParser().parseFromString(html, "text/html");

  function isTypingContext(e) {
    const tag = (e?.target?.tagName || "").toLowerCase();
    if (tag === "input" || tag === "textarea" || tag === "select") return true;
    if ($(e?.target).closest(`#${CFG.PANEL_ID} input, #${CFG.PANEL_ID} textarea, #${CFG.PANEL_ID} select`).length) return true;
    return false;
  }

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

  // ========= UI =========
  function setStatus(text) { $("#ya2_status").text(text); }
  function setCounts() {
    $("#ya2_cnt_spy").text(S.spyVillages.length);
    $("#ya2_cnt_la").text(S.laCoords.size);
    $("#ya2_cnt_q").text(S.queue.length);
  }

  function renderTable() {
    const $tb = $("#ya2_tbody");
    $tb.empty();

    if (!S.queue.length) {
      $tb.append(`<tr><td colspan="8" class="ya2_muted">Liste boş. “Tara” ile başla.</td></tr>`);
      return;
    }

    S.queue.forEach((q, i) => {
      const srcTxt = q.src ? `${q.src.x}|${q.src.y}` : "—";
      const dTxt = (q.dist != null) ? q.dist.toFixed(2) : "—";
      const stCls = q.error ? "ya2_bad" : (q.status === "Bekliyor" ? "ya2_ok" : "ya2_muted");

      $tb.append(`
        <tr data-coord="${q.coord}">
          <td>${i + 1}</td>
          <td><b>${q.coord}</b></td>
          <td>${q.points ?? "—"}</td>
          <td>${srcTxt}</td>
          <td>${dTxt}</td>
          <td class="${stCls}">${q.status}</td>
          <td>${q.error ? `<span class="ya2_bad">${q.error}</span>` : ""}</td>
          <td><button class="btn btn-gray ya2_btn_send" data-coord="${q.coord}" ${q.status !== "Bekliyor" ? "disabled" : ""}>Gönder</button></td>
        </tr>
      `);
    });

    $(".ya2_btn_send").off("click").on("click", async function () {
      const coord = $(this).data("coord");
      await sendSpecific(coord);
    });
  }

  function ensurePanel() {
    if (document.getElementById(CFG.PANEL_ID)) return;

    const style = document.createElement("style");
    style.id = CFG.STYLE_ID;
    style.textContent = `
      #${CFG.PANEL_ID}{
        position:fixed; top:60px; left:20px; width:1040px;
        background:#f4e4bc; border:3px solid #7d510f; border-radius:8px;
        z-index:99999; font-family:Verdana,Arial; font-size:12px; color:#333;
        box-shadow:0 0 15px rgba(0,0,0,.45);
      }
      #${CFG.PANEL_ID} .hdr{
        background:#c1a264; padding:10px; border-bottom:1px solid #7d510f;
        display:flex; justify-content:space-between; align-items:center;
      }
      #${CFG.PANEL_ID} .hdr b{ font-size:14px; }
      #${CFG.PANEL_ID} .content{ padding:10px; }
      #${CFG.PANEL_ID} .row{ display:flex; gap:10px; flex-wrap:wrap; align-items:center; margin-bottom:8px; }
      #${CFG.PANEL_ID} .pill{ display:inline-block; padding:2px 6px; background:rgba(0,0,0,.08); border-radius:4px; }
      #${CFG.PANEL_ID} input{ width:70px; padding:3px 4px; }
      #${CFG.PANEL_ID} .btn{ cursor:pointer; padding:5px 10px; border-radius:4px; border:1px solid #333; font-weight:700; }
      #${CFG.PANEL_ID} .btn-green{ background:#238c00; color:#fff; }
      #${CFG.PANEL_ID} .btn-red{ background:#a60000; color:#fff; }
      #${CFG.PANEL_ID} .btn-gray{ background:#666; color:#fff; }
      #ya2_table_wrap{ max-height:58vh; overflow:auto; border:1px solid #b79b5d; }
      #${CFG.PANEL_ID} table{ width:100%; border-collapse:collapse; background:rgba(255,255,255,.25); }
      #${CFG.PANEL_ID} thead th{
        background:#a68448; color:#fff; padding:6px; text-align:left;
        position:sticky; top:0; z-index:3;
      }
      #${CFG.PANEL_ID} td{ border-bottom:1px solid #d0c1a0; padding:5px 6px; }
      #${CFG.PANEL_ID} tr:hover td{ background:rgba(255,255,255,.35); }
      .ya2_ok{ color:#1b7d12; font-weight:700; }
      .ya2_bad{ color:#b00000; font-weight:700; }
      .ya2_muted{ opacity:.75; }
      .ya2_small{ font-size:11px; }
    `;
    document.head.appendChild(style);

    const el = document.createElement("div");
    el.id = CFG.PANEL_ID;
    el.innerHTML = `
      <div class="hdr">
        <div>
          <b>🕵️ Yaver Affetmez V2 — LA Diff → 1 Spy (FAST)</b>
          <span class="pill ya2_muted" style="margin-left:8px;" data-title="Enter'a bastıkça sıradaki hedefe 1 casus gönderir. Enter basılı tutulursa key-repeat ile seri gönderim olur (FarmGod gibi).">Enter = Send Next</span>
        </div>
        <div style="display:flex; gap:8px; align-items:center;">
          <span class="pill"><b><i>Developed by Controleng</i></b></span>
          <button class="btn btn-red" id="ya2_close">X</button>
        </div>
      </div>

      <div class="content">
        <div class="row">
          <span class="pill" data-title="Tüm spy'lı köyler için minimum mesafe. Daha yakın barbarlar yok sayılır.">Inner <input id="ya2_inner" value="${CFG.DEFAULT_INNER}"></span>
          <span class="pill" data-title="Tüm spy'lı köyler için maksimum mesafe. Bu yarıçap dışı yok sayılır.">Outer <input id="ya2_outer" value="${CFG.DEFAULT_OUTER}"></span>
          <span class="pill" data-title="Barbar köy puanı alt sınırı.">MinP <input id="ya2_minp" value="${CFG.DEFAULT_MINP}"></span>
          <span class="pill" data-title="Barbar köy puanı üst sınırı.">MaxP <input id="ya2_maxp" value="${CFG.DEFAULT_MAXP}"></span>
          <span class="pill" data-title="Toplam liste üst sınırı (global).">Max <input id="ya2_maxt" value="${CFG.DEFAULT_MAXTARGETS}"></span>
          <span class="pill" data-title="İstekler arası gecikme. 220–350ms güvenli.">Delay <input id="ya2_delay" value="${CFG.DEFAULT_DELAY}"> ms</span>
        </div>

        <div class="row">
          <button class="btn btn-green" id="ya2_scan" data-title="Spy'lı köyleri bulur → radius içi barbarları çıkarır → LA ile karşılaştırır → listeyi hazırlar.">Tara</button>
          <button class="btn btn-gray" id="ya2_clear" data-title="Listeyi temizler.">Temizle</button>
          <button class="btn btn-red" id="ya2_stop" data-title="Tüm işlemleri durdurur.">STOP</button>

          <span class="pill">Durum: <b id="ya2_status">Hazır</b></span>
          <span class="pill">Spy köy: <b id="ya2_cnt_spy">0</b></span>
          <span class="pill">LA kayıt: <b id="ya2_cnt_la">0</b></span>
          <span class="pill">Liste: <b id="ya2_cnt_q">0</b></span>
        </div>

        <div class="pill ya2_small" style="margin:8px 0; width:100%; box-sizing:border-box;"
          data-title="Commands kontrolü yoktur. LA filtrelerin (attacked + partial losses) açık olduğu için, saldırı giden köyler LA'da görünür.">
          Not: Commands kontrolü KAPALI (tamamen kaldırıldı). LA filtreleri açık olmalı.
        </div>

        <div id="ya2_table_wrap">
          <table>
            <thead>
              <tr>
                <th style="width:40px;">#</th>
                <th style="width:110px;">Koord</th>
                <th style="width:70px;">Puan</th>
                <th style="width:100px;">Kaynak</th>
                <th style="width:70px;">Mesafe</th>
                <th style="width:120px;">Durum</th>
                <th>Hata</th>
                <th style="width:90px;">İşlem</th>
              </tr>
            </thead>
            <tbody id="ya2_tbody">
              <tr><td colspan="8" class="ya2_muted">Liste boş. “Tara” ile başla.</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    `;
    document.body.appendChild(el);

    // tooltips (game style)
    if (window.UI && UI.ToolTip) {
      try { UI.ToolTip($(`#${CFG.PANEL_ID} [data-title]`)); } catch (e) {}
    }

    $("#ya2_close").on("click", () => Y.destroy());
    $("#ya2_stop").on("click", () => { S.stop = true; setStatus("STOP"); });
    $("#ya2_clear").on("click", () => {
      S.queue = [];
      setCounts();
      renderTable();
      setStatus("Hazır");
    });
    $("#ya2_scan").on("click", () => scanBuild());
  }

  // ========= DATA: Spy villages from combined =========
  async function fetchSpyVillages() {
    // Try big page_size to avoid pagination
    const url = TribalWars.buildURL("GET", "overview_villages", {
      mode: "combined",
      group: 0,
      page_size: CFG.PAGE_SIZE_COMBINED
    });

    const html = await $.get(url);
    const doc = parseHTML(html);

    // find spy column index by header img containing unit_spy
    const header = doc.querySelector("#combined_table tr");
    const ths = header ? Array.from(header.querySelectorAll("th")) : [];
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
      if (!id) continue;

      const text = (lbl.textContent || "").trim();
      const c = parseCoordFromText(text);
      if (!c) continue;

      let spyCount = 0;
      if (spyCol >= 0) {
        const tds = Array.from(tr.querySelectorAll("td"));
        const td = tds[spyCol];
        const raw = (td?.textContent || "").replace(/\./g, "").trim();
        const n = parseInt(raw || "0", 10);
        spyCount = Number.isFinite(n) ? n : 0;
      }

      if (spyCount > 0) {
        out.push({
          id: String(id),
          name: (lbl.getAttribute("data-text") || "").trim() || text,
          x: c.x, y: c.y,
          spy: spyCount
        });
      }
    }

    // fallback: current village
    if (!out.length) {
      const v = window.game_data.village;
      out.push({ id: String(v.id), name: v.display_name, x: parseInt(v.x, 10), y: parseInt(v.y, 10), spy: 9999 });
    }

    // sort by most spies first
    out.sort((a, b) => b.spy - a.spy);
    return out;
  }

  // ========= DATA: Loot Assistant coords (all pages) =========
  function getMaxFarmPage(doc) {
    const links = Array.from(doc.querySelectorAll("#plunder_list_nav a.paged-nav-item[href*='Farm_page=']"));
    let max = 0;
    for (const a of links) {
      const href = a.getAttribute("href") || "";
      const m = href.match(/Farm_page=(\d+)/);
      if (m) max = Math.max(max, parseInt(m[1], 10));
    }
    return max;
  }

  function extractLAcoords(doc, set) {
    const rows = Array.from(doc.querySelectorAll("#plunder_list tr[id^='village_']"));
    for (const tr of rows) {
      const t = tr.textContent || "";
      const m = t.match(/(\d{1,3}\|\d{1,3})/);
      if (m) set.add(m[1]);
    }
  }

  async function fetchLAall() {
    const delay = clampInt($("#ya2_delay").val(), CFG.DEFAULT_DELAY);

    const url0 = TribalWars.buildURL("GET", "am_farm", { order: "distance", dir: "asc" });
    const html0 = await $.get(url0);
    const doc0 = parseHTML(html0);

    const maxPage = getMaxFarmPage(doc0);
    const pages = maxPage + 1;

    const set = new Set();
    extractLAcoords(doc0, set);

    for (let p = 1; p < pages; p++) {
      if (S.stop) break;
      setStatus(`LA okunuyor... (${p + 1}/${pages})`);
      await sleep(delay);

      const url = TribalWars.buildURL("GET", "am_farm", { order: "distance", dir: "asc", Farm_page: p });
      const html = await $.get(url);
      const doc = parseHTML(html);
      extractLAcoords(doc, set);
    }
    return set;
  }

  // ========= DATA: village.txt (cache) =========
  async function getVillageTxt() {
    const now = Date.now();
    if (S.cache.villageTxt && (now - S.cache.villageTxtAt) < CFG.VILLAGE_TXT_TTL) return S.cache.villageTxt;
    const raw = await $.get("/map/village.txt");
    S.cache.villageTxt = raw;
    S.cache.villageTxtAt = now;
    return raw;
  }

  // ========= PLAN: Build missing targets =========
  function computeBoundingBox(spyVillages, outer) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const v of spyVillages) {
      minX = Math.min(minX, v.x);
      minY = Math.min(minY, v.y);
      maxX = Math.max(maxX, v.x);
      maxY = Math.max(maxY, v.y);
    }
    return {
      minX: minX - outer, minY: minY - outer,
      maxX: maxX + outer, maxY: maxY + outer
    };
  }

  function assignNearestWithCapacity(targets, spyVillages) {
    // capacity by village id
    const cap = new Map(spyVillages.map(v => [v.id, v.spy]));

    // For each target, pick nearest village with remaining capacity
    const out = [];
    for (const t of targets) {
      // rank all spy villages by distance
      const ranked = spyVillages
        .map(v => ({ v, d: dist(t.x, t.y, v.x, v.y) }))
        .sort((a, b) => a.d - b.d);

      let chosen = null;
      let chosenD = null;

      for (const r of ranked) {
        const left = cap.get(r.v.id) ?? 0;
        if (left >= CFG.UNIT_COUNT) {
          chosen = r.v;
          chosenD = r.d;
          cap.set(r.v.id, left - CFG.UNIT_COUNT);
          break;
        }
      }

      if (!chosen) {
        out.push({ ...t, src: null, dist: null, status: "Atlandı", error: "Yetersiz casus" });
      } else {
        out.push({ ...t, src: chosen, dist: chosenD, status: "Bekliyor", error: "" });
      }
    }

    // put sendable ones first
    out.sort((a, b) => (a.status === "Bekliyor" ? 0 : 1) - (b.status === "Bekliyor" ? 0 : 1) || ((a.dist ?? 9999) - (b.dist ?? 9999)));
    return out;
  }

  async function buildMissingQueue(spyVillages, laCoords) {
    const inner = clampInt($("#ya2_inner").val(), CFG.DEFAULT_INNER);
    const outer = clampInt($("#ya2_outer").val(), CFG.DEFAULT_OUTER);
    const minP  = clampInt($("#ya2_minp").val(), CFG.DEFAULT_MINP);
    const maxP  = clampInt($("#ya2_maxp").val(), CFG.DEFAULT_MAXP);
    const maxT  = clampInt($("#ya2_maxt").val(), CFG.DEFAULT_MAXTARGETS);

    const raw = await getVillageTxt();
    const lines = raw.trim().split(/\r?\n/);

    const box = computeBoundingBox(spyVillages, outer);

    const candidates = [];
    for (const line of lines) {
      const p = line.split(",");
      if (p.length < 6) continue;

      const x = parseInt(p[2], 10);
      const y = parseInt(p[3], 10);
      const playerId = parseInt(p[4], 10);
      const pts = parseInt(p[5], 10);

      if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(playerId) || !Number.isFinite(pts)) continue;
      if (playerId !== 0) continue;
      if (pts < minP || pts > maxP) continue;

      // bounding box quick reject
      if (x < box.minX || x > box.maxX || y < box.minY || y > box.maxY) continue;

      // within radius of ANY spy village?
      let bestD = Infinity;
      for (const sv of spyVillages) {
        const d = dist(x, y, sv.x, sv.y);
        if (d < bestD) bestD = d;
      }
      if (bestD > outer || bestD < inner) continue;

      const ck = coordKey(x, y);
      if (laCoords.has(ck)) continue; // IMPORTANT: do NOT send if exists in LA

      candidates.push({ x, y, coord: ck, points: pts });
    }

    // reduce volume (closest-ish first using distance to nearest)
    candidates.sort((a, b) => a.points - b.points); // cheap stable; assignment step sorts by dist anyway
    const sliced = candidates.slice(0, maxT);

    return assignNearestWithCapacity(sliced, spyVillages);
  }

  // ========= FAST SEND (place ajax flow) =========
  function buildFormDataFromDoc(doc) {
    const form = doc.querySelector("#command-data-form");
    if (!form) throw new Error("command-data-form bulunamadı.");
    const data = [];
    form.querySelectorAll("input,select,textarea").forEach(el => {
      const name = el.getAttribute("name");
      if (!name) return;
      const type = (el.getAttribute("type") || "").toLowerCase();
      if ((type === "checkbox" || type === "radio") && !el.checked) return;
      data.push({ name, value: el.value ?? "" });
    });
    return data;
  }
  function upsert(data, name, value) {
    const i = data.findIndex(x => x.name === name);
    if (i >= 0) data[i].value = String(value);
    else data.push({ name, value: String(value) });
  }
  function zeroAllUnits(data) {
    (game_data.units || []).forEach(u => upsert(data, u, "0"));
  }

  async function sendOneSpy(sourceVillageId, x, y) {
    const delay = clampInt($("#ya2_delay").val(), CFG.DEFAULT_DELAY);

    // 1) command form
    const cmd = await twGet("place", { village: sourceVillageId, ajax: "command" });
    const htmlCmd = (cmd && typeof cmd === "object" && cmd.dialog) ? cmd.dialog : cmd;
    const docCmd = parseHTML(htmlCmd);

    let data = buildFormDataFromDoc(docCmd);

    // set target + units
    upsert(data, "source_village", sourceVillageId);
    upsert(data, "target_type", "coord");
    upsert(data, "input", `${x}|${y}`);
    upsert(data, "x", x);
    upsert(data, "y", y);

    zeroAllUnits(data);
    upsert(data, CFG.UNIT, CFG.UNIT_COUNT);

    // clicked button value like CommandPopup.sendTroops
    upsert(data, "attack", "l");

    await sleep(delay);

    // 2) confirm
    const conf = await twPost("place", { village: sourceVillageId, ajax: "confirm" }, data);
    const htmlConf = (conf && typeof conf === "object" && conf.dialog) ? conf.dialog : conf;
    const docConf = parseHTML(htmlConf);

    // Bot protection / errors (best effort)
    const text = (docConf.body?.textContent || "").toLowerCase();
    if (text.includes("bot protection") || text.includes("captcha") || text.includes("hcaptcha")) {
      throw new Error("Bot protection tetiklendi. Doğrulama yapıp tekrar dene.");
    }

    // 3) confirm send (popup_command)
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

    // If server returned an error structure, best effort detect
    if (sent && typeof sent === "object") {
      if (sent.error) throw new Error(sent.error);
      if (sent.message && String(sent.message).toLowerCase().includes("error")) {
        throw new Error(sent.message);
      }
    }

    return true;
  }

  // ========= SEND NEXT (FarmGod behavior: remove row) =========
  function takeNext() {
    return S.queue.find(q => q.status === "Bekliyor") || null;
  }

  async function sendSpecific(coord) {
    if (S.busy) return;
    const q = S.queue.find(x => x.coord === coord);
    if (!q || q.status !== "Bekliyor") return;

    if (!q.src) {
      q.status = "Atlandı";
      q.error = "Kaynak yok";
      renderTable();
      return;
    }

    const c = parseCoordFromText(coord);
    if (!c) return;

    try {
      S.busy = true;
      setStatus(`Gönderiliyor: ${q.src.id} → ${coord}`);
      q.status = "Gönderiliyor";
      q.error = "";
      renderTable();

      await sendOneSpy(q.src.id, c.x, c.y);

      // FarmGod gibi: başarılı ise listeden düşür
      S.queue = S.queue.filter(x => x.coord !== coord);
      setCounts();
      renderTable();
      setStatus("Hazır");
    } catch (e) {
      q.status = "Hata";
      q.error = e?.message || String(e);
      renderTable();
      setStatus("HATA");
    } finally {
      S.busy = false;
    }
  }

  async function sendNext() {
    const q = takeNext();
    if (!q) { setStatus("Bitti"); return; }
    await sendSpecific(q.coord);
  }

  // ========= MAIN SCAN =========
  async function scanBuild() {
    if (S.busy) return;
    S.stop = false;

    try {
      S.busy = true;
      setStatus("Spy köyler okunuyor...");
      S.queue = [];
      renderTable();

      S.spyVillages = await fetchSpyVillages();
      setCounts();

      setStatus("Loot Assistant okunuyor...");
      S.laCoords = await fetchLAall();
      setCounts();

      setStatus("Barbar taranıyor + LA diff...");
      S.queue = await buildMissingQueue(S.spyVillages, S.laCoords);
      setCounts();
      renderTable();

      setStatus("Hazır (Enter = sıradaki)");
    } catch (e) {
      console.error(e);
      setStatus("HATA");
      alert("Hata: " + (e?.message || e));
    } finally {
      S.busy = false;
    }
  }

  // ========= ENTER HANDLER (FarmGod-like) =========
  function onKeyDown(e) {
    if (e.key !== "Enter") return;
    if (!document.getElementById(CFG.PANEL_ID)) return;
    if (isTypingContext(e)) return;

    const now = Date.now();
    const delay = Math.max(CFG.MIN_KEY_INTERVAL, clampInt($("#ya2_delay").val(), CFG.DEFAULT_DELAY));
    if (S.busy) return;
    if ((now - S.lastKeyAt) < delay) return; // throttle like FarmGod (prevents too-fast repeat)

    e.preventDefault();
    S.lastKeyAt = now;
    sendNext();
  }

  // ========= DESTROY =========
  Y.destroy = function () {
    $(document).off("keydown.yaverAffetmezV2", onKeyDown);
    $("#" + CFG.PANEL_ID).remove();
    $("#" + CFG.STYLE_ID).remove();
    delete window[NS];
  };

  // ========= INIT =========
  ensurePanel();
  $(document).on("keydown.yaverAffetmezV2", onKeyDown);
})();
