import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyPassword, setAdminSession } from '@/lib/auth';

const loginSchema = z.object({
  password: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = loginSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    if (!verifyPassword(validation.data.password)) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }

    await setAdminSession();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
