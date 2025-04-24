// debug_shufersal_full.js
const puppeteer = require('puppeteer');
const axios     = require('axios');
const fs        = require('fs');
const path      = require('path');
const zlib      = require('zlib');

(async () => {
  const url = 'https://prices.shufersal.co.il/FileObject/UpdateCategory?catID=0&storeId=0';
  console.log(`📥 Navigating to ${url}…`);

  const browser = await puppeteer.launch({ headless: true });
  const page    = await browser.newPage();
  await page.goto(url, { waitUntil: 'networkidle2' });

  // wait for the rows to render
  await page.waitForSelector('table tbody', { timeout: 15000 });
  console.log('✅ Table body is present.');

  // dump the table for inspection
  const tableHtml = await page.$eval('table', t => t.outerHTML);
  fs.writeFileSync(path.join(__dirname, 'shufersal_table.html'), tableHtml);
  console.log('💾 Wrote full table HTML to shufersal_table.html');

  // grab any link containing “.gz”
  const gzLinks = await page.$$eval('a', as =>
    as.map(a => a.href).filter(href => href.includes('.gz'))
  );
  console.log(`\n🎯 Found ${gzLinks.length} .gz candidates:`);
  gzLinks.forEach(l => console.log('  -', l));

  // prepare output dir
  const OUT_DIR = path.join(__dirname, 'downloads_shufersal_full');
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  // for each link: download, decompress, rename, delete .gz
  for (const link of gzLinks) {
    const rawName = path.basename(link.split('?')[0]);           // e.g. Price7290…400.gz
    const gzPath  = path.join(OUT_DIR, rawName);

    // determine decompressed filename
    const baseName = rawName.replace(/\.gz$/i, '');              // strip .gz
    // if it already ends in .xml or .json, keep it; otherwise append .xml
    const outName  = baseName.match(/\.(xml|json)$/i)
      ? baseName
      : baseName + '.xml';
    const outPath  = path.join(OUT_DIR, outName);

    console.log(`\n⬇️ Downloading ${rawName} …`);
    try {
      // download .gz
      const resp = await axios.get(link, { responseType: 'stream', timeout: 60000 });
      await new Promise((res, rej) => {
        const writer = fs.createWriteStream(gzPath);
        resp.data.pipe(writer);
        writer.on('finish', res);
        writer.on('error', rej);
      });
      console.log(`✔️ Saved gzip: ${gzPath}`);

      // decompress into outPath
      console.log(`🔓 Decompressing to ${outName} …`);
      await new Promise((res, rej) => {
        const src    = fs.createReadStream(gzPath);
        const gunzip = zlib.createGunzip();
        const dst    = fs.createWriteStream(outPath);
        src.pipe(gunzip).pipe(dst)
          .on('finish', res)
          .on('error', rej);
      });
      console.log(`✔️ Decompressed: ${outPath}`);

      // remove the original .gz
      fs.unlinkSync(gzPath);
      console.log(`🗑  Deleted gzip: ${gzPath}`);
    } catch (err) {
      console.error(`❌ Failed ${rawName}: ${err.message}`);
    }
  }

  await browser.close();
  console.log('\n🏁 All done!');
})();
