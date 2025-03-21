const User = require('../models/User');

exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select('-password -refreshToken');
      
    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { name, email, location } = req.body;
    
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { name, email, location },
      { new: true }
    ).select('-password -refreshToken');

    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};
