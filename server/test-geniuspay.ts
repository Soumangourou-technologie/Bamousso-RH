import axios from 'axios';

const apiKey = process.env.GENIUSPAY_API_KEY || '';
const apiSecret = process.env.GENIUSPAY_API_SECRET || '';

async function main() {
  const urls = [
    'https://api.genius.ci/v1/merchant/payments/6603',
    'https://api.genius.ci/api/v1/merchant/payments/6603',
    'https://pay.genius.ci/api/v1/transactions/6603'
  ];

  for (const url of urls) {
    try {
      const res = await axios.get(url, { headers: { 'X-API-Key': apiKey, 'X-API-Secret': apiSecret, 'Accept': 'application/json' }});
      console.log('✅ Success %s:', url, res.status);
    } catch (e: any) {
      console.log('❌ Failed %s:', url, e.response?.status || e.message);
    }
  }
}
main();
