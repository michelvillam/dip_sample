import { createHash } from 'node:crypto'
import type { PasswordHasher as PasswordHasherPort } from '../registration/ports.ts'

/** Hashea contraseñas con la sal configurada para la aplicación. */
export class PasswordHasher implements PasswordHasherPort {
  private readonly salt = process.env.PASSWORD_SALT ?? 'ofidocs-salt-por-defecto'

  hash(plainPassword: string): string {
    return createHash('sha256').update(`${this.salt}:${plainPassword}`).digest('hex')
  }
}
