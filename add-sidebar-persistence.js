/**
 * Add Sidebar Persistence Script to All Pages
 * 
 * This script adds the sidebar persistence script to all HTML pages
 * to ensure the navigation bar never disappears.
 */

const fs = require('fs');
const path = require('path');

// Configuration
const config = {
  // Root directory to scan for HTML files
  rootDir: path.resolve(__dirname, 'pages'),
  
  // Script tag to inject before </head>
  scriptTag: `
    <!-- Sidebar persistence script -->
    <script defer src="/js/sidebar-persistence.js"></script>
  `,
  
  // Whether to modify files that already have the script
  forceUpdate: false,
  
  // Backup files before modifying
  createBackups: true
};

// Count of processed files
let filesProcessed = 0;
let filesUpdated = 0;
let filesSkipped = 0;
let errors = 0;

/**
 * Process an HTML file to add the sidebar persistence script
 */
function processHtmlFile(filePath) {
  try {
    // Read the file content
    const fileContent = fs.readFileSync(filePath, 'utf8');
    
    // Check if the file already has the sidebar persistence script
    if (!config.forceUpdate && fileContent.includes('sidebar-persistence.js')) {
      console.log(`Skipping (already has script): ${filePath}`);
      filesSkipped++;
      return;
    }
    
    // Create backup if enabled
    if (config.createBackups) {
      const backupPath = `${filePath}.bak`;
      fs.writeFileSync(backupPath, fileContent, 'utf8');
    }
    
    // Look for the performance scripts section to add our script after it
    let updatedContent;
    if (fileContent.includes('<!-- Performance optimization scripts -->')) {
      updatedContent = fileContent.replace(
        '</script>\n  \n</head>', 
        '</script>\n    <!-- Sidebar persistence script -->\n    <script defer src="/js/sidebar-persistence.js"></script>\n  \n</head>'
      );
    } else {
      // If no performance scripts section, just add before </head>
      updatedContent = fileContent.replace('</head>', `${config.scriptTag}\n</head>`);
    }
    
    // Only update if the content changed
    if (updatedContent !== fileContent) {
      // Write the updated content back to the file
      fs.writeFileSync(filePath, updatedContent, 'utf8');
      console.log(`Updated: ${filePath}`);
      filesUpdated++;
    } else {
      console.log(`No changes needed: ${filePath}`);
      filesSkipped++;
    }
    
    filesProcessed++;
  } catch (err) {
    console.error(`Error processing ${filePath}:`, err);
    errors++;
  }
}

/**
 * Recursively scan a directory for HTML files
 */
function scanDirectory(dirPath) {
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      
      if (entry.isDirectory()) {
        // Recursively scan subdirectories
        scanDirectory(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.html')) {
        // Process HTML files
        processHtmlFile(fullPath);
      }
    }
  } catch (err) {
    console.error(`Error scanning directory ${dirPath}:`, err);
    errors++;
  }
}

// Main execution
console.log(`Starting to add sidebar persistence script to HTML files in ${config.rootDir}...`);
console.log(`Script to add: ${config.scriptTag.trim()}`);

// Start the scan
scanDirectory(config.rootDir);

// Also process the index.html file in the root directory
const indexPath = path.join(__dirname, 'index.html');
if (fs.existsSync(indexPath)) {
  console.log(`Processing root index.html...`);
  processHtmlFile(indexPath);
}

// Print summary
console.log('\nSummary:');
console.log(`Files processed: ${filesProcessed}`);
console.log(`Files updated: ${filesUpdated}`);
console.log(`Files skipped: ${filesSkipped}`);
console.log(`Errors: ${errors}`);

console.log('\nDone!');
