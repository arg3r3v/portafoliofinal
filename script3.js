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
  // Parámetros de la imagen original y la región del monitor (px)
  const imgWidth = 2048;
  const imgHeight = 1152;

  // Rectángulo del monitor en la imagen original (valores medidos)
  const monitor = {
    left: 540,
    top: 210,
    width: 968,
    height: 640
  };

  const cont = document.getElementById('contenedorPrincipal');

  // Evitar parpadeo: ocultar hasta posicionar
  cont.style.opacity = '0';
  cont.style.transition = 'opacity 160ms linear';

  function posicionarContenedor() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // scale usado por background-size: cover
    const scale = Math.max(vw / imgWidth, vh / imgHeight);

    const scaledW = imgWidth * scale;
    const scaledH = imgHeight * scale;

    // offsets (la parte recortada a cada lado, por centrar)
    const offsetX = (scaledW - vw) / 2;
    const offsetY = (scaledH - vh) / 2;

    // Coordenadas en viewport (px)
    const leftPx = Math.round(monitor.left * scale - offsetX);
    const topPx = Math.round(monitor.top * scale - offsetY);
    const widthPx = Math.round(monitor.width * scale);
    const heightPx = Math.round(monitor.height * scale);

    // Aplicar estilos
    cont.style.position = 'absolute';
    cont.style.left = leftPx + 'px';
    cont.style.top = topPx + 'px';
    cont.style.width = widthPx + 'px';
    cont.style.height = heightPx + 'px';

    // Mantén box-sizing para que padding no rompa la caja
    cont.style.boxSizing = 'border-box';
    cont.style.overflow = 'auto';

    // Hacer visible cuando ya esté posicionado
    cont.style.opacity = '1';
  }

  // Debounce simple para resize
  let resizeTimer = null;
  function onResizeDebounced() {
    if (resizeTimer) clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      posicionarContenedor();
      resizeTimer = null;
    }, 80);
  }

  // Ejecutar al inicio y en resize
  window.addEventListener('load', posicionarContenedor);
  window.addEventListener('resize', onResizeDebounced);

  // Si usas cambios en orientation, también escuchar
  window.addEventListener('orientationchange', onResizeDebounced);

  // Primera posición inmediata (caso carga rápida)
  posicionarContenedor();
})();