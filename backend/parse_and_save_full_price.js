// parse_and_save_full_price.js
require('dotenv').config();
const mongoose = require('mongoose');
const fs        = require('fs').promises;
const path      = require('path');
const xml2js    = require('xml2js');
const Chain     = require('./models/Chain');
const Store     = require('./models/Store');
const PriceFile = require('./models/PriceFile');
const PriceItem = require('./models/PriceItem');

async function main() {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) process.exit(1);
  await mongoose.connect(mongoUri);

  const parser = new xml2js.Parser({ explicitArray: false });
  const downloadRoot = path.join(__dirname, 'FullPriceXML');

  async function findXmlFiles(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const files = [];
    for (const ent of entries) {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) files.push(...await findXmlFiles(full));
      else if (ent.isFile() && ent.name.endsWith('.xml')) files.push(full);
    }
    return files;
  }

  const xmlPaths = await findXmlFiles(downloadRoot);
  for (const xmlPath of xmlPaths) {
    const xmlName = path.basename(xmlPath);
    try {
      const xml = await fs.readFile(xmlPath, 'utf8');
      const parsed = await parser.parseStringPromise(xml);
      const root = parsed.Prices || parsed.Root;
      const chainId    = String(root.ChainID || root.ChainId);
      const subChainId = String(root.SubChainID || root.SubChainId);
      const storeId    = String(root.StoreID || root.StoreId);

      // Find Chain and Store
      const chainDoc = await Chain.findOne({ chainId });
      if (!chainDoc) throw new Error(`Chain ${chainId} not found`);
      const storeDoc = await Store.findOne({ chainRef: chainDoc._id, subChainId, storeId });
      if (!storeDoc) throw new Error(`Store ${chainId}/${subChainId}/${storeId} not found`);
      const storeRef = storeDoc._id;

      // Upsert PriceFile
      const fileDoc = await PriceFile.findOneAndUpdate(
        { storeRef },
        { $set: { fileName: xmlName, fetchedAt: new Date() } },
        { upsert: true, new: true }
      );

      // Handle items
      let items = root.Products?.Product || root.Items?.Item;
      if (!items) continue;
      if (!Array.isArray(items)) items = [items];

      const ops = items.map(it => ({
        updateOne: {
          filter: { priceFile: fileDoc._id, itemCode: it.ItemCode },
          update: { $set: {
            priceUpdateDate:    it.PriceUpdateDate || it.PriceUpdateTime,
            lastSaleDateTime:   it.LastSaleDateTime,
            itemType:           Number(it.ItemType),
            itemName:           it.ItemName,
            manufacturerName:   it.ManufacturerName || it.ManufactureName,
            manufactureCountry: it.ManufactureCountry,
            itemDescription:    it.ManufacturerItemDescription || it.ManufacturerItemDescription,
            unitQty:            it.UnitQty,
            quantity:           parseFloat(it.Quantity) || 0,
            unitOfMeasure:      it.UnitOfMeasure || it.UnitMeasure,
            isWeighted:         ['1','true'].includes(it.BisWeighted),
            qtyInPackage:       parseFloat(it.QtyInPackage) || 0,
            itemPrice:          parseFloat(it.ItemPrice) || 0,
            unitOfMeasurePrice: parseFloat(it.UnitOfMeasurePrice) || 0,
            allowDiscount:      ['1','true'].includes(it.AllowDiscount),
            itemStatus:         Number(it.ItemStatus) || 0,
            itemId:             it.ItemId || null,
            imageUrl:           it.ImageUrl || null
          }}, upsert: true
        }
      }));

      if (ops.length) await PriceItem.bulkWrite(ops);
      console.log(`➕ Processed ${items.length} items for ${xmlName}`);
    } catch (e) {
      console.error(`⚠️ ${xmlName}: ${e.message}`);
    }
  }

  console.log('✅ All done');
  await mongoose.disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });
