import { describe, expect, it } from 'vitest'
import type {
  AuditLogger,
  Clock,
  FeatureFlagReader,
  IdGenerator,
  NotificationSender,
  PasswordHasher,
  TokenGenerator,
  UserRepository,
} from '../src/registration/ports.ts'
import { UserRegistrationService } from '../src/registration/user-registration-service.ts'
import type { RegistrationDependencies } from '../src/registration/ports.ts'
import type { RegistrationInput, StoredUser } from '../src/types.ts'

const datosDeAlta: RegistrationInput = {
  email: 'ana@example.com',
  password: 'contrasena-larga',
  fullName: 'Ana García',
  country: 'ES',
}

interface SentEmail {
  to: string
  subject: string
  body: string
}

interface AuditEntry {
  level: 'info' | 'warn'
  message: string
  at: string
}

class TestUserRepository implements UserRepository {
  private readonly users: StoredUser[] = []

  insert(user: StoredUser): void {
    this.users.push({ ...user })
  }

  update(user: StoredUser): void {
    const index = this.users.findIndex((storedUser) => storedUser.id === user.id)
    if (index >= 0) this.users[index] = { ...user }
  }

  findByEmail(email: string): StoredUser | null {
    const user = this.users.find((storedUser) => storedUser.email === email)
    return user === undefined ? null : { ...user }
  }

  findByToken(token: string): StoredUser | null {
    const user = this.users.find((storedUser) => storedUser.confirmationToken === token)
    return user === undefined ? null : { ...user }
  }

  all(): StoredUser[] {
    return this.users.map((user) => ({ ...user }))
  }
}

class TestClock implements Clock {
  private current = new Date('2024-03-01T10:00:00.000Z')

  now(): Date {
    return new Date(this.current)
  }

  addMilliseconds(date: Date, milliseconds: number): Date {
    return new Date(date.getTime() + milliseconds)
  }

  set(date: string): void {
    this.current = new Date(date)
  }
}

class TestNotificationSender implements NotificationSender {
  readonly emails: SentEmail[] = []

  send(to: string, subject: string, body: string): void {
    this.emails.push({ to, subject, body })
  }
}

class TestPasswordHasher implements PasswordHasher {
  hash(_plainPassword: string): string {
    return 'test-hash-abc123'
  }
}

class TestAuditLogger implements AuditLogger {
  readonly entries: AuditEntry[] = []

  constructor(private readonly clock: Clock) {}

  info(message: string): void {
    this.entries.push({ level: 'info', message, at: this.clock.now().toISOString() })
  }

  warn(message: string): void {
    this.entries.push({ level: 'warn', message, at: this.clock.now().toISOString() })
  }
}

class TestIdGenerator implements IdGenerator {
  generate(): string {
    return 'usr_test'
  }
}

class TestTokenGenerator implements TokenGenerator {
  generate(): string {
    return 'TOKEN123'
  }
}

class TestFeatureFlagReader implements FeatureFlagReader {
  enabled = true

  isEnabled(flag: string): boolean {
    return flag === 'WELCOME_EMAIL' && this.enabled
  }
}

function createTestContext() {
  const repository = new TestUserRepository()
  const clock = new TestClock()
  const notificationSender = new TestNotificationSender()
  const auditLogger = new TestAuditLogger(clock)
  const featureFlags = new TestFeatureFlagReader()
  const dependencies: RegistrationDependencies = {
    repository,
    notificationSender,
    passwordHasher: new TestPasswordHasher(),
    auditLogger,
    clock,
    idGenerator: new TestIdGenerator(),
    tokenGenerator: new TestTokenGenerator(),
    featureFlags,
  }

  return {
    service: new UserRegistrationService(dependencies),
    repository,
    clock,
    notificationSender,
    auditLogger,
    featureFlags,
  }
}

