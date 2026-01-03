/* YAVER'S ULTIMATE INTEL v9.0 (Detailed Records Edition)
   Methodology: Global Percentile + Bootstrap CI + Raw Records & Dates
   Author: controleng & Gemini
   Hosted on GitHub
*/

(function() {
    // --- AYARLAR ---
    var delayBetweenRequests = 150; 
    var bootstrapIterations = 1000; 
    var penaltyK = 1.0; 

    // --- DEĞİŞKENLER ---
    var targetTribes = [];
    var allPlayersGlobal = []; 
    var currentTribeIndex = 0;
    var currentMemberIndex = 0;
    
    // --- GUI TEMİZLİĞİ ---
    if ($('#yaver_intel_gui').length > 0) $('#yaver_intel_gui').remove();

    // --- GUI OLUŞTURMA ---
    var html = `
    <div id="yaver_intel_gui" style="position:fixed; top:50px; left:50%; margin-left:-350px; width:700px; background:#f4e4bc; border:3px solid #7d510f; z-index:99999; padding:10px; box-shadow:0 0 15px rgba(0,0,0,0.6); font-family: Verdana, Arial; font-size:12px;">
        <h3 style="margin:0; background:#7d510f; color:#fff; padding:8px; text-align:center;">🔬 Yaver'in Nihai Analizi v9.0 (Detaylı)</h3>
        <div id="intel_content" style="padding:15px; text-align:center;">
            <p><strong>Metodoloji:</strong> Global Percentile + Kayıtlı Rekorlar</p>
            <ul style="text-align:left; margin-left:100px; font-size:11px;">
                <li>✅ <strong>Bilimsel Skor:</strong> Global Yüzdelik & Bootstrap Güven Aralığı</li>
                <li>✅ <strong>Kanıt:</strong> Scavenge/Loot Rekor Skorları ve Tarihleri</li>
                <li>✅ <strong>Analiz:</strong> Hem aktiflik hem verimlilik ölçümü.</li>
            </ul>
            <button class="btn" style="padding:8px 25px; font-weight:bold; font-size:14px;" onclick="startIntelligence()">📡 Analizi Başlat</button>
        </div>
        <div id="intel_status" style="display:none; padding:10px;">
            <p id="intel_status_text" style="font-weight:bold; text-align:center;">Veri Havuzu Oluşturuluyor...</p>
            <div style="background:#ccc; height:24px; border:1px solid #000; width:100%; border-radius:3px;">
                <div id="intel_progress" style="background:#007bff; width:0%; height:100%; color:#fff; line-height:24px; font-size:12px; text-align:center;">0%</div>
            </div>
            <div id="intel_console" style="height:120px; overflow-y:auto; background:#fff; border:1px solid #999; margin-top:5px; padding:5px; font-size:10px; font-family:monospace;"></div>
        </div>
    </div>`;
    $('body').append(html);

    // --- FONKSİYONLAR ---

    window.startIntelligence = function() {
        if (window.location.href.indexOf('mode=con_ally') === -1) {
            if(confirm("Analiz için 'Ranking -> Continent Tribes' sayfasına gidilmeli. Onaylıyor musunuz?")) {
                window.location.href = "/game.php?screen=ranking&mode=con_ally";
            }
            return;
        }
        $('#intel_content').hide();
        $('#intel_status').show();
        analyzeRankingTable();
    };

    function log(msg) {
        var c = $('#intel_console');
        c.append('<div>> ' + msg + '</div>');
        c.scrollTop(c[0].scrollHeight);
    }

    function analyzeRankingTable() {
        var rows = $('#con_ally_ranking_table tr:gt(0)');
        rows.each(function(index) {
            if (index >= 5) return false;
            var link = $(this).find('td:eq(1) a');
            targetTribes.push({
                id: link.attr('href').match(/id=(\d+)/)[1],
                name: link.text().trim(),
                link: link.attr('href')
            });
        });

        if(targetTribes.length === 0) { alert("Klan tablosu bulunamadı."); return; }
        processNextTribe();
    }

    function processNextTribe() {
        if (currentTribeIndex >= targetTribes.length) {
            startPlayerScanning();
            return;
        }
        var tribe = targetTribes[currentTribeIndex];
        log("Klan Kütüğü Çekiliyor: " + tribe.name);
        
        $.get(tribe.link, function(data) {
            var html = $(data);
            var memberRows = html.find('table.vis').has('th:contains("Global Rank")').find('tr:gt(0)');
            memberRows.each(function() {
                var row = $(this);
                var playerLink = row.find('td:eq(0) a');
                if(playerLink.length > 0) {
                    allPlayersGlobal.push({
                        id: playerLink.attr('href').match(/id=(\d+)/)[1],
                        name: playerLink.text().trim(),
                        tribeId: tribe.id,
                        tribeName: tribe.name,
                        points: parseInt(row.find('td:eq(2)').text().replace(/\./g, '').trim()) || 0,
                        lootRes: 0,
                        lootResDate: "-",
                        lootVil: 0,
                        scavenge: 0,
                        scavengeDate: "-"
                    });
                }
            });
            currentTribeIndex++;
            processNextTribe();
        });
    }

    function startPlayerScanning() {
        currentMemberIndex = 0;
        log("Global Havuz: " + allPlayersGlobal.length + " oyuncu taranıyor...");
        processPlayerMetrics();
    }

    function processPlayerMetrics() {
        if (currentMemberIndex >= allPlayersGlobal.length) {
            performScientificAnalysis();
            return;
        }

        var player = allPlayersGlobal[currentMemberIndex];
        var percent = Math.round(((currentMemberIndex + 1) / allPlayersGlobal.length) * 100);
        $('#intel_progress').css('width', percent+'%').text(percent+'% (' + player.name + ')');

        var p1 = $.get("/game.php?screen=ranking&mode=in_a_day&type=loot_res&name=" + encodeURIComponent(player.name));
        var p2 = $.get("/game.php?screen=ranking&mode=in_a_day&type=loot_vil&name=" + encodeURIComponent(player.name));
        var p3 = $.get("/game.php?screen=ranking&mode=in_a_day&type=scavenge&name=" + encodeURIComponent(player.name));

        $.when(p1, p2, p3).done(function(r1, r2, r3) {
            // Ham veri ve tarihleri çek
            var lResData = parseScore(r1[0], player.name);
            var lVilData = parseScore(r2[0], player.name);
            var scavData = parseScore(r3[0], player.name);

            player.lootRes = lResData.score;
            player.lootResDate = lResData.date;
            
            player.lootVil = lVilData.score;
            
            player.scavenge = scavData.score;
            player.scavengeDate = scavData.date;

            currentMemberIndex++;
            setTimeout(processPlayerMetrics, delayBetweenRequests);
        }).fail(function() {
            log("Hata: " + player.name + " atlandı.");
            currentMemberIndex++;
            setTimeout(processPlayerMetrics, delayBetweenRequests);
        });
    }

    function parseScore(htmlData, playerName) {
        var html = $(htmlData);
        var rows = html.find("#in_a_day_ranking_table tr:gt(0)");
        var result = { score: 0, date: "-" };
        
        rows.each(function() {
            var row = $(this);
            if (row.find("td:eq(1)").text().trim() === playerName) {
                // Sütun 3: Skor, Sütun 4: Tarih
                result.score = parseInt(row.find("td:eq(3)").text().trim().replace(/\./g, '')) || 0;
                result.date = row.find("td:eq(4)").text().trim();
                return false;
            }
        });
        return result;
    }

    // --- MATEMATİKSEL MOTOR ---
    function performScientificAnalysis() {
        $('#intel_status_text').text("Bilimsel Hesaplama Yapılıyor...");
        
        var pointsArr = allPlayersGlobal.map(p => p.points).sort((a,b) => a-b);
        var scavArr = allPlayersGlobal.map(p => p.scavenge).sort((a,b) => a-b);
        var lootResArr = allPlayersGlobal.map(p => p.lootRes).sort((a,b) => a-b);
        var lootVilArr = allPlayersGlobal.map(p => p.lootVil).sort((a,b) => a-b);

        allPlayersGlobal.forEach(p => {
            var p_R = getPercentile(p.points, pointsArr);
            var p_S = getPercentile(p.scavenge, scavArr);
            var p_LA = getPercentile(p.lootRes, lootResArr);
            var p_LC = getPercentile(p.lootVil, lootVilArr);

            var p_L = Math.sqrt(p_LA * p_LC);
            var w = 0.5 + (0.5 * p_R);

            p.metrics = { p_S: p_S, p_L: p_L, w: w, p_R: p_R };
        });

        var tribeStats = [];
        targetTribes.forEach(t => {
            var members = allPlayersGlobal.filter(p => p.tribeId === t.id);
            if (members.length === 0) return;

            var raw = calculateWeightedScores(members);
            
            var sd_S = getStandardDeviation(members.map(m => m.metrics.p_S));
            var sd_L = getStandardDeviation(members.map(m => m.metrics.p_L));
            
            var P_S_adj = raw.P_S * Math.exp(-penaltyK * sd_S);
            var P_L_adj = raw.P_L * Math.exp(-penaltyK * sd_L);
            var P_K_adj = 100 * Math.sqrt((P_S_adj/100) * (P_L_adj/100));

            var bootResults = runBootstrap(members, bootstrapIterations);

            tribeStats.push({
                name: t.name,
                members: members,
                adj: { S: P_S_adj, L: P_L_adj, K: P_K_adj },
                ci: bootResults
            });
        });

        tribeStats.sort((a,b) => b.adj.K - a.adj.K);
        generateFinalReport(tribeStats);
    }

    // --- YARDIMCILAR ---
    function getPercentile(val, arr) {
        var n = arr.length;
        var less = 0, eq = 0;
        for(var i=0; i<n; i++) {
            if(arr[i] < val) less++;
            else if(arr[i] === val) eq++;
        }
        return (less + (0.5 * eq)) / n;
    }

    function calculateWeightedScores(memberList) {
        var sumW = 0, sumS = 0, sumL = 0;
        memberList.forEach(m => {
            sumW += m.metrics.w;
            sumS += (m.metrics.w * m.metrics.p_S);
            sumL += (m.metrics.w * m.metrics.p_L);
        });
        if (sumW === 0) return { P_S: 0, P_L: 0 };
        return { P_S: 100 * (sumS / sumW), P_L: 100 * (sumL / sumW) };
    }

    function getStandardDeviation(arr) {
        var n = arr.length;
        if(n <= 1) return 0;
        var mean = arr.reduce((a,b) => a+b) / n;
        var variance = arr.reduce((a,b) => a + Math.pow(b-mean, 2), 0) / n;
        return Math.sqrt(variance);
    }

    function runBootstrap(members, iterations) {
        var karmaSamples = [];
        var n = members.length;
        for(var i=0; i<iterations; i++) {
            var sample = [];
            for(var j=0; j<n; j++) sample.push(members[Math.floor(Math.random() * n)]);
            
            var res = calculateWeightedScores(sample);
            var sd_S = getStandardDeviation(sample.map(m => m.metrics.p_S));
            var sd_L = getStandardDeviation(sample.map(m => m.metrics.p_L));
            
            var S_adj = res.P_S * Math.exp(-penaltyK * sd_S);
            var L_adj = res.P_L * Math.exp(-penaltyK * sd_L);
            var K_adj = 100 * Math.sqrt((S_adj/100) * (L_adj/100));
            karmaSamples.push(K_adj);
        }
        karmaSamples.sort((a,b) => a-b);
        return { lower: karmaSamples[Math.floor(iterations * 0.025)].toFixed(1), upper: karmaSamples[Math.floor(iterations * 0.975)].toFixed(1) };
    }

    function numFmt(num) {
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    }

    // --- RAPORLAMA ---
    function generateFinalReport(stats) {
        var d = new Date();
        var dateStr = d.getDate() + "/" + (d.getMonth()+1);
        var output = "[b][size=14]🔬 Yaver'in Nihai Bilimsel Raporu (" + dateStr + ")[/size][/b]\n";
        output += "[i]Methodology: Global Percentile, GeoMean, Bootstrap CI (95%)[/i]\n\n";

        output += "[b]🏆 KLAN PERFORMANS ENDEKSİ (0-100)[/b]\n";
        output += "[table]\n[**]Sıra[||]Klan[||]Scavenge[||]Loot[||]KARMA (Güven Aralığı)[/**]\n";
        stats.forEach((s, i) => {
            output += `[*] ${i+1} [|] ${s.name} [|] ${s.adj.S.toFixed(1)} [|] ${s.adj.L.toFixed(1)} [|] [b]${s.adj.K.toFixed(1)}[/b] (CI: ${s.ci.lower}-${s.ci.upper})\n`;
        });
        output += "[/table]\n\n";
        output += "--------------------------------------------------\n\n";

        stats.forEach(s => {
            output += `[b][size=12]🛡️ ${s.name}[/size][/b]\n`;
            
            // Sıralama: Karma Yüzdeliğe göre
            s.members.sort((a,b) => {
                var scoreA = Math.sqrt(a.metrics.p_S * a.metrics.p_L);
                var scoreB = Math.sqrt(b.metrics.p_S * b.metrics.p_L);
                return scoreB - scoreA;
            });

            output += `[spoiler=📂 Oyuncu Detayları & Rekorlar]\n`;
            // YENİ SÜTUNLAR EKLENDİ
            output += `[table]\n[**]Oyuncu[||]Puan (Rank %)[||]Scavenge (Rekor/Tarih)[||]Loot (Rekor/Tarih)[||]Karma %[/**]\n`;
            
            s.members.forEach(m => {
                if (m.points > 0 && (m.metrics.p_S > 0.01 || m.metrics.p_L > 0.01)) {
                    var rankP = (m.metrics.p_R * 100).toFixed(0);
                    var karmaP = (Math.sqrt(m.metrics.p_S * m.metrics.p_L) * 100).toFixed(1);
                    
                    // Rekorların Formatlanması
                    var scavDisplay = m.scavenge > 0 ? `${numFmt(m.scavenge)} (${m.scavengeDate})` : "-";
                    var lootDisplay = m.lootRes > 0 ? `${numFmt(m.lootRes)} (${m.lootResDate})` : "-";

                    output += `[*] [player]${m.name}[/player] [|] ${numFmt(m.points)} (${rankP}%) [|] ${scavDisplay} [|] ${lootDisplay} [|] [b]${karmaP}[/b]\n`;
                }
            });
            output += `[/table]\n[/spoiler]\n\n`;
        });

        Dialog.show("Nihai Rapor", '<textarea cols="80" rows="30" onclick="this.select()">' + output + '</textarea>');
        $('#yaver_intel_gui').remove();
    }
})();
