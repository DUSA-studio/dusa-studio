/**
 * DUSA Water Ripple Effect — Dark Ocean at Night
 * Pure water physics: drops from mouse, ripples expand outward, reflect off edges.
 * Warm sandstone moonlight catches the crests. Everything else stays dark.
 */
(function () {
  'use strict';

  const RIPPLE_RESOLUTION = 512;   // higher res = crisper ripple rings
  const RIPPLE_RADIUS = 0.015;     // tight drops = defined concentric rings
  const RIPPLE_STRENGTH = 0.5;     // strong drops for visible 3D displacement
  const DAMPING = 0.994;           // very slow fade = ripples travel far and reflect many times
  const DROP_COOLDOWN = 0.04;      // very responsive — drops trail closely behind cursor

  // ─── SHADERS ───

  const QUAD_VS = `#version 300 es
    in vec2 a_pos;
    out vec2 v_uv;
    void main() {
      v_uv = a_pos * 0.5 + 0.5;
      gl_Position = vec4(a_pos, 0.0, 1.0);
    }`;

  // Ripple simulation — wave equation with edge reflection via mirrored UVs
  const RIPPLE_FS = `#version 300 es
    precision highp float;
    in vec2 v_uv;
    out vec4 fragColor;

    uniform sampler2D u_prev;
    uniform sampler2D u_curr;
    uniform vec2 u_dropPos;
    uniform float u_dropStrength;
    uniform float u_damping;
    uniform vec2 u_texel;

    // Mirror UVs at edges so waves bounce back
    vec2 mirrorUV(vec2 uv) {
      vec2 m = uv;
      if (m.x < 0.0) m.x = -m.x;
      if (m.x > 1.0) m.x = 2.0 - m.x;
      if (m.y < 0.0) m.y = -m.y;
      if (m.y > 1.0) m.y = 2.0 - m.y;
      return m;
    }

    void main() {
      float prev = texture(u_prev, v_uv).r;
      float curr = texture(u_curr, v_uv).r;

      // Sample 4 neighbours — mirrored at edges for wave reflection
      float l = texture(u_curr, mirrorUV(v_uv + vec2(-u_texel.x, 0.0))).r;
      float r = texture(u_curr, mirrorUV(v_uv + vec2( u_texel.x, 0.0))).r;
      float t = texture(u_curr, mirrorUV(v_uv + vec2(0.0,  u_texel.y))).r;
      float b = texture(u_curr, mirrorUV(v_uv + vec2(0.0, -u_texel.y))).r;

      // Standard wave equation: next = avg(neighbours)*2 - prev
      float next = (l + r + t + b) * 0.5 - prev;
      next *= u_damping;

      // Add drop — tight gaussian for defined ring
      if (u_dropStrength > 0.001) {
        float dist = length(v_uv - u_dropPos);
        float drop = exp(-dist * dist / (2.0 * ${RIPPLE_RADIUS} * ${RIPPLE_RADIUS}));
        next += drop * u_dropStrength;
      }

      fragColor = vec4(next, 0.0, 0.0, 1.0);
    }`;

  // Render — 3D dark ocean with moonlight, Fresnel, trough shadows, refraction
  const RENDER_FS = `#version 300 es
    precision highp float;
    in vec2 v_uv;
    out vec4 fragColor;

    uniform sampler2D u_height;
    uniform vec2 u_texel;
    uniform float u_time;

    // Dark ocean palette — DUSA brand: deep-black + deep-ocean + sandstone shimmer
    const vec3 deepBlack   = vec3(0.035, 0.04, 0.06);    // #0C0E14 base
    const vec3 deepOcean   = vec3(0.10, 0.22, 0.36);     // #1A3A5C DUSA deep-ocean blue
    const vec3 troughColor = vec3(0.02, 0.03, 0.06);     // blue-black in wave troughs
    const vec3 sandstone   = vec3(0.78, 0.70, 0.55);     // DUSA sandstone shimmer (warm, NOT white)
    const vec3 sandTint    = vec3(0.42, 0.40, 0.35);     // muted sandstone for subtle glow
    const vec3 oceanReflect = vec3(0.08, 0.14, 0.24);    // deep-ocean night sky reflection

    void main() {
      // Sample height and neighbours
      float h  = texture(u_height, v_uv).r;
      float hL = texture(u_height, v_uv + vec2(-u_texel.x, 0.0)).r;
      float hR = texture(u_height, v_uv + vec2( u_texel.x, 0.0)).r;
      float hT = texture(u_height, v_uv + vec2(0.0,  u_texel.y)).r;
      float hB = texture(u_height, v_uv + vec2(0.0, -u_texel.y)).r;

      // ─── SURFACE NORMALS — strong for 3D depth ───
      float dx = (hR - hL) * 10.0;
      float dy = (hT - hB) * 10.0;
      vec3 normal = normalize(vec3(-dx, -dy, 1.0));

      // ─── BASE: deep-black blending into deep-ocean blue ───
      float vignette = 1.0 - length(v_uv - 0.5) * 0.5;
      vec3 baseColor = mix(deepBlack, deepOcean, vignette * 0.35);

      // ─── TROUGH DARKENING — waves dipping below surface get darker (3D depth) ───
      float troughFactor = smoothstep(0.0, -0.08, h);  // negative height = trough
      baseColor = mix(baseColor, troughColor, troughFactor * 0.6);

      // ─── CREST BRIGHTENING — waves above surface catch deep-ocean blue light ───
      float crestFactor = smoothstep(0.0, 0.1, h);     // positive height = crest
      baseColor += oceanReflect * crestFactor * 0.2;

      // ─── PRIMARY MOONLIGHT — from upper-right, like the moon ───
      vec3 moonDir = normalize(vec3(0.3, 0.6, 0.7));
      vec3 viewDir = vec3(0.0, 0.0, 1.0);

      // Diffuse — shows which face of the ripple is lit vs shadowed
      float diffuse = max(dot(normal, moonDir), 0.0);
      float shadow  = 1.0 - max(dot(normal, -moonDir), 0.0) * 0.3;  // darken away-facing sides

      // Specular — moonlight glints on wave crests
      vec3 reflectDir = reflect(-moonDir, normal);
      float specRaw = max(dot(viewDir, reflectDir), 0.0);
      float specSharp = pow(specRaw, 80.0);   // tight moonlight sparkle
      float specMid   = pow(specRaw, 20.0);   // shows ripple ring shape
      float specSoft  = pow(specRaw, 6.0);    // broad ambient glow

      // ─── SECONDARY LIGHT — faint ambient from opposite side for depth ───
      vec3 fillDir = normalize(vec3(-0.4, -0.3, 0.9));
      vec3 fillReflect = reflect(-fillDir, normal);
      float fillSpec = pow(max(dot(viewDir, fillReflect), 0.0), 30.0);

      // ─── FRESNEL EFFECT — edges of ripples reflect more (real water physics) ───
      float fresnel = 1.0 - max(dot(normal, viewDir), 0.0);
      fresnel = pow(fresnel, 3.0);  // steep Fresnel curve
      // At glancing angles (steep ripple walls), more reflection = brighter

      // ─── REFRACTION — slight color shift where normals bend the view ───
      // Simulates looking through the water surface at an angle
      vec2 refractUV = v_uv + normal.xy * 0.008;
      float hRefract = texture(u_height, refractUV).r;
      float refractShift = (hRefract - h) * 0.5;

      // ─── RIPPLE EDGE CAUSTICS ───
      float gradient = length(vec2(dx, dy));
      float edgeCaustic = smoothstep(0.0, 0.15, gradient);

      // ─── COMPOSE — layered: deep-ocean blue body + sandstone shimmer on crests ───
      vec3 color = baseColor;

      // Diffuse face shading — deep-ocean blue on lit faces
      color += mix(oceanReflect, sandTint, 0.3) * (diffuse - 0.45) * 0.12 * shadow;

      // Primary sandstone specular — warm shimmer, NOT white
      color += sandstone * specSharp * 0.45;               // sandstone crest glint (controlled)
      color += sandTint * specMid * 0.20;                  // ring shape glow
      color += oceanReflect * specSoft * 0.08;             // deep-ocean ambient displacement

      // Fill light — deep-ocean blue from second angle for depth
      color += mix(oceanReflect, sandTint, 0.2) * fillSpec * 0.12;

      // Fresnel reflection — deep-ocean blue on steep ripple walls
      color += oceanReflect * fresnel * 0.25;              // blue reflection on steep walls
      color += sandTint * fresnel * edgeCaustic * 0.08;    // faint warm edge glow

      // Edge caustics — sandstone along ripple ring edges (restrained)
      color += sandstone * edgeCaustic * 0.05;

      // Refraction color shift — deep-ocean blue depth illusion
      color += deepOcean * abs(refractShift) * 0.35;

      // Very faint height luminance for shadow detail
      float heightGlow = smoothstep(0.0, 0.06, abs(h));
      color += oceanReflect * heightGlow * 0.05;

      fragColor = vec4(color, 1.0);
    }`;

  // ─── GL HELPERS ───

  function createShader(gl, type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.error('Shader compile:', gl.getShaderInfoLog(s));
      gl.deleteShader(s);
      return null;
    }
    return s;
  }

  function createProgram(gl, vsSrc, fsSrc) {
    const vs = createShader(gl, gl.VERTEX_SHADER, vsSrc);
    const fs = createShader(gl, gl.FRAGMENT_SHADER, fsSrc);
    if (!vs || !fs) return null;
    const p = gl.createProgram();
    gl.attachShader(p, vs);
    gl.attachShader(p, fs);
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
      console.error('Program link:', gl.getProgramInfoLog(p));
      return null;
    }
    return p;
  }

  function createFBO(gl, w, h) {
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R16F, w, h, 0, gl.RED, gl.HALF_FLOAT, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    // Clamp to edge — reflection is handled manually in the shader
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    const fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    return { tex, fb };
  }

  // ─── MAIN ───

  function init() {
    const container = document.getElementById('hero-water-canvas');
    if (!container) return;

    const canvas = document.createElement('canvas');
    container.appendChild(canvas);

    const gl = canvas.getContext('webgl2', {
      alpha: false,
      antialias: false,
      premultipliedAlpha: false,
      preserveDrawingBuffer: false,
    });

    if (!gl) {
      console.warn('WebGL2 not supported, water effect disabled');
      return;
    }

    const ext = gl.getExtension('EXT_color_buffer_half_float');
    if (!ext) gl.getExtension('EXT_color_buffer_float');

    // Compile programs
    const rippleProg = createProgram(gl, QUAD_VS, RIPPLE_FS);
    const renderProg = createProgram(gl, QUAD_VS, RENDER_FS);
    if (!rippleProg || !renderProg) return;

    // Fullscreen quad
    const quadBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);

    // Ripple uniforms
    const rU = {
      prev: gl.getUniformLocation(rippleProg, 'u_prev'),
      curr: gl.getUniformLocation(rippleProg, 'u_curr'),
      dropPos: gl.getUniformLocation(rippleProg, 'u_dropPos'),
      dropStrength: gl.getUniformLocation(rippleProg, 'u_dropStrength'),
      damping: gl.getUniformLocation(rippleProg, 'u_damping'),
      texel: gl.getUniformLocation(rippleProg, 'u_texel'),
    };
    const rA = gl.getAttribLocation(rippleProg, 'a_pos');

    // Render uniforms
    const dU = {
      height: gl.getUniformLocation(renderProg, 'u_height'),
      texel: gl.getUniformLocation(renderProg, 'u_texel'),
      time: gl.getUniformLocation(renderProg, 'u_time'),
    };
    const dA = gl.getAttribLocation(renderProg, 'a_pos');

    // Triple-buffer ping-pong
    const res = RIPPLE_RESOLUTION;
    let fbo0 = createFBO(gl, res, res);
    let fbo1 = createFBO(gl, res, res);
    let fbo2 = createFBO(gl, res, res);

    // Mouse state
    let mouseX = 0.5, mouseY = 0.5;
    let prevMouseX = 0.5, prevMouseY = 0.5;
    let mouseActive = false;
    let dropStrength = 0;
    let lastDropTime = 0;
    let pendingDrop = false;

    const heroSection = document.getElementById('hero');

    function onMouseMove(e) {
      const rect = canvas.getBoundingClientRect();
      mouseX = (e.clientX - rect.left) / rect.width;
      mouseY = 1.0 - (e.clientY - rect.top) / rect.height;
      mouseActive = true;

      const now = performance.now() / 1000;
      if (now - lastDropTime > DROP_COOLDOWN) {
        const dx = mouseX - prevMouseX;
        const dy = mouseY - prevMouseY;
        const vel = Math.sqrt(dx * dx + dy * dy);
        if (vel > 0.001) {
          // Strong drops that trail closely behind the cursor
          dropStrength = Math.min(vel * 8.0, RIPPLE_STRENGTH);
          lastDropTime = now;
          pendingDrop = true;
        }
      }

      prevMouseX = mouseX;
      prevMouseY = mouseY;
    }

    function onMouseLeave() {
      mouseActive = false;
      dropStrength = 0;
    }

    if (heroSection) {
      heroSection.addEventListener('mousemove', onMouseMove, { passive: true });
      heroSection.addEventListener('mouseleave', onMouseLeave);
    }

    // Touch support
    function onTouchMove(e) {
      const touch = e.touches[0];
      if (!touch) return;
      const rect = canvas.getBoundingClientRect();
      mouseX = (touch.clientX - rect.left) / rect.width;
      mouseY = 1.0 - (touch.clientY - rect.top) / rect.height;
      mouseActive = true;

      const now = performance.now() / 1000;
      if (now - lastDropTime > DROP_COOLDOWN) {
        const dx = mouseX - prevMouseX;
        const dy = mouseY - prevMouseY;
        const vel = Math.sqrt(dx * dx + dy * dy);
        if (vel > 0.001) {
          dropStrength = Math.min(vel * 7.0, RIPPLE_STRENGTH * 0.8);
          lastDropTime = now;
          pendingDrop = true;
        }
      }

      prevMouseX = mouseX;
      prevMouseY = mouseY;
    }

    if (heroSection) {
      heroSection.addEventListener('touchmove', onTouchMove, { passive: true });
      heroSection.addEventListener('touchend', onMouseLeave);
    }

    // Resize handler
    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.parentElement.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = rect.width + 'px';
      canvas.style.height = rect.height + 'px';
    }

    resize();
    window.addEventListener('resize', resize, { passive: true });

    // Auto-ripple: gentle ambient drops when mouse is idle
    let autoDropTimer = 0;
    const AUTO_DROP_INTERVAL = 3.5;

    // ─── RENDER LOOP ───
    let startTime = performance.now();

    function drawQuad(attribLoc) {
      gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
      gl.enableVertexAttribArray(attribLoc);
      gl.vertexAttribPointer(attribLoc, 2, gl.FLOAT, false, 0, 0);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }

    function frame(now) {
      requestAnimationFrame(frame);

      const t = (now - startTime) / 1000;
      const texel = [1.0 / res, 1.0 / res];

      // Drop logic
      let currentDropX = mouseX;
      let currentDropY = mouseY;
      let currentDropStrength = 0;

      if (pendingDrop) {
        currentDropStrength = dropStrength;
        pendingDrop = false;
      }

      // Auto ambient drops when idle
      autoDropTimer += 1 / 60;
      if (!mouseActive && autoDropTimer > AUTO_DROP_INTERVAL) {
        autoDropTimer = 0;
        currentDropX = 0.2 + Math.random() * 0.6;
        currentDropY = 0.2 + Math.random() * 0.6;
        currentDropStrength = RIPPLE_STRENGTH * 0.25;
      }

      // ── Pass 1: Ripple simulation ──
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo2.fb);
      gl.viewport(0, 0, res, res);
      gl.useProgram(rippleProg);

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, fbo0.tex);
      gl.uniform1i(rU.prev, 0);

      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, fbo1.tex);
      gl.uniform1i(rU.curr, 1);

      gl.uniform2f(rU.dropPos, currentDropX, currentDropY);
      gl.uniform1f(rU.dropStrength, currentDropStrength);
      gl.uniform1f(rU.damping, DAMPING);
      gl.uniform2f(rU.texel, texel[0], texel[1]);

      drawQuad(rA);

      // Rotate buffers
      const tmp = fbo0;
      fbo0 = fbo1;
      fbo1 = fbo2;
      fbo2 = tmp;

      // ── Pass 2: Render to screen ──
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.useProgram(renderProg);

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, fbo1.tex);
      gl.uniform1i(dU.height, 0);
      gl.uniform2f(dU.texel, texel[0], texel[1]);
      gl.uniform1f(dU.time, t);

      drawQuad(dA);
    }

    requestAnimationFrame(frame);
  }

  // Start when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
