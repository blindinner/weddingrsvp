import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Use Web Crypto API for Edge Runtime compatibility
async function createHmacSignature(value: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(value);

  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', key, messageData);
  const hashArray = Array.from(new Uint8Array(signature));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function verifySignedValue(signedValue: string, secret: string): Promise<string | null> {
  const parts = signedValue.split('.');
  if (parts.length !== 2) return null;

  const [value, signature] = parts;
  const expectedSignature = await createHmacSignature(value, secret);

  if (signature === expectedSignature) {
    return value;
  }
  return null;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only protect /admin routes (except /admin/login)
  if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
    const sessionCookie = request.cookies.get('admin_session');
    const secret = process.env.ADMIN_SECRET;

    if (!secret) {
      console.error('ADMIN_SECRET not configured');
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }

    if (!sessionCookie) {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }

    const value = await verifySignedValue(sessionCookie.value, secret);
    if (value !== 'authenticated') {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
  }

  // Protect /api/admin routes (except login)
  if (pathname.startsWith('/api/admin') && !pathname.includes('/login')) {
    const sessionCookie = request.cookies.get('admin_session');
    const secret = process.env.ADMIN_SECRET;

    if (!secret || !sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const value = await verifySignedValue(sessionCookie.value, secret);
    if (value !== 'authenticated') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};
