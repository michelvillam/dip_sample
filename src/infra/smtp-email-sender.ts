import type { NotificationSender } from '../registration/ports.ts'

/**
 * Placeholder for an SMTP-backed sender. A mail client is not included in this
 * exercise; the standalone demo uses ConsoleNotificationSender.
 */
export class SmtpEmailSender implements NotificationSender {
  private readonly host = process.env.SMTP_HOST ?? 'smtp.ofidocs.com'
  private readonly port = Number(process.env.SMTP_PORT ?? 587)

  send(_to: string, _subject: string, _body: string): never {
    throw new Error(`El adaptador SMTP no está configurado (${this.host}:${this.port})`)
  }
}
