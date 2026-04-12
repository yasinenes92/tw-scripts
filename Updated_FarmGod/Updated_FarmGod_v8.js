// Hungarian translation provided by =Krumpli=

ScriptAPI.register('FarmGod', true, 'Warre', 'nl.tribalwars@coma.innogames.de');

window.FarmGod = {};
window.FarmGod.Library = (function () {
  /**** TribalWarsLibrary.js ****/
  if (typeof window.twLib === 'undefined') {
    window.twLib = {
      queues: null,
      init: function () {
        if (this.queues === null) {
          this.queues = this.queueLib.createQueues(5);
        }
      },
      queueLib: {
        maxAttempts: 3,
        Item: function (action, arg, promise = null) {
          this.action = action;
          this.arguments = arg;
          this.promise = promise;
          this.attempts = 0;
        },
        Queue: function () {
          this.list = [];
          this.working = false;
          this.length = 0;

          this.doNext = function () {
            let item = this.dequeue();
            let self = this;

            if (item.action == 'openWindow') {
              window
                .open(...item.arguments)
                .addEventListener('DOMContentLoaded', function () {
                  self.start();
                });
            } else {
              $[item.action](...item.arguments)
                .done(function () {
                  item.promise.resolve.apply(null, arguments);
                  self.start();
                })
                .fail(function () {
                  item.attempts += 1;
                  if (item.attempts < twLib.queueLib.maxAttempts) {
                    self.enqueue(item, true);
                  } else {
                    item.promise.reject.apply(null, arguments);
                  }

                  self.start();
                });
            }
          };

          this.start = function () {
            if (this.length) {
              this.working = true;
              this.doNext();
            } else {
              this.working = false;
            }
          };

          this.dequeue = function () {
            this.length -= 1;
            return this.list.shift();
          };

          this.enqueue = function (item, front = false) {
            front ? this.list.unshift(item) : this.list.push(item);
            this.length += 1;

            if (!this.working) {
              this.start();
            }
          };
        },
        createQueues: function (amount) {
          let arr = [];

          for (let i = 0; i < amount; i++) {
            arr[i] = new twLib.queueLib.Queue();
          }

          return arr;
        },
        addItem: function (item) {
          let leastBusyQueueIndex = 0;
          let leastBusyQueueLength = twLib.queues[0].length;

          twLib.queues.forEach((q, index) => {
            if (q.length < leastBusyQueueLength) {
              leastBusyQueueLength = q.length;
              leastBusyQueueIndex = index;
            }
          });

          twLib.queues[leastBusyQueueIndex].enqueue(item);
        },
        orchestrator: function (type, arg) {
          let promise = $.Deferred();
          let item = new twLib.queueLib.Item(type, arg, promise);

          twLib.queueLib.addItem(item);

          return promise;
        },
      },
      ajax: function () {
        return twLib.queueLib.orchestrator('ajax', arguments);
      },
      get: function () {
        return twLib.queueLib.orchestrator('get', arguments);
      },
      post: function () {
        return twLib.queueLib.orchestrator('post', arguments);
      },
      openWindow: function () {
        let item = new twLib.queueLib.Item('openWindow', arguments);
        twLib.queueLib.addItem(item);
      },
    };

    twLib.init();
  }

  /**** Script Library ****/
  const setUnitSpeeds = function () {
    let unitSpeeds = {};

    $.when($.get('/interface.php?func=get_unit_info')).then((xml) => {
      $(xml)
        .find('config')
        .children()
        .map((i, el) => {
          unitSpeeds[$(el).prop('nodeName')] = $(el)
            .find('speed')
            .text()
            .toNumber();
        });

      localStorage.setItem(
        'FarmGod_unitSpeeds',
        JSON.stringify(unitSpeeds)
      );
    });
  };

  const getUnitSpeeds = function () {
    return JSON.parse(localStorage.getItem('FarmGod_unitSpeeds')) || false;
  };

  if (!getUnitSpeeds()) setUnitSpeeds();

  const determineNextPage = function (page, $html) {
    let villageLength =
      $html.find('#scavenge_mass_screen').length > 0
        ? $html.find('tr[id*="scavenge_village"]').length
        : $html.find('tr.row_a, tr.row_ax, tr.row_b, tr.row_bx').length;

    let navSelect = $html
      .find('.paged-nav-item')
      .first()
      .closest('td')
      .find('select')
      .first();

    let navLength = 0;

    if ($html.find('#am_widget_Farm').length > 0) {
      let $navItems = $html
        .find('#plunder_list_nav')
        .first()
        .find('a.paged-nav-item, strong.paged-nav-item');

      if ($navItems.length > 0) {
        let lastText = $navItems.last().text() || '';
        let parsed = parseInt(lastText.replace(/\D/g, ''), 10);
        navLength = Number.isFinite(parsed) ? parsed - 1 : 0;
      }
    } else if (navSelect.length > 0) {
      navLength = navSelect.find('option').length - 1;
    } else {
      navLength = $html
        .find('.paged-nav-item')
        .not('[href*="page=-1"]').length;
    }

    let pageSize =
      $('#mobileHeader').length > 0
        ? 10
        : parseInt($html.find('input[name="page_size"]').val(), 10);

    if (!Number.isFinite(pageSize) || pageSize <= 0) {
      pageSize = 100;
    }

    if (page == -1 && villageLength == 1000) {
      return Math.floor(1000 / pageSize);
    } else if (page < navLength) {
      return page + 1;
    }

    return false;
  };

  const processPage = function (url, page, wrapFn) {
    let pageText = url.match('am_farm')
      ? `&Farm_page=${page}`
      : `&page=${page}`;

    return twLib
      .ajax({
        url: url + pageText,
      })
      .then((html) => {
        return wrapFn(page, $(html));
      });
  };

  const processAllPages = function (url, processorFn) {
    let page = url.match('am_farm') || url.match('scavenge_mass') ? 0 : -1;
    let wrapFn = function (page, $html) {
      let dnp = determineNextPage(page, $html);

      processorFn($html);

      if (dnp !== false) {
        return processPage(url, dnp, wrapFn);
      }

      return true;
    };

    return processPage(url, page, wrapFn);
  };

  const getDistance = function (origin, target) {
    let a = origin.toCoord(true).x - target.toCoord(true).x;
    let b = origin.toCoord(true).y - target.toCoord(true).y;

    return Math.hypot(a, b);
  };

  const subtractArrays = function (array1, array2) {
    let result = array1.map((val, i) => {
      return val - array2[i];
    });

    return result.some((v) => v < 0) ? false : result;
  };

  const getCurrentServerTime = function () {
    let parts = $('#serverTime')
      .closest('p')
      .text()
      .match(/\d+/g);

    if (!parts || parts.length < 6) {
      return Date.now();
    }

    let [hour, min, sec, day, month, year] = parts;
    return new Date(year, month - 1, day, hour, min, sec).getTime();
  };

  const timestampFromString = function (timestr) {
    let d = $('#serverDate')
      .text()
      .split('/')
      .map((x) => +x);

    let todayPattern = new RegExp(
      window.lang['aea2b0aa9ae1534226518faaefffdaad'].replace(
        '%s',
        '([\\d+|:]+)'
      )
    ).exec(timestr);

    let tomorrowPattern = new RegExp(
      window.lang['57d28d1b211fddbb7a499ead5bf23079'].replace(
        '%s',
        '([\\d+|:]+)'
      )
    ).exec(timestr);

    let laterDatePattern = new RegExp(
      window.lang['0cb274c906d622fa8ce524bcfbb7552d']
        .replace('%1', '([\\d+|\\.]+)')
        .replace('%2', '([\\d+|:]+)')
    ).exec(timestr);

    let t, date;

    if (todayPattern !== null) {
      t = todayPattern[1].split(':');
      date = new Date(d[2], d[1] - 1, d[0], t[0], t[1], t[2], t[3] || 0);
    } else if (tomorrowPattern !== null) {
      t = tomorrowPattern[1].split(':');
      date = new Date(
        d[2],
        d[1] - 1,
        d[0] + 1,
        t[0],
        t[1],
        t[2],
        t[3] || 0
      );
    } else if (laterDatePattern !== null) {
      d = (laterDatePattern[1] + d[2]).split('.').map((x) => +x);
      t = laterDatePattern[2].split(':');
      date = new Date(d[2], d[1] - 1, d[0], t[0], t[1], t[2], t[3] || 0);
    } else {
      return NaN;
    }

    return date.getTime();
  };

  String.prototype.toCoord = function (objectified) {
    let c = (this.match(/\d{1,3}\|\d{1,3}/g) || [false]).pop();
    return c && objectified
      ? { x: +c.split('|')[0], y: +c.split('|')[1] }
      : c;
  };

  String.prototype.toNumber = function () {
    return parseFloat(this);
  };

  Number.prototype.toNumber = function () {
    return parseFloat(this);
  };

  return {
    getUnitSpeeds,
    processPage,
    processAllPages,
    getDistance,
    subtractArrays,
    getCurrentServerTime,
    timestampFromString,
  };
})();

