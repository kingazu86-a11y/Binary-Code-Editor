import React from 'react';
import { Check, Loader2, AlertTriangle, XCircle, Wrench } from 'lucide-react';
import { AIToolCall } from '../types/electron';

interface AIToolCallViewProps {
  toolCall: AIToolCall;
}

export const AIToolCallView: React.FC<AIToolCallViewProps> = ({ toolCall }) => {
  const getToolTitle = (name: string, params: any) => {
    switch (name) {
      case 'read_file':
        return `Read file: ${params.path || params.filePath}`;
      case 'write_file':
        return `Write file: ${params.path || params.filePath}`;
      case 'create_file':
        return `Create file: ${params.path || params.filePath}`;
      case 'delete_file':
        return `Delete file: ${params.path || params.filePath}`;
      case 'search_files':
        return `Search project: "${params.query}"`;
      case 'run_command':
        return `Run command: ${params.command}`;
      case 'list_directory':
        return `List directory: ${params.path || 'root'}`;
      default:
        return `Execute: ${name}`;
    }
  };

  const isCompleted = toolCall.status === 'completed';
  const isExecuting = toolCall.status === 'executing' || toolCall.status === 'pending';
  const isDenied = toolCall.status === 'denied';
  const isFailed = toolCall.status === 'failed';
  const requiresApproval = toolCall.status === 'requires_approval';

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '5px 10px',
        backgroundColor: 'var(--bg-card, #11151C)',
        border: '1px solid var(--border-color)',
        borderRadius: 5,
        fontSize: 11,
        color: 'var(--text-secondary)',
        margin: '4px 0',
        width: '100%',
        maxWidth: '100%',
        boxSizing: 'border-box',
        overflow: 'hidden',
      }}
    >
      {isCompleted && <Check size={13} style={{ color: 'var(--color-success)', flexShrink: 0 }} />}
      {isExecuting && <Loader2 size={13} className="animate-spin" style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />}
      {requiresApproval && <AlertTriangle size={13} style={{ color: 'var(--color-warning)', flexShrink: 0 }} />}
      {(isDenied || isFailed) && <XCircle size={13} style={{ color: 'var(--color-danger)', flexShrink: 0 }} />}

      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>
        {getToolTitle(toolCall.name, toolCall.params)}
      </span>

      <span
        style={{
          fontSize: 10,
          textTransform: 'uppercase',
          fontWeight: 600,
          color: isCompleted ? 'var(--color-success)' : isExecuting ? 'var(--accent-primary)' : 'var(--text-muted)',
        }}
      >
        {toolCall.status}
      </span>
    </div>
  );
};
