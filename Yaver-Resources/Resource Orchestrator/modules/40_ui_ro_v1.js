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
  min-width: 760px;
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

#${Y.cfg.PANEL_ID} details summary{
  cursor:pointer;
  user-select:none;
  padding: 4px;
  background:#e3d5b3;
  border:1px solid #7d510f;
  margin-bottom:6px;
  font-weight:bold;
}

#${Y.cfg.PANEL_ID} input[type="text"]{
  padding:2px 6px;
}
#${Y.cfg.PANEL_ID} select{
  padding:2px 6px;
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

  <span class="yro_small"><b>Group:</b></span>
  <select id="yro_group_v1"></select>

  <span class="yro_small"><b>Search:</b></span>
  <input type="text" id="yro_search_v1" placeholder="Köy adı…" />

  <button class="yro_btn" id="yro_toggle_v1">Aç/Kapat</button>
</div>

<div class="yro_msg" id="yro_msg_v1">
  Hazır. Kaynak: <b>overview_villages → prod</b> (köy kaynakları) + <b>overview_villages → trader</b> (incoming).
</div>

<div id="yro_content_v1"></div>
`;

    document.body.appendChild(el);

    document.getElementById("yro_close_v1").onclick = function () { Y.destroy(); };

    // drag
    var isDragging = false, startX = 0, startY = 0, initL = 0, initT = 0;
    var handle = document.getElementById("yro_drag_v1");
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

    document.getElementById("yro_load_v1").onclick = function () {
      if (typeof Y.main.loadAndRender === "function") Y.main.loadAndRender();
    };

    document.getElementById("yro_toggle_v1").onclick = function () {
      Y.state.ui.collapsed = !Y.state.ui.collapsed;
      Y.ui.render();
    };

    var inp = document.getElementById("yro_search_v1");
    inp.oninput = function () {
      Y.state.ui.search = inp.value || "";
      if (Y.state.computed) {
        Y.compute.run();
        Y.ui.render();
      }
    };

    var sel = document.getElementById("yro_group_v1");
    sel.onchange = function () {
      var gid = parseInt(sel.value, 10);
      if (!isFinite(gid)) gid = 0;
      Y.state.ui.groupId = gid;

      var gname = "All villages";
      for (var i = 0; i < (Y.state.groups || []).length; i++) {
        if (Y.state.groups[i].id === gid) { gname = Y.state.groups[i].name; break; }
      }
      Y.state.ui.groupName = gname;

      if (typeof Y.main.loadAndRender === "function") Y.main.loadAndRender();
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

  function cellWithIncoming(eff, inc, base) {
    // İstenen: “o an bulunan” + “yolda gelen”
    // Görsel: base kalın, (+inc) küçük, fakat toplamı da göstermek için eff yazıyoruz:
    // base (+inc) = eff
    var incTxt = inc > 0 ? (' <span class="yro_small">(+ ' + Y.util.n(inc) + ')</span>') : "";
    return "<b>" + Y.util.n(base) + "</b>" + incTxt + ' <span class="yro_small">= ' + Y.util.n(eff) + "</span>";
  }

  function buildTable() {
    var c = Y.state.computed;
    var rows = c.rows;

    var body = rows.map(function (r) {
      return `
<tr>
  <td><a href="${r.urlOverview}" target="_blank" rel="noopener noreferrer"><b>${r.name}</b></a></td>
  <td class="yro_right">${Y.util.n(r.points)}</td>
  <td class="yro_right">${Y.util.n(r.storage)}</td>
  <td class="yro_center"><b>${Y.util.n(r.merchAvail)}/${Y.util.n(r.merchTotal)}</b></td>

  <td class="yro_right">${cellWithIncoming(r.eff.wood, r.inc.wood, r.base.wood)}</td>
  <td class="yro_right">${cellWithIncoming(r.eff.stone, r.inc.stone, r.base.stone)}</td>
  <td class="yro_right">${cellWithIncoming(r.eff.iron, r.inc.iron, r.base.iron)}</td>
  <td class="yro_right"><b>${Y.util.n(r.eff.total)}</b> ${r.eff.incTotal ? `<span class="yro_small">(+ ${Y.util.n(r.eff.incTotal)})</span>` : ""}</td>
</tr>`;
    }).join("");

    var t = c.totals;
    var a = c.avgs;

    var totalsRow = `
<tr>
  <td colspan="4"><b>TOPLAM</b> <span class="yro_small">(${t.count} köy)</span></td>
  <td class="yro_right"><b>${Y.util.n(t.wood)}</b> <span class="yro_small">(+ ${Y.util.n(t.incWood)})</span></td>
  <td class="yro_right"><b>${Y.util.n(t.stone)}</b> <span class="yro_small">(+ ${Y.util.n(t.incStone)})</span></td>
  <td class="yro_right"><b>${Y.util.n(t.iron)}</b> <span class="yro_small">(+ ${Y.util.n(t.incIron)})</span></td>
  <td class="yro_right"><b>${Y.util.n(t.total)}</b> <span class="yro_small">(+ ${Y.util.n(t.incTotal)})</span></td>
</tr>`;

    var avgRow = `
<tr>
  <td colspan="4"><b>ORTALAMA</b></td>
  <td class="yro_right"><b>${Y.util.n(a.wood)}</b> <span class="yro_small">(+ ${Y.util.n(a.incWood)})</span></td>
  <td class="yro_right"><b>${Y.util.n(a.stone)}</b> <span class="yro_small">(+ ${Y.util.n(a.incStone)})</span></td>
  <td class="yro_right"><b>${Y.util.n(a.iron)}</b> <span class="yro_small">(+ ${Y.util.n(a.incIron)})</span></td>
  <td class="yro_right"><b>${Y.util.n(a.total)}</b> <span class="yro_small">(+ ${Y.util.n(a.incTotal)})</span></td>
</tr>`;

    var title = `1) Villages — Current + Incoming (${Y.state.ui.groupName})`;
    var openAttr = Y.state.ui.collapsed ? "" : "open";

    return `
<details ${openAttr}>
  <summary>${title}</summary>
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
      ${body || `<tr><td colspan="8">Köy bulunamadı (filtre/search?).</td></tr>`}
      ${totalsRow}
      ${avgRow}
    </table>
  </div>
  <div class="yro_msg" style="margin-top:8px;">
    <b>Gösterim:</b> Her hücre <b>Base</b> + <span class="yro_small">(+Incoming)</span> = <span class="yro_small">Effective</span> formatında.
  </div>
</details>`;
  }

  Y.ui.ensure = function () {
    ensurePanel();

    // group dropdown doldur
    var sel = document.getElementById("yro_group_v1");
    if (!sel) return;
    sel.innerHTML = "";

    var groups = Array.isArray(Y.state.groups) && Y.state.groups.length ? Y.state.groups : [{ id: 0, name: "All villages" }];
    for (var i = 0; i < groups.length; i++) {
      var o = document.createElement("option");
      o.value = String(groups[i].id);
      o.textContent = groups[i].name;
      sel.appendChild(o);
    }

    sel.value = String(Y.state.ui.groupId || 0);

    var inp = document.getElementById("yro_search_v1");
    if (inp) inp.value = Y.state.ui.search || "";
  };

  Y.ui.setMsg = setMsg;
  Y.ui.setProgress = setProgress;

  Y.ui.render = function () {
    var root = document.getElementById("yro_content_v1");
    if (!root) return;

    if (!Y.state.computed) {
      root.innerHTML = `<div class="yro_msg">Veri yok. “Yükle / Yenile” bas.</div>`;
      return;
    }

    root.innerHTML = buildTable();
  };
})();
