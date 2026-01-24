(function () {
  'use strict';

  var Y = window.YRO_V10;
  if (!Y) return;

  // --- helpers to map columns by header icons/text ---
  function mapColumns(table) {
    var map = {};
    var ths = Y.qsa('tr th', table);
    ths.forEach(function (th, idx) {
      var html = th.innerHTML || '';
      var txt = (th.textContent || '').trim().toLowerCase();

      if (idx === 0) map.village = 0;

      if (txt === 'points' || txt.indexOf('points') >= 0) map.points = idx;

      // icons
      if (html.indexOf('icon header wood') >= 0 || txt.indexOf('wood') >= 0) map.wood = idx;
      if (html.indexOf('icon header stone') >= 0 || txt.indexOf('clay') >= 0 || txt.indexOf('stone') >= 0)
        map.clay = idx;
      if (html.indexOf('icon header iron') >= 0 || txt.indexOf('iron') >= 0) map.iron = idx;

      // storage icon
      if (
        html.indexOf('icon header ressources') >= 0 ||
        html.indexOf('ressources') >= 0 ||
        html.indexOf('storage') >= 0 ||
        html.indexOf('storage.png') >= 0
      ) {
        // careful: "Total" also uses storage.png in some places.
        if (txt.indexOf('total') === -1 && txt.indexOf('cap') === -1) map.storage = idx;
      }

      // market merchants icon
      if (html.indexOf('market.png') >= 0 || txt.indexOf('merch') >= 0) map.merch = idx;

      // total
      if (txt === 'total' || txt.indexOf('total') >= 0) map.total = idx;
    });

    return map;
  }

  function findMainOverviewTable(doc) {
    // TribalWars overview tables usually have class "vis"
    // We'll choose the first table that contains village links with ?village=
    var tables = Y.qsa('table', doc);
    var best = null;
    var bestCount = 0;

    tables.forEach(function (t) {
      var links = Y.qsa('a[href*="village="]', t);
      if (links.length > bestCount) {
        bestCount = links.length;
        best = t;
      }
    });

    return best;
  }

  function extractVillageRows(table, colMap, mode) {
    var rows = [];
    var trs = Y.qsa('tr', table);
    trs.forEach(function (tr) {
      var tds = Y.qsa('td', tr);
      if (!tds || tds.length < 3) return;
      var a = tr.querySelector('a[href*="village="]');
      if (!a) return;

      var vid = Y.parseVillageIdFromHref(a.getAttribute('href'));
      if (!vid) return;

      var vtxt = (tds[colMap.village] ? tds[colMap.village].textContent : a.textContent) || '';
      var coords = Y.parseCoordsFromText(vtxt) || { x: 0, y: 0, k: 0 };

      var name = (a.textContent || '').trim() || vtxt.trim();

      var points = colMap.points != null && tds[colMap.points] ? Y.parseTwNumber(tds[colMap.points].textContent) : 0;

      if (mode === 'prod') {
        var w = colMap.wood != null && tds[colMap.wood] ? Y.parseTwNumber(tds[colMap.wood].textContent) : 0;
        var c = colMap.clay != null && tds[colMap.clay] ? Y.parseTwNumber(tds[colMap.clay].textContent) : 0;
        var i = colMap.iron != null && tds[colMap.iron] ? Y.parseTwNumber(tds[colMap.iron].textContent) : 0;
        var total = colMap.total != null && tds[colMap.total] ? Y.parseTwNumber(tds[colMap.total].textContent) : w + c + i;

        // per hour might be in title
        function perHour(idx) {
          if (idx == null || !tds[idx]) return 0;
          var b = tds[idx].querySelector('b') || tds[idx];
          var tit = (b.getAttribute('title') || '').toLowerCase();
          var m = tit.match(/per hour:\s*([\d\.\,]+)/i);
          return m ? Y.parseTwNumber(m[1]) : 0;
        }

        rows.push({
          id: vid,
          name: name,
          x: coords.x,
          y: coords.y,
          k: coords.k,
          points: points,
          prod24: { wood: w, clay: c, iron: i, total: total },
          prodH: { wood: perHour(colMap.wood), clay: perHour(colMap.clay), iron: perHour(colMap.iron) },
        });
      } else if (mode === 'res') {
        var storage = colMap.storage != null && tds[colMap.storage] ? Y.parseTwNumber(tds[colMap.storage].textContent) : 0;

        var merchText = colMap.merch != null && tds[colMap.merch] ? (tds[colMap.merch].textContent || '').trim() : '';
        // formats: "228/330" or "228 / 330"
        var mu = merchText.match(/(\d+)\s*\/\s*(\d+)/);
        var merchUsed = mu ? Y.safeInt(mu[1], 0) : 0;
        var merchTotal = mu ? Y.safeInt(mu[2], 0) : 0;

        var w2 = colMap.wood != null && tds[colMap.wood] ? Y.parseTwNumber(tds[colMap.wood].textContent) : 0;
        var c2 = colMap.clay != null && tds[colMap.clay] ? Y.parseTwNumber(tds[colMap.clay].textContent) : 0;
        var i2 = colMap.iron != null && tds[colMap.iron] ? Y.parseTwNumber(tds[colMap.iron].textContent) : 0;
        var total2 = colMap.total != null && tds[colMap.total] ? Y.parseTwNumber(tds[colMap.total].textContent) : w2 + c2 + i2;

        rows.push({
          id: vid,
          name: name,
          x: coords.x,
          y: coords.y,
          k: coords.k,
          points: points,
          storage: storage,
          merch: { used: merchUsed, total: merchTotal, free: Math.max(0, merchTotal - merchUsed) },
          res: { wood: w2, clay: c2, iron: i2, total: total2 },
        });
      }
    });

    // stable sort by name if possible
    rows.sort(function (a, b) {
      return String(a.name).localeCompare(String(b.name));
    });

    return rows;
  }

  // --- group list fetch ---
  // Pull groups from overview_villages production page select, because it contains BOTH manual+dynamic group ids
  async function fetchGroupsList(force) {
    var ttl = 12 * 60 * 60 * 1000; // 12h
    var st = Y.state;

    if (!force && st.cache.groupsFetchedAt && Date.now() - st.cache.groupsFetchedAt < ttl && st.groups.list && st.groups.list.length > 1) {
      return st.groups.list;
    }

    var url = Y.buildGameUrl('overview_villages', { mode: 'prod' });
    var html = await Y.httpGet(url);
    var doc = Y.parseHTML(html);

    var opts = [];
    // common ids: select[name="group_id"] OR select#group_id
    var sel =
      doc.querySelector('select[name="group_id"]') ||
      doc.querySelector('select#group_id') ||
      doc.querySelector('select[name="group"]') ||
      null;

    if (sel) {
      var options = Y.qsa('option', sel);
      options.forEach(function (o) {
        var val = Y.safeInt(o.getAttribute('value'), 0);
        var name = (o.textContent || '').trim();
        if (!name) return;
        opts.push({ id: val, name: name });
      });
    } else {
      // fallback: try groups page
      var url2 = Y.buildGameUrl('groups', { mode: 'overview' });
      var html2 = await Y.httpGet(url2);
      var doc2 = Y.parseHTML(html2);
      // find any select that has "All villages"
      var anySel = Y.qsa('select', doc2).find(function (s) {
        return (s.textContent || '').toLowerCase().indexOf('all villages') >= 0;
      });
      if (anySel) {
        Y.qsa('option', anySel).forEach(function (o) {
          var val = Y.safeInt(o.getAttribute('value'), 0);
          var name = (o.textContent || '').trim();
          if (!name) return;
          opts.push({ id: val, name: name });
        });
      }
    }

    // normalize: ensure All villages exists as 0
    if (!opts.some(function (g) { return g.id === 0; })) {
      opts.unshift({ id: 0, name: 'All villages' });
    }

    // de-dup by id
    var seen = {};
    var list = [];
    opts.forEach(function (g) {
      if (seen[g.id]) return;
      seen[g.id] = true;
      list.push(g);
    });

    st.groups.list = list;
    st.cache.groupsFetchedAt = Date.now();
    Y.saveState();

    return list;
  }

  // --- overview fetch with robust group param ---
  async function fetchOverviewDoc(mode, gid) {
    gid = Y.safeInt(gid, 0);

    // try candidates: group, group_id
    var candidates = [];
    if (gid && gid !== 0) {
      candidates.push(Y.buildGameUrl('overview_villages', { mode: mode, group: gid }));
      candidates.push(Y.buildGameUrl('overview_villages', { mode: mode, group_id: gid }));
      candidates.push(Y.buildGameUrl('overview_villages', { mode: mode, group_id: gid, group: gid }));
    } else {
      candidates.push(Y.buildGameUrl('overview_villages', { mode: mode }));
      candidates.push(Y.buildGameUrl('overview_villages', { mode: mode, group: 0 }));
      candidates.push(Y.buildGameUrl('overview_villages', { mode: mode, group_id: 0 }));
    }

    var best = { doc: null, rows: 0, url: candidates[0] };

    for (var i = 0; i < candidates.length; i++) {
      var url = candidates[i];
      var html = await Y.httpGet(url);
      var doc = Y.parseHTML(html);

      var table = findMainOverviewTable(doc);
      if (!table) continue;

      var cnt = Y.qsa('a[href*="village="]', table).length;
      if (cnt > best.rows) {
        best = { doc: doc, rows: cnt, url: url };
      }

      // if we already found many rows, stop early
      if (cnt >= 5) break;
    }

    return best.doc;
  }

  // --- production (24h) by group ---
  async function fetchProductionByGroup(gid, force) {
    var st = Y.state;
    gid = Y.safeInt(gid, 0);

    var ttl = 5 * 60 * 1000; // 5 minutes
    var key = String(gid);
    var cached = st.cache.prodByGroup[key];

    if (!force && cached && cached.at && Date.now() - cached.at < ttl && cached.rows) {
      return cached.rows;
    }

    var doc = await fetchOverviewDoc('prod', gid);
    if (!doc) return [];

    var table = findMainOverviewTable(doc);
    if (!table) return [];

    var colMap = mapColumns(table);
    var rows = extractVillageRows(table, colMap, 'prod');

    st.cache.prodByGroup[key] = { at: Date.now(), rows: rows };
    Y.saveState();
    return rows;
  }

  // --- resources by group ---
  async function fetchResourcesByGroup(gid, force) {
    var st = Y.state;
    gid = Y.safeInt(gid, 0);

    var ttl = 5 * 60 * 1000; // 5 minutes
    var key = String(gid);
    var cached = st.cache.resByGroup[key];

    if (!force && cached && cached.at && Date.now() - cached.at < ttl && cached.rows) {
      return cached.rows;
    }

    // Try likely modes that contain resources+storage+merchants
    var modes = ['resources', 'combined', 'storage', 'prod'];
    var bestRows = [];
    for (var i = 0; i < modes.length; i++) {
      var doc = await fetchOverviewDoc(modes[i], gid);
      if (!doc) continue;

      var table = findMainOverviewTable(doc);
      if (!table) continue;

      var colMap = mapColumns(table);
      var rows = extractVillageRows(table, colMap, 'res');

      // must have resource columns; otherwise ignore
      if (rows && rows.length) {
        bestRows = rows;
        break;
      }
    }

    st.cache.resByGroup[key] = { at: Date.now(), rows: bestRows };
    Y.saveState();
    return bestRows;
  }

  // --- incoming transports (global) ---
  // We parse market transports overview once, then reuse for any group totals
  async function fetchIncomingTransports(force) {
    var st = Y.state;
    var ttl = 2 * 60 * 1000; // 2 minutes

    if (!force && st.cache.incomingAt && Date.now() - st.cache.incomingAt < ttl && st.cache.incomingMap) {
      return st.cache.incomingMap;
    }

    var candidates = [
      Y.buildGameUrl('market', { mode: 'transports' }),
      Y.buildGameUrl('market', { mode: 'transport' }),
      Y.buildGameUrl('overview_villages', { mode: 'trader' }),
    ];

    var incomingMap = {}; // toVid -> {wood,clay,iron,total, byFrom:{fromVid:{...}}}
    var html = null;
    var doc = null;

    for (var i = 0; i < candidates.length; i++) {
      try {
        html = await Y.httpGet(candidates[i]);
        doc = Y.parseHTML(html);
        if (doc && doc.body && (doc.body.textContent || '').toLowerCase().indexOf('transport') >= 0) break;
      } catch (e) {}
    }

    if (!doc) {
      st.cache.incomingAt = Date.now();
      st.cache.incomingMap = incomingMap;
      Y.saveState();
      return incomingMap;
    }

    // Try to find a table that looks like transports: has village links and resource icons
    var tables = Y.qsa('table', doc);
    var t = null;
    for (var j = 0; j < tables.length; j++) {
      var h = tables[j].innerHTML || '';
      if (h.indexOf('icon header wood') >= 0 && h.indexOf('icon header iron') >= 0 && h.indexOf('village=') >= 0) {
        t = tables[j];
        break;
      }
    }
    if (!t) {
      st.cache.incomingAt = Date.now();
      st.cache.incomingMap = incomingMap;
      Y.saveState();
      return incomingMap;
    }

    var trs = Y.qsa('tr', t);
    trs.forEach(function (tr) {
      var tds = Y.qsa('td', tr);
      if (!tds || tds.length < 5) return;

      // heuristic:
      // there are usually "from" and "to" village columns (both with village links)
      var links = Y.qsa('a[href*="village="]', tr);
      if (!links || links.length < 1) return;

      // Attempt to detect from/to by text "→" or by column count.
      // We'll pick first link as "from", last link as "to".
      var fromVid = Y.parseVillageIdFromHref(links[0].getAttribute('href'));
      var toVid = Y.parseVillageIdFromHref(links[links.length - 1].getAttribute('href'));
      if (!toVid) return;

      // resources: find 3 cells that contain numbers and align with wood/clay/iron icons in header
      // easiest: scan tds for a sequence of 3 numeric cells (wood/clay/iron)
      var nums = [];
      for (var k = 0; k < tds.length; k++) {
        var tx = (tds[k].textContent || '').trim();
        if (!tx) continue;
        // skip time cells etc
        if (tx.match(/^\d[\d\.\,]*$/)) nums.push({ idx: k, val: Y.parseTwNumber(tx) });
      }
      if (nums.length < 3) return;

      // choose last 3 numeric entries as wood/clay/iron (works for most transport tables)
      var last3 = nums.slice(-3);
      var w = last3[0].val, c = last3[1].val, ii = last3[2].val;
      var total = w + c + ii;
      if (total <= 0) return;

      if (!incomingMap[toVid]) incomingMap[toVid] = { wood: 0, clay: 0, iron: 0, total: 0, byFrom: {} };
      incomingMap[toVid].wood += w;
      incomingMap[toVid].clay += c;
      incomingMap[toVid].iron += ii;
      incomingMap[toVid].total += total;

      var fk = fromVid ? String(fromVid) : '0';
      if (!incomingMap[toVid].byFrom[fk]) incomingMap[toVid].byFrom[fk] = { wood: 0, clay: 0, iron: 0, total: 0 };
      incomingMap[toVid].byFrom[fk].wood += w;
      incomingMap[toVid].byFrom[fk].clay += c;
      incomingMap[toVid].byFrom[fk].iron += ii;
      incomingMap[toVid].byFrom[fk].total += total;
    });

    st.cache.incomingAt = Date.now();
    st.cache.incomingMap = incomingMap;
    Y.saveState();

    return incomingMap;
  }

  Y.fetch = {
    fetchGroupsList: fetchGroupsList,
    fetchProductionByGroup: fetchProductionByGroup,
    fetchResourcesByGroup: fetchResourcesByGroup,
    fetchIncomingTransports: fetchIncomingTransports,
  };

  Y.log('fetch module loaded ✅');
})();
