require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const xml2js = require('xml2js');
const iconv = require('iconv-lite');
const Chain = require('./models/Chain');
const Store = require('./models/Store');

const DOWNLOAD_DIR = path.join(__dirname, 'StoresXML');
const MONGO_URI = process.env.MONGO_URI;
// Map of known chainId to canonical chainName overrides
const CHAIN_NAME_OVERRIDES = {
  '7290172900007': 'סופר פארם',
  '7290058197699': 'גוד פארם',
  '7290492000005': 'דור אלון',
  '7290058249350': 'וולט מרקט',
  '7290455000004': 'ח. כהן סוכנות מזון ומשקאות בע"מ',
  '7290696200003': 'ויקטורי',
  '7290661400001': 'מחסני השוק',
  '7290058173198': 'זול ובגדול',
  '7290873255550': 'טיב טעם',
  '7290725900003': 'יינות ביתן',
  '7290055700007': 'מגה בעיר',
  '7290700100008': 'חצי חינם',
  '7290803800003': 'יוחננוף',
  '7290103152017': 'אושר עד',
  '7290526500006': 'סאלח דבאח ובניו בע"מ',
  '7290639000004': 'סטופ מרקט',
  '7290876100000': 'פרשמרקט',
  '7290644700005': 'יילו',
  '7290785400000': 'קשת טעמים',
  '7290058140886': 'רמי לוי שיווק השקמה',
  '7291056200008': 'סופר קופיקס',
  '7290058148776': 'שוק העיר',
  '7290027600007': 'שופרסל',
};

if (!MONGO_URI) {
  console.error('✖️ MONGO_URI not set');
  process.exit(1);
}

(async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');
  } catch (err) {
    console.error('✖️ Failed to connect to MongoDB:', err.message);
    process.exit(1);
  }

  const files = fs.readdirSync(DOWNLOAD_DIR).filter(f => f.toLowerCase().endsWith('.xml'));
  let total = 0;
  for (const f of files) {
    console.log(`→ Processing ${f}`);
    const count = await parseFile(path.join(DOWNLOAD_DIR, f));
    console.log(`← Completed ${f}: ${count}`);
    if (count > 0) console.log(`✅ ${f}: ${count} stores`);
    total += count;
  }

  console.log(`\n🏁 Done — total stores: ${total}`);
  await mongoose.disconnect();
})();

/**
 * Parse a single store XML and upsert Chain and Store docs
 * @param {string} filePath
 * @returns {Promise<number>} number of stores upserted
 */
