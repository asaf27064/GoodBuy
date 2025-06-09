// File: models/Purchase.js

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const purchaseSchema = new Schema({

  listId: {
    type: Schema.Types.ObjectId,
    ref: 'Shopping List',
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  products: [
    {
    _id: false,
      product: {
        type: String,
        ref: 'Product',
        required: true
      },
      numUnits: {
        type: Number,
        required: true,
        default: 1
      }
    }
  ]
});

module.exports = mongoose.model('Purchase', purchaseSchema);