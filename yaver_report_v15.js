/* =======================================================================
   Yaver Report v15.0.0  (TribalWars / DS)

   v15 FIX:
   - Tribe TAG is now parsed from the ally "Properties" page:
     /game.php?screen=ally&mode=properties  -> row "Tag:" -> e.g. QWERTY
   - Fallbacks:
     (1) ally properties page (best)
     (2) info_ally page: table row "Tag:"
     (3) ranking player page: current player row -> tribe cell text
     (4) last resort: game_data.player.ally (may be numeric ally_id on some worlds)
   ======================================================================= */

(function () {
  "use strict";

  const CFG = {
    version: "v15.0.0",
    debug: true,

    topAlliesN: 15,
    allyRankingPagesToScan: 8,
    allyRankingOffsetStep: 25,

    ourTopPlayersN: 25,

    sleepEvery: 10,
    sleepMs: 180,
    ajaxTimeoutMs: 25000,
  };

  function log(...a) { if (CFG.debug) console.log("[YaverV15]", ...a); }
  function err(...a) { console.error("[YaverV15]", ...a); }

  function ok(msg) {
    log(msg);
    if (window.UI && UI.SuccessMessage) UI.SuccessMessage(msg, 1600);
  }
  function bad(msg) {
    err(msg);
    if (window.UI && UI.ErrorMessage) UI.ErrorMessage(String(msg), 7000);
  }

  // ---------- URL helpers ----------
  function base() { return window.location.origin; }
  function villageId() {
    if (window.game_data && game_data.village && game_data.village.id) return String(game_data.village.id);
    const m = String(window.location.search || "").match(/village=(\d+)/);
    return m ? m[1] : "";
  }

  function getMyAllyId() {
    const p = window.game_data && game_data.player ? game_data.player : null;
    if (!p) return null;
    // ally_id is numeric, needed for fetching members.
    return (p.ally_id || p.ally_id === 0) ? p.ally_id : null;
  }

  function getMyPlayerName() {
    const p = window.game_data && game_data.player ? game_data.player : null;
    return (p && p.name) ? String(p.name) : "";
  }

  function urlRankingAlly(offset) {
    return `${base()}/game.php?village=${encodeURIComponent(villageId())}&screen=ranking&mode=ally&offset=${encodeURIComponent(offset || 0)}`;
  }
  function urlRankingPlayer(offset) {
    return `${base()}/game.php?village=${encodeURIComponent(villageId())}&screen=ranking&mode=player&offset=${encodeURIComponent(offset || 0)}`;
  }
  function urlInfoAlly(allyId) {
    return `${base()}/game.php?village=${encodeURIComponent(villageId())}&screen=info_ally&id=${encodeURIComponent(allyId)}`;
  }
  function urlAllyProperties() {
    return `${base()}/game.php?village=${encodeURIComponent(villageId())}&screen=ally&mode=properties`;
  }
  function urlInfoPlayer(playerId) {
    return `${base()}/game.php?village=${encodeURIComponent(villageId())}&screen=info_player&id=${encodeURIComponent(playerId)}`;
  }
  function urlInADayByName(type, playerName) {
    return `${base()}/game.php?village=${encodeURIComponent(villageId())}&screen=ranking&mode=in_a_day&type=${encodeURIComponent(type)}&name=${encodeURIComponent(playerName)}`;
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
  async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  // ---------- date ----------
  function todayDDMMYYYY() {
    const d = String(window.server_date || (window.game_data && window.game_data.server_date) || "").trim();
    if (/^\d{2}\.\d{2}\.\d{4}$/.test(d)) return d;
    const m = d.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) return `${m[3]}.${m[2]}.${m[1]}`;
    const dt = new Date();
    return `${String(dt.getDate()).padStart(2, "0")}.${String(dt.getMonth() + 1).padStart(2, "0")}.${dt.getFullYear()}`;
  }

  // ---------- formatting ----------
  function parseDotsInt(s) {
    return parseInt(String(s || "").replace(/\./g, "").replace(/[^\d]/g, ""), 10) || 0;
  }
  function fmtDots(n) {
    const x = Math.round(Number(n) || 0).toString();
    return x.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  }
  function escBB(s) {
    return String(s || "").replace(/\[/g, "(").replace(/\]/g, ")").trim();
  }
  function perfBar(pct) {
    const total = 10;
    const p = Math.max(0, Math.min(1, (Number(pct) || 0)));
    const full = Math.round(p * total);
    return "█".repeat(full) + "░".repeat(total - full) + ` ${(p * 100).toFixed(0)}%`;
  }

  // ---------- TAG extraction (v15 fix) ----------
  function extractTagFromProfileTable($root) {
    // finds a row where first cell is "Tag:" and returns second cell text
    let tag = "";
    $root.find("tr").each(function () {
      const $td = $(this).find("td");
      if ($td.length < 2) return;
      const k = $td.eq(0).text().trim().toLowerCase();
      if (k === "tag:" || k === "tag") {
        tag = $td.eq(1).text().trim();
        return false;
      }
    });
    return tag;
  }

  async function getMyTribeTag(myAllyId) {
    // 1) BEST: ally properties page (your pasted HTML shows Tag row here)
    try {
      const html = await getHtml(urlAllyProperties());
      const $doc = $(html);
      const tag = extractTagFromProfileTable($doc);
      if (tag) return tag;
    } catch {}

    // 2) info_ally page might also have a "Tag:" row on some layouts
    try {
      const html = await getHtml(urlInfoAlly(myAllyId));
      const $doc = $(html);
      const tag = extractTagFromProfileTable($doc);
      if (tag) return tag;
    } catch {}

    // 3) ranking player page: current row (class "lit") has tribe cell text
    try {
      const myName = getMyPlayerName();
      // We try a few offsets; usually your row is around your rank page anyway.
      const offsets = [0, 200, 250, 300, 350, 400];
      for (const off of offsets) {
        const html = await getHtml(urlRankingPlayer(off));
        const $doc = $(html);
        const $row =
          $doc.find("tr.lit").first().length ? $doc.find("tr.lit").first()
          : $doc.find("#player_ranking_table tr").filter(function () {
              return $(this).text().includes(myName);
            }).first();

        if ($row && $row.length) {
          const $td = $row.find("td");
          if ($td.length >= 3) {
            const tribeTxt = $td.eq(2).text().trim();
            if (tribeTxt) return tribeTxt;
          }
        }
      }
    } catch {}

    // 4) LAST: game_data.player.ally (may be numeric on your world)
    const p = window.game_data && game_data.player ? game_data.player : null;
    if (p && typeof p.ally === "string" && p.ally.trim()) return p.ally.trim();

    return "YOUR_TRIBE";
  }

  // ---------- parsing ----------
  function parseAllyMembers(html) {
    const $doc = $(html);
    const $tables = $doc.find("table.vis");

    let $memberTable = null;
    $tables.each(function () {
      const $t = $(this);
      const head = $t.find("tr").first().text().toLowerCase();
      const okPlayer = head.includes("player") || head.includes("name") || head.includes("oyuncu");
      const okPoints = head.includes("points") || head.includes("puan");
      if (okPlayer && okPoints) {
        $memberTable = $t;
        return false;
      }
    });

    if (!$memberTable || !$memberTable.length) {
      $memberTable = $doc.find("#ally_content table.vis").first();
    }
    if (!$memberTable || !$memberTable.length) return [];

    const map = new Map();
    $memberTable.find('a[href*="screen=info_player"][href*="id="]').each(function () {
      const href = $(this).attr("href") || "";
      const m = href.match(/id=(\d+)/);
      if (!m) return;
      const id = String(m[1]);
      const name = $(this).text().trim();
      if (!name) return;
      if (!map.has(id)) map.set(id, { id, name });
    });

    return Array.from(map.values());
  }

  function parseRankingAlly(html) {
    const $doc = $(html);
    const $t = $doc.find("table.vis").filter(function () {
      const t = $(this).text().toLowerCase();
      return t.includes("rank") && (t.includes("tribe") || t.includes("klan") || t.includes("ally"));
    }).first();
    if (!$t.length) return [];

    const out = [];
    $t.find("tr").slice(1).each(function () {
      const $td = $(this).find("td");
      if ($td.length < 3) return;

      const rank = parseInt($td.eq(0).text().trim(), 10) || null;

      const $a = $td.eq(1).find('a[href*="info_ally"][href*="id="]').first();
      const href = $a.attr("href") || "";
      const m = href.match(/id=(\d+)/);
      const allyId = m ? String(m[1]) : null;
      const allyTag = $a.text().trim() || $td.eq(1).text().trim();

      let totalPoints = 0;
      $td.each(function () {
        const v = parseDotsInt($(this).text());
        if (v > totalPoints) totalPoints = v;
      });

      if (allyId && allyTag) out.push({ rank, allyId, allyTag, totalPoints });
    });

    return out;
  }

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

  function parsePlayerPointsAndActive2000(html) {
    const $doc = $(html);
    const txt = $doc.text();

    let totalPoints = 0;
    const mPts = txt.match(/Points\s*:\s*([\d\.]+)/i);
    if (mPts) totalPoints = parseDotsInt(mPts[1]);

    let active2000 = 0;
    const $v = $doc.find("#villages_list");
    if ($v && $v.length) {
      $v.find("tr").slice(1).each(function () {
        const $td = $(this).find("td");
        if ($td.length < 2) return;
        const p = parseDotsInt($td.last().text());
        if (p >= 2000) active2000 += p;
      });
    }

    return { totalPoints, active2000 };
  }

  // ---------- data collection ----------
  async function collectTopAllies() {
    const map = new Map();
    let offset = 0;

    for (let p = 0; p < CFG.allyRankingPagesToScan; p++) {
      const html = await getHtml(urlRankingAlly(offset));
      const rows = parseRankingAlly(html);

      for (const r of rows) if (!map.has(r.allyId)) map.set(r.allyId, r);

      offset += CFG.allyRankingOffsetStep;
      if (map.size >= CFG.topAlliesN) break;
    }

    return Array.from(map.values())
      .sort((a, b) => (a.rank || 999999) - (b.rank || 999999))
      .slice(0, CFG.topAlliesN);
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

  async function enrichPlayerStatic(playerId) {
    const html = await getHtml(urlInfoPlayer(playerId));
    return parsePlayerPointsAndActive2000(html);
  }

  // ---------- BB builders ----------
  function buildPlayerTable(title, rows) {
    const max = rows.reduce((m, r) => Math.max(m, r.val || 0), 0) || 1;

    let bb = "";
    bb += `[b][size=12]${title}[/size][/b]\n`;
    bb += `[table]\n`;
    bb += `[**]#[||]Player[||]Points[||]Score[||]Date[||]Performance[/**]\n`;

    rows.forEach((r, i) => {
      const pct = (r.val || 0) / max;
      bb += `[*]${i + 1}[|][player]${escBB(r.name)}[/player][|]${fmtDots(r.points)}[|]${fmtDots(r.val)}[|]${escBB(r.date)}[|]${perfBar(pct)}\n`;
    });

    bb += `[/table]\n\n`;
    return bb;
  }

  function buildEfficiencyTable(title, rows) {
    const max = rows.reduce((m, r) => Math.max(m, r.eff || 0), 0) || 1;

    let bb = "";
    bb += `[b][size=12]${title}[/size][/b]\n`;
    bb += `[i]Score = (Loot + Scavenge) / Sum of Points (Villages > 2000p).[/i]\n`;
    bb += `[table]\n`;
    bb += `[**]#[||]Player[||]Active Points[||]Total Res[||]Score[||]Performance[/**]\n`;

    rows.forEach((r, i) => {
      const pct = (r.eff || 0) / max;
      bb += `[*]${i + 1}[|][player]${escBB(r.name)}[/player][|]${fmtDots(r.active2000)}[|]${fmtDots(r.totalRes)}[|][b]${r.eff.toFixed(2)}[/b][|]${perfBar(pct)}\n`;
    });

    bb += `[/table]\n\n`;
    return bb;
  }

  function buildTribeCompareTable(rows) {
    const max = rows.reduce((m, r) => Math.max(m, r.score || 0), 0) || 1;

    let bb = "";
    bb += `[b][size=12]🏰 Tribe Comparison (Top ${CFG.topAlliesN})[/size][/b]\n`;
    bb += `[i]Total Res = Σ Res Gathered + Σ Res Plundered. Score = Total Res / Total Points.[/i]\n`;
    bb += `[table]\n`;
    bb += `[**]Rank[||]Tribe[||]Total Points[||]Members[||]Σ Res Gathered[||]Σ Res Plundered[||]Total Res[||]Score[||]Perf[/**]\n`;

    rows.forEach((r, i) => {
      const pct = (r.score || 0) / max;
      bb += `[*]${i + 1}[|][ally]${escBB(r.allyTag)}[/ally][|]${fmtDots(r.totalPoints)}[|]${fmtDots(r.memberCount)}[|]${fmtDots(r.scavSum)}[|]${fmtDots(r.lootSum)}[|]${fmtDots(r.totalRes)}[|][b]${r.score.toFixed(6)}[/b][|]${perfBar(pct)}\n`;
    });

    bb += `[/table]\n\n`;
    return bb;
  }

  function showDialog(bb) {
    const id = "yaver_v15_text";
    const html = `
      <div style="max-width:980px;">
        <div style="margin:6px 0 10px 0;">
          <a class="btn" id="yaver_v15_copy">Copy BBCode</a>
        </div>
        <textarea id="${id}" style="width:100%;height:460px;"></textarea>
      </div>
    `;

    if (window.Dialog && Dialog.show) Dialog.show(`Yaver ${CFG.version}`, html);
    else $("body").append(html);

    setTimeout(() => {
      const ta = document.getElementById(id);
      if (ta) ta.value = bb;

      $("#yaver_v15_copy").off("click").on("click", async () => {
        try {
          if (navigator.clipboard && navigator.clipboard.writeText) await navigator.clipboard.writeText(bb);
          else { ta.select(); document.execCommand("copy"); }
          ok("Copied ✅");
        } catch {
          bad("Copy failed ❌");
        }
      });
    }, 0);
  }

  // ---------- main ----------
  async function run() {
    try {
      if (typeof $ === "undefined") throw new Error("jQuery is missing ($ is undefined).");

      const myAllyId = getMyAllyId();
      if (!myAllyId || String(myAllyId) === "0") throw new Error("Your tribe (ally_id) could not be detected.");

      const dateStr = todayDDMMYYYY();
      ok(`Yaver ${CFG.version} started...`);

      ok("Fetching your tribe info...");
      const myAllyHtml = await getHtml(urlInfoAlly(myAllyId));

      // ✅ v15: REAL tribe tag (QWERTY) from ally properties page
      const myTribeTag = await getMyTribeTag(myAllyId);

      ok("Parsing your tribe member list...");
      const myMembers = parseAllyMembers(myAllyHtml);
      if (!myMembers.length) throw new Error("Member list is empty (failed to parse member table).");

      ok("Fetching Top 15 tribes...");
      const topAllies = await collectTopAllies();

      ok("Collecting your tribe player stats (filtered by member table only)...");
      const myDaily = [];
      let req = 0;

      for (let i = 0; i < myMembers.length; i++) {
        const m = myMembers[i];
        req++;
        if (req % CFG.sleepEvery === 0) await sleep(CFG.sleepMs);
        if ((i + 1) % 15 === 0) ok(`Your tribe: ${i + 1}/${myMembers.length} players...`);

        const [loot, scav, vil] = await Promise.all([
          getDailyByName("loot_res", m.name),
          getDailyByName("scavenge", m.name),
          getDailyByName("loot_vil", m.name),
        ]);

        req++;
        if (req % CFG.sleepEvery === 0) await sleep(CFG.sleepMs);

        const st = await enrichPlayerStatic(m.id);

        myDaily.push({
          id: m.id,
          name: m.name,
          points: st.totalPoints || 0,
          active2000: st.active2000 || 0,
          loot_res: loot.score || 0,
          loot_date: loot.date || "",
          scavenge: scav.score || 0,
          scav_date: scav.date || "",
          loot_vil: vil.score || 0,
          vil_date: vil.date || ""
        });
      }

      const scavRows = myDaily.slice().sort((a, b) => b.scavenge - a.scavenge).slice(0, CFG.ourTopPlayersN)
        .map(x => ({ name: x.name, points: x.points, val: x.scavenge, date: x.scav_date }));

      const lootRows = myDaily.slice().sort((a, b) => b.loot_res - a.loot_res).slice(0, CFG.ourTopPlayersN)
        .map(x => ({ name: x.name, points: x.points, val: x.loot_res, date: x.loot_date }));

      const vilRows = myDaily.slice().sort((a, b) => b.loot_vil - a.loot_vil).slice(0, CFG.ourTopPlayersN)
        .map(x => ({ name: x.name, points: x.points, val: x.loot_vil, date: x.vil_date }));

      const effRows = myDaily
        .filter(x => (x.active2000 || 0) > 0)
        .map(x => {
          const totalRes = (x.loot_res || 0) + (x.scavenge || 0);
          const eff = totalRes / (x.active2000 || 1);
          return { name: x.name, active2000: x.active2000, totalRes, eff };
        })
        .sort((a, b) => b.eff - a.eff)
        .slice(0, 30);

      ok("Collecting Top 15 tribe totals (sum over each tribe member)...");
      const tribeCompare = [];

      for (let a = 0; a < topAllies.length; a++) {
        const ally = topAllies[a];
        ok(`Tribe ${a + 1}/${topAllies.length}: [${ally.allyTag}] ...`);

        const allyHtml = await getHtml(urlInfoAlly(ally.allyId));
        const members = parseAllyMembers(allyHtml);

        let lootSum = 0;
        let scavSum = 0;

        for (let j = 0; j < members.length; j++) {
          const mem = members[j];
          req++;
          if (req % CFG.sleepEvery === 0) await sleep(CFG.sleepMs);

          const loot = await getDailyByName("loot_res", mem.name);
          const scav = await getDailyByName("scavenge", mem.name);

          lootSum += (loot.score || 0);
          scavSum += (scav.score || 0);
        }

        const totalRes = lootSum + scavSum;
        const score = ally.totalPoints > 0 ? (totalRes / ally.totalPoints) : 0;

        tribeCompare.push({
          allyTag: ally.allyTag,
          totalPoints: ally.totalPoints,
          memberCount: members.length,
          scavSum,
          lootSum,
          totalRes,
          score
        });
      }

      tribeCompare.sort((a, b) => b.score - a.score);

      let bb = "";
      bb += `[b]Yaver Report ${CFG.version}[/b]\n`;
      bb += `Date: [b]${dateStr}[/b]\n\n`;

      bb += `[b][size=15]Daily Performance Report - ${dateStr}[/size][/b]\n\n`;
      bb += buildPlayerTable(`🎒 [ally]${escBB(myTribeTag)}[/ally] Resources Gathered (Scavenging)`, scavRows);
      bb += buildPlayerTable(`⚔️ [ally]${escBB(myTribeTag)}[/ally] Resources Plundered (Loot)`, lootRows);
      bb += buildPlayerTable(`🏘️ [ally]${escBB(myTribeTag)}[/ally] Villages Plundered (Counts)`, vilRows);
      bb += buildEfficiencyTable(`📈 [ally]${escBB(myTribeTag)}[/ally] Efficiency Score (Res / 2k+ Village Points)`, effRows);

      bb += buildTribeCompareTable(tribeCompare);

      showDialog(bb);
      ok("Report ready ✅");
    } catch (e) {
      bad(e && e.message ? e.message : e);
    }
  }

  window.YAVER = window.YAVER || {};
  window.YAVER.run = run;

  log("Loaded", CFG.version);
})();
