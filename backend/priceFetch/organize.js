const fs = require('fs');
const path = require('path');
const axios = require('axios');

// map בין קוד רשת לשם רשת
const chainNames = {
  '7290027600007': 'שופרסל',
  '7290058140886': 'רמי לוי',
  '7290055700007': 'מגה',
  '7290725900003': 'יינות ביתן',
  '7290696200003': 'ויקטורי',
  '7290700100008': 'חצי חינם',
  '7291029710008': 'קוויק'
};

function extractChainAndStore(filename) {
  const match = filename.match(/(Price|Promo)(\d{13})-(\d+)-/);
  if (!match) return { chain: 'unknown', store: 'unknown' };

  const chainCode = match[2];
  const storeCode = match[3];

  const chainName = chainNames[chainCode] || chainCode;
  return { chain: chainName, store: storeCode };
}

async function organizeFile(filePath) {
  const fileName = path.basename(filePath);
  const { chain, store } = extractChainAndStore(fileName);

  const targetDir = path.join(__dirname, 'downloads', chain, store);
  if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

  const targetPath = path.join(targetDir, fileName);
  fs.renameSync(filePath, targetPath);
  console.log(`📦 Moved ${fileName} → ${chain}/${store}/`);
}

// דוגמה להרצה ידנית על כל הקבצים בתיקיית downloads/
function organizeAllDownloads() {
  const dir = path.join(__dirname, 'downloads');
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.gz'));

  files.forEach(file => {
    const fullPath = path.join(dir, file);
    organizeFile(fullPath);
  });
}

organizeAllDownloads();
