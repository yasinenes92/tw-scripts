(function () {
  // ============================================================
  // Controleng's Intel v4.1 — Scientific Tribe Performance
  // ============================================================
  // Run on: Continent -> Tribes ranking page (screen=ranking,mode=con_ally)
  // Output: BBCode report that you can paste into forum / discord / notes.
  //
  // Key improvements vs v4.0:
  // 1) Robust column detection for member tables (fixes Points/Rank mix-ups)
  // 2) Loot score uses BOTH loot_res and loot_vil (balanced looting)
  // 3) Coverage penalty (penaltyK) applied to Karma (optional but recommended)
  // 4) Optional recency weighting (half-life in days) based on record dates
  // 5) Bootstrap samples reused to create a “superiority probability” matrix
  // 6) Optional localStorage cache to keep percentiles comparable across runs
  //
  // NOTE ABOUT “GLOBAL %”:
  // Percentiles are “global” within YOUR BUILT POOL (current run + optional cache),
  // not necessarily the entire continent — unless you scan enough tribes to approximate it.

  // -----------------------------
  // Default config (UI overrides)
  // -----------------------------
  var cfg = {
    topNTribes: 5,
    bootstrapIterations: 1000,
    penaltyK: 1.0,               // 0 disables coverage penalty
    recencyHalfLifeDays: 0,       // 0 disables recency weighting
    recencyMinBlend: 0.50,        // min multiplier for very old/unknown records
    useGlobalCache: false,
    cacheKey: "controleng_intel_global_pool_v41",
  };

  // -----------------------------
  // State
  // -----------------------------
  var tribesAnalyzed = [];
  var allPlayersRun = [];
  var currentTribeIndex = 0;

  // Will be set based on the detected member table header
  // rankMetricMode: "points" (higher better) OR "rank" (lower better)
  var rankMetricMode = "points";

  // =============================
  // Utilities
  // =============================
  function clamp(n, lo, hi) {
    return Math.max(lo, Math.min(hi, n));
  }

  function pad2(n) {
    return (n < 10 ? "0" : "") + n;
  }

  function toDMY(d) {
    return pad2(d.getDate()) + "." + pad2(d.getMonth() + 1) + "." + d.getFullYear();
  }

  function parseDMY(s) {
    if (!s) return null;
    var m = String(s).trim().match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
    if (!m) return null;
    var dd = parseInt(m[1], 10), mm = parseInt(m[2], 10), yy = parseInt(m[3], 10);
    return new Date(yy, mm - 1, dd);
  }

  function parseIntLoose(s) {
    if (s == null) return 0;
    var t = String(s).replace(/[^\d]/g, "");
    return parseInt(t, 10) || 0;
  }

  function numFmt(num) {
    // 1200324 -> "1.200.324"
    return Number(num || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  }

  function htmlEscape(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function fixDateStr(dateStr) {
    var ds = String(dateStr || "").toLowerCase().trim();
    ds = ds.replace(/^on\s+/i, "");
    var now = new Date();
    var todayStr = toDMY(now);

    var y = new Date(now);
    y.setDate(now.getDate() - 1);
    var yStr = toDMY(y);

    if (ds === "today") return todayStr;
    if (ds === "yesterday") return yStr;

    // already dd.mm.yyyy? keep as-is
    if (/^\d{2}\.\d{2}\.\d{4}$/.test(ds)) return ds;

    // unknown formats: return original (trimmed)
    return String(dateStr || "").trim();
  }

  function recencyBlend(dateStr, reportDate) {
    // returns multiplier in [recencyMinBlend, 1]
    if (!cfg.recencyHalfLifeDays || cfg.recencyHalfLifeDays <= 0) return 1.0;

    var d = parseDMY(dateStr);
    if (!d) return cfg.recencyMinBlend;

    var msDay = 24 * 60 * 60 * 1000;
    var age = Math.floor((reportDate.getTime() - d.getTime()) / msDay);
    if (age < 0) age = 0;

    var decay = Math.exp(-Math.LN2 * age / cfg.recencyHalfLifeDays); // 1 -> 0
    return cfg.recencyMinBlend + (1 - cfg.recencyMinBlend) * decay;
  }

  // binary search: first index with arr[i] >= x
  function lowerBound(arr, x) {
    var lo = 0, hi = arr.length;
    while (lo < hi) {
      var mid = (lo + hi) >> 1;
      if (arr[mid] < x) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  }

  // binary search: first index with arr[i] > x
  function upperBound(arr, x) {
    var lo = 0, hi = arr.length;
    while (lo < hi) {
      var mid = (lo + hi) >> 1;
      if (arr[mid] <= x) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  }

  function percentileRank(x, sortedArr) {
    var n = sortedArr.length;
    if (n === 0) return 0.5;
    if (n === 1) return 0.5;

    var lb = lowerBound(sortedArr, x);
    var ub = upperBound(sortedArr, x);
    var less = lb;
    var eq = ub - lb;
    return (less + 0.5 * eq) / n; // in [0,1]
  }

  function weightedMean(values, weights) {
    var sumW = 0, sumV = 0;
    for (var i = 0; i < values.length; i++) {
      var w = weights[i] || 0;
      sumW += w;
      sumV += (values[i] || 0) * w;
    }
    return sumW > 0 ? (sumV / sumW) : 0;
  }

  function weightedStd(values, weights) {
    var mu = weightedMean(values, weights);
    var sumW = 0, sumVar = 0;
    for (var i = 0; i < values.length; i++) {
      var w = weights[i] || 0;
      sumW += w;
      var d = (values[i] || 0) - mu;
      sumVar += w * d * d;
    }
    return sumW > 0 ? Math.sqrt(sumVar / sumW) : 0;
  }

  function hashCode(str) {
    str = String(str);
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return (h >>> 0);
  }

  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0;
      a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // =============================
  // Cache (optional)
  // =============================
  function loadCachePool() {
    try {
      var raw = localStorage.getItem(cfg.cacheKey);
      if (!raw) return [];
      var parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed;
    } catch (e) {
      return [];
    }
  }

  function saveCachePool(pool) {
    try {
      localStorage.setItem(cfg.cacheKey, JSON.stringify(pool));
    } catch (e) {
      // ignore
    }
  }

  function mergePlayersIntoPool(pool, newPlayers) {
    // pool & newPlayers: array of {id,name,points,globalRank,scavenge,scavengeDate,lootRes,lootResDate,lootVil,lootVilDate}
    var map = {};
    for (var i = 0; i < pool.length; i++) {
      map[pool[i].id] = pool[i];
    }

    for (var j = 0; j < newPlayers.length; j++) {
      var p = newPlayers[j];
      if (!p || !p.id) continue;

      if (!map[p.id]) {
        map[p.id] = {
          id: p.id,
          name: p.name,
          points: p.points || 0,
          globalRank: p.globalRank || 0,
          scav: p.scavenge || 0,
          scavDate: p.scavengeDate || "",
          lootRes: p.lootRes || 0,
          lootResDate: p.lootResDate || "",
          lootVil: p.lootVil || 0,
          lootVilDate: p.lootVilDate || ""
        };
      } else {
        var o = map[p.id];
        o.name = p.name || o.name;

        // Points: usually increase. Keep max
        if ((p.points || 0) > (o.points || 0)) o.points = p.points;
        // Global rank: smaller is better. Keep min if present
        if (p.globalRank && (!o.globalRank || p.globalRank < o.globalRank)) o.globalRank = p.globalRank;

        // Records: keep the bigger record (and its date)
        if ((p.scavenge || 0) > (o.scav || 0)) { o.scav = p.scavenge; o.scavDate = p.scavengeDate || o.scavDate; }
        if ((p.lootRes || 0) > (o.lootRes || 0)) { o.lootRes = p.lootRes; o.lootResDate = p.lootResDate || o.lootResDate; }
        if ((p.lootVil || 0) > (o.lootVil || 0)) { o.lootVil = p.lootVil; o.lootVilDate = p.lootVilDate || o.lootVilDate; }
      }
    }

    var merged = [];
    for (var k in map) merged.push(map[k]);
    return merged;
  }

  // =============================
  // UI
  // =============================
  function showLoadingOverlay() {
    var html = ''
      + '<div id="intel_overlay" style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.86);color:#fff;z-index:99999;overflow:auto;padding:20px;font-family:Arial,sans-serif;">'
      + '  <h2 style="margin-top:0;">📊 Controleng\'s Intel v4.1 — Scientific Tribe Performance</h2>'
      + '  <div style="display:flex;gap:18px;flex-wrap:wrap;align-items:flex-end;">'
      + '    <div><label>Top N tribes</label><br><input id="intel_topN" type="number" min="1" max="50" value="' + cfg.topNTribes + '" style="width:100px;"></div>'
      + '    <div><label>Bootstrap iters</label><br><input id="intel_boot" type="number" min="200" max="5000" value="' + cfg.bootstrapIterations + '" style="width:120px;"></div>'
      + '    <div><label>Coverage penaltyK</label><br><input id="intel_penK" type="number" step="0.1" min="0" max="3" value="' + cfg.penaltyK + '" style="width:120px;"></div>'
      + '    <div><label>Recency half-life (days)</label><br><input id="intel_halfLife" type="number" min="0" max="365" value="' + cfg.recencyHalfLifeDays + '" style="width:160px;"></div>'
      + '    <div style="padding-top:18px;"><label><input id="intel_cache" type="checkbox"' + (cfg.useGlobalCache ? ' checked' : '') + '> Use global cache</label></div>'
      + '    <button id="intel_start" style="padding:10px 14px;background:#2a8bff;border:0;border-radius:6px;color:#fff;cursor:pointer;">Start</button>'
      + '    <button id="intel_reset" style="padding:10px 14px;background:#444;border:0;border-radius:6px;color:#fff;cursor:pointer;">Reset cache</button>'
      + '  </div>'
      + '  <p style="opacity:0.9;max-width:980px;margin-top:14px;">'
      + '    <b>Tip:</b> If you want stable cross-run comparisons, enable <b>Use global cache</b> and run this for each tribe group you care about.'
      + '    Percentiles will be computed over your accumulated pool.'
      + '  </p>'
      + '  <div id="intel_progress" style="margin-top:16px;font-size:16px;">Ready.</div>'
      + '  <pre id="intel_output" style="white-space:pre-wrap;background:#111;padding:14px;border-radius:8px;margin-top:16px;display:none;"></pre>'
      + '</div>';

    $("body").append(html);

    $("#intel_start").on("click", function () {
      cfg.topNTribes = clamp(parseInt($("#intel_topN").val(), 10) || 5, 1, 50);
      cfg.bootstrapIterations = clamp(parseInt($("#intel_boot").val(), 10) || 1000, 200, 5000);
      cfg.penaltyK = Math.max(0, parseFloat($("#intel_penK").val()) || 0);
      cfg.recencyHalfLifeDays = Math.max(0, parseFloat($("#intel_halfLife").val()) || 0);
      cfg.useGlobalCache = $("#intel_cache").is(":checked");

      startAnalysis();
    });

    $("#intel_reset").on("click", function () {
      try { localStorage.removeItem(cfg.cacheKey); } catch (e) {}
      $("#intel_progress").text("Cache reset.");
    });
  }

  function updateProgress(msg) {
    $("#intel_progress").text(msg);
  }

  // =============================
  // Scraping helpers (robust)
  // =============================
  function detectColumnIndex(headerTexts, patterns) {
    // returns first index whose text contains any pattern substring
    for (var i = 0; i < headerTexts.length; i++) {
      var t = headerTexts[i];
      for (var j = 0; j < patterns.length; j++) {
        if (t.indexOf(patterns[j]) !== -1) return i;
      }
    }
    return -1;
  }

  function extractMemberTableAndColumns($doc) {
    // Find a "members" table: must have Player + (Points or Global Rank)
    var tables = $doc.find("table.vis");
    var best = null;
    var bestMeta = null;

    tables.each(function () {
      var $t = $(this);
      var headers = $t.find("tr:first th").map(function () {
        return $(this).text().trim().toLowerCase();
      }).get();

      if (headers.length < 3) return;

      var playerIdx = detectColumnIndex(headers, ["player", "name", "spieler", "oyuncu"]);
      if (playerIdx === -1) return;

      var pointsIdx = detectColumnIndex(headers, ["points", "punkte", "puan"]);
      var rankIdx = detectColumnIndex(headers, ["global rank", "rank", "sıra", "siralama"]);
      // Some tables might use "Ranking" etc.
      if (rankIdx === -1) rankIdx = detectColumnIndex(headers, ["ranking"]);

      // We need at least one of points or rank to build weighting
      if (pointsIdx === -1 && rankIdx === -1) return;

      // Score table: prefer one that has BOTH points and rank if available
      var score = 0;
      if (pointsIdx !== -1) score += 2;
      if (rankIdx !== -1) score += 1;

      if (!best || score > bestMeta.score) {
        best = $t;
        bestMeta = { headers: headers, playerIdx: playerIdx, pointsIdx: pointsIdx, rankIdx: rankIdx, score: score };
      }
    });

    return { table: best, meta: bestMeta };
  }

  function extractInADayTableColumns($doc) {
    // Columns usually: # | Player | Points | Score | Date ...
    var table = $doc.find("#in_a_day_ranking_table");
    if (!table.length) return null;

    var headers = table.find("tr:first th").map(function () {
      return $(this).text().trim().toLowerCase();
    }).get();

    if (!headers.length) return null;

    var idxPlayer = detectColumnIndex(headers, ["player", "name", "spieler", "oyuncu"]);
    var idxScore = detectColumnIndex(headers, ["score", "record", "rekor"]);
    var idxDate = detectColumnIndex(headers, ["date", "tarih"]);

    // Fallbacks for known layout
    if (idxPlayer === -1) idxPlayer = 1;
    if (idxScore === -1) idxScore = 3;
    if (idxDate === -1) idxDate = 4;

    return { table: table, idxPlayer: idxPlayer, idxScore: idxScore, idxDate: idxDate };
  }

  // =============================
  // Main flow
  // =============================
  function startAnalysis() {
    tribesAnalyzed = [];
    allPlayersRun = [];
    currentTribeIndex = 0;

    updateProgress("Scanning continent tribe ranking (top " + cfg.topNTribes + ")...");
    analyzeRankingTable();
  }

  function analyzeRankingTable() {
    // Top tribes table on continent ranking page
    var tribeRows = $("#con_ally_ranking_table tr:gt(0)");
    if (!tribeRows.length) {
      updateProgress("❌ Could not find #con_ally_ranking_table. Open the continent tribes ranking page first.");
      return;
    }

    var tribesToAnalyze = [];
    tribeRows.each(function (i) {
      if (i >= cfg.topNTribes) return false;

      var row = $(this);
      var tribeLink = row.find("td:eq(1) a");

      if (!tribeLink.length) return;

      tribesToAnalyze.push({
        name: tribeLink.text().trim(),
        id: tribeLink.attr("href").match(/id=(\d+)/) ? tribeLink.attr("href").match(/id=(\d+)/)[1] : ("tribe_" + i),
        link: tribeLink.attr("href"),
        members: []
      });
    });

    if (!tribesToAnalyze.length) {
      updateProgress("❌ No tribes found in the ranking table.");
      return;
    }

    updateProgress("Found " + tribesToAnalyze.length + " tribes. Loading members...");
    processNextTribe(tribesToAnalyze);
  }

  function processNextTribe(tribesToAnalyze) {
    if (currentTribeIndex >= tribesToAnalyze.length) {
      updateProgress("✅ All tribes loaded. Fetching player records (scavenge + loot_res + loot_vil)...");
      fetchAllPlayerMetrics();
      return;
    }

    var tribe = tribesToAnalyze[currentTribeIndex];
    updateProgress("Loading tribe " + (currentTribeIndex + 1) + "/" + tribesToAnalyze.length + ": " + tribe.name);

    $.get(tribe.link, function (html) {
      var $doc = $(html);

      var found = extractMemberTableAndColumns($doc);
      if (!found.table || !found.meta) {
        updateProgress("⚠️ Could not find member table for tribe " + tribe.name + ". Skipping.");
        currentTribeIndex++;
        processNextTribe(tribesToAnalyze);
        return;
      }

      // Decide rank metric mode globally based on the best member table we saw first
      if (currentTribeIndex === 0) {
        rankMetricMode = (found.meta.pointsIdx !== -1) ? "points" : "rank";
      }

      var $table = found.table;
      var meta = found.meta;

      var memberRows = $table.find("tr:gt(0)");
      memberRows.each(function () {
        var $row = $(this);
        var $playerLink = $row.find("td:eq(" + meta.playerIdx + ") a");
        if (!$playerLink.length) return;

        var playerName = $playerLink.text().trim();
        var playerIdMatch = $playerLink.attr("href").match(/id=(\d+)/);
        var playerId = playerIdMatch ? playerIdMatch[1] : ("p_" + Math.random().toString(36).slice(2));

        var points = 0;
        var globalRank = 0;

        if (meta.pointsIdx !== -1) points = parseIntLoose($row.find("td:eq(" + meta.pointsIdx + ")").text());
        if (meta.rankIdx !== -1) globalRank = parseIntLoose($row.find("td:eq(" + meta.rankIdx + ")").text());

        var player = {
          name: playerName,
          id: playerId,
          points: points,
          globalRank: globalRank,

          // Will be filled by metric fetch
          scavenge: 0,
          scavengeDate: "",
          lootRes: 0,
          lootResDate: "",
          lootVil: 0,
          lootVilDate: "",

          // Derived later
          rankScore: 0,
          p_R: 0,
          p_S: 0,
          p_LRes: 0,
          p_LVil: 0,
          p_L: 0,
          karma: 0,
          weight: 1
        };

        tribe.members.push(player);
        allPlayersRun.push(player);
      });

      tribesAnalyzed.push(tribe);
      currentTribeIndex++;
      processNextTribe(tribesToAnalyze);
    });
  }

  function fetchAllPlayerMetrics() {
    var totalPlayers = allPlayersRun.length;
    var idx = 0;

    function next() {
      if (idx >= totalPlayers) {
        updateProgress("✅ All records fetched. Computing scores...");
        performScientificAnalysis();
        return;
      }

      var p = allPlayersRun[idx];
      updateProgress("Fetching records for " + p.name + " (" + (idx + 1) + "/" + totalPlayers + ")");

      fetchPlayerMetrics(p).always(function () {
        idx++;
        // small delay to be polite
        setTimeout(next, 120);
      });
    }

    next();
  }

  function fetchPlayerMetrics(player) {
    // sequentially: scavenge -> loot_res -> loot_vil
    var d = $.Deferred();

    var scavengeUrl = "/game.php?screen=ranking&mode=in_a_day&type=scavenge&name=" + encodeURIComponent(player.name);
    var lootResUrl = "/game.php?screen=ranking&mode=in_a_day&type=loot_res&name=" + encodeURIComponent(player.name);
    var lootVilUrl = "/game.php?screen=ranking&mode=in_a_day&type=loot_vil&name=" + encodeURIComponent(player.name);

    function parseScore(url, cb) {
      $.get(url, function (html) {
        var $doc = $(html);
        var cols = extractInADayTableColumns($doc);

        if (!cols) { cb(0, ""); return; }

        var found = false;
        cols.table.find("tr:gt(0)").each(function () {
          var $row = $(this);
          var nm = $row.find("td:eq(" + cols.idxPlayer + ")").text().trim();
          if (nm === player.name) {
            var score = parseIntLoose($row.find("td:eq(" + cols.idxScore + ")").text());
            var date = fixDateStr($row.find("td:eq(" + cols.idxDate + ")").text());
            cb(score, date);
            found = true;
            return false;
          }
        });

        if (!found) cb(0, "");
      }).fail(function () {
        cb(0, "");
      });
    }

    parseScore(scavengeUrl, function (sc, scDate) {
      player.scavenge = sc;
      player.scavengeDate = scDate;

      parseScore(lootResUrl, function (lr, lrDate) {
        player.lootRes = lr;
        player.lootResDate = lrDate;

        parseScore(lootVilUrl, function (lv, lvDate) {
          player.lootVil = lv;
          player.lootVilDate = lvDate;

          d.resolve();
        });
      });
    });

    return d.promise();
  }

  // =============================
  // Analysis
  // =============================
  function performScientificAnalysis() {
    // 1) Build pool (run + optional cache)
    var pool = [];
    if (cfg.useGlobalCache) {
      var cached = loadCachePool();
      pool = mergePlayersIntoPool(cached, allPlayersRun);
      saveCachePool(pool);
    } else {
      // pool just from this run
      pool = allPlayersRun.map(function (p) {
        return {
          id: p.id,
          name: p.name,
          points: p.points,
          globalRank: p.globalRank,
          scav: p.scavenge,
          scavDate: p.scavengeDate,
          lootRes: p.lootRes,
          lootResDate: p.lootResDate,
          lootVil: p.lootVil,
          lootVilDate: p.lootVilDate
        };
      });
    }

    // 2) Determine rankScore for pool and for run players
    //    - if we have points column: higher points = better
    //    - else: lower globalRank = better -> rankScore = -globalRank (higher better)
    var rankScores = [];
    var scavArr = [];
    var lootResArr = [];
    var lootVilArr = [];

    for (var i = 0; i < pool.length; i++) {
      var pp = pool[i];
      var rs = 0;

      if (rankMetricMode === "points" && pp.points) rs = pp.points;
      else if (pp.globalRank) rs = -pp.globalRank;
      else rs = pp.points || 0;

      rankScores.push(rs);
      scavArr.push(pp.scav || 0);
      lootResArr.push(pp.lootRes || 0);
      lootVilArr.push(pp.lootVil || 0);
    }

    rankScores.sort(function (a, b) { return a - b; });
    scavArr.sort(function (a, b) { return a - b; });
    lootResArr.sort(function (a, b) { return a - b; });
    lootVilArr.sort(function (a, b) { return a - b; });

    var reportDate = new Date();

    // 3) Compute per-player percentiles and karma for RUN players only
    allPlayersRun.forEach(function (p) {
      // rankScore (for weighting)
      if (rankMetricMode === "points" && p.points) p.rankScore = p.points;
      else if (p.globalRank) p.rankScore = -p.globalRank;
      else p.rankScore = p.points || 0;

      p.p_R = percentileRank(p.rankScore, rankScores);

      p.p_S = percentileRank(p.scavenge || 0, scavArr);

      p.p_LRes = percentileRank(p.lootRes || 0, lootResArr);
      p.p_LVil = percentileRank(p.lootVil || 0, lootVilArr);

      // Balanced loot percentile
      p.p_L = Math.sqrt(Math.max(0, p.p_LRes) * Math.max(0, p.p_LVil));

      // Recency blending (optional)
      var bS = recencyBlend(p.scavengeDate, reportDate);

      // loot recency: combine resource-date and village-date
      var bLR = recencyBlend(p.lootResDate, reportDate);
      var bLV = recencyBlend(p.lootVilDate, reportDate);
      var bL = Math.sqrt(bLR * bLV);

      var pS_eff = p.p_S * bS;
      var pL_eff = p.p_L * bL;

      // Karma: balance scav & loot (geometric mean)
      p.karma = 100 * Math.sqrt(pS_eff * pL_eff);

      // Weight: give better-ranked players more influence, but cap within [0.5, 1]
      p.weight = 0.5 + 0.5 * p.p_R;
    });

    // 4) Tribe scores + bootstrap
    tribesAnalyzed.forEach(function (tribe) {
      var members = tribe.members;
      var n = members.length;

      var w = members.map(function (p) { return p.weight; });

      // coverage
      var activeS = members.filter(function (p) { return (p.scavenge || 0) > 0; }).length;
      var activeLR = members.filter(function (p) { return (p.lootRes || 0) > 0; }).length;
      var activeLV = members.filter(function (p) { return (p.lootVil || 0) > 0; }).length;

      var covS = n ? (activeS / n) : 0;
      var covL = n ? (Math.min(activeLR, activeLV) / n) : 0; // conservative: need both for full loot score
      var covFactor = Math.sqrt(covS * covL);

      // category means (0..100)
      var scavScore = 100 * weightedMean(members.map(function (p) { return p.p_S; }), w);
      var lootScore = 100 * weightedMean(members.map(function (p) { return p.p_L; }), w);

      // roster karma
      var rosterKarma = weightedMean(members.map(function (p) { return p.karma; }), w);

      // apply coverage penalty (optional)
      var rosterKarmaAdj = rosterKarma;
      if (cfg.penaltyK > 0) rosterKarmaAdj = rosterKarma * Math.pow(covFactor, cfg.penaltyK);

      // optional: dispersion metric (reported, not penalized)
      var karmaStd = weightedStd(members.map(function (p) { return p.karma; }), w);

      // compute tribe points sum (depends on metric mode)
      var tribePoints = 0;
      members.forEach(function (p) {
        if (rankMetricMode === "points") tribePoints += (p.points || 0);
        else tribePoints += (p.globalRank || 0); // if rank mode, this is sum of ranks (still less meaningful)
      });

      // bootstrap CI + keep samples (for superiority matrix)
      var bs = runBootstrap(members, covFactor);
      tribe.scavScore = scavScore;
      tribe.lootScore = lootScore;
      tribe.rosterKarma = rosterKarma;
      tribe.rosterKarmaAdj = rosterKarmaAdj;
      tribe.karmaStd = karmaStd;
      tribe.covS = activeS + "/" + n;
      tribe.covLRes = activeLR + "/" + n;
      tribe.covLVil = activeLV + "/" + n;
      tribe.covFactor = covFactor;
      tribe.points = tribePoints;
      tribe.bs = bs;
    });

    // 5) Rank tribes (use adjusted karma point estimate; tie-breaker: CI lower)
    tribesAnalyzed.sort(function (a, b) {
      if (b.rosterKarmaAdj !== a.rosterKarmaAdj) return b.rosterKarmaAdj - a.rosterKarmaAdj;
      return (b.bs.lower - a.bs.lower);
    });

    updateProgress("✅ Done. Generating report...");
    generateFinalReport();
  }

  function runBootstrap(members, covFactor) {
    var iters = cfg.bootstrapIterations;
    var n = members.length;

    if (n === 0) {
      return { lower: 0, upper: 0, samples: [] };
    }

    var seed = hashCode(String(members[0].id) + "|" + String(members[0].name) + "|" + toDMY(new Date()));
    var rng = mulberry32(seed);

    // Precompute arrays for speed
    var karmas = members.map(function (p) { return p.karma || 0; });
    var weights = members.map(function (p) { return p.weight || 0; });

    var samples = new Array(iters);

    for (var i = 0; i < iters; i++) {
      var sumW = 0, sumV = 0;

      for (var k = 0; k < n; k++) {
        var idx = Math.floor(rng() * n);
        var w = weights[idx];
        sumW += w;
        sumV += karmas[idx] * w;
      }

      var mean = sumW > 0 ? (sumV / sumW) : 0;
      var adj = mean;

      if (cfg.penaltyK > 0) adj = mean * Math.pow(covFactor, cfg.penaltyK);
      samples[i] = adj;
    }

    samples.sort(function (a, b) { return a - b; });

    function q(p) {
      var pos = (samples.length - 1) * p;
      var base = Math.floor(pos);
      var rest = pos - base;
      if ((base + 1) < samples.length) return samples[base] + rest * (samples[base + 1] - samples[base]);
      return samples[base];
    }

    return {
      lower: q(0.025),
      upper: q(0.975),
      samples: samples
    };
  }

  // =============================
  // Reporting
  // =============================
  function generateFinalReport() {
    var reportDateStr = toDMY(new Date());
    var poolNote = cfg.useGlobalCache
      ? "Percentiles computed over your GLOBAL CACHE (accumulated runs)."
      : "Percentiles computed over this RUN'S pool (top " + cfg.topNTribes + " tribes).";

    var recencyNote = (cfg.recencyHalfLifeDays > 0)
      ? ("Recency ON (half-life " + cfg.recencyHalfLifeDays + "d, min blend " + Math.round(cfg.recencyMinBlend * 100) + "%).")
      : "Recency OFF.";

    var out = "";
    out += "[b][size=14]📊 Controleng's Intel v4.1 (" + reportDateStr + ")[/size][/b]\n";
    out += "[i]Methodology: Weighted percentiles + balanced (geometric mean) categories + bootstrap CI (95%).[/i]\n";
    out += "[i]" + poolNote + " " + recencyNote + " Coverage penaltyK=" + cfg.penaltyK + ".[/i]\n\n";

    out += "[b]GUIDE: What do these numbers mean?[/b]\n";
    out += "(*) [b]Scav Score[/b] and [b]Loot Score[/b]: 0–100, higher = better (percentile-based).\n";
    out += "(*) [b]Loot Score[/b] uses BOTH loot resources and loot villages (balanced).\n";
    out += "(*) [b]Roster Karma[/b]: player-level balanced score aggregated with rank-weighting.\n";
    out += "(*) [b]Adj Karma[/b]: Roster Karma × (coverageFactor^penaltyK). CoverageFactor = sqrt(covScav × covLoot).\n";
    out += "(*) [b]CI[/b]: 95% confidence interval via bootstrap (scientific stability).\n\n";

    // Tribe league
    out += "[b]🏆 TRIBE PERFORMANCE LEAGUE[/b]\n";
    out += "[table]\n";
    out += "[**]Rank[||]Tribe[||]" + (rankMetricMode === "points" ? "Points" : "RankSum") + "[||]Members (Cov)[||]Scav[||]Loot[||]Adj Karma (CI)[||]Std[/**]\n";

    for (var i = 0; i < tribesAnalyzed.length; i++) {
      var t = tribesAnalyzed[i];
      var ci = t.bs;
      out += "[*] " + (i + 1)
        + " [|] " + htmlEscape(t.name)
        + " [|] " + numFmt(t.points)
        + " [|] " + t.members.length + " (S:" + t.covS + " LR:" + t.covLRes + " LV:" + t.covLVil + ")"
        + " [|] " + t.scavScore.toFixed(1)
        + " [|] " + t.lootScore.toFixed(1)
        + " [|] [b]" + t.rosterKarmaAdj.toFixed(1) + "[/b] (CI: " + ci.lower.toFixed(1) + "-" + ci.upper.toFixed(1) + ")"
        + " [|] " + t.karmaStd.toFixed(1) + "\n";
    }
    out += "[/table]\n\n";

    // Superiority matrix (prob that row tribe > col tribe)
    out += "[b]🧠 Superiority Matrix[/b] (bootstrap probability that ROW beats COLUMN on Adj Karma)\n";
    out += "[table]\n";
    out += "[**]Row \\ Col";
    for (var c = 0; c < tribesAnalyzed.length; c++) out += "[||]" + htmlEscape(tribesAnalyzed[c].name);
    out += "[/**]\n";

    for (var r = 0; r < tribesAnalyzed.length; r++) {
      var A = tribesAnalyzed[r];
      out += "[*] " + htmlEscape(A.name);
      for (var c2 = 0; c2 < tribesAnalyzed.length; c2++) {
        var B = tribesAnalyzed[c2];
        if (r === c2) {
          out += "[|] —";
          continue;
        }
        var prob = superiorityProb(A.bs.samples, B.bs.samples);
        out += "[|] " + (100 * prob).toFixed(1) + "%";
      }
      out += "\n";
    }
    out += "[/table]\n\n";

    // Tribe details
    tribesAnalyzed.forEach(function (t) {
      out += "--------------------------------------------------\n\n";
      out += "[b][size=12]🛡️ " + htmlEscape(t.name) + "[/size][/b]\n";
      out += "[i]CoverageFactor=" + t.covFactor.toFixed(3) + " | AdjKarma=" + t.rosterKarmaAdj.toFixed(1) + " | CI=" + t.bs.lower.toFixed(1) + "-" + t.bs.upper.toFixed(1) + "[/i]\n";
      out += "[spoiler=📂 Player Details]\n";
      out += "[table]\n";
      out += "[**]Player[||]" + (rankMetricMode === "points" ? "Points" : "GlobalRank") + " (Rank%)[||]Scavenge: Record (Date) [Pool%][||]LootRes: Record (Date) [Pool%][||]LootVil: Count (Date) [Pool%][||]Karma%[/**]\n";

      t.members.sort(function (a, b) { return b.karma - a.karma; }).forEach(function (p) {
        var rankVal = (rankMetricMode === "points") ? (p.points || 0) : (p.globalRank || 0);
        out += "[*] [player]" + htmlEscape(p.name) + "[/player]"
          + " [|] " + numFmt(rankVal) + " (" + Math.round(p.p_R * 100) + "%)"
          + " [|] " + (p.scavenge ? numFmt(p.scavenge) + " (" + p.scavengeDate + ") [b][color=#0e00aa][" + Math.round(p.p_S * 100) + "%][/color][/b]" : "-")
          + " [|] " + (p.lootRes ? numFmt(p.lootRes) + " (" + p.lootResDate + ") [b][color=#aa0000][" + Math.round(p.p_LRes * 100) + "%][/color][/b]" : "-")
          + " [|] " + (p.lootVil ? numFmt(p.lootVil) + " (" + p.lootVilDate + ") [b][color=#aa0000][" + Math.round(p.p_LVil * 100) + "%][/color][/b]" : "-")
          + " [|] [b]" + p.karma.toFixed(1) + "[/b]\n";
      });

      out += "[/table]\n";
      out += "[/spoiler]\n\n";
    });

    $("#intel_output").text(out).show();
    updateProgress("✅ Report ready (copy from the box).");
  }

  function superiorityProb(samplesA, samplesB) {
    var n = Math.min(samplesA.length, samplesB.length);
    if (n === 0) return 0.5;
    var wins = 0;
    for (var i = 0; i < n; i++) if (samplesA[i] > samplesB[i]) wins++;
    return wins / n;
  }

  // =============================
  // Run
  // =============================
  if (typeof $ === "undefined") {
    alert("This script requires jQuery on the page.");
    return;
  }

  if ($("#intel_overlay").length) $("#intel_overlay").remove();
  showLoadingOverlay();
})();
