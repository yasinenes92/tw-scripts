// Yaver Report v9.0.0
// Output language: English (tables + notes)
// Chat language: Turkish (this message)
//
// What it does (exact):
// 1) Reads World Top 15 Tribes from ranking->Tribes.
// 2) For each tribe, fetches tribe member list.
// 3) For each member, fetches in_a_day values by player name:
//    - loot_res (Resources Plundered)
//    - scavenge (Resources Gathered)
//    - loot_vil (Villages Plundered) [only used for "My Tribe" tables]
// 4) Aggregates per tribe: Σ gathered, Σ plundered, Total Res, Score = TotalRes / TotalPoints.
// 5) Builds 4 tables for My Tribe + 1 table for World Top 15.

(function () {
  "use strict";

  const VERSION = "9.0.0";
  const BASE = "/game.php";
  const VILLAGE = (window.game_data && game_data.village && game_data.village.id) ? game_data.village.id : null;

  // My tribe numeric id is reliable
  const MY_TRIBE_ID = (window.game_data && game_data.player && game_data.player.ally) ? String(game_data.player.ally) : "0";

  // Throttle settings (lower = faster, higher = safer)
  const DELAY_MS = 650;        // delay between requests
  const MAX_REQUESTS = 1400;   // hard cap to avoid infinite loops / getting kicked too fast
  const TOP_N_MY_TRIBE = 21;   // rows in first tables

  // ====== Small utilities ======
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const log = (...a) => console.log("[Yaver v9]", ...a);
  const warn = (...a) => console.warn("[Yaver v9]", ...a);

  const parseIntTW = (txt) => {
    if (!txt) return 0;
    const t = String(txt).replace(/\s/g, "").replace(/\./g, "").replace(/,/g, "");
    const n = parseInt(t, 10);
    return Number.isFinite(n) ? n : 0;
  };

  const fmt = (n) => {
    try { return Number(n).toLocaleString("en-US"); } catch { return String(n); }
  };

  const todayEN = () => {
    const d = new Date();
    // en-GB gives dd/mm/yyyy; convert to dd.mm.yyyy look if needed
    const s = d.toLocaleDateString("en-GB");
    const [dd, mm, yyyy] = s.split("/");
    return `${dd}.${mm}.${yyyy}`;
  };

  const bar10 = (percent) => {
    const p = Math.max(0, Math.min(100, percent));
    const blocks = Math.round(p / 10);
    return "█".repeat(blocks) + "░".repeat(10 - blocks) + " " + Math.round(p) + "%";
  };

  // ====== Request manager (throttle + cap) ======
  let REQUEST_COUNT = 0;

  async function ajaxPage(params) {
    if (!VILLAGE) throw new Error("Missing village id (game_data.village.id).");
    REQUEST_COUNT++;
    if (REQUEST_COUNT > MAX_REQUESTS) {
      throw new Error(`Request cap reached (${MAX_REQUESTS}). Stop to avoid logout.`);
    }

    const fullParams = Object.assign({ village: VILLAGE }, params);

    await sleep(DELAY_MS);

    return new Promise((resolve, reject) => {
      $.ajax({
        url: BASE,
        method: "GET",
        data: fullParams,
        dataType: "html",
        timeout: 30000
      })
        .done((html) => {
          const t = String(html || "");
          if (t.includes("Page not found (404)") || t.toLowerCase().includes("page not found")) {
            reject(new Error("404 Page not found received from server."));
            return;
          }
          resolve(html);
        })
        .fail((xhr, status, err) => reject(new Error(`Ajax failed: ${status} ${err || ""}`)));
    });
  }

  // ====== Extractors ======

  // Extract top 15 tribes from /game.php?screen=ranking&mode=ally
  function extractTopTribes(html) {
    const $doc = $(html);
    const tribes = [];

    // Most TW worlds: #ranking_table
    $doc.find("#ranking_table tr").each(function (idx) {
      if (idx === 0) return;
      if (tribes.length >= 15) return;

      const $tr = $(this);
      const $a = $tr.find("td:eq(1) a");
      const name = ($a.text() || "").trim();
      const href = $a.attr("href") || "";
      const id = (href.match(/id=(\d+)/) || [])[1] || "";
      const points = parseIntTW($tr.find("td:eq(2)").text());

      if (id && name) tribes.push({ id, name, points });
    });

    return tribes;
  }

  // From tribe info page /game.php?screen=info_ally&id=XXX
  // Extract members: [{name, playerId, points}]
  function extractTribeMembers(html) {
    const $doc = $(html);
    const members = [];

    // There is usually a members table with player links:
    // href contains screen=info_player&id=...
    $doc.find("a[href*='screen=info_player'][href*='id=']").each(function () {
      const $a = $(this);
      const name = ($a.text() || "").trim();
      const href = $a.attr("href") || "";
      const playerId = (href.match(/id=(\d+)/) || [])[1] || "";
      if (!name || !playerId) return;

      // Try to find points in same row if present
      let points = 0;
      const $tr = $a.closest("tr");
      if ($tr && $tr.length) {
        // points is often in one of the next tds; try all numeric-ish tds
        $tr.find("td").each(function () {
          const tx = ($(this).text() || "").trim();
          const v = parseIntTW(tx);
          // heuristic: player points usually >= 1,000
          if (v >= 1000 && points === 0) points = v;
        });
      }

      members.push({ name, playerId, points });
    });

    // Deduplicate by playerId
    const seen = new Set();
    const uniq = [];
    for (const m of members) {
      if (seen.has(m.playerId)) continue;
      seen.add(m.playerId);
      uniq.push(m);
    }
    return uniq;
  }

  // Extract one player's exact score from in_a_day by searching "name"
  // /game.php?screen=ranking&mode=in_a_day&type=...&name=PLAYERNAME
  function extractPlayerScoreFromInADay(html, exactName) {
    const $doc = $(html);
    const rows = [];

    $doc.find("#in_a_day_ranking_table tr").each(function (idx) {
      if (idx === 0) return;
      const $tr = $(this);
      const $a = $tr.find("td:eq(1) a");
      const name = ($a.text() || "").trim();
      const score = parseIntTW($tr.find("td:eq(3)").text());
      const date = ($tr.find("td:eq(4)").text() || "").trim();
      rows.push({ name, score, date });
    });

    // Prefer exact match; if not found, try case-insensitive exact
    const exact = rows.find(r => r.name === exactName);
    if (exact) return exact;

    const low = String(exactName).toLowerCase();
    const exact2 = rows.find(r => String(r.name).toLowerCase() === low);
    if (exact2) return exact2;

    // If still not found, return best candidate (first row) but marked
    if (rows.length) return rows[0];
    return { name: exactName, score: 0, date: "" };
  }

  // ====== Core per-player fetch ======
  async function fetchPlayerDaily(name) {
    // loot_res
    const lootHtml = await ajaxPage({ screen: "ranking", mode: "in_a_day", type: "loot_res", name: name });
    const loot = extractPlayerScoreFromInADay(lootHtml, name);

    // scavenge
    const scavHtml = await ajaxPage({ screen: "ranking", mode: "in_a_day", type: "scavenge", name: name });
    const scav = extractPlayerScoreFromInADay(scavHtml, name);

    return {
      name,
      loot_res: loot.score,
      loot_date: loot.date,
      scavenge: scav.score,
      scav_date: scav.date
    };
  }

  async function fetchPlayerVillagesPlundered(name) {
    const vilHtml = await ajaxPage({ screen: "ranking", mode: "in_a_day", type: "loot_vil", name: name });
    const vil = extractPlayerScoreFromInADay(vilHtml, name);
    return { name, loot_vil: vil.score, vil_date: vil.date };
  }

  // ====== Report builders ======
  function tableHeader(title) {
    return `[b][size=12]${title}[/size][/b]\n`;
  }

  function buildTopPlayersTable(title, rows, valueKey, dateKey) {
    const sorted = [...rows].sort((a, b) => (b[valueKey] || 0) - (a[valueKey] || 0)).slice(0, TOP_N_MY_TRIBE);
    const maxVal = Math.max(1, ...sorted.map(r => r[valueKey] || 0));

    let out = "";
    out += tableHeader(title);
    out += `[table]\n`;
    out += `[**]#[||]Player[||]Score[||]Date[||]Performance[/**]\n`;

    sorted.forEach((r, i) => {
      const v = r[valueKey] || 0;
      const perf = (v / maxVal) * 100;
      const d = r[dateKey] || "";
      out += `[*]${i + 1}[|][player]${r.name}[/player][|]${fmt(v)}[|]${d}[|]${bar10(perf)}\n`;
    });

    out += `[/table]\n\n`;
    return out;
  }

  function buildEfficiencyTable(title, rows, pointsByPlayer) {
    // Efficiency = (loot_res + scavenge) / player_points
    const enriched = rows.map(r => {
      const points = pointsByPlayer[r.name] || 0;
      const totalRes = (r.loot_res || 0) + (r.scavenge || 0);
      const score = points > 0 ? (totalRes / points) : 0;
      return { name: r.name, points, totalRes, score, loot: r.loot_res || 0, scav: r.scavenge || 0 };
    }).sort((a, b) => b.score - a.score).slice(0, TOP_N_MY_TRIBE);

    const maxScore = Math.max(1e-12, ...enriched.map(x => x.score));

    let out = "";
    out += tableHeader(title);
    out += `[i]Score = (Loot Res + Scavenge) / Player Points.[/i]\n`;
    out += `[table]\n`;
    out += `[**]#[||]Player[||]Player Points[||]Σ Res Gathered[||]Σ Res Plundered[||]Total Res[||]Score[||]Performance[/**]\n`;

    enriched.forEach((r, i) => {
      const perf = (r.score / maxScore) * 100;
      out += `[*]${i + 1}[|][player]${r.name}[/player][|]${fmt(r.points)}[|]${fmt(r.scav)}[|]${fmt(r.loot)}[|]${fmt(r.totalRes)}[|][b]${r.score.toFixed(2)}[/b][|]${bar10(perf)}\n`;
    });

    out += `[/table]\n\n`;
    return out;
  }

  function buildTopTribesTable(title, tribeAggRows) {
    const sorted = [...tribeAggRows].sort((a, b) => b.score - a.score);
    const maxScore = Math.max(1e-12, ...sorted.map(x => x.score));

    let out = "";
    out += `[b][size=12]${title}[/size][/b]\n`;
    out += `[table]\n`;
    out += `[**]Rank[||]Tribe[||]Total Points[||]Σ Res Gathered[||]Σ Res Plundered[||]Total Res[||]Score[||]Perf[/**]\n`;

    sorted.forEach((t, i) => {
      const perf = (t.score / maxScore) * 100;
      out += `[*]${i + 1}[|][ally]${t.name}[/ally][|]${fmt(t.points)}[|]${fmt(t.sumScav)}[|]${fmt(t.sumLoot)}[|]${fmt(t.totalRes)}[|][b]${t.score.toFixed(2)}[/b][|]${bar10(perf)}\n`;
    });

    out += `[/table]\n`;
    out += `[i]Definitions: Σ Res Gathered = Σ(player scavenge). Σ Res Plundered = Σ(player loot). Total Res = Σ gathered + Σ plundered. Score = Total Res / Total Points.[/i]\n\n`;
    return out;
  }

  // ====== Main flow ======
  async function run() {
    if (!VILLAGE) {
      UI.ErrorMessage("Yaver: village id not found.", 6000);
      return;
    }
    if (!MY_TRIBE_ID || MY_TRIBE_ID === "0") {
      UI.ErrorMessage("Yaver: your tribe id not found (you might not be in a tribe).", 7000);
      return;
    }

    UI.SuccessMessage(`Yaver v${VERSION}: Starting...`, 2500);
    log(`Start. village=${VILLAGE}, myTribeId=${MY_TRIBE_ID}`);

    // 1) Top 15 tribes
    const tribesHtml = await ajaxPage({ screen: "ranking", mode: "ally" });
    const topTribes = extractTopTribes(tribesHtml);
    if (!topTribes.length) throw new Error("Could not parse Top 15 tribes (ranking_table missing).");

    // 2) Fetch members + daily sums for each tribe (EXACT)
    const tribeAgg = [];

    // We also need MY TRIBE tag/name match for filtering.
    // We'll identify "my tribe" as the tribe that has the same id as MY_TRIBE_ID.
    const myTribeInTop = topTribes.find(t => String(t.id) === String(MY_TRIBE_ID));

    // We will still compute "My Tribe" tables from my tribe members even if not in Top15:
    // so fetch my tribe page always.
    let myTribeName = myTribeInTop ? myTribeInTop.name : "MY_TRIBE";

    // ---- Fetch my tribe members first (for first 4 tables) ----
    const myTribeHtml = await ajaxPage({ screen: "info_ally", id: MY_TRIBE_ID });
    const myMembers = extractTribeMembers(myTribeHtml);
    if (!myMembers.length) throw new Error("Could not parse your tribe member list.");

    // points lookup for efficiency table
    const pointsByPlayer = {};
    myMembers.forEach(m => { if (m.name) pointsByPlayer[m.name] = m.points || 0; });

    // Daily fetch for MY tribe members (loot+scav+vil)
    UI.SuccessMessage(`Yaver: Fetching daily stats for your tribe (${myMembers.length} members)...`, 3000);

    const myDaily = [];
    for (const m of myMembers) {
      const d = await fetchPlayerDaily(m.name);
      const v = await fetchPlayerVillagesPlundered(m.name);
      myDaily.push({
        name: m.name,
        loot_res: d.loot_res,
        loot_date: d.loot_date,
        scavenge: d.scavenge,
        scav_date: d.scav_date,
        loot_vil: v.loot_vil,
        vil_date: v.vil_date
      });
    }

    // ---- Now Top 15 tribes exact aggregation ----
    UI.SuccessMessage(`Yaver: Fetching Top 15 tribe totals (exact, member-by-member)...`, 3500);

    for (const t of topTribes) {
      const allyHtml = await ajaxPage({ screen: "info_ally", id: t.id });
      const members = extractTribeMembers(allyHtml);

      let sumLoot = 0;
      let sumScav = 0;

      // member-by-member exact sum
      for (const m of members) {
        const d = await fetchPlayerDaily(m.name);
        sumLoot += d.loot_res;
        sumScav += d.scavenge;
      }

      const totalRes = sumLoot + sumScav;
      const score = t.points > 0 ? (totalRes / t.points) : 0;

      tribeAgg.push({
        id: t.id,
        name: t.name,
        points: t.points,
        sumLoot,
        sumScav,
        totalRes,
        score
      });

      // Update progress
      log(`Tribe ${t.name}: members=${members.length}, totalRes=${totalRes}, score=${score.toFixed(3)}`);
    }

    // 3) Build report text
    let report = "";
    report += `[b][size=15]Daily Performance Report - ${todayEN()}[/size][/b]\n`;
    report += `[b]Yaver Report v${VERSION}[/b]\n\n`;

    // First 3 tables (MY TRIBE)
    report += buildTopPlayersTable("🎒 Resources Gathered (Scavenging) - My Tribe", myDaily, "scavenge", "scav_date");
    report += buildTopPlayersTable("⚔️ Resources Plundered (Loot) - My Tribe", myDaily, "loot_res", "loot_date");
    report += buildTopPlayersTable("🏘️ Villages Plundered (Counts) - My Tribe", myDaily, "loot_vil", "vil_date");

    // 4th table (Efficiency) - My Tribe
    report += buildEfficiencyTable("📈 Efficiency Score - My Tribe", myDaily, pointsByPlayer);

    // 5th table (Top 15 tribes exact)
    report += buildTopTribesTable("WORLD TOP 15 (Exact Tribe Totals)", tribeAgg);

    // Output
    console.log(report);
    UI.SuccessMessage("Yaver: Report generated ✅ (see console output)", 4500);
  }

  run().catch(err => {
    console.error("[Yaver v9] Fatal:", err);
    UI.ErrorMessage("Yaver failed: " + (err.message || err), 8000);
  });

})();
