// loader_console_yaver_pop_attack_splitter_fullauto_v3.js
(function(){
  var u="https://cdn.jsdelivr.net/gh/yasinenes92/tw-scripts@main/yaver_pop_attack_splitter_fullauto_v3.js";
  u = u + (u.indexOf("?")>=0 ? "&" : "?") + "v=" + Date.now() + "_" + Math.random().toString(16).slice(2);

  var s=document.createElement("script");
  s.src=u;

  s.onload=function(){
    console.log("[Yaver 100pop FULLAUTO] main loaded ✅");
  };

  s.onerror=function(){
    console.log("[Yaver 100pop FULLAUTO] FAIL ❌", u);
    alert("Yaver 100 Pop FULLAUTO v3 yüklenemedi. Muhtemelen dosya repo path'inde yok. Console'a bak.");
  };

  document.head.appendChild(s);
  void 0;
})();
