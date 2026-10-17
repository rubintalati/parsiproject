-- Lagan ni Chitthi: event card images, opt-in veg question, reply source,
-- and no guest-visible headcount cap (max_guests becomes the couple's
-- private "expected" number; guests just say how many are coming).
-- Run this in the Supabase SQL Editor AFTER 20261018_wedding_invites.sql

-- ─── Events: card image + whether to ask veg / non-veg ──────────
ALTER TABLE wedding_events
    ADD COLUMN image_path TEXT,
    ADD COLUMN ask_diet BOOLEAN NOT NULL DEFAULT false;

-- ─── Invitations: how a reply reached the couple ────────────────
ALTER TABLE wedding_invitations DROP CONSTRAINT IF EXISTS wedding_invitations_responded_via_check;
ALTER TABLE wedding_invitations ADD CONSTRAINT wedding_invitations_responded_via_check
    CHECK (responded_via IN ('guest_link', 'host', 'call', 'whatsapp', 'in_person', 'other'));

-- ─── Log: who recorded the change (NULL = guest via link) ───────
ALTER TABLE wedding_rsvp_log ADD COLUMN changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION private.log_rsvp_change()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
    IF (OLD.status, OLD.adults, OLD.kids, OLD.veg) IS DISTINCT FROM (NEW.status, NEW.adults, NEW.kids, NEW.veg) THEN
        INSERT INTO public.wedding_rsvp_log (wedding_id, invitation_id, old_status, new_status, old_count, new_count, source, changed_by)
        VALUES (NEW.wedding_id, NEW.id, OLD.status, NEW.status, OLD.adults + OLD.kids, NEW.adults + NEW.kids,
                COALESCE(NEW.responded_via, 'host'), auth.uid());
    END IF;
    RETURN NEW;
END;
$$;

-- ─── Guest RPCs: expose image + diet flag, only count veg where asked
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
                'image_path', e.image_path,
                'ask_diet', e.ask_diet,
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
    v_ask_diet BOOLEAN;
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

        SELECT i.id, e.rsvp_deadline, e.ask_diet INTO v_inv_id, v_deadline, v_ask_diet
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
            v_veg := CASE WHEN v_ask_diet THEN GREATEST(COALESCE((v_r->>'veg')::INT, 0), 0) ELSE 0 END;
            IF v_adults + v_kids < 1 THEN
                v_adults := 1;
            END IF;
            -- Sanity bound only; replies above the expected number are flagged to the couple, not refused.
            IF v_adults + v_kids > 30 THEN
                RETURN jsonb_build_object('ok', false, 'error', 'bad_request');
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

-- ─── Storage: event card images ─────────────────────────────────
-- Public bucket so guests can see cards without signing in; paths are
-- <wedding_id>/<random>.jpg and only wedding members can write them.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('chitthi', 'chitthi', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION private.can_manage_chitthi_object(p_name TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
    v_folder TEXT := split_part(p_name, '/', 1);
BEGIN
    IF v_folder !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
        RETURN false;
    END IF;
    RETURN private.is_wedding_member(v_folder::UUID);
END;
$$;

GRANT EXECUTE ON FUNCTION private.can_manage_chitthi_object(TEXT) TO authenticated;

CREATE POLICY "Chitthi members can read images"
    ON storage.objects FOR SELECT TO authenticated
    USING (bucket_id = 'chitthi' AND private.can_manage_chitthi_object(name));

CREATE POLICY "Chitthi members can upload images"
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'chitthi' AND private.can_manage_chitthi_object(name));

CREATE POLICY "Chitthi members can update images"
    ON storage.objects FOR UPDATE TO authenticated
    USING (bucket_id = 'chitthi' AND private.can_manage_chitthi_object(name))
    WITH CHECK (bucket_id = 'chitthi' AND private.can_manage_chitthi_object(name));

CREATE POLICY "Chitthi members can delete images"
    ON storage.objects FOR DELETE TO authenticated
    USING (bucket_id = 'chitthi' AND private.can_manage_chitthi_object(name));
