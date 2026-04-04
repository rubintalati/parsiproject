/**
 * Roj Wisher — Supabase Auth, CRUD, Roj Calculation, UI Rendering
 * Uses combined.js for Zoroastrian calendar conversion functions
 */

// ─── Supabase Config ─────────────────────────────────────────────
const SUPABASE_URL = 'https://ihsbndryziohroodkwjn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imloc2JuZHJ5emlvaHJvb2Rrd2puIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwNjA0NTEsImV4cCI6MjA5MDYzNjQ1MX0.BNW9mTWgRDG5yJ8rjjZ-g8v8C2dbfAOapZCDq0aKFgk';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ─── State ───────────────────────────────────────────────────────
var currentUser = null;
var userSettings = null;
var contacts = [];
var isFirstLogin = false;

// ─── Device Detection ────────────────────────────────────────────
function isAppleDevice() {
    return /iPad|iPhone|iPod|Macintosh/.test(navigator.userAgent);
}

function isMobile() {
    return window.innerWidth <= 768;
}

// ─── DOM References ──────────────────────────────────────────────
var authSection = document.getElementById('auth-section');
var appSection = document.getElementById('app-section');
var googleLoginBtn = document.getElementById('google-login-btn');
var signOutBtn = document.getElementById('sign-out-btn');
var userNameEl = document.getElementById('user-name');
var settingsToggle = document.getElementById('settings-toggle');
var settingsContent = document.getElementById('settings-content');
var calendarTypeSelect = document.getElementById('calendar-type-select');
var reminderTimingSelect = document.getElementById('reminder-timing-select');
var remindRojCheckbox = document.getElementById('remind-roj');
var remindActualCheckbox = document.getElementById('remind-actual');
var addContactBtn = document.getElementById('add-contact-btn');
var contactsTbody = document.getElementById('contacts-tbody');
var contactsCards = document.getElementById('contacts-cards');
var emptyState = document.getElementById('empty-state');
var contactModal = document.getElementById('contact-modal');
var modalClose = document.getElementById('modal-close');
var modalTitle = document.getElementById('modal-title');
var contactForm = document.getElementById('contact-form');
var contactIdInput = document.getElementById('contact-id');
var contactNameInput = document.getElementById('contact-name');
var contactBeforeSunrise = document.getElementById('contact-before-sunrise');
var contactEventType = document.getElementById('contact-event-type');
var contactCountryCode = document.getElementById('contact-country-code');
var contactMobile = document.getElementById('contact-mobile');
var dobDay = document.getElementById('dob-day');
var dobMonth = document.getElementById('dob-month');
var dobYear = document.getElementById('dob-year');
var appleSubscribeLink = document.getElementById('apple-subscribe');
var googleSubscribeLink = document.getElementById('google-subscribe');
var calendarSection = document.getElementById('calendar-section');
var calendarButtons = document.getElementById('calendar-buttons');
var calendarSubscribedNote = document.getElementById('calendar-subscribed-note');
var onboardingModal = document.getElementById('onboarding-modal');
var onboardSaveBtn = document.getElementById('onboard-save');
var toastEl = document.getElementById('toast');
var dontKnowYearCheckbox = document.getElementById('dont-know-year');
var bycSection = document.getElementById('byc-section');
var bycRojDay = document.getElementById('byc-roj-day');
var bycRojMonth = document.getElementById('byc-roj-month');
var bycRojYear = document.getElementById('byc-roj-year');
var bycCheckBtn = document.getElementById('byc-check-btn');
var bycResult = document.getElementById('byc-result');
var bycResultText = document.getElementById('byc-result-text');
var bycError = document.getElementById('byc-error');

