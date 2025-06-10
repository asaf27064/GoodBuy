const Product = require('../models/productModel');
const PriceItem = require('../models/PriceItem');
const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;

exports.searchItems = async (req, res) => {
  const searchTerm = req.params.name;
  try {
    const matched = await PriceItem.aggregate([
      { $match: { itemName: { $regex: searchTerm, $options: 'i' } } },
      {
        $group: {
          _id: '$itemCode',
          itemCode: { $first: '$itemCode' },
          itemName: { $first: '$itemName' },
          imageUrl: { $first: '$imageUrl' },
          manufacturerName: { $first: '$manufacturerName' }
        }
      },
      { $limit: 30 }
    ]);
    res.json({ results: matched });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// Lookup product by id
exports.getById = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getListPriceInStores = async (req, res) => {
  try {
    const stores = JSON.parse(req.query.stores);
    const products = JSON.parse(req.query.products);

    if (!Array.isArray(stores) || !Array.isArray(products)) {
      return res.status(400).json({ error: 'Bad input' });
    }

    const result = [];
    for (let i = 0; i < stores.length; ++i) {
      const storeId = stores[i];
      const itemCodes = products.map(p => p.productId);

      const matched = await PriceItem.find({
        itemCode: { $in: itemCodes },
        storeRef: ObjectId(storeId)
      });

      result.push({ storeId, prices: matched });
    }
    res.json(result);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
