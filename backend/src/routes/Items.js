const express = require('express');
const itemsController = require('../controllers/itemsController');
const router = express.Router();
const auth = require('../middleware/auth');

router.use(auth);

router.get('/', itemsController.getAllItems);

router.get('/:id', itemsController.getItemByID);

router.post('/', itemsController.addItem);

router.put('/:id', itemsController.updateItem);

router.delete('/:id', itemsController.deleteItem);

module.exports = router;