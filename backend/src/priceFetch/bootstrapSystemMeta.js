require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { MongoClient } = require('mongodb');

(async () => {
  const client = await new MongoClient(process.env.MONGO_URI).connect();
  const db     = process.env.MONGO_DB ? client.db(process.env.MONGO_DB) : client.db();

  await db.collection('system_meta').updateOne(
    { _id: 'price-refresh' },
    { $setOnInsert: {
        createdAt  : new Date(),
        lastSuccess: null,
        note       : 'Bootstrap on first init'
      }
    },
    { upsert: true }
  );

  console.log('✅ system_meta.price-refresh bootstrapped');
  await client.close();
  process.exit(0);
})();
