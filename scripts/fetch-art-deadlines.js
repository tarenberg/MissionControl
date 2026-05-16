const fetch = require('node-fetch');
const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

function formatDate(dateStr) {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toISOString().split('T')[0];
}

const SOURCES = [
    {
        name: 'The Art Guide',
        url: 'https://theartguide.com/calls-for-artists',
        parser: (document, source) => {
            const deadlines = [];
            const rows = document.querySelectorAll('tr');
            rows.forEach(row => {
                const cells = row.querySelectorAll('td');
                if (cells.length >= 4) {
                    const titleLink = cells[0].querySelector('a');
                    const galleryLink = cells[1].querySelector('a');
                    const stateLink = cells[2].querySelector('a');
                    const dateLink = cells[3].querySelector('a');
                    
                    if (titleLink) {
                        const href = titleLink.getAttribute('href') || '';
                        if (href.includes('/callforartist/')) {
                            const title = titleLink.textContent.trim();
                            const gallery = galleryLink ? galleryLink.textContent.trim() : '';
                            const state = stateLink ? stateLink.textContent.trim() : '';
                            const date = dateLink ? dateLink.textContent.trim() : '';
                            
                            deadlines.push({
                                title,
                                location: `${gallery}${gallery && state ? ', ' : ''}${state}`,
                                due_date: formatDate(date),
                                link: href.startsWith('http') ? href : `${source.baseUrl}${href}`,
                                source: source.name
                            });
                        }
                    }
                }
            });
            return deadlines;
        },
        baseUrl: 'https://theartguide.com'
    },
    {
        name: 'ArtShow',
        url: 'https://r.jina.ai/https://www.artshow.com/juriedshows/',
        parser: (document, source) => {
            const deadlines = [];
            const content = document.body.textContent;
            
            const sections = content.split('#### ');
            sections.forEach(section => {
                const lines = section.split('\n');
                const title = lines[0].trim();
                if (!title || title.length < 5 || title.toLowerCase().includes('deadline')) return;

                const linkMatch = section.match(/\[More info\]\((https?:\/\/[^\)]+)\)/);
                const link = linkMatch ? linkMatch[1] : '';

                const dateMatch = section.match(/(?:Deadline|Due):\s*([A-Za-z]+\s+\d{1,2},?\s+\d{4})/i);
                const dueDate = dateMatch ? formatDate(dateMatch[1]) : '';

                const locMatch = section.match(/(?:at|in)\s+([^,.\n]+,\s+[A-Z]{2}|Online)/);
                const location = locMatch ? locMatch[1].trim() : '';

                if (link && !link.includes('facebook.com')) {
                    deadlines.push({
                        title,
                        location,
                        due_date: dueDate,
                        link: link.startsWith('http') ? link : `https://www.artshow.com${link}`,
                        source: source.name
                    });
                }
            });
            return deadlines;
        },
        baseUrl: 'https://www.artshow.com'
    },
    {
        name: 'Artists Network',
        // Using r.jina.ai bypass to avoid Cloudflare 403 Forbidden
        url: 'https://r.jina.ai/https://www.artistsnetwork.com/art-competitions/',
        parser: (document, source) => {
            const deadlines = [];
            const content = document.body.textContent;
            
            // Regex to find: ### [Title](Link) ... ##### Final Deadline: Date
            // We split by "### [" to get each section
            const sections = content.split('### [');
            sections.forEach(section => {
                const match = section.match(/^([^\]]+)\]\((https?:\/\/[^\)]+)\)/);
                if (match) {
                    const title = match[1].trim();
                    const link = match[2].trim();
                    
                    if (title.toLowerCase().includes('skip to main') || link.includes('#main')) return;

                    // Look for deadline in this section
                    let dueDate = '';
                    const dateMatch = section.match(/(?:Deadline|Coming in):\s*([A-Za-z]+\s+\d{1,2},?\s+\d{4}|[A-Za-z]+\s+\d{4})/i);
                    if (dateMatch) {
                        dueDate = formatDate(dateMatch[1]);
                    }

                    deadlines.push({
                        title,
                        link,
                        location: 'Artists Network (Online/Magazine)',
                        due_date: dueDate,
                        source: source.name
                    });
                }
            });

            return deadlines;
        },
        baseUrl: 'https://www.artistsnetwork.com'
    }
];

const BLACKLIST_KEYWORDS = ['photography', 'photographic', 'fair', 'craft', 'festival', 'jewelry', 'ceramic'];

function isBlacklisted(item) {
    const textToSearch = `${item.title} ${item.location}`.toLowerCase();
    return BLACKLIST_KEYWORDS.some(keyword => textToSearch.includes(keyword));
}

async function fetchArtDeadlines() {
    let allDeadlines = [];

    for (const source of SOURCES) {
        console.log(`Fetching art deadlines from ${source.name}...`);
        try {
            const response = await fetch(source.url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                }
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const html = await response.text();
            const dom = new JSDOM(html);
            const document = dom.window.document;
            
            const results = source.parser(document, source);
            
            // Apply blacklist filter
            const filteredResults = results.filter(item => {
                if (isBlacklisted(item)) {
                    console.log(`[Filtered] ${item.title}`);
                    return false;
                }
                return true;
            });

            allDeadlines = allDeadlines.concat(filteredResults);
            console.log(`Found ${results.length} entries from ${source.name} (${filteredResults.length} kept after filtering)`);
        } catch (error) {
            console.error(`Error fetching from ${source.name}:`, error.message);
        }
    }

    const dataDir = path.join(__dirname, '..', 'data');
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }
    
    const outputPath = path.join(dataDir, 'art-deadlines.json');
    fs.writeFileSync(outputPath, JSON.stringify(allDeadlines, null, 2));
    console.log(`Successfully saved ${allDeadlines.length} total deadlines to ${outputPath}`);
}

fetchArtDeadlines();
