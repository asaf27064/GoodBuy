const RecommendationService = require('../services/recommendationService')
const ShoppingList           = require('../models/shoppingListModel')
const Purchase               = require('../models/purchaseModel')

exports.getRecs = async (req, res) => {
  try {
    const userId = req.user.id
    const listId = req.query.listId
    const list   = await ShoppingList.findById(listId)
    if (!list) return res.status(404).json({ error: 'List not found' })

    const history = await Purchase.find({ purchasedBy: userId })
    const recs = RecommendationService.recommend(
      userId,
      list.products,
      history,
      5
    )
    // Enrich each recommendation with product details (name, image) from the embedded history:
    const detailed = recs.map(r => {
      // find one example product in history to grab its metadata
      const match = history
        .flatMap(b => b.products)
        .find(p => p.product.itemCode === r.itemCode)
      return {
        ...r,
        name:  match.product.name,
        image: match.product.image
      }
    })
    res.json(detailed)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
}
