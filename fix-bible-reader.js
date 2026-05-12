const fs = require('fs');
const path = require('path');

const filePath = '/home/user/apps/web/app/bible-reader/[book]/[chapter]/page.tsx';

// Read the file
let content = fs.readFileSync(filePath, 'utf-8');

// Count problematic patterns before
const beforeCount = (content.match(/dangerouslySetInnerHTML.*?\}}\\/gm) || []).length;
console.log(`Found ${beforeCount} problematic patterns`);

// Remove literal \n sequences that appear after }} or />  in JSX
// The pattern is: }} or /> followed by literal \n
content = content.replace(/(\}\}|\/>\)\\n/g, (match) => {
  return match.replace('\\n', '');
});

// Also handle () \n patterns
content = content.replace(/(\)\)\\n/g, (match) => {
  return match.replace('\\n', '');
});

// Also handle (\ patterns  
content = content.replace(/\(\\n/g, '(');

// Also handle }\ patterns at end of lines
content = content.replace(/\}\\n/g, '}');

// Write back
fs.writeFileSync(filePath, content, 'utf-8');

const afterCount = (content.match(/dangerouslySetInnerHTML.*?\}}\\/gm) || []).length;
console.log(`After fix: ${afterCount} problematic patterns remain`);
console.log('File fixed!');
