(function () {
  "use strict";

  var api = window.Yaver && window.Yaver.ScavSingle;
  if (!api) return;

  var U = api.utils;
  var G = api.game;

  function loadState() {
    api.state.hours = U.storeGet("hours", api.config.defaultHours);
    api.state.enabledUnits = U.storeGet("enabledUnits", api.config.defaultEnabledUnits);
    api.state.enabledOptions = U.storeGet("enabledOptions", api.config.defaultEnabledOptions);
  }

  function saveState() {
    U.storeSet("hours", api.state.hours);
    U.storeSet("enabledUnits", api.state.enabledUnits);
    U.storeSet("enabledOptions", api.state.enabledOptions);
  }

  function ensurePanel() {
    if ($("#yaver_scav_panel").length) return;

    var html = `
      <div id="yaver_scav_panel" class="vis" style="margin:10px 5px; padding:8px;">
        <h4 style="margin:0 0 6px 0;">Yaver Scav (Single Village)</h4>

        <div style="display:flex; gap:14px; flex-wrap:wrap; align-items:flex-start;">
          <div>
            <div style="margin-bottom:6px;">
              <b>Target runtime (hours):</b>
              <input id="yaver_hours" type="number" min="1" max="48" style="width:70px; margin-left:6px;" />
            </div>

            <div style="margin-bottom:6px;">
              <b>Options:</b><br/>
              <label><input type="checkbox" class="yaver_opt" data-opt="1"> Option 1</label><br/>
              <label><input type="checkbox" class="yaver_opt" data-opt="2"> Option 2</label><br/>
              <label><input type="checkbox" class="yaver_opt" data-opt="3"> Option 3</label><br/>
              <label><input type="checkbox" class="yaver_opt" data-opt="4"> Option 4</label>
            </div>

            <div style="margin-bottom:6px;">
              <label title="Sadece doldurur; click yapmaz."><input type="checkbox" id="yaver_autosend"> Auto-send (click)</label>
            </div>
          </div>

          <div>
            <b>Units:</b><br/>
            <div id="yaver_units_box"></div>
          </div>
        </div>

        <div style="margin-top:8px; display:flex; gap:8px; align-items:center;">
          <a href="#" id="yaver_btn_fill" class="btn btn-default">PLAN + FILL</a>
          <a href="#" id="yaver_btn_send" class="btn btn-confirm-yes">PLAN + FILL + SEND</a>
          <span id="yaver_status" style="margin-left:6px;"></span>
        </div>
      </div>
    `;

    $("#scavenge_screen").prepend(html);
  }

  function renderUnits(available) {
    var enabled = api.state.enabledUnits || {};
    var carry = api.config.carry;

    var unitOrder = ["spear", "sword", "axe", "archer", "light", "marcher", "heavy"];
    var out = "";

    unitOrder.forEach(function (u) {
      if (available[u] === undefined) return;
      // only show if exists on this world/screen
      var checked = enabled[u] ? "checked" : "";
      out += `<label style="display:block;">
                <input type="checkbox" class="yaver_unit" data-unit="${u}" ${checked}>
                ${u} (have: ${available[u]} / carry:${carry[u]})
              </label>`;
    });

    $("#yaver_units_box").html(out);
  }

  function refreshPanel() {
    loadState();

    ensurePanel();

    // Set values
    $("#yaver_hours").val(api.state.hours);
    $("#yaver_autosend").prop("checked", !!api.config.autoSend);

    // Options
    $(".yaver_opt").each(function (_, el) {
      var id = $(el).data("opt");
      $(el).prop("checked", !!api.state.enabledOptions[String(id)]);
    });

    // Units (based on current page)
    var available = G.getAvailableUnits();
    renderUnits(available);

    $("#yaver_status").text("");
  }

  function bindEvents() {
    // hours
    $(document).on("change", "#yaver_hours", function () {
      api.state.hours = U.safeInt($(this).val(), api.config.defaultHours);
      saveState();
    });

    // options
    $(document).on("change", ".yaver_opt", function () {
      var id = String($(this).data("opt"));
      api.state.enabledOptions[id] = !!$(this).is(":checked");
      saveState();
    });

    // units
    $(document).on("change", ".yaver_unit", function () {
      var u = String($(this).data("unit"));
      api.state.enabledUnits[u] = !!$(this).is(":checked");
      saveState();
    });

    // auto-send toggle (runtime behavior)
    $(document).on("change", "#yaver_autosend", function () {
      api.config.autoSend = !!$(this).is(":checked");
    });

    // buttons
    $(document).on("click", "#yaver_btn_fill", function (e) {
      e.preventDefault();
      api.run(false);
    });

    $(document).on("click", "#yaver_btn_send", function (e) {
      e.preventDefault();
      api.run(true);
    });
  }

  api.run = function (forceSend) {
    if (!G.isScavengePage()) {
      UI.ErrorMessage("Scavenging sayfasında değilsin (place&mode=scavenge).", 4000);
      return;
    }

    loadState();

    var doSend = !!(forceSend || api.config.autoSend);
    var plan = api.planner.compute(api.state.hours, api.state.enabledUnits, api.state.enabledOptions);

    if (!plan.ok) {
      $("#yaver_status").text("❌ " + plan.error);
      UI.ErrorMessage(plan.error, 5000);
      return;
    }

    api.state.lastPlan = plan;
    saveState();

    var res = api.apply.applyPlan(plan, api.state.enabledOptions, doSend);

    if (!res.ok) {
      $("#yaver_status").text("❌ " + res.error);
      UI.ErrorMessage(res.error, 5000);
      return;
    }

    var msg = res.sent
      ? ("✅ Sent: Option " + res.optId)
      : ("✅ Filled: Option " + res.optId + " (click button to send)");

    $("#yaver_status").text(msg);
    UI.SuccessMessage(msg, 2000);
  };

  api.init = function () {
    if (!G.isScavengePage()) {
      U.log("Not on scavenge page; panel will still init when you open it.");
    }
    refreshPanel();
    bindEvents();
    U.log("Initialized ✅", { version: api.VERSION, world: api.env.world });
  };
})();
