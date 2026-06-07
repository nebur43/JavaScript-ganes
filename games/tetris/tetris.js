import { initTheme } from '../../assets/js/theme.js';
import { initSound, sfx } from '../../assets/js/sound.js';
import { getHighScore, setHighScore } from '../../assets/js/storage.js';
import { createDpad } from '../../assets/js/input.js';

initTheme();
initSound();

const GAME_ID = 'tetris';
const COLS = 10, ROWS = 20;

const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const linesEl = document.getElementById('lines');
const levelEl = document.getElementById('level');
const bestEl = document.getElementById('best');
const msgEl = document.getElementById('msg');

let CELL = 30, CSS_W = 300, CSS_H = 600;
function fit() {
  const maxW = Math.min(window.innerWidth - 32, 360);
  // En táctil reservamos más espacio para el D-pad (≈240px) y controles (≈60px)
  const hasFinePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const reservedH = hasFinePointer ? 240 : 380;
  const maxH = window.innerHeight - reservedH;
  CELL = Math.floor(Math.min(maxW / COLS, maxH / ROWS, 32));
  if (CELL < 14) CELL = 14;
  CSS_W = CELL * COLS;
  CSS_H = CELL * ROWS;
  const dpr = window.devicePixelRatio || 1;
  canvas.style.width = CSS_W + 'px';
  canvas.style.height = CSS_H + 'px';
  canvas.width = CSS_W * dpr;
  canvas.height = CSS_H * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

const SHAPES = {
  I: { color: '#22d3ee', cells: [[0,1],[1,1],[2,1],[3,1]] },
  O: { color: '#facc15', cells: [[0,0],[1,0],[0,1],[1,1]] },
  T: { color: '#c084fc', cells: [[0,1],[1,1],[2,1],[1,0]] },
  S: { color: '#4ade80', cells: [[1,0],[2,0],[0,1],[1,1]] },
  Z: { color: '#fb7185', cells: [[0,0],[1,0],[1,1],[2,1]] },
  J: { color: '#60a5fa', cells: [[0,0],[0,1],[1,1],[2,1]] },
  L: { color: '#fb923c', cells: [[2,0],[0,1],[1,1],[2,1]] },
};
const KEYS = Object.keys(SHAPES);

let grid, piece, score, lines, level, dropMs, last, alive, paused, bag, started;

function newBag() {
  const b = KEYS.slice();
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
}

function spawn() {
  if (bag.length === 0) bag = newBag();
  const key = bag.pop();
  const s = SHAPES[key];
  piece = {
    key,
    cells: s.cells.map(([x, y]) => [x, y]),
    color: s.color,
    x: 3,
    y: -1,
  };
  if (collide(piece, 0, 1)) endGame();
}

function reset() {
  grid = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
  score = 0; lines = 0; level = 1;
  dropMs = 600; last = 0;
  alive = true; paused = false;
  bag = newBag();
  msgEl.textContent = '';
  spawn();
  updateUI();
}

function updateUI() {
  scoreEl.textContent = score;
  linesEl.textContent = lines;
  levelEl.textContent = level;
  bestEl.textContent = Math.max(getHighScore(GAME_ID), score);
}

function collide(p, dx, dy, cells = p.cells) {
  for (const [cx, cy] of cells) {
    const nx = p.x + cx + dx;
    const ny = p.y + cy + dy;
    if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
    if (ny >= 0 && grid[ny][nx]) return true;
  }
  return false;
}

function move(dx) {
  if (!piece || !alive || paused) return;
  if (!collide(piece, dx, 0)) { piece.x += dx; sfx.move(); }
}

function rotate() {
  if (!piece || !alive || paused || piece.key === 'O') return;
  const rotated = piece.cells.map(([x, y]) => [-(y - 1) + 1, x]);
  // Normalizar a 0..maxX
  const minX = Math.min(...rotated.map(c => c[0]));
  const minY = Math.min(...rotated.map(c => c[1]));
  const normalized = rotated.map(([x, y]) => [x - minX, y - minY]);
  if (!collide(piece, 0, 0, normalized)) { piece.cells = normalized; sfx.click(); }
}

function softDrop() {
  if (!piece || !alive || paused) return;
  if (!collide(piece, 0, 1)) { piece.y++; score += 1; updateUI(); }
  else lock();
}

function hardDrop() {
  if (!piece || !alive || paused) return;
  let drop = 0;
  while (!collide(piece, 0, 1)) { piece.y++; drop++; }
  score += drop * 2;
  sfx.drop();
  lock();
}

function lock() {
  for (const [cx, cy] of piece.cells) {
    const nx = piece.x + cx, ny = piece.y + cy;
    if (ny < 0) { alive = false; return; }
    grid[ny][nx] = piece.color;
  }
  clearLines();
  spawn();
}

function clearLines() {
  let cleared = 0;
  for (let r = ROWS - 1; r >= 0; r--) {
    if (grid[r].every(v => v)) {
      grid.splice(r, 1);
      grid.unshift(Array(COLS).fill(null));
      cleared++;
      r++;
    }
  }
  if (cleared) {
    sfx.success();
    const points = [0, 100, 300, 500, 800][cleared] * level;
    score += points;
    lines += cleared;
    const newLevel = Math.floor(lines / 10) + 1;
    if (newLevel > level) {
      level = newLevel;
      dropMs = Math.max(80, 600 - (level - 1) * 50);
    }
  }
  updateUI();
}

function endGame() {
  alive = false;
  sfx.fail();
  const isNew = setHighScore(GAME_ID, score);
  msgEl.textContent = isNew ? `¡Nuevo récord! ${score}` : `Game over · ${score} puntos`;
  updateUI();
}

function getGhostY() {
  let gy = piece.y;
  while (!collide(piece, 0, gy - piece.y + 1)) gy++;
  return gy;
}

function draw() {
  ctx.fillStyle = getCss('--surface');
  ctx.fillRect(0, 0, CSS_W, CSS_H);
  // grid
  ctx.strokeStyle = getCss('--border');
  ctx.lineWidth = 0.5;
  for (let i = 1; i < COLS; i++) {
    ctx.beginPath(); ctx.moveTo(i * CELL, 0); ctx.lineTo(i * CELL, CSS_H); ctx.stroke();
  }
  for (let i = 1; i < ROWS; i++) {
    ctx.beginPath(); ctx.moveTo(0, i * CELL); ctx.lineTo(CSS_W, i * CELL); ctx.stroke();
  }
  // Fijos
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    if (grid[r][c]) drawCell(c, r, grid[r][c]);
  }
  // Pieza fantasma (destino del drop)
  if (piece && alive && started) {
    const ghostY = getGhostY();
    if (ghostY !== piece.y) {
      ctx.globalAlpha = 0.22;
      for (const [cx, cy] of piece.cells) {
        const x = piece.x + cx, y = ghostY + cy;
        if (y >= 0) drawCell(x, y, piece.color);
      }
      ctx.globalAlpha = 1;
    }
  }
  // Pieza activa
  if (piece && alive) {
    for (const [cx, cy] of piece.cells) {
      const x = piece.x + cx, y = piece.y + cy;
      if (y >= 0) drawCell(x, y, piece.color);
    }
  }
}

