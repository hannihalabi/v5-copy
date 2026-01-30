#!/bin/bash

# Image Optimization Script for Creating Homes
# Converts JPG/JPEG/PNG images to WebP format with quality optimization

set -e

echo "🖼️  Creating Homes - Image Optimization Script"
echo "=============================================="
echo ""

# Configuration
QUALITY=85
MAX_WIDTH=1920
MAX_HEIGHT=1080

# Directories to process
DIRS=("pics/gdrive" "pics/extrapics" "pics/Portratis")

# Function to optimize and convert image
optimize_image() {
    local input_file="$1"
    local output_file="${input_file%.*}.webp"
    
    # Skip if WebP already exists and is newer
    if [ -f "$output_file" ] && [ "$output_file" -nt "$input_file" ]; then
        echo "⏭️  Skipping (already optimized): $input_file"
        return
    fi
    
    # Get original file size
    local original_size=$(du -h "$input_file" | cut -f1)
    
    echo "🔄 Converting: $input_file ($original_size)"
    
    # Convert to WebP with quality setting and resize if needed
    cwebp -q $QUALITY -resize $MAX_WIDTH 0 "$input_file" -o "$output_file" 2>/dev/null
    
    # Get new file size
    local new_size=$(du -h "$output_file" | cut -f1)
    
    echo "✅ Created: $output_file ($new_size)"
    echo ""
}

# Process each directory
for dir in "${DIRS[@]}"; do
    if [ ! -d "$dir" ]; then
        echo "⚠️  Directory not found: $dir"
        continue
    fi
    
    echo "📁 Processing directory: $dir"
    echo "-------------------------------------------"
    
    # Find and process all images
    find "$dir" -maxdepth 1 -type f \( -iname "*.jpg" -o -iname "*.jpeg" -o -iname "*.png" \) | while read -r file; do
        optimize_image "$file"
    done
    
    echo ""
done

echo "=============================================="
echo "✨ Image optimization complete!"
echo ""
echo "📊 Summary:"
for dir in "${DIRS[@]}"; do
    if [ -d "$dir" ]; then
        original=$(find "$dir" -maxdepth 1 -type f \( -iname "*.jpg" -o -iname "*.jpeg" -o -iname "*.png" \) | wc -l | tr -d ' ')
        webp=$(find "$dir" -maxdepth 1 -type f -iname "*.webp" | wc -l | tr -d ' ')
        echo "  $dir: $webp WebP files created from $original originals"
    fi
done
echo ""
echo "💡 Next steps:"
echo "  1. Update HTML to use WebP images with fallbacks"
echo "  2. Test in browser"
echo "  3. Consider removing original files after verification"
