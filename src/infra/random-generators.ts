import { randomInt, randomUUID } from 'node:crypto'
import type { IdGenerator, TokenGenerator } from '../registration/ports.ts'

export class RandomIdGenerator implements IdGenerator {
  generate(): string {
    return `usr_${randomUUID()}`
  }
}

export class RandomTokenGenerator implements TokenGenerator {
  generate(): string {
    return randomInt(36 ** 8).toString(36).toUpperCase().padStart(8, '0')
  }
}
