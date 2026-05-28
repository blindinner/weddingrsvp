import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseInstance: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient {
  if (supabaseInstance) {
    return supabaseInstance;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error('Missing Supabase environment variables');
  }

  supabaseInstance = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return supabaseInstance;
}

// Server-side client with service role key - use only in API routes/server components
export const supabase = {
  from: (table: string) => getSupabaseClient().from(table),
};

// Types for database tables
export interface Guest {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string;
  phone_raw: string | null;
  expected_guest_count: number;
  status: 'attending' | 'not_attending' | 'maybe' | null;
  actual_guest_count: number | null;
  dietary: 'regular' | 'vegetarian' | 'vegan' | 'gluten_free' | 'other' | null;
  message: string | null;
  submitted_at: string | null;
  created_at: string;
}

export interface UnmatchedResponse {
  id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  phone_raw: string | null;
  status: string | null;
  actual_guest_count: number | null;
  dietary: string | null;
  message: string | null;
  submitted_at: string;
  linked_guest_id: string | null;
}
