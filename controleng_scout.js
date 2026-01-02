/* CONTROLENG SCOUT v5.2
   Author: Gemini & controleng
   Features: Map Highlights Reading + Smart Bonus Logic
   Hosted on GitHub
*/

(function() {
    /* --- DEĞİŞKENLER --- */
    var excludedVillages = [];
    var selectedBonusTypes = []; 
    var mapGroups = []; // Harita renklendirme gruplarını tutacak

    /* GUI TEMİZLİĞİ */
    if ($('#gemini_scout_gui').length > 0) $('#gemini_scout_gui').remove();

    /* --- CSS STİLLERİ --- */
    var css = `
        <style>
            .g-btn { background: #7d510f; color: white; border: 1px solid #5c3a0b; padding: 5px 10px; cursor: pointer; margin: 2px; }
            .g-btn:hover { background: #966316; }
            .g-bonus-icon { width: 35px; height: 35px; border: 2px solid #999; border-radius: 5px; cursor: pointer; opacity: 0.5; margin: 2px; background: rgba(0,0,0,0.1); }
            .g-bonus-icon.selected { border-color: #00ff00; opacity: 1; box-shadow: 0 0 8px #00ff00; background: rgba(0,255,0,0.3); transform: scale(1.1); }
            .g-input { width: 60px; padding: 4px; border: 1px solid #7d510f; }
            .g-row { margin-bottom: 10px; border-bottom: 1px solid #cda26c; padding-bottom: 8px; }
            .g-header { background:#7d510f; color:#fff; padding:8px; font-weight:bold; cursor:move; border-radius: 5px 5px 0 0; }
        </style>
    `;

    /* --- ARAYÜZ (GUI) --- */
    var html = `
    ${css}
    <div id="gemini_scout_gui" class="ui-widget-content" style="position:fixed; top:100px; left:50%; margin-left:-250px; width:500px; background: #f4e4bc; border: 3px solid #7d510f; border-radius: 5px; z-index:99999; padding:0; box-shadow: 5px 5px 15px rgba(0,0,0,0.6);">
        <div class="g-header">
            🛰️ CONTROLENG SCOUT v5.2
            <span style="float:right; cursor:pointer;" onclick="$('#gemini_scout_gui').remove()">✖</span>
        </div>
        
        <div style="padding:15px; overflow-y:auto; max-height: 80vh; color: #333;">
            
            <div class="g-row">
                <strong>1. Bölge Ayarları:</strong><br>
                Merkez: <input type="text" id="g_center" class="g-input" value="${game_data.village.x}|${game_data.village.y}">
                Yarıçap: <input type="number" id="g_radius" class="g-input" value="15">
                <span style="float:right;">
                    Min Puan: <input type="number" id="g_min_pt" class="g-input" value="0" style="width:40px">
                    Max: <input type="number" id="g_max_pt" class="g-input" value="3000" style="width:40px">
                </span>
            </div>

            <div class="g-row">
                <strong>2. Hariç Tutulacak Grup (Yağma/Harita):</strong><br>
                <select id="g_group_select" style="width:100%; margin-top:5px; padding:5px;">
                    <option value="0">Gruplar Yükleniyor...</option>
                </select>
                <div style="font-size:10px; margin-top:3px; color:#a00;">
                    * Seçtiğiniz gruptaki köyler listede <u>görünmeyecektir</u>.
                </div>
            </div>

            <div class="g-row">
                <strong>3. Hedef Tipi:</strong><br>
                <div style="margin-bottom: 5px;">
                    <input type="checkbox" id="g_include_normal" checked> 
                    <label for="g_include_normal" style="font-weight:bold; color: #333;">Düz Barbarları da Listele</label>
                </div>
                <div style="display:flex; flex-wrap:wrap; justify-content:center; gap: 5px;">
                    <img src="graphic/bonus/wood.png" class="g-bonus-icon" onclick="toggleBonus(1, this)" title="Odun Bonusu">
                    <img src="graphic/bonus/stone.png" class="g-bonus-icon" onclick="toggleBonus(2, this)" title="Kil Bonusu">
                    <img src="graphic/bonus/iron.png" class="g-bonus-icon" onclick="toggleBonus(3, this)" title="Demir Bonusu">
                    <img src="graphic/bonus/farm.png" class="g-bonus-icon" onclick="toggleBonus(4, this)" title="Çiftlik Bonusu">
                    <img src="graphic/bonus/barracks.png" class="g-bonus-icon" onclick="toggleBonus(5, this)" title="Kışla Bonusu">
                    <img src="graphic/bonus/stable.png" class="g-bonus-icon" onclick="toggleBonus(6, this)" title="Ahır Bonusu">
                    <img src="graphic/bonus/garage.png" class="g-bonus-icon" onclick="toggleBonus(7, this)" title="Atölye Bonusu">
                    <img src="graphic/bonus/all.png" class="g-bonus-icon" onclick="toggleBonus(8, this)" title="Tüm Kaynak Bonusu">
                    <img src="graphic/bonus/storage.png" class="g-bonus-icon" onclick="toggleBonus(9, this)" title="Depo/Tüccar Bonusu">
                </div>
                <div style="text-align:center; font-size:10px; color:#555; margin-top:2px;">
                    (İkon seçili değilse HEPSİNİ gösterir. Seçiliyse SADECE seçilenleri gösterir.)
                </div>
            </div>

            <button class="g-btn" style="width:100%; font-size:14px; font-weight:bold;" onclick="startScan()">🚀 TARAMAYI BAŞLAT</button>
            
            <div id="g_results" style="display:none; margin-top:10px;">
                <hr>
                <strong>Sonuçlar (<span id="g_count">0</span> Köy):</strong>
                <textarea id="g_output" style="width:98%; height:60px; font-size:11px; margin-bottom:5px; border:1px solid #999;"></textarea>
                <div style="text-align:right;">
                    <button class="g-btn" onclick="$('#g_output').select();document.execCommand('copy');UI.SuccessMessage('Kopyalandı!');">📋 Kopyala</button>
                </div>
                <div id="g_table_container" style="max-height:200px; overflow-y:auto; margin-top:10px; border:1px solid #ccc;"></div>
            </div>

        </div>
    </div>`;

    $('body').append(html);
    $('#gemini_scout_gui').draggable({ handle: ".g-header" });

    /* --- GRUPLARI YÜKLE (HEM OYUN HEM HARİTA GRUPLARI) --- */
    fetchGroups();

    function fetchGroups() {
        var select = $('#g_group_select');
        select.empty();
        select.append('<option value="0">--- Filtre Yok (Hepsini Göster) ---</option>');
        
        // 1. Kendi Köy Gruplarını Çek
        $.get(TribalWars.buildURL('GET', 'groups', {mode: 'overview', ajax: 'load_group_menu'}), function(data) {
            if(data.result) {
                select.append('<optgroup label="--- KÖY GRUPLARINIZ ---">');
                data.result.forEach(function(g) {
                    if(g.type !== 'all') {
                        select.append(`<option value="INGAME_${g.group_id}">${g.name}</option>`);
                    }
                });
                select.append('</optgroup>');
            }
        });

        // 2. Harita Renklendirme Gruplarını Çek (Sizin istediğiniz "Yağma" grubu burada)
        $.get(TribalWars.buildURL('GET', 'map', {ajaxaction: 'load_for_groups'}), function(data) {
            // Data HTML tablosu olarak döner, parse etmemiz lazım
            var htmlData = $(data);
            var mapGroupFound = false;
            
            htmlData.find('.colorgroup-other-entry').each(function() {
                var gid = $(this).attr('data-id');
                var gname = $(this).find('.group-label').text().trim();
                if(gid && gname) {
                    if(!mapGroupFound) {
                        select.append('<optgroup label="--- HARİTA / YAĞMA GRUPLARI ---">');
                        mapGroupFound = true;
                    }
                    select.append(`<option value="MAP_${gid}">🎨 ${gname}</option>`);
                }
            });
            if(mapGroupFound) select.append('</optgroup>');
        });
    }

    /* --- TIKLAMA FONKSİYONLARI --- */
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
        var groupVal = $('#g_group_select').val();
        excludedVillages = [];

        if (groupVal != "0") {
            var type = groupVal.split('_')[0];
            var id = groupVal.split('_')[1];

            if (type === "INGAME") {
                // Oyun içi grup
                $.get(TribalWars.buildURL('GET', 'groups', {group_id: id, mode: 'villages'}), function(html) {
                    var regex = /data-village-id="(\d+)"/g;
                    var match;
                    while ((match = regex.exec(html)) !== null) {
                        excludedVillages.push(parseInt(match[1]));
                    }
                    console.log("Dışlanan (Oyun İçi): " + excludedVillages.length);
                    fetchWorldData();
                });
            } else if (type === "MAP") {
                // Harita Renklendirme Grubu (Sizin 'Yağma' klasörü)
                // Bu grubun köylerini almak için farklı bir API çağrısı lazım
                UI.SuccessMessage('Harita grubu verisi çözümleniyor...');
                $.get(TribalWars.buildURL('GET', 'map', {ajaxaction: 'load_for_multiple_villages', group_id: id}), function(json) {
                    // JSON formatında döner: {villages: [{id: 123, ...}, ...]}
                    if(json.villages) {
                        json.villages.forEach(v => excludedVillages.push(parseInt(v.id)));
                    }
                    console.log("Dışlanan (Harita): " + excludedVillages.length);
                    fetchWorldData();
                });
            }
        } else {
            fetchWorldData();
        }
    };

    function fetchWorldData() {
        UI.SuccessMessage('Uydu taraması başlatılıyor...');
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
        
        var includeNormal = $('#g_include_normal').is(':checked');

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

            if (vPid === 0) {
                // 1. Mesafe
                var dist = Math.sqrt(Math.pow(cX - vX, 2) + Math.pow(cY - vY, 2));
                if (dist > radius) continue;

                // 2. Puan
                if (vPts < minP || vPts > maxP) continue;

                // 3. Hariç Tutulanlar
                if (excludedVillages.includes(vId)) continue;

                // 4. MANTIK (YENİ)
                var keep = false;
                
                // Eğer bonus ise ve seçilenler listesinde varsa
                if (vBonus > 0) {
                    if (selectedBonusTypes.length === 0 || selectedBonusTypes.includes(vBonus)) {
                        keep = true;
                    }
                } 
                // Eğer normal barbar ise ve kutucuk işaretliyse
                else if (vBonus === 0 && includeNormal) {
                    keep = true;
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

        found.sort((a, b) => a.dist - b.dist);

        var outList = found.map(f => f.coord).join(' ');
        var outTable = '<table class="vis" width="100%" style="font-size:11px;"><tr><th>Mesafe</th><th>Koor</th><th>Puan</th><th>Tip</th></tr>';
        
        var bonusNames = ["-", "Odun", "Kil", "Demir", "Çiftlik", "Kışla", "Ahır", "Atölye", "Tüm", "Depo"];
        var bonusIcons = ["", "wood", "stone", "iron", "farm", "barracks", "stable", "garage", "all", "storage"];

        found.forEach(f => {
            var type = "Barbar";
            if (f.bonus > 0) {
                type = `<img src="graphic/bonus/${bonusIcons[f.bonus]}.png" width="16"> ${bonusNames[f.bonus]}`;
            }
            outTable += `<tr><td>${f.dist.toFixed(1)}</td><td><a href="/game.php?screen=info_village&id=${f.id}">${f.coord}</a></td><td>${f.points}</td><td>${type}</td></tr>`;
        });
        outTable += '</table>';

        $('#g_output').val(outList);
        $('#g_count').text(found.length);
        $('#g_table_container').html(outTable);
        $('#g_results').show();
        UI.SuccessMessage(found.length + ' barbar bulundu!');
    }

})();
