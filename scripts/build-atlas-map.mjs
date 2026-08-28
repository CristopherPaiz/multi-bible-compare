/**
 * ============================================================================
 *  Costas del atlas — de Natural Earth a un `<path>` de SVG
 * ============================================================================
 *
 *   node scripts/build-atlas-map.mjs <ne_50m_land.geojson> [ne_50m_lakes.geojson]
 *
 * Genera `src/data/atlasCostas.js`.
 *
 * ---------------------------------------------------------------------------
 * POR QUE ESTO Y NO UN MAPA DE VERDAD
 * ---------------------------------------------------------------------------
 * Un mapa con teselas (OpenStreetMap y compania) necesita una peticion por cada
 * cuadro y cada nivel de zoom. Esta app se instala como PWA y tiene que servir
 * para leer sin senal, asi que un mapa que se queda en blanco sin conexion
 * falla justo cuando mas falta hace. Ademas obliga a respetar la politica de
 * uso del servidor de teselas.
 *
 * La otra alternativa era dibujar las costas a ojo. Se descarto: una costa
 * dibujada a mano PARECE un mapa sin serlo, y un mapa que miente es peor que
 * ninguno.
 *
 * Natural Earth resuelve las dos cosas. Es dominio publico (sin atribucion
 * obligatoria, aunque se agradece), y recortado a la ventana del atlas cabe de
 * sobra en el bundle. El resultado se genera UNA vez y viaja como codigo: cero
 * peticiones en tiempo de ejecucion.
 *
 * ---------------------------------------------------------------------------
 * COMO
 * ---------------------------------------------------------------------------
 * 1. Recorte al encuadre con Sutherland-Hodgman. No basta con tirar los puntos
 *    de fuera: eso deja los poligonos abiertos y al rellenarlos aparecen
 *    triangulos falsos cruzando el mapa. El recorte de verdad los vuelve a
 *    cerrar por el borde del lienzo.
 * 2. Proyeccion con el MISMO modulo que usa la pagina, para que las costas y
 *    las ciudades no puedan discrepar.
 * 3. Simplificacion Douglas-Peucker y redondeo a un decimal. A 1000 unidades de
 *    ancho, la decima de unidad es la decima parte de un pixel en pantalla:
 *    guardar mas cifras es peso sin imagen.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { VISTA, ANCHO, ALTO, proyectar } from '../src/utils/mapaProyeccion.js'

const HERE = dirname(fileURLToPath(import.meta.url))
const SALIDA = resolve(HERE, '..', 'src', 'data', 'atlasCostas.js')

/** Margen extra alrededor del encuadre, en grados. */
const MARGEN = 1

const CAJA = {
  lonMin: VISTA.lonMin - MARGEN,
  lonMax: VISTA.lonMax + MARGEN,
  latMin: VISTA.latMin - MARGEN,
  latMax: VISTA.latMax + MARGEN
}

/** Tolerancia de simplificacion, en unidades del lienzo. */
const TOLERANCIA = 0.2

// ---------------------------------------------------------------------------
// Recorte (Sutherland-Hodgman)
// ---------------------------------------------------------------------------

/**
 * Cada borde de la caja recorta el poligono entero antes de pasar al siguiente.
 * Vale porque la caja es convexa; con una region concava haria falta otro
 * algoritmo.
 */
const recortarContra = (puntos, dentro, corte) => {
  const salida = []
  if (puntos.length === 0) return salida

  let previo = puntos[puntos.length - 1]

  for (const actual of puntos) {
    const actualDentro = dentro(actual)
    const previoDentro = dentro(previo)

    if (actualDentro) {
      // Al entrar hay que anadir primero el punto donde se cruza el borde.
      if (!previoDentro) salida.push(corte(previo, actual))
      salida.push(actual)
    } else if (previoDentro) {
      salida.push(corte(previo, actual))
    }

    previo = actual
  }

  return salida
}

/** Interpolacion lineal del cruce con una vertical (longitud constante). */
const cruceLon = (lon) => (a, b) => {
  const t = (lon - a[0]) / (b[0] - a[0])
  return [lon, a[1] + t * (b[1] - a[1])]
}

/** Idem con una horizontal (latitud constante). */
const cruceLat = (lat) => (a, b) => {
  const t = (lat - a[1]) / (b[1] - a[1])
  return [a[0] + t * (b[0] - a[0]), lat]
}

const recortar = (anillo) => {
  let puntos = anillo
  puntos = recortarContra(puntos, (p) => p[0] >= CAJA.lonMin, cruceLon(CAJA.lonMin))
  puntos = recortarContra(puntos, (p) => p[0] <= CAJA.lonMax, cruceLon(CAJA.lonMax))
  puntos = recortarContra(puntos, (p) => p[1] >= CAJA.latMin, cruceLat(CAJA.latMin))
  puntos = recortarContra(puntos, (p) => p[1] <= CAJA.latMax, cruceLat(CAJA.latMax))
  return puntos
}

