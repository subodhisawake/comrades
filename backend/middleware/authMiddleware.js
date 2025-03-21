const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authMiddleware = async (req, res, next) => {
  // Get access token
  const authHeader = req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Invalid authorization header' });
  }

  const accessToken = authHeader.split(' ')[1];
  
  // Validate token structure
  if (!accessToken || accessToken.split('.').length !== 3) {
    return res.status(401).json({ message: 'Malformed JWT' });
  }

  try {
    // Verify access token
    const decoded = jwt.verify(accessToken, process.env.JWT_SECRET);
    req.user = decoded;
    return next();
  } catch (error) {
    if (error.name !== 'TokenExpiredError') {
      console.error('JWT verification error:', error.message);
      return res.status(401).json({ message: 'Invalid token' });
    }

    // Handle expired token
    try {
      const refreshToken = req.cookies.refreshToken;
      if (!refreshToken) throw new Error('No refresh token');

      const decodedRefresh = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
      const user = await User.findById(decodedRefresh.id);
      
      if (!user || user.refreshToken !== refreshToken) {
        throw new Error('Invalid refresh token');
      }

      // Issue new access token
      const newAccessToken = jwt.sign(
        { id: user._id },
        process.env.JWT_SECRET,
        { expiresIn: '15m' }
      );

      // Set new token in headers
      res.set('New-Access-Token', newAccessToken);
      req.user = { id: user._id };
      return next();
      
    } catch (refreshError) {
      console.error('Token refresh failed:', refreshError.message);
      res.clearCookie('refreshToken');
      return res.status(401).json({ message: 'Session expired. Please login again' });
    }
  }
};

module.exports = authMiddleware;
