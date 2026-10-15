import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import Editor, { OnMount, OnChange } from '@monaco-editor/react';
import {
  Code2, Eye, Grid, RefreshCw, AlertTriangle, Maximize2, Minimize2,
  ZoomIn, ZoomOut, RotateCw, Copy, Check, Sun, Moon, SplitSquareVertical,
  Download, Image as ImageIcon, Sparkles, AlignLeft, Info,
} from 'lucide-react';
import { editorStore } from '../state/editorStore';

interface SvgSplitEditorProps {
  tabId: string;
  groupId: string;
  filePath: string;
  content: string;
}

type BgMode = 'checker' | 'dark' | 'light' | 'white';
type ViewMode = 'split' | 'editor' | 'preview';
type RenderMode = 'vector' | 'image';

interface SvgStats {
  width: string;
  height: string;
  viewBox: string;
  elementCount: number;
  pathCount: number;
  naturalWidth: number;
  naturalHeight: number;
  aspectRatio: number;
}

const ZOOM_STEPS = [0.1, 0.25, 0.33, 0.5, 0.67, 0.75, 1, 1.25, 1.5, 2, 2.5, 3, 4, 6, 8, 12, 16];

/** Strip BOM, XML declarations, DOCTYPEs, and xml-stylesheets for clean inline/data URI rendering */
function cleanSvgSource(raw: string): string {
  if (!raw) return '';
  let cleaned = raw.replace(/^\uFEFF/, '').trim();
  // Strip XML declarations, processing instructions, and doctypes
  cleaned = cleaned.replace(/<\?xml[\s\S]*?\?>/gi, '');
  cleaned = cleaned.replace(/<\?xml-stylesheet[\s\S]*?\?>/gi, '');
  cleaned = cleaned.replace(/<!DOCTYPE[\s\S]*?>/gi, '');
  return cleaned.trim();
}

