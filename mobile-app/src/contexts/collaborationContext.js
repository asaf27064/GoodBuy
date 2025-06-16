import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
import io from 'socket.io-client'
import { useAuth } from './AuthContext'
import { useOperationalTransform } from './operationalTransform'
import { API_BASE } from '../config'
import axios from 'axios'

const CollaborationContext = createContext()

export const CollaborationProvider = ({ children }) => {
  const { user, token } = useAuth()
  const ot = useOperationalTransform()
  
  const [socket, setSocket] = useState(null)
  const [connectedLists, setConnectedLists] = useState(new Set())
  const [activeUsers, setActiveUsers] = useState({}) // listId -> users[]
  const [connectionStatus, setConnectionStatus] = useState('disconnected')
  const [syncStatus, setSyncStatus] = useState('synced') // 'synced', 'syncing', 'error'
  const [notifications, setNotifications] = useState([])
  
  const syncQueue = useRef(new Map()) // listId -> operations[]
  const isSyncing = useRef(false)
  const reconnectTimer = useRef(null)

  // Initialize socket connection
  useEffect(() => {
    if (!user || !token) return

    console.log('🔌 Initializing collaboration socket...')
    
    const newSocket = io(API_BASE, {
      auth: { token },
      transports: ['websocket'],
      timeout: 20000,
      forceNew: true
    })

    newSocket.on('connect', () => {
      console.log('✅ Collaboration socket connected')
      setConnectionStatus('connected')
      setSyncStatus('synced')
      
      // Clear reconnect timer
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current)
        reconnectTimer.current = null
      }

      // Sync pending operations for all connected lists
      connectedLists.forEach(listId => {
        syncPendingOperations(listId)
      })
    })

    newSocket.on('disconnect', (reason) => {
      console.log('🔌 Collaboration socket disconnected:', reason)
      setConnectionStatus('disconnected')
      setSyncStatus('error')
      
      // Auto-reconnect after delay
      reconnectTimer.current = setTimeout(() => {
        console.log('🔄 Attempting to reconnect...')
        newSocket.connect()
      }, 3000)
    })

    newSocket.on('connect_error', (error) => {
      console.error('❌ Socket connection error:', error)
      setConnectionStatus('error')
      setSyncStatus('error')
    })

    setSocket(newSocket)

    return () => {
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current)
      }
      newSocket.disconnect()
    }
  }, [user, token])

  // Join a list for real-time collaboration
  const joinList = useCallback((listId) => {
    if (!socket || !user) return

    console.log(`👥 Joining collaboration for list: ${listId}`)
    
    socket.emit('join-list', {
      listId,
      userId: user.id,
      userName: user.username || user.email,
      clientId: ot.clientId
    })

    setConnectedLists(prev => new Set([...prev, listId]))

    // Listen for list-specific events
    socket.on('active-users-update', (data) => {
      if (data.listId === listId) {
        setActiveUsers(prev => ({
          ...prev,
          [listId]: data.users
        }))
      }
    })

    socket.on('operation-applied', (data) => {
      if (data.listId === listId) {
        handleRemoteOperation(data)
      }
    })

    socket.on('operation-confirmed', (data) => {
      handleOperationConfirmed(data)
    })

    socket.on('operation-cancelled', (data) => {
      handleOperationCancelled(data)
    })

    socket.on('user-typing', (data) => {
      if (data.listId === listId) {
        handleUserTyping(data)
      }
    })

    socket.on('list-state', (data) => {
      if (data.list._id === listId) {
        handleListState(data)
      }
    })

  }, [socket, user, ot.clientId])

  // Leave a list
  const leaveList = useCallback((listId) => {
    if (!socket || !user) return

    console.log(`👋 Leaving collaboration for list: ${listId}`)
    
    socket.emit('leave-list', {
      listId,
      userId: user.id
    })

    setConnectedLists(prev => {
      const newSet = new Set(prev)
      newSet.delete(listId)
      return newSet
    })

    setActiveUsers(prev => {
      const newUsers = { ...prev }
      delete newUsers[listId]
      return newUsers
    })
  }, [socket, user])

  // Send operation to server
  const sendOperation = useCallback(async (listId, operation) => {
    if (!socket || connectionStatus !== 'connected') {
      // Queue operation for later sync
      queueOperationForSync(listId, operation)
      setSyncStatus('syncing')
      return false
    }

    try {
      console.log(`📤 Sending operation: ${operation.type}`)
      
      socket.emit('operation', {
        listId,
        operation
      })

      // Queue operation locally until confirmed
      ot.queueOperation(operation)
      return true
    } catch (error) {
      console.error('Failed to send operation:', error)
      queueOperationForSync(listId, operation)
      setSyncStatus('error')
      return false
    }
  }, [socket, connectionStatus, ot])

  // Queue operation for sync when connection is restored
  const queueOperationForSync = useCallback((listId, operation) => {
    if (!syncQueue.current.has(listId)) {
      syncQueue.current.set(listId, [])
    }
    syncQueue.current.get(listId).push(operation)
  }, [])

  // Sync pending operations with server
  const syncPendingOperations = useCallback(async (listId) => {
    if (isSyncing.current) return

    const pendingOps = syncQueue.current.get(listId) || []
    const queuedOps = ot.getPendingOperations()
    const allPendingOps = [...pendingOps, ...queuedOps]

    if (allPendingOps.length === 0) return

    isSyncing.current = true
    setSyncStatus('syncing')

    try {
      console.log(`🔄 Syncing ${allPendingOps.length} pending operations for list ${listId}`)
      
      const response = await axios.post(`/api/ShoppingLists/${listId}/operations`, {
        operations: allPendingOps,
        clientId: ot.clientId
      })

      // Clear synced operations
      syncQueue.current.set(listId, [])
      ot.clearQueue()
      
      console.log('✅ Operations synced successfully')
      setSyncStatus('synced')
      
      return response.data
    } catch (error) {
      console.error('❌ Failed to sync operations:', error)
      setSyncStatus('error')
      throw error
    } finally {
      isSyncing.current = false
    }
  }, [ot])

  // Handle remote operation from another user
  const handleRemoteOperation = useCallback((data) => {
    const { operation, newState, appliedBy } = data
    
    console.log(`📥 Received remote operation: ${operation.type} from ${appliedBy.userName}`)

    // Update vector clock
    ot.updateVectorClock(operation.vectorClock || {})

    // Show notification
    addNotification({
      id: operation.operationId,
      type: 'operation',
      message: `${appliedBy.userName} ${getOperationDescription(operation)}`,
      timestamp: new Date(),
      operation,
      user: appliedBy
    })

    // Return the new state to be applied by the list component
    return newState
  }, [ot])

  // Handle operation confirmation from server
  const handleOperationConfirmed = useCallback((data) => {
    const { operationId, serverTimestamp } = data
    console.log(`✅ Operation confirmed: ${operationId}`)
    
    // Remove from pending queue
    ot.dequeueOperation(operationId)
    setSyncStatus('synced')
  }, [ot])

  // Handle operation cancellation
  const handleOperationCancelled = useCallback((data) => {
    const { operationId } = data
    console.log(`❌ Operation cancelled: ${operationId}`)
    
    // Remove from pending queue
    ot.dequeueOperation(operationId)
  }, [ot])

  // Handle user typing indicators
  const handleUserTyping = useCallback((data) => {
    const { userId, userName, isTyping, field } = data
    
    addNotification({
      id: `typing_${userId}_${field}`,
      type: 'typing',
      message: `${userName} is ${isTyping ? 'typing' : 'stopped typing'} in ${field}`,
      timestamp: new Date(),
      user: { userId, userName },
      autoRemove: true
    })
  }, [])

  // Handle initial list state
  const handleListState = useCallback((data) => {
    const { list, activeUsers: users } = data
    console.log(`📋 Received initial list state for: ${list.title}`)
    
    setActiveUsers(prev => ({
      ...prev,
      [list._id]: users
    }))
  }, [])

  // Send typing indicator
  const sendTypingIndicator = useCallback((listId, isTyping, field = 'item') => {
    if (!socket) return
    
    socket.emit('typing', {
      listId,
      isTyping,
      field
    })
  }, [socket])

  // Add notification
  const addNotification = useCallback((notification) => {
    setNotifications(prev => {
      const filtered = prev.filter(n => n.id !== notification.id)
      const newNotifications = [...filtered, notification]
      
      // Auto-remove after delay
      if (notification.autoRemove !== false) {
        setTimeout(() => {
          setNotifications(current => current.filter(n => n.id !== notification.id))
        }, notification.duration || 3000)
      }
      
      return newNotifications.slice(-10) // Keep only last 10
    })
  }, [])

  // Remove notification
  const removeNotification = useCallback((notificationId) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId))
  }, [])

  // Get operation description for notifications
  const getOperationDescription = useCallback((operation) => {
    switch (operation.type) {
      case 'ADD_ITEM':
        return `added ${operation.data.name}`
      case 'REMOVE_ITEM':
        return `removed an item`
      case 'UPDATE_QUANTITY':
        return `updated quantity`
      case 'UPDATE_TITLE':
        return `changed the title`
      default:
        return 'made a change'
    }
  }, [])

  const value = {
    // Connection state
    connectionStatus,
    syncStatus,
    
    // List management
    joinList,
    leaveList,
    connectedLists: Array.from(connectedLists),
    
    // Operations
    sendOperation,
    syncPendingOperations,
    
    // User awareness
    activeUsers,
    sendTypingIndicator,
    
    // Notifications
    notifications,
    addNotification,
    removeNotification,
    
    // Event handlers (for components to override)
    onRemoteOperation: handleRemoteOperation,
    onListState: handleListState,
    
    // Utils
    isOnline: connectionStatus === 'connected',
    hasPendingChanges: syncStatus === 'syncing'
  }

  return (
    <CollaborationContext.Provider value={value}>
      {children}
    </CollaborationContext.Provider>
  )
}

export const useCollaboration = () => {
  const context = useContext(CollaborationContext)
  if (!context) {
    throw new Error('useCollaboration must be used within CollaborationProvider')
  }
  return context
}