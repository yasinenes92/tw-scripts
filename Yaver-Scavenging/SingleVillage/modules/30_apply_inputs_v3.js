(function () {
  "use strict";

  var Y = window.__YSS_SINGLE_V2__;
  if (!Y) return;

  Y.apply = {};

  function getSc() { return window.ScavengeScreen; }

  function setNativeValue(el, value) {
    try {
      var proto = Object.getPrototypeOf(el);
      var desc = Object.getOwnPropertyDescriptor(proto, "value");
      var setter = desc && desc.set;
      if (setter) setter.call(el, value);
      else el.value = value;
    } catch (e) {
      el.value = value;
    }
  }

  function triggerInput(inp) {
    if (!inp) return;
    try { inp.dispatchEvent(new Event("input", { bubbles: true })); } catch (e) {}
    try { inp.dispatchEvent(new Event("change", { bubbles: true })); } catch (e2) {}
    try { inp.dispatchEvent(new KeyboardEvent("keyup", { bubbles: true, key: "0" })); } catch (e3) {}
    if (window.jQuery) {
      try { window.jQuery(inp).trigger("input").trigger("keyup").trigger("change"); } catch (e4) {}
    }
  }

  function fallbackWriteDOM(units) {
    var root = document.querySelector("#scavenge_screen .candidate-squad-widget");
    if (!root) return;

    Y.sendOrderDefault.forEach(function (u) {
      var inp = root.querySelector('input.unitsInput[name="' + u + '"]');
      if (!inp) return;
      var v = (units && units[u] != null) ? String(units[u]) : "0";
      setNativeValue(inp, v);
      triggerInput(inp);
    });
  }

  Y.apply.applyUnitsToGame = function (planUnits) {
    var sc = getSc();

    var counts = {};
    Y.sendOrderDefault.forEach(function (u) {
      counts[u] = Y.util.clamp0(planUnits && planUnits[u] ? planUnits[u] : 0);
    });

    if (!sc || !sc.candidate_squad) {
      fallbackWriteDOM(counts);
      return;
    }

    try {
      if (typeof sc.candidate_squad.wipeUnitCounts === "function") sc.candidate_squad.wipeUnitCounts();
      else if (typeof sc.candidate_squad.setUnitCounts === "function") sc.candidate_squad.setUnitCounts({});
    } catch (e) {}

    try {
      if (typeof sc.candidate_squad.setUnitCounts === "function") {
        sc.candidate_squad.setUnitCounts(counts);
      } else {
        fallbackWriteDOM(counts);
      }
    } catch (e2) {
      fallbackWriteDOM(counts);
    }

    try {
      if (window.TribalWars && window.jQuery) window.jQuery(TribalWars).trigger("global_tick.scavenge_screen");
    } catch (e3) {}

    setTimeout(function () {
      var root = document.querySelector("#scavenge_screen .candidate-squad-widget");
      if (!root) return;

      var anyMismatch = false;
      Y.sendOrderDefault.forEach(function (u) {
        var inp = root.querySelector('input.unitsInput[name="' + u + '"]');
        if (!inp) return;
        var want = String(counts[u] || 0);
        var have = String((inp.value || "0").trim() || "0");
        if (have !== want) anyMismatch = true;
      });

      if (anyMismatch) {
        fallbackWriteDOM(counts);
        try {
          if (window.TribalWars && window.jQuery) window.jQuery(TribalWars).trigger("global_tick.scavenge_screen");
        } catch (e4) {}
      }
    }, 150);
  };

  Y.apply.clearInputs = function () {
    var sc = getSc();
    if (sc && sc.candidate_squad) {
      try {
        if (typeof sc.candidate_squad.wipeUnitCounts === "function") sc.candidate_squad.wipeUnitCounts();
        else if (typeof sc.candidate_squad.setUnitCounts === "function") sc.candidate_squad.setUnitCounts({});
      } catch (e) {}
      try {
        if (window.TribalWars && window.jQuery) window.jQuery(TribalWars).trigger("global_tick.scavenge_screen");
      } catch (e2) {}
      return;
    }
    fallbackWriteDOM({});
  };
})();