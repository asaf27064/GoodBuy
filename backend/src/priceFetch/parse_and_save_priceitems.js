require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const MODE = process.argv[2] === 'update' ? 'update' : 'init';
const FILE_PATTERN = MODE === 'init'
  ? /^PriceFull(\d+)-(\d+)-/i
  : /^Prices?(\d+)-(\d+)-/i;

const cluster        = require('cluster');
const os             = require('os');
const path           = require('path');
const fs             = require('fs');
const { MongoClient }= require('mongodb');
const expat          = require('node-expat');

const MONGO_URI  = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error('Missing MONGO_URI');
  process.exit(1);
}

const XML_DIR    = path.join(__dirname, 'Downloads');
const COLL_NAME  = 'priceitems';
const TEMP_COLL  = COLL_NAME + '_tmp';
const PF_COLL    = 'pricefiles';
const CHAIN_COLL = 'chains';
const STORE_COLL = 'stores';
const NODES      = os.cpus().length;
const BATCH_SIZE = 20000;
const WRITE_OPTS = { ordered: false, writeConcern: { w: 0 } };

async function collectXmlFiles(dir) {
  const entries = await fs.promises.readdir(dir, { withFileTypes: true });
  let files = [];
  for (const ent of entries) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) files.push(...await collectXmlFiles(full));
    else if (/\.xml$/i.test(ent.name)) files.push(full);
  }
  return files;
}

async function master() {
  const client = await new MongoClient(MONGO_URI).connect();
  const db = client.db();

  if (MODE === 'init') {
    console.log(`🗑 Dropping temp collection ${TEMP_COLL}`);
    await db.collection(TEMP_COLL).drop().catch(() => {});
  }

  const allPaths = await collectXmlFiles(XML_DIR);
  const xmlPaths = allPaths.filter(fp => FILE_PATTERN.test(path.basename(fp)));
  if (!xmlPaths.length) {
    console.error(`No XML files found for mode=${MODE}`);
    process.exit(1);
  }
  console.log(`📦 Found ${xmlPaths.length} XML files for mode=${MODE}. Forking ${NODES} workers`);

  let totalInserted = 0;
  const sliceSize = Math.ceil(xmlPaths.length / NODES);
  const promises = [];
  for (let i = 0; i < NODES; i++) {
    const slice = xmlPaths.slice(i * sliceSize, (i + 1) * sliceSize);
    if (!slice.length) break;
    const env = { ...process.env, XML_SLICE: JSON.stringify(slice) };
    promises.push(new Promise((resolve, reject) => {
      const w = cluster.fork(env);
      w.on('message', msg => totalInserted += msg.inserted);
      w.on('exit', code => code === 0
        ? resolve()
        : reject(new Error(`Worker exit ${code}`)));
    }));
  }
  await Promise.all(promises);
  console.log(`🏁 All workers done, inserted ${totalInserted} docs`);

  if (MODE === 'init') {
    console.log(`🔄 Renaming ${TEMP_COLL} → ${COLL_NAME}`);
    await db.renameCollection(TEMP_COLL, COLL_NAME, { dropTarget: true });
    console.log(`🗑 Dropping leftover temp collection ${TEMP_COLL}`);
    await db.collection(TEMP_COLL).drop().catch(() => {});
    console.log('📈 Rebuilding indexes');
    const coll = db.collection(COLL_NAME);
    await Promise.all([
      coll.createIndex({ priceFile: 1, itemCode: 1 }),
      coll.createIndex({ itemCode: 1, chainId: 1 }),
      coll.createIndex({ itemPrice: 1 }),
      coll.createIndex({ storeRef: 1, itemCode: 1 })
    ]);
  }

  await client.close();
  process.exit(0);
}

