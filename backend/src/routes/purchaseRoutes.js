// File: routes/purchaseRoutes.js

const express = require('express');
const router = express.Router();
const purchaseController = require('../controllers/purchaseController');
const auth = require('../middleware/auth');

// POST /api/purchases
// Protected: user must be logged in (req.user set by auth)
router.post('/', auth, purchaseController.createPurchase);

// GET /api/purchases/me
// Returns this user’s purchase history
router.get('/me', auth, purchaseController.getMyPurchaseHistory);

module.exports = router;
