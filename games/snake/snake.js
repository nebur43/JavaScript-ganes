import { initTheme } from '../../assets/js/theme.js';
import { initSound, sfx } from '../../assets/js/sound.js';
import { getHighScore, setHighScore } from '../../assets/js/storage.js';
import { onArrowKeys, onSwipe } from '../../assets/js/input.js';

initTheme();
initSound();

const GAME_ID = 'snake';
const COLS = 20, ROWS = 20;

const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const msgEl = document.getElementById('msg');

function fitCanvas() {
  const size = Math.min(window.innerWidth - 32, 480);
  const dpr = window.devicePixelRatio || 1;
  canvas.style.width = size + 'px';
  canvas.style.height = size + 'px';
  canvas.width = size * dpr;
  canvas.height = size * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  CSS_SIZE = size;
  CELL = size / COLS;
}
let CSS_SIZE = 400, CELL = 20;

let snake, dir, nextDir, food, score, alive, tickMs, last, paused;

function reset() {
  snake = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }];
  dir = { x: 1, y: 0 };
  nextDir = dir;
  placeFood();
  score = 0;
  alive = true;
  paused = false;
  tickMs = 130;
  last = 0;
  msgEl.textContent = '';
  updateScore();
}

function placeFood() {
  while (true) {
    const f = { x: Math.floor(Math.random() * COLS), y: Math.floor(Math.random() * ROWS) };
    if (!snake.some(s => s.x === f.x && s.y === f.y)) { food = f; return; }
  }
}

function updateScore() {
  scoreEl.textContent = score;
  bestEl.textContent = getHighScore(GAME_ID);
}

function step() {
  dir = nextDir;
  const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
  if (head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS) return die();
  if (snake.some((s, i) => i < snake.length - 1 && s.x === head.x && s.y === head.y)) return die();
  snake.unshift(head);
  if (head.x === food.x && head.y === food.y) {
    score++;
    sfx.pop();
    placeFood();
    if (tickMs > 60) tickMs -= 2;
  } else {
    snake.pop();
  }
  updateScore();
}

function die() {
  alive = false;
  sfx.fail();
  const isNew = setHighScore(GAME_ID, score);
  msgEl.textContent = isNew ? `¡Nuevo récord! ${score}` : `Game over · ${score} puntos`;
  updateScore();
}

function draw() {
  ctx.fillStyle = getCss('--surface');
  ctx.fillRect(0, 0, CSS_SIZE, CSS_SIZE);
  // grid sutil
  ctx.strokeStyle = getCss('--border');
  ctx.lineWidth = 0.5;
  for (let i = 1; i < COLS; i++) {
    ctx.beginPath();
    ctx.moveTo(i * CELL, 0); ctx.lineTo(i * CELL, CSS_SIZE);
    ctx.moveTo(0, i * CELL); ctx.lineTo(CSS_SIZE, i * CELL);
    ctx.stroke();
  }
  // comida
  ctx.fillStyle = getCss('--accent-2');
  const fx = food.x * CELL + CELL / 2;
  const fy = food.y * CELL + CELL / 2;
  ctx.beginPath();
  ctx.arc(fx, fy, CELL * 0.4, 0, Math.PI * 2);
  ctx.fill();
  // serpiente
  snake.forEach((s, i) => {
    ctx.fillStyle = i === 0 ? getCss('--accent') : mix(getCss('--accent'), getCss('--surface'), 0.4);
    roundRect(ctx, s.x * CELL + 1, s.y * CELL + 1, CELL - 2, CELL - 2, 4);
    ctx.fill();
  });
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function getCss(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function mix(a, b, t) {
  // Simple fallback: si parsea como hex
  const pa = parseHex(a), pb = parseHex(b);
  if (!pa || !pb) return a;
  const r = Math.round(pa[0] * (1 - t) + pb[0] * t);
  const g = Math.round(pa[1] * (1 - t) + pb[1] * t);
  const bl = Math.round(pa[2] * (1 - t) + pb[2] * t);
  return `rgb(${r},${g},${bl})`;
}
function parseHex(c) {
  if (!c.startsWith('#')) return null;
  const x = c.slice(1);
  if (x.length === 6) return [parseInt(x.slice(0, 2), 16), parseInt(x.slice(2, 4), 16), parseInt(x.slice(4, 6), 16)];
  if (x.length === 3) return [parseInt(x[0] + x[0], 16), parseInt(x[1] + x[1], 16), parseInt(x[2] + x[2], 16)];
  return null;
}

function loop(t) {
  if (!last) last = t;
  if (alive && !paused && t - last >= tickMs) {
    last = t;
    step();
  }
  draw();
  requestAnimationFrame(loop);
}

function setDir(d) {
  const map = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };
  const nd = map[d];
  if (!nd) return;
  if (nd.x === -dir.x && nd.y === -dir.y) return; // no reverso
  nextDir = nd;
}

onArrowKeys((d) => setDir(d));
onSwipe(canvas, (d) => setDir(d));

document.getElementById('start').addEventListener('click', () => { reset(); });
document.getElementById('pause').addEventListener('click', () => {
  if (!alive) return;
  paused = !paused;
  msgEl.textContent = paused ? 'Pausa' : '';
});

window.addEventListener('resize', fitCanvas);
fitCanvas();
reset();
requestAnimationFrame(loop);
