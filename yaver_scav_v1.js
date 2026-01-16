(async () => {
  const KEY = "__YAVER_SCAV_SINGLE__";
  if (window[KEY]?.destroy) try { window[KEY].destroy(); } catch(e){}

  const Y = (window[KEY] = {});
  Y.__running = true;

  // ========= helpers =========
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const clamp0 = (n) => (n > 0 ? n : 0);
  const nInt = (x) => {
    const s = String(x ?? "").replace(/[^\d]/g, "");
    return s ? parseInt(s, 10) : 0;
  };
  const fmtHMS = (sec) => {
    sec = Math.max(0, Math.floor(sec || 0));
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    if (h) return `${h}h ${m}m`;
    if (m) return `${m}m ${s}s`;
    return `${s}s`;
  };

  function msg(html, kind="info") {
    const el = document.getElementById("yss_msg");
    if (!el) return;
    el.className = "yss_msg " + kind;
    el.innerHTML = html;
  }

  function waitFor(fn, ms=10000) {
    const t0 = Date.now();
    return new Promise((resolve, reject) => {
      const tick = () => {
        try {
          if (fn()) return resolve(true);
        } catch(_) {}
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
    const u =
      sc?.units?.[unit] ||
      sc?.unit_info?.[unit] ||
      sc?.unitData?.[unit] ||
      null;

    const c = u?.carry;
    if (typeof c === "number") return c;

    // fallback (DS standart)
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
    // haul = sqrt( ( (time/duration_factor - initial)^(1/exponent) ) /100 )
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
    // time = duration_factor * ( initial + (100*(haul^2))^exponent ) ; where haul = carry*loot_factor
    const haul = (carry || 0) * (opt.loot_factor || 0);
    const df = opt.duration_factor || 1;
    const de = opt.duration_exponent || 0.45;
    const di = opt.duration_initial_seconds || 1800;

    const x = Math.pow(100 * haul * haul, de);
    return Math.max(0, Math.round(df * (di + x)));
  }

  // ========= UI =========
  const PANEL_ID = "yss_panel";
  const STYLE_ID = "yss_style";

  function ensureUI() {
    if (document.getElementById(PANEL_ID)) return;

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      #${PANEL_ID}{
        position:fixed; z-index:99999; left:20px; top:70px; width:980px;
        background:rgba(245,232,203,.97); border:2px solid #7b5b2a; border-radius:10px;
        box-shadow:0 8px 30px rgba(0,0,0,.25); font-family: Verdana, Arial; color:#2b1b0e;
        max-height: 85vh; overflow:auto;
      }
      #${PANEL_ID} .hdr{ display:flex; justify-content:space-between; align-items:center; padding:10px 12px; border-bottom:1px solid rgba(0,0,0,.15);}
      #${PANEL_ID} .hdr h3{ margin:0; font-size:16px; }
      #${PANEL_ID} .row{ padding:10px 12px; }
      #${PANEL_ID} .btn{ cursor:pointer; padding:5px 10px; border-radius:6px; font-weight:700; border:1px solid #4b3b1d; background:#2fa64a; color:#fff; }
      #${PANEL_ID} .btn.gray{ background:#666; }
      #${PANEL_ID} .btn.stop{ background:#8b5a2b; }
      #${PANEL_ID} .pill{ display:inline-block; padding:3px 8px; border-radius:999px; background:rgba(0,0,0,.08); border:1px solid rgba(0,0,0,.12); margin-right:8px; font-size:12px; }
      #${PANEL_ID} table{ width:100%; border-collapse:collapse; font-size:12px; }
      #${PANEL_ID} th,#${PANEL_ID} td{ border:1px solid rgba(0,0,0,.2); padding:4px 6px; text-align:center; }
      #${PANEL_ID} th{ background: rgba(0,0,0,.08); position:sticky; top:0; }
      .yss_msg{ margin-top:8px; padding:8px 10px; border-radius:8px; font-weight:700; }
      .yss_msg.info{ background:#fff5d6; border:1px solid #e8d7a7; }
      .yss_msg.ok{ background:#1f7a2f; color:#fff; }
      .yss_msg.err{ background:#8b0d0d; color:#fff; }
      .yss_hl{ outline:3px solid #ffb400 !important; box-shadow:0 0 0 4px rgba(255,180,0,.25) !important; }
    `;
    document.head.appendChild(style);

    const el = document.createElement("div");
    el.id = PANEL_ID;
    el.innerHTML = `
      <div class="hdr">
        <h3>Yaver Scavenging (Single Village) — ${game_data?.village?.display_name || ""}</h3>
        <div>
          <button class="btn gray" id="yss_close">X</button>
        </div>
      </div>

      <div class="row">
        <span class="pill">Süre (saat): <input id="yss_hours" type="number" step="0.25" min="0.25" style="width:70px" /></span>
        <label class="pill"><input id="yss_balanced" type="checkbox" checked /> Balanced over all categories</label>
        <label class="pill"><input id="yss_prio" type="checkbox" checked /> Priority on filling higher categories</label>
        <button class="btn" id="yss_plan">PLAN</button>
        <button class="btn" id="yss_fill_next">FILL NEXT</button>
        <button class="btn stop" id="yss_clear">CLEAR</button>
        <div id="yss_msg" class="yss_msg info">Hazır. “PLAN” ile hesapla.</div>
      </div>

      <div class="row">
        <div style="margin-bottom:8px; font-weight:700;">Asker Türleri</div>
        <div id="yss_units"></div>
      </div>

      <div class="row">
        <div style="margin-bottom:8px; font-weight:700;">Kategoriler (Locked/Active olanlar otomatik dışarıda)</div>
        <div id="yss_opts"></div>
      </div>

      <div class="row">
        <div style="margin-bottom:8px; font-weight:700;">Plan Tablosu</div>
        <div style="max-height:320px; overflow:auto;">
          <table>
            <thead>
              <tr>
                <th>#</th><th>Kategori</th><th>Loot</th><th>Hedef</th><th>Tahmini</th><th>Carry</th><th>Units</th><th>Fill</th>
              </tr>
            </thead>
            <tbody id="yss_plan_tbody"></tbody>
          </table>
        </div>
      </div>
    `;
    document.body.appendChild(el);

    // handlers
    el.querySelector("#yss_close").onclick = () => Y.destroy();
    el.querySelector("#yss_plan").onclick = () => buildPlan();
    el.querySelector("#yss_fill_next").onclick = () => fillNext();
    el.querySelector("#yss_clear").onclick = () => clearInputs();

    // defaults
    const saved = JSON.parse(localStorage.getItem("YSS_CFG") || "{}");
    el.querySelector("#yss_hours").value = saved.hours || 2;
    el.querySelector("#yss_balanced").checked = (saved.balanced ?? true);
    el.querySelector("#yss_prio").checked = (saved.prio ?? true);
  }

  function destroyHighlights() {
    document.querySelectorAll(".yss_hl").forEach(x => x.classList.remove("yss_hl"));
  }

  function clearInputs() {
    destroyHighlights();
    const inputs = document.querySelectorAll(".candidate-squad-widget input.unitsInput");
    inputs.forEach(inp => { inp.value = ""; inp.dispatchEvent(new Event("input", {bubbles:true})); });
    msg("Inputlar temizlendi.", "ok");
  }

  // ========= build unit + option pickers =========
  const sendOrderDefault = (game_data?.units || []).filter(u => !["militia","snob","ram","catapult","spy","knight"].includes(u));
  const UNIT_LABEL = {
    spear:"Spear", sword:"Sword", axe:"Axe", archer:"Archer", light:"LC", marcher:"Marcher", heavy:"HC"
  };

  function renderPickers() {
    // units
    const uWrap = document.getElementById("yss_units");
    const units = sendOrderDefault.slice();
    let html = `<div style="display:flex; gap:12px; flex-wrap:wrap;">`;
    for (const u of units) {
      const count = getUnitCount(u);
      html += `
        <label class="pill" style="cursor:pointer;">
          <input type="checkbox" class="yss_unit" data-unit="${u}" checked />
          ${UNIT_LABEL[u] || u} <span style="opacity:.8;">(${count})</span>
        </label>`;
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
      const tag = active ? "ACTIVE" : (locked ? "LOCKED" : "OK");
      oh += `
        <label class="pill" style="cursor:pointer; ${disabled ? "opacity:.55" : ""}">
          <input type="checkbox" class="yss_opt" data-opt="${opt.id}" ${disabled ? "disabled" : "checked"} />
          ${opt.name} <span style="opacity:.8;">(x${opt.loot_factor})</span> <b>${tag}</b>
        </label>`;
    }
    oh += `</div>`;
    oWrap.innerHTML = oh;
  }

  // ========= planning =========
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
    for (const u of Object.keys(troopsAllowed)) {
      total += (troopsAllowed[u] || 0) * getCarry(u);
    }
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

    // proportional floor allocation
    for (const u of sendOrderDefault) {
      if (!unitsEnabled[u]) continue;
      const c = getCarry(u);
      const have = troopsAllowed[u] || 0;
      if (!c || have <= 0) continue;

      const shareCarry = carryNeed * ((have * c) / totalAvailCarry);
      const n = Math.min(have, Math.floor(shareCarry / c));
      planUnits[u] = n;
    }

    // top-up with smallest carry first to reduce overshoot
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

    // subtract from troopsAllowed
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

  function buildPlan() {
    destroyHighlights();
    const st = getUIState();
    const optsAll = listOptions().filter(o => st.optsEnabled.includes(o.id) && !o.is_locked && !o.scavenging_squad);

    if (!optsAll.length) {
      msg("Seçili & uygun (OK) kategori yok. (LOCKED/ACTIVE olanlar plan dışı.)", "err");
      renderPlan([]);
      Y.state = { plan: [], idx: 0 };
      return;
    }

    // sort categories: higher first if prio
    const opts = optsAll.slice().sort((a,b) => st.prio ? (b.loot_factor - a.loot_factor) : (a.id - b.id));

    // duration params (use option 1 base — same across options)
    const p = opts[0];
    const timeSecTarget = Math.max(60, Math.round(st.hours * 3600));
    const haul = calcHaulFromTime(timeSecTarget, p);

    if (!haul) {
      msg("Bu süre için hesap (haul) çıkmadı. Süre çok düşük olabilir.", "err");
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

    // troops
    const troopsAllowed = buildTroopsAllowed(st.unitsEnabled);
    const totalLoot = sumCarry(troopsAllowed);

    if (totalLoot <= 0) {
      msg("Seçili askerlerden 0 carry çıkıyor. Unit seçimini kontrol et.", "err");
      renderPlan([]);
      Y.state = { plan: [], idx: 0 };
      return;
    }

    // decide carry allocation per option
    const carryAlloc = new Map();

    if (totalLoot >= totalHaul) {
      // full target for all
      for (const o of opts) carryAlloc.set(o.id, requiredCarryByOpt.get(o.id));
    } else {
      if (st.prio) {
        // priority fills higher categories first
        let rem = totalLoot;
        for (const o of opts) {
          if (rem <= 0) break;
          const need = requiredCarryByOpt.get(o.id);
          const give = Math.min(need, rem);
          carryAlloc.set(o.id, give);
          rem -= give;
        }
      } else {
        // balanced scaling
        const scale = (totalLoot / totalHaul);
        for (const o of opts) {
          const need = requiredCarryByOpt.get(o.id);
          carryAlloc.set(o.id, Math.floor(need * scale));
        }
      }
    }

    // build per-option unit plans (using copies of troopsAllowed)
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
      msg("Plan boş çıktı. (Muhtemelen troop yetersiz veya seçili kategoriler ACTIVE/LOCKED)", "err");
      renderPlan([]);
      return;
    }

    // info message
    const note =
      totalLoot >= totalHaul
        ? `OK: Troop yeterli. Seçili kategoriler ~${st.hours} saat hedefleniyor.`
        : (st.prio
            ? `UYARI: Troop yetersiz. Priority açık → yüksek kategoriler dolduruldu, bazıları boş kalabilir.`
            : `UYARI: Troop yetersiz. Balanced açık → tüm seçili kategoriler aynı sürede bitecek şekilde ölçeklendi.`);

    msg(note, totalLoot >= totalHaul ? "ok" : "info");
    renderPlan(plan);
  }

  function renderPlan(plan) {
    const tb = document.getElementById("yss_plan_tbody");
    tb.innerHTML = "";
    if (!plan.length) {
      tb.innerHTML = `<tr><td colspan="8">Plan yok.</td></tr>`;
      return;
    }

    plan.forEach((p, i) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${i+1}</td>
        <td style="text-align:left;"><b>${p.name}</b></td>
        <td>x${p.loot}</td>
        <td>${fmtHMS(p.targetSec)}</td>
        <td><b>${fmtHMS(p.estSec)}</b></td>
        <td>${p.carryUsed}</td>
        <td style="text-align:left; font-family: monospace;">${unitsSummary(p.planUnits)}</td>
        <td><button class="btn gray yss_fill_btn" data-i="${i}">FILL</button></td>
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

  function fillIndex(i) {
    destroyHighlights();
    const st = Y.state;
    const row = st?.plan?.[i];
    if (!row) return;

    // set inputs
    const inputs = document.querySelectorAll(".candidate-squad-widget input.unitsInput");
    inputs.forEach(inp => {
      const unit = inp.getAttribute("name");
      if (!unit) return;
      const val = row.planUnits[unit] || 0;
      inp.value = val ? String(val) : "";
      inp.dispatchEvent(new Event("input", {bubbles:true}));
    });

    // highlight category card
    const card = findOptionCard(row.baseId) || null;
    if (card) {
      card.classList.add("yss_hl");
      card.scrollIntoView({behavior:"smooth", block:"center"});
      // best-effort: focus a clickable button inside the card
      const btn = card.querySelector("button, input[type='submit'], a.btn");
      if (btn) try { btn.focus(); } catch(e){}
    }

    msg(`Dolduruldu: <b>${row.name}</b>. Şimdi ilgili scav kartındaki <b>Start/Send</b> butonuna tıkla.`, "ok");
  }

  function fillNext() {
    const st = Y.state;
    if (!st?.plan?.length) {
      msg("Önce PLAN yap.", "err");
      return;
    }
    if (st.idx >= st.plan.length) {
      msg("Plan bitti. (Tüm satırlar dolduruldu)", "ok");
      return;
    }
    fillIndex(st.idx);
    st.idx += 1;
  }

  // ========= init =========
  ensureUI();
  renderPickers();
  msg("Hazır. Süre/Unit/Kategori seç → PLAN → FILL (veya FILL NEXT).", "info");

  // expose
  Y.destroy = () => {
    Y.__running = false;
    document.getElementById(PANEL_ID)?.remove();
    document.getElementById(STYLE_ID)?.remove();
    destroyHighlights();
    delete window[KEY];
  };

})();
