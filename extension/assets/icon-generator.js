/**
 * Icon Generator for ReadLater Pro
 * Generates PNG icons from SVG for the extension
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// SVG icon content
const svgIcon = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
  <defs>
    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#4a6ee0" />
      <stop offset="100%" stop-color="#3a5ecc" />
    </linearGradient>
  </defs>
  <rect x="16" y="16" width="96" height="96" rx="16" fill="url(#gradient)" />
  <path d="M40 40 L88 40 L88 48 L40 48 Z" fill="white" />
  <path d="M40 56 L72 56 L72 64 L40 64 Z" fill="white" />
  <path d="M40 72 L80 72 L80 80 L40 80 Z" fill="white" />
  <path d="M40 88 L64 88 L64 96 L40 96 Z" fill="white" />
  <circle cx="96" cy="96" r="16" fill="white" />
  <path d="M96 88 L96 104 M88 96 L104 96" stroke="#4a6ee0" stroke-width="4" />
</svg>
`;

// Save SVG file
fs.writeFileSync(path.join(__dirname, 'icon.svg'), svgIcon);

// Generate PNG icons in different sizes
const sizes = [16, 48, 128];

async function generateIcons() {
  for (const size of sizes) {
    await sharp(Buffer.from(svgIcon))
      .resize(size, size)
      .png()
      .toFile(path.join(__dirname, `icon${size}.png`));
    
    console.log(`Generated icon${size}.png`);
  }
}

// Generate empty list icon for the reading list page
const emptyListSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240">
  <defs>
    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#4a6ee0" />
      <stop offset="100%" stop-color="#3a5ecc" />
    </linearGradient>
  </defs>
  <rect x="40" y="40" width="160" height="160" rx="8" fill="#f5f7ff" stroke="#e0e0e0" stroke-width="2" />
  <rect x="60" y="60" width="120" height="16" rx="4" fill="#e0e0e0" />
  <rect x="60" y="90" width="80" height="12" rx="4" fill="#e0e0e0" />
  <rect x="60" y="120" width="100" height="12" rx="4" fill="#e0e0e0" />
  <rect x="60" y="150" width="60" height="12" rx="4" fill="#e0e0e0" />
  <circle cx="180" cy="180" r="30" fill="url(#gradient)" />
  <path d="M180 165 L180 195 M165 180 L195 180" stroke="white" stroke-width="6" />
</svg>
`;

// Save empty list SVG file
fs.writeFileSync(path.join(__dirname, 'empty-list.svg'), emptyListSvg);

// Generate default avatar icon
const defaultAvatarSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
  <circle cx="64" cy="64" r="64" fill="#e0e0e0" />
  <circle cx="64" cy="48" r="24" fill="#bdbdbd" />
  <path d="M64 80 C42 80 24 98 24 120 L104 120 C104 98 86 80 64 80 Z" fill="#bdbdbd" />
</svg>
`;

// Save default avatar SVG file
fs.writeFileSync(path.join(__dirname, 'default-avatar.svg'), defaultAvatarSvg);

// Generate PNG for default avatar
sharp(Buffer.from(defaultAvatarSvg))
  .resize(128, 128)
  .png()
  .toFile(path.join(__dirname, 'default-avatar.png'))
  .then(() => console.log('Generated default-avatar.png'));

// Run the icon generation
generateIcons().catch(console.error);
