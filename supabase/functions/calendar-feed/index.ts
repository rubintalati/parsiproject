/**
 * Supabase Edge Function: Calendar Feed
 *
 * Serves a live .ics (iCalendar) feed for a user's contacts.
 * - Gregorian birthdays/anniversaries: yearly recurring (RRULE:FREQ=YEARLY)
 * - Roj birthdays: individual events for next 15 years
 * - WhatsApp click-to-chat links in event descriptions
 *
 * Usage: GET /calendar-feed?token=USER_CALENDAR_TOKEN
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

// ─── Zoroastrian Calendar Constants & Logic ──────────────────────
// Ported from combined.js for server-side calculation

const EPOCH_YZ_BEGIN = 374;
const EPOCH_YEAR_BEGIN = 1006;
const YZ_DIFF_YEAR = 632;
const DAY_IN_SEC = 86400;
const HRS_IN_SEC = 3600;
const MAX_DAYS_IN_YR = 365;

const MAHNAME = [
  "Fravardin", "Ardibehesht", "Khordad", "Tir", "Amardad", "Shehrevar",
  "Meher", "Ava", "Adar", "Dae", "Bahman", "Aspandard",
];

const ROJNAME = [
  "Hormazd", "Bahman", "Ardibehesht", "Shehrevar", "Aspandard", "Khordad",
  "Amardad", "Dae-Pa-Adar", "Adar", "Ava", "Khorshed", "Mohor", "Tir",
  "Gosh", "Dae-Pa-Meher", "Meher", "Srosh", "Rashne", "Fravardin", "Behram",
  "Ram", "Govad", "Dae-Pa-Din", "Din", "Ashishvangh", "Ashtad", "Asman",
  "Zamyad", "Mareshpand", "Aneran", "Ahunavad", "Ashtavad", "Spentamainyu",
  "Vohuxshathra", "Vahishtoisht", "Avardad-Saal",
];

function doInt(a: number, b: number): number {
  return Math.floor(a / b);
}

function doMod(a: number, b: number): number {
  return a % b;
}

function getDaysInFeb(year: number): number {
  if (year % 4 === 0 && !(year % 100 === 0 && year % 400 !== 0)) return 29;
  return 28;
}

function isLeapYear(year: number): boolean {
  return year % 4 === 0 && !(year % 100 === 0 && year % 400 !== 0);
}

function getLeapDays(year: number): number {
  let count = 0;
  for (let y = EPOCH_YEAR_BEGIN; y < year; y++) {
    if (y % 4 === 0 && !(y % 100 === 0 && y % 400 !== 0)) count++;
  }
  return count;
}

interface GDate {
  year: number;
  mon: number;
  date: number;
  hour: number;
  min: number;
  sec: number;
  epoch?: number;
}

interface ZDate {
  epoch?: number;
  sec?: number;
  min?: number;
  hour?: number;
  day?: number;
  yz?: number;
  mah?: number;
  roj?: number;
  zday?: number;
}

function gDateToEpoch(gDate: GDate, zDate: ZDate): number {
  let days = 0;
  if (gDate.mon === 1 && gDate.date === 1) {
    days = 0;
  } else if (gDate.mon === 1) {
    days = gDate.date - 1;
  } else {
    for (let i = 1; i < gDate.mon; i++) {
      if (i === 4 || i === 6 || i === 9 || i === 11) days += 30;
      else if (i === 2) days += getDaysInFeb(gDate.year);
      else days += 31;
    }
    days += gDate.date - 1;
  }
  days = (gDate.year - EPOCH_YEAR_BEGIN) * MAX_DAYS_IN_YR + getLeapDays(gDate.year) + days;
  const epoch = days * DAY_IN_SEC + gDate.hour * HRS_IN_SEC + gDate.min * 60 + gDate.sec;
  zDate.epoch = epoch;
  gDate.epoch = epoch;
  return 0;
}

function epochToSDate(zDate: ZDate): number {
  const epoch = zDate.epoch!;
  zDate.sec = doMod(epoch, 60);
  const tsec = doInt(epoch, 60);
  zDate.min = doMod(tsec, 60);
  const tmin = doInt(tsec, 60);
  zDate.hour = doMod(tmin, 24);
  const tday = doInt(tmin, 24);

  const offset = zDate.hour! >= 6 ? 257 : 256;
  let year = EPOCH_YZ_BEGIN;
  let tdays = tday + offset;

  while (true) {
    const rem = tdays - MAX_DAYS_IN_YR;
    if (rem <= 0) break;
    year++;
    tdays = rem;
  }

  const daysinmon = 30;
  let m = doInt(tdays, daysinmon) + 1;
  let r = doMod(tdays, daysinmon);
  if (r === 0) { r = daysinmon; m--; }
  if (m === 13) { m = 12; r = daysinmon + r; }

  zDate.yz = year;
  zDate.mah = m;
  zDate.roj = r;
  zDate.zday = tdays;
  return 0;
}

function epochToKDate(zDate: ZDate): number {
  const epoch = zDate.epoch!;
  zDate.sec = doMod(epoch, 60);
  const tsec = doInt(epoch, 60);
  zDate.min = doMod(tsec, 60);
  const tmin = doInt(tsec, 60);
  zDate.hour = doMod(tmin, 24);
  const tday = doInt(tmin, 24);

  const offset = zDate.hour! >= 6 ? 287 : 286;
  let year = EPOCH_YZ_BEGIN;
  let tdays = tday + offset;

  while (true) {
    const rem = tdays - MAX_DAYS_IN_YR;
    if (rem <= 0) break;
    year++;
    tdays = rem;
  }

  const daysinmon = 30;
  let m = doInt(tdays, daysinmon) + 1;
  let r = doMod(tdays, daysinmon);
  if (r === 0) { r = daysinmon; m--; }
  if (m === 13) { m = 12; r = daysinmon + r; }

  zDate.yz = year;
  zDate.mah = m;
  zDate.roj = r;
  zDate.zday = tdays;
  return 0;
}

function epochToFDate(zDate: ZDate): number {
  const epoch = zDate.epoch!;
  zDate.sec = doMod(epoch, 60);
  const tsec = doInt(epoch, 60);
  zDate.min = doMod(tsec, 60);
  const tmin = doInt(tsec, 60);
  zDate.hour = doMod(tmin, 24);
  const tday = doInt(tmin, 24);

  const offset = zDate.hour! >= 6 ? 288 : 287;
  let year = EPOCH_YZ_BEGIN;
  let tdays = tday + offset;

  while (true) {
    const gregYear = year + YZ_DIFF_YEAR;
    const daysInYear = isLeapYear(gregYear) ? 366 : MAX_DAYS_IN_YR;
    const rem = tdays - daysInYear;
    if (rem <= 0) break;
    year++;
    tdays = rem;
  }

  const daysinmon = 30;
  let m = doInt(tdays, daysinmon) + 1;
  let r = doMod(tdays, daysinmon);
  if (r === 0) { r = daysinmon; m--; }
  if (m === 13) { m = 12; r = daysinmon + r; }

  zDate.yz = year;
  zDate.mah = m;
  zDate.roj = r;
  zDate.zday = tdays;
  return 0;
}

function getParsiDate(
  year: number, month: number, day: number, hour: number, calType: string
): { roj: number; mah: number; year: number } | null {
  const gDate: GDate = { year, mon: month, date: day, hour, min: 0, sec: 0 };
  const zDate: ZDate = {};
  gDateToEpoch(gDate, zDate);

  if (calType === "S") epochToSDate(zDate);
  else if (calType === "K") epochToKDate(zDate);
  else if (calType === "F") epochToFDate(zDate);
  else return null;

  return { roj: zDate.roj!, mah: zDate.mah!, year: zDate.yz! };
}

function findNextRojBirthday(
  targetRoj: number, targetMah: number, calType: string, fromDate: Date
): Date | null {
  for (let i = 0; i <= 366; i++) {
    const d = new Date(fromDate);
    d.setDate(d.getDate() + i);
    const result = getParsiDate(d.getFullYear(), d.getMonth() + 1, d.getDate(), 12, calType);
    if (result && result.roj === targetRoj && result.mah === targetMah) {
      return d;
    }
  }
  return null;
}

function generateRojBirthdaysForYears(
  targetRoj: number, targetMah: number, calType: string, numYears: number
): Date[] {
  const dates: Date[] = [];
  let searchFrom = new Date();
  for (let i = 0; i < numYears; i++) {
    const nextDate = findNextRojBirthday(targetRoj, targetMah, calType, searchFrom);
    if (nextDate) {
      dates.push(new Date(nextDate));
      searchFrom = new Date(nextDate);
      searchFrom.setDate(searchFrom.getDate() + 1);
    }
  }
  return dates;
}

// ─── ICS Generation ──────────────────────────────────────────────

function formatIcsDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

// Floating time (no timezone = user's local time)
function formatIcsDateAt9AM(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}${m}${day}T090000`;
}

function formatIcsDateAt10AM(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}${m}${day}T100000`;
}

function formatIcsDateTime(): string {
  const now = new Date();
  return (
    now.getFullYear().toString() +
    String(now.getMonth() + 1).padStart(2, "0") +
    String(now.getDate()).padStart(2, "0") +
    "T" +
    String(now.getHours()).padStart(2, "0") +
    String(now.getMinutes()).padStart(2, "0") +
    String(now.getSeconds()).padStart(2, "0") +
    "Z"
  );
}

function escapeIcs(str: string): string {
  return str.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

function buildWhatsAppUrl(phone: string, message: string): string {
  if (!phone) return "";
  const cleaned = phone.replace(/[\s\-()]/g, "");
  const num = cleaned.startsWith("+") ? cleaned.slice(1) : cleaned;
  return `https://wa.me/${num}?text=${encodeURIComponent(message)}`;
}

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
  calendar_token: string;
}

function buildCalendarIcs(
  contacts: Contact[],
  settings: UserSettings,
  userName: string
): string {
  const calType = settings.calendar_type;
  const dtstamp = formatIcsDateTime();
  const calName = `Roj Wisher – ${userName}`;

  let ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//The Parsi Project//Roj Wisher//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${calName}`,
    "X-WR-CALDESC:Birthdays & anniversaries with Roj reminders",
    "X-WR-TIMEZONE:Asia/Kolkata",
    "REFRESH-INTERVAL;VALUE=DURATION:PT1H",
    "X-PUBLISHED-TTL:PT1H",
  ];

  for (const c of contacts) {
    const isRojOnly = !c.date_of_birth;
    const phone = c.mobile_number || "";
    const typeLabel = c.event_type === "birthday" ? "Birthday" : "Anniversary";
    const typeEmoji = c.event_type === "birthday" ? "🎂" : "💍";

    // ── Gregorian recurring event (skip for roj-only contacts) ──
    if (!isRojOnly && settings.remind_on_actual_birthday) {
      const dob = new Date(c.date_of_birth + "T12:00:00");
      const waMsg = c.event_type === "birthday"
        ? `Happy Birthday, ${c.name}! Ek saal aur nikal gaya — but you? Still fresh like morning brun-maska.`
        : `Happy Anniversary, ${c.name}! Itna saal saath ma dhansak khaya, that itself is true love. Kem chho? Kem rehsho? Always together!`;
      const waUrl = buildWhatsAppUrl(phone, waMsg);
      let desc = `${typeEmoji} ${c.name}'s ${typeLabel}`;
      if (waUrl) desc += `\\n\\nSend WhatsApp wishes:\\n${waUrl}`;

      const alarms = buildAlarms(c.name, typeLabel, typeEmoji, settings.reminder_timing);

      ics.push("BEGIN:VEVENT");
      ics.push(`UID:gregorian-${c.id}@roj-wisher`);
      ics.push(`DTSTAMP:${dtstamp}`);
      ics.push(`DTSTART:${formatIcsDateAt9AM(dob)}`);
      ics.push(`DTEND:${formatIcsDateAt10AM(dob)}`);
      ics.push(`SUMMARY:${typeEmoji} ${escapeIcs(c.name)} – ${typeLabel}`);
      ics.push(`DESCRIPTION:${desc}`);
      ics.push("RRULE:FREQ=YEARLY");
      ics.push("TRANSP:TRANSPARENT");
      ics = ics.concat(alarms);
      ics.push("END:VEVENT");
    }

    // ── Roj birthday events (15 years) ──
    if (settings.remind_on_roj_birthday) {
      let rojNum: number | null = null;
      let mahNum: number | null = null;

      if (isRojOnly) {
        // Roj-only contact: use stored roj/mah directly
        rojNum = c.roj;
        mahNum = c.mah;
      } else {
        // Regular contact: derive roj/mah from Gregorian DOB
        const dob = new Date(c.date_of_birth + "T12:00:00");
        const hour = c.before_sunrise ? 5 : 12;
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

        const waMsg = c.event_type === "birthday"
          ? `${c.name}, your roj birthday, dikra! Do a loban, eat a ravo, thank Dadaji. Simple.`
          : `${c.name}, Roj anniversary mubarak! Still together because nobody else would tolerate either of you. God is great.`;
        const waUrl = buildWhatsAppUrl(phone, waMsg);

        for (let i = 0; i < rojDates.length; i++) {
          const rd = rojDates[i];
          let desc = `🔥 ${c.name}'s Roj ${typeLabel} – ${rojName}, mah ${mahName}`;
          if (waUrl) desc += `\\n\\nSend WhatsApp wishes:\\n${waUrl}`;

          const alarms = buildAlarms(c.name, `Roj ${typeLabel}`, "🔥", settings.reminder_timing);

          ics.push("BEGIN:VEVENT");
          ics.push(`UID:roj-${c.id}-${i}@roj-wisher`);
          ics.push(`DTSTAMP:${dtstamp}`);
          ics.push(`DTSTART:${formatIcsDateAt9AM(rd)}`);
          ics.push(`DTEND:${formatIcsDateAt10AM(rd)}`);
          ics.push(`SUMMARY:🔥 ${escapeIcs(c.name)} – Roj ${typeLabel} (${rojName})`);
          ics.push(`DESCRIPTION:${desc}`);
          ics.push("TRANSP:TRANSPARENT");
          ics = ics.concat(alarms);
          ics.push("END:VEVENT");
        }
      }
    }
  }

  ics.push("END:VCALENDAR");
  return ics.join("\r\n");
}

function buildAlarms(
  name: string, typeLabel: string, emoji: string, timing: string
): string[] {
  const alarms: string[] = [];

  if (timing === "day_before" || timing === "both") {
    alarms.push("BEGIN:VALARM");
    alarms.push("ACTION:DISPLAY");
    alarms.push("TRIGGER:-P1D");
    alarms.push(`DESCRIPTION:Tomorrow is ${name}'s ${typeLabel}! ${emoji}`);
    alarms.push("END:VALARM");
  }

  if (timing === "day_of" || timing === "both") {
    alarms.push("BEGIN:VALARM");
    alarms.push("ACTION:DISPLAY");
    alarms.push("TRIGGER:-PT0M");
    alarms.push(`DESCRIPTION:Today is ${name}'s ${typeLabel}! ${emoji}`);
    alarms.push("END:VALARM");
  }

  return alarms;
}

// ─── Edge Function Handler ───────────────────────────────────────

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);
  const token = url.searchParams.get("token");

  if (!token) {
    return new Response("Missing token parameter", { status: 400 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // Find user by calendar token
  const { data: settings, error: settingsError } = await supabase
    .from("user_settings")
    .select("*")
    .eq("calendar_token", token)
    .single();

  if (settingsError || !settings) {
    return new Response("Invalid or expired token", { status: 401 });
  }

  // Get user info for calendar name
  const { data: userData } = await supabase.auth.admin.getUserById(settings.user_id);
  const userName =
    userData?.user?.user_metadata?.full_name ||
    userData?.user?.email ||
    "User";

  // Get contacts
  const { data: contacts, error: contactsError } = await supabase
    .from("contacts")
    .select("*")
    .eq("user_id", settings.user_id);

  if (contactsError) {
    return new Response("Failed to fetch contacts", { status: 500 });
  }

  const icsContent = buildCalendarIcs(contacts || [], settings, userName);

  return new Response(icsContent, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="roj-wisher.ics"',
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Pragma": "no-cache",
      "Expires": "0",
      "Access-Control-Allow-Origin": "*",
    },
  });
});
