// Minimal runtime for .dc.html files.
// Provides React.createElement (SVG-only shim) + DCLogic, then renders the
// x-dc template by substituting {{ key }} placeholders with renderVals() output.
(function () {
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const VERBATIM = new Set(['viewBox', 'preserveAspectRatio', 'gradientUnits', 'patternUnits',
    'pathLength', 'maskUnits', 'maskContentUnits', 'clipPathUnits']);

  function createElement(type, props, ...children) {
    const el = document.createElementNS(SVG_NS, type);
    for (const [k, v] of Object.entries(props || {})) {
      if (k === 'key' || v == null) continue;
      if (k === 'className') {
        el.setAttribute('class', v);
      } else if (k === 'style' && typeof v === 'object') {
        for (const [sk, sv] of Object.entries(v)) {
          if (sk.startsWith('--')) el.style.setProperty(sk, sv);
          else el.style[sk] = sv;
        }
      } else {
        const name = VERBATIM.has(k) ? k : k.replace(/[A-Z]/g, c => '-' + c.toLowerCase());
        el.setAttribute(name, v);
      }
    }
    (function append(c) {
      if (c == null || c === false) return;
      if (Array.isArray(c)) c.forEach(append);
      else if (c instanceof Node) el.appendChild(c);
      else el.appendChild(document.createTextNode(String(c)));
    })(children);
    return el;
  }

  window.React = { createElement };
  window.DCLogic = class DCLogic {};

  document.addEventListener('DOMContentLoaded', () => {
    const root = document.querySelector('x-dc');
    const src = document.querySelector('script[type="text/x-dc"]');
    if (!root || !src) return;

    const helmet = root.querySelector('helmet');
    if (helmet) {
      document.head.append(...helmet.children);
      helmet.remove();
    }

    const Component = new Function(src.textContent + '\nreturn Component;')();
    const vals = new Component().renderVals();

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const texts = [];
    while (walker.nextNode()) texts.push(walker.currentNode);
    for (const n of texts) {
      const m = n.textContent.match(/\{\{\s*(\w+)\s*\}\}/);
      if (m && vals[m[1]] !== undefined) n.parentNode.replaceChild(vals[m[1]], n);
    }
  });
})();
