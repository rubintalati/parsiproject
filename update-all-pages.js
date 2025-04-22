/**
 * Update All Pages Script
 * 
 * This script updates all HTML pages in the project to include the include-sidebar.js script
 * and ensures the "ushta te" and roj mah date are displayed consistently.
 */

const fs = require('fs');
const path = require('path');

// Directory containing HTML pages
const pagesDir = path.join(__dirname, 'pages');

// Function to update a single HTML file
function updateHtmlFile(filePath) {
    console.log(`Updating ${filePath}...`);
    
    try {
        let content = fs.readFileSync(filePath, 'utf8');
        
        // Check if the file already includes include-sidebar.js
        if (!content.includes('include-sidebar.js')) {
            // Find the position to insert the script tag (before the closing body tag)
            const bodyCloseIndex = content.lastIndexOf('</body>');
            
            if (bodyCloseIndex !== -1) {
                // Insert the script tag
                const updatedContent = content.slice(0, bodyCloseIndex) + 
                    '    <script src="../js/include-sidebar.js"></script>\n' + 
                    content.slice(bodyCloseIndex);
                
                // Write the updated content back to the file
                fs.writeFileSync(filePath, updatedContent, 'utf8');
                console.log(`✓ Added include-sidebar.js to ${path.basename(filePath)}`);
            } else {
                console.error(`× Could not find </body> tag in ${path.basename(filePath)}`);
            }
        } else {
            console.log(`✓ ${path.basename(filePath)} already includes include-sidebar.js`);
        }
        
        // Fix combined.js loading - ensure it's loaded with defer at the end of the body
        // Remove any combined.js script from the head
        if (content.includes('<script src="../js/combined.js">') || 
            content.includes('<script src="../js/combined.js"></script>')) {
            content = content.replace(/<script src="\.\.\/js\/combined\.js">\s*<\/script>/, '');
            content = content.replace(/<script src="\.\.\/js\/combined\.js"><\/script>/, '');
        }
        
        // Add combined.js at the end of the body if it's not already there with defer
        if (!content.includes('<script src="../js/combined.js" defer></script>')) {
            const bodyCloseIndex = content.lastIndexOf('</body>');
            if (bodyCloseIndex !== -1) {
                content = content.slice(0, bodyCloseIndex) + 
                    '    <script src="../js/combined.js" defer></script>\n' + 
                    content.slice(bodyCloseIndex);
                console.log(`✓ Fixed combined.js loading in ${path.basename(filePath)}`);
            }
        }
        
        // Write the updated content back to the file
        fs.writeFileSync(filePath, content, 'utf8');
        
        // Check if the file has a container div for the sidebar
        if (!content.includes('<div class="container">')) {
            console.warn(`⚠ ${path.basename(filePath)} does not have a container div for the sidebar`);
        }
        
        // Check if the file already has a main-content div
        if (!content.includes('<div class="main-content">')) {
            console.warn(`⚠ ${path.basename(filePath)} does not have a main-content div`);
        }
    } catch (error) {
        console.error(`× Error updating ${path.basename(filePath)}: ${error.message}`);
    }
}

// Process all HTML files in the pages directory
function updateAllPages() {
    console.log('Starting to update all HTML pages...');
    
    try {
        // Get all HTML files in the pages directory
        const files = fs.readdirSync(pagesDir);
        
        // Filter for HTML files
        const htmlFiles = files.filter(file => file.endsWith('.html'));
        
        console.log(`Found ${htmlFiles.length} HTML files to update.`);
        
        // Update each HTML file
        htmlFiles.forEach(file => {
            const filePath = path.join(pagesDir, file);
            updateHtmlFile(filePath);
        });
        
        console.log('All pages updated successfully!');
    } catch (error) {
        console.error(`Error updating pages: ${error.message}`);
    }
}

// Run the update function
updateAllPages();
