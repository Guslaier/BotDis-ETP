import React from 'react';
import { IconCircleCheck, IconAlertCircle, IconInfoCircle, IconAlertTriangle, IconX } from '@tabler/icons-react';

export default function Toast({ toasts, onDismiss }) {
  if (!toasts || toasts.length === 0) return null;

  const icons = {
    success: <IconCircleCheck size={18} stroke={1.8} style={{ color: 'var(--slime-green)' }} />,
    error: <IconAlertCircle size={18} stroke={1.8} style={{ color: 'var(--red-alert)' }} />,
    warning: <IconAlertTriangle size={18} stroke={1.8} style={{ color: 'var(--amber-warn)' }} />,
    info: <IconInfoCircle size={18} stroke={1.8} style={{ color: 'var(--cyan-freq)' }} />
  };

  const getBorderColor = (type) => {
    switch (type) {
      case 'success': return 'rgba(0, 255, 135, 0.4)';
      case 'error': return 'rgba(255, 51, 75, 0.4)';
      case 'warning': return 'rgba(245, 158, 11, 0.4)';
      case 'info':
      default: return 'rgba(0, 229, 255, 0.4)';
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 24,
      right: 24,
      zIndex: 100000,
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      maxWidth: 380,
      width: '100%',
      pointerEvents: 'none'
    }}>
      {toasts.map((t) => (
        <div
          key={t.id}
          className="fade-in"
          style={{
            pointerEvents: 'auto',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 12,
            padding: '13px 16px',
            borderRadius: 12,
            background: 'linear-gradient(180deg, rgba(14, 20, 34, 0.98) 0%, rgba(9, 13, 21, 0.98) 100%)',
            border: `1px solid ${getBorderColor(t.type)}`,
            boxShadow: '0 12px 32px rgba(0, 0, 0, 0.7), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
            backdropFilter: 'blur(16px)',
            color: '#FFFFFF'
          }}
        >
          <div style={{ marginTop: 2, flexShrink: 0 }}>{icons[t.type] || icons.info}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            {t.title && <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 2, color: '#FFF' }}>{t.title}</div>}
            <div style={{ fontSize: 12, color: 'var(--text-sub)', wordBreak: 'break-word', lineHeight: 1.45 }}>{t.message}</div>
          </div>
          <button
            onClick={() => onDismiss(t.id)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-dim)',
              cursor: 'pointer',
              padding: 2,
              display: 'flex',
              alignItems: 'center',
              flexShrink: 0,
              transition: 'color 0.15s ease'
            }}
          >
            <IconX size={14} stroke={2} />
          </button>
        </div>
      ))}
    </div>
  );
}
