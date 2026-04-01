const express = require('express');
const path = require('path');
const app = express();
const port = 3002; // Using port 3002 as this is what your browser preview uses

// Define Google OAuth credentials directly
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const GOOGLE_CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL || '';

// Mock data for testing without MongoDB
const users = [];
const birthdays = [
  {
    id: 1,
    name: 'amestrice talati',
    nextBirthday: '12-June',
    zodiac: 'Gemini',
    turn: 65,
    nextRoj: 'Hormuz',
    rojDetails: 'Hormuz roj, Fravardin mah',
    timeOfBirth: 'before 6am',
    dobDetails: '7,134'
  },
  {
    id: 2,
    name: 'yezdi talati',
    nextBirthday: '7,134',
    zodiac: '9 bonds available',
    turn: 66,
    nextRoj: 'Ardibehesht',
    rojDetails: 'Ardibehesht roj, Tir mah',
    timeOfBirth: 'after 6am',
    dobDetails: '7,012'
  }
];

// PPT Mock Data
const deathRecords = [];
const populationEstimates = [
  {
    year: 2011,
    estimatedPopulation: 69601,
    birthRate: 0.8,
    deathRate: 1.2,
    weeklyDeaths: 0,
    calculationNotes: '2011 Census baseline'
  },
  {
    year: 2024,
    estimatedPopulation: 57000,
    birthRate: 0.7,
    deathRate: 1.4,
    weeklyDeaths: 15,
    calculationNotes: 'Projected based on declining trends'
  }
];

const discussionThreads = [
  {
    id: 1,
    title: "What if we created a global Parsi dating app?",
    content: "Hear me out - what if we developed a sophisticated dating platform specifically for Parsis worldwide? We could include cultural compatibility tests, family lineage tracking, and even integration with community events. It might sound modern, but maybe it's exactly what we need.",
    userId: "community_member_1",
    createdAt: new Date('2024-08-10'),
    upvotes: 23,
    tags: ["bold-idea", "technology", "marriage"],
    featuredStatus: false
  },
  {
    id: 2,
    title: "Historical perspective: Why the Doongerwadi policy failed",
    content: "Looking back at our community's past decisions, the strict burial policies may have inadvertently pushed young Parsis away. In the 1980s, similar communities in Iran adapted their practices and saw population stabilization. What lessons can we learn?",
    userId: "history_buff",
    createdAt: new Date('2024-08-09'),
    upvotes: 45,
    tags: ["historical", "policy-analysis", "traditional-practices"],
    featuredStatus: true
  },
  {
    id: 3,
    title: "Small idea: Community childcare co-ops",
    content: "What if Parsi families in each city formed childcare cooperatives? Parents could share responsibilities, reduce costs, and create stronger community bonds. We could start with just 5-10 families in Mumbai and see how it works.",
    userId: "practical_parent",
    createdAt: new Date('2024-08-08'),
    upvotes: 18,
    tags: ["practical", "family-support", "community"],
    featuredStatus: false
  },
  {
    id: 4,
    title: "Outlandish idea: What if we bought an island?",
    content: "This sounds crazy, but what if the community pooled resources to purchase a small island somewhere with favorable laws? We could create a modern Parsi homeland with our own governance, schools, and fire temples. Total population: manageable. Cultural preservation: maximum.",
    userId: "visionary_dreamer",
    createdAt: new Date('2024-08-07'),
    upvotes: 67,
    tags: ["outlandish", "homeland", "preservation"],
    featuredStatus: false
  },
  {
    id: 5,
    title: "Learning from the Jewish community's success",
    content: "The Jewish community has maintained their identity despite diaspora and historical challenges. Their emphasis on education, cultural centers, and flexible religious interpretation while maintaining core values might offer a roadmap for us.",
    userId: "community_researcher",
    createdAt: new Date('2024-08-06'),
    upvotes: 34,
    tags: ["research", "comparative-analysis", "education"],
    featuredStatus: false
  }
];

const threadReplies = [
  {
    id: 1,
    threadId: 1,
    userId: "tech_enthusiast",
    content: "Love this idea! We could even add AI-powered compatibility matching based on family traditions and values. I'd be willing to help develop this.",
    createdAt: new Date('2024-08-10T14:30:00'),
    upvotes: 12,
    parentReplyId: null
  },
  {
    id: 2,
    threadId: 2,
    userId: "young_parsi",
    content: "This is exactly what I've been thinking. My grandparents left the community over these policies. Maybe it's time to reconsider some of our rigid stances.",
    createdAt: new Date('2024-08-09T16:45:00'),
    upvotes: 8,
    parentReplyId: null
  },
  {
    id: 3,
    threadId: 4,
    userId: "economist_member",
    content: "Actually, this isn't as crazy as it sounds. With our community's resources and the right location, it could work. Look at Sark in the Channel Islands - population of 500, self-governing.",
    createdAt: new Date('2024-08-07T19:20:00'),
    upvotes: 25,
    parentReplyId: null
  }
];

