(function () {
  'use strict';

  var Y = window.YRO_V26;
  if (!Y) return;

  function injectCSS() {
    if (document.getElementById(Y.cfg.STYLE_ID)) return;

    var css = `
/* ===== Panel (v7 parchment theme) ===== */
#${Y.cfg.PANEL_ID}{
  position:fixed; z-index:99999;
  width: fit-content;
  min-width: 600px;
  max-width: 98vw;

  max-height: 90vh;
  display:flex;
  flex-direction:column;
  overflow:hidden;

  background:#f4e4bc;
  border:2px solid #7d510f;
  box-shadow:0 8px 22px rgba(0,0,0,.25);
  font-family:Verdana,Arial,sans-serif;
  font-size:12px;
}
#${Y.cfg.PANEL_ID} *{ box-sizing:border-box; }

/* Header */
#${Y.cfg.PANEL_ID} .yro_hdr{
  display:flex; align-items:center; justify-content:space-between;
  background:#c1a264;
  color:#fff;
  padding:6px 8px;
  border-bottom:2px solid #7d510f;
}
#${Y.cfg.PANEL_ID} .yro_ttl{ font-weight:bold; display:flex; align-items:center; gap:6px; }
#${Y.cfg.PANEL_ID} .yro_small{ font-size:11px; opacity:.95; }
#${Y.cfg.PANEL_ID} .yro_dev{ font-size:11px; opacity:.95; margin-right:10px; }
#${Y.cfg.PANEL_ID} .yro_dev a{ color:#fff; text-decoration:none; font-weight:bold; }
#${Y.cfg.PANEL_ID} .yro_dev a:hover{ text-decoration:underline; }

/* Buttons */
#${Y.cfg.PANEL_ID} .yro_btn{
  padding:3px 8px;
  border:1px solid #7d510f;
  background:#f0e2be;
  cursor:pointer;
  border-radius:3px;
  font-weight:bold;
}
#${Y.cfg.PANEL_ID} .yro_btn:hover{ filter:brightness(1.03); }
#${Y.cfg.PANEL_ID} .btn-confirm{ background:#d9edc9; border-color:#3b6a3b; }
#${Y.cfg.PANEL_ID} .btn-warn{ background:#ffe2b7; border-color:#a66a00; }

/* Toolbar */
#${Y.cfg.PANEL_ID} .yro_toolbar{
  display:flex; align-items:center; gap:8px; flex-wrap:wrap;
  padding:6px 8px;
  border-bottom:1px solid #7d510f;
  background:#f0e2be;
}
#${Y.cfg.PANEL_ID} .yro_progress_outer{
  width:180px; height:10px;
  border:1px solid #7d510f;
  background:#fff5da;
  border-radius:10px; overflow:hidden;
}
#${Y.cfg.PANEL_ID} .yro_progress_inner{ height:100%; width:0%; background:#4f8b2d; }

/* Message bar */
#${Y.cfg.PANEL_ID} .yro_msg{
  padding:6px 8px;
  border-bottom:1px solid #7d510f;
  background:#fff5da;
}

/* Content scroll area */
#${Y.cfg.PANEL_ID} #yro_content_v26{
  padding:8px;
  flex:1;
  overflow-y:auto;
  overflow-x:auto;
  background:#f4e4bc;
}

/* Sections */
#${Y.cfg.PANEL_ID} .yro_sec_head{
  display:flex; align-items:center; justify-content:space-between;
  padding:6px 6px;
  background:#f0e2be;
  border:1px solid #7d510f;
  border-radius:6px;
  margin-top:8px;
  font-weight:bold;
}
#${Y.cfg.PANEL_ID} .yro_sec_controls{
  display:flex; align-items:center; gap:6px; flex-wrap:wrap;
  font-weight:normal;
}
#${Y.cfg.PANEL_ID} .yro_mini{
  padding:2px 6px;
  border:1px solid #7d510f;
  background:#fff5da;
  cursor:pointer;
  border-radius:3px;
}

#${Y.cfg.PANEL_ID} .yro_scroll{
  border:1px solid #7d510f;
  border-top:none;
  background:#fff5da;
}

#${Y.cfg.PANEL_ID} .yro_table{
  width:100%;
  border-collapse:collapse;
  background:#fff5da;
}
#${Y.cfg.PANEL_ID} .yro_table th, #${Y.cfg.PANEL_ID} .yro_table td{
  border:1px solid #7d510f;
  padding:3px 6px;
  white-space:nowrap;
}
#${Y.cfg.PANEL_ID} .yro_table th{
  background:#c1a264;
  color:#fff;
  position:sticky;
  top:0;
  z-index:2;
}
#${Y.cfg.PANEL_ID} .yro_right{ text-align:right; }
#${Y.cfg.PANEL_ID} .yro_center{ text-align:center; }

#${Y.cfg.PANEL_ID} .yro_table tr:nth-child(even) td{ background:#f0e2be; }
#${Y.cfg.PANEL_ID} .yro_total_row td{ background:#e8d5a1 !important; font-weight:bold; }

/* Modes box */
#${Y.cfg.PANEL_ID} .yro_mode_box{
  margin-top:8px;
  border:1px solid #7d510f;
  border-radius:8px;
  overflow:hidden;
  background:#fff5da;
}
#${Y.cfg.PANEL_ID} .yro_mode_row{
  display:flex; gap:10px;
  padding:8px;
  border-bottom:1px solid #7d510f;
  cursor:pointer;
}
#${Y.cfg.PANEL_ID} .yro_mode_row:last-child{ border-bottom:none; }
#${Y.cfg.PANEL_ID} .yro_mode_row.active{ background:#d9edc9; }
#${Y.cfg.PANEL_ID} .yro_mode_left{ flex:1; }
#${Y.cfg.PANEL_ID} .yro_mode_title{ font-weight:bold; margin-bottom:2px; }
#${Y.cfg.PANEL_ID} .yro_mode_desc{ color:#333; }
#${Y.cfg.PANEL_ID} .yro_mode_controls{
  display:flex; flex-wrap:wrap; gap:8px;
  align-items:flex-end; justify-content:flex-end;
  min-width: 540px;
}
#${Y.cfg.PANEL_ID} .yro_plan_diag{
  margin-top:6px;
}
#${Y.cfg.PANEL_ID} .yro_diag_line{
  margin:2px 0;
}
#${Y.cfg.PANEL_ID} .yro_table_tools{
  display:flex;
  align-items:center;
  gap:8px;
}
#${Y.cfg.PANEL_ID} .yro_kv{ display:flex; flex-direction:column; gap:2px; }
#${Y.cfg.PANEL_ID} .yro_kv label{ font-size:11px; opacity:.9; }
#${Y.cfg.PANEL_ID} input[type="number"]{ padding:2px 4px; }
#${Y.cfg.PANEL_ID} select{ padding:2px 4px; }

/* Scrollbar */
#${Y.cfg.PANEL_ID} ::-webkit-scrollbar { width: 12px; height: 12px; }
#${Y.cfg.PANEL_ID} ::-webkit-scrollbar-track { background: #f0e2be; border-radius: 4px; }
#${Y.cfg.PANEL_ID} ::-webkit-scrollbar-thumb {
  background: #7d510f;
  border-radius: 4px;
  border: 2px solid #f0e2be;
}
#${Y.cfg.PANEL_ID} ::-webkit-scrollbar-thumb:hover { background: #5c3a0b; }

/* Modal (global by overlay id) */
#${Y.cfg.PICKER_OVERLAY_ID}{
  position:fixed; left:0; top:0; right:0; bottom:0;
  background:rgba(0,0,0,.45);
  z-index:100000;
  display:flex;
  align-items:center;
  justify-content:center;
}
#${Y.cfg.PICKER_OVERLAY_ID} .yro_modal_box{
  width:min(900px, 95vw);
  max-height:85vh;
  display:flex;
  flex-direction:column;
  background:#f4e4bc;
  border:2px solid #7d510f;
  box-shadow:0 10px 30px rgba(0,0,0,.35);
}
#${Y.cfg.PICKER_OVERLAY_ID} .yro_modal_head{
  background:#c1a264;
  color:#fff;
  padding:8px 10px;
  display:flex;
  align-items:center;
  justify-content:space-between;
  font-weight:bold;
  border-bottom:2px solid #7d510f;
}
#${Y.cfg.PICKER_OVERLAY_ID} .yro_modal_body{
  padding:8px;
  overflow:auto;
  background:#fff5da;
}
#${Y.cfg.PICKER_OVERLAY_ID} .yro_modal_toolbar{
  display:flex; gap:8px; flex-wrap:wrap;
  align-items:center;
  margin-bottom:8px;
}
#${Y.cfg.PICKER_OVERLAY_ID} .yro_modal_list{
  width:100%;
  border-collapse:collapse;
}
#${Y.cfg.PICKER_OVERLAY_ID} .yro_modal_list th,
#${Y.cfg.PICKER_OVERLAY_ID} .yro_modal_list td{
  border:1px solid #7d510f;
  padding:4px 6px;
  white-space:nowrap;
}
#${Y.cfg.PICKER_OVERLAY_ID} .yro_modal_list th{
  background:#c1a264;
  color:#fff;
  position:sticky;
  top:0;
}
#${Y.cfg.PICKER_OVERLAY_ID} .yro_modal_foot{
  padding:8px 10px;
  background:#f0e2be;
  border-top:1px solid #7d510f;
  display:flex;
  justify-content:flex-end;
  gap:8px;
}
    `;

    var st = document.createElement('style');
    st.id = Y.cfg.STYLE_ID;
    st.textContent = css;
    document.head.appendChild(st);
  }

    function buildPanel() {
    injectCSS();

    var st = Y.state;

    var root = document.createElement('div');
    root.id = Y.cfg.PANEL_ID;
    root.style.left = (st.ui.left || 30) + 'px';
    root.style.top = (st.ui.top || 70) + 'px';

    root.innerHTML = `
<div class="yro_hdr" id="yro_drag_v26" style="cursor:move;">
  <div class="yro_ttl"><span class="icon header wood"></span> Resource Orchestrator <span class="yro_small">(v26)</span></div>
  <div style="display:flex; align-items:center;">
        <span class="yro_dev"><b>Developed by <a href="https://www.twstats.com/en1/index.php?page=player&id=315027" target="_blank" rel="noopener noreferrer">Controleng</a></b></span>
    <button class="yro_btn" id="yro_close_v26">X</button>
  </div>
</div>

<div class="yro_toolbar">
  <button class="yro_btn btn-confirm" id="yro_load_v26">Load / Refresh (Full Scan)</button>
  <div class="yro_progress_outer"><div class="yro_progress_inner" id="yro_prog_bar_v26"></div></div>
  <span id="yro_prog_txt_v26" class="yro_small">0/0 - Ready</span>

  <span class="yro_small"><b>Search:</b></span>
  <input type="text" id="yro_search_v26" placeholder="Village name..." style="width:180px;">

  <button class="yro_btn btn-confirm" id="yro_copy_bb_v26">Copy BBCode</button>
</div>

<div class="yro_msg" id="yro_msg_v26" style="color:#0a6;">Ready</div>

<div id="yro_content_v26">
  <div class="yro_sec_head">
    <div>1) Villages - Production (per hour + 24h) (<span id="yro_t1_title_v26">All villages</span>)</div>
    <div class="yro_sec_controls">
      <button class="yro_mini" id="yro_t1_toggle_v26">${st.ui.minimized1 ? 'Expand' : 'Minimize'}</button>
      <span class="yro_small"><b>Group:</b></span>
      <select id="yro_t1_group_sel_v26"></select>
      <button class="yro_mini" id="yro_t1_pick_v26">Pick...</button>
    </div>
  </div>
  <div class="yro_scroll" id="yro_t1_wrap_v26" style="${st.ui.minimized1 ? 'display:none;' : ''}">
    <table class="yro_table" id="yro_t1_tbl_v26"></table>
  </div>

  <div class="yro_sec_head">
    <div>2) Villages - Current + Incoming + Outgoing (per village) (<span id="yro_t2_title_v26">All villages</span>)</div>
    <div class="yro_sec_controls">
      <button class="yro_mini" id="yro_t2_toggle_v26">${st.ui.minimized2 ? 'Expand' : 'Minimize'}</button>
      <span class="yro_small"><b>Group:</b></span>
      <select id="yro_t2_group_sel_v26"></select>
      <button class="yro_mini" id="yro_t2_pick_v26">Pick...</button>
      <span class="yro_small" id="yro_scan_ts_v26"></span>
    </div>
  </div>
  <div class="yro_scroll" id="yro_t2_wrap_v26" style="${st.ui.minimized2 ? 'display:none;' : ''}">
    <table class="yro_table" id="yro_t2_tbl_v26"></table>
  </div>

  <div class="yro_sec_head">
    <div>3) Orchestrator - Versioned planning</div>
    <div class="yro_sec_controls"><span class="yro_small">Click a mode row to focus it.</span></div>
  </div>

  <div class="yro_mode_box" id="yro_modes_v26"></div>

  <div class="yro_msg" id="yro_plan_meta_v26" style="margin-top:8px;">
    <b>Mode:</b> - | <b>Computed Fill %:</b> - | <b>Cap Ceiling %:</b> - | <b>Surplus Cap %:</b> - | <b>Merch Used:</b> - | <b>Shipments:</b> 0 | <b>Warnings:</b> -
  </div>

  <div class="yro_msg yro_plan_diag" id="yro_plan_diag_v26">Diagnostics: -</div>

  <div class="yro_sec_head">
    <div id="yro_plan_target_title_v26">TARGET GROUP</div>
    <div class="yro_sec_controls yro_table_tools">
      <button class="yro_mini" id="yro_copy_plan_target_v26">Copy TARGET GROUP</button>
    </div>
  </div>
  <div class="yro_scroll">
    <table class="yro_table" id="yro_plan_target_tbl_v26"></table>
  </div>

  <div class="yro_sec_head">
    <div id="yro_plan_surplus_title_v26">SURPLUS</div>
    <div class="yro_sec_controls yro_table_tools">
      <button class="yro_mini" id="yro_copy_plan_surplus_v26">Copy SURPLUS</button>
    </div>
  </div>
  <div class="yro_scroll" style="margin-top:8px;">
    <table class="yro_table" id="yro_plan_surplus_tbl_v26"></table>
  </div>

  <div class="yro_sec_head">
    <div id="yro_plan_ship_title_v26">SHIPMENTS</div>
    <div class="yro_sec_controls yro_table_tools">
      <button class="yro_mini" id="yro_copy_plan_ship_v26">Copy SHIPMENTS</button>
    </div>
  </div>
  <div class="yro_scroll" style="margin-top:8px;">
    <table class="yro_table" id="yro_plan_ship_tbl_v26"></table>
  </div>
</div>
    `;

    document.body.appendChild(root);
    return root;
  }

  function setMsg(text, color) {
    var el = Y.qs('#yro_msg_v26');
    if (!el) return;
    el.textContent = text;
    if (color) el.style.color = color;
  }

  function setProgress(step, total, text) {
    var bar = Y.qs('#yro_prog_bar_v26');
    var tx = Y.qs('#yro_prog_txt_v26');
    if (!bar || !tx) return;
    var pct = total ? Math.round((step / total) * 100) : 0;
    bar.style.width = pct + '%';
    tx.textContent = step + '/' + total + ' - ' + text;
  }

  function fillGroupSelects(groups) {
    groups = Array.isArray(groups) ? groups : [];
    var st = Y.state;

    function fill(selId, selected) {
      var sel = Y.qs(selId);
      if (!sel) return;
      sel.innerHTML = '';
      if (!groups.length) {
        var o0 = document.createElement('option');
        o0.value = '0';
        o0.textContent = 'All villages';
        sel.appendChild(o0);
        return;
      }
      groups.forEach(function (g) {
        var o = document.createElement('option');
        o.value = String(g.id);
        o.textContent = g.name;
        if (String(g.id) === String(selected)) o.selected = true;
        sel.appendChild(o);
      });
    }

    fill('#yro_t1_group_sel_v26', st.groups.sel1);
    fill('#yro_t2_group_sel_v26', st.groups.sel2);
  }

    function buildModesBox(groups) {
    groups = Array.isArray(groups) ? groups : [];
    var st = Y.state;

    function esc(s) {
      return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }
    function optionsHTML(selectedId) {
      if (!groups.length) return '<option value="0">All villages</option>';
      return groups.map(function (g) {
        var sel = String(g.id) === String(selectedId) ? ' selected' : '';
        return '<option value="' + g.id + '"' + sel + '>' + esc(g.name) + '</option>';
      }).join('');
    }

    var wrap = Y.qs('#yro_modes_v26');
    if (!wrap) return;

    wrap.innerHTML = `
<div class="yro_mode_row ${st.orchestrator.mode === 'balance' ? 'active' : ''}" data-mode="balance">
  <div class="yro_mode_left">
    <div class="yro_mode_title">Mode A: Internal Equalizer</div>
    <div class="yro_mode_desc">Target group rebalances internally to the highest feasible common fill. Surplus last.</div>
  </div>
  <div class="yro_mode_controls">
    <div class="yro_kv"><label>Target</label><select id="yro_A_target_v26">${optionsHTML(st.groups.A_target)}</select></div>
    <button class="yro_mini" id="pick_A_target_v26">Pick...</button>
    <div class="yro_kv"><label>Surplus</label><select id="yro_A_surplus_v26">${optionsHTML(st.groups.A_surplus)}</select></div>
    <button class="yro_mini" id="pick_A_surplus_v26">Pick...</button>
    <div class="yro_kv"><label>Cap%</label><input id="yro_A_cap_v26" type="number" min="1" max="100" step="1" value="${st.modeA.capPct}" style="width:60px;"></div>
    <div class="yro_kv"><label>Surplus Cap%</label><input id="yro_A_scap_v26" type="number" min="1" max="100" step="1" value="${st.modeA.surplusCapPct}" style="width:60px;"></div>
    <div class="yro_kv"><label>Computed Fill %</label><input id="yro_A_computed_fill_v26" type="number" value="" style="width:78px;" disabled></div>
    <div class="yro_kv"><label>Merch Used</label><input id="yro_A_merch_used_v26" type="number" value="" style="width:70px;" disabled></div>
    <button class="yro_btn btn-confirm" id="yro_A_plan_v26">Plan</button>
    <button class="yro_btn btn-confirm" id="yro_A_exec_v26">Execute</button>
  </div>
</div>

<div class="yro_mode_row ${st.orchestrator.mode === 'push' ? 'active' : ''}" data-mode="push">
  <div class="yro_mode_left">
    <div class="yro_mode_title">Mode B: Parents -> Children</div>
    <div class="yro_mode_desc">Children rebalance with current stock first, Parents fill the remaining gaps, Surplus last.</div>
  </div>
  <div class="yro_mode_controls">
    <div class="yro_kv"><label>Parents</label><select id="yro_B_parents_v26">${optionsHTML(st.groups.B_parents)}</select></div>
    <button class="yro_mini" id="pick_B_parents_v26">Pick...</button>
    <div class="yro_kv"><label>Children</label><select id="yro_B_children_v26">${optionsHTML(st.groups.B_children)}</select></div>
    <button class="yro_mini" id="pick_B_children_v26">Pick...</button>
    <div class="yro_kv"><label>Surplus</label><select id="yro_B_surplus_v26">${optionsHTML(st.groups.B_surplus)}</select></div>
    <button class="yro_mini" id="pick_B_surplus_v26">Pick...</button>
    <div class="yro_kv"><label>Parent Reserve %</label><input id="yro_B_parent_reserve_v26" type="number" min="0" max="100" step="1" value="${st.modeB.parentReservePct}" style="width:70px;"></div>
    <div class="yro_kv"><label>Children Max Fill %</label><input id="yro_B_child_max_v26" type="number" min="0" max="100" step="1" value="${st.modeB.childrenMaxFillPct}" style="width:78px;"></div>
    <div class="yro_kv"><label>Surplus Cap %</label><input id="yro_B_scap_v26" type="number" min="0" max="100" step="1" value="${st.modeB.surplusCapPct}" style="width:70px;"></div>
    <div class="yro_kv"><label>Computed Child Fill %</label><input id="yro_B_computed_fill_v26" type="number" value="" style="width:78px;" disabled></div>
    <div class="yro_kv"><label>Child Merch Used</label><input id="yro_B_child_merch_v26" type="number" value="" style="width:70px;" disabled></div>
    <div class="yro_kv"><label>Parent Merch Used</label><input id="yro_B_parent_merch_v26" type="number" value="" style="width:78px;" disabled></div>
    <button class="yro_btn btn-confirm" id="yro_B_plan_v26">Plan</button>
    <button class="yro_btn btn-confirm" id="yro_B_exec_v26">Execute</button>
  </div>
</div>

<div class="yro_mode_row ${st.orchestrator.mode === 'funnel' ? 'active' : ''}" data-mode="funnel">
  <div class="yro_mode_left">
    <div class="yro_mode_title">Mode C: Funnel / Hoard</div>
    <div class="yro_mode_desc">Everyone outside Target sends into Target, leftovers into Surplus.</div>
  </div>
  <div class="yro_mode_controls">
    <div class="yro_kv"><label>Target</label><select id="yro_C_target_v26">${optionsHTML(st.groups.C_target)}</select></div>
    <button class="yro_mini" id="pick_C_target_v26">Pick...</button>
    <div class="yro_kv"><label>Surplus</label><select id="yro_C_surplus_v26">${optionsHTML(st.groups.C_surplus)}</select></div>
    <button class="yro_mini" id="pick_C_surplus_v26">Pick...</button>
    <div class="yro_kv"><label>Reserve%</label><input id="yro_C_reserve_v26" type="number" min="0" max="100" step="1" value="${st.modeC.reservePct}" style="width:60px;"></div>
    <div class="yro_kv"><label>Cap%</label><input id="yro_C_cap_v26" type="number" min="1" max="100" step="1" value="${st.modeC.capPct}" style="width:60px;"></div>
    <div class="yro_kv"><label>Surplus Cap%</label><input id="yro_C_scap_v26" type="number" min="1" max="100" step="1" value="${st.modeC.surplusCapPct}" style="width:60px;"></div>
    <div class="yro_kv"><label>Tolerance%</label><input id="yro_C_tol_v26" type="number" min="0" max="25" step="1" value="5" style="width:60px;"></div>
    <div class="yro_kv"><label>Iron Delta%</label><input id="yro_C_iron_v26" type="number" min="-50" max="50" step="1" value="${st.modeC.ironDeltaPct == null ? '' : st.modeC.ironDeltaPct}" style="width:70px;"></div>
    <button class="yro_btn btn-confirm" id="yro_C_plan_v26">Plan</button>
    <button class="yro_btn btn-confirm" id="yro_C_exec_v26">Execute</button>
  </div>
</div>
    `;
  }

  function enableDrag(panel) {
    var st = Y.state;
    var hdr = Y.qs('#yro_drag_v26');
    if (!hdr || !panel) return;

    var dragging = false, startX = 0, startY = 0, startL = 0, startT = 0;

    Y.on(hdr, 'mousedown', function (e) {
      if (e.target && e.target.id === 'yro_close_v26') return;
      dragging = true;
      startX = e.clientX; startY = e.clientY;
      startL = panel.offsetLeft; startT = panel.offsetTop;
      e.preventDefault();
    });

    Y.on(document, 'mousemove', function (e) {
      if (!dragging) return;
      panel.style.left = (startL + (e.clientX - startX)) + 'px';
      panel.style.top = (startT + (e.clientY - startY)) + 'px';
    });

    Y.on(document, 'mouseup', function () {
      if (!dragging) return;
      dragging = false;
      st.ui.left = panel.offsetLeft;
      st.ui.top = panel.offsetTop;
      Y.saveState();
    });
  }

  function buildPickerModal(candidates, currentSelection, onSaveCallback) {
    candidates = Array.isArray(candidates) ? candidates : [];
    var selected = new Set((currentSelection || []).map(function (x) { return String(x); }));

    var overlay = document.createElement('div');
    overlay.id = Y.cfg.PICKER_OVERLAY_ID;

    var box = document.createElement('div');
    box.className = 'yro_modal_box';

    box.innerHTML = `
<div class="yro_modal_head">
  <div>Pick villages (checkbox)</div>
  <button class="yro_btn" id="yro_picker_close_v26">âœ–</button>
</div>
<div class="yro_modal_body">
  <div class="yro_modal_toolbar">
    <span class="yro_small"><b>Search:</b></span>
    <input type="text" id="yro_picker_search_v26" style="width:220px;" placeholder="name / coord">
    <button class="yro_btn" id="yro_picker_all_v26">Select all</button>
    <button class="yro_btn" id="yro_picker_none_v26">Select none</button>
    <span class="yro_small" id="yro_picker_count_v26"></span>
  </div>
  <table class="yro_modal_list" id="yro_picker_tbl_v26">
    <tr><th></th><th>Village</th><th>Coord</th><th class="yro_right">Storage</th></tr>
  </table>
</div>
<div class="yro_modal_foot">
  <button class="yro_btn" id="yro_picker_cancel_v26">Cancel</button>
  <button class="yro_btn btn-confirm" id="yro_picker_save_v26">Kaydet</button>
</div>
    `;

    overlay.appendChild(box);
    document.body.appendChild(overlay);

    function updateCount() {
      var el = box.querySelector('#yro_picker_count_v26');
      if (el) el.textContent = 'Selected: ' + selected.size;
    }

    function renderList(filterText) {
      filterText = String(filterText || '').toLowerCase();
      var tbl = box.querySelector('#yro_picker_tbl_v26');
      if (!tbl) return;

      tbl.innerHTML = `<tr><th></th><th>Village</th><th>Coord</th><th class="yro_right">Storage</th></tr>`;

      var shown = 0;
      candidates.forEach(function (v) {
        var name = String(v.name || '');
        var coord = String(v.coord || '');
        var storage = Y.safeInt(v.storage, 0);

        var hay = (name + ' ' + coord).toLowerCase();
        if (filterText && hay.indexOf(filterText) < 0) return;

        shown++;

        var tr = document.createElement('tr');
        tr.innerHTML = `
<td class="yro_center"><input type="checkbox" data-vid="${v.id}"></td>
<td><b>${name}</b></td>
<td>${coord}</td>
<td class="yro_right">${Y.formatTwNumber(storage)}</td>
        `;
        var cb = tr.querySelector('input[type="checkbox"]');
        cb.checked = selected.has(String(v.id));
        cb.addEventListener('change', function () {
          var k = String(v.id);
          if (cb.checked) selected.add(k); else selected.delete(k);
          updateCount();
        });

        tbl.appendChild(tr);
      });

      if (!shown) {
        var tr0 = document.createElement('tr');
        tr0.innerHTML = `<td colspan="4">No match.</td>`;
        tbl.appendChild(tr0);
      }

      updateCount();
    }

    function close() {
      if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
    }

    box.querySelector('#yro_picker_close_v26').addEventListener('click', close);
    box.querySelector('#yro_picker_cancel_v26').addEventListener('click', close);

    box.querySelector('#yro_picker_all_v26').addEventListener('click', function () {
      candidates.forEach(function (v) { selected.add(String(v.id)); });
      renderList(box.querySelector('#yro_picker_search_v26').value);
    });

    box.querySelector('#yro_picker_none_v26').addEventListener('click', function () {
      selected.clear();
      renderList(box.querySelector('#yro_picker_search_v26').value);
    });

    box.querySelector('#yro_picker_save_v26').addEventListener('click', function () {
      var ids = Array.from(selected).map(function (s) { return Y.safeInt(s, 0); }).filter(Boolean);
      try { onSaveCallback(ids); } catch (e) {}
      close();
    });

    box.querySelector('#yro_picker_search_v26').addEventListener('input', Y.debounce(function (e) {
      renderList(e.target.value);
    }, 120));

    candidates = candidates.slice().sort(function (a, b) {
      return String(a.name || '').localeCompare(String(b.name || ''));
    });
    renderList('');
  }

  function renderTable1(villageIds) {
    var st = Y.state;
    var q = (st.ui.search || '').toLowerCase();

    var rows = [];
    (villageIds || []).forEach(function (vid) {
      var s = Y.runtime.snapshotsById[vid];
      if (!s) return;
      if (q && String(s.name).toLowerCase().indexOf(q) < 0) return;
      rows.push(s);
    });
    rows.sort(function (a, b) { return String(a.name).localeCompare(String(b.name)); });

    var tbl = Y.qs('#yro_t1_tbl_v26');
    if (!tbl) return;

    var sumWH = 0, sumCH = 0, sumIH = 0;
    var sumW24 = 0, sumC24 = 0, sumI24 = 0;

    var html = `
<tr>
  <th>Village</th>
  <th class="yro_right">Storage</th>
  <th class="yro_center">Merch (free/total)</th>
  <th class="yro_right"><span class="icon header wood"></span> /h</th>
  <th class="yro_right"><span class="icon header stone"></span> /h</th>
  <th class="yro_right"><span class="icon header iron"></span> /h</th>
  <th class="yro_right">/h Total</th>
  <th class="yro_right"><span class="icon header wood"></span> 24h</th>
  <th class="yro_right"><span class="icon header stone"></span> 24h</th>
  <th class="yro_right"><span class="icon header iron"></span> 24h</th>
  <th class="yro_right">24h Total</th>
</tr>`;

    if (!rows.length) {
      html += `<tr><td colspan="11">No villages.</td></tr>`;
    } else {
      rows.forEach(function (v) {
        sumWH += v.prodH.wood; sumCH += v.prodH.clay; sumIH += v.prodH.iron;
        sumW24 += v.prod24.wood; sumC24 += v.prod24.clay; sumI24 += v.prod24.iron;

        var href = '/game.php?village=' + v.id + '&screen=overview';
        html += `
<tr>
  <td><a href="${href}" target="_blank" rel="noopener noreferrer"><b>${String(v.name)}</b></a></td>
  <td class="yro_right">${Y.formatTwNumber(v.storage)}</td>
  <td class="yro_center">${Y.formatTwNumber(v.merch.free)}/${Y.formatTwNumber(v.merch.total)}</td>
  <td class="yro_right"><b>${Y.formatTwNumber(v.prodH.wood)}</b></td>
  <td class="yro_right"><b>${Y.formatTwNumber(v.prodH.clay)}</b></td>
  <td class="yro_right"><b>${Y.formatTwNumber(v.prodH.iron)}</b></td>
  <td class="yro_right"><b>${Y.formatTwNumber(v.prodH.total)}</b></td>
  <td class="yro_right">${Y.formatTwNumber(v.prod24.wood)}</td>
  <td class="yro_right">${Y.formatTwNumber(v.prod24.clay)}</td>
  <td class="yro_right">${Y.formatTwNumber(v.prod24.iron)}</td>
  <td class="yro_right"><b>${Y.formatTwNumber(v.prod24.total)}</b></td>
</tr>`;
      });

      html += `
<tr class="yro_total_row">
  <td><b>TOTAL</b> <span class="yro_small">(${rows.length} villages)</span></td>
  <td></td>
  <td></td>
  <td class="yro_right"><b>${Y.formatTwNumber(sumWH)}</b></td>
  <td class="yro_right"><b>${Y.formatTwNumber(sumCH)}</b></td>
  <td class="yro_right"><b>${Y.formatTwNumber(sumIH)}</b></td>
  <td class="yro_right"><b>${Y.formatTwNumber(sumWH + sumCH + sumIH)}</b></td>
  <td class="yro_right"><b>${Y.formatTwNumber(sumW24)}</b></td>
  <td class="yro_right"><b>${Y.formatTwNumber(sumC24)}</b></td>
  <td class="yro_right"><b>${Y.formatTwNumber(sumI24)}</b></td>
  <td class="yro_right"><b>${Y.formatTwNumber(sumW24 + sumC24 + sumI24)}</b></td>
</tr>`;
    }

    tbl.innerHTML = html;
  }

  function renderTable2(villageIds, incomingAllByVid, incomingExternalByVid, outgoingByVid) {
    var st = Y.state;
    var q = (st.ui.search || '').toLowerCase();

    var rows = [];
    (villageIds || []).forEach(function (vid) {
      var s = Y.runtime.snapshotsById[vid];
      if (!s) return;
      if (q && String(s.name).toLowerCase().indexOf(q) < 0) return;

      var incAll = incomingAllByVid && incomingAllByVid[vid] ? incomingAllByVid[vid] : { wood: 0, clay: 0, iron: 0, total: 0 };
      var incExt = incomingExternalByVid && incomingExternalByVid[vid] ? incomingExternalByVid[vid] : { wood: 0, clay: 0, iron: 0, total: 0 };
      var out = outgoingByVid && outgoingByVid[vid] ? outgoingByVid[vid] : { wood: 0, clay: 0, iron: 0, total: 0 };

      rows.push({ snap: s, incAll: incAll, incExt: incExt, out: out });
    });

    rows.sort(function (a, b) { return String(a.snap.name).localeCompare(String(b.snap.name)); });

    var tbl = Y.qs('#yro_t2_tbl_v26');
    if (!tbl) return;

    var totals = {
      storage: 0,
      merchFree: 0,
      merchTotal: 0,
      nowW: 0, nowC: 0, nowI: 0, nowT: 0,
      inW: 0, inC: 0, inI: 0, inT: 0,
      outW: 0, outC: 0, outI: 0, outT: 0,
      effT: 0,
      extT: 0
    };

    var html = `
<tr>
  <th>Village</th>
  <th class="yro_right">Storage</th>
  <th class="yro_center">Merch (free/total)</th>

  <th class="yro_right"><span class="icon header wood"></span> Now</th>
  <th class="yro_right"><span class="icon header stone"></span> Now</th>
  <th class="yro_right"><span class="icon header iron"></span> Now</th>
  <th class="yro_right">Now Total</th>

  <th class="yro_right"><span class="icon header wood"></span> Incoming</th>
  <th class="yro_right"><span class="icon header stone"></span> Incoming</th>
  <th class="yro_right"><span class="icon header iron"></span> Incoming</th>
  <th class="yro_right">In Total</th>

  <th class="yro_right"><span class="icon header wood"></span> Out</th>
  <th class="yro_right"><span class="icon header stone"></span> Out</th>
  <th class="yro_right"><span class="icon header iron"></span> Out</th>
  <th class="yro_right">Out Total</th>

  <th class="yro_right">Eff (Now+In)</th>
  <th class="yro_right">In External</th>
</tr>`;

    if (!rows.length) {
      html += `<tr><td colspan="17">No villages.</td></tr>`;
    } else {
      rows.forEach(function (r) {
        var v = r.snap;
        var now = v.resNow;
        var effTotal = (now.total || 0) + (r.incAll.total || 0);

        totals.storage += v.storage || 0;
        totals.merchFree += v.merch.free || 0;
        totals.merchTotal += v.merch.total || 0;

        totals.nowW += now.wood || 0;
        totals.nowC += now.clay || 0;
        totals.nowI += now.iron || 0;
        totals.nowT += now.total || 0;

        totals.inW += r.incAll.wood || 0;
        totals.inC += r.incAll.clay || 0;
        totals.inI += r.incAll.iron || 0;
        totals.inT += r.incAll.total || 0;

        totals.outW += r.out.wood || 0;
        totals.outC += r.out.clay || 0;
        totals.outI += r.out.iron || 0;
        totals.outT += r.out.total || 0;

        totals.effT += effTotal;
        totals.extT += r.incExt.total || 0;

        var href = '/game.php?village=' + v.id + '&screen=overview';
        html += `
<tr title="Incoming External: W ${Y.formatTwNumber(r.incExt.wood)} / C ${Y.formatTwNumber(r.incExt.clay)} / I ${Y.formatTwNumber(r.incExt.iron)}">
  <td><a href="${href}" target="_blank" rel="noopener noreferrer"><b>${String(v.name)}</b></a></td>
  <td class="yro_right">${Y.formatTwNumber(v.storage)}</td>
  <td class="yro_center">${Y.formatTwNumber(v.merch.free)}/${Y.formatTwNumber(v.merch.total)}</td>

  <td class="yro_right">${Y.formatTwNumber(now.wood)}</td>
  <td class="yro_right">${Y.formatTwNumber(now.clay)}</td>
  <td class="yro_right">${Y.formatTwNumber(now.iron)}</td>
  <td class="yro_right"><b>${Y.formatTwNumber(now.total)}</b></td>

  <td class="yro_right"><b>${Y.formatTwNumber(r.incAll.wood)}</b></td>
  <td class="yro_right"><b>${Y.formatTwNumber(r.incAll.clay)}</b></td>
  <td class="yro_right"><b>${Y.formatTwNumber(r.incAll.iron)}</b></td>
  <td class="yro_right"><b>${Y.formatTwNumber(r.incAll.total)}</b></td>

  <td class="yro_right">${Y.formatTwNumber(r.out.wood)}</td>
  <td class="yro_right">${Y.formatTwNumber(r.out.clay)}</td>
  <td class="yro_right">${Y.formatTwNumber(r.out.iron)}</td>
  <td class="yro_right">${Y.formatTwNumber(r.out.total)}</td>

  <td class="yro_right"><b>${Y.formatTwNumber(effTotal)}</b></td>
  <td class="yro_right">${Y.formatTwNumber(r.incExt.total)}</td>
</tr>`;
      });

      html += `
<tr class="yro_total_row">
  <td><b>TOTAL</b> <span class="yro_small">(${rows.length} villages)</span></td>
  <td class="yro_right">${Y.formatTwNumber(totals.storage)}</td>
  <td class="yro_center">${Y.formatTwNumber(totals.merchFree)}/${Y.formatTwNumber(totals.merchTotal)}</td>

  <td class="yro_right">${Y.formatTwNumber(totals.nowW)}</td>
  <td class="yro_right">${Y.formatTwNumber(totals.nowC)}</td>
  <td class="yro_right">${Y.formatTwNumber(totals.nowI)}</td>
  <td class="yro_right"><b>${Y.formatTwNumber(totals.nowT)}</b></td>

  <td class="yro_right">${Y.formatTwNumber(totals.inW)}</td>
  <td class="yro_right">${Y.formatTwNumber(totals.inC)}</td>
  <td class="yro_right">${Y.formatTwNumber(totals.inI)}</td>
  <td class="yro_right"><b>${Y.formatTwNumber(totals.inT)}</b></td>

  <td class="yro_right">${Y.formatTwNumber(totals.outW)}</td>
  <td class="yro_right">${Y.formatTwNumber(totals.outC)}</td>
  <td class="yro_right">${Y.formatTwNumber(totals.outI)}</td>
  <td class="yro_right"><b>${Y.formatTwNumber(totals.outT)}</b></td>

  <td class="yro_right"><b>${Y.formatTwNumber(totals.effT)}</b></td>
  <td class="yro_right">${Y.formatTwNumber(totals.extT)}</td>
</tr>`;
    }

    tbl.innerHTML = html;

    var ts = Y.qs('#yro_scan_ts_v26');
    if (ts) ts.textContent = 'Last scan: ' + (Y.state.cache.lastFullScanAt ? new Date(Y.state.cache.lastFullScanAt).toLocaleTimeString() : '-');
  }

    function escHtml(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function renderPlanTables(plan, snapshotsById) {
    var metaEl = Y.qs('#yro_plan_meta_v26');
    var diagEl = Y.qs('#yro_plan_diag_v26');
    var tTbl = Y.qs('#yro_plan_target_tbl_v26');
    var sTbl = Y.qs('#yro_plan_surplus_tbl_v26');
    var shTbl = Y.qs('#yro_plan_ship_tbl_v26');
    var targetTitleEl = Y.qs('#yro_plan_target_title_v26');
    var surplusTitleEl = Y.qs('#yro_plan_surplus_title_v26');
    var shipTitleEl = Y.qs('#yro_plan_ship_title_v26');
    var copyTargetEl = Y.qs('#yro_copy_plan_target_v26');
    var copySurplusEl = Y.qs('#yro_copy_plan_surplus_v26');
    var copyShipEl = Y.qs('#yro_copy_plan_ship_v26');

    function renderEmpty() {
      var modeAFillEl = Y.qs('#yro_A_computed_fill_v26');
      var modeAMerchEl = Y.qs('#yro_A_merch_used_v26');
      var modeBFillEl = Y.qs('#yro_B_computed_fill_v26');
      var modeBChildMerchEl = Y.qs('#yro_B_child_merch_v26');
      var modeBParentMerchEl = Y.qs('#yro_B_parent_merch_v26');
      if (metaEl) metaEl.innerHTML = '<b>Mode:</b> - | <b>Computed Fill %:</b> - | <b>Cap Ceiling %:</b> - | <b>Surplus Cap %:</b> - | <b>Merch Used:</b> - | <b>Shipments:</b> 0 | <b>Warnings:</b> -';
      if (diagEl) diagEl.innerHTML = 'Diagnostics: -';
      if (tTbl) tTbl.innerHTML = '<tr><td>No plan.</td></tr>';
      if (sTbl) sTbl.innerHTML = '<tr><td>No plan.</td></tr>';
      if (shTbl) shTbl.innerHTML = '<tr><td>No shipments.</td></tr>';
      if (modeAFillEl) modeAFillEl.value = '';
      if (modeAMerchEl) modeAMerchEl.value = '';
      if (modeBFillEl) modeBFillEl.value = '';
      if (modeBChildMerchEl) modeBChildMerchEl.value = '';
      if (modeBParentMerchEl) modeBParentMerchEl.value = '';
      if (targetTitleEl) targetTitleEl.textContent = 'TARGET GROUP';
      if (surplusTitleEl) surplusTitleEl.textContent = 'SURPLUS';
      if (shipTitleEl) shipTitleEl.textContent = 'SHIPMENTS';
      if (copyTargetEl) copyTargetEl.textContent = 'Copy TARGET GROUP';
      if (copySurplusEl) copySurplusEl.textContent = 'Copy SURPLUS';
      if (copyShipEl) copyShipEl.textContent = 'Copy SHIPMENTS';
    }

    if (!plan || !plan.meta) {
      renderEmpty();
      return;
    }

    if (String(plan.mode || '').toLowerCase() === 'balance' && plan.targetSummary) {
      var warningsA = Array.isArray(plan.meta.warnings) ? plan.meta.warnings.filter(Boolean) : [];
      if (metaEl) {
        metaEl.innerHTML =
          '<b>Mode:</b> INTERNAL EQUALIZER | ' +
          '<b>Computed Fill %:</b> ' + Y.formatTwNumber(plan.meta.computedFillPct || 0) + ' | ' +
          '<b>Cap Ceiling %:</b> ' + Y.formatTwNumber(plan.meta.capPct || 0) + ' | ' +
          '<b>Surplus Cap %:</b> ' + Y.formatTwNumber(plan.meta.surplusCapPct || 0) + ' | ' +
          '<b>Merch Used:</b> ' + Y.formatTwNumber(plan.meta.merchantsUsed || 0) + ' | ' +
          '<b>Shipments:</b> ' + ((plan.shipments || []).length) + ' | ' +
          '<b>Warnings:</b> ' + (warningsA.length ? escHtml(warningsA.join(' | ')) : '-');
      }
      if (diagEl) {
        var diagLinesA = plan.meta.diagnostics && Array.isArray(plan.meta.diagnostics.lines) ? plan.meta.diagnostics.lines.filter(Boolean) : [];
        diagEl.innerHTML = diagLinesA.length
          ? diagLinesA.map(function (line) { return '<div class="yro_diag_line">- ' + escHtml(line) + '</div>'; }).join('')
          : 'Diagnostics: -';
      }
      var modeAFillEl = Y.qs('#yro_A_computed_fill_v26');
      var modeAMerchEl = Y.qs('#yro_A_merch_used_v26');
      var computedFillEl0 = Y.qs('#yro_B_computed_fill_v26');
      var childMerchEl0 = Y.qs('#yro_B_child_merch_v26');
      var parentMerchEl0 = Y.qs('#yro_B_parent_merch_v26');
      if (modeAFillEl) modeAFillEl.value = plan.meta.computedFillPct != null ? plan.meta.computedFillPct : '';
      if (modeAMerchEl) modeAMerchEl.value = plan.meta.merchantsUsed != null ? plan.meta.merchantsUsed : '';
      if (computedFillEl0) computedFillEl0.value = '';
      if (childMerchEl0) childMerchEl0.value = '';
      if (parentMerchEl0) parentMerchEl0.value = '';
      if (targetTitleEl) targetTitleEl.textContent = 'TARGET GROUP';
      if (surplusTitleEl) surplusTitleEl.textContent = 'SURPLUS';
      if (shipTitleEl) shipTitleEl.textContent = 'SHIPMENTS';
      if (copyTargetEl) copyTargetEl.textContent = 'Copy TARGET GROUP';
      if (copySurplusEl) copySurplusEl.textContent = 'Copy SURPLUS';
      if (copyShipEl) copyShipEl.textContent = 'Copy SHIPMENTS';

      function buildModeATargetTable(rows) {
        var html = `
<tr><th colspan="11">TARGET GROUP</th></tr>
<tr>
  <th>Village</th>
  <th class="yro_right">Storage</th>
  <th class="yro_right">Target Each</th>
  <th class="yro_right">Before</th>
  <th class="yro_right">Sent</th>
  <th class="yro_right">Recv</th>
  <th class="yro_right">After</th>
  <th class="yro_right"><span class="icon header wood"></span></th>
  <th class="yro_right"><span class="icon header stone"></span></th>
  <th class="yro_right"><span class="icon header iron"></span></th>
  <th class="yro_right">Merch Used</th>
</tr>`;
        if (!rows.length) return html + '<tr><td colspan="11">-</td></tr>';
        rows.forEach(function (r) {
          html += `
<tr>
  <td><b>${escHtml(String(r.name))}</b></td>
  <td class="yro_right">${Y.formatTwNumber(r.storage)}</td>
  <td class="yro_right">${Y.formatTwNumber(r.targetEach || 0)}</td>
  <td class="yro_right">${Y.formatTwNumber(r.before.total)}</td>
  <td class="yro_right">${Y.formatTwNumber(r.sent.total)}</td>
  <td class="yro_right">${Y.formatTwNumber(r.recv.total)}</td>
  <td class="yro_right"><b>${Y.formatTwNumber(r.after.total)}</b></td>
  <td class="yro_right">${Y.formatTwNumber(r.after.wood)}</td>
  <td class="yro_right">${Y.formatTwNumber(r.after.clay)}</td>
  <td class="yro_right">${Y.formatTwNumber(r.after.iron)}</td>
  <td class="yro_right">${Y.formatTwNumber(r.merchUsed || 0)}</td>
</tr>`;
        });
        return html;
      }

      function buildModeASurplusTable(rows) {
        var html = `
<tr><th colspan="10">SURPLUS</th></tr>
<tr>
  <th>Village</th>
  <th class="yro_right">Storage</th>
  <th class="yro_right">Cap Each</th>
  <th class="yro_right">Before</th>
  <th class="yro_right">Sent</th>
  <th class="yro_right">Recv</th>
  <th class="yro_right">After</th>
  <th class="yro_right"><span class="icon header wood"></span></th>
  <th class="yro_right"><span class="icon header stone"></span></th>
  <th class="yro_right"><span class="icon header iron"></span></th>
</tr>`;
        if (!rows.length) return html + '<tr><td colspan="10">-</td></tr>';
        rows.forEach(function (r) {
          html += `
<tr>
  <td><b>${escHtml(String(r.name))}</b></td>
  <td class="yro_right">${Y.formatTwNumber(r.storage)}</td>
  <td class="yro_right">${Y.formatTwNumber(r.capEach || 0)}</td>
  <td class="yro_right">${Y.formatTwNumber(r.before.total)}</td>
  <td class="yro_right">${Y.formatTwNumber(r.sent.total)}</td>
  <td class="yro_right">${Y.formatTwNumber(r.recv.total)}</td>
  <td class="yro_right"><b>${Y.formatTwNumber(r.after.total)}</b></td>
  <td class="yro_right">${Y.formatTwNumber(r.after.wood)}</td>
  <td class="yro_right">${Y.formatTwNumber(r.after.clay)}</td>
  <td class="yro_right">${Y.formatTwNumber(r.after.iron)}</td>
</tr>`;
        });
        return html;
      }

      if (tTbl) tTbl.innerHTML = buildModeATargetTable(plan.targetSummary || []);
      if (sTbl) sTbl.innerHTML = buildModeASurplusTable(plan.surplusSummary || []);
    } else if (String(plan.mode || '').toLowerCase() === 'push' && plan.childSummary && plan.parentSummary) {
      var warnings = Array.isArray(plan.meta.warnings) ? plan.meta.warnings.filter(Boolean) : [];
      if (metaEl) {
        metaEl.innerHTML =
          '<b>Mode:</b> PARENTS -> CHILDREN | ' +
          '<b>Computed Fill %:</b> ' + Y.formatTwNumber(plan.meta.computedChildFillPct || 0) + ' | ' +
          '<b>Children Max Fill %:</b> ' + Y.formatTwNumber(plan.meta.childrenMaxFillPct || 0) + ' | ' +
          '<b>Parent Reserve %:</b> ' + Y.formatTwNumber(plan.meta.parentReservePct || 0) + ' | ' +
          '<b>Surplus Cap %:</b> ' + Y.formatTwNumber(plan.meta.surplusCapPct || 0) + ' | ' +
          '<b>Child Merch Used:</b> ' + Y.formatTwNumber(plan.meta.childMerchantsUsed || 0) + ' | ' +
          '<b>Parent Merch Used:</b> ' + Y.formatTwNumber(plan.meta.parentMerchantsUsed || 0) + ' | ' +
          '<b>Shipments:</b> ' + ((plan.shipments || []).length) + ' | ' +
          '<b>Warnings:</b> ' + (warnings.length ? escHtml(warnings.join(' | ')) : '-');
      }
      if (diagEl) {
        var diagLines = plan.meta.diagnostics && Array.isArray(plan.meta.diagnostics.lines) ? plan.meta.diagnostics.lines.filter(Boolean) : [];
        diagEl.innerHTML = diagLines.length
          ? diagLines.map(function (line) { return '<div class="yro_diag_line">- ' + escHtml(line) + '</div>'; }).join('')
          : 'Diagnostics: -';
      }
      var computedFillEl = Y.qs('#yro_B_computed_fill_v26');
      var childMerchEl = Y.qs('#yro_B_child_merch_v26');
      var parentMerchEl = Y.qs('#yro_B_parent_merch_v26');
      var modeAFillEl2 = Y.qs('#yro_A_computed_fill_v26');
      var modeAMerchEl2 = Y.qs('#yro_A_merch_used_v26');
      if (computedFillEl) computedFillEl.value = plan.meta.computedChildFillPct != null ? plan.meta.computedChildFillPct : '';
      if (childMerchEl) childMerchEl.value = plan.meta.childMerchantsUsed != null ? plan.meta.childMerchantsUsed : '';
      if (parentMerchEl) parentMerchEl.value = plan.meta.parentMerchantsUsed != null ? plan.meta.parentMerchantsUsed : '';
      if (modeAFillEl2) modeAFillEl2.value = '';
      if (modeAMerchEl2) modeAMerchEl2.value = '';
      if (targetTitleEl) targetTitleEl.textContent = 'CHILDREN';
      if (surplusTitleEl) surplusTitleEl.textContent = (plan.surplusSummary && plan.surplusSummary.length) ? 'PARENTS / SURPLUS' : 'PARENTS';
      if (shipTitleEl) shipTitleEl.textContent = 'SHIPMENTS';
      if (copyTargetEl) copyTargetEl.textContent = 'Copy CHILDREN';
      if (copySurplusEl) copySurplusEl.textContent = (plan.surplusSummary && plan.surplusSummary.length) ? 'Copy PARENTS / SURPLUS' : 'Copy PARENTS';
      if (copyShipEl) copyShipEl.textContent = 'Copy SHIPMENTS';

      function buildChildrenTable(rows) {
        var html = `
<tr><th colspan="10">CHILDREN</th></tr>
<tr>
  <th>Village</th>
  <th class="yro_right">Storage</th>
  <th class="yro_right">Target Each</th>
  <th class="yro_right">Before</th>
  <th class="yro_right">Sent</th>
  <th class="yro_right">Recv</th>
  <th class="yro_right">After</th>
  <th class="yro_right"><span class="icon header wood"></span></th>
  <th class="yro_right"><span class="icon header stone"></span></th>
  <th class="yro_right"><span class="icon header iron"></span></th>
</tr>`;
        if (!rows.length) return html + '<tr><td colspan="10">-</td></tr>';
        rows.forEach(function (r) {
          html += `
<tr>
  <td><b>${escHtml(String(r.name))}</b></td>
  <td class="yro_right">${Y.formatTwNumber(r.storage)}</td>
  <td class="yro_right">${Y.formatTwNumber(r.targetEach || 0)}</td>
  <td class="yro_right">${Y.formatTwNumber(r.before.total)}</td>
  <td class="yro_right">${Y.formatTwNumber(r.sent.total)}</td>
  <td class="yro_right">${Y.formatTwNumber(r.recv.total)}</td>
  <td class="yro_right"><b>${Y.formatTwNumber(r.after.total)}</b></td>
  <td class="yro_right">${Y.formatTwNumber(r.after.wood)}</td>
  <td class="yro_right">${Y.formatTwNumber(r.after.clay)}</td>
  <td class="yro_right">${Y.formatTwNumber(r.after.iron)}</td>
</tr>`;
        });
        return html;
      }

      function buildParentsAndSurplusTable(parentRows, surplusRows) {
        var html = `
<tr><th colspan="11">PARENTS</th></tr>
<tr>
  <th>Village</th>
  <th class="yro_right">Storage</th>
  <th class="yro_right">Reserve Each</th>
  <th class="yro_right">Before</th>
  <th class="yro_right">Sent</th>
  <th class="yro_right">After</th>
  <th class="yro_right"><span class="icon header wood"></span></th>
  <th class="yro_right"><span class="icon header stone"></span></th>
  <th class="yro_right"><span class="icon header iron"></span></th>
  <th class="yro_right">Spread</th>
  <th class="yro_right">Merch Used</th>
</tr>`;
        if (!parentRows.length) {
          html += '<tr><td colspan="11">-</td></tr>';
        } else {
          parentRows.forEach(function (r) {
            html += `
<tr>
  <td><b>${escHtml(String(r.name))}</b></td>
  <td class="yro_right">${Y.formatTwNumber(r.storage)}</td>
  <td class="yro_right">${Y.formatTwNumber(r.reserveEach || 0)}</td>
  <td class="yro_right">${Y.formatTwNumber(r.before.total)}</td>
  <td class="yro_right">${Y.formatTwNumber(r.sent.total)}</td>
  <td class="yro_right"><b>${Y.formatTwNumber(r.after.total)}</b></td>
  <td class="yro_right">${Y.formatTwNumber(r.after.wood)}</td>
  <td class="yro_right">${Y.formatTwNumber(r.after.clay)}</td>
  <td class="yro_right">${Y.formatTwNumber(r.after.iron)}</td>
  <td class="yro_right">${Y.formatTwNumber(r.spreadAfter || 0)}</td>
  <td class="yro_right">${Y.formatTwNumber(r.merchUsed || 0)}</td>
</tr>`;
          });
        }
        if (surplusRows && surplusRows.length) {
          html += `
<tr><th colspan="10">SURPLUS</th></tr>
<tr>
  <th>Village</th>
  <th class="yro_right">Storage</th>
  <th class="yro_right">Cap Each</th>
  <th class="yro_right">Before</th>
  <th class="yro_right">Sent</th>
  <th class="yro_right">Recv</th>
  <th class="yro_right">After</th>
  <th class="yro_right"><span class="icon header wood"></span></th>
  <th class="yro_right"><span class="icon header stone"></span></th>
  <th class="yro_right"><span class="icon header iron"></span></th>
</tr>`;
          surplusRows.forEach(function (r) {
            html += `
<tr>
  <td><b>${escHtml(String(r.name))}</b></td>
  <td class="yro_right">${Y.formatTwNumber(r.storage)}</td>
  <td class="yro_right">${Y.formatTwNumber(r.capEach || 0)}</td>
  <td class="yro_right">${Y.formatTwNumber(r.before.total)}</td>
  <td class="yro_right">${Y.formatTwNumber(r.sent.total)}</td>
  <td class="yro_right">${Y.formatTwNumber(r.recv.total)}</td>
  <td class="yro_right"><b>${Y.formatTwNumber(r.after.total)}</b></td>
  <td class="yro_right">${Y.formatTwNumber(r.after.wood)}</td>
  <td class="yro_right">${Y.formatTwNumber(r.after.clay)}</td>
  <td class="yro_right">${Y.formatTwNumber(r.after.iron)}</td>
</tr>`;
          });
        }
        return html;
      }

      if (tTbl) tTbl.innerHTML = buildChildrenTable(plan.childSummary || []);
      if (sTbl) sTbl.innerHTML = buildParentsAndSurplusTable(plan.parentSummary || [], plan.surplusSummary || []);
    } else {
      var computedFillEl2 = Y.qs('#yro_B_computed_fill_v26');
      var childMerchEl2 = Y.qs('#yro_B_child_merch_v26');
      var parentMerchEl2 = Y.qs('#yro_B_parent_merch_v26');
      var modeAFillEl3 = Y.qs('#yro_A_computed_fill_v26');
      var modeAMerchEl3 = Y.qs('#yro_A_merch_used_v26');
      if (computedFillEl2) computedFillEl2.value = '';
      if (childMerchEl2) childMerchEl2.value = '';
      if (parentMerchEl2) parentMerchEl2.value = '';
      if (modeAFillEl3) modeAFillEl3.value = '';
      if (modeAMerchEl3) modeAMerchEl3.value = '';
      if (diagEl) diagEl.innerHTML = 'Diagnostics: -';
      if (metaEl) {
        metaEl.innerHTML =
          '<b>Mode:</b> ' + String(plan.mode || '-').toUpperCase() + ' | ' +
          '<b>Cap%:</b> ' + (plan.meta.cap != null ? plan.meta.cap : '-') + ' | ' +
          '<b>Reserve(each):</b> ' + (plan.meta.reserve != null ? plan.meta.reserve : '-') + ' | ' +
          '<b>Surplus Cap%:</b> ' + (plan.meta.scap != null ? plan.meta.scap : '-') + ' | ' +
          '<b>Shipments:</b> ' + ((plan.shipments || []).length);
      }
      if (targetTitleEl) targetTitleEl.textContent = 'TARGET';
      if (surplusTitleEl) surplusTitleEl.textContent = 'SURPLUS';
      if (shipTitleEl) shipTitleEl.textContent = 'SHIPMENTS';
      if (copyTargetEl) copyTargetEl.textContent = 'Copy TARGET';
      if (copySurplusEl) copySurplusEl.textContent = 'Copy SURPLUS';
      if (copyShipEl) copyShipEl.textContent = 'Copy SHIPMENTS';

      function buildSummaryTable(title, ids, rowsById) {
        var html = `
<tr><th colspan="9">${title}</th></tr>
<tr>
  <th>Village</th>
  <th class="yro_right">Storage</th>
  <th class="yro_right">Before</th>
  <th class="yro_right">Sent</th>
  <th class="yro_right">Recv</th>
  <th class="yro_right">After(Arrived)</th>
  <th class="yro_right"><span class="icon header wood"></span></th>
  <th class="yro_right"><span class="icon header stone"></span></th>
  <th class="yro_right"><span class="icon header iron"></span></th>
</tr>`;
        if (!ids || !ids.length) return html + '<tr><td colspan="9">-</td></tr>';
        ids.forEach(function (vid) {
          var r = rowsById[vid];
          if (!r) return;
          html += `
<tr>
  <td><b>${escHtml(String(r.name))}</b></td>
  <td class="yro_right">${Y.formatTwNumber(r.storage)}</td>
  <td class="yro_right">${Y.formatTwNumber(r.before.total)}</td>
  <td class="yro_right">${Y.formatTwNumber(r.sent.total)}</td>
  <td class="yro_right">${Y.formatTwNumber(r.recv.total)}</td>
  <td class="yro_right"><b>${Y.formatTwNumber(r.after.total)}</b></td>
  <td class="yro_right">${Y.formatTwNumber(r.after.wood)}</td>
  <td class="yro_right">${Y.formatTwNumber(r.after.clay)}</td>
  <td class="yro_right">${Y.formatTwNumber(r.after.iron)}</td>
</tr>`;
        });
        return html;
      }

      var tRows = plan.targetSummary || [];
      var sRows = plan.surplusSummary || [];
      var tMap = {}; tRows.forEach(function (r) { tMap[r.id] = r; });
      var sMap = {}; sRows.forEach(function (r) { sMap[r.id] = r; });
      if (tTbl) tTbl.innerHTML = buildSummaryTable('TARGET', plan.targetIds || [], tMap);
      if (sTbl) sTbl.innerHTML = buildSummaryTable('SURPLUS', plan.surplusIds || [], sMap);
    }

    if (shTbl) {
      var html2 = `
<tr>
  <th>#</th><th>From</th><th>To</th>
  <th class="yro_right">Wood</th><th class="yro_right">Clay</th><th class="yro_right">Iron</th>
  <th class="yro_right">Total</th><th class="yro_center">Merch</th><th class="yro_center">Tag</th>
</tr>`;
      var ships = plan.shipments || [];
      if (!ships.length) {
        html2 += '<tr><td colspan="9">No shipments.</td></tr>';
      } else {
        ships.forEach(function (s, idx) {
          var fn = snapshotsById[s.from] ? snapshotsById[s.from].name : String(s.from);
          var tn = snapshotsById[s.to] ? snapshotsById[s.to].name : String(s.to);
          html2 += `
<tr>
  <td class="yro_right">${idx + 1}</td>
  <td><b>${escHtml(fn)}</b></td>
  <td><b>${escHtml(tn)}</b></td>
  <td class="yro_right">${Y.formatTwNumber(s.wood)}</td>
  <td class="yro_right">${Y.formatTwNumber(s.clay)}</td>
  <td class="yro_right">${Y.formatTwNumber(s.iron)}</td>
  <td class="yro_right"><b>${Y.formatTwNumber(s.total)}</b></td>
  <td class="yro_center">${s.merch}</td>
  <td class="yro_center">${escHtml(s.tag || '')}</td>
</tr>`;
        });
      }
      shTbl.innerHTML = html2;
    }
  }

  Y.ui = {
    injectCSS: injectCSS,
    buildPanel: buildPanel,
    setMsg: setMsg,
    setProgress: setProgress,
    fillGroupSelects: fillGroupSelects,
    buildModesBox: buildModesBox,
    enableDrag: enableDrag,
    buildPickerModal: buildPickerModal,
    renderTable1: renderTable1,
    renderTable2: renderTable2,
    renderPlanTables: renderPlanTables,
  };

  Y.log('ui module loaded âœ…');
})();
