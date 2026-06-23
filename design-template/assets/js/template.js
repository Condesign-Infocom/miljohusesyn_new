// template.js — minimal vanilla interactivity (no framework).
// Mobile nav: <button data-menu-toggle aria-controls="mobile-nav" aria-expanded="false">
document.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-menu-toggle]");
  if (!btn) return;
  const id = btn.getAttribute("aria-controls");
  const panel = id && document.getElementById(id);
  if (!panel) return;
  const open = btn.getAttribute("aria-expanded") === "true";
  btn.setAttribute("aria-expanded", String(!open));
  panel.hidden = open;
});
