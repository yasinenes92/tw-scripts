(function () {
  "use strict";

  var Y = window.__YAVER_RES_ANALYZER_V1__;
  if (!Y) return;

  function ensureStyle() {
    try {
      var old = document.getElementById(Y.cfg.STYLE_ID);
      if (old) old.remove();
    } catch (e) {}

    var st = document.createElement("style");
    st.id = Y.cfg.STYLE_ID;

    st.textContent = `
#${Y.cfg.PANEL_ID}{
  position: fixed;
  left: 20px;
  top: 70px;
  width: fit-content;
  min-width: 640px;
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

#${Y.cfg.PANEL_ID} .hdr{
  display:flex; align-items:center; justify-content:space-between;
  user-select:none; margin-bottom: 8px;
  border-bottom: 1px solid #7d510f; padding-bottom: 5px;
}
#${Y.cfg.PANEL_ID} .hdr .ttl{ font-weight:bold; font-size:14px; }
#${Y.cfg.PANEL_ID} .hdr .dev{ opacity:.85; font-style:italic; font-size: 11px; margin-right:8px; }
#${Y.cfg.PANEL_ID} .btn { cursor:pointer; }
#${Y.cfg.PANEL_ID} .toolbar{
  display:flex; gap:10px; align-items:center; flex-wrap:wrap; margin-bottom: 8px;
}
#${Y.cfg.PANEL_ID} .progress_outer{ width:160px; height:8px; border:1px solid #777; background:#fff; display:inline-block; }
#${Y.cfg.PANEL_ID} .progress_inner{ height:100%; width:0%; background:#6c0; }

#${Y.cfg.PANEL_ID} .msg{
  padding:6px; background:#fff; border:1px solid #ccc;
  margin-bottom:10px; font-size:11px;
}

#${Y.cfg.PANEL_ID} .sec_title{
  background:#e3d5b3; padding:4px; font-weight:bold;
  border:1px solid #7d510f; border-bottom:none;
}

#${Y.cfg.PANEL_ID} table.vis{
  width: auto;
  border-collapse: collapse;
  margin: 0;
  background:#fff5da;
}
#${Y.cfg.PANEL_ID} table.vis th, #${Y.cfg.PANEL_ID} table.vis td{
  padding: 4px 8px;
  border: 1px solid #dcd0b2;
  vertical-align: middle;
  white-space: nowrap;
}
#${Y.cfg.PANEL_ID} table.vis th{
  background: #c1a264 !important;
  background-image: none !important;
}
#${Y.cfg.PANEL_ID} table.vis tr:nth-child(even) td { background-color: #f0e2be; }

#${Y.cfg.PANEL_ID} .boxrow{
  display:flex; flex-wrap:wrap; gap:6px; align-items:flex-start;
}
#${Y.cfg.PANEL_ID} .advice{
  background:#fff; border:1px solid #c7b99c; padding:6px; font-size:11px;
}
#${Y.cfg.PANEL_ID} .tiny{ font-size:10px; color:#555; }
#${Y.cfg.PANEL_ID} .right{ text-align:right; }
#${Y.cfg.PANEL_ID} .center{ text-align:center; }

#${Y.cfg.PANEL_ID} .scroll{
  border:1px solid #7d510f; background:#fff5da;
  max-height: 55vh; overflow:auto;
}

#${Y.cfg.PANEL_ID} .modebar{
  display:flex; gap:10px; align-items:center; flex-wrap:wrap;
}
#${Y.cfg.PANEL_ID} select{ padding:2px 6px; }
`;
    document.head.appendChild(st);
  }

  function ensurePanel() {
    ensureStyle();

    try {
      var old = document.getElementById(Y.cfg.PANEL_ID);
      if (old) old.remove();
    } catch (e) {}

    var el = document.createElement("div");
    el.id = Y.cfg.PANEL_ID;

    el.innerHTML = `
  <div class="hdr" id="yra_drag_v1" style="cursor:move;">
    <div class="ttl">
      ${Y.util.iconSpan("res")} Yaver Resources Analyzer <span class="tiny">(v1)</span>
    </div>
    <div>
      <span class="dev">Developed by controleng</span>
      <button class="btn" id="yra_close_v1">✖</button>
    </div>
  </div>

  <div class="toolbar">
    <button class="btn btn-confirm" id="yra_load_v1">Yükle / Yenile</button>
    <div class="progress_outer"><div class="progress_inner" id="yra_prog_bar_v1"></div></div>
    <span id="yra_prog_txt_v1" class="tiny">Bekleniyor…</span>

    <div class="modebar">
      <span class="tiny"><b>Mode:</b></span>
      <select id="yra_mode_v1"></select>
      <button class="btn" id="yra_copy_v1">📋 Defter İçin Kopyala</button>
    </div>
  </div>

  <div class="msg" id="yra_msg_v1">
    Hazır. (Kaynak: <b>Production</b> + <b>Transports (Incoming)</b>)
  </div>

  <div id="yra_content_v1"></div>
`;

    document.body.appendChild(el);

    document.getElementById("yra_close_v1").onclick = function () {
      Y.destroy();
    };

    // mode options
    var sel = document.getElementById("yra_mode_v1");
    sel.innerHTML = "";
    Y.data.MODES.forEach(function (m) {
      var o = document.createElement("option");
      o.value = m.key;
      o.textContent = m.label;
      sel.appendChild(o);
    });
    sel.value = Y.state.ui.mode || "all";
    sel.onchange = function () {
      Y.state.ui.mode = sel.value;
      Y.ui.renderAll();
    };

    // drag
    var isDragging = false, startX = 0, startY = 0, initL = 0, initT = 0;
    var handle = document.getElementById("yra_drag_v1");
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

    // buttons
    document.getElementById("yra_load_v1").onclick = function () {
      if (typeof Y.main.loadAndRender === "function") Y.main.loadAndRender();
    };
    document.getElementById("yra_copy_v1").onclick = function () {
      if (typeof Y.ui.copyBBCode === "function") Y.ui.copyBBCode();
    };
  }

  function setMsg(html, kind) {
    var el = document.getElementById("yra_msg_v1");
    if (!el) return;
    el.innerHTML = html;
    el.style.color = kind === "err" ? "red" : (kind === "ok" ? "green" : "black");
  }

  function setProgress(done, total, msg) {
    var bar = document.getElementById("yra_prog_bar_v1");
    var txt = document.getElementById("yra_prog_txt_v1");
    var pct = total > 0 ? Math.floor((done / total) * 100) : 0;
    if (bar) bar.style.width = pct + "%";
    if (txt) txt.textContent = msg ? (done + "/" + total + " - " + msg) : (done + "/" + total);
  }

  function cellWithIncoming(total, incoming) {
    // total zaten incoming dahil. kullanıcı için şeffaflık: (+in transit)
    if (!incoming) return "<b>" + Y.util.n(total) + "</b>";
    return "<b>" + Y.util.n(total) + "</b>" + ' <span class="tiny">(+ ' + Y.util.n(incoming) + ')</span>';
  }

  function renderTable1(sums) {
    var p = sums.parents;
    var c = sums.children;

    var storageIcon = Y.util.iconImg("/graphic/buildings/storage.png", "Storage total");
    var marketIcon = Y.util.iconImg("/graphic/buildings/market.png", "Merchants");

    return `
<div class="sec_title">1) Group Totals (Resources + Incoming Transports)</div>
<table class="vis">
  <tr>
    <th>Group</th>
    <th>${Y.util.iconSpan("wood")} Wood</th>
    <th>${Y.util.iconSpan("stone")} Clay</th>
    <th>${Y.util.iconSpan("iron")} Iron</th>
    <th>${storageIcon} Total</th>
    <th>${marketIcon} Merchants</th>
  </tr>
  <tr>
    <td><b>Parents</b> <span class="tiny">(${p.count} köy)</span></td>
    <td>${cellWithIncoming(p.wood, p.incWood)}</td>
    <td>${cellWithIncoming(p.stone, p.incStone)}</td>
    <td>${cellWithIncoming(p.iron, p.incIron)}</td>
    <td class="right"><b>${Y.util.n(p.total)}</b></td>
    <td class="center"><b>${Y.util.n(p.merchAvail)}/${Y.util.n(p.merchTotal)}</b></td>
  </tr>
  <tr>
    <td><b>Children</b> <span class="tiny">(${c.count} köy)</span></td>
    <td>${cellWithIncoming(c.wood, c.incWood)}</td>
    <td>${cellWithIncoming(c.stone, c.incStone)}</td>
    <td>${cellWithIncoming(c.iron, c.incIron)}</td>
    <td class="right"><b>${Y.util.n(c.total)}</b></td>
    <td class="center"><b>${Y.util.n(c.merchAvail)}/${Y.util.n(c.merchTotal)}</b></td>
  </tr>
</table>
`;
  }

  function renderTable2(avgs) {
    function row(label, a) {
      return `
<tr>
  <td><b>${label}</b> <span class="tiny">(${a.count} köy)</span></td>
  <td><b>${Y.util.n(a.wood)}</b></td>
  <td><b>${Y.util.n(a.stone)}</b></td>
  <td><b>${Y.util.n(a.iron)}</b></td>
  <td class="right"><b>${Y.util.n(a.total)}</b></td>
</tr>`;
    }

    var storageIcon = Y.util.iconImg("/graphic/buildings/storage.png", "Average total");

    return `
<div class="sec_title" style="margin-top:10px;">2) Averages</div>
<table class="vis">
  <tr>
    <th>Scope</th>
    <th>${Y.util.iconSpan("wood")} Avg Wood</th>
    <th>${Y.util.iconSpan("stone")} Avg Clay</th>
    <th>${Y.util.iconSpan("iron")} Avg Iron</th>
    <th>${storageIcon} Avg Total</th>
  </tr>
  ${row("Parents", avgs.parents)}
  ${row("Children", avgs.children)}
  ${row("All", avgs.all)}
</table>
`;
  }

  function renderAdvice(advice) {
    function fmtMove(m) {
      var fromIcon = m.from === "wood" ? Y.util.iconSpan("wood") : (m.from === "stone" ? Y.util.iconSpan("stone") : Y.util.iconSpan("iron"));
      var toIcon = m.to === "wood" ? Y.util.iconSpan("wood") : (m.to === "stone" ? Y.util.iconSpan("stone") : Y.util.iconSpan("iron"));
      return `<div>• ${fromIcon} <b>${m.from}</b> → ${toIcon} <b>${m.to}</b> : <b>${Y.util.n(m.amount)}</b> (1:1)</div>`;
    }

    var p = advice.parents;
    var a = advice.all;

    var movesP = p.plan.moves.length ? p.plan.moves.map(fmtMove).join("") : "<div>• Denge zaten yakın (trade önerisi yok).</div>";
    var movesA = a.plan.moves.length ? a.plan.moves.map(fmtMove).join("") : "<div>• Denge zaten yakın (trade önerisi yok).</div>";

    return `
<div class="sec_title" style="margin-top:10px;">Market Advice (1:1 Trade)</div>
<div class="advice">
  <div><b>All Villages Totals:</b> ${Y.util.iconSpan("wood")} ${Y.util.n(a.sum.wood)} | ${Y.util.iconSpan("stone")} ${Y.util.n(a.sum.stone)} | ${Y.util.iconSpan("iron")} ${Y.util.n(a.sum.iron)} <span class="tiny">(target ≈ ${Y.util.n(a.target)})</span></div>
  <div style="margin-top:6px;">${movesA}</div>
  <hr/>
  <div><b>Parents Totals (trade only here):</b> ${Y.util.iconSpan("wood")} ${Y.util.n(p.sum.wood)} | ${Y.util.iconSpan("stone")} ${Y.util.n(p.sum.stone)} | ${Y.util.iconSpan("iron")} ${Y.util.n(p.sum.iron)} <span class="tiny">(target ≈ ${Y.util.n(p.target)})</span></div>
  <div style="margin-top:6px;">${movesP}</div>
  <div class="tiny" style="margin-top:6px;">
    Not: Trade oranı oyunda <b>1:1</b> (MarketMerchantExchange.exchangeFactor = 1). Merchant kapasitesi: <b>1 merchant = 1000</b> (Merchant status sayfasında “Maximum transport amount” doğrulandı).
  </div>
</div>
`;
  }

  function renderTable3(plan) {
    // Children plan table
    var rows = plan.recvs
      .slice()
      .sort(function (a, b) {
        // priority then points
        var ap = (a.points || 0) <= Y.cfg.LOW_POINTS_THRESHOLD ? 0 : 1;
        var bp = (b.points || 0) <= Y.cfg.LOW_POINTS_THRESHOLD ? 0 : 1;
        if (ap !== bp) return ap - bp;
        return (a.points || 0) - (b.points || 0);
      })
      .map(function (c) {
        var flag = (c.points || 0) <= Y.cfg.LOW_POINTS_THRESHOLD ? '<span class="tiny" style="color:#005c00;"><b>PRIO</b></span>' : "";
        return `
<tr>
  <td><b>${c.name}</b> ${flag}</td>
  <td class="right"><b>${Y.util.n(c.points || 0)}</b></td>
  <td class="right">${Y.util.n(c.storage || 0)}</td>
  <td class="right">${Y.util.n(c.capEach || 0)}</td>
  <td class="right">${Y.util.n(c.before.wood)}</td>
  <td class="right">${Y.util.n(c.before.stone)}</td>
  <td class="right">${Y.util.n(c.before.iron)}</td>
  <td class="right"><b>${Y.util.n(c.recv.wood)}</b></td>
  <td class="right"><b>${Y.util.n(c.recv.stone)}</b></td>
  <td class="right"><b>${Y.util.n(c.recv.iron)}</b></td>
  <td class="right">${Y.util.n(c.after.wood)}</td>
  <td class="right">${Y.util.n(c.after.stone)}</td>
  <td class="right">${Y.util.n(c.after.iron)}</td>
</tr>`;
      })
      .join("");

    var donorRows = plan.donors
      .slice()
      .sort(function (a, b) { return (b.sentTotal || 0) - (a.sentTotal || 0); })
      .map(function (d) {
        var ok = d.merchantsOk ? '<span style="color:#005c00;"><b>OK</b></span>' : '<span style="color:#a00;"><b>NEED</b></span>';
        return `
<tr>
  <td><b>${d.name}</b></td>
  <td class="right">${Y.util.n(d.storage || 0)}</td>
  <td class="right">${Y.util.n(d.reserveEach || 0)}</td>
  <td class="right">${Y.util.n(d.sent.wood)}</td>
  <td class="right">${Y.util.n(d.sent.stone)}</td>
  <td class="right">${Y.util.n(d.sent.iron)}</td>
  <td class="right"><b>${Y.util.n(d.sentTotal)}</b></td>
  <td class="center"><b>${Y.util.n(d.merchantsNeeded)}</b> / ${Y.util.n(d.merchAvail || 0)} ${ok}</td>
</tr>`;
      })
      .join("");

    return `
<div class="sec_title" style="margin-top:10px;">3) Optimizer (Parents → Children) Simulation</div>

<div class="advice">
  <div><b>Params:</b> Parents reserve = <b>${Math.round(plan.params.reservePct * 100)}%</b> (each resource), Children cap = <b>${Math.round(plan.params.capPct * 100)}%</b> (each resource), Priority = <b>≤ ${plan.params.lowPts} points</b>.</div>
  <div style="margin-top:6px;">
    <b>Planned Send Totals:</b>
    ${Y.util.iconSpan("wood")} <b>${Y.util.n(plan.totals.parentsSent.wood)}</b> |
    ${Y.util.iconSpan("stone")} <b>${Y.util.n(plan.totals.parentsSent.stone)}</b> |
    ${Y.util.iconSpan("iron")} <b>${Y.util.n(plan.totals.parentsSent.iron)}</b> |
    ${Y.util.iconSpan("res")} <b>${Y.util.n(plan.totals.parentsSent.total)}</b>
    <span class="tiny">(merchant packing: 1000’lik bloklar)</span>
  </div>
</div>

<div class="scroll" style="margin-top:6px;">
<table class="vis">
  <tr>
    <th>Child Village</th>
    <th class="right">Points</th>
    <th class="right">Storage</th>
    <th class="right">Cap(80%)</th>
    <th class="right">${Y.util.iconSpan("wood")} Before</th>
    <th class="right">${Y.util.iconSpan("stone")} Before</th>
    <th class="right">${Y.util.iconSpan("iron")} Before</th>
    <th class="right">${Y.util.iconSpan("wood")} +Send</th>
    <th class="right">${Y.util.iconSpan("stone")} +Send</th>
    <th class="right">${Y.util.iconSpan("iron")} +Send</th>
    <th class="right">${Y.util.iconSpan("wood")} After</th>
    <th class="right">${Y.util.iconSpan("stone")} After</th>
    <th class="right">${Y.util.iconSpan("iron")} After</th>
  </tr>
  ${rows || `<tr><td colspan="13">No children villages found.</td></tr>`}
</table>
</div>

<div class="sec_title" style="margin-top:10px;">Parents Send Feasibility (Merchants)</div>
<div class="scroll">
<table class="vis">
  <tr>
    <th>Parent Village</th>
    <th class="right">Storage</th>
    <th class="right">Reserve(each)</th>
    <th class="right">${Y.util.iconSpan("wood")} Sent</th>
    <th class="right">${Y.util.iconSpan("stone")} Sent</th>
    <th class="right">${Y.util.iconSpan("iron")} Sent</th>
    <th class="right">${Y.util.iconSpan("res")} Total Sent</th>
    <th class="center">${Y.util.iconImg("/graphic/buildings/market.png","Merchants")} Merchants</th>
  </tr>
  ${donorRows || `<tr><td colspan="8">No parent villages found.</td></tr>`}
</table>
</div>

<div class="tiny" style="margin-top:6px;">
Not: Bu ekran “analiz + simülasyon” içindir. Otomatik gönderim yapmaz. (İstersen sonraki iterasyonda “Export transfer list” ekleriz.)
</div>
`;
  }

  function buildBBCode() {
    var c = Y.state.computed;
    if (!c) return "[b]Yaver Resources Analyzer[/b]\n(Veri yok)";

    var p = c.sums.parents;
    var ch = c.sums.children;
    var all = c.sums.all;

    function lineGroup(name, s) {
      return (
        "[*][b]" + name + "[/b]" +
        " | Wood: " + Y.util.n(s.wood) +
        " | Clay: " + Y.util.n(s.stone) +
        " | Iron: " + Y.util.n(s.iron) +
        " | Total: " + Y.util.n(s.total) +
        " | Merch: " + Y.util.n(s.merchAvail) + "/" + Y.util.n(s.merchTotal)
      );
    }

    var server = ($("#serverDate").text() || "") + " " + ($("#serverTime").text() || "");

    var t = "";
    t += "[quote][b]Yaver Resources Analyzer[/b] (" + server + ")\n";
    t += "[list]\n";
    t += lineGroup("Parents", p) + "\n";
    t += lineGroup("Children", ch) + "\n";
    t += lineGroup("All", all) + "\n";
    t += "[/list]\n";
    t += "[/quote]";
    return t;
  }

  function copyText(text) {
    if (!text) return;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text);
        return;
      }
    } catch (e) {}
    // fallback
    var ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand("copy"); } catch (e) {}
    ta.remove();
  }

  Y.ui.ensure = function () {
    ensurePanel();
  };

  Y.ui.setMsg = setMsg;
  Y.ui.setProgress = setProgress;

  Y.ui.copyBBCode = function () {
    var bb = buildBBCode();
    copyText(bb);
    if (window.UI && UI.SuccessMessage) UI.SuccessMessage("Rapor kopyalandı! Deftere yapıştırabilirsin. 📋", 2500);
  };

  Y.ui.renderAll = function () {
    var root = document.getElementById("yra_content_v1");
    if (!root) return;

    var c = Y.state.computed;
    if (!c) {
      root.innerHTML = `<div class="advice">Veri yok. “Yükle / Yenile” bas.</div>`;
      return;
    }

    var mode = Y.state.ui.mode || "all";

    var html = "";
    if (mode === "all" || mode === "summary") {
      html += renderTable1(c.sums);
      html += renderTable2(c.avgs);
      html += renderAdvice(c.advice);
    }
    if (mode === "all" || mode === "optimizer") {
      html += renderTable3(c.plan);
    }

    root.innerHTML = html;
  };
})();
