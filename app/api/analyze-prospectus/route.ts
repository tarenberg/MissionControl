import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { url, requestId: existingRequestId, force, action, pastedText } = body;
    
    const requestPath = path.join(process.cwd(), 'data', 'prospectus-requests.json');

    if (action === 'list') {
      if (fs.existsSync(requestPath)) {
        return NextResponse.json(JSON.parse(fs.readFileSync(requestPath, 'utf8')));
      }
      return NextResponse.json([]);
    }

    if (existingRequestId) {
      // Check if analysis is ready
      const analysisPath = path.join(process.cwd(), 'data', `prospectus-analysis-${existingRequestId}.json`);
      if (fs.existsSync(analysisPath)) {
        const analysis = JSON.parse(fs.readFileSync(analysisPath, 'utf8'));
        return NextResponse.json(analysis);
      }
      return NextResponse.json({ status: 'processing' });
    }

    if (pastedText) {
      const requestId = Date.now().toString();
      const rawTextFile = `data/prospectus-raw-${requestId}.txt`;
      const rawTextPath = path.join(process.cwd(), rawTextFile);
      fs.writeFileSync(rawTextPath, pastedText, 'utf8');

      const newRequest = {
        id: requestId,
        url: url || `pasted://${requestId}`,
        pastedTextFile: rawTextFile,
        timestamp: new Date().toISOString(),
        status: 'pending'
      };

      let requests = [];
      if (fs.existsSync(requestPath)) {
        requests = JSON.parse(fs.readFileSync(requestPath, 'utf8'));
      }
      requests.push(newRequest);
      fs.writeFileSync(requestPath, JSON.stringify(requests, null, 2));

      return NextResponse.json({
        requestId: requestId,
        message: 'Pasted prospectus content received. Muffin is analyzing it...',
        rawContentSnippet: pastedText.substring(0, 500)
      });
    }

    if (!url) return NextResponse.json({ error: 'URL is required' }, { status: 400 });

    // Check if we already have an analysis for this URL to avoid redundant work
    let requests = [];
    if (fs.existsSync(requestPath)) {
      requests = JSON.parse(fs.readFileSync(requestPath, 'utf8'));
    }

    const existingRequestIndex = requests.findIndex((r: any) => r.url === url);
    if (existingRequestIndex !== -1 && !force) {
      const existingRequest = requests[existingRequestIndex];
      const analysisPath = path.join(process.cwd(), 'data', `prospectus-analysis-${existingRequest.id}.json`);
      if (fs.existsSync(analysisPath)) {
        try {
          const content = fs.readFileSync(analysisPath, 'utf8');
          if (content.trim()) {
            const analysis = JSON.parse(content);
            return NextResponse.json({ ...analysis, requestId: existingRequest.id });
          }
        } catch (parseError) {
          console.warn(`Analysis file for ${existingRequest.id} is currently locked or invalid. Retrying...`);
          // Fall through to return processing status
        }
      }
      return NextResponse.json({ 
        requestId: existingRequest.id,
        status: 'processing'
      });
    }

    const newRequest = {
      id: Date.now().toString(),
      url,
      timestamp: new Date().toISOString(),
      status: 'pending'
    };
    
    if (force && existingRequestIndex !== -1) {
      // Clean up old analysis file if it exists
      const oldAnalysisPath = path.join(process.cwd(), 'data', `prospectus-analysis-${requests[existingRequestIndex].id}.json`);
      if (fs.existsSync(oldAnalysisPath)) fs.unlinkSync(oldAnalysisPath);
      
      requests[existingRequestIndex] = newRequest;
    } else {
      requests.push(newRequest);
    }
    
    fs.writeFileSync(requestPath, JSON.stringify(requests, null, 2));

    // Also, let's try to get an immediate lightweight summary using jina.ai
    // to give the user something right away.
    const jinaUrl = `https://r.jina.ai/${url}`;
    const response = await fetch(jinaUrl, {
      headers: {
        'Accept': 'application/json',
        'X-No-Cache': 'true'
      }
    });
    
    const content = await response.text();
    
    // We'll return a "Processing" state to the UI
    return NextResponse.json({ 
      requestId: newRequest.id,
      message: 'Analysis started. Muffin is diving into the prospectus...',
      rawContentSnippet: content.substring(0, 500)
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
