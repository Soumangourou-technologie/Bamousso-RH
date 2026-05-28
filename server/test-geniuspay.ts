import axios from 'axios';

const apiKey = 'pk_sandbox_9U6UucLrncT03TkRupPla0NNR2PgXaq6';
const apiSecret = 'sk_sandbox_9bd9aed97ce1dbbb3cd0e976bd7a92fd5ed707a07de4cd2bd886fe8dbaa76fde';

async function main() {
  const urls = [
    'https://api.genius.ci/v1/merchant/payments/6603',
    'https://api.genius.ci/api/v1/merchant/payments/6603',
    'https://pay.genius.ci/api/v1/transactions/6603'
  ];

  for (const url of urls) {
    try {
      const res = await axios.get(url, { headers: { 'X-API-Key': apiKey, 'X-API-Secret': apiSecret, 'Accept': 'application/json' }});
      console.log(`✅ Success ${url}:`, res.status);
    } catch (e: any) {
      console.log(`❌ Failed ${url}:`, e.response?.status || e.message);
    }
  }
}
main();
