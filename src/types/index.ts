export interface CLIConfig {
  llm: LLMConfig;
  analysis: AnalysisConfig;
  general: GeneralConfig;
}

export interface LLMConfig {
  provider: 'ollama' | 'openai-compatible' | 'local' | 'none';
  endpoint?: string;
  model: string;
  maxTokens: number;
  temperature: number;
}

export interface AnalysisConfig {
  enableSecretDetection: boolean;
  enableComplexityAnalysis: boolean;
  maxFileSize: number; // Reasonable limit for memory, not security
}

export interface GeneralConfig {
  logLevel: 'error' | 'warn' | 'info' | 'debug';
  outputFormat: 'table' | 'json' | 'markdown';
}

export interface CommandResult {
  success: boolean;
  output?: string;
  error?: string;
  warnings?: string[];
}

export interface CodeIssue {
  type: 'secret' | 'complexity' | 'style' | 'potential-bug';
  severity: 'low' | 'medium' | 'high';
  message: string;
  file?: string;
  line?: number;
  suggestion?: string;
}

export interface FileAnalysis {
  path: string;
  language: string;
  size: number;
  complexity: number;
  issues: CodeIssue[];
  suggestions: string[];
}

export interface CodeContext {
  files: string[];
  dependencies: string[];
  framework?: string;
  language: string;
  projectType: string;
}

export interface ProjectInfo {
  name: string;
  type: 'node' | 'python' | 'web' | 'mobile' | 'unknown';
  framework?: string;
  languages: string[];
  dependencies: string[];
}