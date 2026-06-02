const fs = require('fs');
const path = require('path');
const https = require('https');

// Load API Key from .env manually to avoid dependencies
const envPath = path.join(__dirname, '..', '.env');
const env = fs.readFileSync(envPath, 'utf8');
const apiKeyMatch = env.match(/NEXT_PUBLIC_GEMINI_API_KEY=(.*)/);
const API_KEY = apiKeyMatch ? apiKeyMatch[1].trim() : null;

if (!API_KEY) {
  console.error("Gemini API Key not found in .env");
  process.exit(1);
}

const API_BASE = 'http://localhost:8080/tools/ArtTrackerDashboard/api';

async function updateDatabase(analysis, url) {
  try {
    const res = await fetch(`${API_BASE}/deadlines.php`);
    const deadlines = await res.json();
    
    const targetUrl = url.replace(/\/$/, '').toLowerCase();
    const deadline = deadlines.find(d => d.link && d.link.replace(/\/$/, '').toLowerCase() === targetUrl);
    
    if (deadline) {
      console.log(`Found matching deadline ID ${deadline.id} for ${url}`);
      console.log(`Current DB Location: "${deadline.location}"`);
      console.log(`AI Extracted Location: "${analysis.location}"`);
      
      const updateData = { ...deadline };
      let changed = false;

      if (analysis.location && analysis.location !== 'TBD' && analysis.location !== 'Not specified') {
        const currentLoc = (deadline.location || '').trim();
        const aiLoc = analysis.location.trim();
        
        if (!currentLoc || currentLoc === 'TBD' || (aiLoc.length > currentLoc.length && aiLoc.toLowerCase().includes(currentLoc.toLowerCase()))) {
          console.log(`Updating location to: ${aiLoc}`);
          updateData.location = aiLoc;
          changed = true;
        }
      }
      
      console.log(`Current DB Fee: "${deadline.fee}"`);
      console.log(`AI Extracted Fees: "${analysis.fees}"`);
      
      if (analysis.fees && analysis.fees !== 'TBD' && analysis.fees !== 'Not specified') {
        const currentFee = (deadline.fee || '').trim();
        const aiFee = analysis.fees.trim();
        if (!currentFee || currentFee === 'TBD' || currentFee === 'Not specified' || (aiFee.length > currentFee.length && !currentFee.includes('$'))) {
          console.log(`Updating fee to: ${aiFee}`);
          updateData.fee = aiFee;
          changed = true;
        }
      }
      if (analysis.importantDates.receipt_date && !deadline.receipt_date) {
        updateData.receipt_date = analysis.importantDates.receipt_date;
        changed = true;
      }
      if (analysis.importantDates.ship_date && !deadline.ship_date) {
        updateData.ship_date = analysis.importantDates.ship_date;
        changed = true;
      }
      // If it's local only, we don't need a ship date
      if (analysis.isLocalOnly && !analysis.importantDates.ship_date) {
        if (updateData.ship_date) {
          updateData.ship_date = null;
          changed = true;
        }
      }
      if (analysis.importantDates.return_date && !deadline.return_date) {
        updateData.return_date = analysis.importantDates.return_date;
        changed = true;
      }
      if (analysis.importantDates.show_start && !deadline.show_start) {
        updateData.show_start = analysis.importantDates.show_start;
        changed = true;
      }
      if (analysis.importantDates.show_end && !deadline.show_end) {
        updateData.show_end = analysis.importantDates.show_end;
        changed = true;
      }

      if (changed) {
        console.log(`Updating deadline ${deadline.id} with AI data...`);
        const putRes = await fetch(`${API_BASE}/deadlines.php`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updateData)
        });
        const result = await putRes.json();
        console.log(`Database update result: ${result.message}`);
      } else {
        console.log(`No new data to update for deadline ${deadline.id}`);
      }
    }

    // --- NEW: Update upcoming_shows too ---
    const showRes = await fetch(`${API_BASE}/shows.php`);
    const shows = await showRes.json();
    const show = shows.find(s => s.link && s.link.replace(/\/$/, '').toLowerCase() === targetUrl);

    if (show) {
      console.log(`Found matching show ID ${show.id} for ${url}`);
      const updateShow = { ...show };
      let showChanged = false;

      if (analysis.location && analysis.location !== 'TBD' && analysis.location !== 'Not specified') {
        const currentLoc = (show.location || '').trim();
        const aiLoc = analysis.location.trim();
        if (!currentLoc || currentLoc === 'TBD' || (aiLoc.length > currentLoc.length && aiLoc.toLowerCase().includes(currentLoc.toLowerCase()))) {
          updateShow.location = aiLoc;
          showChanged = true;
        }
      }

      if (analysis.fees && analysis.fees !== 'TBD' && analysis.fees !== 'Not specified') {
        const currentFee = (show.fee || '').trim();
        const aiFee = analysis.fees.trim();
        if (!currentFee || currentFee === 'TBD' || currentFee === 'Not specified' || (aiFee.length > currentFee.length && !currentFee.includes('$'))) {
          updateShow.fee = aiFee;
          showChanged = true;
        }
      }

      if (analysis.importantDates) {
        const dates = analysis.importantDates;
        if (dates.deadline && (!show.due_date || show.due_date === '2026-12-31')) {
          updateShow.due_date = dates.deadline;
          showChanged = true;
        }
      }

      if (showChanged) {
        console.log(`Updating show ${show.id} with AI data...`);
        await fetch(`${API_BASE}/shows.php`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updateShow)
        });
      }
    }
  } catch (e) {
    console.error(`Database update failed: ${e.message}`);
  }
}

