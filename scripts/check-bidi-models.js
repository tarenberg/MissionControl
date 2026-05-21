const dotenv = require('dotenv');
const path = require('path');
const fetch = require('node-fetch');

dotenv.config({ path: path.join(__dirname, '../.env') });

async function listModels() {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) {
    console.error('API key missing');
    return;
  }

  for (const apiVersion of ['v1beta', 'v1alpha']) {
    console.log(`\n--- Models for ${apiVersion} ---`);
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/${apiVersion}/models?key=${apiKey}`);
      const data = await response.json();
      if (data.models) {
        data.models.forEach(m => {
          if (m.supportedGenerationMethods.includes('bidiGenerateContent')) {
            console.log(`[BIDI SUPPORTED] ${m.name} (${m.displayName})`);
          }
        });
      } else {
        console.log('No models found or error:', JSON.stringify(data));
      }
    } catch (err) {
      console.error(`Error fetching for ${apiVersion}:`, err.message);
    }
  }
}

listModels();
