#!/bin/bash
# Fix all UI component imports to use the index file

echo "Fixing UI component imports in debt components..."

# Find all TypeScript/TSX files in the debt directory
for file in components/debt/*.tsx; do
    if [ -f "$file" ]; then
        echo "Processing: $(basename "$file")"
        
        # Create a temporary file
        temp_file="${file}.tmp"
        
        # Replace individual UI component imports with index imports
        sed -e "s|from '@/components/ui/button'|from '@/components/ui'|g" \
            -e "s|from '@/components/ui/input'|from '@/components/ui'|g" \
            -e "s|from '@/components/ui/select'|from '@/components/ui'|g" \
            -e "s|from '@/components/ui/label'|from '@/components/ui'|g" \
            -e "s|from '@/components/ui/card'|from '@/components/ui'|g" \
            "$file" > "$temp_file"
        
        # Move temp file back
        mv "$temp_file" "$file"
        
        echo "  ✓ Fixed imports in $(basename "$file")"
    fi
done

echo ""
echo "Import fixes complete!"
echo "Now running build to verify..."

# Run build
npm run build
