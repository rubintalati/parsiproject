/**
 * Screen Orientation Lock
 * Prevents auto-rotation on mobile devices
 */
document.addEventListener('DOMContentLoaded', function() {
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
