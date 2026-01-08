import axios from 'axios';

async function main() {
  const conditionId = '0xd595eb9b81885ff018738300c79047e3ec89e87294424f57a29a7fa9162bf116';
  
  try {
    const response = await axios.get(`https://gamma-api.polymarket.com/markets/${conditionId}`);
    console.log('Market data:');
    console.log(JSON.stringify(response.data, null, 2));
  } catch (error: any) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
  }
}

main();
