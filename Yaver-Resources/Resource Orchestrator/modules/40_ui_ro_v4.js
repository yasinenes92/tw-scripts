(function () {
  "use strict";

  var Y = window.__YAVER_RESOURCE_ORCHESTRATOR_V4__;
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
#${Y.cfg.PANEL_ID} .yro_mode_left{
  width:220px;
}
#${Y.cfg.PANEL_ID} .yro_mode_title{
  font-weight:bold;
}
#${Y.cfg.PANEL_ID} .yro_mode_desc{
  font-size:11px;
  color:#444;
  margin-top:2px;
}
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
}
#${Y.cfg.PANEL_ID} .yro_kv small{
  font-size:10px;
  color:#666;
}
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
<div class="yro_hdr" id="yro_drag_v4" style="cursor:move;">
  <div class="yro_ttl">
    ${Y.util.iconSpan("wood")} Resource Orchestrator <span class="yro_small">(v4)</span>
  </div>
  <div>
    <span class="yro_dev">Developed by controleng</span>
    <button class="yro_btn" id="yro_close_v4">✖</button>
  </div>
</div>

<div class="yro_toolbar">
  <button class="yro_btn btn-confirm" id="yro_load_v4">Yükle / Yenile</button>
  <div class="yro_progress_outer"><div class="yro_progress_inner" id="yro_prog_bar_v4"></div></div>
  <span id="yro_prog_txt_v4" class="yro_small">Bekleniyor…</span>

  <span class="yro_small"><b>Search:</b></span>
  <input type="text" id="yro_search_v4" placeholder="Köy adı…" />

  <button class="yro_btn" id="yro_toggle_v4">Minimize villages</button>
</div>

<div class="yro_msg" id="yro_msg_v4">
  Kaynak: <b>overview_villages → prod</b> + <b>overview_villages → trader</b> (incoming resource transports).
</div>

<div id="yro_content_v4"></div>
`;

    document.body.appendChild(el);

    document.getElementById("yro_close_v4").onclick = function () { Y.destroy(); };

    // drag
    var isDragging = false, startX = 0, startY = 0, initL = 0, initT = 0;
    var handle = document.getElementById("yro_drag_v4");
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

    document.getElementById("yro_load_v4").onclick = function () {
      if (typeof Y.main.loadAndRender === "function") Y.main.loadAndRender(true);
    };

    document.getElementById("yro_toggle_v4").onclick = function () {
      Y.state.table1.villagesCollapsed = !Y.state.table1.villagesCollapsed;
      Y.ui.render();
    };

    var inp = document.getElementById("yro_search_v4");
    inp.oninput = function () {
      Y.state.ui.search = inp.value || "";
      if (Y.state.computed.t1) {
        Y.compute.runTable1();
        Y.ui.render();
      }
    };
  }

  function setMsg(html, kind) {
    var el = document.getElementById("yro_msg_v4");
    if (!el) return;
    el.innerHTML = html;
    el.style.color = kind === "err" ? "red" : (kind === "ok" ? "green" : "black");
  }

  function setProgress(done, total, msg) {
    var bar = document.getElementById("yro_prog_bar_v4");
    var txt = document.getElementById("yro_prog_txt_v4");
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

  function cellEff(inc, eff, base) {
    var tip = ' title="Base: ' + Y.util.n(base) + ' | Incoming: ' + Y.util.n(inc) + '"';
    if (inc > 0) return '<span class="yro_small"' + tip + '>(+ ' + Y.util.n(inc) + ')</span> <b>' + Y.util.n(eff) + "</b>";
    return "<b" + tip + ">" + Y.util.n(eff) + "</b>";
  }

  function buildTable1() {
    var c = Y.state.computed.t1;
    if (!c) return `<div class="yro_msg">Tablo 1 için veri yok.</div>`;

    var rows = c.rows;
    var titleLeft = `1) Villages — Current + Incoming resources (${c.groupName})`;

    var opts = (Y.state.groups || []).map(function (g) {
      var sel = g.id === (Y.state.table1.groupId || 0) ? "selected" : "";
      return `<option value="${g.id}" ${sel}>${g.name}</option>`;
    }).join("");

    var head = `
