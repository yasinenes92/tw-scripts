(function () {
  'use strict';

  var Y = window.YRO_V10;
  if (!Y) return;

  function injectCSS() {
    var id = 'yro_css_v10';
    if (document.getElementById(id)) return;

    var css = `
#yro_panel_v10{
  position:fixed; z-index:99999;
  width: 920px; max-width: calc(100vw - 20px);
  background:#f4f1e8; border:1px solid #7b6a3a;
  box-shadow:0 8px 22px rgba(0,0,0,.25);
  font-family:Verdana,Arial,sans-serif; font-size:12px;
}
#yro_panel_v10 *{ box-sizing:border-box; }

#yro_panel_v10 .yro_hdr{
  display:flex; align-items:center; justify-content:space-between;
  background: linear-gradient(#c7b27b,#a98a3b);
  color:#fff; padding:6px 8px; border-bottom:1px solid #6a5626;
}
#yro_panel_v10 .yro_ttl{ font-weight:bold; display:flex; align-items:center; gap:6px; }
#yro_panel_v10 .yro_small{ font-size:11px; opacity:.95; }
#yro_panel_v10 .yro_dev{ font-size:11px; opacity:.95; margin-right:6px; }

#yro_panel_v10 .yro_toolbar{
  display:flex; align-items:center; gap:8px;
  padding:8px; border-bottom:1px solid #d2c9b2;
  background:#efe9d8;
}
#yro_panel_v10 .yro_btn{
  padding:4px 8px; border:1px solid #6f5b2a; background:#e7ddb8; cursor:pointer;
  border-radius:4px; font-weight:bold;
}
#yro_panel_v10 .yro_btn:hover{ filter:brightness(1.05); }
#yro_panel_v10 .btn-confirm{ background:#cfe7c8; border-color:#3b6a3b; }
#yro_panel_v10 .yro_progress_outer{
  width:180px; height:10px; border:1px solid #6f5b2a; background:#fff; border-radius:10px; overflow:hidden;
}
#yro_panel_v10 .yro_progress_inner{ height:100%; width:0%; background:#4f8b2d; }

#yro_panel_v10 .yro_msg{
  padding:6px 8px; border-bottom:1px solid #d2c9b2;
  background:#fbf8ef;
}

#yro_panel_v10 #yro_content_v10{ padding:8px; }

#yro_panel_v10 .yro_sec_head{
  display:flex; align-items:center; justify-content:space-between;
  padding:6px 6px; background:#e8dfc6;
  border:1px solid #d2c9b2; border-radius:6px;
  margin-top:8px;
  font-weight:bold;
}
#yro_panel_v10 .yro_sec_controls{
  display:flex; align-items:center; gap:6px; font-weight:normal;
}
#yro_panel_v10 .yro_mini{
  padding:2px 6px; border:1px solid #6f5b2a; background:#fff; cursor:pointer; border-radius:4px;
}
#yro_panel_v10 .yro_scroll{ overflow:auto; border:1px solid #d2c9b2; border-top:none; background:#fff; }

#yro_panel_v10 .yro_table{
  width:100%; border-collapse:collapse;
}
#yro_panel_v10 .yro_table th, #yro_panel_v10 .yro_table td{
  border:1px solid #d2c9b2; padding:4px 6px;
}
#yro_panel_v10 .yro_table th{ background:#f3eddc; position:sticky; top:0; z-index:2; }
#yro_panel_v10 .yro_right{ text-align:right; }
#yro_panel_v10 .yro_center{ text-align:center; }

#yro_panel_v10 .yro_mode_box{
  margin-top:8px; border:1px solid #d2c9b2; border-radius:8px; overflow:hidden; background:#fff;
}
#yro_panel_v10 .yro_mode_row{
  display:flex; gap:10px; padding:8px; border-bottom:1px solid #eee;
  cursor:pointer;
}
#yro_panel_v10 .yro_mode_row:last-child{ border-bottom:none; }
#yro_panel_v10 .yro_mode_row.active{ background:#e7f3e3; }
#yro_panel_v10 .yro_mode_left{ flex:1; }
#yro_panel_v10 .yro_mode_title{ font-weight:bold; margin-bottom:2px; }
#yro_panel_v10 .yro_mode_desc{ color:#333; }
#yro_panel_v10 .yro_mode_controls{
  display:flex; flex-wrap:wrap; gap:8px; align-items:flex-end; justify-content:flex-end;
  min-width: 520px;
}
#yro_panel_v10 .yro_kv{ display:flex; flex-direction:column; gap:2px; }
#yro_panel_v10 .yro_kv label{ font-size:11px; opacity:.9; }
#yro_panel_v10 input[type="number"]{ padding:2px 4px; }
`;

    var st = document.createElement('style');
    st.id = id;
    st.textContent = css;
    document.head.appendChild(st);
  }

  function buildPanel() {
    injectCSS();

    var st = Y.state;

    var root = document.createElement('div');
    root.id = 'yro_panel_v10';
    root.style.left = (st.ui.left || 30) + 'px';
    root.style.top = (st.ui.top || 70) + 'px';

    root.innerHTML = `
<div class="yro_hdr" id="yro_drag_v10" style="cursor:move;">
  <div class="yro_ttl"><span class="icon header wood"></span> Resource Orchestrator <span class="yro_small">(v10)</span></div>
  <div>
    <span class="yro_dev">Developed by controleng</span>
    <button class="yro_btn" id="yro_close_v10">✖</button>
  </div>
</div>

<div class="yro_toolbar">
  <button class="yro_btn btn-confirm" id="yro_load_v10">Yükle / Yenile</button>
  <div class="yro_progress_outer"><div class="yro_progress_inner" id="yro_prog_bar_v10"></div></div>
  <span id="yro_prog_txt_v10" class="yro_small">0/3 - Ready</span>

  <span class="yro_small"><b>Search:</b></span>
  <input type="text" id="yro_search_v10" placeholder="Köy adı…" style="width:180px;">

  <button class="yro_btn btn-confirm" id="yro_copy_bb_v10">Copy BBCode</button>
</div>

<div class="yro_msg" id="yro_msg_v10" style="color: #0a6;">Hazır ✅</div>

<div id="yro_content_v10">
  <div class="yro_sec_head">
    <div>1) Villages — Production (24h) (<span id="yro_t1_title_v10">All villages</span>)</div>
    <div class="yro_sec_controls">
      <button class="yro_mini" id="yro_t1_toggle_v10" title="Minimize/Expand villages">${st.ui.minimized1 ? 'Expand' : 'Minimize'}</button>
      <span class="yro_small"><b>Group:</b></span>
      <select id="yro_t1_group_sel_v10"></select>
    </div>
  </div>
  <div class="yro_scroll" id="yro_t1_wrap_v10" style="${st.ui.minimized1 ? 'display:none;' : ''}">
    <table class="yro_table" id="yro_t1_tbl_v10"></table>
  </div>

  <div class="yro_sec_head">
    <div>2) Villages — Current + Incoming resources (<span id="yro_t2_title_v10">All villages</span>)</div>
    <div class="yro_sec_controls">
      <button class="yro_mini" id="yro_t2_toggle_v10" title="Minimize/Expand villages">${st.ui.minimized2 ? 'Expand' : 'Minimize'}</button>
      <span class="yro_small"><b>Group:</b></span>
      <select id="yro_t2_group_sel_v10"></select>
    </div>
  </div>
  <div class="yro_scroll" id="yro_t2_wrap_v10" style="${st.ui.minimized2 ? 'display:none;' : ''}">
    <table class="yro_table" id="yro_t2_tbl_v10"></table>
  </div>

  <div class="yro_sec_head">
    <div>3) Orchestrator — Tri-balance (wood=clay=iron) + Surplus Routing</div>
    <div class="yro_sec_controls"><span class="yro_small">Mode: satırın boş alanına tıkla.</span></div>
  </div>

  <div class="yro_msg">
    <b>Kısa sözlük:</b>
    <span class="yro_small">
      <b>Tri-balance</b>: hedef köy(ler)de wood=clay=iron olacak şekilde dengeleme.
      <b>Surplus</b>: tri-balance sonrası artan türler (fazla wood/clay/iron) → seçtiğin gruba aktarılır.
      <b>Reserve (each)</b>: sender köylerde <u>her kaynaktan</u> storage*% içeride bırakır.
      <b>Cap%</b>: hedef köylerde her kaynağın max doluluk sınırı (storage*cap%).
    </span>
  </div>

  <div class="yro_mode_box" id="yro_modes_v10"></div>

  <div class="yro_msg" id="yro_plan_meta_v10" style="margin-top:8px;">
    <b>Mode:</b> - |
    <b>Cap%:</b> - |
    <b>Reserve(each):</b> - |
    <b>Surplus Cap%:</b> - |
    <b>Shipments:</b> 0
  </div>

  <div class="yro_scroll">
    <table class="yro_table" id="yro_plan_target_tbl_v10"></table>
  </div>

  <div class="yro_scroll" style="margin-top:8px;">
    <table class="yro_table" id="yro_plan_surplus_tbl_v10"></table>
  </div>

  <div class="yro_scroll" style="margin-top:8px;">
    <table class="yro_table" id="yro_plan_ship_tbl_v10"></table>
  </div>
</div>
`;

    document.body.appendChild(root);
    return root;
  }

  function setMsg(text, color) {
    var el = Y.qs('#yro_msg_v10');
    if (!el) return;
    el.textContent = text;
    if (color) el.style.color = color;
  }

  function setProgress(step, total, text) {
    var bar = Y.qs('#yro_prog_bar_v10');
    var tx = Y.qs('#yro_prog_txt_v10');
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
      groups.forEach(function (g) {
        var o = document.createElement('option');
        o.value = String(g.id);
        o.textContent = g.name;
        if (String(g.id) === String(selected)) o.selected = true;
        sel.appendChild(o);
      });
    }

    fill('#yro_t1_group_sel_v10', st.groups.sel1);
    fill('#yro_t2_group_sel_v10', st.groups.sel2);
  }

  function buildModesBox(groups) {
    var st = Y.state;

    function optionsHTML(selectedId) {
      return groups
        .map(function (g) {
          var sel = String(g.id) === String(selectedId) ? ' selected' : '';
          return '<option value="' + g.id + '"' + sel + '>' + escapeHtml(g.name) + '</option>';
        })
        .join('');
    }

    function escapeHtml(s) {
      return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    }

    var wrap = Y.qs('#yro_modes_v10');
    if (!wrap) return;

    wrap.innerHTML = `
<div class="yro_mode_row ${st.orchestrator.mode === 'balance' ? 'active' : ''}" data-mode="balance">
  <div class="yro_mode_left">
    <div class="yro_mode_title">Mod A: Balance Group</div>
    <div class="yro_mode_desc">Hedef grubu kendi içinde dengeler. Kaynak fazlasını Surplus grubuna gönderir.</div>
  </div>
  <div class="yro_mode_controls">
    <div class="yro_kv"><label title="Dengelenecek hedef grup">Target</label>
      <select id="yro_A_target_v10">${optionsHTML(st.groups.A_target)}</select>
    </div>
    <div class="yro_kv"><label title="Artan kaynakların gideceği grup">Surplus →</label>
      <select id="yro_A_surplus_v10">${optionsHTML(st.groups.A_surplus)}</select>
    </div>
    <div class="yro_kv"><label title="Hedef köylerde max doluluk">Cap%</label><img src="/graphic/buildings/storage.png" style="width:16px;height:16px;vertical-align:-3px;" title="Target cap">
      <input id="yro_A_cap_v10" type="number" min="1" max="100" step="1" value="${st.orchestrator.cap}" style="width:60px;">
    </div>
    <div class="yro_kv"><label title="Surplus grubunda max doluluk">Surplus Cap%</label><img src="/graphic/buildings/storage.png" style="width:16px;height:16px;vertical-align:-3px;" title="Surplus cap">
      <input id="yro_A_scap_v10" type="number" min="1" max="100" step="1" value="${st.orchestrator.scap}" style="width:60px;">
    </div>
    <button class="yro_btn btn-confirm" id="yro_A_plan_v10">Plan</button>
    <button class="yro_btn btn-confirm" id="yro_A_exec_v10">Execute</button>
  </div>
</div>

<div class="yro_mode_row ${st.orchestrator.mode === 'push' ? 'active' : ''}" data-mode="push">
  <div class="yro_mode_left">
    <div class="yro_mode_title">Mod B: Push / Feed</div>
    <div class="yro_mode_desc">Sender → Target besleme (tri-balance). Artanı Surplus’a yollar.</div>
  </div>
  <div class="yro_mode_controls">
    <div class="yro_kv"><label title="Kaynağı gönderen grup">Sender</label>
      <select id="yro_B_sender_v10">${optionsHTML(st.groups.B_sender)}</select>
    </div>
    <div class="yro_kv"><label title="Dengelenecek hedef grup">Target</label>
      <select id="yro_B_target_v10">${optionsHTML(st.groups.B_target)}</select>
    </div>
    <div class="yro_kv"><label title="Artan kaynakların gideceği grup">Surplus →</label>
      <select id="yro_B_surplus_v10">${optionsHTML(st.groups.B_surplus)}</select>
    </div>
    <div class="yro_kv"><label title="Sender köylerde her kaynaktan storage*% içeride bırakır">Reserve (each)</label><img src="/graphic/buildings/storage.png" style="width:16px;height:16px;vertical-align:-3px;" title="Reserve">
      <input id="yro_B_reserve_v10" type="number" min="0" max="100" step="1" value="${st.orchestrator.reserve}" style="width:60px;">
      <small>%</small>
    </div>
    <div class="yro_kv"><label title="Hedef köylerde max doluluk">Cap%</label><img src="/graphic/buildings/storage.png" style="width:16px;height:16px;vertical-align:-3px;" title="Target cap">
      <input id="yro_B_cap_v10" type="number" min="1" max="100" step="1" value="${st.orchestrator.cap}" style="width:60px;">
    </div>
    <div class="yro_kv"><label title="Surplus grubunda max doluluk">Surplus Cap%</label><img src="/graphic/buildings/storage.png" style="width:16px;height:16px;vertical-align:-3px;" title="Surplus cap">
      <input id="yro_B_scap_v10" type="number" min="1" max="100" step="1" value="${st.orchestrator.scap}" style="width:60px;">
    </div>
    <button class="yro_btn btn-confirm" id="yro_B_plan_v10">Plan</button>
    <button class="yro_btn btn-confirm" id="yro_B_exec_v10">Execute</button>
  </div>
</div>

<div class="yro_mode_row ${st.orchestrator.mode === 'funnel' ? 'active' : ''}" data-mode="funnel">
  <div class="yro_mode_left">
    <div class="yro_mode_title">Mod C: Funnel / Hoard</div>
    <div class="yro_mode_desc">Target dışındaki tüm köylerden hedefe akıtma (coin vb.).</div>
  </div>
  <div class="yro_mode_controls">
    <div class="yro_kv"><label title="Biriktirilecek hedef grup">Target</label>
      <select id="yro_C_target_v10">${optionsHTML(st.groups.C_target)}</select>
    </div>
    <div class="yro_kv"><label title="Artan kaynakların gideceği grup">Surplus →</label>
      <select id="yro_C_surplus_v10">${optionsHTML(st.groups.C_surplus)}</select>
    </div>
    <div class="yro_kv"><label title="Sender köylerde her kaynaktan storage*% içeride bırakır">Reserve (each)</label><img src="/graphic/buildings/storage.png" style="width:16px;height:16px;vertical-align:-3px;" title="Reserve">
      <input id="yro_C_reserve_v10" type="number" min="0" max="100" step="1" value="${st.orchestrator.reserve}" style="width:60px;">
      <small>%</small>
    </div>
    <div class="yro_kv"><label title="Hedef köylerde max doluluk">Cap%</label><img src="/graphic/buildings/storage.png" style="width:16px;height:16px;vertical-align:-3px;" title="Target cap">
      <input id="yro_C_cap_v10" type="number" min="1" max="100" step="1" value="${st.orchestrator.cap}" style="width:60px;">
    </div>
    <div class="yro_kv"><label title="Surplus grubunda max doluluk">Surplus Cap%</label><img src="/graphic/buildings/storage.png" style="width:16px;height:16px;vertical-align:-3px;" title="Surplus cap">
      <input id="yro_C_scap_v10" type="number" min="1" max="100" step="1" value="${st.orchestrator.scap}" style="width:60px;">
    </div>
    <button class="yro_btn btn-confirm" id="yro_C_plan_v10">Plan</button>
    <button class="yro_btn btn-confirm" id="yro_C_exec_v10">Execute</button>
  </div>
</div>
`;
  }

  function renderTable1(rows) {
    var st = Y.state;
    var q = (st.ui.search || '').toLowerCase();

    var list = rows || [];
    if (q) {
      list = list.filter(function (v) {
        return String(v.name).toLowerCase().indexOf(q) >= 0;
      });
    }

    var tbl = Y.qs('#yro_t1_tbl_v10');
    if (!tbl) return;

    var sumW = 0, sumC = 0, sumI = 0, sumT = 0;

    var body = `
<tr>
  <th>Village</th>
  <th class="yro_right">Points</th>
  <th class="yro_right"><span class="icon header wood"></span> Wood (24h)</th>
  <th class="yro_right"><span class="icon header stone"></span> Clay (24h)</th>
  <th class="yro_right"><span class="icon header iron"></span> Iron (24h)</th>
  <th class="yro_right"><img src="/graphic/buildings/storage.png" style="width:16px;height:16px;vertical-align:-3px;" title="Total"> Total (24h)</th>
</tr>
`;

    if (!list.length) {
      body += `<tr><td colspan="6">No villages.</td></tr>`;
    } else {
      list.forEach(function (v, idx) {
        sumW += v.prod24.wood; sumC += v.prod24.clay; sumI += v.prod24.iron; sumT += v.prod24.total;
        var href = '/game.php?village=' + v.id + '&screen=overview';
        body += `
<tr>
  <td><a href="${href}" target="_blank" rel="noopener noreferrer"><b>${String(v.name)}</b></a></td>
  <td class="yro_right">${Y.formatTwNumber(v.points)}</td>
  <td class="yro_right"><b title="Per hour: ${Y.formatTwNumber(v.prodH.wood)}">${Y.formatTwNumber(v.prod24.wood)}</b></td>
  <td class="yro_right"><b title="Per hour: ${Y.formatTwNumber(v.prodH.clay)}">${Y.formatTwNumber(v.prod24.clay)}</b></td>
  <td class="yro_right"><b title="Per hour: ${Y.formatTwNumber(v.prodH.iron)}">${Y.formatTwNumber(v.prod24.iron)}</b></td>
  <td class="yro_right"><b>${Y.formatTwNumber(v.prod24.total)}</b></td>
</tr>`;
      });

      body += `
<tr>
  <td colspan="2"><b>TOPLAM</b> <span class="yro_small">(${list.length} köy)</span></td>
  <td class="yro_right"><b>${Y.formatTwNumber(sumW)}</b></td>
  <td class="yro_right"><b>${Y.formatTwNumber(sumC)}</b></td>
  <td class="yro_right"><b>${Y.formatTwNumber(sumI)}</b></td>
  <td class="yro_right"><b>${Y.formatTwNumber(sumT)}</b></td>
</tr>`;
    }

    tbl.innerHTML = body;
  }

  function renderTable2(rows, incomingAllByVillage, incomingExternalByVillage) {
    var st = Y.state;
    var q = (st.ui.search || '').toLowerCase();
    var list = rows || [];

    if (q) {
      list = list.filter(function (v) {
        return String(v.name).toLowerCase().indexOf(q) >= 0;
      });
    }

    var tbl = Y.qs('#yro_t2_tbl_v10');
    if (!tbl) return;

    var sumBase = { wood: 0, clay: 0, iron: 0, total: 0 };
    var sumIncExt = { wood: 0, clay: 0, iron: 0, total: 0 };
    var sumAllShown = { wood: 0, clay: 0, iron: 0, total: 0 };

    var body = `
<tr>
  <th>Village</th>
  <th class="yro_right">Points</th>
  <th class="yro_right"><span class="icon header ressources"></span> Storage</th>
  <th class="yro_center"><img src="/graphic/buildings/market.png" style="width:16px;height:16px;vertical-align:-3px;" title="Merchants"> Merch</th>
  <th class="yro_right"><span class="icon header wood"></span> Wood</th>
  <th class="yro_right"><span class="icon header stone"></span> Clay</th>
  <th class="yro_right"><span class="icon header iron"></span> Iron</th>
  <th class="yro_right"><img src="/graphic/buildings/storage.png" style="width:16px;height:16px;vertical-align:-3px;" title="Total"> Total</th>
</tr>
`;

    if (!list.length) {
      body += `<tr><td colspan="8">No villages.</td></tr>`;
    } else {
      list.forEach(function (v) {
        var incAll = incomingAllByVillage && incomingAllByVillage[v.id] ? incomingAllByVillage[v.id] : { wood: 0, clay: 0, iron: 0, total: 0 };
        var incExt = incomingExternalByVillage && incomingExternalByVillage[v.id] ? incomingExternalByVillage[v.id] : { wood: 0, clay: 0, iron: 0, total: 0 };

        var base = v.res || { wood: 0, clay: 0, iron: 0, total: 0 };
        var shown = { wood: base.wood + incAll.wood, clay: base.clay + incAll.clay, iron: base.iron + incAll.iron };
        shown.total = shown.wood + shown.clay + shown.iron;

        sumBase.wood += base.wood; sumBase.clay += base.clay; sumBase.iron += base.iron; sumBase.total += base.total;
        sumIncExt.wood += incExt.wood; sumIncExt.clay += incExt.clay; sumIncExt.iron += incExt.iron; sumIncExt.total += incExt.total;
        sumAllShown.wood += shown.wood; sumAllShown.clay += shown.clay; sumAllShown.iron += shown.iron; sumAllShown.total += shown.total;

        var href = '/game.php?village=' + v.id + '&screen=overview';
        body += `
<tr>
  <td><a href="${href}" target="_blank" rel="noopener noreferrer"><b>${String(v.name)}</b></a></td>
  <td class="yro_right">${Y.formatTwNumber(v.points || 0)}</td>
  <td class="yro_right">${Y.formatTwNumber(v.storage || 0)}</td>
  <td class="yro_center">${(v.merch ? (v.merch.used + '/' + v.merch.total) : '0/0')}</td>
  <td class="yro_right"><b title="Base: ${Y.formatTwNumber(base.wood)} | Incoming: ${Y.formatTwNumber(incAll.wood)}">${Y.formatTwNumber(shown.wood)}</b></td>
  <td class="yro_right"><b title="Base: ${Y.formatTwNumber(base.clay)} | Incoming: ${Y.formatTwNumber(incAll.clay)}">${Y.formatTwNumber(shown.clay)}</b></td>
  <td class="yro_right"><b title="Base: ${Y.formatTwNumber(base.iron)} | Incoming: ${Y.formatTwNumber(incAll.iron)}">${Y.formatTwNumber(shown.iron)}</b></td>
  <td class="yro_right"><b title="Base: ${Y.formatTwNumber(base.total)} | Incoming: ${Y.formatTwNumber(incAll.total)}">${Y.formatTwNumber(shown.total)}</b></td>
</tr>`;
      });

      // totals row uses EXTERNAL incoming (so internal transfers won't inflate)
      var totalW = sumBase.wood + sumIncExt.wood;
      var totalC = sumBase.clay + sumIncExt.clay;
      var totalI = sumBase.iron + sumIncExt.iron;
      var totalT = totalW + totalC + totalI;

      body += `
<tr>
  <td colspan="4"><b>TOPLAM</b> <span class="yro_small">(${list.length} köy)</span></td>
  <td class="yro_right"><b title="Base: ${Y.formatTwNumber(sumBase.wood)} | Incoming(ext): ${Y.formatTwNumber(sumIncExt.wood)}">${Y.formatTwNumber(totalW)}</b></td>
  <td class="yro_right"><b title="Base: ${Y.formatTwNumber(sumBase.clay)} | Incoming(ext): ${Y.formatTwNumber(sumIncExt.clay)}">${Y.formatTwNumber(totalC)}</b></td>
  <td class="yro_right"><b title="Base: ${Y.formatTwNumber(sumBase.iron)} | Incoming(ext): ${Y.formatTwNumber(sumIncExt.iron)}">${Y.formatTwNumber(totalI)}</b></td>
  <td class="yro_right"><b title="Base: ${Y.formatTwNumber(sumBase.total)} | Incoming(ext): ${Y.formatTwNumber(sumIncExt.total)}">${Y.formatTwNumber(totalT)}</b></td>
</tr>
<tr>
  <td colspan="4"><b>ORTALAMA</b></td>
  <td class="yro_right"><b>${Y.formatTwNumber(Math.floor(totalW / Math.max(1, list.length)))}</b></td>
  <td class="yro_right"><b>${Y.formatTwNumber(Math.floor(totalC / Math.max(1, list.length)))}</b></td>
  <td class="yro_right"><b>${Y.formatTwNumber(Math.floor(totalI / Math.max(1, list.length)))}</b></td>
  <td class="yro_right"><b>${Y.formatTwNumber(Math.floor(totalT / Math.max(1, list.length)))}</b></td>
</tr>
`;
    }

    tbl.innerHTML = body;
  }

  function renderPlanTables(allById, plan, targetIds, surplusIds) {
    var shipments = plan.shipments || [];

    // meta
    var meta = Y.qs('#yro_plan_meta_v10');
    if (meta) {
      meta.innerHTML =
        '<b>Mode:</b> ' + String(plan.mode || '-').toUpperCase() + ' | ' +
        '<b>Cap%:</b> ' + (plan.meta.cap || '-') + '% | ' +
        '<b>Reserve(each):</b> ' + (plan.meta.reserve || 0) + '% | ' +
        '<b>Surplus Cap%:</b> ' + (plan.meta.scap || '-') + '% | ' +
        '<b>Shipments:</b> ' + shipments.length;
    }

    var sum = Y.compute.summarizePlan(shipments, allById);

    // Target table
    var tTbl = Y.qs('#yro_plan_target_tbl_v10');
    if (tTbl) {
      var rows = [];
      (targetIds || []).forEach(function (vid) {
        var r = sum.rowFor(vid);
        if (r) rows.push(r);
      });

      var html = `
<tbody>
<tr><th colspan="15">Target — Before / Sent / Received / After (Arrived)</th></tr>
<tr>
  <th>Village</th><th class="yro_right"><span class="icon header ressources"></span> Storage</th><th class="yro_right">Cap</th>
  <th class="yro_right"><span class="icon header wood"></span> Before</th><th class="yro_right"><span class="icon header stone"></span> Before</th><th class="yro_right"><span class="icon header iron"></span> Before</th>
  <th class="yro_right"><span class="icon header wood"></span> Sent</th><th class="yro_right"><span class="icon header stone"></span> Sent</th><th class="yro_right"><span class="icon header iron"></span> Sent</th>
  <th class="yro_right"><span class="icon header wood"></span> Recv</th><th class="yro_right"><span class="icon header stone"></span> Recv</th><th class="yro_right"><span class="icon header iron"></span> Recv</th>
  <th class="yro_right"><span class="icon header wood"></span> After</th><th class="yro_right"><span class="icon header stone"></span> After</th><th class="yro_right"><span class="icon header iron"></span> After</th>
</tr>
`;

      if (!rows.length) {
        html += `<tr><td colspan="15">No target villages.</td></tr>`;
      } else {
        var capPct = Y.safeInt(plan.meta.cap, 80);
        rows.forEach(function (r) {
          var cap = Math.floor((r.storage || 0) * (capPct / 100));
          html += `
<tr>
  <td><b>${r.name}</b></td>
  <td class="yro_right">${Y.formatTwNumber(r.storage || 0)}</td>
  <td class="yro_right">${Y.formatTwNumber(cap)}</td>
  <td class="yro_right">${Y.formatTwNumber(r.before.wood)}</td>
  <td class="yro_right">${Y.formatTwNumber(r.before.clay)}</td>
  <td class="yro_right">${Y.formatTwNumber(r.before.iron)}</td>
  <td class="yro_right">${Y.formatTwNumber(r.sent.wood)}</td>
  <td class="yro_right">${Y.formatTwNumber(r.sent.clay)}</td>
  <td class="yro_right">${Y.formatTwNumber(r.sent.iron)}</td>
  <td class="yro_right">${Y.formatTwNumber(r.recv.wood)}</td>
  <td class="yro_right">${Y.formatTwNumber(r.recv.clay)}</td>
  <td class="yro_right">${Y.formatTwNumber(r.recv.iron)}</td>
  <td class="yro_right"><b>${Y.formatTwNumber(r.after.wood)}</b></td>
  <td class="yro_right"><b>${Y.formatTwNumber(r.after.clay)}</b></td>
  <td class="yro_right"><b>${Y.formatTwNumber(r.after.iron)}</b></td>
</tr>`;
        });
      }
      html += `</tbody>`;
      tTbl.innerHTML = html;
    }

    // Surplus table
    var sTbl = Y.qs('#yro_plan_surplus_tbl_v10');
    if (sTbl) {
      var rows2 = [];
      (surplusIds || []).forEach(function (vid) {
        var r2 = sum.rowFor(vid);
        if (r2) rows2.push(r2);
      });

      var html2 = `
<tbody>
<tr><th colspan="14">Surplus Destination — Before / Sent / Received / After</th></tr>
<tr>
  <th>Village</th><th class="yro_right"><span class="icon header ressources"></span> Storage</th>
  <th class="yro_right"><span class="icon header wood"></span> Before</th><th class="yro_right"><span class="icon header stone"></span> Before</th><th class="yro_right"><span class="icon header iron"></span> Before</th>
  <th class="yro_right"><span class="icon header wood"></span> Sent</th><th class="yro_right"><span class="icon header stone"></span> Sent</th><th class="yro_right"><span class="icon header iron"></span> Sent</th>
  <th class="yro_right"><span class="icon header wood"></span> Recv</th><th class="yro_right"><span class="icon header stone"></span> Recv</th><th class="yro_right"><span class="icon header iron"></span> Recv</th>
  <th class="yro_right"><span class="icon header wood"></span> After</th><th class="yro_right"><span class="icon header stone"></span> After</th><th class="yro_right"><span class="icon header iron"></span> After</th>
</tr>
`;

      if (!rows2.length) {
        html2 += `<tr><td colspan="14">No surplus villages.</td></tr>`;
      } else {
        rows2.forEach(function (r) {
          html2 += `
<tr>
  <td><b>${r.name}</b></td>
  <td class="yro_right">${Y.formatTwNumber(r.storage || 0)}</td>
  <td class="yro_right">${Y.formatTwNumber(r.before.wood)}</td>
  <td class="yro_right">${Y.formatTwNumber(r.before.clay)}</td>
  <td class="yro_right">${Y.formatTwNumber(r.before.iron)}</td>
  <td class="yro_right">${Y.formatTwNumber(r.sent.wood)}</td>
  <td class="yro_right">${Y.formatTwNumber(r.sent.clay)}</td>
  <td class="yro_right">${Y.formatTwNumber(r.sent.iron)}</td>
  <td class="yro_right">${Y.formatTwNumber(r.recv.wood)}</td>
  <td class="yro_right">${Y.formatTwNumber(r.recv.clay)}</td>
  <td class="yro_right">${Y.formatTwNumber(r.recv.iron)}</td>
  <td class="yro_right"><b>${Y.formatTwNumber(r.after.wood)}</b></td>
  <td class="yro_right"><b>${Y.formatTwNumber(r.after.clay)}</b></td>
  <td class="yro_right"><b>${Y.formatTwNumber(r.after.iron)}</b></td>
</tr>`;
        });
      }

      html2 += `</tbody>`;
      sTbl.innerHTML = html2;
    }

    // Shipment plan table
    var shTbl = Y.qs('#yro_plan_ship_tbl_v10');
    if (shTbl) {
      var html3 = `
<tbody>
<tr><th colspan="9">Shipment Plan</th></tr>
<tr>
  <th class="yro_right">#</th><th>From</th><th>To</th>
  <th class="yro_right"><span class="icon header wood"></span></th>
  <th class="yro_right"><span class="icon header stone"></span></th>
  <th class="yro_right"><span class="icon header iron"></span></th>
  <th class="yro_right">Total</th><th class="yro_center">Merch</th><th class="yro_center">Tag</th>
</tr>
`;
      if (!shipments.length) {
        html3 += `<tr><td colspan="9">No shipments.</td></tr>`;
      } else {
        shipments.forEach(function (s, idx) {
          var fromN = allById[s.from] ? allById[s.from].name : String(s.from);
          var toN = allById[s.to] ? allById[s.to].name : String(s.to);
          html3 += `
<tr>
  <td class="yro_right">${idx + 1}</td>
  <td><b>${fromN}</b></td>
  <td><b>${toN}</b></td>
  <td class="yro_right">${Y.formatTwNumber(s.wood)}</td>
  <td class="yro_right">${Y.formatTwNumber(s.clay)}</td>
  <td class="yro_right">${Y.formatTwNumber(s.iron)}</td>
  <td class="yro_right"><b>${Y.formatTwNumber(s.total)}</b></td>
  <td class="yro_center">${s.merch || Math.ceil(s.total / 1000)}</td>
  <td class="yro_center">${s.tag || ''}</td>
</tr>`;
        });
      }
      html3 += `</tbody>`;
      shTbl.innerHTML = html3;
    }
  }

  function enableDrag(panel) {
    var st = Y.state;
    var hdr = Y.qs('#yro_drag_v10');
    if (!hdr || !panel) return;

    var dragging = false;
    var startX = 0, startY = 0;
    var startL = 0, startT = 0;

    hdr.addEventListener('mousedown', function (e) {
      if (e.target && e.target.id === 'yro_close_v10') return;
      dragging = true;
      startX = e.clientX;
      startY = e.clientY;
      startL = panel.offsetLeft;
      startT = panel.offsetTop;
      e.preventDefault();
    });

    document.addEventListener('mousemove', function (e) {
      if (!dragging) return;
      var dx = e.clientX - startX;
      var dy = e.clientY - startY;
      panel.style.left = (startL + dx) + 'px';
      panel.style.top = (startT + dy) + 'px';
    });

    document.addEventListener('mouseup', function () {
      if (!dragging) return;
      dragging = false;
      st.ui.left = panel.offsetLeft;
      st.ui.top = panel.offsetTop;
      Y.saveState();
    });
  }

  Y.ui = {
    buildPanel: buildPanel,
    setMsg: setMsg,
    setProgress: setProgress,
    fillGroupSelects: fillGroupSelects,
    buildModesBox: buildModesBox,
    renderTable1: renderTable1,
    renderTable2: renderTable2,
    renderPlanTables: renderPlanTables,
    enableDrag: enableDrag,
  };

  Y.log('ui module loaded ✅');
})();
