import React, { useState } from 'react';
import { Shield, Lock, User, ArrowRight, KeyRound } from 'lucide-react';

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
        onToast('error', lang === 'th' ? 'เข้าสู่ระบบไม่สำเร็จ' : 'Login Failed', data.reason || 'Invalid credentials');
      }
    } catch (err) {
      onToast('error', 'Error', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: 420, margin: '80px auto', padding: '0 20px' }} className="fade-in">
      <div className="glass-panel" style={{
        padding: '36px 32px',
        border: '1px solid rgba(255, 43, 133, 0.25)',
        boxShadow: '0 24px 64px -12px rgba(0, 0, 0, 0.8), 0 0 32px rgba(255, 43, 133, 0.06)'
      }}>
        {/* Hardware Security Crest */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 56,
            height: 56,
            borderRadius: 16,
            background: 'linear-gradient(135deg, rgba(255, 43, 133, 0.15) 0%, rgba(14, 20, 34, 0.8) 100%)',
            border: '1px solid rgba(255, 43, 133, 0.4)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--cyber-pink)',
            boxShadow: '0 8px 24px rgba(255, 43, 133, 0.2)',
            marginBottom: 16
          }}>
            <KeyRound size={26} />
          </div>
          <h2 style={{ fontSize: 21, fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.02em', margin: 0 }}>
            {lang === 'th' ? 'ศูนย์ควบคุมแอดมิน' : 'Master Cluster Console'}
          </h2>
          <div style={{ fontSize: 12, color: 'var(--text-sub)', marginTop: 5 }}>
            {lang === 'th' ? 'ระบบบริหารจัดการคลัสเตอร์และเสียงภายใน' : 'Internal Cluster Administration & Audio Engine'}
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 18 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-sub)', marginBottom: 7 }}>
              {lang === 'th' ? 'ชื่อผู้ใช้งาน (Username)' : 'Username'}
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                required
                style={{ paddingLeft: 40 }}
              />
              <User size={16} style={{ position: 'absolute', left: 14, top: 13, color: 'var(--text-muted)' }} />
            </div>
          </div>

          <div style={{ marginBottom: 26 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-sub)', marginBottom: 7 }}>
              {lang === 'th' ? 'รหัสผ่านความปลอดภัย (Password)' : 'Password'}
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={{ paddingLeft: 40 }}
              />
              <Lock size={16} style={{ position: 'absolute', left: 14, top: 13, color: 'var(--text-muted)' }} />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="btn btn-pink"
            style={{ width: '100%', padding: '12px 20px', fontSize: 14, borderRadius: 12 }}
          >
            {submitting ? (
              <span>{lang === 'th' ? 'กำลังตรวจสอบสิทธิ์...' : 'Authenticating...'}</span>
            ) : (
              <>
                <span>{lang === 'th' ? 'เข้าสู่ระบบคอนโซล' : 'Access Master Console'}</span>
                <ArrowRight size={15} />
              </>
            )}
          </button>
        </form>

        <div style={{
          marginTop: 22,
          paddingTop: 18,
          borderTop: '1px solid rgba(255, 255, 255, 0.06)',
          textAlign: 'center',
          fontSize: 11,
          color: 'var(--text-dim)'
        }}>
          Protected by Session JWT & Rate Guard Security
        </div>
      </div>
    </div>
  );
}
