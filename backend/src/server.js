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
const io = socketIo(server, { cors: { origin: "*" } })

global.io = io

io.use((socket, next) => {
  const token = socket.handshake.auth?.token
  if (!token) return next()
  try {
    socket.user = jwt.verify(token, process.env.JWT_SECRET)
  } catch (e) {
    console.log('Socket auth failed:', e.message)
  }
  next()
})

io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`)
  const { householdId } = socket.handshake.query
  if (householdId) {
    socket.join(householdId)
    console.log(`Socket ${socket.id} joined household room: ${householdId}`)
  }
  socket.on('newItem', data => {
    console.log(`Received new item from ${socket.id}:`, data)
    if (householdId) io.to(householdId).emit('itemAdded', data)
    else io.emit('itemAdded', data)
  })
  socket.on('editItem', data => io.emit('itemEdited', data))
  socket.on('deleteItem', data => io.emit('itemDeleted', data))
  socket.on('createList', data => io.emit('List Created', data))
  socket.on('disconnect', () => console.log(`Client disconnected: ${socket.id}`))
})

const itemsRoute = require('./routes/Items')
const historyRoute = require('./routes/History')
app.use('/items', itemsRoute)
app.use('/history', historyRoute)

const userRoutes = require('./routes/userRoutes')
const shoppingListRoutes = require('./routes/shoppingListRoutes')
const storeRoutes = require('./routes/storeRoutes')
const productRoutes = require('./routes/productRoutes')
const purchaseRoutes = require('./routes/purchaseRoutes')

app.use('/api/Users', userRoutes);
app.use('/api/ShoppingLists', shoppingListRoutes);
app.use('/api/Stores', storeRoutes);
app.use('/api/Products', productRoutes);
app.use('/api/Purchases', purchaseRoutes);


const authRoutes = require('./routes/auth')
app.use('/auth', authRoutes)

const PORT = process.env.PORT || 3000
server.listen(PORT, () => console.log(`Server running on port ${PORT}`))
