const mongoose = require('mongoose');

const ItemImageSchema = new mongoose.Schema({
  itemCode: { type: String, required: true, unique: true, index: true },
  imageUrl: { type: String },
  noImage:  { type: Boolean, default: false, index: true }
}, { timestamps: true });

module.exports = mongoose.model('ItemImage', ItemImageSchema);
