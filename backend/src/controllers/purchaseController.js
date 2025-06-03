// File: controllers/purchaseController.js

const Purchase = require('../Models/Purchase');
const List     = require('../Models/List');

/**
 * Create a new Purchase (“checkout”).
 * Expects in req.body:
 *   - listId (optional): reference to a shared List if you’re checking out from one.
 *   - items: array of objects { priceItemId, quantity }
 *
 * Uses req.user._id (populated by auth middleware).
 */
exports.createPurchase = async (req, res) => {
  try {
    const userId = req.user._id;
    const { listId, items } = req.body;
    let purchaseItems = items;

    // If checking out from a shared List, verify that the current user is a member
    if (listId) {
      const listDoc = await List.findById(listId).lean();
      if (!listDoc) {
        return res.status(404).json({ message: 'List not found.' });
      }
      const isMember = listDoc.members.some(id => id.equals(userId));
      if (!isMember) {
        return res.status(403).json({ message: 'Not authorized for this list.' });
      }
    }

    // Create and save the Purchase
    const newPurchase = new Purchase({
      userId,
      listId: listId || null,
      items: purchaseItems
    });
    await newPurchase.save();

    return res.status(201).json({ message: 'Purchase recorded', purchase: newPurchase });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get the authenticated user’s purchase history, sorted from newest to oldest.
 * Populates each PriceItem field to retrieve itemName and itemPrice.
 */
exports.getMyPurchaseHistory = async (req, res) => {
  try {
    const userId = req.user._id;
    const purchases = await Purchase.find({ userId })
      .sort({ timestamp: -1 })
      .populate('items.priceItemId', 'itemName itemPrice')
      .lean();

    return res.status(200).json({ purchases });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
};
