const cron = require('node-cron');
const SystemMeta = require('../models/SystemMeta');
const runPricePipeline = require('../jobs/run-price-pipeline');

// every day at 02:00
cron.schedule('0 2 * * *', async () => {
  const next = new Date(Date.now() + 24*60*60*1000);
  await SystemMeta.findByIdAndUpdate('price-refresh', { $set: { nextPlanned: next } });
  runPricePipeline().catch(console.error);
});