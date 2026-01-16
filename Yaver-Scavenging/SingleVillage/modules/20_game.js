(function () {
  "use strict";

  var api = window.Yaver && window.Yaver.ScavSingle;
  if (!api) return;

  var U = api.utils;
  var G = api.game = api.game || {};

  G.isScavengePage = function () {
    try {
      if (window.game_data && game_data.screen === "place" && game_data.mode === "scavenge") return true;
    } catch (e) {}
    return (window.location.href.indexOf("screen=place") >= 0 && window.location.href.indexOf("mode=scavenge") >= 0);
  };

  G.getOptionTitlesInDomOrder = function () {
    // Scavenge options titles are inside .scavenge-option .title
    var titles = [];
    $(".scavenge-option .title").each(function () {
      var t = $(this).text().trim();
      if (t) titles.push(t);
    });

    // fallback (some themes)
    if (!titles.length) {
      var tEls = document.getElementsByClassName("title");
      for (var i = 0; i < tEls.length; i++) {
        var tx = (tEls[i].textContent || "").trim();
        if (tx) titles.push(tx);
      }
    }
    return titles.slice(0, 4);
  };

  G.getDurationParams = function () {
    // Prefer the official runtime params if available
    try {
      if (window.ScavengeScreen && window.ScavengeScreen.village && window.ScavengeScreen.village.options && window.ScavengeScreen.village.options[1]) {
        var b = window.ScavengeScreen.village.options[1].base;
        return {
          duration_factor: Number(b.duration_factor),
          duration_exponent: Number(b.duration_exponent),
          duration_initial_seconds: Number(b.duration_initial_seconds),
          source: "window.ScavengeScreen"
        };
      }
    } catch (e) {}

    // Fallback: parse script tag (older versions)
    try {
      var html = $("html").find('script:contains("ScavengeScreen")').html();
      var m = html && html.match(/\{.*\:\{.*\:.*\}\}/g);
      if (m && m[0]) {
        var parsed = JSON.parse(m[0]);
        return {
          duration_factor: Number(parsed[1].duration_factor),
          duration_exponent: Number(parsed[1].duration_exponent),
          duration_initial_seconds: Number(parsed[1].duration_initial_seconds),
          source: "script-parse"
        };
      }
    } catch (e2) {}

    return null;
  };

  G.getAvailableUnits = function () {
    var out = {};
    $(".units-entry-all").each(function (_, el) {
      var unit = $(el).attr("data-unit");
      var txt = $(el).text();
      // grab last number in text
      var nums = (txt || "").match(/\d+/g);
      var n = nums && nums.length ? parseInt(nums[nums.length - 1], 10) : 0;
      out[unit] = isNaN(n) ? 0 : n;
    });
    return out;
  };

  G.findOptionContainerByTitle = function (title) {
    // Try exact match on .title inside .scavenge-option
    var $match = $(".scavenge-option .title").filter(function () {
      return $(this).text().trim() === title;
    }).first();

    if ($match.length) return $match.closest(".scavenge-option");
    // fallback contains
    return $(".scavenge-option:contains('" + title.replace(/'/g, "\\'") + "')").first();
  };

  G.getSendButton = function ($optionContainer) {
    if (!$optionContainer || !$optionContainer.length) return null;

    // Preferred: free send button inside option
    var $btn = $optionContainer.find("a.free_send_button").first();
    if ($btn.length) return $btn;

    // Fallback: find by text like Sophie script does
    try {
      var startButtonName = document.getElementsByClassName("btn btn-default free_send_button")[0].innerHTML;
      var $btn2 = $optionContainer.find("a:contains(" + startButtonName + ")").first();
      if ($btn2.length) return $btn2;
    } catch (e) {}

    return null;
  };

  G.isButtonDisabled = function ($btn) {
    if (!$btn || !$btn.length) return true;
    return $btn.hasClass("btn-disabled") || $btn.attr("disabled") === "disabled";
  };
})();
