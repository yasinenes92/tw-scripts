(function () {
  'use strict';

  var Y = window.YRO_V27;
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

  function parseCoinCostFromStorageItem(html) {
    var m = String(html || '').match(/BuildingSnob\.Modes\.train\.storage_item\s*=\s*(\{"wood":\d+,"stone":\d+,"iron":\d+,"id":"coin"\})/i);
    if (!m) return null;
    try {
      var data = JSON.parse(m[1]);
      var wood = Y.safeInt(data.wood, 0);
      var clay = Y.safeInt(data.stone, 0);
      var iron = Y.safeInt(data.iron, 0);
      if (wood <= 0 || clay <= 0 || iron <= 0) return null;
      return { wood: wood, clay: clay, iron: iron, total: wood + clay + iron };
    } catch (e) {
      return null;
    }
  }

  function parseCoinCostFromDom(doc) {
    if (!doc) return null;
    var woodEl = doc.querySelector('#coin_cost_wood');
    var clayEl = doc.querySelector('#coin_cost_stone');
    var ironEl = doc.querySelector('#coin_cost_iron');
    if (!woodEl || !clayEl || !ironEl) return null;
    var wood = Y.parseTwNumber(woodEl.textContent || '0');
    var clay = Y.parseTwNumber(clayEl.textContent || '0');
    var iron = Y.parseTwNumber(ironEl.textContent || '0');
    if (wood <= 0 || clay <= 0 || iron <= 0) return null;
    return { wood: wood, clay: clay, iron: iron, total: wood + clay + iron };
  }

  function parseCoinMintMax(doc) {
    if (!doc) return 0;
    var el = doc.querySelector('#coin_mint_fill_max');
    if (!el) return 0;
    var m = String(el.textContent || '').match(/(\d+)/);
    return m ? Y.safeInt(m[1], 0) : 0;
  }

  function parseSnobCoinInfo(vid, html) {
    var doc = Y.parseHTML(html);
    var cost = parseCoinCostFromStorageItem(html);
    var source = 'storage_item';
    if (!cost) {
      cost = parseCoinCostFromDom(doc);
      source = cost ? 'coin_cost_dom' : '';
    }
    return {
      id: Y.safeInt(vid, 0),
      cost: cost,
      mintMax: parseCoinMintMax(doc),
      source: source
    };
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

  async function fetchVillageCoinCost(vid, force) {
    var st = Y.state;
    vid = Y.safeInt(vid, 0);
    if (!vid) return null;

    var ttl = 2 * 60 * 1000;
    var cached = st.cache.coinCosts && st.cache.coinCosts[String(vid)];
    if (!force && cached && cached.at && Date.now() - cached.at < ttl && cached.cost) {
      return cached;
    }

    var url = '/game.php?village=' + vid + '&screen=snob';
    var html = await Y.httpGet(url, 30000);
    var parsed = parseSnobCoinInfo(vid, html);
    var gd = Y.extractUpdateGameData(html);
    var villageName = gd && gd.village && gd.village.display_name ? String(gd.village.display_name) : '';

    var out = {
      at: Date.now(),
      id: vid,
      villageName: villageName,
      mintMax: parsed.mintMax || 0,
      cost: parsed.cost || null,
      source: parsed.source || '',
      error: parsed.cost ? '' : 'Coin mint cost not found on academy page.'
    };

    st.cache.coinCosts[String(vid)] = out;
    Y.saveState();
    return out;
  }

  async function fetchCoinCostsForVillages(villageIds, force, onProgress) {
    villageIds = uniq(villageIds);
    onProgress = typeof onProgress === 'function' ? onProgress : function () {};

    var total = villageIds.length;
    var done = 0;
    var result = {};

    for (var i = 0; i < villageIds.length; i++) {
      var vid = Y.safeInt(villageIds[i], 0);
      if (!vid) continue;

      try {
        result[vid] = await fetchVillageCoinCost(vid, force);
      } catch (e) {
        result[vid] = {
          at: Date.now(),
          id: vid,
          villageName: '',
          mintMax: 0,
          cost: null,
          source: '',
          error: e && e.message ? e.message : 'Coin cost fetch failed.'
        };
      }

      done++;
      onProgress(done, total, 'Fetch academy cost ' + vid + ' (' + done + '/' + total + ')');
      await Y.sleep(150);
    }

    return result;
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
                Y.warn('HTTP 429 rate limit for village', vid, 'Ã¢â‚¬â€ waiting', wait + 'ms');
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
    fetchVillageCoinCost: fetchVillageCoinCost,
    fetchCoinCostsForVillages: fetchCoinCostsForVillages,
    fullScanAllVillages: fullScanAllVillages,
    rebuildGlobalMapsFromCache: rebuildGlobalMapsFromCache,
  };

  Y.log('fetch module loaded Ã¢Å“â€¦');
})();

