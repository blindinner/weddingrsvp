import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    const { data: unmatched, error } = await supabase
      .from('unmatched_responses')
      .select('*')
      .is('linked_guest_id', null)
      .order('submitted_at', { ascending: false });

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    return NextResponse.json({ unmatched: unmatched || [] });
  } catch (error) {
    console.error('Unmatched API error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

const linkSchema = z.object({
  unmatchedId: z.string().uuid(),
  guestId: z.string().uuid(),
});

// Link unmatched response to existing guest
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = linkSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
    }

    const { unmatchedId, guestId } = validation.data;

    // Get the unmatched response
    const { data: unmatched, error: fetchError } = await supabase
      .from('unmatched_responses')
      .select('*')
      .eq('id', unmatchedId)
      .single();

    if (fetchError || !unmatched) {
      return NextResponse.json({ error: 'Unmatched response not found' }, { status: 404 });
    }

    // Update the guest with the unmatched response data
    const { error: updateError } = await supabase
      .from('guests')
      .update({
        status: unmatched.status,
        actual_guest_count: unmatched.actual_guest_count,
        dietary: unmatched.dietary,
        message: unmatched.message,
        submitted_at: unmatched.submitted_at,
      })
      .eq('id', guestId);

    if (updateError) {
      console.error('Guest update error:', updateError);
      return NextResponse.json({ error: 'Failed to update guest' }, { status: 500 });
    }

    // Mark unmatched as linked (or delete it)
    const { error: linkError } = await supabase
      .from('unmatched_responses')
      .update({ linked_guest_id: guestId })
      .eq('id', unmatchedId);

    if (linkError) {
      console.error('Link error:', linkError);
      return NextResponse.json({ error: 'Failed to link response' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Link unmatched error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

const addAsGuestSchema = z.object({
  unmatchedId: z.string().uuid(),
});

// Add unmatched response as a new guest
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = addAsGuestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
    }

    const { unmatchedId } = validation.data;

    // Get the unmatched response
    const { data: unmatched, error: fetchError } = await supabase
      .from('unmatched_responses')
      .select('*')
      .eq('id', unmatchedId)
      .single();

    if (fetchError || !unmatched) {
      return NextResponse.json({ error: 'Unmatched response not found' }, { status: 404 });
    }

    // Create new guest from unmatched response
    const { data: newGuest, error: insertError } = await supabase
      .from('guests')
      .insert({
        first_name: unmatched.first_name || 'Unknown',
        last_name: unmatched.last_name || 'Unknown',
        phone: unmatched.phone || '',
        phone_raw: unmatched.phone_raw,
        expected_guest_count: unmatched.actual_guest_count || 1,
        status: unmatched.status,
        actual_guest_count: unmatched.actual_guest_count,
        dietary: unmatched.dietary,
        message: unmatched.message,
        submitted_at: unmatched.submitted_at,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Insert guest error:', insertError);
      return NextResponse.json({ error: 'Failed to create guest' }, { status: 500 });
    }

    // Mark unmatched as linked
    await supabase
      .from('unmatched_responses')
      .update({ linked_guest_id: newGuest.id })
      .eq('id', unmatchedId);

    return NextResponse.json({ success: true, guestId: newGuest.id });
  } catch (error) {
    console.error('Add as guest error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing ID' }, { status: 400 });
    }

    const { error } = await supabase
      .from('unmatched_responses')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Supabase delete error:', error);
      return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete unmatched error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
