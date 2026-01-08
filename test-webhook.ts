import axios from 'axios';

async function main() {
  const webhookUrl = 'https://sfye1.app.n8n.cloud/webhook/af5a6d10-ef39-4fab-8a1e-8d75b4f51590';
  
  const testPayload = {
    timestamp: new Date().toISOString(),
    alertType: 'MARKET_UPDATE',
    severity: 'low',
    title: 'Test alert from Polymarket bot',
    data: {
      market: {
        slug: 'will-trump-acquire-greenland-before-2027',
        title: 'Will Trump acquire Greenland before 2027?',
        conditionId: '0xd595eb9b81885ff018738300c79047e3ec89e87294424f57a29a7fa9162bf116'
      },
      probability: 0.14,
      outcomePrices: [0.14, 0.86],
      volume24hr: 1283006
    }
  };
  
  console.log('🔄 Sending test POST request to n8n webhook...\n');
  
  try {
    const response = await axios.post(webhookUrl, testPayload, {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 10000
    });
    
    console.log('✅ SUCCESS! Webhook is working!');
    console.log('Status:', response.status);
    console.log('Response:', response.data);
  } catch (error: any) {
    console.log('❌ FAILED');
    console.log('Message:', error.message);
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Data:', error.response.data);
    }
  }
}

main();
