/**
 * ImageURLNormalizer
 *
 * Resolves relative image/screenshot paths in extension README.md files
 * (e.g., `./images/demo.png`, `docs/screenshot.jpg`) into absolute CDN URLs
 * (Open VSX, raw GitHub, or local data URIs).
 */

/**
 * Derives a raw CDN base URL from a GitHub repository or Open VSX endpoint.
 */
export function deriveRawBaseUrl(repoOrBaseUrl?: string): string {
  if (!repoOrBaseUrl) return '';

  let url = repoOrBaseUrl.trim();

  // Handle git+https:// or git://
  url = url.replace(/^git\+/, '').replace(/^git:\/\//, 'https://');

  // If it's a GitHub URL (e.g., https://github.com/microsoft/vscode-python or .git)
  const ghMatch = url.match(/https?:\/\/github\.com\/([^\/]+)\/([^\/\.]+)(?:\.git)?(?:\/tree\/([^\/]+))?/i);
  if (ghMatch) {
    const owner = ghMatch[1];
    const repo = ghMatch[2];
    const branch = ghMatch[3] || 'HEAD';
    return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/`;
  }

  // If it's an Open VSX file URL (e.g., https://open-vsx.org/api/ms-python/python/2026.4.0/file/README.md)
  if (url.includes('open-vsx.org/api') && url.includes('/file/')) {
    const fileBase = url.substring(0, url.lastIndexOf('/file/') + 6);
    return fileBase.endsWith('/') ? fileBase : `${fileBase}/`;
  }

  // Ensure trailing slash for directory bases
  return url.endsWith('/') ? url : `${url}/`;
}

/**
 * Resolves a single relative path against a base URL.
 */
export function resolveRelativeUrl(relativePath: string, baseUrl: string): string {
  const trimmedPath = relativePath.trim();

  // Already absolute or protocol-relative
  if (
    trimmedPath.startsWith('http://') ||
    trimmedPath.startsWith('https://') ||
    trimmedPath.startsWith('data:') ||
    trimmedPath.startsWith('file://') ||
    trimmedPath.startsWith('#') ||
    trimmedPath.startsWith('mailto:')
  ) {
    return trimmedPath;
  }

  if (!baseUrl) return trimmedPath;

  // Clean relative path: strip leading ./ or /
  const cleanPath = trimmedPath.replace(/^\.?\/+/, '');
  const cleanBase = baseUrl.replace(/\/+$/, '');

  return `${cleanBase}/${cleanPath}`;
}

/**
 * Replaces relative image/screenshot links in markdown with absolute CDN URLs.
 * Handles both Markdown image tags `![alt](path "title")` and HTML `<img src="path" />`.
 *
 * @param markdown - Raw markdown content from README.md
 * @param baseUrl - Base repository URL or Open VSX file URL
 * @returns Markdown with normalized absolute image links
 */
export function normalizeReadmeImageUrls(markdown: string, baseUrl: string): string {
  if (!markdown || !baseUrl) return markdown || '';

  const normalizedBase = deriveRawBaseUrl(baseUrl);
  if (!normalizedBase) return markdown;

  // 1. Regex for Markdown images: ![alt text](relative/path.png "optional title")
  // Matches: ![alt](url) or ![alt](<url>) or ![alt](url "title")
  const mdImageRegex = /!\[(.*?)\]\(\s*<?(?!https?:\/\/|data:|file:\/\/|#)([^>\s"\)]+)>?(?:\s+["'](.*?)["'])?\s*\)/gi;

  let transformed = markdown.replace(mdImageRegex, (_match, altText, relPath, title) => {
    const absoluteUrl = resolveRelativeUrl(relPath, normalizedBase);
    const titleAttr = title ? ` "${title}"` : '';
    return `![${altText}](${absoluteUrl}${titleAttr})`;
  });

  // 2. Regex for HTML <img> tags: <img ... src="relative/path.png" ... />
  const htmlImgRegex = /(<img\b[^>]*?\bsrc=["'])(?!https?:\/\/|data:|file:\/\/|#)([^"'\s>]+)(["'][^>]*>)/gi;

  transformed = transformed.replace(htmlImgRegex, (_match, prefix, relPath, suffix) => {
    const absoluteUrl = resolveRelativeUrl(relPath, normalizedBase);
    return `${prefix}${absoluteUrl}${suffix}`;
  });

  return transformed;
}

/**
 * Extracts all image URLs found within a markdown document.
 * Useful for building image and screenshot preview galleries.
 */
export function extractReadmeImages(markdown: string): string[] {
  if (!markdown) return [];

  const urls: string[] = [];
  const seen = new Set<string>();

  // Markdown images
  const mdRegex = /!\[.*?\]\(\s*<?([^>\s"\)]+)>?(?:\s+["'].*?["'])?\s*\)/gi;
  let match: RegExpExecArray | null;
  while ((match = mdRegex.exec(markdown)) !== null) {
    const url = match[1];
    if (url && !seen.has(url)) {
      seen.add(url);
      urls.push(url);
    }
  }

  // HTML images
  const htmlRegex = /<img\b[^>]*?\bsrc=["']([^"'\s>]+)["'][^>]*>/gi;
  while ((match = htmlRegex.exec(markdown)) !== null) {
    const url = match[1];
    if (url && !seen.has(url)) {
      seen.add(url);
      urls.push(url);
    }
  }

  return urls;
}
