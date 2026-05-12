#!/usr/bin/env node

/**
 * FINAL FIX SCRIPT - Updates all remaining API routes to use getDb() helper
 * This fixes the Vercel build error: "No database connection string was provided to `neon()`"
 * 
 * Run this script once with: node FINAL_FIX.js
 */

const fs = require('fs');
const path = require('path');

const fixes = {
  'app/api/auth/forgot-password/route.ts': '../../utils/db',
  'app/api/auth/reset-password/route.ts': '../../utils/db',
  'app/api/auth/user-forgot-password/route.ts': '../../utils/db',
  'app/api/auth/user-reset-password/route.ts': '../../utils/db',
  'app/api/bible-verses/bulk-import/route.ts': '../../utils/db',
  'app/api/reading-plans/[id]/route.ts': '../../utils/db',
  'app/api/verse-collections/[id]/verses/route.ts': '../../../utils/db',
  'app/api/admin/dashboard-stats/route.ts': '../../utils/db',
  'app/api/admin/contact-messages/route.ts': '../../utils/db',
  'app/api/verse-of-the-day/route.ts': '../utils/db',
  'app/api/send-daily-notification/route.ts': '../utils/db',
  'app/api/text-colors/route.ts': '../utils/db',
  'app/api/visitor-tracking/route.ts': '../utils/db',
  'app/api/admin-text-colors/route.ts': '../utils/db',
  'app/api/discussion-groups/route.ts': '../utils/db',
  'app/api/discussion-groups/[id]/route.ts': '../../utils/db',
  'app/api/discussion-groups/[id]/members/route.ts': '../../../utils/db',
  'app/api/forum-posts/route.ts': '../utils/db',
  'app/api/forum-posts/[id]/route.ts': '../../utils/db',
  'app/api/forum-posts/[id]/replies/route.ts': '../../../utils/db',
};

let fixed = 0, skipped = 0, errors = 0;

console.log('🔧 Fixing remaining API route files...\n');

Object.entries(fixes).forEach(([file, importPath]) => {
  const fullPath = path.join(__dirname, file);
  
  try {
    if (!fs.existsSync(fullPath)) {
      console.log(`⚠️  ${file} - not found`);
      skipped++;
      return;
    }
    
    let content = fs.readFileSync(fullPath, 'utf8');
    
    if (content.includes('getDb')) {
      console.log(`✓ ${file} - already fixed`);
      skipped++;
      return;
    }
    
    // Fix 1: Replace import statement
    content = content.replace(
      /import { neon } from '@neondatabase\/serverless';/g,
      `import { getDb } from '${importPath}';`
    );
    
    // Fix 2: Remove const sql = neon(...) line
    content = content.replace(/^const sql = neon\(process\.env\.DATABASE_URL!\);$/gm, '');
    
    // Fix 3: Remove edge runtime (incompatible with Neon)
    content = content.replace(/^export const runtime = 'edge';$/gm, '');
    
    // Fix 4: Add const sql = getDb(); after each "try {"
    content = content.replace(
      /(export async function \w+\([^)]*\)\s*\{\s*try\s*\{)(\n\s*const sql = getDb\(\);)?/g,
      (match, p1) => {
        if (match.includes('getDb()')) return match;
        return `${p1}\n    const sql = getDb();`;
      }
    );
    
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`✅ ${file} - FIXED`);
    fixed++;
    
  } catch (error) {
    console.error(`❌ ${file} - ERROR: ${error.message}`);
    errors++;
  }
});

console.log(`\n${'='.repeat(70)}`);
console.log(`Results: ✅ ${fixed} fixed | ✓ ${skipped} skipped | ❌ ${errors} errors`);
console.log(`${'='.repeat(70)}\n`);

if (fixed > 0) {
  console.log('🎉 Success! All files have been updated.');
  console.log('📦 Your Vercel deployment should now build successfully!\n');
}
