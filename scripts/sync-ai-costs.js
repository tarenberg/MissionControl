
const { execSync } = require('child_process');

// Target API
const API_URL = 'http://localhost:8080/tools/ArtTrackerDashboard/api/costs.php';

function normalizeDescription(desc) {
  // Remove provider prefixes for duplicate detection
  return desc.replace(/^(Anthropic|OpenAI|OpenRouter|Midjourney|Krea|Art Expense|Art Supplies|Exhibition Entry|Art Purchase):\s*/i, '').trim();
}

function searchGmail(query, limit = 30) {
  console.log(`Searching Gmail: ${query}`);
  try {
    const searchOutput = execSync(`gog gmail search "${query}" --limit ${limit}`, { encoding: 'utf8' });
    const lines = searchOutput.split('\n');
    const ids = [];
    
    for (const line of lines) {
      const match = line.match(/^([a-f0-9]{16})\s/);
      if (match) {
        ids.push(match[1]);
      }
    }
    
    console.log(`Found ${ids.length} email(s)`);
    return ids;
  } catch (e) {
    console.error(`Gmail search failed: ${e.message}`);
    return [];
  }
}

function parseReceipt(id, defaultCategory = 'AI Usage') {
  try {
    console.log(`Fetching details for ${id}...`);
    const detailOutput = execSync(`gog gmail get ${id}`, { encoding: 'utf8' });
    
    // Parse basic info
    const fromMatch = detailOutput.match(/^from\t(.*)$/m);
    const subjectMatch = detailOutput.match(/^subject\t(.*)$/m);
    const dateMatch = detailOutput.match(/^date\t(.*)$/m);
    
    const from = fromMatch ? fromMatch[1] : '';
    const subject = subjectMatch ? subjectMatch[1] : '';
    const emailDateRaw = dateMatch ? dateMatch[1] : '';
    
    // Attempt to extract amount
    let amountMatch = detailOutput.match(/Receipt from [^\$]*\$([\d,]+\.?\d*)/i);
    if (!amountMatch) {
      amountMatch = detailOutput.match(/Total\s+\$([\d,]+\.?\d*)/i);
    }
    if (!amountMatch) {
      amountMatch = detailOutput.match(/\$([\d,]+\.?\d*)/);
    }
    
    const amount = amountMatch ? parseFloat(amountMatch[1].replace(/,/g, '')) : 0;
    
    // Provider/category detection
    let provider = defaultCategory;
    let category = defaultCategory;
    
    if (defaultCategory === 'AI Usage') {
      // AI provider detection
      if (from.toLowerCase().includes('anthropic') || subject.toLowerCase().includes('anthropic')) provider = 'Anthropic';
      else if (from.toLowerCase().includes('midjourney') || subject.toLowerCase().includes('midjourney')) provider = 'Midjourney';
      else if (from.toLowerCase().includes('openai') || subject.toLowerCase().includes('openai')) provider = 'OpenAI';
      else if (from.toLowerCase().includes('openrouter') || subject.toLowerCase().includes('openrouter')) provider = 'OpenRouter';
      else if (from.toLowerCase().includes('krea') || subject.toLowerCase().includes('krea')) provider = 'Krea';
    } else {
      // Art supplies/show fees detection
      const lowerFrom = from.toLowerCase();
      const lowerSubject = subject.toLowerCase();
      
      if (lowerFrom.includes('blick') || lowerSubject.includes('blick')) {
        provider = 'Blick Art Materials';
        category = 'Art Supplies';
      } else if (lowerFrom.includes('dickblick') || lowerSubject.includes('dickblick')) {
        provider = 'Dick Blick';
        category = 'Art Supplies';
      } else if (lowerSubject.includes('entry fee') || lowerSubject.includes('submission fee')) {
        provider = 'Exhibition Entry';
        category = 'Art Shows';
      } else if (lowerFrom.includes('paypal') || lowerFrom.includes('square')) {
        provider = 'Art Purchase';
        category = 'Art Business';
      } else {
        provider = 'Art Expense';
        category = 'Art Supplies';
      }
    }
    
    // Date parsing (format YYYY-MM-DD)
    const d = new Date(emailDateRaw);
    const date = isNaN(d.getTime()) ? new Date().toISOString().split('T')[0] : d.toISOString().split('T')[0];
    
    if (amount > 0) {
      return {
        date,
        category,
        description: `${provider}: ${subject.replace(/Your receipt from /i, '').split('#')[0].trim()}`,
        amount,
        currency: 'USD'
      };
    }
    
    return null;
  } catch (e) {
    console.error(`Error processing ${id}:`, e.message);
    return null;
  }
}

function getReceipts() {
  const results = [];
  
  // Only search: Art receipts label
  const artQuery = 'label:_ART/Reciepts';
  const artIds = searchGmail(artQuery, 100);
  
  for (const id of artIds) {
    const receipt = parseReceipt(id, 'Art Supplies');
    if (receipt) results.push(receipt);
  }
  
  console.log(`Parsed ${results.length} receipts from _ART/Reciepts label`);
  return results;
}

async function sync() {
  const receipts = getReceipts();
  console.log(`Parsed ${receipts.length} valid receipts.`);
  
  // Get existing costs to avoid duplicates
  console.log('Fetching existing costs to check for duplicates...');
  const existingRes = await fetch(API_URL);
  const existingCosts = await existingRes.json();
  
  let added = 0;
  for (const receipt of receipts) {
    // Duplicate check: date + normalized description + amount
    const normalizedNew = normalizeDescription(receipt.description);
    const isDuplicate = existingCosts.some(c => 
      c.date === receipt.date && 
      Math.abs(c.amount - receipt.amount) < 0.01 && 
      normalizeDescription(c.description) === normalizedNew
    );
    
    if (!isDuplicate) {
      console.log(`Adding: ${receipt.date} | ${receipt.amount} | ${receipt.description}`);
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(receipt)
      });
      if (res.ok) added++;
      else console.error(`Failed to add: ${await res.text()}`);
    } else {
      console.log(`Skipping duplicate: ${receipt.date} | ${receipt.description}`);
    }
  }
  
  console.log(`Sync complete. Added ${added} new entries.`);
}

sync();
