// models/PriceFile.js
const mongoose = require('mongoose');

const PriceFileSchema = new mongoose.Schema({
  chainId:     { type: String, required: true },
  subChainId:  { type: String, required: true },
  storeId:     { type: String, required: true },
  fetchedAt:   { type: Date,   required: true, default: Date.now },
  fileName:    { type: String, required: true },
  imageUrl:    { type: String },
}, { timestamps: true });

module.exports = mongoose.model('PriceFile', PriceFileSchema);
