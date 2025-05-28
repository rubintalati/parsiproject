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

// Middleware to inject orientation lock script in all HTML responses with highest priority
app.use((req, res, next) => {
  // Store original send function
  const originalSend = res.send;
  
  // Override send function
  res.send = function(body) {
    // Only process HTML responses
    if (typeof body === 'string' && body.includes('<head>') && !req.path.includes('.js') && !req.path.includes('.css')) {
      // Add special meta tag to prevent any viewport manipulation after our script
      const metaViewport = '<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">';
      
      // Add orientation meta tag
      const metaOrientation = '<meta http-equiv="ScreenOrientation" content="autoRotate:disabled">';
      
      // Inject orientation lock script immediately after opening head tag for highest priority
      const orientationScript = '<script defer src="/js/orientation-lock.js"></script>';
      
      // Combine all elements
      const injectedContent = metaViewport + metaOrientation + orientationScript;
      
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
