import type { NotificationSender } from '../registration/ports.ts'

export class ConsoleNotificationSender implements NotificationSender {
  send(to: string, subject: string, body: string): void {
    console.log(`[EMAIL] Para: ${to}\nAsunto: ${subject}\n${body}`)
  }
}
