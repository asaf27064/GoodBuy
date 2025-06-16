const Operation = require('../models/operationModel')
const ShoppingList = require('../models/shoppingListModel')
const User = require('../models/userModel')
const OperationalTransform = require('../services/operationalTransform')

class ListCollaboration {
  constructor(io) {
    this.io = io
    this.activeUsers = new Map() // listId -> Set of users
    this.userSockets = new Map() // userId -> socket
  }

  init() {
    this.io.on('connection', (socket) => {
      console.log(`📡 Client connected: ${socket.id}`)
      
      // Join list room for collaboration
      socket.on('join-list', async (data) => {
        try {
          await this.handleJoinList(socket, data)
        } catch (error) {
          console.error('Join list error:', error)
          socket.emit('error', { message: 'Failed to join list collaboration' })
        }
      })
      
      // Leave list room
      socket.on('leave-list', async (data) => {
        try {
          await this.handleLeaveList(socket, data)
        } catch (error) {
          console.error('Leave list error:', error)
        }
      })
      
      // Handle operations from client
      socket.on('operation', async (data) => {
        try {
          await this.handleOperation(socket, data)
        } catch (error) {
          console.error('Operation error:', error)
          socket.emit('operation-error', { 
            operationId: data.operationId,
            error: error.message 
          })
        }
      })
      
      // Handle typing indicators
      socket.on('typing', (data) => {
        this.handleTyping(socket, data)
      })
      
      // Handle cursor position updates
      socket.on('cursor-update', (data) => {
        this.handleCursorUpdate(socket, data)
      })
      
      // Handle disconnect
      socket.on('disconnect', () => {
        this.handleDisconnect(socket)
      })
    })
  }

  async handleJoinList(socket, data) {
    const { listId, userId, userName, clientId } = data
    
    // Verify user has access to this list
    const list = await ShoppingList.findById(listId)
    if (!list || !list.members.map(id => id.toString()).includes(userId)) {
      throw new Error('Access denied to this list')
    }
    
    // Store user info on socket
    socket.userId = userId
    socket.userName = userName
    socket.clientId = clientId
    socket.currentListId = listId
    
    // Join the list room
    socket.join(`list-${listId}`)
    
    // Track active users
    if (!this.activeUsers.has(listId)) {
      this.activeUsers.set(listId, new Set())
    }
    this.activeUsers.get(listId).add({
      userId,
      userName,
      clientId,
      socketId: socket.id,
      joinedAt: new Date()
    })
    
    this.userSockets.set(userId, socket)
    
    console.log(`👥 User ${userName} joined list ${listId}`)
    
    // Broadcast updated user list to all clients in the room
    const activeUsersInList = Array.from(this.activeUsers.get(listId))
    this.io.to(`list-${listId}`).emit('active-users-update', {
      listId,
      users: activeUsersInList
    })
    
    // Send current list state to the joining user
    socket.emit('list-state', {
      list: await ShoppingList.findById(listId),
      activeUsers: activeUsersInList
    })
  }

  async handleLeaveList(socket, data) {
    const { listId, userId } = data
    
    socket.leave(`list-${listId}`)
    
    // Remove from active users
    if (this.activeUsers.has(listId)) {
      const users = this.activeUsers.get(listId)
      const userToRemove = Array.from(users).find(u => u.userId === userId)
      if (userToRemove) {
        users.delete(userToRemove)
        
        // Broadcast updated user list
        this.io.to(`list-${listId}`).emit('active-users-update', {
          listId,
          users: Array.from(users)
        })
      }
    }
    
    this.userSockets.delete(userId)
    console.log(`👋 User ${socket.userName || userId} left list ${listId}`)
  }

