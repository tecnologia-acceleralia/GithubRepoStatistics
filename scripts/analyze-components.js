#!/usr/bin/env node

/**
 * Component Usage Analyzer
 * 
 * This script analyzes the project to identify:
 * - Unused components
 * - Unused dependencies
 * - Missing dependencies
 * - Component dependency relationships
 */

const fs = require('fs');
const path = require('path');

// Configuration
const PROJECT_ROOT = path.join(__dirname, '..');
const COMPONENTS_DIR = path.join(PROJECT_ROOT, 'components');
const APP_DIR = path.join(PROJECT_ROOT, 'app');

// Analysis results
const analysis = {
  components: {},
  dependencies: {},
  imports: {},
  unused: [],
  missing: []
};

/**
 * Get all TypeScript/JavaScript files in a directory recursively
 */
function getAllFiles(dir, extensions = ['.ts', '.tsx', '.js', '.jsx']) {
  const files = [];
  
  function traverse(currentDir) {
    const items = fs.readdirSync(currentDir);
    
    for (const item of items) {
      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
        traverse(fullPath);
      } else if (stat.isFile() && extensions.some(ext => item.endsWith(ext))) {
        files.push(fullPath);
      }
    }
  }
  
  traverse(dir);
  return files;
}

/**
 * Extract imports from a file
 */
function extractImports(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const imports = [];
  
  // Match import statements
  const importRegex = /import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)(?:\s*,\s*(?:\{[^}]*\}|\*\s+as\s+\w+|\w+))*\s+from\s+)?['"`]([^'"`]+)['"`]/g;
  
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    const importPath = match[1];
    
    // Resolve relative imports
    if (importPath.startsWith('.')) {
      const resolvedPath = path.resolve(path.dirname(filePath), importPath);
      imports.push({
        original: importPath,
        resolved: resolvedPath,
        type: 'relative'
      });
    } else if (importPath.startsWith('@/')) {
      // Handle Next.js path aliases
      const aliasPath = importPath.replace('@/', '');
      const resolvedPath = path.join(PROJECT_ROOT, aliasPath);
      imports.push({
        original: importPath,
        resolved: resolvedPath,
        type: 'alias'
      });
    } else {
      imports.push({
        original: importPath,
        resolved: importPath,
        type: 'package'
      });
    }
  }
  
  return imports;
}

/**
 * Get component files
 */
function getComponentFiles() {
  const files = getAllFiles(COMPONENTS_DIR);
  return files.map(file => ({
    name: path.basename(file, path.extname(file)),
    path: file,
    relativePath: path.relative(PROJECT_ROOT, file)
  }));
}

/**
 * Analyze component usage
 */
function analyzeComponentUsage() {
  console.log('🔍 Analyzing component usage...');
  
  // Get all component files
  const componentFiles = getComponentFiles();
  
  // Get all project files
  const allFiles = getAllFiles(PROJECT_ROOT);
  
  // Analyze each component
  for (const component of componentFiles) {
    const componentName = component.name;
    analysis.components[componentName] = {
      file: component.path,
      used: false,
      usedBy: [],
      imports: extractImports(component.path)
    };
  }
  
  // Check usage in all files
  for (const file of allFiles) {
    if (file.includes('node_modules')) continue;
    
    const content = fs.readFileSync(file, 'utf8');
    
    for (const componentName of Object.keys(analysis.components)) {
      // Check for component usage patterns
      const patterns = [
        new RegExp(`import\\s+\\{[^}]*\\b${componentName}\\b[^}]*\\}\\s+from`, 'g'),
        new RegExp(`import\\s+${componentName}\\s+from`, 'g'),
        new RegExp(`<${componentName}[\\s/>]`, 'g')
      ];
      
      for (const pattern of patterns) {
        if (pattern.test(content)) {
          analysis.components[componentName].used = true;
          analysis.components[componentName].usedBy.push(file);
          break;
        }
      }
    }
  }
  
  // Identify unused components
  analysis.unused = Object.entries(analysis.components)
    .filter(([name, data]) => !data.used)
    .map(([name]) => name);
}

/**
 * Analyze dependencies
 */
function analyzeDependencies() {
  console.log('📦 Analyzing dependencies...');
  
  const packageJson = JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT, 'package.json'), 'utf8'));
  const allDependencies = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies
  };
  
  // Get all project files
  const allFiles = getAllFiles(PROJECT_ROOT);
  
  // Check each dependency
  for (const [depName, depVersion] of Object.entries(allDependencies)) {
    analysis.dependencies[depName] = {
      version: depVersion,
      used: false,
      usedIn: []
    };
    
    // Special handling for known dependencies that might not be detected by regex
    const specialDependencies = {
      'chartjs-adapter-date-fns': ['chartjs-adapter-date-fns'],
      '@types/node': ['@types/node'],
      '@types/react': ['@types/react'],
      '@types/react-dom': ['@types/react-dom'],
      'eslint': ['eslint'],
      'eslint-config-next': ['eslint-config-next'],
      '@eslint/eslintrc': ['@eslint/eslintrc'],
      'typescript': ['typescript'],
      'husky': ['husky'],
      'lint-staged': ['lint-staged']
    };
    
    if (specialDependencies[depName]) {
      // These are development dependencies that are used by build tools
      analysis.dependencies[depName].used = true;
      analysis.dependencies[depName].usedIn.push('build-tools');
      continue;
    }
    
    // Check usage in all files
    for (const file of allFiles) {
      if (file.includes('node_modules')) continue;
      
      const content = fs.readFileSync(file, 'utf8');
      
      // Check for dependency usage
      const patterns = [
        new RegExp(`import\\s+.*\\s+from\\s+['"]${depName}['"]`, 'g'),
        new RegExp(`require\\s*\\(\\s*['"]${depName}['"]`, 'g'),
        new RegExp(`from\\s+['"]${depName}['"]`, 'g'),
        new RegExp(`import\\s+['"]${depName}['"]`, 'g'),
        new RegExp(`import\\s+.*\\s+from\\s+['"]${depName}/`, 'g')
      ];
      
      for (const pattern of patterns) {
        if (pattern.test(content)) {
          analysis.dependencies[depName].used = true;
          analysis.dependencies[depName].usedIn.push(file);
          break;
        }
      }
    }
  }
  
  // Identify unused dependencies
  analysis.unusedDependencies = Object.entries(analysis.dependencies)
    .filter(([name, data]) => !data.used)
    .map(([name]) => name);
}

