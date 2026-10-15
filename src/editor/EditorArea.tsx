import React, { useState, useEffect, useRef } from 'react';
import { useEditor } from '../state/editorStore';
import { EditorGroup } from './EditorGroup';

export const EditorArea: React.FC = () => {
  const { groups, splitDirection } = useEditor();
  const [sizes, setSizes] = useState<number[]>([]);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const dragInfoRef = useRef<{
    index: number;
    startPos: number;
    initialSizeA: number;
    initialSizeB: number;
    totalPixels: number;
  } | null>(null);

  // Synchronize sizes array whenever the number of groups changes
  useEffect(() => {
    if (groups.length <= 1) {
      setSizes([100]);
    } else if (sizes.length !== groups.length) {
      const equalShare = 100 / groups.length;
      setSizes(new Array(groups.length).fill(equalShare));
    }
  }, [groups.length]);

  const handleResizerMouseDown = (index: number, e: React.MouseEvent) => {
    e.preventDefault();
    const container = document.getElementById('binary-editor-area-container');
    if (!container) return;

    const isHorizontal = splitDirection === 'horizontal';
    const rect = container.getBoundingClientRect();
    const totalPixels = isHorizontal ? rect.width : rect.height;
    const startPos = isHorizontal ? e.clientX : e.clientY;

    const currentSizes = sizes.length === groups.length ? [...sizes] : new Array(groups.length).fill(100 / groups.length);

    dragInfoRef.current = {
      index,
      startPos,
      initialSizeA: currentSizes[index],
      initialSizeB: currentSizes[index + 1],
      totalPixels: Math.max(100, totalPixels),
    };
    setDraggingIndex(index);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!dragInfoRef.current) return;
      const { index: idx, startPos: sPos, initialSizeA, initialSizeB, totalPixels: totPix } = dragInfoRef.current;

      const currentPos = isHorizontal ? moveEvent.clientX : moveEvent.clientY;
      const deltaPercent = ((currentPos - sPos) / totPix) * 100;

      const combined = initialSizeA + initialSizeB;
      const minPercent = 12; // Minimum pane dimension percentage
      const maxPercent = combined - minPercent;

      const newSizeA = Math.max(minPercent, Math.min(maxPercent, initialSizeA + deltaPercent));
      const newSizeB = combined - newSizeA;

      setSizes((prev) => {
        const next = prev.length === groups.length ? [...prev] : new Array(groups.length).fill(100 / groups.length);
        next[idx] = newSizeA;
        next[idx + 1] = newSizeB;
        return next;
      });
    };

    const handleMouseUp = () => {
      setDraggingIndex(null);
      dragInfoRef.current = null;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  if (groups.length <= 1 || !splitDirection) {
    return (
      <div
        id="binary-editor-area-container"
        style={{ flex: 1, height: '100%', display: 'flex', overflow: 'hidden' }}
      >
        <EditorGroup group={groups[0]} />
      </div>
    );
  }

  const isHorizontal = splitDirection === 'horizontal';
  const effectiveSizes = sizes.length === groups.length ? sizes : new Array(groups.length).fill(100 / groups.length);

  return (
    <div
      id="binary-editor-area-container"
      style={{
        flex: 1,
        height: '100%',
        display: 'flex',
        flexDirection: isHorizontal ? 'row' : 'column',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {groups.map((group, idx) => {
        const paneSize = effectiveSizes[idx] ?? (100 / groups.length);
        return (
          <React.Fragment key={group.id}>
            <div
              style={{
                width: isHorizontal ? `${paneSize}%` : '100%',
                height: isHorizontal ? '100%' : `${paneSize}%`,
                overflow: 'hidden',
                display: 'flex',
                position: 'relative',
              }}
            >
              <EditorGroup group={group} />
            </div>

            {idx < groups.length - 1 && (
              <div
                onMouseDown={(e) => handleResizerMouseDown(idx, e)}
                className={
                  isHorizontal
                    ? `resizer-x ${draggingIndex === idx ? 'resizing' : ''}`
                    : `resizer-y ${draggingIndex === idx ? 'resizing' : ''}`
                }
                style={{
                  backgroundColor:
                    draggingIndex === idx ? 'var(--accent-primary)' : 'var(--border-color)',
                  flexShrink: 0,
                }}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};
