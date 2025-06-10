// backend/src/controllers/productController.js
// Assumes your server entrypoint runs `require('dotenv').config()`

const PriceItem = require('../models/PriceItem')
const ItemImage = require('../models/ItemImage')
const mongoose = require('mongoose')
const ObjectId = mongoose.Types.ObjectId

/**
 * GET /api/Products/search/:name
 * Returns up to 30 unique items matching the name,
 * with imageUrl built from the virtual, sorted so that
 * items with a found image appear first.
 */
exports.searchItems = async (req, res) => {
  const searchTerm = req.params.name
  try {
    // 1. Aggregate unique PriceItems by itemCode & name
    const docs = await PriceItem.aggregate([
      { $match: { itemName: { $regex: searchTerm, $options: 'i' } } },
      {
        $group: {
          _id: '$itemCode',
          itemCode: { $first: '$itemCode' },
          itemName: { $first: '$itemName' }
        }
      },
      { $limit: 30 }
    ])

    // 2. Build the base results array with imageUrl via virtual
    const base = process.env.PUBLIC_DEV_URL || ''
    const items = docs.map(d => ({
      itemCode: d.itemCode,
      itemName: d.itemName,
      imageUrl: base
        ? `${base}/images/${d.itemCode}.png`
        : null
    }))

    // 3. Batch-fetch which codes actually have a found image
    const codes = items.map(i => i.itemCode)
    const images = await ItemImage.find(
      { itemCode: { $in: codes }, status: 'found' },
      'itemCode'
    ).lean()

    const foundSet = new Set(images.map(i => i.itemCode))

    // 4. Sort so that items with images come first
    items.sort((a, b) => {
      const aHas = foundSet.has(a.itemCode)
      const bHas = foundSet.has(b.itemCode)
      if (aHas && !bHas) return -1
      if (!aHas && bHas) return 1
      return 0
    })

    return res.json({ results: items })
  } catch (err) {
    console.error('searchItems error:', err)
    return res.status(500).json({ message: 'Server error' })
  }
}

/**
 * GET /api/Products/:id
 * Returns a single PriceItem by its Mongo ID, with imageUrl.
 */
exports.getById = async (req, res) => {
  try {
    const { id } = req.params
    const item = await PriceItem.findById(id, 'itemCode itemName itemPrice')
      .lean({ virtuals: true })
    if (!item) return res.status(404).json({ error: 'Item not found' })

    return res.json({
      itemCode:  item.itemCode,
      itemName:  item.itemName,
      itemPrice: item.itemPrice,
      imageUrl:  item.imageUrl
    })
  } catch (err) {
    console.error('getById error:', err)
    return res.status(500).json({ error: err.message })
  }
}

/**
 * GET /api/Products/list_price
 * (Optional) Unchanged
 */
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
