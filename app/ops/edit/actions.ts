'use server';

import { execSync } from 'child_process';

interface UpdateData {
  name: string;
  schedule: string;
  enabled: boolean;
  agentId: string;
  message: string;
}

export async function updateCronJob(
  id: string,
  data: UpdateData
): Promise<{ success: boolean; error?: string }> {
  try {
    // Build the command arguments
    const args: string[] = ['cron', 'update', id];
    
    if (data.name) {
      args.push('--name', data.name);
    }
    
    if (data.schedule) {
      args.push('--cron', data.schedule);
    }
    
    if (data.agentId) {
      args.push('--agent', data.agentId);
    }
    
    if (data.message) {
      args.push('--message', data.message);
    }
    
    if (!data.enabled) {
      args.push('--disabled');
    }
    
    // Execute the openclaw command
    const result = execSync(`openclaw ${args.join(' ')}`, {
      encoding: 'utf8',
      timeout: 10000,
    });
    
    // Parse the result
    const parsed = JSON.parse(result);
    
    if (parsed.error) {
      return { success: false, error: parsed.error };
    }
    
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: message };
  }
}
