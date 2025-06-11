const express = require('express');
const purchaseController = require('../controllers/purchaseController');
const router = express.Router();
const auth = require('../middleware/auth')


router.get('/:user_id', purchaseController.getUserPurchases);

router.post('/', auth, purchaseController.createPurchase);

module.exports = router;