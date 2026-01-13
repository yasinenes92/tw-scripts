/*
 * Script Name: Advanced Report Cleaner (Yaver)
 * Author: controleng
 * Version: 2.0
 * Description: Automates report deletion based on specific criteria including farm space logic.
 */

(function() {
    'use strict';

    const gameScreen = new URLSearchParams(window.location.search).get('screen');
    
    // Sadece Rapor sayfasında çalışsın
    if (gameScreen !== 'report') {
        UI.ErrorMessage('Bu script sadece Raporlar (Reports) sayfasında çalışır!', 3000);
        return;
    }

    // --- Ayarlar ve Sabitler ---
    const unitPop = {
        spear: 1, sword: 1, axe: 1, archer: 1,
        spy: 2, light: 4, marcher: 5, heavy: 6,
        ram: 5, catapult: 8, knight: 10, snob: 100, militia: 0
    };

    // İngilizce Sunucu (en152) için Anahtar Kelimeler
    const filters = {
        trade: [
            "Deliveries between your villages",
            "Deliveries from other players",
            "Deliveries to other players",
            "Accepting of offers",
            "offers that were accepted"
        ],
        support: [
            "Support between your villages",
            "Support from other players",
            "Support to other players",
            "Withdrawal of your support",
            "Withdrawal of support",
            "Support sent back"
        ],
        scavenging: [
            "Scavenging troops returned"
        ],
        misc: [
            "Achievements received",
            "Achievement received"
        ]
    };

    // --- UI Oluşturma ---
    function createUI() {
        if ($('#yaver-report-cleaner').length > 0) return;

        const uiHTML = `
        <div id="yaver-report-cleaner" class="vis" style="margin:10px 0; padding:10px; background-color:#f4e4bc; border:1px solid #7d510f;">
            <table width="100%">
                <tr>
                    <td style="vertical-align:middle;">
                        <h3 style="margin:0; padding-bottom:5px; color:#603000;">🛡️ Yaver Report Manager</h3>
                        <small style="font-style:italic;">Developed by <b>controleng.</b></small>
                    </td>
                    <td style="text-align:right;">
                        <button class="btn" onclick="$('#yaver-help').toggle()">❓ Yardım</button>
                    </td>
                </tr>
            </table>
            <hr style="margin: 5px 0; border: 0; border-top: 1px solid #dcb;">
            
            <div style="display:flex; flex-wrap:wrap; gap:10px; margin-top:10px;">
                <button class="btn" id="btn-clean-trade">📦 Ticaret (Trade) Seç</button>
                <button class="btn" id="btn-clean-support">🤝 Destek (Support) Seç</button>
                <button class="btn" id="btn-clean-scav">axe Yağma (Scavenging) Seç</button>
                <button class="btn" id="btn-clean-misc">🏆 Başarım (Misc) Seç</button>
            </div>
            
            <div style="margin-top:10px; padding-top:10px; border-top:1px dashed #8c5f0d;">
                <button class="btn btn-confirm-yes" id="btn-clean-siege">⚔️ Fake/Siege Temizleyici (Ram/Cat < 20 Pop)</button>
            </div>

            <div id="yaver-status" style="margin-top:10px; font-weight:bold; color:#a30000; min-height:1.2em;"></div>

            <div id="yaver-help" style="display:none; margin-top:10px; font-size:0.9em; color:#333;">
                <p><b>Nasıl Çalışır?</b></p>
                <ul>
                    <li><b>Kategoriler:</b> İlgili butona bastığınızda, o sayfadaki kriterlere uyan raporlar otomatik işaretlenir.</li>
                    <li><b>Fake/Siege:</b> Raporların içine tek tek girer (arka planda). Eğer saldırıda Ram veya Mancınık varsa VE toplam popülasyon 20'den azsa işaretler.</li>
                    <li>İşlem bitince sayfanın altındaki "Delete" butonuna sizin basmanız gerekir (Güvenlik için).</li>
                </ul>
            </div>
        </div>`;

        // İçeriği ekle (Modemenu'nün hemen altına)
        $('.modemenu').after(uiHTML);
    }

    // --- Basit Filtreleme Fonksiyonu ---
    function selectByKeywords(keywordArray) {
        let count = 0;
        $('#report_list tr').each(function() {
            const row = $(this);
            // .report-link içindeki metni al, yoksa quickedit-label'a bak
            let subject = row.find('.report-link').text().trim();
            if(!subject) subject = row.find('.quickedit-label').text().trim();

            if (!subject) return;

            const checkbox = row.find('input[type="checkbox"]');
            
            // Konu başlığında anahtar kelime var mı?
            const match = keywordArray.some(key => subject.toLowerCase().includes(key.toLowerCase()));

            if (match) {
                checkbox.prop('checked', true);
                count++;
            }
        });

        updateStatus(`${count} rapor seçildi. Silmek için aşağıdan 'Delete' butonuna basın.`);
    }

    // --- Gelişmiş Siege/Fake Analizi ---
    async function processSiegeReports() {
        const rows = $('#report_list tr:has(.report-link)').not(':hidden'); // Sadece görünür raporlar
        let totalProcessed = 0;
        let selectedCount = 0;
        const totalRows = rows.length;

        $('#btn-clean-siege').prop('disabled', true).text('Analiz Ediliyor...');

        for (const row of rows) {
            const rowElem = $(row);
            const checkbox = rowElem.find('input[type="checkbox"]');
            
            // Zaten seçiliyse atla
            if(checkbox.is(':checked')) {
                totalProcessed++;
                continue;
            }

            const link = rowElem.find('.report-link').attr('href');
            
            // Link yoksa atla
            if (!link) continue;

            updateStatus(`Analiz ediliyor: ${totalProcessed + 1}/${totalRows} (Seçilen: ${selectedCount})`);

            try {
                // Rapor detayını çek
                const html = await $.ajax({ url: link, type: 'GET' });
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, "text/html");

                // Saldıran tablosunu bul (attack_info_att)
                const attackTable = $(doc).find('#attack_info_att');
                
                // Eğer saldırı tablosu yoksa (örn: ziyaret, vb) atla
                if (attackTable.length === 0) {
                    totalProcessed++;
                    continue;
                }

                let totalPop = 0;
                let hasSiege = false; // Ram veya Catapult var mı?

                // Birim isimlerini al (Header row)
                const unitNames = [];
                attackTable.find('.center td img').each(function() {
                    const src = $(this).attr('src');
                    // graphic/unit/unit_spear.png veya unit/spear.png
                    const matches = src.match(/unit\/(\w+?)(?:_40)?\.png/); // Regex ile birim adını çek
                    if (matches && matches.length > 0) {
                        // "unit_spear" -> "spear" temizliği
                        let name = matches[1].replace('unit_', ''); 
                        unitNames.push(name);
                    }
                });

                // Birim sayılarını al (Quantity row)
                // Genelde 2. satırdır ama "Quantity:" yazısını içeren satırı bulalım
                const quantityRow = attackTable.find('tr').filter(function() {
                    return $(this).text().includes('Quantity:');
                });

                if (quantityRow.length > 0) {
                    quantityRow.find('td').each(function(index) {
                         // İlk hücre "Quantity:" yazısıdır, onu atla (index 0 title ise)
                        // unitNames array'i ile eşleştirmek için mantığı kuralım.
                        // Tabloda ilk td yazı, sonrakiler birimler.
                        if (index === 0) return; 

                        const countText = $(this).text().trim();
                        const count = parseInt(countText.replace('.', '')) || 0; // Noktaları temizle
                        
                        const unitKey = unitNames[index - 1]; // -1 çünkü ilk td boş/yazı

                        if (unitKey && count > 0) {
                            // Kuşatma kontrolü
                            if (unitKey === 'ram' || unitKey === 'catapult') {
                                hasSiege = true;
                            }
                            // Popülasyon hesabı
                            if (unitPop[unitKey] !== undefined) {
                                totalPop += count * unitPop[unitKey];
                            }
                        }
                    });
                }

                // --- KARAR ANI ---
                // Şart: Ram veya Catapult İÇERECEK + Toplam Popülasyon 20'den AZ olacak.
                if (hasSiege && totalPop < 20) {
                    checkbox.prop('checked', true);
                    selectedCount++;
                }

                // Sunucuyu boğmamak için bekleme (200ms)
                await new Promise(resolve => setTimeout(resolve, 200));

            } catch (err) {
                console.error('Rapor okuma hatası:', err);
            }

            totalProcessed++;
        }

        $('#btn-clean-siege').prop('disabled', false).text('⚔️ Fake/Siege Temizle (< 20 Pop)');
        updateStatus(`İşlem Tamamlandı! Toplam ${selectedCount} adet Fake/Siege raporu seçildi.`);
        
        if(selectedCount > 0) {
            UI.SuccessMessage('Seçilen raporları silmek için aşağıdaki "Delete" butonuna basmayı unutmayın!');
        }
    }

    function updateStatus(msg) {
        $('#yaver-status').text(msg);
    }

    // --- Başlatma ---
    createUI();

    // Event Listener'lar
    $('#btn-clean-trade').click(() => selectByKeywords(filters.trade));
    $('#btn-clean-support').click(() => selectByKeywords(filters.support));
    $('#btn-clean-scav').click(() => selectByKeywords(filters.scavenging));
    $('#btn-clean-misc').click(() => selectByKeywords(filters.misc));
    $('#btn-clean-siege').click(() => processSiegeReports());

})();
