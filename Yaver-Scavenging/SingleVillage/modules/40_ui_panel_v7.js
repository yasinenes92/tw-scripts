(function () {
  "use strict";

  var Y = window.__YSS_SINGLE_V2__;
  if (!Y) return;

  Y.ui = {};

  var PANEL_ID = "yss_panel_native_v5";
  var STYLE_ID = "yss_style_native_v5";

  function isMobile() {
    try { if (typeof mobile === "boolean" && mobile) return true; } catch (e) {}
    return /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);
  }

  function enableDrag(panel, handle) {
    if (isMobile()) return; // mobilde drag kapalı -> parmakla kaydırma rahat
    if (!panel || !handle) return;

    var dragging = false, startX = 0, startY = 0, startLeft = 0, startTop = 0;

    function onDown(e) {
      if (e.button !== 0) return;
      dragging = true;
      var rect = panel.getBoundingClientRect();
      startX = e.clientX; startY = e.clientY;
      startLeft = rect.left; startTop = rect.top;
      e.preventDefault();
    }
    function onMove(e) {
      if (!dragging) return;
      var dx = e.clientX - startX;
      var dy = e.clientY - startY;
      panel.style.left = Math.max(0, startLeft + dx) + "px";
      panel.style.top = Math.max(0, startTop + dy) + "px";
    }
    function onUp() { dragging = false; }

    handle.addEventListener("mousedown", onDown);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  Y.ui.ensureUI = function () {
    if (document.getElementById(PANEL_ID)) return;

    // eski panelleri kaldır
    try {
      ["yss_panel_native_v2","yss_panel_native_v3","yss_panel_native_v4"].forEach(function(id){
        var el = document.getElementById(id); if (el) el.remove();
      });
      ["yss_style_native_v2","yss_style_native_v3","yss_style_native_v4"].forEach(function(id){
        var st = document.getElementById(id); if (st) st.remove();
      });
    } catch (e) {}

    var style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      #${PANEL_ID}{
        position: fixed;
        left: 20px;
        top: 70px;
        width: 980px;
        z-index: 99999;
        max-height: 85vh;

        overflow: auto;
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
        touch-action: pan-x pan-y;

        background: #f4e4bc;
        border: 2px solid #7d510f;
        border-radius: 6px;
        padding: 6px;
        box-shadow: 0 0 15px rgba(0,0,0,.25);
      }
      #${PANEL_ID} * { box-sizing: border-box; }
      #${PANEL_ID} table.vis{ margin:0; background: #f4e4bc; }
      #${PANEL_ID} td, #${PANEL_ID} th { background: transparent; }
      #${PANEL_ID} .yss_gap{ height:6px; background:#f4e4bc; }
      #${PANEL_ID} .yss_hl_v2{
        outline: 3px solid #ffb400 !important;
        box-shadow: 0 0 0 4px rgba(255,180,0,.25) !important;
      }
      #${PANEL_ID} .yss_hdr{
        display:flex; align-items:center; justify-content:space-between;
        cursor: move; user-select:none;
      }
      #${PANEL_ID} .yss_hdr_right{ display:flex; gap:6px; align-items:center; }
      #${PANEL_ID} .yss_dev{ opacity:.85; font-style: italic; white-space:nowrap; }
      #${PANEL_ID} .yss_toolbar{ display:flex; gap:8px; align-items:center; flex-wrap:wrap; }
      #${PANEL_ID} .yss_small{ font-size: 11px; opacity:.9; }
      #${PANEL_ID} .yss_tablewrap{
        max-height: 280px;
        overflow:auto;
        overflow-x:auto;
        -webkit-overflow-scrolling: touch;
        touch-action: pan-x pan-y;
      }
      #${PANEL_ID} .yss_timebox{ display:flex; gap:6px; align-items:center; }
      #${PANEL_ID} .yss_timebox label{ display:flex; gap:4px; align-items:center; white-space:nowrap; }
      #${PANEL_ID} .yss_timebox input{ width:64px; }
      #${PANEL_ID} .yss_unitlbl img{ width:18px;height:18px; vertical-align:-4px; margin-right:4px; }
      #${PANEL_ID} .yss_units_html img{ width:14px;height:14px; vertical-align:-3px; margin-right:2px; }
      @media (max-width: 900px){
        #${PANEL_ID}{
          left: 5px;
          top: 60px;
          width: calc(100vw - 10px);
          max-height: 90vh;
        }
        #${PANEL_ID} table.vis{ min-width: 980px; }
      }
    `;
    document.head.appendChild(style);

    var el = document.createElement("div");
    el.id = PANEL_ID;

    el.innerHTML = `
      <table class="vis" style="width:100%;">
        <tr>
          <th style="text-align:left;">
            <div class="yss_hdr" id="yss_drag_v5">
              <div>
                <span class="icon header place"></span>
                Yaver Scavenging (Single Village) <span class="grey">(v7)</span>
              </div>
              <div class="yss_hdr_right">
                <span class="yss_dev">Developed by controleng</span>
                <input type="button" class="btn" id="yss_close_v5" value="X">
              </div>
            </div>
          </th>
        </tr>
        <tr>
          <td>
            <div class="yss_toolbar">
              <span class="icon header time"></span>
              <b>Time:</b>
              <span class="yss_timebox">
                <label>Hours <input id="yss_h_v5" type="number" step="1" min="0"></label>
                <label>Min <input id="yss_m_v5" type="number" step="1" min="0" max="59"></label>
                <label>Sec <input id="yss_s_v5" type="number" step="1" min="0" max="59"></label>
              </span>

              <span style="margin-left:10px;">
                <label style="white-space:nowrap;">
                  <input id="yss_mode_bal_v5" type="radio" name="yss_mode_v5" value="balanced">
                  <b>Balanced over all categories</b>
                </label>
              </span>

              <span style="margin-left:10px;">
                <label style="white-space:nowrap;">
                  <input id="yss_mode_prio_v5" type="radio" name="yss_mode_v5" value="priority">
                  <b>Priority on filling higher categories</b>
                </label>
              </span>

              <input type="button" class="btn" id="yss_plan_v5" value="PLAN">
              <input type="button" class="btn btn-confirm-yes" id="yss_start_all_v5" value="START">
            </div>

            <div id="yss_msg_v5" class="info_box" style="margin-top:8px;">
              <div class="content">Ready. Choose Time/Units/Categories → <b>PLAN</b>. Use START to auto-start plan rows.</div>
            </div>
          </td>
        </tr>
      </table>

      <div class="yss_gap"></div>

      <table class="vis" style="width:100%;">
        <tr><th style="text-align:left;">Unit Types (checkbox)</th></tr>
        <tr><td id="yss_units_v5"></td></tr>
      </table>

      <div class="yss_gap"></div>

      <table class="vis" style="width:100%;">
        <tr><th style="text-align:left;">Categories (LOCKED/ACTIVE auto-excluded)</th></tr>
        <tr><td id="yss_opts_v5"></td></tr>
      </table>

      <div class="yss_gap"></div>

      <table class="vis" style="width:100%;">
        <tr><th style="text-align:left;">Plan</th></tr>
        <tr>
          <td>
            <div class="yss_tablewrap">
              <table class="vis" style="width:100%;">
                <tr>
                  <th>#</th>
                  <th style="text-align:left;">Category</th>
                  <th>Loot</th>
                  <th><span class="icon header time"></span> Target</th>
                  <th><span class="icon header time"></span> Estimated</th>
                  <th>Carry</th>
                  <th style="text-align:left;">
                    <span class="icon header wood"></span>
                    <span class="icon header stone"></span>
                    <span class="icon header iron"></span>
                    Est. Loot (approx.)
                  </th>
                  <th style="text-align:left;">Units</th>
                </tr>
                <tbody id="yss_plan_tbody_v5"></tbody>
              </table>
            </div>
          </td>
        </tr>
      </table>

      <div class="yss_gap"></div>

      <table class="vis" style="width:100%;">
        <tr><th style="text-align:left;">Plan Total (Estimated Loot)</th></tr>
        <tr>
          <td>
            <table class="vis" style="width:100%; text-align:center;">
              <tr>
                <td style="width:25%;"><span class="icon header wood"></span><br><b id="yss_tot_wood_v5">0</b></td>
                <td style="width:25%;"><span class="icon header stone"></span><br><b id="yss_tot_stone_v5">0</b></td>
                <td style="width:25%;"><span class="icon header iron"></span><br><b id="yss_tot_iron_v5">0</b></td>
                <td style="width:25%; border-left:2px solid #cda261; background:#e8dcb3;">
                  <span class="icon header res"></span><br><b id="yss_tot_all_v5" style="color:#005c00;">0</b>
                </td>
              </tr>
            </table>
            <div class="yss_small" style="margin-top:6px;">
              Note: These totals are the sum of “Est. Loot” values in the plan table.
            </div>
          </td>
        </tr>
      </table>
    `;

    document.body.appendChild(el);

    // restore cfg (v2 storage)
    var saved = Y.loadCfg();
    var t = saved.time || { h: 1, m: 0, s: 0 };
    document.getElementById("yss_h_v5").value = (t.h != null ? t.h : 1);
    document.getElementById("yss_m_v5").value = (t.m != null ? t.m : 0);
    document.getElementById("yss_s_v5").value = (t.s != null ? t.s : 0);

    var mode = saved.mode || "priority";
    document.getElementById("yss_mode_bal_v5").checked = (mode === "balanced");
    document.getElementById("yss_mode_prio_v5").checked = (mode === "priority");

    document.getElementById("yss_close_v5").onclick = function () {
      try {
        document.getElementById(PANEL_ID) && document.getElementById(PANEL_ID).remove();
        document.getElementById(STYLE_ID) && document.getElementById(STYLE_ID).remove();
      } catch (e) {}
    };

    enableDrag(el, document.getElementById("yss_drag_v5"));
  };

  Y.ui.unitsSummaryHTML = function (planUnits) {
    var parts = [];
    Y.sendOrderDefault.forEach(function (u) {
      var n = planUnits[u] || 0;
      if (n > 0) parts.push('<span class="yss_units_html"><img src="' + Y.UNIT_ICON(u) + '" alt="">' + n + "</span>");
    });
    return parts.join("&nbsp;");
  };

  Y.ui.renderPickers = function () {
    // units
    var uWrap = document.getElementById("yss_units_v5");
    var saved = Y.loadCfg();
    var savedUnits = saved.unitsEnabled || null;

    var html = '<div style="display:flex; gap:12px; flex-wrap:wrap;">';
    Y.sendOrderDefault.forEach(function (u) {
      var count = Y.dom.getUnitCount(u);
      var checked = savedUnits ? !!savedUnits[u] : true;
      html += (
        '<label class="yss_unitlbl" style="white-space:nowrap;">' +
          '<input type="checkbox" class="yss_unit_v5" data-unit="' + u + '" ' + (checked ? "checked" : "") + ">" +
          '<img src="' + Y.UNIT_ICON(u) + '" alt="">' +
          "<b>" + Y.dom.getUnitName(u) + "</b> " +
          '<span class="grey">(' + count + ")</span>" +
        "</label>"
      );
    });
    html += "</div>";
    uWrap.innerHTML = html;

    // options
    var oWrap = document.getElementById("yss_opts_v5");
    var opts = Y.dom.listOptions();

    // Not: optsEnabled köyler arasında KAYDEDİLMEZ. Her köyde o an OK olanlar otomatik seçilir.

    var oh = '<div style="display:flex; gap:12px; flex-wrap:wrap;">';
    opts.forEach(function (opt) {
      var active = !!opt.scavenging_squad;
      var locked = !!opt.is_locked;
      var disabled = active || locked;

      var tag = active
        ? "<span class='badge badge-report'>(ACTIVE)</span>"
        : (locked ? "<span class='badge badge-mail'>(LOCKED)</span>" : "<span class='badge badge-ally-forum'>(OK)</span>");

      // OK olanların hepsi otomatik seçili; ACTIVE/LOCKED zaten disabled ve seçilmez
      var checkedOpt = !disabled;

      oh += (
        '<label style="white-space:nowrap; ' + (disabled ? "opacity:.55" : "") + '">' +
          '<input type="checkbox" class="yss_opt_v5" data-opt="' + opt.id + '" ' +
            (disabled ? "disabled" : "") + " " +
            ((!disabled && checkedOpt) ? "checked" : "") +
          ">" +
          "<b>" + opt.name + "</b> <span class='grey'>(x" + opt.loot_factor + ")</span> " + tag +
        "</label>"
      );
    });
    oh += "</div>";
    oWrap.innerHTML = oh;
  };

  Y.ui.renderPlan = function (plan, targetSec) {
    var tb = document.getElementById("yss_plan_tbody_v5");
    if (!tb) return;

    tb.innerHTML = "";

    var totW = 0, totS = 0, totI = 0;

    if (!plan || !plan.length) {
      tb.innerHTML = '<tr><td colspan="8" style="text-align:center;">No plan.</td></tr>';
    } else {
      plan.forEach(function (p, i) {
        var lootTotal = Math.floor(p.carryUsed * p.loot);
        var tri = Y.math.estLootTriplet(lootTotal);

        totW += tri.wood; totS += tri.stone; totI += tri.iron;

        var tr = document.createElement("tr");
        tr.innerHTML =
          "<td>" + (i + 1) + "</td>" +
          '<td style="text-align:left;"><b>' + p.name + "</b></td>" +
          "<td>x" + p.loot + "</td>" +
          "<td>" + Y.util.fmtHMS(targetSec) + "</td>" +
          "<td><b>" + Y.util.fmtHMS(p.estSec) + "</b></td>" +
          "<td>" + p.carryUsed + "</td>" +
          '<td style="text-align:left;">' +
            '<span class="icon header wood"></span>' + tri.wood + "&nbsp;&nbsp;" +
            '<span class="icon header stone"></span>' + tri.stone + "&nbsp;&nbsp;" +
            '<span class="icon header iron"></span>' + tri.iron +
            ' <span class="grey">(≈)</span>' +
          "</td>" +
          '<td style="text-align:left;">' + Y.ui.unitsSummaryHTML(p.planUnits) + "</td>";
        tb.appendChild(tr);
      });
    }

    // totals table update
    var all = totW + totS + totI;
    var wEl = document.getElementById("yss_tot_wood_v5");
    var sEl = document.getElementById("yss_tot_stone_v5");
    var iEl = document.getElementById("yss_tot_iron_v5");
    var aEl = document.getElementById("yss_tot_all_v5");
    if (wEl) wEl.textContent = totW;
    if (sEl) sEl.textContent = totS;
    if (iEl) iEl.textContent = totI;
    if (aEl) aEl.textContent = all;
  };

  // v5 msg
  Y.util.msg = function (html, kind) {
    var el = document.getElementById("yss_msg_v5");
    if (!el) return;
    kind = kind || "info";
    el.className = (kind === "ok" ? "success_box" : (kind === "err" ? "error_box" : "info_box"));
    el.innerHTML = '<div class="content">' + html + "</div>";
  };

  // v5 getUIState (yeni class/ID)
  Y.dom.getUIState = function () {
    var hRaw = document.getElementById("yss_h_v5") ? document.getElementById("yss_h_v5").value : "";
    var mRaw = document.getElementById("yss_m_v5") ? document.getElementById("yss_m_v5").value : "";
    var sRaw = document.getElementById("yss_s_v5") ? document.getElementById("yss_s_v5").value : "";

    var anyTyped = (hRaw !== "" && hRaw != null) || (mRaw !== "" && mRaw != null) || (sRaw !== "" && sRaw != null);

    var h = parseFloat(hRaw || "0") || 0;
    var m = parseInt(mRaw || "0", 10) || 0;
    var s = parseInt(sRaw || "0", 10) || 0;

    var total = Math.floor(h * 3600 + m * 60 + s);
    if (!anyTyped) total = 3600;
    var timeSec = Math.max(1, total);

    var mode = (document.getElementById("yss_mode_bal_v5") && document.getElementById("yss_mode_bal_v5").checked) ? "balanced" : "priority";

    var unitsEnabled = {};
    document.querySelectorAll(".yss_unit_v5").forEach(function (cb) {
      unitsEnabled[cb.getAttribute("data-unit")] = cb.checked;
    });

    var optsEnabled = [];
    document.querySelectorAll(".yss_opt_v5").forEach(function (cb) {
      if (cb.checked) optsEnabled.push(parseInt(cb.getAttribute("data-opt"), 10));
    });

    // Sadece süre/mode/unit tercihlerini saklıyoruz.
    // optsEnabled kasıtlı olarak saklanmıyor: her köyde OK olanlar otomatik seçilir.
    Y.saveCfg({
      time: { h: hRaw, m: mRaw, s: sRaw },
      mode: mode,
      unitsEnabled: unitsEnabled
    });

    return { timeSec: timeSec, mode: mode, unitsEnabled: unitsEnabled, optsEnabled: optsEnabled };
  };
})();
