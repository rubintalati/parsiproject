-- Wedding Invites & RSVP Schema Migration
-- Run this in the Supabase SQL Editor (supabase.com → your project → SQL Editor)
--
-- Couples (and co-hosts) manage weddings through the Supabase client under RLS.
-- Guests never touch tables directly: they hold an unguessable per-household
-- token and go through get_rsvp() / submit_rsvp(), which are callable by anon.

CREATE SCHEMA IF NOT EXISTS private;

-- ─── Weddings ────────────────────────────────────────────────────
CREATE TABLE weddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    couple_names TEXT NOT NULL,
    invite_template TEXT,
    reminder_template TEXT,
    join_code TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(6), 'hex'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Members (couple, parents, planner) ─────────────────────────
CREATE TABLE wedding_members (
    wedding_id UUID NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'cohost' CHECK (role IN ('owner', 'cohost')),
    display_name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (wedding_id, user_id)
);

CREATE INDEX idx_wedding_members_user_id ON wedding_members(user_id);

-- ─── Events (madhavsaro, adarni, lagan, dinner …) ───────────────
CREATE TABLE wedding_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wedding_id UUID NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    kind TEXT NOT NULL DEFAULT 'custom',
    host_side TEXT NOT NULL DEFAULT 'both' CHECK (host_side IN ('bride', 'groom', 'both')),
    starts_at TIMESTAMPTZ,
    tz TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    parsi_date TEXT,
    venue TEXT,
    rsvp_deadline DATE,
    seats_per_panth INT CHECK (seats_per_panth IS NULL OR seats_per_panth > 0),
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (id, wedding_id)
);

CREATE INDEX idx_wedding_events_wedding_id ON wedding_events(wedding_id);

-- ─── Households (the invitation unit: "Mr & Mrs X & family") ────
CREATE TABLE wedding_households (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wedding_id UUID NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
    display_name TEXT NOT NULL,
    phone_e164 TEXT,
    side TEXT NOT NULL DEFAULT 'both' CHECK (side IN ('bride', 'groom', 'both')),
    invited_by TEXT,
    locality TEXT NOT NULL DEFAULT 'local' CHECK (locality IN ('local', 'outstation', 'overseas')),
    max_guests INT NOT NULL DEFAULT 2 CHECK (max_guests BETWEEN 1 AND 50),
    notes TEXT,
    guest_note TEXT,
    rsvp_token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
    card_delivered BOOLEAN NOT NULL DEFAULT false,
    wa_sent_at TIMESTAMPTZ,
    reminded_at TIMESTAMPTZ,
    link_opened_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (id, wedding_id)
);

CREATE INDEX idx_wedding_households_wedding_id ON wedding_households(wedding_id);

-- ─── Invitations (per household, per event — headcount lives here)
CREATE TABLE wedding_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wedding_id UUID NOT NULL,
    household_id UUID NOT NULL,
    event_id UUID NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'yes', 'no', 'maybe')),
    adults INT NOT NULL DEFAULT 0 CHECK (adults >= 0),
    kids INT NOT NULL DEFAULT 0 CHECK (kids >= 0),
    veg INT NOT NULL DEFAULT 0 CHECK (veg >= 0),
    responded_via TEXT CHECK (responded_via IN ('guest_link', 'host')),
    responded_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (household_id, event_id),
    -- Composite FKs keep a household and event inside the same wedding
    FOREIGN KEY (household_id, wedding_id) REFERENCES wedding_households(id, wedding_id) ON DELETE CASCADE,
    FOREIGN KEY (event_id, wedding_id) REFERENCES wedding_events(id, wedding_id) ON DELETE CASCADE,
    CHECK (veg <= adults + kids)
);

CREATE INDEX idx_wedding_invitations_wedding_id ON wedding_invitations(wedding_id);
CREATE INDEX idx_wedding_invitations_event_id ON wedding_invitations(event_id);

