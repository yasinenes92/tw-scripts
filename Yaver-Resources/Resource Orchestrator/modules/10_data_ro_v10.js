(function () {
  'use strict';

  var Y = window.YRO_V10;
  if (!Y) return;

  var LS_KEY = 'yro_v10_state';

  function defaultState() {
    return {
      ui: {
        left: 30,
        top: 70,
        minimized1: false,
        minimized2: false,
        search: '',
      },
      groups: {
        // array of {id:number,name:string}
        list: [{ id: 0, name: 'All villages' }],
        // remember selections
        sel1: 0,
        sel2: 0,
        // orchestrator selects
        A_target: 0,
        A_surplus: 0,
        B_sender: 0,
        B_target: 0,
        B_surplus: 0,
        C_target: 0,
        C_surplus: 0,
      },
      orchestrator: {
        mode: 'balance', // balance | push | funnel
        cap: 80,
        scap: 95,
        reserve: 1,
      },
      cache: {
        groupsFetchedAt: 0,
        prodByGroup: {}, // {gid:{at, rows:[...]} }
        resByGroup: {}, // {gid:{at, rows:[...]} }
        incomingAt: 0,
        incomingMap: {}, // {toVillageId:{wood,clay,iron,total, byFrom:{fromId:{...}}}}
      },
    };
  }

  function loadState() {
    var st = Y.lsGet(LS_KEY);
    if (!st || typeof st !== 'object') return defaultState();
    // merge shallowly to avoid missing keys
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

  function saveState() {
    Y.lsSet(LS_KEY, Y.state);
  }

  Y.state = loadState();
  Y.saveState = saveState;

  // runtime (not persisted)
  Y.runtime = {
    // last computed plan
    plan: {
      mode: 'balance',
      shipments: [],
      meta: {
        targetGid: 0,
        senderGid: 0,
        surplusGid: 0,
        cap: 80,
        scap: 95,
        reserve: 1,
      },
      // village-level summaries
      targetRows: [],
      surplusRows: [],
    },
  };

  Y.log('data loaded ✅');
})();
