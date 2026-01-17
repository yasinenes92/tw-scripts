(function () {
  "use strict";

  var Y = window.__YAVER_SQUAD_V1__;
  if (!Y) return;

  Y.ui = Y.ui || {};

  var PANEL_ID = "yaver_squad_panel_v3";
  var STYLE_ID = "yaver_squad_style_v3";

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
        opacity:.9;
        font-size: 11px;
        line-height: 1.35;
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
      #${PANEL_ID} table.vis{ width:100%; background:#fff5da; }
      #${PANEL_ID} .ys_right{ text-align:right; }
      #${PANEL_ID} .ys_center{ text-align:center; }
      #${PANEL_ID} .ys_totalrow td{
        background:#e8dcb3;
        border-top: 2px solid #cda261;
        font-weight:bold;
      }
      @media (max-width: 900px){
        #${PANEL_ID} table.vis{ min-width: 1050px; }
      }
    `;
    document.head.appendChild(st);
  }

  function ensurePanel() {
    ensureStyle();

    // eski paneli temizle
    try { $("#yaver_squad_panel_v2").remove(); } catch (e) {}

    if (document.getElementById(PANEL_ID)) return;

    var html = `
      <div id="${PANEL_ID}">
        <h3 class="ys_hdr">🛡️ Yaver Squad Raporu: Aktif Scav (v3)</h3>
        <div class="ys_meta" id="yaver_squad_meta_v3">-</div>

        <div class="ys_scroll">
          <table class="vis" id="yaver_squad_table_v3">
            <thead>
              <tr>
                <th>Village</th>
                <th class="ys_center">Active</th>
                <th class="ys_right"><span class="icon header wood"></span> Wood</th>
                <th class="ys_right"><span class="icon header stone"></span> Stone</th>
                <th class="ys_right"><span class="icon header iron"></span> Iron</th>
                <th class="ys_right"><span class="icon header res"></span> Total</th>
                <th class="ys_center"><span class="icon header time"></span> Remaining (min-max)</th>
              </tr>
            </thead>
            <tbody id="yaver_squad_tbody_v3"></tbody>
          </table>
        </div>

        <div class="ys_actions">
          <button id="yaver_squad_refresh_v3" class="btn" style="cursor:pointer;">🔄 Yenile</button>
          <button id="yaver_squad_copy_v3" class="btn" style="cursor:pointer;">📋 Defter İçin Kopyala</button>
        </div>
      </div>
    `;
    $("#scavenge_mass_screen").before(html);
  }

  function getTRNowSecFromServer() {
    // oyun saatinden TR saatine +3 saat sabit ofset (senin dediğin gibi)
    // (daha genel istersen sonra otomatik ofset ölçeriz)
    var serverNow = Y.util.getServerNowSec();
    return serverNow + 3 * 3600;
  }

  function fmtTRTimeHHMMSS(trEpochSec) {
    // epoch sec -> "HH:MM:SS" TR
    var d = new Date(trEpochSec * 1000);
    var hh = String(d.getHours()).padStart(2, "0");
    var mm = String(d.getMinutes()).padStart(2, "0");
    var ss = String(d.getSeconds()).padStart(2, "0");
    return hh + ":" + mm + ":" + ss;
  }

  function setMeta(totals, nearest) {
    var serverTime = ($("#serverDate").text() || "") + " " + ($("#serverTime").text() || "");
    var t = totals || { wood:0, stone:0, iron:0, total:0, activeSquads:0 };

    var extra = "";
    if (nearest && nearest.nearestRtSec > 0) {
      var trEnd = (nearest.nearestRtSec + 3 * 3600);
      extra =
        "<br><b>En yakın bitiş (TR):</b> " +
        "<span style='color:#005c00;'><b>" + fmtTRTimeHHMMSS(trEnd) + "</b></span>" +
        " &nbsp;|&nbsp; <b>Kalan:</b> " + Y.util.fmtHMS(nearest.nearestRemainSec);
    }

    $("#yaver_squad_meta_v3").html(
      "Server: <b>" + serverTime + "</b> | Active squads: <b>" + (t.activeSquads || 0) + "</b> | " +
      "<span class='icon header wood'></span> <b>" + Y.util.n(t.wood) + "</b> " +
      "<span class='icon header stone'></span> <b>" + Y.util.n(t.stone) + "</b> " +
      "<span class='icon header iron'></span> <b>" + Y.util.n(t.iron) + "</b> " +
      "<span class='icon header res'></span> <b style='color:#005c00;'>" + Y.util.n(t.total) + "</b>" +
      extra
    );
  }

  function computeMinMaxReturnForVillage(village) {
    // village.options[opt].scavenging_squad.return_time
    var minRt = 0, maxRt = 0;
    var active = 0;

    try {
      var rts = [];
      if (village && village.options) {
        Object.keys(village.options).forEach(function (k) {
          var opt = village.options[k];
          if (opt && opt.scavenging_squad && opt.scavenging_squad.return_time) {
            var rt = Number(opt.scavenging_squad.return_time || 0);
            if (rt > 0) rts.push(rt);
            active++;
          }
        });
      }
      if (rts.length) {
        minRt = Math.min.apply(null, rts);
        maxRt = Math.max.apply(null, rts);
      }
    } catch (e) {}

    return { minRt: minRt, maxRt: maxRt, active: active };
  }

  function findNearestFinish(villages) {
    var now = Y.util.getServerNowSec();
    var nearestRt = 0;

    (villages || []).forEach(function (v) {
      var mm = computeMinMaxReturnForVillage(v);
      if (mm.minRt > 0) {
        if (nearestRt === 0 || mm.minRt < nearestRt) nearestRt = mm.minRt;
      }
    });

    return {
      nearestRtSec: nearestRt,
      nearestRemainSec: nearestRt > 0 ? Math.max(0, nearestRt - now) : 0
    };
  }

  function renderRows(villages, statsById, totals) {
    var tb = $("#yaver_squad_tbody_v3");
    tb.empty();

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

      var mm = computeMinMaxReturnForVillage(v);

      var remainSpan = "<span class='yaver_rem_rng_v3' data-vid='"+vid+"' data-minrt='"+(mm.minRt||0)+"' data-maxrt='"+(mm.maxRt||0)+"'>-</span>";

      var tr = $("<tr></tr>");
      tr.append("<td><b>" + (st ? st.village_name : (v.village_name||("#"+vid))) + "</b></td>");
      tr.append("<td class='ys_center'>" + (mm.active || 0) + "</td>");
      tr.append("<td class='ys_right'>" + Y.util.n(wood) + "</td>");
      tr.append("<td class='ys_right'>" + Y.util.n(stone) + "</td>");
      tr.append("<td class='ys_right'>" + Y.util.n(iron) + "</td>");
      tr.append("<td class='ys_right'><b>" + Y.util.n(total) + "</b></td>");
      tr.append("<td class='ys_center'>" + remainSpan + "</td>");
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
    ensurePanel();

    var nearest = findNearestFinish(villages);
    setMeta(totals, nearest);
    renderRows(villages, statsById, totals);

    // buttons
    $("#yaver_squad_refresh_v3").off("click").on("click", function(){
      try { window.__YAVER_SQUAD_V1__ && window.__YAVER_SQUAD_V1__.init && window.__YAVER_SQUAD_V1__.init(true); } catch (e) {}
    });

    $("#yaver_squad_copy_v3").off("click").on("click", function(){
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

    $(".yaver_rem_rng_v3").each(function () {
      var $el = $(this);
      var minRt = Number($el.attr("data-minrt") || 0);
      var maxRt = Number($el.attr("data-maxrt") || 0);

      if (!(minRt > 0) || !(maxRt > 0)) {
        $el.text("-");
        return;
      }

      var remMin = Math.max(0, minRt - now);
      var remMax = Math.max(0, maxRt - now);

      $el.text(Y.util.fmtHMS(remMin) + " - " + Y.util.fmtHMS(remMax));
    });

    // meta içindeki "en yakın kalan" her saniye güncellenmiş olsun diye meta'yı yeniden yazmayacağız
    // (yenile butonu zaten var). İstersen bunu da canlı güncelleyebiliriz.
  };
})();
