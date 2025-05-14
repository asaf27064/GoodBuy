const mongoose = require('mongoose');

const StoreSchema = new mongoose.Schema({
  chainRef:    { type: mongoose.Types.ObjectId, ref: 'Chain', required: true, index: true },
  subChainId:  { type: String, required: true, index: true },
  subChainName:{ type: String },
  storeId:     { type: String, required: true, index: true },
  bikoretNo:   { type: String },
  storeType:   { type: Number },
  storeName:   { type: String },
  address:     { type: String },
  city:        { type: String },
  zipCode:     { type: String },
  lastUpdate:  { type: Date },
  latitude:    { type: Number },
  longitude:   { type: Number }
}, { timestamps: true });

StoreSchema.index(
  { chainRef: 1, subChainId: 1, storeId: 1 },
  { unique: true }
);

StoreSchema.add({
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      default: [0, 0]
    }
  }
});

StoreSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Store', StoreSchema);
