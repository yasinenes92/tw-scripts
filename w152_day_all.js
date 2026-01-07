/* W152 | Gündüz (3 Saat) - Mass Scav All | QuickBar External Script */
(function () {
  "use strict";

  const SETTINGS = {
    targetHours: 3,
    includeKnight: true,  // istersen false yap
    usePremium: true,
    dryRun: false
  };

  const FALLBACK = {
    loot_factors: { 1: 0.1, 2: 0.25, 3: 0.5, 4: 0.75 },
    duration_exponent: 0.45,
    duration_initial_seconds: 1800,
    duration_factor: 0.7722074896557402,
    unitCarry: { spear:25, sword:15, axe:10, archer:10, light:80, marcher:50, heavy:50, knight:100 }
  };

  function ensureMassPage() {
    const p = new URLSearchParams(location.search);
    const ok = (p.get("screen") === "place" && p.get("mode") === "scavenge_mass");
    if (ok) return true;
    const url = game_data.link_base_pure + "screen=place&mode=scavenge_mass";
    UI?.InfoMessage?.("Mass Scavenging sayfasına gidiliyor... Sayfa açılınca scripti tekrar çalıştır.");
    location.assign(url);
    return false;
  }

  function getWorldConfig() {
    const sms = window.ScavengeMassScreen;
    const opt1 = sms?.options?.[1] || sms?.options?.["1"] || null;

    const loot_factors = {
      1: Number((sms?.options?.[1] || sms?.options?.["1"])?.loot_factor) || FALLBACK.loot_factors[1],
      2: Number((sms?.options?.[2] || sms?.options?.["2"])?.loot_factor) || FALLBACK.loot_factors[2],
      3: Number((sms?.options?.[3] || sms?.options?.["3"])?.loot_factor) || FALLBACK.loot_factors[3],
      4: Number((sms?.options?.[4] || sms?.options?.["4"])?.loot_factor) || FALLBACK.loot_factors[4]
    };

    const duration_exponent = Number(opt1?.duration_exponent) || FALLBACK.duration_exponent;
    const duration_initial_seconds = Number(opt1?.duration_initial_seconds) || FALLBACK.duration_initial_seconds;
    const duration_factor = Number(opt1?.duration_factor) || FALLBACK.duration_factor;

    const unitCarry = { ...FALLBACK.unitCarry };
    const units = sms?.units || sms?.unit_data || null;
    if (units && typeof units === "object") {
      for (const k of Object.keys(unitCarry)) {
        const v = Number(units?.[k]?.carry);
        if (Number.isFinite(v) && v > 0) unitCarry[k] = v;
      }
    }
    return { loot_factors, duration_exponent, duration_initial_seconds, duration_factor, unitCarry };
  }

  function capacityForTarget(seconds, lootFactor, cfg) {
    const t1 = (seconds / cfg.duration_factor) - cfg.duration_initial_seconds;
    if (t1 <= 0) return 0;
    const t2 = Math.pow(t1, 1 / cfg.duration_exponent);
    return Math.floor(Math.sqrt(t2 / 100) / lootFactor);
  }

  function planAndSend() {
    if (!window.ScavengeMassScreen || !ScavengeMassScreen.village_data) {
      UI?.ErrorMessage?.("ScavengeMassScreen verisi bulunamadı. Sayfayı yenileyip tekrar dene.");
      return;
    }

    const cfg = getWorldConfig();
    const targetSec = SETTINGS.targetHours * 3600;
    const villages = ScavengeMassScreen.village_data;

    let unitOrder = ["knight", "light", "marcher", "heavy", "spear", "sword", "axe", "archer"];
    if (!SETTINGS.includeKnight) unitOrder = unitOrder.filter(u => u !== "knight");
    unitOrder = unitOrder.filter(u => cfg.unitCarry[u] > 0);

    const squadRequests = [];
    console.log(`=== W152 MASS SCAV | ${SETTINGS.targetHours}h | MODE=ALL | knight=${SETTINGS.includeKnight} ===`);

    for (const vid in villages) {
      const v = villages[vid];
      const home = { ...(v.unit_counts_home || {}) };
      const carryMult = Number(v.unit_carry_factor || 1) || 1;

      for (let optionId = 4; optionId >= 1; optionId--) {
        const optState = v.options?.[optionId];
        if (!optState) continue;
        if (optState.is_locked) continue;
        if (optState.scavenging_squad) continue;

        const lootFactor = cfg.loot_factors[optionId];
        const capLimit = capacityForTarget(targetSec, lootFactor, cfg);
        if (capLimit <= 0) continue;

        let capUsed = 0;
        const sendUnits = {};

        for (const u of unitOrder) {
          const have = Number(home[u] || 0);
          if (have <= 0) continue;

          const per = cfg.unitCarry[u] * carryMult;
          const remaining = capLimit - capUsed;
          if (remaining <= 0) break;

          const maxTake = Math.floor((remaining + 1e-9) / per);
          const take = Math.min(have, maxTake);

          if (take > 0) {
            sendUnits[u] = take;
            home[u] = have - take;
            capUsed += take * per;
          }
        }

        const carry_max = Math.floor(capUsed);
        if (carry_max <= 0) continue;

        squadRequests.push({
          village_id: v.village_id,
          option_id: optionId,
          use_premium: !!SETTINGS.usePremium,
          candidate_squad: { unit_counts: sendUnits, carry_max }
        });

        console.log(`[${v.village_id}] opt${optionId} carry_max=${carry_max}`, sendUnits);
      }
    }

    if (!squadRequests.length) {
      UI?.ErrorMessage?.("Gönderilecek uygun asker / boş seçenek yok.");
      return;
    }

    if (SETTINGS.dryRun) {
      UI?.InfoMessage?.(`DRY RUN: ${squadRequests.length} squad planlandı (gönderilmedi).`);
      return;
    }

    TribalWars.post(
      "scavenge_api",
      { ajaxaction: "send_squads" },
      { squad_requests: JSON.stringify(squadRequests) },
      function () {
        UI?.SuccessMessage?.(`☀️ 3 Saat (ALL) seferleri başlatıldı! (${squadRequests.length})`);
        setTimeout(() => location.reload(), 1200);
      }
    );
  }

  if (!window.game_data) return;
  if (!ensureMassPage()) return;
  planAndSend();
})();
