# -------------------------------------------------------------
#  WAA Catalogo - generador de datos
#
#  Lee las carpetas de assets\<categoria>, saca el ano, el nombre del
#  proyecto y la descripcion del nombre de cada archivo, mide sus
#  proporciones reales, y escribe data\projects.js con todo eso.
#
#  Formato de nombre esperado:
#      2021 - Forta - Video de lanzamiento - 1.mp4
#      ano   proyecto  descripcion           orden
#
#  El orden del final es opcional (sirve cuando hay varias piezas del
#  mismo proyecto). La descripcion tambien.
#
#  No se ejecuta solo: lo dispara abrir-catalogo.bat, que despues abre
#  la web en el navegador.
# -------------------------------------------------------------

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

# Trabaja siempre sobre la carpeta donde vive este script.
$raiz = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $raiz

$EXT_IMAGEN = @('.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif')
$EXT_VIDEO  = @('.mp4', '.webm', '.mov', '.m4v')
$EXTENSIONES = $EXT_IMAGEN + $EXT_VIDEO

# Aviso si un archivo pasa este peso (en MB).
$PESO_MAXIMO_MB = 5

Write-Host ""
Write-Host "  WAA Catalogo - actualizando datos" -ForegroundColor Cyan
Write-Host "  ---------------------------------"
Write-Host ""

# -- 1. Leer las categorias desde data\categories.js ----------
# Una sola fuente de verdad: si agregas una categoria alla, aca aparece.

$archivoCategorias = Join-Path $raiz 'data\categories.js'
if (-not (Test-Path $archivoCategorias)) {
  Write-Host "  ERROR: no encuentro data\categories.js" -ForegroundColor Red
  exit 1
}

$textoCategorias = Get-Content $archivoCategorias -Raw -Encoding UTF8
$categorias = @()
foreach ($m in [regex]::Matches($textoCategorias, "slug:\s*'([^']+)'\s*,\s*title:\s*'([^']+)'")) {
  $categorias += [pscustomobject]@{
    slug  = $m.Groups[1].Value
    title = $m.Groups[2].Value
  }
}

if ($categorias.Count -eq 0) {
  Write-Host "  ERROR: no pude leer las categorias de data\categories.js" -ForegroundColor Red
  exit 1
}

# -- 2. Interpretar el nombre de archivo ----------------------
#
#   2021 - Forta - Video de lanzamiento - 1
#   ano    nombre  descripcion            orden
#
# El primer tramo es el ano y el ultimo el orden (si es un numero).
# Todo lo del medio, despues del nombre, es la descripcion: asi una
# descripcion con guiones adentro no rompe nada.

function Leer-Nombre {
  param([string]$nombreArchivo)

  $base = [System.IO.Path]::GetFileNameWithoutExtension($nombreArchivo)
  $tramos = @([regex]::Split($base, '\s*-\s*'))

  $anio = $null
  $orden = 9999
  $nombre = ''
  $descripcion = ''

  # Primer tramo: el ano.
  if ($tramos.Count -ge 1 -and $tramos[0] -match '^(19[9]\d|20\d\d)$') {
    $anio = [int]$tramos[0]
    if ($tramos.Count -gt 1) { $tramos = @($tramos[1..($tramos.Count - 1)]) } else { $tramos = @() }
  }

  # Ultimo tramo: el orden, si es un numero corto.
  if ($tramos.Count -ge 2 -and $tramos[$tramos.Count - 1] -match '^\d{1,3}$') {
    $orden = [int]$tramos[$tramos.Count - 1]
    $tramos = @($tramos[0..($tramos.Count - 2)])
  }

  if ($tramos.Count -ge 1) { $nombre = ([string]$tramos[0]).Trim() }
  if ($tramos.Count -ge 2) {
    $descripcion = (($tramos[1..($tramos.Count - 1)]) -join ' - ').Trim()
  }

  # Sin ano al principio: buscarlo en cualquier parte, como respaldo.
  if ($null -eq $anio) {
    foreach ($m in [regex]::Matches($base, '(?<![\d])(19[9]\d|20\d\d)(?![\d])')) {
      $anio = [int]$m.Groups[1].Value
    }
  }

  if ([string]::IsNullOrWhiteSpace($nombre)) {
    $nombre = ($base -replace '_', ' ').Trim()
  }

  [pscustomobject]@{
    nombre      = $nombre
    descripcion = $descripcion
    anio        = $anio
    orden       = $orden
  }
}

# -- 3. Medir el archivo --------------------------------------

