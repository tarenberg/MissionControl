const fs = require('fs');
const path = require('path');
const http = require('http');

async function askOllama(prompt) {
  const payload = JSON.stringify({
    model: "gemma2:latest",
    prompt: prompt,
    stream: false,
    format: "json"
  });

  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 11434,
      path: '/api/generate',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const body = JSON.parse(data);
          const response = body.response;
          console.log(`Gemma Raw Response: ${response}`);
          resolve(response);
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

const API_BASE = 'http://localhost:8080/tools/ArtTrackerDashboard/api';

async function updateDatabase(analysis, url) {
  try {
    // 1. Fetch all deadlines to find the ID
    const res = await fetch(`${API_BASE}/deadlines.php`);
    const deadlines = await res.json();
    
    // Normalize URL for comparison
    const targetUrl = url.replace(/\/$/, '').toLowerCase();
    const deadline = deadlines.find(d => d.link && d.link.replace(/\/$/, '').toLowerCase() === targetUrl);
    
    if (deadline) {
      console.log(`Found matching deadline ID ${deadline.id} for ${url}`);
      
      // 2. Prepare update data - only update if AI found something non-TBD/null
      const updateData = { ...deadline };
      let changed = false;

      if (analysis.location && analysis.location !== 'TBD' && (!deadline.location || deadline.location === 'TBD' || deadline.location === '')) {
        updateData.location = analysis.location;
        changed = true;
      }
      if (analysis.fees && analysis.fees !== 'TBD' && (!deadline.fee || deadline.fee === 'TBD' || deadline.fee === '')) {
        updateData.fee = analysis.fees;
        changed = true;
      }
      if (analysis.importantDates.receipt_date && !deadline.receipt_date) {
        updateData.receipt_date = analysis.importantDates.receipt_date;
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
    } else {
      console.log(`No matching deadline found in database for ${url}`);
    }
  } catch (e) {
    console.error(`Database update failed: ${e.message}`);
  }
}

async function analyzeProspectus(url, requestId) {
  console.log(`Analyzing prospectus: ${url}`);
  
  // 1. Get raw content via Jina
  const jinaUrl = `https://r.jina.ai/${url}`;
  try {
    const response = await fetch(jinaUrl, {
      headers: {
        'Accept': 'application/json',
        'X-No-Cache': 'true'
      }
    });
    let text = await response.text();
    
    // 2. Look for "Prospectus" or "Entry" links if this isn't the main page
    const linkMatches = text.match(/\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g);
    let deeperUrl = null;
    
    if (linkMatches) {
      for (const match of linkMatches) {
        const linkMatch = match.match(/\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/);
        if (!linkMatch) continue;
        const [_, label, link] = linkMatch;
        const lowerLabel = label?.toLowerCase() || '';
        if (lowerLabel.includes('prospectus') || 
            lowerLabel.includes('full details') || 
            lowerLabel.includes('guidelines') || 
            lowerLabel.includes('call for entry') ||
            lowerLabel.includes('entry form') ||
            lowerLabel.startsWith('http')) {
          deeperUrl = link;
          break; 
        }
      }
    }

    if (deeperUrl && deeperUrl !== url) {
      console.log(`Following deeper link: ${deeperUrl}`);
      try {
        const deeperRes = await fetch(`https://r.jina.ai/${deeperUrl}`);
        const deeperText = await deeperRes.text();
        text = deeperText + "\n\n" + text;
      } catch (e) {
        console.log(`Failed to fetch deeper link: ${e.message}`);
      }
    }
    
    // 3. Use Gemma for structured extraction
    const prompt = `Return ONLY a valid JSON object with the keys below. No prose, no markdown, no conversational text.
    
{
  "fees": "string",
  "maxSize": "string",
  "mediums": "string",
  "framing": "string",
  "location": "string",
  "entryFormUrl": "string or null",
  "importantDates": {
    "receipt_date": "YYYY-MM-DD or null",
    "show_start": "YYYY-MM-DD or null",
    "show_end": "YYYY-MM-DD or null",
    "deadline": "YYYY-MM-DD or null"
  }
}

Use "TBD" for missing strings.

Text to analyze:
${text.substring(0, 15000)}

JSON:
`;

    console.log("Asking Gemma for extraction...");
    const gemmaResponse = await askOllama(prompt);
    
    let analysis = {
      fees: null,
      maxSize: null,
      mediums: "Visual Arts",
      framing: "Standard",
      location: "TBD",
      entryFormUrl: url.includes('entrythingy') || url.includes('callforentry') ? url : null,
      importantDates: {
        receipt_date: null,
        show_start: null,
        show_end: null,
        deadline: null
      },
      status: 'complete'
    };

    try {
      // Find JSON block in response
      const jsonMatch = gemmaResponse.match(/\{[\s\S]*\}/);
      const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : gemmaResponse);
      
      // Merge parsed data into our default structure
      analysis = {
        ...analysis,
        ...parsed,
        importantDates: {
          ...analysis.importantDates,
          ...(parsed.importantDates || {})
        }
      };
    } catch (e) {
      console.error("Gemma returned invalid JSON, using regex fallback.");
      analysis.fees = extractPattern(text, /\$[\d\.]+(?:\s*per\s*\w+)?/);
      analysis.maxSize = extractPattern(text, /[\d\.]+"?\s*x\s*[\d\.]+"?/);
      
      // Better location regex
      const locPatterns = [
        /(?:at|in|location:)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,5},?\s*[A-Z]{2}(?:\s+\d{5})?)/,
        /Venue:\s*([^\n]+)/i,
        /Address:\s*([^\n]+)/i
      ];

      for (const pattern of locPatterns) {
        const match = text.match(pattern);
        if (match && match[1]) {
          analysis.location = match[1].trim();
          break;
        }
      }
    }

    const resultPath = path.join(__dirname, '..', 'data', `prospectus-analysis-${requestId}.json`);
    fs.writeFileSync(resultPath, JSON.stringify(analysis, null, 2));
    console.log(`Analysis saved to ${resultPath}`);

    // 4. Update the main database
    await updateDatabase(analysis, url);
  } catch (err) {
    console.error(`Analysis failed: ${err.message}`);
  }
}

