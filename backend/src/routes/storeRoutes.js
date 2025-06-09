const express = require('express');
const storeController = require('../controllers/storeController');
const auth = require('../middleware/auth')
const router = express.Router();


router.use(auth)

router.get('/',    storeController.getAllItems);

router.get('/store_search', storeController.searchStores);

router.get('/:id', storeController.getItemByID);

router.post('/',   storeController.addItem);

router.put('/:id', storeController.updateItem);

router.delete('/:id', storeController.deleteItem);

module.exports = router;