const mongoose = require('mongoose');

const PriceItemSchema = new mongoose.Schema({
  storeRef:     { type: mongoose.Types.ObjectId, ref: 'Store', required: true, index: true },

  priceFile:    { type: mongoose.Types.ObjectId, ref: 'PriceFile', required: true, index: true },
  itemCode:     { type: String, required: true, index: true },

  chainId:      { type: String, required: true, index: true },
  chainName:    { type: String, required: true },

  priceUpdateDate:   { type: Date },
  lastSaleDateTime:  { type: Date },
  itemType:          { type: Number },
  itemName:          { type: String },
  manufacturerName:  { type: String },
  manufactureCountry:{ type: String },
  itemDescription:   { type: String },
  unitQty:           { type: String },
  quantity:          { type: Number },
  unitOfMeasure:     { type: String },
  isWeighted:        { type: Boolean },
  qtyInPackage:      { type: Number },
  itemPrice:         { type: Number, index: true },
  unitOfMeasurePrice:{ type: Number },
  allowDiscount:     { type: Boolean },
  itemStatus:        { type: Number },
  itemId:            { type: String },

}, {
  timestamps: true,
  toJSON:   { virtuals: true },
  toObject: { virtuals: true }
})

PriceItemSchema.virtual('imageUrl').get(function() {
  const base = process.env.PUBLIC_DEV_URL
  return base
    ? `${base}/images/${this.itemCode}.png`
    : null
})

module.exports = mongoose.model('PriceItem', PriceItemSchema)