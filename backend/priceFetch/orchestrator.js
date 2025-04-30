// רץ את כל השלבים בסדר הנכון לפי mode: init | update

const mongoose  = require('mongoose');
const Store     = require('../models/Store');
const { spawn } = require('child_process');
const path      = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const baseDir = __dirname;
const mode    = process.argv[2] === 'update' ? 'update' : 'init';

function runCommand(cmd, args) {
  return new Promise((resolve, reject) => {
    const ps = spawn(cmd, args, { stdio: 'inherit', cwd: baseDir });
    ps.on('exit', code => {
      if (code === 0) return resolve();
      reject(new Error(`Command failed: ${cmd} ${args.join(' ')} (exit ${code})`));
    });
  });
}

async function main() {
  if (mode === 'init') {
    try {
      await mongoose.connect(process.env.MONGO_URI);
      const count = await Store.countDocuments();
      await mongoose.disconnect();
      if (count > 0) {
        console.log('✅ DB כבר מאותחל – מבטל INIT.');
        process.exit(0);
      }
    } catch (err) {
      console.error('❌ שגיאת בדיקת DB:', err);
      process.exit(1);
    }
  }

  console.log(`🚀 Starting pipeline in ${mode.toUpperCase()} mode`);

  if (mode === 'init') {
    console.log('\n📂 STEP 1: parse_and_save_stores.js');
    await runCommand('node', ['parse_and_save_stores.js']);

    console.log('\n🗺️ STEP 2: geocode_stores.js');
    await runCommand('node', ['geocode_stores.js']);
  }

  const fetchScripts = [
    'fetch_hazihinam.js',
    'fetch_laibcatalog.js',
    'fetch_mega_carpur_bitan.js',
    'fetch_publishedprices.js',
    'fetch_pricefull_shufersal.js'
  ];
  console.log(`\n📥 STEP 3: Fetch files (${mode.toUpperCase()}) in parallel`);
  await Promise.all(
    fetchScripts.map(file => runCommand('node', [file, mode]))
  );

  console.log('\n🗜️ STEP 4: decompress.js');
  await runCommand('node', ['decompress.js']);

  console.log('\n💾 STEP 5: parse_and_save_prices.js (כולל sync תמונות)');
  await runCommand('node', ['parse_and_save_prices.js']);

  console.log('\n✅ Pipeline complete!');
}

main().catch(err => {
  console.error(`\n❌ Pipeline failed:`, err);
  process.exit(1);
});
