(function () {
  'use strict';

  var VERSION = 'v26';
  var NS = 'YRO_V26';
  var PANEL_ID = 'yro_panel_v26';
  var STYLE_ID = 'yro_css_v26';
  var PICKER_OVERLAY_ID = 'yro_picker_overlay_v26';
  var LS_KEY = 'yro_v26_state';

  function removeIfExists(id) {
    var el = document.getElementById(id);
    if (el && el.parentNode) el.parentNode.removeChild(el);
  }

  function cleanupOlderInstances() {
    [
      'yro_panel_v7', 'yro_css_v7',
      'yro_panel_v10', 'yro_css_v10',
      'yro_panel_v11', 'yro_css_v11',
      'yro_panel_v22', 'yro_css_v22', 'yro_picker_overlay_v22',
      PANEL_ID, STYLE_ID, PICKER_OVERLAY_ID
    ].forEach(removeIfExists);

    try { if (window.YRO_V11) delete window.YRO_V11; } catch (e1) {}
    try { if (window.YRO_V22) delete window.YRO_V22; } catch (e2) {}
    try { if (window.YRO_V26) delete window.YRO_V26; } catch (e3) {}
    try { if (window.__YAVER_RESOURCE_ORCHESTRATOR_V7__) delete window.__YAVER_RESOURCE_ORCHESTRATOR_V7__; } catch (e4) {}
  }

  cleanupOlderInstances();

  var Y = {};
  window[NS] = Y;

  Y._rt = { listeners: [], aborters: [], destroyed: false };

  function nowTs() {
    var d = new Date();
    function pad(n) { return (n < 10 ? '0' : '') + n; }
    return pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear() +
      ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
  }

  function log() {
    var a = [].slice.call(arguments);
    a.unshift('[YRO ' + VERSION + ']');
    console.log.apply(console, a);
  }

  function warn() {
    var a = [].slice.call(arguments);
    a.unshift('[YRO ' + VERSION + ']');
    console.warn.apply(console, a);
  }

  function err() {
    var a = [].slice.call(arguments);
    a.unshift('[YRO ' + VERSION + ']');
    console.error.apply(console, a);
  }

  function qs(sel, root) { return (root || document).querySelector(sel); }
  function qsa(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function safeInt(x, dflt) {
    var n = parseInt(x, 10);
    return isNaN(n) ? (dflt || 0) : n;
  }

  function toId(x) {
    var n = safeInt(x, 0);
    return n > 0 ? n : 0;
  }

  function uniqIds(arr) {
    arr = Array.isArray(arr) ? arr : [];
    var seen = Object.create(null);
    var out = [];
    for (var i = 0; i < arr.length; i++) {
      var id = toId(arr[i]);
      if (!id || seen[id]) continue;
      seen[id] = true;
      out.push(id);
    }
    return out;
  }

  function normalizeGroupName(name) {
    var s = String(name == null ? '' : name)
      .replace(/\u00a0/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (!s) return '';
    s = s.replace(/^[>\]]+\s*/, '').replace(/\s*[<\[]+$/, '').trim();
    s = s.replace(/^[>\[]+\s*/, '').replace(/\s*[<\]]+$/, '').trim();
    return s;
  }

  function parseTwNumber(s) {
    if (s == null) return 0;
    var str = String(s).trim();
    if (!str) return 0;
    var digits = str.replace(/[^\d]/g, '');
    return digits ? safeInt(digits, 0) : 0;
  }

  function formatTwNumber(n) {
    n = safeInt(n, 0);
    var s = String(Math.max(0, n));
    var out = '';
    while (s.length > 3) {
      out = '.' + s.slice(-3) + out;
      s = s.slice(0, -3);
    }
    return s + out;
  }

  function debounce(fn, ms) {
    var t = null;
    return function () {
      var ctx = this;
      var args = arguments;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(ctx, args); }, ms || 150);
    };
  }

  function sleep(ms) {
    return new Promise(function (resolve) { setTimeout(resolve, ms || 0); });
  }

  function lsGet(key) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function lsSet(key, obj) {
    try { localStorage.setItem(key, JSON.stringify(obj)); } catch (e) {}
  }

  function getCurrentVillageId() {
    try {
      if (window.game_data && game_data.village && game_data.village.id) return toId(game_data.village.id);
    } catch (e1) {}
    try {
      var sp = new URLSearchParams(window.location.search);
      return toId(sp.get('village'));
    } catch (e2) {}
    return 0;
  }

  function getLinkBasePure() {
    try {
      if (window.game_data && game_data.link_base_pure) return game_data.link_base_pure;
    } catch (e) {}
    var vid = getCurrentVillageId();
    return '/game.php?village=' + vid + '&screen=';
  }

  function buildGameUrl(screen, params) {
    params = params || {};
    var base = getLinkBasePure();
    var url = base + encodeURIComponent(screen);
    var qp = [];
    for (var k in params) {
      if (!Object.prototype.hasOwnProperty.call(params, k)) continue;
      if (params[k] === undefined || params[k] === null) continue;
      qp.push(encodeURIComponent(k) + '=' + encodeURIComponent(String(params[k])));
    }
    if (qp.length) url += '&' + qp.join('&');
    return url;
  }

  function parseVillageIdFromHref(href) {
    if (!href) return 0;
    try {
      var u = new URL(href, window.location.origin);
      return toId(u.searchParams.get('village'));
    } catch (e) {
      var m = String(href).match(/[?&]village=(\d+)/);
      return m ? toId(m[1]) : 0;
    }
  }

  function parseCoordsFromText(txt) {
    var m = String(txt || '').match(/\((\d+)\|(\d+)\)/);
    if (!m) return null;
    var x = safeInt(m[1], 0);
    var y = safeInt(m[2], 0);
    var k = safeInt(Math.floor(y / 100) * 10 + Math.floor(x / 100), 0);
    return { x: x, y: y, k: k, coord: x + '|' + y };
  }

  function on(el, type, fn, opts) {
    if (!el) return;
    el.addEventListener(type, fn, opts || false);
    Y._rt.listeners.push({ el: el, type: type, fn: fn, opts: opts || false });
  }

  function destroy() {
    if (Y._rt.destroyed) return;
    Y._rt.destroyed = true;

    Y._rt.aborters.forEach(function (a) {
      try { a.abort(); } catch (e) {}
    });
    Y._rt.aborters = [];

    Y._rt.listeners.forEach(function (l) {
      try { l.el.removeEventListener(l.type, l.fn, l.opts); } catch (e) {}
    });
    Y._rt.listeners = [];

    removeIfExists(PANEL_ID);
    removeIfExists(STYLE_ID);
    removeIfExists(PICKER_OVERLAY_ID);

    try { delete window[NS]; } catch (e2) {}
  }

  async function httpGet(url, timeoutMs) {
    timeoutMs = timeoutMs || 30000;
    var ac = new AbortController();
    Y._rt.aborters.push(ac);
    var t = setTimeout(function () {
      try { ac.abort(); } catch (e) {}
    }, timeoutMs);

    try {
      var resp = await fetch(url, { method: 'GET', credentials: 'same-origin', signal: ac.signal });
      if (!resp.ok) throw new Error('HTTP ' + resp.status + ' ' + resp.statusText);
      return await resp.text();
    } finally {
      clearTimeout(t);
    }
  }

  function parseHTML(html) {
    return new DOMParser().parseFromString(String(html || ''), 'text/html');
  }

  function extractUpdateGameData(html) {
    var s = String(html || '');
    var key = 'TribalWars.updateGameData(';
    var idx = s.indexOf(key);
    if (idx < 0) return null;

    var i = s.indexOf('{', idx + key.length);
    if (i < 0) return null;

    var depth = 0;
    var j = i;
    for (; j < s.length; j++) {
      var ch = s[j];
      if (ch === '{') depth++;
      else if (ch === '}') {
        depth--;
        if (depth === 0) {
          j++;
          break;
        }
      }
    }
    if (depth !== 0) return null;

    var jsonText = s.slice(i, j);
    try {
      return JSON.parse(jsonText);
    } catch (e) {
      warn('updateGameData JSON.parse failed', e);
      return null;
    }
  }

  function defaultState() {
    return {
      ui: {
        left: 30,
        top: 70,
        minimized1: true,
        minimized2: true,
        search: ''
      },
      groups: {
        list: [{ id: 0, name: 'All villages' }, { id: -1, name: 'Custom selection...' }],
        sel1: 0,
        sel2: 0,
        A_target: 0,
        A_surplus: 0,
        B_parents: 0,
        B_children: 0,
        B_surplus: 0,
        C_target: 0,
        C_surplus: 0
      },
      custom: {
        t1: [],
        t2: [],
        A_target: [],
        A_surplus: [],
        B_parents: [],
        B_children: [],
        B_surplus: [],
        C_target: [],
        C_surplus: []
      },
      orchestrator: {
        mode: 'push'
      },
      modeA: {
        capPct: 80,
        surplusCapPct: 95
      },
      modeB: {
        parentReservePct: 1,
        childrenMaxFillPct: 80,
        surplusCapPct: 95
      },
      modeC: {
        reservePct: 1,
        capPct: 80,
        surplusCapPct: 95,
        ironDeltaPct: null
      },
      cache: {
        groupsFetchedAt: 0,
        groupVillageIds: {},
        villages: {},
        incomingMap: {},
        outgoingMap: {},
        lastFullScanAt: 0
      }
    };
  }

  function mergeMissing(target, defaults) {
    for (var k in defaults) {
      if (!Object.prototype.hasOwnProperty.call(defaults, k)) continue;
      if (defaults[k] && typeof defaults[k] === 'object' && !Array.isArray(defaults[k])) {
        if (!target[k] || typeof target[k] !== 'object' || Array.isArray(target[k])) target[k] = {};
        mergeMissing(target[k], defaults[k]);
      } else if (target[k] === undefined) {
        target[k] = defaults[k];
      }
    }
    return target;
  }

  function sanitizeState(st) {
    st = st && typeof st === 'object' ? st : {};
    st = mergeMissing(st, defaultState());

    st.groups.list = Array.isArray(st.groups.list) ? st.groups.list : defaultState().groups.list;
    st.groups.list = st.groups.list.map(function (g) {
      return {
        id: safeInt(g && g.id, 0),
        name: normalizeGroupName(g && g.name) || (safeInt(g && g.id, 0) === 0 ? 'All villages' : (safeInt(g && g.id, 0) === -1 ? 'Custom selection...' : String(safeInt(g && g.id, 0))))
      };
    }).filter(function (g, idx, arr) {
      if (!g.name) return false;
      for (var i = 0; i < idx; i++) {
        if (String(arr[i].id) === String(g.id)) return false;
      }
      return true;
    });
    st.custom.t1 = uniqIds(st.custom.t1);
    st.custom.t2 = uniqIds(st.custom.t2);
    st.custom.A_target = uniqIds(st.custom.A_target);
    st.custom.A_surplus = uniqIds(st.custom.A_surplus);
    st.custom.B_parents = uniqIds(st.custom.B_parents);
    st.custom.B_children = uniqIds(st.custom.B_children);
    st.custom.B_surplus = uniqIds(st.custom.B_surplus);
    st.custom.C_target = uniqIds(st.custom.C_target);
    st.custom.C_surplus = uniqIds(st.custom.C_surplus);

    st.groups.sel1 = safeInt(st.groups.sel1, 0);
    st.groups.sel2 = safeInt(st.groups.sel2, 0);
    st.groups.A_target = safeInt(st.groups.A_target, 0);
    st.groups.A_surplus = safeInt(st.groups.A_surplus, 0);
    st.groups.B_parents = safeInt(st.groups.B_parents, 0);
    st.groups.B_children = safeInt(st.groups.B_children, 0);
    st.groups.B_surplus = safeInt(st.groups.B_surplus, 0);
    st.groups.C_target = safeInt(st.groups.C_target, 0);
    st.groups.C_surplus = safeInt(st.groups.C_surplus, 0);

    st.modeA.capPct = safeInt(st.modeA.capPct, 80);
    st.modeA.surplusCapPct = safeInt(st.modeA.surplusCapPct, 95);
    delete st.modeA.ironDeltaPct;

    st.modeB.parentReservePct = safeInt(st.modeB.parentReservePct, 1);
    st.modeB.childrenMaxFillPct = safeInt(st.modeB.childrenMaxFillPct, 80);
    st.modeB.surplusCapPct = safeInt(st.modeB.surplusCapPct, 95);

    st.modeC.reservePct = safeInt(st.modeC.reservePct, 1);
    st.modeC.capPct = safeInt(st.modeC.capPct, 80);
    st.modeC.surplusCapPct = safeInt(st.modeC.surplusCapPct, 95);
    st.modeC.ironDeltaPct = st.modeC.ironDeltaPct == null || st.modeC.ironDeltaPct === '' ? null : safeInt(st.modeC.ironDeltaPct, 0);

    if (!st.cache || typeof st.cache !== 'object') st.cache = defaultState().cache;
    if (!st.cache.groupVillageIds || typeof st.cache.groupVillageIds !== 'object') st.cache.groupVillageIds = {};
    if (!st.cache.villages || typeof st.cache.villages !== 'object') st.cache.villages = {};
    if (!st.cache.incomingMap || typeof st.cache.incomingMap !== 'object') st.cache.incomingMap = {};
    if (!st.cache.outgoingMap || typeof st.cache.outgoingMap !== 'object') st.cache.outgoingMap = {};

    return st;
  }

  function loadState() {
    return sanitizeState(lsGet(LS_KEY));
  }

  Y.state = loadState();
  Y.saveState = function () {
    Y.state = sanitizeState(Y.state);
    lsSet(LS_KEY, Y.state);
  };

  Y.runtime = {
    plan: null,
    snapshotsById: {},
    coordToId: {},
    nameToIds: {}
  };

  Y.cfg = {
    VERSION: VERSION,
    NS: NS,
    PANEL_ID: PANEL_ID,
    STYLE_ID: STYLE_ID,
    PICKER_OVERLAY_ID: PICKER_OVERLAY_ID,
    LS_KEY: LS_KEY,
    MERCH_CAP_PER: 1000,
    SEND_DELAY_MS: 250,
    PHASE_ORDER: {
      CRB: 1,
      PIM: 2,
      SUR: 3
    }
  };

  Y.ts = nowTs;
  Y.log = log;
  Y.warn = warn;
  Y.err = err;
  Y.qs = qs;
  Y.qsa = qsa;
  Y.on = on;
  Y.safeInt = safeInt;
  Y.toId = toId;
  Y.uniqIds = uniqIds;
  Y.normalizeGroupName = normalizeGroupName;
  Y.parseTwNumber = parseTwNumber;
  Y.formatTwNumber = formatTwNumber;
  Y.debounce = debounce;
  Y.sleep = sleep;
  Y.lsGet = lsGet;
  Y.lsSet = lsSet;
  Y.getCurrentVillageId = getCurrentVillageId;
  Y.getLinkBasePure = getLinkBasePure;
  Y.buildGameUrl = buildGameUrl;
  Y.parseVillageIdFromHref = parseVillageIdFromHref;
  Y.parseCoordsFromText = parseCoordsFromText;
  Y.httpGet = httpGet;
  Y.parseHTML = parseHTML;
  Y.extractUpdateGameData = extractUpdateGameData;
  Y.defaultState = defaultState;
  Y.destroy = destroy;

  log('bootstrap loaded');
})();


(function () {
  'use strict';

  var Y = window.YRO_V26;
  if (!Y) return;

  Y.data = {
    GROUP_SELECTORS: {
      groupSelect:
        'select[name="group_id"], select#group_id, select[name="group"], select[name="group_id[]"]',
      groupMenuItems: '.group-menu-item[data-group-id], strong.group-menu-item[data-group-id]',
      villageIdSpans: 'span.quickedit-vn[data-id]',
    },

    MARKET_SELECTORS: {
      merchAvail: '#market_merchant_available_count',
      merchTotal: '#market_merchant_total_count',
    },
  };

  Y.log('data module loaded âœ…');
})();


