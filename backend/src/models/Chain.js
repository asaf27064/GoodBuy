const mongoose = require('mongoose');

const ChainSchema = new mongoose.Schema({
  chainId:   { type: String, required: true, unique: true, index: true },
  chainName: { type: String },
  imageUrl:  { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Chain', ChainSchema);