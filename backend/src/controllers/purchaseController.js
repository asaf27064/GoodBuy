const Purchase = require('../models/purchaseModel');
const shoppingListService = require('../services/shoppingListService');



exports.getUserPurchases = async (req, res) => {
    try {
        const { user_id } = req.params;

        const userLists =  await shoppingListService.getListsByUserId(user_id);

        
        const purchaseHistory = await Purchase.find({ listId: { $in: userLists } })
        if (!purchaseHistory) {
            return res.status(404).json({ error: 'Purchase History not found' });
        }


        res.json(purchaseHistory);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.createPurchase = async (req, res) => {
  try {
    const { listId, timestamp, purchasedProducts } = req.body
    const userId = req.user.id

    const updatedList = await shoppingListService.emptyProductsAndEditLog(listId)
    if (!updatedList) return res.status(404).json({ error: 'List not found' })

    const newPurchase = new Purchase({
      listId,
      timeStamp: timestamp,
      purchasedBy: userId,
      products: purchasedProducts
    })

    await newPurchase.save()
    res.status(201).json(newPurchase)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}