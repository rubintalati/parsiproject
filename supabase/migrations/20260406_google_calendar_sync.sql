-- Google Calendar API integration: store tokens and event mappings

-- Add Google sync columns to user_settings
ALTER TABLE user_settings
  ADD COLUMN google_refresh_token TEXT,
  ADD COLUMN google_calendar_id TEXT,
  ADD COLUMN google_sync_enabled BOOLEAN NOT NULL DEFAULT false;

-- Mapping table: which contact event → which Google Calendar event ID
CREATE TABLE google_calendar_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL CHECK (event_type IN ('gregorian', 'roj')),
    roj_index INTEGER,
    google_event_id TEXT NOT NULL,
    event_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_gcal_events_user ON google_calendar_events(user_id);
CREATE INDEX idx_gcal_events_contact ON google_calendar_events(contact_id);
CREATE UNIQUE INDEX idx_gcal_events_google ON google_calendar_events(user_id, google_event_id);

-- RLS
ALTER TABLE google_calendar_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own gcal events"
    ON google_calendar_events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own gcal events"
    ON google_calendar_events FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own gcal events"
    ON google_calendar_events FOR DELETE USING (auth.uid() = user_id);
