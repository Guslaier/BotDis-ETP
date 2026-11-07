import React, { useState } from 'react';
import { Shield, Lock, User, ArrowRight } from 'lucide-react';

export default function AdminLogin({ lang, onLoginSuccess, onToast }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      onToast('warning', lang === 'th' ? 'กรุณากรอกข้อมูลให้ครบ' : 'Missing Credentials');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          password: password.trim()
        })
      });

      const data = await res.json();
      if (data.success && data.token) {
        onToast('success', lang === 'th' ? 'เข้าสู่ระบบสำเร็จ!' : 'Login Successful!');
        onLoginSuccess(data.token);
      } else {
        onToast('error', lang === 'th' ? 'เข้าสู่ระบบไม่สำเร็จ' : 'Login Failed', data.reason || 'Invalid username or password');
      }
    } catch (err) {
      onToast('error', 'Error', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: 420, margin: '60px auto', padding: '0 16px' }} className="fade-in">
      <div className="glass-panel" style={{
        padding: '32px 28px',
        border: '1px solid var(--card-border)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.8), 0 0 20px rgba(0, 255, 136, 0.05)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{
            width: 52,
            height: 52,
            borderRadius: '50%',
            background: 'rgba(0, 255, 136, 0.1)',
            border: '1px solid var(--slime-green)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--slime-green)',
            boxShadow: '0 0 16px var(--slime-glow)',
            marginBottom: 12
          }}>
            <Shield size={26} />
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: '#FFF' }}>
            {lang === 'th' ? 'เข้าสู่ระบบแดชบอร์ดแอดมิน' : 'Master Admin Login'}
          </h2>
          <div style={{ fontSize: 12, color: 'var(--text-sub)', marginTop: 4 }}>
            GOOLIX Cluster Management & Governance
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-sub)', marginBottom: 6 }}>
              {lang === 'th' ? 'ชื่อผู้ใช้งาน (Username)' : 'Username'}
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                required
                style={{ paddingLeft: 38 }}
              />
              <User size={16} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-dim)' }} />
            </div>
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-sub)', marginBottom: 6 }}>
              {lang === 'th' ? 'รหัสผ่าน (Password)' : 'Password'}
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={{ paddingLeft: 38 }}
              />
              <Lock size={16} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-dim)' }} />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="btn btn-primary"
            style={{ width: '100%', padding: '12px 18px', fontSize: 14 }}
          >
            {submitting ? 'Authenticating...' : (
              <>
                <span>{lang === 'th' ? 'เข้าสู่ระบบ' : 'Sign In'}</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
