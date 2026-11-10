import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from 'node:crypto';

function key() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is required for company registration');
  return Buffer.from(hkdfSync('sha256', secret, '', 'bamousso/company-registration/password/v1', 32));
}

export function sealRegistrationHash(hash: string, email: string) {
  const nonce = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(), nonce);
  cipher.setAAD(Buffer.from(email));
  const encrypted = Buffer.concat([cipher.update(hash, 'utf8'), cipher.final()]);
  return Buffer.concat([nonce, cipher.getAuthTag(), encrypted]).toString('base64url');
}

export function openRegistrationHash(envelope: string, email: string) {
  const bytes = Buffer.from(envelope, 'base64url');
  if (bytes.length !== 88) throw new Error('Invalid registration password envelope');
  const decipher = createDecipheriv('aes-256-gcm', key(), bytes.subarray(0, 12));
  decipher.setAAD(Buffer.from(email));
  decipher.setAuthTag(bytes.subarray(12, 28));
  return Buffer.concat([decipher.update(bytes.subarray(28)), decipher.final()]).toString('utf8');
}
