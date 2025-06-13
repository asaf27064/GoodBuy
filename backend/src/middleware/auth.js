const jwt = require('jsonwebtoken')
const User = require('../models/userModel')

module.exports = async (req, res, next) => {
  const authHeader = req.headers.authorization || ''
  const token = authHeader.split(' ')[1]
  if (!token) return res.status(401).end()
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET)
    const user = await User.findById(payload.sub)
    if (!user) return res.status(401).end()
    req.user = user
    next()
  } catch {
    res.status(401).end()
  }
}