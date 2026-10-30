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
    var base = window.__origSkin;
    if (base.indexOf('end DUSA v16') > -1) base = base.slice(0, base.lastIndexOf('/*', base.indexOf('SKIN v16')));
    if (base.indexOf(':not([class*="__"])') < 0) base = window.__dzXform(base).css;
    // same Ask AI header scoping the installer applies (loaded from v16-install.js)
    try { var inst = await (await fetch(BASE + 'v16-install.js' + bust)).text(); (0, eval)(inst); base = window.__dzScopeAskAi(base).css; } catch (e) {}
    skin.textContent = base;
  }
  document.querySelectorAll('style[id^="dusa-v16"]').forEach(function (s) { s.remove(); });
  var css = await (await fetch(BASE + 'v16.css' + bust)).text();
  var st = document.createElement('style'); st.id = 'dusa-v16'; st.textContent = css; document.head.appendChild(st);
  if (!window.__dzDarkFixer) { var sc = document.createElement('script'); sc.src = BASE + 'v16-dark.js' + bust; document.head.appendChild(sc); }
  window.__dzPreview = { css: css.length, at: new Date().toISOString() };
  // dev helpers (preview only)
  window.__go = async function (p, theme) { history.pushState({}, '', '/v2/location/2LY8IATaFLISIalfFTgg/' + p); window.dispatchEvent(new PopStateEvent('popstate')); await new Promise(function (r) { setTimeout(r, 4000); }); document.body.setAttribute('data-theme', theme || 'default'); await new Promise(function (r) { setTimeout(r, 1200); }); return 1; };
  window.__why = function (el, props) { props = props || ['background-color', 'background', 'border-color', 'color']; var out = []; for (var i = 0; i < document.styleSheets.length; i++) { var ss = document.styleSheets[i], rules; try { rules = ss.cssRules; } catch (e) { continue; } var src = (ss.ownerNode && ss.ownerNode.id) || ((ss.href || '').split('/').pop() || 'inline').slice(0, 30); (function walk(rs) { for (var j = 0; j < rs.length; j++) { var r = rs[j]; if (r.selectorText) { var m = false; try { m = el.matches(r.selectorText); } catch (e) {} if (m) { var ps = props.filter(function (p) { return r.style.getPropertyValue(p); }); if (ps.length) out.push(src + ' | ' + r.selectorText.slice(0, 120) + ' | ' + ps.map(function (p) { return p + ':' + r.style.getPropertyValue(p).slice(0, 40) + (r.style.getPropertyPriority(p) ? '!' : ''); }).join('; ')); } } if (r.cssRules) walk(r.cssRules); } })(rules); } return out; };
  window.__scan = function (mode) {
    function parse(c) { var m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; var p = m[1].split(/[ ,\/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; }
    function lum(c) { function f(v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); } return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); }
    function cr(a, b) { var x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }
    function sig(el) { return el.tagName.toLowerCase() + (el.id && !/\d{3}|-v-\d/.test(el.id) ? '#' + el.id : '') + '.' + String(el.className.baseVal != null ? el.className.baseVal : el.className).trim().split(/\s+/).filter(function (c) { return c && !/^(flex|w-|h-|p[xytblr]?-|m[xytblr]?-|items-|justify-|gap-|font-|rounded|relative|absolute|overflow|truncate|cursor|inline|block|grid)/.test(c); }).slice(0, 3).join('.'); }
    function bgOf(el) { for (var e = el; e && e !== document.documentElement; e = e.parentElement) { var cs = getComputedStyle(e); if (cs.backgroundImage.indexOf('gradient') > -1) return { grad: true }; var c = parse(cs.backgroundColor); if (c && c.a > 0.5) return { c: c, e: e }; } return { c: mode === 'dark' ? { r: 12, g: 14, b: 20 } : { r: 245, g: 247, b: 248 }, e: document.body }; }
    var surf = {}, text = {};
    document.querySelectorAll('body *').forEach(function (el) {
      var r = el.getBoundingClientRect(); if (r.width < 4 || r.height < 4 || r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) return;
      if (el.closest('svg,[class*="avatar"],.ask-ai-sparkle-icon')) return;
      var cs = getComputedStyle(el); if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity < 0.2) return;
      var bg = parse(cs.backgroundColor);
      if (mode === 'dark' && bg && bg.a > 0.6 && lum(bg) > 0.55 && r.width * r.height > 300) { var s = sig(el); surf[s] = surf[s] || { n: 0, bg: cs.backgroundColor, at: Math.round(r.left) + ',' + Math.round(r.top) }; surf[s].n++; }
      var own = Array.prototype.some.call(el.childNodes, function (n) { return n.nodeType === 3 && n.textContent.trim().length > 1; });
      if (own) { var fg = parse(cs.color); if (!fg) return; var b = bgOf(el); if (b.grad) return; var k = cr(fg, b.c); if (k < 3) { var t = sig(el); text[t] = text[t] || { n: 0, k: +k.toFixed(2), fg: cs.color, bg: b.c.r + ',' + b.c.g + ',' + b.c.b, at: Math.round(r.left) + ',' + Math.round(r.top) }; text[t].n++; } }
    });
    return { surf: Object.keys(surf).map(function (k) { var v = surf[k]; return k + ' ' + v.bg + ' n' + v.n + ' @' + v.at; }).slice(0, 12), text: Object.keys(text).map(function (k) { var v = text[k]; return k + ' k' + v.k + ' ' + v.fg + ' on ' + v.bg + ' @' + v.at; }).slice(0, 12) };
  };
})();
