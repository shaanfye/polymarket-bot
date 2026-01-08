import axios from 'axios';

async function main() {
  const conditionId = '0xd595eb9b81885ff018738300c79047e3ec89e87294424f57a29a7fa9162bf116';
  
  try {
    const response = await axios.get('https://gamma-api.polymarket.com/events', {
      params: {
        active: true,
        limit: 200,
      }
    });
    
    console.log(`Found ${response.data.length} events`);
    
    for (const event of response.data) {
      if (event.markets && Array.isArray(event.markets)) {
        for (const market of event.markets) {
          if (market.conditionId === conditionId) {
            console.log('\n✅ FOUND THE MARKET!');
            console.log('Event:', event.title);
            console.log('Market:', JSON.stringify(market, null, 2));
            return;
          }
        }
      }
    }
    
    console.log('\n❌ Market not found in first 200 events');
  } catch (error: any) {
    console.error('Error:', error.message);
  }
}

main();
