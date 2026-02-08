(function () {
  "use strict";

  var Y = window.__YSS_SINGLE_V2__;
  if (!Y) return;

  Y.dom = {};

  function sc() { return window.ScavengeScreen; }

  Y.dom.getUnitObj = function (unit) {
    var s = sc();
    return (s && (s.units && s.units[unit])) ||
           (s && (s.unit_info && s.unit_info[unit])) ||
           (s && (s.unitData && s.unitData[unit])) ||
           null;
  };

  Y.dom.getUnitName = function (unit) {
    var u = Y.dom.getUnitObj(unit);
    if (u && u.name) return u.name;
    var fallback = {
      spear:"Spear fighter",
      sword:"Swordsman",
      axe:"Axeman",
      archer:"Archer",
      light:"Light cavalry",
      marcher:"Mounted archer",
      heavy:"Heavy cavalry"
    };
    return fallback[unit] || unit;
  };

  Y.dom.getCarry = function (unit) {
    var u = Y.dom.getUnitObj(unit);
    if (u && typeof u.carry === "number") return u.carry;
    var fallback = { spear:25, sword:15, axe:10, archer:10, light:80, marcher:50, heavy:50 };
    return fallback[unit] || 0;
  };

  Y.dom.getUnitCount = function (unit) {
    var el = document.querySelector('.units-entry-all[data-unit="' + unit + '"]');
    if (!el) return 0;
    var m = el.textContent.match(/\((\d+)\)/);
    return m ? parseInt(m[1], 10) : 0;
  };

  Y.dom.listOptions = function () {
    var s = sc();
    var village = s && s.village;
    var o = (village && village.options) ? village.options : {};
    var out = [];

    Object.keys(o).forEach(function (k) {
      var opt = o[k];
      var base = (opt && opt.base) ? opt.base : {};
      out.push({
        id: parseInt(k, 10),
        base_id: (opt && opt.base_id != null) ? opt.base_id : parseInt(k, 10),
        name: base.name || ("Option " + k),
        loot_factor: parseFloat(base.loot_factor || 0),
        duration_factor: parseFloat(base.duration_factor || 0),
        duration_exponent: parseFloat(base.duration_exponent || 0),
        duration_initial_seconds: parseFloat(base.duration_initial_seconds || 0),
        is_locked: !!(opt && opt.is_locked),
        scavenging_squad: (opt && opt.scavenging_squad) ? opt.scavenging_squad : null
      });
    });

    out.sort(function (a, b) { return a.id - b.id; });
    return out;
  };

  Y.dom.findOptionCard = function (baseId) {
    var cards = Array.prototype.slice.call(document.querySelectorAll(".scavenge-option"));
    for (var i = 0; i < cards.length; i++) {
      var card = cards[i];
      var bg = "";
      try { bg = (card.querySelector(".portrait") && card.querySelector(".portrait").style.backgroundImage) || ""; } catch (e) {}
      if (bg.indexOf("/options/" + baseId + ".") >= 0) return card;
      if (bg.indexOf("/options/" + baseId + ".png") >= 0) return card;
      if (bg.indexOf("/options/" + baseId + ".webp") >= 0) return card;
    }
    return null;
  };

  Y.dom.clearHighlights = function () {
    document.querySelectorAll(".scavenge-option.yss_hl_v2").forEach(function (x) {
      x.classList.remove("yss_hl_v2");
    });
  };

  Y.dom.highlightCard = function (baseId) {
    var card = Y.dom.findOptionCard(baseId);
    if (!card) return;
    card.classList.add("yss_hl_v2");
    try { card.scrollIntoView({ behavior: "smooth", block: "center" }); } catch (e) {}
  };

  // --- UI state ---
  Y.dom.readTimeSeconds = function () {
    var hRaw = document.getElementById("yss_h_v2") ? document.getElementById("yss_h_v2").value : "";
    var mRaw = document.getElementById("yss_m_v2") ? document.getElementById("yss_m_v2").value : "";
    var sRaw = document.getElementById("yss_s_v2") ? document.getElementById("yss_s_v2").value : "";

    var anyTyped = (hRaw !== "" && hRaw != null) || (mRaw !== "" && mRaw != null) || (sRaw !== "" && sRaw != null);

    var h = parseFloat(hRaw || "0") || 0;
    var m = parseInt(mRaw || "0", 10) || 0;
    var s = parseInt(sRaw || "0", 10) || 0;

    var total = Math.floor(h * 3600 + m * 60 + s);
    if (!anyTyped) total = 3600;
    return Math.max(1, total);
  };

  Y.dom.getUIState = function () {
    var timeSec = Y.dom.readTimeSeconds();
    var mode = (document.getElementById("yss_mode_bal_v2") && document.getElementById("yss_mode_bal_v2").checked) ? "balanced" : "priority";

    var unitsEnabled = {};
    document.querySelectorAll(".yss_unit_v2").forEach(function (cb) {
      unitsEnabled[cb.getAttribute("data-unit")] = cb.checked;
    });

    var optsEnabled = [];
    document.querySelectorAll(".yss_opt_v2").forEach(function (cb) {
      if (cb.checked) optsEnabled.push(parseInt(cb.getAttribute("data-opt"), 10));
    });

    // save cfg
    var saveObj = {
      time: {
        h: document.getElementById("yss_h_v2") ? document.getElementById("yss_h_v2").value : "",
        m: document.getElementById("yss_m_v2") ? document.getElementById("yss_m_v2").value : "",
        s: document.getElementById("yss_s_v2") ? document.getElementById("yss_s_v2").value : ""
      },
      mode: mode,
      unitsEnabled: unitsEnabled,
      optsEnabled: optsEnabled
    };
    Y.saveCfg(saveObj);

    return { timeSec: timeSec, mode: mode, unitsEnabled: unitsEnabled, optsEnabled: optsEnabled };
  };

  Y.dom.buildTroopsAllowed = function (unitsEnabled) {
    var allowed = {};
    Y.sendOrderDefault.forEach(function (u) {
      if (!unitsEnabled[u]) return;
      allowed[u] = Y.dom.getUnitCount(u);
    });
    return allowed;
  };

  Y.dom.sumCarry = function (troopsAllowed) {
    var total = 0;
    Object.keys(troopsAllowed).forEach(function (u) {
      total += (troopsAllowed[u] || 0) * Y.dom.getCarry(u);
    });
    return total;
  };

  Y.dom.minCarrySelected = function (troopsAllowed) {
    var m = Infinity;
    Object.keys(troopsAllowed).forEach(function (u) {
      var have = troopsAllowed[u] || 0;
      var c = Y.dom.getCarry(u);
      if (have > 0 && c > 0) m = Math.min(m, c);
    });
    return isFinite(m) ? m : 10;
  };
})();
