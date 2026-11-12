import { auditLogger } from '../infra/audit-logger.ts'
import { isFeatureEnabled } from '../infra/feature-flags.ts'
import { PasswordHasher } from '../infra/password-hasher.ts'
import { PostgresUserRepository } from '../infra/postgres-user-repository.ts'
import { SmtpEmailSender } from '../infra/smtp-email-sender.ts'
import type { RegistrationInput, RegistrationResult, StoredUser } from '../types.ts'

const TOKEN_LIFETIME_MS = 24 * 60 * 60 * 1000

/**
 * Alta de usuarios en OfiDocs: valida los datos, crea la cuenta en estado
 * pendiente, manda el correo de confirmación y la activa cuando el usuario
 * pincha en el enlace.
 */
export class UserRegistrationService {
  private readonly repository = new PostgresUserRepository()
  private readonly emailSender = new SmtpEmailSender()
  private readonly passwordHasher = new PasswordHasher()

  register(input: RegistrationInput): RegistrationResult {
    if (!input.email.includes('@')) {
      throw new Error(`Email inválido: ${input.email}`)
    }
    if (input.password.length < 8) {
      throw new Error('La contraseña debe tener al menos 8 caracteres')
    }
    if (this.repository.findByEmail(input.email) !== null) {
      auditLogger.warn(`Intento de alta duplicada: ${input.email}`)
      throw new Error(`Ya existe una cuenta con el email ${input.email}`)
    }

    const now = new Date()
    const token = Math.random().toString(36).slice(2, 10).toUpperCase()

    const user: StoredUser = {
      id: `usr_${now.getTime()}_${Math.floor(Math.random() * 1000)}`,
      email: input.email,
      fullName: input.fullName,
      country: input.country,
      passwordHash: this.passwordHasher.hash(input.password),
      confirmationToken: token,
      tokenExpiresAt: new Date(now.getTime() + TOKEN_LIFETIME_MS).toISOString(),
      status: 'pending',
      createdAt: now.toISOString(),
    }

    this.repository.insert(user)

    if (isFeatureEnabled('WELCOME_EMAIL')) {
      this.emailSender.send(
        user.email,
        'Confirma tu cuenta en OfiDocs',
        `Hola ${user.fullName}, confirma tu cuenta con este código: ${token}`,
      )
    }

    auditLogger.info(`Usuario registrado: ${user.id}`)

    return {
      userId: user.id,
      confirmationToken: token,
      expiresAt: user.tokenExpiresAt,
    }
  }

  confirm(token: string): StoredUser {
    const user = this.repository.findByToken(token)
    if (user === null) {
      throw new Error('Código de confirmación desconocido')
    }
    if (new Date(user.tokenExpiresAt).getTime() < Date.now()) {
      auditLogger.warn(`Código caducado para ${user.email}`)
      throw new Error('El código de confirmación ha caducado')
    }

    const activated: StoredUser = { ...user, status: 'active' }
    this.repository.update(activated)
    auditLogger.info(`Usuario activado: ${user.id}`)

    return activated
  }
}
