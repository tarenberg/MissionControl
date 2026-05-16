const fs = require('fs');
const path = require('path');

const CELEBRATIONS_DIR = path.join(__dirname, '..', 'media', 'celebrations');
const RETENTION_DAYS = 30;

function cleanup() {
    console.log(`Starting cleanup of ${CELEBRATIONS_DIR}...`);
    if (!fs.existsSync(CELEBRATIONS_DIR)) {
        console.log("Celebrations directory not found. Skipping.");
        return;
    }

    const now = Date.now();
    const files = fs.readdirSync(CELEBRATIONS_DIR);

    let deletedCount = 0;

    files.forEach(file => {
        const filePath = path.join(CELEBRATIONS_DIR, file);
        const stats = fs.statSync(filePath);
        const ageInMs = now - stats.mtimeMs;
        const ageInDays = ageInMs / (1000 * 60 * 60 * 24);

        if (ageInDays > RETENTION_DAYS) {
            console.log(`Deleting old file: ${file} (${ageInDays.toFixed(1)} days old)`);
            fs.unlinkSync(filePath);
            deletedCount++;
        }
    });

    console.log(`Cleanup complete. Deleted ${deletedCount} old celebration files.`);
}

cleanup();
