const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const MemoryStore = require('../models/MemoryStore');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const sendEmail = require('../utils/sendEmail');

// Initialize Google Auth Client
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

/**
 * @desc    Register user
 * @route   POST /api/auth/register
 * @access  Public
 */
exports.register = async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body;
    
    // Simulation mode logic
    if (req.simulationMode) {
      // Check if user already exists
      const existingUser = await MemoryStore.findUserByEmail(email);
      
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Email already in use'
        });
      }
      
      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      
      // Create user in memory store
      const user = await MemoryStore.createUser({
        firstName,
        lastName,
        email,
        password: hashedPassword,
        userType: req.body.userType || 'visitor',
        avatar: req.body.avatar || '0'
      });
      
      // Remove password from response
      const userResponse = { ...user };
      delete userResponse.password;
      
      // Generate JWT token
      const token = jwt.sign(
        { id: user._id },
        process.env.JWT_SECRET || 'simulation-secret-key',
        { expiresIn: process.env.JWT_EXPIRE || '30d' }
      );
      
      return res.status(200).json({
        success: true,
        token,
        user: userResponse
      });
    }
    
    // MongoDB logic - only runs if not in simulation mode
    // Check if user already exists
    let user = await User.findOne({ email });

    if (user) {
      return res.status(400).json({
        success: false,
        message: 'Email already in use'
      });
    }

    // Create user
    user = await User.create({
      firstName,
      lastName,
      email,
      password,
      userType: req.body.userType || 'visitor',
      avatar: req.body.avatar || '0'
    });

    sendTokenResponse(user, 200, res);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/**
 * @desc    Login user
 * @route   POST /api/auth/login
 * @access  Public
 */
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate email & password
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an email and password'
      });
    }
    
    // Simulation mode logic
    if (req.simulationMode) {
      // Get user from memory store
      const user = await MemoryStore.findUserByEmail(email);
      
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }
      
      // Check password
      const isMatch = await bcrypt.compare(password, user.password);
      
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }
      
      // Remove password from response
      const userResponse = { ...user };
      delete userResponse.password;
      
      // Generate JWT token
      const token = jwt.sign(
        { id: user._id },
        process.env.JWT_SECRET || 'simulation-secret-key',
        { expiresIn: process.env.JWT_EXPIRE || '30d' }
      );
      
      return res.status(200).json({
        success: true,
        token,
        user: userResponse
      });
    }

    // MongoDB logic - only runs if not in simulation mode
    // Check for user
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    sendTokenResponse(user, 200, res);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/**
 * @desc    Google OAuth login/register
 * @route   POST /api/auth/google
 * @access  Public
 */
exports.googleAuth = async (req, res) => {
  try {
    // TEMPORARY MOCK IMPLEMENTATION WHILE WAITING FOR GOOGLE VERIFICATION
    // This bypasses actual Google token verification for testing purposes
    
    const { idToken, userInfo } = req.body;
    
    // For testing, accept user info directly from frontend
    // In production, this would come from verified Google token
    const { email, firstName, lastName, picture } = userInfo;
    
    // Generated mock Google ID based on email
    const googleId = crypto.createHash('md5').update(email).digest('hex');
    
    // Simulation mode logic
    if (req.simulationMode) {
      // Check if user exists
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
          userType: req.body.userType || 'visitor',
          avatar: req.body.avatar || '0'
        });
      }
      
      // Generate JWT token
      const token = jwt.sign(
        { id: user._id },
        process.env.JWT_SECRET || 'simulation-secret-key',
        { expiresIn: process.env.JWT_EXPIRE || '30d' }
      );
      
      return res.status(200).json({
        success: true,
        token,
        user
      });
    }

    // MongoDB logic - only runs if not in simulation mode
    // Check if user exists with this email
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
        avatar: req.body.avatar || '0',
        userType: req.body.userType || 'visitor'
      });
    }

    sendTokenResponse(user, 200, res);
    
    /* COMMENTED OUT UNTIL GOOGLE VERIFICATION IS COMPLETE
    const { idToken } = req.body;

    // Verify Google token
    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    
    // Extract user info from payload
    const { sub: googleId, email, given_name: firstName, family_name: lastName, picture } = payload;

    // Check if user exists with this email
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
        avatar: req.body.avatar || '0',
        userType: req.body.userType || 'visitor'
      });
    }

    sendTokenResponse(user, 200, res);
    */
  } catch (error) {
    console.error('Google Auth Error:', error);
    res.status(500).json({
      success: false,
      message: 'Google authentication failed'
    });
  }
};

/**
 * @desc    Get current logged in user
 * @route   GET /api/auth/me
 * @access  Private
 */
