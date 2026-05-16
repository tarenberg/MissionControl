
import { NextResponse } from 'next/server';
import { execSync } from 'child_process';
import path from 'path';

export async function POST() {
  try {
    const scriptPath = path.resolve(process.cwd(), 'scripts', 'sync-ai-costs.js');
    console.log(`Executing sync script: ${scriptPath}`);
    
    // Using node to execute the script
    const output = execSync(`node ${scriptPath}`, { encoding: 'utf8' });
    console.log('Sync output:', output);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Sync completed successfully', 
      output 
    });
  } catch (error: any) {
    console.error('Error syncing AI costs:', error);
    return NextResponse.json({ 
      success: false, 
      message: error.message || 'Internal Server Error',
      error: error.toString()
    }, { status: 500 });
  }
}
