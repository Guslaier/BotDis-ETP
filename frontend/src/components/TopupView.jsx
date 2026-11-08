import React, { useState, useEffect } from 'react';
import { 
  Sparkles, CheckCircle2, AlertCircle, Gift, Server, ShieldCheck, 
  Clock, ArrowRight, Share2, Copy, Zap, Music2, Award,
  FileText, X, ChevronRight, Check, Disc3, Radio, Terminal
} from 'lucide-react';

export default function TopupView({ lang, onToast }) {
  const [guildId, setGuildId] = useState('');
  const [userId, setUserId] = useState('');
  const [guildData, setGuildData] = useState(null);
  const [loadingGuild, setLoadingGuild] = useState(false);
  const [formTab, setFormTab] = useState('voucher'); // 'voucher' | 'promo'
  const [showTosModal, setShowTosModal] = useState(false);

  // Forms
  const [voucher, setVoucher] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [referrerName, setReferrerName] = useState('');
  const [promoCode, setPromoCode] = useState('');
  const [submittingTopup, setSubmittingTopup] = useState(false);
  const [submittingPromo, setSubmittingPromo] = useState(false);

  // Live tabular clock for Neon Velocity Hero
  const [currentTime, setCurrentTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatCountdown = (targetMs) => {
    if (!targetMs) return '00D : 00H : 00M : 00S';
    const diff = targetMs - Date.now();
    if (diff <= 0) return '00D : 00H : 00M : 00S';
    const days = String(Math.floor(diff / (1000 * 60 * 60 * 24))).padStart(2, '0');
    const hours = String(Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))).padStart(2, '0');
    const minutes = String(Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))).padStart(2, '0');
    const seconds = String(Math.floor((diff % (1000 * 60)) / 1000)).padStart(2, '0');
    return `${days}D : ${hours}H : ${minutes}M : ${seconds}S`;
  };

  // Read URL query params on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const g = params.get('guildId') || params.get('guild') || params.get('guild_id') || '';
    const u = params.get('userId') || params.get('user') || params.get('user_id') || '';
    const ref = params.get('ref') || params.get('referral') || '';
    if (g) setGuildId(g);
    if (u) setUserId(u);
    if (ref) setReferralCode(ref.toUpperCase());

    if (g) {
      verifyGuild(g, u);
    }
  }, []);

  const verifyGuild = async (targetGuildId = guildId, targetUserId = userId) => {
    if (!targetGuildId.trim()) return;
    setLoadingGuild(true);
    try {
      const res = await fetch(`/api/public/verify-guild?guildId=${encodeURIComponent(targetGuildId.trim())}&userId=${encodeURIComponent(targetUserId.trim())}`);
      const data = await res.json();
      if (data.success) {
        setGuildData(data);
        onToast('success', lang === 'th' ? 'พบข้อมูลเซิร์ฟเวอร์' : 'Server Verified', data.guild?.name || targetGuildId);
      } else {
        setGuildData(null);
        onToast('error', lang === 'th' ? 'ไม่พบเซิร์ฟเวอร์' : 'Guild Not Found', data.error || (lang === 'th' ? 'กรุณาตรวจสอบว่าบอทอยู่ในเซิร์ฟเวอร์นี้' : 'Ensure bot is joined in server'));
      }
    } catch (err) {
      onToast('error', 'Network Error', err.message);
    } finally {
      setLoadingGuild(false);
    }
  };

  const verifyReferral = async (code) => {
    if (!code.trim()) {
      setReferrerName('');
      return;
    }
    try {
      const res = await fetch(`/api/public/verify-referral?code=${encodeURIComponent(code.trim())}&guildId=${encodeURIComponent(guildId.trim())}`);
      const data = await res.json();
      if (data.success) {
        setReferrerName(data.referrerGuildName);
      } else {
        setReferrerName('');
      }
    } catch {
      setReferrerName('');
    }
  };

  const handleTopup = async (e) => {
    e.preventDefault();
    if (!guildId.trim()) {
      onToast('warning', lang === 'th' ? 'กรุณาระบุ Server ID' : 'Missing Server ID', lang === 'th' ? 'เลือกหรือกรอกไอดีเซิร์ฟเวอร์ก่อน' : 'Provide Server ID first');
      return;
    }
    if (!voucher.trim()) {
      onToast('warning', lang === 'th' ? 'กรุณาระบุลิงก์ซอง' : 'Missing Voucher', lang === 'th' ? 'วางลิงก์ซองของขวัญ TrueMoney' : 'Enter voucher link');
      return;
    }

    setSubmittingTopup(true);
    try {
      const res = await fetch('/api/public/topup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guildId: guildId.trim(),
          userId: userId.trim(),
          voucher: voucher.trim(),
          referralCode: referralCode.trim()
        })
      });
      const data = await res.json();
      if (data.success) {
        onToast('success', lang === 'th' ? 'ร่วมสนับสนุนสำเร็จ' : 'Support Confirmed', lang === 'th' ? `ปลดล็อกวันผู้สนับสนุน +${data.addedDays} วัน (ยอด ${data.amount} บาท)` : `Added +${data.addedDays} Supporter days (${data.amount} THB)`);
        setVoucher('');
        verifyGuild(guildId, userId);
      } else {
        onToast('error', lang === 'th' ? 'ทำรายการไม่สำเร็จ' : 'Transaction Failed', data.error || 'Voucher invalid');
      }
    } catch (err) {
      onToast('error', 'Error', err.message);
    } finally {
      setSubmittingTopup(false);
    }
  };

  const handleRedeemPromo = async (e) => {
    e.preventDefault();
    if (!guildId.trim()) {
      onToast('warning', lang === 'th' ? 'กรุณาระบุ Server ID' : 'Missing Server ID');
      return;
    }
    if (!promoCode.trim()) {
      onToast('warning', lang === 'th' ? 'กรุณาระบุรหัสโค้ด' : 'Missing Code');
      return;
    }

    setSubmittingPromo(true);
    try {
      const res = await fetch('/api/public/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guildId: guildId.trim(),
          userId: userId.trim(),
          code: promoCode.trim()
        })
      });
      const data = await res.json();
      if (data.success) {
        onToast('success', lang === 'th' ? 'เคลมสิทธิ์สำเร็จ' : 'Code Redeemed', lang === 'th' ? `ได้รับสิทธิ์ ${data.campaignName} (+${data.addedDays} วัน)` : `Received +${data.addedDays} days`);
        setPromoCode('');
        verifyGuild(guildId, userId);
      } else {
        onToast('error', lang === 'th' ? 'เคลมไม่สำเร็จ' : 'Redeem Failed', data.error || 'Code invalid');
      }
    } catch (err) {
      onToast('error', 'Error', err.message);
    } finally {
      setSubmittingPromo(false);
    }
  };

  const copyReferralLink = () => {
    if (!guildData?.guild?.referralCode) return;
    const link = `${window.location.origin}/?ref=${guildData.guild.referralCode}`;
    navigator.clipboard.writeText(link);
    onToast('success', lang === 'th' ? 'คัดลอกลิงก์แล้ว' : 'Copied Link', link);
  };

  const formatExpiry = (timestamp) => {
    if (!timestamp || timestamp <= Date.now()) {
      return lang === 'th' ? 'ไม่มีสิทธิ์คงเหลือ (ทั่วไป)' : 'NO ACTIVE PASS (STANDARD)';
    }
    const diff = timestamp - Date.now();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    return `${days} ${lang === 'th' ? 'วัน' : 'D'} ${hours} ${lang === 'th' ? 'ชม.' : 'H'} (${new Date(timestamp).toLocaleDateString('th-TH')})`;
  };

  const priceRate = guildData?.config?.price30Days ?? 29;

  return (
    <div style={{
      backgroundColor: 'var(--nv-black)',
      color: '#FFFFFF',
      minHeight: '100vh',
      position: 'relative',
      paddingBottom: 80
    }}>
      {/* Background Refraction Glows & Subtle Noise Overlay */}
      <div className="nv-ambient-glow" />
      <div className="nv-noise-overlay" />

      {/* Main Single-Column Container (Max-Width 1600px) */}
      <div style={{
        maxWidth: 1600,
        margin: '0 auto',
        padding: '0 32px',
        position: 'relative',
        zIndex: 2
      }}>

        {/* 1. HERO SECTION */}
        <section style={{
          paddingTop: '64px',
          paddingBottom: '56px',
          position: 'relative'
        }}>
          {/* 3D Glass Tilted Card Background */}
          <div className="nv-hero-3d-card" style={{ position: 'relative', width: '100%' }}>
            <div className="nv-hero-3d-inner" style={{
              borderRadius: '2.5rem',
              padding: '64px 48px',
              position: 'relative'
            }}>
              {/* Massive Headline in Brutalist 12px White Border Box (Sharp 0px Corners) */}
              <div style={{ marginBottom: 36 }}>
                <div className="nv-tech-meta" style={{ marginBottom: 16, color: 'var(--nv-accent)' }}>
                  [ ARCHITECTURE: DIRECT OGG-OPUS // AUDIO SPEC: 96K STUDIO ]
                </div>

                <div className="nv-brutalist-headline-box">
                  <h1 className="nv-headline-text">
                    NEON VELOCITY
                  </h1>
                </div>

                <div style={{
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontWeight: 800,
                  fontSize: 'clamp(1.4rem, 3.5vw, 2.8rem)',
                  letterSpacing: '-0.04em',
                  textTransform: 'uppercase',
                  color: 'rgba(255, 255, 255, 0.85)',
                  marginTop: 18
                }}>
                  {lang === 'th'
                    ? 'ปลดล็อกช่องสัญญาณเสียงระดับสตูดิโอ ทั้งเซิร์ฟเวอร์'
                    : 'ELITE SOUNDSTAGE PASS // SERVER-WIDE OPUS HQ'}
                </div>
              </div>

              {/* Split-Row Metadata Section */}
              <div style={{
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 24,
                borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                paddingTop: 28
              }}>
                {/* Left: Location & System Status Tag */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div className="nv-tech-meta" style={{ color: 'var(--nv-accent)' }}>
                    STATUS // CLUSTER ONLINE
                  </div>
                  <div style={{
                    fontFamily: "var(--font-mono-meta)",
                    fontSize: 13,
                    color: '#FFFFFF',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase'
                  }}>
                    LOC: AP-SOUTHEAST // PROTOCOL: DIRECT OPUS-96K // MERE CONDUIT
                  </div>
                </div>

                {/* Right: Large Countdown Timer in Tabular Nums */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                  <div className="nv-tech-meta">
                    {guildData?.guild?.expiresAt
                      ? (lang === 'th' ? 'วันใช้งานคงเหลือ [TABULAR]' : 'PASS REMAINING [TABULAR]')
                      : (lang === 'th' ? 'เวลาคลัสเตอร์ [UTC+7]' : 'CLUSTER TICK [UTC+7]')}
                  </div>
                  <div className="nv-tabular-nums" style={{
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    fontWeight: 800,
                    fontSize: 'clamp(1.6rem, 3.2vw, 2.6rem)',
                    color: '#BFFF00',
                    letterSpacing: '0.02em',
                    textShadow: '0 0 20px rgba(191, 255, 0, 0.4)'
                  }}>
                    {guildData?.guild?.expiresAt
                      ? formatCountdown(guildData.guild.expiresAt)
                      : currentTime.toLocaleTimeString('en-GB')}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 2. SOCIAL PROOF & HORIZONTAL TOPUP FORM */}
        <section id="support" style={{
          paddingBottom: '64px',
          display: 'flex',
          flexDirection: 'column',
          gap: 28
        }}>
          {/* Social Proof Header Bar */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 20
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
              {/* Avatar Stack with 5 overlapping images with 2px #BFFF00 border */}
              <div className="nv-avatar-stack">
                <img src="/goolix-avatar.jpg" alt="Avatar 1" />
                <img src="/goolix-avatar.jpg" alt="Avatar 2" style={{ filter: 'hue-rotate(45deg)' }} />
                <img src="/goolix-avatar.jpg" alt="Avatar 3" style={{ filter: 'hue-rotate(90deg)' }} />
                <img src="/goolix-avatar.jpg" alt="Avatar 4" style={{ filter: 'hue-rotate(180deg)' }} />
                <img src="/goolix-avatar.jpg" alt="Avatar 5" style={{ filter: 'hue-rotate(270deg)' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span className="nv-tech-meta" style={{ color: '#FFFFFF' }}>
                  ACTIVE COMMUNITY NODES
                </span>
                <span className="nv-tech-meta" style={{ fontSize: 10 }}>
                  OVER 1,240+ GUILDS POWERED BY GOOLIX OPUS-96K CORE
                </span>
              </div>
            </div>

            {/* Support Rate Tag */}
            <div className="nv-tech-meta" style={{
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              padding: '8px 16px',
              borderRadius: 9999,
              color: '#BFFF00'
            }}>
              STANDARD CONTRIBUTION: {priceRate} THB = 30 DAYS
            </div>
          </div>

          {/* Target Server Inspection Pill */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: 24,
            padding: '24px 28px',
            backdropFilter: 'blur(16px)'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 16,
              flexWrap: 'wrap',
              gap: 12
            }}>
              <span className="nv-tech-meta" style={{ color: '#BFFF00' }}>
                [ STEP 01 // TARGET GUILD VERIFICATION ]
              </span>
              <span className="nv-tech-meta">
                STATUS: {guildData?.guild ? 'VERIFIED' : 'AWAITING INPUT'}
              </span>
            </div>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <div className="nv-pill-form" style={{ flex: '1 1 340px' }}>
                <Terminal size={16} style={{ color: 'var(--nv-text-secondary)', marginRight: 10, flexShrink: 0 }} />
                <input
                  type="text"
                  placeholder={lang === 'th' ? 'กรอก DISCORD SERVER ID (เช่น 123456789...)' : 'ENTER DISCORD SERVER ID...'}
                  value={guildId}
                  onChange={(e) => setGuildId(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && verifyGuild()}
                  className="nv-pill-input"
                />
              </div>
              <button
                type="button"
                onClick={() => verifyGuild()}
                disabled={loadingGuild}
                className="btn-laser"
                style={{ padding: '12px 32px' }}
              >
                {loadingGuild ? 'INSPECTING...' : (lang === 'th' ? 'ตรวจสอบ' : 'INSPECT')}
              </button>
            </div>

            {/* Inspected Guild Status Badge */}
            {guildData?.guild && (
              <div style={{
                marginTop: 20,
                padding: '16px 20px',
                background: 'rgba(5, 5, 5, 0.7)',
                border: '1px solid rgba(191, 255, 0, 0.25)',
                borderRadius: 16,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 16
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  {guildData.guild.icon ? (
                    <img
                      src={guildData.guild.icon}
                      alt=""
                      style={{
                        width: 46,
                        height: 46,
                        borderRadius: '50%',
                        border: '2px solid #BFFF00',
                        boxShadow: '0 0 14px rgba(191, 255, 0, 0.35)',
                        objectFit: 'cover'
                      }}
                    />
                  ) : (
                    <div style={{
                      width: 46,
                      height: 46,
                      borderRadius: '50%',
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: '2px solid #BFFF00',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontFamily: "var(--font-mono-meta)"
                    }}>
                      {guildData.guild.name.charAt(0)}
                    </div>
                  )}
                  <div>
                    <div style={{
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                      fontWeight: 800,
                      fontSize: 16,
                      letterSpacing: '-0.02em',
                      textTransform: 'uppercase'
                    }}>
                      {guildData.guild.name}
                    </div>
                    <div className="nv-tech-meta" style={{ fontSize: 10, marginTop: 2 }}>
                      ID: {guildData.guild.id} // MEMBERS: {guildData.guild.memberCount}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
                  <div>
                    <div className="nv-tech-meta" style={{ fontSize: 9 }}>CURRENT STATUS</div>
                    <div style={{
                      fontFamily: "var(--font-mono-meta)",
                      fontSize: 12,
                      fontWeight: 700,
                      color: guildData.guild.isSupporter ? '#BFFF00' : 'var(--nv-text-secondary)',
                      letterSpacing: '0.1em'
                    }}>
                      {guildData.guild.isSupporter ? 'SUPPORTER [OPUS HQ]' : 'STANDARD [FREE]'}
                    </div>
                  </div>

                  <div>
                    <div className="nv-tech-meta" style={{ fontSize: 9 }}>TIME REMAINING</div>
                    <div className="nv-tabular-nums" style={{
                      fontFamily: "var(--font-mono-meta)",
                      fontSize: 12,
                      fontWeight: 700,
                      color: '#FFFFFF'
                    }}>
                      {formatExpiry(guildData.guild.expiresAt)}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Form Tabs: TrueMoney Voucher vs Drop Code */}
          <div style={{
            display: 'flex',
            gap: 12,
            alignItems: 'center'
          }}>
            <button
              type="button"
              onClick={() => setFormTab('voucher')}
              className="nv-tech-meta"
              style={{
                background: formTab === 'voucher' ? '#BFFF00' : 'rgba(255, 255, 255, 0.04)',
                color: formTab === 'voucher' ? '#050505' : 'var(--nv-text-secondary)',
                border: '1px solid ' + (formTab === 'voucher' ? '#BFFF00' : 'rgba(255, 255, 255, 0.08)'),
                borderRadius: 9999,
                padding: '10px 22px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                fontWeight: 700
              }}
            >
              [ 01 // TRUEMONEY VOUCHER ]
            </button>
            <button
              type="button"
              onClick={() => setFormTab('promo')}
              className="nv-tech-meta"
              style={{
                background: formTab === 'promo' ? '#BFFF00' : 'rgba(255, 255, 255, 0.04)',
                color: formTab === 'promo' ? '#050505' : 'var(--nv-text-secondary)',
                border: '1px solid ' + (formTab === 'promo' ? '#BFFF00' : 'rgba(255, 255, 255, 0.08)'),
                borderRadius: 9999,
                padding: '10px 22px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                fontWeight: 700
              }}
            >
              [ 02 // PROMO DROP CODE ]
            </button>
          </div>

          {/* Horizontal Brutalist Form */}
          {formTab === 'voucher' ? (
            <form onSubmit={handleTopup} style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: 24,
              padding: '28px',
              backdropFilter: 'blur(16px)',
              display: 'flex',
              flexDirection: 'column',
              gap: 20
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                <span className="nv-tech-meta" style={{ color: '#BFFF00' }}>
                  EXECUTE TRANSACTION // TRUEMONEY GIFT URL
                </span>
                <span className="nv-tech-meta">
                  1 RECIPIENT // VOLUNTARY CONTRIBUTION
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
                <div>
                  <label className="nv-tech-meta" style={{ display: 'block', marginBottom: 8, fontSize: 10 }}>
                    VOUCHER URL (HTTPS://GIFT.TRUEMONEY.COM/...)
                  </label>
                  <div className="nv-pill-form">
                    <input
                      type="text"
                      placeholder="https://gift.truemoney.com/campaign/?v=..."
                      value={voucher}
                      onChange={(e) => setVoucher(e.target.value)}
                      required
                      className="nv-pill-input"
                    />
                  </div>
                </div>

                <div>
                  <label className="nv-tech-meta" style={{ display: 'block', marginBottom: 8, fontSize: 10 }}>
                    REFERRAL CODE (OPTIONAL)
                  </label>
                  <div className="nv-pill-form">
                    <input
                      type="text"
                      placeholder="REF-XXXXXX"
                      value={referralCode}
                      onChange={(e) => {
                        const val = e.target.value.toUpperCase();
                        setReferralCode(val);
                        verifyReferral(val);
                      }}
                      className="nv-pill-input"
                      style={{ letterSpacing: '0.15em' }}
                    />
                  </div>
                  {referrerName && (
                    <div className="nv-tech-meta" style={{ color: '#BFFF00', marginTop: 6, fontSize: 9.5 }}>
                      REFERRER: {referrerName} [BONUS ELIGIBLE]
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                <button
                  type="submit"
                  disabled={submittingTopup}
                  className="btn-laser"
                  style={{ minWidth: 260, padding: '14px 32px' }}
                >
                  <Sparkles size={16} />
                  <span>
                    {submittingTopup
                      ? 'VERIFYING VOUCHER...'
                      : (lang === 'th' ? 'ยืนยันการร่วมสนับสนุน' : 'SUBMIT CONTRIBUTION')}
                  </span>
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleRedeemPromo} style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: 24,
              padding: '28px',
              backdropFilter: 'blur(16px)',
              display: 'flex',
              flexDirection: 'column',
              gap: 20
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                <span className="nv-tech-meta" style={{ color: '#BFFF00' }}>
                  CLAIM LIMITED EARLY-BIRD DROP CODE
                </span>
                <span className="nv-tech-meta">
                  SINGLE USE PER GUILD
                </span>
              </div>

              <div>
                <label className="nv-tech-meta" style={{ display: 'block', marginBottom: 8, fontSize: 10 }}>
                  PROMO DROP CODE (E.G. EARLY30)
                </label>
                <div className="nv-pill-form">
                  <input
                    type="text"
                    placeholder="ENTER CAMPAIGN CODE..."
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                    required
                    className="nv-pill-input"
                    style={{ letterSpacing: '0.2em' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                <button
                  type="submit"
                  disabled={submittingPromo}
                  className="btn-laser"
                  style={{ minWidth: 260, padding: '14px 32px' }}
                >
                  <Gift size={16} />
                  <span>
                    {submittingPromo
                      ? 'CLAIMING DROP...'
                      : (lang === 'th' ? 'เคลมสิทธิ์กิจกรรม' : 'REDEEM PROMO DROP')}
                  </span>
                </button>
              </div>
            </form>
          )}

          {/* Referral Link Sharing Console (If Guild loaded) */}
          {guildData?.guild?.referralCode && (
            <div style={{
              background: 'rgba(191, 255, 0, 0.03)',
              border: '1px solid rgba(191, 255, 0, 0.2)',
              borderRadius: 20,
              padding: '20px 24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 16
            }}>
              <div>
                <div className="nv-tech-meta" style={{ color: '#BFFF00', marginBottom: 4 }}>
                  GUILD REFERRAL ACCELERATOR
                </div>
                <div style={{
                  fontFamily: "var(--font-mono-meta)",
                  fontSize: 14,
                  fontWeight: 700,
                  letterSpacing: '0.1em'
                }}>
                  {guildData.guild.referralCode}
                </div>
                <div className="nv-tech-meta" style={{ fontSize: 10, marginTop: 4 }}>
                  INVITES: {guildData.guild.referralCount || 0} / {guildData?.referralConfig?.maxInvites ?? 6} GUILDS // REWARD: +{guildData?.referralConfig?.rewardDays ?? 30} DAYS EACH
                </div>
              </div>

              <button
                type="button"
                onClick={copyReferralLink}
                className="btn-laser"
                style={{ padding: '10px 24px', fontSize: 11 }}
              >
                <Copy size={13} />
                <span>{lang === 'th' ? 'คัดลอกลิงก์' : 'COPY INVITE LINK'}</span>
              </button>
            </div>
          )}
        </section>

        {/* 3. FEATURE BENTO GRID (3-COLUMN GRID, MIN-HEIGHT 450PX, LUMINOSITY CARDS) */}
        <section id="specs" style={{ paddingBottom: '72px' }}>
          <div style={{ marginBottom: 32 }}>
            <div className="nv-tech-meta" style={{ color: '#BFFF00', marginBottom: 8 }}>
              [ SECTION 02 // HARDWARE & STREAMING SPECIFICATIONS ]
            </div>
            <h2 style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontSize: 'clamp(2rem, 4vw, 3.2rem)',
              fontWeight: 800,
              letterSpacing: '-0.04em',
              textTransform: 'uppercase',
              margin: 0
            }}>
              FEATURE BENTO GRID
            </h2>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: 24
          }}>
            {/* Card 1: 01/SPEC - Audio Pipeline */}
            <div className="nv-luminosity-card">
              <div>
                <div className="nv-tech-meta" style={{ color: '#BFFF00', marginBottom: 16 }}>
                  01 / SPEC
                </div>
                <h3 style={{
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontSize: 28,
                  fontWeight: 800,
                  letterSpacing: '-0.03em',
                  textTransform: 'uppercase',
                  lineHeight: 1.15,
                  margin: 0,
                  color: '#FFFFFF'
                }}>
                  OPUS 96K STUDIO HQ
                </h3>
              </div>

              <div style={{ margin: '32px 0' }}>
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  background: 'rgba(255, 255, 255, 0.05)',
                  padding: '8px 14px',
                  borderRadius: 9999,
                  marginBottom: 16
                }}>
                  <Zap size={14} style={{ color: '#BFFF00' }} />
                  <span className="nv-tech-meta" style={{ fontSize: 10, color: '#FFFFFF' }}>
                    DIRECT NATIVE DEMUXING
                  </span>
                </div>
                <p style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 14,
                  lineHeight: 1.7,
                  color: 'var(--nv-text-secondary)',
                  margin: 0
                }}>
                  {lang === 'th'
                    ? 'ยกระดับการเข้ารหัสเสียงด้วย Opus 96k Studio HQ ถ่ายทอดมิติเสียง คอร์ด และย่านความถี่ต่ำคมชัดเต็มพิกัด ไม่ถูกบีบอัดแบบทั่วไป'
                    : 'Pristine 96 kbps Opus studio encoding bypasses default Discord compression ceilings for pristine dynamic acoustic range.'}
                </p>
              </div>

              <div className="nv-tech-meta" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: 16 }}>
                LATENCY: SUB-5MS // BITRATE: 96 KBPS FIXED
              </div>
            </div>

            {/* Card 2: 02/PIPELINE - Priority Lane */}
            <div className="nv-luminosity-card">
              <div>
                <div className="nv-tech-meta" style={{ color: '#BFFF00', marginBottom: 16 }}>
                  02 / PIPELINE
                </div>
                <h3 style={{
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontSize: 28,
                  fontWeight: 800,
                  letterSpacing: '-0.03em',
                  textTransform: 'uppercase',
                  lineHeight: 1.15,
                  margin: 0,
                  color: '#FFFFFF'
                }}>
                  PRIORITY LANE ZERO-WAIT
                </h3>
              </div>

              <div style={{ margin: '32px 0' }}>
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  background: 'rgba(255, 255, 255, 0.05)',
                  padding: '8px 14px',
                  borderRadius: 9999,
                  marginBottom: 16
                }}>
                  <Radio size={14} style={{ color: '#BFFF00' }} />
                  <span className="nv-tech-meta" style={{ fontSize: 10, color: '#FFFFFF' }}>
                    DEDICATED VIP SLOTS
                  </span>
                </div>
                <p style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 14,
                  lineHeight: 1.7,
                  color: 'var(--nv-text-secondary)',
                  margin: 0
                }}>
                  {lang === 'th'
                    ? 'การันตีช่องสัญญาณเสียงพิเศษ สตรีมได้ทันทีแม้คลัสเตอร์มีผู้ใช้งานหนาแน่น พร้อมระบบเล่นเพลงต่อเนื่องอัตโนมัติ (Autoplay)'
                    : 'Dedicated priority stream allocation bypasses shared wait queues instantly, complete with intelligent autonomous queue continuation.'}
                </p>
              </div>

              <div className="nv-tech-meta" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: 16 }}>
                CAPACITY: RESERVED // AUTOPLAY: ACTIVE
              </div>
            </div>

            {/* Card 3: 03/ACCESS - Server-Wide Pass */}
            <div className="nv-luminosity-card">
              <div>
                <div className="nv-tech-meta" style={{ color: '#BFFF00', marginBottom: 16 }}>
                  03 / ACCESS
                </div>
                <h3 style={{
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontSize: 28,
                  fontWeight: 800,
                  letterSpacing: '-0.03em',
                  textTransform: 'uppercase',
                  lineHeight: 1.15,
                  margin: 0,
                  color: '#FFFFFF'
                }}>
                  SERVER-WIDE PASS
                </h3>
              </div>

              <div style={{ margin: '32px 0' }}>
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  background: 'rgba(255, 255, 255, 0.05)',
                  padding: '8px 14px',
                  borderRadius: 9999,
                  marginBottom: 16
                }}>
                  <ShieldCheck size={14} style={{ color: '#BFFF00' }} />
                  <span className="nv-tech-meta" style={{ fontSize: 10, color: '#FFFFFF' }}>
                    NO INDIVIDUAL FEES
                  </span>
                </div>
                <p style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 14,
                  lineHeight: 1.7,
                  color: 'var(--nv-text-secondary)',
                  margin: 0
                }}>
                  {lang === 'th'
                    ? 'สิทธิ์ผูกกับเซิร์ฟเวอร์ สมาชิกทุกคนในห้องเสียงใช้งานร่วมกันได้ทันที ขยายคิว 50 เพลง และฟังเพลงความยาวเกิน 30 นาทีได้ไม่จำกัด'
                    : 'One contribution covers every member in the server. Expanded 50-track queue and unlimited playback duration for long mixes.'}
                </p>
              </div>

              <div className="nv-tech-meta" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: 16 }}>
                RATE: {priceRate} THB / 30 DAYS // QUEUE: 50 TRACKS
              </div>
            </div>
          </div>
        </section>

        {/* 4. LEGAL DISCLAIMER & TERMS OF SERVICE */}
        <section style={{
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: 24,
          padding: '32px',
          backdropFilter: 'blur(16px)',
          marginBottom: 40
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 20,
            flexWrap: 'wrap',
            gap: 16,
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            paddingBottom: 16
          }}>
            <div>
              <div className="nv-tech-meta" style={{ color: '#BFFF00', marginBottom: 4 }}>
                04 / LEGAL FRAMEWORK
              </div>
              <h3 style={{
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontSize: 18,
                fontWeight: 800,
                letterSpacing: '-0.02em',
                textTransform: 'uppercase',
                margin: 0
              }}>
                {lang === 'th' ? 'ข้อกำหนดและเงื่อนไขการสนับสนุน' : 'TERMS OF SERVICE & MERE CONDUIT NOTICE'}
              </h3>
            </div>

            <button
              type="button"
              onClick={() => setShowTosModal(true)}
              className="btn-laser"
              style={{ padding: '8px 22px', fontSize: 11 }}
            >
              <span>{lang === 'th' ? 'อ่านข้อตกลงฉบับเต็ม' : 'READ FULL TERMS'}</span>
              <ArrowRight size={13} />
            </button>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 20,
            fontFamily: "'Inter', sans-serif",
            fontSize: 12.5,
            lineHeight: 1.65,
            color: 'var(--nv-text-secondary)'
          }}>
            <div>
              <strong style={{ color: '#FFFFFF', display: 'block', marginBottom: 4 }}>
                {lang === 'th' ? 'สถานะผู้ส่งผ่านข้อมูล (Mere Conduit):' : 'Data Forwarder Status:'}
              </strong>
              {lang === 'th'
                ? 'GOOLIX ทำหน้าที่เป็นเพียงท่อส่งผ่านข้อมูลเสียงชั่วคราว (Data Forwarder) ไปยัง Discord โดยไม่มีการจัดเก็บหรือเผยแพร่ไฟล์สื่อถาวรบนเซิร์ฟเวอร์'
                : 'Operates solely as a transient data forwarder (Mere Conduit) routing stream data to Discord without persistent media storage.'}
            </div>

            <div>
              <strong style={{ color: '#FFFFFF', display: 'block', marginBottom: 4 }}>
                {lang === 'th' ? 'การร่วมสนับสนุนโดยสมัครใจ:' : 'Voluntary Server Support:'}
              </strong>
              {lang === 'th'
                ? 'ยอดสนับสนุนผ่านซอง TrueMoney เป็นการร่วมบริจาคค่าบำรุงรักษาโหนดโดยสมัครใจ ไม่สามารถขอคืนเงินหรือโอนย้ายสิทธิ์ข้ามเซิร์ฟเวอร์ได้'
                : 'Voucher redemptions represent voluntary server hosting contributions. All contributions are final and non-refundable.'}
            </div>

            <div>
              <strong style={{ color: '#FFFFFF', display: 'block', marginBottom: 4 }}>
                {lang === 'th' ? 'ความพร้อมใช้งานและระบบ:' : 'System Reliability & As-Is:'}
              </strong>
              {lang === 'th'
                ? 'ระบบให้บริการตามสภาพจริง (As-Is) ขอสงวนสิทธิ์ตัดสายอัตโนมัติเมื่อห้องเสียงว่าง หรือปิดปรับปรุงโหนดตามความจำเป็นเพื่อรักษาเสถียรภาพส่วนรวม'
                : 'Services provided "As-Is" with automated idle disconnects and necessary maintenance windows to ensure overall cluster stability.'}
            </div>
          </div>
        </section>

      </div>

      {/* 5. MOBILE FIXED BOTTOM NAVIGATION PILL */}
      <aside className="nv-mobile-bottom-nav">
        <a href="#support" className="nv-mobile-nav-btn active" title="Topup / Support">
          <Sparkles size={20} />
        </a>
        <a href="#specs" className="nv-mobile-nav-btn" title="Specs Bento">
          <Disc3 size={20} />
        </a>
        <button
          type="button"
          onClick={() => setShowTosModal(true)}
          className="nv-mobile-nav-btn"
          title="Terms & Legal"
        >
          <FileText size={20} />
        </button>
      </aside>

      {/* 6. FULL TERMS OF SERVICE MODAL DIALOG */}
      {showTosModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 1000,
          background: 'rgba(5, 5, 5, 0.9)',
          backdropFilter: 'blur(16px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24
        }} onClick={() => setShowTosModal(false)}>
          <div style={{
            background: 'var(--nv-black)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: 24,
            width: '100%',
            maxWidth: 780,
            maxHeight: '85vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 30px 60px rgba(0, 0, 0, 0.9), 0 0 40px rgba(191, 255, 0, 0.1)',
            overflow: 'hidden'
          }} onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '24px 32px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
            }}>
              <div>
                <div className="nv-tech-meta" style={{ color: '#BFFF00', marginBottom: 4 }}>
                  LEGAL FRAMEWORK // FULL AGREEMENT
                </div>
                <div style={{
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontWeight: 800,
                  fontSize: 18,
                  letterSpacing: '-0.02em',
                  textTransform: 'uppercase',
                  color: '#FFFFFF'
                }}>
                  {lang === 'th' ? 'ข้อตกลงและเงื่อนไขการใช้งาน (TERMS OF SERVICE)' : 'TERMS OF SERVICE (FULL AGREEMENT)'}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowTosModal(false)}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#FFFFFF',
                  width: 36,
                  height: 36,
                  borderRadius: 9999,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{
              padding: '32px',
              overflowY: 'auto',
              fontFamily: "'Inter', sans-serif",
              fontSize: 13,
              lineHeight: 1.75,
              color: 'var(--nv-text-secondary)',
              display: 'flex',
              flexDirection: 'column',
              gap: 24
            }}>
              <div>
                <div className="nv-tech-meta" style={{ color: '#FFFFFF', marginBottom: 6 }}>
                  01 // MERE CONDUIT & CONTENT RESPONSIBILITY
                </div>
                <p style={{ margin: 0 }}>
                  {lang === 'th'
                    ? 'GOOLIX ทำหน้าที่เป็นเพียงท่อส่งผ่านข้อมูลชั่วคราว (Transmission Buffer) จากแหล่งต้นทางที่ผู้ใช้งานระบุไปยังห้องเสียงของ Discord เท่านั้น ไม่มีการจัดเก็บ ดัดแปลง หรือเผยแพร่ไฟล์สื่อในฐานข้อมูลถาวร ผู้ใช้งานเป็นผู้รับผิดชอบต่อคำสั่งค้นหาและลิงก์ที่สั่งเล่นแต่เพียงผู้เดียว'
                    : 'GOOLIX acts exclusively as a transient transmission buffer routing stream data requested by users directly to Discord voice channels. No media files are permanently hosted or retained.'}
                </p>
              </div>

              <div>
                <div className="nv-tech-meta" style={{ color: '#BFFF00', marginBottom: 6 }}>
                  02 // VOLUNTARY CONTRIBUTION & PASS TERMS
                </div>
                <p style={{ margin: 0 }}>
                  {lang === 'th'
                    ? 'ยอดเงินสนับสนุนผ่านซอง TrueMoney เป็นการร่วมบริจาคสนับสนุนค่าเช่าเซิร์ฟเวอร์และแบนด์วิธตามความสมัครใจ สิทธิ์ Supporter จะผูกกับ Server ID ที่ระบุเพื่อให้สมาชิกทุกคนใช้งานร่วมกันได้ทันที โดยคำนวณวันใช้งานตามอัตรามาตรฐานที่แสดงบนหน้าเว็บ ณ ขณะทำรายการ และไม่สามารถขอคืนเงินหรือโอนย้ายสิทธิ์ข้ามเซิร์ฟเวอร์ได้ในทุกกรณี'
                    : 'Contributions represent voluntary infrastructure donations. Supporter privileges bind to the specified Server ID for collective member access. All contributions are final and strictly non-refundable.'}
                </p>
              </div>

              <div>
                <div className="nv-tech-meta" style={{ color: '#FFFFFF', marginBottom: 6 }}>
                  03 // AVAILABILITY & SYSTEM GOVERNANCE
                </div>
                <p style={{ margin: 0 }}>
                  {lang === 'th'
                    ? 'ระบบให้บริการตามสภาพจริง (As-Is) ทีมพัฒนาขอสงวนสิทธิ์ในการตัดสายอัตโนมัติเมื่อห้องเสียงว่าง รีสตาร์ทปรับปรุงโหนด หรือจำกัดสิทธิ์เซิร์ฟเวอร์ที่ใช้งานผิดปกติ (Spam/Flood) เพื่อรักษาความต่อเนื่องของสัญญาณเสียงส่วนรวม'
                    : 'Services provided As-Is. The system reserves the right to disconnect idle channels, conduct node updates, or throttle abusive guilds to ensure global streaming stability.'}
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '20px 32px',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              justifyContent: 'flex-end'
            }}>
              <button
                type="button"
                onClick={() => setShowTosModal(false)}
                className="btn-laser"
                style={{ padding: '10px 28px', fontSize: 12 }}
              >
                {lang === 'th' ? 'เข้าใจและยอมรับข้อตกลง' : 'I UNDERSTAND & AGREE'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
