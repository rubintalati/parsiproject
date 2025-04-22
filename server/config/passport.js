const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');
const MemoryStore = require('../models/MemoryStore');

module.exports = function(app) {
  // Serialize user
  passport.serializeUser((user, done) => {
    done(null, user._id);
  });

  // Deserialize user
  passport.deserializeUser((id, done) => {
    if (process.env.SIMULATION_MODE) {
      MemoryStore.findUserById(id)
        .then(user => done(null, user))
        .catch(err => done(err, null));
    } else {
      User.findById(id)
        .then(user => done(null, user))
        .catch(err => done(err, null));
    }
  });

  // Google Strategy
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL,
    scope: ['profile', 'email']
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      const email = profile.emails && profile.emails[0] ? profile.emails[0].value : '';
      const firstName = profile.name.givenName || '';
      const lastName = profile.name.familyName || '';
      const googleId = profile.id;
      const picture = profile.photos && profile.photos[0] ? profile.photos[0].value : '';
      
      if (!email) {
        return done(new Error('No email available from Google profile'), null);
      }

      // Handle user based on simulation mode
      if (process.env.SIMULATION_MODE) {
        // Simulation mode - use in-memory store
        let user = await MemoryStore.findUserByEmail(email);
        
        if (user) {
          // Update existing user if needed
          if (!user.googleId) {
            user = await MemoryStore.updateUser(email, { googleId });
          }
        } else {
          // Create new user
          user = await MemoryStore.createUser({
            firstName,
            lastName,
            email,
            googleId,
            avatar: picture || '0',
            userType: 'visitor'
          });
        }
        
        return done(null, user);
      } else {
        // MongoDB mode - use real database
        let user = await User.findOne({ email });

        if (user) {
          // If user exists but doesn't have googleId, update it
          if (!user.googleId) {
            user.googleId = googleId;
            await user.save();
          }
        } else {
          // Create new user
          user = await User.create({
            firstName,
            lastName,
            email,
            googleId,
            avatar: picture || '0',
            userType: 'visitor'
          });
        }
        
        return done(null, user);
      }
    } catch (error) {
      console.error('Google Strategy Error:', error);
      return done(error, null);
    }
  }));

  // Initialize passport
  app.use(passport.initialize());
};
