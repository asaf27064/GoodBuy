const RecommendationService = require('../services/recommendationService')
const ShoppingListModel    = require('../models/shoppingListModel')
const PurchaseModel        = require('../models/purchaseModel')

exports.getRecs = async (req, res) => {
  try {
    const userId = req.user.id
    const listId = req.query.listId

    // Fetch the shopping list
    const list = await ShoppingListModel.findById(listId)
    if (!list) return res.status(404).json({ error: 'List not found' })

    // Fetch user's purchase history
    const history = await PurchaseModel.find({ purchasedBy: userId })

    // Compute recommendations
    const recs = await RecommendationService.recommend(
      userId,
      list.products,
      history,
      5
    )

    // Enrich with product metadata (name, image)
    const detailed = recs.map(r => {
      // Find a sample purchase to retrieve product metadata
      const match = history
        .flatMap(b => b.products)
        .find(p => p.product.itemCode === r.itemCode)

      return {
        ...r,
        name:  match?.product.name  || '',
        image: match?.product.image || ''
      }
    })

    return res.json(detailed)
  } catch (error) {
    console.error('Recommendation error:', error)
    return res.status(500).json({ error: error.message })
  }
}
