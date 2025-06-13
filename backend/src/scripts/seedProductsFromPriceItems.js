const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose  = require('mongoose')
const PriceItem = require('../models/PriceItem')
const Product   = require('../models/productModel')

async function main() {
  await mongoose.connect(process.env.MONGO_URI)

  // Aggregate one record per itemCode, grabbing name & description
  const items = await PriceItem.aggregate([
    { $sort: { priceUpdateDate: -1 } }, 
    {
      $group: {
        _id: '$itemCode',
        name:        { $first: '$itemName' },
        description: { $first: '$itemDescription' }
      }
    }
  ])

  // 2 Map into Product, with fallback for missing names
  const docs = items.map(i => ({
    _id:      i._id, 
    name:     i.name || i.description || i._id, 
    image:    PriceItem.schema.virtuals.imageUrl.getters[0].call({ itemCode: i._id }),
    category: ''
  }))

  // Overwrite existing Product collection
  await Product.deleteMany({})
  const res = await Product.insertMany(docs)
  console.log(`Seeded ${res.length} products from PriceItem.`)
  process.exit(0)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
