/* W152 Yaver'in Günlük Raporu (v3.0) - World Domination Edition */
/* Özellikler: Klan İçi Detaylı Analiz + Dünya Top 15 Klan Analizi */

var tribeData = [];
var results = {};
var worldResults = [];
var count = 0;

// Köy ID (404 Hatası Koruması)
var currentVillage = game_data.village.id;

if (game_data.player.ally == 0) {
    UI.ErrorMessage("Komutanım, bir klanda değilsiniz!");
} else {
    // Yükleme Arayüzü
    $("#eng_fix_loader").remove();
    var content = $("#content_value");
    content.prepend('<div id="eng_fix_loader" style="background:#fff5bf; border:2px solid #a87e00; padding:15px; margin:10px 0; text-align:center; box-shadow: 2px 2px 5px rgba(0,0,0,0.3);"><h3>🎩 Yaver Raporu Hazırlıyor...</h3><p id="eng_status_text">Klan içi veriler toplanıyor...</p><div style="width:100%; background:#ccc; height:20px; border:1px solid #000; margin-top:5px;"><div id="eng_prog_bar" style="width:0%; background:#007bff; height:100%; color:#fff; font-weight:bold; line-height:20px;">0%</div></div></div>');

    // 1. AŞAMA: Kendi Klanımızı Tara
    $.get("/game.php?village=" + currentVillage + "&screen=ally&mode=members", function(data) {
        var html = $(data);
        var rows = html.find("table.vis tr.row_a, table.vis tr.row_b");
        
        rows.each(function() {
            var row = $(this);
            var playerLink = row.find("td:eq(0) a[href*='screen=info_player']");
            
            if (playerLink.length > 0) {
                var name = playerLink.text().trim();
                // Player ID ve Puanı al
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
        // Klan bitti, şimdi Dünya Verilerini çekelim
        $("#eng_status_text").text("🌍 Dünya Sıralaması (Top 15) Analiz Ediliyor...");
        fetchWorldData();
        return;
    }

    var member = tribeData.shift();
    var player = member.name;
    var playerPoints = member.points;
    var playerId = member.id;
    
    count++;
    
    // Bar Güncelleme
    var percent = Math.round((count / (count + tribeData.length + 1)) * 100); 
    $("#eng_prog_bar").css("width", percent + "%").text(percent + "% (" + player + ")");

    var p1 = $.get("/game.php?village=" + currentVillage + "&screen=ranking&mode=in_a_day&type=loot_res&name=" + encodeURIComponent(player));
    var p2 = $.get("/game.php?village=" + currentVillage + "&screen=ranking&mode=in_a_day&type=scavenge&name=" + encodeURIComponent(player));
    var p3 = $.get("/game.php?village=" + currentVillage + "&screen=ranking&mode=in_a_day&type=loot_vil&name=" + encodeURIComponent(player));
    var p4 = $.get("/game.php?village=" + currentVillage + "&screen=info_player&id=" + playerId);

    $.when(p1, p2, p3, p4).done(function(r1, r2, r3, r4) {
        var lootData = parseScore(r1[0], player);
        var scavengeData = parseScore(r2[0], player);
        var villageData = parseScore(r3[0], player);
        var eligiblePoints = parseVillagePoints(r4[0]); 

        results[player] = {
            points: playerPoints,
            loot: lootData.score,
            lootDate: lootData.date,
            scavenge: scavengeData.score,
            scavengeDate: scavengeData.date,
            villages: villageData.score,
            villagesDate: villageData.date,
            eligiblePoints: eligiblePoints
        };

        setTimeout(processQueue, 150);
    }).fail(function() {
        setTimeout(processQueue, 150);
    });
}

// --- DÜNYA VERİLERİ ÇEKME FONKSİYONU ---
function fetchWorldData() {
    var pAlly = $.get("/game.php?village=" + currentVillage + "&screen=ranking&mode=ally");
    var pLoot = $.get("/game.php?village=" + currentVillage + "&screen=ranking&mode=in_a_day&type=loot_res&subtype=ally");
    var pScav = $.get("/game.php?village=" + currentVillage + "&screen=ranking&mode=in_a_day&type=scavenge&subtype=ally");

    $.when(pAlly, pLoot, pScav).done(function(rAlly, rLoot, rScav) {
        
        // Senin gönderdiğin HTML yapısına göre (ally_ranking_table) parse ediyoruz
        var topTribes = parseAllyRanking(rAlly[0]);
        var lootTribes = parseInADayRanking(rLoot[0]);
        var scavTribes = parseInADayRanking(rScav[0]);

        // Sadece İlk 15 Klan
        topTribes = topTribes.slice(0, 15);

        topTribes.forEach(function(tribe) {
            // Yağma Skoru
            var lootScore = 0;
            var lData = lootTribes.find(t => t.tag === tribe.tag);
            if (lData) lootScore = lData.score;

            // Toplama Skoru
            var scavScore = 0;
            var sData = scavTribes.find(t => t.tag === tribe.tag);
            if (sData) scavScore = sData.score;

            var totalRes = lootScore + scavScore;
            var ratio = 0;
            if (tribe.points > 0) ratio = totalRes / tribe.points;

            worldResults.push({
                rank: tribe.rank,
                tag: tribe.tag,
                points: tribe.points,
                totalRes: totalRes,
                ratio: ratio
            });
        });

        generateFinalBBCode();

    }).fail(function() {
        UI.ErrorMessage("Dünya verilerine ulaşılamadı, sadece klan raporu basılıyor.");
        generateFinalBBCode();
    });
}

// --- PARSE İŞLEMLERİ ---

function parseAllyRanking(htmlData) {
    var list = [];
    var html = $(htmlData);
    // Senin HTML'indeki tablo ID'si: ally_ranking_table
    html.find("#ally_ranking_table tr:gt(0)").each(function() {
        var tds = $(this).find("td");
        if (tds.length > 2) {
            var rank = parseInt(tds.eq(0).text().trim());
            // Klan ismi linkin içinde
            var tag = tds.eq(1).find("a").text().trim(); 
            // Puan 3. sütunda
            var points = parseInt(tds.eq(2).text().trim().replace(/\./g, '')) || 0;

            if (tag) list.push({ rank: rank, tag: tag, points: points });
        }
    });
    return list;
}

function parseInADayRanking(htmlData) {
    var list = [];
    var html = $(htmlData);
    html.find("#in_a_day_ranking_table tr:gt(0)").each(function() {
        var tds = $(this).find("td");
        if (tds.length > 3) {
            var tag = tds.eq(1).text().trim();
            var score = parseInt(tds.eq(3).text().trim().replace(/\./g, '')) || 0;
            list.push({ tag: tag, score: score });
        }
    });
    return list;
}

function parseScore(htmlData, playerName) {
    var html = $(htmlData);
    var found = { score: "0", date: "-" };
    html.find("#in_a_day_ranking_table tr:gt(0)").each(function() {
        var row = $(this);
        if (row.find("td:eq(1)").text().trim() === playerName) {
            found.score = row.find("td:eq(3)").text().trim();
            found.date = row.find("td:eq(4)").text().trim();
            return false;
        }
    });
    return found;
}

function parseVillagePoints(htmlData) {
    var totalPoints = 0;
    $(htmlData).find("#villages_list tbody tr").each(function() {
        var cells = $(this).find("td");
        if(cells.length > 2) {
            var points = parseInt(cells.last().text().trim().replace(/\./g, '')) || 0;
            if (points > 2000) totalPoints += points;
        }
    });
    return totalPoints;
}

function getCleanScore(scoreStr) {
    return parseInt(scoreStr.replace(/\./g, '')) || 0;
}

function generateProgressBar(currentScore, maxScore) {
    if (maxScore === 0) return "-";
    var percent = (currentScore / maxScore) * 100;
    var filled = Math.round((percent / 100) * 10);
    if(filled > 10) filled = 10;
    var empty = 10 - filled;
    return "█".repeat(filled) + "░".repeat(empty) + " " + Math.round(percent) + "%";
}

function generateFinalBBCode() {
    $("#eng_fix_loader").remove();
    var d = new Date();
    var reportDate = ("0" + d.getDate()).slice(-2) + "." + ("0" + (d.getMonth() + 1)).slice(-2) + "." + d.getFullYear();

    var playerArray = Object.keys(results).map(function(key) {
        return { name: key, data: results[key] };
    });

    var output = "[b][size=15]Daily Performance Report - " + reportDate + "[/size][/b]\n\n";

    // 1. SCAVENGE
    playerArray.sort(function(a, b) { return getCleanScore(b.data.scavenge) - getCleanScore(a.data.scavenge); });
    var maxScav = playerArray.length > 0 ? getCleanScore(playerArray[0].data.scavenge) : 0;
    output += "[b]🎒 Resources Gathered (Scavenging)[/b]\n[table]\n[**]#[||]Player[||]Score[||]Perf[/**]\n";
    var rank = 1;
    playerArray.forEach(function(p) {
        if(p.data.scavenge !== "0") {
             output += `[*]${rank++}[|][player]${p.name}[/player][|]${p.data.scavenge}[|]${generateProgressBar(getCleanScore(p.data.scavenge), maxScav)}\n`;
        }
    });
    output += "[/table]\n\n";

    // 2. LOOT
    playerArray.sort(function(a, b) { return getCleanScore(b.data.loot) - getCleanScore(a.data.loot); });
    var maxLoot = playerArray.length > 0 ? getCleanScore(playerArray[0].data.loot) : 0;
    output += "[b]⚔️ Resources Plundered (Loot)[/b]\n[table]\n[**]#[||]Player[||]Score[||]Perf[/**]\n";
    rank = 1;
    playerArray.forEach(function(p) {
        if(p.data.loot !== "0") {
             output += `[*]${rank++}[|][player]${p.name}[/player][|]${p.data.loot}[|]${generateProgressBar(getCleanScore(p.data.loot), maxLoot)}\n`;
        }
    });
    output += "[/table]\n\n";

    // 3. KLAN İÇİ VERİMLİLİK
    playerArray.forEach(function(p) {
        var totalRes = getCleanScore(p.data.loot) + getCleanScore(p.data.scavenge);
        p.data.ratio = (p.data.eligiblePoints > 0) ? totalRes / p.data.eligiblePoints : 0;
    });
    playerArray.sort(function(a, b) { return b.data.ratio - a.data.ratio; });
    var maxRatio = playerArray.length > 0 ? playerArray[0].data.ratio : 0;

    output += "[b]📈 Player Efficiency (Res / 2k+ Village Points)[/b]\n[table]\n[**]#[||]Player[||]2k+ Pts[||]Total Res[||]Score[||]Perf[/**]\n";
    rank = 1;
    playerArray.forEach(function(p) {
        if(p.data.ratio > 0) {
             var dRes = (getCleanScore(p.data.loot) + getCleanScore(p.data.scavenge)).toLocaleString().replace(/,/g, ".");
             var dPoints = p.data.eligiblePoints.toLocaleString().replace(/,/g, ".");
             output += `[*]${rank++}[|][player]${p.name}[/player][|]${dPoints}[|]${dRes}[|][b]${p.data.ratio.toFixed(2)}[/b][|]${generateProgressBar(p.data.ratio, maxRatio)}\n`;
        }
    });
    output += "[/table]\n\n";

    // 4. DÜNYA TOP 15 VERİMLİLİK (YENİ)
    if (worldResults.length > 0) {
        worldResults.sort(function(a, b) { return b.ratio - a.ratio; });
        var maxWorldRatio = worldResults[0].ratio;

        output += "[b]🌍 World Top 15 Tribes Efficiency (Res / Total Points)[/b]\n";
        output += "[i]Comparison of the top 15 tribes based on Total Points vs Daily Resource Gain (Loot+Scavenge)[/i]\n";
        output += "[table]\n";
        output += "[**]Rank[||]Tribe[||]Total Points[||]Daily Res[||]Score[||]Perf[/**]\n";
        
        worldResults.forEach(function(w) {
            var dRes = w.totalRes.toLocaleString().replace(/,/g, ".");
            var dPoints = w.points.toLocaleString().replace(/,/g, ".");
            var bar = generateProgressBar(w.ratio, maxWorldRatio);
            
            output += `[*]${w.rank}[|][ally]${w.tag}[/ally][|]${dPoints}[|]${dRes}[|][b]${w.ratio.toFixed(2)}[/b][|]${bar}\n`;
        });
        output += "[/table]";
    }
    
    Dialog.show("Yaver Raporu v3.0", '<textarea cols="70" rows="20" onclick="this.select()">' + output + '</textarea>');
}
