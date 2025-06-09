const Store = require('../models/storeModel');
const { findNearestStores }  = require('../findNearestStores');

exports.getAllItems = async (req, res) => {
    try {
        const items = await Item.find();
        res.json(items);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.addItem = async (req, res) => {
    try {
        const newItem = new Item({ name: req.body.name, quantity: req.body.quantity })
        await newItem.save();

        await History.create({
            itemId: newItem._id,
            action: 'created',
            changedBy: req.body.userId,
            changeDetails: { name: newItem.name, quantity: newItem.quantity },
            timestamp: new Date()
          });

          global.io.emit('itemAdded', newItem);

        res.status(201).json(newItem);
    }
    
    catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.deleteItem = async (req, res) => {
    try {
        const { id } = req.params;
        const deletedItem = await Item.findByIdAndDelete(id);
        if (!deletedItem) {
            return res.status(404).json({ error: 'Item not found' });

        }

        await History.create({
            itemId: deletedItem._id,
            action: 'deleted',
            changedBy: req.body.userId,
            changeDetails: deletedItem,
            timestamp: new Date()
          });
          
          global.io.emit('itemDeleted', deletedItem);

        res.json({ message: 'Item deleted successfully', item: deletedItem });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.updateItem = async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = {
        name: req.body.name,
        quantity: req.body.quantity
      };
  
      const updatedItem = await Item.findByIdAndUpdate(id, updateData, { new: true });
      if (!updatedItem) {
        return res.status(404).json({ error: 'Item not found' });
      }
  
      await History.create({
        itemId: updatedItem._id,
        action: 'updated',
        changedBy: req.body.userId,
        changeDetails: updateData,
        timestamp: new Date()
      });

      global.io.emit('itemEdited', updatedItem);
  
      res.json({ message: 'Item updated successfully', item: updatedItem });
    } catch (error) {
      console.error("Error updating item:", error);
      res.status(500).json({ error: error.message });
    }
  };
  

exports.getItemByID = async (req, res) => {
    try {
        const { id } = req.params;
        const item = await Item.findById(id);
        if (!item) {
            return res.status(404).json({ error: 'Item not found' });
        }
        res.json(item);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
  };

exports.searchStores = async (req, res) => {
      try {

          const location = {};
          location.latitude = req.query.latitude;
          location.longitude = req.query.longitude;
          console.log(location);
          const nearestStores = findNearestStores(location);


          if (!nearestStores) {
              return res.status(404).json({ error: 'Could not locate any stores near you.' });
          }
          res.json(nearestStores);
      } catch (error) {
          res.status(500).json({ error: error.message });
      }
};