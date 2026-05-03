const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const projects = [
  { title: "Mission Control Application", localUrl: "C:\\Users\\tberg\\Documents\\_PROJECTS\\MissionControl", wikiFolder: "MissionControl" },
  { title: "Picture Hanger Pro", localUrl: "C:\\Users\\tberg\\Documents\\_PROJECTS\\PictureHangerPro", wikiFolder: "PictureHangerPro" },
  { title: "Palette Picker Pro", localUrl: "C:\\Users\\tberg\\Documents\\_PROJECTS\\PalettePickerPro", wikiFolder: "PalettePickerPro" },
  { title: "VoiceChat", localUrl: "C:\\Users\\tberg\\Documents\\_PROJECTS\\VoiceChat", wikiFolder: "VoiceChat" },
  { title: "CollectorCRM", localUrl: "C:\\Users\\tberg\\Documents\\_PROJECTS\\CollectorCRM", wikiFolder: "CollectorCRM" },
  { title: "Tom Arenberg Website", localUrl: "C:\\Users\\tberg\\Documents\\_PROJECTS\\TomArenbergWebsite", wikiFolder: "TomArenbergWebsite" },
  { title: "Thomas-Arenberg", localUrl: "C:\\Users\\tberg\\Documents\\_PROJECTS\\Thomas-Arenberg", wikiFolder: "Thomas-Arenberg" },
  { title: "ArtSubmissions", localUrl: "C:\\Users\\tberg\\Documents\\_PROJECTS\\ArtSubmissions", wikiFolder: "ArtSubmissions" },
  { title: "PaletteExtractor", localUrl: "C:\\Users\\tberg\\Documents\\_PROJECTS\\PaletteExtractor", wikiFolder: "PaletteExtractor" },
  { title: "SecondBrain", localUrl: "C:\\Users\\tberg\\Documents\\_PROJECTS\\SecondBrain", wikiFolder: "second-brain" }
];

const WIKI_BASE = "C:\\Users\\tberg\\.openclaw\\workspace\\docs\\projects";

for (const p of projects) {
  const projectDocsDir = path.join(p.localUrl, 'docs');
  const wikiDir = path.join(WIKI_BASE, p.wikiFolder);
  const projectReadme = path.join(p.localUrl, 'README.md');
  const projectDocsReadme = path.join(projectDocsDir, 'README.md');

  console.log(`Processing ${p.title}...`);

  try {
    // 1. Create docs dir in project if missing
    if (!fs.existsSync(projectDocsDir)) {
      fs.mkdirSync(projectDocsDir, { recursive: true });
    }

    // 2. Link README if it exists and target doesn't
    if (fs.existsSync(projectReadme) && !fs.existsSync(projectDocsReadme)) {
      try {
        execSync(`cmd /c mklink /H "${projectDocsReadme}" "${projectReadme}"`);
      } catch (e) {
        console.warn(`Could not hardlink README for ${p.title}`);
      }
    }

    // 3. Move existing wiki files to project docs
    if (fs.existsSync(wikiDir)) {
      const files = fs.readdirSync(wikiDir);
      for (const file of files) {
        const src = path.join(wikiDir, file);
        const dest = path.join(projectDocsDir, file);
        if (!fs.existsSync(dest)) {
          fs.renameSync(src, dest);
        }
      }
      // 4. Remove empty wiki folder
      fs.rmdirSync(wikiDir, { recursive: true });
    }

    // 5. Create junction
    execSync(`cmd /c mklink /J "${wikiDir}" "${projectDocsDir}"`);
    console.log(`Successfully bridged ${p.title}`);

  } catch (err) {
    console.error(`Error bridging ${p.title}:`, err.message);
  }
}
