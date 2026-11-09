/* DUSA.studio "Find your plan" quiz (PlanQuiz.astro).
 *
 * Five steps, one question each, then a recommended plan with the reason and
 * an "also consider". The capture form posts JSON to the GHL inbound webhook
 * (same one as the /start trial form), merged with dusaCtx.formFields().
 * The result never depends on the network: if the POST fails we say so and
 * still show the next steps.
 *
 * Events: quiz_step {step}, persona_set {industry}, quiz_complete {...},
 * lead {form:'plan_quiz'}.
 */
(function () {
  var root = document.getElementById('find-your-plan');
  var dataEl = document.getElementById('pq-data');
  if (!root || !dataEl) return;
  var cfg;
  try { cfg = JSON.parse(dataEl.textContent); } catch (e) { return; }

  var INDUSTRIES = ['tradies', 'salons', 'clinics', 'hospitality', 'real-estate', 'fitness', 'other'];
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var ctx = function () { return window.dusaCtx; };
  var track = function (name, data) {
    try { if (window.dusaTrack) window.dusaTrack(name, data || {}); } catch (e) { /* analytics must never break the quiz */ }
  };

  var card = document.getElementById('pq-card');
  var steps = Array.prototype.slice.call(root.querySelectorAll('.pq__step[data-key]'));
  var resultEl = root.querySelector('.pq__step[data-step="result"]');
  var countEl = document.getElementById('pq-count');
  var barEl = document.getElementById('pq-bar');
  var progEl = document.getElementById('pq-progress');
  var total = cfg.total || steps.length;

  var answers = { industry: '', team: '', pain: '', tools: [], timeline: '' };
  var current = 1;
  var rec = null;
  var seen = {};

  function knownIndustry() {
    try {
      var c = ctx();
      var v = c && c.get && c.get().industry;
      if (v && INDUSTRIES.indexOf(v) !== -1) return v;
    } catch (e) {}
    try {
      var ls = localStorage.getItem('dz_industry');
      if (ls && INDUSTRIES.indexOf(ls) !== -1) return ls;
    } catch (e) {}
    return '';
  }

  function setCtx(key, value) {
    try { var c = ctx(); if (c && c.set) c.set(key, value); } catch (e) {}
    if (key === 'industry') { try { localStorage.setItem('dz_industry', value); } catch (e) {} }
  }

  function stepEl(n) { return steps[n - 1]; }

  function syncPressed(el) {
    var key = el.getAttribute('data-key');
    var val = answers[key];
    el.querySelectorAll('.pq__opt').forEach(function (b) {
      var v = b.getAttribute('data-value');
      var on = Array.isArray(val) ? val.indexOf(v) !== -1 : val === v;
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    var next = el.querySelector('[data-next]');
    if (next) next.disabled = Array.isArray(val) ? val.length === 0 : !val;
  }

  function setProgress(n, label) {
    var pct = Math.min(100, (n / total) * 100);
    if (barEl) barEl.style.width = pct + '%';
    if (progEl) progEl.setAttribute('aria-valuenow', String(Math.min(n, total)));
    if (countEl) countEl.textContent = label || cfg.txt.stepOf.replace('{n}', String(n)).replace('{total}', String(total));
  }

  function focusHeading(el) {
    var h = el.querySelector('[tabindex="-1"]');
    if (!h) return;
    try { h.focus({ preventScroll: true }); } catch (e) { h.focus(); }
    /* Keep the card in view on phones without jumping the page around. */
    var r = card.getBoundingClientRect();
    if (r.top < 0 || r.top > window.innerHeight * 0.6) {
      card.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    }
  }

  function show(n, moveFocus) {
    steps.forEach(function (el, i) { el.hidden = i + 1 !== n; });
    resultEl.hidden = n !== 'result';
    if (n === 'result') {
      setProgress(total, cfg.txt.resultStep);
      if (moveFocus) focusHeading(resultEl);
      return;
    }
    current = n;
    var el = stepEl(n);
    syncPressed(el);
    setProgress(n);
    if (moveFocus) focusHeading(el);
    if (!seen[n]) { seen[n] = true; track('quiz_step', { step: n, key: el.getAttribute('data-key') }); }
  }

  /* ─── Recommendation: four rules, top to bottom, first match wins ─── */
  function recommend(a) {
    var aiPain = ['calls', 'noshows', 'leads', 'reviews'].indexOf(a.pain) !== -1;
    if (a.team === '20plus') return { plan: 'custom', also: 'scale', reason: cfg.reasons.custom };
    if (a.team === '6-20' && (a.timeline === 'week' || !aiPain)) {
      return { plan: 'scale', also: 'growth', reason: a.timeline === 'week' ? cfg.reasons.scaleWeek : cfg.reasons.scaleTeam };
    }
    if (aiPain) {
      return { plan: 'growth', also: a.team === '6-20' ? 'scale' : 'starter', reason: cfg.reasons[a.pain] };
    }
    return { plan: 'starter', also: 'growth', reason: cfg.reasons[a.pain] || cfg.reasons.apps };
  }

  function bookHref() {
    var id = answers.industry && answers.industry !== 'other' ? answers.industry : '';
    if (!id) return cfg.book;
    return cfg.book + (cfg.book.indexOf('?') === -1 ? '?' : '&') + 'industry=' + encodeURIComponent(id);
  }

  function renderResult() {
    rec = recommend(answers);
    var p = cfg.plans[rec.plan];
    var alt = cfg.plans[rec.also];
    document.getElementById('pq-plan-name').textContent = p.name;
    document.getElementById('pq-plan-price').textContent = p.price;
    document.getElementById('pq-plan-reason').textContent = rec.reason;
    var ul = document.getElementById('pq-plan-incl');
    ul.textContent = '';
    p.incl.forEach(function (line) {
      var li = document.createElement('li');
      li.textContent = line;
      ul.appendChild(li);
    });
    document.getElementById('pq-also-name').textContent = alt.name;
    document.getElementById('pq-also-price').textContent = alt.price;
    document.getElementById('pq-also-line').textContent = cfg.also[rec.also] || '';

    var start = document.getElementById('pq-start');
    if (rec.plan === 'custom') {
      start.textContent = cfg.txt.talkCustom;
      start.setAttribute('href', bookHref());
      start.setAttribute('target', '_blank');
      start.setAttribute('rel', 'noopener noreferrer');
    } else {
      start.textContent = cfg.txt.startWith.replace('{plan}', p.name);
      start.setAttribute('href', '/start?plan=' + encodeURIComponent(rec.plan));
      start.removeAttribute('target');
      start.removeAttribute('rel');
    }
    document.getElementById('pq-book').setAttribute('href', bookHref());

    setCtx('plan', rec.plan);
    track('quiz_complete', {
      industry: answers.industry, team_size: answers.team, pain: answers.pain,
      current_tools: answers.tools.join(','), timeline: answers.timeline,
      recommended_plan: rec.plan, also_consider: rec.also,
    });
    show('result', true);
  }

  function advance(from) {
    if (from < total) show(from + 1, true);
    else renderResult();
  }

  /* ─── Option clicks ─── */
  steps.forEach(function (el, i) {
    var n = i + 1;
    var key = el.getAttribute('data-key');
    var multi = el.getAttribute('data-multi') === 'true';

    el.querySelectorAll('.pq__opt').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var v = btn.getAttribute('data-value');
        if (multi) {
          var list = answers[key].slice();
          var at = list.indexOf(v);
          if (at !== -1) list.splice(at, 1);
          else if (v === 'none') list = ['none'];
          else { list = list.filter(function (x) { return x !== 'none'; }); list.push(v); }
          answers[key] = list;
          syncPressed(el);
          return;
        }
        answers[key] = v;
        syncPressed(el);
        if (key === 'industry') {
          setCtx('industry', v);
          track('persona_set', { industry: v, location: 'quiz' });
        }
        /* Single choice: a short beat so the selection registers, then move on. */
        setTimeout(function () { if (current === n) advance(n); }, reduce ? 0 : 240);
      });
    });

    var next = el.querySelector('[data-next]');
    if (next) next.addEventListener('click', function () { if (!next.disabled) advance(n); });
    var back = el.querySelector('[data-back]');
    if (back) back.addEventListener('click', function () { show(n - 1, true); });
  });

  /* ─── Capture ─── */
  var form = document.getElementById('pq-form');
  var msg = document.getElementById('pq-msg');
  var submit = document.getElementById('pq-submit');
  var nextSteps = document.getElementById('pq-next-steps');
  var skip = document.getElementById('pq-skip');

  function revealNextSteps() {
    nextSteps.hidden = false;
    if (skip) skip.hidden = true;
  }

  function setMsg(text, kind) {
    msg.textContent = text || '';
    /* classList, not className: keeps Astro's scoping intact */
    msg.classList.remove('pq__msg--ok', 'pq__msg--error');
    if (kind) msg.classList.add('pq__msg--' + kind);
  }

  if (skip) skip.addEventListener('click', function () {
    revealNextSteps();
    var a = document.getElementById('pq-start');
    if (a) a.focus();
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var fd = new FormData(form);
    var first = String(fd.get('first_name') || '').trim();
    var email = String(fd.get('email') || '').trim();
    var phone = String(fd.get('phone') || '').trim();
    var consent = !!fd.get('consent');
    if (!first) { setMsg(cfg.txt.needName, 'error'); form.elements.first_name.focus(); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setMsg(cfg.txt.needEmail, 'error'); form.elements.email.focus(); return; }

    var payload = {};
    try {
      var c = ctx();
      var ff = c && c.formFields ? c.formFields() : null;
      if (ff && typeof ff === 'object') for (var k in ff) if (Object.prototype.hasOwnProperty.call(ff, k)) payload[k] = ff[k];
    } catch (err) {}
    var mine = {
      form: 'plan_quiz',
      firstName: first,
      first_name: first,
      email: email,
      phone: phone,
      industry: answers.industry,
      team_size: answers.team,
      pain: answers.pain,
      current_tools: answers.tools.join(', '),
      timeline: answers.timeline,
      recommended_plan: rec ? rec.plan : '',
      also_consider: rec ? rec.also : '',
      consent: consent ? 'yes' : 'no',
      consent_ts: consent ? new Date().toISOString() : '',
      page: location.pathname,
    };
    for (var m in mine) payload[m] = mine[m];

    submit.disabled = true;
    submit.textContent = cfg.txt.sending;
    setMsg('');

    var done = function (ok) {
      submit.disabled = false;
      submit.textContent = cfg.txt.send;
      if (ok) {
        setMsg(cfg.txt.sent, 'ok');
        form.querySelectorAll('input, button[type="submit"]').forEach(function (x) { x.disabled = true; });
        track('lead', { form: 'plan_quiz', plan: payload.recommended_plan, industry: payload.industry });
      } else {
        setMsg(cfg.txt.error, 'error');
      }
      revealNextSteps();
    };

    var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, 12000) : null;
    try {
      fetch(cfg.webhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: ctrl ? ctrl.signal : undefined,
      }).then(function (res) {
        if (timer) clearTimeout(timer);
        done(!!(res && res.ok));
      }, function () {
        if (timer) clearTimeout(timer);
        done(false);
      });
    } catch (err) {
      done(false);
    }
  });

  document.getElementById('pq-restart').addEventListener('click', function () {
    answers = { industry: answers.industry, team: '', pain: '', tools: [], timeline: '' };
    rec = null;
    nextSteps.hidden = true;
    if (skip) skip.hidden = false;
    setMsg('');
    form.querySelectorAll('input, button[type="submit"]').forEach(function (x) { x.disabled = false; });
    show(1, true);
  });

  /* The hero picker (or anything else) set the industry: preselect it. */
  window.addEventListener('dz:ctx', function (e) {
    var d = e && e.detail;
    var id = d && (d.key === 'industry' ? d.value : (d.industry || (d.ctx && d.ctx.industry)));
    if (id && INDUSTRIES.indexOf(id) !== -1 && id !== answers.industry) {
      answers.industry = id;
      if (current === 1 && resultEl.hidden) syncPressed(stepEl(1));
    }
  });

  answers.industry = knownIndustry();
  /* Don't count step 1 as "seen" until the quiz is actually on screen. */
  syncPressed(stepEl(1));
  setProgress(1);
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      if (entries.some(function (en) { return en.isIntersecting; })) {
        io.disconnect();
        if (!seen[1]) { seen[1] = true; track('quiz_step', { step: 1, key: 'industry' }); }
      }
    }, { threshold: 0.35 });
    io.observe(card);
  }
})();
