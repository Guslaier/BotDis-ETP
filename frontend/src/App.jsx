import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import TopupView from './components/TopupView';
import AdminDashboard from './components/AdminDashboard';
import AdminLogin from './components/AdminLogin';
import Toast from './components/Toast';

export default function App() {
  const [lang, setLang] = useState('th');
  const [token, setToken] = useState(localStorage.getItem('goolix_admin_token') || '');
  const [toasts, setToasts] = useState([]);

  // Strict Port-Based Isolation: Port 11902 is strictly Admin. Any other port is strictly Public Donate/Topup.
  const isAdmin = window.location.port === '11902' || window.location.search.includes('mode=admin');

  const addToast = (type, title, message) => {
    const id = Date.now() + Math.random().toString();
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const dismissToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const handleLoginSuccess = (newToken) => {
    setToken(newToken);
    localStorage.setItem('goolix_admin_token', newToken);
  };

  const handleLogout = () => {
    setToken('');
    localStorage.removeItem('goolix_admin_token');
    addToast('info', lang === 'th' ? 'ออกจากระบบแล้ว' : 'Logged out', '');
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar
        mode={isAdmin ? 'admin' : 'public'}
        lang={lang}
        setLang={setLang}
        isAdminLoggedIn={!!token}
        onLogout={handleLogout}
      />

      <Toast toasts={toasts} onDismiss={dismissToast} />

      <main style={{ flex: 1 }}>
        {!isAdmin ? (
          /* Public Portal: Only Topup / Donate / Guild lookup */
          <TopupView lang={lang} onToast={addToast} />
        ) : token ? (
          /* Admin Dedicated Portal: Only Master Console */
          <AdminDashboard
            lang={lang}
            token={token}
            setToken={setToken}
            onToast={addToast}
          />
        ) : (
          <AdminLogin
            lang={lang}
            onLoginSuccess={handleLoginSuccess}
            onToast={addToast}
          />
        )}
      </main>

      <footer style={{
        textAlign: 'center',
        padding: '24px 16px',
        borderTop: '1px solid var(--card-border)',
        fontSize: 12,
        color: 'var(--text-dim)',
        marginTop: 'auto'
      }}>
        {isAdmin 
          ? 'GOOLIX Master Console • Internal Cluster Administration & Governance' 
          : 'GOOLIX • Cosmic Slime Music Engine & Community Support'}
      </footer>
    </div>
  );
}
