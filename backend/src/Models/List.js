// File: models/List.js

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * ListSchema allows a group of users to collaboratively build a “shopping list.”
 * Fields:
 *   - name:      String (e.g., "Weekly Groceries")
 *   - members:   [ObjectId] → references to User documents
 *   - items:     Array of { priceItemId, quantity }
 *   - isCart:    Boolean → if you want to treat this List as a personal Cart
 *   - createdAt: Date
 *   - updatedAt: Date
 */
const ListSchema = new Schema({
  name: {
    type: String,
    required: true
  },
  members: [
    {
      type: Schema.Types.ObjectId,
      ref: 'User'      // Users who can view/edit this list
    }
  ],
  items: [
    {
      priceItemId: {
        type: Schema.Types.ObjectId,
        ref: 'PriceItem',
        required: true
      },
      quantity: {
        type: Number,
        default: 1
      }
    }
  ],
  isCart: {
    type: Boolean,
    default: false   // If you want to flag this List as a personal Cart (not needed if you skip “cart”)
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update updatedAt on every save
ListSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('List', ListSchema);
