import { initTheme } from '../../assets/js/theme.js';
import { initSound, sfx } from '../../assets/js/sound.js';
import { getHighScore, setHighScore, getPref, setPref } from '../../assets/js/storage.js';

initTheme();
initSound();

const GAME_ID = 'memorice';
const SYMBOLS = ['🍎', '🍌', '🍇', '🍒', '🥑', '🍉', '🍓', '🥝'];

const boardEl = document.getElementById('board');
const movesEl = document.getElementById('moves');
const pairsEl = document.getElementById('pairs');
const bestEl = document.getElementById('best');
const msgEl = document.getElementById('msg');

let deck, flipped, moves, pairs, lock;

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function init() {
  deck = shuffle(SYMBOLS.concat(SYMBOLS).map((s, i) => ({ id: i, sym: s, matched: false, flipped: false })));
  flipped = [];
  moves = 0;
  pairs = 0;
  lock = false;
  msgEl.textContent = '';
  render();
  updateBest();
}

function updateBest() {
  // Mejor = menor número de movimientos (guardado como pref para usar "menor es mejor")
  const best = getPref('memorice_best', '');
  bestEl.textContent = best ? best : '—';
}

function render() {
  boardEl.innerHTML = '';
  deck.forEach((card, idx) => {
    const c = document.createElement('div');
    c.className = 'cell';
    if (card.flipped) c.classList.add('flipped');
    if (card.matched) c.classList.add('matched');
    c.textContent = card.flipped || card.matched ? card.sym : '?';
    c.addEventListener('click', () => flip(idx));
    boardEl.appendChild(c);
  });
  movesEl.textContent = moves;
  pairsEl.textContent = `${pairs} / 8`;
}

function flip(idx) {
  if (lock) return;
  const card = deck[idx];
  if (card.flipped || card.matched) return;
  card.flipped = true;
  sfx.click();
  flipped.push(idx);
  render();
  if (flipped.length === 2) {
    moves++;
    movesEl.textContent = moves;
    const [a, b] = flipped;
    if (deck[a].sym === deck[b].sym) {
      deck[a].matched = deck[b].matched = true;
      pairs++;
      flipped = [];
      sfx.pop();
      if (pairs === 8) finish();
      else render();
    } else {
      lock = true;
      setTimeout(() => {
        deck[a].flipped = deck[b].flipped = false;
        flipped = [];
        lock = false;
        render();
      }, 800);
    }
  }
}

function finish() {
  msgEl.textContent = `¡Completado en ${moves} movimientos!`;
  sfx.win();
  const bestRaw = getPref('memorice_best', '');
  const best = bestRaw ? Number(bestRaw) : Infinity;
  if (moves < best) {
    setPref('memorice_best', moves);
    // Para el hub: guardamos también como "high score" (menor = mejor → invertimos: 1000 - moves)
    setHighScore(GAME_ID, Math.max(0, 1000 - moves));
    msgEl.textContent += ' ¡Nuevo récord!';
  }
  updateBest();
  render();
}

document.getElementById('reset').addEventListener('click', init);
init();
