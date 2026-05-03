const fetch = require('node-fetch');
const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

async function fetchArtDeadlines() {
    console.log('Fetching art deadlines from The Art Guide...');
    try {
        const response = await fetch('https://theartguide.com/calls-for-artists');
        const html = await response.text();
        const dom = new JSDOM(html);
        const document = dom.window.document;
        
        const deadlines = [];
        // The site seems to use a table or div structure. 
        // Based on the text output, it looks like a list.
        // Let's try to find all links that look like callforartist
        const links = document.querySelectorAll('a');
        const uniqueEntries = new Set();

        links.forEach((link) => {
            const href = link.getAttribute('href') || '';
            if (href.includes('/callforartist/') && !uniqueEntries.has(href)) {
                uniqueEntries.add(href);
                // The title is the text of the link
                const title = link.textContent.trim();
                if (title && title.length > 5) {
                    // Look for surrounding text for deadline
                    // This is hacky but might work for a quick sprint
                    deadlines.push({
                        title,
                        link: href.startsWith('http') ? href : `https://theartguide.com${href}`,
                        source: 'The Art Guide'
                    });
                }
            }
        });

        const dataDir = path.join(__dirname, '..', 'data');
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
        
        const outputPath = path.join(dataDir, 'art-deadlines.json');
        fs.writeFileSync(outputPath, JSON.stringify(deadlines, null, 2));
        console.log(`Successfully saved ${deadlines.length} potential deadlines to ${outputPath}`);
    } catch (error) {
        console.error('Error fetching art deadlines:', error.message);
    }
}

fetchArtDeadlines();
