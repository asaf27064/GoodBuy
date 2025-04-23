import mongoose from 'mongoose';

const { Schema } = mongoose;

const storeSchema = new Schema({
    _id: { 
        chain: {type: String, required: true},
        subChain: {type: String}, // Might be relevant in cases like "Shufersal BE", but consider removal based on all chains' identifiers.
        branch: {type: String, required: true},
    },

    address: { type: String, required: true },
});

const Store = mongoose.model('Store', storeSchema);

export default Store;