const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '..', 'mobile-app', 'src', 'config.js');

if (!fs.existsSync(configPath)) {
  console.log('\x1b[31m❌ Missing mobile-app/src/config.js! Cannot continue!\x1b[0m');
  process.exit(1);
}

const content = fs.readFileSync(configPath, 'utf8');
const match = content.match(/export const API_BASE = ['"`](.+?)['"`]/);

if (match) {
  console.log(`\x1b[36m🌐 API_BASE is currently set to: ${match[1]}\x1b[0m`);
  if (!match[1].includes('localhost') && !match[1].includes('10.0.2.2')) {
    console.log('\x1b[33m⚠️  Remember to verify this IP is correct for your current network.\x1b[0m');
  }
} else {
  console.log('\x1b[33m⚠️  Could not find API_BASE assignment in config.js\x1b[0m');
}
