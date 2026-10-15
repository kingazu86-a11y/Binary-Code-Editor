/**
 * Generalized Emmet Engine for Monaco Editor
 * Supports HTML5 boilerplate, tag hierarchy, multipliers, classes, IDs,
 * attributes, text nodes, lorem generator, and CSS shorthand expansion.
 */

export interface EmmetExpansionResult {
  label: string;
  detail: string;
  documentation?: string;
  snippet: string;
}

const LOREM_WORDS = [
  'lorem', 'ipsum', 'dolor', 'sit', 'amet', 'consectetur', 'adipiscing', 'elit',
  'sed', 'do', 'eiusmod', 'tempor', 'incididunt', 'ut', 'labore', 'et', 'dolore',
  'magna', 'aliqua', 'enim', 'ad', 'minim', 'veniam', 'quis', 'nostrud',
  'exercitation', 'ullamco', 'laboris', 'nisi', 'aliquip', 'ex', 'ea', 'commodo',
  'consequat', 'duis', 'aute', 'irure', 'in', 'reprehenderit', 'voluptate',
  'velit', 'esse', 'cillum', 'fugiat', 'nulla', 'pariatur', 'excepteur', 'sint',
  'occaecat', 'cupidatat', 'non', 'proident', 'sunt', 'culpa', 'qui', 'officia',
  'deserunt', 'mollit', 'anim', 'id', 'est', 'laborum'
];

function generateLorem(count: number = 30): string {
  const words: string[] = [];
  for (let i = 0; i < count; i++) {
    words.push(LOREM_WORDS[i % LOREM_WORDS.length]);
  }
  const str = words.join(' ');
  return str.charAt(0).toUpperCase() + str.slice(1) + '.';
}

