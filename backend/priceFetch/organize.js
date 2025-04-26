const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Root directory that already contains all downloaded content
const DOWNLOAD_ROOT = path.join(__dirname, 'FullPriceDownloads');   // original download tree
const XML_DIR       = path.join(__dirname, 'FullPriceXML');        // final flat dir (xml only)
const OTHERS_DIR    = path.join(__dirname, 'FullPriceOthers');     // non‑xml / failed gz files

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function uniqueName(dir, baseName) {
  let candidate = baseName;
  let idx = 1;
  while (fs.existsSync(path.join(dir, candidate))) {
    const ext  = path.extname(baseName);
    const stem = path.basename(baseName, ext);
    candidate  = `${stem}_${idx}${ext}`;
    idx       += 1;
  }
  return candidate;
}

async function flattenAndExtract() {
  console.log('\n🗂️  Organising downloads in %s …', DOWNLOAD_ROOT);

  ensureDir(XML_DIR);
  ensureDir(OTHERS_DIR);

  const others = [];

  async function moveToOthers(src, name, reason) {
    const destName = uniqueName(OTHERS_DIR, name);
    const destPath = path.join(OTHERS_DIR, destName);
    await fs.promises.copyFile(src, destPath);
    await fs.promises.unlink(src);
    others.push(destName);
    if (reason) console.warn(`⚠️  ${name} → moved to Others (${reason})`);
  }

  async function walk(dir) {
    const entries = await fs.promises.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (ext === '.gz') {
          // attempt to extract → xml
          const xmlName  = entry.name.replace(/\.gz$/i, '.xml');
          const destName = uniqueName(XML_DIR, xmlName);
          const destPath = path.join(XML_DIR, destName);
          console.log(`🔓 Extracting ${entry.name} → ${destName}`);
          try {
            await new Promise((res, rej) => {
              fs.createReadStream(full)
                .pipe(zlib.createGunzip())
                .pipe(fs.createWriteStream(destPath))
                .on('finish', res)
                .on('error', rej);
            });
            fs.unlinkSync(full); // remove gz on success
          } catch (err) {
            // extraction failed – move gz to Others and continue
            await moveToOthers(full, entry.name, 'gunzip failed');
          }
        } else if (ext === '.xml') {
          // move xml as‑is
          const destName = uniqueName(XML_DIR, entry.name);
          const destPath = path.join(XML_DIR, destName);
          await fs.promises.copyFile(full, destPath);
          await fs.promises.unlink(full);
        } else {
          // move unknown to others
          await moveToOthers(full, entry.name);
        }
      }
    }
  }

  if (!fs.existsSync(DOWNLOAD_ROOT)) {
    console.warn('⚠️  Download root %s not found – nothing to organise.', DOWNLOAD_ROOT);
    return;
  }

  await walk(DOWNLOAD_ROOT);

  console.log('\n📦 Finished flattening – all xml files are now in %s', XML_DIR);
  if (others.length) {
    console.log('\n⚠️  Found %d non‑xml or failed files, moved to %s:', others.length, OTHERS_DIR);
    others.forEach((f) => console.log('   - %s', f));
  } else {
    console.log('✅ No unexpected files encountered');
  }
}

// Execute immediately when script is run
flattenAndExtract().catch((err) => {
  console.error('💥 Error:', err);
  process.exit(1);
});
