/**
 * Wedding Invites — guest list, WhatsApp send queue and RSVP dashboard.
 *
 * Couples sign in with Google and manage households (the invitation unit),
 * events and per-event invitations through Supabase under RLS. Each household
 * gets a personal link to pages/rsvp.html; the couple sends it from their own
 * WhatsApp via wa.me links, so nothing is sent on their behalf.
 * Uses combined.js for Parsi (roj/mah) dates.
 */

// ─── Supabase Config ─────────────────────────────────────────────
const SUPABASE_URL = 'https://ihsbndryziohroodkwjn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imloc2JuZHJ5emlvaHJvb2Rrd2puIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwNjA0NTEsImV4cCI6MjA5MDYzNjQ1MX0.BNW9mTWgRDG5yJ8rjjZ-g8v8C2dbfAOapZCDq0aKFgk';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ─── Constants ───────────────────────────────────────────────────
var DEFAULT_COUNTRY_CODE = '91';
var STORAGE_WEDDING = 'wi_wedding_id';
var STORAGE_TAB = 'wi_tab';
var STORAGE_JOIN = 'wi_join_code';

// Share of a pending household's maximum we expect to turn up.
var LIKELY_BY_LOCALITY = { local: 0.8, outstation: 0.55, overseas: 0.4 };
var LIKELY_MAYBE = 0.5;
var CONFIRMED_SHOW_RATE = 0.95;

var EVENT_PRESETS = [
    { kind: 'madhavsaro', name: 'Madhavsaro', side: 'both' },
    { kind: 'adarni', name: 'Adarni', side: 'bride' },
    { kind: 'supra', name: 'Supra nu Murat', side: 'both' },
    { kind: 'lagan', name: 'Lagan', side: 'both' },
    { kind: 'dinner', name: 'Lagan Dinner', side: 'both', panth: 250 },
    { kind: 'reception', name: 'Reception', side: 'both' },
    { kind: 'navjote', name: 'Navjote', side: 'both' },
    { kind: 'custom', name: '', side: 'both' }
];

var SIDE_LABELS = { bride: "bride's side", groom: "groom's side", both: 'common' };
var LOCALITY_LABELS = { local: 'same city', outstation: 'another city', overseas: 'abroad' };
var STATUS_LABELS = { pending: 'waiting', yes: 'coming', no: 'not coming', maybe: 'maybe' };

var DEFAULT_INVITE_TEMPLATE =
    'Dear {name},\n\n' +
    'With the blessings of Ahura Mazda, {couple} would love for you to be part of our celebrations:\n\n' +
    '{events}\n\n' +
    "Please let us know who's coming (takes 30 seconds, no app or sign-in needed):\n" +
    '{link}\n\n' +
    'With love,\n{couple}';

var DEFAULT_REMINDER_TEMPLATE =
    'Hi {name}! 🙏 A gentle reminder from {couple}. ' +
    "We're finalising numbers with the caterer, could you let us know who's coming?\n\n" +
    '{link}\n\nThank you!';

// ─── State ───────────────────────────────────────────────────────
var currentUser = null;
var weddings = [];
var wedding = null;
var events = [];
var households = [];
var invitations = [];
var members = [];
var recentLog = [];
var invByHousehold = {};   // household_id -> { event_id: invitation }
var householdById = {};
var eventById = {};
var lastLoadedAt = 0;
var activeTab = 'overview';
var sendMode = 'invite';
var skippedInQueue = [];
var importRows = [];
var replyDraft = null;

// ─── DOM helpers ─────────────────────────────────────────────────
function $(id) { return document.getElementById(id); }

function esc(value) {
    if (value === null || value === undefined) return '';
    return String(value)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function showToast(message, duration) {
    var toastEl = $('toast');
    toastEl.textContent = message;
    toastEl.classList.add('show');
    clearTimeout(showToast._t);
    showToast._t = setTimeout(function () {
        toastEl.classList.remove('show');
    }, duration || 2500);
}

function showSection(name) {
    ['loading-section', 'auth-section', 'setup-section', 'app-section'].forEach(function (id) {
        $(id).classList.toggle('hidden', id !== name);
    });
}

function openModal(id) { $(id).classList.remove('hidden'); }
function closeModal(id) { $(id).classList.add('hidden'); }

function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
        return navigator.clipboard.writeText(text).then(function () { showToast('copied'); });
    }
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); showToast('copied'); } catch (e) { showToast('could not copy'); }
    document.body.removeChild(ta);
    return Promise.resolve();
}

