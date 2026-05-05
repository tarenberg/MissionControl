require('dotenv').config();
const fetch = require('node-fetch');

const NEST_AUTH_URL = 'https://www.googleapis.com/oauth2/v4/token';
const SDM_API_URL = 'https://smartdevicemanagement.googleapis.com/v1';

async function test() {
  const credentials = {
    clientId: process.env.NEST_CLIENT_ID,
    clientSecret: process.env.NEST_CLIENT_SECRET,
    projectId: process.env.NEST_PROJECT_ID,
    refreshToken: process.env.NEST_REFRESH_TOKEN
  };

  const authResponse = await fetch(NEST_AUTH_URL, {
    method: 'POST',
    body: new URLSearchParams({
      client_id: credentials.clientId,
      client_secret: credentials.clientSecret,
      refresh_token: credentials.refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  const authData = await authResponse.json();
  if (!authResponse.ok) {
    console.error('Auth Error:', authData);
    return;
  }
  const { access_token } = authData;

  const devicesResponse = await fetch(`${SDM_API_URL}/enterprises/${credentials.projectId}/devices`, {
    headers: { Authorization: `Bearer ${access_token}` },
  });

  const data = await devicesResponse.json();
  console.log(JSON.stringify(data, null, 2));
}

test();
