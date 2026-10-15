import { exec } from 'child_process';
import util from 'util';
import path from 'path';
import fs from 'fs';

const execPromise = util.promisify(exec);

export interface GitStatusResult {
  isRepo: boolean;
  branch: string;
  ahead: number;
  behind: number;
  modified: string[];
  staged: string[];
  untracked: string[];
  deleted: string[];
}

export interface GitBranch {
  name: string;
  isCurrent: boolean;
}

export class GitService {
  async isGitRepo(cwd: string): Promise<boolean> {
    if (!cwd || !fs.existsSync(cwd)) return false;
    try {
      await execPromise('git rev-parse --is-inside-work-tree', { cwd });
      return true;
    } catch {
      return false;
    }
  }

  async getStatus(cwd: string): Promise<GitStatusResult> {
    const emptyResult: GitStatusResult = {
      isRepo: false,
      branch: '',
      ahead: 0,
      behind: 0,
      modified: [],
      staged: [],
      untracked: [],
      deleted: [],
    };

    if (!cwd || !fs.existsSync(cwd)) return emptyResult;

    try {
      const isRepo = await this.isGitRepo(cwd);
      if (!isRepo) return emptyResult;

      const { stdout } = await execPromise('git status --porcelain=v1 -b', { cwd });
      const lines = stdout.split('\n');

      let branch = 'main';
      let ahead = 0;
      let behind = 0;
      const modified: string[] = [];
      const staged: string[] = [];
      const untracked: string[] = [];
      const deleted: string[] = [];

      for (const line of lines) {
        if (!line) continue;

        if (line.startsWith('## ')) {
          // Parse branch line: ## main...origin/main [ahead 1, behind 2]
          const branchPart = line.substring(3).trim();
          const matchBranch = branchPart.match(/^([^\.\s]+)/);
          if (matchBranch) {
            branch = matchBranch[1];
          }
          const matchAhead = branchPart.match(/ahead (\d+)/);
          if (matchAhead) ahead = parseInt(matchAhead[1], 10);
          const matchBehind = branchPart.match(/behind (\d+)/);
          if (matchBehind) behind = parseInt(matchBehind[1], 10);
          continue;
        }

        const indexStatus = line[0];
        const workTreeStatus = line[1];
        const filePath = line.substring(3).trim();

        if (indexStatus === '?' && workTreeStatus === '?') {
          untracked.push(filePath);
        } else {
          if (indexStatus !== ' ' && indexStatus !== '?') {
            staged.push(filePath);
          }
          if (workTreeStatus === 'M') {
            modified.push(filePath);
          } else if (workTreeStatus === 'D') {
            deleted.push(filePath);
          }
        }
      }

      return {
        isRepo: true,
        branch,
        ahead,
        behind,
        modified,
        staged,
        untracked,
        deleted,
      };
    } catch (err) {
      console.error('[Git] Error reading status:', err);
      return emptyResult;
    }
  }

  async stage(cwd: string, files: string[]): Promise<boolean> {
    try {
      if (files.length === 0 || files.includes('.')) {
        await execPromise('git add .', { cwd });
      } else {
        const fileArgs = files.map((f) => `"${f}"`).join(' ');
        await execPromise(`git add ${fileArgs}`, { cwd });
      }
      return true;
    } catch (err) {
      console.error('[Git] Stage error:', err);
      return false;
    }
  }

  async unstage(cwd: string, files: string[]): Promise<boolean> {
    try {
      if (files.length === 0 || files.includes('.')) {
        await execPromise('git reset HEAD', { cwd });
      } else {
        const fileArgs = files.map((f) => `"${f}"`).join(' ');
        await execPromise(`git restore --staged ${fileArgs}`, { cwd });
      }
      return true;
    } catch (err) {
      console.error('[Git] Unstage error:', err);
      return false;
    }
  }

  async commit(cwd: string, message: string): Promise<{ success: boolean; output: string }> {
    try {
      const sanitized = message.replace(/"/g, '\\"');
      const { stdout } = await execPromise(`git commit -m "${sanitized}"`, { cwd });
      return { success: true, output: stdout };
    } catch (err: any) {
      console.error('[Git] Commit error:', err);
      return { success: false, output: err.message || String(err) };
    }
  }

  async getBranches(cwd: string): Promise<GitBranch[]> {
    try {
      const { stdout } = await execPromise('git branch', { cwd });
      const lines = stdout.split('\n');
      const branches: GitBranch[] = [];

      for (const line of lines) {
        if (!line.trim()) continue;
        const isCurrent = line.startsWith('*');
        const name = line.replace('*', '').trim();
        branches.push({ name, isCurrent });
      }

      return branches;
    } catch {
      return [];
    }
  }

  async checkout(cwd: string, branchName: string): Promise<boolean> {
    try {
      await execPromise(`git checkout "${branchName}"`, { cwd });
      return true;
    } catch {
      return false;
    }
  }

  async createBranch(cwd: string, branchName: string): Promise<boolean> {
    try {
      await execPromise(`git checkout -b "${branchName}"`, { cwd });
      return true;
    } catch {
      return false;
    }
  }

  async getDiff(cwd: string, filePath?: string): Promise<string> {
    try {
      const target = filePath ? `"${filePath}"` : '';
      const { stdout } = await execPromise(`git diff ${target}`, { cwd });
      if (!stdout && filePath) {
        // Try cached (staged) diff
        const cached = await execPromise(`git diff --cached ${target}`, { cwd });
        return cached.stdout;
      }
      return stdout;
    } catch {
      return '';
    }
  }
}

export const gitService = new GitService();
