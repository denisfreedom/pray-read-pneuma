const fs = require('fs');
const path = require('path');

// List of files that need updating
const files = [
  'app/api/bible-verses/bulk-import/route.ts',
  'app/api/auth/login/route.ts',
  'app/api/auth/signup/route.ts',
  'app/api/auth/user-login/route.ts',
  'app/api/auth/update-password/route.ts',
  'app/api/auth/forgot-password/route.ts',
  'app/api/auth/reset-password/route.ts',
  'app/api/auth/user-forgot-password/route.ts',
  'app/api/auth/user-reset-password/route.ts',
  'app/api/bible-content/route.ts',
  'app/api/introduction/route.ts',
  'app/api/reading-plans/[id]/route.ts',
  'app/api/verse-collections/[id]/verses/route.ts',
  'app/api/commentaries/route.ts',
  'app/api/admin/dashboard-stats/route.ts',
  'app/api/admin/contact-messages/route.ts',
  'app/api/contact/route.ts',
  'app/api/verse-of-the-day/route.ts',
  'app/api/send-daily-notification/route.ts',
  'app/api/text-colors/route.ts',
  'app/api/visitor-tracking/route.ts',
  'app/api/admin-text-colors/route.ts',
  'app/api/discussion-groups/route.ts',
  'app/api/discussion-groups/[id]/route.ts',
  'app/api/discussion-groups/[id]/members/route.ts',
  'app/api/forum-posts/route.ts',
  'app/api/forum-posts/[id]/route.ts',
  'app/api/forum-posts/[id]/replies/route.ts',
];

function getRelativePath(filePath) {
  const depth = (filePath.match(/\//g) || []).length - 1; // -1 because we start from app/api
  if (depth === 0) return '../utils/db';
  return '../'.repeat(depth) + 'utils/db';
}

let updated = 0;
let skipped = 0;
let errors = 0;

files.forEach(file => {
  const fullPath = path.join(__dirname, file);
  
  try {
    if (!fs.existsSync(fullPath)) {
      console.log(`⚠️  Not found: ${file}`);
      skipped++;
      return;
    }
    
    let content = fs.readFileSync(fullPath, 'utf8');
    
    // Skip if already using getDb
    if (content.includes('getDb')) {
      console.log(`✓ Already updated: ${file}`);
      skipped++;
      return;
    }
    
    // Calculate correct import path
    const importPath = getRelativePath(file);
    
    // Replace import statement
    content = content.replace(
      /import { neon } from '@neondatabase\/serverless';/g,
      `import { getDb } from '${importPath}';`
    );
    
    // Remove const sql = neon(...) line
    content = content.replace(/\nconst sql = neon\(process\.env\.DATABASE_URL!\);/g, '');
    
    // Add const sql = getDb(); after each "try {"
    content = content.replace(/(  try {\n)/g, '$1    const sql = getDb();\n');
    
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`✅ Updated: ${file}`);
    updated++;
    
  } catch (error) {
    console.error(`❌ Error updating ${file}:`, error.message);
    errors++;
  }
});

console.log(`\n${'='.repeat(60)}`);
console.log(`Updated: ${updated} files`);
console.log(`Skipped: ${skipped} files`);
console.log(`Errors: ${errors} files`);
console.log(`${'='.repeat(60)}`);
