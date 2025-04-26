// models/PriceFile.js
const mongoose = require('mongoose');

const PriceFileSchema = new mongoose.Schema({
  // Reference to the Store document
  storeRef:   { type: mongoose.Types.ObjectId, ref: 'Store', required: true, index: true },
  fetchedAt:  { type: Date,   required: true, default: Date.now },
  fileName:   { type: String, required: true }
}, { timestamps: true });

// Index on storeRef for efficient queries
PriceFileSchema.index({ storeRef: 1 });

module.exports = mongoose.model('PriceFile', PriceFileSchema);