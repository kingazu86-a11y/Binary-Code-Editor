import React from 'react';
import { Bot, User, Copy, Check, FileCode } from 'lucide-react';
import { AIMessage } from '../types/electron';
import { AIToolCallView } from './AIToolCallView';
import { AIDiffReview } from './AIDiffReview';

interface AIChatMessageProps {
  message: AIMessage;
}

export const AIChatMessage: React.FC<AIChatMessageProps> = ({ message }) => {
  const isUser = message.role === 'user';
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const renderLineWithInlineCode = (text: string) => {
    if (!text.includes('`')) return text;
    const parts = text.split(/(`[^`]+`)/g);
    return parts.map((part, pIdx) => {
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code
            key={pIdx}
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              padding: '1px 5px',
              borderRadius: 3,
              backgroundColor: 'var(--bg-main)',
              border: '1px solid var(--border-color)',
              color: 'var(--accent-primary)',
              wordBreak: 'break-word',
              overflowWrap: 'anywhere',
              userSelect: 'text',
              cursor: 'text',
            }}
          >
            {part.slice(1, -1)}
          </code>
        );
      }
      return part;
    });
  };

  // Basic markdown formatting helper for code blocks, bold, lists
  const renderFormattedContent = (content: string) => {
    const lines = content.split('\n');
    let inCodeBlock = false;
    let codeContent = '';
    const elements: React.ReactNode[] = [];

    lines.forEach((line, idx) => {
      if (line.startsWith('```')) {
        if (inCodeBlock) {
          elements.push(
            <pre
              key={`code_${idx}`}
              className="chat-selectable"
              style={{
                backgroundColor: 'var(--bg-main)',
                border: '1px solid var(--border-color)',
                borderRadius: 5,
                padding: '8px 12px',
                fontSize: 11,
                fontFamily: 'var(--font-mono)',
                color: 'var(--text-primary)',
                overflowX: 'auto',
                maxWidth: '100%',
                boxSizing: 'border-box',
                margin: '6px 0',
                wordBreak: 'break-word',
                userSelect: 'text',
                cursor: 'text',
              }}
            >
              <code style={{ userSelect: 'text', cursor: 'text' }}>{codeContent.trim()}</code>
            </pre>
          );
          codeContent = '';
          inCodeBlock = false;
        } else {
          inCodeBlock = true;
        }
        return;
      }

      if (inCodeBlock) {
        codeContent += line + '\n';
        return;
      }

      // Headers
      if (line.startsWith('### ')) {
        elements.push(
          <h4
            key={idx}
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: 'var(--text-primary)',
              margin: '8px 0 4px',
              wordBreak: 'break-word',
              overflowWrap: 'anywhere',
              userSelect: 'text',
              cursor: 'text',
            }}
          >
            {renderLineWithInlineCode(line.replace('### ', ''))}
          </h4>
        );
        return;
      }

      // Bullet points
      if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
        elements.push(
          <div
            key={idx}
            style={{
              paddingLeft: 12,
              position: 'relative',
              margin: '2px 0',
              wordBreak: 'break-word',
              overflowWrap: 'anywhere',
              userSelect: 'text',
              cursor: 'text',
            }}
          >
            <span style={{ position: 'absolute', left: 2, color: 'var(--text-muted)' }}>•</span>
            <span>{renderLineWithInlineCode(line.replace(/^[\s\-\*]+/, ''))}</span>
          </div>
        );
        return;
      }

      if (line.trim().length === 0) {
        elements.push(<div key={idx} style={{ height: 6 }} />);
        return;
      }

      // Normal text
      elements.push(
        <p
          key={idx}
          style={{
            margin: '2px 0',
            lineHeight: 1.5,
            wordBreak: 'break-word',
            overflowWrap: 'anywhere',
            whiteSpace: 'pre-wrap',
            userSelect: 'text',
            cursor: 'text',
          }}
        >
          {renderLineWithInlineCode(line)}
        </p>
      );
    });

    return elements;
  };

  return (
    <div
      className="chat-selectable"
      style={{
        display: 'flex',
        gap: 10,
        padding: '10px 12px',
        backgroundColor: isUser ? 'rgba(255, 255, 255, 0.02)' : 'transparent',
        borderBottom: '1px solid var(--border-subtle)',
        width: '100%',
        maxWidth: '100%',
        boxSizing: 'border-box',
        overflow: 'hidden',
        userSelect: 'text',
      }}
    >
      {/* Avatar */}
      <div
        style={{
          width: 24,
          height: 24,
          borderRadius: 4,
          backgroundColor: 'var(--bg-card)',
          color: isUser ? 'var(--text-muted)' : 'var(--text-primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          border: '1px solid var(--border-color)',
          userSelect: 'none',
        }}
      >
        {isUser ? <User size={13} /> : <Bot size={13} />}
      </div>

      {/* Body */}
      <div style={{ flex: 1, minWidth: 0, fontSize: 12, overflow: 'hidden', overflowWrap: 'anywhere', wordBreak: 'break-word', userSelect: 'text' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, flex: 1, overflow: 'hidden' }}>
            <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 12, flexShrink: 0, userSelect: 'text' }}>
              {isUser ? 'You' : 'Binary AI'}
            </span>
            {message.model && (
              <span
                style={{
                  fontSize: 10,
                  color: 'var(--text-muted)',
                  backgroundColor: 'var(--bg-card)',
                  padding: '1px 5px',
                  borderRadius: 3,
                  border: '1px solid var(--border-color)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{message.model}</span>
                {message.modelType && (
                  <span
                    style={{
                      fontSize: 9,
                      fontWeight: 600,
                      color: 'var(--text-muted)',
                      textTransform: 'uppercase',
                      flexShrink: 0,
                    }}
                  >
                    • {message.modelType}
                  </span>
                )}
              </span>
            )}
          </div>

          {!isUser && message.content && (
            <button
              onClick={handleCopy}
              style={{ padding: 2, borderRadius: 3, color: 'var(--text-muted)', flexShrink: 0, userSelect: 'none' }}
              title="Copy response"
            >
              {copied ? <Check size={12} style={{ color: 'var(--color-success)' }} /> : <Copy size={12} />}
            </button>
          )}
        </div>

        {/* Attached Files Chips in message */}
        {message.attachedFiles && message.attachedFiles.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8, maxWidth: '100%' }}>
            {message.attachedFiles.map((file, fIdx) => (
              <div
                key={fIdx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '2px 7px',
                  borderRadius: 4,
                  backgroundColor: 'var(--bg-panel)',
                  border: '1px solid var(--border-color)',
                  fontSize: 11,
                  color: 'var(--accent-primary)',
                  maxWidth: '100%',
                  minWidth: 0,
                  userSelect: 'text',
                }}
              >
                <FileCode size={11} style={{ flexShrink: 0 }} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</span>
              </div>
            ))}
          </div>
        )}

        {/* Formatted Text Content */}
        <div
          className="chat-selectable"
          style={{
            color: 'var(--text-primary)',
            width: '100%',
            maxWidth: '100%',
            minWidth: 0,
            overflowWrap: 'anywhere',
            wordBreak: 'break-word',
            userSelect: 'text',
            cursor: 'text',
          }}
        >
          {renderFormattedContent(message.content)}
        </div>

        {/* Tool Call Timeline */}
        {message.toolCalls && message.toolCalls.length > 0 && (
          <div style={{ marginTop: 8 }}>
            {message.toolCalls.map((tc) => (
              <AIToolCallView key={tc.id} toolCall={tc} />
            ))}
          </div>
        )}

        {/* Diff Review Proposal */}
        {message.diffProposal && (
          <AIDiffReview messageId={message.id} diffProposal={message.diffProposal} />
        )}
      </div>
    </div>
  );
};
