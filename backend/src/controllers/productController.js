// backend/src/controllers/productController.js
const PriceItem = require('../models/PriceItem');
const mongoose = require('mongoose');

// 1. Search by name (deduped, case-insensitive, indexed prefix search)
exports.searchItems = async (req, res) => {
  const term = req.params.name;
  try {
    // prefix regex so Mongo will hit the itemName index
    const regex = new RegExp('^' + term, 'i');
    const results = await PriceItem.aggregate([
      { $match: { itemName: { $regex: regex } } },
      {
        $group: {
          _id: '$itemName',
          doc: { $first: '$$ROOT' }
        }
      },
      { $replaceRoot: { newRoot: '$doc' } },
      {
        $project: {
          _id: 1,
          itemName: 1,
          itemDescription: 1,
          itemPrice: 1
        }
      },
      { $limit: 50 }
    ]);
    res.json({ results });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// 2. (Optional) If you still need a by-id lookup on PriceItem:
exports.getById = async (req, res) => {
  try {
    const pi = await PriceItem.findById(req.params.id);
    if (!pi) return res.status(404).json({ message: 'Not found' });
    res.json(pi);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// 3. List-price endpoint (if still used)
exports.getListPriceInStores = async (req, res) => {
  // ... your existing implementation, or remove if unused
  res.status(501).json({ message: 'Not implemented' });
};
