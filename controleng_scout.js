/* CONTROLENG ADVANCED SCOUT v6.0
   Author: controleng
   Features: Map Highlights Reading + Smart Filtering
   Hosted on GitHub
*/

(function() {
    /* --- DEĞİŞKENLER --- */
    var excludedVillages = [];
    var selectedBonusTypes = []; 
    
    /* GUI TEMİZLİĞİ */
    if ($('#gemini_scout_gui').length > 0) $('#gemini_scout_gui').remove();

    /* --- CSS --- */
    var css = `
        <style>
            .g-btn { background: #7d510f; color: white; border: 1px solid #5c3a0b; padding: 6px 12px; cursor: pointer; margin: 2px; font-weight:bold; }
            .g-btn:hover { background: #966316; }
            .g-bonus-icon { width: 32px; height: 32px; border: 2px solid #999; border-radius: 4px; cursor: pointer; opacity: 0.5; margin: 3px; background: rgba(0,0,0,0.1); }
            .g-bonus-icon.selected { border-color: #00c400; opacity: 1; box-shadow: 0 0 5px #00c400; background: rgba(0,255,0,0.2); transform: scale(1.1); }
            .g-input { width: 70px; padding: 4px; border: 1px solid #7d510f; }
            .g-row { margin-bottom: 12px; border-bottom: 1px solid #cda26c; padding-bottom: 10px; }
            .g-header { background:#7d510f; color:#fff; padding:10px; font-weight:bold; cursor:move; border-radius: 5px 5px 0 0; font-size: 14px; }
            .g-label { display:inline-block; font-weight:bold; width:100px; }
        </style>
    `;

    /* --- HTML ARAYÜZ --- */
    var html = `
    ${css}
    <div id="gemini_scout_gui" class="ui-widget-content" style="position:fixed; top:100px; left:50%; margin-left:-250px; width:500px; background: #f4e4bc; border: 3px solid #7d510f; border-radius: 6px; z-index:99999; padding:0; box-shadow: 5px 5px 20px rgba(0,0,0,0.7);">
        <div class="g-header">
            🛰️ CONTROLENG SCOUT v6.0
            <span style="float:right; cursor:pointer;" onclick="$('#gemini_scout_gui').remove()">✖</span>
        </div>
        
        <div style="padding:15px; overflow-y:auto; max-height: 85vh; color: #422;">
            
            <div class="g-row">
                <span class="g-label">1. Merkez:</span>
                <input type="text" id="g_center" class="g-input" value="${game_data.village.x}|${game_data.village.y}">
                &nbsp;&nbsp; <strong>Yarıçap:</strong> <input type="number" id="g_radius" class="g-input" value="15">
                <div style="margin-top:5px;">
                    <span class="g-label">Puan Aralığı:</span>
                    <input type="number" id="g_min_pt" class="g-input" value="0" placeholder="Min"> - 
                    <input type="number" id="g_max_pt" class="g-input" value="3000" placeholder="Max">
                </div>
            </div>

            <div class="g-row">
                <strong>2. Hariç Tutulacak Grup (Harita Rengi):</strong><br>
                <select id="g_group_select" style="width:100%; margin-top:5px; padding:6px; font-weight:bold; color:#7d510f;">
                    <option value="0">Yükleniyor...</option>
                </select>
                <div style="font-size:10px; margin-top:3px; color:#a00;">
                    ⚠️ "yağma" gibi işaretlediğiniz grupları buradan seçin. O köyleri listeden siler.
                </div>
            </div>

            <div class="g-row">
                <strong>3. Hedef Tipi:</strong><br>
                <div style="margin: 5px 0; padding:5px; background:rgba(255,255,255,0.5); border-radius:4px;">
                    <input type="checkbox" id="g_include_normal" checked style="transform: scale(1.2);"> 
                    <label for="g_include_normal" style="font-weight:bold; font-size:12px; margin-left:5px;">Düz Barbarları Göster</label>
                </div>
                
                <div style="text-align:center; font-weight:bold; margin-bottom:3px;">Bonus Filtresi (Seçim Yapabilirsiniz)</div>
                <div style="display:flex; flex-wrap:wrap; justify-content:center; gap: 4px;">
                    <img src="graphic/bonus/wood.png" class="g-bonus-icon" onclick="toggleBonus(1, this)" title="Odun">
                    <img src="graphic/bonus/stone.png" class="g-bonus-icon" onclick="toggleBonus(2, this)" title="Kil">
                    <img src="graphic/bonus/iron.png" class="g-bonus-icon" onclick="toggleBonus(3, this)" title="Demir">
                    <img src="graphic/bonus/farm.png" class="g-bonus-icon" onclick="toggleBonus(4, this)" title="Çiftlik">
                    <img src="graphic/bonus/barracks.png" class="g-bonus-icon" onclick="toggleBonus(5, this)" title="Kışla">
                    <img src="graphic/bonus/stable.png" class="g-bonus-icon" onclick="toggleBonus(6, this)" title="Ahır">
                    <img src="graphic/bonus/garage.png" class="g-bonus-icon" onclick="toggleBonus(7, this)" title="Atölye">
                    <img src="graphic/bonus/all.png" class="g-bonus-icon" onclick="toggleBonus(8, this)" title="Tüm Kaynak">
                    <img src="graphic/bonus/storage.png" class="g-bonus-icon" onclick="toggleBonus(9, this)" title="Depo">
                </div>
            </div>

            <button class="g-btn" style="width:100%; font-size:15px;" onclick="startScan()">🚀 HEDEFLERİ TARA</button>
            
            <div id="g_results" style="display:none; margin-top:15px;">
                <div style="background:#fff; border:1px solid #ccc; padding:5px; margin-bottom:5px;">
                    <strong>Bulunan: <span id="g_count" style="color:red;">0</span> Köy</strong>
                </div>
                <textarea id="g_output" style="width:98%; height:50px; font-size:11px; margin-bottom:5px; border:1px solid #999;"></textarea>
                <div style="text-align:right;">
                    <button class="g-btn" onclick="$('#g_output').select();document.execCommand('copy');UI.SuccessMessage('Kopyalandı!');">Kopyala</button>
                </div>
                <div id="g_table_container" style="max-height:250px; overflow-y:auto; margin-top:10px; border:1px solid #cda26c;"></div>
            </div>

        </div>
    </div>`;

    $('body').append(html);
    $('#gemini_scout_gui').draggable({ handle: ".g-header" });

    /* --- GRUPLARI YÜKLE --- */
    fetchMapGroups();

    function fetchMapGroups() {
        var select = $('#g_group_select');
        select.empty();
        select.append('<option value="0">--- Filtreleme Yapma (Hepsini Göster) ---</option>');
        
        // Sadece HARİTA gruplarını çekiyoruz (Renklendirmeler)
        $.get(TribalWars.buildURL('GET', 'map', {ajaxaction: 'load_for_groups'}), function(data) {
            var htmlData = $(data);
            var count = 0;
            
            // HTML içindeki .colorgroup-other-entry sınıflarını tara
            htmlData.find('.colorgroup-other-entry').each(function() {
                var gid = $(this).attr('data-id');
                var gname = $(this).find('.group-label').text().trim();
                
                if(gid && gname) {
                    // "yağma" gibi grupları buraya ekler
                    select.append(`<option value="${gid}">🎨 ${gname}</option>`);
                    count++;
                }
            });

            if (count === 0) {
                select.append('<option disabled>Harita grubu bulunamadı!</option>');
            }
        });
    }

    /* --- TIKLAMA MANTIĞI --- */
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

    /* --- TARAMA BAŞLAT --- */
    window.startScan = function() {
        var groupId = $('#g_group_select').val();
        excludedVillages = [];

        if (groupId != "0") {
            UI.SuccessMessage('Grup verisi analiz ediliyor...');
            // Harita grubundaki köyleri çek
            $.get(TribalWars.buildURL('GET', 'map', {ajaxaction: 'load_for_multiple_villages', group_id: groupId}), function(json) {
                if(json.villages) {
                    json.villages.forEach(v => excludedVillages.push(parseInt(v.id)));
                }
                console.log("Hariç Tutulan Köy Sayısı: " + excludedVillages.length);
                fetchWorldData();
            });
        } else {
            fetchWorldData();
        }
    };

    function fetchWorldData() {
        UI.SuccessMessage('Uydu verisi indiriliyor...');
        // Önbellek kontrolü (1 saat)
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
        
        var showNormal = $('#g_include_normal').is(':checked'); // Kutu işaretli mi?

        var lines = csv.split(/\r?\n/);
        var found = [];

        for (var i = 0; i < lines.length; i++) {
            var row = lines[i].split(',');
            if (row.length < 5) continue;

            var vId = parseInt(row[0]);
            var vX = parseInt(row[2]);
            var vY = parseInt(row[3]);
            var vPid = parseInt(row[4]); // 0 = Barbar
            var vPts = parseInt(row[5]);
            var vBonus = parseInt(row[6]); // 0 = Normal, >0 = Bonus

            // Sadece Barbarlar
            if (vPid === 0) {
                
                // 1. Temel Filtreler (Mesafe, Puan, Grup)
                var dist = Math.sqrt(Math.pow(cX - vX, 2) + Math.pow(cY - vY, 2));
                if (dist > radius) continue;
                if (vPts < minP || vPts > maxP) continue;
                if (excludedVillages.includes(vId)) continue; // Gruptaysa atla

                // 2. TİP MANTIĞI (Düzeltildi)
                var keep = false;

                if (vBonus === 0) {
                    // Bu bir Normal Barbar
                    // Eğer "Düz Barbarları Göster" kutusu işaretliyse göster
                    if (showNormal) keep = true;
                } 
                else {
                    // Bu bir Bonus Köy
                    // Eğer hiç ikon seçilmemişse -> Tüm bonusları göster
                    if (selectedBonusTypes.length === 0) {
                        keep = true; 
                    } else {
                        // İkon seçilmişse -> Sadece seçilen tipe uyuyorsa göster
                        if (selectedBonusTypes.includes(vBonus)) keep = true;
                    }
                }

                if (keep) {
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

        // Sıralama (Yakından uzağa)
        found.sort((a, b) => a.dist - b.dist);

        // Çıktı Hazırla
        var outList = found.map(f => f.coord).join(' ');
        var outTable = '<table class="vis" width="100%" style="font-size:11px;"><tr><th>Mesafe</th><th>Koor</th><th>Puan</th><th>Tip</th></tr>';
        var bonusNames = ["-", "Odun", "Kil", "Demir", "Çiftlik", "Kışla", "Ahır", "Atölye", "Tüm", "Depo"];
        var bonusIcons = ["", "wood", "stone", "iron", "farm", "barracks", "stable", "garage", "all", "storage"];

        found.forEach(f => {
            var type = "Barbar";
            if (f.bonus > 0) {
                type = `<img src="graphic/bonus/${bonusIcons[f.bonus]}.png" width="16"> ${bonusNames[f.bonus]}`;
            }
            outTable += `<tr><td>${f.dist.toFixed(1)}</td><td><a href="/game.php?screen=info_village&id=${f.id}" target="_blank">${f.coord}</a></td><td>${f.points}</td><td>${type}</td></tr>`;
        });
        outTable += '</table>';

        $('#g_output').val(outList);
        $('#g_count').text(found.length);
        $('#g_table_container').html(outTable);
        $('#g_results').show();
        UI.SuccessMessage('Tarama Tamamlandı: ' + found.length + ' köy.');
    }
})();
