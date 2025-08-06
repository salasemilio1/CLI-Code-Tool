# Local Code Assistant

A helpful, open-source command line coding assistant that runs locally on your machine. No cloud dependencies, no telemetry, just useful code analysis and insights.

## Features

- 🔍 **Secret Detection** - Catch API keys, passwords, and tokens before they're committed
- 📊 **Code Analysis** - Understand complexity, find TODO comments, and get suggestions
- 📁 **File Reading** - Safe file viewing with size limits and helpful stats  
- 🎨 **Multiple Formats** - Output as table, JSON, or Markdown
- ⚡ **Fast & Local** - Everything runs on your machine
- 🛠️ **Open Source** - Full transparency, community-driven

## Quick Start

```bash
# Install
npm install -g local-code-assistant

# Initialize configuration
ca init

# Analyze your project
ca analyze . --recursive

# Read a file safely
ca read package.json --stats

# Get help
ca help
```

## Commands

- `ca analyze <path>` - Analyze files for issues and insights
- `ca read <file>` - Read and display files safely
- `ca config` - Show current configuration
- `ca init` - Initialize configuration
- `ca help` - Show detailed help

## Examples

```bash
# Analyze current directory recursively
ca analyze . -r

# Just check for secrets (faster)
ca analyze src/ --secrets-only

# Export analysis as JSON
ca analyze . --format json > analysis.json

# Read first 50 lines of a file
ca read large-file.js --lines 50

# Show file statistics
ca read package.json --stats
```

## What It Checks

### Secret Detection 🔒
- API keys and tokens
- Passwords in code
- Private keys
- Common credential patterns

### Code Quality 📋
- File complexity analysis
- TODO/FIXME comments
- Console.log statements
- Use of eval() and similar patterns

### Helpful Suggestions 💡
- Refactoring recommendations
- Security best practices
- Code organization tips

## Configuration

Run `ca config` to see current settings, or `ca config --path` to find the config file location.

Default configuration:
- Secret detection: ✅ Enabled
- Complexity analysis: ✅ Enabled  
- Max file size: 50MB
- Output format: Table

## Why Local?

- **Privacy**: Your code never leaves your machine
- **Speed**: No network calls or API limits
- **Reliability**: Works offline, no service dependencies
- **Trust**: Open source, auditable code
- **Cost**: Completely free, no subscriptions

## Contributing

We welcome contributions! This tool is designed to be helpful without being restrictive.

## License

MIT License - see [LICENSE](LICENSE) file for details.
