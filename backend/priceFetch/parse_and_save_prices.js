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

  const parser = new xml2js.Parser({ explicitArray: false });

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

  const xmlPaths = await findXmlFiles(path.join(__dirname, 'Downloads'));
  console.log(`📦 Found ${xmlPaths.length} files to process`);

  // Preload and cache all chains and stores
  const allChains = await Chain.find().lean();
  const allStores = await Store.find().lean();
  const chainCache = new Map(allChains.map(c => [c.chainId, c]));
  const storeCache = new Map();
  for (const s of allStores) {
    const key = `${s.chainRef}_${s.subChainId}_${s.storeId}`;
    storeCache.set(key, s._id);
  }

  const fileCache = new Map();
  const limit = pLimit(8);
  const batchSize = 20;
  let total = 0;

  for (let i = 0; i < xmlPaths.length; i += batchSize) {
    const batch = xmlPaths.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map(p => limit(() => processFile(p, parser, chainCache, storeCache, fileCache)))
    );
    const sum = results.reduce((a, b) => a + b, 0);
    total += sum;
    console.log(`✅ Batch ${i / batchSize + 1} done: ${sum} items`);
  }

  console.log(`\n🏁 Done — processed total ${total} items`);
  console.log('🔄 Syncing images from Drive + fetching missing from CHP…');
  const syncImages = require('./sync_and_update_images');
  await syncImages();
  await mongoose.disconnect();
}

async function processFile(xmlPath, parser, chainCache, storeCache, fileCache) {
  const xmlName = path.basename(xmlPath);
  const t0 = Date.now();
  try {
    const xml    = await fs.readFile(xmlPath, 'utf8');
    const parsed = await parser.parseStringPromise(xml);
    const root   = parsed.Prices || parsed.Root || parsed.prices || parsed.root;
    if (!root) throw new Error('Unrecognized XML');

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

    let storeRef = storeCache.get(`${chainRef}_${subChainId}_${storeId}`);
    if (!storeRef) {
      const fallbackKey = Array.from(storeCache.entries()).find(([k, v]) =>
        k.startsWith(`${chainRef}_`) && k.endsWith(`_${storeId}`)
      );
      if (fallbackKey) {
        storeRef = fallbackKey[1];
        subChainId = fallbackKey[0].split('_')[1];
        console.warn(`⚠️ Fallback matched store for ${xmlName}: using subChainId=${subChainId}`);
      }
    }
    if (!storeRef) throw new Error(`Store ${chainId}/${subChainId}/${storeId} not found`);

    let existingFile = null;
    if (fileCache.has(storeRef)) {
      existingFile = await PriceFile.findById(fileCache.get(storeRef)).lean();
    } else {
      existingFile = await PriceFile.findOne({ storeRef }).lean();
      if (existingFile) fileCache.set(storeRef, existingFile._id);
    }
    if (existingFile && existingFile.fileName === xmlName) {
      console.log(`⏭️ Skipping ${xmlName} — already processed`);
      return 0;
    }

    let priceFileId;
    if (existingFile) {
      priceFileId = existingFile._id;
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

    let items = root.Products?.Product || root.Items?.Item || root.products?.product;
    if (!items) return 0;
    if (!Array.isArray(items)) items = [items];

    const ops = items.map(it => ({
      updateOne: {
        filter: { priceFile: priceFileId, itemCode: it.ItemCode },
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

    const chunkSize = 500;
    for (let i = 0; i < ops.length; i += chunkSize) {
      await PriceItem.bulkWrite(ops.slice(i, i + chunkSize));
    }

    console.log(`➕ ${xmlName}: ${items.length} items (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
    return items.length;
  } catch (e) {
    console.error(`⚠️ ${xmlName}: ${e.message}`);
    return 0;
  }
}

main().catch(err => { console.error(err); process.exit(1); });
