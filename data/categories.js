/* Categorías de WAA Studio.
   Para editar o añadir categorías, modificá este array: el resto de la
   web (sidebar, secciones, proyectos) se genera a partir de acá.

   El `slug` es el nombre interno y tiene que coincidir exactamente con
   la carpeta dentro de assets: sin acentos, sin espacios, en minúscula.
   El `title` es lo que se ve en pantalla, ahí sí van acentos.

   El orden de este array es el orden del catálogo. */

window.WAA = window.WAA || {}

WAA.categories = [
  { slug: 'mapping', title: 'Mapping' },
  { slug: 'animacion', title: 'Animación' },
  { slug: 'interactivos', title: 'Interactivos' },
  { slug: 'juegos', title: 'Juegos' },
  { slug: 'salas-inmersivas', title: 'Salas inmersivas' },
]

WAA.getCategoryBySlug = function (slug) {
  return WAA.categories.filter(function (c) {
    return c.slug === slug
  })[0]
}