// ---------------------------------------------------------------------------
// Simplificacion (Douglas-Peucker)
// ---------------------------------------------------------------------------

const distanciaARecta = (punto, inicio, fin) => {
  const dx = fin.x - inicio.x
  const dy = fin.y - inicio.y
  const largo = dx * dx + dy * dy

  if (largo === 0) return Math.hypot(punto.x - inicio.x, punto.y - inicio.y)

  // Proyeccion escalar del punto sobre el segmento, limitada a [0, 1] para que
  // los extremos midan contra el vertice y no contra la recta infinita.
  const t = Math.max(0, Math.min(1, ((punto.x - inicio.x) * dx + (punto.y - inicio.y) * dy) / largo))
  return Math.hypot(punto.x - (inicio.x + t * dx), punto.y - (inicio.y + t * dy))
}

const simplificar = (puntos, tolerancia) => {
  if (puntos.length < 3) return puntos

  let maxima = 0
  let indice = 0

  for (let i = 1; i < puntos.length - 1; i++) {
    const distancia = distanciaARecta(puntos[i], puntos[0], puntos[puntos.length - 1])
    if (distancia > maxima) {
      maxima = distancia
      indice = i
    }
  }

  if (maxima <= tolerancia) return [puntos[0], puntos[puntos.length - 1]]

  return [
    ...simplificar(puntos.slice(0, indice + 1), tolerancia).slice(0, -1),
    ...simplificar(puntos.slice(indice), tolerancia)
  ]
}

// ---------------------------------------------------------------------------
// GeoJSON -> path
// ---------------------------------------------------------------------------

const anillosDe = (geometria) => {
  if (!geometria) return []
  if (geometria.type === 'Polygon') return geometria.coordinates
  if (geometria.type === 'MultiPolygon') return geometria.coordinates.flat()
  return []
}

const construirPath = (rutaGeojson, etiqueta) => {
  const datos = JSON.parse(readFileSync(rutaGeojson, 'utf8'))
  const trozos = []
  let anillosLeidos = 0
  let anillosUsados = 0

  for (const feature of datos.features ?? []) {
    for (const anillo of anillosDe(feature.geometry)) {
      anillosLeidos++

      const recortado = recortar(anillo)
      // Menos de 3 vertices no encierra area: o quedaba fuera del encuadre, o
      // lo cruzaba de refilon.
      if (recortado.length < 3) continue

      const proyectado = recortado.map(([lon, lat]) => proyectar({ lon, lat }))
      const simple = simplificar(proyectado, TOLERANCIA)
      if (simple.length < 3) continue

      anillosUsados++
      const puntos = simple.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`)
      trozos.push(`M${puntos.join('L')}Z`)
    }
  }

  const path = trozos.join('')
  console.log(`  ${etiqueta.padEnd(8)} ${String(anillosUsados).padStart(4)} / ${anillosLeidos} anillos, ${(path.length / 1024).toFixed(1)} KB`)
  return path
}

// ---------------------------------------------------------------------------

const [rutaTierra, rutaLagos] = process.argv.slice(2)

if (!rutaTierra) {
  console.error(`Uso: node scripts/build-atlas-map.mjs <ne_50m_land.geojson> [ne_50m_lakes.geojson]

Los datos son de Natural Earth (dominio publico):
  https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_land.geojson
  https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_lakes.geojson`)
  process.exit(1)
}

console.log('Recortando a la ventana del atlas...')
const tierra = construirPath(resolve(process.cwd(), rutaTierra), 'tierra')
const lagos = rutaLagos ? construirPath(resolve(process.cwd(), rutaLagos), 'lagos') : ''

const contenido = `/**
 * Costas del mundo biblico, recortadas al encuadre del atlas.
 *
 * GENERADO por \`scripts/build-atlas-map.mjs\`. No editar a mano: se regenera
 * entero y cualquier retoque se perderia.
 *
 * Los datos vienen de Natural Earth (naturalearthdata.com), que es de DOMINIO
 * PUBLICO: no exige atribucion, aunque el proyecto la agradece.
 *
 * Van como \`<path>\` de SVG y no como GeoJSON en tiempo de ejecucion porque el
 * navegador no tiene que proyectar nada: las coordenadas ya estan en unidades
 * del lienzo (${ANCHO} x ${ALTO}). Se dibuja y ya.
 */

/** Ancho y alto del lienzo para el que se generaron estas rutas. */
export const LIENZO = { ancho: ${ANCHO}, alto: ${ALTO} };

/** Masas de tierra. Se rellenan sobre el fondo de mar. */
export const TIERRA = "${tierra}";

/** Lagos y mares interiores. Se rellenan del color del mar, encima de la tierra. */
export const LAGOS = "${lagos}";
`

writeFileSync(SALIDA, contenido, 'utf8')
console.log(`\nEscrito ${SALIDA}`)
console.log(`Total: ${((contenido.length) / 1024).toFixed(1)} KB`)
