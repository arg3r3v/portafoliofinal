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

document.addEventListener('DOMContentLoaded', () => {
    const canvasContainer = document.querySelector('.canvas-container');
    
    let isDragging = false;
    let startX, startY, scrollLeft, scrollTop;
    let isClick = true;

    // Evento cuando presionas el mouse
    canvasContainer.addEventListener('mousedown', (e) => {
        isDragging = true;
        isClick = true; // Asumimos que es un clic al principio
        startX = e.pageX - canvasContainer.offsetLeft;
        startY = e.pageY - canvasContainer.offsetTop;
        scrollLeft = canvasContainer.scrollLeft;
        scrollTop = canvasContainer.scrollTop;
        canvasContainer.style.cursor = 'grabbing';
    });

    // Evento cuando mueves el mouse
    canvasContainer.addEventListener('mousemove', (e) => {
        if (!isDragging) return; // No hagas nada si no se está arrastrando
        const x = e.pageX - canvasContainer.offsetLeft;
        const y = e.pageY - canvasContainer.offsetTop;
        const walkX = (x - startX) * 1.5;
        const walkY = (y - startY) * 1.5;
        
        // Si el movimiento es significativo, se considera un arrastre
        if (Math.abs(walkX) > 5 || Math.abs(walkY) > 5) {
            isClick = false; // No es un clic si se ha arrastrado
        }

        canvasContainer.scrollLeft = scrollLeft - walkX;
        canvasContainer.scrollTop = scrollTop - walkY;
    });

    // Evento cuando sueltas el mouse
    canvasContainer.addEventListener('mouseup', () => {
        isDragging = false;
        canvasContainer.style.cursor = 'grab';
    });

    // Evento para detener el arrastre cuando el mouse sale del área
    canvasContainer.addEventListener('mouseleave', () => {
        isDragging = false;
        canvasContainer.style.cursor = 'grab';
    });

    // Soporte táctil para pantallas táctiles
    canvasContainer.addEventListener('touchstart', (e) => {
        isDragging = true;
        startX = e.touches[0].pageX - canvasContainer.offsetLeft;
        startY = e.touches[0].pageY - canvasContainer.offsetTop;
        scrollLeft = canvasContainer.scrollLeft;
        scrollTop = canvasContainer.scrollTop;
    });

    canvasContainer.addEventListener('touchmove', (e) => {
        if (!isDragging) return;
        const x = e.touches[0].pageX - canvasContainer.offsetLeft;
        const y = e.touches[0].pageY - canvasContainer.offsetTop;
        const walkX = (x - startX) * 1.5;
        const walkY = (y - startY) * 1.5;
        canvasContainer.scrollLeft = scrollLeft - walkX;
        canvasContainer.scrollTop = scrollTop - walkY;
    });

    canvasContainer.addEventListener('touchend', () => {
        isDragging = false;
    });

    // Permitir clic en botones u otros elementos
    canvasContainer.addEventListener('click', (e) => {
        if (!isClick) {
            e.preventDefault(); // Evita que el clic se registre si fue un arrastre
        }
    });
});

function vibrarTelefono() {
    const telefono = document.getElementById('telefono');
    telefono.classList.add('vibrando');
    setTimeout(() => {
      telefono.classList.remove('vibrando');
    }, 300);
  }

  setInterval(vibrarTelefono, 10000); // cada 10 segundos

