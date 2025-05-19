const fs   = require('fs');
const fsp  = fs.promises;
const path = require('path');
const zlib = require('zlib');
const { pipeline } = require('stream/promises');

const DOWNLOAD_ROOT = path.join(__dirname, 'Downloads');

if (!fs.existsSync(DOWNLOAD_ROOT)) {
  console.warn(`⚠️ Downloads directory not found at ${DOWNLOAD_ROOT}, nothing to decompress.`);
  process.exit(0);
}

async function walkAndExtract(dir) {
  const entries = await fsp.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walkAndExtract(fullPath);
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.gz')) {
      const xmlName = entry.name.replace(/\.gz$/i, '.xml');
      const xmlPath = path.join(dir, xmlName);
      console.log(`🔓 Extracting ${path.relative(DOWNLOAD_ROOT, fullPath)} → ${xmlName}`);
      try {
        await pipeline(
          fs.createReadStream(fullPath),
          zlib.createGunzip(),
          fs.createWriteStream(xmlPath)
        );
        await fsp.unlink(fullPath);
      } catch (err) {
        console.error(`⚠️ Failed to extract ${entry.name}: ${err.message}`);
      }
    }
  }
}

(async () => {
  try {
    console.log(`\n🗂️ Flatten & extract all .gz in ${DOWNLOAD_ROOT}`);
    await walkAndExtract(DOWNLOAD_ROOT);
    console.log(`\n✅ Done — all .gz replaced by .xml in place.`);
  } catch (err) {
    console.error('💥 Fatal error:', err);
    process.exit(1);
  }
})();
