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

- **Noticia** → `src/data/noticias.json` (`tipo`: fichaje, premio, partido o general). Fotos: guárdalas en `public/noticias/<id-de-la-noticia>/` y lístalas en `"fotos": ["a.jpg", "b.jpg"]`. La principal se indica con `"portada": "a.jpg"` (si no, se usa la primera) y es la que sale en la portada de la web junto al titular. Con `"destacada": true` sale en el carrusel de la portada (máx. 5; si no marcas ninguna, salen las 3 últimas). Reduce las fotos antes de subirlas (≈1600 px de ancho).
- **Gala de premios** → `src/data/premios.json`. Con `estado: "votaciones"` sale el aviso en la portada; al decidir, pon el `ganador` y cambia a `"entregados"`.

- **Partidos**: cada partido lleva `split` (1, 2 o 3) y `fase` (`"grupos"` o `"playoff"`). Los de grupos llevan además `jornada`.
- **Resultados de los demás equipos de tu grupo** → `src/data/grupos.json`, uno por temporada y split, solo con el marcador. Con `"grupoFinalizado": true` se decide si estás clasificado para el play-off (los dos primeros).
- **Play-off**: añade un partido con `"fase": "playoff"` y el split correspondiente. Si no lo hay y el grupo ha terminado, sale "No clasificado" (o "Clasificados" si estás entre los dos primeros).
- El nombre de tu club se cambia en `src/lib/stats.ts` (`nombreClub`). Los rivales deben escribirse igual en todos los sitios.

## Publicar en GitHub Pages
1. Edita `astro.config.mjs` (`site` y `base`).
2. Sube el proyecto a un repo de GitHub en la rama `main`.
3. En el repo: *Settings → Pages → Source: GitHub Actions*.
4. Cada `git push` a `main` despliega la web automáticamente.
