/**
 * Standardized Back Button Implementation
 * 
 * This script implements a consistent back button across the entire website.
 * Features:
 * - Standardized styling (size, position, appearance)
 * - Consistent behavior (goes back in history or to home page)
 * - Automatic detection of light/dark themes
 * - Automatically injects back button if not present
 */

document.addEventListener('DOMContentLoaded', function() {
    // Create standardized back button styles
    addStandardBackButtonStyles();
    
    // Process existing back buttons to standardize them
    standardizeExistingBackButtons();
    
    // Add back button if none exists on relevant pages
    addBackButtonIfNeeded();
});

/**
 * Add standardized back button styles to head
 */
function addStandardBackButtonStyles() {
    // Check if styles are already added
    if (document.getElementById('back-button-styles')) return;
    
    const styleElement = document.createElement('style');
    styleElement.id = 'back-button-styles';
    styleElement.textContent = `
        .parsi-back-button {
            text-decoration: none !important;
            color: #222 !important;
            font-size: 24px;
            position: absolute;
            top: 15px;
            left: 15px;
            line-height: 1;
            padding: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            z-index: 10000;
            background-color: rgba(255, 255, 255, 0.2);
            border-radius: 50%;
            width: 40px;
            height: 40px;
            transition: background-color 0.2s ease;
            border: none;
            text-align: center;
        }
        
        .parsi-back-button:hover {
            background-color: rgba(255, 255, 255, 0.3);
        }
        
        .parsi-back-button-dark {
            color: #fff !important;
            background-color: rgba(0, 0, 0, 0.15);
        }
        
        .parsi-back-button-dark:hover {
            background-color: rgba(0, 0, 0, 0.25);
        }
        
        /* Make back button slightly smaller on mobile */
        @media (max-width: 768px) {
            .parsi-back-button {
                width: 35px;
                height: 35px;
                font-size: 20px;
                top: 10px;
                left: 10px;
            }
        }
    `;
    
    document.head.appendChild(styleElement);
}

/**
 * Standardize all existing back buttons
 */
function standardizeExistingBackButtons() {
    // Find all existing back buttons with various selectors
    const backButtons = document.querySelectorAll('#back-button, .back-button, .back-symbol, [aria-label="Back"], a[href="#"][onclick*="history.back"]');
    
    backButtons.forEach(button => {
        // Add standard class
        button.classList.add('parsi-back-button');
        
        // Check if we need dark theme based on background
        detectAndApplyTheme(button);
        
        // Ensure it has the back arrow symbol
        if (!button.textContent.trim() || button.textContent === '←') {
            button.innerHTML = '&#8592;';
        }
        
        // Ensure it has the correct functionality
        button.onclick = handleBackButtonClick;
    });
}

/**
 * Add back button to pages if needed
 */
function addBackButtonIfNeeded() {
    // Skip adding back button on main pages
    const skipPaths = ['index.html', 'home.html', 'all-prayers.html'];
    const currentPath = window.location.pathname.split('/').pop();
    
    if (skipPaths.includes(currentPath)) return;
    
    // If no back button exists, add one
    const existingBackButtons = document.querySelectorAll('.parsi-back-button');
    if (existingBackButtons.length === 0) {
        // Create back button element
        const backButton = document.createElement('a');
        backButton.href = '#';
        backButton.classList.add('parsi-back-button');
        backButton.innerHTML = '&#8592;';
        backButton.setAttribute('aria-label', 'Back');
        backButton.onclick = handleBackButtonClick;
        
        // Detect theme
        detectAndApplyTheme(backButton);
        
        // Find a suitable container
        const container = document.querySelector('main, .main-content, .container, body');
        container.style.position = container.style.position || 'relative';
        container.insertBefore(backButton, container.firstChild);
    }
}

/**
 * Handle back button click event
 */
function handleBackButtonClick(e) {
    e.preventDefault();
    
    // Try to go back in history
    if (window.history.length > 1) {
        window.history.back();
    } else {
        // If no history, go to home page
        const isInSubfolder = window.location.pathname.split('/').length > 2;
        window.location.href = isInSubfolder ? '../home.html' : 'home.html';
    }
    
    return false;
}

/**
 * Detect page theme and apply appropriate styling
 */
function detectAndApplyTheme(button) {
    // Check background color to determine theme
    const bodyBg = getComputedStyle(document.body).backgroundColor;
    const isDarkTheme = isLightColor(bodyBg);
    
    if (isDarkTheme) {
        button.classList.add('parsi-back-button-dark');
    } else {
        button.classList.remove('parsi-back-button-dark');
    }
}

/**
 * Check if a color is light (to determine if we need dark text)
 */
function isLightColor(color) {
    // Handle rgba format
    if (color.startsWith('rgba')) {
        const parts = color.match(/[\d.]+/g);
        if (parts && parts.length >= 3) {
            const [r, g, b] = parts.map(Number);
            // Calculate perceived brightness
            return (r * 0.299 + g * 0.587 + b * 0.114) > 128;
        }
    }
    
    // Handle rgb format
    if (color.startsWith('rgb')) {
        const parts = color.match(/\d+/g);
        if (parts && parts.length >= 3) {
            const [r, g, b] = parts.map(Number);
            // Calculate perceived brightness
            return (r * 0.299 + g * 0.587 + b * 0.114) > 128;
        }
    }
    
    // Handle hex and named colors
    if (color === '#fff' || color === '#ffffff' || color === 'white') {
        return true;
    }
    
    // Default to false for unknown colors
    return false;
}
