import React from 'react';
import { Shield, Globe } from 'lucide-react';

export default function Navbar({ mode, lang, setLang, isAdminLoggedIn, onLogout }) {
  const isAdmin = mode === 'admin';

  return (
    <header style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '16px 24px',
      borderBottom: '1px solid var(--card-border)',
      background: 'rgba(8, 11, 16, 0.85)',
      backdropFilter: 'blur(16px)',
      position: 'sticky',
      top: 0,
      zIndex: 50,
      gap: 16,
      flexWrap: 'wrap'
    }}>
      {/* Brand Identity */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <img
          src="/goolix-avatar.jpg"
          alt="GOOLIX"
          style={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            border: `2px solid ${isAdmin ? 'var(--cyber-pink)' : 'var(--slime-green)'}`,
            boxShadow: `0 0 12px ${isAdmin ? 'rgba(255, 46, 147, 0.2)' : 'rgba(0, 255, 136, 0.2)'}`,
            objectFit: 'cover'
          }}
        />
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h1 style={{
              fontSize: 20,
              fontWeight: 800,
              letterSpacing: '-0.4px',
              background: isAdmin 
                ? 'linear-gradient(135deg, #FFFFFF 0%, #FF2E93 100%)' 
                : 'linear-gradient(135deg, #FFFFFF 0%, #00FF88 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              margin: 0
            }}>
              {isAdmin ? 'GOOLIX MASTER' : 'GOOLIX'}
            </h1>
            <span className={isAdmin ? 'btn-sm btn-pink' : 'slime-badge'} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20 }}>
              {isAdmin ? 'ADMIN CORE' : 'ONLINE'}
            </span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-sub)', fontWeight: 500 }}>
            {isAdmin ? 'Internal Cluster Governance & Telemetry' : 'Cosmic Slime Audio Engine & Support Portal'}
          </div>
        </div>
      </div>

      {/* Right Controls: Language & Auth (Strictly Separated) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {/* Language Switch */}
        <div style={{
          display: 'flex',
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid var(--card-border)',
          borderRadius: 20,
          padding: 2,
          gap: 2
        }}>
          <button
            onClick={() => setLang('th')}
            style={{
              background: lang === 'th' ? (isAdmin ? 'var(--cyber-pink)' : 'var(--slime-green)') : 'transparent',
              color: lang === 'th' ? (isAdmin ? '#FFF' : '#080B10') : 'var(--text-sub)',
              fontWeight: lang === 'th' ? 700 : 500,
              border: 'none',
              padding: '4px 10px',
              borderRadius: 16,
              fontSize: 11,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            TH
          </button>
          <button
            onClick={() => setLang('en')}
            style={{
              background: lang === 'en' ? (isAdmin ? 'var(--cyber-pink)' : 'var(--slime-green)') : 'transparent',
              color: lang === 'en' ? (isAdmin ? '#FFF' : '#080B10') : 'var(--text-sub)',
              fontWeight: lang === 'en' ? 700 : 500,
              border: 'none',
              padding: '4px 10px',
              borderRadius: 16,
              fontSize: 11,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            EN
          </button>
        </div>

        {isAdmin && isAdminLoggedIn && (
          <button
            onClick={onLogout}
            className="btn btn-sm btn-danger"
            style={{ padding: '6px 12px' }}
          >
            {lang === 'th' ? 'ออกจากระบบ' : 'Logout'}
          </button>
        )}
      </div>
    </header>
  );
}