(function () {
  'use strict';

  var Y = window.YRO_V26;
  if (!Y) return;

  function uniq(arr) {
    var m = {}, out = [];
    (arr || []).forEach(function (x) {
      var k = String(x);
      if (!m[k]) { m[k] = true; out.push(Y.safeInt(x, 0)); }
    });
    return out.filter(function (v) { return v > 0; });
  }

  function normName(s) { return String(s || '').trim().toLowerCase(); }
  function cleanGroupName(s) { return Y.normalizeGroupName ? Y.normalizeGroupName(s) : String(s || '').trim(); }

  async function fetchGroupsList(force) {
    var st = Y.state;
    var ttl = 12 * 60 * 60 * 1000;

    if (!force && st.cache.groupsFetchedAt && Date.now() - st.cache.groupsFetchedAt < ttl && st.groups.list && st.groups.list.length > 1) {
      return st.groups.list;
    }

    var url = Y.buildGameUrl('overview_villages', { mode: 'prod' });
    var html = await Y.httpGet(url);
    var doc = Y.parseHTML(html);

    var groups = [];
    groups.push({ id: 0, name: 'All villages' });
    groups.push({ id: -1, name: 'Custom selection...' });

    var sel = doc.querySelector(Y.data.GROUP_SELECTORS.groupSelect);
    if (sel) {
      Y.qsa('option', sel).forEach(function (o) {
        var id = Y.safeInt(o.getAttribute('value'), 0);
        var name = cleanGroupName(o.textContent || '');
        if (!name) return;
        if (groups.some(function (g) { return String(g.id) === String(id); })) return;
        groups.push({ id: id, name: name });
      });
    } else {
      Y.qsa(Y.data.GROUP_SELECTORS.groupMenuItems, doc).forEach(function (a) {
        var id2 = Y.safeInt(a.getAttribute('data-group-id'), 0);
        var nm = cleanGroupName(a.textContent || '');
        if (!nm) return;
        if (groups.some(function (g) { return String(g.id) === String(id2); })) return;
        groups.push({ id: id2, name: nm });
      });
    }

    var fixed = groups.slice(0, 2);
    var rest = groups.slice(2).sort(function (a, b) { return String(a.name).localeCompare(String(b.name)); });
    groups = fixed.concat(rest);

    st.groups.list = groups;
    st.cache.groupsFetchedAt = Date.now();
    Y.saveState();
    return groups;
  }

  function buildOverviewUrlProd(groupId) {
    return Y.buildGameUrl('overview_villages', { mode: 'prod', group: groupId, page: -1 });
  }

  async function fetchVillageIdsForGroup(groupId, force) {
    var st = Y.state;
    groupId = Y.safeInt(groupId, 0);
    if (groupId === -1) return [];

    var ttl = 5 * 60 * 1000;
    var key = String(groupId);
    var cached = st.cache.groupVillageIds[key];

    if (!force && cached && cached.at && Date.now() - cached.at < ttl && Array.isArray(cached.ids)) {
      return cached.ids;
    }

    var url = buildOverviewUrlProd(groupId);
    var html = await Y.httpGet(url);
    var doc = Y.parseHTML(html);

    var ids = [];
    Y.qsa(Y.data.GROUP_SELECTORS.villageIdSpans, doc).forEach(function (sp) {
      var vid = Y.safeInt(sp.getAttribute('data-id'), 0);
      if (vid) ids.push(vid);
    });

    if (!ids.length) {
      Y.qsa('a[href*="village="]', doc).forEach(function (a) {
        var vid2 = Y.parseVillageIdFromHref(a.getAttribute('href'));
        if (vid2) ids.push(vid2);
      });
    }

    ids = uniq(ids);
    st.cache.groupVillageIds[key] = { at: Date.now(), ids: ids };
    Y.saveState();
    return ids;
  }

  function parseResourceSpans(cell) {
    var out = { wood: 0, clay: 0, iron: 0, total: 0 };
    if (!cell) return out;

    var wraps = cell.querySelectorAll('span.nowrap');
    for (var i = 0; i < wraps.length; i++) {
      var w = wraps[i];
      var ic = w.querySelector('span.icon.header');
      if (!ic) continue;
      var cls = ic.className || '';
      var val = Y.parseTwNumber(w.textContent || '0');
      if (cls.indexOf('wood') >= 0) out.wood += val;
      else if (cls.indexOf('stone') >= 0) out.clay += val;
      else if (cls.indexOf('iron') >= 0) out.iron += val;
    }
    out.total = out.wood + out.clay + out.iron;
    return out;
  }

  function parseMerchants(doc, html) {
    var avail = 0, total = 0;

    var a = doc.querySelector(Y.data.MARKET_SELECTORS.merchAvail);
    var t = doc.querySelector(Y.data.MARKET_SELECTORS.merchTotal);
    if (a) avail = Y.parseTwNumber(a.textContent || '0');
    if (t) total = Y.parseTwNumber(t.textContent || '0');

    if ((!avail && !total) || !total) {
      var m1 = String(html || '').match(/Trader\s*:\s*\{\s*carry:\s*\d+,\s*amount:\s*(\d+),\s*total:\s*(\d+)/i);
      if (m1) { avail = Y.safeInt(m1[1], avail); total = Y.safeInt(m1[2], total); }
    }
    return { avail: avail, total: total, free: Math.max(0, avail) };
  }

  function parseVillageSnapshotFromUpdateGameData(gd) {
    if (!gd || !gd.village) return null;
    var v = gd.village;

    var wood = Y.safeInt(v.wood, 0);
    var clay = Y.safeInt(v.stone, 0);
    var iron = Y.safeInt(v.iron, 0);
    var storage = Y.safeInt(v.storage_max, 0);

    var x = Y.safeInt(v.x, 0);
    var y = Y.safeInt(v.y, 0);
    var coord = v.coord ? String(v.coord) : (x && y ? (x + '|' + y) : '');

    // fallback prod from updateGameData
    var phW = v.wood_prod != null ? Math.round(Number(v.wood_prod) * 3600) : 0;
    var phC = v.stone_prod != null ? Math.round(Number(v.stone_prod) * 3600) : 0;
    var phI = v.iron_prod != null ? Math.round(Number(v.iron_prod) * 3600) : 0;

    var name = v.display_name ? String(v.display_name) : (v.name ? String(v.name) : ('Village ' + (v.id || '')));
    var id = Y.safeInt(v.id, 0);

    return {
      id: id,
      name: name,
      coord: coord,
      x: x,
      y: y,
      storage: storage,
      resNow: { wood: wood, clay: clay, iron: iron, total: wood + clay + iron },
      prodH: { wood: phW, clay: phC, iron: phI, total: phW + phC + phI },
      prod24: { wood: phW * 24, clay: phC * 24, iron: phI * 24, total: (phW + phC + phI) * 24 },
    };
  }

  // === SORUN 11: Production widget source-of-truth ===
  function parseProductionFromShowProd(doc) {
    var box = doc.getElementById('show_prod');
    if (!box) return null;

    var tbl = box.querySelector('table');
    if (!tbl) return null;

    var rows = tbl.querySelectorAll('tr');
    if (!rows || rows.length < 3) return null;

    var out = { wood: 0, clay: 0, iron: 0, total: 0 };

    for (var i = 0; i < rows.length; i++) {
      var tds = rows[i].querySelectorAll('td');
      if (!tds || tds.length < 2) continue;

      var label = (tds[0].textContent || '').toLowerCase();
      var strong = tds[1].querySelector('strong');
      if (!strong) continue;

      var val = Y.parseTwNumber(strong.textContent || '');
      if (label.indexOf('wood') >= 0) out.wood = val;
      else if (label.indexOf('clay') >= 0) out.clay = val;
      else if (label.indexOf('iron') >= 0) out.iron = val;
    }

    if ((out.wood + out.clay + out.iron) <= 0) return null;
    out.total = out.wood + out.clay + out.iron;
    return out;
  }

  function parseProductionFromHeaderTooltips(doc) {
    function read(screen) {
      var a = doc.querySelector('a[href*="screen=' + screen + '"][title*="per hour"]');
      if (!a) return 0;
      var title = a.getAttribute('title') || '';
      var m = title.match(/-\s*([\d\.\,]+)/);
      if (!m) return 0;
      return Y.parseTwNumber(m[1]);
    }
    var w = read('wood');
    var c = read('stone');
    var i = read('iron');
    if ((w + c + i) <= 0) return null;
    return { wood: w, clay: c, iron: i, total: w + c + i };
  }

  async function fetchVillageOverviewProduction(vid) {
    var url = '/game.php?village=' + vid + '&screen=overview';
    var html = await Y.httpGet(url, 30000);
    var doc = Y.parseHTML(html);

    var fromWidget = parseProductionFromShowProd(doc);
    if (fromWidget) return { prodH: fromWidget, source: 'show_prod' };

    var fromHeader = parseProductionFromHeaderTooltips(doc);
    if (fromHeader) return { prodH: fromHeader, source: 'header_tooltip' };

    var gd = Y.extractUpdateGameData(html);
    if (gd && gd.village) {
      var v = gd.village;
      var phW = v.wood_prod != null ? Math.round(Number(v.wood_prod) * 3600) : 0;
      var phC = v.stone_prod != null ? Math.round(Number(v.stone_prod) * 3600) : 0;
      var phI = v.iron_prod != null ? Math.round(Number(v.iron_prod) * 3600) : 0;
      if ((phW + phC + phI) > 0) return { prodH: { wood: phW, clay: phC, iron: phI, total: phW + phC + phI }, source: 'updateGameData' };
    }
    return null;
  }

  function findH3ByText(doc, textLower) {
    var hs = Y.qsa('h3', doc);
    for (var i = 0; i < hs.length; i++) {
      var t = (hs[i].textContent || '').trim().toLowerCase();
      if (t.indexOf(textLower) >= 0) return hs[i];
    }
    return null;
  }

  function normHeaderText(s) {
    return String(s || '').replace(/\s+/g, ' ').trim().toLowerCase();
  }

  function tableHeaderTexts(tbl) {
    if (!tbl) return [];
    var firstRow = tbl.querySelector('tr');
    if (!firstRow) return [];
    return Y.qsa('th', firstRow).map(function (th) { return normHeaderText(th.textContent || ''); }).filter(Boolean);
  }

  function tableLooksLikeTransportSection(tbl, kind) {
    var headers = tableHeaderTexts(tbl);
    if (!headers.length) return false;
    var joined = headers.join(' | ');

    if (kind === 'outgoing') {
      return joined.indexOf('destination') >= 0 && joined.indexOf('goods') >= 0 && joined.indexOf('merchant') >= 0;
    }
    if (kind === 'incoming') {
      return joined.indexOf('origin') >= 0 && joined.indexOf('goods') >= 0;
    }
    return false;
  }

  function findTransportTableAfterHeading(el, kind) {
    if (!el) return null;
    var cur = el.nextElementSibling;
    while (cur) {
      var tag = cur.tagName ? cur.tagName.toLowerCase() : '';
      if (tag === 'h3') break;

      if (tag === 'table' && tableLooksLikeTransportSection(cur, kind)) return cur;

      if (cur.querySelectorAll) {
        var nested = Y.qsa('table', cur);
        for (var i = 0; i < nested.length; i++) {
          if (tableLooksLikeTransportSection(nested[i], kind)) return nested[i];
        }
      }

      cur = cur.nextElementSibling;
    }
    return null;
  }

  function parseMarketTransportsPage(vid, html) {
    var doc = Y.parseHTML(html);

    var gd = Y.extractUpdateGameData(html);
    var snap = parseVillageSnapshotFromUpdateGameData(gd) || {
      id: vid, name: 'Village ' + vid, coord: '', x: 0, y: 0, storage: 0,
      resNow: { wood: 0, clay: 0, iron: 0, total: 0 },
      prodH: { wood: 0, clay: 0, iron: 0, total: 0 },
      prod24: { wood: 0, clay: 0, iron: 0, total: 0 }
    };

    var merch = parseMerchants(doc, html);

    var outgoing = [];
    var incoming = [];

    var hOut = findH3ByText(doc, 'your transports');
    var tblOut = findTransportTableAfterHeading(hOut, 'outgoing');
    if (tblOut) {
      Y.qsa('tr', tblOut).forEach(function (tr) {
        var tds = Y.qsa('td', tr);
        if (!tds || tds.length < 3) return;

        var destCell = tds[0];
        var goodsCell = tds[1];
        var merchCell = tds[2];

        var toId = 0;
        var link = destCell ? destCell.querySelector('a[href*="screen=info_village"][href*="id="]') : null;
        if (link) {
          var m = (link.getAttribute('href') || '').match(/[?&]id=(\d+)/);
          if (m) toId = Y.safeInt(m[1], 0);
        }

        var res = parseResourceSpans(goodsCell);
        if (res.total <= 0) return;

        outgoing.push({
          from: vid,
          to: toId,
          res: res,
          merchants: Y.safeInt(merchCell ? merchCell.textContent : '0', 0),
        });
      });
    }

    var hIn = findH3ByText(doc, 'incoming transports');
    var tblIn = findTransportTableAfterHeading(hIn, 'incoming');
    if (tblIn) {
      Y.qsa('tr', tblIn).forEach(function (tr) {
        var tds = Y.qsa('td', tr);
        if (!tds || tds.length < 2) return;

        var originCell = tds[0];
        var goodsCell = tds[1];

        var fromId = 0;
        var link = originCell ? originCell.querySelector('a[href*="screen=info_village"][href*="id="]') : null;
        if (link) {
          var m = (link.getAttribute('href') || '').match(/[?&]id=(\d+)/);
          if (m) fromId = Y.safeInt(m[1], 0);
        }

        var res = parseResourceSpans(goodsCell);
        if (res.total <= 0) return;

        incoming.push({ from: fromId, to: vid, res: res });
      });
    }

    return { snapshot: snap, merchants: merch, transports: { outgoing: outgoing, incoming: incoming } };
  }

  function addToIncomingMap(incomingMap, toVid, fromVid, res) {
    toVid = Y.safeInt(toVid, 0);
    fromVid = Y.safeInt(fromVid, 0);
    if (!toVid) return;

    if (!incomingMap[toVid]) incomingMap[toVid] = { wood: 0, clay: 0, iron: 0, total: 0, byFrom: {} };
    var t = incomingMap[toVid];

    t.wood += res.wood; t.clay += res.clay; t.iron += res.iron;
    t.total = t.wood + t.clay + t.iron;

    var k = String(fromVid || 0);
    if (!t.byFrom[k]) t.byFrom[k] = { wood: 0, clay: 0, iron: 0, total: 0 };
    t.byFrom[k].wood += res.wood;
    t.byFrom[k].clay += res.clay;
    t.byFrom[k].iron += res.iron;
    t.byFrom[k].total = t.byFrom[k].wood + t.byFrom[k].clay + t.byFrom[k].iron;
  }

  function addToOutgoingMap(outgoingMap, fromVid, toVid, res) {
    fromVid = Y.safeInt(fromVid, 0);
    toVid = Y.safeInt(toVid, 0);
    if (!fromVid) return;

    if (!outgoingMap[fromVid]) outgoingMap[fromVid] = { wood: 0, clay: 0, iron: 0, total: 0, byTo: {} };
    var f = outgoingMap[fromVid];

    f.wood += res.wood; f.clay += res.clay; f.iron += res.iron;
    f.total = f.wood + f.clay + f.iron;

    var k = String(toVid || 0);
    if (!f.byTo[k]) f.byTo[k] = { wood: 0, clay: 0, iron: 0, total: 0 };
    f.byTo[k].wood += res.wood;
    f.byTo[k].clay += res.clay;
    f.byTo[k].iron += res.iron;
    f.byTo[k].total = f.byTo[k].wood + f.byTo[k].clay + f.byTo[k].iron;
  }

  async function fetchVillageMarketTransports(vid, force) {
    var st = Y.state;
    vid = Y.safeInt(vid, 0);
    if (!vid) return null;

    var ttl = 2 * 60 * 1000;
    var cached = st.cache.villages[String(vid)];
    if (!force && cached && cached.at && Date.now() - cached.at < ttl && cached.snapshot && cached.transports) {
      return cached;
    }

    var url = '/game.php?village=' + vid + '&screen=market&mode=transports';
    var html = await Y.httpGet(url, 30000);
    var parsed = parseMarketTransportsPage(vid, html);

    // Override production from overview widget (priority)
    try {
      var p = await fetchVillageOverviewProduction(vid);
      if (p && p.prodH) {
        parsed.snapshot.prodH = p.prodH;
        parsed.snapshot.prod24 = {
          wood: p.prodH.wood * 24,
          clay: p.prodH.clay * 24,
          iron: p.prodH.iron * 24,
          total: p.prodH.total * 24
        };
        parsed.snapshot._prodSource = p.source;
      }
    } catch (e) {}

    var out = {
      at: Date.now(),
      snapshot: parsed.snapshot,
      merchants: parsed.merchants,
      transports: parsed.transports,
    };

    st.cache.villages[String(vid)] = out;
    Y.saveState();
    return out;
  }

  function rebuildGlobalMapsFromCache() {
    var st = Y.state;
    var incomingMap = {};
    var outgoingMap = {};
    var snapshotsById = {};
    var coordToId = {};
    var nameToIds = {};

    Object.keys(st.cache.villages || {}).forEach(function (k) {
      var v = st.cache.villages[k];
      if (!v || !v.snapshot) return;

      var snap = v.snapshot;

      snapshotsById[snap.id] = {
        id: snap.id,
        name: snap.name || ('Village ' + snap.id),
        coord: snap.coord || '',
        x: snap.x || 0,
        y: snap.y || 0,
        storage: snap.storage || 0,
        resNow: snap.resNow || { wood: 0, clay: 0, iron: 0, total: 0 },
        prodH: snap.prodH || { wood: 0, clay: 0, iron: 0, total: 0 },
        prod24: snap.prod24 || { wood: 0, clay: 0, iron: 0, total: 0 },
        merch: {
          avail: v.merchants ? v.merchants.avail : 0,
          total: v.merchants ? v.merchants.total : 0,
          free: v.merchants ? v.merchants.free : 0
        },
      };

      if (snap.coord) coordToId[String(snap.coord)] = snap.id;

      var nm = normName(snap.name);
      if (!nameToIds[nm]) nameToIds[nm] = [];
      nameToIds[nm].push(snap.id);

      if (v.transports && Array.isArray(v.transports.incoming)) {
        v.transports.incoming.forEach(function (it) { addToIncomingMap(incomingMap, it.to, it.from, it.res); });
      }
      if (v.transports && Array.isArray(v.transports.outgoing)) {
        v.transports.outgoing.forEach(function (it) { addToOutgoingMap(outgoingMap, it.from, it.to, it.res); });
      }
    });

    st.cache.incomingMap = incomingMap;
    st.cache.outgoingMap = outgoingMap;
    st.cache.lastFullScanAt = Date.now();
    Y.saveState();

    Y.runtime.snapshotsById = snapshotsById;
    Y.runtime.coordToId = coordToId;
    Y.runtime.nameToIds = nameToIds;

    return { incomingMap: incomingMap, outgoingMap: outgoingMap, snapshotsById: snapshotsById };
  }

  async function fullScanAllVillages(force, onProgress) {
    onProgress = typeof onProgress === 'function' ? onProgress : function () {};

    await fetchGroupsList(force);

    var ids = await fetchVillageIdsForGroup(0, force);
    ids = uniq(ids);

    var total = ids.length;
    var done = 0;

    var CONC = 1;
    var had429 = false;
    var baseDelayMs = 350;
    var idx = 0;

    async function worker() {
      while (idx < ids.length) {
        var my = idx++;
        var vid = ids[my];
        done++;
        onProgress(done, total, 'Fetch village ' + vid + ' (' + done + '/' + total + ')');
        try {
          var tries = 0;
          while (true) {
            tries++;
            try {
              await fetchVillageMarketTransports(vid, force);
              break;
            } catch (e) {
              var msg = String(e && e.message ? e.message : e);
              if (msg.indexOf('429') >= 0 || msg.indexOf('HTTP 429') >= 0) {
                had429 = true;
                var wait = Math.min(12000, 2500 * tries) + Math.floor(Math.random() * 400);
                Y.warn('HTTP 429 rate limit for village', vid, 'â€” waiting', wait + 'ms');
                await Y.sleep(wait);
                if (tries < 4) continue;
              }
              throw e;
            }
          }
        } catch (e) {
          Y.warn('village fetch failed', vid, e);
        }
        await Y.sleep(had429 ? 1200 : (baseDelayMs + Math.floor(Math.random()*120)));
      }
    }

    var ws = [];
    for (var i = 0; i < CONC; i++) ws.push(worker());
    await Promise.all(ws);

    rebuildGlobalMapsFromCache();
    return ids;
  }

  Y.fetch = {
    fetchGroupsList: fetchGroupsList,
    fetchVillageIdsForGroup: fetchVillageIdsForGroup,
    fetchVillageMarketTransports: fetchVillageMarketTransports,
    fullScanAllVillages: fullScanAllVillages,
    rebuildGlobalMapsFromCache: rebuildGlobalMapsFromCache,
  };

  Y.log('fetch module loaded âœ…');
})();


(function () {
  'use strict';

  var Y = window.YRO_V26;
  if (!Y) return;

  function cloneRes(r) {
    return { wood: r.wood || 0, clay: r.clay || 0, iron: r.iron || 0, total: (r.wood || 0) + (r.clay || 0) + (r.iron || 0) };
  }
  function addRes(a, b) {
    a.wood += b.wood; a.clay += b.clay; a.iron += b.iron;
    a.total = a.wood + a.clay + a.iron;
    return a;
  }
  function max0(n) { return Math.max(0, Y.safeInt(n, 0)); }

  function uniq(arr) {
    arr = Array.isArray(arr) ? arr : [];
    var seen = Object.create(null);
    var out = [];
    for (var i = 0; i < arr.length; i++) {
      var v = String(arr[i]);
      if (!v || seen[v]) continue;
      seen[v] = true;
      out.push(Y.safeInt(arr[i], 0));
    }
    return out.filter(Boolean);
  }

  function capEach(storage, pct) {
    storage = max0(storage);
    pct = Math.max(0, Math.min(100, Number(pct || 0)));
    return Math.floor(storage * (pct / 100));
  }

  function reserveEach(storage, pct) {
    storage = max0(storage);
    pct = Math.max(0, Math.min(100, Number(pct || 0)));
    return Math.floor(storage * (pct / 100));
  }

  function clamp(n, lo, hi) { n = Number(n || 0); if (n < lo) return lo; if (n > hi) return hi; return n; }
  function pctToFrac(p) { return clamp(p, 0, 100) / 100; }

  function computeGroupTotals(ids, statesMap, incomingMap) {
    var tot = { wood: 0, clay: 0, iron: 0, total: 0, storage: 0, merchFree: 0 };
    (ids || []).forEach(function (vid) {
      vid = Y.toId(vid);
      var s = statesMap.get(vid);
      if (!s) return;
      var inc = incomingMap && incomingMap[vid] ? incomingMap[vid] : { wood: 0, clay: 0, iron: 0 };
      tot.wood += (s.base0.wood || 0) + (inc.wood || 0);
      tot.clay += (s.base0.clay || 0) + (inc.clay || 0);
      tot.iron += (s.base0.iron || 0) + (inc.iron || 0);
      tot.storage += (s.storage || 0);
      tot.merchFree += (s.merchFree0 != null ? s.merchFree0 : s.merchFree);
    });
    tot.total = tot.wood + tot.clay + tot.iron;
    return tot;
  }

  function computeDonorSupply(ids, statesMap, reservePct) {
    var sup = { wood: 0, clay: 0, iron: 0, total: 0, merchFree: 0 };
    var keepById = {};
    (ids || []).forEach(function (vid) {
      vid = Y.toId(vid);
      var s = statesMap.get(vid);
      if (!s) return;
      var keep = reserveEach(s.storage || 0, reservePct);
      keepById[vid] = keep;
      var w = Math.max(0, Math.floor((s.base0.wood || 0) - keep));
      var c = Math.max(0, Math.floor((s.base0.clay || 0) - keep));
      var i = Math.max(0, Math.floor((s.base0.iron || 0) - keep));
      sup.wood += w; sup.clay += c; sup.iron += i;
      sup.merchFree += (s.merchFree0 != null ? s.merchFree0 : s.merchFree);
    });
    sup.total = sup.wood + sup.clay + sup.iron;
    sup.merchBudget = sup.merchFree * (Y.cfg.MERCH_CAP_PER || 1000);
    sup.keepById = keepById;
    return sup;
  }

  function minReqPerRes(baseEach, tolFrac, ironTolFrac) {
    return {
      wood: Math.floor(baseEach * (1 - tolFrac)),
      clay: Math.floor(baseEach * (1 - tolFrac)),
      iron: Math.floor(baseEach * (1 - ironTolFrac)),
    };
  }

  function maxReqPerRes(baseEach, tolFrac, ironTolFrac, storage) {
    return {
      wood: Math.min(storage, Math.ceil(baseEach * (1 + tolFrac))),
      clay: Math.min(storage, Math.ceil(baseEach * (1 + tolFrac))),
      iron: Math.min(storage, Math.ceil(baseEach * (1 + ironTolFrac))),
    };
  }

  function computeAutoCapPctPush(targetIds, targetTotals, donorSupply, tolPct, ironTolPct) {
    // Find the highest capPct such that donors can cover MIN requirements (within tolerance),
    // and total shipped volume fits merchant budget.
    var tolFrac = pctToFrac(tolPct);
    var ironTolFrac = pctToFrac((ironTolPct == null ? tolPct : ironTolPct));

    // upper bound due to tolerance & storage cap
    var hardMax = Math.floor(100 / (1 + Math.max(tolFrac, ironTolFrac)));
    if (hardMax > 99) hardMax = 99;
    if (hardMax < 1) hardMax = 1;

    var lo = 1, hi = hardMax, best = 1;

    // Precompute sum(storage) for targets
    var sumStorage = targetTotals.storage || 0;
    if (sumStorage <= 0) return 0;

    function feasible(capPct) {
      var baseEachSum = sumStorage * (capPct / 100);
      // MIN requirements totals (wood/clay/iron)
      var minWoodTot = baseEachSum * (1 - tolFrac);
      var minClayTot = baseEachSum * (1 - tolFrac);
      var minIronTot = baseEachSum * (1 - ironTolFrac);

      var needW = Math.max(0, Math.ceil(minWoodTot - targetTotals.wood));
      var needC = Math.max(0, Math.ceil(minClayTot - targetTotals.clay));
      var needI = Math.max(0, Math.ceil(minIronTot - targetTotals.iron));

      if (needW > donorSupply.wood) return false;
      if (needC > donorSupply.clay) return false;
      if (needI > donorSupply.iron) return false;

      var needTot = needW + needC + needI;
      if (needTot > donorSupply.merchBudget) return false;
      return true;
    }

    while (lo <= hi) {
      var mid = Math.floor((lo + hi) / 2);
      if (feasible(mid)) {
        best = mid;
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }

    return best;
  }

  function buildTradeSuggestion(targetTotals, donorSupply, capPct, tolPct, ironTolPct) {
    var tolFrac = pctToFrac(tolPct);
    var ironTolFrac = pctToFrac((ironTolPct == null ? tolPct : ironTolPct));

    var sumStorage = targetTotals.storage || 0;
    var baseEachSum = sumStorage * (capPct / 100);

    var minWoodTot = baseEachSum * (1 - tolFrac);
    var minClayTot = baseEachSum * (1 - tolFrac);
    var minIronTot = baseEachSum * (1 - ironTolFrac);

    var needW = Math.max(0, Math.ceil(minWoodTot - targetTotals.wood));
    var needC = Math.max(0, Math.ceil(minClayTot - targetTotals.clay));
    var needI = Math.max(0, Math.ceil(minIronTot - targetTotals.iron));

    var deficit = {
      wood: Math.max(0, needW - donorSupply.wood),
      clay: Math.max(0, needC - donorSupply.clay),
      iron: Math.max(0, needI - donorSupply.iron),
    };

    var defRes = null;
    var defBest = 0;
    ['wood','clay','iron'].forEach(function(r){
      if (deficit[r] > defBest) { defBest = deficit[r]; defRes = r; }
    });
    if (!defRes || defBest <= 0) return null;

    // Surplus to sell: donors' supply above required needs
    var surplus = {
      wood: Math.max(0, donorSupply.wood - needW),
      clay: Math.max(0, donorSupply.clay - needC),
      iron: Math.max(0, donorSupply.iron - needI),
    };

    // Pick the biggest surplus resource to sell
    var sellRes = 'iron';
    var best = -1;
    ['iron','clay','wood'].forEach(function(r){
      if (surplus[r] > best) { best = surplus[r]; sellRes = r; }
    });
    if (best <= 0) {
      // no surplus above needs; sell the largest available anyway
      sellRes = (donorSupply.iron >= donorSupply.clay && donorSupply.iron >= donorSupply.wood) ? 'iron'
               : (donorSupply.clay >= donorSupply.wood ? 'clay' : 'wood');
    }

    var amt = deficit[defRes];
    if (amt <= 0) return null;

    return {
      buy: { res: defRes, amount: amt },
      sell: { res: sellRes, amount: amt },
      reason: defRes.toUpperCase() + ' shortage for selected tolerance.',
    };
  }

  function pickBestSellerVillage(donorIds, statesMap, reservePct, sellRes) {
    var bestVid = null;
    var bestAvail = -1;
    donorIds.forEach(function(vid){
      vid = Y.toId(vid);
      var s = statesMap.get(vid);
      if (!s) return;
      var keep = reserveEach(s.storage || 0, reservePct);
      var avail = Math.max(0, Math.floor((s.base0[sellRes] || 0) - keep));
      if (avail > bestAvail) { bestAvail = avail; bestVid = vid; }
    });
    return bestVid;
  }

  function computeIncomingForSet(villageIds, incomingMap) {
    var set = {};
    (villageIds || []).forEach(function (id) { set[String(id)] = true; });

    var allByVid = {};
    var extByVid = {};

    (villageIds || []).forEach(function (id) {
      var it = incomingMap && incomingMap[id] ? incomingMap[id] : null;
      if (!it) {
        allByVid[id] = { wood: 0, clay: 0, iron: 0, total: 0 };
        extByVid[id] = { wood: 0, clay: 0, iron: 0, total: 0 };
        return;
      }

      allByVid[id] = { wood: it.wood || 0, clay: it.clay || 0, iron: it.iron || 0, total: it.total || 0 };

      var ext = { wood: it.wood || 0, clay: it.clay || 0, iron: it.iron || 0, total: it.total || 0 };
      var byFrom = it.byFrom || {};
      for (var fk in byFrom) {
        if (!Object.prototype.hasOwnProperty.call(byFrom, fk)) continue;
        if (fk !== '0' && set[fk]) {
          ext.wood -= byFrom[fk].wood || 0;
          ext.clay -= byFrom[fk].clay || 0;
          ext.iron -= byFrom[fk].iron || 0;
        }
      }
      ext.wood = max0(ext.wood);
      ext.clay = max0(ext.clay);
      ext.iron = max0(ext.iron);
      ext.total = ext.wood + ext.clay + ext.iron;
      extByVid[id] = ext;
    });

    return { allByVid: allByVid, externalByVid: extByVid };
  }

  function buildPlanState(vids, snapshotsById, incomingMap, capPct, reservePct, capOverrideById) {
    var st = new Map();

    (vids || []).forEach(function (vid) {
      var snap = snapshotsById[vid];
      if (!snap) return;

      var inc = incomingMap && incomingMap[vid] ? cloneRes(incomingMap[vid]) : { wood: 0, clay: 0, iron: 0, total: 0 };
      var base = cloneRes(snap.resNow || { wood: 0, clay: 0, iron: 0 });

      var storage = max0(snap.storage || 0);
      var keep = reserveEach(storage, reservePct);

      var cap = capEach(storage, capPct);
      if (capOverrideById && capOverrideById[vid] != null) cap = max0(capOverrideById[vid]);

      st.set(vid, {
        id: vid,
        name: snap.name || ('Village ' + vid),
        coord: snap.coord || '',
        storage: storage,

        base0: cloneRes(base),
        inc0: cloneRes(inc),

        baseNow: cloneRes(base),
        inPlanned: { wood: 0, clay: 0, iron: 0, total: 0 },
        outPlanned: { wood: 0, clay: 0, iron: 0, total: 0 },

        keepEach: keep,
        capEach: cap,

        merchFree: max0((snap.merch && snap.merch.free != null) ? snap.merch.free : 0),
        merchFree0: max0((snap.merch && snap.merch.free != null) ? snap.merch.free : 0),
        capEachByRes: null,

        outTo: new Map(), // toVid -> {wood,clay,iron,total,tags:Set}
      });
    });

    return st;
  }

  function getFutureRecvVal(toState, rk) {
    return (toState.baseNow[rk] || 0) + (toState.inc0[rk] || 0) + (toState.inPlanned[rk] || 0);
  }

  function maxPairAdditionalByMerchants(fromState, toState) {
    var rec = fromState.outTo.get(toState.id);
    if (!rec) return fromState.merchFree * Y.cfg.MERCH_CAP_PER;
    var oldTotal = rec.total || 0;
    var oldMerch = Math.ceil(oldTotal / Y.cfg.MERCH_CAP_PER);
    var maxTotalWithMerch = (oldMerch + fromState.merchFree) * Y.cfg.MERCH_CAP_PER;
    return Math.max(0, maxTotalWithMerch - oldTotal);
  }

  function applySend(fromState, toState, rk, amount, tag, phaseOrder, allocations) {
    if (!fromState || !toState) return 0;
    if (!rk || amount <= 0) return 0;
    if (fromState.id === toState.id) return 0;

    amount = Math.floor(amount);

    var avail = (fromState.baseNow[rk] || 0) - fromState.keepEach;
    avail = Math.max(0, Math.floor(avail));
    if (avail <= 0) return 0;

    var cap = Math.max(0, Math.floor((toState.capEachByRes && toState.capEachByRes[rk] != null) ? toState.capEachByRes[rk] : (toState.capEach || 0)));
    var curFuture = getFutureRecvVal(toState, rk);
    var space = cap - curFuture;
    space = Math.max(0, Math.floor(space));
    if (space <= 0) return 0;

    var send = Math.min(amount, avail, space);
    if (send <= 0) return 0;

    var rec = fromState.outTo.get(toState.id);
    if (!rec) {
      rec = { wood: 0, clay: 0, iron: 0, total: 0, tags: new Set(), orders: new Set() };
      fromState.outTo.set(toState.id, rec);
    }

    var oldTotal = rec.total || 0;
    var oldMerch = Math.ceil(oldTotal / Y.cfg.MERCH_CAP_PER);
    var maxSendAllowed = maxPairAdditionalByMerchants(fromState, toState);
    if (maxSendAllowed <= 0) return 0;
    if (send > maxSendAllowed) send = maxSendAllowed;

    var newTotal = oldTotal + send;
    var newMerch = Math.ceil(newTotal / Y.cfg.MERCH_CAP_PER);
    var addMerch = newMerch - oldMerch;
    if (addMerch > fromState.merchFree) return 0;

    fromState.baseNow[rk] -= send;
    fromState.outPlanned[rk] = (fromState.outPlanned[rk] || 0) + send;
    fromState.outPlanned.total += send;

    toState.inPlanned[rk] = (toState.inPlanned[rk] || 0) + send;
    toState.inPlanned.total += send;

    rec[rk] = (rec[rk] || 0) + send;
    rec.total = newTotal;
    rec.tags.add(tag || '');
    if (phaseOrder != null) rec.orders.add(phaseOrder);

    fromState.merchFree -= addMerch;
    if (fromState.merchFree < 0) fromState.merchFree = 0;

    if (Array.isArray(allocations)) {
      allocations.push({
        from: fromState.id,
        to: toState.id,
        resource: rk,
        amount: send,
        phaseTag: tag || '',
        phaseOrder: phaseOrder == null ? 99 : phaseOrder
      });
    }

    return send;
  }

  function compileShipments(statesMap) {
    var shipments = [];
    statesMap.forEach(function (from) {
      from.outTo.forEach(function (rec, toId) {
        if (!rec || (rec.total || 0) <= 0) return;
        var tags = Array.from(rec.tags || []).filter(Boolean);
        shipments.push({
          from: from.id,
          to: toId,
          wood: rec.wood || 0,
          clay: rec.clay || 0,
          iron: rec.iron || 0,
          total: rec.total || 0,
          merch: Math.ceil((rec.total || 0) / Y.cfg.MERCH_CAP_PER),
          phaseOrders: Array.from(rec.orders || []).sort(function (a, b) { return a - b; }),
          phaseOrder: rec.orders && rec.orders.size ? Math.min.apply(null, Array.from(rec.orders)) : 99,
          tag: tags.length ? tags.join('+') : '',
        });
      });
    });
    shipments.sort(function (a, b) {
      if ((a.phaseOrder || 99) !== (b.phaseOrder || 99)) return (a.phaseOrder || 99) - (b.phaseOrder || 99);
      return (b.total || 0) - (a.total || 0);
    });
    return shipments;
  }

  function clamp(n, lo, hi) { n = Number(n || 0); if (n < lo) return lo; if (n > hi) return hi; return n; }

  function ironFactorFromDeltaPct(deltaPct) {
    // deltaPct: -50..+50 (recommended)
    deltaPct = clamp(deltaPct, -90, 300); // hard safety bounds
    return 1 + (deltaPct / 100);
  }

  function desiredTripletFromTotal(totalSum, capEachTarget, ironFactor) {
    totalSum = max0(totalSum);
    capEachTarget = max0(capEachTarget);
    ironFactor = Math.max(0, Number(ironFactor || 1));

    var denom = 2 + ironFactor;
    if (denom <= 0) denom = 3;

    var base = Math.floor(totalSum / denom);
    var wood = Math.min(capEachTarget, base);
    var clay = Math.min(capEachTarget, base);
    var iron = Math.min(capEachTarget, Math.floor(base * ironFactor));

    return { wood: max0(wood), clay: max0(clay), iron: max0(iron) };
  }

  function desiredTripletFromCap(capEachTarget, ironFactor) {
    capEachTarget = max0(capEachTarget);
    ironFactor = Math.max(0, Number(ironFactor || 1));

    var wood, clay, iron;

    if (ironFactor >= 1) {
      iron = capEachTarget;
      var base = (ironFactor === 0) ? capEachTarget : Math.floor(capEachTarget / ironFactor);
      wood = clay = base;
    } else {
      wood = clay = capEachTarget;
      iron = Math.floor(capEachTarget * ironFactor);
    }

    wood = Math.min(capEachTarget, max0(wood));
    clay = Math.min(capEachTarget, max0(clay));
    iron = Math.min(capEachTarget, max0(iron));

    return { wood: wood, clay: clay, iron: iron };
  }

  function normalizeModeASets(targetIds, surplusIds) {
    targetIds = uniq(targetIds);
    surplusIds = uniq(surplusIds);
    var warnings = [];
    var excluded = [];
    var targetSet = idSet(targetIds);
    var overlap = surplusIds.filter(function (id) { return !!targetSet[id]; });
    if (overlap.length) {
      excluded = uniq(excluded.concat(overlap));
      warnings.push('Surplus/Target overlap excluded: ' + overlap.join(', '));
      surplusIds = surplusIds.filter(function (id) { return !targetSet[id]; });
    }
    return { targetIds: targetIds, surplusIds: surplusIds, warnings: warnings, excludedOverlapIds: excluded };
  }

  function buildModeATargets(st, targetIds, ratioPct) {
    return buildModeBTargets(st, targetIds, ratioPct);
  }

  function simulateModeACandidate(targetIds, surplusIds, snapshotsById, incomingMap, ratioPct) {
    var allIds = uniq(targetIds.concat(surplusIds));
    var st = buildPlanState(allIds, snapshotsById, incomingMap, 0, 0, null);
    var allocations = [];
    var targetsById = buildModeATargets(st, targetIds, ratioPct);
    runChildRebalance(st, targetIds, targetsById, allocations);
    return { feasible: childrenSatisfied(st, targetIds, targetsById), states: st, allocations: allocations, targetsById: targetsById };
  }

  function sumBaselineTotals(st, ids) {
    var out = zeroRes();
    (ids || []).forEach(function (id) {
      var s = st.get(id);
      if (!s) return;
      out.wood += (s.base0.wood || 0) + (s.inc0.wood || 0);
      out.clay += (s.base0.clay || 0) + (s.inc0.clay || 0);
      out.iron += (s.base0.iron || 0) + (s.inc0.iron || 0);
    });
    return refreshRes(out);
  }

  function sumTargetTotals(ids, targetsById) {
    var out = zeroRes();
    (ids || []).forEach(function (id) {
      var targetEach = max0(targetsById && targetsById[id]);
      out.wood += targetEach;
      out.clay += targetEach;
      out.iron += targetEach;
    });
    return refreshRes(out);
  }

  function merchantBudgetForIds(st, ids) {
    var total = 0;
    (ids || []).forEach(function (id) {
      var s = st.get(id);
      if (!s) return;
      total += max0(s.merchFree0 || 0) * Y.cfg.MERCH_CAP_PER;
    });
    return total;
  }

  function runModeASurplusRouting(st, targetIds, surplusIds, targetsById, surplusCapPct, allocations) {
    if (!surplusIds.length) return;
    setSurplusCaps(st, surplusIds, surplusCapPct);

    ['wood', 'clay', 'iron'].forEach(function (rk) {
      var receivers = surplusIds.map(function (id) {
        var s = st.get(id);
        if (!s) return null;
        var need = surplusSpace(s, rk);
        return need > 0 ? { id: id, need: need, storage: s.storage || 0 } : null;
      }).filter(Boolean);

      receivers.sort(function (a, b) {
        if (b.need !== a.need) return b.need - a.need;
        if (b.storage !== a.storage) return b.storage - a.storage;
        return a.id - b.id;
      });

      receivers.forEach(function (rec) {
        var to = st.get(rec.id);
        if (!to) return;

        while (rec.need > 0) {
          var donors = targetIds.map(function (id) {
            var s = st.get(id);
            if (!s || (s.merchFree || 0) <= 0) return null;
            var sendable = childSendable(s, rk, targetsById[id] || 0);
            return sendable > 0 ? { id: id, state: s, sendable: sendable, storage: s.storage || 0 } : null;
          }).filter(Boolean);

          donors.sort(function (a, b) {
            if (b.sendable !== a.sendable) return b.sendable - a.sendable;
            if (b.storage !== a.storage) return b.storage - a.storage;
            return a.id - b.id;
          });

          if (!donors.length) break;
          var donor = donors[0];
          var sent = applySend(donor.state, to, rk, Math.min(donor.sendable, rec.need), 'SUR', Y.cfg.PHASE_ORDER.SUR, allocations);
          if (sent <= 0) break;
          rec.need = surplusSpace(to, rk);
        }
      });
    });
  }

  function buildModeAStopReasonDiagnostics(targetIds, surplusIds, snapshotsById, incomingMap, bestRatio, maxFill) {
    var lines = [];
    if (bestRatio >= maxFill) {
      var ceilingText = 'Stopped at the user ceiling (' + Y.formatTwNumber(maxFill) + '%).';
      lines.push(ceilingText);
      return {
        nextRatioPct: null,
        stopReason: ceilingText,
        bottlenecks: [],
        residualNeed: zeroRes(),
        baselineTotals: zeroRes(),
        targetTotals: zeroRes(),
        groupMerchantBudget: 0,
        lockedSupply: { total: zeroRes(), villages: [] },
        lines: lines
      };
    }

    var nextRatio = bestRatio + 1;
    var trial = simulateModeACandidate(targetIds, surplusIds, snapshotsById, incomingMap, nextRatio);
    var residual = sumChildNeeds(trial.states, targetIds, trial.targetsById);
    var baselineTotals = sumBaselineTotals(trial.states, targetIds);
    var targetTotals = sumTargetTotals(targetIds, trial.targetsById);
    var lockedSupply = computeLockedChildSupply(trial.states, targetIds, trial.targetsById);
    var groupMerchantBudget = merchantBudgetForIds(trial.states, targetIds);
    var shortages = zeroRes();
    ['wood', 'clay', 'iron'].forEach(function (rk) {
      shortages[rk] = Math.max(0, (targetTotals[rk] || 0) - (baselineTotals[rk] || 0));
    });
    refreshRes(shortages);

    var bottlenecks = [];
    ['wood', 'clay', 'iron'].forEach(function (rk) {
      if (shortages[rk] > 0) {
        bottlenecks.push({
          type: 'group_' + rk + '_shortage',
          text: 'Target-group ' + rk + ' total ' + Y.formatTwNumber(baselineTotals[rk]) + ' < needed ' + Y.formatTwNumber(targetTotals[rk]) + ' at ' + nextRatio + '%.'
        });
      }
    });

    if (residual.total > 0 && lockedSupply.total.total > 0) {
      bottlenecks.push({
        type: 'merchant_exhaustion',
        text: 'Target-group merchant exhaustion leaves ' + formatResShort(lockedSupply.total) + ' movable current stock stranded at ' + nextRatio + '%.'
      });
    }

    if (!bottlenecks.length && residual.total > 0) {
      bottlenecks.push({
        type: 'current_stock_mobility',
        text: 'Next ratio ' + nextRatio + '% fails under same-run current-stock movement limits.'
      });
    }

    lines.push('Stop reason: ' + (bottlenecks[0] ? bottlenecks[0].text : ('Next ratio ' + nextRatio + '% is not feasible.')));
    if (residual.total > 0) lines.push('Next ' + nextRatio + '% still needs ' + formatResShort(residual) + ' after in-group rebalance.');
    if (lockedSupply.total.total > 0) lines.push('Merchant-stranded current stock at next ratio: ' + formatResShort(lockedSupply.total) + '.');

    return {
      nextRatioPct: nextRatio,
      stopReason: bottlenecks.length ? bottlenecks[0].text : ('Next ratio ' + nextRatio + '% is not feasible.'),
      bottlenecks: bottlenecks,
      residualNeed: residual,
      baselineTotals: baselineTotals,
      targetTotals: targetTotals,
      groupMerchantBudget: groupMerchantBudget,
      lockedSupply: lockedSupply,
      lines: lines
    };
  }

  function buildModeADiagnostics(finalRun, targetIds, surplusIds, snapshotsById, incomingMap, bestRatio, maxFill) {
    var stop = buildModeAStopReasonDiagnostics(targetIds, surplusIds, snapshotsById, incomingMap, bestRatio, maxFill);
    var excess = buildNonMovableExcessDiagnostics(finalRun.states, targetIds, finalRun.targetsById, surplusIds.length > 0);
    var lines = stop.lines.slice();

    if (excess.totals.arrivalLocked.total > 0) {
      lines.push('Arrival-locked excess: ' + formatResShort(excess.totals.arrivalLocked) + '.');
      var topArrival = topDiagRows(excess.rows, 'arrival_locked', 2);
      if (topArrival.length) lines.push('Top arrival-locked villages: ' + topArrival.join(' | '));
    }
    if (excess.totals.merchantStranded.total > 0) {
      lines.push('Merchant-stranded excess: ' + formatResShort(excess.totals.merchantStranded) + '.');
      var topMerchant = topDiagRows(excess.rows, 'merchant_stranded', 2);
      if (topMerchant.length) lines.push('Top merchant-stranded villages: ' + topMerchant.join(' | '));
    }
    if (excess.totals.sinkBlocked.total > 0) {
      var sinkLabel = surplusIds.length
        ? 'Residual movable excess still remains after the optional sink stage.'
        : 'No usable Surplus villages were available for leftover target-group excess.';
      lines.push('Sink-blocked excess: ' + formatResShort(excess.totals.sinkBlocked) + '. ' + sinkLabel);
      var sinkType = surplusIds.length ? 'residual_excess' : 'sink_blocked';
      var topSink = topDiagRows(excess.rows, sinkType, 2);
      if (topSink.length) lines.push('Top sink-blocked villages: ' + topSink.join(' | '));
    }

    return {
      stopReason: stop.stopReason,
      nextRatioPct: stop.nextRatioPct,
      bottlenecks: stop.bottlenecks,
      residualNeedAtNextRatio: stop.residualNeed,
      baselineTotalsAtNextRatio: stop.baselineTotals,
      targetTotalsAtNextRatio: stop.targetTotals,
      groupMerchantBudgetAtNextRatio: stop.groupMerchantBudget,
      lockedSupplyAtNextRatio: stop.lockedSupply,
      nonMovableExcess: excess,
      lines: lines
    };
  }

  function planBalance(targetIds, surplusIds, snapshotsById, incomingMap, capPct, surplusCapPct) {
    var normalized = normalizeModeASets(targetIds, surplusIds);
    targetIds = normalized.targetIds;
    surplusIds = normalized.surplusIds;
    var warnings = normalized.warnings.slice();
    var maxFill = targetIds.length ? clamp(capPct, 0, 100) : 0;

    if (!targetIds.length) {
      warnings.push('No Target villages selected.');
      return {
        mode: 'balance',
        states: buildPlanState(uniq(surplusIds), snapshotsById, incomingMap, 0, 0, null),
        targetIds: [],
        surplusIds: surplusIds,
        allocations: [],
        shipments: [],
        targetSummary: [],
        surplusSummary: [],
        meta: {
          computedFillPct: 0,
          capPct: maxFill,
          surplusCapPct: clamp(surplusCapPct, 0, 100),
          phaseTotals: { CRB: zeroRes(), PIM: zeroRes(), SUR: zeroRes() },
          merchantsUsed: 0,
          stopReason: 'No Target villages selected.',
          diagnostics: {
            stopReason: 'No Target villages selected.',
            nextRatioPct: null,
            bottlenecks: [],
            residualNeedAtNextRatio: zeroRes(),
            baselineTotalsAtNextRatio: zeroRes(),
            targetTotalsAtNextRatio: zeroRes(),
            groupMerchantBudgetAtNextRatio: 0,
            lockedSupplyAtNextRatio: { total: zeroRes(), villages: [] },
            nonMovableExcess: { totals: { arrivalLocked: zeroRes(), merchantStranded: zeroRes(), sinkBlocked: zeroRes() }, rows: [] },
            lines: ['No Target villages selected.']
          },
          warnings: warnings,
          excludedOverlapIds: normalized.excludedOverlapIds
        }
      };
    }

    var bestRatio = 0;
    for (var ratio = maxFill; ratio >= 0; ratio--) {
      var test = simulateModeACandidate(targetIds, surplusIds, snapshotsById, incomingMap, ratio);
      if (test.feasible) { bestRatio = ratio; break; }
    }

    var finalRun = simulateModeACandidate(targetIds, surplusIds, snapshotsById, incomingMap, bestRatio);
    if (surplusIds.length && bestRatio > 0) runModeASurplusRouting(finalRun.states, targetIds, surplusIds, finalRun.targetsById, surplusCapPct, finalRun.allocations);
    var shipments = compileShipments(finalRun.states);
    var diagnostics = buildModeADiagnostics(finalRun, targetIds, surplusIds, snapshotsById, incomingMap, bestRatio, maxFill);

    var plan = {
      mode: 'balance',
      states: finalRun.states,
      targetIds: targetIds,
      surplusIds: surplusIds,
      allocations: finalRun.allocations,
      shipments: shipments,
      targetSummary: buildChildSummary(finalRun.states, targetIds, finalRun.targetsById),
      surplusSummary: buildSurplusSummary(finalRun.states, surplusIds),
      meta: {
        computedFillPct: bestRatio,
        capPct: maxFill,
        surplusCapPct: clamp(surplusCapPct, 0, 100),
        phaseTotals: buildPhaseTotals(finalRun.allocations),
        merchantsUsed: merchantsUsedForIds(finalRun.states, targetIds),
        stopReason: diagnostics.stopReason,
        diagnostics: diagnostics,
        warnings: warnings,
        excludedOverlapIds: normalized.excludedOverlapIds
      }
    };

    if (bestRatio === 0 && targetIds.length) plan.meta.warnings.push('Computed fill is 0%. Group resource mix and/or merchants are too tight for a higher common ratio.');
    if (!surplusIds.length) plan.meta.warnings.push('No usable Surplus villages remain. Leftover movable excess stays in the target group.');
    return plan;
  }

  function zeroRes() { return { wood: 0, clay: 0, iron: 0, total: 0 }; }
  function refreshRes(res) { res.total = (res.wood || 0) + (res.clay || 0) + (res.iron || 0); return res; }
  function idSet(ids) {
    var out = Object.create(null);
    (ids || []).forEach(function (id) { id = Y.toId(id); if (id) out[id] = true; });
    return out;
  }
  function childTargetEach(st, ratioPct) { return capEach(st.storage || 0, ratioPct); }
  function childBaselineNoParent(st, rk) { return (st.baseNow[rk] || 0) + (st.inc0[rk] || 0) + (st.inPlanned[rk] || 0); }
  function childNeed(st, rk, targetEach) { return Math.max(0, Math.floor(targetEach - childBaselineNoParent(st, rk))); }
  function childSendable(st, rk, targetEach) {
    var spare = Math.max(0, Math.floor(childBaselineNoParent(st, rk) - targetEach));
    return Math.min(Math.max(0, st.baseNow[rk] || 0), spare);
  }
  function parentAvailable(st, rk) { return Math.max(0, Math.floor((st.baseNow[rk] || 0) - (st.keepEach || 0))); }
  function parentAboveReserve(st) {
    return { wood: parentAvailable(st, 'wood'), clay: parentAvailable(st, 'clay'), iron: parentAvailable(st, 'iron') };
  }
  function spreadScore(above) {
    return Math.abs((above.wood || 0) - (above.clay || 0)) + Math.abs((above.wood || 0) - (above.iron || 0)) + Math.abs((above.clay || 0) - (above.iron || 0));
  }
  function friendlySendAmount(st, rk) {
    var above = parentAboveReserve(st);
    var others = rk === 'wood' ? ['clay', 'iron'] : rk === 'clay' ? ['wood', 'iron'] : ['wood', 'clay'];
    return Math.max(0, Math.floor((above[rk] || 0) - (((above[others[0]] || 0) + (above[others[1]] || 0)) / 2)));
  }
  function parentSpreadAfterSend(st, rk, amt) {
    var above = parentAboveReserve(st);
    above[rk] = Math.max(0, (above[rk] || 0) - Math.max(0, Math.floor(amt || 0)));
    return spreadScore(above);
  }
  function parentRemainingTotalAfterSend(st, rk, amt) {
    var above = parentAboveReserve(st);
    above[rk] = Math.max(0, (above[rk] || 0) - Math.max(0, Math.floor(amt || 0)));
    return (above.wood || 0) + (above.clay || 0) + (above.iron || 0);
  }
  function resourceScarcity(totalNeed, totalSupply) {
    if (totalNeed <= 0) return -1;
    if (totalSupply <= 0) return 1000000000 + totalNeed;
    return totalNeed / totalSupply;
  }
  function computeChildResourceStats(st, childIds, targetsById, rk) {
    var need = 0, supply = 0;
    childIds.forEach(function (id) {
      var s = st.get(id);
      if (!s) return;
      var targetEach = targetsById[id] || 0;
      need += childNeed(s, rk, targetEach);
      supply += childSendable(s, rk, targetEach);
    });
    return { need: need, supply: supply, score: resourceScarcity(need, supply) };
  }
  function computeParentResourceStats(st, parentIds, childIds, targetsById, rk) {
    var need = 0, supply = 0;
    childIds.forEach(function (id) {
      var s = st.get(id);
      if (!s) return;
      need += childNeed(s, rk, targetsById[id] || 0);
    });
    parentIds.forEach(function (id) {
      var s = st.get(id);
      if (!s) return;
      supply += parentAvailable(s, rk);
    });
    return { need: need, supply: supply, score: resourceScarcity(need, supply) };
  }
  function orderResources(statsFn) {
    return ['wood', 'clay', 'iron'].sort(function (a, b) {
      var sa = statsFn(a), sb = statsFn(b);
      if (sb.score !== sa.score) return sb.score - sa.score;
      if (sb.need !== sa.need) return sb.need - sa.need;
      return a.localeCompare(b);
    });
  }
  function normalizeModeBSets(parentIds, childIds, surplusIds) {
    parentIds = uniq(parentIds);
    childIds = uniq(childIds);
    surplusIds = uniq(surplusIds);
    var warnings = [];
    var excluded = [];
    var childSet = idSet(childIds);
    var parentSet = idSet(parentIds);
    function note(ids, label) {
      if (!ids.length) return;
      excluded = uniq(excluded.concat(ids));
      warnings.push(label + ': ' + ids.join(', '));
    }
    var overlapParents = parentIds.filter(function (id) { return !!childSet[id]; });
    note(overlapParents, 'Parents/Children overlap excluded');
    parentIds = parentIds.filter(function (id) { return !childSet[id]; });
    var overlapSurplusChildren = surplusIds.filter(function (id) { return !!childSet[id]; });
    note(overlapSurplusChildren, 'Surplus/Children overlap excluded');
    surplusIds = surplusIds.filter(function (id) { return !childSet[id]; });
    var overlapSurplusParents = surplusIds.filter(function (id) { return !!parentSet[id]; });
    note(overlapSurplusParents, 'Surplus/Parents overlap excluded');
    surplusIds = surplusIds.filter(function (id) { return !parentSet[id]; });
    return { parentIds: parentIds, childIds: childIds, surplusIds: surplusIds, warnings: warnings, excludedOverlapIds: excluded };
  }
  function buildModeBTargets(st, childIds, ratioPct) {
    var out = {};
    childIds.forEach(function (id) {
      var s = st.get(id);
      if (!s) return;
      out[id] = childTargetEach(s, ratioPct);
      s.capEach = out[id];
      s.capEachByRes = { wood: out[id], clay: out[id], iron: out[id] };
    });
    return out;
  }
  function runChildRebalance(st, childIds, targetsById, allocations) {
    var order = orderResources(function (rk) { return computeChildResourceStats(st, childIds, targetsById, rk); });
    order.forEach(function (rk) {
      var receivers = [], donors = [];
      childIds.forEach(function (id) {
        var s = st.get(id);
        if (!s) return;
        var targetEach = targetsById[id] || 0;
        var need = childNeed(s, rk, targetEach);
        var sendable = childSendable(s, rk, targetEach);
        if (need > 0) receivers.push({ id: id, need: need });
        if (sendable > 0 && (s.merchFree || 0) > 0) donors.push({ id: id, sendable: sendable });
      });
      receivers.sort(function (a, b) { return b.need - a.need || a.id - b.id; });
      donors.sort(function (a, b) { return b.sendable - a.sendable || a.id - b.id; });
      receivers.forEach(function (rec) {
        var to = st.get(rec.id);
        if (!to) return;
        while (rec.need > 0) {
          donors.sort(function (a, b) { return b.sendable - a.sendable || a.id - b.id; });
          var donor = null;
          for (var i = 0; i < donors.length; i++) {
            if (donors[i].id !== rec.id && donors[i].sendable > 0) { donor = donors[i]; break; }
          }
          if (!donor) break;
          var from = st.get(donor.id);
          if (!from || (from.merchFree || 0) <= 0) { donor.sendable = 0; continue; }
          donor.sendable = childSendable(from, rk, targetsById[donor.id] || 0);
          if (donor.sendable <= 0) continue;
          var sent = applySend(from, to, rk, Math.min(donor.sendable, rec.need), 'CRB', Y.cfg.PHASE_ORDER.CRB, allocations);
          if (sent <= 0) { donor.sendable = 0; continue; }
          donor.sendable = childSendable(from, rk, targetsById[donor.id] || 0);
          rec.need = childNeed(to, rk, targetsById[rec.id] || 0);
        }
      });
    });
  }
  function rankParentDonors(st, parentIds, to, rk, needAmount) {
    var tier1 = [], tier2 = [];
    parentIds.forEach(function (id) {
      var s = st.get(id);
      if (!s || (s.merchFree || 0) <= 0) return;
      var avail = parentAvailable(s, rk);
      var pairLimit = maxPairAdditionalByMerchants(s, to);
      if (avail <= 0 || pairLimit <= 0) return;
      var friendly = Math.min(avail, Math.max(0, friendlySendAmount(s, rk)));
      var friendlyChunk = Math.min(needAmount, pairLimit, friendly);
      var fallbackChunk = Math.min(needAmount, pairLimit, avail);
      var row = {
        id: id,
        state: s,
        friendlyChunk: friendlyChunk,
        fallbackChunk: fallbackChunk,
        postSpread: parentSpreadAfterSend(s, rk, fallbackChunk),
        remainingTotal: parentRemainingTotalAfterSend(s, rk, fallbackChunk),
        merchFree: s.merchFree || 0
      };
      if (friendlyChunk > 0) tier1.push(row);
      else if (fallbackChunk > 0) tier2.push(row);
    });
    tier1.sort(function (a, b) {
      if (a.postSpread !== b.postSpread) return a.postSpread - b.postSpread;
      if (b.friendlyChunk !== a.friendlyChunk) return b.friendlyChunk - a.friendlyChunk;
      if (b.remainingTotal !== a.remainingTotal) return b.remainingTotal - a.remainingTotal;
      if (b.merchFree !== a.merchFree) return b.merchFree - a.merchFree;
      return a.id - b.id;
    });
    tier2.sort(function (a, b) {
      if (a.postSpread !== b.postSpread) return a.postSpread - b.postSpread;
      if (b.remainingTotal !== a.remainingTotal) return b.remainingTotal - a.remainingTotal;
      if (b.merchFree !== a.merchFree) return b.merchFree - a.merchFree;
      return a.id - b.id;
    });
    return tier1.concat(tier2);
  }
  function runParentImport(st, parentIds, childIds, targetsById, allocations) {
    var order = orderResources(function (rk) { return computeParentResourceStats(st, parentIds, childIds, targetsById, rk); });
    order.forEach(function (rk) {
      var receivers = [];
      childIds.forEach(function (id) {
        var child = st.get(id);
        if (!child) return;
        var need = childNeed(child, rk, targetsById[id] || 0);
        if (need > 0) receivers.push({ id: id, need: need });
      });
      receivers.sort(function (a, b) { return b.need - a.need || a.id - b.id; });
      receivers.forEach(function (rec) {
        var to = st.get(rec.id);
        if (!to) return;
        while (rec.need > 0) {
          var donors = rankParentDonors(st, parentIds, to, rk, rec.need);
          if (!donors.length) break;
          var donor = donors[0];
          var sendGoal = donor.friendlyChunk > 0 ? donor.friendlyChunk : donor.fallbackChunk;
          if (sendGoal <= 0) break;
          var sent = applySend(donor.state, to, rk, sendGoal, 'PIM', Y.cfg.PHASE_ORDER.PIM, allocations);
          if (sent <= 0) break;
          rec.need = childNeed(to, rk, targetsById[rec.id] || 0);
        }
      });
    });
  }
  function childrenSatisfied(st, childIds, targetsById) {
    for (var i = 0; i < childIds.length; i++) {
      var id = childIds[i];
      var s = st.get(id);
      if (!s) return false;
      var targetEach = targetsById[id] || 0;
      if (childNeed(s, 'wood', targetEach) > 0) return false;
      if (childNeed(s, 'clay', targetEach) > 0) return false;
      if (childNeed(s, 'iron', targetEach) > 0) return false;
    }
    return true;
  }
  function setSurplusCaps(st, surplusIds, surplusCapPct) {
    surplusIds.forEach(function (id) {
      var s = st.get(id);
      if (!s) return;
      var cap = capEach(s.storage || 0, surplusCapPct);
      s.capEach = cap;
      s.capEachByRes = { wood: cap, clay: cap, iron: cap };
    });
  }
  function surplusSpace(s, rk) {
    var cap = s.capEachByRes && s.capEachByRes[rk] != null ? s.capEachByRes[rk] : (s.capEach || 0);
    return Math.max(0, Math.floor(cap - getFutureRecvVal(s, rk)));
  }
  function runSurplusRouting(st, parentIds, surplusIds, surplusCapPct, allocations) {
    if (!surplusIds.length) return;
    setSurplusCaps(st, surplusIds, surplusCapPct);
    ['wood', 'clay', 'iron'].forEach(function (rk) {
      var receivers = surplusIds.map(function (id) {
        var s = st.get(id);
        if (!s) return null;
        var need = surplusSpace(s, rk);
        return need > 0 ? { id: id, need: need, storage: s.storage || 0 } : null;
      }).filter(Boolean);
      receivers.sort(function (a, b) {
        if (b.need !== a.need) return b.need - a.need;
        if (b.storage !== a.storage) return b.storage - a.storage;
        return a.id - b.id;
      });
      receivers.forEach(function (rec) {
        var to = st.get(rec.id);
        if (!to) return;
        while (rec.need > 0) {
          var donors = rankParentDonors(st, parentIds, to, rk, rec.need);
          if (!donors.length) break;
          var donor = donors[0];
          var sendGoal = donor.friendlyChunk > 0 ? donor.friendlyChunk : donor.fallbackChunk;
          if (sendGoal <= 0) break;
          var sent = applySend(donor.state, to, rk, sendGoal, 'SUR', Y.cfg.PHASE_ORDER.SUR, allocations);
          if (sent <= 0) break;
          rec.need = surplusSpace(to, rk);
        }
      });
    });
  }
  function buildPhaseTotals(allocations) {
    var totals = { CRB: zeroRes(), PIM: zeroRes(), SUR: zeroRes() };
    (allocations || []).forEach(function (a) {
      if (!a || !totals[a.phaseTag]) return;
      totals[a.phaseTag][a.resource] += a.amount || 0;
      refreshRes(totals[a.phaseTag]);
    });
    return totals;
  }
  function merchantsUsedForIds(st, ids) {
    var used = 0;
    (ids || []).forEach(function (id) {
      var s = st.get(id);
      if (!s) return;
      used += Math.max(0, (s.merchFree0 || 0) - (s.merchFree || 0));
    });
    return used;
  }
  function formatResShort(res) {
    res = res || zeroRes();
    var parts = [];
    if (res.wood > 0) parts.push('W ' + Y.formatTwNumber(res.wood));
    if (res.clay > 0) parts.push('C ' + Y.formatTwNumber(res.clay));
    if (res.iron > 0) parts.push('I ' + Y.formatTwNumber(res.iron));
    return parts.length ? parts.join(' / ') : '0';
  }
  function sumChildNeeds(st, childIds, targetsById) {
    var out = zeroRes();
    childIds.forEach(function (id) {
      var s = st.get(id);
      if (!s) return;
      var targetEach = targetsById[id] || 0;
      out.wood += childNeed(s, 'wood', targetEach);
      out.clay += childNeed(s, 'clay', targetEach);
      out.iron += childNeed(s, 'iron', targetEach);
    });
    return refreshRes(out);
  }
  function sumParentAvailability(st, parentIds) {
    var out = zeroRes();
    parentIds.forEach(function (id) {
      var s = st.get(id);
      if (!s) return;
      out.wood += parentAvailable(s, 'wood');
      out.clay += parentAvailable(s, 'clay');
      out.iron += parentAvailable(s, 'iron');
    });
    return refreshRes(out);
  }
  function sumParentMerchantBudget(st, parentIds) {
    var total = 0;
    parentIds.forEach(function (id) {
      var s = st.get(id);
      if (!s) return;
      total += max0(s.merchFree || 0) * Y.cfg.MERCH_CAP_PER;
    });
    return total;
  }
  function sumParentWcCapacity(st, parentIds) {
    var total = 0;
    parentIds.forEach(function (id) {
      var s = st.get(id);
      if (!s) return;
      var merchBudget = max0(s.merchFree || 0) * Y.cfg.MERCH_CAP_PER;
      total += Math.min(merchBudget, parentAvailable(s, 'wood') + parentAvailable(s, 'clay'));
    });
    return total;
  }
  function sumParentAllCapacity(st, parentIds) {
    var total = 0;
    parentIds.forEach(function (id) {
      var s = st.get(id);
      if (!s) return;
      var merchBudget = max0(s.merchFree || 0) * Y.cfg.MERCH_CAP_PER;
      total += Math.min(merchBudget, parentAvailable(s, 'wood') + parentAvailable(s, 'clay') + parentAvailable(s, 'iron'));
    });
    return total;
  }
  function computeLockedChildSupply(st, childIds, targetsById) {
    var total = zeroRes();
    var villages = [];
    childIds.forEach(function (id) {
      var s = st.get(id);
      if (!s) return;
      var row = { id: s.id, name: s.name, coord: s.coord, res: zeroRes() };
      var targetEach = targetsById[id] || 0;
      ['wood', 'clay', 'iron'].forEach(function (rk) {
        var sendable = childSendable(s, rk, targetEach);
        if (sendable > 0 && max0(s.merchFree || 0) <= 0) {
          row.res[rk] += sendable;
          total[rk] += sendable;
        }
      });
      refreshRes(row.res);
      if (row.res.total > 0) villages.push(row);
    });
    villages.sort(function (a, b) { return (b.res.total || 0) - (a.res.total || 0) || a.id - b.id; });
    return { total: refreshRes(total), villages: villages };
  }
  function simulateModeBChildOnly(parentIds, childIds, surplusIds, snapshotsById, incomingMap, ratioPct, reservePct) {
    var allIds = uniq(parentIds.concat(childIds).concat(surplusIds));
    var st = buildPlanState(allIds, snapshotsById, incomingMap, 0, reservePct, null);
    var allocations = [];
    var targetsById = buildModeBTargets(st, childIds, ratioPct);
    runChildRebalance(st, childIds, targetsById, allocations);
    return { states: st, allocations: allocations, targetsById: targetsById };
  }
  function pushDiagVillage(map, type, s, rk, amount) {
    amount = max0(amount);
    if (!amount) return;
    var key = type + ':' + s.id;
    if (!map[key]) {
      map[key] = { type: type, id: s.id, name: s.name, coord: s.coord, res: zeroRes() };
    }
    map[key].res[rk] += amount;
    refreshRes(map[key].res);
  }
  function buildNonMovableExcessDiagnostics(st, childIds, targetsById, hasUsableSurplus) {
    var totals = {
      arrivalLocked: zeroRes(),
      merchantStranded: zeroRes(),
      sinkBlocked: zeroRes()
    };
    var rowsMap = Object.create(null);

    childIds.forEach(function (id) {
      var s = st.get(id);
      if (!s) return;
      var targetEach = targetsById[id] || 0;

      ['wood', 'clay', 'iron'].forEach(function (rk) {
        var future = childBaselineNoParent(s, rk);
        var excess = Math.max(0, Math.floor(future - targetEach));
        if (excess <= 0) return;

        var noExistingIncoming = Math.max(0, Math.floor((s.baseNow[rk] || 0) + (s.inPlanned[rk] || 0)));
        var absorbIncoming = Math.max(0, Math.floor(targetEach - noExistingIncoming));
        var arrivalLocked = Math.max(0, Math.floor((s.inc0[rk] || 0) - absorbIncoming));
        if (arrivalLocked > excess) arrivalLocked = excess;

        var remaining = excess - arrivalLocked;
        var merchantStranded = 0;
        var currentExcess = Math.max(0, Math.floor((s.baseNow[rk] || 0) - targetEach));
        if (remaining > 0 && currentExcess > 0 && max0(s.merchFree || 0) <= 0) {
          merchantStranded = Math.min(remaining, currentExcess);
        }

        remaining -= merchantStranded;
        var sinkBlocked = Math.max(0, remaining);

        if (arrivalLocked > 0) {
          totals.arrivalLocked[rk] += arrivalLocked;
          pushDiagVillage(rowsMap, 'arrival_locked', s, rk, arrivalLocked);
        }
        if (merchantStranded > 0) {
          totals.merchantStranded[rk] += merchantStranded;
          pushDiagVillage(rowsMap, 'merchant_stranded', s, rk, merchantStranded);
        }
        if (sinkBlocked > 0) {
          totals.sinkBlocked[rk] += sinkBlocked;
          pushDiagVillage(rowsMap, hasUsableSurplus ? 'residual_excess' : 'sink_blocked', s, rk, sinkBlocked);
        }
      });
    });

    refreshRes(totals.arrivalLocked);
    refreshRes(totals.merchantStranded);
    refreshRes(totals.sinkBlocked);

    var rows = Object.keys(rowsMap).map(function (k) { return rowsMap[k]; });
    rows.sort(function (a, b) { return (b.res.total || 0) - (a.res.total || 0) || a.id - b.id; });
    return { totals: totals, rows: rows };
  }
  function topDiagRows(rows, type, limit) {
    return (rows || [])
      .filter(function (row) { return row.type === type; })
      .slice(0, limit || 2)
      .map(function (row) { return row.name + ' (' + formatResShort(row.res) + ')'; });
  }
  function buildStopReasonDiagnostics(parentIds, childIds, surplusIds, snapshotsById, incomingMap, bestRatio, maxFill, parentReservePct) {
    var lines = [];
    if (bestRatio >= maxFill) {
      var ceilingText = 'Stopped at the user ceiling (' + Y.formatTwNumber(maxFill) + '%).';
      lines.push(ceilingText);
      return {
        nextRatioPct: null,
        stopReason: ceilingText,
        bottlenecks: [],
        residualNeed: zeroRes(),
        parentAvailability: zeroRes(),
        parentMerchantBudget: 0,
        parentWcCapacity: 0,
        parentAllCapacity: 0,
        childLockedSupply: { total: zeroRes(), villages: [] },
        lines: lines
      };
    }

    var nextRatio = bestRatio + 1;
    var childOnly = simulateModeBChildOnly(parentIds, childIds, surplusIds, snapshotsById, incomingMap, nextRatio, parentReservePct);
    var residual = sumChildNeeds(childOnly.states, childIds, childOnly.targetsById);
    var parentAvail = sumParentAvailability(childOnly.states, parentIds);
    var parentMerchBudget = sumParentMerchantBudget(childOnly.states, parentIds);
    var parentWcCapacity = sumParentWcCapacity(childOnly.states, parentIds);
    var parentAllCapacity = sumParentAllCapacity(childOnly.states, parentIds);
    var childLockedSupply = computeLockedChildSupply(childOnly.states, childIds, childOnly.targetsById);
    var wcNeed = residual.wood + residual.clay;
    var bottlenecks = [];

    if (!parentIds.length) {
      bottlenecks.push({
        type: 'no_parents',
        text: 'No Parents villages are available for the next ratio.'
      });
    }
    if (wcNeed > parentWcCapacity) {
      bottlenecks.push({
        type: 'parent_wc_ceiling',
        text: 'Parent wood+clay export ceiling ' + Y.formatTwNumber(parentWcCapacity) + ' < needed ' + Y.formatTwNumber(wcNeed) + ' at ' + nextRatio + '%.'
      });
    }
    if (residual.total > parentMerchBudget) {
      bottlenecks.push({
        type: 'parent_merchant_ceiling',
        text: 'Parent merchant ceiling ' + Y.formatTwNumber(parentMerchBudget) + ' < total remaining need ' + Y.formatTwNumber(residual.total) + ' at ' + nextRatio + '%.'
      });
    }
    ['wood', 'clay', 'iron'].forEach(function (rk) {
      if (residual[rk] > parentAvail[rk]) {
        bottlenecks.push({
          type: 'parent_' + rk + '_shortage',
          text: 'Parent ' + rk + ' availability ' + Y.formatTwNumber(parentAvail[rk]) + ' < needed ' + Y.formatTwNumber(residual[rk]) + ' at ' + nextRatio + '%.'
        });
      }
    });
    if (childLockedSupply.total.total > 0) {
      bottlenecks.push({
        type: 'child_merchant_exhaustion',
        text: 'Child merchant exhaustion leaves ' + formatResShort(childLockedSupply.total) + ' current stock stranded before parent import at ' + nextRatio + '%.'
      });
    }
    if (!bottlenecks.length) {
      var generic = residual.total > parentAllCapacity
        ? 'Next ratio ' + nextRatio + '% exceeds total parent shippable volume under current merchant ownership.'
        : 'Next ratio ' + nextRatio + '% fails under current local merchant/pair allocation limits.';
      bottlenecks.push({ type: 'local_allocation', text: generic });
    }

    lines.push('Stop reason: ' + bottlenecks[0].text);
    if (residual.total > 0) lines.push('Next ' + nextRatio + '% still needs ' + formatResShort(residual) + ' after child rebalance.');
    if (childLockedSupply.total.total > 0) lines.push('Internal child stock blocked by merchants: ' + formatResShort(childLockedSupply.total) + '.');

    return {
      nextRatioPct: nextRatio,
      stopReason: bottlenecks[0].text,
      bottlenecks: bottlenecks,
      residualNeed: residual,
      parentAvailability: parentAvail,
      parentMerchantBudget: parentMerchBudget,
      parentWcCapacity: parentWcCapacity,
      parentAllCapacity: parentAllCapacity,
      childLockedSupply: childLockedSupply,
      lines: lines
    };
  }
  function buildModeBDiagnostics(finalRun, parentIds, childIds, surplusIds, snapshotsById, incomingMap, bestRatio, maxFill, parentReservePct) {
    var stop = buildStopReasonDiagnostics(parentIds, childIds, surplusIds, snapshotsById, incomingMap, bestRatio, maxFill, parentReservePct);
    var excess = buildNonMovableExcessDiagnostics(finalRun.states, childIds, finalRun.targetsById, surplusIds.length > 0);
    var lines = stop.lines.slice();

    if (excess.totals.arrivalLocked.total > 0) {
      lines.push('Arrival-locked excess: ' + formatResShort(excess.totals.arrivalLocked) + '.');
      var topArrival = topDiagRows(excess.rows, 'arrival_locked', 2);
      if (topArrival.length) lines.push('Top arrival-locked villages: ' + topArrival.join(' | '));
    }
    if (excess.totals.merchantStranded.total > 0) {
      lines.push('Merchant-stranded excess: ' + formatResShort(excess.totals.merchantStranded) + '.');
      var topMerchant = topDiagRows(excess.rows, 'merchant_stranded', 2);
      if (topMerchant.length) lines.push('Top merchant-stranded villages: ' + topMerchant.join(' | '));
    }
    if (excess.totals.sinkBlocked.total > 0) {
      var sinkLabel = surplusIds.length
        ? 'Residual excess remains with no child-to-sink route in the current run.'
        : 'No usable Surplus villages were available for child excess.';
      lines.push('Sink-blocked excess: ' + formatResShort(excess.totals.sinkBlocked) + '. ' + sinkLabel);
      var sinkType = surplusIds.length ? 'residual_excess' : 'sink_blocked';
      var topSink = topDiagRows(excess.rows, sinkType, 2);
      if (topSink.length) lines.push('Top sink-blocked villages: ' + topSink.join(' | '));
    }

    return {
      stopReason: stop.stopReason,
      nextRatioPct: stop.nextRatioPct,
      bottlenecks: stop.bottlenecks,
      residualNeedAtNextRatio: stop.residualNeed,
      parentAvailabilityAtNextRatio: stop.parentAvailability,
      parentMerchantBudgetAtNextRatio: stop.parentMerchantBudget,
      parentWcCapacityAtNextRatio: stop.parentWcCapacity,
      parentAllCapacityAtNextRatio: stop.parentAllCapacity,
      childLockedSupplyAtNextRatio: stop.childLockedSupply,
      nonMovableExcess: excess,
      lines: lines
    };
  }
  function buildChildSummary(st, childIds, targetsById) {
    return childIds.map(function (id) {
      var s = st.get(id);
      if (!s) return null;
      var before = addRes(cloneRes(s.base0), cloneRes(s.inc0));
      var after = addRes(cloneRes(s.baseNow), cloneRes(s.inc0));
      after = addRes(after, cloneRes(s.inPlanned));
      return {
        id: s.id, name: s.name, coord: s.coord, storage: s.storage, targetEach: targetsById[id] || 0,
        before: before, sent: cloneRes(s.outPlanned), recv: cloneRes(s.inPlanned), after: after,
        merchUsed: Math.max(0, (s.merchFree0 || 0) - (s.merchFree || 0))
      };
    }).filter(Boolean);
  }
  function buildParentSummary(st, parentIds) {
    return parentIds.map(function (id) {
      var s = st.get(id);
      if (!s) return null;
      var above = parentAboveReserve(s);
      return {
        id: s.id, name: s.name, coord: s.coord, storage: s.storage, reserveEach: s.keepEach || 0,
        before: cloneRes(s.base0), sent: cloneRes(s.outPlanned), recv: cloneRes(s.inPlanned), after: cloneRes(s.baseNow),
        aboveReserveAfter: refreshRes({ wood: above.wood || 0, clay: above.clay || 0, iron: above.iron || 0, total: 0 }),
        spreadAfter: spreadScore(above), merchUsed: Math.max(0, (s.merchFree0 || 0) - (s.merchFree || 0))
      };
    }).filter(Boolean);
  }
  function buildSurplusSummary(st, surplusIds) {
    return surplusIds.map(function (id) {
      var s = st.get(id);
      if (!s) return null;
      var before = addRes(cloneRes(s.base0), cloneRes(s.inc0));
      var after = addRes(cloneRes(s.baseNow), cloneRes(s.inc0));
      after = addRes(after, cloneRes(s.inPlanned));
      return {
        id: s.id, name: s.name, coord: s.coord, storage: s.storage, capEach: s.capEach || 0,
        before: before, sent: cloneRes(s.outPlanned), recv: cloneRes(s.inPlanned), after: after
      };
    }).filter(Boolean);
  }
  function simulateModeBCandidate(parentIds, childIds, surplusIds, snapshotsById, incomingMap, ratioPct, reservePct) {
    var allIds = uniq(parentIds.concat(childIds).concat(surplusIds));
    var st = buildPlanState(allIds, snapshotsById, incomingMap, 0, reservePct, null);
    var allocations = [];
    var targetsById = buildModeBTargets(st, childIds, ratioPct);
    runChildRebalance(st, childIds, targetsById, allocations);
    runParentImport(st, parentIds, childIds, targetsById, allocations);
    return { feasible: childrenSatisfied(st, childIds, targetsById), states: st, allocations: allocations, targetsById: targetsById };
  }
  function planPush(parentIds, childIds, surplusIds, snapshotsById, incomingMap, childrenMaxFillPct, surplusCapPct, parentReservePct) {
    var normalized = normalizeModeBSets(parentIds, childIds, surplusIds);
    parentIds = normalized.parentIds;
    childIds = normalized.childIds;
    surplusIds = normalized.surplusIds;
    var warnings = normalized.warnings.slice();
    if (!childIds.length) {
      warnings.push('No Children villages selected.');
      return {
        mode: 'push',
        states: buildPlanState(uniq(parentIds.concat(surplusIds)), snapshotsById, incomingMap, 0, parentReservePct, null),
        parentIds: parentIds,
        childIds: [],
        surplusIds: surplusIds,
        allocations: [],
        shipments: [],
        childSummary: [],
        parentSummary: [],
        surplusSummary: [],
        meta: {
          computedChildFillPct: 0,
          childrenMaxFillPct: clamp(childrenMaxFillPct, 0, 100),
          parentReservePct: clamp(parentReservePct, 0, 100),
          surplusCapPct: clamp(surplusCapPct, 0, 100),
          phaseTotals: { CRB: zeroRes(), PIM: zeroRes(), SUR: zeroRes() },
          childMerchantsUsed: 0,
          parentMerchantsUsed: 0,
          stopReason: 'No Children villages selected.',
          diagnostics: {
            stopReason: 'No Children villages selected.',
            nextRatioPct: null,
            bottlenecks: [],
            residualNeedAtNextRatio: zeroRes(),
            parentAvailabilityAtNextRatio: zeroRes(),
            parentMerchantBudgetAtNextRatio: 0,
            parentWcCapacityAtNextRatio: 0,
            parentAllCapacityAtNextRatio: 0,
            childLockedSupplyAtNextRatio: { total: zeroRes(), villages: [] },
            nonMovableExcess: { totals: { arrivalLocked: zeroRes(), merchantStranded: zeroRes(), sinkBlocked: zeroRes() }, rows: [] },
            lines: ['No Children villages selected.']
          },
          warnings: warnings,
          excludedOverlapIds: normalized.excludedOverlapIds
        }
      };
    }
    if (!parentIds.length) warnings.push('No Parents villages selected. Only current child stock and incoming can contribute.');
    var maxFill = childIds.length ? clamp(childrenMaxFillPct, 0, 100) : 0;
    var bestRatio = 0, found = false;
    for (var ratio = maxFill; ratio >= 0; ratio--) {
      var test = simulateModeBCandidate(parentIds, childIds, surplusIds, snapshotsById, incomingMap, ratio, parentReservePct);
      if (test.feasible) { bestRatio = ratio; found = true; break; }
    }
    if (!found) bestRatio = 0;
    var finalRun = simulateModeBCandidate(parentIds, childIds, surplusIds, snapshotsById, incomingMap, bestRatio, parentReservePct);
    if (surplusIds.length && bestRatio > 0) runSurplusRouting(finalRun.states, parentIds, surplusIds, surplusCapPct, finalRun.allocations);
    var shipments = compileShipments(finalRun.states);
    var diagnostics = buildModeBDiagnostics(finalRun, parentIds, childIds, surplusIds, snapshotsById, incomingMap, bestRatio, maxFill, parentReservePct);
    var plan = {
      mode: 'push',
      states: finalRun.states,
      parentIds: parentIds,
      childIds: childIds,
      surplusIds: surplusIds,
      allocations: finalRun.allocations,
      shipments: shipments,
      childSummary: buildChildSummary(finalRun.states, childIds, finalRun.targetsById),
      parentSummary: buildParentSummary(finalRun.states, parentIds),
      surplusSummary: buildSurplusSummary(finalRun.states, surplusIds),
      meta: {
        computedChildFillPct: bestRatio,
        childrenMaxFillPct: maxFill,
        parentReservePct: clamp(parentReservePct, 0, 100),
        surplusCapPct: clamp(surplusCapPct, 0, 100),
        phaseTotals: buildPhaseTotals(finalRun.allocations),
        childMerchantsUsed: merchantsUsedForIds(finalRun.states, childIds),
        parentMerchantsUsed: merchantsUsedForIds(finalRun.states, parentIds),
        stopReason: diagnostics.stopReason,
        diagnostics: diagnostics,
        warnings: warnings,
        excludedOverlapIds: normalized.excludedOverlapIds
      }
    };
    if (bestRatio === 0 && childIds.length) plan.meta.warnings.push('Computed child fill is 0%. Supply and/or merchants are too tight for a higher ratio.');
    if (!surplusIds.length) plan.meta.warnings.push('No Surplus group selected. Leftover parent stock stays home.');
    return plan;
  }

function planFunnel(allIds, targetIds, surplusIds, snapshotsById, incomingMap, capPct, surplusCapPct, reservePct, ironDeltaPct) {
    var tSet = {}; targetIds.forEach(function (v) { tSet[String(v)] = true; });
    var sSet = {}; (surplusIds || []).forEach(function (v) { sSet[String(v)] = true; });

    surplusIds = (surplusIds || []).filter(function (id) { return !tSet[String(id)]; });
    // v26: Sender list should NOT be nulled by Surplus selection; only exclude Targets.
    var senderIds = (allIds || []).filter(function (id) { return !tSet[String(id)]; });

    var allNeeded = uniq(senderIds.concat(targetIds).concat(surplusIds));

    var capOverride = {};
    surplusIds.forEach(function (vid) {
      var snap = snapshotsById[vid];
      if (!snap) return;
      capOverride[vid] = capEach(snap.storage || 0, surplusCapPct);
    });

    var st = buildPlanState(allNeeded, snapshotsById, incomingMap, capPct, reservePct, capOverride);

    targetIds.forEach(function (vid) {
      var t = st.get(vid);
      if (!t) return;
      t.capEach = capEach(t.storage, capPct);
      var ironFactor = ironFactorFromDeltaPct(ironDeltaPct || 0);
      t.desiredByRes = desiredTripletFromCap(t.capEach, ironFactor);
    });

    ['wood', 'clay', 'iron'].forEach(function (rk) {
      var receivers = [];
      targetIds.forEach(function (vid) {
        var t = st.get(vid);
        if (!t) return;
        var want = (t.desiredByRes && t.desiredByRes[rk]) ? t.desiredByRes[rk] : (t.capEach || 0);
        var need = Math.max(0, Math.floor(want - getFutureRecvVal(t, rk)));
        if (need > 0) receivers.push({ id: vid, need: need });
      });
      receivers.sort(function (a, b) { return b.need - a.need; });

      var donors = [];
      senderIds.forEach(function (vid) {
        var s = st.get(vid);
        if (!s) return;
        var avail = Math.max(0, Math.floor((s.baseNow[rk] || 0) - s.keepEach));
        if (avail > 0) donors.push({ id: vid, surplus: avail });
      });
      donors.sort(function (a, b) { return b.surplus - a.surplus; });

      var di = 0, ri = 0;
      while (di < donors.length && ri < receivers.length) {
        var d = donors[di], r = receivers[ri];
        if (d.surplus <= 0) { di++; continue; }
        if (r.need <= 0) { ri++; continue; }

        var from = st.get(d.id);
        var to = st.get(r.id);

        var take = Math.min(d.surplus, r.need);
        var sent = applySend(from, to, rk, take, 'FUN');
        if (sent <= 0) { di++; continue; }
        d.surplus -= sent;
        r.need -= sent;
      }
    });

    if (surplusIds.length) {
      surplusIds.sort(function (a, b) {
        var sa = snapshotsById[a] ? snapshotsById[a].storage : 0;
        var sb = snapshotsById[b] ? snapshotsById[b].storage : 0;
        return sb - sa;
      });

      ['wood', 'clay', 'iron'].forEach(function (rk) {
        var donors2 = [];
        senderIds.forEach(function (vid) {
          var s = st.get(vid);
          if (!s) return;
          var avail = Math.max(0, Math.floor((s.baseNow[rk] || 0) - s.keepEach));
          if (avail > 0) donors2.push({ id: vid, surplus: avail });
        });
        donors2.sort(function (a, b) { return b.surplus - a.surplus; });

        var di = 0;
        for (var si = 0; si < surplusIds.length && di < donors2.length; si++) {
          var to = st.get(surplusIds[si]);
          if (!to) continue;

          while (di < donors2.length) {
            var d = donors2[di];
            if (d.surplus <= 0) { di++; continue; }
            var from = st.get(d.id);
            if (!from) { di++; continue; }

            var space = (to.capEach || 0) - getFutureRecvVal(to, rk);
            if (space <= 0) break;

            var take = Math.min(d.surplus, space);
            var sent = applySend(from, to, rk, take, 'SUR');
            if (sent <= 0) { di++; continue; }
            d.surplus -= sent;
          }
        }
      });
    }

    var shipments = compileShipments(st);
    return { shipments: shipments, states: st, targetIds: targetIds, senderIds: senderIds, surplusIds: surplusIds };
  }

  function summarize(statesMap, ids) {
    var rows = [];
    (ids || []).forEach(function (vid) {
      var s = statesMap.get(vid);
      if (!s) return;

      var sent = cloneRes(s.outPlanned);
      var recv = cloneRes(s.inPlanned);

      var before = cloneRes(s.base0);
      addRes(before, s.inc0);

      var afterArrived = cloneRes(s.base0);
      afterArrived.wood = (s.base0.wood - sent.wood) + s.inc0.wood + recv.wood;
      afterArrived.clay = (s.base0.clay - sent.clay) + s.inc0.clay + recv.clay;
      afterArrived.iron = (s.base0.iron - sent.iron) + s.inc0.iron + recv.iron;
      afterArrived.total = afterArrived.wood + afterArrived.clay + afterArrived.iron;

      rows.push({
        id: vid,
        name: s.name,
        coord: s.coord,
        storage: s.storage,
        before: before,
        sent: sent,
        recv: recv,
        after: afterArrived,
      });
    });

    rows.sort(function (a, b) { return (b.storage || 0) - (a.storage || 0); });
    return rows;
  }

  Y.compute = {
    computeIncomingForSet: computeIncomingForSet,
    planBalance: planBalance,
    planPush: planPush,
    planFunnel: planFunnel,
    summarize: summarize,
  };

  Y.log('compute module loaded âœ…');
})();


(function () {
  'use strict';

  var Y = window.YRO_V26;
  if (!Y) return;

  function injectCSS() {
    if (document.getElementById(Y.cfg.STYLE_ID)) return;

    var css = `
/* ===== Panel (v7 parchment theme) ===== */
#${Y.cfg.PANEL_ID}{
  position:fixed; z-index:99999;
  width: fit-content;
  min-width: 600px;
  max-width: 98vw;

  max-height: 90vh;
  display:flex;
  flex-direction:column;
  overflow:hidden;

  background:#f4e4bc;
  border:2px solid #7d510f;
  box-shadow:0 8px 22px rgba(0,0,0,.25);
  font-family:Verdana,Arial,sans-serif;
  font-size:12px;
}
#${Y.cfg.PANEL_ID} *{ box-sizing:border-box; }

/* Header */
#${Y.cfg.PANEL_ID} .yro_hdr{
  display:flex; align-items:center; justify-content:space-between;
  background:#c1a264;
  color:#fff;
  padding:6px 8px;
  border-bottom:2px solid #7d510f;
}
#${Y.cfg.PANEL_ID} .yro_ttl{ font-weight:bold; display:flex; align-items:center; gap:6px; }
#${Y.cfg.PANEL_ID} .yro_small{ font-size:11px; opacity:.95; }
#${Y.cfg.PANEL_ID} .yro_dev{ font-size:11px; opacity:.95; margin-right:10px; }
#${Y.cfg.PANEL_ID} .yro_dev a{ color:#fff; text-decoration:none; font-weight:bold; }
#${Y.cfg.PANEL_ID} .yro_dev a:hover{ text-decoration:underline; }

/* Buttons */
#${Y.cfg.PANEL_ID} .yro_btn{
  padding:3px 8px;
  border:1px solid #7d510f;
  background:#f0e2be;
  cursor:pointer;
  border-radius:3px;
  font-weight:bold;
}
#${Y.cfg.PANEL_ID} .yro_btn:hover{ filter:brightness(1.03); }
#${Y.cfg.PANEL_ID} .btn-confirm{ background:#d9edc9; border-color:#3b6a3b; }
#${Y.cfg.PANEL_ID} .btn-warn{ background:#ffe2b7; border-color:#a66a00; }

/* Toolbar */
#${Y.cfg.PANEL_ID} .yro_toolbar{
  display:flex; align-items:center; gap:8px; flex-wrap:wrap;
  padding:6px 8px;
  border-bottom:1px solid #7d510f;
  background:#f0e2be;
}
#${Y.cfg.PANEL_ID} .yro_progress_outer{
  width:180px; height:10px;
  border:1px solid #7d510f;
  background:#fff5da;
  border-radius:10px; overflow:hidden;
}
#${Y.cfg.PANEL_ID} .yro_progress_inner{ height:100%; width:0%; background:#4f8b2d; }

/* Message bar */
#${Y.cfg.PANEL_ID} .yro_msg{
  padding:6px 8px;
  border-bottom:1px solid #7d510f;
  background:#fff5da;
}

/* Content scroll area */
#${Y.cfg.PANEL_ID} #yro_content_v26{
  padding:8px;
  flex:1;
  overflow-y:auto;
  overflow-x:auto;
  background:#f4e4bc;
}

/* Sections */
#${Y.cfg.PANEL_ID} .yro_sec_head{
  display:flex; align-items:center; justify-content:space-between;
  padding:6px 6px;
  background:#f0e2be;
  border:1px solid #7d510f;
  border-radius:6px;
  margin-top:8px;
  font-weight:bold;
}
#${Y.cfg.PANEL_ID} .yro_sec_controls{
  display:flex; align-items:center; gap:6px; flex-wrap:wrap;
  font-weight:normal;
}
#${Y.cfg.PANEL_ID} .yro_mini{
  padding:2px 6px;
  border:1px solid #7d510f;
  background:#fff5da;
  cursor:pointer;
  border-radius:3px;
}

#${Y.cfg.PANEL_ID} .yro_scroll{
  border:1px solid #7d510f;
  border-top:none;
  background:#fff5da;
}

#${Y.cfg.PANEL_ID} .yro_table{
  width:100%;
  border-collapse:collapse;
  background:#fff5da;
}
#${Y.cfg.PANEL_ID} .yro_table th, #${Y.cfg.PANEL_ID} .yro_table td{
  border:1px solid #7d510f;
  padding:3px 6px;
  white-space:nowrap;
}
#${Y.cfg.PANEL_ID} .yro_table th{
  background:#c1a264;
  color:#fff;
  position:sticky;
  top:0;
  z-index:2;
}
#${Y.cfg.PANEL_ID} .yro_right{ text-align:right; }
#${Y.cfg.PANEL_ID} .yro_center{ text-align:center; }

#${Y.cfg.PANEL_ID} .yro_table tr:nth-child(even) td{ background:#f0e2be; }
#${Y.cfg.PANEL_ID} .yro_total_row td{ background:#e8d5a1 !important; font-weight:bold; }

/* Modes box */
#${Y.cfg.PANEL_ID} .yro_mode_box{
  margin-top:8px;
  border:1px solid #7d510f;
  border-radius:8px;
  overflow:hidden;
  background:#fff5da;
}
#${Y.cfg.PANEL_ID} .yro_mode_row{
  display:flex; gap:10px;
  padding:8px;
  border-bottom:1px solid #7d510f;
  cursor:pointer;
}
#${Y.cfg.PANEL_ID} .yro_mode_row:last-child{ border-bottom:none; }
#${Y.cfg.PANEL_ID} .yro_mode_row.active{ background:#d9edc9; }
#${Y.cfg.PANEL_ID} .yro_mode_left{ flex:1; }
#${Y.cfg.PANEL_ID} .yro_mode_title{ font-weight:bold; margin-bottom:2px; }
#${Y.cfg.PANEL_ID} .yro_mode_desc{ color:#333; }
#${Y.cfg.PANEL_ID} .yro_mode_controls{
  display:flex; flex-wrap:wrap; gap:8px;
  align-items:flex-end; justify-content:flex-end;
  min-width: 540px;
}
#${Y.cfg.PANEL_ID} .yro_plan_diag{
  margin-top:6px;
}
#${Y.cfg.PANEL_ID} .yro_diag_line{
  margin:2px 0;
}
#${Y.cfg.PANEL_ID} .yro_table_tools{
  display:flex;
  align-items:center;
  gap:8px;
}
#${Y.cfg.PANEL_ID} .yro_kv{ display:flex; flex-direction:column; gap:2px; }
#${Y.cfg.PANEL_ID} .yro_kv label{ font-size:11px; opacity:.9; }
#${Y.cfg.PANEL_ID} input[type="number"]{ padding:2px 4px; }
#${Y.cfg.PANEL_ID} select{ padding:2px 4px; }

/* Scrollbar */
#${Y.cfg.PANEL_ID} ::-webkit-scrollbar { width: 12px; height: 12px; }
#${Y.cfg.PANEL_ID} ::-webkit-scrollbar-track { background: #f0e2be; border-radius: 4px; }
#${Y.cfg.PANEL_ID} ::-webkit-scrollbar-thumb {
  background: #7d510f;
  border-radius: 4px;
  border: 2px solid #f0e2be;
}
#${Y.cfg.PANEL_ID} ::-webkit-scrollbar-thumb:hover { background: #5c3a0b; }

/* Modal (global by overlay id) */
#${Y.cfg.PICKER_OVERLAY_ID}{
  position:fixed; left:0; top:0; right:0; bottom:0;
  background:rgba(0,0,0,.45);
  z-index:100000;
  display:flex;
  align-items:center;
  justify-content:center;
}
#${Y.cfg.PICKER_OVERLAY_ID} .yro_modal_box{
  width:min(900px, 95vw);
  max-height:85vh;
  display:flex;
  flex-direction:column;
  background:#f4e4bc;
  border:2px solid #7d510f;
  box-shadow:0 10px 30px rgba(0,0,0,.35);
}
#${Y.cfg.PICKER_OVERLAY_ID} .yro_modal_head{
  background:#c1a264;
  color:#fff;
  padding:8px 10px;
  display:flex;
  align-items:center;
  justify-content:space-between;
  font-weight:bold;
  border-bottom:2px solid #7d510f;
}
#${Y.cfg.PICKER_OVERLAY_ID} .yro_modal_body{
  padding:8px;
  overflow:auto;
  background:#fff5da;
}
#${Y.cfg.PICKER_OVERLAY_ID} .yro_modal_toolbar{
  display:flex; gap:8px; flex-wrap:wrap;
  align-items:center;
  margin-bottom:8px;
}
#${Y.cfg.PICKER_OVERLAY_ID} .yro_modal_list{
  width:100%;
  border-collapse:collapse;
}
#${Y.cfg.PICKER_OVERLAY_ID} .yro_modal_list th,
#${Y.cfg.PICKER_OVERLAY_ID} .yro_modal_list td{
  border:1px solid #7d510f;
  padding:4px 6px;
  white-space:nowrap;
}
#${Y.cfg.PICKER_OVERLAY_ID} .yro_modal_list th{
  background:#c1a264;
  color:#fff;
  position:sticky;
  top:0;
}
#${Y.cfg.PICKER_OVERLAY_ID} .yro_modal_foot{
  padding:8px 10px;
  background:#f0e2be;
  border-top:1px solid #7d510f;
  display:flex;
  justify-content:flex-end;
  gap:8px;
}
    `;

    var st = document.createElement('style');
    st.id = Y.cfg.STYLE_ID;
    st.textContent = css;
    document.head.appendChild(st);
  }

    function buildPanel() {
    injectCSS();

    var st = Y.state;

    var root = document.createElement('div');
    root.id = Y.cfg.PANEL_ID;
    root.style.left = (st.ui.left || 30) + 'px';
    root.style.top = (st.ui.top || 70) + 'px';

    root.innerHTML = `
<div class="yro_hdr" id="yro_drag_v26" style="cursor:move;">
  <div class="yro_ttl"><span class="icon header wood"></span> Resource Orchestrator <span class="yro_small">(v26)</span></div>
  <div style="display:flex; align-items:center;">
        <span class="yro_dev"><b>Developed by <a href="https://www.twstats.com/en1/index.php?page=player&id=315027" target="_blank" rel="noopener noreferrer">Controleng</a></b></span>
    <button class="yro_btn" id="yro_close_v26">X</button>
  </div>
</div>

<div class="yro_toolbar">
  <button class="yro_btn btn-confirm" id="yro_load_v26">Load / Refresh (Full Scan)</button>
  <div class="yro_progress_outer"><div class="yro_progress_inner" id="yro_prog_bar_v26"></div></div>
  <span id="yro_prog_txt_v26" class="yro_small">0/0 - Ready</span>

  <span class="yro_small"><b>Search:</b></span>
  <input type="text" id="yro_search_v26" placeholder="Village name..." style="width:180px;">

  <button class="yro_btn btn-confirm" id="yro_copy_bb_v26">Copy BBCode</button>
</div>

<div class="yro_msg" id="yro_msg_v26" style="color:#0a6;">Ready</div>

<div id="yro_content_v26">
  <div class="yro_sec_head">
    <div>1) Villages - Production (per hour + 24h) (<span id="yro_t1_title_v26">All villages</span>)</div>
    <div class="yro_sec_controls">
      <button class="yro_mini" id="yro_t1_toggle_v26">${st.ui.minimized1 ? 'Expand' : 'Minimize'}</button>
      <span class="yro_small"><b>Group:</b></span>
      <select id="yro_t1_group_sel_v26"></select>
      <button class="yro_mini" id="yro_t1_pick_v26">Pick...</button>
    </div>
  </div>
  <div class="yro_scroll" id="yro_t1_wrap_v26" style="${st.ui.minimized1 ? 'display:none;' : ''}">
    <table class="yro_table" id="yro_t1_tbl_v26"></table>
  </div>

  <div class="yro_sec_head">
    <div>2) Villages - Current + Incoming + Outgoing (per village) (<span id="yro_t2_title_v26">All villages</span>)</div>
    <div class="yro_sec_controls">
      <button class="yro_mini" id="yro_t2_toggle_v26">${st.ui.minimized2 ? 'Expand' : 'Minimize'}</button>
      <span class="yro_small"><b>Group:</b></span>
      <select id="yro_t2_group_sel_v26"></select>
      <button class="yro_mini" id="yro_t2_pick_v26">Pick...</button>
      <span class="yro_small" id="yro_scan_ts_v26"></span>
    </div>
  </div>
  <div class="yro_scroll" id="yro_t2_wrap_v26" style="${st.ui.minimized2 ? 'display:none;' : ''}">
    <table class="yro_table" id="yro_t2_tbl_v26"></table>
  </div>

  <div class="yro_sec_head">
    <div>3) Orchestrator - Versioned planning</div>
    <div class="yro_sec_controls"><span class="yro_small">Click a mode row to focus it.</span></div>
  </div>

  <div class="yro_mode_box" id="yro_modes_v26"></div>

  <div class="yro_msg" id="yro_plan_meta_v26" style="margin-top:8px;">
    <b>Mode:</b> - | <b>Computed Fill %:</b> - | <b>Cap Ceiling %:</b> - | <b>Surplus Cap %:</b> - | <b>Merch Used:</b> - | <b>Shipments:</b> 0 | <b>Warnings:</b> -
  </div>

  <div class="yro_msg yro_plan_diag" id="yro_plan_diag_v26">Diagnostics: -</div>

  <div class="yro_sec_head">
    <div id="yro_plan_target_title_v26">TARGET GROUP</div>
    <div class="yro_sec_controls yro_table_tools">
      <button class="yro_mini" id="yro_copy_plan_target_v26">Copy TARGET GROUP</button>
    </div>
  </div>
  <div class="yro_scroll">
    <table class="yro_table" id="yro_plan_target_tbl_v26"></table>
  </div>

  <div class="yro_sec_head">
    <div id="yro_plan_surplus_title_v26">SURPLUS</div>
    <div class="yro_sec_controls yro_table_tools">
      <button class="yro_mini" id="yro_copy_plan_surplus_v26">Copy SURPLUS</button>
    </div>
  </div>
  <div class="yro_scroll" style="margin-top:8px;">
    <table class="yro_table" id="yro_plan_surplus_tbl_v26"></table>
  </div>

  <div class="yro_sec_head">
    <div id="yro_plan_ship_title_v26">SHIPMENTS</div>
    <div class="yro_sec_controls yro_table_tools">
      <button class="yro_mini" id="yro_copy_plan_ship_v26">Copy SHIPMENTS</button>
    </div>
  </div>
  <div class="yro_scroll" style="margin-top:8px;">
    <table class="yro_table" id="yro_plan_ship_tbl_v26"></table>
  </div>
</div>
    `;

    document.body.appendChild(root);
    return root;
  }

  function setMsg(text, color) {
    var el = Y.qs('#yro_msg_v26');
    if (!el) return;
    el.textContent = text;
    if (color) el.style.color = color;
  }

  function setProgress(step, total, text) {
    var bar = Y.qs('#yro_prog_bar_v26');
    var tx = Y.qs('#yro_prog_txt_v26');
    if (!bar || !tx) return;
    var pct = total ? Math.round((step / total) * 100) : 0;
    bar.style.width = pct + '%';
    tx.textContent = step + '/' + total + ' - ' + text;
  }

  function fillGroupSelects(groups) {
    groups = Array.isArray(groups) ? groups : [];
    var st = Y.state;

    function fill(selId, selected) {
      var sel = Y.qs(selId);
      if (!sel) return;
      sel.innerHTML = '';
      if (!groups.length) {
        var o0 = document.createElement('option');
        o0.value = '0';
        o0.textContent = 'All villages';
        sel.appendChild(o0);
        return;
      }
      groups.forEach(function (g) {
        var o = document.createElement('option');
        o.value = String(g.id);
        o.textContent = g.name;
        if (String(g.id) === String(selected)) o.selected = true;
        sel.appendChild(o);
      });
    }

    fill('#yro_t1_group_sel_v26', st.groups.sel1);
    fill('#yro_t2_group_sel_v26', st.groups.sel2);
  }

    function buildModesBox(groups) {
    groups = Array.isArray(groups) ? groups : [];
    var st = Y.state;

    function esc(s) {
      return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }
    function optionsHTML(selectedId) {
      if (!groups.length) return '<option value="0">All villages</option>';
      return groups.map(function (g) {
        var sel = String(g.id) === String(selectedId) ? ' selected' : '';
        return '<option value="' + g.id + '"' + sel + '>' + esc(g.name) + '</option>';
      }).join('');
    }

    var wrap = Y.qs('#yro_modes_v26');
    if (!wrap) return;

    wrap.innerHTML = `
<div class="yro_mode_row ${st.orchestrator.mode === 'balance' ? 'active' : ''}" data-mode="balance">
  <div class="yro_mode_left">
    <div class="yro_mode_title">Mode A: Internal Equalizer</div>
    <div class="yro_mode_desc">Target group rebalances internally to the highest feasible common fill. Surplus last.</div>
  </div>
  <div class="yro_mode_controls">
    <div class="yro_kv"><label>Target</label><select id="yro_A_target_v26">${optionsHTML(st.groups.A_target)}</select></div>
    <button class="yro_mini" id="pick_A_target_v26">Pick...</button>
    <div class="yro_kv"><label>Surplus</label><select id="yro_A_surplus_v26">${optionsHTML(st.groups.A_surplus)}</select></div>
    <button class="yro_mini" id="pick_A_surplus_v26">Pick...</button>
    <div class="yro_kv"><label>Cap%</label><input id="yro_A_cap_v26" type="number" min="1" max="100" step="1" value="${st.modeA.capPct}" style="width:60px;"></div>
    <div class="yro_kv"><label>Surplus Cap%</label><input id="yro_A_scap_v26" type="number" min="1" max="100" step="1" value="${st.modeA.surplusCapPct}" style="width:60px;"></div>
    <div class="yro_kv"><label>Computed Fill %</label><input id="yro_A_computed_fill_v26" type="number" value="" style="width:78px;" disabled></div>
    <div class="yro_kv"><label>Merch Used</label><input id="yro_A_merch_used_v26" type="number" value="" style="width:70px;" disabled></div>
    <button class="yro_btn btn-confirm" id="yro_A_plan_v26">Plan</button>
    <button class="yro_btn btn-confirm" id="yro_A_exec_v26">Execute</button>
  </div>
</div>

<div class="yro_mode_row ${st.orchestrator.mode === 'push' ? 'active' : ''}" data-mode="push">
  <div class="yro_mode_left">
    <div class="yro_mode_title">Mode B: Parents -> Children</div>
    <div class="yro_mode_desc">Children rebalance with current stock first, Parents fill the remaining gaps, Surplus last.</div>
  </div>
  <div class="yro_mode_controls">
    <div class="yro_kv"><label>Parents</label><select id="yro_B_parents_v26">${optionsHTML(st.groups.B_parents)}</select></div>
    <button class="yro_mini" id="pick_B_parents_v26">Pick...</button>
    <div class="yro_kv"><label>Children</label><select id="yro_B_children_v26">${optionsHTML(st.groups.B_children)}</select></div>
    <button class="yro_mini" id="pick_B_children_v26">Pick...</button>
    <div class="yro_kv"><label>Surplus</label><select id="yro_B_surplus_v26">${optionsHTML(st.groups.B_surplus)}</select></div>
    <button class="yro_mini" id="pick_B_surplus_v26">Pick...</button>
    <div class="yro_kv"><label>Parent Reserve %</label><input id="yro_B_parent_reserve_v26" type="number" min="0" max="100" step="1" value="${st.modeB.parentReservePct}" style="width:70px;"></div>
    <div class="yro_kv"><label>Children Max Fill %</label><input id="yro_B_child_max_v26" type="number" min="0" max="100" step="1" value="${st.modeB.childrenMaxFillPct}" style="width:78px;"></div>
    <div class="yro_kv"><label>Surplus Cap %</label><input id="yro_B_scap_v26" type="number" min="0" max="100" step="1" value="${st.modeB.surplusCapPct}" style="width:70px;"></div>
    <div class="yro_kv"><label>Computed Child Fill %</label><input id="yro_B_computed_fill_v26" type="number" value="" style="width:78px;" disabled></div>
    <div class="yro_kv"><label>Child Merch Used</label><input id="yro_B_child_merch_v26" type="number" value="" style="width:70px;" disabled></div>
    <div class="yro_kv"><label>Parent Merch Used</label><input id="yro_B_parent_merch_v26" type="number" value="" style="width:78px;" disabled></div>
    <button class="yro_btn btn-confirm" id="yro_B_plan_v26">Plan</button>
    <button class="yro_btn btn-confirm" id="yro_B_exec_v26">Execute</button>
  </div>
</div>

<div class="yro_mode_row ${st.orchestrator.mode === 'funnel' ? 'active' : ''}" data-mode="funnel">
  <div class="yro_mode_left">
    <div class="yro_mode_title">Mode C: Funnel / Hoard</div>
    <div class="yro_mode_desc">Everyone outside Target sends into Target, leftovers into Surplus.</div>
  </div>
  <div class="yro_mode_controls">
    <div class="yro_kv"><label>Target</label><select id="yro_C_target_v26">${optionsHTML(st.groups.C_target)}</select></div>
    <button class="yro_mini" id="pick_C_target_v26">Pick...</button>
    <div class="yro_kv"><label>Surplus</label><select id="yro_C_surplus_v26">${optionsHTML(st.groups.C_surplus)}</select></div>
    <button class="yro_mini" id="pick_C_surplus_v26">Pick...</button>
    <div class="yro_kv"><label>Reserve%</label><input id="yro_C_reserve_v26" type="number" min="0" max="100" step="1" value="${st.modeC.reservePct}" style="width:60px;"></div>
    <div class="yro_kv"><label>Cap%</label><input id="yro_C_cap_v26" type="number" min="1" max="100" step="1" value="${st.modeC.capPct}" style="width:60px;"></div>
    <div class="yro_kv"><label>Surplus Cap%</label><input id="yro_C_scap_v26" type="number" min="1" max="100" step="1" value="${st.modeC.surplusCapPct}" style="width:60px;"></div>
    <div class="yro_kv"><label>Tolerance%</label><input id="yro_C_tol_v26" type="number" min="0" max="25" step="1" value="5" style="width:60px;"></div>
    <div class="yro_kv"><label>Iron Delta%</label><input id="yro_C_iron_v26" type="number" min="-50" max="50" step="1" value="${st.modeC.ironDeltaPct == null ? '' : st.modeC.ironDeltaPct}" style="width:70px;"></div>
    <button class="yro_btn btn-confirm" id="yro_C_plan_v26">Plan</button>
    <button class="yro_btn btn-confirm" id="yro_C_exec_v26">Execute</button>
  </div>
</div>
    `;
  }

  function enableDrag(panel) {
    var st = Y.state;
    var hdr = Y.qs('#yro_drag_v26');
    if (!hdr || !panel) return;

    var dragging = false, startX = 0, startY = 0, startL = 0, startT = 0;

    Y.on(hdr, 'mousedown', function (e) {
      if (e.target && e.target.id === 'yro_close_v26') return;
      dragging = true;
      startX = e.clientX; startY = e.clientY;
      startL = panel.offsetLeft; startT = panel.offsetTop;
      e.preventDefault();
    });

    Y.on(document, 'mousemove', function (e) {
      if (!dragging) return;
      panel.style.left = (startL + (e.clientX - startX)) + 'px';
      panel.style.top = (startT + (e.clientY - startY)) + 'px';
    });

    Y.on(document, 'mouseup', function () {
      if (!dragging) return;
      dragging = false;
      st.ui.left = panel.offsetLeft;
      st.ui.top = panel.offsetTop;
      Y.saveState();
    });
  }

  function buildPickerModal(candidates, currentSelection, onSaveCallback) {
    candidates = Array.isArray(candidates) ? candidates : [];
    var selected = new Set((currentSelection || []).map(function (x) { return String(x); }));

    var overlay = document.createElement('div');
    overlay.id = Y.cfg.PICKER_OVERLAY_ID;

    var box = document.createElement('div');
    box.className = 'yro_modal_box';

    box.innerHTML = `
<div class="yro_modal_head">
  <div>Pick villages (checkbox)</div>
  <button class="yro_btn" id="yro_picker_close_v26">âœ–</button>
</div>
<div class="yro_modal_body">
  <div class="yro_modal_toolbar">
    <span class="yro_small"><b>Search:</b></span>
    <input type="text" id="yro_picker_search_v26" style="width:220px;" placeholder="name / coord">
    <button class="yro_btn" id="yro_picker_all_v26">Select all</button>
    <button class="yro_btn" id="yro_picker_none_v26">Select none</button>
    <span class="yro_small" id="yro_picker_count_v26"></span>
  </div>
  <table class="yro_modal_list" id="yro_picker_tbl_v26">
    <tr><th></th><th>Village</th><th>Coord</th><th class="yro_right">Storage</th></tr>
  </table>
</div>
<div class="yro_modal_foot">
  <button class="yro_btn" id="yro_picker_cancel_v26">Cancel</button>
  <button class="yro_btn btn-confirm" id="yro_picker_save_v26">Kaydet</button>
</div>
    `;

    overlay.appendChild(box);
    document.body.appendChild(overlay);

    function updateCount() {
      var el = box.querySelector('#yro_picker_count_v26');
      if (el) el.textContent = 'Selected: ' + selected.size;
    }

    function renderList(filterText) {
      filterText = String(filterText || '').toLowerCase();
      var tbl = box.querySelector('#yro_picker_tbl_v26');
      if (!tbl) return;

      tbl.innerHTML = `<tr><th></th><th>Village</th><th>Coord</th><th class="yro_right">Storage</th></tr>`;

      var shown = 0;
      candidates.forEach(function (v) {
        var name = String(v.name || '');
        var coord = String(v.coord || '');
        var storage = Y.safeInt(v.storage, 0);

        var hay = (name + ' ' + coord).toLowerCase();
        if (filterText && hay.indexOf(filterText) < 0) return;

        shown++;

        var tr = document.createElement('tr');
        tr.innerHTML = `
<td class="yro_center"><input type="checkbox" data-vid="${v.id}"></td>
<td><b>${name}</b></td>
<td>${coord}</td>
<td class="yro_right">${Y.formatTwNumber(storage)}</td>
        `;
        var cb = tr.querySelector('input[type="checkbox"]');
        cb.checked = selected.has(String(v.id));
        cb.addEventListener('change', function () {
          var k = String(v.id);
          if (cb.checked) selected.add(k); else selected.delete(k);
          updateCount();
        });

        tbl.appendChild(tr);
      });

      if (!shown) {
        var tr0 = document.createElement('tr');
        tr0.innerHTML = `<td colspan="4">No match.</td>`;
        tbl.appendChild(tr0);
      }

      updateCount();
    }

    function close() {
      if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
    }

    box.querySelector('#yro_picker_close_v26').addEventListener('click', close);
    box.querySelector('#yro_picker_cancel_v26').addEventListener('click', close);

    box.querySelector('#yro_picker_all_v26').addEventListener('click', function () {
      candidates.forEach(function (v) { selected.add(String(v.id)); });
      renderList(box.querySelector('#yro_picker_search_v26').value);
    });

    box.querySelector('#yro_picker_none_v26').addEventListener('click', function () {
      selected.clear();
      renderList(box.querySelector('#yro_picker_search_v26').value);
    });

    box.querySelector('#yro_picker_save_v26').addEventListener('click', function () {
      var ids = Array.from(selected).map(function (s) { return Y.safeInt(s, 0); }).filter(Boolean);
      try { onSaveCallback(ids); } catch (e) {}
      close();
    });

    box.querySelector('#yro_picker_search_v26').addEventListener('input', Y.debounce(function (e) {
      renderList(e.target.value);
    }, 120));

    candidates = candidates.slice().sort(function (a, b) {
      return String(a.name || '').localeCompare(String(b.name || ''));
    });
    renderList('');
  }

  function renderTable1(villageIds) {
    var st = Y.state;
    var q = (st.ui.search || '').toLowerCase();

    var rows = [];
    (villageIds || []).forEach(function (vid) {
      var s = Y.runtime.snapshotsById[vid];
      if (!s) return;
      if (q && String(s.name).toLowerCase().indexOf(q) < 0) return;
      rows.push(s);
    });
    rows.sort(function (a, b) { return String(a.name).localeCompare(String(b.name)); });

    var tbl = Y.qs('#yro_t1_tbl_v26');
    if (!tbl) return;

    var sumWH = 0, sumCH = 0, sumIH = 0;
    var sumW24 = 0, sumC24 = 0, sumI24 = 0;

    var html = `
<tr>
  <th>Village</th>
  <th class="yro_right">Storage</th>
  <th class="yro_center">Merch (free/total)</th>
  <th class="yro_right"><span class="icon header wood"></span> /h</th>
  <th class="yro_right"><span class="icon header stone"></span> /h</th>
  <th class="yro_right"><span class="icon header iron"></span> /h</th>
  <th class="yro_right">/h Total</th>
  <th class="yro_right"><span class="icon header wood"></span> 24h</th>
  <th class="yro_right"><span class="icon header stone"></span> 24h</th>
  <th class="yro_right"><span class="icon header iron"></span> 24h</th>
  <th class="yro_right">24h Total</th>
</tr>`;

    if (!rows.length) {
      html += `<tr><td colspan="11">No villages.</td></tr>`;
    } else {
      rows.forEach(function (v) {
        sumWH += v.prodH.wood; sumCH += v.prodH.clay; sumIH += v.prodH.iron;
        sumW24 += v.prod24.wood; sumC24 += v.prod24.clay; sumI24 += v.prod24.iron;

        var href = '/game.php?village=' + v.id + '&screen=overview';
        html += `
<tr>
  <td><a href="${href}" target="_blank" rel="noopener noreferrer"><b>${String(v.name)}</b></a></td>
  <td class="yro_right">${Y.formatTwNumber(v.storage)}</td>
  <td class="yro_center">${Y.formatTwNumber(v.merch.free)}/${Y.formatTwNumber(v.merch.total)}</td>
  <td class="yro_right"><b>${Y.formatTwNumber(v.prodH.wood)}</b></td>
  <td class="yro_right"><b>${Y.formatTwNumber(v.prodH.clay)}</b></td>
  <td class="yro_right"><b>${Y.formatTwNumber(v.prodH.iron)}</b></td>
  <td class="yro_right"><b>${Y.formatTwNumber(v.prodH.total)}</b></td>
  <td class="yro_right">${Y.formatTwNumber(v.prod24.wood)}</td>
  <td class="yro_right">${Y.formatTwNumber(v.prod24.clay)}</td>
  <td class="yro_right">${Y.formatTwNumber(v.prod24.iron)}</td>
  <td class="yro_right"><b>${Y.formatTwNumber(v.prod24.total)}</b></td>
</tr>`;
      });

      html += `
<tr class="yro_total_row">
  <td><b>TOTAL</b> <span class="yro_small">(${rows.length} villages)</span></td>
  <td></td>
  <td></td>
  <td class="yro_right"><b>${Y.formatTwNumber(sumWH)}</b></td>
  <td class="yro_right"><b>${Y.formatTwNumber(sumCH)}</b></td>
  <td class="yro_right"><b>${Y.formatTwNumber(sumIH)}</b></td>
  <td class="yro_right"><b>${Y.formatTwNumber(sumWH + sumCH + sumIH)}</b></td>
  <td class="yro_right"><b>${Y.formatTwNumber(sumW24)}</b></td>
  <td class="yro_right"><b>${Y.formatTwNumber(sumC24)}</b></td>
  <td class="yro_right"><b>${Y.formatTwNumber(sumI24)}</b></td>
  <td class="yro_right"><b>${Y.formatTwNumber(sumW24 + sumC24 + sumI24)}</b></td>
</tr>`;
    }

    tbl.innerHTML = html;
  }

  function renderTable2(villageIds, incomingAllByVid, incomingExternalByVid, outgoingByVid) {
    var st = Y.state;
    var q = (st.ui.search || '').toLowerCase();

    var rows = [];
    (villageIds || []).forEach(function (vid) {
      var s = Y.runtime.snapshotsById[vid];
      if (!s) return;
      if (q && String(s.name).toLowerCase().indexOf(q) < 0) return;

      var incAll = incomingAllByVid && incomingAllByVid[vid] ? incomingAllByVid[vid] : { wood: 0, clay: 0, iron: 0, total: 0 };
      var incExt = incomingExternalByVid && incomingExternalByVid[vid] ? incomingExternalByVid[vid] : { wood: 0, clay: 0, iron: 0, total: 0 };
      var out = outgoingByVid && outgoingByVid[vid] ? outgoingByVid[vid] : { wood: 0, clay: 0, iron: 0, total: 0 };

      rows.push({ snap: s, incAll: incAll, incExt: incExt, out: out });
    });

    rows.sort(function (a, b) { return String(a.snap.name).localeCompare(String(b.snap.name)); });

    var tbl = Y.qs('#yro_t2_tbl_v26');
    if (!tbl) return;

    var totals = {
      storage: 0,
      merchFree: 0,
      merchTotal: 0,
      nowW: 0, nowC: 0, nowI: 0, nowT: 0,
      inW: 0, inC: 0, inI: 0, inT: 0,
      outW: 0, outC: 0, outI: 0, outT: 0,
      effT: 0,
      extT: 0
    };

    var html = `
<tr>
  <th>Village</th>
  <th class="yro_right">Storage</th>
  <th class="yro_center">Merch (free/total)</th>

  <th class="yro_right"><span class="icon header wood"></span> Now</th>
  <th class="yro_right"><span class="icon header stone"></span> Now</th>
  <th class="yro_right"><span class="icon header iron"></span> Now</th>
  <th class="yro_right">Now Total</th>

  <th class="yro_right"><span class="icon header wood"></span> Incoming</th>
  <th class="yro_right"><span class="icon header stone"></span> Incoming</th>
  <th class="yro_right"><span class="icon header iron"></span> Incoming</th>
  <th class="yro_right">In Total</th>

  <th class="yro_right"><span class="icon header wood"></span> Out</th>
  <th class="yro_right"><span class="icon header stone"></span> Out</th>
  <th class="yro_right"><span class="icon header iron"></span> Out</th>
  <th class="yro_right">Out Total</th>

  <th class="yro_right">Eff (Now+In)</th>
  <th class="yro_right">In External</th>
</tr>`;

    if (!rows.length) {
      html += `<tr><td colspan="17">No villages.</td></tr>`;
    } else {
      rows.forEach(function (r) {
        var v = r.snap;
        var now = v.resNow;
        var effTotal = (now.total || 0) + (r.incAll.total || 0);

        totals.storage += v.storage || 0;
        totals.merchFree += v.merch.free || 0;
        totals.merchTotal += v.merch.total || 0;

        totals.nowW += now.wood || 0;
        totals.nowC += now.clay || 0;
        totals.nowI += now.iron || 0;
        totals.nowT += now.total || 0;

        totals.inW += r.incAll.wood || 0;
        totals.inC += r.incAll.clay || 0;
        totals.inI += r.incAll.iron || 0;
        totals.inT += r.incAll.total || 0;

        totals.outW += r.out.wood || 0;
        totals.outC += r.out.clay || 0;
        totals.outI += r.out.iron || 0;
        totals.outT += r.out.total || 0;

        totals.effT += effTotal;
        totals.extT += r.incExt.total || 0;

        var href = '/game.php?village=' + v.id + '&screen=overview';
        html += `
<tr title="Incoming External: W ${Y.formatTwNumber(r.incExt.wood)} / C ${Y.formatTwNumber(r.incExt.clay)} / I ${Y.formatTwNumber(r.incExt.iron)}">
  <td><a href="${href}" target="_blank" rel="noopener noreferrer"><b>${String(v.name)}</b></a></td>
  <td class="yro_right">${Y.formatTwNumber(v.storage)}</td>
  <td class="yro_center">${Y.formatTwNumber(v.merch.free)}/${Y.formatTwNumber(v.merch.total)}</td>

  <td class="yro_right">${Y.formatTwNumber(now.wood)}</td>
  <td class="yro_right">${Y.formatTwNumber(now.clay)}</td>
  <td class="yro_right">${Y.formatTwNumber(now.iron)}</td>
  <td class="yro_right"><b>${Y.formatTwNumber(now.total)}</b></td>

  <td class="yro_right"><b>${Y.formatTwNumber(r.incAll.wood)}</b></td>
  <td class="yro_right"><b>${Y.formatTwNumber(r.incAll.clay)}</b></td>
  <td class="yro_right"><b>${Y.formatTwNumber(r.incAll.iron)}</b></td>
  <td class="yro_right"><b>${Y.formatTwNumber(r.incAll.total)}</b></td>

  <td class="yro_right">${Y.formatTwNumber(r.out.wood)}</td>
  <td class="yro_right">${Y.formatTwNumber(r.out.clay)}</td>
  <td class="yro_right">${Y.formatTwNumber(r.out.iron)}</td>
  <td class="yro_right">${Y.formatTwNumber(r.out.total)}</td>

  <td class="yro_right"><b>${Y.formatTwNumber(effTotal)}</b></td>
  <td class="yro_right">${Y.formatTwNumber(r.incExt.total)}</td>
</tr>`;
      });

      html += `
<tr class="yro_total_row">
  <td><b>TOTAL</b> <span class="yro_small">(${rows.length} villages)</span></td>
  <td class="yro_right">${Y.formatTwNumber(totals.storage)}</td>
  <td class="yro_center">${Y.formatTwNumber(totals.merchFree)}/${Y.formatTwNumber(totals.merchTotal)}</td>

  <td class="yro_right">${Y.formatTwNumber(totals.nowW)}</td>
  <td class="yro_right">${Y.formatTwNumber(totals.nowC)}</td>
  <td class="yro_right">${Y.formatTwNumber(totals.nowI)}</td>
  <td class="yro_right"><b>${Y.formatTwNumber(totals.nowT)}</b></td>

  <td class="yro_right">${Y.formatTwNumber(totals.inW)}</td>
  <td class="yro_right">${Y.formatTwNumber(totals.inC)}</td>
  <td class="yro_right">${Y.formatTwNumber(totals.inI)}</td>
  <td class="yro_right"><b>${Y.formatTwNumber(totals.inT)}</b></td>

  <td class="yro_right">${Y.formatTwNumber(totals.outW)}</td>
  <td class="yro_right">${Y.formatTwNumber(totals.outC)}</td>
  <td class="yro_right">${Y.formatTwNumber(totals.outI)}</td>
  <td class="yro_right"><b>${Y.formatTwNumber(totals.outT)}</b></td>

  <td class="yro_right"><b>${Y.formatTwNumber(totals.effT)}</b></td>
  <td class="yro_right">${Y.formatTwNumber(totals.extT)}</td>
</tr>`;
    }

    tbl.innerHTML = html;

    var ts = Y.qs('#yro_scan_ts_v26');
    if (ts) ts.textContent = 'Last scan: ' + (Y.state.cache.lastFullScanAt ? new Date(Y.state.cache.lastFullScanAt).toLocaleTimeString() : '-');
  }

    function escHtml(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function renderPlanTables(plan, snapshotsById) {
    var metaEl = Y.qs('#yro_plan_meta_v26');
    var diagEl = Y.qs('#yro_plan_diag_v26');
    var tTbl = Y.qs('#yro_plan_target_tbl_v26');
    var sTbl = Y.qs('#yro_plan_surplus_tbl_v26');
    var shTbl = Y.qs('#yro_plan_ship_tbl_v26');
    var targetTitleEl = Y.qs('#yro_plan_target_title_v26');
    var surplusTitleEl = Y.qs('#yro_plan_surplus_title_v26');
    var shipTitleEl = Y.qs('#yro_plan_ship_title_v26');
    var copyTargetEl = Y.qs('#yro_copy_plan_target_v26');
    var copySurplusEl = Y.qs('#yro_copy_plan_surplus_v26');
    var copyShipEl = Y.qs('#yro_copy_plan_ship_v26');

    function renderEmpty() {
      var modeAFillEl = Y.qs('#yro_A_computed_fill_v26');
      var modeAMerchEl = Y.qs('#yro_A_merch_used_v26');
      var modeBFillEl = Y.qs('#yro_B_computed_fill_v26');
      var modeBChildMerchEl = Y.qs('#yro_B_child_merch_v26');
      var modeBParentMerchEl = Y.qs('#yro_B_parent_merch_v26');
      if (metaEl) metaEl.innerHTML = '<b>Mode:</b> - | <b>Computed Fill %:</b> - | <b>Cap Ceiling %:</b> - | <b>Surplus Cap %:</b> - | <b>Merch Used:</b> - | <b>Shipments:</b> 0 | <b>Warnings:</b> -';
      if (diagEl) diagEl.innerHTML = 'Diagnostics: -';
      if (tTbl) tTbl.innerHTML = '<tr><td>No plan.</td></tr>';
      if (sTbl) sTbl.innerHTML = '<tr><td>No plan.</td></tr>';
      if (shTbl) shTbl.innerHTML = '<tr><td>No shipments.</td></tr>';
      if (modeAFillEl) modeAFillEl.value = '';
      if (modeAMerchEl) modeAMerchEl.value = '';
      if (modeBFillEl) modeBFillEl.value = '';
      if (modeBChildMerchEl) modeBChildMerchEl.value = '';
      if (modeBParentMerchEl) modeBParentMerchEl.value = '';
      if (targetTitleEl) targetTitleEl.textContent = 'TARGET GROUP';
      if (surplusTitleEl) surplusTitleEl.textContent = 'SURPLUS';
      if (shipTitleEl) shipTitleEl.textContent = 'SHIPMENTS';
      if (copyTargetEl) copyTargetEl.textContent = 'Copy TARGET GROUP';
      if (copySurplusEl) copySurplusEl.textContent = 'Copy SURPLUS';
      if (copyShipEl) copyShipEl.textContent = 'Copy SHIPMENTS';
    }

    if (!plan || !plan.meta) {
      renderEmpty();
      return;
    }

    if (String(plan.mode || '').toLowerCase() === 'balance' && plan.targetSummary) {
      var warningsA = Array.isArray(plan.meta.warnings) ? plan.meta.warnings.filter(Boolean) : [];
      if (metaEl) {
        metaEl.innerHTML =
          '<b>Mode:</b> INTERNAL EQUALIZER | ' +
          '<b>Computed Fill %:</b> ' + Y.formatTwNumber(plan.meta.computedFillPct || 0) + ' | ' +
          '<b>Cap Ceiling %:</b> ' + Y.formatTwNumber(plan.meta.capPct || 0) + ' | ' +
          '<b>Surplus Cap %:</b> ' + Y.formatTwNumber(plan.meta.surplusCapPct || 0) + ' | ' +
          '<b>Merch Used:</b> ' + Y.formatTwNumber(plan.meta.merchantsUsed || 0) + ' | ' +
          '<b>Shipments:</b> ' + ((plan.shipments || []).length) + ' | ' +
          '<b>Warnings:</b> ' + (warningsA.length ? escHtml(warningsA.join(' | ')) : '-');
      }
      if (diagEl) {
        var diagLinesA = plan.meta.diagnostics && Array.isArray(plan.meta.diagnostics.lines) ? plan.meta.diagnostics.lines.filter(Boolean) : [];
        diagEl.innerHTML = diagLinesA.length
          ? diagLinesA.map(function (line) { return '<div class="yro_diag_line">- ' + escHtml(line) + '</div>'; }).join('')
          : 'Diagnostics: -';
      }
      var modeAFillEl = Y.qs('#yro_A_computed_fill_v26');
      var modeAMerchEl = Y.qs('#yro_A_merch_used_v26');
      var computedFillEl0 = Y.qs('#yro_B_computed_fill_v26');
      var childMerchEl0 = Y.qs('#yro_B_child_merch_v26');
      var parentMerchEl0 = Y.qs('#yro_B_parent_merch_v26');
      if (modeAFillEl) modeAFillEl.value = plan.meta.computedFillPct != null ? plan.meta.computedFillPct : '';
      if (modeAMerchEl) modeAMerchEl.value = plan.meta.merchantsUsed != null ? plan.meta.merchantsUsed : '';
      if (computedFillEl0) computedFillEl0.value = '';
      if (childMerchEl0) childMerchEl0.value = '';
      if (parentMerchEl0) parentMerchEl0.value = '';
      if (targetTitleEl) targetTitleEl.textContent = 'TARGET GROUP';
      if (surplusTitleEl) surplusTitleEl.textContent = 'SURPLUS';
      if (shipTitleEl) shipTitleEl.textContent = 'SHIPMENTS';
      if (copyTargetEl) copyTargetEl.textContent = 'Copy TARGET GROUP';
      if (copySurplusEl) copySurplusEl.textContent = 'Copy SURPLUS';
      if (copyShipEl) copyShipEl.textContent = 'Copy SHIPMENTS';

      function buildModeATargetTable(rows) {
        var html = `
<tr><th colspan="11">TARGET GROUP</th></tr>
<tr>
  <th>Village</th>
  <th class="yro_right">Storage</th>
  <th class="yro_right">Target Each</th>
  <th class="yro_right">Before</th>
  <th class="yro_right">Sent</th>
  <th class="yro_right">Recv</th>
  <th class="yro_right">After</th>
  <th class="yro_right"><span class="icon header wood"></span></th>
  <th class="yro_right"><span class="icon header stone"></span></th>
  <th class="yro_right"><span class="icon header iron"></span></th>
  <th class="yro_right">Merch Used</th>
</tr>`;
        if (!rows.length) return html + '<tr><td colspan="11">-</td></tr>';
        rows.forEach(function (r) {
          html += `
<tr>
  <td><b>${escHtml(String(r.name))}</b></td>
  <td class="yro_right">${Y.formatTwNumber(r.storage)}</td>
  <td class="yro_right">${Y.formatTwNumber(r.targetEach || 0)}</td>
  <td class="yro_right">${Y.formatTwNumber(r.before.total)}</td>
  <td class="yro_right">${Y.formatTwNumber(r.sent.total)}</td>
  <td class="yro_right">${Y.formatTwNumber(r.recv.total)}</td>
  <td class="yro_right"><b>${Y.formatTwNumber(r.after.total)}</b></td>
  <td class="yro_right">${Y.formatTwNumber(r.after.wood)}</td>
  <td class="yro_right">${Y.formatTwNumber(r.after.clay)}</td>
  <td class="yro_right">${Y.formatTwNumber(r.after.iron)}</td>
  <td class="yro_right">${Y.formatTwNumber(r.merchUsed || 0)}</td>
</tr>`;
        });
        return html;
      }

      function buildModeASurplusTable(rows) {
        var html = `
<tr><th colspan="10">SURPLUS</th></tr>
<tr>
  <th>Village</th>
  <th class="yro_right">Storage</th>
  <th class="yro_right">Cap Each</th>
  <th class="yro_right">Before</th>
  <th class="yro_right">Sent</th>
  <th class="yro_right">Recv</th>
  <th class="yro_right">After</th>
  <th class="yro_right"><span class="icon header wood"></span></th>
  <th class="yro_right"><span class="icon header stone"></span></th>
  <th class="yro_right"><span class="icon header iron"></span></th>
</tr>`;
        if (!rows.length) return html + '<tr><td colspan="10">-</td></tr>';
        rows.forEach(function (r) {
          html += `
<tr>
  <td><b>${escHtml(String(r.name))}</b></td>
  <td class="yro_right">${Y.formatTwNumber(r.storage)}</td>
  <td class="yro_right">${Y.formatTwNumber(r.capEach || 0)}</td>
  <td class="yro_right">${Y.formatTwNumber(r.before.total)}</td>
  <td class="yro_right">${Y.formatTwNumber(r.sent.total)}</td>
  <td class="yro_right">${Y.formatTwNumber(r.recv.total)}</td>
  <td class="yro_right"><b>${Y.formatTwNumber(r.after.total)}</b></td>
  <td class="yro_right">${Y.formatTwNumber(r.after.wood)}</td>
  <td class="yro_right">${Y.formatTwNumber(r.after.clay)}</td>
  <td class="yro_right">${Y.formatTwNumber(r.after.iron)}</td>
</tr>`;
        });
        return html;
      }

      if (tTbl) tTbl.innerHTML = buildModeATargetTable(plan.targetSummary || []);
      if (sTbl) sTbl.innerHTML = buildModeASurplusTable(plan.surplusSummary || []);
    } else if (String(plan.mode || '').toLowerCase() === 'push' && plan.childSummary && plan.parentSummary) {
      var warnings = Array.isArray(plan.meta.warnings) ? plan.meta.warnings.filter(Boolean) : [];
      if (metaEl) {
        metaEl.innerHTML =
          '<b>Mode:</b> PARENTS -> CHILDREN | ' +
          '<b>Computed Fill %:</b> ' + Y.formatTwNumber(plan.meta.computedChildFillPct || 0) + ' | ' +
          '<b>Children Max Fill %:</b> ' + Y.formatTwNumber(plan.meta.childrenMaxFillPct || 0) + ' | ' +
          '<b>Parent Reserve %:</b> ' + Y.formatTwNumber(plan.meta.parentReservePct || 0) + ' | ' +
          '<b>Surplus Cap %:</b> ' + Y.formatTwNumber(plan.meta.surplusCapPct || 0) + ' | ' +
          '<b>Child Merch Used:</b> ' + Y.formatTwNumber(plan.meta.childMerchantsUsed || 0) + ' | ' +
          '<b>Parent Merch Used:</b> ' + Y.formatTwNumber(plan.meta.parentMerchantsUsed || 0) + ' | ' +
          '<b>Shipments:</b> ' + ((plan.shipments || []).length) + ' | ' +
          '<b>Warnings:</b> ' + (warnings.length ? escHtml(warnings.join(' | ')) : '-');
      }
      if (diagEl) {
        var diagLines = plan.meta.diagnostics && Array.isArray(plan.meta.diagnostics.lines) ? plan.meta.diagnostics.lines.filter(Boolean) : [];
        diagEl.innerHTML = diagLines.length
          ? diagLines.map(function (line) { return '<div class="yro_diag_line">- ' + escHtml(line) + '</div>'; }).join('')
          : 'Diagnostics: -';
      }
      var computedFillEl = Y.qs('#yro_B_computed_fill_v26');
      var childMerchEl = Y.qs('#yro_B_child_merch_v26');
      var parentMerchEl = Y.qs('#yro_B_parent_merch_v26');
      var modeAFillEl2 = Y.qs('#yro_A_computed_fill_v26');
      var modeAMerchEl2 = Y.qs('#yro_A_merch_used_v26');
      if (computedFillEl) computedFillEl.value = plan.meta.computedChildFillPct != null ? plan.meta.computedChildFillPct : '';
      if (childMerchEl) childMerchEl.value = plan.meta.childMerchantsUsed != null ? plan.meta.childMerchantsUsed : '';
      if (parentMerchEl) parentMerchEl.value = plan.meta.parentMerchantsUsed != null ? plan.meta.parentMerchantsUsed : '';
      if (modeAFillEl2) modeAFillEl2.value = '';
      if (modeAMerchEl2) modeAMerchEl2.value = '';
      if (targetTitleEl) targetTitleEl.textContent = 'CHILDREN';
      if (surplusTitleEl) surplusTitleEl.textContent = (plan.surplusSummary && plan.surplusSummary.length) ? 'PARENTS / SURPLUS' : 'PARENTS';
      if (shipTitleEl) shipTitleEl.textContent = 'SHIPMENTS';
      if (copyTargetEl) copyTargetEl.textContent = 'Copy CHILDREN';
      if (copySurplusEl) copySurplusEl.textContent = (plan.surplusSummary && plan.surplusSummary.length) ? 'Copy PARENTS / SURPLUS' : 'Copy PARENTS';
      if (copyShipEl) copyShipEl.textContent = 'Copy SHIPMENTS';

      function buildChildrenTable(rows) {
        var html = `
<tr><th colspan="10">CHILDREN</th></tr>
<tr>
  <th>Village</th>
  <th class="yro_right">Storage</th>
  <th class="yro_right">Target Each</th>
  <th class="yro_right">Before</th>
  <th class="yro_right">Sent</th>
  <th class="yro_right">Recv</th>
  <th class="yro_right">After</th>
  <th class="yro_right"><span class="icon header wood"></span></th>
  <th class="yro_right"><span class="icon header stone"></span></th>
  <th class="yro_right"><span class="icon header iron"></span></th>
</tr>`;
        if (!rows.length) return html + '<tr><td colspan="10">-</td></tr>';
        rows.forEach(function (r) {
          html += `
<tr>
  <td><b>${escHtml(String(r.name))}</b></td>
  <td class="yro_right">${Y.formatTwNumber(r.storage)}</td>
  <td class="yro_right">${Y.formatTwNumber(r.targetEach || 0)}</td>
  <td class="yro_right">${Y.formatTwNumber(r.before.total)}</td>
  <td class="yro_right">${Y.formatTwNumber(r.sent.total)}</td>
  <td class="yro_right">${Y.formatTwNumber(r.recv.total)}</td>
  <td class="yro_right"><b>${Y.formatTwNumber(r.after.total)}</b></td>
  <td class="yro_right">${Y.formatTwNumber(r.after.wood)}</td>
  <td class="yro_right">${Y.formatTwNumber(r.after.clay)}</td>
  <td class="yro_right">${Y.formatTwNumber(r.after.iron)}</td>
</tr>`;
        });
        return html;
      }

      function buildParentsAndSurplusTable(parentRows, surplusRows) {
        var html = `
<tr><th colspan="11">PARENTS</th></tr>
<tr>
  <th>Village</th>
  <th class="yro_right">Storage</th>
  <th class="yro_right">Reserve Each</th>
  <th class="yro_right">Before</th>
  <th class="yro_right">Sent</th>
  <th class="yro_right">After</th>
  <th class="yro_right"><span class="icon header wood"></span></th>
  <th class="yro_right"><span class="icon header stone"></span></th>
  <th class="yro_right"><span class="icon header iron"></span></th>
  <th class="yro_right">Spread</th>
  <th class="yro_right">Merch Used</th>
</tr>`;
        if (!parentRows.length) {
          html += '<tr><td colspan="11">-</td></tr>';
        } else {
          parentRows.forEach(function (r) {
            html += `
<tr>
  <td><b>${escHtml(String(r.name))}</b></td>
  <td class="yro_right">${Y.formatTwNumber(r.storage)}</td>
  <td class="yro_right">${Y.formatTwNumber(r.reserveEach || 0)}</td>
  <td class="yro_right">${Y.formatTwNumber(r.before.total)}</td>
  <td class="yro_right">${Y.formatTwNumber(r.sent.total)}</td>
  <td class="yro_right"><b>${Y.formatTwNumber(r.after.total)}</b></td>
  <td class="yro_right">${Y.formatTwNumber(r.after.wood)}</td>
  <td class="yro_right">${Y.formatTwNumber(r.after.clay)}</td>
  <td class="yro_right">${Y.formatTwNumber(r.after.iron)}</td>
  <td class="yro_right">${Y.formatTwNumber(r.spreadAfter || 0)}</td>
  <td class="yro_right">${Y.formatTwNumber(r.merchUsed || 0)}</td>
</tr>`;
          });
        }
        if (surplusRows && surplusRows.length) {
          html += `
<tr><th colspan="10">SURPLUS</th></tr>
<tr>
  <th>Village</th>
  <th class="yro_right">Storage</th>
  <th class="yro_right">Cap Each</th>
  <th class="yro_right">Before</th>
  <th class="yro_right">Sent</th>
  <th class="yro_right">Recv</th>
  <th class="yro_right">After</th>
  <th class="yro_right"><span class="icon header wood"></span></th>
  <th class="yro_right"><span class="icon header stone"></span></th>
  <th class="yro_right"><span class="icon header iron"></span></th>
</tr>`;
          surplusRows.forEach(function (r) {
            html += `
<tr>
  <td><b>${escHtml(String(r.name))}</b></td>
  <td class="yro_right">${Y.formatTwNumber(r.storage)}</td>
  <td class="yro_right">${Y.formatTwNumber(r.capEach || 0)}</td>
  <td class="yro_right">${Y.formatTwNumber(r.before.total)}</td>
  <td class="yro_right">${Y.formatTwNumber(r.sent.total)}</td>
  <td class="yro_right">${Y.formatTwNumber(r.recv.total)}</td>
  <td class="yro_right"><b>${Y.formatTwNumber(r.after.total)}</b></td>
  <td class="yro_right">${Y.formatTwNumber(r.after.wood)}</td>
  <td class="yro_right">${Y.formatTwNumber(r.after.clay)}</td>
  <td class="yro_right">${Y.formatTwNumber(r.after.iron)}</td>
</tr>`;
          });
        }
        return html;
      }

      if (tTbl) tTbl.innerHTML = buildChildrenTable(plan.childSummary || []);
      if (sTbl) sTbl.innerHTML = buildParentsAndSurplusTable(plan.parentSummary || [], plan.surplusSummary || []);
    } else {
      var computedFillEl2 = Y.qs('#yro_B_computed_fill_v26');
      var childMerchEl2 = Y.qs('#yro_B_child_merch_v26');
      var parentMerchEl2 = Y.qs('#yro_B_parent_merch_v26');
      var modeAFillEl3 = Y.qs('#yro_A_computed_fill_v26');
      var modeAMerchEl3 = Y.qs('#yro_A_merch_used_v26');
      if (computedFillEl2) computedFillEl2.value = '';
      if (childMerchEl2) childMerchEl2.value = '';
      if (parentMerchEl2) parentMerchEl2.value = '';
      if (modeAFillEl3) modeAFillEl3.value = '';
      if (modeAMerchEl3) modeAMerchEl3.value = '';
      if (diagEl) diagEl.innerHTML = 'Diagnostics: -';
      if (metaEl) {
        metaEl.innerHTML =
          '<b>Mode:</b> ' + String(plan.mode || '-').toUpperCase() + ' | ' +
          '<b>Cap%:</b> ' + (plan.meta.cap != null ? plan.meta.cap : '-') + ' | ' +
          '<b>Reserve(each):</b> ' + (plan.meta.reserve != null ? plan.meta.reserve : '-') + ' | ' +
          '<b>Surplus Cap%:</b> ' + (plan.meta.scap != null ? plan.meta.scap : '-') + ' | ' +
          '<b>Shipments:</b> ' + ((plan.shipments || []).length);
      }
      if (targetTitleEl) targetTitleEl.textContent = 'TARGET';
      if (surplusTitleEl) surplusTitleEl.textContent = 'SURPLUS';
      if (shipTitleEl) shipTitleEl.textContent = 'SHIPMENTS';
      if (copyTargetEl) copyTargetEl.textContent = 'Copy TARGET';
      if (copySurplusEl) copySurplusEl.textContent = 'Copy SURPLUS';
      if (copyShipEl) copyShipEl.textContent = 'Copy SHIPMENTS';

      function buildSummaryTable(title, ids, rowsById) {
        var html = `
<tr><th colspan="9">${title}</th></tr>
<tr>
  <th>Village</th>
  <th class="yro_right">Storage</th>
  <th class="yro_right">Before</th>
  <th class="yro_right">Sent</th>
  <th class="yro_right">Recv</th>
  <th class="yro_right">After(Arrived)</th>
  <th class="yro_right"><span class="icon header wood"></span></th>
  <th class="yro_right"><span class="icon header stone"></span></th>
  <th class="yro_right"><span class="icon header iron"></span></th>
</tr>`;
        if (!ids || !ids.length) return html + '<tr><td colspan="9">-</td></tr>';
        ids.forEach(function (vid) {
          var r = rowsById[vid];
          if (!r) return;
          html += `
<tr>
  <td><b>${escHtml(String(r.name))}</b></td>
  <td class="yro_right">${Y.formatTwNumber(r.storage)}</td>
  <td class="yro_right">${Y.formatTwNumber(r.before.total)}</td>
  <td class="yro_right">${Y.formatTwNumber(r.sent.total)}</td>
  <td class="yro_right">${Y.formatTwNumber(r.recv.total)}</td>
  <td class="yro_right"><b>${Y.formatTwNumber(r.after.total)}</b></td>
  <td class="yro_right">${Y.formatTwNumber(r.after.wood)}</td>
  <td class="yro_right">${Y.formatTwNumber(r.after.clay)}</td>
  <td class="yro_right">${Y.formatTwNumber(r.after.iron)}</td>
</tr>`;
        });
        return html;
      }

      var tRows = plan.targetSummary || [];
      var sRows = plan.surplusSummary || [];
      var tMap = {}; tRows.forEach(function (r) { tMap[r.id] = r; });
      var sMap = {}; sRows.forEach(function (r) { sMap[r.id] = r; });
      if (tTbl) tTbl.innerHTML = buildSummaryTable('TARGET', plan.targetIds || [], tMap);
      if (sTbl) sTbl.innerHTML = buildSummaryTable('SURPLUS', plan.surplusIds || [], sMap);
    }

    if (shTbl) {
      var html2 = `
<tr>
  <th>#</th><th>From</th><th>To</th>
  <th class="yro_right">Wood</th><th class="yro_right">Clay</th><th class="yro_right">Iron</th>
  <th class="yro_right">Total</th><th class="yro_center">Merch</th><th class="yro_center">Tag</th>
</tr>`;
      var ships = plan.shipments || [];
      if (!ships.length) {
        html2 += '<tr><td colspan="9">No shipments.</td></tr>';
      } else {
        ships.forEach(function (s, idx) {
          var fn = snapshotsById[s.from] ? snapshotsById[s.from].name : String(s.from);
          var tn = snapshotsById[s.to] ? snapshotsById[s.to].name : String(s.to);
          html2 += `
<tr>
  <td class="yro_right">${idx + 1}</td>
  <td><b>${escHtml(fn)}</b></td>
  <td><b>${escHtml(tn)}</b></td>
  <td class="yro_right">${Y.formatTwNumber(s.wood)}</td>
  <td class="yro_right">${Y.formatTwNumber(s.clay)}</td>
  <td class="yro_right">${Y.formatTwNumber(s.iron)}</td>
  <td class="yro_right"><b>${Y.formatTwNumber(s.total)}</b></td>
  <td class="yro_center">${s.merch}</td>
  <td class="yro_center">${escHtml(s.tag || '')}</td>
</tr>`;
        });
      }
      shTbl.innerHTML = html2;
    }
  }

  Y.ui = {
    injectCSS: injectCSS,
    buildPanel: buildPanel,
    setMsg: setMsg,
    setProgress: setProgress,
    fillGroupSelects: fillGroupSelects,
    buildModesBox: buildModesBox,
    enableDrag: enableDrag,
    buildPickerModal: buildPickerModal,
    renderTable1: renderTable1,
    renderTable2: renderTable2,
    renderPlanTables: renderPlanTables,
  };

  Y.log('ui module loaded âœ…');
})();


(function () {
  'use strict';

  var Y = window.YRO_V26;
  if (!Y) return;

  function groupNameById(gid) {
    gid = Y.safeInt(gid, 0);
    var g = (Y.state.groups.list || []).find(function (x) { return Y.safeInt(x.id, 0) === gid; });
    return g ? g.name : String(gid);
  }

  async function resolveSelection(gid, customKey, forceGroupFetch) {
    gid = Y.safeInt(gid, 0);
    if (gid === -1) return (Y.state.custom[customKey] || []).slice();
    return await Y.fetch.fetchVillageIdsForGroup(gid, !!forceGroupFetch);
  }

  function outgoingByVillageFromMap(outMap) {
    var out = {};
    Object.keys(outMap || {}).forEach(function (fromId) {
      var f = outMap[fromId];
      if (!f) return;
      out[Y.safeInt(fromId, 0)] = {
        wood: f.wood || 0,
        clay: f.clay || 0,
        iron: f.iron || 0,
        total: f.total || 0
      };
    });
    return out;
  }

  async function loadTables(forceGroupFetch) {
    var st = Y.state;

    var t1gid = Y.safeInt(st.groups.sel1, 0);
    var t1ids = await resolveSelection(t1gid, 't1', forceGroupFetch);
    var t1title = Y.qs('#yro_t1_title_v26');
    if (t1title) t1title.textContent = groupNameById(t1gid);

    var t2gid = Y.safeInt(st.groups.sel2, 0);
    var t2ids = await resolveSelection(t2gid, 't2', forceGroupFetch);
    var t2title = Y.qs('#yro_t2_title_v26');
    if (t2title) t2title.textContent = groupNameById(t2gid);

    var incomingMap = st.cache.incomingMap || {};
    var outMap = st.cache.outgoingMap || {};
    var inc = Y.compute.computeIncomingForSet(t2ids, incomingMap);
    var outByVid = outgoingByVillageFromMap(outMap);

    Y.ui.renderTable1(t1ids);
    Y.ui.renderTable2(t2ids, inc.allByVid, inc.externalByVid, outByVid);
  }

  function openPicker(key) {
    var snaps = Y.runtime.snapshotsById || {};
    var ids = Object.keys(snaps).map(function (k) { return Y.safeInt(k, 0); }).filter(Boolean);

    if (!ids.length) {
      Y.ui.setMsg('You must run Full Scan before using the Picker.', '#b00');
      return;
    }

    var candidates = ids.map(function (vid) {
      var s = snaps[vid];
      return { id: vid, name: s.name || ('Village ' + vid), coord: s.coord || '', storage: s.storage || 0 };
    });

    var current = (Y.state.custom[key] || []).slice();
    Y.ui.buildPickerModal(candidates, current, function (selectedIds) {
      Y.state.custom[key] = selectedIds;
      Y.saveState();
      Y.ui.setMsg('Custom selection saved: ' + key + ' (' + selectedIds.length + ' villages)', '#0a6');
      loadTables(false);
    });
  }

  function splitCoord(coord) {
    var m = String(coord || '').match(/(\d+)\|(\d+)/);
    if (!m) return null;
    return { x: Y.safeInt(m[1], 0), y: Y.safeInt(m[2], 0) };
  }

  function sendOneShipmentAjax(s) {
    var toSnap = Y.runtime.snapshotsById[s.to];
    if (!toSnap || !toSnap.coord) throw new Error('toCoord missing for ' + s.to);
    var xy = splitCoord(toSnap.coord);
    if (!xy) throw new Error('Bad coord: ' + toSnap.coord);

    var data = {
      target_type: 'coord',
      x: xy.x,
      y: xy.y,
      wood: s.wood || 0,
      stone: s.clay || 0,
      iron: s.iron || 0
    };

    return new Promise(function (resolve, reject) {
      try {
        TribalWars.post(
          'market',
          { ajaxaction: 'map_send', village: s.from },
          data,
          function (resp) { resolve(resp); },
          function (e) { reject(e); }
        );
      } catch (e2) {
        reject(e2);
      }
    });
  }

  function confirmTwoButtons(htmlMsg, onYes, onCancel) {
    var actions = [
      { text: 'Execute', callback: onYes, confirm: true },
      { text: 'Cancel', callback: function () { try { if (onCancel) onCancel(); } catch (e) {} }, cancel: true }
    ];
    if (window.UI && UI.ConfirmationBox) {
      UI.ConfirmationBox(htmlMsg, actions, 'yro_exec_v26', true);
    } else {
      var plain = String(htmlMsg)
        .replace(/<br\s*\/?\s*>/gi, '\n')
        .replace(/<[^>]*>/g, '');
      var ok = confirm(plain);
      if (ok) onYes();
      else if (onCancel) onCancel();
    }
  }

  function executeTabs() {
    var plan = Y.runtime.plan;
    var shipments = (plan && plan.shipments) ? plan.shipments : [];
    if (!shipments.length) {
      Y.ui.setMsg('No plan to execute.', '#b00');
      return;
    }

    var limit = 15;
    var n = Math.min(limit, shipments.length);

    for (var i = 0; i < n; i++) {
      var s = shipments[i];
      var url =
        '/game.php?village=' + s.from +
        '&screen=market&mode=send' +
        '&target=' + s.to +
        '&wood=' + s.wood +
        '&stone=' + s.clay +
        '&iron=' + s.iron;
      window.open(url, '_blank');
    }

    Y.ui.setMsg('Execute (Tabs): ' + n + ' tabs opened. (Total ' + shipments.length + ')', '#b35b00');
  }

  async function executePlan() {
    var plan = Y.runtime.plan;
    var shipments = (plan && plan.shipments) ? plan.shipments : [];
    if (!shipments.length) {
      Y.ui.setMsg('No plan to execute.', '#b00');
      return;
    }

    var panel = Y.qs('#' + Y.cfg.PANEL_ID);
    var prevDisplay = panel ? panel.style.display : '';
    if (panel) panel.style.display = 'none';

    confirmTwoButtons('Execute?<br/>Shipments: <b>' + shipments.length + '</b>', async function () {
      var ok = 0;
      var fail = 0;

      for (var i = 0; i < shipments.length; i++) {
        var s = shipments[i];
        Y.ui.setProgress(i + 1, shipments.length, 'Sending ' + s.from + ' -> ' + s.to);

        try {
          var resp = await sendOneShipmentAjax(s);
          ok++;
          if (window.UI && UI.SuccessMessage) UI.SuccessMessage((resp && resp.message) ? resp.message : 'Sent OK', 600);
        } catch (e) {
          fail++;
          if (window.UI && UI.ErrorMessage) UI.ErrorMessage('Failed (ok ' + ok + ' / fail ' + fail + ')', 1200);
        }
        await Y.sleep(Y.cfg.SEND_DELAY_MS);
      }

      if (panel) panel.style.display = prevDisplay || '';
      Y.ui.setMsg('Execution finished | ok=' + ok + ' | fail=' + fail, fail ? '#b00' : '#0a6');
    });
  }

  async function planFromMode(mode) {
    mode = String(mode || '').toLowerCase();
    var st = Y.state;

    if (!st.cache || !Object.keys(st.cache.villages || {}).length) {
      Y.ui.setMsg('You must run Full Scan first (Load / Refresh).', '#b00');
      return;
    }

    function getSelValue(id) {
      var el = Y.qs(id);
      return el ? Y.safeInt(el.value, 0) : 0;
    }
    function getNumValue(id, d) {
      var el = Y.qs(id);
      return el ? Y.safeInt(el.value, d) : d;
    }

    var allIds = Object.keys(Y.runtime.snapshotsById || {}).map(function (k) { return Y.safeInt(k, 0); }).filter(Boolean);
    var targetGid = 0;
    var surplusGid = 0;
    var targetIds = [];
    var surplusIds = [];

    if (mode === 'balance') {
      targetGid = getSelValue('#yro_A_target_v26');
      surplusGid = getSelValue('#yro_A_surplus_v26');
      var capA = getNumValue('#yro_A_cap_v26', st.modeA.capPct || 80);
      var scapA = getNumValue('#yro_A_scap_v26', st.modeA.surplusCapPct || 95);

      targetIds = await resolveSelection(targetGid, 'A_target', true);
      surplusIds = await resolveSelection(surplusGid, 'A_surplus', true);

      Y.runtime.plan = Y.compute.planBalance(targetIds, surplusIds, Y.runtime.snapshotsById, st.cache.incomingMap, capA, scapA);
      if (Y.runtime.plan && Y.runtime.plan.meta) {
        Y.runtime.plan.meta.targetGid = targetGid;
        Y.runtime.plan.meta.surplusGid = surplusGid;
      }

      st.groups.A_target = targetGid;
      st.groups.A_surplus = surplusGid;
      st.modeA.capPct = capA;
      st.modeA.surplusCapPct = scapA;
      delete st.modeA.ironDeltaPct;
    } else if (mode === 'push') {
      var parentGid = getSelValue('#yro_B_parents_v26');
      var childGid = getSelValue('#yro_B_children_v26');
      surplusGid = getSelValue('#yro_B_surplus_v26');
      var parentReservePct = getNumValue('#yro_B_parent_reserve_v26', st.modeB.parentReservePct || 1);
      var childrenMaxFillPct = getNumValue('#yro_B_child_max_v26', st.modeB.childrenMaxFillPct || 80);
      var surplusCapPct = getNumValue('#yro_B_scap_v26', st.modeB.surplusCapPct || 95);

      var parentIds = await resolveSelection(parentGid, 'B_parents', true);
      var childIds = await resolveSelection(childGid, 'B_children', true);
      surplusIds = await resolveSelection(surplusGid, 'B_surplus', true);

      Y.runtime.plan = Y.compute.planPush(
        parentIds,
        childIds,
        surplusIds,
        Y.runtime.snapshotsById,
        st.cache.incomingMap,
        childrenMaxFillPct,
        surplusCapPct,
        parentReservePct
      );

      st.groups.B_parents = parentGid;
      st.groups.B_children = childGid;
      st.groups.B_surplus = surplusGid;
      st.modeB.parentReservePct = parentReservePct;
      st.modeB.childrenMaxFillPct = childrenMaxFillPct;
      st.modeB.surplusCapPct = surplusCapPct;
    } else if (mode === 'funnel') {
      targetGid = getSelValue('#yro_C_target_v26');
      surplusGid = getSelValue('#yro_C_surplus_v26');
      var reserveC = getNumValue('#yro_C_reserve_v26', st.modeC.reservePct || 1);
      var capC = getNumValue('#yro_C_cap_v26', st.modeC.capPct || 80);
      var scapC = getNumValue('#yro_C_scap_v26', st.modeC.surplusCapPct || 95);
      var ironDeltaC = getNumValue('#yro_C_iron_v26', st.modeC.ironDeltaPct || 0);

      targetIds = await resolveSelection(targetGid, 'C_target', true);
      surplusIds = await resolveSelection(surplusGid, 'C_surplus', true);

      var rC = Y.compute.planFunnel(allIds, targetIds, surplusIds, Y.runtime.snapshotsById, st.cache.incomingMap, capC, scapC, reserveC, ironDeltaC);
      Y.runtime.plan = {
        mode: mode,
        shipments: rC.shipments,
        meta: {
          cap: capC,
          scap: scapC,
          reserve: reserveC,
          ironDelta: ironDeltaC,
          targetGid: targetGid,
          surplusGid: surplusGid
        },
        targetIds: rC.targetIds,
        senderIds: rC.senderIds,
        surplusIds: rC.surplusIds,
        states: rC.states,
        targetSummary: Y.compute.summarize(rC.states, rC.targetIds),
        surplusSummary: Y.compute.summarize(rC.states, rC.surplusIds)
      };

      st.groups.C_target = targetGid;
      st.groups.C_surplus = surplusGid;
      st.modeC.reservePct = reserveC;
      st.modeC.capPct = capC;
      st.modeC.surplusCapPct = scapC;
      st.modeC.ironDeltaPct = ironDeltaC;
    } else {
      Y.ui.setMsg('Unknown mode: ' + mode, '#b00');
      return;
    }

    st.orchestrator.mode = mode;
    Y.saveState();

    Y.ui.renderPlanTables(Y.runtime.plan, Y.runtime.snapshotsById);
    Y.ui.setMsg('Plan ready | Shipments: ' + ((Y.runtime.plan && Y.runtime.plan.shipments) ? Y.runtime.plan.shipments.length : 0), '#0a6');
  }

  function bbEscape(value) {
    return String(value == null ? '' : value)
      .replace(/\r?\n/g, ' ')
      .replace(/\|/g, '/')
      .trim();
  }

  function bbTable(headers, rows) {
    var lines = ['[table]'];
    lines.push('[**]' + headers.map(bbEscape).join('[||]') + '[/**]');
    if (!rows.length) {
      lines.push('[*]No data[/*]');
    } else {
      rows.forEach(function (row) {
        lines.push('[*]' + row.map(bbEscape).join('[|]') + '[/*]');
      });
    }
    lines.push('[/table]');
    return lines;
  }

  function formatRes(res) {
    return Y.formatTwNumber(res || 0);
  }

  function villageLabel(row) {
    if (!row) return '-';
    var suffix = row.coord ? ' (' + row.coord + ')' : '';
    return String(row.name || ('Village ' + row.id)) + suffix;
  }

  function buildPushMetaLines(plan, title) {
    var lines = ['[quote][b]Yaver Resource Orchestrator[/b] (' + Y.ts() + ')'];
    lines.push('[b]' + bbEscape(title) + '[/b]');
    lines.push('[list]');
    lines.push('[*][b]Mode[/b]: PARENTS -> CHILDREN');
    lines.push('[*][b]Computed Child Fill %[/b]: ' + (plan.meta.computedChildFillPct != null ? plan.meta.computedChildFillPct : '-') + '%');
    lines.push('[*][b]Children Max Fill %[/b]: ' + (plan.meta.childrenMaxFillPct != null ? plan.meta.childrenMaxFillPct : '-') + '%');
    lines.push('[*][b]Parent Reserve %[/b]: ' + (plan.meta.parentReservePct != null ? plan.meta.parentReservePct : '-') + '%');
    lines.push('[*][b]Surplus Cap %[/b]: ' + (plan.meta.surplusCapPct != null ? plan.meta.surplusCapPct : '-') + '%');
    lines.push('[*][b]Child Merch Used[/b]: ' + (plan.meta.childMerchantsUsed != null ? plan.meta.childMerchantsUsed : '-'));
    lines.push('[*][b]Parent Merch Used[/b]: ' + (plan.meta.parentMerchantsUsed != null ? plan.meta.parentMerchantsUsed : '-'));
    if (plan.meta.stopReason) lines.push('[*][b]Stop Reason[/b]: ' + bbEscape(plan.meta.stopReason));
    if (plan.meta.warnings && plan.meta.warnings.length) lines.push('[*][b]Warnings[/b]: ' + bbEscape(plan.meta.warnings.join(' | ')));
    lines.push('[/list]');
    return lines;
  }

  function buildBalanceMetaLines(plan, title) {
    var lines = ['[quote][b]Yaver Resource Orchestrator[/b] (' + Y.ts() + ')'];
    lines.push('[b]' + bbEscape(title) + '[/b]');
    lines.push('[list]');
    lines.push('[*][b]Mode[/b]: INTERNAL EQUALIZER');
    lines.push('[*][b]Computed Fill %[/b]: ' + (plan.meta.computedFillPct != null ? plan.meta.computedFillPct : '-') + '%');
    lines.push('[*][b]Cap Ceiling %[/b]: ' + (plan.meta.capPct != null ? plan.meta.capPct : '-') + '%');
    lines.push('[*][b]Surplus Cap %[/b]: ' + (plan.meta.surplusCapPct != null ? plan.meta.surplusCapPct : '-') + '%');
    lines.push('[*][b]Merch Used[/b]: ' + (plan.meta.merchantsUsed != null ? plan.meta.merchantsUsed : '-'));
    if (plan.meta.stopReason) lines.push('[*][b]Stop Reason[/b]: ' + bbEscape(plan.meta.stopReason));
    if (plan.meta.warnings && plan.meta.warnings.length) lines.push('[*][b]Warnings[/b]: ' + bbEscape(plan.meta.warnings.join(' | ')));
    lines.push('[/list]');
    return lines;
  }

  function buildGenericMetaLines(plan, title) {
    var modeLabel = String(plan.mode || '-').toUpperCase();
    var lines = ['[quote][b]Yaver Resource Orchestrator[/b] (' + Y.ts() + ')'];
    lines.push('[b]' + bbEscape(title) + '[/b]');
    lines.push('[list]');
    lines.push('[*][b]Mode[/b]: ' + modeLabel);
    if (plan.meta && plan.meta.cap != null) lines.push('[*][b]Cap %[/b]: ' + plan.meta.cap + '%');
    if (plan.meta && plan.meta.reserve != null) lines.push('[*][b]Reserve(each) %[/b]: ' + plan.meta.reserve + '%');
    if (plan.meta && plan.meta.scap != null) lines.push('[*][b]Surplus Cap %[/b]: ' + plan.meta.scap + '%');
    lines.push('[*][b]Shipments[/b]: ' + ((plan.shipments || []).length));
    lines.push('[/list]');
    return lines;
  }

  function buildChildrenTableBBCode(plan) {
    var lines = buildPushMetaLines(plan, 'CHILDREN');
    var rows = (plan.childSummary || []).map(function (r) {
      return [
        villageLabel(r),
        formatRes(r.storage),
        formatRes(r.targetEach || 0),
        formatRes(r.before.total),
        formatRes(r.sent.total),
        formatRes(r.recv.total),
        formatRes(r.after.total),
        formatRes(r.after.wood),
        formatRes(r.after.clay),
        formatRes(r.after.iron)
      ];
    });
    lines = lines.concat(bbTable(
      ['Village', 'Storage', 'Target Each', 'Before', 'Sent', 'Recv', 'After', 'Wood', 'Clay', 'Iron'],
      rows
    ));
    lines.push('[/quote]');
    return lines.join('\n');
  }

  function buildBalanceTargetTableBBCode(plan) {
    var lines = buildBalanceMetaLines(plan, 'TARGET GROUP');
    var rows = (plan.targetSummary || []).map(function (r) {
      return [
        villageLabel(r),
        formatRes(r.storage),
        formatRes(r.targetEach || 0),
        formatRes(r.before.total),
        formatRes(r.sent.total),
        formatRes(r.recv.total),
        formatRes(r.after.total),
        formatRes(r.after.wood),
        formatRes(r.after.clay),
        formatRes(r.after.iron),
        formatRes(r.merchUsed || 0)
      ];
    });
    lines = lines.concat(bbTable(
      ['Village', 'Storage', 'Target Each', 'Before', 'Sent', 'Recv', 'After', 'Wood', 'Clay', 'Iron', 'Merch Used'],
      rows
    ));
    lines.push('[/quote]');
    return lines.join('\n');
  }

  function buildParentsTableBBCode(plan) {
    var lines = buildPushMetaLines(plan, (plan.surplusSummary && plan.surplusSummary.length) ? 'PARENTS / SURPLUS' : 'PARENTS');
    var parentRows = (plan.parentSummary || []).map(function (r) {
      return [
        villageLabel(r),
        formatRes(r.storage),
        formatRes(r.reserveEach || 0),
        formatRes(r.before.total),
        formatRes(r.sent.total),
        formatRes(r.after.total),
        formatRes(r.after.wood),
        formatRes(r.after.clay),
        formatRes(r.after.iron),
        formatRes(r.spreadAfter || 0),
        formatRes(r.merchUsed || 0)
      ];
    });
    lines.push('[b]PARENTS[/b]');
    lines = lines.concat(bbTable(
      ['Village', 'Storage', 'Reserve Each', 'Before', 'Sent', 'After', 'Wood', 'Clay', 'Iron', 'Spread', 'Merch Used'],
      parentRows
    ));

    if (plan.surplusSummary && plan.surplusSummary.length) {
      var surplusRows = plan.surplusSummary.map(function (r) {
        return [
          villageLabel(r),
          formatRes(r.storage),
          formatRes(r.capEach || 0),
          formatRes(r.before.total),
          formatRes(r.sent.total),
          formatRes(r.recv.total),
          formatRes(r.after.total),
          formatRes(r.after.wood),
          formatRes(r.after.clay),
          formatRes(r.after.iron)
        ];
      });
      lines.push('[b]SURPLUS[/b]');
      lines = lines.concat(bbTable(
        ['Village', 'Storage', 'Cap Each', 'Before', 'Sent', 'Recv', 'After', 'Wood', 'Clay', 'Iron'],
        surplusRows
      ));
    }

    lines.push('[/quote]');
    return lines.join('\n');
  }

  function buildBalanceSurplusTableBBCode(plan) {
    var lines = buildBalanceMetaLines(plan, 'SURPLUS');
    var rows = (plan.surplusSummary || []).map(function (r) {
      return [
        villageLabel(r),
        formatRes(r.storage),
        formatRes(r.capEach || 0),
        formatRes(r.before.total),
        formatRes(r.sent.total),
        formatRes(r.recv.total),
        formatRes(r.after.total),
        formatRes(r.after.wood),
        formatRes(r.after.clay),
        formatRes(r.after.iron)
      ];
    });
    lines = lines.concat(bbTable(
      ['Village', 'Storage', 'Cap Each', 'Before', 'Sent', 'Recv', 'After', 'Wood', 'Clay', 'Iron'],
      rows
    ));
    lines.push('[/quote]');
    return lines.join('\n');
  }

  function buildGenericSummaryTableBBCode(plan, title, rows) {
    var lines = buildGenericMetaLines(plan, title);
    var tableRows = (rows || []).map(function (r) {
      return [
        villageLabel(r),
        formatRes(r.storage),
        formatRes(r.before.total),
        formatRes(r.sent.total),
        formatRes(r.recv.total),
        formatRes(r.after.total),
        formatRes(r.after.wood),
        formatRes(r.after.clay),
        formatRes(r.after.iron)
      ];
    });
    lines = lines.concat(bbTable(
      ['Village', 'Storage', 'Before', 'Sent', 'Recv', 'After', 'Wood', 'Clay', 'Iron'],
      tableRows
    ));
    lines.push('[/quote]');
    return lines.join('\n');
  }

  function buildShipmentsTableBBCode(plan) {
    var isPush = String(plan.mode || '').toLowerCase() === 'push';
    var isBalance = String(plan.mode || '').toLowerCase() === 'balance';
    var lines = isPush ? buildPushMetaLines(plan, 'SHIPMENTS') : (isBalance ? buildBalanceMetaLines(plan, 'SHIPMENTS') : buildGenericMetaLines(plan, 'SHIPMENTS'));

    if ((isPush || isBalance) && plan.meta && plan.meta.diagnostics && Array.isArray(plan.meta.diagnostics.lines) && plan.meta.diagnostics.lines.length) {
      lines.push('[b]Diagnostics[/b]');
      lines.push('[list]');
      plan.meta.diagnostics.lines.forEach(function (line) {
        lines.push('[*]' + bbEscape(line));
      });
      lines.push('[/list]');
    }

    var rows = (plan.shipments || []).map(function (s, idx) {
      var fromSnap = Y.runtime.snapshotsById[s.from];
      var toSnap = Y.runtime.snapshotsById[s.to];
      return [
        idx + 1,
        (fromSnap ? fromSnap.name : s.from) + ' [' + s.from + ']',
        (toSnap ? toSnap.name : s.to) + ' [' + s.to + ']',
        formatRes(s.wood),
        formatRes(s.clay),
        formatRes(s.iron),
        formatRes(s.total),
        formatRes(s.merch || Math.ceil((s.total || 0) / 1000)),
        s.tag || ''
      ];
    });
    lines = lines.concat(bbTable(
      ['#', 'From', 'To', 'Wood', 'Clay', 'Iron', 'Total', 'Merch', 'Tag'],
      rows
    ));
    lines.push('[/quote]');
    return lines.join('\n');
  }

  function copyText(text, successMsg) {
    var success = successMsg || 'Copied';
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        Y.ui.setMsg(success, '#0a6');
      }).catch(function () {
        window.prompt('Copy BBCode:', text);
      });
      return;
    }
    window.prompt('Copy BBCode:', text);
  }

  function flashButton(id, originalText) {
    var btn = Y.qs(id);
    if (!btn) return;
    var original = originalText || btn.textContent;
    btn.textContent = 'Copied';
    setTimeout(function () {
      if (btn) btn.textContent = original;
    }, 1200);
  }

  function copyPlanTargetBBCode() {
    var plan = Y.runtime.plan;
    if (!plan) {
      Y.ui.setMsg('No plan to copy.', '#b00');
      return;
    }

    var text;
    var mode = String(plan.mode || '').toLowerCase();
    if (mode === 'push') {
      text = buildChildrenTableBBCode(plan);
      flashButton('#yro_copy_plan_target_v26', 'Copy CHILDREN');
      copyText(text, 'CHILDREN BBCode copied');
      return;
    }
    if (mode === 'balance') {
      text = buildBalanceTargetTableBBCode(plan);
      flashButton('#yro_copy_plan_target_v26', 'Copy TARGET GROUP');
      copyText(text, 'TARGET GROUP BBCode copied');
      return;
    }

    text = buildGenericSummaryTableBBCode(plan, 'TARGET', plan.targetSummary || []);
    flashButton('#yro_copy_plan_target_v26', 'Copy TARGET');
    copyText(text, 'TARGET BBCode copied');
  }

  function copyPlanSurplusBBCode() {
    var plan = Y.runtime.plan;
    if (!plan) {
      Y.ui.setMsg('No plan to copy.', '#b00');
      return;
    }

    var text;
    var mode = String(plan.mode || '').toLowerCase();
    if (mode === 'push') {
      text = buildParentsTableBBCode(plan);
      flashButton(
        '#yro_copy_plan_surplus_v26',
        (plan.surplusSummary && plan.surplusSummary.length) ? 'Copy PARENTS / SURPLUS' : 'Copy PARENTS'
      );
      copyText(text, (plan.surplusSummary && plan.surplusSummary.length) ? 'PARENTS / SURPLUS BBCode copied' : 'PARENTS BBCode copied');
      return;
    }
    if (mode === 'balance') {
      text = buildBalanceSurplusTableBBCode(plan);
      flashButton('#yro_copy_plan_surplus_v26', 'Copy SURPLUS');
      copyText(text, 'SURPLUS BBCode copied');
      return;
    }

    text = buildGenericSummaryTableBBCode(plan, 'SURPLUS', plan.surplusSummary || []);
    flashButton('#yro_copy_plan_surplus_v26', 'Copy SURPLUS');
    copyText(text, 'SURPLUS BBCode copied');
  }

  function copyPlanShipmentsBBCode() {
    var plan = Y.runtime.plan;
    if (!plan) {
      Y.ui.setMsg('No plan to copy.', '#b00');
      return;
    }

    var text = buildShipmentsTableBBCode(plan);
    flashButton('#yro_copy_plan_ship_v26', 'Copy SHIPMENTS');
    copyText(text, 'SHIPMENTS BBCode copied');
  }

  function copyBBCode() {
    var plan = Y.runtime.plan || { shipments: [], meta: {} };
    var lines = ['[quote][b]Yaver Resource Orchestrator[/b] (' + Y.ts() + ')', '[list]'];
    lines.push('[*][b]Mode[/b]: ' + String(plan.mode || '-').toUpperCase());

    if (String(plan.mode || '').toLowerCase() === 'push' && plan.meta) {
      lines.push('[*][b]Computed Child Fill %[/b]: ' + (plan.meta.computedChildFillPct != null ? plan.meta.computedChildFillPct : '-') + '%');
      lines.push('[*][b]Children Max Fill %[/b]: ' + (plan.meta.childrenMaxFillPct != null ? plan.meta.childrenMaxFillPct : '-') + '%');
      lines.push('[*][b]Parent Reserve %[/b]: ' + (plan.meta.parentReservePct != null ? plan.meta.parentReservePct : '-') + '%');
      lines.push('[*][b]Surplus Cap %[/b]: ' + (plan.meta.surplusCapPct != null ? plan.meta.surplusCapPct : '-') + '%');
      lines.push('[*][b]Child Merch Used[/b]: ' + (plan.meta.childMerchantsUsed != null ? plan.meta.childMerchantsUsed : '-'));
      lines.push('[*][b]Parent Merch Used[/b]: ' + (plan.meta.parentMerchantsUsed != null ? plan.meta.parentMerchantsUsed : '-'));
      if (plan.meta.stopReason) lines.push('[*][b]Stop Reason[/b]: ' + bbEscape(plan.meta.stopReason));
      if (plan.meta.warnings && plan.meta.warnings.length) lines.push('[*][b]Warnings[/b]: ' + bbEscape(plan.meta.warnings.join(' | ')));
    } else if (String(plan.mode || '').toLowerCase() === 'balance' && plan.meta) {
      lines.push('[*][b]Computed Fill %[/b]: ' + (plan.meta.computedFillPct != null ? plan.meta.computedFillPct : '-') + '%');
      lines.push('[*][b]Cap Ceiling %[/b]: ' + (plan.meta.capPct != null ? plan.meta.capPct : '-') + '%');
      lines.push('[*][b]Surplus Cap %[/b]: ' + (plan.meta.surplusCapPct != null ? plan.meta.surplusCapPct : '-') + '%');
      lines.push('[*][b]Merch Used[/b]: ' + (plan.meta.merchantsUsed != null ? plan.meta.merchantsUsed : '-'));
      if (plan.meta.stopReason) lines.push('[*][b]Stop Reason[/b]: ' + bbEscape(plan.meta.stopReason));
      if (plan.meta.warnings && plan.meta.warnings.length) lines.push('[*][b]Warnings[/b]: ' + bbEscape(plan.meta.warnings.join(' | ')));
    } else {
      lines.push('[*][b]Cap %[/b]: ' + (plan.meta && plan.meta.cap != null ? plan.meta.cap : '-') + '%');
      lines.push('[*][b]Reserve(each) %[/b]: ' + (plan.meta && plan.meta.reserve != null ? plan.meta.reserve : '-') + '%');
      lines.push('[*][b]Surplus Cap %[/b]: ' + (plan.meta && plan.meta.scap != null ? plan.meta.scap : '-') + '%');
    }

    lines.push('[*][b]Shipments[/b]: ' + ((plan.shipments || []).length));
    lines.push('[/list]');

    if ((String(plan.mode || '').toLowerCase() === 'push' || String(plan.mode || '').toLowerCase() === 'balance') && plan.meta && plan.meta.diagnostics && Array.isArray(plan.meta.diagnostics.lines) && plan.meta.diagnostics.lines.length) {
      lines.push('[b]Diagnostics[/b]');
      lines.push('[list]');
      plan.meta.diagnostics.lines.forEach(function (line) {
        lines.push('[*]' + bbEscape(line));
      });
      lines.push('[/list]');
    }

    if (plan.shipments && plan.shipments.length) {
      lines.push('[b]Shipment Plan[/b]');
      lines = lines.concat(bbTable(
        ['#', 'From', 'To', 'Wood', 'Clay', 'Iron', 'Total', 'Merch', 'Tag'],
        plan.shipments.map(function (s, idx) {
          var fromSnap = Y.runtime.snapshotsById[s.from];
          var toSnap = Y.runtime.snapshotsById[s.to];
          return [
            idx + 1,
            (fromSnap ? fromSnap.name : s.from) + ' [' + s.from + ']',
            (toSnap ? toSnap.name : s.to) + ' [' + s.to + ']',
            formatRes(s.wood),
            formatRes(s.clay),
            formatRes(s.iron),
            formatRes(s.total),
            formatRes(s.merch || Math.ceil((s.total || 0) / 1000)),
            s.tag || ''
          ];
        })
      ));
    } else {
      lines.push('[i]No shipments.[/i]');
    }

    lines.push('[/quote]');
    copyText(lines.join('\n'), 'BBCode copied');
  }

  async function loadAll(force) {
    try {
      Y.ui.setMsg('Full Scan started...', '#b35b00');
      Y.ui.setProgress(0, 1, 'Preparing');

      await Y.fetch.fetchGroupsList(!!force);

      Y.ui.fillGroupSelects(Y.state.groups.list);
      Y.ui.buildModesBox(Y.state.groups.list);

      await Y.fetch.fullScanAllVillages(!!force, function (done, total, msg) {
        Y.ui.setProgress(done, total, msg);
      });

      await loadTables(false);

      Y.ui.setProgress(1, 1, 'Ready');
      Y.ui.setMsg('Ready (Full Scan completed)', '#0a6');
    } catch (e) {
      Y.err('loadAll failed', e);
      Y.ui.setMsg('Error (check console log)', '#b00');
    }
  }

  function bindEvents() {
    var st = Y.state;

    Y.on(Y.qs('#yro_close_v26'), 'click', function () { Y.destroy(); });
    Y.on(Y.qs('#yro_load_v26'), 'click', function () { loadAll(true); });

    var search = Y.qs('#yro_search_v26');
    if (search) {
      search.value = st.ui.search || '';
      Y.on(search, 'input', Y.debounce(function () {
        st.ui.search = search.value || '';
        Y.saveState();
        loadTables(false);
      }, 160));
    }

    Y.on(Y.qs('#yro_t1_toggle_v26'), 'click', function () {
      st.ui.minimized1 = !st.ui.minimized1;
      var w = Y.qs('#yro_t1_wrap_v26');
      if (w) w.style.display = st.ui.minimized1 ? 'none' : '';
      var b = Y.qs('#yro_t1_toggle_v26');
      if (b) b.textContent = st.ui.minimized1 ? 'Expand' : 'Minimize';
      Y.saveState();
    });

    Y.on(Y.qs('#yro_t2_toggle_v26'), 'click', function () {
      st.ui.minimized2 = !st.ui.minimized2;
      var w = Y.qs('#yro_t2_wrap_v26');
      if (w) w.style.display = st.ui.minimized2 ? 'none' : '';
      var b = Y.qs('#yro_t2_toggle_v26');
      if (b) b.textContent = st.ui.minimized2 ? 'Expand' : 'Minimize';
      Y.saveState();
    });

    Y.on(Y.qs('#yro_t1_group_sel_v26'), 'change', function (e) {
      st.groups.sel1 = Y.safeInt(e.target.value, 0);
      Y.saveState();
      loadTables(true);
    });

    Y.on(Y.qs('#yro_t2_group_sel_v26'), 'change', function (e) {
      st.groups.sel2 = Y.safeInt(e.target.value, 0);
      Y.saveState();
      loadTables(true);
    });

    Y.on(Y.qs('#yro_t1_pick_v26'), 'click', function () { openPicker('t1'); });
    Y.on(Y.qs('#yro_t2_pick_v26'), 'click', function () { openPicker('t2'); });
    Y.on(Y.qs('#yro_copy_bb_v26'), 'click', function () { copyBBCode(); });
    Y.on(Y.qs('#yro_copy_plan_target_v26'), 'click', function () { copyPlanTargetBBCode(); });
    Y.on(Y.qs('#yro_copy_plan_surplus_v26'), 'click', function () { copyPlanSurplusBBCode(); });
    Y.on(Y.qs('#yro_copy_plan_ship_v26'), 'click', function () { copyPlanShipmentsBBCode(); });

    var modeBox = Y.qs('#yro_modes_v26');
    if (!modeBox) return;

    Y.on(modeBox, 'click', function (e) {
      var t = e.target;
      if (!t) return;

      if (t.id === 'yro_A_plan_v26') return planFromMode('balance');
      if (t.id === 'yro_B_plan_v26') return planFromMode('push');
      if (t.id === 'yro_C_plan_v26') return planFromMode('funnel');

      if (t.id === 'yro_A_exec_v26' || t.id === 'yro_B_exec_v26' || t.id === 'yro_C_exec_v26') return executePlan();

      if (String(t.id || '').startsWith('pick_') && String(t.id || '').endsWith('_v26')) {
        var key = String(t.id).replace('pick_', '').replace('_v26', '');
        return openPicker(key);
      }

      var tag = (t.tagName || '').toLowerCase();
      if (tag === 'select' || tag === 'input' || tag === 'button' || tag === 'option') return;

      var row = t.closest ? t.closest('.yro_mode_row') : null;
      if (row && row.getAttribute) {
        var mode = row.getAttribute('data-mode');
        if (mode) {
          st.orchestrator.mode = mode;
          Y.saveState();
          Y.qsa('#yro_modes_v26 .yro_mode_row').forEach(function (r) { r.classList.remove('active'); });
          row.classList.add('active');
        }
      }
    });

    Y.on(modeBox, 'change', function (e) {
      var t = e.target;
      if (!t || !t.id) return;

      if (t.id === 'yro_A_target_v26') st.groups.A_target = Y.safeInt(t.value, 0);
      else if (t.id === 'yro_A_surplus_v26') st.groups.A_surplus = Y.safeInt(t.value, 0);
      else if (t.id === 'yro_B_parents_v26') st.groups.B_parents = Y.safeInt(t.value, 0);
      else if (t.id === 'yro_B_children_v26') st.groups.B_children = Y.safeInt(t.value, 0);
      else if (t.id === 'yro_B_surplus_v26') st.groups.B_surplus = Y.safeInt(t.value, 0);
      else if (t.id === 'yro_C_target_v26') st.groups.C_target = Y.safeInt(t.value, 0);
      else if (t.id === 'yro_C_surplus_v26') st.groups.C_surplus = Y.safeInt(t.value, 0);
      else if (t.id === 'yro_A_cap_v26') st.modeA.capPct = Y.safeInt(t.value, st.modeA.capPct);
      else if (t.id === 'yro_A_scap_v26') st.modeA.surplusCapPct = Y.safeInt(t.value, st.modeA.surplusCapPct);
      else if (t.id === 'yro_B_parent_reserve_v26') st.modeB.parentReservePct = Y.safeInt(t.value, st.modeB.parentReservePct);
      else if (t.id === 'yro_B_child_max_v26') st.modeB.childrenMaxFillPct = Y.safeInt(t.value, st.modeB.childrenMaxFillPct);
      else if (t.id === 'yro_B_scap_v26') st.modeB.surplusCapPct = Y.safeInt(t.value, st.modeB.surplusCapPct);
      else if (t.id === 'yro_C_reserve_v26') st.modeC.reservePct = Y.safeInt(t.value, st.modeC.reservePct);
      else if (t.id === 'yro_C_cap_v26') st.modeC.capPct = Y.safeInt(t.value, st.modeC.capPct);
      else if (t.id === 'yro_C_scap_v26') st.modeC.surplusCapPct = Y.safeInt(t.value, st.modeC.surplusCapPct);
      else if (t.id === 'yro_C_iron_v26') st.modeC.ironDeltaPct = String(t.value).trim() === '' ? null : Y.safeInt(t.value, 0);

      Y.saveState();
    });
  }

  async function init() {
    var panel = Y.ui.buildPanel();
    Y.ui.enableDrag(panel);

    await Y.fetch.fetchGroupsList(false);
    Y.ui.fillGroupSelects(Y.state.groups.list);
    Y.ui.buildModesBox(Y.state.groups.list);

    bindEvents();

    Y.fetch.rebuildGlobalMapsFromCache();
    await loadTables(false);

    if (!Object.keys(Y.state.cache.villages || {}).length) {
      await loadAll(false);
    } else {
      Y.ui.setMsg('Ready (cache available) - run Full Scan if you want fresh data', '#0a6');
    }
  }

  Y.init = init;
  Y.log('main module loaded');
})();

