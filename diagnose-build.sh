#!/bin/bash

echo "Cleaning build cache..."
rm -rf .next
rm -rf node_modules/.cache

echo "Checking UI component exports..."
for file in components/ui/*.tsx; do
  if [ -f "$file" ]; then
    filename=$(basename "$file")
    echo "Checking $filename..."
    grep -E "export (const|function|class) \w+" "$file" | head -1
  fi
done

echo ""
echo "Testing module resolution..."
node -e "
const path = require('path');
const fs = require('fs');

const uiPath = path.join(process.cwd(), 'components/ui');
const indexPath = path.join(uiPath, 'index.ts');

console.log('UI directory:', uiPath);
console.log('Index file exists:', fs.existsSync(indexPath));

const files = fs.readdirSync(uiPath);
console.log('Files in UI directory:', files);
"

echo ""
echo "Running build..."
npm run build
