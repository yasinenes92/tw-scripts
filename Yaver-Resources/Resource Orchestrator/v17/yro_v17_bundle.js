(function () {
  'use strict';

  var VERSION = 'v17';
  var NS = 'YRO_V17';
  var PANEL_ID = 'yro_panel_v17';
  var STYLE_ID = 'yro_css_v17';
  var PICKER_OVERLAY_ID = 'yro_picker_overlay_v17';
  var LS_KEY = 'yro_v17_state';

  function removeIfExists(id) {
    var el = document.getElementById(id);
    if (el && el.parentNode) el.parentNode.removeChild(el);
  }

  // Clean older YRO panels/styles (safe)
  removeIfExists('yro_panel_v7'); removeIfExists('yro_css_v7');
  removeIfExists('yro_panel_v10'); removeIfExists('yro_css_v10');
  removeIfExists('yro_panel_v11'); removeIfExists('yro_css_v11');
  removeIfExists(PANEL_ID);
  removeIfExists(STYLE_ID);
  removeIfExists(PICKER_OVERLAY_ID);

  try { if (window.YRO_V11) delete window.YRO_V11; } catch (e) {}
  try { if (window.YRO_V17) delete window.YRO_V17; } catch (e2) {}
  try { if (window.__YAVER_RESOURCE_ORCHESTRATOR_V7__) delete window.__YAVER_RESOURCE_ORCHESTRATOR_V7__; } catch (e3) {}

  var Y = {};
  window[NS] = Y;

  Y._rt = { listeners: [], aborters: [], destroyed: false };

  function nowTs() {
    var d = new Date();
    function pad(n) { return (n < 10 ? '0' : '') + n; }
    return pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear() +
      ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
  }

  function log() { var a = [].slice.call(arguments); a.unshift('[YRO ' + VERSION + ']'); console.log.apply(console, a); }
  function warn() { var a = [].slice.call(arguments); a.unshift('[YRO ' + VERSION + ']'); console.warn.apply(console, a); }
  function err() { var a = [].slice.call(arguments); a.unshift('[YRO ' + VERSION + ']'); console.error.apply(console, a); }

  function qs(sel, root) { return (root || document).querySelector(sel); }
  function qsa(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function safeInt(x, dflt) { var n = parseInt(x, 10); return isNaN(n) ? (dflt || 0) : n; }

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
    while (s.length > 3) { out = '.' + s.slice(-3) + out; s = s.slice(0, -3); }
    return s + out;
  }

  function debounce(fn, ms) {
    var t = null;
    return function () {
      var ctx = this, args = arguments;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(ctx, args); }, ms || 150);
    };
  }

  function sleep(ms) { return new Promise(function (res) { setTimeout(res, ms || 0); }); }

  function lsGet(key) { try { var raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : null; } catch (e) { return null; } }
  function lsSet(key, obj) { try { localStorage.setItem(key, JSON.stringify(obj)); } catch (e) {} }

  function getCurrentVillageId() {
    try { if (window.game_data && game_data.village && game_data.village.id) return safeInt(game_data.village.id, 0); } catch (e) {}
    try { var sp = new URLSearchParams(window.location.search); var v = sp.get('village'); if (v) return safeInt(v, 0); } catch (e2) {}
    return 0;
  }

  function getLinkBasePure() {
    try { if (window.game_data && game_data.link_base_pure) return game_data.link_base_pure; } catch (e) {}
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
      var v = u.searchParams.get('village');
      return v ? safeInt(v, 0) : 0;
    } catch (e) {
      var m = String(href).match(/[?&]village=(\d+)/);
      return m ? safeInt(m[1], 0) : 0;
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

    Y._rt.aborters.forEach(function (a) { try { a.abort(); } catch (e) {} });
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

    var t = setTimeout(function () { try { ac.abort(); } catch (e) {} }, timeoutMs);
    try {
      var resp = await fetch(url, { method: 'GET', credentials: 'same-origin', signal: ac.signal });
      if (!resp.ok) throw new Error('HTTP ' + resp.status + ' ' + resp.statusText);
      return await resp.text();
    } finally {
      clearTimeout(t);
    }
  }

  function parseHTML(html) { return new DOMParser().parseFromString(String(html || ''), 'text/html'); }

  function extractUpdateGameData(html) {
    var s = String(html || '');
    var key = 'TribalWars.updateGameData(';
    var idx = s.indexOf(key);
    if (idx < 0) return null;

    var i = s.indexOf('{', idx + key.length);
    if (i < 0) return null;

    var depth = 0, j = i;
    for (; j < s.length; j++) {
      var ch = s[j];
      if (ch === '{') depth++;
      else if (ch === '}') { depth--; if (depth === 0) { j++; break; } }
    }
    if (depth !== 0) return null;

    var jsonText = s.slice(i, j);
    try { return JSON.parse(jsonText); } catch (e) { warn('updateGameData JSON.parse failed', e); return null; }
  }

  function defaultState() {
    return {
      ui: {
        left: 30,
        top: 70,
        minimized1: true,
        minimized2: true,
        search: '',
      },
      groups: {
        list: [{ id: 0, name: 'All villages' }, { id: -1, name: 'Custom selection…' }],
        sel1: 0,
        sel2: 0,
        A_target: 0, A_surplus: 0,
        B_sender: 0, B_target: 0, B_surplus: 0,
        C_target: 0, C_surplus: 0,
      },
      custom: {
        t1: [], t2: [],
        A_target: [], A_surplus: [],
        B_sender: [], B_target: [], B_surplus: [],
        C_target: [], C_surplus: [],
      },
      orchestrator: { mode: 'push', cap: 80, scap: 95, reserve: 1, tolerance: 5, ironDelta: null },
      cache: {
        groupsFetchedAt: 0,
        groupVillageIds: {},
        villages: {},
        incomingMap: {},
        outgoingMap: {},
        lastFullScanAt: 0,
      },
    };
  }

  function loadState() {
    var st = lsGet(LS_KEY);
    if (!st || typeof st !== 'object') return defaultState();

    var def = defaultState();
    function merge(a, b) {
      for (var k in b) {
        if (!Object.prototype.hasOwnProperty.call(b, k)) continue;
        if (b[k] && typeof b[k] === 'object' && !Array.isArray(b[k])) {
          if (!a[k] || typeof a[k] !== 'object') a[k] = {};
          merge(a[k], b[k]);
        } else if (a[k] === undefined) {
          a[k] = b[k];
        }
      }
      return a;
    }
    return merge(st, def);
  }

  Y.state = loadState();
  Y.saveState = function () { lsSet(LS_KEY, Y.state); };

  Y.runtime = { plan: null, snapshotsById: {}, coordToId: {}, nameToIds: {} };

  Y.cfg = {
    VERSION: VERSION,
    NS: NS,
    PANEL_ID: PANEL_ID,
    STYLE_ID: STYLE_ID,
    PICKER_OVERLAY_ID: PICKER_OVERLAY_ID,
    MERCH_CAP_PER: 1000,
    SEND_DELAY_MS: 250,
  };

  Y.ts = nowTs;
  Y.log = log; Y.warn = warn; Y.err = err;

  Y.qs = qs; Y.qsa = qsa; Y.on = on;

  Y.safeInt = safeInt;
  Y.parseTwNumber = parseTwNumber;
  Y.formatTwNumber = formatTwNumber;

  Y.debounce = debounce;
  Y.sleep = sleep;

  Y.lsGet = lsGet; Y.lsSet = lsSet;

  Y.getCurrentVillageId = getCurrentVillageId;
  Y.getLinkBasePure = getLinkBasePure;
  Y.buildGameUrl = buildGameUrl;
  Y.parseVillageIdFromHref = parseVillageIdFromHref;
  Y.parseCoordsFromText = parseCoordsFromText;

  Y.httpGet = httpGet;
  Y.parseHTML = parseHTML;
  Y.extractUpdateGameData = extractUpdateGameData;

  Y.destroy = destroy;

  log('bootstrap loaded ✅');
})();

;
(function () {
  'use strict';

  var Y = window.YRO_V17;
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

  Y.log('data module loaded ✅');
})();

