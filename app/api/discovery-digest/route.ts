import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  // Use absolute path to doc
  const radarPath = 'C:/Users/tberg/Documents/_PROJECTS/MissionControl/docs/Pathfinder-Trend-Radar.md';
  
  if (!fs.existsSync(radarPath)) {
    return NextResponse.json({ trends: [], priorities: [] });
  }

  const content = fs.readFileSync(radarPath, 'utf8');
  
  // Parse trends
  const trends: {title: string, content: string}[] = [];
  const trendSection = content.match(/## 🎨 Market Trends & Curator Patterns([\s\S]*?)## 🚀 Priority Targets for Tom/);
  
  if (trendSection) {
    const trendMatches = trendSection[1].match(/### \d+\. (.*?)\n([\s\S]*?)(?=### |$)/g);
    if (trendMatches) {
      trendMatches.forEach(m => {
        const lines = m.split('\n');
        const title = lines[0].replace('### ', '').trim();
        const body = lines.slice(1).join('\n').trim();
        trends.push({ title, content: body });
      });
    }
  }

  // Parse priorities
  const priorities: {title: string, content: string}[] = [];
  const prioritySection = content.match(/## 🚀 Priority Targets for Tom([\s\S]*?)$/);
  if (prioritySection) {
    const priorityItems = prioritySection[1].match(/- \*\*(.*?)\*\*: (.*)/g);
    if (priorityItems) {
      priorityItems.forEach(item => {
        const match = item.match(/- \*\*(.*?)\*\*: (.*)/);
        if (match) {
          priorities.push({ title: match[1], content: match[2] });
        }
      });
    }
  }

  return NextResponse.json({ trends, priorities });
}
