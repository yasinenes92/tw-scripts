(function () {
  'use strict';

  var Y = window.YRO_V31;
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
#${Y.cfg.PANEL_ID} .yro_dev{ font-size:11px; opacity:.95; margin-right:10px; color:#4d2c07; }
#${Y.cfg.PANEL_ID} .yro_dev a,
#${Y.cfg.PANEL_ID} .yro_dev a:visited{ color:#4d2c07 !important; text-decoration:none; font-weight:bold; }
#${Y.cfg.PANEL_ID} .yro_dev a:hover,
#${Y.cfg.PANEL_ID} .yro_dev a:focus{ color:#2f1800 !important; text-decoration:underline; }
#${Y.cfg.PANEL_ID} .yro_dev a:focus{ outline:1px dotted #2f1800; outline-offset:1px; }

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
#${Y.cfg.PANEL_ID} #yro_content_v31{
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
<div class="yro_hdr" id="yro_drag_v31" style="cursor:move;">
  <div class="yro_ttl"><span class="icon header wood"></span> Resource Orchestrator <span class="yro_small">(v31)</span></div>
  <div style="display:flex; align-items:center;">
        <span class="yro_dev"><b>Developed by <a href="https://www.twstats.com/en1/index.php?page=player&id=315027" target="_blank" rel="noopener noreferrer">Controleng</a></b></span>
    <button class="yro_btn" id="yro_close_v31">X</button>
  </div>
</div>

<div class="yro_toolbar">
  <button class="yro_btn btn-confirm" id="yro_load_v31">Load / Refresh (Full Scan)</button>
  <div class="yro_progress_outer"><div class="yro_progress_inner" id="yro_prog_bar_v31"></div></div>
  <span id="yro_prog_txt_v31" class="yro_small">0/0 - Ready</span>

  <span class="yro_small"><b>Search:</b></span>
  <input type="text" id="yro_search_v31" placeholder="Village name..." style="width:180px;">

  <button class="yro_btn btn-confirm" id="yro_copy_bb_v31">Copy Test Results</button>
</div>

<div class="yro_msg" id="yro_msg_v31" style="color:#0a6;">Ready</div>

<div id="yro_content_v31">
  <div class="yro_sec_head">
    <div>1) Villages - Production (per hour + 24h) (<span id="yro_t1_title_v31">All villages</span>)</div>
    <div class="yro_sec_controls">
      <button class="yro_mini" id="yro_t1_toggle_v31">${st.ui.minimized1 ? 'Expand' : 'Minimize'}</button>
      <span class="yro_small"><b>Group:</b></span>
      <select id="yro_t1_group_sel_v31"></select>
      <button class="yro_mini" id="yro_t1_pick_v31">Pick...</button>
    </div>
  </div>
  <div class="yro_scroll" id="yro_t1_wrap_v31" style="${st.ui.minimized1 ? 'display:none;' : ''}">
    <table class="yro_table" id="yro_t1_tbl_v31"></table>
  </div>

  <div class="yro_sec_head">
    <div>2) Villages - Current + Incoming + Outgoing (per village) (<span id="yro_t2_title_v31">All villages</span>)</div>
    <div class="yro_sec_controls">
      <button class="yro_mini" id="yro_t2_toggle_v31">${st.ui.minimized2 ? 'Expand' : 'Minimize'}</button>
      <span class="yro_small"><b>Group:</b></span>
      <select id="yro_t2_group_sel_v31"></select>
      <button class="yro_mini" id="yro_t2_pick_v31">Pick...</button>
      <span class="yro_small" id="yro_scan_ts_v31"></span>
    </div>
  </div>
  <div class="yro_scroll" id="yro_t2_wrap_v31" style="${st.ui.minimized2 ? 'display:none;' : ''}">
    <table class="yro_table" id="yro_t2_tbl_v31"></table>
  </div>

  <div class="yro_sec_head">
    <div>3) Orchestrator - Versioned planning</div>
    <div class="yro_sec_controls"><span class="yro_small">Click a mode row to focus it.</span></div>
  </div>

  <div class="yro_mode_box" id="yro_modes_v31"></div>

  <div class="yro_msg" id="yro_plan_meta_v31" style="margin-top:8px;">
    <b>Mode:</b> - | <b>Computed Fill %:</b> - | <b>Cap Ceiling %:</b> - | <b>Surplus Cap %:</b> - | <b>Merch Used:</b> - | <b>Shipments:</b> 0 | <b>Warnings:</b> -
  </div>

  <div class="yro_msg yro_plan_diag" id="yro_plan_diag_v31">Diagnostics: -</div>

  <div class="yro_sec_head">
    <div id="yro_plan_target_title_v31">TARGET GROUP</div>
    <div class="yro_sec_controls yro_table_tools">
      <button class="yro_mini" id="yro_copy_plan_target_v31">Copy TARGET GROUP</button>
    </div>
  </div>
  <div class="yro_scroll">
    <table class="yro_table" id="yro_plan_target_tbl_v31"></table>
  </div>

  <div class="yro_sec_head">
    <div id="yro_plan_surplus_title_v31">SURPLUS</div>
    <div class="yro_sec_controls yro_table_tools">
      <button class="yro_mini" id="yro_copy_plan_surplus_v31">Copy SURPLUS</button>
    </div>
  </div>
  <div class="yro_scroll" style="margin-top:8px;">
    <table class="yro_table" id="yro_plan_surplus_tbl_v31"></table>
  </div>

  <div class="yro_sec_head">
    <div id="yro_plan_ship_title_v31">SHIPMENTS</div>
    <div class="yro_sec_controls yro_table_tools">
      <button class="yro_mini" id="yro_copy_plan_ship_v31">Copy SHIPMENTS</button>
    </div>
  </div>
  <div class="yro_scroll" style="margin-top:8px;">
    <table class="yro_table" id="yro_plan_ship_tbl_v31"></table>
  </div>
</div>
    `;

    document.body.appendChild(root);
    return root;
  }

  function setMsg(text, color) {
    var el = Y.qs('#yro_msg_v31');
    if (!el) return;
    el.textContent = text;
    if (color) el.style.color = color;
  }

  function setProgress(step, total, text) {
    var bar = Y.qs('#yro_prog_bar_v31');
    var tx = Y.qs('#yro_prog_txt_v31');
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

    fill('#yro_t1_group_sel_v31', st.groups.sel1);
    fill('#yro_t2_group_sel_v31', st.groups.sel2);
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

    var wrap = Y.qs('#yro_modes_v31');
    if (!wrap) return;

    wrap.innerHTML = `
