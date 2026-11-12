export interface AuditEntry {
  level: 'info' | 'warn'
  message: string
  at: string
}

const entries: AuditEntry[] = []

/**
 * Registro de auditoría. Escribe por consola y guarda una copia en memoria
 * para que los tests puedan comprobar qué se ha registrado.
 */
class AuditLogger {
  info(message: string): void {
    const entry: AuditEntry = { level: 'info', message, at: new Date().toISOString() }
    entries.push(entry)
    if (process.env.NODE_ENV !== 'test') console.log(`[AUDIT] ${entry.at} ${message}`)
  }

  warn(message: string): void {
    const entry: AuditEntry = { level: 'warn', message, at: new Date().toISOString() }
    entries.push(entry)
    if (process.env.NODE_ENV !== 'test') console.warn(`[AUDIT] ${entry.at} ${message}`)
  }
}

/** Instancia global compartida por toda la aplicación. */
export const auditLogger = new AuditLogger()

export function __resetAuditLog(): void {
  entries.length = 0
}

export function __auditEntries(): AuditEntry[] {
  return [...entries]
}
