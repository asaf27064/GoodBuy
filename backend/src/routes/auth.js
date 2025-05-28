const router = require('express').Router()
const bcrypt = require('bcrypt')
const User = require('../Models/userModel')
const {
  generateAccessToken,
  generateRefreshToken,
  verifyToken
} = require('../utils/tokenService')

router.post('/register', async (req, res) => {
  const { email, username, password } = req.body
  if (!email || !username || !password)
    return res.status(400).json({ message: 'Missing fields.' })
  if (await User.findOne({ $or: [{ email }, { username }] }))
    return res.status(409).json({ message: 'Email or username in use.' })

  const passwordHash = await bcrypt.hash(password, 12)
  await User.create({ email, username, passwordHash })
  res.status(201).json({ ok: true })
})

router.post('/login', async (req, res) => {
  const { username, password } = req.body
  const user = await User.findOne({ username })
  if (!user || !(await bcrypt.compare(password, user.passwordHash)))
    return res.status(401).json({ message: 'Invalid credentials.' })

  const accessToken = generateAccessToken(user.id)
  const refreshToken = generateRefreshToken(user.id)
  user.refreshToken = refreshToken
  await user.save()

  res.json({ accessToken, refreshToken })
})

router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body
  if (!refreshToken) return res.status(401).json({ message: 'Missing token.' })

  try {
    const payload = verifyToken(refreshToken, process.env.JWT_REFRESH_SECRET)
    const user = await User.findById(payload.sub)
    if (!user || user.refreshToken !== refreshToken)
      return res.status(403).json({ message: 'Token invalid.' })

    const newAccessToken = generateAccessToken(user.id)
    res.json({ accessToken: newAccessToken })
  } catch {
    res.status(403).json({ message: 'Token expired or invalid.' })
  }
})

router.post('/logout', async (req, res) => {
  const { refreshToken } = req.body
  if (!refreshToken) return res.status(400).json({ message: 'Missing token.' })

  try {
    const payload = verifyToken(refreshToken, process.env.JWT_REFRESH_SECRET)
    const user = await User.findById(payload.sub)
    if (user) {
      user.refreshToken = null
      await user.save()
    }
    res.status(200).json({ ok: true })
  } catch {
    res.status(400).json({ message: 'Invalid token.' })
  }
})

module.exports = router
