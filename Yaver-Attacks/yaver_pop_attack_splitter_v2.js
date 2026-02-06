/* yaver_pop_attack_splitter_v2.js
 * Tribal Wars - 100 pop attack splitter + FULL AUTO LOOP
 *
 * Flow:
 * - Place screen: plan (exact pop), fill, click Attack -> confirm screen
 * - Confirm screen: click #troop_confirm_submit -> returns to place screen
 * - Repeat until: cannot make exact pop OR maxAttacks reached OR user stops
 *
 * State persists via sessionStorage (per-tab).
 */

(function () {
  "use strict";

  const VERSION = "2.0.0";
  const SCRIPT_KEY = "yaver_pop_attack_splitter_v2_config";
  const STATE_KEY  = "yaver_pop_attack_splitter_v2_state";
  const UI_ID = "yaver-pop-splitter-ui";

  // If already loaded, toggle UI
  if (window.YaverPopAttackSplitterV2 && window.YaverPopAttackSplitterV2.version === VERSION) {
    window.YaverPopAttackSplitterV2.toggleUI();
    return;
  }

  const POP = {
    spear: 1,
    sword: 1,
    axe: 1,
    archer: 1,
    spy: 2,
    light: 4,
    heavy: 6,
    marcher: 5,  // mounted archer
    ram: 5,
    catapult: 8,

    // optional / usually excluded
    knight: 10,
    snob: 100,
    militia: 0
  };

  const DEFAULT_CONFIG = {
    targetCoord: "431|380",
    popPerAttack: 100,

    // 0 => unlimited
    maxAttacks: 0,

    // which units eligible
    excludeUnits: ["snob", "knight", "militia"],

    // DP preference bias
    preference: "high_to_low", // or "low_to_high"

    // automation
    autoLoop: false,

    // human-ish delays
    delayMinMs: 140,
    delayMaxMs: 520,

    debug: true
  };

  function log(cfg, ...args) {
    if (cfg.debug) console.log("[Yaver 100pop v2]", ...args);
  }

  function randDelay(cfg) {
    const a = Math.max(0, Number(cfg.delayMinMs) || 0);
    const b = Math.max(a, Number(cfg.delayMaxMs) || a);
    return a + Math.floor(Math.random() * (b - a + 1));
  }

  function loadConfig() {
    let fromStorage = {};
    try { fromStorage = JSON.parse(localStorage.getItem(SCRIPT_KEY) || "{}"); } catch (_) {}

    const fromGlobal = (window.YaverPopAttackSplitterConfigV2 && typeof window.YaverPopAttackSplitterConfigV2 === "object")
      ? window.YaverPopAttackSplitterConfigV2
      : {};

    return { ...DEFAULT_CONFIG, ...fromStorage, ...fromGlobal };
  }

  function saveConfig(cfg) {
    try { localStorage.setItem(SCRIPT_KEY, JSON.stringify(cfg)); } catch (_) {}
  }

  function loadState() {
    try { return JSON.parse(sessionStorage.getItem(STATE_KEY) || "null"); } catch (_) { return null; }
  }

  function saveState(st) {
    try { sessionStorage.setItem(STATE_KEY, JSON.stringify(st)); } catch (_) {}
  }

  function clearState() {
    try { sessionStorage.removeItem(STATE_KEY); } catch (_) {}
  }

  function isPlaceScreen() {
    if (window.game_data && window.game_data.screen) return window.game_data.screen === "place";
    return /[?&]screen=place\b/.test(location.href);
  }

  function isConfirmScreen() {
    // Your HTML shows: #command-data-form AND #troop_confirm_submit
    return !!document.querySelector("#command-data-form") && !!document.querySelector("#troop_confirm_submit");
  }

  function parseCoord(coord) {
    const m = String(coord).trim().match(/^(\d{1,3})\|(\d{1,3})$/);
    if (!m) return null;
    return { x: Number(m[1]), y: Number(m[2]) };
  }

  function setTarget(coordStr) {
    const coord = parseCoord(coordStr);
    if (!coord) return false;

    const xEl = document.querySelector("#inputx");
    const yEl = document.querySelector("#inputy");
    if (xEl) xEl.value = String(coord.x);
    if (yEl) yEl.value = String(coord.y);

    const targetInput = document.querySelector("#place_target input.target-input-field");
    if (targetInput) {
      targetInput.value = `${coord.x}|${coord.y}`;
      targetInput.dispatchEvent(new Event("input", { bubbles: true }));
      targetInput.dispatchEvent(new Event("change", { bubbles: true }));
    }
    return true;
  }

  function getUnitsOnPage() {
    const inputs = Array.from(document.querySelectorAll("input.unitsInput[id^='unit_input_']"));
    return inputs
      .map((el) => el.id.replace("unit_input_", ""))
      .filter((u) => u && POP[u] != null);
  }

  function readAvailable(units) {
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

  function clearInputs(units) {
    for (const u of units) {
      const el = document.querySelector(`#unit_input_${u}`);
      if (el) el.value = "";
    }
  }

  function planPop(plan) {
    let s = 0;
    for (const [u, n] of Object.entries(plan)) s += (POP[u] || 0) * (n || 0);
    return s;
  }

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

        // bounded, but k only needs to go up to floor((targetPop - p)/cost)
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

  function fillPlan(plan) {
    for (const [u, n] of Object.entries(plan)) {
      const el = document.querySelector(`#unit_input_${u}`);
      if (el) el.value = String(n);
    }
  }

  // ---------- UI ----------
  function createUI(cfg) {
    const old = document.getElementById(UI_ID);
    if (old) old.remove();

    const wrap = document.createElement("div");
    wrap.id = UI_ID;
    wrap.style.position = "fixed";
    wrap.style.right = "12px";
    wrap.style.bottom = "12px";
    wrap.style.zIndex = "99999";
    wrap.style.width = "340px";
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
        <div style="font-weight:700;">Yaver 100 Pop Splitter (v${VERSION})</div>
        <button data-action="close" style="cursor:pointer;border:0;border-radius:8px;padding:4px 8px;">×</button>
      </div>

      <div style="margin-top:8px;display:grid;grid-template-columns:120px 1fr;gap:6px;align-items:center;">
        <div>Target</div>
        <input data-field="targetCoord" value="${cfg.targetCoord}"
          style="width:100%;padding:4px 6px;border-radius:8px;border:1px solid #444;background:#111;color:#fff;" />

        <div>Pop / saldırı</div>
        <input data-field="popPerAttack" type="number" min="1" value="${cfg.popPerAttack}"
          style="width:100%;padding:4px 6px;border-radius:8px;border:1px solid #444;background:#111;color:#fff;" />

        <div>Maks saldırı</div>
        <input data-field="maxAttacks" type="number" min="0" value="${cfg.maxAttacks}"
          style="width:100%;padding:4px 6px;border-radius:8px;border:1px solid #444;background:#111;color:#fff;" />
      </div>

      <div style="margin-top:8px;display:flex;gap:8px;">
        <button data-action="start" style="flex:1;cursor:pointer;border:0;border-radius:10px;padding:8px 10px;">START LOOP</button>
        <button data-action="stop" style="width:110px;cursor:pointer;border:0;border-radius:10px;padding:8px 10px;">STOP</button>
      </div>

      <div style="margin-top:8px;display:flex;gap:8px;">
        <button data-action="scan" style="flex:1;cursor:pointer;border:0;border-radius:10px;padding:8px 10px;">Scan</button>
        <button data-action="one" style="flex:1;cursor:pointer;border:0;border-radius:10px;padding:8px 10px;">1 Attack</button>
        <button data-action="clear" style="width:80px;cursor:pointer;border:0;border-radius:10px;padding:8px 10px;">Clear</button>
      </div>

      <div data-out style="margin-top:8px;line-height:1.35;color:#d7d7d7;">Hazır.</div>
    `;

    document.body.appendChild(wrap);

    const out = wrap.querySelector("[data-out]");

    function render(msg) {
      out.innerHTML = msg;
    }

    function readCfgFromUI() {
      const next = { ...cfg };
      next.targetCoord = wrap.querySelector("[data-field='targetCoord']").value.trim();
      next.popPerAttack = Math.max(1, parseInt(wrap.querySelector("[data-field='popPerAttack']").value, 10) || cfg.popPerAttack);
      next.maxAttacks = Math.max(0, parseInt(wrap.querySelector("[data-field='maxAttacks']").value, 10) || 0);
      return next;
    }

    function setLoopRunning(running) {
      const st = loadState() || { sent: 0 };
      if (running) {
        saveState({ running: true, sent: st.sent || 0, startedAt: Date.now() });
      } else {
        clearState();
      }
    }

    wrap.addEventListener("click", (e) => {
      const btn = e.target.closest("button");
      if (!btn) return;

      const action = btn.getAttribute("data-action");
      if (!action) return;

      if (action === "close") {
        wrap.remove();
        return;
      }

      cfg = readCfgFromUI();
      saveConfig(cfg);

      if (action === "stop") {
        setLoopRunning(false);
        render("Loop durduruldu.");
        return;
      }

      if (action === "start") {
        setLoopRunning(true);
        render("Loop başlatıldı. Sayfa akışına göre otomatik devam edecek.");
        // kick immediately
        setTimeout(() => tick(cfg), 50);
        return;
      }

      if (action === "clear") {
        const units = getUnitsOnPage();
        clearInputs(units);
        render("Inputlar temizlendi.");
        return;
      }

      if (action === "scan") {
        if (!isPlaceScreen()) {
          render("Scan sadece Place ekranında mantıklı.");
          return;
        }
        const units = getUnitsOnPage();
        const avail = readAvailable(units);
        const sumPop = Object.entries(avail).reduce((a, [u, n]) => a + (POP[u] || 0) * n, 0);
        render(`Toplam pop (elde): <b>${sumPop}</b><br/>Unit sayısı: <b>${Object.keys(avail).length}</b>`);
        return;
      }

      if (action === "one") {
        // one-shot: place->confirm auto submit once
        saveState({ running: true, sent: 0, oneShot: true, startedAt: Date.now() });
        render("1 saldırı modu: otomatik gönderilecek.");
        setTimeout(() => tick(cfg), 50);
        return;
      }
    });

    // initial status
    const st = loadState();
    if (st?.running) render(`Loop açık. Gönderilen: <b>${st.sent || 0}</b>`);
    return wrap;
  }

  // ---------- Automation Core ----------
  let inFlight = false;

  function stopWithMessage(msg) {
    clearState();
    const ui = document.getElementById(UI_ID);
    if (ui) {
      const out = ui.querySelector("[data-out]");
      if (out) out.innerHTML = msg;
    }
    console.warn("[Yaver 100pop v2] STOP:", msg);
  }

  function tick(cfg) {
    if (inFlight) return;
    inFlight = true;

    const st = loadState();
    const running = !!st?.running;

    // If not running, just idle
    if (!running) {
      inFlight = false;
      return;
    }

    // Max attacks check (0 = unlimited)
    if (cfg.maxAttacks > 0 && (st.sent || 0) >= cfg.maxAttacks) {
      stopWithMessage(`Maks saldırı limitine ulaştı: <b>${cfg.maxAttacks}</b>. Loop durdu.`);
      inFlight = false;
      return;
    }

    // Confirm screen: click submit
    if (isConfirmScreen()) {
      const btn = document.querySelector("#troop_confirm_submit");
      if (!btn) {
        stopWithMessage("Confirm ekranında #troop_confirm_submit bulunamadı. Loop durdu.");
        inFlight = false;
        return;
      }

      const d = randDelay(cfg);
      log(cfg, "Confirm: sending in", d, "ms");
      setTimeout(() => {
        try {
          btn.click();
          // increment sent (we assume successful submit triggers navigation)
          const st2 = loadState() || {};
          const sentNow = (st2.sent || 0) + 1;

          if (st2.oneShot) {
            clearState();
          } else {
            saveState({ ...st2, running: true, sent: sentNow });
          }
        } finally {
          inFlight = false;
        }
      }, d);

      return;
    }

    // Place screen: build plan and go to confirm
    if (isPlaceScreen()) {
      const ok = setTarget(cfg.targetCoord);
      if (!ok) {
        stopWithMessage("Target koordinat formatı hatalı. Örn: <b>431|380</b>");
        inFlight = false;
        return;
      }

      const units = getUnitsOnPage();
      const avail = readAvailable(units);
      const plan = buildPlanDP(avail, cfg.popPerAttack, cfg);

      if (!plan || planPop(plan) !== cfg.popPerAttack) {
        stopWithMessage(`Tam <b>${cfg.popPerAttack}</b> pop kombinasyonu bulunamadı. Loop durdu.`);
        inFlight = false;
        return;
      }

      clearInputs(units);
      fillPlan(plan);

      const btnAttack = document.querySelector("#target_attack");
      if (!btnAttack) {
        stopWithMessage("Place ekranında #target_attack bulunamadı. Loop durdu.");
        inFlight = false;
        return;
      }

      const d = randDelay(cfg);
      log(cfg, "Place: to confirm in", d, "ms", plan);
      setTimeout(() => {
        try {
          btnAttack.click();
        } finally {
          inFlight = false;
        }
      }, d);

      return;
    }

    // Unknown screen
    inFlight = false;
  }

  // ---------- Boot ----------
  const api = {
    version: VERSION,
    init() {
      const cfg = loadConfig();
      createUI(cfg);

      // Auto tick if loop already running and user navigated
      const st = loadState();
      if (st?.running) setTimeout(() => tick(cfg), 80);
    },
    toggleUI() {
      const el = document.getElementById(UI_ID);
      if (el) el.remove();
      else this.init();
    }
  };

  window.YaverPopAttackSplitterV2 = api;
  api.init();
})();
