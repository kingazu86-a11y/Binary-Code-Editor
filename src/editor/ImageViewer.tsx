import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  ZoomIn, ZoomOut, RotateCw, Maximize2, Minimize2,
  Grid, Image as ImageIcon, AlertTriangle, RefreshCw,
  Copy, Check, FlipHorizontal, FlipVertical, Sun, Moon,
  Sparkles,
} from 'lucide-react';
import { editorStore } from '../state/editorStore';

interface ImageViewerProps {
  filePath: string;
  dataUrl: string;      // base64 data URL or empty
  fileName: string;
  isError?: boolean;    // true if content starts with __ERROR__
  errorMessage?: string;
  tabId?: string;
}

const ZOOM_STEPS = [0.1, 0.25, 0.33, 0.5, 0.67, 0.75, 1, 1.25, 1.5, 2, 3, 4, 6, 8, 12, 16];

type BgMode = 'dark' | 'light' | 'checker';

export const ImageViewer: React.FC<ImageViewerProps> = ({
  filePath, dataUrl, fileName, isError, errorMessage, tabId,
}) => {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  const [bgMode, setBgMode] = useState<BgMode>('checker');
  const [fit, setFit] = useState(true);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [imgNatural, setImgNatural] = useState<{ w: number; h: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [copied, setCopied] = useState(false);
  const [pixelated, setPixelated] = useState(false);

  const dragStart = useRef<{ mx: number; my: number; ox: number; oy: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // Reset viewer state when active file changes
  useEffect(() => {
    setZoom(1);
    setRotation(0);
    setFlipH(false);
    setFlipV(false);
    setFit(true);
    setPanOffset({ x: 0, y: 0 });
    setImgLoaded(false);
    setImgError(false);
    setImgNatural(null);
    setCopied(false);
  }, [filePath, dataUrl]);

  // If image is already cached / decoded in DOM
  useEffect(() => {
    if (imgRef.current && imgRef.current.complete && imgRef.current.naturalWidth > 0) {
      setImgNatural({ w: imgRef.current.naturalWidth, h: imgRef.current.naturalHeight });
      setImgLoaded(true);
      setImgError(false);
    }
  }, [dataUrl]);

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

  const rotate = () => setRotation((r) => (r + 90) % 360);

  const toggleFit = () => {
    if (fit) {
      setFit(false);
      setZoom(1);
    } else {
      setFit(true);
      setPanOffset({ x: 0, y: 0 });
    }
  };

  const resetView = () => {
    setZoom(1);
    setRotation(0);
    setFlipH(false);
    setFlipV(false);
    setFit(true);
    setPanOffset({ x: 0, y: 0 });
  };

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setFit(false);
    if (e.deltaY < 0) {
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
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (fit) return;
    if (e.button !== 0 && e.button !== 1) return;
    dragStart.current = { mx: e.clientX, my: e.clientY, ox: panOffset.x, oy: panOffset.y };
    setIsDragging(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !dragStart.current) return;
    setPanOffset({
      x: dragStart.current.ox + (e.clientX - dragStart.current.mx),
      y: dragStart.current.oy + (e.clientY - dragStart.current.my),
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    dragStart.current = null;
  };

  const handleImgLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setImgNatural({ w: img.naturalWidth, h: img.naturalHeight });
    setImgLoaded(true);
    setImgError(false);
  };

  const handleImgError = () => {
    setImgLoaded(true);
    setImgError(true);
  };

  const handleCopy = async () => {
    if (!dataUrl) return;
    try {
      if (dataUrl.startsWith('data:image/png;base64,')) {
        const res = await fetch(dataUrl);
        const blob = await res.blob();
        await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
      } else {
        await navigator.clipboard.writeText(dataUrl);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      await navigator.clipboard.writeText(dataUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleReload = () => {
    if (tabId) {
      editorStore.reloadTab(tabId);
    } else {
      editorStore.openFile(filePath);
    }
  };

  const zoomPct = Math.round(zoom * 100);
  const ext = fileName.split('.').pop()?.toUpperCase() || 'IMG';

  // Calculate Aspect Ratio string
  const aspectRatio = (() => {
    if (!imgNatural || !imgNatural.w || !imgNatural.h) return null;
    const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
    const divisor = gcd(imgNatural.w, imgNatural.h);
    const rW = imgNatural.w / divisor;
    const rH = imgNatural.h / divisor;
    if (rW <= 32 && rH <= 32) return `${rW}:${rH}`;
    return (imgNatural.w / imgNatural.h).toFixed(2) + ':1';
  })();

  // Background styles - subtle, neutral, minimalist
  const bgStyles: React.CSSProperties = (() => {
    if (bgMode === 'checker') {
      return {
        backgroundColor: '#0E1015',
        backgroundImage: `
          linear-gradient(45deg, #151820 25%, transparent 25%),
          linear-gradient(-45deg, #151820 25%, transparent 25%),
          linear-gradient(45deg, transparent 75%, #151820 75%),
          linear-gradient(-45deg, transparent 75%, #151820 75%)
        `,
        backgroundSize: '16px 16px',
        backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
      };
    }
    if (bgMode === 'light') {
      return { backgroundColor: '#E2E8F0' };
    }
    return { backgroundColor: '#0D0F12' };
  })();

  // ── No dataUrl + no error = loading failed silently ──────────────────────────
  if (!dataUrl && !isError) {
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
          backgroundColor: '#0D0F12',
          color: 'var(--text-muted)',
          padding: 24,
        }}
      >
        <AlertTriangle size={24} style={{ color: 'var(--text-muted)' }} />
        <div style={{ textAlign: 'center', maxWidth: 360 }}>
          <p style={{ fontSize: 13, color: 'var(--text-primary)', marginBottom: 4, fontWeight: 500 }}>
            Unable to Load Image
          </p>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
            The image could not be read from disk.
          </p>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6, wordBreak: 'break-all', fontFamily: 'monospace' }}>
            {filePath}
          </p>
        </div>
        <button
          onClick={handleReload}
          className="toolbar-btn"
          style={{
            marginTop: 4,
            border: '1px solid var(--border-color)',
            padding: '4px 12px',
            color: 'var(--text-primary)',
            fontSize: 11,
            gap: 6,
          }}
        >
          <RefreshCw size={12} />
          Retry
        </button>
      </div>
    );
  }

  // ── Error / Corrupted state ────────────────────────────────────────────────
  if (isError || imgError) {
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
          backgroundColor: '#0D0F12',
          color: 'var(--text-muted)',
          padding: 24,
        }}
      >
        <AlertTriangle size={24} style={{ color: 'var(--text-muted)' }} />
        <div style={{ textAlign: 'center', maxWidth: 360 }}>
          <p style={{ fontSize: 13, color: 'var(--text-primary)', marginBottom: 4, fontWeight: 500 }}>
            Cannot Display Image
          </p>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
            {errorMessage || 'This image file is corrupted or in an unsupported format.'}
          </p>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6, wordBreak: 'break-all', fontFamily: 'monospace' }}>
            {filePath}
          </p>
        </div>
        <button
          onClick={handleReload}
          className="toolbar-btn"
          style={{
            marginTop: 4,
            border: '1px solid var(--border-color)',
            padding: '4px 12px',
            color: 'var(--text-primary)',
            fontSize: 11,
            gap: 6,
          }}
        >
          <RefreshCw size={12} />
          Reload
        </button>
      </div>
    );
  }

  const transformString = fit
    ? `rotate(${rotation}deg) scaleX(${flipH ? -1 : 1}) scaleY(${flipV ? -1 : 1})`
    : `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom}) rotate(${rotation}deg) scaleX(${flipH ? -1 : 1}) scaleY(${flipV ? -1 : 1})`;

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        backgroundColor: '#0D0F12',
        userSelect: 'none',
      }}
    >
      {/* ── Minimalist Toolbar ────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          padding: '4px 10px',
          backgroundColor: 'var(--bg-panel)',
          borderBottom: '1px solid var(--border-color)',
          flexShrink: 0,
          flexWrap: 'wrap',
          minHeight: 34,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginRight: 8, minWidth: 0, flex: '1 1 180px' }}>
          <ImageIcon size={13} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
          <span
            style={{
              fontSize: 12,
              color: 'var(--text-primary)',
              fontWeight: 500,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
            title={filePath}
          >
            {fileName}
          </span>
          <span
            style={{
              fontSize: 10,
              fontWeight: 500,
              padding: '1px 4px',
              borderRadius: 3,
              backgroundColor: 'var(--bg-card)',
              color: 'var(--text-muted)',
              border: '1px solid var(--border-color)',
              textTransform: 'uppercase',
            }}
          >
            {ext}
          </span>
          {imgNatural && (
            <span
              style={{
                fontSize: 11,
                color: 'var(--text-muted)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                whiteSpace: 'nowrap',
              }}
            >
              <span>{imgNatural.w} × {imgNatural.h}</span>
              {aspectRatio && <span style={{ opacity: 0.6 }}>({aspectRatio})</span>}
            </span>
          )}
        </div>

        {/* Minimalist Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 2, marginLeft: 'auto' }}>
          {/* Zoom Indicator */}
          <button
            title="Click to reset zoom to 100%"
            onClick={() => { setFit(false); setZoom(1); setPanOffset({ x: 0, y: 0 }); }}
            style={{
              fontSize: 11,
              color: 'var(--text-secondary)',
              minWidth: 38,
              textAlign: 'center',
              padding: '1px 5px',
              backgroundColor: 'transparent',
              borderRadius: 3,
              border: '1px solid var(--border-color)',
              cursor: 'pointer',
              fontWeight: 500,
              marginRight: 2,
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
            title={fit ? 'View 100% Size' : 'Fit to Window'}
            onClick={toggleFit}
            className={`toolbar-btn${fit ? ' toolbar-btn-active' : ''}`}
          >
            {fit ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          </button>

          <div style={{ width: 1, height: 12, backgroundColor: 'var(--border-color)', margin: '0 2px' }} />

          <button title="Rotate 90° Clockwise" onClick={rotate} className="toolbar-btn">
            <RotateCw size={13} />
          </button>
          <button
            title="Flip Horizontal"
            onClick={() => setFlipH((h) => !h)}
            className={`toolbar-btn${flipH ? ' toolbar-btn-active' : ''}`}
          >
            <FlipHorizontal size={13} />
          </button>
          <button
            title="Flip Vertical"
            onClick={() => setFlipV((v) => !v)}
            className={`toolbar-btn${flipV ? ' toolbar-btn-active' : ''}`}
          >
            <FlipVertical size={13} />
          </button>

          <div style={{ width: 1, height: 12, backgroundColor: 'var(--border-color)', margin: '0 2px' }} />

          {/* Background Modes */}
          <button
            title="Dark Background"
            onClick={() => setBgMode('dark')}
            className={`toolbar-btn${bgMode === 'dark' ? ' toolbar-btn-active' : ''}`}
          >
            <Moon size={13} />
          </button>
          <button
            title="Light Background"
            onClick={() => setBgMode('light')}
            className={`toolbar-btn${bgMode === 'light' ? ' toolbar-btn-active' : ''}`}
          >
            <Sun size={13} />
          </button>
          <button
            title="Checkerboard"
            onClick={() => setBgMode('checker')}
            className={`toolbar-btn${bgMode === 'checker' ? ' toolbar-btn-active' : ''}`}
          >
            <Grid size={13} />
          </button>

          <div style={{ width: 1, height: 12, backgroundColor: 'var(--border-color)', margin: '0 2px' }} />

          {/* Pixelated Smoothing Toggle */}
          <button
            title={pixelated ? 'Crisp Pixels: On' : 'Crisp Pixels: Off'}
            onClick={() => setPixelated((p) => !p)}
            className={`toolbar-btn${pixelated ? ' toolbar-btn-active' : ''}`}
          >
            <Sparkles size={13} />
          </button>

          {/* Copy */}
          <button
            title={copied ? 'Copied' : 'Copy Data URL'}
            onClick={handleCopy}
            className={`toolbar-btn${copied ? ' toolbar-btn-active' : ''}`}
          >
            {copied ? <Check size={13} /> : <Copy size={13} />}
          </button>

          {/* Reset */}
          <button title="Reset View" onClick={resetView} className="toolbar-btn">
            <RefreshCw size={13} />
          </button>
        </div>
      </div>

      {/* ── Canvas ──────────────────────────────────────────────────────── */}
      <div
        ref={containerRef}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onDoubleClick={toggleFit}
        style={{
          flex: 1,
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          cursor: fit ? 'default' : isDragging ? 'grabbing' : 'grab',
          ...bgStyles,
        }}
      >
        {/* Loading Spinner Overlay */}
        {!imgLoaded && !imgError && dataUrl && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              backgroundColor: 'rgba(13, 15, 18, 0.8)',
              zIndex: 10,
              color: 'var(--text-muted)',
            }}
          >
            <div
              style={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                border: '2px solid var(--border-color)',
                borderTopColor: 'var(--text-secondary)',
                animation: 'spin 0.8s linear infinite',
              }}
            />
            <span style={{ fontSize: 11 }}>Loading…</span>
          </div>
        )}

        {/* The Image Element */}
        <img
          ref={imgRef}
          src={dataUrl}
          alt={fileName}
          onLoad={handleImgLoad}
          onError={handleImgError}
          draggable={false}
          style={{
            display: 'block',
            maxWidth: fit ? '95%' : undefined,
            maxHeight: fit ? '95%' : undefined,
            width: fit ? 'auto' : undefined,
            height: fit ? 'auto' : undefined,
            transform: transformString,
            transformOrigin: 'center center',
            transition: isDragging ? 'none' : 'transform 0.1s ease-out',
            imageRendering: pixelated || zoom >= 3 ? 'pixelated' : 'auto',
            opacity: imgLoaded ? 1 : 0,
            pointerEvents: fit ? 'auto' : 'none',
          }}
        />
      </div>

      {/* ── Status Bar Footer ─────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '3px 10px',
          backgroundColor: 'var(--bg-panel)',
          borderTop: '1px solid var(--border-color)',
          fontSize: 11,
          color: 'var(--text-muted)',
          flexShrink: 0,
        }}
      >
        <span>
          {fit ? 'Fit' : `${zoomPct}%`}
          {rotation > 0 ? ` • ${rotation}°` : ''}
          {flipH || flipV ? ` • Flip ${[flipH && 'H', flipV && 'V'].filter(Boolean).join('')}` : ''}
        </span>
        <span>
          Scroll to zoom • Drag to pan • Double-click for fit
        </span>
      </div>
    </div>
  );
};
