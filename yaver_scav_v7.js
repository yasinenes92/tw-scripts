(() => {
  "use strict";

  // =========================
  // Yaver Scavenging (Single Village) - Native UI
  // Fix: applyUnitsToGame() now uses jQuery + focus/blur + native setter + triggers
  // (Does NOT auto-start. Only fills inputs and highlights the target card.)
  // =========================

  const KEY = "__YAVER_SCAV_SINGLE__";
  if (window[KEY]?.destroy) {
    try { window[KEY].destroy(); } catch (e) {}
  }

  const Y = (window[KEY] = {});
  Y.__running = true;

  // ---------- Config ----------
  const CFG = (Y.CFG = {
    PANEL_ID: "yaver_scav_single_panel",
    Z: 12000,
    // Default TW scav parameters (fallback if we can't read from game objects)
    DURATION_INITIAL_SECONDS: 1800,
    DURATION_FACTOR: 0.7722074896557402,
    DURATION_EXPONENT: 0.45,
    // Default loot factors (fallback)
    LOOT_FACTORS: { 1: 0.1, 2: 0.25, 3: 0.5, 4: 0.75 },
    // Unit carry
    UNIT_CARRY: {
      spear: 25,
      sword: 15,
      axe: 10,
      archer: 10,
      light: 80,
      marcher: 50,
      heavy: 50,
      knight: 100,
      spy: 0, // spies not used for scav
      ram: 0,
      catapult: 0,
      snob: 0,
      militia: 0
    },
    // Priority fill order (high carry first)
    SEND_ORDER: ["knight", "heavy", "marcher", "light", "spear", "sword", "axe", "archer"],
  });

  const IMG_BASE = (typeof window.image_base === "string" && window.image_base) || "https://dsen.innogamescdn.com/asset/c645ceed/graphic/";
  const ico = (path, w = 16, h = 16) =>
    `<img src="${IMG_BASE}${path}" style="width:${w}px;height:${h}px;vertical-align:-3px;margin-right:4px;">`;

  const unitMeta = {
    spear:   { label: "Spear fighter",  icon: "unit/recruit/spear.webp" },
    sword:   { label: "Swordsman",      icon: "unit/recruit/sword.webp" },
    axe:     { label: "Axeman",         icon: "unit/recruit/axe.webp" },
    archer:  { label: "Archer",         icon: "unit/recruit/archer.webp" },
    light:   { label: "Light cavalry",  icon: "unit/recruit/light.webp" },
    marcher: { label: "Mounted archer", icon: "unit/recruit/marcher.webp" },
    heavy:   { label: "Heavy cavalry",  icon: "unit/recruit/heavy.webp" },
    knight:  { label: "Paladin",        icon: "unit/recruit/knight.webp" },
  };

  // ---------- Helpers ----------
  const clamp0 = (n) => (n > 0 ? Math.floor(n) : 0);
  const nInt = (x) => parseInt(String(x ?? "").replace(/[^\d]/g, ""), 10) || 0;

  function fmtInt(n) {
    try { return (n ?? 0).toLocaleString("tr-TR"); } catch { return String(n ?? 0); }
  }
  function fmtHMS(sec) {
    sec = Math.max(0, Math.floor(sec || 0));
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    const pad = (v) => (v < 10 ? "0" + v : "" + v);
    return `${h}:${pad(m)}:${pad(s)}`;
  }

  function getTargetSecondsFromInputs() {
    const h = nInt(document.getElementById("y_scav_t_h")?.value);
    const m = nInt(document.getElementById("y_scav_t_m")?.value);
    const s = nInt(document.getElementById("y_scav_t_s")?.value);
    return Math.max(0, h * 3600 + m * 60 + s);
  }

  function setStatus(html, isError = false) {
    const el = document.getElementById("y_scav_status");
    if (!el) return;
    el.innerHTML = isError ? `<span style="color:#a00;font-weight:bold;">${html}</span>` : html;
  }

  function getGameParams() {
    // Best effort: read from live ScavengeScreen if available
    let duration_initial = CFG.DURATION_INITIAL_SECONDS;
    let duration_factor = CFG.DURATION_FACTOR;
    let duration_exponent = CFG.DURATION_EXPONENT;
    const lootFactors = { ...CFG.LOOT_FACTORS };

    try {
      const gs = window.ScavengeScreen || window.ScavengingScreen || null;
      // some builds expose option data in different shapes; we try common patterns
      const optData =
        gs?.options_data ||
        gs?.option_data ||
        gs?.options ||
        gs?.data?.options ||
        null;

      if (optData) {
        // pick first option as source for shared duration params
        const first = optData["1"] || optData[1] || Object.values(optData)[0];
        if (first) {
          duration_initial = Number(first.duration_initial_seconds ?? duration_initial) || duration_initial;
          duration_factor = Number(first.duration_factor ?? duration_factor) || duration_factor;
          duration_exponent = Number(first.duration_exponent ?? duration_exponent) || duration_exponent;
        }
        // loot factors per option
        for (const k of [1, 2, 3, 4]) {
          const o = optData[String(k)] || optData[k];
          if (o && typeof o.loot_factor !== "undefined") lootFactors[k] = Number(o.loot_factor) || lootFactors[k];
        }
      }
    } catch (e) {}

    return { duration_initial, duration_factor, duration_exponent, lootFactors };
  }

  function getCandidateUnitMaxFromGame() {
    // Reads "(123)" links in candidate squad widget
    const max = {};
    const root = document.querySelector("#scavenge_screen .candidate-squad-widget");
    if (!root) return max;

    root.querySelectorAll("a.units-entry-all[data-unit]").forEach((a) => {
      const u = a.getAttribute("data-unit");
      const t = (a.textContent || "").trim();
      max[u] = nInt(t);
    });
    return max;
  }

  function getScavOptionCards() {
    return Array.from(document.querySelectorAll("#scavenge_screen .scavenge-option"));
  }

  function detectOptionState(card) {
    const txt = (card.textContent || "").toLowerCase();
    const locked = txt.includes("unlock");
    const active = txt.includes("collecting resources") || txt.includes("return") || !!card.querySelector(".active-view");
    return { locked, active };
  }

  function highlightOptionByIndex(idx1to4) {
    const cards = getScavOptionCards();
    const card = cards[idx1to4 - 1];
    if (!card) return;

    // flash outline without altering game styles permanently
    const prev = card.style.boxShadow;
    card.style.boxShadow = "0 0 0 3px rgba(166,0,0,0.55) inset";
    card.scrollIntoView({ behavior: "smooth", block: "center" });
    setTimeout(() => { card.style.boxShadow = prev; }, 900);
  }

  // ---------- Planning (same spirit as massScavenge.js) ----------
  function computeHaulBaseFromTime(targetSec, duration_factor, duration_initial, duration_exponent) {
    // matches massScavenge inversion logic:
    // haul = sqrt( ( (time/df - init)^(1/exp) ) / 100 )
    const base = targetSec / duration_factor - duration_initial;
    if (!(base > 0)) return 0;
    const inner = Math.pow(base, 1 / duration_exponent) / 100;
    if (!(inner > 0)) return 0;
    return Math.floor(Math.sqrt(inner));
  }

  function durationFromCarry(carry, lootFactor, duration_factor, duration_initial, duration_exponent) {
    // time = df * ( init + ( (carry*lootFactor)^2 * 100 ) ^ exp )
    const h = (carry || 0) * (lootFactor || 0);
    const x = (h * h) * 100;
    const t = duration_factor * (duration_initial + Math.pow(x, duration_exponent));
    return Math.max(0, Math.floor(t));
  }

  function estLootTripletFromCarry(carry, lootFactor) {
    const total = Math.floor((carry || 0) * (lootFactor || 0));
    const w = Math.floor(total / 3);
    const s = Math.floor(total / 3);
    const i = total - w - s;
    return { wood: w, stone: s, iron: i, total };
  }

  function calculateUnitsPerCategory(troopsAllowed, haulNeedByCat, prioritiseHighCat) {
    // This is adapted from massScavenge.js calculateUnitsPerVillage, but for single village.
    const unitsReady = { 1: {}, 2: {}, 3: {}, 4: {} };

    // totalLoot = total carry available
    let totalLoot = 0;
    for (const u of Object.keys(troopsAllowed)) {
      totalLoot += (troopsAllowed[u] || 0) * (CFG.UNIT_CARRY[u] || 0);
    }

    // totalHaul = total carry needed (sum of all enabled categories)
    let totalHaul = 0;
    for (const k of [1, 2, 3, 4]) totalHaul += (haulNeedByCat[k] || 0);

    const sendOrder = CFG.SEND_ORDER.slice();

    if (totalLoot > totalHaul) {
      // Too many units -> fill to target (priority: high categories first)
      for (let cat = 4; cat >= 1; cat--) {
        let reach = haulNeedByCat[cat] || 0;
        if (reach <= 0) continue;

        for (const unit of sendOrder) {
          if (reach <= 0) break;
          if (!troopsAllowed.hasOwnProperty(unit)) continue;
          if ((troopsAllowed[unit] || 0) <= 0) continue;

          const cap = CFG.UNIT_CARRY[unit] || 0;
          if (cap <= 0) continue;

          const need = Math.floor(reach / cap);
          if (need <= 0) continue;

          if (need > troopsAllowed[unit]) {
            unitsReady[cat][unit] = (unitsReady[cat][unit] || 0) + troopsAllowed[unit];
            reach -= troopsAllowed[unit] * cap;
            troopsAllowed[unit] = 0;
          } else {
            unitsReady[cat][unit] = (unitsReady[cat][unit] || 0) + need;
            reach = 0;
            troopsAllowed[unit] -= need;
          }
        }
      }
      return unitsReady;
    }

    // Not enough units:
    // - If Balanced: proportional distribution
    // - If Priority: fill high categories first (may leave low empty)
    let troopCount = 0;
    for (const u in troopsAllowed) troopCount += (troopsAllowed[u] || 0);

    if (!prioritiseHighCat && troopCount > 0 && totalHaul > 0 && totalLoot > 0) {
      // Even balance (like massScavenge "not enough units, but even balance")
      for (let cat = 1; cat <= 4; cat++) {
        const need = haulNeedByCat[cat] || 0;
        if (need <= 0) continue;

        for (const u in troopsAllowed) {
          const part = (totalLoot / totalHaul) * need;
          const share = part * ((troopsAllowed[u] || 0) * (CFG.UNIT_CARRY[u] || 0) / totalLoot);
          // convert carry-share to unit count share
          const cap = CFG.UNIT_CARRY[u] || 0;
          if (cap <= 0) continue;
          unitsReady[cat][u] = Math.floor(share / cap);
        }
      }
      return unitsReady;
    }

    // Priority fallback
    for (let cat = 4; cat >= 1; cat--) {
      let reach = haulNeedByCat[cat] || 0;
      if (reach <= 0) continue;

      for (const unit of sendOrder) {
        if (reach <= 0) break;
        if (!troopsAllowed.hasOwnProperty(unit)) continue;
        if ((troopsAllowed[unit] || 0) <= 0) continue;

        const cap = CFG.UNIT_CARRY[unit] || 0;
        if (cap <= 0) continue;

        const need = Math.floor(reach / cap);
        if (need <= 0) continue;

        if (need > troopsAllowed[unit]) {
          unitsReady[cat][unit] = (unitsReady[cat][unit] || 0) + troopsAllowed[unit];
          reach -= troopsAllowed[unit] * cap;
          troopsAllowed[unit] = 0;
        } else {
          unitsReady[cat][unit] = (unitsReady[cat][unit] || 0) + need;
          reach = 0;
          troopsAllowed[unit] -= need;
        }
      }
    }
    return unitsReady;
  }

  function buildPlan() {
    const { duration_initial, duration_factor, duration_exponent, lootFactors } = getGameParams();
    const targetSec = getTargetSecondsFromInputs();
    if (targetSec <= 0) {
      setStatus("Süre 0 olamaz.", true);
      return [];
    }

    const unitMax = getCandidateUnitMaxFromGame();
    Y.state.unitMax = unitMax;

    // selected units (checkboxes)
    const troopSel = {};
    for (const u of Object.keys(unitMeta)) {
      const cb = document.getElementById(`y_u_${u}`);
      if (cb && cb.checked) troopSel[u] = true;
    }

    // available troops
    const troopsAllowed = {};
    for (const u of Object.keys(unitMeta)) {
      if (!troopSel[u]) continue;
      const mx = unitMax[u] || 0;
      if (mx > 0) troopsAllowed[u] = mx;
    }

    // selected categories
    const catSel = {};
    for (const cat of [1, 2, 3, 4]) {
      const cb = document.getElementById(`y_c_${cat}`);
      if (cb && cb.checked && !cb.disabled) catSel[cat] = true;
    }

    const enabledCats = [1, 2, 3, 4].filter((c) => !!catSel[c]);
    if (enabledCats.length === 0) {
      setStatus("Seçili (OK) kategori yok.", true);
      return [];
    }

    // mode: 0 balanced, 1 priority
    const modePriority = document.getElementById("y_mode_priority")?.checked === true;

    // compute base haul for target time
    const baseHaul = computeHaulBaseFromTime(targetSec, duration_factor, duration_initial, duration_exponent);

    // haul need per category (carry target)
    const haulNeedByCat = { 1: 0, 2: 0, 3: 0, 4: 0 };
    for (const cat of enabledCats) {
      const f = lootFactors[cat] ?? CFG.LOOT_FACTORS[cat];
      // carry target for this category to reach time: baseHaul / f
      haulNeedByCat[cat] = f > 0 ? Math.floor(baseHaul / f) : 0;
    }

    const unitsReady = calculateUnitsPerCategory({ ...troopsAllowed }, haulNeedByCat, modePriority);

    // Build rows (sorted by priority: if modePriority -> high to low; else low to high)
    const orderCats = modePriority ? enabledCats.slice().sort((a, b) => b - a) : enabledCats.slice().sort((a, b) => a - b);

    const rows = [];
    for (const cat of orderCats) {
      const assigned = unitsReady[cat] || {};
      // carry
      let carry = 0;
      for (const u in assigned) carry += (assigned[u] || 0) * (CFG.UNIT_CARRY[u] || 0);

      // skip empty category rows in priority mode (optional behavior)
      if (carry <= 0) continue;

      const f = lootFactors[cat] ?? CFG.LOOT_FACTORS[cat];
      const est = estLootTripletFromCarry(carry, f);
      const dur = durationFromCarry(carry, f, duration_factor, duration_initial, duration_exponent);

      rows.push({
        cat,
        name: (document.getElementById(`y_c_lbl_${cat}`)?.textContent || `Option ${cat}`).trim(),
        lootFactor: f,
        targetSec,
        estSec: dur,
        carry,
        loot: est,
        units: assigned,
      });
    }

    if (rows.length === 0) {
      setStatus("Troop yetersiz: seçili kategoriler için plan oluşturulamadı.", true);
      return [];
    }

    return rows;
  }

  function renderPlan(rows) {
    const tb = document.querySelector("#y_plan_body");
    if (!tb) return;
    tb.innerHTML = "";

    rows.forEach((r, idx) => {
      const unitsCell = Object.keys(unitMeta)
        .filter((u) => (r.units[u] || 0) > 0)
        .map((u) => `${ico(unitMeta[u].icon, 14, 14)}${r.units[u]}`)
        .join(" &nbsp; ");

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td class="nowrap">${idx + 1}</td>
        <td class="nowrap"><b>${r.name}</b></td>
        <td class="nowrap">x${r.lootFactor}</td>
        <td class="nowrap">${fmtHMS(r.targetSec)}</td>
        <td class="nowrap"><b>${fmtHMS(r.estSec)}</b></td>
        <td class="nowrap">${fmtInt(r.carry)}</td>
        <td class="nowrap">
          ${ico("holz.png",14,14)}${fmtInt(r.loot.wood)}&nbsp;
          ${ico("lehm.png",14,14)}${fmtInt(r.loot.stone)}&nbsp;
          ${ico("eisen.png",14,14)}${fmtInt(r.loot.iron)} <span style="opacity:.75;">(≈)</span>
        </td>
        <td class="nowrap">${unitsCell || "—"}</td>
        <td class="nowrap" style="text-align:center;">
          <a href="#" class="btn" data-fill-idx="${idx}" style="padding:2px 8px;">Fill</a>
        </td>
      `;
      tb.appendChild(tr);
    });

    tb.querySelectorAll("a[data-fill-idx]").forEach((a) => {
      a.addEventListener("click", (ev) => {
        ev.preventDefault();
        const i = nInt(a.getAttribute("data-fill-idx"));
        fillRow(i);
      });
    });
  }

  function getCandidateInputs() {
    const root = document.querySelector("#scavenge_screen .candidate-squad-widget");
    if (!root) return {};
    const map = {};
    root.querySelectorAll("input.unitsInput[name]").forEach((inp) => {
      const u = inp.getAttribute("name");
      map[u] = inp;
    });
    return map;
  }

  // ==========================================================
  // ✅ FIXED FUNCTION (the only behavioral change you asked for)
  // ==========================================================
  function applyUnitsToGame(unitsMap) {
    // IMPORTANT: Make the game's jQuery listeners & internal model accept the values.
    // Tactic: native setter + jQuery val + focus/blur + input/keyup/change triggers
    const inputs = getCandidateInputs();
    if (!inputs || Object.keys(inputs).length === 0) {
      setStatus("Oyun input'ları bulunamadı (scavenge ekranında mısın?).", true);
      return;
    }

    const unitMax = Y.state.unitMax || getCandidateUnitMaxFromGame();

    // native value setter helper (prevents frameworks from ignoring direct .value)
    const setNativeValue = (el, value) => {
      try {
        const proto = Object.getPrototypeOf(el);
        const desc = Object.getOwnPropertyDescriptor(proto, "value");
        const setter = desc && desc.set;
        if (setter) setter.call(el, value);
        else el.value = value;
      } catch (e) {
        el.value = value;
      }
    };

    const hasJQ = typeof window.$ === "function";

    // Clear all first (so previous partial values don't interfere)
    for (const u of Object.keys(unitMeta)) {
      const inp = inputs[u];
      if (!inp) continue;
      const $inp = hasJQ ? window.$(inp) : null;

      if ($inp) $inp.trigger("focus");
      setNativeValue(inp, "");
      if ($inp) {
        $inp.val("");
        $inp.trigger("input");
        $inp.trigger("keyup");
        $inp.trigger("change");
        $inp.trigger("blur");
      } else {
        inp.dispatchEvent(new Event("input", { bubbles: true }));
        inp.dispatchEvent(new Event("change", { bubbles: true }));
      }
    }

    // Apply planned values
    for (const u of Object.keys(unitMeta)) {
      const inp = inputs[u];
      if (!inp) continue;

      let v = clamp0(unitsMap?.[u] || 0);
      const mx = clamp0(unitMax?.[u] || 0);
      if (mx > 0) v = Math.min(v, mx);

      const str = v > 0 ? String(v) : "";
      const $inp = hasJQ ? window.$(inp) : null;

      if ($inp) {
        // Focus/Blur tactic + jQuery triggers (talks to game's listeners)
        $inp.trigger("focus");
        try { inp.select?.(); } catch (e) {}
        setNativeValue(inp, str);
        $inp.val(str);

        // The game may listen on one or more of these:
        $inp.trigger("keydown");
        $inp.trigger("keyup");
        $inp.trigger("input");
        $inp.trigger("change");
        $inp.trigger("blur");
      } else {
        // Fallback (less reliable)
        setNativeValue(inp, str);
        inp.dispatchEvent(new Event("input", { bubbles: true }));
        inp.dispatchEvent(new Event("change", { bubbles: true }));
        inp.dispatchEvent(new Event("blur", { bubbles: true }));
      }
    }

    // Force UI refresh if ScavengeScreen object exists
    setTimeout(() => {
      try {
        if (window.ScavengeScreen?.updateInputs) window.ScavengeScreen.updateInputs();
        if (window.ScavengeScreen?.updateUnits) window.ScavengeScreen.updateUnits();
      } catch (e) {}
    }, 80);
  }

  function fillRow(idx) {
    const rows = Y.state.planRows || [];
    const r = rows[idx];
    if (!r) return;

    applyUnitsToGame(r.units);
    highlightOptionByIndex(r.cat);

    Y.state.cursor = idx;
    setStatus(`Oyun arayüzüne <b>${idx + 1}. satır</b> yazıldı: <b>${r.name}</b>. Karttaki <b>Start</b> butonuna sen basacaksın.`);
  }

  function fillNext() {
    const rows = Y.state.planRows || [];
    if (!rows.length) return;
    const next = typeof Y.state.cursor === "number" ? Y.state.cursor + 1 : 0;
    if (next >= rows.length) {
      setStatus("Plan bitti. (FILL NEXT için satır kalmadı)");
      return;
    }
    fillRow(next);
  }

  function clearPlan() {
    Y.state.planRows = [];
    Y.state.cursor = -1;
    renderPlan([]);
    setStatus("Temizlendi.");
  }

  // ---------- UI ----------
  function ensurePanel() {
    let el = document.getElementById(CFG.PANEL_ID);
    if (el) return el;

    const style = document.createElement("style");
    style.innerHTML = `
      #${CFG.PANEL_ID}{
        position:fixed; left:120px; top:120px;
        width: 1020px;
        background:#f4e4bc;
        border: 3px solid #7d510f;
        z-index:${CFG.Z};
        box-shadow:0 0 15px rgba(0,0,0,.35);
        font-family: Verdana,Arial;
        font-size: 12px;
        color:#2b2b2b;
      }
      #${CFG.PANEL_ID} .hdr{
        cursor:move;
        background: #c1a264;
        padding: 6px 8px;
        border-bottom: 1px solid #7d510f;
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:10px;
        user-select:none;
      }
      #${CFG.PANEL_ID} .hdr .left{
        display:flex; align-items:center; gap:8px;
        font-weight:bold;
      }
      #${CFG.PANEL_ID} .hdr .right{
        display:flex; align-items:center; gap:10px;
      }
      #${CFG.PANEL_ID} .dev{
        font-style: italic;
        opacity:.9;
      }
      #${CFG.PANEL_ID} .closebtn{
        width:22px;height:22px; line-height:18px;
        text-align:center;
        font-weight:bold;
        border:1px solid #000;
        background:#fff;
        cursor:pointer;
      }
      #${CFG.PANEL_ID} .body{ padding:8px; background:#f4e4bc; }
      #${CFG.PANEL_ID} .row{ display:flex; align-items:center; gap:10px; flex-wrap:wrap; }
      #${CFG.PANEL_ID} .row .btn{ background:#6c4824; color:#fff; border:1px solid #333; padding:2px 10px; border-radius:3px; font-weight:bold; }
      #${CFG.PANEL_ID} .row .btn:hover{ filter:brightness(1.05); }
      #${CFG.PANEL_ID} .sectionTitle{
        margin-top:8px;
        background:#a68448;
        color:#fff;
        font-weight:bold;
        padding:4px 6px;
      }
      #${CFG.PANEL_ID} .status{
        padding:6px; background:#fff5d6; border:1px solid #e7d7b0;
        margin-top:6px;
      }
      #${CFG.PANEL_ID} table.vis{
        width:100%;
        border-collapse:collapse;
        background:#f4e4bc;
      }
      #${CFG.PANEL_ID} table.vis th{
        background:#a68448;
        color:#fff;
        padding:4px 6px;
        text-align:left;
        position:sticky;
        top:0;
        z-index:1;
      }
      #${CFG.PANEL_ID} table.vis td{
        border-bottom:1px solid #d1b57d;
        padding:4px 6px;
        background:#f4e4bc; /* prevent background bleed */
      }
      #${CFG.PANEL_ID} .nowrap{ white-space:nowrap; }
      #${CFG.PANEL_ID} input.small{
        width:70px;
        padding:2px 4px;
      }
      #${CFG.PANEL_ID} .optline{
        display:flex; align-items:center; gap:14px; flex-wrap:wrap;
        padding:6px 0;
      }
      #${CFG.PANEL_ID} .optline label{ display:flex; align-items:center; gap:6px; }
      #${CFG.PANEL_ID} .unitsline{
        display:flex; flex-wrap:wrap; gap:16px;
        padding:6px 0;
      }
      #${CFG.PANEL_ID} .unitsline label{ display:flex; align-items:center; gap:6px; }
      #${CFG.PANEL_ID} .muted{ opacity:.75; }
    `;
    document.head.appendChild(style);

    el = document.createElement("div");
    el.id = CFG.PANEL_ID;

    el.innerHTML = `
      <div class="hdr" id="y_hdr">
        <div class="left">
          ${ico("icons/scavenge.png", 16, 16)}
          <span>Yaver Scavenging (Single Village)</span>
        </div>
        <div class="right">
          <span class="dev">Developed by controleng</span>
          <div class="closebtn" id="y_close">X</div>
        </div>
      </div>

      <div class="body">
        <div class="row" style="gap:12px;">
          <span class="nowrap">${ico("icons/clock.png",16,16)} <b>Süre:</b></span>
          <span class="nowrap">Saat <input class="small" id="y_scav_t_h" value="1"></span>
          <span class="nowrap">Dk <input class="small" id="y_scav_t_m" value="0"></span>
          <span class="nowrap">Sn <input class="small" id="y_scav_t_s" value="0"></span>

          <label class="nowrap"><input type="radio" name="y_mode" id="y_mode_balanced"> <b>Balanced over all categories</b></label>
          <label class="nowrap"><input type="radio" name="y_mode" id="y_mode_priority" checked> <b>Priority on filling higher categories</b></label>

          <a href="#" class="btn" id="y_btn_plan">PLAN</a>
          <a href="#" class="btn" id="y_btn_fillnext">FILL NEXT</a>
          <a href="#" class="btn" id="y_btn_clear">CLEAR</a>
        </div>

        <div class="status" id="y_scav_status">Hazır.</div>

        <div class="sectionTitle">Asker Türleri (checkbox)</div>
        <div class="unitsline" id="y_units_box"></div>

        <div class="sectionTitle">Kategoriler (LOCKED/ACTIVE otomatik dışarıda)</div>
        <div class="optline" id="y_cats_box"></div>

        <div class="sectionTitle">Plan</div>
        <div style="max-height:260px; overflow:auto; border:1px solid #d1b57d;">
          <table class="vis">
            <thead>
              <tr>
                <th style="width:40px">#</th>
                <th>Kategori</th>
                <th style="width:70px">Loot</th>
                <th style="width:90px">${ico("icons/clock.png",14,14)} Hedef</th>
                <th style="width:90px">${ico("icons/clock.png",14,14)} Tahmini</th>
                <th style="width:80px">Carry</th>
                <th style="width:240px">${ico("holz.png",14,14)}${ico("lehm.png",14,14)}${ico("eisen.png",14,14)} Est. Loot (yaklaşık)</th>
                <th>Units</th>
                <th style="width:70px">Fill</th>
              </tr>
            </thead>
            <tbody id="y_plan_body"></tbody>
          </table>
        </div>

        <div style="margin-top:6px; opacity:.85;">
          Not: Bu script otomatik başlatmaz. “Fill” inputları doldurur ve ilgili scav kartını vurgular. Sen karttaki <b>Start</b> butonuna tıklarsın. (Güvenli kullanım)
        </div>
      </div>
    `;

    document.body.appendChild(el);

    // Close
    el.querySelector("#y_close").onclick = () => Y.destroy();

    // Buttons
    el.querySelector("#y_btn_plan").onclick = (ev) => {
      ev.preventDefault();

      // Refresh unit counts
      const unitMax = getCandidateUnitMaxFromGame();
      Y.state.unitMax = unitMax;
      // Update labels
      for (const u of Object.keys(unitMeta)) {
        const lab = document.getElementById(`y_u_lbl_${u}`);
        if (lab) lab.innerHTML = `${ico(unitMeta[u].icon, 14, 14)} <b>${unitMeta[u].label}</b> <span class="muted">(${fmtInt(unitMax[u] || 0)})</span>`;
      }

      // Plan
      const rows = buildPlan();
      Y.state.planRows = rows;
      Y.state.cursor = -1;
      renderPlan(rows);

      if (!rows.length) return;

      // As requested: PLAN also writes first row into game UI (no auto-start)
      fillRow(0);
      setStatus(`PLAN oluşturuldu. Oyun arayüzüne <b>1. satır</b> yazıldı: <b>${rows[0].name}</b>. Diğerleri için tablodan Fill veya <b>FILL NEXT</b>.`);
    };

    el.querySelector("#y_btn_fillnext").onclick = (ev) => {
      ev.preventDefault();
      fillNext();
    };

    el.querySelector("#y_btn_clear").onclick = (ev) => {
      ev.preventDefault();
      clearPlan();
    };

    // Draggable
    makeDraggable(el, el.querySelector("#y_hdr"));

    return el;
  }

  function makeDraggable(panel, handle) {
    let dragging = false;
    let startX = 0, startY = 0;
    let startLeft = 0, startTop = 0;

    const onDown = (e) => {
      // ignore if clicking on buttons/inputs inside header right
      if (e.target && (e.target.id === "y_close")) return;
      dragging = true;
      startX = e.clientX;
      startY = e.clientY;
      const r = panel.getBoundingClientRect();
      startLeft = r.left;
      startTop = r.top;
      e.preventDefault();
    };

    const onMove = (e) => {
      if (!dragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      panel.style.left = Math.max(0, startLeft + dx) + "px";
      panel.style.top = Math.max(0, startTop + dy) + "px";
    };

    const onUp = () => { dragging = false; };

    handle.addEventListener("mousedown", onDown);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  function renderUnitsAndCats() {
    // Units
    const unitBox = document.getElementById("y_units_box");
    const unitMax = getCandidateUnitMaxFromGame();
    Y.state.unitMax = unitMax;

    const unitsOrder = ["spear", "sword", "axe", "archer", "light", "marcher", "heavy"]; // like your screenshot
    unitBox.innerHTML = unitsOrder
      .map((u) => {
        const meta = unitMeta[u];
        const count = unitMax[u] || 0;
        const checked = true; // default on
        return `
          <label class="nowrap">
            <input type="checkbox" id="y_u_${u}" ${checked ? "checked" : ""}>
            <span id="y_u_lbl_${u}">${ico(meta.icon, 14, 14)} <b>${meta.label}</b> <span class="muted">(${fmtInt(count)})</span></span>
          </label>
        `;
      })
      .join("");

    // Categories
    const catsBox = document.getElementById("y_cats_box");
    const cards = getScavOptionCards();

    const defaultNames = {
      1: "Lackadaisical Looters",
      2: "Humble Haulers",
      3: "Clever Collectors",
      4: "Great Gatherers",
    };

    catsBox.innerHTML = "";
    for (let i = 1; i <= 4; i++) {
      const card = cards[i - 1];
      let state = { locked: false, active: false };
      if (card) state = detectOptionState(card);

      const label = defaultNames[i];
      const f = (getGameParams().lootFactors[i] ?? CFG.LOOT_FACTORS[i]);
      const suffix = state.locked ? " (LOCKED)" : state.active ? " (ACTIVE)" : " (OK)";
      const disabled = state.locked || state.active;

      const wrap = document.createElement("label");
      wrap.className = "nowrap";
      wrap.innerHTML = `
        <input type="checkbox" id="y_c_${i}" ${disabled ? "disabled" : "checked"}>
        <span id="y_c_lbl_${i}"><b>${label}</b> <span class="muted">(x${f})</span>${disabled ? ` <span class="muted">${suffix}</span>` : ` <span class="muted">${suffix}</span>`}</span>
      `;
      catsBox.appendChild(wrap);
    }
  }

  // ---------- State ----------
  Y.state = {
    unitMax: {},
    planRows: [],
    cursor: -1,
  };

  Y.destroy = () => {
    Y.__running = false;
    document.getElementById(CFG.PANEL_ID)?.remove();
    delete window[KEY];
  };

  // ---------- Boot ----------
  const panel = ensurePanel();
  renderUnitsAndCats();

  // If game UI isn't ready yet, refresh category/unit detection shortly
  setTimeout(() => {
    try { renderUnitsAndCats(); } catch (e) {}
  }, 600);

})();
