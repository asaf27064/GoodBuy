const mongoose = require('mongoose');

const historySchema = new mongoose.Schema({
  itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Item' },
  action: { type: String, enum: ['created', 'updated', 'deleted'], required: true },
  changedBy: { type: String },
  changeDetails: { type: Object },
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('History', historySchema);
