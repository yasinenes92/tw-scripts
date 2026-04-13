javascript:(function () {
  'use strict';

  // === CONFIG ===
  // Repo yolunu kendine gÃƒÆ’Ã‚Â¶re gÃƒÆ’Ã‚Â¼ncelle.
  // ÃƒÆ’Ã¢â‚¬â€œrn: .../tw-scripts@main/Yaver-Resources/Resource%20Orchestrator/v32/
  var BASE = 'https://cdn.jsdelivr.net/gh/yasinenes92/tw-scripts@main/Yaver-Resources/Resource%20Orchestrator/v32/';
  var FILES = [
    '00_bootstrap_ro_v32.js',
    '10_data_ro_v32.js',
    '20_fetch_ro_v32.js',
    '30_compute_ro_v32.js',
    '40_ui_ro_v32.js',
    '50_main_ro_v32.js',
  ];

  var bust = 'v=' + Date.now() + '_' + Math.random().toString(16).slice(2);

  function log() {
    var args = Array.prototype.slice.call(arguments);
    args.unshift('[YRO v32 Loader]');
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
    alert('YRO v32: jQuery yok. (TW sayfasÃƒâ€žÃ‚Â±nda olmalÃƒâ€žÃ‚Â±sÃƒâ€žÃ‚Â±n)');
    return;
  }
  if (!window.game_data) {
    alert('YRO v32: game_data bulunamadÃƒâ€žÃ‚Â±. (TW oyunu iÃƒÆ’Ã‚Â§inde olmalÃƒâ€žÃ‚Â±sÃƒâ€žÃ‚Â±n)');
    return;
  }

  (async function () {
    try {
      for (var i = 0; i < FILES.length; i++) {
        var url = BASE + FILES[i];
        log('loading:', url);
        await loadScript(url);
      }
      if (window.YRO_V32 && typeof window.YRO_V32.init === 'function') {
        window.YRO_V32.init();
      } else {
        alert('YRO v32: init bulunamadÃƒâ€žÃ‚Â±. ModÃƒÆ’Ã‚Â¼ller yÃƒÆ’Ã‚Â¼klenememiÃƒâ€¦Ã…Â¸ olabilir.');
      }
    } catch (e) {
      console.error(e);
      alert('YRO v32 Loader hata. Console kontrol et.');
    }
  })();
})();


