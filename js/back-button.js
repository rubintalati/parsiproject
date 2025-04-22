/**
 * Back Button Handler
 * 
 * This script handles the back button functionality for prayer pages.
 * It uses window.history.back() to navigate to the previous page.
 * If there's no previous page in history, it redirects to the home page.
 */

document.addEventListener('DOMContentLoaded', function() {
    const backButton = document.getElementById('back-button');
    
    if (backButton) {
        backButton.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Try to go back in history
            if (window.history.length > 1) {
                window.history.back();
            } else {
                // If no history, go to index page
                window.location.href = '../index.html';
            }
        });
    }
});
