import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    const { data: guests, error } = await supabase
      .from('guests')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    // Calculate stats
    const totalInvitations = guests?.length || 0;
    const respondedAttending = guests?.filter(g => g.status === 'attending').length || 0;
    const respondedNotAttending = guests?.filter(g => g.status === 'not_attending').length || 0;
    const pending = guests?.filter(g => !g.status).length || 0;
    const totalPeopleAttending = guests
      ?.filter(g => g.status === 'attending')
      .reduce((sum, g) => sum + (g.actual_guest_count || 1), 0) || 0;
    const totalPeopleNotAttending = guests
      ?.filter(g => g.status === 'not_attending')
      .reduce((sum, g) => sum + (g.actual_guest_count || g.expected_guest_count || 1), 0) || 0;

    return NextResponse.json({
      guests: guests || [],
      stats: {
        totalInvitations,
        respondedAttending,
        respondedNotAttending,
        pending,
        totalPeopleAttending,
        totalPeopleNotAttending,
      },
    });
  } catch (error) {
    console.error('Guests API error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

const updateGuestSchema = z.object({
  id: z.string().uuid(),
  first_name: z.string().min(1).optional(),
  last_name: z.string().min(1).optional(),
  email: z.string().email().nullable().optional(),
  phone: z.string().optional(),
  expected_guest_count: z.number().int().min(1).optional(),
  status: z.enum(['attending', 'not_attending', 'maybe']).nullable().optional(),
  actual_guest_count: z.number().int().min(1).max(10).nullable().optional(),
  dietary: z.enum(['regular', 'vegetarian', 'vegan', 'gluten_free', 'other']).nullable().optional(),
  message: z.string().nullable().optional(),
});

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = updateGuestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0]?.message || 'Invalid data' },
        { status: 400 }
      );
    }

    const { id, ...updates } = validation.data;

    const { error } = await supabase
      .from('guests')
      .update(updates)
      .eq('id', id);

    if (error) {
      console.error('Supabase update error:', error);
      return NextResponse.json({ error: 'Update failed' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update guest error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing guest ID' }, { status: 400 });
    }

    const { error } = await supabase
      .from('guests')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Supabase delete error:', error);
      return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete guest error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
