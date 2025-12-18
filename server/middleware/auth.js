import jwt from 'jsonwebtoken';

/**
 * Authentication middleware to verify JWT tokens
 * Checks for valid token in Authorization header
 */
const authMiddleware = (req, res, next) => {
  try {
    // Get token from Authorization header
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided. Please login first.'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_secret_key');
    
    // Attach user info to request for use in controllers
    req.userId = decoded.userId;
    req.user = decoded;
    
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired. Please login again.'
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token. Please login again.'
      });
    }

    return res.status(401).json({
      success: false,
      message: 'Authentication failed.',
      error: error.message
    });
  }
};

export default authMiddleware;
