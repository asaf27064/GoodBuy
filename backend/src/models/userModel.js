const mongoose = require('mongoose');

const { Schema } = mongoose;

const userSchema = new Schema({
    username: { type: String, required: true },
    password: { type: String, required: true },
    email: { type: String, required: true, unique: true},
    location: { type: String, default: '' } // Is this relevant as part of the user DB? reconsider.
});

module.exports = mongoose.model('User', userSchema);