// Built-in HTML snippets & templates
const HTML_SNIPPETS: Record<string, { detail: string; snippet: string }> = {
  '!': {
    detail: 'HTML5 Boilerplate',
    snippet:
      '<!DOCTYPE html>\n<html lang="en">\n<head>\n\t<meta charset="UTF-8">\n\t<meta name="viewport" content="width=device-width, initial-scale=1.0">\n\t<title>${1:Document}</title>\n</head>\n<body>\n\t$0\n</body>\n</html>',
  },
  'html:5': {
    detail: 'HTML5 Boilerplate',
    snippet:
      '<!DOCTYPE html>\n<html lang="en">\n<head>\n\t<meta charset="UTF-8">\n\t<meta name="viewport" content="width=device-width, initial-scale=1.0">\n\t<title>${1:Document}</title>\n</head>\n<body>\n\t$0\n</body>\n</html>',
  },
  'a': {
    detail: '<a href="...">',
    snippet: '<a href="${1:#}">$0</a>',
  },
  'a:link': {
    detail: '<a href="http://...">',
    snippet: '<a href="http://${1:example.com}">$0</a>',
  },
  'a:mail': {
    detail: '<a href="mailto:...">',
    snippet: '<a href="mailto:${1:name@example.com}">$0</a>',
  },
  'link:css': {
    detail: '<link rel="stylesheet" href="style.css">',
    snippet: '<link rel="stylesheet" href="${1:style.css}">',
  },
  'link:favicon': {
    detail: '<link rel="shortcut icon" href="favicon.ico">',
    snippet: '<link rel="shortcut icon" href="${1:favicon.ico}" type="image/x-icon">',
  },
  'script:src': {
    detail: '<script src="..."></script>',
    snippet: '<script src="${1:script.js}"></script>',
  },
  'img': {
    detail: '<img src="..." alt="...">',
    snippet: '<img src="${1:}" alt="${2:}">',
  },
  'iframe': {
    detail: '<iframe src="..."></iframe>',
    snippet: '<iframe src="${1:}" frameborder="0"></iframe>',
  },
  'input': {
    detail: '<input type="text">',
    snippet: '<input type="${1:text}" name="${2:}" id="${3:}">',
  },
  'input:text': {
    detail: '<input type="text">',
    snippet: '<input type="text" name="${1:}" id="${2:}">',
  },
  'input:password': {
    detail: '<input type="password">',
    snippet: '<input type="password" name="${1:}" id="${2:}">',
  },
  'input:email': {
    detail: '<input type="email">',
    snippet: '<input type="email" name="${1:}" id="${2:}">',
  },
  'input:number': {
    detail: '<input type="number">',
    snippet: '<input type="number" name="${1:}" id="${2:}">',
  },
  'input:checkbox': {
    detail: '<input type="checkbox">',
    snippet: '<input type="checkbox" name="${1:}" id="${2:}">',
  },
  'input:radio': {
    detail: '<input type="radio">',
    snippet: '<input type="radio" name="${1:}" id="${2:}">',
  },
  'input:submit': {
    detail: '<input type="submit">',
    snippet: '<input type="submit" value="${1:Submit}">',
  },
  'input:button': {
    detail: '<input type="button">',
    snippet: '<input type="button" value="${1:Button}">',
  },
  'btn': {
    detail: '<button type="button">...</button>',
    snippet: '<button type="${1:button}">$0</button>',
  },
  'button': {
    detail: '<button type="button">...</button>',
    snippet: '<button type="${1:button}">$0</button>',
  },
  'form': {
    detail: '<form action="..." method="post">',
    snippet: '<form action="${1:}" method="${2:post}">\n\t$0\n</form>',
  },
  'form:get': {
    detail: '<form action="..." method="get">',
    snippet: '<form action="${1:}" method="get">\n\t$0\n</form>',
  },
  'form:post': {
    detail: '<form action="..." method="post">',
    snippet: '<form action="${1:}" method="post">\n\t$0\n</form>',
  },
  'meta:utf': {
    detail: '<meta charset="UTF-8">',
    snippet: '<meta charset="UTF-8">',
  },
  'meta:vp': {
    detail: '<meta name="viewport">',
    snippet: '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
  },
  'style': {
    detail: '<style>...</style>',
    snippet: '<style>\n\t$0\n</style>',
  },
  'script': {
    detail: '<script>...</script>',
    snippet: '<script>\n\t$0\n</script>',
  },
  'table': {
    detail: '<table>...</table>',
    snippet: '<table>\n\t<tr>\n\t\t<td>$0</td>\n\t</tr>\n</table>',
  },
  'select': {
    detail: '<select>...</select>',
    snippet: '<select name="${1:}" id="${2:}">\n\t<option value="${3:}">$0</option>\n</select>',
  },
  'ul': {
    detail: '<ul><li>...</li></ul>',
    snippet: '<ul>\n\t<li>$0</li>\n</ul>',
  },
  'ol': {
    detail: '<ol><li>...</li></ol>',
    snippet: '<ol>\n\t<li>$0</li>\n</ol>',
  },
};

