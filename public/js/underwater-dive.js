/**
 * DUSA Captain's Bridge — Canvas ambient effects
 * Ocean/sky, waves, stars, rain, storm darkening, rescue beacon.
 * Driven by progress (0–1) from GSAP ScrollTrigger.
 */
(function () {
  'use strict';

  var container = document.getElementById('bridge-canvas-wrap');
  if (!container) return;

  var canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;';
  container.appendChild(canvas);
  var ctx = canvas.getContext('2d');

  var W, H, dpr;
  var progress = 0;
  var time = 0;

  // ─── PALETTE ───
  var HERO_BLACK  = { r: 12, g: 14, b: 20 };  // matches --deep-black #0C0E14
  var SKY_CALM    = { r: 12, g: 18, b: 35 };
  var SKY_HORIZON = { r: 26, g: 58, b: 92 };
  var SKY_STORM   = { r: 5,  g: 7,  b: 12 };
  var OCEAN_DEEP  = { r: 8,  g: 14, b: 28 };
  var SANDSTONE   = { r: 200, g: 180, b: 140 };
  var WARM_WHITE  = { r: 247, g: 244, b: 239 };

  // How much of the scene is revealed (0 = black like hero, 1 = full scene)
  // FAST reveal — scroll right into it
  function revealFactor() {
    if (progress < 0.005) return 0;
    if (progress < 0.03) return (progress - 0.005) / 0.025;
    return 1;
  }

  // ─── STARS ───
  var stars = [];
  function initStars() {
    stars = [];
    for (var i = 0; i < 80; i++) {
      stars.push({
        x: Math.random() * W,
        y: Math.random() * H * 0.4,
        r: 0.4 + Math.random() * 1,
        phase: Math.random() * Math.PI * 2,
        speed: 0.008 + Math.random() * 0.015,
        baseAlpha: 0.15 + Math.random() * 0.45
      });
    }
  }

  // ─── RAIN ───
  var MAX_RAIN = 120;
  var rain = [];
  function initRain() {
    rain = [];
    for (var i = 0; i < MAX_RAIN; i++) {
      rain.push({
        x: Math.random() * W * 1.3,
        y: Math.random() * H,
        len: 8 + Math.random() * 18,
        speed: 6 + Math.random() * 10,
        alpha: 0.06 + Math.random() * 0.14
      });
    }
  }

  // ─── HELPERS ───
  function lerp(a, b, t) { return a + (b - a) * t; }
  function lerpC(a, b, t) {
    return { r: Math.round(lerp(a.r, b.r, t)), g: Math.round(lerp(a.g, b.g, t)), b: Math.round(lerp(a.b, b.b, t)) };
  }
  function rgb(c) { return 'rgb(' + c.r + ',' + c.g + ',' + c.b + ')'; }

  // INVERTED: starts at full storm, clears as you scroll
  function stormFactor() {
    if (progress < 0.30) return 1;
    if (progress < 0.55) return 1 - (progress - 0.30) / 0.25;
    return 0;
  }

  // ─── DRAW: SKY + OCEAN ───
  function drawSky() {
    var sf = stormFactor();
    var rf = revealFactor();
    var horizonY = H * 0.44;

    // Blend from hero-black toward actual sky colors based on reveal
    var skyTop = lerpC(HERO_BLACK, lerpC(SKY_CALM, SKY_STORM, sf), rf);
    var skyBot = lerpC(HERO_BLACK, lerpC(SKY_HORIZON, SKY_STORM, sf * 0.85), rf);
    var oceanCol = lerpC(HERO_BLACK, OCEAN_DEEP, rf);

    var grad = ctx.createLinearGradient(0, 0, 0, horizonY);
    grad.addColorStop(0, rgb(skyTop));
    grad.addColorStop(1, rgb(skyBot));
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, horizonY);

    // Ocean below horizon
    var oceanGrad = ctx.createLinearGradient(0, horizonY, 0, H);
    oceanGrad.addColorStop(0, rgb(skyBot));
    oceanGrad.addColorStop(0.25, rgb(oceanCol));
    oceanGrad.addColorStop(1, rgb(oceanCol));
    ctx.fillStyle = oceanGrad;
    ctx.fillRect(0, horizonY, W, H - horizonY);

    // Subtle vignette
    if (sf > 0.3) {
      var vigAlpha = (sf - 0.3) * 0.35;
      var vig = ctx.createRadialGradient(W / 2, H / 2, W * 0.15, W / 2, H / 2, W * 0.75);
      vig.addColorStop(0, 'rgba(0,0,0,0)');
      vig.addColorStop(1, 'rgba(0,0,0,' + vigAlpha + ')');
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, W, H);
    }
  }

  // ─── DRAW: STARS ───
  // Stars only appear as the storm clears (progress 0.40+)
  function drawStars() {
    var alpha;
    if (progress < 0.40) alpha = 0;
    else if (progress < 0.55) alpha = (progress - 0.40) / 0.15;
    else alpha = 1;

    if (alpha <= 0) return;

    for (var i = 0; i < stars.length; i++) {
      var s = stars[i];
      s.phase += s.speed;
      var twinkle = 0.5 + 0.5 * Math.sin(s.phase);
      var a = s.baseAlpha * alpha * twinkle;

      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r * dpr, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(' + WARM_WHITE.r + ',' + WARM_WHITE.g + ',' + WARM_WHITE.b + ',' + a + ')';
      ctx.fill();
    }
  }

  // ─── PSEUDO-NOISE for organic shapes ───
  // Simple hash-based noise to avoid pure sine lumps
  function hash(n) {
    var s = Math.sin(n) * 43758.5453;
    return s - Math.floor(s);
  }
  function noise1D(x) {
    var i = Math.floor(x);
    var f = x - i;
    f = f * f * (3 - 2 * f); // smoothstep
    return lerp(hash(i), hash(i + 1), f) * 2 - 1;
  }

  // ─── DRAW: WAVES ───
  // Multi-layer ocean with whitecaps, foam, and depth
  function drawWaves() {
    var rf = revealFactor();
    if (rf <= 0) return;
    var horizonY = H * 0.44;
    var sf = stormFactor();

    // Storm affects wave parameters
    var baseAmp = (3 + sf * 18) * rf;
    var baseSpeed = 1.2 + sf * 2.5;
    var chop = sf * 8; // short choppy waves in storm

    // ── LAYER 1: Deep background swell (slow, long wavelength) ──
    ctx.beginPath();
    ctx.moveTo(0, H);
    for (var x = 0; x <= W; x += 2) {
      var nx = x / W; // 0-1
      var swell = Math.sin(nx * 3.2 + time * baseSpeed * 0.4) * baseAmp * 1.2
                + Math.sin(nx * 5.1 + time * baseSpeed * 0.6 + 1.8) * baseAmp * 0.5
                + noise1D(nx * 8 + time * 0.3) * baseAmp * 0.4;
      var y = horizonY + 12 + swell;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(W, H);
    ctx.closePath();
    var deepGrad = ctx.createLinearGradient(0, horizonY, 0, horizonY + 80);
    deepGrad.addColorStop(0, 'rgba(16,28,52,' + (0.3 * rf) + ')');
    deepGrad.addColorStop(1, 'rgba(8,14,28,' + (0.5 * rf) + ')');
    ctx.fillStyle = deepGrad;
    ctx.fill();

    // ── LAYER 2: Main wave surface ──
    var waveYs = [];
    ctx.beginPath();
    ctx.moveTo(0, H);
    for (var x2 = 0; x2 <= W; x2 += 2) {
      var nx2 = x2 / W;
      // Combine multiple frequencies for organic shape
      var wave = Math.sin(nx2 * 4.5 + time * baseSpeed) * baseAmp
              + Math.sin(nx2 * 7.8 + time * baseSpeed * 1.4 + 0.7) * baseAmp * 0.45
              + Math.sin(nx2 * 12 + time * baseSpeed * 2.1 + 2.1) * chop * 0.5
              + noise1D(nx2 * 15 + time * 0.8) * baseAmp * 0.35
              + noise1D(nx2 * 25 + time * 1.2) * chop * 0.3;
      var wy = horizonY + wave;
      waveYs.push(wy);
      ctx.lineTo(x2, wy);
    }
    ctx.lineTo(W, H);
    ctx.closePath();
    var surfGrad = ctx.createLinearGradient(0, horizonY - baseAmp, 0, horizonY + 60);
    surfGrad.addColorStop(0, 'rgba(20,42,72,' + (0.45 * rf) + ')');
    surfGrad.addColorStop(0.4, 'rgba(12,24,48,' + (0.55 * rf) + ')');
    surfGrad.addColorStop(1, 'rgba(8,14,28,' + (0.65 * rf) + ')');
    ctx.fillStyle = surfGrad;
    ctx.fill();

    // ── WAVE CREST LINE — highlight on the leading edge ──
    ctx.beginPath();
    for (var x3 = 0; x3 <= W; x3 += 2) {
      var idx = x3 >> 1;
      if (x3 === 0) ctx.moveTo(x3, waveYs[idx]); else ctx.lineTo(x3, waveYs[idx]);
    }
    ctx.strokeStyle = 'rgba(120,180,220,' + (0.08 + sf * 0.1) * rf + ')';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // ── WHITECAPS / FOAM — only on wave crests ──
    var foamThreshold = horizonY - baseAmp * 0.3;
    for (var x4 = 0; x4 < waveYs.length; x4++) {
      var wy2 = waveYs[x4];
      // Check if this is a local crest (higher than neighbors)
      var prev = x4 > 0 ? waveYs[x4 - 1] : wy2;
      var next = x4 < waveYs.length - 1 ? waveYs[x4 + 1] : wy2;
      if (wy2 < prev && wy2 < next && wy2 < foamThreshold) {
        // This is a crest — draw foam
        var foamIntensity = (foamThreshold - wy2) / (baseAmp * 0.8);
        foamIntensity = Math.min(1, foamIntensity) * rf;
        var px = x4 * 2;

        // White foam streak
        ctx.beginPath();
        var foamW = 12 + sf * 20 + hash(x4 + Math.floor(time * 2)) * 15;
        ctx.moveTo(px - foamW * 0.5, wy2);
        ctx.quadraticCurveTo(px, wy2 - 2 - sf * 3, px + foamW * 0.5, wy2 + 1);
        ctx.strokeStyle = 'rgba(200,220,240,' + (foamIntensity * (0.15 + sf * 0.25)) + ')';
        ctx.lineWidth = 1.5 + sf * 1.5;
        ctx.stroke();

        // Foam dots / spray
        if (sf > 0.3) {
          var dotCount = Math.floor(sf * 4);
          for (var d = 0; d < dotCount; d++) {
            var dx = px + (hash(x4 * 7 + d + Math.floor(time * 3)) - 0.5) * foamW;
            var dy = wy2 - hash(x4 * 13 + d) * 4 * sf;
            var dr = 0.5 + hash(x4 * 3 + d) * 1.5;
            ctx.beginPath();
            ctx.arc(dx, dy, dr, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(200,220,240,' + (foamIntensity * sf * 0.2) + ')';
            ctx.fill();
          }
        }
      }
    }

    // ── LAYER 3: Foreground chop (close to camera, subtle) ──
    ctx.beginPath();
    for (var x5 = 0; x5 <= W; x5 += 3) {
      var nx5 = x5 / W;
      var fg = Math.sin(nx5 * 9 + time * baseSpeed * 1.8 + 3.5) * baseAmp * 0.3
             + Math.sin(nx5 * 16 + time * baseSpeed * 2.5 + 1.2) * chop * 0.25
             + noise1D(nx5 * 30 + time * 1.5) * chop * 0.2;
      var fy = horizonY + 18 + fg;
      if (x5 === 0) ctx.moveTo(x5, fy); else ctx.lineTo(x5, fy);
    }
    ctx.strokeStyle = 'rgba(80,140,180,' + (0.04 + sf * 0.06) * rf + ')';
    ctx.lineWidth = 0.6;
    ctx.stroke();
  }

  // ─── DRAW: RAIN ───
  // INVERTED: rain at full intensity from start, fades as storm clears
  function drawRain() {
    var intensity;
    if (progress < 0.30) intensity = 1;
    else if (progress < 0.50) intensity = 1 - (progress - 0.30) / 0.20;
    else intensity = 0;

    if (intensity <= 0) return;

    var count = Math.floor(MAX_RAIN * intensity);
    ctx.lineWidth = 0.5 * dpr;

    for (var i = 0; i < count; i++) {
      var r = rain[i];
      r.y += r.speed;
      r.x -= r.speed * 0.25;

      if (r.y > H + 20) { r.y = -20; r.x = Math.random() * W * 1.3; }
      if (r.x < -30) { r.x = W + 30; }

      ctx.beginPath();
      ctx.moveTo(r.x, r.y);
      ctx.lineTo(r.x - r.len * 0.25, r.y + r.len);
      ctx.strokeStyle = 'rgba(140,170,200,' + (r.alpha * intensity) + ')';
      ctx.stroke();
    }
  }

  // ─── DRAW: LIGHTNING FLASH ───
  var lastFlash = 0;
  var flashAlpha = 0;
  function drawLightning() {
    var sf = stormFactor();
    if (sf < 0.7) { flashAlpha = 0; return; }

    // Random flash trigger
    if (flashAlpha <= 0 && Math.random() < 0.003 * sf) {
      flashAlpha = 0.08 + Math.random() * 0.06;
    }

    if (flashAlpha > 0) {
      ctx.fillStyle = 'rgba(180,200,220,' + flashAlpha + ')';
      ctx.fillRect(0, 0, W, H * 0.44);
      flashAlpha *= 0.85;
      if (flashAlpha < 0.005) flashAlpha = 0;
    }
  }

  // ─── DRAW: RESCUE BEACON ───
  // Beacon appears as storm clears — the light at the end
  function drawBeacon() {
    if (progress < 0.40) return;

    var bp = Math.min(1, (progress - 0.40) / 0.30);
    var horizonY = H * 0.44;
    var cx = W / 2;
    var cy = horizonY - 5;

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    // Outer glow
    var glowR = (40 + bp * 280) * dpr;
    var glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowR);
    var ga = 0.06 * bp;
    glow.addColorStop(0, 'rgba(' + SANDSTONE.r + ',' + SANDSTONE.g + ',' + SANDSTONE.b + ',' + (ga * 3) + ')');
    glow.addColorStop(0.3, 'rgba(' + SANDSTONE.r + ',' + SANDSTONE.g + ',' + SANDSTONE.b + ',' + ga + ')');
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, glowR, 0, Math.PI * 2);
    ctx.fill();

    // Core point
    var coreR = (2 + bp * 10) * dpr;
    var ca = Math.min(1, bp * 2);
    var core = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR);
    core.addColorStop(0, 'rgba(' + WARM_WHITE.r + ',' + WARM_WHITE.g + ',' + WARM_WHITE.b + ',' + ca + ')');
    core.addColorStop(0.5, 'rgba(' + SANDSTONE.r + ',' + SANDSTONE.g + ',' + SANDSTONE.b + ',' + (ca * 0.6) + ')');
    core.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(cx, cy, coreR, 0, Math.PI * 2);
    ctx.fill();

    // Upward rays
    if (bp > 0.3) {
      var ra = (bp - 0.3) * 0.05;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx - 50 * bp * dpr, 0);
      ctx.lineTo(cx + 50 * bp * dpr, 0);
      ctx.closePath();
      var rg = ctx.createLinearGradient(cx, cy, cx, 0);
      rg.addColorStop(0, 'rgba(' + SANDSTONE.r + ',' + SANDSTONE.g + ',' + SANDSTONE.b + ',' + ra + ')');
      rg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = rg;
      ctx.fill();
    }

    ctx.restore();
  }

  // ─── DRAW: SPRAY ON WINDOWS ───
  var spray = [];
  function initSpray() {
    spray = [];
    for (var i = 0; i < 30; i++) {
      spray.push({
        x: Math.random() * W,
        y: H * 0.3 + Math.random() * H * 0.3,
        r: 1 + Math.random() * 3,
        alpha: 0,
        targetAlpha: 0.05 + Math.random() * 0.12,
        life: 0,
        maxLife: 60 + Math.random() * 120
      });
    }
  }

  function drawSpray() {
    var sf = stormFactor();
    if (sf < 0.5) return;

    var intensity = (sf - 0.5) * 2;
    for (var i = 0; i < spray.length; i++) {
      var s = spray[i];
      s.life++;

      if (s.life > s.maxLife) {
        s.x = Math.random() * W;
        s.y = H * 0.25 + Math.random() * H * 0.4;
        s.life = 0;
        s.maxLife = 40 + Math.random() * 100;
      }

      var lifeP = s.life / s.maxLife;
      var a = s.targetAlpha * intensity * Math.sin(lifeP * Math.PI);

      if (a > 0.005) {
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r * dpr, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(180,200,220,' + a + ')';
        ctx.fill();
      }
    }
  }

  // ─── RESIZE ───
  function resize() {
    var rect = container.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = rect.width;
    H = rect.height;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    initStars();
    initRain();
    initSpray();
  }

  // ─── RENDER LOOP ───
  // Full-screen 2D canvas scene (sky, stars, waves, rain, lightning, spray,
  // beacon). It used to run at 60fps from page load until the element was
  // removed, regardless of whether it was anywhere near the viewport. It now
  // only draws while it is on screen and the tab is visible.
  var raf = 0;
  var running = false;

  function render() {
    raf = running ? requestAnimationFrame(render) : 0;
    time += 0.016;
    ctx.clearRect(0, 0, W, H);
    drawSky();
    drawStars();
    drawWaves();
    drawRain();
    drawLightning();
    drawSpray();
    drawBeacon();
  }

  function start() {
    if (running) return;
    running = true;
    raf = requestAnimationFrame(render);
  }

  function stop() {
    running = false;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  }

  // ─── PUBLIC API ───
  window.underwaterDive = {
    setProgress: function (p) { progress = Math.max(0, Math.min(1, p)); },
    getProgress: function () { return progress; }
  };

  // ─── INIT ───
  resize();

  // No prefers-reduced-motion opt-out here: this scene is scroll-driven, so
  // freezing it would leave the section stuck mid-transition rather than
  // calmed down. Gating it on visibility is the win.
  var onScreen = true;

  if ('IntersectionObserver' in window) {
    onScreen = false;
    new IntersectionObserver(function (entries) {
      onScreen = entries[0].isIntersecting;
      if (onScreen && !document.hidden) start();
      else stop();
    }, { threshold: 0 }).observe(container);
  } else {
    start();
  }

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) stop();
    else if (onScreen) start();
  });

  window.addEventListener('resize', resize);

  var obs = new MutationObserver(function () {
    if (!document.getElementById('bridge-canvas-wrap')) {
      stop();
      window.removeEventListener('resize', resize);
      obs.disconnect();
    }
  });
  obs.observe(document.body, { childList: true, subtree: true });
})();
