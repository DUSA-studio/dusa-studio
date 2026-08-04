/**
 * DUSA scroll reveals — IntersectionObserver, no dependencies.
 *
 * This replaces a per-element GSAP ScrollTrigger. The homepage alone has ~54
 * elements carrying a reveal class, which meant ~54 ScrollTrigger instances,
 * each recalculating position on scroll and resize. In a mobile Lighthouse
 * trace that made ScrollTrigger the single largest consumer of main-thread
 * time, most of it in Style & Layout.
 *
 * One observer replaces all of them. Elements are unobserved once they have
 * been shown, so the observer empties itself as the visitor scrolls.
 *
 * The visible state is a single `is-in` class; the transition itself lives in
 * global.css. Hero elements are skipped because the hero animates from CSS on
 * load and must not wait on any script.
 */
(function () {
  'use strict';

  var SELECTOR = '.reveal, .reveal-left, .reveal-right, .reveal-scale';

  function show(el) {
    el.classList.add('is-in');
    // A few components (WhatIsDusa, UnderwaterDive) declare
    // `visibility: hidden` in their own scoped styles and used to be revealed
    // by a page-level gsap.set(). Astro's scoped selectors can outrank a
    // global `.is-in` rule, so clear it inline — inline always wins.
    el.style.visibility = 'visible';
  }

  function run() {
    var all = document.querySelectorAll(SELECTOR);
    var targets = [];

    for (var i = 0; i < all.length; i++) {
      // The hero paints from CSS on load — never gate it behind a script.
      if (!all[i].closest('.hero')) targets.push(all[i]);
    }

    // No IntersectionObserver, or the visitor prefers reduced motion:
    // show everything immediately rather than animating it in.
    var reduceMotion = window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!('IntersectionObserver' in window) || reduceMotion) {
      for (var j = 0; j < targets.length; j++) show(targets[j]);
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      for (var k = 0; k < entries.length; k++) {
        var e = entries[k];

        // isIntersecting alone is not enough. IntersectionObserver coalesces
        // callbacks, so on a fast flick-scroll an element can enter and leave
        // the viewport between two ticks and only ever be reported as *not*
        // intersecting — leaving it permanently invisible. (GSAP's
        // ScrollTrigger did not have this problem because it evaluated
        // synchronously on scroll.) So also show anything that has ended up
        // above the viewport: we have scrolled past it either way.
        var scrolledPast = e.rootBounds
          ? e.boundingClientRect.bottom < e.rootBounds.top
          : e.boundingClientRect.bottom < 0;

        if (e.isIntersecting || scrolledPast) {
          show(e.target);
          io.unobserve(e.target);
        }
      }
    }, {
      // Fire slightly before the element reaches the bottom edge, so the
      // animation is already under way by the time it is properly in view.
      rootMargin: '0px 0px -10% 0px',
      threshold: 0,
    });

    var pending = [];

    for (var m = 0; m < targets.length; m++) {
      // Anything already on screen at load shows straight away, with no
      // observer round trip and no flash.
      var rect = targets[m].getBoundingClientRect();
      if (rect.top < window.innerHeight && rect.bottom > 0) {
        show(targets[m]);
      } else {
        pending.push(targets[m]);
        io.observe(targets[m]);
      }
    }

    // Safety net: after scrolling settles, sweep up anything the observer
    // missed and anything now above the fold. Cheap — it only ever runs over
    // elements that have not been shown yet, and it detaches once empty.
    var sweepTimer = 0;
    function sweep() {
      var still = [];
      for (var i = 0; i < pending.length; i++) {
        var el = pending[i];
        if (el.classList.contains('is-in')) continue;
        var r = el.getBoundingClientRect();
        if (r.top < window.innerHeight) {
          show(el);
          io.unobserve(el);
        } else {
          still.push(el);
        }
      }
      pending = still;
      if (!pending.length) {
        window.removeEventListener('scroll', onScroll);
        io.disconnect();
      }
    }

    function onScroll() {
      clearTimeout(sweepTimer);
      sweepTimer = setTimeout(sweep, 150);
    }

    if (pending.length) {
      window.addEventListener('scroll', onScroll, { passive: true });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
})();
