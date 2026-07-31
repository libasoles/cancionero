---
name: song-audit
description: Audita si los acordes de una o varias canciones del cancionero están bien alineados con la letra, comparando contra la fuente original (Cifra Club, Ultimate Guitar, etc.), y corrige lo que esté descuadrado.
---

Las instrucciones completas para esta tarea viven en `AGENTS.md` (raíz del
repo), sección "Tarea: auditar y corregir la alineación de acordes de
canciones existentes" — es el documento universal para cualquier agente que
trabaje acá, no solo Claude Code. Leelo antes de auditar una canción: explica
cómo conseguir el cifrado fuente con columnas exactas, los dos bugs más
frecuentes encontrados en este cancionero (corrimiento en cascada por una
línea sin acorde, y acordes amontonados al final de la última palabra), y
cómo reconstruir la línea mecánicamente en vez de a ojo.

Si el usuario corrige el método de auditoría o el criterio de corrección,
actualizá `AGENTS.md` (no este archivo).