async function parseFile(filePath) {
  // fresh parser
  const parser = new xml2js.Parser({
    explicitArray: false,
    tagNameProcessors: [xml2js.processors.stripPrefix, n => n.toLowerCase()],
    strict: false
  });

  // read buffer
  let buf;
  try { buf = fs.readFileSync(filePath); } catch (err) {
    console.warn(`⚠️ Failed to read ${path.basename(filePath)}: ${err.message}`);
    return 0;
  }

  // decode
  let rawUtf8 = buf.toString('utf8');
  let raw = rawUtf8;
  if (rawUtf8.includes('�')) {
    raw = iconv.decode(buf, 'windows1255');
    if (raw.includes('�')) {
      raw = iconv.decode(buf, 'iso-8859-8');
    }
  }

  // strip BOM and leading junk
  raw = raw.replace(/^\uFEFF/, '');
  const idx = raw.indexOf('<');
  if (idx === -1) return 0;
  raw = raw.slice(idx);
  raw = raw.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F]/g, '');

  // parse
  let doc;
  try {
    doc = await Promise.race([
      parser.parseStringPromise(raw),
      new Promise((_, rej) => setTimeout(() => rej(new Error('XML parse timeout')), 5000))
    ]);
  } catch (err) {
    console.warn(`⚠️ Parse error in ${path.basename(filePath)}: ${err.message}`);
    return 0;
  }
  if (!doc || typeof doc !== 'object') return 0;

  // find root
  const root = doc.abap?.values || doc.stores || doc.root || doc.orderxml || doc.store;
  if (!root) return 0;

  // extract or infer chainId
  let chainId = String(root.chainid || '').trim();
  if (!chainId) {
    // take digits sequence from filename
    const base = path.basename(filePath).match(/(\d{10,})/);
    chainId = base ? base[1] : '';
  }

  // extract chainName, apply override map
  let chainName = (root.chainname || '').trim();
  if (CHAIN_NAME_OVERRIDES[chainId]) {
    chainName = CHAIN_NAME_OVERRIDES[chainId];
  }

  if (!chainId) {
    console.warn(`⚠️ Missing chainId for ${path.basename(filePath)}`);
    return 0;
  }

  // upsert chain
  let chainDoc;
  try {
    chainDoc = await Chain.findOneAndUpdate(
      { chainId },
      { $set: { chainName } },
      { upsert: true, new: true }
    );
  } catch (err) {
    console.warn(`⚠️ Chain upsert failed (${chainId}): ${err.message}`);
    return 0;
  }
  const chainRef = chainDoc._id;

  // extract stores (unchanged)
  let stores = [];
  if (root.stores?.store) {
    stores = Array.isArray(root.stores.store) ? root.stores.store : [root.stores.store];
  } else if (root.subchains?.subchain) {
    const subs = Array.isArray(root.subchains.subchain) ? root.subchains.subchain : [root.subchains.subchain];
    subs.forEach(sub => {
      (Array.isArray(sub.stores.store) ? sub.stores.store : [sub.stores.store])
        .forEach(s => stores.push({ ...s, subchainid: sub.subchainid, subchainname: sub.subchainname }));
    });
  } else if (root.branches?.branch) {
    stores = Array.isArray(root.branches.branch) ? root.branches.branch : [root.branches.branch];
  } else if (root.envelope?.header?.details?.line) {
    const lines = Array.isArray(root.envelope.header.details.line)
      ? root.envelope.header.details.line
      : [root.envelope.header.details.line];
    stores = lines.map(s => ({
      storeid: s.storeid,
      bikoretno: s.bikoretno,
      storetype: s.storetype,
      storename: s.storename,
      address: s.address,
      city: s.city,
      zipcode: s.zipcode,
      lastupdatedate: root.lastupdatedate,
      lastupdatetime: root.lastupdatetime
    }));
  } else if (root.store) {
    stores = Array.isArray(root.store) ? root.store : [root.store];
  }
  if (!stores.length) return 0;

  // bulk upsert stores (unchanged)
  const ops = stores.map(s => {
    const subChainId = String(s.subchainid || '').trim();
    const subChainName = s.subchainname || '';
    const storeId = String(s.storeid || '').trim();
    const bikoretNo = parseInt(s.bikoretno, 10) || null;
    const storeType = parseInt(s.storetype, 10) || null;
    let lastUpdate = null;
    if (s.lastupdatedate && s.lastupdatetime) {
      const d = new Date(`${s.lastupdatedate} ${s.lastupdatetime}`);
      if (!isNaN(d)) lastUpdate = d;
    }
    return {
      updateOne: {
        filter: { chainRef, subChainId, storeId },
        update: {
          $set: {
            chainRef,
            subChainId,
            subChainName,
            storeId,
            bikoretNo,
            storeType,
            storeName: s.storename || '',
            address:   s.address    || '',
            city:      s.city       || '',
            zipCode:   s.zipcode    || '',
            lastUpdate,
            latitude:  parseFloat(s.latitude)  || null,
            longitude: parseFloat(s.longitude) || null
          },
          // only on insert, give a dummy [0,0] so geocoder sees it
          $setOnInsert: {
            location: { type: 'Point', coordinates: [0, 0] }
          }
        },
        upsert: true
      }
    };
  });

  try {
    const result = await Store.bulkWrite(ops);
    return result.upsertedCount + result.modifiedCount;
  } catch (err) {
    console.warn(`⚠️ BulkWrite failed for ${path.basename(filePath)}: ${err.message}`);
    return 0;
  }
}
