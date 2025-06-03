// File: middleware/auth.js

const jwt = require('jsonwebtoken');
const User = require('../Models/userModel');

/**
 * JWT authentication middleware.
 * Checks for Authorization: "Bearer <token>".
 * Verifies token and sets req.user to the corresponding User document.
 */
module.exports = async (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).end(); // No token provided
  }

  try {
    // Verify token. We assume payload.sub contains the userId.
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.sub);
    if (!user) {
      return res.status(401).end(); // User not found
    }
    req.user = user; // Attach full User document to req.user
    next();
  } catch {
    return res.status(401).end(); // Token invalid or expired
  }
};
