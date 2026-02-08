(function () {
  "use strict";

  var Y = window.__YAVER_MASS_SCAV_V1__;
  if (!Y) return;

  Y.data = {};

  // Throttled sequential GET helper (like Sophie's)
  Y.data.getAll = function (urls, onLoad, onDone, onError) {
    var numDone = 0;
    var lastRequestTime = 0;
    var minWaitTime = 200;

    function loadNext() {
      if (numDone >= urls.length) { onDone && onDone(); return; }

      var now = Date.now();
      var elapsed = now - lastRequestTime;
      if (elapsed < minWaitTime) {
        setTimeout(loadNext, (minWaitTime - elapsed));
        return;
      }

      lastRequestTime = now;
      var url = urls[numDone];

      $.get(url)
        .done(function (data) {
          try {
            onLoad && onLoad(numDone, data, url);
            numDone++;
            loadNext();
          } catch (e) {
            onError && onError(e);
          }
        })
        .fail(function (xhr) {
          onError && onError(xhr);
        });
    }

    loadNext();
  };

  Y.data.readGroupsFromDOM = function () {
    var groups = [];
    var seen = new Set();

    // a.group-menu-item + strong.group-menu-item
    $(".group-menu-item").each(function (_, el) {
      var id = $(el).attr("data-group-id");
      var type = $(el).attr("data-group-type") || "";
      if (id == null) return;
      id = String(id);

      var name = ($(el).text() || "").trim();
      if (!name) name = (id === "0" ? "all" : ("group " + id));

      var key = id + "|" + type + "|" + name;
      if (seen.has(key)) return;
      seen.add(key);

      groups.push({ id: id, type: type, name: name });
    });

    // ensure "all" group exists
    if (!groups.some(function (g) { return g.id === "0"; })) {
      groups.unshift({ id: "0", type: "all", name: "all" });
    }

    // sort: all first, then by name
    groups.sort(function (a, b) {
      if (a.id === "0") return -1;
      if (b.id === "0") return 1;
      return a.name.localeCompare(b.name);
    });

    Y.state.groups = groups;
    return groups;
  };

  // Robust parse of the "new ScavengeMassScreen(...)" args from script text
  function readBalanced(src, i, openCh, closeCh) {
    var start = i;
    var depth = 0;
    var inStr = false;
    var esc = false;

    for (; i < src.length; i++) {
      var ch = src[i];

      if (inStr) {
        if (esc) { esc = false; continue; }
        if (ch === "\\") { esc = true; continue; }
        if (ch === "\"") { inStr = false; continue; }
        continue;
      }

      if (ch === "\"") { inStr = true; continue; }

      if (ch === openCh) { depth++; continue; }
      if (ch === closeCh) {
        depth--;
        if (depth === 0) {
          return { text: src.slice(start, i + 1), end: i + 1 };
        }
      }
    }
    return null;
  }

  function skipWsAndCommas(src, i) {
    while (i < src.length) {
      var c = src[i];
      if (c === " " || c === "\n" || c === "\r" || c === "\t" || c === ",") { i++; continue; }
      break;
    }
    return i;
  }

  function readNumberToken(src, i) {
    var start = i;
    while (i < src.length) {
      var c = src[i];
      if ((c >= "0" && c <= "9") || c === "." || c === "-" ) { i++; continue; }
      break;
    }
    return { text: src.slice(start, i), end: i };
  }

  Y.data.parseMassScreenFromHtml = function (html) {
    var scriptText = null;

    try {
      scriptText = $(html).find('script:contains("ScavengeMassScreen")').html();
    } catch (e) {}

    if (!scriptText) {
      try { scriptText = $('script:contains("ScavengeMassScreen")').html(); } catch (e2) {}
    }

    if (!scriptText) return null;

    var idx = scriptText.indexOf("new ScavengeMassScreen");
    if (idx < 0) return null;

    var p0 = scriptText.indexOf("(", idx);
    if (p0 < 0) return null;

    var i = p0 + 1;
    i = skipWsAndCommas(scriptText, i);

    // arg1: option_bases object
    if (scriptText[i] !== "{") return null;
    var a1 = readBalanced(scriptText, i, "{", "}");
    if (!a1) return null;
    i = skipWsAndCommas(scriptText, a1.end);

    // arg2: units object
    if (scriptText[i] !== "{") return null;
    var a2 = readBalanced(scriptText, i, "{", "}");
    if (!a2) return null;
    i = skipWsAndCommas(scriptText, a2.end);

    // arg3: number (ignore)
    var a3 = readNumberToken(scriptText, i);
    i = skipWsAndCommas(scriptText, a3.end);

    // arg4: villages array
    if (scriptText[i] !== "[") return null;
    var a4 = readBalanced(scriptText, i, "[", "]");
    if (!a4) return null;

    var option_bases = null, units = null, villages = null;
    try { option_bases = JSON.parse(a1.text); } catch (e3) { return null; }
    try { units = JSON.parse(a2.text); } catch (e4) { return null; }
    try { villages = JSON.parse(a4.text); } catch (e5) { return null; }

    return { option_bases: option_bases, units: units, villages: villages };
  };

  Y.data.addVillagesForGroup = function (groupId, parsed) {
    groupId = String(groupId || "0");
    if (!Y.state.groupVillageMap.has(groupId)) Y.state.groupVillageMap.set(groupId, new Set());
    var set = Y.state.groupVillageMap.get(groupId);

    if (!Y.state.optionBases) Y.state.optionBases = parsed.option_bases;
    if (!Y.state.unitsMeta) Y.state.unitsMeta = parsed.units;

    for (var i = 0; i < parsed.villages.length; i++) {
      var v = parsed.villages[i];
      var vid = String(v.village_id);

      if (!Y.state.villagesById.has(vid)) {
        Y.state.villagesById.set(vid, v);
      }

      set.add(vid);
    }
  };

  Y.data.loadCurrentPageData = function () {
    var parsed = Y.data.parseMassScreenFromHtml(document.documentElement.outerHTML);
    if (!parsed) return false;

    var groupId = Y.util.getUrlParam("group");
    if (groupId == null) groupId = "0";

    Y.data.addVillagesForGroup(groupId, parsed);

    return true;
  };

  Y.data.fetchGroup = async function (groupId, onProgress) {
    groupId = String(groupId || "0");
    var baseUrl = Y.util.getBaseMassUrl(groupId);

    // fetch first page to determine max pages
    var firstHtml = await $.get(baseUrl);
    var maxPage = 0;

    try {
      var $p = $(firstHtml).find(".paged-nav-item");
      if ($p.length > 0) {
        var href = $p[$p.length - 1].href || $($p[$p.length - 1]).attr("href");
        var m = href && href.match(/page=(\d+)/);
        if (m) maxPage = parseInt(m[1], 10);
      }
    } catch (e) {}

    var urls = [];
    for (var p = 0; p <= maxPage; p++) {
      urls.push(baseUrl + "&page=" + p);
    }

    return new Promise(function (resolve, reject) {
      var doneCount = 0;

      Y.data.getAll(
        urls,
        function (_idx, html) {
          doneCount++;
          if (onProgress) onProgress(groupId, doneCount, urls.length);

          var parsed = Y.data.parseMassScreenFromHtml(html);
          if (parsed) Y.data.addVillagesForGroup(groupId, parsed);
        },
        function () { resolve(true); },
        function (err) { reject(err); }
      );
    });
  };

  Y.data.rebuildVillageArray = function () {
    var arr = Array.from(Y.state.villagesById.values());
    arr.sort(function (a, b) {
      return String(a.village_name || "").localeCompare(String(b.village_name || ""));
    });
    Y.state.villages = arr;
    Y.state.dataLoaded = true;
    return arr;
  };

  // selection source system:
  function ensureSources(vid) {
    vid = String(vid);
    if (!Y.state.selSources.has(vid)) Y.state.selSources.set(vid, { manual: null, groups: new Set() });
    return Y.state.selSources.get(vid);
  }

  Y.data.setManualVillageSelected = function (vid, selected) {
    vid = String(vid);
    var s = ensureSources(vid);

    // manual override:
    // - false: force deselect (even if in selected groups)
    // - null : inherit from groups
    // - true : force select (only used when not in any selected group)
    if (selected) {
      // if village is already selected by group, revert to "inherit" instead of sticky manual=true
      if (s.groups && s.groups.size > 0) s.manual = null;
      else s.manual = true;
    } else {
      s.manual = false;
    }

    Y.data.recalcSelectedVillages();
  };

  Y.data.setGroupSelected = function (groupId, selected) {
    groupId = String(groupId);
    if (selected) Y.state.selectedGroups.add(groupId);
    else Y.state.selectedGroups.delete(groupId);

    // apply group membership to village sources if we have groupVillageMap data
    var set = Y.state.groupVillageMap.get(groupId);
    if (set) {
      set.forEach(function (vid) {
        var src = ensureSources(vid);
        if (selected) src.groups.add(groupId);
        else src.groups.delete(groupId);
      });
    }
    Y.data.recalcSelectedVillages();
  };

  Y.data.recalcSelectedVillages = function () {
    Y.state.selectedVillageIds = new Set();

    Y.state.selSources.forEach(function (src, vid) {
      // selection rule:
      // - manual === false => force OFF
      // - manual === true  => force ON
      // - manual === null  => inherit (ON if any selected group contains village)
      if (src.manual === false) return;

      if (src.manual === true) {
        Y.state.selectedVillageIds.add(String(vid));
        return;
      }

      if (src.groups && src.groups.size > 0) {
        Y.state.selectedVillageIds.add(String(vid));
      }
    });
  };

  Y.data.getVillageGroupBadges = function (vid) {
    vid = String(vid);
    var badges = [];
    Y.state.groupVillageMap.forEach(function (set, gid) {
      if (set.has(vid)) badges.push(gid);
    });
    badges.sort(function (a, b) {
      if (a === "0") return -1;
      if (b === "0") return 1;
      return a.localeCompare(b);
    });
    return badges;
  };
})();
