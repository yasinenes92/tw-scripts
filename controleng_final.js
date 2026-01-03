/* CONTROLENG'S FINAL INTEL v3.0 (Cache-Buster Edition)
   Author: controleng
   Methodology: Global Percentile + Roster Karma + Fixed Dates
*/

(function() {
    // --- SETTINGS ---
    var delayBetweenRequests = 150; 
    var bootstrapIterations = 1000; 
    var penaltyK = 1.0; 

    // --- VARIABLES ---
    var targetTribes = [];
    var allPlayersGlobal = []; 
    var currentTribeIndex = 0;
    var currentMemberIndex = 0;
    
    // --- CLEAN GUI ---
    if ($('#controleng_gui').length > 0) $('#controleng_gui').remove();

    // --- CREATE GUI ---
    var html = `
    <div id="controleng_gui" style="position:fixed; top:50px; left:50%; margin-left:-380px; width:760px; background:#f4e4bc; border:3px solid #7d510f; z-index:99999; padding:10px; box-shadow:0 0 15px rgba(0,0,0,0.6); font-family: Verdana, Arial; font-size:12px;">
        <h3 style="margin:0; background:#7d510f; color:#fff; padding:8px; text-align:center;">📊 Controleng's Final Analysis v3.0</h3>
        <div id="intel_content" style="padding:15px; text-align:center;">
            <p><strong>System:</strong> Global Percentile & Roster Karma</p>
            <ul style="text-align:left; margin-left:120px; font-size:11px;">
                <li>✅ <strong>Date Fix:</strong> 'Yesterday' converted to real dates.</li>
                <li>✅ <strong>Full View:</strong> Records + Dates + <strong>Percentages %</strong> visible.</li>
                <li>✅ <strong>Coverage:</strong> Shows active member count per tribe.</li>
            </ul>
            <button class="btn" style="padding:8px 25px; font-weight:bold; font-size:14px;" onclick="startAnalysis()">📡 Start Analysis</button>
        </div>
        <div id="intel_status" style="display:none; padding:10px;">
            <p id="intel_status_text" style="font-weight:bold; text-align:center;">Initializing...</p>
            <div style="background:#ccc; height:24px; border:1px solid #000; width:100%; border-radius:3px;">
                <div id="intel_progress" style="background:#007bff; width:0%; height:100%; color:#fff; line-height:24px; font-size:12px; text-align:center;">0%</div>
            </div>
            <div id="intel_console" style="height:120px; overflow-y:auto; background:#fff; border:1px solid #999; margin-top:5px; padding:5px; font-size:10px; font-family:monospace;"></div>
        </div>
    </div>`;
    $('body').append(html);

    // --- FUNCTIONS ---

    window.startAnalysis = function() {
        if (window.location.href.indexOf('mode=con_ally') === -1) {
            if(confirm("Redirect to 'Ranking -> Continent Tribes'?")) {
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

    // --- DATE FIXER ---
    function fixDateStr(dateStr) {
        if (!dateStr || dateStr.trim() === "-") return "-";
        var d = new Date();
        var ds = dateStr.toLowerCase().trim();
        
        // Remove "on " prefix if exists
        ds = ds.replace("on ", "");

        if (ds.includes("today")) {
            return pad(d.getDate()) + "." + pad(d.getMonth()+1) + "." + d.getFullYear();
        }
        if (ds.includes("yesterday")) {
            d.setDate(d.getDate() - 1);
            return pad(d.getDate()) + "." + pad(d.getMonth()+1) + "." + d.getFullYear();
        }
        
        // If it's already a date like "02.01.2026", just return it
        return ds;
    }

    function pad(n) { return n < 10 ? '0'+n : n; }

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

        if(targetTribes.length === 0) { alert("Tribe table not found."); return; }
        processNextTribe();
    }

    function processNextTribe() {
        if (currentTribeIndex >= targetTribes.length) {
            startPlayerScanning();
            return;
        }
        var tribe = targetTribes[currentTribeIndex];
        log("Scanning Tribe: " + tribe.name);
        
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
                        lootRes: 0, lootResDate: "-",
                        lootVil: 0, lootVilDate: "-",
                        scavenge: 0, scavengeDate: "-"
                    });
                }
            });
            currentTribeIndex++;
            processNextTribe();
        });
    }

    function startPlayerScanning() {
        currentMemberIndex = 0;
        log("Global Pool: Scanning " + allPlayersGlobal.length + " players...");
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
            var lResData = parseScore(r1[0], player.name);
            var lVilData = parseScore(r2[0], player.name);
            var scavData = parseScore(r3[0], player.name);

            player.lootRes = lResData.score;
            player.lootResDate = fixDateStr(lResData.date); // FIX APPLIED
            
            player.lootVil = lVilData.score;
            player.lootVilDate = fixDateStr(lVilData.date);
            
            player.scavenge = scavData.score;
            player.scavengeDate = fixDateStr(scavData.date); // FIX APPLIED

            currentMemberIndex++;
            setTimeout(processPlayerMetrics, delayBetweenRequests);
        }).fail(function() {
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
                result.score = parseInt(row.find("td:eq(3)").text().trim().replace(/\./g, '')) || 0;
                result.date = row.find("td:eq(4)").text().trim();
                return false;
            }
        });
        return result;
    }

    // --- MATHEMATICAL ENGINE ---
    function performScientificAnalysis() {
        $('#intel_status_text').text("Calculating Statistics...");
        
        var pointsArr = allPlayersGlobal.map(p => p.points).sort((a,b) => a-b);
        var scavArr = allPlayersGlobal.map(p => p.scavenge).sort((a,b) => a-b);
        var lootResArr = allPlayersGlobal.map(p => p.lootRes).sort((a,b) => a-b);
        var lootVilArr = allPlayersGlobal.map(p => p.lootVil).sort((a,b) => a-b);

        allPlayersGlobal.forEach(p => {
            var p_R = getPercentile(p.points, pointsArr);
            var p_S = getPercentile(p.scavenge, scavArr);
            var p_LA = getPercentile(p.lootRes, lootResArr);
            var p_LC = getPercentile(p.lootVil, lootVilArr);

            // Loot Composite = sqrt(Amount% * Count%)
            var p_L = Math.sqrt(p_LA * p_LC);
            var w = 0.5 + (0.5 * p_R);
            
            // Karma = sqrt(Scav% * Loot%) * 100
            var karmaRaw = Math.sqrt(p_S * p_L) * 100;

            p.metrics = { p_S: p_S, p_L: p_L, w: w, p_R: p_R, karma: karmaRaw };
        });

        var tribeStats = [];
        targetTribes.forEach(t => {
            var members = allPlayersGlobal.filter(p => p.tribeId === t.id);
            if (members.length === 0) return;

            // Coverage
            var activeScav = members.filter(m => m.scavenge > 0).length;
            var activeLoot = members.filter(m => m.lootRes > 0).length;
            var coverageStr = `S:${activeScav}/${members.length} L:${activeLoot}/${members.length}`;

            // Roster Karma
            var sumW = 0, sumKarma = 0, sumS = 0, sumL = 0;
            members.forEach(m => {
                sumW += m.metrics.w;
                sumKarma += (m.metrics.w * m.metrics.karma);
                sumS += (m.metrics.w * m.metrics.p_S * 100);
                sumL += (m.metrics.w * m.metrics.p_L * 100);
            });
            
            var rosterKarma = sumW > 0 ? (sumKarma / sumW) : 0;
            var catS = sumW > 0 ? (sumS / sumW) : 0;
            var catL = sumW > 0 ? (sumL / sumW) : 0;
            var ci = runBootstrap(members, bootstrapIterations);

            tribeStats.push({
                name: t.name,
                members: members,
                n: members.length,
                cov: coverageStr,
                scores: { S: catS, L: catL, K: rosterKarma },
                ci: ci
            });
        });

        tribeStats.sort((a,b) => b.scores.K - a.scores.K);
        generateFinalReport(tribeStats);
    }

    function getPercentile(val, arr) {
        var n = arr.length;
        var less = 0, eq = 0;
        for(var i=0; i<n; i++) {
            if(arr[i] < val) less++;
            else if(arr[i] === val) eq++;
        }
        return (less + (0.5 * eq)) / n;
    }

    function runBootstrap(members, iterations) {
        var karmaSamples = [];
        var n = members.length;
        for(var i=0; i<iterations; i++) {
            var sample = [];
            for(var j=0; j<n; j++) sample.push(members[Math.floor(Math.random() * n)]);
            
            var sW = 0, sK = 0;
            sample.forEach(m => {
                sW += m.metrics.w;
                sK += (m.metrics.w * m.metrics.karma);
            });
            var k = sW > 0 ? (sK / sW) : 0;
            karmaSamples.push(k);
        }
        karmaSamples.sort((a,b) => a-b);
        return { 
            lower: karmaSamples[Math.floor(iterations * 0.025)].toFixed(1), 
            upper: karmaSamples[Math.floor(iterations * 0.975)].toFixed(1) 
        };
    }

    function numFmt(num) {
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    }

    // --- REPORT ---
    function generateFinalReport(stats) {
        var d = new Date();
        var dateStr = pad(d.getDate()) + "." + pad(d.getMonth()+1) + "." + d.getFullYear();
        
        var output = "[b][size=14]📊 Controleng's Top 5 Continent Analysis (" + dateStr + ")[/size][/b]\n";
        output += "[i]Methodology: Roster Karma (Weighted), Global Percentile, Bootstrapped CI (95%)[/i]\n\n";

        output += "[b]GUIDE: What do these numbers mean?[/b]\n";
        output += "(*) [b]Karma Score:[/b] 100 is perfect. Combines Loot & Scavenge.\n";
        output += "(*) [b]Percentages (%):[/b] Global rank. '95%' means better than 95% of players in the continent.\n";
        output += "(*) [b]CI:[/b] Confidence Interval. Scientific proof of superiority.\n\n";

        output += "[b]🏆 TRIBE PERFORMANCE LEAGUE[/b]\n";
        // Added Members (Cov) Column here
        output += "[table]\n[**]Rank[||]Tribe[||]Members (Cov)[||]Scav Score[||]Loot Score[||]ROSTER KARMA (CI)[/**]\n";
        stats.forEach((s, i) => {
            output += `[*] ${i+1} [|] ${s.name} [|] ${s.n} (${s.cov}) [|] ${s.scores.S.toFixed(1)} [|] ${s.scores.L.toFixed(1)} [|] [b]${s.scores.K.toFixed(1)}[/b] (CI: ${s.ci.lower}-${s.ci.upper})\n`;
        });
        output += "[/table]\n\n";
        output += "--------------------------------------------------\n\n";

        stats.forEach(s => {
            output += `[b][size=12]🛡️ ${s.name}[/size][/b]\n`;
            s.members.sort((a,b) => b.metrics.karma - a.metrics.karma);

            output += `[spoiler=📂 Player Details]\n`;
            // Updated Headers to match Data
            output += `[table]\n[**]Player[||]Points (Rank%)[||]Scavenge: Record (Date) [Global%][||]Loot: Record (Date) [Global%][||]Karma %[/**]\n`;
            
            s.members.forEach(m => {
                if (m.points > 0 && (m.metrics.p_S > 0.01 || m.metrics.p_L > 0.01)) {
                    var rankP = (m.metrics.p_R * 100).toFixed(0);
                    var karmaP = m.metrics.karma.toFixed(1);
                    var scavP = (m.metrics.p_S * 100).toFixed(0);
                    var lootP = (m.metrics.p_L * 100).toFixed(0);
                    
                    var scavDisplay = "-";
                    if (m.scavenge > 0) {
                        // THIS IS THE FIX: Added Percentage next to Date
                        scavDisplay = `${numFmt(m.scavenge)} (${m.scavengeDate}) [b][color=#0e00aa][${scavP}%][/color][/b]`;
                    }
                    
                    var lootDisplay = "-";
                    if (m.lootRes > 0) {
                        // THIS IS THE FIX: Added Percentage next to Date
                        lootDisplay = `${numFmt(m.lootRes)} (${m.lootResDate}) [b][color=#aa0000][${lootP}%][/color][/b]`;
                    }

                    output += `[*] [player]${m.name}[/player] [|] ${numFmt(m.points)} (${rankP}%) [|] ${scavDisplay} [|] ${lootDisplay} [|] [b]${karmaP}[/b]\n`;
                }
            });
            output += `[/table]\n[/spoiler]\n\n`;
        });

        Dialog.show("Analysis Report", '<textarea cols="100" rows="40" onclick="this.select()">' + output + '</textarea>');
        $('#controleng_gui').remove();
    }
    
    function pad(n) { return n < 10 ? '0'+n : n; }
})();