const speciesComparisons = [
  {
    id: 1,
    speciesName: 'Parsi Community',
    currentPopulation: 57000,
    populationTrend: 'declining',
    conservationStatus: 'critically endangered',
    lastUpdated: new Date()
  },
  {
    id: 2,
    speciesName: 'Indian Tigers',
    currentPopulation: 2967,
    populationTrend: 'increasing',
    conservationStatus: 'endangered',
    lastUpdated: new Date()
  }
];

// Parsi Calendar Calculation Functions (simplified version)
function calculateRojMah(date, timeOfBirth) {
  // Parsi calendar roj (day) names
  const rojNames = [
    'Hormuz', 'Bahman', 'Ardibehesht', 'Shehrevar', 'Spendarmad',
    'Khordad', 'Amardad', 'Daepadar', 'Adar', 'Avan', 'Khorshed',
    'Mohor', 'Tir', 'Gosh', 'Daepamaher', 'Mehr', 'Srosh', 'Rashne',
    'Fravardin', 'Behram', 'Ram', 'Govad', 'Depdin', 'Din',
    'Ashishvangh', 'Ashtad', 'Asman', 'Zamyad', 'Mahraspand', 'Aneran'
  ];
  
  // Parsi calendar mah (month) names
  const mahNames = [
    'Fravardin', 'Ardibehesht', 'Khordad', 'Tir', 'Amardad',
    'Shehrevar', 'Mehr', 'Avan', 'Adar', 'Dae', 'Bahman', 'Aspandarmad'
  ];
  
  // Simple calculation for testing
  const rojIndex = date.getDate() % 30;
  const mahIndex = date.getMonth();
  
  return {
    roj: rojNames[rojIndex],
    mah: mahNames[mahIndex],
    rojDetails: `${rojNames[rojIndex]} roj, ${mahNames[mahIndex]} mah`
  };
}

// Setup the server to properly work with http://127.0.0.1:50272
app.use((req, res, next) => {
  // Enable CORS for the specific localhost URL
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  // Handle OPTIONS requests
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  next();
});

// Google Analytics configuration
const GA_MEASUREMENT_ID = 'G-6DT5E4V7SQ'; // User's Google Analytics Measurement ID

// Middleware to inject Google Analytics and orientation lock scripts in all HTML responses
app.use((req, res, next) => {
  // Store original send function
  const originalSend = res.send;
  
  // Override send function
  res.send = function(body) {
    // Only process HTML responses
    if (typeof body === 'string' && body.includes('<head>') && !req.path.includes('.js') && !req.path.includes('.css')) {
      // Google Analytics tag (GA4)
      const analyticsScript = `
        <!-- Google Analytics (GA4) -->
        <script async src="https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}"></script>
        <script>
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_MEASUREMENT_ID}', {
            'page_path': window.location.pathname,
            'debug_mode': false
          });

          // Track page load time
          window.addEventListener('load', function() {
            // Calculate page load time
            if(window.performance) {
              const perfData = window.performance.timing;
              const pageLoadTime = perfData.loadEventEnd - perfData.navigationStart;
              // Send to Google Analytics
              if(pageLoadTime > 0) {
                gtag('event', 'timing_complete', {
                  'name': 'page_load',
                  'value': pageLoadTime,
                  'event_category': 'Page Timing'
                });
                console.log('Page load time: ' + pageLoadTime + 'ms');
              }
            }
          });
        </script>`;
      // Add special meta tag to prevent any viewport manipulation after our script
      const metaViewport = '<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">';
      
      // Add orientation meta tag
      const metaOrientation = '<meta http-equiv="ScreenOrientation" content="autoRotate:disabled">';
      
      // Inject orientation lock script immediately after opening head tag for highest priority
      const orientationScript = '<script defer src="/js/orientation-lock.js"></script>';
      
      // Combine all elements
      const injectedContent = metaViewport + metaOrientation + orientationScript + analyticsScript;
      
      // Place at the beginning of head for highest priority
      body = body.replace('<head>', '<head>' + injectedContent);
      
      // Also add a special orientation meta in the HTML element
      if (body.includes('<html')) {
        body = body.replace('<html', '<html class="orientation-locked"');
      }
    }
    
    // Call original send function
    return originalSend.call(this, body);
  };
  
  next();
});

