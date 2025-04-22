const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const passport = require('passport');
const session = require('express-session');
const jwt = require('jsonwebtoken');

// Load env vars
dotenv.config();

// Route files
const auth = require('./routes/auth');

// Initialize app
const app = express();

// Body parser
app.use(express.json());

// Session middleware
app.use(session({
  secret: process.env.JWT_SECRET || 'session-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: process.env.NODE_ENV === 'production', 
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Initialize passport
require('./config/passport')(app);

// Enable CORS
app.use(cors({
  origin: '*', // Allow all origins (change in production)
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Middleware to capture the original request URL for redirects
app.use((req, res, next) => {
  // Store the origin for use in redirects
  req.appHost = req.headers.origin || `${req.protocol}://${req.get('host')}`;
  next();
});

// Add error handling middleware for simulation mode
app.use((req, res, next) => {
  // Add simulation mode flag to request
  req.simulationMode = !!process.env.SIMULATION_MODE || false;
  next();
});

// Mount API routers
app.use('/api/auth', auth);

// Serve static files from the root of the project
// This must come BEFORE the Google auth routes to avoid conflicts
app.use(express.static(path.join(__dirname, '../')));

// Google OAuth routes
app.get('/auth/google', 
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

app.get('/auth/google/callback', 
  passport.authenticate('google', { 
    failureRedirect: 'http://127.0.0.1:50272/pages/login.html?error=google-auth-failed' 
  }),
  (req, res) => {
    // Generate JWT token for the authenticated user
    const token = req.user.getSignedJwtToken ? 
      req.user.getSignedJwtToken() : 
      jwt.sign(
        { id: req.user._id },
        process.env.JWT_SECRET || 'simulation-secret-key',
        { expiresIn: process.env.JWT_EXPIRE || '30d' }
      );
    
    console.log('Google authentication successful. Redirecting with token.');
    
    // Get user details for the frontend
    const userInfo = {
      firstName: req.user.firstName || '',
      lastName: req.user.lastName || '',
      email: req.user.email || '',
      avatar: req.user.avatar || '0',
      userType: req.user.userType || 'visitor'
    };
    
    // Add user info to query params
    const userInfoParams = new URLSearchParams({
      token,
      firstName: userInfo.firstName,
      lastName: userInfo.lastName,
      email: userInfo.email,
      avatar: userInfo.avatar,
      userType: userInfo.userType
    }).toString();
    
    // Redirect to the specific browser preview URL for login page with token and user data
    res.redirect(`http://127.0.0.1:50272/pages/login.html?${userInfoParams}`);
  }
);

// Add health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    mongoConnection: mongoose.connection.readyState === 1,
    simulationMode: req.simulationMode,
    time: new Date().toISOString()
  });
});

// Catch-all route to serve index.html for all other routes
// This must come AFTER all other routes
app.get('*', (req, res) => {
  res.sendFile(path.resolve(__dirname, '..', req.path.startsWith('/') ? req.path.slice(1) : req.path));
});

// Connect to MongoDB
let mongoConnected = false;

const connectDB = async () => {
  try {
    // Check if MongoDB URI is set
    if (!process.env.MONGO_URI || process.env.MONGO_URI.includes('localhost:27017')) {
      console.log('\x1b[33m%s\x1b[0m', 'Warning: Using simulation mode - MongoDB not connected');
      process.env.SIMULATION_MODE = 'true';
      return false;
    }
    
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('\x1b[32m%s\x1b[0m', 'MongoDB Connected');
    mongoConnected = true;
    return true;
  } catch (err) {
    console.error('\x1b[31m%s\x1b[0m', 'MongoDB connection error:', err.message);
    console.log('\x1b[33m%s\x1b[0m', 'Falling back to simulation mode');
    process.env.SIMULATION_MODE = 'true';
    return false;
  }
};

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  // Try to connect to MongoDB
  await connectDB();
  
  const server = app.listen(PORT, () => {
    console.log('\x1b[36m%s\x1b[0m', `Server running on port ${PORT}`);
    console.log('\x1b[36m%s\x1b[0m', `API available at http://localhost:${PORT}/api`);
    console.log('\x1b[36m%s\x1b[0m', `Website available at http://localhost:${PORT}`);
    console.log('\x1b[36m%s\x1b[0m', `Google Auth URL: http://localhost:${PORT}/auth/google`);
    
    if (process.env.SIMULATION_MODE) {
      console.log('\x1b[33m%s\x1b[0m', '===============================================');
      console.log('\x1b[33m%s\x1b[0m', '⚠️ Running in SIMULATION MODE - data will not persist');
      console.log('\x1b[33m%s\x1b[0m', '  User accounts will be simulated with in-memory storage');
      console.log('\x1b[33m%s\x1b[0m', '===============================================');
    }
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (err, promise) => {
    console.log(`Error: ${err.message}`);
    // Close server & exit process
    server.close(() => process.exit(1));
  });
};

startServer();
