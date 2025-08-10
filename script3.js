(function () {
  const cont = document.querySelector('.contenedor-principal');
  if (!cont) return;

  cont.style.position = 'absolute';
  cont.style.boxSizing = 'border-box';
  cont.style.transition = 'opacity 140ms linear';
  cont.style.opacity = '0';

  function extractBgUrl(str) {
    const m = /url\(["']?(.*?)["']?\)/.exec(str);
    return m ? m[1] : null;
  }
  const bodyStyle = getComputedStyle(document.body).backgroundImage;
  const bgUrl = extractBgUrl(bodyStyle) || 'img/computadora12.png';

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

  function getContRect() {
    return cont.getBoundingClientRect();
  }

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

  function imageRectToViewportRect(monitorRect, vw, vh, imgW, imgH) {
    const { scale, offsetX, offsetY } = coverScaleAndOffsets(vw, vh, imgW, imgH);
    const leftPx = monitorRect.left * scale - offsetX;
    const topPx = monitorRect.top * scale - offsetY;
    const widthPx = monitorRect.width * scale;
    const heightPx = monitorRect.height * scale;
    return { leftPx, topPx, widthPx, heightPx };
  }

  const STORAGE_KEY = 'monitorRect_calibrado_v1';
  function saveMonitorRect(mr) { localStorage.setItem(STORAGE_KEY, JSON.stringify(mr)); }
  function readMonitorRect() {
    const s = localStorage.getItem(STORAGE_KEY);
    return s ? JSON.parse(s) : null;
  }

  function applyViewportRect({ leftPx, topPx, widthPx, heightPx }) {
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const maxW = Math.max(widthPx, 50);
    const maxH = Math.max(heightPx, 50);

    cont.style.left = Math.round(leftPx) + 'px';
    cont.style.top = Math.round(topPx) + 'px';
    cont.style.width = Math.round(maxW) + 'px';
    cont.style.height = Math.round(maxH) + 'px';
    cont.style.opacity = '1';
  }

  loadImage(bgUrl).then(img => {
    const imgW = img.naturalWidth || img.width;
    const imgH = img.naturalHeight || img.height;

    let monitorRect = readMonitorRect();

    if (!monitorRect) {
      const rect = getContRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      monitorRect = viewportRectToImageRect(rect, vw, vh, imgW, imgH);

      monitorRect.left = Math.max(0, Math.round(monitorRect.left));
      monitorRect.top = Math.max(0, Math.round(monitorRect.top));
      monitorRect.width = Math.max(10, Math.round(monitorRect.width));
      monitorRect.height = Math.max(10, Math.round(monitorRect.height));

      saveMonitorRect(monitorRect);
      console.info('Monitor calibrado y guardado en localStorage:', monitorRect);
    } else {
      console.info('Usando monitorRect guardado:', monitorRect);
    }

    function posicionar() {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const vpRect = imageRectToViewportRect(monitorRect, vw, vh, imgW, imgH);

      applyViewportRect(vpRect);
    }

    let t = null;
    window.addEventListener('resize', () => {
      if (t) clearTimeout(t);
      t = setTimeout(() => { posicionar(); t = null; }, 70);
    });

    window.addEventListener('orientationchange', () => { setTimeout(posicionar, 120); });

    posicionar();
  }).catch(err => {
    console.error('No se pudo cargar la imagen de fondo para calibración:', err);
    cont.style.opacity = '1';
  });
})();