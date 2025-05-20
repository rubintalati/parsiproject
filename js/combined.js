/**
 * Combined JavaScript for The Parsi Project
 * 
 * This file combines:
 * 1. Parsi date calculator
 * 2. Sidebar inclusion
 * 3. User authentication integration
 */

/**************************************
 * PARSI DATE CALCULATOR
 **************************************/

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

// Function to update Parsi date on the page - exposed globally for use by sidebar code
function updateParsiDate() {
    const parsiDateElements = document.querySelectorAll('.parsi-date');
    if (parsiDateElements.length === 0) return;
    
    const parsiDate = getTodaysParsiDate();
    if (!parsiDate) return;
    
    // Get the text names for Roj and Mah
    const rojName = RojToText(parsiDate.roj);
    const mahName = MonthToText(parsiDate.mah);
    
    // Format the date as requested: "RojName, mah MahName, YYYY yz"
    const dateString = `${rojName}, mah ${mahName}, ${parsiDate.year} yz`;
    
    parsiDateElements.forEach(element => {
        element.textContent = dateString;
    });
}

/**************************************
 * SIDEBAR INCLUSION
 **************************************/

// Function to add the ushta te header to the page
function addUshtaTeHeader() {
    // Check if header already exists
    if (document.querySelector('.ushta-te-header')) {
        return;
    }
    
    // Create the header element
    const header = document.createElement('div');
    header.className = 'ushta-te-header';
    header.innerHTML = `
        <div class="ushta-te-title">ushta te</div>
        <div class="ushta-te-date parsi-date"></div>
    `;
    
    // Find the best place to add the header
    let targetContainer = document.querySelector('.main-content') || document.body;
    targetContainer.prepend(header); // Add header to the top of the container

    // Explicitly update the Parsi date after adding the header, deferred slightly
    setTimeout(() => {
        if (typeof updateParsiDate === 'function') {
            updateParsiDate();
        } else {
            console.warn('Parsi date update function (updateParsiDate) not found after short delay.');
        }
    }, 0); // Delay of 0ms defers execution until the stack is clear
}

// Function to load the sidebar template
function loadSidebar() {
    // Check if sidebar already exists
    if (document.querySelector('.sidebar')) {
        return;
    }
    
    // Find or create container
    let container = document.querySelector('.container');
    
    if (!container) {
        // Create container if it doesn't exist
        container = document.createElement('div');
        container.className = 'container';
        
        // Move all body content into the container
        const bodyContent = Array.from(document.body.children);
        document.body.appendChild(container);
        
        bodyContent.forEach(element => {
            if (element !== container) {
                container.appendChild(element);
            }
        });
    }
    
    // Load sidebar template
    fetch('../templates/sidebar-template.html')
        .then(response => response.text())
        .then(html => {
            // Insert the sidebar template at the beginning of the container
            container.insertAdjacentHTML('afterbegin', html);
            
            // Set the active link in the sidebar based on the current page
            setActiveSidebarLink();
            
            // Setup mobile navigation
            setupMobileNavigation();
        })
        .catch(error => {
            console.error('Error loading sidebar template:', error);
        });
}

// Function to set the active link in the sidebar
function setActiveSidebarLink() {
    const currentPage = window.location.pathname.split('/').pop();
    const navLinks = document.querySelectorAll('.sidebar a');
    
    navLinks.forEach(link => {
        const linkHref = link.getAttribute('href');
        if (linkHref === currentPage) {
            link.classList.add('active');
        }
    });
}

// Function to setup mobile navigation
function setupMobileNavigation() {
    const mobileNavToggle = document.querySelector('.mobile-nav-toggle');
    const mobileNavOverlay = document.querySelector('.mobile-nav-overlay');
    const sidebar = document.querySelector('.sidebar');
    
    if (mobileNavToggle && mobileNavOverlay && sidebar) {
        mobileNavToggle.addEventListener('click', function() {
            sidebar.classList.toggle('active');
            mobileNavOverlay.classList.toggle('active');
        });
        
        mobileNavOverlay.addEventListener('click', function() {
            sidebar.classList.remove('active');
            mobileNavOverlay.classList.remove('active');
        });
    }
}

