import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const baseUrl = 'http://localhost:8080/tools/ArtTrackerDashboard/api/costs.php';
    const response = await fetch(baseUrl);
    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }
    
    const costs = await response.json();
    
    // Filter AI-related costs only
    const aiCosts = costs.filter((cost: any) => 
      cost.category === 'AI Usage' || 
      cost.description?.toLowerCase().includes('anthropic') ||
      cost.description?.toLowerCase().includes('openai') ||
      cost.description?.toLowerCase().includes('openrouter') ||
      cost.description?.toLowerCase().includes('midjourney') ||
      cost.description?.toLowerCase().includes('claude')
    );
    
    // Auto-adjust window: try 30, 60, 90 days until we find data
    const now = new Date();
    let cutoffDate = '';
    let dateRange = '';
    let totalPeriod = 0;
    const byProvider: Record<string, number> = {};
    
    // Try each window until we find data
    const windows = [30, 60, 90];
    for (const days of windows) {
      const pastDate = new Date(now);
      pastDate.setDate(now.getDate() - days);
      const testCutoff = pastDate.toISOString().split('T')[0];
      
      // Count costs in this window
      const costsInWindow = aiCosts.filter((cost: any) => cost.date >= testCutoff);
      
      if (costsInWindow.length > 0) {
        cutoffDate = testCutoff;
        dateRange = `Last ${days} Days`;
        
        // Calculate totals
        costsInWindow.forEach((cost: any) => {
          totalPeriod += parseFloat(cost.amount);
          
          // Extract provider from description
          let provider = 'Other';
          const desc = cost.description.toLowerCase();
          if (desc.includes('anthropic') || desc.includes('claude')) provider = 'Anthropic';
          else if (desc.includes('openai') || desc.includes('chatgpt')) provider = 'OpenAI';
          else if (desc.includes('openrouter')) provider = 'OpenRouter';
          else if (desc.includes('midjourney')) provider = 'Midjourney';
          else if (desc.includes('krea')) provider = 'Krea';
          
          byProvider[provider] = (byProvider[provider] || 0) + parseFloat(cost.amount);
        });
        
        break; // Found data, stop searching
      }
    }
    
    // If still no data, use "All Time"
    if (!cutoffDate && aiCosts.length > 0) {
      dateRange = 'All Time';
      aiCosts.forEach((cost: any) => {
        totalPeriod += parseFloat(cost.amount);
        
        let provider = 'Other';
        const desc = cost.description.toLowerCase();
        if (desc.includes('anthropic') || desc.includes('claude')) provider = 'Anthropic';
        else if (desc.includes('openai') || desc.includes('chatgpt')) provider = 'OpenAI';
        else if (desc.includes('openrouter')) provider = 'OpenRouter';
        else if (desc.includes('midjourney')) provider = 'Midjourney';
        else if (desc.includes('krea')) provider = 'Krea';
        
        byProvider[provider] = (byProvider[provider] || 0) + parseFloat(cost.amount);
      });
    } else if (!cutoffDate) {
      dateRange = 'Last 30 Days'; // Default if no data at all
    }
    
    // Get recent 5 transactions
    const recent = aiCosts
      .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
    
    return NextResponse.json({
      totalLast30Days: totalPeriod,
      byProvider,
      recent,
      dateRange
    });
  } catch (error: any) {
    console.error('Error fetching AI costs:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to fetch AI costs',
      totalLast30Days: 0,
      byProvider: {},
      recent: [],
      dateRange: 'Last 30 Days'
    }, { status: 500 });
  }
}
