import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

/**
 * i18n Check Script
 * 
 * Scans client/src files for hardcoded English text that should use t() instead.
 * This prevents English text from appearing in the Japanese UI.
 * 
 * Usage: node scripts/check-i18n.js
 * Exit code: 0 if pass, 1 if violations found
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SRC_DIR = path.join(__dirname, '../client/src');
const SCAN_DIRS = ['pages', 'components'];

// Patterns to detect English text
const PATTERNS = [
  // JSX text nodes with English words (simple heuristic)
  {
    regex: />\s*([A-Z][a-z]{2,}(\s+[A-Z][a-z]{2,})+)\s*</g,
    description: 'JSX text node with English words'
  },
  // placeholder attribute with English
  {
    regex: /placeholder=["']([^"']*[A-Z][a-z]{2,}[^"']*)/g,
    description: 'placeholder attribute with English'
  },
  // aria-label attribute with English
  {
    regex: /aria-label=["']([^"']*[A-Z][a-z]{2,}[^"']*)/g,
    description: 'aria-label attribute with English'
  },
  // title attribute with English
  {
    regex: /title=["']([^"']*[A-Z][a-z]{2,}[^"']*)/g,
    description: 'title attribute with English'
  },
  // alt attribute with English
  {
    regex: /alt=["']([^"']*[A-Z][a-z]{2,}[^"']*)/g,
    description: 'alt attribute with English'
  },
  // toast calls with English strings
  {
    regex: /toast\.(success|error|message|info|warning)\s*\(["']([^"']*[A-Z][a-z]{2,}[^"']*)/g,
    description: 'toast call with English string'
  }
];

// Exceptions - these are allowed
const EXCEPTIONS = [
  /^\s*(import|export|interface|type|class|function|const|let|var)\s/,  // Code keywords
  /^\/\//,  // Comments
  /\/\*/,   // Multi-line comments
  /@param|@returns|@description/,  // JSDoc
  /HP|ATK|DEF|SPD|XP|LV/,  // Stat abbreviations (OK as game terminology)
  /Loading\.\.\./,  // Loading text (static)
  /LOADING\.\.\./,  // Loading text (uppercase variant)
  /LOCKED/,  // Lock status
  /UNLOCKED/,  // Unlock status
  /CAPACITY/,  // Capacity label
  /CREDITS/,  // Credits label
  /OK|Cancel|Close/,  // Very short UI words (often OK)
  /Lv\./,  // Level prefix
  /ID:/,  // ID label
  /Back to|Back/,  // Back navigation text (often short)
];

function isException(line) {
  return EXCEPTIONS.some(pattern => pattern.test(line));
}

function scanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const violations = [];

  lines.forEach((line, index) => {
    // Skip if line is an exception
    if (isException(line)) {
      return;
    }

    PATTERNS.forEach(({ regex, description }) => {
      const matches = line.match(regex);
      if (matches) {
        violations.push({
          file: filePath,
          line: index + 1,
          content: line.trim(),
          description
        });
      }
    });
  });

  return violations;
}

function scanDirectory(dirPath) {
  let allViolations = [];

  function walk(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        // Skip node_modules and hidden directories
        if (entry.name === 'node_modules' || entry.name.startsWith('.')) {
          continue;
        }
        walk(fullPath);
      } else if (entry.isFile()) {
        // Only check .tsx, .ts, .jsx, .js files
        if (/\.(tsx?|jsx?)$/.test(entry.name)) {
          const violations = scanFile(fullPath);
          allViolations = allViolations.concat(violations);
        }
      }
    }
  }

  walk(dirPath);
  return allViolations;
}

// Main execution
console.log('🔍 Checking for hardcoded English text in UI...\n');

let allViolations = [];

for (const dir of SCAN_DIRS) {
  const dirPath = path.join(SRC_DIR, dir);
  if (fs.existsSync(dirPath)) {
    console.log(`Scanning ${dir}/...`);
    const violations = scanDirectory(dirPath);
    allViolations = allViolations.concat(violations);
  }
}

if (allViolations.length === 0) {
  console.log('\n✅ No hardcoded English text found! i18n check passed.\n');
  process.exit(0);
} else {
  console.log(`\n❌ Found ${allViolations.length} violation(s):\n`);
  
  allViolations.forEach((v, i) => {
    const relativePath = path.relative(process.cwd(), v.file);
    console.log(`${i + 1}. ${relativePath}:${v.line}`);
    console.log(`   ${v.description}`);
    console.log(`   ${v.content}\n`);
  });
  
  console.log('Please replace hardcoded English text with t(key) calls.\n');
  process.exit(1);
}