describe('UserRegistrationService con dependencias inyectadas', () => {
  describe('alta de usuario', () => {
    it('crea la cuenta en estado pendiente', () => {
      const { service, repository } = createTestContext()

      const resultado = service.register(datosDeAlta)

      expect(repository.all()).toHaveLength(1)
      expect(repository.all()[0]).toMatchObject({
        id: resultado.userId,
        email: 'ana@example.com',
        fullName: 'Ana García',
        country: 'ES',
        status: 'pending',
      })
    })

    it('guarda la contraseña hasheada, nunca en claro', () => {
      const { service, repository } = createTestContext()

      service.register(datosDeAlta)

      expect(repository.all()[0]?.passwordHash).toBe('test-hash-abc123')
      expect(repository.all()[0]?.passwordHash).not.toContain('contrasena-larga')
    })

    it('el código de confirmación caduca a las 24 horas', () => {
      const { service } = createTestContext()

      const resultado = service.register(datosDeAlta)

      expect(resultado.expiresAt).toBe('2024-03-02T10:00:00.000Z')
    })

    it('envía el email de bienvenida cuando el flag está activo', () => {
      const { service, notificationSender } = createTestContext()

      const resultado = service.register(datosDeAlta)

      expect(notificationSender.emails).toHaveLength(1)
      expect(notificationSender.emails[0]).toMatchObject({
        to: 'ana@example.com',
        subject: 'Confirma tu cuenta en OfiDocs',
      })
      expect(notificationSender.emails[0]?.body).toContain(resultado.confirmationToken)
    })

    it('no envía el email de bienvenida cuando el flag está apagado', () => {
      const { service, notificationSender, featureFlags } = createTestContext()
      featureFlags.enabled = false

      service.register(datosDeAlta)

      expect(notificationSender.emails).toHaveLength(0)
    })

    it('deja constancia en el registro de auditoría', () => {
      const { service, auditLogger } = createTestContext()

      const resultado = service.register(datosDeAlta)

      expect(auditLogger.entries).toContainEqual({
        level: 'info',
        message: `Usuario registrado: ${resultado.userId}`,
        at: '2024-03-01T10:00:00.000Z',
      })
    })
  })

  describe('validación', () => {
    it('rechaza emails sin arroba', () => {
      const { service } = createTestContext()

      expect(() => service.register({ ...datosDeAlta, email: 'ana.example.com' })).toThrow(
        'Email inválido',
      )
    })

    it('rechaza contraseñas de menos de 8 caracteres', () => {
      const { service } = createTestContext()

      expect(() => service.register({ ...datosDeAlta, password: 'corta' })).toThrow(
        'La contraseña debe tener al menos 8 caracteres',
      )
    })

    it('rechaza un email ya registrado y lo apunta en auditoría', () => {
      const { service, auditLogger } = createTestContext()
      service.register(datosDeAlta)

      expect(() => service.register(datosDeAlta)).toThrow(
        'Ya existe una cuenta con el email ana@example.com',
      )
      expect(auditLogger.entries.some((entry) => entry.level === 'warn')).toBe(true)
    })
  })

  describe('confirmación', () => {
    it('activa la cuenta con un código válido', () => {
      const { service, repository } = createTestContext()
      const resultado = service.register(datosDeAlta)

      const activado = service.confirm(resultado.confirmationToken)

      expect(activado.status).toBe('active')
      expect(repository.all()[0]?.status).toBe('active')
    })

    it('rechaza un código desconocido', () => {
      const { service } = createTestContext()

      expect(() => service.confirm('NOEXISTE')).toThrow('Código de confirmación desconocido')
    })

    it('rechaza un código caducado', () => {
      const { service, clock } = createTestContext()
      const resultado = service.register(datosDeAlta)
      clock.set('2024-03-02T10:00:01.000Z')

      expect(() => service.confirm(resultado.confirmationToken)).toThrow(
        'El código de confirmación ha caducado',
      )
    })
  })
})
