/**
 * Parsi Date Calculator
 * 
 * This script calculates the current Parsi/Zoroastrian calendar date
 * and provides functions to display it on the website.
 */

// Constants needed for Parsi calendar calculations
const EPOCH_YZ_BEGIN = 374;
const EPOCH_YZ_END = 1770;
const EPOCH_YEAR_BEGIN = 1006;
const EPOCH_YEAR_END = 2400;
const YZ_DIFF_YEAR = 632;
const DAY_IN_SEC = 86400;
const HRS_IN_SEC = 3600;
const MIN_IN_SEC = 60;
const DATE_MIN = 1;
const DATE_MAX = 31;
const MONTH_MIN = 1;
const MONTH_MAX = 12;
const MAX_DAYS_IN_YR = 365;
const ROJ_MIN = 1;
const ROJ_MAX = 36;
const MAH_MIN = 1;
const MAH_MAX = 12;
const MAX_EPOCH_SEC = 44022007440;
const EPOCH_S_MAH_BEGIN = 9;
const EPOCH_S_ROJ_BEGIN = 16;
const EPOCH_S_MAH_END = 8;
const EPOCH_S_ROJ_END = 20;
const EPOCH_S_YZ_END = 1770;
const EPOCH_K_MAH_BEGIN = 10;
const EPOCH_K_ROJ_BEGIN = 16;
const EPOCH_K_MAH_END = 9;
const EPOCH_K_ROJ_END = 20;
const EPOCH_K_YZ_END = 1770;
const EPOCH_F_MAH_BEGIN = 10;
const EPOCH_F_ROJ_BEGIN = 16;
const EPOCH_F_MAH_END = 10;
const EPOCH_F_ROJ_END = 16;
const EPOCH_F_YZ_END = 1769;

// Name arrays
const MAHNAME = ["Fravardin", "Ardibehesht", "Khordad", "Tir", "Amardad", "Shehrevar", "Meher", "Ava", "Adar", "Dae", "Bahman", "Aspandard"];
const ROJNAME = ["Hormazd", "Bahman", "Ardibehesht", "Shehrevar", "Aspandard", "Khordad", "Amardad", "Dae-Pa-Adar", "Adar", "Ava", "Khorshed", "Mohor", "Tir", "Gosh", "Dae-Pa-Meher", "Meher", "Srosh", "Rashne", "Fravardin", "Behram", "Ram", "Govad", "Dae-Pa-Din", "Din", "Ashishvangh", "Ashtad", "Asman", "Zamyad", "Mareshpand", "Aneran", "Ahunavad", "Ashtavad", "Spentamainyu", "Vohuxshathra", "Vahishtoisht", "Avardad-Saal"];

// Helper functions
function DoInt(a, b) {
    return Math.floor(a / b);
}

function DoMod(a, b) {
    return a % b;
}

function GetDaysInFeb(year) {
    var days = 28;
    if (year % 4 == 0) {
        if (!((year % 100 == 0) && (year % 400 != 0))) {
            days = 29;
        }
    }
    return days;
}

function GetLeapDays(year) {
    var count = 0;
    for (var y = EPOCH_YEAR_BEGIN; y < year; y++) {
        if (y % 4 == 0) {
            if (!((y % 100 == 0) && (y % 400 != 0))) {
                count++;
            }
        }
    }
    return count;
}

function IsLeapYear(year) {
    var isLeap = 0;
    if (year % 4 == 0) {
        if (!((year % 100 == 0) && (year % 400 != 0))) {
            isLeap = 1;
        }
    }
    return isLeap;
}

function GetDayOfWeek(year, month, date) {
    var day;
    var a, y, m;
    a = DoInt((14 - month), 12);
    y = year - a;
    m = month + (12 * a) - 2;
    day = DoMod((date + y + DoInt(y, 4) - DoInt(y, 100) + DoInt(y, 400) + DoInt((31 * m), 12)), 7);
    day++;
    return day;
}

function MonthToText(monthNum) {
    return MAHNAME[monthNum - 1];
}

function RojToText(rojNum) {
    return ROJNAME[rojNum - 1];
}

