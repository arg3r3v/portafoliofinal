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

(function () {
  'use strict';

  const cont = document.querySelector('.contenedor-principal');
  if (!cont) {
    console.info('Posicionador: .contenedor-principal no existe. Abortando.');
    return;
  }

  // forzar control por el script
  cont.style.position = 'absolute';
  cont.style.boxSizing = 'border-box';
  cont.style.transition = 'opacity 140ms linear';
  cont.style.opacity = '0';

  // --- constantes (ajustables) ---
  const DESKTOP_MONITOR_RECT = { left: 540, top: 210, width: 968, height: 640 }; // en px sobre imagen 2048x1152
  const MIN_PX_WIDTH = 80;
  const MIN_PX_HEIGHT = 60;
  const RESIZE_DEBOUNCE_MS = 80;

  // --- helpers ---
  function extractBgUrl(str) {
    if (!str) return null;
    const m = /url\(["']?(.*?)["']?\)/.exec(str);
    return m ? m[1] : null;
  }
  function toAbsoluteUrl(url) {
    try { return new URL(url, location.href).href; } catch (e) { return url; }
  }

  function loadImage(url) {
    return new Promise((res, rej) => {
      const img = new Image();
      img.onload = () => res({ width: img.naturalWidth || img.width, height: img.naturalHeight || img.height });
      img.onerror = rej;
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

  function imageRectToViewportRect(monitorRect, vw, vh, imgW, imgH) {
    const { scale, offsetX, offsetY } = coverScaleAndOffsets(vw, vh, imgW, imgH);
    const leftPx = monitorRect.left * scale - offsetX;
    const topPx = monitorRect.top * scale - offsetY;
    const widthPx = monitorRect.width * scale;
    const heightPx = monitorRect.height * scale;
    return { leftPx, topPx, widthPx, heightPx };
  }

  function clampRectToViewport(rect, vw, vh) {
    // Asegura que el rect tenga tamaño mínimo y quede dentro del viewport en lo posible
    let left = Math.round(rect.leftPx);
    let top = Math.round(rect.topPx);
    let width = Math.max(Math.round(rect.widthPx), MIN_PX_WIDTH);
    let height = Math.max(Math.round(rect.heightPx), MIN_PX_HEIGHT);

    // si se sale a la derecha/abajo, tratar de ajustarlo
    if (left + width > vw) left = Math.max(0, vw - width);
    if (top + height > vh) top = Math.max(0, vh - height);

    // si queda con coordenadas negativas, llevar a 0
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

  async function updatePosition() {
    try {
      const bodyStyle = getComputedStyle(document.body).backgroundImage;
      const raw = extractBgUrl(bodyStyle);
      if (!raw) {
        console.warn('Posicionador: No se detectó background-image en body.');
        // fallback centrado
        const vw = window.innerWidth, vh = window.innerHeight;
        applyRect(Math.max(0, Math.round((vw - 600) / 2)), Math.max(0, Math.round((vh - 400) / 2)), 600, 400);
        return;
      }
      const bgAbs = toAbsoluteUrl(raw);
      const vw = window.innerWidth, vh = window.innerHeight;

      // ruta simple para móvil: si el viewport es pequeño o si la imagen es telefono1
      const isMobileViewport = vw <= 768;
      const isTelefonoImg = /telefono1/i.test(bgAbs);
      const isComputadoraImg = /computadora12/i.test(bgAbs);

      if (isComputadoraImg && !isMobileViewport) {
        // desktop: usar rect medido y la imagen real para mapear
        let imgInfo;
        try {
          imgInfo = await loadImage(bgAbs);
        } catch (e) {
          console.warn('Posicionador: no se pudo cargar imagen de fondo (desktop). Usando fallback centrado.', e);
          const leftF = Math.max(0, Math.round((vw - 600) / 2));
          const topF = Math.max(0, Math.round((vh - 400) / 2));
          applyRect(leftF, topF, 600, 400);
          return;
        }
        const vpRect = imageRectToViewportRect(DESKTOP_MONITOR_RECT, vw, vh, imgInfo.width, imgInfo.height);
        const clamped = clampRectToViewport(vpRect, vw, vh);
        applyRect(clamped.left, clamped.top, clamped.width, clamped.height);
        return;
      }

      // mobile (telefono1 OR small viewport) -> aplicar porcentajes (coincide con tu media query)
      if (isTelefonoImg || isMobileViewport) {
        const left = Math.round(vw * 0.125);    // 12.5%
        const top = Math.round(vh * 0.125);     // 12.5%
        const width = Math.round(vw * 0.75);    // 75%
        const height = Math.round(vh * 0.75);   // 75%
        // clamp por si acaso
        const clampedLeft = Math.max(0, Math.min(left, vw - MIN_PX_WIDTH));
        const clampedTop = Math.max(0, Math.min(top, vh - MIN_PX_HEIGHT));
        const clampedWidth = Math.max(MIN_PX_WIDTH, Math.min(width, vw));
        const clampedHeight = Math.max(MIN_PX_HEIGHT, Math.min(height, vh));
        applyRect(clampedLeft, clampedTop, clampedWidth, clampedHeight);
        return;
      }

      // fallback genérico: si no coincide con patrones, intentar usar desktop rect mapping (por compatibilidad)
      try {
        const imgInfo = await loadImage(bgAbs);
        const vpRect = imageRectToViewportRect(DESKTOP_MONITOR_RECT, vw, vh, imgInfo.width, imgInfo.height);
        const clamped = clampRectToViewport(vpRect, vw, vh);
        applyRect(clamped.left, clamped.top, clamped.width, clamped.height);
      } catch (e) {
        // ultimate fallback
        const leftF = Math.max(0, Math.round((vw - 600) / 2));
        const topF = Math.max(0, Math.round((vh - 400) / 2));
        applyRect(leftF, topF, 600, 400);
      }
    } catch (e) {
      console.error('Posicionador: error inesperado', e);
      cont.style.opacity = '1';
    }
  }

  // Debounce resize
  let resizeTimer = null;
  function scheduleUpdate() {
    if (resizeTimer) clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { updatePosition(); resizeTimer = null; }, RESIZE_DEBOUNCE_MS);
  }

  window.addEventListener('load', updatePosition);
  window.addEventListener('resize', scheduleUpdate);
  window.addEventListener('orientationchange', () => setTimeout(updatePosition, 120));

  // Ejecutar inmediatamente si DOM ya está listo
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    updatePosition();
  } else {
    document.addEventListener('DOMContentLoaded', updatePosition);
  }

})();
