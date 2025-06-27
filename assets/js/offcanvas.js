// assets/js/offcanvas.js
document.addEventListener('DOMContentLoaded', function() {
  const btn     = document.getElementById('menu-toggle');
  const menu    = document.getElementById('offcanvas-menu');
  const overlay = document.getElementById('offcanvas-overlay');

  function toggleMenu() {
    const opened = menu.classList.toggle('open');
    overlay.classList.toggle('open', opened);
    menu.setAttribute('aria-hidden', opened ? 'false' : 'true');
  }

  btn.addEventListener('click', toggleMenu);
  overlay.addEventListener('click', toggleMenu);
});