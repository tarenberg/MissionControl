require('dotenv').config();
const fetch = require('node-fetch');

const NEST_AUTH_URL = 'https://www.googleapis.com/oauth2/v4/token';

async function test() {
  const clients = [
    '792605632195-o40svkpskq6di831o5stdc4mg5ovnuck.apps.googleusercontent.com',
    '792605632195-umncl0uhuvb0pmcqhur4mteqosrhrllc.apps.googleusercontent.com'
  ];

  for (const client_id of clients) {
    console.log(`Testing client_id: ${client_id}`);
    const authResponse = await fetch(NEST_AUTH_URL, {
      method: 'POST',
      body: new URLSearchParams({
        client_id: client_id,
        client_secret: process.env.NEST_CLIENT_SECRET,
        refresh_token: process.env.NEST_REFRESH_TOKEN,
        grant_type: 'refresh_token',
      }),
    });

    const authData = await authResponse.json();
    console.log('Result:', authData);
  }
}

test();
