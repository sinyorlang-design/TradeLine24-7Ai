import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

let errors = [];

// Read brand manifest
const manifestPath = path.join(rootDir, 'public', 'brand.canon.json');
if (!fs.existsSync(manifestPath)) {
  errors.push(`Missing manifest: ${manifestPath}`);
} else {
  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    // Verify manifest contains required lines (just checking it exists and is valid)
    if (!manifest.lines || !Array.isArray(manifest.lines) || manifest.lines.length !== 3) {
      errors.push('Manifest must contain exactly 3 brand lines');
    }
  } catch (e) {
    errors.push(`Invalid manifest JSON: ${e.message}`);
  }
}

// Check canonical files exist
const canonicalFiles = [
  'public/assets/brand/OFFICIAL_LOGO.svg',
  'public/assets/brand/BACKGROUND_IMAGE1.svg',
  'public/assets/brand/BACKGROUND_IMAGE2.svg',
  'public/assets/brand/BACKGROUND_IMAGE3.svg',
  'public/assets/brand/BACKGROUND_IMAGE4.svg',
  'public/assets/brand/BACKGROUND_IMAGE5.svg',
  'public/assets/brand/BACKGROUND_IMAGE6.svg',
  'public/assets/fonts/BrandFont.woff2',
  'public/assets/fonts/brandfont.css'
];

canonicalFiles.forEach(file => {
  const filePath = path.join(rootDir, file);
  if (!fs.existsSync(filePath)) {
    errors.push(`Missing canonical file: ${file}`);
  }
});

// Scan src/** and public/** for violations
function scanDirectory(dir, basePath = '') {
  const items = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const item of items) {
    const itemPath = path.join(dir, item.name);
    const relativePath = path.join(basePath, item.name);
    
    // Skip directories we should not scan
    if (item.isDirectory()) {
      const skipDirs = ['node_modules', 'dist', 'build', '.next', '.output', '.vercel'];
      if (!skipDirs.includes(item.name)) {
        scanDirectory(itemPath, relativePath);
      }
    } else if (item.isFile()) {
      const exts = ['.html', '.htm', '.css', '.scss', '.js', '.jsx', '.ts', '.tsx', '.md', '.mdx'];
      const ext = path.extname(item.name);
      
      if (exts.includes(ext)) {
        const content = fs.readFileSync(itemPath, 'utf-8');
        
        // Check for /public/assets/
        if (content.includes('/public/assets/')) {
          errors.push(`Found "/public/assets/" in: ${relativePath}`);
        }
        
        // Check for banned words/phrases in visible files only
        const visibleExts = ['.html', '.htm', '.jsx', '.tsx', '.md', '.mdx'];
        if (visibleExts.includes(ext)) {
          // Check for "trades" (whole word, case insensitive)
          if (/\btrades\b/i.test(content)) {
            errors.push(`Found banned word "trades" in: ${relativePath}`);
          }
          
          // Check for "Always On" or "Always On-Brand"
          if (/always\s+on(?:-brand)?/i.test(content)) {
            errors.push(`Found banned phrase "Always On" in: ${relativePath}`);
          }
        }
      }
    }
  }
}

// Only scan src and public directories
const srcDir = path.join(rootDir, 'src');
const publicDir = path.join(rootDir, 'public');

if (fs.existsSync(srcDir)) {
  scanDirectory(srcDir, 'src');
}

if (fs.existsSync(publicDir)) {
  scanDirectory(publicDir, 'public');
}

// Report results
if (errors.length > 0) {
  console.log('[verify-canon] FAIL');
  errors.forEach(err => console.log(`  - ${err}`));
  process.exit(1);
} else {
  console.log('[verify-canon] OK');
  process.exit(0);
}