/* Preview loader for skin v16 (runs in a live app.dusa.studio tab, nothing is saved).
   1. narrows the old "nuclear" dark wildcard rules in the live Custom CSS (same
      transform the save step applies), 2. adds v16.css, 3. starts the dark fixer. */
(async function () {
  var BASE = 'https://dusa.studio/platform/';
  var bust = '?t=' + Date.now();

  window.__dzXform = function (css) {
    function splitSel(s) { var parts = [], d = 0, cur = ''; for (var i = 0; i < s.length; i++) { var ch = s[i]; if (ch === '(' || ch === '[') d++; if (ch === ')' || ch === ']') d--; if (ch === ',' && d === 0) { parts.push(cur); cur = ''; } else cur += ch; } parts.push(cur); return parts; }
    var n = 0;
    var out = css.replace(/([^{}]+)\{([^{}]*)\}/g, function (m, sel, decl) {
      if (!/background/i.test(decl) || sel.indexOf('default-dark-v1') < 0 || sel.indexOf('[class*=') < 0) return m;
      var parts = splitSel(sel).map(function (p) {
        var mm = p.match(/\[class\*="([^"]+)"\]\s*$/);
        if (mm && mm[1].indexOf('__') < 0) { n++; return p.replace(/\s*$/, function (ws) { return ':not([class*="__"])' + ws; }); }
        return p;
      });
      return parts.join(',') + '{' + decl + '}';
    });
    var reps = [
      ['body[data-theme="default-dark-v1"] .popover, body[data-theme="default-dark-v1"] [class*="popover"]:not([class*="__"]) {',
       'body[data-theme="default-dark-v1"] .popover, body[data-theme="default-dark-v1"] [class*="popover"]:not([class*="__"]):not([class*="popover-"]):not(.hr-popover):not(.n-popover) {'],
      ['body[data-theme="default-dark-v1"] [class*="panel"]:not([class*="__"]), body[data-theme="default-dark-v1"] [class*="drawer"]:not([class*="__"]) {',
       'body[data-theme="default-dark-v1"] [class*="panel"]:not([class*="__"]):not([class*="panel-"]), body[data-theme="default-dark-v1"] [class*="drawer"]:not([class*="__"]):not([class*="drawer-"]):not(.hr-drawer):not(.n-drawer) {'],
      ['body[data-theme="default-dark-v1"] [class*="composer"]:not([class*="__"]), body[data-theme="default-dark-v1"] [class*="message-input"]:not([class*="__"]) {',
       'body[data-theme="default-dark-v1"] [class*="composer"]:not([class*="__"]):not([class*="askai-composer"]), body[data-theme="default-dark-v1"] [class*="message-input"]:not([class*="__"]) {']
    ];
    var rc = reps.map(function (r) { var k = out.split(r[0]).length - 1; out = out.split(r[0]).join(r[1]); return k; });
    return { css: out, n: n, rc: rc };
  };

  var skin = document.getElementById('customCss');
  if (skin) {
    window.__origSkin = window.__origSkin || skin.textContent;
    if (window.__origSkin.indexOf('end DUSA v16') < 0) skin.textContent = window.__dzXform(window.__origSkin).css;
  }
  document.querySelectorAll('style[id^="dusa-v16"]').forEach(function (s) { s.remove(); });
  var css = await (await fetch(BASE + 'v16.css' + bust)).text();
  var st = document.createElement('style'); st.id = 'dusa-v16'; st.textContent = css; document.head.appendChild(st);
  if (!window.__dzDarkFixer) { var sc = document.createElement('script'); sc.src = BASE + 'v16-dark.js' + bust; document.head.appendChild(sc); }
  window.__dzPreview = { css: css.length, at: new Date().toISOString() };
})();
