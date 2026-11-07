import React from 'react';
import { Shield, Sparkles, Globe, Headphones, Radio } from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab, lang, setLang, isAdminLoggedIn, onLogout }) {
  return (
    <header style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '16px 24px',
      borderBottom: '1px solid var(--card-border)',
      background: 'rgba(8, 11, 16, 0.8)',
      backdropFilter: 'blur(16px)',
      position: 'sticky',
      top: 0,
      zIndex: 50,
      gap: 16,
      flexWrap: 'wrap'
    }}>
      {/* Brand Identity */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ position: 'relative' }}>
          <img
            src="/goolix-avatar.jpg"
            alt="GOOLIX"
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              border: '2px solid var(--slime-green)',
              boxShadow: '0 0 16px var(--slime-glow)',
              objectFit: 'cover'
            }}
          />
          <span style={{
            position: 'absolute',
            bottom: -2,
            right: -2,
            width: 12,
            height: 12,
            borderRadius: '50%',
            background: 'var(--slime-green)',
            border: '2px solid var(--bg-dark)',
            boxShadow: '0 0 8px var(--slime-green)'
          }} />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h1 style={{
              fontSize: 20,
              fontWeight: 800,
              letterSpacing: '-0.4px',
              background: 'linear-gradient(135deg, #FFFFFF 0%, #00FF88 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              margin: 0
            }}>
              GOOLIX
            </h1>
            <span className="slime-badge">
              LIVE
            </span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-sub)', fontWeight: 500 }}>
            Cosmic Slime Audio Engine & Cluster
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <nav style={{
        display: 'flex',
        alignItems: 'center',
        background: 'rgba(17, 22, 32, 0.9)',
        border: '1px solid var(--card-border)',
        borderRadius: 14,
        padding: 4,
        gap: 4
      }}>
        <button
          onClick={() => setActiveTab('topup')}
          className={`btn btn-sm ${activeTab === 'topup' ? 'btn-primary' : ''}`}
          style={{
            border: activeTab === 'topup' ? '1px solid var(--slime-green)' : 'none',
            background: activeTab === 'topup' ? 'var(--slime-green)' : 'transparent',
            color: activeTab === 'topup' ? '#080B10' : 'var(--text-sub)',
            borderRadius: 10,
            padding: '8px 14px',
            fontSize: 12.5
          }}
        >
          <Sparkles size={14} />
          <span>{lang === 'th' ? 'เติมเงิน / สนับสนุน' : 'Donate & Topup'}</span>
        </button>

        <button
          onClick={() => setActiveTab('admin')}
          className={`btn btn-sm ${activeTab === 'admin' ? 'btn-primary' : ''}`}
          style={{
            border: activeTab === 'admin' ? '1px solid var(--slime-green)' : 'none',
            background: activeTab === 'admin' ? 'var(--slime-green)' : 'transparent',
            color: activeTab === 'admin' ? '#080B10' : 'var(--text-sub)',
            borderRadius: 10,
            padding: '8px 14px',
            fontSize: 12.5
          }}
        >
          <Shield size={14} />
          <span>{lang === 'th' ? 'แดชบอร์ดแอดมิน' : 'Admin Portal'}</span>
        </button>
      </nav>

      {/* Right Controls: Language & Auth */}
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
              background: lang === 'th' ? 'var(--slime-green)' : 'transparent',
              color: lang === 'th' ? '#080B10' : 'var(--text-sub)',
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
              background: lang === 'en' ? 'var(--slime-green)' : 'transparent',
              color: lang === 'en' ? '#080B10' : 'var(--text-sub)',
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

        {activeTab === 'admin' && isAdminLoggedIn && (
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
