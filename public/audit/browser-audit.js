/* DUSA site audit, run inside a browser tab on https://dusa.studio.
 *
 * Usage (from Claude's browser tools, javascript_exec on a dusa.studio tab):
 *   1. Evaluate this file once (defines window.dusaAudit).
 *   2. window.dusaAudit.start(pages, widths)   -> kicks off in the background
 *   3. window.dusaAudit.status()               -> 'running 4/36' | 'done'
 *   4. window.dusaAudit.results()              -> array of findings
 *   5. window.dusaAudit.links()                -> crawl sitemap, HEAD every URL, list non-200s
 *
 * Everything is same-origin (pages load in iframes), so it needs no server.
 * Work is chunked and stored on window because a background tab can time
 * out a single long evaluate call.
 */
(function () {
  const A = (window.dusaAudit = window.dusaAudit || {});
  let state = { running: false, done: 0, total: 0, out: [] };

  const vis = (W, el) => {
    const r = el.getBoundingClientRect();
    const cs = W.getComputedStyle(el);
    return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && parseFloat(cs.opacity) > 0.05;
  };
  const cls = (el) => (el.className && String(el.className).split(' ')[0]) || el.tagName.toLowerCase();

  async function auditPage(pg, w, h, theme) {
    const host = document.getElementById('dusa-audit-host') || Object.assign(document.createElement('div'), { id: 'dusa-audit-host' });
    host.style.cssText = 'position:fixed;left:0;top:0;z-index:99999;opacity:0.01;pointer-events:none';
    document.body.appendChild(host);
    const f = document.createElement('iframe');
    f.style.cssText = `width:${w}px;height:${h}px;border:0;display:block`;
    host.innerHTML = '';
    host.appendChild(f);
    const errors = [];
    await new Promise((res) => { f.onload = res; f.src = pg + (pg.includes('?') ? '&' : '?') + 'audit=' + Date.now(); });
    let t = 0;
    while (t++ < 25 && f.contentDocument.styleSheets.length < 2) await new Promise((r) => setTimeout(r, 200));
    const d = f.contentDocument, W = f.contentWindow;
    W.addEventListener('error', (e) => errors.push(String(e.message).slice(0, 120)));
    if (theme) d.documentElement.setAttribute('data-theme', theme);
    d.querySelectorAll('.reveal,.reveal-scale,.reveal-left,.reveal-right').forEach((e) => { e.classList.add('is-in'); e.style.visibility = 'visible'; });
    await new Promise((r) => setTimeout(r, 500));

    const issues = [];
    const de = d.documentElement;

    // 1. Horizontal overflow
    if (de.scrollWidth > w + 1) issues.push({ type: 'page-overflow', detail: de.scrollWidth + 'px wide' });

    // 2. Elements poking past the right edge without a clipping ancestor
    const over = new Set();
    d.querySelectorAll('main *').forEach((el) => {
      if (!vis(W, el)) return;
      const r = el.getBoundingClientRect();
      if (r.right > w + 2 && r.left < w && W.getComputedStyle(el).position !== 'fixed') {
        let p = el, clipped = false;
        while (p && p !== d.body) { const o = W.getComputedStyle(p).overflowX; if (['hidden', 'clip', 'auto', 'scroll'].includes(o)) { clipped = true; break; } p = p.parentElement; }
        if (!clipped) over.add(cls(el));
      }
    });
    if (over.size) issues.push({ type: 'right-overflow', detail: [...over].slice(0, 6).join(', ') });

    // 3. Clipped nowrap buttons / links
    const clip = [];
    d.querySelectorAll('a.btn,button,[class*=cta],[class*=tab]').forEach((el) => {
      if (!vis(W, el)) return;
      const cs = W.getComputedStyle(el);
      if ((cs.whiteSpace === 'nowrap' || cs.overflow === 'hidden') && el.scrollWidth > el.clientWidth + 2) clip.push(cls(el) + ' "' + el.textContent.trim().slice(0, 20) + '"');
    });
    if (clip.length) issues.push({ type: 'clipped-text', detail: clip.slice(0, 5).join(' | ') });

    // 4. Centred text whose box is not centred (65ch cap fault)
    const off = [];
    d.querySelectorAll('section h1,section h2,section h3,section p,section .label,section [class*=eyebrow],section [class*=strip-label]').forEach((el) => {
      if (!vis(W, el)) return;
      const cs = W.getComputedStyle(el);
      if (cs.textAlign !== 'center' || cs.display === 'inline' || cs.display === 'contents') return;
      const par = el.parentElement; if (!par) return;
      const pc = W.getComputedStyle(par);
      if (pc.display.includes('flex') && (pc.alignItems === 'center' || pc.justifyContent === 'center')) return;
      if (pc.display.includes('grid') && pc.justifyItems === 'center') return;
      const r = el.getBoundingClientRect(), p = par.getBoundingClientRect();
      if (r.width < 40) return;
      const dx = (r.left + r.width / 2) - (p.left + p.width / 2);
      if (Math.abs(dx) > 6 && r.width < p.width - 12) off.push(cls(el) + ' ' + Math.round(dx) + 'px "' + el.textContent.trim().slice(0, 24) + '"');
    });
    if (off.length) issues.push({ type: 'off-centre', detail: off.slice(0, 5).join(' | ') });

    // 5. Text under 10px, tap targets under 24px (phones)
    let tiny = 0; const tinyEls = new Set();
    d.querySelectorAll('main p,main span,main a,main li,main b,main i,main button,main td,main th,main dd,main dt').forEach((el) => {
      if (!vis(W, el) || el.children.length) return;
      if (el.textContent.trim().length > 3 && parseFloat(W.getComputedStyle(el).fontSize) < 10) { tiny++; tinyEls.add(cls(el)); }
    });
    if (tiny) issues.push({ type: 'text-under-10px', detail: tiny + ' (' + [...tinyEls].slice(0, 5).join(', ') + ')' });
    if (w < 900) {
      const small = new Set();
      d.querySelectorAll('main a,main button').forEach((el) => { if (!vis(W, el)) return; const r = el.getBoundingClientRect(); if (r.height < 24 || r.width < 24) small.add(cls(el)); });
      if (small.size) issues.push({ type: 'tap-target-under-24px', detail: [...small].slice(0, 5).join(', ') });
    }

    // 6. Broken images, missing alt
    const broken = [...d.images].filter((i) => i.complete && i.naturalWidth === 0 && !i.loading).map((i) => i.src.split('/').pop());
    if (broken.length) issues.push({ type: 'broken-image', detail: broken.slice(0, 5).join(', ') });
    const noAlt = [...d.images].filter((i) => !i.hasAttribute('alt')).length;
    if (noAlt) issues.push({ type: 'img-missing-alt', detail: noAlt + ' images' });

    // 7. Copy: em/en dashes in visible text, duplicate ids, empty headings
    const text = (d.querySelector('main') || d.body).innerText || '';
    const dashes = [...(d.querySelector('main') || d.body).querySelectorAll('*')].filter((e) => !e.children.length && /[—–]/.test(e.textContent) && !/dash|sep|divider/i.test(String(e.className))).length;
    if (dashes) issues.push({ type: 'em-dash-in-copy', detail: dashes + ' found' });
    const ids = [...d.querySelectorAll('[id]')].map((e) => e.id); const dup = ids.filter((id, i) => ids.indexOf(id) !== i);
    if (dup.length) issues.push({ type: 'duplicate-id', detail: [...new Set(dup)].slice(0, 5).join(', ') });
    const emptyH = [...d.querySelectorAll('h1,h2,h3')].filter((h) => !h.textContent.trim()).length;
    if (emptyH) issues.push({ type: 'empty-heading', detail: emptyH + ' headings' });
    if (d.querySelectorAll('h1').length !== 1) issues.push({ type: 'h1-count', detail: d.querySelectorAll('h1').length + ' h1s' });

    // 8. Leftover English on locale pages (stopword density)
    const lang = de.getAttribute('lang') || 'en';
    if (!lang.startsWith('en')) {
      const hits = (text.match(/\b(the|and|your|with|our|get started|book a demo|learn more|sign up|free trial)\b/gi) || []).length;
      const words = text.split(/\s+/).length;
      if (words > 100 && hits / words > 0.012) issues.push({ type: 'english-on-locale-page', detail: hits + ' English stopwords in ' + words + ' words' });
    }

    // 9. Meta / SEO basics
    const title = d.title || '', desc = (d.querySelector('meta[name=description]') || {}).content || '';
    if (!title) issues.push({ type: 'missing-title', detail: '' });
    if (title.length > 65) issues.push({ type: 'title-too-long', detail: title.length + ' chars' });
    if (!desc) issues.push({ type: 'missing-meta-description', detail: '' });
    else if (desc.length > 165 || desc.length < 60) issues.push({ type: 'meta-description-length', detail: desc.length + ' chars' });
    if (!d.querySelector('link[rel=canonical]')) issues.push({ type: 'missing-canonical', detail: '' });
    const badHref = [...d.querySelectorAll('a[href]')].filter((a) => /^(javascript:|#$|undefined|null)/.test(a.getAttribute('href'))).length;
    if (badHref) issues.push({ type: 'placeholder-href', detail: badHref + ' links' });

    // 10. Console errors thrown during load
    if (errors.length) issues.push({ type: 'js-error', detail: errors.slice(0, 3).join(' | ') });

    return { page: pg, width: w, theme: theme || 'default', height: de.scrollHeight, issues };
  }

  A.start = function (pages, widths, themes) {
    widths = widths || [[1280, 860], [375, 760]];
    themes = themes || [null];
    const jobs = [];
    pages.forEach((pg) => widths.forEach(([w, h]) => themes.forEach((th) => jobs.push([pg, w, h, th]))));
    state = { running: true, done: 0, total: jobs.length, out: [] };
    (async () => {
      for (const [pg, w, h, th] of jobs) {
        try { state.out.push(await auditPage(pg, w, h, th)); }
        catch (e) { state.out.push({ page: pg, width: w, theme: th, issues: [{ type: 'audit-crash', detail: String(e).slice(0, 120) }] }); }
        state.done++;
      }
      const host = document.getElementById('dusa-audit-host'); if (host) host.remove();
      state.running = false;
    })();
    return 'started ' + jobs.length + ' jobs';
  };
  A.status = () => (state.running ? 'running ' + state.done + '/' + state.total : 'done ' + state.done + '/' + state.total);
  A.results = () => state.out;
  A.summary = () => {
    const bad = state.out.filter((r) => r.issues.length);
    return { pagesChecked: state.out.length, pagesWithIssues: bad.length, findings: bad.map((r) => `${r.page} @${r.width}${r.theme && r.theme !== 'default' ? ' ' + r.theme : ''}: ` + r.issues.map((i) => i.type + (i.detail ? ' (' + i.detail + ')' : '')).join('; ')) };
  };

  /* Sitemap link check: every URL in the sitemap must answer 200, and every
     internal link on the home page must resolve. HEAD first, GET on failure. */
  A.links = async function (limit) {
    const idx = await fetch('/sitemap-index.xml', { cache: 'reload' }).then((r) => r.text());
    const maps = [...idx.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    let urls = [];
    for (const m of maps) { const x = await fetch(m, { cache: 'reload' }).then((r) => r.text()); urls.push(...[...x.matchAll(/<loc>([^<]+)<\/loc>/g)].map((mm) => mm[1])); }
    urls = [...new Set(urls)];
    if (limit) urls = urls.slice(0, limit);
    const bad = [];
    const check = async (u) => {
      try {
        let r = await fetch(u, { method: 'HEAD', redirect: 'manual', cache: 'reload' });
        if (r.status === 405 || r.status === 0) r = await fetch(u, { redirect: 'manual', cache: 'reload' });
        if (r.status !== 200) bad.push(u.replace('https://dusa.studio', '') + ' -> ' + r.status);
      } catch (e) { bad.push(u + ' -> fetch failed'); }
    };
    for (let i = 0; i < urls.length; i += 8) await Promise.all(urls.slice(i, i + 8).map(check));
    return { checked: urls.length, bad };
  };

  /* Internal hrefs on a set of pages: anything that 404s. */
  A.internalLinks = async function (pages) {
    const seen = new Set(), bad = [];
    for (const pg of pages) {
      const html = await fetch(pg, { cache: 'reload' }).then((r) => r.text());
      const hrefs = [...html.matchAll(/href="(\/[^"#?]*)"/g)].map((m) => m[1]).filter((h) => !h.startsWith('/_') && !/\.(css|js|png|jpg|webp|svg|xml|txt|ico)$/.test(h));
      for (const h of hrefs) {
        if (seen.has(h)) continue; seen.add(h);
        try { const r = await fetch(h, { method: 'HEAD', cache: 'reload' }); if (r.status !== 200) bad.push(pg + ' links to ' + h + ' -> ' + r.status); } catch (e) { bad.push(pg + ' links to ' + h + ' -> failed'); }
      }
    }
    return { checked: seen.size, bad };
  };
})();
