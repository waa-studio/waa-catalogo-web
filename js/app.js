/* ─────────────────────────────────────────────────────────────
   WAA STUDIO — catálogo
   JavaScript plano, sin librerías de interfaz ni compilación.
   Depende solo de GSAP (viene del CDN en index.html).

   Estructura de este archivo:
     1. Utilidades
     2. Sidebar (los cuatro títulos de categoría)
     3. Barra de categoría mobile
     4. Grilla de imágenes
     5. Lightbox
     6. Categoría activa según el scroll
     7. Animaciones de entrada
   ───────────────────────────────────────────────────────────── */

;(function () {
  'use strict'

  var categories = WAA.categories
  var hasGsap = typeof window.gsap !== 'undefined'
  var hasScrollTrigger = hasGsap && typeof window.ScrollTrigger !== 'undefined'

  if (hasScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger)
  }

  /* ── 0. Quién scrollea ─────────────────────────────────────────
     Abierta como página normal, scrollea la ventana: lo de siempre.

     Embebida en un iframe (Wix) no alcanza. Según cómo la plataforma
     arme el marco, el que se mueve puede ser el marco de afuera, y
     entonces adentro nunca pasa nada: para el catálogo nadie scrolleó.
     Sin scroll propio, la barra lateral no se puede quedar fija —
     `position: sticky` necesita algo que scrollee para agarrarse— y
     los nombres de las categorías se van de largo con el resto.

     Por eso, dentro de un marco, el scroll pasa a ser nuestro: el
     envoltorio .scroller toma el alto del marco y scrollea él. Así
     el catálogo se comporta igual esté donde esté, sin depender de
     cómo quedó configurado el iframe.

     Todo lo que sigue mide y mueve a través de estas cuatro
     funciones, para que el resto del archivo no tenga que saber
     cuál de los dos casos es. */

  var enIframe = (function () {
    try {
      return window.self !== window.top
    } catch (e) {
      // Un marco de otro dominio ni siquiera deja comparar: si no se
      // puede saber, es porque estamos adentro de uno.
      return true
    }
  })()

  var scrollBox = document.querySelector('.scroller')

  // Sin el envoltorio en el HTML, sigue andando con el scroll de la
  // ventana: el modo embebido simplemente no se activa.
  if (enIframe && !scrollBox) enIframe = false
  if (enIframe) document.documentElement.classList.add('is-embed')

  // Lo que GSAP necesita saber: en modo normal es `window`, que es su
  // valor por defecto.
  var scroller = enIframe ? scrollBox : window

  function scrollActual() {
    return enIframe ? scrollBox.scrollTop : window.scrollY
  }

  function altoVista() {
    return enIframe ? scrollBox.clientHeight : window.innerHeight
  }

  function irHasta(y, suave) {
    var opciones = { top: y, behavior: suave ? 'smooth' : 'auto' }
    if (enIframe) scrollBox.scrollTo(opciones)
    else window.scrollTo(opciones)
  }

  // Bloquea el scroll mientras el visor está abierto, y lo devuelve
  // como estaba. Hay que tocar el elemento que scrollea, no siempre
  // el body.
  var bloqueado = null

  function bloquearScroll() {
    var nodo = enIframe ? scrollBox : document.body
    bloqueado = { nodo: nodo, antes: nodo.style.overflow }
    nodo.style.overflow = 'hidden'
  }

  function liberarScroll() {
    if (!bloqueado) return
    bloqueado.nodo.style.overflow = bloqueado.antes
    bloqueado = null
  }

  /* ── 1. Utilidades ─────────────────────────────────────────── */

  function reducedMotion() {
    return (
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    )
  }

  // Anima solo si GSAP cargó y el sistema no pide movimiento reducido.
  function canAnimate() {
    return hasGsap && !reducedMotion()
  }

  function el(tag, className) {
    var node = document.createElement(tag)
    if (className) node.className = className
    return node
  }

  // Íconos de trazo (mismo set que usaba la versión anterior).
  function strokeIcon(paths, size, width) {
    return (
      '<svg viewBox="0 0 24 24" width="' + size + '" height="' + size + '"' +
      ' fill="none" stroke="currentColor" stroke-width="' + width + '"' +
      ' stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      paths +
      '</svg>'
    )
  }

  var ICON = {
    arrow: strokeIcon('<path d="M7 7h10v10"/><path d="M7 17 17 7"/>', 18, 1.5),
    close: strokeIcon('<path d="M18 6 6 18"/><path d="m6 6 12 12"/>', 22, 1.5),
    prev: strokeIcon('<path d="m15 18-6-6 6-6"/>', 28, 1.4),
    next: strokeIcon('<path d="m9 18 6-6-6-6"/>', 28, 1.4)
  }

  function pad2(n) {
    return String(n).padStart(2, '0')
  }

  /* ── 2. Sidebar ────────────────────────────────────────────── */

  var listButtons = []
  var bigTitle = null

  function buildSidebar() {
    bigTitle = document.querySelector('.sidebar-title')
    if (bigTitle) bigTitle.textContent = categories[0].title

    var list = document.querySelector('.category-list')
    if (!list) return

    categories.forEach(function (cat, i) {
      var li = el('li')
      var btn = el('button', 'category-item' + (i === 0 ? ' is-active' : ''))
      btn.type = 'button'
      if (i === 0) btn.setAttribute('aria-current', 'true')

      var num = el('span', 'category-num')
      num.textContent = pad2(i + 1)
      var name = el('span', 'category-name')
      name.textContent = cat.title

      btn.appendChild(num)
      btn.appendChild(name)

      btn.addEventListener('click', function () {
        scrollToCategory(i)
      })

      li.appendChild(btn)
      list.appendChild(li)
      listButtons.push(btn)
    })
  }

  // Cambia el titulo grande encadenando salida y entrada, para que no
  // haya un salto brusco de texto al pasar de una categoria a otra.
  function paintBigTitle(index) {
    if (!bigTitle) return
    var texto = categories[index].title

    if (!canAnimate()) {
      bigTitle.textContent = texto
      return
    }

    gsap.to(bigTitle, {
      y: -14,
      opacity: 0,
      duration: 0.28,
      ease: 'power2.in',
      overwrite: true,
      onComplete: function () {
        bigTitle.textContent = texto
        gsap.fromTo(
          bigTitle,
          { y: 18, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.55, ease: 'power3.out', overwrite: true }
        )
      },
    })
  }

  /* ── 3. Barra de categoría mobile ──────────────────────────── */

  var mobileTitle = null
  var mobileCount = null

  function buildMobileBar() {
    mobileTitle = document.querySelector('.mobile-cat-title')
    mobileCount = document.querySelector('.mobile-cat-count')
    updateMobileBar(0)
  }

  function updateMobileBar(index) {
    if (!mobileTitle) return
    mobileTitle.textContent = categories[index].title
    mobileCount.textContent = pad2(index + 1) + ' / ' + pad2(categories.length)
    // Reinicia la animación CSS de entrada del texto.
    mobileTitle.style.animation = 'none'
    void mobileTitle.offsetWidth
    mobileTitle.style.animation = ''
  }

  /* ── 4. Grilla de imágenes ─────────────────────────────────── */

  var sections = []
  var videosEnGrilla = []
  // Guarda el <video> de la grilla de cada proyecto, para poder abrir
  // el visor en el mismo cuadro que ya se está viendo.
  var videoPorId = {}

  // Saca una foto del cuadro actual de un video ya reproduciéndose.
  // Sirve de poster instantáneo en el visor: la imagen aparece antes
  // de que el video grande termine de cargar.
  function capturarCuadro(video) {
    try {
      if (!video || !video.videoWidth) return ''
      var lienzo = document.createElement('canvas')
      lienzo.width = video.videoWidth
      lienzo.height = video.videoHeight
      lienzo.getContext('2d').drawImage(video, 0, 0)
      return lienzo.toDataURL('image/jpeg', 0.72)
    } catch (e) {
      // Abriendo con doble click (file://) el navegador no deja leer
      // el lienzo. No pasa nada: seguimos sin poster.
      return ''
    }
  }

  // Reproduce solo los videos que están a la vista. Con 60 corriendo a
  // la vez la página se arrastra; así solo trabajan los visibles y el
  // resto queda quieto, sin gastar ni red ni procesador.
  function vigilarVideos() {
    if (!videosEnGrilla.length) return

    if (typeof IntersectionObserver === 'undefined') {
      // Navegador viejo: los dejamos andando a todos.
      videosEnGrilla.forEach(function (v) {
        v.preload = 'auto'
        var p = v.play()
        if (p && p.catch) p.catch(function () {})
      })
      return
    }

    var observador = new IntersectionObserver(
      function (entradas) {
        entradas.forEach(function (e) {
          var v = e.target
          if (e.isIntersecting) {
            if (v.preload !== 'auto') v.preload = 'auto'
            var p = v.play()
            // Si el navegador rechaza la reproducción, no rompemos nada:
            // queda el poster o el primer cuadro.
            if (p && p.catch) p.catch(function () {})
          } else {
            v.pause()
          }
        })
      },
      // El `root` explícito importa embebidos: el que scrollea es el
      // envoltorio, no la ventana, y el margen de 200px tiene que
      // medirse contra él. Fuera del iframe va en null, que es la
      // ventana — el valor de siempre.
      { root: enIframe ? scrollBox : null, rootMargin: '200px 0px' }
    )

    videosEnGrilla.forEach(function (v) {
      observador.observe(v)
    })
  }

  // Mientras el visor está abierto, los videos de la grilla quedan
  // tapados: pausarlos libera ancho de banda y procesador para que el
  // grande cargue antes.
  var pausadosPorVisor = []

  function pausarGrilla() {
    pausadosPorVisor = []
    videosEnGrilla.forEach(function (v) {
      if (!v.paused) {
        pausadosPorVisor.push(v)
        v.pause()
      }
    })
  }

  function reanudarGrilla() {
    pausadosPorVisor.forEach(function (v) {
      var p = v.play()
      if (p && p.catch) p.catch(function () {})
    })
    pausadosPorVisor = []
  }

  // La proporción de cada tarjeta sale de data\projects.js, que la mide
  // al generar el catálogo. Esto es la red de seguridad: cuando el
  // archivo ya cargó, se compara con la medida real y, si no coinciden,
  // manda la real. Así la miniatura siempre respeta el formato del
  // video —horizontal, cuadrado o vertical— aunque el dato esté viejo o
  // no se haya podido medir.
  var relayoutPendiente = null

  function pedirRelayout() {
    if (relayoutPendiente) clearTimeout(relayoutPendiente)
    relayoutPendiente = setTimeout(rehacerLayout, 120)
  }

  function ajustarProporcion(card, ancho, alto) {
    if (!ancho || !alto) return
    var real = ancho / alto
    var actual = card.offsetWidth && card.offsetHeight
      ? card.offsetWidth / card.offsetHeight
      : 0
    // Menos de un 1% de diferencia es redondeo, no un formato distinto.
    if (actual && Math.abs(real - actual) / real < 0.01) return
    card.style.aspectRatio = ancho + ' / ' + alto
    pedirRelayout()
  }

  function buildCard(project, eager) {
    var item = el('div', 'masonry-item')

    var card = el('button', 'card')
    card.type = 'button'
    card.style.aspectRatio = project.aspectRatio
    card.setAttribute('aria-label', 'Abrir ' + project.title)

    var medio
    if (project.placeholder) {
      // Hueco gris. Va por el mismo camino que una tarjeta real, así
      // se agranda al pasar el cursor, muestra nombre y año, y se abre
      // al hacer clic. El degradado suave existe porque un gris plano,
      // al escalarse, se ve idéntico: sin textura el zoom sería invisible.
      card.classList.add('is-empty')
      medio = el('span', 'card-img empty-fill')
    } else if (project.type === 'video') {
      // muted + playsinline son obligatorios: sin ellos los navegadores
      // bloquean la reproducción automática. `preload="none"` evita que
      // se descarguen los 60 videos de una: cada uno carga al asomarse.
      medio = el('video', 'card-img')
      medio.src = project.src
      medio.muted = true
      medio.loop = true
      medio.playsInline = true
      medio.setAttribute('muted', '')
      medio.setAttribute('playsinline', '')
      medio.preload = 'none'
      if (project.poster) medio.poster = project.poster
      medio.setAttribute('aria-label', project.alt)
      medio.addEventListener('loadedmetadata', function () {
        ajustarProporcion(card, medio.videoWidth, medio.videoHeight)
      })
      videosEnGrilla.push(medio)
      videoPorId[project.id] = medio
    } else {
      medio = el('img', 'card-img')
      medio.src = project.src
      medio.alt = project.alt
      medio.loading = eager ? 'eager' : 'lazy'
      medio.decoding = 'async'
      medio.addEventListener('load', function () {
        ajustarProporcion(card, medio.naturalWidth, medio.naturalHeight)
      })
    }
    // (medio es la imagen o el video, según el tipo de archivo)

    var overlay = el('span', 'card-overlay')
    overlay.setAttribute('aria-hidden', 'true')
    overlay.innerHTML =
      '<span class="card-meta">' +
      '<span class="card-titlerow">' +
      '<span class="card-title"></span>' +
      '<span class="card-arrow">' + ICON.arrow + '</span>' +
      '</span>' +
      '<span class="card-year"></span>' +
      '</span>'
    // textContent, para que un título con < o & no rompa el markup.
    overlay.querySelector('.card-title').textContent = project.title
    overlay.querySelector('.card-year').textContent = project.year

    card.appendChild(medio)
    card.appendChild(overlay)

    card.addEventListener('click', function () {
      openLightbox(project)
    })

    item.appendChild(card)
    return item
  }

  function buildGrid() {
    var content = document.querySelector('.content')
    if (!content) return

    categories.forEach(function (cat) {
      var section = el('section', 'category-section')
      section.setAttribute('data-category', cat.slug)
      section.id = 'cat-' + cat.slug
      section.setAttribute('aria-label', cat.title)

      var masonry = el('div', 'masonry')
      WAA.getProjectsByCategory(cat.slug).forEach(function (project, i) {
        masonry.appendChild(buildCard(project, i === 0))
      })

      section.appendChild(masonry)
      content.appendChild(section)
      sections.push(section)
    })
  }

  // Calcula cuántas filas de 1px ocupa cada imagen. El sobrante entre
  // una imagen y la de abajo es exactamente `--row-gap`, así el aire
  // vertical termina igual al lateral.
  //
  // Usa offsetHeight y no getBoundingClientRect(): el primero devuelve
  // la medida de layout, ignorando el scale que GSAP aplica durante la
  // animación de entrada. Con el segundo, las tarjetas a medio animar
  // se medirían encogidas y el cálculo saldría mal.
  function layoutMasonry() {
    var aire = parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue('--row-gap')
    ) || 24

    Array.prototype.forEach.call(
      document.querySelectorAll('.masonry'),
      function (grid) {
        var unidad = parseFloat(getComputedStyle(grid).gridAutoRows) || 1
        Array.prototype.forEach.call(grid.children, function (item) {
          var card = item.querySelector('.card')
          if (!card) return
          var alto = card.offsetHeight
          if (!alto) return
          item.style.gridRowEnd = 'span ' + Math.ceil((alto + aire) / unidad)
        })
      }
    )
  }

  // Reserva espacio debajo de la última categoría.
  //
  // Sin esto, una categoría corta al final del catálogo nunca puede
  // subir hasta arriba: el scroll se termina antes y queda a media
  // pantalla, como si siguieras en la anterior. El cálculo agrega
  // justo lo que falta para que su borde superior alcance el header.
  function ajustarEspacioFinal() {
    var contenido = document.querySelector('.content')
    var ultima = sections[sections.length - 1]
    if (!contenido || !ultima) return

    var header = document.querySelector('.header')
    var tope = (header ? header.offsetHeight : 0) + 24
    var faltante = altoVista() - tope - ultima.offsetHeight

    // Nunca menos que el aire de siempre al pie del catálogo.
    var minimo = altoVista() * 0.15
    contenido.style.paddingBottom = Math.round(Math.max(minimo, faltante)) + 'px'
  }

  // Los tres pasos que hay que rehacer juntos cada vez que cambian las
  // medidas: filas de la grilla, espacio final y disparadores de scroll.
  function rehacerLayout() {
    layoutMasonry()
    ajustarEspacioFinal()
    if (hasScrollTrigger) ScrollTrigger.refresh()
  }

  function scrollToCategory(i) {
    var target = sections[i]
    if (!target) return
    var header = document.querySelector('.header')
    var offset = (header ? header.offsetHeight : 0) + 24
    var y = target.getBoundingClientRect().top + scrollActual() - offset
    irHasta(y, !reducedMotion())
  }

  /* ── 5. Lightbox ───────────────────────────────────────────── */

  var lb = null

  function openLightbox(project) {
    var list = WAA.getProjectsByCategory(project.category)
    var index = 0
    list.forEach(function (p, i) {
      if (p.id === project.id) index = i
    })
    renderLightbox(list, index)
  }

  function renderLightbox(list, startIndex) {
    closeLightbox()

    var index = startIndex

    var backdrop = el('div', 'lightbox')
    backdrop.setAttribute('role', 'dialog')
    backdrop.setAttribute('aria-modal', 'true')

    var closeBtn = el('button', 'lb-close')
    closeBtn.type = 'button'
    closeBtn.setAttribute('aria-label', 'Cerrar')
    closeBtn.innerHTML = ICON.close

    var prevBtn = el('button', 'lb-nav lb-prev')
    prevBtn.type = 'button'
    prevBtn.setAttribute('aria-label', 'Anterior')
    prevBtn.innerHTML = ICON.prev

    var nextBtn = el('button', 'lb-nav lb-next')
    nextBtn.type = 'button'
    nextBtn.setAttribute('aria-label', 'Siguiente')
    nextBtn.innerHTML = ICON.next

    var figure = el('figure', 'lb-figure')
    // El visor arma la imagen o el video en cada cambio, según el tipo.
    var medioActual = null
    var caption = el('figcaption', 'lb-caption')
    var capTitle = el('span', 'lb-title')
    var capSub = el('span', 'lb-sub')

    caption.appendChild(capTitle)
    caption.appendChild(capSub)
    figure.appendChild(caption)

    backdrop.appendChild(closeBtn)
    backdrop.appendChild(prevBtn)
    backdrop.appendChild(figure)
    backdrop.appendChild(nextBtn)

    function paint() {
      var p = list[index]
      var cat = WAA.getCategoryBySlug(p.category)

      // Fuera el medio anterior. Si era video hay que pausarlo y vaciarlo,
      // o sigue descargando en segundo plano aunque ya no se vea.
      if (medioActual) {
        if (medioActual.tagName === 'VIDEO') {
          medioActual.pause()
          medioActual.removeAttribute('src')
          medioActual.load()
        }
        if (medioActual.parentNode) medioActual.parentNode.removeChild(medioActual)
      }

      if (p.placeholder) {
        // Hueco: se agranda el mismo bloque gris, sin texto inventado.
        medioActual = el('div', 'lb-img empty-fill')
        medioActual.setAttribute('aria-label', 'Espacio para un proyecto')
      } else if (p.type === 'video') {
        var enGrilla = videoPorId[p.id]

        medioActual = el('video', 'lb-img')
        // Poster instantáneo: el cuadro que ya se está viendo en la
        // grilla, o el .jpg que acompañe al archivo. Así el visor
        // muestra la imagen apenas abre, sin esperar la descarga.
        var cuadro = p.poster || capturarCuadro(enGrilla)
        if (cuadro) medioActual.poster = cuadro

        medioActual.muted = true
        medioActual.loop = true
        medioActual.playsInline = true
        // Sin controles: se ve como una imagen en movimiento, no como un
        // reproductor. Son loops cortos y sin sonido, así que la barra de
        // play, el tiempo y el botón de pantalla completa solo estorban.
        medioActual.controls = false
        medioActual.preload = 'auto'
        medioActual.setAttribute('muted', '')
        medioActual.setAttribute('playsinline', '')
        medioActual.setAttribute('aria-label', p.alt)
        medioActual.src = p.src

        // Arranca donde venía la grilla, no desde cero.
        if (enGrilla && enGrilla.currentTime) {
          var desde = enGrilla.currentTime
          medioActual.addEventListener(
            'loadedmetadata',
            function () {
              try { medioActual.currentTime = desde } catch (e) {}
            },
            { once: true }
          )
        }
      } else {
        medioActual = el('img', 'lb-img')
        medioActual.src = p.src
        medioActual.alt = p.alt
      }
      // Reserva la caja con la proporción real antes de que cargue nada.
      if (p.aspectRatio) medioActual.style.aspectRatio = p.aspectRatio
      figure.insertBefore(medioActual, caption)

      if (medioActual.tagName === 'VIDEO') {
        var pr = medioActual.play()
        if (pr && pr.catch) pr.catch(function () {})
      }

      // Arma el pie con lo que haya: descripción, categoría y año.
      // Así no queda un guion suelto cuando falta alguna parte.
      capTitle.textContent = p.title
      var partes = []
      if (p.subtitle) partes.push(p.subtitle)
      partes.push(cat.title)
      if (p.year) partes.push(p.year)
      capSub.textContent = partes.join(' — ')
      backdrop.setAttribute('aria-label', p.title + ', ' + cat.title)
    }

    function go(dir) {
      index = (index + dir + list.length) % list.length
      paint()
      if (canAnimate()) {
        gsap.fromTo(
          figure,
          { opacity: 0.2 },
          { opacity: 1, duration: 0.35, ease: 'power2.out' }
        )
      }
    }

    function onKey(e) {
      if (e.key === 'Escape') closeLightbox()
      else if (e.key === 'ArrowRight') go(1)
      else if (e.key === 'ArrowLeft') go(-1)
    }

    closeBtn.addEventListener('click', closeLightbox)
    prevBtn.addEventListener('click', function () { go(-1) })
    nextBtn.addEventListener('click', function () { go(1) })
    backdrop.addEventListener('click', function (e) {
      if (e.target === backdrop) closeLightbox()
    })
    window.addEventListener('keydown', onKey)

    paint()
    document.body.appendChild(backdrop)
    bloquearScroll()
    pausarGrilla()

    if (canAnimate()) {
      gsap.fromTo(
        backdrop,
        { opacity: 0 },
        { opacity: 1, duration: 0.35, ease: 'power2.out' }
      )
      gsap.fromTo(
        figure,
        { opacity: 0, scale: 0.96 },
        { opacity: 1, scale: 1, duration: 0.5, ease: 'power3.out' }
      )
    }

    lb = { node: backdrop, onKey: onKey }
  }

  function closeLightbox() {
    if (!lb) return
    window.removeEventListener('keydown', lb.onKey)
    // Detiene y vacía el video antes de sacar el visor del documento:
    // si no, sigue descargando aunque ya no esté a la vista.
    var v = lb.node.querySelector('video')
    if (v) {
      v.pause()
      v.removeAttribute('src')
      v.load()
    }
    if (lb.node.parentNode) lb.node.parentNode.removeChild(lb.node)
    liberarScroll()
    lb = null
    reanudarGrilla()
  }

  /* ── 6. Categoría activa según el scroll ───────────────────── */

  var activeIndex = 0

  // Deja a la vista solo la categoría activa; el resto se atenúa.
  function pintarSecciones(i) {
    sections.forEach(function (section, n) {
      if (n === i) section.classList.remove('is-dimmed')
      else section.classList.add('is-dimmed')
    })
  }

  function setActive(i) {
    if (i === activeIndex) return
    activeIndex = i
    pintarSecciones(i)
    listButtons.forEach(function (btn, n) {
      if (n === i) {
        btn.classList.add('is-active')
        btn.setAttribute('aria-current', 'true')
      } else {
        btn.classList.remove('is-active')
        btn.removeAttribute('aria-current')
      }
    })
    paintBigTitle(i)
    updateMobileBar(i)
  }

  // Toma la última sección cuyo borde superior ya cruzó la línea del 45%
  // del viewport. Es determinista: funciona bajando, subiendo y al cargar.
  function computeActive() {
    var line = altoVista() * 0.45
    var idx = 0
    sections.forEach(function (section, i) {
      if (section.getBoundingClientRect().top <= line) idx = i
    })
    setActive(idx)
  }

  function watchScroll() {
    // Embebido va por el camino simple: escuchar el scroll del
    // envoltorio y listo. Un ScrollTrigger que abarque toda la página
    // necesita un elemento de referencia con la altura completa, y
    // dentro del envoltorio esa cuenta se complica sin ganar nada:
    // esto hace exactamente lo mismo.
    if (hasScrollTrigger && !enIframe) {
      ScrollTrigger.create({
        trigger: document.documentElement,
        start: 'top top',
        end: 'bottom bottom',
        onUpdate: computeActive,
        onRefresh: computeActive
      })
    } else {
      // También es el camino de siempre cuando no hay GSAP (sin internet).
      scroller.addEventListener('scroll', computeActive, { passive: true })
      window.addEventListener('resize', computeActive)
    }
    computeActive()
  }

  /* ── 7. Animaciones de entrada ─────────────────────────────── */

  function animateIntro() {
    if (!canAnimate()) return

    // Sin escalonado: el logo y los iconos entran juntos. Con stagger,
    // durante el primer segundo los iconos quedaban hasta 18px más
    // arriba que el logo y parecían desalineados.
    gsap.from('[data-header-item]', {
      y: -18,
      opacity: 0,
      duration: 0.85,
      ease: 'power4.out',
      delay: 0.15,
      clearProps: 'transform,opacity'
    })

    gsap.from('.sidebar-title', {
      y: 26,
      opacity: 0,
      duration: 0.9,
      ease: 'power4.out',
      delay: 0.2,
      clearProps: 'transform,opacity'
    })

    gsap.from('.category-item', {
      y: 14,
      opacity: 0,
      duration: 0.7,
      ease: 'power3.out',
      stagger: 0.06,
      delay: 0.28,
      clearProps: 'transform,opacity'
    })
  }

  // Entrada de las imágenes al scrollear. El recorrido es amplio (64px +
  // escala) para que se note, pero `power4.out` concentra el movimiento
  // en el primer tercio: se lee rápido y aterriza suave, sin rebote.
  //
  // El tween es uno solo; lo que cambia es quién lo dispara.
  function revelarCards(lote, devuelta) {
    gsap.to(lote, {
      opacity: 1,
      y: 0,
      scale: 1,
      duration: devuelta ? 0.5 : 0.95,
      ease: devuelta ? 'power3.out' : 'power4.out',
      stagger: devuelta ? 0.04 : 0.07,
      overwrite: true
    })
  }

  function animateCards() {
    // Si no se puede animar, las imágenes quedan visibles tal cual:
    // nunca se les aplica el opacity 0 inicial. Esa regla vale para
    // todo lo que sigue — antes de esconder nada hay que estar seguro
    // de que algo las va a volver a mostrar.
    if (!canAnimate()) return

    var cards = Array.prototype.slice.call(
      document.querySelectorAll('.masonry-item')
    )
    if (!cards.length) return

    // Embebidos, el disparador es un IntersectionObserver contra el
    // envoltorio. Es nativo y le decimos exactamente cuál es el
    // elemento que scrollea, sin intermediarios: adentro de un iframe
    // eso es justo lo que no conviene dar por sentado. Si fallara,
    // las imágenes se quedarían invisibles y el catálogo se vería
    // negro, así que acá no hay lugar para suposiciones.
    if (enIframe) {
      if (typeof IntersectionObserver === 'undefined') return

      gsap.set(cards, { opacity: 0, y: 64, scale: 0.94 })

      var observador = new IntersectionObserver(
        function (entradas) {
          var lote = []
          entradas.forEach(function (e) {
            if (!e.isIntersecting) return
            lote.push(e.target)
            // Una vez que entró, ya está: no hace falta seguir
            // mirándola, y así no vuelve a animarse al subir.
            observador.unobserve(e.target)
          })
          if (lote.length) revelarCards(lote, false)
        },
        // El recorte de abajo hace que empiece a entrar un poco antes
        // de llegar al borde, igual que el `top 90%` del otro camino.
        { root: scrollBox, rootMargin: '0px 0px -10% 0px' }
      )

      cards.forEach(function (c) {
        observador.observe(c)
      })
      return
    }

    // Página normal: sigue el camino de siempre, con ScrollTrigger.
    if (!hasScrollTrigger) return

    gsap.set(cards, { opacity: 0, y: 64, scale: 0.94 })

    ScrollTrigger.batch(cards, {
      // Arranca antes de que la tarjeta esté del todo a la vista, así
      // termina de entrar justo cuando entra en cuadro.
      start: 'top 90%',
      // Agrupa como mucho 6: el escalonado queda vivo y no se vuelve
      // una cascada larga cuando entran muchas juntas.
      batchMax: 6,
      onEnter: function (batch) {
        revelarCards(batch, false)
      },
      onEnterBack: function (batch) {
        revelarCards(batch, true)
      }
    })
  }

  /* ── Arranque ──────────────────────────────────────────────── */

  function init() {
    buildSidebar()
    buildMobileBar()
    buildGrid()

    // Antes de animar: la animación aplica un scale que no debe
    // interferir con la medición de las alturas.
    layoutMasonry()
    ajustarEspacioFinal()

    // Estado inicial del atenuado. Hace falta explícitamente porque
    // setActive() corta cuando el índice no cambia, y al arrancar ya
    // vale 0: sin esto, la primera pintada nunca ocurriría.
    pintarSecciones(activeIndex)

    animateCards()
    vigilarVideos()
    watchScroll()
    animateIntro()

    // Al cambiar el ancho cambia el de las columnas, y con él la altura
    // de cada imagen: hay que rehacer el cálculo de filas.
    var pendiente = null
    window.addEventListener('resize', function () {
      if (pendiente) clearTimeout(pendiente)
      pendiente = setTimeout(rehacerLayout, 150)
    })

    // Red de seguridad: si la página arranca con la ventana todavía sin
    // medidas (una pestaña en segundo plano, un panel oculto), las
    // imágenes miden 0 y el cálculo de filas queda sin hacer. Observando
    // el ancho real del contenedor, se rehace en cuanto exista.
    //
    // Compara contra el último ancho a propósito: recalcular cambia la
    // ALTURA del contenedor, y sin esa guarda se llamaría a sí mismo
    // en un bucle sin fin.
    if (typeof ResizeObserver !== 'undefined') {
      var contenido = document.querySelector('.content')
      if (contenido) {
        var ultimoAncho = Math.round(contenido.getBoundingClientRect().width)
        new ResizeObserver(function (entradas) {
          var ancho = Math.round(entradas[0].contentRect.width)
          if (ancho === ultimoAncho) return
          ultimoAncho = ancho
          rehacerLayout()
        }).observe(contenido)
      }
    }

    // Las imágenes pueden cambiar la altura de la página al cargar:
    // recalcular mantiene los disparadores en su lugar.
    if (hasScrollTrigger) {
      window.addEventListener('load', rehacerLayout)
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init)
  } else {
    init()
  }
})()
