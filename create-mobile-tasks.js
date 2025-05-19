/**
 * Script to create mobile responsiveness review tasks
 * This will add tasks to review and improve mobile responsiveness across all pages
 */

const fs = require('fs');
const path = require('path');
const taskmaster = require('./taskmaster');

// Initialize TaskMaster
taskmaster.initialize();

// Define page categories for organization
const pageCategories = {
  'index.html': 'Core Pages',
  'pages/home.html': 'Core Pages',
  'pages/all-prayers.html': 'Core Pages',
  'pages/glossary.html': 'Core Pages',
  
  'pages/daily prayers/': 'Daily Prayer Pages',
  'pages/allprayerpages/': 'All Prayer Pages',
  
  'pages/death/': 'Death Ritual Pages',
  'pages/death-rituals.html': 'Death Ritual Pages',
  
  'pages/wedding/': 'Wedding Pages',
  'pages/wedding-rituals.html': 'Wedding Pages',
  
  'pages/navjote/': 'Navjote Pages',
  'pages/navjote-ceremony.html': 'Navjote Pages',
  
  'pages/jashan-ceremony.html': 'Other Ceremonies',
};

// Priority mapping based on importance
function getPagePriority(filePath) {
  // Core pages are highest priority
  if (filePath === 'index.html' || filePath === 'pages/home.html') {
    return 'High';
  }
  
  // Main category pages are high priority
  if (filePath.endsWith('-rituals.html') || filePath === 'pages/all-prayers.html') {
    return 'High';
  }
  
  // Sub-pages are medium priority
  return 'Medium';
}

// Get category for a page
function getPageCategory(filePath) {
  for (const [pattern, category] of Object.entries(pageCategories)) {
    if (filePath.startsWith(pattern)) {
      return category;
    }
  }
  return 'Other Pages';
}

// Get a user-friendly page name
function getPageDisplayName(filePath) {
  const filename = path.basename(filePath);
  return filename
    .replace('.html', '')
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Create tasks for mobile responsiveness review
function createMobileResponsivenessTasks() {
  // Get all HTML files
  function getAllHtmlFiles(dir, fileList = []) {
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        getAllHtmlFiles(filePath, fileList);
      } else if (file.endsWith('.html')) {
        // Skip component files
        if (!filePath.includes('components') && !filePath.includes('templates')) {
          const relativePath = filePath.replace(__dirname + path.sep, '').replace(/\\/g, '/');
          fileList.push(relativePath);
        }
      }
    });
    
    return fileList;
  }
  
  const htmlFiles = getAllHtmlFiles(__dirname);
  
  // Create a mobile responsiveness review task for each page
  htmlFiles.forEach(file => {
    const pageName = getPageDisplayName(file);
    const category = getPageCategory(file);
    const priority = getPagePriority(file);
    
    taskmaster.addTask({
      title: `Review mobile responsiveness for ${pageName}`,
      description: `Check ${file} for mobile responsiveness issues. Verify that:\n1. Layout adapts properly to mobile screens\n2. Text is readable on small screens\n3. Navigation works on mobile\n4. Images are responsive\n5. Touch targets are adequate size\n6. No horizontal scrolling occurs`,
      category,
      priority,
      assignee: 'Parsi Project Team'
    });
  });
  
  // Create general mobile enhancement tasks
  const generalTasks = [
    {
      title: 'Create mobile-first media query strategy',
      description: 'Define a consistent approach for media queries across the site. This should include standard breakpoints and a mobile-first methodology.',
      category: 'Mobile Enhancement',
      priority: 'High'
    },
    {
      title: 'Optimize images for mobile devices',
      description: 'Implement responsive images using srcset or picture elements where appropriate. Ensure images load quickly on mobile connections.',
      category: 'Mobile Enhancement',
      priority: 'Medium'
    },
    {
      title: 'Improve touch target sizes',
      description: 'Ensure all interactive elements are at least 44x44px on mobile views for better touch accessibility.',
      category: 'Mobile Enhancement',
      priority: 'Medium'
    },
    {
      title: 'Create mobile navigation enhancement',
      description: 'Improve the mobile navigation experience with better transitions, clearer indicators, and optimized touch areas.',
      category: 'Mobile Enhancement',
      priority: 'High'
    },
    {
      title: 'Test site on multiple mobile devices',
      description: 'Test the site on various mobile devices and browsers to ensure consistent experience.',
      category: 'Testing',
      priority: 'High'
    }
  ];
  
  // Add general tasks
  generalTasks.forEach(task => {
    taskmaster.addTask(task);
  });
  
  console.log(`Created mobile responsiveness tasks for ${htmlFiles.length} pages and ${generalTasks.length} general tasks.`);
}

// Run the task creation
createMobileResponsivenessTasks();
