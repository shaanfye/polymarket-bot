import axios from 'axios';

async function main() {
  try {
    const response = await axios.get('https://gamma-api.polymarket.com/events', {
      params: { slug: 'will-trump-acquire-greenland-before-2027' }
    });
    console.log('Event data:');
    console.log(JSON.stringify(response.data, null, 2));
  } catch (error: any) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
    }
  }
}

main();