function chunk(arr, size) {
    var out = [];
    for (var i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
}

function relTime(iso) {
    var mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return mins + 'm ago';
    var hrs = Math.round(mins / 60);
    if (hrs < 24) return hrs + 'h ago';
    return Math.round(hrs / 24) + 'd ago';
}

// ─── Phone numbers ───────────────────────────────────────────────
// Normalises to E.164. Bare 10-digit numbers are assumed Indian.
function normalizePhone(raw) {
    if (!raw) return null;
    var s = String(raw).trim();
    var hasPlus = s.charAt(0) === '+';
    var digits = s.replace(/\D/g, '');
    if (!hasPlus && digits.indexOf('00') === 0) {
        digits = digits.slice(2);
        hasPlus = true;
    }
    if (hasPlus) return digits.length >= 8 && digits.length <= 15 && digits.charAt(0) !== '0' ? '+' + digits : null;
    if (digits.length === 10 && digits.charAt(0) !== '0') return '+' + DEFAULT_COUNTRY_CODE + digits;
    if (digits.length === 11 && digits.charAt(0) === '0') return '+' + DEFAULT_COUNTRY_CODE + digits.slice(1);
    if (digits.length === 12 && digits.indexOf(DEFAULT_COUNTRY_CODE) === 0) return '+' + digits;
    if (digits.length >= 11 && digits.length <= 15 && digits.charAt(0) !== '0') return '+' + digits;
    return null;
}

function formatPhone(e164) {
    if (!e164) return '';
    if (e164.indexOf('+91') === 0 && e164.length === 13) {
        return '+91 ' + e164.slice(3, 8) + ' ' + e164.slice(8);
    }
    return e164;
}

// ─── Dates ───────────────────────────────────────────────────────
function formatEventDate(ev, withYear) {
    if (!ev.starts_at) return '';
    var opts = { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' };
    if (withYear) opts.year = 'numeric';
    try {
        return new Intl.DateTimeFormat('en-IN', Object.assign({ timeZone: ev.tz || undefined }, opts)).format(new Date(ev.starts_at));
    } catch (e) {
        return new Intl.DateTimeFormat('en-IN', opts).format(new Date(ev.starts_at));
    }
}

function parsiDateFor(dateStr) {
    if (!dateStr || typeof getParsiDateForGregorian !== 'function') return null;
    var parts = dateStr.split('-').map(Number);
    var r = getParsiDateForGregorian(parts[0], parts[1], parts[2], 12, 'S');
    if (!r) return null;
    return 'Roj ' + RojToText(r.roj) + ', Mah ' + MonthToText(r.mah);
}

function toLocalInputValue(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    function p(n) { return String(n).padStart(2, '0'); }
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + 'T' + p(d.getHours()) + ':' + p(d.getMinutes());
}

function sortEvents(list) {
    return list.slice().sort(function (a, b) {
        if (a.starts_at && b.starts_at) return new Date(a.starts_at) - new Date(b.starts_at);
        if (a.starts_at) return -1;
        if (b.starts_at) return 1;
        return (a.sort_order - b.sort_order) || (new Date(a.created_at) - new Date(b.created_at));
    });
}

// ─── Links & messages ────────────────────────────────────────────
function rsvpBaseUrl() {
    return window.location.origin + window.location.pathname.replace(/wedding-invites\.html$/, 'rsvp.html');
}

function rsvpLink(h) {
    return rsvpBaseUrl() + '#t=' + h.rsvp_token;
}

function waUrl(phone, text) {
    var digits = (phone || '').replace(/\D/g, '');
    return 'https://wa.me/' + digits + '?text=' + encodeURIComponent(text);
}

function eventsTextFor(h) {
    var invs = invByHousehold[h.id] || {};
    return events
        .filter(function (ev) { return invs[ev.id]; })
        .map(function (ev) {
            var line = '• ' + ev.name;
            var when = formatEventDate(ev);
            if (when) line += ' — ' + when;
            if (ev.parsi_date) line += ' (' + ev.parsi_date + ')';
            if (ev.venue) line += ' · ' + ev.venue;
            return line;
        })
        .join('\n');
}

function messageFor(h, mode) {
    var tpl = mode === 'reminder'
        ? (wedding.reminder_template || DEFAULT_REMINDER_TEMPLATE)
        : (wedding.invite_template || DEFAULT_INVITE_TEMPLATE);
    return tpl
        .replace(/\{name\}/g, h.display_name)
        .replace(/\{couple\}/g, wedding.couple_names)
        .replace(/\{events\}/g, eventsTextFor(h))
        .replace(/\{link\}/g, rsvpLink(h));
}

// ─── CSV ─────────────────────────────────────────────────────────
function csvCell(v) {
    var s = v === null || v === undefined ? '' : String(v);
    return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

function downloadCsv(filename, rows) {
    var csv = '﻿' + rows.map(function (r) { return r.map(csvCell).join(','); }).join('\r\n');
    var blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}

function slug(s) {
    return String(s || 'list').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// ─── Auth ────────────────────────────────────────────────────────
function signInWithGoogle() {
    var redirectUrl = window.location.origin + window.location.pathname;
    supabaseClient.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: redirectUrl }
    }).then(function (result) {
        if (result.error) showToast('sign in failed: ' + result.error.message);
    });
}

function signOut() {
    supabaseClient.auth.signOut().then(function () {
        currentUser = null;
        wedding = null;
        weddings = [];
        showSection('auth-section');
        showToast('signed out');
    });
}

function userDisplayName(user) {
    var meta = user.user_metadata || {};
    return (meta.full_name || meta.name || user.email || '').toLowerCase();
}

async function onSignedIn(user) {
    currentUser = user;
    document.querySelectorAll('.js-user-name').forEach(function (el) {
        el.textContent = userDisplayName(user);
    });

    var pendingJoin = null;
    try { pendingJoin = localStorage.getItem(STORAGE_JOIN); } catch (e) { /* ignore */ }
    if (pendingJoin) {
        try { localStorage.removeItem(STORAGE_JOIN); } catch (e) { /* ignore */ }
        var joinedId = await joinWedding(pendingJoin, true);
        if (joinedId) {
            try { localStorage.setItem(STORAGE_WEDDING, joinedId); } catch (e) { /* ignore */ }
        }
    }

    await loadWeddings();
}

// ─── Weddings ────────────────────────────────────────────────────
async function loadWeddings(preferId) {
    var result = await supabaseClient.from('weddings').select('*').order('created_at', { ascending: false });
    if (result.error) {
        console.error(result.error);
        showToast('could not load your lists');
        showSection('setup-section');
        return;
    }
    weddings = result.data || [];
    if (!weddings.length) {
        wedding = null;
        showSetup();
        return;
    }
    var stored = null;
    try { stored = localStorage.getItem(STORAGE_WEDDING); } catch (e) { /* ignore */ }
    var pick = weddings.find(function (w) { return w.id === (preferId || stored); }) || weddings[0];
    await selectWedding(pick.id);
}

function showSetup() {
    $('cw-couple').value = '';
    $('cw-title').value = '';
    showSection('setup-section');
}

async function selectWedding(id) {
    wedding = weddings.find(function (w) { return w.id === id; });
    if (!wedding) return;
    try { localStorage.setItem(STORAGE_WEDDING, id); } catch (e) { /* ignore */ }
    renderWeddingSelect();
    skippedInQueue = [];
    showSection('app-section');
    await loadWeddingData();
}

function renderWeddingSelect() {
    var sel = $('wedding-select');
    sel.innerHTML = weddings.map(function (w) {
        return '<option value="' + esc(w.id) + '"' + (wedding && w.id === wedding.id ? ' selected' : '') + '>' + esc(w.title) + '</option>';
    }).join('') + '<option value="__new">+ start another list</option>';
}

async function createWedding(e) {
    e.preventDefault();
    var couple = $('cw-couple').value.trim();
    var title = $('cw-title').value.trim();
    if (!couple || !title) return;
    var result = await supabaseClient.rpc('create_wedding', { p_title: title, p_couple_names: couple });
    if (result.error) {
        console.error(result.error);
        showToast('could not create: ' + result.error.message);
        return;
    }
    showToast('created. now add your events.');
    activeTab = 'events';
    await loadWeddings(result.data);
}

async function joinWedding(code, quiet) {
    var result = await supabaseClient.rpc('join_wedding', { p_code: code });
    if (result.error || !result.data) {
        if (!quiet || result.error) showToast("that code didn't work");
        return null;
    }
    showToast("you're in");
    return result.data;
}

async function onJoinSubmit(e) {
    e.preventDefault();
    var id = await joinWedding($('join-code').value.trim());
    if (id) await loadWeddings(id);
}

// ─── Loading wedding data ────────────────────────────────────────
async function fetchAll(table, weddingId) {
    var out = [];
    var size = 1000;
    for (var from = 0; ; from += size) {
        var result = await supabaseClient.from(table).select('*')
            .eq('wedding_id', weddingId).order('id').range(from, from + size - 1);
        if (result.error) throw result.error;
        out = out.concat(result.data);
        if (result.data.length < size) break;
    }
    return out;
}

async function loadWeddingData() {
    if (!wedding) return;
    var id = wedding.id;
    try {
        var results = await Promise.all([
            fetchAll('wedding_events', id),
            fetchAll('wedding_households', id),
            fetchAll('wedding_invitations', id),
            supabaseClient.from('wedding_members').select('*').eq('wedding_id', id),
            supabaseClient.from('wedding_rsvp_log').select('*').eq('wedding_id', id)
                .order('created_at', { ascending: false }).limit(15),
            supabaseClient.from('weddings').select('*').eq('id', id).single()
        ]);
        if (!wedding || wedding.id !== id) return;
        events = sortEvents(results[0]);
        households = results[1].sort(function (a, b) { return a.display_name.localeCompare(b.display_name); });
        invitations = results[2];
        members = results[3].data || [];
        recentLog = results[4].data || [];
        if (results[5].data) {
            wedding = results[5].data;
            weddings = weddings.map(function (w) { return w.id === id ? wedding : w; });
        }
        indexData();
        lastLoadedAt = Date.now();
        renderAll();
    } catch (err) {
        console.error(err);
        showToast('could not load the guest list');
    }
}

function indexData() {
    invByHousehold = {};
    householdById = {};
    eventById = {};
    households.forEach(function (h) { householdById[h.id] = h; invByHousehold[h.id] = {}; });
    events.forEach(function (ev) { eventById[ev.id] = ev; });
    invitations.forEach(function (inv) {
        if (!invByHousehold[inv.household_id]) invByHousehold[inv.household_id] = {};
        invByHousehold[inv.household_id][inv.event_id] = inv;
    });
}

// ─── Stats ───────────────────────────────────────────────────────
function eventStats(ev) {
    var s = { invited: 0, yesFam: 0, noFam: 0, maybeFam: 0, pendingFam: 0, adults: 0, kids: 0, veg: 0, likely: 0 };
    invitations.forEach(function (inv) {
        if (inv.event_id !== ev.id) return;
        var h = householdById[inv.household_id];
        if (!h) return;
        s.invited++;
        if (inv.status === 'yes') {
            s.yesFam++;
            s.adults += inv.adults;
            s.kids += inv.kids;
            s.veg += inv.veg;
        } else if (inv.status === 'no') {
            s.noFam++;
        } else if (inv.status === 'maybe') {
            s.maybeFam++;
            s.likely += h.max_guests * LIKELY_MAYBE;
        } else {
            s.pendingFam++;
            s.likely += h.max_guests * (LIKELY_BY_LOCALITY[h.locality] || 0.8);
        }
    });
    s.confirmed = s.adults + s.kids;
    s.expected = Math.round(s.confirmed * CONFIRMED_SHOW_RATE + s.likely);
    s.panths = ev.seats_per_panth ? Math.max(1, Math.ceil(s.expected / ev.seats_per_panth)) : null;
    return s;
}

// Replies close after the deadline day ends in India time (matches submit_rsvp).
function isClosed(ev) {
    if (!ev || !ev.rsvp_deadline) return false;
    var today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
    return ev.rsvp_deadline < today;
}

function householdSummary(h) {
    var invs = invByHousehold[h.id] || {};
    var list = Object.keys(invs).map(function (k) { return invs[k]; });
    return {
        count: list.length,
        anyYes: list.some(function (i) { return i.status === 'yes'; }),
        anyOpen: list.some(function (i) {
            return (i.status === 'pending' || i.status === 'maybe') && !isClosed(eventById[i.event_id]);
        }),
        allNo: list.length > 0 && list.every(function (i) { return i.status === 'no'; }),
        replied: list.some(function (i) { return i.status !== 'pending'; })
    };
}

// ─── Rendering ───────────────────────────────────────────────────
function renderAll() {
    switchTab(activeTab, true);
    renderOverview();
    renderHouseholds();
    renderEvents();
    renderSend();
    renderSettings();
    renderInvitedByOptions();
}

function switchTab(tab, skipSave) {
    activeTab = tab;
    document.querySelectorAll('.tab').forEach(function (b) {
        b.classList.toggle('active', b.dataset.tab === tab);
    });
    document.querySelectorAll('.tab-panel').forEach(function (p) {
        p.classList.toggle('hidden', p.id !== 'tab-' + tab);
    });
    if (!skipSave) {
        try { localStorage.setItem(STORAGE_TAB, tab); } catch (e) { /* ignore */ }
    }
}

function renderInvitedByOptions() {
    var seen = {};
    households.forEach(function (h) { if (h.invited_by) seen[h.invited_by] = true; });
    $('invited-by-options').innerHTML = Object.keys(seen).sort().map(function (v) {
        return '<option value="' + esc(v) + '">';
    }).join('');
}

function emptyBlock(text, buttonLabel, action) {
    return '<div class="empty">' + esc(text) +
        (buttonLabel ? '<div style="margin-top:1rem"><button class="btn btn-primary" data-action="' + action + '">' + esc(buttonLabel) + '</button></div>' : '') +
        '</div>';
}

// Overview
function renderOverview() {
    var el = $('tab-overview');
    if (!events.length) {
        el.innerHTML = emptyBlock('start by adding your events — lagan, dinner, adarni…', '+ add event', 'add-event');
        return;
    }
    if (!households.length) {
        el.innerHTML = emptyBlock('now add the families you want to invite.', '+ add families', 'go-families');
        return;
    }

    var sent = households.filter(function (h) { return h.wa_sent_at; }).length;
    var opened = households.filter(function (h) { return h.link_opened_at; }).length;
    var replied = households.filter(function (h) { return householdSummary(h).replied; }).length;
    var pct = Math.round((replied / households.length) * 100);

    var html = '<div class="stats">' +
        stat(households.length, 'families invited') +
        stat(sent + ' / ' + households.length, 'invites sent') +
        stat(opened, 'opened their link') +
        stat(replied + ' (' + pct + '%)', 'families replied') +
        '</div>';

    html += '<h2 class="section-title">who\'s coming</h2>';
    events.forEach(function (ev) {
        var s = eventStats(ev);
        var sub = [formatEventDate(ev, true), ev.parsi_date, ev.venue].filter(Boolean).join(' · ');
        html += '<div class="card">' +
            '<div class="card-head"><div><div class="card-title">' + esc(ev.name) + '</div>' +
            '<div class="card-sub">' + esc(sub) + '</div></div>' +
            '<button class="btn btn-small" data-action="event-csv" data-id="' + esc(ev.id) + '">download list</button></div>' +
            '<div class="event-numbers">' +
            num(s.confirmed, 'coming', 'yes', plural(s.adults, 'adult') + ' · ' + plural(s.kids, 'kid')) +
            num(s.veg, 'veg') +
            num(s.pendingFam + s.maybeFam, 'families waiting', 'pending') +
            num(s.noFam, 'families declined', 'no') +
            num('~' + s.expected, 'expected') +
            (s.panths ? num(s.panths, 'panths of ' + ev.seats_per_panth) : '') +
            '</div></div>';
    });
    html += '<p class="hint">expected = 95% of confirmed guests, plus a guess for families who haven\'t replied (80% of their max if local, 55% from another city, 40% from abroad, 50% for maybes). use it for the caterer, not the seating.</p>';

    // Breakdown
    html += '<h2 class="section-title">by side & list</h2>' +
        '<div class="toolbar"><select id="breakdown-event" style="width:auto">' +
        events.map(function (ev) { return '<option value="' + esc(ev.id) + '">' + esc(ev.name.toLowerCase()) + '</option>'; }).join('') +
        '</select></div><div id="breakdown-table"></div>';

    // Recent replies
    if (recentLog.length) {
        html += '<h2 class="section-title">latest replies</h2><div class="card">';
        recentLog.forEach(function (row) {
            var inv = invitations.find(function (i) { return i.id === row.invitation_id; });
            if (!inv) return;
            var h = householdById[inv.household_id];
            var ev = eventById[inv.event_id];
            if (!h || !ev) return;
            var what = STATUS_LABELS[row.new_status] || row.new_status;
            if (row.new_status === 'yes') what += ' (' + row.new_count + ')';
            html += '<div class="queue-list"><div class="row"><span>' + esc(h.display_name) + ' · ' + esc(ev.name) + ' · ' + esc(what) + '</span>' +
                '<span>' + (row.source === 'guest_link' ? 'via link · ' : '') + relTime(row.created_at) + '</span></div></div>';
        });
        html += '</div>';
    }

    html += '<div class="toolbar" style="margin-top:1.5rem">' +
        '<button class="btn" data-action="export-all">export everything (csv)</button>' +
        '<button class="btn" data-action="refresh">refresh</button></div>';

    el.innerHTML = html;
    // Default the breakdown to the event with the most families invited.
    var biggest = events.reduce(function (best, ev) {
        return eventStats(ev).invited >= eventStats(best).invited ? ev : best;
    }, events[0]);
    $('breakdown-event').value = biggest.id;
    $('breakdown-event').addEventListener('change', renderBreakdown);
    renderBreakdown();
}

function plural(n, word) {
    return n + ' ' + word + (n === 1 ? '' : 's');
}

function stat(value, label) {
    return '<div class="stat"><div class="stat-value">' + esc(value) + '</div><div class="stat-label">' + esc(label) + '</div></div>';
}

function num(value, label, cls, sub) {
    return '<div><div class="num ' + (cls || '') + '">' + esc(value) + '</div><div class="num-label">' + esc(label) + '</div>' +
        (sub ? '<div class="num-label">' + esc(sub) + '</div>' : '') + '</div>';
}

function renderBreakdown() {
    var evId = $('breakdown-event').value;
    var groups = {};
    function add(key, inv) {
        if (!groups[key]) groups[key] = { invited: 0, coming: 0, waiting: 0, declined: 0 };
        var g = groups[key];
        g.invited++;
        if (inv.status === 'yes') g.coming += inv.adults + inv.kids;
        else if (inv.status === 'no') g.declined++;
        else g.waiting++;
    }
    invitations.forEach(function (inv) {
        if (inv.event_id !== evId) return;
        var h = householdById[inv.household_id];
        if (!h) return;
        add(SIDE_LABELS[h.side], inv);
        if (h.invited_by) add(h.invited_by + "'s list", inv);
    });
    var keys = Object.keys(groups);
    $('breakdown-table').innerHTML = keys.length ? '<table class="breakdown"><thead><tr><th></th><th class="n">families</th><th class="n">people coming</th><th class="n">waiting</th><th class="n">declined</th></tr></thead><tbody>' +
        keys.map(function (k) {
            var g = groups[k];
            return '<tr><td>' + esc(k) + '</td><td class="n">' + g.invited + '</td><td class="n">' + g.coming + '</td><td class="n">' + g.waiting + '</td><td class="n">' + g.declined + '</td></tr>';
        }).join('') + '</tbody></table>' : '<p class="hint">nobody invited to this one yet.</p>';
}

// Families
function filteredHouseholds() {
    var q = $('household-search').value.trim().toLowerCase();
    var qDigits = q.replace(/\D/g, '');
    var filter = $('household-filter').value;
    return households.filter(function (h) {
        if (q) {
            var hit = h.display_name.toLowerCase().indexOf(q) !== -1 ||
                (h.invited_by || '').toLowerCase().indexOf(q) !== -1 ||
                (qDigits.length >= 3 && (h.phone_e164 || '').indexOf(qDigits) !== -1);
            if (!hit) return false;
        }
        var s = householdSummary(h);
        switch (filter) {
            case 'not_sent': return !h.wa_sent_at;
            case 'pending': return s.anyOpen;
            case 'yes': return s.anyYes;
            case 'no': return s.allNo;
            case 'no_phone': return !h.phone_e164;
            default: return true;
        }
    });
}

function renderHouseholds() {
    var list = filteredHouseholds();
    var countEl = document.querySelector('.js-household-count');
    var totalMax = households.reduce(function (sum, h) { return sum + h.max_guests; }, 0);
    countEl.textContent = households.length
        ? 'showing ' + list.length + ' of ' + households.length + ' families (up to ' + totalMax + ' people)'
        : '';

    if (!households.length) {
        $('household-list').innerHTML = emptyBlock('no families yet. import from your phone or add them one by one.');
        return;
    }
    if (!list.length) {
        $('household-list').innerHTML = '<div class="empty">nobody matches that.</div>';
        return;
    }

    $('household-list').innerHTML = list.map(function (h) {
        var invs = invByHousehold[h.id] || {};
        var chips = events.filter(function (ev) { return invs[ev.id]; }).map(function (ev) {
            var inv = invs[ev.id];
            var mark = inv.status === 'yes' ? ' ✓ ' + (inv.adults + inv.kids)
                : inv.status === 'no' ? ' ✗' : inv.status === 'maybe' ? ' ?' : ' …';
            return '<span class="chip ' + inv.status + '">' + esc(ev.name) + mark + '</span>';
        }).join('');
        var meta = [
            h.phone_e164 ? formatPhone(h.phone_e164) : 'no number',
            SIDE_LABELS[h.side],
            h.invited_by ? h.invited_by + "'s list" : null,
            'up to ' + h.max_guests,
            h.locality !== 'local' ? LOCALITY_LABELS[h.locality] : null
        ].filter(Boolean).join(' · ');
        var flags = [
            h.wa_sent_at ? 'invite sent' : 'not sent yet',
            h.link_opened_at ? 'opened link' : null,
            h.card_delivered ? 'card delivered' : null
        ].filter(Boolean).join(' · ');
        var mode = h.wa_sent_at ? 'reminder' : 'invite';
        return '<div class="card">' +
            '<div class="card-title">' + esc(h.display_name) + '</div>' +
            '<div class="card-sub">' + esc(meta) + '<br>' + esc(flags) + '</div>' +
            (h.guest_note ? '<div class="card-sub" style="color:#ccc">“' + esc(h.guest_note) + '”</div>' : '') +
            (h.notes ? '<div class="card-sub">note: ' + esc(h.notes) + '</div>' : '') +
            '<div class="chips">' + (chips || '<span class="chip">not invited to any event</span>') + '</div>' +
            '<div class="card-actions">' +
            (h.phone_e164 ? '<a class="btn btn-small btn-whatsapp" target="_blank" rel="noopener" href="' + esc(waUrl(h.phone_e164, messageFor(h, mode))) + '" data-action="wa-sent" data-id="' + esc(h.id) + '" data-mode="' + mode + '">' + (mode === 'invite' ? 'send invite' : 'send reminder') + '</a>' : '') +
            '<button class="btn btn-small" data-action="record-reply" data-id="' + esc(h.id) + '">record reply</button>' +
            '<button class="btn btn-small" data-action="edit-household" data-id="' + esc(h.id) + '">edit</button>' +
            '<button class="btn btn-small" data-action="copy-link" data-id="' + esc(h.id) + '">copy link</button>' +
            '</div></div>';
    }).join('');
}

// Events
function renderEvents() {
    if (!events.length) {
        $('event-list').innerHTML = emptyBlock('no events yet. a parsi wedding usually has a few — tap add event and pick from the list.');
        return;
    }
    $('event-list').innerHTML = events.map(function (ev) {
        var s = eventStats(ev);
        var sub = [
            formatEventDate(ev, true) || 'date not set',
            ev.parsi_date,
            ev.venue,
            ev.host_side !== 'both' ? 'hosted by ' + SIDE_LABELS[ev.host_side].replace("'s side", "'s family") : null,
            ev.rsvp_deadline ? 'reply by ' + new Date(ev.rsvp_deadline + 'T12:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : null
        ].filter(Boolean).join(' · ');
        return '<div class="card"><div class="card-head"><div>' +
            '<div class="card-title">' + esc(ev.name) + '</div>' +
            '<div class="card-sub">' + esc(sub) + '</div>' +
            '<div class="card-sub">' + s.invited + ' families invited</div></div>' +
            '<button class="btn btn-small" data-action="edit-event" data-id="' + esc(ev.id) + '">edit</button>' +
            '</div></div>';
    }).join('');
}

// Send queue
function queueFor(mode) {
    var twoDaysAgo = Date.now() - 2 * 24 * 3600 * 1000;
    var list = households.filter(function (h) {
        var s = householdSummary(h);
        if (!s.count) return false;
        if (mode === 'invite') return !h.wa_sent_at;
        return h.wa_sent_at && s.anyOpen && (!h.reminded_at || new Date(h.reminded_at).getTime() < twoDaysAgo);
    });
    list.sort(function (a, b) {
        var sa = skippedInQueue.indexOf(a.id);
        var sb = skippedInQueue.indexOf(b.id);
        if (sa !== sb) return sa - sb;
        return (new Date(a.created_at) - new Date(b.created_at)) || a.display_name.localeCompare(b.display_name);
    });
    return list;
}

function renderSend() {
    document.querySelectorAll('#send-mode button').forEach(function (b) {
        b.classList.toggle('active', b.dataset.mode === sendMode);
    });
    $('tpl-invite').value = wedding.invite_template || DEFAULT_INVITE_TEMPLATE;
    $('tpl-reminder').value = wedding.reminder_template || DEFAULT_REMINDER_TEMPLATE;

    var hint = document.querySelector('.js-send-hint');
    var el = $('send-queue');
    if (!events.length || !households.length) {
        hint.textContent = '';
        el.innerHTML = emptyBlock('add your events and families first, then come back here to send.');
        return;
    }

    var queue = queueFor(sendMode);
    hint.textContent = sendMode === 'invite'
        ? 'tap send, whatsapp opens with the message ready, hit send there and come back. the next family will be waiting. messages go from your own number, so they land like a normal message from you.'
        : 'families who got the invite but haven\'t replied to everything. anyone reminded in the last 2 days is skipped.';

    if (!queue.length) {
        el.innerHTML = '<div class="empty">' + (sendMode === 'invite'
            ? 'all invites sent 🎉 switch to reminders when you want to nudge the slow ones.'
            : 'nobody to remind right now.') + '</div>';
        return;
    }

    var h = queue[0];
    var msg = messageFor(h, sendMode);
    var total = sendMode === 'invite' ? households.length : queue.length;
    var done = sendMode === 'invite' ? households.length - queue.length : 0;
    var progress = sendMode === 'invite'
        ? done + ' of ' + total + ' sent · ' + queue.length + ' to go'
        : queue.length + ' families to remind';

    var html = '<div class="queue-card">' +
        '<div class="queue-progress">' + esc(progress) + '</div>' +
        '<div class="queue-name">' + esc(h.display_name) + '</div>' +
        '<div class="card-sub">' + esc(h.phone_e164 ? formatPhone(h.phone_e164) : 'no number saved — copy the message and send it yourself') + '</div>' +
        '<div class="queue-preview">' + esc(msg) + '</div>' +
        '<div class="queue-actions">' +
        (h.phone_e164
            ? '<a class="btn btn-whatsapp" target="_blank" rel="noopener" href="' + esc(waUrl(h.phone_e164, msg)) + '" data-action="wa-sent" data-id="' + esc(h.id) + '" data-mode="' + sendMode + '">open whatsapp ↗</a>'
            : '') +
        '<button class="btn" data-action="copy-message" data-id="' + esc(h.id) + '">copy message</button>' +
        '<button class="btn" data-action="mark-sent" data-id="' + esc(h.id) + '">mark sent</button>' +
        '<button class="btn" data-action="skip" data-id="' + esc(h.id) + '">skip</button>' +
        '</div></div>';

    if (queue.length > 1) {
        html += '<h3 class="section-title">up next</h3><div class="queue-list">' +
            queue.slice(1, 11).map(function (q) {
                return '<div class="row"><span>' + esc(q.display_name) + '</span><span>' + esc(q.phone_e164 ? formatPhone(q.phone_e164) : 'no number') + '</span></div>';
            }).join('') +
            (queue.length > 11 ? '<div class="row"><span>+ ' + (queue.length - 11) + ' more</span></div>' : '') +
            '</div>';
    }
    el.innerHTML = html;
}

async function markSent(id, mode) {
    var h = householdById[id];
    if (!h) return;
    var now = new Date().toISOString();
    var patch = mode === 'reminder' ? { reminded_at: now } : { wa_sent_at: h.wa_sent_at || now };
    Object.assign(h, patch);
    skippedInQueue = skippedInQueue.filter(function (x) { return x !== id; });
    var result = await supabaseClient.from('wedding_households').update(patch).eq('id', id);
    if (result.error) {
        console.error(result.error);
        showToast('could not mark as sent');
    }
    renderSend();
    renderHouseholds();
    renderOverview();
}

async function saveTemplates() {
    var invite = $('tpl-invite').value.trim();
    var reminder = $('tpl-reminder').value.trim();
    if (invite.indexOf('{link}') === -1 || reminder.indexOf('{link}') === -1) {
        if (!confirm("one of the messages has no {link}, so guests won't be able to reply. save anyway?")) return;
    }
    var patch = {
        invite_template: invite === DEFAULT_INVITE_TEMPLATE ? null : invite,
        reminder_template: reminder === DEFAULT_REMINDER_TEMPLATE ? null : reminder
    };
    var result = await supabaseClient.from('weddings').update(patch).eq('id', wedding.id);
    if (result.error) { showToast('could not save'); return; }
    Object.assign(wedding, patch);
    showToast('wording saved');
    renderSend();
    renderHouseholds();
}

// Settings
function renderSettings() {
    $('wd-couple').value = wedding.couple_names;
    $('wd-title').value = wedding.title;
    document.querySelector('.js-join-code').textContent = wedding.join_code;

    var me = members.find(function (m) { return m.user_id === currentUser.id; });
    var isOwner = me && me.role === 'owner';
    $('delete-wedding-btn').classList.toggle('hidden', !isOwner);
    $('leave-wedding-btn').classList.toggle('hidden', !!isOwner);

    $('member-list').innerHTML = members.map(function (m) {
        var label = (m.display_name || 'someone').toLowerCase() + (m.user_id === currentUser.id ? ' (you)' : '');
        var canRemove = isOwner && m.user_id !== currentUser.id;
        return '<div class="queue-list"><div class="row"><span>' + esc(label) + ' · ' + (m.role === 'owner' ? 'owner' : 'co-host') + '</span>' +
            (canRemove ? '<button class="btn btn-small btn-danger" data-action="remove-member" data-id="' + esc(m.user_id) + '">remove</button>' : '') +
            '</div></div>';
    }).join('');
}

async function saveWeddingDetails(e) {
    e.preventDefault();
    var patch = { couple_names: $('wd-couple').value.trim(), title: $('wd-title').value.trim() };
    if (!patch.couple_names || !patch.title) return;
    var result = await supabaseClient.from('weddings').update(patch).eq('id', wedding.id);
    if (result.error) { showToast('could not save'); return; }
    Object.assign(wedding, patch);
    renderWeddingSelect();
    showToast('saved');
}

function joinLink() {
    return window.location.origin + window.location.pathname + '?join=' + wedding.join_code;
}

async function removeMember(userId) {
    if (!confirm('remove this co-host? they will lose access to the guest list.')) return;
    var result = await supabaseClient.from('wedding_members').delete().eq('wedding_id', wedding.id).eq('user_id', userId);
    if (result.error) { showToast('could not remove'); return; }
    await loadWeddingData();
}

async function leaveWedding() {
    if (!confirm('leave this guest list? you will need the co-host code to get back in.')) return;
    var result = await supabaseClient.from('wedding_members').delete().eq('wedding_id', wedding.id).eq('user_id', currentUser.id);
    if (result.error) { showToast('could not leave'); return; }
    try { localStorage.removeItem(STORAGE_WEDDING); } catch (e) { /* ignore */ }
    await loadWeddings();
}

async function deleteWedding() {
    var typed = prompt('this deletes "' + wedding.title + '", every family, every reply. type delete to confirm.');
    if (!typed || typed.trim().toLowerCase() !== 'delete') return;
    var result = await supabaseClient.from('weddings').delete().eq('id', wedding.id);
    if (result.error) { showToast('could not delete'); return; }
    try { localStorage.removeItem(STORAGE_WEDDING); } catch (e) { /* ignore */ }
    showToast('deleted');
    await loadWeddings();
}

// ─── Household modal ─────────────────────────────────────────────
function renderEventCheckboxes(containerId, checkedIds) {
    $(containerId).innerHTML = events.length ? events.map(function (ev) {
        var checked = checkedIds === null || checkedIds.indexOf(ev.id) !== -1;
        return '<label class="check-row"><input type="checkbox" value="' + esc(ev.id) + '"' + (checked ? ' checked' : '') + '> ' + esc(ev.name) + '</label>';
    }).join('') : '<p class="hint">add events first, then tick which ones this family is invited to.</p>';
}

function checkedEventIds(containerId) {
    return Array.prototype.map.call($(containerId).querySelectorAll('input:checked'), function (i) { return i.value; });
}

function openHouseholdModal(h) {
    $('household-modal-title').textContent = h ? 'edit family' : 'add family';
    $('hh-id').value = h ? h.id : '';
    $('hh-name').value = h ? h.display_name : '';
    $('hh-phone').value = h && h.phone_e164 ? formatPhone(h.phone_e164) : '';
    $('hh-max').value = h ? h.max_guests : 2;
    $('hh-side').value = h ? h.side : 'bride';
    $('hh-invited-by').value = h ? (h.invited_by || '') : '';
    $('hh-locality').value = h ? h.locality : 'local';
    $('hh-card').checked = h ? h.card_delivered : false;
    $('hh-notes').value = h ? (h.notes || '') : '';
    $('hh-delete').classList.toggle('hidden', !h);
    renderEventCheckboxes('hh-events', h ? Object.keys(invByHousehold[h.id] || {}) : null);
    openModal('household-modal');
    setTimeout(function () { $('hh-name').focus(); }, 50);
}

async function saveHousehold(e) {
    e.preventDefault();
    var id = $('hh-id').value;
    var rawPhone = $('hh-phone').value.trim();
    var phone = normalizePhone(rawPhone);
    if (rawPhone && !phone) {
        showToast("that number doesn't look right — add the country code, like +44…");
        return;
    }
    if (phone) {
        var dupe = households.find(function (h) { return h.phone_e164 === phone && h.id !== id; });
        if (dupe && !confirm('this number is already on the list as "' + dupe.display_name + '". families often share a phone — add anyway?')) return;
    }
    var row = {
        display_name: $('hh-name').value.trim(),
        phone_e164: phone,
        max_guests: Math.max(1, Math.min(50, parseInt($('hh-max').value, 10) || 1)),
        side: $('hh-side').value,
        invited_by: $('hh-invited-by').value.trim() || null,
        locality: $('hh-locality').value,
        card_delivered: $('hh-card').checked,
        notes: $('hh-notes').value.trim() || null
    };
    var wanted = checkedEventIds('hh-events');

    var householdId = id;
    if (id) {
        var upd = await supabaseClient.from('wedding_households').update(row).eq('id', id);
        if (upd.error) { console.error(upd.error); showToast('could not save'); return; }
    } else {
        row.wedding_id = wedding.id;
        var ins = await supabaseClient.from('wedding_households').insert(row).select('id').single();
        if (ins.error) { console.error(ins.error); showToast('could not save'); return; }
        householdId = ins.data.id;
    }

    var current = invByHousehold[householdId] || {};
    var toAdd = wanted.filter(function (evId) { return !current[evId]; });
    var toRemove = Object.keys(current).filter(function (evId) { return wanted.indexOf(evId) === -1; });
    var answered = toRemove.filter(function (evId) { return current[evId].status !== 'pending'; });
    if (answered.length && !confirm('they already replied for ' + answered.map(function (evId) { return eventById[evId].name; }).join(', ') + '. remove them from it anyway?')) {
        toRemove = toRemove.filter(function (evId) { return answered.indexOf(evId) === -1; });
    }
    if (toAdd.length) {
        var addRes = await supabaseClient.from('wedding_invitations').insert(toAdd.map(function (evId) {
            return { wedding_id: wedding.id, household_id: householdId, event_id: evId };
        }));
        if (addRes.error) { console.error(addRes.error); showToast('saved, but could not update events'); }
    }
    if (toRemove.length) {
        var delRes = await supabaseClient.from('wedding_invitations').delete()
            .eq('household_id', householdId).in('event_id', toRemove);
        if (delRes.error) { console.error(delRes.error); showToast('saved, but could not update events'); }
    }

    closeModal('household-modal');
    showToast(id ? 'saved' : 'added');
    await loadWeddingData();
}

async function deleteHousehold() {
    var id = $('hh-id').value;
    var h = householdById[id];
    if (!h || !confirm('remove ' + h.display_name + ' and their replies?')) return;
    var result = await supabaseClient.from('wedding_households').delete().eq('id', id);
    if (result.error) { showToast('could not remove'); return; }
    closeModal('household-modal');
    showToast('removed');
    await loadWeddingData();
}

// ─── Record reply modal ──────────────────────────────────────────
function openReplyModal(h) {
    var invs = invByHousehold[h.id] || {};
    var evs = events.filter(function (ev) { return invs[ev.id]; });
    if (!evs.length) {
        showToast('tick an event for this family first');
        openHouseholdModal(h);
        return;
    }
    replyDraft = { householdId: h.id, items: {} };
    evs.forEach(function (ev) {
        var inv = invs[ev.id];
        replyDraft.items[ev.id] = { id: inv.id, status: inv.status, adults: inv.adults, kids: inv.kids, veg: inv.veg };
    });
    $('reply-modal-title').textContent = h.display_name;
    document.querySelector('.js-reply-sub').textContent =
        'for when they reply on a call or in person. up to ' + h.max_guests + ' people.' +
        (h.guest_note ? ' their note: “' + h.guest_note + '”' : '');
    renderReplyEvents();
    openModal('reply-modal');
}

function renderReplyEvents() {
    $('reply-events').innerHTML = Object.keys(replyDraft.items).map(function (evId) {
        var ev = eventById[evId];
        var d = replyDraft.items[evId];
        return '<div class="card"><div class="card-title">' + esc(ev.name) + '</div>' +
            '<div class="card-sub" style="margin-bottom:0.6rem">' + esc(formatEventDate(ev)) + '</div>' +
            '<div class="segmented">' + ['pending', 'yes', 'maybe', 'no'].map(function (s) {
                return '<button type="button" data-reply-event="' + esc(evId) + '" data-status="' + s + '" class="' + (d.status === s ? 'active' : '') + '">' + STATUS_LABELS[s] + '</button>';
            }).join('') + '</div>' +
            (d.status === 'yes' ? '<div class="counts">' +
                countInput(evId, 'adults', d.adults) + countInput(evId, 'kids', d.kids) + countInput(evId, 'veg', d.veg) +
                '</div>' : '') +
            '</div>';
    }).join('');
}

function countInput(evId, field, value) {
    return '<div><label class="hint" style="display:block;margin-bottom:0.25rem">' + field + '</label>' +
        '<input type="number" min="0" max="50" value="' + esc(value) + '" data-reply-count="' + esc(evId) + '" data-field="' + field + '"></div>';
}

async function saveReply() {
    var h = householdById[replyDraft.householdId];
    var now = new Date().toISOString();
    var updates = [];
    var over = false;
    Object.keys(replyDraft.items).forEach(function (evId) {
        var d = replyDraft.items[evId];
        var orig = invByHousehold[h.id][evId];
        var adults = d.status === 'yes' ? Math.max(0, d.adults | 0) : 0;
        var kids = d.status === 'yes' ? Math.max(0, d.kids | 0) : 0;
        if (d.status === 'yes' && adults + kids === 0) adults = 1;
        var veg = d.status === 'yes' ? Math.min(Math.max(0, d.veg | 0), adults + kids) : 0;
        if (adults + kids > h.max_guests) over = true;
        if (orig.status === d.status && orig.adults === adults && orig.kids === kids && orig.veg === veg) return;
        updates.push(supabaseClient.from('wedding_invitations').update({
            status: d.status, adults: adults, kids: kids, veg: veg,
            responded_via: d.status === 'pending' ? null : 'host',
            responded_at: d.status === 'pending' ? null : now
        }).eq('id', d.id));
    });
    var results = await Promise.all(updates);
    if (results.some(function (r) { return r.error; })) {
        showToast('some replies could not be saved');
    } else {
        showToast(over ? 'saved — that\'s more than their limit, fyi' : 'saved');
    }
    closeModal('reply-modal');
    await loadWeddingData();
}

// ─── Event modal ─────────────────────────────────────────────────
function openEventModal(ev) {
    $('event-modal-title').textContent = ev ? 'edit event' : 'add event';
    $('ev-id').value = ev ? ev.id : '';
    $('ev-kind').value = ev ? ev.kind : 'custom';
    $('ev-name').value = ev ? ev.name : '';
    $('ev-start').value = ev ? toLocalInputValue(ev.starts_at) : '';
    $('ev-side').value = ev ? ev.host_side : 'both';
    $('ev-venue').value = ev ? (ev.venue || '') : '';
    $('ev-deadline').value = ev ? (ev.rsvp_deadline || '') : '';
    $('ev-panth').value = ev && ev.seats_per_panth ? ev.seats_per_panth : '';
    $('ev-delete').classList.toggle('hidden', !ev);
    document.querySelector('.js-invite-all-row').classList.toggle('hidden', !!ev || !households.length);
    $('ev-invite-all').checked = true;

    var presets = document.querySelector('.js-presets');
    presets.classList.toggle('hidden', !!ev);
    presets.innerHTML = EVENT_PRESETS.map(function (p, i) {
        return '<button type="button" class="chip preset" data-preset="' + i + '">' + esc(p.name || 'something else') + '</button>';
    }).join('');
    openModal('event-modal');
}

function applyPreset(index) {
    var p = EVENT_PRESETS[index];
    $('ev-kind').value = p.kind;
    $('ev-name').value = p.name;
    $('ev-side').value = p.side;
    if (p.panth && !$('ev-panth').value) $('ev-panth').value = p.panth;
    $('ev-name').focus();
}

async function saveEvent(e) {
    e.preventDefault();
    var id = $('ev-id').value;
    var startVal = $('ev-start').value;
    var row = {
        name: $('ev-name').value.trim(),
        kind: $('ev-kind').value || 'custom',
        host_side: $('ev-side').value,
        starts_at: startVal ? new Date(startVal).toISOString() : null,
        tz: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata',
        parsi_date: startVal ? parsiDateFor(startVal.slice(0, 10)) : null,
        venue: $('ev-venue').value.trim() || null,
        rsvp_deadline: $('ev-deadline').value || null,
        seats_per_panth: parseInt($('ev-panth').value, 10) || null
    };
    if (!row.name) return;

    if (id) {
        var upd = await supabaseClient.from('wedding_events').update(row).eq('id', id);
        if (upd.error) { console.error(upd.error); showToast('could not save'); return; }
    } else {
        row.wedding_id = wedding.id;
        row.sort_order = events.length;
        var ins = await supabaseClient.from('wedding_events').insert(row).select('id').single();
        if (ins.error) { console.error(ins.error); showToast('could not save'); return; }
        if ($('ev-invite-all').checked && households.length) {
            var rows = households.map(function (h) {
                return { wedding_id: wedding.id, household_id: h.id, event_id: ins.data.id };
            });
            for (var c of chunk(rows, 500)) {
                var r = await supabaseClient.from('wedding_invitations').insert(c);
                if (r.error) { console.error(r.error); showToast('event saved, but could not invite everyone'); break; }
            }
        }
    }
    closeModal('event-modal');
    showToast('saved');
    await loadWeddingData();
}

async function deleteEvent() {
    var id = $('ev-id').value;
    var ev = eventById[id];
    if (!ev || !confirm('delete ' + ev.name + '? all replies for it go too.')) return;
    var result = await supabaseClient.from('wedding_events').delete().eq('id', id);
    if (result.error) { showToast('could not delete'); return; }
    closeModal('event-modal');
    await loadWeddingData();
}

// ─── Import ──────────────────────────────────────────────────────
function supportsContactPicker() {
    return 'contacts' in navigator && 'ContactsManager' in window;
}

function openImportModal() {
    importRows = [];
    $('import-paste').value = '';
    $('import-file').value = '';
    $('import-preview').classList.add('hidden');
    $('pick-contacts-btn').classList.toggle('hidden', !supportsContactPicker());
    document.querySelector('.js-import-help').textContent = supportsContactPicker()
        ? 'pick lots of people at once from your phone. you choose who — we never see the rest of your contacts.'
        : /iPhone|iPad/.test(navigator.userAgent)
            ? 'on iphone: open contacts, select people, share → save to files, then upload the .vcf here. or export your google contacts as csv.'
            : 'export your contacts as .vcf or .csv (google contacts → export) and upload, or paste a list below.';
    renderEventCheckboxes('imp-events', null);
    openModal('import-modal');
}

async function pickContacts() {
    try {
        var picked = await navigator.contacts.select(['name', 'tel'], { multiple: true });
        addImportRows(picked.map(function (c) {
            return { name: (c.name && c.name[0]) || (c.tel && c.tel[0]) || '', phone: (c.tel && c.tel[0]) || '' };
        }));
    } catch (err) {
        console.error(err);
    }
}

function readImportFile(file) {
    var reader = new FileReader();
    reader.onload = function () {
        var text = String(reader.result || '');
        addImportRows(/BEGIN:VCARD/i.test(text) ? parseVcf(text) : parseCsv(text));
    };
    reader.readAsText(file);
}

function parseVcf(text) {
    var unfolded = text.replace(/\r\n/g, '\n').replace(/\n[ \t]/g, '');
    return unfolded.split(/BEGIN:VCARD/i).slice(1).map(function (card) {
        var fn = card.match(/^FN[^:\n]*:(.*)$/im);
        var name = fn ? fn[1] : '';
        if (!name) {
            var n = card.match(/^N[^:\n]*:(.*)$/im);
            if (n) {
                var parts = n[1].split(';');
                name = [parts[3], parts[1], parts[2], parts[0]].filter(Boolean).join(' ');
            }
        }
        var tels = [];
        var re = /^(?:item\d+\.)?TEL([^:\n]*):(.*)$/gim;
        var m;
        while ((m = re.exec(card))) tels.push({ params: m[1].toLowerCase(), value: m[2].trim() });
        var best = tels.find(function (t) { return /cell|mobile|iphone|whatsapp/.test(t.params); }) || tels[0];
        return { name: name.replace(/\\,/g, ',').replace(/\\;/g, ';').trim(), phone: best ? best.value.replace(/^tel:/i, '') : '' };
    });
}

function splitCsvLine(line, delim) {
    var out = [];
    var cur = '';
    var quoted = false;
    for (var i = 0; i < line.length; i++) {
        var ch = line.charAt(i);
        if (quoted) {
            if (ch === '"' && line.charAt(i + 1) === '"') { cur += '"'; i++; }
            else if (ch === '"') quoted = false;
            else cur += ch;
        } else if (ch === '"') quoted = true;
        else if (ch === delim) { out.push(cur); cur = ''; }
        else cur += ch;
    }
    out.push(cur);
    return out.map(function (s) { return s.trim(); });
}

function looksLikePhone(s) {
    return /^[+\d][\d\s\-().]{6,}$/.test((s || '').trim());
}

function parseCsv(text) {
    var lines = text.replace(/^﻿/, '').split(/\r?\n/).filter(function (l) { return l.trim(); });
    if (!lines.length) return [];
    var delim = lines[0].indexOf('\t') !== -1 ? '\t' : (lines[0].indexOf(',') !== -1 ? ',' : ';');
    var head = splitCsvLine(lines[0], delim).map(function (h) { return h.toLowerCase(); });
    var hasHeader = head.some(function (h) { return /name|phone|mobile|number|whatsapp/.test(h); });

    if (!hasHeader) {
        return lines.map(function (l) {
            var cells = splitCsvLine(l, delim);
            if (looksLikePhone(cells[0]) && cells[1] && !looksLikePhone(cells[1])) return { name: cells[1], phone: cells[0] };
            return { name: cells[0] || '', phone: cells[1] || '' };
        });
    }

    function find(re) { for (var i = 0; i < head.length; i++) if (re.test(head[i])) return i; return -1; }
    var nameCol = find(/^(full |display )?name$/);
    var firstCol = find(/first name|given name/);
    var lastCol = find(/last name|family name|surname/);
    var phoneCol = find(/phone.*value/);
    if (phoneCol === -1) phoneCol = find(/mobile|whatsapp|phone|number|tel/);
    if (nameCol === -1 && firstCol === -1) nameCol = find(/name/);

    return lines.slice(1).map(function (l) {
        var cells = splitCsvLine(l, delim);
        var name = nameCol !== -1 ? cells[nameCol] : [cells[firstCol], lastCol !== -1 ? cells[lastCol] : ''].filter(Boolean).join(' ');
        var phone = phoneCol !== -1 ? (cells[phoneCol] || '').split(':::')[0] : '';
        return { name: name || '', phone: phone.trim() };
    });
}

function parsePastedLines(text) {
    return text.split(/\r?\n/).map(function (line) {
        var m = line.match(/(\+?\d[\d\s\-().]{6,}\d)/);
        var phone = m ? m[1] : '';
        var name = (m ? line.replace(m[1], '') : line).replace(/^[\s,;:|\-–]+|[\s,;:|\-–]+$/g, '').trim();
        return { name: name, phone: phone };
    }).filter(function (r) { return r.name || r.phone; });
}

function addImportRows(rows) {
    rows.forEach(function (r) {
        var phone = normalizePhone(r.phone);
        var name = (r.name || '').trim() || (phone ? formatPhone(phone) : '');
        if (!name) return;
        if (phone && importRows.some(function (x) { return x.phone === phone; })) return;
        var existing = phone ? households.find(function (h) { return h.phone_e164 === phone; }) : null;
        importRows.push({
            name: name.slice(0, 120),
            phone: phone,
            rawPhone: r.phone,
            existing: existing ? existing.display_name : null,
            include: !existing
        });
    });
    renderImportPreview();
}

function renderImportPreview() {
    $('import-preview').classList.toggle('hidden', !importRows.length);
    var selected = importRows.filter(function (r) { return r.include; }).length;
    document.querySelector('.js-import-summary').textContent =
        importRows.length + ' found · ' + selected + ' selected. untick anyone you don\'t want.';
    $('import-save').textContent = 'add ' + selected + ' ' + (selected === 1 ? 'family' : 'families');
    $('import-save').disabled = !selected;
    $('import-list').innerHTML = importRows.map(function (r, i) {
        var warn = r.existing ? 'already on the list as ' + r.existing
            : (!r.phone && r.rawPhone ? 'number not recognised, will be saved without it'
                : (!r.phone ? 'no number' : ''));
        return '<label class="import-row"><input type="checkbox" data-import-index="' + i + '"' + (r.include ? ' checked' : '') + '>' +
            '<span class="name">' + esc(r.name) + '<br><span class="phone">' + esc(r.phone ? formatPhone(r.phone) : '') + '</span>' +
            (warn ? ' <span class="warn">' + esc(warn) + '</span>' : '') + '</span></label>';
    }).join('');
}

async function saveImport() {
    var chosen = importRows.filter(function (r) { return r.include; });
    if (!chosen.length) return;
    var eventIds = checkedEventIds('imp-events');
    var defaults = {
        side: $('imp-side').value,
        max_guests: Math.max(1, Math.min(50, parseInt($('imp-max').value, 10) || 2)),
        invited_by: $('imp-invited-by').value.trim() || null,
        locality: $('imp-locality').value
    };
    $('import-save').disabled = true;
    $('import-save').textContent = 'adding…';

    var newIds = [];
    for (var c of chunk(chosen, 200)) {
        var res = await supabaseClient.from('wedding_households').insert(c.map(function (r) {
            return Object.assign({ wedding_id: wedding.id, display_name: r.name, phone_e164: r.phone }, defaults);
        })).select('id');
        if (res.error) {
            console.error(res.error);
            showToast('stopped partway: ' + res.error.message);
            break;
        }
        newIds = newIds.concat(res.data.map(function (d) { return d.id; }));
    }

    var invRows = [];
    newIds.forEach(function (hid) {
        eventIds.forEach(function (evId) {
            invRows.push({ wedding_id: wedding.id, household_id: hid, event_id: evId });
        });
    });
    for (var ic of chunk(invRows, 500)) {
        var ir = await supabaseClient.from('wedding_invitations').insert(ic);
        if (ir.error) { console.error(ir.error); showToast('families added, but some events were not ticked'); break; }
    }

    closeModal('import-modal');
    showToast(newIds.length + ' families added');
    await loadWeddingData();
}

// ─── Exports ─────────────────────────────────────────────────────
function exportAll() {
    var header = ['family', 'whatsapp', 'side', 'whose list', 'coming from', 'max people', 'invite sent', 'opened link', 'card delivered'];
    events.forEach(function (ev) {
        header.push(ev.name + ' – reply', ev.name + ' – adults', ev.name + ' – kids', ev.name + ' – veg');
    });
    header.push('their note', 'your notes', 'rsvp link');
    var rows = [header];
    households.forEach(function (h) {
        var invs = invByHousehold[h.id] || {};
        var row = [h.display_name, h.phone_e164 || '', SIDE_LABELS[h.side], h.invited_by || '', LOCALITY_LABELS[h.locality],
            h.max_guests, h.wa_sent_at ? 'yes' : '', h.link_opened_at ? 'yes' : '', h.card_delivered ? 'yes' : ''];
        events.forEach(function (ev) {
            var inv = invs[ev.id];
            if (!inv) row.push('not invited', '', '', '');
            else row.push(STATUS_LABELS[inv.status], inv.status === 'yes' ? inv.adults : '', inv.status === 'yes' ? inv.kids : '', inv.status === 'yes' ? inv.veg : '');
        });
        row.push(h.guest_note || '', h.notes || '', rsvpLink(h));
        rows.push(row);
    });
    downloadCsv(slug(wedding.title) + '-guest-list.csv', rows);
}

function exportEvent(evId) {
    var ev = eventById[evId];
    var rows = [['family', 'reply', 'adults', 'kids', 'veg', 'side', 'whatsapp', 'notes']];
    var order = { yes: 0, maybe: 1, pending: 2, no: 3 };
    invitations
        .filter(function (inv) { return inv.event_id === evId && householdById[inv.household_id]; })
        .sort(function (a, b) {
            return (order[a.status] - order[b.status]) ||
                householdById[a.household_id].display_name.localeCompare(householdById[b.household_id].display_name);
        })
        .forEach(function (inv) {
            var h = householdById[inv.household_id];
            rows.push([h.display_name, STATUS_LABELS[inv.status],
                inv.status === 'yes' ? inv.adults : '', inv.status === 'yes' ? inv.kids : '', inv.status === 'yes' ? inv.veg : '',
                SIDE_LABELS[h.side], h.phone_e164 || '', h.notes || '']);
        });
    var s = eventStats(ev);
    rows.push([]);
    rows.push(['total coming', '', s.adults, s.kids, s.veg]);
    rows.push(['expected (estimate)', s.expected]);
    downloadCsv(slug(wedding.title) + '-' + slug(ev.name) + '.csv', rows);
}

// ─── Event wiring ────────────────────────────────────────────────
function onDocumentClick(e) {
    var closer = e.target.closest('[data-close]');
    if (closer) {
        closeModal(closer.closest('.modal-overlay').id);
        return;
    }
    if (e.target.classList.contains('modal-overlay')) {
        closeModal(e.target.id);
        return;
    }

    var preset = e.target.closest('[data-preset]');
    if (preset) { applyPreset(Number(preset.dataset.preset)); return; }

    var replyBtn = e.target.closest('[data-reply-event]');
    if (replyBtn) {
        var item = replyDraft.items[replyBtn.dataset.replyEvent];
        item.status = replyBtn.dataset.status;
        if (item.status === 'yes' && item.adults + item.kids === 0) {
            item.adults = Math.min(2, householdById[replyDraft.householdId].max_guests);
        }
        renderReplyEvents();
        return;
    }

    var el = e.target.closest('[data-action]');
    if (!el) return;
    var id = el.dataset.id;
    switch (el.dataset.action) {
        case 'add-event': switchTab('events'); openEventModal(null); break;
        case 'go-families': switchTab('families'); break;
        case 'edit-event': openEventModal(eventById[id]); break;
        case 'edit-household': openHouseholdModal(householdById[id]); break;
        case 'record-reply': openReplyModal(householdById[id]); break;
        case 'copy-link': copyText(rsvpLink(householdById[id])); break;
        case 'copy-message': copyText(messageFor(householdById[id], sendMode)); break;
        case 'wa-sent':
            // Let the link open WhatsApp, then record the send.
            setTimeout(function () { markSent(id, el.dataset.mode); }, 300);
            break;
        case 'mark-sent': markSent(id, sendMode); break;
        case 'skip':
            skippedInQueue = skippedInQueue.filter(function (x) { return x !== id; });
            skippedInQueue.push(id);
            renderSend();
            break;
        case 'event-csv': exportEvent(id); break;
        case 'export-all': exportAll(); break;
        case 'refresh': loadWeddingData().then(function () { showToast('up to date'); }); break;
        case 'remove-member': removeMember(id); break;
    }
}

function wireUp() {
    $('google-login-btn').addEventListener('click', signInWithGoogle);
    document.querySelectorAll('.js-sign-out').forEach(function (b) { b.addEventListener('click', signOut); });
    $('create-wedding-form').addEventListener('submit', createWedding);
    $('join-wedding-form').addEventListener('submit', onJoinSubmit);
    $('cw-couple').addEventListener('input', function () {
        var v = $('cw-couple').value.trim();
        $('cw-title').placeholder = v ? v + "'s lagan" : "zarine & kaizad's lagan";
    });

    $('wedding-select').addEventListener('change', function (e) {
        if (e.target.value === '__new') {
            renderWeddingSelect();
            showSetup();
        } else {
            selectWedding(e.target.value);
        }
    });

    document.querySelectorAll('.tab').forEach(function (b) {
        b.addEventListener('click', function () { switchTab(b.dataset.tab); });
    });

    $('add-household-btn').addEventListener('click', function () { openHouseholdModal(null); });
    $('import-btn').addEventListener('click', openImportModal);
    $('household-search').addEventListener('input', renderHouseholds);
    $('household-filter').addEventListener('change', renderHouseholds);
    $('household-form').addEventListener('submit', saveHousehold);
    $('hh-delete').addEventListener('click', deleteHousehold);

    $('reply-save').addEventListener('click', saveReply);
    $('reply-events').addEventListener('input', function (e) {
        var t = e.target;
        if (!t.dataset.replyCount) return;
        replyDraft.items[t.dataset.replyCount][t.dataset.field] = parseInt(t.value, 10) || 0;
    });

    $('add-event-btn').addEventListener('click', function () { openEventModal(null); });
    $('event-form').addEventListener('submit', saveEvent);
    $('ev-delete').addEventListener('click', deleteEvent);

    document.querySelectorAll('#send-mode button').forEach(function (b) {
        b.addEventListener('click', function () { sendMode = b.dataset.mode; renderSend(); });
    });
    $('save-templates-btn').addEventListener('click', saveTemplates);
    $('reset-templates-btn').addEventListener('click', function () {
        $('tpl-invite').value = DEFAULT_INVITE_TEMPLATE;
        $('tpl-reminder').value = DEFAULT_REMINDER_TEMPLATE;
    });

    $('pick-contacts-btn').addEventListener('click', pickContacts);
    $('import-file').addEventListener('change', function (e) {
        if (e.target.files[0]) readImportFile(e.target.files[0]);
    });
    $('import-parse-btn').addEventListener('click', function () {
        addImportRows(parsePastedLines($('import-paste').value));
        $('import-paste').value = '';
    });
    $('import-list').addEventListener('change', function (e) {
        var idx = e.target.dataset.importIndex;
        if (idx === undefined) return;
        importRows[Number(idx)].include = e.target.checked;
        renderImportPreview();
    });
    $('import-save').addEventListener('click', saveImport);

    $('wedding-details-form').addEventListener('submit', saveWeddingDetails);
    $('copy-join-link-btn').addEventListener('click', function () { copyText(joinLink()); });
    $('leave-wedding-btn').addEventListener('click', leaveWedding);
    $('delete-wedding-btn').addEventListener('click', deleteWedding);
    $('new-wedding-btn').addEventListener('click', showSetup);

    document.addEventListener('click', onDocumentClick);
    document.addEventListener('keydown', function (e) {
        if (e.key !== 'Escape') return;
        document.querySelectorAll('.modal-overlay:not(.hidden)').forEach(function (m) { closeModal(m.id); });
    });

    // Coming back from WhatsApp: pick up replies that arrived meanwhile.
    document.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'visible' && wedding && Date.now() - lastLoadedAt > 20000) {
            loadWeddingData();
        }
    });
}

// ─── Init ────────────────────────────────────────────────────────
(async function init() {
    wireUp();

    var params = new URLSearchParams(window.location.search);
    var joinCode = params.get('join');
    if (joinCode) {
        try { localStorage.setItem(STORAGE_JOIN, joinCode); } catch (e) { /* ignore */ }
        history.replaceState(null, '', window.location.pathname + window.location.hash);
    }
    try { activeTab = localStorage.getItem(STORAGE_TAB) || 'overview'; } catch (e) { /* ignore */ }

    var sessionResult = await supabaseClient.auth.getSession();
    var session = sessionResult.data && sessionResult.data.session;
    if (session) {
        await onSignedIn(session.user);
    } else {
        showSection('auth-section');
    }

    supabaseClient.auth.onAuthStateChange(function (event, newSession) {
        if (event === 'SIGNED_IN' && newSession && (!currentUser || currentUser.id !== newSession.user.id)) {
            onSignedIn(newSession.user);
        } else if (event === 'SIGNED_OUT') {
            currentUser = null;
            showSection('auth-section');
        }
    });
})();
