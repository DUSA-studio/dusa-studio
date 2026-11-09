/* DUSA.studio visitor context store (dz_ctx).
 *
 * Loaded synchronously in <head> of both layouts, before tracking and before
 * any page script, so window.dusaCtx is always there when a form submits.
 *
 * Stores attribution only: UTMs, ad click IDs, landing page, first external
 * referrer, visit count, and what the visitor told us about themselves
 * (industry, plan, billing). Never names, emails or phone numbers. Any value
 * that looks like an email address is dropped on the way in.
 *
 * Cookie: dz_ctx, first party, JSON, SameSite=Lax, 180 days, path /, Secure on https.
 * Session trail: sessionStorage dz_pages (last 10 paths), dz_sess (visit marker).
 *
 * API:
 *   dusaCtx.get()            copy of the stored context (+ pages)
 *   dusaCtx.set(key, value)  persist a value (industry, plan, billing, ...) and
 *                            dispatch a `dz:ctx` CustomEvent on window
 *   dusaCtx.formFields()     flat object for CRM payloads (stable keys, '' when empty)
 *
 * Never throws: everything is wrapped so a broken cookie can't break a page.
 */
(function () {
  var COOKIE = 'dz_ctx';
  var MAX_AGE = 180 * 24 * 60 * 60;
  var UTM = ['source', 'medium', 'campaign', 'term', 'content'];
  var CLICK_IDS = ['gclid', 'gbraid', 'wbraid', 'fbclid', 'msclkid', 'li_fat_id'];
  var REGION_RE = /^\/(us|uk|es|mx|br|fr|de|it|nl|se|dk|fi|no)(\/|$)/;
  var RESERVED = { v: 1, ft: 1, lt: 1, ids: 1, landing: 1, referrer: 1, first_seen: 1, visits: 1, last_seen: 1, region: 1 };
  var PLANS = /^(starter|growth|scale|custom)$/;
  var BILLING = /^(monthly|annual)$/;

  function clean(v, max) {
    if (v === undefined || v === null) return '';
    var s = String(v).trim().slice(0, max || 120);
    if (/[^\s@]+@[^\s@]+\.[^\s@]+/.test(s)) return ''; /* looks like an email: never store */
    return s.replace(/[<>"\\]/g, '');
  }

  function readCookie() {
    try {
      var m = document.cookie.match(/(?:^|;\s*)dz_ctx=([^;]*)/);
      if (!m) return null;
      var o = JSON.parse(decodeURIComponent(m[1]));
      return o && typeof o === 'object' ? o : null;
    } catch (e) { return null; }
  }

  function writeCookie(o) {
    try {
      var val = encodeURIComponent(JSON.stringify(o));
      if (val.length > 3800) { o.ids = {}; val = encodeURIComponent(JSON.stringify(o)); }
      document.cookie = COOKIE + '=' + val + '; Max-Age=' + MAX_AGE + '; Path=/; SameSite=Lax' +
        (location.protocol === 'https:' ? '; Secure' : '');
    } catch (e) { /* storage blocked: carry on without it */ }
  }

  function today() {
    try {
      var d = new Date(); /* visitor's local date, YYYY-MM-DD */
      return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
    } catch (e) { return ''; }
  }

  function externalReferrer() {
    try {
      if (!document.referrer) return '';
      var r = new URL(document.referrer);
      var h = r.hostname.replace(/^www\./, '');
      var self = location.hostname.replace(/^www\./, '');
      if (h === self || /(^|\.)dusa\.studio$/.test(h)) return '';
      /* Host + path only: query strings can carry personal data. */
      return clean(r.hostname + r.pathname, 200);
    } catch (e) { return ''; }
  }

  /* Best-guess source/medium for a touch that carries no UTMs. */
  function inferTouch(params, ref) {
    if (params.gclid || params.gbraid || params.wbraid) return { source: 'google', medium: 'cpc' };
    if (params.msclkid) return { source: 'bing', medium: 'cpc' };
    if (params.fbclid) return { source: 'facebook', medium: 'social' };
    if (params.li_fat_id) return { source: 'linkedin', medium: 'social' };
    if (ref) {
      var host = ref.split('/')[0].replace(/^www\./, '');
      var search = /(^|\.)(google|bing|duckduckgo|yahoo|ecosia|baidu|yandex)\./.test(host);
      return { source: host, medium: search ? 'organic' : 'referral' };
    }
    return { source: '(direct)', medium: '(none)' };
  }

  function region() {
    var m = location.pathname.match(REGION_RE);
    return m ? m[1] : 'au';
  }

  function pages() {
    try { return JSON.parse(sessionStorage.getItem('dz_pages') || '[]') || []; } catch (e) { return []; }
  }

  var ctx = readCookie() || {};

  try {
    var q = new URLSearchParams(location.search);
    var params = {};
    UTM.forEach(function (k) { var v = clean(q.get('utm_' + k)); if (v) params[k] = v; });
    CLICK_IDS.forEach(function (k) { var v = clean(q.get(k), 255); if (v) params[k] = v; });
    var ref = externalReferrer();
    var hasUtm = UTM.some(function (k) { return params[k]; });
    var hasClick = CLICK_IDS.some(function (k) { return params[k]; });
    var isNew = !ctx.v;

    var touch = function () {
      var t = {};
      if (hasUtm) UTM.forEach(function (k) { if (params[k]) t[k] = params[k]; });
      else { var g = inferTouch(params, ref); t.source = g.source; t.medium = g.medium; }
      t.ts = today();
      return t;
    };

    if (isNew) {
      ctx.v = 1;
      ctx.first_seen = today();
      ctx.landing = clean(location.pathname, 200);
      ctx.ft = touch();          /* first touch: written once, never overwritten */
      ctx.lt = ctx.ft;
      ctx.visits = 0;
    } else if (hasUtm || hasClick) {
      ctx.lt = touch();          /* last touch: replaced whenever a new campaign arrives */
    }

    if (!ctx.referrer && ref) ctx.referrer = ref; /* first external referrer */

    /* Click IDs: keep the most recent of each (they expire on the ad side anyway). */
    if (hasClick) {
      ctx.ids = ctx.ids || {};
      CLICK_IDS.forEach(function (k) { if (params[k]) ctx.ids[k] = params[k]; });
    }

    var r = clean(q.get('ref'), 60); if (r) ctx.ref = r;
    var ind = clean(q.get('industry'), 60).toLowerCase(); if (ind) ctx.industry = ind;
    var pl = clean(q.get('plan'), 20).toLowerCase(); if (PLANS.test(pl)) ctx.plan = pl;
    var bl = clean(q.get('billing'), 20).toLowerCase(); if (BILLING.test(bl)) ctx.billing = bl;

    ctx.region = region();

    /* Visit = new browser session (sessionStorage is per tab session). */
    var inSession = false;
    try { inSession = sessionStorage.getItem('dz_sess') === '1'; sessionStorage.setItem('dz_sess', '1'); } catch (e) {}
    if (!inSession || !Number(ctx.visits)) ctx.visits = (Number(ctx.visits) || 0) + 1;
    ctx.last_seen = today();

    try {
      var trail = pages();
      var path = clean(location.pathname, 120);
      if (trail[trail.length - 1] !== path) trail.push(path);
      sessionStorage.setItem('dz_pages', JSON.stringify(trail.slice(-10)));
    } catch (e) {}

    writeCookie(ctx);
  } catch (e) { /* never break the page */ }

  function get() {
    try {
      var copy = JSON.parse(JSON.stringify(ctx || {}));
      copy.pages = pages();
      return copy;
    } catch (e) { return {}; }
  }

  function set(key, value) {
    try {
      key = String(key || '').toLowerCase();
      if (!/^[a-z][a-z0-9_]{0,23}$/.test(key) || RESERVED[key]) return false;
      var v = clean(value, 60).toLowerCase();
      if (key === 'plan' && v && !PLANS.test(v)) return false;
      if (key === 'billing' && v && !BILLING.test(v)) return false;
      if (ctx[key] === v) return true;
      if (v) ctx[key] = v; else delete ctx[key];
      writeCookie(ctx);
      try { window.dispatchEvent(new CustomEvent('dz:ctx', { detail: { key: key, value: v, ctx: get() } })); } catch (e) {}
      return true;
    } catch (e) { return false; }
  }

  /* Flat, stable keys for the GHL inbound webhook (map each to a custom field). */
  function formFields() {
    var out = {};
    try {
      var ft = ctx.ft || {}, lt = ctx.lt || {}, ids = ctx.ids || {};
      UTM.forEach(function (k) { out['first_utm_' + k] = ft[k] || ''; });
      UTM.forEach(function (k) { out['last_utm_' + k] = lt[k] || ''; });
      CLICK_IDS.forEach(function (k) { out[k] = ids[k] || ''; });
      out.ref = ctx.ref || '';
      out.landing_page = ctx.landing || '';
      out.referrer = ctx.referrer || '';
      out.first_seen = ctx.first_seen || '';
      out.visit_count = String(ctx.visits || 1);
      out.pages_viewed = pages().join(' > ');
      out.industry = ctx.industry || '';
      out.plan = ctx.plan || '';
      out.billing = ctx.billing || '';
      out.region = ctx.region || region();
      out.form_page = location.pathname;
    } catch (e) { /* return whatever we have */ }
    return out;
  }

  window.dusaCtx = { get: get, set: set, formFields: formFields };
})();
