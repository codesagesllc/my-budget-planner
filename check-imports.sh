#!/bin/bash
# Bash script for checking imports (can be run on Vercel or Linux)

echo "Checking for case-sensitive import issues..."

# Check if UI component files exist
echo "Checking UI component files:"
ls -la components/ui/*.tsx 2>/dev/null | grep -E "(button|input|card|label|select|tabs|alert)"

echo -e "\nSearching for potentially problematic imports:"

# Search for uppercase imports
grep -r "from.*ui/Button" --include="*.tsx" --include="*.ts" --exclude-dir=node_modules --exclude-dir=.next . 2>/dev/null
grep -r "from.*ui/Input" --include="*.tsx" --include="*.ts" --exclude-dir=node_modules --exclude-dir=.next . 2>/dev/null
grep -r "from.*ui/Card" --include="*.tsx" --include="*.ts" --exclude-dir=node_modules --exclude-dir=.next . 2>/dev/null
grep -r "from.*ui/Label" --include="*.tsx" --include="*.ts" --exclude-dir=node_modules --exclude-dir=.next . 2>/dev/null
grep -r "from.*ui/Select" --include="*.tsx" --include="*.ts" --exclude-dir=node_modules --exclude-dir=.next . 2>/dev/null
grep -r "from.*ui/Tabs" --include="*.tsx" --include="*.ts" --exclude-dir=node_modules --exclude-dir=.next . 2>/dev/null

echo -e "\nDone checking. If any imports were found above, they need to be fixed to lowercase."
