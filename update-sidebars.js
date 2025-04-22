// Script to update all HTML pages with consistent sidebar
const fs = require('fs');
const path = require('path');
const pagesDir = path.join(__dirname, 'pages');

// Sidebar template with placeholders for active page
const sidebarTemplate = `
        <!-- Sidebar -->
        <div class="sidebar">
            <div class="logo-container">
                <div class="logo">logo</div>
            </div>

            <div class="sidebar-section">
                <a href="home.html" {{ACTIVE_DAILY}}>daily prayers</a>
                <a href="all-prayers.html" {{ACTIVE_ALL}}>all prayers</a>
                <a href="stories.html" {{ACTIVE_STORIES}}>stories <span class="coming-soon">coming soon</span></a>
                <a href="glossary.html" {{ACTIVE_GLOSSARY}}>glossary</a>
            </div>

            <div class="sidebar-section">
                <a href="wedding-rituals.html" {{ACTIVE_WEDDING}}>wedding rituals</a>
                <a href="navjote.html" {{ACTIVE_NAVJOTE}}>navjote rituals</a>
                <a href="jashan-ceremony.html" {{ACTIVE_JASHAN}}>jashan ceremony</a>
                <a href="death-rituals.html" {{ACTIVE_DEATH}}>death rituals</a>
            </div>

            <div class="sidebar-section">
                <a href="peramni-calculator.html" {{ACTIVE_PERAMNI}}>peramni calculator</a>
                <a href="ppt.html" {{ACTIVE_PPT}}>ppt <span class="coming-soon">coming soon</span></a>
                <a href="about-us.html" {{ACTIVE_ABOUT}}>about us</a>
            </div>

            <div class="sidebar-footer">
                <div class="user-profile">
                    <div class="avatar"></div>
                    <div class="user-info">
                        <div class="user-name">guest</div>
                        <div class="user-status">parsi visitor</div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Mobile Navigation Toggle -->
        <button class="mobile-nav-toggle">
            <span></span>
            <span></span>
            <span></span>
        </button>

        <!-- Mobile Navigation Overlay -->
        <div class="mobile-nav-overlay"></div>
`;

// CSS styles to add to each page
const cssStyles = `
        /* Sidebar Styles */
        .sidebar {
            width: 230px;
            height: 100vh;
            padding: 2rem;
            border-right: 1px solid rgba(255, 255, 255, 0.1);
            display: flex;
            flex-direction: column;
            position: sticky;
            top: 0;
            transition: transform 0.3s ease;
            z-index: 1000;
            background-color: #000;
        }

        .logo-container {
            border: 1px solid #fff;
            width: 60px;
            height: 60px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 2rem;
        }

        .logo {
            font-size: 18px;
            font-weight: bold;
        }

        .sidebar-section {
            margin-bottom: 1.5rem;
            padding-bottom: 1.5rem;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .sidebar a {
            display: block;
            color: #999;
            text-decoration: none;
            margin-bottom: 0.6rem;
            font-size: 14px;
            transition: color 0.3s ease;
            position: relative;
        }

        .sidebar a.active {
            color: #fff;
        }

        .sidebar a:hover {
            color: #fff;
        }

        .coming-soon {
            display: inline-block;
            font-size: 10px;
            background-color: rgba(255, 255, 255, 0.1);
            color: rgba(255, 255, 255, 0.7);
            padding: 2px 5px;
            border-radius: 3px;
            margin-left: 5px;
            vertical-align: middle;
        }

        .sidebar-footer {
            margin-top: auto;
            padding: 0 0 1rem 0;
        }

        .user-profile {
            display: flex;
            align-items: center;
            padding: 0.75rem 0;
            width: 180px;
            cursor: pointer;
            transition: all 0.2s ease;
            margin-left: 0;
        }

        .user-profile:hover .user-name,
        .user-profile:hover .user-status {
            color: #fff;
        }

        .avatar {
            width: 2.5rem;
            height: 2.5rem;
            background-color: #fff;
            margin-right: 0.75rem;
            flex-shrink: 0;
        }

        .user-info {
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }

        .user-name {
            font-weight: 600;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            transition: color 0.2s ease;
        }

        .user-status {
            color: #999;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            transition: color 0.2s ease;
        }

        /* Mobile Navigation */
        .mobile-nav-toggle {
            display: none;
            position: fixed;
            top: 1rem;
            left: 1rem;
            z-index: 1001;
            background: none;
            border: none;
            color: #fff;
            font-size: 1.5rem;
            cursor: pointer;
        }

        .mobile-nav-toggle span {
            display: block;
            width: 25px;
            height: 3px;
            background-color: #fff;
            margin: 5px 0;
            transition: all 0.3s ease;
        }

        .mobile-nav-overlay {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.7);
            z-index: 999;
        }

        /* Media queries for responsive design */
        @media (max-width: 768px) {
            .container {
                flex-direction: column;
            }

            .sidebar {
                position: fixed;
                left: 0;
                top: 0;
                transform: translateX(-100%);
                width: 80%;
                max-width: 300px;
                height: 100%;
                overflow-y: auto;
                z-index: 1000;
                background-color: #000;
            }

            .sidebar.active {
                transform: translateX(0);
            }

            .mobile-nav-toggle {
                display: block;
            }

            .mobile-nav-overlay.active {
                display: block;
            }

            .main-content {
                margin-left: 0;
                width: 100%;
                padding-top: 4rem;
            }
        }
`;

