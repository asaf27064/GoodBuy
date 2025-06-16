const ShoppingList = require('../models/shoppingListModel')
const Operation = require('../models/operationModel')
const OperationalTransform = require('../services/operationalTransform')

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
      editLog: [],
      version: 0 // Add versioning for OT
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

// NEW: Get operations since a specific timestamp (for sync)
exports.getOperationsSince = async (req, res) => {
  try {
    const userId = (req.user.sub || req.user._id).toString()
    const { timestamp } = req.query
    const listId = req.params.id
    
    // Verify access
    const list = await ShoppingList.findById(listId)
    if (!list) return res.status(404).json({ error: 'List not found' })
    if (!list.members.map(id => id.toString()).includes(userId)) {
      return res.status(403).json({ error: 'Not a member of this list' })
    }
    
    const since = timestamp ? new Date(timestamp) : new Date(0)
    const operations = await Operation.find({
      listId,
      serverTimestamp: { $gt: since }
    }).sort({ serverTimestamp: 1 })
    
    return res.json({ operations, currentTimestamp: new Date() })
  } catch (error) {
    console.error('getOperationsSince error:', error.stack)
    return res.status(500).json({ error: error.message })
  }
}

// NEW: Apply operations using OT (replaces updateListProducts)
exports.applyOperations = async (req, res) => {
  console.log('applyOperations called for list ID:', req.params.id)
  console.log('Operations:', JSON.stringify(req.body, null, 2))
  
  try {
    const userId = (req.user.sub || req.user._id).toString()
    const listId = req.params.id
    const { operations, clientId } = req.body
    
    // Verify access
    const list = await ShoppingList.findById(listId)
    if (!list) return res.status(404).json({ error: 'List not found' })
    if (!list.members.map(id => id.toString()).includes(userId)) {
      return res.status(403).json({ error: 'Not a member of this list' })
    }
    
    if (!Array.isArray(operations) || operations.length === 0) {
      return res.status(400).json({ error: 'No operations provided' })
    }
    
    // Create operation records
    const operationRecords = []
    for (const op of operations) {
      // Check for duplicates
      const existing = await Operation.findOne({
        listId,
        clientId: op.clientId || clientId,
        operationId: op.operationId
      })
      
      if (existing) {
        console.log(`⚠️ Duplicate operation skipped: ${op.operationId}`)
        continue
      }
      
      const operationRecord = new Operation({
        listId,
        type: op.type,
        data: op.data,
        userId,
        userName: req.user.username || req.user.email,
        clientId: op.clientId || clientId,
        operationId: op.operationId,
        vectorClock: op.vectorClock || {},
        serverTimestamp: new Date()
      })
      
      await operationRecord.save()
      operationRecords.push(operationRecord)
    }
    
    if (operationRecords.length === 0) {
      return res.json({ message: 'No new operations to apply', list })
    }
    
    // Apply operational transformation
    const resolvedOps = await OperationalTransform.resolveConflicts(listId, operationRecords)
    
    // Apply operations to get new state
    const newState = await OperationalTransform.processOperations(listId, resolvedOps)
    
    // Update the shopping list in database
    const updated = await ShoppingList.findByIdAndUpdate(listId, {
      title: newState.title,
      products: newState.products,
      editLog: newState.editLog,
      version: (list.version || 0) + 1
    }, { new: true })
    
    console.log(`✅ Applied ${resolvedOps.length} operations to list ${listId}`)
    
    return res.json({ 
      message: 'Operations applied successfully', 
      list: updated,
      appliedOperations: resolvedOps.length,
      skippedOperations: operations.length - operationRecords.length
    })
    
  } catch (error) {
    console.error('applyOperations error:', error.stack)
    return res.status(500).json({ error: error.message, stack: error.stack })
  }
}

