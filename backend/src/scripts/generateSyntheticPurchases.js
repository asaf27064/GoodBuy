const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose')
const { faker } = require('@faker-js/faker')
const Purchase = require('../models/purchaseModel')
const User     = require('../models/userModel')
const Product  = require('../models/productModel')
const bcrypt   = require('bcrypt')

async function main() {
  await mongoose.connect(process.env.MONGO_URI)

  // Ensure 100 users exist
  let users = await User.find().limit(100)
  if (users.length < 100) {
    const toCreate = 100 - users.length
    const newUsers = []
    for (let i = 0; i < toCreate; i++) {
      const plain = 'Password@123'
      const hash  = await bcrypt.hash(plain, 10)
      newUsers.push({
        email:        faker.internet.email(),
        username:     faker.internet.username(),
        passwordHash: hash
      })
    }
    users = users.concat(await User.insertMany(newUsers))
  }

  // Load product catalog
  const products = await Product.find()
  if (!products.length) {
    console.error('No products in DB—please seed products first.')
    process.exit(1)
  }

  // Generate 50 baskets per user
  const basketsPerUser = 50
  const totalUsers     = users.length
  const purchases      = []

  for (let u = 0; u < totalUsers; u++) {
    const user = users[u]
    for (let b = 0; b < basketsPerUser; b++) {
      const count = faker.number.int({ min: 5, max: 15 })
      const picked = faker.helpers.shuffle(products).slice(0, count)
      const items = picked.map(p => ({
        product: {
          itemCode: p._id,
          name:     p.name,
          image:    p.image,
          numUnits: faker.number.int({ min: 1, max: 4 })
        },
        numUnits: faker.number.int({ min: 1, max: 4 })
      }))

      purchases.push({
        listId:      new mongoose.Types.ObjectId(),
        timeStamp:   faker.date.past({ years: 1 }),
        purchasedBy: user._id,
        products:    items
      })
    }
  }

  await Purchase.insertMany(purchases)
  console.log(`Inserted ${purchases.length} synthetic purchases.`)
  process.exit(0)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