;
(function () {
  'use strict';

  var Y = window.YRO_V17;
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
    groups.push({ id: -1, name: 'Custom selection…' });

    var sel = doc.querySelector(Y.data.GROUP_SELECTORS.groupSelect);
    if (sel) {
      Y.qsa('option', sel).forEach(function (o) {
        var id = Y.safeInt(o.getAttribute('value'), 0);
        var name = String(o.textContent || '').trim();
        if (!name) return;
        if (groups.some(function (g) { return String(g.id) === String(id); })) return;
        groups.push({ id: id, name: name });
      });
    } else {
      Y.qsa(Y.data.GROUP_SELECTORS.groupMenuItems, doc).forEach(function (a) {
        var id2 = Y.safeInt(a.getAttribute('data-group-id'), 0);
        var nm = String(a.textContent || '').replace(/[\[\]]/g, '').trim();
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

  function nextTableAfter(el) {
    if (!el) return null;
    var cur = el.nextElementSibling;
    while (cur) {
      if (cur.tagName && cur.tagName.toLowerCase() === 'table') return cur;
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
    var tblOut = nextTableAfter(hOut);
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
    var tblIn = nextTableAfter(hIn);
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

    var CONC = 3;
    var idx = 0;

    async function worker() {
      while (idx < ids.length) {
        var my = idx++;
        var vid = ids[my];
        done++;
        onProgress(done, total, 'Fetch village ' + vid + ' (' + done + '/' + total + ')');
        try {
          await fetchVillageMarketTransports(vid, force);
        } catch (e) {
          Y.warn('village fetch failed', vid, e);
        }
        await Y.sleep(140);
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

  Y.log('fetch module loaded ✅');
})();

;
(function () {
  'use strict';

  var Y = window.YRO_V17;
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
      vid = String(vid);
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
      vid = String(vid);
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
    if (sumStorage <= 0) return 1;

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
      vid = String(vid);
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

  function applySend(fromState, toState, rk, amount, tag) {
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
      rec = { wood: 0, clay: 0, iron: 0, total: 0, tags: new Set() };
      fromState.outTo.set(toState.id, rec);
    }

    var oldTotal = rec.total || 0;
    var oldMerch = Math.ceil(oldTotal / Y.cfg.MERCH_CAP_PER);

    var maxTotalWithMerch = (oldMerch + fromState.merchFree) * Y.cfg.MERCH_CAP_PER;
    var maxSendAllowed = maxTotalWithMerch - oldTotal;
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

    fromState.merchFree -= addMerch;
    if (fromState.merchFree < 0) fromState.merchFree = 0;

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
          tag: tags.length ? tags.join('+') : '',
        });
      });
    });
    shipments.sort(function (a, b) { return b.total - a.total; });
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

  function planBalance(targetIds, surplusIds, snapshotsById, incomingMap, capPct, surplusCapPct, ironDeltaPct) {
    var tSet = {}; targetIds.forEach(function (v) { tSet[String(v)] = true; });

    surplusIds = (surplusIds || []).filter(function (id) { return !tSet[String(id)]; });

    var allIds = targetIds.concat(surplusIds);

    var capOverride = {};
    surplusIds.forEach(function (vid) {
      var snap = snapshotsById[vid];
      if (!snap) return;
      capOverride[vid] = capEach(snap.storage || 0, surplusCapPct);
    });

    var st = buildPlanState(allIds, snapshotsById, incomingMap, capPct, 0, capOverride);

    targetIds.forEach(function (vid) {
      var s = st.get(vid);
      if (!s) return;
      s.capEach = capEach(s.storage, capPct);
      var ironFactor = ironFactorFromDeltaPct(ironDeltaPct || 0);
      s.desiredByRes = desiredTripletFromCap(s.capEach, ironFactor);
    });

    ['wood', 'clay', 'iron'].forEach(function (rk) {
      var donors = [];
      var receivers = [];

      targetIds.forEach(function (vid) {
        var s = st.get(vid);
        if (!s) return;
        var want = (s.desiredByRes && s.desiredByRes[rk]) ? s.desiredByRes[rk] : 0;
        var cur = getFutureRecvVal(s, rk);
        if (cur > want) donors.push({ id: vid, surplus: cur - want });
        if (cur < want) receivers.push({ id: vid, need: want - cur });
      });

      donors.sort(function (a, b) { return b.surplus - a.surplus; });
      receivers.sort(function (a, b) { return b.need - a.need; });

      var di = 0, ri = 0;
      while (di < donors.length && ri < receivers.length) {
        var d = donors[di];
        var r = receivers[ri];
        if (d.surplus <= 0) { di++; continue; }
        if (r.need <= 0) { ri++; continue; }

        var from = st.get(d.id);
        var to = st.get(r.id);
        if (!from || !to) { di++; continue; }

        var take = Math.min(d.surplus, r.need);
        var sent = applySend(from, to, rk, take, 'BAL');
        if (sent <= 0) {
          var space = (to.capEach || 0) - getFutureRecvVal(to, rk);
          if (space <= 0) ri++; else di++;
          continue;
        }
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
        targetIds.forEach(function (vid) {
          var s = st.get(vid);
          if (!s) return;
          var want = (s.desiredByRes && s.desiredByRes[rk]) ? s.desiredByRes[rk] : 0;
          var cur = getFutureRecvVal(s, rk);
          var extra = Math.max(0, cur - want);
          if (extra > 0) donors2.push({ id: vid, surplus: extra });
        });
        donors2.sort(function (a, b) { return b.surplus - a.surplus; });

        var di = 0;
        for (var si = 0; si < surplusIds.length && di < donors2.length; si++) {
          var toId = surplusIds[si];
          var to = st.get(toId);
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
    return { shipments: shipments, states: st, targetIds: targetIds, surplusIds: surplusIds };
  }

  
  function planPush(senderIds, targetIds, surplusIds, snapshotsById, incomingMap, capPctIgnored, surplusCapPct, reservePct, ironDeltaMaybe, tolerancePct, outgoingMapIgnored) {
    // v17 Optimized PUSH/FEED:
    // Goal: maximize equal fill across TARGET villages within tolerance bounds.
    // - Cap% is computed automatically (input cap is ignored).
    // - Tolerance% applies to wood/clay and (by default) to iron.
    // - If ironDeltaMaybe is provided (number), it is treated as IRON tolerance (%), otherwise iron uses Tolerance%.
    // - If not feasible, return a trade suggestion (sell surplus, buy deficit), no shipments.

    senderIds = Array.isArray(senderIds) ? senderIds.map(String) : [];
    targetIds = Array.isArray(targetIds) ? targetIds.map(String) : [];
    surplusIds = Array.isArray(surplusIds) ? surplusIds.map(String) : [];

    var tSet = {}; targetIds.forEach(function (v) { tSet[String(v)] = true; });
    surplusIds = surplusIds.filter(function (id) { return !tSet[String(id)]; });
    senderIds = senderIds.filter(function (id) { return !tSet[String(id)]; });

    var allIds = uniq(senderIds.concat(targetIds).concat(surplusIds));

    // Build state with temporary capPct (will overwrite caps for targets)
    var st = buildPlanState(allIds, snapshotsById, incomingMap, 1, reservePct, null);

    // Precompute totals
    var tgtTotals = computeGroupTotals(targetIds, st, incomingMap);
    var donorSup = computeDonorSupply(senderIds, st, reservePct);

    var tol = (tolerancePct == null) ? 5 : clamp(tolerancePct, 0, 25);
    var ironTol = (ironDeltaMaybe == null || ironDeltaMaybe === '' || isNaN(Number(ironDeltaMaybe)))
      ? null
      : clamp(Number(ironDeltaMaybe), 0, 50);

    // Auto Cap% (max feasible)
    var capPct = computeAutoCapPctPush(targetIds, tgtTotals, donorSup, tol, ironTol);
    if (capPct < 1) capPct = 1;

    // Trade suggestion check for this capPct
    var trade = buildTradeSuggestion(tgtTotals, donorSup, capPct, tol, ironTol);
    if (trade) {
      trade.suggestedVillage = pickBestSellerVillage(senderIds, st, reservePct, trade.sell.res);
      return {
        shipments: [],
        states: st,
        senderIds: senderIds,
        targetIds: targetIds,
        surplusIds: surplusIds,
        capPct: capPct,
        tolPct: tol,
        ironTolPct: (ironTol == null ? tol : ironTol),
        trade: trade,
      };
    }

    // Configure per-target min/max/center caps
    var tolFrac = pctToFrac(tol);
    var ironTolFrac = pctToFrac(ironTol == null ? tol : ironTol);

    var targetMeta = {};
    targetIds.forEach(function (vid) {
      var s = st.get(vid);
      if (!s) return;
      var baseEach = (s.storage || 0) * (capPct / 100);
      var minR = minReqPerRes(baseEach, tolFrac, ironTolFrac);
      var maxR = maxReqPerRes(baseEach, tolFrac, ironTolFrac, s.storage || 0);

      s.capEachByRes = { wood: maxR.wood, clay: maxR.clay, iron: maxR.iron };
      s.capEach = Math.max(maxR.wood, maxR.clay, maxR.iron); // fallback

      targetMeta[vid] = {
        baseEach: Math.floor(baseEach),
        min: minR,
        max: maxR,
      };
    });

    // Surplus caps (optional receivers)
    if (surplusIds.length) {
      surplusIds.forEach(function (vid) {
        var s = st.get(vid);
        if (!s) return;
        var capEachSur = capEach(s.storage || 0, surplusCapPct);
        s.capEachByRes = { wood: capEachSur, clay: capEachSur, iron: capEachSur };
        s.capEach = capEachSur;
      });
    }

    // ----- Stage 1: Internal balancing within TARGET to satisfy MIN bounds (BAL) -----
    ['wood','clay','iron'].forEach(function (rk) {
      var donors = [];
      var receivers = [];

      targetIds.forEach(function (vid) {
        var s = st.get(vid);
        if (!s) return;
        var meta = targetMeta[vid];
        if (!meta) return;

        var cur = getFutureRecvVal(s, rk);
        var minNeed = Math.max(0, Math.floor((meta.min[rk] || 0) - cur));
        var surplus = Math.max(0, Math.floor(cur - (meta.min[rk] || 0)));

        if (minNeed > 0) receivers.push({ id: vid, need: minNeed });
        if (surplus > 0 && (s.merchFree || 0) > 0) donors.push({ id: vid, surplus: surplus });
      });

      // prioritize biggest needs first, biggest donors first
      receivers.sort(function(a,b){ return b.need - a.need; });
      donors.sort(function(a,b){ return b.surplus - a.surplus; });

      var di = 0, ri = 0;
      while (di < donors.length && ri < receivers.length) {
        var d = donors[di], r = receivers[ri];
        if (d.surplus <= 0) { di++; continue; }
        if (r.need <= 0) { ri++; continue; }

        var from = st.get(d.id);
        var to = st.get(r.id);
        if (!from || !to) { di++; continue; }

        var take = Math.min(d.surplus, r.need);
        var sent = applySend(from, to, rk, take, 'BAL');
        if (sent <= 0) { di++; continue; }

        d.surplus -= sent;
        r.need -= sent;
      }
    });

    // ----- Stage 2: External fill from SENDERS to TARGET min bounds (SND) -----
    ['wood','clay','iron'].forEach(function (rk) {
      var receivers = [];
      targetIds.forEach(function (vid) {
        var t = st.get(vid);
        var meta = targetMeta[vid];
        if (!t || !meta) return;
        var cur = getFutureRecvVal(t, rk);
        var need = Math.max(0, Math.floor((meta.min[rk] || 0) - cur));
        if (need > 0) receivers.push({ id: vid, need: need });
      });
      receivers.sort(function(a,b){ return b.need - a.need; });

      var donors = [];
      senderIds.forEach(function (vid) {
        var s = st.get(vid);
        if (!s) return;
        var keep = reserveEach(s.storage || 0, reservePct);
        s.keepEach = keep; // apply reserve for sending
        var avail = Math.max(0, Math.floor((s.baseNow[rk] || 0) - keep));
        if (avail > 0 && (s.merchFree || 0) > 0) donors.push({ id: vid, surplus: avail });
      });
      donors.sort(function(a,b){ return b.surplus - a.surplus; });

      var di = 0, ri = 0;
      while (di < donors.length && ri < receivers.length) {
        var d = donors[di], r = receivers[ri];
        if (d.surplus <= 0) { di++; continue; }
        if (r.need <= 0) { ri++; continue; }

        var from = st.get(d.id);
        var to = st.get(r.id);
        if (!from || !to) { di++; continue; }

        var take = Math.min(d.surplus, r.need);
        var sent = applySend(from, to, rk, take, 'SND');
        if (sent <= 0) { di++; continue; }

        d.surplus -= sent;
        r.need -= sent;
      }
    });

    // ----- Stage 3: Bring TARGETs toward center (baseEach) fairly (SND) -----
    // We do a second pass focusing on villages with lower total fill first.
    function fillScore(vid) {
      var t = st.get(vid);
      if (!t) return 1e9;
      var base = (t.baseNow.total || 0) + (t.inc0.total || 0) + (t.inPlanned.total || 0);
      var denom = 3 * (t.storage || 1);
      return denom > 0 ? base / denom : 1e9;
    }

    ['wood','clay','iron'].forEach(function(rk){
      var receivers = targetIds.slice().sort(function(a,b){ return fillScore(a) - fillScore(b); }).map(function(vid){
        var t = st.get(vid);
        var meta = targetMeta[vid];
        if (!t || !meta) return null;
        var cur = getFutureRecvVal(t, rk);
        var need = Math.max(0, Math.floor((meta.baseEach || 0) - cur));
        // allow going above base, but not beyond max; we'll only aim to base here
        return need > 0 ? { id: vid, need: need } : null;
      }).filter(Boolean);

      var donors = [];
      senderIds.forEach(function(vid){
        var s = st.get(vid);
        if (!s) return;
        var keep = reserveEach(s.storage || 0, reservePct);
        s.keepEach = keep;
        var avail = Math.max(0, Math.floor((s.baseNow[rk] || 0) - keep));
        if (avail > 0 && (s.merchFree || 0) > 0) donors.push({ id: vid, surplus: avail });
      });
      donors.sort(function(a,b){ return b.surplus - a.surplus; });

      var di = 0;
      for (var ri = 0; ri < receivers.length && di < donors.length; ri++) {
        var rec = receivers[ri];
        var to = st.get(rec.id);
        if (!to) continue;

        while (di < donors.length && rec.need > 0) {
          var d = donors[di];
          if (d.surplus <= 0) { di++; continue; }
          var from = st.get(d.id);
          if (!from) { di++; continue; }

          var sent = applySend(from, to, rk, Math.min(d.surplus, rec.need), 'SND');
          if (sent <= 0) { di++; continue; }
          d.surplus -= sent;
          rec.need -= sent;
        }
      }
    });

    // ----- Stage 4: Optional SURPLUS parking (SUR) -----
    if (surplusIds.length) {
      ['wood','clay','iron'].forEach(function (rk) {
        var receivers = surplusIds.map(function(vid){
          var t = st.get(vid);
          if (!t) return null;
          var cap = (t.capEachByRes && t.capEachByRes[rk]!=null) ? t.capEachByRes[rk] : (t.capEach||0);
          var cur = getFutureRecvVal(t, rk);
          var space = Math.max(0, Math.floor(cap - cur));
          return space > 0 ? { id: vid, need: space } : null;
        }).filter(Boolean);
        receivers.sort(function(a,b){ return b.need - a.need; });

        var donors = [];
        senderIds.forEach(function(vid){
          var s = st.get(vid);
          if (!s) return;
          var keep = reserveEach(s.storage || 0, reservePct);
          s.keepEach = keep;
          var avail = Math.max(0, Math.floor((s.baseNow[rk] || 0) - keep));
          if (avail > 0 && (s.merchFree || 0) > 0) donors.push({ id: vid, surplus: avail });
        });
        donors.sort(function(a,b){ return b.surplus - a.surplus; });

        var di=0;
        for (var ri=0; ri<receivers.length && di<donors.length; ri++){
          var rec=receivers[ri];
          var to=st.get(rec.id);
          if (!to) continue;
          while (di<donors.length && rec.need>0){
            var d=donors[di];
            if (d.surplus<=0){ di++; continue; }
            var from=st.get(d.id);
            if (!from){ di++; continue; }
            var sent=applySend(from,to,rk,Math.min(d.surplus,rec.need),'SUR');
            if (sent<=0){ di++; continue; }
            d.surplus-=sent;
            rec.need-=sent;
          }
        }
      });
    }

    var shipments = compileShipments(st);

    return {
      shipments: shipments,
      states: st,
      senderIds: senderIds,
      targetIds: targetIds,
      surplusIds: surplusIds,
      capPct: capPct,
      tolPct: tol,
      ironTolPct: (ironTol == null ? tol : ironTol),
      trade: null,
    };
  }

function planFunnel(allIds, targetIds, surplusIds, snapshotsById, incomingMap, capPct, surplusCapPct, reservePct, ironDeltaPct) {
    var tSet = {}; targetIds.forEach(function (v) { tSet[String(v)] = true; });
    var sSet = {}; (surplusIds || []).forEach(function (v) { sSet[String(v)] = true; });

    surplusIds = (surplusIds || []).filter(function (id) { return !tSet[String(id)]; });
    // v17: Sender list should NOT be nulled by Surplus selection; only exclude Targets.
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

  Y.log('compute module loaded ✅');
})();

;
(function () {
  'use strict';

  var Y = window.YRO_V17;
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
#${Y.cfg.PANEL_ID} #yro_content_v17{
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
<div class="yro_hdr" id="yro_drag_v17" style="cursor:move;">
  <div class="yro_ttl"><span class="icon header wood"></span> Resource Orchestrator <span class="yro_small">(v17)</span></div>
  <div style="display:flex; align-items:center;">
    <span class="yro_dev">Developed by controleng</span>
    <button class="yro_btn" id="yro_close_v17">✖</button>
  </div>
</div>

<div class="yro_toolbar">
  <button class="yro_btn btn-confirm" id="yro_load_v17">Load / Refresh (Full Scan)</button>
  <div class="yro_progress_outer"><div class="yro_progress_inner" id="yro_prog_bar_v17"></div></div>
  <span id="yro_prog_txt_v17" class="yro_small">0/0 - Ready</span>

  <span class="yro_small"><b>Search:</b></span>
  <input type="text" id="yro_search_v17" placeholder="Village adı…" style="width:180px;">

  <button class="yro_btn btn-confirm" id="yro_copy_bb_v17">Copy BBCode</button>
</div>

<div class="yro_msg" id="yro_msg_v17" style="color:#0a6;">Hazır ✅</div>

<div id="yro_content_v17">
  <div class="yro_sec_head">
    <div>1) Villages — Production (per hour + 24h) (<span id="yro_t1_title_v17">All villages</span>)</div>
    <div class="yro_sec_controls">
      <button class="yro_mini" id="yro_t1_toggle_v17">${st.ui.minimized1 ? 'Expand' : 'Minimize'}</button>
      <span class="yro_small"><b>Group:</b></span>
      <select id="yro_t1_group_sel_v17"></select>
      <button class="yro_mini" id="yro_t1_pick_v17">Pick…</button>
    </div>
  </div>
  <div class="yro_scroll" id="yro_t1_wrap_v17" style="${st.ui.minimized1 ? 'display:none;' : ''}">
    <table class="yro_table" id="yro_t1_tbl_v17"></table>
  </div>

  <div class="yro_sec_head">
    <div>2) Villages — Current + Incoming + Outgoing (per village) (<span id="yro_t2_title_v17">All villages</span>)</div>
    <div class="yro_sec_controls">
      <button class="yro_mini" id="yro_t2_toggle_v17">${st.ui.minimized2 ? 'Expand' : 'Minimize'}</button>
      <span class="yro_small"><b>Group:</b></span>
      <select id="yro_t2_group_sel_v17"></select>
      <button class="yro_mini" id="yro_t2_pick_v17">Pick…</button>
      <span class="yro_small" id="yro_scan_ts_v17"></span>
    </div>
  </div>
  <div class="yro_scroll" id="yro_t2_wrap_v17" style="${st.ui.minimized2 ? 'display:none;' : ''}">
    <table class="yro_table" id="yro_t2_tbl_v17"></table>
  </div>

  <div class="yro_sec_head">
    <div>3) Orchestrator — Tri-balance + Surplus Fill (biggest storage first)</div>
    <div class="yro_sec_controls"><span class="yro_small">Mode: satırın boş alanına tıkla.</span></div>
  </div>

  <div class="yro_mode_box" id="yro_modes_v17"></div>

  <div class="yro_msg" id="yro_plan_meta_v17" style="margin-top:8px;">
    <b>Mode:</b> - | <b>Cap%:</b> - | <b>Reserve(each):</b> - | <b>Surplus Cap%:</b> - | <b>Tol%:</b> - | <b>Iron Δ%:</b> - | <b>Shipments:</b> 0
  </div>

  <div class="yro_scroll">
    <table class="yro_table" id="yro_plan_target_tbl_v17"></table>
  </div>
  <div class="yro_scroll" style="margin-top:8px;">
    <table class="yro_table" id="yro_plan_surplus_tbl_v17"></table>
  </div>
  <div class="yro_scroll" style="margin-top:8px;">
    <table class="yro_table" id="yro_plan_ship_tbl_v17"></table>
  </div>
</div>
    `;

    document.body.appendChild(root);
    return root;
  }

  function setMsg(text, color) {
    var el = Y.qs('#yro_msg_v17');
    if (!el) return;
    el.textContent = text;
    if (color) el.style.color = color;
  }

  function setProgress(step, total, text) {
    var bar = Y.qs('#yro_prog_bar_v17');
    var tx = Y.qs('#yro_prog_txt_v17');
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

    fill('#yro_t1_group_sel_v17', st.groups.sel1);
    fill('#yro_t2_group_sel_v17', st.groups.sel2);
  }

  function buildModesBox(groups) {
    var st = Y.state;
    groups = Array.isArray(groups) ? groups : [];

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

    var wrap = Y.qs('#yro_modes_v17');
    if (!wrap) return;

    wrap.innerHTML = `
<div class="yro_mode_row ${st.orchestrator.mode === 'balance' ? 'active' : ''}" data-mode="balance">
  <div class="yro_mode_left">
    <div class="yro_mode_title">Mode A: Balance Group</div>
    <div class="yro_mode_desc">Target tri-balance + artanı Surplus'a (biggest storage first) doldurur.</div>
  </div>
  <div class="yro_mode_controls">
    <div class="yro_kv"><label title="Target group: villages that should be filled and balanced.">Target</label><select id="yro_A_target_v17">${optionsHTML(st.groups.A_target)}</select></div>
    <button class="yro_mini" id="pick_A_target_v17">Pick…</button>

    <div class="yro_kv"><label title="Optional. Extra resources (leftovers) can be parked into this group after the Target is filled.">Surplus</label><select id="yro_A_surplus_v17">${optionsHTML(st.groups.A_surplus)}</select></div>
    <button class="yro_mini" id="pick_A_surplus_v17">Pick…</button>

    <div class="yro_kv"><label title="Cap% is the target fill level per resource (Wood/Clay/Iron) as a percent of Storage. In Push mode it is auto-calculated.">Cap%</label><input id="yro_A_cap_v17" type="number" min="1" max="100" step="1" value="${st.orchestrator.cap}" style="width:60px;"></div>
    <div class="yro_kv"><label title="Maximum fill for Surplus villages (as % of Storage per resource).">Surplus Cap%</label><input id="yro_A_scap_v17" type="number" min="1" max="100" step="1" value="${st.orchestrator.scap}" style="width:60px;"></div>

    <div class="yro_kv"><label title="Tolerance controls how far Wood and Clay may deviate from the target level (Cap%). Example: Tolerance 5 means around 1000 you allow 950–1050.">Tolerance%</label><input id="yro_A_tol_v17" type="number" min="0" max="25" step="1" value="${st.orchestrator.tolerance!=null?st.orchestrator.tolerance:5}" style="width:60px;"></div>

    <div class="yro_kv"><label title="Optional. If left empty, Iron uses the same tolerance as Wood/Clay. If set, Iron can deviate from the target level (Cap%) by this percent. Example: Iron Δ 20 means around 1000 you allow 800–1200 (for iron only).">Iron Δ%</label><input id="yro_A_iron_v17" type="number" min="0" max="50" step="1" value="${st.orchestrator.ironDelta==null?'':st.orchestrator.ironDelta}" placeholder="(same as Tol)" style="width:80px;"></div>


    <div class="yro_kv"><label>Iron Δ%</label><input id="yro_A_iron_v17" type="number" min="-50" max="50" step="1" value="${st.orchestrator.ironDelta}" style="width:60px;" title="Iron hedefi: Wood/Clay’e göre yüzde fark. Örn -30 => 100/100/70, +30 => 100/100/130"></div>

    <button class="yro_btn btn-confirm" id="yro_A_plan_v17">Plan</button>
    <button class="yro_btn btn-confirm" id="yro_A_exec_v17">Execute</button>
  </div>
</div>

<div class="yro_mode_row ${st.orchestrator.mode === 'push' ? 'active' : ''}" data-mode="push">
  <div class="yro_mode_left">
    <div class="yro_mode_title">Mode B: Push / Feed</div>
    <div class="yro_mode_desc">Sender → Target tri-balance, kalan fazlayı Surplus'a doldurur.</div>
  </div>
  <div class="yro_mode_controls">
    <div class="yro_kv"><label title="Sender group: villages that will send resources to the Target group.">Sender</label><select id="yro_B_sender_v17">${optionsHTML(st.groups.B_sender)}</select></div>
    <button class="yro_mini" id="pick_B_sender_v17">Pick…</button>

    <div class="yro_kv"><label title="Target group: villages that should be filled and balanced.">Target</label><select id="yro_B_target_v17">${optionsHTML(st.groups.B_target)}</select></div>
    <button class="yro_mini" id="pick_B_target_v17">Pick…</button>

    <div class="yro_kv"><label title="Optional. Extra resources (leftovers) can be parked into this group after the Target is filled.">Surplus</label><select id="yro_B_surplus_v17">${optionsHTML(st.groups.B_surplus)}</select></div>
    <button class="yro_mini" id="pick_B_surplus_v17">Pick…</button>

    <div class="yro_kv"><label title="Reserve% keeps at least this percent of Storage in EACH resource at sender villages (safety floor).">Reserve%</label><input id="yro_B_reserve_v17" type="number" min="0" max="100" step="1" value="${st.orchestrator.reserve}" style="width:60px;"></div>
    <div class="yro_kv"><label title="Cap% is the target fill level per resource (Wood/Clay/Iron) as a percent of Storage. In Push mode it is auto-calculated.">Cap%</label><input id="yro_B_cap_v17" type="number" min="1" max="100" step="1" value="${st.orchestrator.cap}" style="width:60px;" disabled title="Auto calculated. The script chooses the highest feasible Cap% so that all TARGET villages reach a similar fill level within tolerance."></div>
    <div class="yro_kv"><label title="Maximum fill for Surplus villages (as % of Storage per resource).">Surplus Cap%</label><input id="yro_B_scap_v17" type="number" min="1" max="100" step="1" value="${st.orchestrator.scap}" style="width:60px;"></div>

    <div class="yro_kv"><label title="Tolerance controls how far Wood and Clay may deviate from the target level (Cap%). Example: Tolerance 5 means around 1000 you allow 950–1050.">Tolerance%</label><input id="yro_B_tol_v17" type="number" min="0" max="25" step="1" value="${st.orchestrator.tolerance!=null?st.orchestrator.tolerance:5}" style="width:60px;"></div>

    <div class="yro_kv"><label title="Optional. If left empty, Iron uses the same tolerance as Wood/Clay. If set, Iron can deviate from the target level (Cap%) by this percent. Example: Iron Δ 20 means around 1000 you allow 800–1200 (for iron only).">Iron Δ%</label><input id="yro_B_iron_v17" type="number" min="0" max="50" step="1" value="${st.orchestrator.ironDelta==null?'':st.orchestrator.ironDelta}" placeholder="(same as Tol)" style="width:80px;"></div>


    <div class="yro_kv"><label>Iron Δ%</label><input id="yro_B_iron_v17" type="number" min="-50" max="50" step="1" value="${st.orchestrator.ironDelta}" style="width:60px;" title="Iron hedefi: Wood/Clay’e göre yüzde fark."></div>

    <button class="yro_btn btn-confirm" id="yro_B_plan_v17">Plan</button>
    <button class="yro_btn btn-confirm" id="yro_B_exec_v17">Execute</button>
  </div>
</div>

<div class="yro_mode_row ${st.orchestrator.mode === 'funnel' ? 'active' : ''}" data-mode="funnel">
  <div class="yro_mode_left">
    <div class="yro_mode_title">Mode C: Funnel / Hoard</div>
    <div class="yro_mode_desc">Target dışındaki herkes → Target (cap'e kadar), kalan Surplus'a.</div>
  </div>
  <div class="yro_mode_controls">
    <div class="yro_kv"><label title="Target group: villages that should be filled and balanced.">Target</label><select id="yro_C_target_v17">${optionsHTML(st.groups.C_target)}</select></div>
    <button class="yro_mini" id="pick_C_target_v17">Pick…</button>

    <div class="yro_kv"><label title="Optional. Extra resources (leftovers) can be parked into this group after the Target is filled.">Surplus</label><select id="yro_C_surplus_v17">${optionsHTML(st.groups.C_surplus)}</select></div>
    <button class="yro_mini" id="pick_C_surplus_v17">Pick…</button>

    <div class="yro_kv"><label title="Reserve% keeps at least this percent of Storage in EACH resource at sender villages (safety floor).">Reserve%</label><input id="yro_C_reserve_v17" type="number" min="0" max="100" step="1" value="${st.orchestrator.reserve}" style="width:60px;"></div>
    <div class="yro_kv"><label title="Cap% is the target fill level per resource (Wood/Clay/Iron) as a percent of Storage. In Push mode it is auto-calculated.">Cap%</label><input id="yro_C_cap_v17" type="number" min="1" max="100" step="1" value="${st.orchestrator.cap}" style="width:60px;"></div>
    <div class="yro_kv"><label title="Maximum fill for Surplus villages (as % of Storage per resource).">Surplus Cap%</label><input id="yro_C_scap_v17" type="number" min="1" max="100" step="1" value="${st.orchestrator.scap}" style="width:60px;"></div>

    <div class="yro_kv"><label title="Tolerance controls how far Wood and Clay may deviate from the target level (Cap%). Example: Tolerance 5 means around 1000 you allow 950–1050.">Tolerance%</label><input id="yro_C_tol_v17" type="number" min="0" max="25" step="1" value="${st.orchestrator.tolerance!=null?st.orchestrator.tolerance:5}" style="width:60px;"></div>

    <div class="yro_kv"><label title="Optional. If left empty, Iron uses the same tolerance as Wood/Clay. If set, Iron can deviate from the target level (Cap%) by this percent. Example: Iron Δ 20 means around 1000 you allow 800–1200 (for iron only).">Iron Δ%</label><input id="yro_C_iron_v17" type="number" min="0" max="50" step="1" value="${st.orchestrator.ironDelta==null?'':st.orchestrator.ironDelta}" placeholder="(same as Tol)" style="width:80px;"></div>


    <div class="yro_kv"><label>Iron Δ%</label><input id="yro_C_iron_v17" type="number" min="-50" max="50" step="1" value="${st.orchestrator.ironDelta}" style="width:60px;" title="Iron hedefi: Wood/Clay’e göre yüzde fark."></div>

    <button class="yro_btn btn-confirm" id="yro_C_plan_v17">Plan</button>
    <button class="yro_btn btn-confirm" id="yro_C_exec_v17">Execute</button>
  </div>
</div>
    `;
  }

  function enableDrag(panel) {
    var st = Y.state;
    var hdr = Y.qs('#yro_drag_v17');
    if (!hdr || !panel) return;

    var dragging = false, startX = 0, startY = 0, startL = 0, startT = 0;

    Y.on(hdr, 'mousedown', function (e) {
      if (e.target && e.target.id === 'yro_close_v17') return;
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
  <button class="yro_btn" id="yro_picker_close_v17">✖</button>
</div>
<div class="yro_modal_body">
  <div class="yro_modal_toolbar">
    <span class="yro_small"><b>Search:</b></span>
    <input type="text" id="yro_picker_search_v17" style="width:220px;" placeholder="name / coord">
    <button class="yro_btn" id="yro_picker_all_v17">Select all</button>
    <button class="yro_btn" id="yro_picker_none_v17">Select none</button>
    <span class="yro_small" id="yro_picker_count_v17"></span>
  </div>
  <table class="yro_modal_list" id="yro_picker_tbl_v17">
    <tr><th></th><th>Village</th><th>Coord</th><th class="yro_right">Storage</th></tr>
  </table>
</div>
<div class="yro_modal_foot">
  <button class="yro_btn" id="yro_picker_cancel_v17">Cancel</button>
  <button class="yro_btn btn-confirm" id="yro_picker_save_v17">Kaydet</button>
</div>
    `;

    overlay.appendChild(box);
    document.body.appendChild(overlay);

    function updateCount() {
      var el = box.querySelector('#yro_picker_count_v17');
      if (el) el.textContent = 'Selected: ' + selected.size;
    }

    function renderList(filterText) {
      filterText = String(filterText || '').toLowerCase();
      var tbl = box.querySelector('#yro_picker_tbl_v17');
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

    box.querySelector('#yro_picker_close_v17').addEventListener('click', close);
    box.querySelector('#yro_picker_cancel_v17').addEventListener('click', close);

    box.querySelector('#yro_picker_all_v17').addEventListener('click', function () {
      candidates.forEach(function (v) { selected.add(String(v.id)); });
      renderList(box.querySelector('#yro_picker_search_v17').value);
    });

    box.querySelector('#yro_picker_none_v17').addEventListener('click', function () {
      selected.clear();
      renderList(box.querySelector('#yro_picker_search_v17').value);
    });

    box.querySelector('#yro_picker_save_v17').addEventListener('click', function () {
      var ids = Array.from(selected).map(function (s) { return Y.safeInt(s, 0); }).filter(Boolean);
      try { onSaveCallback(ids); } catch (e) {}
      close();
    });

    box.querySelector('#yro_picker_search_v17').addEventListener('input', Y.debounce(function (e) {
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

    var tbl = Y.qs('#yro_t1_tbl_v17');
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
  <td><b>TOPLAM</b> <span class="yro_small">(${rows.length} köy)</span></td>
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

    var tbl = Y.qs('#yro_t2_tbl_v17');
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
  <td><b>TOPLAM</b> <span class="yro_small">(${rows.length} köy)</span></td>
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

    var ts = Y.qs('#yro_scan_ts_v17');
    if (ts) ts.textContent = 'Last scan: ' + (Y.state.cache.lastFullScanAt ? new Date(Y.state.cache.lastFullScanAt).toLocaleTimeString() : '-');
  }

  function renderPlanTables(plan, snapshotsById) {
    var metaEl = Y.qs('#yro_plan_meta_v17');
    if (metaEl) {
      metaEl.innerHTML =
        '<b>Mode:</b> ' + String(plan.mode || '-').toUpperCase() + ' | ' +
        '<b>Cap%:</b> ' + plan.meta.cap + ' | ' +
        '<b>Reserve(each):</b> ' + plan.meta.reserve + ' | ' +
        '<b>Surplus Cap%:</b> ' + plan.meta.scap + ' | ' + '<b>Tol%:</b> ' + (plan.meta.tol!=null?plan.meta.tol:5) + ' | ' + '<b>Iron Δ%:</b> ' + (plan.meta.ironDelta==null?('same'):plan.meta.ironDelta) + ' | ' +
        '<b>Shipments:</b> ' + (plan.shipments ? plan.shipments.length : 0);
    }

    var tTbl = Y.qs('#yro_plan_target_tbl_v17');
    var sTbl = Y.qs('#yro_plan_surplus_tbl_v17');
    var shTbl = Y.qs('#yro_plan_ship_tbl_v17');

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
      if (!ids || !ids.length) return html + `<tr><td colspan="9">-</td></tr>`;
      ids.forEach(function (vid) {
        var r = rowsById[vid];
        if (!r) return;
        html += `
<tr>
  <td><b>${String(r.name)}</b></td>
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

    if (shTbl) {
      var html2 = `
<tr>
  <th>#</th><th>From</th><th>To</th>
  <th class="yro_right">Wood</th><th class="yro_right">Clay</th><th class="yro_right">Iron</th>
  <th class="yro_right">Total</th><th class="yro_center">Merch</th><th class="yro_center">Tag</th>
</tr>`;
      var ships = plan.shipments || [];
      if (!ships.length) {
        html2 += `<tr><td colspan="9">No shipments.</td></tr>`;
      } else {
        ships.forEach(function (s, idx) {
          var fn = snapshotsById[s.from] ? snapshotsById[s.from].name : String(s.from);
          var tn = snapshotsById[s.to] ? snapshotsById[s.to].name : String(s.to);
          html2 += `
<tr>
  <td class="yro_right">${idx + 1}</td>
  <td><b>${fn}</b></td>
  <td><b>${tn}</b></td>
  <td class="yro_right">${Y.formatTwNumber(s.wood)}</td>
  <td class="yro_right">${Y.formatTwNumber(s.clay)}</td>
  <td class="yro_right">${Y.formatTwNumber(s.iron)}</td>
  <td class="yro_right"><b>${Y.formatTwNumber(s.total)}</b></td>
  <td class="yro_center">${s.merch}</td>
  <td class="yro_center">${s.tag || ''}</td>
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

  Y.log('ui module loaded ✅');
})();

;
(function () {
  'use strict';

  var Y = window.YRO_V17;
  if (!Y) return;

  function groupNameById(gid) {
    gid = Y.safeInt(gid, 0);
    var g = (Y.state.groups.list || []).find(function (x) { return Y.safeInt(x.id, 0) === gid; }, function () { if (panel) panel.style.display = prevDisplay || ''; });
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
      out[Y.safeInt(fromId, 0)] = { wood: f.wood || 0, clay: f.clay || 0, iron: f.iron || 0, total: f.total || 0 };
    });
    return out;
  }

  async function loadTables(forceGroupFetch) {
    var st = Y.state;

    var t1gid = Y.safeInt(st.groups.sel1, 0);
    var t1ids = await resolveSelection(t1gid, 't1', forceGroupFetch);
    var t1title = Y.qs('#yro_t1_title_v17');
    if (t1title) t1title.textContent = groupNameById(t1gid);

    var t2gid = Y.safeInt(st.groups.sel2, 0);
    var t2ids = await resolveSelection(t2gid, 't2', forceGroupFetch);
    var t2title = Y.qs('#yro_t2_title_v17');
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
      Y.ui.setMsg('Custom selection kaydedildi: ' + key + ' (' + selectedIds.length + ' villages)', '#0a6');
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
      iron: s.iron || 0,
    };

    return new Promise(function (resolve, reject) {
      try {
        TribalWars.post('market', { ajaxaction: 'map_send', village: s.from }, data,
          function (resp) { resolve(resp); },
          function (e) { reject(e); }
        );
      } catch (e2) { reject(e2); }
    });
  }

  function confirmTwoButtons(htmlMsg, onYes, onCancel) {
    var actions = [
      { text: 'Execute', callback: onYes, confirm: true },
      { text: 'Cancel', callback: function () { try { if (onCancel) onCancel(); } catch (e) {} }, cancel: true },
    ];
    if (window.UI && UI.ConfirmationBox) UI.ConfirmationBox(htmlMsg, actions, 'yro_exec_v17', true);
    else {
      var ok = confirm(htmlMsg.replace(/<br\/>/g, '
').replace(/<[^>]*>/g, ''));
      if (ok) onYes();
      else if (onCancel) onCancel();
    }
  }


  function executeTabs() {
    var plan = Y.runtime.plan;
    var shipments = (plan && plan.shipments) ? plan.shipments : [];
    if (!shipments.length) { Y.ui.setMsg('No plan to execute.', '#b00'); return; }

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
    if (!shipments.length) { Y.ui.setMsg('No plan to execute.', '#b00'); return; }

    var panel = Y.qs('#' + Y.cfg.PANEL_ID);
    var prevDisplay = panel ? panel.style.display : '';
    if (panel) panel.style.display = 'none';

    confirmTwoButtons('Execute?<br/>Shipments: <b>' + shipments.length + '</b>', async function () {
      var ok = 0, fail = 0;

      for (var i = 0; i < shipments.length; i++) {
        var s = shipments[i];
        Y.ui.setProgress(i + 1, shipments.length, 'Sending ' + s.from + ' → ' + s.to);

        try {
          var resp = await sendOneShipmentAjax(s);
          ok++;
          if (window.UI && UI.SuccessMessage) UI.SuccessMessage((resp && resp.message) ? resp.message : 'Sent ✅', 600);
        } catch (e) {
          fail++;
          if (window.UI && UI.ErrorMessage) UI.ErrorMessage('Failed ❌ (ok ' + ok + ' / fail ' + fail + ')', 1200);
        }
        await Y.sleep(Y.cfg.SEND_DELAY_MS);
      }

      if (panel) panel.style.display = prevDisplay || '';
      Y.ui.setMsg('Execution finished ✅ | ok=' + ok + ' | fail=' + fail, fail ? '#b00' : '#0a6');
    }, function () { if (panel) panel.style.display = prevDisplay || ''; });
  }

  async function planFromMode(mode) {
    mode = String(mode || '').toLowerCase();
    var st = Y.state;

    if (!st.cache || !Object.keys(st.cache.villages || {}).length) {
      Y.ui.setMsg('You must run Full Scan first (Load / Refresh).', '#b00');
      return;
    }

    function getSelValue(id) { var el = Y.qs(id); return el ? Y.safeInt(el.value, 0) : 0; }
    function getNumValue(id, d) { var el = Y.qs(id); return el ? Y.safeInt(el.value, d) : d; }

    var cap, scap, reserve;
    var targetGid = 0, senderGid = 0, surplusGid = 0;

    var targetIds = [], senderIds = [], surplusIds = [];
    var allIds = Object.keys(Y.runtime.snapshotsById || {}).map(function (k) { return Y.safeInt(k, 0); }).filter(Boolean);

    if (mode === 'balance') {
      targetGid = getSelValue('#yro_A_target_v17');
      surplusGid = getSelValue('#yro_A_surplus_v17');
      cap = getNumValue('#yro_A_cap_v17', 80);
      scap = getNumValue('#yro_A_scap_v17', 95);
      var ironDelta = getNumValue('#yro_A_iron_v17', 0);
      reserve = 0;

      targetIds = await resolveSelection(targetGid, 'A_target', true);
      surplusIds = await resolveSelection(surplusGid, 'A_surplus', true);

      var r = Y.compute.planBalance(targetIds, surplusIds, Y.runtime.snapshotsById, st.cache.incomingMap, cap, scap, ironDelta);

      Y.runtime.plan = {
        mode: mode,
        shipments: r.shipments,
        meta: { cap: cap, scap: scap, reserve: reserve, ironDelta: ironDelta, targetGid: targetGid, senderGid: 0, surplusGid: surplusGid },
        targetIds: r.targetIds,
        surplusIds: r.surplusIds,
        states: r.states,
        targetSummary: Y.compute.summarize(r.states, r.targetIds),
        surplusSummary: Y.compute.summarize(r.states, r.surplusIds),
      };

    } else if (mode === 'push') {
      senderGid = getSelValue('#yro_B_sender_v17');
      targetGid = getSelValue('#yro_B_target_v17');
      surplusGid = getSelValue('#yro_B_surplus_v17');
      reserve = getNumValue('#yro_B_reserve_v17', 1);
      cap = 0; // auto
      scap = getNumValue('#yro_B_scap_v17', 95);
      var tolPct = getNumValue('#yro_B_tol_v17', 5);
      var ironDeltaRawEl = Y.qs('#yro_B_iron_v17');
      var ironDelta = (ironDeltaRawEl && String(ironDeltaRawEl.value).trim() !== '') ? Y.safeInt(ironDeltaRawEl.value, 0) : null;

      senderIds = await resolveSelection(senderGid, 'B_sender', true);
      targetIds = await resolveSelection(targetGid, 'B_target', true);
      surplusIds = await resolveSelection(surplusGid, 'B_surplus', true);

      var r2 = Y.compute.planPush(senderIds, targetIds, surplusIds, Y.runtime.snapshotsById, st.cache.incomingMap, cap, scap, reserve, ironDelta);

      cap = (r2 && r2.capPct) ? r2.capPct : 0;
      var capEl = Y.qs('#yro_B_cap_v17'); if (capEl) capEl.value = cap;

      if (r2 && r2.trade) {
        var tr = r2.trade;
        var msg = 'Trade suggested: Sell ~' + Y.formatTwNumber(tr.sell.amount) + ' ' + tr.sell.res.toUpperCase() + ' → Buy ~' + Y.formatTwNumber(tr.buy.amount) + ' ' + tr.buy.res.toUpperCase();
        if (tr.suggestedVillage) msg += ' | Suggested village: ' + tr.suggestedVillage;
        Y.ui.setMsg(msg, '#b35b00');
        Y.runtime.plan = null;
        return;
      }

      Y.runtime.plan = {
        mode: mode,
        shipments: r2.shipments,
        meta: { cap: cap, scap: scap, reserve: reserve, tol: (r2 && r2.tolPct!=null?r2.tolPct:tolPct), ironDelta: (r2 && r2.ironTolPct!=null? ( (ironDelta==null)? null : ironDelta ) : ironDelta), targetGid: targetGid, senderGid: senderGid, surplusGid: surplusGid },
        targetIds: r2.targetIds,
        senderIds: r2.senderIds,
        surplusIds: r2.surplusIds,
        states: r2.states,
        targetSummary: Y.compute.summarize(r2.states, r2.targetIds),
        surplusSummary: Y.compute.summarize(r2.states, r2.surplusIds),
      };

    } else if (mode === 'funnel') {
      targetGid = getSelValue('#yro_C_target_v17');
      surplusGid = getSelValue('#yro_C_surplus_v17');
      reserve = getNumValue('#yro_C_reserve_v17', 1);
      cap = getNumValue('#yro_C_cap_v17', 80);
      scap = getNumValue('#yro_C_scap_v17', 95);
      var ironDelta = getNumValue('#yro_C_iron_v17', 0);

      targetIds = await resolveSelection(targetGid, 'C_target', true);
      surplusIds = await resolveSelection(surplusGid, 'C_surplus', true);

      var r3 = Y.compute.planFunnel(allIds, targetIds, surplusIds, Y.runtime.snapshotsById, st.cache.incomingMap, cap, scap, reserve, ironDelta);

      Y.runtime.plan = {
        mode: mode,
        shipments: r3.shipments,
        meta: { cap: cap, scap: scap, reserve: reserve, ironDelta: ironDelta, targetGid: targetGid, senderGid: 0, surplusGid: surplusGid },
        targetIds: r3.targetIds,
        senderIds: r3.senderIds,
        surplusIds: r3.surplusIds,
        states: r3.states,
        targetSummary: Y.compute.summarize(r3.states, r3.targetIds),
        surplusSummary: Y.compute.summarize(r3.states, r3.surplusIds),
      };

    } else {
      Y.ui.setMsg('Bilinmeyen mode: ' + mode, '#b00');
      return;
    }

    st.orchestrator.mode = mode;
    st.orchestrator.cap = cap;
    st.orchestrator.scap = scap;
    st.orchestrator.reserve = reserve;
    if (typeof tolPct !== 'undefined') st.orchestrator.tolerance = tolPct;
    st.orchestrator.ironDelta = (typeof ironDelta !== 'undefined') ? ironDelta : (st.orchestrator.ironDelta != null ? st.orchestrator.ironDelta : null);

    if (mode === 'balance') { st.groups.A_target = targetGid; st.groups.A_surplus = surplusGid; }
    if (mode === 'push') { st.groups.B_sender = senderGid; st.groups.B_target = targetGid; st.groups.B_surplus = surplusGid; }
    if (mode === 'funnel') { st.groups.C_target = targetGid; st.groups.C_surplus = surplusGid; }

    Y.saveState();

    Y.ui.renderPlanTables(Y.runtime.plan, Y.runtime.snapshotsById);
    Y.ui.setMsg('Plan ready ✅ | Shipments: ' + (Y.runtime.plan.shipments ? Y.runtime.plan.shipments.length : 0), '#0a6');
  }

  function copyBBCode() {
    var plan = Y.runtime.plan || { shipments: [] };
    var lines = [];
    lines.push('[quote][b]Yaver Resource Orchestrator[/b] (' + Y.ts() + ')');
    lines.push('[list]');
    lines.push('[*][b]Mode[/b]: ' + String(plan.mode || '-').toUpperCase());
    lines.push('[*][b]Cap%[/b]: ' + (plan.meta && plan.meta.cap != null ? plan.meta.cap : '-') + '%');
    lines.push('[*][b]Reserve(each)%[/b]: ' + (plan.meta && plan.meta.reserve != null ? plan.meta.reserve : '-') + '%');
    lines.push('[*][b]Surplus Cap%[/b]: ' + (plan.meta && plan.meta.scap != null ? plan.meta.scap : '-') + '%');
    lines.push('[*][b]Shipments[/b]: ' + (plan.shipments ? plan.shipments.length : 0));
    lines.push('[/list]');

    if (plan.shipments && plan.shipments.length) {
      lines.push('[b]Shipment Plan[/b]');
      lines.push('[table]');
      lines.push('[**]#[||]From[||]To[||]Wood[||]Clay[||]Iron[||]Total[||]Merch[||]Tag[/**]');
      plan.shipments.forEach(function (s, idx) {
        lines.push(
          '[*]' +
          (idx + 1) + '[|]' +
          s.from + '[|]' +
          s.to + '[|]' +
          Y.formatTwNumber(s.wood) + '[|]' +
          Y.formatTwNumber(s.clay) + '[|]' +
          Y.formatTwNumber(s.iron) + '[|]' +
          Y.formatTwNumber(s.total) + '[|]' +
          (s.merch || Math.ceil(s.total / 1000)) + '[|]' +
          (s.tag || '') +
          '[/*]'
        );
      });
      lines.push('[/table]');
    } else {
      lines.push('[i]No shipments.[/i]');
    }
    lines.push('[/quote]');

    var txt = lines.join('\n');
    navigator.clipboard.writeText(txt).then(function () {
      Y.ui.setMsg('BBCode copied ✅', '#0a6');
    }).catch(function () {
      window.prompt('Copy BBCode:', txt);
    });
  }

  async function loadAll(force) {
    try {
      Y.ui.setMsg('Full Scan started…', '#b35b00');
      Y.ui.setProgress(0, 1, 'Preparing');

      await Y.fetch.fetchGroupsList(!!force);

      // critical: fill selects + build modes
      Y.ui.fillGroupSelects(Y.state.groups.list);
      Y.ui.buildModesBox(Y.state.groups.list);

      await Y.fetch.fullScanAllVillages(!!force, function (done, total, msg) {
        Y.ui.setProgress(done, total, msg);
      });

      await loadTables(false);

      Y.ui.setProgress(1, 1, 'Ready');
      Y.ui.setMsg('Ready ✅ (Full Scan completed)', '#0a6');
    } catch (e) {
      Y.err('loadAll failed', e);
      Y.ui.setMsg('Hata ❌ (console log kontrol et)', '#b00');
    }
  }

  function bindEvents() {
    var st = Y.state;

    Y.on(Y.qs('#yro_close_v17'), 'click', function () { Y.destroy(); });

    Y.on(Y.qs('#yro_load_v17'), 'click', function () { loadAll(true); });

    var search = Y.qs('#yro_search_v17');
    if (search) {
      search.value = st.ui.search || '';
      Y.on(search, 'input', Y.debounce(function () {
        st.ui.search = search.value || '';
        Y.saveState();
        loadTables(false);
      }, 160));
    }

    Y.on(Y.qs('#yro_t1_toggle_v17'), 'click', function () {
      st.ui.minimized1 = !st.ui.minimized1;
      var w = Y.qs('#yro_t1_wrap_v17');
      if (w) w.style.display = st.ui.minimized1 ? 'none' : '';
      var b = Y.qs('#yro_t1_toggle_v17');
      if (b) b.textContent = st.ui.minimized1 ? 'Expand' : 'Minimize';
      Y.saveState();
    });

    Y.on(Y.qs('#yro_t2_toggle_v17'), 'click', function () {
      st.ui.minimized2 = !st.ui.minimized2;
      var w = Y.qs('#yro_t2_wrap_v17');
      if (w) w.style.display = st.ui.minimized2 ? 'none' : '';
      var b = Y.qs('#yro_t2_toggle_v17');
      if (b) b.textContent = st.ui.minimized2 ? 'Expand' : 'Minimize';
      Y.saveState();
    });

    Y.on(Y.qs('#yro_t1_group_sel_v17'), 'change', function (e) {
      st.groups.sel1 = Y.safeInt(e.target.value, 0);
      Y.saveState();
      loadTables(true);
    });

    Y.on(Y.qs('#yro_t2_group_sel_v17'), 'change', function (e) {
      st.groups.sel2 = Y.safeInt(e.target.value, 0);
      Y.saveState();
      loadTables(true);
    });

    Y.on(Y.qs('#yro_t1_pick_v17'), 'click', function () { openPicker('t1'); });
    Y.on(Y.qs('#yro_t2_pick_v17'), 'click', function () { openPicker('t2'); });

    Y.on(Y.qs('#yro_copy_bb_v17'), 'click', function () { copyBBCode(); });

    var modeBox = Y.qs('#yro_modes_v17');
    if (modeBox) {
      // click delegation
      Y.on(modeBox, 'click', function (e) {
        var t = e.target;
        if (!t) return;

        if (t.id === 'yro_A_plan_v17') return planFromMode('balance');
        if (t.id === 'yro_B_plan_v17') return planFromMode('push');
        if (t.id === 'yro_C_plan_v17') return planFromMode('funnel');

        if (t.id === 'yro_A_exec_v17' || t.id === 'yro_B_exec_v17' || t.id === 'yro_C_exec_v17') return executePlan();

        if (String(t.id || '').startsWith('pick_') && String(t.id).endsWith('_v17')) {
          var key = String(t.id).replace('pick_', '').replace('_v17', '');
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
            Y.qsa('#yro_modes_v17 .yro_mode_row').forEach(function (r) { r.classList.remove('active'); });
            row.classList.add('active');
          }
        }
      });

      // change delegation (persist inputs/selects)
      Y.on(modeBox, 'change', function (e) {
        var t = e.target;
        if (!t || !t.id) return;

        if (t.id === 'yro_A_target_v17') st.groups.A_target = Y.safeInt(t.value, 0);
        else if (t.id === 'yro_A_surplus_v17') st.groups.A_surplus = Y.safeInt(t.value, 0);
        else if (t.id === 'yro_B_sender_v17') st.groups.B_sender = Y.safeInt(t.value, 0);
        else if (t.id === 'yro_B_target_v17') st.groups.B_target = Y.safeInt(t.value, 0);
        else if (t.id === 'yro_B_surplus_v17') st.groups.B_surplus = Y.safeInt(t.value, 0);
        else if (t.id === 'yro_C_target_v17') st.groups.C_target = Y.safeInt(t.value, 0);
        else if (t.id === 'yro_C_surplus_v17') st.groups.C_surplus = Y.safeInt(t.value, 0);

        else if (t.id === 'yro_A_cap_v17' || t.id === 'yro_B_cap_v17' || t.id === 'yro_C_cap_v17') st.orchestrator.cap = Y.safeInt(t.value, st.orchestrator.cap);
        else if (t.id === 'yro_A_scap_v17' || t.id === 'yro_B_scap_v17' || t.id === 'yro_C_scap_v17') st.orchestrator.scap = Y.safeInt(t.value, st.orchestrator.scap);
        else if (t.id === 'yro_B_reserve_v17' || t.id === 'yro_C_reserve_v17') st.orchestrator.reserve = Y.safeInt(t.value, st.orchestrator.reserve);

        Y.saveState();
      });
    }
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
      Y.ui.setMsg('Ready ✅ (cache available) — run Full Scan if you want fresh data', '#0a6');
    }
  }

  Y.init = init;

  Y.log('main module loaded ✅');
})();
