async function main() {
  try {
    const res = await fetch('http://localhost:3000/api/chat/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: 'Test manual message from node script',
        roomId: 'cmpfrdkn9000mlrqksx02gne3',
        role: 'user',
        mute: true,
        triggerLLM: true
      })
    });
    console.log('Status:', res.status);
    const data = await res.json();
    console.log('Response:', data);
  } catch (err) {
    console.error('Fetch error:', err);
  }
}

main();
