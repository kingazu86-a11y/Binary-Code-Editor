import React, { useState } from 'react';
import {
  Search,
  Replace,
  CaseSensitive,
  WholeWord,
  Regex,
  ChevronRight,
  ChevronDown,
  FileCode,
  Check,
} from 'lucide-react';
import { useWorkspace } from '../state/workspaceStore';
import { api } from '../services/api';
import { SearchFileResult } from '../types';
import { editorStore } from '../state/editorStore';

export const GlobalSearch: React.FC = () => {
  const { workspacePath } = useWorkspace();
  const [query, setQuery] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [showReplace, setShowReplace] = useState(false);
  const [isRegex, setIsRegex] = useState(false);
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);
  const [includePattern, setIncludePattern] = useState('');
  const [excludePattern, setExcludePattern] = useState('');
  const [results, setResults] = useState<SearchFileResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());

  const handleSearch = async () => {
    if (!query.trim() || !workspacePath) {
      setResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const searchResults = await api.searchProject({
        folderPath: workspacePath,
        query: query.trim(),
        isRegex,
        caseSensitive,
        wholeWord,
        includePattern: includePattern.trim() || undefined,
        excludePattern: excludePattern.trim() || undefined,
      });
      setResults(searchResults);
      // Auto expand all result files
      setExpandedFiles(new Set(searchResults.map((r) => r.filePath)));
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleReplaceAll = async () => {
    if (!query.trim() || !workspacePath || results.length === 0) return;

    try {
      await api.replaceInFiles({
        folderPath: workspacePath,
        query: query.trim(),
        replaceText,
        files: results.map((r) => r.filePath),
        isRegex,
        caseSensitive,
      });
      // Re-run search to refresh
      await handleSearch();
    } catch (err) {
      console.error('Replace all failed:', err);
    }
  };

  const toggleFile = (filePath: string) => {
    const next = new Set(expandedFiles);
    if (next.has(filePath)) next.delete(filePath);
    else next.add(filePath);
    setExpandedFiles(next);
  };

  const totalMatches = results.reduce((acc, r) => acc + r.matches.length, 0);

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: 'var(--bg-panel)',
        userSelect: 'none',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '8px 12px',
          borderBottom: '1px solid var(--border-subtle)',
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.8px',
          textTransform: 'uppercase',
          color: 'var(--text-secondary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span>SEARCH</span>
        <button
          onClick={() => setShowReplace(!showReplace)}
          style={{
            padding: 3,
            borderRadius: 3,
            color: showReplace ? 'var(--accent-primary)' : 'var(--text-muted)',
          }}
          title="Toggle Replace"
        >
          <Replace size={14} />
        </button>
      </div>

      {/* Search Input Box & Options */}
      <div style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            style={{ width: '100%', paddingRight: 74, height: 26 }}
          />

          {/* Search options buttons inside input */}
          <div style={{ position: 'absolute', right: 4, display: 'flex', gap: 2 }}>
            <button
              onClick={() => setCaseSensitive(!caseSensitive)}
              style={{
                padding: '2px 4px',
                borderRadius: 3,
                color: caseSensitive ? 'var(--accent-primary)' : 'var(--text-muted)',
                backgroundColor: caseSensitive ? 'var(--accent-subtle)' : 'transparent',
              }}
              title="Match Case (Alt+C)"
            >
              <CaseSensitive size={13} />
            </button>
            <button
              onClick={() => setWholeWord(!wholeWord)}
              style={{
                padding: '2px 4px',
                borderRadius: 3,
                color: wholeWord ? 'var(--accent-primary)' : 'var(--text-muted)',
                backgroundColor: wholeWord ? 'var(--accent-subtle)' : 'transparent',
              }}
              title="Match Whole Word (Alt+W)"
            >
              <WholeWord size={13} />
            </button>
            <button
              onClick={() => setIsRegex(!isRegex)}
              style={{
                padding: '2px 4px',
                borderRadius: 3,
                color: isRegex ? 'var(--accent-primary)' : 'var(--text-muted)',
                backgroundColor: isRegex ? 'var(--accent-subtle)' : 'transparent',
              }}
              title="Use Regular Expression (Alt+R)"
            >
              <Regex size={13} />
            </button>
          </div>
        </div>

        {/* Replace Input Box */}
        {showReplace && (
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <input
              type="text"
              placeholder="Replace"
              value={replaceText}
              onChange={(e) => setReplaceText(e.target.value)}
              style={{ flex: 1, height: 26 }}
            />
            <button
              onClick={handleReplaceAll}
              style={{
                padding: '4px 8px',
                backgroundColor: 'var(--accent-primary)',
                color: '#FFF',
                borderRadius: 4,
                fontSize: 11,
                fontWeight: 500,
              }}
              title="Replace All"
            >
              Replace All
            </button>
          </div>
        )}

        {/* Details: files to include / exclude */}
        <div style={{ display: 'flex', gap: 6 }}>
          <input
            type="text"
            placeholder="files to include (e.g. *.ts)"
            value={includePattern}
            onChange={(e) => setIncludePattern(e.target.value)}
            style={{ flex: 1, height: 22, fontSize: 11 }}
          />
          <input
            type="text"
            placeholder="files to exclude"
            value={excludePattern}
            onChange={(e) => setExcludePattern(e.target.value)}
            style={{ flex: 1, height: 22, fontSize: 11 }}
          />
        </div>
      </div>

      {/* Results Header */}
      {query && (
        <div
          style={{
            padding: '4px 12px',
            fontSize: 11,
            color: 'var(--text-muted)',
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          {isSearching ? 'Searching...' : `${totalMatches} matches in ${results.length} files`}
        </div>
      )}

      {/* Results List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }}>
        {results.map((res) => {
          const isExpanded = expandedFiles.has(res.filePath);
          const fileName = res.filePath.replace(/\\/g, '/').split('/').pop() || res.filePath;
          return (
            <div key={res.filePath} style={{ marginBottom: 2 }}>
              {/* File header */}
              <div
                onClick={() => toggleFile(res.filePath)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '4px 10px',
                  cursor: 'pointer',
                  fontSize: 12,
                  color: 'var(--text-primary)',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <span style={{ color: 'var(--text-muted)' }}>
                  {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                </span>
                <FileCode size={13} style={{ color: 'var(--accent-primary)' }} />
                <span style={{ fontWeight: 500 }}>{fileName}</span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 'auto' }}>
                  {res.matches.length}
                </span>
              </div>

              {/* Match lines */}
              {isExpanded && (
                <div style={{ paddingLeft: 24 }}>
                  {res.matches.map((m, idx) => (
                    <div
                      key={idx}
                      onClick={() => editorStore.openFile(res.filePath)}
                      style={{
                        padding: '3px 8px',
                        fontSize: 11,
                        cursor: 'pointer',
                        color: 'var(--text-secondary)',
                        fontFamily: 'var(--font-mono)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <span style={{ color: 'var(--text-muted)', width: 28 }}>{m.line}:</span>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {m.text}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
