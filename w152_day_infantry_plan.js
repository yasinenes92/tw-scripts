/* Gündüz Modu (3 Saat) - Mass Scav Infantry (Paladin/knight HARİÇ) | PLAN + SEN TIKLAYINCA BAŞLAT */
(function () {
  'use strict';

  var SETTINGS = {
    targetHours: 3,
    usePremium: true,
    allowedUnits: { spear: 1, sword: 1, axe: 1, archer: 1, light: 0, marcher: 0, heavy: 0, knight: 0 }
  };

  var DEFAULTS = {
    loot_factors: { 1: 0.1, 2: 0.25, 3: 0.5, 4: 0.75 },
    duration_exponent: 0.45,
    duration_initial_seconds: 1800,
    duration_factor: 0.7722074896557402,
    unitCarry: { spear: 25, sword: 15, axe: 10, archer: 10, light: 80, marcher: 50, heavy: 50, knight: 100 }
  };

  function isMassPage() {
    return String(location.search || '').indexOf('screen=place') > -1 && String(location.search || '').indexOf('mode=scavenge_mass') > -1;
  }
  function goMassPage() {
    if (window.UI && UI.InfoMessage) UI.InfoMessage('Mass Scavenging sayfasına gidin, sonra scripti tekrar çalıştırın.');
    location.assign(game_data.link_base_pure + 'place&mode=scavenge_mass');
  }
  function safeNum(x) { var n = Number(x); return isFinite(n) ? n : null; }

  // VERİYİ SAYFA KAYNAĞINDAN ÇEKEN YENİ FONKSİYON
  function findCtorArgs() {
    var scripts = document.getElementsByTagName('script');
    for (var i = 0; i < scripts.length; i++) {
      var t = scripts[i].textContent || scripts[i].innerHTML;
      if (!t || t.indexOf('new ScavengeMassScreen') === -1) continue;
      // Regex ile parantez içindeki argümanları yakala
      var m = t.match(/new\s+ScavengeMassScreen\(\s*([\s\S]*?)\s*\)\s*;/);
      if (m && m[1]) { 
          try { 
              // String halindeki veriyi gerçek objeye çevir
              return new Function('return [' + m[1] + '];')(); 
          } catch (e) { console.error("Veri parse hatası:", e); } 
      }
    }
    return null;
  }

  function extractWorldConfig() {
    var cfg = {
      loot_factors: { 1: DEFAULTS.loot_factors[1], 2: DEFAULTS.loot_factors[2], 3: DEFAULTS.loot_factors[3], 4: DEFAULTS.loot_factors[4] },
      duration_exponent: DEFAULTS.duration_exponent,
      duration_initial_seconds: DEFAULTS.duration_initial_seconds,
      duration_factor: DEFAULTS.duration_factor,
      unitCarry: JSON.parse(JSON.stringify(DEFAULTS.unitCarry))
    };
    var args = findCtorArgs(); // Veriyi kaynaktan çek
    if (args && args.length >= 2) {
      var options = args[0], units = args[1];
      for (var id = 1; id <= 4; id++) {
        var o = options[id] || options[String(id)];
        if (o) {
          var lf = safeNum(o.loot_factor); if (lf != null) cfg.loot_factors[id] = lf;
          var df = safeNum(o.duration_factor); if (df != null) cfg.duration_factor = df;
          var de = safeNum(o.duration_exponent); if (de != null) cfg.duration_exponent = de;
          var dis = safeNum(o.duration_initial_seconds); if (dis != null) cfg.duration_initial_seconds = dis;
        }
      }
      var unitList = ['spear', 'sword', 'axe', 'archer', 'light', 'marcher', 'heavy', 'knight'];
      for (var ui = 0; ui < unitList.length; ui++) {
        var u = unitList[ui];
        if (units && units[u] && safeNum(units[u].carry) != null) cfg.unitCarry[u] = safeNum(units[u].carry);
      }
    }
    return cfg;
  }

  function getVillageOption(v, optionId) {
    if (!v || !v.options) return null;
    if (v.options[optionId]) return v.options[optionId];
    if (v.options[String(optionId)]) return v.options[String(optionId)];
    if (Array.isArray(v.options)) {
      for (var i = 0; i < v.options.length; i++) {
        var o = v.options[i];
        if (Number(o && (o.id || o.option_id || o.optionId)) === optionId) return o;
      }
    }
    return null;
  }
  function isLocked(opt) { return !!(opt && (opt.is_locked || opt.locked || opt.isLocked)); }
  function isActive(opt) { return !!(opt && (opt.scavenging_squad || opt.scavengingSquad || opt.active || opt.is_active)); }

  function maxCarryForSeconds(seconds, lootFactor, cfg) {
    var DF = cfg.duration_factor, DIS = cfg.duration_initial_seconds, DE = cfg.duration_exponent;
    var sec = Math.max(0, Math.floor(seconds) - 1);
    var t1 = (sec / DF) - DIS;
    if (t1 <= 0) return 0;
    var t2 = Math.pow(t1, 1 / DE);
    return Math.max(0, Math.floor(Math.sqrt(t2 / 100) / lootFactor));
  }

  function buildPlan(cfg) {
    // BURASI DEĞİŞTİ: Artık global değişkene muhtaç değiliz
    var villagesObj = null;

    // 1. Önce globali dene (eski usul)
    if (window.ScavengeMassScreen && ScavengeMassScreen.village_data) {
        villagesObj = ScavengeMassScreen.village_data;
    } 
    // 2. Yoksa, kaynak koddan çektiğimiz veriyi kullan (YENİ YÖNTEM)
    else {
        var args = findCtorArgs();
        if(args && args[3]) { // 3. argüman genellikle village verisidir
            var villageList = args[3];
            villagesObj = {};
            // Listeyi objeye çevir (ID bazlı)
            for(var i=0; i<villageList.length; i++) {
                villagesObj[villageList[i].village_id] = villageList[i];
            }
        }
    }

    if (!villagesObj) return { ok: false, error: 'Köy verileri okunamadı! (Regex başarısız)' };

    var targetSec = SETTINGS.targetHours * 3600;
    var squadRequests = [];
    var summaryLines = [];

    for (var vid in villagesObj) {
      if (!Object.prototype.hasOwnProperty.call(villagesObj, vid)) continue;
      var v = villagesObj[vid];
      var home = v.unit_counts_home ? JSON.parse(JSON.stringify(v.unit_counts_home)) : {};
      var carryFactor = Number(v.unit_carry_factor || 1) || 1;

      var villageAny = false;
      var villageLine = '[' + v.village_id + '] ' + (v.name || '') + ' (' + (v.x || '?') + '|' + (v.y || '?') + ')';

      for (var optionId = 4; optionId >= 1; optionId--) {
        var opt = getVillageOption(v, optionId);
        if (!opt || isLocked(opt) || isActive(opt)) continue;

        var lf = cfg.loot_factors[optionId];
        var effCap = maxCarryForSeconds(targetSec, lf, cfg);
        var baseCap = Math.floor((effCap - 1e-6) / carryFactor);
        if (baseCap <= 0) continue;

        var used = 0;
        var send = {};
        var order = ['spear', 'sword', 'axe', 'archer'];

        for (var oi = 0; oi < order.length; oi++) {
          var u = order[oi];
          if (!SETTINGS.allowedUnits[u]) continue;

          var have = Number(home[u] || 0);
          var per = Number(cfg.unitCarry[u] || 0);
          if (have <= 0 || per <= 0) continue;

          var remaining = baseCap - used;
          if (remaining <= 0) break;

          var take = Math.floor((remaining + 1e-9) / per);
          if (take > have) take = have;

          if (take > 0) {
            send[u] = take;
            home[u] = have - take;
            used += take * per;
          }
        }

        if (used > 0) {
          villageAny = true;
          squadRequests.push({
            village_id: v.village_id,
            option_id: optionId,
            use_premium: SETTINGS.usePremium,
            candidate_squad: { unit_counts: send, carry_max: used }
          });
        }
      }

      if (villageAny) summaryLines.push(villageLine);
    }

    return { ok: true, squadRequests: squadRequests, summaryLines: summaryLines, cfg: cfg };
  }

  function getCSRFToken() {
    if (window.game_data) { if (game_data.csrf) return game_data.csrf; if (game_data.csrf_token) return game_data.csrf_token; }
    if (window.csrf_token) return window.csrf_token;
    var inp = document.querySelector('input[name="h"]');
    if (inp && inp.value) return inp.value;
    return null;
  }

  function buildUrl(screen, params) {
    params = params || {};
    var h = getCSRFToken();
    if (h && !params.h) params.h = h;
    if (window.TribalWars && typeof TribalWars.buildURL === 'function') return TribalWars.buildURL(screen, params);

    var q = [];
    for (var k in params) if (Object.prototype.hasOwnProperty.call(params, k)) q.push(encodeURIComponent(k) + '=' + encodeURIComponent(params[k]));
    return game_data.link_base_pure + screen + (q.length ? ('&' + q.join('&')) : '');
  }

  function postSendSquads(squadRequests, onOk, onFail) {
    var url = buildUrl('scavenge_api', { ajaxaction: 'send_squads' });
    jQuery.ajax({ url: url, type: 'POST', dataType: 'json', data: { squad_requests: JSON.stringify(squadRequests) } })
      .done(onOk)
      .fail(function (xhr) {
        jQuery.ajax({ url: url, type: 'POST', dataType: 'json', data: { squad_requests: squadRequests } })
          .done(onOk)
          .fail(function (xhr2) {
            onFail((xhr2 && (xhr2.responseText || xhr2.statusText)) || (xhr && (xhr.responseText || xhr.statusText)) || 'POST failed');
          });
      });
  }

  function removeBox() {
    var old = document.getElementById('yaver_scav_box');
    if (old && old.parentNode) old.parentNode.removeChild(old);
  }

  function renderBox(plan) {
    removeBox();

    var box = document.createElement('div');
    box.id = 'yaver_scav_box';
    box.style.position = 'fixed';
    box.style.right = '12px';
    box.style.top = '70px';
    box.style.zIndex = 99999;
    box.style.width = '360px';
    box.style.maxHeight = '60vh';
    box.style.overflow = 'auto';
    box.style.background = 'rgba(0,0,0,0.85)';
    box.style.color = '#fff';
    box.style.padding = '10px';
    box.style.borderRadius = '10px';
    box.style.fontSize = '12px';
    box.style.boxShadow = '0 8px 30px rgba(0,0,0,0.35)';

    var title = document.createElement('div');
    title.style.fontWeight = '700';
    title.style.marginBottom = '8px';
    title.textContent = '☀️ 3 Saat | Infantry | PLAN HAZIR';
    box.appendChild(title);

    var meta = document.createElement('div');
    meta.style.opacity = '0.9';
    meta.style.marginBottom = '8px';
    meta.textContent = 'Planlanan sefer: ' + plan.squadRequests.length + ' (4→1 öncelik, paladin yok)';
    box.appendChild(meta);

    var pre = document.createElement('pre');
    pre.style.whiteSpace = 'pre-wrap';
    pre.style.margin = '0 0 10px 0';
    pre.textContent = plan.summaryLines.length ? ('Köyler:\n- ' + plan.summaryLines.join('\n- ')) : 'Uygun köy bulunamadı.';
    box.appendChild(pre);

    var btnRow = document.createElement('div');
    btnRow.style.display = 'flex';
    btnRow.style.gap = '8px';

    var btnStart = document.createElement('button');
    btnStart.textContent = '▶️ BAŞLAT (Ben Tıklıyorum)';
    btnStart.style.flex = '1';
    btnStart.style.cursor = 'pointer';

    var btnClose = document.createElement('button');
    btnClose.textContent = 'Kapat';
    btnClose.style.width = '90px';
    btnClose.style.cursor = 'pointer';

    btnRow.appendChild(btnStart);
    btnRow.appendChild(btnClose);
    box.appendChild(btnRow);

    btnClose.onclick = function () { removeBox(); };

    btnStart.onclick = function () {
      btnStart.disabled = true;
      btnStart.textContent = 'Gönderiliyor...';
      postSendSquads(plan.squadRequests, function () {
        if (window.UI && UI.SuccessMessage) UI.SuccessMessage('✅ Seferler başlatıldı!');
        setTimeout(function () { location.reload(); }, 1200);
      }, function (err) {
        if (window.UI && UI.ErrorMessage) UI.ErrorMessage('❌ Gönderim hatası (console’a bak): ' + String(err).slice(0, 120));
        try { console.error('[YAVER] send error:', err); console.log('[YAVER] squadRequests:', plan.squadRequests); } catch (e) {}
        btnStart.disabled = false;
        btnStart.textContent = '▶️ BAŞLAT (Ben Tıklıyorum)';
      });
    };

    document.body.appendChild(box);
  }

  if (!isMassPage()) { goMassPage(); return; }

  var cfg = extractWorldConfig();
  var plan = buildPlan(cfg);

  if (!plan.ok) { if (window.UI && UI.ErrorMessage) UI.ErrorMessage(plan.error || 'Plan oluşturulamadı.'); return; }
  if (!plan.squadRequests.length) { if (window.UI && UI.ErrorMessage) UI.ErrorMessage('Gönderilecek uygun piyade/seçenek yok.'); return; }

  renderBox(plan);
})();
