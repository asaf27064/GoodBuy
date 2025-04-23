import mongoose from 'mongoose';

const { Schema } = mongoose;

const userSchema = new Schema({
    _id: { type: mongoose.ObjectId, required: true },
    username: { type: String, required: true },
    password: { type: String, required: true },
    email: { type: String, required: true, unique: true},
    location: { type: String, default: '' }
});

const User = mongoose.model('User', userSchema);

export default User;