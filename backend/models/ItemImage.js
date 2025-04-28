// models/ItemImage.js
const mongoose = require('mongoose');

const ItemImageSchema = new mongoose.Schema({
  itemCode: { type: String, required: true, unique: true, index: true },
  imageUrl: { type: String, required: true }
}, { timestamps: true });

module.exports = mongoose.model('ItemImage', ItemImageSchema);