// ─── DOB Dropdown Setup ──────────────────────────────────────────
function populateDobDropdowns() {
    // Days
    dobDay.innerHTML = '<option value="" disabled selected>day</option>';
    for (var d = 1; d <= 31; d++) {
        dobDay.innerHTML += '<option value="' + d + '">' + d + '</option>';
    }

    // Months
    var monthNames = ['january', 'february', 'march', 'april', 'may', 'june',
                      'july', 'august', 'september', 'october', 'november', 'december'];
    dobMonth.innerHTML = '<option value="" disabled selected>month</option>';
    for (var m = 0; m < 12; m++) {
        dobMonth.innerHTML += '<option value="' + (m + 1) + '">' + monthNames[m] + '</option>';
    }

    // Years (current year down to 100 years ago)
    var currentYear = new Date().getFullYear();
    dobYear.innerHTML = '<option value="" disabled selected>year</option>';
    for (var y = currentYear; y >= currentYear - 100; y--) {
        dobYear.innerHTML += '<option value="' + y + '">' + y + '</option>';
    }
}

function populateBycDropdowns() {
    // Days
    bycRojDay.innerHTML = '<option value="" disabled selected>day</option>';
    for (var d = 1; d <= 31; d++) {
        bycRojDay.innerHTML += '<option value="' + d + '">' + d + '</option>';
    }
    // Months
    var monthNames = ['january', 'february', 'march', 'april', 'may', 'june',
                      'july', 'august', 'september', 'october', 'november', 'december'];
    bycRojMonth.innerHTML = '<option value="" disabled selected>month</option>';
    for (var m = 0; m < 12; m++) {
        bycRojMonth.innerHTML += '<option value="' + (m + 1) + '">' + monthNames[m] + '</option>';
    }
    // Years (last 5 years)
    var currentYear = new Date().getFullYear();
    bycRojYear.innerHTML = '<option value="" disabled selected>year</option>';
    for (var y = currentYear; y >= currentYear - 5; y--) {
        bycRojYear.innerHTML += '<option value="' + y + '">' + y + '</option>';
    }
}

function getDobValue() {
    var d = dobDay.value;
    var m = dobMonth.value;
    var y = dobYear.value;
    if (!d || !m || !y) return null;
    return y + '-' + String(m).padStart(2, '0') + '-' + String(d).padStart(2, '0');
}

function setDobValue(dateStr) {
    if (!dateStr) return;
    var parts = dateStr.split('-');
    dobYear.value = parseInt(parts[0]);
    dobMonth.value = parseInt(parts[1]);
    dobDay.value = parseInt(parts[2]);
}

// ─── Mobile Number Helpers ───────────────────────────────────────
function getMobileNumber() {
    var num = contactMobile.value.replace(/\s/g, '');
    if (!num) return null;
    return contactCountryCode.value + num;
}

function setMobileNumber(fullNumber) {
    if (!fullNumber) {
        contactCountryCode.value = '+91';
        contactMobile.value = '';
        return;
    }
    // Try to match country code
    var codes = ['+971', '+966', '+974', '+968', '+973', '+852', '+254', '+91', '+86', '+81', '+65', '+64', '+61', '+49', '+44', '+33', '+27', '+1'];
    for (var i = 0; i < codes.length; i++) {
        if (fullNumber.startsWith(codes[i])) {
            contactCountryCode.value = codes[i];
            contactMobile.value = fullNumber.slice(codes[i].length);
            return;
        }
    }
    contactCountryCode.value = '+91';
    contactMobile.value = fullNumber;
}

// ─── Toast ───────────────────────────────────────────────────────
function showToast(message, duration) {
    toastEl.textContent = message;
    toastEl.classList.add('show');
    setTimeout(function () {
        toastEl.classList.remove('show');
    }, duration || 2500);
}

// ─── Auth ────────────────────────────────────────────────────────
function signInWithGoogle() {
    var redirectUrl = window.location.origin + window.location.pathname;
    supabaseClient.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: redirectUrl }
    }).then(function (result) {
        if (result.error) {
            showToast('sign in failed: ' + result.error.message);
        }
    });
}

function signOut() {
    supabaseClient.auth.signOut().then(function () {
        currentUser = null;
        userSettings = null;
        contacts = [];
        showAuthSection();
        showToast('signed out');
    }).catch(function (err) {
        console.error('Sign out error:', err);
        showToast('sign out failed');
    });
}

function showAuthSection() {
    authSection.style.display = 'flex';
    appSection.style.display = 'none';
}

function showAppSection(user) {
    currentUser = user;
    authSection.style.display = 'none';
    appSection.style.display = 'block';
    var name = user.user_metadata && user.user_metadata.full_name
        ? user.user_metadata.full_name
        : user.email;
    userNameEl.textContent = name;
}

