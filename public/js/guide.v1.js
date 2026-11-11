/* DUSA guide: floating glass robot. See src/components/guide/DusaGuide.astro. */
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
  var bot = document.getElementById('dzg-bot');
  var hideBtn = document.getElementById('dzg-hide');
  var launch = document.getElementById('dzg-launch');
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var IDLE = 6000, FIRST_IDLE = 3500, GAP = 14000, HIDE_DAYS = 7;
  var state = 'home', lastAct = Date.now(), lastTip = 0, tipScrollY = 0, tipsShown = 0, menuOpen = false, targetEl = null;
  var seen = {};
  try { seen = JSON.parse(sessionStorage.getItem('dz_guide_seen') || '{}'); } catch (e) {}

  function track(name, p) { try { if (window.dusaTrack) window.dusaTrack(name, p || {}); } catch (e) {} }
  function isMobile() { return window.innerWidth < 760; }
  function size() { return isMobile() ? 92 : 150; }
  function industry() {
    try { var c = window.dusaCtx && window.dusaCtx.get && window.dusaCtx.get(); if (c && c.industry) return c.industry; } catch (e) {}
    try { return localStorage.getItem('dz_industry') || ''; } catch (e) { return ''; }
  }
  function biz() { return C.biz[industry()] || C.biz['default']; }
  function fill(s) { return String(s || '').replace('{biz}', biz()); }
  function markSeen(id) { seen[id] = 1; try { sessionStorage.setItem('dz_guide_seen', JSON.stringify(seen)); } catch (e) {} }

  /* ---- pose + position ---- */
  function pose(name, mirror) {
    root.setAttribute('data-mirror', mirror ? 'true' : 'false');
    root.querySelectorAll('.dzg__pose').forEach(function (img) {
      var on = img.getAttribute('data-pose') === name;
      if (on && !img.getAttribute('src')) img.setAttribute('src', img.getAttribute('data-src'));
      img.classList.toggle('is-on', on);
    });
  }
  function preload() {
    root.querySelectorAll('.dzg__pose[data-src]').forEach(function (img) { if (!img.getAttribute('src')) img.setAttribute('src', img.getAttribute('data-src')); });
  }
  function home() {
    var S = size();
    return { x: isMobile() ? 6 : 18, y: window.innerHeight - S - (isMobile() ? 84 : 18) };
  }
  var cur = { x: 0, y: 0 };
  function moveTo(x, y, instant) {
    var dx = x - cur.x;
    root.style.setProperty('--dzg-lean', (dx > 0 ? 9 : -9) + 'deg');
    if (instant) root.classList.add('is-instant');
    root.style.setProperty('--dzg-x', Math.round(x) + 'px');
    root.style.setProperty('--dzg-y', Math.round(y) + 'px');
    if (instant) { void root.offsetWidth; root.classList.remove('is-instant'); }
    else if (!reduce && (Math.abs(dx) + Math.abs(y - cur.y)) > 40) {
      root.classList.remove('is-flying'); void root.offsetWidth; root.classList.add('is-flying');
      setTimeout(function () { root.classList.remove('is-flying'); }, 1150);
    }
    cur = { x: x, y: y };
    var S = size();
    var left = x + S / 2 < window.innerWidth / 2;
    var roomAbove = y > 230;
    root.setAttribute('data-side', (roomAbove ? 't' : 'b') + (left ? 'l' : 'r'));
  }
  /* Keep the bubble off whatever we are pointing at. */
  function bubbleAway(fromRight) {
    var S = size(), v = root.getAttribute('data-side').charAt(0);
    if (fromRight) { root.setAttribute('data-side', v + 'l'); return; }
    if (cur.x + S * 0.78 - 300 >= 8) root.setAttribute('data-side', v + 'r');
  }
  function goHome(instant) {
    state = 'home'; clearTarget();
    var h = home(); moveTo(h.x, h.y, instant); pose('idle', false);
  }
  function clearTarget() { if (targetEl) { targetEl.classList.remove('dzg-target'); targetEl = null; } }

  /* Park beside an element and point at it. Returns false when there is no room. */
  function flyTo(el) {
    if (!el || isMobile() || reduce) return false;
    var r = el.getBoundingClientRect(), S = size(), vw = window.innerWidth, vh = window.innerHeight, pad = 18;
    if (r.width === 0 || r.bottom < 90 || r.top > vh - 60) return false;
    var cy = Math.min(Math.max(r.top + Math.min(r.height, vh) / 2 - S / 2, 250), vh - S - 20);
    if (r.left - S - pad >= 8) { moveTo(r.left - S - pad, cy); bubbleAway(false); pose('point', true); return true; }
    if (vw - r.right - S - pad >= 8) { moveTo(r.right + pad, cy); bubbleAway(true); pose('point', false); return true; }
    if (r.top - S - 6 >= 250) { moveTo(Math.min(Math.max(r.left + r.width / 2 - S / 2, 12), vw - S - 12), r.top - S - 6); pose('down', false); return true; }
    return false;
  }

  /* Phones: if the bubble at home would sit on top of the thing we are talking
     about, hop up under the nav and point down at it instead. */
  function parkAway(el) {
    if (!el || !isMobile()) return false;
    var r = el.getBoundingClientRect(), S = size(), h = home();
    var bubbleTop = h.y - 170;
    if (r.bottom < bubbleTop - 8 || r.top > window.innerHeight) return false;
    if (r.top < 66 + S + 150) return false;
    moveTo(6, 78); root.setAttribute('data-side', 'bl'); pose('down', false);
    return true;
  }

  /* ---- bubble ---- */
  var ICON = {
    arrow: 'M5 12h14M12 5l7 7-7 7',
    cal: 'M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z',
    compass: 'M12 2a10 10 0 1 0 0 20a10 10 0 1 0 0-20zM16.24 7.76l-2.12 6.36-6.36 2.12 2.12-6.36z',
    tag: 'M12.6 2.6A2 2 0 0 0 11.2 2H4a2 2 0 0 0-2 2v7.2a2 2 0 0 0 .6 1.4l8.7 8.7a2.4 2.4 0 0 0 3.4 0l6.6-6.6a2.4 2.4 0 0 0 0-3.4zM7.5 7.5h.01'
  };
  function svg(d) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' + d + '"/></svg>'; }
  function say(text, actions, opts) {
    opts = opts || {};
    msgEl.textContent = text;
    actsEl.innerHTML = '';
    (actions || []).forEach(function (a, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'dzg__act' + (a.primary || (i === 0 && !opts.flat) ? ' dzg__act--primary' : '');
      b.innerHTML = (a.icon ? svg(a.icon) : '') + '<span></span>';
      b.querySelector('span').textContent = a.label;
      b.addEventListener('click', function () { track('guide_action', { action: a.id, industry: industry() }); closeBubble(); a.run(); });
      actsEl.appendChild(b);
    });
    hideBtn.hidden = !opts.menu;
    bubble.hidden = true; void bubble.offsetWidth; bubble.hidden = false;
    bot.setAttribute('aria-expanded', 'true');
  }
  function closeBubble() {
    bubble.hidden = true; menuOpen = false; bot.setAttribute('aria-expanded', 'false');
  }

  /* ---- actions ---- */
  function scrollToEl(el) { if (el) el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' }); }
  function inSite(path) { return document.querySelector('a[data-page="' + path + '"]'); }
  var A = {
    show: { id: 'show', label: C.aShow, icon: ICON.arrow, run: function () {
      var picker = document.querySelector('.hz-picker');
      if (picker && !industry()) { scrollToEl(picker); setTimeout(function () { tip('hero', true); }, 700); return; }
      var cp = document.getElementById('connected-platform');
      if (cp) { cp.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' }); return; }
      location.href = '/';
    } },
    plan: { id: 'plan', label: C.aPlan, icon: ICON.compass, run: function () {
      var q = document.getElementById('find-your-plan');
      if (q) q.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' }); else location.href = '/#find-your-plan';
    } },
    book: { id: 'book', label: C.aBook, icon: ICON.cal, run: function () {
      var a = document.querySelector('a[href*="widget/bookings"]');
      if (a) a.click(); else window.open(cfg.book, '_blank', 'noopener');
    } },
    pricing: { id: 'pricing', label: C.aPricing, icon: ICON.tag, run: function () {
      var l = inSite('pricing'); location.href = (l && l.getAttribute('href')) || '/pricing';
    } }
  };

  /* ---- tips: one per section, shown when the visitor goes quiet ---- */
  var TIPS = [
    { id: 'hero', sel: '#hero-intro', target: '.hz-picker__chips', anchor: '.hero__intro-content', when: function () { return !industry() && !!document.querySelector('.hz-picker'); }, text: function () { return C.intro; }, actions: [] },
    { id: 'platform', sel: '#connected-platform', target: '#connected-platform svg', text: function () { return fill(C.tips.platform); }, actions: [] },
    { id: 'funnel', sel: '#funnel', target: '[data-cost-film]', text: function () { return fill(C.tips.funnel); }, actions: ['plan'] },
    { id: 'quiz', sel: '#find-your-plan', target: '#pq-card', text: function () { return fill(C.tips.quiz); }, actions: [] },
    { id: 'proof', sel: '#proof', target: '.proof__grid', text: function () { return fill(C.tips.proof); }, actions: [] },
    { id: 'steps', sel: '#how-it-works', target: '#how-it-works h2', text: function () { return fill(C.tips.steps); }, actions: ['book'] },
    { id: 'pricing', sel: '.pricing-cards', target: '.pricing-cards', text: function () { return fill(C.tips.pricing); }, actions: ['plan', 'book'] },
    { id: 'services', sel: '#setup', target: '#setup h2', text: function () { return fill(C.tips.services); }, actions: ['book'] },
    { id: 'cta', sel: '.cta', target: '.cta__actions', text: function () { return fill(C.tips.cta); }, actions: ['book'] }
  ];
  function biggest(sel) {
    var best = null, area = 0;
    document.querySelectorAll(sel).forEach(function (e) {
      var r = e.getBoundingClientRect(), a = r.width * r.height;
      if (a > area) { area = a; best = e; }
    });
    return best;
  }
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
    if (!t) return;
    if (!force && seen[t.id]) return;
    markSeen(t.id); lastTip = Date.now(); tipsShown++; tipScrollY = window.pageYOffset; state = 'tip';
    clearTarget();
    var el = biggest(t.target) || document.querySelector(t.sel);
    var flew = flyTo((t.anchor && document.querySelector(t.anchor)) || el);
    if (!flew && !parkAway(el)) { var h = home(); moveTo(h.x, h.y); pose('wave', false); }
    if (el) { targetEl = el; el.classList.add('dzg-target'); setTimeout(function () { if (targetEl === el) clearTarget(); }, 5200); }
    var acts = (t.actions || []).map(function (k) { return A[k]; });
    setTimeout(function () { say(t.text(), acts, { flat: acts.length === 0 }); }, flew ? 650 : 80);
    track('guide_tip', { tip: t.id, industry: industry(), flew: flew ? 1 : 0 });
  }

  function openMenu() {
    menuOpen = true;
    var acts = [A.show, A.plan, A.book];
    if (document.querySelector('.pricing-cards')) acts = [A.plan, A.book];
    else if (!document.getElementById('find-your-plan')) acts = [A.pricing, A.book];
    pose('wave', false);
    say(industry() ? C.picked[industry()] || C.menu : C.menu, acts, { menu: true });
    track('guide_open', { industry: industry() });
  }

  /* ---- wiring ---- */
  bot.addEventListener('click', function () {
    lastAct = Date.now();
    if (!bubble.hidden) { closeBubble(); if (state === 'tip') goHome(); else pose('idle', false); return; }
    if (state === 'tip') goHome();
    openMenu();
  });
  document.getElementById('dzg-x').addEventListener('click', function () { closeBubble(); goHome(); });
  hideBtn.addEventListener('click', function () {
    closeBubble(); root.hidden = true; launch.hidden = false;
    try { localStorage.setItem('dz_guide_hidden', String(Date.now())); } catch (e) {}
    track('guide_hide', {});
  });
  launch.addEventListener('click', function () {
    launch.hidden = true; try { localStorage.removeItem('dz_guide_hidden'); } catch (e) {}
    appear(true);
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !bubble.hidden) { closeBubble(); goHome(); bot.focus(); } });

  function act() { lastAct = Date.now(); }
  ['pointermove', 'keydown', 'touchstart', 'wheel'].forEach(function (ev) { window.addEventListener(ev, act, { passive: true }); });
  window.addEventListener('scroll', function () {
    act();
    if (state === 'tip' && Math.abs(window.pageYOffset - tipScrollY) > 140) { closeBubble(); goHome(); }
  }, { passive: true });
  var vw0 = window.innerWidth, vh0 = window.innerHeight;
  window.addEventListener('resize', function () {
    if (window.innerWidth === vw0 && Math.abs(window.innerHeight - vh0) < 120) return;
    vw0 = window.innerWidth; vh0 = window.innerHeight;
    if (state === 'home') goHome(true); else { closeBubble(); goHome(true); }
  });

  /* The visitor told us their industry (hero chips or quiz): celebrate and tailor. */
  var lastIndustry = industry();
  window.addEventListener('dz:ctx', function () { setTimeout(onIndustry, 60); });
  document.addEventListener('click', function (e) {
    var chip = e.target && e.target.closest ? e.target.closest('.hz-chip') : null;
    if (chip) setTimeout(onIndustry, 260);
  });
  function onIndustry() {
    var now = industry();
    if (!now || now === lastIndustry || root.hidden) return;
    lastIndustry = now; markSeen('hero'); clearTarget();
    state = 'tip'; tipScrollY = window.pageYOffset; lastTip = Date.now();
    var chips = document.querySelector('.hz-picker__chips');
    var parked = false;
    if (!(chips && visibleShare(chips) > 0.5 && flyTo(document.querySelector('.hero__intro-content') || chips))) {
      parked = !!(chips && visibleShare(chips) > 0.5 && parkAway(chips));
      if (!parked) { var h = home(); moveTo(h.x, h.y); }
    }
    if (!parked) pose('wave', false);
    var acts = document.getElementById('find-your-plan') ? [A.plan, A.book] : [A.book];
    setTimeout(function () { say(C.picked[now] || C.picked.other, acts); }, 300);
    track('guide_tip', { tip: 'picked', industry: now });
  }

  function busy() {
    return !!document.querySelector('dialog[open]') || document.hidden || menuOpen ||
      (document.activeElement && /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)) ||
      document.querySelector('.nav__mobile.active');
  }
  setInterval(function () {
    if (root.hidden || busy()) return;
    var now = Date.now(), idleFor = now - lastAct;
    if (state === 'tip' && !bubble.hidden) return;
    if (idleFor < (tipsShown === 0 ? FIRST_IDLE : IDLE)) return;
    if (now - lastTip < GAP) return;
    var t = pickTip();
    if (t) tip(t);
  }, 800);

  function appear(fromLaunch) {
    root.hidden = false;
    var h = home();
    moveTo(h.x, window.innerHeight + 40, true);
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        moveTo(h.x, h.y); pose('wave', false); preload();
        setTimeout(function () { if (state === 'home' && bubble.hidden) pose('idle', false); }, 2600);
        if (fromLaunch) setTimeout(openMenu, 700);
      });
    });
    lastAct = Date.now();
  }

  var hiddenAt = 0;
  try { hiddenAt = Number(localStorage.getItem('dz_guide_hidden') || 0); } catch (e) {}
  if (hiddenAt && Date.now() - hiddenAt < HIDE_DAYS * 864e5) { launch.hidden = false; }
  else { setTimeout(function () { appear(false); }, 1800); }

  window.dusaGuide = { tip: function (id) { tip(id, true); }, home: function () { closeBubble(); goHome(); }, open: openMenu };
})();
