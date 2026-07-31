# Notas de bootstrap — proyecto "letras"

Proyecto nuevo, sitio estático simple (sin build), hermano de `../acordes`.
Sirve solo para mostrar letras de canciones con sus acordes. No reusa nada
de `acordes` salvo el componente de cancionero (ver abajo) — no hay lógica
de teoría musical, buscador de acordes, ni lecciones acá.

## Qué se trajo de "acordes" y qué no

- **Sí:** `assets/song-sheet.js`, copiado tal cual desde `acordes/assets/song-sheet.js`.
  Es un custom element `<song-sheet>` que encapsula en Shadow DOM el estilo del
  cancionero (letra + acordes anclados sobre las sílabas). Contrato de markup
  documentado en el comentario de cabecera del propio archivo.
- **No:** buscador de acordes, diagramas, quiz, extensión de browser, lecciones.
  Si en algún momento se quiere mostrar un diagrama de acorde al lado de la
  letra, ese componente (`chord-diagram.js` + `chords-db.js`) también vive en
  `acordes/assets/` y se podría traer después — no se trajo ahora porque no
  se pidió.
- El header (logo SVG + wordmark) y el estilo de índice (`.toc`) se
  **reimplementaron** a mano en `assets/site.css`, inspirados en
  `acordes/assets/lesson.css` (mismas variables de color/tipografía), pero
  recortados a lo mínimo que este sitio necesita — no es una copia del
  archivo completo (ese tiene mucho de teoría musical: callouts, diagramas
  svguitar, quiz, etc. que acá no aplican).

## Estructura

```
letras/
  index.html              índice de canciones (header + <ol class="toc">)
  assets/
    site.css              header, tipografía, índice
    song-sheet.js          componente <song-sheet> (copia de acordes)
  songs/
    sin-palabritas.html
    chacarera-del-olvido.html
```

Cada página de canción trae el header, un `<h1>` con el título, y un
`<song-sheet>` vacío con un comentario que documenta el contrato de markup
(`.letra` / `.estrofa` / `.seccion` / `.sobre` / `.c`) para que sea fácil
completar la letra real.

## Estado

- Bootstrap probado sirviendo el sitio con `python3 -m http.server` — las
  tres páginas cargan y el `<song-sheet>` monta bien (ver `assets/song-sheet.js`
  para el mecanismo: mueve los hijos del light DOM al shadow root).
- **Falta:** completar la letra + acordes reales de "Sin palabritas" y
  "Chacarera del olvido" dentro del `<song-sheet>` de cada página
  (`songs/sin-palabritas.html`, `songs/chacarera-del-olvido.html`).
- No hay `package.json` ni tooling — es HTML/CSS/JS plano a propósito, igual
  de simple que las páginas de lecciones de `acordes`.
