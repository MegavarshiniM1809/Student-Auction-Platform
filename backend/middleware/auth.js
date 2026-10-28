const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  const authorization = req.headers.authorization;
  const [scheme, token, ...extraParts] = authorization ? authorization.split(' ') : [];
  if (scheme !== 'Bearer' || !token || extraParts.length > 0) {
    return res.status(401).json({ message: 'Not authenticated. Please log in.' });
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return res.status(500).json({ message: 'Authentication service is not configured.' });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, secret);
  } catch (err) {
    if (['JsonWebTokenError', 'TokenExpiredError', 'NotBeforeError'].includes(err.name)) {
      return res.status(401).json({ message: 'Invalid or expired token.' });
    }
    console.error(`[Auth] Token verification failed (${err.name || 'Error'}).`);
    return res.status(500).json({ message: 'An unexpected error occurred.' });
  }

  if (!decoded || typeof decoded.id !== 'string') {
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }

  try {
    req.user = await User.findById(decoded.id).select('-passwordHash');
    if (!req.user) {
      return res.status(401).json({ message: 'User no longer exists.' });
    }
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(401).json({ message: 'Invalid or expired token.' });
    }
    console.error(`[Auth] User lookup failed (${err.name || 'Error'}).`);
    return res.status(500).json({ message: 'An unexpected error occurred.' });
  }

  return next();
};

const requireAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') return next();
  return res.status(403).json({ message: 'Admin access required.' });
};

module.exports = { protect, requireAdmin };
