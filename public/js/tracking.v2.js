/* DUSA.studio analytics v2: GA4 + Meta Pixel + Consent Mode v2 + conversion events.
 *
 * One file, one place to change IDs. Loaded with `defer` from both layouts,
 * after /js/ctx.v1.js (window.dusaCtx), whose attribution is added to events.
 * Skips /preview/* and non-production hosts so review builds never pollute
 * the numbers. The GHL External Tracking script is loaded separately by the
 * layouts (it is what feeds the DUSA dashboard).
 *
 * Consent: Google Consent Mode v2. Australia and the other non-EU/UK regions
 * default to granted. EU/UK locale paths (de fr es it nl fi dk se no uk)
 * default to denied until the visitor accepts in the consent banner. A stored
 * choice (cookie dz_consent=granted|denied) always wins, everywhere.
 *
 * v2 changes from v1: current plan ids and prices (starter 149, growth 249,
 * scale 497, custom), context params on every event, consent mode, gated
 * thank-you conversion, booking_confirmed event.
 */
(function () {
  var GA4_ID = 'G-ZSNGSMWBSM';
  var META_PIXEL_ID = '1588257102789659'; // "DUSA . studio Pixel" dataset, Meta Events Manager
  var LINK_DOMAINS = ['dusa.studio', 'app.dusa.studio', 'link.dusa.studio'];
  var CONSENT_REQUIRED_RE = /^\/(de|fr|es|it|nl|fi|dk|se|no|uk)(\/|$)/;

  var host = location.hostname;
  var isProd = host === 'dusa.studio' || host === 'www.dusa.studio';
  var isPreview = /^\/preview(\/|$)/.test(location.pathname);
  if (!isProd || isPreview) {
    window.dusaTrack = function () {};
    return;
  }

  /* ── Consent Mode v2 defaults (must run before config) ───────────── */
  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = window.gtag || gtag;

  function storedConsent() {
    try {
      var m = document.cookie.match(/(?:^|;\s*)dz_consent=(granted|denied)/);
      return m ? m[1] : '';
    } catch (e) { return ''; }
  }
  var consentRequired = CONSENT_REQUIRED_RE.test(location.pathname);
  var consentState = storedConsent() || (consentRequired ? 'denied' : 'granted');
  gtag('consent', 'default', {
    ad_storage: consentState,
    analytics_storage: consentState,
    ad_user_data: consentState,
    ad_personalization: consentState,
  });
  if (consentState === 'denied') gtag('set', 'ads_data_redaction', true);

  /* Called by the consent banner (and safe to call from anywhere). */
  window.dusaConsentUpdate = function (granted) {
    var st = granted ? 'granted' : 'denied';
    gtag('consent', 'update', { ad_storage: st, analytics_storage: st, ad_user_data: st, ad_personalization: st });
    gtag('set', 'ads_data_redaction', !granted);
    if (window.fbq && META_PIXEL_ID) window.fbq('consent', granted ? 'grant' : 'revoke');
  };

  /* ── GA4 ─────────────────────────────────────────────────────────── */
  gtag('js', new Date());
  gtag('config', GA4_ID, {
    send_page_view: true,
    transport_type: 'beacon',
    linker: { domains: LINK_DOMAINS, accept_incoming: true },
  });
  var s = document.createElement('script');
  s.async = true;
  s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA4_ID;
  document.head.appendChild(s);

  /* ── Meta Pixel ──────────────────────────────────────────────────── */
  if (META_PIXEL_ID) {
    /* Standard Meta loader, unchanged apart from formatting. */
    !(function (f, b, e, v, n, t, x) {
      if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
      if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0'; n.queue = [];
      t = b.createElement(e); t.async = !0; t.src = v; x = b.getElementsByTagName(e)[0]; x.parentNode.insertBefore(t, x);
    })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
    /* Revoked consent holds events in the queue until consent('grant'). */
    if (consentState === 'denied') window.fbq('consent', 'revoke');
    window.fbq('init', META_PIXEL_ID);
    window.fbq('track', 'PageView');
  }

  /* ── Context params (from /js/ctx.v1.js) ─────────────────────────── */
  function ctxParams() {
    try {
      var c = window.dusaCtx ? window.dusaCtx.get() : {};
      var ft = c.ft || {};
      var out = {};
      if (c.industry) out.industry = c.industry;
      if (c.plan) out.plan = c.plan;
      if (c.billing) out.billing = c.billing;
      if (ft.source) out.first_source = ft.source;
      if (ft.medium) out.first_medium = ft.medium;
      if (ft.campaign) out.first_campaign = ft.campaign;
      return out;
    } catch (e) { return {}; }
  }
  /* Event params win over context (an explicit plan beats the stored one). */
  function withCtx(params) {
    var out = ctxParams();
    params = params || {};
    for (var k in params) if (Object.prototype.hasOwnProperty.call(params, k) && params[k] !== undefined && params[k] !== '') out[k] = params[k];
    return out;
  }
  function ga(event, params) { gtag('event', event, withCtx(params)); }
  function fb(event, params) { if (window.fbq && META_PIXEL_ID) window.fbq('track', event, withCtx(params)); }
  function fbCustom(event, params) { if (window.fbq && META_PIXEL_ID) window.fbq('trackCustom', event, withCtx(params)); }

  /* ── Shared event API used by page scripts (forms) ───────────────── */
  var planPrices = { starter: 149, growth: 249, scale: 497, custom: 0 }; /* AUD monthly; annual = 10x */
  function normPlan(p) {
    p = String(p || '').toLowerCase();
    if (p === 'engine') return 'custom';
    return /^(starter|growth|scale|custom)$/.test(p) ? p : '';
  }
  function priceFor(plan, billing) {
    var m = planPrices[normPlan(plan)] || 0;
    return billing === 'annual' ? m * 10 : m;
  }
  function planFromEl(el) {
    var href = el.getAttribute && (el.getAttribute('href') || '');
    var hm = href && href.match(/[?&]plan=(starter|growth|scale|custom|engine)\b/i);
    if (hm) return normPlan(hm[1]);
    var card = el.closest('[data-plan]');
    if (card && normPlan(card.getAttribute('data-plan'))) return normPlan(card.getAttribute('data-plan'));
    var m = (el.textContent || '').trim().toLowerCase().match(/starter|growth|scale|custom/);
    return m ? m[0] : undefined;
  }

  window.dusaTrack = function (name, data) {
    data = data || {};
    var plan = normPlan(data.plan) || undefined;
    var billing = data.billing || undefined;
    switch (name) {
      case 'lead': /* contact form sent */
        ga('generate_lead', { form: data.form || 'contact', currency: 'AUD', value: 0 });
        fb('Lead', { content_name: data.form || 'contact' });
        break;
      case 'trial_signup': /* trial form sent (pre-redirect) */
        ga('sign_up', { method: 'trial_form', plan: plan, billing: billing });
        ga('generate_lead', { form: 'trial', plan: plan, billing: billing, currency: 'AUD', value: 0 });
        fb('CompleteRegistration', { content_name: 'trial', status: 'submitted', plan: plan, billing: billing });
        break;
      case 'book_demo': /* click on a booking link (modal or new tab) */
        ga('book_demo', { location: data.location || '', link_text: data.text || '' });
        fb('Schedule', { content_name: 'demo', status: 'clicked' });
        break;
      case 'booking_confirmed': /* GHL booking widget reported a booked slot */
        ga('booking_confirmed', { currency: 'AUD', value: 0, source_page: data.source_page || location.pathname, calendar: data.calendar || 'dusa-demo' });
        fb('Schedule', { content_name: 'demo', status: 'confirmed' });
        break;
      case 'begin_checkout': {
        var b = billing === 'annual' ? 'annual' : 'monthly';
        var value = data.value || priceFor(plan, b);
        ga('begin_checkout', {
          currency: 'AUD', value: value, plan: plan, billing: b,
          items: [{ item_id: plan || 'plan', item_name: plan || 'plan', item_variant: b, price: value, quantity: 1 }],
        });
        fb('InitiateCheckout', { content_name: plan || 'plan', currency: 'AUD', value: value, plan: plan, billing: b });
        break;
      }
      case 'select_plan':
        ga('select_item', { item_list_name: 'pricing', plan: plan, items: [{ item_id: plan || '', item_name: plan || '' }] });
        fbCustom('SelectPlan', { plan: plan || '' });
        break;
      case 'cta_click':
        ga('cta_click', { location: data.location || '', link_text: data.text || '', link_url: data.url || '' });
        break;
      case 'login_click':
        ga('login_click', { link_text: data.text || '' });
        break;
      default:
        ga(name, data);
        fbCustom(name, data);
    }
  };

  /* ── Automatic click attribution ─────────────────────────────────── */
  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
    if (!a) return;
    var href = a.getAttribute('href') || '';
    var text = (a.textContent || '').trim().slice(0, 60);
    var section = a.closest('section, footer, nav, header');
    var where = section ? (section.id || String(section.className || '').split(' ')[0] || section.tagName.toLowerCase()) : 'page';

    if (/buy\.stripe\.com|\/payment-link|checkout/.test(href)) {
      var billing = a.getAttribute('data-billing') || (document.querySelector('.activate__toggle-btn.is-active') || {}).textContent || 'monthly';
      window.dusaTrack('begin_checkout', { plan: planFromEl(a), billing: /annual|year/i.test(billing) ? 'annual' : 'monthly' });
    } else if (/link\.dusa\.studio\/widget\/bookings/.test(href)) {
      window.dusaTrack('book_demo', { location: where, text: text });
    } else if (a.classList.contains('pricing-card__cta') || a.classList.contains('compare__cta-btn') || a.classList.contains('mps__cta-btn')) {
      window.dusaTrack('select_plan', { plan: planFromEl(a) });
    } else if (/^https?:\/\/app\.dusa\.studio/.test(href)) {
      window.dusaTrack('login_click', { text: text });
    } else if (a.classList.contains('btn') || a.classList.contains('hero__sticky-btn') || a.classList.contains('cp__cta')) {
      window.dusaTrack('cta_click', { location: where, text: text, url: href });
    }
  }, { capture: true, passive: true });

  /* Thank-you page: fire the trial conversion ONLY when the visitor really
     came from the /start flow. Either the trial form redirect carries
     ?status=ok&t=<token> matching sessionStorage dz_trial_token, or a Stripe
     checkout was started from /start in the last 2 hours (dz_trial_started,
     kept in localStorage too because Stripe opens in a new tab). A direct or
     crawled visit to /thank-you fires nothing. */
  if (/\/thank-you\/?$/.test(location.pathname)) {
    var confirmed = false, via = '';
    try {
      var q = new URLSearchParams(location.search);
      var tok = sessionStorage.getItem('dz_trial_token');
      if (q.get('status') === 'ok' && q.get('t') && tok && q.get('t') === tok) {
        confirmed = true; via = 'trial_form';
        sessionStorage.removeItem('dz_trial_token');
      } else {
        var started = Number(sessionStorage.getItem('dz_trial_started') || 0) || Number(localStorage.getItem('dz_trial_started') || 0);
        if (started && Date.now() - started < 2 * 60 * 60 * 1000) { confirmed = true; via = 'checkout'; }
        if (started) { sessionStorage.removeItem('dz_trial_started'); localStorage.removeItem('dz_trial_started'); }
      }
    } catch (e) { confirmed = false; }
    if (confirmed) {
      ga('trial_thank_you', { page_location: location.href.split('?')[0], via: via });
      fb('CompleteRegistration', { content_name: 'trial', status: 'confirmed', via: via });
    }
  }

  /* Region / theme / persona signals for segmentation. */
  var region = (location.pathname.match(/^\/(us|uk|es|mx|br|fr|de|it|nl|se|dk|fi|no)(\/|$)/) || [])[1] || 'au';
  function setUserProps() {
    var c = ctxParams();
    var props = { site_region: region, site_theme: document.documentElement.getAttribute('data-theme') || 'dark' };
    if (c.industry) props.industry = c.industry;
    if (c.plan) props.plan_interest = c.plan;
    if (c.first_source) props.first_source = c.first_source;
    gtag('set', 'user_properties', props);
  }
  setUserProps();
  window.addEventListener('dz:ctx', setUserProps);
})();
