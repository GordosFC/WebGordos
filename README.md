# Web del club

Web estática hecha con [Astro](https://astro.build). Todos los datos viven en `src/data/*.json`.

## Uso en local
```bash
npm install
npm run dev      # http://localhost:4321/nombre-del-repo/
```

## Cómo añadir datos
- **Jugador nuevo** → `src/data/jugadores.json`
- **Temporada nueva** → `src/data/temporadas.json` (con los `id` de su plantilla)
- **Partido** → `src/data/partidos.json`. Si aún no se ha jugado, pon `golesFavor` y `golesContra` a `null`.
  Las estadísticas, rankings y fichas se calculan solas a partir de `apariciones`.

- **Noticia** → `src/data/noticias.json` (`tipo`: fichaje, premio, partido o general)
- **Gala de premios** → `src/data/premios.json`. Con `estado: "votaciones"` sale el aviso en la portada; al decidir, pon el `ganador` y cambia a `"entregados"`.

## Publicar en GitHub Pages
1. Edita `astro.config.mjs` (`site` y `base`).
2. Sube el proyecto a un repo de GitHub en la rama `main`.
3. En el repo: *Settings → Pages → Source: GitHub Actions*.
4. Cada `git push` a `main` despliega la web automáticamente.
