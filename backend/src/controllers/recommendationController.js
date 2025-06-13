const RecommendationService = require('../services/recommendationService');
const ShoppingList          = require('../models/shoppingListModel');
const Purchase              = require('../models/purchaseModel');
const Product               = require('../models/productModel');

exports.getRecs = async (req, res) => {
  try {
    const userId = req.user.id;
    const list   = await ShoppingList.findById(req.query.listId);
    if (!list) return res.status(404).json({ error: 'List not found' });

    const history = await Purchase.find({ purchasedBy: userId });

    console.time('recommendation');
    const recs = await RecommendationService.recommend(
      userId,
      list.products,
      history,
      5
    );
    console.timeEnd('recommendation');

    const docs = await Product.find({ _id: { $in: recs.map(r => r.itemCode) } }).lean();
    const prodMap = Object.fromEntries(docs.map(p => [p._id.toString(), p]));

    const detailed = recs.map(r => {
      const meta  = prodMap[r.itemCode] || {};
      const match = history
        .flatMap(b => b.products)
        .find(p => p.product.itemCode === r.itemCode);

      const name = r.method === 'ai'
        ? r.suggestionName
        : (match?.product.name || meta.name || r.itemCode);

      return {
        itemCode:        r.itemCode,
        score:           r.score,
        method:          r.method,
        lastPurchased:   r.lastPurchased,
        name,
        image:           match?.product.image || meta.image || null,
        suggestionReason: r.suggestionReason
      };
    });

    res.json(detailed);
  } catch (error) {
    console.error('Recommendation error:', error);
    res.status(500).json({ error: error.message });
  }
};
