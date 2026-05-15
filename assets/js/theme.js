import { getPref, setPref } from './storage.js';

const KEY = 'theme';

function systemPrefersDark() {
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  setPref(KEY, theme);
  const btns = document.querySelectorAll('[data-theme-toggle]');
  btns.forEach(b => { b.textContent = theme === 'dark' ? '☀︎' : '☾'; b.setAttribute('aria-label', theme === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'); });
}

export function initTheme() {
  const stored = getPref(KEY);
  const theme = stored || (systemPrefersDark() ? 'dark' : 'light');
  applyTheme(theme);
  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-theme-toggle]');
    if (!t) return;
    const cur = document.documentElement.getAttribute('data-theme') || 'dark';
    applyTheme(cur === 'dark' ? 'light' : 'dark');
  });
}
