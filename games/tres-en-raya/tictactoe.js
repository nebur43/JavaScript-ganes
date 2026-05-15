import { initTheme } from '../../assets/js/theme.js';
import { initSound, sfx } from '../../assets/js/sound.js';
import { getHighScore, setHighScore } from '../../assets/js/storage.js';

initTheme();
initSound();

const GAME_ID = 'tres-en-raya';

const boardEl = document.getElementById('board');
const msgEl = document.getElementById('msg');
const winsXEl = document.getElementById('winsX');
const winsOEl = document.getElementById('winsO');
const drawsEl = document.getElementById('draws');

const LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

let board, turn, mode, over;
const stats = { x: 0, o: 0, d: 0 };

function init() {
  board = Array(9).fill('');
  turn = 'X';
  over = false;
  render();
  msgEl.textContent = 'Turno de X';
}

function render() {
  boardEl.innerHTML = '';
  for (let i = 0; i < 9; i++) {
    const c = document.createElement('div');
    c.className = 'cell';
    if (board[i]) c.classList.add(board[i].toLowerCase(), 'disabled');
    c.textContent = board[i];
    c.addEventListener('click', () => play(i));
    boardEl.appendChild(c);
  }
  winsXEl.textContent = stats.x;
  winsOEl.textContent = stats.o;
  drawsEl.textContent = stats.d;
}

function winnerOf(b) {
  for (const [a, c, d] of LINES) if (b[a] && b[a] === b[c] && b[a] === b[d]) return { player: b[a], line: [a, c, d] };
  if (b.every(v => v)) return { player: 'D', line: [] };
  return null;
}

function play(i) {
  if (over || board[i]) return;
  board[i] = turn;
  sfx.click();
  const w = winnerOf(board);
  if (w) return finish(w);
  turn = turn === 'X' ? 'O' : 'X';
  render();
  msgEl.textContent = `Turno de ${turn}`;
  if (mode === 'ai' && turn === 'O' && !over) {
    setTimeout(aiMove, 220);
  }
}

function aiMove() {
  const move = bestMove(board, 'O');
  if (move != null) play(move);
}

function bestMove(b, p) {
  let best = -Infinity, idx = null;
  for (let i = 0; i < 9; i++) if (!b[i]) {
    b[i] = p;
    const s = minimax(b, false, p);
    b[i] = '';
    if (s > best) { best = s; idx = i; }
  }
  return idx;
}

function minimax(b, maximizing, ai) {
  const w = winnerOf(b);
  if (w) {
    if (w.player === ai) return 10;
    if (w.player === 'D') return 0;
    return -10;
  }
  const player = maximizing ? ai : (ai === 'O' ? 'X' : 'O');
  let best = maximizing ? -Infinity : Infinity;
  for (let i = 0; i < 9; i++) if (!b[i]) {
    b[i] = player;
    const s = minimax(b, !maximizing, ai);
    b[i] = '';
    best = maximizing ? Math.max(best, s) : Math.min(best, s);
  }
  return best;
}

function finish(w) {
  over = true;
  if (w.player === 'D') {
    stats.d++;
    msgEl.textContent = '¡Empate!';
  } else {
    if (w.player === 'X') stats.x++; else stats.o++;
    msgEl.textContent = `¡Gana ${w.player}!`;
    sfx.win();
    w.line.forEach(i => boardEl.children[i].classList.add('win'));
  }
  // Récord = victorias totales del jugador humano (X)
  setHighScore(GAME_ID, stats.x);
  render();
  // Marcar línea ganadora tras re-render
  if (w.line.length) w.line.forEach(i => boardEl.children[i].classList.add('win'));
}

// Modo
document.querySelectorAll('.mode-btn').forEach(b => b.addEventListener('click', () => {
  document.querySelectorAll('.mode-btn').forEach(x => x.classList.remove('active'));
  b.classList.add('active');
  mode = b.dataset.mode;
  init();
}));
mode = 'ai';

document.getElementById('reset').addEventListener('click', init);

stats.x = getHighScore(GAME_ID);
init();
