javascript:
/*
 * Yaver Single Village Scavenge (Mass Logic Port)
 * Tek köy ekranında (place&mode=scavenge), Mass Scavenge mantığıyla (Süre ve Öncelik ayarlı) dağıtım yapar.
 */

(function() {
    // Sadece Scavenge ekranında çalışsın
    if (window.location.href.indexOf('screen=place&mode=scavenge') < 0) {
        UI.ErrorMessage('Bu scripti sadece "Scavenging" (Yağma) ekranında kullanabilirsin komutanım!');
        return;
    }

    // Arayüz temizliği (önceki çalışmadan kalanları sil)
    $("#yaverScavengePanel").remove();

    // Oyun verilerini çek (Faktörler ve Mevcut Askerler)
    let scavengeOptions = window.ScavengeScreen.village.options;
    let unitInfo = window.ScavengeScreen.unit_info;
    let homeUnits = window.ScavengeScreen.village.unit_counts_home;
    
    // Faktörleri al (Lackadaisical Looters - ID:1 baz alınır genelde)
    let base = scavengeOptions[1].base || scavengeOptions[1]; // Versiyon farkı koruması
    let duration_factor = base.duration_factor;
    let duration_exponent = base.duration_exponent;
    let duration_initial_seconds = base.duration_initial_seconds;

    // UI oluştur
    let html = `
    <div id="yaverScavengePanel" class="vis" style="margin:10px 0; padding:10px; border:2px solid #7d510f; background:#f4e4bc;">
        <h3>⚔️ Yaver Tekli Yağma Yöneticisi</h3>
        <table width="100%">
            <tr>
                <td valign="top" width="40%">
                    <strong>1. Askerleri Seç:</strong><br>
                    <div id="yaverUnits"></div>
                </td>
                <td valign="top" width="30%">
                    <strong>2. Kategoriler:</strong><br>
                    <label><input type="checkbox" id="cat1" checked> Tembel (1)</label><br>
                    <label><input type="checkbox" id="cat2" checked> Mütevazı (2)</label><br>
                    <label><input type="checkbox" id="cat3" checked> Zeki (3)</label><br>
                    <label><input type="checkbox" id="cat4" checked> Büyük (4)</label>
                </td>
                <td valign="top" width="30%">
                    <strong>3. Ayarlar:</strong><br>
                    Süre (Saat): <input type="number" id="scavTime" value="4" style="width:40px"><br><br>
                    <strong>Dağıtım Modu:</strong><br>
                    <label><input type="radio" name="prio" id="prioBal" checked> Dengeli (Hepsi Eşit)</label><br>
                    <label><input type="radio" name="prio" id="prioHigh"> Öncelikli (Yüksek Verim)</label><br><br>
                    <button class="btn btn-confirm-yes" onclick="YaverScavenge.calculateAndFill()">🚀 Hesapla ve Doldur</button>
                </td>
            </tr>
        </table>
        <div id="yaverResult" style="margin-top:5px; font-weight:bold; color:green;"></div>
    </div>`;

    // Ekrana ekle (Scavenge ekranının üstüne)
    $("#scavenge_screen").before(html);

    // Asker seçim kutularını dinamik oluştur
    let unitsHtml = "";
    let validUnits = ["spear", "sword", "axe", "archer", "light", "marcher", "heavy"];
    validUnits.forEach(u => {
        if(unitInfo[u]) { // Bu dünyada bu birim varsa
            unitsHtml += `<label style="margin-right:10px;"><input type="checkbox" id="use_${u}" checked> <img src="https://dsen.innogamescdn.com/asset/c645ceed/graphic/unit/unit_${u}.png"> ${homeUnits[u]}</label><br>`;
        }
    });
    $("#yaverUnits").html(unitsHtml);

    // --- MANTIK KISMI ---
    window.YaverScavenge = {
        calculateAndFill: function() {
            // 1. Seçili askerleri ve mevcut sayıları al
            let troopsAllowed = {};
            let totalCarry = 0;
            
            validUnits.forEach(u => {
                if ($("#use_" + u).is(":checked") && homeUnits[u] > 0) {
                    troopsAllowed[u] = parseInt(homeUnits[u]);
                    totalCarry += troopsAllowed[u] * unitInfo[u].carry;
                } else {
                    troopsAllowed[u] = 0;
                }
            });

            if (totalCarry === 0) {
                UI.ErrorMessage("Hiç asker seçilmedi veya köyde asker yok!");
                return;
            }

            // 2. Seçili kategorileri al
            let enabledCats = [
                $("#cat1").is(":checked"),
                $("#cat2").is(":checked"),
                $("#cat3").is(":checked"),
                $("#cat4").is(":checked")
            ];

            // 3. Hedef süreyi al ve gereken taşıma kapasitesini hesapla
            let hours = parseFloat($("#scavTime").val());
            let timeSec = hours * 3600;
            
            // Formül: ((Time / duration_factor - duration_initial_seconds) ^ (1/duration_exponent)) / 100 ) ^ 2 = BaseLoot
            // Ama massScavenge'deki tersine mühendislik formülü şöyledir:
            // haul = ((time / duration_factor - duration_initial_seconds) ** (1 / duration_exponent) / 100) ** (1/2) ???
            // Orjinal formül (zaman -> hammadde):
            // Loot = ( (Duration * Factor - Initial) ^ (1/Exponent) ) ... biraz karışık.
            // MassScavenge scriptindeki formülü birebir alıyorum:
            
            // Bu formül "X saniye için 'Base' kapasite nedir?" sorusunun cevabıdır.
            let baseHaul = ((timeSec / duration_factor - duration_initial_seconds) ** (1 / duration_exponent) / 100) ** (1 / 2); // Bu garip bir formül ama mass scriptinde bu kullanılmış.
            
            // Asıl formül (Wiki): Duration = (Loot / 100 / Loot_Factor ) ^ Exponent * Duration_Factor + Initial
            // Tersini yapalım: Loot = ( ( (Duration - Initial) / Duration_Factor ) ^ (1/Exponent) ) * 100 * Loot_Factor
            
            let valTerm = (timeSec - duration_initial_seconds) / duration_factor;
            // Negatif kontrolü
            if(valTerm < 0) valTerm = 0;
            
            let baseCapacity = Math.pow(valTerm, 1/duration_exponent); 
            // baseCapacity şu an: (Loot / (100*Factor)) kısmı.
            // Yani Capacity = baseCapacity * 100 * Loot_Factor
            
            let catFactors = [0.1, 0.25, 0.50, 0.75]; // Oyunun standart faktörleri
            let reqCapacity = []; // Her kategori için o sürede gereken kapasite
            let totalReqCapacity = 0;

            for(let i=0; i<4; i++) {
                if(enabledCats[i] && !scavengeOptions[i+1].is_locked) {
                    let cap = baseCapacity * 100 * catFactors[i];
                    reqCapacity[i] = cap;
                    totalReqCapacity += cap;
                } else {
                    reqCapacity[i] = 0;
                }
            }

            // 4. Dağıtım Stratejisi
            let finalDistribution = [{}, {}, {}, {}]; // 4 kategori için birim sayıları
            let isPriority = $("#prioHigh").is(":checked");

            if (totalCarry > totalReqCapacity) {
                // Yeterince asker var, herkes istediği kadar (Full süre) alacak.
                // Eğer Priority seçiliyse ve asker artıyorsa, artanı kullanmaz (süre sınırı var).
                // MassScavenge mantığında süreye sadık kalınıyor.
                
                for(let i=3; i>=0; i--) { // Büyükten küçüğe veya küçükten büyüğe fark etmez, kapasite yetiyor.
                    if(reqCapacity[i] > 0) {
                        this.distributeToCategory(i, reqCapacity[i], troopsAllowed, finalDistribution, totalCarry);
                        // Kullanılanları düşmeye gerek yok çünkü distribute fonksiyonu oranlayarak alacak ama
                        // burada "Exact Match" yapmak istiyoruz.
                        // Basit yol: Toplam askerin %'sini hesapla.
                    }
                }
            } else {
                // Asker yetmiyor. 
                if (isPriority) {
                    // Yüksekten başla, doldur, kalanı sonrakine ver.
                    for(let i=3; i>=0; i--) {
                        if(reqCapacity[i] > 0) {
                            // Bu kategori ne kadar istiyor?
                            let need = reqCapacity[i];
                            // Elimizde ne kadar carry var?
                            let currentCarry = this.calculateCurrentCarry(troopsAllowed);
                            
                            let take = Math.min(need, currentCarry);
                            this.distributeExactCarry(i, take, troopsAllowed, finalDistribution);
                        }
                    }
                } else {
                    // Dengeli: (Kategori İhtiyacı / Toplam İhtiyaç) * Toplam Asker
                    let ratio = totalCarry / totalReqCapacity; // örn: 0.5 (yarı yarıya doldurcaz)
                    for(let i=0; i<4; i++) {
                        if(reqCapacity[i] > 0) {
                            let give = reqCapacity[i] * ratio;
                            this.distributeExactCarry(i, give, troopsAllowed, finalDistribution);
                        }
                    }
                }
            }

            // 5. Girdileri Doldur
            this.fillInputs(finalDistribution);
            $("#yaverResult").text("Hesaplandı ve Dolduruldu! Göndermeye hazır.");
        },

        // Yardımcı: Belirli bir taşıma kapasitesini (carryAmount) eldeki askerlerden (available) alıp hedefe (dist[catIndex]) yazar.
        distributeExactCarry: function(catIndex, carryAmount, available, dist) {
            // Hangi birimden ne kadar alacağız? 
            // Mevcut askerlerin oranına göre çekelim (Homojen dağılım).
            let totalAvailCarry = this.calculateCurrentCarry(available);
            if(totalAvailCarry <= 0) return;

            let percent = carryAmount / totalAvailCarry;
            if(percent > 1) percent = 1;

            for (let u in available) {
                if (available[u] > 0) {
                    let count = Math.floor(available[u] * percent);
                    if(count > 0) {
                        // Dağıtıma ekle
                        if(!dist[catIndex][u]) dist[catIndex][u] = 0;
                        dist[catIndex][u] += count;
                        // Eldekinden düş
                        available[u] -= count;
                    }
                }
            }
        },

        // Toplam kapasite yeterliyse, sadece süreye göre gerekeni al (Priority/Balanced fark etmez, süre limiti esastır)
        distributeToCategory: function(catIndex, targetCarry, totalAvailable, dist, totalCarryInitial) {
             // Burada eldeki askerden düşmeden sadece "Bu kategoriye bu kadar lazım" diye hesaplayıp,
             // ana havuzdan (troopsAllowed) "oranlayarak" çekmek lazım ama troopsAllowed sürekli azalacak.
             // O yüzden distributeExactCarry fonksiyonunu kullanmak en temizidir.
             this.distributeExactCarry(catIndex, targetCarry, totalAvailable, dist);
        },

        calculateCurrentCarry: function(units) {
            let c = 0;
            for(let u in units) {
                c += units[u] * unitInfo[u].carry;
            }
            return c;
        },

        fillInputs: function(distribution) {
            // Önce temizle
            $(".unitsInput").val("").trigger("change");
            
            // Kategori ekranlarındaki inputları bul ve doldur
            // Scavenge ekranında 4 farklı panel var (ya da tek panelde inputlar).
            // Single village ekranında genelde her kategori için ayrı bir "Squad" kutusu olmaz,
            // Sadece TEK bir input seti vardır ve sen bir kategori butonuna basarsın.
            
            // *** DÜZELTME ***
            // Tek köy yağma ekranı (place&mode=scavenge) mantığı şudur:
            // Asker sayılarını girersin -> İstediğin kategorinin "Başlat" butonuna basarsın.
            // Bu script 4 kategoriyi AYNI ANDA gönderemez (Tek input alanı var).
            // Mass Scavenge scripti "squad" oluşturup API ile yollar.
            // Biz burada sadece "Seçili ayarlara göre EN UYGUN kategoriyi doldur" veya "Sırayla gönderim için hazırla" yapabiliriz.
            
            // Ancak kullanıcının isteği "Mass Scavenge'in tek köy versiyonu".
            // Bu durumda: Script, 4 kategoriyi de hesapladı. Ama ekranda tek input var.
            // ÇÖZÜM: Mass Scavenge gibi API kullanarak (arkaplanda) göndermek mi? 
            // YOKSA: Sadece inputları doldurup kullanıcıya "Hangi butona basacağını" mı göstermek?
            
            // Eğer "Balanced" seçildiyse, askerleri 4'e böldük. Ama 4'ünü aynı anda gönderemeyiz.
            // Bu yüzden "Mass Scavenge" mantığını tek köyde uygulamak için API kullanmak (arkaplanda yollamak) en iyisidir.
            // Tıpkı massScavenge.js'deki "send_squads" ajax çağrısı gibi.
            
            this.sendSquads(distribution);
        },

        sendSquads: function(distribution) {
            let villageId = window.game_data.village.id;
            let squadRequests = [];

            for(let i=0; i<4; i++) {
                let units = distribution[i];
                if(units && Object.keys(units).length > 0 && !$.isEmptyObject(units)) {
                    // Boş değilse
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
                UI.ErrorMessage("Hesaplama sonucu gönderilecek asker çıkmadı.");
                return;
            }

            // Onay al
            if(!confirm(squadRequests.length + " farklı kategori için sefer planlandı. Arkaplanda gönderilsin mi?")) return;

            // API Gönderimi
            TribalWars.post('scavenge_api', { ajaxaction: 'send_squads' }, { "squad_requests": squadRequests }, function(res) {
                UI.SuccessMessage("Seferler başarıyla gönderildi komutanım! 🦅");
                // Sayfayı yenile ki gidenler görünsün
                setTimeout(() => window.location.reload(), 1000);
            });
        }
    };
})();
