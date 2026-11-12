import type { AuditLogger as AuditLoggerPort, Clock } from '../registration/ports.ts'

export class ConsoleAuditLogger implements AuditLoggerPort {
  constructor(private readonly clock: Clock) {}

  info(message: string): void {
    console.log(`[AUDIT] ${this.clock.now().toISOString()} ${message}`)
  }

  warn(message: string): void {
    console.warn(`[AUDIT] ${this.clock.now().toISOString()} ${message}`)
  }
}
