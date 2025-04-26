// geocode-util.js
// A simple wrapper around OpenStreetMap Nominatim for geocoding
// Install dependencies with: npm install node-fetch@2

const fetch = require('node-fetch'); // v2; for v3 use require('node-fetch').default

/**
 * Geocode an address using Nominatim (OpenStreetMap).
 * @param {Object} params
 * @param {string} params.address - Street address
 * @param {string} params.city    - City name
 * @param {string} params.zip     - ZIP or postal code
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