  async handleOperation(socket, data) {
    const { listId, operation } = data
    const userId = socket.userId
    const userName = socket.userName
    const clientId = socket.clientId
    
    // Validate operation
    if (!this.validateOperation(operation)) {
      throw new Error('Invalid operation format')
    }
    
    // Create operation record
    const operationRecord = new Operation({
      listId,
      type: operation.type,
      data: operation.data,
      userId,
      userName,
      clientId,
      operationId: operation.operationId,
      vectorClock: operation.vectorClock || {},
      serverTimestamp: new Date()
    })
    
    // Check for duplicate operations
    const existingOp = await Operation.findOne({
      listId,
      clientId,
      operationId: operation.operationId
    })
    
    if (existingOp) {
      console.log(`⚠️ Duplicate operation ignored: ${operation.operationId}`)
      return
    }
    
    // Save operation to database
    await operationRecord.save()
    console.log(`💾 Operation saved: ${operation.type} by ${userName}`)
    
    // Apply operational transformation
    const resolvedOps = await OperationalTransform.resolveConflicts(listId, [operationRecord])
    
    if (resolvedOps.length === 0) {
      console.log(`🚫 Operation cancelled due to conflicts: ${operation.operationId}`)
      socket.emit('operation-cancelled', { operationId: operation.operationId })
      return
    }
    
    // Apply operations to get new state
    const newState = await OperationalTransform.processOperations(listId, resolvedOps)
    
    // Update the shopping list in database
    await ShoppingList.findByIdAndUpdate(listId, {
      title: newState.title,
      products: newState.products,
      editLog: newState.editLog
    })
    
    // Broadcast to all clients in the list room including sender
    this.io.to(`list-${listId}`).emit('operation-applied', {
      listId,
      operation: operationRecord,
      newState: {
        products: newState.products,
        title: newState.title
      },
      appliedBy: { userId, userName }
    })
    
    // Confirm to sender
    socket.emit('operation-confirmed', {
      operationId: operation.operationId,
      serverTimestamp: operationRecord.serverTimestamp
    })
    
    console.log(`✅ Operation applied and broadcasted: ${operation.type}`)
  }

  handleTyping(socket, data) {
    const { listId, isTyping, field } = data
    const userId = socket.userId
    const userName = socket.userName
    
    // Broadcast typing status to other users
    socket.to(`list-${listId}`).emit('user-typing', {
      listId,
      userId,
      userName,
      isTyping,
      field // 'title', 'item-search', etc.
    })
  }

  handleCursorUpdate(socket, data) {
    const { listId, itemCode, field, position } = data
    const userId = socket.userId
    const userName = socket.userName
    
    // Broadcast cursor position to other users
    socket.to(`list-${listId}`).emit('cursor-update', {
      listId,
      userId,
      userName,
      itemCode,
      field,
      position
    })
  }

  handleDisconnect(socket) {
    const listId = socket.currentListId
    const userId = socket.userId
    
    if (listId && userId) {
      // Remove from active users
      if (this.activeUsers.has(listId)) {
        const users = this.activeUsers.get(listId)
        const userToRemove = Array.from(users).find(u => u.userId === userId)
        if (userToRemove) {
          users.delete(userToRemove)
          
          // Broadcast updated user list
          this.io.to(`list-${listId}`).emit('active-users-update', {
            listId,
            users: Array.from(users)
          })
        }
      }
      
      this.userSockets.delete(userId)
    }
    
    console.log(`🔌 Client disconnected: ${socket.id}`)
  }

  validateOperation(operation) {
    const validTypes = ['ADD_ITEM', 'REMOVE_ITEM', 'UPDATE_QUANTITY', 'UPDATE_TITLE']
    
    if (!operation.type || !validTypes.includes(operation.type)) {
      return false
    }
    
    if (!operation.operationId || !operation.data) {
      return false
    }
    
    // Type-specific validation
    switch (operation.type) {
      case 'ADD_ITEM':
        return operation.data.itemCode && operation.data.name
      case 'REMOVE_ITEM':
        return operation.data.itemCode
      case 'UPDATE_QUANTITY':
        return operation.data.itemCode && typeof operation.data.quantity === 'number'
      case 'UPDATE_TITLE':
        return typeof operation.data.title === 'string'
      default:
        return false
    }
  }

  // Get active users for a list
  getActiveUsers(listId) {
    return Array.from(this.activeUsers.get(listId) || [])
  }

  // Send message to specific user
  sendToUser(userId, event, data) {
    const socket = this.userSockets.get(userId)
    if (socket) {
      socket.emit(event, data)
    }
  }
}

module.exports = ListCollaboration