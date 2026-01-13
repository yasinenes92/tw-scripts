/*
 * Script Name: Yaver Report Cleaner
 * Author: controleng
 * Version: 2.1
 * Description: Advanced report management tool tailored for W152.
 */

(function() {
    'use strict';

    const gameScreen = new URLSearchParams(window.location.search).get('screen');
    const currentMode = new URLSearchParams(window.location.search).get('mode');

    if (gameScreen !== 'report') {
        UI.ErrorMessage('Bu script sadece Raporlar sayfasında çalışır!', 3000);
        return;
    }

    // --- Birim Ayarları (Çiftlik Alanı) ---
    const unitConfig = {
        spear: { pop: 1 },
        sword: { pop: 1 },
        axe: { pop: 1 },
        archer: { pop: 1 },
        spy: { pop: 2 },
        light: { pop: 4 },
        marcher: { pop: 5 },
        heavy: { pop: 6 },
        ram: { pop: 5, isSiege: true },
        catapult: { pop: 8, isSiege: true },
        knight: { pop: 10 },
        snob: { pop: 100 },
        militia: { pop: 0 }
    };

    // --- Arayüz Oluşturma ---
    function initUI() {
        if ($('#yaver-panel').length > 0) return;

        const panelHtml = `
        <div id="yaver-panel" class="vis" style="margin:10px 0; padding:10px; border:1px solid #7d510f; background-color:#f4e4bc;">
            <table width="100%">
                <tr>
                    <td width="50%">
                        <h3 style="margin:0; color:#603000;">🛡️ Yaver Report Manager</h3>
                        <small>Developed by <b>controleng.</b></small>
                    </td>
                    <td align="right">
                        <span id="yaver-status" style="font-weight:bold; color:#7d510f;">Hazır</span>
                    </td>
                </tr>
            </table>
            <hr>
            <div style="display:flex; gap:10px; flex-wrap:wrap;">
                <button class="btn" id="btn-trade">📦 Ticaret (Trade)</button>
                <button class="btn" id="btn-support">🤝 Destek (Support)</button>
                <button class="btn" id="btn-other">📜 Diğer (Scav/Achiev)</button>
                <button class="btn btn-confirm-yes" id="btn-siege">⚔️ Fake/Siege Analiz (< 20 Pop)</button>
            </div>
            <div style="margin-top:8px; font-size:10px; font-style:italic; color:#555;">
                * Ticaret ve Destek butonları ilgili klasöre gider ve tümünü seçer.<br>
                * Fake/Siege analizi raporların içine girerek Ram/Catapult kontrolü yapar.
            </div>
        </div>
        `;

        $('.modemenu').after(panelHtml);
    }

    // --- Fonksiyonlar ---

    // 1. Kategori Bazlı Temizlik (Oyunun filtre sekmelerini kullanır)
    function handleCategory(targetMode) {
        // Eğer doğru sekmede değilsek yönlendir
        if (currentMode !== targetMode) {
            UI.Message('İlgili klasöre gidiliyor...', 1000);
            window.location.href = TribalWars.buildURL('GET', 'report', { mode: targetMode });
            return;
        }

        // Doğru sekmedeyiz, hepsini seç
        $('#select_all').prop('checked', true).trigger('click'); // Oyunun kendi fonksiyonunu tetikler
        $('#yaver-status').text(`${targetMode.toUpperCase()} raporları seçildi. Silmek için aşağıdan 'Delete' yapın.`);
        UI.SuccessMessage('Raporlar seçildi. Lütfen silme işlemini onaylayın.');
        
        // Sil butonuna odaklan
        $('html, body').animate({ scrollTop: $('input[name="del"]').offset().top - 100 }, 500);
    }

    // 2. Diğer (Other) Kategorisi - Metin Bazlı Seçim
    function handleOther() {
        if (currentMode !== 'other') {
            UI.Message('Other klasörüne gidiliyor...', 1000);
            window.location.href = TribalWars.buildURL('GET', 'report', { mode: 'other' });
            return;
        }

        // Scavenging ve Achievements İngilizce metinleri
        const keywords = ['Scavenging troops returned', 'Achievement received'];
        let count = 0;

        $('#report_list tr:has(.report-link)').each(function() {
            const subjectText = $(this).find('.report-link').text().trim();
            const checkbox = $(this).find('input[type="checkbox"]');

            // Başlıkta anahtar kelimelerden biri geçiyor mu?
            if (keywords.some(k => subjectText.includes(k))) {
                checkbox.prop('checked', true);
                count++;
            }
        });

        $('#yaver-status').text(`${count} adet Yağma/Başarım raporu seçildi.`);
        if (count > 0) {
            UI.SuccessMessage(`${count} rapor seçildi.`);
            $('html, body').animate({ scrollTop: $('input[name="del"]').offset().top - 100 }, 500);
        } else {
            UI.InfoMessage('Bu sayfada uygun rapor bulunamadı.');
        }
    }

    // 3. Fake/Siege Analizi (Arka Plan Taraması)
    async function handleSiegeAnalysis() {
        if (currentMode !== 'attack' && currentMode !== 'defense' && currentMode !== 'all') {
             if(!confirm("Bu analiz Saldırı veya Savunma klasörlerinde yapılmalıdır. Saldırı klasörüne gidilsin mi?")) return;
             window.location.href = TribalWars.buildURL('GET', 'report', { mode: 'attack' });
             return;
        }

        const rows = $('#report_list tr:has(.report-link)').not(':hidden');
        let processed = 0;
        let matched = 0;

        $('#btn-siege').prop('disabled', true).text('Analiz Ediliyor...');

        for (const row of rows) {
            const rowElem = $(row);
            const checkbox = rowElem.find('input[type="checkbox"]');
            const link = rowElem.find('.report-link').attr('href');

            // Zaten seçiliyse atla
            if (checkbox.is(':checked')) {
                processed++;
                continue;
            }

            // Durum güncelleme
            $('#yaver-status').text(`Analiz: ${processed + 1}/${rows.length} - Bulunan: ${matched}`);

            try {
                // Raporu çek
                const html = await $.ajax({ url: link, type: 'GET' });
                const doc = new DOMParser().parseFromString(html, "text/html");

                // Hem saldıran hem savunan tablolarını kontrol et
                const tables = [
                    doc.querySelector('#attack_info_att'),
                    doc.querySelector('#attack_info_def')
                ];

                let shouldDelete = false;

                for (const table of tables) {
                    if (!table) continue;

                    let totalPop = 0;
                    let hasRamOrCat = false;

                    // Birim isimlerini al (başlık satırından)
                    const unitImgs = Array.from(table.querySelectorAll('.center:first-child td img'));
                    const unitMap = unitImgs.map(img => {
                        const src = img.getAttribute('src');
                        // src içinden unit ismini çek (örn: unit_ram.png -> ram)
                        const match = src.match(/unit\/unit_(\w+)\.png/) || src.match(/unit\/(\w+)\.png/);
                        return match ? match[1] : null;
                    });

                    // Miktarları al (Quantity satırı)
                    // Genelde 2. satırdır ("Quantity:" içeren satır)
                    const rowsTr = table.querySelectorAll('tr');
                    let quantityRow;
                    for(let tr of rowsTr) {
                        if(tr.innerText.includes('Quantity:') || tr.innerText.includes('Miktar:')) {
                            quantityRow = tr;
                            break;
                        }
                    }

                    if (quantityRow) {
                        const cells = quantityRow.querySelectorAll('td');
                        // i=1'den başlıyoruz çünkü ilk hücre "Quantity" yazısı
                        for (let i = 1; i < cells.length; i++) {
                            const count = parseInt(cells[i].innerText.replace('.', '')) || 0;
                            const unitName = unitMap[i - 1]; // -1 offset

                            if (unitName && unitConfig[unitName] && count > 0) {
                                // Popülasyon hesabı
                                totalPop += count * unitConfig[unitName].pop;
                                
                                // Kuşatma kontrolü
                                if (unitConfig[unitName].isSiege) {
                                    hasRamOrCat = true;
                                }
                            }
                        }
                    }

                    // KURAL: (Ram veya Catapult VAR) VE (Popülasyon < 20)
                    if (hasRamOrCat && totalPop < 20) {
                        shouldDelete = true;
                        break; // Bir tarafta bulduysak yeterli
                    }
                }

                if (shouldDelete) {
                    checkbox.prop('checked', true);
                    matched++;
                }

            } catch (e) {
                console.error("Rapor hatası", e);
            }

            processed++;
            // Çok hızlı istek atmamak için minik bekleme
            await new Promise(r => setTimeout(r, 50)); 
        }

        $('#btn-siege').prop('disabled', false).text('⚔️ Fake/Siege Analiz (< 20 Pop)');
        $('#yaver-status').text(`Tamamlandı. ${matched} rapor işaretlendi.`);
        
        if (matched > 0) {
            UI.SuccessMessage(`${matched} adet Fake/Siege raporu seçildi.`);
            $('html, body').animate({ scrollTop: $('input[name="del"]').offset().top - 100 }, 500);
        } else {
            UI.InfoMessage('Kriterlere uyan rapor bulunamadı.');
        }
    }

    // --- Başlatıcı ---
    initUI();

    // Eventler
    $('#btn-trade').click(() => handleCategory('trade'));
    $('#btn-support').click(() => handleCategory('support'));
    $('#btn-other').click(() => handleOther());
    $('#btn-siege').click(() => handleSiegeAnalysis());

})();
