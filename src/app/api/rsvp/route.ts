import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';
import { normalizePhone } from '@/lib/phone';

// Rate limiting - in-memory store (resets on server restart)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 5;
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (record.count >= RATE_LIMIT) {
    return false;
  }

  record.count++;
  return true;
}

const rsvpSchema = z.object({
  firstName: z.string().min(1, 'שם פרטי נדרש'),
  lastName: z.string().min(1, 'שם משפחה נדרש'),
  phone: z.string().min(1, 'מספר טלפון נדרש'),
  status: z.enum(['attending', 'not_attending']),
  actualGuestCount: z.number().int().min(1).max(10).nullable(),
  dietary: z.enum(['regular', 'vegetarian', 'vegan', 'gluten_free', 'other']).nullable(),
  message: z.string().nullable(),
});

export async function POST(request: NextRequest) {
  try {
    // Get client IP for rate limiting
    const forwardedFor = request.headers.get('x-forwarded-for');
    const ip = forwardedFor?.split(',')[0]?.trim() || 'unknown';

    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: 'יותר מדי בקשות. נסו שוב בעוד דקה.' },
        { status: 429 }
      );
    }

    // Parse and validate body
    const body = await request.json();
    const validation = rsvpSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0]?.message || 'נתונים לא תקינים' },
        { status: 400 }
      );
    }

    const data = validation.data;
    const normalizedPhone = normalizePhone(data.phone);
    const submittedAt = new Date().toISOString();

    // Try to find matching guest by normalized phone
    const { data: existingGuests, error: queryError } = await supabase
      .from('guests')
      .select('id')
      .eq('phone', normalizedPhone);

    if (queryError) {
      console.error('Supabase query error:', queryError);
      return NextResponse.json(
        { error: 'שגיאה בשרת. נסו שוב.' },
        { status: 500 }
      );
    }

    if (existingGuests && existingGuests.length > 0) {
      // MATCH FOUND - update guest record
      const guestId = existingGuests[0].id;

      const { error: updateError } = await supabase
        .from('guests')
        .update({
          status: data.status,
          actual_guest_count: data.actualGuestCount,
          dietary: data.dietary,
          message: data.message,
          submitted_at: submittedAt,
        })
        .eq('id', guestId);

      if (updateError) {
        console.error('Supabase update error:', updateError);
        return NextResponse.json(
          { error: 'שגיאה בעדכון. נסו שוב.' },
          { status: 500 }
        );
      }

      return NextResponse.json({ matched: true });
    } else {
      // NO MATCH - insert into unmatched_responses
      const { error: insertError } = await supabase
        .from('unmatched_responses')
        .insert({
          first_name: data.firstName,
          last_name: data.lastName,
          phone: normalizedPhone,
          phone_raw: data.phone,
          status: data.status,
          actual_guest_count: data.actualGuestCount,
          dietary: data.dietary,
          message: data.message,
          submitted_at: submittedAt,
        });

      if (insertError) {
        console.error('Supabase insert error:', insertError);
        return NextResponse.json(
          { error: 'שגיאה בשמירת הנתונים. נסו שוב.' },
          { status: 500 }
        );
      }

      // Return success - don't reveal to user that they're unmatched
      return NextResponse.json({ matched: false });
    }
  } catch (error) {
    console.error('RSVP API error:', error);
    return NextResponse.json(
      { error: 'שגיאה בשרת. נסו שוב.' },
      { status: 500 }
    );
  }
}
