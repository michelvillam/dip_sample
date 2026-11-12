import { createRegistrationService } from './create-registration-service.ts'

const service = createRegistrationService({
  featureFlags: { isEnabled: (flag) => flag === 'WELCOME_EMAIL' },
})

const alta = service.register({
  email: 'ana@example.com',
  password: 'contrasena-larga',
  fullName: 'Ana García',
  country: 'ES',
})

console.log('Alta:', alta)

const activado = service.confirm(alta.confirmationToken)
console.log('\nEstado tras confirmar:', activado.status)
