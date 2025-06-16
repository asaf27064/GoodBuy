import { useState, useEffect, useCallback, useRef } from 'react'
import { useOperationalTransform } from '../contexts/operationalTransform'
import { useCollaboration } from '../contexts/collaborationContext'

/**
 * Hook for managing collaborative shopping list state
 * Provides simplified interface for real-time list editing
 */
export const useCollaborativeList = (initialList) => {
  const ot = useOperationalTransform()
  const collaboration = useCollaboration()
  
  const [listState, setListState] = useState({
    title: initialList?.title || '',
    products: initialList?.products || [],
    _id: initialList?._id,
    version: initialList?.version || 0
  })
  
  const [localOperations, setLocalOperations] = useState([])
  const hasJoinedRef = useRef(false)
  const listId = initialList?._id

  // Join collaboration when list is available (only once)
  useEffect(() => {
    if (listId && !hasJoinedRef.current) {
      console.log(`🤝 Starting collaboration for list: ${listState.title}`)
      collaboration.joinList(listId)
      hasJoinedRef.current = true
    }

    return () => {
      if (listId && hasJoinedRef.current) {
        collaboration.leaveList(listId)
        hasJoinedRef.current = false
      }
    }
  }, [listId, collaboration]) // Remove listState.title from dependencies

  // Handle remote operations - use useRef to avoid recreation
  const remoteOperationHandler = useRef()
  
  useEffect(() => {
    remoteOperationHandler.current = (data) => {
      if (data.listId === listId) {
        console.log(`🔄 Applying remote operation to list state`)
        
        // Apply the server's new state directly
        setListState(prevState => ({
          ...prevState,
          products: data.newState.products,
          title: data.newState.title || prevState.title,
          version: (prevState.version || 0) + 1
        }))
        
        // Transform any pending local operations
        setLocalOperations(prevOps => {
          return prevOps.map(localOp => {
            const transformed = ot.transformOperation(localOp, data.operation)
            return transformed
          }).filter(Boolean) // Remove null operations
        })
      }
    }
  }, [listId, ot])

  // Set up the handler once
  useEffect(() => {
    const originalHandler = collaboration.onRemoteOperation
    
    collaboration.onRemoteOperation = (data) => {
      if (remoteOperationHandler.current) {
        remoteOperationHandler.current(data)
      }
      return originalHandler?.(data)
    }

    return () => {
      collaboration.onRemoteOperation = originalHandler
    }
  }, [collaboration]) // Only depend on collaboration, not the handler

  // Add item to list
  const addItem = useCallback((item, quantity = 1) => {
    const operation = ot.createOperation('ADD_ITEM', {
      itemCode: item.itemCode,
      name: item.name,
      image: item.image || '',
      quantity,
      position: listState.products.length
    })

    // Apply optimistically to local state
    const newState = ot.applyOperation(listState, operation)
    setListState(newState)
    
    // Track local operation
    setLocalOperations(prev => [...prev, operation])
    
    // Send to server
    collaboration.sendOperation(listId, operation)
    
    console.log(`➕ Added item: ${item.name}`)
  }, [ot, listState, collaboration, listId])

  // Remove item from list
  const removeItem = useCallback((itemCode) => {
    const operation = ot.createOperation('REMOVE_ITEM', {
      itemCode
    })

    // Apply optimistically to local state
    const newState = ot.applyOperation(listState, operation)
    setListState(newState)
    
    // Track local operation
    setLocalOperations(prev => [...prev, operation])
    
    // Send to server
    collaboration.sendOperation(listId, operation)
    
    console.log(`➖ Removed item: ${itemCode}`)
  }, [ot, listState, collaboration, listId])

  // Update item quantity
  const updateQuantity = useCallback((itemCode, newQuantity) => {
    const operation = ot.createOperation('UPDATE_QUANTITY', {
      itemCode,
      quantity: Math.max(1, newQuantity),
      oldQuantity: listState.products.find(p => p.product.itemCode === itemCode)?.numUnits || 1
    })

    // Apply optimistically to local state
    const newState = ot.applyOperation(listState, operation)
    setListState(newState)
    
    // Track local operation
    setLocalOperations(prev => [...prev, operation])
    
    // Send to server
    collaboration.sendOperation(listId, operation)
    
    console.log(`🔢 Updated quantity for ${itemCode}: ${newQuantity}`)
  }, [ot, listState, collaboration, listId])

  // Update list title
  const updateTitle = useCallback((newTitle) => {
    const operation = ot.createOperation('UPDATE_TITLE', {
      title: newTitle
    })

    // Apply optimistically to local state
    const newState = ot.applyOperation(listState, operation)
    setListState(newState)
    
    // Track local operation
    setLocalOperations(prev => [...prev, operation])
    
    // Send to server
    collaboration.sendOperation(listId, operation)
    
    console.log(`📝 Updated title: ${newTitle}`)
  }, [ot, listState, collaboration, listId])

  // Send typing indicator
  const setTyping = useCallback((isTyping, field = 'item') => {
    collaboration.sendTypingIndicator(listId, isTyping, field)
  }, [collaboration, listId])

  // Sync pending changes
  const syncChanges = useCallback(async () => {
    if (localOperations.length > 0) {
      try {
        await collaboration.syncPendingOperations(listId)
        setLocalOperations([])
      } catch (error) {
        console.error('Failed to sync changes:', error)
      }
    }
  }, [collaboration, listId, localOperations])

  // Get list statistics
  const getStats = useCallback(() => {
    return {
      totalItems: listState.products.length,
      totalQuantity: listState.products.reduce((sum, p) => sum + p.numUnits, 0),
      pendingOperations: localOperations.length,
      activeUsers: collaboration.activeUsers[listId] || [],
      isOnline: collaboration.isOnline,
      syncStatus: collaboration.syncStatus
    }
  }, [listState, localOperations, collaboration, listId])

  return {
    // State
    listState,
    
    // Actions
    addItem,
    removeItem,
    updateQuantity,
    updateTitle,
    
    // Collaboration
    setTyping,
    syncChanges,
    
    // Info
    getStats,
    
    // Status
    isOnline: collaboration.isOnline,
    syncStatus: collaboration.syncStatus,
    activeUsers: collaboration.activeUsers[listId] || [],
    notifications: collaboration.notifications.filter(n => 
      n.type !== 'typing' || n.message.includes(listState.title)
    ),
    
    // Utils
    hasUnsavedChanges: localOperations.length > 0,
    connectionStatus: collaboration.connectionStatus
  }
}