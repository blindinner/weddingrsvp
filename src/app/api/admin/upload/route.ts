import { NextRequest, NextResponse } from 'next/server';
import Papa from 'papaparse';
import { supabase } from '@/lib/supabase';
import { normalizePhone } from '@/lib/phone';

interface CSVRow {
  name?: string;
  'first name'?: string;
  'last name'?: string;
  email?: string;
  'phone number'?: string;
  phone?: string;
  'guest count'?: string;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const csvText = await file.text();

    const parseResult = Papa.parse<CSVRow>(csvText, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.toLowerCase().trim(),
    });

    if (parseResult.errors.length > 0) {
      console.error('CSV parse errors:', parseResult.errors);
      return NextResponse.json(
        { error: 'Invalid CSV format', details: parseResult.errors },
        { status: 400 }
      );
    }

    // Get existing phones for deduplication
    const { data: existingGuests } = await supabase
      .from('guests')
      .select('phone');

    const existingPhones = new Set(existingGuests?.map(g => g.phone) || []);

    let inserted = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (let i = 0; i < parseResult.data.length; i++) {
      const row = parseResult.data[i];
      const rowNum = i + 2; // +2 for 1-indexed + header row

      // Extract fields with flexible column names
      let firstName = row['first name'] || row.name?.split(' ')[0] || '';
      let lastName = row['last name'] || row.name?.split(' ').slice(1).join(' ') || '';
      const email = row.email || null;
      const phoneRaw = row['phone number'] || row.phone || '';
      const guestCountStr = row['guest count'] || '1';

      firstName = firstName.trim();
      lastName = lastName.trim();

      // Validate required fields
      if (!firstName) {
        errors.push(`Row ${rowNum}: Missing first name`);
        skipped++;
        continue;
      }

      if (!phoneRaw) {
        errors.push(`Row ${rowNum}: Missing phone number`);
        skipped++;
        continue;
      }

      const normalizedPhone = normalizePhone(phoneRaw);

      // Skip if phone is too short (invalid)
      if (normalizedPhone.length < 9) {
        errors.push(`Row ${rowNum}: Invalid phone number "${phoneRaw}"`);
        skipped++;
        continue;
      }

      // Skip duplicates
      if (existingPhones.has(normalizedPhone)) {
        skipped++;
        continue;
      }

      // Parse guest count
      let expectedGuestCount = parseInt(guestCountStr, 10);
      if (isNaN(expectedGuestCount) || expectedGuestCount < 1) {
        expectedGuestCount = 1;
      }

      // Insert guest
      const { error: insertError } = await supabase
        .from('guests')
        .insert({
          first_name: firstName,
          last_name: lastName,
          email: email || null,
          phone: normalizedPhone,
          phone_raw: phoneRaw,
          expected_guest_count: expectedGuestCount,
        });

      if (insertError) {
        console.error(`Insert error for row ${rowNum}:`, insertError);
        errors.push(`Row ${rowNum}: Database error`);
        skipped++;
        continue;
      }

      existingPhones.add(normalizedPhone);
      inserted++;
    }

    return NextResponse.json({
      inserted,
      skipped,
      errors: errors.slice(0, 10), // Return only first 10 errors
      totalErrors: errors.length,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
