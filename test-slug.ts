import axios from 'axios';

async function main() {
  const name = "Will Trump acquire Greenland before 2027?";
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  
  console.log('Generated slug:', slug);
  
  const response = await axios.get('https://gamma-api.polymarket.com/events', {
    params: { slug }
  });
  
  if (response.data && response.data.length > 0) {
    const event = response.data[0];
    console.log('\n✅ Found event:', event.title);
    console.log('Markets:', event.markets.length);
    
    if (event.markets && event.markets.length > 0) {
      console.log('First market:', event.markets[0].question);
      console.log('Condition ID:', event.markets[0].conditionId);
      console.log('Outcome prices:', event.markets[0].outcomePrices);
    }
  }
}

main();
