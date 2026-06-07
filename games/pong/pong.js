import { initTheme } from '../../assets/js/theme.js';
import { initSound, sfx } from '../../assets/js/sound.js';
import { getHighScore, setHighScore } from '../../assets/js/storage.js';

initTheme();
initSound();

const GAME_ID = 'pong';
const WIN = 7;

const canvas = document.getElementById('board');
const ctx    = canvas.getContext('2d');
const p1El   = document.getElementById('p1');
const p2El   = document.getElementById('p2');
const bestEl = document.getElementById('best');
const msgEl  = document.getElementById('msg');

let W, H;
const THICK = 10;
const LEN   = 80;

// ── Pantalla completa ──────────────────────────────────────────────────
const inFs = () => !!(document.fullscreenElement || document.webkitFullscreenElement);

// ── Cuenta atrás (fullscreen) ──────────────────────────────────────────
let countdown  = 0;
let _cdTimer   = null;
let overlayMsg = '';

function startCountdown(n) {
  clearInterval(_cdTimer);
  countdown = n;
  state.running = false;
  _cdTimer = setInterval(() => {
    countdown--;
    if (countdown <= 0) {
      clearInterval(_cdTimer);
      countdown = 0;
      state.running = true;
    }
  }, 1000);
}

// ── fit(): canvas ocupa el espacio disponible ─────────────────────────
function fit() {
  const fullscreen = inFs();
  const isMobile   = window.matchMedia('(pointer: coarse)').matches;

  let w, h;
  const aspect = 1.6;

  if (fullscreen) {
    // Fullscreen: board-wrap ocupa toda la pantalla → medir del contenedor
    canvas.style.width  = '1px';
    canvas.style.height = '1px';
    const wrap = canvas.parentElement;
    w = wrap.clientWidth  || window.innerWidth;
    h = wrap.clientHeight || window.innerHeight;
  } else {
    // Normal (escritorio y móvil): calcular desde el tamaño de ventana.
    // En móvil reservamos el 64 % de la altura para los controles UI,
    // dejando el 36 % para el canvas → el botón Iniciar siempre cabe en pantalla.
    const uiReserve = isMobile ? Math.round(window.innerHeight * 0.64) : 280;
    const maxW   = Math.min(window.innerWidth - 24, 720);
    const tentH  = Math.min(maxW / aspect, window.innerHeight - uiReserve);
    w = Math.min(maxW, Math.max(tentH, 60) * aspect);
    h = w / aspect;
  }

  const dpr = window.devicePixelRatio || 1;
  canvas.style.width  = w + 'px';
  canvas.style.height = h + 'px';
  canvas.width  = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  W = w; H = h;
}

// ── Estado ─────────────────────────────────────────────────────────────
let state, mode = 'cpu';

function reset(serveTo = Math.random() < 0.5 ? -1 : 1) {
  clearInterval(_cdTimer);
  countdown  = 0;
  overlayMsg = '';
  state = {
    p1: H / 2 - LEN / 2,
    p2: H / 2 - LEN / 2,
    p1score: 0, p2score: 0,
    ballX: W / 2, ballY: H / 2, vx: 0, vy: 0,
    running: false,
  };
  serve(serveTo);
  msgEl.textContent = '';
  updateScore();
}

function serve(dir) {
  state.ballX = W / 2;
  state.ballY = H / 2;
  const speed = inFs() ? 10 : 5;
  const angle = Math.random() * 0.6 - 0.3;
  state.vx = Math.cos(angle) * speed * dir;
  state.vy = Math.sin(angle) * speed;
}

function updateScore() {
  p1El.textContent   = state.p1score;
  p2El.textContent   = state.p2score;
  bestEl.textContent = getHighScore(GAME_ID);
}

// ── Teclado ────────────────────────────────────────────────────────────
const keys = {};
window.addEventListener('keydown', (e) => {
  keys[e.key] = true;
  if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) e.preventDefault();
});
window.addEventListener('keyup', (e) => { keys[e.key] = false; });

// ── Táctil ─────────────────────────────────────────────────────────────
const activePointers = new Map();
canvas.addEventListener('pointerdown', (e) => {
  const rect = canvas.getBoundingClientRect();
  const side = (e.clientX - rect.left) < rect.width / 2 ? 'p1' : 'p2';
  activePointers.set(e.pointerId, side);
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove', (e) => {
  const side = activePointers.get(e.pointerId);
  if (!side || !state) return;
  const rect = canvas.getBoundingClientRect();
  const y = e.clientY - rect.top;
  const t = Math.max(0, Math.min(H - LEN, y - LEN / 2));
  if (side === 'p1') state.p1 = t;
  else if (mode === '2p') state.p2 = t;
});
const releasePointer = (e) => activePointers.delete(e.pointerId);
canvas.addEventListener('pointerup',     releasePointer);
canvas.addEventListener('pointercancel', releasePointer);

