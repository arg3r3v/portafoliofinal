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

  const STORAGE_PREFIX = 'monitorRect_v2::';
  const MIN_VISIBLE_RATIO = 0.6; // porcentaje de área visible mínimo para considerar buena la colocación (0..1)
  const MIN_PX_WIDTH = 100; // tamaño mínimo razonable para el contenedor
  const MIN_PX_HEIGHT = 80;
  const RESIZE_DEBOUNCE_MS = 80;

  function extractBgUrl(str) {
    if (!str) return null;
    const m = /url\(["']?(.*?)["']?\)/.exec(str);
    return m ? m[1] : null;
  }

  function toAbsoluteUrl(url) {
    try {
      return new URL(url, location.href).href;
    } catch (e) {
      return url;
    }
  }

  function storageKey(imgUrl, bucket, dpr) {
    const safe = encodeURIComponent(imgUrl);
    return `${STORAGE_PREFIX}${safe}::${bucket}::dpr${Math.round(dpr || 1)}`;
  }

  function saveMonitorRect(key, rect) {
    localStorage.setItem(key, JSON.stringify(rect));
  }

  function readMonitorRect(key) {
    const s = localStorage.getItem(key);
    return s ? JSON.parse(s) : null;
  }

  function clearMonitorRectForKey(key) {
    localStorage.removeItem(key);
  }

  function coverScaleAndOffsets(vw, vh, imgW, imgH) {
    const scale = Math.max(vw / imgW, vh / imgH);
    const scaledW = imgW * scale;
    const scaledH = imgH * scale;
    const offsetX = (scaledW - vw) / 2;
    const offsetY = (scaledH - vh) / 2;
    return { scale, offsetX, offsetY, scaledW, scaledH };
  }

  function viewportRectToImageRect(rect, vw, vh, imgW, imgH) {
    const { scale, offsetX, offsetY } = coverScaleAndOffsets(vw, vh, imgW, imgH);
    return {
      left: (rect.left + offsetX) / scale,
      top: (rect.top + offsetY) / scale,
      width: rect.width / scale,
      height: rect.height / scale
    };
  }

  function imageRectToViewportRect(monitorRect, vw, vh, imgW, imgH) {
    const { scale, offsetX, offsetY } = coverScaleAndOffsets(vw, vh, imgW, imgH);
    return {
      leftPx: monitorRect.left * scale - offsetX,
      topPx: monitorRect.top * scale - offsetY,
      widthPx: monitorRect.width * scale,
      heightPx: monitorRect.height * scale
    };
  }

  function rectArea(r) {
    return Math.max(0, r.width * r.height);
  }

  function intersectionArea(rectA, rectB) {
    const x1 = Math.max(rectA.left, rectB.left);
    const y1 = Math.max(rectA.top, rectB.top);
    const x2 = Math.min(rectA.left + rectA.width, rectB.left + rectB.width);
    const y2 = Math.min(rectA.top + rectA.height, rectB.top + rectB.height);
    if (x2 <= x1 || y2 <= y1) return 0;
    return (x2 - x1) * (y2 - y1);
  }

  function isPlacementGood(vpRect) {
    // Si rect dimensions muy pequeñas => malo
    if (vpRect.widthPx < MIN_PX_WIDTH || vpRect.heightPx < MIN_PX_HEIGHT) return false;

    // calcular área visible dentro del viewport
    const r = { left: vpRect.leftPx, top: vpRect.topPx, width: vpRect.widthPx, height: vpRect.heightPx };
    const vp = { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };
    const inter = intersectionArea(r, vp);
    const area = Math.max(1, r.width * r.height);
    const ratio = inter / area;
    return ratio >= MIN_VISIBLE_RATIO;
  }

  function applyViewportRect(cont, vpRect) {
    const maxW = Math.max(Math.round(vpRect.widthPx), MIN_PX_WIDTH);
    const maxH = Math.max(Math.round(vpRect.heightPx), MIN_PX_HEIGHT);
    cont.style.left = Math.round(vpRect.leftPx) + 'px';
    cont.style.top = Math.round(vpRect.topPx) + 'px';
    cont.style.width = maxW + 'px';
    cont.style.height = maxH + 'px';
    cont.style.opacity = '1';
  }

  function initPositioning() {
    const cont = document.querySelector('.contenedor-principal');
    if (!cont) {
      console.info('Posicionador: .contenedor-principal no existe. Abortando.');
      return;
    }

    cont.style.position = 'absolute';
    cont.style.boxSizing = 'border-box';
    cont.style.transition = 'opacity 140ms linear';
    cont.style.opacity = '0';

    let currentBg = null;
    let currentKey = null;
    let currentImgW = 0;
    let currentImgH = 0;
    let lastLoadUrl = null;

    async function loadBgImage(imgUrl) {
      // cache fast-path
      if (lastLoadUrl === imgUrl && currentImgW && currentImgH) return { width: currentImgW, height: currentImgH };

      return new Promise((res, rej) => {
        const img = new Image();
        img.onload = function () {
          lastLoadUrl = imgUrl;
          currentImgW = img.naturalWidth || img.width;
          currentImgH = img.naturalHeight || img.height;
          res({ width: currentImgW, height: currentImgH });
        };
        img.onerror = function (e) { rej(e); };
        img.src = imgUrl;
      });
    }

    function getBucket() {
      const w = window.innerWidth;
      return w <= 768 ? 'mobile' : 'desktop';
    }

    async function updateForCurrentBg() {
      // extraer fondo actual
      const bodyStyle = getComputedStyle(document.body).backgroundImage;
      const raw = extractBgUrl(bodyStyle);
      if (!raw) {
        console.warn('Posicionador: body no tiene background-image detectado.');
        cont.style.opacity = '1';
        return;
      }
      const abs = toAbsoluteUrl(raw);
      const bucket = getBucket();
      const dpr = window.devicePixelRatio || 1;
      const key = storageKey(abs, bucket, dpr);

      currentBg = abs;
      currentKey = key;

      // cargar imagen
      let imgInfo;
      try {
        imgInfo = await loadBgImage(abs);
      } catch (e) {
        console.error('Posicionador: no se pudo cargar imagen de fondo', abs, e);
        cont.style.opacity = '1';
        return;
      }

      const imgW = imgInfo.width;
      const imgH = imgInfo.height;

      // intentar leer calibración
      let monitorRect = readMonitorRect(key);

      if (monitorRect) {
        // convertir a viewport y validar
        const vpRect = imageRectToViewportRect(monitorRect, window.innerWidth, window.innerHeight, imgW, imgH);
        if (isPlacementGood(vpRect)) {
          console.info('Posicionador: usando calibración guardada para', abs, bucket);
          applyViewportRect(cont, vpRect);
          return;
        } else {
          console.warn('Posicionador: calibración encontrada pero resulta inválida para este viewport. Intentando recalibrar automático si es posible.');
          // intentar recalibrar automáticamente si el contenedor actual es visible y razonable
          const currentRect = cont.getBoundingClientRect();
          const visibleArea = intersectionArea(currentRect, { left:0, top:0, width: window.innerWidth, height: window.innerHeight });
          const visRatio = visibleArea / Math.max(1, rectArea(currentRect));
          if (visRatio > 0.3 && currentRect.width > 30 && currentRect.height > 30) {
            // usamos el rect actual como calibración y la guardamos
            const newMon = viewportRectToImageRect(currentRect, window.innerWidth, window.innerHeight, imgW, imgH);
            newMon.left = Math.max(0, Math.round(newMon.left));
            newMon.top = Math.max(0, Math.round(newMon.top));
            newMon.width = Math.max(10, Math.round(newMon.width));
            newMon.height = Math.max(10, Math.round(newMon.height));
            saveMonitorRect(key, newMon);
            console.info('Posicionador: recalibración automática guardada para', abs, key, newMon);
            const vpRect2 = imageRectToViewportRect(newMon, window.innerWidth, window.innerHeight, imgW, imgH);
            applyViewportRect(cont, vpRect2);
            return;
          } else {
            // fallback: centramos el contenedor en la parte visible de la imagen (no guardamos)
            console.warn('Posicionador: fallback centrar (no guardado).');
            const centerLeft = Math.max(20, Math.round((window.innerWidth - 600) / 2)); // heurística
            const centerTop = Math.max(60, Math.round((window.innerHeight - 400) / 2));
            cont.style.left = centerLeft + 'px';
            cont.style.top = centerTop + 'px';
            cont.style.width = '600px';
            cont.style.height = '400px';
            cont.style.opacity = '1';
            return;
          }
        }
      } else {
        // No hay calibración previa => calibrar usando el rect actual y guardar
        const rect = cont.getBoundingClientRect();
        // si el contenedor está fuera de viewport o invisible, no guardamos: mostramos fallback
        const visibleArea = intersectionArea(rect, { left:0, top:0, width: window.innerWidth, height: window.innerHeight });
        const visRatio = visibleArea / Math.max(1, rectArea(rect));
        if (visRatio < 0.1 || rect.width < 30 || rect.height < 30) {
          console.warn('Posicionador: no se encontró calibración y contenedor actual no es visible/útil. Usando fallback centrar (no guardado).');
          const centerLeft = Math.max(20, Math.round((window.innerWidth - 600) / 2));
          const centerTop = Math.max(60, Math.round((window.innerHeight - 400) / 2));
          cont.style.left = centerLeft + 'px';
          cont.style.top = centerTop + 'px';
          cont.style.width = '600px';
          cont.style.height = '400px';
          cont.style.opacity = '1';
          return;
        }
        const monitor = viewportRectToImageRect(rect, window.innerWidth, window.innerHeight, imgW, imgH);
        monitor.left = Math.max(0, Math.round(monitor.left));
        monitor.top = Math.max(0, Math.round(monitor.top));
        monitor.width = Math.max(10, Math.round(monitor.width));
        monitor.height = Math.max(10, Math.round(monitor.height));
        saveMonitorRect(key, monitor);
        console.info('Posicionador: calibración guardada para', abs, key, monitor);
        const vpRect = imageRectToViewportRect(monitor, window.innerWidth, window.innerHeight, imgW, imgH);
        applyViewportRect(cont, vpRect);
        return;
      }
    } // end updateForCurrentBg

    // Debounced resize handler that also detects background-image change (media queries)
    let resizeTimer = null;
    async function onResize() {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(async () => {
        try {
          await updateForCurrentBg();
        } catch (e) {
          console.error('Posicionador: error en resize handler', e);
          cont.style.opacity = '1';
        } finally {
          resizeTimer = null;
        }
      }, RESIZE_DEBOUNCE_MS);
    }

    // Public functions for manual control
    window.clearMonitorCalibration = function (imgUrl) {
      try {
        const bodyStyle = getComputedStyle(document.body).backgroundImage;
        const raw = extractBgUrl(bodyStyle);
        const abs = imgUrl ? toAbsoluteUrl(imgUrl) : toAbsoluteUrl(raw || '');
        if (!abs) { console.warn('clearMonitorCalibration: no se pudo resolver imagen'); return; }
        const bucket = getBucket();
        const key = storageKey(abs, bucket, window.devicePixelRatio || 1);
        clearMonitorRectForKey(key);
        console.info('clearMonitorCalibration: borrada calibración para key', key);
      } catch (e) { console.error(e); }
    };

    window.recalibrateMonitor = async function (forceImgUrl) {
      try {
        const bodyStyle = getComputedStyle(document.body).backgroundImage;
        const raw = extractBgUrl(bodyStyle);
        const abs = forceImgUrl ? toAbsoluteUrl(forceImgUrl) : toAbsoluteUrl(raw || '');
        if (!abs) { console.warn('recalibrateMonitor: no se pudo resolver imagen'); return; }
        const bucket = getBucket();
        const key = storageKey(abs, bucket, window.devicePixelRatio || 1);
        const imgInfo = await loadBgImage(abs);
        const rect = cont.getBoundingClientRect();
        const monitor = viewportRectToImageRect(rect, window.innerWidth, window.innerHeight, imgInfo.width, imgInfo.height);
        monitor.left = Math.max(0, Math.round(monitor.left));
        monitor.top = Math.max(0, Math.round(monitor.top));
        monitor.width = Math.max(10, Math.round(monitor.width));
        monitor.height = Math.max(10, Math.round(monitor.height));
        saveMonitorRect(key, monitor);
        console.info('recalibrateMonitor: recalibración guardada para', key, monitor);
        // aplicar inmediatamente
        const vpRect = imageRectToViewportRect(monitor, window.innerWidth, window.innerHeight, imgInfo.width, imgInfo.height);
        applyViewportRect(cont, vpRect);
      } catch (e) {
        console.error('recalibrateMonitor error', e);
      }
    };

    // Init
    updateForCurrentBg();

    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', () => setTimeout(onResize, 120));
  } // end initPositioning

  // Run when DOM ready (supports defer)
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    initPositioning();
  } else {
    document.addEventListener('DOMContentLoaded', initPositioning);
  }
})();
