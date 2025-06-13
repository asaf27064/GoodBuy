const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const { faker } = require('@faker-js/faker');
const Purchase = require('../models/purchaseModel');
const User     = require('../models/userModel');
const Product  = require('../models/productModel');
const bcrypt   = require('bcrypt');

async function main() {
  await mongoose.connect(process.env.MONGO_URI);

  // 1) Ensure 100 users exist
  let users = await User.find().limit(100);
  if (users.length < 100) {
    const toCreate = 100 - users.length;
    const newUsers = [];
    for (let i = 0; i < toCreate; i++) {
      const plain = 'Password@123';
      const hash  = await bcrypt.hash(plain, 10);
      newUsers.push({
        email:        faker.internet.email(),
        username:     faker.internet.username(),
        passwordHash: hash
      });
    }
    users = users.concat(await User.insertMany(newUsers));
  }

  // 2) Load product catalog
  const products = await Product.find();
  if (!products.length) {
    console.error('No products in DB—please seed products first.');
    process.exit(1);
  }

  // 3) Create user segments for collaborative filtering realism
  const segmentCount = 5;
  const segmentSize  = Math.ceil(users.length / segmentCount);
  const segments     = Array.from({ length: segmentCount }, (_, i) =>
    users.slice(i * segmentSize, (i + 1) * segmentSize).map(u => u._id)
  );
  const segmentPrefs = segments.map(() =>
    faker.helpers.shuffle(products).slice(0, 10).map(p => p._id)
  );
  const userSegmentMap = {};
  segments.forEach((seg, idx) =>
    seg.forEach(uid => { userSegmentMap[uid.toString()] = idx; })
  );

  // 4) Generate synthetic purchases with weekly habits
  const basketsPerUser = 50;
  const purchases      = [];
  const now            = new Date();

  for (const user of users) {
    // Determine segment and preferences
    const segIndex = userSegmentMap[user._id.toString()];
    const prefs    = segmentPrefs[segIndex] || [];

    // Habit items: 1-3 per user, 60% from segment prefs, 40% random
    const habitCount = faker.number.int({ min: 1, max: 3 });
    const fromPrefsCount = Math.ceil(habitCount * 0.6);
    const fromPrefs = faker.helpers.shuffle(prefs).slice(0, fromPrefsCount);
    const randPool  = faker.helpers.shuffle(products.map(p => p._id)).filter(
      id => !fromPrefs.includes(id)
    );
    const fromRand = randPool.slice(0, habitCount - fromPrefsCount);
    const habitItems = [...fromPrefs, ...fromRand];

    for (let b = 0; b < basketsPerUser; b++) {
      // Basket date: b weeks ago + jitter
      const basketDate = new Date(now);
      basketDate.setDate(now.getDate() - b * 7 + faker.number.int({ min: -1, max: 1 }));

      // Pick random items 5-15
      const count = faker.number.int({ min: 5, max: 15 });
      const picked = faker.helpers.shuffle(products).slice(0, count);
      const items = picked.map(p => ({
        product: {
          itemCode: p._id,
          name:     p.name,
          image:    p.image,
          numUnits: faker.number.int({ min: 1, max: 4 })
        },
        numUnits: faker.number.int({ min: 1, max: 4 })
      }));

      // Ensure habit items in every weekly basket
      habitItems.forEach(hid => {
        if (!items.some(i => i.product.itemCode.toString() === hid.toString())) {
          const prod = products.find(p => p._id.toString() === hid.toString());
          if (prod) {
            items.push({
              product: {
                itemCode: prod._id,
                name:     prod.name,
                image:    prod.image,
                numUnits: 1
              },
              numUnits: 1
            });
          }
        }
      });

      purchases.push({
        listId:      new mongoose.Types.ObjectId(),
        timeStamp:   basketDate,
        purchasedBy: user._id,
        products:    items
      });
    }
  }

  // 5) Bulk insert all purchases
  await Purchase.insertMany(purchases);
  console.log(`Inserted ${purchases.length} synthetic purchases.`);
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