// ── Lógica de un frame ─────────────────────────────────────────────────
function step() {
  if (!state.running) return;
  const spd = 6;

  const p1Up   = keys['w'] || keys['W'] || (mode !== '2p' && keys['ArrowUp']);
  const p1Down = keys['s'] || keys['S'] || (mode !== '2p' && keys['ArrowDown']);
  if (p1Up)   state.p1 -= spd;
  if (p1Down) state.p1 += spd;
  state.p1 = Math.max(0, Math.min(H - LEN, state.p1));

  if (mode === '2p') {
    if (keys['ArrowUp'])   state.p2 -= spd;
    if (keys['ArrowDown']) state.p2 += spd;
    state.p2 = Math.max(0, Math.min(H - LEN, state.p2));
  } else {
    const target = state.ballY - LEN / 2;
    state.p2 += Math.max(-4.5, Math.min(4.5, target - state.p2));
    state.p2 = Math.max(0, Math.min(H - LEN, state.p2));
  }

  const pOff = inFs() ? THICK : 0;

  state.ballX += state.vx;
  state.ballY += state.vy;

  if (state.ballY < 6 || state.ballY > H - 6) { state.vy *= -1; sfx.click(); }

  if (state.ballX < pOff + THICK + 8 && state.ballY > state.p1 && state.ballY < state.p1 + LEN && state.vx < 0) {
    state.vx *= -1.07;
    state.vy += ((state.ballY - (state.p1 + LEN / 2)) / (LEN / 2)) * 1.5;
    sfx.pop();
  }
  if (state.ballX > W - pOff - THICK - 8 && state.ballY > state.p2 && state.ballY < state.p2 + LEN && state.vx > 0) {
    state.vx *= -1.07;
    state.vy += ((state.ballY - (state.p2 + LEN / 2)) / (LEN / 2)) * 1.5;
    sfx.pop();
  }

  const maxVx = inFs() ? 24 : 12;
  const maxVy = inFs() ? 20 : 10;
  state.vx = Math.max(-maxVx, Math.min(maxVx, state.vx));
  state.vy = Math.max(-maxVy, Math.min(maxVy, state.vy));

  if (state.ballX < -10)         { state.p2score++; afterPoint(1);  }
  else if (state.ballX > W + 10) { state.p1score++; afterPoint(-1); }
}

function afterPoint(serveDir) {
  sfx.fail();
  const fullscreen = inFs();

  if (state.p1score >= WIN || state.p2score >= WIN) {
    state.running = false;
    const won = state.p1score > state.p2score;
    const msg = won ? '¡Ganaste! 🎉' : (mode === 'cpu' ? 'CPU gana 😅' : 'Gana el Rival 😅');
    if (won) { sfx.win(); setHighScore(GAME_ID, getHighScore(GAME_ID) + 1); }
    updateScore();
    if (fullscreen) {
      overlayMsg = msg;
      setTimeout(() => { overlayMsg = ''; reset(); startCountdown(3); }, 3000);
    } else {
      msgEl.textContent = msg;
    }
  } else {
    updateScore();
    serve(serveDir);
    if (fullscreen) {
      startCountdown(2);
    }
  }
}

