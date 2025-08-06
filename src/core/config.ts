import { CLIConfig } from '../types';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';

export class ConfigManager {
  private static instance: ConfigManager;
  private config: CLIConfig;
  private configPath: string;

  private constructor() {
    this.configPath = path.join(os.homedir(), '.code-assistant', 'config.json');
    this.config = this.getDefaultConfig();
  }

  public static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  private getDefaultConfig(): CLIConfig {
    return {
      llm: {
        provider: 'none', // No LLM required by default
        endpoint: 'http://localhost:11434',
        model: 'codellama:7b',
        maxTokens: 4096,
        temperature: 0.7,
      },
      analysis: {
        enableSecretDetection: true, // This is actually helpful
        enableComplexityAnalysis: true,
        maxFileSize: 50 * 1024 * 1024, // 50MB - reasonable memory limit
      },
      general: {
        logLevel: 'info',
        outputFormat: 'table',
      },
    };
  }

  public async loadConfig(): Promise<void> {
    try {
      if (await fs.pathExists(this.configPath)) {
        const configData = await fs.readJSON(this.configPath);
        this.config = { ...this.getDefaultConfig(), ...configData };
      } else {
        await this.saveConfig();
      }
    } catch (error) {
      console.warn('Failed to load config, using defaults:', error);
    }
  }

  public async saveConfig(): Promise<void> {
    try {
      await fs.ensureDir(path.dirname(this.configPath));
      await fs.writeJSON(this.configPath, this.config, { spaces: 2 });
    } catch (error) {
      console.error('Failed to save config:', error);
      throw error;
    }
  }

  public getConfig(): CLIConfig {
    return { ...this.config };
  }

  public updateConfig(updates: Partial<CLIConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  public getConfigPath(): string {
    return this.configPath;
  }
}