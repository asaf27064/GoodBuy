const express = require('express');
const purchaseController = require('../controllers/purchaseController');
const router = express.Router();

router.get('/:user_id', purchaseController.getUserPurchases);

router.post('/', purchaseController.createPurchase);

//router.put('/:id', purchaseController.updateItem);

//router.delete('/:id', purchaseController.deleteItem);

module.exports = router;