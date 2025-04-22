// Script to update back button links in all prayer HTML files
const fs = require('fs');
const path = require('path');

const prayerPagesDir = path.join(__dirname, 'pages', 'allprayerpages');
const targetBackLink = '../all-prayers.html';

// Function to update back button links in HTML files
function updateBackButtonLinks(filePath) {
    try {
        let content = fs.readFileSync(filePath, 'utf8');
        
        // Replace back button links with link to all-prayers.html
        // This pattern looks for href attributes in <a> tags with class="back-button"
        const backButtonPattern = /<a\s+href=["'](?!\.\.\/all-prayers\.html)(.*?)["']\s+class=["']back-button["']/g;
        const updatedContent = content.replace(backButtonPattern, `<a href="${targetBackLink}" class="back-button"`);
        
        // Write the file back only if changes were made
        if (content !== updatedContent) {
            fs.writeFileSync(filePath, updatedContent, 'utf8');
            console.log(`Updated back button link in: ${path.basename(filePath)}`);
            return true;
        } else {
            console.log(`No changes needed in: ${path.basename(filePath)}`);
            return false;
        }
    } catch (error) {
        console.error(`Error processing file ${filePath}:`, error);
        return false;
    }
}

// Process all HTML files in the allprayerpages directory
function processAllPrayerFiles() {
    try {
        const files = fs.readdirSync(prayerPagesDir);
        let updatedCount = 0;
        
        files.forEach(file => {
            if (path.extname(file).toLowerCase() === '.html') {
                const filePath = path.join(prayerPagesDir, file);
                const updated = updateBackButtonLinks(filePath);
                if (updated) updatedCount++;
            }
        });
        
        console.log(`\nSummary: Updated back button links in ${updatedCount} out of ${files.length} files.`);
    } catch (error) {
        console.error('Error reading prayer pages directory:', error);
    }
}

// Run the script
console.log('Starting update of back button links in prayer HTML files...');
processAllPrayerFiles();
