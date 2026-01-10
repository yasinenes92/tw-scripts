/* W152 Yaver'in Günlük Raporu (v2.0) - World Domination */
var tribeData = [];
var results = {};
var worldResults = [];
var count = 0;
var currentVillage = game_data.village.id;

if (game_data.player.ally == 0) {
    UI.ErrorMessage("Komutanım, bir klanda değilsiniz!");
} else {
    $("#eng_fix_loader").remove();
    var content = $("#content_value");
    content.prepend('<div id="eng_fix_loader" style="background:#fff5bf; border:2px solid #a87e00; padding:15px; margin:10px 0; text-align:center; box-shadow: 2px 2px 5px rgba(0,0,0,0.3);"><h3>🎩 Yaver Raporu Hazırlıyor...</h3><p id="eng_status_text">Klan kütüğü ve Dünya Sıralaması inceleniyor...</p><div style="width:100%; background:#ccc; height:20px; border:1px solid #000; margin-top:5px;"><div id="eng_prog_bar" style="width:0%; background:#007bff; height:100%; color:#fff; font-weight:bold; line-height:20px;">0%</div></div></div>');

    // 1. AŞAMA: Kendi Klanımızı Tara
    $.get("/game.php?village=" + currentVillage + "&screen=ally&mode=members", function(data) {
        var html = $(data);
        var rows = html.find("table.vis tr.row_a, table.vis tr.row_b");
        
        rows.each(function() {
            var row = $(this);
            var playerLink = row.find("td:eq(0) a[href*='screen=info_player']");
            if (playerLink.length > 0) {
                var name = playerLink.text().trim();
                var href = playerLink.attr('href');
                var playerId = href.match(/id=(\d+)/) ? href.match(/id=(\d+)/)[1] : null;
                var points = row.find("td:eq(2)").text().trim(); 
                if (!points || points === "") points = row.find("td:eq(3)").text().trim();

                var exists = tribeData.some(function(m) { return m.name === name; });
                if (!exists && playerId) {
                    tribeData.push({ name: name, points: points, id: playerId });
                }
            }
        });
        processQueue();
    });
}

function processQueue() {
    if (tribeData.length === 0) {
        $("#eng_status_text").text("Dünya Sıralamaları Analiz Ediliyor (Biraz sürebilir)...");
        fetchWorldData();
        return;
    }

    var member = tribeData.shift();
    var player = member.name;
    var points = member.points;
    var pid = member.id;
    count++;
    
    var percent = Math.round((count / (count + tribeData.length + 1)) * 100); 
    $("#eng_prog_bar").css("width", percent + "%").text(percent + "% (" + player + ")");

    var p1 = $.get("/game.php?village=" + currentVillage + "&screen=ranking&mode=in_a_day&type=loot_res&name=" + encodeURIComponent(player));
    var p2 = $.get("/game.php?village=" + currentVillage + "&screen=ranking&mode=in_a_day&type=scavenge&name=" + encodeURIComponent(player));
    var p3 = $.get("/game.php?village=" + currentVillage + "&screen=ranking&mode=in_a_day&type=loot_vil&name=" + encodeURIComponent(player));
    var p4 = $.get("/game.php?village=" + currentVillage + "&screen=info_player&id=" + pid);

    $.when(p1, p2, p3, p4).done(function(r1, r2, r3, r4) {
        results[player] = {
            points: points,
            loot: parseScore(r1[0], player),
            scavenge: parseScore(r2[0], player),
            villages: parseScore(r3[0], player),
            eligiblePoints: parseVillagePoints(r4[0])
        };
        setTimeout(processQueue, 150);
    }).fail(function() { setTimeout(processQueue, 150); });
}

function fetchWorldData() {
    var pAlly = $.get("/game.php?village=" + currentVillage + "&screen=ranking&mode=ally");
    var pLoot = $.get("/game.php?village=" + currentVillage + "&screen=ranking&mode=in_a_day&type=loot_res&subtype=ally");
    var pScav = $.get("/game.php?village=" + currentVillage + "&screen=ranking&mode=in_a_day&type=scavenge&subtype=ally");

    $.when(pAlly, pLoot, pScav).done(function(rAlly, rLoot, rScav) {
        var topTribes = parseAllyRanking(rAlly[0]).slice(0, 15);
        var lootTribes = parseInADayRanking(rLoot[0]);
        var scavTribes = parseInADayRanking(rScav[0]);

        topTribes.forEach(function(tribe) {
            var lootScore = (lootTribes.find(t => t.tag === tribe.tag) || {score:0}).score;
            var scavScore = (scavTribes.find(t => t.tag === tribe.tag) || {score:0}).score;
            var totalRes = lootScore + scavScore;
            
            worldResults.push({
                rank: tribe.rank,
                tag: tribe.tag,
                points: tribe.points,
                totalRes: totalRes,
                ratio: (tribe.points > 0) ? totalRes / tribe.points : 0
            });
        });
        generateFinalBBCode();
    }).fail(function() { generateFinalBBCode(); });
}

