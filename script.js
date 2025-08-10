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

// script.js — Auto-calibración + posicionamiento para background-size: cover
(function () {
  const cont = document.querySelector('.contenedor-principal');
  if (!cont) return;

  // Make sure script controls position
  cont.style.position = 'absolute';
  cont.style.boxSizing = 'border-box';
  cont.style.transition = 'opacity 140ms linear';
  cont.style.opacity = '0'; // ocultar hasta posicionar

  // Extraer URL del background-image del body (asume: url("img/computadora12.png"))
  function extractBgUrl(str) {
    const m = /url\(["']?(.*?)["']?\)/.exec(str);
    return m ? m[1] : null;
  }
  const bodyStyle = getComputedStyle(document.body).backgroundImage;
  const bgUrl = extractBgUrl(bodyStyle) || 'img/computadora12.png';

  // Cargar imagen para conocer naturalWidth/naturalHeight
  function loadImage(url) {
    return new Promise((res, rej) => {
      const img = new Image();
      img.onload = () => res(img);
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

  // Obtener rect actual del contenedor en viewport
  function getContRect() {
    return cont.getBoundingClientRect();
  }

  // Convierte viewport rect -> coordenadas en la imagen original (px)
  function viewportRectToImageRect(rect, vw, vh, imgW, imgH) {
    const { scale, offsetX, offsetY } = coverScaleAndOffsets(vw, vh, imgW, imgH);
    const imgLeft = (rect.left + offsetX) / scale;
    const imgTop = (rect.top + offsetY) / scale;
    const imgWpx = rect.width / scale;
    const imgHpx = rect.height / scale;
    return {
      left: imgLeft,
      top: imgTop,
      width: imgWpx,
      height: imgHpx
    };
  }

  // Convierte coordenadas en imagen -> rect en viewport (px) (útil en cada resize)
  function imageRectToViewportRect(monitorRect, vw, vh, imgW, imgH) {
    const { scale, offsetX, offsetY } = coverScaleAndOffsets(vw, vh, imgW, imgH);
    const leftPx = monitorRect.left * scale - offsetX;
    const topPx = monitorRect.top * scale - offsetY;
    const widthPx = monitorRect.width * scale;
    const heightPx = monitorRect.height * scale;
    return { leftPx, topPx, widthPx, heightPx };
  }

  // Guardar / leer monitorRect en localStorage
  const STORAGE_KEY = 'monitorRect_calibrado_v1';
  function saveMonitorRect(mr) { localStorage.setItem(STORAGE_KEY, JSON.stringify(mr)); }
  function readMonitorRect() {
    const s = localStorage.getItem(STORAGE_KEY);
    return s ? JSON.parse(s) : null;
  }

  // Aplicar rect al contenedor (en px)
  function applyViewportRect({ leftPx, topPx, widthPx, heightPx }) {
    // clamp para que no quede fuera del viewport totalmente
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Si el contenedor supera viewport pequeño, ajustamos máximo (opcional)
    const maxW = Math.max(widthPx, 50);
    const maxH = Math.max(heightPx, 50);

    cont.style.left = Math.round(leftPx) + 'px';
    cont.style.top = Math.round(topPx) + 'px';
    cont.style.width = Math.round(maxW) + 'px';
    cont.style.height = Math.round(maxH) + 'px';
    cont.style.opacity = '1';
  }

  // Main: cargar imagen, calibrar si necesario, y posicionar en resize
  loadImage(bgUrl).then(img => {
    const imgW = img.naturalWidth || img.width;
    const imgH = img.naturalHeight || img.height;

    let monitorRect = readMonitorRect();

    // Si no existe calibración guardada, se calibra con la posición actual del contenedor.
    if (!monitorRect) {
      const rect = getContRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      monitorRect = viewportRectToImageRect(rect, vw, vh, imgW, imgH);

      // Opcional: redondear y validar
      monitorRect.left = Math.max(0, Math.round(monitorRect.left));
      monitorRect.top = Math.max(0, Math.round(monitorRect.top));
      monitorRect.width = Math.max(10, Math.round(monitorRect.width));
      monitorRect.height = Math.max(10, Math.round(monitorRect.height));

      saveMonitorRect(monitorRect);
      console.info('Monitor calibrado y guardado en localStorage:', monitorRect);
    } else {
      console.info('Usando monitorRect guardado:', monitorRect);
    }

    // Posicionar función que se llama en resize
    function posicionar() {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const vpRect = imageRectToViewportRect(monitorRect, vw, vh, imgW, imgH);

      // Si el contenedor sale totalmente fuera, podemos centrarlo o limitarlo (opcional)
      applyViewportRect(vpRect);
    }

    // Debounce de resize
    let t = null;
    window.addEventListener('resize', () => {
      if (t) clearTimeout(t);
      t = setTimeout(() => { posicionar(); t = null; }, 70);
    });

    window.addEventListener('orientationchange', () => { setTimeout(posicionar, 120); });

    // Primera posición
    posicionar();
  }).catch(err => {
    console.error('No se pudo cargar la imagen de fondo para calibración:', err);
    // Si falla, hacemos una posición por defecto que no interfiera
    cont.style.opacity = '1';
  });
})();
