(function () {
  if (window.__YAVER_LA_MAIN_V2__) {
    console.log('[Yaver-LA] main_v2 already loaded');
    return;
  }
  window.__YAVER_LA_MAIN_V2__ = true;

  var BASE_SCRIPT_URL = 'https://cdn.jsdelivr.net/gh/yasinenes92/tw-scripts@main/Yaver-LA/main_v1.js';

  var CONFIG = {
    groupName: 'Offensive',
    holdKeyCode: 13,
    requestsPerSecond: 4,
    staleMinutesFull: 120,
    staleMinutesSeventyFive: 180,
    staleMinutesFifty: 240,
    maxWall: 3,
    lightCarry: 80,
    minLightByWall: { 0: 10, 1: 14, 2: 20, 3: 33 },
    scoutCount: 1,
    visibleRowsOnly: true
  };

  var STATE = {
    enterHeld: false,
    running: false,
    queue: [],
    stats: null,
    cachedCommandForm: null
  };

  function cacheBusted(url) {
    return url + (url.indexOf('?') >= 0 ? '&' : '?') + 'v=' + Date.now() + '_' + Math.random().toString(16).slice(2);
  }

  function loadScript(url) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = cacheBusted(url);
      s.onload = resolve;
      s.onerror = function () {
        reject(new Error('Script load failed: ' + url));
      };
      document.head.appendChild(s);
    });
  }

  function waitFor(predicate, timeoutMs, intervalMs) {
    timeoutMs = timeoutMs || 15000;
    intervalMs = intervalMs || 100;
    return new Promise(function (resolve, reject) {
      var started = Date.now();
      var timer = setInterval(function () {
        try {
          if (predicate()) {
            clearInterval(timer);
            resolve();
            return;
          }
          if (Date.now() - started >= timeoutMs) {
            clearInterval(timer);
            reject(new Error('waitFor timeout'));
          }
        } catch (err) {
          clearInterval(timer);
          reject(err);
        }
      }, intervalMs);
    });
  }

  function get$() {
    return window.top.$;
  }

  function uiInfo(msg, ms) {
    try {
      window.top.UI.InfoMessage(msg, ms || 1500);
    } catch (e) {
      console.log('[Yaver-LA]', msg);
    }
  }

  function uiSuccess(msg, ms) {
    try {
      window.top.UI.SuccessMessage(msg, ms || 1000);
    } catch (e) {
      console.log('[Yaver-LA]', msg);
    }
  }

  function uiError(msg, ms) {
    try {
      window.top.UI.ErrorMessage(msg, ms || 1500);
    } catch (e) {
      console.error('[Yaver-LA]', msg);
    }
  }

  function toInt(value, fallback) {
    var parsed = parseInt(String(value == null ? '' : value).replace(/[^\d-]/g, ''), 10);
    return isNaN(parsed) ? (fallback || 0) : parsed;
  }

  function distance(a, b) {
    var dx = a.x - b.x;
    var dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function sleep(ms) {
    return new Promise(function (resolve) {
      setTimeout(resolve, ms);
    });
  }

  function currentIntervalMs() {
    var req = CONFIG.requestsPerSecond > 0 ? CONFIG.requestsPerSecond : 4;
    return Math.max(250, Math.floor(1000 / req));
  }

  function isFocusable(el) {
    if (!el) return false;
    var tag = String(el.tagName || '').toUpperCase();
    return tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA';
  }

  function readCoord(text) {
    var m = String(text || '').match(/(\d{1,3})\|(\d{1,3})/);
    if (!m) return null;
    return {
      coord: m[1] + '|' + m[2],
      x: parseInt(m[1], 10),
      y: parseInt(m[2], 10)
    };
  }

  function getLocalStorageRowKey(village) {
    var sitter = '';
    if (window.top.game_data.player.sitter != '0') {
      sitter = 't=' + window.top.game_data.player.id + '&';
    }
    return 'sitter:' + sitter + ', village:' + village + ', world:' + window.location.hostname.split('.')[0];
  }

  function setLocalStorageRowPatched(village) {
    var key = getLocalStorageRowKey(village);
    window.top.$.jStorage.set(key, getCurrentGameTime());
    return key;
  }

  function getSmartMetaKey(village) {
    return getLocalStorageRowKey(village) + ':smart_meta';
  }

  function setSmartMeta(village, meta) {
    window.top.$.jStorage.set(getSmartMetaKey(village), meta);
  }

  function freshnessFactor(minutesSinceReport) {
    if (minutesSinceReport < CONFIG.staleMinutesFull) return 1;
    if (minutesSinceReport < CONFIG.staleMinutesSeventyFive) return 0.75;
    if (minutesSinceReport < CONFIG.staleMinutesFifty) return 0.5;
    return 0;
  }

  function readVisibleTargets() {
    var $ = get$();
    var rows = CONFIG.visibleRowsOnly ? $('#plunder_list tr[id^="village_"]:visible') : $('#plunder_list tr[id^="village_"]');
    var now = getCurrentGameTime();
    var targets = [];

    rows.each(function () {
      var row = $(this);
      var cells = row.children('td');
      if (cells.length < 12) return;

      var coordInfo = readCoord(cells.eq(4).text());
      if (!coordInfo) return;

      var resourceSpans = cells.eq(6).find('span.res');
      var resourcesKnown = resourceSpans.length >= 3;
      var wood = resourcesKnown ? toInt(resourceSpans.eq(0).text(), 0) : 0;
      var clay = resourcesKnown ? toInt(resourceSpans.eq(1).text(), 0) : 0;
      var iron = resourcesKnown ? toInt(resourceSpans.eq(2).text(), 0) : 0;
      var totalResources = wood + clay + iron;

      var wallText = $.trim(cells.eq(7).text());
      var wallKnown = wallText !== '' && wallText !== '?';
      var wall = wallKnown ? toInt(wallText, -1) : -1;

      var attackedAt = getVillageAttackedTime(cells.eq(5));
      var minutesSinceReport = Math.abs(parseInt((now.getTime() - attackedAt.getTime()) / 1000 / 60, 10));

      var rowId = String(row.attr('id') || '').replace('village_', '');

      targets.push({
        rowId: rowId,
        targetId: toInt(rowId, 0),
        coord: coordInfo.coord,
        x: coordInfo.x,
        y: coordInfo.y,
        wallKnown: wallKnown,
        wall: wall,
        resourcesKnown: resourcesKnown,
        wood: wood,
        clay: clay,
        iron: iron,
        totalResources: totalResources,
        minutesSinceReport: minutesSinceReport,
        factor: freshnessFactor(minutesSinceReport),
        row: row
      });
    });

    return targets;
  }

  function findGroupIdByName(groupName) {
    return new Promise(function (resolve, reject) {
      var $ = get$();
      var url = 'https://' + window.top.location.host + '/game.php?village=' + window.top.game_data.village.id + '&screen=overview_villages&mode=groups&type=static';
      $.ajax({
        type: 'GET',
        url: url,
        dataType: 'html',
        success: function (html) {
          try {
            var dom = $('<div></div>').html(html);
            var groupId = null;
            dom.find('a[href*="group="]').each(function () {
              var a = $(this);
              var name = $.trim(a.text());
              if (name === groupName) {
                var m = String(a.attr('href') || '').match(/group=(\d+)/);
                if (m) {
                  groupId = parseInt(m[1], 10);
                  return false;
                }
              }
            });
            if (groupId == null) {
              reject(new Error('Group not found: ' + groupName));
              return;
            }
            resolve(groupId);
          } catch (err) {
            reject(err);
          }
        },
        error: function (xhr, statusText, error) {
          reject(new Error(error || statusText || 'Could not load groups page'));
        }
      });
    });
  }

  function fetchSourcesForGroup(groupId) {
    return new Promise(function (resolve, reject) {
      var $ = get$();
      var url = 'https://' + window.top.location.host + '/game.php?village=' + window.top.game_data.village.id + '&screen=overview_villages&mode=combined&group=' + groupId + '&page=-1';
      $.ajax({
        type: 'GET',
        url: url,
        dataType: 'html',
        success: function (html) {
          try {
            var dom = $('<div></div>').html(html);
            var sources = [];
            dom.find('#combined_table tr.nowrap').each(function () {
              var row = $(this);
              var cells = row.children('td');
              if (cells.length < 15) return;

              var villageLink = cells.eq(1).find('a[href*="screen=overview"]').first();
              var href = String(villageLink.attr('href') || '');
              var idMatch = href.match(/village=(\d+)/);
              var coordInfo = readCoord(cells.eq(1).text());
              if (!idMatch || !coordInfo) return;

              sources.push({
                id: parseInt(idMatch[1], 10),
                coord: coordInfo.coord,
                x: coordInfo.x,
                y: coordInfo.y,
                label: $.trim(cells.eq(1).text()).replace(/\s+/g, ' '),
                units: {
                  spy: toInt(cells.eq(13).text(), 0),
                  light: toInt(cells.eq(14).text(), 0)
                }
              });
            });
            resolve(sources);
          } catch (err) {
            reject(err);
          }
        },
        error: function (xhr, statusText, error) {
          reject(new Error(error || statusText || 'Could not load source villages'));
        }
      });
    });
  }

  function chooseNearestSource(sourcePool, target, requiredUnits) {
    var best = null;
    for (var i = 0; i < sourcePool.length; i++) {
      var source = sourcePool[i];
      var ok = true;
      for (var unit in requiredUnits) {
        if (Object.prototype.hasOwnProperty.call(requiredUnits, unit)) {
          if (toInt(source.units[unit], 0) < toInt(requiredUnits[unit], 0)) {
            ok = false;
            break;
          }
        }
      }
      if (!ok) continue;
      var d = distance(source, target);
      if (!best || d < best.distance) {
        best = { source: source, distance: d };
      }
    }
    return best;
  }

  function consumeUnits(source, units) {
    for (var unit in units) {
      if (Object.prototype.hasOwnProperty.call(units, unit)) {
        source.units[unit] = Math.max(0, toInt(source.units[unit], 0) - toInt(units[unit], 0));
      }
    }
  }

  function buildOrderForTarget(target, sourcePool) {
    if (target.wallKnown && target.wall > CONFIG.maxWall) {
      return { action: 'skip', reason: 'wall_above_limit', target: target };
    }

    var unknown = !target.wallKnown || !target.resourcesKnown;
    if (unknown || target.factor <= 0) {
      var scoutReq = { spy: CONFIG.scoutCount };
      var scoutSource = chooseNearestSource(sourcePool, target, scoutReq);
      if (!scoutSource) {
        return { action: 'skip', reason: 'no_spy_source', target: target };
      }
      consumeUnits(scoutSource.source, scoutReq);
      return {
        action: 'scout',
        target: target,
        sourceId: scoutSource.source.id,
        sourceCoord: scoutSource.source.coord,
        sourceLabel: scoutSource.source.label,
        distance: scoutSource.distance,
        units: scoutReq,
        expectedLoot: 0,
        priority: 4
      };
    }

    var scaledResources = Math.floor(target.totalResources * target.factor);
    var requiredLight = Math.ceil(scaledResources / CONFIG.lightCarry);
    var minimumByWall = CONFIG.minLightByWall[target.wall];

    if (typeof minimumByWall === 'undefined') {
      return { action: 'skip', reason: 'unknown_wall_rule', target: target };
    }
    if (requiredLight < minimumByWall) {
      return { action: 'skip', reason: 'not_full_enough', target: target };
    }

    var attackReq = { light: requiredLight };
    var attackSource = chooseNearestSource(sourcePool, target, attackReq);
    if (!attackSource) {
      return { action: 'skip', reason: 'no_light_source', target: target };
    }

    consumeUnits(attackSource.source, attackReq);

    return {
      action: 'attack',
      target: target,
      sourceId: attackSource.source.id,
      sourceCoord: attackSource.source.coord,
      sourceLabel: attackSource.source.label,
      distance: attackSource.distance,
      units: attackReq,
      expectedLoot: scaledResources,
      priority: target.factor === 1 ? 1 : (target.factor === 0.75 ? 2 : 3)
    };
  }

  function buildPlan(targets, sources) {
    var pool = sources.map(function (src) {
      return {
        id: src.id,
        coord: src.coord,
        x: src.x,
        y: src.y,
        label: src.label,
        units: { spy: toInt(src.units.spy, 0), light: toInt(src.units.light, 0) }
      };
    });

    var queue = [];
    var stats = {
      totalTargets: targets.length,
      attacks: 0,
      scouts: 0,
      skipped: 0,
      skippedReasons: {}
    };

    targets.forEach(function (target) {
      var order = buildOrderForTarget(target, pool);
      if (order.action === 'skip') {
        stats.skipped += 1;
        stats.skippedReasons[order.reason] = (stats.skippedReasons[order.reason] || 0) + 1;
        return;
      }
      queue.push(order);
      if (order.action === 'attack') stats.attacks += 1;
      if (order.action === 'scout') stats.scouts += 1;
    });

    queue.sort(function (a, b) {
      if (a.priority !== b.priority) return a.priority - b.priority;
      if (a.action !== b.action) return a.action === 'attack' ? -1 : 1;
      if (b.expectedLoot !== a.expectedLoot) return b.expectedLoot - a.expectedLoot;
      return a.distance - b.distance;
    });

    return { queue: queue, stats: stats };
  }

  function getBaseCommandForm(targetVillageId) {
    if (STATE.cachedCommandForm) {
      return Promise.resolve(STATE.cachedCommandForm.clone());
    }
    return new Promise(function (resolve, reject) {
      TribalWars.get('place', { ajax: 'command', target: targetVillageId }, function (response) {
        try {
          var dialog = response && response.dialog ? response.dialog : '';
          var wrap = get$()('<div></div>').html(dialog);
          var form = wrap.find('#command-data-form').first();
          if (!form.length) {
            reject(new Error('Command form could not be loaded'));
            return;
          }
          STATE.cachedCommandForm = form.clone();
          resolve(form);
        } catch (err) {
          reject(err);
        }
      });
    });
  }

  function populateCommandForm(baseForm, order) {
    var form = baseForm.clone();
    form.find('input.unitsInput').val('');
    form.find('input[name="template_id"]').val('');
    form.find('input[name="source_village"]').val(order.sourceId);
    form.find('input[name="x"]').val(order.target.x);
    form.find('input[name="y"]').val(order.target.y);
    form.find('input[name="input"]').val(order.target.coord);
    form.find('input[name="target_type"][value="coord"]').prop('checked', true);
    form.find('input[name="spy"]').val(order.units.spy ? String(order.units.spy) : '');
    form.find('input[name="light"]').val(order.units.light ? String(order.units.light) : '');
    return form;
  }

  function serializeAttackForm(form) {
    var serialized = form.serializeArray();
    serialized.push({ name: 'attack', value: 'l' });
    return serialized;
  }

  function confirmAndSend(serialized) {
    return new Promise(function (resolve, reject) {
      TribalWars.post('place', { ajax: 'confirm' }, serialized, function (response) {
        try {
          var dialog = response && response.dialog ? response.dialog : '';
          var wrap = get$()('<div></div>').html(dialog);
          var confirmForm = wrap.find('#command-data-form').first();
          if (!confirmForm.length) {
            reject(new Error('Confirm form could not be loaded'));
            return;
          }
          var confirmSerialized = confirmForm.serializeArray();
          TribalWars.post('place', { ajaxaction: 'popup_command' }, confirmSerialized, function (finalResponse) {
            if (finalResponse && finalResponse.error) {
              reject(new Error(finalResponse.error));
              return;
            }
            resolve(finalResponse || {});
          });
        } catch (err) {
          reject(err);
        }
      });
    });
  }

  async function sendOrder(order) {
    var baseForm = await getBaseCommandForm(order.target.targetId);
    var form = populateCommandForm(baseForm, order);
    var serialized = serializeAttackForm(form);
    await confirmAndSend(serialized);
    setLocalStorageRowPatched(order.target.targetId);
    setSmartMeta(order.target.targetId, {
      ts: getCurrentGameTime(),
      action: order.action,
      sourceId: order.sourceId,
      sourceCoord: order.sourceCoord,
      expectedLoot: order.expectedLoot,
      units: order.units
    });
  }

  async function runQueue() {
    STATE.running = true;
    while (STATE.enterHeld && STATE.queue.length > 0) {
      var order = STATE.queue.shift();
      var startedAt = Date.now();
      try {
        await sendOrder(order);
        if (order.action === 'attack') {
          uiSuccess('Smart farm attack sent from ' + order.sourceCoord + ' to ' + order.target.coord + ' with ' + order.units.light + ' LC.', 700);
        } else {
          uiSuccess('Smart farm scout sent from ' + order.sourceCoord + ' to ' + order.target.coord + '.', 700);
        }
      } catch (err) {
        uiError('Smart farm skipped ' + order.target.coord + ': ' + err.message, 1200);
      }
      var elapsed = Date.now() - startedAt;
      var waitMs = Math.max(0, currentIntervalMs() - elapsed);
      if (waitMs > 0) {
        await sleep(waitMs);
      }
    }
    STATE.running = false;
    if (STATE.queue.length === 0) {
      uiSuccess('Smart farm queue finished.', 1200);
    }
  }

  async function startHold() {
    if (STATE.running) return;
    if (!window.pagesLoaded) {
      uiError('Önce LA listesini tamamen yükleyip Apply yap.', 1500);
      return;
    }
    try {
      var targets = readVisibleTargets();
      if (!targets.length) {
        uiError('Visible LA target bulunamadı.', 1500);
        return;
      }
      var groupId = await findGroupIdByName(CONFIG.groupName);
      var sources = await fetchSourcesForGroup(groupId);
      if (!sources.length) {
        uiError('Kaynak köy bulunamadı: ' + CONFIG.groupName, 1500);
        return;
      }
      var plan = buildPlan(targets, sources);
      STATE.queue = plan.queue.slice();
      STATE.stats = plan.stats;
      if (!STATE.queue.length) {
        uiError('Geçerli saldırı/casus planı çıkmadı.', 1500);
        return;
      }
      uiInfo('Smart farm hazır: ' + plan.stats.attacks + ' attack, ' + plan.stats.scouts + ' scout.', 1500);
      await runQueue();
    } catch (err) {
      STATE.running = false;
      uiError('Smart farm failed: ' + err.message, 2000);
    }
  }

  function installHotkeyPatch() {
    var originalTurnOnHotkeys = window.turnOnHotkeys;
    window.turnOnHotkeys = function () {
      window.onkeydown = function (e) {
        if (window.editingKey) {
          window.editKey(e);
          e.preventDefault();
          return;
        }
        if (isFocusable(window.top.document.activeElement)) {
          return;
        }
        if (e.which === CONFIG.holdKeyCode) {
          if (!STATE.enterHeld) {
            STATE.enterHeld = true;
            startHold();
          }
          e.preventDefault();
          return;
        }

        var row = get$("#plunder_list tr").filter(':visible').eq(1);
        var aButton = row.children('td').eq(9).children('a');
        var bButton = row.children('td').eq(10).children('a');
        var cButton = row.children('td').eq(11).children('a');

        switch (e.which) {
          case window.keycodes.a:
            window.tryClick(aButton);
            break;
          case window.keycodes.b:
            window.tryClick(bButton);
            break;
          case window.keycodes.c:
            window.tryClick(cButton);
            break;
          case window.keycodes.skip:
            row.hide();
            break;
          case window.keycodes.master:
            if (window.cansend && window.filtersApplied) {
              window.selectMasterButton(row);
            }
            break;
          case window.keycodes.left:
            window.getNewVillage('p');
            break;
          case window.keycodes.right:
            window.getNewVillage('n');
            break;
          default:
            return;
        }
        e.preventDefault();
      };

      window.onkeyup = function (e) {
        if (e.which === CONFIG.holdKeyCode) {
          STATE.enterHeld = false;
          e.preventDefault();
        }
      };
    };

    window.setLocalStorageRow = setLocalStorageRowPatched;

    if (typeof originalTurnOnHotkeys === 'function') {
      window.turnOnHotkeys();
    }
    if (typeof window.hotkeysOnOff === 'function') {
      window.hotkeysOnOff();
    }
  }

  async function bootstrap() {
    if (typeof window.turnOnHotkeys !== 'function' || typeof window.getVillageAttackedTime !== 'function' || typeof window.getCurrentGameTime !== 'function') {
      await loadScript(BASE_SCRIPT_URL);
    }

    await waitFor(function () {
      return typeof window.turnOnHotkeys === 'function' &&
             typeof window.getVillageAttackedTime === 'function' &&
             typeof window.getCurrentGameTime === 'function' &&
             !!window.top.$ && !!window.TribalWars;
    }, 20000, 100);

    installHotkeyPatch();
    uiInfo('Yaver-LA main_v2 hazır. Enter basılı tutarak smart farm çalıştırabilirsin.', 1500);
  }

  bootstrap().catch(function (err) {
    console.error('[Yaver-LA] main_v2 bootstrap failed', err);
    uiError('main_v2 bootstrap failed: ' + err.message, 2000);
  });
})();