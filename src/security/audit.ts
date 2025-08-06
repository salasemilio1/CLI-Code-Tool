import { CodeIssue } from '../types';
import fs from 'fs-extra';

export class CodeAnalyzer {
  public async analyzeFile(filePath: string): Promise<CodeIssue[]> {
    const issues: CodeIssue[] = [];
    
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const lines = content.split('\n');
      
      // Only check for actually helpful things
      lines.forEach((line, index) => {
        this.checkForSecrets(line, index + 1, filePath, issues);
        this.checkForCommonIssues(line, index + 1, filePath, issues);
      });
      
    } catch (error) {
      issues.push({
        type: 'potential-bug',
        severity: 'low',
        message: `Could not read file: ${error}`,
        file: filePath,
      });
    }

    return issues;
  }

  private checkForSecrets(line: string, lineNumber: number, filePath: string, issues: CodeIssue[]): void {
    // Only check for obvious secrets that might accidentally be committed
    const secretPatterns = [
      { 
        pattern: /api[_-]?key\s*[=:]\s*["'][a-zA-Z0-9]{20,}["']/i, 
        type: 'API key',
        suggestion: 'Move to environment variable or config file'
      },
      { 
        pattern: /password\s*[=:]\s*["'][^"']{8,}["']/i, 
        type: 'Password',
        suggestion: 'Use environment variables or secure config'
      },
      { 
        pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/, 
        type: 'Private key',
        suggestion: 'Store private keys securely, not in code'
      },
      {
        pattern: /token\s*[=:]\s*["'][a-zA-Z0-9_-]{32,}["']/i,
        type: 'Token',
        suggestion: 'Use environment variables for tokens'
      }
    ];

    secretPatterns.forEach(({ pattern, type, suggestion }) => {
      if (pattern.test(line) && !line.includes('process.env') && !line.includes('$ENV')) {
        issues.push({
          type: 'secret',
          severity: 'high',
          message: `Potential ${type} found in code`,
          file: filePath,
          line: lineNumber,
          suggestion,
        });
      }
    });
  }

  private checkForCommonIssues(line: string, lineNumber: number, filePath: string, issues: CodeIssue[]): void {
    // Check for common potential issues (not overly restrictive)
    const commonIssues = [
      {
        pattern: /console\.log\(/,
        message: 'Console.log statement (consider removing for production)',
        severity: 'low' as const,
        suggestion: 'Use a proper logging library or remove debug logs'
      },
      {
        pattern: /TODO:|FIXME:|HACK:/i,
        message: 'TODO/FIXME comment found',
        severity: 'low' as const,
        suggestion: 'Consider addressing this comment or creating an issue'
      },
      {
        pattern: /eval\s*\(/,
        message: 'Use of eval() can be dangerous',
        severity: 'medium' as const,
        suggestion: 'Consider safer alternatives to eval()'
      }
    ];

    commonIssues.forEach(({ pattern, message, severity, suggestion }) => {
      if (pattern.test(line)) {
        issues.push({
          type: 'potential-bug',
          severity,
          message,
          file: filePath,
          line: lineNumber,
          suggestion,
        });
      }
    });
  }
}