import type { RegistrationInput, RegistrationResult, StoredUser } from '../types.ts'
import type { RegistrationDependencies } from './ports.ts'

const TOKEN_LIFETIME_MS = 24 * 60 * 60 * 1000

/**
 * Alta de usuarios en OfiDocs: valida los datos, crea la cuenta en estado
 * pendiente, manda el correo de confirmación y la activa cuando el usuario
 * pincha en el enlace.
 */
export class UserRegistrationService {
  constructor(private readonly dependencies: RegistrationDependencies) {}

  register(input: RegistrationInput): RegistrationResult {
    if (!input.email.includes('@')) {
      throw new Error(`Email inválido: ${input.email}`)
    }
    if (input.password.length < 8) {
      throw new Error('La contraseña debe tener al menos 8 caracteres')
    }
    if (this.dependencies.repository.findByEmail(input.email) !== null) {
      this.dependencies.auditLogger.warn(`Intento de alta duplicada: ${input.email}`)
      throw new Error(`Ya existe una cuenta con el email ${input.email}`)
    }

    const now = this.dependencies.clock.now()
    const token = this.dependencies.tokenGenerator.generate()

    const user: StoredUser = {
      id: this.dependencies.idGenerator.generate(),
      email: input.email,
      fullName: input.fullName,
      country: input.country,
      passwordHash: this.dependencies.passwordHasher.hash(input.password),
      confirmationToken: token,
      tokenExpiresAt: this.dependencies.clock
        .addMilliseconds(now, TOKEN_LIFETIME_MS)
        .toISOString(),
      status: 'pending',
      createdAt: now.toISOString(),
    }

    this.dependencies.repository.insert(user)

    if (this.dependencies.featureFlags.isEnabled('WELCOME_EMAIL')) {
      this.dependencies.notificationSender.send(
        user.email,
        'Confirma tu cuenta en OfiDocs',
        `Hola ${user.fullName}, confirma tu cuenta con este código: ${token}`,
      )
    }

    this.dependencies.auditLogger.info(`Usuario registrado: ${user.id}`)

    return {
      userId: user.id,
      confirmationToken: token,
      expiresAt: user.tokenExpiresAt,
    }
  }

  confirm(token: string): StoredUser {
    const user = this.dependencies.repository.findByToken(token)
    if (user === null) {
      throw new Error('Código de confirmación desconocido')
    }
    if (user.tokenExpiresAt < this.dependencies.clock.now().toISOString()) {
      this.dependencies.auditLogger.warn(`Código caducado para ${user.email}`)
      throw new Error('El código de confirmación ha caducado')
    }

    const activated: StoredUser = { ...user, status: 'active' }
    this.dependencies.repository.update(activated)
    this.dependencies.auditLogger.info(`Usuario activado: ${user.id}`)

    return activated
  }
}
