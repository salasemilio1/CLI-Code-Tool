import { CodeAnalyzer } from '../security/audit';

describe('CodeAnalyzer', () => {
  let analyzer: CodeAnalyzer;

  beforeEach(() => {
    analyzer = new CodeAnalyzer();
  });

  describe('analyzeFile', () => {
    it('should detect API keys', async () => {
      const testContent = `
        const api_key = "abcdef1234567890abcdef1234567890";
        const config = { key: api_key };
      `;
      
      const fs = require('fs-extra');
      jest.spyOn(fs, 'readFile').mockResolvedValue(testContent);
      
      const issues = await analyzer.analyzeFile('/fake/path');
      
      expect(issues).toHaveLength(1);
      expect(issues[0].type).toBe('secret');
      expect(issues[0].severity).toBe('high');
      expect(issues[0].message).toContain('API key');
      
      fs.readFile.mockRestore();
    });

    it('should detect console.log statements', async () => {
      const testContent = `
        function test() {
          console.log("debug info");
          return true;
        }
      `;
      
      const fs = require('fs-extra');
      jest.spyOn(fs, 'readFile').mockResolvedValue(testContent);
      
      const issues = await analyzer.analyzeFile('/fake/path');
      
      expect(issues.some(i => i.message.includes('Console.log'))).toBe(true);
      
      fs.readFile.mockRestore();
    });

    it('should handle file read errors gracefully', async () => {
      const fs = require('fs-extra');
      jest.spyOn(fs, 'readFile').mockRejectedValue(new Error('File not found'));
      
      const issues = await analyzer.analyzeFile('/fake/path');
      
      expect(issues).toHaveLength(1);
      expect(issues[0].type).toBe('potential-bug');
      expect(issues[0].message).toContain('Could not read file');
      
      fs.readFile.mockRestore();
    });

    it('should ignore environment variables', async () => {
      const testContent = `
        const apiKey = process.env.API_KEY;
        const token = $ENV.TOKEN;
      `;
      
      const fs = require('fs-extra');
      jest.spyOn(fs, 'readFile').mockResolvedValue(testContent);
      
      const issues = await analyzer.analyzeFile('/fake/path');
      
      // Should not detect secrets when using environment variables
      expect(issues.filter(i => i.type === 'secret')).toHaveLength(0);
      
      fs.readFile.mockRestore();
    });
  });
});