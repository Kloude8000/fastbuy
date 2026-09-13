function toggleMenu(btn) {
  const nav = document.querySelector(".header-nav");
  const isOpen = document.body.classList.toggle("nav-open");
  btn.setAttribute("aria-expanded", isOpen);
  if (nav) nav.setAttribute("aria-hidden", !isOpen);
}

function closeMenu() {
  const nav = document.querySelector(".header-nav");
  const hamburger = document.querySelector(".hamburger");
  document.body.classList.remove("nav-open");
  if (hamburger) hamburger.setAttribute("aria-expanded", "false");
  if (nav) nav.setAttribute("aria-hidden", "true");
}
