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

// script3.js - versión final: derivación desde tus medidas desktop + mobile percentages
(function () {
  'use strict';

  const cont = document.querySelector('.contenedor-principal');
  if (!cont) {
    console.info('Posicionador: .contenedor-principal no encontrado. Abortando.');
    return;
  }

  // controlar la caja
  cont.style.position = 'absolute';
  cont.style.boxSizing = 'border-box';
  cont.style.transition = 'opacity 140ms linear';
  cont.style.opacity = '0';

  // --- PARÁMETROS (ajustables) ---
  // valores que tú confirmaste (funcionaban en tu pantalla)
  const DESKTOP_CSS = {
    leftPercent: 0.25,   // left: 25% del viewport
    bottomPercent: 0.20, // bottom: 20% del viewport
    widthPx: 726,
    heightPx: 460
  };

  const MOBILE_RULE = { leftPct: 0.125, topPct: 0.125, widthPct: 0.75, heightPct: 0.75 }; // 12.5% / 75%
  const MIN_PX_WIDTH = 80;
  const MIN_PX_HEIGHT = 60;
  const RESIZE_DEBOUNCE_MS = 80;

  // referencia base que usamos para convertir porcentajes relativos a la imagen real
  const REF_IMG_W = 2048;
  const REF_IMG_H = 1152;

  // --- helpers ---
  function extractBgUrl(str) {
    if (!str) return null;
    const m = /url\(["']?(.*?)["']?\)/.exec(str);
    return m ? m[1] : null;
  }
  function toAbsolute(u) {
    try { return new URL(u, location.href).href; } catch (e) { return u; }
  }

  function loadImageInfo(url) {
    return new Promise((res, rej) => {
      const img = new Image();
      img.onload = () => res({ w: img.naturalWidth || img.width, h: img.naturalHeight || img.height });
      img.onerror = (e) => rej(e);
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

  // conversión inversa: rect en viewport -> rect en la imagen original (px)
  function viewportRectToImageRect(rectVp, vw, vh, imgW, imgH) {
    const { scale, offsetX, offsetY } = coverScaleAndOffsets(vw, vh, imgW, imgH);
    return {
      left: (rectVp.left + offsetX) / scale,
      top: (rectVp.top + offsetY) / scale,
      width: rectVp.width / scale,
      height: rectVp.height / scale
    };
  }

  // conversión directa: rect en imagen -> rect en viewport
  function imageRectToViewportRect(monitorRectImg, vw, vh, imgW, imgH) {
    const { scale, offsetX, offsetY } = coverScaleAndOffsets(vw, vh, imgW, imgH);
    return {
      leftPx: monitorRectImg.left * scale - offsetX,
      topPx: monitorRectImg.top * scale - offsetY,
      widthPx: monitorRectImg.width * scale,
      heightPx: monitorRectImg.height * scale
    };
  }

  function clampRect(vpRect, vw, vh) {
    let left = Math.round(vpRect.leftPx);
    let top = Math.round(vpRect.topPx);
    let width = Math.max(Math.round(vpRect.widthPx), MIN_PX_WIDTH);
    let height = Math.max(Math.round(vpRect.heightPx), MIN_PX_HEIGHT);

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

  // --- core ---
  let derivedMonitorRectOnImage = null; // almacenará el rect derivado de tu CSS baseline (en coords de la imagen)
  let lastBgAbs = null;
  let lastImgInfo = null;

  async function deriveMonitorRectFromCss(bgAbs) {
    // Deriva el rect en coordenadas de imagen usando la posición CSS fija que proporcionaste.
    try {
      const vw = window.innerWidth, vh = window.innerHeight;
      const imgInfo = lastImgInfo || await loadImageInfo(bgAbs);
      lastImgInfo = imgInfo;

      // calcular rect en viewport según tu CSS baseline (left:25%, bottom:20%, width: 726px, height:460px)
      const leftVp = Math.round(vw * DESKTOP_CSS.leftPercent);
      const widthVp = Math.round(DESKTOP_CSS.widthPx);
      const heightVp = Math.round(DESKTOP_CSS.heightPx);
      const topVp = Math.round(vh * (1 - DESKTOP_CSS.bottomPercent) - heightVp); // top = vh*(1-bottom) - height

      const rectVp = { left: leftVp, top: topVp, width: widthVp, height: heightVp };

      // convertir a coords sobre la imagen real
      const monitorImgRect = viewportRectToImageRect(rectVp, vw, vh, imgInfo.w, imgInfo.h);

      // limites mínimos y clamp dentro de la imagen
      monitorImgRect.left = Math.max(0, Math.round(monitorImgRect.left));
      monitorImgRect.top = Math.max(0, Math.round(monitorImgRect.top));
      monitorImgRect.width = Math.max(10, Math.round(monitorImgRect.width));
      monitorImgRect.height = Math.max(10, Math.round(monitorImgRect.height));

      return monitorImgRect;
    } catch (e) {
      console.error('Error derivando monitorRect desde CSS:', e);
      return null;
    }
  }

  async function updatePosition() {
    try {
      const bodyBg = getComputedStyle(document.body).backgroundImage;
      const raw = extractBgUrl(bodyBg);
      if (!raw) {
        // fallback centrado
        const vw = window.innerWidth, vh = window.innerHeight;
        applyRect(Math.max(0, Math.round((vw - 600) / 2)), Math.max(0, Math.round((vh - 400) / 2)), 600, 400);
        return;
      }
      const bgAbs = toAbsolute(raw);
      const vw = window.innerWidth, vh = window.innerHeight;
      const isSmallVp = vw <= 768;
      const isTelefono = /telefono1/i.test(bgAbs);
      const isComputadora = /computadora12/i.test(bgAbs);

      // MOBILE RULE (mantener el comportamiento que ya funciona)
      if (isTelefono || isSmallVp) {
        const left = Math.round(vw * MOBILE_RULE.leftPct);
        const top = Math.round(vh * MOBILE_RULE.topPct);
        const width = Math.round(vw * MOBILE_RULE.widthPct);
        const height = Math.round(vh * MOBILE_RULE.heightPct);
        const clampedLeft = Math.max(0, Math.min(left, vw - MIN_PX_WIDTH));
        const clampedTop = Math.max(0, Math.min(top, vh - MIN_PX_HEIGHT));
        const clampedWidth = Math.max(MIN_PX_WIDTH, Math.min(width, vw));
        const clampedHeight = Math.max(MIN_PX_HEIGHT, Math.min(height, vh));
        applyRect(clampedLeft, clampedTop, clampedWidth, clampedHeight);
        return;
      }

      // DESKTOP: derivar monitorRectOnImage (si no está calculado o cambió la imagen)
      if (!derivedMonitorRectOnImage || lastBgAbs !== bgAbs) {
        derivedMonitorRectOnImage = await deriveMonitorRectFromCss(bgAbs);
        lastBgAbs = bgAbs;
      }

      if (!derivedMonitorRectOnImage) {
        // fallback
        const leftF = Math.max(0, Math.round((vw - 600) / 2));
        const topF = Math.max(0, Math.round((vh - 400) / 2));
        applyRect(leftF, topF, 600, 400);
        return;
      }

      // cargar info imagen si no disponible
      if (!lastImgInfo || lastBgAbs !== bgAbs) {
        try {
          lastImgInfo = await loadImageInfo(bgAbs);
        } catch (e) {
          console.warn('No se pudo cargar imagen de fondo en desktop, fallback centrado.', e);
          const leftF = Math.max(0, Math.round((vw - 600) / 2));
          const topF = Math.max(0, Math.round((vh - 400) / 2));
          applyRect(leftF, topF, 600, 400);
          return;
        }
      }

      // mapear el rect derivado (en coords imagen) -> viewport actual
      const vpRect = imageRectToViewportRect(derivedMonitorRectOnImage, vw, vh, lastImgInfo.w, lastImgInfo.h);
      const clamped = clampRect(vpRect, vw, vh);
      applyRect(clamped.left, clamped.top, clamped.width, clamped.height);

    } catch (e) {
      console.error('Error en updatePosition:', e);
      cont.style.opacity = '1';
    }
  }

  // debounce resize
  let resizeTimer = null;
  function scheduleUpdate() {
    if (resizeTimer) clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { updatePosition(); resizeTimer = null; }, RESIZE_DEBOUNCE_MS);
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
