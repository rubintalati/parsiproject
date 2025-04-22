const express = require('express');
const router = express.Router();
const {
  register,
  login,
  googleAuth,
  getMe,
  forgotPassword,
  resetPassword,
  updateProfile,
  updatePassword,
  logout
} = require('../controllers/authController');

const { protect } = require('../middleware/auth');

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/google', googleAuth);
router.post('/forgot-password', forgotPassword);
router.put('/reset-password/:resettoken', resetPassword);

// Protected routes (require authentication)
router.get('/me', protect, getMe);
router.put('/update-profile', protect, updateProfile);
router.put('/update-password', protect, updatePassword);
router.get('/logout', protect, logout);

module.exports = router;
