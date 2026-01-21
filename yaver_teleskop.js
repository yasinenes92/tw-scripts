/* =======================================================================
   Yaver Daily Records v1.0.0 (TribalWars / DS)
   - Player name autocomplete (like game) -> select list
   - Fetch 4x In-a-day records:
       loot_res, loot_vil, scavenge, conquer
   - Render as TW-like "vis" table (no fixed width/height)
   ======================================================================= */
(function () {
  "use strict";

  const CFG = {
    version: "v1.0.0",
    debug: false,
    debounceMs: 250,
    ajaxTimeoutMs: 25000,
  };

  function log(...a) { if (CFG.debug) console.log("[YaverDaily]", ...a); }
  function err(...a) { console.error("[YaverDaily]", ...a); }

  function ok(msg) {
    log(msg);
    if (window.UI && UI.SuccessMessage) UI.SuccessMessage(msg, 1600);
  }
  function bad(msg) {
    err(msg);
    if (window.UI && UI.ErrorMessage) UI.ErrorMessage(String(msg), 7000);
  }

  // ---------- URL helpers (same pattern as your v16) ----------
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

  // ---------- network ----------
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

  // ---------- formatting ----------
  function parseDotsInt(s) {
    return parseInt(String(s || "").replace(/\./g, "").replace(/[^\d]/g, ""), 10) || 0;
  }
  function fmtDots(n) {
    const x = Math.round(Number(n) || 0).toString();
    return x.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  }
  function esc(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  }

  // ---------- parsing (same idea as v16) ----------
  function parseInADayScoreForName(html, expectedName) {
    const $doc = $(html);
    const $t = $doc.find("#in_a_day_ranking_table");
    if (!$t.length) return { score: 0, date: "" };

    const rows = [];
    $t.find("tr").slice(1).each(function () {
      const $td = $(this).find("td");
      if ($td.length < 5) return;
      const name = $td.eq(1).text().trim();
      const score = parseDotsInt($td.eq(3).text());
      const date = $td.eq(4).text().trim();
      rows.push({ name, score, date });
    });

    const exact = rows.find(r => r.name === expectedName);
    if (exact) return { score: exact.score || 0, date: exact.date || "" };
    if (rows.length) return { score: rows[0].score || 0, date: rows[0].date || "" };
    return { score: 0, date: "" };
  }

  const dailyCache = new Map();
  async function getDailyByName(type, playerName) {
    const key = `${type}|${playerName}`;
    if (dailyCache.has(key)) return dailyCache.get(key);

    const html = await getHtml(urlInADayByName(type, playerName));
    const res = parseInADayScoreForName(html, playerName);

    dailyCache.set(key, res);
    return res;
  }

  // ---------- autocomplete ----------
  function getAutoCompleteUrl() {
    if (window.UI && UI.AutoComplete && typeof UI.AutoComplete.url === "string" && UI.AutoComplete.url) {
      return UI.AutoComplete.url;
    }
    return null;
  }

  function normalizeAutocompleteResponse(data) {
    // Possible shapes: [{id,label,value,name,...}], {items:[...]}, {result:[...]}, ...
    let arr = [];
    if (Array.isArray(data)) arr = data;
    else if (data && Array.isArray(data.items)) arr = data.items;
    else if (data && Array.isArray(data.result)) arr = data.result;
    else if (data && Array.isArray(data.suggestions)) arr = data.suggestions;
    else if (data && Array.isArray(data.data)) arr = data.data;

    const out = [];
    for (const it of arr) {
      if (typeof it === "string") {
        out.push({ id: null, name: it });
        continue;
      }
      if (!it || typeof it !== "object") continue;

      const name = (it.label || it.value || it.name || it.text || "").toString().trim();
      const id = (it.id || it.player_id || it.uid || it.value_id || it.key || null);
      if (name) out.push({ id: id != null ? String(id) : null, name });
    }

    // de-dup by name (keep first)
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
    if (!acUrl) throw new Error("UI.AutoComplete.url bulunamadı. Autocomplete aktif değil gibi.");

    // Most TW worlds accept: ?term=...&type=player
    // If your world differs, you can tweak params here.
    const data = await $.ajax({
      url: acUrl,
      method: "GET",
      dataType: "json",
      timeout: CFG.ajaxTimeoutMs,
      data: { term, type: "player" },
    });

    return normalizeAutocompleteResponse(data);
  }

  // ---------- UI ----------
  const IDS = {
    root: "yaver_daily_root",
    input: "yaver_daily_name",
    select: "yaver_daily_select",
    status: "yaver_daily_status",
    btnFetch: "yaver_daily_fetch",
    btnClear: "yaver_daily_clear",
    btnOpen: "yaver_daily_open",
    out: "yaver_daily_out",
  };

  function buildDialogHtml() {
    // Use TW's existing CSS classes (btn, vis) for native look
    return `
      <div id="${IDS.root}">
        <h3 style="margin:0 0 8px 0;">Yaver Daily Records (${CFG.version})</h3>

        <table class="vis" style="width:100%; table-layout:auto;">
          <tr>
            <th style="text-align:left;">Player</th>
            <td>
              <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
                <input id="${IDS.input}" class="autocomplete" data-type="player" type="text" placeholder="Type player name..." />
                <select id="${IDS.select}"></select>

                <a class="btn" id="${IDS.btnFetch}">Get Records</a>
                <a class="btn" id="${IDS.btnClear}">Clear</a>
                <a class="btn" id="${IDS.btnOpen}" style="display:none;">Open Profile</a>
              </div>
              <div id="${IDS.status}" class="info_box" style="display:none; margin-top:6px;">
                <div class="content"></div>
              </div>
            </td>
          </tr>
        </table>

        <div id="${IDS.out}" style="margin-top:10px;"></div>
      </div>
    `;
  }

  function showStatus(msg, isError) {
    const $box = $("#" + IDS.status);
    const $content = $box.find(".content");
    if (!$box.length) return;

    $content.text(msg);
    $box.removeClass("error_box info_box");
    $box.addClass(isError ? "error_box" : "info_box");
    $box.show();
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
      $sel.append(`<option value="">(no matches)</option>`);
      return;
    }
    $sel.append(`<option value="">(select)</option>`);
    for (const o of options) {
      const val = o.id ? esc(o.id) : "";
      $sel.append(`<option value="${val}" data-name="${esc(o.name)}">${esc(o.name)}${o.id ? " (" + esc(o.id) + ")" : ""}</option>`);
    }
  }

  function renderRecords(playerName, playerId, rows) {
    const $out = $("#" + IDS.out);
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

  async function fetchAndRender(playerName, playerId) {
    hideStatus();
    ok("Fetching daily records...");

    const types = [
      { key: "loot_res", label: "Resources Plundered" },
      { key: "loot_vil", label: "Villages Plundered" },
      { key: "scavenge", label: "Resources Gathered" },
      { key: "conquer", label: "Villages Conquered" },
    ];

    try {
      const results = await Promise.all(types.map(t => getDailyByName(t.key, playerName)));
      const rows = results.map((res, i) => ({
        label: types[i].label,
        score: res.score || 0,
        date: res.date || "",
      }));
      renderRecords(playerName, playerId, rows);
      ok("Done ✅");
    } catch (e) {
      bad(e && e.message ? e.message : e);
      showStatus(String(e && e.message ? e.message : e), true);
    }
  }

  function bindUI() {
    const $input = $("#" + IDS.input);
    const $sel = $("#" + IDS.select);
    const $fetch = $("#" + IDS.btnFetch);
    const $clear = $("#" + IDS.btnClear);

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

    $input.off("input").on("input", function () {
      const term = String($input.val() || "").trim();
      hideStatus();

      if (timer) clearTimeout(timer);
      timer = setTimeout(async () => {
        const t = String($input.val() || "").trim();
        if (t.length < 2) {
          lastOptions = [];
          fillSelect([]);
          return;
        }

        showStatus("Searching players...", false);
        try {
          const opts = await searchPlayers(t);
          lastOptions = opts;
          fillSelect(opts);
          if (opts.length) showStatus(`Found ${opts.length} player(s). Select from list.`, false);
          else showStatus("No matches. You can still try exact name and press Get Records.", false);
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
      await fetchAndRender(c.name, c.id);
    });

    $clear.off("click").on("click", function () {
      hideStatus();
      $input.val("");
      fillSelect([]);
      $("#" + IDS.out).empty();
      $("#" + IDS.btnOpen).hide().off("click");
    });

    // initial
    fillSelect([]);
  }

  function showDialog() {
    const html = buildDialogHtml();
    if (window.Dialog && Dialog.show) {
      Dialog.show(`Yaver Daily Records ${CFG.version}`, html);
    } else {
      // fallback: append to body
      const $wrap = $("<div/>").html(html);
      $("body").append($wrap);
    }

    setTimeout(() => {
      try {
        bindUI();
        showStatus("Type at least 2 characters to search players.", false);
      } catch (e) {
        bad(e && e.message ? e.message : e);
      }
    }, 0);
  }

  async function run() {
    try {
      if (typeof $ === "undefined") throw new Error("jQuery is missing ($ is undefined).");
      showDialog();
      ok(`Yaver Daily Records ${CFG.version} loaded.`);
    } catch (e) {
      bad(e && e.message ? e.message : e);
    }
  }

  window.YAVER = window.YAVER || {};
  window.YAVER.dailyRecords = run;

  run();
})();