async function worker() {
  const client = await new MongoClient(MONGO_URI).connect();
  const db = client.db();

  const coll = db.collection(MODE === 'init' ? TEMP_COLL : COLL_NAME);
  const pfColl = db.collection(PF_COLL);

  const chains = await db.collection(CHAIN_COLL)
    .find().project({ _id:1, chainId:1, chainName:1 }).toArray();
  const chainMap = new Map(chains.map(c => [
    c.chainId,
    { chainName: c.chainName, chainRef: c._id }
  ]));

  const stores = await db.collection(STORE_COLL)
    .find().project({ _id:1, chainRef:1, subChainId:1, storeId:1 }).toArray();
  const storeMap = new Map(stores.map(s => [
    `${s.chainRef}_${s.subChainId}_${s.storeId}`,
    s._id
  ]));

  const slice = JSON.parse(process.env.XML_SLICE || '[]');
  let inserted = 0;
  let batch = [];
  const pending = [];

  const flush = () => {
    if (!batch.length) return;
    const docs = batch;
    batch = [];

    let p;
    if (MODE === 'init') {
      p = coll.insertMany(docs, WRITE_OPTS)
        .then(() => { inserted += docs.length; })
        .catch(() => {});
    } else {
      const ops = docs.map(doc => ({
        updateOne: {
          filter: { priceFile: doc.priceFile, itemCode: doc.itemCode },
          update: { $set: doc },
          upsert: true
        }
      }));
      p = coll.bulkWrite(ops, { ordered: false, writeConcern: { w: 0 } })
        .then(res => { inserted += res.upsertedCount + res.modifiedCount; })
        .catch(() => {});
    }

    pending.push(p);
  };

  for (const filePath of slice) {
    const fileName = path.basename(filePath);
    const m = fileName.match(FILE_PATTERN);
    if (!m) continue;
    const [, chainIdRaw, storeIdRaw] = m;
    const chainInfo = chainMap.get(chainIdRaw);
    if (!chainInfo) continue;

    let subChainId = '1';
    let storeRef = storeMap.get(`${chainInfo.chainRef}_${subChainId}_${storeIdRaw}`);
    if (!storeRef) {
      for (const [k, v] of storeMap) {
        if (k.endsWith(`_${storeIdRaw}`)) {
          storeRef = v;
          subChainId = k.split('_')[1];
          console.warn(`⚠️ Fallback store for ${fileName}: subChainId=${subChainId}`);
          break;
        }
      }
    }
    if (!storeRef) {
      console.warn(`⛔ No storeRef for file ${fileName}, skipping`);
      continue;
    }

    const up = await pfColl.updateOne(
      { storeRef },
      { $set: { fileName, fetchedAt: new Date() } },
      { upsert: true }
    );
    const pfDoc = up.upsertedId
      ? { _id: up.upsertedId._id }
      : await pfColl.findOne(
          { storeRef },
          { projection: { _id: 1 } }
        );
    const pfId = pfDoc._id;

    await new Promise(resolve => {
      const parser = new expat.Parser();
      let curr = null;
      let tag = null;

      parser.on('startElement', name => {
        if (name.toLowerCase() === 'item') {
          curr = {
            priceFile: pfId,
            storeRef,               // <-- הוספת השדה storeRef
            chainId:   chainIdRaw,
            chainName: chainInfo.chainName
          };
        } else if (curr) {
          tag = name;
        }
      });

      parser.on('text', txt => {
        if (curr && tag) curr[tag] = (curr[tag] || '') + txt;
      });

      parser.on('endElement', name => {
        if (name.toLowerCase() === 'item' && curr) {
          batch.push({
            priceFile:           curr.priceFile,
            storeRef:            curr.storeRef,    // <-- הוספת השדה storeRef
            chainId:             curr.chainId,
            chainName:           curr.chainName,
            itemCode:            String(curr.ItemCode),
            priceUpdateDate:     curr.PriceUpdateDate
                                      ? new Date(curr.PriceUpdateDate)
                                      : curr.PriceUpdateTime
                                        ? new Date(curr.PriceUpdateTime)
                                        : null,
            lastSaleDateTime:    curr.LastSaleDateTime
                                      ? new Date(curr.LastSaleDateTime)
                                      : null,
            itemType:            Number(curr.ItemType || curr.itemType) || 0,
            itemName:            curr.ItemName || '',
            manufacturerName:    curr.ManufacturerName || curr.ManufactureName || '',
            manufactureCountry:  curr.ManufactureCountry || '',
            itemDescription:     curr.ManufacturerItemDescription || '',
            unitQty:             curr.UnitQty || '',
            quantity:            parseFloat(curr.Quantity) || 0,
            unitOfMeasure:       curr.UnitOfMeasure || curr.UnitMeasure || '',
            isWeighted:          ['1','true'].includes(
                                    String(curr.BisWeighted || curr.bIsWeighted || '')
                                    .toLowerCase()
                                  ),
            qtyInPackage:        parseFloat(curr.QtyInPackage) || 0,
            itemPrice:           parseFloat(curr.ItemPrice) || 0,
            unitOfMeasurePrice:  parseFloat(
                                    curr.UnitOfMeasurePrice || curr.UnitMeasurePrice
                                  ) || 0,
            allowDiscount:       ['1','true'].includes(
                                    String(curr.AllowDiscount || '').toLowerCase()
                                  ),
            itemStatus:          Number(curr.ItemStatus || curr.itemStatus) || 0,
            itemId:              curr.ItemId || null
          });
          curr = null;
        }
        tag = null;
        if (batch.length >= BATCH_SIZE) flush();
      });

      parser.on('end', () => {
        flush();
        Promise.all(pending).then(resolve);
      });

      parser.on('error', () => resolve());

      fs.createReadStream(filePath).pipe(parser);
    });
  }

  process.send({ inserted });
  await client.close();
  process.exit(0);
}

if (cluster.isMaster) master();
else worker();