// Mobile navigation JavaScript
const mobileJs = `
        // Mobile navigation functionality
        const mobileNavToggle = document.querySelector('.mobile-nav-toggle');
        const mobileNavOverlay = document.querySelector('.mobile-nav-overlay');
        const sidebar = document.querySelector('.sidebar');
        
        // Mobile navigation toggle functionality
        mobileNavToggle.addEventListener('click', function() {
            sidebar.classList.toggle('active');
            mobileNavOverlay.classList.toggle('active');
        });
        
        // Close mobile navigation when clicking outside
        mobileNavOverlay.addEventListener('click', function() {
            sidebar.classList.remove('active');
            mobileNavOverlay.classList.remove('active');
        });
`;

// Get all HTML files in the pages directory
const files = fs.readdirSync(pagesDir).filter(file => file.endsWith('.html'));

// Process each file
files.forEach(file => {
    const filePath = path.join(pagesDir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Skip if file doesn't have a sidebar or container structure
    if (!content.includes('<div class="sidebar">') && !content.includes('<div class="container">')) {
        console.log(`Skipping ${file} - no sidebar structure found`);
        return;
    }
    
    // Determine active page
    const pageName = file.replace('.html', '');
    let sidebar = sidebarTemplate;
    
    // Set active class for current page
    const activePages = {
        'daily-prayers': 'ACTIVE_DAILY',
        'all-prayers': 'ACTIVE_ALL',
        'stories': 'ACTIVE_STORIES',
        'glossary': 'ACTIVE_GLOSSARY',
        'wedding-rituals': 'ACTIVE_WEDDING',
        'navjote': 'ACTIVE_NAVJOTE',
        'jashan-ceremony': 'ACTIVE_JASHAN',
        'death-rituals': 'ACTIVE_DEATH',
        'peramni-calculator': 'ACTIVE_PERAMNI',
        'ppt': 'ACTIVE_PPT',
        'about-us': 'ACTIVE_ABOUT'
    };
    
    // Replace all placeholders with empty strings first
    Object.values(activePages).forEach(placeholder => {
        sidebar = sidebar.replace(`{{${placeholder}}}`, '');
    });
    
    // Set active class for current page
    if (activePages[pageName]) {
        sidebar = sidebar.replace(`{{${activePages[pageName]}}}`, 'class="active"');
    }
    
    // Check if mobile navigation CSS is already in the file
    if (!content.includes('.mobile-nav-toggle')) {
        // Find the end of the CSS section
        const cssEndIndex = content.indexOf('</style>');
        if (cssEndIndex !== -1) {
            content = content.slice(0, cssEndIndex) + cssStyles + content.slice(cssEndIndex);
        }
    }
    
    // Check if mobile navigation JS is already in the file
    if (!content.includes('mobileNavToggle.addEventListener')) {
        // Find a good place to insert the JS
        const jsIndex = content.indexOf('document.addEventListener(\'DOMContentLoaded\'');
        if (jsIndex !== -1) {
            // Find the opening brace of the DOMContentLoaded function
            const openBraceIndex = content.indexOf('{', jsIndex);
            if (openBraceIndex !== -1) {
                content = content.slice(0, openBraceIndex + 1) + mobileJs + content.slice(openBraceIndex + 1);
            }
        } else {
            // If no DOMContentLoaded event found, add it before the closing body tag
            const bodyEndIndex = content.lastIndexOf('</body>');
            if (bodyEndIndex !== -1) {
                content = content.slice(0, bodyEndIndex) + 
                    `<script>
                        document.addEventListener('DOMContentLoaded', function() {
                            ${mobileJs}
                        });
                    </script>` + 
                    content.slice(bodyEndIndex);
            }
        }
    }
    
    // Replace the sidebar
    const sidebarStartRegex = /<div class="sidebar">/;
    const sidebarEndRegex = /<\/div>\s*<!-- Mobile Navigation Toggle -->/;
    
    if (content.match(sidebarStartRegex)) {
        // If the file already has the new structure with mobile navigation
        const sidebarStartIndex = content.search(sidebarStartRegex);
        const sidebarEndIndex = content.search(sidebarEndRegex);
        
        if (sidebarEndIndex !== -1) {
            // Replace the entire sidebar section including mobile navigation
            content = content.slice(0, sidebarStartIndex) + 
                     sidebar.trim() + 
                     content.slice(content.indexOf('<div class="main-content">', sidebarEndIndex));
        } else {
            // Find where the sidebar div ends
            let depth = 0;
            let i = content.indexOf('<div class="sidebar">');
            let sidebarEndIndex = -1;
            
            while (i < content.length) {
                if (content.substr(i, 5) === '<div ') {
                    depth++;
                } else if (content.substr(i, 6) === '</div>') {
                    depth--;
                    if (depth === 0) {
                        sidebarEndIndex = i + 6;
                        break;
                    }
                }
                i++;
            }
            
            if (sidebarEndIndex !== -1) {
                // Replace just the sidebar
                content = content.slice(0, content.indexOf('<div class="sidebar">')) + 
                         sidebar.trim() + 
                         content.slice(sidebarEndIndex);
            }
        }
    } else {
        // If the file has a container but no sidebar yet
        const containerIndex = content.indexOf('<div class="container">');
        if (containerIndex !== -1) {
            content = content.slice(0, containerIndex + '<div class="container">'.length) + 
                     '\n' + sidebar + 
                     content.slice(containerIndex + '<div class="container">'.length);
        }
    }
    
    // Write the updated content back to the file
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${file}`);
});

console.log('Sidebar update complete!');
