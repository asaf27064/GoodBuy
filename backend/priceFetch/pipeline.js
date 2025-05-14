// pipeline.js
// Usage:
//   node pipeline.js init
//   node pipeline.js update

const { spawn } = require('child_process');
const mongoose  = require('mongoose');
const path      = require('path');
const Store     = require('../models/Store');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const mode           = process.argv[2] === 'update' ? 'update' : 'init';
const MAX_RUNTIME_MS = 10 * 60 * 1000;  // 10 minutes
const baseDir        = __dirname;

const now = () => new Date().toISOString();
const hrToMs = hr => (hr[0] * 1000 + hr[1] / 1e6).toFixed(0);

function runCommand(label, cmd, args = []) {
  const start = process.hrtime();
  console.log(`\n[${now()}] 🚀 Starting: ${label}`);
  return new Promise((resolve, reject) => {
    const ps = spawn(cmd, args, { stdio: 'inherit', cwd: baseDir });

    const timer = setTimeout(() => {
      console.error(`[${now()}] ⏱ Timeout: ${label} (${MAX_RUNTIME_MS / 60000} min)`);
      ps.kill('SIGKILL');
    }, MAX_RUNTIME_MS);

    ps.on('exit', code => {
      clearTimeout(timer);
      const duration = hrToMs(process.hrtime(start));
      if (code === 0) {
        console.log(`[${now()}] ✅ Done: ${label} in ${duration}ms`);
        resolve();
      } else {
        console.error(`[${now()}] ❌ Failed: ${label} (exit ${code}) after ${duration}ms`);
        reject(new Error(`${label} failed (exit ${code})`));
      }
    });

    ps.on('error', err => {
      clearTimeout(timer);
      const duration = hrToMs(process.hrtime(start));
      console.error(`[${now()}] 💥 Error in: ${label} after ${duration}ms`);
      reject(err);
    });
  });
}

async function main() {
  const pipelineStart = process.hrtime();

  // INIT-mode preflight: skip if stores already exist
  if (mode === 'init') {
    try {
      await mongoose.connect(process.env.MONGO_URI);
      const count = await Store.countDocuments();
      await mongoose.disconnect();
      if (count > 0) {
        console.log(`[${now()}] ✅ DB already initialized – skipping INIT.`);
        process.exit(0);
      }
    } catch (err) {
      console.error(`[${now()}] ❌ DB check failed:`, err);
      process.exit(1);
    }
  }

  console.log(`\n[${now()}] 🛠️ Starting pipeline in ${mode.toUpperCase()} mode`);

  // Step 1 & 2: only on INIT
  if (mode === 'init') {
    await runCommand('STEP 1: parse_and_save_stores.js',    'node', ['parse_and_save_stores.js']);
    await runCommand('STEP 2: geocode_stores.js',          'node', ['geocode_stores.js']);
  }

  // Step 3: fetch price files in parallel
  const fetchScripts = [
    'fetch_hazihinam.js',
    'fetch_laibcatalog.js',
    'fetch_mega_carpur_bitan.js',
    'fetch_pricefull_shufersal.js',
    'fetch_publishedprices.js'
  ];
  console.log(`\n[${now()}] 📥 STEP 3: Running fetch scripts in parallel (${mode.toUpperCase()})`);
  await Promise.all(
    fetchScripts.map(script =>
      runCommand(`FETCH: ${script}`, 'node', [script, mode])
    )
  );

  // Step 4: decompress raw files
  await runCommand('STEP 4: decompress.js', 'node', ['decompress.js']);

  // Step 5: parse & save price items (with fallback)
  await runCommand(
    'STEP 5: parse_priceitems_with_fallback.js',
    'node',
    ['parse_priceitems_with_fallback.js', mode]
  );

  // Step 6: sync and update images
  await runCommand(
    'STEP 6: sync_and_update_images.js',
    'node',
    ['sync_and_update_images.js', mode]
  );

  const totalTime = hrToMs(process.hrtime(pipelineStart));
  console.log(`\n[${now()}] 🎉 Pipeline completed in ${totalTime}ms (${(totalTime/1000).toFixed(1)}s)`);
}

main().catch(err => {
  console.error(`\n[${now()}] ❌ Pipeline failed:`, err);
  process.exit(1);
});
