/* Advanced Scout Barbs v5.0 
   Author: controleng
   Hosted on GitHub
*/

(function() {
    /* --- AYARLAR VE DEĞİŞKENLER --- */
    var villageData = [];
    var excludedVillages = []; // Gruptan gelen köyler (ID listesi)
    var selectedBonusTypes = []; // Seçilen bonus tipleri (1-9)
    
    /* GUI TEMİZLİĞİ */
    if ($('#gemini_scout_gui').length > 0) $('#gemini_scout_gui').remove();

    /* --- ARAYÜZ (GUI) OLUŞTURMA --- */
    var css = `
        <style>
            .g-btn { background: #7d510f; color: white; border: 1px solid #5c3a0b; padding: 5px 10px; cursor: pointer; margin: 2px; }
            .g-btn:hover { background: #966316; }
            .g-bonus-icon { width: 30px; height: 30px; border: 2px solid transparent; cursor: pointer; opacity: 0.6; margin: 2px; }
            .g-bonus-icon.selected { border-color: #00ff00; opacity: 1; box-shadow: 0 0 5px #00ff00; background: rgba(0,255,0,0.2); }
            .g-input { width: 60px; padding: 3px; }
            .g-row { margin-bottom: 8px; border-bottom: 1px solid #cda26c; padding-bottom: 5px; }
        </style>
    `;

    var html = `
    ${css}
    <div id="gemini_scout_gui" class="ui-widget-content" style="position:fixed; top:100px; left:50%; margin-left:-250px; width:500px; background: #e3d5b3; border: 3px solid #7d510f; z-index:99999; padding:0; box-shadow: 5px 5px 15px rgba(0,0,0,0.6);">
        <div style="background:#7d510f; color:#fff; padding:8px; font-weight:bold; cursor:move;">
            🛰️ GEMINI ADVANCED SCOUT
            <span style="float:right; cursor:pointer;" onclick="$('#gemini_scout_gui').remove()">✖</span>
        </div>
        
        <div style="padding:15px; overflow-y:auto; max-height: 80vh;">
            
            <div class="g-row">
                <strong>1. Bölge Seçimi:</strong><br>
                Merkez: <input type="text" id="g_center" class="g-input" value="${game_data.village.x}|${game_data.village.y}">
                Yarıçap: <input type="number" id="g_radius" class="g-input" value="15"> br
                <br>
                <small>Min Puan: <input type="number" id="g_min_pt" class="g-input" value="0"> - Max Puan: <input type="number" id="g_max_pt" class="g-input" value="3000"></small>
            </div>

            <div class="g-row">
                <strong>2. Hariç Tutulacak Grup (Yağma Klasörü):</strong><br>
                <select id="g_group_select" style="width:100%; margin-top:5px;">
                    <option value="0">Grup Yükleniyor...</option>
                </select>
                <small style="color:red;">* Bu gruptaki köyler listede ÇIKMAZ.</small>
            </div>

            <div class="g-row">
                <strong>3. Hedef Tipi:</strong><br>
                <label><input type="checkbox" id="g_include_barbs" checked> Normal Barbarları Dahil Et</label><br>
                <div style="display:flex; flex-wrap:wrap; justify-content:center; margin-top:5px;">
                    <img src="graphic/bonus/wood.png" class="g-bonus-icon" onclick="toggleBonus(1, this)" title="Odun">
                    <img src="graphic/bonus/stone.png" class="g-bonus-icon" onclick="toggleBonus(2, this)" title="Kil">
                    <img src="graphic/bonus/iron.png" class="g-bonus-icon" onclick="toggleBonus(3, this)" title="Demir">
                    <img src="graphic/bonus/farm.png" class="g-bonus-icon" onclick="toggleBonus(4, this)" title="Çiftlik">
                    <img src="graphic/bonus/barracks.png" class="g-bonus-icon" onclick="toggleBonus(5, this)" title="Kışla">
                    <img src="graphic/bonus/stable.png" class="g-bonus-icon" onclick="toggleBonus(6, this)" title="Ahır">
                    <img src="graphic/bonus/garage.png" class="g-bonus-icon" onclick="toggleBonus(7, this)" title="Atölye">
                    <img src="graphic/bonus/all.png" class="g-bonus-icon" onclick="toggleBonus(8, this)" title="Tüm Kaynak">
                    <img src="graphic/bonus/storage.png" class="g-bonus-icon" onclick="toggleBonus(9, this)" title="Depo/Tüccar">
                </div>
            </div>

            <button class="g-btn" style="width:100%; font-size:14px;" onclick="startScan()">🚀 TARAMAYI BAŞLAT</button>
            
            <div id="g_results" style="display:none; margin-top:10px;">
                <hr>
                <strong>Sonuçlar (<span id="g_count">0</span> Köy):</strong>
                <textarea id="g_output" style="width:98%; height:60px; font-size:10px; margin-bottom:5px;"></textarea>
                <div style="text-align:right;">
                    <button class="g-btn" onclick="$('#g_output').select();document.execCommand('copy');UI.SuccessMessage('Kopyalandı!');">📋 Kopyala</button>
                </div>
                <div id="g_table_container" style="max-height:200px; overflow-y:auto; margin-top:10px;"></div>
            </div>

        </div>
    </div>`;

    $('body').append(html);
    $('#gemini_scout_gui').draggable({ handle: "div:first" });

    /* --- GRUPLARI ÇEKME --- */
    $.get(TribalWars.buildURL('GET', 'groups', {mode: 'overview', ajax: 'load_group_menu'}), function(data) {
        var groups = data.result;
        var select = $('#g_group_select');
        select.empty();
        select.append('<option value="0">--- Filtre Yok (Hepsini Göster) ---</option>');
        
        if(groups) {
            groups.forEach(function(g) {
                // "all" grubunu atla, diğerlerini ekle
                if(g.type !== 'all') {
                    select.append(`<option value="${g.group_id}">${g.name} [${g.village_count}]</option>`);
                }
            });
        }
    });

    /* --- YARDIMCI FONKSİYONLAR --- */
    window.toggleBonus = function(id, el) {
        var index = selectedBonusTypes.indexOf(id);
        if (index === -1) {
            selectedBonusTypes.push(id);
            $(el).addClass('selected');
        } else {
            selectedBonusTypes.splice(index, 1);
            $(el).removeClass('selected');
        }
    };

    window.startScan = function() {
        var groupId = $('#g_group_select').val();
        
        // Önce gruptaki köyleri çek (Eğer grup seçildiyse)
        if (groupId != "0") {
            UI.SuccessMessage('Hariç tutulacak grup verisi çekiliyor...');
            $.get(TribalWars.buildURL('GET', 'groups', {group_id: groupId, mode: 'villages'}), function(html) {
                // Bu sayfadan köy ID'lerini parse etmemiz gerek
                // HTML parse işlemi biraz ağırdır, regex ile çekeceğiz.
                // data-village-id özelliği olanları alacağız.
                var villageIds = [];
                var regex = /data-village-id="(\d+)"/g;
                var match;
                while ((match = regex.exec(html)) !== null) {
                    villageIds.push(parseInt(match[1]));
                }
                excludedVillages = villageIds;
                console.log("Hariç tutulacak köy sayısı: " + excludedVillages.length);
                fetchWorldData(); // Şimdi taramaya geç
            });
        } else {
            excludedVillages = [];
            fetchWorldData();
        }
    };

    function fetchWorldData() {
        UI.SuccessMessage('Uydu verisi (village.txt) indiriliyor...');
        
        // Önbellek kontrolü
        if (localStorage.getItem("mapVillageTxt") && (Date.now() - parseInt(localStorage.getItem("mapVillageTime") || 0)) < 3600000) {
            processData(localStorage.getItem("mapVillageTxt"));
        } else {
            $.get("map/village.txt", function(data) {
                localStorage.setItem("mapVillageTxt", data);
                localStorage.setItem("mapVillageTime", Date.now());
                processData(data);
            });
        }
    }

    function processData(csv) {
        var center = $('#g_center').val().split('|');
        var cX = parseInt(center[0]);
        var cY = parseInt(center[1]);
        var radius = parseFloat($('#g_radius').val());
        var minP = parseInt($('#g_min_pt').val());
        var maxP = parseInt($('#g_max_pt').val());
        var includeBarbs = $('#g_include_barbs').is(':checked');

        var lines = csv.split(/\r?\n/);
        var found = [];

        for (var i = 0; i < lines.length; i++) {
            var row = lines[i].split(',');
            if (row.length < 5) continue;

            // Veri: $id, $name, $x, $y, $player, $points, $rank
            var vId = parseInt(row[0]);
            var vX = parseInt(row[2]);
            var vY = parseInt(row[3]);
            var vPid = parseInt(row[4]); // 0 = Barbar
            var vPts = parseInt(row[5]);
            var vBonus = parseInt(row[6]); // 0 = Yok, >0 = Bonus Tip ID

            // Sadece Barbarlar (Sahipsiz)
            if (vPid === 0) {
                
                // 1. Mesafe Filtresi
                var dist = Math.sqrt(Math.pow(cX - vX, 2) + Math.pow(cY - vY, 2));
                if (dist > radius) continue;

                // 2. Puan Filtresi
                if (vPts < minP || vPts > maxP) continue;

                // 3. Grup Filtresi (Hariç Tutma)
                if (excludedVillages.includes(vId)) continue;

                // 4. Bonus/Tip Filtresi
                var isMatch = false;
                if (vBonus > 0) {
                    // Bu bir bonus köy
                    if (selectedBonusTypes.length === 0 || selectedBonusTypes.includes(vBonus)) {
                        isMatch = true; // Bonus seçili değilse de göster, ya da tip tutuyorsa göster
                        if (selectedBonusTypes.length > 0 && !selectedBonusTypes.includes(vBonus)) isMatch = false;
                    }
                } else {
                    // Bu normal barbar
                    if (includeBarbs) isMatch = true;
                }

                if (isMatch) {
                    found.push({
                        id: vId,
                        coord: vX + '|' + vY,
                        dist: dist,
                        points: vPts,
                        bonus: vBonus
                    });
                }
            }
        }

        // Sıralama
        found.sort((a, b) => a.dist - b.dist);

        // Çıktı
        var outList = found.map(f => f.coord).join(' ');
        var outTable = '<table class="vis" width="100%"><tr><th>Mesafe</th><th>Koor</th><th>Puan</th><th>Tip</th></tr>';
        
        var bonusNames = ["-", "Odun", "Kil", "Demir", "Çiftlik", "Kışla", "Ahır", "Atölye", "Tüm", "Depo"];
        var bonusIcons = ["", "wood", "stone", "iron", "farm", "barracks", "stable", "garage", "all", "storage"];

        found.forEach(f => {
            var type = "Barbar";
            if (f.bonus > 0) {
                type = `<img src="graphic/bonus/${bonusIcons[f.bonus]}.png" width="18"> ${bonusNames[f.bonus]}`;
            }
            outTable += `<tr><td>${f.dist.toFixed(1)}</td><td><a href="/game.php?screen=info_village&id=${f.id}">${f.coord}</a></td><td>${f.points}</td><td>${type}</td></tr>`;
        });
        outTable += '</table>';

        $('#g_output').val(outList);
        $('#g_count').text(found.length);
        $('#g_table_container').html(outTable);
        $('#g_results').show();
        UI.SuccessMessage('Tarama Tamamlandı!');
    }

})();
