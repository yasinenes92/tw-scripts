(function () {
  "use strict";

  const CFG = {
    name: "Yaver Teleskop",
    version: "v4.0.0",
    author: "controleng",
    debug: false,
    debounceMs: 250,
    ajaxTimeoutMs: 25000,
    maxDays: 30,

    // TWStats: do NOT call twstats directly (CORS), use proxies only
    corsProxyEnabled: true,
    corsProxies: [
      // Very common CORS proxy
      (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
      // Another common proxy
      (url) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
      // Sometimes works, sometimes rate-limited
      (url) => `https://thingproxy.freeboard.io/fetch/${url}`,
    ],
  };

  // --------------------- logging ---------------------
  function log(...a) { if (CFG.debug) console.log("[YaverTeleskop]", ...a); }
  function err(...a) { console.error("[YaverTeleskop]", ...a); }
  function ok(msg) { if (window.UI && UI.SuccessMessage) UI.SuccessMessage(String(msg), 1800); }
  function bad(msg) { if (window.UI && UI.ErrorMessage) UI.ErrorMessage(String(msg), 7000); }

  // --------------------- i18n ---------------------
  const STATE = {
    lang: "en",
    last: {
      playerName: "",
      playerId: null,
      dailyRows: null,
      twstats: null, // { history:[{date, pointsDelta, villagesDelta, odDelta, ...}], snapshotRows? }
    },
  };

  const I18N = {
    en: {
      player: "Player",
      typeName: "Type player name...",
      select: "(select)",
      getRecords: "Get Records",
      clear: "Clear",
      openProfile: "Open Profile",
      copyBb: "Copy BBCode",
      lang: "Lang",
      detected: "Detected player from profile page.",
      searching: "Searching players...",
      foundN: (n) => `Found ${n} player(s). Select from list.`,
      noMatches: "No matches. You can still try exact name and press Get Records.",
      fetching: "Fetching daily records...",
      done: "Done ✅",
      twstatsFetch: "Fetch TWStats",
      twstatsOpen: "Open TWStats",
      twstatsBlocked: "TWStats fetch blocked. Use Manual CSV Import below.",
      twstatsProxyUsed: (p) => `TWStats fetched via proxy: ${p}`,
      manualTitle: "Manual TWStats Import (CSV)",
      manualHint: "Open TWStats → Player → History tab → click “Export as CSV” → copy textarea → paste here → Parse",
      parseCsv: "Parse CSV",
      parsedOk: "CSV parsed ✅",
      copyFail: "Copy failed. BBCode printed in console.",
      bbCopied: "BBCode copied ✅",
    },
    tr: {
      player: "Oyuncu",
      typeName: "Oyuncu adı yaz...",
      select: "(seç)",
      getRecords: "Verileri Çek",
      clear: "Temizle",
      openProfile: "Profili Aç",
      copyBb: "BBCode Kopyala",
      lang: "Dil",
      detected: "Profil sayfasından oyuncu algılandı.",
      searching: "Oyuncular aranıyor...",
      foundN: (n) => `${n} oyuncu bulundu. Listeden seç.`,
      noMatches: "Eşleşme yok. Tam ismi yazıp 'Verileri Çek' ile deneyebilirsin.",
      fetching: "Günlük rekorlar çekiliyor...",
      done: "Bitti ✅",
      twstatsFetch: "TWStats Çek",
      twstatsOpen: "TWStats Aç",
      twstatsBlocked: "TWStats çekimi engellendi. Aşağıdan CSV Import kullan.",
      twstatsProxyUsed: (p) => `TWStats proxy ile çekildi: ${p}`,
      manualTitle: "Manuel TWStats Import (CSV)",
      manualHint: "TWStats aç → Player → History → “Export as CSV” → textarea’yı kopyala → buraya yapıştır → Parse",
      parseCsv: "CSV Parse",
      parsedOk: "CSV parse edildi ✅",
      copyFail: "Kopyalama başarısız. BBCode console’a yazıldı.",
      bbCopied: "BBCode kopyalandı ✅",
    },
  };

  function t(key, ...args) {
    const dict = I18N[STATE.lang] || I18N.en;
    const v = dict[key];
    return typeof v === "function" ? v(...args) : (v ?? key);
  }

  // --------------------- helpers ---------------------
  function esc(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  }
  function parseNumberAny(s) {
    const x = String(s || "").replace(/[^\d\-\+]/g, "").trim();
    return parseInt(x, 10) || 0;
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
  function getWorld() {
    return (window.game_data && game_data.world) ? String(game_data.world) : "";
  }

  function urlInADayByName(type, playerName) {
    return `${base()}/game.php?village=${encodeURIComponent(villageId())}&screen=ranking&mode=in_a_day&type=${encodeURIComponent(type)}&name=${encodeURIComponent(playerName)}`;
  }
  function urlInfoPlayer(playerId) {
    return `${base()}/game.php?village=${encodeURIComponent(villageId())}&screen=info_player&id=${encodeURIComponent(playerId)}`;
  }

  // --------------------- network ---------------------
  const htmlCache = new Map();
  async function getHtml(url) {
    if (htmlCache.has(url)) return htmlCache.get(url);
    const p = $.ajax({ url, method: "GET", dataType: "html", timeout: CFG.ajaxTimeoutMs });
    htmlCache.set(url, p);
    return p;
  }

  function isTwStatsUrl(url) {
    return /\/\/(www\.)?twstats\.com\//i.test(String(url || ""));
  }

  async function getHtmlViaProxy(url) {
    if (!CFG.corsProxyEnabled) throw new Error("Proxy disabled.");
    let lastErr = null;

    for (const mk of CFG.corsProxies) {
      const purl = mk(url);
      try {
        const html = await $.ajax({ url: purl, method: "GET", dataType: "html", timeout: CFG.ajaxTimeoutMs });
        // basic sanity check
        if (String(html).length < 200) throw new Error("Proxy returned too short response.");
        return { html, proxy: purl };
      } catch (e) {
        lastErr = e;
      }
    }
    throw lastErr || new Error("All proxies failed.");
  }

  async function getHtmlCorsSafe(url) {
    // If TWStats => never direct (it will spam CORS errors). Use proxy only.
    if (isTwStatsUrl(url)) {
      const r = await getHtmlViaProxy(url);
      return r;
    }
    // normal same-origin
    return { html: await getHtml(url), proxy: null };
  }

  // --------------------- in-a-day parsing ---------------------
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
        name: $td.eq(1).text().trim(),
        playerId: pid,
        score: parseNumberAny($td.eq(3).text()),
        date: $td.eq(4).text().trim(),
      });
    });
    return out;
  }

  function pickRowForName(rows, expectedName) {
    const exact = rows.find(r => r.name === expectedName);
    return exact || rows[0] || null;
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
    if (window.UI && UI.AutoComplete && typeof UI.AutoComplete.url === "string" && UI.AutoComplete.url) return UI.AutoComplete.url;
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
      url: acUrl, method: "GET", dataType: "json", timeout: CFG.ajaxTimeoutMs,
      data: { term, type: "player" },
    });
    return normalizeAutocompleteResponse(data);
  }

  // --------------------- detect from info_player ---------------------
  function detectPlayerFromCurrentPage() {
    const isInfoPlayer =
      (window.game_data && game_data.screen === "info_player") ||
      /screen=info_player/.test(String(window.location.search || ""));

    if (!isInfoPlayer) return null;

    let pid = null;
    const m = String(window.location.search || "").match(/(?:\?|&)id=(\d+)/);
    if (m) pid = m[1];
    if (!pid && window.InfoPlayer && InfoPlayer.player_id) pid = String(InfoPlayer.player_id);

    let name = "";
    const $n1 = $("#content_value h2 span").first();
    if ($n1.length) name = $n1.text().trim();
    if (!name) {
      const $n2 = $("#player_info th span").first();
      if ($n2.length) name = $n2.text().trim();
    }

    return (pid || name) ? { playerId: pid ? String(pid) : null, playerName: name } : null;
  }

  function findTwStatsUrlInProfileDom() {
    const $a = $("a[href*='twstats.com']").first();
    const href = $a.attr("href");
    return href ? String(href) : null;
  }

  function parseTwStatsWorldFromUrl(u) {
    try {
      const url = new URL(u);
      const m = url.pathname.match(/\/(in\/)?(en\d+)\//i);
      return m ? m[2].toLowerCase() : "";
    } catch (_) { return ""; }
  }

  function makeTwStatsBase(world, twstatsUrlMaybe) {
    const w = world || parseTwStatsWorldFromUrl(twstatsUrlMaybe) || getWorld();
    if (!w) return null;
    return `https://www.twstats.com/${w}/`;
  }

  function twstatsUrls(playerId, twstatsUrlMaybe) {
    const baseUrl = makeTwStatsBase(getWorld(), twstatsUrlMaybe);
    if (!baseUrl) return null;
    return {
      base: baseUrl,
      profile: `${baseUrl}index.php?page=player&id=${encodeURIComponent(playerId)}&tab=info`,
      history: `${baseUrl}index.php?page=player&id=${encodeURIComponent(playerId)}&tab=history`,
    };
  }

  function parseTwStatsProfileSnapshot(html) {
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
    return rows;
  }

  function parseCsvHistory(text) {
    // expects lines like:
    // 2026-01-21,Cocothecoc,coco,8,589326,237,64968,11025,53943
    const lines = String(text || "").split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const rows = [];
    for (const line of lines) {
      const parts = line.split(",");
      if (parts.length < 6) continue;
      const date = parts[0];
      const points = parseNumberAny(parts[4]);
      const villages = parseNumberAny(parts[5]);
      const od = parts[6] != null ? parseNumberAny(parts[6]) : 0;
      rows.push({ date, points, villages, od });
    }
    // sort ascending by date
    rows.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

    // compute deltas
    const out = [];
    for (let i = 0; i < rows.length; i++) {
      const cur = rows[i];
      const prev = rows[i - 1];
      out.push({
        date: cur.date,
        pointsValue: cur.points,
        villagesValue: cur.villages,
        odValue: cur.od,
        pointsDelta: prev ? (cur.points - prev.points) : 0,
        villagesDelta: prev ? (cur.villages - prev.villages) : 0,
        odDelta: prev ? (cur.od - prev.od) : 0,
      });
    }
    return out;
  }

  function takeLastNDays(arr, n) {
    // arr is ascending; take last n then reverse to newest-first for charts
    const slice = arr.slice(Math.max(0, arr.length - n));
    return slice.reverse();
  }

  // --------------------- charts rendering ---------------------
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
                <div style="overflow:hidden; font-size:0.9em; line-height:1.2em; text-align:center; color:#fff; width:${w}%; background-color:${color};">
                  ${esc(fmtSigned(v))}
                </div>
              </td>
            </tr>
          `;
        }).join("")}
      </table>
    `;
  }

  // --------------------- BBCode copy ---------------------
  function getServerDateTimeText() {
    const d = ($("#serverDate").text() || "").trim();
    const t2 = ($("#serverTime").text() || "").trim();
    if (d && t2) return `${d} ${t2}`;
    return new Date().toISOString();
  }

  function buildBBCode() {
    const dt = getServerDateTimeText();
    const name = STATE.last.playerName || "";
    const pid = STATE.last.playerId || "";
    const daily = STATE.last.dailyRows || [];
    const tw = STATE.last.twstats;

    let s = "";
    s += `[quote][b]${CFG.name}[/b] (${dt})\n`;
    s += `[b]Player:[/b] ${name}${pid ? ` (ID: ${pid})` : ""}\n\n`;

    if (daily.length) {
      s += `[b]Daily Records[/b]\n[list]\n`;
      for (const r of daily) s += `[*]${r.label} | ${fmtDots(r.score)} | ${r.date}\n`;
      s += `[/list]\n\n`;
    }

    if (tw && tw.history && tw.history.length) {
      s += `[b]TWStats History (last ${Math.min(CFG.maxDays, tw.history.length)} days)[/b]\n`;
      s += `[table]\n[**]Date[||]Points Δ[||]Villages Δ[||]OD Δ[/**]\n`;
      for (const r of tw.history) {
        s += `[*]${r.date}[|]${fmtSigned(r.pointsDelta)}[|]${fmtSigned(r.villagesDelta)}[|]${fmtSigned(r.odDelta)}\n`;
      }
      s += `[/table]\n\n`;
    }

    s += `[/quote]`;
    return s;
  }

  async function copyToClipboard(text) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch (_) {}
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      ta.style.top = "0";
      document.body.appendChild(ta);
      ta.focus(); ta.select();
      const ok2 = document.execCommand("copy");
      document.body.removeChild(ta);
      return !!ok2;
    } catch (_) { return false; }
  }

  // --------------------- UI ---------------------
  const IDS = {
    root: "yaver_teleskop_root",
    input: "yaver_teleskop_name",
    select: "yaver_teleskop_select",
    status: "yaver_teleskop_status",
    btnFetch: "yaver_teleskop_fetch",
    btnClear: "yaver_teleskop_clear",
    btnCopy: "yaver_teleskop_copy",
    btnOpen: "yaver_teleskop_open",
    lang: "yaver_teleskop_lang",
    outDaily: "yaver_teleskop_out_daily",
    outTw: "yaver_teleskop_out_tw",
    btnTwFetch: "yaver_teleskop_tw_fetch",
    btnTwOpen: "yaver_teleskop_tw_open",
    csvBox: "yaver_teleskop_csv",
    btnParse: "yaver_teleskop_parse",
  };

  function showStatus(msg, isError) {
    const $box = $("#" + IDS.status);
    const $content = $box.find(".content");
    if (!$box.length) return;
    $content.text(String(msg));
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
                <a class="btn" id="${IDS.btnCopy}">${esc(t("copyBb"))}</a>

                <span style="margin-left:auto; display:flex; gap:6px; align-items:center;">
                  <span style="font-size:11px; opacity:0.85;">${esc(t("lang"))}</span>
                  <select id="${IDS.lang}">
                    <option value="en"${STATE.lang === "en" ? " selected" : ""}>EN</option>
                    <option value="tr"${STATE.lang === "tr" ? " selected" : ""}>TR</option>
                  </select>
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

          <h4 style="margin:12px 0 6px 0;">${esc(t("manualTitle"))}</h4>
          <div class="info_box" style="margin-bottom:6px;">
            <div class="content">${esc(t("manualHint"))}</div>
          </div>
          <textarea id="${IDS.csvBox}" style="width:100%; box-sizing:border-box;"></textarea>
          <div style="margin-top:6px;">
            <a class="btn" id="${IDS.btnParse}">${esc(t("parseCsv"))}</a>
          </div>
        </div>
      </div>
    `;
  }

  function renderDailyRecords(playerName, playerId, rows) {
    const $out = $("#" + IDS.outDaily);
    if (!$out.length) return;

    const table = `
      <h3 style="margin:0 0 8px 0;">Daily Records: <span class="nowrap">${esc(playerName)}</span></h3>
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
    $out.html(table);

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

  function renderTwStatsFromHistory(historyNewestFirst, snapshotRows) {
    const $out = $("#" + IDS.outTw);
    if (!$out.length) return;

    let html = "";
    if (snapshotRows && snapshotRows.length) {
      html += `<h3 style="margin:0 0 8px 0;">TWStats Snapshot</h3>`;
      html += `<table class="vis" style="width:100%; table-layout:auto;">
        <tr><th style="text-align:left;">Key</th><th style="text-align:left;">Value</th></tr>
        ${snapshotRows.map(r => `<tr><td class="lit-item">${esc(r.key)}</td><td class="lit-item">${esc(r.value)}</td></tr>`).join("")}
      </table>`;
    }

    if (historyNewestFirst && historyNewestFirst.length) {
      html += renderHorizontalBars("Daily Points Gain", historyNewestFirst, r => r.pointsDelta || 0);
      html += renderHorizontalBars("Daily Villages Change", historyNewestFirst, r => r.villagesDelta || 0);
      html += renderHorizontalBars("Daily OD Gain", historyNewestFirst, r => r.odDelta || 0);
    }

    $out.html(html);
  }

  // --------------------- main logic ---------------------
  async function fetchAndRenderDaily(playerName, playerIdHint) {
    hideStatus();
    showStatus(t("fetching"), false);

    const types = [
      { key: "loot_res", label: "Resources Plundered" },
      { key: "loot_vil", label: "Villages Plundered" },
      { key: "scavenge", label: "Resources Gathered" },
      { key: "conquer", label: "Villages Conquered" },
    ];

    let playerId = playerIdHint || null;
    let canonicalName = playerName;

    try {
      if (!playerId) {
        const resolved = await resolvePlayerByName(playerName);
        playerId = resolved.playerId;
        canonicalName = resolved.canonicalName || playerName;
      }

      const results = await Promise.all(types.map(tt => getDailyByName(tt.key, canonicalName)));
      const rows = results.map((res, i) => ({
        label: types[i].label,
        score: res.score || 0,
        date: res.date || "",
      }));

      STATE.last.playerName = canonicalName;
      STATE.last.playerId = playerId;
      STATE.last.dailyRows = rows;

      renderDailyRecords(canonicalName, playerId, rows);

      showStatus(t("done"), false);
      ok(t("done"));
    } catch (e) {
      showStatus(String(e && e.message ? e.message : e), true);
      bad(e && e.message ? e.message : e);
    }
  }

  async function fetchAndRenderTwStats() {
    const pid = STATE.last.playerId || (detectPlayerFromCurrentPage() && detectPlayerFromCurrentPage().playerId) || null;
    const ctxTw = findTwStatsUrlInProfileDom();
    if (!pid) {
      showStatus("Player ID is missing (open a profile or fetch records first).", true);
      return;
    }

    const urls = twstatsUrls(pid, ctxTw);
    if (!urls) {
      showStatus("TWStats base URL could not be built.", true);
      return;
    }

    showStatus("Fetching TWStats...", false);

    try {
      const r1 = await getHtmlCorsSafe(urls.profile);
      const snap = parseTwStatsProfileSnapshot(r1.html);

      const r2 = await getHtmlCorsSafe(urls.history);
      // If proxy succeeded, parse the History HTML's export textarea if present, else parse table is harder.
      // We do robust path: if textarea#export exists, parse it as CSV lines.
      const $doc = $(r2.html);
      const csv = ($doc.find("#export").text() || "").trim();

      if (!csv) throw new Error("No CSV export found in fetched history HTML.");

      const histAsc = parseCsvHistory(csv);
      const hist = takeLastNDays(histAsc, CFG.maxDays);

      STATE.last.twstats = { history: hist, snapshot: snap };
      renderTwStatsFromHistory(hist, snap);

      showStatus(t("twstatsProxyUsed", r2.proxy || "proxy"), false);
      ok(t("done"));
    } catch (e) {
      showStatus(t("twstatsBlocked"), true);
      bad(t("twstatsBlocked"));
      log("TWStats fetch error:", e);
    }
  }

  function manualParseCsv() {
    try {
      const text = $("#" + IDS.csvBox).val() || "";
      const histAsc = parseCsvHistory(text);
      const hist = takeLastNDays(histAsc, CFG.maxDays);

      STATE.last.twstats = { history: hist, snapshot: null };
      renderTwStatsFromHistory(hist, null);

      showStatus(t("parsedOk"), false);
      ok(t("parsedOk"));
    } catch (e) {
      showStatus(String(e && e.message ? e.message : e), true);
      bad(e && e.message ? e.message : e);
    }
  }

  // --------------------- UI bind ---------------------
  function bindUI() {
    const $input = $("#" + IDS.input);
    const $sel = $("#" + IDS.select);
    const $fetch = $("#" + IDS.btnFetch);
    const $clear = $("#" + IDS.btnClear);
    const $copy = $("#" + IDS.btnCopy);
    const $lang = $("#" + IDS.lang);
    const $twFetch = $("#" + IDS.btnTwFetch);
    const $twOpen = $("#" + IDS.btnTwOpen);
    const $parse = $("#" + IDS.btnParse);

    let timer = null;

    function currentChoice() {
      const selOpt = $sel.find("option:selected");
      const selName = selOpt.attr("data-name") || "";
      const selId = $sel.val() ? String($sel.val()) : null;
      const typed = String($input.val() || "").trim();
      return { name: selName ? selName : typed, id: selId };
    }

    $lang.off("change").on("change", function () {
      const v = String($lang.val() || "en");
      STATE.lang = (v === "tr") ? "tr" : "en";
      showDialog(true);
    });

    $input.off("input").on("input", function () {
      hideStatus();
      if (timer) clearTimeout(timer);
      timer = setTimeout(async () => {
        const term = String($input.val() || "").trim();
        if (term.length < 2) { fillSelect([]); return; }

        showStatus(t("searching"), false);
        try {
          const opts = await searchPlayers(term);
          fillSelect(opts);
          if (opts.length) showStatus(t("foundN", opts.length), false);
          else showStatus(t("noMatches"), false);
        } catch (e) {
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
      if (!c.name) { showStatus("Type a player name (or select one) first.", true); return; }
      await fetchAndRenderDaily(c.name, c.id);
    });

    $twFetch.off("click").on("click", async function () {
      await fetchAndRenderTwStats();
    });

    $twOpen.off("click").on("click", function () {
      const ctxTw = findTwStatsUrlInProfileDom();
      const pid = STATE.last.playerId || null;
      const baseUrl = makeTwStatsBase(getWorld(), ctxTw);
      const url = ctxTw || (pid && baseUrl ? `${baseUrl}index.php?page=player&id=${encodeURIComponent(pid)}&tab=history` : null);
      if (!url) { showStatus("TWStats URL not available yet.", true); return; }
      window.open(url, "_blank");
    });

    $parse.off("click").on("click", function () {
      manualParseCsv();
    });

    $copy.off("click").on("click", async function () {
      const bb = buildBBCode();
      const okc = await copyToClipboard(bb);
      if (okc) ok(t("bbCopied"));
      else {
        err("[YaverTeleskop] BBCode:\n", bb);
        bad(t("copyFail"));
      }
    });

    $clear.off("click").on("click", function () {
      hideStatus();
      $input.val("");
      fillSelect([]);
      $("#" + IDS.outDaily).empty();
      $("#" + IDS.outTw).empty();
      $("#" + IDS.btnOpen).hide().off("click");
      STATE.last.dailyRows = null;
      STATE.last.twstats = null;
    });

    fillSelect([]);
  }

  function showDialog(isRerender) {
    const html = buildDialogHtml();
    if (window.Dialog && Dialog.show) Dialog.show(CFG.name, html);
    else $("body").append($("<div/>").html(html));

    setTimeout(() => {
      bindUI();
      const ctx = detectPlayerFromCurrentPage();
      if (ctx && ctx.playerName) {
        $("#" + IDS.input).val(ctx.playerName);
        if (ctx.playerId) STATE.last.playerId = ctx.playerId;
        showStatus(t("detected"), false);
      } else if (!isRerender) {
        showStatus("Type at least 2 characters to search players.", false);
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

  window.YAVER = window.YAVER || {};
  window.YAVER.run = run;
  window.YAVER.teleskop = window.YAVER.teleskop || {};
  window.YAVER.teleskop.run = run;

  run();
})();
