const express = require('express');
const productController = require('../controllers/productController');
const router = express.Router();

router.get('/', productController.getAllProducts);

router.get('/:id', productController.getProductByID);

router.get('/search/:name', productController.getProductByName);

router.post('/', productController.addItem);

router.put('/:id', productController.updateItem);

router.delete('/:id', productController.deleteItem);

module.exports = router;