exports.getMe = async (req, res) => {
  try {
    // Simulation mode logic
    if (req.simulationMode) {
      return res.status(200).json({
        success: true,
        data: req.user
      });
    }
    
    // MongoDB logic
    const user = await User.findById(req.user.id);

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/**
 * @desc    Forgot password
 * @route   POST /api/auth/forgot-password
 * @access  Public
 */
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    
    // Simulation mode logic
    if (req.simulationMode) {
      const user = await MemoryStore.findUserByEmail(email);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'No user with that email'
        });
      }
      
      // Generate reset token
      const resetToken = crypto.randomBytes(20).toString('hex');
      const resetTokenExpire = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
      
      // Store token in memory
      await MemoryStore.setResetToken(email, resetToken, resetTokenExpire);
      
      // Create reset url
      const resetUrl = `${req.protocol}://${req.get('host')}/pages/reset-password.html?token=${resetToken}`;
      
      const message = `
        You are receiving this email because you (or someone else) has requested the reset of a password. 
        Please visit: \n\n ${resetUrl} \n\n This link is valid for 10 minutes.
      `;
      
      try {
        await sendEmail({
          email: user.email,
          subject: 'Password reset token',
          message
        });
        
        return res.status(200).json({
          success: true,
          message: 'Email sent'
        });
      } catch (err) {
        console.error(err);
        await MemoryStore.removeResetToken(resetToken);
        
        return res.status(500).json({
          success: false,
          message: 'Email could not be sent'
        });
      }
    }
    
    // MongoDB logic
    const user = await User.findOne({ email: req.body.email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No user with that email'
      });
    }

    // Get reset token
    const resetToken = user.getResetPasswordToken();

    await user.save({ validateBeforeSave: false });

    // Create reset url
    const resetUrl = `${req.protocol}://${req.get('host')}/pages/reset-password.html?token=${resetToken}`;

    const message = `
      You are receiving this email because you (or someone else) has requested the reset of a password. 
      Please visit: \n\n ${resetUrl} \n\n This link is valid for 10 minutes.
    `;

    try {
      await sendEmail({
        email: user.email,
        subject: 'Password reset token',
        message
      });

      res.status(200).json({
        success: true,
        message: 'Email sent'
      });
    } catch (err) {
      console.error(err);
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;

      await user.save({ validateBeforeSave: false });

      return res.status(500).json({
        success: false,
        message: 'Email could not be sent'
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/**
 * @desc    Reset password
 * @route   PUT /api/auth/reset-password/:resettoken
 * @access  Public
 */
exports.resetPassword = async (req, res) => {
  try {
    // Simulation mode logic
    if (req.simulationMode) {
      const resetToken = req.params.resettoken;
      
      // Find user by reset token
      const user = await MemoryStore.findUserByResetToken(resetToken);
      
      if (!user) {
        return res.status(400).json({
          success: false,
          message: 'Invalid token'
        });
      }
      
      // Hash new password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(req.body.password, salt);
      
      // Update user password
      const updatedUser = await MemoryStore.updateUser(user.email, {
        password: hashedPassword
      });
      
      // Remove reset token
      await MemoryStore.removeResetToken(resetToken);
      
      // Generate new JWT token
      const token = jwt.sign(
        { id: updatedUser._id },
        process.env.JWT_SECRET || 'simulation-secret-key',
        { expiresIn: process.env.JWT_EXPIRE || '30d' }
      );
      
      // Remove password from response
      const userResponse = { ...updatedUser };
      delete userResponse.password;
      
      return res.status(200).json({
        success: true,
        token,
        user: userResponse
      });
    }
    
    // MongoDB logic
    // Get hashed token
    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(req.params.resettoken)
      .digest('hex');

    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid token'
      });
    }

    // Set new password
    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    sendTokenResponse(user, 200, res);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/**
 * @desc    Update user profile
 * @route   PUT /api/auth/update-profile
 * @access  Private
 */
exports.updateProfile = async (req, res) => {
  try {
    const { firstName, lastName, userType, avatar } = req.body;

    // Build update object
    const updateFields = {};
    if (firstName) updateFields.firstName = firstName;
    if (lastName) updateFields.lastName = lastName;
    if (userType) updateFields.userType = userType;
    if (avatar) updateFields.avatar = avatar;
    
    // Simulation mode logic
    if (req.simulationMode) {
      // Get user from user ID in request
      const user = req.user;
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
      
      // Update user
      const updatedUser = await MemoryStore.updateUser(user.email, updateFields);
      
      return res.status(200).json({
        success: true,
        data: updatedUser
      });
    }

    // MongoDB logic
    // Update user
    const user = await User.findByIdAndUpdate(
      req.user.id,
      updateFields,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/**
 * @desc    Update password
 * @route   PUT /api/auth/update-password
 * @access  Private
 */
exports.updatePassword = async (req, res) => {
  try {
    // Simulation mode logic
    if (req.simulationMode) {
      // Get user from user ID in request
      const user = req.user;
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
      
      // Check current password
      const isMatch = await bcrypt.compare(req.body.currentPassword, user.password);
      
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: 'Current password is incorrect'
        });
      }
      
      // Hash new password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(req.body.newPassword, salt);
      
      // Update user password
      const updatedUser = await MemoryStore.updateUser(user.email, {
        password: hashedPassword
      });
      
      // Generate new JWT token
      const token = jwt.sign(
        { id: updatedUser._id },
        process.env.JWT_SECRET || 'simulation-secret-key',
        { expiresIn: process.env.JWT_EXPIRE || '30d' }
      );
      
      // Remove password from response
      const userResponse = { ...updatedUser };
      delete userResponse.password;
      
      return res.status(200).json({
        success: true,
        token,
        user: userResponse
      });
    }
    
    // MongoDB logic
    const user = await User.findById(req.user.id).select('+password');

    // Check current password
    if (!(await user.matchPassword(req.body.currentPassword))) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    user.password = req.body.newPassword;
    await user.save();

    sendTokenResponse(user, 200, res);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/**
 * @desc    Logout user / clear cookie
 * @route   GET /api/auth/logout
 * @access  Private
 */
exports.logout = async (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Logged out successfully'
  });
};

// Helper to get token from model, create cookie and send response
const sendTokenResponse = (user, statusCode, res) => {
  // Create token
  const token = user.getSignedJwtToken();

  // Remove password from output
  user.password = undefined;

  res.status(statusCode).json({
    success: true,
    token,
    user
  });
};
