import { decrypt, encrypt } from './crypto.util';

describe('crypto.util', () => {
  it('encrypts provider secrets without storing plaintext and decrypts them', () => {
    const plaintext = 'sk-sensitive-provider-key';
    const key = '0123456789abcdef0123456789abcdef';
    const ciphertext = encrypt(plaintext, key);

    expect(ciphertext).not.toContain(plaintext);
    expect(decrypt(ciphertext, key)).toBe(plaintext);
  });

  it('rejects ciphertext authentication with a different key', () => {
    const ciphertext = encrypt('secret', 'correct-key');
    expect(() => decrypt(ciphertext, 'wrong-key')).toThrow();
  });
});
