const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const User = require('../models/User');

const router = express.Router();

// Protected route to get user profile
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    // Fetch user details using the ID from the decoded token
    const user = await User.findById(req.user.id).select('-password'); // Exclude password from response
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
