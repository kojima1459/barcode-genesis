#!/usr/bin/env tsx
/**
 * i18n Guard: Detect English hard-coded strings in UI files
 * 
 * Scans client/src for English hard-coded strings in .tsx and .ts files
 * Exits with error code 1 if violations detected
 * 
 * Usage: npm run check:i18n
 */

import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

const CLIENT_SRC = join(process.cwd(), 'client', 'src');
const VIOLATIONS: Array<{ file: string; line: number; text: string }> = [];

// Patterns to detect
const ENGLISH_IN_JSX_TAG = />([A-Z][a-z]{3,}[^<]*)</g;  // Text between tags starting with capital letter

// Known safe patterns to exclude
const SAFE_PATTERNS = [
    /^(HP|XP|ATK|DEF|SPD|ID|CAPACITY|CREDITS|OK|NG|DNA|EAN|JAN)$/,  // Common abbreviations
    /^Lv\.\d+$/,  // Level indicators
    /^Select/,  // Select component placeholders (internal)
    /className=/,  // CSS class names
    /import\s+/,  // Import statements
    /\/\//,  // Comments
    /\/\*/,  // Block comments
    /type\s+/,  // Type definitions
    /interface\s+/,  // Interface definitions
    /export\s+/,  // Export statements
];

function isSafePattern(text: string): boolean {
    return SAFE_PATTERNS.some(pattern => pattern.test(text));
}

function scanFile(filePath: string) {
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    lines.forEach((line, index) => {
        // Skip if line is a comment
        if (line.trim().startsWith('//') || line.trim().startsWith('*')) {
            return;
        }

        // Skip className, import, type, interface lines
        if (line.includes('className') || line.includes('import ') || line.includes('type ') || line.includes('interface ')) {
            return;
        }

        // Check for English text between JSX tags
        const matches = line.matchAll(ENGLISH_IN_JSX_TAG);
        for (const match of matches) {
            const text = match[1].trim();

            // Skip if it's a safe pattern
            if (isSafePattern(text)) {
                continue;
            }

            // Skip if it contains only special characters or numbers
            if (!/[a-zA-Z]{4,}/.test(text)) {
                continue;
            }

            // Skip if it's inside a template string or translation call
            if (line.includes('t(') || line.includes('${') || line.includes('{t(')) {
                continue;
            }

            VIOLATIONS.push({
                file: filePath.replace(CLIENT_SRC, ''),
                line: index + 1,
                text: text.substring(0, 50) // Limit text length for readability
            });
        }
    });
}

function scanDirectory(dir: string, extensions: string[] = ['.tsx', '.ts']) {
    const items = readdirSync(dir);

    for (const item of items) {
        const fullPath = join(dir, item);
        const stat = statSync(fullPath);

        if (stat.isDirectory()) {
            // Skip node_modules, dist, build directories
            if (['node_modules', 'dist', 'build', '.git'].includes(item)) {
                continue;
            }
            scanDirectory(fullPath, extensions);
        } else {
            // Only scan .tsx and .ts files
            if (extensions.some(ext => item.endsWith(ext))) {
                scanFile(fullPath);
            }
        }
    }
}

console.log('🔍 Scanning for English hard-coded strings...\n');

// Scan pages and components directories
const targetsToScan = [
    join(CLIENT_SRC, 'pages'),
    join(CLIENT_SRC, 'components'),
];

targetsToScan.forEach(target => {
    if (statSync(target).isDirectory()) {
        scanDirectory(target);
    }
});

if (VIOLATIONS.length > 0) {
    console.error('❌ Found', VIOLATIONS.length, 'potential English hard-coded string(s):\n');

    VIOLATIONS.forEach(({ file, line, text }) => {
        console.error(`  ${file}:${line}`);
        console.error(`    → "${text}"`);
    });

    console.error('\n💡 Tip: Use t() from useLanguage hook instead of hard-coded strings');
    console.error('   Example: Replace "Hello World" with {t(\'greeting\')}}\n');

    process.exit(1);
} else {
    console.log('✅ No English hard-coded strings detected!');
    console.log('   All UI strings appear to be properly internationalized.\n');
    process.exit(0);
}
