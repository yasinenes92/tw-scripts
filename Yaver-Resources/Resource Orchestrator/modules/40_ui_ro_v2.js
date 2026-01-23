(function () {
  "use strict";

  var Y = window.__YAVER_RESOURCE_ORCHESTRATOR_V1__;
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
  min-width: 860px;
  max-width: 98vw;
  max-height: 90vh;
  overflow: auto;
  z-index: 99999;
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
#${Y.cfg.PANEL_ID} .yro_linkrow{
  cursor:pointer;
  color:#0a4;
  font-weight:bold;
}
#${Y.cfg.PANEL_ID} .yro_warn{
  color:#a00;
  font-weight:bold;
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
<div class="yro_hdr" id="yro_drag_v1" style="cursor:move;">
  <div class="yro_ttl">
    ${Y.util.iconSpan("wood")} Resource Orchestrator <span class="yro_small">(v1)</span>
  </div>
  <div>
    <span class="yro_dev">Developed by controleng</span>
    <button class="yro_btn" id="yro_close_v1">✖</button>
  </div>
</div>

<div class="yro_toolbar">
  <button class="yro_btn btn-confirm" id="yro_load_v1">Yükle / Yenile</button>

  <div class="yro_progress_outer"><div class="yro_progress_inner" id="yro_prog_bar_v1"></div></div>
  <span id="yro_prog_txt_v1" class="yro_small">Bekleniyor…</span>

  <span class="yro_small"><b>Search:</b></span>
  <input type="text" id="yro_search_v1" placeholder="Köy adı…" />

  <button class="yro_btn" id="yro_toggle_v1">Minimize villages</button>
</div>

<div class="yro_msg" id="yro_msg_v1">
  Kaynak: <b>overview_villages → prod</b> (köy kaynakları) + <b>overview_villages → trader</b> (incoming resources transports).
</div>

<div id="yro_content_v1"></div>
`;

    document.body.appendChild(el);

    document.getElementById("yro_close_v1").onclick = function () {
      Y.destroy();
    };

    // drag
    var isDragging = false, startX = 0, startY = 0, initL = 0, initT = 0;
    var handle = document.getElementById("yro_drag_v1");
    handle.onmousedown = function (e) {
      if (e.target && e.target.tagName === "BUTTON") return;
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      var r = el.getBoundingClientRect();
      initL = r.left;
      initT = r.top;
      e.preventDefault();
    };
    window.addEventListener("mousemove", function (e) {
      if (!isDragging) return;
      el.style.left = (initL + (e.clientX - startX)) + "px";
      el.style.top = (initT + (e.clientY - startY)) + "px";
    });
    window.addEventListener("mouseup", function () {
      isDragging = false;
    });

    document.getElementById("yro_load_v1").onclick = function () {
      if (typeof Y.main.loadAndRender === "function") Y.main.loadAndRender(true);
    };

    document.getElementById("yro_toggle_v1").onclick = function () {
      Y.state.table1.villagesCollapsed = !Y.state.table1.villagesCollapsed;
      Y.ui.render();
    };

    var inp = document.getElementById("yro_search_v1");
    inp.oninput = function () {
      Y.state.ui.search = inp.value || "";
      if (Y.state.computed.t1) {
        Y.compute.runTable1();
        Y.ui.render();
      }
    };
  }

  function setMsg(html, kind) {
    var el = document.getElementById("yro_msg_v1");
    if (!el) return;
    el.innerHTML = html;
    el.style.color = kind === "err" ? "red" : (kind === "ok" ? "green" : "black");
  }

  function setProgress(done, total, msg) {
    var bar = document.getElementById("yro_prog_bar_v1");
    var txt = document.getElementById("yro_prog_txt_v1");
    var pct = total > 0 ? Math.floor((done / total) * 100) : 0;
    if (bar) bar.style.width = pct + "%";
    if (txt) txt.textContent = msg ? (done + "/" + total + " - " + msg) : (done + "/" + total);
  }

  function cellEff(inc, eff, base) {
    // New rule:
    // - if inc > 0: "(+ inc) <b>eff</b>"
    // - else: "<b>eff</b>"
    // keep base in tooltip only (no visual clutter)
    var tip = ' title="Base: ' + Y.util.n(base) + ' | Incoming: ' + Y.util.n(inc) + '"';
    if (inc > 0) return '<span class="yro_small"'+tip+'>(+ ' + Y.util.n(inc) + ')</span> <b>' + Y.util.n(eff) + "</b>";
    return '<b'+tip+'>' + Y.util.n(eff) + "</b>";
  }

  function buildTable1() {
    var c = Y.state.computed.t1;
    if (!c) return `<div class="yro_msg">Tablo 1 için veri yok.</div>`;

    var rows = c.rows;

    var titleLeft = `1) Villages — Current + Incoming resources (${c.groupName})`;

    // build group selector (table1-only)
    var opts = (Y.state.groups || []).map(function (g) {
      var sel = g.id === (Y.state.table1.groupId || 0) ? "selected" : "";
      return `<option value="${g.id}" ${sel}>${g.name}</option>`;
    }).join("");

    var head = `
