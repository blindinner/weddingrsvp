import { cookies } from 'next/headers';
import { createHmac } from 'crypto';

const COOKIE_NAME = 'admin_session';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

function getAdminSecret(): string {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) {
    throw new Error('ADMIN_SECRET environment variable is not set');
  }
  return secret;
}

function getAdminPassword(): string {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) {
    throw new Error('ADMIN_PASSWORD environment variable is not set');
  }
  return password;
}

export function signValue(value: string): string {
  const hmac = createHmac('sha256', getAdminSecret());
  hmac.update(value);
  return `${value}.${hmac.digest('hex')}`;
}

export function verifySignedValue(signedValue: string): string | null {
  const parts = signedValue.split('.');
  if (parts.length !== 2) return null;

  const [value, signature] = parts;
  const expectedSigned = signValue(value);

  if (signedValue === expectedSigned) {
    return value;
  }
  return null;
}

export function verifyPassword(password: string): boolean {
  return password === getAdminPassword();
}

export async function setAdminSession(): Promise<void> {
  const cookieStore = await cookies();
  const sessionValue = signValue('authenticated');

  cookieStore.set(COOKIE_NAME, sessionValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  });
}

export async function clearAdminSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function isAdminAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(COOKIE_NAME);

  if (!sessionCookie) return false;

  const value = verifySignedValue(sessionCookie.value);
  return value === 'authenticated';
}
