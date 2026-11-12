import { UserRegistrationService } from './user-registration-service.ts'

/**
 * Punto único de construcción del servicio de altas. Todo el que necesite un
 * `UserRegistrationService` debería pedirlo por aquí.
 */
export function createRegistrationService(): UserRegistrationService {
  return new UserRegistrationService()
}
