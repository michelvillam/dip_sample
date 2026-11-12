import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createRegistrationService } from '../src/registration/create-registration-service.ts'
import { __allRows, __resetDatabase } from '../src/infra/postgres-user-repository.ts'
import { __resetOutbox, __sentEmails } from '../src/infra/smtp-email-sender.ts'
import { __auditEntries, __resetAuditLog } from '../src/infra/audit-logger.ts'
import type { UserRegistrationService } from '../src/registration/user-registration-service.ts'

const datosDeAlta = {
  email: 'ana@example.com',
  password: 'contrasena-larga',
  fullName: 'Ana García',
  country: 'ES',
}

describe('UserRegistrationService', () => {
  let service: UserRegistrationService

  beforeEach(() => {
    // Cada test tiene que vaciar a mano el estado global de tres módulos de
    // infraestructura distintos, porque el servicio los usa por dentro.
    __resetDatabase()
    __resetOutbox()
    __resetAuditLog()

    // El servicio llama a `new Date()` internamente: sin congelar el reloj del
    // proceso entero no hay forma de comprobar la caducidad del token.
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-03-01T10:00:00.000Z'))

    // Y llama a `Math.random()` para generar el token y el id, así que hay que
    // parchear un builtin del lenguaje para que el resultado sea predecible.
    vi.spyOn(Math, 'random').mockReturnValue(0.123456789)

    // Y lee los flags de las variables de entorno del proceso.
    process.env.FEATURE_WELCOME_EMAIL = 'true'

    service = createRegistrationService()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
    delete process.env.FEATURE_WELCOME_EMAIL
  })

  describe('alta de usuario', () => {
    it('crea la cuenta en estado pendiente', () => {
      const resultado = service.register(datosDeAlta)

      const filas = __allRows()
      expect(filas).toHaveLength(1)
      expect(filas[0]).toMatchObject({
        id: resultado.userId,
        email: 'ana@example.com',
        fullName: 'Ana García',
        country: 'ES',
        status: 'pending',
      })
    })

    it('guarda la contraseña hasheada, nunca en claro', () => {
      service.register(datosDeAlta)

      const fila = __allRows()[0]!
      expect(fila.passwordHash).toBe('07b13fd4dd30215c7119f4849278a82e95c9bd670c382966af7cc15241ed790f')
      expect(fila.passwordHash).not.toContain('contrasena-larga')
    })

    it('el código de confirmación caduca a las 24 horas', () => {
      const resultado = service.register(datosDeAlta)

      expect(resultado.expiresAt).toBe('2024-03-02T10:00:00.000Z')
    })

    it('envía el email de bienvenida cuando el flag está activo', () => {
      const resultado = service.register(datosDeAlta)

      const enviados = __sentEmails()
      expect(enviados).toHaveLength(1)
      expect(enviados[0]?.to).toBe('ana@example.com')
      expect(enviados[0]?.subject).toBe('Confirma tu cuenta en OfiDocs')
      expect(enviados[0]?.body).toContain(resultado.confirmationToken)
    })

    it('no envía el email de bienvenida cuando el flag está apagado', () => {
      process.env.FEATURE_WELCOME_EMAIL = 'false'

      service.register(datosDeAlta)

      expect(__sentEmails()).toHaveLength(0)
    })

    it('deja constancia en el registro de auditoría', () => {
      const resultado = service.register(datosDeAlta)

      expect(__auditEntries()).toContainEqual({
        level: 'info',
        message: `Usuario registrado: ${resultado.userId}`,
        at: '2024-03-01T10:00:00.000Z',
      })
    })
  })

  describe('validación', () => {
    it('rechaza emails sin arroba', () => {
      expect(() => service.register({ ...datosDeAlta, email: 'ana.example.com' })).toThrow('Email inválido')
    })

    it('rechaza contraseñas de menos de 8 caracteres', () => {
      expect(() => service.register({ ...datosDeAlta, password: 'corta' })).toThrow(
        'La contraseña debe tener al menos 8 caracteres',
      )
    })

    it('rechaza un email ya registrado y lo apunta en auditoría', () => {
      service.register(datosDeAlta)

      expect(() => service.register(datosDeAlta)).toThrow('Ya existe una cuenta con el email ana@example.com')
      expect(__auditEntries().some((entry) => entry.level === 'warn')).toBe(true)
    })
  })

  describe('confirmación', () => {
    it('activa la cuenta con un código válido', () => {
      const resultado = service.register(datosDeAlta)

      const activado = service.confirm(resultado.confirmationToken)

      expect(activado.status).toBe('active')
      expect(__allRows()[0]?.status).toBe('active')
    })

    it('rechaza un código desconocido', () => {
      expect(() => service.confirm('NOEXISTE')).toThrow('Código de confirmación desconocido')
    })

    it('rechaza un código caducado', () => {
      const resultado = service.register(datosDeAlta)

      // Para simular el paso del tiempo hay que volver a mover el reloj global.
      vi.setSystemTime(new Date('2024-03-02T10:00:01.000Z'))

      expect(() => service.confirm(resultado.confirmationToken)).toThrow(
        'El código de confirmación ha caducado',
      )
    })
  })
})
