// geocode_stores.js
require('dotenv').config();
const mongoose      = require('mongoose');
const geocodeGoogle = require('./geocode-google');
const geocodeOSM    = require('./geocode-util');
const Store         = require('./models/Store');

async function enrichStores() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ Connected to MongoDB');

  // Find stores missing real coordinates or still with [0,0]
  const stores = await Store.find({
    $or: [
      { 'location.coordinates': { $exists: false } },
      { 'location.coordinates.0': 0, 'location.coordinates.1': 0 }
    ]
  }).select('_id address city zipCode');

  for (const s of stores) {
    let coords = null;

    // 1) Google Geocoding API
    if (s.address) {
      try {
        coords = await geocodeGoogle({ address: s.address, city: s.city, zip: s.zipCode });
        console.log(`➕ Google Geo for store ${s._id}: [${coords.lat},${coords.lng}]`);
      } catch (err) {
        console.warn(`⚠️ Google geocode failed for store ${s._id}: ${err.message}`);
      }
    }

    // 2) OpenStreetMap Nominatim (fallback)
    if (!coords && s.address) {
      try {
        coords = await geocodeOSM({ address: s.address, city: s.city, zip: s.zipCode });
        console.log(`➕ OSM Geo for store ${s._id}: [${coords.lat},${coords.lng}]`);
      } catch (err) {
        console.warn(`⚠️ OSM geocode failed for store ${s._id}: ${err.message}`);
      }
    }

    if (coords) {
      // Update only the location field to avoid validation errors on missing fields
      await Store.updateOne(
        { _id: s._id },
        { $set: { location: { type: 'Point', coordinates: [coords.lng, coords.lat] } } }
      );
      console.log(`✔️ Updated Geo for store ${s._id}`);
    } else {
      console.warn(`❌ No coords for store ${s._id}: Address='${s.address}', City='${s.city}', ZIP='${s.zipCode}'`);
    }
  }

  await mongoose.disconnect();
  console.log('🏁 Geocoding complete');
}

enrichStores().catch(err => {
  console.error(err);
  process.exit(1);
});
