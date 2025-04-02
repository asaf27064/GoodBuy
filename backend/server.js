const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
app.use(cors());
app.use(express.json());

// Connect to MongoDB (replace the URI as needed)
mongoose.connect('mongodb://localhost:27017/shoppinglist', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error(err));

// Test endpoint
app.get('/ping', (req, res) => {
  res.send('pong');
});

// Create HTTP server and attach Socket.IO
const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: "*" } });

io.on('connection', (socket) => {
  console.log('A client connected:', socket.id);
  socket.on('disconnect', () => console.log('Client disconnected:', socket.id));
});

const PORT = 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
