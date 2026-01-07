/* W152 | Uyku (8 Saat) - Mass Scav ALL | Scraper Mode */
(function () {
  "use strict";
  const SETTINGS = { targetHours: 8, mode: "all", includeKnight: true, usePremium: true };

  function ensureMassPage() {
    if (window.location.href.indexOf("screen=place&mode=scavenge_mass") === -1) {
      UI.InfoMessage("Mass Scavenging sayfasına gidiliyor...");
      window.location.assign(game_data.link_base_pure + "place&mode=scavenge_mass");
      return false;
    }
    return true;
  }

  function scrapeData() {
    const scripts = document.getElementsByTagName("script");
    for (let i = 0; i < scripts.length; i++) {
      const content = scripts[i].innerHTML;
      if (content && content.indexOf("new ScavengeMassScreen") > -1) {
        try {
          const match = content.match(/new ScavengeMassScreen\(\s*([\s\S]*?)\s*\);/);
          if (match && match[1]) {
            const args = new Function("return [" + match[1] + "];")();
            return { options: args[0], units: args[1], villages: args[3] };
          }
        } catch (e) { console.error(e); }
      }
    }
    return null;
  }

  function planAndSend() {
    const data = scrapeData();
    if (!data) { UI.ErrorMessage("Veri okunamadı!"); return; }

    const opt1 = data.options["1"] || data.options[1];
    const config = {
      loot_factors: {
        1: Number((data.options["1"]||data.options[1])?.loot_factor) || 0.1,
        2: Number((data.options["2"]||data.options[2])?.loot_factor) || 0.25,
        3: Number((data.options["3"]||data.options[3])?.loot_factor) || 0.5,
        4: Number((data.options["4"]||data.options[4])?.loot_factor) || 0.75
      },
      duration_exponent: Number(opt1.duration_exponent),
      duration_initial_seconds: Number(opt1.duration_initial_seconds),
      duration_factor: Number(opt1.duration_factor),
      unitCarry: {}
    };

    for (const k in data.units) config.unitCarry[k] = Number(data.units[k].carry);

    function getCap(sec, loot) {
      const t1 = (sec / config.duration_factor) - config.duration_initial_seconds;
      if (t1 <= 0) return 0;
      const t2 = Math.pow(t1, 1 / config.duration_exponent);
      return Math.floor(Math.sqrt(t2 / 100) / loot);
    }

    const targetSec = SETTINGS.targetHours * 3600;
    let unitOrder = ["knight", "light", "marcher", "heavy", "spear", "sword", "axe", "archer"];
    if (!SETTINGS.includeKnight) unitOrder = unitOrder.filter(u => u !== "knight");
    unitOrder = unitOrder.filter(u => config.unitCarry[u] > 0);

    const squadRequests = [];
    
    for (const v of data.villages) {
      const home = { ...(v.unit_counts_home || {}) };
      const carryMult = Number(v.unit_carry_factor || 1) || 1;

      for (let optionId = 4; optionId >= 1; optionId--) {
        let optState = v.options[optionId];
        if (!optState || optState.is_locked || optState.scavenging_squad) continue;

        const lootFactor = config.loot_factors[optionId];
        const capLimit = getCap(targetSec, lootFactor);
        let capUsed = 0;
        const sendUnits = {};

        for (const u of unitOrder) {
          const have = Number(home[u] || 0);
          const per = config.unitCarry[u] * carryMult;
          if (have > 0 && per > 0) {
            const remaining = capLimit - capUsed;
            if (remaining <= 0) break;
            const take = Math.min(have, Math.floor((remaining + 1e-9) / per));
            if (take > 0) {
              sendUnits[u] = take;
              home[u] -= take;
              capUsed += take * per;
            }
          }
        }

        if (capUsed > 0) {
          squadRequests.push({
            village_id: v.village_id,
            option_id: optionId,
            use_premium: SETTINGS.usePremium,
            candidate_squad: { unit_counts: sendUnits, carry_max: Math.floor(capUsed) }
          });
        }
      }
    }

    if (squadRequests.length === 0) { UI.ErrorMessage("Gönderilecek uygun asker yok."); return; }

    TribalWars.post('scavenge_api', { ajaxaction: 'send_squads' }, { squad_requests: JSON.stringify(squadRequests) }, function() {
      UI.SuccessMessage(`🌙 8 Saat (ALL) - ${squadRequests.length} Sefer Başlatıldı!`);
      setTimeout(() => location.reload(), 1500);
    });
  }

  if (ensureMassPage()) planAndSend();
})();