function extractPattern(text, regex) {
  const match = text.match(regex);
  return match ? match[0] : null;
}

// Check for new requests
const requestPath = path.join(__dirname, '..', 'data', 'prospectus-requests.json');
if (require.main === module && fs.existsSync(requestPath)) {
  (async () => {
    const requests = JSON.parse(fs.readFileSync(requestPath, 'utf8'));
    const pending = requests.filter(r => r.status === 'pending');
    
    if (pending.length > 0) {
      for (const req of pending) {
        try {
          console.log(`Processing request ${req.id} for ${req.url}`);
          req.status = 'processing';
          fs.writeFileSync(requestPath, JSON.stringify(requests, null, 2));
          await analyzeProspectus(req.url, req.id);
          
          const resultPath = path.join(__dirname, '..', 'data', `prospectus-analysis-${req.id}.json`);
          const requestsNow = JSON.parse(fs.readFileSync(requestPath, 'utf8'));
          const reqNow = requestsNow.find(r => r.id === req.id);
          
          if (fs.existsSync(resultPath)) {
             reqNow.status = 'complete';
          } else {
             reqNow.status = 'pending';
          }
          fs.writeFileSync(requestPath, JSON.stringify(requestsNow, null, 2));
        } catch (err) {
          console.error(`Worker failed on request ${req.id}:`, err.message);
          const requestsNow = JSON.parse(fs.readFileSync(requestPath, 'utf8'));
          const reqNow = requestsNow.find(r => r.id === req.id);
          reqNow.status = 'pending';
          fs.writeFileSync(requestPath, JSON.stringify(requestsNow, null, 2));
        }
      }
    }
  })();
}
