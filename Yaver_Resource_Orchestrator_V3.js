/*
 * Script Name: Yaver Resource Orchestrator (V3)
 * Author: controleng + Yaver
 * Version: 3.0
 *
 * Modes:
 *  1) Parents ↔ Parents Dengele
 *  2) Children ↔ Children Dengele
 *  3) Parents → Children Besle + (Opsiyonel) Rebalance
 *
 * Key rules:
 *  - GLOBAL imbalance = only WARNING (never blocks)
 *  - Storage cap: Children max %80 (and optionally balance modes also cap %80)
 *  - Parent keep: %20 (feed mode)
 *  - 1 merchant carries ONLY ONE resource type, up to 1000
 *  - Execute speed: 1 op / sec (slow but safe)
 */

(function () {
  "use strict";

  // ===== Singleton =====
  const Y = (window.__YAVER_RO3__ = window.__YAVER_RO3__ || {});
  if (Y.__running) {
    console.warn("[YRO3] Already running. Use window.__YAVER_RO3__.destroy() then rerun.");
    return;
  }
  Y.__running = true;

  // ===== Config =====
  const CFG = (Y.CFG = {
    PANEL_ID: "yaver_ro3_panel",
    STYLE_ID: "yaver_ro3_style",

    CHUNK: 1000,              // 1 merchant capacity
    OPS_PER_SEC: 1,           // execute throttle
    MAX_ORDERS: 2000,

    CAP_PCT: 0.80,            // max fill for balancing + children cap
    CHILD_TARGET_PCT: 0.80,   // feed target for children
    PARENT_KEEP_PCT: 0.20,    // parent keep minimum (feed)
    ALLOW_CHILD_REBALANCE_AFTER_FEED: true,
    ALLOW_PARENT_REBALANCE_AFTER_FEED: true,

    MIX_MODE: "ratio",        // "ratio" or "equal"
    IMBALANCE_WARN_THRESHOLD: 0.20, // warn if >20%

    MERCHANT_MIN_PER_FIELD_EST: 30, // ETA estimate (minutes/field baseline)
    BACKOFF_ON_FAIL_MS: 1500,       // if send fails, wait extra
  });

  // ===== Icons (relative paths work in TW) =====
  const ICON = {
    wood: "/graphic/holz.png",
    stone: "/graphic/lehm.png",
    iron: "/graphic/eisen.png",
    storage: "/graphic/buildings/storage.png",
    market: "/graphic/buildings/market.png",
    speed: "/graphic/unit/speed.png",
  };

  // ===== Utils =====
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const clamp0 = (n) => (n > 0 ? n : 0);
  const nInt = (x) => {
    const s = String(x ?? "").replace(/[^\d]/g, "");
    return s ? parseInt(s, 10) : 0;
  };
  const fmt = (n) => (n ?? 0).toLocaleString("tr-TR");
  const dist = (x1, y1, x2, y2) => Math.hypot((x1 || 0) - (x2 || 0), (y1 || 0) - (y2 || 0));
  const sumTotal = (r) => (r.wood || 0) + (r.stone || 0) + (r.iron || 0);

  function img(src, size = 14, title = "") {
    return `<img src="${src}" style="width:${size}px;height:${size}px;vertical-align:-2px;" title="${title}">`;
  }

  function getWorldSpeedFactor() {
    const gd = window.game_data || {};
    const speed = parseFloat(gd?.config?.speed ?? gd?.speed ?? 1) || 1;
    const unitSpeed = parseFloat(gd?.config?.unit_speed ?? gd?.unit_speed ?? 1) || 1;
    return { speed, unitSpeed };
  }

  function estimateTravelSeconds(distanceFields) {
    const { speed, unitSpeed } = getWorldSpeedFactor();
    const baseMin = CFG.MERCHANT_MIN_PER_FIELD_EST || 30;
    const sec = (distanceFields * baseMin * 60) / (speed * unitSpeed);
    return Math.max(0, Math.round(sec));
  }

  function fmtHMS(sec) {
    if (!sec || sec <= 0) return "—";
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  }

  function computeImbalance(totals) {
    const t = sumTotal(totals);
    const mean = t / 3 || 1;
    const dev = {
      wood: (totals.wood - mean) / mean,
      stone: (totals.stone - mean) / mean,
      iron: (totals.iron - mean) / mean,
    };
    const maxAbs = Math.max(Math.abs(dev.wood), Math.abs(dev.stone), Math.abs(dev.iron));
    return { dev, maxAbs };
  }

  function computeMixRatioFromTotals(totals) {
    const t = sumTotal(totals);
    if (!t) return { wood: 1 / 3, stone: 1 / 3, iron: 1 / 3 };
    return { wood: totals.wood / t, stone: totals.stone / t, iron: totals.iron / t };
  }

  function parseHTML(html) {
    return new DOMParser().parseFromString(html, "text/html");
  }

  // ===== UI =====
  function ensureUI() {
    if (document.getElementById(CFG.PANEL_ID)) return;

    const st = document.createElement("style");
    st.id = CFG.STYLE_ID;
    st.textContent = `
      #${CFG.PANEL_ID}{
        position:fixed; z-index:99999; top:80px; left:20px;
        width: 980px; max-width: calc(100vw - 40px);
        background: rgba(245,232,203,.98);
        border:2px solid #7b5b2a; border-radius:10px;
        box-shadow:0 8px 30px rgba(0,0,0,.25);
        font-family: Arial, sans-serif;
      }
      #${CFG.PANEL_ID} .hdr{
        padding:10px 12px; display:flex; align-items:center; justify-content:space-between;
        border-bottom:1px solid rgba(0,0,0,.15);
      }
      #${CFG.PANEL_ID} .hdr h3{ margin:0; font-size:18px; }
      #${CFG.PANEL_ID} .row{ padding:10px 12px; }
      #${CFG.PANEL_ID} .btns{ display:flex; gap:10px; flex-wrap:wrap; align-items:center; }
      #${CFG.PANEL_ID} button{
        border:1px solid #4b3b1d; background:#2fa64a; color:#fff; font-weight:700;
        padding:6px 10px; border-radius:8px; cursor:pointer;
      }
      #${CFG.PANEL_ID} button.gray{ background:#666; }
      #${CFG.PANEL_ID} button.stop{ background:#8b5a2b; }
      #${CFG.PANEL_ID} .meta{ display:flex; gap:12px; flex-wrap:wrap; align-items:center; margin-top:8px; }
      #${CFG.PANEL_ID} .pill{
        background: rgba(0,0,0,.08); border:1px solid rgba(0,0,0,.12);
        border-radius:999px; padding:4px 10px; font-size:13px;
      }
      #${CFG.PANEL_ID} .warn{
        background:#8b0d0d; color:#fff; padding:8px 10px; border-radius:8px;
        font-weight:700; margin-top:8px;
      }
      #${CFG.PANEL_ID} .ok{
        background:#1f7a2f; color:#fff; padding:6px 10px; border-radius:8px;
        font-weight:700; margin-top:8px; display:inline-block;
      }
      #${CFG.PANEL_ID} table{ width:100%; border-collapse:collapse; font-size:12px; }
      #${CFG.PANEL_ID} th, #${CFG.PANEL_ID} td{
        border:1px solid rgba(0,0,0,.2); padding:4px 6px; text-align:center;
      }
      #${CFG.PANEL_ID} th{ background: rgba(0,0,0,.08); }
      #${CFG.PANEL_ID} .small{ font-size:11px; opacity:.85; }
      #${CFG.PANEL_ID} .right{ text-align:right; }
      #${CFG.PANEL_ID} .sectionTitle{ font-weight:800; margin:6px 0; }
      #${CFG.PANEL_ID} .scroll{ max-height:260px; overflow:auto; }
    `;
    document.head.appendChild(st);

    const el = document.createElement("div");
    el.id = CFG.PANEL_ID;
    el.innerHTML = `
      <div class="hdr">
        <h3>Yaver Resource Orchestrator (V3)</h3>
        <div style="display:flex; gap:10px; align-items:center;">
          <span id="yro3_status" class="pill">Hazırlanıyor…</span>
          <button id="yro3_close" class="gray">X</button>
        </div>
      </div>

      <div class="row">
        <div class="btns">
          <button id="yro3_refresh">REFRESH DATA</button>
          <button id="yro3_p2p">1) Parents ↔ Parents Dengele</button>
          <button id="yro3_c2c">2) Children ↔ Children Dengele</button>
          <button id="yro3_feed">3) Parents → Children Besle + Rebalance</button>
          <button id="yro3_exec" class="gray">EXECUTE PLAN</button>
          <button id="yro3_stop" class="stop">STOP</button>
        </div>

        <div class="meta">
          <span class="pill">${img(ICON.storage)} Cap: <b>${Math.round(CFG.CAP_PCT * 100)}%</b></span>
          <span class="pill">${img(ICON.market)} Parent keep: <b>${Math.round(CFG.PARENT_KEEP_PCT * 100)}%</b></span>
          <span class="pill">${img(ICON.speed)} Rate: <b>${CFG.OPS_PER_SEC} op/sn</b></span>
          <span class="pill">${img(ICON.wood)} / ${img(ICON.stone)} / ${img(ICON.iron)} Shipment: <b>tek kaynak / 1000</b></span>
          <span class="pill">Mix: <b id="yro3_mix">${CFG.MIX_MODE}</b></span>
          <span class="pill small">ETA: <b>EST</b></span>
        </div>

        <div id="yro3_warn"></div>
      </div>

      <div class="row">
        <div class="sectionTitle">Toplamlar (Before)</div>
        <div id="yro3_totals" class="pill" style="width:100%;box-sizing:border-box;">—</div>
      </div>

      <div class="row">
        <div class="sectionTitle">Plan (Orders)</div>
        <div id="yro3_plan_info" class="small" style="margin:6px 0;">—</div>
        <div class="scroll">
          <table id="yro3_plan_tbl">
            <thead>
              <tr>
                <th>#</th><th>From</th><th>To</th><th>Res</th><th>Amount</th><th>M</th><th>Dist</th><th>ETA</th>
              </tr>
            </thead>
            <tbody></tbody>
          </table>
        </div>
      </div>

      <div class="row">
        <div class="sectionTitle">Simülasyon (After)</div>
        <div id="yro3_after_info" class="small" style="margin:6px 0;">—</div>
        <div class="scroll" style="max-height:320px;">
          <table id="yro3_sim_tbl">
            <thead>
              <tr>
                <th>Grp</th><th class="right">Village</th><th>${img(ICON.storage)} WH</th>
                <th>${img(ICON.wood)} W</th><th>${img(ICON.stone)} S</th><th>${img(ICON.iron)} I</th><th class="small">Tot%</th>
                <th>${img(ICON.wood)} Δ</th><th>${img(ICON.stone)} Δ</th><th>${img(ICON.iron)} Δ</th>
                <th>${img(ICON.wood)} W*</th><th>${img(ICON.stone)} S*</th><th>${img(ICON.iron)} I*</th><th class="small">Tot%*</th>
              </tr>
            </thead>
            <tbody></tbody>
          </table>
        </div>
      </div>
    `;
    document.body.appendChild(el);

    el.querySelector("#yro3_close").onclick = () => Y.destroy();
    el.querySelector("#yro3_refresh").onclick = () => Y.refreshData(true);
    el.querySelector("#yro3_p2p").onclick = () => Y.buildPlan("PARENTS_BALANCE");
    el.querySelector("#yro3_c2c").onclick = () => Y.buildPlan("CHILDREN_BALANCE");
    el.querySelector("#yro3_feed").onclick = () => Y.buildPlan("FEED");
    el.querySelector("#yro3_exec").onclick = () => Y.executePlan();
    el.querySelector("#yro3_stop").onclick = () => Y.stopExec();
  }

  function setStatus(txt) {
    const el = document.getElementById("yro3_status");
    if (el) el.textContent = txt;
  }
  function setWarn(html) {
    const el = document.getElementById("yro3_warn");
    if (el) el.innerHTML = html || "";
  }

  function renderTotals(summary) {
    const el = document.getElementById("yro3_totals");
    if (!el) return;

    const line = (label, t) =>
      `<div><b>${label}</b> — ${img(ICON.wood)} ${fmt(t.wood)} &nbsp; ${img(ICON.stone)} ${fmt(t.stone)} &nbsp; ${img(ICON.iron)} ${fmt(t.iron)} &nbsp; | <b>T:</b> ${fmt(sumTotal(t))}</div>`;

    const dev = summary.imbalance.dev;
    el.innerHTML = [
      line("Parents", summary.parentsTotals),
      line("Children", summary.childrenTotals),
      line("Global", summary.globalTotals),
      `<div class="small" style="margin-top:6px;"><b>Imbalance (Global vs mean)</b> — wood:${(dev.wood * 100).toFixed(0)}% stone:${(dev.stone * 100).toFixed(0)}% iron:${(dev.iron * 100).toFixed(0)}%</div>`,
    ].join("");
  }

  function showImbalanceWarning(summary) {
    const { dev, maxAbs } = summary.imbalance;
    if (maxAbs <= CFG.IMBALANCE_WARN_THRESHOLD) {
      setWarn(`<div class="ok">OK: Global imbalance düşük (≤ ${Math.round(CFG.IMBALANCE_WARN_THRESHOLD * 100)}%).</div>`);
      return;
    }
    // NEVER BLOCK
    setWarn(
      `<div class="warn">GLOBAL imbalance yüksek. Plan devam ediyor. Dev: wood=${(dev.wood * 100).toFixed(
        0
      )}% stone=${(dev.stone * 100).toFixed(0)}% iron=${(dev.iron * 100).toFixed(0)}%</div>`
    );
  }

  function renderPlan(plan) {
    const info = document.getElementById("yro3_plan_info");
    const tb = document.querySelector("#yro3_plan_tbl tbody");
    if (!tb) return;
    tb.innerHTML = "";

    if (!plan?.orders?.length) {
      if (info) info.textContent = "Plan boş.";
      return;
    }

    const totalMerchants = plan.orders.reduce((a, o) => a + (o.merchants || 0), 0);
    if (info) info.textContent = `Orders: ${plan.orders.length} | Total merchants: ${totalMerchants} | Mode: ${plan.mode}`;

    plan.orders.forEach((o, i) => {
      const d = dist(o.fromX, o.fromY, o.toX, o.toY);
      const eta = estimateTravelSeconds(d);

      const iconRes =
        o.res === "wood" ? img(ICON.wood) : o.res === "stone" ? img(ICON.stone) : img(ICON.iron);

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${i + 1}</td>
        <td class="right">${o.fromName}</td>
        <td class="right">${o.toName}</td>
        <td>${iconRes} ${o.res}</td>
        <td class="right">${fmt(o.amount)}</td>
        <td>${o.merchants}</td>
        <td>${d.toFixed(1)}</td>
        <td>${fmtHMS(eta)}</td>
      `;
      tb.appendChild(tr);
    });
  }

  function renderSimulation(simRows) {
    const info = document.getElementById("yro3_after_info");
    const tb = document.querySelector("#yro3_sim_tbl tbody");
    if (!tb) return;
    tb.innerHTML = "";

    if (!simRows?.length) {
      if (info) info.textContent = "—";
      return;
    }
    if (info) info.textContent = `Village rows: ${simRows.length} (before → after)`;

    simRows.forEach((r) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${r.grp}</td>
        <td class="right">${r.name} (${r.x}|${r.y})</td>
        <td>${fmt(r.wh)}</td>
        <td class="right">${fmt(r.before.wood)}</td>
        <td class="right">${fmt(r.before.stone)}</td>
        <td class="right">${fmt(r.before.iron)}</td>
        <td>${(r.beforeTotPct * 100).toFixed(1)}%</td>
        <td class="right">${fmt(r.delta.wood)}</td>
        <td class="right">${fmt(r.delta.stone)}</td>
        <td class="right">${fmt(r.delta.iron)}</td>
        <td class="right"><b>${fmt(r.after.wood)}</b></td>
        <td class="right"><b>${fmt(r.after.stone)}</b></td>
        <td class="right"><b>${fmt(r.after.iron)}</b></td>
        <td><b>${(r.afterTotPct * 100).toFixed(1)}%</b></td>
      `;
      tb.appendChild(tr);
    });
  }

  // ===== Data extraction =====
  async function fetchGroupIds() {
    // works from any page
    const url = TribalWars.buildURL("GET", "overview_villages", { mode: "prod", group: 0 });
    const doc = parseHTML(await $.get(url));
    const groups = {};
    doc.querySelectorAll(".group-menu-item").forEach((el) => {
      const name = (el.textContent || "").trim().replace(/^\[|\]$/g, "");
      const gid = el.getAttribute("data-group-id") || el.dataset?.groupId;
      if (name && gid) groups[name] = parseInt(gid, 10);
    });
    return groups;
  }

  function parseProdTable(doc) {
    const table = doc.querySelector("#production_table");
    if (!table) return [];

    const out = [];
    const rows = Array.from(table.querySelectorAll("tbody tr"));
    for (const row of rows) {
      const tds = row.querySelectorAll("td");
      if (tds.length < 6) continue;

      const vn = row.querySelector(".quickedit-vn");
      const id = vn?.getAttribute("data-id") || null;

      const label = row.querySelector(".quickedit-label")?.textContent?.trim() || "";
      const mXY = label.match(/\((\d+)\|(\d+)\)/);
      const x = mXY ? parseInt(mXY[1], 10) : null;
      const y = mXY ? parseInt(mXY[2], 10) : null;

      const name = label || (vn?.textContent || "").trim() || "—";
      const points = nInt(tds[2]?.textContent);

      // resources
      const wood = nInt(row.querySelector(".res.wood")?.textContent);
      const stone = nInt(row.querySelector(".res.stone")?.textContent);
      const iron = nInt(row.querySelector(".res.iron")?.textContent);

      // warehouse
      const wh = nInt(tds[4]?.textContent);

      // merchants free/total from market link cell (IMPORTANT: avoid picking farm "12840/17469")
      const mktA = tds[5]?.querySelector("a[href*='screen=market']");
      const mm = (mktA?.textContent || "").match(/(\d+)\s*\/\s*(\d+)/);
      const merchantsFree = mm ? parseInt(mm[1], 10) : 0;
      const merchantsTotal = mm ? parseInt(mm[2], 10) : 0;

      if (!id || x == null || y == null) continue;

      out.push({
        id: String(id),
        name,
        x,
        y,
        points,
        wh,
        res: { wood, stone, iron },
        eff: { wood, stone, iron }, // later we’ll adjust with incoming/outgoing
        merchantsFree,
        merchantsTotal,
      });
    }
    return out;
  }

  async function fetchProdGroup(groupId) {
    const url = TribalWars.buildURL("GET", "overview_villages", { mode: "prod", group: groupId });
    const doc = parseHTML(await $.get(url));
    return parseProdTable(doc);
  }

  async function fetchTransportsAll() {
    // One request: all in-transit trades
    const url = TribalWars.buildURL("GET", "overview_villages", { mode: "trader", type: "all", group: 0 });
    const html = await $.get(url);
    const doc = parseHTML(html);

    const inMap = new Map();  // id -> {wood,stone,iron}
    const outMap = new Map();

    function add(map, id, w, s, i) {
      const cur = map.get(id) || { wood: 0, stone: 0, iron: 0 };
      cur.wood += w; cur.stone += s; cur.iron += i;
      map.set(id, cur);
    }

    const rows = Array.from(doc.querySelectorAll("#trades_table tr.row_a, #trades_table tr.row_b"));
    for (const row of rows) {
      const originA = row.querySelector("td:nth-child(4) a[href*='screen=info_village&id=']");
      const targetA = row.querySelector("td:nth-child(6) a[href*='screen=info_village&id=']");
      if (!originA || !targetA) continue;

      const originId = (originA.getAttribute("href") || "").match(/id=(\d+)/)?.[1];
      const targetId = (targetA.getAttribute("href") || "").match(/id=(\d+)/)?.[1];
      if (!originId || !targetId) continue;

      const resCell = row.querySelector("td:last-child");
      const txt = resCell?.textContent || "";
      const nums = txt.split(/\s+/).map(nInt).filter((x) => x > 0);
      // In TW markup, resources are shown as three spans; easiest: parse by icons
      const wood = nInt(resCell?.querySelector(".icon.header.wood")?.parentElement?.textContent);
      const stone = nInt(resCell?.querySelector(".icon.header.stone")?.parentElement?.textContent);
      const iron = nInt(resCell?.querySelector(".icon.header.iron")?.parentElement?.textContent);

      add(outMap, String(originId), wood, stone, iron);
      add(inMap, String(targetId), wood, stone, iron);
    }

    return { inMap, outMap };
  }

  // ===== Planning core =====
  function waterfillTotals(villages, caps, totalBudget) {
    const capSum = caps.reduce((a, c) => a + c, 0);
    if (totalBudget >= capSum) {
      return { totals: caps.slice(), feasible: false, leftover: totalBudget - capSum };
    }
    // binary search λ for sum(min(cap_i, λ)) = totalBudget
    let lo = 0, hi = Math.max(...caps, 1);
    for (let it = 0; it < 50; it++) {
      const mid = (lo + hi) / 2;
      letlet sum = 0;
      for (const c of caps) sum += Math.min(c, mid);
      if (sum > totalBudget) hi = mid;
      else lo = mid;
    }
    const lambda = (lo + hi) / 2;
    const totals = caps.map((c) => Math.min(c, lambda));
    return { totals, feasible: true, leftover: 0 };
  }

  function allocateResByMix(total, mix) {
    // total -> {wood,stone,iron} sum exactly equals total (as integer)
    const raw = {
      wood: total * mix.wood,
      stone: total * mix.stone,
      iron: total * mix.iron,
    };
    const base = {
      wood: Math.floor(raw.wood),
      stone: Math.floor(raw.stone),
      iron: Math.floor(raw.iron),
    };
    let rem = Math.max(0, Math.round(total - sumTotal(base)));
    const frac = [
      { k: "wood", f: raw.wood - base.wood },
      { k: "stone", f: raw.stone - base.stone },
      { k: "iron", f: raw.iron - base.iron },
    ].sort((a, b) => b.f - a.f);
    for (let i = 0; i < frac.length && rem > 0; i++) {
      base[frac[i].k] += 1;
      rem -= 1;
      if (i === frac.length - 1) i = -1; // keep cycling if still rem
    }
    return base;
  }

  function buildWithinGroupTargets(villages) {
    const totals = villages.reduce((a, v) => {
      a.wood += v.eff.wood; a.stone += v.eff.stone; a.iron += v.eff.iron;
      return a;
    }, { wood: 0, stone: 0, iron: 0 });

    const mix = (CFG.MIX_MODE === "equal") ? { wood: 1/3, stone: 1/3, iron: 1/3 } : computeMixRatioFromTotals(totals);

    const caps = villages.map((v) => CFG.CAP_PCT * (v.wh || Math.max(1, sumTotal(v.eff))));
    const totalBudget = sumTotal(totals);

    const wf = waterfillTotals(villages, caps, totalBudget);

    const targets = new Map();
    villages.forEach((v, i) => {
      const tTotal = Math.floor(wf.totals[i]);
      const tRes = allocateResByMix(tTotal, mix);
      targets.set(String(v.id), tRes);
    });

    return { targets, groupTotals: totals, mix, wf };
  }

  function buildFeedTargets(parents, children, globalTotals) {
    const mix = (CFG.MIX_MODE === "equal") ? { wood: 1/3, stone: 1/3, iron: 1/3 } : computeMixRatioFromTotals(globalTotals);

    const keepByParent = new Map();
    parents.forEach((p) => {
      const wh = p.wh || Math.max(1, sumTotal(p.eff));
      const keepTotal = Math.floor(CFG.PARENT_KEEP_PCT * wh);
      keepByParent.set(String(p.id), allocateResByMix(keepTotal, mix));
    });

    const capByChild = new Map();
    children.forEach((c) => {
      const wh = c.wh || Math.max(1, sumTotal(c.eff));
      const capTotal = Math.floor(CFG.CHILD_TARGET_PCT * wh);
      capByChild.set(String(c.id), allocateResByMix(capTotal, mix));
    });

    return { keepByParent, capByChild, mix };
  }

  function mergeOrders(orders) {
    // merge same from->to->res
    const m = new Map();
    for (const o of orders) {
      const k = `${o.fromId}|${o.toId}|${o.res}`;
      const prev = m.get(k);
      if (!prev) m.set(k, { ...o });
      else prev.amount += o.amount;
    }
    return Array.from(m.values()).map((o) => {
      o.merchants = Math.ceil(o.amount / CFG.CHUNK);
      return o;
    });
  }

  function simulateAfter(villagesAll, orders) {
    const deltaById = new Map();
    function addDelta(id, res, amt) {
      const d = deltaById.get(id) || { wood: 0, stone: 0, iron: 0 };
      d[res] += amt;
      deltaById.set(id, d);
    }

    for (const o of orders) {
      addDelta(String(o.fromId), o.res, -o.amount);
      addDelta(String(o.toId), o.res, +o.amount);
    }

    const rows = villagesAll.map((v) => {
      const d = deltaById.get(String(v.id)) || { wood: 0, stone: 0, iron: 0 };
      const before = { ...v.eff };
      const after = { wood: before.wood + d.wood, stone: before.stone + d.stone, iron: before.iron + d.iron };
      const wh = v.wh || Math.max(1, sumTotal(before));
      return {
        id: String(v.id),
        grp: v.grp,
        name: v.name,
        x: v.x,
        y: v.y,
        wh,
        before,
        after,
        delta: d,
        beforeTotPct: Math.min(1, sumTotal(before) / wh),
        afterTotPct: Math.min(1, sumTotal(after) / wh),
      };
    });

    // children first, then low fill first
    rows.sort((a, b) => (a.grp === b.grp ? a.afterTotPct - b.afterTotPct : a.grp.localeCompare(b.grp)));
    return rows;
  }

  function planGreedyMinCost(donors, receivers, supplyMap, demandMap, mLeftMap, res) {
    const orders = [];

    // receiver priority: for children, low points first; else by demand
    const recs = receivers
      .filter((r) => (demandMap.get(String(r.id)) || 0) > 0)
      .slice()
      .sort((a, b) => (a.points || 0) - (b.points || 0));

    for (const r of recs) {
      let need = demandMap.get(String(r.id)) || 0;
      while (need > 0) {
        // best donor = minimum distance among donors with supply and merchants
        let best = null;
        let bestCost = Infinity;

        for (const d of donors) {
          if (String(d.id) === String(r.id)) continue;
          const sup = supplyMap.get(String(d.id)) || 0;
          const mLeft = mLeftMap.get(String(d.id)) || 0;
          if (sup <= 0 || mLeft <= 0) continue;

          const c = dist(d.x, d.y, r.x, r.y);
          if (c < bestCost) {
            bestCost = c;
            best = d;
          }
        }

        if (!best) break;

        const dId = String(best.id);
        const sup = supplyMap.get(dId) || 0;
        const mLeft = mLeftMap.get(dId) || 0;
        const maxSend = mLeft * CFG.CHUNK;

        const amt = Math.min(need, sup, maxSend);
        if (amt <= 0) break;

        orders.push({
          fromId: dId,
          fromName: best.name,
          fromX: best.x,
          fromY: best.y,
          toId: String(r.id),
          toName: r.name,
          toX: r.x,
          toY: r.y,
          res,
          amount: amt,
        });

        // update
        need -= amt;
        demandMap.set(String(r.id), need);
        supplyMap.set(dId, sup - amt);

        // merchant usage
        const usedMerchants = Math.ceil(amt / CFG.CHUNK);
        mLeftMap.set(dId, Math.max(0, mLeft - usedMerchants));
      }
    }

    return orders;
  }

  function buildSummary(parents, children) {
    const sumRes = (list) => list.reduce((a, v) => {
      a.wood += v.eff.wood; a.stone += v.eff.stone; a.iron += v.eff.iron;
      return a;
    }, { wood: 0, stone: 0, iron: 0 });

    const parentsTotals = sumRes(parents);
    const childrenTotals = sumRes(children);
    const globalTotals = {
      wood: parentsTotals.wood + childrenTotals.wood,
      stone: parentsTotals.stone + childrenTotals.stone,
      iron: parentsTotals.iron + childrenTotals.iron,
    };
    const imbalance = computeImbalance(globalTotals);
    return { parentsTotals, childrenTotals, globalTotals, imbalance };
  }

  // ===== Sending via map_send (multi village safe) =====
  function twMapSend(fromVillageId, toVillageId, res, amount) {
    return new Promise((resolve) => {
      const token = window.csrf_token || window.game_data?.csrf || null;

      const urlParams = {
        ajaxaction: "map_send",
        village: String(fromVillageId),
        h: token || undefined,
      };

      const data = {
        target_id: String(toVillageId),
        wood: 0,
        stone: 0,
        iron: 0,
      };
      data[res] = amount;

      // (screen, urlParams, data, callback, async=false)
      TribalWars.post("market", urlParams, data, function (resp) {
        resolve(resp);
      }, false);
    });
  }

  // ===== State =====
  Y.state = {
    groups: null,
    parents: [],
    children: [],
    plan: null,
    execFlag: false,
  };

  // ===== Refresh data =====
  Y.refreshData = async function (force = false) {
    ensureUI();
    setStatus("Veri çekiliyor…");
    setWarn("");

    try {
      const groups = await fetchGroupIds();
      const parentsG = groups["Parents"];
      const childrenG = groups["Children"];

      if (!parentsG || !childrenG) {
        setStatus("Groups bulunamadı");
        setWarn(`<div class="warn">Parents/Children group bulunamadı. (Script bunu overview_villages üzerinden arıyor.)</div>`);
        return;
      }

      const [parents, children] = await Promise.all([fetchProdGroup(parentsG), fetchProdGroup(childrenG)]);
      parents.forEach((v) => (v.grp = "P"));
      children.forEach((v) => (v.grp = "C"));

      // incoming/outgoing adjustments
      const { inMap, outMap } = await fetchTransportsAll();
      const applyIO = (v) => {
        const inc = inMap.get(String(v.id)) || { wood: 0, stone: 0, iron: 0 };
        const out = outMap.get(String(v.id)) || { wood: 0, stone: 0, iron: 0 };
        v.eff = {
          wood: clamp0(v.res.wood + inc.wood - out.wood),
          stone: clamp0(v.res.stone + inc.stone - out.stone),
          iron: clamp0(v.res.iron + inc.iron - out.iron),
        };
        v._incoming = inc;
        v._outgoing = out;
      };
      parents.forEach(applyIO);
      children.forEach(applyIO);

      Y.state.groups = { parentsG, childrenG, all: groups };
      Y.state.parents = parents;
      Y.state.children = children;

      // render totals + warn
      const summary = buildSummary(parents, children);
      renderTotals(summary);
      showImbalanceWarning(summary);

      setStatus("Hazır");
      return { parents, children, summary };
    } catch (e) {
      console.error(e);
      setStatus("Hata");
      setWarn(`<div class="warn">Veri çekme hatası: ${String(e?.message || e)}</div>`);
    }
  };

  // ===== Plan builder =====
  Y.buildPlan = async function (mode) {
    ensureUI();
    if (!Y.state.parents.length || !Y.state.children.length) {
      await Y.refreshData(true);
      if (!Y.state.parents.length || !Y.state.children.length) return;
    }

    setStatus("Planlanıyor…");
    Y.state.execFlag = false;

    const parents = Y.state.parents;
    const children = Y.state.children;
    const summary = buildSummary(parents, children);
    renderTotals(summary);
    showImbalanceWarning(summary);

    const allVillages = [...parents, ...children];

    // merchants left map (start from merchantsFree)
    const mLeftMap = new Map(allVillages.map((v) => [String(v.id), v.merchantsFree || 0]));

    let orders = [];

    // helper: build supply/demand per resource from targets
    function supplyDemandFromTargets(villages, targetsMap, resKey) {
      const supply = new Map();
      const demand = new Map();
      villages.forEach((v) => {
        const t = targetsMap.get(String(v.id));
        if (!t) return;
        const cur = v.eff[resKey] || 0;
        const tar = t[resKey] || 0;
        const diff = cur - tar;
        if (diff > 0) supply.set(String(v.id), diff);
        else if (diff < 0) demand.set(String(v.id), -diff);
      });
      return { supply, demand };
    }

    if (mode === "PARENTS_BALANCE") {
      const t = buildWithinGroupTargets(parents);
      const targets = t.targets;

      // if infeasible caps, still proceed (warn only)
      if (!t.wf.feasible) {
        setWarn(
          `<div class="warn">Uyarı: Parents toplam kaynak, cap toplamını aşıyor. Overflow: ${fmt(t.wf.leftover)}. Plan yine de “mümkün olan” dengeyi kuracak.</div>`
        );
      }

      for (const res of ["wood", "stone", "iron"]) {
        const { supply, demand } = supplyDemandFromTargets(parents, targets, res);
        const demandMap = new Map(demand);
        const supplyMap = new Map(supply);

        // receivers are those who need
        const receivers = parents.filter((v) => (demandMap.get(String(v.id)) || 0) > 0);
        const donors = parents.filter((v) => (supplyMap.get(String(v.id)) || 0) > 0);

        orders.push(...planGreedyMinCost(donors, receivers, supplyMap, demandMap, mLeftMap, res));
        if (orders.length >= CFG.MAX_ORDERS) break;
      }
    }

    if (mode === "CHILDREN_BALANCE") {
      const t = buildWithinGroupTargets(children);
      const targets = t.targets;

      if (!t.wf.feasible) {
        setWarn(
          `<div class="warn">Uyarı: Children toplam kaynak, cap toplamını aşıyor. Overflow: ${fmt(t.wf.leftover)}. Plan yine de “mümkün olan” dengeyi kuracak.</div>`
        );
      }

      for (const res of ["wood", "stone", "iron"]) {
        const { supply, demand } = supplyDemandFromTargets(children, targets, res);
        const demandMap = new Map(demand);
        const supplyMap = new Map(supply);

        const receivers = children.filter((v) => (demandMap.get(String(v.id)) || 0) > 0);
        const donors = children.filter((v) => (supplyMap.get(String(v.id)) || 0) > 0);

        orders.push(...planGreedyMinCost(donors, receivers, supplyMap, demandMap, mLeftMap, res));
        if (orders.length >= CFG.MAX_ORDERS) break;
      }
    }

    if (mode === "FEED") {
      // Feed targets (cap for children, keep for parents)
      const feed = buildFeedTargets(parents, children, summary.globalTotals);

      // supply from parents beyond keep
      const supplyByRes = { wood: new Map(), stone: new Map(), iron: new Map() };
      parents.forEach((p) => {
        const keep = feed.keepByParent.get(String(p.id)) || { wood: 0, stone: 0, iron: 0 };
        for (const res of ["wood", "stone", "iron"]) {
          const sup = Math.max(0, (p.eff[res] || 0) - (keep[res] || 0));
          if (sup > 0) supplyByRes[res].set(String(p.id), sup);
        }
      });

      // demand for children up to cap
      const demandByRes = { wood: new Map(), stone: new Map(), iron: new Map() };
      children.forEach((c) => {
        const cap = feed.capByChild.get(String(c.id)) || { wood: 0, stone: 0, iron: 0 };
        for (const res of ["wood", "stone", "iron"]) {
          const dem = Math.max(0, (cap[res] || 0) - (c.eff[res] || 0));
          if (dem > 0) demandByRes[res].set(String(c.id), dem);
        }
      });

      // plan parents -> children per resource
      for (const res of ["wood", "stone", "iron"]) {
        const donors = parents.filter((v) => (supplyByRes[res].get(String(v.id)) || 0) > 0);
       
