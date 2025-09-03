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

  // Detecta si es móvil o escritorio
  const isMobile = AFRAME.utils.device.isMobile();
  
  if (isMobile) {
    document.querySelector("#greenLamp-mobile").setAttribute("visible", "true");
  } else {
    document.querySelector("#greenLamp-desktop").setAttribute("visible", "true");
  }
