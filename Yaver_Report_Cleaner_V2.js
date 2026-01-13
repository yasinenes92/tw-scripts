/*
 * Script Name: Yaver Report Cleaner V2
 * Author: controleng
 * Version: 2.2 (Fix for detection)
 * Description: Automatically analyzes and deletes reports based on specific criteria.
 */

(function() {
    'use strict';

    const gameScreen = new URLSearchParams(window.location.search).get('screen');
    const currentMode = new URLSearchParams(window.location.search).get('mode');

    if (gameScreen !== 'report') {
        UI.ErrorMessage('Bu script sadece Raporlar sayfasında çalışır!', 3000);
        return;
    }

    // --- Birim Çiftlik Alanı (Popülasyon) Değerleri ---
    const unitPop = {
        spear: 1, sword: 1, axe: 1, archer: 1,
        spy: 2, light: 4, marcher: 5, heavy: 6,
        ram: 5, catapult: 8, knight: 10, snob: 100, militia: 0
    };

    // --- Silinecek Konu Başlıkları (İngilizce Sunucu İçin) ---
    const keywords = {
        scavenging: ["Scavenging troops returned"],
        misc: ["Achievements received", "Achievement received"],
        trade: ["Deliveries", "offers"], 
        support: ["Support"]
    };

    // --- UI Oluşturma ---
    function initUI() {
        if ($('#yaver-panel').length > 0) return;

        const panelHtml = `
        <div id="yaver-panel" class="vis" style="margin:10px 0; padding:10px; border:2px solid #7d510f; background-color:#f4e4bc;">
            <table width="100%">
                <tr>
                    <td width="60%" style="vertical-align:middle;">
                        <h3 style="margin:0; color:#603000; font-weight:bold;">🛡️ Yaver Auto-Cleaner V2</h3>
                        <small style="color:#555;">Developed by <b>controleng.</b></small>
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
                <button class="btn" onclick="Yaver.cleanOther()">🧹 Yağma/Başarım Temizle</button>
            </div>
            
            <div style="margin-top:10px; padding-top:5px; border-top:1px dashed #8c5f0d;">
                <button class="btn btn-confirm-yes" onclick="Yaver.cleanSiege()" style="width:100%;">⚔️ Fake/Siege (Ram/Cat < 20 Pop) BUL ve SİL</button>
            </div>
            <div style="margin-top:5px; font-size:9px; color:#555;">*Console (F12) üzerinden detaylı logları görebilirsiniz.</div>
        </div>`;

        $('.modemenu').after(panelHtml);
    }

    // --- Ana Mantık Nesnesi ---
    window.Yaver = {
        status: function(msg) {
            $('#yaver-status').html(msg);
        },

        executeDelete: function() {
            const deleteBtn = $('input[name="del"]');
            const checkedCount = $('#report_list input[type="checkbox"]:checked').length;
            
            if (checkedCount > 0 && deleteBtn.length > 0) {
                this.status(`Siliniyor: ${checkedCount} adet...`);
                // Butona tıklat
                deleteBtn.click();
            } else {
                this.status("Silinecek rapor bulunamadı.");
                UI.InfoMessage("Kriterlere uygun rapor yok.", 2000);
            }
        },

        cleanCategory: function(targetMode) {
            if (currentMode !== targetMode) {
                this.status(`${targetMode} klasörüne gidiliyor...`);
                window.location.href = TribalWars.buildURL('GET', 'report', { mode: targetMode });
                return;
            }
            $('#select_all').prop('checked', true).trigger('click');
            
            if ($('#report_list input[type="checkbox"]:checked').length === 0) {
                this.status("Rapor yok.");
            } else {
                this.executeDelete();
            }
        },

        cleanOther: function() {
            if (currentMode !== 'other') {
                this.status("Other klasörüne gidiliyor...");
                window.location.href = TribalWars.buildURL('GET', 'report', { mode: 'other' });
                return;
            }

            let count = 0;
            const targetWords = [...keywords.scavenging, ...keywords.misc];

            $('#report_list tr:has(.report-link)').each(function() {
                const subject = $(this).find('.report-link').text().trim();
                const checkbox = $(this).find('input[type="checkbox"]');
                if (targetWords.some(k => subject.includes(k))) {
                    checkbox.prop('checked', true);
                    count++;
                }
            });

            if (count > 0) {
                this.executeDelete();
            } else {
                this.status("Eşleşen rapor yok.");
            }
        },

        cleanSiege: async function() {
            if (currentMode !== 'attack' && currentMode !== 'defense' && currentMode !== 'all') {
                if(confirm("Bu işlem için 'Attacks' klasörüne gidilsin mi?")) {
                    window.location.href = TribalWars.buildURL('GET', 'report', { mode: 'attack' });
                }
                return;
            }

            const rows = $('#report_list tr:has(.report-link)').not(':hidden');
            let processed = 0;
            let matched = 0;

            console.log("--- Yaver Analiz Başladı ---");
            this.status("Analiz Başlıyor...");

            for (const row of rows) {
                const rowElem = $(row);
                const checkbox = rowElem.find('input[type="checkbox"]');
                const link = rowElem.find('.report-link').attr('href');
                const subject = rowElem.find('.report-link').text().trim();

                if (checkbox.is(':checked')) { processed++; continue; }

                this.status(`Analiz: ${processed + 1}/${rows.length} | Bulunan: ${matched}`);

                try {
                    const html = await $.ajax({ url: link, type: 'GET' });
                    const doc = new DOMParser().parseFromString(html, "text/html");

                    // Tabloları bul (Saldıran ve Savunan)
                    const attTable = doc.querySelector('#attack_info_att');
                    const defTable = doc.querySelector('#attack_info_def');
                    
                    const tables = [];
                    if(attTable) tables.push(attTable);
                    if(defTable) tables.push(defTable);

                    let deleteThis = false;
                    let logDetail = "";

                    if(tables.length === 0) {
                        console.log(`Rapor Atlandı (Tablo yok): ${subject}`);
                    }

                    for (const table of tables) {
                        let currentPop = 0;
                        let hasSiege = false;
                        
                        // Birim isimlerini daha sağlam bir şekilde al
                        const unitImgs = Array.from(table.querySelectorAll('tr:first-child img')); // Header row'daki imgler
                        
                        const unitMap = unitImgs.map(img => {
                            const src = img.getAttribute('src');
                            // Regex: graphic/unit/unit_spear.png veya graphic/unit/spear.png
                            const match = src.match(/\/unit\/(?:unit_)?([a-zA-Z]+)(?:_\d+)?\.png/);
                            return match ? match[1] : null;
                        });

                        // "Quantity:" içeren satırı bul
                        const rowsTr = table.querySelectorAll('tr');
                        let quantityRow;
                        for(let tr of rowsTr) {
                            const text = tr.innerText.trim();
                            // İngilizce sunucu için 'Quantity', Türkçe için 'Miktar'
                            if(text.startsWith('Quantity') || text.startsWith('Miktar') || text.includes('Quantity:')) {
                                quantityRow = tr;
                                break;
                            }
                        }

                        if (quantityRow) {
                            const cells = quantityRow.querySelectorAll('td');
                            // Hücreleri gez (index 0 etiket olabilir, 1'den başla)
                            // Ancak bazen etiket ayrı bir hücre olmayabilir, bu yüzden resim sayısıyla hücre sayısını kıyasla
                            let cellStartIndex = (cells.length > unitMap.length) ? 1 : 0;

                            for (let i = 0; i < unitMap.length; i++) {
                                const cell = cells[i + cellStartIndex];
                                if(!cell) continue;

                                const count = parseInt(cell.innerText.replace(/\./g, '')) || 0; // Noktaları temizle
                                const uName = unitMap[i];

                                if (uName && unitPop[uName] !== undefined && count > 0) {
                                    currentPop += count * unitPop[uName];
                                    if (uName === 'ram' || uName === 'catapult') {
                                        hasSiege = true;
                                    }
                                }
                            }
                        } else {
                             console.log("Quantity satırı bulunamadı:", subject);
                        }

                        logDetail += `[Siege:${hasSiege}, Pop:${currentPop}] `;

                        // KURAL: (Ram veya Cat VAR) VE (Pop < 20)
                        if (hasSiege && currentPop < 20) {
                            deleteThis = true;
                            break; 
                        }
                    }

                    if (deleteThis) {
                        console.log(`%c[SİLİNECEK] ${subject} -> ${logDetail}`, "color:green");
                        checkbox.prop('checked', true);
                        matched++;
                    } else {
                        console.log(`[KALACAK] ${subject} -> ${logDetail}`);
                    }

                    // Sunucu koruması için bekleme
                    await new Promise(r => setTimeout(r, 100));

                } catch (e) {
                    console.error("Hata:", e);
                }
                processed++;
            }

            if (matched > 0) {
                this.status(`${matched} rapor siliniyor...`);
                // Kullanıcı ne olduğunu görsün diye 1 saniye bekleyip siliyoruz
                setTimeout(() => this.executeDelete(), 1000); 
            } else {
                this.status("Silinecek rapor bulunamadı.");
            }
        }
    };

    initUI();
})();