async function askGemini(prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${API_KEY}`;
  
  const payload = JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      response_mime_type: "application/json",
    }
  });

  return new Promise((resolve, reject) => {
    const req = https.request(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const body = JSON.parse(data);
          if (body.error) {
            reject(new Error(body.error.message));
            return;
          }
          const textResponse = body.candidates[0].content.parts[0].text;
          resolve(textResponse);
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', (e) => reject(e));
    req.write(payload);
    req.end();
  });
}

async function fetchJina(url) {
  const jinaUrl = `https://r.jina.ai/${url}`;
  const response = await fetch(jinaUrl, {
    headers: { 'Accept': 'application/json', 'X-No-Cache': 'true' }
  });
  const text = await response.text();
  
  if (text.includes('Cloudflare') || text.includes('Just a moment...') || text.includes('captcha-bypass') || text.includes('Attention Required!')) {
    throw new Error("Cloudflare block detected. The website is blocking automated scraper. Please copy-paste the prospectus text manually.");
  }

  try {
    const json = JSON.parse(text);
    return json.data?.content || text;
  } catch (e) {
    return text;
  }
}

async function analyzeProspectus(url, requestId, pastedTextFile = null) {
  console.log(`Analyzing prospectus with Gemini: ${url}`);
  
  try {
    let text = "";
    if (pastedTextFile) {
      const p = path.join(__dirname, '..', pastedTextFile);
      if (fs.existsSync(p)) {
        text = fs.readFileSync(p, 'utf8');
        console.log(`Read pasted text from ${p} (${text.length} characters)`);
      } else {
        throw new Error(`Pasted text file not found at ${p}`);
      }
    }

    if (!text) {
      text = await fetchJina(url);
      
      // Look for deeper links
      const linkMatches = text.match(/\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g);
      if (linkMatches) {
        for (const match of linkMatches) {
          const linkMatch = match.match(/\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/);
          if (!linkMatch) continue;
          const [_, label, link] = linkMatch;
          const lowerLabel = label?.toLowerCase() || '';
          const isDeeper = ['prospectus', 'full details', 'guidelines', 'call for entry'].some(k => lowerLabel.includes(k)) || 
                           link.includes('callforentry.org') || 
                           link.includes('entrythingy.com');
                           
          if (isDeeper) {
            console.log(`Following deeper link: ${link}`);
            const deeperText = await fetchJina(link);
            text = deeperText + "\n\n" + text;
            break;
          }
        }
      }
    }
    
    const prompt = `Extract art exhibition details from the text below. 
Return ONLY a valid JSON object with exactly these keys:
{
  "fees": "string (Total entry fee amount, e.g., '$35' or '$35 for 1, $10 for additional')",
  "maxSize": "string (size constraints)",
  "mediums": "string (allowed mediums)",
  "framing": "string (framing/hanging requirements)",
  "location": "string (Specific Venue Name and Full Address)",
  "entryFormUrl": "string or null",
  "isLocalOnly": "boolean (True if the exhibition explicitly only allows hand-delivery/drop-off, False if it allows shipping)",
  "importantDates": {
    "receipt_date": "YYYY-MM-DD or null (Hand-delivery/Drop-off date - use the LATEST date if a range is given)",
    "ship_date": "YYYY-MM-DD or null (Shipping arrival deadline - only if different from hand-delivery/receipt date)",
    "return_date": "YYYY-MM-DD or null (Pickup or return shipping date)",
    "show_start": "YYYY-MM-DD or null",
    "show_end": "YYYY-MM-DD or null",
    "deadline": "YYYY-MM-DD or null (Application deadline)"
  }
}

Be thorough. Look for dollar signs ($) and phrases like "Entry Fee", "Cost", "Price to enter".
For dates: Look for "Receiving", "Drop off", "Delivery", "Hand delivery" for receipt_date.
Look for "Return of work", "Pick up", "Collection" for return_date.
Look for "Shipping arrival", "Work must arrive by" for ship_date.
If you find a year (like 2026), ensure the YYYY-MM-DD format uses it.
If the text describes a local show where you drop off and pick up in person (like a local Art League), set isLocalOnly to true.
If isLocalOnly is true, leave ship_date as null unless a specific separate arrival date is given.
If you find a range for dates, use the end of the range.

Text:
${text.substring(0, 30000)}

JSON:`;

    const geminiResponse = await askGemini(prompt);
    console.log(`Gemini raw response: ${geminiResponse}`);
    const analysis = JSON.parse(geminiResponse);
    analysis.status = 'complete';

    const resultPath = path.join(__dirname, '..', 'data', `prospectus-analysis-${requestId}.json`);
    fs.writeFileSync(resultPath, JSON.stringify(analysis, null, 2));
    console.log(`Analysis saved to ${resultPath}`);

    await updateDatabase(analysis, url);
  } catch (err) {
    console.error(`Analysis failed: ${err.message}`);
    const resultPath = path.join(__dirname, '..', 'data', `prospectus-analysis-${requestId}.json`);
    fs.writeFileSync(resultPath, JSON.stringify({ error: err.message, status: 'failed' }, null, 2));
  }
}

