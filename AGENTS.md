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
   innecesario. La letra no debe ir dentro de una "tarjeta" o contenedor
   visual con borde/fondo/padding extra: el bloque debe respirar directo sobre
   la página para ahorrar espacio horizontal. Como regla de layout, preferí
   `flex`/`grid` con `gap` antes que espaciar siblings con `margin`: el
   contenedor define la separación, no cada elemento según quién lo rodea.
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
    <span class="sobre"><span class="c">Do</span></span>Texto de la línea<br>
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
  nombre del acorde y debe renderizarse en tipografía sans.
- Acorde sin letra debajo (ej. un renglón de introducción instrumental, o un
  acorde de paso al final de un verso): `.sobre` va **vacío**, sin `&nbsp;`
  ni texto de relleno — `<span class="sobre"><span class="c">E7</span></span>`.
  El espaciado entre acordes consecutivos sin letra lo resuelve solo
  `song-sheet.js` (mide el ancho del acorde contra su `.sobre` y agrega el
  `margin-right` que haga falta); inventar `&nbsp;` a mano además queda
  subrayado por el CSS de `.sobre` y se ve como un guión bajo debajo del
  acorde. Si hace falta separar un acorde de una palabra real vecina en la
  misma línea, un espacio normal alcanza — nunca `_`.
- Saltos de línea con `<br>` dentro del mismo `<p class="estrofa">`.

## Plantilla de página nueva

Copiá el boilerplate exacto de una página existente (`songs/sin-palabritas.html`
es la referencia) — mismo header con el logo SVG, mismo `<link>` y los mismos
`<script>` relativos a `../assets/` (en este orden: `vendor/svguitar.umd.js`,
`chords-db.js`, `chord-modal.js`, `song-sheet.js`; los primeros tres habilitan
el diagrama de digitación que se abre al hacer click sobre un acorde). Lo que
cambia por canción:

```html
<title>{Título} · Letras</title>
...
<h1>{Título}</h1>
<p class="lead">{Artista}{, Capo N si aplica}</p>

<song-sheet data-key="{Tonalidad en solfeo español, ej. Re menor}">
<div class="letra">
  <p class="estrofa">
    <span class="seccion">Estrofa 1</span>
    <span class="sobre"><span class="c">{Acorde}</span></span>{Línea 1}<br>
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
(sin números visibles; solo título con link y una descripción breve si hace
falta aclarar algo no obvio, como un pendiente). Los links del sitio deben
verse sin subrayado.

## Tarea: auditar y corregir la alineación de acordes de canciones existentes

Cuando el usuario pida revisar si los acordes de una o varias canciones están
bien alineados con la letra (descuadrados, corridos, mal puestos), no alcanza
con leer el HTML y "ver si parece razonable": hay que comparar carácter a
carácter contra la fuente original, porque el bug más común es sutil y no se
nota a simple vista.

1. **Conseguí el cifrado fuente en texto plano, con columnas.** Para Cifra
   Club, `curl -A "Mozilla/5.0" <url>` y extraé el bloque
   `<pre data-chord-content="true">...</pre>`. Adentro, cada acorde es un
   `<b data-chord-name="...">` y cada línea de letra es texto plano; la
   posición de columna del acorde dentro de su línea de texto (contando
   antes de sacar las etiquetas `<b>`) es la que indica sobre qué sílaba cae,
   igual que en un cifrado ASCII de acorde-sobre-letra. Para Ultimate Guitar
   u otras fuentes sin esta estructura, extraé el bloque de texto plano
   equivalente a mano.
2. **Extraé la secuencia de acordes de la fuente y de la página actual**
   (`grep -o 'data-chord-name="[^"]*"'` contra `grep -o '<span class="c">[^<]*</span>'`)
   y compará. Si no coinciden en cantidad u orden, hay un problema real, no
   una diferencia de estilo.
3. **El bug más frecuente encontrado en este cancionero es un corrimiento en
   cascada**: una línea de la letra que en la fuente no lleva acorde (queda
   sonando el acorde anterior, típico en la segunda mitad de una copla)
   aparece en la página con un acorde igual — y como consecuencia, todos los
   acordes de ahí en adelante quedan pegados una línea más tarde de lo que
   corresponde. Se detecta comparando, línea por línea, qué texto de la
   fuente lleva acorde propio y cuál es continuación sin acorde.
4. **Otro bug frecuente es "amontonar" varios acordes al final de la última
   palabra de la línea** (ej. `...entreg<span class="c">A</span><span
   class="c">B7</span><span class="c">E</span>.`) cuando en la fuente esos
   acordes en realidad caen sobre palabras distintas, más tempranas en la
   línea. Se nota porque hay 2-3 acordes consecutivos sin ninguna letra real
   entre ellos, sobre la cola de una sola palabra.
5. **Reconstruí la línea con un script, no a mano.** Con la columna exacta de
   cada acorde y el texto de la línea, partí la línea en palabras (por
   espacio) y asigná cada acorde a la palabra que contiene su columna;
   cuando dos acordes caen en la misma palabra, el primero se corta donde
   empieza el segundo. Esto reproduce el estilo ya establecido en el
   cancionero (el acorde subraya desde su sílaba hasta el final de la
   palabra) de forma mecánica y sin errores de conteo manual.
6. **Cuando la fuente sólo transcribe una estrofa/estribillo una vez** (y el
   resto dice "se repite" o directamente no vuelve a poner acordes), aplicá
   el mismo patrón a las estrofas repetidas usando la posición
   *proporcional* dentro de la línea (columna del acorde ÷ longitud de la
   línea de referencia × longitud de la línea nueva), no la columna
   absoluta. Dejá un comentario en el HTML aclarando qué quedó verificado
   carácter a carácter contra la fuente y qué se dedujo por patrón, para que
   la próxima auditoría sepa cuánto confiar en cada parte.
7. **No copies ciegamente la fuente si es inconsistente consigo misma**
   (ej. el mismo verso repetido dos veces en la canción trae distinto
   cifrado cada vez, o falta un acorde que en todas las demás repeticiones
   sí aparece) ni si cambia la calidad de un acorde de forma que no encaja
   con el resto (ej. mayor en vez de menor en una canción claramente menor).
   Preferí la versión más consistente con el resto de la canción y dejalo
   anotado en el comentario.
8. Verificá al final que la cantidad de `<span` y `</span>` en el archivo
   coincida (`grep -o '<span' archivo | wc -l` vs `grep -o '</span>' archivo | wc -l`)
   como chequeo rápido de que no quedó ninguna etiqueta mal cerrada.

## Corrección de este documento

Si el usuario corrige el formato, la estructura, o el flujo descrito acá,
actualizá **este archivo** (`AGENTS.md`) para reflejar la corrección — no lo
apliques solo una vez y lo olvides. Es la fuente única de verdad para
cualquier agente que trabaje en este repo; no dupliques su contenido en
otros archivos de configuración específicos de un agente (mantenelos como
punteros cortos a este documento).
