const ShoppingList = require('../models/shoppingListModel');

exports.getListsByUserId = async function(user_id) {

    return await ShoppingList.find({ members: user_id });
};

exports.emptyProductsAndEditLog = async function(listId) {
    const updatedList = await ShoppingList.findByIdAndUpdate(listId, {$set: {products: [], editLog: []}}, {new: true});
    return updatedList;
};