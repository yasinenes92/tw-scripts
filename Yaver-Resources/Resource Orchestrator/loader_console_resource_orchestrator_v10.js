(function () {
  'use strict';

  var VERSION = 'v10';
  var LOADER_TAG = 'YRO_LOADER_' + VERSION.toUpperCase();
  if (window[LOADER_TAG]) {
    console.log('[YRO Loader ' + VERSION + '] already loaded.');
    return;
  }
  window[LOADER_TAG] = true;

  // CDN base (repo path)
  var BASE =
    'https://cdn.jsdelivr.net/gh/yasinenes92/tw-scripts@main/' +
    'Yaver-Resources/Resource%20Orchestrator/modules/';

  var FILES = [
    '00_bootstrap_ro_v10.js',
    '10_data_ro_v10.js',
    '20_fetch_ro_v10.js',
    '30_compute_ro_v10.js',
    '40_ui_ro_v10.js',
    '50_main_ro_v10.js',
  ];

  function cacheBust() {
    // deterministic enough: time + random
    return Date.now() + '_' + Math.random().toString(16).slice(2);
  }

  function loadOne(i) {
    if (i >= FILES.length) {
      console.log('[YRO Loader ' + VERSION + '] ALL OK ✅');
      return;
    }

    var f = FILES[i];
    var url = BASE + f + '?v=' + cacheBust();

    console.log('[YRO Loader ' + VERSION + '] loading:', url);
    var s = document.createElement('script');
    s.src = url;
    s.async = true;

    s.onload = function () {
      console.log('[YRO Loader ' + VERSION + '] OK:', f);
      loadOne(i + 1);
    };
    s.onerror = function (e) {
      console.error('[YRO Loader ' + VERSION + '] FAILED:', f, e);
    };

    document.head.appendChild(s);
  }

  loadOne(0);
})();