-- ─── RSVP change log ("the Mistrys went from 4 to 2") ───────────
CREATE TABLE wedding_rsvp_log (
    id BIGSERIAL PRIMARY KEY,
    wedding_id UUID NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
    invitation_id UUID NOT NULL REFERENCES wedding_invitations(id) ON DELETE CASCADE,
    old_status TEXT,
    new_status TEXT,
    old_count INT,
    new_count INT,
    source TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_wedding_rsvp_log_wedding_id ON wedding_rsvp_log(wedding_id);

-- ─── updated_at triggers (function from roj_wisher_schema) ──────
CREATE TRIGGER trg_weddings_updated_at
    BEFORE UPDATE ON weddings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_wedding_households_updated_at
    BEFORE UPDATE ON wedding_households
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── RSVP log trigger ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION private.log_rsvp_change()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
    IF (OLD.status, OLD.adults, OLD.kids, OLD.veg) IS DISTINCT FROM (NEW.status, NEW.adults, NEW.kids, NEW.veg) THEN
        INSERT INTO public.wedding_rsvp_log (wedding_id, invitation_id, old_status, new_status, old_count, new_count, source)
        VALUES (NEW.wedding_id, NEW.id, OLD.status, NEW.status, OLD.adults + OLD.kids, NEW.adults + NEW.kids, COALESCE(NEW.responded_via, 'host'));
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_wedding_invitations_log
    AFTER UPDATE ON wedding_invitations
    FOR EACH ROW EXECUTE FUNCTION private.log_rsvp_change();

-- ─── Membership helpers (security definer avoids recursive RLS) ─
CREATE OR REPLACE FUNCTION private.is_wedding_member(p_wedding_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.wedding_members m
        WHERE m.wedding_id = p_wedding_id AND m.user_id = (SELECT auth.uid())
    );
$$;

CREATE OR REPLACE FUNCTION private.is_wedding_owner(p_wedding_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.wedding_members m
        WHERE m.wedding_id = p_wedding_id AND m.user_id = (SELECT auth.uid()) AND m.role = 'owner'
    );
$$;

GRANT USAGE ON SCHEMA private TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_wedding_member(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_wedding_owner(UUID) TO authenticated;

-- ─── Row Level Security ─────────────────────────────────────────
ALTER TABLE weddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE wedding_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE wedding_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE wedding_households ENABLE ROW LEVEL SECURITY;
ALTER TABLE wedding_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE wedding_rsvp_log ENABLE ROW LEVEL SECURITY;

-- Weddings: created via create_wedding(); members read/update; owners delete
CREATE POLICY "Members can select weddings"
    ON weddings FOR SELECT TO authenticated
    USING (private.is_wedding_member(id));

CREATE POLICY "Members can update weddings"
    ON weddings FOR UPDATE TO authenticated
    USING (private.is_wedding_member(id))
    WITH CHECK (private.is_wedding_member(id));

CREATE POLICY "Owners can delete weddings"
    ON weddings FOR DELETE TO authenticated
    USING (private.is_wedding_owner(id));

-- Members: joined via join_wedding(); anyone can leave, owners can remove
CREATE POLICY "Members can select members"
    ON wedding_members FOR SELECT TO authenticated
    USING (private.is_wedding_member(wedding_id));

CREATE POLICY "Members can leave or owners can remove"
    ON wedding_members FOR DELETE TO authenticated
    USING (user_id = (SELECT auth.uid()) OR private.is_wedding_owner(wedding_id));

-- Events, households, invitations: full access for members
CREATE POLICY "Members manage events"
    ON wedding_events FOR ALL TO authenticated
    USING (private.is_wedding_member(wedding_id))
    WITH CHECK (private.is_wedding_member(wedding_id));

CREATE POLICY "Members manage households"
    ON wedding_households FOR ALL TO authenticated
    USING (private.is_wedding_member(wedding_id))
    WITH CHECK (private.is_wedding_member(wedding_id));

CREATE POLICY "Members manage invitations"
    ON wedding_invitations FOR ALL TO authenticated
    USING (private.is_wedding_member(wedding_id))
    WITH CHECK (private.is_wedding_member(wedding_id));

-- Log: written only by the trigger
CREATE POLICY "Members can select rsvp log"
    ON wedding_rsvp_log FOR SELECT TO authenticated
    USING (private.is_wedding_member(wedding_id));

-- ─── Couple RPCs ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.create_wedding(p_title TEXT, p_couple_names TEXT)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
    v_uid UUID := auth.uid();
    v_name TEXT := COALESCE(auth.jwt() -> 'user_metadata' ->> 'full_name', auth.jwt() ->> 'email');
    v_id UUID;
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'not signed in';
    END IF;
    INSERT INTO public.weddings (created_by, title, couple_names)
    VALUES (v_uid, p_title, p_couple_names)
    RETURNING id INTO v_id;
    INSERT INTO public.wedding_members (wedding_id, user_id, role, display_name)
    VALUES (v_id, v_uid, 'owner', v_name);
    RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.join_wedding(p_code TEXT)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
    v_uid UUID := auth.uid();
    v_name TEXT := COALESCE(auth.jwt() -> 'user_metadata' ->> 'full_name', auth.jwt() ->> 'email');
    v_id UUID;
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'not signed in';
    END IF;
    SELECT id INTO v_id FROM public.weddings WHERE join_code = lower(trim(p_code));
    IF v_id IS NULL THEN
        RETURN NULL;
    END IF;
    INSERT INTO public.wedding_members (wedding_id, user_id, role, display_name)
    VALUES (v_id, v_uid, 'cohost', v_name)
    ON CONFLICT (wedding_id, user_id) DO NOTHING;
    RETURN v_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_wedding(TEXT, TEXT) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.join_wedding(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_wedding(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_wedding(TEXT) TO authenticated;

-- ─── Guest RPCs (token is the only credential) ──────────────────
-- Deadlines are dates in India time; an RSVP closes after the deadline day ends.

CREATE OR REPLACE FUNCTION public.get_rsvp(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
    v_h public.wedding_households%ROWTYPE;
    v_w public.weddings%ROWTYPE;
    v_today DATE := (now() AT TIME ZONE 'Asia/Kolkata')::DATE;
BEGIN
    IF p_token IS NULL OR p_token !~ '^[0-9a-f]{32}$' THEN
        RETURN NULL;
    END IF;

    SELECT * INTO v_h FROM public.wedding_households WHERE rsvp_token = p_token;
    IF NOT FOUND THEN
        RETURN NULL;
    END IF;

    UPDATE public.wedding_households SET link_opened_at = now()
    WHERE id = v_h.id AND link_opened_at IS NULL;

    SELECT * INTO v_w FROM public.weddings WHERE id = v_h.wedding_id;

    RETURN jsonb_build_object(
        'wedding', jsonb_build_object('title', v_w.title, 'couple_names', v_w.couple_names),
        'household', jsonb_build_object(
            'name', v_h.display_name,
            'max_guests', v_h.max_guests,
            'guest_note', v_h.guest_note
        ),
        'events', COALESCE((
            SELECT jsonb_agg(jsonb_build_object(
                'event_id', e.id,
                'name', e.name,
                'kind', e.kind,
                'starts_at', e.starts_at,
                'tz', e.tz,
                'parsi_date', e.parsi_date,
                'venue', e.venue,
                'rsvp_deadline', e.rsvp_deadline,
                'closed', e.rsvp_deadline IS NOT NULL AND e.rsvp_deadline < v_today,
                'status', i.status,
                'adults', i.adults,
                'kids', i.kids,
                'veg', i.veg
            ) ORDER BY e.starts_at NULLS LAST, e.sort_order, e.created_at)
            FROM public.wedding_invitations i
            JOIN public.wedding_events e ON e.id = i.event_id
            WHERE i.household_id = v_h.id
        ), '[]'::jsonb)
    );
END;
$$;

-- p_responses: [{ "event_id": uuid, "status": "yes"|"no"|"maybe", "adults": n, "kids": n, "veg": n }]
-- Validates everything first, then writes, so a bad entry changes nothing.
CREATE OR REPLACE FUNCTION public.submit_rsvp(p_token TEXT, p_responses JSONB, p_note TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
    v_h public.wedding_households%ROWTYPE;
    v_today DATE := (now() AT TIME ZONE 'Asia/Kolkata')::DATE;
    v_r JSONB;
    v_inv_id UUID;
    v_deadline DATE;
    v_status TEXT;
    v_adults INT;
    v_kids INT;
    v_veg INT;
    v_clean JSONB := '[]'::jsonb;
BEGIN
    IF p_token IS NULL OR p_token !~ '^[0-9a-f]{32}$' THEN
        RETURN jsonb_build_object('ok', false, 'error', 'invalid');
    END IF;

    SELECT * INTO v_h FROM public.wedding_households WHERE rsvp_token = p_token FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('ok', false, 'error', 'invalid');
    END IF;

    IF jsonb_typeof(p_responses) IS DISTINCT FROM 'array' THEN
        RETURN jsonb_build_object('ok', false, 'error', 'bad_request');
    END IF;

    -- Pass 1: validate
    FOR v_r IN SELECT * FROM jsonb_array_elements(p_responses) LOOP
        IF COALESCE(v_r->>'event_id', '') !~ '^[0-9a-f-]{36}$' THEN
            RETURN jsonb_build_object('ok', false, 'error', 'bad_request');
        END IF;

        SELECT i.id, e.rsvp_deadline INTO v_inv_id, v_deadline
        FROM public.wedding_invitations i
        JOIN public.wedding_events e ON e.id = i.event_id
        WHERE i.household_id = v_h.id AND i.event_id = (v_r->>'event_id')::UUID
        FOR UPDATE OF i;

        IF v_inv_id IS NULL THEN
            RETURN jsonb_build_object('ok', false, 'error', 'not_invited');
        END IF;
        IF v_deadline IS NOT NULL AND v_deadline < v_today THEN
            RETURN jsonb_build_object('ok', false, 'error', 'closed');
        END IF;

        v_status := v_r->>'status';
        IF v_status IS NULL OR v_status NOT IN ('yes', 'no', 'maybe') THEN
            RETURN jsonb_build_object('ok', false, 'error', 'bad_request');
        END IF;

        IF v_status = 'yes' THEN
            v_adults := GREATEST(COALESCE((v_r->>'adults')::INT, 0), 0);
            v_kids := GREATEST(COALESCE((v_r->>'kids')::INT, 0), 0);
            v_veg := GREATEST(COALESCE((v_r->>'veg')::INT, 0), 0);
            IF v_adults + v_kids < 1 THEN
                v_adults := 1;
            END IF;
            IF v_adults + v_kids > v_h.max_guests THEN
                RETURN jsonb_build_object('ok', false, 'error', 'over_limit', 'max_guests', v_h.max_guests);
            END IF;
            v_veg := LEAST(v_veg, v_adults + v_kids);
        ELSE
            v_adults := 0; v_kids := 0; v_veg := 0;
        END IF;

        v_clean := v_clean || jsonb_build_object(
            'id', v_inv_id, 'status', v_status, 'adults', v_adults, 'kids', v_kids, 'veg', v_veg
        );
        v_inv_id := NULL;
    END LOOP;

    -- Pass 2: write
    FOR v_r IN SELECT * FROM jsonb_array_elements(v_clean) LOOP
        UPDATE public.wedding_invitations SET
            status = v_r->>'status',
            adults = (v_r->>'adults')::INT,
            kids = (v_r->>'kids')::INT,
            veg = (v_r->>'veg')::INT,
            responded_via = 'guest_link',
            responded_at = now()
        WHERE id = (v_r->>'id')::UUID;
    END LOOP;

    IF p_note IS NOT NULL THEN
        UPDATE public.wedding_households SET guest_note = NULLIF(left(trim(p_note), 500), '')
        WHERE id = v_h.id;
    END IF;

    RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_rsvp(TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.submit_rsvp(TEXT, JSONB, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_rsvp(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_rsvp(TEXT, JSONB, TEXT) TO anon, authenticated;
