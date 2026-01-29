(function () {
  'use strict';

  var Y = window.YRO_V11;
  if (!Y) return;

  function injectCSS() {
    if (document.getElementById(Y.cfg.STYLE_ID)) return;

    var css = `
#${Y.cfg.PANEL_ID}{
  position:fixed; z-index:99999;
  width: 980px; max-width: calc(100vw - 20px);
  background:#f4f1e8; border:1px solid #7b6a3a;
  box-shadow:0 8px 22px rgba(0,0,0,.25);
  font-family:Verdana,Arial,sans-serif; font-size:12px;
}
#${Y.cfg.PANEL_ID} *{ box-sizing:border-box; }

#${Y.cfg.PANEL_ID} .yro_hdr{
  display:flex; align-items:center; justify-content:space-between;
  background: linear-gradient(#c7b27b,#a98a3b);
  color:#fff; padding:6px 8px; border-bottom:1px solid #6a5626;
}
#${Y.cfg.PANEL_ID} .yro_ttl{ font-weight:bold; display:flex; align-items:center; gap:6px; }
#${Y.cfg.PANEL_ID} .yro_small{ font-size:11px; opacity:.95; }
#${Y.cfg.PANEL_ID} .yro_dev{ font-size:11px; opacity:.95; margin-right:6px; }

#${Y.cfg.PANEL_ID} .yro_toolbar{
  display:flex; align-items:center; gap:8px; flex-wrap:wrap;
  padding:8px; border-bottom:1px solid #d2c9b2;
  background:#efe9d8;
}
#${Y.cfg.PANEL_ID} .yro_btn{
  padding:4px 8px; border:1px solid #6f5b2a; background:#e7ddb8; cursor:pointer;
  border-radius:4px; font-weight:bold;
}
#${Y.cfg.PANEL_ID} .yro_btn:hover{ filter:brightness(1.05); }
#${Y.cfg.PANEL_ID} .btn-confirm{ background:#cfe7c8; border-color:#3b6a3b; }
#${Y.cfg.PANEL_ID} .btn-warn{ background:#ffe0b2; border-color:#a66a00; }
#${Y.cfg.PANEL_ID} .yro_progress_outer{
  width:180px; height:10px; border:1px solid #6f5b2a; background:#fff; border-radius:10px; overflow:hidden;
}
#${Y.cfg.PANEL_ID} .yro_progress_inner{ height:100%; width:0%; background:#4f8b2d; }

#${Y.cfg.PANEL_ID} .yro_msg{
  padding:6px 8px; border-bottom:1px solid #d2c9b2;
  background:#fbf8ef;
}

#${Y.cfg.PANEL_ID} #yro_content_v11{ padding:8px; }

#${Y.cfg.PANEL_ID} .yro_sec_head{
  display:flex; align-items:center; justify-content:space-between;
  padding:6px 6px; background:#e8dfc6;
  border:1px solid #d2c9b2; border-radius:6px;
  margin-top:8px;
  font-weight:bold;
}
#${Y.cfg.PANEL_ID} .yro_sec_controls{
  display:flex; align-items:center; gap:6px; font-weight:normal; flex-wrap:wrap;
}
#${Y.cfg.PANEL_ID} .yro_mini{
  padding:2px 6px; border:1px solid #6f5b2a; background:#fff; cursor:pointer; border-radius:4px;
}
#${Y.cfg.PANEL_ID} .yro_scroll{ overflow:auto; border:1px solid #d2c9b2; border-top:none; background:#fff; }

#${Y.cfg.PANEL_ID} .yro_table{
  width:100%; border-collapse:collapse;
}
#${Y.cfg.PANEL_ID} .yro_table th, #${Y.cfg.PANEL_ID} .yro_table td{
  border:1px solid #d2c9b2; padding:4px 6px; white-space:nowrap;
}
#${Y.cfg.PANEL_ID} .yro_table th{ background:#f3eddc; position:sticky; top:0; z-index:2; }
#${Y.cfg.PANEL_ID} .yro_right{ text-align:right; }
#${Y.cfg.PANEL_ID} .yro_center{ text-align:center; }

#${Y.cfg.PANEL_ID} .yro_mode_box{
  margin-top:8px; border:1px solid #d2c9b2; border-radius:8px; overflow:hidden; background:#fff;
}
#${Y.cfg.PANEL_ID} .yro_mode_row{
  display:flex; gap:10px; padding:8px; border-bottom:1px solid #eee;
  cursor:pointer;
}
#${Y.cfg.PANEL_ID} .yro_mode_row:last-child{ border-bottom:none; }
#${Y.cfg.PANEL_ID} .yro_mode_row.active{ background:#e7f3e3; }
#${Y.cfg.PANEL_ID} .yro_mode_left{ flex:1; }
#${Y.cfg.PANEL_ID} .yro_mode_title{ font-weight:bold; margin-bottom:2px; }
#${Y.cfg.PANEL_ID} .yro_mode_desc{ color:#333; }
#${Y.cfg.PANEL_ID} .yro_mode_controls{
  display:flex; flex-wrap:wrap; gap:8px; align-items:flex-end; justify-content:flex-end;
  min-width: 540px;
}
#${Y.cfg.PANEL_ID} .yro_kv{ display:flex; flex-direction:column; gap:2px; }
#${Y.cfg.PANEL_ID} .yro_kv label{ font-size:11px; opacity:.9; }
#${Y.cfg.PANEL_ID} input[type="number"]{ padding:2px 4px; }
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
<div class="yro_hdr" id="yro_drag_v11" style="cursor:move;">
  <div class="yro_ttl"><span class="icon header wood"></span> Resource Orchestrator <span class="yro_small">(v11)</span></div>
  <div>
    <span class="yro_dev">Developed by controleng</span>
    <button class="yro_btn" id="yro_close_v11">✖</button>
  </div>
</div>

<div class="yro_toolbar">
  <button class="yro_btn btn-confirm" id="yro_load_v11">Yükle / Yenile (Full Scan)</button>
  <div class="yro_progress_outer"><div class="yro_progress_inner" id="yro_prog_bar_v11"></div></div>
  <span id="yro_prog_txt_v11" class="yro_small">0/0 - Ready</span>

  <span class="yro_small"><b>Search:</b></span>
  <input type="text" id="yro_search_v11" placeholder="Köy adı…" style="width:180px;">

  <button class="yro_btn btn-confirm" id="yro_copy_bb_v11">Copy BBCode</button>
</div>

<div class="yro_msg" id="yro_msg_v11" style="color: #0a6;">Hazır ✅</div>

<div id="yro_content_v11">
  <div class="yro_sec_head">
    <div>1) Villages — Production (per hour + 24h) (<span id="yro_t1_title_v11">All villages</span>)</div>
    <div class="yro_sec_controls">
      <button class="yro_mini" id="yro_t1_toggle_v11">${st.ui.minimized1 ? 'Expand' : 'Minimize'}</button>
      <span class="yro_small"><b>Group:</b></span>
      <select id="yro_t1_group_sel_v11"></select>
      <button class="yro_mini" id="yro_t1_pick_v11" title="Custom selection seçiliyse tek tek köy seç">Pick…</button>
    </div>
  </div>
  <div class="yro_scroll" id="yro_t1_wrap_v11" style="${st.ui.minimized1 ? 'display:none;' : ''}">
    <table class="yro_table" id="yro_t1_tbl_v11"></table>
  </div>

  <div class="yro_sec_head">
    <div>2) Villages — Current + Incoming + Outgoing (per village) (<span id="yro_t2_title_v11">All villages</span>)</div>
    <div class="yro_sec_controls">
      <button class="yro_mini" id="yro_t2_toggle_v11">${st.ui.minimized2 ? 'Expand' : 'Minimize'}</button>
      <span class="yro_small"><b>Group:</b></span>
      <select id="yro_t2_group_sel_v11"></select>
      <button class="yro_mini" id="yro_t2_pick_v11" title="Custom selection seçiliyse tek tek köy seç">Pick…</button>
      <span class="yro_small" id="yro_scan_ts_v11"></span>
    </div>
  </div>
  <div class="yro_scroll" id="yro_t2_wrap_v11" style="${st.ui.minimized2 ? 'display:none;' : ''}">
    <table class="yro_table" id="yro_t2_tbl_v11"></table>
  </div>

  <div class="yro_sec_head">
    <div>3) Orchestrator — Tri-balance + Surplus Fill (biggest storage first)</div>
    <div class="yro_sec_controls"><span class="yro_small">Mode: satırın boş alanına tıkla.</span></div>
  </div>

  <div class="yro_msg">
    <b>Not:</b>
    <span class="yro_small">
      v11 “Full Scan” ile <b>her köyün</b> market→transports sayfasından:
      <b>anlık kaynak</b>, <b>incoming</b>, <b>outgoing</b>, <b>merchants</b>, <b>saatlik üretim</b> çekilir.
      Surplus: seçtiğin grubun <b>en büyük depolu köylerinden başlayarak</b> doldurulur (incoming dahil kapasite hesabı).
    </span>
  </div>

  <div class="yro_mode_box" id="yro_modes_v11"></div>

  <div class="yro_msg" id="yro_plan_meta_v11" style="margin-top:8px;">
    <b>Mode:</b> - |
    <b>Cap%:</b> - |
    <b>Reserve(each):</b> - |
    <b>Surplus Cap%:</b> - |
    <b>Shipments:</b> 0
  </div>

  <div class="yro_scroll">
    <table class="yro_table" id="yro_plan_target_tbl_v11"></table>
  </div>

  <div class="yro_scroll" style="margin-top:8px;">
    <table class="yro_table" id="yro_plan_surplus_tbl_v11"></table>
  </div>

  <div class="yro_scroll" style="margin-top:8px;">
    <table class="yro_table" id="yro_plan_ship_tbl_v11"></table>
  </div>
</div>
    `;

    document.body.appendChild(root);
    return root;
  }

  function setMsg(text, color) {
    var el = Y.qs('#yro_msg_v11');
    if (!el) return;
    el.textContent = text;
    if (color) el.style.color = color;
  }

  function setProgress(step, total, text) {
    var bar = Y.qs('#yro_prog_bar_v11');
    var tx = Y.qs('#yro_prog_txt_v11');
    if (!bar || !tx) return;
    var pct = total ? Math.round((step / total) * 100) : 0;
    bar.style.width = pct + '%';
    tx.textContent = step + '/' + total + ' - ' + text;
  }

  function fillGroupSelects(groups) {
    var st = Y.state;

    function fill(selId, selected) {
      var sel = Y.qs(selId);
      if (!sel) return;
      sel.innerHTML = '';
      (groups || []).forEach(function (g) {
        var o = document.createElement('option');
        o.value = String(g.id);
        o.textContent = g.name;
        if (String(g.id) === String(selected)) o.selected = true;
        sel.appendChild(o);
      });
    }

    fill('#yro_t1_group_sel_v11', st.groups.sel1);
    fill('#yro_t2_group_sel_v11', st.groups.sel2);
  }

  function buildModesBox(groups) {
    var st = Y.state;

    function escapeHtml(s) {
      return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    }

    function optionsHTML(selectedId) {
      return (groups || [])
        .map(function (g) {
          var sel = String(g.id) === String(selectedId) ? ' selected' : '';
          return '<option value="' + g.id + '"' + sel + '>' + escapeHtml(g.name) + '</option>';
        })
        .join('');
    }

    var wrap = Y.qs('#yro_modes_v11');
    if (!wrap) return;

    wrap.innerHTML = `
<div class="yro_mode_row ${st.orchestrator.mode === 'balance' ? 'active' : ''}" data-mode="balance">
  <div class="yro_mode_left">
    <div class="yro_mode_title">Mod A: Balance Group</div>
    <div class="yro_mode_desc">Hedef grubu kendi içinde tri-balance yapar. Artanı Surplus grubuna (biggest storage first) yollar.</div>
  </div>
  <div class="yro_mode_controls">
    <div class="yro_kv"><label>Target</label>
      <select id="yro_A_target_v11">${optionsHTML(st.groups.A_target)}</select>
    </div>
    <button class="yro_mini" id="pick_A_target_v11" title="Custom selection seçiliyse tek tek köy seç">Pick…</button>

    <div class="yro_kv"><label>Surplus →</label>
      <select id="yro_A_surplus_v11">${optionsHTML(st.groups.A_surplus)}</select>
    </div>
    <button class="yro_mini" id="pick_A_surplus_v11" title="Custom selection seçiliyse tek tek köy seç">Pick…</button>

    <div class="yro_kv"><label>Cap%</label><img src="/graphic/buildings/storage.png" style="width:16px;height:16px;vertical-align:-3px;">
      <input id="yro_A_cap_v11" type="number" min="1" max="100" step="1" value="${st.orchestrator.cap}" style="width:60px;">
    </div>
    <div class="yro_kv"><label>Surplus Cap%</label><img src="/graphic/buildings/storage.png" style="width:16px;height:16px;vertical-align:-3px;">
      <input id="yro_A_scap_v11" type="number" min="1" max="100" step="1" value="${st.orchestrator.scap}" style="width:60px;">
    </div>
    <button class="yro_btn btn-confirm" id="yro_A_plan_v11">Plan</button>
    <button class="yro_btn btn-warn" id="yro_A_exec_tabs_v11">Execute (Tabs)</button>
    <button class="yro_btn btn-confirm" id="yro_A_exec_auto_v11">Execute (Auto)</button>
  </div>
</div>

<div class="yro_mode_row ${st.orchestrator.mode === 'push' ? 'active' : ''}" data-mode="push">
  <div class="yro_mode_left">
    <div class="yro_mode_title">Mod B: Push / Feed</div>
    <div class="yro_mode_desc">Sender → Target besleme (tri-balance). Kalan fazlayı Surplus’a (biggest storage first) yollar.</div>
  </div>
  <div class="yro_mode_controls">
    <div class="yro_kv"><label>Sender</label>
      <select id="yro_B_sender_v11">${optionsHTML(st.groups.B_sender)}</select>
    </div>
    <button class="yro_mini" id="pick_B_sender_v11">Pick…</button>

    <div class="yro_kv"><label>Target</label>
      <select id="yro_B_target_v11">${optionsHTML(st.groups.B_target)}</select>
    </div>
    <button class="yro_mini" id="pick_B_target_v11">Pick…</button>

    <div class="yro_kv"><label>Surplus →</label>
      <select id="yro_B_surplus_v11">${optionsHTML(st.groups.B_surplus)}</select>
    </div>
    <button class="yro_mini" id="pick_B_surplus_v11">Pick…</button>

    <div class="yro_kv"><label>Reserve(each)%</label><img src="/graphic/buildings/storage.png" style="width:16px;height:16px;vertical-align:-3px;">
      <input id="yro_B_reserve_v11" type="number" min="0" max="100" step="1" value="${st.orchestrator.reserve}" style="width:60px;">
    </div>
    <div class="yro_kv"><label>Cap%</label><img src="/graphic/buildings/storage.png" style="width:16px;height:16px;vertical-align:-3px;">
      <input id="yro_B_cap_v11" type="number" min="1" max="100" step="1" value="${st.orchestrator.cap}" style="width:60px;">
    </div>
    <div class="yro_kv"><label>Surplus Cap%</label><img src="/graphic/buildings/storage.png" style="width:16px;height:16px;vertical-align:-3px;">
      <input id="yro_B_scap_v11" type="number" min="1" max="100" step="1" value="${st.orchestrator.scap}" style="width:60px;">
    </div>
    <button class="yro_btn btn-confirm" id="yro_B_plan_v11">Plan</button>
    <button class="yro_btn btn-warn" id="yro_B_exec_tabs_v11">Execute (Tabs)</button>
    <button class="yro_btn btn-confirm" id="yro_B_exec_auto_v11">Execute (Auto)</button>
  </div>
</div>

<div class="yro_mode_row ${st.orchestrator.mode === 'funnel' ? 'active' : ''}" data-mode="funnel">
  <div class="yro_mode_left">
    <div class="yro_mode_title">Mod C: Funnel / Hoard</div>
    <div class="yro_mode_desc">Target dışındaki tüm köylerden hedefe akıtma (cap’e kadar). Kalan fazlayı Surplus’a yollar.</div>
  </div>
  <div class="yro_mode_controls">
    <div class="yro_kv"><label>Target</label>
      <select id="yro_C_target_v11">${optionsHTML(st.groups.C_target)}</select>
    </div>
    <button class="yro_mini" id="pick_C_target_v11">Pick…</button>

    <div class="yro_kv"><label>Surplus →</label>
      <select id="yro_C_surplus_v11">${optionsHTML(st.groups.C_surplus)}</select>
    </div>
    <button class="yro_mini" id="pick_C_surplus_v11">Pick…</button>

    <div class="yro_kv"><label>Reserve(each)%</label><img src="/graphic/buildings/storage.png" style="width:16px;height:16px;vertical-align:-3px;">
      <input id="yro_C_reserve_v11" type="number" min="0" max="100" step="1" value="${st.orchestrator.reserve}" style="width:60px;">
    </div>
    <div class="yro_kv"><label>Cap%</label><img src="/graphic/buildings/storage.png" style="width:16px;height:16px;vertical-align:-3px;">
      <input id="yro_C_cap_v11" type="number" min="1" max="100" step="1" value="${st.orchestrator.cap}" style="width:60px;">
    </div>
    <div class="yro_kv"><label>Surplus Cap%</label><img src="/graphic/buildings/storage.png" style="width:16px;height:16px;vertical-align:-3px;">
      <input id="yro_C_scap_v11" type="number" min="1" max="100" step="1" value="${st.orchestrator.scap}" style="width:60px;">
    </div>
    <button class="yro_btn btn-confirm" id="yro_C_plan_v11">Plan</button>
    <button class="yro_btn btn-warn" id="yro_C_exec_tabs_v11">Execute (Tabs)</button>
    <button class="yro_btn btn-confirm" id="yro_C_exec_auto_v11">Execute (Auto)</button>
  </div>
</div>
    `;
  }

  function enableDrag(panel) {
    var st = Y.state;
    var hdr = Y.qs('#yro_drag_v11');
    if (!hdr || !panel) return;

    var dragging = false;
    var startX = 0, startY = 0;
    var startL = 0, startT = 0;

    Y.on(hdr, 'mousedown', function (e) {
      if (e.target && e.target.id === 'yro_close_v11') return;
      dragging = true;
      startX = e.clientX;
      startY = e.clientY;
      startL = panel.offsetLeft;
      startT = panel.offsetTop;
      e.preventDefault();
    });

    Y.on(document, 'mousemove', function (e) {
      if (!dragging) return;
      var dx = e.clientX - startX;
      var dy = e.clientY - startY;
      panel.style.left = (startL + dx) + 'px';
      panel.style.top = (startT + dy) + 'px';
    });

    Y.on(document, 'mouseup', function () {
      if (!dragging) return;
      dragging = false;
      st.ui.left = panel.offsetLeft;
      st.ui.top = panel.offsetTop;
      Y.saveState();
    });
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

    // sort by name
    rows.sort(function (a, b) { return String(a.name).localeCompare(String(b.name)); });

    var tbl = Y.qs('#yro_t1_tbl_v11');
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
  <th class="yro_right"><img src="/graphic/buildings/storage.png" style="width:16px;height:16px;vertical-align:-3px;" title="Total"> /h</th>
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
<tr>
  <td><b>TOPLAM</b> <span class="yro_small">(${rows.length} köy)</span></td>
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

    var tbl = Y.qs('#yro_t2_tbl_v11');
    if (!tbl) return;

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
    }

    tbl.innerHTML = html;

    // scan time
    var ts = Y.qs('#yro_scan_ts_v11');
    if (ts) ts.textContent = 'Last scan: ' + (Y.state.cache.lastFullScanAt ? new Date(Y.state.cache.lastFullScanAt).toLocaleTimeString() : '-');
  }

  function renderPlanTables(plan, snapshotsById) {
    var metaEl = Y.qs('#yro_plan_meta_v11');
    if (metaEl) {
      metaEl.innerHTML =
        '<b>Mode:</b> ' + String(plan.mode || '-').toUpperCase() + ' | ' +
        '<b>Cap%:</b> ' + plan.meta.cap + ' | ' +
        '<b>Reserve(each):</b> ' + plan.meta.reserve + ' | ' +
        '<b>Surplus Cap%:</b> ' + plan.meta.scap + ' | ' +
        '<b>Shipments:</b> ' + (plan.shipments ? plan.shipments.length : 0);
    }

    // Target summary
    var tTbl = Y.qs('#yro_plan_target_tbl_v11');
    var sTbl = Y.qs('#yro_plan_surplus_tbl_v11');
    var shTbl = Y.qs('#yro_plan_ship_tbl_v11');

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
      if (!ids || !ids.length) return html + `<tr><td colspan="9">-</td></tr>`;
      ids.forEach(function (vid) {
        var r = rowsById[vid];
        if (!r) return;
        html += `
<tr>
  <td><b>${String(r.name)}</b></td>
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

    // Build row maps from plan.summaries
    var tRows = plan.targetSummary || [];
    var sRows = plan.surplusSummary || [];
    var tMap = {}; tRows.forEach(function (r) { tMap[r.id] = r; });
    var sMap = {}; sRows.forEach(function (r) { sMap[r.id] = r; });

    if (tTbl) tTbl.innerHTML = buildSummaryTable('TARGET', plan.targetIds || [], tMap);
    if (sTbl) sTbl.innerHTML = buildSummaryTable('SURPLUS', plan.surplusIds || [], sMap);

    // Shipments table
    if (shTbl) {
      var html2 = `
<tr>
  <th>#</th><th>From</th><th>To</th>
  <th class="yro_right">Wood</th><th class="yro_right">Clay</th><th class="yro_right">Iron</th>
  <th class="yro_right">Total</th><th class="yro_center">Merch</th><th class="yro_center">Tag</th>
</tr>`;
      var ships = plan.shipments || [];
      if (!ships.length) {
        html2 += `<tr><td colspan="9">No shipments.</td></tr>`;
      } else {
        ships.forEach(function (s, idx) {
          var fn = snapshotsById[s.from] ? snapshotsById[s.from].name : String(s.from);
          var tn = snapshotsById[s.to] ? snapshotsById[s.to].name : String(s.to);
          html2 += `
<tr>
  <td class="yro_right">${idx + 1}</td>
  <td><b>${fn}</b></td>
  <td><b>${tn}</b></td>
  <td class="yro_right">${Y.formatTwNumber(s.wood)}</td>
  <td class="yro_right">${Y.formatTwNumber(s.clay)}</td>
  <td class="yro_right">${Y.formatTwNumber(s.iron)}</td>
  <td class="yro_right"><b>${Y.formatTwNumber(s.total)}</b></td>
  <td class="yro_center">${s.merch}</td>
  <td class="yro_center">${s.tag || ''}</td>
</tr>`;
        });
      }
      shTbl.innerHTML = html2;
    }
  }

  Y.ui = {
    buildPanel: buildPanel,
    setMsg: setMsg,
    setProgress: setProgress,
    fillGroupSelects: fillGroupSelects,
    buildModesBox: buildModesBox,
    enableDrag: enableDrag,
    renderTable1: renderTable1,
    renderTable2: renderTable2,
    renderPlanTables: renderPlanTables,
  };

  Y.log('ui module loaded ✅');
})();
