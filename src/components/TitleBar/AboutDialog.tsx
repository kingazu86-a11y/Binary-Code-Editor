import React, { useEffect } from 'react';
import {
  X,
  Code2,
  Globe,
  Linkedin,
  ExternalLink,
  Cpu,
  Layers,
  Smartphone,
  Monitor,
} from 'lucide-react';
import { api } from '../../services/api';

interface AboutDialogProps {
  open: boolean;
  onClose: () => void;
}

export const AboutDialog: React.FC<AboutDialogProps> = ({ open, onClose }) => {
  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          zIndex: 999,
        }}
      />

      {/* Dialog */}
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 1000,
          width: 500,
          maxWidth: 'calc(100vw - 32px)',
          backgroundColor: 'var(--bg-modal, #0D1117)',
          border: '1px solid var(--border-color)',
          borderRadius: 12,
          boxShadow: 'var(--shadow-menu, 0 16px 40px rgba(0,0,0,0.6))',
          overflow: 'hidden',
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
          color: 'var(--text-primary)',
        }}
      >
        {/* Top border accent — static, no animation */}
        <div style={{ height: 2, backgroundColor: '#6366F1' }} />

        {/* Top section */}
        <div
          style={{
            padding: '24px 24px 0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
          }}
        >
          {/* App identity */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 10,
                backgroundColor: '#6366F1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 13,
                fontWeight: 700,
                color: '#fff',
                letterSpacing: '1px',
                flexShrink: 0,
              }}
            >
              01
            </div>
            <div>
              <div
                style={{
                  fontSize: 20,
                  fontWeight: 700,
                  color: '#E6EAF0',
                  letterSpacing: '0.5px',
                }}
              >
                BINARY
              </div>
              <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>
                Professional AI Code Editor · v1.0.0
              </div>
            </div>
          </div>

          {/* Close button */}
          <button
            onClick={onClose}
            title="Close"
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'rgba(255,255,255,0.4)',
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(225,29,72,0.15)';
              e.currentTarget.style.color = '#F87171';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = 'rgba(255,255,255,0.4)';
            }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Tagline */}
        <p
          style={{
            margin: '10px 24px 0',
            fontSize: 12,
            color: 'rgba(255,255,255,0.4)',
            lineHeight: 1.6,
          }}
        >
          A professional AI-powered code editor — built for modern developers who demand
          intelligent assistance, speed, and a seamless coding experience.
        </p>

        {/* Divider */}
        <div
          style={{
            height: 1,
            margin: '20px 24px 0',
            backgroundColor: 'rgba(255,255,255,0.06)',
          }}
        />

        {/* Developer card */}
        <div style={{ padding: '18px 24px' }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: '1.2px',
              textTransform: 'uppercase',
              color: 'rgba(99,102,241,0.7)',
              marginBottom: 12,
            }}
          >
            Built By
          </div>

          <div
            style={{
              backgroundColor: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 10,
              padding: '16px 18px',
            }}
          >
            {/* Avatar + name row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              {/* Avatar */}
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  backgroundColor: '#6366F1',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 16,
                  fontWeight: 700,
                  color: '#fff',
                  flexShrink: 0,
                }}
              >
                AH
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#E6EAF0' }}>
                  Azan Haider
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: 'rgba(255,255,255,0.4)',
                    marginTop: 3,
                    lineHeight: 1.5,
                  }}
                >
                  Professional Agentic AI Software Developer
                </div>
              </div>
            </div>

            {/* Specializations */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
              {[
                { icon: <Cpu size={11} />, label: 'Agentic AI' },
                { icon: <Globe size={11} />, label: 'Web' },
                { icon: <Smartphone size={11} />, label: 'Mobile' },
                { icon: <Monitor size={11} />, label: 'Desktop' },
              ].map(({ icon, label }) => (
                <span
                  key={label}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    padding: '3px 9px',
                    borderRadius: 20,
                    fontSize: 11,
                    fontWeight: 500,
                    color: 'rgba(165,180,252,0.85)',
                    backgroundColor: 'rgba(99,102,241,0.1)',
                    border: '1px solid rgba(99,102,241,0.18)',
                  }}
                >
                  {icon}
                  {label}
                </span>
              ))}
            </div>

            {/* Profile links */}
            <div style={{ display: 'flex', gap: 8 }}>
              <ProfileLink
                icon={<Linkedin size={13} />}
                label="LinkedIn"
                href="https://www.linkedin.com/in/azan-haider-4a5115434"
                color="#0A66C2"
              />
              <ProfileLink
                icon={<Globe size={13} />}
                label="Portfolio"
                href="https://devazan.netlify.app"
                color="#6366F1"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '12px 24px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderTop: '1px solid rgba(255,255,255,0.05)',
          }}
        >
          <div style={{ display: 'flex', gap: 16 }}>
            <TechBadge icon={<Code2 size={11} />} label="TypeScript" />
            <TechBadge icon={<Layers size={11} />} label="Electron · React" />
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.18)' }}>
            © 2025 Binary Editor
          </div>
        </div>
      </div>
    </>
  );
};

/* ─── small helpers ──────────────────────────────────────────────────────── */

const ProfileLink: React.FC<{
  icon: React.ReactNode;
  label: string;
  href: string;
  color: string;
}> = ({ icon, label, href, color }) => (
  <button
    onClick={() => api.openExternalUrl(href)}
    title={href}
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      padding: '6px 13px',
      borderRadius: 7,
      fontSize: 12,
      fontWeight: 600,
      color: '#fff',
      backgroundColor: color,
      border: 'none',
      cursor: 'pointer',
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.opacity = '0.85';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.opacity = '1';
    }}
  >
    {icon}
    {label}
    <ExternalLink size={10} style={{ opacity: 0.6 }} />
  </button>
);

const TechBadge: React.FC<{ icon: React.ReactNode; label: string }> = ({ icon, label }) => (
  <span
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 5,
      fontSize: 11,
      color: 'rgba(255,255,255,0.28)',
    }}
  >
    {icon}
    {label}
  </span>
);
