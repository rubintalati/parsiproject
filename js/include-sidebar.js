/**
 * Sidebar Inclusion Script
 * 
 * This script loads the sidebar template into all pages and adds the "ushta te" 
 * and Parsi date display consistently in the top right corner.
 */

document.addEventListener('DOMContentLoaded', function() {
    // Add the header with ushta te and Parsi date if it doesn't exist
    addUshtaTeHeader();
    
    // Load the sidebar template if container exists
    loadSidebar();
    
    // Add necessary styles
    addRequiredStyles();
});

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
        <div class="header-text">ushta te</div>
        <div class="parsi-date"></div>
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
        /* Style for the header */
        .ushta-te-header {
            position: fixed; /* Keep it fixed at the top right */
            top: 1rem;
            right: 1.5rem;
            z-index: 1050; /* Ensure it's above most content but below modals */
            display: flex;
            flex-direction: column; /* Stack elements vertically */
            align-items: flex-end; /* Align text to the right */
            padding: 0.5rem;
            background-color: rgba(0, 0, 0, 0.5); /* Optional: Slight background for readability */
            border-radius: 4px; /* Optional: Rounded corners */
        }

        .header-text {
            color: #fff;
            font-size: 14px; /* Keep original size or adjust as needed */
            margin-bottom: 0.1rem; /* Small space between lines */
        }
        
        .parsi-date {
            font-size: 11px; /* Make Parsi date font smaller */
            color: rgba(255, 255, 255, 0.7); /* Slightly dimmer color */
            text-align: right;
        }

        /* Make sure sidebar is visible on mobile */
        @media (max-width: 768px) {
            .sidebar.active {
                transform: translateX(0);
            }
            
            .sidebar {
                position: fixed;
                transform: translateX(-100%);
            }
            
            .mobile-nav-toggle {
                display: block;
            }
            
            .mobile-nav-overlay.active {
                display: block;
            }
        }
    `;
    document.head.appendChild(style);
}
