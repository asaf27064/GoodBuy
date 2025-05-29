// compare-stores-by-chainId.js
const { MongoClient } = require('mongodb');

async function run() {
  const uri = 'mongodb://localhost:27017';
  const client = new MongoClient(uri, { useUnifiedTopology: true });
  await client.connect();

  const dbOrig = client.db('GoodBuyGeoOriginalApiStores');
  const dbNew  = client.db('GoodBuy');

  const origChains = await dbOrig.collection('chains').find().toArray();
  const newChains  = await dbNew.collection('chains').find().toArray();

  // 1. Map origChainRef => chainId
  const origChainIdByRef = {};
  for (const c of origChains) {
    origChainIdByRef[c._id.toString()] = c.chainId;
  }

  // 2. Map chainId => newChainRef
  const newRefByChainId = {};
  for (const c of newChains) {
    newRefByChainId[c.chainId] = c._id;
  }

  console.log(`Loaded ${origChains.length} orig chains and ${newChains.length} new chains.`);

  const origCol = dbOrig.collection('stores');
  const newCol  = dbNew.collection('stores');

  const cursor = origCol.find();
  let missingCount = 0, mismatchCount = 0;

  while (await cursor.hasNext()) {
    const orig = await cursor.next();
    const origRef = orig.chainRef.toString();
    const chainId = origChainIdByRef[origRef];
    if (!chainId) {
      console.warn(`⛔️ Orig store ${orig._id} has unknown chainRef ${origRef}`);
      continue;
    }

    const newChainRef = newRefByChainId[chainId];
    if (!newChainRef) {
      console.warn(`⛔️ No matching chain in GoodBuy for chainId "${chainId}"`);
      continue;
    }

    const newStore = await newCol.findOne({
      chainRef:   newChainRef,
      subChainId: orig.subChainId,
      storeId:    orig.storeId
    });

    if (!newStore) {
      console.log(`⚠️ Missing in GoodBuy: chainId=${chainId}, subChainId=${orig.subChainId}, storeId=${orig.storeId}`);
      missingCount++;
      continue;
    }

    const [lon0, lat0] = orig.location.coordinates;
    const [lon1, lat1] = newStore.location.coordinates;
    if (lon0 !== lon1 || lat0 !== lat1) {
      console.log(
        `❗ MISMATCH [${chainId}|${orig.subChainId}|${orig.storeId}]: ` +
        `orig=${lat0.toFixed(6)},${lon0.toFixed(6)} vs new=${lat1.toFixed(6)},${lon1.toFixed(6)}`
      );
      mismatchCount++;
    }
  }

  console.log(`\nDone. Missing: ${missingCount}, Mismatches: ${mismatchCount}.`);
  await client.close();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
