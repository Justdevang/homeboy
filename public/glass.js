/* Vanilla port of React Bits <GlassSurface>.
   Same props, same technique: an SVG displacement map (red = x, blue = y)
   is generated for the element's size, then each colour channel is displaced
   by a slightly different amount for the chromatic edge. Chromium renders
   SVG filters in backdrop-filter; Safari and Firefox get a frosted fallback. */
(function () {
  const NS = 'http://www.w3.org/2000/svg';
  const DEFAULTS = {
    borderRadius: 20,
    borderWidth: 0.07,
    brightness: 50,
    opacity: 0.93,
    blur: 11,
    displace: 0,
    backgroundOpacity: 0,
    saturation: 1,
    distortionScale: -180,
    redOffset: 0,
    greenOffset: 10,
    blueOffset: 20,
    xChannel: 'R',
    yChannel: 'G',
    mixBlendMode: 'difference'
  };

  let uid = 0;

  function supportsSVGBackdrop() {
    const ua = navigator.userAgent;
    const webkitOnly = /Safari/.test(ua) && !/Chrome|Chromium|Edg/.test(ua);
    const firefox = /Firefox/.test(ua);
    if (webkitOnly || firefox) return false;
    return CSS.supports('backdrop-filter', 'url(#a)');
  }

  function displacementMap(w, h, o, id) {
    const edge = Math.min(w, h) * (o.borderWidth * 0.5);
    const svg = `
      <svg viewBox="0 0 ${w} ${h}" xmlns="${NS}">
        <defs>
          <linearGradient id="${id}-r" x1="100%" y1="0%" x2="0%" y2="0%">
            <stop offset="0%" stop-color="#0000"/>
            <stop offset="100%" stop-color="red"/>
          </linearGradient>
          <linearGradient id="${id}-b" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#0000"/>
            <stop offset="100%" stop-color="blue"/>
          </linearGradient>
        </defs>
        <rect width="${w}" height="${h}" fill="black"/>
        <rect width="${w}" height="${h}" rx="${o.borderRadius}" fill="url(#${id}-r)"/>
        <rect width="${w}" height="${h}" rx="${o.borderRadius}" fill="url(#${id}-b)" style="mix-blend-mode:${o.mixBlendMode}"/>
        <rect x="${edge}" y="${edge}" width="${w - edge * 2}" height="${h - edge * 2}" rx="${o.borderRadius}"
              fill="hsl(0 0% ${o.brightness}% / ${o.opacity})" style="filter:blur(${o.blur}px)"/>
      </svg>`;
    return 'data:image/svg+xml,' + encodeURIComponent(svg);
  }

  function channel(o, offset, keep) {
    const m = { R: '1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0', G: '0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0', B: '0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0' }[keep];
    return `
      <feDisplacementMap in="SourceGraphic" in2="map" scale="${o.distortionScale + offset}"
        xChannelSelector="${o.xChannel}" yChannelSelector="${o.yChannel}" result="d${keep}"/>
      <feColorMatrix in="d${keep}" type="matrix" values="${m}" result="c${keep}"/>`;
  }

  window.GlassSurface = function (el, options) {
    const o = Object.assign({}, DEFAULTS, options);
    el.classList.add('glass');
    el.style.borderRadius = o.borderRadius + 'px';
    el.style.setProperty('--glass-frost', o.backgroundOpacity);
    el.style.setProperty('--glass-saturation', o.saturation);

    if (!supportsSVGBackdrop()) {
      el.classList.add('glass--fallback');
      return;
    }

    const id = 'glass-' + ++uid;
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'glass__filter');
    svg.setAttribute('aria-hidden', 'true');
    svg.innerHTML = `
      <defs>
        <filter id="${id}" color-interpolation-filters="sRGB" x="0%" y="0%" width="100%" height="100%">
          <feImage x="0" y="0" width="100%" height="100%" preserveAspectRatio="none" result="map"/>
          ${channel(o, o.redOffset, 'R')}
          ${channel(o, o.greenOffset, 'G')}
          ${channel(o, o.blueOffset, 'B')}
          <feBlend in="cR" in2="cG" mode="screen" result="rg"/>
          <feBlend in="rg" in2="cB" mode="screen" result="out"/>
          <feGaussianBlur in="out" stdDeviation="${o.displace}"/>
        </filter>
      </defs>`;
    el.prepend(svg);
    el.classList.add('glass--svg');
    el.style.setProperty('--glass-filter', `url(#${id})`);

    const img = svg.querySelector('feImage');
    const update = () => {
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) return;
      img.setAttribute('href', displacementMap(Math.round(r.width), Math.round(r.height), o, id));
    };
    new ResizeObserver(update).observe(el);
    update();
  };
})();
