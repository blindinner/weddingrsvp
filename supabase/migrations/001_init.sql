-- Wedding RSVP Database Schema
-- Run this in Supabase SQL Editor

-- Guests table
CREATE TABLE IF NOT EXISTS guests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text,
  phone text NOT NULL,
  phone_raw text,
  expected_guest_count int DEFAULT 1,
  status text CHECK (status IN ('attending', 'not_attending', 'maybe')),
  actual_guest_count int,
  dietary text CHECK (dietary IN ('regular', 'vegetarian', 'vegan', 'gluten_free', 'other')),
  message text,
  submitted_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Index for phone lookup (critical for RSVP matching)
CREATE INDEX IF NOT EXISTS idx_guests_phone ON guests(phone);

-- Unmatched responses table
CREATE TABLE IF NOT EXISTS unmatched_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text,
  last_name text,
  phone text,
  phone_raw text,
  status text,
  actual_guest_count int,
  dietary text,
  message text,
  submitted_at timestamptz DEFAULT now(),
  linked_guest_id uuid REFERENCES guests(id) ON DELETE SET NULL
);

-- Index for unmatched responses
CREATE INDEX IF NOT EXISTS idx_unmatched_phone ON unmatched_responses(phone);

-- Enable Row Level Security (optional but recommended)
ALTER TABLE guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE unmatched_responses ENABLE ROW LEVEL SECURITY;

-- Create policies for service role access (service role bypasses RLS, but good to have)
CREATE POLICY "Service role full access to guests" ON guests
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role full access to unmatched_responses" ON unmatched_responses
  FOR ALL
  USING (true)
  WITH CHECK (true);