// Core date conversion functions
function GDateToEpoch(gDate, zDate) {
    var days = 0;
    var i = 0;
    var epoch = -1;
    
    if ((gDate.mon == 1) && (gDate.date == 1)) {
        days = 0;
    } else if (gDate.mon == 1) {
        days = gDate.date - 1;
    } else {
        for (i = 1; i < gDate.mon; i++) {
            if ((i == 4) || (i == 6) || (i == 9) || (i == 11)) {
                days = days + 30;
            } else if (i == 2) {
                days = days + GetDaysInFeb(gDate.year);
            } else {
                days = days + 31;
            }
        }
        days = days + gDate.date - 1;
    }
    
    days = ((gDate.year - EPOCH_YEAR_BEGIN) * MAX_DAYS_IN_YR) + GetLeapDays(gDate.year) + days;
    epoch = (days * DAY_IN_SEC) + (gDate.hour * HRS_IN_SEC) + (gDate.min * MIN_IN_SEC) + gDate.sec;
    
    zDate.day = GetDayOfWeek(gDate.year, gDate.mon, gDate.date);
    zDate.epoch = epoch;
    gDate.epoch = epoch;
    
    return 0;
}

function EpochToSDate(zDate) {
    var tsec, tmin, tday;
    var offset;
    var tdays;
    var daysinmon;
    var m, r;
    var year;
    var rem;
    
    zDate.sec = DoMod(zDate.epoch, 60);
    tsec = DoInt(zDate.epoch, 60);
    zDate.min = DoMod(tsec, 60);
    tmin = DoInt(tsec, 60);
    zDate.hour = DoMod(tmin, 24);
    tday = DoInt(tmin, 24);
    
    if (zDate.hour >= 6) {
        offset = 257;
    } else {
        offset = 256;
    }
    
    year = EPOCH_YZ_BEGIN;
    tdays = tday + offset;
    
    while (1) {
        rem = tdays - MAX_DAYS_IN_YR;
        if (rem <= 0) {
            break;
        } else {
            year++;
            tdays = rem;
        }
    }
    
    daysinmon = 30;
    m = DoInt(tdays, daysinmon) + 1;
    r = DoMod(tdays, daysinmon);
    
    if (r == 0) {
        r = daysinmon;
        m--;
    }
    
    if (m == 13) {
        m = 12;
        r = daysinmon + r;
    }
    
    zDate.yz = year;
    zDate.mah = m;
    zDate.roj = r;
    zDate.zday = tdays;
    
    return 0;
}

function EpochToZDate(calType, zDate) {
    if (calType == "S") {
        return EpochToSDate(zDate);
    }
    return 0;
}

function GDateToZDate(gDate, calType, zDate) {
    if (GDateToEpoch(gDate, zDate)) {
        return 1;
    }
    if (EpochToZDate(calType, zDate)) {
        return 2;
    }
    return 0;
}

function getTodaysParsiDate() {
    const calType = "S"; // Using Shahenshahi calendar by default
    var gDate = {};
    var zDate = {};
    var currentDate = new Date();
    
    gDate = {
        year: currentDate.getFullYear(),
        mon: currentDate.getMonth() + 1,
        date: currentDate.getDate(),
        hour: currentDate.getHours(),
        min: currentDate.getMinutes(),
        sec: currentDate.getSeconds()
    };
    
    if (GDateToZDate(gDate, calType, zDate)) {
        return null;
    }
    
    return {
        roj: zDate.roj,
        mah: zDate.mah,
        year: zDate.yz
    };
}

// Function to display the Parsi date on the page
function displayParsiDate() {
    const parsiDateElements = document.querySelectorAll('.parsi-date');
    if (parsiDateElements.length === 0) return;
    
    const parsiDate = getTodaysParsiDate();
    if (!parsiDate) return;
    
    // Get the text names for Roj and Mah
    const rojText = RojToText(parsiDate.roj);
    const mahText = MonthToText(parsiDate.mah);
    
    // Format the date as "Govad Roj, Ava Mah, 1394 Y.Z."
    const formattedDate = `${rojText} Roj, ${mahText} Mah, ${parsiDate.year} Y.Z.`;
    
    parsiDateElements.forEach(element => {
        element.textContent = formattedDate;
    });
}

// Initialize the Parsi date display when the DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    displayParsiDate();
});
