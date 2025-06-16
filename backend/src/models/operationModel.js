const mongoose = require('mongoose')
const { Schema } = mongoose

const operationSchema = new Schema({
  // Which list this operation belongs to
  listId: { type: Schema.Types.ObjectId, ref: 'ShoppingList', required: true },
  
  // Operation details
  type: { 
    type: String, 
    required: true,
    enum: ['ADD_ITEM', 'REMOVE_ITEM', 'UPDATE_QUANTITY', 'UPDATE_TITLE'] 
  },
  
  // Operation data
  data: {
    itemCode: { type: String }, // For item operations
    name: { type: String },     // For item operations  
    image: { type: String },    // For item operations
    quantity: { type: Number }, // For quantity operations
    oldQuantity: { type: Number }, // For quantity operations
    title: { type: String },    // For title operations
    position: { type: Number }  // Position in list for ordering
  },
  
  // Metadata
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  userName: { type: String, required: true },
  clientId: { type: String, required: true }, // Unique client session ID
  operationId: { type: String, required: true }, // Client-generated unique ID
  
  // Vector clock for ordering
  vectorClock: { type: Map, of: Number, default: {} },
  
  // Server timestamp
  serverTimestamp: { type: Date, default: Date.now },
  
  // Operational Transform state
  transformed: { type: Boolean, default: false },
  appliedTo: [{ type: String }] // List of states this was applied to
}, { 
  timestamps: true,
  // Ensure each operation is unique per client
  indexes: [
    { listId: 1, clientId: 1, operationId: 1 },
    { listId: 1, serverTimestamp: 1 }
  ]
})

// Index for efficient querying
operationSchema.index({ listId: 1, serverTimestamp: 1 })
operationSchema.index({ listId: 1, clientId: 1, operationId: 1 }, { unique: true })

module.exports = mongoose.model('Operation', operationSchema)