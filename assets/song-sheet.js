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
    '/* Átomo de acorde: color + peso. Los nombres de acordes van siempre en sans. */',
    '.c {',
    '  color: var(--accent, #8b0000);',
    '  font-family: var(--sans, -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif);',
    '  font-weight: 700;',
    '  cursor: pointer;',
    '}',
    '.c:hover, .c:focus-visible {',
    '  text-decoration: underline;',
    '}',
    '',
    '/* Bloque de letra: sólo aporta el interlineado para que el acorde tenga',
    '   aire arriba de cada línea. */',
    '.letra {',
    '  font-family: var(--serif, Georgia, "Times New Roman", serif);',
    '  font-size: 1.35rem;',
    '  line-height: 3.1;',
    '  white-space: normal;',
    '  margin: 0.55rem 0 1.1rem;',
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
    '  margin: 0 0 1.35rem;',
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
    ':host([data-chords-hidden="true"]) .letra {',
    '  line-height: 1.7;',
    '}',
    ':host([data-chords-hidden="true"]) .letra .seccion {',
    '  margin-bottom: 0.9rem;',
    '}',
    ':host([data-chords-hidden="true"]) .letra .sobre {',
    '  display: inline;',
    '  text-decoration: none;',
    '}',
    ':host([data-chords-hidden="true"]) .letra .sobre .c {',
    '  display: none;',
    '}',
    ':host([data-chords-hidden="true"]) .letra .sobre[data-chord-only="true"] {',
    '  display: none;',
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

  // La tonalidad (data-key="Re menor") se anota en solfeo español, distinto
  // de las letras (C, D, E...) que usan los .c. Se transpone por separado y
  // se muestra en el widget: el usuario reconoce "Mi menor", no un desplazo
  // en semitonos.
  var SHARP_NAMES_ES = ['Do', 'Do#', 'Re', 'Re#', 'Mi', 'Fa', 'Fa#', 'Sol', 'Sol#', 'La', 'La#', 'Si'];
  var FLAT_NAMES_ES = ['Do', 'Reb', 'Re', 'Mib', 'Mi', 'Fa', 'Solb', 'Sol', 'Lab', 'La', 'Sib', 'Si'];
  var NOTE_INDEX_ES = {
    Do: 0, 'Do#': 1, Reb: 1, Re: 2, 'Re#': 3, Mib: 3, Mi: 4, Fa: 5,
    'Fa#': 6, Solb: 6, Sol: 7, 'Sol#': 8, Lab: 8, La: 9, 'La#': 10, Sib: 10, Si: 11
  };
  var KEY_RE = /^(Do|Re|Mi|Fa|Sol|La|Si)(#|b)?\s+(mayor|menor)$/i;

  function transposeKeyName(keyText, semitones, useFlats) {
    var m = KEY_RE.exec(keyText.trim());
    if (!m) return null;
    var root = m[1].charAt(0).toUpperCase() + m[1].slice(1).toLowerCase() + (m[2] || '');
    var idx = NOTE_INDEX_ES[root];
    if (idx === undefined) return null;
    var newIdx = ((idx + semitones) % 12 + 12) % 12;
    var names = useFlats ? FLAT_NAMES_ES : SHARP_NAMES_ES;
    return names[newIdx] + ' ' + m[3].toLowerCase();
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

    this._root = root;
    this._markChordOnlySpans(root);
    this._preventChordOverlap(root);
    this._mountTranspose(root);
    this._mountChordToggle();
  };

  SongSheet.prototype._markChordOnlySpans = function (root) {
    var spans = root.querySelectorAll('.sobre');
    for (var i = 0; i < spans.length; i++) {
      var text = spans[i].textContent.replace(/\u00a0/g, ' ').trim();
      if (!text) spans[i].dataset.chordOnly = 'true';
    }
  };

  // Regla general anti-solape: el acorde (.c) flota con position:absolute
  // sobre su .sobre, as\u00ed que su ancho real NO empuja al contenido siguiente.
  // Si el nombre del acorde es m\u00e1s ancho que la s\u00edlaba (o el hueco) que lo
  // sostiene \u2014t\u00edpicamente acordes de dos+ caracteres sobre una sola letra, o
  // varios acordes seguidos sin letra debajo, como en una introducci\u00f3n\u2014
  // termina superpuesto con el pr\u00f3ximo acorde o palabra. En vez de contar
  // &nbsp; a mano por canci\u00f3n (fr\u00e1gil: cualquier acorde nuevo puede volver a
  // romperlo), medimos el ancho real de cada acorde contra su .sobre despu\u00e9s
  // de cada render y agregamos el margin-right que haga falta para separarlos.
  // Corre en el mount inicial y cada vez que la transposici\u00f3n cambia el
  // texto de los acordes (un acorde transpuesto puede ser m\u00e1s ancho, ej. "A"
  // -> "A#").
  SongSheet.prototype._preventChordOverlap = function (root) {
    var GAP = 4;
    var sobres = (root || this._root).querySelectorAll('.letra .sobre');
    for (var i = 0; i < sobres.length; i++) {
      var sobre = sobres[i];
      var chord = sobre.querySelector('.c');
      if (!chord) continue;
      sobre.style.marginRight = '';
      var overflow = chord.offsetWidth - sobre.offsetWidth;
      if (overflow > 0) {
        sobre.style.marginRight = (overflow + GAP) + 'px';
      }
    }
  };

  // Widget de transposición: vive en el header de la página (no en el shadow
  // root), al lado del logo, para no ocupar espacio propio arriba de la
  // letra. Sube o baja medio tono todos los .c del shadow root. Guardamos el
  // nombre original de cada acorde en un dataset para recalcular siempre
  // desde la fuente y evitar que redondeos se acumulen entre clics. El
  // indicador central tiene ancho fijo y muestra la tonalidad transpuesta
  // (ej. "Mi menor"); si no hay data-key (página vieja o valor no parseable)
  // cae a mostrar el desplazo en semitonos, para no dejar el widget vacío.
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

    var originalKey = this.dataset.key || '';

    var widget = document.createElement('div');
    widget.className = 'transpose';
    widget.innerHTML =
      '<button type="button" class="t-down" aria-label="Bajar medio tono">−</button>' +
      '<button type="button" class="t-current" aria-label="Restablecer tono original" title="Restablecer tono original">' +
        (originalKey || '0') + '</button>' +
      '<button type="button" class="t-up" aria-label="Subir medio tono">+</button>';
    header.appendChild(widget);

    var current = widget.querySelector('.t-current');
    var semitones = 0;
    var host = this;
    var storageKey = 'song-sheet:transpose:' + window.location.pathname;

    function readStoredSemitones() {
      try {
        var raw = window.localStorage.getItem(storageKey);
        if (raw == null) return 0;
        var parsed = parseInt(raw, 10);
        return isNaN(parsed) ? 0 : parsed;
      } catch (err) {
        return 0;
      }
    }

    function writeStoredSemitones(value) {
      try {
        if (value === 0) {
          window.localStorage.removeItem(storageKey);
        } else {
          window.localStorage.setItem(storageKey, String(value));
        }
      } catch (err) {}
    }

    function render() {
      for (var i = 0; i < chords.length; i++) {
        chords[i].textContent = transposeChord(chords[i].dataset.original, semitones, useFlats);
      }
      var keyName = originalKey ? transposeKeyName(originalKey, semitones, useFlats) : null;
      current.textContent = keyName || (semitones === 0 ? '0' : (semitones > 0 ? '+' + semitones : String(semitones)));
      current.classList.toggle('is-transposed', semitones !== 0);
      writeStoredSemitones(semitones);
      // Un acorde transpuesto puede cambiar de ancho (ej. "A" -> "A#"), así
      // que hay que recalcular la regla anti-solape en cada transposición.
      host._preventChordOverlap(root);
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

    semitones = readStoredSemitones();
    render();
  };

  SongSheet.prototype._mountChordToggle = function () {
    var title = document.querySelector('h1');
    if (!title) return;

    var bar = title.parentNode && title.parentNode.classList && title.parentNode.classList.contains('song-titlebar')
      ? title.parentNode
      : null;

    if (!bar) {
      bar = document.createElement('div');
      bar.className = 'song-titlebar';
      title.parentNode.insertBefore(bar, title);
      bar.appendChild(title);
    }

    if (bar.querySelector('.chord-toggle')) return;

    var toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'chord-toggle';
    toggle.setAttribute('aria-pressed', 'true');
    toggle.setAttribute('aria-label', 'Ocultar acordes');
    toggle.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' +
      '<path d="m11.9 12.1 4.514-4.514"></path>' +
      '<path d="M20.1 2.3a1 1 0 0 0-1.4 0l-1.114 1.114A2 2 0 0 0 17 4.828v1.344a2 2 0 0 1-.586 1.414A2 2 0 0 1 17.828 7h1.344a2 2 0 0 0 1.414-.586L21.7 5.3a1 1 0 0 0 0-1.4z"></path>' +
      '<path d="m6 16 2 2"></path>' +
      '<path d="M8.23 9.85A3 3 0 0 1 11 8a5 5 0 0 1 5 5 3 3 0 0 1-1.85 2.77l-.92.38A2 2 0 0 0 12 18a4 4 0 0 1-4 4 6 6 0 0 1-6-6 4 4 0 0 1 4-4 2 2 0 0 0 1.85-1.23z"></path>' +
      '</svg>';
    bar.appendChild(toggle);

    var host = this;
    toggle.addEventListener('click', function () {
      var hidden = host.getAttribute('data-chords-hidden') === 'true';
      if (hidden) {
        host.removeAttribute('data-chords-hidden');
        toggle.setAttribute('aria-pressed', 'true');
        toggle.setAttribute('aria-label', 'Ocultar acordes');
        // Los acordes vuelven a mostrarse: recalcular la separación anti-solape.
        host._preventChordOverlap(host._root);
      } else {
        host.setAttribute('data-chords-hidden', 'true');
        toggle.setAttribute('aria-pressed', 'false');
        toggle.setAttribute('aria-label', 'Mostrar acordes');
        // Con los acordes ocultos el margin-right sólo agregaría espacio
        // extra entre palabras sin motivo visible: lo limpiamos.
        var sobres = host._root.querySelectorAll('.letra .sobre');
        for (var i = 0; i < sobres.length; i++) sobres[i].style.marginRight = '';
      }
    });
  };

  // Registro. Idempotente por si el script se carga dos veces.
  if (typeof customElements !== 'undefined' && !customElements.get('song-sheet')) {
    customElements.define('song-sheet', SongSheet);
  }
})();
