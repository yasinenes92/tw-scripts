(function () {
  "use strict";

  var api = window.Yaver && window.Yaver.ScavSingle;
  if (!api) return;

  var U = api.utils;
  var G = api.game;
  var A = api.apply = api.apply || {};

  A.clearInputs = function () {
    // Clear all unit inputs
    $("input.unitsInput").each(function (_, el) {
      $(el).val("").trigger("change");
    });
  };

  A.fillInputs = function (unitsMap, available) {
    Object.keys(unitsMap).forEach(function (unit) {
      var cnt = unitsMap[unit] || 0;
      var max = available[unit] || 0;
      if (cnt > max) cnt = max;

      var $inp = $("input.unitsInput[name='" + unit + "']");
      if ($inp.length) $inp.val(cnt).trigger("change");
    });
  };

  A.pickFirstReadyOption = function (titles, enabledOptions) {
    // We try in 4->1 order, but titles are DOM order; so map by index
    // Index mapping: titles[0..3] correspond to option 1..4 visually
    var mapTitleById = {
      "1": titles[0],
      "2": titles[1],
      "3": titles[2],
      "4": titles[3]
    };

    var order = ["4", "3", "2", "1"];
    for (var i = 0; i < order.length; i++) {
      var id = order[i];
      if (!enabledOptions[id]) continue;

      var title = mapTitleById[id];
      if (!title) continue;

      var $box = G.findOptionContainerByTitle(title);
      var $btn = G.getSendButton($box);

      if ($btn && $btn.length && !G.isButtonDisabled($btn)) {
        return { optId: id, title: title, $box: $box, $btn: $btn };
      }
    }
    return null;
  };

  A.applyPlan = function (plan, enabledOptions, doSend) {
    if (!plan || !plan.ok) return { ok: false, error: "Plan yok / plan hatalı." };
    if (!G.isScavengePage()) return { ok: false, error: "Scavenging sayfasında değilsin." };

    var titles = G.getOptionTitlesInDomOrder();
    if (!titles || titles.length < 4) return { ok: false, error: "Seçenek başlıkları okunamadı." };

    var pick = A.pickFirstReadyOption(titles, enabledOptions);
    if (!pick) return { ok: false, error: "Hazır (disabled olmayan) scavenging seçeneği bulunamadı." };

    var opt = plan.options[pick.optId];
    if (!opt) return { ok: false, error: "Seçilen option için plan üretilemedi." };

    A.clearInputs();
    A.fillInputs(opt.units, plan.availableUnits);

    // Focus send button like Sophie script :contentReference[oaicite:5]{index=5}
    try { pick.$btn.focus(); } catch (e) {}

    if (doSend) {
      try {
        pick.$btn.click();
        return { ok: true, sent: true, optId: pick.optId, title: pick.title };
      } catch (e2) {
        return { ok: false, error: "Click sırasında hata: " + (e2 && e2.message ? e2.message : e2) };
      }
    }

    return { ok: true, sent: false, optId: pick.optId, title: pick.title };
  };
})();
