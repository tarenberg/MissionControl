
const { GoogleGenAI } = require('@google/genai');
require('dotenv').config();

const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;

async function test() {
  console.log('Testing API key:', apiKey ? apiKey.substring(0, 5) + '...' : 'MISSING');
  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: 'Hello, are you there?',
    });
    console.log('Response:', response.text);
    console.log('API KEY IS VALID');
  } catch (err) {
    console.error('API KEY TEST FAILED:', err.message);
  }
}

test();
