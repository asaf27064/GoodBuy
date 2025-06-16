const Product   = require('../models/productModel')
const ItemImage = require('../models/ItemImage')
const escapeRegex = s => s.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')

exports.searchItems = async (req, res) => {
  const term = (req.params.name || '').trim()
  if (!term) return res.json({ results: [] })

  try {
    const regex   = new RegExp('^' + escapeRegex(term), 'i')

    const docs = await Product
      .find({ name: { $regex: regex } })
      .limit(30)
      .lean()

    const codes  = docs.map(d => d._id)
    const imgs   = await ItemImage.find(
      { itemCode: { $in: codes }, status: 'found' },
      'itemCode'
    ).lean()
    const hasImg = new Set(imgs.map(i => i.itemCode))

    const base = process.env.PUBLIC_DEV_URL || ''
    const results = docs
      .map(d => ({
        itemCode : d._id,
        itemName : d.name,
        imageUrl : d.image || (base ? `${base}/images/${d._id}.png` : null),
        hasImage : hasImg.has(d._id)
      }))
      .sort((a, b) => (a.hasImage === b.hasImage ? 0 : a.hasImage ? -1 : 1))

    res.json({ results })
  } catch (err) {
    console.error('searchItems error:', err)
    res.status(500).json({ message: 'Server error' })
  }
}

exports.getById = async (req, res) => {
  try {
    const { id } = req.params
    const item = await PriceItem.findById(id, 'itemCode itemName itemPrice')
      .lean({ virtuals: true })
    if (!item) return res.status(404).json({ error: 'Item not found' })

    return res.json({
      itemCode:  item.itemCode,
      itemName:  item.itemName,
      itemPrice: item.itemPrice,
      imageUrl:  item.imageUrl
    })
  } catch (err) {
    console.error('getById error:', err)
    return res.status(500).json({ error: err.message })
  }
}

exports.getListPriceInStores = async (req, res) => {
  try {
    const stores   = JSON.parse(req.query.stores)
    const products = JSON.parse(req.query.products)

    if (!Array.isArray(stores) || !Array.isArray(products)) {
      return res.status(400).json({ error: 'Bad input format' })
    }

    const result = []
    for (const storeId of stores) {
      const itemCodes = products.map(p => p.productId)
      const matched   = await PriceItem.find({
        itemCode: { $in: itemCodes },
        storeRef: ObjectId(storeId)
      }).lean({ virtuals: true })

      result.push({ storeId, prices: matched })
    }
    return res.json(result)
  } catch (err) {
    console.error('getListPriceInStores error:', err)
    return res.status(500).json({ error: err.message })
  }
}
