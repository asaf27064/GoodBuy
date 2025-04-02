const express = require('express');
const itemsController = require('../controllers/itemsController');

const router = express.Router();

router.get('/', itemsController.getAllItems);

router.get('/:id', itemsController.getItemById);

router.post('/', itemsController.addItem);

router.put('/:id', itemsController.updateItem);

router.delete('/:id', itemsController.deleteItem);

module.exports = router;