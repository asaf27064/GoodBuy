const Product = require('../models/productModel');
const ProductWithPrice = require('../models/PriceItem')


exports.getAllProducts = async (req, res) => {
    try {
        const products = await Product.find();
        res.json(products);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getProductByName = async (req, res) => {

  const  productName  = req.params.name;

  try {
    const productsMatched = await Product.find({
      name: { $regex: productName, $options: 'i' }  // equivalent to "WHERE name LIKE '...'"" in SQL. Case Insensitive.
    });
    console.log(productsMatched);
    res.json({ results: productsMatched });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
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
  

exports.getProductByID = async (req, res) => {
    try {
        const { id } = req.params;
        const product = await Product.findById(id);
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }
        res.json(product);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
  };

exports.getListPriceInStores = async (req, res) => {
  try {

    const  stores = JSON.parse(req.query.stores);
    const  products = JSON.parse(req.query.products);
    const itemCodes = products.map((item)=>(item.prodctId))
    const pricesInStores = [];

    console.log(req.query);
    console.log(stores);
    console.log(products);


    const productsMatched = await ProductWithPrice.find({
      itemCode: { $in: itemCodes },
      storeRef: ObjectId(stores[0])
    });

    console.log(productsMatched);
    console.log("beans")
    pricesInStores.append({name: "store0", prices: productsMatched});
    console.log("beans")
     productsMatched = await ProductWithPrice.find({
      itemCode: { $in: itemCodes },
      storeRef: new ObjectId(stores[1])
    });
    console.log("beans")
    pricesInStores.append({name: "store1", prices: productsMatched});
    console.log("beans")
    if (!pricesInStores) {
        return res.status(404).json({ error: 'Product not found' });
    }
    console.log("beans")
    res.json(pricesInStores);
} catch (error) {
    res.status(500).json({ error: error.message });
}
  };