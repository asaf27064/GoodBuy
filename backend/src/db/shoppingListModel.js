import mongoose from 'mongoose';
import productSchema from './productModel';

const { Schema } = mongoose;

const shoppingListSchema = new Schema({
    _id: { type: mongoose.ObjectId },
    members: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    title: { type: String },
    importantList: { type: Boolean, required: true, default: false}, // Will determine whether this list affects recommendations
    products: [productSchema]
});

const ShoppingList = mongoose.model('Shopping List', shoppingListSchema);

export default ShoppingList;