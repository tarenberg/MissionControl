const fs = require('fs');
const path = require('path');

const filePath = process.argv[2];
const content = fs.readFileSync(filePath, 'utf8');

let sanitized = '';
for (let i = 0; i < content.length; i++) {
    const charCode = content.charCodeAt(i);
    if (charCode > 127) {
        sanitized += '\\u' + charCode.toString(16).padStart(4, '0');
    } else {
        sanitized += content[i];
    }
}

fs.writeFileSync(filePath, sanitized, 'utf8');
console.log('Sanitized ' + filePath);
