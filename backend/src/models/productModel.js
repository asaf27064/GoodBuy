const mongoose = require('mongoose')
const { Schema } = mongoose

const productSchema = new Schema({
  _id: { type: String, required: true },
  name: { type: String, required: true },
  image: { type: String, default: '' },
})

module.exports = mongoose.model('Product', productSchema)
