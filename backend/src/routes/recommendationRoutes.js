const express = require('express')
const router  = express.Router()
const auth    = require('../middleware/auth')
const recCtrl = require('../controllers/recommendationController')
router.get('/', auth, recCtrl.getRecs)
module.exports = router