<div class="yro_sec_head">
  <div>${titleLeft}</div>
  <div class="yro_sec_controls">
    <span class="yro_small"><b>Group:</b></span>
    <select id="yro_t1_group_sel">
      ${opts}
    </select>
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
      var n = rows.length;
      body = `
<tr class="yro_linkrow" id="yro_t1_expand_row">
  <td colspan="8">Expand ${n} villages</td>
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

    var table = `
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

    return head + table;
  }

  function buildTable2() {
    var c = Y.state.computed.t2;
    var g = Y.state.table2;

    // group options
    function groupOptions(selectedId, includeAllExceptTarget) {
      var base = (Y.state.groups || []).map(function (x) {
        var sel = x.id === selectedId ? "selected" : "";
        return `<option value="${x.id}" ${sel}>${x.name}</option>`;
      }).join("");

      if (includeAllExceptTarget) {
        var sel2 = selectedId === -1 ? "selected" : "";
        base = `<option value="-1" ${sel2}>All except Target</option>` + base;
      }
      return base;
    }

    var modeOpts =
      `<option value="push" ${g.mode === "push" ? "selected" : ""}>Mod B: Push / Feed</option>` +
      `<option value="balance" ${g.mode === "balance" ? "selected" : ""}>Mod A: Balance Group</option>` +
      `<option value="funnel" ${g.mode === "funnel" ? "selected" : ""}>Mod C: Funnel / Hoard</option>`;

    var head = `
<div class="yro_sec_head">
  <div>2) Orchestrator — Tri-balance (wood=clay=iron) + Surplus Routing</div>
  <div class="yro_sec_controls">
    <span class="yro_small"><b>Mode:</b></span>
    <select id="yro_t2_mode">${modeOpts}</select>

    <span class="yro_small"><b>Sender:</b></span>
    <select id="yro_t2_sender">${groupOptions(g.senderGroupId, g.mode === "funnel")}</select>

    <span class="yro_small"><b>Target:</b></span>
    <select id="yro_t2_target">${groupOptions(g.targetGroupId, false)}</select>

    <span class="yro_small"><b>Surplus →</b></span>
    <select id="yro_t2_surplus">${groupOptions(g.surplusGroupId, false)}</select>

    ${Y.util.iconImg("/graphic/buildings/storage.png","Reserve (each resource)")}

    <input id="yro_t2_reserve" type="number" min="0" max="100" step="1" value="${String(g.reservePct)}" style="width:60px;" />
    <span class="yro_small">%</span>

    <button class="yro_btn btn-confirm" id="yro_t2_plan">Plan</button>
    <button class="yro_btn btn-confirm" id="yro_t2_exec">Execute</button>
  </div>
</div>`;

    if (!c) {
      return head + `<div class="yro_msg">Tablo 2 için henüz plan yok. “Plan” bas.</div>`;
    }

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

    // Target table
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

    return (
      head +
      warnHtml +
      `<div class="yro_msg">
        <b>Tri-balance total (Bsum):</b> ${Y.util.n(c.Bsum)} per resource distributed under cap(${Math.round(c.capPct * 100)}%).
        <span class="yro_small">Reserve(each) sender: ${Y.util.n(c.reservePct)}%</span>
      </div>` +

      `<div class="yro_scroll">
        <table class="yro_table">
          <tr>
            <th colspan="15">Target Group — Before / Sent / Received / After (Arrived)</th>
          </tr>
          <tr>
            <th>Village</th>
            <th class="yro_right">${Y.util.iconSpan("ressources")} Storage</th>
            <th class="yro_right">Cap(${Math.round(c.capPct * 100)}%)</th>
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

      <div class="yro_scroll" style="margin-top:8px;">
        <table class="yro_table">
          <tr><th colspan="14">Sender Group — Before / Sent / Received / After (Arrived)</th></tr>
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
      </div>

      <div class="yro_scroll" style="margin-top:8px;">
        <table class="yro_table">
          <tr><th colspan="14">Surplus Destination — Before / Sent / Received / After (Arrived)</th></tr>
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

  function bindTable1Handlers() {
    var sel = document.getElementById("yro_t1_group_sel");
    if (sel) {
      sel.onchange = function (e) {
        var gid = parseInt(sel.value, 10);
        if (!isFinite(gid)) gid = 0;
        Y.state.table1.groupId = gid;
        if (typeof Y.main.loadAndRender === "function") Y.main.loadAndRender(false);
      };
    }

    var exp = document.getElementById("yro_t1_expand_row");
    if (exp) {
      exp.onclick = function () {
        Y.state.table1.villagesCollapsed = false;
        Y.ui.render();
      };
    }
  }

  function bindTable2Handlers() {
    var modeSel = document.getElementById("yro_t2_mode");
    var sndSel = document.getElementById("yro_t2_sender");
    var tgtSel = document.getElementById("yro_t2_target");
    var surSel = document.getElementById("yro_t2_surplus");
    var resInp = document.getElementById("yro_t2_reserve");
    var btnPlan = document.getElementById("yro_t2_plan");
    var btnExec = document.getElementById("yro_t2_exec");

    if (modeSel) {
      modeSel.onchange = function () {
        Y.state.table2.mode = modeSel.value;
        if (typeof Y.main.loadAndRender === "function") Y.main.loadAndRender(false);
      };
    }

    if (sndSel) {
      sndSel.onchange = function () {
        Y.state.table2.senderGroupId = parseInt(sndSel.value, 10);
        if (!isFinite(Y.state.table2.senderGroupId)) Y.state.table2.senderGroupId = 0;
      };
    }
    if (tgtSel) {
      tgtSel.onchange = function () {
        Y.state.table2.targetGroupId = parseInt(tgtSel.value, 10);
        if (!isFinite(Y.state.table2.targetGroupId)) Y.state.table2.targetGroupId = 0;
      };
    }
    if (surSel) {
      surSel.onchange = function () {
        Y.state.table2.surplusGroupId = parseInt(surSel.value, 10);
        if (!isFinite(Y.state.table2.surplusGroupId)) Y.state.table2.surplusGroupId = 0;
      };
    }
    if (resInp) {
      resInp.onchange = function () {
        var v = parseInt(resInp.value, 10);
        if (!isFinite(v)) v = 0;
        Y.state.table2.reservePct = v;
      };
    }

    if (btnPlan) {
      btnPlan.onclick = function () {
        if (typeof Y.main.planTable2 === "function") Y.main.planTable2();
      };
    }
    if (btnExec) {
      btnExec.onclick = function () {
        if (typeof Y.main.executeTable2 === "function") Y.main.executeTable2();
      };
    }
  }

  Y.ui.ensure = function () {
    ensurePanel();
  };

  Y.ui.setMsg = setMsg;
  Y.ui.setProgress = setProgress;

  Y.ui.render = function () {
    var root = document.getElementById("yro_content_v1");
    if (!root) return;

    var html = "";
    html += buildTable1();
    html += buildTable2();

    root.innerHTML = html;

    bindTable1Handlers();
    bindTable2Handlers();

    // update toggle button label
    var btn = document.getElementById("yro_toggle_v1");
    if (btn) {
      btn.textContent = Y.state.table1.villagesCollapsed ? "Expand villages" : "Minimize villages";
    }
  };
})();
