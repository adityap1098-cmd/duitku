/**
 * AES-GCM encrypt/decrypt tests.
 */

import { describe, it, expect } from 'vitest';
import { encrypt, decrypt } from '../../src/lib/crypto';

const TEST_KEY = 'test-encryption-key-for-aes-256-gcm';

describe('encrypt/decrypt', () => {
  it('round-trips plaintext correctly', async () => {
    const plaintext = 'my-secret-gmail-refresh-token-123';
    const encrypted = await encrypt(plaintext, TEST_KEY);
    const decrypted = await decrypt(encrypted, TEST_KEY);

    expect(decrypted).toBe(plaintext);
  });

  it('produces different ciphertexts for same plaintext (random IV)', async () => {
    const plaintext = 'same-input-different-output';
    const a = await encrypt(plaintext, TEST_KEY);
    const b = await encrypt(plaintext, TEST_KEY);

    expect(a).not.toBe(b); // different IVs → different ciphertext
    expect(await decrypt(a, TEST_KEY)).toBe(plaintext);
    expect(await decrypt(b, TEST_KEY)).toBe(plaintext);
  });

  it('fails to decrypt with wrong key', async () => {
    const encrypted = await encrypt('secret', TEST_KEY);
    await expect(decrypt(encrypted, 'wrong-key-entirely-different')).rejects.toThrow();
  });

  it('handles empty string', async () => {
    const encrypted = await encrypt('', TEST_KEY);
    const decrypted = await decrypt(encrypted, TEST_KEY);
    expect(decrypted).toBe('');
  });

  it('handles unicode text', async () => {
    const plaintext = 'Halo dunia! 🌍 Ini token refreshmu';
    const encrypted = await encrypt(plaintext, TEST_KEY);
    const decrypted = await decrypt(encrypted, TEST_KEY);
    expect(decrypted).toBe(plaintext);
  });
});
