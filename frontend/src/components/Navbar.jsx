import React from 'react';
import { Shield, Sparkles, LogOut, Radio, Terminal } from 'lucide-react';

export default function Navbar({ mode, lang, setLang, isAdminLoggedIn, onLogout }) {
  const isAdmin = mode === 'admin';

  return (
    <header style={{
      width: '100%',
      borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
      background: 'rgba(5, 5, 5, 0.88)',
      backdropFilter: 'blur(20px)',
      position: 'sticky',
      top: 0,
      zIndex: 100
    }}>
      <div style={{
        maxWidth: 1600,
        margin: '0 auto',
        padding: '16px 32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 20,
        flexWrap: 'wrap'
      }}>
        {/* Left: Logo in Plus Jakarta Sans bold uppercase */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ position: 'relative' }}>
            <img
              src="/goolix-avatar.jpg"
              alt="GOOLIX"
              style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                border: `2px solid ${isAdmin ? '#FF2B85' : '#BFFF00'}`,
                boxShadow: `0 0 16px ${isAdmin ? 'rgba(255, 43, 133, 0.35)' : 'rgba(191, 255, 0, 0.35)'}`,
                objectFit: 'cover',
                display: 'block'
              }}
            />
            <div style={{
              position: 'absolute',
              bottom: 0,
              right: 0,
              width: 11,
              height: 11,
              borderRadius: '50%',
              background: isAdmin ? '#FF2B85' : '#BFFF00',
              border: '2px solid #050505'
            }} />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontSize: 20,
                fontWeight: 800,
                letterSpacing: '-0.04em',
                textTransform: 'uppercase',
                color: '#FFFFFF'
              }}>
                {isAdmin ? 'GOOLIX MASTER' : 'GOOLIX'}
              </span>
              <span style={{
                fontFamily: "var(--font-mono-meta)",
                fontSize: 10,
                letterSpacing: '0.25em',
                textTransform: 'uppercase',
                padding: '3px 8px',
                borderRadius: 9999,
                background: isAdmin ? 'rgba(255, 43, 133, 0.12)' : 'rgba(191, 255, 0, 0.12)',
                color: isAdmin ? '#FF2B85' : '#BFFF00',
                border: `1px solid ${isAdmin ? 'rgba(255, 43, 133, 0.3)' : 'rgba(191, 255, 0, 0.3)'}`
              }}>
                {isAdmin ? 'CONSOLE // SECURE' : 'STAGE // OPUS 96K'}
              </span>
            </div>
            <div className="nv-tech-meta" style={{ fontSize: 10, tracking: '0.3em', marginTop: 2 }}>
              {isAdmin ? 'TELEMETRY // ROUTING MATRIX' : 'HIGH-VELOCITY AUDIO STREAMING CORE'}
            </div>
          </div>
        </div>

        {/* Right: Navigation links using Geist Mono 10px, tracking 0.3em + Laser Button CTA */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
          <nav style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <a
              href="#specs"
              className="nv-tech-meta"
              style={{
                textDecoration: 'none',
                fontSize: 10,
                letterSpacing: '0.3em',
                transition: 'color 0.2s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#BFFF00'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--nv-text-secondary)'}
            >
              [ 01/SPEC ]
            </a>
            <a
              href="#perks"
              className="nv-tech-meta"
              style={{
                textDecoration: 'none',
                fontSize: 10,
                letterSpacing: '0.3em',
                transition: 'color 0.2s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#BFFF00'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--nv-text-secondary)'}
            >
              [ 02/PERKS ]
            </a>
            <a
              href="#support"
              className="nv-tech-meta"
              style={{
                textDecoration: 'none',
                fontSize: 10,
                letterSpacing: '0.3em',
                transition: 'color 0.2s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#BFFF00'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--nv-text-secondary)'}
            >
              [ 03/ACCESS ]
            </a>
          </nav>

          {/* Language Switch */}
          <div style={{
            display: 'flex',
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: 9999,
            padding: 3,
            gap: 2
          }}>
            <button
              onClick={() => setLang('th')}
              type="button"
              style={{
                background: lang === 'th' ? '#BFFF00' : 'transparent',
                color: lang === 'th' ? '#050505' : 'var(--nv-text-secondary)',
                fontFamily: "var(--font-mono-meta)",
                fontWeight: 700,
                border: 'none',
                padding: '4px 10px',
                borderRadius: 9999,
                fontSize: 10.5,
                letterSpacing: '0.1em',
                cursor: 'pointer',
                transition: 'all 0.18s ease'
              }}
            >
              TH
            </button>
            <button
              onClick={() => setLang('en')}
              type="button"
              style={{
                background: lang === 'en' ? '#BFFF00' : 'transparent',
                color: lang === 'en' ? '#050505' : 'var(--nv-text-secondary)',
                fontFamily: "var(--font-mono-meta)",
                fontWeight: 700,
                border: 'none',
                padding: '4px 10px',
                borderRadius: 9999,
                fontSize: 10.5,
                letterSpacing: '0.1em',
                cursor: 'pointer',
                transition: 'all 0.18s ease'
              }}
            >
              EN
            </button>
          </div>

          {/* Primary Laser Button CTA */}
          {!isAdmin ? (
            <a
              href="#support"
              className="btn-laser"
              style={{ textDecoration: 'none', padding: '10px 22px', fontSize: 11.5 }}
            >
              <span>{lang === 'th' ? 'ปลดล็อกสิทธิ์ VIP' : 'UNLOCK ACCESS'}</span>
            </a>
          ) : isAdminLoggedIn ? (
            <button
              onClick={onLogout}
              type="button"
              className="btn btn-sm"
              style={{
                borderColor: 'rgba(255, 51, 75, 0.3)',
                color: 'var(--red-alert)',
                background: 'rgba(255, 51, 75, 0.08)'
              }}
            >
              <LogOut size={13} />
              <span>{lang === 'th' ? 'ออกจากระบบ' : 'LOGOUT'}</span>
            </button>
          ) : null}
        </div>
      </div>
    </header>
  );
}
