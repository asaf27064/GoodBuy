import mongoose from 'mongoose';

const { Schema } = mongoose;

const storeSchema = new Schema({
    _id: { 
        chain: {type: String, required: true},
        subChain: {type: String},
        branch: {type: String, required: true},
    },

    address: { type: String, required: true },
});

const Store = mongoose.model('Store', storeSchema);

export default Store;