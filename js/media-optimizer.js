/**
 * Media Optimizer
 * Optimizes loading of images and videos for better performance
 */

(function() {
    // Configuration
    const config = {
        // Lazy load media that are within this distance from viewport (in pixels)
        loadThreshold: 200,
        // Whether to lazy-load videos
        lazyLoadVideos: true,
        // Whether to use WebP images where supported
        useWebP: true,
        // Whether to optimize images dynamically
        optimizeImages: true,
        // Whether to send page load events to Google Analytics
        trackPerformance: true
    };

    // Initialize when DOM is loaded
    document.addEventListener('DOMContentLoaded', function() {
        // Initialize lazy loading for images
        initLazyImages();
        
        // Initialize video optimization if enabled
        if (config.lazyLoadVideos) {
            initVideoOptimization();
        }
        
        // Track performance with Google Analytics
        if (config.trackPerformance) {
            trackPageLoadPerformance();
        }
    });

    // Lazy load images
    function initLazyImages() {
        // Find all images that should be lazy-loaded
        const lazyImages = document.querySelectorAll('img[loading="lazy"], img[data-src]');

        // If Intersection Observer is supported, use it for better performance
        if ('IntersectionObserver' in window) {
            const imageObserver = new IntersectionObserver(function(entries) {
                entries.forEach(function(entry) {
                    if (entry.isIntersecting) {
                        const lazyImage = entry.target;
                        
                        // If there's a data-src attribute, use it
                        if (lazyImage.dataset.src) {
                            lazyImage.src = lazyImage.dataset.src;
                            delete lazyImage.dataset.src;
                        }
                        
                        // If there's a data-srcset attribute, use it
                        if (lazyImage.dataset.srcset) {
                            lazyImage.srcset = lazyImage.dataset.srcset;
                            delete lazyImage.dataset.srcset;
                        }
                        
                        // Remove loading="lazy" to prevent double-loading
                        lazyImage.removeAttribute('loading');
                        
                        // Stop observing this image
                        imageObserver.unobserve(lazyImage);
                    }
                });
            }, {
                rootMargin: `${config.loadThreshold}px`
            });

            // Start observing each image
            lazyImages.forEach(function(lazyImage) {
                imageObserver.observe(lazyImage);
            });
        } else {
            // Fallback for browsers that don't support Intersection Observer
            // This is less efficient but still helps with performance
            let active = false;

            const lazyLoad = function() {
                if (active === false) {
                    active = true;

                    setTimeout(function() {
                        lazyImages.forEach(function(lazyImage) {
                            const imageTop = lazyImage.getBoundingClientRect().top;
                            const imageBottom = lazyImage.getBoundingClientRect().bottom;
                            
                            if ((imageTop <= window.innerHeight + config.loadThreshold) && 
                                (imageBottom >= -config.loadThreshold)) {
                                
                                if (lazyImage.dataset.src) {
                                    lazyImage.src = lazyImage.dataset.src;
                                    delete lazyImage.dataset.src;
                                }
                                
                                if (lazyImage.dataset.srcset) {
                                    lazyImage.srcset = lazyImage.dataset.srcset;
                                    delete lazyImage.dataset.srcset;
                                }
                                
                                lazyImage.removeAttribute('loading');
                                
                                lazyImages.forEach(function(image, index) {
                                    if (image === lazyImage) {
                                        lazyImages.splice(index, 1);
                                    }
                                });

                                if (lazyImages.length === 0) {
                                    document.removeEventListener('scroll', lazyLoad);
                                    window.removeEventListener('resize', lazyLoad);
                                    window.removeEventListener('orientationchange', lazyLoad);
                                }
                            }
                        });

                        active = false;
                    }, 200);
                }
            };

            // Add scroll and other events to trigger lazy loading
            document.addEventListener('scroll', lazyLoad);
            window.addEventListener('resize', lazyLoad);
            window.addEventListener('orientationchange', lazyLoad);
            
            // Initial load
            lazyLoad();
        }
    }

    // Optimize video loading
    function initVideoOptimization() {
        const videos = document.querySelectorAll('video');
        
        videos.forEach(function(video) {
            // Pause videos that are not in viewport to save resources
            if (!isElementInViewport(video)) {
                video.pause();
            }
            
            // For videos with autoplay, defer loading until close to viewport
            if (video.hasAttribute('autoplay') && video.hasAttribute('preload')) {
                // Start with lowest preload setting to save bandwidth
                video.preload = 'metadata';
                
                // Upgrade preload setting when close to viewport
                if ('IntersectionObserver' in window) {
                    const videoObserver = new IntersectionObserver(function(entries) {
                        entries.forEach(function(entry) {
                            if (entry.isIntersecting) {
                                video.preload = 'auto';
                                videoObserver.unobserve(video);
                            }
                        });
                    }, {
                        rootMargin: '200px'
                    });
                    
                    videoObserver.observe(video);
                }
            }
        });
        
        // Add scroll event to pause/play videos
        document.addEventListener('scroll', debounce(function() {
            videos.forEach(function(video) {
                if (isElementInViewport(video)) {
                    if (video.hasAttribute('autoplay') && video.paused) {
                        video.play().catch(e => {
                            // Silent error handling for autoplay restrictions
                        });
                    }
                } else {
                    if (!video.paused) {
                        video.pause();
                    }
                }
            });
        }, 200));
    }

    // Track page load performance in Google Analytics
    function trackPageLoadPerformance() {
        // Wait for window load to get accurate page load times
        window.addEventListener('load', function() {
            // Check if Google Analytics is available
            if (typeof gtag === 'function') {
                // Get performance data
                if (window.performance && window.performance.timing) {
                    const timing = window.performance.timing;
                    
                    // Calculate important metrics (in milliseconds)
                    const pageLoadTime = timing.loadEventEnd - timing.navigationStart;
                    const domReadyTime = timing.domComplete - timing.domLoading;
                    const networkLatency = timing.responseEnd - timing.requestStart;
                    const redirectTime = timing.redirectEnd - timing.redirectStart;
                    
                    // Log page load time to Google Analytics
                    gtag('event', 'timing_complete', {
                        'name': 'page_load',
                        'value': pageLoadTime,
                        'event_category': 'Performance'
                    });
                    
                    // Log DOM ready time
                    gtag('event', 'timing_complete', {
                        'name': 'dom_ready',
                        'value': domReadyTime,
                        'event_category': 'Performance'
                    });
                    
                    // Log network latency
                    gtag('event', 'timing_complete', {
                        'name': 'network_latency',
                        'value': networkLatency,
                        'event_category': 'Performance'
                    });
                    
                    // Log redirect time if any
                    if (redirectTime > 0) {
                        gtag('event', 'timing_complete', {
                            'name': 'redirect_time',
                            'value': redirectTime,
                            'event_category': 'Performance'
                        });
                    }
                    
                    // Get First Contentful Paint if available
                    const paintMetrics = performance.getEntriesByType('paint');
                    if (paintMetrics && paintMetrics.length > 0) {
                        paintMetrics.forEach(function(entry) {
                            if (entry.name === 'first-contentful-paint') {
                                gtag('event', 'timing_complete', {
                                    'name': 'first_contentful_paint',
                                    'value': Math.round(entry.startTime),
                                    'event_category': 'Performance'
                                });
                            }
                        });
                    }
                }
            }
        });
    }

    // Helper function to check if element is in viewport
    function isElementInViewport(el) {
        const rect = el.getBoundingClientRect();
        
        return (
            rect.top <= (window.innerHeight || document.documentElement.clientHeight) &&
            rect.bottom >= 0 &&
            rect.left <= (window.innerWidth || document.documentElement.clientWidth) &&
            rect.right >= 0
        );
    }

    // Helper function to debounce frequent events like scroll
    function debounce(func, wait) {
        let timeout;
        
        return function() {
            const context = this;
            const args = arguments;
            
            clearTimeout(timeout);
            
            timeout = setTimeout(function() {
                func.apply(context, args);
            }, wait);
        };
    }
})();