// CSS Property abbreviations mapping
const CSS_ABBREVIATIONS: Record<string, { detail: string; snippet: string }> = {
  m: { detail: 'margin: ...', snippet: 'margin: ${1:0};' },
  p: { detail: 'padding: ...', snippet: 'padding: ${1:0};' },
  df: { detail: 'display: flex', snippet: 'display: flex;' },
  db: { detail: 'display: block', snippet: 'display: block;' },
  dib: { detail: 'display: inline-block', snippet: 'display: inline-block;' },
  dn: { detail: 'display: none', snippet: 'display: none;' },
  dg: { detail: 'display: grid', snippet: 'display: grid;' },
  jcc: { detail: 'justify-content: center', snippet: 'justify-content: center;' },
  jcsb: { detail: 'justify-content: space-between', snippet: 'justify-content: space-between;' },
  jcsa: { detail: 'justify-content: space-around', snippet: 'justify-content: space-around;' },
  aic: { detail: 'align-items: center', snippet: 'align-items: center;' },
  aifs: { detail: 'align-items: flex-start', snippet: 'align-items: flex-start;' },
  aife: { detail: 'align-items: flex-end', snippet: 'align-items: flex-end;' },
  fdc: { detail: 'flex-direction: column', snippet: 'flex-direction: column;' },
  fdr: { detail: 'flex-direction: row', snippet: 'flex-direction: row;' },
  posa: { detail: 'position: absolute', snippet: 'position: absolute;' },
  posr: { detail: 'position: relative', snippet: 'position: relative;' },
  posf: { detail: 'position: fixed', snippet: 'position: fixed;' },
  possk: { detail: 'position: sticky', snippet: 'position: sticky;' },
  w: { detail: 'width: ...', snippet: 'width: ${1:100%};' },
  h: { detail: 'height: ...', snippet: 'height: ${1:100%};' },
  w100p: { detail: 'width: 100%', snippet: 'width: 100%;' },
  h100p: { detail: 'height: 100%', snippet: 'height: 100%;' },
  c: { detail: 'color: ...', snippet: 'color: #${1:000};' },
  bgc: { detail: 'background-color: ...', snippet: 'background-color: #${1:fff};' },
  bg: { detail: 'background: ...', snippet: 'background: ${1:none};' },
  bdr: { detail: 'border-radius: ...', snippet: 'border-radius: ${1:4px};' },
  b: { detail: 'border: ...', snippet: 'border: ${1:1px solid #000};' },
  bn: { detail: 'border: none', snippet: 'border: none;' },
  curp: { detail: 'cursor: pointer', snippet: 'cursor: pointer;' },
  tac: { detail: 'text-align: center', snippet: 'text-align: center;' },
  tar: { detail: 'text-align: right', snippet: 'text-align: right;' },
  tal: { detail: 'text-align: left', snippet: 'text-align: left;' },
  tdn: { detail: 'text-decoration: none', snippet: 'text-decoration: none;' },
  ovh: { detail: 'overflow: hidden', snippet: 'overflow: hidden;' },
  ova: { detail: 'overflow: auto', snippet: 'overflow: auto;' },
  z: { detail: 'z-index: ...', snippet: 'z-index: ${1:1};' },
  op: { detail: 'opacity: ...', snippet: 'opacity: ${1:1};' },
  op0: { detail: 'opacity: 0', snippet: 'opacity: 0;' },
  op1: { detail: 'opacity: 1', snippet: 'opacity: 1;' },
  fs: { detail: 'font-size: ...', snippet: 'font-size: ${1:14px};' },
  fz: { detail: 'font-size: ...', snippet: 'font-size: ${1:14px};' },
  fw: { detail: 'font-weight: ...', snippet: 'font-weight: ${1:600};' },
  fwb: { detail: 'font-weight: bold', snippet: 'font-weight: bold;' },
  lh: { detail: 'line-height: ...', snippet: 'line-height: ${1:1.5};' },
};

interface EmmetNode {
  tag: string;
  id?: string;
  classes: string[];
  attributes: Record<string, string>;
  text?: string;
  multiplier: number;
  children: EmmetNode[];
}

function parseAttributes(raw: string): { attributes: Record<string, string>; clean: string } {
  const attributes: Record<string, string> = {};
  const clean = raw.replace(/\[([^\]]+)\]/g, (_, attrString) => {
    const parts = attrString.split(/\s+/);
    for (const p of parts) {
      const eqIdx = p.indexOf('=');
      if (eqIdx !== -1) {
        const k = p.slice(0, eqIdx);
        let v = p.slice(eqIdx + 1);
        if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
          v = v.slice(1, -1);
        }
        attributes[k] = v;
      } else if (p) {
        attributes[p] = '';
      }
    }
    return '';
  });
  return { attributes, clean };
}

