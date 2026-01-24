(function () {
  "use strict";

  var Y = window.__YAVER_RESOURCE_ORCHESTRATOR_V5__;
  if (!Y) return;

  function ensureStyle() {
    var st = document.getElementById(Y.cfg.STYLE_ID);
    if (st) return;

    st = document.createElement("style");
    st.id = Y.cfg.STYLE_ID;

    st.textContent = `
#${Y.cfg.PANEL_ID}{
  position: fixed;
  left: 20px;
  top: 70px;
  width: fit-content;
  min-width: 900px;
  max-width: 98vw;
  max-height: 90vh;
  overflow: auto;
  z-index: 12000;
  background: #f4e4bc;
  border: 3px solid #7d510f;
  border-radius: 6px;
  padding: 8px;
  box-shadow: 0 0 15px rgba(0,0,0,.35);
}
#${Y.cfg.PANEL_ID} * { box-sizing: border-box; }

#${Y.cfg.PANEL_ID} .yro_hdr{
  display:flex; align-items:center; justify-content:space-between;
  user-select:none; margin-bottom: 8px;
  border-bottom: 1px solid #7d510f; padding-bottom: 5px;
}
#${Y.cfg.PANEL_ID} .yro_ttl{ font-weight:bold; font-size:14px; }
#${Y.cfg.PANEL_ID} .yro_dev{ font-weight:bold; font-size:12px; margin-right:8px; opacity:.9; }
#${Y.cfg.PANEL_ID} .yro_btn { cursor:pointer; }
#${Y.cfg.PANEL_ID} .yro_toolbar{
  display:flex; gap:10px; align-items:center; flex-wrap:wrap; margin-bottom: 8px;
}
#${Y.cfg.PANEL_ID} .yro_small{ font-size:10px; color:#555; }
#${Y.cfg.PANEL_ID} .yro_right{ text-align:right; }
#${Y.cfg.PANEL_ID} .yro_center{ text-align:center; }

#${Y.cfg.PANEL_ID} .yro_progress_outer{ width:180px; height:8px; border:1px solid #777; background:#fff; display:inline-block; }
#${Y.cfg.PANEL_ID} .yro_progress_inner{ height:100%; width:0%; background:#6c0; }

#${Y.cfg.PANEL_ID} .yro_msg{
  padding:6px; background:#fff; border:1px solid #ccc;
  margin-bottom:10px; font-size:11px;
}
#${Y.cfg.PANEL_ID} .yro_scroll{
  border:1px solid #7d510f;
  background:#fff5da;
  max-height: 55vh;
  overflow:auto;
}
#${Y.cfg.PANEL_ID} table.yro_table{
  width: max-content !important;
  border-collapse: collapse !important;
  border-spacing: 0 !important;
  table-layout: auto !important;
  background:#fff5da;
  margin: 0;
}
#${Y.cfg.PANEL_ID} table.yro_table th,
#${Y.cfg.PANEL_ID} table.yro_table td{
  padding: 4px 8px;
  border: 1px solid #dcd0b2;
  vertical-align: middle;
  white-space: nowrap;
  float: none !important;
  position: static !important;
}
#${Y.cfg.PANEL_ID} table.yro_table th{
  background: #c1a264 !important;
  background-image: none !important;
}
#${Y.cfg.PANEL_ID} table.yro_table tr:nth-child(even) td { background-color: #f0e2be; }

#${Y.cfg.PANEL_ID} .yro_sec_head{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:10px;
  padding: 4px 6px;
  background:#e3d5b3;
  border:1px solid #7d510f;
  margin: 10px 0 6px;
  font-weight:bold;
}
#${Y.cfg.PANEL_ID} .yro_sec_controls{
  display:flex;
  align-items:center;
  gap:8px;
  font-weight: normal;
}
#${Y.cfg.PANEL_ID} .yro_sec_controls select,
#${Y.cfg.PANEL_ID} .yro_sec_controls input[type="text"],
#${Y.cfg.PANEL_ID} .yro_sec_controls input[type="number"]{
  padding:2px 6px;
}

#${Y.cfg.PANEL_ID} .yro_linkrow{ cursor:pointer; color:#0a4; font-weight:bold; }
#${Y.cfg.PANEL_ID} .yro_warn{ color:#a00; font-weight:bold; }

#${Y.cfg.PANEL_ID} .yro_mode_box{
  border:1px solid #7d510f;
  background:#fff5da;
  padding:6px;
  margin-bottom:10px;
}
#${Y.cfg.PANEL_ID} .yro_mode_row{
  display:flex;
  align-items:flex-start;
  gap:10px;
  padding:6px;
  border:1px solid #dcd0b2;
  margin:6px 0;
  background:#f0e2be;
}
#${Y.cfg.PANEL_ID} .yro_mode_row.active{
  outline:2px solid #7d510f;
  background:#ead7a8;
}
#${Y.cfg.PANEL_ID} .yro_mode_left{ width:220px; }
#${Y.cfg.PANEL_ID} .yro_mode_title{ font-weight:bold; }
#${Y.cfg.PANEL_ID} .yro_mode_desc{ font-size:11px; color:#444; margin-top:2px; }
#${Y.cfg.PANEL_ID} .yro_mode_controls{
  display:flex;
  flex-wrap:wrap;
  gap:8px;
  align-items:center;
  flex:1;
}
#${Y.cfg.PANEL_ID} .yro_kv{
  display:flex;
  align-items:center;
  gap:6px;
  background:#fff;
  border:1px solid #dcd0b2;
  padding:2px 6px;
}
#${Y.cfg.PANEL_ID} .yro_kv label{
  font-size:11px;
  color:#333;
  font-weight:bold;
  cursor: help;
}
#${Y.cfg.PANEL_ID} .yro_kv small{ font-size:10px; color:#666; }
`;

    document.head.appendChild(st);
  }

  function ensurePanel() {
    ensureStyle();

    var old = document.getElementById(Y.cfg.PANEL_ID);
    if (old) old.remove();

    var el = document.createElement("div");
    el.id = Y.cfg.PANEL_ID;

    el.innerHTML = `
<div class="yro_hdr" id="yro_drag_v5" style="cursor:move;">
  <div class="yro_ttl">
    ${Y.util.iconSpan("wood")} Resource Orchestrator <span class="yro_small">(v5)</span>
  </div>
  <div>
    <span class="yro_dev">Developed by controleng</span>
    <button class="yro_btn" id="yro_close_v5">✖</button>
  </div>
</div>

<div class="yro_toolbar">
  <button class="yro_btn btn-confirm" id="yro_load_v5">Yükle / Yenile</button>
  <div class="yro_progress_outer"><div class="yro_progress_inner" id="yro_prog_bar_v5"></div></div>
  <span id="yro_prog_txt_v5" class="yro_small">Bekleniyor…</span>

  <span class="yro_small"><b>Search:</b></span>
  <input type="text" id="yro_search_v5" placeholder="Köy adı…" />

  <button class="yro_btn" id="yro_toggle_v5">Minimize villages</button>
</div>

<div class="yro_msg" id="yro_msg_v5">
  Kaynak: <b>overview_villages → prod</b> + <b>overview_villages → trader</b> (incoming resource transports).
</div>

<div id="yro_content_v5"></div>
`;

    document.body.appendChild(el);

    document.getElementById("yro_close_v5").onclick = function () { Y.destroy(); };

    // drag
    var isDragging = false, startX = 0, startY = 0, initL = 0, initT = 0;
    var handle = document.getElementById("yro_drag_v5");
    handle.onmousedown = function (e) {
      if (e.target && e.target.tagName === "BUTTON") return;
      isDragging = true;
      startX = e.clientX; startY = e.clientY;
      var r = el.getBoundingClientRect();
      initL = r.left; initT = r.top;
      e.preventDefault();
    };
    window.addEventListener("mousemove", function (e) {
      if (!isDragging) return;
      el.style.left = (initL + (e.clientX - startX)) + "px";
      el.style.top = (initT + (e.clientY - startY)) + "px";
    });
    window.addEventListener("mouseup", function () { isDragging = false; });

    document.getElementById("yro_load_v5").onclick = function () {
      if (typeof Y.main.loadAndRender === "function") Y.main.loadAndRender(true);
    };

    document.getElementById("yro_toggle_v5").onclick = function () {
      Y.state.table1.villagesCollapsed = !Y.state.table1.villagesCollapsed;
      Y.ui.render();
    };

    var inp = document.getElementById("yro_search_v5");
    inp.oninput = function () {
      Y.state.ui.search = inp.value || "";
      if (Y.state.computed.t1) {
        Y.compute.runTable1();
        Y.ui.render();
      }
    };
  }

  function setMsg(html, kind) {
    var el = document.getElementById("yro_msg_v5");
    if (!el) return;
    el.innerHTML = html;
    el.style.color = kind === "err" ? "red" : (kind === "ok" ? "green" : "black");
  }

  function setProgress(done, total, msg) {
    var bar = document.getElementById("yro_prog_bar_v5");
    var txt = document.getElementById("yro_prog_txt_v5");
    var pct = total > 0 ? Math.floor((done / total) * 100) : 0;
    if (bar) bar.style.width = pct + "%";
    if (txt) txt.textContent = msg ? (done + "/" + total + " - " + msg) : (done + "/" + total);
  }

  function hidePanel() {
    var p = document.getElementById(Y.cfg.PANEL_ID);
    if (p) p.style.display = "none";
  }
  function showPanel() {
    var p = document.getElementById(Y.cfg.PANEL_ID);
    if (p) p.style.display = "block";
  }

  // Table2 UI: only fixes required here (dropdown closing bug + label titles)
  function buildTable2ControlRow(modeKey, title, desc, controlsHtml) {
    var active = (Y.state.table2.mode === modeKey) ? "active" : "";
    return `
<div class="yro_mode_row ${active}" data-mode="${modeKey}">
  <div class="yro_mode_left">
    <div class="yro_mode_title">${title}</div>
    <div class="yro_mode_desc">${desc}</div>
  </div>
  <div class="yro_mode_controls">${controlsHtml}</div>
</div>`;
  }

  function groupOptions(selectedId) {
    return (Y.state.groups || []).map(function (x) {
      var sel = x.id === selectedId ? "selected" : "";
      return `<option value="${x.id}" ${sel}>${x.name}</option>`;
    }).join("");
  }

  function buildTable2() {
    var A = Y.state.table2.A, B = Y.state.table2.B, C = Y.state.table2.C;

    var header = `
<div class="yro_sec_head">
  <div>2) Orchestrator — Tri-balance (wood=clay=iron) + Surplus Routing</div>
  <div class="yro_sec_controls">
    <span class="yro_small">Mode seçimi: satırın boş alanına tıkla (dropdown tıklayınca kapanmaz).</span>
  </div>
</div>`;

    var info = `
<div class="yro_msg">
  <b>Kısa sözlük:</b>
  <span class="yro_small">
    <b>Surplus</b> = tri-balance sonrası artan türler → seçtiğin gruba gider.
    <b>Reserve (each)</b> = sender köylerde her kaynaktan storage*% içeride bırakır.
    <b>Cap%</b> = hedef köylerde her tür için max doluluk (storage*cap%).
  </span>
</div>`;

    var rowA = buildTable2ControlRow(
      "balance",
      "Mod A: Balance Group",
      "Hedef grubu kendi içinde dengeler; surplus’u seçtiğin gruba yollar.",
      `
<div class="yro_kv"><label title="Dengelenecek hedef grup">Target</label>
  <select id="yro_A_target_v5">${groupOptions(A.targetGroupId)}</select>
</div>
<div class="yro_kv"><label title="Artan kaynakların gideceği grup">Surplus →</label>
  <select id="yro_A_surplus_v5">${groupOptions(A.surplusGroupId)}</select>
</div>
<div class="yro_kv"><label title="Hedef köylerde max doluluk (her kaynak türü için)">Cap%</label>${Y.util.iconImg("/graphic/buildings/storage.png","Target cap")}
  <input id="yro_A_cap_v5" type="number" min="1" max="100" step="1" value="${A.capPct}" style="width:60px;" />
</div>
<div class="yro_kv"><label title="Surplus grubunda max doluluk (her tür için)">Surplus Cap%</label>${Y.util.iconImg("/graphic/buildings/storage.png","Surplus cap")}
  <input id="yro_A_scap_v5" type="number" min="1" max="100" step="1" value="${A.surplusCapPct}" style="width:60px;" />
</div>
<button class="yro_btn btn-confirm" id="yro_A_plan_v5">Plan</button>
<button class="yro_btn btn-confirm" id="yro_A_exec_v5">Execute</button>
`
    );

    var rowB = buildTable2ControlRow(
      "push",
      "Mod B: Push / Feed",
      "Sender → Target besleme; surplus’u seçtiğin gruba yollar.",
      `
<div class="yro_kv"><label title="Kaynağı gönderen grup">Sender</label>
  <select id="yro_B_sender_v5">${groupOptions(B.senderGroupId)}</select>
</div>
<div class="yro_kv"><label title="Dengelenecek hedef grup">Target</label>
  <select id="yro_B_target_v5">${groupOptions(B.targetGroupId)}</select>
</div>
<div class="yro_kv"><label title="Artan kaynakların gideceği grup">Surplus →</label>
  <select id="yro_B_surplus_v5">${groupOptions(B.surplusGroupId)}</select>
</div>
<div class="yro_kv"><label title="Gönderici köylerde her kaynaktan storage*% içeride bırakır">Reserve (each)</label>${Y.util.iconImg("/graphic/buildings/storage.png","Reserve")}
  <input id="yro_B_reserve_v5" type="number" min="0" max="100" step="1" value="${B.reservePct}" style="width:60px;" />
  <small>%</small>
</div>
<div class="yro_kv"><label title="Hedef köylerde max doluluk (her tür için)">Cap%</label>${Y.util.iconImg("/graphic/buildings/storage.png","Target cap")}
  <input id="yro_B_cap_v5" type="number" min="1" max="100" step="1" value="${B.capPct}" style="width:60px;" />
</div>
<div class="yro_kv"><label title="Surplus grubunda max doluluk (her tür için)">Surplus Cap%</label>${Y.util.iconImg("/graphic/buildings/storage.png","Surplus cap")}
  <input id="yro_B_scap_v5" type="number" min="1" max="100" step="1" value="${B.surplusCapPct}" style="width:60px;" />
</div>
<button class="yro_btn btn-confirm" id="yro_B_plan_v5">Plan</button>
<button class="yro_btn btn-confirm" id="yro_B_exec_v5">Execute</button>
`
    );

    var rowC = buildTable2ControlRow(
      "funnel",
      "Mod C: Funnel / Hoard",
      "Target dışındaki tüm köylerden Target’a akıtma (Coin gibi).",
      `
<div class="yro_kv"><label title="Target dışındaki tüm köyler">Sender</label>
  <b class="yro_small">All except Target</b>
</div>
<div class="yro_kv"><label title="Biriktirilecek hedef grup">Target</label>
  <select id="yro_C_target_v5">${groupOptions(C.targetGroupId)}</select>
</div>
<div class="yro_kv"><label title="Artan kaynakların gideceği grup">Surplus →</label>
  <select id="yro_C_surplus_v5">${groupOptions(C.surplusGroupId)}</select>
</div>
<div class="yro_kv"><label title="Gönderici köylerde her kaynaktan storage*% içeride bırakır">Reserve (each)</label>${Y.util.iconImg("/graphic/buildings/storage.png","Reserve")}
  <input id="yro_C_reserve_v5" type="number" min="0" max="100" step="1" value="${C.reservePct}" style="width:60px;" />
  <small>%</small>
</div>
<div class="yro_kv"><label title="Hedef köylerde max doluluk (her tür için)">Cap%</label>${Y.util.iconImg("/graphic/buildings/storage.png","Target cap")}
  <input id="yro_C_cap_v5" type="number" min="1" max="100" step="1" value="${C.capPct}" style="width:60px;" />
</div>
<div class="yro_kv"><label title="Surplus grubunda max doluluk (her tür için)">Surplus Cap%</label>${Y.util.iconImg("/graphic/buildings/storage.png","Surplus cap")}
  <input id="yro_C_scap_v5" type="number" min="1" max="100" step="1" value="${C.surplusCapPct}" style="width:60px;" />
</div>
<button class="yro_btn btn-confirm" id="yro_C_plan_v5">Plan</button>
<button class="yro_btn btn-confirm" id="yro_C_exec_v5">Execute</button>
`
    );

    return header + info + `<div class="yro_mode_box">${rowA}${rowB}${rowC}</div>`;
  }

  // Minimal render: Table1 stays as v4 (not repeated here). We only add table2 UI fixes.
  Y.ui.ensure = function () { ensurePanel(); };
  Y.ui.setMsg = setMsg;
  Y.ui.setProgress = setProgress;
  Y.ui.hidePanel = hidePanel;
  Y.ui.showPanel = showPanel;

  Y.ui.render = function () {
    var root = document.getElementById("yro_content_v5");
    if (!root) return;

    // Keep it simple for v5 UI: just Table2 controls placeholder.
    root.innerHTML = buildTable2();

    // --- Bind handlers ---
    // Stop propagation on inputs/selects/buttons so row click won't rerender-close dropdown
    var stopTargets = root.querySelectorAll("select, input, button, label");
    stopTargets.forEach(function (el) {
      el.addEventListener("click", function (e) { e.stopPropagation(); }, true);
    });

    // Mode row click (ignore if click comes from control)
    var rows = root.querySelectorAll(".yro_mode_row[data-mode]");
    rows.forEach(function (r) {
      r.addEventListener("click", function (e) {
        var t = e.target;
        if (t && t.closest && t.closest("select, input, button, label")) return;
        var mode = r.getAttribute("data-mode");
        if (!mode) return;
        Y.state.table2.mode = mode;
        Y.ui.render();
      });
    });

    // Wiring form values (no re-render on change)
    function readInt(id, fallback) {
      var el = document.getElementById(id);
      if (!el) return fallback;
      var v = parseInt(el.value, 10);
      return isFinite(v) ? v : fallback;
    }
    function readSel(id, fallback) {
      var el = document.getElementById(id);
      if (!el) return fallback;
      var v = parseInt(el.value, 10);
      return isFinite(v) ? v : fallback;
    }

    var A = Y.state.table2.A, B = Y.state.table2.B, C = Y.state.table2.C;

    var elA_t = document.getElementById("yro_A_target_v5");
    if (elA_t) elA_t.onchange = function () { A.targetGroupId = readSel("yro_A_target_v5", A.targetGroupId); };
    var elA_s = document.getElementById("yro_A_surplus_v5");
    if (elA_s) elA_s.onchange = function () { A.surplusGroupId = readSel("yro_A_surplus_v5", A.surplusGroupId); };
    var elA_c = document.getElementById("yro_A_cap_v5");
    if (elA_c) elA_c.onchange = function () { A.capPct = readInt("yro_A_cap_v5", A.capPct); };
    var elA_sc = document.getElementById("yro_A_scap_v5");
    if (elA_sc) elA_sc.onchange = function () { A.surplusCapPct = readInt("yro_A_scap_v5", A.surplusCapPct); };

    var elB_sender = document.getElementById("yro_B_sender_v5");
    if (elB_sender) elB_sender.onchange = function () { B.senderGroupId = readSel("yro_B_sender_v5", B.senderGroupId); };
    var elB_target = document.getElementById("yro_B_target_v5");
    if (elB_target) elB_target.onchange = function () { B.targetGroupId = readSel("yro_B_target_v5", B.targetGroupId); };
    var elB_sur = document.getElementById("yro_B_surplus_v5");
    if (elB_sur) elB_sur.onchange = function () { B.surplusGroupId = readSel("yro_B_surplus_v5", B.surplusGroupId); };
    var elB_res = document.getElementById("yro_B_reserve_v5");
    if (elB_res) elB_res.onchange = function () { B.reservePct = readInt("yro_B_reserve_v5", B.reservePct); };
    var elB_cap = document.getElementById("yro_B_cap_v5");
    if (elB_cap) elB_cap.onchange = function () { B.capPct = readInt("yro_B_cap_v5", B.capPct); };
    var elB_scap = document.getElementById("yro_B_scap_v5");
    if (elB_scap) elB_scap.onchange = function () { B.surplusCapPct = readInt("yro_B_scap_v5", B.surplusCapPct); };

    var elC_target = document.getElementById("yro_C_target_v5");
    if (elC_target) elC_target.onchange = function () { C.targetGroupId = readSel("yro_C_target_v5", C.targetGroupId); };
    var elC_sur = document.getElementById("yro_C_surplus_v5");
    if (elC_sur) elC_sur.onchange = function () { C.surplusGroupId = readSel("yro_C_surplus_v5", C.surplusGroupId); };
    var elC_res = document.getElementById("yro_C_reserve_v5");
    if (elC_res) elC_res.onchange = function () { C.reservePct = readInt("yro_C_reserve_v5", C.reservePct); };
    var elC_cap = document.getElementById("yro_C_cap_v5");
    if (elC_cap) elC_cap.onchange = function () { C.capPct = readInt("yro_C_cap_v5", C.capPct); };
    var elC_scap = document.getElementById("yro_C_scap_v5");
    if (elC_scap) elC_scap.onchange = function () { C.surplusCapPct = readInt("yro_C_scap_v5", C.surplusCapPct); };

    var btnA_plan = document.getElementById("yro_A_plan_v5");
    if (btnA_plan) btnA_plan.onclick = function () { if (Y.main.planMode) Y.main.planMode("balance"); };
    var btnA_exec = document.getElementById("yro_A_exec_v5");
    if (btnA_exec) btnA_exec.onclick = function () { if (Y.main.executeMode) Y.main.executeMode("balance"); };

    var btnB_plan = document.getElementById("yro_B_plan_v5");
    if (btnB_plan) btnB_plan.onclick = function () { if (Y.main.planMode) Y.main.planMode("push"); };
    var btnB_exec = document.getElementById("yro_B_exec_v5");
    if (btnB_exec) btnB_exec.onclick = function () { if (Y.main.executeMode) Y.main.executeMode("push"); };

    var btnC_plan = document.getElementById("yro_C_plan_v5");
    if (btnC_plan) btnC_plan.onclick = function () { if (Y.main.planMode) Y.main.planMode("funnel"); };
    var btnC_exec = document.getElementById("yro_C_exec_v5");
    if (btnC_exec) btnC_exec.onclick = function () { if (Y.main.executeMode) Y.main.executeMode("funnel"); };
  };
})();
