const mongoose = require('mongoose')
const fs = require('fs').promises
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '../.env') })
const os = require('os')
const pLimit = require('p-limit').default
const { XMLParser } = require('fast-xml-parser')
const Chain = require('../../models/Chain')
const Store = require('../../models/Store')
const PriceFile = require('../../models/PriceFile')

async function main() {
  const mongoUri = process.env.MONGO_URI
  if (!mongoUri) {
    console.error('Missing MONGO_URI')
    process.exit(1)
  }
  await mongoose.connect(mongoUri)
  console.log('✅ Connected to MongoDB')

  const priceItemColl = mongoose.connection.db.collection('priceitems')

  console.log('🗑 Dropping non-essential indexes...')
  try {
    await priceItemColl.dropIndex('itemCode_1_chainId_1')
    await priceItemColl.dropIndex('itemPrice_1')
  } catch (e) {
    console.log('No secondary indexes to drop')
  }

  console.log('🔧 Ensuring upsert filter index on {priceFile, itemCode}')
  await priceItemColl.createIndex({ priceFile: 1, itemCode: 1 })

  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '' })
  const xmlDir = path.join(__dirname, 'Downloads')
  const xmlPaths = await findXmlFiles(xmlDir)
  console.log(`📦 Found ${xmlPaths.length} XML files`)
  if (xmlPaths.length === 0) process.exit(0)

  const allChains = await Chain.find().lean()
  const allStores = await Store.find().lean()
  const chainCache = new Map(allChains.map(c => [c.chainId, c]))
  const storeCache = new Map(allStores.map(s => [`${s.chainRef}_${s.subChainId}_${s.storeId}`, s._id]))
  const existing = await PriceFile.find().lean()
  const fileCache = new Map(existing.map(f => [String(f.storeRef), f.fileName]))

  const CONCURRENCY = os.cpus().length
  const CHUNK = 5000
  const limit = pLimit(CONCURRENCY)

  let totalItems = 0
  await Promise.all(
    xmlPaths.map(p => limit(async () => {
      const count = await processFile(p, parser, chainCache, storeCache, fileCache, priceItemColl, CHUNK)
      totalItems += count
    }))
  )

  console.log(`🏁 Imported total ${totalItems} items`)

  console.log('📈 Recreating secondary indexes...')
  await priceItemColl.createIndex({ itemCode: 1, chainId: 1 })
  await priceItemColl.createIndex({ itemPrice: 1 })

  await require('../sync_and_update_images')()

  await mongoose.disconnect()
  console.log('🔌 Disconnected from MongoDB')
}

async function processFile(xmlPath, parser, chainCache, storeCache, fileCache, coll, CHUNK) {
  const xmlName = path.basename(xmlPath)
  console.log(`→ Processing ${xmlName}`)

  const xml = await fs.readFile(xmlPath, 'utf8')
  const parsed = parser.parse(xml)
  const root = parsed.Prices || parsed.Root || parsed.prices || parsed.root
  if (!root) return 0

  const chainIdRaw = root.ChainID || root.ChainId || root.chainid
  const subChainIdRaw = root.SubChainID || root.SubChainId || root.subchainid || ''
  const storeIdRaw = root.StoreID || root.StoreId || root.storeid
  if (!chainIdRaw || !storeIdRaw) return 0

  const chainId = String(chainIdRaw)
  let subChainId = parseInt(String(subChainIdRaw), 10).toString()
  const storeId = parseInt(String(storeIdRaw), 10).toString()

  const chainDoc = chainCache.get(chainId)
  if (!chainDoc) return 0

  let storeRef = storeCache.get(`${chainDoc._id}_${subChainId}_${storeId}`)
  if (!storeRef) {
    for (const [k, v] of storeCache.entries()) {
      if (k.endsWith(`_${storeId}`)) {
        storeRef = v
        subChainId = k.split('_')[1]
        console.warn(`⚠️ Fallback store for ${xmlName}: subChainId=${subChainId}`)
        break
      }
    }
  }
  if (!storeRef) return 0

  const key = String(storeRef)
  if (fileCache.get(key) === xmlName) return 0

  const pf = await PriceFile.findOneAndUpdate(
    { storeRef },
    { $set: { fileName: xmlName, fetchedAt: new Date() }},
    { upsert: true, new: true }
  ).lean()
  fileCache.set(key, xmlName)

  let items = root.Products?.Product || root.Items?.Item || root.products?.product || []
  if (!Array.isArray(items)) items = [items]

  const ops = items.map(it => ({
    updateOne: {
      filter: { priceFile: pf._id, itemCode: String(it.ItemCode) },
      update: { $set: {
        chainId,
        chainName: chainDoc.chainName,
        priceUpdateDate: it.PriceUpdateDate ? new Date(it.PriceUpdateDate) : it.PriceUpdateTime ? new Date(it.PriceUpdateTime) : null,
        lastSaleDateTime: it.LastSaleDateTime ? new Date(it.LastSaleDateTime) : null,
        itemType: Number(it.ItemType || it.itemType) || 0,
        itemName: it.ItemName || '',
        manufacturerName: it.ManufacturerName || it.ManufactureName || '',
        manufactureCountry: it.ManufactureCountry || '',
        itemDescription: it.ManufacturerItemDescription || '',
        unitQty: it.UnitQty || '',
        quantity: parseFloat(it.Quantity) || 0,
        unitOfMeasure: it.UnitOfMeasure || it.UnitMeasure || '',
        isWeighted: ['1','true'].includes(String(it.BisWeighted || it.bIsWeighted).toLowerCase()),
        qtyInPackage: parseFloat(it.QtyInPackage) || 0,
        itemPrice: parseFloat(it.ItemPrice) || 0,
        unitOfMeasurePrice: parseFloat(it.UnitOfMeasurePrice || it.UnitMeasurePrice) || 0,
        allowDiscount: ['1','true'].includes(String(it.AllowDiscount).toLowerCase()),
        itemStatus: Number(it.ItemStatus || it.itemStatus) || 0,
        itemId: it.ItemId || null
      }},
      upsert: true
    }
  }))

  for (let i = 0; i < ops.length; i += CHUNK) {
    await coll.bulkWrite(ops.slice(i, i + CHUNK), { ordered: false, bypassDocumentValidation: true })
  }

  return items.length
}

async function findXmlFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  const paths = await Promise.all(entries.map(async e => {
    const full = path.join(dir, e.name)
    if (e.isDirectory()) return findXmlFiles(full)
    if (e.isFile() && /\.xml$/i.test(e.name)) return [full]
    return []
  }))
  return paths.flat()
}

main().catch(err => { console.error(err); process.exit(1) })
