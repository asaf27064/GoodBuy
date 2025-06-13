const mongoose = require('mongoose');
const { Schema } = mongoose;

const productWithAmountSchema = new Schema({
  product: { 
    type: Schema.Types.Mixed,
    required: true 
  },
  numUnits: { type: Number, required: true, default: 1 }
}, { _id: false });

const shoppingListSchema = new Schema({
  members: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  title: { type: String },
  importantList: { type: Boolean, required: true, default: false },
  products: [productWithAmountSchema],
  editLog: { type: Array, default: [] }
}, { timestamps: true });

module.exports = mongoose.model('ShoppingList', shoppingListSchema);