// Function to add required styles
function addRequiredStyles() {
    if (document.querySelector('style#ushta-te-header-styles')) {
        return;
    }
    
    const style = document.createElement('style');
    style.id = 'ushta-te-header-styles';
    style.textContent = `
        /* Ushta Te Header Modern Design - Smaller Font */
        .ushta-te-header {
            position: fixed;
            top: 1.2rem;
            right: 1.5rem;
            z-index: 1050;
            display: flex;
            flex-direction: column;
            align-items: flex-end;
            background: none;
            box-sizing: border-box;
        }
        .ushta-te-title {
            font-size: 1rem;
            font-weight: 700;
            color: #fff;
            letter-spacing: 0.07em;
            text-align: right;
            line-height: 1.1;
        }
        .ushta-te-date {
            font-size: 0.8rem;
            font-weight: 500;
            color: #fff;
            opacity: 0.65;
            margin-top: 0.06em;
            text-align: right;
            line-height: 1.1;
            letter-spacing: 0.01em;
        }
        @media (max-width: 768px) {
            .ushta-te-header {
                right: 0.7rem;
                top: 0.7rem;
            }
            .ushta-te-title {
                font-size: 0.85rem;
            }
            .ushta-te-date {
                font-size: 0.7rem;
            }
        }
        /* Modal styles */
        .modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: rgba(0, 0, 0, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
        }
        
        .onboarding-modal {
            background-color: #121212;
            border-radius: 8px;
            padding: 24px;
            width: 90%;
            max-width: 400px;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
            animation: modalAppear 0.3s ease-out;
        }
        
        @keyframes modalAppear {
            from {
                opacity: 0;
                transform: translateY(20px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        
        .modal-header {
            margin-bottom: 20px;
        }
        
        .modal-header h2 {
            font-size: 1.5rem;
            margin-bottom: 8px;
        }
        
        .modal-body {
            display: flex;
            flex-direction: column;
            gap: 16px;
        }
        
        .input-group {
            display: flex;
            gap: 10px;
        }
        
        .input-group input {
            flex: 1;
            padding: 10px;
            border-radius: 4px;
            border: 1px solid #333;
            background-color: #222;
            color: white;
        }
        
        .avatar-selection {
            display: flex;
            justify-content: space-between;
            gap: 10px;
            margin: 10px 0;
        }
        
        .avatar-option {
            width: 50px;
            height: 50px;
            border-radius: 50%;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: transform 0.2s;
        }
        
        .avatar-option:nth-child(1) { background-color: rgba(255, 255, 255, 0.8); }
        .avatar-option:nth-child(2) { background-color: rgba(255, 200, 100, 0.8); }
        .avatar-option:nth-child(3) { background-color: rgba(100, 200, 255, 0.8); }
        .avatar-option:nth-child(4) { background-color: rgba(200, 100, 200, 0.8); }
        
        .avatar-option.selected {
            transform: scale(1.2);
            box-shadow: 0 0 10px rgba(255, 255, 255, 0.5);
        }
        
        .identity-selection {
            display: flex;
            justify-content: space-between;
            gap: 10px;
        }
        
        .identity-btn {
            flex: 1;
            padding: 10px;
            border: 1px solid #333;
            border-radius: 4px;
            background-color: #222;
            color: white;
            cursor: pointer;
            transition: all 0.2s ease;
        }
        
        .identity-btn.selected {
            background-color: #555;
            border-color: #888;
        }
        
        .note {
            font-size: 0.8rem;
            opacity: 0.7;
            text-align: center;
            margin: 5px 0;
        }
        
        #submitBtn {
            padding: 12px;
            border: none;
            border-radius: 4px;
            background-color: #e67e22;
            color: white;
            font-weight: bold;
            cursor: pointer;
            margin-top: 10px;
            transition: background-color 0.2s;
        }
        
        #submitBtn:hover:not([disabled]) {
            background-color: #d35400;
        }
        
        #submitBtn[disabled] {
            opacity: 0.5;
            cursor: not-allowed;
        }
        
        .sync-container {
            margin-top: 15px;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
            padding-top: 15px;
        }
        
        .sync-button {
            background: linear-gradient(90deg, #2b803c, #47a558);
            color: white;
            border: none;
            padding: 10px 15px;
            border-radius: 4px;
            cursor: pointer;
            width: 100%;
            transition: all 0.3s;
        }
        
        .sync-button:hover {
            background: linear-gradient(90deg, #339549, #54b967);
        }
        
        /* Larger logo in sidebar */
        .sidebar .logo-container {
            width: 90px !important;
            height: 90px !important;
            border: none !important;
            box-shadow: none !important;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 2rem;
        }
        .sidebar .logo-image {
            width: 100% !important;
            height: 100% !important;
            object-fit: contain;
            filter: none !important;
            box-shadow: none !important;
        }
        /* Remove logo glow and border */
        .sidebar .logo-container {
            border: none !important;
            box-shadow: none !important;
        }
        .sidebar .logo-image {
            filter: none !important;
            box-shadow: none !important;
        }
    `;
    document.head.appendChild(style);
}

