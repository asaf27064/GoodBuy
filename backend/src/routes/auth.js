const router = require('express').Router()
const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt')
const User = require('../Models/userModel')

// POST /auth/register
router.post('/register', async (req, res) => {
  console.log('📥 /auth/register', req.body)
  const { email, username, password } = req.body
  if (!email || !username || !password) {
    return res.status(400).json({ message: 'Email, username and password are required.' })
  }
  // ensure neither email nor username already exist
  if (await User.findOne({ $or: [{ email }, { username }] })) {
    return res.status(409).json({ message: 'Email or username already in use.' })
  }
  const passwordHash = await bcrypt.hash(password, 12)
  await User.create({ email, username, passwordHash })
  res.status(201).json({ ok: true })
})

// POST /auth/login
router.post('/login', async (req, res) => {
  console.log('📥 /auth/login', req.body)
  const { username, password } = req.body
  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required.' })
  }
  const user = await User.findOne({ username })
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ message: 'Invalid credentials.' })
  }
  const token = jwt.sign({ sub: user.id }, process.env.JWT_SECRET, { expiresIn: '15m' })
  res.json({ token })
})

module.exports = router
