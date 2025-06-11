const crypto = require('crypto');

/**
 * יוצר fingerprint יציב לכל store
 * מבוסס על chainId (string מתוך ה־Chain), subChainId, storeId, address, city, zipCode
 */
function makeFingerprint(store) {
  const chainId    = store.chainRef?.chainId || '';
  const subChainId = store.subChainId    || '';
  const storeId    = store.storeId       || '';
  const address    = store.address       || '';
  const city       = store.city          || '';
  const zipCode    = store.zipCode       || '';

  const data = [chainId, subChainId, storeId, address, city, zipCode].join('|');
  return crypto.createHash('md5').update(data).digest('hex');
}

module.exports = makeFingerprint;
