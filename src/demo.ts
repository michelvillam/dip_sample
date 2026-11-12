import { createRegistrationService } from './registration/create-registration-service.ts'
import { __allRows } from './infra/postgres-user-repository.ts'
import { __sentEmails } from './infra/smtp-email-sender.ts'

// OJO: este demo solo arranca porque package.json lo ejecuta con NODE_ENV=test.
// Sin esa mentira, el repositorio y el SMTP se niegan a funcionar.
process.env.FEATURE_WELCOME_EMAIL = 'true'

const service = createRegistrationService()

const alta = service.register({
  email: 'ana@example.com',
  password: 'contrasena-larga',
  fullName: 'Ana García',
  country: 'ES',
})

console.log('Alta:', alta)
console.log('Filas en base de datos:', __allRows().length)
console.log('Emails enviados:', __sentEmails())

const activado = service.confirm(alta.confirmationToken)
console.log('\nEstado tras confirmar:', activado.status)
