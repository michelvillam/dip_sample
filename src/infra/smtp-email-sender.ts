export interface SentEmail {
  to: string
  subject: string
  body: string
}

/**
 * Envío de correo por SMTP.
 *
 * Igual que el repositorio: en los tests no hay servidor SMTP, así que si
 * NODE_ENV vale 'test' los mensajes se acumulan en un buzón en memoria.
 */
const outbox: SentEmail[] = []

export class SmtpEmailSender {
  private readonly host = process.env.SMTP_HOST ?? 'smtp.ofidocs.com'
  private readonly port = Number(process.env.SMTP_PORT ?? 587)

  send(to: string, subject: string, body: string): void {
    if (process.env.NODE_ENV !== 'test') {
      throw new Error(`No hay conexión SMTP con ${this.host}:${this.port}`)
    }
    outbox.push({ to, subject, body })
  }
}

export function __resetOutbox(): void {
  outbox.length = 0
}

export function __sentEmails(): SentEmail[] {
  return [...outbox]
}