window.FarmGod.Translation = (function () {
  const msg = {
    nl_NL: {
      missingFeatures:
        'Script vereist een premium account en farm assistent!',
      options: {
        title: 'FarmGod Opties',
        warning:
          '<b>Waarschuwingen:</b><br>- Zorg dat A is ingesteld als je standaard microfarm<br>- Zorg dat de farm filters correct zijn ingesteld voor je het script gebruikt',
        filterImage:
          'https://higamy.github.io/TW/Scripts/Assets/farmGodFilters.png',
        group: 'Uit welke groep moet er gefarmd worden:',
        distance: 'Maximaal aantal velden dat farms mogen lopen:',
        wall: 'Maximum wall level:',
        time: 'Hoe veel tijd in minuten moet er tussen farms zitten:',
        recent2h: 'Alleen dorpen die in de laatste 2 uur zijn aangevallen:',
        losses: 'Verstuur farm naar dorpen met gedeeltelijke verliezen:',
        newbarbs: 'Voeg nieuwe barbarendorpen toe om te farmen:',
        button: 'Plan farms',
      },
      table: {
        noFarmsPlanned:
          'Er kunnen met de opgegeven instellingen geen farms verstuurd worden.',
        origin: 'Oorsprong',
        target: 'Doel',
        wall: 'Wall',
        attacked: 'Attacked',
        action: 'Action',
        cLight: 'C light',
        resolved: 'Resolved',
        reason: 'Resolve reason',
        fields: 'Velden',
        farm: 'Farm',
        goTo: 'Ga naar',
      },
      messages: {
        villageChanged: 'Succesvol van dorp veranderd!',
        villageError:
          'Alle farms voor het huidige dorp zijn reeds verstuurd!',
        sendError: 'Error: farm niet verstuurd!',
        waitResolve: 'Lütfen tüm satırların çözülmesini bekleyin.',
      },
    },
    hu_HU: {
      missingFeatures:
        'A scriptnek szÃƒÂ¼ksÃƒÂ©ge van PrÃƒÂ©mium fiÃƒÂ³kra ÃƒÂ©s FarmkezelÃ…â€˜re!',
      options: {
        title: 'FarmGod opciÃƒÂ³k',
        warning:
          '<b>Figyelem:</b><br>- Bizonyosodj meg rÃƒÂ³la, hogy az "A" sablon az alapÃƒÂ©rtelmezett<br>- Bizonyosodj meg rÃƒÂ³la, hogy a farm-filterek megfelelÃ…â€˜en vannak beÃƒÂ¡llÃƒÂ­tva mielÃ…â€˜tt hasznÃƒÂ¡lod a scriptet',
        filterImage:
          'https://higamy.github.io/TW/Scripts/Assets/farmGodFilters_HU.png',
        group: 'EbbÃ…â€˜l a csoportbÃƒÂ³l kÃƒÂ¼ldje:',
        distance: 'MaximÃƒÂ¡lis mezÃ…â€˜ tÃƒÂ¡volsÃƒÂ¡g:',
        wall: 'Maximum wall level:',
        time: 'Mekkora idÃ…â€˜intervallumban kÃƒÂ¼ldje a tÃƒÂ¡madÃƒÂ¡sokat percben:',
        recent2h: 'Csak az utolsÃ³ 2 Ã³rÃ¡ban tÃ¡madott falvak:',
        losses: 'KÃƒÂ¼ldjÃƒÂ¶n tÃƒÂ¡madÃƒÂ¡st olyan falvakba ahol rÃƒÂ©szleges vesztesÃƒÂ©ggel jÃƒÂ¡rhat a tÃƒÂ¡madÃƒÂ¡s:',
        newbarbs: 'Adj hozzÃƒÂ¡ ÃƒÂºj barbÃƒÂ¡r falukat:',
        button: 'Farm megtervezÃƒÂ©se',
      },
      table: {
        noFarmsPlanned:
          'A jelenlegi beÃƒÂ¡llÃƒÂ­tÃ¡sokkal nem lehet ÃƒÂºj tÃƒÂ¡madÃƒÂ¡st kikÃƒÂ¼ldeni.',
        origin: 'Origin',
        target: 'CÃƒÂ©lpont',
        wall: 'Wall',
        attacked: 'Attacked',
        action: 'Action',
        cLight: 'C light',
        resolved: 'Resolved',
        reason: 'Resolve reason',
        fields: 'TÃƒÂ¡volsÃƒÂ¡g',
        farm: 'Farm',
        goTo: 'Go to',
      },
      messages: {
        villageChanged: 'Falu sikeresen megvÃƒÂ¡ltoztatva!',
        villageError: 'Minden farm kiment a jelenlegi falubÃƒÂ³l!',
        sendError: 'Hiba: Farm nemvolt elkÃƒÂ¼ldve!',
        waitResolve: 'VÃƒÂ¡rd meg, amÃƒÂg minden sor feldolgozÃ¡sa befejezÅ‘dik.',
      },
    },
    int: {
      missingFeatures:
        'Script requires a premium account and loot assistent!',
      options: {
        title: 'FarmGod Options',
        warning:
          '<b>Warning:</b><br>- Make sure A is set as your default microfarm<br>- Make sure the farm filters are set correctly before using the script',
        filterImage:
          'https://higamy.github.io/TW/Scripts/Assets/farmGodFilters.png',
        group: 'Send farms from group:',
        distance: 'Maximum fields for farms:',
        wall: 'Maximum wall level:',
        time: 'How much time in minutes should there be between farms:',
        recent2h: 'Only villages attacked within the last 2 hours:',
        losses: 'Send farm to villages with partial losses:',
        newbarbs: 'Add new barbs te farm:',
        button: 'Plan farms',
      },
      table: {
        noFarmsPlanned:
          'No farms can be sent with the specified settings.',
        origin: 'Origin',
        target: 'Target',
        wall: 'Wall',
        attacked: 'Attacked',
        action: 'Action',
        cLight: 'C light',
        resolved: 'Resolved',
        reason: 'Resolve reason',
        fields: 'fields',
        farm: 'Farm',
        goTo: 'Go to',
      },
      messages: {
        villageChanged: 'Successfully changed village!',
        villageError:
          'All farms for the current village have been sent!',
        sendError: 'Error: farm not send!',
        waitResolve: 'Please wait until all rows finish resolving.',
      },
    },
  };

  const get = function () {
    let lang = msg.hasOwnProperty(game_data.locale)
      ? game_data.locale
      : 'int';
    return msg[lang];
  };

  return {
    get,
  };
})();

