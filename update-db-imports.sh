#!/bin/bash

# Script to update all API routes to use getDb() helper

files=(
  "app/api/bible-verses/bulk-import/route.ts"
  "app/api/auth/login/route.ts"
  "app/api/auth/signup/route.ts"
  "app/api/auth/user-login/route.ts"
  "app/api/auth/update-password/route.ts"
  "app/api/auth/forgot-password/route.ts"
  "app/api/auth/reset-password/route.ts"
  "app/api/auth/user-forgot-password/route.ts"
  "app/api/auth/user-reset-password/route.ts"
  "app/api/bible-content/route.ts"
  "app/api/introduction/route.ts"
  "app/api/reading-plans/[id]/route.ts"
  "app/api/verse-collections/[id]/verses/route.ts"
  "app/api/commentaries/route.ts"
  "app/api/admin/dashboard-stats/route.ts"
  "app/api/admin/contact-messages/route.ts"
  "app/api/contact/route.ts"
  "app/api/verse-of-the-day/route.ts"
  "app/api/send-daily-notification/route.ts"
  "app/api/text-colors/route.ts"
  "app/api/visitor-tracking/route.ts"
  "app/api/admin-text-colors/route.ts"
  "app/api/discussion-groups/route.ts"
  "app/api/discussion-groups/[id]/route.ts"
  "app/api/discussion-groups/[id]/members/route.ts"
  "app/api/forum-posts/route.ts"
  "app/api/forum-posts/[id]/route.ts"
  "app/api/forum-posts/[id]/replies/route.ts"
)

for file in "${files[@]}"; do
  filepath="/home/user/apps/web/$file"
  
  if [ -f "$filepath" ]; then
    echo "Updating $file..."
    
    # Count directory depth to determine import path
    depth=$(echo "$file" | grep -o "/" | wc -l)
    depth=$((depth - 1)) # Subtract 1 because we start from app/api
    
    # Build import path
    if [ $depth -eq 0 ]; then
      import_path="../utils/db"
    else
      import_path=""
      for ((i=0; i<depth; i++)); do
        import_path="../$import_path"
      done
      import_path="${import_path}utils/db"
    fi
    
    # Replace import statement
    sed -i "s|import { neon } from '@neondatabase/serverless';|import { getDb } from '$import_path';|g" "$filepath"
    
    # Remove the const sql = neon(...) line
    sed -i '/^const sql = neon(process\.env\.DATABASE_URL!);$/d' "$filepath"
    
    # Add const sql = getDb(); at the start of each exported function
    # This is a simple approach - add it right after "try {"
    sed -i 's/^\(  try {\)$/\1\n    const sql = getDb();/g' "$filepath"
    
    echo "✓ Updated $file"
  else
    echo "✗ File not found: $filepath"
  fi
done

echo ""
echo "Done! All files updated."
