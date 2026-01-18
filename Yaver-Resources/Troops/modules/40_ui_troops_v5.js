(function () {
  "use strict";

  var Y = window.__YAVER_RES_TROOPS_V1__;
  if (!Y) return;

  Y.ui = {};

  // Mevcut destroy() uyumu için aynı PANEL_ID + STYLE_ID kullanıyoruz.
  var PANEL_ID = "yaver_res_troops_panel_v2";
  var STYLE_ID = "yaver_res_troops_style_v2";

  function ensureStyle() {
    try { $("#" + STYLE_ID).remove(); } catch (e) {}

    var st = document.createElement("style");
    st.id = STYLE_ID;
    st.textContent = `
      /* PANEL */
      #${PANEL_ID}{
        position: fixed;
        left: 20px;
        top: 70px;
        width: 1280px;
        z-index: 99999;
        max-height: 85vh;
        overflow: auto;
        -webkit-overflow-scrolling: touch;
        touch-action: pan-x pan-y;
        background: #f4e4bc;
        border: 3px solid #7d510f;
        border-radius: 6px;
        padding: 8px;
        box-shadow: 0 0 15px rgba(0,0,0,.35);
      }
      #${PANEL_ID} *{ box-sizing:border-box; }
      #${PANEL_ID} td, #${PANEL_ID} th{ vertical-align: top; }

      /* Header */
      #${PANEL_ID} .hdr{
        display:flex;
        align-items:center;
        justify-content:space-between;
        user-select:none;
        border-bottom: 1px solid #7d510f;
        padding-bottom: 6px;
        margin-bottom: 8px;
      }
      #${PANEL_ID} .hdr_left{
        font-weight:bold;
        font-size:14px;
        color:#603000;
      }
      #${PANEL_ID} .hdr_right{
        display:flex;
        align-items:center;
        gap:10px;
      }
      #${PANEL_ID} .dev{
        opacity:.85;
        font-style:italic;
        font-size: 11px;
        white-space:nowrap;
      }

      /* Toolbar */
      #${PANEL_ID} .toolbar{
        display:flex;
        gap:10px;
        align-items:center;
        flex-wrap:wrap;
        margin-bottom: 8px;
      }
      #${PANEL_ID} .progress_outer{
        width:200px; height:8px;
        border:1px solid rgba(0,0,0,.35);
        background:#fff5da;
        display:inline-block;
      }
      #${PANEL_ID} .progress_inner{ height:100%; width:0%; background:#c6a768; }

      /* Message box */
      #${PANEL_ID} .msg{
        padding:6px;
        background:#fff5da;
        border:1px solid rgba(0,0,0,.2);
        font-size:11px;
        margin-bottom: 10px;
      }

      /* Section header */
      #${PANEL_ID} .sec_hdr{
        background:#e3d5b3;
        padding:4px 6px;
        font-weight:bold;
        border:1px solid #7d510f;
        border-bottom:none;
      }

      /* ======= MAIN TABLE WRAP (Excel-like widths) =======
         Kritik: tablo display:table kalıyor.
         Shrink-to-fit için wrapper inline-block.
      */
      #${PANEL_ID} .scroll_wrap{
        border:1px solid #7d510f;
        background:#fff5da;
        max-height: 350px;
        overflow: auto;           /* hem yatay hem dikey */
        padding-right: 22px;      /* scrollbar Pop'u örtmesin */
      }
      #${PANEL_ID} .table_shrink{
        display:inline-block;     /* tablo içeriğe göre küçülsün */
      }
      #${PANEL_ID} table.yrt_main_table{
        width: auto;              /* içerik kadar */
        border-collapse: collapse;
        background:#fff5da;
        margin:0;
      }
      #${PANEL_ID} table.yrt_main_table th,
      #${PANEL_ID} table.yrt_main_table td{
        padding:4px 8px;
        border:1px solid #dcd0b2;
        white-space: nowrap;      /* Excel gibi satır kırma yok (hücre genişler) */
        vertical-align: top;
      }
      #${PANEL_ID} table.yrt_main_table th{
        background:#c1a264 !important;
        background-image:none !important;
      }
      #${PANEL_ID} table.yrt_main_table tr:nth-child(even) td{
        background-color:#f0e2be;
      }
      #${PANEL_ID} .pop_hdr, #${PANEL_ID} .pop_td{
        text-align:right;
        padding-right:22px;       /* scrollbar güvenliği */
      }

      /* Troops boxes */
      #${PANEL_ID} .units_cell{
        display:inline-flex;
        flex-wrap: nowrap;        /* çok uzarsa yatay scroll */
        gap:8px;
        align-items:flex-start;
      }
      #${PANEL_ID} .unit_box{
        background:#eaddbd;
        border:1px solid #c7b99c;
        border-radius: 4px;
        padding:2px 6px;
        min-width: 78px;
        text-align:left;
      }
      #${PANEL_ID} .unit_box .cnt{ font-weight:bold; color:#000; }
      #${PANEL_ID} .unit_box .perday{ font-size:10px; color:#555; }

      /* ======= SUMMARY (Def/Off) Flexbox ======= */
      #${PANEL_ID} .summary_box{
        background:#fff5da;
        border:1px solid #7d510f;
        padding:6px;
        display:flex;
        align-items:flex-start;
        justify-content:space-between;
        gap:12px;
      }
      #${PANEL_ID} .summary_left{
        flex:1;
        display:flex;
        flex-wrap: wrap;          /* burada wrap serbest: çakışma olmaz */
        gap:6px;
        align-items:flex-start;
      }
      #${PANEL_ID} .summary_right{
        white-space:nowrap;
        text-align:right;
        font-weight:bold;
        background: rgba(0,0,0,0.05);
        padding:4px 8px;
        border-radius:4px;
        min-width: 140px;
      }

      /* Mobile */
      @media (max-width: 900px){
        #${PANEL_ID}{ left:5px; top:60px; width: calc(100vw - 10px); max-height: 90vh; }
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
      <div class="hdr">
        <div class="hdr_left">
          <span class="icon header population"></span>
          Yaver Resources: Troops <span class="grey" style="font-size:11px;">(v5)</span>
        </div>
        <div class="hdr_right">
          <span class="dev">Developed by controleng</span>
          <input type="button" class="btn" id="yrt_close_v1" value="X">
        </div>
      </div>

      <div class="toolbar">
        <input type="button" class="btn" id="yrt_load_v1" value="LOAD">
        <input type="button" class="btn" id="yrt_refresh_v1" value="REFRESH">
        <div class="progress_outer"><div class="progress_inner" id="yrt_prog_bar_v1"></div></div>
        <span id="yrt_prog_txt_v1" style="font-size:11px;">Hazır.</span>
      </div>

      <div id="yrt_msg_v1" class="msg">
        Hazır. (Kaynak: am_troops köy listesi + train sayfası troop total + build_time)
      </div>

      <div class="sec_hdr">1) Köy Bazlı Toplam Troops (Total + Günlük Üretim)</div>
      <div class="scroll_wrap">
        <div class="table_shrink">
          <table class="yrt_main_table">
            <thead>
              <tr>
                <th>Köy Adı</th>
                <th>Askerler (Mevcut / Günlük)</th>
                <th class="pop_hdr"><span class="icon header population"></span> Pop (Total)</th>
              </tr>
            </thead>
            <tbody id="yrt_tbody_v1"></tbody>
          </table>
        </div>
      </div>

      <div style="height:10px;"></div>

      <div class="sec_hdr">2) Toplam Savunma (Defense)</div>
      <div class="summary_box">
        <div class="summary_left" id="yrt_def_units_v1"></div>
        <div class="summary_right">
          <div><span class="icon header population"></span> Total Pop</div>
          <div id="yrt_def_pop_v1" style="font-size:14px; margin-top:2px;">0</div>
        </div>
      </div>

      <div style="height:10px;"></div>

      <div class="sec_hdr">3) Toplam Saldırı (Offense)</div>
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
  }

  function setProgress(done, total) {
    var bar = document.getElementById("yrt_prog_bar_v1");
    var txt = document.getElementById("yrt_prog_txt_v1");
    var pct = total > 0 ? Math.floor((done / total) * 100) : 0;
    if (bar) bar.style.width = Math.max(0, Math.min(100, pct)) + "%";
    if (txt) txt.textContent = total > 0 ? (done + "/" + total + " (%" + pct + ")") : "Hazır.";
  }

  function unitBoxHTML(u, count, perDay) {
    var cnt = Number(count || 0);
    var pd = Number(perDay || 0);
    if (!(cnt > 0)) return ""; // 0 ise hiç gösterme

    return (
      '<div class="unit_box">' +
        '<div>' + Y.util.unitIconHTML(u, 14) + ' <span class="cnt">' + Y.util.n(cnt) + '</span></div>' +
        '<div class="perday">+' + Y.util.n(pd) + '/gün</div>' +
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
        "<td><div class='units_cell'>" + (boxes.join("") || "<span style='font-size:11px;color:#555;'>-</span>") + "</div></td>" +
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
    box.innerHTML = html || "<span style='font-size:11px;color:#555;'>-</span>";
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
