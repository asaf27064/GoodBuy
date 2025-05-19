const express = require('express');
const shoppingListController = require('../controllers/shoppingListController');
const router = express.Router();

router.get('/', shoppingListController.getAllUserShoppingLists);

router.post('/', shoppingListController.createList);

router.get('/:id', shoppingListController.getShoppingList);

router.put('/:id', shoppingListController.updateListProducts);

module.exports = router;