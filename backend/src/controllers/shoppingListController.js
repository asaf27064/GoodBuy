const ShoppingList = require('../models/shoppingListModel');
const User = require('../Models/userModel');
const shoppingListService = require('../services/shoppingListService');


exports.getAllUserShoppingLists = async (req, res) => {
  try {
    const userId = req.user.sub || req.user._id
    const lists = await ShoppingList.find({ members: userId })
      .populate('members', '-passwordHash')
    return res.json(lists)
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}
  

exports.createList = async (req, res) => {


    try {

        const listMembers = await User.find({ username: { $in: req.body.members } })
        //find way to remove password field!!!


        console.log("Found " + listMembers);

        const newList = new ShoppingList ({ 
            title: req.body.title, 
            importantList: req.body.importantList,
            members: listMembers,
            products: [],
            editLog: []
        })

        console.log(newList);
        await newList.save();
        res.status(201).json(newList);
    }
    
    catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getShoppingList = async (req, res) => {
    try {
        const { id } = req.params;
        const list = await ShoppingList.findById(id);
        if (!list) {
            return res.status(404).json({ error: 'List not found' });
        }
        res.json(list);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.updateListProducts = async (req, res) => {
    try {
        const listId = req.body.list._id;
        console.log(req.body);
        const updatedProducts = req.body.list.products;

        const listChanges = req.body.changes;

        /*listChanges.added.forEach(addedItem => newEdits.push({product: addedItem, changedBy: editor, action: 'added', timeStamp: Date.now}));
        listChanges.removed.forEach(removedItem => newEdits.push({product: removedItem, changedBy: editor, action: 'removed', timeStamp: Date.now}))
        listChanges.modified.forEach(changedItem => {
            const unitDiff = changedItem.newAmount - changedItem.oldAmount;
            newEdits.push({product: changedItem.product,
            changedBy: editor, 
            action: 'updated',
            timeStamp: Date.now,
            diffrence: unitDiff})});*/

        // TODO: consider adding "how many units were added" in "added" changes


        const updatedList = await ShoppingList.findByIdAndUpdate(listId, {$set: {products: updatedProducts}, $push: {editLog: {$each: listChanges}}}, {new: true});
            if (!updatedList) {
                return res.status(404).json({ error: 'List not found' });
            }

        res.json({ message: 'List updated successfully', list: updatedList });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};