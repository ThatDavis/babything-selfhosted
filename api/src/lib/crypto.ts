import crypto from 'crypto'

const ALGO = 'aes-256-gcm'
const KEY_LEN = 32
const IV_LEN = 16
const TAG_LEN = 16

function getKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY
  if (!raw) {
    throw new Error('ENCRYPTION_KEY is not set')
  }
  // Derive a fixed 32-byte key from any length input using SHA-256
  return crypto.createHash('sha256').update(raw).digest()
}

/**
 * Encrypt a plaintext string.
 * Returns a colon-delimited string: iv:ciphertext:authTag (all base64)
 */
export function encrypt(plaintext: string): string {
  const key = getKey()
  const iv = crypto.randomBytes(IV_LEN)
  const cipher = crypto.createCipheriv(ALGO, key, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${iv.toString('base64')}:${encrypted.toString('base64')}:${tag.toString('base64')}`
}

/**
 * Decrypt a string produced by encrypt().
 * Throws if tampered or malformed.
 */
export function decrypt(ciphertext: string): string {
  const key = getKey()
  const parts = ciphertext.split(':')
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted value format')
  }
  const iv = Buffer.from(parts[0], 'base64')
  const encrypted = Buffer.from(parts[1], 'base64')
  const tag = Buffer.from(parts[2], 'base64')
  if (iv.length !== IV_LEN || tag.length !== TAG_LEN) {
    throw new Error('Invalid IV or auth tag length')
  }
  const decipher = crypto.createDecipheriv(ALGO, key, iv)
  decipher.setAuthTag(tag)
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()])
  return decrypted.toString('utf8')
}

/**
 * Conditionally encrypt a value. Returns plaintext if ENCRYPTION_KEY is not set
 * (graceful degradation for dev environments), otherwise returns ciphertext.
 */
export function encryptOptional(value: string): string {
  if (!process.env.ENCRYPTION_KEY) return value
  return encrypt(value)
}

/**
 * Conditionally decrypt a value. Returns plaintext if ENCRYPTION_KEY is not set
 * or if the value doesn't look like our encrypted format.
 */
export function decryptOptional(value: string): string {
  if (!process.env.ENCRYPTION_KEY) return value
  if (!value.includes(':')) return value
  return decrypt(value)
}
