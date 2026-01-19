(function () {
  "use strict";

  var Y = window.__YAVER_RES_ANALYZER_V1__;
  if (!Y) return;

  // Resource alanları (Production overview satırında var)
  Y.data.RES_KEYS = ["wood", "stone", "iron"];

  // Gruplar: Parents / Children
  Y.data.GROUPS = [
    { key: "parents", name: Y.cfg.GROUP_NAME_PARENTS, defaultId: Y.cfg.DEFAULT_GROUP_ID_PARENTS },
    { key: "children", name: Y.cfg.GROUP_NAME_CHILDREN, defaultId: Y.cfg.DEFAULT_GROUP_ID_CHILDREN }
  ];

  // Modlar
  Y.data.MODES = [
    { key: "all", label: "All (1+2+3)" },
    { key: "summary", label: "Summary (Table 1-2)" },
    { key: "optimizer", label: "Optimizer (Table 3)" }
  ];

  // Ünite / village parse için selector notları (Sayfalar.txt’e göre)
  Y.data.SELECTORS = {
    productionTable: "#production_table",
    productionRows: "#production_table tr.row_a, #production_table tr.row_b",
    tradesTable: "#trades_table",
    tradesRows: "#trades_table tr.row_a, #trades_table tr.row_b",
    groupMenuItems: ".group-menu-item[data-group-id], strong.group-menu-item[data-group-id]"
  };

  // 1:1 exchangeFactor (Market trade sayfasında: MarketMerchantExchange.exchangeFactor = "1")
  Y.data.MARKET = {
    EXCHANGE_FACTOR: 1,
    MERCHANT_CAP_PER: Y.cfg.MERCHANT_CAP_PER
  };
})();
