(function () {
  "use strict";

  var Y = window.__YAVER_RES_TROOPS_V1__;
  if (!Y) return;

  Y.ui = {};

  // ✅ panel biraz geniş + scroll/padding fix
  var PANEL_ID = "yaver_res_troops_panel_v2";
  var STYLE_ID = "yaver_res_troops_style_v2";

  function ensureStyle() {
    // v2 style tekrar yüklenebilsin diye: varsa sil, yeniden ekle
    try { $("#" + STYLE_ID).remove(); } catch (e) {}

    var st = document.createElement("style");
    st.id = STYLE_ID;
    st.textContent = `
      #${PANEL_ID}{
        position: fixed;
        left: 20px;
        top: 70px;
        width: 1320px; /* biraz daha sağa */
        z-index: 99999;
        max-height: 85vh;
        overflow: auto;
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
        touch-action: pan-x pan-y;
        background: #f4e4bc;
        border: 3px solid #7d510f;
        border-radius: 6px;
        padding: 6px;
        padding-right: 18px; /* ✅ scrollbar last column'u örtmesin */
        box-shadow: 0 0 15px rgba(0,0,0,.25);
      }
      #${PANEL_ID} * { box-sizing: border-box; }
      #${PANEL_ID} table.vis { width:100%; background:#f4e4bc; margin:0; }
      #${PANEL_ID} td, #${PANEL_ID} th { background: transparent; }
      #${PANEL_ID} .hdr{
        display:flex; align-items:center; justify-content:space-between;
        user-select:none;
      }
      #${PANEL_ID} .hdr_right{ display:flex; gap:8px; align-items:center; }
      #${PANEL_ID} .dev{ opacity:.85; font-style:italic; white-space:nowrap; }
      #${PANEL_ID} .gap{ height:6px; }
      #${PANEL_ID} .toolbar{ display:flex; gap:10px; align-items:center; flex-wrap:wrap; }

      #${PANEL_ID} .scroll{
        max-height: 320px;
        overflow:auto;
        overflow-x:auto;
        -webkit-overflow-scrolling:touch;
        touch-action: pan-x pan-y;
        border:1px solid rgba(0,0,0,.15);
        padding-right: 18px; /* ✅ scrollbar last column'u örtmesin */
      }

      /* ✅ boş “kolon hissi” olmasın: unit kutuları tek satırda sağa uzasın */
      #${PANEL_ID} .units_cell{
        display:flex;
        flex-wrap: nowrap;         /* ✅ wrap yok */
        gap:10px;
        align-items:flex-start;
        white-space: nowrap;       /* ✅ tek satır */
      }

      #${PANEL_ID} .unit_box{
        background:#fff5da;
        border:1px solid rgba(0,0,0,.15);
        border-radius: 6px;
        padding: 4px 6px;
        min-width: 88px;
      }
      #${PANEL_ID} .unit_box .cnt{ font-weight:bold; }
      #${PANEL_ID} .unit_box .perday{ font-size: 11px; opacity:.75; margin-top:2px; }

      #${PANEL_ID} .right{ text-align:right; }
      #${PANEL_ID} .center{ text-align:center; }
      #${PANEL_ID} .small{ font-size: 11px; opacity:.85; }

      #${PANEL_ID} .progress_outer{ width:240px; height:10px; border:1px solid rgba(0,0,0,.25); background:#fff5da; }
      #${PANEL_ID} .progress_inner{ height:10px; width:0%; background:#c6a768; }

      @media (max-width: 900px){
        #${PANEL_ID}{ left:5px; top:60px; width: calc(100vw - 10px); max-height: 90vh; }
        #${PANEL_ID} table.vis{ min-width: 980px; }
      }
    `;
    document.head.appendChild(st);
  }

  function ensurePanel() {
    ensureStyle();

    // eski paneli kaldır (v1 veya v2)
    try { $("#yaver_res_troops_panel_v1").remove(); } catch (e) {}
    try { $("#" + PANEL_ID).remove(); } catch (e2) {}

    var el = document.createElement("div");
    el.id = PANEL_ID;

    el.innerHTML = `
      <table class="vis">
        <tr>
          <th style="text-align:left;">
            <div class="hdr">
              <div>
                <span class="icon header population"></span>
                Yaver Resources: Troops <span class="grey">(v2)</span>
              </div>
              <div class="hdr_right">
                <span class="dev">Developed by controleng</span>
                <input type="button" class="btn" id="yrt_close_v1" value="X">
              </div>
            </div>
          </th>
        </tr>
        <tr>
          <td>
            <div class="toolbar">
              <input type="button" class="btn" id="yrt_load_v1" value="LOAD">
              <input type="button" class="btn" id="yrt_refresh_v1" value="REFRESH">
              <div class="progress_outer"><div class="progress_inner" id="yrt_prog_bar_v1"></div></div>
              <span class="small" id="yrt_prog_txt_v1">Hazır.</span>
            </div>
            <div id="yrt_msg_v1" class="info_box" style="margin-top:8px;">
              <div class="content">
                Bu script Account Manager (am_troops) sayfasından köy listesini alır, ardından her köy için Recruit (train) sayfasını arka planda çekerek toplam troop sayılarını çıkarır.
              </div>
            </div>
          </td>
        </tr>
      </table>

      <div class="gap"></div>

      <table class="vis">
        <tr><th style="text-align:left;">1) Köy Bazlı Toplam Troops (Total + Günlük Üretim)</th></tr>
        <tr>
          <td>
            <div class="scroll">
              <table class="vis">
                <thead>
                  <tr>
                    <th>Village</th>
                    <th style="width:1%;">Troops</th> <!-- ✅ içerik kadar -->
                    <th class="right" style="width:160px; padding-right:12px;">
                      <span class="icon header population"></span> Pop (total)
                    </th>
                  </tr>
                </thead>
                <tbody id="yrt_tbody_v1"></tbody>
              </table>
            </div>
          </td>
        </tr>
      </table>

      <div class="gap"></div>

      <table class="vis">
        <tr><th style="text-align:left;">2) Toplam Savunma (Defense) Troops</th></tr>
        <tr>
          <td>
            <table class="vis">
              <tr>
                <td id="yrt_def_units_v1"></td>
                <td class="right" style="width:180px;">
                  <span class="icon header population"></span>
                  <b id="yrt_def_pop_v1">0</b>
                </td>
              </tr>
            </table>
            <div class="small">Not: Defense seti: spear, sword, archer, heavy, <b>spy</b>.</div>
          </td>
        </tr>
      </table>

      <div class="gap"></div>

      <table class="vis">
        <tr><th style="text-align:left;">3) Toplam Saldırı (Offense) Troops</th></tr>
        <tr>
          <td>
            <table class="vis">
              <tr>
                <td id="yrt_off_units_v1"></td>
                <td class="right" style="width:180px;">
                  <span class="icon header population"></span>
                  <b id="yrt_off_pop_v1">0</b>
                </td>
              </tr>
            </table>
            <div class="small">Not: Offense seti: axe, light, marcher, ram, catapult.</div>
          </td>
        </tr>
      </table>
    `;

    document.body.appendChild(el);
    document.getElementById("yrt_close_v1").onclick = function () { Y.destroy(); };
  }

  function setProgress(done, total) {
    var bar = document.getElementById("yrt_prog_bar_v1");
    var txt = document.getElementById("yrt_prog_txt_v1");
    var pct = total > 0 ? Math.floor((done / total) * 100) : 0;
    if (bar) bar.style.width = Math.max(0, Math.min(100, pct)) + "%";
    if (txt) txt.textContent = total > 0 ? ("İndiriliyor: " + done + "/" + total + " (%" + pct + ")") : "Hazır.";
  }

  function unitBoxHTML(u, count, perDay) {
    var cnt = Number(count || 0);
    var pd = Number(perDay || 0);
    if (!(cnt > 0)) return ""; // ✅ 0 ise hiç gösterme

    return (
      '<div class="unit_box">' +
        '<div>' + Y.util.unitIconHTML(u, 18) + ' <span class="cnt">' + Y.util.n(cnt) + '</span></div>' +
        '<div class="perday">(' + Y.util.n(pd) + '/gün)</div>' +
      '</div>'
    );
  }

  Y.ui.ensure = function () { ensurePanel(); };

  Y.ui.setMsg = function (html, kind) {
    var el = document.getElementById("yrt_msg_v1");
    if (!el) return;
    kind = kind || "info";
    el.className = (kind === "ok" ? "success_box" : (kind === "err" ? "error_box" : "info_box"));
    el.innerHTML = '<div class="content">' + html + "</div>";
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
        '<td style="width:1%;"><div class="units_cell">' + (boxes.join("") || "<span class='small'>-</span>") + "</div></td>" +
        '<td class="right" style="width:160px; padding-right:12px;"><b>' + Y.util.n(pv.popTotal || 0) + "</b></td>";

      tb.appendChild(tr);
    });
  };

  function renderTotalsLine(containerId, unitList, counts, prod) {
    var box = document.getElementById(containerId);
    if (!box) return;

    var html = '<div class="units_cell">';
    unitList.forEach(function (u) {
      var c = (counts && counts[u]) || 0;
      var pd = (prod && prod[u]) || 0;
      var b = unitBoxHTML(u, c, pd);
      if (b) html += b;
    });
    html += "</div>";

    box.innerHTML = html;
  }

  Y.ui.renderTotals = function () {
    var totals = Y.state.totals;
    if (!totals) return;

    renderTotalsLine("yrt_def_units_v1", totals.def.units, totals.def.counts, totals.def.prod);
    var defPopEl = document.getElementById("yrt_def_pop_v1");
    if (defPopEl) defPopEl.textContent = Y.util.n(totals.def.pop || 0);

    renderTotalsLine("yrt_off_units_v1", totals.off.units, totals.off.counts, totals.off.prod);
    var offPopEl = document.getElementById("yrt_off_pop_v1");
    if (offPopEl) offPopEl.textContent = Y.util.n(totals.off.pop || 0);
  };

  Y.ui.bindButtons = function (onLoad, onRefresh) {
    var b1 = document.getElementById("yrt_load_v1");
    var b2 = document.getElementById("yrt_refresh_v1");
    if (b1) b1.onclick = onLoad;
    if (b2) b2.onclick = onRefresh;
  };
})();
