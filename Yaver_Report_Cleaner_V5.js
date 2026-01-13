/*
 * Script Name: Yaver Report Cleaner (Final V3)
 * Author: controleng
 * Version: 3.2 (Class-Based Parsing)
 * Description: %100 Accuracy using unit-item class detection. Auto-deletes <20 pop siege reports.
 */

(function() {
    'use strict';

    const gameScreen = new URLSearchParams(window.location.search).get('screen');
    const currentMode = new URLSearchParams(window.location.search).get('mode');

    if (gameScreen !== 'report') {
        UI.ErrorMessage('Bu script sadece Raporlar sayfasında çalışır!', 3000);
        return;
    }

    // --- AYARLAR ---
    const LIMIT_POP = 20; // 20 Popülasyon altı silinir
    const unitPop = {
        'spear': 1, 'sword': 1, 'axe': 1, 'archer': 1,
        'spy': 2, 'light': 4, 'marcher': 5, 'heavy': 6,
        'ram': 5, 'catapult': 8, 'knight': 10, 'snob': 100, 'militia': 0
    };

    // --- Kelime Filtreleri ---
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
                <button class="btn btn-confirm-yes" onclick="Yaver.cleanSiege()" style="width:100%;">⚔️ Fake/Siege (Ram/Cat + <${LIMIT_POP} Pop) BUL ve SİL</button>
            </div>
        </div>`;

        $('.modemenu').after(panelHtml);
    }

    // --- Yaver Ana Obje ---
    window.Yaver = {
        status: function(msg) {
            $('#yaver-status').html(msg);
        },

        deleteSelected: function() {
            const checkedCount = $('#report_list input[type="checkbox"]:checked').length;
            if (checkedCount > 0) {
                this.status(`Siliniyor: ${checkedCount} adet...`);
                $('input[name="del"]').click(); 
            } else {
                this.status("Silinecek rapor yok.");
                UI.InfoMessage("Kriterlere uygun rapor bulunamadı.", 2000);
            }
        },

        cleanCategory: function(targetMode) {
            if (currentMode !== targetMode) {
                this.status(`${targetMode} klasörüne gidiliyor...`);
                window.location.href = TribalWars.buildURL('GET', 'report', { mode: targetMode });
                return;
            }
            $('#select_all').prop('checked', true).trigger('click');
            setTimeout(() => this.deleteSelected(), 500);
        },

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
            if (count > 0) this.deleteSelected();
            else this.status("Uygun rapor yok.");
        },

        // --- EN ÖNEMLİ KISIM: DOĞRU PARSE MANTIĞI ---
        parseUnitTable: function(doc, tableId) {
            const table = doc.querySelector(`#${tableId}`);
            if (!table) return null;

            // "Quantity" satırını bul (Genelde 2. satır ama garantilemek lazım)
            // Senin paylaştığın kodda unit-item class'ları direkt td'lerde var.
            // Bu yüzden "Quantity" satırını bulup içindeki unit-item hücrelerini alacağız.
            
            const trs = Array.from(table.querySelectorAll("tr"));
            // İçinde "Quantity" veya "Miktar" geçen satırı bul, bulamazsan 2. satırı al
            const qtyRow = trs.find(tr => (tr.textContent || "").includes("Quantity") || (tr.textContent || "").includes("Miktar")) || trs[1];
            
            if (!qtyRow) return null;

            let totalPop = 0;
            let hasSiege = false;
            let unitsLog = [];

            const cells = Array.from(qtyRow.querySelectorAll("td.unit-item"));
            
            cells.forEach(td => {
                // Sınıf isminden birim adını çek: "unit-item unit-item-ram" -> "ram"
                const classList = Array.from(td.classList);
                const unitClass = classList.find(c => c.startsWith("unit-item-") && c !== "unit-item");
                
                if (unitClass) {
                    const unitName = unitClass.replace("unit-item-", "").trim();
                    
                    // Veriyi oku: data-unit-count öncelikli, yoksa textContent
                    const rawCount = td.getAttribute("data-unit-count") || td.textContent;
                    const count = parseInt(String(rawCount).replace(/[^\d]/g, ""), 10) || 0;

                    if (count > 0) {
                        unitsLog.push(`${unitName}:${count}`);
                        
                        // Popülasyon Hesapla
                        if (unitPop[unitName] !== undefined) {
                            totalPop += count * unitPop[unitName];
                        }
                        // Ram/Catapult Var mı?
                        if (unitName === 'ram' || unitName === 'catapult') {
                            hasSiege = true;
                        }
                    }
                }
            });

            return { totalPop, hasSiege, log: unitsLog.join(', ') };
        },

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
            console.log("--- YAVER V3 (Class-Based) BAŞLADI ---");
            this.status("Analiz ediliyor...");

            for (const row of rows) {
                const rowElem = $(row);
                const checkbox = rowElem.find('input[type="checkbox"]');
                const link = rowElem.find('.report-link').attr('href');
                const subject = rowElem.find('.report-link').text().trim();

                if (checkbox.is(':checked')) { processed++; continue; }

                this.status(`Analiz: ${processed+1}/${rows.length} | İşaretlenen: ${matched}`);

                try {
                    const html = await $.ajax({ url: link, type: 'GET' });
                    const doc = new DOMParser().parseFromString(html, "text/html");

                    // Rapor tiplerine göre olası tablo ID'leri
                    // Saldıran (att) ve Savunan (def) asker tabloları
                    // Genelde: attack_info_att_units ve attack_info_def_units
                    // Ama bazen: attack_info_att (Eski raporlarda veya bazı durumlarda)
                    
                    let sides = [];
                    
                    // Attacker Tablosunu Dene
                    let attData = this.parseUnitTable(doc, 'attack_info_att_units');
                    if (!attData) attData = this.parseUnitTable(doc, 'attack_info_att'); // Fallback
                    if (attData) sides.push(attData);

                    // Defender Tablosunu Dene
                    let defData = this.parseUnitTable(doc, 'attack_info_def_units');
                    if (!defData) defData = this.parseUnitTable(doc, 'attack_info_def'); // Fallback
                    if (defData) sides.push(defData);

                    let shouldDelete = false;

                    for (const side of sides) {
                        // KURAL: (Ram veya Cat VAR) VE (Pop < 20)
                        if (side.hasSiege && side.totalPop < LIMIT_POP) {
                            shouldDelete = true;
                            console.log(`%c[SİL] ${subject} -> Pop:${side.totalPop} (Units: ${side.log})`, "color:red");
                            break; 
                        } else {
                            console.log(`[OK] ${subject} -> Pop:${side.totalPop} (Units: ${side.log})`);
                        }
                    }

                    if (shouldDelete) {
                        checkbox.prop('checked', true);
                        matched++;
                    }

                    await new Promise(r => setTimeout(r, 120)); // Seri işlem için 120ms bekle

                } catch (e) {
                    console.error("Hata:", e);
                }
                processed++;
            }

            if (matched > 0) {
                this.status(`${matched} rapor siliniyor...`);
                setTimeout(() => this.deleteSelected(), 1000);
            } else {
                this.status("Silinecek rapor bulunamadı.");
            }
        }
    };

    initUI();
})();