// Update sidebar profile from localStorage (used by all pages with combined.js)
function updateSidebarProfileFromStorage() {
    const user = JSON.parse(localStorage.getItem('parsiUser') || '{}');
    // Defaults
    const avatarBasePath = '../media/logo/avatar/';
    const defaultAvatarFile = 'cartoon dog.png';
    const defaultAvatar = avatarBasePath + defaultAvatarFile;
    const defaultName = 'guest';
    const defaultGender = 'parsi person';

    // Sidebar elements
    const avatarImg = document.getElementById('sidebar-profile-avatar-img-tag');
    const nameElem = document.getElementById('sidebar-profile-name');
    const genderElem = document.getElementById('sidebar-profile-gender');

    if (avatarImg) {
        // Only use the filename from localStorage
        if (user.avatar) {
            avatarImg.src = avatarBasePath + user.avatar;
        } else {
            avatarImg.src = defaultAvatar;
        }
    }
    if (nameElem) {
        nameElem.textContent = (user.firstName || defaultName).toLowerCase();
    }
    if (genderElem) {
        genderElem.textContent = user.gender || defaultGender;
    }
}

// Listen for changes to parsiUser in localStorage (cross-tab sync)
window.addEventListener('storage', function(e) {
    if (e.key === 'parsiUser') {
        updateSidebarProfileFromStorage();
    }
});

document.addEventListener('DOMContentLoaded', function() {
    updateSidebarProfileFromStorage();
});

// Also update after sidebar is injected
function setupSidebarProfileObserver() {
    const sidebar = document.querySelector('.sidebar');
    if (!sidebar) return;
    const observer = new MutationObserver(function() {
        updateSidebarProfileFromStorage();
    });
    observer.observe(sidebar, { childList: true, subtree: true });
    // Run once initially
    updateSidebarProfileFromStorage();
}

document.addEventListener('DOMContentLoaded', function() {
    setupSidebarProfileObserver();
});

// Attach click/keyboard handler to sidebar profile details after sidebar is loaded
function setupSidebarProfileDetailsClick() {
    var sidebarProfileDetails = document.getElementById('sidebar-profile-details');
    if (sidebarProfileDetails) {
        sidebarProfileDetails.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('Sidebar profile details clicked, navigating to my-account.html');
            window.location.href = './my-account.html';
        });
        sidebarProfileDetails.tabIndex = 0;
        sidebarProfileDetails.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                console.log('Sidebar profile details keyboard nav, navigating to my-account.html');
                window.location.href = './my-account.html';
            }
        });
        // Ensure pointer events are enabled
        sidebarProfileDetails.style.pointerEvents = 'auto';
    } else {
        console.log('sidebar-profile-details not found yet');
    }
}

// After sidebar is loaded, set up the handler
function observeSidebarProfileDetails() {
    const sidebar = document.querySelector('.sidebar');
    if (!sidebar) {
        // Try again when DOM changes
        const bodyObserver = new MutationObserver(function() {
            const sidebarNow = document.querySelector('.sidebar');
            if (sidebarNow) {
                observeSidebarProfileDetails();
                bodyObserver.disconnect();
            }
        });
        bodyObserver.observe(document.body, { childList: true, subtree: true });
        return;
    }
    const observer = new MutationObserver(function() {
        setupSidebarProfileDetailsClick();
    });
    observer.observe(sidebar, { childList: true, subtree: true });
    // Also run once in case it's already there
    setupSidebarProfileDetailsClick();
}

document.addEventListener('DOMContentLoaded', function() {
    observeSidebarProfileDetails();
    
    // Prevent screen orientation changes (disable auto-rotation)
    if (window.screen && window.screen.orientation) {
        try {
            // Lock to portrait or current orientation if available
            const currentOrientation = window.screen.orientation.type;
            const lockOrientation = currentOrientation.includes('portrait') ? 'portrait' : 'landscape';
            
            window.screen.orientation.lock(lockOrientation).catch(function(error) {
                console.log('Screen orientation lock failed:', error);
            });
        } catch (error) {
            console.log('Screen orientation API not fully supported:', error);
        }
    }
});

// Make letter spacing for 'ushta te' tighter on mobile
document.addEventListener('DOMContentLoaded', function() {
    const ushtaTeTitle = document.querySelector('.ushta-te-title');
    if (ushtaTeTitle) {
        if (window.innerWidth <= 768) {
            ushtaTeTitle.style.letterSpacing = '-0.3em';
        }
    }
});

/**************************************
 * INITIALIZATION
 **************************************/

// Main initialization function
document.addEventListener('DOMContentLoaded', function() {
    // Add the header with ushta te and Parsi date if it doesn't exist
    addUshtaTeHeader();
    
    // Load the sidebar template if container exists
    loadSidebar();
    
    // Add necessary styles
    addRequiredStyles();
});
