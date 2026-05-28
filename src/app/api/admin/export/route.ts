import { NextResponse } from 'next/server';
import Papa from 'papaparse';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    const { data: guests, error } = await supabase
      .from('guests')
      .select('*')
      .order('last_name', { ascending: true });

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    // Transform data for CSV
    const csvData = (guests || []).map(guest => ({
      first_name: guest.first_name,
      last_name: guest.last_name,
      email: guest.email || '',
      phone: guest.phone,
      expected_guest_count: guest.expected_guest_count,
      status: guest.status || '',
      actual_guest_count: guest.actual_guest_count || '',
      dietary: guest.dietary || '',
      message: guest.message || '',
      submitted_at: guest.submitted_at || '',
    }));

    const csv = Papa.unparse(csvData, {
      header: true,
    });

    // Generate filename with date
    const date = new Date().toISOString().split('T')[0];
    const filename = `noa-ariel-rsvp-${date}.csv`;

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