# Para video: Windows guarda el ancho y el alto en las propiedades del
# archivo. Se leen con el Shell, sin instalar nada. Los numeros de
# columna cambian segun la version y el idioma de Windows, asi que los
# buscamos por nombre una sola vez y los reusamos.
$script:shell = $null
$script:idxAncho = -1
$script:idxAlto = -1

function Preparar-Shell {
  if ($null -ne $script:shell) { return }
  try {
    $script:shell = New-Object -ComObject Shell.Application
    $carpetaRef = $script:shell.Namespace($raiz)
    for ($i = 0; $i -le 400; $i++) {
      $etiqueta = $carpetaRef.GetDetailsOf($null, $i)
      # El "de"/"del" del medio es opcional a proposito: en Windows en
      # espanol la etiqueta es "Ancho fotograma", sin preposicion, y con
      # la version anterior de esta busqueda no coincidia con nada. Sin
      # coincidencia todos los videos salian medidos como 16:9.
      if ($etiqueta -match '^(Frame width|Ancho (del |de )?fotograma)$') { $script:idxAncho = $i }
      if ($etiqueta -match '^(Frame height|Alto (del |de )?fotograma)$')  { $script:idxAlto = $i }
      if ($script:idxAncho -ge 0 -and $script:idxAlto -ge 0) { break }
    }
  } catch {
    $script:shell = $null
  }
}

function Medir-Video {
  param([System.IO.FileInfo]$archivo)
  Preparar-Shell
  if ($null -eq $script:shell -or $script:idxAncho -lt 0 -or $script:idxAlto -lt 0) {
    return [pscustomobject]@{ w = 1920; h = 1080; medido = $false }
  }
  try {
    $carpeta = $script:shell.Namespace($archivo.DirectoryName)
    $item = $carpeta.ParseName($archivo.Name)
    # Vienen como "1920 pixeles": nos quedamos solo con los digitos.
    $w = ($carpeta.GetDetailsOf($item, $script:idxAncho) -replace '[^\d]', '')
    $h = ($carpeta.GetDetailsOf($item, $script:idxAlto) -replace '[^\d]', '')
    if ($w -and $h -and [int]$w -gt 0 -and [int]$h -gt 0) {
      return [pscustomobject]@{ w = [int]$w; h = [int]$h; medido = $true }
    }
  } catch { }
  return [pscustomobject]@{ w = 1920; h = 1080; medido = $false }
}

function Medir-Imagen {
  param([string]$ruta)
  try {
    $img = [System.Drawing.Image]::FromFile($ruta)
    $medida = [pscustomobject]@{ w = $img.Width; h = $img.Height; medido = $true }
    $img.Dispose()
    return $medida
  } catch {
    return [pscustomobject]@{ w = 1200; h = 900; medido = $false }
  }
}

# -- 4. Recorrer las carpetas ---------------------------------

function Escapar-JS {
  param([string]$s)
  $s = $s -replace '\\', '\\\\'
  $s = $s -replace "'", "\'"
  $s = $s -replace "`r", ''
  $s = $s -replace "`n", ' '
  return $s
}

$proyectos = @()
$totalArchivos = 0
$pesados = @()
$sinMedir = @()
$sinAnioLista = @()

