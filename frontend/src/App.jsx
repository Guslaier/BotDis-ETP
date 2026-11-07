import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import TopupView from './components/TopupView';
import AdminDashboard from './components/AdminDashboard';
import AdminLogin from './components/AdminLogin';
import Toast from './components/Toast';

export default function App() {
  const [activeTab, setActiveTab] = useState('topup');
  const [lang, setLang] = useState('th');
  const [token, setToken] = useState(localStorage.getItem('goolix_admin_token') || '');
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    // Inspect pathname for routing
    const path = window.location.pathname.toLowerCase();
    if (path.includes('admin') || path.includes('dashboard')) {
      setActiveTab('admin');
    }
  }, []);

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
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        lang={lang}
        setLang={setLang}
        isAdminLoggedIn={!!token}
        onLogout={handleLogout}
      />

      <Toast toasts={toasts} onDismiss={dismissToast} />

      <main style={{ flex: 1 }}>
        {activeTab === 'topup' ? (
          <TopupView lang={lang} onToast={addToast} />
        ) : token ? (
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
        GOOLIX • Cosmic Slime Music Engine & Distributed Cluster Architecture • v2.0
      </footer>
    </div>
  );
}
