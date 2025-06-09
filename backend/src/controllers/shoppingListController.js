const ShoppingList = require('../models/shoppingListModel');

exports.getAllUserShoppingLists = async (req, res) => {
  try {
    const userId = req.user.sub || req.user._id;
    const lists = await ShoppingList.find({ members: userId })
      .populate('members', '-passwordHash');
    return res.json(lists);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

exports.createList = async (req, res) => {
  try {
    const { title, importantList, members } = req.body;
    const newList = new ShoppingList({
      title,
      importantList,
      members,
      products: [],
      editLog: []
    });
    await newList.save();
    const populated = await newList.populate('members', '-passwordHash');
    return res.status(201).json(populated);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

exports.getShoppingList = async (req, res) => {
  try {
    const list = await ShoppingList.findById(req.params.id);
    if (!list) return res.status(404).json({ error: 'List not found' });
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateListProducts = async (req, res) => {
  try {
    const { list, changes } = req.body;
    const updated = await ShoppingList.findByIdAndUpdate(
      list._id,
      {
        $set: { products: list.products },
        $push: { editLog: { $each: changes } }
      },
      { new: true }
    );
    if (!updated) return res.status(404).json({ error: 'List not found' });
    res.json({ message: 'List updated successfully', list: updated });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
