#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { ConfigManager } from '../core/config';
import { FileService } from '../services/file/FileService';
import packageJson from '../../package.json';

const program = new Command();

async function initializeCLI(): Promise<void> {
  const configManager = ConfigManager.getInstance();
  await configManager.loadConfig();
  
  const config = configManager.getConfig();
  const fileService = new FileService(config.analysis);

  program
    .name('code-assistant')
    .description('A helpful, open-source command line coding assistant that runs locally')
    .version(packageJson.version);

  // Make help more accessible
  program
    .command('help', { isDefault: false })
    .description('Show detailed help')
    .action(() => {
      console.log(chalk.blue.bold('\n📖 Local Code Assistant Help\n'));
      console.log('Available commands:');
      console.log(`  ${chalk.cyan('ca analyze <path>')}     Analyze files for insights and potential issues`);
      console.log(`  ${chalk.cyan('ca read <file>')}        Read and display a file safely`);
      console.log(`  ${chalk.cyan('ca config')}             Show current configuration`);
      console.log(`  ${chalk.cyan('ca init')}               Initialize configuration`);
      console.log(`  ${chalk.cyan('ca version')}            Show version information`);
      console.log('\nExamples:');
      console.log(`  ${chalk.gray('ca analyze .')}`);
      console.log(`  ${chalk.gray('ca analyze src/ -r')}`);
      console.log(`  ${chalk.gray('ca read package.json')}`);
      console.log('\nFor more help: https://github.com/your-username/local-code-assistant');
    });

  program
    .command('init')
    .description('Initialize configuration')
    .action(async () => {
      const spinner = ora('Setting up Local Code Assistant...').start();
      
      try {
        await configManager.saveConfig();
        spinner.succeed('Configuration initialized successfully!');
        console.log(chalk.gray(`Config saved to: ${configManager.getConfigPath()}`));
        console.log(chalk.blue('\nTry: ca analyze . --recursive'));
      } catch (error) {
        spinner.fail('Failed to initialize configuration');
        console.error(chalk.red(error));
        process.exit(1);
      }
    });

  program
    .command('config')
    .description('Show current configuration')
    .option('-p, --path', 'Show configuration file path only')
    .option('-e, --edit', 'Open config file in default editor')
    .action(async (options) => {
      if (options.path) {
        console.log(configManager.getConfigPath());
        return;
      }

      const config = configManager.getConfig();
      console.log(chalk.blue('📋 Current Configuration:\n'));
      
      // Pretty print config sections
      console.log(chalk.bold('Analysis:'));
      console.log(`  Secret Detection: ${config.analysis.enableSecretDetection ? '✅' : '❌'}`);
      console.log(`  Complexity Analysis: ${config.analysis.enableComplexityAnalysis ? '✅' : '❌'}`);
      console.log(`  Max File Size: ${(config.analysis.maxFileSize / 1024 / 1024).toFixed(0)}MB\n`);
      
      console.log(chalk.bold('General:'));
      console.log(`  Log Level: ${config.general.logLevel}`);
      console.log(`  Output Format: ${config.general.outputFormat}\n`);
      
      console.log(chalk.bold('LLM:'));
      console.log(`  Provider: ${config.llm.provider}`);
      if (config.llm.provider !== 'none') {
        console.log(`  Endpoint: ${config.llm.endpoint}`);
        console.log(`  Model: ${config.llm.model}`);
      }
    });

  program
    .command('analyze <path>')
    .description('Analyze files for insights and potential issues')
    .option('-r, --recursive', 'Recursively analyze directory')
    .option('-f, --format <format>', 'Output format (table|json|markdown)', 'table')
    .option('--max-files <number>', 'Maximum number of files to analyze', '50')
    .option('--secrets-only', 'Only check for secrets (faster)')
    .action(async (targetPath: string, options) => {
      const spinner = ora(`Analyzing ${targetPath}...`).start();
      
      try {
        // Temporarily modify config for this run
        const currentConfig = configManager.getConfig();
        if (options.secretsOnly) {
          currentConfig.analysis.enableComplexityAnalysis = false;
        }

        const results = await fileService.analyzeFiles(targetPath, {
          recursive: options.recursive,
          includeHidden: false,
          maxFiles: parseInt(options.maxFiles),
        });

        spinner.succeed(`Analyzed ${results.length} files`);
        
        if (results.length === 0) {
          console.log(chalk.yellow('No files found to analyze'));
          return;
        }

        if (options.format === 'json') {
          console.log(JSON.stringify(results, null, 2));
        } else if (options.format === 'markdown') {
          console.log('# Analysis Report\n');
          results.forEach((result) => {
            console.log(`## ${result.path}`);
            console.log(`- **Language**: ${result.language}`);
            console.log(`- **Size**: ${(result.size / 1024).toFixed(2)} KB`);
            if (result.complexity > 0) {
              console.log(`- **Complexity**: ${result.complexity}`);
            }
            if (result.issues.length > 0) {
              console.log('\n### Issues:');
              result.issues.forEach(issue => {
                console.log(`- ${issue.severity.toUpperCase()}: ${issue.message}`);
                if (issue.suggestion) {
                  console.log(`  *Suggestion: ${issue.suggestion}*`);
                }
              });
            }
            console.log('');
          });
        } else {
          // Table format
          console.log(chalk.bold('\n📊 Analysis Results:\n'));
          
          const totalIssues = results.reduce((sum, r) => sum + r.issues.length, 0);
          const highIssues = results.reduce((sum, r) => sum + r.issues.filter(i => i.severity === 'high').length, 0);
          
          console.log(`Files analyzed: ${results.length}`);
          console.log(`Total issues found: ${totalIssues}`);
          if (highIssues > 0) {
            console.log(chalk.red(`High severity issues: ${highIssues}`));
          }
          console.log('');

          results.forEach((result, index) => {
            const hasIssues = result.issues.length > 0;
            const issueColor = result.issues.some(i => i.severity === 'high') ? 'red' : 
                              result.issues.some(i => i.severity === 'medium') ? 'yellow' : 'green';
            
            console.log(`${index + 1}. ${chalk.cyan(result.path)}`);
            console.log(`   ${chalk.gray('Language:')} ${result.language} | ${chalk.gray('Size:')} ${(result.size / 1024).toFixed(1)}KB${result.complexity > 0 ? ` | ${chalk.gray('Complexity:')} ${result.complexity}` : ''}`);
            
            if (hasIssues) {
              console.log(`   ${chalk[issueColor](`Issues: ${result.issues.length}`)}`);
              result.issues.slice(0, 2).forEach(issue => {
                const severityIcon = issue.severity === 'high' ? '🚨' : issue.severity === 'medium' ? '⚠️' : '💡';
                console.log(`   ${severityIcon} ${issue.message}${issue.line ? ` (line ${issue.line})` : ''}`);
              });
              if (result.issues.length > 2) {
                console.log(`   ${chalk.gray(`... and ${result.issues.length - 2} more`)}`);
              }
            } else {
              console.log(`   ${chalk.green('✅ No issues found')}`);
            }
            
            if (result.suggestions.length > 0) {
              console.log(`   ${chalk.blue('💡')} ${result.suggestions[0]}`);
            }
            console.log('');
          });
        }
      } catch (error) {
        spinner.fail('Analysis failed');
        console.error(chalk.red(`Error: ${error}`));
        process.exit(1);
      }
    });

  program
    .command('read <file>')
    .description('Read and display a file safely')
    .option('-l, --lines <number>', 'Show only first N lines')
    .option('-s, --stats', 'Show file statistics')
    .action(async (filePath: string, options) => {
      try {
        const result = await fileService.readFile(filePath);
        
        if (!result.success) {
          console.error(chalk.red(`Error: ${result.error}`));
          if (result.warnings) {
            result.warnings.forEach(warning => console.warn(chalk.yellow(`Warning: ${warning}`)));
          }
          process.exit(1);
        }

        if (options.stats) {
          console.log(chalk.blue(`📄 File: ${filePath}`));
          console.log(`Size: ${(result.output!.length / 1024).toFixed(2)} KB`);
          console.log(`Lines: ${result.output!.split('\n').length}`);
          console.log('');
        }

        if (options.lines) {
          const lines = result.output!.split('\n');
          const limitedLines = lines.slice(0, parseInt(options.lines));
          console.log(limitedLines.join('\n'));
          if (lines.length > parseInt(options.lines)) {
            console.log(chalk.gray(`... ${lines.length - parseInt(options.lines)} more lines`));
          }
        } else {
          console.log(result.output);
        }
      } catch (error) {
        console.error(chalk.red(`Failed to read file: ${error}`));
        process.exit(1);
      }
    });

  program
    .command('version')
    .description('Show version information')
    .action(() => {
      console.log(chalk.blue.bold('Local Code Assistant'));
      console.log(`Version: ${packageJson.version}`);
      console.log(`Node.js: ${process.version}`);
      console.log(`Platform: ${process.platform}`);
      console.log('\n🚀 Happy coding!');
    });

  // Show help if no command provided
  if (process.argv.length === 2) {
    program.outputHelp();
    console.log(chalk.gray('\nTip: Run "ca help" for detailed examples'));
  }

  program.parse();
}

// Initialize and run CLI
initializeCLI().catch((error) => {
  console.error(chalk.red('Failed to start:'), error);
  process.exit(1);
});