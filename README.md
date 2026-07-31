# Cancionero

Proyecto personal.

No es para revisión de recruiters. No hay nada de código escrito por mí.

## Estructura

- `index.html`: índice de canciones.
- `songs/`: una página HTML por canción.
- `assets/`: estilos y scripts del sitio, incluido `<song-sheet>`.

## Cómo levantarlo

No tiene build, dependencias ni `package.json`. Es HTML, CSS y JS plano.

Desde la raíz del proyecto:

```bash
python3 -m http.server 8000
```

Después abrí:

```text
http://localhost:8000
```

Si preferís otro puerto, cambiá `8000` por el que quieras.
