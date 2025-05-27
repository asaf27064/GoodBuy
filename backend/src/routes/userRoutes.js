const router = require('express').Router()
const c = require('../controllers/userController')

router.post('/', c.createUser)
router.get('/', c.listUsers)
router.get('/:id', c.getUser)
router.put('/:id', c.updateUser)
router.delete('/:id', c.deleteUser)

module.exports = router
