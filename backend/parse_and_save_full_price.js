// parse_and_save_full_price.js
require('dotenv').config();
const mongoose = require('mongoose');
const fs       = require('fs').promises;
const path     = require('path');
const xml2js   = require('xml2js');
// concurrency limiter: npm install p-limit
const pLimit   = require('p-limit').default;
const Chain     = require('./models/Chain');
const Store     = require('./models/Store');
const PriceFile = require('./models/PriceFile');
const PriceItem = require('./models/PriceItem');

async function main() {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    console.error('✖️ MONGO_URI not set');
    process.exit(1);
  }

  await mongoose.connect(mongoUri);
  console.log('✅ Connected to MongoDB');

  // reuse parser
  const parser = new xml2js.Parser({ explicitArray: false });

  // find xml files
  async function findXmlFiles(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    let files = [];
    for (const ent of entries) {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        files = files.concat(await findXmlFiles(full));
      } else if (ent.isFile() && ent.name.toLowerCase().endsWith('.xml')) {
        files.push(full);
      }
    }
    return files;
  }

  const rootDir = path.join(__dirname, 'FullPriceXML');
  const xmlPaths = await findXmlFiles(rootDir);
  console.log(`Found ${xmlPaths.length} files to process`);

  // caches
  const chainCache = new Map();
  const storeCache = new Map();
  const fileCache  = new Map();

  // process in parallel
  const limit = pLimit(8);
  const tasks = xmlPaths.map(p => limit(() => processFile(p, parser, chainCache, storeCache, fileCache)));
  const results = await Promise.all(tasks);
  const total = results.reduce((sum, n) => sum + n, 0);

  console.log(`\n🏁 Done — processed total ${total} items`);
  await mongoose.disconnect();
}

async function processFile(xmlPath, parser, chainCache, storeCache, fileCache) {
  const xmlName = path.basename(xmlPath);
  try {
    const xml = await fs.readFile(xmlPath, 'utf8');
    const parsed = await parser.parseStringPromise(xml);

    // detect root
    const root = parsed.Prices || parsed.Root || parsed.prices || parsed.root;
    if (!root) throw new Error('Unrecognized XML structure');

    // extract IDs
    const chainIdRaw   = root.ChainID   || root.ChainId   || root.chainid;
    const subChainIdRaw= root.SubChainID|| root.SubChainId|| root.subchainid;
    const storeIdRaw   = root.StoreID   || root.StoreId   || root.storeid;
    if (!chainIdRaw || !storeIdRaw) throw new Error('Missing chainId or storeId');
    const chainId    = String(chainIdRaw);
    let subChainId   = String(subChainIdRaw || '');
    let storeId      = String(storeIdRaw);

    // normalize numeric (strip leading zeros)
    subChainId = parseInt(subChainId, 10).toString();
    storeId    = parseInt(storeId, 10).toString();

    // chain lookup
    let chainRef;
    if (chainCache.has(chainId)) {
      chainRef = chainCache.get(chainId);
    } else {
      const chainDoc = await Chain.findOne({ chainId }).lean();
      if (!chainDoc) throw new Error(`Chain ${chainId} not found`);
      chainRef = chainDoc._id;
      chainCache.set(chainId, chainRef);
    }

    // store lookup
    const storeKey = `${chainRef}_${subChainId}_${storeId}`;
    let storeRef;
    if (storeCache.has(storeKey)) {
      storeRef = storeCache.get(storeKey);
    } else {
      let storeDoc = await Store.findOne({ chainRef, subChainId, storeId }).lean();
      if (!storeDoc) {
        // fallback: ignore subChain
        storeDoc = await Store.findOne({ chainRef, storeId }).lean();
        if (storeDoc) {
          console.warn(`⚠️ Fallback matched store for ${xmlName}: using subChainId=${storeDoc.subChainId}`);
          subChainId = storeDoc.subChainId;
        }
      }
      if (!storeDoc) throw new Error(`Store ${chainId}/${subChainId}/${storeId} not found`);
      storeRef = storeDoc._id;
      storeCache.set(storeKey, storeRef);
    }

    // upsert PriceFile
    let priceFileId;
    if (fileCache.has(storeRef)) {
      priceFileId = fileCache.get(storeRef);
      await PriceFile.updateOne(
        { _id: priceFileId },
        { $set: { fileName: xmlName, fetchedAt: new Date() } }
      );
    } else {
      const fileDoc = await PriceFile.findOneAndUpdate(
        { storeRef },
        { $set: { fileName: xmlName, fetchedAt: new Date() } },
        { upsert: true, new: true }
      ).lean();
      priceFileId = fileDoc._id;
      fileCache.set(storeRef, priceFileId);
    }

    // extract items
    let items = root.Products?.Product || root.Items?.Item || root.products?.product;
    if (!items) return 0;
    if (!Array.isArray(items)) items = [items];

    // bulk upsert
    const ops = items.map(it => ({
      updateOne: {
        filter: { priceFile: priceFileId, itemCode: it.ItemCode },
        update: { $set: {
          priceUpdateDate:    it.PriceUpdateDate || it.PriceUpdateTime || null,
          lastSaleDateTime:   it.LastSaleDateTime || null,
          itemType:           Number(it.ItemType) || 0,
          itemName:           it.ItemName || '',
          manufacturerName:   it.ManufacturerName || it.ManufactureName || '',
          manufactureCountry: it.ManufactureCountry || '',
          itemDescription:    it.ManufacturerItemDescription || '',
          unitQty:            it.UnitQty || '',
          quantity:           parseFloat(it.Quantity) || 0,
          unitOfMeasure:      it.UnitOfMeasure || it.UnitMeasure || '',
          isWeighted:         ['1','true'].includes(String(it.BisWeighted).toLowerCase()),
          qtyInPackage:       parseFloat(it.QtyInPackage) || 0,
          itemPrice:          parseFloat(it.ItemPrice) || 0,
          unitOfMeasurePrice: parseFloat(it.UnitOfMeasurePrice) || 0,
          allowDiscount:      ['1','true'].includes(String(it.AllowDiscount).toLowerCase()),
          itemStatus:         Number(it.ItemStatus) || 0,
          itemId:             it.ItemId || null,
          imageUrl:           it.ImageUrl || null
        }},
        upsert: true
      }
    }));

    if (ops.length) await PriceItem.bulkWrite(ops);
    console.log(`➕ ${xmlName}: ${items.length} items`);
    return items.length;
  } catch (e) {
    console.error(`⚠️ ${xmlName}: ${e.message}`);
    return 0;
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
