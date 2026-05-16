import { NextResponse } from 'next/server';
import { execSync } from 'child_process';
import path from 'path';

export async function POST() {
  try {
    const scriptPath = path.resolve(process.cwd(), 'scripts', 'fetch-art-deadlines.js');
    console.log(`Executing scraper script: ${scriptPath}`);
    
    const output = execSync(`node ${scriptPath}`, { encoding: 'utf8' });
    console.log('Scraper output:', output);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Scraping completed successfully', 
      output 
    });
  } catch (error: any) {
    console.error('Error scraping art deadlines:', error);
    return NextResponse.json({ 
      success: false, 
      message: error.message || 'Internal Server Error',
      error: error.toString()
    }, { status: 500 });
  }
}
