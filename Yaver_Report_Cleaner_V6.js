/*
 * Script Name: Yaver Siege Cleaner (Single Purpose)
 * Author: controleng
 * Version: 4.0
 * Description: Scans ONLY for reports with Siege units (Ram/Cat) and <20 population, then deletes them. Works in Attack and Defense folders.
 */

(function() {
    'use strict';

    const gameScreen = new URLSearchParams(window.location.search).get('screen');

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

    // --- Arayüz (Durum Çubuğu) ---
    function createStatusBox() {
        if ($('#yaver-status-box').length > 0) return;
        
        const html = `
            <div id="yaver-status-box" class="vis" style="margin:10px 0; padding:10px; border:2px solid #a30000; background-color:#ffd6d6; color:#500; font-weight:bold; text-align:center;">
                🛡️ Yaver Siege Cleaner <span style="font-size:0.8em; color:#333;">(by controleng)</span><br>
                <span id="yaver-status-text">Analiz Başlatılıyor...</span>
                <div id="yaver-progress" style="margin-top:5px; height:5px; background:#fff; width:0%;"></div>
            </div>`;
        
        $('.modemenu').after(html);
    }

    // --- Parse Mantığı (Kesin Sonuç) ---
    function parseSide(doc, tableId) {
        // Tabloyu bul (attack_info_att_units veya attack_info_def_units)
        const table = doc.querySelector(`#${tableId}`);
        if (!table) return null;

        let totalPop = 0;
        let hasSiege = false;
        
        // unit-item sınıfına sahip ve data-unit-count özniteliği olan hücreleri topla
        const unitCells = Array.from(table.querySelectorAll("td.unit-item"));

        unitCells.forEach(td => {
            // Hangi birim olduğunu class'tan bul (unit-item-ram vb.)
            const classList = Array.from(td.classList);
            const unitClass = classList.find(c => c.startsWith("unit-item-") && c !== "unit-item");
            
            if (unitClass) {
                const unitName = unitClass.replace("unit-item-", "").trim();
                
                // Sayıyı al (data-unit-count varsa onu, yoksa metni)
                const rawCount = td.getAttribute("data-unit-count") || td.textContent;
                const count = parseInt(String(rawCount).replace(/[^\d]/g, ""), 10) || 0;

                if (count > 0) {
                    // Nüfus ekle
                    if (unitPop[unitName] !== undefined) {
                        totalPop += count * unitPop[unitName];
                    }
                    // Kuşatma kontrolü
                    if (unitName === 'ram' || unitName === 'catapult') {
                        hasSiege = true;
                    }
                }
            }
        });

        return { totalPop, hasSiege };
    }

    // --- Ana İşlem ---
    async function runAnalysis() {
        createStatusBox();
        const statusText = $('#yaver-status-text');
        const progressBar = $('#yaver-progress');

        const rows = $('#report_list tr:has(.report-link)').not(':hidden');
        const total = rows.length;
        let processed = 0;
        let matched = 0;

        if (total === 0) {
            statusText.text("Bu sayfada analiz edilecek rapor bulunamadı.");
            return;
        }

        // Raporları tek tek gez
        for (const row of rows) {
            const rowElem = $(row);
            const checkbox = rowElem.find('input[type="checkbox"]');
            const link = rowElem.find('.report-link').attr('href');
            
            // Eğer zaten seçiliyse atla
            if (checkbox.is(':checked')) { processed++; continue; }

            // Durum Güncelle
            statusText.text(`Analiz: ${processed + 1} / ${total} | Bulunan: ${matched}`);
            progressBar.css('width', `${((processed + 1) / total) * 100}%`);

            try {
                // Arka planda raporu çek
                const html = await $.ajax({ url: link, type: 'GET' });
                const doc = new DOMParser().parseFromString(html, "text/html");

                // Hem Saldıranı (att) Hem Savunanı (def) Kontrol Et
                const attackerData = parseSide(doc, 'attack_info_att_units');
                const defenderData = parseSide(doc, 'attack_info_def_units');
                
                let shouldDelete = false;

                // Kontrol 1: Saldıran Kriteri Sağlıyor mu?
                if (attackerData && attackerData.hasSiege && attackerData.totalPop < LIMIT_POP) {
                    shouldDelete = true;
                }
                // Kontrol 2: Savunan Kriteri Sağlıyor mu? (Eğer saldıran sağlamadıysa bak)
                else if (defenderData && defenderData.hasSiege && defenderData.totalPop < LIMIT_POP) {
                    shouldDelete = true;
                }

                if (shouldDelete) {
                    checkbox.prop('checked', true);
                    matched++;
                }

                // Seri işlem için minik bekleme (Sunucu 429 hatası vermesin diye)
                await new Promise(r => setTimeout(r, 120));

            } catch (e) {
                console.error("Yaver Hata:", e);
            }

            processed++;
        }

        // --- SONUÇ ---
        if (matched > 0) {
            statusText.html(`✅ <b>${matched}</b> rapor bulundu. SİLİNİYOR...`);
            progressBar.css('background', '#4cd964'); // Yeşil yap
            
            // 1 saniye bekle ve silme butonuna bas
            setTimeout(() => {
                const delBtn = $('input[name="del"]');
                if(delBtn.length > 0) delBtn.click();
                else UI.ErrorMessage("Silme butonu bulunamadı!");
            }, 1000);
        } else {
            statusText.text("❌ Kriterlere uygun (Siege + <20 Pop) rapor bulunamadı.");
        }
    }

    // Script yüklendiği an çalıştır
    runAnalysis();

})();
