# JavaScript-ganes

Colección de 8 mini-juegos clásicos en JavaScript vanilla, jugables tanto en móvil (controles táctiles) como en escritorio (teclado/ratón). Sin dependencias, sin build step.

**[Jugar ahora →](https://nebur43.github.io/JavaScript-ganes/)**

## Juegos incluidos

| Juego          | Controles desktop                | Controles móvil                  |
|----------------|----------------------------------|----------------------------------|
| 🐍 Snake        | Flechas / WASD                   | Swipe sobre el tablero           |
| 🟦 Tetris       | ←/→ ↑ ↓ Espacio                  | D-pad virtual (botón rota)       |
| 🔢 2048         | Flechas / WASD                   | Swipe sobre el tablero           |
| ❌ Tres en raya | Click                            | Tap                              |
| 🧠 Memorice     | Click                            | Tap                              |
| 🏓 Pong         | ↑/↓ o W/S                        | Arrastrar el dedo sobre el lado  |
| 🔤 Ahorcado     | Teclado físico                   | Teclado virtual en pantalla      |
| 🔴 Conecta 4    | Click en una columna             | Tap en una columna               |

## Características

- Tema oscuro/claro con toggle (persistido en `localStorage`).
- Récords guardados localmente por juego.
- Efectos de sonido sintéticos con Web Audio API (mute persistido).
- Diseño responsive 100% sin frameworks.

## Cómo ejecutar

Cualquier servidor estático sirve. Ejemplos:

```bash
# Python 3
python3 -m http.server 8000

# Node (con npx)
npx serve .
```

Abre `http://localhost:8000` en el navegador. Para probar móvil, usa el modo dispositivo de las DevTools o accede desde el teléfono al `http://<ip-de-tu-pc>:8000`.

## Despliegue

Compatible con GitHub Pages directamente: activa Pages apuntando a la rama y al directorio raíz.

## Estructura

```
.
├── index.html            # Hub con todas las tarjetas de juego
├── assets/
│   ├── css/{base.css, game.css}
│   └── js/{storage.js, theme.js, sound.js, input.js}
└── games/<juego>/{index.html, <juego>.js}
```