// Check for new requests
const requestPath = path.join(__dirname, '..', 'data', 'prospectus-requests.json');
console.log(`Checking for requests at: ${requestPath}`);
if (require.main === module && fs.existsSync(requestPath)) {
  (async () => {
    let requests = JSON.parse(fs.readFileSync(requestPath, 'utf8'));
    const pending = requests.filter(r => r.status === 'pending');
    console.log(`Found ${pending.length} pending requests.`);
    
    if (pending.length > 0) {
      for (const pendingReq of pending) {
        try {
          console.log(`Processing request ${pendingReq.id} for ${pendingReq.url}`);
          
          // Re-read from disk to prevent race conditions
          requests = JSON.parse(fs.readFileSync(requestPath, 'utf8'));
          let req = requests.find(r => r.id === pendingReq.id);
          if (!req) continue;
          
          req.status = 'processing';
          fs.writeFileSync(requestPath, JSON.stringify(requests, null, 2));
          await analyzeProspectus(req.url, req.id, req.pastedTextFile);
          
          const resultPath = path.join(__dirname, '..', 'data', `prospectus-analysis-${req.id}.json`);
          requests = JSON.parse(fs.readFileSync(requestPath, 'utf8'));
          req = requests.find(r => r.id === pendingReq.id);
          if (!req) continue;
          
          if (fs.existsSync(resultPath)) {
            const analysisData = JSON.parse(fs.readFileSync(resultPath, 'utf8'));
            if (analysisData.error) {
              req.status = 'failed';
            } else {
              req.status = 'complete';
            }
          } else {
            req.status = 'pending';
          }
          fs.writeFileSync(requestPath, JSON.stringify(requests, null, 2));
        } catch (err) {
          console.error(`Worker failed on request ${pendingReq.id}:`, err.message);
        }
      }
    }
  })();
}
