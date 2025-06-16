const ShoppingList = require('../models/shoppingListModel')

exports.getAllUserShoppingLists = async (req, res) => {
  try {
    const uid = (req.user.sub || req.user._id).toString()
    const lists = await ShoppingList.find({ members: uid }).populate('members', '-passwordHash')
    return res.json(lists)
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}

exports.createList = async (req, res) => {
  try {
    const uid = (req.user.sub || req.user._id).toString()
    const { title, importantList, members } = req.body
    const allMembers = Array.from(new Set([uid, ...(members || []).map(m => m.toString())]))
    const list = await ShoppingList.create({ title, importantList, members: allMembers, products: [], editLog: [] })
    const populated = await list.populate('members', '-passwordHash')
    global.io.to(allMembers.map(id => `user:${id}`)).emit('listCreated', populated)
    return res.status(201).json(populated)
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}

exports.getShoppingList = async (req, res) => {
  try {
    const uid = (req.user.sub || req.user._id).toString()
    const list = await ShoppingList.findById(req.params.id)
    if (!list) return res.status(404).json({ error: 'List not found' })
    if (!list.members.map(id => id.toString()).includes(uid)) return res.status(403).json({ error: 'Not permitted' })
    return res.json(list)
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}

exports.updateListProducts = async (req, res) => {
  try {
    const uid = (req.user.sub || req.user._id).toString()
    const listId = req.params.id
    const { changes = [] } = req.body
    const list = await ShoppingList.findById(listId)
    if (!list) return res.status(404).json({ error: 'List not found' })
    if (!list.members.map(id => id.toString()).includes(uid)) return res.status(403).json({ error: 'Not permitted' })

    const ops = []
    changes.forEach(c => {
      if (c.action === 'added')
        ops.push({ updateOne: { filter: { _id: listId, 'products.product.itemCode': { $ne: c.product.itemCode } }, update: { $push: { products: { product: c.product, numUnits: 1 } } } } })
      if (c.action === 'removed')
        ops.push({ updateOne: { filter: { _id: listId }, update: { $pull: { products: { 'product.itemCode': c.product.itemCode } } } } })
      if (c.action === 'updated')
        ops.push({ updateOne: { filter: { _id: listId, 'products.product.itemCode': c.product.itemCode }, update: { $inc: { 'products.$.numUnits': c.difference } } } })
    })
    if (ops.length) {
      ops.push({ updateOne: { filter: { _id: listId }, update: { $push: { editLog: { $each: changes } } } } })
      await ShoppingList.bulkWrite(ops)
    }

    const updated = await ShoppingList.findById(listId)
    global.io.to(`list:${listId}`).emit('listUpdated', updated)
    return res.json({ message: 'ok', list: updated })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
