const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  const baseUrl = 'https://prices.super-pharm.co.il/';
  await page.goto(baseUrl, { waitUntil: 'networkidle2' });

  const branches = await page.$$eval(
    '#branch_selector option[value]:not([value=""])',
    opts => opts.map(o => ({ id: o.value, name: o.textContent.trim() }))
  );
  console.log(`Found ${branches.length} branches.`);

  const outDir = path.join(__dirname, 'superpharm');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);

  for (const { id, name } of branches) {
    console.log(`\nBranch ${id} - ${name}`);
    const listUrl = `${baseUrl}?type=PriceFull&date=&page=1&store=${id}`;
    await page.goto(listUrl, { waitUntil: 'networkidle2' });

    const rowExists = await page.$('table.flat-table tbody tr');
    if (!rowExists) {
      console.log('  No PriceFull entries, skipping');
      continue;
    }

    const linkPath = await page.$eval(
      'table.flat-table tbody tr:first-child a.price_item_link',
      el => el.getAttribute('href')
    );
    console.log(`  linkPath: ${linkPath}`);

    const jsonUrl = new URL(linkPath, baseUrl).href;
    console.log(`  JSON endpoint: ${jsonUrl}`);
    const json = await page.evaluate(async url => {
      const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
      return res.json();
    }, jsonUrl);
    if (json.status !== 0 || !json.href) {
      console.warn('  ❌ Bad JSON status or missing href, skipping');
      continue;
    }
    console.log(`  JSON.href: ${json.href}`);

    const downloadUrl = new URL(json.href, baseUrl).href;
    console.log(`  Full download URL: ${downloadUrl}`);

    const filename = downloadUrl.split('/').pop().split('?')[0];
    const outPath = path.join(outDir, `${id}-${filename}`);
    console.log(`  ⬇️ Downloading to: ${outPath}`);
    const response = await page.goto(downloadUrl, { waitUntil: 'networkidle2' });
    const buffer = await response.buffer();
    fs.writeFileSync(outPath, buffer);
    console.log('  ✅ Saved');
  }

  await browser.close();
  console.log('\n🎉 Finished all branch downloads.');
})();