function parseScore(html, name) {
    var row = $(html).find("#in_a_day_ranking_table tr").filter(function() {
        return $(this).find("td:eq(1)").text().trim() === name;
    });
    return {
        score: row.find("td:eq(3)").text().trim() || "0",
        date: row.find("td:eq(4)").text().trim() || "-"
    };
}

function parseVillagePoints(html) {
    var total = 0;
    $(html).find("#villages_list tbody tr").each(function() {
        var txt = $(this).find("td:last").text().trim().replace(/\./g, '');
        var p = parseInt(txt) || 0;
        if (p > 2000) total += p;
    });
    return total;
}

function parseAllyRanking(html) {
    var list = [];
    $(html).find("table.vis tr:gt(0)").each(function() {
        var tds = $(this).find("td");
        if (tds.length > 2) {
            list.push({
                rank: parseInt(tds.eq(0).text().trim()),
                tag: tds.eq(1).find("a").text().trim(),
                points: parseInt(tds.eq(2).text().trim().replace(/\./g, '')) || 0
            });
        }
    });
    return list;
}

function parseInADayRanking(html) {
    var list = [];
    $(html).find("#in_a_day_ranking_table tr:gt(0)").each(function() {
        var tds = $(this).find("td");
        if (tds.length > 3) {
            list.push({
                tag: tds.eq(1).text().trim(),
                score: parseInt(tds.eq(3).text().trim().replace(/\./g, '')) || 0
            });
        }
    });
    return list;
}

function clean(str) { return parseInt(str.replace(/\./g, '')) || 0; }
function fmt(num) { return num.toLocaleString().replace(/,/g, "."); }

function bar(curr, max) {
    if (!max) return "-";
    var p = Math.min(10, Math.round((curr / max) * 10));
    return "█".repeat(p) + "░".repeat(10 - p) + " " + Math.round((curr / max) * 100) + "%";
}

function generateFinalBBCode() {
    $("#eng_fix_loader").remove();
    var output = "[b][size=15]Daily Performance Report - " + new Date().toLocaleDateString() + "[/size][/b]\n\n";
    
    var players = Object.keys(results).map(k => ({name: k, ...results[k]}));
    
    // SCAVENGE
    players.sort((a,b) => clean(b.scavenge.score) - clean(a.scavenge.score));
    var maxS = clean(players[0]?.scavenge.score || "0");
    output += "[b]🎒 Resources Gathered[/b]\n[table]\n[**]#[||]Player[||]Score[||]Perf[/**]\n";
    players.forEach((p, i) => { if(p.scavenge.score!="0") output += `[*]${i+1}[|][player]${p.name}[/player][|]${p.scavenge.score}[|]${bar(clean(p.scavenge.score), maxS)}\n`; });
    output += "[/table]\n\n";

    // LOOT
    players.sort((a,b) => clean(b.loot.score) - clean(a.loot.score));
    var maxL = clean(players[0]?.loot.score || "0");
    output += "[b]⚔️ Resources Plundered[/b]\n[table]\n[**]#[||]Player[||]Score[||]Perf[/**]\n";
    players.forEach((p, i) => { if(p.loot.score!="0") output += `[*]${i+1}[|][player]${p.name}[/player][|]${p.loot.score}[|]${bar(clean(p.loot.score), maxL)}\n`; });
    output += "[/table]\n\n";

    // PLAYER EFFICIENCY
    players.forEach(p => p.ratio = p.eligiblePoints ? (clean(p.loot.score)+clean(p.scavenge.score))/p.eligiblePoints : 0);
    players.sort((a,b) => b.ratio - a.ratio);
    var maxR = players[0]?.ratio || 0;
    output += "[b]📈 Player Efficiency (Res / 2k+ Village Points)[/b]\n[table]\n[**]#[||]Player[||]2k+ Pts[||]Total Res[||]Score[||]Perf[/**]\n";
    players.forEach((p, i) => { if(p.ratio>0) output += `[*]${i+1}[|][player]${p.name}[/player][|]${fmt(p.eligiblePoints)}[|]${fmt(clean(p.loot.score)+clean(p.scavenge.score))}[|][b]${p.ratio.toFixed(2)}[/b][|]${bar(p.ratio, maxR)}\n`; });
    output += "[/table]\n\n";

    // WORLD TOP 15
    if(worldResults.length){
        worldResults.sort((a,b) => b.ratio - a.ratio);
        var maxWR = worldResults[0].ratio;
        output += "[b]🌍 World Top 15 Tribes Efficiency (Res / Total Points)[/b]\n[table]\n[**]Rank[||]Tribe[||]Total Pts[||]Total Res[||]Score[||]Perf[/**]\n";
        worldResults.forEach(w => {
            output += `[*]${w.rank}[|][ally]${w.tag}[/ally][|]${fmt(w.points)}[|]${fmt(w.totalRes)}[|][b]${w.ratio.toFixed(2)}[/b][|]${bar(w.ratio, maxWR)}\n`;
        });
        output += "[/table]";
    }

    Dialog.show("Yaver Raporu v2", '<textarea cols="70" rows="20" onclick="this.select()">' + output + '</textarea>');
}
