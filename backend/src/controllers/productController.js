// backend/src/controllers/productController.js
// Make sure you called `require('dotenv').config()` in your entrypoint (server.js)

const PriceItem = require('../models/PriceItem')
const ItemImage = require('../models/ItemImage')
const mongoose = require('mongoose')
const ObjectId = mongoose.Types.ObjectId

// SEARCH: only PriceItems whose itemCode appears in ItemImage with status 'found'
exports.searchItems = async (req, res) => {
  const searchTerm = req.params.name
  try {
    const regex = new RegExp(searchTerm, 'i')
    const pipeline = [
      // 1. match product names
      { $match: { itemName: { $regex: regex } } },
      // 2. lookup into ItemImage by itemCode
      {
        $lookup: {
          from: 'itemimages',         // the Mongo collection name for ItemImage
          localField: 'itemCode',
          foreignField: 'itemCode',
          as: 'images'
        }
      },
      // 3. only keep those with at least one found image
      { $match: { 'images.status': 'found' } },
      // 4. group by itemCode to dedupe
      {
        $group: {
          _id: '$itemCode',
          itemCode: { $first: '$itemCode' },
          itemName: { $first: '$itemName' }
        }
      },
      // 5. limit results
      { $limit: 30 }
    ]

    const docs = await PriceItem.aggregate(pipeline)

    // 6. build final array with virtual imageUrl
    const base = process.env.PUBLIC_DEV_URL
    const results = docs.map(d => ({
      itemCode: d.itemCode,
      itemName: d.itemName,
      imageUrl: base
        ? `${base}/images/${d.itemCode}.png`
        : null
    }))

    return res.json({ results })
  } catch (err) {
    console.error('searchItems error:', err)
    return res.status(500).json({ message: 'Server error' })
  }
}

// GET BY ID (unchanged except ensuring imageUrl)
exports.getById = async (req, res) => {
  try {
    const { id } = req.params
    const item = await PriceItem.findById(id, 'itemCode itemName itemPrice')
      .lean()
    if (!item) return res.status(404).json({ error: 'Item not found' })

    const base = process.env.PUBLIC_DEV_URL
    return res.json({
      itemCode:  item.itemCode,
      itemName:  item.itemName,
      itemPrice: item.itemPrice,
      imageUrl:  base
        ? `${base}/images/${item.itemCode}.png`
        : null
    })
  } catch (err) {
    console.error('getById error:', err)
    return res.status(500).json({ error: err.message })
  }
}

// LIST-PRICE IN STORES (unchanged)
exports.getListPriceInStores = async (req, res) => {
  try {
    const stores   = JSON.parse(req.query.stores)
    const products = JSON.parse(req.query.products)

    if (!Array.isArray(stores) || !Array.isArray(products)) {
      return res.status(400).json({ error: 'Bad input format' })
    }

    const result = []
    for (const storeId of stores) {
      const itemCodes = products.map(p => p.productId)
      const matched   = await PriceItem.find({
        itemCode: { $in: itemCodes },
        storeRef: ObjectId(storeId)
      }).lean({ virtuals: true })

      result.push({ storeId, prices: matched })
    }

    return res.json(result)
  } catch (err) {
    console.error('getListPriceInStores error:', err)
    return res.status(500).json({ error: err.message })
  }
}
