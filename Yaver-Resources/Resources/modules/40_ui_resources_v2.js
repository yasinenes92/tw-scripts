(function () {
  "use strict";

  var Y = window.__YAVER_RES_ANALYZER_V1__;
  if (!Y) return;

  function ensureStyle() {
    try {
      var old = document.getElementById(Y.cfg.STYLE_ID + "_v2");
      if (old) old.remove();
    } catch (e) {}

    var st = document.createElement("style");
    st.id = Y.cfg.STYLE_ID + "_v2";

    st.textContent = `
#${Y.cfg.PANEL_ID}{
  position: fixed;
  left: 20px;
  top: 70px;
  width: fit-content;
  min-width: 680px;
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

#${Y.cfg.PANEL_ID} .yra_hdr{
  display:flex; align-items:center; justify-content:space-between;
  user-select:none; margin-bottom: 8px;
  border-bottom: 1px solid #7d510f; padding-bottom: 5px;
}
#${Y.cfg.PANEL_ID} .yra_hdr .yra_ttl{ font-weight:bold; font-size:14px; }
#${Y.cfg.PANEL_ID} .yra_hdr .yra_dev{ opacity:.85; font-style:italic; font-size: 11px; margin-right:8px; }
#${Y.cfg.PANEL_ID} .yra_btn { cursor:pointer; }
#${Y.cfg.PANEL_ID} .yra_toolbar{
  display:flex; gap:10px; align-items:center; flex-wrap:wrap; margin-bottom: 8px;
}
#${Y.cfg.PANEL_ID} .yra_progress_outer{ width:180px; height:8px; border:1px solid #777; background:#fff; display:inline-block; }
#${Y.cfg.PANEL_ID} .yra_progress_inner{ height:100%; width:0%; background:#6c0; }

#${Y.cfg.PANEL_ID} .yra_msg{
  padding:6px; background:#fff; border:1px solid #ccc;
  margin-bottom:10px; font-size:11px;
}

#${Y.cfg.PANEL_ID} .yra_sec_title{
  background:#e3d5b3; padding:4px; font-weight:bold;
  border:1px solid #7d510f; border-bottom:none;
}

#${Y.cfg.PANEL_ID} .yra_scroll{
  border:1px solid #7d510f;
  background:#fff5da;
  max-height: 55vh;
  overflow:auto;
}

#${Y.cfg.PANEL_ID} table.yra_table{
  width: max-content !important;
  border-collapse: collapse !important;
  border-spacing: 0 !important;
  table-layout: auto !important;
  background:#fff5da;
  margin: 0;
}
#${Y.cfg.PANEL_ID} table.yra_table th,
#${Y.cfg.PANEL_ID} table.yra_table td{
  padding: 4px 8px;
  border: 1px solid #dcd0b2;
  vertical-align: middle;
  white-space: nowrap;
  float: none !important; /* kritik: TW css float çakışmasını bitirir */
  position: static !important;
}
#${Y.cfg.PANEL_ID} table.yra_table th{
  background: #c1a264 !important;
  background-image: none !important;
}
#${Y.cfg.PANEL_ID} table.yra_table tr:nth-child(even) td { background-color: #f0e2be; }

#${Y.cfg.PANEL_ID} .yra_note{
  margin-top:4px;
  padding:6px;
  background:#fff;
  border:1px solid #c7b99c;
  font-size:11px;
}
#${Y.cfg.PANEL_ID} .yra_small{ font-size:10px; color:#555; }
#${Y.cfg.PANEL_ID} .yra_right{ text-align:right; }
#${Y.cfg.PANEL_ID} .yra_center{ text-align:center; }

#${Y.cfg.PANEL_ID} .yra_modebar{
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
  <div class="yra_hdr" id="yra_drag_v2" style="cursor:move;">
    <div class="yra_ttl">
      ${Y.util.iconImg("/graphic/holz.png","")} Yaver Resources Analyzer <span class="yra_small">(v2)</span>
    </div>
    <div>
      <span class="yra_dev">Developed by controleng</span>
      <button class="yra_btn" id="yra_close_v2">✖</button>
    </div>
  </div>

  <div class="yra_toolbar">
    <button class="yra_btn btn-confirm" id="yra_load_v2">Yükle / Yenile</button>
    <div class="yra_progress_outer"><div class="yra_progress_inner" id="yra_prog_bar_v2"></div></div>
    <span id="yra_prog_txt_v2" class="yra_small">Bekleniyor…</span>

    <div class="yra_modebar">
      <span class="yra_small"><b>Mode:</b></span>
      <select id="yra_mode_v2"></select>
      <button class="yra_btn" id="yra_copy_v2">📋 Defter İçin Kopyala</button>
    </div>
  </div>

  <div class="yra_msg" id="yra_msg_v2">
    Hazır. (Kaynak: <b>Production</b> + <b>Transports (Incoming)</b> + <b>Village Overview (Production)</b>)
  </div>

  <div id="yra_content_v2"></div>
`;

    document.body.appendChild(el);

    document.getElementById("yra_close_v2").onclick = function () { Y.destroy(); };

    var sel = document.getElementById("yra_mode_v2");
    sel.innerHTML = "";
    (Y.data && Y.data.MODES ? Y.data.MODES : [
      { key: "all", label: "All (1+2+3+4)" },
      { key: "summary", label: "Summary (1-3)" },
      { key: "optimizer", label: "Optimizer (4)" }
    ]).forEach(function (m) {
      var o = document.createElement("option");
      o.value = m.key;
      o.textContent = (m.key === "all") ? "All (1+2+3+4)" : (m.key === "summary" ? "Summary (1-3)" : "Optimizer (4)");
      sel.appendChild(o);
    });

    sel.value = Y.state.ui.mode || "all";
    sel.onchange = function () {
      Y.state.ui.mode = sel.value;
      Y.ui.renderAll();
    };

    // drag
    var isDragging = false, startX = 0, startY = 0, initL = 0, initT = 0;
    var handle = document.getElementById("yra_drag_v2");
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

    document.getElementById("yra_load_v2").onclick = function () {
      if (typeof Y.main.loadAndRender === "function") Y.main.loadAndRender();
    };
    document.getElementById("yra_copy_v2").onclick = function () {
      if (typeof Y.ui.copyBBCode === "function") Y.ui.copyBBCode();
    };
  }

  function setMsg(html, kind) {
    var el = document.getElementById("yra_msg_v2");
    if (!el) return;
    el.innerHTML = html;
    el.style.color = kind === "err" ? "red" : (kind === "ok" ? "green" : "black");
  }

  function setProgress(done, total, msg) {
    var bar = document.getElementById("yra_prog_bar_v2");
    var txt = document.getElementById("yra_prog_txt_v2");
    var pct = total > 0 ? Math.floor((done / total) * 100) : 0;
    if (bar) bar.style.width = pct + "%";
    if (txt) txt.textContent = msg ? (done + "/" + total + " - " + msg) : (done + "/" + total);
  }

  function cellWithIncoming(total, incoming) {
    if (!incoming) return "<b>" + Y.util.n(total) + "</b>";
    return "<b>" + Y.util.n(total) + "</b>" + ' <span class="yra_small">(+ ' + Y.util.n(incoming) + ')</span>';
  }

  function renderTable1(sums) {
    var p = sums.parents;
    var c = sums.children;

    var storageIcon = Y.util.iconImg("/graphic/buildings/storage.png", "Total resources (Wood+Clay+Iron)");
    var marketIcon = Y.util.iconImg("/graphic/buildings/market.png", "Merchants");

    return `
<div class="yra_sec_title">1) Group Totals (Resources + Incoming Transports)</div>
<table class="yra_table">
  <tr>
    <th>Group</th>
    <th>${Y.util.iconSpan("wood")} Wood</th>
    <th>${Y.util.iconSpan("stone")} Clay</th>
    <th>${Y.util.iconSpan("iron")} Iron</th>
    <th>${storageIcon} Total</th>
    <th>${marketIcon} Merchants</th>
  </tr>
  <tr>
    <td><b>Parents</b> <span class="yra_small">(${p.count} köy)</span></td>
    <td>${cellWithIncoming(p.wood, p.incWood)}</td>
    <td>${cellWithIncoming(p.stone, p.incStone)}</td>
    <td>${cellWithIncoming(p.iron, p.incIron)}</td>
    <td class="yra_right"><b>${Y.util.n(p.total)}</b></td>
    <td class="yra_center"><b>${Y.util.n(p.merchAvail)}/${Y.util.n(p.merchTotal)}</b></td>
  </tr>
  <tr>
    <td><b>Children</b> <span class="yra_small">(${c.count} köy)</span></td>
    <td>${cellWithIncoming(c.wood, c.incWood)}</td>
    <td>${cellWithIncoming(c.stone, c.incStone)}</td>
    <td>${cellWithIncoming(c.iron, c.incIron)}</td>
    <td class="yra_right"><b>${Y.util.n(c.total)}</b></td>
    <td class="yra_center"><b>${Y.util.n(c.merchAvail)}/${Y.util.n(c.merchTotal)}</b></td>
  </tr>
</table>
<div class="yra_note">
  <b>Açıklama:</b> Bu tabloda kaynaklar, <b>Production</b> sayfasındaki mevcut kaynaklara ek olarak <b>Transports → Incoming</b> (yolda olan) kaynakları da <u>hedef köye eklenmiş</u> şekilde gösterilir.
  “(+X)” yolda olan kısmı belirtir.
</div>
`;
  }

  function renderTable2(avgs) {
    function row(label, a) {
      return `
<tr>
  <td><b>${label}</b> <span class="yra_small">(${a.count} köy)</span></td>
  <td class="yra_right"><b>${Y.util.n(a.wood)}</b></td>
  <td class="yra_right"><b>${Y.util.n(a.stone)}</b></td>
  <td class="yra_right"><b>${Y.util.n(a.iron)}</b></td>
  <td class="yra_right"><b>${Y.util.n(a.total)}</b></td>
</tr>`;
    }

    var storageIcon = Y.util.iconImg("/graphic/buildings/storage.png", "Average total");

    return `
<div class="yra_sec_title" style="margin-top:10px;">2) Averages</div>
<table class="yra_table">
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
<div class="yra_note">
  <b>Açıklama:</b> Grup başına <b>köy sayısına bölünmüş ortalama</b> kaynak miktarlarıdır. (Incoming dahil “efektif” kaynak üzerinden.)
</div>
`;
  }

  function renderTable3Prod(prod) {
    var rows = prod.rows.map(function (r) {
      var g = r.group === "parents" ? "Parents" : (r.group === "children" ? "Children" : "Other");
      var daily = r.perDay;
      return `
<tr>
  <td><b>${r.name}</b></td>
  <td>${g}</td>
  <td class="yra_right">${Y.util.n(r.points)}</td>
  <td class="yra_right"><b>${Y.util.n(daily.wood)}</b></td>
  <td class="yra_right"><b>${Y.util.n(daily.stone)}</b></td>
  <td class="yra_right"><b>${Y.util.n(daily.iron)}</b></td>
  <td class="yra_right"><b>${Y.util.n(daily.total)}</b></td>
</tr>`;
    }).join("");

    var t = prod.totals;

    return `
<div class="yra_sec_title" style="margin-top:10px;">3) Daily Resource Production (All Villages)</div>
<div class="yra_scroll">
<table class="yra_table">
  <tr>
    <th>Village</th>
    <th>Group</th>
    <th class="yra_right">Points</th>
    <th class="yra_right">${Y.util.iconSpan("wood")} Wood/day</th>
    <th class="yra_right">${Y.util.iconSpan("stone")} Clay/day</th>
    <th class="yra_right">${Y.util.iconSpan("iron")} Iron/day</th>
    <th class="yra_right">${Y.util.iconImg("/graphic/buildings/storage.png","Total/day")} Total/day</th>
  </tr>
  ${rows}
  <tr>
    <td colspan="3"><b>ALL VILLAGES (TOTAL)</b></td>
    <td class="yra_right"><b>${Y.util.n(t.wood)}</b></td>
    <td class="yra_right"><b>${Y.util.n(t.stone)}</b></td>
    <td class="yra_right"><b>${Y.util.n(t.iron)}</b></td>
    <td class="yra_right"><b>${Y.util.n(t.total)}</b></td>
  </tr>
</table>
</div>
<div class="yra_note">
  <b>Açıklama:</b> Her köy için üretim değeri <b>Village → Overview</b> sayfasındaki <b>Production</b> widget’ından “per hour” olarak okunur, sonra <b>24 ile çarpılarak</b> günlük üretime çevrilir.
  (Bu tablo mevcut kaynak değil, <u>üretim hızıdır</u>.)
</div>
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
<div class="yra_sec_title" style="margin-top:10px;">Market Advice (1:1 Trade)</div>
<div class="yra_note">
  <div><b>All Villages Totals:</b> ${Y.util.iconSpan("wood")} ${Y.util.n(a.sum.wood)} | ${Y.util.iconSpan("stone")} ${Y.util.n(a.sum.stone)} | ${Y.util.iconSpan("iron")} ${Y.util.n(a.sum.iron)} <span class="yra_small">(target ≈ ${Y.util.n(a.target)})</span></div>
  <div style="margin-top:6px;">${movesA}</div>
  <hr/>
  <div><b>Parents Totals (trade only here):</b> ${Y.util.iconSpan("wood")} ${Y.util.n(p.sum.wood)} | ${Y.util.iconSpan("stone")} ${Y.util.n(p.sum.stone)} | ${Y.util.iconSpan("iron")} ${Y.util.n(p.sum.iron)} <span class="yra_small">(target ≈ ${Y.util.n(p.target)})</span></div>
  <div style="margin-top:6px;">${movesP}</div>
  <div class="yra_small" style="margin-top:6px;">
    Not: Trade oranı oyunda <b>1:1</b>. Merchant kapasitesi: <b>1 merchant = 1000</b>.
  </div>
</div>
`;
  }

  // Table 4 (old optimizer)
  function renderTable4(plan) {
    var rows = plan.recvs
      .slice()
      .sort(function (a, b) {
        var ap = (a.points || 0) <= Y.cfg.LOW_POINTS_THRESHOLD ? 0 : 1;
        var bp = (b.points || 0) <= Y.cfg.LOW_POINTS_THRESHOLD ? 0 : 1;
        if (ap !== bp) return ap - bp;
        return (a.points || 0) - (b.points || 0);
      })
      .map(function (c) {
        var flag = (c.points || 0) <= Y.cfg.LOW_POINTS_THRESHOLD ? '<span class="yra_small" style="color:#005c00;"><b>PRIO</b></span>' : "";
        return `
<tr>
  <td><b>${c.name}</b> ${flag}</td>
  <td class="yra_right"><b>${Y.util.n(c.points || 0)}</b></td>
  <td class="yra_right">${Y.util.n(c.storage || 0)}</td>
  <td class="yra_right">${Y.util.n(c.capEach || 0)}</td>
  <td class="yra_right">${Y.util.n(c.before.wood)}</td>
  <td class="yra_right">${Y.util.n(c.before.stone)}</td>
  <td class="yra_right">${Y.util.n(c.before.iron)}</td>
  <td class="yra_right"><b>${Y.util.n(c.recv.wood)}</b></td>
  <td class="yra_right"><b>${Y.util.n(c.recv.stone)}</b></td>
  <td class="yra_right"><b>${Y.util.n(c.recv.iron)}</b></td>
  <td class="yra_right">${Y.util.n(c.after.wood)}</td>
  <td class="yra_right">${Y.util.n(c.after.stone)}</td>
  <td class="yra_right">${Y.util.n(c.after.iron)}</td>
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
  <td class="yra_right">${Y.util.n(d.storage || 0)}</td>
  <td class="yra_right">${Y.util.n(d.reserveEach || 0)}</td>
  <td class="yra_right">${Y.util.n(d.sent.wood)}</td>
  <td class="yra_right">${Y.util.n(d.sent.stone)}</td>
  <td class="yra_right">${Y.util.n(d.sent.iron)}</td>
  <td class="yra_right"><b>${Y.util.n(d.sentTotal)}</b></td>
  <td class="yra_center"><b>${Y.util.n(d.merchantsNeeded)}</b> / ${Y.util.n(d.merchAvail || 0)} ${ok}</td>
</tr>`;
      })
      .join("");

    return `
<div class="yra_sec_title" style="margin-top:10px;">4) Optimizer (Parents → Children) Simulation</div>
<div class="yra_note">
  <b>Açıklama:</b> Bu bir <b>simülasyon</b>. Parents köylerde her resource için depodan <b>%1 reserve</b> bırakır, kalan kaynakları Children’a taşır.
  Children tarafında her resource <b>%80 storage</b> üstüne çıkmaz. Öncelik: <b>≤ ${Y.cfg.LOW_POINTS_THRESHOLD}</b>.
</div>

<div class="yra_scroll" style="margin-top:6px;">
<table class="yra_table">
  <tr>
    <th>Child Village</th>
    <th class="yra_right">Points</th>
    <th class="yra_right">Storage</th>
    <th class="yra_right">Cap(80%)</th>
    <th class="yra_right">${Y.util.iconSpan("wood")} Before</th>
    <th class="yra_right">${Y.util.iconSpan("stone")} Before</th>
    <th class="yra_right">${Y.util.iconSpan("iron")} Before</th>
    <th class="yra_right">${Y.util.iconSpan("wood")} +Send</th>
    <th class="yra_right">${Y.util.iconSpan("stone")} +Send</th>
    <th class="yra_right">${Y.util.iconSpan("iron")} +Send</th>
    <th class="yra_right">${Y.util.iconSpan("wood")} After</th>
    <th class="yra_right">${Y.util.iconSpan("stone")} After</th>
    <th class="yra_right">${Y.util.iconSpan("iron")} After</th>
  </tr>
  ${rows || `<tr><td colspan="13">No children villages found.</td></tr>`}
</table>
</div>

<div class="yra_sec_title" style="margin-top:10px;">Parents Send Feasibility (Merchants)</div>
<div class="yra_scroll">
<table class="yra_table">
  <tr>
    <th>Parent Village</th>
    <th class="yra_right">Storage</th>
    <th class="yra_right">Reserve(each)</th>
    <th class="yra_right">${Y.util.iconSpan("wood")} Sent</th>
    <th class="yra_right">${Y.util.iconSpan("stone")} Sent</th>
    <th class="yra_right">${Y.util.iconSpan("iron")} Sent</th>
    <th class="yra_right">${Y.util.iconSpan("res")} Total Sent</th>
    <th class="yra_center">${Y.util.iconImg("/graphic/buildings/market.png","Merchants")} Merchants</th>
  </tr>
  ${donorRows || `<tr><td colspan="8">No parent villages found.</td></tr>`}
</table>
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
    var ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand("copy"); } catch (e) {}
    ta.remove();
  }

  Y.ui.ensure = function () { ensurePanel(); };
  Y.ui.setMsg = setMsg;
  Y.ui.setProgress = setProgress;

  Y.ui.copyBBCode = function () {
    var bb = buildBBCode();
    copyText(bb);
    if (window.UI && UI.SuccessMessage) UI.SuccessMessage("Rapor kopyalandı! Deftere yapıştırabilirsin. 📋", 2500);
  };

  Y.ui.renderAll = function () {
    var root = document.getElementById("yra_content_v2");
    if (!root) return;

    var c = Y.state.computed;
    if (!c) {
      root.innerHTML = `<div class="yra_note">Veri yok. “Yükle / Yenile” bas.</div>`;
      return;
    }

    var mode = Y.state.ui.mode || "all";

    var html = "";
    if (mode === "all" || mode === "summary") {
      html += renderTable1(c.sums);
      html += renderTable2(c.avgs);
      html += renderTable3Prod(c.prod);
      html += renderAdvice(c.advice);
    }
    if (mode === "all" || mode === "optimizer") {
      html += renderTable4(c.plan);
    }

    root.innerHTML = html;
  };
})();
