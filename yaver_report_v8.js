// == Yaver Report v8 ==
// Tribe Daily Performance Analyzer
// Author: Yaver
// Version: 8.0.0
// Date: 10.01.2026

(function () {
    'use strict';

    console.log("=== Yaver Report v8 started ===");

    const BASE = "/game.php";
    const WORLD = game_data.world;
    const CSRF = game_data.csrf;
    const TODAY = new Date().toLocaleDateString("en-GB");

    const sleep = ms => new Promise(r => setTimeout(r, ms));

    const fetchPage = async (params) => {
        const url = BASE + "?" + $.param(params);
        const res = await fetch(url, { credentials: "same-origin" });
        return await res.text();
    };

    const parseNumber = (txt) => {
        return parseInt(txt.replace(/\./g, '').replace(/,/g, '').trim()) || 0;
    };

    const getTopTribes = async () => {
        console.log("[Yaver] Fetching Top 15 Tribes...");

        const html = await fetchPage({
            screen: "ranking",
            mode: "ally"
        });

        const doc = $(html);
        const tribes = [];

        doc.find("#ranking_table tr").each(function (i) {
            if (i === 0 || tribes.length >= 15) return;

            const row = $(this);
            const tribeName = row.find("td:eq(1) a").text().trim();
            const tribeId = row.find("td:eq(1) a").attr("href")?.match(/id=(\d+)/)?.[1];
            const points = parseNumber(row.find("td:eq(2)").text());

            if (tribeId) {
                tribes.push({
                    id: tribeId,
                    name: tribeName,
                    points: points
                });
            }
        });

        console.log("[Yaver] Top 15 Tribes:", tribes);
        return tribes;
    };

    const getTribeMembers = async (tribeId) => {
        console.log("[Yaver] Fetching members for tribe", tribeId);

        const html = await fetchPage({
            screen: "info_ally",
            id: tribeId
        });

        const doc = $(html);
        const members = [];

        doc.find("#ally_content tr").each(function (i) {
            if (i === 0) return;

            const row = $(this);
            const name = row.find("td:eq(0) a").text().trim();
            const id = row.find("td:eq(0) a").attr("href")?.match(/id=(\d+)/)?.[1];

            if (id && name) {
                members.push({ id, name });
            }
        });

        console.log(`[Yaver] Tribe ${tribeId} members:`, members.length);
        return members;
    };

    const getPlayerDailyStats = async (playerId) => {
        const lootHtml = await fetchPage({
            screen: "ranking",
            mode: "in_a_day",
            type: "loot_res",
            name: playerId
        });

        const scavHtml = await fetchPage({
            screen: "ranking",
            mode: "in_a_day",
            type: "scavenge",
            name: playerId
        });

        const lootDoc = $(lootHtml);
        const scavDoc = $(scavHtml);

        let loot = 0;
        let scav = 0;

        lootDoc.find("#in_a_day_ranking_table tr").each(function (i) {
            if (i === 1) loot = parseNumber($(this).find("td:eq(3)").text());
        });

        scavDoc.find("#in_a_day_ranking_table tr").each(function (i) {
            if (i === 1) scav = parseNumber($(this).find("td:eq(3)").text());
        });

        return { loot, scav };
    };

    const buildPerformanceBar = (percent) => {
        const blocks = Math.round(percent / 10);
        return "█".repeat(blocks) + "░".repeat(10 - blocks) + " " + percent.toFixed(0) + "%";
    };

    const main = async () => {
        const tribes = await getTopTribes();
        const tribeResults = [];

        for (const tribe of tribes) {
            const members = await getTribeMembers(tribe.id);

            let sumLoot = 0;
            let sumScav = 0;

            for (const player of members) {
                try {
                    const stats = await getPlayerDailyStats(player.id);
                    sumLoot += stats.loot;
                    sumScav += stats.scav;
                    await sleep(150);
                } catch (e) {
                    console.warn("[Yaver] Player stat failed:", player.name);
                }
            }

            const totalRes = sumLoot + sumScav;
            const score = tribe.points > 0 ? (totalRes / tribe.points) : 0;

            tribeResults.push({
                name: tribe.name,
                points: tribe.points,
                members: members.length,
                loot: sumLoot,
                scav: sumScav,
                totalRes: totalRes,
                score: score
            });
        }

        tribeResults.sort((a, b) => b.score - a.score);

        const maxScore = tribeResults[0]?.score || 1;

        let output = "";
        output += `[b][size=15]Tribe Comparison Report - ${TODAY}[/size][/b]\n\n`;
        output += `[table]\n`;
        output += `[**]Rank[||]Tribe[||]Total Points[||]Members[||]Σ Res Gathered[||]Σ Res Plundered[||]Total Res[||]Score[||]Performance[/**]\n`;

        tribeResults.forEach((t, i) => {
            const perf = (t.score / maxScore) * 100;
            output += `[*]${i + 1}[|][ally]${t.name}[/ally][|]${t.points.toLocaleString()}[|]${t.members}[|]${t.scav.toLocaleString()}[|]${t.loot.toLocaleString()}[|]${t.totalRes.toLocaleString()}[|][b]${t.score.toFixed(2)}[/b][|]${buildPerformanceBar(perf)}\n`;
        });

        output += `[/table]\n\n`;
        output += `[i]Score = Total Resources / Total Points[/i]\n`;

        console.log("=== Yaver Report v8 Result ===");
        console.log(output);

        UI.SuccessMessage("Yaver Report v8 completed ✅ (Check console)", 4000);
    };

    main();

})();
