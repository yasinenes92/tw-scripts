/* W152 Yaver'in Günlük Raporu (v20.0) - Efficiency Update */
var tribeData = [];
var results = {};
var count = 0;

// Köy ID (404 Hatası Koruması)
var currentVillage = game_data.village.id;

if (game_data.player.ally == 0) {
    UI.ErrorMessage("Komutanım, bir klanda değilsiniz!");
} else {
    // Yükleme Arayüzü
    $("#eng_fix_loader").remove();
    var content = $("#content_value");
    content.prepend('<div id="eng_fix_loader" style="background:#fff5bf; border:2px solid #a87e00; padding:15px; margin:10px 0; text-align:center; box-shadow: 2px 2px 5px rgba(0,0,0,0.3);"><h3>🎩 Yaver bugünün raporunu basıyor...</h3><p id="eng_status_text">Klan kütüğü inceleniyor...</p><div style="width:100%; background:#ccc; height:20px; border:1px solid #000; margin-top:5px;"><div id="eng_prog_bar" style="width:0%; background:#007bff; height:100%; color:#fff; font-weight:bold; line-height:20px;">0%</div></div></div>');

    $.get("/game.php?village=" + currentVillage + "&screen=ally&mode=members", function(data) {
        var html = $(data);
        var rows = html.find("table.vis tr.row_a, table.vis tr.row_b");
        
        rows.each(function() {
            var row = $(this);
            var playerLink = row.find("td:eq(0) a[href*='screen=info_player']");
            
            if (playerLink.length > 0) {
                var name = playerLink.text().trim();
                // Player ID'yi linkten çekiyoruz
                var href = playerLink.attr('href');
                var playerId = href.match(/id=(\d+)/) ? href.match(/id=(\d+)/)[1] : null;

                var points = row.find("td:eq(2)").text().trim(); 
                if (!points || points === "") {
                    points = row.find("td:eq(3)").text().trim();
                }

                var exists = tribeData.some(function(m) { return m.name === name; });
                if (!exists && playerId) {
                    tribeData.push({ name: name, points: points, id: playerId });
                }
            }
        });

        $("#eng_status_text").text(tribeData.length + " asker tespit edildi. Veriler toplanıyor...");
        processQueue();
    });
}

function processQueue() {
    if (tribeData.length === 0) {
        generateFinalBBCode();
        return;
    }

    var member = tribeData.shift();
    var player = member.name;
    var playerPoints = member.points;
    var playerId = member.id;
    
    count++;
    
    // Bar Güncelleme
    var total = count + tribeData.length;
    var percent = Math.round((count / total) * 100);
    $("#eng_prog_bar").css("width", percent + "%").text(percent + "% (" + player + ")");

    // İstekler: Yağma, Toplama, Köy Sayısı ve OYUNCU PROFİLİ (Köy puanları için)
    var p1 = $.get("/game.php?village=" + currentVillage + "&screen=ranking&mode=in_a_day&type=loot_res&name=" + encodeURIComponent(player));
    var p2 = $.get("/game.php?village=" + currentVillage + "&screen=ranking&mode=in_a_day&type=scavenge&name=" + encodeURIComponent(player));
    var p3 = $.get("/game.php?village=" + currentVillage + "&screen=ranking&mode=in_a_day&type=loot_vil&name=" + encodeURIComponent(player));
    var p4 = $.get("/game.php?village=" + currentVillage + "&screen=info_player&id=" + playerId);

    $.when(p1, p2, p3, p4).done(function(r1, r2, r3, r4) {
        var lootData = parseScore(r1[0], player);
        var scavengeData = parseScore(r2[0], player);
        var villageData = parseScore(r3[0], player);
        var eligiblePoints = parseVillagePoints(r4[0]); // Yeni fonksiyon

        results[player] = {
            points: playerPoints,
            loot: lootData.score,
            lootDate: lootData.date,
            scavenge: scavengeData.score,
            scavengeDate: scavengeData.date,
            villages: villageData.score,
            villagesDate: villageData.date,
            eligiblePoints: eligiblePoints // 2k üstü köy puanları toplamı
        };

        setTimeout(processQueue, 200);
    }).fail(function() {
        setTimeout(processQueue, 200);
    });
}

function parseScore(htmlData, playerName) {
    var html = $(htmlData);
    var rows = html.find("#in_a_day_ranking_table tr:gt(0)");
    var found = { score: "0", date: "-" };

    rows.each(function() {
        var row = $(this);
        var nameInRow = row.find("td:eq(1)").text().trim();
        if (nameInRow === playerName) {
            found.score = row.find("td:eq(3)").text().trim();
            found.date = row.find("td:eq(4)").text().trim();
            return false;
        }
    });
    return found;
}

