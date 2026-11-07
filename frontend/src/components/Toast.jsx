import React from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

export default function Toast({ toasts, onDismiss }) {
  if (!toasts || toasts.length === 0) return null;

  const icons = {
    success: <CheckCircle2 size={18} className="text-emerald-400" />,
    error: <AlertCircle size={18} className="text-rose-400" />,
    warning: <AlertTriangle size={18} className="text-amber-400" />,
    info: <Info size={18} className="text-cyan-400" />
  };

  const borders = {
    success: 'border-emerald-500/30 bg-emerald-950/80 text-emerald-100',
    error: 'border-rose-500/30 bg-rose-950/80 text-rose-100',
    warning: 'border-amber-500/30 bg-amber-950/80 text-amber-100',
    info: 'border-cyan-500/30 bg-cyan-950/80 text-cyan-100'
  };

  return (
    <div style={{
      position: 'fixed',
      top: 20,
      right: 20,
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      maxWidth: 380,
      width: '100%'
    }}>
      {toasts.map((t) => (
        <div
          key={t.id}
          className="fade-in"
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 12,
            padding: '12px 16px',
            borderRadius: 12,
            background: 'rgba(17, 22, 32, 0.95)',
            border: '1px solid ' + (t.type === 'success' ? '#00FF88' : t.type === 'error' ? '#EF4444' : t.type === 'warning' ? '#F59E0B' : '#00D2FF'),
            boxShadow: '0 10px 30px rgba(0,0,0,0.6)',
            backdropFilter: 'blur(10px)',
            color: '#FFFFFF'
          }}
        >
          <div style={{ marginTop: 2 }}>{icons[t.type] || icons.info}</div>
          <div style={{ flex: 1 }}>
            {t.title && <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 2 }}>{t.title}</div>}
            <div style={{ fontSize: 12, color: 'var(--text-sub)', wordBreak: 'break-word' }}>{t.message}</div>
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
              alignItems: 'center'
            }}
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
