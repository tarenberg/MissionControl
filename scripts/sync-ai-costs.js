
const { execSync } = require('child_process');

// Target API
const API_URL = 'http://localhost:8080/tools/ArtTrackerDashboard/api/costs.php';

function getReceipts() {
  const query = 'receipt OR invoice Anthropic OR Midjourney OR OpenAI OR Claude OR ChatGPT OR OpenRouter';
  console.log(`Searching Gmail for: ${query}`);
  
  const searchOutput = execSync(`gog gmail search "${query}" --limit 30`, { encoding: 'utf8' });
  const lines = searchOutput.split('\n');
  const ids = [];
  
  for (const line of lines) {
    const match = line.match(/^([a-f0-9]{16})\s/);
    if (match) {
      ids.push(match[1]);
    }
  }
  
  console.log(`Found ${ids.length} potential receipts.`);
  const results = [];
  
  for (const id of ids) {
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
      // Pattern 1: Receipt from ... $[amount]
      let amountMatch = detailOutput.match(/Receipt from [^\$]*\$([\d.]+)/i);
      if (!amountMatch) {
        // Pattern 2: Total $[amount]
        amountMatch = detailOutput.match(/Total\s+\$([\d.]+)/i);
      }
      if (!amountMatch) {
        // Pattern 3: $[amount] (General)
        amountMatch = detailOutput.match(/\$([\d.]+)/);
      }
      
      const amount = amountMatch ? parseFloat(amountMatch[1]) : 0;
      
      // Provider detection
      let provider = 'AI Usage';
      if (from.toLowerCase().includes('anthropic') || subject.toLowerCase().includes('anthropic')) provider = 'Anthropic';
      else if (from.toLowerCase().includes('midjourney') || subject.toLowerCase().includes('midjourney')) provider = 'Midjourney';
      else if (from.toLowerCase().includes('openai') || subject.toLowerCase().includes('openai')) provider = 'OpenAI';
      else if (from.toLowerCase().includes('openrouter') || subject.toLowerCase().includes('openrouter')) provider = 'OpenRouter';
      else if (from.toLowerCase().includes('krea') || subject.toLowerCase().includes('krea')) provider = 'Krea';
      
      // Date parsing (format YYYY-MM-DD)
      const d = new Date(emailDateRaw);
      const date = isNaN(d.getTime()) ? new Date().toISOString().split('T')[0] : d.toISOString().split('T')[0];
      
      if (amount > 0) {
        results.push({
          date,
          category: 'AI Usage',
          description: `${provider}: ${subject.replace(/Your receipt from /i, '').split('#')[0].trim()}`,
          amount,
          currency: 'USD'
        });
      }
    } catch (e) {
      console.error(`Error processing ${id}:`, e.message);
    }
  }
  
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
    const isDuplicate = existingCosts.some(c => 
      c.date === receipt.date && 
      c.amount === receipt.amount && 
      c.description === receipt.description
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