foreach ($cat in $categorias) {
  $carpeta = Join-Path $raiz (Join-Path 'assets' $cat.slug)

  if (-not (Test-Path $carpeta)) {
    New-Item -ItemType Directory -Path $carpeta -Force | Out-Null
    Write-Host ("  {0,-18} carpeta creada (vacia)" -f $cat.slug) -ForegroundColor DarkGray
    continue
  }

  $todos = Get-ChildItem $carpeta -File
  $archivos = @($todos | Where-Object { $EXTENSIONES -contains $_.Extension.ToLower() })

  # Las imagenes que acompanan a un video con el mismo nombre son su
  # poster, no una pieza aparte: no entran como proyecto.
  $nombresVideo = @($archivos |
    Where-Object { $EXT_VIDEO -contains $_.Extension.ToLower() } |
    ForEach-Object { [System.IO.Path]::GetFileNameWithoutExtension($_.Name) })

  $archivos = @($archivos | Where-Object {
    $base = [System.IO.Path]::GetFileNameWithoutExtension($_.Name)
    ($EXT_VIDEO -contains $_.Extension.ToLower()) -or ($nombresVideo -notcontains $base)
  })

  if ($archivos.Count -eq 0) {
    Write-Host ("  {0,-18} sin archivos" -f $cat.slug) -ForegroundColor DarkGray
    continue
  }

  $conDatos = @()
  foreach ($f in $archivos) {
    $info = Leer-Nombre $f.Name
    $conDatos += [pscustomobject]@{
      archivo     = $f
      nombre      = $info.nombre
      descripcion = $info.descripcion
      anio        = $info.anio
      orden       = $info.orden
    }
  }

  # Mas nuevo primero; dentro del mismo ano, por nombre y por orden.
  $conDatos = @($conDatos | Sort-Object `
    @{ Expression = { if ($null -ne $_.anio) { - $_.anio } else { 9999 } } }, `
    @{ Expression = { $_.nombre } }, `
    @{ Expression = { $_.orden } })

  $n = 0
  $videos = 0
  foreach ($d in $conDatos) {
    $n++
    $totalArchivos++

    $ext = $d.archivo.Extension.ToLower()
    $esVideo = $EXT_VIDEO -contains $ext
    if ($esVideo) { $videos++ }

    $medida = if ($esVideo) { Medir-Video $d.archivo } else { Medir-Imagen $d.archivo.FullName }
    if (-not $medida.medido) { $sinMedir += $d.archivo.Name }

    $mb = [math]::Round($d.archivo.Length / 1MB, 1)
    if ($mb -gt $PESO_MAXIMO_MB) {
      $pesados += [pscustomobject]@{ nombre = $d.archivo.Name; mb = $mb }
    }

    $nombreUrl = [System.Uri]::EscapeDataString($d.archivo.Name)
    $ruta = "assets/" + $cat.slug + "/" + $nombreUrl

    # Poster: un archivo de imagen con el mismo nombre, si existe.
    # Se muestra al instante mientras el video carga.
    $poster = ''
    if ($esVideo) {
      $sinExt = [System.IO.Path]::GetFileNameWithoutExtension($d.archivo.Name)
      foreach ($pe in @('.jpg', '.jpeg', '.png', '.webp')) {
        $posible = Join-Path $d.archivo.DirectoryName ($sinExt + $pe)
        if (Test-Path $posible) {
          $poster = "assets/" + $cat.slug + "/" + [System.Uri]::EscapeDataString($sinExt + $pe)
          break
        }
      }
    }

    $anioTexto = if ($null -ne $d.anio) { $d.anio } else { '' }
    $altPartes = @($d.nombre)
    if ($d.descripcion) { $altPartes += $d.descripcion }
    $altPartes += $cat.title

    $proyectos += [pscustomobject]@{
      id       = $cat.slug + '-' + $n
      category = $cat.slug
      title    = $d.nombre
      subtitle = $d.descripcion
      year     = $anioTexto
      type     = $(if ($esVideo) { 'video' } else { 'image' })
      src      = $ruta
      poster   = $poster
      ratio    = "$($medida.w) / $($medida.h)"
      alt      = ($altPartes -join ' - ')
    }
  }

  # El @() es necesario: si Where-Object devuelve un solo elemento,
  # .Count viene vacio y el aviso nunca se mostraria.
  $faltantes = @($conDatos | Where-Object { $null -eq $_.anio })
  foreach ($f in $faltantes) { $sinAnioLista += $f.archivo.Name }
  $sinAnio = $faltantes.Count
  $aviso = if ($sinAnio -gt 0) { "   <-- $sinAnio sin ano en el nombre" } else { "" }
  $detalle = if ($videos -gt 0) { "$($archivos.Count) archivos ($videos video)" } else { "$($archivos.Count) archivos" }
  Write-Host ("  {0,-18} {1}{2}" -f $cat.slug, $detalle, $aviso) -ForegroundColor Green
}

Write-Host ""

# -- 5. Si no hay nada, no pisa los datos actuales ------------

if ($totalArchivos -eq 0) {
  Write-Host "  No encontre ningun archivo en las carpetas de categoria." -ForegroundColor Yellow
  Write-Host "  No toque nada: el catalogo sigue mostrando bloques grises."
  Write-Host ""
  Write-Host "  Pone tus videos o imagenes en alguna de estas carpetas:"
  Write-Host ""
  foreach ($c in $categorias) {
    Write-Host ("      assets" + [char]92 + $c.slug) -ForegroundColor Cyan
  }
  Write-Host ""
  Write-Host "  y volve a abrir el catalogo."
  Write-Host ""
  exit 0
}

# -- 6. Avisos utiles -----------------------------------------

if ($pesados.Count -gt 0) {
  Write-Host "  Archivos que pasan los $PESO_MAXIMO_MB MB:" -ForegroundColor Yellow
  foreach ($p in $pesados) {
    Write-Host ("      {0} MB   {1}" -f $p.mb, $p.nombre) -ForegroundColor Yellow
  }
  Write-Host "  Van a funcionar, pero la pagina tarda mas en cargar."
  Write-Host ""
}

if ($sinMedir.Count -gt 0) {
  Write-Host "  No pude leer las proporciones de estos (uso 16:9):" -ForegroundColor Yellow
  foreach ($s in $sinMedir) { Write-Host ("      " + $s) -ForegroundColor Yellow }
  Write-Host ""
}

if ($sinAnioLista.Count -gt 0) {
  Write-Host "  Sin ano en el nombre (no va a mostrar el ano):" -ForegroundColor Yellow
  foreach ($s in $sinAnioLista) { Write-Host ("      " + $s) -ForegroundColor Yellow }
  Write-Host "  El formato es:  2021 - Nombre - Descripcion - 1.mp4"
  Write-Host ""
}

# -- 7. Escribir data\projects.js -----------------------------

$sb = New-Object System.Text.StringBuilder
$fecha = Get-Date -Format 'dd/MM/yyyy HH:mm'

[void]$sb.AppendLine("/* -------------------------------------------------------------")
[void]$sb.AppendLine("   ARCHIVO GENERADO AUTOMATICAMENTE - no lo edites a mano.")
[void]$sb.AppendLine("")
[void]$sb.AppendLine("   Lo escribe abrir-catalogo.bat leyendo las carpetas de")
[void]$sb.AppendLine("   assets. Si cambias algo aca, se pierde la proxima vez que")
[void]$sb.AppendLine("   ejecutes ese archivo.")
[void]$sb.AppendLine("")
[void]$sb.AppendLine("   Para cambiar el catalogo: agrega, saca o renombra archivos")
[void]$sb.AppendLine("   en assets" + [char]92 + "<categoria> y volve a ejecutar el .bat.")
[void]$sb.AppendLine("")
[void]$sb.AppendLine("   Ultima actualizacion: $fecha")
[void]$sb.AppendLine("   $totalArchivos archivos en $($categorias.Count) categorias")
[void]$sb.AppendLine("   ------------------------------------------------------------- */")
[void]$sb.AppendLine("")
[void]$sb.AppendLine("window.WAA = window.WAA || {}")
[void]$sb.AppendLine("")
[void]$sb.AppendLine("WAA.projects = [")

foreach ($p in $proyectos) {
  $t = Escapar-JS $p.title
  $s = Escapar-JS $p.subtitle
  $a = Escapar-JS $p.alt
  $anio = if ($p.year -eq '') { "''" } else { "$($p.year)" }
  [void]$sb.AppendLine("  {")
  [void]$sb.AppendLine("    id: '$($p.id)',")
  [void]$sb.AppendLine("    category: '$($p.category)',")
  [void]$sb.AppendLine("    title: '$t',")
  [void]$sb.AppendLine("    subtitle: '$s',")
  [void]$sb.AppendLine("    year: $anio,")
  [void]$sb.AppendLine("    type: '$($p.type)',")
  [void]$sb.AppendLine("    src: '$($p.src)',")
  [void]$sb.AppendLine("    poster: '$($p.poster)',")
  [void]$sb.AppendLine("    aspectRatio: '$($p.ratio)',")
  [void]$sb.AppendLine("    alt: '$a'")
  [void]$sb.AppendLine("  },")
}

[void]$sb.AppendLine("]")
[void]$sb.AppendLine("")
[void]$sb.AppendLine("WAA.getProjectsByCategory = function (slug) {")
[void]$sb.AppendLine("  return WAA.projects.filter(function (p) {")
[void]$sb.AppendLine("    return p.category === slug")
[void]$sb.AppendLine("  })")
[void]$sb.AppendLine("}")

$destino = Join-Path $raiz 'data\projects.js'

# UTF-8 sin BOM: asi los acentos salen bien en el navegador.
[System.IO.File]::WriteAllText($destino, $sb.ToString(), (New-Object System.Text.UTF8Encoding($false)))

Write-Host "  Listo: $totalArchivos archivos cargados en el catalogo." -ForegroundColor Green
Write-Host ""

# Codigo 2 = hubo avisos que conviene leer. El .bat lo usa para dejar
# esta ventana abierta; si todo salio bien, se cierra sola.
if ($pesados.Count -gt 0 -or $sinMedir.Count -gt 0 -or $sinAnioLista.Count -gt 0) { exit 2 }
exit 0