// Setup Google Auth endpoints
app.get('/auth/google', (req, res) => {
  console.log('Google Auth request received');
  
  // For a real implementation, this would redirect to Google's OAuth page
  // For now, we'll redirect to Google's auth URL but with a parameter that will redirect back to our callback
  const googleRedirectURL = 'https://accounts.google.com/o/oauth2/v2/auth';
  const redirectUri = encodeURIComponent(GOOGLE_CALLBACK_URL);
  const scope = encodeURIComponent('profile email');
  
  const authURL = `${googleRedirectURL}?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${redirectUri}&scope=${scope}&response_type=code`;
  
  console.log('Redirecting to Google Auth URL:', authURL);
  console.log('Using callback URL:', GOOGLE_CALLBACK_URL);
  
  // Redirect to Google Auth
  res.redirect(authURL);
});

app.get('/auth/google/callback', (req, res) => {
  // This would normally exchange the code for a token and fetch user data
  console.log('Google Auth callback received:', req.path);
  console.log('Query parameters:', req.query);
  
  // For development, we'll simulate a successful login with realistic user data
  const token = 'mock_' + Math.random().toString(36).substring(2, 15);
  
  // Mock user data that simulates data we would get from Google
  const userParams = new URLSearchParams({
    token: token,
    firstName: 'John', // Simulating actual first name from Google
    lastName: 'Smith',  // Simulating actual last name from Google
    email: 'john.smith@example.com',
    avatar: '1', // Default Parsi avatar
    userType: 'visitor'
  }).toString();
  
  // Log the callback success
  console.log('Google Auth callback processed successfully');
  console.log('Redirecting to login.html with mock token and user data');
  
  // Redirect back to login page with token and user data - using the consistent URL
  res.redirect(`http://127.0.0.1:50272/pages/login.html?${userParams}`);
});

app.get('/auth/google/callback*', (req, res) => {
  console.log('Wildcard callback handler triggered');
  console.log('Path:', req.path);
  console.log('URL:', req.url);
  console.log('Query:', req.query);
  
  // Generate token and user data with realistic names
  const token = 'explicit_callback_' + Math.random().toString(36).substring(2, 15);
  
  const userParams = new URLSearchParams({
    token: token,
    firstName: 'Sarah', // Simulating actual first name from Google
    lastName: 'Johnson', // Simulating actual last name from Google
    email: 'sarah.johnson@example.com',
    avatar: '1', // Default Parsi avatar
    userType: 'visitor'
  }).toString();
  
  // Redirect to login page - using the consistent URL
  res.redirect(`http://127.0.0.1:50272/pages/login.html?${userParams}`);
});

