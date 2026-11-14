const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

console.log('--- Starting Arc Marumo Production Build ---');

const SRC_DIR = path.join(__dirname, 'www.arcmarumo.com');
const DIST_DIR = path.join(__dirname, 'dist');
const SANITY_DIR = path.join(__dirname, 'cdn.sanity.io');

// Clean dist directory
if (fs.existsSync(DIST_DIR)) {
    fs.rmSync(DIST_DIR, { recursive: true, force: true });
}
fs.mkdirSync(DIST_DIR, { recursive: true });

function copyRecursive(src, dest) {
    if (!fs.existsSync(src)) return;
    const stat = fs.statSync(src);
    if (stat.isDirectory()) {
        fs.mkdirSync(dest, { recursive: true });
        for (const item of fs.readdirSync(src)) {
            copyRecursive(path.join(src, item), path.join(dest, item));
        }
    } else {
        fs.copyFileSync(src, dest);
    }
}

// 1. Copy public website assets
console.log('📦 Copying website static assets to dist/...');
copyRecursive(SRC_DIR, DIST_DIR);

// 2. Ensure cdn.sanity.io assets are present inside dist
if (fs.existsSync(SANITY_DIR)) {
    console.log('📦 Bundling Sanity CDN images into dist/cdn.sanity.io...');
    copyRecursive(SANITY_DIR, path.join(DIST_DIR, 'cdn.sanity.io'));
}

// 3. Verify JavaScript syntax in dist
console.log('🔍 Verifying JavaScript syntax across all chunks...');
function checkJsFiles(dir) {
    for (const item of fs.readdirSync(dir)) {
        const full = path.join(dir, item);
        const stat = fs.statSync(full);
        if (stat.isDirectory()) {
            checkJsFiles(full);
        } else if (item.endsWith('.js')) {
            try {
                execFileSync('node', ['--check', full], { stdio: 'pipe' });
            } catch (err) {
                console.error(`❌ Syntax error in ${item}: ${err.message}`);
                process.exit(1);
            }
        }
    }
}
checkJsFiles(DIST_DIR);
console.log('   ✓ All JavaScript chunks passed syntax validation (0 syntax errors)');

// 4. Verify critical assets
const criticalFiles = [
    'index.html',
    'favicon.ico',
    'icon1.png',
    'apple-icon.png',
    'icon.svg',
    'brand/arc-logo.svg',
    'brand/arc-bands.svg',
    'brand/tv-glass-1280.webp',
    'brand/tv-glass-960.webp',
    'brand/tv-glass.webp',
    'media/remyshoots.jpg',
    'media/depthfirst.jpg',
    'media/makereign-academy.jpg',
    'media/refresh.jpg',
    'media/scza.jpg',
    'media/rumor.jpg',
    'media/pollen.jpg',
    '_next/static/immutable/chunks/24l721ux8dkx7.css',
    '_next/static/immutable/chunks/turbopack-1ye7vcwou_5h8.js'
];

let missingCount = 0;
for (const file of criticalFiles) {
    const fullPath = path.join(DIST_DIR, file);
    if (!fs.existsSync(fullPath)) {
        console.error(`❌ Missing critical file: ${file}`);
        missingCount++;
    }
}

if (missingCount > 0) {
    console.error(`Build failed: ${missingCount} critical files missing.`);
    process.exit(1);
}

// 5. Verify React Flight streams in dist
console.log('🔍 Validating React Server Component streams & hydration payloads...');
const { testFlightParse } = require('./flight_validator.js');
const rscFiles = [
    'index-06546ca0c1ce.html',
    'profile.rsc',
    'profile-f8b924a426a7c8.html',
    'profile.html',
    'news-watch.rsc',
    'news-watch.html',
    'work/remyshoots.rsc',
    'work/remyshoots-a2819416e8e118.html',
    'work/remyshoots.html',
    'work/depthfirst.rsc',
    'work/depthfirst.html',
    'work/makereign-academy.rsc',
    'work/makereign-academy.html',
    'work/refresh.rsc',
    'work/refresh.html',
    'work/scza.rsc',
    'work/scza.html',
    'work/rumor.rsc',
    'work/rumor.html',
    'work/pollen.rsc',
    'work/pollen.html'
];
for (const rf of rscFiles) {
    const full = path.join(DIST_DIR, rf);
    testFlightParse(rf, fs.readFileSync(full));
}
console.log('   ✓ All 21 RSC & prefetch streams validated cleanly');

// Count total files in dist
let totalFiles = 0;
let totalSize = 0;
function countFiles(dir) {
    for (const item of fs.readdirSync(dir)) {
        const full = path.join(dir, item);
        const stat = fs.statSync(full);
        if (stat.isDirectory()) {
            countFiles(full);
        } else {
            totalFiles++;
            totalSize += stat.size;
        }
    }
}
countFiles(DIST_DIR);

console.log(`✅ Build successful!`);
console.log(`   Total assets: ${totalFiles} files`);
console.log(`   Total build size: ${(totalSize / (1024 * 1024)).toFixed(2)} MB`);
console.log(`   Output directory: ${DIST_DIR}`);
