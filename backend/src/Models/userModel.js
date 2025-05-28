const mongoose = require('mongoose')
const bcrypt = require('bcrypt')

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true },
    passwordHash: { type: String, required: true },
    username: { type: String, unique: true, sparse: true },
    location: { type: String, default: '' },
    refreshToken: { type: String, default: null }
  },
  { timestamps: true }
)

userSchema.methods.verifyPassword = function (p) {
  return bcrypt.compare(p, this.passwordHash)
}

module.exports = mongoose.model('User', userSchema)