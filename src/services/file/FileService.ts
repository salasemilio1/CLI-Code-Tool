import fs from 'fs-extra';
import path from 'path';
import { glob } from 'glob';
import { FileAnalysis, CommandResult, AnalysisConfig } from '../../types';
import { CodeAnalyzer } from '../../security/audit';

export interface AnalysisOptions {
  recursive?: boolean;
  includeHidden?: boolean;
  maxFiles?: number;
}

export class FileService {
  private analyzer: CodeAnalyzer;
  private config: AnalysisConfig;

  constructor(config: AnalysisConfig) {
    this.analyzer = new CodeAnalyzer();
    this.config = config;
  }

  public async analyzeFiles(targetPath: string, options: AnalysisOptions = {}): Promise<FileAnalysis[]> {
    if (!await fs.pathExists(targetPath)) {
      throw new Error(`Path does not exist: ${targetPath}`);
    }

    const stats = await fs.stat(targetPath);
    const results: FileAnalysis[] = [];

    if (stats.isDirectory()) {
      const pattern = options.recursive ? '**/*' : '*';
      const files = await glob(pattern, {
        cwd: targetPath,
        absolute: true,
        dot: options.includeHidden ?? false,
        nodir: true,
      });

      const filesToAnalyze = options.maxFiles ? files.slice(0, options.maxFiles) : files;
      
      for (const filePath of filesToAnalyze) {
        try {
          const analysis = await this.analyzeFile(filePath);
          results.push(analysis);
        } catch (error) {
          console.warn(`Failed to analyze ${filePath}:`, error);
        }
      }
    } else {
      const analysis = await this.analyzeFile(targetPath);
      results.push(analysis);
    }

    return results;
  }

  public async analyzeFile(filePath: string): Promise<FileAnalysis> {
    const stats = await fs.stat(filePath);
    
    // Basic memory protection (not security - just practical)
    if (stats.size > this.config.maxFileSize) {
      return {
        path: filePath,
        language: this.detectLanguage(filePath),
        size: stats.size,
        complexity: 0,
        issues: [{
          type: 'potential-bug',
          severity: 'low',
          message: `File too large to analyze (${(stats.size / 1024 / 1024).toFixed(1)}MB)`,
          suggestion: 'Consider breaking this file into smaller modules'
        }],
        suggestions: ['File is too large - consider refactoring into smaller files']
      };
    }

    const language = this.detectLanguage(filePath);
    const issues = this.config.enableSecretDetection ? 
      await this.analyzer.analyzeFile(filePath) : [];
    
    const complexity = this.config.enableComplexityAnalysis ? 
      await this.calculateComplexity(filePath) : 0;
    
    const suggestions = this.generateSuggestions(issues, complexity, language);

    return {
      path: filePath,
      language,
      size: stats.size,
      complexity,
      issues,
      suggestions,
    };
  }

  private detectLanguage(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    
    const languageMap: { [key: string]: string } = {
      '.js': 'javascript',
      '.mjs': 'javascript',
      '.ts': 'typescript',
      '.jsx': 'jsx',
      '.tsx': 'tsx',
      '.py': 'python',
      '.java': 'java',
      '.cpp': 'cpp',
      '.c': 'c',
      '.cs': 'csharp',
      '.php': 'php',
      '.rb': 'ruby',
      '.go': 'go',
      '.rs': 'rust',
      '.sh': 'shell',
      '.bash': 'shell',
      '.zsh': 'shell',
      '.ps1': 'powershell',
      '.sql': 'sql',
      '.html': 'html',
      '.css': 'css',
      '.scss': 'scss',
      '.sass': 'sass',
      '.json': 'json',
      '.xml': 'xml',
      '.yaml': 'yaml',
      '.yml': 'yaml',
      '.toml': 'toml',
      '.md': 'markdown',
      '.dockerfile': 'docker',
      '.vue': 'vue',
      '.svelte': 'svelte',
    };

    return languageMap[ext] || 'text';
  }

  private async calculateComplexity(filePath: string): Promise<number> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const lines = content.split('\n').filter(line => line.trim().length > 0);
      
      let complexity = 1; // Base complexity
      let conditionals = 0;
      let loops = 0;

      // Simple pattern matching for common constructs
      const patterns = {
        conditionals: [/if\s*\(/g, /else/g, /switch\s*\(/g, /case\s+/g, /\?\s*.*:/g],
        loops: [/for\s*[(\s]/g, /while\s*\(/g, /do\s*\{/g, /\.forEach/g, /\.map/g],
      };

      for (const line of lines) {
        patterns.conditionals.forEach(pattern => {
          const matches = line.match(pattern);
          if (matches) conditionals += matches.length;
        });

        patterns.loops.forEach(pattern => {
          const matches = line.match(pattern);
          if (matches) loops += matches.length;
        });
      }

      // Simple cyclomatic complexity approximation
      complexity += conditionals + loops;
      
      return Math.min(100, complexity); // Cap at 100
    } catch (error) {
      return 1;
    }
  }

  private generateSuggestions(issues: any[], complexity: number, language: string): string[] {
    const suggestions: string[] = [];

    if (complexity > 20) {
      suggestions.push('Consider breaking this file into smaller, more focused modules');
    }

    if (complexity > 50) {
      suggestions.push('High complexity detected - refactoring recommended');
    }

    const secretIssues = issues.filter(i => i.type === 'secret').length;
    if (secretIssues > 0) {
      suggestions.push('Move sensitive data to environment variables or secure config files');
    }

    const todoCount = issues.filter(i => i.message.includes('TODO')).length;
    if (todoCount > 3) {
      suggestions.push('Consider addressing TODO comments or creating issues for them');
    }

    if (language === 'javascript' || language === 'typescript') {
      suggestions.push('Consider using ESLint and Prettier for code quality');
    }

    return suggestions;
  }

  public async readFile(filePath: string): Promise<CommandResult> {
    try {
      if (!await fs.pathExists(filePath)) {
        return {
          success: false,
          error: `File does not exist: ${filePath}`,
        };
      }

      const stats = await fs.stat(filePath);
      if (stats.size > this.config.maxFileSize) {
        return {
          success: false,
          error: `File too large (${(stats.size / 1024 / 1024).toFixed(1)}MB)`,
          warnings: ['Consider viewing this file in chunks or using a dedicated viewer'],
        };
      }

      const content = await fs.readFile(filePath, 'utf-8');

      return {
        success: true,
        output: content,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to read file: ${error}`,
      };
    }
  }
}