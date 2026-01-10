/* =======================================================================
   Yaver Report v5.1  (TribalWars / DS)
   - Fix: Perf bar EN SAĞDA ✅
   - Strong error handling (UI + console)
   - Robust table discovery (rank_table yoksa fallback)
   - Works from any page; fetches ranking pages itself
   ======================================================================= */

(function () {
  "use strict";

  // --- Namespace
  window.YAVER_V5 = window.YAVER_V5 || {};
  const Y = window.YAVER_V5;

  const CFG = {
    version: "v5.1.0",
    topTribesLimit: 15,
    maxPagesPerType: 12,
    debug: true
  };

  // --- Logging
  function log(...a) { if (CFG.debug) console.log("[YaverV5]", ...a); }
  function warn(...a) { console.warn("[YaverV5]", ...a); }
  function error(...a) { console.error("[YaverV5]", ...a); }

  // --- UI helpers
  function ok(msg) {
    log("OK:", msg);
    if (window.UI && UI.SuccessMessage) UI.SuccessMessage(msg, 2000);
  }
  function bad(msg) {
    error("ERR:", msg);
    if (window.UI && UI.ErrorMessage) UI.ErrorMessage(msg, 6000);
  }

  // --- Format helpers
  function fmt(n) {
    const x = Math.round(Number(n) || 0).toString();
    return x.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  }
  function parseDotsInt(s) {
    return parseInt(String(s || "").replace(/\./g, "").replace(/[^\d]/g, ""), 10) || 0;
  }
  function escBB(s) {
    return String(s || "").replace(/\[/g, "(").replace(/\]/g, ")").trim();
  }
  function bar(val, maxVal) {
    const total = 12;
    const v = Number(val) || 0;
    const m = Number(maxVal) || 1;
    const r = Math.max(0, Math.min(1, m > 0 ? v / m : 0));
    const f = Math.round(r * total);
    return "█".repeat(f) + "░".repeat(total - f);
  }

  // --- Date normalize
  function serverTodayDDMMYYYY() {
    const d = String(window.server_date || (window.game_data && window.game_data.server_date) || "").trim();
    if (/^\d{2}\.\d{2}\.\d{4}$/.test(d)) return d;
    const m = d.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) return `${m[3]}.${m[2]}.${m[1]}`;
    const dt = new Date();
    return `${String(dt.getDate()).padStart(2, "0")}.${String(dt.getMonth() + 1).padStart(2, "0")}.${dt.getFullYear()}`;
  }
  function isTodayCell(text) {
    const t = String(text || "").trim().toLowerCase();
    if (!t) return false;
    if (t === "today") return true;
    return t === serverTodayDDMMYYYY().toLowerCase();
  }

  // --- URL builders
  function base() { return window.location.origin; }
  function villageId() {
    if (window.game_data && game_data.village && game_data.village.id) return String(game_data.village.id);
    const m = String(window.location.search || "").match(/village=(\d+)/);
    return m ? m[1] : "";
  }
  function urlInADay(type, offset) {
    return `${base()}/game.php?village=${encodeURIComponent(villageId())}&screen=ranking&mode=in_a_day&type=${encodeURIComponent(type)}&offset=${encodeURIComponent(offset || 0)}`;
  }
  function urlAlly(offset) {
    return `${base()}/game.php?village=${encodeURIComponent(villageId())}&screen=ranking&mode=ally&offset=${encodeURIComponent(offset || 0)}`;
  }

  // --- Network
  function getHtml(url) {
    return $.ajax({ url, method: "GET", dataType: "html" });
  }

  // --- Parsers
  function parseTodayRowsInADay(html) {
    const $doc = $(html);
    const $t = $doc.find("#in_a_day_ranking_table");
    if (!$t.length) return { rows: [], reason: "in_a_day_ranking_table yok" };

    const rows = [];
    $t.find("tr").slice(1).each(function () {
      const $td = $(this).find("td");
      if ($td.length < 5) return;

      const date = $td.eq(4).text().trim();
      if (!isTodayCell(date)) return;

      const tag = $td.eq(2).find("a").first().text().trim();
      if (!tag) return;

      const score = parseDotsInt($td.eq(3).text());
      rows.push({ tag, score });
    });

    return { rows, reason: "" };
  }

  function findAllyTable($doc) {
    // 1) Standart id
    let $t = $doc.find("#rank_table");
    if ($t.length) return $t;

    // 2) Fallback: th'lerde points/tribe geçen tablo
    let found = null;
    $doc.find("table.vis").each(function () {
      const th = $(this).find("th").text().toLowerCase();
      if (th.includes("points") && (th.includes("tribe") || th.includes("klan"))) {
        found = $(this);
        return false;
      }
    });
    return found || $();
  }

  function parseTopTribes(html, limit) {
    const $doc = $(html);
    const $t = findAllyTable($doc);
    if (!$t.length) return { tribes: [], reason: "Ally ranking tablosu bulunamadı (#rank_table + fallback yok)" };

    const tribes = [];
    $t.find("tr").slice(1).each(function () {
      if (tribes.length >= limit) return false;
      const $td = $(this).find("td");
      if ($td.length < 3) return;

      let tag = $td.eq(1).find("a").first().text().trim();
      if (!tag) tag = $td.eq(1).text().trim();
      const points = parseDotsInt($td.eq(2).text());
      if (!tag) return;

      tribes.push({ tag, points });
    });

    return { tribes, reason: "" };
  }

  // --- Fetch totals for a type (loot_res / loot_vil / scavenge)
  async function totalsByTribeToday(type) {
    const totals = {};
    let offset = 0;
    let emptyStreak = 0;

    for (let page = 0; page < CFG.maxPagesPerType; page++) {
      const url = urlInADay(type, offset);
      log("GET", url);

      let html;
      try {
        html = await getHtml(url);
      } catch (e) {
        throw new Error(`GET fail: type=${type} offset=${offset} status=${e && e.status ? e.status : ""}`);
      }

      const parsed = parseTodayRowsInADay(html);
      if (parsed.reason) warn(type, parsed.reason);

      if (!parsed.rows.length) emptyStreak++;
      else emptyStreak = 0;

      parsed.rows.forEach(r => {
        totals[r.tag] = (totals[r.tag] || 0) + (r.score || 0);
      });

      if (emptyStreak >= 2) break;

      // next offset from "down" link (best effort)
      const $doc = $(html);
      const downHref = $doc.find('a[href*="mode=in_a_day"][href*="offset="]:contains("down")').attr("href");
      const m = downHref ? downHref.match(/offset=(\d+)/) : null;
      offset = m ? parseInt(m[1], 10) : offset + 50;
    }

    return totals;
  }

  async function fetchTopTribes() {
    const html = await getHtml(urlAlly(0));
    const parsed = parseTopTribes(html, CFG.topTribesLimit);
    if (parsed.reason) throw new Error(parsed.reason);
    return parsed.tribes;
  }

  // --- Build report
  function buildReport(topTribes, lootRes, lootVil, scav) {
    const rows = topTribes.map((t, idx) => {
      const tag = t.tag;
      const points = t.points || 0;
      const lr = lootRes[tag] || 0;
      const lv = lootVil[tag] || 0;
      const sc = scav[tag] || 0;

      const totalRes = lr + sc;      // (loot_vil ayrı gösteriliyor)
      const score = points > 0 ? (totalRes / points) : 0;

      return { rank: idx + 1, tag, points, lr, lv, sc, totalRes, score };
    });

    const maxScore = rows.reduce((m, r) => Math.max(m, r.score), 0) || 1;
    rows.forEach(r => r.perf = bar(r.score, maxScore));

    const today = serverTodayDDMMYYYY();

    let bb = "";
    bb += `[b]Yaver Report ${CFG.version}[/b]\n`;
    bb += `Tarih: [b]${today}[/b]\n\n`;

    bb += `[b]WORLD TOP ${CFG.topTribesLimit}[/b]\n`;
    bb += `[table]\n`;
    // Perf EN SAĞDA ✅
    bb += `[**]Rank[||]Tribe[||]Total Pts[||]Loot Res[||]Scavenge[||]Total Res[||]Score[||]Perf[/**]\n`;

    rows.forEach(r => {
      bb += `[*]${r.rank}[|][ally]${escBB(r.tag)}[/ally][|]${fmt(r.points)}[|]${fmt(r.lr)}[|]${fmt(r.sc)}[|]${fmt(r.totalRes)}[|][b]${r.score.toFixed(2)}[/b][|]${r.perf}\n`;
    });

    bb += `[/table]\n\n`;
    bb += `[i]Score = (Bugün Loot Res + Bugün Scavenge) / Total Points. Perf bar normalize edilmiştir.[/i]\n`;

    return bb;
  }

  function showDialog(bb) {
    const id = "yaver_v5_textarea";
    const html = `
      <div style="max-width:980px;">
        <div style="margin:6px 0 10px 0;">
          <a class="btn" id="yaver_v5_copy">BBCode Kopyala</a>
        </div>
        <textarea id="${id}" style="width:100%;height:420px;"></textarea>
      </div>
    `;

    if (window.Dialog && Dialog.show) Dialog.show(`Yaver ${CFG.version}`, html);
    else $("body").append(html);

    setTimeout(() => {
      const ta = document.getElementById(id);
      if (ta) ta.value = bb;

      $("#yaver_v5_copy").off("click").on("click", async () => {
        try {
          if (navigator.clipboard && navigator.clipboard.writeText) await navigator.clipboard.writeText(bb);
          else { ta.select(); document.execCommand("copy"); }
          ok("Kopyalandı ✅");
        } catch {
          bad("Kopyalama başarısız ❌");
        }
      });
    }, 0);
  }

  // --- Run
  Y.run = async function () {
    try {
      if (typeof $ === "undefined") throw new Error("jQuery bulunamadı ($ undefined).");
      ok(`Yaver ${CFG.version} başladı...`);

      const topTribes = await fetchTopTribes();
      log("TopTribes:", topTribes.length);

      const [lootRes, lootVil, scav] = await Promise.all([
        totalsByTribeToday("loot_res"),
        totalsByTribeToday("loot_vil"),
        totalsByTribeToday("scavenge")
      ]);

      const bb = buildReport(topTribes, lootRes, lootVil, scav);
      showDialog(bb);
      ok("Rapor hazır ✅");
    } catch (e) {
      bad(String(e && e.message ? e.message : e));
    }
  };

  log("Loaded", CFG.version);

})();
