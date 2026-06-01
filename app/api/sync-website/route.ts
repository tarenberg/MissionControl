import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import path from 'path';

export async function POST(): Promise<Response> {
  try {
    const scriptPath = path.resolve(process.cwd(), 'scripts', 'sync_website_art.py');
    console.log(`Executing sync script: ${scriptPath}`);
    
    return new Promise<Response>((resolve) => {
      exec(`python "${scriptPath}"`, { encoding: 'utf8' }, (error, stdout, stderr) => {
        if (error) {
          console.error('Error syncing website artworks:', error, stderr);
          resolve(NextResponse.json({ 
            success: false, 
            message: error.message || 'Execution failed',
            error: stderr || error.toString()
          }, { status: 500 }));
        } else {
          console.log('Sync output:', stdout);
          resolve(NextResponse.json({ 
            success: true, 
            message: 'Website artwork sync completed successfully', 
            output: stdout 
          }));
        }
      });
    });
  } catch (error: any) {
    console.error('Error in sync-website route:', error);
    return NextResponse.json({ 
      success: false, 
      message: error.message || 'Internal Server Error',
      error: error.toString()
    }, { status: 500 });
  }
}
