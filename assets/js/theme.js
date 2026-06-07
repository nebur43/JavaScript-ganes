import { getPref, setPref } from './storage.js';

const KEY = 'theme';

export function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  setPref(KEY, theme);
  const btns = document.querySelectorAll('[data-theme-toggle]');
  btns.forEach(b => {
    b.textContent = theme === 'dark' ? '☀︎' : '☾';
    b.setAttribute('aria-label', theme === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro');
  });
  // Actualiza meta theme-color para la barra del navegador en móvil
  const color = theme === 'dark' ? '#0b0f1a' : '#f4f6fb';
  let meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.name = 'theme-color';
    document.head.appendChild(meta);
  }
  meta.content = color;
}

export function initTheme() {
  const stored = getPref(KEY);
  const theme = stored || 'dark';
  applyTheme(theme);
  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-theme-toggle]');
    if (!t) return;
    const cur = document.documentElement.getAttribute('data-theme') || 'dark';
    applyTheme(cur === 'dark' ? 'light' : 'dark');
  });
}
