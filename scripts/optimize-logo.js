/**
 * This script helps optimize and move the Trendiingz logo 
 * for social media sharing.
 * 
 * Usage:
 * 1. Save your logo file as "Trendiingz-logo.jpg" in the project root
 * 2. Run: node scripts/optimize-logo.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Paths
const sourcePath = path.join(__dirname, '..', 'Trendiingz-logo.jpg');
const destDir = path.join(__dirname, '..', 'public', 'images');
const destPath = path.join(destDir, 'Trendiingz-logo.jpg');

// Ensure the destination directory exists
if (!fs.existsSync(destDir)) {
  console.log('Creating images directory...');
  fs.mkdirSync(destDir, { recursive: true });
}

// Check if source file exists
if (fs.existsSync(sourcePath)) {
  console.log('Found logo file. Copying to public/images directory...');
  
  // Copy the file
  fs.copyFileSync(sourcePath, destPath);
  console.log('Logo copied successfully to public/images/Trendiingz-logo.jpg');
  
  // Print recommended image dimensions for social media
  console.log('\nRecommended social media image dimensions:');
  console.log('- Facebook/Open Graph: 1200×630 pixels');
  console.log('- Twitter: 1200×600 pixels');
  console.log('- LinkedIn: 1104×736 pixels');
  
  // Print validation info
  console.log('\nTo validate your social media tags, use these tools:');
  console.log('- Facebook: https://developers.facebook.com/tools/debug/');
  console.log('- Twitter: https://cards-dev.twitter.com/validator');
  console.log('- LinkedIn: https://www.linkedin.com/post-inspector/inspect/');
} else {
  console.error('Error: Could not find Trendiingz-logo.jpg in the project root.');
  console.log('Please save your logo file as "Trendiingz-logo.jpg" in the project root and try again.');
} 