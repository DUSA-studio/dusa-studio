/* DUSA . studio · skin fixer (v16, 2026-10-28): GHL blues → brand (both themes) + dark-mode neutral fixer
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
    if (h < 205 || h > 290) return 0;
    if (ch > 0.35 && L > 0.04) return 2;
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

  function visit(el) {
    if (el.nodeType !== 1) return;
    var cs = getComputedStyle(el);
    if (cs.display === 'none') return;
    bluePass(el, cs);
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
      if (m.type === 'childList') for (var j = 0; j < m.addedNodes.length; j++) enqueue(m.addedNodes[j]);
      else if (m.type === 'attributes') {
        if (m.target === document.body && m.attributeName === 'data-theme') enqueue(document.body);
        else if (m.target.nodeType === 1) { ['data-dz-bdone', 'data-dz-blue', 'data-dz-bline', 'data-dz-bbtn', 'data-dz-bbg', 'data-dz-btint'].forEach(function (a) { m.target.removeAttribute(a); }); enqueue(m.target, true); }
      }
    }
  });
  function start() {
    mo.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-theme', 'class'] });
    enqueue(document.body);
  }
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
})();