<div class="yro_sec_head">
  <div>${titleLeft}</div>
  <div class="yro_sec_controls">
    <span class="yro_small"><b>Group:</b></span>
    <select id="yro_t1_group_sel_v4">${opts}</select>
  </div>
</div>`;

    function rowHtml(r) {
      var incTotal = r.inc.wood + r.inc.stone + r.inc.iron;
      return `
<tr>
  <td><a href="/game.php?village=${r.id}&screen=overview" target="_blank" rel="noopener noreferrer"><b>${r.name}</b></a></td>
  <td class="yro_right">${Y.util.n(r.points)}</td>
  <td class="yro_right">${Y.util.n(r.storage)}</td>
  <td class="yro_center"><b>${Y.util.n(r.merchAvail)}/${Y.util.n(r.merchTotal)}</b></td>
  <td class="yro_right">${cellEff(r.inc.wood, r.eff.wood, r.base.wood)}</td>
  <td class="yro_right">${cellEff(r.inc.stone, r.eff.stone, r.base.stone)}</td>
  <td class="yro_right">${cellEff(r.inc.iron, r.eff.iron, r.base.iron)}</td>
  <td class="yro_right">${cellEff(incTotal, r.eff.total, r.base.wood + r.base.stone + r.base.iron)}</td>
</tr>`;
    }

    var body = "";
    if (Y.state.table1.villagesCollapsed) {
      body = `
<tr class="yro_linkrow" id="yro_t1_expand_row_v4">
  <td colspan="8">Expand ${rows.length} villages</td>
</tr>`;
    } else {
      body = rows.map(rowHtml).join("");
    }

    var t = c.totals;
    var a = c.avgs;

    var totalsRow = `
<tr>
  <td colspan="4"><b>TOPLAM</b> <span class="yro_small">(${t.count} köy)</span></td>
  <td class="yro_right">${cellEff(t.incWood, t.wood, t.wood - t.incWood)}</td>
  <td class="yro_right">${cellEff(t.incStone, t.stone, t.stone - t.incStone)}</td>
  <td class="yro_right">${cellEff(t.incIron, t.iron, t.iron - t.incIron)}</td>
  <td class="yro_right">${cellEff(t.incTotal, t.total, t.total - t.incTotal)}</td>
</tr>`;

    var avgRow = `
<tr>
  <td colspan="4"><b>ORTALAMA</b></td>
  <td class="yro_right">${cellEff(a.incWood, a.wood, Math.max(0, a.wood - a.incWood))}</td>
  <td class="yro_right">${cellEff(a.incStone, a.stone, Math.max(0, a.stone - a.incStone))}</td>
  <td class="yro_right">${cellEff(a.incIron, a.iron, Math.max(0, a.iron - a.incIron))}</td>
  <td class="yro_right">${cellEff(a.incTotal, a.total, Math.max(0, a.total - a.incTotal))}</td>
</tr>`;

    return head + `
<div class="yro_scroll">
  <table class="yro_table">
    <tr>
      <th>Village</th>
      <th class="yro_right">Points</th>
      <th class="yro_right">${Y.util.iconSpan("ressources")} Storage</th>
      <th class="yro_center">${Y.util.iconImg("/graphic/buildings/market.png","Merchants")} Merch</th>
      <th class="yro_right">${Y.util.iconSpan("wood")} Wood</th>
      <th class="yro_right">${Y.util.iconSpan("stone")} Clay</th>
      <th class="yro_right">${Y.util.iconSpan("iron")} Iron</th>
      <th class="yro_right">${Y.util.iconImg("/graphic/buildings/storage.png","Total")} Total</th>
    </tr>
    ${body || `<tr><td colspan="8">No villages found.</td></tr>`}
    ${totalsRow}
    ${avgRow}
  </table>
</div>`;
  }

  function buildModeRow(modeKey, title, desc, controlsHtml) {
    var active = (Y.state.table2.mode === modeKey) ? "active" : "";
    return `
<div class="yro_mode_row ${active}" data-mode="${modeKey}">
  <div class="yro_mode_left">
    <div class="yro_mode_title">${title}</div>
    <div class="yro_mode_desc">${desc}</div>
  </div>
  <div class="yro_mode_controls">
    ${controlsHtml}
  </div>
