import { z } from 'zod'
import { ANNOTATIONS, BIBLE } from '@config/constants.js'

const bookId = z.number().int().min(1).max(BIBLE.TOTAL_BOOKS)
const chapter = z.number().int().min(1).max(150)
const verse = z.number().int().min(1).max(200)

/**
 * Paleta cerrada.
 *
 * El color se guarda como nombre y no como hex a proposito: la app tiene tema
 * claro y oscuro, y un `#fff9c4` elegido con el tema claro puesto es ilegible
 * en el oscuro. Guardando "amarillo", cada tema decide su tono.
 *
 * Ademas evita que la columna acabe con valores arbitrarios llegados de un
 * cliente viejo o manipulado.
 */
export const COLORES = ['amarillo', 'verde', 'azul', 'rosa', 'naranja', 'morado'] as const

const highlight = z.object({
  bookId,
  chapter,
  verse,
  color: z.enum(COLORES)
})

/**
 * Reemplazo completo del conjunto de resaltados.
 *
 * Es un PUT masivo y no un POST por versiculo porque el cliente es
 * offline-first: localStorage manda, y el servidor solo guarda una copia para
 * el cambio de dispositivo. Mandar el conjunto entero (debounced) es una
 * peticion, resuelve borrados y altas a la vez, y no deja al servidor con un
 * estado a medias si el usuario cierra la pestana.
 */
export const highlightsSchema = z.object({
  highlights: z.array(highlight).max(ANNOTATIONS.MAX_HIGHLIGHTS, `Máximo ${ANNOTATIONS.MAX_HIGHLIGHTS} resaltados.`)
})
export type HighlightsInput = z.infer<typeof highlightsSchema>

const note = z.object({
  bookId,
  chapter,
  verse,
  body: z.string().trim().min(1).max(ANNOTATIONS.MAX_NOTE_LENGTH),
  createdAt: z.string().max(40).optional(),
  updatedAt: z.string().max(40).optional()
})

export const notesSchema = z.object({
  notes: z.array(note).max(ANNOTATIONS.MAX_NOTES, `Máximo ${ANNOTATIONS.MAX_NOTES} notas.`)
})
export type NotesInput = z.infer<typeof notesSchema>
