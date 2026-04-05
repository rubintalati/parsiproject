/**
 * Supabase Edge Function: Google Calendar Sync
 *
 * Pushes Roj Wisher events directly into users' Google Calendars
 * via the Google Calendar API. Native events = working notifications.
 *
 * Actions:
 *   init   — first-time setup: store tokens, create calendar, bulk sync all contacts
 *   upsert — sync a single contact (add or edit)
 *   delete — remove events for a deleted contact
 *   resync — full re-sync (when settings change)
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

import {
  MAHNAME, ROJNAME,
  getParsiDate, generateRojBirthdaysForYears, buildWhatsAppUrl,
} from "../_shared/zoroastrian-calendar.ts";

// ─── Types ──────────────────────────────────────────────────────

interface Contact {
  id: string;
  name: string;
  date_of_birth: string | null;
  before_sunrise: boolean;
  event_type: string;
  mobile_number: string | null;
  roj: number | null;
  mah: number | null;
}

interface UserSettings {
  user_id: string;
  calendar_type: string;
  remind_on_roj_birthday: boolean;
  remind_on_actual_birthday: boolean;
  reminder_timing: string;
  google_refresh_token: string | null;
  google_calendar_id: string | null;
  google_sync_enabled: boolean;
}

interface GoogleEvent {
  summary: string;
  description: string;
  start: { date: string };
  end: { date: string };
  recurrence?: string[];
  reminders: {
    useDefault: boolean;
    overrides: { method: string; minutes: number }[];
  };
  transparency: string;
}

// ─── Google API Helpers ─────────────────────────────────────────

const GOOGLE_API_BASE = "https://www.googleapis.com/calendar/v3";

async function refreshGoogleToken(refreshToken: string): Promise<string> {
  const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
  const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");

  if (!clientId || !clientSecret) {
    throw new Error("GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET not set");
  }

  const resp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  const data = await resp.json();
  if (data.error) {
    throw new Error(`Token refresh failed: ${data.error_description || data.error}`);
  }
  return data.access_token;
}

async function googleApi(
  accessToken: string,
  method: string,
  path: string,
  body?: unknown
): Promise<unknown> {
  const opts: RequestInit = {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  };
  if (body) opts.body = JSON.stringify(body);

  const resp = await fetch(`${GOOGLE_API_BASE}${path}`, opts);

  if (resp.status === 204) return null; // DELETE success
  const data = await resp.json();

  if (!resp.ok) {
    throw new Error(`Google API ${method} ${path}: ${resp.status} ${JSON.stringify(data.error)}`);
  }
  return data;
}

// ─── Reminder Builder ───────────────────────────────────────────

function buildReminders(timing: string): { method: string; minutes: number }[] {
  const overrides: { method: string; minutes: number }[] = [];
  if (timing === "day_before" || timing === "both") {
    overrides.push({ method: "popup", minutes: 1440 }); // 1 day
  }
  if (timing === "day_of" || timing === "both") {
    overrides.push({ method: "popup", minutes: 30 });
  }
  return overrides;
}

// ─── Event Builder ──────────────────────────────────────────────

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function nextDay(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() + 1);
  return formatDate(d);
}

function buildEventsForContact(
  contact: Contact,
  settings: UserSettings
): { event: GoogleEvent; eventType: string; rojIndex: number | null; eventDate: string }[] {
  const calType = settings.calendar_type;
  const reminders = buildReminders(settings.reminder_timing);
  const isRojOnly = !contact.date_of_birth;
  const phone = contact.mobile_number || "";
  const typeLabel = contact.event_type === "birthday" ? "Birthday" : "Anniversary";
  const typeEmoji = contact.event_type === "birthday" ? "\u{1F382}" : "\u{1F48D}";
  const events: { event: GoogleEvent; eventType: string; rojIndex: number | null; eventDate: string }[] = [];

  // ── Gregorian recurring event (skip for roj-only) ──
  if (!isRojOnly && settings.remind_on_actual_birthday) {
    const waMsg = contact.event_type === "birthday"
      ? `Happy Birthday, ${contact.name}! Ek saal aur nikal gaya — but you? Still fresh like morning brun-maska.`
      : `Happy Anniversary, ${contact.name}! Itna saal saath ma dhansak khaya, that itself is true love. Kem chho? Kem rehsho? Always together!`;
    const waUrl = buildWhatsAppUrl(phone, waMsg);

    let desc = `${typeEmoji} ${contact.name}'s ${typeLabel}`;
    if (waUrl) desc += `\n\nSend WhatsApp wishes:\n${waUrl}`;

    events.push({
      event: {
        summary: `${typeEmoji} ${contact.name} \u2013 ${typeLabel}`,
        description: desc,
        start: { date: contact.date_of_birth! },
        end: { date: nextDay(contact.date_of_birth!) },
        recurrence: ["RRULE:FREQ=YEARLY"],
        reminders: { useDefault: false, overrides: reminders },
        transparency: "transparent",
      },
      eventType: "gregorian",
      rojIndex: null,
      eventDate: contact.date_of_birth!,
    });
  }

  // ── Roj birthday events (15 years) ──
  if (settings.remind_on_roj_birthday) {
    let rojNum: number | null = null;
    let mahNum: number | null = null;

    if (isRojOnly) {
      rojNum = contact.roj;
      mahNum = contact.mah;
    } else {
      const dob = new Date(contact.date_of_birth + "T12:00:00");
      const hour = contact.before_sunrise ? 5 : 12;
      const rojDate = getParsiDate(
        dob.getFullYear(), dob.getMonth() + 1, dob.getDate(), hour, calType
      );
      if (rojDate) {
        rojNum = rojDate.roj;
        mahNum = rojDate.mah;
      }
    }

    if (rojNum && mahNum) {
      const rojName = ROJNAME[rojNum - 1];
      const mahName = MAHNAME[mahNum - 1];
      const rojDates = generateRojBirthdaysForYears(rojNum, mahNum, calType, 15);

      const waMsg = contact.event_type === "birthday"
        ? `${contact.name}, your roj birthday, dikra! Do a loban, eat a ravo, thank Dadaji. Simple.`
        : `${contact.name}, Roj anniversary mubarak! Still together because nobody else would tolerate either of you. God is great.`;
      const waUrl = buildWhatsAppUrl(phone, waMsg);

      for (let i = 0; i < rojDates.length; i++) {
        const rd = rojDates[i];
        const dateStr = formatDate(rd);
        let desc = `\u{1F525} ${contact.name}'s Roj ${typeLabel} \u2013 ${rojName}, mah ${mahName}`;
        if (waUrl) desc += `\n\nSend WhatsApp wishes:\n${waUrl}`;

        events.push({
          event: {
            summary: `\u{1F525} ${contact.name} \u2013 Roj ${typeLabel} (${rojName})`,
            description: desc,
            start: { date: dateStr },
            end: { date: nextDay(dateStr) },
            reminders: { useDefault: false, overrides: reminders },
            transparency: "transparent",
          },
          eventType: "roj",
          rojIndex: i,
          eventDate: dateStr,
        });
      }
    }
  }

  return events;
}

// ─── Action Handlers ────────────────────────────────────────────

async function handleInit(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  googleAccessToken: string,
  googleRefreshToken: string
): Promise<{ calendar_id: string }> {
  // 1. Create "Roj Wisher" calendar
  const calendar = await googleApi(googleAccessToken, "POST", "/calendars", {
    summary: "Roj Wisher",
    description: "Birthdays & anniversaries with Roj reminders",
    timeZone: "Asia/Kolkata",
  }) as { id: string };

  const calendarId = calendar.id;

  // 2. Store tokens and calendar ID
  await supabase.from("user_settings").update({
    google_refresh_token: googleRefreshToken,
    google_calendar_id: calendarId,
    google_sync_enabled: true,
  }).eq("user_id", userId);

  // 3. Fetch user settings and contacts
  const { data: settings } = await supabase
    .from("user_settings")
    .select("*")
    .eq("user_id", userId)
    .single();

  const { data: contacts } = await supabase
    .from("contacts")
    .select("*")
    .eq("user_id", userId);

  if (!contacts || !settings) {
    return { calendar_id: calendarId };
  }

  // 4. Push events for all contacts
  for (const contact of contacts as Contact[]) {
    const eventDefs = buildEventsForContact(contact, settings as UserSettings);
    for (const def of eventDefs) {
      try {
        const created = await googleApi(
          googleAccessToken, "POST",
          `/calendars/${encodeURIComponent(calendarId)}/events`,
          def.event
        ) as { id: string };

        // Record mapping
        await supabase.from("google_calendar_events").insert({
          user_id: userId,
          contact_id: contact.id,
          event_type: def.eventType,
          roj_index: def.rojIndex,
          google_event_id: created.id,
          event_date: def.eventDate,
        });
      } catch (err) {
        console.error(`Failed to create event for ${contact.name}:`, err);
      }
    }
  }

  return { calendar_id: calendarId };
}

async function handleUpsert(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  contactId: string
): Promise<void> {
  // Get settings
  const { data: settings } = await supabase
    .from("user_settings")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (!settings || !settings.google_refresh_token || !settings.google_calendar_id) {
    throw new Error("Google Calendar sync not configured");
  }

  const accessToken = await refreshGoogleToken(settings.google_refresh_token);
  const calendarId = settings.google_calendar_id;

  // Delete existing events for this contact
  const { data: existingEvents } = await supabase
    .from("google_calendar_events")
    .select("google_event_id")
    .eq("user_id", userId)
    .eq("contact_id", contactId);

  if (existingEvents) {
    for (const ev of existingEvents) {
      try {
        await googleApi(
          accessToken, "DELETE",
          `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(ev.google_event_id)}`
        );
      } catch (err) {
        console.error(`Failed to delete event ${ev.google_event_id}:`, err);
      }
    }
    await supabase
      .from("google_calendar_events")
      .delete()
      .eq("user_id", userId)
      .eq("contact_id", contactId);
  }

  // Fetch the contact
  const { data: contact } = await supabase
    .from("contacts")
    .select("*")
    .eq("id", contactId)
    .eq("user_id", userId)
    .single();

  if (!contact) return; // Contact was deleted

  // Create new events
  const eventDefs = buildEventsForContact(contact as Contact, settings as UserSettings);
  for (const def of eventDefs) {
    try {
      const created = await googleApi(
        accessToken, "POST",
        `/calendars/${encodeURIComponent(calendarId)}/events`,
        def.event
      ) as { id: string };

      await supabase.from("google_calendar_events").insert({
        user_id: userId,
        contact_id: contactId,
        event_type: def.eventType,
        roj_index: def.rojIndex,
        google_event_id: created.id,
        event_date: def.eventDate,
      });
    } catch (err) {
      console.error(`Failed to create event for contact ${contactId}:`, err);
    }
  }
}

async function handleDelete(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  contactId: string
): Promise<void> {
  const { data: settings } = await supabase
    .from("user_settings")
    .select("google_refresh_token, google_calendar_id")
    .eq("user_id", userId)
    .single();

  if (!settings || !settings.google_refresh_token || !settings.google_calendar_id) return;

  const accessToken = await refreshGoogleToken(settings.google_refresh_token);
  const calendarId = settings.google_calendar_id;

  const { data: events } = await supabase
    .from("google_calendar_events")
    .select("google_event_id")
    .eq("user_id", userId)
    .eq("contact_id", contactId);

  if (events) {
    for (const ev of events) {
      try {
        await googleApi(
          accessToken, "DELETE",
          `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(ev.google_event_id)}`
        );
      } catch (err) {
        console.error(`Failed to delete event ${ev.google_event_id}:`, err);
      }
    }
  }

  // Mapping rows will cascade-delete when contact is deleted from contacts table
}

async function handleResync(
  supabase: ReturnType<typeof createClient>,
  userId: string
): Promise<void> {
  const { data: settings } = await supabase
    .from("user_settings")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (!settings || !settings.google_refresh_token || !settings.google_calendar_id) return;

  const accessToken = await refreshGoogleToken(settings.google_refresh_token);
  const calendarId = settings.google_calendar_id;

  // Delete all existing events
  const { data: allEvents } = await supabase
    .from("google_calendar_events")
    .select("google_event_id")
    .eq("user_id", userId);

  if (allEvents) {
    for (const ev of allEvents) {
      try {
        await googleApi(
          accessToken, "DELETE",
          `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(ev.google_event_id)}`
        );
      } catch (err) {
        console.error(`Failed to delete event ${ev.google_event_id}:`, err);
      }
    }
    await supabase
      .from("google_calendar_events")
      .delete()
      .eq("user_id", userId);
  }

  // Recreate all events
  const { data: contacts } = await supabase
    .from("contacts")
    .select("*")
    .eq("user_id", userId);

  if (!contacts) return;

  for (const contact of contacts as Contact[]) {
    const eventDefs = buildEventsForContact(contact, settings as UserSettings);
    for (const def of eventDefs) {
      try {
        const created = await googleApi(
          accessToken, "POST",
          `/calendars/${encodeURIComponent(calendarId)}/events`,
          def.event
        ) as { id: string };

        await supabase.from("google_calendar_events").insert({
          user_id: userId,
          contact_id: contact.id,
          event_type: def.eventType,
          roj_index: def.rojIndex,
          google_event_id: created.id,
          event_date: def.eventDate,
        });
      } catch (err) {
        console.error(`Failed to create event for ${contact.name}:`, err);
      }
    }
  }
}

// ─── Edge Function Handler ──────────────────────────────────────

Deno.serve(async (req) => {
  // CORS
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Authorization, Content-Type",
      },
    });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  try {
    // Authenticate via Supabase JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), { status: 401 });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the JWT and get the user
    const supabaseAnon = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user }, error: authError } = await supabaseAnon.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    const userId = user.id;
    const body = await req.json();
    const action = body.action;

    let result: unknown = { success: true };

    if (action === "init") {
      const { google_access_token, google_refresh_token } = body;
      if (!google_access_token || !google_refresh_token) {
        return new Response(JSON.stringify({ error: "Missing tokens" }), { status: 400 });
      }
      result = await handleInit(supabase, userId, google_access_token, google_refresh_token);
    } else if (action === "upsert") {
      const { contact_id } = body;
      if (!contact_id) {
        return new Response(JSON.stringify({ error: "Missing contact_id" }), { status: 400 });
      }
      await handleUpsert(supabase, userId, contact_id);
    } else if (action === "delete") {
      const { contact_id } = body;
      if (!contact_id) {
        return new Response(JSON.stringify({ error: "Missing contact_id" }), { status: 400 });
      }
      await handleDelete(supabase, userId, contact_id);
    } else if (action === "resync") {
      await handleResync(supabase, userId);
    } else {
      return new Response(JSON.stringify({ error: "Unknown action: " + action }), { status: 400 });
    }

    return new Response(JSON.stringify(result), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (err) {
    console.error("Google Calendar Sync error:", err);

    // If token refresh failed, mark sync as disabled
    if (err instanceof Error && err.message.includes("Token refresh failed")) {
      try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        const authHeader = req.headers.get("Authorization");
        if (authHeader) {
          const supabaseAnon = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
          const { data: { user } } = await supabaseAnon.auth.getUser(
            authHeader.replace("Bearer ", "")
          );
          if (user) {
            await supabase.from("user_settings").update({
              google_sync_enabled: false,
            }).eq("user_id", user.id);
          }
        }
      } catch (_) { /* best effort */ }

      return new Response(JSON.stringify({ error: "token_revoked" }), {
        status: 401,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }
});
