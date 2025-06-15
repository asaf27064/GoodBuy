const path = require('path');
const { spawn } = require('child_process');
const SystemMeta = require('../models/SystemMeta');

module.exports = async function runPricePipeline() {
  await SystemMeta.findByIdAndUpdate(
    'price-refresh',
    { $set: { lastRunStart: new Date(), lastRunOk: false } },
    { upsert: true }
  );

    const proc = spawn('node', ['priceFetch/pipeline.js', 'update'], {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit'
    });

  return new Promise((resolve, reject) => {
    proc.on('exit', async code => {
      await SystemMeta.findByIdAndUpdate(
        'price-refresh',
        { $set: { lastRunEnd: new Date(), lastRunOk: code === 0 } }
      );
      return code === 0 ? resolve() : reject(new Error(`exit ${code}`));
    });
    proc.on('error', reject);
  });
};
