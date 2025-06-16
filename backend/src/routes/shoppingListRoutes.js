const express = require('express')
const auth = require('../middleware/auth')
const ctrl = require('../controllers/shoppingListController')
const router = express.Router()

router.use(auth)

// Existing routes
router.get('/', ctrl.getAllUserShoppingLists)
router.post('/', ctrl.createList)
router.get('/:id', ctrl.getShoppingList)

// NEW: Operational Transform routes
router.post('/:id/operations', ctrl.applyOperations)
router.get('/:id/operations', ctrl.getOperationsSince)
router.get('/:id/history', ctrl.getListWithHistory)

// Legacy route (for backward compatibility)
router.put('/:id', ctrl.updateListProducts)

module.exports = router