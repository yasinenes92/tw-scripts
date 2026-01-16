(async () => {
  const KEY = "__YAVER_SCAV_SINGLE__";
  if (window[KEY]?.destroy) { try { window[KEY].destroy(); } catch(e){} }

  const Y = (window[KEY] = {});
  Y.__running = true;

  // ========= helpers =========
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
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

  // ========= guards =========
  if (!/screen=place/.test(location.href) || !/mode=scavenge/.test(location.href)) {
    location.href = (window.game_data?.link_base_pure || "/game.php?") + "place&mode=scavenge";
    return;
  }

  await waitFor(() => window.ScavengeScreen && window.ScavengeScreen.village && window.ScavengeScreen.village.options, 15000)
    .catch(() => { throw new Error("ScavengeScreen yüklenmedi. Sayfayı yenileyip (F5) tekrar dene."); });

  const sc = window.ScavengeScreen;
  const village = sc.village;

  // ========= carry lookup =========
  function getCarry(unit) {
    const u = sc?.units?.[unit] || sc?.unit_info?.[unit] || sc?.unitData?.[unit] || null;
    const c = u?.carry;
    if (typeof c === "number") return c;
    const fallback = { spear:25, sword:15, axe:10, archer:10, light:80, marcher:50, heavy:50, knight:100 };
    return fallback[unit] || 0;
  }

  function getUnitCount(unit) {
    const el = document.querySelector(`.units-entry-all[data-unit="${unit}"]`);
    if (!el) return 0;
    const m = el.textContent.match(/\((\d+)\)/);
    return m ? parseInt(m[1], 10) : 0;
  }

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
  function calcHaulFromTime(timeSec, p) {
    const df = p.duration_factor || 1;
    const de = p.duration_exponent || 0.45;
    const di = p.duration_initial_seconds || 1800;
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

  // ========= UI (native TW) =========
  const PANEL_ID = "yss_panel_native";
  const STYLE_ID = "yss_style_native";

  function ensureUI() {
    if (document.getElementById(PANEL_ID)) return;

    // minimal CSS only for positioning + highlight
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
      }
      #${PANEL_ID} .yss_hl{
        outline: 3px solid #ffb400 !important;
        box-shadow: 0 0 0 4px rgba(255,180,0,.25) !important;
      }
      #${PANEL_ID} .yss_dev{
        float:right; opacity:.8; font-style: italic;
      }
      #${PANEL_ID} .yss_toolbar{
        display:flex; gap:8px; align-items:center; flex-wrap:wrap;
      }
      #${PANEL_ID} .yss_small{
        font-size: 11px; opacity:.9;
      }
      #${PANEL_ID} .yss_tablewrap{
        max-height: 280px; overflow:auto;
      }
      #${PANEL_ID} .yss_close{
        float:right; margin-left:10px;
      }
      #${PANEL_ID} input[type="number"]{
        width: 70px;
      }
    `;
    document.head.appendChild(style);

    const el = document.createElement("div");
    el.id = PANEL_ID;

    el.innerHTML = `
      <table class="vis" style="width:100%;">
        <tr>
          <th style="text-align:left;">
            <span class="icon header place"></span>
            Yaver Scavenging (Single Village)
            <span class="yss_dev">Developed by controleng</span>
            <span class="yss_close"><input type="button" class="btn" id="yss_close" value="X"></span>
          </th>
        </tr>
        <tr>
          <td>
            <div class="yss_toolbar">
              <span class="icon header time"></span>
              <b>Süre (saat):</b>
              <input id="yss_hours" type="number" step="0.25" min="0.25">

              <label style="margin-left:10px;">
                <input id="yss_balanced" type="checkbox" checked>
                <b>Balanced over all categories</b>
              </label>

              <label style="margin-left:10px;">
                <input id="yss_prio" type="checkbox" checked>
                <b>Priority on filling higher categories</b>
              </label>

              <input type="button" class="btn" id="yss_plan" value="PLAN">
              <input type="button" class="btn" id="yss_fill_next" value="FILL NEXT">
              <input type="button" class="btn" id="yss_clear" value="CLEAR">
            </div>

            <div id="yss_msg" class="info_box" style="margin-top:8px;">
              <div class="content">Hazır. Süre/Unit/Kategori seç → <b>PLAN</b> → <b>FILL</b> (ya da <b>FILL NEXT</b>).</div>
            </div>
          </td>
        </tr>
      </table>

      <table class="vis" style="width:100%; margin-top:6px;">
        <tr><th style="text-align:left;">Asker Türleri (checkbox)</th></tr>
        <tr><td id="yss_units"></td></tr>
      </table>

      <table class="vis" style="width:100%; margin-top:6px;">
        <tr><th style="text-align:left;">Kategoriler (LOCKED/ACTIVE otomatik dışarıda)</th></tr>
        <tr><td id="yss_opts"></td></tr>
      </table>

      <table class="vis" style="width:100%; margin-top:6px;">
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
              Not: Bu script <b>otomatik başlatmaz</b>. “FILL” sadece inputları doldurur ve ilgili scav kartını vurgular.
              Sen karttaki <b>Start</b> butonuna tıklarsın. (Güvenli kullanım)
            </div>
          </td>
        </tr>
      </table>
    `;

    document.body.appendChild(el);

    const saved = JSON.parse(localStorage.getItem("YSS_CFG") || "{}");
    el.querySelector("#yss_hours").value = saved.hours || 2;
    el.querySelector("#yss_balanced").checked = (saved.balanced ?? true);
    el.querySelector("#yss_prio").checked = (saved.prio ?? true);

    el.querySelector("#yss_close").onclick = () => Y.destroy();
    el.querySelector("#yss_plan").onclick = () => buildPlan();
    el.querySelector("#yss_fill_next").onclick = () => fillNext();
    el.querySelector("#yss_clear").onclick = () => clearInputs();
  }

  function destroyHighlights() {
    document.querySelectorAll(`#${PANEL_ID} .yss_hl`).forEach(x => x.classList.remove("yss_hl"));
    document.querySelectorAll(".scavenge-option.yss_hl").forEach(x => x.classList.remove("yss_hl"));
  }

  function clearInputs() {
    destroyHighlights();
    const inputs = document.querySelectorAll(".candidate-squad-widget input.unitsInput");
    inputs.forEach(inp => { inp.value = ""; inp.dispatchEvent(new Event("input", {bubbles:true})); });
    msg("Inputlar temizlendi.", "ok");
  }

  // ========= pickers =========
  const sendOrderDefault = (game_data?.units || []).filter(u => !["militia","snob","ram","catapult","spy","knight"].includes(u));
  const UNIT_LABEL = { spear:"Spear", sword:"Sword", axe:"Axe", archer:"Archer", light:"LC", marcher:"Marcher", heavy:"HC" };

  function renderPickers() {
    // units
    const uWrap = document.getElementById("yss_units");
    const units = sendOrderDefault.slice();
    let html = `<div style="display:flex; gap:10px; flex-wrap:wrap;">`;
    for (const u of units) {
      const count = getUnitCount(u);
      html += `
        <label style="white-space:nowrap;">
          <input type="checkbox" class="yss_unit" data-unit="${u}" checked>
          <b>${UNIT_LABEL[u] || u}</b> <span class="grey">(${count})</span>
        </label>
      `;
    }
    html += `</div>`;
    uWrap.innerHTML = html;

    // options
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

  // ========= core planner (same logic) =========
  function getUIState() {
    const hours = parseFloat(document.getElementById("yss_hours").value || "2") || 2;
    const balanced = document.getElementById("yss_balanced").checked;
    const prio = document.getElementById("yss_prio").checked;

    const unitsEnabled = {};
    document.querySelectorAll(".yss_unit").forEach(cb => {
      unitsEnabled[cb.getAttribute("data-unit")] = cb.checked;
    });

    const optsEnabled = [];
    document.querySelectorAll(".yss_opt").forEach(cb => {
      if (cb.checked) optsEnabled.push(parseInt(cb.getAttribute("data-opt"), 10));
    });

    localStorage.setItem("YSS_CFG", JSON.stringify({ hours, balanced, prio, unitsEnabled, optsEnabled }));
    return { hours, balanced, prio, unitsEnabled, optsEnabled };
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

  function takeTroopsForCarry(carryNeed, troopsAllowed, unitsEnabled) {
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

    const unitsByCarryAsc = sendOrderDefault
      .filter(u => unitsEnabled[u])
      .map(u => ({u, c:getCarry(u)}))
      .filter(x => x.c > 0)
      .sort((a,b)=>a.c-b.c);

    let carryUsed = unitsByCarryAsc.reduce((a,x)=>a + planUnits[x.u]*x.c, 0);
    let rem = carryNeed - carryUsed;

    for (const {u, c} of unitsByCarryAsc) {
      if (rem <= 0) break;
      const have = troopsAllowed[u] || 0;
      const used = planUnits[u] || 0;
      const free = have - used;
      if (free <= 0) continue;

      const add = Math.min(free, Math.ceil(rem / c));
      planUnits[u] = used + add;
      carryUsed += add * c;
      rem = carryNeed - carryUsed;
    }

    for (const u of sendOrderDefault) {
      const used = planUnits[u] || 0;
      if (used > 0) troopsAllowed[u] = (troopsAllowed[u] || 0) - used;
    }

    return { planUnits, carryUsed };
  }

  function unitsSummary(planUnits) {
    const parts = [];
    for (const u of sendOrderDefault) {
      const n = planUnits[u] || 0;
      if (n > 0) parts.push(`${u}:${n}`);
    }
    return parts.join(" ");
  }

  function estLootTriplet(totalLoot) {
    // TW ekranda genelde W/S/I yakın oluyor; bunu "yaklaşık" gösteriyoruz
    const each = Math.floor((totalLoot || 0) / 3);
    const r = (totalLoot || 0) - each*3;
    return { wood: each + (r>0?1:0), stone: each + (r>1?1:0), iron: each };
  }

  function renderPlan(plan) {
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
        <td>${fmtHMS(p.targetSec)}</td>
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
        <td style="text-align:left; font-family: monospace;">${unitsSummary(p.planUnits)}</td>
        <td><input type="button" class="btn yss_fill_btn" data-i="${i}" value="Fill"></td>
      `;
      tb.appendChild(tr);
    });

    tb.querySelectorAll(".yss_fill_btn").forEach(btn => {
      btn.onclick = () => {
        const i = parseInt(btn.getAttribute("data-i"), 10);
        fillIndex(i);
      };
    });
  }

  function buildPlan() {
    destroyHighlights();
    const st = getUIState();
    const optsAll = listOptions().filter(o => st.optsEnabled.includes(o.id) && !o.is_locked && !o.scavenging_squad);

    if (!optsAll.length) {
      msg("Seçili & uygun (OK) kategori yok. (LOCKED/ACTIVE plan dışı)", "err");
      renderPlan([]);
      Y.state = { plan: [], idx: 0 };
      return;
    }

    const opts = optsAll.slice().sort((a,b) => st.prio ? (b.loot_factor - a.loot_factor) : (a.id - b.id));

    const p = opts[0];
    const timeSecTarget = Math.max(60, Math.round(st.hours * 3600));
    const haul = calcHaulFromTime(timeSecTarget, p);

    if (!haul) {
      msg("Bu süre için hesap çıkmadı. Süre çok düşük olabilir.", "err");
      renderPlan([]);
      Y.state = { plan: [], idx: 0 };
      return;
    }

    const requiredCarryByOpt = new Map();
    let totalHaul = 0;
    for (const o of opts) {
      const needCarry = Math.floor(haul / (o.loot_factor || 1));
      requiredCarryByOpt.set(o.id, needCarry);
      totalHaul += needCarry;
    }

    const troopsAllowed = buildTroopsAllowed(st.unitsEnabled);
    const totalLoot = sumCarry(troopsAllowed);

    if (totalLoot <= 0) {
      msg("Seçili askerlerden carry çıkmıyor. Unit seçimini kontrol et.", "err");
      renderPlan([]);
      Y.state = { plan: [], idx: 0 };
      return;
    }

    const carryAlloc = new Map();
    if (totalLoot >= totalHaul) {
      for (const o of opts) carryAlloc.set(o.id, requiredCarryByOpt.get(o.id));
    } else {
      if (st.prio) {
        let rem = totalLoot;
        for (const o of opts) {
          if (rem <= 0) break;
          const need = requiredCarryByOpt.get(o.id);
          const give = Math.min(need, rem);
          carryAlloc.set(o.id, give);
          rem -= give;
        }
      } else {
        const scale = (totalLoot / totalHaul);
        for (const o of opts) {
          const need = requiredCarryByOpt.get(o.id);
          carryAlloc.set(o.id, Math.floor(need * scale));
        }
      }
    }

    const plan = [];
    const troopsState = {...troopsAllowed};

    for (const o of opts) {
      const cNeed = carryAlloc.get(o.id) || 0;
      if (cNeed <= 0) continue;

      const { planUnits, carryUsed } = takeTroopsForCarry(cNeed, troopsState, st.unitsEnabled);
      if (carryUsed <= 0) continue;

      const estSec = calcTimeFromCarry(carryUsed, o);
      plan.push({
        optId: o.id,
        baseId: o.base_id,
        name: o.name,
        loot: o.loot_factor,
        targetSec: timeSecTarget,
        estSec,
        carryUsed,
        planUnits,
      });
    }

    Y.state = { plan, idx: 0 };

    if (!plan.length) {
      msg("Plan boş çıktı. (Troop yetersiz olabilir veya seçili kategoriler ACTIVE/LOCKED)", "err");
      renderPlan([]);
      return;
    }

    const note =
      totalLoot >= totalHaul
        ? `✅ Troop yeterli. Seçili kategoriler ~ <b>${st.hours} saat</b> hedefleniyor.`
        : (st.prio
            ? `⚠️ Troop yetersiz. Priority açık → yüksek kategoriler öncelikli doldu, bazıları boş kalabilir.`
            : `⚠️ Troop yetersiz. Balanced açık → seçili kategoriler aynı sürede bitecek şekilde ölçeklendi.`);

    msg(note, totalLoot >= totalHaul ? "ok" : "info");
    renderPlan(plan);
  }

  function fillIndex(i) {
    destroyHighlights();
    const row = Y.state?.plan?.[i];
    if (!row) return;

    const inputs = document.querySelectorAll(".candidate-squad-widget input.unitsInput");
    inputs.forEach(inp => {
      const unit = inp.getAttribute("name");
      if (!unit) return;
      const val = row.planUnits[unit] || 0;
      inp.value = val ? String(val) : "";
      inp.dispatchEvent(new Event("input", {bubbles:true}));
    });

    const card = findOptionCard(row.baseId);
    if (card) {
      card.classList.add("yss_hl");
      card.scrollIntoView({behavior:"smooth", block:"center"});
    }

    msg(`Dolduruldu: <b>${row.name}</b>. Şimdi ekrandaki ilgili karttan <b>Start</b> butonuna tıkla.`, "ok");
  }

  function fillNext() {
    if (!Y.state?.plan?.length) return msg("Önce PLAN yap.", "err");
    if (Y.state.idx >= Y.state.plan.length) return msg("Plan bitti. (Tüm satırlar dolduruldu)", "ok");
    fillIndex(Y.state.idx);
    Y.state.idx += 1;
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
