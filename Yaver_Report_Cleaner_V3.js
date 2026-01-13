/*
 * Script Name: Yaver Report Cleaner V3
 * Author: controleng
 * Version: 3.0 (Data-Attribute Precision)
 * Description: Auto-deletes reports based on farm space (<20 pop) and siege presence using exact game data.
 */

(function() {
    'use strict';

    const gameScreen = new URLSearchParams(window.location.search).get('screen');
    const currentMode = new URLSearchParams(window.location.search).get('mode');

    if (gameScreen !== 'report') {
        UI.ErrorMessage('Bu script sadece Raporlar sayfasında çalışır!', 3000);
        return;
    }

    // --- Birim Ayarları (Çiftlik Nüfusu) ---
    const unitPop = {
        'spear': 1, 'sword': 1, 'axe': 1, 'archer': 1,
        'spy': 2, 'light': 4, 'marcher': 5, 'heavy': 6,
        'ram': 5, 'catapult': 8, 'knight': 10, 'snob': 100, 'militia': 0
    };

    // --- Silinecek Kelimeler ---
    const filters = {
        trade: ["Deliveries", "offers"], 
        support: ["Support"],
        other: ["Scavenging", "Achievement"]
    };

    // --- Arayüz ---
    function initUI() {
        if ($('#yaver-panel').length > 0) return;

        const panelHtml = `
        <div id="yaver-panel" class="vis" style="margin:10px 0; padding:10px; border:2px solid #7d510f; background-color:#f4e4bc;">
            <table width="100%">
                <tr>
                    <td width="60%">
                        <h3 style="margin:0; color:#603000;">🛡️ Yaver Auto-Cleaner V3</h3>
                        <small>Developed by <b>controleng.</b></small>
                    </td>
                    <td align="right">
                        <span id="yaver-status" style="font-weight:bold; color:#a30000; background:#fff; padding:3px 6px; border:1px solid #999;">Hazır</span>
                    </td>
                </tr>
            </table>
            <hr style="margin: 8px 0; border-color:#dcb;">
            
            <div style="display:flex; gap:8px; flex-wrap:wrap;">
                <button class="btn" onclick="Yaver.cleanCategory('trade')">📦 Ticaret Temizle</button>
                <button class="btn" onclick="Yaver.cleanCategory('support')">🤝 Destek Temizle</button>
                <button class="btn" onclick="Yaver.cleanOther()">🧹 Diğer (Other) Temizle</button>
            </div>
            
            <div style="margin-top:10px; padding-top:5px; border-top:1px dashed #8c5f0d;">
                <button class="btn btn-confirm-yes" onclick="Yaver.cleanSiege()" style="width:100%;">⚔️ Fake/Siege (Ram/Cat + <20 Pop) OTO SİL</button>
            </div>
        </div>`;

        $('.modemenu').after(panelHtml);
    }

    // --- Yaver Ana Obje ---
    window.Yaver = {
        status: function(msg) {
            $('#yaver-status').html(msg);
        },

        // Silme İşlemini Tetikle
        executeDelete: function() {
            const checkedCount = $('#report_list input[type="checkbox"]:checked').length;
            if (checkedCount > 0) {
                this.status(`Siliniyor: ${checkedCount} adet...`);
                // Delete butonunu bul ve tıkla
                $('input[name="del"]').click();
            } else {
                this.status("Silinecek rapor yok.");
                UI.InfoMessage("Kriterlere uygun rapor bulunamadı.", 2000);
            }
        },

        // Kategori Bazlı (Trade/Support) - Direkt o sayfaya gidip siler
        cleanCategory: function(targetMode) {
            if (currentMode !== targetMode) {
                this.status(`${targetMode} klasörüne gidiliyor...`);
                window.location.href = TribalWars.buildURL('GET', 'report', { mode: targetMode });
                return;
            }
            // Hepsini seç
            $('#select_all').prop('checked', true).trigger('click');
            
            // 0.5sn bekle ve sil (Kullanıcı seçimi görsün diye)
            setTimeout(() => this.executeDelete(), 500);
        },

        // Diğer (Other) - Kelime bazlı tarar
        cleanOther: function() {
            if (currentMode !== 'other') {
                window.location.href = TribalWars.buildURL('GET', 'report', { mode: 'other' });
                return;
            }

            let count = 0;
            const targetWords = [...filters.other, ...filters.misc || []];

            $('#report_list tr:has(.report-link)').each(function() {
                const subject = $(this).find('.report-link').text().trim();
                const checkbox = $(this).find('input[type="checkbox"]');
                if (targetWords.some(k => subject.includes(k))) {
                    checkbox.prop('checked', true);
                    count++;
                }
            });

            if (count > 0) this.executeDelete();
            else this.status("Uygun rapor yok.");
        },

        // *** KRİTİK BÖLÜM: FAKE/SIEGE ANALİZİ ***
        cleanSiege: async function() {
            if (currentMode !== 'attack' && currentMode !== 'defense' && currentMode !== 'all') {
                if(confirm("Bu işlem Saldırı/Savunma klasörlerinde yapılır. Saldırı klasörüne gidilsin mi?")) {
                    window.location.href = TribalWars.buildURL('GET', 'report', { mode: 'attack' });
                }
                return;
            }

            const rows = $('#report_list tr:has(.report-link)').not(':hidden');
            let processed = 0;
            let matched = 0;

            console.clear();
            console.log("--- YAVER V3 ANALİZ ---");
            this.status("Analiz ediliyor...");

            for (const row of rows) {
                const rowElem = $(row);
                const checkbox = rowElem.find('input[type="checkbox"]');
                const link = rowElem.find('.report-link').attr('href');
                const subject = rowElem.find('.report-link').text().trim();

                // Zaten işaretliyse geç
                if (checkbox.is(':checked')) { processed++; continue; }

                this.status(`Analiz: ${processed+1}/${rows.length} | İşaretlenen: ${matched}`);

                try {
                    // Rapor içeriğini çek
                    const html = await $.ajax({ url: link, type: 'GET' });
                    const doc = new DOMParser().parseFromString(html, "text/html");

                    // Saldıran ve Savunan tablolarını bul
                    // Senin verdiğin HTML'de id'ler: #attack_info_att ve #attack_info_def
                    const tables = [
                        doc.querySelector('#attack_info_att'), 
                        doc.querySelector('#attack_info_def')
                    ];
                    
                    let shouldDelete = false;

                    for (const table of tables) {
                        if (!table) continue;

                        let totalPop = 0;
                        let hasSiege = false;
                        let unitsDebug = [];

                        // data-unit-count özniteliği olan hücreleri bul
                        // Örn: <td ... class="unit-item unit-item-ram" data-unit-count="1">1</td>
                        const unitCells = Array.from(table.querySelectorAll('td.unit-item'));

                        unitCells.forEach(td => {
                            // Sınıf listesinden birim adını bul (unit-item-ram -> ram)
                            const classList = Array.from(td.classList);
                            const unitClass = classList.find(c => c.startsWith('unit-item-') && c !== 'unit-item');
                            
                            if (unitClass) {
                                const unitName = unitClass.replace('unit-item-', '');
                                
                                // Kesin sayıyı al
                                const rawCount = td.getAttribute('data-unit-count');
                                const count = parseInt(rawCount) || 0;

                                if (count > 0) {
                                    unitsDebug.push(`${unitName}:${count}`);
                                    
                                    // Popülasyon Ekle
                                    if (unitPop[unitName]) {
                                        totalPop += count * unitPop[unitName];
                                    }

                                    // Kuşatma Kontrolü
                                    if (unitName === 'ram' || unitName === 'catapult') {
                                        hasSiege = true;
                                    }
                                }
                            }
                        });

                        // Konsola bilgi bas (Debug için)
                        if (unitsDebug.length > 0) {
                            console.log(`Rapor: ${subject} | Taraf: ${table.id} | Askerler: ${unitsDebug.join(', ')} | Pop: ${totalPop} | Siege: ${hasSiege}`);
                        }

                        // --- KARAR ANI ---
                        // 1. Ram veya Mancınık VARSA
                        // 2. VE Toplam Popülasyon 20'den AZSA
                        if (hasSiege && totalPop < 20) {
                            shouldDelete = true;
                            console.log(`%c -> SİLİNECEK!`, "color:red; font-weight:bold;");
                            break; // Bir tarafta bulduysak silmek için yeterli
                        }
                    }

                    if (shouldDelete) {
                        checkbox.prop('checked', true);
                        matched++;
                    }

                    // Sunucu koruması (100ms bekleme)
                    await new Promise(r => setTimeout(r, 100));

                } catch (e) {
                    console.error("Hata:", e);
                }
                processed++;
            }

            if (matched > 0) {
                this.status(`${matched} rapor siliniyor...`);
                // Kullanıcıya 1 saniye gösterip sonra SİL
                setTimeout(() => this.executeDelete(), 1000);
            } else {
                this.status("Kriterlere uygun rapor bulunamadı.");
                UI.InfoMessage("Fake/Siege raporu bulunamadı.", 2000);
            }
        }
    };

    initUI();
})();
