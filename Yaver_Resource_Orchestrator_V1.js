/*
 * Script Name: Yaver Resource Orchestrator
 * Author: controleng + ChatGPT
 * Version: 1.0
 *
 * Core rules:
 * - Works from ANY page (fetches needed overviews itself)
 * - Reads group members dynamically every run: Parents / Children
 * - Counts incoming resources (overview_villages -> trader -> type=inc)
 * - Hard caps:
 *    * TOTAL village resources <= storage * 0.80   (Children + Parents)
 *    * Parents keep TOTAL >= storage * 0.20
 * - ONE shipment = ONE resource type only (wood OR stone OR iron). No mixing.
 * - 1 operation / second when executing (avoid 429)
 * - Produces plan first; executes only after your confirmation button.
 */

(function () {
  "use strict";

  // ===================== CONFIG =====================
  const CFG = {
    GROUP_PARENT_NAME: "Parents",
    GROUP_CHILD_NAME: "Children",

    FILL_CAP: 0.80,              // villages should not exceed 80% storage total
    PARENT_MIN_KEEP_FILL: 0.20,  // parents keep at least 20% storage total

    MERCHANT_CAPACITY: 1000,     // read as constant (your rule). (Game may allow mixing; we won't.)
    OPS_PER_SECOND: 1,           // throttle execution
    MIN_UNIT: 1000,              // we ship in 1000 units to match "1 merchant = 1000 of one type"

    // If global resource imbalance is too big, stop and warn (suggest exchange)
    GLOBAL_IMBALANCE_THRESHOLD: 0.20, // 20%

    // Rebalancing toggles (Mode 3)
    ALLOW_PARENT_REBALANCE: true,
    ALLOW_CHILD_REBALANCE: true,

    // Distance weighting (enabled)
    USE_DISTANCE: true,

    // Priority weighting for Children feeding (lower points => higher priority)
    PRIORITY_ALPHA_POINTS: 0.75,
    PRIORITY_BETA_STORAGE: 0.25,

    // Safety: maximum commands allowed in a plan (avoid insane lists)
    MAX_COMMANDS: 500,

    // UI
    PANEL_ID: "yaver-res-orch-panel",
  };

  // ===================== STATE =====================
  window.__YAVER_RES_ORCH__ = window.__YAVER_RES_ORCH__ || {};
  window.__YAVER_RES_ORCH__.stop = false;

  // ===================== HELPERS =====================
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  function nDigits(str) {
    return parseInt(String(str || "").replace(/[^\d]/g, ""), 10) || 0;
  }

  function parseCoord(text) {
    const m = String(text || "").match(/\((\d+)\|(\d+)\)/);
    if (!m) return { x: null, y: null };
    return { x: parseInt(m[1], 10), y: parseInt(m[2], 10) };
  }

  function dist(a, b) {
    if (a.x == null || a.y == null || b.x == null || b.y == null) return 0;
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.hypot(dx, dy);
  }

  function clamp(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
  }

  function sumRes(r) {
    return (r.wood || 0) + (r.stone || 0) + (r.iron || 0);
  }

  function copyRes(r) {
    return { wood: r.wood || 0, stone: r.stone || 0, iron: r.iron || 0 };
  }

  function addRes(a, b) {
    a.wood += b.wood || 0;
    a.stone += b.stone || 0;
    a.iron += b.iron || 0;
    return a;
  }

  function subRes(a, b) {
    a.wood -= b.wood || 0;
    a.stone -= b.stone || 0;
    a.iron -= b.iron || 0;
    return a;
  }

  function onlyOneResourcePayload(resource, amount) {
    return {
      wood: resource === "wood" ? amount : 0,
      stone: resource === "stone" ? amount : 0,
      iron: resource === "iron" ? amount : 0,
    };
  }

  function getCsrf() {
    return window.csrf_token || window.game_data?.csrf || null;
  }

  function buildURL(method, screen, params = {}) {
    // sitter support (same idea as WHBalancer)
    if (window.game_data?.player?.sitter > 0) {
      params.t = window.game_data.player.id;
    }
    return TribalWars.buildURL(method, screen, params);
  }

  async function fetchDoc(url) {
    const html = await $.get(url);
    return new DOMParser().parseFromString(html, "text/html");
  }

  // ===================== DATA FETCH =====================

  async function getGroupIds() {
    // Works from any page: fetch an overview that contains group menu
    const url = buildURL("GET", "overview_villages", { mode: "prod", page: -1, group: 0 });
    const doc = await fetchDoc(url);

    const groups = {};
    const items = Array.from(doc.querySelectorAll(".group-menu-item"));
    for (const el of items) {
      const raw = (el.textContent || "").trim();
      const name = raw.replace(/^\[|\]$/g, "").trim();
      const gid = el.getAttribute("data-group-id") || el.dataset.groupId;
      if (name && gid != null) groups[name] = parseInt(gid, 10);
    }

    return groups;
  }

  async function getProdVillages(groupId) {
    const url = buildURL("GET", "overview_villages", { mode: "prod", page: -1, group: groupId });
    const doc = await fetchDoc(url);

    const rows = Array.from(doc.querySelectorAll("#production_table tr"))
      .filter((tr) => tr.querySelector(".quickedit-vn"));

    const villages = [];

    for (const tr of rows) {
      const id = parseInt(tr.querySelector(".quickedit-vn")?.getAttribute("data-id") || "0", 10);
      if (!id) continue;

      const name = (tr.querySelector(".quickedit-label")?.textContent || tr.textContent || "").trim();
      const { x, y } = parseCoord(name);

      // Points column is usually 3rd cell, but safer to parse from the explicit cell order:
      // production_table columns: [note, village, points, resources, warehouse, merchants, farm, ...]
      const tds = Array.from(tr.querySelectorAll("td"));
      const points = nDigits(tds[2]?.textContent);

      // resources
      const wood = nDigits(tr.querySelector(".res.wood")?.textContent);
      const stone = nDigits(tr.querySelector(".res.stone")?.textContent);
      const iron = nDigits(tr.querySelector(".res.iron")?.textContent);

      const storage = nDigits(tds[4]?.textContent);

      // merchants "104/110"
      const mText = (tr.querySelector('a[href*="screen=market"]')?.textContent || "").trim();
      let merchantsAvail = 0, merchantsTotal = 0;
      const mm = mText.match(/(\d+)\s*\/\s*(\d+)/);
      if (mm) {
        merchantsAvail = parseInt(mm[1], 10);
        merchantsTotal = parseInt(mm[2], 10);
      } else {
        merchantsAvail = nDigits(mText);
        merchantsTotal = merchantsAvail;
      }

      villages.push({
        id,
        name,
        x,
        y,
        points,
        storage,
        merchantsAvail,
        merchantsTotal,
        res: { wood, stone, iron },
        incoming: { wood: 0, stone: 0, iron: 0 },
      });
    }

    return villages;
  }

  async function getIncomingMap(groupId) {
    // Incoming transports for villages in this group
    const url = buildURL("GET", "overview_villages", { mode: "trader", type: "inc", page: -1, group: groupId });
    const doc = await fetchDoc(url);

    const rows = Array.from(doc.querySelectorAll("#trades_table tr"))
      .filter((tr) => tr.querySelector("td") && tr.querySelectorAll("td").length >= 6);

    const inc = {}; // villageId -> {wood,stone,iron}

    for (const tr of rows) {
      const links = Array.from(tr.querySelectorAll('a[href*="screen=info_village"][href*="id="]'));
      if (!links.length) continue;

      const targetLink = links[links.length - 1];
      const m = targetLink.href.match(/id=(\d+)/);
      if (!m) continue;
      const vid = parseInt(m[1], 10);

      const amounts = { wood: 0, stone: 0, iron: 0 };

      for (const r of ["wood", "stone", "iron"]) {
        const icon = tr.querySelector(`.icon.header.${r}`);
        if (!icon) continue;
        const wrap = icon.closest(".nowrap") || icon.parentElement;
        const val = nDigits(wrap?.textContent);
        if (val) amounts[r] = val;
      }

      if (!inc[vid]) inc[vid] = { wood: 0, stone: 0, iron: 0 };
      inc[vid].wood += amounts.wood;
      inc[vid].stone += amounts.stone;
      inc[vid].iron += amounts.iron;
    }

    return inc;
  }

  // ===================== OPT / TARGETS =====================

  function globalImbalanceCheck(villages) {
    const totals = { wood: 0, stone: 0, iron: 0 };
    for (const v of villages) {
      totals.wood += v.eff.wood;
      totals.stone += v.eff.stone;
      totals.iron += v.eff.iron;
    }
    const mean = (totals.wood + totals.stone + totals.iron) / 3;
    if (mean <= 0) return { ok: true, totals, mean, deviations: { wood: 0, stone: 0, iron: 0 } };

    const dev = {
      wood: Math.abs(totals.wood - mean) / mean,
      stone: Math.abs(totals.stone - mean) / mean,
      iron: Math.abs(totals.iron - mean) / mean,
    };
    const ok = dev.wood <= CFG.GLOBAL_IMBALANCE_THRESHOLD &&
               dev.stone <= CFG.GLOBAL_IMBALANCE_THRESHOLD &&
               dev.iron <= CFG.GLOBAL_IMBALANCE_THRESHOLD;

    return { ok, totals, mean, deviations: dev };
  }

  function waterfillTargets(total, lowers, uppers) {
    // Iterative projection to satisfy sum with per-village bounds
    const n = lowers.length;
    const target = new Array(n).fill(0);

    let remaining = [];
    for (let i = 0; i < n; i++) remaining.push(i);

    let remTotal = total;

    while (true) {
      if (!remaining.length) break;

      const share = remTotal / remaining.length;
      let changed = false;

      for (let k = remaining.length - 1; k >= 0; k--) {
        const i = remaining[k];
        if (share > uppers[i]) {
          target[i] = uppers[i];
          remTotal -= uppers[i];
          remaining.splice(k, 1);
          changed = true;
        } else if (share < lowers[i]) {
          target[i] = lowers[i];
          remTotal -= lowers[i];
          remaining.splice(k, 1);
          changed = true;
        }
      }

      if (!changed) {
        for (const i of remaining) target[i] = share;
        break;
      }
    }

    return target;
  }

  function computeWithinGroupTargets(villages, minKeepFill) {
    // Add incoming to get effective resources
    for (const v of villages) {
      v.eff = {
        wood: (v.res.wood + v.incoming.wood),
        stone: (v.res.stone + v.incoming.stone),
        iron: (v.res.iron + v.incoming.iron),
      };
      v.effTotal = sumRes(v.eff);
      v.capTotal = Math.floor(v.storage * CFG.FILL_CAP);
      v.minKeepTotal = Math.floor(v.storage * (minKeepFill || 0));
    }

    const totalCap = villages.reduce((a, v) => a + v.capTotal, 0);
    const totalEff = villages.reduce((a, v) => a + v.effTotal, 0);
    const sumLower = villages.reduce((a, v) => a + v.minKeepTotal, 0);

    if (totalEff > totalCap) {
      return { ok: false, reason: "Group total resources exceed sum of 80% caps. Build storage or move resources out of this group." };
    }
    if (totalEff < sumLower) {
      return { ok: false, reason: "Group total resources are below Parents min-keep constraints. Not feasible." };
    }

    const lowers = villages.map(v => v.minKeepTotal);
    const uppers = villages.map(v => v.capTotal);
    const targetTotals = waterfillTargets(totalEff, lowers, uppers);

    // Global balance check: if one res is too scarce, stop (as you requested)
    const chk = globalImbalanceCheck(villages);
    if (!chk.ok) {
      const msg =
        `Global imbalance too high (>${Math.round(CFG.GLOBAL_IMBALANCE_THRESHOLD * 100)}%). ` +
        `wood dev=${Math.round(chk.deviations.wood * 100)}% ` +
        `stone dev=${Math.round(chk.deviations.stone * 100)}% ` +
        `iron dev=${Math.round(chk.deviations.iron * 100)}%. ` +
        `Suggestion: use Exchange to convert surplus into deficit resource, then run script again.`;
      return { ok: false, reason: msg };
    }

    // Desired per-resource targets: equal split
    for (let i = 0; i < villages.length; i++) {
      const tTot = targetTotals[i];
      const tEach = tTot / 3;
      villages[i].target = {
        total: tTot,
        wood: tEach,
        stone: tEach,
        iron: tEach,
      };
    }

    return { ok: true };
  }

  function computeChildrenTargetsForFeeding(children) {
    for (const v of children) {
      v.eff = {
        wood: (v.res.wood + v.incoming.wood),
        stone: (v.res.stone + v.incoming.stone),
        iron: (v.res.iron + v.incoming.iron),
      };
      v.effTotal = sumRes(v.eff);
      v.capTotal = Math.floor(v.storage * CFG.FILL_CAP);
      v.minKeepTotal = 0;
      v.target = {
        total: v.capTotal,           // for feeding we aim 80% total
        wood: v.capTotal / 3,
        stone: v.capTotal / 3,
        iron: v.capTotal / 3,
      };
    }
  }

  function computeParentsMinKeepForFeeding(parents) {
    for (const v of parents) {
      v.eff = {
        wood: (v.res.wood + v.incoming.wood),
        stone: (v.res.stone + v.incoming.stone),
        iron: (v.res.iron + v.incoming.iron),
      };
      v.effTotal = sumRes(v.eff);
      v.capTotal = Math.floor(v.storage * CFG.FILL_CAP);
      v.minKeepTotal = Math.floor(v.storage * CFG.PARENT_MIN_KEEP_FILL);
      v.minKeepEach = v.minKeepTotal / 3;
    }
  }

  function priorityScore(children) {
    const pts = children.map(c => c.points || 0);
    const stg = children.map(c => c.storage || 0);
    const minP = Math.min(...pts), maxP = Math.max(...pts);
    const minS = Math.min(...stg), maxS = Math.max(...stg);

    for (const c of children) {
      const pNorm = (maxP === minP) ? 0.5 : (maxP - c.points) / (maxP - minP); // low points => high
      const sNorm = (maxS === minS) ? 0.5 : (maxS - c.storage) / (maxS - minS); // low storage => high
      c.priority =
        CFG.PRIORITY_ALPHA_POINTS * pNorm +
        CFG.PRIORITY_BETA_STORAGE * sNorm;
    }
  }

  // ===================== PLANNER =====================

  function mergeTransfers(transfers) {
    const key = (t) => `${t.fromId}|${t.toId}|${t.resource}`;
    const map = new Map();
    for (const t of transfers) {
      const k = key(t);
      const prev = map.get(k);
      if (!prev) map.set(k, { ...t });
      else {
        prev.amount += t.amount;
        prev.merchants += t.merchants;
        // keep min distance just for display
        prev.distance = Math.min(prev.distance, t.distance);
      }
    }
    return Array.from(map.values());
  }

  function planTransfers(villages, donorsFilter, receiversFilter, tag) {
    // tag just for grouping display
    const transfers = [];

    for (const v of villages) {
      v.deltaOut = { wood: 0, stone: 0, iron: 0 };
      v.deltaIn = { wood: 0, stone: 0, iron: 0 };
      v.mLeft = v.merchantsAvail || 0;
    }

    // For each resource independently
    for (const res of ["wood", "stone", "iron"]) {
      // deficits/surpluses in 1000-units
      const donors = villages
        .filter(donorsFilter)
        .map(v => {
          const surplus = Math.floor(((v.eff[res] - v.target[res]) > 0 ? (v.eff[res] - v.target[res]) : 0) / CFG.MIN_UNIT);
          return { v, units: surplus };
        })
        .filter(x => x.units > 0 && x.v.mLeft > 0);

      const receivers = villages
        .filter(receiversFilter)
        .map(v => {
          const deficit = Math.floor(((v.target[res] - v.eff[res]) > 0 ? (v.target[res] - v.eff[res]) : 0) / CFG.MIN_UNIT);
          return { v, units: deficit };
        })
        .filter(x => x.units > 0);

      // Sort receivers biggest deficit first (caller can pre-sort villages for priority)
      receivers.sort((a, b) => b.units - a.units);

      for (const rcv of receivers) {
        let need = rcv.units;

        while (need > 0) {
          // choose best donor: min distance, with supply and merchants
          let best = null;
          let bestCost = Infinity;

          for (const d of donors) {
            if (d.units <= 0) continue;
            if (d.v.mLeft <= 0) continue;

            const cost = CFG.USE_DISTANCE ? dist(d.v, rcv.v) : 0;
            if (cost < bestCost) {
              bestCost = cost;
              best = d;
            }
          }

          if (!best) break;

          const canSend = Math.min(need, best.units, best.v.mLeft);
          if (canSend <= 0) break;

          const amount = canSend * CFG.MIN_UNIT;

          transfers.push({
            tag,
            fromId: best.v.id,
            fromName: best.v.name,
            toId: rcv.v.id,
            toName: rcv.v.name,
            resource: res,
            amount,
            merchants: canSend,
            distance: bestCost,
          });

          // update states
          best.units -= canSend;
          best.v.mLeft -= canSend;
          need -= canSend;

          best.v.deltaOut[res] += amount;
          rcv.v.deltaIn[res] += amount;

          if (transfers.length >= CFG.MAX_COMMANDS) {
            return { transfers, note: "MAX_COMMANDS reached. Plan truncated." };
          }
        }
      }
    }

    return { transfers, note: null };
  }

  function simulateApply(villages, transfers) {
    const map = new Map(villages.map(v => [v.id, v]));

    for (const v of villages) {
      v.sim = copyRes(v.eff); // start from effective (includes incoming)
    }

    for (const t of transfers) {
      const from = map.get(t.fromId);
      const to = map.get(t.toId);
      if (!from || !to) continue;
      from.sim[t.resource] -= t.amount;
      to.sim[t.resource] += t.amount;
    }

    for (const v of villages) {
      v.simTotal = sumRes(v.sim);
      v.simFill = v.storage > 0 ? (v.simTotal / v.storage) : 0;
    }
  }

  function validatePlan(parents, children, transfers, mode) {
    const errors = [];

    // merchant usage per sender
    const used = new Map(); // villageId -> merchants
    for (const t of transfers) {
      used.set(t.fromId, (used.get(t.fromId) || 0) + t.merchants);
      // one resource only
      if (!["wood", "stone", "iron"].includes(t.resource)) errors.push(`Bad resource in transfer: ${t.resource}`);
      if (t.amount % CFG.MIN_UNIT !== 0) errors.push(`Amount not multiple of 1000: ${t.amount}`);
    }

    // check used <= available
    const all = [...parents, ...children];
    const vmap = new Map(all.map(v => [v.id, v]));
    for (const [vid, m] of used.entries()) {
      const v = vmap.get(vid);
      if (v && m > (v.merchantsAvail || 0)) errors.push(`Merchants exceeded for ${v.name}: used ${m}, avail ${v.merchantsAvail}`);
    }

    // simulate and check caps
    simulateApply(all, transfers);

    for (const v of all) {
      if (v.simTotal > v.capTotal + 1) { // +1 tolerance
        errors.push(`Cap exceeded (>80%) at ${v.name}: ${v.simTotal}/${v.capTotal}`);
      }
    }

    // parent min keep
    if (mode === "FEED" || mode === "PARENTS_BALANCE") {
      for (const p of parents) {
        const minKeep = Math.floor(p.storage * CFG.PARENT_MIN_KEEP_FILL);
        if (p.simTotal < minKeep - 1) {
          errors.push(`Parent min keep violated at ${p.name}: ${p.simTotal} < ${minKeep}`);
        }
      }
    }

    return errors;
  }

  // ===================== UI =====================

  function ensurePanel() {
    if (document.getElementById(CFG.PANEL_ID)) return;

    const html = `
      <div id="${CFG.PANEL_ID}" class="vis" style="margin:10px 0; padding:10px; border:2px solid #7d510f; background:#f4e4bc;">
        <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
          <img src="/graphic/buildings/market.png" style="width:18px;height:18px;" alt="">
          <h3 style="margin:0; color:#603000;">Yaver Resource Orchestrator v1</h3>
          <span style="margin-left:auto; font-weight:bold;" id="yaver_res_status">Hazır</span>
        </div>

        <div style="margin-top:8px; display:flex; gap:8px; flex-wrap:wrap;">
          <button class="btn btn-confirm-yes" id="yaver_btn_p2p">1) Parents ↔ Parents Dengele</button>
          <button class="btn btn-confirm-yes" id="yaver_btn_c2c">2) Children ↔ Children Dengele</button>
          <button class="btn btn-confirm-yes" id="yaver_btn_p2c">3) Parents → Children Besle + Rebalance</button>
          <button class="btn" id="yaver_btn_stop">STOP</button>
        </div>

        <div style="margin-top:8px; font-size:12px; color:#3b2a00;">
          <span class="icon header wood"></span> <b>Wood</b> &nbsp;
          <span class="icon header stone"></span> <b>Clay</b> &nbsp;
          <span class="icon header iron"></span> <b>Iron</b> &nbsp; | &nbsp;
          Cap: <b>${Math.round(CFG.FILL_CAP * 100)}%</b> &nbsp; | &nbsp;
          Parent keep: <b>${Math.round(CFG.PARENT_MIN_KEEP_FILL * 100)}%</b> &nbsp; | &nbsp;
          Rate: <b>${CFG.OPS_PER_SECOND} op/sn</b> &nbsp; | &nbsp;
          Shipment: <b>tek kaynak / 1000</b>
        </div>

        <hr style="margin:8px 0; border-color:#dcb;">

        <div id="yaver_plan_area" style="display:none;">
          <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
            <span><b>Plan</b> (<span id="yaver_plan_count">0</span> komut)</span>
            <button class="btn btn-confirm-yes" id="yaver_btn_execute">Planı Uygula</button>
            <button class="btn" id="yaver_btn_clear">Temizle</button>
          </div>
          <div style="margin-top:6px; max-height:320px; overflow:auto;">
            <table class="vis" style="width:100%;">
              <thead>
                <tr>
                  <th>#</th>
                  <th>From</th>
                  <th>To</th>
                  <th>Res</th>
                  <th>Amount</th>
                  <th>Merchants</th>
                  <th>Dist</th>
                  <th>Tag</th>
                </tr>
              </thead>
              <tbody id="yaver_plan_table"></tbody>
            </table>
          </div>
          <div id="yaver_plan_notes" style="margin-top:6px; font-size:12px;"></div>
        </div>
      </div>
    `;

    const $target = $("#content_value");
    if ($target.length) $target.prepend(html);
    else $("body").prepend(html);

    $("#yaver_btn_stop").on("click", () => {
      window.__YAVER_RES_ORCH__.stop = true;
      setStatus("STOP ✅ (çalışan işlem duracak)");
    });
  }

  function setStatus(msg, ok = true) {
    const $s = $("#yaver_res_status");
    $s.text(msg);
    $s.css("color", ok ? "#0b5" : "#a30000");
  }

  function showPlan(transfers, note) {
    $("#yaver_plan_area").show();
    $("#yaver_plan_count").text(transfers.length);

    const tbody = $("#yaver_plan_table");
    tbody.empty();

    transfers.forEach((t, idx) => {
      const icon =
        t.resource === "wood" ? `<span class="icon header wood"></span>` :
        t.resource === "stone" ? `<span class="icon header stone"></span>` :
        `<span class="icon header iron"></span>`;

      const tr = `
        <tr class="${idx % 2 === 0 ? "row_a" : "row_b"}">
          <td>${idx + 1}</td>
          <td>${t.fromName}</td>
          <td>${t.toName}</td>
          <td style="white-space:nowrap;">${icon} ${t.resource}</td>
          <td>${t.amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")}</td>
          <td>${t.merchants}</td>
          <td>${t.distance ? t.distance.toFixed(1) : "0"}</td>
          <td>${t.tag}</td>
        </tr>
      `;
      tbody.append(tr);
    });

    $("#yaver_plan_notes").html(note ? `<span style="color:#a30000;"><b>Not:</b> ${note}</span>` : "");
  }

  function clearPlan() {
    $("#yaver_plan_area").hide();
    $("#yaver_plan_table").empty();
    $("#yaver_plan_notes").empty();
    window.__YAVER_RES_ORCH__.plan = null;
  }

  // ===================== EXECUTION =====================

  async function sendOne(t) {
    const payload = {
      target_id: t.toId,
      ...onlyOneResourcePayload(t.resource, t.amount),
    };

    const params = {
      ajaxaction: "map_send",
      village: t.fromId,
    };

    const h = getCsrf();
    if (h) params.h = h;

    return new Promise((resolve, reject) => {
      try {
        TribalWars.post("market", params, payload, function (resp) {
          resolve(resp);
        }, false);
      } catch (e) {
        reject(e);
      }
    });
  }

  async function executePlan(plan) {
    if (!plan || !plan.transfers || !plan.transfers.length) {
      UI.ErrorMessage("Plan yok.", 2000);
      return;
    }

    const ok = confirm(`Toplam ${plan.transfers.length} komut gönderilecek.\nDevam edilsin mi?`);
    if (!ok) return;

    window.__YAVER_RES_ORCH__.stop = false;

    for (let i = 0; i < plan.transfers.length; i++) {
      if (window.__YAVER_RES_ORCH__.stop) {
        UI.ErrorMessage("Durduruldu.", 2500);
        setStatus("Durduruldu", false);
        return;
      }

      const t = plan.transfers[i];
      setStatus(`Gönderiliyor ${i + 1}/${plan.transfers.length} ...`, true);

      try {
        const resp = await sendOne(t);
        if (resp?.message) UI.SuccessMessage(resp.message, 1000);
      } catch (e) {
        console.error("Send failed:", t, e);
        UI.ErrorMessage("Gönderim hatası (detay console).", 4000);
        setStatus("Hata", false);
        return;
      }

      // 1 op/sec throttle
      await sleep(Math.ceil(1000 / CFG.OPS_PER_SECOND));
    }

    UI.SuccessMessage("Bitti ✅", 2500);
    setStatus("Bitti ✅", true);
  }

  // ===================== MODES =====================

  async function buildAndPlan(mode) {
    setStatus("Veriler çekiliyor...", true);

    const groups = await getGroupIds();
    const parentsG = groups[CFG.GROUP_PARENT_NAME];
    const childrenG = groups[CFG.GROUP_CHILD_NAME];

    if (!parentsG || !childrenG) {
      const msg = `Groups bulunamadı. Aranan: "${CFG.GROUP_PARENT_NAME}" ve "${CFG.GROUP_CHILD_NAME}"`;
      UI.ErrorMessage(msg, 4000);
      setStatus("Groups yok", false);
      return null;
    }

    let parents = await getProdVillages(parentsG);
    let children = await getProdVillages(childrenG);

    // Incoming maps
    const incP = await getIncomingMap(parentsG);
    const incC = await getIncomingMap(childrenG);

    parents.forEach(v => { if (incP[v.id]) v.incoming = addRes(v.incoming, incP[v.id]); });
    children.forEach(v => { if (incC[v.id]) v.incoming = addRes(v.incoming, incC[v.id]); });

    let transfers = [];
    let note = null;

    if (mode === "PARENTS_BALANCE") {
      const t = computeWithinGroupTargets(parents, CFG.PARENT_MIN_KEEP_FILL);
      if (!t.ok) {
        UI.ErrorMessage(t.reason, 6000);
        setStatus("Plan yok", false);
        return null;
      }
      // donors: surplus in any res; receivers: deficits
      // We simply let planTransfers compute per-res using eff-target
      const out = planTransfers(
        parents,
        () => true,
        () => true,
        "P↔P"
      );
      transfers = out.transfers;
      note = out.note;

      transfers = mergeTransfers(transfers);

    } else if (mode === "CHILDREN_BALANCE") {
      const t = computeWithinGroupTargets(children, 0);
      if (!t.ok) {
        UI.ErrorMessage(t.reason, 6000);
        setStatus("Plan yok", false);
        return null;
      }
      const out = planTransfers(
        children,
        () => true,
        () => true,
        "C↔C"
      );
      transfers = out.transfers;
      note = out.note;

      transfers = mergeTransfers(transfers);

    } else if (mode === "FEED") {
      // global imbalance check across BOTH sets (your request)
      parents.forEach(v => { v.eff = addRes(copyRes(v.res), v.incoming); });
      children.forEach(v => { v.eff = addRes(copyRes(v.res), v.incoming); });

      const chk = globalImbalanceCheck([...parents, ...children].map(v => ({
        eff: v.eff
      })));
      if (!chk.ok) {
        const msg =
          `GLOBAL imbalance > ${Math.round(CFG.GLOBAL_IMBALANCE_THRESHOLD*100)}%.\n` +
          `Önce Exchange ile eksik kaynağı tamamla, sonra tekrar dene.\n` +
          `Dev: wood=${Math.round(chk.deviations.wood*100)}% stone=${Math.round(chk.deviations.stone*100)}% iron=${Math.round(chk.deviations.iron*100)}%`;
        UI.ErrorMessage(msg, 7000);
        setStatus("Plan yok", false);
        return null;
      }

      computeParentsMinKeepForFeeding(parents);
      computeChildrenTargetsForFeeding(children);
      priorityScore(children);

      // Parents: define "target" for computing supply = keep floor (minKeepEach)
      for (const p of parents) {
        p.target = {
          total: p.minKeepTotal,
          wood: p.minKeepEach,
          stone: p.minKeepEach,
          iron: p.minKeepEach,
        };
      }

      // Sort children by priority high first for feeding
      children.sort((a, b) => (b.priority || 0) - (a.priority || 0));

      // Feed plan: donors are parents, receivers are children
      const all = [...parents, ...children];
      const out1 = planTransfers(
        all,
        (v) => parents.some(p => p.id === v.id),
        (v) => children.some(c => c.id === v.id),
        "P→C"
      );
      let t1 = mergeTransfers(out1.transfers);
      transfers.push(...t1);
      if (out1.note) note = out1.note;

      // Simulate after feed to run rebalances
      let allAfter = [...parents, ...children];
      simulateApply(allAfter, transfers);

      // Update eff from sim for rebalancing
      for (const v of allAfter) {
        v.eff = copyRes(v.sim);
        v.effTotal = sumRes(v.eff);
      }

      if (CFG.ALLOW_PARENT_REBALANCE) {
        // Recompute targets within parents after feeding
        const parentsAfter = allAfter.filter(v => parents.some(p => p.id === v.id));
        const tP = computeWithinGroupTargets(parentsAfter, CFG.PARENT_MIN_KEEP_FILL);
        if (tP.ok) {
          const outP = planTransfers(
            parentsAfter,
            () => true,
            () => true,
            "P↔P (after)"
          );
          transfers.push(...mergeTransfers(outP.transfers));
        }
      }

      // Re-simulate after parent rebalance
      allAfter = [...parents, ...children];
      // rebuild eff as original + incoming first, then apply transfers
      // easiest: compute eff fresh
      parents.forEach(v => { v.eff = addRes(copyRes(v.res), v.incoming); });
      children.forEach(v => { v.eff = addRes(copyRes(v.res), v.incoming); });
      simulateApply([...parents, ...children], transfers);

      for (const v of [...parents, ...children]) {
        v.eff = copyRes(v.sim);
        v.effTotal = sumRes(v.eff);
      }

      if (CFG.ALLOW_CHILD_REBALANCE) {
        const childrenAfter = [...parents, ...children].filter(v => children.some(c => c.id === v.id));
        const tC = computeWithinGroupTargets(childrenAfter, 0);
        if (tC.ok) {
          const outC = planTransfers(
            childrenAfter,
            () => true,
            () => true,
            "C↔C (after)"
          );
          transfers.push(...mergeTransfers(outC.transfers));
        }
      }

      transfers = mergeTransfers(transfers);
    }

    // Hard safety: cap commands
    if (transfers.length > CFG.MAX_COMMANDS) {
      transfers = transfers.slice(0, CFG.MAX_COMMANDS);
      note = `MAX_COMMANDS=${CFG.MAX_COMMANDS} nedeniyle plan kısaltıldı.`;
    }

    // Validate (caps, merchants, keep)
    const errs = validatePlan(parents, children, transfers, mode);
    if (errs.length) {
      console.warn("Plan validation errors:", errs);
      UI.ErrorMessage("Plan doğrulamada hata var (detay console).", 6000);
      setStatus("Plan hatalı", false);
      return { parents, children, transfers, note: "VALIDATION ERRORS:\n- " + errs.slice(0, 8).join("\n- ") };
    }

    setStatus("Plan hazır ✅", true);
    return { parents, children, transfers, note };
  }

  // ===================== BOOT =====================
  ensurePanel();

  $("#yaver_btn_clear").on("click", clearPlan);

  $("#yaver_btn_p2p").on("click", async () => {
    clearPlan();
    const plan = await buildAndPlan("PARENTS_BALANCE");
    if (!plan) return;
    window.__YAVER_RES_ORCH__.plan = plan;
    showPlan(plan.transfers, plan.note);
  });

  $("#yaver_btn_c2c").on("click", async () => {
    clearPlan();
    const plan = await buildAndPlan("CHILDREN_BALANCE");
    if (!plan) return;
    window.__YAVER_RES_ORCH__.plan = plan;
    showPlan(plan.transfers, plan.note);
  });

  $("#yaver_btn_p2c").on("click", async () => {
    clearPlan();
    const plan = await buildAndPlan("FEED");
    if (!plan) return;
    window.__YAVER_RES_ORCH__.plan = plan;
    showPlan(plan.transfers, plan.note);
  });

  $("#yaver_btn_execute").on("click", async () => {
    const plan = window.__YAVER_RES_ORCH__.plan;
    if (!plan) return UI.ErrorMessage("Önce plan çıkar.", 2500);
    await executePlan(plan);
  });

  UI.SuccessMessage("Yaver Resource Orchestrator loaded ✅", 2000);
})();
