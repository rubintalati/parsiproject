/**
 * Sidebar Persistence
 * 
 * This script ensures the sidebar remains visible and functional throughout 
 * page scrolling and navigation events. It protects against accidental DOM
 * manipulations that might remove or hide the sidebar.
 */

(function() {
    // Configuration
    const config = {
        // How often to check if sidebar exists (in milliseconds)
        checkInterval: 500,
        // Maximum number of times to attempt sidebar restore
        maxRestoreAttempts: 5,
        // Debug mode
        debug: false
    };

    // Track restore attempts
    let restoreAttempts = 0;
    
    // Reference to the interval
    let sidebarCheckInterval = null;
    
    // Store original sidebar HTML for restoration if needed
    let originalSidebarHTML = '';
    
    // Flag to prevent sidebar reload during navigation
    let isNavigating = false;

    // Initialize when DOM is ready
    document.addEventListener('DOMContentLoaded', function() {
        initSidebarProtection();
    });

    // Main initialization function
    function initSidebarProtection() {
        // Wait for sidebar to be available before setting up protection
        const waitForSidebar = setInterval(function() {
            const sidebar = document.querySelector('.sidebar');
            
            if (sidebar) {
                clearInterval(waitForSidebar);
                
                // Store original sidebar for potential restoration
                originalSidebarHTML = sidebar.outerHTML;
                
                // Start monitoring the sidebar
                startSidebarMonitoring();
                
                // Set up scroll and navigation event protection
                setupScrollProtection();
                setupNavigationProtection();
                
                if (config.debug) {
                    console.log('[Sidebar Protection] Initialized');
                }
            }
        }, 200);
    }

    // Start continuous monitoring of sidebar existence
    function startSidebarMonitoring() {
        if (sidebarCheckInterval) {
            clearInterval(sidebarCheckInterval);
        }
        
        sidebarCheckInterval = setInterval(function() {
            verifySidebarExists();
        }, config.checkInterval);
    }

    // Verify sidebar exists and is visible
    function verifySidebarExists() {
        const sidebar = document.querySelector('.sidebar');
        
        if (!sidebar && !isNavigating) {
            // Sidebar is missing - attempt to restore it
            restoreSidebar();
        } else if (sidebar) {
            // Check if sidebar is hidden
            const sidebarStyle = window.getComputedStyle(sidebar);
            
            if (sidebarStyle.display === 'none' || sidebarStyle.visibility === 'hidden' || 
                sidebarStyle.opacity === '0' || parseInt(sidebarStyle.opacity) === 0) {
                
                // Sidebar is hidden - make it visible
                sidebar.style.display = '';
                sidebar.style.visibility = '';
                sidebar.style.opacity = '';
                
                if (config.debug) {
                    console.log('[Sidebar Protection] Restored sidebar visibility');
                }
            }
            
            // Reset restore attempts if sidebar exists
            restoreAttempts = 0;
        }
    }

    // Restore the sidebar if it's missing
    function restoreSidebar() {
        if (restoreAttempts >= config.maxRestoreAttempts) {
            // Too many failed attempts, try reloading combined.js instead
            loadCombinedJs();
            restoreAttempts = 0;
            return;
        }
        
        try {
            // Find container
            const container = document.querySelector('.container');
            
            if (container && originalSidebarHTML) {
                // Insert the original sidebar at the beginning of the container
                container.insertAdjacentHTML('afterbegin', originalSidebarHTML);
                
                // Re-initialize sidebar functionality
                if (typeof setActiveSidebarLink === 'function') {
                    setActiveSidebarLink();
                }
                
                if (typeof setupMobileNavigation === 'function') {
                    setupMobileNavigation();
                }
                
                if (config.debug) {
                    console.log('[Sidebar Protection] Sidebar restored');
                }
            } else {
                // If container doesn't exist, try to load combined.js
                loadCombinedJs();
            }
        } catch (error) {
            console.error('[Sidebar Protection] Error restoring sidebar:', error);
        }
        
        restoreAttempts++;
    }

    // Load combined.js script
    function loadCombinedJs() {
        // Check if combined.js is already loaded
        if (!document.querySelector('script[src*="combined.js"]')) {
            const script = document.createElement('script');
            script.src = '/js/combined.js';
            document.body.appendChild(script);
            
            if (config.debug) {
                console.log('[Sidebar Protection] Reloaded combined.js');
            }
        }
    }

    // Set up protection during scrolling
    function setupScrollProtection() {
        // Use passive event listener to not block scrolling performance
        window.addEventListener('scroll', function() {
            // Use requestAnimationFrame to avoid excessive checks during rapid scrolling
            requestAnimationFrame(function() {
                verifySidebarExists();
            });
        }, { passive: true });
    }
    
    // Set up protection during navigation events
    function setupNavigationProtection() {
        // Listen for navigation events
        document.addEventListener('click', function(e) {
            // Check if clicked element is a link
            const link = e.target.closest('a');
            
            if (link && link.href && link.href.indexOf(window.location.origin) === 0) {
                // Internal link clicked
                isNavigating = true;
                
                // Reset flag after navigation should be complete
                setTimeout(function() {
                    isNavigating = false;
                }, 1000);
            }
        });
        
        // Handle history navigation events
        window.addEventListener('popstate', function() {
            isNavigating = true;
            setTimeout(function() {
                isNavigating = false;
            }, 1000);
        });
    }
    
    // Also listen for when our preloader has completed a navigation
    document.addEventListener('preloaderNavigationComplete', function() {
        // Wait a bit for scripts to execute
        setTimeout(function() {
            verifySidebarExists();
        }, 300);
    });
})();
