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
    
    // Store the current page's scroll position
    const scrollPosition = window.scrollY || document.documentElement.scrollTop;
    
    // Fade in
    requestAnimationFrame(() => {
        transitionOverlay.style.opacity = '1';
        
        // After fade completes, update page content
        setTimeout(() => {
            // Parse the cached HTML
            const parser = new DOMParser();
            const newDoc = parser.parseFromString(cachedPage.content, 'text/html');
            
            // Save scripts to execute after content is updated
            const scriptNodes = newDoc.querySelectorAll('script');
            const scripts = Array.from(scriptNodes).map(script => {
                return {
                    src: script.src,
                    text: script.textContent,
                    attributes: Array.from(script.attributes).reduce((attrs, attr) => {
                        if (attr.name !== 'src' && attr.name !== 'data-executed') {
                            attrs[attr.name] = attr.value;
                        }
                        return attrs;
                    }, {})
                };
            });
            
            // Replace the page content
            document.documentElement.innerHTML = newDoc.documentElement.innerHTML;
            
            // Complete the navigation by updating history
            window.history.pushState({}, '', url);
            
            // Manually re-execute scripts in order
            executeScriptsInOrder(scripts).then(() => {
                // If the page has a DOMContentLoaded event handler, trigger it
                const event = new Event('DOMContentLoaded');
                document.dispatchEvent(event);
                
                // If there's a window.onload handler, trigger it too
                const loadEvent = new Event('load');
                window.dispatchEvent(loadEvent);
                
                // Dispatch a custom event for sidebar persistence to know navigation is complete
                const navCompleteEvent = new Event('preloaderNavigationComplete');
                document.dispatchEvent(navCompleteEvent);
                
                // Ensure combined.js has executed properly by checking if sidebar exists
                setTimeout(() => {
                    const sidebar = document.querySelector('.sidebar');
                    if (!sidebar && typeof loadSidebar === 'function') {
                        // If sidebar is missing but loadSidebar function exists, call it
                        loadSidebar();
                    }
                }, 100);
                
                // Remove the overlay after the new page is ready
                transitionOverlay.remove();
                
                // Reset scroll position to top
                window.scrollTo(0, 0);
            });
        }, 200);
    });
}

// Execute scripts in order (external first, then inline)
async function executeScriptsInOrder(scripts) {
    // First, identify and load external scripts
    const externalScripts = scripts.filter(script => script.src);
    const inlineScripts = scripts.filter(script => !script.src);
    
    // Load external scripts sequentially
    for (const script of externalScripts) {
        await new Promise((resolve, reject) => {
            const scriptEl = document.createElement('script');
            
            // Add all attributes
            Object.entries(script.attributes).forEach(([name, value]) => {
                scriptEl.setAttribute(name, value);
            });
            
            // Set load handlers
            scriptEl.onload = () => {
                console.log(`Loaded script: ${script.src}`);
                resolve();
            };
            scriptEl.onerror = () => {
                console.error(`Failed to load script: ${script.src}`);
                resolve(); // Resolve anyway to continue with other scripts
            };
            
            // Set src last to start loading
            scriptEl.src = script.src;
            document.body.appendChild(scriptEl);
        });
    }
    
    // Then execute inline scripts
    for (const script of inlineScripts) {
        const scriptEl = document.createElement('script');
        
        // Add all attributes
        Object.entries(script.attributes).forEach(([name, value]) => {
            scriptEl.setAttribute(name, value);
        });
        
        // Add the script content
        scriptEl.textContent = script.text;
        
        // Append to trigger execution
        document.body.appendChild(scriptEl);
    }
}

// Execute scripts from dynamically loaded content
function executeScripts() {
    // Find all scripts in the document
    const scripts = document.querySelectorAll('script:not([data-executed="true"])');
    
    // Process scripts in order, prioritizing external scripts first
    const externalScripts = [];
    const inlineScripts = [];
    
    scripts.forEach(script => {
        if (script.src) {
            externalScripts.push(script);
        } else {
            inlineScripts.push(script);
        }
    });
    
    // Execute external scripts first, then inline scripts
    const executeInOrder = async () => {
        // Execute external scripts sequentially
        for (const oldScript of externalScripts) {
            await loadExternalScript(oldScript);
        }
        
        // Then execute inline scripts
        inlineScripts.forEach(oldScript => {
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
    };
    
    executeInOrder();
}

// Load an external script and return a promise that resolves when it's loaded
function loadExternalScript(oldScript) {
    return new Promise((resolve, reject) => {
        const newScript = document.createElement('script');
        
        // Copy all attributes except src (we'll set that separately to trigger loading)
        Array.from(oldScript.attributes).forEach(attr => {
            if (attr.name !== 'src') {
                newScript.setAttribute(attr.name, attr.value);
            }
        });
        
        // Mark as executed to prevent re-execution
        newScript.setAttribute('data-executed', 'true');
        
        // Set up load and error handlers
        newScript.onload = () => resolve();
        newScript.onerror = () => {
            console.error(`Failed to load script: ${oldScript.src}`);
            resolve(); // Resolve anyway to continue with other scripts
        };
        
        // Set the src last to begin loading
        newScript.src = oldScript.src;
        
        // Replace the old script with the new one
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
