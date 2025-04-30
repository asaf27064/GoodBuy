const mongoose = require('mongoose');
const fs       = require('fs').promises;
const path     = require('path');
const xml2js   = require('xml2js');
const pLimit   = require('p-limit').default;
const Chain     = require('../models/Chain');
const Store     = require('../models/Store');
const PriceFile = require('../models/PriceFile');
const PriceItem = require('../models/PriceItem');
require('dotenv').config({ path: path.join(__dirname, '../.env') });


async function main() {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) process.exit(1);
  await mongoose.connect(mongoUri);
  console.log('✅ Connected to MongoDB');

  // reuse parser
  const parser = new xml2js.Parser({ explicitArray: false });

  // find all XMLs
  async function findXmlFiles(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    let files = [];
    for (const ent of entries) {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) files = files.concat(await findXmlFiles(full));
      else if (ent.isFile() && ent.name.toLowerCase().endsWith('.xml')) files.push(full);
    }
    return files;
  }

  const xmlPaths = await findXmlFiles(path.join(__dirname, 'Downloads'));
  console.log(`Found ${xmlPaths.length} files to process`);

  const chainCache = new Map();
  const storeCache = new Map();
  const fileCache  = new Map();

  // up to 8 in parallel
  const limit = pLimit(8);
  const counts = await Promise.all(
    xmlPaths.map(p => limit(() => processFile(p, parser, chainCache, storeCache, fileCache)))
  );
  const total = counts.reduce((sum, n) => sum + n, 0);

  console.log(`\n🏁 Done — processed total ${total} items`);

  console.log('🔄 Syncing images from Drive + fetching missing from CHP…');
  const syncImages = require('./sync_and_update_images');
  await syncImages();

  await mongoose.disconnect();
}

async function processFile(xmlPath, parser, chainCache, storeCache, fileCache) {
  const xmlName = path.basename(xmlPath);
  try {
    const xml    = await fs.readFile(xmlPath, 'utf8');
    const parsed = await parser.parseStringPromise(xml);
    const root   = parsed.Prices || parsed.Root || parsed.prices || parsed.root;
    if (!root) throw new Error('Unrecognized XML');

    // IDs
    const chainIdRaw    = root.ChainID   || root.ChainId   || root.chainid;
    const subChainIdRaw = root.SubChainID|| root.SubChainId|| root.subchainid;
    const storeIdRaw    = root.StoreID   || root.StoreId   || root.storeid;
    if (!chainIdRaw || !storeIdRaw) throw new Error('Missing chainId or storeId');

    const chainId  = String(chainIdRaw);
    let   subChainId = String(subChainIdRaw || '');
    let   storeId    = String(storeIdRaw);
    // strip leading zeros
    subChainId = parseInt(subChainId, 10).toString();
    storeId    = parseInt(storeId,    10).toString();

    // Chain lookup & caching
    let chainDoc;
    if (chainCache.has(chainId)) {
      chainDoc = chainCache.get(chainId);
    } else {
      chainDoc = await Chain.findOne({ chainId }).lean();
      if (!chainDoc) throw new Error(`Chain ${chainId} not found`);
      chainCache.set(chainId, chainDoc);
    }
    const chainRef  = chainDoc._id;
    const chainName = chainDoc.chainName;

    // Store lookup & caching
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

    // PriceFile upsert & caching
    let priceFileId;
    if (fileCache.has(storeRef)) {
      priceFileId = fileCache.get(storeRef);
      await PriceFile.updateOne({ _id: priceFileId }, { $set: { fileName: xmlName, fetchedAt: new Date() } });
    } else {
      const fileDoc = await PriceFile.findOneAndUpdate(
        { storeRef },
        { $set: { fileName: xmlName, fetchedAt: new Date() } },
        { upsert: true, new: true }
      ).lean();
      priceFileId = fileDoc._id;
      fileCache.set(storeRef, priceFileId);
    }

    // items array
    let items = root.Products?.Product || root.Items?.Item || root.products?.product;
    if (!items) return 0;
    if (!Array.isArray(items)) items = [items];

    // bulk upsert items with chain info
    const ops = items.map(it => ({
      updateOne: {
        filter: { priceFile: priceFileId, itemCode: it.ItemCode },
        update: { $set: {
          // newly denormalized fields:
          chainId,
          chainName,

          // existing price item fields:
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

main().catch(err => { console.error(err); process.exit(1); });