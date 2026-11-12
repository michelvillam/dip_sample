import { createHash } from 'node:crypto'

/** Hashea contraseñas con la sal global de la aplicación. */
export class PasswordHasher {
  private readonly salt = process.env.PASSWORD_SALT ?? 'ofidocs-salt-por-defecto'

  hash(plainPassword: string): string {
    return createHash('sha256').update(`${this.salt}:${plainPassword}`).digest('hex')
  }
}
