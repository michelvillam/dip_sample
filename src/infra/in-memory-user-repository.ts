import type { UserRepository } from '../registration/ports.ts'
import type { StoredUser } from '../types.ts'

export class InMemoryUserRepository implements UserRepository {
  private readonly users: StoredUser[] = []

  insert(user: StoredUser): void {
    this.users.push({ ...user })
  }

  update(user: StoredUser): void {
    const index = this.users.findIndex((storedUser) => storedUser.id === user.id)
    if (index >= 0) this.users[index] = { ...user }
  }

  findByEmail(email: string): StoredUser | null {
    const user = this.users.find((storedUser) => storedUser.email === email)
    return user === undefined ? null : { ...user }
  }

  findByToken(token: string): StoredUser | null {
    const user = this.users.find((storedUser) => storedUser.confirmationToken === token)
    return user === undefined ? null : { ...user }
  }
}
