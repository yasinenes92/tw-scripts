(function () {
  "use strict";

  // Global namespace
  if (!window.Yaver) window.Yaver = {};

  // Prevent double-load
  if (window.Yaver.ScavSingle && window.Yaver.ScavSingle.__loaded) {
    console.log("[Yaver.ScavSingle] already loaded - skipping bootstrap");
    return;
  }

  var api = window.Yaver.ScavSingle = window.Yaver.ScavSingle || {};

  api.__loaded = true;
  api.VERSION = "1.0.0";
  api.LOADED_AT = Date.now();

  api.env = {
    world: (window.game_data && game_data.world) ? game_data.world : "unknown_world",
    locale: (window.game_data && game_data.locale) ? game_data.locale : "unknown_locale"
  };

  api.config = {
    debug: true,

    // storage
    storagePrefix: "YaverScav:SingleVillage:",

    // behavior
    defaultHours: 6,
    autoSend: false,          // false: sadece doldurur, click yapmaz
    allowPremium: false,      // premium send butonu varsa kullanma
    fillOnlyFirstReadyOption: true, // true: hazır olan ilk seçeneği doldurur

    // defaults
    defaultEnabledUnits: {
      spear: true,
      sword: false,
      axe: false,
      archer: false,
      light: false,
      marcher: false,
      heavy: false
    },
    defaultEnabledOptions: {
      "1": true,
      "2": true,
      "3": true,
      "4": true
    },

    // Carry values (standart TW)
    carry: {
      spear: 25,
      sword: 15,
      axe: 10,
      archer: 10,
      light: 80,
      marcher: 50,
      heavy: 50
    },

    // Loot factors (Option 1..4)
    lootFactor: {
      "1": 0.1,
      "2": 0.25,
      "3": 0.5,
      "4": 0.75
    }
  };

  api.state = {
    hours: null,
    enabledUnits: null,
    enabledOptions: null,
    lastPlan: null
  };

  // init will be wired after modules are loaded
  api.init = api.init || function () {
    console.log("[Yaver.ScavSingle] init placeholder (modules not loaded yet?)");
  };
})();
