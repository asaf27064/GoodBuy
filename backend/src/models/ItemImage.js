const mongoose = require('mongoose');

const ItemImageSchema = new mongoose.Schema({
  itemCode:      { type: String, required: true, unique: true, index: true },
  s3Key:         { type: String, index: true },
  imageUrl:      { type: String },
  status:        { type: String, enum: ['pending','found','not_found'], default: 'pending', index: true },
  lastCheckedAt: { type: Date,   default: Date.now },
  attempts:      { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('ItemImage', ItemImageSchema);
