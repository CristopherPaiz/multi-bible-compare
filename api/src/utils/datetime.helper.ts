/**
 * Regla 11 del CLAUDE.md: guarda en UTC, muestra en hora de Guatemala.
 * Nunca confiar en la hora local del servidor — Render corre en UTC.
 */

export const GUATEMALA_TIMEZONE = 'America/Guatemala'
/** Guatemala no usa horario de verano, el offset es fijo. */
export const GUATEMALA_OFFSET = '-06:00'

export const formatGuatemala = (date: Date = new Date()): string =>
  new Intl.DateTimeFormat('es-GT', {
    timeZone: GUATEMALA_TIMEZONE,
    dateStyle: 'medium',
    timeStyle: 'medium',
    hour12: true
  }).format(date)

export interface ServerTimeInfo {
  epoch: number
  utc: string
  guatemala: string
  timezone: string
  offset: string
  serverTimezone: string
}

export const getServerTimeInfo = (): ServerTimeInfo => {
  const now = new Date()
  return {
    epoch: now.getTime(),
    utc: now.toISOString(),
    guatemala: formatGuatemala(now),
    timezone: GUATEMALA_TIMEZONE,
    offset: GUATEMALA_OFFSET,
    serverTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone
  }
}

/** Timestamp UTC para guardar en BD. */
export const nowUtcIso = (): string => new Date().toISOString()
