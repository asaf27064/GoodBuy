import React, { createContext, useContext, useRef, useCallback } from 'react'

const OperationalTransformContext = createContext()

// Client-side OT engine for transforming operations
class ClientOT {
  static generateOperationId() {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  static generateClientId() {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  // Apply operation to local state
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
        console.warn(`Unknown operation type: ${operation.type}`)
        return state
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
      item.numUnits = Math.max(1, quantity)
    }
    return state
  }

  static applyUpdateTitle(state, operation) {
    const { title } = operation.data
    state.title = title
    return state
  }

  // Transform local operation against remote operation
  static transform(localOp, remoteOp) {
    // If operations are identical, skip local
    if (this.operationsEqual(localOp, remoteOp)) {
      return null
    }

    // Handle different operation type combinations
    if (localOp.type === 'ADD_ITEM' && remoteOp.type === 'ADD_ITEM') {
      return this.transformAddAdd(localOp, remoteOp)
    }

    if (localOp.type === 'REMOVE_ITEM' && remoteOp.type === 'UPDATE_QUANTITY') {
      return this.transformRemoveUpdate(localOp, remoteOp)
    }

    if (localOp.type === 'UPDATE_QUANTITY' && remoteOp.type === 'REMOVE_ITEM') {
      return this.transformUpdateRemove(localOp, remoteOp)
    }

    if (localOp.type === 'UPDATE_QUANTITY' && remoteOp.type === 'UPDATE_QUANTITY') {
      return this.transformUpdateUpdate(localOp, remoteOp)
    }

    // For non-conflicting operations, return original
    return localOp
  }

  static transformAddAdd(localOp, remoteOp) {
    // Both adding the same item
    if (localOp.data.itemCode === remoteOp.data.itemCode) {
      // Merge quantities
      const mergedOp = { ...localOp }
      mergedOp.data.quantity = (localOp.data.quantity || 1) + (remoteOp.data.quantity || 1)
      return mergedOp
    }

    // Different items, adjust positions if needed
    if (localOp.data.position !== undefined && remoteOp.data.position !== undefined) {
      if (remoteOp.data.position <= localOp.data.position) {
        const adjustedOp = { ...localOp }
        adjustedOp.data.position += 1
        return adjustedOp
      }
    }

    return localOp
  }

  static transformRemoveUpdate(localOp, remoteOp) {
    // Removing an item that's being updated remotely
    if (localOp.data.itemCode === remoteOp.data.itemCode) {
      // Remove wins
      return localOp
    }
    return localOp
  }

  static transformUpdateRemove(localOp, remoteOp) {
    // Updating an item that's being removed remotely
    if (localOp.data.itemCode === remoteOp.data.itemCode) {
      // Remote remove wins, cancel local update
      return null
    }
    return localOp
  }

  static transformUpdateUpdate(localOp, remoteOp) {
    // Both updating the same item's quantity
    if (localOp.data.itemCode === remoteOp.data.itemCode) {
      // Use timestamp to determine winner (last write wins)
      const localTime = new Date(localOp.timestamp || 0)
      const remoteTime = new Date(remoteOp.serverTimestamp || remoteOp.timestamp || 0)
      
      if (localTime <= remoteTime) {
        // Remote wins, cancel local
        return null
      }
    }
    return localOp
  }

  static operationsEqual(op1, op2) {
    return (
      op1.type === op2.type &&
      op1.operationId === op2.operationId &&
      op1.clientId === op2.clientId
    )
  }
}

export const OperationalTransformProvider = ({ children }) => {
  const operationQueue = useRef([]) // Queue of pending operations
  const vectorClock = useRef({}) // Vector clock for ordering
  const clientId = useRef(ClientOT.generateClientId())

  const createOperation = useCallback((type, data) => {
    const operation = {
      type,
      data,
      operationId: ClientOT.generateOperationId(),
      clientId: clientId.current,
      timestamp: new Date().toISOString(),
      vectorClock: { ...vectorClock.current }
    }

    // Update vector clock
    vectorClock.current[clientId.current] = (vectorClock.current[clientId.current] || 0) + 1
    operation.vectorClock = { ...vectorClock.current }

    return operation
  }, [])

  const applyOperation = useCallback((state, operation) => {
    return ClientOT.applyOperation(state, operation)
  }, [])

  const transformOperation = useCallback((localOp, remoteOp) => {
    return ClientOT.transform(localOp, remoteOp)
  }, [])

  const queueOperation = useCallback((operation) => {
    operationQueue.current.push(operation)
  }, [])

  const dequeueOperation = useCallback((operationId) => {
    operationQueue.current = operationQueue.current.filter(op => op.operationId !== operationId)
  }, [])

  const getPendingOperations = useCallback(() => {
    return [...operationQueue.current]
  }, [])

  const clearQueue = useCallback(() => {
    operationQueue.current = []
  }, [])

  const updateVectorClock = useCallback((remoteVectorClock) => {
    // Merge remote vector clock with local
    Object.keys(remoteVectorClock).forEach(clientId => {
      vectorClock.current[clientId] = Math.max(
        vectorClock.current[clientId] || 0,
        remoteVectorClock[clientId] || 0
      )
    })
  }, [])

  const value = {
    clientId: clientId.current,
    createOperation,
    applyOperation,
    transformOperation,
    queueOperation,
    dequeueOperation,
    getPendingOperations,
    clearQueue,
    updateVectorClock,
    vectorClock: vectorClock.current
  }

  return (
    <OperationalTransformContext.Provider value={value}>
      {children}
    </OperationalTransformContext.Provider>
  )
}

export const useOperationalTransform = () => {
  const context = useContext(OperationalTransformContext)
  if (!context) {
    throw new Error('useOperationalTransform must be used within OperationalTransformProvider')
  }
  return context
}