#!/bin/bash

# Script to update footer sections in remaining pages
# This updates copyright year from 2023 to 2026 and changes developer credit

FILES=(
  "/home/user/apps/web/app/bible-reader/page.tsx"
  "/home/user/apps/web/app/login/page.tsx"
  "/home/user/apps/web/app/signup/page.tsx"
  "/home/user/apps/web/app/admin-panel/page.tsx"
)

for file in "${FILES[@]}"; do
  echo "Updating: $file"
  
  # Update copyright year and add hyperlink
  sed -i 's/&copy; 2023 Pneuma Freedom Experience Ministry\. All rights reserved\./\&copy; 2026 <a href="https:\/\/freedomexperienceministry.org" target="_blank" rel="noopener noreferrer" className="hover:text-gold-500 transition-colors underline">Pneuma Freedom Experience Ministry<\/a>. All rights reserved./g' "$file"
  
  # Update developer credit
  sed -i 's/<p>Developed by <span className="text-stone-400">Pastor Denis Matovu<\/span><\/p>/<p>Developed by <a href="https:\/\/ionhostingdigitalservices.com" target="_blank" rel="noopener noreferrer" className="text-stone-400 hover:text-gold-500 transition-colors underline">Ion Hosting Digital Services<\/a><\/p>/g' "$file"
  
  echo "✓ Done"
done

echo ""
echo "All footers updated successfully!"
