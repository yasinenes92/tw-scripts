(function () {
  "use strict";

  var Y = window.__YAVER_RESOURCE_ORCHESTRATOR_V1__;
  if (!Y) return;

  Y.data.SELECTORS = {
    groupMenuItems: ".group-menu-item[data-group-id], strong.group-menu-item[data-group-id]",

    // production (overview_villages&mode=prod)
    productionTable: "#production_table",
    productionRows: "#production_table tr.row_a, #production_table tr.row_b, #production_table tr.nowrap.row_a, #production_table tr.nowrap.row_b",

    // trades (overview_villages&mode=trader)
    tradesTable: "#trades_table",
    tradesRows: "#trades_table tr.row_a, #trades_table tr.row_b"
  };
})();
