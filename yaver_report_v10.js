// Yaver Report v10.0.0
// Output language: English (tables + notes)
// Key fix: anti-kick strategy (batch + cache + strict member parsing + stop-on-404)

(function () {
  "use strict";

  const VERSION = "10.0.0";
  const BASE = "/game.php";
  const VILLAGE = (window.game_data && game_data.village && game_data.village.id) ? String(game_data.village.id) : null;
  const MY_TRIBE_ID = (window.game_data && game_data.player && game_data.player.ally) ? String(game_data.player.ally) : "0";

  // ---- Safety knobs (tune if needed) ----
  const DELAY_MS = 1100;            // slower => safer
  const JITTER_MS = 350;            // random jitter to look less bot-like
  const MAX_REQUESTS_PER_RUN = 120; // hard cap per run to avoid kick
  const PLAYER_BATCH_PER_RUN = 18;  // how many players to fetch this run
  const TRIBE_BATCH_PER_RUN = 1;    // how many TOP15 tribes to process this run (exact)

  // My tribe tables row limit
  const TOP_N_MY_TRIBE = 21;

  // ---- Storage keys ----
  const KEY_STATE = "yaver_v10_state";
  const KEY_CACHE = "yaver_v10_cache"; // per player stats cache (today)

  // ---- Utils ----
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const now = () => Date.now();
  const rnd = (a, b) => Math.floor(a + Math.random() * (b - a + 1));

  const log = (...a) => console.log("[Yaver v10]", ...a);
  const warn = (...a) => console.warn("[Yaver v10]", ...a);

  const parseIntTW = (txt) => {
    if (!txt) return 0;
    const t = String(txt).replace(/\s/g, "").replace(/\./g, "").replace(/,/g, "");
    const n = parseInt(t, 10);
    return Number.isFinite(n) ? n : 0;
  };

  const fmt = (n) => {
    try { return Number(n).toLocaleString("en-US"); } catch { return String(n); }
  };

  const todayKey = () => {
    // Stable key for today's cache
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  const todayPrint = () => {
    const d = new Date();
    const s = d.toLocaleDateString("en-GB"); // dd/mm/yyyy
    const [dd, mm, yyyy] = s.split("/");
    return `${dd}.${mm}.${yyyy}`;
  };

  const bar10 = (percent) => {
    const p = Math.max(0, Math.min(100, percent));
    const blocks = Math.round(p / 10);
    return "█".repeat(blocks) + "░".repeat(10 - blocks) + " " + Math.round(p) + "%";
  };

  function loadJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  }

  function saveJSON(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  // ---- Request manager (stop-on-404) ----
  let REQUESTS = 0;
  let HARD_STOP = false;

  async function ajaxPage(params) {
    if (!VILLAGE) throw new Error("Missing village id (game_data.village.id).");
    if (HARD_STOP) throw new Error("Hard-stopped due to 404 / anti-bot trigger.");

    REQUESTS++;
    if (REQUESTS > MAX_REQUESTS_PER_RUN) {
      throw new Error(`Run request cap reached (${MAX_REQUESTS_PER_RUN}). Re-run to continue.`);
    }

    await sleep(DELAY_MS + rnd(0, JITTER_MS));

    const fullParams = Object.assign({ village: VILLAGE }, params);

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
          // TW sometimes uses this 404 page as an anti-bot / session kill symptom.
          if (t.includes("Page not found (404)") || t.toLowerCase().includes("page not found")) {
            HARD_STOP = true;
            reject(new Error("Server returned 404 page. Likely anti-bot / session issue. Stopping immediately."));
            return;
          }
          resolve(html);
        })
        .fail((xhr, status, err) => reject(new Error(`Ajax failed: ${status} ${err || ""}`)));
    });
  }

  // ---- Extract Top 15 Tribes (ranking -> ally) ----
  function extractTopTribes(html) {
    const $doc = $(html);
    const tribes = [];
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

  // ---- STRICT member extraction from tribe page ----
  // Goal: avoid collecting non-member player links.
  function extractMembersStrict(html) {
    const $doc = $(html);

    // Heuristic:
    // Find a "vis" table that has a header row containing "Name" and "Points"
    // Then collect player links inside that table only.
    const visTables = $doc.find("table.vis");
    let best = null;

    visTables.each(function () {
      const $t = $(this);
      const headText = $t.find("th").text().toLowerCase();
      // name/points keywords vary by server language; check common variants
      const hasName = headText.includes("name") || headText.includes("player") || headText.includes("spieler") || headText.includes("oyuncu");
      const hasPoints = headText.includes("points") || headText.includes("punkte") || headText.includes("puan");
      if (hasName && hasPoints) {
        best = $t;
        return false;
      }
    });

    // Fallback: if not found, still try within #ally_content or main content
    const scope = best ? best : $doc.find("#ally_content, #content_value, #contentContainer").first();

    const members = [];
    scope.find("a[href*='screen=info_player'][href*='id=']").each(function () {
      const $a = $(this);
      const name = ($a.text() || "").trim();
      const href = $a.attr("href") || "";
      const playerId = (href.match(/id=(\d+)/) || [])[1] || "";
      if (!name || !playerId) return;

      let points = 0;
      const $tr = $a.closest("tr");
      if ($tr && $tr.length) {
        // find the best-looking numeric cell as points
        $tr.find("td").each(function () {
          const tx = ($(this).text() || "").trim();
          const v = parseIntTW(tx);
          if (v >= 1000) points = Math.max(points, v);
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

  // ---- Extract one player's score from in_a_day table ----
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

    const exact = rows.find(r => r.name === exactName);
    if (exact) return exact;

    const low = String(exactName).toLowerCase();
    const exact2 = rows.find(r => String(r.name).toLowerCase() === low);
    if (exact2) return exact2;

    // Not found -> 0 (strict). We do NOT guess another player.
    return { name: exactName, score: 0, date: "" };
  }

  // ---- Player fetch with cache ----
  function getCache() {
    const all = loadJSON(KEY_CACHE, {});
    const day = todayKey();
    if (!all[day]) all[day] = {};
    return all;
  }

  function setCache(all) {
    saveJSON(KEY_CACHE, all);
  }

  async function fetchPlayerDailyStrict(playerName) {
    const day = todayKey();
    const all = getCache();
    const dayCache = all[day] || {};
    const key = playerName;

    if (dayCache[key] && typeof dayCache[key].loot_res === "number" && typeof dayCache[key].scavenge === "number") {
      return dayCache[key];
    }

    // loot_res
    const lootHtml = await ajaxPage({ screen: "ranking", mode: "in_a_day", type: "loot_res", name: playerName });
    const loot = extractPlayerScoreFromInADay(lootHtml, playerName);

    // scavenge
    const scavHtml = await ajaxPage({ screen: "ranking", mode: "in_a_day", type: "scavenge", name: playerName });
    const scav = extractPlayerScoreFromInADay(scavHtml, playerName);

    const obj = {
      name: playerName,
      loot_res: loot.score,
      loot_date: loot.date || "",
      scavenge: scav.score,
      scav_date: scav.date || ""
    };

    dayCache[key] = obj;
    all[day] = dayCache;
    setCache(all);

    return obj;
  }

  async function fetchPlayerVillagesPlunderedStrict(playerName) {
    const day = todayKey();
    const all = getCache();
    const dayCache = all[day] || {};
    const key = playerName;

    if (dayCache[key] && typeof dayCache[key].loot_vil === "number") {
      return dayCache[key];
    }

    const vilHtml = await ajaxPage({ screen: "ranking", mode: "in_a_day", type: "loot_vil", name: playerName });
    const vil = extractPlayerScoreFromInADay(vilHtml, playerName);

    const prev = dayCache[key] || { name: playerName, loot_res: 0, scavenge: 0, loot_date: "", scav_date: "" };
    prev.loot_vil = vil.score;
    prev.vil_date = vil.date || "";

    dayCache[key] = prev;
    all[day] = dayCache;
    setCache(all);

    return prev;
  }

  // ---- Report builders ----
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
    const enriched = rows.map(r => {
      const pts = pointsByPlayer[r.name] || 0;
      const totalRes = (r.loot_res || 0) + (r.scavenge || 0);
      const score = pts > 0 ? (totalRes / pts) : 0;
      return { name: r.name, points: pts, loot: r.loot_res || 0, scav: r.scavenge || 0, totalRes, score };
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

  // ---- State machine for batch/resume ----
  function initStateIfMissing(state, topTribes) {
    if (!state || state.version !== VERSION) {
      return {
        version: VERSION,
        createdAt: now(),
        day: todayKey(),
        topTribes: topTribes, // snapshot
        // progress pointers:
        myTribe: { done: false, memberIndex: 0, members: [] },
        top15: { tribeIndex: 0, tribesDone: {} },
        // aggregate results:
        tribeAgg: [], // {id,name,points,sumLoot,sumScav,totalRes,score}
        myDaily: [],  // per member stats (merged)
        myPoints: {}  // player->points
      };
    }

    // If day changed, reset cache/state for new day
    if (state.day !== todayKey()) {
      return {
        version: VERSION,
        createdAt: now(),
        day: todayKey(),
        topTribes: topTribes,
        myTribe: { done: false, memberIndex: 0, members: [] },
        top15: { tribeIndex: 0, tribesDone: {} },
        tribeAgg: [],
        myDaily: [],
        myPoints: {}
      };
    }

    return state;
  }

  function mergeMyDaily(existing, incoming) {
    const map = {};
    existing.forEach(x => { map[x.name] = Object.assign({}, x); });
    incoming.forEach(x => { map[x.name] = Object.assign(map[x.name] || {}, x); });
    return Object.values(map);
  }

  // ---- Main run ----
  async function run() {
    if (!VILLAGE) {
      UI.ErrorMessage("Yaver: village id not found.", 6000);
      return;
    }
    if (!MY_TRIBE_ID || MY_TRIBE_ID === "0") {
      UI.ErrorMessage("Yaver: your tribe id not found (you might not be in a tribe).", 7000);
      return;
    }

    UI.SuccessMessage(`Yaver v${VERSION}: Starting (batch mode)...`, 2500);
    log(`Start. village=${VILLAGE}, myTribeId=${MY_TRIBE_ID}`);

    // 1) Get Top15 tribes snapshot
    const tribesHtml = await ajaxPage({ screen: "ranking", mode: "ally" });
    const topTribes = extractTopTribes(tribesHtml);
    if (!topTribes.length) throw new Error("Could not parse Top 15 tribes.");

    // 2) Load/init state
    let state = loadJSON(KEY_STATE, null);
    state = initStateIfMissing(state, topTribes);

    // 3) Ensure my tribe members list exists
    if (!state.myTribe.members || !state.myTribe.members.length) {
      UI.SuccessMessage("Yaver: Reading your tribe members...", 2500);
      const myTribeHtml = await ajaxPage({ screen: "info_ally", id: MY_TRIBE_ID });
      const myMembers = extractMembersStrict(myTribeHtml);
      if (!myMembers.length) throw new Error("Could not parse your tribe member list (strict mode).");

      state.myTribe.members = myMembers;
      state.myTribe.memberIndex = 0;

      // points map
      const pointsMap = {};
      myMembers.forEach(m => { pointsMap[m.name] = m.points || 0; });
      state.myPoints = pointsMap;
      saveJSON(KEY_STATE, state);
    }

    // 4) Fetch a batch of MY TRIBE players (loot+scav+vil)
    const myMembers = state.myTribe.members;
    const startIdx = state.myTribe.memberIndex;
    const endIdx = Math.min(myMembers.length, startIdx + PLAYER_BATCH_PER_RUN);

    UI.SuccessMessage(`Yaver: My Tribe batch ${startIdx + 1}-${endIdx} / ${myMembers.length}`, 3500);

    const myBatchResults = [];
    for (let i = startIdx; i < endIdx; i++) {
      const name = myMembers[i].name;
      const d = await fetchPlayerDailyStrict(name);
      const v = await fetchPlayerVillagesPlunderedStrict(name);
      myBatchResults.push(Object.assign({}, d, { loot_vil: v.loot_vil || 0, vil_date: v.vil_date || "" }));
    }

    state.myDaily = mergeMyDaily(state.myDaily, myBatchResults);
    state.myTribe.memberIndex = endIdx;
    if (endIdx >= myMembers.length) state.myTribe.done = true;
    saveJSON(KEY_STATE, state);

    // 5) Process TOP15 tribes EXACT, but only a small tribe batch per run
    // We only start once My Tribe is fully done (safer, fewer mixed calls)
    if (state.myTribe.done) {
      let processedTribes = 0;

      while (processedTribes < TRIBE_BATCH_PER_RUN && state.top15.tribeIndex < state.topTribes.length) {
        const t = state.topTribes[state.top15.tribeIndex];

        // skip if already done
        if (state.top15.tribesDone[t.id]) {
          state.top15.tribeIndex++;
          continue;
        }

        UI.SuccessMessage(`Yaver: Processing tribe (exact) ${t.name} ...`, 3000);

        const allyHtml = await ajaxPage({ screen: "info_ally", id: t.id });
        const members = extractMembersStrict(allyHtml);

        let sumLoot = 0;
        let sumScav = 0;

        // IMPORTANT: This is the expensive part. Still exact, but throttled and cached per player.
        for (const m of members) {
          const d = await fetchPlayerDailyStrict(m.name);
          sumLoot += d.loot_res;
          sumScav += d.scavenge;
        }

        const totalRes = sumLoot + sumScav;
        const score = t.points > 0 ? (totalRes / t.points) : 0;

        // store agg (upsert)
        const existingIdx = state.tribeAgg.findIndex(x => x.id === t.id);
        const row = { id: t.id, name: t.name, points: t.points, sumLoot, sumScav, totalRes, score };
        if (existingIdx >= 0) state.tribeAgg[existingIdx] = row;
        else state.tribeAgg.push(row);

        state.top15.tribesDone[t.id] = true;
        state.top15.tribeIndex++;
        processedTribes++;

        saveJSON(KEY_STATE, state);
      }
    } else {
      UI.SuccessMessage("Yaver: My Tribe not finished yet. Re-run to continue batches.", 4500);
    }

    // 6) Build report from whatever is completed so far
    const myDaily = state.myDaily || [];
    const myPoints = state.myPoints || {};

    let report = "";
    report += `[b][size=15]Daily Performance Report - ${todayPrint()}[/size][/b]\n`;
    report += `[b]Yaver Report v${VERSION}[/b]\n`;
    report += `[i]Batch mode is ON to prevent anti-bot kicks. Re-run script to continue until completion.[/i]\n\n`;

    report += buildTopPlayersTable("🎒 Resources Gathered (Scavenging) - My Tribe", myDaily, "scavenge", "scav_date");
    report += buildTopPlayersTable("⚔️ Resources Plundered (Loot) - My Tribe", myDaily, "loot_res", "loot_date");
    report += buildTopPlayersTable("🏘️ Villages Plundered (Counts) - My Tribe", myDaily, "loot_vil", "vil_date");
    report += buildEfficiencyTable("📈 Efficiency Score - My Tribe", myDaily, myPoints);

    // Top15 table only when we have at least 1 processed tribe (partial ok)
    if (state.tribeAgg && state.tribeAgg.length) {
      report += buildTopTribesTable("WORLD TOP 15 (Exact Tribe Totals - Partial Until Completed)", state.tribeAgg);
      report += `[i]Progress: My Tribe ${state.myTribe.done ? "DONE" : (state.myTribe.memberIndex + "/" + (state.myTribe.members || []).length)}. Top15 tribes processed: ${Object.keys(state.top15.tribesDone || {}).length}/15.[/i]\n`;
    } else {
      report += `[i]Top 15 exact totals will appear after My Tribe is completed (and as tribes are processed per run).[/i]\n`;
    }

    console.log(report);
    UI.SuccessMessage(`Yaver: Report generated (v${VERSION}) ✅ (see console). Requests used: ${REQUESTS}/${MAX_REQUESTS_PER_RUN}`, 5500);
  }

  run().catch(err => {
    console.error("[Yaver v10] Fatal:", err);
    UI.ErrorMessage("Yaver failed: " + (err.message || err), 9000);
  });

})();
