/**
 * Enhanced Screen Orientation Lock
 * Implements multiple approaches to prevent auto-rotation on mobile devices
 * Uses both the standard Screen Orientation API and CSS/meta tag fallbacks
 */

(function() {
    // Run immediately and also on DOMContentLoaded
    initOrientationLock();
    document.addEventListener('DOMContentLoaded', initOrientationLock);
    
    // Also handle orientation changes
    window.addEventListener('orientationchange', function() {
        // Reapply lock after orientation has changed
        setTimeout(initOrientationLock, 100);
    });
    
    /**
     * Initialize orientation lock using multiple approaches for better compatibility
     */
    function initOrientationLock() {
        // Only apply on mobile devices
        if (!isMobileDevice()) return;
        
        // 1. Use Screen Orientation API (modern browsers)
        useScreenOrientationAPI();
        
        // 2. Add viewport meta tag with orientation lock (fallback)
        addViewportMetaWithOrientationLock();
        
        // 3. Use CSS to enforce orientation (additional fallback)
        addCssOrientationLock();
        
        // 4. Use Full Screen API to help enforce orientation lock
        if (document.documentElement.requestFullscreen) {
            document.documentElement.requestFullscreen();
        }
    }
    
    /**
     * Check if device is mobile
     */
    function isMobileDevice() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
               window.matchMedia("(max-width: 768px)").matches;
    }
    
    /**
     * Try to use the standard Screen Orientation API
     */
    function useScreenOrientationAPI() {
        if (window.screen && window.screen.orientation && window.screen.orientation.lock) {
            try {
                // Detect current orientation
                const currentOrientation = getCurrentOrientation();
                
                // Lock to current orientation
                window.screen.orientation.lock(currentOrientation).catch(function(error) {
                    console.log('Screen orientation lock API failed:', error);
                    // Try again with different method
                    tryAlternativeLockMethods(currentOrientation);
                });
            } catch (error) {
                console.log('Screen orientation API error:', error);
                // Try alternative locking methods
                tryAlternativeLockMethods(getCurrentOrientation());
            }
        } else if (window.screen && window.screen.lockOrientation) {
            // For older Firefox
            try {
                window.screen.lockOrientation(getCurrentOrientation());
            } catch (e) {
                console.log('Firefox orientation lock failed:', e);
            }
        } else if (window.screen && window.screen.mozLockOrientation) {
            // For older Mozilla
            try {
                window.screen.mozLockOrientation(getCurrentOrientation());
            } catch (e) {
                console.log('Mozilla orientation lock failed:', e);
            }
        } else if (window.screen && window.screen.msLockOrientation) {
            // For older IE/Edge
            try {
                window.screen.msLockOrientation(getCurrentOrientation());
            } catch (e) {
                console.log('MS orientation lock failed:', e);
            }
        }
    }
    
    /**
     * Try alternative locking methods for iOS and other systems
     */
    function tryAlternativeLockMethods(orientation) {
        // Force layout to maintain orientation
        const isPortrait = orientation.includes('portrait');
        
        // Set body dimensions to force orientation
        if (isPortrait) {
            document.body.style.width = '100vw';
            document.body.style.height = '100vh';
        } else {
            document.body.style.width = '100vh';
            document.body.style.height = '100vw';
        }
    }
    
    /**
     * Get current orientation
     */
    function getCurrentOrientation() {
        if (window.screen && window.screen.orientation && window.screen.orientation.type) {
            return window.screen.orientation.type.includes('portrait') ? 'portrait' : 'landscape';
        } else if (window.orientation !== undefined) {
            return (window.orientation === 0 || window.orientation === 180) ? 'portrait' : 'landscape';
        } else if (window.innerHeight > window.innerWidth) {
            return 'portrait';
        } else {
            return 'landscape';
        }
    }
    
    /**
     * Add viewport meta tag with orientation lock
     */
    function addViewportMetaWithOrientationLock() {
        // Check if meta viewport exists
        let viewport = document.querySelector('meta[name="viewport"]');
        
        if (!viewport) {
            // Create if not exists
            viewport = document.createElement('meta');
            viewport.setAttribute('name', 'viewport');
            document.head.appendChild(viewport);
        }
        
        // Set viewport to include orientation lock
        const orientation = getCurrentOrientation();
        viewport.setAttribute('content', 
            'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, ' + 
            'viewport-fit=cover, orientation=' + orientation);
    }
    
    /**
     * Add CSS to help enforce orientation lock
     */
    function addCssOrientationLock() {
        // Check if our style element already exists
        if (document.getElementById('orientation-lock-style')) return;
        
        // Create style element
        const style = document.createElement('style');
        style.id = 'orientation-lock-style';
        
        // Get current orientation
        const isPortrait = getCurrentOrientation() === 'portrait';
        
        // Create CSS that makes it awkward to use in wrong orientation
        style.textContent = isPortrait ? 
            // For portrait lock
            `@media screen and (orientation: landscape) {
                html, body {
                    transform: rotate(-90deg);
                    transform-origin: left top;
                    width: 100vh;
                    height: 100vw;
                    overflow: hidden;
                    position: fixed;
                    top: 100%;
                    left: 0;
                }
            }` :
            // For landscape lock
            `@media screen and (orientation: portrait) {
                html, body {
                    transform: rotate(90deg);
                    transform-origin: left top;
                    width: 100vh;
                    height: 100vw;
                    overflow: hidden;
                    position: fixed;
                    top: 0;
                    left: 100%;
                }
            }`;
        
        // Add to head
        document.head.appendChild(style);
    }
})();
