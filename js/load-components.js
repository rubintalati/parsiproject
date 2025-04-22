/**
 * The Parsi Project Component Loader
 * Allows dynamic loading of HTML components across pages
 */

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Load components with the data-component attribute
    loadComponents();
});

/**
 * Loads all components marked with data-component attribute
 */
function loadComponents() {
    // Find all elements with the data-component attribute
    const componentElements = document.querySelectorAll('[data-component]');
    
    // For each element, load the corresponding component
    componentElements.forEach(element => {
        const componentName = element.getAttribute('data-component');
        loadComponent(element, componentName);
    });
}

/**
 * Loads a specific component into a target element
 * @param {HTMLElement} targetElement - The element to load the component into
 * @param {string} componentName - The name of the component to load
 */
function loadComponent(targetElement, componentName) {
    // Create the path to the component file
    const componentPath = `/components/${componentName}.html`;
    
    // Fetch the component HTML
    fetch(componentPath)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Failed to load component: ${componentName}`);
            }
            return response.text();
        })
        .then(html => {
            // Insert the component HTML into the target element
            targetElement.innerHTML = html;
        })
        .catch(error => {
            console.error(error);
            targetElement.innerHTML = `<div class="component-error">Error loading component: ${componentName}</div>`;
        });
}