<div class="yro_mode_row ${st.orchestrator.mode === 'balance' ? 'active' : ''}" data-mode="balance">
  <div class="yro_mode_left">
    <div class="yro_mode_title">Mode A: Internal Equalizer</div>
    <div class="yro_mode_desc">Target group rebalances internally to the highest feasible common fill. Surplus last.</div>
  </div>
  <div class="yro_mode_controls">
    <div class="yro_kv"><label>Target</label><select id="yro_A_target_v31">${optionsHTML(st.groups.A_target)}</select></div>
    <button class="yro_mini" id="pick_A_target_v31">Pick...</button>
    <div class="yro_kv"><label>Surplus</label><select id="yro_A_surplus_v31">${optionsHTML(st.groups.A_surplus)}</select></div>
    <button class="yro_mini" id="pick_A_surplus_v31">Pick...</button>
    <div class="yro_kv"><label>Cap%</label><input id="yro_A_cap_v31" type="number" min="1" max="100" step="1" value="${st.modeA.capPct}" style="width:60px;"></div>
    <div class="yro_kv"><label>Surplus Cap%</label><input id="yro_A_scap_v31" type="number" min="1" max="100" step="1" value="${st.modeA.surplusCapPct}" style="width:60px;"></div>
    <div class="yro_kv"><label>Computed Fill %</label><input id="yro_A_computed_fill_v31" type="number" value="" style="width:78px;" disabled></div>
    <div class="yro_kv"><label>Merch Used</label><input id="yro_A_merch_used_v31" type="number" value="" style="width:70px;" disabled></div>
    <button class="yro_btn btn-confirm" id="yro_A_plan_v31">Plan</button>
    <button class="yro_btn btn-confirm" id="yro_A_exec_v31">Execute</button>
  </div>
</div>

<div class="yro_mode_row ${st.orchestrator.mode === 'push' ? 'active' : ''}" data-mode="push">
  <div class="yro_mode_left">
    <div class="yro_mode_title">Mode B: Parents -> Children</div>
    <div class="yro_mode_desc">Children rebalance with current stock first, Parents fill the remaining gaps, Surplus last.</div>
  </div>
  <div class="yro_mode_controls">
    <div class="yro_kv"><label>Parents</label><select id="yro_B_parents_v31">${optionsHTML(st.groups.B_parents)}</select></div>
    <button class="yro_mini" id="pick_B_parents_v31">Pick...</button>
    <div class="yro_kv"><label>Children</label><select id="yro_B_children_v31">${optionsHTML(st.groups.B_children)}</select></div>
    <button class="yro_mini" id="pick_B_children_v31">Pick...</button>
    <div class="yro_kv"><label>Surplus</label><select id="yro_B_surplus_v31">${optionsHTML(st.groups.B_surplus)}</select></div>
    <button class="yro_mini" id="pick_B_surplus_v31">Pick...</button>
    <div class="yro_kv"><label>Parent Reserve %</label><input id="yro_B_parent_reserve_v31" type="number" min="0" max="100" step="1" value="${st.modeB.parentReservePct}" style="width:70px;"></div>
    <div class="yro_kv"><label>Children Max Fill %</label><input id="yro_B_child_max_v31" type="number" min="0" max="100" step="1" value="${st.modeB.childrenMaxFillPct}" style="width:78px;"></div>
    <div class="yro_kv"><label>Surplus Cap %</label><input id="yro_B_scap_v31" type="number" min="0" max="100" step="1" value="${st.modeB.surplusCapPct}" style="width:70px;"></div>
    <div class="yro_kv"><label>Computed Child Fill %</label><input id="yro_B_computed_fill_v31" type="number" value="" style="width:78px;" disabled></div>
    <div class="yro_kv"><label>Child Merch Used</label><input id="yro_B_child_merch_v31" type="number" value="" style="width:70px;" disabled></div>
    <div class="yro_kv"><label>Parent Merch Used</label><input id="yro_B_parent_merch_v31" type="number" value="" style="width:78px;" disabled></div>
    <button class="yro_btn btn-confirm" id="yro_B_plan_v31">Plan</button>
    <button class="yro_btn btn-confirm" id="yro_B_exec_v31">Execute</button>
  </div>
</div>

<div class="yro_mode_row ${(st.orchestrator.mode === 'coin' || st.orchestrator.mode === 'funnel') ? 'active' : ''}" data-mode="coin">
  <div class="yro_mode_left">
    <div class="yro_mode_title">Mode C: Coin Maximizer</div>
    <div class="yro_mode_desc">Sources feed Coin villages directly to unlock additional coins. Buffer is last-stage staging only.</div>
  </div>
  <div class="yro_mode_controls">
    <div class="yro_kv"><label>Sources</label><select id="yro_C_sources_v31">${optionsHTML(st.groups.C_sources)}</select></div>
    <button class="yro_mini" id="pick_C_sources_v31">Pick...</button>
    <div class="yro_kv"><label>Coin</label><select id="yro_C_coin_v31">${optionsHTML(st.groups.C_coin)}</select></div>
    <button class="yro_mini" id="pick_C_coin_v31">Pick...</button>
    <div class="yro_kv"><label>Buffer / Surplus</label><select id="yro_C_buffer_v31">${optionsHTML(st.groups.C_buffer)}</select></div>
    <button class="yro_mini" id="pick_C_buffer_v31">Pick...</button>
    <div class="yro_kv"><label>Source Reserve %</label><input id="yro_C_reserve_v31" type="number" min="0" max="100" step="1" value="${st.modeC.sourceReservePct}" style="width:72px;"></div>
    <div class="yro_kv"><label>Buffer Cap %</label><input id="yro_C_bcap_v31" type="number" min="0" max="100" step="1" value="${st.modeC.bufferCapPct}" style="width:70px;"></div>
    <div class="yro_kv"><label>Additional Coins</label><input id="yro_C_additional_coins_v31" type="number" value="" style="width:84px;" disabled></div>
    <div class="yro_kv"><label>Merch Used</label><input id="yro_C_merch_used_v31" type="number" value="" style="width:72px;" disabled></div>
    <button class="yro_btn btn-confirm" id="yro_C_plan_v31">Plan</button>
    <button class="yro_btn btn-confirm" id="yro_C_exec_v31">Execute</button>
  </div>
</div>

<div class="yro_mode_row ${st.orchestrator.mode === 'flat' ? 'active' : ''}" data-mode="flat">
  <div class="yro_mode_left">
    <div class="yro_mode_title">Mode D: Flat Target Equalizer</div>
    <div class="yro_mode_desc">Parents feed Children to the highest feasible common flat target. Small-storage children cap at Depot Cap %. Excess can be parked to Surplus last.</div>
  </div>
  <div class="yro_mode_controls">
    <div class="yro_kv"><label>Parents</label><select id="yro_D_parents_v31">${optionsHTML(st.groups.D_parents)}</select></div>
    <button class="yro_mini" id="pick_D_parents_v31">Pick...</button>
    <div class="yro_kv"><label>Children</label><select id="yro_D_children_v31">${optionsHTML(st.groups.D_children)}</select></div>
    <button class="yro_mini" id="pick_D_children_v31">Pick...</button>
    <div class="yro_kv"><label>Surplus</label><select id="yro_D_surplus_v31">${optionsHTML(st.groups.D_surplus)}</select></div>
    <button class="yro_mini" id="pick_D_surplus_v31">Pick...</button>
    <div class="yro_kv"><label>Parent Reserve %</label><input id="yro_D_parent_reserve_v31" type="number" min="0" max="100" step="1" value="${st.modeD.parentReservePct}" style="width:70px;"></div>
    <div class="yro_kv"><label>Depot Cap %</label><input id="yro_D_depot_cap_v31" type="number" min="0" max="100" step="1" value="${st.modeD.depotCapPct}" style="width:70px;"></div>
    <div class="yro_kv"><label>Computed Flat Target</label><input id="yro_D_computed_flat_v31" type="number" value="" style="width:98px;" disabled></div>
    <div class="yro_kv"><label>Child Merch Used</label><input id="yro_D_child_merch_v31" type="number" value="" style="width:70px;" disabled></div>
    <div class="yro_kv"><label>Parent Merch Used</label><input id="yro_D_parent_merch_v31" type="number" value="" style="width:78px;" disabled></div>
    <button class="yro_btn btn-confirm" id="yro_D_plan_v31">Plan</button>
    <button class="yro_btn btn-confirm" id="yro_D_exec_v31">Execute</button>
  </div>
