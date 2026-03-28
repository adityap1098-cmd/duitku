/**
 * AES-GCM encrypt/decrypt using Web Crypto API.
 * Used to encrypt Gmail refresh tokens before storing in D1.
 *
 * Format: base64(iv:ciphertext) where iv is 12 bytes.
 */

const IV_LENGTH = 12;
const ALGORITHM = 'AES-GCM';

function textEncode(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

function textDecode(data: Uint8Array): string {
  return new TextDecoder().decode(data);
}

/**
 * Derive a CryptoKey from a string secret using raw import.
 * Secret must be exactly 32 bytes for AES-256, or we hash it to get 256 bits.
 */
async function deriveKey(secret: string): Promise<CryptoKey> {
  // Hash the secret to get exactly 32 bytes (AES-256)
  const secretBytes = textEncode(secret);
  const hash = await crypto.subtle.digest('SHA-256', secretBytes);

  return crypto.subtle.importKey(
    'raw',
    hash,
    { name: ALGORITHM },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt plaintext with AES-256-GCM.
 * Returns base64-encoded string containing IV + ciphertext.
 */
export async function encrypt(plaintext: string, secret: string): Promise<string> {
  const key = await deriveKey(secret);
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encoded = textEncode(plaintext);

  const ciphertext = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv },
    key,
    encoded
  );

  // Combine IV + ciphertext into single buffer
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(ciphertext), iv.length);

  // Encode as base64
  let binary = '';
  for (let i = 0; i < combined.length; i++) {
    binary += String.fromCharCode(combined[i]);
  }
  return btoa(binary);
}

/**
 * Decrypt a base64-encoded AES-256-GCM ciphertext.
 * Expects format produced by encrypt().
 */
export async function decrypt(encryptedBase64: string, secret: string): Promise<string> {
  const key = await deriveKey(secret);

  // Decode from base64
  const binary = atob(encryptedBase64);
  const combined = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    combined[i] = binary.charCodeAt(i);
  }

  // Extract IV and ciphertext
  const iv = combined.slice(0, IV_LENGTH);
  const ciphertext = combined.slice(IV_LENGTH);

  const decrypted = await crypto.subtle.decrypt(
    { name: ALGORITHM, iv },
    key,
    ciphertext
  );

  return textDecode(new Uint8Array(decrypted));
}
