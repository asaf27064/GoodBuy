const Item = require('../models/item');

exports.getItems = async (req, res) => {
    try {
        const items = await Item.find();
        res.json(items);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.addItem = async (req, res) => {
    try {
        const newItem = new Item({ name: req.body.name, quantity })
        await newItem.save();
        res.status(201).json(newItem);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.deleteItem = async (req, res) => {
    try {
        const { id } = req.params;
        const deletedItem = await Item.findByIdAndDelete(id);
        if (!deletedItem) {
            return res.status(404).json({ error: 'Item not found' });

        }
        res.json({ message: 'Item deleted successfully', item: deletedItem });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.updateItem = async (req, res) => {
    try {
        const { id } = req.params;
        const { quantity } = req.body;
        const updatedItem = await Item.findByIdAndUpdate(id, quantity, { new: true });
        if (!updatedItem) {
            return res.status(404).json({ error: 'Item not found' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};