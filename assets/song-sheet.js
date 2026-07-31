/* ----- song-sheet.js -----
   Custom element <song-sheet>: cancionero con la letra y los acordes anclados
   sobre las sílabas (markup .letra / .sobre / .c), con TODO su estilado —pantalla
   e impresión— ENCAPSULADO en el Shadow DOM. Se puede soltar en cualquier página
   sin que el CSS del cancionero se filtre ni dependa de que otra hoja lo defina.

   Contrato de entrada (lo que el autor escribe adentro del elemento):
     <song-sheet>
       <div class="letra">
         <p class="estrofa">
           <span class="seccion">Copla I</span>
           <span class="sobre"><span class="c">Do7</span>&nbsp;&nbsp;&nbsp;</span>Vieja soled<span class="sobre"><span class="c">Fa</span>ad</span>,<br>
           ...
         </p>
       </div>
     </song-sheet>
   Ese markup ya resuelve casos que ChordPro no cubre: el acorde ANTES del verso
   (sobre espacios/&nbsp; iniciales) y el acorde A MITAD DE PALABRA. Cada .sobre
   subraya la sílaba y ancla su .c justo encima (position:absolute; left:0). Como
   ese anclaje es puramente CSS/layout, migrarlo al shadow root NO cambia dónde cae
   el acorde: sigue cayendo sobre el arranque de la sílaba subrayada.

   Mecanismo de adopción:
   - ::slotted() sólo llega al hijo directo slotteado, NO a los descendientes
     anidados (el .c dentro del .sobre), así que un <slot> + ::slotted no alcanza
     para estilar el cancionero encapsulado.
   - Por eso, al conectar MOVEMOS los child nodes del light DOM al shadow root
     (appendChild los reparenta). Quedan bajo el <style> encapsulado y el CSS
     aplica de verdad a toda la jerarquía. Movemos (no clonamos) para no duplicar
     nodos ni IDs; el elemento queda con su contenido en el shadow root.

   Limitación conocida (integración futura, fuera de alcance de esta slice):
   - El tooltip de diapasón (assets/chord-tooltip.js) busca los .c por el DOCUMENTO
     (document.querySelectorAll('.c')); no atraviesa shadow roots. Con el cifrado
     adentro del shadow root, el tooltip global NO alcanza estos .c. No rompe nada
     del resto de la lección (los .c fuera de <song-sheet> siguen funcionando).
     Integrarlo (que el componente cablee el tooltip a su propio shadow root) es
     una slice posterior. */

