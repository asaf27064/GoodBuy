const ShoppingList = require('../models/shoppingListModel')

exports.getAllUserShoppingLists = async (req, res) => {
  try {
    const userId = (req.user.sub || req.user._id).toString()
    const lists = await ShoppingList.find({ members: userId })
      .populate('members', '-passwordHash')
    return res.json(lists)
  } catch (error) {
    console.error('getAllUserShoppingLists error:', error.stack)
    return res.status(500).json({ error: error.message })
  }
}

exports.createList = async (req, res) => {
  try {
    const userId = (req.user.sub || req.user._id).toString()
    const { title, importantList, members } = req.body

    const incoming = Array.isArray(members)
      ? members.map(m => m.toString())
      : []
    const allMembers = Array.from(
      new Set([userId, ...incoming])
    )

    const newList = new ShoppingList({
      title,
      importantList,
      members: allMembers,
      products: [],
      editLog: []
    })
    await newList.save()
    const populated = await newList.populate('members', '-passwordHash')
    return res.status(201).json(populated)
  } catch (error) {
    console.error('createList error:', error.stack)
    return res.status(500).json({ error: error.message })
  }
}

exports.getShoppingList = async (req, res) => {
  try {
    const userId = (req.user.sub || req.user._id).toString()
    const list = await ShoppingList.findById(req.params.id)
    if (!list) return res.status(404).json({ error: 'List not found' })
    if (!list.members.map(id => id.toString()).includes(userId)) {
      return res.status(403).json({ error: 'Not a member of this list' })
    }
    return res.json(list)
  } catch (error) {
    console.error('getShoppingList error:', error.stack)
    return res.status(500).json({ error: error.message })
  }
}

exports.updateListProducts = async (req, res) => {
  console.log('updateListProducts called for list ID:', req.params.id)
  console.log('Payload:', JSON.stringify(req.body, null, 2))
  try {
    const userId = (req.user.sub || req.user._id).toString()
    const list = await ShoppingList.findById(req.params.id)
    if (!list) return res.status(404).json({ error: 'List not found' })
    if (!list.members.map(id => id.toString()).includes(userId)) {
      return res.status(403).json({ error: 'Not a member of this list' })
    }

    const { list: updatedListBody, changes } = req.body
    list.products = updatedListBody.products
    list.editLog = [...(list.editLog || []), ...changes]
    const updated = await list.save()

    console.log('List successfully updated:', updated._id)
    return res.json({ message: 'List updated successfully', list: updated })
  } catch (error) {
    console.error('updateListProducts error:', error.stack)
    return res.status(500).json({ error: error.message, stack: error.stack })
  }
}
