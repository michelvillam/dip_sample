import { ConsoleAuditLogger } from './infra/audit-logger.ts'
import { ConsoleNotificationSender } from './infra/console-notification-sender.ts'
import { EnvironmentFeatureFlagReader } from './infra/feature-flags.ts'
import { InMemoryUserRepository } from './infra/in-memory-user-repository.ts'
import { PasswordHasher } from './infra/password-hasher.ts'
import { RandomIdGenerator, RandomTokenGenerator } from './infra/random-generators.ts'
import { SystemClock } from './infra/system-clock.ts'
import type { RegistrationDependencies } from './registration/ports.ts'
import { UserRegistrationService } from './registration/user-registration-service.ts'

/**
 * Composition root for the standalone demo. Production adapters can replace
 * the local repository and console sender without changing the use case.
 */
export function createRegistrationService(
  overrides: Partial<RegistrationDependencies> = {},
): UserRegistrationService {
  const clock = overrides.clock ?? new SystemClock()
  const dependencies: RegistrationDependencies = {
    repository: overrides.repository ?? new InMemoryUserRepository(),
    notificationSender: overrides.notificationSender ?? new ConsoleNotificationSender(),
    passwordHasher: overrides.passwordHasher ?? new PasswordHasher(),
    auditLogger: overrides.auditLogger ?? new ConsoleAuditLogger(clock),
    clock,
    idGenerator: overrides.idGenerator ?? new RandomIdGenerator(),
    tokenGenerator: overrides.tokenGenerator ?? new RandomTokenGenerator(),
    featureFlags: overrides.featureFlags ?? new EnvironmentFeatureFlagReader(),
  }
  return new UserRegistrationService(dependencies)
}