// ─── User Settings ───────────────────────────────────────────────
async function loadUserSettings() {
    var result = await supabaseClient
        .from('user_settings')
        .select('*')
        .eq('user_id', currentUser.id)
        .single();

    if (result.error && result.error.code === 'PGRST116') {
        // First-time user — show onboarding modal
        isFirstLogin = true;
        showOnboardingModal();
        return;
    } else if (result.error) {
        showToast('failed to load settings');
        return;
    } else {
        userSettings = result.data;
    }

    populateSettingsUI();
    updateCalendarFeedUI();
}

function showOnboardingModal() {
    onboardingModal.style.display = 'flex';
}

async function saveOnboardingSettings() {
    var data = {
        user_id: currentUser.id,
        calendar_type: document.getElementById('onboard-calendar-type').value,
        reminder_timing: document.getElementById('onboard-reminder-timing').value,
        remind_on_roj_birthday: document.getElementById('onboard-remind-roj').checked,
        remind_on_actual_birthday: document.getElementById('onboard-remind-actual').checked
    };

    var insertResult = await supabaseClient
        .from('user_settings')
        .insert(data)
        .select()
        .single();

    if (insertResult.error) {
        showToast('failed to save settings');
        return;
    }

    userSettings = insertResult.data;
    isFirstLogin = false;
    onboardingModal.style.display = 'none';
    populateSettingsUI();
    updateCalendarFeedUI();
    showToast('welcome to roj wisher!');
}

function populateSettingsUI() {
    calendarTypeSelect.value = userSettings.calendar_type;
    reminderTimingSelect.value = userSettings.reminder_timing;
    remindRojCheckbox.checked = userSettings.remind_on_roj_birthday;
    remindActualCheckbox.checked = userSettings.remind_on_actual_birthday;
}

async function saveUserSettings() {
    var updates = {
        calendar_type: calendarTypeSelect.value,
        reminder_timing: reminderTimingSelect.value,
        remind_on_roj_birthday: remindRojCheckbox.checked,
        remind_on_actual_birthday: remindActualCheckbox.checked
    };

    var result = await supabaseClient
        .from('user_settings')
        .update(updates)
        .eq('user_id', currentUser.id);

    if (result.error) {
        showToast('failed to save settings');
        return;
    }

    Object.assign(userSettings, updates);
    showToast('settings saved');
    renderContacts();
}

function updateCalendarFeedUI() {
    if (!userSettings || !userSettings.calendar_token) return;

    var feedBase = SUPABASE_URL + '/functions/v1/calendar-feed';
    var feedUrl = feedBase + '?token=' + userSettings.calendar_token;
    var webcalUrl = feedUrl.replace('https://', 'webcal://');

    appleSubscribeLink.href = webcalUrl;
    googleSubscribeLink.href = 'https://calendar.google.com/calendar/render?cid=' + encodeURIComponent(webcalUrl);

    // Show both calendar options on all devices
    appleSubscribeLink.style.display = 'inline-flex';
    googleSubscribeLink.style.display = 'inline-flex';

    // Check if user has already subscribed (stored in localStorage)
    var subscribed = localStorage.getItem('rojWisherCalSubscribed_' + currentUser.id);
    if (subscribed) {
        calendarSubscribedNote.style.display = 'block';
    }
}

function markCalendarSubscribed() {
    localStorage.setItem('rojWisherCalSubscribed_' + currentUser.id, 'true');
    calendarSubscribedNote.style.display = 'block';
}

// ─── Contacts CRUD ───────────────────────────────────────────────
function loadContacts() {
    return supabaseClient
        .from('contacts')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('name')
        .then(function (result) {
            if (result.error) {
                showToast('failed to load contacts');
                return;
            }
            contacts = result.data || [];
            renderContacts();
        });
}

function addContact(data) {
    data.user_id = currentUser.id;
    return supabaseClient
        .from('contacts')
        .insert(data)
        .select()
        .single()
        .then(function (result) {
            if (result.error) {
                console.error('addContact error:', result.error);
                showToast('failed to add contact: ' + result.error.message);
                throw new Error(result.error.message);
            }
            showToast(data.name + ' added');
            return loadContacts();
        });
}

