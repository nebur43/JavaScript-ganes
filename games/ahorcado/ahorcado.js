import { initTheme } from '../../assets/js/theme.js';
import { initSound, sfx } from '../../assets/js/sound.js';
import { getHighScore, setHighScore } from '../../assets/js/storage.js';

initTheme();
initSound();

const GAME_ID = 'ahorcado';

const WORDS = [
  'JAVASCRIPT', 'COMPUTADORA', 'TECLADO', 'MONITOR', 'PROGRAMACION',
  'TELEFONO', 'INTERNET', 'NAVEGADOR', 'PANTALLA', 'RATON',
  'PIZARRA', 'BIBLIOTECA', 'MONTAÑA', 'CARRETERA', 'BICICLETA',
  'AVENTURA', 'CASTILLO', 'GUITARRA', 'PELICULA', 'CONCIERTO',
  'CIENCIA', 'GALAXIA', 'PLANETA', 'TORMENTA', 'VOLCAN',
  'OCEANO', 'DESIERTO', 'BOSQUE', 'CIUDAD', 'PUENTE',
  'ESTRELLA', 'MARIPOSA', 'ELEFANTE', 'CABALLO', 'TIBURON',
  'MANZANA', 'BANANA', 'NARANJA', 'CHOCOLATE', 'CAFE',
  'AMISTAD', 'FAMILIA', 'TRABAJO', 'ESCUELA', 'UNIVERSIDAD',
  'AVENIDA', 'CAMINO', 'PUERTA', 'VENTANA', 'BALCON',
  'CALENDARIO', 'RELOJ', 'TELESCOPIO', 'MICROSCOPIO', 'BATERIA',
  'ENERGIA', 'ELECTRICIDAD', 'MAGNETICO', 'GRAVEDAD', 'VELOCIDAD',
  'PARTIDO', 'VICTORIA', 'CAMPEONATO', 'JUGADOR', 'ENTRENADOR',
  'PINCEL', 'CUADRO', 'ESCULTURA', 'MUSEO', 'PALACIO',
  'GUITARRA', 'BATERIA', 'PIANO', 'VIOLIN', 'TROMPETA',
  'NOVELA', 'POEMA', 'AUTOR', 'LECTOR', 'ESCRITOR',
  'AEROPUERTO', 'TREN', 'AUTOBUS', 'BARCO', 'METRO',
];

const ALPHABET = 'ABCDEFGHIJKLMNÑOPQRSTUVWXYZ'.split('');
const MAX_ERRORS = 6;

const wordEl = document.getElementById('word');
const livesEl = document.getElementById('lives');
const winsEl = document.getElementById('wins');
const kbEl = document.getElementById('keyboard');
const msgEl = document.getElementById('msg');
const gallowsEl = document.getElementById('gallows');

let secret, guessed, errors, over;
let wins = getHighScore(GAME_ID);

function normalize(c) {
  return c.toUpperCase().replace('Á','A').replace('É','E').replace('Í','I').replace('Ó','O').replace('Ú','U').replace('Ü','U');
}

function init() {
  secret = WORDS[Math.floor(Math.random() * WORDS.length)];
  guessed = new Set();
  errors = 0;
  over = false;
  msgEl.textContent = '';
  livesEl.textContent = MAX_ERRORS - errors;
  winsEl.textContent = wins;
  renderWord();
  renderKeyboard();
  drawGallows();
}

function renderWord() {
  wordEl.innerHTML = '';
  for (const ch of secret) {
    const span = document.createElement('span');
    span.className = 'letter';
    if (guessed.has(ch) || ch === ' ' || ch === '-') {
      span.textContent = ch;
      span.classList.add('revealed');
    } else {
      span.innerHTML = '&nbsp;';
    }
    wordEl.appendChild(span);
  }
}

function renderKeyboard() {
  kbEl.innerHTML = '';
  for (const letter of ALPHABET) {
    const b = document.createElement('button');
    b.textContent = letter;
    if (guessed.has(letter)) {
      b.classList.add('used');
      b.classList.add(secret.includes(letter) ? 'hit' : 'miss');
      b.disabled = true;
    } else {
      b.addEventListener('click', () => guess(letter));
    }
    kbEl.appendChild(b);
  }
}

function guess(letter) {
  if (over || guessed.has(letter)) return;
  guessed.add(letter);
  if (secret.includes(letter)) {
    sfx.pop();
    if ([...secret].every(ch => ch === ' ' || ch === '-' || guessed.has(ch))) {
      over = true;
      wins++;
      setHighScore(GAME_ID, wins);
      msgEl.textContent = `¡Has ganado! Era "${secret}"`;
      sfx.win();
    }
  } else {
    errors++;
    sfx.fail();
    if (errors >= MAX_ERRORS) {
      over = true;
      msgEl.textContent = `Perdiste 😔 Era "${secret}"`;
    }
  }
  livesEl.textContent = MAX_ERRORS - errors;
  winsEl.textContent = wins;
  renderWord();
  renderKeyboard();
  drawGallows();
}

function drawGallows() {
  const stroke = getComputedStyle(document.documentElement).getPropertyValue('--fg').trim();
  const danger = getComputedStyle(document.documentElement).getPropertyValue('--bad').trim();
  // Líneas siempre visibles
  let svg = `
    <line x1="20" y1="200" x2="180" y2="200" stroke="${stroke}" stroke-width="3" />
    <line x1="50" y1="200" x2="50" y2="20" stroke="${stroke}" stroke-width="3" />
    <line x1="50" y1="20" x2="130" y2="20" stroke="${stroke}" stroke-width="3" />
    <line x1="130" y1="20" x2="130" y2="40" stroke="${stroke}" stroke-width="3" />
  `;
  // Partes del muñeco progresivas
  const parts = [
    `<circle cx="130" cy="55" r="14" stroke="${danger}" stroke-width="3" fill="none" />`, // cabeza
    `<line x1="130" y1="69" x2="130" y2="120" stroke="${danger}" stroke-width="3" />`,    // torso
    `<line x1="130" y1="80" x2="110" y2="105" stroke="${danger}" stroke-width="3" />`,    // brazo izq
    `<line x1="130" y1="80" x2="150" y2="105" stroke="${danger}" stroke-width="3" />`,    // brazo der
    `<line x1="130" y1="120" x2="115" y2="150" stroke="${danger}" stroke-width="3" />`,   // pierna izq
    `<line x1="130" y1="120" x2="145" y2="150" stroke="${danger}" stroke-width="3" />`,   // pierna der
  ];
  for (let i = 0; i < Math.min(errors, parts.length); i++) svg += parts[i];
  gallowsEl.innerHTML = svg;
}

window.addEventListener('keydown', (e) => {
  if (e.key.length !== 1) return;
  const ch = normalize(e.key);
  if (ALPHABET.includes(ch)) guess(ch);
});

document.getElementById('reset').addEventListener('click', init);
init();
