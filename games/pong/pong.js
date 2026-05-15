import { initTheme } from '../../assets/js/theme.js';
import { initSound, sfx } from '../../assets/js/sound.js';
import { getHighScore, setHighScore } from '../../assets/js/storage.js';

initTheme();
initSound();

const GAME_ID = 'pong';
const WIN = 7;

const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const p1El = document.getElementById('p1');
const p2El = document.getElementById('p2');
const bestEl = document.getElementById('best');
const msgEl = document.getElementById('msg');

let W, H;
function fit() {
  const targetW = Math.min(window.innerWidth - 32, 720);
  const aspect = 1.6;
  const w = targetW;
  const h = Math.min(targetW / aspect, window.innerHeight - 280);
  const finalW = Math.min(w, h * aspect);
  const finalH = finalW / aspect;
  const dpr = window.devicePixelRatio || 1;
  canvas.style.width = finalW + 'px';
  canvas.style.height = finalH + 'px';
  canvas.width = finalW * dpr;
  canvas.height = finalH * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  W = finalW; H = finalH;
}

const PADDLE_W = 10, PADDLE_H = 80;
let state, mode = 'cpu';

function reset(serveTo = Math.random() < 0.5 ? -1 : 1) {
  state = {
    p1y: 0, p2y: 0, // se inicializan tras fit()
    p1score: 0, p2score: 0,
    ballX: 0, ballY: 0, vx: 0, vy: 0,
    running: false, lastTouchY: { p1: null, p2: null },
  };
  state.p1y = H / 2 - PADDLE_H / 2;
  state.p2y = H / 2 - PADDLE_H / 2;
  serve(serveTo);
  msgEl.textContent = '';
  updateScore();
}

function serve(dir) {
  state.ballX = W / 2;
  state.ballY = H / 2;
  const speed = 5;
  const angle = (Math.random() * 0.6 - 0.3); // -0.3..0.3 rad
  state.vx = Math.cos(angle) * speed * dir;
  state.vy = Math.sin(angle) * speed;
}

function updateScore() {
  p1El.textContent = state.p1score;
  p2El.textContent = state.p2score;
  bestEl.textContent = getHighScore(GAME_ID);
}

const keys = {};
window.addEventListener('keydown', (e) => { keys[e.key] = true; if (['ArrowUp','ArrowDown'].includes(e.key)) e.preventDefault(); });
window.addEventListener('keyup', (e) => { keys[e.key] = false; });

// Touch: arrastrar en la mitad izquierda controla p1, mitad derecha controla p2 (multi-touch).
const activePointers = new Map();
canvas.addEventListener('pointerdown', (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const side = x < rect.width / 2 ? 'p1' : 'p2';
  activePointers.set(e.pointerId, side);
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove', (e) => {
  const side = activePointers.get(e.pointerId);
  if (!side) return;
  const rect = canvas.getBoundingClientRect();
  const y = e.clientY - rect.top;
  const target = Math.max(0, Math.min(H - PADDLE_H, y - PADDLE_H / 2));
  if (side === 'p1') state.p1y = target;
  else if (mode === '2p') state.p2y = target;
});
const releasePointer = (e) => { activePointers.delete(e.pointerId); };
canvas.addEventListener('pointerup', releasePointer);
canvas.addEventListener('pointercancel', releasePointer);

function step() {
  if (!state.running) return;
  const speed = 6;
  if (keys['ArrowUp'] || keys['w'] || keys['W']) state.p1y -= speed;
  if (keys['ArrowDown'] || keys['s'] || keys['S']) state.p1y += speed;
  state.p1y = Math.max(0, Math.min(H - PADDLE_H, state.p1y));
  if (mode === '2p') {
    state.p2y = Math.max(0, Math.min(H - PADDLE_H, state.p2y));
  } else {
    // CPU sigue la pelota con un poco de lentitud
    const target = state.ballY - PADDLE_H / 2;
    const diff = target - state.p2y;
    state.p2y += Math.max(-4.5, Math.min(4.5, diff));
    state.p2y = Math.max(0, Math.min(H - PADDLE_H, state.p2y));
  }

  state.ballX += state.vx;
  state.ballY += state.vy;
  if (state.ballY < 6 || state.ballY > H - 6) { state.vy *= -1; sfx.click(); }
  // Paleta izquierda
  if (state.ballX < PADDLE_W + 8 && state.ballY > state.p1y && state.ballY < state.p1y + PADDLE_H && state.vx < 0) {
    state.vx *= -1.07;
    const rel = (state.ballY - (state.p1y + PADDLE_H / 2)) / (PADDLE_H / 2);
    state.vy += rel * 1.5;
    sfx.pop();
  }
  // Paleta derecha
  if (state.ballX > W - PADDLE_W - 8 && state.ballY > state.p2y && state.ballY < state.p2y + PADDLE_H && state.vx > 0) {
    state.vx *= -1.07;
    const rel = (state.ballY - (state.p2y + PADDLE_H / 2)) / (PADDLE_H / 2);
    state.vy += rel * 1.5;
    sfx.pop();
  }
  // Cap velocidad
  state.vx = Math.max(-12, Math.min(12, state.vx));
  state.vy = Math.max(-10, Math.min(10, state.vy));

  if (state.ballX < -10) { state.p2score++; afterPoint(1); }
  else if (state.ballX > W + 10) { state.p1score++; afterPoint(-1); }
}

function afterPoint(serveDir) {
  updateScore();
  sfx.fail();
  if (state.p1score >= WIN || state.p2score >= WIN) {
    state.running = false;
    if (state.p1score > state.p2score) {
      msgEl.textContent = '¡Has ganado! 🎉';
      sfx.win();
      setHighScore(GAME_ID, getHighScore(GAME_ID) + 1);
      updateScore();
    } else {
      msgEl.textContent = 'CPU gana 😅';
    }
  } else {
    serve(serveDir);
  }
}

function draw() {
  ctx.fillStyle = getCss('--surface');
  ctx.fillRect(0, 0, W, H);
  // Línea media
  ctx.strokeStyle = getCss('--border');
  ctx.setLineDash([6, 8]);
  ctx.beginPath();
  ctx.moveTo(W / 2, 0); ctx.lineTo(W / 2, H);
  ctx.stroke();
  ctx.setLineDash([]);
  // Paletas
  ctx.fillStyle = getCss('--accent');
  ctx.fillRect(0, state.p1y, PADDLE_W, PADDLE_H);
  ctx.fillStyle = getCss('--accent-2');
  ctx.fillRect(W - PADDLE_W, state.p2y, PADDLE_W, PADDLE_H);
  // Pelota
  ctx.fillStyle = getCss('--fg');
  ctx.beginPath();
  ctx.arc(state.ballX, state.ballY, 6, 0, Math.PI * 2);
  ctx.fill();
}

function getCss(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function loop() {
  step();
  draw();
  requestAnimationFrame(loop);
}

document.querySelectorAll('.mode-btn').forEach(b => b.addEventListener('click', () => {
  document.querySelectorAll('.mode-btn').forEach(x => x.classList.remove('active'));
  b.classList.add('active');
  mode = b.dataset.mode;
  fit(); reset();
}));
document.getElementById('start').addEventListener('click', () => {
  if (state.p1score >= WIN || state.p2score >= WIN) reset();
  state.running = true;
  msgEl.textContent = '';
});

window.addEventListener('resize', () => { fit(); reset(); });
fit();
reset();
loop();
