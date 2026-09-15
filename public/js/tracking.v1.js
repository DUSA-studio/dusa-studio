/* DUSA.studio analytics: GA4 + Meta Pixel + conversion events.
 *
 * One file, one place to change IDs. Loaded with `defer` from both layouts.
 * Skips /preview/* and non-production hosts so review builds never pollute
 * the numbers. The GHL External Tracking script is loaded separately by the
 * layouts (it is what feeds the DUSA dashboard).
 */
(function () {
  var GA4_ID = 'G-ZSNGSMWBSM';
  var META_PIXEL_ID = '1588257102789659'; // "DUSA . studio Pixel" dataset, Meta Events Manager
  var LINK_DOMAINS = ['dusa.studio', 'app.dusa.studio', 'link.dusa.studio'];

  var host = location.hostname;
  var isProd = host === 'dusa.studio' || host === 'www.dusa.studio';
  var isPreview = /^\/preview(\/|$)/.test(location.pathname);
  if (!isProd || isPreview) {
    window.dusaTrack = function () {};
    return;
  }

  /* ── GA4 ─────────────────────────────────────────────────────────── */
  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = window.gtag || gtag;
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
    window.fbq('init', META_PIXEL_ID);
    window.fbq('track', 'PageView');
  }
  function fb(event, params) { if (window.fbq && META_PIXEL_ID) window.fbq('track', event, params || {}); }
  function fbCustom(event, params) { if (window.fbq && META_PIXEL_ID) window.fbq('trackCustom', event, params || {}); }

  /* ── Shared event API used by page scripts (forms) ───────────────── */
  var planPrices = { launchpad: 47, starter: 149, growth: 297 };
  function planFromEl(el) {
    var card = el.closest('[data-plan]');
    if (card) return card.getAttribute('data-plan');
    var m = (el.textContent || '').trim().toLowerCase().match(/launchpad|starter|growth|bespoke/);
    return m ? m[0] : undefined;
  }

  window.dusaTrack = function (name, data) {
    data = data || {};
    switch (name) {
      case 'lead': /* contact form sent */
        gtag('event', 'generate_lead', { form: data.form || 'contact', currency: 'AUD', value: 0 });
        fb('Lead', { content_name: data.form || 'contact' });
        break;
      case 'trial_signup': /* trial form sent (pre-redirect) */
        gtag('event', 'sign_up', { method: 'trial_form', plan: data.plan || '' });
        gtag('event', 'generate_lead', { form: 'trial', currency: 'AUD', value: 0 });
        fb('CompleteRegistration', { content_name: 'trial', status: 'submitted' });
        break;
      case 'book_demo':
        gtag('event', 'book_demo', { location: data.location || '', link_text: data.text || '' });
        fb('Schedule', { content_name: 'demo' });
        break;
      case 'begin_checkout':
        gtag('event', 'begin_checkout', {
          currency: 'AUD', value: data.value || planPrices[data.plan] || 0,
          items: [{ item_id: data.plan || 'plan', item_name: data.plan || 'plan', price: data.value || planPrices[data.plan] || 0, quantity: 1 }],
          billing: data.billing || 'monthly',
        });
        fb('InitiateCheckout', { content_name: data.plan || 'plan', currency: 'AUD', value: data.value || planPrices[data.plan] || 0 });
        break;
      case 'select_plan':
        gtag('event', 'select_item', { item_list_name: 'pricing', items: [{ item_id: data.plan || '', item_name: data.plan || '' }] });
        fbCustom('SelectPlan', { plan: data.plan || '' });
        break;
      case 'cta_click':
        gtag('event', 'cta_click', { location: data.location || '', link_text: data.text || '', link_url: data.url || '' });
        break;
      case 'login_click':
        gtag('event', 'login_click', { link_text: data.text || '' });
        break;
      default:
        gtag('event', name, data);
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
    var where = section ? (section.id || section.className.split(' ')[0] || section.tagName.toLowerCase()) : 'page';

    if (/buy\.stripe\.com|\/payment-link|checkout/.test(href)) {
      var billing = a.getAttribute('data-billing') || (document.querySelector('.activate__toggle-btn.is-active') || {}).textContent || 'monthly';
      window.dusaTrack('begin_checkout', { plan: planFromEl(a), billing: /annual|year/i.test(billing) ? 'annual' : 'monthly' });
    } else if (/link\.dusa\.studio\/widget\/bookings/.test(href)) {
      window.dusaTrack('book_demo', { location: where, text: text });
    } else if (a.classList.contains('pricing-card__cta')) {
      window.dusaTrack('select_plan', { plan: planFromEl(a) });
    } else if (/^https?:\/\/app\.dusa\.studio/.test(href)) {
      window.dusaTrack('login_click', { text: text });
    } else if (a.classList.contains('btn') || a.classList.contains('hero__sticky-btn') || a.classList.contains('cp__cta')) {
      window.dusaTrack('cta_click', { location: where, text: text, url: href });
    }
  }, { capture: true, passive: true });

  /* Thank-you page = trial form completed (survives the redirect). */
  if (/\/thank-you\/?$/.test(location.pathname)) {
    gtag('event', 'trial_thank_you', { page_location: location.href });
    fb('CompleteRegistration', { content_name: 'trial', status: 'confirmed' });
  }

  /* Region / theme signals for segmentation. */
  var region = (location.pathname.match(/^\/(us|uk|es|mx|br|fr|de)(\/|$)/) || [])[1] || 'au';
  gtag('set', 'user_properties', { site_region: region, site_theme: document.documentElement.getAttribute('data-theme') || 'dark' });
})();
