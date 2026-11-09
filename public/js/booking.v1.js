/* DUSA.studio booking modal (pairs with src/components/capture/BookingModal.astro).
 *
 * Any click on a link to link.dusa.studio/widget/bookings/... opens the GHL
 * booking widget in a centred glass <dialog> (a full-screen sheet on phones)
 * instead of a new tab. The widget URL gets first-touch utm_* (GHL reads
 * them onto the contact), plus industry, plan and source_page.
 *
 * Left alone, so the browser does its normal thing: modifier-key clicks,
 * middle/right clicks, links another handler already took over
 * (defaultPrevented), and browsers without <dialog>.
 *
 * Booking confirmation: the GHL widget talks to its parent with postMessage.
 * Its message format is not documented, so any message from link.dusa.studio
 * or *.leadconnectorhq.com / *.msgsndr.com that mentions a booked appointment
 * fires dusaTrack('booking_confirmed') once per open. Everything else from
 * those origins is logged with console.debug ("[dz-booking]") so the real
 * format can be confirmed on a test booking.
 */
(function () {
  try {
    var SEL = 'a[href*="link.dusa.studio/widget/bookings/"]';
    var ORIGIN_RE = /^https:\/\/(link\.dusa\.studio|([a-z0-9-]+\.)*leadconnectorhq\.com|([a-z0-9-]+\.)*msgsndr\.com)$/i;
    var BOOKED_RE = /appointment[\s_-]*(booked|created|scheduled|confirmed)|booking[\s_-]*(success|successful|confirmed|complete|completed)|\bbooked\b|appointmentbooked|booking_confirmed/i;
    var dlg = document.getElementById('dz-booking');
    var supported = !!(dlg && typeof dlg.showModal === 'function');
    var frame = dlg && dlg.querySelector('.dzb__frame');
    var state = { open: false, src: '', booked: false, calendar: '', loadTimer: 0 };

    window.dusaBooking = { supported: supported, open: function (href) { return open(href); } };
    if (!supported || !frame) return;

    function buildUrl(href) {
      var u = new URL(href, location.href);
      var c = {};
      try { c = window.dusaCtx ? window.dusaCtx.get() : {}; } catch (e) { c = {}; }
      var ft = c.ft || {};
      ['source', 'medium', 'campaign', 'term', 'content'].forEach(function (k) {
        if (ft[k] && !u.searchParams.has('utm_' + k)) u.searchParams.set('utm_' + k, ft[k]);
      });
      if (c.industry && !u.searchParams.has('industry')) u.searchParams.set('industry', c.industry);
      if (c.plan && !u.searchParams.has('plan')) u.searchParams.set('plan', c.plan);
      u.searchParams.set('source_page', location.pathname);
      return u.toString();
    }

    function markLoaded() {
      clearTimeout(state.loadTimer);
      dlg.classList.add('is-loaded');
    }

    function open(href) {
      if (!supported || !frame) return false;
      var src;
      try { src = buildUrl(href); } catch (e) { return false; }
      var m = src.match(/\/widget\/bookings\/([^/?#]+)/);
      state.calendar = m ? m[1] : '';
      /* Re-use a loaded widget for the same calendar unless a booking already happened. */
      if (src !== state.src || state.booked) {
        dlg.classList.remove('is-loaded');
        state.src = src;
        state.booked = false;
        frame.src = src;
        clearTimeout(state.loadTimer);
        state.loadTimer = setTimeout(markLoaded, 9000); /* never leave the shimmer up forever */
      }
      document.documentElement.classList.add('dzb-open');
      dlg.showModal();
      state.open = true;
      var close = dlg.querySelector('[data-dzb-close]');
      if (close) { try { close.focus({ preventScroll: true }); } catch (e) { close.focus(); } }
      return true;
    }

    function onClosed() {
      state.open = false;
      document.documentElement.classList.remove('dzb-open');
      if (state.booked) { frame.src = 'about:blank'; state.src = ''; dlg.classList.remove('is-loaded'); }
    }

    frame.addEventListener('load', function () { if (frame.src && frame.src !== 'about:blank') markLoaded(); });
    dlg.addEventListener('close', onClosed);
    dlg.addEventListener('click', function (e) {
      if (e.target === dlg) { dlg.close(); return; } /* backdrop click */
      if (e.target.closest && e.target.closest('[data-dzb-close]')) dlg.close();
    });

    document.addEventListener('click', function (e) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      var a = e.target && e.target.closest ? e.target.closest(SEL) : null;
      if (!a || a.hasAttribute('download') || a.getAttribute('data-booking') === 'native') return;
      if (open(a.href)) e.preventDefault();
    });

    window.addEventListener('message', function (e) {
      try {
        if (!ORIGIN_RE.test(e.origin || '')) return;
        var raw = e.data, str = '';
        if (typeof raw === 'string') str = raw;
        else { try { str = JSON.stringify(raw); } catch (err) { str = String(raw); } }
        if (!str) return;
        var lower = str.toLowerCase();
        var looksBooked = BOOKED_RE.test(str) ||
          (lower.indexOf('msgsrc') !== -1 && lower.indexOf('appointment') !== -1);
        if (looksBooked && !state.booked) {
          state.booked = true;
          if (window.dusaTrack) window.dusaTrack('booking_confirmed', { source_page: location.pathname, calendar: state.calendar || 'dusa-demo' });
          try { if (window.dusaCtx) window.dusaCtx.set('booked', 'yes'); } catch (err) {}
          if (console && console.info) console.info('[dz-booking] booking confirmed from', e.origin);
        } else if (console && console.debug) {
          console.debug('[dz-booking] message from', e.origin, str.slice(0, 300));
        }
      } catch (err) { /* ignore malformed messages */ }
    });
  } catch (e) {
    /* Anything unexpected: leave links to navigate normally. */
    window.dusaBooking = window.dusaBooking || { supported: false, open: function () { return false; } };
  }
})();
