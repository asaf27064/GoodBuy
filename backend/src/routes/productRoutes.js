// backend/src/routes/productRoutes.js
const express = require('express');
const productController = require('../controllers/productController');
const auth = require('../middleware/auth');

const router = express.Router();

router.use(auth);

// search must come *before* any :id route
router.get('/search/:name', productController.searchItems);

// optional: lookup by id
router.get('/:id', productController.getById);

// optional: list-price
router.get('/list_price', productController.getListPriceInStores);

module.exports = router;
