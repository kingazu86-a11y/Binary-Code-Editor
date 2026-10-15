/**
 * GDB/MI (Machine Interface) Output Parser
 * Handles GDB MI stream records, async records, and result records.
 */

export interface MiResultRecord {
  token?: number;
  type: 'result';
  class: 'done' | 'running' | 'connected' | 'error' | 'exit';
  data: Record<string, any>;
  raw: string;
}

export interface MiAsyncRecord {
  type: 'exec' | 'status' | 'notify';
  class: string;
  data: Record<string, any>;
  raw: string;
}

export interface MiStreamRecord {
  type: 'console' | 'target' | 'log';
  content: string;
  raw: string;
}

export type MiRecord = MiResultRecord | MiAsyncRecord | MiStreamRecord;

export class GdbMiParser {
  /**
   * Parse a single line of GDB/MI output.
   */
  static parseLine(line: string): MiRecord | null {
    const trimmed = line.trim();
    if (!trimmed) return null;

    // 1. Stream Records
    if (trimmed.startsWith('~')) {
      return {
        type: 'console',
        content: GdbMiParser.unescapeString(trimmed.slice(1)),
        raw: trimmed,
      };
    }
    if (trimmed.startsWith('@')) {
      return {
        type: 'target',
        content: GdbMiParser.unescapeString(trimmed.slice(1)),
        raw: trimmed,
      };
    }
    if (trimmed.startsWith('&')) {
      return {
        type: 'log',
        content: GdbMiParser.unescapeString(trimmed.slice(1)),
        raw: trimmed,
      };
    }

    // 2. Result Records (e.g. 101^done,bkpt={...})
    const resultMatch = trimmed.match(/^(\d+)?\^(done|running|connected|error|exit)(?:,(.*))?$/);
    if (resultMatch) {
      const token = resultMatch[1] ? parseInt(resultMatch[1], 10) : undefined;
      const resultClass = resultMatch[2] as MiResultRecord['class'];
      const rest = resultMatch[3] || '';
      const data = rest ? GdbMiParser.parseResults(rest) : {};
      return {
        token,
        type: 'result',
        class: resultClass,
        data,
        raw: trimmed,
      };
    }

    // 3. Exec Async Records (e.g. *stopped,reason="breakpoint-hit",...)
    const execMatch = trimmed.match(/^(\d+)?\*([a-zA-Z0-9_-]+)(?:,(.*))?$/);
    if (execMatch) {
      const asyncClass = execMatch[2];
      const rest = execMatch[3] || '';
      const data = rest ? GdbMiParser.parseResults(rest) : {};
      return {
        type: 'exec',
        class: asyncClass,
        data,
        raw: trimmed,
      };
    }

    // 4. Status / Notify Async Records (+status, =notify)
    const notifyMatch = trimmed.match(/^(\d+)?([+=])([a-zA-Z0-9_-]+)(?:,(.*))?$/);
    if (notifyMatch) {
      const isStatus = notifyMatch[2] === '+';
      const asyncClass = notifyMatch[3];
      const rest = notifyMatch[4] || '';
      const data = rest ? GdbMiParser.parseResults(rest) : {};
      return {
        type: isStatus ? 'status' : 'notify',
        class: asyncClass,
        data,
        raw: trimmed,
      };
    }

    return null;
  }

  /**
   * Parse comma-separated key=value pairs from MI response
   */
  static parseResults(input: string): Record<string, any> {
    const result: Record<string, any> = {};
    let pos = 0;

    while (pos < input.length) {
      // Skip comma or whitespace
      if (input[pos] === ',' || input[pos] === ' ') {
        pos++;
        continue;
      }

      // Read variable name up to '='
      const eqIdx = input.indexOf('=', pos);
      if (eqIdx === -1) {
        // Just a bare value or remainder
        break;
      }

      const varName = input.substring(pos, eqIdx).trim();
      pos = eqIdx + 1;

      const [parsedVal, newPos] = GdbMiParser.parseValue(input, pos);
      result[varName] = parsedVal;
      pos = newPos;

      if (pos < input.length && input[pos] === ',') {
        pos++;
      }
    }

    return result;
  }

