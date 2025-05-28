// 📁 backend/src/utils/tokenService.js
const jwt = require('jsonwebtoken')

const generateAccessToken = userId =>
  jwt.sign({ sub: userId }, process.env.JWT_SECRET, { expiresIn: '15m' })

const generateRefreshToken = userId =>
  jwt.sign({ sub: userId }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' })

const verifyToken = (token, secret) => jwt.verify(token, secret)

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyToken
}
