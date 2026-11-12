import type { UserRepository } from '../registration/ports.ts'
import type { StoredUser } from '../types.ts'

/**
 * Placeholder for a PostgreSQL-backed repository. A database client is not
 * included in this exercise; the standalone demo uses InMemoryUserRepository.
 */
export class PostgresUserRepository implements UserRepository {
  private readonly connectionString = process.env.DATABASE_URL ?? 'postgres://localhost:5432/ofidocs'

  insert(_user: StoredUser): void {
    this.unavailable()
  }

  update(_user: StoredUser): void {
    this.unavailable()
  }

  findByEmail(_email: string): StoredUser | null {
    return this.unavailable()
  }

  findByToken(_token: string): StoredUser | null {
    return this.unavailable()
  }

  private unavailable(): never {
    throw new Error(`El adaptador PostgreSQL no está configurado (${this.connectionString})`)
  }
}
