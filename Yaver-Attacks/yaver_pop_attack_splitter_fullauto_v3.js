/* yaver_pop_attack_splitter_fullauto_v3.js
 * FULL AUTO: place->try=confirm + confirm->action=command (via fetch)
 * No page navigation needed, so loop keeps running.
 *
 * Default: sends 100 pop attacks to 431|380 using troops available "now".
 */

(function () {
  "use strict";

  const VERSION = "3.0.0";
  const KEY_CFG = "yaver_pop_splitter_fullauto_v3_cfg";
  const UI_ID = "yaver-pop-splitter-fullauto-ui";

  // If already loaded: toggle UI
  if (window.YaverPopSplitterFullAutoV3?.version === VERSION) {
    window.YaverPopSplitterFullAutoV3.toggleUI();
    return;
  }

  const POP = {
    spear: 1,
    sword: 1,
    axe: 1,
    archer: 1,
    spy: 2,
    light: 4,
    marcher: 5,
    heavy: 6,
    ram: 5,
    catapult: 8,
    knight: 10,
    snob: 100,
    militia: 0,
  };

  const DEFAULT_CFG = {
    targetCoord: "431|380",
    popPerAttack: 100,
    maxAttacks: 0, // 0 = unlimited

    // by default: exclude snob/knight/militia
    excludeUnits: ["snob", "knight", "militia"],
    preference: "high_to_low", // or "low_to_high"

    delayMinMs: 180,
    delayMaxMs: 650,

    debug: true,
  };

  function log(cfg, ...args) {
    if (cfg.debug) console.log("[Yaver 100pop FULLAUTO v3]", ...args);
  }
  function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }
  function randDelay(cfg) {
    const a = Math.max(0, Number(cfg.delayMinMs) || 0);
    const b = Math.max(a, Number(cfg.delayMaxMs) || a);
    return a + Math.floor(Math.random() * (b - a + 1));
  }

  function loadCfg() {
    let fromStorage = {};
    try { fromStorage = JSON.parse(localStorage.getItem(KEY_CFG) || "{}"); } catch (_) {}
    const fromGlobal = (window.YaverPopSplitterFullAutoV3Config && typeof window.YaverPopSplitterFullAutoV3Config === "object")
      ? window.YaverPopSplitterFullAutoV3Config
      : {};
    return { ...DEFAULT_CFG, ...fromStorage, ...fromGlobal };
  }
  function saveCfg(cfg) {
    try { localStorage.setItem(KEY_CFG, JSON.stringify(cfg)); } catch (_) {}
  }

  function isPlaceScreen() {
    if (window.game_data?.screen) return window.game_data.screen === "place";
    return /[?&]screen=place\b/.test(location.href);
  }

  function mustHavePlaceForm() {
    return !!document.querySelector("#command-data-form")
      && !!document.querySelector("#target_attack");
  }

  function parseCoord(coord) {
    const m = String(coord).trim().match(/^(\d{1,3})\|(\d{1,3})$/);
    if (!m) return null;
    return { x: Number(m[1]), y: Number(m[2]) };
  }

  function setTarget(coordStr) {
    const c = parseCoord(coordStr);
    if (!c) return false;

    // ensure target_type=coord
    const radio = document.querySelector('input[name="target_type"][value="coord"]');
    if (radio) radio.checked = true;

    const xEl = document.querySelector("#inputx");
    const yEl = document.querySelector("#inputy");
    if (xEl) xEl.value = String(c.x);
    if (yEl) yEl.value = String(c.y);

    const targetInput = document.querySelector("#place_target input.target-input-field");
    if (targetInput) {
      targetInput.value = `${c.x}|${c.y}`;
      targetInput.dispatchEvent(new Event("input", { bubbles: true }));
      targetInput.dispatchEvent(new Event("change", { bubbles: true }));
    }

    return true;
  }

  function getUnitsOnPage() {
    const inputs = Array.from(document.querySelectorAll('input.unitsInput[id^="unit_input_"]'));
    return inputs
      .map((el) => el.id.replace("unit_input_", ""))
      .filter((u) => u && POP[u] != null);
  }

  function readAvailableFromDom(units) {
    const avail = {};
    for (const u of units) {
      const el = document.querySelector(`#unit_input_${u}`);
      if (!el || el.disabled) continue;
      const raw = el.getAttribute("data-all-count") ?? el.dataset.allCount ?? "0";
      const n = parseInt(raw, 10);
      avail[u] = Number.isFinite(n) ? Math.max(0, n) : 0;
    }
    return avail;
  }

  function writeAvailableToDom(avail) {
    for (const [u, n] of Object.entries(avail)) {
      const el = document.querySelector(`#unit_input_${u}`);
      if (el) {
        el.setAttribute("data-all-count", String(n));
        el.dataset.allCount = String(n);
      }
      const a = document.querySelector(`#units_entry_all_${u}`);
      if (a) a.textContent = `(${n})`;
    }
  }

  function clearUnitInputs(units) {
    for (const u of units) {
      const el = document.querySelector(`#unit_input_${u}`);
      if (el) el.value = "";
    }
  }

  function fillPlanToDom(plan) {
    for (const [u, n] of Object.entries(plan)) {
      const el = document.querySelector(`#unit_input_${u}`);
      if (el) el.value = String(n);
    }
  }

  function planPop(plan) {
    let s = 0;
    for (const [u, n] of Object.entries(plan)) s += (POP[u] || 0) * (n || 0);
    return s;
  }

  // bounded knapsack for exact pop target (<=100 so very light)
  function buildPlanDP(avail, targetPop, cfg) {
    const units = Object.keys(avail)
      .filter((u) => (avail[u] || 0) > 0)
      .filter((u) => !cfg.excludeUnits.includes(u))
      .filter((u) => (POP[u] || 0) > 0);

    if (!units.length) return null;

    const order = units.sort((a, b) => {
      if (cfg.preference === "low_to_high") return (POP[a] - POP[b]) || a.localeCompare(b);
      return (POP[b] - POP[a]) || a.localeCompare(b);
    });

    const dp = Array(targetPop + 1).fill(null);
    dp[0] = {};

    for (const u of order) {
      const cost = POP[u];
      const max = avail[u];

      for (let p = targetPop; p >= 0; p--) {
        if (!dp[p]) continue;
        const kMax = Math.min(max, Math.floor((targetPop - p) / cost));
        for (let k = 1; k <= kMax; k++) {
          const np = p + k * cost;
          if (dp[np]) continue;
          const next = { ...dp[p] };
          next[u] = (next[u] || 0) + k;
          dp[np] = next;
        }
      }
    }
    return dp[targetPop];
  }

  function subtractAvail(avail, plan) {
    const next = { ...avail };
    for (const [u, n] of Object.entries(plan)) {
      next[u] = Math.max(0, (next[u] || 0) - n);
    }
    return next;
  }

  function totalPop(avail) {
    let s = 0;
    for (const [u, n] of Object.entries(avail)) s += (POP[u] || 0) * (n || 0);
    return s;
  }

  async function postForm(url, params) {
    const abs = new URL(url, location.origin).toString();
    const res = await fetch(abs, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      },
      body: params.toString(),
    });
    const text = await res.text();
    return { res, text };
  }

  function parseConfirmForm(html) {
    const doc = new DOMParser().parseFromString(html, "text/html");
    const form = doc.querySelector("#command-data-form");
    const btn = doc.querySelector("#troop_confirm_submit");
    if (!form || !btn) return null;
    return form;
  }

  // ---------- UI + LOOP STATE ----------
  const state = {
    running: false,
    sent: 0,
    avail: null,
  };

  function uiSet(html) {
    const out = document.querySelector(`#${UI_ID} [data-out]`);
    if (out) out.innerHTML = html;
  }

  function createUI(cfg) {
    document.getElementById(UI_ID)?.remove();

    const wrap = document.createElement("div");
    wrap.id = UI_ID;
    wrap.style.position = "fixed";
    wrap.style.right = "12px";
    wrap.style.bottom = "12px";
    wrap.style.zIndex = "99999";
    wrap.style.width = "360px";
    wrap.style.background = "rgba(20,20,20,0.92)";
    wrap.style.color = "#fff";
    wrap.style.border = "1px solid rgba(255,255,255,0.15)";
    wrap.style.borderRadius = "10px";
    wrap.style.padding = "10px";
    wrap.style.fontFamily = "Arial, sans-serif";
    wrap.style.fontSize = "12px";
    wrap.style.boxShadow = "0 8px 22px rgba(0,0,0,0.35)";

    wrap.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;">
        <div style="font-weight:700;">Yaver 100 Pop FULL AUTO (v${VERSION})</div>
        <button data-act="close" style="cursor:pointer;border:0;border-radius:8px;padding:4px 8px;">×</button>
      </div>

      <div style="margin-top:8px;display:grid;grid-template-columns:120px 1fr;gap:6px;align-items:center;">
        <div>Target</div>
        <input data-f="targetCoord" value="${cfg.targetCoord}" style="width:100%;padding:4px 6px;border-radius:8px;border:1px solid #444;background:#111;color:#fff;" />
        <div>Pop / saldırı</div>
        <input data-f="popPerAttack" type="number" min="1" value="${cfg.popPerAttack}" style="width:100%;padding:4px 6px;border-radius:8px;border:1px solid #444;background:#111;color:#fff;" />
        <div>Maks saldırı</div>
        <input data-f="maxAttacks" type="number" min="0" value="${cfg.maxAttacks}" style="width:100%;padding:4px 6px;border-radius:8px;border:1px solid #444;background:#111;color:#fff;" />
      </div>

      <div style="margin-top:8px;display:flex;gap:8px;">
        <button data-act="start" style="flex:1;cursor:pointer;border:0;border-radius:10px;padding:8px 10px;">START</button>
        <button data-act="stop" style="width:110px;cursor:pointer;border:0;border-radius:10px;padding:8px 10px;">STOP</button>
      </div>

      <div style="margin-top:8px;display:flex;gap:8px;">
        <button data-act="scan" style="flex:1;cursor:pointer;border:0;border-radius:10px;padding:8px 10px;">Scan</button>
        <button data-act="one" style="flex:1;cursor:pointer;border:0;border-radius:10px;padding:8px 10px;">1 Attack</button>
      </div>

      <div data-out style="margin-top:8px;line-height:1.35;color:#d7d7d7;">
        Hazır.
      </div>
    `;

    document.body.appendChild(wrap);

    function readCfgFromUI() {
      const next = { ...cfg };
      next.targetCoord = wrap.querySelector('[data-f="targetCoord"]').value.trim();
      next.popPerAttack = Math.max(1, parseInt(wrap.querySelector('[data-f="popPerAttack"]').value, 10) || cfg.popPerAttack);
      next.maxAttacks = Math.max(0, parseInt(wrap.querySelector('[data-f="maxAttacks"]').value, 10) || 0);
      return next;
    }

    wrap.addEventListener("click", async (e) => {
      const btn = e.target.closest("button");
      if (!btn) return;

      const act = btn.getAttribute("data-act");
      if (!act) return;

      if (act === "close") { wrap.remove(); return; }

      cfg = readCfgFromUI();
      saveCfg(cfg);

      if (!isPlaceScreen() || !mustHavePlaceForm()) {
        uiSet("Bu script <b>Rally point → Give commands</b> (screen=place) ekranında çalışır.");
        return;
      }

      if (act === "scan") {
        const units = getUnitsOnPage();
        const avail = readAvailableFromDom(units);
        state.avail = avail;
        uiSet(`Toplam pop (elde): <b>${totalPop(avail)}</b><br/>Gönderilen: <b>${state.sent}</b>`);
        return;
      }

      if (act === "stop") {
        state.running = false;
        uiSet(`Durduruldu. Gönderilen: <b>${state.sent}</b>`);
        return;
      }

      if (act === "one") {
        state.running = false;
        await doOne(cfg, true);
        return;
      }

      if (act === "start") {
        state.running = true;
        uiSet("Loop başladı…");
        loop(cfg);
        return;
      }
    });
  }

  async function doOne(cfg, oneShot) {
    const units = getUnitsOnPage();
    if (!state.avail) state.avail = readAvailableFromDom(units);

    if (cfg.maxAttacks > 0 && state.sent >= cfg.maxAttacks) {
      state.running = false;
      uiSet(`Maks limit: <b>${cfg.maxAttacks}</b>. Durduruldu.`);
      return false;
    }

    if (!setTarget(cfg.targetCoord)) {
      state.running = false;
      uiSet(`Target format hatalı. Örn: <b>431|380</b>`);
      return false;
    }

    const plan = buildPlanDP(state.avail, cfg.popPerAttack, cfg);
    if (!plan || planPop(plan) !== cfg.popPerAttack) {
      state.running = false;
      uiSet(`Tam <b>${cfg.popPerAttack}</b> pop kombinasyonu bulunamadı. Durduruldu.`);
      return false;
    }

    // Fill DOM so FormData picks up values
    clearUnitInputs(units);
    fillPlanToDom(plan);

    const form = document.querySelector("#command-data-form");
    const fd = new FormData(form);

    // ensure attack submit param exists (because we didn't actually click the submit)
    if (!fd.has("attack")) fd.append("attack", "Attack");

    // (Optional) ensure x/y present (they are in DOM and in fd in your HTML)
    const params1 = new URLSearchParams(fd);

    uiSet(`Confirm hazırlanıyor…<br/>Plan pop: <b>${cfg.popPerAttack}</b>`);

    // 1) POST to try=confirm (place form action contains try=confirm) :contentReference[oaicite:3]{index=3}
    const { res: r1, text: html1 } = await postForm(form.getAttribute("action"), params1);
    if (!r1.ok) {
      state.running = false;
      uiSet(`try=confirm POST başarısız: <b>${r1.status}</b>`);
      return false;
    }

    const confirmForm = parseConfirmForm(html1);
    if (!confirmForm) {
      state.running = false;
      uiSet(`Confirm form parse edilemedi. (HTML beklenenden farklı)`);
      return false;
    }

    // 2) POST confirm form to action=command
    const fd2 = new FormData(confirmForm);
    const params2 = new URLSearchParams(fd2);

    const { res: r2, text: html2 } = await postForm(confirmForm.getAttribute("action"), params2);
    if (!r2.ok) {
      state.running = false;
      uiSet(`Send POST başarısız: <b>${r2.status}</b>`);
      return false;
    }

    // Assume success if server responded OK
    state.sent += 1;
    state.avail = subtractAvail(state.avail, plan);
    writeAvailableToDom(state.avail);

    const planText = Object.entries(plan).filter(([,n]) => n > 0).map(([u,n]) => `${u}:${n}`).join(", ");
    uiSet(
      `Gönderildi ✅ #<b>${state.sent}</b><br/>Plan: ${planText}<br/>Kalan toplam pop: <b>${totalPop(state.avail)}</b>`
    );

    if (oneShot) return true;
    return true;
  }

  async function loop(cfg) {
    while (state.running) {
      const d = randDelay(cfg);
      await sleep(d);

      // stop if user requested
      if (!state.running) break;

      const ok = await doOne(cfg, false);
      if (!ok) break;

      // stop if maxAttacks reached
      if (cfg.maxAttacks > 0 && state.sent >= cfg.maxAttacks) {
        state.running = false;
        uiSet(`Maks limit: <b>${cfg.maxAttacks}</b>. Durduruldu.`);
        break;
      }
    }
  }

  const api = {
    version: VERSION,
    init() {
      const cfg = loadCfg();
      createUI(cfg);
      uiSet("Hazır. (Scan → START)");
    },
    toggleUI() {
      const el = document.getElementById(UI_ID);
      if (el) el.remove();
      else this.init();
    }
  };

  window.YaverPopSplitterFullAutoV3 = api;
  api.init();
})();
