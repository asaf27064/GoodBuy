import mongoose from 'mongoose';

const { Schema } = mongoose;

export const productSchema = new Schema({
    _id: {type: String, required: true},
    name: { type: String, required: true },
    image: { type: String, default: '' },
    category: { type: String}
});

const Product = mongoose.model('Product', productSchema);

export default Product;
