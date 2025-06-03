/**
 * Page Preloader - Improves transitions between pages
 * This script preloads linked pages when hovering over links and provides
 * smooth page transitions by caching resources.
 */

// Configuration
const preloadConfig = {
    // Preload when hovering for this many milliseconds
    hoverDelay: 100,
    // Maximum number of pages to keep preloaded in cache
    maxCachedPages: 5,
    // Whether to preload images on the target page
    preloadImages: true,
    // Time in ms before abandoning a preload attempt
    timeout: 3000
};

// Cache for preloaded pages
const pageCache = new Map();

// Initialize the preloader
function initPreloader() {
    // Find all links that point to other pages within the site
    const internalLinks = document.querySelectorAll('a[href^="pages/"], a[href^="/pages/"]');
    
    // Add event listeners to each link
    internalLinks.forEach(link => {
        let timer;
        
        // Preload on hover
        link.addEventListener('mouseenter', () => {
            // Start a timer for hover delay
            timer = setTimeout(() => {
                preloadPage(link.href);
            }, preloadConfig.hoverDelay);
        });
        
        // Cancel preload if mouse leaves before delay
        link.addEventListener('mouseleave', () => {
            clearTimeout(timer);
        });
        
        // For touch devices, preload on touchstart
        link.addEventListener('touchstart', () => {
            preloadPage(link.href);
        });
        
        // Enhance click transition
        link.addEventListener('click', event => {
            const url = link.href;
            
            // If we've already preloaded this page, use it
            if (pageCache.has(url)) {
                event.preventDefault();
                navigateToPage(url);
            }
        });
    });
    
    // Preload the most likely pages to be visited
    preloadInitialPages();
}

// Preload a specific page
function preloadPage(url) {
    // Don't preload if already in cache
    if (pageCache.has(url)) return;
    
    // Limit cache size by removing oldest entries
    if (pageCache.size >= preloadConfig.maxCachedPages) {
        const oldestKey = pageCache.keys().next().value;
        pageCache.delete(oldestKey);
    }
    
    // Create new entry in cache
    pageCache.set(url, { status: 'loading', content: null });
    
    // Set up timeout for the fetch operation
    const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Preload timeout')), preloadConfig.timeout);
    });
    
    // Fetch the page
    Promise.race([
        fetch(url, { credentials: 'same-origin' }),
        timeoutPromise
    ])
    .then(response => {
        if (!response.ok) throw new Error('Network response was not ok');
        return response.text();
    })
    .then(html => {
        // Store the preloaded content
        pageCache.set(url, { 
            status: 'loaded', 
            content: html 
        });
        
        // If configured to preload images, parse HTML and preload important images
        if (preloadConfig.preloadImages) {
            preloadImagesFromHTML(html, url);
        }
    })
    .catch(error => {
        console.warn('Preload failed:', error);
        // Remove failed preload from cache
        pageCache.delete(url);
    });
}

// Preload images from the HTML content
function preloadImagesFromHTML(html, baseUrl) {
    // Create a DOM parser to parse the HTML string
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    // Find important images (e.g., header images, hero images)
    const importantImages = doc.querySelectorAll('img[src^="media/"], img[src^="/media/"]');
    
    // Only preload the first few images to avoid excessive requests
    const imagesToPreload = Array.from(importantImages).slice(0, 3);
    
    // Preload each image
    imagesToPreload.forEach(img => {
        const imgUrl = new URL(img.src, baseUrl).href;
        const preloadLink = document.createElement('link');
        preloadLink.rel = 'preload';
        preloadLink.as = 'image';
        preloadLink.href = imgUrl;
        document.head.appendChild(preloadLink);
    });
}

// Navigate to a preloaded page
function navigateToPage(url) {
    // Get cached content
    const cachedPage = pageCache.get(url);
    
    if (!cachedPage || cachedPage.status !== 'loaded') {
        // If not cached or not fully loaded, navigate normally
        window.location.href = url;
        return;
    }
    
    // Create smooth transition effect
    const transitionOverlay = document.createElement('div');
    transitionOverlay.style.position = 'fixed';
    transitionOverlay.style.top = '0';
    transitionOverlay.style.left = '0';
    transitionOverlay.style.width = '100%';
    transitionOverlay.style.height = '100%';
    transitionOverlay.style.backgroundColor = '#000';
    transitionOverlay.style.zIndex = '9999';
    transitionOverlay.style.opacity = '0';
    transitionOverlay.style.transition = 'opacity 0.2s ease';
    document.body.appendChild(transitionOverlay);
    
    // Fade in
    requestAnimationFrame(() => {
        transitionOverlay.style.opacity = '1';
        
        // After fade completes, update page content
        setTimeout(() => {
            // Parse the cached HTML
            const parser = new DOMParser();
            const newDoc = parser.parseFromString(cachedPage.content, 'text/html');
            
            // Replace the page content
            document.documentElement.innerHTML = newDoc.documentElement.innerHTML;
            
            // Execute scripts in the new page
            executeScripts();
            
            // Complete the navigation by updating history
            window.history.pushState({}, '', url);
            
            // Remove the overlay after the new page is ready
            transitionOverlay.remove();
        }, 200);
    });
}

// Execute scripts from dynamically loaded content
function executeScripts() {
    // Find all scripts in the document
    const scripts = document.querySelectorAll('script:not([data-executed="true"])');
    
    scripts.forEach(oldScript => {
        const newScript = document.createElement('script');
        
        // Copy all attributes
        Array.from(oldScript.attributes).forEach(attr => {
            newScript.setAttribute(attr.name, attr.value);
        });
        
        // Mark as executed to prevent re-execution
        newScript.setAttribute('data-executed', 'true');
        
        // Copy inline content if any
        newScript.textContent = oldScript.textContent;
        
        // Replace the old script with the new one to execute it
        oldScript.parentNode.replaceChild(newScript, oldScript);
    });
}

// Preload the most likely pages to be visited
function preloadInitialPages() {
    // Get all links on the current page
    const links = document.querySelectorAll('a[href^="pages/"], a[href^="/pages/"]');
    
    // Convert to array and sort by priority (for now, just taking the first few)
    const sortedLinks = Array.from(links).slice(0, 3);
    
    // Preload each page with a delay to avoid overwhelming the browser
    sortedLinks.forEach((link, index) => {
        setTimeout(() => {
            preloadPage(link.href);
        }, index * 200); // Stagger preloading
    });
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPreloader);
} else {
    initPreloader();
}
