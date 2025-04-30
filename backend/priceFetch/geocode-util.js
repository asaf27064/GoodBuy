const fetch = require('node-fetch');

/**
 * @param {Object} params
 * @param {string} params.address
 * @param {string} params.city
 * @param {string} params.zip
 * @returns {Promise<{lat: number, lng: number}>}
 */
async function geocodeAddress({ address, city, zip }) {
  const query = [address, city, zip].filter(Boolean).join(', ');
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`;

  const res = await fetch(url, {
    headers: { 'User-Agent': 'GoodBuy/1.0 (your-email@example.com)' }
  });
  if (!res.ok) {
    throw new Error(`Geocoding request failed: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error('No geocoding results found');
  }

  const { lat, lon } = data[0];
  return { lat: parseFloat(lat), lng: parseFloat(lon) };
}

module.exports = geocodeAddress;
