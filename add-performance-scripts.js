/**
 * Add Performance Scripts to All Pages
 * 
 * This script adds the page preloader and media optimizer scripts to all HTML pages
 * in the project to improve site-wide performance.
 */

const fs = require('fs');
const path = require('path');

// Configuration
const config = {
  // Root directory to scan for HTML files
  rootDir: path.resolve(__dirname, 'pages'),
  
  // Performance script tags to inject before </head>
  scriptTags: `
    <!-- Performance optimization scripts -->
    <script defer src="/js/page-preloader.js"></script>
    <script defer src="/js/media-optimizer.js"></script>
  `,
  
  // Whether to modify files that already have the scripts
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
 * Process an HTML file to add the performance scripts
 */
function processHtmlFile(filePath) {
  try {
    // Read the file content
    const fileContent = fs.readFileSync(filePath, 'utf8');
    
    // Check if the file already has the performance scripts
    if (!config.forceUpdate && fileContent.includes('page-preloader.js')) {
      console.log(`Skipping (already has scripts): ${filePath}`);
      filesSkipped++;
      return;
    }
    
    // Create backup if enabled
    if (config.createBackups) {
      const backupPath = `${filePath}.bak`;
      fs.writeFileSync(backupPath, fileContent, 'utf8');
    }
    
    // Insert the script tags before </head>
    const updatedContent = fileContent.replace('</head>', `${config.scriptTags}\n</head>`);
    
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

// Create the js directory if it doesn't exist
const jsDir = path.join(__dirname, 'js');
if (!fs.existsSync(jsDir)) {
  console.log('Creating js directory...');
  fs.mkdirSync(jsDir);
}

// Main execution
console.log(`Starting to add performance scripts to HTML files in ${config.rootDir}...`);
console.log(`Scripts to add: ${config.scriptTags.trim()}`);

// Start the scan
scanDirectory(config.rootDir);

// Print summary
console.log('\nSummary:');
console.log(`Files processed: ${filesProcessed}`);
console.log(`Files updated: ${filesUpdated}`);
console.log(`Files skipped: ${filesSkipped}`);
console.log(`Errors: ${errors}`);

console.log('\nDone!');