// YENİ: Oyuncu profilinden 2k üstü köylerin puanını toplar
function parseVillagePoints(htmlData) {
    var html = $(htmlData);
    var totalPoints = 0;
    
    // Profildeki köy tablosunu bul (#villages_list)
    var vRows = html.find("#villages_list tbody tr");
    
    vRows.each(function() {
        // Puan genelde son sütundadır, HTML yapısına göre td:last veya belirli sıra
        var cells = $(this).find("td");
        if(cells.length > 2) {
            // Tablo yapısı: İsim | Koordinat | Puan
            var pointStr = cells.last().text().trim();
            var points = parseInt(pointStr.replace(/\./g, '')) || 0;
            
            if (points > 2000) {
                totalPoints += points;
            }
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
    var totalBlocks = 10; 
    var filledBlocks = Math.round((percent / 100) * totalBlocks);
    var emptyBlocks = totalBlocks - filledBlocks;
    
    // Barı aşırı taşmalara karşı koru
    if (filledBlocks > 10) { filledBlocks = 10; emptyBlocks = 0; }
    
    var bar = "█".repeat(filledBlocks) + "░".repeat(emptyBlocks);
    
    return bar + " " + Math.round(percent) + "%";
}

function generateFinalBBCode() {
    $("#eng_fix_loader").remove();
    
    var d = new Date();
    var day = ("0" + d.getDate()).slice(-2);
    var month = ("0" + (d.getMonth() + 1)).slice(-2);
    var year = d.getFullYear();
    var reportDate = day + "." + month + "." + year;

    var playerArray = Object.keys(results).map(function(key) {
        return { name: key, data: results[key] };
    });

    var output = "[b][size=15]Daily Performance Report - " + reportDate + "[/size][/b]\n\n";

    // 1. TABLO: TOPLAMA
    playerArray.sort(function(a, b) {
        return getCleanScore(b.data.scavenge) - getCleanScore(a.data.scavenge);
    });
    var maxScavengeScore = playerArray.length > 0 ? getCleanScore(playerArray[0].data.scavenge) : 0;

    output += "[b][size=12]🎒 Resources Gathered (Scavenging)[/size][/b]\n";
    output += "[table]\n";
    output += "[**]#[||]Player[||]Points[||]Score[||]Date[||]Performance[/**]\n";
    var rank = 1;
    playerArray.forEach(function(p) {
        var score = p.data.scavenge;
        if(score !== "0") {
             var bar = generateProgressBar(getCleanScore(score), maxScavengeScore);
             output += "[*]" + rank++ + "[|][player]" + p.name + "[/player][|]" + p.data.points + "[|]" + score + "[|]" + p.data.scavengeDate + "[|]" + bar + "\n";
        }
    });
    output += "[/table]\n\n";

    // 2. TABLO: HAMMADDE
    playerArray.sort(function(a, b) {
        return getCleanScore(b.data.loot) - getCleanScore(a.data.loot);
    });
    var maxLootScore = playerArray.length > 0 ? getCleanScore(playerArray[0].data.loot) : 0;

    output += "[b][size=12]⚔️ Resources Plundered (Loot)[/size][/b]\n";
    output += "[table]\n";
    output += "[**]#[||]Player[||]Points[||]Score[||]Date[||]Performance[/**]\n";
    rank = 1;
    playerArray.forEach(function(p) {
        var score = p.data.loot;
        if(score !== "0") { 
            var bar = generateProgressBar(getCleanScore(score), maxLootScore);
            output += "[*]" + rank++ + "[|][player]" + p.name + "[/player][|]" + p.data.points + "[|]" + score + "[|]" + p.data.lootDate + "[|]" + bar + "\n";
        }
    });
    output += "[/table]\n\n";

    // 3. TABLO: KÖY SAYISI
    playerArray.sort(function(a, b) {
        return getCleanScore(b.data.villages) - getCleanScore(a.data.villages);
    });
    var maxVillageScore = playerArray.length > 0 ? getCleanScore(playerArray[0].data.villages) : 0;

    output += "[b][size=12]🏘️ Villages Plundered (Counts)[/size][/b]\n";
    output += "[table]\n";
    output += "[**]#[||]Player[||]Points[||]Score[||]Date[||]Performance[/**]\n";
    rank = 1;
    playerArray.forEach(function(p) {
        var score = p.data.villages;
        if(score !== "0") {
             var bar = generateProgressBar(getCleanScore(score), maxVillageScore);
             output += "[*]" + rank++ + "[|][player]" + p.name + "[/player][|]" + p.data.points + "[|]" + score + "[|]" + p.data.villagesDate + "[|]" + bar + "\n";
        }
    });
    output += "[/table]\n\n";

    // 4. TABLO (YENİ): VERİMLİLİK SKORU
    playerArray.forEach(function(p) {
        var totalRes = getCleanScore(p.data.loot) + getCleanScore(p.data.scavenge);
        var validPoints = p.data.eligiblePoints;
        var ratio = 0;
        
        if (validPoints > 0) {
            ratio = totalRes / validPoints;
        }
        p.data.efficiencyRatio = ratio;
    });

    // Sıralama
    playerArray.sort(function(a, b) {
        return b.data.efficiencyRatio - a.data.efficiencyRatio;
    });

    var maxRatio = playerArray.length > 0 ? playerArray[0].data.efficiencyRatio : 0;

    output += "[b][size=12]📈 Efficiency Score (Res / 2k+ Village Points)[/size][/b]\n";
    output += "[i]Score = (Loot + Scavenge) / Sum of Points (Villages > 2000p)[/i]\n";
    output += "[table]\n";
    output += "[**]#[||]Player[||]Active Points[||]Total Res[||]Score[||]Performance[/**]\n";
    rank = 1;

    playerArray.forEach(function(p) {
        var ratio = p.data.efficiencyRatio;
        var totalRes = getCleanScore(p.data.loot) + getCleanScore(p.data.scavenge);
        var validPoints = p.data.eligiblePoints;

        if(ratio > 0) {
             var displayRatio = ratio.toFixed(2);
             var bar = generateProgressBar(ratio, maxRatio);
             var displayRes = totalRes.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
             var displayPoints = validPoints.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");

             output += "[*]" + rank++ + "[|][player]" + p.name + "[/player][|]" + displayPoints + "[|]" + displayRes + "[|][b]" + displayRatio + "[/b][|]" + bar + "\n";
        }
    });
    output += "[/table]";
    
    Dialog.show("Yaver Raporu", '<textarea cols="70" rows="20" onclick="this.select()">' + output + '</textarea>');
}
