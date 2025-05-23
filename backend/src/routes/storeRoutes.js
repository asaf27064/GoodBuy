const express = require('express');
const storeController = require('../controllers/storeController');
const router = express.Router();

router.get('/', storeController.getAllItems);

router.get('/:id', storeController.getItemByID);

router.post('/', storeController.addItem);

router.put('/:id', storeController.updateItem);

router.delete('/:id', storeController.deleteItem);

module.exports = router;