  /**
   * Parse value (tuple {...}, list [...], cstring "...", or raw string)
   */
  static parseValue(input: string, startPos: number): [any, number] {
    let pos = startPos;
    if (pos >= input.length) return ['', pos];

    const char = input[pos];

    // C-String: "..."
    if (char === '"') {
      pos++;
      let str = '';
      let isEscape = false;
      while (pos < input.length) {
        const c = input[pos];
        if (isEscape) {
          switch (c) {
            case 'n':
              str += '\n';
              break;
            case 'r':
              str += '\r';
              break;
            case 't':
              str += '\t';
              break;
            case '\\':
              str += '\\';
              break;
            case '"':
              str += '"';
              break;
            default:
              str += c;
          }
          isEscape = false;
        } else if (c === '\\') {
          isEscape = true;
        } else if (c === '"') {
          pos++; // Consume closing quote
          break;
        } else {
          str += c;
        }
        pos++;
      }
      return [str, pos];
    }

    // Tuple: {...}
    if (char === '{') {
      pos++; // Consume '{'
      const tuple: Record<string, any> = {};
      while (pos < input.length) {
        if (input[pos] === '}') {
          pos++; // Consume '}'
          break;
        }
        if (input[pos] === ',' || input[pos] === ' ') {
          pos++;
          continue;
        }

        const eqIdx = input.indexOf('=', pos);
        const closeIdx = input.indexOf('}', pos);

        if (eqIdx !== -1 && (closeIdx === -1 || eqIdx < closeIdx)) {
          const key = input.substring(pos, eqIdx).trim();
          pos = eqIdx + 1;
          const [val, nextPos] = GdbMiParser.parseValue(input, pos);
          tuple[key] = val;
          pos = nextPos;
        } else {
          // Nameless value inside tuple
          const [val, nextPos] = GdbMiParser.parseValue(input, pos);
          tuple[`item_${Object.keys(tuple).length}`] = val;
          pos = nextPos;
        }
      }
      return [tuple, pos];
    }

    // List: [...]
    if (char === '[') {
      pos++; // Consume '['
      const list: any[] = [];
      while (pos < input.length) {
        if (input[pos] === ']') {
          pos++; // Consume ']'
          break;
        }
        if (input[pos] === ',' || input[pos] === ' ') {
          pos++;
          continue;
        }

        // List can contain: {tuples}, "strings", or name=value pairs
        if (input[pos] === '{' || input[pos] === '"' || input[pos] === '[') {
          const [val, nextPos] = GdbMiParser.parseValue(input, pos);
          list.push(val);
          pos = nextPos;
        } else {
          // Check if key=value
          const eqIdx = input.indexOf('=', pos);
          const commaIdx = input.indexOf(',', pos);
          const closeBracketIdx = input.indexOf(']', pos);

          let endToken = input.length;
          if (commaIdx !== -1) endToken = Math.min(endToken, commaIdx);
          if (closeBracketIdx !== -1) endToken = Math.min(endToken, closeBracketIdx);

          if (eqIdx !== -1 && eqIdx < endToken) {
            const key = input.substring(pos, eqIdx).trim();
            pos = eqIdx + 1;
            const [val, nextPos] = GdbMiParser.parseValue(input, pos);
            list.push({ [key]: val });
            pos = nextPos;
          } else {
            const raw = input.substring(pos, endToken).trim();
            list.push(raw);
            pos = endToken;
          }
        }
      }
      return [list, pos];
    }

    // Bare word / number up to ',' or '}' or ']'
    let end = pos;
    while (end < input.length && !',}]'.includes(input[end])) {
      end++;
    }
    const token = input.substring(pos, end).trim();
    return [token, end];
  }

  static unescapeString(raw: string): string {
    let s = raw.trim();
    if (s.startsWith('"') && s.endsWith('"')) {
      s = s.slice(1, -1);
    }
    return s
      .replace(/\\n/g, '\n')
      .replace(/\\r/g, '\r')
      .replace(/\\t/g, '\t')
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, '\\');
  }
}
