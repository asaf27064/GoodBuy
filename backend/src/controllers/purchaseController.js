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
        console.log(req.body);

        const updatedList = await shoppingListService.emptyProductsAndEditLog(req.body.listId);

        if (!updatedList) {
            return res.status(404).json({ error: 'List not found' });
        }

        const newPurchase = new Purchase ({ 
            listId: req.body.listId, 
            timeStamp: req.body.timestamp,
            products: req.body.purchasedProducts,
        })

        
        await newPurchase.save();
        res.status(201).json(newPurchase);
    }
    
    catch (error) {
        res.status(500).json({ error: error.message });
    }
};