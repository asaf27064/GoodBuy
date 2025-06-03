// File: models/Purchase.js

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * PurchaseSchema records a single “checkout” event.
 * Fields:
 *   - userId:       ObjectId → the User who made this purchase
 *   - listId:       (optional) ObjectId → if you have a shared List, reference it
 *   - timestamp:    Date → when this purchase was created (default: now)
 *   - items:        Array of { priceItemId, quantity }
 */
const PurchaseSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',      // Reference to the User making the purchase
    required: true
  },
  listId: {
    type: Schema.Types.ObjectId,
    ref: 'List',      // (Optional) Reference to a shared List (if used)
    default: null
  },
  timestamp: {
    type: Date,
    default: Date.now // Use current date/time if not supplied
  },
  items: [
    {
      priceItemId: {
        type: Schema.Types.ObjectId,
        ref: 'PriceItem', // Reference to a PriceItem document
        required: true
      },
      quantity: {
        type: Number,
        default: 1       // Default quantity is 1 if not specified
      }
    }
  ]
});

// Export the Purchase model
module.exports = mongoose.model('Purchase', PurchaseSchema);