(function () {
  'use strict';

  // CSS del cancionero, migrado desde assets/lesson.css (sección "Letra estilo
  // cancionero"). Tematizado con var(--token, fallback): hereda los tokens de
  // lesson.css cuando la página los define, y se ve bien sin lesson.css gracias
  // a los fallbacks. Incluye el átomo .c (color de acorde) porque acá los .c
  // viven dentro del shadow root y no los alcanza la regla global.
  var STYLES = [
    ':host { display: block; }',
    '*, *::before, *::after { box-sizing: border-box; }',
    '',
    '/* Átomo de acorde: color + peso. En el sitio hereda --accent de lesson.css. */',
    '.c { color: var(--accent, #8b0000); font-weight: 700; }',
    '',
    '/* Bloque de letra: sólo aporta el interlineado para que el acorde tenga',
    '   aire arriba de cada línea. */',
    '.letra {',
    '  font-family: var(--serif, Georgia, "Times New Roman", serif);',
    '  font-size: 1.35rem;',
    '  line-height: 3.1;',
    '  background: #fff;',
    '  border: 1px solid var(--rule, #d8d2c4);',
    '  border-left: 3px solid var(--accent, #8b0000);',
    '  border-radius: 4px;',
    '  padding: 1rem 1.2rem;',
    '  margin: 0.9rem 0 1.3rem;',
    '}',
    '.letra .estrofa { margin: 0 0 1.2rem; }',
    '.letra .estrofa:last-child { margin-bottom: 0; }',
    '.letra .seccion {',
    '  display: block;',
    '  font-family: var(--sans, -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif);',
    '  font-size: 0.7rem;',
    '  text-transform: uppercase;',
    '  letter-spacing: 0.08em;',
    '  color: var(--ink-soft, #555);',
    '  line-height: 1.6;',
    '  margin: 0 0 2rem;',
    '}',
    '/* .sobre: envoltorio que ancla y subraya la sílaba donde cae el acorde. */',
    '.letra .sobre {',
    '  position: relative;',
    '  display: inline-block;',
    '  line-height: 1.15;',
    '  vertical-align: baseline;',
    '  text-decoration: underline;',
    '  text-decoration-thickness: 1px;',
    '  text-underline-offset: 3px;',
    '}',
    '/* El acorde se imprime justo encima del arranque de la sílaba (left:0). */',
    '.letra .sobre .c {',
    '  position: absolute;',
    '  left: 0;',
    '  bottom: 100%;',
    '  text-decoration: none;',
    '  font-size: 0.72em;',
    '  line-height: 1;',
    '  white-space: nowrap;',
    '  letter-spacing: 0.01em;',
    '}',
    '',
    '/* ----- Impresión ----- */',
    '/* El cancionero se imprime como en pantalla; sólo neutralizamos el fondo',
    '   para no gastar tinta y forzamos color exacto en el borde de acento. */',
    '@media print {',
    '  .letra {',
    '    background: transparent;',
    '    -webkit-print-color-adjust: exact;',
    '    print-color-adjust: exact;',
    '  }',
    '}',
  ].join('\n');

  // ----- Transposición de acordes -----
  // Notas con sostenidos y con bemoles; se elige una de las dos grafías según
  // lo que ya use la canción (si el cifrado original trae bemoles, se
  // transpone en bemoles; si no, en sostenidos), para no cambiarle el "acento"
  // a una tonalidad que el usuario ya reconoce (ej. Bb en vez de A#).
  var SHARP_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  var FLAT_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
  var NOTE_INDEX = {
    C: 0, 'B#': 0,
    'C#': 1, Db: 1,
    D: 2,
    'D#': 3, Eb: 3,
    E: 4, Fb: 4,
    F: 5, 'E#': 5,
    'F#': 6, Gb: 6,
    G: 7,
    'G#': 8, Ab: 8,
    A: 9,
    'A#': 10, Bb: 10,
    B: 11, Cb: 11
  };
  var ROOT_RE = /^([A-G])([#b]?)/;

  // Transpone la raíz de un fragmento de acorde (ej. "Am7" -> raíz "A" +
  // sufijo "m7"); deja el sufijo intacto porque no afecta la nota.
  function transposePart(part, semitones, useFlats) {
    var m = ROOT_RE.exec(part);
    if (!m) return part;
    var root = m[1] + m[2];
    var idx = NOTE_INDEX[root];
    if (idx === undefined) return part;
    var suffix = part.slice(m[0].length);
    var newIdx = ((idx + semitones) % 12 + 12) % 12;
    var names = useFlats ? FLAT_NAMES : SHARP_NAMES;
    return names[newIdx] + suffix;
  }

  // Un acorde puede traer bajo ("G/B"): se transponen ambos lados por
  // separado porque cada uno es una nota independiente.
  function transposeChord(text, semitones, useFlats) {
    return text.split('/').map(function (part) {
      return transposePart(part, semitones, useFlats);
    }).join('/');
  }

  class SongSheet extends HTMLElement {}

  SongSheet.prototype.connectedCallback = function () {
    if (this._mounted) return;
    this._mounted = true;

    if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
    var root = this.shadowRoot;

    // Inyectamos el CSS encapsulado.
    var style = document.createElement('style');
    style.textContent = STYLES;
    root.appendChild(style);

    // Adoptamos el cifrado: movemos los child nodes del light DOM al shadow root.
    // appendChild reparenta (mueve, no copia), así que el CSS de arriba aplica a
    // toda la jerarquía .letra/.sobre/.c sin duplicar nodos. Si no hay contenido
    // (uso vacío), no pasa nada.
    while (this.firstChild) {
      root.appendChild(this.firstChild);
    }

    this._mountTranspose(root);
  };

  // Widget de transposición: vive en el header de la página (no en el shadow
  // root), al lado del logo, para no ocupar espacio propio arriba de la
  // letra. Sube o baja medio tono todos los .c del shadow root. Guardamos el
  // nombre original de cada acorde en un dataset para recalcular siempre
  // desde la fuente y evitar que redondeos se acumulen entre clics. El
  // indicador central tiene ancho fijo y siempre es un número (nunca aparece
  // ni desaparece texto), para que no haya layout shift al usarlo.
  SongSheet.prototype._mountTranspose = function (root) {
    var chords = root.querySelectorAll('.c');
    var header = document.querySelector('.site-header');
    if (!chords.length || !header || header.querySelector('.transpose')) return;

    var useFlats = false;
    var hasSharp = false;
    for (var i = 0; i < chords.length; i++) {
      var text = chords[i].textContent;
      chords[i].dataset.original = text;
      if (text.indexOf('b') !== -1 && ROOT_RE.test(text)) useFlats = true;
      if (text.indexOf('#') !== -1) hasSharp = true;
    }
    if (hasSharp) useFlats = false;

    var widget = document.createElement('div');
    widget.className = 'transpose';
    widget.innerHTML =
      '<button type="button" class="t-down" aria-label="Bajar medio tono">−</button>' +
      '<button type="button" class="t-current" aria-label="Restablecer tono original" title="Restablecer tono original">0</button>' +
      '<button type="button" class="t-up" aria-label="Subir medio tono">+</button>';
    header.appendChild(widget);

    var current = widget.querySelector('.t-current');
    var semitones = 0;

    function render() {
      for (var i = 0; i < chords.length; i++) {
        chords[i].textContent = transposeChord(chords[i].dataset.original, semitones, useFlats);
      }
      current.textContent = semitones === 0 ? '0' : (semitones > 0 ? '+' + semitones : String(semitones));
    }

    widget.querySelector('.t-down').addEventListener('click', function () {
      semitones -= 1;
      render();
    });
    widget.querySelector('.t-up').addEventListener('click', function () {
      semitones += 1;
      render();
    });
    current.addEventListener('click', function () {
      semitones = 0;
      render();
    });
  };

  // Registro. Idempotente por si el script se carga dos veces.
  if (typeof customElements !== 'undefined' && !customElements.get('song-sheet')) {
    customElements.define('song-sheet', SongSheet);
  }
})();
