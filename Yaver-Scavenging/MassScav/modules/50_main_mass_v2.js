(function () {
  "use strict";

  var Y = window.__YAVER_MASS_SCAV_V1__;
  if (!Y) return;

  Y.main = {};

  function readTargetSec() {
    var h = Number(document.getElementById("yms_h_v1").value || 0);
    var m = Number(document.getElementById("yms_m_v1").value || 0);
    var s = Number(document.getElementById("yms_s_v1").value || 0);
    var total = Math.floor(h * 3600 + m * 60 + s);
    return Math.max(1, total);
  }

  function currentCfg() {
    var cfg = Y.ui.readCfgFromUI();
    cfg.targetSec = readTargetSec();
    cfg.sendOrder = Y.sendOrder.slice();

    if (!cfg.unitsEnabled) cfg.unitsEnabled = {};
    if (!cfg.keepHome) cfg.keepHome = {};
    cfg.sendOrder.forEach(function (u) {
      if (cfg.unitsEnabled[u] == null) cfg.unitsEnabled[u] = true;
      if (cfg.keepHome[u] == null) cfg.keepHome[u] = 0;
    });

    if (!Array.isArray(cfg.enabledOptions) || cfg.enabledOptions.length === 0) cfg.enabledOptions = [1,2,3,4];
    return cfg;
  }

  Y.main.loadData = async function () {
    Y.ui.setProgress(0, "Starting...");
    Y.ui.msg("Data yükleniyor... (Seçili group’lar taranacak)", "info");

    Y.data.readGroupsFromDOM();
    Y.ui.renderGroups();

    if (Y.state.selectedGroups.size === 0) {
      var g = Y.util.getUrlParam("group");
      if (g == null) g = "0";
      Y.state.selectedGroups.add(String(g));
    }

    try { Y.data.loadCurrentPageData(); } catch (e0) {}

    var groups = Array.from(Y.state.selectedGroups);
    var totalGroups = groups.length;
    var doneGroups = 0;

    for (var gi = 0; gi < groups.length; gi++) {
      var gid = groups[gi];

      try {
        await Y.data.fetchGroup(gid, function (_gid, done, total) {
          var pctGroups = (doneGroups / totalGroups) * 100;
          var pctThis = (done / total) * (100 / totalGroups);
          var pct = pctGroups + pctThis;
          Y.ui.setProgress(pct, "Group " + _gid + " page " + done + "/" + total);
        });
      } catch (err) {
        console.error(err);
        Y.ui.msg("Fetch hata: group " + gid + " (console'a bak)", "err");
      }

      doneGroups++;
      Y.ui.setProgress((doneGroups / totalGroups) * 100, "Group " + gid + " done (" + doneGroups + "/" + totalGroups + ")");
    }

    Y.data.rebuildVillageArray();

    groups.forEach(function (gid) {
      Y.data.setGroupSelected(gid, true);
    });

    Y.ui.renderOptions();
    Y.ui.renderUnits();
    Y.ui.renderVillages();

    Y.ui.setProgress(100, "Done");
    Y.ui.msg("✅ Data hazır. Şimdi köy seçimlerini kontrol et → PLAN → BUILD BATCHES.", "ok");
  };

  Y.main.plan = function () {
    var cfg = currentCfg();

    var sel = Y.state.selectedVillageIds;
    if (!sel || sel.size === 0) {
      Y.ui.msg("Köy seçili değil. Group seç veya köy listesinde checkbox işaretle.", "err");
      return;
    }

    var res = Y.plan.build(cfg, sel);
    if (!res.ok) {
      Y.ui.msg("❌ " + res.err, "err");
      return;
    }

    Y.state.planRows = res.rows || [];
    Y.ui.renderPlan();

    Y.ui.msg("PLAN hazır. OK satırlar batch’e girecek. Şimdi BUILD BATCHES.", "ok");
  };

  Y.main.buildBatches = function () {
    var cfg = currentCfg();
    if (!Y.state.planRows || Y.state.planRows.length === 0) {
      Y.ui.msg("Önce PLAN yap.", "err");
      return;
    }

    var reqs = Y.sender.buildRequests(Y.state.planRows, cfg.usePremiumBoost);
    if (!reqs.length) {
      Y.ui.msg("Request üretilemedi (OK satır yok / payload boş olabilir).", "err");
      return;
    }

    Y.state.batches = Y.sender.chunk(reqs, 200);
    Y.state.sendCursor = 0;

    Y.ui.renderBatches();
    Y.ui.msg("✅ Batches hazır: " + Y.state.batches.length + " batch / " + reqs.length + " request.", "ok");
  };

  // v2: response'u okuyup gercek OK/ERR durumunu yaz
  Y.main.sendBatchIndex = async function (idx) {
    if (!Y.state.batches || !Y.state.batches.length) {
      Y.ui.msg("Önce BUILD BATCHES.", "err");
      return;
    }
    if (idx < 0 || idx >= Y.state.batches.length) return;

    var cell = document.getElementById("yms_batch_res_" + idx);
    if (cell) cell.innerHTML = "<span class='muted'>sending...</span>";

    try {
      var res = await Y.sender.sendBatch(Y.state.batches[idx]);

      // Oyun tarafinda send_squads response: squad_responses[] ve invalid_village_ids kullaniliyor. :contentReference[oaicite:2]{index=2}
      var sr = (res && Array.isArray(res.squad_responses)) ? res.squad_responses : [];
      var invalid = (res && Array.isArray(res.invalid_village_ids)) ? res.invalid_village_ids : [];

      var ok = 0, err = 0;
      var errMsgs = [];
      for (var i = 0; i < sr.length; i++) {
        if (sr[i] && sr[i].success === true) ok++;
        else {
          err++;
          if (sr[i] && sr[i].error) errMsgs.push(String(sr[i].error));
        }
      }

      var summary = "OK:" + ok + " / ERR:" + err;
      if (invalid.length) summary += " / invalid:" + invalid.join(",");

      if (cell) {
        var html = "";
        html += (err === 0 ? "<span class='sendok'>OK</span> " : "<span class='senderr'>ERR</span> ");
        html += "<span class='muted'>(" + summary + ")</span>";
        if (errMsgs.length) {
          html += "<br><span class='muted'>" + errMsgs.slice(0, 3).join(" | ") + "</span>";
        }
        cell.innerHTML = html;
      }

      if (err === 0) Y.ui.msg("✅ Batch " + (idx + 1) + " gönderildi. (" + summary + ")", "ok");
      else Y.ui.msg("⚠️ Batch " + (idx + 1) + " kısmi hata. (" + summary + ") - Batch tablosuna bak.", "info");

    } catch (e) {
      console.error(e);
      if (cell) cell.innerHTML = "<span class='senderr'>ERR</span> (console)";
      Y.ui.msg("❌ Batch gönderilemedi (console'a bak).", "err");
    }
  };

  Y.main.sendNext = async function () {
    if (!Y.state.batches || !Y.state.batches.length) {
      Y.ui.msg("Önce BUILD BATCHES.", "err");
      return;
    }
    if (Y.state.sendCursor >= Y.state.batches.length) {
      Y.ui.msg("Gönderilecek batch kalmadı.", "ok");
      return;
    }

    var idx = Y.state.sendCursor;
    await Y.main.sendBatchIndex(idx);
    Y.state.sendCursor = idx + 1;
  };

  Y.main.bind = function () {
    document.getElementById("yms_btn_load_v1").onclick = function () { Y.main.loadData(); };
    document.getElementById("yms_btn_plan_v1").onclick = function () { Y.main.plan(); };
    document.getElementById("yms_btn_batches_v1").onclick = function () { Y.main.buildBatches(); };
    document.getElementById("yms_btn_sendnext_v1").onclick = function () { Y.main.sendNext(); };

    document.addEventListener("change", function (e) {
      var t = e.target;
      if (!t) return;
      if (t.classList && t.classList.contains("yms_group_cb_v1")) {
        var gid = t.getAttribute("data-gid");
        Y.data.setGroupSelected(gid, t.checked);
        Y.ui.renderVillages();
      }
    });

    document.getElementById("yms_v_search_v1").oninput = function () {
      Y.ui.renderVillages();
    };
  };

  Y.init = async function () {
    if (!Y.util.isMassPage()) {
      Y.util.gotoMassPage();
      return;
    }

    try {
      await Y.util.waitFor(function () {
        return document.getElementById("scavenge_mass_screen") || $("#scavenge_mass_screen").length;
      }, 20000);
    } catch (e) {
      (window.UI && UI.ErrorMessage) ? UI.ErrorMessage("Mass Scav ekranı hazır değil. F5 deneyip tekrar çalıştır.", 5000) : alert("Mass Scav ekranı yok");
      return;
    }

    Y.ui.ensure();
    Y.ui.applyCfgToUI();

    Y.data.readGroupsFromDOM();
    Y.ui.renderGroups();

    var g = Y.util.getUrlParam("group");
    if (g == null) g = "0";
    Y.state.selectedGroups.add(String(g));

    var ok = false;
    try { ok = Y.data.loadCurrentPageData(); } catch (e2) {}
    if (ok) {
      Y.data.rebuildVillageArray();
      Y.data.setGroupSelected(String(g), true);
      Y.ui.renderOptions();
      Y.ui.renderUnits();
      Y.ui.renderVillages();
      Y.ui.msg("✅ Current page data yüklendi. İstersen başka group’ları seçip LOAD DATA yap.", "ok");
    } else {
      Y.ui.msg("İlk data parse edilemedi. LOAD DATA ile çek.", "info");
    }

    Y.main.bind();
  };
})();
