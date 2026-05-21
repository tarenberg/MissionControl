const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const fetch = require('node-fetch');

// Configuration
const ART_BASE_PATH = 'C:/xampp/htdocs/tools/ArtTrackerDashboard/Artwork/Paintings';
const OUTPUT_BASE_PATH = path.join(__dirname, '..', 'media', 'celebrations');

// Load API Key
const envPath = path.join(process.cwd(), '.env');
let GEMINI_API_KEY = null;
try {
    const env = fs.readFileSync(envPath, 'utf8');
    const apiKeyMatch = env.match(/NEXT_PUBLIC_GEMINI_API_KEY=(.*)/);
    GEMINI_API_KEY = apiKeyMatch ? apiKeyMatch[1].trim() : null;
} catch (e) {
    console.warn('Could not read .env for Gemini API key, using fallback.');
}


async function generateCaption(artworkTitle, showTitle) {
    if (!GEMINI_API_KEY) return "Accepted! So thrilled to announce my work was selected.";

    const prompt = `Write an excited but professional Instagram/Facebook caption for an artist whose painting titled "${artworkTitle}" was just accepted into the prestigious juried show "${showTitle}". Include a few relevant hashtags like #art #painting #juriedshow. Keep it under 50 words.`;
    
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${GEMINI_API_KEY}`;
    
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });
        const data = await response.json();
        return data.candidates[0].content.parts[0].text;
    } catch (e) {
        return `Thrilled to share that "${artworkTitle}" has been accepted into "${showTitle}"! #art #painting #accepted`;
    }
}

async function generateAcceptancePost(artworkTitle, artworkImagePath, showTitle) {
    if (!fs.existsSync(OUTPUT_BASE_PATH)) {
        fs.mkdirSync(OUTPUT_BASE_PATH, { recursive: true });
    }

    const fullImagePath = path.join('C:/xampp/htdocs/tools/ArtTrackerDashboard/api', artworkImagePath);
    console.log(`Processing image: ${fullImagePath}`);

    if (!fs.existsSync(fullImagePath)) {
        throw new Error(`Image not found at ${fullImagePath}`);
    }

    const outputFileName = `${artworkTitle.replace(/[^a-z0-9]/gi, '_')}_accepted_${Date.now()}.jpg`;
    const outputPath = path.join(OUTPUT_BASE_PATH, outputFileName);

    const image = sharp(fullImagePath);
    const metadata = await image.metadata();
    const width = metadata.width || 600;
    const bannerHeight = Math.floor(width * 0.25);

    // Create a badge overlay
    // Scale banner to image width
    const svgBanner = `
    <svg width="${width}" height="${bannerHeight}">
      <style>
        .title { fill: white; font-family: sans-serif; font-size: ${Math.floor(bannerHeight * 0.4)}px; font-weight: bold; }
        .subtitle { fill: #FFD700; font-family: sans-serif; font-size: ${Math.floor(bannerHeight * 0.2)}px; }
      </style>
      <rect x="0" y="0" width="${width}" height="${bannerHeight}" fill="rgba(0,0,0,0.7)" />
      <text x="${width / 2}" y="${bannerHeight * 0.45}" text-anchor="middle" class="title">ACCEPTED</text>
      <text x="${width / 2}" y="${bannerHeight * 0.75}" text-anchor="middle" class="subtitle">${showTitle}</text>
    </svg>
    `;

    // Resize or just overlay
    // We'll place it at the bottom
    await image
        .composite([{
            input: Buffer.from(svgBanner),
            gravity: 'south',
            blend: 'over'
        }])
        .toFile(outputPath);

    console.log(`Celebration post saved to: ${outputPath}`);
    
    const caption = await generateCaption(artworkTitle, showTitle);
    
    const result = {
        imagePath: outputPath,
        caption: caption,
        artworkTitle,
        showTitle
    };

    const manifestPath = path.join(OUTPUT_BASE_PATH, `${outputFileName}.json`);
    fs.writeFileSync(manifestPath, JSON.stringify(result, null, 2));

    return result;
}

// Example usage if run directly
if (require.main === module) {
    const artworkTitle = process.argv[2] || 'Test Artwork';
    const artworkImagePath = process.argv[3] || '../Artwork/Paintings/490.01.jpg';
    const showTitle = process.argv[4] || 'AcrylicWorks 13';

    generateAcceptancePost(artworkTitle, artworkImagePath, showTitle)
        .then(path => console.log(`Success! ${path}`))
        .catch(err => console.error(`Failed: ${err.message}`));
}

module.exports = { generateAcceptancePost };
