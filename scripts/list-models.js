const { GoogleGenAI } = require("@google/genai");
const dotenv = require("dotenv");
dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY });

async function run() {
  try {
    const response = await ai.models.list();
    const flash20 = response.pageInternal.filter(m => m.name.includes('2.0-flash'));
    console.log("Flash 2.0 Models:", JSON.stringify(flash20, null, 2));
  } catch (err) {
    console.error("Error:", err.message);
  }
}

run();
