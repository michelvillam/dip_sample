import type { StoredUser } from '../types.ts'

export interface UserRepository {
  findByEmail(email: string): StoredUser | null
  findByToken(token: string): StoredUser | null
  insert(user: StoredUser): void
  update(user: StoredUser): void
}

export interface NotificationSender {
  send(to: string, subject: string, body: string): void
}

export interface PasswordHasher {
  hash(plainPassword: string): string
}

export interface AuditLogger {
  info(message: string): void
  warn(message: string): void
}

export interface Clock {
  now(): Date
  addMilliseconds(date: Date, milliseconds: number): Date
}

export interface IdGenerator {
  generate(): string
}

export interface TokenGenerator {
  generate(): string
}

export interface FeatureFlagReader {
  isEnabled(flag: string): boolean
}

export interface RegistrationDependencies {
  repository: UserRepository
  notificationSender: NotificationSender
  passwordHasher: PasswordHasher
  auditLogger: AuditLogger
  clock: Clock
  idGenerator: IdGenerator
  tokenGenerator: TokenGenerator
  featureFlags: FeatureFlagReader
}
