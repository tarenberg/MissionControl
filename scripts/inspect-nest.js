const { NestClient } = require('../lib/nest');
require('dotenv').config();

const nest = new NestClient({
  clientId: process.env.NEST_CLIENT_ID,
  clientSecret: process.env.NEST_CLIENT_SECRET,
  projectId: process.env.NEST_PROJECT_ID,
  refreshToken: process.env.NEST_REFRESH_TOKEN,
});

async function run() {
  try {
    const devices = await nest.listDevices();
    console.log(JSON.stringify(devices, null, 2));
  } catch (e) {
    console.error(e);
  }
}

run();