</div>`;
  }

  function groupOptions(selectedId) {
    return (Y.state.groups || []).map(function (x) {
      var sel = x.id === selectedId ? "selected" : "";
      return `<option value="${x.id}" ${sel}>${x.name}</option>`;
    }).join("");
  }

  function buildTable2() {
    var A = Y.state.table2.A;
    var B = Y.state.table2.B;
    var C = Y.state.table2.C;

    var info = `
<div class="yro_msg">
  <b>Kısa sözlük:</b>
  <span class="yro_small">
    <b>Tri-balance</b>: hedef köy(ler)de wood=clay=iron olacak şekilde dengeleme.
    <b>Surplus</b>: tri-balance sonrası artan türler (fazla wood/clay/iron) → seçtiğin gruba aktarılır.
    <b>Reserve (each)</b>: gönderici köylerde <u>her kaynak türünden</u> storage*% kadar içeride bırakır.
    <b>Cap%</b>: hedef köylerde her tür için maksimum doluluk (storage*cap%).
  </span>
</div>`;

    var rowA = buildModeRow(
      "balance",
      "Mod A: Balance Group",
      "Tek bir hedef grubu kendi içinde tri-balance eder. Artan kaynakları Surplus grubuna yollar.",
      `
<div class="yro_kv"><label>Target</label>
  <select id="yro_A_target">${groupOptions(A.targetGroupId)}</select>
</div>
<div class="yro_kv"><label>Surplus →</label>
  <select id="yro_A_surplus">${groupOptions(A.surplusGroupId)}</select>
</div>
<div class="yro_kv"><label>Cap%</label>${Y.util.iconImg("/graphic/buildings/storage.png","Target cap")}
  <input id="yro_A_cap" type="number" min="1" max="100" step="1" value="${A.capPct}" style="width:60px;" />
  <small>(default 80)</small>
</div>
<div class="yro_kv"><label>Surplus Cap%</label>${Y.util.iconImg("/graphic/buildings/storage.png","Surplus cap")}
  <input id="yro_A_scap" type="number" min="1" max="100" step="1" value="${A.surplusCapPct}" style="width:60px;" />
</div>
<button class="yro_btn btn-confirm" id="yro_A_plan">Plan</button>
<button class="yro_btn btn-confirm" id="yro_A_exec">Execute</button>
`
    );

    var rowB = buildModeRow(
      "push",
      "Mod B: Push / Feed",
      "Sender grubundan Target grubuna kaynak iter (tri-balance). Artanı Surplus grubuna yollar.",
      `
<div class="yro_kv"><label>Sender</label>
  <select id="yro_B_sender">${groupOptions(B.senderGroupId)}</select>
</div>
<div class="yro_kv"><label>Target</label>
  <select id="yro_B_target">${groupOptions(B.targetGroupId)}</select>
</div>
<div class="yro_kv"><label>Surplus →</label>
  <select id="yro_B_surplus">${groupOptions(B.surplusGroupId)}</select>
</div>
<div class="yro_kv"><label>Reserve (each)</label>${Y.util.iconImg("/graphic/buildings/storage.png","Reserve each")}
  <input id="yro_B_reserve" type="number" min="0" max="100" step="1" value="${B.reservePct}" style="width:60px;" />
  <small>%</small>
</div>
<div class="yro_kv"><label>Cap%</label>${Y.util.iconImg("/graphic/buildings/storage.png","Target cap")}
  <input id="yro_B_cap" type="number" min="1" max="100" step="1" value="${B.capPct}" style="width:60px;" />
</div>
<div class="yro_kv"><label>Surplus Cap%</label>${Y.util.iconImg("/graphic/buildings/storage.png","Surplus cap")}
  <input id="yro_B_scap" type="number" min="1" max="100" step="1" value="${B.surplusCapPct}" style="width:60px;" />
</div>
<button class="yro_btn btn-confirm" id="yro_B_plan">Plan</button>
<button class="yro_btn btn-confirm" id="yro_B_exec">Execute</button>
`
    );

    var rowC = buildModeRow(
      "funnel",
      "Mod C: Funnel / Hoard",
      "Target dışındaki tüm köylerden (All except Target) hedefe akıtır. Coin gibi depolamak için.",
      `