/** Resilient SVG parser and metadata extractor with XML and HTML5 fallbacks */
function parseAndAnalyzeSvg(svgText: string): {
  cleanHtml: string;
  stats: SvgStats | null;
  error: string | null;
  warning: string | null;
} {
  const empty = { cleanHtml: '', stats: null, error: null, warning: null };
  if (!svgText || !svgText.trim()) return empty;

  const cleaned = cleanSvgSource(svgText);
  if (!cleaned) return empty;

  const parser = new DOMParser();
  let doc: Document | null = null;
  let svgEl: SVGSVGElement | null = null;
  let error: string | null = null;
  let warning: string | null = null;

  // 1. Try strict XML parse
  try {
    const xmlDoc = parser.parseFromString(cleaned, 'image/svg+xml');
    const parseError = xmlDoc.querySelector('parsererror');
    if (!parseError) {
      doc = xmlDoc;
      svgEl = xmlDoc.querySelector('svg');
    } else {
      const errText = parseError.textContent || 'XML syntax warning';
      warning = errText.split('\n')[0].replace(/^error on line \d+ at column \d+:\s*/i, '').slice(0, 100);
    }
  } catch (err: any) {
    warning = err?.message || 'XML parsing exception';
  }

  // 2. Fallback to HTML5 parser (handles HTML entities like &nbsp;, undeclared namespaces, unquoted attributes, etc.)
  if (!svgEl) {
    try {
      const htmlDoc = parser.parseFromString(cleaned, 'text/html');
      const foundSvg = htmlDoc.querySelector('svg');
      if (foundSvg) {
        doc = htmlDoc;
        svgEl = foundSvg as unknown as SVGSVGElement;
      }
    } catch {}
  }

  // 3. Fallback: Auto-wrap raw SVG snippet tags (<path ...>, <g ...>, etc.)
  if (!svgEl && (cleaned.includes('<path') || cleaned.includes('<g') || cleaned.includes('<circle') || cleaned.includes('<rect'))) {
    try {
      warning = 'Auto-wrapped in <svg> root element';
      const wrapped = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${cleaned}</svg>`;
      const htmlDoc = parser.parseFromString(wrapped, 'text/html');
      svgEl = htmlDoc.querySelector('svg') as unknown as SVGSVGElement;
      doc = htmlDoc;
    } catch {}
  }

  if (!svgEl) {
    error = warning || 'No <svg> root element found';
    return { cleanHtml: cleaned, stats: null, error, warning: null };
  }

  // Ensure essential namespace attributes exist
  if (!svgEl.hasAttribute('xmlns')) {
    svgEl.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  }
  if (!svgEl.hasAttribute('xmlns:xlink')) {
    svgEl.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
  }

  // Extract dimensions and viewBox
  const widthAttr = svgEl.getAttribute('width') || '';
  const heightAttr = svgEl.getAttribute('height') || '';
  const viewBoxAttr = svgEl.getAttribute('viewBox') || '';

  let naturalWidth = 300;
  let naturalHeight = 150;
  let aspectRatio = 1;

  if (viewBoxAttr) {
    const parts = viewBoxAttr.trim().split(/[\s,]+/).map(Number).filter((n) => !isNaN(n));
    if (parts.length === 4 && parts[2] > 0 && parts[3] > 0) {
      naturalWidth = parts[2];
      naturalHeight = parts[3];
      aspectRatio = parts[2] / parts[3];
    }
  } else if (widthAttr && heightAttr && !widthAttr.includes('%') && !heightAttr.includes('%')) {
    const w = parseFloat(widthAttr);
    const h = parseFloat(heightAttr);
    if (!isNaN(w) && !isNaN(h) && w > 0 && h > 0) {
      naturalWidth = w;
      naturalHeight = h;
      aspectRatio = w / h;
    }
  }

  const allElements = svgEl.querySelectorAll('*');
  const paths = svgEl.querySelectorAll('path');

  const stats: SvgStats = {
    width: widthAttr || `${naturalWidth}px`,
    height: heightAttr || `${naturalHeight}px`,
    viewBox: viewBoxAttr,
    elementCount: allElements.length,
    pathCount: paths.length,
    naturalWidth,
    naturalHeight,
    aspectRatio: aspectRatio > 0 ? aspectRatio : 1,
  };

  const cleanHtml = svgEl.outerHTML || cleaned;
  return { cleanHtml, stats, error: null, warning };
}

export const SvgSplitEditor: React.FC<SvgSplitEditorProps> = ({
  tabId, groupId, filePath, content,
}) => {
  const [code, setCode] = useState(content);
  const [bgMode, setBgMode] = useState<BgMode>('checker');
  const [viewMode, setViewMode] = useState<ViewMode>('split');
  const [renderMode, setRenderMode] = useState<RenderMode>('vector');
  const [splitSizes, setSplitSizes] = useState([50, 50]);
  const [zoom, setZoom] = useState(1);
  const [fit, setFit] = useState(true);
  const [rotation, setRotation] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [copiedType, setCopiedType] = useState<'code' | 'uri' | 'jsx' | null>(null);
  const [canvasDims, setCanvasDims] = useState<{ w: number; h: number }>({ w: 600, h: 400 });

  const dividerDragRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const previewCanvasRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ x: number; sA: number; sB: number } | null>(null);
  const panStartRef = useRef<{ mx: number; my: number; ox: number; oy: number } | null>(null);
  const editorRef = useRef<any>(null);

  // Parse SVG content
  const parsedData = useMemo(() => parseAndAnalyzeSvg(code), [code]);
  const { cleanHtml, stats, error: svgError, warning: svgWarning } = parsedData;

  // Track canvas dimensions for responsive fit scaling
  useEffect(() => {
    if (!previewCanvasRef.current) return;
    const el = previewCanvasRef.current;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setCanvasDims({ w: width, h: height });
        }
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Sync external content changes
  useEffect(() => {
    setCode(content);
    if (editorRef.current) {
      const model = editorRef.current.getModel();
      if (model && model.getValue() !== content) {
        const pos = editorRef.current.getPosition();
        model.setValue(content);
        if (pos) editorRef.current.setPosition(pos);
      }
    }
  }, [content]);

  const handleEditorMount: OnMount = (editor) => {
    editorRef.current = editor;
  };

  const handleCodeChange: OnChange = (value) => {
    const newCode = value || '';
    setCode(newCode);
    editorStore.updateContent(tabId, newCode, groupId);
  };

  // Zoom controls for preview
  const zoomIn = () => {
    setFit(false);
    setZoom((z) => {
      const next = ZOOM_STEPS.find((s) => s > z + 0.01);
      return next ?? 16;
    });
  };

  const zoomOut = () => {
    setFit(false);
    setZoom((z) => {
      const prev = [...ZOOM_STEPS].reverse().find((s) => s < z - 0.01);
      return prev ?? 0.1;
    });
  };

  const toggleFit = () => {
    if (fit) {
      setFit(false);
      setZoom(1);
    } else {
      setFit(true);
      setZoom(1);
      setPanOffset({ x: 0, y: 0 });
    }
  };

  const rotate = () => setRotation((r) => (r + 90) % 360);

  const resetView = () => {
    setZoom(1);
    setRotation(0);
    setFit(true);
    setPanOffset({ x: 0, y: 0 });
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    setFit(false);
    const delta = e.deltaY;
    if (delta < 0) {
      setZoom((z) => {
        const next = ZOOM_STEPS.find((s) => s > z + 0.01);
        return next ?? 16;
      });
    } else {
      setZoom((z) => {
        const prev = [...ZOOM_STEPS].reverse().find((s) => s < z - 0.01);
        return prev ?? 0.1;
      });
    }
  };

  const handlePanMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0 && e.button !== 1) return;
    panStartRef.current = { mx: e.clientX, my: e.clientY, ox: panOffset.x, oy: panOffset.y };
    setIsDragging(true);
  };

  const handlePanMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !panStartRef.current) return;
    const dx = e.clientX - panStartRef.current.mx;
    const dy = e.clientY - panStartRef.current.my;
    // Automatically leave fit mode when panning
    if (fit && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) {
      setFit(false);
    }
    setPanOffset({
      x: panStartRef.current.ox + dx,
      y: panStartRef.current.oy + dy,
    });
  };

  const handlePanMouseUp = () => {
    setIsDragging(false);
    panStartRef.current = null;
  };

  const handleCopyCode = async () => {
    await navigator.clipboard.writeText(code);
    setCopiedType('code');
    setTimeout(() => setCopiedType(null), 2000);
  };

  const handleCopyDataUri = async () => {
    const uri = `data:image/svg+xml;utf8,${encodeURIComponent(cleanHtml || code)}`;
    await navigator.clipboard.writeText(uri);
    setCopiedType('uri');
    setTimeout(() => setCopiedType(null), 2000);
  };

  const handleFormatCode = () => {
    if (editorRef.current) {
      editorRef.current.getAction('editor.action.formatDocument')?.run();
    }
  };

  const handleDownload = () => {
    const fileName = filePath.replace(/\\/g, '/').split('/').pop() || 'image.svg';
    const blob = new Blob([code], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Background styles with dynamic contrast ──────────────────────────
  const previewBg: React.CSSProperties = (() => {
    if (bgMode === 'checker') {
      return {
        backgroundColor: '#0E1015',
        backgroundImage: `
          linear-gradient(45deg, #171B22 25%, transparent 25%),
          linear-gradient(-45deg, #171B22 25%, transparent 25%),
          linear-gradient(45deg, transparent 75%, #171B22 75%),
          linear-gradient(-45deg, transparent 75%, #171B22 75%)
        `,
        backgroundSize: '16px 16px',
        backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
        color: '#F8FAFC',
      };
    }
    if (bgMode === 'light') return { backgroundColor: '#E2E8F0', color: '#0F172A' };
    if (bgMode === 'white') return { backgroundColor: '#FFFFFF', color: '#0F172A' };
    return { backgroundColor: '#0A0C10', color: '#F8FAFC' };
  })();

  // ── Divider drag ─────────────────────────────────────────────────────
  const handleDividerMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    dividerDragRef.current = true;
    dragStartRef.current = { x: e.clientX, sA: splitSizes[0], sB: splitSizes[1] };

    const onMove = (me: MouseEvent) => {
      if (!dividerDragRef.current || !dragStartRef.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const total = rect.width;
      const delta = ((me.clientX - dragStartRef.current.x) / total) * 100;
      const newA = Math.max(15, Math.min(85, dragStartRef.current.sA + delta));
      const newB = 100 - newA;
      setSplitSizes([newA, newB]);
    };

    const onUp = () => {
      dividerDragRef.current = false;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const showEditor = viewMode === 'split' || viewMode === 'editor';
  const showPreview = viewMode === 'split' || viewMode === 'preview';
  const zoomPct = Math.round(zoom * 100);

  // ── Compute Intelligent Display Dimensions ───────────────────────────
  const { renderedWidth, renderedHeight } = useMemo(() => {
    const ar = stats?.aspectRatio || 1;
    const availW = Math.max(100, canvasDims.w * 0.85);
    const availH = Math.max(100, canvasDims.h * 0.85);

    if (fit) {
      let w = availW;
      let h = availW / ar;
      if (h > availH) {
        h = availH;
        w = availH * ar;
      }
      return { renderedWidth: Math.round(w), renderedHeight: Math.round(h) };
    }

    // Manual zoom mode
    const baseW = stats?.naturalWidth || 300;
    const baseH = stats?.naturalHeight || 300 / ar;
    return {
      renderedWidth: Math.round(baseW * zoom),
      renderedHeight: Math.round(baseH * zoom),
    };
  }, [canvasDims, fit, zoom, stats]);

  const previewTransform = `translate(${panOffset.x}px, ${panOffset.y}px) rotate(${rotation}deg)`;

  // Data URI for native image mode
  const dataUri = useMemo(() => {
    if (!cleanHtml) return '';
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(cleanHtml)}`;
  }, [cleanHtml]);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', backgroundColor: '#0D0F12' }}>
      {/* ── Minimalist Premium Toolbar ─────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '4px 10px',
          backgroundColor: 'var(--bg-panel)',
          borderBottom: '1px solid var(--border-color)',
          flexShrink: 0,
          flexWrap: 'wrap',
          minHeight: 34,
          userSelect: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
          <SplitSquareVertical size={13} style={{ color: '#FB923C', flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: 'var(--text-primary)', fontWeight: 600 }}>
            SVG Studio
          </span>
          <span
            style={{
              fontSize: 10,
              fontWeight: 600,
              padding: '1px 5px',
              borderRadius: 3,
              backgroundColor: 'rgba(251, 146, 60, 0.15)',
              color: '#FB923C',
              border: '1px solid rgba(251, 146, 60, 0.3)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            SVG
          </span>

          {stats && (
            <span
              style={{
                fontSize: 11,
                color: 'var(--text-muted)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                marginLeft: 4,
              }}
            >
              <span title="Dimensions / ViewBox">{stats.viewBox ? `viewBox: ${stats.viewBox}` : `${stats.width} × ${stats.height}`}</span>
              <span style={{ opacity: 0.4 }}>•</span>
              <span title="Element Count">{stats.elementCount} elements</span>
              {stats.pathCount > 0 && (
                <>
                  <span style={{ opacity: 0.4 }}>•</span>
                  <span title="Path Count">{stats.pathCount} paths</span>
                </>
              )}
            </span>
          )}

          {svgWarning && (
            <span
              style={{
                color: '#F59E0B',
                fontSize: 11,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                backgroundColor: 'rgba(245, 158, 11, 0.1)',
                padding: '1px 6px',
                borderRadius: 4,
                border: '1px solid rgba(245, 158, 11, 0.25)',
              }}
              title={svgWarning}
            >
              <AlertTriangle size={12} />
              {svgWarning.slice(0, 35)}
            </span>
          )}

          {svgError && (
            <span
              style={{
                color: '#EF4444',
                fontSize: 11,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                padding: '1px 6px',
                borderRadius: 4,
                border: '1px solid rgba(239, 68, 68, 0.25)',
              }}
              title={svgError}
            >
              <AlertTriangle size={12} />
              {svgError.slice(0, 45)}
            </span>
          )}
        </div>

        {/* Minimalist Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginLeft: 'auto' }}>
          {/* Render Mode Toggle: Vector (DOM) vs Image */}
          {showPreview && (
            <>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  backgroundColor: 'var(--bg-card)',
                  borderRadius: 4,
                  padding: 1,
                  border: '1px solid var(--border-color)',
                  marginRight: 4,
                }}
              >
                <button
                  title="Live Vector Mode (Interactive DOM)"
                  onClick={() => setRenderMode('vector')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 3,
                    padding: '2px 6px',
                    fontSize: 10,
                    borderRadius: 3,
                    border: 'none',
                    cursor: 'pointer',
                    backgroundColor: renderMode === 'vector' ? 'var(--accent-primary)' : 'transparent',
                    color: renderMode === 'vector' ? '#FFF' : 'var(--text-muted)',
                    fontWeight: 500,
                  }}
                >
                  <Sparkles size={11} />
                  Vector
                </button>
                <button
                  title="Rendered Image Mode (Native Browser Asset)"
                  onClick={() => setRenderMode('image')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 3,
                    padding: '2px 6px',
                    fontSize: 10,
                    borderRadius: 3,
                    border: 'none',
                    cursor: 'pointer',
                    backgroundColor: renderMode === 'image' ? 'var(--accent-primary)' : 'transparent',
                    color: renderMode === 'image' ? '#FFF' : 'var(--text-muted)',
                    fontWeight: 500,
                  }}
                >
                  <ImageIcon size={11} />
                  Image
                </button>
              </div>

              {/* Background selector */}
              <button
                title="Dark background"
                onClick={() => setBgMode('dark')}
                className={`toolbar-btn${bgMode === 'dark' ? ' toolbar-btn-active' : ''}`}
              >
                <Moon size={13} />
              </button>
              <button
                title="Light background"
                onClick={() => setBgMode('light')}
                className={`toolbar-btn${bgMode === 'light' ? ' toolbar-btn-active' : ''}`}
              >
                <Sun size={13} />
              </button>
              <button
                title="Checkerboard background"
                onClick={() => setBgMode('checker')}
                className={`toolbar-btn${bgMode === 'checker' ? ' toolbar-btn-active' : ''}`}
              >
                <Grid size={13} />
              </button>
              <button
                title="Pure White background"
                onClick={() => setBgMode('white')}
                className={`toolbar-btn${bgMode === 'white' ? ' toolbar-btn-active' : ''}`}
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  padding: '2px 4px',
                  lineHeight: 1,
                }}
              >
                W
              </button>
              <div style={{ width: 1, height: 14, backgroundColor: 'var(--border-color)', margin: '0 2px' }} />
            </>
          )}

          {/* Zoom controls */}
          {showPreview && (
            <>
              <button
                title="Toggle Fit to Screen or 100% size (Double-click canvas to toggle)"
                onClick={toggleFit}
                style={{
                  fontSize: 11,
                  color: fit ? 'var(--accent-primary)' : 'var(--text-secondary)',
                  minWidth: 42,
                  textAlign: 'center',
                  padding: '2px 5px',
                  backgroundColor: fit ? 'rgba(59, 130, 246, 0.12)' : 'transparent',
                  borderRadius: 3,
                  border: `1px solid ${fit ? 'rgba(59, 130, 246, 0.3)' : 'var(--border-color)'}`,
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                {fit ? 'Fit' : `${zoomPct}%`}
              </button>
              <button title="Zoom Out" onClick={zoomOut} className="toolbar-btn">
                <ZoomOut size={13} />
              </button>
              <button title="Zoom In" onClick={zoomIn} className="toolbar-btn">
                <ZoomIn size={13} />
              </button>
              <button
                title={fit ? 'Actual Size (1:1)' : 'Fit to Window'}
                onClick={toggleFit}
                className={`toolbar-btn${fit ? ' toolbar-btn-active' : ''}`}
              >
                {fit ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
              </button>
              <button title="Rotate 90°" onClick={rotate} className="toolbar-btn">
                <RotateCw size={13} />
              </button>
              <div style={{ width: 1, height: 14, backgroundColor: 'var(--border-color)', margin: '0 2px' }} />
            </>
          )}

          {/* View layout toggles */}
          <button
            title="Split View (Code + Preview)"
            onClick={() => setViewMode('split')}
            className={`toolbar-btn${viewMode === 'split' ? ' toolbar-btn-active' : ''}`}
          >
            <SplitSquareVertical size={13} />
          </button>
          <button
            title="Code Editor Only"
            onClick={() => setViewMode('editor')}
            className={`toolbar-btn${viewMode === 'editor' ? ' toolbar-btn-active' : ''}`}
          >
            <Code2 size={13} />
          </button>
          <button
            title="Preview Only"
            onClick={() => setViewMode('preview')}
            className={`toolbar-btn${viewMode === 'preview' ? ' toolbar-btn-active' : ''}`}
          >
            <Eye size={13} />
          </button>

          <div style={{ width: 1, height: 14, backgroundColor: 'var(--border-color)', margin: '0 2px' }} />

          {/* Format XML */}
          {showEditor && (
            <button
              title="Format SVG XML (Ctrl+Shift+I)"
              onClick={handleFormatCode}
              className="toolbar-btn"
            >
              <AlignLeft size={13} />
            </button>
          )}

          {/* Copy actions */}
          <button
            title={copiedType === 'code' ? 'Copied SVG Code!' : 'Copy SVG Code'}
            onClick={handleCopyCode}
            className={`toolbar-btn${copiedType === 'code' ? ' toolbar-btn-active' : ''}`}
          >
            {copiedType === 'code' ? <Check size={13} style={{ color: '#10B981' }} /> : <Copy size={13} />}
          </button>
          <button
            title={copiedType === 'uri' ? 'Copied Data URI!' : 'Copy as Data URI (data:image/svg+xml...)'}
            onClick={handleCopyDataUri}
            className={`toolbar-btn${copiedType === 'uri' ? ' toolbar-btn-active' : ''}`}
            style={{ fontSize: 10, fontWeight: 600, padding: '2px 4px' }}
          >
            URI
          </button>

          {/* Download */}
          <button
            title="Download SVG"
            onClick={handleDownload}
            className="toolbar-btn"
          >
            <Download size={13} />
          </button>

          {/* Reset View */}
          <button
            title="Reset Pan, Zoom & Split"
            onClick={() => { setSplitSizes([50, 50]); resetView(); }}
            className="toolbar-btn"
          >
            <RefreshCw size={13} />
          </button>
        </div>
      </div>

      {/* ── Main Workspace Body ────────────────────────────────────────── */}
      <div
        ref={containerRef}
        style={{
          flex: 1,
          display: 'flex',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* Editor Pane */}
        {showEditor && (
          <div
            style={{
              width: viewMode === 'split' ? `${splitSizes[0]}%` : '100%',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              borderRight: viewMode === 'split' ? '1px solid var(--border-color)' : 'none',
            }}
          >
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <Editor
                height="100%"
                language="xml"
                theme="vs-dark"
                value={code}
                onChange={handleCodeChange}
                onMount={handleEditorMount}
                options={{
                  fontSize: 13,
                  fontFamily: '"Cascadia Code", "JetBrains Mono", monospace',
                  minimap: { enabled: false },
                  wordWrap: 'off',
                  wrappingIndent: 'none',
                  scrollBeyondLastLine: false,
                  tabSize: 2,
                  mouseWheelZoom: true,
                  renderWhitespace: 'selection',
                  lineNumbersMinChars: 3,
                  smoothScrolling: true,
                  cursorSmoothCaretAnimation: 'on',
                  padding: { top: 8 },
                  automaticLayout: true,
                  formatOnPaste: true,
                  scrollbar: {
                    horizontal: 'auto',
                    vertical: 'auto',
                    horizontalScrollbarSize: 10,
                    verticalScrollbarSize: 10,
                    alwaysConsumeMouseWheel: false,
                  },
                }}
              />
            </div>
          </div>
        )}

        {/* Resizer Divider */}
        {viewMode === 'split' && (
          <div
            onMouseDown={handleDividerMouseDown}
            style={{
              width: 4,
              cursor: 'col-resize',
              flexShrink: 0,
              backgroundColor: 'var(--border-color)',
              transition: 'background-color 0.15s',
              zIndex: 10,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--accent-primary)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--border-color)')}
          />
        )}

        {/* Preview Pane */}
        {showPreview && (
          <div
            style={{
              width: viewMode === 'split' ? `${splitSizes[1]}%` : '100%',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            {/* SVG Render Area */}
            <div
              ref={previewCanvasRef}
              onWheel={handleWheel}
              onMouseDown={handlePanMouseDown}
              onMouseMove={handlePanMouseMove}
              onMouseUp={handlePanMouseUp}
              onMouseLeave={handlePanMouseUp}
              onDoubleClick={toggleFit}
              style={{
                flex: 1,
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 16,
                position: 'relative',
                cursor: isDragging ? 'grabbing' : 'grab',
                ...previewBg,
              }}
            >
              {code.trim() === '' ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, color: 'var(--text-muted)' }}>
                  <SplitSquareVertical size={28} style={{ opacity: 0.3 }} />
                  <span style={{ fontSize: 12 }}>Type or paste SVG markup to render live preview…</span>
                </div>
              ) : svgError && !cleanHtml ? (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 8,
                    color: 'var(--text-muted)',
                    textAlign: 'center',
                    padding: 16,
                    maxWidth: 340,
                  }}
                >
                  <AlertTriangle size={28} style={{ color: '#EF4444' }} />
                  <p style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 600 }}>SVG Parsing Error</p>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                    {svgError}
                  </span>
                </div>
              ) : renderMode === 'image' && dataUri ? (
                /* Native Image Mode */
                <div
                  style={{
                    width: renderedWidth,
                    height: renderedHeight,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transform: previewTransform,
                    transformOrigin: 'center center',
                    transition: isDragging ? 'none' : 'transform 0.1s ease-out',
                    userSelect: 'none',
                    pointerEvents: 'none',
                  }}
                >
                  <img
                    src={dataUri}
                    alt={filePath}
                    draggable={false}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain',
                      display: 'block',
                    }}
                  />
                </div>
              ) : (
                /* Live Vector DOM Mode */
                <div
                  style={{
                    width: renderedWidth,
                    height: renderedHeight,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transform: previewTransform,
                    transformOrigin: 'center center',
                    transition: isDragging ? 'none' : 'transform 0.1s ease-out',
                    userSelect: 'none',
                    pointerEvents: 'none',
                  }}
                  className="svg-preview-wrapper"
                  dangerouslySetInnerHTML={{ __html: cleanHtml }}
                />
              )}
            </div>

            {/* Subtle Footer Bar */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '2px 10px',
                backgroundColor: 'var(--bg-panel)',
                borderTop: '1px solid var(--border-color)',
                fontSize: 10,
                color: 'var(--text-muted)',
                flexShrink: 0,
                userSelect: 'none',
              }}
            >
              <span>
                {fit ? 'Fit to Viewport' : `${zoomPct}%`} • {renderedWidth} × {renderedHeight}px
                {rotation > 0 ? ` • ${rotation}°` : ''}
              </span>
              <span>
                Double-click to toggle fit • Scroll to zoom • Drag to pan
              </span>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .svg-preview-wrapper {
          position: relative;
        }
        .svg-preview-wrapper svg {
          width: 100% !important;
          height: 100% !important;
          max-width: 100%;
          max-height: 100%;
          display: block;
          object-fit: contain;
        }
      `}</style>
    </div>
  );
};
