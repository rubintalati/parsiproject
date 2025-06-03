const fs = require('fs');
const path = require('path');
const util = require('util');
const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);

// Google Analytics snippet to insert
const analyticsSnippet = fs.readFileSync(path.join(__dirname, 'analytics-snippet.html'), 'utf8');

// Function to add analytics to a single HTML file
async function addAnalyticsToFile(filePath) {
  try {
    const content = await readFile(filePath, 'utf8');
    
    // Skip if analytics is already added
    if (content.includes('G-6DT5E4V7SQ')) {
      console.log(`Analytics already exists in ${filePath}`);
      return false;
    }
    
    // Find the head tag position
    const headTagPos = content.indexOf('<head>');
    if (headTagPos === -1) {
      console.log(`No <head> tag found in ${filePath}`);
      return false;
    }
    
    // Insert analytics right after the head tag
    const newContent = content.slice(0, headTagPos + 6) + 
                      '\n    ' + analyticsSnippet + 
                      content.slice(headTagPos + 6);
    
    // Write the modified content back to the file
    await writeFile(filePath, newContent);
    console.log(`Added analytics to ${filePath}`);
    return true;
  } catch (err) {
    console.error(`Error processing ${filePath}:`, err);
    return false;
  }
}

// Function to recursively find all HTML files in a directory
function findHtmlFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      findHtmlFiles(filePath, fileList);
    } else if (file.endsWith('.html')) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

// Main function
async function main() {
  // Get all HTML files in the pages directory
  const pagesDir = path.join(__dirname, 'pages');
  const htmlFiles = findHtmlFiles(pagesDir);
  
  console.log(`Found ${htmlFiles.length} HTML files in pages directory`);
  
  // Process each file
  let modifiedCount = 0;
  for (const file of htmlFiles) {
    const modified = await addAnalyticsToFile(file);
    if (modified) modifiedCount++;
  }
  
  console.log(`Added analytics to ${modifiedCount} files`);
}

// Run the script
main().catch(err => console.error('Error:', err));
