// loader_console_yaver_pop_attack_splitter_v2.js
(function () {
  "use strict";

  const LOADER_KEY = "YaverPopAttackSplitterLoaderV2";
  if (window[LOADER_KEY]) {
    console.log("[Yaver 100pop Loader v2] already loaded ✅");
    if (window.YaverPopAttackSplitterV2) window.YaverPopAttackSplitterV2.toggleUI();
    return;
  }
  window[LOADER_KEY] = true;

  const MAIN =
    "https://cdn.jsdelivr.net/gh/yasinenes92/tw-scripts@main/Yaver-Attacks/100PopSplitter/yaver_pop_attack_splitter_v2.js";

  const u =
    MAIN + (MAIN.indexOf("?") >= 0 ? "&" : "?") + "v=" + Date.now() + "_" + Math.random().toString(16).slice(2);

  const s = document.createElement("script");
  s.src = u;

  s.onload = function () {
    console.log("[Yaver 100pop Loader v2] main loaded ✅", u);
    if (window.YaverPopAttackSplitterV2 && typeof window.YaverPopAttackSplitterV2.init === "function") {
      window.YaverPopAttackSplitterV2.init();
    }
  };

  s.onerror = function () {
    console.log("[Yaver 100pop Loader v2] FAIL ❌", u);
    alert("Yaver 100 Pop Splitter v2 loader yüklenemedi. Console'a bak.");
  };

  document.head.appendChild(s);
})();
