import { initTheme } from '../../assets/js/theme.js';
import { initSound, sfx } from '../../assets/js/sound.js';
import { getHighScore, setHighScore } from '../../assets/js/storage.js';

initTheme();
initSound();

const GAME_ID = 'conecta-4';
const COLS = 7, ROWS = 6;
const EMPTY = 0, RED = 1, YEL = 2;

const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const msgEl = document.getElementById('msg');
const redScoreEl = document.getElementById('redScore');
const yellowScoreEl = document.getElementById('yellowScore');

let CELL, W, H;
function fit() {
  const maxW = Math.min(window.innerWidth - 32, 560);
  CELL = Math.floor(Math.min(maxW / COLS, (window.innerHeight - 320) / ROWS, 80));
  if (CELL < 36) CELL = 36;
  W = CELL * COLS; H = CELL * ROWS;
  const dpr = window.devicePixelRatio || 1;
  canvas.style.width = W + 'px';
  canvas.style.height = H + 'px';
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

let board, turn, over, mode, winningLine;
const wins = { r: 0, y: 0 };

function init() {
  board = Array.from({ length: ROWS }, () => Array(COLS).fill(EMPTY));
  turn = RED;
  over = false;
  winningLine = null;
  msgEl.textContent = 'Turno de Rojo';
  draw();
}

function play(col) {
  if (over) return;
  const row = dropRow(board, col);
  if (row < 0) return;
  board[row][col] = turn;
  sfx.drop();
  const w = findWin(board, turn);
  if (w) {
    over = true;
    winningLine = w;
    if (turn === RED) wins.r++; else wins.y++;
    msgEl.textContent = `¡Gana ${turn === RED ? 'Rojo' : 'Amarillo'}!`;
    sfx.win();
    // Récord = victorias humanas (Rojo)
    setHighScore(GAME_ID, wins.r);
  } else if (isFull(board)) {
    over = true;
    msgEl.textContent = 'Empate';
  } else {
    turn = turn === RED ? YEL : RED;
    msgEl.textContent = `Turno de ${turn === RED ? 'Rojo' : 'Amarillo'}`;
  }
  redScoreEl.textContent = wins.r;
  yellowScoreEl.textContent = wins.y;
  draw();
  if (!over && mode === 'ai' && turn === YEL) {
    setTimeout(() => {
      const col = aiPick();
      play(col);
    }, 300);
  }
}

function dropRow(b, col) {
  for (let r = ROWS - 1; r >= 0; r--) if (b[r][col] === EMPTY) return r;
  return -1;
}

function isFull(b) {
  return b[0].every(v => v !== EMPTY);
}

function findWin(b, p) {
  const dirs = [[0,1],[1,0],[1,1],[1,-1]];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (b[r][c] === p) {
    for (const [dr, dc] of dirs) {
      const cells = [[r, c]];
      for (let k = 1; k < 4; k++) {
        const nr = r + dr * k, nc = c + dc * k;
        if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS || b[nr][nc] !== p) break;
        cells.push([nr, nc]);
      }
      if (cells.length === 4) return cells;
    }
  }
  return null;
}

function aiPick() {
  const depth = 4;
  let bestScore = -Infinity, bestCol = 3;
  const order = [3, 2, 4, 1, 5, 0, 6];
  for (const c of order) {
    if (board[0][c] !== EMPTY) continue;
    const r = dropRow(board, c);
    board[r][c] = YEL;
    const score = minimax(board, depth - 1, -Infinity, Infinity, false);
    board[r][c] = EMPTY;
    if (score > bestScore) { bestScore = score; bestCol = c; }
  }
  return bestCol;
}

function minimax(b, depth, alpha, beta, maximizing) {
  const winY = findWin(b, YEL);
  if (winY) return 10000 + depth;
  const winR = findWin(b, RED);
  if (winR) return -10000 - depth;
  if (depth === 0 || isFull(b)) return evaluate(b);
  const order = [3, 2, 4, 1, 5, 0, 6];
  if (maximizing) {
    let best = -Infinity;
    for (const c of order) {
      if (b[0][c] !== EMPTY) continue;
      const r = dropRow(b, c);
      b[r][c] = YEL;
      const s = minimax(b, depth - 1, alpha, beta, false);
      b[r][c] = EMPTY;
      best = Math.max(best, s);
      alpha = Math.max(alpha, s);
      if (alpha >= beta) break;
    }
    return best;
  } else {
    let best = Infinity;
    for (const c of order) {
      if (b[0][c] !== EMPTY) continue;
      const r = dropRow(b, c);
      b[r][c] = RED;
      const s = minimax(b, depth - 1, alpha, beta, true);
      b[r][c] = EMPTY;
      best = Math.min(best, s);
      beta = Math.min(beta, s);
      if (alpha >= beta) break;
    }
    return best;
  }
}

function evaluate(b) {
  let score = 0;
  // Preferencia por el centro
  for (let r = 0; r < ROWS; r++) {
    if (b[r][3] === YEL) score += 3;
    else if (b[r][3] === RED) score -= 3;
  }
  // Ventanas de 4
  const lines = [];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c <= COLS - 4; c++) lines.push([b[r][c], b[r][c+1], b[r][c+2], b[r][c+3]]);
  for (let r = 0; r <= ROWS - 4; r++) for (let c = 0; c < COLS; c++) lines.push([b[r][c], b[r+1][c], b[r+2][c], b[r+3][c]]);
  for (let r = 0; r <= ROWS - 4; r++) for (let c = 0; c <= COLS - 4; c++) lines.push([b[r][c], b[r+1][c+1], b[r+2][c+2], b[r+3][c+3]]);
  for (let r = 0; r <= ROWS - 4; r++) for (let c = 3; c < COLS; c++) lines.push([b[r][c], b[r+1][c-1], b[r+2][c-2], b[r+3][c-3]]);
  for (const w of lines) {
    const y = w.filter(v => v === YEL).length;
    const rd = w.filter(v => v === RED).length;
    if (y && !rd) score += [0, 1, 10, 50][y];
    if (rd && !y) score -= [0, 1, 10, 50][rd];
  }
  return score;
}

function draw() {
  ctx.fillStyle = '#1f2950';
  ctx.fillRect(0, 0, W, H);
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const cx = c * CELL + CELL / 2;
    const cy = r * CELL + CELL / 2;
    let color = '#0c1230';
    if (board[r][c] === RED) color = '#ff5d6c';
    else if (board[r][c] === YEL) color = '#facc15';
    ctx.beginPath();
    ctx.arc(cx, cy, CELL * 0.4, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    if (winningLine && winningLine.some(([wr, wc]) => wr === r && wc === c)) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.stroke();
    }
  }
}

canvas.addEventListener('pointerdown', (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const col = Math.floor((x / rect.width) * COLS);
  if (col < 0 || col >= COLS) return;
  if (over) return;
  if (mode === 'ai' && turn !== RED) return;
  play(col);
});

document.querySelectorAll('.mode-btn').forEach(b => b.addEventListener('click', () => {
  document.querySelectorAll('.mode-btn').forEach(x => x.classList.remove('active'));
  b.classList.add('active');
  mode = b.dataset.mode;
  init();
}));
mode = 'ai';

document.getElementById('reset').addEventListener('click', init);

wins.r = getHighScore(GAME_ID);
redScoreEl.textContent = wins.r;
yellowScoreEl.textContent = wins.y;

window.addEventListener('resize', () => { fit(); draw(); });
fit();
init();
