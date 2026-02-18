javascript:(function () {
  'use strict';

  // YRO v14 Loader (hardened)
  // - BASE auto-probe (optional candidates)
  // - better error messages + timeouts
  // - awaits init() and surfaces failures
  //
  // Eğer repo yolun farklıysa BASE_CANDIDATES listesine kendi yolunu ekle.

  var FILES = [
    '00_bootstrap_ro_v14.js',
    '10_data_ro_v14.js',
    '20_fetch_ro_v14.js',
    '30_compute_ro_v14.js',
    '40_ui_ro_v14.js',
    '50_main_ro_v14.js'
  ];

  var BASE_CANDIDATES = [
    // v14 preferred
    'https://cdn.jsdelivr.net/gh/yasinenes92/tw-scripts@main/Yaver-Resources/Resource%20Orchestrator/v14/',
    // fallback (if you haven't moved files yet)
    'https://cdn.jsdelivr.net/gh/yasinenes92/tw-scripts@main/Yaver-Resources/Resource%20Orchestrator/v12/',
  ];

  var bust = 'v=' + Date.now() + '_' + Math.random().toString(16).slice(2);

  function log() {
    var args = Array.prototype.slice.call(arguments);
    args.unshift('[YRO v14 Loader]');
    console.log.apply(console, args);
  }
  function warn() {
    var args = Array.prototype.slice.call(arguments);
    args.unshift('[YRO v14 Loader]');
    console.warn.apply(console, args);
  }

  function headEl() {
    return document.head || document.getElementsByTagName('head')[0] || document.documentElement;
  }

  function loadScript(url, timeoutMs) {
    timeoutMs = timeoutMs || 30000;

    return new Promise(function (resolve, reject) {
      var done = false;
      var t = setTimeout(function () {
        if (done) return;
        done = true;
        reject(new Error('Timeout while loading: ' + url));
      }, timeoutMs);

      var s = document.createElement('script');
      s.type = 'text/javascript';
      s.async = false; // preserve order
      s.src = url + (url.indexOf('?') >= 0 ? '&' : '?') + bust;

      s.onload = function () {
        if (done) return;
        done = true;
        clearTimeout(t);
        resolve();
      };
      s.onerror = function () {
        if (done) return;
        done = true;
        clearTimeout(t);
        reject(new Error('Failed to load: ' + url + ' (CSP/404/Network?)'));
      };

      headEl().appendChild(s);
    });
  }

  async function probeBase(base) {
    var url = base + FILES[0] + '?' + bust + '&probe=1';
    try {
      var r = await fetch(url, { method: 'GET', mode: 'cors', cache: 'no-store' });
      return r && r.ok;
    } catch (e) {
      return false;
    }
  }

  async function pickBase() {
    for (var i = 0; i < BASE_CANDIDATES.length; i++) {
      var b = BASE_CANDIDATES[i];
      log('probing BASE:', b);
      var ok = await probeBase(b);
      if (ok) {
        log('BASE OK ✅', b);
        return b;
      }
      warn('BASE failed ❌', b);
    }
    // fallback to the first one (keeps behavior predictable)
    return BASE_CANDIDATES[0];
  }

  // sanity checks: should run only inside TW game page
  if (!window.$ || !window.jQuery) {
    alert('YRO v14: jQuery yok. (TW sayfasında olmalısın)');
    return;
  }
  if (!window.game_data) {
    alert('YRO v14: game_data bulunamadı. (TW oyunu içinde olmalısın)');
    return;
  }

  (async function () {
    try {
      var base = await pickBase();

      for (var i = 0; i < FILES.length; i++) {
        var url = base + FILES[i];
        log('loading:', url);
        await loadScript(url, 30000);
      }

      if (!window.YRO_V14 || typeof window.YRO_V14.init !== 'function') {
        throw new Error('YRO v14: init bulunamadı. (Modüller yüklenmedi ya da base path yanlış)');
      }

      log('calling init() …');
      // init is async; await to surface errors
      await window.YRO_V14.init();
      log('init() done ✅');
    } catch (e) {
      console.error(e);
      alert(
        'YRO v14 Loader hata ❌\n\n' +
        (e && e.message ? e.message : String(e)) +
        '\n\nDetaylar için Console + Network sekmelerine bak.'
      );
    }
  })();
})();