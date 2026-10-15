import React, { useState, useEffect, useRef } from 'react';
import {
  History,
  Search,
  Plus,
  Trash2,
  X,
  MessageSquare,
} from 'lucide-react';
import { useAI, aiStore } from '../state/aiStore';

interface AIRecentChatsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function formatRelativeTime(timestamp: number): string {
  if (!timestamp) return '';
  const diffMs = Date.now() - timestamp;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay === 1) return 'Yesterday';
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(timestamp).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

export const AIRecentChatsModal: React.FC<AIRecentChatsModalProps> = ({ isOpen, onClose }) => {
  const { sessions, currentSessionId } = useAI();
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Focus search input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 40);
      setSearchQuery('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredSessions = sessions.filter((s) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      s.title.toLowerCase().includes(q) ||
      s.messages.some((m) => m.content && m.content.toLowerCase().includes(q))
    );
  });

  const handleSelectSession = (sessionId: string) => {
    aiStore.switchSession(sessionId);
    onClose();
  };

  const handleCreateNewChat = () => {
    aiStore.createSession();
    onClose();
  };

  const handleDeleteSession = (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    aiStore.deleteSession(sessionId);
  };

  const handleClearAll = () => {
    aiStore.clearAllSessions();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: 480,
          maxWidth: '100%',
          maxHeight: '75vh',
          backgroundColor: 'var(--bg-panel, #1e1e1e)',
          border: '1px solid var(--border-color, #333333)',
          borderRadius: 6,
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.45)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          color: 'var(--text-primary, #cccccc)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '10px 14px',
            borderBottom: '1px solid var(--border-color, #2d2d2d)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'var(--bg-main, #181818)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <History size={14} style={{ color: 'var(--text-muted, #888888)' }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
              Recent Chats
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              onClick={handleCreateNewChat}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: '3px 8px',
                borderRadius: 4,
                backgroundColor: 'var(--bg-card, #252526)',
                border: '1px solid var(--border-color, #333333)',
                color: 'var(--text-primary, #cccccc)',
                fontSize: 11,
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-card)')}
              title="New Chat"
            >
              <Plus size={12} />
              <span>New Chat</span>
            </button>

            <button
              onClick={onClose}
              style={{
                width: 24,
                height: 24,
                borderRadius: 4,
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted, #888888)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
                e.currentTarget.style.color = 'var(--text-primary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = 'var(--text-muted)';
              }}
              title="Close (Esc)"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div
          style={{
            padding: '8px 14px',
            borderBottom: '1px solid var(--border-color, #2d2d2d)',
          }}
        >
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Search
              size={13}
              style={{
                position: 'absolute',
                left: 8,
                color: 'var(--text-muted, #888888)',
                pointerEvents: 'none',
              }}
            />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search chats..."
              style={{
                width: '100%',
                padding: '5px 26px 5px 26px',
                fontSize: 11.5,
                backgroundColor: 'var(--bg-card, #252526)',
                border: '1px solid var(--border-color, #333333)',
                borderRadius: 4,
                color: 'var(--text-primary, #cccccc)',
                outline: 'none',
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{
                  position: 'absolute',
                  right: 6,
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: 2,
                  display: 'flex',
                  alignItems: 'center',
                }}
                title="Clear"
              >
                <X size={11} />
              </button>
            )}
          </div>
        </div>

        {/* Sessions List */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '6px 8px',
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            minHeight: 180,
            maxHeight: 380,
          }}
        >
          {filteredSessions.length === 0 ? (
            <div
              style={{
                margin: 'auto',
                textAlign: 'center',
                color: 'var(--text-muted, #888888)',
                padding: '30px 10px',
                fontSize: 12,
              }}
            >
              {searchQuery ? 'No matching chats found' : 'No recent chats'}
            </div>
          ) : (
            filteredSessions.map((s) => {
              const isCurrent = s.id === currentSessionId;
              const relativeTime = formatRelativeTime(s.updatedAt || s.createdAt);

              return (
                <div
                  key={s.id}
                  onClick={() => handleSelectSession(s.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '6px 10px',
                    borderRadius: 4,
                    backgroundColor: isCurrent ? 'var(--bg-hover, #2a2d2e)' : 'transparent',
                    cursor: 'pointer',
                    gap: 8,
                    transition: 'background-color 0.1s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!isCurrent) {
                      e.currentTarget.style.backgroundColor = 'var(--bg-hover, #2a2d2e)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isCurrent) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  {/* Left: Icon & Title */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0, flex: 1 }}>
                    <MessageSquare
                      size={13}
                      style={{
                        color: isCurrent ? 'var(--text-primary)' : 'var(--text-muted, #888888)',
                        flexShrink: 0,
                      }}
                    />
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: isCurrent ? 600 : 400,
                        color: isCurrent ? 'var(--text-primary)' : 'var(--text-secondary, #cccccc)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {s.title || 'Untitled Chat'}
                    </span>
                    {isCurrent && (
                      <span
                        style={{
                          fontSize: 9,
                          color: 'var(--text-muted)',
                          flexShrink: 0,
                        }}
                      >
                        (current)
                      </span>
                    )}
                  </div>

                  {/* Right: Timestamp & Direct Delete Button */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    {relativeTime && (
                      <span style={{ fontSize: 10.5, color: 'var(--text-muted, #888888)' }}>
                        {relativeTime}
                      </span>
                    )}

                    <button
                      onClick={(e) => handleDeleteSession(e, s.id)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-muted, #888888)',
                        cursor: 'pointer',
                        padding: 3,
                        borderRadius: 3,
                        display: 'flex',
                        alignItems: 'center',
                        opacity: 0.6,
                        transition: 'opacity 0.15s ease, color 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = '#ef4444';
                        e.currentTarget.style.opacity = '1';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = 'var(--text-muted, #888888)';
                        e.currentTarget.style.opacity = '0.6';
                      }}
                      title="Delete chat"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '8px 14px',
            borderTop: '1px solid var(--border-color, #2d2d2d)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'var(--bg-main, #181818)',
            fontSize: 10.5,
          }}
        >
          <button
            onClick={handleClearAll}
            disabled={sessions.length <= 1 && sessions[0]?.messages?.length <= 1}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted, #888888)',
              cursor:
                sessions.length <= 1 && sessions[0]?.messages?.length <= 1 ? 'default' : 'pointer',
              opacity: sessions.length <= 1 && sessions[0]?.messages?.length <= 1 ? 0.4 : 0.8,
              fontSize: 10.5,
              padding: 0,
            }}
            onMouseEnter={(e) => {
              if (sessions.length > 1 || sessions[0]?.messages?.length > 1) {
                e.currentTarget.style.color = '#ef4444';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--text-muted, #888888)';
            }}
          >
            <Trash2 size={11} />
            <span>Clear All</span>
          </button>

          <span style={{ color: 'var(--text-muted, #888888)' }}>
            Esc to close
          </span>
        </div>
      </div>
    </div>
  );
};
