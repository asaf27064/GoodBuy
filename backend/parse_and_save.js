// parse_and_save.js
require('dotenv').config();
const mongoose = require('mongoose');
const fs        = require('fs').promises;
const path      = require('path');
const xml2js    = require('xml2js');

const PriceFile = require('./models/PriceFile');
const PriceItem = require('./models/PriceItem');

async function main() {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    console.error('✖️ MONGO_URI not set in .env');
    process.exit(1);
  }
  await mongoose.connect(mongoUri);
  console.log('✅ Connected to MongoDB');

  const downloadRoot = path.join(__dirname, 'downloads');
  // Recursively find all .xml files under downloadRoot
  async function findXmlFiles(dir) {
    const found = [];
    for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        found.push(...await findXmlFiles(full));
      } else if (entry.isFile() && entry.name.endsWith('.xml')) {
        found.push(full);
      }
    }
    return found;
  }

  const xmlPaths = await findXmlFiles(downloadRoot);
  if (xmlPaths.length === 0) {
    console.warn('⚠️ No XML files found under downloads/');
  }

  for (const xmlPath of xmlPaths) {
    const xmlName = path.basename(xmlPath);
    console.log(`\n📂 Processing ${xmlName}`);
    try {
      const xml = await fs.readFile(xmlPath, 'utf8');
      const parsed = await xml2js.parseStringPromise(xml, { explicitArray: false });

      // locate root
      const root = parsed.Prices || parsed.Root || parsed.OrderXml;
      const env  = root.Envelope || {};

      // metadata
      const chainId    = root.ChainID   || root.ChainId   || env.ChainId;
      const subChainId = root.SubChainID|| root.SubChainId|| env.SubChainId;
      const storeId    = root.StoreID   || root.StoreId   || env.StoreId;
      const imageUrl   = root.imageUrl  || null;

      const fileDoc = await PriceFile.create({
        chainId:    String(chainId),
        subChainId: String(subChainId),
        storeId:    String(storeId),
        fileName:   xmlName,
        fetchedAt:  new Date(),
        imageUrl
      });
      console.log(`➕ Saved PriceFile ${fileDoc._id} (${chainId}/${storeId})`);

      // items array
      let items =
        root.Products?.Product ||
        root.Items?.Item ||
        env.Header?.Details?.Line;

      if (!items) {
        console.warn(`⚠️ No items found inside ${xmlName}`);
        continue;
      }
      if (!Array.isArray(items)) items = [items];

      for (const it of items) {
        await PriceItem.create({
          priceFile:          fileDoc._id,
          itemCode:           it.ItemCode,
          priceUpdateDate:    it.PriceUpdateDate   || it.PriceUpdateTime,
          lastSaleDateTime:   it.LastSaleDateTime,
          itemType:           Number(it.ItemType),
          itemName:           it.ItemName,
          manufacturerName:   it.ManufacturerName  || it.ManufactureName,
          manufactureCountry: it.ManufactureCountry|| it.ManufactureCountry,
          itemDescription:    it.ManufacturerItemDescription || it.ManufacturerItemDescription,
          unitQty:            it.UnitQty,
          quantity:           parseFloat(it.Quantity) || 0,
          unitOfMeasure:      it.UnitOfMeasure || it.UnitMeasure,
          isWeighted:         ['1','true'].includes(it.bIsWeighted) || ['1','true'].includes(it.blsWeighted) || ['1','true'].includes(it.BisWeighted),
          qtyInPackage:       Number(it.QtyInPackage) || 0,
          itemPrice:          parseFloat(it.ItemPrice) || 0,
          unitOfMeasurePrice: parseFloat(it.UnitOfMeasurePrice) || 0,
          allowDiscount:      it.AllowDiscount === '1' || it.AllowDiscount === 'true',
          itemStatus:         Number(it.ItemStatus) || 0,
          itemId:             it.ItemId || null
        });
      }
    } catch (e) {
      console.error(`   ⚠️ Error processing ${xmlName}: ${e.message}`);
    }
  }

  console.log('\n✅ All done');
  await mongoose.disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