window.FarmGod.Main = (function (Library, Translation) {
  const lib = Library;
  const t = Translation.get();

  const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
  const C_LIGHT_MIN = 50;

  const EXCLUDED_UNITS = ['ram', 'catapult', 'knight', 'snob', 'militia'];
  const RESOLVE_PAGE_DELAY_MS = 700;
  const RESOLVE_ORIGIN_DELAY_MS = 1200;
  const RESOLVE_429_BACKOFF_MS = [3000, 6000, 10000, 15000];
  const RESOLVE_RETRYABLE_STATUSES = [429, 502, 503, 504];

  let curVillage = null;
  let farmBusy = false;
  let cResolveCache = {};
  let cResolvePlanToken = 0;
  let latestPlan = null;
  let latestResolvedStore = {};
  let resolveState = {
    ready: false,
    running: false,
    totalOrigins: 0,
    doneOrigins: 0,
    totalPreviewRows: 0,
    donePreviewRows: 0,
    finalSendable: 0,
  };

  const wait = function (ms) {
    return new Promise((resolve) => {
      window.setTimeout(resolve, ms);
    });
  };

  const getTrackedUnitNames = function () {
    return game_data.units.filter((unit) => EXCLUDED_UNITS.indexOf(unit) === -1);
  };

  const emptyUnitObj = function () {
    let obj = {};
    getTrackedUnitNames().forEach((unit) => {
      obj[unit] = 0;
    });
    return obj;
  };

  const cloneUnitObj = function (obj) {
    let clone = {};
    getTrackedUnitNames().forEach((unit) => {
      clone[unit] = Number(obj && obj[unit]) || 0;
    });
    return clone;
  };

  const unitArrayToObj = function (arr) {
    let obj = {};
    getTrackedUnitNames().forEach((unit, index) => {
      obj[unit] = Number(arr && arr[index]) || 0;
    });
    return obj;
  };

  const forecastToUnitObj = function (forecast) {
    let obj = emptyUnitObj();
    if (!forecast || typeof forecast !== 'object') {
      return obj;
    }

    getTrackedUnitNames().forEach((unit) => {
      obj[unit] = Number(forecast[unit]) || 0;
    });

    return obj;
  };

  const subtractUnitObjs = function (available, cost) {
    let result = {};
    let ok = true;

    getTrackedUnitNames().forEach((unit) => {
      let next = (Number(available[unit]) || 0) - (Number(cost[unit]) || 0);
      result[unit] = next;
      if (next < 0) ok = false;
    });

    return ok ? result : false;
  };

  const ajaxGet = function (url) {
    return new Promise((resolve, reject) => {
      $.ajax({
        url: url,
        method: 'GET',
        success: function (html) {
          resolve(html);
        },
        error: function (xhr, status, errorThrown) {
          reject({
            xhr: xhr,
            status: status,
            errorThrown: errorThrown,
          });
        },
      });
    });
  };

  const getStatusCode = function (errorObj) {
    if (!errorObj || !errorObj.xhr) return 0;
    return Number(errorObj.xhr.status) || 0;
  };

  const isRetryableStatus = function (statusCode) {
    return RESOLVE_RETRYABLE_STATUSES.includes(statusCode);
  };

  const ajaxGetWithBackoff = async function (url) {
    let attempt = 0;

    while (true) {
      try {
        return await ajaxGet(url);
      } catch (errorObj) {
        let statusCode = getStatusCode(errorObj);

        if (
          isRetryableStatus(statusCode) &&
          attempt < RESOLVE_429_BACKOFF_MS.length
        ) {
          let delay = RESOLVE_429_BACKOFF_MS[attempt];
          await wait(delay);
          attempt += 1;
          continue;
        }

        throw errorObj;
      }
    }
  };

  const init = function () {
    if (
      game_data.features.Premium.active &&
      game_data.features.FarmAssistent.active
    ) {
      if (game_data.screen == 'am_farm') {
        $.when(buildOptions()).then((html) => {
          Dialog.show('FarmGod', html);

          $('.optionButton')
            .off('click')
            .on('click', () => {
              let optionGroup = parseInt($('.optionGroup').val(), 10);
              let optionDistance = parseFloat($('.optionDistance').val());
              let optionWall = parseInt($('.optionWall').val(), 10);
              let optionTime = parseFloat($('.optionTime').val());
              let optionRecent2h = $('.optionRecent2h').prop('checked');
              let optionLosses = $('.optionLosses').prop('checked');
              let optionNewbarbs =
                $('.optionNewbarbs').prop('checked') || false;

              if (!Number.isFinite(optionWall)) optionWall = 20;

              localStorage.setItem(
                'farmGod_options',
                JSON.stringify({
                  optionGroup: optionGroup,
                  optionDistance: optionDistance,
                  optionWall: optionWall,
                  optionTime: optionTime,
                  optionRecent2h: optionRecent2h,
                  optionLosses: optionLosses,
                  optionNewbarbs: optionNewbarbs,
                })
              );

              $('.optionsContent').html(
                UI.Throbber[0].outerHTML + '<br><br>'
              );

              getData(
                optionGroup,
                optionNewbarbs,
                optionLosses
              ).then((data) => {
                Dialog.close();

                let plan = createPlanning(
                  optionDistance,
                  optionWall,
                  optionTime,
                  optionRecent2h,
                  data
                );

                cResolveCache = {};
                latestResolvedStore = {};
                latestPlan = plan;
                cResolvePlanToken += 1;

                resolveState = {
                  ready: false,
                  running: true,
                  totalOrigins: 0,
                  doneOrigins: 0,
                  totalPreviewRows: 0,
                  donePreviewRows: 0,
                  finalSendable: 0,
                };

                $('.farmGodContent').remove();
                $('#am_widget_Farm')
                  .first()
                  .before(buildTable(plan, cResolvePlanToken));

                bindEventHandlers();
                UI.InitProgressBars();
                UI.updateProgressBar(
                  $('#FarmGodProgessbar'),
                  0,
                  0
                );
                $('#FarmGodProgessbar')
                  .data('current', 0)
                  .data('max', 0);

                resolveCPreviewRows(plan, cResolvePlanToken);
              });
            });

          document.querySelector('.optionButton').focus();
        });
      } else {
        location.href = game_data.link_base_pure + 'am_farm';
      }
    } else {
      UI.ErrorMessage(t.missingFeatures);
    }
  };

  const bindEventHandlers = function () {
    $(document)
      .off('click.farmGodSend')
      .on('click.farmGodSend', '.farmGod_send_icon', function (event) {
        if (!resolveState.ready) {
          event.preventDefault();
          UI.ErrorMessage(t.messages.waitResolve);
          return;
        }

        let $el = $(this);

        if (
          game_data.market != 'nl' ||
          $el.data('origin') == curVillage
        ) {
          sendResolvedFarm($el);
        } else {
          UI.ErrorMessage(t.messages.villageError);
        }
      });

    $(document)
      .off('keydown.farmGodSend')
      .on('keydown.farmGodSend', (event) => {
        if ((event.keyCode || event.which) == 13) {
          if (!resolveState.ready) {
            UI.ErrorMessage(t.messages.waitResolve);
            return;
          }

          $('.farmGod_send_icon').first().trigger('click');
        }
      });

    $('.switchVillage')
      .off('click')
      .on('click', function () {
        curVillage = $(this).data('id');
        UI.SuccessMessage(t.messages.villageChanged);
        $(this).closest('tr').remove();
      });
  };

  const buildOptions = function () {
    let defaultOptions = {
      optionGroup: 0,
      optionDistance: 25,
      optionWall: 20,
      optionTime: 10,
      optionRecent2h: false,
      optionLosses: false,
      optionNewbarbs: true,
    };

    let options = Object.assign(
      {},
      defaultOptions,
      JSON.parse(localStorage.getItem('farmGod_options')) || {}
    );

    if (!Number.isFinite(options.optionWall)) {
      options.optionWall = defaultOptions.optionWall;
    }
    if (typeof options.optionRecent2h !== 'boolean') {
      options.optionRecent2h = defaultOptions.optionRecent2h;
    }

    let checkboxSettings = [false, true, true, true, false];
    let checkboxError = $('#plunder_list_filters')
      .find('input[type="checkbox"]')
      .map((i, el) => {
        return $(el).prop('checked') != checkboxSettings[i];
      })
      .get()
      .includes(true);

    return $.when(buildGroupSelect(options.optionGroup)).then(
      (groupSelect) => {
        return `<style>#popup_box_FarmGod{text-align:center;width:550px;}</style>
                <h3>${t.options.title}</h3><br><div class="optionsContent">
                ${
                  checkboxError
                    ? `<div class="info_box" style="line-height: 15px;font-size:10px;text-align:left;"><p style="margin:0px 5px;">${t.options.warning}<br><img src="${t.options.filterImage}" style="width:100%;"></p></div><br>`
                    : ``
                }
                <div style="width:90%;margin:auto;background: url('graphic/index/main_bg.jpg') 100% 0% #E3D5B3;border: 1px solid #7D510F;border-collapse: separate !important;border-spacing: 0px !important;"><table class="vis" style="width:100%;text-align:left;font-size:11px;">
                  <tr><td>${t.options.group}</td><td>${groupSelect}</td></tr>
                  <tr><td>${t.options.distance}</td><td><input type="text" size="5" class="optionDistance" value="${options.optionDistance}"></td></tr>
                  <tr><td>${t.options.wall}</td><td><input type="text" size="5" class="optionWall" value="${options.optionWall}"></td></tr>
                  <tr><td>${t.options.time}</td><td><input type="text" size="5" class="optionTime" value="${options.optionTime}"></td></tr>
                  <tr><td>${t.options.recent2h}</td><td><input type="checkbox" class="optionRecent2h" ${options.optionRecent2h ? 'checked' : ''}></td></tr>
                  <tr><td>${t.options.losses}</td><td><input type="checkbox" class="optionLosses" ${options.optionLosses ? 'checked' : ''}></td></tr>
                  ${
                    game_data.market == 'nl'
                      ? `<tr><td>${t.options.newbarbs}</td><td><input type="checkbox" class="optionNewbarbs" ${options.optionNewbarbs ? 'checked' : ''}></td></tr>`
                      : ''
                  }
                </table></div><br><input type="button" class="btn optionButton" value="${t.options.button}"></div>`;
      }
    );
  };

  const buildGroupSelect = function (id) {
    return $.get(
      TribalWars.buildURL('GET', 'groups', { ajax: 'load_group_menu' })
    ).then((groups) => {
      let html = `<select class="optionGroup">`;

      groups.result.forEach((val) => {
        if (val.type == 'separator') {
          html += `<option disabled=""/>`;
        } else {
          html += `<option value="${val.group_id}" ${
            val.group_id == id ? 'selected' : ''
          }>${val.name}</option>`;
        }
      });

      html += `</select>`;

      return html;
    });
  };

  const buildRowKey = function (planToken, row) {
    return `${planToken}__${row.origin.id}__${row.target.id}__${row.target.coord}`;
  };

  const buildPlaceholderIcon = function (row) {
    if (row.action_mode === 'c_preview') {
      return `<span class="farm_icon farm_icon_c decoration" style="margin:auto;display:inline-block;opacity:0.45;"></span>`;
    }
    return `<span class="farm_icon farm_icon_a decoration" style="margin:auto;display:inline-block;opacity:0.45;"></span>`;
  };

  const buildTable = function (plan, planToken) {
    let summary = `<div style="width:98%;margin:0px auto 5px auto;text-align:left;font-size:11px;">
                    Planned A-path rows: ${plan.counter} |
                    Planned C-preview rows: ${plan.cPreviewCounter} |
                    Skipped by wall: ${plan.skippedWall} |
                    Skipped missing/unreadable wall: ${plan.skippedMissingWall} |
                    Skipped by 2h filter: ${plan.skippedByRecent2h} |
                    Skipped missing/unreadable attack time: ${plan.skippedMissingAttackTime} |
                    <span class="fgResolveSummary">Resolving all rows...</span>
                  </div>`;

    let html = `<div class="vis farmGodContent"><h4>FarmGod</h4>${summary}<div id="FarmGodProgessbar" class="progress-bar live-progress-bar progress-bar-alive" style="width:98%;margin:5px auto;"><div style="background: rgb(146, 194, 0);"></div><span class="label" style="margin-top:0px;"></span></div><table class="vis" width="100%">
                <tr><th style="text-align:center;">${t.table.origin}</th><th style="text-align:center;">${t.table.target}</th><th style="text-align:center;">${t.table.wall}</th><th style="text-align:center;">${t.table.attacked}</th><th style="text-align:center;">${t.table.action}</th><th style="text-align:center;">${t.table.cLight}</th><th style="text-align:center;">${t.table.resolved}</th><th style="text-align:center;">${t.table.reason}</th><th style="text-align:center;">${t.table.fields}</th><th style="text-align:center;">${t.table.farm}</th></tr>`;

    if (!$.isEmptyObject(plan.farms)) {
      for (let prop in plan.farms) {
        if (game_data.market == 'nl') {
          html += `<tr><td colspan="10" style="background: #e7d098;"><input type="button" class="btn switchVillage" data-id="${plan.farms[prop][0].origin.id}" value="${t.table.goTo} ${plan.farms[prop][0].origin.name} (${plan.farms[prop][0].origin.coord})" style="float:right;"></td></tr>`;
        }

        plan.farms[prop].forEach((val, i) => {
          let rowKey = buildRowKey(planToken, val);

          html += `<tr class="farmRow row_${i % 2 == 0 ? 'a' : 'b'}">
                    <td style="text-align:center;"><a href="${game_data.link_base_pure}info_village&id=${val.origin.id}">${val.origin.name} (${val.origin.coord})</a></td>
                    <td style="text-align:center;"><a href="${game_data.link_base_pure}info_village&id=${val.target.id}">${val.target.coord}</a></td>
                    <td style="text-align:center;">${val.wall}</td>
                    <td style="text-align:center;">${val.attacked_text || ''}</td>
                    <td class="fgAction" data-row-key="${rowKey}" style="text-align:center;">${val.action_mode === 'c_preview' ? 'C preview' : 'A path'}</td>
                    <td class="fgCLight" data-row-key="${rowKey}" style="text-align:center;">${val.action_mode === 'c_preview' ? '...' : '-'}</td>
                    <td class="fgResolved" data-row-key="${rowKey}" style="text-align:center;">Pending</td>
                    <td class="fgReason" data-row-key="${rowKey}" style="text-align:center;">Pending</td>
                    <td style="text-align:center;">${val.fields.toFixed(2)}</td>
                    <td class="fgFarmCell" data-row-key="${rowKey}" style="text-align:center;">${buildPlaceholderIcon(val)}</td>
                  </tr>`;
        });
      }
    } else {
      html += `<tr><td colspan="10" style="text-align: center;">${t.table.noFarmsPlanned}</td></tr>`;
    }

    html += `</table></div>`;

    return html;
  };

  const updateRowCells = function (rowKey, payload) {
    let $actionCell = $(`.fgAction[data-row-key="${rowKey}"]`);
    let $cLightCell = $(`.fgCLight[data-row-key="${rowKey}"]`);
    let $resolvedCell = $(`.fgResolved[data-row-key="${rowKey}"]`);
    let $reasonCell = $(`.fgReason[data-row-key="${rowKey}"]`);
    let $farmCell = $(`.fgFarmCell[data-row-key="${rowKey}"]`);

    if ($actionCell.length) $actionCell.text(payload.actionText);
    if ($cLightCell.length) $cLightCell.text(payload.cLightText);
    if ($resolvedCell.length) $resolvedCell.text(payload.resolvedText);
    if ($reasonCell.length) $reasonCell.text(payload.reasonText);
    if ($farmCell.length) $farmCell.html(payload.farmHtml);
  };

  const decodeHtml = function (text) {
    return $('<textarea/>').html(text || '').text();
  };

  const getReportIdFromHref = function (href) {
    if (!href) return null;
    let match = href.match(/view=(\d+)/);
    return match ? parseInt(match[1], 10) : null;
  };

  const getColorFromRow = function ($row) {
    let src = $row.find('img[src*="graphic/dots/"]').attr('src') || '';
    let match = src.match(/dots\/(green|yellow|red|blue|red_blue)/);
    return match ? match[1] : null;
  };

  const readWallLevel = function ($row) {
    let wallText = $row.find('td').eq(6).text().trim();
    return /^\d+$/.test(wallText) ? parseInt(wallText, 10) : null;
  };

  const readAttackTime = function ($row) {
    let attackText = $row.find('td').eq(4).text().trim();
    let attackTimestamp = null;

    if (attackText) {
      try {
        let parsed = lib.timestampFromString(attackText);
        attackTimestamp = Number.isFinite(parsed) ? parsed : null;
      } catch (e) {
        attackTimestamp = null;
      }
    }

    return {
      text: attackText,
      timestamp: attackTimestamp,
    };
  };

  const parseForecastAttrDetailed = function (raw) {
    if (!raw) {
      return {
        ok: false,
        reason: 'forecast missing',
        data: null,
      };
    }

    try {
      return {
        ok: true,
        reason: '',
        data: JSON.parse(raw),
      };
    } catch (e1) {
      try {
        return {
          ok: true,
          reason: '',
          data: JSON.parse(decodeHtml(raw)),
        };
      } catch (e2) {
        return {
          ok: false,
          reason: 'forecast parse error',
          data: null,
        };
      }
    }
  };

  const getData = function (group, newbarbs, losses) {
    let data = {
      villages: {},
      commands: {},
      farms: { templates: {}, farms: {} },
    };

    let villagesProcessor = ($html) => {
      const mobileCheck = $('#mobileHeader').length > 0;

      if (mobileCheck) {
        let table = jQuery($html).find('.overview-container > div');
        table.each((i, el) => {
          try {
            const villageId = jQuery(el)
              .find('.quickedit-vn')
              .data('id');
            const name = jQuery(el)
              .find('.quickedit-label')
              .attr('data-text');
            const coord = jQuery(el)
              .find('.quickedit-label')
              .text()
              .toCoord();

            const rawUnits = {};
            getTrackedUnitNames().forEach((unit) => {
              rawUnits[unit] = 0;
            });

            const unitsElements = jQuery(el).find(
              '.overview-units-row > div.unit-row-item'
            );

            unitsElements.each((_, unitElement) => {
              const img = jQuery(unitElement).find('img');
              const span =
                jQuery(unitElement).find('span.unit-row-name');
              if (img.length && span.length) {
                let unitType = img
                  .attr('src')
                  .split('unit_')[1]
                  .replace('@2x.webp', '')
                  .replace('.webp', '')
                  .replace('.png', '');
                const value = parseInt(span.text(), 10) || 0;
                if (rawUnits.hasOwnProperty(unitType)) {
                  rawUnits[unitType] = value;
                }
              }
            });

            const unitArray = getTrackedUnitNames().map((unit) => rawUnits[unit] || 0);

            data.villages[coord] = {
              name: name,
              id: villageId,
              units: unitArray,
              unitsObj: cloneUnitObj(rawUnits),
            };
          } catch (e) {
            console.error('Error processing village data:', e);
          }
        });
      } else {
        $html
          .find('#combined_table')
          .find('.row_a, .row_b')
          .filter((i, el) => {
            return $(el).find('.bonus_icon_33').length == 0;
          })
          .map((i, el) => {
            let $el = $(el);
            let $qel = $el.find('.quickedit-label').first();
            let unitArray = $el
              .find('.unit-item')
              .filter((index) => {
                return EXCLUDED_UNITS.indexOf(game_data.units[index]) == -1;
              })
              .map((index, element) => {
                return $(element).text().toNumber();
              })
              .get();

            return (data.villages[$qel.text().toCoord()] = {
              name: $qel.data('text'),
              id: parseInt(
                $el.find('.quickedit-vn').first().data('id'),
                10
              ),
              units: unitArray,
              unitsObj: unitArrayToObj(unitArray),
            });
          });
      }

      return data;
    };

    let commandsProcessor = ($html) => {
      $html
        .find('#commands_table')
        .find('.row_a, .row_ax, .row_b, .row_bx')
        .map((i, el) => {
          let $el = $(el);
          let coord = $el
            .find('.quickedit-label')
            .first()
            .text()
            .toCoord();

          if (coord) {
            if (!data.commands.hasOwnProperty(coord))
              data.commands[coord] = [];
            return data.commands[coord].push(
              Math.round(
                lib.timestampFromString(
                  $el.find('td').eq(2).text().trim()
                ) / 1000
              )
            );
          }
        });

      return data;
    };

    let farmProcessor = ($html) => {
      if ($.isEmptyObject(data.farms.templates)) {
        let unitSpeeds = lib.getUnitSpeeds();

        $html
          .find('form[action*="action=edit_all"]')
          .find('input[type="hidden"][name*="template"]')
          .closest('tr')
          .map((i, el) => {
            let $el = $(el);
            let templateName = $el
              .prev('tr')
              .find('a.farm_icon')
              .first()
              .attr('class')
              .match(/farm_icon_(.*)\s/)[1];

            let unitsArr = [];
            let unitsObj = emptyUnitObj();

            $el
              .find('input[type="text"], input[type="number"]')
              .each((index, element) => {
                let val = $(element).val().toNumber();
                unitsArr.push(val);

                let unitName = $(element)
                  .attr('name')
                  .trim()
                  .split('[')[0];

                if (unitsObj.hasOwnProperty(unitName)) {
                  unitsObj[unitName] = val;
                }
              });

            data.farms.templates[templateName] = {
              id: $el
                .find(
                  'input[type="hidden"][name*="template"][name*="[id]"]'
                )
                .first()
                .val()
                .toNumber(),
              units: unitsArr,
              unitsObj: cloneUnitObj(unitsObj),
              speed: Math.max(
                ...$el
                  .find(
                    'input[type="text"], input[type="number"]'
                  )
                  .map((index, element) => {
                    return $(element).val().toNumber() > 0
                      ? unitSpeeds[
                          $(element)
                            .attr('name')
                            .trim()
                            .split('[')[0]
                        ]
                      : 0;
                  })
                  .get()
              ),
            };
          });
      }

      $html
        .find('#plunder_list')
        .find('tr[id^="village_"]')
        .map((i, el) => {
          let $el = $(el);
          let attackTime = readAttackTime($el);
          let $reportLink = $el
            .find('a[href*="screen=report&mode=all&view="]')
            .first();
          let coord = $reportLink.text().toCoord();

          if (!coord) return;

          data.farms.farms[coord] = {
            id: $el.attr('id').split('_')[1].toNumber(),
            report_id: getReportIdFromHref($reportLink.attr('href')),
            wall: readWallLevel($el),
            attacked_text: attackTime.text,
            attacked_timestamp: attackTime.timestamp,
            color: getColorFromRow($el),
            max_loot: $el.find('img[src*="max_loot/1"]').length > 0,
          };
        });

      return data;
    };

    let findNewbarbs = () => {
      if (newbarbs) {
        return twLib.get('/map/village.txt').then((allVillages) => {
          allVillages.match(/[^\r\n]+/g).forEach((villageData) => {
            let [id, name, x, y, player_id] =
              villageData.split(',');
            let coord = `${x}|${y}`;

            if (
              player_id == 0 &&
              !data.farms.farms.hasOwnProperty(coord)
            ) {
              data.farms.farms[coord] = {
                id: id.toNumber(),
              };
            }
          });

          return data;
        });
      } else {
        return data;
      }
    };

    let filterFarms = () => {
      data.farms.farms = Object.fromEntries(
        Object.entries(data.farms.farms).filter(([key, val]) => {
          return (
            !val.hasOwnProperty('color') ||
            val.color === null ||
            (val.color != 'red' &&
              val.color != 'red_blue' &&
              (val.color != 'yellow' || losses))
          );
        })
      );

      return data;
    };

    return Promise.all([
      lib.processAllPages(
        TribalWars.buildURL('GET', 'overview_villages', {
          mode: 'combined',
          group: group,
        }),
        villagesProcessor
      ),
      lib.processAllPages(
        TribalWars.buildURL('GET', 'overview_villages', {
          mode: 'commands',
          type: 'attack',
        }),
        commandsProcessor
      ),
      lib.processAllPages(
        TribalWars.buildURL('GET', 'am_farm'),
        farmProcessor
      ),
      findNewbarbs(),
    ])
      .then(filterFarms)
      .then(() => {
        return data;
      });
  };

  const createPlanning = function (
    optionDistance,
    optionWall,
    optionTime,
    optionRecent2h,
    data
  ) {
    let plan = {
      counter: 0,
      cPreviewCounter: 0,
      skippedWall: 0,
      skippedMissingWall: 0,
      skippedByRecent2h: 0,
      skippedMissingAttackTime: 0,
      farms: {},
      templateA: data.farms.templates['a'] || null,
      originStartUnitsObj: {},
    };

    for (let originCoord in data.villages) {
      plan.originStartUnitsObj[originCoord] = cloneUnitObj(
        data.villages[originCoord].unitsObj
      );
    }

    let serverTimeMs = lib.getCurrentServerTime();
    let serverTime = Math.round(serverTimeMs / 1000);
    let templateA = data.farms.templates['a'];

    const isWithinLast2Hours = function (attackTimestamp) {
      return (
        Number.isFinite(attackTimestamp) &&
        attackTimestamp <= serverTimeMs &&
        serverTimeMs - attackTimestamp <= TWO_HOURS_MS
      );
    };

    const determineActionMode = function (farmIndex) {
      if (!Number.isFinite(farmIndex.attacked_timestamp)) {
        return null;
      }

      let recent = isWithinLast2Hours(farmIndex.attacked_timestamp);

      if (recent && farmIndex.wall < 4) {
        return 'c_preview';
      }

      if (!recent && farmIndex.wall < 2) {
        return 'a_path';
      }

      return null;
    };

    Object.keys(data.farms.farms).forEach((coord) => {
      let farmIndex = data.farms.farms[coord];

      if (!Number.isInteger(farmIndex.wall)) {
        plan.skippedMissingWall++;
      } else if (farmIndex.wall > optionWall) {
        plan.skippedWall++;
      }

      if (optionRecent2h) {
        if (!Number.isFinite(farmIndex.attacked_timestamp)) {
          plan.skippedMissingAttackTime++;
        } else if (!isWithinLast2Hours(farmIndex.attacked_timestamp)) {
          plan.skippedByRecent2h++;
        }
      }
    });

    for (let prop in data.villages) {
      let orderedFarms = Object.keys(data.farms.farms)
        .map((key) => {
          return { coord: key, dis: lib.getDistance(prop, key) };
        })
        .sort((a, b) => (a.dis > b.dis ? 1 : -1));

      orderedFarms.forEach((el) => {
        let farmIndex = data.farms.farms[el.coord];

        if (
          !Number.isInteger(farmIndex.wall) ||
          farmIndex.wall > optionWall
        ) {
          return;
        }

        if (optionRecent2h) {
          if (!Number.isFinite(farmIndex.attacked_timestamp)) {
            return;
          }
          if (!isWithinLast2Hours(farmIndex.attacked_timestamp)) {
            return;
          }
        }

        let actionMode = determineActionMode(farmIndex);
        if (!actionMode) {
          return;
        }

        let distance = lib.getDistance(prop, el.coord);
        if (!(distance < optionDistance)) {
          return;
        }

        if (!templateA) {
          return;
        }

        let arrival = Math.round(
          serverTime +
            distance * templateA.speed * 60 +
            Math.round((plan.counter + plan.cPreviewCounter) / 5)
        );

        let maxTimeDiff = Math.round(optionTime * 60);
        let timeDiff = true;

        if (data.commands.hasOwnProperty(el.coord)) {
          if (
            !farmIndex.hasOwnProperty('color') &&
            data.commands[el.coord].length > 0
          ) {
            timeDiff = false;
          }

          data.commands[el.coord].forEach((timestamp) => {
            if (Math.abs(timestamp - arrival) < maxTimeDiff) {
              timeDiff = false;
            }
          });
        } else {
          data.commands[el.coord] = [];
        }

        if (!timeDiff) {
          return;
        }

        if (actionMode === 'a_path') {
          let unitsLeft = lib.subtractArrays(
            data.villages[prop].units,
            templateA.units
          );

          if (!unitsLeft) {
            return;
          }

          plan.counter++;
          if (!plan.farms.hasOwnProperty(prop)) plan.farms[prop] = [];

          plan.farms[prop].push({
            origin: {
              coord: prop,
              name: data.villages[prop].name,
              id: data.villages[prop].id,
            },
            target: {
              coord: el.coord,
              id: farmIndex.id,
              report_id: farmIndex.report_id,
            },
            wall: farmIndex.wall,
            attacked_text: farmIndex.attacked_text || '',
            attacked_timestamp: farmIndex.attacked_timestamp,
            action_mode: 'a_path',
            fields: distance,
            template: { name: 'a', id: templateA.id },
          });

          data.villages[prop].units = unitsLeft;
          data.commands[el.coord].push(arrival);
          return;
        }

        plan.cPreviewCounter++;
        if (!plan.farms.hasOwnProperty(prop)) plan.farms[prop] = [];

        plan.farms[prop].push({
          origin: {
            coord: prop,
            name: data.villages[prop].name,
            id: data.villages[prop].id,
          },
          target: {
            coord: el.coord,
            id: farmIndex.id,
            report_id: farmIndex.report_id,
          },
          wall: farmIndex.wall,
          attacked_text: farmIndex.attacked_text || '',
          attacked_timestamp: farmIndex.attacked_timestamp,
          action_mode: 'c_preview',
          fields: distance,
          template: { name: 'c', id: null },
        });

        data.commands[el.coord].push(arrival);
      });
    }

    return plan;
  };

  const updateResolveSummary = function (counts, planToken) {
    if (planToken !== cResolvePlanToken) return;

    let $summary = $('.fgResolveSummary').first();
    if (!$summary.length) return;

    if (!resolveState.ready) {
      $summary.text(
        `Resolving origins ${resolveState.doneOrigins}/${resolveState.totalOrigins}, rows ${resolveState.donePreviewRows}/${resolveState.totalPreviewRows} | ready ${counts.cReady}, A fallback ${counts.aFallback}, skip ${counts.skip}, page fetch incomplete ${counts.pageFetchIncomplete}, row not found ${counts.rowNotFound}, c button missing ${counts.cButtonMissing}, forecast missing ${counts.forecastMissing}, forecast parse error ${counts.forecastParseError}, light missing ${counts.lightMissing}`
      );
    } else {
      $summary.text(
        `Resolution complete | final sendable ${resolveState.finalSendable} | ready ${counts.cReady}, A fallback ${counts.aFallback}, skip ${counts.skip}, page fetch incomplete ${counts.pageFetchIncomplete}, row not found ${counts.rowNotFound}, c button missing ${counts.cButtonMissing}, forecast missing ${counts.forecastMissing}, forecast parse error ${counts.forecastParseError}, light missing ${counts.lightMissing}`
      );
    }
  };

  const parseResolveStore = function (rowKey, row, originResult) {
    let resolved =
      originResult.byTargetId[row.target.id] ||
      originResult.byReportId[row.target.report_id] ||
      originResult.byCoord[row.target.coord] ||
      null;

    if (!resolved) {
      if (originResult.incomplete) {
        return {
          bucket: 'pageFetchIncomplete',
          mode: 'unresolved',
          cLight: null,
          forecastUnitsObj: emptyUnitObj(),
          reason: 'page fetch incomplete',
        };
      }

      return {
        bucket: 'rowNotFound',
        mode: 'unresolved',
        cLight: null,
        forecastUnitsObj: emptyUnitObj(),
        reason: 'row not found',
      };
    }

    if (!resolved.readable) {
      if (resolved.reason === 'c button missing') {
        return {
          bucket: 'cButtonMissing',
          mode: 'unresolved',
          cLight: null,
          forecastUnitsObj: emptyUnitObj(),
          reason: 'c button missing',
        };
      }

      if (resolved.reason === 'forecast missing') {
        return {
          bucket: 'forecastMissing',
          mode: 'unresolved',
          cLight: null,
          forecastUnitsObj: emptyUnitObj(),
          reason: 'forecast missing',
        };
      }

      if (resolved.reason === 'forecast parse error') {
        return {
          bucket: 'forecastParseError',
          mode: 'unresolved',
          cLight: null,
          forecastUnitsObj: emptyUnitObj(),
          reason: 'forecast parse error',
        };
      }

      if (resolved.reason === 'light missing') {
        return {
          bucket: 'lightMissing',
          mode: 'unresolved',
          cLight: null,
          forecastUnitsObj: emptyUnitObj(),
          reason: 'light missing',
        };
      }

      return {
        bucket: 'rowNotFound',
        mode: 'unresolved',
        cLight: null,
        forecastUnitsObj: emptyUnitObj(),
        reason: resolved.reason || 'row not found',
      };
    }

    if (resolved.cLight >= C_LIGHT_MIN) {
      return {
        bucket: 'cReady',
        mode: 'c',
        cLight: resolved.cLight,
        forecastUnitsObj: cloneUnitObj(resolved.forecastUnitsObj),
        reason: 'light >= 50',
      };
    }

    if (row.wall < 2) {
      return {
        bucket: 'aFallback',
        mode: 'a',
        cLight: resolved.cLight,
        forecastUnitsObj: cloneUnitObj(resolved.forecastUnitsObj),
        reason: 'light < 50, wall < 2',
      };
    }

    return {
      bucket: 'skip',
      mode: 'skip',
      cLight: resolved.cLight,
      forecastUnitsObj: cloneUnitObj(resolved.forecastUnitsObj),
      reason: 'light < 50, wall >= 2',
    };
  };

  const finalizeActionList = function (plan, planToken) {
    let sendableCount = 0;
    let currentProgress = Number($('#FarmGodProgessbar').data('current')) || 0;

    Object.keys(plan.farms).forEach((originCoord) => {
      let available = cloneUnitObj(plan.originStartUnitsObj[originCoord] || emptyUnitObj());

      plan.farms[originCoord].forEach((row) => {
        let rowKey = buildRowKey(planToken, row);
        let resolved = latestResolvedStore[rowKey] || null;

        let desiredMode = null;
        let desiredReason = '';
        let cLightText = '-';

        if (row.action_mode === 'a_path') {
          desiredMode = 'a';
          desiredReason = 'base A rule';
        } else if (resolved) {
          desiredMode = resolved.mode;
          desiredReason = resolved.reason;
          cLightText = resolved.cLight === null ? '--' : String(resolved.cLight);
        }

        if (row.action_mode === 'c_preview' && resolved && resolved.mode === 'c') {
          let nextUnits = subtractUnitObjs(available, resolved.forecastUnitsObj);
          if (nextUnits) {
            available = nextUnits;
            sendableCount++;

            updateRowCells(rowKey, {
              actionText: 'C send',
              cLightText: cLightText,
              resolvedText: 'C ready',
              reasonText: desiredReason,
              farmHtml: `<a href="#" class="farmGod_send_icon farm_icon farm_icon_c" data-send-mode="c" data-origin="${row.origin.id}" data-report="${row.target.report_id}" data-row-key="${rowKey}" style="margin:auto;"></a>`,
            });
          } else {
            updateRowCells(rowKey, {
              actionText: 'No send',
              cLightText: cLightText,
              resolvedText: 'Skip',
              reasonText: 'insufficient C units',
              farmHtml: `<span class="farm_icon farm_icon_c decoration" style="margin:auto;display:inline-block;opacity:0.45;"></span>`,
            });
          }

          return;
        }

        if (
          (row.action_mode === 'a_path') ||
          (row.action_mode === 'c_preview' && resolved && resolved.mode === 'a')
        ) {
          let nextUnits = subtractUnitObjs(available, plan.templateA.unitsObj);
          if (nextUnits) {
            available = nextUnits;
            sendableCount++;

            updateRowCells(rowKey, {
              actionText: 'A send',
              cLightText: row.action_mode === 'c_preview' ? cLightText : '-',
              resolvedText: row.action_mode === 'c_preview' ? 'A fallback' : 'A ready',
              reasonText: desiredReason,
              farmHtml: `<a href="#" class="farmGod_send_icon farm_icon farm_icon_a" data-send-mode="a" data-origin="${row.origin.id}" data-target="${row.target.id}" data-template="${plan.templateA.id}" data-row-key="${rowKey}" style="margin:auto;"></a>`,
            });
          } else {
            updateRowCells(rowKey, {
              actionText: 'No send',
              cLightText: row.action_mode === 'c_preview' ? cLightText : '-',
              resolvedText: 'Skip',
              reasonText: 'insufficient A units',
              farmHtml: `<span class="farm_icon farm_icon_a decoration" style="margin:auto;display:inline-block;opacity:0.45;"></span>`,
            });
          }

          return;
        }

        if (row.action_mode === 'c_preview' && resolved && resolved.mode === 'skip') {
          updateRowCells(rowKey, {
            actionText: 'No send',
            cLightText: cLightText,
            resolvedText: 'Skip',
            reasonText: desiredReason,
            farmHtml: `<span class="farm_icon farm_icon_c decoration" style="margin:auto;display:inline-block;opacity:0.45;"></span>`,
          });
          return;
        }

        updateRowCells(rowKey, {
          actionText: 'No send',
          cLightText: row.action_mode === 'c_preview' ? cLightText : '-',
          resolvedText: 'Unreadable',
          reasonText: desiredReason || 'unresolved',
          farmHtml: `<span class="farm_icon farm_icon_c decoration" style="margin:auto;display:inline-block;opacity:0.45;"></span>`,
        });
      });
    });

    resolveState.finalSendable = sendableCount;

    $('#FarmGodProgessbar')
      .data('max', sendableCount)
      .data('current', Math.min(currentProgress, sendableCount));

    UI.updateProgressBar(
      $('#FarmGodProgessbar'),
      $('#FarmGodProgessbar').data('current'),
      $('#FarmGodProgessbar').data('max')
    );
  };

  const fetchOriginCForecastsSerial = async function (originId) {
    if (cResolveCache[originId]) {
      return cResolveCache[originId];
    }

    let result = {
      byTargetId: {},
      byCoord: {},
      byReportId: {},
      incomplete: false,
    };

    let page = 0;
    let more = true;

    while (more) {
      let url = `/game.php?village=${originId}&screen=am_farm&order=distance&dir=asc&Farm_page=${page}`;

      try {
        let html = await ajaxGetWithBackoff(url);
        let $html = $(html);

        $html
          .find('#plunder_list')
          .find('tr[id^="village_"]')
          .each((i, el) => {
            let $row = $(el);
            let targetId = parseInt(
              ($row.attr('id') || '').replace('village_', ''),
              10
            );
            let $reportLink = $row
              .find('a[href*="screen=report&mode=all&view="]')
              .first();
            let coord = ($reportLink.text() || '').toCoord();
            let reportId = getReportIdFromHref($reportLink.attr('href'));
            let $cButton = $row.find('a.farm_icon_c').first();

            let entry = {
              targetId: Number.isFinite(targetId) ? targetId : null,
              coord: coord || null,
              reportId: reportId || null,
              readable: false,
              cLight: null,
              forecastUnitsObj: emptyUnitObj(),
              reason: '',
            };

            if (!$cButton.length) {
              entry.reason = 'c button missing';
            } else {
              let parsedForecast = parseForecastAttrDetailed(
                $cButton.attr('data-units-forecast')
              );

              if (!parsedForecast.ok) {
                entry.reason = parsedForecast.reason;
              } else if (
                !parsedForecast.data ||
                typeof parsedForecast.data !== 'object'
              ) {
                entry.reason = 'forecast missing';
              } else if (
                !Object.prototype.hasOwnProperty.call(
                  parsedForecast.data,
                  'light'
                )
              ) {
                entry.reason = 'light missing';
              } else {
                let numeric = Number(parsedForecast.data.light);
                if (Number.isFinite(numeric)) {
                  entry.readable = true;
                  entry.cLight = numeric;
                  entry.forecastUnitsObj = forecastToUnitObj(parsedForecast.data);
                  entry.reason = 'ok';
                } else {
                  entry.reason = 'light missing';
                }
              }
            }

            if (entry.targetId !== null) {
              result.byTargetId[entry.targetId] = entry;
            }
            if (entry.coord) {
              result.byCoord[entry.coord] = entry;
            }
            if (entry.reportId !== null) {
              result.byReportId[entry.reportId] = entry;
            }
          });

        let nextPage = determineNextPage(page, $html);

        if (nextPage === false) {
          more = false;
        } else {
          page = nextPage;
          await wait(RESOLVE_PAGE_DELAY_MS);
        }
      } catch (errorObj) {
        result.incomplete = true;
        more = false;
      }
    }

    cResolveCache[originId] = result;
    return result;
  };

  const resolveCPreviewRows = async function (plan, planToken) {
    let previewRows = [];

    Object.keys(plan.farms).forEach((originCoord) => {
      plan.farms[originCoord].forEach((row) => {
        if (row.action_mode === 'c_preview') {
          previewRows.push(row);
        }
      });
    });

    let grouped = {};
    previewRows.forEach((row) => {
      if (!grouped[row.origin.id]) grouped[row.origin.id] = [];
      grouped[row.origin.id].push(row);
    });

    resolveState.totalOrigins = Object.keys(grouped).length;
    resolveState.doneOrigins = 0;
    resolveState.totalPreviewRows = previewRows.length;
    resolveState.donePreviewRows = 0;

    let counts = {
      cReady: 0,
      aFallback: 0,
      skip: 0,
      pageFetchIncomplete: 0,
      rowNotFound: 0,
      cButtonMissing: 0,
      forecastMissing: 0,
      forecastParseError: 0,
      lightMissing: 0,
    };

    updateResolveSummary(counts, planToken);

    if (!previewRows.length) {
      resolveState.ready = true;
      resolveState.running = false;
      finalizeActionList(plan, planToken);
      updateResolveSummary(counts, planToken);
      return;
    }

    let originIds = Object.keys(grouped);

    for (let i = 0; i < originIds.length; i++) {
      if (planToken !== cResolvePlanToken) return;

      let originId = originIds[i];
      let originRows = grouped[originId];
      let originResult = await fetchOriginCForecastsSerial(originId);

      for (let j = 0; j < originRows.length; j++) {
        if (planToken !== cResolvePlanToken) return;

        let row = originRows[j];
        let rowKey = buildRowKey(planToken, row);
        let parsed = parseResolveStore(rowKey, row, originResult);

        latestResolvedStore[rowKey] = parsed;

        if (counts.hasOwnProperty(parsed.bucket)) {
          counts[parsed.bucket] += 1;
        }

        resolveState.donePreviewRows += 1;
        updateResolveSummary(counts, planToken);
      }

      resolveState.doneOrigins += 1;
      updateResolveSummary(counts, planToken);

      if (i < originIds.length - 1) {
        await wait(RESOLVE_ORIGIN_DELAY_MS);
      }
    }

    resolveState.ready = true;
    resolveState.running = false;
    finalizeActionList(plan, planToken);
    updateResolveSummary(counts, planToken);
  };

  const replaceVillageInUrl = function (url, villageId) {
    if (!url) return url;

    if (url.match(/village=\d+/)) {
      return url.replace(/village=(\d+)/, 'village=' + villageId);
    }

    if (url.indexOf('?') >= 0) {
      return `${url}&village=${villageId}`;
    }

    return `${url}?village=${villageId}`;
  };

  const sendResolvedFarm = function ($this) {
    let n = Timing.getElapsedTimeSinceLoad();
    if (
      farmBusy ||
      (
        Accountmanager.farm.last_click &&
        n - Accountmanager.farm.last_click < 200
      )
    ) {
      return;
    }

    farmBusy = true;
    Accountmanager.farm.last_click = n;

    let $pb = $('#FarmGodProgessbar');
    let mode = String($this.data('send-mode') || '');

    const onDone = function (okMessage, rowSelector) {
      $pb.data('current', ($pb.data('current') || 0) + 1);
      UI.updateProgressBar(
        $pb,
        $pb.data('current'),
        $pb.data('max')
      );
      $this.closest('.farmRow').remove();
      farmBusy = false;

      if (okMessage) {
        UI.SuccessMessage(okMessage);
      }
    };

    const onFail = function (errMessage) {
      UI.ErrorMessage(errMessage || t.messages.sendError);
      farmBusy = false;
    };

    if (mode === 'a') {
      TribalWars.post(
        replaceVillageInUrl(
          Accountmanager.send_units_link,
          $this.data('origin')
        ),
        null,
        {
          target: $this.data('target'),
          template_id: $this.data('template'),
          source: $this.data('origin'),
        },
        function (r) {
          onDone(r && r.success ? r.success : 'A sent');
        },
        function (r) {
          onFail(r || t.messages.sendError);
        }
      );
      return;
    }

    if (mode === 'c') {
      let cUrl = Accountmanager.send_units_link_from_report;
      if (!cUrl) {
        onFail('send_units_link_from_report missing');
        return;
      }

      TribalWars.post(
        replaceVillageInUrl(cUrl, $this.data('origin')),
        null,
        {
          report_id: $this.data('report'),
        },
        function (r) {
          onDone(r && r.success ? r.success : 'C sent');
        },
        function (r) {
          onFail(r || t.messages.sendError);
        }
      );
      return;
    }

    onFail('Unknown send mode');
  };

  return {
    init,
  };
})(window.FarmGod.Library, window.FarmGod.Translation);

(() => {
  window.FarmGod.Main.init();
})();