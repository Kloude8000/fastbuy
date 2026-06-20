function toggleMenu(btn) {
  const isOpen = document.body.classList.toggle('nav-open');
  btn.setAttribute('aria-expanded', isOpen);
  document.querySelector('nav').setAttribute('aria-hidden', !isOpen);
}

function closeMenu() {
  document.body.classList.remove('nav-open');
  document.querySelector('.hamburger').setAttribute('aria-expanded', 'false');
  document.querySelector('nav').setAttribute('aria-hidden', 'true');
}
