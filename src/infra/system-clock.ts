import type { Clock } from '../registration/ports.ts'

export class SystemClock implements Clock {
  now(): Date {
    return new Date()
  }

  addMilliseconds(date: Date, milliseconds: number): Date {
    return new Date(date.getTime() + milliseconds)
  }
}
