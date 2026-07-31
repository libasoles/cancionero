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
  };

  // Registro. Idempotente por si el script se carga dos veces.
  if (typeof customElements !== 'undefined' && !customElements.get('song-sheet')) {
    customElements.define('song-sheet', SongSheet);
  }
})();
