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

    // Load user purchase history
    const history = await Purchase.find({ purchasedBy: userId })

    // Compute recommendations
    const recs = await RecommendationService.recommend(
      userId,
      list.products,
      history,
      5
    )

    // Bulk-fetch product metadata
    const codes    = recs.map(r => r.itemCode)
    const prodDocs = await Product.find({ itemCode: { $in: codes } }).lean()
    const prodMap  = Object.fromEntries(prodDocs.map(p => [p.itemCode, p]))

    // respond
    const detailed = recs.map(r => {
      const match = history
        .flatMap(b => b.products)
        .find(p => p.product.itemCode === r.itemCode)
      const meta  = prodMap[r.itemCode] || {}
      return {
        itemCode:      r.itemCode,
        score:         r.score,
        method:        r.method,
        lastPurchased: r.lastPurchased,
        name:          match?.product.name  || meta.name  || 'Unknown Item',
        image:         match?.product.image || meta.image || null
      }
    })

    res.json(detailed)
  } catch (error) {
    console.error('Recommendation error:', error)
    res.status(500).json({ error: error.message })
  }
}
