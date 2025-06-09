

const mongoose = require('mongoose');
const { Schema } = mongoose;

//const Product = require('./productModel');


// Entity "Product" shouldn't have an "numUnits" field, so it's explicitly added here.

const productWithAmountSchema = new Schema({
    product: { type: String, ref: 'Product', required: true },
    numUnits: { type: Number, required: true, default: 1 }
});

/*const editLogEntrySchema = new Schema({
    product: { type: String, ref: 'Product'},
    action: { type: String, enum: ['created', 'updated', 'deleted'], required: true },
    changedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    changeDetails: { type: Object },
    timestamp: { type: Date, default: Date.now }
});*/

const shoppingListSchema = new Schema({
    members: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    title: { type: String },
    importantList: { type: Boolean, required: true, default: false}, // Will determine whether this list affects recommendations
    products: [productWithAmountSchema],
    editLog: []
});

module.exports = mongoose.model('Shopping List', shoppingListSchema);

