javascript:(function () {
  'use strict';

  // === CONFIG ===
  // Repo yolunu kendine gÃƒÂ¶re gÃƒÂ¼ncelle.
  // Ãƒâ€“rn: .../tw-scripts@main/Yaver-Resources/Resource%20Orchestrator/v30/
  var BASE = 'https://cdn.jsdelivr.net/gh/yasinenes92/tw-scripts@main/Yaver-Resources/Resource%20Orchestrator/v30/';
  var FILES = [
    '00_bootstrap_ro_v30.js',
    '10_data_ro_v30.js',
    '20_fetch_ro_v30.js',
    '30_compute_ro_v30.js',
    '40_ui_ro_v30.js',
    '50_main_ro_v30.js',
  ];

  var bust = 'v=' + Date.now() + '_' + Math.random().toString(16).slice(2);

  function log() {
    var args = Array.prototype.slice.call(arguments);
    args.unshift('[YRO v30 Loader]');
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
    alert('YRO v30: jQuery yok. (TW sayfasÃ„Â±nda olmalÃ„Â±sÃ„Â±n)');
    return;
  }
  if (!window.game_data) {
    alert('YRO v30: game_data bulunamadÃ„Â±. (TW oyunu iÃƒÂ§inde olmalÃ„Â±sÃ„Â±n)');
    return;
  }

  (async function () {
    try {
      for (var i = 0; i < FILES.length; i++) {
        var url = BASE + FILES[i];
        log('loading:', url);
        await loadScript(url);
      }
      if (window.YRO_V30 && typeof window.YRO_V30.init === 'function') {
        window.YRO_V30.init();
      } else {
        alert('YRO v30: init bulunamadÃ„Â±. ModÃƒÂ¼ller yÃƒÂ¼klenememiÃ…Å¸ olabilir.');
      }
    } catch (e) {
      console.error(e);
      alert('YRO v30 Loader hata. Console kontrol et.');
    }
  })();
})();

