(() => {
  // =========================
  // Yaver Resource Orchestrator (V2.7)
  // Fixes:
  // - Child/Parent balance = resource-wise egalitarian equalization (near-equal W/S/I)
  // - No HUB (direct donor->receiver)
  // - Compact orders: 5000 clay => single order (merchants auto)
  // - Integers only
  // =========================

  const KEY = "__YAVER_RO2__";
  if (window[KEY]?.destroy) { try { window[KEY].destroy(); } catch(e) {} }
  const Y = (window[KEY] = {});
  Y.__running = true;

  const CFG = (Y.CFG = {
    CAP_PCT: 0.80,            // UI: Cap 80%
    PARENT_KEEP_PCT: 0.20,    // Parent keep
    CHILD_TARGET_PCT: 0.85,   // Feed hedefi
    OPS_PER_SEC: 5,
    MIN_MOVE: 100,            // 100 altı mikro emirleri kes
    BALANCE_PASSES: 3,        // Child/Parent balance iterasyon
    FEED_DO_CHILD_REBALANCE: true, // Feed sonrası child balance ekle
    PANEL_ID: "yaver_ro2_panel_v27",
    MERCHANT_MIN_PER_FIELD_EST: 18, // ETA kaba tahmin
  });

  const ICON = {
    wood: "/graphic/holz.png",
    stone: "/graphic/lehm.png",
    iron: "/graphic/eisen.png",
    market: "/graphic/buildings/market.png",
    wh: "/graphic/buildings/storage.png",
  };
  const ico = (src) => `<img src="${src}" style="width:14px;height:14px;vertical-align:-2px;margin-right:4px;">`;

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const parseHTML = (html) => new DOMParser().parseFromString(html, "text/html");
  const natSort = (a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
  const dist = (x1, y1, x2, y2) => Math.hypot(x1 - x2, y1 - y2);

  const nInt = (x) => {
    const s = String(x ?? "").replace(/[^\d]/g, "");
    return s ? parseInt(s, 10) : 0;
  };
  const fmt = (n) => (n ?? 0).toLocaleString("tr-TR");

  const sum3 = (r) => Math.floor((r.wood || 0) + (r.stone || 0) + (r.iron || 0));

  function computeGlobalMix(villages) {
    const t = villages.reduce((a, v) => {
      a.wood += v.cur.wood; a.stone += v.cur.stone; a.iron += v.cur.iron;
      return a;
    }, {wood:0, stone:0, iron:0});
    const T = Math.max(1, t.wood + t.stone + t.iron);
    return { wood: t.wood / T, stone: t.stone / T, iron: t.iron / T };
  }

  function fmtHMS(sec) {
    if (!sec || sec <= 0) return "—";
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  }

  // ---------- UI ----------
  function ensurePanel() {
    let el = document.getElementById(CFG.PANEL_ID);
    if (el) return el;

    const style = document.createElement("style");
    style.id = `${CFG.PANEL_ID}_style`;
    style.innerHTML = `
      #${CFG.PANEL_ID}{position:fixed;top:60px;left:20px;width:980px;max-height:90vh;overflow:auto;
        background:#f4e4bc;border:3px solid #7d510f;z-index:12000;box-shadow:0 0 15px rgba(0,0,0,.5);
        font-family:Verdana,Arial;font-size:12px;color:#333;border-radius:8px}
      #${CFG.PANEL_ID} .hdr{background:#c1a264;padding:10px;border-bottom:1px solid #7d510f;
        font-weight:700;display:flex;justify-content:space-between;align-items:center}
      #${CFG.PANEL_ID} .content{padding:10px}
      #${CFG.PANEL_ID} .row{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:10px}
      #${CFG.PANEL_ID} .btn{cursor:pointer;padding:6px 12px;background:#6c4824;color:#fff;border:1px solid #333;
        border-radius:6px;font-weight:700}
      #${CFG.PANEL_ID} .btn:hover{background:#855e35}
      #${CFG.PANEL_ID} .btn-green{background:#238c00}
      #${CFG.PANEL_ID} .btn-red{background:#a60000}
      #${CFG.PANEL_ID} .pill{display:inline-block;padding:2px 8px;background:rgba(0,0,0,.08);border-radius:6px;
        margin-right:6px;font-size:11px}
      #${CFG.PANEL_ID} table{width:100%;border-collapse:collapse;background:rgba(255,255,255,.35)}
      #${CFG.PANEL_ID} th{background:#a68448;color:#fff;padding:5px;text-align:left;position:sticky;top:0}
      #${CFG.PANEL_ID} td{border-bottom:1px solid #ccc;padding:4px;vertical-align:top}
      .y_pos{color:#0a7d00;font-weight:700}
      .y_neg{color:#b10000;font-weight:700}
      .y_row_P{background:rgba(255,235,205,.45)}
      .y_row_C{background:rgba(200,255,200,.25)}
    `;
    document.head.appendChild(style);

    el = document.createElement("div");
    el.id = CFG.PANEL_ID;
    el.innerHTML = `
      <div class="hdr">
        <span>${ico(ICON.market)} Yaver RO (V2.7) — Equalize W/S/I</span>
        <div style="display:flex;gap:10px;align-items:center">
          <span class="pill" id="y_status_pill">Hazır</span>
          <button class="btn btn-red" id="y_close">X</button>
        </div>
      </div>
      <div class="content">
        <div class="row">
          <button class="btn" id="y_p2p">1) Parents ↔ Parents Dengele</button>
          <button class="btn" id="y_c2c">2) Children ↔ Children Dengele</button>
          <button class="btn btn-green" id="y_feed">3) Parents → Children FEED + (ops) Child Rebalance</button>
          <button class="btn" id="y_exec" disabled>EXECUTE</button>
        </div>

        <div class="row">
          <span class="pill">${ico(ICON.wh)} Cap: <b>${Math.round(CFG.CAP_PCT*100)}%</b></span>
          <span class="pill">Parent keep: <b>${Math.round(CFG.PARENT_KEEP_PCT*100)}%</b></span>
          <span class="pill">Child target: <b>${Math.round(CFG.CHILD_TARGET_PCT*100)}%</b></span>
          <span class="pill">Min move: <b>${CFG.MIN_MOVE}</b></span>
          <span class="pill">Pass: <b>${CFG.BALANCE_PASSES}</b></span>
        </div>

        <div id="y_status" style="padding:10px;background:#fff5d6;border:1px solid #eec;border-radius:6px;margin-bottom:10px">
          <i>Veriler bekleniyor...</i>
        </div>

        <div class="pill">📋 PLAN</div>
        <div style="max-height:220px;overflow:auto;border:1px solid #999;margin-bottom:12px">
          <table id="y_plan_tbl">
            <thead><tr>
              <th>#</th><th>From</th><th>To</th><th>Wood</th><th>Clay</th><th>Iron</th><th>Merch</th><th>ETA</th>
            </tr></thead>
            <tbody></tbody>
          </table>
        </div>

        <div class="pill">📊 SIMULASYON (After)</div>
        <div style="max-height:340px;overflow:auto;border:1px solid #999">
          <table id="y_sim_tbl">
            <thead><tr>
              <th>Grp</th><th>Village</th><th>WH</th>
              <th>W</th><th>S</th><th>I</th><th>Tot%</th>
              <th>W*</th><th>S*</th><th>I*</th><th>Tot%*</th>
            </tr></thead>
            <tbody></tbody>
          </table>
        </div>
      </div>
    `;
    document.body.appendChild(el);

    el.querySelector("#y_close").onclick = () => Y.destroy();
    el.querySelector("#y_p2p").onclick = () => Y.buildPlan("PARENTS_BALANCE");
    el.querySelector("#y_c2c").onclick = () => Y.buildPlan("CHILDREN_BALANCE");
    el.querySelector("#y_feed").onclick = () => Y.buildPlan("FEED");
    el.querySelector("#y_exec").onclick = () => Y.executePlan();

    return el;
  }

  function setStatus(html, pill="Hazır") {
    const s = document.getElementById("y_status");
    const p = document.getElementById("y_status_pill");
    if (s) s.innerHTML = html;
    if (p) p.innerText = pill;
  }

  function renderPlan(orders) {
    const tb = document.querySelector("#y_plan_tbl tbody");
    if (!tb) return;
    tb.innerHTML = "";
    if (!orders.length) {
      tb.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:10px">Plan yok. Zaten dengeli (veya kısıtlar izin vermiyor).</td></tr>`;
      return;
    }
    orders.forEach((o, i) => {
      const d = dist(o.fromX, o.fromY, o.toX, o.toY);
      const etaSec = Math.round(d * CFG.MERCHANT_MIN_PER_FIELD_EST * 60);
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${i+1}</td>
        <td>${o.fromName}</td>
        <td><b>${o.toName}</b></td>
        <td>${o.wood ? `<b>${fmt(o.wood)}</b>` : "—"}</td>
        <td>${o.stone ? `<b>${fmt(o.stone)}</b>` : "—"}</td>
        <td>${o.iron ? `<b>${fmt(o.iron)}</b>` : "—"}</td>
        <td>${o.merchants}</td>
        <td>${fmtHMS(etaSec)}</td>
      `;
      tb.appendChild(tr);
    });
  }

  function renderSim(rows) {
    const tb = document.querySelector("#y_sim_tbl tbody");
    if (!tb) return;
    tb.innerHTML = "";

    const diffSpan = (d) => d > 0 ? `<span class="y_pos">+${fmt(d)}</span>` : (d < 0 ? `<span class="y_neg">${fmt(d)}</span>` : "0");

    rows.sort((a,b) => (a.grp !== b.grp ? a.grp.localeCompare(b.grp) : natSort(a.name, b.name)));

    for (const r of rows) {
      const tr = document.createElement("tr");
      tr.className = r.grp === "P" ? "y_row_P" : "y_row_C";
      tr.innerHTML = `
        <td style="text-align:center;font-weight:700">${r.grp}</td>
        <td>${r.name}</td>
        <td>${fmt(r.whCap)}</td>
        <td>${fmt(r.before.wood)} ${diffSpan(r.delta.wood)}</td>
        <td>${fmt(r.before.stone)} ${diffSpan(r.delta.stone)}</td>
        <td>${fmt(r.before.iron)} ${diffSpan(r.delta.iron)}</td>
        <td>${(r.beforePct*100).toFixed(1)}%</td>
        <td><b>${fmt(r.after.wood)}</b></td>
        <td><b>${fmt(r.after.stone)}</b></td>
        <td><b>${fmt(r.after.iron)}</b></td>
        <td><b>${(r.afterPct*100).toFixed(1)}%</b></td>
      `;
      tb.appendChild(tr);
    }
  }

  // ---------- Data ----------
  function getGroupsFromMenu() {
    const groups = {};
    $(".group-menu-item").each(function () {
      const name = $(this).text().trim().replace(/^\[|\]$/g, "");
      const gid = $(this).data("group-id");
      if (name) groups[name] = gid;
    });
    return groups;
  }

  async function fetchGroupData(groupId) {
    const prodUrl = TribalWars.buildURL("GET", "overview_villages", { mode: "prod", group: groupId, page: -1 });
    const doc = parseHTML(await $.get(prodUrl));
    const list = [];
    const rows = Array.from(doc.querySelectorAll("#production_table tr"));

    for (const row of rows) {
      const vn = row.querySelector(".quickedit-vn");
      if (!vn) continue;

      const id = vn.getAttribute("data-id");
      const name = vn.querySelector(".quickedit-label")?.textContent.trim() || vn.textContent.trim();
      const m = name.match(/\((\d+)\|(\d+)\)/) || vn.textContent.match(/\((\d+)\|(\d+)\)/);
      if (!id || !m) continue;

      const wood = nInt(row.querySelector(".wood")?.textContent);
      const stone = nInt(row.querySelector(".stone")?.textContent);
      const iron = nInt(row.querySelector(".iron")?.textContent);

      const ironCell = row.querySelector(".iron")?.closest("td");
      const whCell = ironCell?.nextElementSibling;
      const merchCell = whCell?.nextElementSibling;

      const whCap = nInt(whCell?.textContent) || 400000;
      const merchTxt = merchCell?.textContent || "";
      const mm = merchTxt.match(/(\d+)\s*\/\s*(\d+)/);

      list.push({
        id: String(id),
        name,
        x: parseInt(m[1], 10),
        y: parseInt(m[2], 10),
        whCap,
        merchantsFree: mm ? parseInt(mm[1], 10) : 0,
        merchantsTotal: mm ? parseInt(mm[2], 10) : 0,
        cur: { wood, stone, iron },
      });
    }

    list.sort((a,b) => natSort(a.name, b.name));
    return list;
  }

  function toState(v, grp) {
    const capTotal = Math.floor((v.whCap || 0) * CFG.CAP_PCT);
    const total = sum3(v.cur);
    return {
      ...v,
      grp,
      capTotal,
      total,
      mLeft: v.merchantsFree || 0,
      // çalışma kopyası
      w: v.cur.wood, s: v.cur.stone, i: v.cur.iron,
    };
  }

  // ---------- Planning Core ----------
  // Raw order: {fromId,toId,res,amount,...}
  function packOrders(raw, byIdMap) {
    // from|to -> {wood,stone,iron}
    const M = new Map();
    for (const o of raw) {
      const k = `${o.fromId}|${o.toId}`;
      const prev = M.get(k) || {
        fromId:o.fromId, toId:o.toId,
        wood:0, stone:0, iron:0
      };
      prev[o.res] += o.amount;
      M.set(k, prev);
    }
    const out = [];
    for (const v of M.values()) {
      const total = v.wood + v.stone + v.iron;
      if (total <= 0) continue;

      const from = byIdMap.get(v.fromId);
      const to = byIdMap.get(v.toId);
      const merchants = Math.ceil(total / 1000);

      out.push({
        ...v,
        fromName: from?.name || v.fromId,
        toName: to?.name || v.toId,
        fromX: from?.x || 0, fromY: from?.y || 0,
        toX: to?.x || 0, toY: to?.y || 0,
        merchants,
      });
    }

    // planı okunur kılmak için sıralama:
    out.sort((a,b) => natSort(a.fromName, b.fromName) || natSort(a.toName, b.toName));
    return out;
  }

  function simulateAfter(allStates, packedOrders) {
    const dMap = new Map();
    const add = (id, res, amt) => {
      const x = dMap.get(id) || {wood:0, stone:0, iron:0};
      x[res] += amt;
      dMap.set(id, x);
    };

    for (const o of packedOrders) {
      if (o.wood) { add(o.fromId,"wood",-o.wood); add(o.toId,"wood",+o.wood); }
      if (o.stone){ add(o.fromId,"stone",-o.stone); add(o.toId,"stone",+o.stone); }
      if (o.iron) { add(o.fromId,"iron",-o.iron); add(o.toId,"iron",+o.iron); }
    }

    return allStates.map(v => {
      const delta = dMap.get(v.id) || {wood:0, stone:0, iron:0};
      const before = {...v.cur};
      const after = {
        wood: Math.max(0, before.wood + delta.wood),
        stone: Math.max(0, before.stone + delta.stone),
        iron: Math.max(0, before.iron + delta.iron),
      };
      const beforeTot = sum3(before);
      const afterTot = sum3(after);
      const wh = Math.max(1, v.whCap || 1);
      return {
        grp: v.grp, id: v.id, name: v.name, whCap: v.whCap,
        before, after, delta,
        beforePct: Math.min(1, beforeTot / wh),
        afterPct: Math.min(1, afterTot / wh),
      };
    });
  }

  function balanceGroup(states, passes) {
    // states: toState list (w,s,i,total,capTotal,mLeft)
    const raw = [];
    const byId = new Map(states.map(v => [v.id, v]));

    const RES = [
      {key:"wood", f:"w"},
      {key:"stone", f:"s"},
      {key:"iron", f:"i"},
    ];

    const doOneRes = (resKey, field) => {
      // toplam res (group içinde)
      const totalRes = states.reduce((a,v)=>a + v[field], 0);

      // kapasitesi dolu olanlar "fixed" sayılır (space==0)
      const fixed = states.filter(v => Math.max(0, v.capTotal - v.total) <= 0);
      const free  = states.filter(v => Math.max(0, v.capTotal - v.total) > 0);

      // free yoksa eşitleme yok
      if (!free.length) return;

      const fixedSum = fixed.reduce((a,v)=>a + v[field], 0);
      const remainingSum = totalRes - fixedSum;
      const mean = remainingSum / free.length; // hedef mean (free set üzerinde)

      // donors & receivers (free set + donors all)
      const donors = states
        .map(v => ({ v, supply: Math.floor(v[field] - mean) }))
        .filter(x => x.supply >= CFG.MIN_MOVE && x.v.mLeft > 0)
        .sort((a,b) => b.supply - a.supply);

      const receivers = free
        .map(v => ({ v, need: Math.floor(mean - v[field]) }))
        .filter(x => x.need >= CFG.MIN_MOVE)
        .sort((a,b) => a.v[field] - b.v[field]);

      for (const r of receivers) {
        let need = r.need;
        while (need >= CFG.MIN_MOVE) {
          const space = Math.max(0, r.v.capTotal - r.v.total);
          if (space < CFG.MIN_MOVE) break;

          // en çok supply olan donor (hub yok: direkt)
          const d = donors.find(x => x.v.id !== r.v.id && x.supply >= CFG.MIN_MOVE && x.v.mLeft > 0);
          if (!d) break;

          const maxByMerch = d.v.mLeft * 1000;
          let amount = Math.min(need, d.supply, space, maxByMerch);
          amount = Math.floor(amount);
          if (amount < CFG.MIN_MOVE) break;

          // merchant tüketimi
          const merchNeed = Math.ceil(amount / 1000);
          if (merchNeed > d.v.mLeft) {
            amount = d.v.mLeft * 1000;
          }
          amount = Math.floor(amount);
          if (amount < CFG.MIN_MOVE) break;

          raw.push({
            fromId: d.v.id, toId: r.v.id,
            res: resKey, amount,
          });

          // state güncelle
          d.v.mLeft -= Math.ceil(amount / 1000);
          d.v[field] -= amount;
          d.v.total -= amount;

          r.v[field] += amount;
          r.v.total += amount;

          // supply/need güncelle
          d.supply -= amount;
          need -= amount;
        }
      }
    };

    for (let pass = 0; pass < (passes || 1); pass++) {
      for (const R of RES) doOneRes(R.key, R.f);
    }

    return { rawOrders: raw };
  }

  function planFeedDirect(parents, children, globalMix) {
    // hedefler: parents keep, children target (ratio)
    const raw = [];
    const RES = [
      {key:"wood", f:"w"},
      {key:"stone", f:"s"},
      {key:"iron", f:"i"},
    ];

    // Parent supply hesapla
    const pSupply = parents.map(p => {
      const keepTotal = Math.floor(p.whCap * CFG.PARENT_KEEP_PCT);
      const keep = {
        wood: Math.floor(keepTotal * globalMix.wood),
        stone: Math.floor(keepTotal * globalMix.stone),
        iron: Math.floor(keepTotal * globalMix.iron),
      };
      return {
        p,
        supply: {
          wood: Math.max(0, p.w - keep.wood),
          stone: Math.max(0, p.s - keep.stone),
          iron: Math.max(0, p.i - keep.iron),
        }
      };
    });

    // Child need hesapla (cap/target’a göre)
    const cNeed = children.map(c => {
      const capTotal = c.capTotal; // cap already
      const targetTotal = Math.min(capTotal, Math.floor(c.whCap * CFG.CHILD_TARGET_PCT));
      const tgt = {
        wood: Math.floor(targetTotal * globalMix.wood),
        stone: Math.floor(targetTotal * globalMix.stone),
        iron: Math.floor(targetTotal * globalMix.iron),
      };
      return {
        c,
        targetTotal,
        need: {
          wood: Math.max(0, tgt.wood - c.w),
          stone: Math.max(0, tgt.stone - c.s),
          iron: Math.max(0, tgt.iron - c.i),
        }
      };
    });

    // receiver sırası: en çok aç olan önce (toplam need)
    cNeed.sort((a,b) => ( (b.need.wood+b.need.stone+b.need.iron) - (a.need.wood+a.need.stone+a.need.iron) ));

    for (const R of RES) {
      for (const rr of cNeed) {
        let need = rr.need[R.key];
        while (need >= CFG.MIN_MOVE) {
          const space = Math.max(0, rr.c.capTotal - rr.c.total);
          if (space < CFG.MIN_MOVE) break;

          // en çok supply olan parent seç
          const dd = pSupply
            .filter(x => x.p.mLeft > 0 && x.supply[R.key] >= CFG.MIN_MOVE)
            .sort((a,b) => b.supply[R.key] - a.supply[R.key])[0];
          if (!dd) break;

          const maxByMerch = dd.p.mLeft * 1000;
          let amount = Math.min(need, dd.supply[R.key], space, maxByMerch);
          amount = Math.floor(amount);
          if (amount < CFG.MIN_MOVE) break;

          raw.push({ fromId: dd.p.id, toId: rr.c.id, res: R.key, amount });

          dd.p.mLeft -= Math.ceil(amount / 1000);
          dd.p[R.f] -= amount;
          dd.p.total -= amount;
          dd.supply[R.key] -= amount;

          rr.c[R.f] += amount;
          rr.c.total += amount;

          need -= amount;
        }
      }
    }

    return { rawOrders: raw };
  }

  function computeDeviation(groupStates) {
    const n = groupStates.length || 1;
    const avg = {
      wood: groupStates.reduce((a,v)=>a+v.w,0)/n,
      stone: groupStates.reduce((a,v)=>a+v.s,0)/n,
      iron: groupStates.reduce((a,v)=>a+v.i,0)/n,
    };
    const maxDev = {
      wood: Math.max(...groupStates.map(v => Math.abs(v.w-avg.wood))),
      stone: Math.max(...groupStates.map(v => Math.abs(v.s-avg.stone))),
      iron: Math.max(...groupStates.map(v => Math.abs(v.i-avg.iron))),
    };
    return { avg, maxDev };
  }

  // ---------- Main ----------
  Y.state = { parents: [], children: [], planPacked: [] };

  async function loadData() {
    setStatus("Veriler güncelleniyor...", "Yükleniyor");
    const grps = getGroupsFromMenu();
    if (!grps["Parents"] || !grps["Children"]) {
      setStatus(`<b style="color:red">HATA:</b> Menüde <b>Parents</b> ve <b>Children</b> isimli grup bulunamadı.`, "Hata");
      return false;
    }
    const [pData, cData] = await Promise.all([fetchGroupData(grps["Parents"]), fetchGroupData(grps["Children"])]);
    Y.state.parents = pData;
    Y.state.children = cData;
    return true;
  }

  Y.buildPlan = async (mode) => {
    const ok = await loadData();
    if (!ok) return;

    const parents0 = Y.state.parents.map(v => toState(v, "P"));
    const children0 = Y.state.children.map(v => toState(v, "C"));
    const all0 = [...parents0, ...children0];

    // id->state map (isim/coord için)
    const byId = new Map(all0.map(v => [v.id, v]));

    let rawOrders = [];

    if (mode === "CHILDREN_BALANCE") {
      const st = children0;
      const { rawOrders: r1 } = balanceGroup(st, CFG.BALANCE_PASSES);
      rawOrders = r1;

      const dev = computeDeviation(st);
      setStatus(
        `<b>Children Balance:</b> hedef “W/S/I ~ eşit”.<br>
         Max sapma: W≈${fmt(Math.floor(dev.maxDev.wood))}, S≈${fmt(Math.floor(dev.maxDev.stone))}, I≈${fmt(Math.floor(dev.maxDev.iron))}.`,
        "Plan hazır"
      );
    }

    if (mode === "PARENTS_BALANCE") {
      const st = parents0;
      const { rawOrders: r1 } = balanceGroup(st, CFG.BALANCE_PASSES);
      rawOrders = r1;

      const dev = computeDeviation(st);
      setStatus(
        `<b>Parents Balance:</b> hedef “W/S/I ~ eşit”.<br>
         Max sapma: W≈${fmt(Math.floor(dev.maxDev.wood))}, S≈${fmt(Math.floor(dev.maxDev.stone))}, I≈${fmt(Math.floor(dev.maxDev.iron))}.`,
        "Plan hazır"
      );
    }

    if (mode === "FEED") {
      // Feed planı: parents->children direkt, sonra opsiyonel child rebalance
      const globalMix = computeGlobalMix([...parents0, ...children0]);

      const feedRes = planFeedDirect(parents0, children0, globalMix);
      rawOrders = rawOrders.concat(feedRes.rawOrders);

      if (CFG.FEED_DO_CHILD_REBALANCE) {
        // feed sonrası oluşan çocuk state üzerinde balance
        const balRes = balanceGroup(children0, Math.max(1, Math.floor(CFG.BALANCE_PASSES/2)));
        rawOrders = rawOrders.concat(balRes.rawOrders);
      }

      setStatus(
        `<b>FEED:</b> parents → children direkt dağıtım (hub yok)${CFG.FEED_DO_CHILD_REBALANCE ? " + child rebalance" : ""}.<br>
         Mix: ratio (global).`,
        "Plan hazır"
      );
    }

    // pack / compact (multi-resource per from->to)
    const packed = packOrders(rawOrders, byId);

    // sim
    const simRows = simulateAfter(all0, packed);

    // UI
    renderPlan(packed);
    renderSim(simRows);

    Y.state.planPacked = packed;

    const execBtn = document.getElementById("y_exec");
    execBtn.disabled = packed.length === 0;
    execBtn.textContent = packed.length ? `EXECUTE (${packed.length})` : "EXECUTE";
  };

  Y.executePlan = async () => {
    const orders = Y.state.planPacked || [];
    if (!orders.length) return;

    const btn = document.getElementById("y_exec");
    btn.disabled = true;
    btn.textContent = "⏳ Çalışıyor...";
    setStatus("Gönderimler başladı...", "Çalışıyor");

    const token = window.csrf_token || window.game_data?.csrf;
    let ok = 0;

    for (let i = 0; i < orders.length; i++) {
      if (!Y.__running) break;
      const o = orders[i];
      const total = (o.wood||0) + (o.stone||0) + (o.iron||0);

      setStatus(
        `🚀 Gönderiliyor ${i+1}/${orders.length}<br>
         <b>${o.fromName}</b> → <b>${o.toName}</b> | W:${fmt(o.wood||0)} S:${fmt(o.stone||0)} I:${fmt(o.iron||0)} | Tot:${fmt(total)} | Merch:${o.merchants}`,
        "Çalışıyor"
      );

      try {
        const urlConfirm = TribalWars.buildURL("POST", "market", { village: o.fromId, mode: "send", try: "confirm_send" });
        const payload = {
          target_type: "coord",
          x: o.toX, y: o.toY,
          wood: Math.floor(o.wood||0),
          stone: Math.floor(o.stone||0),
          iron: Math.floor(o.iron||0),
          h: token
        };

        const res1 = await $.post(urlConfirm, payload);
        const doc1 = parseHTML(res1);
        if (doc1.querySelector(".error_box")) {
          console.warn("confirm_send error:", doc1.querySelector(".error_box")?.textContent?.trim());
          continue;
        }

        const form = doc1.querySelector("form");
        if (form) {
          const data = {};
          form.querySelectorAll("input").forEach(inp => { if (inp.name) data[inp.name] = inp.value; });
          await $.post(form.getAttribute("action"), data);
          ok++;
        }
      } catch (e) {
        console.error(e);
      }

      await sleep(1000 / CFG.OPS_PER_SEC);
    }

    setStatus(`✅ <b>Bitti.</b> ${ok}/${orders.length} gönderim tamamlandı.`, "Bitti");
    btn.textContent = "Bitti";
  };

  Y.destroy = () => {
    Y.__running = false;
    document.getElementById(CFG.PANEL_ID)?.remove();
    document.getElementById(`${CFG.PANEL_ID}_style`)?.remove();
  };

  ensurePanel();
  setStatus("Hazır. Bir mod seç.", "Hazır");
})();
