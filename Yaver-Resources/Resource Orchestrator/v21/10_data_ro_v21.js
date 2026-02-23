(function () {
  'use strict';

  var Y = window.YRO_V21;
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
