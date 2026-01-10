/* =======================================================================
   Yaver Report v4.0  (TribalWars / DS)
   - "In a day" (loot_res / loot_vil / scavenge) verilerini BUGÜN filtresiyle toplar
   - Klan (Tribe) bazında toplar
   - World/Server Top Tribes (mode=ally) ile eşleştirir
   - WORLD TOP 15 tablosunda Perf SÜTUNU EN SAĞDADIR ✅
   ======================================================================= */

(function () {
  "use strict";

  /* ==========================
     0) CONFIG
     ========================== */
  const YAVER = {
    version: "v4.0.0",
    // Kaç sayfa taransın? (her sayfa ~50 kayıt)
    inADayMaxPages: 8,
    // İlk kaç klan rapora girsin (ranking/ally'den)
    topTribesLimit: 15,
    // Debug log
    debug: false,
  };

  function log(...args) {
    if (YAVER.debug) console.log("[Yaver]", ...args);
  }

  /* ==========================
     1) UTIL
     ========================== */

  function fmt(n) {
    // 1234567 -> 1.234.567
    if (n === null || n === undefined) return "0";
    const x = Math.round(Number(n) || 0).toString();
    return x.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  }

  function parseIntDots(s) {
    // "173.189" -> 173189
    return parseInt(String(s || "").replace(/\./g, "").replace(/[^\d]/g, ""), 10) || 0;
  }

  function escapeBB(str) {
    return String(str || "")
      .replace(/\[/g, "(")
      .replace(/\]/g, ")")
      .trim();
  }

  function getBaseUrl() {
    // /game.php?... yolunu kökten kurmak için
    return window.location.origin || "";
  }

  function getVillageId() {
    // game_data varsa onu kullan
    if (window.game_data && window.game_data.village && window.game_data.village.id) {
      return window.game_data.village.id;
    }
    // url paramlarından yakala
    const m = (window.location.search || "").match(/village=(\d+)/);
    return m ? m[1] : "";
  }

  function getServerDateDDMMYYYY() {
    // TribalWars genelde window.server_date veya game_data.server_date verir
    // formatlar değişebiliyor. "2026-01-10" -> "10.01.2026"
    const d = (window.server_date || (window.game_data && window.game_data.server_date) || "").toString().trim();
    if (!d) {
      // fallback: local date
      const now = new Date();
      const dd = String(now.getDate()).padStart(2, "0");
      const mm = String(now.getMonth() + 1).padStart(2, "0");
      const yy = now.getFullYear();
      return `${dd}.${mm}.${yy}`;
    }

    // Eğer zaten dd.mm.yyyy ise:
    if (/^\d{2}\.\d{2}\.\d{4}$/.test(d)) return d;

    // Eğer yyyy-mm-dd ise:
    const m = d.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) return `${m[3]}.${m[2]}.${m[1]}`;

    // Bazı sunucular "10/01/2026" gibi verebilir:
    const m2 = d.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (m2) return `${m2[1]}.${m2[2]}.${m2[3]}`;

    // bilinmiyorsa local date
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, "0");
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const yy = now.getFullYear();
    return `${dd}.${mm}.${yy}`;
  }

  function isTodayDateCell(text) {
    const t = String(text || "").trim().toLowerCase();
    if (!t) return false;
    if (t === "today") return true;
    // bazı serverlar "Today" yerine lokal dil kullanabilir, ama senin HTML "yesterday/today"
    // kesin tarih ile de yakalayalım:
    const today = getServerDateDDMMYYYY();
    if (t === today.toLowerCase()) return true;
    return false;
  }

  function bar(value, maxValue) {
    // Basit BBCode bar: 0..1 arası doluluk
    const v = Number(value) || 0;
    const m = Number(maxValue) || 1;
    const ratio = Math.max(0, Math.min(1, m > 0 ? v / m : 0));

    const totalBlocks = 12;
    const filled = Math.round(ratio * totalBlocks);
    const empty = totalBlocks - filled;

    // ÇOK basit görünüm: █ dolu, ░ boş
    return "█".repeat(filled) + "░".repeat(empty);
  }

  function copyToClipboard(text) {
    // TW sayfalarında genelde HTTPS; navigator clipboard çalışır, olmazsa fallback
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    const $ta = $("<textarea>")
      .css({ position: "fixed", left: "-9999px", top: "-9999px" })
      .val(text)
      .appendTo("body");
    $ta[0].select();
    document.execCommand("copy");
    $ta.remove();
    return Promise.resolve();
  }

  function ajaxGet(url) {
    return $.get(url);
  }

  /* ==========================
     2) FETCH URL BUILDERS
     ========================== */

  function urlRankingInADay(type, offset) {
    // type: loot_res | loot_vil | scavenge | kill_att ...
    const village = getVillageId();
    // offset 0,50,100...
    return (
      getBaseUrl() +
      "/game.php?village=" +
      encodeURIComponent(village) +
      "&screen=ranking&mode=in_a_day&type=" +
      encodeURIComponent(type) +
      "&offset=" +
      encodeURIComponent(offset || 0)
    );
  }

  function urlRankingAlly(offset) {
    // Klan sıralaması: screen=ranking&mode=ally
    const village = getVillageId();
    // TW ally ranking de offset mantığı aynı (0, 25/50) olabilir; biz ilk sayfa yeterli
    return (
      getBaseUrl() +
      "/game.php?village=" +
      encodeURIComponent(village) +
      "&screen=ranking&mode=ally&offset=" +
      encodeURIComponent(offset || 0)
    );
  }

  /* ==========================
     3) PARSERS
     ========================== */

  // A) In-a-day ranking: BUGÜN kayıtlarını alıp tribe tag + score döndürür
  // HTML şeman:
  // <table id="in_a_day_ranking_table">
  //   <tr><th>Rank</th><th>Name</th><th>Tribe</th><th>Score</th><th>Date</th></tr>
  //   <tr><td>...</td><td>player</td><td><a>LS</a></td><td>594.583</td><td>yesterday</td></tr>
  // </table>
  function parseInADayRankingToday(html) {
    const list = [];
    const $doc = $(html);

    $doc.find("#in_a_day_ranking_table tr:gt(0)").each(function () {
      const $tr = $(this);
      const $tds = $tr.find("td");
      if ($tds.length < 5) return;

      const dateText = $tds.eq(4).text().trim();
      if (!isTodayDateCell(dateText)) return;

      // Tribe sütunu: td:eq(2) içindeki <a> (tag)
      const tag = $tds.eq(2).find("a").first().text().trim();

      // Klanı olmayan oyuncular boş olur; raporda istemiyorsan burada filtrele
      if (!tag) return;

      // Score sütunu: td:eq(3)
      const score = parseIntDots($tds.eq(3).text());

      list.push({ tag: tag, score: score });
    });

    return list;
  }

  // B) Tribe ranking (mode=ally): ilk N klanın tag + points’ini çek
  // TribalWars arayüzüne göre tablo id farklı olabilir.
  // Genelde: #rank_table veya .vis tablosu
  function parseTopTribes(html, limit) {
    const $doc = $(html);

    // En olası tablo: #rank_table
    let $table = $doc.find("#rank_table");
    if ($table.length === 0) {
      // fallback: ilk "vis" table (ama menü tabloları da var)
      // rank tablosu genelde "vis" ve içinde "Tribe" linkleri olur
      const candidates = $doc.find("table.vis");
      candidates.each(function () {
        const txt = $(this).text();
        if (txt && txt.toLowerCase().includes("tribe") && txt.toLowerCase().includes("points")) {
          $table = $(this);
          return false;
        }
      });
    }

    const out = [];
    if ($table.length === 0) return out;

    $table.find("tr:gt(0)").each(function () {
      if (out.length >= (limit || 15)) return false;

      const $tr = $(this);
      const $tds = $tr.find("td");
      if ($tds.length < 3) return;

      // Tag genelde ikinci sütunda link text olabilir
      // Rank | Tribe | Points | Members ...
      // bazı serverlarda Tribe "name" olarak uzun olur; tag yoksa name’i kullanırız
      let tag = $tds.eq(1).find("a").first().text().trim();
      if (!tag) tag = $tds.eq(1).text().trim();

      // Points genelde bir sonraki sütun
      const points = parseIntDots($tds.eq(2).text());

      if (!tag) return;
      out.push({ tag: tag, points: points });
    });

    return out;
  }

  /* ==========================
     4) DATA PIPELINE
     ========================== */

  async function fetchInADayTotalsByTribeToday(type) {
    const totals = {}; // { TAG: totalScore }

    const perPage = 50;
    for (let page = 0; page < YAVER.inADayMaxPages; page++) {
      const offset = page * perPage;
      const url = urlRankingInADay(type, offset);

      log("GET", url);
      const html = await ajaxGet(url);

      const rows = parseInADayRankingToday(html);
      log(type, "page", page, "rows(today)", rows.length);

      if (!rows.length && page >= 1) {
        // 2. sayfadan itibaren hiç today yoksa kes (performans)
        break;
      }

      rows.forEach((r) => {
        totals[r.tag] = (totals[r.tag] || 0) + (r.score || 0);
      });
    }

    return totals;
  }

  async function fetchTopTribes() {
    const html = await ajaxGet(urlRankingAlly(0));
    const tribes = parseTopTribes(html, YAVER.topTribesLimit);
    return tribes;
  }

  function buildWorldResults(topTribes, totalsLootRes, totalsLootVil, totalsScavenge) {
    // WorldResults: her klan için bugün toplamları + ratio
    const results = topTribes.map((t, idx) => {
      const tag = t.tag;
      const points = t.points || 0;

      const lootRes = totalsLootRes[tag] || 0;
      const lootVil = totalsLootVil[tag] || 0;
      const scav = totalsScavenge[tag] || 0;

      // "Total Res" = loot_res + scavenge (ikisi de kaynak baz)
      const totalRes = lootRes + scav;

      // "Score" (oran) = totalRes / points (points 0 ise 0)
      const ratio = points > 0 ? totalRes / points : 0;

      return {
        rank: idx + 1,
        tag: tag,
        points: points,
        lootRes: lootRes,
        lootVil: lootVil,
        scav: scav,
        totalRes: totalRes,
        ratio: ratio,
      };
    });

    // ratio için max
    const maxRatio = results.reduce((m, r) => Math.max(m, r.ratio || 0), 0) || 1;

    // BBCode bar için normalize değeri
    results.forEach((r) => (r.perfBar = bar(r.ratio, maxRatio)));

    return { results, maxRatio };
  }

  /* ==========================
     5) REPORT (BBCode)
     ========================== */

  function generateFinalBBCode(bundle) {
    const today = getServerDateDDMMYYYY();
    const { topTribes, totalsLootRes, totalsLootVil, totalsScavenge, worldPack } = bundle;

    const { results: worldResults, maxRatio } = worldPack;

    let out = "";
    out += `[b]Yaver Report ${YAVER.version}[/b]\n`;
    out += `Tarih: [b]${today}[/b]\n`;
    out += `Toplam taranan sayfa: [b]${YAVER.inADayMaxPages}[/b] (in_a_day)\n\n`;

    // WORLD TOP 15 (Perf EN SAĞDA ✅)
    out += `[b]WORLD TOP ${YAVER.topTribesLimit} (Bugün Kaynak Performansı)[/b]\n`;
    out += `[table]\n`;
    out += `[**]Rank[||]Tribe[||]Total Pts[||]Total Res[||]Score[||]Perf[/**]\n`;

    worldResults.forEach((w) => {
      out +=
        `[*]${w.rank}` +
        `[|][ally]${escapeBB(w.tag)}[/ally]` +
        `[|]${fmt(w.points)}` +
        `[|]${fmt(w.totalRes)}` +
        `[|][b]${w.ratio.toFixed(2)}[/b]` +
        `[|]${w.perfBar}\n`;
    });

    out += `[/table]\n\n`;
    out += `[i]Not: Score = (Bugün Loot_Res + Scavenge) / Total Points. Perf bar, bu skorun tablodaki maksimuma göre normalize edilmiş halidir.[/i]\n\n`;

    // Detay kırılım tabloları (isteğe bağlı ama faydalı)
    out += `[b]DETAY: Bugün Toplamları (Top Tribes ile sınırlı)[/b]\n`;

    // Loot Res
    out += `[u]Resources plundered (loot_res)[/u]\n`;
    out += `[table]\n[**]Tribe[||]Total[/][/**]\n`;
    topTribes.forEach((t) => {
      const v = totalsLootRes[t.tag] || 0;
      out += `[*][ally]${escapeBB(t.tag)}[/ally][|]${fmt(v)}\n`;
    });
    out += `[/table]\n\n`;

    // Loot Vil
    out += `[u]Villages plundered (loot_vil)[/u]\n`;
    out += `[table]\n[**]Tribe[||]Total[/][/**]\n`;
    topTribes.forEach((t) => {
      const v = totalsLootVil[t.tag] || 0;
      out += `[*][ally]${escapeBB(t.tag)}[/ally][|]${fmt(v)}\n`;
    });
    out += `[/table]\n\n`;

    // Scavenge
    out += `[u]Resources gathered (scavenge)[/u]\n`;
    out += `[table]\n[**]Tribe[||]Total[/][/**]\n`;
    topTribes.forEach((t) => {
      const v = totalsScavenge[t.tag] || 0;
      out += `[*][ally]${escapeBB(t.tag)}[/ally][|]${fmt(v)}\n`;
    });
    out += `[/table]\n`;

    return out;
  }

  /* ==========================
     6) UI / RUNNER
     ========================== */

  function ensureButton() {
    const id = "yaver_run_btn_v4";
    if ($("#" + id).length) return;

    const $btn = $(
      `<a id="${id}" class="btn" style="margin:6px 0; display:inline-block;">
        Yaver Report ${YAVER.version}
      </a>`
    );

    $btn.on("click", runYaver);

    // sayfanın içeriğine ekle
    const $target = $("#content_value");
    if ($target.length) {
      $target.prepend($btn);
    } else {
      $("body").prepend($btn);
    }
  }

  function showResultModal(title, text) {
    // TW UI Dialog varsa onu kullan
    const html =
      `<div style="max-width:900px;">
        <div style="margin:6px 0 10px 0;">
          <a class="btn" id="yaver_copy_btn">BBCode Kopyala</a>
        </div>
        <textarea id="yaver_out_ta" style="width:100%; height:420px;">${text.replace(/</g, "&lt;")}</textarea>
      </div>`;

    if (window.Dialog && Dialog.show) {
      Dialog.show(title, html);
    } else {
      // fallback
      alert("Yaver: Çıktı textarea'ya basıldı. (Dialog yok)");
      $("body").append(html);
    }

    // Copy
    setTimeout(() => {
      $("#yaver_copy_btn").off("click").on("click", async () => {
        const val = $("#yaver_out_ta").val();
        try {
          await copyToClipboard(val);
          if (window.UI && UI.SuccessMessage) UI.SuccessMessage("Kopyalandı ✅", 1500);
        } catch (e) {
          if (window.UI && UI.ErrorMessage) UI.ErrorMessage("Kopyalama başarısız ❌", 3000);
        }
      });
    }, 0);
  }

  async function runYaver() {
    const started = Date.now();
    try {
      if (window.UI && UI.SuccessMessage) UI.SuccessMessage(`Yaver ${YAVER.version}: Veri toplanıyor...`, 1500);

      // 1) Top Tribes (points)
      const topTribes = await fetchTopTribes();
      if (!topTribes.length) {
        if (window.UI && UI.ErrorMessage) UI.ErrorMessage("Top Tribes okunamadı (mode=ally tablosu bulunamadı).", 5000);
        return;
      }

      // 2) In-a-day today totals
      const [totalsLootRes, totalsLootVil, totalsScavenge] = await Promise.all([
        fetchInADayTotalsByTribeToday("loot_res"),
        fetchInADayTotalsByTribeToday("loot_vil"),
        fetchInADayTotalsByTribeToday("scavenge"),
      ]);

      // 3) Build & report
      const worldPack = buildWorldResults(topTribes, totalsLootRes, totalsLootVil, totalsScavenge);

      const bb = generateFinalBBCode({
        topTribes,
        totalsLootRes,
        totalsLootVil,
        totalsScavenge,
        worldPack,
      });

      const ms = Date.now() - started;
      if (window.UI && UI.SuccessMessage) UI.SuccessMessage(`Yaver: Rapor hazır (${(ms / 1000).toFixed(1)}s) ✅`, 2500);

      showResultModal(`Yaver Report ${YAVER.version}`, bb);
    } catch (err) {
      console.error(err);
      if (window.UI && UI.ErrorMessage) UI.ErrorMessage("Yaver: Hata oluştu. Console'u kontrol et.", 5000);
    }
  }

  /* ==========================
     7) BOOT
     ========================== */

  ensureButton();

  // otomatik çalıştırmak istersen:
  // runYaver();

})();
