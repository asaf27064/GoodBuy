const express = require('express');
const userController = require('../controllers/userController');
const router = express.Router();

router.get('/:username', userController.getUser);

router.post('/', userController.createUser);

module.exports = router;