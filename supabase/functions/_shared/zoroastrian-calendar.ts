/**
 * Shared Zoroastrian Calendar Constants & Logic
 * Used by calendar-feed and google-calendar-sync edge functions.
 */

export const EPOCH_YZ_BEGIN = 374;
export const EPOCH_YEAR_BEGIN = 1006;
export const YZ_DIFF_YEAR = 632;
export const DAY_IN_SEC = 86400;
export const HRS_IN_SEC = 3600;
export const MAX_DAYS_IN_YR = 365;

export const MAHNAME = [
  "Fravardin", "Ardibehesht", "Khordad", "Tir", "Amardad", "Shehrevar",
  "Meher", "Ava", "Adar", "Dae", "Bahman", "Aspandard",
];

export const ROJNAME = [
  "Hormazd", "Bahman", "Ardibehesht", "Shehrevar", "Aspandard", "Khordad",
  "Amardad", "Dae-Pa-Adar", "Adar", "Ava", "Khorshed", "Mohor", "Tir",
  "Gosh", "Dae-Pa-Meher", "Meher", "Srosh", "Rashne", "Fravardin", "Behram",
  "Ram", "Govad", "Dae-Pa-Din", "Din", "Ashishvangh", "Ashtad", "Asman",
  "Zamyad", "Mareshpand", "Aneran", "Ahunavad", "Ashtavad", "Spentamainyu",
  "Vohuxshathra", "Vahishtoisht", "Avardad-Saal",
];

export interface GDate {
  year: number;
  mon: number;
  date: number;
  hour: number;
  min: number;
  sec: number;
  epoch?: number;
}

export interface ZDate {
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

export function isLeapYear(year: number): boolean {
  return year % 4 === 0 && !(year % 100 === 0 && year % 400 !== 0);
}

function getLeapDays(year: number): number {
  let count = 0;
  for (let y = EPOCH_YEAR_BEGIN; y < year; y++) {
    if (y % 4 === 0 && !(y % 100 === 0 && y % 400 !== 0)) count++;
  }
  return count;
}

export function gDateToEpoch(gDate: GDate, zDate: ZDate): number {
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

export function epochToSDate(zDate: ZDate): number {
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

export function epochToKDate(zDate: ZDate): number {
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

export function epochToFDate(zDate: ZDate): number {
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

export function getParsiDate(
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

export function findNextRojBirthday(
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

export function generateRojBirthdaysForYears(
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

export function buildWhatsAppUrl(phone: string, message: string): string {
  if (!phone) return "";
  const cleaned = phone.replace(/[\s\-()]/g, "");
  const num = cleaned.startsWith("+") ? cleaned.slice(1) : cleaned;
  return `https://wa.me/${num}?text=${encodeURIComponent(message)}`;
}