<div class="yro_kv"><label>Sender</label>
  <b class="yro_small">All except Target</b>
</div>
<div class="yro_kv"><label>Target</label>
  <select id="yro_C_target">${groupOptions(C.targetGroupId)}</select>
</div>
<div class="yro_kv"><label>Surplus →</label>
  <select id="yro_C_surplus">${groupOptions(C.surplusGroupId)}</select>
</div>
<div class="yro_kv"><label>Reserve (each)</label>${Y.util.iconImg("/graphic/buildings/storage.png","Reserve each")}
  <input id="yro_C_reserve" type="number" min="0" max="100" step="1" value="${C.reservePct}" style="width:60px;" />
  <small>%</small>
</div>
<div class="yro_kv"><label>Cap%</label>${Y.util.iconImg("/graphic/buildings/storage.png","Target cap")}
  <input id="yro_C_cap" type="number" min="1" max="100" step="1" value="${C.capPct}" style="width:60px;" />
</div>
<div class="yro_kv"><label>Surplus Cap%</label>${Y.util.iconImg("/graphic/buildings/storage.png","Surplus cap")}
  <input id="yro_C_scap" type="number" min="1" max="100" step="1" value="${C.surplusCapPct}" style="width:60px;" />
</div>
<button class="yro_btn btn-confirm" id="yro_C_plan">Plan</button>
<button class="yro_btn btn-confirm" id="yro_C_exec">Execute</button>
`
    );

    var header = `
<div class="yro_sec_head">
  <div>2) Orchestrator — Tri-balance (wood=clay=iron) + Surplus Routing</div>
  <div class="yro_sec_controls">
    <span class="yro_small">Mode seçimi: satırın üzerine tıkla.</span>
  </div>
</div>`;

    return header + info + `<div class="yro_mode_box">${rowA}${rowB}${rowC}</div>`;
  }

  function buildTable2Details() {
    var c = Y.state.computed.t2;
    if (!c) return `<div class="yro_msg">Tablo 2 için plan yok. Mod satırındaki “Plan” butonunu kullan.</div>`;

    var warnHtml = "";
    if (c.warnings && c.warnings.length) {
      warnHtml =
        `<div class="yro_msg yro_warn">` +
        c.warnings.map(function (w) { return "• " + w; }).join("<br/>") +
        `</div>`;
    }

    function rowSnap(r, showCap) {
      var bw = r.before.wood, bs = r.before.stone, bi = r.before.iron;
      var aw = r.after ? r.after.wood : bw;
      var as = r.after ? r.after.stone : bs;
      var ai = r.after ? r.after.iron : bi;

      return `
<tr>
  <td><b>${r.name}</b></td>
  <td class="yro_right">${Y.util.n(r.storage || 0)}</td>
  ${showCap ? `<td class="yro_right">${Y.util.n(r.capEach || 0)}</td>` : ""}
  <td class="yro_right">${Y.util.n(bw)}</td>
  <td class="yro_right">${Y.util.n(bs)}</td>
  <td class="yro_right">${Y.util.n(bi)}</td>
  <td class="yro_right">${Y.util.n((r.sent && r.sent.wood) || 0)}</td>
  <td class="yro_right">${Y.util.n((r.sent && r.sent.stone) || 0)}</td>
  <td class="yro_right">${Y.util.n((r.sent && r.sent.iron) || 0)}</td>
  <td class="yro_right">${Y.util.n((r.recv && r.recv.wood) || 0)}</td>
  <td class="yro_right">${Y.util.n((r.recv && r.recv.stone) || 0)}</td>
  <td class="yro_right">${Y.util.n((r.recv && r.recv.iron) || 0)}</td>
  <td class="yro_right"><b>${Y.util.n(aw)}</b></td>
  <td class="yro_right"><b>${Y.util.n(as)}</b></td>
  <td class="yro_right"><b>${Y.util.n(ai)}</b></td>