// Route for the home page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// PPT API Routes
// 1. Get death records
app.get('/api/ppt/deaths', (req, res) => {
  try {
    res.json(deathRecords);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 2. Add death record (admin only)
app.post('/api/ppt/deaths', express.json(), (req, res) => {
  try {
    const { name, age, deathDate, location, notes } = req.body;
    const deathRecord = {
      id: deathRecords.length + 1,
      name,
      age: parseInt(age),
      deathDate: new Date(deathDate),
      location,
      notes: notes || '',
      entryDate: new Date(),
      verifiedStatus: true
    };
    deathRecords.push(deathRecord);
    res.status(201).json(deathRecord);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// 3. Get population estimates
app.get('/api/ppt/population', (req, res) => {
  try {
    res.json(populationEstimates);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 4. Get species comparisons
app.get('/api/ppt/species', (req, res) => {
  try {
    res.json(speciesComparisons);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 5. Get discussion threads
app.get('/api/ppt/threads', (req, res) => {
  try {
    const threadsWithReplies = discussionThreads.map(thread => ({
      ...thread,
      replyCount: threadReplies.filter(reply => reply.threadId === thread.id).length
    }));
    res.json(threadsWithReplies);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 6. Create discussion thread
app.post('/api/ppt/threads', express.json(), (req, res) => {
  try {
    const { title, content, userId, tags } = req.body;
    const thread = {
      id: discussionThreads.length + 1,
      title,
      content,
      userId: userId || 'anonymous',
      createdAt: new Date(),
      upvotes: 0,
      tags: tags || [],
      featuredStatus: false
    };
    discussionThreads.push(thread);
    res.status(201).json(thread);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// 7. Get thread replies
app.get('/api/ppt/threads/:threadId/replies', (req, res) => {
  try {
    const threadId = parseInt(req.params.threadId);
    const replies = threadReplies.filter(reply => reply.threadId === threadId);
    res.json(replies);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 8. Add thread reply
app.post('/api/ppt/threads/:threadId/replies', express.json(), (req, res) => {
  try {
    const threadId = parseInt(req.params.threadId);
    const { content, userId, parentReplyId } = req.body;
    const reply = {
      id: threadReplies.length + 1,
      threadId,
      userId: userId || 'anonymous',
      content,
      createdAt: new Date(),
      upvotes: 0,
      parentReplyId: parentReplyId || null
    };
    threadReplies.push(reply);
    res.status(201).json(reply);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// 9. Upvote thread
app.post('/api/ppt/threads/:threadId/upvote', (req, res) => {
  try {
    const threadId = parseInt(req.params.threadId);
    const thread = discussionThreads.find(t => t.id === threadId);
    if (thread) {
      thread.upvotes += 1;
      res.json(thread);
    } else {
      res.status(404).json({ message: 'Thread not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// API Routes with mock data
// 1. Register user
app.post('/api/users', express.json(), (req, res) => {
  try {
    const { email, phone, countryCode } = req.body;
    const user = { 
      id: users.length + 1,
      email, 
      phone, 
      countryCode 
    };
    users.push(user);
    res.status(201).json(user);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// 2. Add birthday
app.post('/api/birthdays', express.json(), (req, res) => {
  try {
    const { name, dob, timeOfBirth, countryCode, phone, userId } = req.body;
    
    const birthDate = new Date(dob);
    const rojMahData = calculateRojMah(birthDate, timeOfBirth);
    
    const birthday = {
      id: birthdays.length + 1,
      name,
      dob: birthDate,
      timeOfBirth,
      countryCode,
      phone,
      userId,
      nextRoj: rojMahData.roj,
      rojDetails: rojMahData.rojDetails,
      nextBirthday: new Date(new Date().getFullYear(), birthDate.getMonth(), birthDate.getDate()).toLocaleDateString(),
      zodiac: 'Calculated zodiac',
      turn: new Date().getFullYear() - birthDate.getFullYear()
    };
    
    birthdays.push(birthday);
    res.status(201).json(birthday);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// 3. Get all birthdays for a user
app.get('/api/birthdays/:userId', (req, res) => {
  try {
    const userBirthdays = birthdays.filter(b => b.userId === parseInt(req.params.userId));
    res.json(userBirthdays.length > 0 ? userBirthdays : birthdays); // Return all birthdays for testing
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 4. Delete birthday
app.delete('/api/birthdays/:id', (req, res) => {
  try {
    const index = birthdays.findIndex(b => b.id === parseInt(req.params.id));
    if (index !== -1) {
      birthdays.splice(index, 1);
    }
    res.json({ message: 'Birthday deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Serve static files from the root directory
app.use(express.static(path.join(__dirname)));

// Add specific route for prayer pages
app.get('/pages/allprayerpages/:prayerPage', (req, res) => {
  const prayerPage = req.params.prayerPage;
  const prayerPath = path.join(__dirname, 'pages', 'allprayerpages', prayerPage);
  
  console.log('Prayer page requested:', prayerPage);
  console.log('Full prayer path:', prayerPath);
  
  res.sendFile(prayerPath, (err) => {
    if (err) {
      console.error('Error serving prayer file:', err);
      res.status(404).send(`Prayer file not found: ${prayerPage}`);
    }
  });
});

// Catch-all route to serve files from the appropriate directory
app.get('*', (req, res) => {
  // Check if the requested path exists
  const requestedPath = path.join(__dirname, req.path);
  
  // Log the requested path
  console.log('Requested path:', req.path);
  console.log('Full path:', requestedPath);
  
  // Send the file if it exists
  res.sendFile(requestedPath, (err) => {
    if (err) {
      console.error('Error serving file:', err);
      res.status(404).send('File not found');
    }
  });
});

// Start server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
  console.log(`Website available at http://127.0.0.1:50272`);
  console.log(`Google Auth URL: http://127.0.0.1:50272/auth/google`);
  console.log(`Google Auth Callback URL: ${GOOGLE_CALLBACK_URL}`);
  console.log(`To access the site directly, open http://localhost:${port} in your browser`);
});
