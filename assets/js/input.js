// Utilidades de entrada compartidas (swipe táctil, normalización de teclas).

export function onSwipe(el, handler, { threshold = 24 } = {}) {
  let startX = 0, startY = 0, active = false;
  el.addEventListener('pointerdown', (e) => {
    active = true;
    startX = e.clientX; startY = e.clientY;
    el.setPointerCapture?.(e.pointerId);
  });
  el.addEventListener('pointermove', (e) => {
    if (!active) return;
    // Evitar scroll mientras se hace swipe sobre el área de juego.
    if (e.cancelable) e.preventDefault();
  }, { passive: false });
  const end = (e) => {
    if (!active) return;
    active = false;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) return;
    const dir = Math.abs(dx) > Math.abs(dy)
      ? (dx > 0 ? 'right' : 'left')
      : (dy > 0 ? 'down' : 'up');
    handler(dir, { dx, dy });
  };
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', end);
}

const ARROW_MAP = {
  ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
  w: 'up', s: 'down', a: 'left', d: 'right',
  W: 'up', S: 'down', A: 'left', D: 'right',
};

export function onArrowKeys(handler, { preventDefault = true } = {}) {
  const listener = (e) => {
    const dir = ARROW_MAP[e.key];
    if (!dir) return;
    if (preventDefault) e.preventDefault();
    handler(dir, e);
  };
  window.addEventListener('keydown', listener);
  return () => window.removeEventListener('keydown', listener);
}

// Crea un D-pad virtual dentro de un contenedor. Botones: izq, arriba, abajo, der + opcionalmente acción.
export function createDpad(container, handler, { extra = [] } = {}) {
  container.classList.add('dpad');
  container.innerHTML = `
    <button type="button" class="dpad-btn dpad-up" data-dir="up" aria-label="Arriba">▲</button>
    <button type="button" class="dpad-btn dpad-left" data-dir="left" aria-label="Izquierda">◀</button>
    <button type="button" class="dpad-btn dpad-right" data-dir="right" aria-label="Derecha">▶</button>
    <button type="button" class="dpad-btn dpad-down" data-dir="down" aria-label="Abajo">▼</button>
    ${extra.map(x => `<button type="button" class="dpad-action" data-action="${x.id}" aria-label="${x.label}">${x.text}</button>`).join('')}
  `;
  container.addEventListener('pointerdown', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    e.preventDefault();
    if (b.dataset.dir) handler('dir', b.dataset.dir);
    else if (b.dataset.action) handler('action', b.dataset.action);
  });
}
