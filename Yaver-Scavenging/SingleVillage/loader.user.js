// ==UserScript==
// @name         Yaver Scavenging (Single Village) - Loader
// @namespace    https://github.com/yasinenes92/tw-scripts
// @version      1.0.0
// @description  Loads modular Yaver Scavenging Single Village scripts from GitHub raw.
// @match        https://*.tribalwars.*/*
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function () {
  "use strict";

  // ✅ If you fork the repo, change this BASE to your fork raw URL.
  // Example:
  // https://raw.githubusercontent.com/<YOUR_USERNAME>/tw-scripts/main/Yaver-Scavenging/SingleVillage/modules/
  const BASE =
    "https://raw.githubusercontent.com/yasinenes92/tw-scripts/main/Yaver-Scavenging/SingleVillage/modules/";

  const FILES = [
    "00_bootstrap.js",
    "10_utils.js",
    "20_game.js",
    "30_planner.js",
    "40_apply.js",
    "50_ui.js",
  ];

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = src;
      s.async = false;
      s.onload = () => resolve(true);
      s.onerror = () => reject(new Error("Failed to load: " + src));
      document.head.appendChild(s);
    });
  }

  (async () => {
    for (const f of FILES) {
      await loadScript(BASE + f);
    }
    // ui module boots itself
  })().catch((e) => console.error("[YaverScav Loader]", e));
})();
