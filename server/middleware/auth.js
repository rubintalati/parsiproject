const jwt = require('jsonwebtoken');
const User = require('../models/User');
const MemoryStore = require('../models/MemoryStore');

/**
 * Protect routes - middleware to validate JWT token
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
exports.protect = async (req, res, next) => {
  let token;

  // Check for token in Authorization header
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    // Set token from Bearer token in header
    token = req.headers.authorization.split(' ')[1];
  }
  // Check for token in cookie (if we implement that in the future)
  // else if (req.cookies.token) {
  //   token = req.cookies.token;
  // }

  // Make sure token exists
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route'
    });
  }

  try {
    // Verify token
    const decoded = jwt.verify(
      token, 
      process.env.JWT_SECRET || 'simulation-secret-key'
    );

    // Check if in simulation mode
    if (req.simulationMode) {
      // In simulation mode, use memory store
      // Find all users (since it's in memory, this is fast)
      const users = MemoryStore.getAllUsers();
      
      // Find the user with the matching ID
      const user = users.find(user => user._id === decoded.id);
      
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'User not found'
        });
      }
      
      // Attach user to request
      req.user = user;
      next();
    } else {
      // Real MongoDB mode
      // Find user by ID from decoded token
      const user = await User.findById(decoded.id);

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'User not found'
        });
      }

      // Attach user to request
      req.user = user;
      next();
    }
  } catch (err) {
    console.error('Auth middleware error:', err.message);
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route'
    });
  }
};
