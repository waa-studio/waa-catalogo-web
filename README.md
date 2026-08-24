# WAA Studio — Catálogo

Portfolio editorial oscuro para WAA Studio. Columna izquierda fija con la
categoría activa, zona derecha con una galería continua que cambia la
categoría automáticamente al hacer scroll.

**Stack:** HTML + CSS + JavaScript plano · GSAP + ScrollTrigger (desde CDN).
Sin compilación, sin dependencias instaladas, sin backend.

---

## Cómo abrirlo

Doble click en `abrir-catalogo.bat`.

Ese único archivo hace las tres cosas: revisa las carpetas de `assets`,
actualiza el catálogo con los videos que encuentre, y lo abre en el
navegador. No hay un paso separado para actualizar.

Si preferís abrirlo sin escanear, `index.html` también funciona con
doble click — pero vas a ver los datos de la última vez.

No hace falta instalar nada ni levantar un servidor. GSAP se descarga solo
desde internet, igual que Three.js en las otras páginas web de WAA.

> **Necesita conexión** para las animaciones (GSAP), la tipografía Inter y
> las imágenes de ejemplo. Sin internet la web igual se ve y se navega:
> las imágenes aparecen sin animación de entrada, en vez de quedar ocultas.

---

## Estructura

```
waa-catalogo web\
│
├── abrir-catalogo.bat         El único archivo que tocás:
│                              revisa las carpetas, actualiza
│                              los datos y abre el catálogo
├── abrir-catalogo.ps1         Lo usa el anterior — no tocar
│
├── index.html                 La página
│
├── css\
│   └── globals.css            Todo el diseño: colores, tipografía, grilla
│
├── js\
│   └── app.js                 Toda la lógica: sidebar, grilla, lightbox
│
├── data\
│   ├── categories.js          Las categorías (editable a mano)
│   └── projects.js            Los proyectos (generado — no editar)
│
└── assets\
    ├── waa-logo.png           El logo del header
    ├── LEEME - como cargar videos.txt
    │
    ├── mapping\               ┐
    ├── animacion\             │
    ├── interactivos\          │  ACÁ VAN TUS VIDEOS,
    ├── juegos\                │  una carpeta por categoría
    └── salas-inmersivas\      ┘
```

---

## Editar el contenido

### Categorías

En `data/categories.js`. Agregar, quitar o renombrar acá alcanza: el sidebar,
la barra mobile y las secciones de la grilla se arman solas a partir de este
array.

```js
WAA.categories = [
  { slug: 'mapping', title: 'Mapping' },
  ...
]
```

El `slug` es el identificador interno (sin espacios ni tildes). El `title` es
lo que se ve en pantalla.

### Videos

Hay una carpeta por categoría, **dentro de `assets`**:

```
waa-catalogo web\assets\mapping\
waa-catalogo web\assets\animacion\
waa-catalogo web\assets\interactivos\
waa-catalogo web\assets\juegos\
waa-catalogo web\assets\salas-inmersivas\
```

Para **agregar una categoría**, sumá una línea a `data/categories.js` y abrí
el catálogo: la carpeta se crea sola. El orden del array es el orden del
catálogo.

**1.** Poné tus videos en la carpeta que corresponda.

**2.** Nombrá cada archivo así:

```
2021 - Forta - Video de lanzamiento - 1.mp4
 │      │       │                     │
 año    proyecto  descripción         orden
```

El orden del final solo hace falta cuando hay varias piezas del mismo
proyecto. La descripción también es opcional. Se ordenan del más nuevo al
más viejo.

Formatos: `.mp4` `.webm` `.mov` para video, `.jpg` `.png` `.gif` `.webp`
para imágenes. Los acentos y las eñes funcionan sin problema.

**3.** Doble click en `abrir-catalogo.bat` — el mismo de siempre.

Ese archivo lee las carpetas, reescribe `data/projects.js` con el nombre, el
año y las proporciones reales de cada video (las mide del archivo, así que la
grilla nunca salta mientras carga), y abre el catálogo.

Si algo necesita tu atención —un archivo de más de 5 MB, o uno sin año en el
nombre— la ventana negra se queda abierta con el detalle. Si está todo bien,
se cierra sola.

> **Por qué hace falta escanear:** una web estática no puede leer el
> contenido de una carpeta — el navegador no tiene permiso. Por eso algo
> tiene que mirar los archivos y anotarlos. Usa PowerShell, que ya viene
> con Windows: no instala nada.

Mientras no cargues nada, el catálogo muestra bloques grises con "Lorem
ipsum" y "0000". Si abrís el catálogo con las carpetas vacías, no toca nada.

`data/projects.js` es un archivo generado: no lo edites a mano, porque se
reescribe la próxima vez que abras el catálogo.

### Cómo exportar los videos

| | |
|---|---|
| Formato | MP4 (H.264) |
| Duración | 3 a 6 segundos, con el loop calzado |
| Ancho | ~1400 px |
| Audio | ninguno |
| Peso | hasta 5 MB |

Se reproducen solos, en loop y sin sonido. Solo corre lo que está a la vista:
el resto queda pausado para no trabar la página.

Opcional: si exportás también un JPG del primer cuadro con el mismo nombre,
se muestra al instante mientras el video carga.

### Colores y tipografía

En `css/globals.css`, arriba de todo, en el bloque `:root`. Ahí están el negro
de fondo, los grises de texto, la tipografía y el espaciado de la grilla.

---

## Publicar

Es un sitio estático: subí la carpeta entera tal cual.

- **GitHub Pages:** subí el repositorio y activá Pages apuntando a la raíz.
- **Vercel / Netlify:** arrastrá la carpeta. Sin build command, sin output
  directory — no hay nada que compilar.

Todas las rutas son relativas, así que funciona igual en la raíz de un
dominio o dentro de una subcarpeta.

**No subir:** nada. Todos los archivos de la carpeta forman parte de la web.
