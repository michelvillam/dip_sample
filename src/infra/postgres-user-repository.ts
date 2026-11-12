import type { StoredUser } from '../types.ts'

/**
 * Repositorio de usuarios sobre PostgreSQL.
 *
 * En producción abre una conexión contra DATABASE_URL. Como en los tests no hay
 * ninguna base de datos levantada, si NODE_ENV vale 'test' guarda las filas en
 * memoria para que la suite pueda ejecutarse.
 */
const rows: StoredUser[] = []

export class PostgresUserRepository {
  private readonly connectionString = process.env.DATABASE_URL ?? 'postgres://localhost:5432/ofidocs'

  private assertConnection(): void {
    if (process.env.NODE_ENV !== 'test') {
      throw new Error(`No hay conexión disponible con ${this.connectionString}`)
    }
  }

  insert(user: StoredUser): void {
    this.assertConnection()
    rows.push(user)
  }

  update(user: StoredUser): void {
    this.assertConnection()
    const index = rows.findIndex((row) => row.id === user.id)
    if (index >= 0) rows[index] = user
  }

  findByEmail(email: string): StoredUser | null {
    this.assertConnection()
    return rows.find((row) => row.email === email) ?? null
  }

  findByToken(token: string): StoredUser | null {
    this.assertConnection()
    return rows.find((row) => row.confirmationToken === token) ?? null
  }
}

/** Utilidades que existen únicamente para poder escribir tests. */
export function __resetDatabase(): void {
  rows.length = 0
}

export function __allRows(): StoredUser[] {
  return [...rows]
}
