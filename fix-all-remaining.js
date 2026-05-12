const fs = require('fs');
const path = require('path');

const fixes = [
  { file: 'app/api/auth/update-password/route.ts', importPath: '../../utils/db' },
  { file: 'app/api/auth/forgot-password/route.ts', importPath: '../../utils/db' },
  { file: 'app/api/auth/reset-password/route.ts', importPath: '../../utils/db' },
  { file: 'app/api/auth/user-forgot-password/route.ts', importPath: '../../utils/db' },
  { file: 'app/api/auth/user-reset-password/route.ts', importPath: '../../utils/db' },
  { file: 'app/api/bible-verses/bulk-import/route.ts', importPath: '../../utils/db' },
  { file: 'app/api/admin/dashboard-stats/route.ts', importPath: '../../utils/db' },
  { file: 'app/api/admin/contact-messages/route.ts', importPath: '../../utils/db' },
  { file: 'app/api/contact/route.ts', importPath: '../utils/db' },
  { file: 'app/api/verse-of-the-day/route.ts', importPath: '../utils/db' },
  { file: 'app/api/send-daily-notification/route.ts', importPath: '../utils/db' },
  { file: 'app/api/text-colors/route.ts', importPath: '../utils/db' },
  { file: 'app/api/visitor-tracking/route.ts', importPath: '../utils/db' },
  { file: 'app/api/admin-text-colors/route.ts', importPath: '../utils/db' },
  { file: 'app/api/discussion-groups/route.ts', importPath: '../utils/db' },
  { file: 'app/api/discussion-groups/[id]/route.ts', importPath: '../../utils/db' },
  { file: 'app/api/discussion-groups/[id]/members/route.ts', importPath: '../../../utils/db' },
  { file: 'app/api/forum-posts/route.ts', importPath: '../utils/db' },
  { file: 'app/api/forum-posts/[id]/route.ts', importPath: '../../utils/db' },
  { file: 'app/api/forum-posts/[id]/replies/route.ts', importPath: '../../../utils/db' },
  { file: 'app/api/reading-plans/[id]/route.ts', importPath: '../../utils/db' },
  { file: 'app/api/verse-collections/[id]/verses/route.ts', importPath: '../../../utils/db' },
];

let success = 0, skipped = 0, errors = 0;

fixes.forEach(({ file, importPath }) => {
  const fullPath = path.join(__dirname, file);
  
  try {
    if (!fs.existsSync(fullPath)) {
      console.log(`⚠️  Not found: ${file}`);
      skipped++;
      return;
    }
    
    let content = fs.readFileSync(fullPath, 'utf8');
    
    if (content.includes('getDb')) {
      console.log(`✓ Already fixed: ${file}`);
      skipped++;
      return;
    }
    
    // Replace import
    content = content.replace(
      /import { neon } from '@neondatabase\/serverless';/g,
      `import { getDb } from '${importPath}';`
    );
    
    // Remove const sql line
    content = content.replace(/^const sql = neon\(process\.env\.DATABASE_URL!\);$/gm, '');
    
    // Remove edge runtime if present
    content = content.replace(/^export const runtime = 'edge';$/gm, '');
    
    // Add const sql = getDb(); after try { in each function
    // Match: export async function XXXX(...) {\n  try {\n
    content = content.replace(
      /(export async function \w+\([^)]*\)\s*\{\s*try\s*\{)/g,
      '$1\n    const sql = getDb();'
    );
    
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`✅ Fixed: ${file}`);
    success++;
    
  } catch (error) {
    console.error(`❌ Error: ${file} - ${error.message}`);
    errors++;
  }
});

console.log(`\n${'='.repeat(70)}`);
console.log(`✅ Fixed: ${success} | ⚠️ Skipped: ${skipped} | ❌ Errors: ${errors}`);
console.log(`${'='.repeat(70)}\n`);

if (success > 0) {
  console.log('All files updated! The build error should now be fixed.');
  console.log('You can now deploy to Vercel successfully.\n');
}
