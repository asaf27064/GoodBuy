// models/PriceItem.js
const mongoose = require('mongoose');

const PriceItemSchema = new mongoose.Schema({
  // Reference to the PriceFile
  priceFile:          { type: mongoose.Types.ObjectId, ref: 'PriceFile', required: true, index: true },

  // SKU identifier
  itemCode:           { type: String, required: true, index: true },

  // Pricing & metadata
  priceUpdateDate:    { type: Date },
  lastSaleDateTime:   { type: Date },
  itemType:           { type: Number },
  itemName:           { type: String },
  manufacturerName:   { type: String },
  manufactureCountry: { type: String },
  itemDescription:    { type: String },
  unitQty:            { type: String },
  quantity:           { type: Number },
  unitOfMeasure:      { type: String },
  isWeighted:         { type: Boolean },
  qtyInPackage:       { type: Number },
  itemPrice:          { type: Number, index: true },
  unitOfMeasurePrice: { type: Number },
  allowDiscount:      { type: Boolean },
  itemStatus:         { type: Number },

  // Unique item identifier (optional)
  itemId:             { type: String },

  // Image URL for this SKU
  imageUrl:           { type: String }
}, { timestamps: true });

// Composite unique index to prevent duplicate items in the same file
PriceItemSchema.index(
  { priceFile: 1, itemCode: 1 },
  { unique: true }
);

module.exports = mongoose.model('PriceItem', PriceItemSchema);
