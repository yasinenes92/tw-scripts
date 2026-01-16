(async () => {
  const KEY = "__YAVER_SCAV_SINGLE__";
  if (window[KEY]?.destroy) { try { window[KEY].destroy(); } catch(e){} }

  const Y = (window[KEY] = {});
  Y.__running = true;

  // ========= helpers =========
  const clamp0 = (n) => (n > 0 ? n : 0);

  const fmtHMS = (sec) => {
    sec = Math.max(0, Math.floor(sec || 0));
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    if (h) return `${h}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
    return `${m}:${String(s).padStart(2,"0")}`;
  };

  function msg(html, kind="info") {
    const el = document.getElementById("yss_msg");
    if (!el) return;
    el.className = (kind === "ok" ? "success_box" : (kind === "err" ? "error_box" : "info_box"));
    el.innerHTML = `<div class="content">${html}</div>`;
  }

  function waitFor(fn, ms=10000) {
    const t0 = Date.now();
    return new Promise((resolve, reject) => {
      const tick = () => {
        try { if (fn()) return resolve(true); } catch(_) {}
        if (Date.now() - t0 > ms) return reject(new Error("Timeout"));
        setTimeout(tick, 100);
      };
      tick();
    });
  }

  const IMG_BASE = (window.image_base || "https://dsen.innogamescdn.com/asset/c645ceed/graphic/");
  const UNIT_ICON = (u) => `${IMG_BASE}unit/unit_${u}.png`;

  // ========= guards =========
  if (!/screen=place/.test(location.href) || !/mode=scavenge/.test(location.href)) {
    location.href = (window.game_data?.link_base_pure || "/game.php?") + "place&mode=scavenge";
    return;
  }

  await waitFor(() => window.ScavengeScreen && window.ScavengeScreen.village && window.ScavengeScreen.village.options, 15000)
    .catch(() => { throw new Error("ScavengeScreen yüklenmedi. Sayfayı yenileyip (F5) tekrar dene."); });

  const sc = window.ScavengeScreen;
  const village = sc.village;

  // ========= unit name/carry lookup =========
  function getUnitObj(unit){
    return sc?.units?.[unit] || sc?.unit_info?.[unit] || sc?.unitData?.[unit] || null;
  }
  function getUnitName(unit) {
    const u = getUnitObj(unit);
    return u?.name || ({
      spear:"Spear fighter",
      sword:"Swordsman",
      axe:"Axeman",
      archer:"Archer",
      light:"Light cavalry",
      marcher:"Mounted archer",
      heavy:"Heavy cavalry",
    }[unit] || unit);
  }
  function getCarry(unit) {
    const u = getUnitObj(unit);
    const c = u?.carry;
    if (typeof c === "number") return c;
    const fallback = { spear:25, sword:15, axe:10, archer:10, light:80, marcher:50, heavy:50 };
    return fallback[unit] || 0;
  }
  function getUnitCount(unit) {
    const el = document.querySelector(`.units-entry-all[data-unit="${unit}"]`);
    if (!el) return 0;
    const m = el.textContent.match(/\((\d+)\)/);
    return m ? parseInt(m[1], 10) : 0;
  }

  // ========= options =========
  function listOptions() {
    const opts = [];
    const o = village.options || {};
    Object.keys(o).forEach(k => {
      const opt = o[k];
      const base = opt?.base || {};
      opts.push({
        id: parseInt(k, 10),
        base_id: opt.base_id ?? parseInt(k, 10),
        name: base.name || `Option ${k}`,
        loot_factor: parseFloat(base.loot_factor || 0),
        duration_factor: parseFloat(base.duration_factor || 0),
        duration_exponent: parseFloat(base.duration_exponent || 0),
        duration_initial_seconds: parseFloat(base.duration_initial_seconds || 0),
        is_locked: !!opt.is_locked,
        scavenging_squad: opt.scavenging_squad || null,
      });
    });
    return opts.sort((a,b)=>a.id-b.id);
  }

  function findOptionCard(baseId) {
    const cards = Array.from(document.querySelectorAll(".scavenge-option"));
    return cards.find(card => {
      const bg = card.querySelector(".portrait")?.style?.backgroundImage || "";
      return bg.includes(`/options/${baseId}.`) || bg.includes(`/options/${baseId}.png`) || bg.includes(`/options/${baseId}.webp`);
    }) || null;
  }

  // ========= math: time <-> carry =========
  function calcHaulFromTime(timeSec, opt) {
    const df = opt.duration_factor || 1;
    const de = opt.duration_exponent || 0.45;
    const di = opt.duration_initial_seconds || 1800;
    const inner = (timeSec / df) - di;
    if (inner <= 0) return 0;
    const a = Math.pow(inner, 1 / de) / 100;
    if (a <= 0) return 0;
    return Math.sqrt(a);
  }

  function calcTimeFromCarry(carry, opt) {
    const haul = (carry || 0) * (opt.loot_factor || 0);
    const df = opt.duration_factor || 1;
    const de = opt.duration_exponent || 0.45;
    const di = opt.duration_initial_seconds || 1800;
    const x = Math.pow(100 * haul * haul, de);
    return Math.max(0, Math.round(df * (di + x)));
  }

  // ========= UI =========
  const PANEL_ID = "yss_panel_native_v3";
  const STYLE_ID = "yss_style_native_v3";

  function ensureUI() {
    if (document.getElementById(PANEL_ID)) return;

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      #${PANEL_ID}{
        position: fixed;
        left: 20px;
        top: 70px;
        width: 980px;
        z-index: 99999;
        max-height: 85vh;
        overflow: auto;

        background: #f4e4bc;  /* MAT */
        border: 2px solid #7d510f;
        border-radius: 6px;
        padding: 6px;
      }
      #${PANEL_ID} * { box-sizing: border-box; }
      #${PANEL_ID} table.vis{ margin:0; background: #f4e4bc; } /* tablo arası oyun görünmesin */
      #${PANEL_ID} td, #${PANEL_ID} th { background: transparent; }
      #${PANEL_ID} .yss_gap{ height:6px; background:#f4e4bc; }
      #${PANEL_ID} .yss_hl{
        outline: 3px solid #ffb400 !important;
        box-shadow: 0 0 0 4px rgba(255,180,0,.25) !important;
      }
      #${PANEL_ID} .yss_hdr{
        display:flex; align-items:center; justify-content:space-between;
        cursor: move; user-select:none;
      }
      #${PANEL_ID} .yss_hdr_right{ display:flex; gap:6px; align-items:center; }
      #${PANEL_ID} .yss_dev{ opacity:.85; font-style: italic; white-space:nowrap; }
      #${PANEL_ID} .yss_toolbar{ display:flex; gap:8px; align-items:center; flex-wrap:wrap; }
      #${PANEL_ID} .yss_small{ font-size: 11px; opacity:.9; }
      #${PANEL_ID} .yss_tablewrap{ max-height: 280px; overflow:auto; }
      #${PANEL_ID} input[type="number"]{ width: 60px; }
      #${PANEL_ID} .yss_unitlbl img{ width:18px;height:18px; vertical-align:-4px; margin-right:4px; }
      #${PANEL_ID} .yss_units_html img{ width:14px;height:14px; vertical-align:-3px; margin-right:2px; }
      #${PANEL_ID} .yss_timebox{ display:flex; gap:6px; align-items:center; }
      #${PANEL_ID} .yss_timebox label{ display:flex; gap:4px; align-items:center; white-space:nowrap; }
      #${PANEL_ID} .yss_timebox input{ width:64px; }
    `;
    document.head.appendChild(style);

    const el = document.createElement("div");
    el.id = PANEL_ID;

    el.innerHTML = `
      <table class="vis" style="width:100%;">
        <tr>
          <th style="text-align:left;">
            <div class="yss_hdr" id="yss_drag">
              <div>
                <span class="icon header place"></span>
                Yaver Scavenging (Single Village)
              </div>
              <div class="yss_hdr_right">
                <span class="yss_dev">Developed by controleng</span>
                <input type="button" class="btn" id="yss_close" value="X">
              </div>
            </div>
          </th>
        </tr>
        <tr>
          <td>
            <div class="yss_toolbar">
              <span class="icon header time"></span>
              <b>Süre:</b>
              <span class="yss_timebox">
                <label>Saat <input id="yss_h" type="number" step="1" min="0"></label>
                <label>Dk <input id="yss_m" type="number" step="1" min="0" max="59"></label>
                <label>Sn <input id="yss_s" type="number" step="1" min="0" max="59"></label>
              </span>

              <span style="margin-left:10px;">
                <label style="white-space:nowrap;">
                  <input id="yss_mode_bal" type="radio" name="yss_mode" value="balanced">
                  <b>Balanced over all categories</b>
                </label>
              </span>

              <span style="margin-left:10px;">
                <label style="white-space:nowrap;">
                  <input id="yss_mode_prio" type="radio" name="yss_mode" value="priority">
                  <b>Priority on filling higher categories</b>
                </label>
              </span>

              <input type="button" class="btn" id="yss_plan" value="PLAN">
              <input type="button" class="btn" id="yss_fill_next" value="FILL NEXT">
              <input type="button" class="btn" id="yss_clear" value="CLEAR">
            </div>

            <div id="yss_msg" class="info_box" style="margin-top:8px;">
              <div class="content">Hazır. Süre/Unit/Kategori seç → <b>PLAN</b>. (PLAN sonrası 1. satır otomatik oyuna yazılır.)</div>
            </div>
          </td>
        </tr>
      </table>

      <div class="yss_gap"></div>

      <table class="vis" style="width:100%;">
        <tr><th style="text-align:left;">Asker Türleri (checkbox)</th></tr>
        <tr><td id="yss_units"></td></tr>
      </table>

      <div class="yss_gap"></div>

      <table class="vis" style="width:100%;">
        <tr><th style="text-align:left;">Kategoriler (LOCKED/ACTIVE otomatik dışarıda)</th></tr>
        <tr><td id="yss_opts"></td></tr>
      </table>

      <div class="yss_gap"></div>

      <table class="vis" style="width:100%;">
        <tr><th style="text-align:left;">Plan</th></tr>
        <tr>
          <td>
            <div class="yss_tablewrap">
              <table class="vis" style="width:100%;">
                <tr>
                  <th>#</th>
                  <th style="text-align:left;">Kategori</th>
                  <th>Loot</th>
                  <th><span class="icon header time"></span> Hedef</th>
                  <th><span class="icon header time"></span> Tahmini</th>
                  <th>Carry</th>
                  <th style="text-align:left;">
                    <span class="icon header wood"></span>
                    <span class="icon header stone"></span>
                    <span class="icon header iron"></span>
                    Est. Loot (yaklaşık)
                  </th>
                  <th style="text-align:left;">Units</th>
                  <th>Fill</th>
                </tr>
                <tbody id="yss_plan_tbody"></tbody>
              </table>
            </div>
            <div class="yss_small" style="margin-top:6px;">
              Not: Bu script <b>otomatik başlatmaz</b>. “Fill” inputları doldurur ve ilgili scav kartını vurgular.
              Sen karttaki <b>Start</b> butonuna tıklarsın. (Güvenli kullanım)
            </div>
          </td>
        </tr>
      </table>
    `;

    document.body.appendChild(el);

    // restore settings
    const saved = JSON.parse(localStorage.getItem("YSS_CFG") || "{}");
    const t = saved.time || { h: 1, m: 0, s: 0 };
    el.querySelector("#yss_h").value = (t.h ?? 1);
    el.querySelector("#yss_m").value = (t.m ?? 0);
    el.querySelector("#yss_s").value = (t.s ?? 0);

    const mode = saved.mode || "priority";
    el.querySelector("#yss_mode_bal").checked = (mode === "balanced");
    el.querySelector("#yss_mode_prio").checked = (mode === "priority");

    el.querySelector("#yss_close").onclick = () => Y.destroy();
    el.querySelector("#yss_plan").onclick = () => buildPlan(true);
    el.querySelector("#yss_fill_next").onclick = () => fillNext();
    el.querySelector("#yss_clear").onclick = () => clearInputs();

    enableDrag(el, el.querySelector("#yss_drag"));
  }

  function enableDrag(panel, handle) {
    if (!panel || !handle) return;
    let dragging = false, startX = 0, startY = 0, startLeft = 0, startTop = 0;

    const onDown = (e) => {
      if (e.button !== 0) return;
      dragging = true;
      const rect = panel.getBoundingClientRect();
      startX = e.clientX; startY = e.clientY;
      startLeft = rect.left; startTop = rect.top;
      e.preventDefault();
    };
    const onMove = (e) => {
      if (!dragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      panel.style.left = `${Math.max(0, startLeft + dx)}px`;
      panel.style.top  = `${Math.max(0, startTop + dy)}px`;
    };
    const onUp = () => { dragging = false; };

    handle.addEventListener("mousedown", onDown);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  function destroyHighlights() {
    document.querySelectorAll(".scavenge-option.yss_hl").forEach(x => x.classList.remove("yss_hl"));
  }

  // ---- CRITICAL FIX: native sync ----
  function triggerNativeInputEvents(inp) {
    if (!inp) return;
    // DOM events
    inp.dispatchEvent(new Event("input", { bubbles:true }));
    inp.dispatchEvent(new Event("change", { bubbles:true }));
    try { inp.dispatchEvent(new KeyboardEvent("keyup", { bubbles:true, key:"0" })); } catch(_) {}

    // jQuery events (oyun çoğu yerde bunu dinliyor)
    if (window.jQuery) {
      try { window.jQuery(inp).trigger("input").trigger("keyup").trigger("change"); } catch(_) {}
    }
  }

  function refreshScavUI() {
    // ScavengeScreen tarafını zorla inputlardan tekrar hesaplat
    try { window.ScavengeScreen?.updateInputs?.(); } catch(_) {}
    const cw = window.ScavengeScreen?.candidate_squad_widget;
    if (cw) {
      for (const fn of ["updateInputs","update","render","refresh","recalculate","recalc","onChange"]) {
        if (typeof cw[fn] === "function") { try { cw[fn](); } catch(_) {} }
      }
    }
  }

  function applyUnitsToGame(planUnits) {
    const inputs = document.querySelectorAll(".candidate-squad-widget input.unitsInput");
    inputs.forEach(inp => {
      const unit = inp.getAttribute("name");
      if (!unit) return;
      const val = planUnits[unit] || 0;
      // 0'ları da "0" yazıyoruz ki state daha kolay yakalasın
      inp.value = String(val);
      triggerNativeInputEvents(inp);
    });

    // bir de "carry-max" hesabı/preview refresh
    refreshScavUI();

    // Bazı sürümlerde UI bir tick sonra tekrar 0'a resetler: 2 kere kontrol edip re-apply
    const ensure = () => {
      let mismatch = false;
      for (const inp of inputs) {
        const unit = inp.getAttribute("name");
        if (!unit) continue;
        const want = String(planUnits[unit] || 0);
        const have = String((inp.value ?? "").trim() || "0");
        if (have !== want) { mismatch = true; inp.value = want; triggerNativeInputEvents(inp); }
      }
      if (mismatch) refreshScavUI();
    };

    requestAnimationFrame(() => ensure());
    setTimeout(() => ensure(), 120);
    setTimeout(() => ensure(), 320);
  }
  // ---- end fix ----

  function clearInputs() {
    destroyHighlights();
    const inputs = document.querySelectorAll(".candidate-squad-widget input.unitsInput");
    inputs.forEach(inp => { inp.value = "0"; triggerNativeInputEvents(inp); });
    refreshScavUI();
    msg("Inputlar temizlendi.", "ok");
  }

  const sendOrderDefault = ["spear","sword","axe","archer","light","marcher","heavy"];

  function renderPickers() {
    const uWrap = document.getElementById("yss_units");
    let html = `<div style="display:flex; gap:12px; flex-wrap:wrap;">`;
    for (const u of sendOrderDefault) {
      const count = getUnitCount(u);
      html += `
        <label class="yss_unitlbl" style="white-space:nowrap;">
          <input type="checkbox" class="yss_unit" data-unit="${u}" checked>
          <img src="${UNIT_ICON(u)}" alt="">
          <b>${getUnitName(u)}</b> <span class="grey">(${count})</span>
        </label>
      `;
    }
    html += `</div>`;
    uWrap.innerHTML = html;

    const oWrap = document.getElementById("yss_opts");
    const opts = listOptions();
    let oh = `<div style="display:flex; gap:12px; flex-wrap:wrap;">`;
    for (const opt of opts) {
      const active = !!opt.scavenging_squad;
      const locked = !!opt.is_locked;
      const disabled = active || locked;
      const tag = active ? "<span class='badge badge-report'>(ACTIVE)</span>" : (locked ? "<span class='badge badge-mail'>(LOCKED)</span>" : "<span class='badge badge-ally-forum'>(OK)</span>");
      oh += `
        <label style="white-space:nowrap; ${disabled ? "opacity:.55" : ""}">
          <input type="checkbox" class="yss_opt" data-opt="${opt.id}" ${disabled ? "disabled" : "checked"}>
          <b>${opt.name}</b> <span class="grey">(x${opt.loot_factor})</span> ${tag}
        </label>
      `;
    }
    oh += `</div>`;
    oWrap.innerHTML = oh;
  }

  function readTimeSeconds() {
    const hRaw = document.getElementById("yss_h")?.value;
    const mRaw = document.getElementById("yss_m")?.value;
    const sRaw = document.getElementById("yss_s")?.value;

    const anyTyped = (hRaw !== "" && hRaw != null) || (mRaw !== "" && mRaw != null) || (sRaw !== "" && sRaw != null);

    const h = parseFloat(hRaw || "0") || 0;
    const m = parseInt(mRaw || "0", 10) || 0;
    const s = parseInt(sRaw || "0", 10) || 0;

    let total = Math.floor(h * 3600 + m * 60 + s);
    if (!anyTyped) total = 3600;
    return Math.max(1, total);
  }

  function getUIState() {
    const timeSec = readTimeSeconds();
    const mode = document.getElementById("yss_mode_bal").checked ? "balanced" : "priority";

    const unitsEnabled = {};
    document.querySelectorAll(".yss_unit").forEach(cb => {
      unitsEnabled[cb.getAttribute("data-unit")] = cb.checked;
    });

    const optsEnabled = [];
    document.querySelectorAll(".yss_opt").forEach(cb => {
      if (cb.checked) optsEnabled.push(parseInt(cb.getAttribute("data-opt"), 10));
    });

    const saveObj = {
      time: {
        h: document.getElementById("yss_h")?.value ?? "",
        m: document.getElementById("yss_m")?.value ?? "",
        s: document.getElementById("yss_s")?.value ?? "",
      },
      mode,
      unitsEnabled,
      optsEnabled
    };
    localStorage.setItem("YSS_CFG", JSON.stringify(saveObj));

    return { timeSec, mode, unitsEnabled, optsEnabled };
  }

  function buildTroopsAllowed(unitsEnabled) {
    const allowed = {};
    for (const u of sendOrderDefault) {
      if (!unitsEnabled[u]) continue;
      allowed[u] = getUnitCount(u);
    }
    return allowed;
  }

  function sumCarry(troopsAllowed) {
    let total = 0;
    for (const u of Object.keys(troopsAllowed)) total += (troopsAllowed[u] || 0) * getCarry(u);
    return total;
  }

  function minCarrySelected(troopsAllowed) {
    let m = Infinity;
    for (const u of Object.keys(troopsAllowed)) {
      const have = troopsAllowed[u] || 0;
      const c = getCarry(u);
      if (have > 0 && c > 0) m = Math.min(m, c);
    }
    return Number.isFinite(m) ? m : 10;
  }

  function takeTroopsForCarryNoOvershoot(carryNeed, troopsAllowed, unitsEnabled) {
    carryNeed = Math.max(0, Math.floor(carryNeed));
    const planUnits = {};
    sendOrderDefault.forEach(u => planUnits[u] = 0);

    let totalAvailCarry = 0;
    for (const u of sendOrderDefault) {
      if (!unitsEnabled[u]) continue;
      totalAvailCarry += (troopsAllowed[u] || 0) * getCarry(u);
    }
    if (totalAvailCarry <= 0 || carryNeed <= 0) return { planUnits, carryUsed: 0 };

    for (const u of sendOrderDefault) {
      if (!unitsEnabled[u]) continue;
      const c = getCarry(u);
      const have = troopsAllowed[u] || 0;
      if (!c || have <= 0) continue;
      const shareCarry = carryNeed * ((have * c) / totalAvailCarry);
      const n = Math.min(have, Math.floor(shareCarry / c));
      planUnits[u] = n;
    }

    let carryUsed = sendOrderDefault.reduce((a,u)=>a + (planUnits[u]||0)*getCarry(u), 0);
    let rem = carryNeed - carryUsed;

    const pool = sendOrderDefault
      .filter(u => unitsEnabled[u])
      .map(u => ({u, c:getCarry(u)}))
      .filter(x => x.c > 0)
      .sort((a,b)=>b.c-a.c);

    while (rem > 0) {
      let picked = false;
      for (const {u,c} of pool) {
        const free = (troopsAllowed[u]||0) - (planUnits[u]||0);
        if (free <= 0) continue;
        if (c <= rem) {
          const add = Math.min(free, Math.floor(rem / c));
          if (add > 0) {
            planUnits[u] += add;
            carryUsed += add*c;
            rem -= add*c;
            picked = true;
            break;
          }
        }
      }
      if (!picked) break;
    }

    for (const u of sendOrderDefault) {
      const used = planUnits[u] || 0;
      if (used > 0) troopsAllowed[u] = (troopsAllowed[u] || 0) - used;
    }

    return { planUnits, carryUsed };
  }

  function estLootTriplet(totalLoot) {
    const each = Math.floor((totalLoot || 0) / 3);
    const r = (totalLoot || 0) - each*3;
    return { wood: each + (r>0?1:0), stone: each + (r>1?1:0), iron: each };
  }

  function unitsSummaryHTML(planUnits) {
    const parts = [];
    for (const u of sendOrderDefault) {
      const n = planUnits[u] || 0;
      if (n > 0) parts.push(`<span class="yss_units_html"><img src="${UNIT_ICON(u)}" alt="">${n}</span>`);
    }
    return parts.join("&nbsp;");
  }

  function renderPlan(plan, targetSec) {
    const tb = document.getElementById("yss_plan_tbody");
    tb.innerHTML = "";
    if (!plan.length) {
      tb.innerHTML = `<tr><td colspan="9" style="text-align:center;">Plan yok.</td></tr>`;
      return;
    }

    plan.forEach((p, i) => {
      const lootTotal = Math.floor(p.carryUsed * p.loot);
      const tri = estLootTriplet(lootTotal);

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${i+1}</td>
        <td style="text-align:left;"><b>${p.name}</b></td>
        <td>x${p.loot}</td>
        <td>${fmtHMS(targetSec)}</td>
        <td><b>${fmtHMS(p.estSec)}</b></td>
        <td>${p.carryUsed}</td>
        <td style="text-align:left;">
          <span class="icon header wood"></span>${tri.wood}
          &nbsp;&nbsp;
          <span class="icon header stone"></span>${tri.stone}
          &nbsp;&nbsp;
          <span class="icon header iron"></span>${tri.iron}
          <span class="grey">(≈)</span>
        </td>
        <td style="text-align:left;">${unitsSummaryHTML(p.planUnits)}</td>
        <td><input type="button" class="btn yss_fill_btn" data-i="${i}" value="Fill"></td>
      `;
      tb.appendChild(tr);
    });

    tb.querySelectorAll(".yss_fill_btn").forEach(btn => {
      btn.onclick = () => {
        const i = parseInt(btn.getAttribute("data-i"), 10);
        fillIndex(i, false);
      };
    });
  }

  function optimizeBalancedCarry(carryMap, opts, stepCarry, tolSec=30, maxIter=300) {
    const getC = (id) => carryMap.get(id) || 0;
    const setC = (id, v) => carryMap.set(id, Math.max(0, Math.floor(v)));

    const timeOf = (optId) => {
      const o = opts.find(x => x.id === optId);
      return calcTimeFromCarry(getC(optId), o);
    };

    for (let it=0; it<maxIter; it++) {
      let minId = null, maxId = null;
      let minT = Infinity, maxT = -Infinity;

      for (const o of opts) {
        const t = timeOf(o.id);
        if (t < minT) { minT = t; minId = o.id; }
        if (t > maxT) { maxT = t; maxId = o.id; }
      }

      if ((maxT - minT) <= tolSec) break;
      if (getC(maxId) < stepCarry) break;

      setC(maxId, getC(maxId) - stepCarry);
      setC(minId, getC(minId) + stepCarry);
    }
    return carryMap;
  }

  // ========= fill to game UI =========
  function highlightCard(baseId) {
    const card = findOptionCard(baseId);
    if (card) {
      card.classList.add("yss_hl");
      card.scrollIntoView({behavior:"smooth", block:"center"});
    }
  }

  function fillGameForRow(row) {
    destroyHighlights();
    applyUnitsToGame(row.planUnits);
    highlightCard(row.baseId);
  }

  // ========= planner =========
  function buildPlan(previewOnPlan) {
    destroyHighlights();
    const st = getUIState();
    const optsAll = listOptions().filter(o => st.optsEnabled.includes(o.id) && !o.is_locked && !o.scavenging_squad);

    if (!optsAll.length) {
      msg("Seçili & uygun (OK) kategori yok. (LOCKED/ACTIVE plan dışı)", "err");
      renderPlan([], st.timeSec);
      Y.state = { plan: [], idx: 0, targetSec: st.timeSec };
      return;
    }

    const opts = optsAll.slice().sort((a,b)=>b.loot_factor - a.loot_factor);
    const targetSec = Math.max(1, Math.round(st.timeSec));

    const troopsAllowed0 = buildTroopsAllowed(st.unitsEnabled);
    const totalCarryAvail = sumCarry(troopsAllowed0);
    if (totalCarryAvail <= 0) {
      msg("Seçili askerlerden carry çıkmıyor. Unit seçimini kontrol et.", "err");
      renderPlan([], targetSec);
      Y.state = { plan: [], idx: 0, targetSec };
      return;
    }

    const stepCarry = minCarrySelected(troopsAllowed0);
    const carryAlloc = new Map();

    if (st.mode === "priority") {
      const haulTarget = calcHaulFromTime(targetSec, opts[0]);
      if (!haulTarget) {
        msg("Bu süre için hesap çıkmadı. Süre çok düşük olabilir (oyun minimum süre sınırı).", "err");
        renderPlan([], targetSec);
        Y.state = { plan: [], idx: 0, targetSec };
        return;
      }

      const needByOpt = new Map();
      let totalNeed = 0;
      for (const o of opts) {
        const need = Math.floor((haulTarget / (o.loot_factor || 1)));
        needByOpt.set(o.id, need);
        totalNeed += need;
      }

      if (totalCarryAvail >= totalNeed) {
        for (const o of opts) carryAlloc.set(o.id, needByOpt.get(o.id));
        msg(`✅ Priority: hedef süre <b>${fmtHMS(targetSec)}</b>.`, "ok");
      } else {
        let rem = totalCarryAvail;
        for (const o of opts) {
          if (rem <= 0) break;
          const need = needByOpt.get(o.id);
          const give = Math.min(need, rem);
          carryAlloc.set(o.id, give);
          rem -= give;
        }
        msg("⚠️ Troop yetersiz. Priority açık → yüksek kategoriler öncelikli doldu, bazıları boş kalabilir.", "info");
      }
    }

    if (st.mode === "balanced") {
      const base = opts[0];
      const haulTarget = calcHaulFromTime(targetSec, base);
      if (!haulTarget) {
        msg("Bu süre için hesap çıkmadı. Süre çok düşük olabilir (oyun minimum süre sınırı).", "err");
        renderPlan([], targetSec);
        Y.state = { plan: [], idx: 0, targetSec };
        return;
      }

      const invSum = opts.reduce((a,o)=>a + (1/(o.loot_factor||1)), 0);
      const needTotalAtTarget = haulTarget * invSum;

      let haulUsed = haulTarget;
      let note = `✅ Balanced: hedef süre <b>${fmtHMS(targetSec)}</b>.`;

      if (totalCarryAvail < needTotalAtTarget) {
        haulUsed = totalCarryAvail / invSum;
        const estCommonTime = calcTimeFromCarry(haulUsed / (opts[0].loot_factor||1), opts[0]);
        note = `⚠️ Troop yetersiz → Balanced süre düştü: ~ <b>${fmtHMS(estCommonTime)}</b>.`;
      }

      const rawNeed = new Map();
      for (const o of opts) rawNeed.set(o.id, (haulUsed / (o.loot_factor||1)));

      let sum = 0;
      for (const o of opts) {
        const v = Math.floor(rawNeed.get(o.id) / stepCarry) * stepCarry;
        carryAlloc.set(o.id, v);
        sum += v;
      }

      let rem = totalCarryAvail - sum;
      while (rem >= stepCarry) {
        let minId = null;
        let minT = Infinity;
        for (const o of opts) {
          const t = calcTimeFromCarry(carryAlloc.get(o.id) || 0, o);
          if (t < minT) { minT = t; minId = o.id; }
        }
        carryAlloc.set(minId, (carryAlloc.get(minId) || 0) + stepCarry);
        rem -= stepCarry;
      }

      optimizeBalancedCarry(carryAlloc, opts, stepCarry, 30, 350);
      msg(note, totalCarryAvail >= needTotalAtTarget ? "ok" : "info");
    }

    const troopsState = { ...troopsAllowed0 };
    const plan = [];

    for (const o of opts) {
      const cNeed = carryAlloc.get(o.id) || 0;
      if (cNeed <= 0) continue;

      const { planUnits, carryUsed } = takeTroopsForCarryNoOvershoot(cNeed, troopsState, st.unitsEnabled);
      if (carryUsed <= 0) continue;

      const estSec = calcTimeFromCarry(carryUsed, o);
      plan.push({
        optId: o.id,
        baseId: o.base_id,
        name: o.name,
        loot: o.loot_factor,
        estSec,
        carryUsed,
        planUnits,
      });
    }

    Y.state = { plan, idx: 0, targetSec };
    renderPlan(plan, targetSec);

    if (!plan.length) {
      msg("Plan boş çıktı. (Troop yetersiz olabilir veya seçili kategoriler ACTIVE/LOCKED)", "err");
      return;
    }

    if (previewOnPlan) {
      fillGameForRow(plan[0]);
      Y.state.idx = 1;
      msg(`PLAN oluşturuldu. Oyun arayüzüne <b>1. satır</b> yazıldı: <b>${plan[0].name}</b>. Diğerleri için tablodan Fill veya FILL NEXT.`, "ok");
    }
  }

  function fillIndex(i, advanceIndex=true) {
    const row = Y.state?.plan?.[i];
    if (!row) return;
    fillGameForRow(row);
    if (advanceIndex) Y.state.idx = i + 1;
    msg(`Dolduruldu: <b>${row.name}</b>. Şimdi ilgili karttan <b>Start</b> butonuna tıkla.`, "ok");
  }

  function fillNext() {
    if (!Y.state?.plan?.length) return msg("Önce PLAN yap.", "err");
    if (Y.state.idx >= Y.state.plan.length) return msg("Plan bitti. (Tüm satırlar dolduruldu)", "ok");
    fillIndex(Y.state.idx, true);
  }

  // ========= init =========
  ensureUI();
  renderPickers();

  // ========= destroy =========
  Y.destroy = () => {
    Y.__running = false;
    destroyHighlights();
    document.getElementById(PANEL_ID)?.remove();
    document.getElementById(STYLE_ID)?.remove();
    delete window[KEY];
  };
})();
