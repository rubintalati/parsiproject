-- Roj Wisher Schema Migration
-- Run this in the Supabase SQL Editor (supabase.com → your project → SQL Editor)

-- ─── Extensions ──────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── User Settings ──────────────────────────────────────────────
CREATE TABLE user_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    calendar_type TEXT NOT NULL DEFAULT 'S' CHECK (calendar_type IN ('S', 'K', 'F')),
    remind_on_roj_birthday BOOLEAN NOT NULL DEFAULT true,
    remind_on_actual_birthday BOOLEAN NOT NULL DEFAULT true,
    reminder_timing TEXT NOT NULL DEFAULT 'both' CHECK (reminder_timing IN ('day_of', 'day_before', 'both')),
    calendar_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id)
);

CREATE INDEX idx_user_settings_user_id ON user_settings(user_id);
CREATE INDEX idx_user_settings_token ON user_settings(calendar_token);

-- ─── Contacts ────────────────────────────────────────────────────
CREATE TABLE contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    date_of_birth DATE NOT NULL,
    before_sunrise BOOLEAN NOT NULL DEFAULT false,
    event_type TEXT NOT NULL DEFAULT 'birthday' CHECK (event_type IN ('birthday', 'anniversary')),
    mobile_number TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_contacts_user_id ON contacts(user_id);

-- ─── Auto-update updated_at trigger ─────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_contacts_updated_at
    BEFORE UPDATE ON contacts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_user_settings_updated_at
    BEFORE UPDATE ON user_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ─── Row Level Security ─────────────────────────────────────────
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- Contacts: users can only access their own rows
CREATE POLICY "Users can select own contacts"
    ON contacts FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own contacts"
    ON contacts FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own contacts"
    ON contacts FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own contacts"
    ON contacts FOR DELETE
    USING (auth.uid() = user_id);

-- User settings: users can only access their own row
CREATE POLICY "Users can select own settings"
    ON user_settings FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings"
    ON user_settings FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own settings"
    ON user_settings FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Service role bypass for edge function (calendar feed reads by token)
-- The edge function uses the service_role key which bypasses RLS automatically.
