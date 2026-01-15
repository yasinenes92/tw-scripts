(() => {
  const KEY = "__YAVER_SCOUT_MISSING_LA__";
  if (window[KEY]?.destroy) {
    try { window[KEY].destroy(); } catch (e) {}
  }

  const Y = (window[KEY] = {});
  Y.state = {
    barbsInArea: [],
    laCoords: new Set(),
    missing: [],
    busy: false,
    stop: false,
    cache: {
      villageTxt: null,
      villageTxtAt: 0,
      config: null,
      unitInfo: null,
      spyMinPerField: null,
    },
  };

  // ========= CONFIG =========
  Y.CFG = {
    PANEL_ID: "yaver_scout_missing_la_panel",
    STYLE_ID: "yaver_scout_missing_la_style",
    CACHE_VILLAGE_TTL_MS: 6 * 60 * 60 * 1000, // 6 saat
    OUTER_RADIUS: 15,
    INNER_RADIUS: 0,
    MIN_POINTS: 0,
    MAX_POINTS: 999999,
    MAX_TARGETS: 200,
    FETCH_DELAY_MS: 250,
    SOURCE_VILLAGE_ID: (window.game_data?.village?.id || null),
  };

  // ========= UTIL =========
  const $ = window.jQuery;
  if (!$) {
    alert("jQuery bulunamadı. (TW sayfasında normalde var.)");
    return;
  }
  if (!window.game_data) {
    alert("game_data bulunamadı. Oyunun içindeyken çalıştır.");
    return;
  }

  const clampInt = (n, d = 0) => {
    n = parseInt(n, 10);
    return Number.isFinite(n) ? n : d;
  };

  const fmt = (n) => (n ?? 0).toLocaleString("tr-TR");
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
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
    const s = sec % 60;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  }

  function getCurrentVillageXY() {
    const v = window.game_data?.village;
    return { x: parseInt(v?.x, 10), y: parseInt(v?.y, 10), id: String(v?.id || "") };
  }

  // ========= CSV parser (robust) =========
  function CSVToArray(strData, strDelimiter = ",") {
    const objPattern = new RegExp(
      "(\\" +
        strDelimiter +
        "|\\r?\\n|\\r|^)" +
        '(?:"([^"]*(?:""[^"]*)*)"|' +
        '([^"\\' +
        strDelimiter +
        "\\r\\n]*))",
      "gi"
    );

    const arrData = [[]];
    let arrMatches = null;

    while ((arrMatches = objPattern.exec(strData))) {
      const strMatchedDelimiter = arrMatches[1];

      if (strMatchedDelimiter.length && strMatchedDelimiter !== strDelimiter) {
        arrData.push([]);
      }

      let strMatchedValue;
      if (arrMatches[2]) {
        strMatchedValue = arrMatches[2].replace(new RegExp('""', "g"), '"');
      } else {
        strMatchedValue = arrMatches[3];
      }
      arrData[arrData.length - 1].push(strMatchedValue);
    }
    return arrData;
  }

  // ========= INTERFACE (speed + unit speed) =========
  async function getWorldConfig() {
    if (Y.state.cache.config) return Y.state.cache.config;
    const xml = await $.get("/interface.php?func=get_config");
    const doc = new DOMParser().parseFromString(xml, "text/xml");
    const speed = parseFloat(doc.querySelector("speed")?.textContent || "1") || 1;
    const unit_speed = parseFloat(doc.querySelector("unit_speed")?.textContent || "1") || 1;
    Y.state.cache.config = { speed, unit_speed };
    return Y.state.cache.config;
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

  async function getSpyMinPerField() {
    if (Y.state.cache.spyMinPerField != null) return Y.state.cache.spyMinPerField;
    const ui = await getUnitInfo();
    const baseMin = ui.spySpeedMin != null ? ui.spySpeedMin : 18;
    Y.state.cache.spyMinPerField = baseMin;
    return baseMin;
  }

  async function estimateSpySeconds(distanceFields) {
    const { speed, unit_speed } = await getWorldConfig();
    const minPerFieldBase = await getSpyMinPerField();
    const sec = (distanceFields * minPerFieldBase * 60) / (speed * unit_speed);
    return Math.max(0, Math.round(sec));
  }

  // ========= DATA: village.txt => barbs in area =========
  async function fetchVillageTxtCached() {
    const now = Date.now();
    const lsKey = "yaver_village_txt";
    const lsAt = "yaver_village_txt_at";

    const cached = localStorage.getItem(lsKey);
    const cachedAt = parseInt(localStorage.getItem(lsAt) || "0", 10) || 0;

    if (cached && now - cachedAt < Y.CFG.CACHE_VILLAGE_TTL_MS) {
      return cached;
    }

    const data = await $.get("/map/village.txt");
    localStorage.setItem(lsKey, data);
    localStorage.setItem(lsAt, String(now));
    return data;
  }

  async function getBarbsInArea() {
    const { x: cx, y: cy } = getCurrentVillageXY();
    const outer = clampInt($("#y_s_outer").val(), Y.CFG.OUTER_RADIUS);
    const inner = clampInt($("#y_s_inner").val(), Y.CFG.INNER_RADIUS);
    const minP = clampInt($("#y_s_minp").val(), Y.CFG.MIN_POINTS);
    const maxP = clampInt($("#y_s_maxp").val(), Y.CFG.MAX_POINTS);
    const maxTargets = clampInt($("#y_s_maxt").val(), Y.CFG.MAX_TARGETS);

    const raw = await fetchVillageTxtCached();
    const rows = CSVToArray(raw);

    const barbs = [];
    for (const r of rows) {
      if (!r || r.length < 6) continue;
      const playerId = parseInt(r[4], 10);
      if (playerId !== 0) continue;

      const x = parseInt(r[2], 10);
      const y = parseInt(r[3], 10);
      const points = parseInt(r[5], 10) || 0;

      if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
      if (points < minP || points > maxP) continue;

      const d = dist(cx, cy, x, y);
      if (d > outer || d < inner) continue;

      barbs.push({ coord: coordKey(x, y), x, y, points, d });
    }

    barbs.sort((a, b) => a.d - b.d);
    return barbs.slice(0, Math.max(1, maxTargets));
  }

  // ========= DATA: Loot Assistant (all pages) =========
  function extractCoordsFromPlunderList(doc) {
    const tbl = doc.querySelector("#plunder_list");
    if (!tbl) return [];
    const txt = tbl.innerText || tbl.textContent || "";
    const matches = txt.match(/\b(\d{1,3}\|\d{1,3})\b/g) || [];
    return Array.from(new Set(matches));
  }

  function getMaxFarmPageFromNav(doc) {
    const nav = doc.querySelectorAll("#plunder_list_nav a.paged-nav-item[href*='Farm_page=']");
    let max = 0;
    nav.forEach((a) => {
      const href = a.getAttribute("href") || "";
      const m = href.match(/Farm_page=(\d+)/);
      if (m) max = Math.max(max, parseInt(m[1], 10));
    });
    return max;
  }

  async function fetchLootAssistantAllPages() {
    const delay = clampInt($("#y_s_delay").val(), Y.CFG.FETCH_DELAY_MS);

    const url0 = TribalWars.buildURL("GET", "am_farm", { order: "distance", dir: "asc" });
    const html0 = await $.get(url0);
    const doc0 = parseHTML(html0);

    const maxFarmPage = getMaxFarmPageFromNav(doc0);
    const pagesCount = maxFarmPage + 1;

    const coords = new Set();
    extractCoordsFromPlunderList(doc0).forEach((c) => coords.add(c));

    for (let p = 1; p < pagesCount; p++) {
      if (Y.state.stop) break;
      $("#y_s_status").text(`Loot Assistant sayfaları okunuyor... (${p + 1}/${pagesCount})`);
      const url = TribalWars.buildURL("GET", "am_farm", { order: "distance", dir: "asc", Farm_page: p });
      const html = await $.get(url);
      const doc = parseHTML(html);
      extractCoordsFromPlunderList(doc).forEach((c) => coords.add(c));
      await sleep(delay);
    }

    return coords;
  }

  // ========= SAFE SEND (NEW TAB PREFILL) =========
  async function openPlaceAndPrefill(villageId, targetX, targetY) {
    const url = TribalWars.buildURL("GET", "place", { village: villageId, mode: "command" });

    // MUST be called from a user click to avoid popup block
    const w = window.open(url, "_blank");
    if (!w) throw new Error("Popup engellendi (window.open blocked). Tarayıcı izin ver.");

    // wait for load
    for (let i = 0; i < 120; i++) {
      await sleep(100);
      try {
        if (w.document && (w.document.readyState === "complete" || w.document.readyState === "interactive")) break;
      } catch (e) {}
    }

    // helper to set value + events
    const doc = w.document;
    const setVal = (el, val) => {
      if (!el) return;
      el.value = String(val);
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
      el.dispatchEvent(new Event("keyup", { bubbles: true }));
    };

    // Ensure coord mode
    const coordRadio = doc.querySelector("input[name='target_type'][value='coord']");
    if (coordRadio) {
      coordRadio.checked = true;
      coordRadio.dispatchEvent(new Event("change", { bubbles: true }));
    }

    // Fill target visible input (name="input") and hidden x/y
    const inputField =
      doc.querySelector("#place_target input[name='input']") ||
      doc.querySelector("input.target-input-field[name='input']") ||
      doc.querySelector("input[name='input']");
    setVal(inputField, `${targetX}|${targetY}`);

    const xHidden = doc.querySelector("#inputx") || doc.querySelector("input[name='x']");
    const yHidden = doc.querySelector("#inputy") || doc.querySelector("input[name='y']");
    setVal(xHidden, targetX);
    setVal(yHidden, targetY);

    // Fill spy = 1 (both patterns)
    const spyInput =
      doc.querySelector("#unit_input_spy") ||
      doc.querySelector("input[name='spy']") ||
      doc.querySelector("input.unitsInput[id*='spy']");
    setVal(spyInput, "1");

    // Focus Attack button so you can press Enter
    const atk = doc.querySelector("#target_attack") || doc.querySelector("input[name='attack']");
    if (atk) {
      atk.scrollIntoView({ block: "center" });
      atk.focus();
    } else if (inputField) {
      inputField.focus();
    }

    // Do NOT submit. User presses Enter.
    return true;
  }

  // ========= UI =========
  function ensurePanel() {
    if (document.getElementById(Y.CFG.PANEL_ID)) return;

    const style = document.createElement("style");
    style.id = Y.CFG.STYLE_ID;
    style.textContent = `
      #${Y.CFG.PANEL_ID}{
        position: fixed; top: 60px; left: 20px; width: 980px;
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
      #${Y.CFG.PANEL_ID} .pill{ display:inline-block; padding:2px 6px; background:rgba(0,0,0,.1); border-radius:4px; }
      #${Y.CFG.PANEL_ID} input{ width:70px; padding:3px 4px; }
      #${Y.CFG.PANEL_ID} table{ width:100%; border-collapse:collapse; background:rgba(255,255,255,.25); }
      #${Y.CFG.PANEL_ID} th{ background:#a68448; color:#fff; padding:6px; text-align:left; position:sticky; top:48px; z-index:1; }
      #${Y.CFG.PANEL_ID} td{ border-bottom:1px solid #d0c1a0; padding:5px 6px; }
      #${Y.CFG.PANEL_ID} tr:hover td{ background: rgba(255,255,255,.35); }
      .y_ok{ color:#1b7d12; font-weight:700; }
      .y_bad{ color:#b00000; font-weight:700; }
      .y_muted{ opacity:.75; }
    `;
    document.head.appendChild(style);

    const el = document.createElement("div");
    el.id = Y.CFG.PANEL_ID;
    el.innerHTML = `
      <div class="hdr">
        <div>
          <b>🕵️ Yaver — Map → Loot Assistant Diff → 1 Spy (SAFE)</b>
          <span class="pill y_muted" style="margin-left:8px;">Buton = sekme aç + doldur (Enter senin)</span>
        </div>
        <div style="display:flex; gap:8px; align-items:center;">
          <span class="pill" id="y_s_status">Hazır</span>
          <button class="btn btn-red" id="y_s_close">X</button>
        </div>
      </div>

      <div class="content">
        <div class="row">
          <span class="pill">Inner: <input id="y_s_inner" value="${Y.CFG.INNER_RADIUS}"> </span>
          <span class="pill">Outer: <input id="y_s_outer" value="${Y.CFG.OUTER_RADIUS}"> </span>
          <span class="pill">MinP: <input id="y_s_minp" value="${Y.CFG.MIN_POINTS}"> </span>
          <span class="pill">MaxP: <input id="y_s_maxp" value="${Y.CFG.MAX_POINTS}"> </span>
          <span class="pill">Max: <input id="y_s_maxt" value="${Y.CFG.MAX_TARGETS}"> </span>
          <span class="pill">Delay: <input id="y_s_delay" value="${Y.CFG.FETCH_DELAY_MS}"> ms</span>
        </div>

        <div class="row">
          <button class="btn btn-green" id="y_s_scan">Tara + LA karşılaştır</button>
          <button class="btn btn-gray" id="y_s_send_next">Sıradakine 1 Casus</button>
          <button class="btn btn-red" id="y_s_stop">STOP</button>

          <span class="pill">Barb (alan): <b id="y_s_cnt_barb">0</b></span>
          <span class="pill">LA toplam: <b id="y_s_cnt_la">0</b></span>
          <span class="pill">Eksik: <b id="y_s_cnt_miss">0</b></span>
        </div>

        <div class="pill" style="margin:8px 0; width:100%; box-sizing:border-box;">
          Güvenli gönderim: Sekme açılır → coord + spy=1 doldurulur → Attack fokus → Enter senin.
        </div>

        <div style="max-height:55vh; overflow:auto; border:1px solid #b79b5d;">
          <table>
            <thead>
              <tr>
                <th style="width:40px;">#</th>
                <th style="width:120px;">Koord</th>
                <th style="width:80px;">Puan</th>
                <th style="width:80px;">Mesafe</th>
                <th style="width:110px;">ETA (Spy)</th>
                <th>Durum</th>
                <th style="width:140px;">Aksiyon</th>
              </tr>
            </thead>
            <tbody id="y_s_tbody">
              <tr><td colspan="7" class="y_muted" style="padding:10px;">Henüz liste yok. “Tara + LA karşılaştır” bas.</td></tr>
            </tbody>
          </table>
        </div>

        <div class="y_muted" style="margin-top:8px;">
          Not: “Sıradakine” sadece “Bekliyor” satırlarını açar; “Sekme hazır” olanı atlar.
        </div>
      </div>
    `;

    document.body.appendChild(el);

    $("#y_s_close").on("click", () => Y.destroy());
    $("#y_s_stop").on("click", () => {
      Y.state.stop = true;
      $("#y_s_status").text("STOP");
    });
    $("#y_s_scan").on("click", () => scanAndBuild());
    $("#y_s_send_next").on("click", () => sendNext());
  }

  function renderTable(list) {
    const tb = document.getElementById("y_s_tbody");
    tb.innerHTML = "";

    if (!list.length) {
      tb.innerHTML = `<tr><td colspan="7" class="y_muted" style="padding:10px;">Eksik hedef yok. (Alan içi barblar LA’da görünüyor olabilir.)</td></tr>`;
      return;
    }

    list.forEach((v, idx) => {
      const tr = document.createElement("tr");
      tr.dataset.coord = v.coord;
      tr.innerHTML = `
        <td>${idx + 1}</td>
        <td><b>${v.coord}</b></td>
        <td>${fmt(v.points)}</td>
        <td>${v.d.toFixed(1)}</td>
        <td class="y_muted">${v.etaText || "—"}</td>
        <td class="y_muted" data-col="status">Bekliyor</td>
        <td>
          <button class="btn btn-green" data-act="send">1 Casus</button>
          <button class="btn btn-gray" data-act="open">RP</button>
        </td>
      `;
      tb.appendChild(tr);

      $(tr).find("button[data-act='send']").on("click", async () => {
        await sendOne(v.coord);
      });

      $(tr).find("button[data-act='open']").on("click", () => {
        const vid = String(Y.CFG.SOURCE_VILLAGE_ID || window.game_data.village.id);
        const url = TribalWars.buildURL("GET", "place", { village: vid, mode: "command" });
        window.open(url, "_blank");
      });
    });
  }

  function setCounts() {
    $("#y_s_cnt_barb").text(String(Y.state.barbsInArea.length));
    $("#y_s_cnt_la").text(String(Y.state.laCoords.size));
    $("#y_s_cnt_miss").text(String(Y.state.missing.length));
  }

  async function scanAndBuild() {
    try {
      Y.state.stop = false;
      $("#y_s_status").text("Alan barbları taranıyor...");
      const barbs = await getBarbsInArea();
      Y.state.barbsInArea = barbs;

      $("#y_s_status").text("Loot Assistant okunuyor...");
      const la = await fetchLootAssistantAllPages();
      Y.state.laCoords = la;

      const missing = barbs.filter((b) => !la.has(b.coord));

      $("#y_s_status").text("ETA hesaplanıyor...");
      for (const m of missing) {
        if (Y.state.stop) break;
        const sec = await estimateSpySeconds(m.d);
        m.etaText = fmtHMS(sec);
      }

      Y.state.missing = missing;
      setCounts();
      renderTable(missing);
      $("#y_s_status").text("Hazır (plan çıktı)");
    } catch (e) {
      console.error(e);
      $("#y_s_status").text("HATA");
      alert("Hata: " + (e?.message || e));
    }
  }

  function getRowByCoord(coord) {
    const tb = document.getElementById("y_s_tbody");
    return Array.from(tb.querySelectorAll("tr")).find((tr) => tr.dataset.coord === coord) || null;
  }

  function setRowStatus(coord, html, ok = null) {
    const tr = getRowByCoord(coord);
    if (!tr) return;
    const td = tr.querySelector("td[data-col='status']");
    if (!td) return;
    td.innerHTML = html;
    td.className = ok === true ? "y_ok" : ok === false ? "y_bad" : "y_muted";
  }

  // ====== ONLY CHANGED PART: sendOne now opens a prefilled tab (no POST) ======
  async function sendOne(coord) {
    if (Y.state.busy) return;
    if (Y.state.stop) return;

    const p = parseCoordKey(coord);
    if (!p) return;

    const villageId = String(Y.CFG.SOURCE_VILLAGE_ID || window.game_data.village.id);

    try {
      Y.state.busy = true;
      $("#y_s_status").text("Sekme açılıyor...");
      setRowStatus(coord, "Sekme açılıyor...", null);

      // Disable while opening/prefilling (avoid multi-popup)
      $(`#${Y.CFG.PANEL_ID} button[data-act='send'], #y_s_send_next`).prop("disabled", true);

      await openPlaceAndPrefill(villageId, p.x, p.y);

      // IMPORTANT: We do NOT know if you pressed Enter, so we mark as "Ready"
      setRowStatus(coord, "🟡 Sekme hazır — <b>Enter</b> ile onayla", null);
      $("#y_s_status").text("Hazır");
    } catch (e) {
      console.error(e);
      setRowStatus(coord, "❌ Hata: " + (e?.message || e), false);
      $("#y_s_status").text("HATA");
    } finally {
      Y.state.busy = false;
      $(`#${Y.CFG.PANEL_ID} button[data-act='send'], #y_s_send_next`).prop("disabled", false);
    }
  }

  async function sendNext() {
    if (!Y.state.missing.length) return;
    const tb = document.getElementById("y_s_tbody");
    const rows = Array.from(tb.querySelectorAll("tr")).filter((r) => r.dataset.coord);

    // only "Bekliyor"
    const next = rows.find((r) => {
      const st = (r.querySelector("td[data-col='status']")?.innerText || "").toLowerCase();
      return st.includes("bekliyor");
    });

    if (!next) {
      $("#y_s_status").text("Bitti (bekleyen yok)");
      return;
    }
    await sendOne(next.dataset.coord);
  }

  Y.destroy = function () {
    try {
      Y.state.stop = true;
      document.getElementById(Y.CFG.PANEL_ID)?.remove();
      document.getElementById(Y.CFG.STYLE_ID)?.remove();
      delete window[KEY];
    } catch (e) {}
  };

  // ========= INIT =========
  ensurePanel();
})();
