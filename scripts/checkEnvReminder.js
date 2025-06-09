const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', 'backend', 'src', '.env');
if (!fs.existsSync(envPath)) {
  console.log('\x1b[33m⚠️  Missing backend/src/.env ! Cannot Continue! \x1b[0m');
  process.exit(1);
}
