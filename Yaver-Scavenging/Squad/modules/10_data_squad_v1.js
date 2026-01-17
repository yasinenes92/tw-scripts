(function () {
  "use strict";

  var Y = window.__YAVER_SQUAD_V1__;
  if (!Y) return;

  Y.data = {};

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
        if (depth === 0) return { text: src.slice(start, i + 1), end: i + 1 };
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
      if ((c >= "0" && c <= "9") || c === "." || c === "-") { i++; continue; }
      break;
    }
    return { text: src.slice(start, i), end: i };
  }

  Y.data.extractVillagesFromPage = function () {
    var scriptText = null;

    // sayfa scriptlerinde ScavengeMassScreen arıyoruz
    $("script").each(function (_, el) {
      var html = el.innerHTML || "";
      if (html.indexOf("new ScavengeMassScreen") >= 0) {
        scriptText = html;
        return false;
      }
    });

    if (!scriptText) throw new Error("ScavengeMassScreen script bulunamadı.");

    var idx = scriptText.indexOf("new ScavengeMassScreen");
    var p0 = scriptText.indexOf("(", idx);
    if (p0 < 0) throw new Error("ScavengeMassScreen '(' bulunamadı.");

    var i = p0 + 1;
    i = skipWsAndCommas(scriptText, i);

    // arg1: option_bases object (skip)
    if (scriptText[i] !== "{") throw new Error("Arg1 (option_bases) beklenmiyor.");
    var a1 = readBalanced(scriptText, i, "{", "}");
    if (!a1) throw new Error("Arg1 parse edilemedi.");
    i = skipWsAndCommas(scriptText, a1.end);

    // arg2: units object (skip)
    if (scriptText[i] !== "{") throw new Error("Arg2 (units) beklenmiyor.");
    var a2 = readBalanced(scriptText, i, "{", "}");
    if (!a2) throw new Error("Arg2 parse edilemedi.");
    i = skipWsAndCommas(scriptText, a2.end);

    // arg3: number (skip)
    var a3 = readNumberToken(scriptText, i);
    i = skipWsAndCommas(scriptText, a3.end);

    // arg4: villages array
    if (scriptText[i] !== "[") throw new Error("Arg4 (villages) array beklenmiyor.");
    var a4 = readBalanced(scriptText, i, "[", "]");
    if (!a4) throw new Error("Villages array parse edilemedi.");

    var villages = JSON.parse(a4.text);
    if (!Array.isArray(villages)) throw new Error("Villages JSON array değil.");

    Y.state.villages = villages;
    return villages;
  };
})();
