javascript:
/*
 * Yaver Single Village Scavenge V1.1
 * Mass Scavenge mantığıyla çalışır. Kilitli kategorileri otomatik algılar.
 * Developed by controleng
 */

(function() {
    // Sadece Scavenge ekranında çalışsın
    if (window.location.href.indexOf('screen=place&mode=scavenge') < 0) {
        UI.ErrorMessage('This script must be run on the Scavenging screen!');
        return;
    }

    // Arayüz temizliği
    $("#yaverScavengePanel").remove();

    // Oyun verilerini çek
    let scavengeOptions = window.ScavengeScreen.village.options;
    let unitInfo = window.ScavengeScreen.unit_info;
    let homeUnits = window.ScavengeScreen.village.unit_counts_home;
    
    // Temel faktörleri al (Genelde 1. seçenekten alınır)
    let base = scavengeOptions[1].base || scavengeOptions[1];
    let duration_factor = base.duration_factor;
    let duration_exponent = base.duration_exponent;
    let duration_initial_seconds = base.duration_initial_seconds;

    // Kategori İsimleri (İngilizce)
    const catNames = [
        "Lackadaisical Looters (1)",
        "Humble Haulers (2)",
        "Clever Collectors (3)",
        "Great Gatherers (4)"
    ];

    // UI Kategoriler Kısmı (Kilitli olanları disabled yap)
    let catHtml = "";
    for(let i=1; i<=4; i++) {
        let isLocked = scavengeOptions[i].is_locked;
        let disabledAttr = isLocked ? "disabled" : "checked";
        let labelStyle = isLocked ? "color:gray; text-decoration:line-through;" : "";
        let statusText = isLocked ? "(Locked)" : "";
        
        catHtml += `<label style="${labelStyle}"><input type="checkbox" id="cat${i}" ${disabledAttr}> ${catNames[i-1]} ${statusText}</label><br>`;
    }

    // UI oluştur
    let html = `
    <div id="yaverScavengePanel" class="vis" style="margin:10px 0; padding:10px; border:2px solid #7d510f; background:#f4e4bc;">
        <h3 style="margin-top:0;">⚔️ Yaver Scavenge Manager</h3>
        <table width="100%">
            <tr>
                <td valign="top" width="40%">
                    <strong>1. Select Units:</strong><br>
                    <div id="yaverUnits"></div>
                </td>
                <td valign="top" width="30%">
                    <strong>2. Categories:</strong><br>
                    ${catHtml}
                </td>
                <td valign="top" width="30%">
                    <strong>3. Settings:</strong><br>
                    Time (Hours): <input type="number" id="scavTime" value="4" style="width:40px"><br><br>
                    <strong>Mode:</strong><br>
                    <label><input type="radio" name="prio" id="prioBal" checked> Balanced</label><br>
                    <label><input type="radio" name="prio" id="prioHigh"> High Yield Priority</label><br><br>
                    <button class="btn btn-confirm-yes" onclick="YaverScavenge.calculateAndFill()">🚀 Calculate & Send</button>
                </td>
            </tr>
        </table>
        <div style="text-align:right; margin-top:10px; font-size:10px; color:#555; font-style:italic;">Developed by controleng</div>
        <div id="yaverResult" style="margin-top:5px; font-weight:bold; color:green;"></div>
    </div>`;

    $("#scavenge_screen").before(html);

    // Asker seçimleri
    let unitsHtml = "";
    let validUnits = ["spear", "sword", "axe", "archer", "light", "marcher", "heavy"];
    validUnits.forEach(u => {
        if(unitInfo[u]) {
            unitsHtml += `<label style="margin-right:10px;"><input type="checkbox" id="use_${u}" checked> <img src="https://dsen.innogamescdn.com/asset/c645ceed/graphic/unit/unit_${u}.png"> ${homeUnits[u]}</label><br>`;
        }
    });
    $("#yaverUnits").html(unitsHtml);

    // --- MANTIK ---
    window.YaverScavenge = {
        calculateAndFill: function() {
            let troopsAllowed = {};
            let totalCarry = 0;
            
            validUnits.forEach(u => {
                if ($("#use_" + u).is(":checked") && parseInt(homeUnits[u]) > 0) {
                    troopsAllowed[u] = parseInt(homeUnits[u]);
                    totalCarry += troopsAllowed[u] * unitInfo[u].carry;
                } else {
                    troopsAllowed[u] = 0;
                }
            });

            if (totalCarry === 0) {
                UI.ErrorMessage("No troops selected or available!");
                return;
            }

            let enabledCats = [];
            for(let i=1; i<=4; i++) {
                // Sadece kutu işaretliyse VE oyun tarafında kilitli değilse
                let isChecked = $("#cat"+i).is(":checked");
                let isLocked = scavengeOptions[i].is_locked;
                enabledCats.push(isChecked && !isLocked);
            }

            let hours = parseFloat($("#scavTime").val());
            let timeSec = hours * 3600;
            
            // Kapasite Hesaplama Formülü
            let valTerm = (timeSec - duration_initial_seconds) / duration_factor;
            if(valTerm < 0) valTerm = 0;
            
            let baseCapacity = Math.pow(valTerm, 1/duration_exponent); 
            
            let catFactors = [0.1, 0.25, 0.50, 0.75];
            let reqCapacity = [];
            let totalReqCapacity = 0;

            for(let i=0; i<4; i++) {
                if(enabledCats[i]) {
                    let cap = baseCapacity * 100 * catFactors[i];
                    reqCapacity[i] = cap;
                    totalReqCapacity += cap;
                } else {
                    reqCapacity[i] = 0;
                }
            }

            let finalDistribution = [{}, {}, {}, {}];
            let isPriority = $("#prioHigh").is(":checked");

            if (totalCarry > totalReqCapacity) {
                // Kapasite yetiyor, herkes istediği kadar alır
                for(let i=3; i>=0; i--) {
                    if(reqCapacity[i] > 0) {
                        this.distributeExactCarry(i, reqCapacity[i], troopsAllowed, finalDistribution);
                    }
                }
            } else {
                // Asker yetmiyor
                if (isPriority) {
                    for(let i=3; i>=0; i--) {
                        if(reqCapacity[i] > 0) {
                            let currentCarry = this.calculateCurrentCarry(troopsAllowed);
                            let take = Math.min(reqCapacity[i], currentCarry);
                            this.distributeExactCarry(i, take, troopsAllowed, finalDistribution);
                        }
                    }
                } else {
                    // Balanced
                    let ratio = totalCarry / totalReqCapacity;
                    for(let i=0; i<4; i++) {
                        if(reqCapacity[i] > 0) {
                            let give = reqCapacity[i] * ratio;
                            this.distributeExactCarry(i, give, troopsAllowed, finalDistribution);
                        }
                    }
                }
            }

            this.sendSquads(finalDistribution);
        },

        distributeExactCarry: function(catIndex, carryAmount, available, dist) {
            let totalAvailCarry = this.calculateCurrentCarry(available);
            if(totalAvailCarry <= 0) return;

            let percent = carryAmount / totalAvailCarry;
            if(percent > 1) percent = 1;

            for (let u in available) {
                if (available[u] > 0) {
                    let count = Math.floor(available[u] * percent);
                    if(count > 0) {
                        if(!dist[catIndex][u]) dist[catIndex][u] = 0;
                        dist[catIndex][u] += count;
                        available[u] -= count;
                    }
                }
            }
        },

        calculateCurrentCarry: function(units) {
            let c = 0;
            for(let u in units) {
                c += units[u] * unitInfo[u].carry;
            }
            return c;
        },

        sendSquads: function(distribution) {
            let villageId = window.game_data.village.id;
            let squadRequests = [];

            for(let i=0; i<4; i++) {
                let units = distribution[i];
                if(units && !$.isEmptyObject(units)) {
                    let totalUnits = 0;
                    for(let k in units) totalUnits += units[k];
                    
                    if(totalUnits > 0) {
                        squadRequests.push({
                            "village_id": villageId,
                            "candidate_squad": { "unit_counts": units, "carry_max": 9999999999 },
                            "option_id": i + 1,
                            "use_premium": false
                        });
                    }
                }
            }

            if(squadRequests.length === 0) {
                UI.ErrorMessage("Not enough troops for minimum scavenge time.");
                return;
            }

            // Onay mekanizması
            if(!confirm("Sending " + squadRequests.length + " scavenge runs. Confirm?")) return;

            TribalWars.post('scavenge_api', { ajaxaction: 'send_squads' }, { "squad_requests": squadRequests }, function(res) {
                UI.SuccessMessage("Scavenging started successfully! 🦅");
                setTimeout(() => window.location.reload(), 1000);
            });
        }
    };
})();
