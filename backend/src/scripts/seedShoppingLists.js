const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose')
const { faker } = require('@faker-js/faker')
const User     = require('../models/userModel')
const Product  = require('../models/productModel')
const List     = require('../models/shoppingListModel')

async function main() {
  await mongoose.connect(process.env.MONGO_URI)

  const users    = await User.find().limit(20)     // seed for first 20 users
  const products = await Product.find().limit(100) // pick from first 100 products

  const lists = []

  users.forEach(user => {
    // give each user 3 lists
    for (let i = 0; i < 3; i++) {
      // pick 5–10 random products per list
      const count = faker.number.int({ min: 5, max: 10 })
      const picked = faker.helpers.shuffle(products).slice(0, count)

      lists.push({
        title:     faker.lorem.words(2),
        members:   [user._id],
        importantList: faker.datatype.boolean(),
        products: picked.map(p => ({
          product: {
            itemCode: p._id,
            name:     p.name,
            image:    p.image
          },
          numUnits: faker.number.int({ min: 1, max: 3 })
        }))
      })
    }
  })

  await List.deleteMany({})
  const res = await List.insertMany(lists)
  console.log(`Seeded ${res.length} shopping lists.`)
  process.exit(0)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
