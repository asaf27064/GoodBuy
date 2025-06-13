const User = require('../models/userModel')
const bcrypt = require('bcrypt')

exports.createUser = async (req, res) => {
  const { email, password, username, location } = req.body
  if (!email || !password) return res.status(400).end()
  if (await User.findOne({ email })) return res.status(409).end()
  const passwordHash = await bcrypt.hash(password, 12)
  const user = await User.create({ email, passwordHash, username, location })
  res.status(201).json(user)
}

exports.listUsers = async (req, res) => {
  const users = await User.find().select('-passwordHash')
  res.json(users)
}

exports.getUser = async (req, res) => {
  const user = await User.findById(req.params.id).select('-passwordHash')
  if (!user) return res.status(404).end()
  res.json(user)
}

exports.updateUser = async (req, res) => {
  const { password, ...rest } = req.body
  if (password) rest.passwordHash = await bcrypt.hash(password, 12)
  const user = await User.findByIdAndUpdate(req.params.id, rest, { new: true }).select('-passwordHash')
  if (!user) return res.status(404).end()
  res.json(user)
}

exports.deleteUser = async (req, res) => {
  const user = await User.findByIdAndDelete(req.params.id).select('-passwordHash')
  if (!user) return res.status(404).end()
  res.json(user)
}
