const mongoose = require('mongoose')

const purchaseSchema = new mongoose.Schema({
  listId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ShoppingList',
    required: true
  },
  timeStamp: {
    type: Date,
    default: Date.now
  },
  purchasedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  products: [
    {
      product: {
        itemCode: { type: String, required: true },
        name:     { type: String, required: true },
        image:    { type: String },
        numUnits: { type: Number, default: 1 }
      },
      numUnits: {
        type: Number,
        required: true
      }
    }
  ]
})

purchaseSchema.index({ purchasedBy: 1, timeStamp: -1 })
purchaseSchema.index({ 'products.product.itemCode': 1 })

module.exports = mongoose.model('Purchase', purchaseSchema)
