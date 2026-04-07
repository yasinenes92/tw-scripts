javascript:(function () {
  'use strict';

  // === CONFIG ===
  // Repo yolunu kendine gÃ¶re gÃ¼ncelle.
  // Ã–rn: .../tw-scripts@main/Yaver-Resources/Resource%20Orchestrator/v26/
  var BASE = 'https://cdn.jsdelivr.net/gh/yasinenes92/tw-scripts@main/Yaver-Resources/Resource%20Orchestrator/v26/';
  var FILES = [
    '00_bootstrap_ro_v26.js',
    '10_data_ro_v26.js',
    '20_fetch_ro_v26.js',
    '30_compute_ro_v26.js',
    '40_ui_ro_v26.js',
    '50_main_ro_v26.js',
  ];

  var bust = 'v=' + Date.now() + '_' + Math.random().toString(16).slice(2);

  function log() {
    var args = Array.prototype.slice.call(arguments);
    args.unshift('[YRO v26 Loader]');
    console.log.apply(console, args);
  }

  function loadScript(url) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.type = 'text/javascript';
      s.src = url + (url.indexOf('?') >= 0 ? '&' : '?') + bust;
      s.onload = function () { resolve(); };
      s.onerror = function (e) { reject(e); };
      document.head.appendChild(s);
    });
  }

  if (!window.$ || !window.jQuery) {
    alert('YRO v26: jQuery yok. (TW sayfasÄ±nda olmalÄ±sÄ±n)');
    return;
  }
  if (!window.game_data) {
    alert('YRO v26: game_data bulunamadÄ±. (TW oyunu iÃ§inde olmalÄ±sÄ±n)');
    return;
  }

  (async function () {
    try {
      for (var i = 0; i < FILES.length; i++) {
        var url = BASE + FILES[i];
        log('loading:', url);
        await loadScript(url);
      }
      if (window.YRO_V26 && typeof window.YRO_V26.init === 'function') {
        window.YRO_V26.init();
      } else {
        alert('YRO v26: init bulunamadÄ±. ModÃ¼ller yÃ¼klenememiÅŸ olabilir.');
      }
    } catch (e) {
      console.error(e);
      alert('YRO v26 Loader hata. Console kontrol et.');
    }
  })();
})();
