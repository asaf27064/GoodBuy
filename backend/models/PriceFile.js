const mongoose = require('mongoose');

const PriceFileSchema = new mongoose.Schema({
  storeRef:   { type: mongoose.Types.ObjectId, ref: 'Store', required: true, index: true },
  fetchedAt:  { type: Date,   required: true, default: Date.now },
  fileName:   { type: String, required: true }
}, { timestamps: true });

PriceFileSchema.index({ storeRef: 1 });

module.exports = mongoose.model('PriceFile', PriceFileSchema);