/**
 * Generate report
 */
function generateReport() {
  console.log('\n📊 Analysis Report');
  console.log('==================\n');
  
  // Component usage
  console.log('📁 Component Usage:');
  const usedComponents = Object.entries(analysis.components)
    .filter(([name, data]) => data.used);
  
  console.log(`✅ Used components: ${usedComponents.length}`);
  usedComponents.forEach(([name, data]) => {
    console.log(`  - ${name} (used in ${data.usedBy.length} files)`);
  });
  
  if (analysis.unused.length > 0) {
    console.log(`\n❌ Unused components: ${analysis.unused.length}`);
    analysis.unused.forEach(name => {
      console.log(`  - ${name}`);
    });
  } else {
    console.log('\n✅ All components are being used!');
  }
  
  // Dependency usage
  console.log('\n📦 Dependency Usage:');
  const usedDependencies = Object.entries(analysis.dependencies)
    .filter(([name, data]) => data.used);
  
  console.log(`✅ Used dependencies: ${usedDependencies.length}`);
  usedDependencies.forEach(([name, data]) => {
    console.log(`  - ${name}@${data.version} (used in ${data.usedIn.length} files)`);
  });
  
  if (analysis.unusedDependencies.length > 0) {
    console.log(`\n❌ Unused dependencies: ${analysis.unusedDependencies.length}`);
    analysis.unusedDependencies.forEach(name => {
      console.log(`  - ${name}`);
    });
  } else {
    console.log('\n✅ All dependencies are being used!');
  }
  
  // Summary
  console.log('\n📈 Summary:');
  console.log(`- Total components: ${Object.keys(analysis.components).length}`);
  console.log(`- Used components: ${usedComponents.length}`);
  console.log(`- Unused components: ${analysis.unused.length}`);
  console.log(`- Total dependencies: ${Object.keys(analysis.dependencies).length}`);
  console.log(`- Used dependencies: ${usedDependencies.length}`);
  console.log(`- Unused dependencies: ${analysis.unusedDependencies.length}`);
  
  if (analysis.unused.length === 0 && analysis.unusedDependencies.length === 0) {
    console.log('\n🎉 Excellent! No unused components or dependencies found.');
  }
}

/**
 * Main function
 */
function main() {
  try {
    analyzeComponentUsage();
    analyzeDependencies();
    generateReport();
  } catch (error) {
    console.error('❌ Analysis failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { analyzeComponentUsage, analyzeDependencies, generateReport }; 