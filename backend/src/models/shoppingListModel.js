const mongoose = require('mongoose')
const { Schema } = mongoose

const productRefSchema = new Schema({
  itemCode: { type: String, required: true },
  name: { type: String, required: true },
  image: { type: String, default: '' }
}, { _id: false })

const productQtySchema = new Schema({
  product: productRefSchema,
  numUnits: { type: Number, required: true, min: 1, default: 1 }
}, { _id: false })

const shoppingListSchema = new Schema({
  members: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  title: { type: String },
  importantList: { type: Boolean, default: false },
  products: [productQtySchema],
  editLog: { type: Array, default: [] },
  version: { type: Number, default: 0 }
}, { timestamps: true })

module.exports = mongoose.model('ShoppingList', shoppingListSchema)
