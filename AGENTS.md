# AGENTS.md — instrucciones para agentes de código en este repo

Este archivo aplica a cualquier agente de IA (Claude Code, Cursor, Copilot,
etc.) que trabaje en este proyecto. Ver `NOTES.md` para el contexto general
del cancionero.

## Tarea: convertir una fuente de acordes en una página del cancionero

Este proyecto (`letras/`) es un cancionero estático: cada canción es una
página en `songs/<slug>.html` que usa el custom element `<song-sheet>`
(`assets/song-sheet.js`) para mostrar la letra con los acordes anclados sobre
las sílabas.

Cuando el usuario pase un link (Ultimate Guitar, Cifra Club, etc.), una
captura de pantalla de una página de acordes, o el texto directamente en el
chat, seguí este flujo.

1. De la fuente (link, imagen, o lo que pegue el usuario), extraé y guardá:
   - Título y artista.
   - Tonalidad (a partir del acorde de "reposo"/tónica que predomina).
   - Capo, si corresponde.
   - Lista de acordes usados.
   - Letra completa con los acordes alineados usando el contrato de
     `<song-sheet>`.
2. Generá la página completa en `songs/<slug>.html`, usando el mismo patrón
   visual y estructural de las páginas ya existentes en `songs/`.
   Priorizá economizar espacio vertical: el título y el subtítulo (`.lead`)
   deben quedar bien juntos y, en general, la página debe aprovechar la mayor
   cantidad de contenido posible dentro de la pantalla sin agregar aire
   innecesario.
3. Agregá o actualizá la entrada correspondiente en `index.html` dentro del
   `<ol class="toc">`, siguiendo el mismo patrón que las entradas existentes.
   Si la canción ya está completa, no agregues una descripción redundante
   diciendo que tiene letra y acordes: eso se sobreentiende. Usá `.desc`
   solo cuando haya algo pendiente o una aclaración realmente útil.
4. Al terminar cada canción, hacé un commit. Si resulta más eficiente, podés
   agrupar varios temas terminados en una misma tanda de commits, pero no
   dejes canciones terminadas sin commitear.
5. Si la canción sale de una fuente concreta, agregá al pie de la página un
   link discreto para visitar esa fuente.

## Contrato de markup de `<song-sheet>`

Documentado en la cabecera de `assets/song-sheet.js`. Resumen:

```html
<song-sheet>
<div class="letra">
  <p class="estrofa">
    <span class="seccion">Estrofa 1</span>
    <span class="sobre"><span class="c">Do</span>&nbsp;&nbsp;&nbsp;</span>Texto de la línea<br>
    Vieja soled<span class="sobre"><span class="c">Fa</span>ad</span>, tan mala compañera<br>
    ...
  </p>
</div>
</song-sheet>

<p class="source-link"><a href="{url-fuente}">Ver fuente</a></p>
```

- Un `.estrofa` por estrofa/sección.
- `.seccion` es la etiqueta visible (Estrofa 1, Estribillo, Puente, etc.).
- `.sobre` envuelve la sílaba sobre la que cae el acorde; `.c` adentro es el
  nombre del acorde y debe renderizarse en tipografía sans. Si el acorde cae
  antes del verso (silencio inicial), se usa `.sobre` con `&nbsp;` en vez de
  texto.
- Saltos de línea con `<br>` dentro del mismo `<p class="estrofa">`.

## Plantilla de página nueva

Copiá el boilerplate exacto de una página existente (`songs/sin-palabritas.html`
es la referencia) — mismo header con el logo SVG, mismo `<link>` y `<script>`
relativos a `../assets/`. Lo que cambia por canción:

```html
<title>{Título} · Letras</title>
...
<h1>{Título}</h1>
<p class="lead">{Artista}{, Capo N si aplica}</p>

<song-sheet data-key="{Tonalidad en solfeo español, ej. Re menor}">
<div class="letra">
  <p class="estrofa">
    <span class="seccion">Estrofa 1</span>
    <span class="sobre"><span class="c">{Acorde}</span>&nbsp;&nbsp;&nbsp;</span>{Línea 1}<br>
    {Línea 2 con markup de acordes}
  </p>
</div>
</song-sheet>
```

`data-key` es obligatorio: el widget de transposición del header lo lee para
mostrar la tonalidad transpuesta (ej. "Mi menor") en vez de un número de
semitonos. Formato exacto: nota en solfeo español (Do, Re, Mi, Fa, Sol, La,
Si, con `#` o `b` si corresponde) + espacio + `mayor` o `menor`.

Mantené el `h1` y `.lead` visualmente compactos, con separación mínima entre
ambos.

Después, agregá la entrada correspondiente en `index.html` dentro del
`<ol class="toc">`, siguiendo el mismo patrón que las entradas existentes
(número correlativo, título con link, y una descripción breve solo si hace
falta aclarar algo no obvio, como un pendiente).

## Corrección de este documento

Si el usuario corrige el formato, la estructura, o el flujo descrito acá,
actualizá **este archivo** (`AGENTS.md`) para reflejar la corrección — no lo
apliques solo una vez y lo olvides. Es la fuente única de verdad para
cualquier agente que trabaje en este repo; no dupliques su contenido en
otros archivos de configuración específicos de un agente (mantenelos como
punteros cortos a este documento).
