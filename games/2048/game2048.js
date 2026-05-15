import { initTheme } from '../../assets/js/theme.js';
import { initSound, sfx } from '../../assets/js/sound.js';
import { getHighScore, setHighScore } from '../../assets/js/storage.js';
import { onArrowKeys, onSwipe } from '../../assets/js/input.js';

initTheme();
initSound();

const GAME_ID = '2048';
const N = 4;

const gridEl = document.getElementById('grid');
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const msgEl = document.getElementById('msg');

let board, score, prev, won;

function init() {
  board = Array.from({ length: N }, () => Array(N).fill(0));
  score = 0;
  prev = null;
  won = false;
  addRandom();
  addRandom();
  render();
  msgEl.textContent = '';
}

function addRandom() {
  const empty = [];
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (!board[r][c]) empty.push([r, c]);
  if (!empty.length) return false;
  const [r, c] = empty[Math.floor(Math.random() * empty.length)];
  board[r][c] = Math.random() < 0.9 ? 2 : 4;
  return true;
}

function clone(b) { return b.map(row => row.slice()); }

function slide(row) {
  const arr = row.filter(v => v);
  let gained = 0;
  for (let i = 0; i < arr.length - 1; i++) {
    if (arr[i] === arr[i + 1]) {
      arr[i] *= 2;
      gained += arr[i];
      arr.splice(i + 1, 1);
    }
  }
  while (arr.length < N) arr.push(0);
  return { row: arr, gained };
}

function rotateCW(b) {
  const r = Array.from({ length: N }, () => Array(N).fill(0));
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) r[j][N - 1 - i] = b[i][j];
  return r;
}

function move(dir) {
  const before = JSON.stringify(board);
  const snapshot = { board: clone(board), score };
  // Normalizamos: siempre movemos a la izquierda; rotamos según dirección.
  let rot = 0;
  if (dir === 'up') rot = 3;
  else if (dir === 'right') rot = 2;
  else if (dir === 'down') rot = 1;
  for (let i = 0; i < rot; i++) board = rotateCW(board);
  let gained = 0;
  for (let r = 0; r < N; r++) {
    const { row, gained: g } = slide(board[r]);
    board[r] = row;
    gained += g;
  }
  for (let i = 0; i < (4 - rot) % 4; i++) board = rotateCW(board);
  if (JSON.stringify(board) === before) return;
  score += gained;
  prev = snapshot;
  if (gained) sfx.pop(); else sfx.move();
  addRandom();
  render();
  if (!won && board.some(row => row.includes(2048))) {
    won = true;
    msgEl.textContent = '🎉 ¡Has llegado a 2048! Sigue jugando si quieres.';
    sfx.win();
  }
  if (isGameOver()) {
    const isNew = setHighScore(GAME_ID, score);
    msgEl.textContent = isNew ? `¡Nuevo récord! ${score}` : `Fin · ${score} puntos`;
    sfx.fail();
  }
}

function isGameOver() {
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    if (!board[r][c]) return false;
    if (c + 1 < N && board[r][c] === board[r][c + 1]) return false;
    if (r + 1 < N && board[r][c] === board[r + 1][c]) return false;
  }
  return true;
}

function render() {
  gridEl.innerHTML = '';
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    const v = board[r][c];
    const t = document.createElement('div');
    t.className = 'tile';
    t.dataset.v = v;
    t.textContent = v || '';
    gridEl.appendChild(t);
  }
  scoreEl.textContent = score;
  bestEl.textContent = Math.max(getHighScore(GAME_ID), score);
}

onArrowKeys((d) => move(d));
onSwipe(gridEl, (d) => move(d));

document.getElementById('restart').addEventListener('click', () => { setHighScore(GAME_ID, score); init(); });
document.getElementById('undo').addEventListener('click', () => {
  if (!prev) return;
  board = prev.board; score = prev.score; prev = null;
  render();
});

init();