// ── Dibujo ─────────────────────────────────────────────────────────────
function getCss(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function roundRect(cx, x, y, w, h, r) {
  cx.beginPath();
  cx.moveTo(x + r, y);
  cx.arcTo(x + w, y, x + w, y + h, r);
  cx.arcTo(x + w, y + h, x, y + h, r);
  cx.arcTo(x, y + h, x, y, r);
  cx.arcTo(x, y, x + w, y, r);
  cx.closePath();
}

function draw() {
  if (!state) return;
  ctx.fillStyle = getCss('--surface');
  ctx.fillRect(0, 0, W, H);

  const fullscreen = inFs();
  const isTouch    = !window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  // Zonas de control en móvil (solo cuando no se está jugando y no es fullscreen)
  if (isTouch && !state.running && !fullscreen && countdown === 0) {
    ctx.fillStyle = 'rgba(0,229,255,0.05)';
    ctx.fillRect(0, 0, W / 2, H);
    ctx.fillStyle = 'rgba(255,61,240,0.05)';
    ctx.fillRect(W / 2, 0, W / 2, H);
    ctx.fillStyle = getCss('--fg-dim');
    ctx.font = `${Math.round(H * 0.07)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Tu zona', W / 4, H / 2);
    ctx.fillText(mode === '2p' ? 'P2' : 'CPU', W * 3 / 4, H / 2);
    ctx.textBaseline = 'alphabetic';
  }

  // Línea central
  ctx.strokeStyle = getCss('--border');
  ctx.setLineDash([6, 8]);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(W / 2, 0); ctx.lineTo(W / 2, H);
  ctx.stroke();
  ctx.setLineDash([]);

  // Paletas (en fullscreen se desplazan THICK px hacia el interior)
  const pOff = fullscreen ? THICK : 0;
  ctx.fillStyle = getCss('--accent');
  roundRect(ctx, pOff, state.p1, THICK, LEN, 4); ctx.fill();
  ctx.fillStyle = getCss('--accent-2');
  roundRect(ctx, W - THICK - pOff, state.p2, THICK, LEN, 4); ctx.fill();

  // Bola
  ctx.fillStyle = getCss('--fg');
  ctx.beginPath();
  ctx.arc(state.ballX, state.ballY, 6, 0, Math.PI * 2);
  ctx.fill();

  // ── Marcadores dentro del canvas (solo en pantalla completa) ──
  if (fullscreen) {
    const sz = Math.round(Math.min(W, H) * 0.18);
    ctx.font      = `900 ${sz}px sans-serif`;
    ctx.globalAlpha  = 0.3;
    ctx.textBaseline = 'top';
    ctx.textAlign    = 'center';
    ctx.fillStyle = getCss('--accent');
    ctx.fillText(state.p1score, W * 0.22, H * 0.04);
    ctx.fillStyle = getCss('--accent-2');
    ctx.fillText(state.p2score, W * 0.78, H * 0.04);
    ctx.globalAlpha  = 1;
    ctx.textBaseline = 'alphabetic';
  }

  // ── Cuenta atrás ──
  if (countdown > 0) {
    const sz = Math.round(Math.min(W, H) * 0.38);
    ctx.font         = `900 ${sz}px sans-serif`;
    ctx.fillStyle    = getCss('--fg');
    ctx.globalAlpha  = 0.65;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(countdown, W / 2, H / 2);
    ctx.globalAlpha  = 1;
    ctx.textBaseline = 'alphabetic';
  }

  // ── Mensaje overlay en canvas (fin de partida en fullscreen) ──
  if (overlayMsg) {
    const sz = Math.round(Math.min(W, H) * 0.1);
    ctx.font         = `bold ${sz}px sans-serif`;
    ctx.fillStyle    = getCss('--fg');
    ctx.globalAlpha  = 0.9;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(overlayMsg, W / 2, H / 2);
    ctx.globalAlpha  = 1;
    ctx.textBaseline = 'alphabetic';
  }
}

function loop() {
  step();
  draw();
  requestAnimationFrame(loop);
}

// ── Botones de modo ────────────────────────────────────────────────────
document.querySelectorAll('.mode-btn[data-mode]').forEach(b => b.addEventListener('click', () => {
  document.querySelectorAll('.mode-btn[data-mode]').forEach(x => x.classList.remove('active'));
  b.classList.add('active');
  mode = b.dataset.mode;
  fit(); reset();
}));

// ── Pantalla completa ──────────────────────────────────────────────────
document.getElementById('btn-fullscreen').addEventListener('click', async () => {
  if (!inFs()) {
    const el = document.documentElement;
    await (el.requestFullscreen?.() ?? el.webkitRequestFullscreen?.());
    try { await screen.orientation.lock('landscape'); } catch (_) {}
  } else {
    await (document.exitFullscreen?.() ?? document.webkitExitFullscreen?.());
    try { screen.orientation.unlock(); } catch (_) {}
  }
});

const onFsChange = () => {
  const fs = inFs();
  const btn = document.getElementById('btn-fullscreen');
  btn.textContent = fs ? '✕ Salir' : '⛶ Pantalla';
  btn.setAttribute('aria-label', fs ? 'Salir de pantalla completa' : 'Pantalla completa');
  setTimeout(() => {
    fit();
    reset();
    if (fs) startCountdown(3);
  }, 120);
};
document.addEventListener('fullscreenchange',       onFsChange);
document.addEventListener('webkitfullscreenchange', onFsChange);

// ── Redimensionado ─────────────────────────────────────────────────────
window.addEventListener('resize', () => {
  fit();
  reset();
  if (inFs()) startCountdown(3);
});

// ── Botón Iniciar (solo modo normal) ───────────────────────────────────
document.getElementById('start').addEventListener('click', () => {
  if (state.p1score >= WIN || state.p2score >= WIN) reset();
  state.running = true;
  msgEl.textContent = '';
});

// ── Arranque ───────────────────────────────────────────────────────────
fit();
reset();
loop();
