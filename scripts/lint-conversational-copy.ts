#!/usr/bin/env ts-node

/**
 * Conversational Copy Linter
 * 
 * Ensures only INTRO_COPY is allowed as static string.
 * All other learner-facing copy must be generated or parameterized.
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';

interface LintResult {
  file: string;
  line: number;
  error: string;
  severity: 'error' | 'warning';
}

interface LintOptions {
  whitelist: string[];
  maxStringLength: number;
  excludePatterns: string[];
}

const DEFAULT_OPTIONS: LintOptions = {
  whitelist: ['INTRO_COPY'],
  maxStringLength: 50,
  excludePatterns: [
    'node_modules',
    '.git',
    'dist',
    'build',
    '.next',
    'coverage',
    '*.test.ts',
    '*.test.tsx',
    '*.spec.ts',
    '*.spec.tsx',
    '*.d.ts'
  ]
};

class ConversationalCopyLinter {
  private options: LintOptions;
  private results: LintResult[] = [];

  constructor(options: Partial<LintOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  lintDirectory(dir: string): LintResult[] {
    this.results = [];
    this.lintDirectoryRecursive(dir);
    return this.results;
  }

  private lintDirectoryRecursive(dir: string): void {
    try {
      const entries = readdirSync(dir);
      
      for (const entry of entries) {
        const fullPath = join(dir, entry);
        const stat = statSync(fullPath);
        
        if (stat.isDirectory()) {
          if (!this.shouldExcludeDirectory(entry)) {
            this.lintDirectoryRecursive(fullPath);
          }
        } else if (stat.isFile()) {
          if (this.shouldLintFile(fullPath)) {
            this.lintFile(fullPath);
          }
        }
      }
    } catch (error) {
      console.error(`Error reading directory ${dir}:`, error);
    }
  }

  private shouldExcludeDirectory(dirname: string): boolean {
    return this.options.excludePatterns.some(pattern => {
      if (pattern.includes('*')) {
        const regex = new RegExp(pattern.replace(/\*/g, '.*'));
        return regex.test(dirname);
      }
      return dirname === pattern;
    });
  }

  private shouldLintFile(filepath: string): boolean {
    const ext = extname(filepath);
    const filename = filepath.split('/').pop() || '';
    
    // Only lint TypeScript/JavaScript files
    if (!['.ts', '.tsx', '.js', '.jsx'].includes(ext)) {
      return false;
    }
    
    // Exclude test files
    if (this.options.excludePatterns.some(pattern => {
      if (pattern.includes('*')) {
        const regex = new RegExp(pattern.replace(/\*/g, '.*'));
        return regex.test(filename);
      }
      return filename === pattern;
    })) {
      return false;
    }
    
    return true;
  }

  private lintFile(filepath: string): void {
    try {
      const content = readFileSync(filepath, 'utf-8');
      const lines = content.split('\n');
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lineNumber = i + 1;
        
        this.lintLine(filepath, line, lineNumber);
      }
    } catch (error) {
      console.error(`Error reading file ${filepath}:`, error);
    }
  }

  private lintLine(filepath: string, line: string, lineNumber: number): void {
    // Skip empty lines and comments
    if (!line.trim() || line.trim().startsWith('//') || line.trim().startsWith('/*')) {
      return;
    }
    
    // Find string literals
    const stringMatches = this.findStringLiterals(line);
    
    for (const match of stringMatches) {
      if (match.length > this.options.maxStringLength) {
        // Check if it's whitelisted
        if (!this.isWhitelisted(match, filepath, lineNumber)) {
          this.results.push({
            file: filepath,
            line: lineNumber,
            error: `Large static string found: "${match.substring(0, 50)}..." (${match.length} chars). Use dynamic microcopy generator instead.`,
            severity: 'error'
          });
        }
      }
    }
  }

  private findStringLiterals(line: string): string[] {
    const strings: string[] = [];
    
    // Find double-quoted strings
    const doubleQuoted = line.match(/"([^"\\]|\\.)*"/g);
    if (doubleQuoted) {
      strings.push(...doubleQuoted.map(s => s.slice(1, -1)));
    }
    
    // Find single-quoted strings
    const singleQuoted = line.match(/'([^'\\]|\\.)*'/g);
    if (singleQuoted) {
      strings.push(...singleQuoted.map(s => s.slice(1, -1)));
    }
    
    // Find template literals (but exclude dynamic ones)
    const templateLiterals = line.match(/`([^`\\]|\\.)*`/g);
    if (templateLiterals) {
      templateLiterals.forEach(template => {
        const content = template.slice(1, -1);
        // Only flag static template literals (no ${} expressions)
        if (!content.includes('${') && content.length > this.options.maxStringLength) {
          strings.push(content);
        }
      });
    }
    
    return strings;
  }

  private isWhitelisted(string: string, filepath: string, lineNumber: number): boolean {
    // Check if it's a reference to INTRO_COPY
    if (string === 'Learn anything. Remember everything.') {
      return true;
    }
    
    // Check if it's in a copy.ts file (centralized copy)
    if (filepath.includes('copy.ts') || filepath.includes('copy.tsx')) {
      return true;
    }
    
    // Check if it's a test string
    if (string.includes('test') || string.includes('Test')) {
      return true;
    }
    
    // Check if it's an error message or technical string
    if (string.includes('error') || string.includes('Error') || 
        string.includes('http') || string.includes('api') ||
        string.includes('localhost') || string.includes('localhost')) {
      return true;
    }
    
    return false;
  }
}

// CLI interface
function main() {
  const args = process.argv.slice(2);
  const directory = args[0] || './web';
  
  console.log(`🔍 Linting conversational copy in ${directory}...`);
  
  const linter = new ConversationalCopyLinter();
  const results = linter.lintDirectory(directory);
  
  if (results.length === 0) {
    console.log('✅ No conversational copy violations found!');
    process.exit(0);
  }
  
  console.log(`❌ Found ${results.length} conversational copy violations:`);
  console.log();
  
  for (const result of results) {
    console.log(`${result.severity.toUpperCase()}: ${result.file}:${result.line}`);
    console.log(`  ${result.error}`);
    console.log();
  }
  
  const errorCount = results.filter(r => r.severity === 'error').length;
  if (errorCount > 0) {
    console.log(`❌ ${errorCount} errors found. Please fix before merging.`);
    process.exit(1);
  } else {
    console.log('⚠️  Warnings found but no errors. Proceeding...');
    process.exit(0);
  }
}

if (require.main === module) {
  main();
}

export { ConversationalCopyLinter, LintResult, LintOptions };
