// Versiegelt Werte mit AES-GCM: Der Browser hält nur unlesbare Pakete, öffnen kann sie allein
// der Proxy mit seinem Server-Geheimnis. Der Zweck geht als zusätzliche Authentifizierung ein,
// damit ein Paket nie für einen anderen Zweck durchgeht.

export type SealPurpose = 'codenames-state-v1'

export class SealError extends Error {}

const encoder = new TextEncoder()
const decoder = new TextDecoder()
const keyCache = new Map<string, Promise<CryptoKey>>()

function deriveKey(secret: string, purpose: SealPurpose): Promise<CryptoKey> {
  const cacheKey = `${purpose}:${secret}`
  let key = keyCache.get(cacheKey)
  if (!key) {
    key = crypto.subtle
      .importKey('raw', encoder.encode(secret), 'HKDF', false, ['deriveKey'])
      .then((material) =>
        crypto.subtle.deriveKey(
          { name: 'HKDF', hash: 'SHA-256', salt: encoder.encode('bengtstoolbox-codenames'), info: encoder.encode(purpose) },
          material,
          { name: 'AES-GCM', length: 256 },
          false,
          ['encrypt', 'decrypt'],
        ),
      )
    keyCache.set(cacheKey, key)
  }
  return key
}

async function transform(bytes: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const output = new Blob([bytes as BlobPart]).stream().pipeThrough(stream)
  return new Uint8Array(await new Response(output).arrayBuffer())
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(text: string): Uint8Array {
  const base64 = text.replace(/-/g, '+').replace(/_/g, '/')
  const binary = atob(base64 + '='.repeat((4 - (base64.length % 4)) % 4))
  return Uint8Array.from(binary, (c) => c.charCodeAt(0))
}

export function assertSecret(secret: string) {
  if (secret.length < 32) throw new SealError('Server-Geheimnis fehlt oder ist zu kurz.')
}

export async function seal(value: unknown, secret: string, purpose: SealPurpose): Promise<string> {
  assertSecret(secret)
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const packed = await transform(encoder.encode(JSON.stringify(value)), new CompressionStream('gzip'))
  const cipher = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: encoder.encode(purpose) },
    await deriveKey(secret, purpose),
    packed as BufferSource,
  )
  const out = new Uint8Array(iv.length + cipher.byteLength)
  out.set(iv)
  out.set(new Uint8Array(cipher), iv.length)
  return toBase64Url(out)
}

export async function unseal<T>(box: unknown, secret: string, purpose: SealPurpose): Promise<T> {
  assertSecret(secret)
  if (typeof box !== 'string' || box.length < 24 || !/^[A-Za-z0-9_-]+$/.test(box)) throw new SealError('Ungültiges Paket.')
  try {
    const bytes = fromBase64Url(box)
    const plain = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: bytes.slice(0, 12), additionalData: encoder.encode(purpose) },
      await deriveKey(secret, purpose),
      bytes.slice(12) as BufferSource,
    )
    const json = await transform(new Uint8Array(plain), new DecompressionStream('gzip'))
    return JSON.parse(decoder.decode(json)) as T
  } catch {
    throw new SealError('Paket lässt sich nicht öffnen.')
  }
}
