/* Skin v16 installer helpers. Run in the AGENCY tab on
   Settings → Company → White Label, where two CodeMirror 6 editors live:
   index 0 = Custom JS, index 1 = Custom CSS. Nothing is saved until the
   Save button is clicked; arm() only enables it. */
(function () {
  var BASE = 'https://dusa.studio/platform/';
  function views() { return Array.prototype.map.call(document.querySelectorAll('.cm-content'), function (c) { return c.cmView && c.cmView.view; }); }
  function doc(i) { var v = views()[i]; return v ? v.state.doc.toString() : null; }

  function xform(css) {
    function splitSel(s) { var parts = [], d = 0, cur = ''; for (var i = 0; i < s.length; i++) { var ch = s[i]; if (ch === '(' || ch === '[') d++; if (ch === ')' || ch === ']') d--; if (ch === ',' && d === 0) { parts.push(cur); cur = ''; } else cur += ch; } parts.push(cur); return parts; }
    var n = 0;
    var out = css.replace(/([^{}]+)\{([^{}]*)\}/g, function (m, sel, decl) {
      if (!/background/i.test(decl) || sel.indexOf('default-dark-v1') < 0 || sel.indexOf('[class*=') < 0) return m;
      return splitSel(sel).map(function (p) {
        var mm = p.match(/\[class\*="([^"]+)"\]\s*$/);
        if (mm && mm[1].indexOf('__') < 0) { n++; return p.replace(/\s*$/, function (ws) { return ':not([class*="__"])' + ws; }); }
        return p;
      }).join(',') + '{' + decl + '}';
    });
    [['body[data-theme="default-dark-v1"] .popover, body[data-theme="default-dark-v1"] [class*="popover"]:not([class*="__"]) {',
      'body[data-theme="default-dark-v1"] .popover, body[data-theme="default-dark-v1"] [class*="popover"]:not([class*="__"]):not([class*="popover-"]):not(.hr-popover):not(.n-popover) {'],
     ['body[data-theme="default-dark-v1"] [class*="panel"]:not([class*="__"]), body[data-theme="default-dark-v1"] [class*="drawer"]:not([class*="__"]) {',
      'body[data-theme="default-dark-v1"] [class*="panel"]:not([class*="__"]):not([class*="panel-"]), body[data-theme="default-dark-v1"] [class*="drawer"]:not([class*="__"]):not([class*="drawer-"]):not(.hr-drawer):not(.n-drawer) {'],
     ['body[data-theme="default-dark-v1"] [class*="composer"]:not([class*="__"]), body[data-theme="default-dark-v1"] [class*="message-input"]:not([class*="__"]) {',
      'body[data-theme="default-dark-v1"] [class*="composer"]:not([class*="__"]):not([class*="askai-composer"]), body[data-theme="default-dark-v1"] [class*="message-input"]:not([class*="__"]) {']
    ].forEach(function (r) { out = out.split(r[0]).join(r[1]); });
    return { css: out, n: n };
  }

  function arm(i) {
    var c = document.querySelectorAll('.cm-content')[i];
    c.focus();
    c.dispatchEvent(new KeyboardEvent('keydown', { key: 'Shift', bubbles: true }));
    c.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: '' }));
    c.dispatchEvent(new KeyboardEvent('keyup', { key: 'Shift', bubbles: true }));
  }
  function setDoc(i, text) {
    var v = views()[i];
    v.dispatch({ changes: { from: 0, to: v.state.doc.length, insert: text } });
    arm(i);
    return v.state.doc.length;
  }

  window.__dzInstall = {
    status: function () {
      var js = doc(0), css = doc(1);
      return {
        editors: views().length,
        jsLen: js && js.length, jsHasFixer: !!js && js.indexOf('skin fixer (v16') > -1, jsBridge: !!js && js.indexOf('Brand Bridge') > -1,
        cssLen: css && css.length, cssHasV16: !!css && css.indexOf('SKIN v16') > -1,
        cssXformed: css ? css.split(':not([class*="__"])').length - 1 : 0
      };
    },
    backup: function () {
      var stamp = new Date().toISOString().slice(0, 16);
      try {
        localStorage.setItem('dusaSkinBackup.js.' + stamp, doc(0));
        localStorage.setItem('dusaSkinBackup.css.' + stamp, doc(1));
        return stamp;
      } catch (e) { return 'backup failed: ' + e.message; }
    },
    buildCss: async function () {
      var cur = doc(1), cut = cur.indexOf('/* ╔'); // strip an older v16 block if present
      var marker = cur.indexOf('SKIN v16');
      var base = marker > -1 ? cur.slice(0, cur.lastIndexOf('/*', marker)).replace(/\s+$/, '') : cur.replace(/\s+$/, '');
      if (base.indexOf(':not([class*="__"])') < 0) base = xform(base).css;
      var v16 = await (await fetch(BASE + 'v16.css?t=' + Date.now())).text();
      window.__dzNewCss = base + '\n\n' + v16.trim() + '\n';
      return { base: base.length, v16: v16.length, total: window.__dzNewCss.length, cut: cut };
    },
    buildJs: async function () {
      var cur = doc(0), marker = cur.indexOf('<script>/* DUSA . studio · skin fixer');
      var base = marker > -1 ? cur.slice(0, marker).replace(/\s+$/, '') : cur.replace(/\s+$/, '');
      var fixer = await (await fetch(BASE + 'v16-dark.js?t=' + Date.now())).text();
      window.__dzNewJs = base + '\n\n<script>' + fixer.trim() + '\n</script>\n';
      return { base: base.length, fixer: fixer.length, total: window.__dzNewJs.length };
    },
    applyCss: function () { return setDoc(1, window.__dzNewCss); },
    applyJs: function () { return setDoc(0, window.__dzNewJs); },
    restore: function (stamp) {
      setDoc(0, localStorage.getItem('dusaSkinBackup.js.' + stamp));
      setDoc(1, localStorage.getItem('dusaSkinBackup.css.' + stamp));
      return 'restored into the editors; click Save on both cards';
    }
  };
})();
