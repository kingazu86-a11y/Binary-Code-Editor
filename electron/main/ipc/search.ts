import fs from 'fs';
import path from 'path';

export interface SearchMatch {
  line: number;
  column: number;
  text: string;
  matchLength: number;
}

export interface SearchFileResult {
  filePath: string;
  relativePath: string;
  matches: SearchMatch[];
}

const IGNORED_DIRS = new Set(['.git', 'node_modules', 'dist', 'dist-electron', 'build', '.idea', '.vscode', '.next']);
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB max for search

export class SearchService {
  async searchProject(options: {
    folderPath: string;
    query: string;
    isRegex?: boolean;
    caseSensitive?: boolean;
    wholeWord?: boolean;
    includePattern?: string;
    excludePattern?: string;
  }): Promise<SearchFileResult[]> {
    const { folderPath, query, isRegex, caseSensitive, wholeWord, includePattern, excludePattern } = options;
    if (!folderPath || !query || !fs.existsSync(folderPath)) return [];

    let regex: RegExp;
    try {
      let pattern = isRegex ? query : query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      if (wholeWord) {
        pattern = `\\b${pattern}\\b`;
      }
      const flags = caseSensitive ? 'g' : 'gi';
      regex = new RegExp(pattern, flags);
    } catch {
      return [];
    }

    const results: SearchFileResult[] = [];
    const filesToSearch = this.collectFiles(folderPath, includePattern, excludePattern);

    for (const filePath of filesToSearch) {
      try {
        const stats = fs.statSync(filePath);
        if (stats.isDirectory() || stats.size > MAX_FILE_SIZE) continue;

        const content = fs.readFileSync(filePath, 'utf-8');
        const lines = content.split(/\r?\n/);
        const matches: SearchMatch[] = [];

        for (let i = 0; i < lines.length; i++) {
          const lineText = lines[i];
          regex.lastIndex = 0;
          let match: RegExpExecArray | null;

          while ((match = regex.exec(lineText)) !== null) {
            matches.push({
              line: i + 1,
              column: match.index + 1,
              text: lineText.trim(),
              matchLength: match[0].length,
            });
            if (!regex.global) break;
          }
        }

        if (matches.length > 0) {
          results.push({
            filePath,
            relativePath: path.relative(folderPath, filePath).replace(/\\/g, '/'),
            matches,
          });
        }
      } catch {
        // Skip unreadable files
      }
    }

    return results;
  }

  async replaceInFiles(options: {
    folderPath: string;
    query: string;
    replaceText: string;
    files: string[];
    isRegex?: boolean;
    caseSensitive?: boolean;
  }): Promise<{ modifiedCount: number }> {
    const { folderPath, query, replaceText, files, isRegex, caseSensitive } = options;
    if (!query || files.length === 0) return { modifiedCount: 0 };

    let regex: RegExp;
    try {
      const pattern = isRegex ? query : query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const flags = caseSensitive ? 'g' : 'gi';
      regex = new RegExp(pattern, flags);
    } catch {
      return { modifiedCount: 0 };
    }

    let modifiedCount = 0;

    for (const file of files) {
      const targetPath = path.isAbsolute(file) ? file : path.join(folderPath, file);
      if (fs.existsSync(targetPath)) {
        try {
          const stats = fs.statSync(targetPath);
          if (stats.isDirectory()) continue;
          const content = fs.readFileSync(targetPath, 'utf-8');
          const newContent = content.replace(regex, replaceText);
          if (newContent !== content) {
            fs.writeFileSync(targetPath, newContent, 'utf-8');
            modifiedCount++;
          }
        } catch (err) {
          console.error('[Search] Replace error in file:', targetPath, err);
        }
      }
    }

    return { modifiedCount };
  }

  private collectFiles(dir: string, include?: string, exclude?: string): string[] {
    const results: string[] = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      if (IGNORED_DIRS.has(entry.name) || entry.name.startsWith('.')) continue;

      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        results.push(...this.collectFiles(fullPath, include, exclude));
      } else {
        if (include && !entry.name.includes(include)) continue;
        if (exclude && entry.name.includes(exclude)) continue;
        results.push(fullPath);
      }
    }

    return results;
  }
}

export const searchService = new SearchService();
