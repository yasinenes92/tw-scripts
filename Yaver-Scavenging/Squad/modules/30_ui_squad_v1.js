(function () {
  "use strict";

  var Y = window.__YAVER_SQUAD_V1__;
  if (!Y) return;

  Y.ui = {};

  function ensureSummaryBox(totals) {
    var id = "yaver_squad_summary_v1";
    if ($("#" + id).length) $("#" + id).remove();

    function n(x) { return Y.util.n(x); }

    var serverText = ($("#serverDate").text() || "") + " " + ($("#serverTime").text() || "");
    var html =
      '<div id="' + id + '" class="vis" style="margin:10px 0; padding:10px; background-color:#fff5da; border:2px solid #7d510f; box-sizing:border-box; box-shadow:2px 2px 5px rgba(0,0,0,0.2);">' +
        '<h3 style="text-align:center; margin-top:0; color:#603000; border-bottom:1px solid #7d510f; padding-bottom:5px;">🛡️ Yaver Squad Raporu: Aktif Scav</h3>' +
        '<div class="small" style="text-align:center; margin-bottom:8px; opacity:.85;">Server: ' + serverText + ' | Active squads: <b>' + (totals.activeSquads || 0) + '</b></div>' +
        '<table style="width:100%; text-align:center; font-weight:bold; font-size:14px;">' +
          '<tr>' +
            '<td style="padding:5px; width:25%;"><span class="icon header wood"></span> <span style="color:#603000;">Odun</span><br><span style="font-size:16px;">' + n(totals.wood) + '</span></td>' +
            '<td style="padding:5px; width:25%;"><span class="icon header stone"></span> <span style="color:#603000;">Kil</span><br><span style="font-size:16px;">' + n(totals.stone) + '</span></td>' +
            '<td style="padding:5px; width:25%;"><span class="icon header iron"></span> <span style="color:#603000;">Demir</span><br><span style="font-size:16px;">' + n(totals.iron) + '</span></td>' +
            '<td style="padding:5px; width:25%; border-left:2px solid #cda261; background-color:#e8dcb3;"><span class="icon header res"></span> <span style="color:#603000;">TOPLAM</span><br><span style="font-size:18px; color:#005c00;">' + n(totals.total) + '</span></td>' +
          '</tr>' +
        '</table>' +
        '<div style="text-align:right; margin-top:10px;">' +
          '<button id="yaver_squad_refresh_v1" class="btn" style="cursor:pointer;">🔄 Yenile</button> ' +
          '<button id="yaver_squad_copy_v1" class="btn" style="cursor:pointer;">📋 Defter İçin Kopyala</button>' +
        '</div>' +
      '</div>';

    $("#scavenge_mass_screen").before(html);
  }

  function removeOldColumns($table) {
    $table.find(".yaver_squad_th_v1").remove();
    $table.find(".yaver_squad_td_v1").remove();
    $table.find(".yaver_squad_total_row_v1").remove();
  }

  function addHeader($theadTr) {
    $theadTr.append('<th class="yaver_squad_th_v1 center"><span class="icon header wood"></span></th>');
    $theadTr.append('<th class="yaver_squad_th_v1 center"><span class="icon header stone"></span></th>');
    $theadTr.append('<th class="yaver_squad_th_v1 center"><span class="icon header iron"></span></th>');
    $theadTr.append('<th class="yaver_squad_th_v1 center"><span class="icon header res"></span></th>');
    $theadTr.append('<th class="yaver_squad_th_v1 center"><span class="icon header time"></span> Kalan</th>');
  }

  function addCellsToRow($tr, vid, st) {
    function n(x) { return Y.util.n(x); }

    var wood = st ? st.wood : 0;
    var stone = st ? st.stone : 0;
    var iron = st ? st.iron : 0;
    var total = st ? st.total : 0;
    var activeCount = st ? st.activeCount : 0;

    var remainCell = '<span class="yaver_rem_text_v1" data-vid="' + vid + '">-</span>';
    if (activeCount > 0) {
      remainCell = '<b><span class="yaver_rem_text_v1" data-vid="' + vid + '">-</span></b> <span class="grey">(' + activeCount + ')</span>';
    }

    $tr.append('<td class="yaver_squad_td_v1 center">' + (wood ? n(wood) : "0") + '</td>');
    $tr.append('<td class="yaver_squad_td_v1 center">' + (stone ? n(stone) : "0") + '</td>');
    $tr.append('<td class="yaver_squad_td_v1 center">' + (iron ? n(iron) : "0") + '</td>');
    $tr.append('<td class="yaver_squad_td_v1 center"><b>' + (total ? n(total) : "0") + '</b></td>');
    $tr.append('<td class="yaver_squad_td_v1 center">' + remainCell + '</td>');
  }

  function addTotalRow($tbody, totals, totalCols) {
    function n(x) { return Y.util.n(x); }

    // totalCols: mevcut kolon sayısı (append sonrası)
    var tr = $("<tr class='yaver_squad_total_row_v1'></tr>");

    // ilk kolon "Village" (1)
    tr.append("<td><strong>ACTIVE TOTAL</strong></td>");

    // geri kalan eski kolon sayısını doldur (option kolonları + selection kolonları)
    // Mass table genelde: Village + 4 option + 1 empty = 6. Biz 5 yeni kolon ekledik => 11.
    // totalCols paramı ile uyumlu olacak şekilde boş hücre ekleyeceğiz.
    for (var i = 1; i < totalCols - 5; i++) {
      tr.append("<td></td>");
    }

    tr.append('<td class="center"><strong>' + n(totals.wood) + '</strong></td>');
    tr.append('<td class="center"><strong>' + n(totals.stone) + '</strong></td>');
    tr.append('<td class="center"><strong>' + n(totals.iron) + '</strong></td>');
    tr.append('<td class="center"><strong style="color:#005c00;">' + n(totals.total) + '</strong></td>');
    tr.append('<td class="center"><span class="grey">(' + (totals.activeSquads || 0) + ' squads)</span></td>');

    $tbody.append(tr);
  }

  Y.ui.decorate = function (statsById, totals) {
    var $table = $(".mass-scavenge-table");
    if (!$table.length) throw new Error("mass-scavenge-table bulunamadı.");

    removeOldColumns($table);

    var $theadTr = $table.find("thead tr").first();
    addHeader($theadTr);

    // header sonrası total kolon sayısını al
    var totalCols = $table.find("thead tr").first().find("th").length;

    // "Select all" row (tbody first row) -> kolon sayısını eşitlemek için boş td ekle
    var $tbody = $table.find("tbody").first();
    var $selectAllRow = $tbody.find("tr").first();
    if ($selectAllRow && $selectAllRow.length) {
      $selectAllRow.append('<td class="yaver_squad_td_v1"></td>');
      $selectAllRow.append('<td class="yaver_squad_td_v1"></td>');
      $selectAllRow.append('<td class="yaver_squad_td_v1"></td>');
      $selectAllRow.append('<td class="yaver_squad_td_v1"></td>');
      $selectAllRow.append('<td class="yaver_squad_td_v1"></td>');
    }

    // village rows
    $tbody.find("tr[id^='scavenge_village_']").each(function (_, tr) {
      var $tr = $(tr);
      var vid = String($tr.attr("data-id") || "").trim();
      if (!vid) return;

      var st = statsById.get(vid) || null;
      addCellsToRow($tr, vid, st);
    });

    // total row en alt
    addTotalRow($tbody, totals, totalCols);

    // üst summary box
    ensureSummaryBox(totals);

    // refresh + copy
    $("#yaver_squad_refresh_v1").off("click").on("click", function () {
      try { window.__YAVER_SQUAD_V1__ && window.__YAVER_SQUAD_V1__.init && window.__YAVER_SQUAD_V1__.init(true); } catch (e) {}
    });

    $("#yaver_squad_copy_v1").off("click").on("click", function () {
      var serverText = ($("#serverDate").text() || "") + " - " + ($("#serverTime").text() || "");
      var bb =
        "[quote][b]🛡️ Yaver Squad Raporu[/b] (" + serverText + ")\n" +
        "[table]\n" +
        "[**]Hammadde[||]Miktar[/**]\n" +
        "[*]🌲 Odun[|]" + Y.util.n(totals.wood) + "\n" +
        "[*]🧱 Kil[|]" + Y.util.n(totals.stone) + "\n" +
        "[*]⛓️ Demir[|]" + Y.util.n(totals.iron) + "\n" +
        "[**]💰 TOPLAM[||]" + Y.util.n(totals.total) + "[/**]\n" +
        "[/table][/quote]";

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
      $(".yaver_rem_text_v1[data-vid='" + vid + "']").text(txt);
    });
  };
})();
