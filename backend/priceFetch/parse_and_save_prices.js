const mongoose   = require('mongoose');
const fs         = require('fs').promises;
const path       = require('path');
const os         = require('os');
const xml2js     = require('xml2js');
const pLimit     = require('p-limit').default;
const Chain      = require('../models/Chain');
const Store      = require('../models/Store');
const PriceFile  = require('../models/PriceFile');
const PriceItem  = require('../models/PriceItem');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function main() {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) process.exit(1);
  await mongoose.connect(mongoUri);
  console.log('✅ Connected to MongoDB');

  // preload all existing PriceFile docs to skip already-processed files
  const existingFiles = await PriceFile.find().lean();
  const fileCache = new Map(
    existingFiles.map(f => [ String(f.storeRef), f.fileName ])
  );

  const parser = new xml2js.Parser({ explicitArray: false });
  const xmlDir = path.join(__dirname, 'Downloads');
  const xmlPaths = await findXmlFiles(xmlDir);
  console.log(`📦 Found ${xmlPaths.length} files to process`);

  // preload chains & stores
  const allChains = await Chain.find().lean();
  const allStores = await Store.find().lean();
  const chainCache = new Map(allChains.map(c => [c.chainId, c]));
  const storeCache = new Map(
    allStores.map(s => [`${s.chainRef}_${s.subChainId}_${s.storeId}`, s._id])
  );

  // tune concurrency to your machine
  const CONCURRENCY = os.cpus().length * 2;
  const limit = pLimit(CONCURRENCY);

  // process all files in parallel, up to CONCURRENCY
  const results = await Promise.all(
    xmlPaths.map(xmlPath =>
      limit(() => processFile(xmlPath, parser, chainCache, storeCache, fileCache))
    )
  );
  const total = results.reduce((sum, n) => sum + n, 0);

  console.log(`\n🏁 Done — processed total ${total} items`);
  console.log('🔄 Syncing images from Drive + fetching missing from CHP…');
  await require('./sync_and_update_images')();
  await mongoose.disconnect();
}

async function findXmlFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(entries.map(async ent => {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) return findXmlFiles(full);
    if (ent.isFile() && ent.name.toLowerCase().endsWith('.xml')) return [full];
    return [];
  }));
  return files.flat();
}

async function processFile(xmlPath, parser, chainCache, storeCache, fileCache) {
  const xmlName = path.basename(xmlPath);
  const t0 = Date.now();
  try {
    const xml    = await fs.readFile(xmlPath, 'utf8');
    const parsed = await parser.parseStringPromise(xml);
    const root   = parsed.Prices || parsed.Root || parsed.prices || parsed.root;
    if (!root) throw new Error('Unrecognized XML');

    // extract identifiers
    const chainIdRaw    = root.ChainID   || root.ChainId   || root.chainid;
    const subChainIdRaw = root.SubChainID|| root.SubChainId|| root.subchainid;
    const storeIdRaw    = root.StoreID   || root.StoreId   || root.storeid;
    if (!chainIdRaw || !storeIdRaw) throw new Error('Missing chainId or storeId');

    const chainId  = String(chainIdRaw);
    let   subChainId = String(subChainIdRaw || '');
    let   storeId    = String(storeIdRaw);
    subChainId = parseInt(subChainId, 10).toString();
    storeId    = parseInt(storeId,    10).toString();

    const chainDoc = chainCache.get(chainId);
    if (!chainDoc) throw new Error(`Chain ${chainId} not found`);
    const chainRef  = chainDoc._id;
    const chainName = chainDoc.chainName;

    // find storeRef, with fallback
    let storeRef = storeCache.get(`${chainRef}_${subChainId}_${storeId}`);
    if (!storeRef) {
      for (const [k,v] of storeCache.entries()) {
        if (k.endsWith(`_${storeId}`)) {
          storeRef = v;
          subChainId = k.split('_')[1];
          console.warn(`⚠️ Fallback store for ${xmlName}: subChainId=${subChainId}`);
          break;
        }
      }
    }
    if (!storeRef) throw new Error(`Store ${chainId}/${subChainId}/${storeId} not found`);

    const storeKey = String(storeRef);
    // skip if already processed
    if (fileCache.get(storeKey) === xmlName) {
      console.log(`⏭️ Skipping ${xmlName} — already processed`);
      return 0;
    }

    // upsert PriceFile doc and update cache
    const pfDoc = await PriceFile.findOneAndUpdate(
      { storeRef },
      { $set: { fileName: xmlName, fetchedAt: new Date() } },
      { upsert: true, new: true }
    ).lean();
    fileCache.set(storeKey, xmlName);

    // collect items
    let items = root.Products?.Product || root.Items?.Item || root.products?.product;
    if (!items) return 0;
    if (!Array.isArray(items)) items = [items];

    // prepare bulk operations
    const ops = items.map(it => ({
      updateOne: {
        filter: { priceFile: pfDoc._id, itemCode: it.ItemCode },
        update: { $set: {
          chainId, chainName,
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
          itemId:             it.ItemId || null
        }},
        upsert: true
      }
    }));

    // execute unordered bulk writes in chunks
    for (let i = 0; i < ops.length; i += 500) {
      await PriceItem.bulkWrite(ops.slice(i, i + 500), { ordered: false });
    }

    console.log(`➕ ${xmlName}: ${items.length} items (${((Date.now() - t0)/1000).toFixed(1)}s)`);
    return items.length;

  } catch (e) {
    console.error(`⚠️ ${xmlName}: ${e.message}`);
    return 0;
  }
}

main().catch(err => { console.error(err); process.exit(1); });