// LEGACY: Keep old endpoint for backward compatibility
exports.updateListProducts = async (req, res) => {
  console.log('updateListProducts called (legacy) for list ID:', req.params.id)
  console.log('Payload:', JSON.stringify(req.body, null, 2))
  
  try {
    const userId = (req.user.sub || req.user._id).toString()
    const list = await ShoppingList.findById(req.params.id)
    if (!list) return res.status(404).json({ error: 'List not found' })
    if (!list.members.map(id => id.toString()).includes(userId)) {
      return res.status(403).json({ error: 'Not a member of this list' })
    }

    const { list: updatedListBody, changes } = req.body
    
    // Convert legacy format to operations
    const operations = []
    if (changes && Array.isArray(changes)) {
      for (const change of changes) {
        let operation = null
        
        switch (change.action) {
          case 'added':
            operation = {
              type: 'ADD_ITEM',
              data: {
                itemCode: change.product.itemCode,
                name: change.product.name,
                image: change.product.image || '',
                quantity: 1
              },
              operationId: `legacy_add_${change.product.itemCode}_${Date.now()}`,
              clientId: `legacy_${userId}`
            }
            break
          case 'removed':
            operation = {
              type: 'REMOVE_ITEM',
              data: {
                itemCode: change.product.itemCode
              },
              operationId: `legacy_remove_${change.product.itemCode}_${Date.now()}`,
              clientId: `legacy_${userId}`
            }
            break
          case 'updated':
            // Find the item in updatedListBody to get new quantity
            const updatedItem = updatedListBody.products.find(p => 
              p.product.itemCode === change.product.itemCode
            )
            if (updatedItem) {
              operation = {
                type: 'UPDATE_QUANTITY',
                data: {
                  itemCode: change.product.itemCode,
                  quantity: updatedItem.numUnits,
                  oldQuantity: updatedItem.numUnits - (change.difference || 0)
                },
                operationId: `legacy_update_${change.product.itemCode}_${Date.now()}`,
                clientId: `legacy_${userId}`
              }
            }
            break
        }
        
        if (operation) {
          operations.push(operation)
        }
      }
    }
    
    // If no operations, fall back to direct update
    if (operations.length === 0) {
      list.products = updatedListBody.products
      list.editLog = [...(list.editLog || []), ...changes]
      const updated = await list.save()
      console.log('List updated using legacy direct method:', updated._id)
      return res.json({ message: 'List updated successfully', list: updated })
    }
    
    // Apply operations using the new OT system
    const operationRecords = []
    for (const op of operations) {
      const operationRecord = new Operation({
        listId: req.params.id,
        type: op.type,
        data: op.data,
        userId,
        userName: req.user.username || req.user.email,
        clientId: op.clientId,
        operationId: op.operationId,
        serverTimestamp: new Date()
      })
      
      await operationRecord.save()
      operationRecords.push(operationRecord)
    }
    
    // Apply operational transformation
    const resolvedOps = await OperationalTransform.resolveConflicts(req.params.id, operationRecords)
    const newState = await OperationalTransform.processOperations(req.params.id, resolvedOps)
    
    // Update the shopping list
    const updated = await ShoppingList.findByIdAndUpdate(req.params.id, {
      title: newState.title,
      products: newState.products,
      editLog: newState.editLog,
      version: (list.version || 0) + 1
    }, { new: true })

    console.log('List successfully updated via legacy -> OT conversion:', updated._id)
    return res.json({ message: 'List updated successfully', list: updated })
    
  } catch (error) {
    console.error('updateListProducts (legacy) error:', error.stack)
    return res.status(500).json({ error: error.message, stack: error.stack })
  }
}

// NEW: Get list with operation history
exports.getListWithHistory = async (req, res) => {
  try {
    const userId = (req.user.sub || req.user._id).toString()
    const listId = req.params.id
    const { limit = 50 } = req.query
    
    // Verify access
    const list = await ShoppingList.findById(listId)
    if (!list) return res.status(404).json({ error: 'List not found' })
    if (!list.members.map(id => id.toString()).includes(userId)) {
      return res.status(403).json({ error: 'Not a member of this list' })
    }
    
    // Get recent operations
    const operations = await Operation.find({ listId })
      .sort({ serverTimestamp: -1 })
      .limit(parseInt(limit))
      .populate('userId', 'username email')
    
    return res.json({ 
      list, 
      operations: operations.reverse(), // Chronological order
      totalOperations: await Operation.countDocuments({ listId })
    })
  } catch (error) {
    console.error('getListWithHistory error:', error.stack)
    return res.status(500).json({ error: error.message })
  }
}