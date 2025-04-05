const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect('mongodb://localhost:27017/GoodBuy')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error(err));

const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: "*" } });

global.io = io;

io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  const { userId, householdId } = socket.handshake.query;

  if (householdId) {
    socket.join(householdId);
    console.log(`Socket ${socket.id} joined household room: ${householdId}`);
  }

  socket.on('newItem', (data) => {
    console.log(`Received new item from ${socket.id}:`, data);
    if (householdId) {
      io.to(householdId).emit('itemAdded', data);
    } else {
      io.emit('itemAdded', data);
    }
  });

  socket.on('editItem', (data) => {
    console.log(`Item edited by ${socket.id}:`, data);
    io.emit('itemEdited', data);
  });

  socket.on('deleteItem', (data) => {
    console.log(`Item deleted by ${socket.id}:`, data);
    io.emit('itemDeleted', data);
  });

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

const itemsRoute = require('./routes/Items');
const historyRoute = require('./routes/History');
app.use('/items', itemsRoute);
app.use('/history', historyRoute);

const PORT = 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
