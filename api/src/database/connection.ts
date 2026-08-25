import { createClient, Client, InValue, ResultSet, Row } from '@libsql/client'

/**
 * Cliente unico de Turso (singleton). El SDK ya maneja su propio pool HTTP,
 * asi que crear mas de un cliente solo desperdicia sockets.
 */
export class DatabaseService {
  private static instance: DatabaseService
  private client: Client | null = null

  private constructor() {}

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService()
    }
    return DatabaseService.instance
  }

  public async connect(): Promise<Client> {
    if (this.client) return this.client

    const url = process.env.TURSO_DATABASE_URL
    const authToken = process.env.TURSO_AUTH_TOKEN

    if (!url || !authToken) {
      throw new Error('Faltan TURSO_DATABASE_URL / TURSO_AUTH_TOKEN')
    }

    this.client = createClient({ url, authToken })
    await this.client.execute('SELECT 1')
    return this.client
  }

  public async getClient(): Promise<Client> {
    if (!this.client) return this.connect()
    return this.client
  }
}

/** Atajo: `const db = await getDb()`. */
export const getDb = (): Promise<Client> => DatabaseService.getInstance().getClient()

/** Ejecuta una consulta parametrizada y devuelve las filas. */
export const query = async (sql: string, args: InValue[] = []): Promise<Row[]> => {
  const db = await getDb()
  const result: ResultSet = await db.execute({ sql, args })
  return result.rows
}

/** Igual que `query` pero devuelve solo la primera fila (o `null`). */
export const queryOne = async (sql: string, args: InValue[] = []): Promise<Row | null> => {
  const rows = await query(sql, args)
  return rows[0] ?? null
}

/**
 * Genera `?,?,?` para un `IN (...)` dinamico.
 *
 * Los valores SIEMPRE van como argumentos parametrizados, nunca interpolados en el
 * SQL. Zod ya valida que sean enteros antes de llegar aqui, pero el placeholder
 * mantiene la garantia aunque cambie el validador.
 */
export const placeholders = (count: number): string => Array.from({ length: count }, () => '?').join(',')
