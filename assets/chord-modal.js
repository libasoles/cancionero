/* ----- chord-modal.js -----
   Al hacer click sobre un acorde (.c) en cualquier <song-sheet>, muestra una
   modal con el diagrama de digitación (diapasón), usando la base de acordes
   de assets/chords-db.js y el renderer SVG de assets/vendor/svguitar.umd.js
   (ambos extraídos del proyecto hermano "guitar-chords").

   Requiere, en ese orden, cargados antes que este archivo:
     assets/vendor/svguitar.umd.js  (window.svguitar)
     assets/chords-db.js            (window.CHORDS)

   Los .c viven dentro del shadow root de <song-sheet> (ver song-sheet.js), así
   que el listener de click va en document y usa composedPath() para alcanzar
   el elemento real sin importar cuántos shadow roots atraviese. */

(function () {
  'use strict';

  if (!window.CHORDS || !window.svguitar) return;

  var SVG_WIDTH = 400;
  var DEFAULT_SIDE_PADDING = 0.2;
  var DEFAULT_EMPTY_STRING_INDICATOR_SIZE = 0.6;
  var DEFAULT_NUT_WIDTH = 10;

  var DIAGRAM_CONFIG = {
    strings: 6,
    frets: 5,
    fingerSize: 0.75,
    fingerTextSize: 28,
    color: '#1a1a1a',
    backgroundColor: 'transparent',
  };

  // ----- Búsqueda exacta en la base de acordes -----
  // A diferencia del buscador difuso de guitar-chords, acá el nombre ya viene
  // completo y bien formado desde el cifrado de la canción (ej. "Bb7",
  // "F#m"): alcanza con normalizar símbolos/mayúsculas y comparar exacto
  // contra el nombre o algún alias.
  function normalize(s) {
    return String(s == null ? '' : s)
      .replace(/♭/g, 'b')
      .replace(/♯/g, '#')
      .replace(/[△Δ]/g, 'maj')
      .replace(/ø/g, 'm7b5')
      .toLowerCase()
      .replace(/\s+/g, '');
  }

  function findChord(name) {
    var q = normalize(name);
    if (!q) return null;
    for (var i = 0; i < window.CHORDS.length; i++) {
      var chord = window.CHORDS[i];
      var candidates = [chord.name].concat(chord.aliases || []);
      for (var j = 0; j < candidates.length; j++) {
        if (normalize(candidates[j]) === q) return chord;
      }
    }
    return null;
  }

  // ----- Renderer (adaptado de guitar-chords/src/shared/chord-diagram.js) -----
  function hasHeaderOnlyOpenStrings(chord) {
    var hasOpen = false;
    var hasSilent = false;
    chord.fingers.forEach(function (f) {
      if (f[1] === 'o') hasOpen = true;
      if (f[1] === 'x') hasSilent = true;
    });
    return hasOpen && !hasSilent;
  }

  function headerSpacingMetrics() {
    var stringSpacing = (SVG_WIDTH - 2 * SVG_WIDTH * DEFAULT_SIDE_PADDING) / (DIAGRAM_CONFIG.strings - 1);
    var markerSize = DEFAULT_EMPTY_STRING_INDICATOR_SIZE * stringSpacing;
    return { markerSize: markerSize, markerPadding: markerSize / 3 };
  }

  function normalizeHeaderSpacing(svg, chord) {
    if (!svg || !hasHeaderOnlyOpenStrings(chord)) return;
    var viewBox = (svg.getAttribute('viewBox') || '').trim().split(/\s+/).map(Number);
    if (viewBox.length !== 4 || viewBox.some(function (n) { return isNaN(n); })) return;

    var metrics = headerSpacingMetrics();
    var delta = metrics.markerSize + metrics.markerPadding;
    var minX = viewBox[0], minY = viewBox[1], width = viewBox[2], height = viewBox[3];
    var group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    while (svg.firstChild) group.appendChild(svg.firstChild);
    group.setAttribute('transform', 'translate(0 ' + delta + ')');
    svg.appendChild(group);
    svg.setAttribute('viewBox', minX + ' ' + minY + ' ' + width + ' ' + (height + delta));
  }

  function alignOpenStringMarkers(svg) {
    if (!svg) return;
    var root = svg.querySelector('g') || svg;
    var nut = Array.prototype.find.call(root.querySelectorAll('line'), function (line) {
      return line.getAttribute('stroke-width') === String(DEFAULT_NUT_WIDTH);
    });
    if (!nut) return;
    var nutY = Number(nut.getAttribute('y1'));
    if (isNaN(nutY)) return;

    var metrics = headerSpacingMetrics();
    var targetCy = nutY - metrics.markerSize / 2 - metrics.markerPadding - DEFAULT_NUT_WIDTH / 2;
    var targetR = metrics.markerSize / 2;
    root.querySelectorAll('circle.finger-circle[class*="fret-NaN"]').forEach(function (circle) {
      circle.setAttribute('cy', String(targetCy));
      circle.setAttribute('r', String(targetR));
    });
  }

  // svguitar dibuja cada dedo en su traste ABSOLUTO dentro de la ventana de
  // `frets` trastes; en formas subidas (position > 1) hay que restar el
  // offset para que los dedos entren en la ventana visible.
  function toWindowFrets(chord) {
    var offset = (chord.position || 1) - 1;
    if (offset === 0) return { fingers: chord.fingers, barres: chord.barres || [] };
    var fingers = chord.fingers.map(function (finger) {
      return typeof finger[1] === 'number' ? [finger[0], finger[1] - offset, finger[2]] : finger.slice();
    });
    var barres = (chord.barres || []).map(function (barre) {
      return { fromString: barre.fromString, toString: barre.toString, fret: barre.fret - offset };
    });
    return { fingers: fingers, barres: barres };
  }

  function renderDiagram(target, chord) {
    var windowed = toWindowFrets(chord);
    new window.svguitar.SVGuitarChord(target)
      .configure(DIAGRAM_CONFIG)
      .chord({ fingers: windowed.fingers, barres: windowed.barres, position: chord.position })
      .draw();

    var svg = target.querySelector('svg');
    normalizeHeaderSpacing(svg, chord);
    alignOpenStringMarkers(svg);
  }

  // ----- Modal -----
  var overlay = null;
  var lastFocused = null;

  function buildModal() {
    overlay = document.createElement('div');
    overlay.className = 'chord-modal-overlay';
    overlay.innerHTML =
      '<div class="chord-modal" role="dialog" aria-modal="true" aria-labelledby="chord-modal-name">' +
      '<button type="button" class="chord-modal-close" aria-label="Cerrar">&times;</button>' +
      '<h2 class="chord-modal-name" id="chord-modal-name"></h2>' +
      '<p class="chord-modal-notes"></p>' +
      '<div class="chord-modal-diagram"></div>' +
      '</div>';
    document.body.appendChild(overlay);

    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closeModal();
    });
    overlay.querySelector('.chord-modal-close').addEventListener('click', closeModal);
  }

  function closeModal() {
    if (!overlay || !overlay.classList.contains('is-open')) return;
    overlay.classList.remove('is-open');
    document.removeEventListener('keydown', onKeydown);
    if (lastFocused && typeof lastFocused.focus === 'function') lastFocused.focus();
  }

  function onKeydown(e) {
    if (e.key === 'Escape') closeModal();
  }

  function openModal(chordName) {
    if (!overlay) buildModal();

    var chord = findChord(chordName);
    var diagramEl = overlay.querySelector('.chord-modal-diagram');
    var notesEl = overlay.querySelector('.chord-modal-notes');
    diagramEl.innerHTML = '';
    overlay.querySelector('.chord-modal-name').textContent = chordName;

    if (chord) {
      notesEl.textContent = chord.notes || '';
      notesEl.hidden = !chord.notes;
      try {
        renderDiagram(diagramEl, chord);
      } catch (err) {
        diagramEl.textContent = 'No se pudo dibujar el diagrama.';
      }
    } else {
      notesEl.hidden = true;
      diagramEl.textContent = 'Diagrama no disponible para este acorde.';
    }

    lastFocused = document.activeElement;
    overlay.classList.add('is-open');
    overlay.querySelector('.chord-modal-close').focus();
    document.addEventListener('keydown', onKeydown);
  }

  document.addEventListener('click', function (e) {
    var path = typeof e.composedPath === 'function' ? e.composedPath() : [e.target];
    var el = null;
    for (var i = 0; i < path.length; i++) {
      var node = path[i];
      if (node.nodeType === 1 && node.classList && node.classList.contains('c')) {
        el = node;
        break;
      }
    }
    if (!el) return;
    var text = el.textContent.replace(/ /g, ' ').trim();
    if (!text) return;
    openModal(text);
  });
})();
