const express = require('express');
const productController = require('../controllers/productController');
const auth = require('../middleware/auth');

const router = express.Router();

router.use(auth);

router.get('/search/:name', productController.searchItems);
router.get('/:id', productController.getById);
router.get('/list_price', productController.getListPriceInStores);

module.exports = router;
