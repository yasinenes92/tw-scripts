(function () {
  "use strict";

  var Y = window.__YAVER_MASS_SCAV_V1__;
  if (!Y) return;

  Y.ui = {};

  var PANEL_ID = "yms_panel_v1";
  var STYLE_ID = "yms_style_v1";

  function enableDrag(panel, handle) {
    var dragging = false, sx = 0, sy = 0, sl = 0, st = 0;

    handle.addEventListener("mousedown", function (e) {
      if (e.button !== 0) return;
      dragging = true;
      sx = e.clientX; sy = e.clientY;
      var r = panel.getBoundingClientRect();
      sl = r.left; st = r.top;
      e.preventDefault();
    });

    window.addEventListener("mousemove", function (e) {
      if (!dragging) return;
      var dx = e.clientX - sx;
      var dy = e.clientY - sy;
      panel.style.left = Math.max(0, sl + dx) + "px";
      panel.style.top = Math.max(0, st + dy) + "px";
    });

    window.addEventListener("mouseup", function () { dragging = false; });
  }

  function msg(html, kind) {
    var el = document.getElementById("yms_msg_v1");
    if (!el) return;
    el.className = (kind === "ok" ? "success_box" : (kind === "err" ? "error_box" : "info_box"));
    el.innerHTML = '<div class="content">' + html + "</div>";
  }

  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) return;
    var st = document.createElement("style");
    st.id = STYLE_ID;

    // v2 CSS: v1'in aynisi + mobilde yatay kaydirma icin ekler
    st.textContent = `
      #${PANEL_ID}{
        position:fixed; left:20px; top:70px;
        width: 1180px;
        max-height: 85vh; overflow:auto;
        overflow-x:auto;
        -webkit-overflow-scrolling: touch;
        touch-action: pan-x pan-y;
        z-index: 99999;
        background:#f4e4bc;
        border: 3px solid #7d510f;
        box-shadow:0 0 15px rgba(0,0,0,.25);
        border-radius: 6px;
        padding: 6px;
      }
      #${PANEL_ID} *{ box-sizing:border-box; }
      #${PANEL_ID} table.vis{ width:100%; background:#f4e4bc; margin:0; }
      #${PANEL_ID} td,#${PANEL_ID} th{ background:transparent; }
      #${PANEL_ID} .hdr{
        display:flex; align-items:center; justify-content:space-between;
        cursor:move; user-select:none;
      }
      #${PANEL_ID} .hdr_right{ display:flex; gap:8px; align-items:center; }
      #${PANEL_ID} .dev{ opacity:.85; font-style:italic; white-space:nowrap; }
      #${PANEL_ID} .gap{ height:6px; }
      #${PANEL_ID} .toolbar{ display:flex; gap:10px; align-items:center; flex-wrap:wrap; }
      #${PANEL_ID} .timebox{ display:flex; gap:6px; align-items:center; }
      #${PANEL_ID} .timebox label{ display:flex; gap:4px; align-items:center; white-space:nowrap; }
      #${PANEL_ID} .timebox input{ width:64px; }
      #${PANEL_ID} .small{ font-size:11px; opacity:.85; }
      #${PANEL_ID} .scroll{
        max-height: 240px; overflow:auto;
        overflow-x:auto;
        -webkit-overflow-scrolling: touch;
        touch-action: pan-x pan-y;
        border:1px solid rgba(0,0,0,.15);
      }
      #${PANEL_ID} .scroll2{
        max-height: 300px; overflow:auto;
        overflow-x:auto;
        -webkit-overflow-scrolling: touch;
        touch-action: pan-x pan-y;
        border:1px solid rgba(0,0,0,.15);
      }
      #${PANEL_ID} .badge{
        display:inline-block; padding:1px 6px; border-radius:10px;
        background:#c6a768; color:#803000; font-size:11px; margin-left:4px;
      }
      #${PANEL_ID} .pill{
        display:inline-block; padding:1px 6px; border-radius:10px;
        background:#fff5da; border:1px solid rgba(0,0,0,.15); font-size:11px; margin-right:4px;
      }
      #${PANEL_ID} .units_html img{ width:14px; height:14px; vertical-align:-3px; margin-right:2px; }
      #${PANEL_ID} .unitlbl img{ width:18px; height:18px; vertical-align:-4px; margin-right:4px; }
      #${PANEL_ID} input[type="number"]{ width:60px; }
      #${PANEL_ID} .progress_outer{ width:240px; height:10px; border:1px solid rgba(0,0,0,.25); background:#fff5da; }
      #${PANEL_ID} .progress_inner{ height:10px; width:0%; background:#c6a768; }
      #${PANEL_ID} .right{ text-align:right; }
      #${PANEL_ID} .center{ text-align:center; }
      #${PANEL_ID} .muted{ opacity:.75; }
      #${PANEL_ID} .row_skip{ opacity:.65; }
      #${PANEL_ID} .sendok{ color:#0b6; font-weight:bold; }
      #${PANEL_ID} .senderr{ color:#b00; font-weight:bold; }

      /* Mobil / dar ekran: panel viewport'a sigsin, tablolar yatay kayarak gorunsun */
      @media (max-width: 900px){
        #${PANEL_ID}{
          left:5px; top:60px;
          width: calc(100vw - 10px);
          max-height: 90vh;
        }
        #${PANEL_ID} table.vis{
          min-width: 980px; /* tablolar kayabilsin */
        }
      }
    `;
    document.head.appendChild(st);
  }

  Y.ui.ensure = function () {
    ensureStyle();
    if (document.getElementById(PANEL_ID)) return;

    var el = document.createElement("div");
    el.id = PANEL_ID;

    el.innerHTML = `
      <table class="vis">
        <tr>
          <th style="text-align:left;">
            <div class="hdr" id="yms_drag_v1">
              <div><span class="icon header place"></span> Yaver Mass Scavenging</div>
              <div class="hdr_right">
                <span class="dev">Developed by controleng</span>
                <input type="button" class="btn" id="yms_close_v1" value="X">
              </div>
            </div>
          </th>
        </tr>
        <tr>
          <td>
            <div class="toolbar">
              <span class="icon header time"></span><b>Süre:</b>
              <span class="timebox">
                <label>Saat <input id="yms_h_v1" type="number" min="0"></label>
                <label>Dk <input id="yms_m_v1" type="number" min="0" max="59"></label>
                <label>Sn <input id="yms_s_v1" type="number" min="0" max="59"></label>
              </span>

              <label class="nowrap"><input id="yms_mode_bal_v1" type="radio" name="yms_mode_v1" value="balanced"> <b>Balanced</b></label>
              <label class="nowrap"><input id="yms_mode_pri_v1" type="radio" name="yms_mode_v1" value="priority"> <b>Priority</b></label>

              <label class="nowrap"><input id="yms_premium_v1" type="checkbox"> <b>+20% Premium</b></label>

              <input type="button" class="btn" id="yms_btn_load_v1" value="LOAD DATA">
              <input type="button" class="btn" id="yms_btn_plan_v1" value="PLAN">
              <input type="button" class="btn" id="yms_btn_batches_v1" value="BUILD BATCHES">
              <input type="button" class="btn" id="yms_btn_sendnext_v1" value="SEND NEXT">
              <div class="progress_outer" title="Fetch progress"><div class="progress_inner" id="yms_prog_v1"></div></div>
              <span class="small" id="yms_prog_txt_v1"></span>
            </div>

            <div id="yms_msg_v1" class="info_box" style="margin-top:8px;">
              <div class="content">
                1) Group seç → <b>LOAD DATA</b>  2) Köy seç (checkbox)  3) PLAN  4) BUILD BATCHES  5) SEND NEXT (batch batch)
              </div>
            </div>
          </td>
        </tr>
      </table>

      <div class="gap"></div>

      <table class="vis">
        <tr><th style="text-align:left;">1) Group Seçimi (checkbox)</th></tr>
        <tr>
          <td>
            <div id="yms_groups_v1" class="scroll" style="padding:6px;"></div>
            <div class="small muted" style="margin-top:6px;">Not: Group seçmek aynı zamanda o group’taki köyleri otomatik “seçili” yapar. İstersen köy listesinden tek tek kapatabilirsin.</div>
          </td>
        </tr>
      </table>

      <div class="gap"></div>

      <table class="vis">
        <tr><th style="text-align:left;">2) Unit Seçimi + Keep Home</th></tr>
        <tr><td id="yms_units_v1" style="padding:6px;"></td></tr>
      </table>

      <div class="gap"></div>

      <table class="vis">
        <tr><th style="text-align:left;">3) Kategori Seçimi (LOCKED/ACTIVE otomatik SKIP)</th></tr>
        <tr><td id="yms_opts_v1" style="padding:6px;"></td></tr>
      </table>

      <div class="gap"></div>

      <table class="vis">
        <tr>
          <th style="text-align:left;">
            4) Köy Listesi (Seçim)
            <span style="float:right;">
              Ara: <input id="yms_v_search_v1" type="text" style="width:240px;" placeholder="köy adı / koordinat">
            </span>
          </th>
        </tr>
        <tr>
          <td>
            <div class="scroll2">
              <table class="vis">
                <thead>
                  <tr>
                    <th class="center">Seç</th>
                    <th>Village</th>
                    <th class="center">Groups</th>
                    <th class="center">Rally</th>
                    <th class="center">Options OK</th>
                    <th class="center">Active</th>
                    <th class="center">Locked</th>
                    <th class="center">CarryFactor</th>
                  </tr>
                </thead>
                <tbody id="yms_villages_tbody_v1"></tbody>
              </table>
            </div>
          </td>
        </tr>
      </table>

      <div class="gap"></div>

      <table class="vis">
        <tr><th style="text-align:left;">5) Plan Tablosu</th></tr>
        <tr>
          <td>
            <div class="scroll2">
              <table class="vis">
                <thead>
                  <tr>
                    <th>Village</th>
                    <th>Option</th>
                    <th class="center">Loot</th>
                    <th class="center"><span class="icon header time"></span> Target</th>
                    <th class="center"><span class="icon header time"></span> Est</th>
                    <th class="center">Carry</th>
                    <th class="center">EffCarry</th>
                    <th>
                      <span class="icon header wood"></span>
                      <span class="icon header stone"></span>
                      <span class="icon header iron"></span>
                      Est Loot
                    </th>
                    <th>Units</th>
                    <th class="center">Status</th>
                  </tr>
                </thead>
                <tbody id="yms_plan_tbody_v1"></tbody>
              </table>
            </div>
            <div class="small muted" id="yms_plan_summary_v1" style="margin-top:6px;"></div>
          </td>
        </tr>
      </table>

      <div class="gap"></div>

      <table class="vis">
        <tr><th style="text-align:left;">6) Batch Gönderim (200 limit)</th></tr>
        <tr>
          <td>
            <div class="scroll">
              <table class="vis">
                <thead>
                  <tr>
                    <th class="center">#</th>
                    <th class="center">Requests</th>
                    <th class="center">Premium</th>
                    <th class="center">Send</th>
                    <th>Result</th>
                  </tr>
                </thead>
                <tbody id="yms_batches_tbody_v1"></tbody>
              </table>
            </div>
            <div class="small muted" style="margin-top:6px;">
              SEND NEXT, sıradaki batch’i gönderir. İstersen batch tablosundan tek tek de gönderebilirsin.
            </div>
          </td>
        </tr>
      </table>
    `;

    document.body.appendChild(el);

    document.getElementById("yms_close_v1").onclick = function () { Y.destroy(); };
    enableDrag(el, document.getElementById("yms_drag_v1"));

    Y.ui.msg = msg;
  };

  function loadCfgWithDefaults() {
    var cfg = Y.loadCfg();
    if (!cfg || typeof cfg !== "object") cfg = {};
    if (!cfg.time) cfg.time = { h: 1, m: 0, s: 0 };
    if (!cfg.mode) cfg.mode = "priority";
    if (cfg.usePremiumBoost == null) cfg.usePremiumBoost = false;
    if (!Array.isArray(cfg.enabledOptions)) cfg.enabledOptions = [1,2,3,4];
    if (!cfg.unitsEnabled) cfg.unitsEnabled = null;
    if (!cfg.keepHome) cfg.keepHome = null;
    return cfg;
  }

  Y.ui.readCfgFromUI = function () {
    var cfg = loadCfgWithDefaults();

    cfg.time = {
      h: document.getElementById("yms_h_v1").value,
      m: document.getElementById("yms_m_v1").value,
      s: document.getElementById("yms_s_v1").value
    };

    cfg.mode = document.getElementById("yms_mode_bal_v1").checked ? "balanced" : "priority";
    cfg.usePremiumBoost = !!document.getElementById("yms_premium_v1").checked;

    var opts = [];
    document.querySelectorAll(".yms_opt_cb_v1").forEach(function (cb) {
      if (cb.checked) opts.push(parseInt(cb.getAttribute("data-opt"), 10));
    });
    cfg.enabledOptions = opts;

    var unitsEnabled = {};
    var keepHome = {};
    document.querySelectorAll(".yms_unit_cb_v1").forEach(function (cb) {
      var u = cb.getAttribute("data-unit");
      unitsEnabled[u] = cb.checked;
      var inp = document.getElementById("yms_keep_" + u + "_v1");
      keepHome[u] = inp ? Number(inp.value || 0) : 0;
    });

    cfg.unitsEnabled = unitsEnabled;
    cfg.keepHome = keepHome;

    Y.saveCfg(cfg);
    return cfg;
  };

  Y.ui.applyCfgToUI = function () {
    var cfg = loadCfgWithDefaults();

    document.getElementById("yms_h_v1").value = (cfg.time.h != null ? cfg.time.h : 1);
    document.getElementById("yms_m_v1").value = (cfg.time.m != null ? cfg.time.m : 0);
    document.getElementById("yms_s_v1").value = (cfg.time.s != null ? cfg.time.s : 0);

    document.getElementById("yms_mode_bal_v1").checked = (cfg.mode === "balanced");
    document.getElementById("yms_mode_pri_v1").checked = (cfg.mode === "priority");
    document.getElementById("yms_premium_v1").checked = !!cfg.usePremiumBoost;
  };

  Y.ui.renderGroups = function () {
    var box = document.getElementById("yms_groups_v1");
    if (!box) return;

    var html = '<div style="display:flex; gap:12px; flex-wrap:wrap;">';
    Y.state.groups.forEach(function (g) {
      var checked = Y.state.selectedGroups.has(String(g.id)) ? "checked" : "";
      html += (
        '<label style="white-space:nowrap;">' +
          '<input type="checkbox" class="yms_group_cb_v1" data-gid="' + g.id + '" ' + checked + '> ' +
          '<b>' + g.name + '</b> <span class="muted">(id:' + g.id + ')</span>' +
        '</label>'
      );
    });
    html += "</div>";
    box.innerHTML = html;
  };

  Y.ui.renderUnits = function () {
    var box = document.getElementById("yms_units_v1");
    if (!box) return;

    var cfg = loadCfgWithDefaults();
    var unitsEnabled = cfg.unitsEnabled;
    var keepHome = cfg.keepHome;

    if (!unitsEnabled) {
      unitsEnabled = {};
      Y.sendOrder.forEach(function (u) { unitsEnabled[u] = true; });
      cfg.unitsEnabled = unitsEnabled;
    }
    if (!keepHome) {
      keepHome = {};
      Y.sendOrder.forEach(function (u) { keepHome[u] = 0; });
      cfg.keepHome = keepHome;
    }
    Y.saveCfg(cfg);

    var html = '<div style="display:flex; gap:14px; flex-wrap:wrap; align-items:flex-end;">';
    Y.sendOrder.forEach(function (u) {
      var meta = Y.state.unitsMeta && Y.state.unitsMeta[u] ? Y.state.unitsMeta[u] : null;
      var name = meta && meta.name ? meta.name : u;
      var checked = unitsEnabled[u] ? "checked" : "";
      var kh = (keepHome[u] != null) ? keepHome[u] : 0;

      html += (
        '<div style="border:1px solid rgba(0,0,0,.15); padding:6px; border-radius:6px; background:#fff5da;">' +
          '<label class="unitlbl" style="white-space:nowrap;">' +
            '<input type="checkbox" class="yms_unit_cb_v1" data-unit="' + u + '" ' + checked + '> ' +
            '<img src="' + Y.UNIT_ICON(u) + '" alt="">' +
            '<b>' + name + '</b>' +
          '</label>' +
          '<div class="small muted" style="margin-top:4px;">Keep home:</div>' +
          '<input id="yms_keep_' + u + '_v1" type="number" min="0" value="' + kh + '">' +
        '</div>'
      );
    });
    html += "</div>";
    box.innerHTML = html;
  };

  Y.ui.renderOptions = function () {
    var box = document.getElementById("yms_opts_v1");
    if (!box) return;

    var cfg = loadCfgWithDefaults();
    var enabled = new Set((cfg.enabledOptions || [1,2,3,4]).map(String));

    var option_bases = Y.state.optionBases || {};
    var ids = [1,2,3,4];

    var html = '<div style="display:flex; gap:12px; flex-wrap:wrap;">';
    ids.forEach(function (id) {
      var ob = option_bases[String(id)] || option_bases[id] || { id: id, name: ("Option " + id), loot_factor: 0 };
      var checked = enabled.has(String(id)) ? "checked" : "";
      html += (
        '<label style="white-space:nowrap;">' +
          '<input type="checkbox" class="yms_opt_cb_v1" data-opt="' + id + '" ' + checked + '> ' +
          '<b>' + ob.name + '</b> <span class="muted">(x' + ob.loot_factor + ')</span>' +
        '</label>'
      );
    });
    html += "</div>";
    box.innerHTML = html;
  };

  function villageOptionCounts(v) {
    var ok = 0, act = 0, lock = 0;
    ["1","2","3","4"].forEach(function (k) {
      var o = v.options && v.options[k];
      if (!o) return;
      if (o.is_locked) lock++;
      else if (o.scavenging_squad) act++;
      else ok++;
    });
    return { ok: ok, active: act, locked: lock };
  }

  Y.ui.renderVillages = function () {
    var tb = document.getElementById("yms_villages_tbody_v1");
    if (!tb) return;

    var q = (document.getElementById("yms_v_search_v1").value || "").trim().toLowerCase();

    tb.innerHTML = "";
    var arr = Y.state.villages || [];

    for (var i = 0; i < arr.length; i++) {
      var v = arr[i];
      var vid = String(v.village_id);
      var name = String(v.village_name || "");
      if (q) {
        var hay = (name + " " + (v.coord || "")).toLowerCase();
        if (hay.indexOf(q) < 0) continue;
      }

      var selected = Y.state.selectedVillageIds.has(vid);
      var counts = villageOptionCounts(v);
      var badges = Y.data.getVillageGroupBadges(vid);
      var rally = v.has_rally_point ? "YES" : "NO";

      var badgeHtml = badges.map(function (g) { return '<span class="pill">g:' + g + '</span>'; }).join("");

      var tr = document.createElement("tr");
      tr.innerHTML =
        '<td class="center"><input type="checkbox" class="yms_v_cb_v1" data-vid="' + vid + '" ' + (selected ? "checked" : "") + '></td>' +
        '<td><a href="' + (game_data.link_base_pure || "/game.php?village=" + vid + "&screen=") + 'place&mode=scavenge">' + name + '</a></td>' +
        '<td class="center">' + badgeHtml + '</td>' +
        '<td class="center">' + rally + '</td>' +
        '<td class="center">' + counts.ok + '</td>' +
        '<td class="center">' + counts.active + '</td>' +
        '<td class="center">' + counts.locked + '</td>' +
        '<td class="center">' + (v.unit_carry_factor || 1) + '</td>';

      tb.appendChild(tr);
    }

    tb.querySelectorAll(".yms_v_cb_v1").forEach(function (cb) {
      cb.onchange = function () {
        var vid = cb.getAttribute("data-vid");
        Y.data.setManualVillageSelected(vid, cb.checked);
        Y.ui.renderVillages();
      };
    });
  };

  Y.ui.renderPlan = function () {
    var tb = document.getElementById("yms_plan_tbody_v1");
    if (!tb) return;

    tb.innerHTML = "";

    var rows = Y.state.planRows || [];
    var okCount = 0, skipCount = 0;

    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];

      if (r.status === "OK") okCount++; else skipCount++;

      var tr = document.createElement("tr");
      if (r.status !== "OK") tr.classList.add("row_skip");

      if (r.status !== "OK") {
        tr.innerHTML =
          '<td>' + (r.village_name || ("#" + r.village_id)) + '</td>' +
          '<td class="muted">-</td>' +
          '<td class="center">-</td>' +
          '<td class="center">-</td>' +
          '<td class="center">-</td>' +
          '<td class="center">-</td>' +
          '<td class="center">-</td>' +
          '<td class="muted">-</td>' +
          '<td class="muted">-</td>' +
          '<td class="center"><span class="badge">SKIP</span> <span class="muted">' + (r.reason || "") + '</span></td>';
        tb.appendChild(tr);
        continue;
      }

      var unitsHtml = '<span class="units_html">';
      Object.keys(r.candidate_squad || {}).forEach(function (u) {
        var n = Number(r.candidate_squad[u] || 0);
        if (n > 0) unitsHtml += '<img src="' + Y.UNIT_ICON(u) + '" alt="">' + n + "&nbsp;";
      });
      unitsHtml += "</span>";

      tr.innerHTML =
        '<td>' + r.village_name + '</td>' +
        '<td><b>' + r.option_name + '</b></td>' +
        '<td class="center">x' + r.loot_factor + '</td>' +
        '<td class="center">' + Y.util.fmtHMS(r.targetSec) + '</td>' +
        '<td class="center"><b>' + Y.util.fmtHMS(r.estSec) + '</b></td>' +
        '<td class="center">' + Y.util.fmtInt(r.baseCarryUsed) + '</td>' +
        '<td class="center">' + Y.util.fmtInt(r.effCarry) + '</td>' +
        '<td>' +
          '<span class="icon header wood"></span>' + (r.loot.wood || 0) + "&nbsp;" +
          '<span class="icon header stone"></span>' + (r.loot.stone || 0) + "&nbsp;" +
          '<span class="icon header iron"></span>' + (r.loot.iron || 0) +
        '</td>' +
        '<td>' + unitsHtml + '</td>' +
        '<td class="center"><span class="badge">OK</span></td>';

      tb.appendChild(tr);
    }

    var s = document.getElementById("yms_plan_summary_v1");
    if (s) {
      s.innerHTML = "Plan rows: <b>" + okCount + "</b> OK, <b>" + skipCount + "</b> SKIP.";
    }
  };

  Y.ui.renderBatches = function () {
    var tb = document.getElementById("yms_batches_tbody_v1");
    if (!tb) return;
    tb.innerHTML = "";

    var batches = Y.state.batches || [];
    for (var i = 0; i < batches.length; i++) {
      var b = batches[i];
      var tr = document.createElement("tr");
      tr.innerHTML =
        '<td class="center"><b>' + (i + 1) + '</b></td>' +
        '<td class="center">' + b.length + '</td>' +
        '<td class="center">' + (document.getElementById("yms_premium_v1").checked ? "YES" : "NO") + '</td>' +
        '<td class="center"><input type="button" class="btn yms_send_batch_btn_v1" data-bi="' + i + '" value="Send"></td>' +
        '<td id="yms_batch_res_' + i + '"></td>';
      tb.appendChild(tr);
    }

    tb.querySelectorAll(".yms_send_batch_btn_v1").forEach(function (btn) {
      btn.onclick = async function () {
        var bi = parseInt(btn.getAttribute("data-bi"), 10);
        await Y.main.sendBatchIndex(bi);
      };
    });
  };

  Y.ui.setProgress = function (pct, text) {
    var bar = document.getElementById("yms_prog_v1");
    var t = document.getElementById("yms_prog_txt_v1");
    if (bar) bar.style.width = Math.max(0, Math.min(100, pct)) + "%";
    if (t) t.textContent = text || "";
  };

  Y.ui.msg = msg;
})();
