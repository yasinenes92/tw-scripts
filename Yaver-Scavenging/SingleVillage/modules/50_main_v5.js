(function () {
  "use strict";

  var Y = window.__YSS_SINGLE_V2__;
  if (!Y) return;

  function sleep(ms) {
    return new Promise(function (r) { setTimeout(r, ms); });
  }

  Y.main = {};

  Y.main.fillGameForRow = function (row) {
    Y.dom.clearHighlights();
    Y.apply.applyUnitsToGame(row.planUnits);
    Y.dom.highlightCard(row.baseId);
  };

  Y.main.fillIndex = function (i, advanceIndex) {
    advanceIndex = (advanceIndex !== false);
    var row = Y.state && Y.state.plan ? Y.state.plan[i] : null;
    if (!row) return;

    Y.main.fillGameForRow(row);
    if (advanceIndex) Y.state.idx = i + 1;

    Y.util.msg(
      "Oyun arayüzüne <b>" + (i + 1) + ". satır</b> yazıldı: <b>" + row.name + "</b>. Bu satır için kontrol edeceğin kart: <b>" + row.name + "</b>.",
      "ok"
    );
  };

  Y.main.fillNext = function () {
    if (!Y.state || !Y.state.plan || !Y.state.plan.length) {
      Y.util.msg("Önce PLAN yap.", "err");
      return;
    }
    if (Y.state.idx >= Y.state.plan.length) {
      Y.util.msg("Plan bitti. (FILL NEXT için satır kalmadı)", "ok");
      return;
    }
    Y.main.fillIndex(Y.state.idx, true);
  };

  Y.main.clear = function () {
    Y.dom.clearHighlights();
    Y.apply.clearInputs();
    Y.state.plan = [];
    Y.state.idx = 0;
    Y.ui.renderPlan([], Y.state.targetSec || 3600);
    Y.util.msg("Temizlendi.", "ok");
  };

  Y.main.plan = function () {
    var r = Y.math.buildPlan();
    if (!r || !r.ok) {
      Y.state.plan = [];
      Y.state.idx = 0;
      Y.ui.renderPlan([], 3600);
      Y.util.msg("❌ " + (r && r.err ? r.err : "Plan üretilemedi"), "err");
      return;
    }

    Y.state.plan = r.plan;
    Y.state.idx = 0;
    Y.state.targetSec = r.targetSec;

    Y.ui.renderPlan(r.plan, r.targetSec);
    Y.util.msg(r.infoHtml, r.infoKind);

    if (r.plan.length) {
      Y.main.fillIndex(0, true);
      Y.util.msg(
        "PLAN oluşturuldu. Oyun arayüzüne <b>1. satır</b> yazıldı: <b>" + r.plan[0].name + "</b>. START ile hepsini otomatik başlatabilirsin.",
        "ok"
      );
    }
  };

  Y.main.findStartButton = function (baseId) {
    var card = Y.dom.findOptionCard(baseId);
    if (!card) return null;

    // En güvenlisi: free_send_button
    var btn =
      card.querySelector("a.free_send_button") ||
      card.querySelector("a.btn.btn-default.free_send_button") ||
      card.querySelector("button.free_send_button") ||
      null;

    if (btn) return btn;

    // Fallback: içinde "Start" yazan ilk buton (premium +20% olmaması için önce normal)
    var all = card.querySelectorAll("a.btn, button.btn");
    for (var i = 0; i < all.length; i++) {
      var t = (all[i].textContent || "").trim().toLowerCase();
      if (t === "start") return all[i];
    }
    return null;
  };

  Y.main.startRow = async function (row, idx, total) {
    // inputları yaz
    Y.main.fillGameForRow(row);
    await sleep(180);

    var btn = Y.main.findStartButton(row.baseId);
    if (!btn) {
      Y.util.msg("⚠️ Start butonu bulunamadı: <b>" + row.name + "</b>", "info");
      return false;
    }

    // disabled kontrol
    if (btn.classList.contains("btn-disabled") || btn.getAttribute("disabled") === "disabled") {
      Y.util.msg("⚠️ Start disabled: <b>" + row.name + "</b> (muhtemelen ACTIVE/LOCKED)", "info");
      return false;
    }

    // click
    try { btn.click(); } catch (e) {}

    // bekle: option active olana kadar (best-effort)
    var optKey = String(row.optId);
    try {
      await Y.util.waitFor(function () {
        try {
          var vopt = window.ScavengeScreen && window.ScavengeScreen.village && window.ScavengeScreen.village.options && window.ScavengeScreen.village.options[optKey];
          if (vopt && vopt.scavenging_squad) return true;
        } catch (e) {}

        // ya buton disabled olmuşsa
        var b2 = Y.main.findStartButton(row.baseId);
        if (!b2) return true;
        if (b2.classList.contains("btn-disabled") || b2.getAttribute("disabled") === "disabled") return true;

        return false;
      }, 6000);
    } catch (e2) {}

    Y.util.msg("✅ Başlatıldı: <b>" + row.name + "</b> (" + idx + "/" + total + ")", "ok");
    return true;
  };

  Y.main.startAll = async function () {
    if (!Y.state || !Y.state.plan || !Y.state.plan.length) {
      Y.util.msg("Önce PLAN yap.", "err");
      return;
    }

    var btn = document.getElementById("yss_start_all_v4");
    var oldText = btn ? btn.value : "START";
    if (btn) { btn.disabled = true; btn.value = "STARTING..."; }

    try {
      var total = Y.state.plan.length;
      for (var i = 0; i < total; i++) {
        var row = Y.state.plan[i];
        await Y.main.startRow(row, i + 1, total);
        await sleep(350);
      }
      Y.util.msg("✅ START tamamlandı. Aktif scav’leri görmek için sayfayı yenileyebilirsin (F5).", "ok");
    } catch (e) {
      console.error(e);
      Y.util.msg("❌ START sırasında hata (Console'a bak).", "err");
    } finally {
      if (btn) { btn.disabled = false; btn.value = oldText; }
    }
  };

  Y.init = async function () {
    if (!Y.util.isScavengePage()) {
      Y.util.gotoScavengePage();
      return;
    }

    try {
      await Y.util.waitFor(function () {
        return window.ScavengeScreen && window.ScavengeScreen.village && window.ScavengeScreen.village.options && window.ScavengeScreen.candidate_squad;
      }, 20000);
    } catch (e) {
      if (window.UI && UI.ErrorMessage) UI.ErrorMessage("ScavengeScreen yüklenmedi. Sayfayı yenileyip (F5) tekrar dene.", 5000);
      else alert("ScavengeScreen yüklenmedi. F5 ile yenileyip tekrar dene.");
      return;
    }

    // v4 UI
    Y.ui.ensureUI();
    Y.ui.renderPickers();

    // v4 butonlar
    document.getElementById("yss_plan_v4").onclick = function () { Y.main.plan(); };
    document.getElementById("yss_fill_next_v4").onclick = function () { Y.main.fillNext(); };
    document.getElementById("yss_clear_v4").onclick = function () { Y.main.clear(); };
    document.getElementById("yss_start_all_v4").onclick = function () { Y.main.startAll(); };

    Y.util.msg("Hazır. Süre/Unit/Kategori seç → <b>PLAN</b>. START ile plan satırlarını otomatik başlatabilirsin.", "info");
  };
})();
