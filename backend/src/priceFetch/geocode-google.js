require('dotenv').config();
const { Client } = require('@googlemaps/google-maps-services-js');
const client = new Client({});

async function geocodeGoogle({ address, city, zip }) {
  const formatted = [address, city, zip, 'Israel'].filter(Boolean).join(', ');
  const res = await client.geocode({
    params: {
      address: formatted,
      key: process.env.GOOGLE_API_KEY,
      language: 'he',
      region: 'il'
    },
    timeout: 5000
  });

  if (!res.data.results || res.data.results.length === 0) {
    throw new Error('No Google geocoding results');
  }
  const loc = res.data.results[0].geometry.location;
  return { lat: loc.lat, lng: loc.lng };
}

module.exports = geocodeGoogle;
