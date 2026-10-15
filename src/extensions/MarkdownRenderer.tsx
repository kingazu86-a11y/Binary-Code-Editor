import React, { useMemo, useEffect, useRef, useState } from 'react';
import { marked } from 'marked';
import hljs from 'highlight.js';
import { api } from '../services/api';
import { Copy, Check, ExternalLink, ZoomIn, X } from 'lucide-react';

interface MarkdownRendererProps {
  content: string;
  className?: string;
  style?: React.CSSProperties;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className, style }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoomImage, setZoomImage] = useState<string | null>(null);
  const [copiedCodeIndex, setCopiedCodeIndex] = useState<number | null>(null);

  // Configure marked with custom highlight.js integration
  const htmlContent = useMemo(() => {
    if (!content) return '';

    const renderer = new marked.Renderer();

    // Code block highlighter
    renderer.code = function (arg: any, infostring?: string) {
      const codeText = typeof arg === 'object' && arg !== null ? arg.text : String(arg || '');
      const rawLang = typeof arg === 'object' && arg !== null ? arg.lang : infostring;
      const lang = (rawLang || '').trim().toLowerCase();

      let highlighted = '';
      if (lang && hljs.getLanguage(lang)) {
        try {
          highlighted = hljs.highlight(codeText, { language: lang, ignoreIllegals: true }).value;
        } catch {
          highlighted = escapeHtml(codeText);
        }
      } else {
        try {
          highlighted = hljs.highlightAuto(codeText).value;
        } catch {
          highlighted = escapeHtml(codeText);
        }
      }

      const langBadge = lang ? `<span class="code-lang-tag">${escapeHtml(lang)}</span>` : '';
      return `
        <div class="code-block-wrapper">
          <div class="code-block-header">
            ${langBadge}
            <button class="copy-code-btn" data-code="${encodeURIComponent(codeText)}" title="Copy code">
              Copy
            </button>
          </div>
          <pre><code class="hljs ${lang ? `language-${lang}` : ''}">${highlighted}</code></pre>
        </div>
      `;
    };

    // Responsive images with fallback
    renderer.image = function (arg: any, title?: string, text?: string) {
      const href = typeof arg === 'object' && arg !== null ? arg.href : arg;
      const imgTitle = typeof arg === 'object' && arg !== null ? arg.title : title;
      const alt = typeof arg === 'object' && arg !== null ? arg.text : text;

      const hrefStr = String(href || '');
      const isBadge = (
        hrefStr.includes('shield.io') ||
        hrefStr.includes('shields.io') ||
        hrefStr.includes('badge') ||
        hrefStr.includes('travis-ci') ||
        hrefStr.includes('circleci') ||
        hrefStr.includes('workflow/status')
      );

      return `
        <span class="${isBadge ? 'readme-badge-wrapper' : 'readme-image-wrapper'}">
          <img
            src="${hrefStr}"
            alt="${escapeHtml(alt || '')}"
            title="${escapeHtml(imgTitle || '')}"
            loading="lazy"
            class="${isBadge ? 'readme-badge' : 'readme-image'}"
            onerror="this.onerror=null; this.classList.add('broken-image'); this.style.display='none';"
          />
        </span>
      `;
    };

    // Safe external links
    renderer.link = function (arg: any, title?: string, text?: string) {
      const href = typeof arg === 'object' && arg !== null ? arg.href : arg;
      const linkTitle = typeof arg === 'object' && arg !== null ? arg.title : title;
      const linkText = typeof arg === 'object' && arg !== null ? arg.text : text;

      const isAnchor = href && href.startsWith('#');
      return `<a href="${href || '#'}" ${linkTitle ? `title="${escapeHtml(linkTitle)}"` : ''} class="readme-link ${isAnchor ? 'anchor-link' : 'external-link'}">${linkText || ''}</a>`;
    };

    try {
      return marked.parse(content, {
        renderer,
        gfm: true,
        breaks: true,
      }) as string;
    } catch (err) {
      console.error('Markdown parse error:', err);
      return `<p>${escapeHtml(content)}</p>`;
    }
  }, [content]);

  // Handle delegated link clicks & image clicks
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;

      // Handle copy button
      const copyBtn = target.closest('.copy-code-btn') as HTMLElement;
      if (copyBtn) {
        e.preventDefault();
        const code = decodeURIComponent(copyBtn.getAttribute('data-code') || '');
        if (code) {
          navigator.clipboard.writeText(code);
          const originalText = copyBtn.innerText;
          copyBtn.innerText = 'Copied!';
          copyBtn.classList.add('copied');
          setTimeout(() => {
            copyBtn.innerText = originalText;
            copyBtn.classList.remove('copied');
          }, 2000);
        }
        return;
      }

      // Handle image zoom click
      const img = target.closest('.readme-image') as HTMLImageElement;
      if (img && img.src && !img.classList.contains('broken-image')) {
        // Only zoom if it's a content screenshot (not a small badge icon)
        if (img.naturalWidth > 150 || img.naturalHeight > 100) {
          e.preventDefault();
          setZoomImage(img.src);
          return;
        }
      }

      // Handle links
      const anchor = target.closest('a') as HTMLAnchorElement;
      if (anchor && anchor.href) {
        const href = anchor.getAttribute('href') || '';
        if (href.startsWith('#')) {
          e.preventDefault();
          const targetElement = container.querySelector(href);
          if (targetElement) {
            targetElement.scrollIntoView({ behavior: 'smooth' });
          }
        } else if (href.startsWith('http://') || href.startsWith('https://')) {
          e.preventDefault();
          api.openExternalUrl(href);
        }
      }
    };

    container.addEventListener('click', handleClick);
    return () => container.removeEventListener('click', handleClick);
  }, []);

  return (
    <div className={`extension-markdown-content ${className || ''}`} style={style}>
      <div
        ref={containerRef}
        dangerouslySetInnerHTML={{ __html: htmlContent }}
        style={{ lineHeight: 1.6 }}
      />

      {/* Lightbox / Zoom Overlay */}
      {zoomImage && (
        <div
          onClick={() => setZoomImage(null)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 30,
            cursor: 'zoom-out',
          }}
        >
          <button
            onClick={() => setZoomImage(null)}
            style={{
              position: 'absolute',
              top: 20,
              right: 20,
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              borderRadius: '50%',
              width: 36,
              height: 36,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFF',
              cursor: 'pointer',
            }}
          >
            <X size={18} />
          </button>
          <img
            src={zoomImage}
            alt="Expanded screenshot preview"
            style={{
              maxWidth: '90vw',
              maxHeight: '90vh',
              objectFit: 'contain',
              borderRadius: 8,
              boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
              border: '1px solid var(--border-color)',
            }}
          />
        </div>
      )}

      {/* Embedded Component Scoped CSS */}
      <style>{`
        .extension-markdown-content {
          color: var(--vscode-foreground, var(--text-primary));
          font-size: 13px;
          line-height: 1.65;
          user-select: text;
          max-width: 100%;
          overflow-wrap: break-word;
          word-break: break-word;
          box-sizing: border-box;
        }

        /* Force ALL images inside markdown (including raw html img) to stay within boundaries */
        .extension-markdown-content img {
          max-width: 100% !important;
          height: auto !important;
          box-sizing: border-box;
          object-fit: contain;
          vertical-align: middle;
        }

        .extension-markdown-content .readme-image-wrapper {
          display: block;
          width: 100%;
          max-width: 100%;
          margin: 14px 0;
          text-align: center;
          overflow: hidden;
          box-sizing: border-box;
        }

        /* Content Screenshots / Demo GIFs */
        .extension-markdown-content .readme-image,
        .extension-markdown-content img:not(.readme-badge):not([src*="shield"]):not([src*="badge"]):not([width="16"]):not([width="20"]):not([width="24"]) {
          display: block;
          max-width: 100% !important;
          height: auto !important;
          margin: 12px auto;
          border-radius: 8px;
          border: 1px solid var(--border-color);
          box-shadow: 0 4px 18px rgba(0, 0, 0, 0.35);
          cursor: zoom-in;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          box-sizing: border-box;
        }
        .extension-markdown-content .readme-image:hover,
        .extension-markdown-content img:not(.readme-badge):not([src*="shield"]):not([src*="badge"]):not([width="16"]):not([width="20"]):not([width="24"]):hover {
          box-shadow: 0 8px 28px rgba(0, 0, 0, 0.5);
        }

        /* Shields & Badges */
        .extension-markdown-content .readme-badge-wrapper {
          display: inline-block;
          margin: 2px 4px 2px 0;
          vertical-align: middle;
        }

        .extension-markdown-content .readme-badge,
        .extension-markdown-content img[src*="shield"],
        .extension-markdown-content img[src*="badge"] {
          display: inline-block !important;
          margin: 2px 3px 2px 0 !important;
          border: none !important;
          border-radius: 3px !important;
          box-shadow: none !important;
          cursor: pointer;
          max-height: 26px !important;
          width: auto !important;
        }

        .extension-markdown-content h1,
        .extension-markdown-content h2,
        .extension-markdown-content h3,
        .extension-markdown-content h4 {
          color: var(--vscode-editor-foreground, var(--text-primary));
          font-weight: 600;
          margin-top: 24px;
          margin-bottom: 12px;
          line-height: 1.3;
          border-bottom: 1px solid var(--border-subtle);
          padding-bottom: 6px;
          overflow-wrap: break-word;
        }

        .extension-markdown-content h1 { font-size: 22px; }
        .extension-markdown-content h2 { font-size: 18px; margin-top: 28px; }
        .extension-markdown-content h3 { font-size: 15px; border-bottom: none; }
        .extension-markdown-content h4 { font-size: 13px; border-bottom: none; }

        .extension-markdown-content p {
          margin-bottom: 14px;
          overflow-wrap: break-word;
        }

        .extension-markdown-content ul,
        .extension-markdown-content ol {
          margin-bottom: 14px;
          padding-left: 24px;
          box-sizing: border-box;
        }

        .extension-markdown-content li {
          margin-bottom: 4px;
        }

        .extension-markdown-content blockquote {
          margin: 14px 0;
          padding: 8px 16px;
          border-left: 4px solid var(--accent-primary);
          background-color: rgba(59, 130, 246, 0.08);
          border-radius: 0 6px 6px 0;
          color: var(--text-secondary);
          box-sizing: border-box;
        }

        .extension-markdown-content hr {
          border: none;
          height: 1px;
          background-color: var(--border-subtle);
          margin: 24px 0;
        }

        .extension-markdown-content a.readme-link {
          color: var(--vscode-textLink-foreground, var(--accent-primary));
          text-decoration: none;
          transition: text-decoration 0.15s ease;
          overflow-wrap: break-word;
        }
        .extension-markdown-content a.readme-link:hover {
          text-decoration: underline;
        }

        .extension-markdown-content code:not(pre code) {
          font-family: var(--font-mono);
          font-size: 12px;
          background-color: rgba(255, 255, 255, 0.08);
          padding: 2px 6px;
          border-radius: 4px;
          color: #E2E8F0;
          overflow-wrap: break-word;
        }

        .extension-markdown-content .code-block-wrapper {
          position: relative;
          margin: 16px 0;
          border-radius: 6px;
          background-color: #0A0D12;
          border: 1px solid var(--border-color);
          overflow: hidden;
          max-width: 100%;
          box-sizing: border-box;
        }

        .extension-markdown-content .code-block-header {
          display: flex;
          align-items: center;
          justifyContent: space-between;
          padding: 4px 12px;
          background-color: #06080A;
          border-bottom: 1px solid var(--border-subtle);
          font-size: 11px;
        }

        .extension-markdown-content .code-lang-tag {
          text-transform: uppercase;
          font-size: 10px;
          font-weight: 600;
          color: var(--text-muted);
          letter-spacing: 0.5px;
        }

        .extension-markdown-content .copy-code-btn {
          padding: 2px 8px;
          border-radius: 3px;
          font-size: 10px;
          background: transparent;
          border: 1px solid var(--border-color);
          color: var(--text-secondary);
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .extension-markdown-content .copy-code-btn:hover {
          background: var(--bg-hover);
          color: var(--text-primary);
        }
        .extension-markdown-content .copy-code-btn.copied {
          color: var(--color-success);
          border-color: var(--color-success);
        }

        .extension-markdown-content pre {
          margin: 0;
          padding: 12px 14px;
          overflow-x: auto;
          max-width: 100%;
          font-family: var(--font-mono);
          font-size: 12px;
          line-height: 1.5;
          box-sizing: border-box;
        }

        .extension-markdown-content table {
          display: block;
          width: 100%;
          max-width: 100%;
          overflow-x: auto;
          border-collapse: collapse;
          margin: 16px 0;
          font-size: 12px;
          box-sizing: border-box;
        }

        .extension-markdown-content th,
        .extension-markdown-content td {
          padding: 8px 12px;
          border: 1px solid var(--border-color);
          text-align: left;
        }

        .extension-markdown-content th {
          background-color: #12161F;
          font-weight: 600;
          color: var(--text-primary);
        }

        .extension-markdown-content tr:nth-child(even) td {
          background-color: rgba(255, 255, 255, 0.02);
        }

        /* Highlight.js VS Code Dark Theme Tokens */
        .hljs { color: #D4D4D4; }
        .hljs-keyword, .hljs-selector-tag { color: #C586C0; }
        .hljs-string, .hljs-title.class_ { color: #CE9178; }
        .hljs-comment, .hljs-quote { color: #6A9955; font-style: italic; }
        .hljs-number, .hljs-literal { color: #B5CEA8; }
        .hljs-variable, .hljs-template-variable { color: #9CDCFE; }
        .hljs-function, .hljs-title.function_ { color: #DCDCAA; }
        .hljs-type, .hljs-built_in { color: #4EC9B0; }
        .hljs-attr, .hljs-attribute { color: #9CDCFE; }
        .hljs-tag { color: #569CD6; }
      `}</style>
    </div>
  );
};

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
