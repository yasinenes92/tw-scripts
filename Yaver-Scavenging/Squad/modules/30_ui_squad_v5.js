(function () {
  "use strict";

  var Y = window.__YAVER_SQUAD_V1__;
  if (!Y) return;

  Y.ui = Y.ui || {};

  // ====== KRITIK FIX: server now hesabini duzelt ======
  // Timing.getCurrentServerTime() oyunda number(ms) döner. Date sanıp getTime çağırmayacağız.
  Y.util.getServerNowSec = function () {
    try {
      if (window.Timing && typeof Timing.getCurrentServerTime === "function") {
        var v = Timing.getCurrentServerTime();
        if (typeof v === "number" && isFinite(v)) return Math.floor(v / 1000);
        if (v && typeof v.getTime === "function") return Math.floor(v.getTime() / 1000);
      }
    } catch (e) {}

    // fallback: serverDate/serverTime -> UTC epoch olarak yorumla (local timezone tuzagindan kurtul)
    try {
      var t = ($("#serverTime").text() || "").trim();   // HH:MM:SS
      var d2 = ($("#serverDate").text() || "").trim();  // dd/mm/yyyy
      var m = d2.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
      var t2 = t.match(/^(\d{2}):(\d{2}):(\d{2})$/);
      if (m && t2) {
        var dd = parseInt(m[1], 10), mm = parseInt(m[2], 10), yy = parseInt(m[3], 10);
        var hh = parseInt(t2[1], 10), mi = parseInt(t2[2], 10), ss = parseInt(t2[3], 10);
        return Math.floor(Date.UTC(yy, mm - 1, dd, hh, mi, ss) / 1000);
      }
    } catch (e2) {}

    return Math.floor(Date.now() / 1000);
  };

  var PANEL_ID = "yaver_squad_panel_v5";
  var STYLE_ID = "yaver_squad_style_v5";

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
        opacity:.92;
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

    // eski panel ve stilleri kaldır
    try {
      $("#yaver_squad_panel_v2").remove();
      $("#yaver_squad_panel_v3").remove();
      $("#yaver_squad_panel_v4").remove();
      $("#yaver_squad_style_v2").remove();
      $("#yaver_squad_style_v3").remove();
      $("#yaver_squad_style_v4").remove();
    } catch (e) {}

    if (document.getElementById(PANEL_ID)) return;

    var html = `
      <div id="${PANEL_ID}">
        <h3 class="ys_hdr">🛡️ Yaver Squad Report: Active Scav (v5)</h3>

        <div class="ys_meta" id="yaver_squad_meta_v5">
          <div>
            Server: <b id="ys_server_ts_v5">-</b>
            &nbsp;|&nbsp; Active squads: <b id="ys_active_cnt_v5">0</b>
            &nbsp;|&nbsp;
            <span class="icon header wood"></span> <b id="ys_tot_w_v5">0</b>
            <span class="icon header stone"></span> <b id="ys_tot_s_v5">0</b>
            <span class="icon header iron"></span> <b id="ys_tot_i_v5">0</b>
            <span class="icon header res"></span> <b id="ys_tot_all_v5" style="color:#005c00;">0</b>
          </div>
          <div style="margin-top:4px;">
            <b>Next finish (Server):</b> <span style="color:#005c00;"><b id="ys_next_server_v5">-</b></span>
            &nbsp;|&nbsp; <b>Remaining:</b> <b id="ys_next_rem_v5">-</b>
          </div>
        </div>

        <div class="ys_scroll">
          <table class="vis" id="yaver_squad_table_v5">
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
            <tbody id="yaver_squad_tbody_v5"></tbody>
          </table>
        </div>

        <div class="ys_actions">
          <button id="yaver_squad_refresh_v5" class="btn" style="cursor:pointer;">🔄 Refresh</button>
          <button id="yaver_squad_copy_v5" class="btn" style="cursor:pointer;">📋 Copy for Notes</button>
        </div>
      </div>
    `;
    $("#scavenge_mass_screen").before(html);
  }

  function fmtServerDateTime(epochSec) {
    if (!(epochSec > 0)) return "-";
    var d = new Date(epochSec * 1000);
    var dd = String(d.getUTCDate()).padStart(2, "0");
    var mm = String(d.getUTCMonth() + 1).padStart(2, "0");
    var yy = d.getUTCFullYear();
    var hh = String(d.getUTCHours()).padStart(2, "0");
    var mi = String(d.getUTCMinutes()).padStart(2, "0");
    var ss = String(d.getUTCSeconds()).padStart(2, "0");
    return dd + "/" + mm + "/" + yy + " " + hh + ":" + mi + ":" + ss;
  }

  function computeMinMaxReturnForVillage(village) {
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

  function findNearestFinishRt(villages) {
    var nearestRt = 0;
    (villages || []).forEach(function (v) {
      var mm = computeMinMaxReturnForVillage(v);
      if (mm.minRt > 0) {
        if (nearestRt === 0 || mm.minRt < nearestRt) nearestRt = mm.minRt;
      }
    });
    return nearestRt;
  }

  function setMeta(totals, nearestRtSec) {
    var serverTime = ($("#serverDate").text() || "") + " " + ($("#serverTime").text() || "");
    var t = totals || { wood:0, stone:0, iron:0, total:0, activeSquads:0 };

    $("#ys_server_ts_v5").text(serverTime);
    $("#ys_active_cnt_v5").text(String(t.activeSquads || 0));
    $("#ys_tot_w_v5").text(Y.util.n(t.wood || 0));
    $("#ys_tot_s_v5").text(Y.util.n(t.stone || 0));
    $("#ys_tot_i_v5").text(Y.util.n(t.iron || 0));
    $("#ys_tot_all_v5").text(Y.util.n(t.total || 0));

    Y.state.__nearestRtSec = nearestRtSec || 0;
    $("#ys_next_server_v5").text(fmtServerDateTime(nearestRtSec || 0));

    var now = Y.util.getServerNowSec();
    var rem = (nearestRtSec > 0) ? Math.max(0, nearestRtSec - now) : 0;
    $("#ys_next_rem_v5").text(nearestRtSec > 0 ? Y.util.fmtHMS(rem) : "-");
  }

  function renderRows(villages, statsById, totals) {
    var tb = $("#yaver_squad_tbody_v5");
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

      var remainSpan = "<span class='yaver_rem_rng_v5' data-vid='"+vid+"' data-minrt='"+(mm.minRt||0)+"' data-maxrt='"+(mm.maxRt||0)+"'>-</span>";

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
      "[quote][b]🛡️ Yaver Squad Report[/b] (" + serverTime + ")\n" +
      "[table]\n" +
      "[**]Resource[||]Amount[/**]\n" +
      "[*]🌲 Wood[|]" + Y.util.n(t.wood) + "\n" +
      "[*]🧱 Stone[|]" + Y.util.n(t.stone) + "\n" +
      "[*]⛓️ Iron[|]" + Y.util.n(t.iron) + "\n" +
      "[**]💰 TOTAL[||]" + Y.util.n(t.total) + "[/**]\n" +
      "[*][i]Active squads[|]" + (t.activeSquads||0) + "[/i]\n" +
      "[/table][/quote]"
    );
  }

  Y.ui.renderPanel = function (villages, statsById, totals) {
    ensurePanel();

    var nearestRt = findNearestFinishRt(villages);
    setMeta(totals, nearestRt);
    renderRows(villages, statsById, totals);

    $("#yaver_squad_refresh_v5").off("click").on("click", function(){
      try { window.__YAVER_SQUAD_V1__ && window.__YAVER_SQUAD_V1__.init && window.__YAVER_SQUAD_V1__.init(true); } catch (e) {}
    });

    $("#yaver_squad_copy_v5").off("click").on("click", function(){
      var bb = buildBBCode(totals);
      var temp = $("<textarea>");
      $("body").append(temp);
      temp.val(bb).select();
      document.execCommand("copy");
      temp.remove();
      UI && UI.SuccessMessage && UI.SuccessMessage("Report copied! 📋", 2500);
    });
  };

  Y.ui.updateCountdowns = function () {
    var now = Y.util.getServerNowSec();

    $(".yaver_rem_rng_v5").each(function () {
      var $el = $(this);
      var minRt = Number($el.attr("data-minrt") || 0);
      var maxRt = Number($el.attr("data-maxrt") || 0);

      if (!(minRt > 0) || !(maxRt > 0)) {
        $el.text("-");
        return;
      }

      var remMin = Math.max(0, minRt - now);
      var remMax = Math.max(0, maxRt - now);

      // Tek aktif option varsa aralık yerine tek değer göster
      if (minRt === maxRt) {
        $el.text(Y.util.fmtHMS(remMin));
      } else {
        $el.text(Y.util.fmtHMS(remMin) + " - " + Y.util.fmtHMS(remMax));
      }
    });

    // En yakın bitiş kalanını canlı güncelle
    var nrt = Number(Y.state.__nearestRtSec || 0);
    if (nrt > 0) {
      $("#ys_next_rem_v5").text(Y.util.fmtHMS(Math.max(0, nrt - now)));
    }
  };
})();
