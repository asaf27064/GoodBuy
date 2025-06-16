const path = require('path')
require('dotenv').config({
  path: path.join(__dirname, '.env')
})

const express = require('express')
const mongoose = require('mongoose')
const cors = require('cors')
const http = require('http')
const socketIo = require('socket.io')
const jwt = require('jsonwebtoken')

const app = express()
app.use(cors())
app.use(express.json())

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error(err))

const server = http.createServer(app)
const io = socketIo(server, { 
  cors: { origin: "*" },
  pingTimeout: 60000,
  pingInterval: 25000
})

global.io = io

// Enhanced socket authentication
io.use((socket, next) => {
  const token = socket.handshake.auth?.token
  if (!token) {
    console.log('Socket connection without token')
    return next()
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    socket.user = decoded
    console.log(`🔐 Socket authenticated for user: ${decoded.sub}`)
  } catch (e) {
    console.log('Socket auth failed:', e.message)
  }
  next()
})

// Real-time collaboration system
const activeUsers = new Map() // listId -> Set of users
const userSockets = new Map() // userId -> socket

io.on('connection', (socket) => {
  console.log(`📡 Client connected: ${socket.id}`)
  
  // Join list for real-time collaboration
  socket.on('join-list', async (data) => {
    try {
      const { listId, userId, userName, clientId } = data
      console.log(`👥 ${userName} joined list ${listId}`)
      
      // Store user info on socket
      socket.userId = userId
      socket.userName = userName
      socket.clientId = clientId
      socket.currentListId = listId
      
      // Join the list room
      socket.join(`list-${listId}`)
      
      // Track active users
      if (!activeUsers.has(listId)) {
        activeUsers.set(listId, new Set())
      }
      activeUsers.get(listId).add({
        userId,
        userName,
        clientId,
        socketId: socket.id,
        joinedAt: new Date()
      })
      
      userSockets.set(userId, socket)
      
      // Get current list state from database
      const ShoppingList = require('./models/shoppingListModel')
      try {
        const list = await ShoppingList.findById(listId)
        if (list) {
          // Send current list state to the joining user
          socket.emit('list-state', {
            list: list,
            activeUsers: Array.from(activeUsers.get(listId) || [])
          })
        }
      } catch (error) {
        console.error('Error fetching list for socket:', error)
      }
      
      // Broadcast updated user list to all clients in the room
      const activeUsersInList = Array.from(activeUsers.get(listId) || [])
      io.to(`list-${listId}`).emit('active-users-update', {
        listId,
        users: activeUsersInList
      })
      
    } catch (error) {
      console.error('Join list error:', error)
      socket.emit('error', { message: 'Failed to join list collaboration' })
    }
  })
  
  // Leave list room
  socket.on('leave-list', (data) => {
    try {
      const { listId, userId } = data
      console.log(`👋 ${socket.userName || userId} left list ${listId}`)
      
      socket.leave(`list-${listId}`)
      
      // Remove from active users
      if (activeUsers.has(listId)) {
        const users = activeUsers.get(listId)
        const userToRemove = Array.from(users).find(u => u.userId === userId)
        if (userToRemove) {
          users.delete(userToRemove)
          
          // Broadcast updated user list
          io.to(`list-${listId}`).emit('active-users-update', {
            listId,
            users: Array.from(users)
          })
        }
      }
      
      userSockets.delete(userId)
    } catch (error) {
      console.error('Leave list error:', error)
    }
  })
  
  // Handle real-time list changes (simple version)
  socket.on('list-change', (data) => {
    try {
      const { listId, newState, appliedBy, changes } = data
      console.log(`📡 Broadcasting list change from ${appliedBy.userName}`)
      
      // Broadcast to all users in the list room
      io.to(`list-${listId}`).emit('operation-applied', {
        listId,
        newState,
        appliedBy,
        changes,
        timestamp: new Date()
      })
      
      console.log(`✅ Broadcasted changes to list ${listId}`)
    } catch (error) {
      console.error('List change error:', error)
    }
  })
  
  // Handle typing indicators
  socket.on('typing', (data) => {
    const { listId, isTyping, field } = data
    const userId = socket.userId
    const userName = socket.userName
    
    // Broadcast typing status to other users
    socket.to(`list-${listId}`).emit('user-typing', {
      listId,
      userId,
      userName,
      isTyping,
      field
    })
  })
  
  // Handle disconnect
  socket.on('disconnect', () => {
    const listId = socket.currentListId
    const userId = socket.userId
    
    if (listId && userId) {
      // Remove from active users
      if (activeUsers.has(listId)) {
        const users = activeUsers.get(listId)
        const userToRemove = Array.from(users).find(u => u.userId === userId)
        if (userToRemove) {
          users.delete(userToRemove)
          
          // Broadcast updated user list
          io.to(`list-${listId}`).emit('active-users-update', {
            listId,
            users: Array.from(users)
          })
        }
      }
      
      userSockets.delete(userId)
    }
    
    console.log(`🔌 Client disconnected: ${socket.id}`)
  })

  // Legacy socket handlers (for backward compatibility)
  const { householdId } = socket.handshake.query
  if (householdId) {
    socket.join(householdId)
    console.log(`🏠 Socket ${socket.id} joined household room: ${householdId}`)
  }
  
  // Legacy event handlers
  socket.on('newItem', data => {
    console.log(`📦 Received new item from ${socket.id}:`, data)
    if (householdId) {
      io.to(householdId).emit('itemAdded', data)
    } else {
      io.emit('itemAdded', data)
    }
  })
  
  socket.on('editItem', data => {
    console.log(`✏️ Item edited:`, data)
    io.emit('itemEdited', data)
  })
  
  socket.on('deleteItem', data => {
    console.log(`🗑️ Item deleted:`, data)
    io.emit('itemDeleted', data)
  })
  
  socket.on('createList', data => {
    console.log(`📝 List created:`, data)
    io.emit('List Created', data)
  })
})

// API Routes
const userRoutes = require('./routes/userRoutes')
const shoppingListRoutes = require('./routes/shoppingListRoutes')
const storeRoutes = require('./routes/storeRoutes')
const productRoutes = require('./routes/productRoutes')
const purchaseRoutes = require('./routes/purchaseRoutes')
const recommendationRoutes = require('./routes/recommendationRoutes')
const systemRoutes = require('./routes/system')
const authRoutes = require('./routes/auth')

app.use('/api/Users', userRoutes)
app.use('/api/ShoppingLists', shoppingListRoutes)
app.use('/api/Stores', storeRoutes)
app.use('/api/Products', productRoutes)
app.use('/api/Purchases', purchaseRoutes)
app.use('/api/Recommendations', recommendationRoutes)
app.use('/api/system', systemRoutes)
app.use('/auth', authRoutes)

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date(),
    collaboration: {
      activeConnections: io.engine.clientsCount,
      activeLists: activeUsers.size,
      totalActiveUsers: Array.from(activeUsers.values()).reduce((sum, users) => sum + users.size, 0)
    }
  })
})

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Global error handler:', error)
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  })
})

const PORT = process.env.PORT || 3000
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`)
  console.log(`🤝 Real-time collaboration enabled`)
  console.log(`📊 Health check available at /health`)
})