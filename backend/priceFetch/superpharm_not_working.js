// extract_superpharm_latest_puppeteer.js
// הורד אוטומטית את קבצי PriceFull הכי עדכניים עבור super-pharm באמצעות puppeteer

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

(async () => {
  // 1. השקה של דפדפן
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  // 2. צאוק לדף הראשי כדי לתפוס עוגיות וללכוד רשימת סניפים
  const baseUrl = 'https://prices.super-pharm.co.il/';
  await page.goto(baseUrl, { waitUntil: 'networkidle2' });

  // 3. אסוף רשימת סניפים (מתעלם מהערך הריק "הצג הכל")
  const branches = await page.$$eval(
    '#branch_selector option[value]:not([value=""])',
    opts => opts.map(o => ({ id: o.value, name: o.textContent.trim() }))
  );
  console.log(`Found ${branches.length} branches.`);

  // 4. צור תיקייה להורדה
  const outDir = path.join(__dirname, 'superpharm');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);

  for (const { id, name } of branches) {
    console.log(`\nBranch ${id} - ${name}`);
    // 5. עבור כל סניף, טען עמוד מסונן עם PriceFull
    const listUrl = `${baseUrl}?type=PriceFull&date=&page=1&store=${id}`;
    await page.goto(listUrl, { waitUntil: 'networkidle2' });

    // 6. בדוק אם יש שורות של PriceFull
    const rowExists = await page.$('table.flat-table tbody tr');
    if (!rowExists) {
      console.log('  No PriceFull entries, skipping');
      continue;
    }

    // 7. קבל את הקישור מהשורה הראשונה
    const linkPath = await page.$eval(
      'table.flat-table tbody tr:first-child a.price_item_link',
      el => el.getAttribute('href')
    );
    console.log(`  linkPath: ${linkPath}`);

    // 8. קריאה ל-JSON endpoint לקבלת href
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

    // 9. בניית ה-URL הסופי
    const downloadUrl = new URL(json.href, baseUrl).href;
    console.log(`  Full download URL: ${downloadUrl}`);

    // 10. הורד את ה-gz ושמור
    const filename = downloadUrl.split('/').pop().split('?')[0];
    const outPath = path.join(outDir, `${id}-${filename}`);
    console.log(`  ⬇️ Downloading to: ${outPath}`);
    const response = await page.goto(downloadUrl, { waitUntil: 'networkidle2' });
    const buffer = await response.buffer();
    fs.writeFileSync(outPath, buffer);
    console.log('  ✅ Saved');
  }

  // 11. סגור את הדפדפן
  await browser.close();
  console.log('\n🎉 Finished all branch downloads.');
})();

/* להרצה:
   npm install puppeteer
   node extract_superpharm_latest_puppeteer.js
*/