</div>
    `;
  }

  function enableDrag(panel) {
    var st = Y.state;
    var hdr = Y.qs('#yro_drag_v31');
    if (!hdr || !panel) return;

    var dragging = false, startX = 0, startY = 0, startL = 0, startT = 0;

    Y.on(hdr, 'mousedown', function (e) {
      if (e.target && e.target.id === 'yro_close_v31') return;
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
  <button class="yro_btn" id="yro_picker_close_v31">Ã¢Å“â€“</button>
</div>
<div class="yro_modal_body">
  <div class="yro_modal_toolbar">
    <span class="yro_small"><b>Search:</b></span>
    <input type="text" id="yro_picker_search_v31" style="width:220px;" placeholder="name / coord">
    <button class="yro_btn" id="yro_picker_all_v31">Select all</button>
    <button class="yro_btn" id="yro_picker_none_v31">Select none</button>
    <span class="yro_small" id="yro_picker_count_v31"></span>
  </div>
  <table class="yro_modal_list" id="yro_picker_tbl_v31">
    <tr><th></th><th>Village</th><th>Coord</th><th class="yro_right">Storage</th></tr>
  </table>
</div>
<div class="yro_modal_foot">
  <button class="yro_btn" id="yro_picker_cancel_v31">Cancel</button>
  <button class="yro_btn btn-confirm" id="yro_picker_save_v31">Kaydet</button>
</div>
    `;

    overlay.appendChild(box);
    document.body.appendChild(overlay);

    function updateCount() {
      var el = box.querySelector('#yro_picker_count_v31');
      if (el) el.textContent = 'Selected: ' + selected.size;
    }

    function renderList(filterText) {
      filterText = String(filterText || '').toLowerCase();
      var tbl = box.querySelector('#yro_picker_tbl_v31');
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

    box.querySelector('#yro_picker_close_v31').addEventListener('click', close);
    box.querySelector('#yro_picker_cancel_v31').addEventListener('click', close);

    box.querySelector('#yro_picker_all_v31').addEventListener('click', function () {
      candidates.forEach(function (v) { selected.add(String(v.id)); });
      renderList(box.querySelector('#yro_picker_search_v31').value);
    });

    box.querySelector('#yro_picker_none_v31').addEventListener('click', function () {
      selected.clear();
      renderList(box.querySelector('#yro_picker_search_v31').value);
    });

    box.querySelector('#yro_picker_save_v31').addEventListener('click', function () {
      var ids = Array.from(selected).map(function (s) { return Y.safeInt(s, 0); }).filter(Boolean);
      try { onSaveCallback(ids); } catch (e) {}
      close();
    });

    box.querySelector('#yro_picker_search_v31').addEventListener('input', Y.debounce(function (e) {
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

    var tbl = Y.qs('#yro_t1_tbl_v31');
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

    var tbl = Y.qs('#yro_t2_tbl_v31');
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

    var ts = Y.qs('#yro_scan_ts_v31');
    if (ts) ts.textContent = 'Last scan: ' + (Y.state.cache.lastFullScanAt ? new Date(Y.state.cache.lastFullScanAt).toLocaleTimeString() : '-');
  }

    function escHtml(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function htmlTripletHeaders(label) {
    var suffix = label ? ' ' + escHtml(label) : '';
    return '' +
      '<th class="yro_right"><span class="icon header wood"></span>' + suffix + '</th>' +
      '<th class="yro_right"><span class="icon header stone"></span>' + suffix + '</th>' +
      '<th class="yro_right"><span class="icon header iron"></span>' + suffix + '</th>';
  }
  function htmlTripletCells(res) {
    res = res || {};
    return '' +
      '<td class="yro_right">' + Y.formatTwNumber(res.wood || 0) + '</td>' +
      '<td class="yro_right">' + Y.formatTwNumber(res.clay || 0) + '</td>' +
      '<td class="yro_right">' + Y.formatTwNumber(res.iron || 0) + '</td>';
  }
  function htmlMerchPair(row) {
    return Y.formatTwNumber((row && row.merchFree) || 0) + '/' + Y.formatTwNumber((row && row.merchTotal) || 0);
  }
  function renderPlanTables(plan, snapshotsById) {
    var metaEl = Y.qs('#yro_plan_meta_v31');
    var diagEl = Y.qs('#yro_plan_diag_v31');
    var tTbl = Y.qs('#yro_plan_target_tbl_v31');
    var sTbl = Y.qs('#yro_plan_surplus_tbl_v31');
    var shTbl = Y.qs('#yro_plan_ship_tbl_v31');
    var targetTitleEl = Y.qs('#yro_plan_target_title_v31');
    var surplusTitleEl = Y.qs('#yro_plan_surplus_title_v31');
    var shipTitleEl = Y.qs('#yro_plan_ship_title_v31');
    var copyTargetEl = Y.qs('#yro_copy_plan_target_v31');
    var copySurplusEl = Y.qs('#yro_copy_plan_surplus_v31');
    var copyShipEl = Y.qs('#yro_copy_plan_ship_v31');

    function renderEmpty() {
      var modeAFillEl = Y.qs('#yro_A_computed_fill_v31');
      var modeAMerchEl = Y.qs('#yro_A_merch_used_v31');
      var modeBFillEl = Y.qs('#yro_B_computed_fill_v31');
      var modeBChildMerchEl = Y.qs('#yro_B_child_merch_v31');
      var modeBParentMerchEl = Y.qs('#yro_B_parent_merch_v31');
      var modeDFlatEl = Y.qs('#yro_D_computed_flat_v31');
      var modeDChildMerchEl = Y.qs('#yro_D_child_merch_v31');
      var modeDParentMerchEl = Y.qs('#yro_D_parent_merch_v31');
      var modeCCoinsEl = Y.qs('#yro_C_additional_coins_v31');
      var modeCMerchEl = Y.qs('#yro_C_merch_used_v31');
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
      if (modeDFlatEl) modeDFlatEl.value = '';
      if (modeDChildMerchEl) modeDChildMerchEl.value = '';
      if (modeDParentMerchEl) modeDParentMerchEl.value = '';
      if (modeCCoinsEl) modeCCoinsEl.value = '';
      if (modeCMerchEl) modeCMerchEl.value = '';
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
      var modeAFillEl = Y.qs('#yro_A_computed_fill_v31');
      var modeAMerchEl = Y.qs('#yro_A_merch_used_v31');
      var computedFillEl0 = Y.qs('#yro_B_computed_fill_v31');
      var childMerchEl0 = Y.qs('#yro_B_child_merch_v31');
      var parentMerchEl0 = Y.qs('#yro_B_parent_merch_v31');
      var modeDFlatEl0 = Y.qs('#yro_D_computed_flat_v31');
      var modeDChildMerchEl0 = Y.qs('#yro_D_child_merch_v31');
      var modeDParentMerchEl0 = Y.qs('#yro_D_parent_merch_v31');
      var coinAddEl0 = Y.qs('#yro_C_additional_coins_v31');
      var coinMerchEl0 = Y.qs('#yro_C_merch_used_v31');
      if (modeAFillEl) modeAFillEl.value = plan.meta.computedFillPct != null ? plan.meta.computedFillPct : '';
      if (modeAMerchEl) modeAMerchEl.value = plan.meta.merchantsUsed != null ? plan.meta.merchantsUsed : '';
      if (computedFillEl0) computedFillEl0.value = '';
      if (childMerchEl0) childMerchEl0.value = '';
      if (parentMerchEl0) parentMerchEl0.value = '';
      if (modeDFlatEl0) modeDFlatEl0.value = '';
      if (modeDChildMerchEl0) modeDChildMerchEl0.value = '';
      if (modeDParentMerchEl0) modeDParentMerchEl0.value = '';
      if (coinAddEl0) coinAddEl0.value = '';
      if (coinMerchEl0) coinMerchEl0.value = '';
      if (targetTitleEl) targetTitleEl.textContent = 'TARGET GROUP';
      if (surplusTitleEl) surplusTitleEl.textContent = 'SURPLUS';
      if (shipTitleEl) shipTitleEl.textContent = 'SHIPMENTS';
      if (copyTargetEl) copyTargetEl.textContent = 'Copy TARGET GROUP';
      if (copySurplusEl) copySurplusEl.textContent = 'Copy SURPLUS';
      if (copyShipEl) copyShipEl.textContent = 'Copy SHIPMENTS';

      function buildModeATargetTable(rows) {
        var html = `
<tr><th colspan="15">TARGET GROUP</th></tr>
<tr>
  <th>Village</th>
  <th class="yro_right">Storage</th>
  <th class="yro_right">Target Each</th>
  ${htmlTripletHeaders('Cur')}
  <th class="yro_right">Before Total</th>
  <th class="yro_right">Sent</th>
  <th class="yro_right">Recv</th>
  <th class="yro_right">After Total</th>
  ${htmlTripletHeaders('Final')}
  <th class="yro_center">Merch (free/total)</th>
  <th class="yro_right">Merch Used</th>
</tr>`;
        if (!rows.length) return html + '<tr><td colspan="15">-</td></tr>';
        rows.forEach(function (r) {
          html += `
<tr>
  <td><b>${escHtml(String(r.name))}</b></td>
  <td class="yro_right">${Y.formatTwNumber(r.storage)}</td>
  <td class="yro_right">${Y.formatTwNumber(r.targetEach || 0)}</td>
  ${htmlTripletCells(r.current)}
  <td class="yro_right">${Y.formatTwNumber(r.before.total)}</td>
  <td class="yro_right">${Y.formatTwNumber(r.sent.total)}</td>
  <td class="yro_right">${Y.formatTwNumber(r.recv.total)}</td>
  <td class="yro_right"><b>${Y.formatTwNumber(r.after.total)}</b></td>
  ${htmlTripletCells(r.after)}
  <td class="yro_center">${htmlMerchPair(r)}</td>
  <td class="yro_right">${Y.formatTwNumber(r.merchUsed || 0)}</td>
</tr>`;
        });
        return html;
      }

      function buildModeASurplusTable(rows) {
        var html = `
<tr><th colspan="15">SURPLUS</th></tr>
<tr>
  <th>Village</th>
  <th class="yro_right">Storage</th>
  <th class="yro_right">Cap Each</th>
  ${htmlTripletHeaders('Cur')}
  <th class="yro_right">Before Total</th>
  <th class="yro_right">Sent</th>
  <th class="yro_right">Recv</th>
  <th class="yro_right">After Total</th>
  ${htmlTripletHeaders('Final')}
  <th class="yro_center">Merch (free/total)</th>
  <th class="yro_right">Merch Used</th>
</tr>`;
        if (!rows.length) return html + '<tr><td colspan="15">-</td></tr>';
        rows.forEach(function (r) {
          html += `
<tr>
  <td><b>${escHtml(String(r.name))}</b></td>
  <td class="yro_right">${Y.formatTwNumber(r.storage)}</td>
  <td class="yro_right">${Y.formatTwNumber(r.capEach || 0)}</td>
  ${htmlTripletCells(r.current)}
  <td class="yro_right">${Y.formatTwNumber(r.before.total)}</td>
  <td class="yro_right">${Y.formatTwNumber(r.sent.total)}</td>
  <td class="yro_right">${Y.formatTwNumber(r.recv.total)}</td>
  <td class="yro_right"><b>${Y.formatTwNumber(r.after.total)}</b></td>
  ${htmlTripletCells(r.after)}
  <td class="yro_center">${htmlMerchPair(r)}</td>
  <td class="yro_right">${Y.formatTwNumber(r.merchUsed || 0)}</td>
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
      var computedFillEl = Y.qs('#yro_B_computed_fill_v31');
      var childMerchEl = Y.qs('#yro_B_child_merch_v31');
      var parentMerchEl = Y.qs('#yro_B_parent_merch_v31');
      var modeAFillEl2 = Y.qs('#yro_A_computed_fill_v31');
      var modeAMerchEl2 = Y.qs('#yro_A_merch_used_v31');
      var modeDFlatEl1 = Y.qs('#yro_D_computed_flat_v31');
      var modeDChildMerchEl1 = Y.qs('#yro_D_child_merch_v31');
      var modeDParentMerchEl1 = Y.qs('#yro_D_parent_merch_v31');
      var coinAddEl1 = Y.qs('#yro_C_additional_coins_v31');
      var coinMerchEl1 = Y.qs('#yro_C_merch_used_v31');
      if (computedFillEl) computedFillEl.value = plan.meta.computedChildFillPct != null ? plan.meta.computedChildFillPct : '';
      if (childMerchEl) childMerchEl.value = plan.meta.childMerchantsUsed != null ? plan.meta.childMerchantsUsed : '';
      if (parentMerchEl) parentMerchEl.value = plan.meta.parentMerchantsUsed != null ? plan.meta.parentMerchantsUsed : '';
      if (modeAFillEl2) modeAFillEl2.value = '';
      if (modeAMerchEl2) modeAMerchEl2.value = '';
      if (modeDFlatEl1) modeDFlatEl1.value = '';
      if (modeDChildMerchEl1) modeDChildMerchEl1.value = '';
      if (modeDParentMerchEl1) modeDParentMerchEl1.value = '';
      if (coinAddEl1) coinAddEl1.value = '';
      if (coinMerchEl1) coinMerchEl1.value = '';
      if (targetTitleEl) targetTitleEl.textContent = 'CHILDREN';
      if (surplusTitleEl) surplusTitleEl.textContent = (plan.surplusSummary && plan.surplusSummary.length) ? 'PARENTS / SURPLUS' : 'PARENTS';
      if (shipTitleEl) shipTitleEl.textContent = 'SHIPMENTS';
      if (copyTargetEl) copyTargetEl.textContent = 'Copy CHILDREN';
      if (copySurplusEl) copySurplusEl.textContent = (plan.surplusSummary && plan.surplusSummary.length) ? 'Copy PARENTS / SURPLUS' : 'Copy PARENTS';
      if (copyShipEl) copyShipEl.textContent = 'Copy SHIPMENTS';

      function buildChildrenTable(rows) {
        var html = `
<tr><th colspan="15">CHILDREN</th></tr>
<tr>
  <th>Village</th>
  <th class="yro_right">Storage</th>
  <th class="yro_right">Target Each</th>
  ${htmlTripletHeaders('Cur')}
  <th class="yro_right">Before Total</th>
  <th class="yro_right">Sent</th>
  <th class="yro_right">Recv</th>
  <th class="yro_right">After Total</th>
  ${htmlTripletHeaders('Final')}
  <th class="yro_center">Merch (free/total)</th>
  <th class="yro_right">Merch Used</th>
</tr>`;
        if (!rows.length) return html + '<tr><td colspan="15">-</td></tr>';
        rows.forEach(function (r) {
          html += `
<tr>
  <td><b>${escHtml(String(r.name))}</b></td>
  <td class="yro_right">${Y.formatTwNumber(r.storage)}</td>
  <td class="yro_right">${Y.formatTwNumber(r.targetEach || 0)}</td>
  ${htmlTripletCells(r.current)}
  <td class="yro_right">${Y.formatTwNumber(r.before.total)}</td>
  <td class="yro_right">${Y.formatTwNumber(r.sent.total)}</td>
  <td class="yro_right">${Y.formatTwNumber(r.recv.total)}</td>
  <td class="yro_right"><b>${Y.formatTwNumber(r.after.total)}</b></td>
  ${htmlTripletCells(r.after)}
  <td class="yro_center">${htmlMerchPair(r)}</td>
  <td class="yro_right">${Y.formatTwNumber(r.merchUsed || 0)}</td>
</tr>`;
        });
        return html;
      }

      function buildParentsAndSurplusTable(parentRows, surplusRows) {
        var html = `
<tr><th colspan="17">PARENTS</th></tr>
<tr>
  <th>Village</th>
  <th class="yro_right">Storage</th>
  <th class="yro_right">Reserve Each</th>
  ${htmlTripletHeaders('Cur')}
  <th class="yro_right">Before Total</th>
  <th class="yro_right">Sent</th>
  <th class="yro_right">Recv</th>
  <th class="yro_right">After Total</th>
  <th class="yro_right">Above Reserve After</th>
  ${htmlTripletHeaders('Final')}
  <th class="yro_right">Spread (Above Reserve)</th>
  <th class="yro_center">Merch (free/total)</th>
  <th class="yro_right">Merch Used</th>
</tr>`;
        if (!parentRows.length) {
          html += '<tr><td colspan="17">-</td></tr>';
        } else {
          parentRows.forEach(function (r) {
            html += `
<tr>
  <td><b>${escHtml(String(r.name))}</b></td>
  <td class="yro_right">${Y.formatTwNumber(r.storage)}</td>
  <td class="yro_right">${Y.formatTwNumber(r.reserveEach || 0)}</td>
  ${htmlTripletCells(r.current)}
  <td class="yro_right">${Y.formatTwNumber(r.before.total)}</td>
  <td class="yro_right">${Y.formatTwNumber(r.sent.total)}</td>
  <td class="yro_right">${Y.formatTwNumber(r.recv.total)}</td>
  <td class="yro_right"><b>${Y.formatTwNumber(r.after.total)}</b></td>
  <td class="yro_right">${Y.formatTwNumber((r.aboveReserveAfter && r.aboveReserveAfter.total) || 0)}</td>
  ${htmlTripletCells(r.after)}
  <td class="yro_right">${Y.formatTwNumber(r.spreadAfter || 0)}</td>
  <td class="yro_center">${htmlMerchPair(r)}</td>
  <td class="yro_right">${Y.formatTwNumber(r.merchUsed || 0)}</td>
</tr>`;
          });
        }
        if (surplusRows && surplusRows.length) {
          html += `
<tr><th colspan="15">SURPLUS</th></tr>
<tr>
  <th>Village</th>
  <th class="yro_right">Storage</th>
  <th class="yro_right">Cap Each</th>
  ${htmlTripletHeaders('Cur')}
  <th class="yro_right">Before Total</th>
  <th class="yro_right">Sent</th>
  <th class="yro_right">Recv</th>
  <th class="yro_right">After Total</th>
  ${htmlTripletHeaders('Final')}
  <th class="yro_center">Merch (free/total)</th>
  <th class="yro_right">Merch Used</th>
</tr>`;
          surplusRows.forEach(function (r) {
            html += `
<tr>
  <td><b>${escHtml(String(r.name))}</b></td>
  <td class="yro_right">${Y.formatTwNumber(r.storage)}</td>
  <td class="yro_right">${Y.formatTwNumber(r.capEach || 0)}</td>
  ${htmlTripletCells(r.current)}
  <td class="yro_right">${Y.formatTwNumber(r.before.total)}</td>
  <td class="yro_right">${Y.formatTwNumber(r.sent.total)}</td>
  <td class="yro_right">${Y.formatTwNumber(r.recv.total)}</td>
  <td class="yro_right"><b>${Y.formatTwNumber(r.after.total)}</b></td>
  ${htmlTripletCells(r.after)}
  <td class="yro_center">${htmlMerchPair(r)}</td>
  <td class="yro_right">${Y.formatTwNumber(r.merchUsed || 0)}</td>
</tr>`;
          });
        }
        return html;
      }

      if (tTbl) tTbl.innerHTML = buildChildrenTable(plan.childSummary || []);
      if (sTbl) sTbl.innerHTML = buildParentsAndSurplusTable(plan.parentSummary || [], plan.surplusSummary || []);
    } else if (String(plan.mode || '').toLowerCase() === 'flat' && plan.childSummary && plan.parentSummary) {
      var warningsD = Array.isArray(plan.meta.warnings) ? plan.meta.warnings.filter(Boolean) : [];
      if (metaEl) {
        metaEl.innerHTML =
          '<b>Mode:</b> FLAT TARGET EQUALIZER | ' +
          '<b>Computed Flat Target:</b> ' + Y.formatTwNumber(plan.meta.computedFlatTarget || 0) + ' | ' +
          '<b>Depot Cap %:</b> ' + Y.formatTwNumber(plan.meta.depotCapPct || 0) + ' | ' +
          '<b>Parent Reserve %:</b> ' + Y.formatTwNumber(plan.meta.parentReservePct || 0) + ' | ' +
          '<b>Child Merch Used:</b> ' + Y.formatTwNumber(plan.meta.childMerchantsUsed || 0) + ' | ' +
          '<b>Parent Merch Used:</b> ' + Y.formatTwNumber(plan.meta.parentMerchantsUsed || 0) + ' | ' +
          '<b>Shipments:</b> ' + ((plan.shipments || []).length) + ' | ' +
          '<b>Warnings:</b> ' + (warningsD.length ? escHtml(warningsD.join(' | ')) : '-');
      }
      if (diagEl) {
        var diagLinesD = plan.meta.diagnostics && Array.isArray(plan.meta.diagnostics.lines) ? plan.meta.diagnostics.lines.filter(Boolean) : [];
        diagEl.innerHTML = diagLinesD.length
          ? diagLinesD.map(function (line) { return '<div class="yro_diag_line">- ' + escHtml(line) + '</div>'; }).join('')
          : 'Diagnostics: -';
      }
      var computedFillElD0 = Y.qs('#yro_B_computed_fill_v31');
      var childMerchElD0 = Y.qs('#yro_B_child_merch_v31');
      var parentMerchElD0 = Y.qs('#yro_B_parent_merch_v31');
      var modeAFillElD0 = Y.qs('#yro_A_computed_fill_v31');
      var modeAMerchElD0 = Y.qs('#yro_A_merch_used_v31');
      var modeDFlatEl = Y.qs('#yro_D_computed_flat_v31');
      var modeDChildMerchEl = Y.qs('#yro_D_child_merch_v31');
      var modeDParentMerchEl = Y.qs('#yro_D_parent_merch_v31');
      var modeCCoinsElD0 = Y.qs('#yro_C_additional_coins_v31');
      var modeCMerchElD0 = Y.qs('#yro_C_merch_used_v31');
      if (computedFillElD0) computedFillElD0.value = '';
      if (childMerchElD0) childMerchElD0.value = '';
      if (parentMerchElD0) parentMerchElD0.value = '';
      if (modeAFillElD0) modeAFillElD0.value = '';
      if (modeAMerchElD0) modeAMerchElD0.value = '';
      if (modeDFlatEl) modeDFlatEl.value = plan.meta.computedFlatTarget != null ? plan.meta.computedFlatTarget : '';
      if (modeDChildMerchEl) modeDChildMerchEl.value = plan.meta.childMerchantsUsed != null ? plan.meta.childMerchantsUsed : '';
      if (modeDParentMerchEl) modeDParentMerchEl.value = plan.meta.parentMerchantsUsed != null ? plan.meta.parentMerchantsUsed : '';
      if (modeCCoinsElD0) modeCCoinsElD0.value = '';
      if (modeCMerchElD0) modeCMerchElD0.value = '';
      if (targetTitleEl) targetTitleEl.textContent = 'CHILDREN';
      if (surplusTitleEl) surplusTitleEl.textContent = (plan.surplusSummary && plan.surplusSummary.length) ? 'PARENTS / SURPLUS' : 'PARENTS';
      if (shipTitleEl) shipTitleEl.textContent = 'SHIPMENTS';
      if (copyTargetEl) copyTargetEl.textContent = 'Copy CHILDREN';
      if (copySurplusEl) copySurplusEl.textContent = (plan.surplusSummary && plan.surplusSummary.length) ? 'Copy PARENTS / SURPLUS' : 'Copy PARENTS';
      if (copyShipEl) copyShipEl.textContent = 'Copy SHIPMENTS';

      function buildFlatChildrenTable(rows) {
        var html = `
<tr><th colspan="17">CHILDREN</th></tr>
<tr>
  <th>Village</th>
  <th class="yro_right">Storage</th>
  <th class="yro_right">Cap Each</th>
  <th class="yro_right">Target Each</th>
  <th class="yro_center">Capped?</th>
  ${htmlTripletHeaders('Cur')}
  <th class="yro_right">Before Total</th>
  <th class="yro_right">Sent</th>
  <th class="yro_right">Recv</th>
  <th class="yro_right">After Total</th>
  ${htmlTripletHeaders('Final')}
  <th class="yro_center">Merch (free/total)</th>
  <th class="yro_right">Merch Used</th>
</tr>`;
        if (!rows.length) return html + '<tr><td colspan="17">-</td></tr>';
        rows.forEach(function (r) {
          html += `
<tr>
  <td><b>${escHtml(String(r.name))}</b></td>
  <td class="yro_right">${Y.formatTwNumber(r.storage)}</td>
  <td class="yro_right">${Y.formatTwNumber(r.capEach || 0)}</td>
  <td class="yro_right">${Y.formatTwNumber(r.targetEach || 0)}</td>
  <td class="yro_center">${r.capped ? 'Yes' : 'No'}</td>
  ${htmlTripletCells(r.current)}
  <td class="yro_right">${Y.formatTwNumber(r.before.total)}</td>
  <td class="yro_right">${Y.formatTwNumber(r.sent.total)}</td>
  <td class="yro_right">${Y.formatTwNumber(r.recv.total)}</td>
  <td class="yro_right"><b>${Y.formatTwNumber(r.after.total)}</b></td>
  ${htmlTripletCells(r.after)}
  <td class="yro_center">${htmlMerchPair(r)}</td>
  <td class="yro_right">${Y.formatTwNumber(r.merchUsed || 0)}</td>
</tr>`;
        });
        return html;
      }

      function buildFlatParentsTable(rows, surplusRows) {
        var html = `
<tr><th colspan="17">PARENTS</th></tr>
<tr>
  <th>Village</th>
  <th class="yro_right">Storage</th>
  <th class="yro_right">Reserve Each</th>
  ${htmlTripletHeaders('Cur')}
  <th class="yro_right">Before Total</th>
  <th class="yro_right">Sent</th>
  <th class="yro_right">Recv</th>
  <th class="yro_right">After Total</th>
  <th class="yro_right">Above Reserve After</th>
  ${htmlTripletHeaders('Final')}
  <th class="yro_right">Spread (Above Reserve)</th>
  <th class="yro_center">Merch (free/total)</th>
  <th class="yro_right">Merch Used</th>
</tr>`;
        if (!rows.length) {
          html += '<tr><td colspan="17">-</td></tr>';
        } else {
          rows.forEach(function (r) {
            html += `
<tr>
  <td><b>${escHtml(String(r.name))}</b></td>
  <td class="yro_right">${Y.formatTwNumber(r.storage)}</td>
  <td class="yro_right">${Y.formatTwNumber(r.reserveEach || 0)}</td>
  ${htmlTripletCells(r.current)}
  <td class="yro_right">${Y.formatTwNumber(r.before.total)}</td>
  <td class="yro_right">${Y.formatTwNumber(r.sent.total)}</td>
  <td class="yro_right">${Y.formatTwNumber(r.recv.total)}</td>
  <td class="yro_right"><b>${Y.formatTwNumber(r.after.total)}</b></td>
  <td class="yro_right">${Y.formatTwNumber((r.aboveReserveAfter && r.aboveReserveAfter.total) || 0)}</td>
  ${htmlTripletCells(r.after)}
  <td class="yro_right">${Y.formatTwNumber(r.spreadAfter || 0)}</td>
  <td class="yro_center">${htmlMerchPair(r)}</td>
  <td class="yro_right">${Y.formatTwNumber(r.merchUsed || 0)}</td>
</tr>`;
          });
        }
        if (surplusRows && surplusRows.length) {
          html += `
<tr><th colspan="15">SURPLUS</th></tr>
<tr>
  <th>Village</th>
  <th class="yro_right">Storage</th>
  <th class="yro_right">Cap Each</th>
  ${htmlTripletHeaders('Cur')}
  <th class="yro_right">Before Total</th>
  <th class="yro_right">Sent</th>
  <th class="yro_right">Recv</th>
  <th class="yro_right">After Total</th>
  ${htmlTripletHeaders('Final')}
  <th class="yro_center">Merch (free/total)</th>
  <th class="yro_right">Merch Used</th>
</tr>`;
          surplusRows.forEach(function (r) {
            html += `
<tr>
  <td><b>${escHtml(String(r.name))}</b></td>
  <td class="yro_right">${Y.formatTwNumber(r.storage)}</td>
  <td class="yro_right">${Y.formatTwNumber(r.capEach || 0)}</td>
  ${htmlTripletCells(r.current)}
  <td class="yro_right">${Y.formatTwNumber(r.before.total)}</td>
  <td class="yro_right">${Y.formatTwNumber(r.sent.total)}</td>
  <td class="yro_right">${Y.formatTwNumber(r.recv.total)}</td>
  <td class="yro_right"><b>${Y.formatTwNumber(r.after.total)}</b></td>
  ${htmlTripletCells(r.after)}
  <td class="yro_center">${htmlMerchPair(r)}</td>
  <td class="yro_right">${Y.formatTwNumber(r.merchUsed || 0)}</td>
</tr>`;
          });
        }
        return html;
      }

      if (tTbl) tTbl.innerHTML = buildFlatChildrenTable(plan.childSummary || []);
      if (sTbl) sTbl.innerHTML = buildFlatParentsTable(plan.parentSummary || [], plan.surplusSummary || []);
    } else if (String(plan.mode || '').toLowerCase() === 'coin' && plan.coinSummary && plan.sourceSummary) {
      var warningsC = Array.isArray(plan.meta.warnings) ? plan.meta.warnings.filter(Boolean) : [];
      if (metaEl) {
        metaEl.innerHTML =
          '<b>Mode:</b> COIN MAXIMIZER | ' +
          '<b>Baseline Coins:</b> ' + Y.formatTwNumber(plan.meta.baselineCoinsTotal || 0) + ' | ' +
          '<b>Projected Coins:</b> ' + Y.formatTwNumber(plan.meta.projectedCoinsTotal || 0) + ' | ' +
          '<b>Additional Coins:</b> ' + Y.formatTwNumber(plan.meta.additionalCoins || 0) + ' | ' +
          '<b>Source Reserve %:</b> ' + Y.formatTwNumber(plan.meta.sourceReservePct || 0) + ' | ' +
          '<b>Buffer Cap %:</b> ' + Y.formatTwNumber(plan.meta.bufferCapPct || 0) + ' | ' +
          '<b>Merch Used:</b> ' + Y.formatTwNumber(plan.meta.merchantsUsed || 0) + ' | ' +
          '<b>Shipments:</b> ' + ((plan.shipments || []).length) + ' | ' +
          '<b>Warnings:</b> ' + (warningsC.length ? escHtml(warningsC.join(' | ')) : '-');
      }
      if (diagEl) {
        var diagLinesC = plan.meta.diagnostics && Array.isArray(plan.meta.diagnostics.lines) ? plan.meta.diagnostics.lines.filter(Boolean) : [];
        diagEl.innerHTML = diagLinesC.length
          ? diagLinesC.map(function (line) { return '<div class="yro_diag_line">- ' + escHtml(line) + '</div>'; }).join('')
          : 'Diagnostics: -';
      }
      var computedFillElC0 = Y.qs('#yro_B_computed_fill_v31');
      var childMerchElC0 = Y.qs('#yro_B_child_merch_v31');
      var parentMerchElC0 = Y.qs('#yro_B_parent_merch_v31');
      var modeAFillElC0 = Y.qs('#yro_A_computed_fill_v31');
      var modeAMerchElC0 = Y.qs('#yro_A_merch_used_v31');
      var modeDFlatElC0 = Y.qs('#yro_D_computed_flat_v31');
      var modeDChildMerchElC0 = Y.qs('#yro_D_child_merch_v31');
      var modeDParentMerchElC0 = Y.qs('#yro_D_parent_merch_v31');
      var modeCCoinsEl = Y.qs('#yro_C_additional_coins_v31');
      var modeCMerchEl = Y.qs('#yro_C_merch_used_v31');
      if (computedFillElC0) computedFillElC0.value = '';
      if (childMerchElC0) childMerchElC0.value = '';
      if (parentMerchElC0) parentMerchElC0.value = '';
      if (modeAFillElC0) modeAFillElC0.value = '';
      if (modeAMerchElC0) modeAMerchElC0.value = '';
      if (modeDFlatElC0) modeDFlatElC0.value = '';
      if (modeDChildMerchElC0) modeDChildMerchElC0.value = '';
      if (modeDParentMerchElC0) modeDParentMerchElC0.value = '';
      if (modeCCoinsEl) modeCCoinsEl.value = plan.meta.additionalCoins != null ? plan.meta.additionalCoins : '';
      if (modeCMerchEl) modeCMerchEl.value = plan.meta.merchantsUsed != null ? plan.meta.merchantsUsed : '';
      if (targetTitleEl) targetTitleEl.textContent = 'COIN VILLAGES';
      if (surplusTitleEl) surplusTitleEl.textContent = (plan.bufferSummary && plan.bufferSummary.length) ? 'SOURCES / BUFFER' : 'SOURCES';
      if (shipTitleEl) shipTitleEl.textContent = 'SHIPMENTS';
      if (copyTargetEl) copyTargetEl.textContent = 'Copy COIN VILLAGES';
      if (copySurplusEl) copySurplusEl.textContent = (plan.bufferSummary && plan.bufferSummary.length) ? 'Copy SOURCES / BUFFER' : 'Copy SOURCES';
      if (copyShipEl) copyShipEl.textContent = 'Copy SHIPMENTS';

      function buildCoinTable(rows) {
        var html = `
<tr><th colspan="18">COIN VILLAGES</th></tr>
<tr>
  <th>Village</th>
  <th class="yro_right">Storage</th>
  <th class="yro_right">Coin Cost</th>
  <th class="yro_right">Base Coins</th>
  <th class="yro_right">Projected Coins</th>
  <th class="yro_right">+Coins</th>
  <th class="yro_right">Next Deficit</th>
  ${htmlTripletHeaders('Cur')}
  <th class="yro_right">Before Total</th>
  <th class="yro_right">Sent</th>
  <th class="yro_right">Recv</th>
  <th class="yro_right">After Total</th>
  ${htmlTripletHeaders('Final')}
  <th class="yro_center">Merch (free/total)</th>
  <th class="yro_right">Merch Used</th>
</tr>`;
        if (!rows.length) return html + '<tr><td colspan="18">-</td></tr>';
        rows.forEach(function (r) {
          var costText = r.coinCost
            ? (Y.formatTwNumber(r.coinCost.wood) + '/' + Y.formatTwNumber(r.coinCost.clay) + '/' + Y.formatTwNumber(r.coinCost.iron))
            : '-';
          html += `
<tr>
  <td><b>${escHtml(String(r.name))}</b></td>
  <td class="yro_right">${Y.formatTwNumber(r.storage)}</td>
  <td class="yro_right">${costText}</td>
  <td class="yro_right">${Y.formatTwNumber(r.baselineCoins || 0)}</td>
  <td class="yro_right"><b>${Y.formatTwNumber(r.projectedCoins || 0)}</b></td>
  <td class="yro_right">${Y.formatTwNumber(r.additionalCoins || 0)}</td>
  <td class="yro_right">${Y.formatTwNumber((r.nextDeficit && r.nextDeficit.total) || 0)}</td>
  ${htmlTripletCells(r.current)}
  <td class="yro_right">${Y.formatTwNumber(r.before.total)}</td>
  <td class="yro_right">${Y.formatTwNumber(r.sent.total)}</td>
  <td class="yro_right">${Y.formatTwNumber(r.recv.total)}</td>
  <td class="yro_right"><b>${Y.formatTwNumber(r.after.total)}</b></td>
  ${htmlTripletCells(r.after)}
  <td class="yro_center">${htmlMerchPair(r)}</td>
  <td class="yro_right">${Y.formatTwNumber(r.merchUsed || 0)}</td>
</tr>`;
        });
        return html;
      }

      function buildSourcesBufferTable(sourceRows, bufferRows) {
        var html = `
<tr><th colspan="17">SOURCES</th></tr>
<tr>
  <th>Village</th>
  <th class="yro_right">Storage</th>
  <th class="yro_right">Reserve Each</th>
  ${htmlTripletHeaders('Cur')}
  <th class="yro_right">Before Total</th>
  <th class="yro_right">Sent</th>
  <th class="yro_right">Recv</th>
  <th class="yro_right">After Total</th>
  <th class="yro_right">Available Left</th>
  ${htmlTripletHeaders('Final')}
  <th class="yro_center">Merch (free/total)</th>
  <th class="yro_right">Merch Used</th>
</tr>`;
        if (!sourceRows.length) {
          html += '<tr><td colspan="17">-</td></tr>';
        } else {
          sourceRows.forEach(function (r) {
            html += `
<tr>
  <td><b>${escHtml(String(r.name))}</b></td>
  <td class="yro_right">${Y.formatTwNumber(r.storage)}</td>
  <td class="yro_right">${Y.formatTwNumber(r.reserveEach || 0)}</td>
  ${htmlTripletCells(r.current)}
  <td class="yro_right">${Y.formatTwNumber(r.before.total)}</td>
  <td class="yro_right">${Y.formatTwNumber(r.sent.total)}</td>
  <td class="yro_right">${Y.formatTwNumber(r.recv.total)}</td>
  <td class="yro_right"><b>${Y.formatTwNumber(r.after.total)}</b></td>
  <td class="yro_right">${Y.formatTwNumber((r.availableLeft && r.availableLeft.total) || 0)}</td>
  ${htmlTripletCells(r.after)}
  <td class="yro_center">${htmlMerchPair(r)}</td>
  <td class="yro_right">${Y.formatTwNumber(r.merchUsed || 0)}</td>
</tr>`;
          });
        }
        if (bufferRows && bufferRows.length) {
          html += `
<tr><th colspan="15">BUFFER</th></tr>
<tr>
  <th>Village</th>
  <th class="yro_right">Storage</th>
  <th class="yro_right">Cap Each</th>
  ${htmlTripletHeaders('Cur')}
  <th class="yro_right">Before Total</th>
  <th class="yro_right">Sent</th>
  <th class="yro_right">Recv</th>
  <th class="yro_right">After Total</th>
  ${htmlTripletHeaders('Final')}
  <th class="yro_center">Merch (free/total)</th>
  <th class="yro_right">Merch Used</th>
</tr>`;
          bufferRows.forEach(function (r) {
            html += `
<tr>
  <td><b>${escHtml(String(r.name))}</b></td>
  <td class="yro_right">${Y.formatTwNumber(r.storage)}</td>
  <td class="yro_right">${Y.formatTwNumber(r.capEach || 0)}</td>
  ${htmlTripletCells(r.current)}
  <td class="yro_right">${Y.formatTwNumber(r.before.total)}</td>
  <td class="yro_right">${Y.formatTwNumber(r.sent.total)}</td>
  <td class="yro_right">${Y.formatTwNumber(r.recv.total)}</td>
  <td class="yro_right"><b>${Y.formatTwNumber(r.after.total)}</b></td>
  ${htmlTripletCells(r.after)}
  <td class="yro_center">${htmlMerchPair(r)}</td>
  <td class="yro_right">${Y.formatTwNumber(r.merchUsed || 0)}</td>
</tr>`;
          });
        }
        return html;
      }

      if (tTbl) tTbl.innerHTML = buildCoinTable(plan.coinSummary || []);
      if (sTbl) sTbl.innerHTML = buildSourcesBufferTable(plan.sourceSummary || [], plan.bufferSummary || []);
    } else {
      var computedFillEl2 = Y.qs('#yro_B_computed_fill_v31');
      var childMerchEl2 = Y.qs('#yro_B_child_merch_v31');
      var parentMerchEl2 = Y.qs('#yro_B_parent_merch_v31');
      var modeAFillEl3 = Y.qs('#yro_A_computed_fill_v31');
      var modeAMerchEl3 = Y.qs('#yro_A_merch_used_v31');
      var modeDFlatEl2 = Y.qs('#yro_D_computed_flat_v31');
      var modeDChildMerchEl2 = Y.qs('#yro_D_child_merch_v31');
      var modeDParentMerchEl2 = Y.qs('#yro_D_parent_merch_v31');
      var modeCCoinsEl2 = Y.qs('#yro_C_additional_coins_v31');
      var modeCMerchEl2 = Y.qs('#yro_C_merch_used_v31');
      if (computedFillEl2) computedFillEl2.value = '';
      if (childMerchEl2) childMerchEl2.value = '';
      if (parentMerchEl2) parentMerchEl2.value = '';
      if (modeAFillEl3) modeAFillEl3.value = '';
      if (modeAMerchEl3) modeAMerchEl3.value = '';
      if (modeDFlatEl2) modeDFlatEl2.value = '';
      if (modeDChildMerchEl2) modeDChildMerchEl2.value = '';
      if (modeDParentMerchEl2) modeDParentMerchEl2.value = '';
      if (modeCCoinsEl2) modeCCoinsEl2.value = '';
      if (modeCMerchEl2) modeCMerchEl2.value = '';
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

  Y.log('ui module loaded Ã¢Å“â€¦');
})();

