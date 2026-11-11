/* DUSA guide v2: a small glass robot that lives on the chat button, looks around,
   flies to things worth seeing and walks visitors to the outcome they want.
   Markup + copy: src/components/guide/DusaGuide.astro. Sprites face LEFT by
   default; data-mirror="true" turns them to face right. */
(function () {
  if (window.__dzGuide) return; window.__dzGuide = true;
  var root = document.getElementById('dz-guide');
  var dataEl = document.getElementById('dz-guide-data');
  if (!root || !dataEl) return;
  var cfg; try { cfg = JSON.parse(dataEl.textContent); } catch (e) { return; }
  var C = cfg.copy;
  var bubble = document.getElementById('dzg-bubble');
  var msgEl = document.getElementById('dzg-msg');
  var actsEl = document.getElementById('dzg-actions');
  var linksEl = document.getElementById('dzg-links');
  var bot = document.getElementById('dzg-bot');
  var hideBtn = document.getElementById('dzg-hide');
  var launch = document.getElementById('dzg-launch');
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var IDLE = 6000, FIRST_IDLE = 3500, GAP = 15000, LINGER = 11000, HIDE_DAYS = 7;
  var state = 'home';            // home | flying | tip
  var lastAct = Date.now(), lastTip = 0, tipsShown = 0, menuOpen = false, lingerUntil = 0;
  var attach = null;             // { el, side } while parked beside something
  var ringEl = null, flightId = 0, lastGlance = Date.now(), lastPointer = 0, hoverBubble = false;
  var cur = { x: 0, y: 0 };
  var seen = {};
  try { seen = JSON.parse(sessionStorage.getItem('dz_guide_seen') || '{}'); } catch (e) {}

  function track(name, p) { try { if (window.dusaTrack) window.dusaTrack(name, p || {}); } catch (e) {} }
  function isMobile() { return window.innerWidth < 760; }
  function size() { return isMobile() ? 96 : 150; }
  function ctxGet(k) {
    try { var c = window.dusaCtx && window.dusaCtx.get && window.dusaCtx.get(); if (c && c[k]) return c[k]; } catch (e) {}
    return '';
  }
  function industry() { var v = ctxGet('industry'); if (v) return v; try { return localStorage.getItem('dz_industry') || ''; } catch (e) { return ''; } }
  function biz() { return C.biz[industry()] || C.biz['default']; }
  function fill(s) { return String(s || '').replace('{biz}', biz()); }
  function markSeen(id) { seen[id] = 1; try { sessionStorage.setItem('dz_guide_seen', JSON.stringify(seen)); } catch (e) {} }
  function clamp(v, a, b) { return Math.min(Math.max(v, a), b); }

  /* ---------- the dock: GHL chat button ---------- */
  function chatHost() { return document.querySelector('chat-widget'); }
  function launcherRect() {
    var h = chatHost(), b = h && h.shadowRoot && h.shadowRoot.querySelector('.lc_text-widget--bubble');
    if (!b) return null;
    var r = b.getBoundingClientRect();
    return r.width > 0 && r.top > 0 ? r : null;
  }
  var promptHidden = false;
  function quietChatPrompt() {
    if (promptHidden) return;
    var h = chatHost();
    if (!h || !h.shadowRoot) return;
    try {
      var st = document.createElement('style');
      st.textContent = '.lc_text-widget--prompt{display:none!important}';
      h.shadowRoot.appendChild(st); promptHidden = true;
    } catch (e) {}
  }
  function chatApi() { return window.leadConnector && window.leadConnector.chatWidget; }
  function chatOpen() { try { var a = chatApi(); return !!(a && a.isActive && a.isActive()); } catch (e) { return false; } }
  function home() {
    var S = size(), r = launcherRect(), vw = window.innerWidth, vh = window.innerHeight;
    if (r) return { x: clamp(r.left + r.width / 2 - S / 2, 4, vw - S - 2), y: r.top - S * 0.95 + 6 };
    return { x: vw - S - (isMobile() ? 2 : 4), y: vh - S - (isMobile() ? 150 : 84) };
  }

  /* ---------- pose + movement ---------- */
  function pose(name, mirror) {
    root.setAttribute('data-pose', name);
    root.setAttribute('data-mirror', mirror ? 'true' : 'false');
    root.querySelectorAll('.dzg__pose').forEach(function (img) {
      var on = img.getAttribute('data-pose') === name;
      if (on && !img.getAttribute('src')) img.setAttribute('src', img.getAttribute('data-src'));
      img.classList.toggle('is-on', on);
      if (on) root.style.setProperty('--dzg-mask', 'url("' + (img.getAttribute('src') || img.getAttribute('data-src')) + '")');
    });
  }
  function preload() {
    root.querySelectorAll('.dzg__pose[data-src]').forEach(function (img) { if (!img.getAttribute('src')) img.setAttribute('src', img.getAttribute('data-src')); });
  }
  function place(x, y, instant, dur) {
    if (instant) root.classList.add('is-instant');
    if (dur) root.style.setProperty('--dzg-dur', dur + 'ms');
    root.style.setProperty('--dzg-x', Math.round(x) + 'px');
    root.style.setProperty('--dzg-y', Math.round(y) + 'px');
    if (instant) { void root.offsetWidth; root.classList.remove('is-instant'); }
    cur = { x: x, y: y };
  }
  /* Fly somewhere: turn to face the way we are going, lean into it, then settle. */
  function flyTo(x, y, endPose, endMirror, cb) {
    var id = ++flightId, dx = x - cur.x, dy = y - cur.y, dist = Math.sqrt(dx * dx + dy * dy);
    if (reduce || dist < 50) {
      place(x, y, reduce); pose(endPose, endMirror); if (cb) cb(); return;
    }
    var dur = clamp(Math.round(520 + dist * 0.85), 700, 1700);
    pose('fly', dx > 0);
    root.classList.add('is-flying');
    place(x, y, false, dur);
    setTimeout(function () {
      if (id !== flightId) return;
      root.classList.remove('is-flying');
      pose(endPose, endMirror);
      if (cb) cb();
    }, dur + 40);
  }
  function unring() { if (ringEl) { ringEl.classList.remove('dzg-target'); ringEl = null; } }
  function goHome(instant) {
    attach = null; unring(); state = instant ? 'home' : 'flying';
    var h = home();
    if (instant) { flightId++; root.classList.remove('is-flying'); place(h.x, h.y, true); pose('look', false); return; }
    flyTo(h.x, h.y, 'look', false, function () { state = 'home'; lastGlance = Date.now(); placeBubble(); });
  }

  /* Where to hover beside an element. null when it is not comfortably on screen. */
  function spot(el, side) {
    if (!el) return null;
    var r = el.getBoundingClientRect(), S = size(), vw = window.innerWidth, vh = window.innerHeight, pad = isMobile() ? 4 : 16;
    if (r.width === 0 || r.bottom < 100 || r.top > vh - 80) return null;
    var midY = clamp(r.top + Math.min(r.height, vh) / 2 - S / 2, 76, vh - S - 24);
    var visTop = Math.max(r.top, 70), visBottom = Math.min(r.bottom, vh);
    var opts = {
      left: function () { return r.left - S - pad >= 4 ? { x: r.left - S - pad, y: midY, pose: 'point', mirror: true, side: 'left' } : null; },
      right: function () { return vw - r.right - S - pad >= 4 ? { x: r.right + pad, y: midY, pose: 'point', mirror: false, side: 'right' } : null; },
      above: function () { return r.top - S * 0.92 >= 70 ? { x: clamp(r.left + r.width * 0.72 - S / 2, 6, vw - S - 6), y: r.top - S * 0.92, pose: 'down', mirror: false, side: 'above' } : null; },
      below: function () { return r.bottom + S <= vh - 70 ? { x: clamp(r.left + r.width * 0.72 - S / 2, 6, vw - S - 6), y: r.bottom + 2, pose: 'up', mirror: false, side: 'below' } : null; },
      corner: function () {   /* perch on the top-right corner of whatever is showing */
        if (visBottom - visTop < S * 0.6) return null;
        return { x: clamp(r.right - S * 0.7, 6, vw - S - 4), y: clamp(visTop - S * 0.35, 70, vh - S - 120), pose: 'down', mirror: false, side: 'corner' };
      }
    };
    var order = side ? [side] : (isMobile() ? ['above', 'below', 'corner'] : ['left', 'right', 'above', 'below', 'corner']);
    for (var i = 0; i < order.length; i++) { var p = opts[order[i]](); if (p) return p; }
    return null;
  }

  /* ---------- bubble (its own fixed element, placed beside the robot) ---------- */
  var ICON = {
    arrow: 'M5 12h14M12 5l7 7-7 7',
    cal: 'M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z',
    compass: 'M12 2a10 10 0 1 0 0 20a10 10 0 1 0 0-20zM16.24 7.76l-2.12 6.36-6.36 2.12 2.12-6.36z',
    tag: 'M12.6 2.6A2 2 0 0 0 11.2 2H4a2 2 0 0 0-2 2v7.2a2 2 0 0 0 .6 1.4l8.7 8.7a2.4 2.4 0 0 0 3.4 0l6.6-6.6a2.4 2.4 0 0 0 0-3.4zM7.5 7.5h.01',
    phone: 'M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z',
    star: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z',
    flow: 'M5 3h4a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zM7 11v4a2 2 0 0 0 2 2h4M15 13h4a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2z',
    chat: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z'
  };
  function svg(d) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' + d + '"/></svg>'; }
  function placeBubble() {
    if (bubble.hidden) return;
    if (isMobile()) {   /* phones: a card along the bottom, or along the top when the thing we are pointing at is low on the screen */
      var lr = launcherRect(), vh = window.innerHeight, tEl = ringEl || (attach && attach.el), low = false;
      if (tEl) { var tr = tEl.getBoundingClientRect(); low = tr.top + tr.height / 2 > vh * 0.5; }
      bubble.style.left = '12px'; bubble.style.right = '12px';
      if (low) { bubble.style.top = '72px'; bubble.style.bottom = 'auto'; }
      else {
        bubble.style.top = 'auto';
        var floor = state === 'home' ? cur.y - 2 : (lr ? lr.top : vh - 90) - 10;
        bubble.style.bottom = Math.round(vh - floor) + 'px';
      }
      bubble.setAttribute('data-tail', 'none');
      return;
    }
    var S = size(), vw = window.innerWidth, bw = bubble.offsetWidth, bh = bubble.offsetHeight;
    var side = attach ? attach.side : 'home';
    var left, top, above = true;
    if (side === 'above' || side === 'below' || side === 'corner') {
      /* over or under something wide: sit beside the robot so we cover as little as possible */
      left = cur.x - bw - 2 >= 10 ? cur.x - bw - 2 : cur.x + S + 2;
      top = side === 'below' ? cur.y + S * 0.12 : cur.y + S * 0.9 - bh;
      above = side !== 'below';
    } else {
      if (side === 'left' || side === 'home') left = cur.x + S * 0.8 - bw;   /* grow away to the left */
      else left = cur.x + S * 0.2;                                            /* grow away to the right */
      above = cur.y + S * 0.04 - bh > 70;
      top = above ? cur.y + S * 0.04 - bh : cur.y + S * 0.94;
    }
    left = clamp(left, 10, vw - bw - 10);
    bubble.style.right = 'auto'; bubble.style.bottom = 'auto';
    bubble.style.left = Math.round(left) + 'px';
    bubble.style.top = Math.round(clamp(top, 80, window.innerHeight - bh - 10)) + 'px';
    bubble.setAttribute('data-tail', (above ? 'b' : 't') + (left + bw / 2 < cur.x + S / 2 ? 'r' : 'l'));
  }
  function button(a, cls) {
    var b = document.createElement('button');
    b.type = 'button'; b.className = cls;
    b.innerHTML = (a.icon ? svg(a.icon) : '') + '<span></span>';
    b.querySelector('span').textContent = a.label;
    b.addEventListener('click', function () { track('guide_action', { action: a.id, industry: industry() }); a.run(); });
    return b;
  }
  /* say(text, { actions, links, menu, grid }) */
  function say(text, o) {
    o = o || {};
    msgEl.textContent = text;
    actsEl.innerHTML = ''; linksEl.innerHTML = '';
    actsEl.classList.toggle('dzg__actions--grid', !!o.grid);
    (o.actions || []).forEach(function (a, i) {
      actsEl.appendChild(button(a, 'dzg__act' + ((!o.grid && i === 0) || a.primary ? ' dzg__act--primary' : '')));
    });
    (o.links || []).forEach(function (a) { linksEl.appendChild(button(a, 'dzg__link')); });
    hideBtn.hidden = !o.menu;
    bubble.hidden = true; void bubble.offsetWidth; bubble.hidden = false;
    placeBubble();
    bot.setAttribute('aria-expanded', 'true');
    root.classList.add('is-active');
    lingerUntil = Date.now() + (o.linger || LINGER);
  }
  function closeBubble() {
    bubble.hidden = true; menuOpen = false; bot.setAttribute('aria-expanded', 'false');
    root.classList.remove('is-active');
  }
  function dismiss() { closeBubble(); if (state !== 'home') goHome(); else pose('look', false); }

  /* ---------- things it can do for you ---------- */
  function smooth() { return reduce ? 'auto' : 'smooth'; }
  /* run cb once the page has stopped scrolling */
  function whenStill(cb) {
    var last = window.pageYOffset, calm = 0, n = 0;
    var t = setInterval(function () {
      var y = window.pageYOffset; n++;
      if (Math.abs(y - last) < 2) calm++; else calm = 0;
      last = y;
      if (calm >= 3 || n > 30) { clearInterval(t); cb(); }
    }, 90);
  }
  function biggest(sel) {
    var best = null, area = 0;
    document.querySelectorAll(sel).forEach(function (e) {
      var r = e.getBoundingClientRect(), a = r.width * r.height;
      if (a > area) { area = a; best = e; }
    });
    return best;
  }
  /* Fly to an element, point, ring it, then speak. Falls back to speaking from the dock. */
  function present(el, ring, text, o, side) {
    closeBubble(); unring();
    var p = spot(el, side);
    state = 'tip'; lastTip = Date.now();
    root.classList.add('is-active');
    var speak = function () {
      if (ring) { ringEl = ring; ring.classList.add('dzg-target'); setTimeout(function () { if (ringEl === ring) unring(); }, 5200); }
      say(text, o);
    };
    if (p) { attach = { el: el, side: p.side }; flyTo(p.x, p.y, p.pose, p.mirror, speak); }
    else { attach = null; var h = home(); flyTo(h.x, h.y, 'look', false, speak); }
  }

  var WHEEL = { calls: 2, noshows: 1, reviews: 5, admin: 4 };   /* outcome -> wheel domain */
  function showOutcome(id) {
    try { if (window.dusaCtx) window.dusaCtx.set('pain', id); } catch (e) {}
    track('guide_outcome', { outcome: id, industry: industry() });
    var line = C.outcomeLines[id] || '';
    var cp = document.getElementById('connected-platform');
    var wheel = cp && biggest('#connected-platform svg');
    var follow = { actions: [A.plan, A.book], linger: 20000 };
    if (!wheel) {
      try { sessionStorage.setItem('dz_guide_go', id); } catch (e) {}
      closeBubble();
      say(line, { actions: [{ id: 'see_platform', label: C.aSeePlatform, icon: ICON.arrow, run: function () { location.href = '/#connected-platform'; } }, A.book], linger: 20000 });
      return;
    }
    closeBubble();
    wheel.scrollIntoView({ behavior: smooth(), block: 'center' });
    whenStill(function () {
      var hit = cp.querySelector('.cp__hit-dom[data-di="' + WHEEL[id] + '"]');
      try { if (hit) hit.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window })); } catch (e) {}
      present(wheel, null, line, follow);
    });
  }
  var OUT = ['calls', 'noshows', 'reviews', 'admin'];
  var OUT_ICON = { calls: ICON.phone, noshows: ICON.cal, reviews: ICON.star, admin: ICON.flow };
  function outcomeActions() {
    return OUT.map(function (id) { return { id: 'outcome_' + id, label: C.outcomes[id], icon: OUT_ICON[id], run: function () { showOutcome(id); } }; });
  }
  var A = {
    plan: { id: 'plan', label: C.aPlan, icon: ICON.compass, run: function () {
      closeBubble();
      var q = document.getElementById('find-your-plan');
      if (!q) { location.href = '/#find-your-plan'; return; }
      q.scrollIntoView({ behavior: smooth(), block: 'start' });
      whenStill(function () { markSeen('quiz'); present(document.getElementById('pq-card') || q, document.getElementById('pq-card'), fill(C.tips.quiz), {}); });
    } },
    book: { id: 'book', label: C.aBook, icon: ICON.cal, run: function () {
      dismiss();
      var a = document.querySelector('a[href*="widget/bookings"]');
      if (a) a.click(); else window.open(cfg.book, '_blank', 'noopener');
    } },
    chat: { id: 'chat', label: C.aChat, icon: ICON.chat, run: function () {
      dismiss();
      try { var c = chatApi(); if (c && c.openWidget) c.openWidget(); } catch (e) {}
    } },
    pricing: { id: 'pricing', label: C.aPricing, icon: ICON.tag, run: function () {
      var l = document.querySelector('a[data-page="pricing"]'); location.href = (l && l.getAttribute('href')) || '/pricing';
    } }
  };
  function askOutcome(lead) {
    menuOpen = true;
    var q = industry() ? fill(C.askOutcomeBiz) : C.askOutcome;
    say(lead ? lead + ' ' + q : q, { actions: outcomeActions(), grid: true, links: [A.plan, A.book, A.chat], menu: true, linger: 60000 });
  }
  function openMenu() {
    if (state !== 'home') { attach = null; unring(); }
    pose('wave', false);
    askOutcome('');
    track('guide_open', { industry: industry() });
  }

  /* ---------- tips it offers on its own when you go quiet ---------- */
  var TIPS = [
    { id: 'hero', sel: '#hero-intro', target: '.hz-picker__chips', anchor: '.hero__intro-content', when: function () { return !industry() && !!document.querySelector('.hz-picker'); }, text: function () { return C.intro; }, linger: 16000 },
    { id: 'platform', sel: '#connected-platform', target: '#connected-platform svg', text: function () { return fill(C.tips.platform); } },
    { id: 'funnel', sel: '#funnel', target: '[data-cost-film]', text: function () { return fill(C.tips.funnel); }, actions: ['plan'] },
    { id: 'quiz', sel: '#find-your-plan', target: '#pq-card', text: function () { return fill(C.tips.quiz); } },
    { id: 'proof', sel: '#proof', target: '.proof__grid', text: function () { return fill(C.tips.proof); } },
    { id: 'steps', sel: '#how-it-works', target: '#how-it-works h2', text: function () { return fill(C.tips.steps); }, actions: ['book'] },
    { id: 'pricing', sel: '.pricing-cards', target: '.pricing-cards', text: function () { return fill(C.tips.pricing); }, actions: ['plan', 'book'] },
    { id: 'services', sel: '#setup', target: '#setup h2', text: function () { return fill(C.tips.services); }, actions: ['book'] },
    { id: 'cta', sel: '.cta', target: '.cta__actions', text: function () { return fill(C.tips.cta); }, actions: ['book'] }
  ];
  function visibleShare(el) {
    var r = el.getBoundingClientRect(), vh = window.innerHeight;
    var v = Math.min(r.bottom, vh) - Math.max(r.top, 0);
    return v <= 0 ? 0 : v / Math.min(vh, r.height || 1);
  }
  function pickTip() {
    var best = null, bestV = 0.45;
    TIPS.forEach(function (t) {
      if (seen[t.id]) return;
      if (t.when && !t.when()) return;
      var el = document.querySelector(t.sel); if (!el) return;
      var v = visibleShare(el); if (v > bestV) { bestV = v; best = t; }
    });
    return best;
  }
  function tip(id, force) {
    var t = typeof id === 'string' ? TIPS.filter(function (x) { return x.id === id; })[0] : id;
    if (!t || (!force && seen[t.id])) return;
    markSeen(t.id); tipsShown++;
    var ring = biggest(t.target) || document.querySelector(t.sel);
    var el = (!isMobile() && t.anchor && document.querySelector(t.anchor)) || ring;
    present(el, ring, t.text(), { actions: (t.actions || []).map(function (k) { return A[k]; }), linger: t.linger });
    track('guide_tip', { tip: t.id, industry: industry() });
  }

  /* ---------- wiring ---------- */
  bot.addEventListener('click', function () {
    lastAct = Date.now();
    if (!bubble.hidden) { dismiss(); return; }
    if (state !== 'home') goHome();
    openMenu();
  });
  bot.addEventListener('pointerenter', function () { if (state === 'home' && bubble.hidden) { pose('wave', false); lastGlance = Date.now() + 1500; } });
  document.getElementById('dzg-x').addEventListener('click', dismiss);
  bubble.addEventListener('pointerenter', function () { hoverBubble = true; });
  bubble.addEventListener('pointerleave', function () { hoverBubble = false; lingerUntil = Date.now() + 4000; });
  hideBtn.addEventListener('click', function () {
    closeBubble(); root.hidden = true; launch.hidden = false;
    try { localStorage.setItem('dz_guide_hidden', String(Date.now())); } catch (e) {}
    track('guide_hide', {});
  });
  launch.addEventListener('click', function () {
    launch.hidden = true; try { localStorage.removeItem('dz_guide_hidden'); } catch (e) {}
    appear(true);
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !bubble.hidden) { dismiss(); bot.focus(); } });

  /* Scrolling never sends it away: parked beside something, it rides along with
     that thing until the thing leaves the screen. */
  var raf = 0;
  function follow() {
    raf = 0;
    if (state === 'home') { var h = home(); if (Math.abs(h.x - cur.x) > 1 || Math.abs(h.y - cur.y) > 1) place(h.x, h.y, true); placeBubble(); return; }
    if (state !== 'tip' || !attach) { placeBubble(); return; }
    var p = spot(attach.el, attach.side) || spot(attach.el);
    if (!p) { closeBubble(); goHome(); return; }
    attach.side = p.side;
    place(p.x, p.y, true);
    if (root.getAttribute('data-pose') !== 'fly') pose(p.pose, p.mirror);
    placeBubble();
  }
  function queueFollow() { if (!raf) raf = requestAnimationFrame(follow); }
  window.addEventListener('scroll', function () { lastAct = Date.now(); queueFollow(); }, { passive: true });
  window.addEventListener('resize', queueFollow);

  /* It watches what you are doing: turns toward the pointer, looks up at things
     above it, faces you when you come close. */
  function lookAt(px, py) {
    var S = size(), cx = cur.x + S / 2, cy = cur.y + S / 2, dx = px - cx, dy = py - cy;
    var d = Math.sqrt(dx * dx + dy * dy);
    if (d < 150) return pose('idle', false);
    if (dy < -180 && Math.abs(dx) < 420) return pose('up', dx > 0);
    if (dy > 140 && Math.abs(dx) < 160) return pose('down', false);
    pose('look', dx > 0);
  }
  window.addEventListener('pointermove', function (e) {
    lastAct = Date.now();
    if (e.pointerType === 'touch') return;
    var now = Date.now();
    if (now - lastPointer < 180) return;
    lastPointer = now;
    if (state === 'home' && bubble.hidden && now > lastGlance) lookAt(e.clientX, e.clientY);
  }, { passive: true });
  ['keydown', 'touchstart', 'wheel'].forEach(function (ev) { window.addEventListener(ev, function () { lastAct = Date.now(); }, { passive: true }); });

  /* The visitor told us their industry (hero chips or quiz): tailor and ask what to fix. */
  var lastIndustry = industry();
  window.addEventListener('dz:ctx', function (e) { if (e && e.detail && e.detail.key === 'industry') setTimeout(onIndustry, 80); });
  document.addEventListener('click', function (e) {
    var chip = e.target && e.target.closest ? e.target.closest('.hz-chip') : null;
    if (chip) setTimeout(onIndustry, 280);
  });
  function onIndustry() {
    var now = industry();
    if (!now || now === lastIndustry || root.hidden) return;
    lastIndustry = now; markSeen('hero');
    var card = document.querySelector('.hero__intro-content');
    var lead = C.picked[now] || C.picked.other;
    var o = { actions: outcomeActions(), grid: true, links: [A.plan, A.book], linger: 60000 };
    var q = lead + ' ' + fill(C.askOutcomeBiz);
    if (card && !isMobile() && visibleShare(card) > 0.5) present(card, null, q, o); else { closeBubble(); if (state !== 'home') goHome(); say(q, o); }
    track('guide_tip', { tip: 'picked', industry: now });
  }

  function busy() {
    return !!document.querySelector('dialog[open]') || document.hidden || menuOpen ||
      (document.activeElement && /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)) ||
      !!document.querySelector('.nav__mobile.active');
  }
  var tucked = false;
  setInterval(function () {
    if (root.hidden) return;
    quietChatPrompt();
    var open = chatOpen();
    if (open !== tucked) { tucked = open; root.classList.toggle('is-tucked', open); if (open) { closeBubble(); goHome(true); } }
    if (tucked) return;
    var now = Date.now();
    if (state === 'home') {   /* the chat button can load late or move: stay on it */
      var h = home();
      if (Math.abs(h.x - cur.x) > 3 || Math.abs(h.y - cur.y) > 3) { place(h.x, h.y, false, 600); placeBubble(); }
    }
    /* a tip that nobody is engaging with: head back to the dock */
    if (state === 'tip' && !bubble.hidden && !hoverBubble && !menuOpen && now > lingerUntil && now - lastAct > 2500) { dismiss(); return; }
    if (state === 'home' && !bubble.hidden && !hoverBubble && now > lingerUntil && now - lastAct > 2500) { closeBubble(); pose('look', false); return; }
    /* little signs of life on the dock */
    if (state === 'home' && bubble.hidden && now - lastGlance > 6500 && now - lastPointer > 2500) {
      lastGlance = now + Math.random() * 3000;
      var g = [['idle', false], ['up', false], ['look', true], ['idle', false]][Math.floor(Math.random() * 4)];
      pose(g[0], g[1]);
      setTimeout(function () { if (state === 'home' && bubble.hidden) pose('look', false); }, 1700);
    }
    if (busy() || state !== 'home' || !bubble.hidden) return;
    if (now - lastAct < (tipsShown === 0 ? FIRST_IDLE : IDLE) || now - lastTip < GAP) return;
    var t = pickTip();
    if (t) tip(t);
  }, 700);

  function appear(fromLaunch) {
    root.hidden = false;
    quietChatPrompt();
    var h = home();
    place(window.innerWidth + 40, h.y - 120, true);
    requestAnimationFrame(function () { requestAnimationFrame(function () {
      preload(); state = 'flying';
      flyTo(h.x, h.y, 'wave', false, function () {
        state = 'home'; lastGlance = Date.now() + 2200;
        setTimeout(function () { if (state === 'home' && bubble.hidden) pose('look', false); }, 2200);
        var go = ''; try { go = sessionStorage.getItem('dz_guide_go') || ''; sessionStorage.removeItem('dz_guide_go'); } catch (e) {}
        if (go && WHEEL[go] != null) setTimeout(function () { showOutcome(go); }, 900);
        else if (fromLaunch) setTimeout(openMenu, 500);
      });
    }); });
    lastAct = Date.now();
  }

  var hiddenAt = 0;
  try { hiddenAt = Number(localStorage.getItem('dz_guide_hidden') || 0); } catch (e) {}
  if (hiddenAt && Date.now() - hiddenAt < HIDE_DAYS * 864e5) { launch.hidden = false; }
  else { setTimeout(function () { appear(false); }, 1800); }

  window.dusaGuide = { tip: function (id) { tip(id, true); }, home: function () { closeBubble(); goHome(); }, open: openMenu, outcome: showOutcome };
})();
