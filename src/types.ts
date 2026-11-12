export interface RegistrationInput {
  email: string
  password: string
  fullName: string
  country: string
}

export interface StoredUser {
  id: string
  email: string
  fullName: string
  country: string
  passwordHash: string
  confirmationToken: string
  tokenExpiresAt: string
  status: 'pending' | 'active'
  createdAt: string
}

export interface RegistrationResult {
  userId: string
  confirmationToken: string
  expiresAt: string
}
