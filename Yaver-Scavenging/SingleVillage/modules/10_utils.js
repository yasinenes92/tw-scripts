(function () {
  "use strict";

  var api = window.Yaver && window.Yaver.ScavSingle;
  if (!api) return;

  var U = api.utils = api.utils || {};

  U.log = function () {
    if (api.config.debug) console.log.apply(console, ["[Yaver.ScavSingle]"].concat([].slice.call(arguments)));
  };
  U.warn = function () {
    console.warn.apply(console, ["[Yaver.ScavSingle]"].concat([].slice.call(arguments)));
  };
  U.err = function () {
    console.error.apply(console, ["[Yaver.ScavSingle]"].concat([].slice.call(arguments)));
  };

  U.safeInt = function (v, def) {
    var n = parseInt(v, 10);
    return isNaN(n) ? (def || 0) : n;
  };

  U.clamp = function (n, min, max) {
    return Math.max(min, Math.min(max, n));
  };

  U.floor = function (n) {
    return Math.floor(Number(n) || 0);
  };

  U.now = function () { return Date.now(); };

  U.sleep = function (ms) {
    return new Promise(function (res) { setTimeout(res, ms); });
  };

  U.qs = function (sel, root) {
    return (root || document).querySelector(sel);
  };

  U.qsa = function (sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  };

  U.getStorageKey = function (k) {
    var world = api.env.world || "world";
    return api.config.storagePrefix + world + ":" + k;
  };

  U.storeGet = function (k, fallback) {
    try {
      var raw = localStorage.getItem(U.getStorageKey(k));
      if (raw === null || raw === undefined) return fallback;
      return JSON.parse(raw);
    } catch (e) {
      return fallback;
    }
  };

  U.storeSet = function (k, val) {
    try {
      localStorage.setItem(U.getStorageKey(k), JSON.stringify(val));
    } catch (e) {}
  };

  U.toText = function (x) {
    return (x === null || x === undefined) ? "" : String(x);
  };
})();
