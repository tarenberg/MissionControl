import { NextResponse } from 'next/server';
import os from 'os';
import { execSync } from 'child_process';

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
  lastCpuUsage = { idle, total };

  return 1 - (deltaTotal > 0 ? deltaIdle / deltaTotal : 0);
}

// Initial call to set baseline
getCpuUsage();

export async function GET() {
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  const usedMemory = totalMemory - freeMemory;
  const cpuUsage = getCpuUsage();

  let diskInfo = { total: 0, used: 0, free: 0, percentage: '0.00' };
  try {
    const psOutput = execSync('powershell "Get-PSDrive C | Select-Object Used, Free | ConvertTo-Json"').toString();
    const diskData = JSON.parse(psOutput);
    const used = diskData.Used;
    const free = diskData.Free;
    const total = used + free;
    diskInfo = {
      total,
      used,
      free,
      percentage: ((used / total) * 100).toFixed(2)
    };
  } catch (e) {
    // Disk info failed
  }

  let gpuInfo = { name: 'N/A', total: 0, free: 0, used: 0 };
  try {
    const gpuData = execSync('nvidia-smi --query-gpu=name,memory.total,memory.free,memory.used --format=csv,noheader,nounits').toString().split(',');
    if (gpuData.length >= 4) {
      gpuInfo = {
        name: gpuData[0].trim(),
        total: parseInt(gpuData[1]) * 1024 * 1024,
        free: parseInt(gpuData[2]) * 1024 * 1024,
        used: parseInt(gpuData[3]) * 1024 * 1024
      };
    }
  } catch (e) {
    // No GPU or nvidia-smi failed
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
    disk: diskInfo
  });
}
