// backend/src/models/shoppingListModel.js

const mongoose = require('mongoose');
const { Schema } = mongoose;

// Now we allow embedding the entire product object (a mixed type)
const productWithAmountSchema = new Schema({
  product: { 
    type: Schema.Types.Mixed,    // <-- allow any shape: { itemCode, itemName, imageUrl, ... }
    required: true 
  },
  numUnits: { type: Number, required: true, default: 1 }
}, { _id: false });

// You may optionally still keep editLog entries typed as you like
const shoppingListSchema = new Schema({
  members: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  title: { type: String },
  importantList: { type: Boolean, required: true, default: false },
  products: [productWithAmountSchema],
  editLog: { type: Array, default: [] }
}, { timestamps: true });

module.exports = mongoose.model('Shopping List', shoppingListSchema);