function drawCell(c, r, color) {
  ctx.fillStyle = color;
  ctx.fillRect(c * CELL + 1, r * CELL + 1, CELL - 2, CELL - 2);
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.fillRect(c * CELL + 1, r * CELL + 1, CELL - 2, 3);
}

function getCss(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function loop(t) {
  if (started && alive && !paused) {
    if (!last) last = t;
    if (t - last >= dropMs) {
      last = t;
      if (!collide(piece, 0, 1)) piece.y++;
      else lock();
    }
  }
  draw();
  requestAnimationFrame(loop);
}

// Teclado
window.addEventListener('keydown', (e) => {
  if (!started || !alive || paused) {
    if (['ArrowLeft','ArrowRight','ArrowUp','ArrowDown',' '].includes(e.key)) e.preventDefault();
    return;
  }
  switch (e.key) {
    case 'ArrowLeft': move(-1); e.preventDefault(); break;
    case 'ArrowRight': move(1); e.preventDefault(); break;
    case 'ArrowUp': rotate(); e.preventDefault(); break;
    case 'ArrowDown': softDrop(); e.preventDefault(); break;
    case ' ': hardDrop(); e.preventDefault(); break;
  }
});

// D-pad
createDpad(document.getElementById('dpad'), (type, val) => {
  if (type === 'dir') {
    if (val === 'left') move(-1);
    else if (val === 'right') move(1);
    else if (val === 'up') rotate();
    else if (val === 'down') softDrop();
  } else if (type === 'action') {
    if (val === 'drop') hardDrop();
  }
}, { extra: [{ id: 'drop', label: 'Hard drop', text: '⇩' }] });

document.getElementById('start').addEventListener('click', () => {
  started = true;
  reset();
});
document.getElementById('pause').addEventListener('click', () => {
  if (!started || !alive) return;
  paused = !paused;
  msgEl.textContent = paused ? 'Pausa' : '';
  last = 0;
});

window.addEventListener('resize', fit);
fit();
started = false;
grid = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
alive = false;
piece = null;
msgEl.textContent = 'Pulsa Iniciar para comenzar';
requestAnimationFrame(loop);
