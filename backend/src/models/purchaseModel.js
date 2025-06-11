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

module.exports = mongoose.model('Purchase', purchaseSchema)
