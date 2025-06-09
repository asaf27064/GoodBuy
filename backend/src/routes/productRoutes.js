const express = require('express');
const productController = require('../controllers/productController');
const router = express.Router();

router.get('/', productController.getAllProducts);

router.get('/list_price', productController.getListPriceInStores);

router.get('/:id', productController.getProductByID); // DO NOT MOVE THIS LINE ABOVE list_price! 

router.get('/search/:name', productController.getProductByName);

router.post('/', productController.addItem);

router.put('/:id', productController.updateItem);

router.delete('/:id', productController.deleteItem);

module.exports = router;