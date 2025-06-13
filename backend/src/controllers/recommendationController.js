// backend/src/controllers/recommendationController.js

const RecommendationService = require('../services/recommendationService')
const ShoppingList          = require('../models/shoppingListModel')
const Purchase              = require('../models/purchaseModel')
const Product               = require('../models/productModel')

exports.getRecs = async (req, res) => {
  try {
    const userId = req.user.id
    const listId = req.query.listId

    // Load the shopping list
    const list = await ShoppingList.findById(listId)
    if (!list) return res.status(404).json({ error: 'List not found' })

    // Load user's purchase history
    const history = await Purchase.find({ purchasedBy: userId })

    // Compute recommendations
    console.time('recommendation')
    const recs = await RecommendationService.recommend(
      userId,
      list.products,
      history,
      5
    )
    console.timeEnd('recommendation')

    // Bulk-fetch product metadata by _id
    const codes    = recs.map(r => r.itemCode)
    const prodDocs = await Product.find({
      $or: [
        { _id:      { $in: codes } }
      ]
    }).lean()

    // Key map by the string value of _id (your itemCode)
    const prodMap  = Object.fromEntries(
      prodDocs.map(p => [p._id.toString(), p])
    )

    // Enrich and respond
    const detailed = recs.map(r => {
      // do we have a match in the user's own history?
      const match = history
        .flatMap(b => b.products)
        .find(p => p.product.itemCode === r.itemCode)

      // look up the catalog entry
      const meta = prodMap[r.itemCode] || {}

      return {
        itemCode:      r.itemCode,
        score:         r.score,
        method:        r.method,
        lastPurchased: r.lastPurchased,
        // prefer history-name, then catalog name, else code
        name:          match?.product.name || meta.name || r.itemCode,
        // likewise image
        image:         match?.product.image || meta.image || null
      }
    })

    res.json(detailed)
  } catch (error) {
    console.error('Recommendation error:', error)
    res.status(500).json({ error: error.message })
  }
}
