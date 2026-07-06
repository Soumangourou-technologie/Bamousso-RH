import axios from 'axios';

const apiKey = process.env.GENIUSPAY_API_KEY || "";
const apiSecret = process.env.GENIUSPAY_API_SECRET || "";

async function testAuth() {
  console.log("Testing GeniusPay Auth with standard headers...");
  try {
    const response = await axios.post('https://pay.genius.ci/api/v1/merchant/payments', {
      amount: 1000,
      currency: 'XOF',
      description: 'Test Auth',
      success_url: 'http://localhost:3000/success',
      error_url: 'http://localhost:3000/error'
    }, {
      headers: {
        'X-API-Key': apiKey,
        'X-API-Secret': apiSecret,
        'Content-Type': 'application/json'
      }
    });
    console.log("SUCCESS with X-API-Key / X-API-Secret!");
    console.log(response.data);
  } catch (error: any) {
    console.log("FAILED with X-API-Key / X-API-Secret:", error.response?.data || error.message);
    
    console.log("\nTesting with Authorization Bearer...");
    try {
        const response = await axios.post('https://pay.genius.ci/api/v1/merchant/payments', {
          amount: 1000,
          currency: 'XOF',
          description: 'Test Auth',
          success_url: 'http://localhost:3000/success',
          error_url: 'http://localhost:3000/error'
        }, {
          headers: {
            'X-API-Key': apiKey,
            'Authorization': `Bearer ${apiSecret}`,
            'Content-Type': 'application/json'
          }
        });
        console.log("SUCCESS with Authorization Bearer!");
        console.log(response.data);
    } catch (error2: any) {
        console.log("FAILED with Authorization Bearer:", error2.response?.data || error2.message);
    }
  }
}

testAuth();
