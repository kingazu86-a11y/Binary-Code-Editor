import React, { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';
import { api } from '../services/api';
import { useSettings } from '../state/settingsStore';

interface XTermInstanceProps {
  id: string;
  isActive: boolean;
}

function getTerminalTheme(themeName?: string) {
  const isLight = (themeName || '').includes('light');
  if (isLight) {
    return {
      background: '#FFFFFF',
      foreground: '#24292F',
      cursor: '#0969DA',
      selectionBackground: 'rgba(9, 105, 218, 0.22)',
      black: '#24292F',
      red: '#CF222E',
      green: '#1A7F37',
      yellow: '#9A6700',
      blue: '#0969DA',
      magenta: '#8250DF',
      cyan: '#1B7C83',
      white: '#6E7781',
      brightBlack: '#57606A',
      brightRed: '#A40E26',
      brightGreen: '#116329',
      brightYellow: '#633C01',
      brightBlue: '#0550AE',
      brightMagenta: '#5A32A3',
      brightCyan: '#114B5F',
      brightWhite: '#24292F',
    };
  }
  if (themeName === 'binary-midnight') {
    return {
      background: '#080C14',
      foreground: '#E2E8F0',
      cursor: '#60A5FA',
      selectionBackground: 'rgba(59, 130, 246, 0.35)',
      black: '#0D131F',
      red: '#F87171',
      green: '#34D399',
      yellow: '#FBBF24',
      blue: '#60A5FA',
      magenta: '#C084FC',
      cyan: '#38BDF8',
      white: '#E2E8F0',
      brightBlack: '#475569',
      brightRed: '#FCA5A5',
      brightGreen: '#6EE7B7',
      brightYellow: '#FDE68A',
      brightBlue: '#93C5FD',
      brightMagenta: '#E9D5FF',
      brightCyan: '#7DD3FC',
      brightWhite: '#FFFFFF',
    };
  }
  if (themeName === 'binary-nord') {
    return {
      background: '#242933',
      foreground: '#ECEFF4',
      cursor: '#88C0D0',
      selectionBackground: 'rgba(136, 192, 208, 0.3)',
      black: '#2E3440',
      red: '#BF616A',
      green: '#A3BE8C',
      yellow: '#EBCB8B',
      blue: '#81A1C1',
      magenta: '#B48EAD',
      cyan: '#88C0D0',
      white: '#E5E9F0',
      brightBlack: '#4C566A',
      brightRed: '#D08770',
      brightGreen: '#A3BE8C',
      brightYellow: '#EBCB8B',
      brightBlue: '#88C0D0',
      brightMagenta: '#B48EAD',
      brightCyan: '#8FBCBB',
      brightWhite: '#ECEFF4',
    };
  }
  if (themeName === 'binary-monokai') {
    return {
      background: '#1E1F1C',
      foreground: '#F8F8F2',
      cursor: '#F8F8F0',
      selectionBackground: 'rgba(255, 255, 255, 0.2)',
      black: '#272822',
      red: '#F92672',
      green: '#A6E22E',
      yellow: '#E6DB74',
      blue: '#66D9EF',
      magenta: '#AE81FF',
      cyan: '#A1EFE4',
      white: '#F8F8F2',
      brightBlack: '#75715E',
      brightRed: '#F92672',
      brightGreen: '#A6E22E',
      brightYellow: '#E6DB74',
      brightBlue: '#66D9EF',
      brightMagenta: '#AE81FF',
      brightCyan: '#A1EFE4',
      brightWhite: '#F9F8F5',
    };
  }
  // Default Dark / Cyber
  return {
    background: '#090B0E',
    foreground: '#E6EAF0',
    cursor: '#3B82F6',
    selectionBackground: 'rgba(59, 130, 246, 0.3)',
    black: '#161A22',
    red: '#EF4444',
    green: '#10B981',
    yellow: '#F59E0B',
    blue: '#3B82F6',
    magenta: '#A855F7',
    cyan: '#06B6D4',
    white: '#E6EAF0',
    brightBlack: '#5C6370',
    brightRed: '#F87171',
    brightGreen: '#34D399',
    brightYellow: '#FBBF24',
    brightBlue: '#60A5FA',
    brightMagenta: '#C084FC',
    brightCyan: '#22D3EE',
    brightWhite: '#FFFFFF',
  };
}

export const XTermInstance: React.FC<XTermInstanceProps> = ({ id, isActive }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const { terminal: terminalSettings, appearance: appearanceSettings } = useSettings();

  const currentTheme = appearanceSettings?.theme || 'binary-dark';

  // Create terminal once on mount
  useEffect(() => {
    if (!containerRef.current) return;

    const term = new Terminal({
      theme: getTerminalTheme(currentTheme),
      fontFamily: terminalSettings.fontFamily || "'JetBrains Mono', Consolas, monospace",
      fontSize: terminalSettings.fontSize || 13,
      lineHeight: 1.3,
      cursorBlink: terminalSettings.cursorBlink !== false,
      cursorStyle: terminalSettings.cursorStyle || 'block',
      scrollback: terminalSettings.scrollback || 5000,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);

    // Clickable localhost / web URLs
    const webLinksAddon = new WebLinksAddon((_event, uri) => {
      api.openExternalUrl(uri);
    });
    term.loadAddon(webLinksAddon);

    term.open(containerRef.current);
    try {
      fitAddon.fit();
      api.resizeTerminal(id, term.cols, term.rows);
    } catch {}

    termRef.current = term;
    fitAddonRef.current = fitAddon;

    // Send keystrokes from frontend terminal to main process PTY
    const dataListener = term.onData((data) => {
      api.writeTerminal(id, data);
    });

    // Receive output from main process PTY and print to xterm
    const unsubData = api.onTerminalData(id, (data) => {
      term.write(data);
    });

    // Handle container resize
    const resizeObserver = new ResizeObserver(() => {
      try {
        if (containerRef.current && containerRef.current.clientWidth > 0) {
          fitAddon.fit();
          api.resizeTerminal(id, term.cols, term.rows);
        }
      } catch {}
    });
    resizeObserver.observe(containerRef.current);

    // Focus on initial mount
    term.focus();

    return () => {
      dataListener.dispose();
      unsubData();
      resizeObserver.disconnect();
      term.dispose();
    };
  }, [id]); // Note: Only depends on id, so settings changes don't destroy running terminal

  // Dynamically update terminal options and theme without destroying running session
  useEffect(() => {
    if (termRef.current) {
      const term = termRef.current;
      term.options.theme = getTerminalTheme(currentTheme);
      term.options.fontSize = terminalSettings.fontSize || 13;
      term.options.fontFamily = terminalSettings.fontFamily || "'JetBrains Mono', Consolas, monospace";
      term.options.cursorStyle = terminalSettings.cursorStyle || 'block';
      term.options.cursorBlink = terminalSettings.cursorBlink !== false;
      term.options.scrollback = terminalSettings.scrollback || 5000;
      try {
        fitAddonRef.current?.fit();
      } catch {}
    }
  }, [terminalSettings, currentTheme]);

  // When tab becomes active, refit and focus
  useEffect(() => {
    if (isActive && termRef.current && fitAddonRef.current) {
      setTimeout(() => {
        try {
          fitAddonRef.current?.fit();
          termRef.current?.focus();
        } catch {}
      }, 50);
    }
  }, [isActive]);

  const isLight = currentTheme.includes('light');

  return (
    <div
      ref={containerRef}
      style={{
        flex: 1,
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        backgroundColor: isLight ? '#FFFFFF' : 'var(--bg-panel, #090B0E)',
        padding: '4px 6px',
      }}
    />
  );
};
