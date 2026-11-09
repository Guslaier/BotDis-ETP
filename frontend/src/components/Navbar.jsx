import React from 'react';
import { IconLogout } from '@tabler/icons-react';

export default function Navbar({ mode, lang, setLang, isAdminLoggedIn, onLogout }) {
  const isAdmin = mode === 'admin';

  return (
    <header style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '14px 28px',
      borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
      background: 'rgba(5, 7, 11, 0.88)',
      backdropFilter: 'blur(20px)',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      gap: 16,
      flexWrap: 'wrap'
    }}>
      {/* Brand Identity / Soundstage Emblem */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ position: 'relative' }}>
          <img
            src="/goolix-avatar.jpg"
            alt="GOOLIX"
            style={{
              width: 42,
              height: 42,
              borderRadius: '50%',
              border: `2px solid ${isAdmin ? 'var(--cyber-pink)' : 'var(--slime-green)'}`,
              boxShadow: `0 0 16px ${isAdmin ? 'rgba(255, 43, 133, 0.25)' : 'rgba(0, 255, 135, 0.25)'}`,
              objectFit: 'cover',
              display: 'block'
            }}
          />
          <div style={{
            position: 'absolute',
            bottom: -1,
            right: -1,
            width: 12,
            height: 12,
            borderRadius: '50%',
            background: isAdmin ? 'var(--cyber-pink)' : 'var(--slime-green)',
            border: '2.5px solid #05070B'
          }} />
        </div>

        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <h1 style={{
              fontSize: 19,
              fontWeight: 800,
              letterSpacing: '-0.03em',
              color: '#FFFFFF',
              margin: 0
            }}>
              {isAdmin ? 'GOOLIX MASTER' : 'GOOLIX'}
            </h1>
            <span className="btn-sm btn-pink" style={{
              fontSize: 10,
              padding: '2px 8px',
              borderRadius: 20,
              fontWeight: 700
            }}>
              {isAdmin ? 'INTERNAL CONSOLE' : 'SUPPORTER PORTAL'}
            </span>
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--text-sub)', fontWeight: 500, letterSpacing: '-0.01em', marginTop: 1 }}>
            {isAdmin ? 'Cluster Telemetry & Node Audio Routing' : 'Cosmic Slime High-Fidelity Audio Engine'}
          </div>
        </div>
      </div>

      {/* Right Controls: Studio Language Switch & Admin Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Language Switch Segment */}
        <div style={{
          display: 'flex',
          background: 'rgba(255, 255, 255, 0.04)',
          border: '1px solid rgba(255, 255, 255, 0.09)',
          borderRadius: 24,
          padding: '3px',
          gap: 2
        }}>
          <button
            onClick={() => setLang('th')}
            type="button"
            style={{
              background: lang === 'th' ? (isAdmin ? 'var(--cyber-pink)' : 'var(--slime-green)') : 'transparent',
              color: lang === 'th' ? (isAdmin ? '#FFF' : '#05070B') : 'var(--text-sub)',
              fontWeight: lang === 'th' ? 700 : 500,
              border: 'none',
              padding: '4px 12px',
              borderRadius: 18,
              fontSize: 11.5,
              cursor: 'pointer',
              transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
          >
            TH
          </button>
          <button
            onClick={() => setLang('en')}
            type="button"
            style={{
              background: lang === 'en' ? (isAdmin ? 'var(--cyber-pink)' : 'var(--slime-green)') : 'transparent',
              color: lang === 'en' ? (isAdmin ? '#FFF' : '#05070B') : 'var(--text-sub)',
              fontWeight: lang === 'en' ? 700 : 500,
              border: 'none',
              padding: '4px 12px',
              borderRadius: 18,
              fontSize: 11.5,
              cursor: 'pointer',
              transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
          >
            EN
          </button>
        </div>

        {isAdmin && isAdminLoggedIn && (
          <button
            onClick={onLogout}
            type="button"
            className="btn btn-sm btn-danger"
            style={{ padding: '6px 14px' }}
          >
            <IconLogout size={14} stroke={1.8} />
            <span>{lang === 'th' ? 'ออกจากระบบ' : 'Logout'}</span>
          </button>
        )}
      </div>
    </header>
  );
}
