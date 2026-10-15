import React, { useState } from 'react';
import { useSettings, settingsStore } from '../../state/settingsStore';
import { SettingRow, SettingSectionHeader, ToggleSwitch } from '../components/SettingRow';
import { Eye, EyeOff } from 'lucide-react';

interface Props {
  scope: 'user' | 'workspace';
}

export const AISettingsView: React.FC<Props> = ({ scope }) => {
  const settings = useSettings();
  const ai = settings.ai || {
    provider: 'builtin',
    endpoint: 'http://localhost:11434/v1',
    apiKey: '',
    model: 'gpt-4o',
    temperature: 0.2,
    maxTokens: 4096,
    autoApproveSafeTools: true,
    systemPromptExtra: '',
  };

  const [showKey, setShowKey] = useState(false);

  const update = (field: string, val: any) => {
    settingsStore.updateSettings({
      ai: { ...ai, [field]: val },
    }, scope);
  };

  const getDefaultEndpoint = (provider: string) => {
    switch (provider) {
      case 'openai':
        return 'https://api.openai.com/v1';
      case 'anthropic':
        return 'https://api.anthropic.com/v1';
      case 'gemini':
        return 'https://generativelanguage.googleapis.com/v1beta';
      case 'ollama':
        return 'http://localhost:11434/v1';
      default:
        return 'http://localhost:11434/v1';
    }
  };

  const handleProviderChange = (newProvider: any) => {
    update('provider', newProvider);
    if (!ai.endpoint || ai.endpoint.includes('localhost') || ai.endpoint.includes('api.')) {
      update('endpoint', getDefaultEndpoint(newProvider));
    }
  };

  return (
    <div>
      <SettingSectionHeader
        title="Binary AI Agent Configuration"
        subtitle="Configure LLM model providers, API credentials, context window limits, and automated tool authorizations"
      />

      <SettingRow
        title="AI Provider"
        description="Choose the intelligence engine or backend service used for code generation and refactoring."
      >
        <select
          value={ai.provider || 'builtin'}
          onChange={(e) => handleProviderChange(e.target.value)}
          style={{ width: '100%', maxWidth: 260, minWidth: 160, height: 28 }}
        >
          <option value="builtin">Built-in Intelligent Engine (Offline)</option>
          <option value="openai">OpenAI (GPT-4o, GPT-4 Turbo)</option>
          <option value="anthropic">Anthropic (Claude 3.5 Sonnet)</option>
          <option value="gemini">Google Gemini (Gemini 1.5 Pro)</option>
          <option value="ollama">Ollama (Local Open Source LLM)</option>
        </select>
      </SettingRow>

      <SettingRow
        title="API Endpoint URL"
        description="The base URL endpoint for API requests (compatible with OpenAI-standard chat completions)."
      >
        <input
          type="text"
          value={ai.endpoint || ''}
          onChange={(e) => update('endpoint', e.target.value)}
          placeholder="e.g. https://api.openai.com/v1"
          style={{ width: '100%', maxWidth: 280, minWidth: 160, height: 28 }}
        />
      </SettingRow>

      <SettingRow
        title="API Key / Token"
        description="Secret API authentication key (stored securely in local user settings)."
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', maxWidth: 280 }}>
          <input
            type={showKey ? 'text' : 'password'}
            value={ai.apiKey || ''}
            onChange={(e) => update('apiKey', e.target.value)}
            placeholder="sk-..."
            style={{ width: '100%', minWidth: 140, height: 28 }}
          />
          <button
            type="button"
            onClick={() => setShowKey(!showKey)}
            style={{ padding: 6, color: 'var(--text-muted)', flexShrink: 0 }}
            title={showKey ? 'Hide key' : 'Show key'}
          >
            {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>
      </SettingRow>

      <SettingRow
        title="Model Identifier"
        description="Specific model name tag sent in payload requests."
      >
        <input
          type="text"
          value={ai.model || ''}
          onChange={(e) => update('model', e.target.value)}
          placeholder="e.g. gpt-4o, claude-3-5-sonnet, llama3"
          style={{ width: '100%', maxWidth: 220, minWidth: 140, height: 28 }}
        />
      </SettingRow>

      <SettingRow
        title="Generation Temperature"
        description="Controls randomness: Lower values (0.0 - 0.3) produce precise, deterministic code."
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={ai.temperature !== undefined ? ai.temperature : 0.2}
            onChange={(e) => update('temperature', parseFloat(e.target.value))}
            style={{ width: 120 }}
          />
          <span style={{ fontSize: 12, minWidth: 35, textAlign: 'right' }}>
            {ai.temperature !== undefined ? ai.temperature.toFixed(2) : '0.20'}
          </span>
        </div>
      </SettingRow>

      <SettingRow
        title="Max Generation Tokens"
        description="Maximum tokens allowed in a single assistant response."
      >
        <input
          type="number"
          min={512}
          max={32768}
          step={512}
          value={ai.maxTokens || 4096}
          onChange={(e) => update('maxTokens', parseInt(e.target.value, 10) || 4096)}
          style={{ width: 120, height: 28 }}
        />
      </SettingRow>

      <SettingSectionHeader
        title="Agent Permissions & Safety"
        subtitle="Configure autonomous tool authorization and sandbox boundaries"
      />

      <SettingRow
        title="Auto-Approve Safe Read Tools"
        description="Allow the AI agent to read workspace files, inspect directory trees, and search project tokens without prompting for manual confirmation."
      >
        <ToggleSwitch
          checked={ai.autoApproveSafeTools !== false}
          onChange={(v) => update('autoApproveSafeTools', v)}
        />
      </SettingRow>

      <div style={{ padding: '12px 0' }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 3 }}>
          Custom System Prompt Directives
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>
          Append custom instructions to the AI system prompt (e.g. coding standards, preferred frameworks).
        </div>
        <textarea
          rows={3}
          value={ai.systemPromptExtra || ''}
          onChange={(e) => update('systemPromptExtra', e.target.value)}
          placeholder="e.g. Always write strict TypeScript types, prefer functional components, use Tailwind utilities..."
          style={{ width: '100%', resize: 'vertical', fontSize: 12 }}
        />
      </div>
    </div>
  );
};
