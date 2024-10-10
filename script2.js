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
    const linterna = document.getElementById('linterna');
    
    // Mostrar la linterna y seguir el mouse (en escritorio)
    document.addEventListener('mousemove', (e) => {
        linterna.style.display = 'block';
        linterna.style.left = `${e.clientX - linterna.offsetWidth / 2}px`;
        linterna.style.top = `${e.clientY - linterna.offsetHeight / 2}px`;
    });

    // Para dispositivos táctiles: seguir el dedo (en móvil)
    document.addEventListener('touchmove', (e) => {
        const touch = e.touches[0];
        linterna.style.display = 'block';
        linterna.style.left = `${touch.clientX - linterna.offsetWidth / 2}px`;
        linterna.style.top = `${touch.clientY - linterna.offsetHeight / 2}px`;
        e.preventDefault(); // Evitar scroll
    });

    // Mostrar la linterna cuando el usuario toca la pantalla
    document.addEventListener('touchstart', (e) => {
        const touch = e.touches[0];
        linterna.style.display = 'block';
        linterna.style.left = `${touch.clientX - linterna.offsetWidth / 2}px`;
        linterna.style.top = `${touch.clientY - linterna.offsetHeight / 2}px`;
        e.preventDefault();
    });

});