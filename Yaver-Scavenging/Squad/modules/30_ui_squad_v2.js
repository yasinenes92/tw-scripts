(function () {
  "use strict";

  var Y = window.__YAVER_SQUAD_V1__;
  if (!Y) return;

  Y.ui = Y.ui || {};

  var PANEL_ID = "yaver_squad_panel_v2";
  var STYLE_ID = "yaver_squad_style_v2";

  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) return;

    var st = document.createElement("style");
    st.id = STYLE_ID;
    st.textContent = `
      #${PANEL_ID}{
        margin: 10px 0;
        padding: 10px;
        background-color: #fff5da;
        border: 2px solid #7d510f;
        width: 100%;
        box-sizing: border-box;
        box-shadow: 2px 2px 5px rgba(0,0,0,0.25);
      }
      #${PANEL_ID} .ys_hdr{
        text-align:center;
        margin-top:0;
        color:#603000;
        border-bottom: 1px solid #7d510f;
        padding-bottom:5px;
      }
      #${PANEL_ID} .ys_meta{
        text-align:center;
        margin: 6px 0 10px 0;
        opacity:.85;
        font-size: 11px;
      }
      #${PANEL_ID} .ys_actions{
        text-align:right;
        margin-top: 8px;
      }
      #${PANEL_ID} .ys_scroll{
        overflow-x:auto;
        -webkit-overflow-scrolling: touch;
        touch-action: pan-x pan-y;
      }
      #${PANEL_ID} table.vis{
        width:100%;
        background:#fff5da;
      }
      #${PANEL_ID} .ys_right{ text-align:right; }
      #${PANEL_ID} .ys_center{ text-align:center; }
      #${PANEL_ID} .ys_totalrow td{
        background:#e8dcb3;
        border-top: 2px solid #cda261;
        font-weight:bold;
      }
      @media (max-width: 900px){
        #${PANEL_ID} table.vis{ min-width: 980px; }
      }
    `;
    document.head.appendChild(st);
  }

  function ensurePanel() {
    ensureStyle();

    if (document.getElementById(PANEL_ID)) return;

    var html = `
      <div id="${PANEL_ID}">
        <h3 class="ys_hdr">🛡️ Yaver Squad Raporu: Aktif Scav (v2)</h3>
        <div class="ys_meta" id="yaver_squad_meta_v2">-</div>

        <div class="ys_scroll">
          <table class="vis" id="yaver_squad_table_v2">
            <thead>
              <tr>
                <th>Village</th>
                <th class="ys_center">Active</th>
                <th class="ys_right"><span class="icon header wood"></span> Wood</th>
                <th class="ys_right"><span class="icon header stone"></span> Stone</th>
                <th class="ys_right"><span class="icon header iron"></span> Iron</th>
                <th class="ys_right"><span class="icon header res"></span> Total</th>
                <th class="ys_center"><span class="icon header time"></span> Remaining</th>
              </tr>
            </thead>
            <tbody id="yaver_squad_tbody_v2"></tbody>
          </table>
        </div>

        <div class="ys_actions">
          <button id="yaver_squad_refresh_v2" class="btn" style="cursor:pointer;">🔄 Yenile</button>
          <button id="yaver_squad_copy_v2" class="btn" style="cursor:pointer;">📋 Defter İçin Kopyala</button>
        </div>
      </div>
    `;

    $("#scavenge_mass_screen").before(html);
  }

  function setMeta(totals) {
    var serverTime = ($("#serverDate").text() || "") + " " + ($("#serverTime").text() || "");
    var t = totals || { wood:0, stone:0, iron:0, total:0, activeSquads:0 };

    $("#yaver_squad_meta_v2").html(
      "Server: <b>" + serverTime + "</b> | Active squads: <b>" + (t.activeSquads || 0) + "</b> | " +
      "<span class='icon header wood'></span> <b>" + Y.util.n(t.wood) + "</b> " +
      "<span class='icon header stone'></span> <b>" + Y.util.n(t.stone) + "</b> " +
      "<span class='icon header iron'></span> <b>" + Y.util.n(t.iron) + "</b> " +
      "<span class='icon header res'></span> <b style='color:#005c00;'>" + Y.util.n(t.total) + "</b>"
    );
  }

  function renderRows(villages, statsById, totals) {
    var tb = $("#yaver_squad_tbody_v2");
    tb.empty();

    // sort by village_name
    var arr = (villages || []).slice().sort(function(a,b){
      return String(a.village_name||"").localeCompare(String(b.village_name||""));
    });

    arr.forEach(function(v){
      var vid = String(v.village_id);
      var st = statsById.get(vid);

      var wood = st ? st.wood : 0;
      var stone = st ? st.stone : 0;
      var iron = st ? st.iron : 0;
      var total = st ? st.total : 0;
      var active = st ? st.activeCount : 0;

      var remainHtml = "<span class='yaver_rem_text_v2' data-vid='"+vid+"'>-</span>";
      if (active > 0) remainHtml = "<b><span class='yaver_rem_text_v2' data-vid='"+vid+"'>-</span></b>";

      var tr = $("<tr></tr>");
      tr.append("<td><b>" + (st ? st.village_name : (v.village_name||("#"+vid))) + "</b></td>");
      tr.append("<td class='ys_center'>" + (active || 0) + "</td>");
      tr.append("<td class='ys_right'>" + Y.util.n(wood) + "</td>");
      tr.append("<td class='ys_right'>" + Y.util.n(stone) + "</td>");
      tr.append("<td class='ys_right'>" + Y.util.n(iron) + "</td>");
      tr.append("<td class='ys_right'><b>" + Y.util.n(total) + "</b></td>");
      tr.append("<td class='ys_center'>" + remainHtml + "</td>");
      tb.append(tr);
    });

    // total row
    var tt = totals || { wood:0, stone:0, iron:0, total:0, activeSquads:0 };
    var trt = $("<tr class='ys_totalrow'></tr>");
    trt.append("<td><b>ACTIVE TOTAL</b></td>");
    trt.append("<td class='ys_center'><b>" + (tt.activeSquads||0) + "</b></td>");
    trt.append("<td class='ys_right'><b>" + Y.util.n(tt.wood) + "</b></td>");
    trt.append("<td class='ys_right'><b>" + Y.util.n(tt.stone) + "</b></td>");
    trt.append("<td class='ys_right'><b>" + Y.util.n(tt.iron) + "</b></td>");
    trt.append("<td class='ys_right'><b style='color:#005c00;'>" + Y.util.n(tt.total) + "</b></td>");
    trt.append("<td class='ys_center'><span class='grey'>(" + (tt.activeSquads||0) + " squads)</span></td>");
    tb.append(trt);
  }

  function buildBBCode(totals) {
    var serverTime = ($("#serverDate").text() || "") + " - " + ($("#serverTime").text() || "");
    var t = totals || { wood:0, stone:0, iron:0, total:0, activeSquads:0 };

    return (
      "[quote][b]🛡️ Yaver Squad Raporu[/b] (" + serverTime + ")\n" +
      "[table]\n" +
      "[**]Hammadde[||]Miktar[/**]\n" +
      "[*]🌲 Odun[|]" + Y.util.n(t.wood) + "\n" +
      "[*]🧱 Kil[|]" + Y.util.n(t.stone) + "\n" +
      "[*]⛓️ Demir[|]" + Y.util.n(t.iron) + "\n" +
      "[**]💰 TOPLAM[||]" + Y.util.n(t.total) + "[/**]\n" +
      "[*][i]Aktif scav sayısı[|]" + (t.activeSquads||0) + "[/i]\n" +
      "[/table][/quote]"
    );
  }

  Y.ui.renderPanel = function (villages, statsById, totals) {
    // Eski v1 kolon ekleme kalıntılarını temizle (bozmadan)
    try {
      $(".yaver_squad_th_v1").remove();
      $(".yaver_squad_td_v1").remove();
      $(".yaver_squad_total_row_v1").remove();
    } catch (e) {}

    ensurePanel();
    setMeta(totals);
    renderRows(villages, statsById, totals);

    // buttons
    $("#yaver_squad_refresh_v2").off("click").on("click", function(){
      try { window.__YAVER_SQUAD_V1__ && window.__YAVER_SQUAD_V1__.init && window.__YAVER_SQUAD_V1__.init(true); } catch (e) {}
    });

    $("#yaver_squad_copy_v2").off("click").on("click", function(){
      var bb = buildBBCode(totals);
      var temp = $("<textarea>");
      $("body").append(temp);
      temp.val(bb).select();
      document.execCommand("copy");
      temp.remove();
      UI && UI.SuccessMessage && UI.SuccessMessage("Rapor kopyalandı! 📋", 2500);
    });
  };

  Y.ui.updateCountdowns = function () {
    var now = Y.util.getServerNowSec();
    Y.state.maxReturnByVillageId.forEach(function (maxRt, vid) {
      var rem = Math.max(0, Number(maxRt) - now);
      var txt = (rem <= 0) ? "DONE" : Y.util.fmtHMS(rem);
      $(".yaver_rem_text_v2[data-vid='" + vid + "']").text(txt);
    });
  };
})();