function updateContact(id, data) {
    return supabaseClient
        .from('contacts')
        .update(data)
        .eq('id', id)
        .eq('user_id', currentUser.id)
        .then(function (result) {
            if (result.error) {
                showToast('failed to update contact');
                throw new Error(result.error.message);
            }
            showToast('contact updated');
            return loadContacts();
        });
}

function deleteContact(id, name) {
    if (!confirm('delete ' + name + '?')) return;

    supabaseClient
        .from('contacts')
        .delete()
        .eq('id', id)
        .eq('user_id', currentUser.id)
        .then(function (result) {
            if (result.error) {
                showToast('failed to delete contact');
                return;
            }
            showToast(name + ' deleted');
            return loadContacts();
        });
}

// ─── Roj Calculation ─────────────────────────────────────────────
function calculateContactRojInfo(contact) {
    var calType = userSettings ? userSettings.calendar_type : 'S';
    var dob = new Date(contact.date_of_birth + 'T12:00:00');
    var hour = contact.before_sunrise ? 5 : 12;

    var rojDate = getParsiDateForGregorian(
        dob.getFullYear(), dob.getMonth() + 1, dob.getDate(), hour, calType
    );

    if (!rojDate) {
        return { rojName: '—', mahName: '—', daysToRoj: null, daysToActual: null };
    }

    var rojName = RojToText(rojDate.roj);
    var mahName = MonthToText(rojDate.mah);

    var today = new Date();
    today.setHours(0, 0, 0, 0);
    var nextRojDate = findNextRojBirthday(rojDate.roj, rojDate.mah, calType, today);
    var daysToRoj = null;
    if (nextRojDate) {
        nextRojDate.setHours(0, 0, 0, 0);
        daysToRoj = Math.round((nextRojDate - today) / (1000 * 60 * 60 * 24));
    }

    var thisYear = today.getFullYear();
    var nextActual = new Date(thisYear, dob.getMonth(), dob.getDate());
    nextActual.setHours(0, 0, 0, 0);
    if (nextActual < today) {
        nextActual = new Date(thisYear + 1, dob.getMonth(), dob.getDate());
    }
    if (dob.getMonth() === 1 && dob.getDate() === 29) {
        while (!isLeapYearCheck(nextActual.getFullYear())) {
            nextActual = new Date(nextActual.getFullYear() + 1, 1, 29);
        }
    }
    nextActual.setHours(0, 0, 0, 0);
    var daysToActual = Math.round((nextActual - today) / (1000 * 60 * 60 * 24));

    return { rojName: rojName, mahName: mahName, daysToRoj: daysToRoj, daysToActual: daysToActual, nextRojDate: nextRojDate, nextActualDate: nextActual };
}

function isLeapYearCheck(year) {
    return (year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0));
}

// ─── UI Rendering ────────────────────────────────────────────────
function renderContacts() {
    // Show/hide calendar section based on contacts
    calendarSection.style.display = contacts.length > 0 ? 'block' : 'none';

    if (contacts.length === 0) {
        emptyState.style.display = 'block';
        contactsTbody.innerHTML = '';
        contactsCards.innerHTML = '';
        return;
    }

    emptyState.style.display = 'none';

    var enriched = contacts.map(function (c) {
        var info = calculateContactRojInfo(c);
        return { contact: c, info: info };
    });

    enriched.sort(function (a, b) {
        var da = a.info.daysToRoj != null ? a.info.daysToRoj : 9999;
        var db = b.info.daysToRoj != null ? b.info.daysToRoj : 9999;
        return da - db;
    });

    renderTable(enriched);
    renderCards(enriched);
}

function formatDate(dateStr) {
    var d = new Date(dateStr + 'T12:00:00');
    var months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun',
                  'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    return d.getDate() + ' ' + months[d.getMonth()] + ' ' + d.getFullYear();
}

function formatDateObj(d) {
    if (!d) return '—';
    var months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun',
                  'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    return d.getDate() + ' ' + months[d.getMonth()];
}

