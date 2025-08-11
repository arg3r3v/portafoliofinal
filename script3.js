document.addEventListener('DOMContentLoaded', () => {
    const menuButton = document.getElementById('menu-button');
    const fullscreenMenu = document.getElementById('fullscreen-menu');
    const overlay = document.getElementById('overlay');

    menuButton.addEventListener('click', () => {
        fullscreenMenu.classList.toggle('open');
        overlay.style.display = overlay.style.display === 'block' ? 'none' : 'block';
    });

    overlay.addEventListener('click', () => {
        fullscreenMenu.classList.remove('open');
        overlay.style.display = 'none';
    });

});

// script3.js - Posicionador por imagen (desktop / mobile)
// - Desktop: usa rect medido del monitor (referencia 2048x1152) y lo mapea con 'cover'.
// - Mobile: usa porcentajes (12.5% / 75%) como en tu CSS.
// - No usa localStorage. Recalcula en load/resize/orientationchange.

(function () {
  'use strict';

  const cont = document.querySelector('.contenedor-principal');
  if (!cont) {
    console.info('Posicionador: .contenedor-principal no encontrado. Abortando.');
    return;
  }

  // Controlamos la caja con el script
  cont.style.position = 'absolute';
  cont.style.boxSizing = 'border-box';
  cont.style.transition = 'opacity 140ms linear';
  cont.style.opacity = '0';

  // ---------------- configuración (valores medidos)
  // Rect del monitor medido sobre la imagen referencial 2048x1152
  const REF_IMG_W = 2048;
  const REF_IMG_H = 1152;
  const REF_MONITOR = { left: 540, top: 210, width: 968, height: 640 };

  // mínimos y debounce
  const MIN_PX_WIDTH = 80;
  const MIN_PX_HEIGHT = 60;
  const RESIZE_DEBOUNCE_MS = 80;

  // ---------------- helpers
  function extractBgUrl(str) {
    if (!str) return null;
    const m = /url\(["']?(.*?)["']?\)/.exec(str);
    return m ? m[1] : null;
  }

  function toAbsolute(url) {
    try { return new URL(url, location.href).href; } catch (e) { return url; }
  }

  function loadImageInfo(url) {
    return new Promise((res, rej) => {
      const img = new Image();
      img.onload = () => res({ w: img.naturalWidth || img.width, h: img.naturalHeight || img.height });
      img.onerror = () => rej(new Error('No se pudo cargar imagen: ' + url));
      img.src = url;
    });
  }

  function coverScaleAndOffsets(vw, vh, imgW, imgH) {
    const scale = Math.max(vw / imgW, vh / imgH);
    const scaledW = imgW * scale;
    const scaledH = imgH * scale;
    const offsetX = (scaledW - vw) / 2;
    const offsetY = (scaledH - vh) / 2;
    return { scale, offsetX, offsetY, scaledW, scaledH };
  }

  // Convierte rect (en px sobre la imagen actual) -> viewport (px)
  function imageRectToViewport(monitorRectOnImage, vw, vh, imgW, imgH) {
    const { scale, offsetX, offsetY } = coverScaleAndOffsets(vw, vh, imgW, imgH);
    return {
      leftPx: monitorRectOnImage.left * scale - offsetX,
      topPx: monitorRectOnImage.top * scale - offsetY,
      widthPx: monitorRectOnImage.width * scale,
      heightPx: monitorRectOnImage.height * scale
    };
  }

  function clampRect(rect, vw, vh) {
    let left = Math.round(rect.leftPx);
    let top = Math.round(rect.topPx);
    let width = Math.max(Math.round(rect.widthPx), MIN_PX_WIDTH);
    let height = Math.max(Math.round(rect.heightPx), MIN_PX_HEIGHT);

    if (left + width > vw) left = Math.max(0, vw - width);
    if (top + height > vh) top = Math.max(0, vh - height);
    left = Math.max(0, left);
    top = Math.max(0, top);

    return { left, top, width, height };
  }

  function applyRect(left, top, width, height) {
    cont.style.left = left + 'px';
    cont.style.top = top + 'px';
    cont.style.width = width + 'px';
    cont.style.height = height + 'px';
    cont.style.opacity = '1';
  }

  // ---------------- lógica principal
  async function updatePosition() {
    try {
      const bodyBg = getComputedStyle(document.body).backgroundImage;
      const raw = extractBgUrl(bodyBg);
      if (!raw) {
        console.warn('Posicionador: no se detectó background-image en body. Usando fallback centrado.');
        const vw = window.innerWidth, vh = window.innerHeight;
        applyRect(Math.max(0, Math.round((vw - 600) / 2)), Math.max(0, Math.round((vh - 400) / 2)), 600, 400);
        return;
      }
      const bgAbs = toAbsolute(raw);
      const vw = window.innerWidth, vh = window.innerHeight;
      const isSmallVp = vw <= 768;
      const isTelefono = /telefono1/i.test(bgAbs);
      const isComputadora = /computadora12/i.test(bgAbs);

      // 1) Mobile rule - respeta tus porcentajes y media query
      if (isTelefono || isSmallVp) {
        const left = Math.round(vw * 0.125); // 12.5%
        const top = Math.round(vh * 0.125);  // 12.5%
        const width = Math.round(vw * 0.75); // 75%
        const height = Math.round(vh * 0.75); // 75%
        const clampedLeft = Math.max(0, Math.min(left, vw - MIN_PX_WIDTH));
        const clampedTop = Math.max(0, Math.min(top, vh - MIN_PX_HEIGHT));
        const clampedWidth = Math.max(MIN_PX_WIDTH, Math.min(width, vw));
        const clampedHeight = Math.max(MIN_PX_HEIGHT, Math.min(height, vh));
        applyRect(clampedLeft, clampedTop, clampedWidth, clampedHeight);
        return;
      }

      // 2) Desktop / default for computadora12: map the reference rect using actual image size
      if (isComputadora) {
        let imgInfo;
        try {
          imgInfo = await loadImageInfo(bgAbs);
        } catch (e) {
          console.warn('Posicionador: fallo al cargar imagen desktop. Fallback centrado.', e);
          const leftF = Math.max(0, Math.round((vw - 600) / 2));
          const topF = Math.max(0, Math.round((vh - 400) / 2));
          applyRect(leftF, topF, 600, 400);
          return;
        }

        // calcular monitorRect sobre la imagen real (escalando desde la referencia)
        const leftPct = REF_MONITOR.left / REF_IMG_W;
        const topPct = REF_MONITOR.top / REF_IMG_H;
        const widthPct = REF_MONITOR.width / REF_IMG_W;
        const heightPct = REF_MONITOR.height / REF_IMG_H;

        const monitorOnImage = {
          left: leftPct * imgInfo.w,
          top: topPct * imgInfo.h,
          width: widthPct * imgInfo.w,
          height: heightPct * imgInfo.h
        };

        const vpRect = imageRectToViewport(monitorOnImage, vw, vh, imgInfo.w, imgInfo.h);
        const clamped = clampRect(vpRect, vw, vh);
        applyRect(clamped.left, clamped.top, clamped.width, clamped.height);
        return;
      }

      // 3) If it's another background, attempt desktop mapping as a best-effort
      try {
        const imgInfo = await loadImageInfo(bgAbs);
        const leftPct = REF_MONITOR.left / REF_IMG_W;
        const topPct = REF_MONITOR.top / REF_IMG_H;
        const widthPct = REF_MONITOR.width / REF_IMG_W;
        const heightPct = REF_MONITOR.height / REF_IMG_H;

        const monitorOnImage = {
          left: leftPct * imgInfo.w,
          top: topPct * imgInfo.h,
          width: widthPct * imgInfo.w,
          height: heightPct * imgInfo.h
        };
        const vpRect = imageRectToViewport(monitorOnImage, vw, vh, imgInfo.w, imgInfo.h);
        const clamped = clampRect(vpRect, vw, vh);
        applyRect(clamped.left, clamped.top, clamped.width, clamped.height);
      } catch (e) {
        const leftF = Math.max(0, Math.round((vw - 600) / 2));
        const topF = Math.max(0, Math.round((vh - 400) / 2));
        applyRect(leftF, topF, 600, 400);
      }

    } catch (e) {
      console.error('Posicionador: error inesperado', e);
      cont.style.opacity = '1';
    }
  }

  // debounce resize
  let t = null;
  function scheduleUpdate() {
    if (t) clearTimeout(t);
    t = setTimeout(() => { updatePosition(); t = null; }, RESIZE_DEBOUNCE_MS);
  }

  window.addEventListener('load', updatePosition);
  window.addEventListener('resize', scheduleUpdate);
  window.addEventListener('orientationchange', () => setTimeout(updatePosition, 120));
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    updatePosition();
  } else {
    document.addEventListener('DOMContentLoaded', updatePosition);
  }

})();
