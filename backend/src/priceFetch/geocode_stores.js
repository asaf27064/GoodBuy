require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose        = require('mongoose');
const geocodeGoogle   = require('./geocode-google');
const geocodeOSM      = require('./geocode-util');
const makeFingerprint = require('./fingerprint');
const Store           = require('../models/Store');
const pLimit          = require('p-limit').default;
const fs              = require('fs');
const path            = require('path');

const CACHE_PATH = path.join(__dirname, 'geocode-cache.json');
if (!fs.existsSync(CACHE_PATH)) {
  fs.writeFileSync(CACHE_PATH, '{}', 'utf8');
  console.log('🆕 Created new geocode-cache.json');
}

let cache = {};
try {
  cache = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8'));
} catch (err) {
  console.warn('⚠️ Failed to parse geocode-cache.json, starting with empty cache');
  cache = {};
}

const ALLOW_API = process.env.GEOCODE_API_ENABLED === 'true';

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ Connected to MongoDB');

  const stores = await Store.find({
    $or: [
      { 'location.coordinates': { $exists: false } },
      { 'location.coordinates.0': 0, 'location.coordinates.1': 0 }
    ]
  })
  .select('_id address city zipCode')
  .lean();

  console.log(`🔍 Need geocode for ${stores.length} stores`);
  const limit = pLimit(10);
  const ops = [];
  const failedStores = [];

  await Promise.all(stores.map(s => limit(async () => {
    const fp = makeFingerprint(s);
    let coords = cache[fp];

    if (coords) {
      console.log(`🗄️ cache hit for ${s._id}`);
    } else {
      if (!ALLOW_API) {
        console.error(`❌ API usage blocked for store ${s._id}. No cache entry.`);
        failedStores.push(s);
        return;
      }
      if (s.address) {
        try {
          coords = await geocodeGoogle(s);
        } catch (e) {
          console.warn(`⚠️ Google geocode failed for ${s._id}: ${e.message}`);
        }
      }
      if (!coords && s.address) {
        try {
          coords = await geocodeOSM(s);
        } catch (e) {
          console.warn(`⚠️ OSM geocode failed for ${s._id}: ${e.message}`);
        }
      }
      if (coords) {
        cache[fp] = coords;
        console.log(`💾 cache store for ${s._id}`);
      } else {
        failedStores.push(s);
        return;
      }
    }

    ops.push({
      updateOne: {
        filter: { _id: s._id },
        update: {
          $set: {
            location: {
              type: 'Point',
              coordinates: [coords.lng, coords.lat]
            }
          }
        }
      }
    });
    console.log(`✔️ Geocoded ${s._id}: ${coords.lat},${coords.lng}`);
  })));

  if (ops.length) {
    console.log(`⏳ Writing ${ops.length} updates to Mongo…`);
    await Store.bulkWrite(ops);
  }

  if (failedStores.length) {
    console.log(`❌ ${failedStores.length} stores failed geocoding. Deleting them…`);
    const idsToDelete = failedStores.map(s => s._id);
    const deleteResult = await Store.deleteMany({ _id: { $in: idsToDelete } });
    console.log(`🗑️ Deleted ${deleteResult.deletedCount} stores from database`);
  }

  try {
    fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2), 'utf8');
    console.log(`💾 Written ${Object.keys(cache).length} entries to geocode-cache.json`);
  } catch (err) {
    console.error(`❌ Failed to write geocode-cache.json: ${err.message}`);
  }

  console.log('🏁 Geocoding complete');
  await mongoose.disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