function parseText(raw: string): { text?: string; clean: string } {
  const match = raw.match(/\{([^}]+)\}/);
  if (match) {
    return { text: match[1], clean: raw.replace(/\{([^}]+)\}/, '') };
  }
  return { text: undefined, clean: raw };
}

function parseSingleToken(token: string): EmmetNode {
  let { text, clean } = parseText(token);
  const { attributes, clean: clean2 } = parseAttributes(clean);
  clean = clean2;

  // Check multiplier *N
  let multiplier = 1;
  const multMatch = clean.match(/\*(\d+)$/);
  if (multMatch) {
    multiplier = parseInt(multMatch[1], 10) || 1;
    clean = clean.replace(/\*(\d+)$/, '');
  }

  // Parse ID and classes
  let id: string | undefined;
  const classes: string[] = [];
  const parts = clean.split(/([.#])/);
  let currentPrefix = '';
  let tag = 'div';

  if (parts.length > 0 && parts[0] && !parts[0].startsWith('.') && !parts[0].startsWith('#')) {
    tag = parts[0];
  }

  for (let i = 1; i < parts.length; i++) {
    const part = parts[i];
    if (part === '#' || part === '.') {
      currentPrefix = part;
    } else if (currentPrefix === '#') {
      id = part;
    } else if (currentPrefix === '.') {
      classes.push(part);
    }
  }

  // Handle lorem within single token
  if (tag.startsWith('lorem')) {
    const num = parseInt(tag.replace('lorem', ''), 10) || 30;
    text = generateLorem(num);
    tag = '';
  }

  return {
    tag: tag || 'div',
    id,
    classes,
    attributes,
    text,
    multiplier: Math.min(multiplier, 20),
    children: [],
  };
}

function renderNode(node: EmmetNode, indentLevel: number, index: number): string {
  const indent = '\t'.repeat(indentLevel);
  const results: string[] = [];

  for (let m = 1; m <= node.multiplier; m++) {
    const currentIndex = node.multiplier > 1 ? m : index;
    const replaceDollar = (str: string) => str.replace(/\$/g, String(currentIndex));

    const idStr = node.id ? ` id="${replaceDollar(node.id)}"` : '';
    const classStr = node.classes.length > 0 ? ` class="${replaceDollar(node.classes.join(' '))}"` : '';
    let attrStr = '';
    for (const [k, v] of Object.entries(node.attributes)) {
      attrStr += v ? ` ${k}="${replaceDollar(v)}"` : ` ${k}`;
    }

    const textContent = node.text ? replaceDollar(node.text) : '';
    const openTag = `<${node.tag}${idStr}${classStr}${attrStr}>`;
    const closeTag = `</${node.tag}>`;

    if (node.children.length === 0) {
      if (textContent) {
        results.push(`${indent}${openTag}${textContent}${closeTag}`);
      } else {
        results.push(`${indent}${openTag}$0${closeTag}`);
      }
    } else {
      const childLines = node.children.map((c) => renderNode(c, indentLevel + 1, currentIndex)).join('\n');
      results.push(`${indent}${openTag}\n${childLines}\n${indent}${closeTag}`);
    }
  }

  return results.join('\n');
}

/**
 * Expand generalized Emmet syntax into an HTML/CSS snippet
 */
export function expandEmmetAbbreviation(
  abbr: string,
  languageId: string
): EmmetExpansionResult | null {
  const trimmed = (abbr || '').trim();
  if (!trimmed) return null;

  // 1. CSS Mode
  const isCss = ['css', 'scss', 'less'].includes(languageId.toLowerCase());
  if (isCss) {
    if (CSS_ABBREVIATIONS[trimmed]) {
      const item = CSS_ABBREVIATIONS[trimmed];
      return {
        label: trimmed,
        detail: `Emmet: ${item.detail}`,
        snippet: item.snippet,
      };
    }

    // Pattern matching for CSS numbers e.g. m10 -> margin: 10px; p10-20 -> padding: 10px 20px;
    const numMatch = trimmed.match(/^([a-z]+)(-?\d+(?:-\d+)*)(p|px|rem|em|vh|vw|%)?$/);
    if (numMatch) {
      const propPrefix = numMatch[1];
      const rawVal = numMatch[2];
      const unit = numMatch[3] === 'p' ? '%' : numMatch[3] || 'px';

      const propMap: Record<string, string> = {
        m: 'margin',
        p: 'padding',
        w: 'width',
        h: 'height',
        fs: 'font-size',
        fz: 'font-size',
        bdr: 'border-radius',
        top: 'top',
        bot: 'bottom',
        left: 'left',
        right: 'right',
        gap: 'gap',
        z: 'z-index',
      };

      const prop = propMap[propPrefix];
      if (prop) {
        const vals = rawVal.split('-').map((v) => (v ? `${v}${unit === '%' ? '%' : unit}` : '0'));
        return {
          label: trimmed,
          detail: `Emmet: ${prop}: ${vals.join(' ')};`,
          snippet: `${prop}: ${vals.join(' ')};`,
        };
      }
    }
    return null;
  }

  // 2. HTML Mode
  // Check exact HTML snippets first
  if (HTML_SNIPPETS[trimmed]) {
    const item = HTML_SNIPPETS[trimmed];
    return {
      label: trimmed,
      detail: `Emmet: ${item.detail}`,
      snippet: item.snippet,
    };
  }

  // Check lorem ipsum standalone
  if (trimmed.startsWith('lorem')) {
    const count = parseInt(trimmed.replace('lorem', ''), 10) || 30;
    return {
      label: trimmed,
      detail: `Emmet: Lorem Ipsum (${count} words)`,
      snippet: generateLorem(count),
    };
  }

  // General HTML expansion (supports '>', '+', '*', '.', '#', '[]', '{}')
  const hasEmmetSyntax = /[>+*.#\[\]{}]/.test(trimmed);
  if (!hasEmmetSyntax) {
    const KNOWN_TAGS = new Set([
      'div', 'span', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'section', 'article',
      'aside', 'header', 'footer', 'nav', 'main', 'strong', 'em', 'b', 'i', 'u',
      'small', 'code', 'pre', 'blockquote', 'label', 'textarea', 'canvas', 'svg',
      'video', 'audio', 'source', 'details', 'summary', 'dialog'
    ]);
    if (KNOWN_TAGS.has(trimmed.toLowerCase())) {
      return {
        label: trimmed,
        detail: `Emmet: <${trimmed}></${trimmed}>`,
        snippet: `<${trimmed}>$0</${trimmed}>`,
      };
    }
    return null;
  }

  try {
    const childSegments = trimmed.split('>');
    let rootNode: EmmetNode | null = null;
    let currentParent: EmmetNode | null = null;

    for (const seg of childSegments) {
      const siblingTokens = seg.split('+');
      const siblingNodes = siblingTokens.map((tok) => parseSingleToken(tok));

      if (!rootNode) {
        rootNode = siblingNodes[0];
        if (siblingNodes.length > 1) {
          const container: EmmetNode = {
            tag: '',
            classes: [],
            attributes: {},
            multiplier: 1,
            children: siblingNodes,
          };
          rootNode = container;
          currentParent = siblingNodes[siblingNodes.length - 1];
        } else {
          currentParent = rootNode;
        }
      } else if (currentParent) {
        currentParent.children.push(...siblingNodes);
        currentParent = siblingNodes[siblingNodes.length - 1];
      }
    }

    if (!rootNode) return null;

    let expandedText = '';
    if (rootNode.tag === '') {
      expandedText = rootNode.children.map((c) => renderNode(c, 0, 1)).join('\n');
    } else {
      expandedText = renderNode(rootNode, 0, 1);
    }

    return {
      label: trimmed,
      detail: `Emmet: ${trimmed}`,
      snippet: expandedText,
    };
  } catch (err) {
    return null;
  }
}
