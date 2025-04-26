const { spawn } = require('child_process');
const path = require('path');

// List of price‑fetcher scripts to run in parallel
const scripts = [
  'fetch_pricefull_hazihinam.js',
  'fetch_pricefull_laibcatalog.js',
  'fetch_pricefull_mega_carpur_bitan.js',
  'fetch_pricefull_publishedprices.js',
  'fetch_pricefull_shufersal.js'
];

(async () => {
  console.log('🚀 Launching all fetchers in parallel…');

  const tasks = scripts.map((s) => new Promise((resolve) => {
    const full = path.join(__dirname, s);
    console.log(`↻  ${s}`);
    const proc = spawn('node', [full], { stdio: 'inherit' });

    proc.on('exit', (code) => {
      if (code === 0) {
        console.log(`✔️  ${s} finished`);
      } else {
        console.warn(`⚠️  ${s} exited with code ${code}`);
      }
      resolve(); // always resolve – we don't want one failure to stop the rest
    });
  }));

  await Promise.all(tasks);
  console.log('🏁 All scripts completed');
})();
