/*
 * Script Name: Yaver Siege Cleaner (All Pages)
 * Author: controleng + yaver patch
 * Purpose: Find & delete reports where (Attacker OR Defender) has <20 pop AND (ram OR catapult)
 * Runs: Reports LIST page (screen=report)
 */
(function () {
  "use strict";

  // ================== AYARLAR ==================
  const LIMIT_POP = 20;

  // 429 yememek için:
  const CONCURRENCY = 1;                    // 1 bırak
  const DELAY_REPORT_MS = [900, 1600];      // her rapor view fetch + delete arası
  const DELAY_LISTPAGE_MS = [350, 800];     // sayfa liste fetchleri arası

  const RETRY_MAX = 6;
  const BACKOFF_BASE_MS = 2500;
  const BACKOFF_MAX_MS = 30000;

  // Sayfa başına rapor sayısı (sen 100 kullanıyorsun)
  const FALLBACK_PAGE_SIZE = 100;

  // ================== POP MALİYETLERİ ==================
  const unitPop = {
    spear: 1, sword: 1, axe: 1, archer: 1,
    spy: 2,
    light: 4, marcher: 5, heavy: 6,
    ram: 5, catapult: 8,
    knight: 10, snob: 100, militia: 0
  };

  // Stop bayrağı: console'dan durdurmak için
  window.__YAVER_SCAN_STOP__ = false;

  // ================== GUARD ==================
  const qs = new URLSearchParams(location.search);
  const screen = qs.get("screen");
  if (screen !== "report") {
    window.UI?.ErrorMessage?.("Bu script sadece Raporlar (screen=report) sayfasında çalışır!", 3000);
    return;
  }

  if (!confirm("Yaver Siege Cleaner tüm sayfaları tarayıp uygun raporları SİLECEK. Devam?")) {
    return;
  }

  // ================== UTILS ==================
  const rand = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  function parseHtml(html) {
    return new DOMParser().parseFromString(html, "text/html");
  }

  function getCsrf() {
    // TW genelde game_data.csrf sağlar
    if (window.game_data?.csrf) return window.game_data.csrf;
    if (window.csrf_token) return window.csrf_token;
    // son çare: sayfadaki hidden input
    const h = document.querySelector('input[name="h"]')?.value;
    return h || null;
  }

  function getTotalReports() {
    const el = document.querySelector('input[name="num_reports"]');
    const n = el ? parseInt(el.value, 10) : NaN;
    return Number.isFinite(n) ? n : null;
  }

  function getPageSize() {
    const el = document.querySelector('input[name="page_size"]');
    const n = el ? parseInt(el.value, 10) : NaN;
    return Number.isFinite(n) && n > 0 ? n : FALLBACK_PAGE_SIZE;
  }

  function buildListUrl(from) {
    // mevcut URL'den üret, view/action/id gibi parametreleri temizle
    const u = new URL(location.href);
    u.searchParams.set("screen", "report");

    // mode yoksa all kabul
    if (!u.searchParams.get("mode")) u.searchParams.set("mode", "all");

    u.searchParams.delete("view");
    u.searchParams.delete("action");
    u.searchParams.delete("id");
    u.searchParams.set("from", String(from));
    return u.toString();
  }

  function normalizeUrl(href) {
    return new URL(href, location.origin).toString();
  }

  // ================== FETCH (RETRY/BACKOFF) ==================
  async function fetchTextWithRetry(url) {
    let attempt = 0;

    while (!window.__YAVER_SCAN_STOP__) {
      attempt++;
      try {
        const res = await fetch(url, { credentials: "include" });

        if (res.status === 429) {
          const retryAfter = res.headers.get("Retry-After");
          let waitMs = retryAfter ? (parseInt(retryAfter, 10) * 1000) : (BACKOFF_BASE_MS * attempt);
          waitMs = Math.min(BACKOFF_MAX_MS, waitMs + rand(500, 1500));
          console.warn(`[Yaver] 429 -> wait ${waitMs}ms (attempt ${attempt})`, url);
          await sleep(waitMs);
          if (attempt >= RETRY_MAX) throw new Error("HTTP 429 (max retry)");
          continue;
        }

        if (!res.ok) {
          if (res.status >= 500 && attempt < RETRY_MAX) {
            const waitMs = Math.min(BACKOFF_MAX_MS, (1200 * attempt) + rand(300, 900));
            console.warn(`[Yaver] ${res.status} -> retry in ${waitMs}ms (attempt ${attempt})`, url);
            await sleep(waitMs);
            continue;
          }
          throw new Error(`HTTP ${res.status}`);
        }

        return await res.text();
      } catch (e) {
        if (attempt >= RETRY_MAX) throw e;
        const waitMs = Math.min(BACKOFF_MAX_MS, (1200 * attempt) + rand(400, 1200));
        console.warn(`[Yaver] fetch error -> retry in ${waitMs}ms (attempt ${attempt})`, e);
        await sleep(waitMs);
      }
    }
    throw new Error("Stopped");
  }

  // ================== PARSE (ATTACKER + DEFENDER) ==================
  function parseUnitsFromUnitsTable(unitsTable) {
    // "Quantity:" satırındaki td.unit-item hücreleri data-unit-count içeriyor
    const trs = Array.from(unitsTable.querySelectorAll("tr"));
    const qtyRow = trs.find(tr => (tr.textContent || "").includes("Quantity")) || trs[1];
    if (!qtyRow) return null;

    const counts = {};
    const cells = Array.from(qtyRow.querySelectorAll("td.unit-item"));
    for (const td of cells) {
      const cls = Array.from(td.classList).find(c => c.startsWith("unit-item-") && c !== "unit-item");
      if (!cls) continue;

      const unit = cls.replace("unit-item-", "");
      const raw = td.getAttribute("data-unit-count") ?? td.textContent ?? "0";
      const n = parseInt(String(raw).replace(/[^\d]/g, ""), 10) || 0;
      counts[unit] = n;
    }

    let pop = 0;
    for (const [unit, n] of Object.entries(counts)) {
      if (typeof unitPop[unit] === "number") pop += n * unitPop[unit];
    }

    const hasSiege = (counts.ram || 0) > 0 || (counts.catapult || 0) > 0;

    return { pop, hasSiege, counts };
  }

  function parseReportSides(html) {
    const doc = parseHtml(html);

    // saldıran/savunan units tabloları (varsa)
    const attTable = doc.querySelector("#attack_info_att_units");
    const defTable = doc.querySelector("#attack_info_def_units");

    const att = attTable ? parseUnitsFromUnitsTable(attTable) : null;
    const def = defTable ? parseUnitsFromUnitsTable(defTable) : null;

    return { att, def };
  }

  function sideMatches(side) {
    if (!side) return false;
    return side.hasSiege && side.pop < LIMIT_POP;
  }

  // ================== LISTE SAYFASI PARSE ==================
  function extractReportsFromListHtml(html) {
    const doc = parseHtml(html);
    const table = doc.querySelector("#report_list");
    if (!table) return [];

    const rows = Array.from(table.querySelectorAll("tr"))
      .filter(tr => /report-\d+/.test(tr.className));

    const out = [];
    for (const tr of rows) {
      const a = tr.querySelector("a.report-link");
      if (!a) continue;

      const id = a.getAttribute("data-id") || (a.getAttribute("href") || "").match(/view=(\d+)/)?.[1];
      const href = a.getAttribute("href");
      if (!id || !href) continue;

      const subject = (a.textContent || "").trim().replace(/\s+/g, " ").slice(0, 160);
      const tds = tr.querySelectorAll("td");
      const received = (tds[tds.length - 1]?.textContent || "").trim();

      out.push({ id: String(id), url: normalizeUrl(href), subject, received });
    }
    return out;
  }

  // ================== DELETE ==================
  async function deleteReportById(id, csrf) {
    // rapor view sayfasında görünen delete link formatı
    const delUrl = normalizeUrl(
      TribalWars.buildURL("GET", "report", { mode: "all", action: "del_one", id: String(id), h: csrf })
    );
    // GET ile delete tetikleniyor
    await fetchTextWithRetry(delUrl);
  }

  // ================== MAIN ==================
  async function run() {
    const csrf = getCsrf();
    if (!csrf) {
      window.UI?.ErrorMessage?.("CSRF (h) token bulunamadı. Sayfayı yenileyip tekrar dene.", 4000);
      return;
    }

    const totalReports = getTotalReports();
    const pageSize = getPageSize();
    if (!totalReports) {
      window.UI?.ErrorMessage?.("num_reports okunamadı. Reports list sayfasında olduğundan emin ol.", 4000);
      return;
    }

    const totalPages = Math.ceil(totalReports / pageSize);
    console.clear();
    console.log(`[Yaver] Start | totalReports=${totalReports} pageSize=${pageSize} pages=${totalPages}`);

    window.UI?.SuccessMessage?.(`Yaver: ${totalReports} rapor / ${totalPages} sayfa taranıyor…`, 2500);

    const seen = new Set();
    const candidates = [];

    // 1) Tüm sayfalardaki rapor linklerini topla
    for (let p = 0; p < totalPages && !window.__YAVER_SCAN_STOP__; p++) {
      const from = p * pageSize;
      const listUrl = buildListUrl(from);

      const html = await fetchTextWithRetry(listUrl);
      const items = extractReportsFromListHtml(html);

      for (const it of items) {
        if (seen.has(it.id)) continue;
        seen.add(it.id);
        candidates.push(it);
      }

      console.log(`[Yaver] list page ${p + 1}/${totalPages} (from=${from}) -> +${items.length} | unique=${candidates.length}`);
      await sleep(rand(...DELAY_LISTPAGE_MS));
    }

    if (window.__YAVER_SCAN_STOP__) {
      console.warn("[Yaver] stopped during list scan.");
      return;
    }

    console.log(`[Yaver] candidates=${candidates.length}. Now checking report details…`);

    // 2) Rapor detaylarını tarayıp match olanları bul
    const matched = [];
    let idx = 0;

    async function worker() {
      while (idx < candidates.length && !window.__YAVER_SCAN_STOP__) {
        const it = candidates[idx++];

        try {
          const html = await fetchTextWithRetry(it.url);
          const { att, def } = parseReportSides(html);

          const matchAtt = sideMatches(att);
          const matchDef = sideMatches(def);
          const ok = matchAtt || matchDef;

          if (ok) {
            matched.push({
              id: it.id,
              received: it.received,
              subject: it.subject,
              att: att ? `pop=${att.pop} siege=${att.hasSiege}` : "n/a",
              def: def ? `pop=${def.pop} siege=${def.hasSiege}` : "n/a",
              url: it.url
            });
            console.log(`[MATCH] id=${it.id} | A:${att ? att.pop : "n/a"} D:${def ? def.pop : "n/a"} | ${it.subject}`);
          }

        } catch (e) {
          console.warn(`[Yaver] parse/fetch failed id=${it.id}`, e);
        }

        await sleep(rand(...DELAY_REPORT_MS));
      }
    }

    await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

    if (window.__YAVER_SCAN_STOP__) {
      console.warn(`[Yaver] stopped. matched=${matched.length}`);
      window.UI?.ErrorMessage?.(`Yaver durduruldu. matched=${matched.length}`, 3000);
      return;
    }

    console.log(`[Yaver] Scan done. matched=${matched.length}`);
    console.table(matched);

    if (!matched.length) {
      window.UI?.InfoMessage?.("Kriterlere uyan rapor yok.", 2500);
      return;
    }

    // 3) Silme
    window.UI?.SuccessMessage?.(`Silme başlıyor: ${matched.length} rapor…`, 2500);

    let delOk = 0;
    for (let i = 0; i < matched.length && !window.__YAVER_SCAN_STOP__; i++) {
      const id = matched[i].id;
      try {
        await deleteReportById(id, csrf);
        delOk++;
        console.log(`[DEL] ${i + 1}/${matched.length} ok id=${id}`);
      } catch (e) {
        console.warn(`[DEL] failed id=${id}`, e);
      }
      await sleep(rand(...DELAY_REPORT_MS));
    }

    if (window.__YAVER_SCAN_STOP__) {
      console.warn(`[Yaver] stopped during delete. deleted=${delOk}/${matched.length}`);
      window.UI?.ErrorMessage?.(`Silme durduruldu. deleted=${delOk}/${matched.length}`, 4000);
      return;
    }

    window.UI?.SuccessMessage?.(`Bitti ✅ deleted=${delOk}/${matched.length}. Sayfa yenileniyor…`, 3500);
    setTimeout(() => location.reload(), 1200);
  }

  run();
})();
