const fs = require('fs');
const path = require('path');

// Simple SVG-based icon generator
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

const generateSVG = (size) => {
  const margin = size / 6;
  const bookLeft = margin;
  const bookRight = size - margin;
  const bookTop = margin;
  const bookBottom = size - margin;
  const spineWidth = size / 15;
  const crossWidth = size / 20;
  const crossHeight = size / 8;
  const centerX = (bookLeft + bookRight) / 2 + spineWidth / 2;
  const centerY = (bookTop + bookBottom) / 2;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <!-- Background -->
  <rect width="${size}" height="${size}" fill="#1e40af"/>
  
  <!-- Book cover -->
  <rect x="${bookLeft}" y="${bookTop}" width="${bookRight - bookLeft}" height="${bookBottom - bookTop}" fill="#ffffff"/>
  
  <!-- Book spine -->
  <rect x="${bookLeft}" y="${bookTop}" width="${spineWidth}" height="${bookBottom - bookTop}" fill="#e5e7eb"/>
  
  <!-- Cross vertical -->
  <rect x="${centerX - crossWidth/2}" y="${centerY - crossHeight}" width="${crossWidth}" height="${crossHeight * 2}" fill="#1e40af"/>
  
  <!-- Cross horizontal -->
  <rect x="${centerX - crossHeight/2}" y="${centerY - crossWidth/2}" width="${crossHeight}" height="${crossWidth}" fill="#1e40af"/>
</svg>`;
};

// Create public directory if it doesn't exist
const publicDir = path.join(process.cwd(), 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Generate SVG files
sizes.forEach(size => {
  const svg = generateSVG(size);
  const filename = `icon-${size}x${size}.svg`;
  fs.writeFileSync(path.join(publicDir, filename), svg);
  console.log(`✓ Created ${filename}`);
});

// Generate maskable SVG
const maskableSVG = generateSVG(512);
fs.writeFileSync(path.join(publicDir, 'icon-512x512-maskable.svg'), maskableSVG);
console.log('✓ Created icon-512x512-maskable.svg');

// Create placeholder screenshots
const screenshot1SVG = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="540" height="720" xmlns="http://www.w3.org/2000/svg">
  <rect width="540" height="720" fill="#f3f4f6"/>
  <rect width="540" height="80" fill="#1e40af"/>
  <text x="20" y="50" font-family="Arial" font-size="24" fill="#ffffff">Pray-Read Bible</text>
  <rect x="20" y="100" width="500" height="100" fill="#ffffff" rx="8"/>
  <text x="40" y="135" font-family="Arial" font-size="18" fill="#1e40af" font-weight="bold">Genesis 1</text>
  <text x="40" y="165" font-family="Arial" font-size="14" fill="#4b5563">In the beginning God created...</text>
</svg>`;

const screenshot2SVG = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1280" height="720" xmlns="http://www.w3.org/2000/svg">
  <rect width="1280" height="720" fill="#f3f4f6"/>
  <rect width="1280" height="80" fill="#1e40af"/>
  <text x="40" y="50" font-family="Arial" font-size="24" fill="#ffffff">Pray-Read Bible</text>
  <rect y="80" width="300" height="640" fill="#ffffff"/>
  <text x="20" y="120" font-family="Arial" font-size="16" fill="#1e40af" font-weight="bold">Old Testament</text>
  <rect x="320" y="100" width="940" height="600" fill="#ffffff" rx="8"/>
  <text x="340" y="135" font-family="Arial" font-size="20" fill="#1e40af" font-weight="bold">Genesis 1</text>
  <text x="340" y="175" font-family="Arial" font-size="16" fill="#4b5563">In the beginning God created the heavens and the earth...</text>
</svg>`;

fs.writeFileSync(path.join(publicDir, 'screenshot1.svg'), screenshot1SVG);
fs.writeFileSync(path.join(publicDir, 'screenshot2.svg'), screenshot2SVG);
console.log('✓ Created screenshot1.svg');
console.log('✓ Created screenshot2.svg');

console.log('\n✅ All PWA assets generated successfully!');
console.log('\nNote: SVG icons are being used. For PNG icons, you can convert these using an image tool or online converter.');