</tr>`;
    }

    var tgtRows = (c.targetSnap || []).map(function (r) { return rowSnap(r, true); }).join("");
    var senderRows = (c.senderSnap || []).map(function (r) { return rowSnap(r, false); }).join("");
    var surplusRows = (c.surplusSnap || []).map(function (r) { return rowSnap(r, false); }).join("");

    var planRows = (c.shipments || []).map(function (s, i) {
      return `
<tr>
  <td class="yro_right">${i + 1}</td>
  <td><b>${s.fromName}</b></td>
  <td><b>${s.toName}</b> <span class="yro_small">(${s.toCoord || "?"})</span></td>
  <td class="yro_right">${Y.util.n(s.wood)}</td>
  <td class="yro_right">${Y.util.n(s.stone)}</td>
  <td class="yro_right">${Y.util.n(s.iron)}</td>
  <td class="yro_right"><b>${Y.util.n(s.total)}</b></td>
  <td class="yro_center"><b>${Y.util.n(s.merchants)}</b></td>
  <td class="yro_center"><span class="yro_small">${s.tag}</span></td>
</tr>`;
    }).join("");

    var mode = c.mode;
    var showSender = (mode !== "balance");

    return (
      warnHtml +
      `<div class="yro_msg">
        <b>Mode:</b> ${mode.toUpperCase()} |
        <b>Cap%:</b> ${c.cfg.capPct}% |
        <b>Reserve(each):</b> ${c.cfg.reservePct}% |
        <b>Surplus Cap%:</b> ${c.cfg.surplusCapPct}% |
        <b>Bsum:</b> ${Y.util.n(c.Bsum)}
      </div>` +

      `<div class="yro_scroll">
        <table class="yro_table">
          <tr><th colspan="15">Target Group — Before / Sent / Received / After (Arrived)</th></tr>
          <tr>
            <th>Village</th>
            <th class="yro_right">${Y.util.iconSpan("ressources")} Storage</th>
            <th class="yro_right">Cap</th>
            <th class="yro_right">${Y.util.iconSpan("wood")} Before</th>
            <th class="yro_right">${Y.util.iconSpan("stone")} Before</th>
            <th class="yro_right">${Y.util.iconSpan("iron")} Before</th>
            <th class="yro_right">${Y.util.iconSpan("wood")} Sent</th>
            <th class="yro_right">${Y.util.iconSpan("stone")} Sent</th>
            <th class="yro_right">${Y.util.iconSpan("iron")} Sent</th>
            <th class="yro_right">${Y.util.iconSpan("wood")} Recv</th>
            <th class="yro_right">${Y.util.iconSpan("stone")} Recv</th>
            <th class="yro_right">${Y.util.iconSpan("iron")} Recv</th>
            <th class="yro_right">${Y.util.iconSpan("wood")} After</th>
            <th class="yro_right">${Y.util.iconSpan("stone")} After</th>
            <th class="yro_right">${Y.util.iconSpan("iron")} After</th>
          </tr>
          ${tgtRows || `<tr><td colspan="15">No target villages.</td></tr>`}
        </table>
      </div>

      ${showSender ? `
      <div class="yro_scroll" style="margin-top:8px;">
        <table class="yro_table">
          <tr><th colspan="14">Sender (if any) — Before / Sent / Received / After</th></tr>
          <tr>
            <th>Village</th>
            <th class="yro_right">${Y.util.iconSpan("ressources")} Storage</th>
            <th class="yro_right">${Y.util.iconSpan("wood")} Before</th>
            <th class="yro_right">${Y.util.iconSpan("stone")} Before</th>
            <th class="yro_right">${Y.util.iconSpan("iron")} Before</th>
            <th class="yro_right">${Y.util.iconSpan("wood")} Sent</th>
            <th class="yro_right">${Y.util.iconSpan("stone")} Sent</th>
            <th class="yro_right">${Y.util.iconSpan("iron")} Sent</th>
            <th class="yro_right">${Y.util.iconSpan("wood")} Recv</th>
            <th class="yro_right">${Y.util.iconSpan("stone")} Recv</th>
            <th class="yro_right">${Y.util.iconSpan("iron")} Recv</th>
            <th class="yro_right">${Y.util.iconSpan("wood")} After</th>
            <th class="yro_right">${Y.util.iconSpan("stone")} After</th>
            <th class="yro_right">${Y.util.iconSpan("iron")} After</th>
          </tr>
          ${senderRows || `<tr><td colspan="14">No sender villages.</td></tr>`}
        </table>
      </div>` : ""}

      <div class="yro_scroll" style="margin-top:8px;">
        <table class="yro_table">
          <tr><th colspan="14">Surplus Destination — Before / Sent / Received / After</th></tr>
          <tr>
            <th>Village</th>
            <th class="yro_right">${Y.util.iconSpan("ressources")} Storage</th>
            <th class="yro_right">${Y.util.iconSpan("wood")} Before</th>
            <th class="yro_right">${Y.util.iconSpan("stone")} Before</th>
            <th class="yro_right">${Y.util.iconSpan("iron")} Before</th>
            <th class="yro_right">${Y.util.iconSpan("wood")} Sent</th>
            <th class="yro_right">${Y.util.iconSpan("stone")} Sent</th>
            <th class="yro_right">${Y.util.iconSpan("iron")} Sent</th>
            <th class="yro_right">${Y.util.iconSpan("wood")} Recv</th>
            <th class="yro_right">${Y.util.iconSpan("stone")} Recv</th>
            <th class="yro_right">${Y.util.iconSpan("iron")} Recv</th>
            <th class="yro_right">${Y.util.iconSpan("wood")} After</th>
            <th class="yro_right">${Y.util.iconSpan("stone")} After</th>
            <th class="yro_right">${Y.util.iconSpan("iron")} After</th>
          </tr>
          ${surplusRows || `<tr><td colspan="14">No surplus destination villages.</td></tr>`}
        </table>
      </div>

      <div class="yro_scroll" style="margin-top:8px;">
        <table class="yro_table">
          <tr><th colspan="9">Shipment Plan</th></tr>
          <tr>
            <th class="yro_right">#</th>
            <th>From</th>
            <th>To</th>
            <th class="yro_right">${Y.util.iconSpan("wood")}</th>
            <th class="yro_right">${Y.util.iconSpan("stone")}</th>
            <th class="yro_right">${Y.util.iconSpan("iron")}</th>
            <th class="yro_right">Total</th>
            <th class="yro_center">Merch</th>
            <th class="yro_center">Tag</th>
          </tr>
          ${planRows || `<tr><td colspan="9">No shipments.</td></tr>`}
        </table>
      </div>`
    );
  }

  function bindHandlers() {
    // Table1 group + expand row
    var sel1 = document.getElementById("yro_t1_group_sel_v4");
    if (sel1) {
      sel1.onchange = function () {
        var gid = parseInt(sel1.value, 10);
        if (!isFinite(gid)) gid = 0;
        Y.state.table1.groupId = gid;
        if (typeof Y.main.loadAndRender === "function") Y.main.loadAndRender(false);
      };
    }
    var exp = document.getElementById("yro_t1_expand_row_v4");
    if (exp) {
      exp.onclick = function () {
        Y.state.table1.villagesCollapsed = false;
        Y.ui.render();
      };
    }

    // Mode row click
    var rows = document.querySelectorAll("#" + Y.cfg.PANEL_ID + " .yro_mode_row[data-mode]");
    rows.forEach(function (r) {
      r.onclick = function (e) {
        var mode = r.getAttribute("data-mode");
        if (!mode) return;
        Y.state.table2.mode = mode;
        Y.ui.render();
      };
    });

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

    // Mod A fields
    var A = Y.state.table2.A;
    var elA_t = document.getElementById("yro_A_target");
    if (elA_t) elA_t.onchange = function () { A.targetGroupId = readSel("yro_A_target", A.targetGroupId); };
    var elA_s = document.getElementById("yro_A_surplus");
    if (elA_s) elA_s.onchange = function () { A.surplusGroupId = readSel("yro_A_surplus", A.surplusGroupId); };
    var elA_c = document.getElementById("yro_A_cap");
    if (elA_c) elA_c.onchange = function () { A.capPct = readInt("yro_A_cap", A.capPct); };
    var elA_sc = document.getElementById("yro_A_scap");
    if (elA_sc) elA_sc.onchange = function () { A.surplusCapPct = readInt("yro_A_scap", A.surplusCapPct); };

    var btnA_plan = document.getElementById("yro_A_plan");
    if (btnA_plan) btnA_plan.onclick = function () { if (Y.main.planMode) Y.main.planMode("balance"); };
    var btnA_exec = document.getElementById("yro_A_exec");
    if (btnA_exec) btnA_exec.onclick = function () { if (Y.main.executeMode) Y.main.executeMode("balance"); };

    // Mod B fields
    var B = Y.state.table2.B;
    var elB_sender = document.getElementById("yro_B_sender");
    if (elB_sender) elB_sender.onchange = function () { B.senderGroupId = readSel("yro_B_sender", B.senderGroupId); };
    var elB_target = document.getElementById("yro_B_target");
    if (elB_target) elB_target.onchange = function () { B.targetGroupId = readSel("yro_B_target", B.targetGroupId); };
    var elB_sur = document.getElementById("yro_B_surplus");
    if (elB_sur) elB_sur.onchange = function () { B.surplusGroupId = readSel("yro_B_surplus", B.surplusGroupId); };
    var elB_res = document.getElementById("yro_B_reserve");
    if (elB_res) elB_res.onchange = function () { B.reservePct = readInt("yro_B_reserve", B.reservePct); };
    var elB_cap = document.getElementById("yro_B_cap");
    if (elB_cap) elB_cap.onchange = function () { B.capPct = readInt("yro_B_cap", B.capPct); };
    var elB_scap = document.getElementById("yro_B_scap");
    if (elB_scap) elB_scap.onchange = function () { B.surplusCapPct = readInt("yro_B_scap", B.surplusCapPct); };

    var btnB_plan = document.getElementById("yro_B_plan");
    if (btnB_plan) btnB_plan.onclick = function () { if (Y.main.planMode) Y.main.planMode("push"); };
    var btnB_exec = document.getElementById("yro_B_exec");
    if (btnB_exec) btnB_exec.onclick = function () { if (Y.main.executeMode) Y.main.executeMode("push"); };

    // Mod C fields
    var C = Y.state.table2.C;
    var elC_target = document.getElementById("yro_C_target");
    if (elC_target) elC_target.onchange = function () { C.targetGroupId = readSel("yro_C_target", C.targetGroupId); };
    var elC_sur = document.getElementById("yro_C_surplus");
    if (elC_sur) elC_sur.onchange = function () { C.surplusGroupId = readSel("yro_C_surplus", C.surplusGroupId); };
    var elC_res = document.getElementById("yro_C_reserve");
    if (elC_res) elC_res.onchange = function () { C.reservePct = readInt("yro_C_reserve", C.reservePct); };
    var elC_cap = document.getElementById("yro_C_cap");
    if (elC_cap) elC_cap.onchange = function () { C.capPct = readInt("yro_C_cap", C.capPct); };
    var elC_scap = document.getElementById("yro_C_scap");
    if (elC_scap) elC_scap.onchange = function () { C.surplusCapPct = readInt("yro_C_scap", C.surplusCapPct); };

    var btnC_plan = document.getElementById("yro_C_plan");
    if (btnC_plan) btnC_plan.onclick = function () { if (Y.main.planMode) Y.main.planMode("funnel"); };
    var btnC_exec = document.getElementById("yro_C_exec");
    if (btnC_exec) btnC_exec.onclick = function () { if (Y.main.executeMode) Y.main.executeMode("funnel"); };

    // toggle label
    var btnToggle = document.getElementById("yro_toggle_v4");
    if (btnToggle) btnToggle.textContent = Y.state.table1.villagesCollapsed ? "Expand villages" : "Minimize villages";
  }

  Y.ui.ensure = function () { ensurePanel(); };
  Y.ui.setMsg = setMsg;
  Y.ui.setProgress = setProgress;
  Y.ui.hidePanel = hidePanel;
  Y.ui.showPanel = showPanel;

  Y.ui.render = function () {
    var root = document.getElementById("yro_content_v4");
    if (!root) return;

    var html = "";
    html += buildTable1();
    html += buildTable2();
    html += buildTable2Details();

    root.innerHTML = html;

    bindHandlers();
  };
})();
