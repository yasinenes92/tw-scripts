/* =======================================================================
   Yaver Teleskop
   - In-game "In a day" 4 metrics (loot_res, loot_vil, scavenge, conquer)
   - Player autocomplete (like game) -> select -> fetch
   - If on player profile page (screen=info_player), auto-detect player
   - TWStats: Snapshot + last 30 days (Points/Villages/OD deltas) + Conquer periods
   - Save note (localStorage)
   ======================================================================= */
(function () {
  "use strict";

  const CFG = {
    name: "Yaver Teleskop",
    version: "v1.0.0",
    author: "controleng",
    debug: false,
    debounceMs: 250,
    ajaxTimeoutMs: 25000,
    maxDays: 30,
    storageKeyNotes: "yaver_teleskop_notes_v1",
  };

  // --------------------- logging ---------------------
  function log(...a) { if (CFG.debug) console.log("[YaverTeleskop]", ...a); }
  function err(...a) { console.error("[YaverTeleskop]", ...a); }

  function ok(msg) {
    log(msg);
    if (window.UI && UI.SuccessMessage) UI.SuccessMessage(msg, 1800);
  }
  function bad(msg) {
    err(msg);
    if (window.UI && UI.ErrorMessage) UI.ErrorMessage(String(msg), 7000);
  }

  // --------------------- i18n ---------------------
  const I18N = {
    en: {
      player: "Player",
      typeName: "Type player name...",
      select: "(select)",
      getRecords: "Get Records",
      clear: "Clear",
      openProfile: "Open Profile",
      saveNote: "Save Note",
      lang: "Lang",
      detected: "Detected player from profile page.",
      searching: "Searching players...",
      foundN: (n) => `Found ${n} player(s). Select from list.`,
      noMatches: "No matches. You can still try exact name and press Get Records.",
      fetching: "Fetching daily records...",
      done: "Done ✅",
      twstatsFetch: "Fetch TWStats",
      twstatsOpen: "Open TWStats",
      twstatsBlocked: "TWStats fetch blocked by browser (CORS). Daily Records still works.",
      twstatsSnapshot: "TWStats Snapshot",
      twstatsHistory30: "TWStats History (last 30 days)",
      twstatsConquer30: "TWStats Conquer Periods (last 30 days)",
      chartPoints: "Daily Points Gain",
      chartVillages: "Daily Villages Change",
      chartOD: "Daily OD Gain",
      noteSaved: "Saved to local notes ✅",
      nothingToSave: "Nothing to save yet.",
    },
    tr: {
      player: "Oyuncu",
      typeName: "Oyuncu adı yaz...",
      select: "(seç)",
      getRecords: "Verileri Çek",
      clear: "Temizle",
      openProfile: "Profili Aç",
      saveNote: "Not Defterine Kaydet",
      lang: "Dil",
      detected: "Profil sayfasından oyuncu algılandı.",
      searching: "Oyuncular aranıyor...",
      foundN: (n) => `${n} oyuncu bulundu. Listeden seç.`,
      noMatches: "Eşleşme yok. Tam ismi yazıp 'Verileri Çek' ile deneyebilirsin.",
      fetching: "Günlük rekorlar çekiliyor...",
      done: "Bitti ✅",
      twstatsFetch: "TWStats Çek",
      twstatsOpen: "TWStats Aç",
      twstatsBlocked: "TWStats çekimi tarayıcı tarafından engellendi (CORS). Daily Records çalışmaya devam eder.",
      twstatsSnapshot: "TWStats Özet",
      twstatsHistory30: "TWStats Geçmiş (son 30 gün)",
      twstatsConquer30: "TWStats Fetih Dönemleri (son 30 gün)",
      chartPoints: "Günlük Puan Artışı",
      chartVillages: "Günlük Köy Değişimi",
      chartOD: "Günlük OD Artışı",
      noteSaved: "Local notlara kaydedildi ✅",
      nothingToSave: "Kaydedilecek veri yok.",
    },
  };

  // persisted in memory per run (not across reload)
  const STATE = {
    lang: "en",
    last: {
      playerName: "",
      playerId: null,
      daily: null,
      twstats: null,
    },
  };

  function t(key, ...args) {
    const dict = I18N[STATE.lang] || I18N.en;
    const v = dict[key];
    if (typeof v === "function") return v(...args);
    return v ?? key;
  }

  // --------------------- helpers ---------------------
  function esc(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  }

  function parseNumberAny(s) {
    // handles: 7.373 / 615,231 / 65.085 / " (536.)" etc
    const x = String(s || "")
      .replace(/[^\d\-\+]/g, "") // keep digits and sign
      .trim();
    // if something like "+72447" remains ok
    return parseInt(x, 10) || 0;
  }

  function parseSignedDelta(s) {
    const str = String(s || "").trim();
    if (!str) return 0;
    const sign = str.includes("-") ? -1 : 1;
    const n = parseNumberAny(str);
    return sign * Math.abs(n);
  }

  function fmtDots(n) {
    const x = Math.round(Number(n) || 0).toString();
    return x.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  }

  function fmtSigned(n) {
    const v = Number(n) || 0;
    const sign = v > 0 ? "+" : v < 0 ? "-" : "";
    return sign + fmtDots(Math.abs(v));
  }

  function base() { return window.location.origin; }
  function villageId() {
    if (window.game_data && game_data.village && game_data.village.id) return String(game_data.village.id);
    const m = String(window.location.search || "").match(/village=(\d+)/);
    return m ? m[1] : "";
  }

  function urlInADayByName(type, playerName) {
    return `${base()}/game.php?village=${encodeURIComponent(villageId())}&screen=ranking&mode=in_a_day&type=${encodeURIComponent(type)}&name=${encodeURIComponent(playerName)}`;
  }

  function urlInfoPlayer(playerId) {
    return `${base()}/game.php?village=${encodeURIComponent(villageId())}&screen=info_player&id=${encodeURIComponent(playerId)}`;
  }

  function getWorld() {
    return (window.game_data && game_data.world) ? String(game_data.world) : "";
  }

  // --------------------- network ---------------------
  const htmlCache = new Map();
  async function getHtml(url) {
    if (htmlCache.has(url)) return htmlCache.get(url);
    const p = $.ajax({
      url,
      method: "GET",
      dataType: "html",
      timeout: CFG.ajaxTimeoutMs,
    });
    htmlCache.set(url, p);
    return p;
  }

  // --------------------- parsing in-a-day ---------------------
  function parseInADayTable(html) {
    const $doc = $(html);
    const $t = $doc.find("#in_a_day_ranking_table");
    if (!$t.length) return [];
    const out = [];
    $t.find("tr").slice(1).each(function () {
      const $td = $(this).find("td");
      if ($td.length < 5) return;
      const $a = $td.eq(1).find("a[href*='screen=info_player']");
      const href = $a.attr("href") || "";
      const m = href.match(/id=(\d+)/);
      const pid = m ? m[1] : null;

      out.push({
        rank: parseNumberAny($td.eq(0).text()),
        name: $td.eq(1).text().trim(),
        playerId: pid,
        tribe: $td.eq(2).text().trim(),
        score: parseNumberAny($td.eq(3).text()),
        date: $td.eq(4).text().trim(),
      });
    });
    return out;
  }

  function pickRowForName(rows, expectedName) {
    const exact = rows.find(r => r.name === expectedName);
    if (exact) return exact;
    // fallback: first row (TW behaviour when search doesn't match perfectly)
    return rows[0] || null;
  }

  async function resolvePlayerByName(playerName) {
    const html = await getHtml(urlInADayByName("loot_res", playerName));
    const rows = parseInADayTable(html);
    const picked = pickRowForName(rows, playerName);
    if (!picked) return { playerId: null, canonicalName: playerName };
    return { playerId: picked.playerId ? String(picked.playerId) : null, canonicalName: picked.name || playerName };
  }

  async function getDailyByName(type, playerName) {
    const html = await getHtml(urlInADayByName(type, playerName));
    const rows = parseInADayTable(html);
    const row = pickRowForName(rows, playerName);
    return { score: row ? row.score : 0, date: row ? row.date : "" };
  }

  // --------------------- autocomplete ---------------------
  function getAutoCompleteUrl() {
    if (window.UI && UI.AutoComplete && typeof UI.AutoComplete.url === "string" && UI.AutoComplete.url) {
      return UI.AutoComplete.url;
    }
    return null;
  }

  function normalizeAutocompleteResponse(data) {
    let arr = [];
    if (Array.isArray(data)) arr = data;
    else if (data && Array.isArray(data.items)) arr = data.items;
    else if (data && Array.isArray(data.result)) arr = data.result;
    else if (data && Array.isArray(data.suggestions)) arr = data.suggestions;
    else if (data && Array.isArray(data.data)) arr = data.data;

    const out = [];
    for (const it of arr) {
      if (typeof it === "string") { out.push({ id: null, name: it }); continue; }
      if (!it || typeof it !== "object") continue;
      const name = (it.label || it.value || it.name || it.text || "").toString().trim();
      const id = (it.id || it.player_id || it.uid || it.value_id || it.key || null);
      if (name) out.push({ id: id != null ? String(id) : null, name });
    }

    // de-dup by name
    const seen = new Set();
    return out.filter(x => {
      const k = x.name.toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }

  async function searchPlayers(term) {
    const acUrl = getAutoCompleteUrl();
    if (!acUrl) throw new Error("UI.AutoComplete.url not found.");
    const data = await $.ajax({
      url: acUrl,
      method: "GET",
      dataType: "json",
      timeout: CFG.ajaxTimeoutMs,
      data: { term, type: "player" },
    });
    return normalizeAutocompleteResponse(data);
  }

  // --------------------- detect player from profile page ---------------------
  function detectPlayerFromCurrentPage() {
    // If you are on: ...screen=info_player&id=848971185
    const isInfoPlayer =
      (window.game_data && game_data.screen === "info_player") ||
      /screen=info_player/.test(String(window.location.search || ""));

    if (!isInfoPlayer) return null;

    // id from URL
    let pid = null;
    const m = String(window.location.search || "").match(/(?:\?|&)id=(\d+)/);
    if (m) pid = m[1];

    // also InfoPlayer.player_id exists on that page
    if (!pid && window.InfoPlayer && InfoPlayer.player_id) pid = String(InfoPlayer.player_id);

    // name appears in #content_value h2 span or #player_info th span
    let name = "";
    const $n1 = $("#content_value h2 span").first();
    if ($n1.length) name = $n1.text().trim();

    if (!name) {
      const $n2 = $("#player_info th span").first();
      if ($n2.length) name = $n2.text().trim();
    }

    if (!name) {
      // fallback: page title often contains village name, not target player; skip.
      name = "";
    }

    return (pid || name) ? { playerId: pid ? String(pid) : null, playerName: name } : null;
  }

  function findTwStatsUrlInProfileDom() {
    // in-game profile page contains "User file (external link)" -> twstats.com
    // try to locate any anchor that points to twstats
    const $a = $("a[href*='twstats.com']").filter(function () {
      const txt = $(this).text().toLowerCase();
      return txt.includes("user file") || txt.includes("twstats") || txt.includes("player");
    }).first();

    const href = $a.attr("href");
    return href ? String(href) : null;
  }

  // --------------------- TWStats URLs + parsing ---------------------
  function parseTwStatsWorldFromUrl(u) {
    try {
      const url = new URL(u);
      const m = url.pathname.match(/\/(in\/)?(en\d+)\//i);
      return m ? m[2].toLowerCase() : "";
    } catch (_) {
      return "";
    }
  }

  function makeTwStatsBase(world, twstatsUrlMaybe) {
    // Prefer: https://www.twstats.com/en152/
    const w = world || parseTwStatsWorldFromUrl(twstatsUrlMaybe) || getWorld();
    if (!w) return null;
    return `https://www.twstats.com/${w}/`;
  }

  function twstatsUrls(playerId, twstatsUrlMaybe) {
    const base = makeTwStatsBase(getWorld(), twstatsUrlMaybe);
    if (!base) return null;
    return {
      base,
      profile: `${base}index.php?page=player&id=${encodeURIComponent(playerId)}&tab=info`,
      history: `${base}index.php?page=player&id=${encodeURIComponent(playerId)}&tab=history`,
      conquer: `${base}index.php?page=player&id=${encodeURIComponent(playerId)}&tab=conquer_periods&show=%25Y-%25m-%25d`,
    };
  }

  function parseTwStatsProfile(html) {
    const $doc = $(html);
    const $t = $doc.find("table.box.profile").first();
    const rows = [];
    if ($t.length) {
      $t.find("tr").each(function () {
        const k = $(this).find("th").first().text().trim().replace(/:\s*$/, "");
        const v = $(this).find("td").first().text().trim();
        if (k) rows.push({ key: k, value: v });
      });
    }
    // try name from table
    const nameRow = rows.find(r => r.key.toLowerCase() === "name");
    const playerName = nameRow ? nameRow.value : "";
    return { playerName, rows };
  }

  function parseTwStatsHistory(html) {
    const $doc = $(html);
    const $t = $doc.find("table#history").first();
    if (!$t.length) return [];

    const out = [];
    $t.find("tr").slice(1).each(function () {
      const $td = $(this).find("td");
      if ($td.length < 9) return;

      const date = $td.eq(0).text().trim();
      const rank = $td.eq(3).text().trim();

      function cellValueAndDelta($cell) {
        const txt = $cell.text().trim();
        const title = $cell.find("[title]").last().attr("title") || $cell.attr("title") || "";
        // title like "+72,447"
        const delta = parseSignedDelta(title);
        const value = parseNumberAny(txt);
        return { value, delta };
      }

      const points = cellValueAndDelta($td.eq(4));
      const villages = cellValueAndDelta($td.eq(5));
      const od = cellValueAndDelta($td.eq(6));
      const oda = cellValueAndDelta($td.eq(7));
      const odd = cellValueAndDelta($td.eq(8));

      out.push({
        date,
        rank,
        pointsValue: points.value, pointsDelta: points.delta,
        villagesValue: villages.value, villagesDelta: villages.delta,
        odValue: od.value, odDelta: od.delta,
        odaValue: oda.value, odaDelta: oda.delta,
        oddValue: odd.value, oddDelta: odd.delta,
      });
    });

    return out;
  }

  function parseTwStatsConquerPeriods(html) {
    const $doc = $(html);
    // Find the "By day" conquer table (Date / Conquers / bar)
    const $t = $doc.find("table.vis").filter(function () {
      const th = $(this).find("th").first().text().trim().toLowerCase();
      return th === "date";
    }).first();

    if (!$t.length) return [];

    const out = [];
    $t.find("tr").slice(1).each(function () {
      const $td = $(this).find("td");
      if ($td.length < 2) return;

      const date = $td.eq(0).text().trim();
      const conquers = parseNumberAny($td.eq(1).text());

      // bar segments are 3 divs (green/yellow/red). Texts include +x / y / -z
      const $bars = $td.eq(2).find("div");
      const greenTxt = $bars.eq(0).text().trim();   // "+16"
      const yellowTxt = $bars.eq(1).text().trim();  // "1"
      const redTxt = $bars.eq(2).text().trim();     // "-1"

      const gain = parseSignedDelta(greenTxt); // positive
      const neutral = parseNumberAny(yellowTxt); // neutral count
      const loss = Math.abs(parseSignedDelta(redTxt)); // positive magnitude

      // net village change approximation: gains - losses (yellow treated neutral)
      const net = (gain || 0) - (loss || 0);

      out.push({ date, conquers, gain, neutral, loss, net });
    });

    return out;
  }

  async function fetchTwStatsAll(playerId, twstatsUrlMaybe) {
    const urls = twstatsUrls(playerId, twstatsUrlMaybe);
    if (!urls) throw new Error("TWStats base URL could not be built.");

    // Direct fetch (may be blocked by CORS in browser)
    const [profileHtml, historyHtml, conquerHtml] = await Promise.all([
      getHtml(urls.profile),
      getHtml(urls.history),
      getHtml(urls.conquer),
    ]);

    const profile = parseTwStatsProfile(profileHtml);
    const history = parseTwStatsHistory(historyHtml);
    const conquer = parseTwStatsConquerPeriods(conquerHtml);

    return { urls, profile, history, conquer };
  }

  // --------------------- UI (Dialog) ---------------------
  const IDS = {
    root: "yaver_teleskop_root",
    input: "yaver_teleskop_name",
    select: "yaver_teleskop_select",
    status: "yaver_teleskop_status",
    btnFetch: "yaver_teleskop_fetch",
    btnClear: "yaver_teleskop_clear",
    btnOpen: "yaver_teleskop_open",
    btnSave: "yaver_teleskop_save",
    lang: "yaver_teleskop_lang",
    outDaily: "yaver_teleskop_out_daily",
    outTw: "yaver_teleskop_out_tw",
    btnTwFetch: "yaver_teleskop_tw_fetch",
    btnTwOpen: "yaver_teleskop_tw_open",
  };

  function showStatus(msg, isError) {
    const $box = $("#" + IDS.status);
    const $content = $box.find(".content");
    if (!$box.length) return;
    $content.text(msg);
    $box.removeClass("error_box info_box").addClass(isError ? "error_box" : "info_box").show();
  }

  function hideStatus() {
    const $box = $("#" + IDS.status);
    if ($box.length) $box.hide();
  }

  function fillSelect(options) {
    const $sel = $("#" + IDS.select);
    if (!$sel.length) return;

    $sel.empty();
    if (!options.length) {
      // "(no matches)" kaldırıldı -> select boş & disabled
      $sel.prop("disabled", true);
      return;
    }

    $sel.prop("disabled", false);
    $sel.append(`<option value="">${esc(t("select"))}</option>`);
    for (const o of options) {
      const val = o.id ? esc(o.id) : "";
      $sel.append(`<option value="${val}" data-name="${esc(o.name)}">${esc(o.name)}${o.id ? " (" + esc(o.id) + ")" : ""}</option>`);
    }
  }

  function buildDialogHtml() {
    const langSel = `
      <select id="${IDS.lang}">
        <option value="en"${STATE.lang === "en" ? " selected" : ""}>EN</option>
        <option value="tr"${STATE.lang === "tr" ? " selected" : ""}>TR</option>
      </select>
    `;

    return `
      <div id="${IDS.root}" style="position:relative;">
        <div style="position:absolute; top:6px; right:10px; font-size:11px; opacity:0.85;">
          Developed by ${esc(CFG.author)}
        </div>

        <h3 style="margin:0 0 8px 0;">${esc(CFG.name)}</h3>

        <table class="vis" style="width:100%; table-layout:auto;">
          <tr>
            <th style="text-align:left;">${esc(t("player"))}</th>
            <td>
              <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
                <input id="${IDS.input}" class="autocomplete" data-type="player" type="text" placeholder="${esc(t("typeName"))}" />
                <select id="${IDS.select}"></select>

                <a class="btn" id="${IDS.btnFetch}">${esc(t("getRecords"))}</a>
                <a class="btn" id="${IDS.btnClear}">${esc(t("clear"))}</a>
                <a class="btn" id="${IDS.btnSave}">${esc(t("saveNote"))}</a>

                <span style="margin-left:auto; display:flex; gap:6px; align-items:center;">
                  <span style="font-size:11px; opacity:0.85;">${esc(t("lang"))}</span>
                  ${langSel}
                </span>

                <a class="btn" id="${IDS.btnOpen}" style="display:none;">${esc(t("openProfile"))}</a>
              </div>

              <div id="${IDS.status}" class="info_box" style="display:none; margin-top:6px;">
                <div class="content"></div>
              </div>
            </td>
          </tr>
        </table>

        <div id="${IDS.outDaily}" style="margin-top:10px;"></div>

        <div style="margin-top:10px;">
          <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
            <a class="btn" id="${IDS.btnTwFetch}">${esc(t("twstatsFetch"))}</a>
            <a class="btn" id="${IDS.btnTwOpen}">${esc(t("twstatsOpen"))}</a>
          </div>
          <div id="${IDS.outTw}" style="margin-top:10px;"></div>
        </div>
      </div>
    `;
  }

  function renderDailyRecords(playerName, playerId, rows) {
    const $out = $("#" + IDS.outDaily);
    if (!$out.length) return;

    const header = `
      <h3 style="margin:0 0 8px 0;">
        Daily Records: <span class="nowrap">${esc(playerName)}</span>
      </h3>
    `;

    const table = `
      <table class="vis" style="width:100%; table-layout:auto;">
        <tr>
          <th style="text-align:left;">Metric</th>
          <th style="text-align:right;">Score</th>
          <th style="text-align:left;">Date</th>
        </tr>
        ${rows.map(r => `
          <tr>
            <td class="lit-item">${esc(r.label)}</td>
            <td class="lit-item" style="text-align:right;">${esc(fmtDots(r.score))}</td>
            <td class="lit-item">${esc(r.date || "")}</td>
          </tr>
        `).join("")}
      </table>
    `;

    $out.html(header + table);

    // Profile button
    const $open = $("#" + IDS.btnOpen);
    if ($open.length) {
      if (playerId) {
        $open.show().off("click").on("click", function () {
          window.open(urlInfoPlayer(playerId), "_blank");
        });
      } else {
        $open.hide().off("click");
      }
    }
  }

  function renderTwStatsSnapshot(tw) {
    const rows = tw.profile?.rows || [];
    if (!rows.length) return "";

    return `
      <h3 style="margin:0 0 8px 0;">${esc(t("twstatsSnapshot"))}</h3>
      <table class="vis" style="width:100%; table-layout:auto;">
        <tr>
          <th style="text-align:left;">Key</th>
          <th style="text-align:left;">Value</th>
        </tr>
        ${rows.map(r => `
          <tr>
            <td class="lit-item">${esc(r.key)}</td>
            <td class="lit-item">${esc(r.value)}</td>
          </tr>
        `).join("")}
      </table>
    `;
  }

  function takeLastNDays(arr, n) {
    // TWStats tables show newest first; we want that order for display
    return (arr || []).slice(0, n);
  }

  function renderHorizontalBars(title, rows, getValFn) {
    const vals = rows.map(getValFn);
    const maxAbs = Math.max(1, ...vals.map(v => Math.abs(v)));

    return `
      <h4 style="margin:10px 0 6px 0;">${esc(title)}</h4>
      <table class="vis" style="width:100%; table-layout:auto;">
        <tr>
          <th style="width:1%; white-space:nowrap;">Date</th>
          <th style="text-align:right;">Δ</th>
          <th>Bar</th>
        </tr>
        ${rows.map(r => {
          const v = getValFn(r);
          const w = Math.round((Math.abs(v) / maxAbs) * 100);
          const color = v > 0 ? "green" : v < 0 ? "red" : "#999";
          return `
            <tr>
              <td class="lit-item nowrap">${esc(r.date)}</td>
              <td class="lit-item" style="text-align:right;">${esc(fmtSigned(v))}</td>
              <td class="lit-item">
                <div style="overflow:hidden; font-size:10px; text-align:center; color:#fff; height:15px; width:${w}%; background-color:${color};">
                  ${esc(fmtSigned(v))}
                </div>
              </td>
            </tr>
          `;
        }).join("")}
      </table>
    `;
  }

  function renderTwStatsHistoryAndCharts(tw) {
    const hist = takeLastNDays(tw.history || [], CFG.maxDays);
    if (!hist.length) return "";

    // Prefer villages change from conquer periods if present, else history villagesDelta
    const conq = takeLastNDays(tw.conquer || [], CFG.maxDays);
    const villagesFromConq = conq.length ? conq : null;

    const charts = [
      renderHorizontalBars(t("chartPoints"), hist, (r) => r.pointsDelta || 0),
      renderHorizontalBars(
        t("chartVillages"),
        villagesFromConq ? villagesFromConq : hist,
        (r) => villagesFromConq ? (r.net || 0) : (r.villagesDelta || 0)
      ),
      renderHorizontalBars(t("chartOD"), hist, (r) => r.odDelta || 0),
    ].join("");

    const table = `
      <h3 style="margin:12px 0 8px 0;">${esc(t("twstatsHistory30"))}</h3>
      <table class="vis" style="width:100%; table-layout:auto;">
        <tr>
          <th>Date</th>
          <th style="text-align:right;">Points (Δ)</th>
          <th style="text-align:right;">Villages (Δ)</th>
          <th style="text-align:right;">OD (Δ)</th>
          <th style="text-align:right;">ODA (Δ)</th>
          <th style="text-align:right;">ODD (Δ)</th>
        </tr>
        ${hist.map(r => `
          <tr>
            <td class="lit-item nowrap">${esc(r.date)}</td>
            <td class="lit-item" style="text-align:right;">${esc(fmtDots(r.pointsValue))} (${esc(fmtSigned(r.pointsDelta))})</td>
            <td class="lit-item" style="text-align:right;">${esc(fmtDots(r.villagesValue))} (${esc(fmtSigned(r.villagesDelta))})</td>
            <td class="lit-item" style="text-align:right;">${esc(fmtDots(r.odValue))} (${esc(fmtSigned(r.odDelta))})</td>
            <td class="lit-item" style="text-align:right;">${esc(fmtDots(r.odaValue))} (${esc(fmtSigned(r.odaDelta))})</td>
            <td class="lit-item" style="text-align:right;">${esc(fmtDots(r.oddValue))} (${esc(fmtSigned(r.oddDelta))})</td>
          </tr>
        `).join("")}
      </table>
    `;

    const conqTable = conq.length ? `
      <h3 style="margin:12px 0 8px 0;">${esc(t("twstatsConquer30"))}</h3>
      <table class="vis" style="width:100%; table-layout:auto;">
        <tr>
          <th>Date</th>
          <th style="text-align:right;">Conquers</th>
          <th style="text-align:right;">+Gain</th>
          <th style="text-align:right;">Neutral</th>
          <th style="text-align:right;">-Loss</th>
          <th style="text-align:right;">Net</th>
        </tr>
        ${conq.map(r => `
          <tr>
            <td class="lit-item nowrap">${esc(r.date)}</td>
            <td class="lit-item" style="text-align:right;">${esc(fmtDots(r.conquers))}</td>
            <td class="lit-item" style="text-align:right;">${esc(fmtSigned(r.gain))}</td>
            <td class="lit-item" style="text-align:right;">${esc(fmtDots(r.neutral))}</td>
            <td class="lit-item" style="text-align:right;">-${esc(fmtDots(r.loss))}</td>
            <td class="lit-item" style="text-align:right;">${esc(fmtSigned(r.net))}</td>
          </tr>
        `).join("")}
      </table>
    ` : "";

    return charts + table + conqTable;
  }

  function renderTwStats(tw) {
    const $out = $("#" + IDS.outTw);
    if (!$out.length) return;

    const snap = renderTwStatsSnapshot(tw);
    const hist = renderTwStatsHistoryAndCharts(tw);

    $out.html(snap + hist);
  }

  // --------------------- notes ---------------------
  function loadNotes() {
    try {
      const raw = localStorage.getItem(CFG.storageKeyNotes);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) {
      return [];
    }
  }

  function saveNote() {
    const last = STATE.last;
    if (!last || (!last.daily && !last.twstats)) {
      bad(t("nothingToSave"));
      return;
    }

    const notes = loadNotes();
    notes.unshift({
      ts: new Date().toISOString(),
      playerName: last.playerName || "",
      playerId: last.playerId || null,
      daily: last.daily || null,
      twstats: last.twstats || null,
    });

    try {
      localStorage.setItem(CFG.storageKeyNotes, JSON.stringify(notes));
      ok(t("noteSaved"));
    } catch (e) {
      bad(e && e.message ? e.message : e);
    }
  }

  // --------------------- main fetch logic ---------------------
  async function fetchAndRenderDaily(playerName, playerIdHint) {
    hideStatus();
    showStatus(t("fetching"), false);

    const types = [
      { key: "loot_res", label: "Resources Plundered" },
      { key: "loot_vil", label: "Villages Plundered" },
      { key: "scavenge", label: "Resources Gathered" },
      { key: "conquer", label: "Villages Conquered" },
    ];

    // resolve playerId if missing (needed later for profile/twstats)
    let playerId = playerIdHint || null;
    let canonicalName = playerName;

    try {
      if (!playerId) {
        const resolved = await resolvePlayerByName(playerName);
        playerId = resolved.playerId;
        canonicalName = resolved.canonicalName || playerName;
      }

      const results = await Promise.all(types.map(t2 => getDailyByName(t2.key, canonicalName)));
      const rows = results.map((res, i) => ({
        label: types[i].label,
        score: res.score || 0,
        date: res.date || "",
      }));

      renderDailyRecords(canonicalName, playerId, rows);

      STATE.last.playerName = canonicalName;
      STATE.last.playerId = playerId;
      STATE.last.daily = { rows };

      showStatus(t("done"), false);
      ok(t("done"));
    } catch (e) {
      showStatus(String(e && e.message ? e.message : e), true);
      bad(e && e.message ? e.message : e);
    }
  }

  async function fetchAndRenderTwStats(playerId, twstatsUrlMaybe) {
    if (!playerId) {
      showStatus("Player ID is missing (select a player or fetch records first).", true);
      return;
    }

    showStatus("Fetching TWStats...", false);

    try {
      const tw = await fetchTwStatsAll(playerId, twstatsUrlMaybe);
      renderTwStats(tw);

      STATE.last.twstats = {
        urls: tw.urls,
        profile: tw.profile,
        history: takeLastNDays(tw.history, CFG.maxDays),
        conquer: takeLastNDays(tw.conquer, CFG.maxDays),
      };

      showStatus(t("done"), false);
      ok(t("done"));
    } catch (e) {
      // likely CORS
      showStatus(t("twstatsBlocked"), true);
      bad(t("twstatsBlocked"));
      log("TWStats error:", e);
    }
  }

  // --------------------- UI bind ---------------------
  function bindUI() {
    const $input = $("#" + IDS.input);
    const $sel = $("#" + IDS.select);
    const $fetch = $("#" + IDS.btnFetch);
    const $clear = $("#" + IDS.btnClear);
    const $save = $("#" + IDS.btnSave);
    const $lang = $("#" + IDS.lang);
    const $twFetch = $("#" + IDS.btnTwFetch);
    const $twOpen = $("#" + IDS.btnTwOpen);

    if (!$input.length || !$sel.length || !$fetch.length || !$clear.length) {
      throw new Error("UI elements not found (dialog render failed).");
    }

    let lastOptions = [];
    let timer = null;

    function currentChoice() {
      const selOpt = $sel.find("option:selected");
      const selName = selOpt.attr("data-name") || "";
      const selId = $sel.val() ? String($sel.val()) : null;

      const typed = String($input.val() || "").trim();
      const name = selName ? selName : typed;

      return { name, id: selId };
    }

    $lang.off("change").on("change", function () {
      const v = String($lang.val() || "en");
      STATE.lang = (v === "tr") ? "tr" : "en";
      // re-render dialog fully (keep last state)
      showDialog(true);
    });

    $input.off("input").on("input", function () {
      const term = String($input.val() || "").trim();
      hideStatus();

      if (timer) clearTimeout(timer);
      timer = setTimeout(async () => {
        const tterm = String($input.val() || "").trim();
        if (tterm.length < 2) {
          lastOptions = [];
          fillSelect([]);
          return;
        }

        showStatus(t("searching"), false);
        try {
          const opts = await searchPlayers(tterm);
          lastOptions = opts;
          fillSelect(opts);

          if (opts.length) showStatus(t("foundN", opts.length), false);
          else showStatus(t("noMatches"), false);
        } catch (e) {
          lastOptions = [];
          fillSelect([]);
          showStatus(`Autocomplete failed: ${String(e && e.message ? e.message : e)}`, true);
        }
      }, CFG.debounceMs);
    });

    $sel.off("change").on("change", function () {
      hideStatus();
      const opt = $sel.find("option:selected");
      const name = opt.attr("data-name");
      if (name) $input.val(name);
    });

    $fetch.off("click").on("click", async function () {
      hideStatus();
      const c = currentChoice();
      if (!c.name) {
        showStatus("Type a player name (or select one) first.", true);
        return;
      }
      await fetchAndRenderDaily(c.name, c.id);
    });

    $twFetch.off("click").on("click", async function () {
      hideStatus();

      // Prefer current detected twstats url (if on profile), else use stored last
      const ctxTw = findTwStatsUrlInProfileDom();
      const pid = STATE.last.playerId || (detectPlayerFromCurrentPage() && detectPlayerFromCurrentPage().playerId) || null;

      await fetchAndRenderTwStats(pid, ctxTw);
    });

    $twOpen.off("click").on("click", function () {
      // if on profile page, use its userfile link; else try build from last playerId
      const ctxTw = findTwStatsUrlInProfileDom();
      const pid = STATE.last.playerId || null;
      const base = makeTwStatsBase(getWorld(), ctxTw);
      const url = ctxTw || (pid && base ? `${base}index.php?page=player&id=${encodeURIComponent(pid)}&tab=info` : null);
      if (!url) {
        showStatus("TWStats URL not available yet (open a player profile or fetch records first).", true);
        return;
      }
      window.open(url, "_blank");
    });

    $save.off("click").on("click", function () {
      saveNote();
    });

    $clear.off("click").on("click", function () {
      hideStatus();
      $input.val("");
      fillSelect([]);
      $("#" + IDS.outDaily).empty();
      $("#" + IDS.outTw).empty();
      $("#" + IDS.btnOpen).hide().off("click");
      STATE.last.daily = null;
      STATE.last.twstats = null;
    });

    // initial select state
    fillSelect([]);
  }

  function showDialog(isRerender) {
    const html = buildDialogHtml();
    if (window.Dialog && Dialog.show) {
      Dialog.show(CFG.name, html);
    } else {
      // fallback: append to body
      const $wrap = $("<div/>").html(html);
      $("body").append($wrap);
    }

    setTimeout(() => {
      try {
        bindUI();

        // auto-detect player on profile page
        const ctx = detectPlayerFromCurrentPage();
        if (ctx && ctx.playerName) {
          $("#" + IDS.input).val(ctx.playerName);
          // set select to id (disabled if empty but we can still store)
          const $sel = $("#" + IDS.select);
          // ensure at least one option so value can be stored visually (optional)
          // We won't add fake option; just keep typed name and id in STATE
          STATE.last.playerId = ctx.playerId || STATE.last.playerId;
          showStatus(t("detected"), false);
        } else if (!isRerender) {
          showStatus("Type at least 2 characters to search players.", false);
        }
      } catch (e) {
        bad(e && e.message ? e.message : e);
      }
    }, 0);
  }

  async function run() {
    try {
      if (typeof $ === "undefined") throw new Error("jQuery is missing ($ is undefined).");
      showDialog(false);
      ok(`${CFG.name} ${CFG.version} loaded.`);
    } catch (e) {
      bad(e && e.message ? e.message : e);
    }
  }

  // expose entry points for your loader
  window.YAVER = window.YAVER || {};
  window.YAVER.run = run;
  window.YAVER.teleskop = window.YAVER.teleskop || {};
  window.YAVER.teleskop.run = run;

  run();
})();