function daysBadgeHtml(days) {
    if (days === null || days === undefined) return '<span class="days-badge">—</span>';
    if (days === 0) return '<span class="days-badge today">today</span>';
    if (days <= 7) return '<span class="days-badge soon">' + days + 'd</span>';
    return '<span class="days-badge">' + days + 'd</span>';
}

function renderTable(enriched) {
    var html = '';
    for (var i = 0; i < enriched.length; i++) {
        var c = enriched[i].contact;
        var info = enriched[i].info;
        html += '<tr>';
        html += '<td style="color:#fff; font-weight:500;">' + escapeHtml(c.name) + '</td>';
        html += '<td>' + formatDate(c.date_of_birth) + '</td>';
        html += '<td>' + c.event_type + '</td>';
        html += '<td><span class="roj-name">' + info.rojName + '</span>, mah ' + info.mahName + '</td>';
        html += '<td>' + daysBadgeHtml(info.daysToRoj) + '</td>';
        html += '<td>' + daysBadgeHtml(info.daysToActual) + '</td>';
        html += '<td>' + (c.mobile_number ? escapeHtml(c.mobile_number) : '—') + '</td>';
        html += '<td><div class="actions-cell">';
        html += '<button class="action-btn" onclick="openEditModal(\'' + c.id + '\')">edit</button>';
        html += '<button class="action-btn delete" onclick="deleteContact(\'' + c.id + '\', \'' + escapeHtml(c.name).replace(/'/g, "\\'") + '\')">delete</button>';
        html += '</div></td>';
        html += '</tr>';
    }
    contactsTbody.innerHTML = html;
}

function renderCards(enriched) {
    var html = '';
    for (var i = 0; i < enriched.length; i++) {
        var c = enriched[i].contact;
        var info = enriched[i].info;

        html += '<div class="contact-card">';

        // Top row: name/sub on left, dates on right
        html += '<div class="card-top-row">';
        html += '<div class="card-left">';
        html += '<div class="card-name">' + escapeHtml(c.name) + '</div>';
        html += '<div class="card-sub">' + formatDate(c.date_of_birth) + ' · ' + c.event_type + '</div>';
        html += '<div class="card-roj-info">roj <span class="card-roj-value">' + info.rojName + ', mah ' + info.mahName + '</span></div>';
        html += '</div>';
        html += '<div class="card-right">';
        if (info.daysToRoj !== null) {
            var rojToday = info.daysToRoj === 0;
            html += '<div class="card-date-line' + (rojToday ? ' today' : '') + '"><span class="card-date-label">roj</span> <span class="card-date-val">' + (rojToday ? 'today!' : formatDateObj(info.nextRojDate)) + '</span></div>';
        }
        var actualToday = info.daysToActual === 0;
        html += '<div class="card-date-line' + (actualToday ? ' today' : '') + '"><span class="card-date-label">' + c.event_type + '</span> <span class="card-date-val">' + (actualToday ? 'today!' : formatDateObj(info.nextActualDate)) + '</span></div>';
        html += '</div>';
        html += '</div>';

        // Actions
        html += '<div class="card-actions">';
        html += '<button class="action-btn" onclick="openEditModal(\'' + c.id + '\')">edit</button>';
        html += '<button class="action-btn delete" onclick="deleteContact(\'' + c.id + '\', \'' + escapeHtml(c.name).replace(/'/g, "\\'") + '\')">delete</button>';
        html += '</div>';

        html += '</div>';
    }
    contactsCards.innerHTML = html;
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ─── Modal ───────────────────────────────────────────────────────
function openAddModal() {
    modalTitle.textContent = 'add contact';
    contactIdInput.value = '';
    contactForm.reset();
    dobDay.value = '';
    dobMonth.value = '';
    dobYear.value = '';
    contactCountryCode.value = '+91';
    isSaving = false;
    // Reset birth year helper
    dontKnowYearCheckbox.checked = false;
    bycSection.style.display = 'none';
    bycRojDay.value = '';
    bycRojMonth.value = '';
    bycRojYear.value = '';
    bycResult.style.display = 'none';
    bycError.style.display = 'none';
    contactModal.style.display = 'flex';
}

function openEditModal(id) {
    var contact = contacts.find(function (c) { return c.id === id; });
    if (!contact) return;

    modalTitle.textContent = 'edit contact';
    contactIdInput.value = contact.id;
    contactNameInput.value = contact.name;
    setDobValue(contact.date_of_birth);
    contactBeforeSunrise.checked = contact.before_sunrise;
    contactEventType.value = contact.event_type;
    setMobileNumber(contact.mobile_number);
    isSaving = false; // reset in case it got stuck
    contactModal.style.display = 'flex';
}

function closeModal() {
    contactModal.style.display = 'none';
    contactForm.reset();
    contactIdInput.value = '';
    // Reset birth year helper
    dontKnowYearCheckbox.checked = false;
    bycSection.style.display = 'none';
    bycRojDay.value = '';
    bycRojMonth.value = '';
    bycRojYear.value = '';
    bycResult.style.display = 'none';
    bycError.style.display = 'none';
}

// ─── Event Listeners ─────────────────────────────────────────────
googleLoginBtn.addEventListener('click', function (e) {
    e.preventDefault();
    signInWithGoogle();
});
signOutBtn.addEventListener('click', signOut);

settingsToggle.addEventListener('click', function () {
    var isHidden = settingsContent.style.display === 'none';
    settingsContent.style.display = isHidden ? 'grid' : 'none';
});

calendarTypeSelect.addEventListener('change', saveUserSettings);
reminderTimingSelect.addEventListener('change', saveUserSettings);
remindRojCheckbox.addEventListener('change', saveUserSettings);
remindActualCheckbox.addEventListener('change', saveUserSettings);

addContactBtn.addEventListener('click', openAddModal);
modalClose.addEventListener('click', closeModal);

contactModal.addEventListener('click', function (e) {
    if (e.target === contactModal) closeModal();
});

onboardSaveBtn.addEventListener('click', saveOnboardingSettings);

// Strip spaces from mobile number as user types
contactMobile.addEventListener('input', function () {
    contactMobile.value = contactMobile.value.replace(/\s/g, '');
});

var isSaving = false;
function handleContactSave() {
    if (isSaving) return;
    isSaving = true;

    try {
        var dobValue = getDobValue();
        if (!contactNameInput.value.trim() || !dobValue) {
            showToast('name and date are required');
            isSaving = false;
            return;
        }

        var data = {
            name: contactNameInput.value.trim(),
            date_of_birth: dobValue,
            before_sunrise: contactBeforeSunrise.checked,
            event_type: contactEventType.value,
            mobile_number: getMobileNumber()
        };

        var editId = contactIdInput.value;
        var savePromise;
        if (editId) {
            savePromise = updateContact(editId, data);
        } else {
            savePromise = addContact(data);
        }

        savePromise.then(function () {
            closeModal();
        }).catch(function (err) {
            console.error('Save error:', err);
            showToast('something went wrong');
        }).finally(function () {
            isSaving = false;
        });
    } catch (err) {
        console.error('handleContactSave error:', err);
        showToast('something went wrong');
        isSaving = false;
    }
}

document.querySelector('#contact-form .submit-btn').addEventListener('click', function (e) {
    e.preventDefault();
    handleContactSave();
});

// Calendar subscribe — handle navigation manually for iOS compatibility
appleSubscribeLink.addEventListener('click', function (e) {
    e.preventDefault();
    if (appleSubscribeLink.href && appleSubscribeLink.href !== '#') {
        window.location.href = appleSubscribeLink.href;
        markCalendarSubscribed();
    }
});
googleSubscribeLink.addEventListener('click', function (e) {
    e.preventDefault();
    if (googleSubscribeLink.href && googleSubscribeLink.href !== '#') {
        window.open(googleSubscribeLink.href, '_blank');
        markCalendarSubscribed();
    }
});

// ─── Pick from Phone Contacts (in-modal) ────────────────────────
var contactPickerBtn = document.getElementById('contact-picker-btn');

// Show picker button only if Contact Picker API is supported (Android Chrome)
if ('contacts' in navigator && 'ContactsManager' in window) {
    contactPickerBtn.classList.add('visible');
}

contactPickerBtn.addEventListener('click', function () {
    if (!('contacts' in navigator)) {
        showToast('not supported on this device');
        return;
    }

    navigator.contacts.select(['name', 'tel'], { multiple: false }).then(function (selected) {
        if (!selected || selected.length === 0) return;

        var c = selected[0];
        var name = (c.name && c.name.length > 0) ? c.name[0] : '';
        var phone = (c.tel && c.tel.length > 0) ? c.tel[0] : '';

        // Prefill name if empty
        if (name && !contactNameInput.value.trim()) {
            contactNameInput.value = name;
        }

        // Prefill phone number
        if (phone) {
            var cleaned = phone.replace(/[\s\-()]/g, '');
            setMobileNumber(cleaned);
        }

        showToast('contact picked — now add their date');
    }).catch(function (err) {
        if (err.name !== 'TypeError') {
            console.error('Contact picker error:', err);
        }
    });
});

// ─── Birth Year Helper ──────────────────────────────────────────
dontKnowYearCheckbox.addEventListener('change', function () {
    bycSection.style.display = this.checked ? 'block' : 'none';
    if (!this.checked) {
        bycRojDay.value = '';
        bycRojMonth.value = '';
        bycRojYear.value = '';
        bycResult.style.display = 'none';
        bycError.style.display = 'none';
    }
});

function isLeapYearCheck(y) {
    return (y % 4 === 0 && y % 100 !== 0) || (y % 400 === 0);
}

bycCheckBtn.addEventListener('click', function () {
    var bdayDay = parseInt(dobDay.value);
    var bdayMonth = parseInt(dobMonth.value);
    var rojDay = parseInt(bycRojDay.value);
    var rojMonth = parseInt(bycRojMonth.value);
    var rojYear = parseInt(bycRojYear.value);

    // Validate birthday day + month are set
    if (!bdayDay || !bdayMonth) {
        bycError.textContent = 'please fill in the birthday day and month first';
        bycError.style.display = 'block';
        bycResult.style.display = 'none';
        return;
    }

    // Validate roj date fields
    if (!rojDay || !rojMonth || !rojYear) {
        bycError.textContent = 'please fill in all three roj birthday fields';
        bycError.style.display = 'block';
        bycResult.style.display = 'none';
        return;
    }

    bycError.style.display = 'none';

    var calType = userSettings ? userSettings.calendar_type : 'S';
    var currentYear = new Date().getFullYear();

    // Get the target roj/mah from the roj celebration date
    var targetParsi = getParsiDateForGregorian(rojYear, rojMonth, rojDay, 12, calType);
    if (!targetParsi) {
        bycError.textContent = 'could not calculate parsi date for the given roj birthday';
        bycError.style.display = 'block';
        bycResult.style.display = 'none';
        return;
    }

    var targetRoj = targetParsi.roj;
    var targetMah = targetParsi.mah;
    var matches = [];

    // Backtrack: check every year from 1930 to current year
    for (var y = 1930; y <= currentYear; y++) {
        // Skip feb 29 for non-leap years
        if (bdayMonth === 2 && bdayDay === 29 && !isLeapYearCheck(y)) continue;
        var result = getParsiDateForGregorian(y, bdayMonth, bdayDay, 12, calType);
        if (result && result.roj === targetRoj && result.mah === targetMah) {
            matches.push(y);
        }
    }

    if (matches.length === 0) {
        bycError.textContent = 'no matching birth years found — double-check the dates';
        bycError.style.display = 'block';
        bycResult.style.display = 'none';
        return;
    }

    // Auto-select the highest (youngest) year
    var youngest = matches[matches.length - 1];
    var oldest = matches[0];
    dobYear.value = youngest;

    // Show result
    if (matches.length === 1) {
        bycResultText.innerHTML = 'birth year: <strong>' + youngest + '</strong>';
    } else {
        bycResultText.innerHTML = 'could be born between <strong>' + oldest + '</strong> and <strong>' + youngest + '</strong> — we\'ve picked <strong>' + youngest + '</strong><br><span style="color:#999; font-size:0.75rem; font-style:italic;">kaanse amthi age nai vadhaarvaani 😄</span>';
    }
    bycResult.style.display = 'block';
    showToast('birth year set to ' + youngest);
});

// ─── Pull to Refresh ────────────────────────────────────────────
(function () {
    var scrollEl = document.getElementById('main-content');
    var pullIndicator = document.getElementById('pull-indicator');
    var pullText = pullIndicator.querySelector('.pull-text');
    var startY = 0;
    var currentY = 0;
    var pulling = false;
    var refreshing = false;
    var threshold = 80;

    scrollEl.addEventListener('touchstart', function (e) {
        if (refreshing) return;
        if (scrollEl.scrollTop <= 0) {
            startY = e.touches[0].clientY;
            pulling = true;
        }
    }, { passive: true });

    scrollEl.addEventListener('touchmove', function (e) {
        if (!pulling || refreshing) return;
        currentY = e.touches[0].clientY;
        var dy = currentY - startY;
        if (dy > 0 && scrollEl.scrollTop <= 0) {
            pullIndicator.classList.add('pulling');
            pullText.textContent = dy > threshold ? 'release to refresh' : 'pull to refresh';
        } else {
            pullIndicator.classList.remove('pulling');
        }
    }, { passive: true });

    scrollEl.addEventListener('touchend', function () {
        if (!pulling || refreshing) return;
        var dy = currentY - startY;
        pulling = false;
        currentY = 0;

        if (dy > threshold && pullIndicator.classList.contains('pulling')) {
            pullIndicator.classList.remove('pulling');
            pullIndicator.classList.add('refreshing');
            pullText.textContent = 'refreshing...';
            refreshing = true;

            if (currentUser) {
                loadContacts().then(function () {
                    pullIndicator.classList.remove('refreshing');
                    refreshing = false;
                    showToast('refreshed');
                }).catch(function () {
                    pullIndicator.classList.remove('refreshing');
                    refreshing = false;
                });
            } else {
                window.location.reload();
            }
        } else {
            pullIndicator.classList.remove('pulling');
        }
    });
})();

// ─── Init ────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async function () {
    populateDobDropdowns();
    populateBycDropdowns();

    var sessionResult = await supabaseClient.auth.getSession();
    var session = sessionResult.data && sessionResult.data.session;

    if (session) {
        showAppSection(session.user);
        await loadUserSettings();
        if (!isFirstLogin) await loadContacts();
    }

    supabaseClient.auth.onAuthStateChange(async function (event, session) {
        if (event === 'SIGNED_IN' && session) {
            showAppSection(session.user);
            await loadUserSettings();
            if (!isFirstLogin) await loadContacts();
        } else if (event === 'SIGNED_OUT') {
            showAuthSection();
        }
    });

    // ─── Stale Page Recovery (iOS Safari) ─────────────────────────
    // iOS suspends tabs and restores them from bfcache — connections die,
    // buttons stop working. We track when the page was last active and
    // force a full reload if it's been dormant too long.

    var lastActiveTime = Date.now();

    // pageshow fires on bfcache restore (visibilitychange does not on iOS)
    window.addEventListener('pageshow', function (e) {
        if (e.persisted) {
            // Page was restored from bfcache — force full reload
            window.location.reload();
            return;
        }
    });

    // Track when the page goes hidden
    document.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'hidden') {
            lastActiveTime = Date.now();
            return;
        }

        // Page became visible again
        var elapsed = Date.now() - lastActiveTime;

        // If dormant for more than 2 minutes, force reload — connections are dead
        if (elapsed > 2 * 60 * 1000) {
            window.location.reload();
            return;
        }

        // Short absence — just re-check the session
        supabaseClient.auth.getSession().then(function (result) {
            var session = result.data && result.data.session;
            if (session && session.user) {
                currentUser = session.user;
                loadContacts();
            } else if (currentUser) {
                // Session expired while away
                currentUser = null;
                userSettings = null;
                contacts = [];
                showAuthSection();
                showToast('session expired — please sign in again');
            }
        });
    });

    // Extra safety net: window focus (catches some iOS edge cases)
    window.addEventListener('focus', function () {
        var elapsed = Date.now() - lastActiveTime;
        if (elapsed > 2 * 60 * 1000) {
            window.location.reload();
        }
    });
});
