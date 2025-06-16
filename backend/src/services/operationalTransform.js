const Operation = require('../models/operationModel')
const ShoppingList = require('../models/shoppingListModel')

class OperationalTransform {
  
  /**
   * Apply an operation to a shopping list state
   */
  static applyOperation(state, operation) {
    const newState = JSON.parse(JSON.stringify(state)) // Deep clone
    
    switch (operation.type) {
      case 'ADD_ITEM':
        return this.applyAddItem(newState, operation)
      case 'REMOVE_ITEM':
        return this.applyRemoveItem(newState, operation)
      case 'UPDATE_QUANTITY':
        return this.applyUpdateQuantity(newState, operation)
      case 'UPDATE_TITLE':
        return this.applyUpdateTitle(newState, operation)
      default:
        throw new Error(`Unknown operation type: ${operation.type}`)
    }
  }
  
  static applyAddItem(state, operation) {
    const { itemCode, name, image, quantity = 1, position } = operation.data
    
    // Check if item already exists
    const existingIndex = state.products.findIndex(p => p.product.itemCode === itemCode)
    if (existingIndex !== -1) {
      // Item exists, update quantity instead
      state.products[existingIndex].numUnits += quantity
    } else {
      // Add new item
      const newItem = {
        product: { itemCode, name, image: image || '' },
        numUnits: quantity
      }
      
      if (position !== undefined && position >= 0 && position <= state.products.length) {
        state.products.splice(position, 0, newItem)
      } else {
        state.products.push(newItem)
      }
    }
    
    return state
  }
  
  static applyRemoveItem(state, operation) {
    const { itemCode } = operation.data
    state.products = state.products.filter(p => p.product.itemCode !== itemCode)
    return state
  }
  
  static applyUpdateQuantity(state, operation) {
    const { itemCode, quantity } = operation.data
    const item = state.products.find(p => p.product.itemCode === itemCode)
    if (item) {
      item.numUnits = Math.max(1, quantity) // Ensure minimum quantity of 1
    }
    return state
  }
  
  static applyUpdateTitle(state, operation) {
    const { title } = operation.data
    state.title = title
    return state
  }
  
  /**
   * Transform operation against another operation (conflict resolution)
   */
  static transform(op1, op2) {
    // If operations are identical, skip the second one
    if (this.operationsEqual(op1, op2)) {
      return { op1: op1, op2: null }
    }
    
    // Transform based on operation types
    if (op1.type === 'ADD_ITEM' && op2.type === 'ADD_ITEM') {
      return this.transformAddAdd(op1, op2)
    }
    
    if (op1.type === 'REMOVE_ITEM' && op2.type === 'UPDATE_QUANTITY') {
      return this.transformRemoveUpdate(op1, op2)
    }
    
    if (op1.type === 'UPDATE_QUANTITY' && op2.type === 'REMOVE_ITEM') {
      return this.transformUpdateRemove(op1, op2)
    }
    
    if (op1.type === 'UPDATE_QUANTITY' && op2.type === 'UPDATE_QUANTITY') {
      return this.transformUpdateUpdate(op1, op2)
    }
    
    // For non-conflicting operations, both can be applied
    return { op1: op1, op2: op2 }
  }
  
  static transformAddAdd(op1, op2) {
    // Both adding the same item
    if (op1.data.itemCode === op2.data.itemCode) {
      // Merge quantities and keep the first operation
      const mergedOp = { ...op1 }
      mergedOp.data.quantity = (op1.data.quantity || 1) + (op2.data.quantity || 1)
      return { op1: mergedOp, op2: null }
    }
    
    // Different items, adjust positions if they exist
    if (op1.data.position !== undefined && op2.data.position !== undefined) {
      if (op2.data.position <= op1.data.position) {
        const adjustedOp1 = { ...op1 }
        adjustedOp1.data.position += 1
        return { op1: adjustedOp1, op2: op2 }
      }
    }
    
    return { op1: op1, op2: op2 }
  }
  
  static transformRemoveUpdate(op1, op2) {
    // Removing an item that's being updated
    if (op1.data.itemCode === op2.data.itemCode) {
      // Remove wins, cancel the update
      return { op1: op1, op2: null }
    }
    return { op1: op1, op2: op2 }
  }
  
  static transformUpdateRemove(op1, op2) {
    // Updating an item that's being removed
    if (op1.data.itemCode === op2.data.itemCode) {
      // Remove wins, cancel the update
      return { op1: null, op2: op2 }
    }
    return { op1: op1, op2: op2 }
  }
  
  static transformUpdateUpdate(op1, op2) {
    // Both updating the same item's quantity
    if (op1.data.itemCode === op2.data.itemCode) {
      // Use the higher timestamp operation (last write wins for quantities)
      const op1Time = new Date(op1.serverTimestamp || op1.timestamp)
      const op2Time = new Date(op2.serverTimestamp || op2.timestamp)
      
      if (op2Time > op1Time) {
        return { op1: null, op2: op2 }
      } else {
        return { op1: op1, op2: null }
      }
    }
    return { op1: op1, op2: op2 }
  }
  
  static operationsEqual(op1, op2) {
    return (
      op1.type === op2.type &&
      op1.clientId === op2.clientId &&
      op1.operationId === op2.operationId
    )
  }
  
  /**
   * Process and apply a batch of operations to a list
   */
  static async processOperations(listId, operations) {
    // Get current list state
    const list = await ShoppingList.findById(listId)
    if (!list) throw new Error('List not found')
    
    let currentState = {
      title: list.title,
      products: [...list.products],
      editLog: [...list.editLog]
    }
    
    // Sort operations by timestamp
    operations.sort((a, b) => 
      new Date(a.serverTimestamp || a.timestamp) - new Date(b.serverTimestamp || b.timestamp)
    )
    
    // Apply each operation
    for (const operation of operations) {
      try {
        currentState = this.applyOperation(currentState, operation)
        
        // Add to edit log
        currentState.editLog.push({
          action: operation.type.toLowerCase().replace('_', ' '),
          product: operation.data.itemCode ? {
            itemCode: operation.data.itemCode,
            name: operation.data.name
          } : null,
          changedBy: operation.userName,
          timeStamp: operation.serverTimestamp || new Date(),
          operationId: operation.operationId
        })
      } catch (error) {
        console.error(`Failed to apply operation ${operation.operationId}:`, error)
      }
    }
    
    return currentState
  }
  
  /**
   * Resolve conflicts between concurrent operations
   */
  static async resolveConflicts(listId, newOperations) {
    // Get all operations for this list since the last sync
    const existingOperations = await Operation.find({
      listId,
      serverTimestamp: { 
        $gte: new Date(Date.now() - 60000) // Last minute
      }
    }).sort({ serverTimestamp: 1 })
    
    const resolvedOperations = []
    
    for (const newOp of newOperations) {
      let currentOp = newOp
      
      // Transform against all existing operations
      for (const existingOp of existingOperations) {
        if (existingOp.clientId !== newOp.clientId) {
          const result = this.transform(currentOp, existingOp)
          currentOp = result.op1
          if (!currentOp) break // Operation was cancelled
        }
      }
      
      if (currentOp) {
        resolvedOperations.push(currentOp)
      }
    }
    
    return resolvedOperations
  }
}

module.exports = OperationalTransform