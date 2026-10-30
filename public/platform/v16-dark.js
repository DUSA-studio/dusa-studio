/* DUSA . studio · skin fixer (v16, 2026-10-28; v16.4 adds hover/focus/active states; v16.5 adds contrast rescue): GHL blues → brand (both themes) + dark-mode neutral fixer
   GHL has no dark tokens, so many legacy and one-off components paint
   literal white/grey surfaces and near-black text. In dark mode only, this
   marks NEUTRAL light surfaces, light hairlines and dark-neutral text with
   data attributes; the CSS paints them. Saturated colours (tags, events,
   charts, user colours), images, SVG, builders and editors are never touched.
   Cheap: computed styles only for new nodes, batched in idle time. */
(function () {
  if (window.__dzDarkFixer) return;
  window.__dzDarkFixer = true;

  var SKIP = 'svg, img, video, canvas, iframe, picture, input[type="color"], [contenteditable="true"], [data-dz-skip],' +
    ' .fc-event, [class*="color-picker"], [class*="colorPicker"], [class*="swatch"], .gjs-frame-wrapper, [class*="builder-canvas"],' +
    ' [class*="email-preview"], [class*="template-preview"], [class*="EmailPreview"], .hl-builder, #sidebar-v2 .avatar, .hr-avatar, [class*="avatar"]';

  function isDark() { var t = document.body && document.body.getAttribute('data-theme'); return !!t && t.indexOf('dark') > -1; }

  function rgb(s) {
    var m = s && s.match(/rgba?\(([^)]+)\)/); if (!m) return null;
    var p = m[1].split(/[\s,\/]+/).filter(Boolean).map(Number);
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
  }
  function lum(c) {
    function f(v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }
    return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
  }
  // chroma, not HSL saturation: HSL calls #F2F4F7 "24% saturated", chroma says 0.02
  function sat(c) { return (Math.max(c.r, c.g, c.b) - Math.min(c.r, c.g, c.b)) / 255; }
  function hue(c) {
    var r = c.r / 255, g = c.g / 255, b = c.b / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
    if (!d) return 0; var h = mx === r ? (g - b) / d % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; return (h * 60 + 360) % 360;
  }
  function hasOwnText(el) {
    for (var n = el.firstChild; n; n = n.nextSibling) if (n.nodeType === 3 && n.nodeValue.trim().length) return true;
    return false;
  }
  // nearest painted ancestor: returns 'gradient', 'colour' (saturated) or 'neutral'
  function backdropKind(el) {
    for (var e = el; e && e !== document.body; e = e.parentElement) {
      var cs = getComputedStyle(e);
      if (cs.backgroundImage && cs.backgroundImage !== 'none' && cs.backgroundImage.indexOf('gradient') > -1) return 'gradient';
      var c = rgb(cs.backgroundColor);
      if (c && c.a > 0.5) return sat(c) > 0.18 && lum(c) > 0.08 ? 'colour' : (lum(c) < 0.25 ? 'neutral' : 'light');
    }
    return isDark() ? 'neutral' : 'light';
  }

  // GHL's stock blues, indigos and violets (#004EEB, #155EEF, #2970FF, #2E90FA, #528BFF, #6172F3,
  // #7A5AF8, #A5B4FC ...). 2 = strong colour, 1 = pale tint (#EFF8FF, #EEF4FF), 0 = leave alone.
  var BRAND = [[26, 58, 92], [0, 47, 95], [106, 170, 207], [58, 106, 147], [43, 92, 134], [16, 40, 63], [169, 210, 234], [220, 238, 248]];
  function isBrand(c) { for (var i = 0; i < BRAND.length; i++) { var b = BRAND[i]; if (Math.abs(b[0] - c.r) + Math.abs(b[1] - c.g) + Math.abs(b[2] - c.b) < 24) return true; } return false; }
  function offBlue(c) {
    if (!c || c.a < 0.3 || isBrand(c)) return 0;
    var h = hue(c), ch = sat(c), L = lum(c);
    if (h < 195 || h > 290) return 0; // 195+ also catches GHL "curious blue" / blue-light (#38A0DB, #0BA5EC)
    if (ch > 0.3 && L > 0.04) return 2;
    if (ch >= 0.045 && L > 0.72) return 1;
    return 0;
  }
  function ghlBlue(c) { return offBlue(c) === 2; }
  var SKIP_BLUE = 'img, video, canvas, iframe, picture, input[type="color"], [contenteditable="true"], [data-dz-skip], .fc-event,' +
    ' [class*="color-picker"], [class*="colorPicker"], [class*="swatch"], .hr-avatar, [class*="avatar"], .gjs-frame-wrapper,' +
    ' [class*="email-preview"], [class*="template-preview"], [class*="chart"], [id*="chart"], x-vue-echarts, [_echarts_instance_], [class*="highcharts"]';
  var BTN = 'button, a, [role="button"], .btn, .hr-button, .n-button, input[type="submit"], input[type="button"]';

  function bluePass(el, cs) {
    if (el.hasAttribute('data-dz-bdone') || el.closest(SKIP_BLUE)) return;
    el.setAttribute('data-dz-bdone', '');
    if (el instanceof SVGElement) {
      var f = rgb(cs.fill), st = cs.stroke && cs.stroke !== 'none' ? rgb(cs.stroke) : null;
      if (offBlue(f) === 2) el.setAttribute('data-dz-bfill', lum(f) < 0.25 ? 'd' : 'l');
      if (offBlue(st) === 2) el.setAttribute('data-dz-bstroke', lum(st) < 0.25 ? 'd' : 'l');
      return;
    }
    if (hasOwnText(el) && ghlBlue(rgb(cs.color))) el.setAttribute('data-dz-blue', 'text');
    if (parseFloat(cs.borderTopWidth) > 0 || parseFloat(cs.borderBottomWidth) > 0) {
      if (ghlBlue(rgb(cs.borderTopColor)) || ghlBlue(rgb(cs.borderBottomColor))) el.setAttribute('data-dz-bline', '1');
    }
    var noImg = !cs.backgroundImage || cs.backgroundImage === 'none';
    var inlineBg = /background/i.test(el.getAttribute('style') || '') && !/var\(/.test(el.getAttribute('style') || '');
    if (noImg && !inlineBg) {
      var k = offBlue(rgb(cs.backgroundColor));
      if (k === 2) el.setAttribute(el.matches(BTN) ? 'data-dz-bbtn' : 'data-dz-bbg', '1');
      else if (k === 1) el.setAttribute('data-dz-btint', '1');
    }
  }

  /* ── State colours (v16.4): hover / focus / active blues → brand ────── */
  var COLRE = /#[0-9a-f]{3,8}\b|rgba?\([^)]*\)/gi;
  function parseCol(v) {
    var m = /^#([0-9a-f]{3,8})$/i.exec(v.trim());
    if (m) { var h = m[1]; if (h.length < 6) h = h.split('').map(function (x) { return x + x; }).join(''); return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16), a: h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1 }; }
    return rgb(v);
  }
  // role: 'text' | 'bg' | 'line'
  function mapCol(c, role) {
    var k = offBlue(c); if (!k) return null;
    var v = role === 'text' ? 'var(--dz-m-text)' : role === 'line' ? 'var(--dz-m-line)'
      : k === 1 ? 'var(--dz-m-tint)' : lum(c) < 0.3 ? 'var(--dz-m-bg)' : 'var(--dz-m-bg-l)';
    if (k === 2 && c.a < 0.98) v = 'color-mix(in srgb, ' + v + ' ' + Math.round(c.a * 100) + '%, transparent)';
    return v;
  }
  function mapStr(s, role) {
    var hit = false;
    var out = s.replace(COLRE, function (t) { var m = mapCol(parseCol(t), role); if (m) { hit = true; return m; } return t; });
    return hit ? out : null;
  }
  function roleOf(p) {
    if (/^(color|caret-color|text-decoration-color|-webkit-text-fill-color|fill|stroke)$/.test(p)) return 'text';
    if (p === 'background-color') return 'bg';
    if (/^(border(-(top|right|bottom|left|block|inline)(-(start|end))?)?-color|outline-color|column-rule-color|box-shadow)$/.test(p)) return 'line';
    if (p.indexOf('--') === 0) return /border|shadow|ring|outline/i.test(p) ? 'line' : /text|caret|icon|placeholder|arrow/i.test(p) ? 'text' : 'bg';
    return null;
  }

  // 1. Same-origin stylesheets: re-emit every :hover/:focus/:active rule that
  //    paints a GHL blue, with brand colours and one extra ID of specificity.
  var STATE = /:(hover|focus|focus-visible|focus-within|active|checked)\b/;
  var SKIP_SEL = /color-?picker|swatch|chart|\.fc-|avatar|emoji|email-preview|template-preview|gjs|builder|pendo-button/i;
  var seenSheets = typeof WeakSet === 'function' ? new WeakSet() : null, stateCss = [];
  function boostSel(sel) {
    var parts = [], d = 0, cur = '';
    for (var i = 0; i < sel.length; i++) { var ch = sel[i]; if (ch === '(' || ch === '[') d++; if (ch === ')' || ch === ']') d--; if (ch === ',' && d === 0) { parts.push(cur); cur = ''; } else cur += ch; }
    parts.push(cur);
    return parts.map(function (p) {
      p = p.trim(); var at = p.search(/::|:(before|after|first-line|first-letter|placeholder)\b/);
      return at > -1 ? p.slice(0, at) + ':not(#dz-sr)' + p.slice(at) : p + ':not(#dz-sr)';
    }).join(', ');
  }
  function ruleOverride(r) {
    if (!r.selectorText || !STATE.test(r.selectorText) || SKIP_SEL.test(r.selectorText)) return '';
    var st = r.style, decl = [];
    for (var i = 0; i < st.length; i++) {
      var p = st[i], role = roleOf(p); if (!role) continue;
      var v = st.getPropertyValue(p); if (!v || !COLRE.test(v)) { COLRE.lastIndex = 0; continue; } COLRE.lastIndex = 0;
      var m = p === 'box-shadow' ? (mapStr(v, 'line') && 'var(--dz-m-ring)') : mapStr(v, role);
      if (m) decl.push(p + ':' + m + (st.getPropertyPriority(p) ? ' !important' : ''));
    }
    return decl.length ? boostSel(r.selectorText) + '{' + decl.join(';') + '}' : '';
  }
  function walkRules(rules, out, wrap) {
    for (var i = 0; i < rules.length; i++) {
      var r = rules[i];
      if (r.cssRules && r.media) { var inner = []; walkRules(r.cssRules, inner); if (inner.length) out.push('@media ' + r.media.mediaText + '{' + inner.join('') + '}'); continue; }
      if (r.cssRules && !r.selectorText) { walkRules(r.cssRules, out); continue; }
      var o = ruleOverride(r); if (o) out.push(o);
    }
  }
  var sheetTimer = 0;
  function scanSheets() {
    sheetTimer = 0;
    var added = [];
    for (var i = 0; i < document.styleSheets.length; i++) {
      var ss = document.styleSheets[i], node = ss.ownerNode;
      if (node && /^(customCss|dusa-v16|dz-state)$/.test(node.id || '')) continue;
      if (seenSheets) { if (seenSheets.has(ss)) continue; }
      var rules; try { rules = ss.cssRules; } catch (e) { if (seenSheets) seenSheets.add(ss); continue; }
      if (seenSheets) seenSheets.add(ss);
      walkRules(rules, added);
    }
    if (!added.length) return;
    stateCss = stateCss.concat(added);
    var tag = document.getElementById('dz-state');
    if (!tag) { tag = document.createElement('style'); tag.id = 'dz-state'; }
    tag.textContent = stateCss.join('\n');
    (document.body || document.head).appendChild(tag);
  }
  function queueSheets() { if (!sheetTimer) sheetTimer = setTimeout(scanSheets, 250); }

  // 2. HighRise / Naive UI write their state colours as inline variables
  //    (--n-border-hover, --n-border-focus, --n-color-hover …). Rewrite them.
  var styleMO = new MutationObserver(function (list) { for (var i = 0; i < list.length; i++) fixVars(list[i].target); });
  var varWatched = typeof WeakSet === 'function' ? new WeakSet() : null;
  function fixVars(el) {
    var s = el.getAttribute && el.getAttribute('style');
    if (!s || s.indexOf('--') < 0 || el.closest(SKIP_BLUE)) return;
    var touched = false, decls = s.split(';');
    for (var i = 0; i < decls.length; i++) {
      var d = decls[i], c = d.indexOf(':'); if (c < 0) continue;
      var k = d.slice(0, c).trim(); if (k.indexOf('--') !== 0) continue;
      var v = d.slice(c + 1).trim(); if (v.indexOf('var(--dz-m-') > -1) continue;
      var m = mapStr(v, roleOf(k)); if (m) { el.style.setProperty(k, m); touched = true; }
    }
    if (touched && varWatched && !varWatched.has(el)) { varWatched.add(el); styleMO.observe(el, { attributes: true, attributeFilter: ['style'] }); }
  }

  // 3. Tailwind state classes (hover:bg-blue-600, focus:ring-indigo-500 …): mark ahead of time.
  var TW = /(?:^|\s)((?:group-)?hover|focus(?:-visible|-within)?|active):(bg|text|border|ring|fill|stroke|outline|decoration)-(blue|indigo|violet|purple|sky|blue-light|blue-dark)-(\d{2,3})(?:\/\d+)?(?=\s|$)/g;
  function addTok(el, attr, tok) {
    var cur = el.getAttribute(attr) || '';
    if ((' ' + cur + ' ').indexOf(' ' + tok + ' ') < 0) el.setAttribute(attr, (cur + ' ' + tok).trim());
  }
  function twMark(el) {
    var cn = typeof el.className === 'string' ? el.className : (el.className && el.className.baseVal) || '';
    if (cn.indexOf(':') < 0) return;
    TW.lastIndex = 0; var m;
    while ((m = TW.exec(cn))) {
      var v = m[1], u = m[2], shade = +m[4];
      var attr = v === 'group-hover' ? 'data-dz-ghov' : /^focus/.test(v) ? 'data-dz-fov' : 'data-dz-hov';
      var tok = u === 'bg' ? (shade <= 100 ? 'bg-t' : shade < 500 ? 'bg-l' : (el.matches(BTN) ? 'bg-btn' : 'bg-d'))
        : u === 'text' ? 'tx' : u === 'fill' ? 'fi' : u === 'stroke' ? 'st' : u === 'ring' ? 'sh' : u === 'outline' ? 'ol' : 'ln';
      addTok(el, attr, tok);
    }
  }

  // 4. Live check while the pointer or focus is on something: catches state
  //    rules in cross-origin stylesheets that cannot be read.
  var HROOT = BTN + ', li, tr, label, [role="menuitem"], [role="option"], [role="tab"], [role="row"], [class*="item"], [class*="card"]';
  function stateToks(el, cs, asBtn) {
    var t = [];
    if (el instanceof SVGElement) {
      if (offBlue(rgb(cs.fill)) === 2) t.push('fi');
      if (cs.stroke && cs.stroke !== 'none' && offBlue(rgb(cs.stroke)) === 2) t.push('st');
      return t;
    }
    if (!cs.backgroundImage || cs.backgroundImage === 'none') {
      var bk = offBlue(rgb(cs.backgroundColor));
      if (bk === 2) t.push(asBtn ? 'bg-btn' : lum(rgb(cs.backgroundColor)) < 0.3 ? 'bg-d' : 'bg-l'); else if (bk === 1) t.push('bg-t');
    }
    if (hasOwnText(el) && offBlue(rgb(cs.color)) === 2) t.push('tx');
    if ((parseFloat(cs.borderTopWidth) > 0 && offBlue(rgb(cs.borderTopColor)) === 2) || (parseFloat(cs.borderBottomWidth) > 0 && offBlue(rgb(cs.borderBottomColor)) === 2)) t.push('ln');
    if (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0 && offBlue(rgb(cs.outlineColor)) === 2) t.push('ol');
    if (cs.boxShadow && cs.boxShadow !== 'none' && (cs.boxShadow.match(COLRE) || []).some(function (x) { return offBlue(parseCol(x)) === 2; })) t.push('sh');
    return t;
  }
  function catchState(t, attr) {
    if (!t || !t.isConnected || t.nodeType !== 1 || t.closest(SKIP_BLUE)) return;
    if (attr === 'data-dz-hov' && !t.matches(':hover')) return;
    var e, i, cs, toks;
    for (e = t, i = 0; e && e !== document.body && i < 7; e = e.parentElement, i++) {
      cs = getComputedStyle(e); toks = stateToks(e, cs, e.matches(BTN));
      for (var j = 0; j < toks.length; j++) addTok(e, attr, toks[j]);
    }
    if (attr !== 'data-dz-hov') return;
    var root = t.closest(HROOT); if (!root || root === document.body) return;
    var all = root.getElementsByTagName('*'), marked = false;
    for (i = 0; i < all.length && i < 60; i++) {
      var d = all[i]; if (d.contains(t) || d.closest(SKIP_BLUE)) continue;
      toks = stateToks(d, getComputedStyle(d), false);
      for (var k = 0; k < toks.length; k++) { addTok(d, 'data-dz-dhov', toks[k]); marked = true; }
    }
    if (marked) root.setAttribute('data-dz-hroot', '');
  }
  function later(fn) { requestAnimationFrame(function () { requestAnimationFrame(fn); }); }
  document.addEventListener('pointerover', function (ev) {
    var t = ev.target; later(function () { catchState(t, 'data-dz-hov'); }); setTimeout(function () { catchState(t, 'data-dz-hov'); }, 320);
  }, { capture: true, passive: true });
  document.addEventListener('focusin', function (ev) {
    var t = ev.target; later(function () { catchState(t, 'data-dz-fov'); }); setTimeout(function () { catchState(t, 'data-dz-fov'); }, 320);
  }, true);

  /* ── Contrast rescue (v16.5) ───────────────────────────────────────────
     Any icon or text that nearly disappears into what is actually behind it
     (white glyph on a white tile, navy icon on a dark panel, grey on grey)
     gets a brand ink that reads: deep ocean on light, warm white on dark.
     The backdrop is composited from every translucent layer up the tree,
     including absolutely positioned ::before/::after fills. Only near-invisible
     pairs are touched (under 1.6:1), so intentionally muted text is left alone. */
  var RC_ATTRS = ['data-dz-rc', 'data-dz-rf', 'data-dz-rs', 'data-dz-rb'];
  var RC_SKIP = 'img, video, canvas, iframe, picture, [contenteditable="true"], [data-dz-skip], .fc-event, [class*="color-picker"], [class*="swatch"],' +
    ' [class*="chart"], [id*="chart"], [_echarts_instance_], [class*="highcharts"], .gjs-frame-wrapper, [class*="email-preview"], [class*="template-preview"], [class*="avatar"], [class*="logo"], .sr-only';
  var bgCache = typeof WeakMap === 'function' ? new WeakMap() : null;
  function mixC(top, bot) { var a = top.a; return { r: top.r * a + bot.r * (1 - a), g: top.g * a + bot.g * (1 - a), b: top.b * a + bot.b * (1 - a), a: 1 }; }
  function gradAvg(s) {
    var cs = (s.match(COLRE) || []).map(parseCol).filter(Boolean); COLRE.lastIndex = 0;
    if (!cs.length) return null;
    var o = { r: 0, g: 0, b: 0, a: 0 }; cs.forEach(function (c) { o.r += c.r; o.g += c.g; o.b += c.b; o.a += c.a; });
    return { r: o.r / cs.length, g: o.g / cs.length, b: o.b / cs.length, a: o.a / cs.length };
  }
  function ownLayers(e) {
    // Paint layers this element adds, topmost first; .opaque says nothing below shows through
    var res = { layers: [], opaque: false }, cs = getComputedStyle(e);
    ['::after', '::before'].forEach(function (ps) {
      var p = getComputedStyle(e, ps);
      if (!p.content || p.content === 'none' || p.content === 'normal' || p.position !== 'absolute') return;
      var op = +p.opacity, g = p.backgroundImage && p.backgroundImage.indexOf('gradient') > -1 ? gradAvg(p.backgroundImage) : null, c = rgb(p.backgroundColor);
      var L = g && g.a > 0.3 ? g : (c && c.a > 0.3 ? c : null);
      if (L) { L = { r: L.r, g: L.g, b: L.b, a: L.a * op }; res.layers.push(L); if (L.a > 0.95) res.opaque = true; }
    });
    var g2 = cs.backgroundImage && cs.backgroundImage !== 'none' && cs.backgroundImage.indexOf('gradient') > -1 ? gradAvg(cs.backgroundImage) : null;
    if (g2 && g2.a > 0.05) { res.layers.push(g2); if (g2.a > 0.95) res.opaque = true; }
    var c2 = rgb(cs.backgroundColor);
    if (c2 && c2.a > 0.05) { res.layers.push(c2); if (c2.a > 0.95) res.opaque = true; }
    return res;
  }
  function effBg(el) {
    // Composited colour behind el's own content (el's own fills included)
    if (!el || el === document.documentElement) return isDark() ? { r: 12, g: 14, b: 20, a: 1 } : { r: 242, g: 245, b: 246, a: 1 };
    if (bgCache && bgCache.has(el)) return bgCache.get(el);
    var own = ownLayers(el), base = own.opaque ? { r: 0, g: 0, b: 0, a: 1 } : effBg(el.parentElement), out = base;
    for (var i = own.layers.length - 1; i >= 0; i--) out = mixC(own.layers[i], out);
    if (bgCache) bgCache.set(el, out);
    return out;
  }
  function ratio(a, b) { var x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }
  var SHAPES = 'path, circle, rect, line, polyline, polygon, ellipse';
  function rescue(el, cs) {
    if (el.closest(RC_SKIP)) return;
    var r = el.getBoundingClientRect(); if (r.width < 6 || r.height < 6) return;
    if (+cs.opacity < 0.35) return;
    var bg, side;
    if (el instanceof SVGSVGElement) {
      if (el.parentElement && el.parentElement.closest('svg')) return;
      bg = effBg(el.parentElement); side = lum(bg) > 0.4 ? 'l' : 'd';
      var shapes = el.querySelectorAll(SHAPES);
      for (var i = 0; i < shapes.length && i < 40; i++) {
        var s = shapes[i], ss = getComputedStyle(s);
        if (ss.fill && ss.fill !== 'none' && ss.fill.indexOf('url') < 0) { var f = rgb(ss.fill); if (f && f.a > 0.3 && ratio(mixC(f, bg), bg) < 1.6) s.setAttribute('data-dz-rf', side); }
        if (ss.stroke && ss.stroke !== 'none' && ss.stroke.indexOf('url') < 0 && parseFloat(ss.strokeWidth) > 0) { var k = rgb(ss.stroke); if (k && k.a > 0.3 && ratio(mixC(k, bg), bg) < 1.6) s.setAttribute('data-dz-rs', side); }
      }
      return;
    }
    if (el instanceof SVGElement) return;
    var mk = cs.webkitMaskImage || cs.maskImage;
    if (mk && mk !== 'none' && mk.indexOf('url') > -1) {
      var mc = rgb(cs.backgroundColor); if (!mc || mc.a < 0.3) return;
      bg = effBg(el.parentElement);
      if (ratio(mixC(mc, bg), bg) < 1.6) el.setAttribute('data-dz-rb', lum(bg) > 0.4 ? 'l' : 'd');
      return;
    }
    var isFont = el.tagName === 'I' && (function () { var b = getComputedStyle(el, '::before'); return b.content && b.content !== 'none' && b.content !== 'normal'; })();
    if (!isFont && !hasOwnText(el)) return;
    if (cs.webkitTextFillColor && /rgba\(0, 0, 0, 0\)/.test(cs.webkitTextFillColor)) return;
    var fc = rgb(cs.color); if (!fc || fc.a < 0.25) return;
    bg = effBg(el);
    if (ratio(mixC(fc, bg), bg) < 1.6) el.setAttribute('data-dz-rc', lum(bg) > 0.4 ? 'l' : 'd');
  }

  function visit(el) {
    if (el.nodeType !== 1) return;
    var cs = getComputedStyle(el);
    if (cs.display === 'none') return;
    if (el.closest && !el.closest(SKIP_BLUE)) { twMark(el); fixVars(el); }
    bluePass(el, cs);
    neutralPass(el, cs);
    // last, so it sees the colours the other passes just applied
    try { rescue(el, getComputedStyle(el)); } catch (e) { /* never let the rescue break the fixer */ }
  }

  function neutralPass(el, cs) {
    if (el.closest(SKIP)) return;
    // light mode: brand mint text on a light backdrop reads at ~2:1; deepen it to a legible teal
    if (!isDark() && !el.hasAttribute('data-dz-mint') && hasOwnText(el)) {
      var mc = rgb(cs.color);
      if (mc && mc.a > 0.5) { var mh = hue(mc); if (mh >= 160 && mh <= 180 && sat(mc) > 0.35 && lum(mc) > 0.3 && backdropKind(el) === 'light') el.setAttribute('data-dz-mint', '1'); }
    }
    if (!isDark()) return;
    var r = el.getBoundingClientRect();
    var bg = rgb(cs.backgroundColor);
    var noImg = !cs.backgroundImage || cs.backgroundImage === 'none';
    var big = r.width >= 24 && r.height >= 18 && r.width * r.height >= 900;
    var chip = r.width >= 14 && r.height >= 12 && hasOwnText(el);
    if (bg && bg.a > 0.85 && noImg && sat(bg) < 0.10 && (big || chip)) {
      var L = lum(bg);
      if (L > 0.86 && !el.hasAttribute('data-dz-surf')) el.setAttribute('data-dz-surf', '1');
      else if (L > 0.62 && !el.hasAttribute('data-dz-surf')) el.setAttribute('data-dz-surf', '2');
    }
    var bw = parseFloat(cs.borderTopWidth) || parseFloat(cs.borderBottomWidth) || parseFloat(cs.borderLeftWidth);
    if (bw > 0) {
      var bc = rgb(cs.borderTopColor || cs.borderBottomColor);
      if (bc && bc.a > 0.3 && sat(bc) < 0.08 && lum(bc) > 0.55 && !el.hasAttribute('data-dz-line')) el.setAttribute('data-dz-line', '1');
    }
    if (hasOwnText(el) && !el.hasAttribute('data-dz-ink')) {
      var fg = rgb(cs.color);
      if (fg) {
        var lf = lum(fg), ch = sat(fg), h = hue(fg);
        // neutral near-black / dark grey text, or DUSA ocean / GHL navy text (hue 195-235)
        var navy = ch >= 0.12 && h >= 195 && h <= 235 && lf < 0.08;
        if ((ch < 0.16 && lf < 0.22) || navy) {
          var k = backdropKind(el);
          if (k === 'neutral') el.setAttribute('data-dz-ink', navy ? '3' : (lf < 0.06 ? '1' : '2'));
        }
      }
    }
  }

  var queue = [], scheduled = false;
  function flush(deadline) {
    scheduled = false;
    if (bgCache) bgCache = new WeakMap(); // backdrops can change between passes (hover, theme, marks)
    var t0 = performance.now();
    while (queue.length) {
      var item = queue.shift(), root = item[0];
      if (!root.isConnected) continue;
      visit(root);
      if (!item[1]) continue;
      var all = root.getElementsByTagName ? root.getElementsByTagName('*') : [];
      for (var i = 0; i < all.length; i++) visit(all[i]);
      if ((deadline && deadline.timeRemaining && deadline.timeRemaining() < 2) || performance.now() - t0 > 40) break;
    }
    if (queue.length) schedule();
  }
  function schedule() {
    if (scheduled) return; scheduled = true;
    (window.requestIdleCallback || function (cb) { return setTimeout(cb, 60); })(flush, { timeout: 400 });
  }
  function enqueue(node, shallow) { if (node && node.nodeType === 1) { queue.push([node, !shallow]); schedule(); } }

  var mo = new MutationObserver(function (list) {
    for (var i = 0; i < list.length; i++) {
      var m = list[i];
      if (m.type === 'childList') for (var j = 0; j < m.addedNodes.length; j++) {
        var an = m.addedNodes[j];
        if (an.nodeName === 'STYLE' || an.nodeName === 'LINK') { if (an.id !== 'dz-state') { queueSheets(); if (an.nodeName === 'LINK') an.addEventListener('load', queueSheets); } continue; }
        if (an.nodeType === 1 && an.querySelector && an.querySelector('style, link[rel="stylesheet"]')) queueSheets();
        enqueue(an);
      }
      else if (m.type === 'attributes') {
        if (m.target === document.body && m.attributeName === 'data-theme') {
          // a different theme means different backdrops: drop every rescue mark and re-measure
          if (bgCache) bgCache = new WeakMap();
          document.querySelectorAll('[data-dz-rc],[data-dz-rf],[data-dz-rs],[data-dz-rb]').forEach(function (n) { RC_ATTRS.forEach(function (a) { n.removeAttribute(a); }); });
          enqueue(document.body);
        }
        else if (m.target.nodeType === 1) {
          ['data-dz-bdone', 'data-dz-blue', 'data-dz-bline', 'data-dz-bbtn', 'data-dz-bbg', 'data-dz-btint'].concat(RC_ATTRS).forEach(function (a) { m.target.removeAttribute(a); });
          if (bgCache) bgCache.delete(m.target);
          enqueue(m.target, true);
        }
      }
    }
  });
  function start() {
    mo.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-theme', 'class'] });
    mo.observe(document.head, { childList: true });
    enqueue(document.body);
    queueSheets();
    window.addEventListener('load', queueSheets);
  }
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
})();
