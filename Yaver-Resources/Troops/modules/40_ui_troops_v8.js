(function () {
  "use strict";

  var Y = window.__YAVER_RES_TROOPS_V1__;
  if (!Y) return;

  Y.ui = {};

  // destroy() uyumu için aynı ID’ler
  var PANEL_ID = "yaver_res_troops_panel_v2";
  var STYLE_ID = "yaver_res_troops_style_v2";

  function ensureStyle() {
    try { $("#" + STYLE_ID).remove(); } catch (e) {}

    var st = document.createElement("style");
    st.id = STYLE_ID;
    st.textContent = `
      /* ===== PANEL: dinamik boyut (fit-content yerine daha sağlam) ===== */
      #${PANEL_ID}{
        position: fixed;
        left: 20px;
        top: 70px;

        display: inline-block;
        width: auto;
        min-width: 600px;
        max-width: 98vw;
        max-height: 90vh;

        overflow: auto;
        -webkit-overflow-scrolling: touch;
        touch-action: pan-x pan-y;

        z-index: 99999;
        background: #f4e4bc;
        border: 3px solid #7d510f;
        border-radius: 6px;
        padding: 8px;
        box-shadow: 0 0 15px rgba(0,0,0,.35);
      }
      #${PANEL_ID} * { box-sizing: border-box; }
      #${PANEL_ID} .btn { cursor: pointer; }

      /* Header */
      #${PANEL_ID} .hdr{
        display:flex;
        align-items:center;
        justify-content:space-between;
        user-select:none;
        margin-bottom: 8px;
        border-bottom: 1px solid #7d510f;
        padding-bottom: 5px;
      }
      #${PANEL_ID} .dev{
        opacity:.85;
        font-style:italic;
        font-size: 11px;
        white-space:nowrap;
      }
      #${PANEL_ID} .toolbar{
        display:flex;
        gap:10px;
        align-items:center;
        flex-wrap:wrap;
        margin-bottom: 8px;
      }

      #${PANEL_ID} .progress_outer{
        width:150px; height:8px;
        border:1px solid rgba(0,0,0,.35);
        background:#fff;
        display:inline-block;
      }
      #${PANEL_ID} .progress_inner{
        height:100%; width:0%;
        background:#c6a768;
      }

      #${PANEL_ID} .msg{
        padding:5px;
        background:#fff;
        border:1px solid #ccc;
        margin-bottom:10px;
        font-size:11px;
      }

      /* ===== MAIN TABLE (Excel gibi) ===== */
      #${PANEL_ID} .scroll_wrap{
        border: 1px solid #7d510f;
        background: #fff5da;
        max-height: 50vh;
        overflow: auto;          /* hem yatay hem dikey */
        padding-right: 22px;     /* scrollbar pop'u örtmesin */
      }

      /* Tablo kesinlikle display:table (varsayılan). Width auto = içerik kadar */
      #${PANEL_ID} table.yrt_main_table{
        width: auto;
        border-collapse: collapse;
        background: #fff5da;
        margin: 0;
      }

      #${PANEL_ID} table.yrt_main_table th,
      #${PANEL_ID} table.yrt_main_table td{
        padding: 4px 8px;
        border: 1px solid #dcd0b2;
        vertical-align: middle;
        white-space: nowrap;    /* hücreler uzasın, kolon genişliği en geniş hücre kadar olsun */
      }

      #${PANEL_ID} table.yrt_main_table th{
        background: #c1a264 !important;
        background-image: none !important;
        position: sticky; /* sadece header sabit kalsın istiyorsan */
        top: 0;
        z-index: 2;
      }

      #${PANEL_ID} table.yrt_main_table tr:nth-child(even) td{
        background-color: #f0e2be;
      }

      /* Pop hücresi: scrollbar güvenliği */
      #${PANEL_ID} .pop_hdr, #${PANEL_ID} .pop_td{
        text-align:right;
        padding-right: 22px;
      }

      /* Unit kutuları */
      #${PANEL_ID} .units_cell{
        display:inline-flex;
        flex-wrap: nowrap;
        gap:6px;
        align-items:flex-start;
      }
      #${PANEL_ID} .unit_box{
        background: #eaddbd;
        border: 1px solid #c7b99c;
        border-radius: 4px;
        padding: 2px 5px;
        display: inline-block;
        min-width: 70px;
        text-align: left;
      }
      #${PANEL_ID} .unit_box .cnt{ font-weight:bold; color:#000; }
      #${PANEL_ID} .unit_box .perday{ font-size: 10px; color:#555; }

      /* ===== SUMMARY (Def/Off): Pop kutusu askerlerin hemen sağında ===== */
      #${PANEL_ID} .summary_box{
        background: #fff5da;
        border: 1px solid #7d510f;
        padding: 6px;
        display:flex;
        align-items:flex-start;
        justify-content:flex-start;
        gap:12px;
      }
      #${PANEL_ID} .summary_left{
        flex: 0 1 auto;     /* ✅ artık “sonsuz” genişlemesin → boşluk yaratmasın */
        display:flex;
        flex-wrap: wrap;
        gap:6px;
      }
      #${PANEL_ID} .summary_right{
        flex: 0 0 auto;
        margin-left: 12px;  /* ✅ askerlerin hemen sağı */
        white-space: nowrap;
        text-align: right;
        font-weight: bold;
        background: rgba(0,0,0,0.05);
        padding: 4px 8px;
        border-radius: 4px;
        min-width: 100px;
      }

      /* Mobil */
      @media (max-width: 900px){
        #${PANEL_ID}{
          left:5px; top:60px;
          min-width: calc(100vw - 10px);
          max-width: calc(100vw - 10px);
          max-height: 92vh;
        }
      }
    `;
    document.head.appendChild(st);
  }

  function ensurePanel() {
    ensureStyle();
    try { $("#yaver_res_troops_panel_v1").remove(); } catch (e) {}
    try { $("#" + PANEL_ID).remove(); } catch (e2) {}

    var el = document.createElement("div");
    el.id = PANEL_ID;

    el.innerHTML = `
      <div class="hdr" id="yrt_drag_handle" style="cursor:move;">
        <div style="font-weight:bold; font-size:14px;">
          <span class="icon header population"></span>
          Yaver Troop Counter <span style="color:#555; font-size:11px;">(v8)</span>
        </div>
        <div style="display:flex; align-items:center; gap:10px;">
          <span class="dev">Developed by controleng</span>
          <button id="yrt_close_v1" class="btn">X</button>
        </div>
      </div>

      <div class="toolbar">
        <button id="yrt_load_v1" class="btn btn-confirm">LOAD</button>
        <button id="yrt_refresh_v1" class="btn">REFRESH</button>
        <div class="progress_outer"><div class="progress_inner" id="yrt_prog_bar_v1"></div></div>
        <span id="yrt_prog_txt_v1" style="font-size:11px;">Waiting...</span>
      </div>

      <div id="yrt_msg_v1" class="msg">Ready. (Panel auto-sizes to content.)</div>

      <div style="background:#e3d5b3; padding:4px; font-weight:bold; border:1px solid #7d510f; border-bottom:none;">
        1) Troops by Village
      </div>
      <div class="scroll_wrap">
        <table class="yrt_main_table">
          <thead>
            <tr>
              <th>Village</th>
              <th>Troops (Current / Daily)</th>
              <th class="pop_hdr"><span class="icon header population"></span> Total Pop</th>
            </tr>
          </thead>
          <tbody id="yrt_tbody_v1"></tbody>
        </table>
      </div>

      <div style="height:10px;"></div>

      <div style="background:#e3d5b3; padding:4px; font-weight:bold; border:1px solid #7d510f; border-bottom:none;">
        2) Total Defense
      </div>
      <div class="summary_box">
        <div class="summary_left" id="yrt_def_units_v1"></div>
        <div class="summary_right">
          <div><span class="icon header population"></span> Total Pop</div>
          <div id="yrt_def_pop_v1" style="font-size:14px; margin-top:2px;">0</div>
        </div>
      </div>

      <div style="height:10px;"></div>

      <div style="background:#e3d5b3; padding:4px; font-weight:bold; border:1px solid #7d510f; border-bottom:none;">
        3) Total Offense
      </div>
      <div class="summary_box">
        <div class="summary_left" id="yrt_off_units_v1"></div>
        <div class="summary_right">
          <div><span class="icon header population"></span> Total Pop</div>
          <div id="yrt_off_pop_v1" style="font-size:14px; margin-top:2px;">0</div>
        </div>
      </div>
    `;

    document.body.appendChild(el);
    document.getElementById("yrt_close_v1").onclick = function () { Y.destroy(); };

    // Drag (basit)
    var handle = document.getElementById("yrt_drag_handle");
    var isDragging = false, startX, startY, initLeft, initTop;

    handle.onmousedown = function (e) {
      if ((e.target && e.target.tagName) === "BUTTON") return;
      isDragging = true;
      startX = e.clientX; startY = e.clientY;
      var rect = el.getBoundingClientRect();
      initLeft = rect.left; initTop = rect.top;
      e.preventDefault();
    };
    window.onmousemove = function (e) {
      if (!isDragging) return;
      el.style.left = (initLeft + e.clientX - startX) + "px";
      el.style.top = (initTop + e.clientY - startY) + "px";
    };
    window.onmouseup = function () { isDragging = false; };
  }

  function setProgress(done, total) {
    var bar = document.getElementById("yrt_prog_bar_v1");
    var txt = document.getElementById("yrt_prog_txt_v1");
    var pct = total > 0 ? Math.floor((done / total) * 100) : 0;
    if (bar) bar.style.width = pct + "%";
    if (txt) txt.textContent = total > 0 ? (done + "/" + total ) : "Ready.";
  }

  function unitBoxHTML(u, count, perDay) {
    var cnt = Number(count || 0);
    var pd = Number(perDay || 0);
    if (!(cnt > 0)) return "";

    return (
      '<div class="unit_box">' +
        '<div>' + Y.util.unitIconHTML(u, 14) + ' <span class="cnt">' + Y.util.n(cnt) + '</span></div>' +
        '<div class="perday">+' + Y.util.n(pd) + '/day</div>' +
      '</div>'
    );
  }

  Y.ui.ensure = function () { ensurePanel(); };

  Y.ui.setMsg = function (html, kind) {
    var el = document.getElementById("yrt_msg_v1");
    if (!el) return;
    el.innerHTML = html;
    el.style.color = (kind === "err") ? "red" : (kind === "ok" ? "green" : "black");
  };

  Y.ui.setProgress = setProgress;

  Y.ui.renderPerVillage = function () {
    var tb = document.getElementById("yrt_tbody_v1");
    if (!tb) return;
    tb.innerHTML = "";

    var arr = Array.from(Y.state.perVillage.values()).sort(function (a, b) {
      return String(a.name || "").localeCompare(String(b.name || ""));
    });

    arr.forEach(function (pv) {
      var boxes = [];
      Y.cfg.ALL_UNITS.forEach(function (u) {
        var c = (pv.units && pv.units[u]) || 0;
        var pd = (pv.prodDay && pv.prodDay[u]) || 0;
        var box = unitBoxHTML(u, c, pd);
        if (box) boxes.push(box);
      });

      var tr = document.createElement("tr");
      tr.innerHTML =
        "<td><b>" + pv.name + "</b></td>" +
        "<td><div class='units_cell'>" + (boxes.join("") || "-") + "</div></td>" +
        "<td class='pop_td'><b>" + Y.util.n(pv.popTotal || 0) + "</b></td>";
      tb.appendChild(tr);
    });
  };

  function renderTotalsLine(containerId, unitList, counts, prod) {
    var box = document.getElementById(containerId);
    if (!box) return;

    var html = "";
    unitList.forEach(function (u) {
      var c = (counts && counts[u]) || 0;
      var pd = (prod && prod[u]) || 0;
      html += unitBoxHTML(u, c, pd);
    });
    box.innerHTML = html || "-";
  }

  Y.ui.renderTotals = function () {
    var totals = Y.state.totals;
    if (!totals) return;

    renderTotalsLine("yrt_def_units_v1", totals.def.units, totals.def.counts, totals.def.prod);
    var defPop = document.getElementById("yrt_def_pop_v1");
    if (defPop) defPop.textContent = Y.util.n(totals.def.pop || 0);

    renderTotalsLine("yrt_off_units_v1", totals.off.units, totals.off.counts, totals.off.prod);
    var offPop = document.getElementById("yrt_off_pop_v1");
    if (offPop) offPop.textContent = Y.util.n(totals.off.pop || 0);
  };

  Y.ui.bindButtons = function (onLoad, onRefresh) {
    var b1 = document.getElementById("yrt_load_v1");
    var b2 = document.getElementById("yrt_refresh_v1");
    if (b1) b1.onclick = onLoad;
    if (b2) b2.onclick = onRefresh;
  };

})();
