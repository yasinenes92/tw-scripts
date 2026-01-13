/*
 * Script Name: Yaver Siege Cleaner (Single Purpose)
 * Author: controleng
 * Version: 4.1 (Quantity-only + Attack&Defense + All pages + 429 backoff)
 * Description: Scans Attack+Defense report lists across ALL pages. For each report, checks BOTH sides (Attacker+Defender):
 *              (pop < 20) AND (ram OR catapult present). Marks and deletes matched reports.
 */

(function () {
  "use strict";

  // ====== GUARD ======
  const qs = new URLSearchParams(window.location.search);
  const gameScreen = qs.get("screen");
  if (gameScreen !== "report") {
    window.UI?.ErrorMessage
      ? UI.ErrorMessage("Bu script sadece Raporlar sayfasında çalışır!", 3000)
      : alert("Bu script sadece Raporlar sayfasında çalışır!");
    return;
  }

  // ====== AYARLAR ======
  const LIMIT_POP = 20;                 // pop < 20
  const MODES_TO_SCAN = ["attack", "defense"]; // iki klasörü de tara
  const MIN_DELAY_MS = 450;             // istekler arası temel bekleme
  const JITTER_MS = 250;                // random ek gecikme
  const RETRY_429_MAX = 6;              // 429 için retry
  const RETRY_429_BASE_WAIT = 3500;     // 429 bekleme tabanı (ms)
  const DELETE_BATCH_SIZE = 50;         // toplu silme batch

  // Pop maliyetleri
  const unitPop = {
    spear: 1, sword: 1, axe: 1, archer: 1,
    spy: 2,
    light: 4, marcher: 5, heavy: 6,
    ram: 5, catapult: 8,
    knight: 10, snob: 100,
    militia: 0
  };

  // Stop flag: console'da -> window.__YAVER_SIEGE_STOP__ = true;
  window.__YAVER_SIEGE_STOP__ = false;

  // ====== UI (status box) ======
  function createStatusBox() {
    if (document.getElementById("yaver-status-box")) return;

    const box = document.createElement("div");
    box.id = "yaver-status-box";
    box.className = "vis";
    box.style.cssText =
      "margin:10px 0; padding:10px; border:2px solid #a30000; background:#ffd6d6; color:#500; font-weight:bold; text-align:center;";

    box.innerHTML = `
      🛡️ Yaver Siege Cleaner <span style="font-size:0.8em; color:#333;">(by controleng)</span><br>
      <span id="yaver-status-text">Hazırlanıyor...</span>
      <div style="height:6px; background:#fff; margin-top:6px; border:1px solid #caa;">
        <div id="yaver-progress" style="height:100%; width:0%; background:#a30000;"></div>
      </div>
      <div style="margin-top:6px; font-size:12px; color:#333;">
        Stop: <code>window.__YAVER_SIEGE_STOP__ = true</code>
      </div>
    `;

    const anchor = document.querySelector(".modemenu");
    if (anchor && anchor.parentElement) anchor.parentElement.insertBefore(box, anchor.nextSibling);
    else document.body.insertBefore(box, document.body.firstChild);
  }

  function setStatus(text) {
    const el = document.getElementById("yaver-status-text");
    if (el) el.innerHTML = text;
  }

  function setProgress(pct) {
    const bar = document.getElementById("yaver-progress");
    if (bar) bar.style.width = `${Math.max(0, Math.min(100, pct))}%`;
  }

  // ====== HELPERS ======
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  function getVillageId() {
    // DS bazen village=21479 ya da p21479 gibi; ama URL'deki village param genelde numeric
    const v = new URLSearchParams(location.search).get("village");
    if (v && /^\d+$/.test(v)) return v;
    if (window.game_data?.village?.id) return String(window.game_data.village.id);
    return "";
  }

  const VILLAGE_ID = getVillageId();
  const CSRF = window.game_data?.csrf || window.csrf_token || "";

  function buildReportListUrl(mode, from) {
    // /game.php?village=21479&screen=report&mode=attack&from=100
    const p = new URLSearchParams();
    if (VILLAGE_ID) p.set("village", VILLAGE_ID);
    p.set("screen", "report");
    p.set("mode", mode);
    if (typeof from === "number" && from > 0) p.set("from", String(from));
    return `/game.php?${p.toString()}`;
  }

  function getProcessDeleteUrl() {
    const form = document.querySelector('form[action*="mode=process_reports"]');
    if (form?.action) return form.action;

    // fallback
    const p = new URLSearchParams();
    if (VILLAGE_ID) p.set("village", VILLAGE_ID);
    p.set("screen", "report");
    p.set("mode", "process_reports");
    p.set("refmode", "all");
    return `/game.php?${p.toString()}`;
  }

  function getPageSizeFromDom() {
    const val = document.querySelector('input[name="page_size"]')?.value;
    const n = parseInt(val || "100", 10);
    return Number.isFinite(n) && n > 0 ? n : 100;
  }

  function parseListPage(html) {
    const doc = new DOMParser().parseFromString(html, "text/html");

    const links = Array.from(doc.querySelectorAll("#report_list a.report-link"))
      .map(a => {
        const id = a.getAttribute("data-id") || (a.href.match(/view=(\d+)/)?.[1]);
        if (!id) return null;
        return { id: String(id), url: a.href };
      })
      .filter(Boolean);

    const numReports = parseInt(doc.querySelector('input[name="num_reports"]')?.value || "0", 10) || links.length;
    return { links, numReports };
  }

  async function fetchTextWith429Retry(url) {
    // araya küçük gecikme
    await sleep(MIN_DELAY_MS + Math.random() * JITTER_MS);

    let attempt = 0;
    while (true) {
      if (window.__YAVER_SIEGE_STOP__) throw new Error("STOPPED");

      const res = await fetch(url, { credentials: "include" });

      if (res.status !== 429) {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.text();
      }

      // 429 -> backoff
      attempt++;
      if (attempt > RETRY_429_MAX) throw new Error("HTTP 429 (max retry)");

      const waitMs = RETRY_429_BASE_WAIT * attempt + Math.floor(Math.random() * 1200);
      setStatus(`⚠️ 429 Too Many Requests. Bekleniyor: ${(waitMs / 1000).toFixed(1)}s (retry ${attempt}/${RETRY_429_MAX})`);
      await sleep(waitMs);
    }
  }

  // ====== RAPOR DETAY PARSE (kritik: SADECE Quantity satırı) ======
  function parseQuantityFromSide(sideRoot) {
    if (!sideRoot) return null;

    // Quantity satırını bul (Losses ile karışmasın!)
    // Quantity satırında td.unit-item'lar var.
    let qtyRow =
      Array.from(sideRoot.querySelectorAll("tr")).find(tr => /Quantity/i.test(tr.textContent || ""));

    // Fallback: units tablosunu bulup (unit-item içeren) Quantity satırını arayalım
    if (!qtyRow) {
      const tables = Array.from(sideRoot.querySelectorAll("table"))
        .filter(t => t.querySelector("td.unit-item"));
      for (const t of tables) {
        const r = Array.from(t.querySelectorAll("tr")).find(tr => /Quantity/i.test(tr.textContent || ""));
        if (r) { qtyRow = r; break; }
      }
    }

    // Son fallback: unit-item içeren ama Losses olmayan ilk satır
    if (!qtyRow) {
      qtyRow = Array.from(sideRoot.querySelectorAll("tr")).find(tr =>
        tr.querySelector("td.unit-item") && !/Losses/i.test(tr.textContent || "")
      );
    }

    if (!qtyRow) return null;

    const counts = {};
    const cells = Array.from(qtyRow.querySelectorAll("td.unit-item"));
    for (const td of cells) {
      const unitClass = Array.from(td.classList).find(c => c.startsWith("unit-item-") && c !== "unit-item");
      if (!unitClass) continue;
      const unitName = unitClass.replace("unit-item-", "").trim();

      const raw = td.getAttribute("data-unit-count") ?? td.textContent ?? "0";
      const count = parseInt(String(raw).replace(/[^\d]/g, ""), 10) || 0;
      counts[unitName] = count;
    }

    let totalPop = 0;
    for (const [u, n] of Object.entries(counts)) {
      if (typeof unitPop[u] === "number") totalPop += n * unitPop[u];
    }

    const hasSiege = (counts.ram || 0) > 0 || (counts.catapult || 0) > 0;
    return { counts, totalPop, hasSiege };
  }

  function parseReportDetail(html) {
    const doc = new DOMParser().parseFromString(html, "text/html");

    // Çoğu savaş raporunda bu id’ler var
    const attackerRoot = doc.querySelector("#attack_info_att") || doc.querySelector("table#attack_info_att");
    const defenderRoot = doc.querySelector("#attack_info_def") || doc.querySelector("table#attack_info_def");

    const attacker = parseQuantityFromSide(attackerRoot);
    const defender = parseQuantityFromSide(defenderRoot);

    return { attacker, defender };
  }

  function isMatch(side) {
    if (!side) return false;
    return side.hasSiege && side.totalPop < LIMIT_POP;
  }

  // ====== DELETE ======
  async function deleteReportsByIds(ids) {
    if (!ids.length) return;

    const url = getProcessDeleteUrl();
    const groupId = window.game_data?.group_id ?? "0";

    // batch batch
    for (let i = 0; i < ids.length; i += DELETE_BATCH_SIZE) {
      if (window.__YAVER_SIEGE_STOP__) throw new Error("STOPPED");

      const batch = ids.slice(i, i + DELETE_BATCH_SIZE);

      setStatus(`🧨 Siliniyor... batch ${Math.floor(i / DELETE_BATCH_SIZE) + 1}/${Math.ceil(ids.length / DELETE_BATCH_SIZE)} (${batch.length} rapor)`);

      const body = new URLSearchParams();
      body.set("from", "0");
      body.set("num_reports", "0");
      body.set("current_group_id", String(groupId));
      if (CSRF) body.set("h", CSRF);
      body.set("del", "Delete");

      for (const id of batch) {
        body.set(`id_${id}`, "on");
      }

      const res = await fetch(url, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" },
        body: body.toString()
      });

      if (!res.ok) {
        throw new Error(`Delete HTTP ${res.status}`);
      }

      // küçük bekleme
      await sleep(600 + Math.random() * 400);
    }
  }

  // ====== MAIN ======
  async function run() {
    createStatusBox();
    setStatus("📌 Attack + Defense klasörlerindeki tüm sayfalar toplanıyor...");
    setProgress(0);

    const pageSize = getPageSizeFromDom();
    const all = new Map(); // id -> url

    // 1) Listeleri topla (attack + defense, tüm sayfalar)
    for (let m = 0; m < MODES_TO_SCAN.length; m++) {
      if (window.__YAVER_SIEGE_STOP__) throw new Error("STOPPED");

      const mode = MODES_TO_SCAN[m];
      setStatus(`📚 Liste çekiliyor: <b>${mode}</b> (ilk sayfa)...`);

      const firstHtml = await fetchTextWith429Retry(buildReportListUrl(mode, 0));
      const first = parseListPage(firstHtml);

      first.links.forEach(x => all.set(x.id, x.url));

      const totalReports = first.numReports;
      const totalPages = Math.max(1, Math.ceil(totalReports / pageSize));

      for (let p = 2; p <= totalPages; p++) {
        if (window.__YAVER_SIEGE_STOP__) throw new Error("STOPPED");

        const from = (p - 1) * pageSize;
        setStatus(`📚 Liste çekiliyor: <b>${mode}</b> sayfa ${p}/${totalPages}...`);

        const html = await fetchTextWith429Retry(buildReportListUrl(mode, from));
        const parsed = parseListPage(html);
        parsed.links.forEach(x => all.set(x.id, x.url));

        const overallPct = ((m + (p / totalPages)) / MODES_TO_SCAN.length) * 25; // ilk faz %25
        setProgress(overallPct);
      }
    }

    const jobs = Array.from(all.entries()).map(([id, url]) => ({ id, url }));
    if (!jobs.length) {
      setStatus("❌ Attack/Defense içinde rapor bulunamadı.");
      return;
    }

    // 2) Detayları tarayıp eşleşenleri bul
    setStatus(`🔎 Detay taraması başlıyor... Toplam rapor: <b>${jobs.length}</b>`);
    const matchedIds = [];
    let processed = 0;

    for (const j of jobs) {
      if (window.__YAVER_SIEGE_STOP__) throw new Error("STOPPED");

      processed++;
      const pct = 25 + (processed / jobs.length) * 65; // tarama fazı %65
      setProgress(pct);

      setStatus(`🔎 Tarama: ${processed}/${jobs.length} | Bulunan: <b>${matchedIds.length}</b>`);

      let html;
      try {
        html = await fetchTextWith429Retry(j.url);
      } catch (e) {
        // 429 max retry vs vb: atla ama devam et
        console.warn("[YaverSiege] fetch failed", j.id, e);
        continue;
      }

      const { attacker, defender } = parseReportDetail(html);

      // Kriter: saldıran da olabilir, savunan da olabilir
      if (isMatch(attacker) || isMatch(defender)) {
        matchedIds.push(j.id);
        console.log(
          `[YaverSiege] MATCH id=${j.id}`,
          { attacker, defender }
        );
      }
    }

    // 3) Sil
    if (!matchedIds.length) {
      setProgress(100);
      setStatus("❌ Kriterlere uygun (Siege + pop<20) rapor bulunamadı.");
      window.UI?.InfoMessage && UI.InfoMessage("Fake/Siege raporu bulunamadı.", 2000);
      return;
    }

    setStatus(`✅ Bulundu: <b>${matchedIds.length}</b> rapor. Silme başlıyor...`);
    setProgress(92);

    await deleteReportsByIds(matchedIds);

    setProgress(100);
    setStatus(`✅ İş bitti. Silinen rapor sayısı: <b>${matchedIds.length}</b>. Sayfa yenileniyor...`);
    window.UI?.SuccessMessage && UI.SuccessMessage(`Yaver Siege Cleaner: deleted ${matchedIds.length} reports ✅`, 4000);

    setTimeout(() => location.reload(), 1200);
  }

  run().catch((e) => {
    if (String(e?.message || e) === "STOPPED") {
      setStatus("⛔ Durduruldu (window.__YAVER_SIEGE_STOP__ = true).");
      window.UI?.ErrorMessage && UI.ErrorMessage("Yaver Siege Cleaner durduruldu.", 3000);
      return;
    }
    console.error("[YaverSiege] fatal:", e);
    setStatus(`❌ Hata: ${String(e?.message || e)}`);
    window.UI?.ErrorMessage && UI.ErrorMessage("Yaver Siege Cleaner hata verdi (console'a bak).", 5000);
  });

})();
