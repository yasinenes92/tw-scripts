/*
 * Script Name: Yaver Troop Auditor (AM Troops)
 * Author: controleng
 * Version: 1.0
 * Description:
 *  - Runs on Account Manager -> Troops (screen=am_troops)
 *  - Reads "current total troops per village" from the TOP colored numbers in each unit cell
 *  - Splits by groups: [saldırı] and [savunma] (from group menu links)
 *  - Shows per-village counts, per-group totals + percentages, and grand totals.
 */

(function () {
  "use strict";

  const qs = new URLSearchParams(location.search);
  const screen = qs.get("screen");

  if (screen !== "am_troops") {
    (window.UI?.ErrorMessage ? UI.ErrorMessage : alert)(
      "Bu script sadece Account Manager > Troops (am_troops) sayfasında çalışır!",
      4000
    );
    return;
  }

  // ====== CONFIG ======
  const OFF_KEYS = ["saldırı", "saldiri", "off", "offense", "attack"];
  const DEF_KEYS = ["savunma", "def", "defense", "defence"];
  const ICON_UNIT_BASE = "/graphic/unit/"; // user-provided icon base (png)
  const ICON_MAIN = "/graphic/buildings/main.png";
  const ICON_ATT = "/graphic/command/attack.png";
  const ICON_DEF = "/graphic/command/support.png";

  // Stop flag (if you ever fetch pages later): window.__YAVER_TROOP_STOP__ = true;
  window.__YAVER_TROOP_STOP__ = false;

  // ====== HELPERS ======
  const toInt = (s) => {
    const n = parseInt(String(s ?? "").replace(/[^\d]/g, ""), 10);
    return Number.isFinite(n) ? n : 0;
  };

  function normText(t) {
    return String(t || "")
      .replace(/\[|\]/g, "")
      .trim()
      .toLowerCase();
  }

  function findGroupIdByKeywords(keywords) {
    const links = Array.from(document.querySelectorAll(".group-menu-item[href*='group=']"));
    for (const a of links) {
      const txt = normText(a.textContent);
      if (keywords.some((k) => txt.includes(k))) {
        const url = new URL(a.href, location.origin);
        return url.searchParams.get("group");
      }
    }
    return null;
  }

  function getUnitsFromHeader(docRoot) {
    // Units are in header th -> a.unit_link[data-unit]
    const table = docRoot.querySelector("table.overview_table");
    if (!table) return [];
    const unitAnchors = Array.from(table.querySelectorAll("thead a.unit_link[data-unit]"));
    const units = unitAnchors.map((a) => a.getAttribute("data-unit")).filter(Boolean);

    // de-dup while preserving order
    const seen = new Set();
    return units.filter((u) => (seen.has(u) ? false : (seen.add(u), true)));
  }

  function getUnitColIndexMap(docRoot, units) {
    // Map unit -> td index in each village row.
    // In this table, first 2 columns are: Village, Buffer. Then unit columns in same order as headers.
    const map = {};
    units.forEach((u, i) => {
      map[u] = 2 + i; // 0=village, 1=buffer, then units...
    });
    return map;
  }

  function parseVillageRows(docRoot, units, colMap) {
    const table = docRoot.querySelector("table.overview_table");
    if (!table) return [];

    const rows = Array.from(table.querySelectorAll("tbody tr"))
      .filter((tr) => tr.querySelector("td.vis_item .village_anchor a"));

    const villages = [];

    for (const tr of rows) {
      const vLink = tr.querySelector("td.vis_item .village_anchor a");
      const vName = (vLink?.textContent || "").trim();

      const vId = (() => {
        const href = vLink?.getAttribute("href") || "";
        const m = href.match(/id=(\d+)/);
        return m ? m[1] : "";
      })();

      const tds = Array.from(tr.querySelectorAll("td"));
      const counts = {};

      for (const u of units) {
        const idx = colMap[u];
        const td = tds[idx];
        if (!td) { counts[u] = 0; continue; }

        // IMPORTANT: take TOP colored number (current). Ignore the bottom span[data-field] (template target).
        let curSpan =
          td.querySelector("span.green:not([data-field])") ||
          td.querySelector("span.red:not([data-field])") ||
          Array.from(td.querySelectorAll("span"))
            .find((s) => !s.hasAttribute("data-field") && /\d/.test(s.textContent || ""));

        // Fallback: first number in td text
        const val = curSpan ? toInt(curSpan.textContent) : toInt(td.textContent);
        counts[u] = val;
      }

      const totalUnits = units.reduce((acc, u) => acc + (counts[u] || 0), 0);

      villages.push({
        id: vId,
        name: vName,
        counts,
        totalUnits
      });
    }

    return villages;
  }

  function sumTotals(villages, units) {
    const totals = {};
    units.forEach((u) => (totals[u] = 0));
    let grand = 0;

    for (const v of villages) {
      for (const u of units) totals[u] += (v.counts[u] || 0);
      grand += v.totalUnits || 0;
    }

    return { totals, grand };
  }

  function pct(part, whole) {
    if (!whole) return "0.0%";
    return ((part / whole) * 100).toFixed(1) + "%";
  }

  function unitIcon(u) {
    // user provided .png paths; DS may serve .png even if page uses .webp
    return `${ICON_UNIT_BASE}unit_${u}.png`;
  }

  // ====== UI RENDER ======
  function ensurePanel() {
    const existing = document.getElementById("yaver_troop_panel");
    if (existing) existing.remove();

    const panel = document.createElement("div");
    panel.id = "yaver_troop_panel";
    panel.className = "vis";
    panel.style.margin = "10px 0";
    panel.style.padding = "10px";
    panel.style.border = "2px solid #7d510f";
    panel.style.background = "#f4e4bc";

    const anchor = document.querySelector("#overview_menu") || document.querySelector(".modemenu") || document.body;
    anchor.parentElement.insertBefore(panel, anchor.nextSibling);

    return panel;
  }

  function render(panel, data) {
    const {
      units,
      off,
      def,
      grand,
      missingGroups,
      missingUnitsNote
    } = data;

    const unitTh = units.map(u =>
      `<th style="text-align:center; width:36px">
        <img src="${unitIcon(u)}" style="width:18px; height:18px; vertical-align:-3px" alt="${u}">
      </th>`
    ).join("");

    const villageRowsHtml = (villages) => villages.map(v => {
      const cols = units.map(u => `<td style="text-align:center">${v.counts[u] || 0}</td>`).join("");
      return `<tr>
        <td class="vis_item"><b>${v.name}</b></td>
        <td style="text-align:center"><b>${v.totalUnits}</b></td>
        ${cols}
      </tr>`;
    }).join("");

    const totalsRowHtml = (label, totalsObj, grandTotal) => {
      const cols = units.map(u => {
        const val = totalsObj[u] || 0;
        return `<td style="text-align:center">
          <b>${val}</b><div style="font-size:11px; color:#555">${pct(val, grandTotal)}</div>
        </td>`;
      }).join("");
      return `<tr class="row_a">
        <td class="vis_item"><b>${label}</b></td>
        <td style="text-align:center"><b>${grandTotal}</b><div style="font-size:11px; color:#555">100%</div></td>
        ${cols}
      </tr>`;
    };

    const section = (title, icon, block) => `
      <div class="vis" style="margin-top:10px;">
        <div class="vis_item" style="display:flex; align-items:center; gap:8px; font-weight:bold;">
          <img src="${icon}" style="width:18px; height:18px" alt="">
          ${title}
        </div>
        ${block}
      </div>
    `;

    const tableHtml = (villages, totals, grandTotal) => `
      <table class="vis" style="width:100%; table-layout:fixed">
        <thead>
          <tr>
            <th style="text-align:left">Village</th>
            <th style="text-align:center; width:70px">Total</th>
            ${unitTh}
          </tr>
        </thead>
        <tbody>
          ${villageRowsHtml(villages)}
          ${totalsRowHtml("TOTAL", totals, grandTotal)}
        </tbody>
      </table>
    `;

    const grandTotalsRow = totalsRowHtml("GRAND TOTAL (OFF+DEF)", grand.totals, grand.grand);

    panel.innerHTML = `
      <div class="vis_item" style="display:flex; justify-content:space-between; align-items:center;">
        <div style="display:flex; align-items:center; gap:8px;">
          <img src="${ICON_MAIN}" style="width:18px; height:18px" alt="">
          <span style="font-size:16px; font-weight:bold; color:#603000;">Yaver Troop Auditor</span>
          <span style="font-size:12px; color:#555;">(Total troops per village)</span>
        </div>
        <div>
          <button class="btn" id="yaver_troop_refresh">Refresh</button>
        </div>
      </div>

      ${missingGroups ? `<div class="info_box" style="margin-top:8px;"><div class="content">
        ⚠️ <b>Grup bulunamadı:</b> ${missingGroups}<br>
        "Groups" menüsünde <b>[saldırı]</b> ve <b>[savunma]</b> linkleri görünmeli.
      </div></div>` : ""}

      ${missingUnitsNote ? `<div class="info_box" style="margin-top:8px;"><div class="content">
        ⚠️ ${missingUnitsNote}
      </div></div>` : ""}

      ${section(
        `Saldırı Orduları (Group: ${off.groupName}) — Toplam: <b>${off.sum.grand}</b>`,
        ICON_ATT,
        tableHtml(off.villages, off.sum.totals, off.sum.grand)
      )}

      ${section(
        `Savunma Orduları (Group: ${def.groupName}) — Toplam: <b>${def.sum.grand}</b>`,
        ICON_DEF,
        tableHtml(def.villages, def.sum.totals, def.sum.grand)
      )}

      <div class="vis" style="margin-top:10px;">
        <div class="vis_item" style="font-weight:bold;">Genel Toplamlar</div>
        <table class="vis" style="width:100%; table-layout:fixed">
          <thead>
            <tr>
              <th style="text-align:left">Scope</th>
              <th style="text-align:center; width:70px">Total</th>
              ${unitTh}
            </tr>
          </thead>
          <tbody>
            ${totalsRowHtml("OFFENSE TOTAL", off.sum.totals, off.sum.grand)}
            ${totalsRowHtml("DEFENSE TOTAL", def.sum.totals, def.sum.grand)}
            ${grandTotalsRow}
          </tbody>
        </table>
      </div>
    `;

    document.getElementById("yaver_troop_refresh")?.addEventListener("click", () => {
      window.__YAVER_TROOP_STOP__ = false;
      main();
    });
  }

  // ====== MAIN ======
  function readGroupPageFromCurrentDOM(groupId) {
    // We are on some group already (maybe all). We'll use current DOM only.
    const units = getUnitsFromHeader(document);
    const colMap = getUnitColIndexMap(document, units);
    const villages = parseVillageRows(document, units, colMap);
    const sum = sumTotals(villages, units);
    return { units, villages, sum };
  }

  function main() {
    try {
      const panel = ensurePanel();

      const offGroupId = findGroupIdByKeywords(OFF_KEYS);
      const defGroupId = findGroupIdByKeywords(DEF_KEYS);

      let missingGroups = "";
      if (!offGroupId) missingGroups += "[saldırı] ";
      if (!defGroupId) missingGroups += "[savunma] ";
      missingGroups = missingGroups.trim() || null;

      // IMPORTANT:
      // To truly split by groups without navigating, we'd normally fetch those group pages.
      // But you asked to use UI + console testing; also for 9 villages this page already has group links.
      // We'll do the safe approach:
      // - If both group ids exist, we will FETCH group pages in the background and parse them.
      // - If not, we fall back to current page as "all" for both.

      const baseBuildUrl = (groupId) => {
        // Prefer TribalWars.buildURL if present
        if (window.TribalWars?.buildURL) {
          return TribalWars.buildURL("GET", "am_troops", { group: groupId });
        }
        // fallback
        const v = window.game_data?.village?.id;
        const p = new URLSearchParams();
        if (v) p.set("village", String(v));
        p.set("screen", "am_troops");
        if (groupId) p.set("group", String(groupId));
        return `/game.php?${p.toString()}`;
      };

      const fetchText = async (url) => {
        const res = await fetch(url, { credentials: "include" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.text();
      };

      const parseGroupHtml = (html) => {
        const doc = new DOMParser().parseFromString(html, "text/html");
        const units = getUnitsFromHeader(doc);
        const colMap = getUnitColIndexMap(doc, units);
        const villages = parseVillageRows(doc, units, colMap);
        const sum = sumTotals(villages, units);
        return { units, villages, sum };
      };

      (async () => {
        // Start with current DOM units list; later align unit list across both groups
        const fallback = readGroupPageFromCurrentDOM(null);

        let offData = fallback;
        let defData = fallback;

        if (offGroupId) {
          try {
            const html = await fetchText(baseBuildUrl(offGroupId));
            offData = parseGroupHtml(html);
          } catch (e) {
            console.warn("[YaverTroops] Offense group fetch failed, fallback to current page.", e);
          }
        }

        if (defGroupId) {
          try {
            const html = await fetchText(baseBuildUrl(defGroupId));
            defData = parseGroupHtml(html);
          } catch (e) {
            console.warn("[YaverTroops] Defense group fetch failed, fallback to current page.", e);
          }
        }

        // Align unit set (union) to avoid missing columns if one group page differs
        const unitSet = new Set([...(offData.units || []), ...(defData.units || [])]);
        const units = Array.from(unitSet);

        // If knight/snob absent, warn
        const expected = ["knight", "snob", "militia"];
        const missing = expected.filter(u => !unitSet.has(u));
        const missingUnitsNote = missing.length
          ? `Bu ekranda şu birim sütunları görünmüyor: <b>${missing.join(", ")}</b>. Bu yüzden bunlar için toplam hesaplanamadı (0 görünebilir).`
          : "";

        // Rebuild sums with aligned units (fill missing units with 0)
        const normalize = (d) => {
          const villages = d.villages.map(v => {
            const c = {};
            units.forEach(u => c[u] = v.counts[u] || 0);
            return { ...v, counts: c, totalUnits: units.reduce((a,u)=>a+(c[u]||0),0) };
          });
          return { villages, sum: sumTotals(villages, units) };
        };

        const offN = normalize(offData);
        const defN = normalize(defData);

        // Grand totals
        const grandVillages = [...offN.villages, ...defN.villages];
        // (Villages may overlap if fallback used; but when groups are correct, they won’t.)
        const grand = sumTotals(grandVillages, units);

        render(panel, {
          units,
          off: { groupName: offGroupId ? "saldırı" : "all (fallback)", villages: offN.villages, sum: offN.sum },
          def: { groupName: defGroupId ? "savunma" : "all (fallback)", villages: defN.villages, sum: defN.sum },
          grand,
          missingGroups,
          missingUnitsNote
        });

        window.UI?.SuccessMessage && UI.SuccessMessage("Yaver Troop Auditor hazır ✅", 2500);
      })().catch((e) => {
        console.error("[YaverTroops] fatal:", e);
        window.UI?.ErrorMessage && UI.ErrorMessage("Yaver Troop Auditor hata verdi (console'a bak).", 5000);
      });
    } catch (e) {
      console.error(e);
      window.UI?.ErrorMessage && UI.ErrorMessage("Script çalıştırılamadı (console'a bak).", 5000);
    }
  }

  main();
})();
