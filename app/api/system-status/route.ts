import { NextResponse } from 'next/server';
import os from 'os';
import fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

let lastCpuUsage = { idle: 0, total: 0 };

function getCpuUsage() {
  const cpus = os.cpus();
  let idle = 0;
  let total = 0;

  cpus.forEach((cpu) => {
    for (const type in cpu.times) {
      total += (cpu.times as any)[type];
    }
    idle += cpu.times.idle;
  });

  const deltaIdle = idle - lastCpuUsage.idle;
  const deltaTotal = total - lastCpuUsage.total;
  
  // Update state for next call
  lastCpuUsage = { idle, total };

  // Handle first call or zero delta
  if (deltaTotal <= 0) return 0;

  return 1 - (deltaIdle / deltaTotal);
}

// Initial call to set baseline
getCpuUsage();

export async function GET() {
  try {
    const start = Date.now();
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    
    const cpuUsage = getCpuUsage();

    // Parallelize Disk and GPU info
    const [diskInfo, gpuInfo] = await Promise.all([
      getDiskInfo(),
      getGpuInfo()
    ]);

    const duration = Date.now() - start;
    if (duration > 500) {
      console.warn(`[system-status] Latency spike detected: ${duration}ms`);
    }

    return NextResponse.json({
      memory: {
        total: totalMemory,
        free: freeMemory,
        used: usedMemory,
        percentage: ((usedMemory / totalMemory) * 100).toFixed(2)
      },
      cpu: {
        usage: (cpuUsage * 100).toFixed(2)
      },
      gpu: gpuInfo,
      disk: diskInfo,
      latency: duration,
      degraded: false
    }, {
      headers: { 'Cache-Control': 'no-store' }
    });
  } catch (error) {
    console.error('[system-status] GET failed:', error);
    return NextResponse.json({
      memory: { total: 0, free: 0, used: 0, percentage: '0.00' },
      cpu: { usage: '0.00' },
      gpu: { name: 'N/A', total: 0, free: 0, used: 0 },
      disk: { total: 0, used: 0, free: 0, percentage: '0.00' },
      latency: 0,
      degraded: true
    }, {
      status: 200,
      headers: { 'Cache-Control': 'no-store' }
    });
  }
}

async function getDiskInfo() {
  try {
    // Native Node.js call - no process spawning, no admin needed.
    const stats = fs.statfsSync('C:');
    const total = stats.bsize * stats.blocks;
    const free = stats.bsize * stats.bfree;
    const used = total - free;
    return {
      total,
      used,
      free,
      percentage: ((used / total) * 100).toFixed(2)
    };
  } catch (e) {
    console.error('[system-status] getDiskInfo failed:', e);
    return { total: 0, used: 0, free: 0, percentage: '0.00' };
  }
}

async function getGpuInfo() {
  let gpuInfo = { name: 'N/A', total: 0, free: 0, used: 0 };
  try {
    // Shorter timeout and specific check for nvidia-smi
    const { stdout } = await execAsync('nvidia-smi --query-gpu=name,memory.total,memory.free,memory.used --format=csv,noheader,nounits', { timeout: 1000 });
    const gpuData = stdout.split(',');
    if (gpuData.length >= 4) {
      return {
        name: gpuData[0].trim(),
        total: parseInt(gpuData[1]) * 1024 * 1024,
        free: parseInt(gpuData[2]) * 1024 * 1024,
        used: parseInt(gpuData[3]) * 1024 * 1024
      };
    }
  } catch (e) {
    // If nvidia-smi fails, it's likely not installed or no NVIDIA GPU present
  }
  return gpuInfo;
}
