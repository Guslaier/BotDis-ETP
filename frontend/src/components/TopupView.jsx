import React, { useState, useEffect } from 'react';
import { 
  IconSparkles, IconCircleCheck, IconAlertCircle, IconGift, IconServer, IconShieldCheck, 
  IconClock, IconArrowRight, IconCopy, IconBolt, IconMusic, IconAward,
  IconFileText, IconX, IconCheck, IconHeadphones, IconLock,
  IconBulb, IconUsers, IconFlame, IconHelp, IconSearch, IconChevronDown, IconChevronUp
} from '@tabler/icons-react';

function IconTrueMoneyVoucher({ size = 18, stroke = 1.8, style = {}, className = '', ...props }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={{
        display: 'inline-block',
        verticalAlign: 'middle',
        flexShrink: 0,
        ...style
      }}
      {...props}
    >
      <rect x="3" y="4" width="18" height="16" rx="3" />
      <path d="M3 9.5c2.5 1.5 4.5 2.5 6.2 2.5" />
      <path d="M14.8 12c1.7 0 3.7-1 6.2-2.5" />
      <circle cx="12" cy="12" r="2.8" />
      <path d="M10.8 11.2l.6 1.6l.6-1.2l.6 1.2l.6-1.6" strokeWidth={Math.max(1, stroke * 0.72)} />
    </svg>
  );
}

export default function TopupView({ lang, onToast }) {
  const [guildId, setGuildId] = useState('');
  const [userId, setUserId] = useState('');
  const [guildData, setGuildData] = useState(null);
  const [loadingGuild, setLoadingGuild] = useState(false);
  const [formTab, setFormTab] = useState('voucher'); // 'voucher' | 'promo'
  const [showTosModal, setShowTosModal] = useState(false);
  const [showVoucherGuideModal, setShowVoucherGuideModal] = useState(false);
  const [openAccordion, setOpenAccordion] = useState(null);

  // Forms
  const [voucher, setVoucher] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [referrerName, setReferrerName] = useState('');
  const [promoCode, setPromoCode] = useState('');
  const [submittingTopup, setSubmittingTopup] = useState(false);
  const [submittingPromo, setSubmittingPromo] = useState(false);

  const isMaxStacked = Boolean(
    guildData?.guild?.isSupporter && 
    guildData?.guild?.expiresAt && 
    ((guildData.guild.expiresAt - Date.now()) >= 90 * 24 * 3600 * 1000)
  );

  const formatCountdown = (targetMs, l) => {
    if (!targetMs) return null;
    const diff = targetMs - Date.now();
    if (diff <= 0) return l === 'th' ? 'หมดเวลาแล้ว' : 'Expired';
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (days > 0) {
      return l === 'th' ? `เหลืออีก ${days} วัน ${hours} ชม.` : `${days}d ${hours}h left`;
    }
    return l === 'th' ? `เหลืออีก ${hours} ชม. ${minutes} นาที` : `${hours}h ${minutes}m left`;
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
      if (data.success && data.referrerGuildName) {
        setReferrerName(data.referrerGuildName);
        onToast('success', lang === 'th' ? 'พบรหัสแนะนำเพื่อน' : 'Referral Applied', lang === 'th' ? `เซิร์ฟเวอร์: ${data.referrerGuildName}` : `Referrer: ${data.referrerGuildName}`);
      } else {
        setReferrerName('');
        onToast('info', lang === 'th' ? 'บันทึกโค้ดแล้ว' : 'Code Saved', lang === 'th' ? 'ระบบจะตรวจสอบเมื่อกดยืนยันการสนับสนุน' : 'Will be validated on confirmation');
      }
    } catch {
      setReferrerName('');
    }
  };

  const handleApplyReferral = (e) => {
    if (e) e.preventDefault();
    if (!referralCode.trim()) {
      onToast('warning', lang === 'th' ? 'กรุณาระบุโค้ด' : 'Enter Code');
      return;
    }
    verifyReferral(referralCode);
  };

  const handleTopup = async (e) => {
    if (e) e.preventDefault();
    if (isMaxStacked) {
      onToast('warning', lang === 'th' ? 'วันใช้งานสะสมเต็มเพดาน' : 'Max Cap Reached', lang === 'th' ? 'เซิร์ฟเวอร์นี้มีวันสะสมครบ 90 วันแล้ว กรุณารอให้วันลดลงก่อนเติมเพิ่มครับ' : 'Server reached 90-day cap');
      return;
    }
    if (!guildId.trim()) {
      onToast('warning', lang === 'th' ? 'กรุณาระบุ Guild ID' : 'Missing Guild ID', lang === 'th' ? 'เลือกหรือกรอกไอดีเซิร์ฟเวอร์ก่อนครับ' : 'Provide Guild ID first');
      return;
    }
    if (!voucher.trim()) {
      onToast('warning', lang === 'th' ? 'กรุณาระบุลิงก์ซอง' : 'Missing Voucher', lang === 'th' ? 'วางลิงก์ซองของขวัญ TrueMoney ครับ' : 'Enter voucher link');
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
        onToast('success', lang === 'th' ? 'ร่วมสนับสนุนสำเร็จ!' : 'Support Successful!', lang === 'th' ? `ปลดล็อกวันผู้สนับสนุน +${data.addedDays} วัน (ยอด ${data.amount} บาท)` : `Added +${data.addedDays} Supporter days (${data.amount} THB)`);
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
    if (e) e.preventDefault();
    if (!guildId.trim()) {
      onToast('warning', lang === 'th' ? 'กรุณาระบุ Guild ID' : 'Missing Guild ID');
      return;
    }
    if (!promoCode.trim()) {
      onToast('warning', lang === 'th' ? 'กรุณาระบุโค้ด' : 'Missing Code');
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
        onToast('success', lang === 'th' ? 'เคลมสิทธิ์สำเร็จ!' : 'Code Redeemed!', lang === 'th' ? `ได้รับสิทธิ์ ${data.campaignName} (+${data.addedDays} วัน)` : `Received +${data.addedDays} days`);
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
      return lang === 'th' ? 'ยังไม่มีสถานะ Supporter (ทั่วไป)' : 'No Active Supporter';
    }
    const diff = timestamp - Date.now();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    return `${days} ${lang === 'th' ? 'วัน' : 'days'} ${hours} ${lang === 'th' ? 'ชม.' : 'hrs'} (${new Date(timestamp).toLocaleDateString('th-TH')})`;
  };

  const priceRate = guildData?.config?.price30Days ?? 29;

  return (
    <div style={{ maxWidth: 1080, margin: '24px auto', padding: '0 18px' }} className="fade-in">
      
      {/* 1. HERO SOUNDSTAGE HEADER */}
      <section style={{
        textAlign: 'center',
        padding: '8rem 20px',
        position: 'relative',
        overflow: 'hidden',
        marginBottom: 8
      }}>
        {/* Ambient Studio Audio Frequency Waveform Background */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 'min(760px, 96vw)',
          height: 150,
          pointerEvents: 'none',
          opacity: 0.12,
          zIndex: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 5
        }}>
          {[22, 38, 28, 54, 42, 70, 48, 34, 65, 84, 58, 92, 68, 80, 46, 62, 38, 74, 44, 58, 30, 46, 24].map((h, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                height: `${h}%`,
                borderRadius: 2,
                background: 'linear-gradient(180deg, var(--slime-green) 0%, rgba(0, 229, 255, 0.4) 60%, transparent 100%)'
              }}
            />
          ))}
        </div>

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '4px 14px',
            borderRadius: 999,
            background: 'rgba(0, 255, 135, 0.08)',
            border: '1px solid rgba(0, 255, 135, 0.25)',
            color: 'var(--slime-green)',
            fontSize: 11.5,
            fontWeight: 700,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            marginBottom: 16
          }}>
            <IconBolt size={14} stroke={1.8} />
            <span>{lang === 'th' ? 'GOOLIX สตรีมเสียงระดับ HQ' : 'GOOLIX High-Fidelity Audio Core'}</span>
          </div>

          <h1 style={{
            fontSize: 'clamp(2rem, 4.5vw, 3.2rem)',
            fontWeight: 800,
            letterSpacing: '-0.03em',
            lineHeight: 1.15,
            color: '#FFFFFF',
            margin: '0 0 12px 0'
          }}>
            {lang === 'th' ? (
              <>
                ปลดล็อกเสียงคมชัดระดับ <span style={{ color: 'var(--slime-green)' }}>HQ</span><br />
                ให้ทุกคนในเซิร์ฟเวอร์ของคุณ
              </>
            ) : (
              <>
                Upgrade to <span style={{ color: 'var(--slime-green)' }}>HQ</span> Sound<br />
                For Your Entire Community
              </>
            )}
          </h1>

          <p style={{
            maxWidth: 680,
            margin: '0 auto 18px',
            color: '#E2E8F0',
            fontSize: 'clamp(14px, 2vw, 15.5px)',
            fontWeight: 500,
            lineHeight: 1.65,
            letterSpacing: '-0.01em'
          }}>
            {lang === 'th'
              ? 'สมาชิกทุกคนในห้องเสียงฟังคุณภาพ 96 kbps ทันที และฟังเพลงอย่างต่อเนื่องไม่จำกัด เพียงสนับสนุนเรา'
              : 'Instant 96 kbps HQ audio for everyone in your voice channel with uninterrupted continuous listening, simply by supporting us.'}
          </p>

          {/* Understated Feature Strip */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            flexWrap: 'wrap',
            fontSize: 12,
            color: 'var(--text-sub)',
            padding: '6px 18px',
            borderRadius: 999,
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(255, 255, 255, 0.07)'
          }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <IconHeadphones size={13} stroke={2} style={{ color: 'var(--slime-green)' }} />
              <span style={{ fontWeight: 600, color: '#E2E8F0' }}>96 kbps HQ</span>
            </div>
            <span style={{ color: 'rgba(255, 255, 255, 0.15)' }}>•</span>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <IconBolt size={13} stroke={2} style={{ color: 'var(--slime-green)' }} />
              <span style={{ fontWeight: 600, color: '#E2E8F0' }}>Priority Fast Slot</span>
            </div>
            <span style={{ color: 'rgba(255, 255, 255, 0.15)' }}>•</span>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <IconClock size={13} stroke={2} style={{ color: 'var(--slime-green)' }} />
              <span style={{ fontWeight: 600, color: '#E2E8F0' }}>Unlimited Duration</span>
            </div>
            <span style={{ color: 'rgba(255, 255, 255, 0.15)' }}>•</span>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <IconMusic size={13} stroke={2} style={{ color: 'var(--slime-green)' }} />
              <span style={{ fontWeight: 600, color: '#E2E8F0' }}>50-Track Queue</span>
            </div>
            <span style={{ color: 'rgba(255, 255, 255, 0.15)' }}>•</span>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <IconSparkles size={13} stroke={2} style={{ color: 'var(--slime-green)' }} />
              <span style={{ fontWeight: 600, color: '#E2E8F0' }}>Smart Autoplay</span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. EARLY-BIRD DROP BANNER (When Active) */}
      {guildData?.campaign && (
        <div className="glass-panel" style={{
          padding: '16px 22px',
          marginBottom: 24,
          border: '1px solid rgba(0, 255, 135, 0.35)',
          background: 'linear-gradient(135deg, rgba(0, 255, 135, 0.08) 0%, rgba(14, 20, 34, 0.98) 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 42,
              height: 42,
              borderRadius: 12,
              background: 'rgba(0, 255, 135, 0.12)',
              border: '1px solid rgba(0, 255, 135, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--slime-green)'
            }}>
              <IconGift size={20} stroke={1.8} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontWeight: 800, fontSize: 14.5, color: '#FFF' }}>
                  {guildData.campaign.name}
                </span>
                <span className="slime-badge" style={{ fontSize: 10, padding: '2px 8px' }}>
                  FREE {guildData.campaign.days || 30} DAYS
                </span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-sub)', marginTop: 2 }}>
                {lang === 'th' ? 'สิทธิ์เปิดตัวเซิร์ฟเวอร์ เหลือเพียง' : 'Launch Drop remaining:'}{' '}
                <strong style={{ color: 'var(--slime-green)' }}>{guildData.campaign.remaining}</strong> / {guildData.campaign.maxClaims} {lang === 'th' ? 'สิทธิ์' : 'claims'}
                {guildData.campaign.expiresAt && (
                  <span style={{ marginLeft: 8 }}>
                    • {lang === 'th' ? 'หมดเขต:' : 'Ends:'} <strong style={{ color: 'var(--amber-warn)' }}>{new Date(guildData.campaign.expiresAt).toLocaleDateString('th-TH')}</strong>
                  </span>
                )}
              </div>
            </div>
          </div>

          <form onSubmit={handleRedeemPromo} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              type="text"
              placeholder={lang === 'th' ? 'กรอกรหัสแคมเปญ...' : 'Promo code...'}
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
              style={{ width: 140, padding: '8px 12px', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}
            />
            <button type="submit" disabled={submittingPromo} className="btn btn-sm btn-primary">
              {submittingPromo ? '...' : (lang === 'th' ? 'รับสิทธิ์' : 'Claim')}
            </button>
          </form>
        </div>
      )}

      {/* 3. MAIN WORKFLOW: 2-COLUMN COMMAND LAYOUT */}
      <div className="donate-grid-layout" style={{ marginBottom: 26 }}>
        
        {/* LEFT COLUMN: TARGET GUILD (STEP 1) + BENEFIT COMPARISON */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          
          {/* CARD 1: TARGET GUILD (STEP 01) */}
          <div className="glass-panel" style={{ padding: '22px 24px', borderRadius: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div className="terminal-badge">1</div>
                <h2 style={{ fontSize: 15, fontWeight: 700, color: '#FFFFFF', margin: 0, letterSpacing: '-0.01em' }}>
                  {lang === 'th' ? 'เซิร์ฟเวอร์เป้าหมาย (Target Guild)' : 'Target Guild (Server Selection)'}
                </h2>
              </div>
              <span style={{
                fontSize: 10.5,
                fontWeight: 700,
                color: 'var(--slime-green)',
                padding: '2px 9px',
                borderRadius: 999,
                border: '1px solid rgba(0, 255, 135, 0.3)',
                background: 'rgba(0, 255, 135, 0.05)',
                letterSpacing: '0.04em'
              }}>
                Step 01
              </span>
            </div>

            <p style={{ fontSize: 12, color: 'var(--text-dim)', margin: '0 0 16px 0' }}>
              {lang === 'th' ? 'กรอก Discord Guild ID (Server ID) เพื่อตรวจสอบสถานะบอท' : 'Enter Discord Guild ID to verify connection status'}
            </p>

            {/* Guild ID Input Form */}
            <form onSubmit={(e) => { e.preventDefault(); verifyGuild(); }} style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <input
                type="text"
                placeholder={lang === 'th' ? 'เช่น 809106810929807361' : 'e.g. 809106810929807361'}
                value={guildId}
                onChange={(e) => setGuildId(e.target.value.trim())}
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  borderRadius: 10,
                  background: 'rgba(5, 7, 12, 0.75)',
                  border: '1px solid var(--border-light)',
                  color: '#FFFFFF',
                  fontSize: 13,
                  fontFamily: 'var(--font-mono)',
                  letterSpacing: '0.03em'
                }}
              />
              <button
                type="submit"
                disabled={loadingGuild}
                style={{
                  padding: '0 18px',
                  borderRadius: 10,
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.16)',
                  color: '#FFFFFF',
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  whiteSpace: 'nowrap',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                <IconSearch size={14} />
                <span>{loadingGuild ? '...' : (lang === 'th' ? 'ค้นหา' : 'Search')}</span>
              </button>
            </form>

            {/* Verified Guild Status Plate */}
            {guildData?.guild ? (
              <div style={{
                background: 'rgba(5, 7, 12, 0.85)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 14,
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: 12
              }}>
                {/* Guild Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {guildData.guild.icon ? (
                    <img
                      src={guildData.guild.icon}
                      alt=""
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 12,
                        objectFit: 'cover',
                        border: '1px solid rgba(255, 255, 255, 0.12)'
                      }}
                    />
                  ) : (
                    <div style={{
                      width: 48,
                      height: 48,
                      borderRadius: 12,
                      background: 'rgba(0, 255, 135, 0.12)',
                      border: '1px solid rgba(0, 255, 135, 0.35)',
                      color: 'var(--slime-green)',
                      fontWeight: 800,
                      fontSize: 17,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      {guildData.guild.name ? guildData.guild.name.substring(0, 2).toUpperCase() : 'BN'}
                    </div>
                  )}
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{
                        fontWeight: 800,
                        fontSize: 15,
                        color: '#FFFFFF',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {guildData.guild.name}
                      </span>
                      <IconCircleCheck size={16} style={{ color: 'var(--slime-green)', flexShrink: 0 }} />
                    </div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-dim)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span>ID: {guildData.guild.id}</span>
                      <span>•</span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <IconUsers size={13} />
                        {guildData.guild.memberCount || 0} {lang === 'th' ? 'สมาชิก' : 'members'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Status & Expiry 2-Column Stat Grid */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: 10
                }}>
                  {/* Status Pill Plate */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '11px 14px',
                    borderRadius: 10,
                    background: guildData.guild.isSupporter ? 'rgba(0, 255, 135, 0.08)' : 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid ' + (guildData.guild.isSupporter ? 'rgba(0, 255, 135, 0.28)' : 'var(--border-subtle)')
                  }}>
                    <span style={{ fontSize: 12, color: 'var(--text-sub)', whiteSpace: 'nowrap' }}>
                      {lang === 'th' ? 'สถานะ:' : 'Status:'}
                    </span>
                    <span style={{
                      fontWeight: 800,
                      fontSize: 12,
                      letterSpacing: '0.04em',
                      color: guildData.guild.isSupporter ? 'var(--slime-green)' : 'var(--text-dim)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      whiteSpace: 'nowrap'
                    }}>
                      {guildData.guild.isSupporter ? <IconShieldCheck size={14} /> : null}
                      {guildData.guild.isSupporter ? 'SUPPORTER' : (lang === 'th' ? 'ทั่วไป (STANDARD)' : 'STANDARD')}
                    </span>
                  </div>

                  {/* Expiry Details */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '11px 14px',
                    borderRadius: 10,
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid var(--border-subtle)'
                  }}>
                    <span style={{ fontSize: 12, color: 'var(--text-sub)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <IconClock size={13} style={{ color: 'var(--cyan-freq)' }} />
                      {lang === 'th' ? 'วันใช้งานคงเหลือ:' : 'Remaining Time:'}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#FFF' }}>
                        {formatExpiry(guildData.guild.expiresAt)}
                      </span>
                      {isMaxStacked && (
                        <span style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: 'var(--amber-warn)',
                          background: 'rgba(245, 158, 11, 0.1)',
                          border: '1px solid rgba(245, 158, 11, 0.3)',
                          padding: '1px 6px',
                          borderRadius: 4
                        }}>
                          {lang === 'th' ? 'เต็มเพดาน' : 'Max Cap'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Compact Referral Snippet Strip */}
                {guildData.guild.referralCode && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: 8,
                    background: 'rgba(255, 255, 255, 0.025)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    fontSize: 11.5,
                    color: 'var(--text-sub)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, overflow: 'hidden' }}>
                      <span style={{ color: 'var(--text-dim)', fontSize: 11, whiteSpace: 'nowrap' }}>
                        {lang === 'th' ? 'รหัสชวนเพื่อน:' : 'Guild Ref:'}
                      </span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#FFFFFF', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
                        {guildData.guild.referralCode}
                      </span>
                      <span style={{ fontSize: 10.5, color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>
                        ({lang === 'th' ? 'ชวนแล้ว' : 'Invited'} {guildData.guild.referralCount || 0}/{guildData?.referralConfig?.maxInvites ?? guildData.guild.maxReferralMonths ?? 6})
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={copyReferralLink}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--slime-green)',
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        padding: '2px 6px',
                        borderRadius: 4,
                        whiteSpace: 'nowrap'
                      }}
                      title={lang === 'th' ? 'คัดลอกลิงก์ชวนเพื่อน' : 'Copy referral link'}
                    >
                      <IconCopy size={12} />
                      <span>{lang === 'th' ? 'คัดลอก' : 'Copy'}</span>
                    </button>
                  </div>
                )}

                {/* Bottom Status Info Strip */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingTop: 11,
                  marginTop: 2,
                  borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                  fontSize: 11.5,
                  color: 'var(--text-sub)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <IconHeadphones size={14} style={{ color: 'var(--slime-green)' }} />
                    <span>{lang === 'th' ? 'สถานะบอท: พร้อมสตรีมเสียง HQ' : 'Bot Engine: Ready for HQ Audio'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--slime-green)', fontSize: 11, fontWeight: 700 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--slime-green)' }} />
                    <span>{lang === 'th' ? 'ระบบออนไลน์' : 'Online'}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{
                background: 'rgba(5, 7, 12, 0.5)',
                border: '1px dashed rgba(255, 255, 255, 0.1)',
                borderRadius: 14,
                padding: '20px 16px',
                textAlign: 'center',
                color: 'var(--text-dim)',
                fontSize: 12
              }}>
                <IconServer size={22} style={{ color: 'var(--text-dim)', marginBottom: 6, opacity: 0.6 }} />
                <div>{lang === 'th' ? 'กรอก Discord Guild ID ด้านบนเพื่อตรวจสอบสถานะเซิร์ฟเวอร์' : 'Enter Discord Guild ID above to inspect status'}</div>
              </div>
            )}
          </div>

          {/* CARD 2: BENEFIT COMPARISON */}
          <div className="glass-panel" style={{ padding: '22px 24px', borderRadius: 18 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <IconFlame size={17} style={{ color: 'var(--slime-green)' }} />
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: '#FFFFFF', margin: 0 }}>
                    {lang === 'th' ? 'เปรียบเทียบสิทธิประโยชน์' : 'Tier Comparison Matrix'}
                  </h3>
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--text-dim)', marginTop: 3 }}>
                  {lang === 'th' ? 'สิทธิ์ระดับเซิร์ฟเวอร์ ปลดล็อกพร้อมกันทุกคนในห้องเสียง' : 'Server-wide unlock for everyone in voice channel'}
                </div>
              </div>
              <span style={{
                fontSize: 12,
                fontWeight: 800,
                color: 'var(--slime-green)',
                background: 'rgba(0, 255, 135, 0.1)',
                border: '1px solid rgba(0, 255, 135, 0.35)',
                padding: '4px 12px',
                borderRadius: 999,
                letterSpacing: '0.02em',
                whiteSpace: 'nowrap'
              }}>
                {priceRate} {lang === 'th' ? 'บาท / 30 วัน' : 'THB / 30 Days'}
              </span>
            </div>

            {/* 2-Column Comparison Layout */}
            <div className="benefit-grid-columns">
              
              {/* Column A: Standard */}
              <div style={{
                background: 'rgba(5, 7, 12, 0.55)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 12,
                padding: '16px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', minHeight: 22, marginBottom: 14 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: '#E2E8F0' }}>
                    {lang === 'th' ? 'ทั่วไป (STANDARD)' : 'STANDARD'}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 11, fontSize: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#CBD5E1' }}>
                    <IconCheck size={15} style={{ color: 'var(--slime-green)', flexShrink: 0 }} />
                    <span>{lang === 'th' ? 'คุณภาพเสียงมาตรฐาน 64 kbps' : 'Standard 64 kbps audio'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#CBD5E1' }}>
                    <IconCheck size={15} style={{ color: 'var(--slime-green)', flexShrink: 0 }} />
                    <span>{lang === 'th' ? 'คิวเพลงสูงสุด 10 เพลง' : 'Max 10 songs in queue'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#94A3B8' }}>
                    <IconX size={15} style={{ color: '#F87171', flexShrink: 0 }} />
                    <span>{lang === 'th' ? 'จำกัดความยาว 30 นาที/เพลง' : 'Track capped at 30 mins'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#94A3B8' }}>
                    <IconX size={15} style={{ color: '#F87171', flexShrink: 0 }} />
                    <span>{lang === 'th' ? 'แชร์ช่องสัญญาณ (หากเต็มต้องรอคิว)' : 'Shared stream slot queue'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#94A3B8' }}>
                    <IconX size={15} style={{ color: '#F87171', flexShrink: 0 }} />
                    <span>{lang === 'th' ? 'ไม่มีระบบเล่นเพลงต่อเนื่อง (Autoplay)' : 'No continuous Autoplay'}</span>
                  </div>
                </div>
              </div>

              {/* Column B: Supporter (Highlighted) */}
              <div style={{
                background: 'rgba(0, 255, 135, 0.04)',
                border: '1px solid rgba(0, 255, 135, 0.4)',
                borderRadius: 12,
                padding: '16px',
                position: 'relative'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 22, marginBottom: 14 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--slime-green)' }}>
                    SUPPORTER
                  </div>
                  <span style={{
                    fontSize: 9.5,
                    fontWeight: 800,
                    color: '#05070B',
                    background: 'var(--slime-green)',
                    padding: '2.5px 8px',
                    borderRadius: 6,
                    letterSpacing: '0.04em'
                  }}>
                    RECOMMENDED
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 11, fontSize: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#FFFFFF', fontWeight: 600 }}>
                    <IconCheck size={15} style={{ color: 'var(--slime-green)', flexShrink: 0 }} />
                    <span>{lang === 'th' ? 'ปลดล็อกทั้งเซิร์ฟเวอร์ (ครอบคลุมทุกคน)' : 'Unlocks for whole server'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#F8FAFC' }}>
                    <IconCheck size={15} style={{ color: 'var(--slime-green)', flexShrink: 0 }} />
                    <span>{lang === 'th' ? 'คุณภาพเสียงสูงสุด 96 kbps HQ' : '96 kbps HQ sound'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#F8FAFC' }}>
                    <IconCheck size={15} style={{ color: 'var(--slime-green)', flexShrink: 0 }} />
                    <span>{lang === 'th' ? 'Priority Fast Slot เปิดเพลงได้ทันที' : 'Priority Slot: instant access'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#F8FAFC' }}>
                    <IconCheck size={15} style={{ color: 'var(--slime-green)', flexShrink: 0 }} />
                    <span>{lang === 'th' ? 'ไม่จำกัดความยาวเพลง (เกิน 30 นาทีได้)' : 'No track length limit'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#F8FAFC' }}>
                    <IconCheck size={15} style={{ color: 'var(--slime-green)', flexShrink: 0 }} />
                    <span>{lang === 'th' ? 'ขยายคิวเพลงสูงสุด 50 เพลง' : 'Expand queue to 50 songs'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#F8FAFC' }}>
                    <IconCheck size={15} style={{ color: 'var(--slime-green)', flexShrink: 0 }} />
                    <span>{lang === 'th' ? 'Smart Autoplay เพลงต่อเนื่องไม่มีสะดุด' : 'Smart continuous Autoplay'}</span>
                  </div>
                </div>
              </div>

            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: CHECKOUT TERMINAL (STEP 2) */}
        <div className="glass-panel" style={{ padding: '22px 24px', borderRadius: 18, display: 'flex', flexDirection: 'column' }}>
          
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div className="terminal-badge">2</div>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: '#FFFFFF', margin: 0, letterSpacing: '-0.01em' }}>
                {lang === 'th' ? 'ทำรายการสนับสนุน (Checkout Terminal)' : 'Checkout Terminal'}
              </h2>
            </div>
            <span style={{
              fontSize: 10.5,
              fontWeight: 700,
              color: 'var(--slime-green)',
              padding: '2px 9px',
              borderRadius: 999,
              border: '1px solid rgba(0, 255, 135, 0.3)',
              background: 'rgba(0, 255, 135, 0.05)',
              letterSpacing: '0.04em'
            }}>
              Step 02
            </span>
          </div>

          <p style={{ fontSize: 12, color: 'var(--text-dim)', margin: '0 0 16px 0' }}>
            {lang === 'th' ? 'เลือกช่องทางชำระเงินและระบุข้อมูลเพื่อเปิดใช้งานสิทธิ์' : 'Select payment method and complete contribution'}
          </p>

          {/* Segmented Form Tabs: TrueMoney Voucher | Promo Drop */}
          <div style={{
            display: 'flex',
            gap: 6,
            background: 'rgba(255, 255, 255, 0.04)',
            padding: 3,
            borderRadius: 10,
            border: '1px solid var(--border-subtle)',
            marginBottom: 20
          }}>
            <button
              type="button"
              onClick={() => setFormTab('voucher')}
              style={{
                flex: 1,
                padding: '9px 12px',
                borderRadius: 8,
                border: formTab === 'voucher' ? '1px solid rgba(255, 255, 255, 0.16)' : '1px solid transparent',
                background: formTab === 'voucher' ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                color: formTab === 'voucher' ? '#FFF' : 'var(--text-sub)',
                fontWeight: formTab === 'voucher' ? 600 : 500,
                fontSize: 12,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 7,
                boxShadow: formTab === 'voucher' ? '0 2px 6px rgba(0, 0, 0, 0.35)' : 'none'
              }}
            >
              <IconTrueMoneyVoucher size={16} stroke={1.8} />
              <span>{lang === 'th' ? 'ซอง TrueMoney' : 'TrueMoney'}</span>
            </button>

            <button
              type="button"
              onClick={() => setFormTab('promo')}
              style={{
                flex: 1,
                padding: '9px 12px',
                borderRadius: 8,
                border: formTab === 'promo' ? '1px solid rgba(255, 255, 255, 0.16)' : '1px solid transparent',
                background: formTab === 'promo' ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                color: formTab === 'promo' ? '#FFF' : 'var(--text-sub)',
                fontWeight: formTab === 'promo' ? 600 : 500,
                fontSize: 12,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                boxShadow: formTab === 'promo' ? '0 2px 6px rgba(0, 0, 0, 0.35)' : 'none'
              }}
            >
              <IconGift size={14} />
              <span>{lang === 'th' ? 'โค้ดกิจกรรม (Drop)' : 'Promo Drop'}</span>
            </button>
          </div>

          {/* Form Content */}
          {formTab === 'voucher' ? (
            <form onSubmit={handleTopup} style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
              
              {/* Voucher URL Input */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-sub)' }}>
                    {lang === 'th' ? 'ลิงก์ซองของขวัญ TrueMoney (Voucher Link)' : 'TrueMoney Voucher Link'} <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowVoucherGuideModal(true)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--slime-green)',
                      fontSize: 11,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: 0
                    }}
                  >
                    <IconHelp size={13} />
                    <span>{lang === 'th' ? `วิธีสร้างซอง ${priceRate} บาท?` : `How to create voucher?`}</span>
                  </button>
                </div>

                <input
                  type="text"
                  placeholder={isMaxStacked ? (lang === 'th' ? 'เซิร์ฟเวอร์มีวันสะสมครบ 90 วันแล้ว (ล็อกการร่วมสนับสนุน)' : 'Server reached 90-day max cap') : "https://gift.truemoney.com/campaign/?v=..."}
                  value={voucher}
                  onChange={(e) => setVoucher(e.target.value)}
                  disabled={isMaxStacked}
                  style={{
                    width: '100%',
                    padding: '11px 14px',
                    borderRadius: 10,
                    background: isMaxStacked ? 'rgba(255, 255, 255, 0.03)' : 'rgba(5, 7, 12, 0.8)',
                    border: '1px solid ' + (isMaxStacked ? 'rgba(255, 255, 255, 0.1)' : 'var(--border-light)'),
                    color: isMaxStacked ? 'var(--text-dim)' : '#FFFFFF',
                    fontSize: 12.5,
                    cursor: isMaxStacked ? 'not-allowed' : 'text'
                  }}
                  required={!isMaxStacked}
                />

                <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 5 }}>
                  {lang === 'th' ? 'สร้างซองของขวัญแบบ "แบ่งเท่ากัน 1 คน" ในแอป TrueMoney' : 'Create voucher set to 1 recipient in TrueMoney app'}
                </div>
              </div>

              {/* Referral Code Input */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-sub)', marginBottom: 6 }}>
                  {lang === 'th' ? 'รหัสชวนเพื่อน (Referral Code - ถ้ามี)' : 'Referral Code (Optional)'}
                </label>
                {guildData?.referralConfig?.enabled === false ? (
                  <div style={{ padding: '10px 12px', background: 'rgba(255, 51, 75, 0.08)', border: '1px solid rgba(255, 51, 75, 0.25)', borderRadius: 8, fontSize: 12, color: 'var(--red-alert)' }}>
                    [Paused] {lang === 'th' ? 'แคมเปญชวนเพื่อนปิดรับสิทธิ์ชั่วคราวครับ' : 'Referral program is temporarily paused'}
                  </div>
                ) : (guildData?.referralConfig?.expiresAt && Date.now() > guildData.referralConfig.expiresAt) ? (
                  <div style={{ padding: '10px 12px', background: 'rgba(255, 51, 75, 0.08)', border: '1px solid rgba(255, 51, 75, 0.25)', borderRadius: 8, fontSize: 12, color: 'var(--red-alert)' }}>
                    [Closed] {lang === 'th'
                      ? `โปรโมชั่นโค้ดชวนเพื่อนหมดเขตแล้ว (${new Date(guildData.referralConfig.expiresAt).toLocaleDateString('th-TH')})`
                      : `Referral promo has ended (${new Date(guildData.referralConfig.expiresAt).toLocaleDateString()})`}
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input
                        type="text"
                        placeholder={lang === 'th' ? 'เช่น REF-27641D หรือ VIPPLUS' : 'e.g. REF-27641D'}
                        value={referralCode}
                        onChange={(e) => {
                          const val = e.target.value.toUpperCase();
                          setReferralCode(val);
                          if (!val) setReferrerName('');
                        }}
                        disabled={isMaxStacked}
                        style={{
                          flex: 1,
                          padding: '10px 14px',
                          borderRadius: 10,
                          background: isMaxStacked ? 'rgba(255, 255, 255, 0.03)' : 'rgba(5, 7, 12, 0.8)',
                          border: '1px solid ' + (isMaxStacked ? 'rgba(255, 255, 255, 0.1)' : 'var(--border-light)'),
                          color: isMaxStacked ? 'var(--text-dim)' : '#FFFFFF',
                          fontSize: 12.5,
                          fontFamily: 'var(--font-mono)',
                          letterSpacing: '0.04em',
                          cursor: isMaxStacked ? 'not-allowed' : 'text'
                        }}
                      />
                      <button
                        type="button"
                        onClick={handleApplyReferral}
                        disabled={isMaxStacked}
                        style={{
                          padding: '0 16px',
                          borderRadius: 10,
                          background: 'rgba(255, 255, 255, 0.08)',
                          border: '1px solid rgba(255, 255, 255, 0.16)',
                          color: isMaxStacked ? 'var(--text-dim)' : '#FFFFFF',
                          fontWeight: 600,
                          fontSize: 12.5,
                          cursor: isMaxStacked ? 'not-allowed' : 'pointer',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {lang === 'th' ? 'ใช้โค้ด' : 'Apply'}
                      </button>
                    </div>

                    {referrerName && (
                      <div style={{ fontSize: 11.5, color: 'var(--slime-green)', marginTop: 6, display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
                        <IconCircleCheck size={13} />
                        <span>{lang === 'th' ? `ผู้แนะนำ: เซิร์ฟเวอร์ ${referrerName} (+30 วันเมื่อร่วมสนับสนุน)` : `Referrer: ${referrerName}`}</span>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Important Contribution & 90-Day Cap Tip Box */}
              <div style={{
                marginBottom: 16,
                padding: '10px 14px',
                borderRadius: 10,
                background: isMaxStacked ? 'rgba(239, 68, 68, 0.08)' : 'rgba(245, 158, 11, 0.07)',
                border: '1px solid ' + (isMaxStacked ? 'rgba(239, 68, 68, 0.3)' : 'rgba(245, 158, 11, 0.25)'),
                fontSize: 11.5,
                lineHeight: 1.55,
                color: isMaxStacked ? '#FCA5A5' : '#FDE68A'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, marginBottom: 4, color: isMaxStacked ? '#EF4444' : '#F59E0B' }}>
                  <IconAlertCircle size={14} />
                  <span>{lang === 'th' ? (isMaxStacked ? 'วันใช้งานสะสมครบโควตาสูงสุดแล้ว' : 'ข้อควรรู้ก่อนส่งซอง:') : (isMaxStacked ? 'Max 90-Day Subscription Reached' : 'Important Contribution Rules:')}</span>
                </div>
                {isMaxStacked ? (
                  <div>
                    {lang === 'th'
                      ? 'เซิร์ฟเวอร์นี้มีวันใช้งานสะสมครบโควตาสูงสุด 90 วัน (3 เดือน) แล้ว ระบบล็อกการทำรายการชั่วคราวเพื่อป้องกันการเสียสิทธิ์ กรุณารอให้วันใช้งานเหลือน้อยกว่า 90 วันจึงจะเติมเพิ่มได้ครับ'
                      : 'This server has reached the maximum 90-day subscription cap. New contributions are temporarily locked to protect your funds. Please wait until remaining days drop below 90.'}
                  </div>
                ) : (
                  <div>
                    {lang === 'th'
                      ? 'ระบบคำนวณวันสะสมสูงสุดไม่เกิน 90 วัน (3 เดือน) กรุณาสร้างซองตรงตามยอด 29 บาทพอดี หากใส่ยอดเงินเกินกว่าเพดาน 90 วัน ระบบจะไม่สามารถทบวันเพิ่มได้และไม่รับผิดชอบยอดส่วนเกินครับ'
                      : 'Maximum accumulated subscription is capped at 90 days. Please set voucher amount to exactly 29 THB. Any excess funds exceeding the 90-day cap cannot be stacked or refunded.'}
                  </div>
                )}
              </div>

              {/* Confirm Support Button */}
              <div style={{ marginTop: 'auto' }}>
                <button
                  type="submit"
                  disabled={isMaxStacked || submittingTopup}
                  className="btn btn-primary"
                  style={{
                    width: '100%',
                    padding: '13px 18px',
                    fontSize: 14,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    borderRadius: 12,
                    opacity: isMaxStacked ? 0.6 : 1,
                    cursor: isMaxStacked ? 'not-allowed' : 'pointer',
                    background: isMaxStacked ? 'rgba(255, 255, 255, 0.08)' : undefined,
                    borderColor: isMaxStacked ? 'rgba(255, 255, 255, 0.15)' : undefined
                  }}
                >
                  {isMaxStacked ? (
                    <>
                      <IconLock size={16} />
                      <span>{lang === 'th' ? 'วันใช้งานสะสมเต็มโควตาแล้ว (สูงสุด 90 วัน)' : 'Max 90-Day Cap Reached'}</span>
                    </>
                  ) : submittingTopup ? (
                    <span>{lang === 'th' ? 'กำลังตรวจสอบยอดและทำรายการ...' : 'Verifying Voucher...'}</span>
                  ) : (
                    <>
                      <IconSparkles size={16} />
                      <span>{lang === 'th' ? `ยืนยันการร่วมสนับสนุน ฿${priceRate}` : `Confirm Contribution ฿${priceRate}`}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            /* Promo Code Drop Tab */
            <form onSubmit={handleRedeemPromo} style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-sub)', marginBottom: 6 }}>
                  {lang === 'th' ? 'รหัสโค้ดกิจกรรม (Early-Bird Drop Code)' : 'Promo Code'}
                </label>
                <input
                  type="text"
                  placeholder={lang === 'th' ? 'กรอกรหัสแคมเปญ เช่น EARLY30' : 'Enter promo code...'}
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                  required
                  style={{
                    width: '100%',
                    padding: '11px 14px',
                    borderRadius: 10,
                    background: 'rgba(5, 7, 12, 0.8)',
                    border: '1px solid var(--border-light)',
                    color: '#FFFFFF',
                    fontSize: 12.5,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}
                />
                <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 5 }}>
                  {lang === 'th' ? 'รหัสโปรโมชันแจกสิทธิ์ผู้สนับสนุนเซิร์ฟเวอร์ฟรี 30 วัน' : 'Redeem limited campaign code for 30 free Supporter days'}
                </div>
              </div>

              <div style={{ marginTop: 'auto' }}>
                <button
                  type="submit"
                  disabled={submittingPromo}
                  className="btn btn-primary"
                  style={{ width: '100%', padding: '13px 18px', fontSize: 14 }}
                >
                  {submittingPromo ? (
                    <span>{lang === 'th' ? 'กำลังตรวจสอบสิทธิ์...' : 'Claiming...'}</span>
                  ) : (
                    <>
                      <IconGift size={16} />
                      <span>{lang === 'th' ? 'ยืนยันรับสิทธิ์โปรโมชัน' : 'Claim Promo Perk'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Security & Automation Badges */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: 14,
            marginTop: 16,
            borderTop: '1px solid rgba(255, 255, 255, 0.06)',
            fontSize: 11,
            color: 'var(--text-dim)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <IconCircleCheck size={14} style={{ color: 'var(--slime-green)' }} />
              <span>{lang === 'th' ? 'ระบบอัตโนมัติ 24 ชม.' : 'Auto 24/7'}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <IconBolt size={14} style={{ color: 'var(--slime-green)' }} />
              <span>{lang === 'th' ? 'รับสิทธิ์ทันทีใน 5 วิ' : 'Instant in 5s'}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <IconLock size={14} style={{ color: 'var(--slime-green)' }} />
              <span>SSL 256-Bit</span>
            </div>
          </div>

        </div>

      </div>

      {/* 4. TERMS OF SERVICE & LEGAL DISCLAIMER ACCORDION */}
      <section style={{
        padding: '20px 24px',
        borderRadius: 16,
        background: 'rgba(255, 255, 255, 0.02)',
        border: '1px solid var(--border-subtle)',
        marginBottom: 24
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16,
          paddingBottom: 12,
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
          flexWrap: 'wrap',
          gap: 12
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 13.5, color: '#FFFFFF' }}>
            <IconFileText size={16} style={{ color: 'var(--slime-green)' }} />
            <span>{lang === 'th' ? 'ข้อกำหนดและเงื่อนไขการสนับสนุน (Disclaimer & Terms of Use)' : 'Terms of Service & Disclaimer'}</span>
          </div>
          <button
            type="button"
            onClick={() => setShowTosModal(true)}
            style={{
              background: 'rgba(0, 255, 135, 0.08)',
              border: '1px solid rgba(0, 255, 135, 0.28)',
              color: 'var(--slime-green)',
              borderRadius: 8,
              padding: '5px 12px',
              fontSize: 11.5,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              transition: 'all 0.18s ease'
            }}
          >
            <span>{lang === 'th' ? 'อ่านข้อตกลงฉบับเต็ม' : 'Read Full Terms'}</span>
            <IconArrowRight size={13} />
          </button>
        </div>

        {/* 4-Item Interactive Accordion */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            {
              id: 'conduit',
              title: lang === 'th' ? '1. นโยบายการส่งผ่านข้อมูลและเนื้อหา (Mere Conduit & Content Policy)' : '1. Data Forwarder & Content Policy',
              preview: lang === 'th' ? 'ระบบทำหน้าที่เป็นเพียงตัวกลางส่งผ่านสัญญาณเสียงชั่วคราว (Transmission Buffer) โดยไม่มีการจัดเก็บหรือเผยแพร่ไฟล์สื่อถาวร' : 'GOOLIX functions strictly as a temporary audio transmission buffer without permanent media hosting.',
              content: lang === 'th' ? 'GOOLIX ทำหน้าที่เป็นเพียงท่อส่งผ่านข้อมูลชั่วคราว (Mere Conduit) จากแหล่งต้นทางที่ผู้ใช้งานเป็นผู้ระบุคำสั่งไปยังห้องเสียงของ Discord เท่านั้น ไม่มีการจัดเก็บ ดัดแปลง หรือเผยแพร่ไฟล์เสียงและวิดีโอไว้ในฐานข้อมูลถาวร ผู้ใช้งานเป็นผู้รับผิดชอบต่อลิงก์และคำค้นหาที่สั่งให้บอทประมวลผลแต่เพียงผู้เดียว' : 'GOOLIX operates as a transient data conduit executing user audio requests to Discord voice channels. No media files are hosted permanently on our infrastructure. Users retain sole responsibility for requested content and streaming sources.'
            },
            {
              id: 'billing',
              title: lang === 'th' ? '2. เงื่อนไขการร่วมสนับสนุนและสิทธิ์เซิร์ฟเวอร์ (Supporter & Billing Terms)' : '2. Supporter & Billing Terms',
              preview: lang === 'th' ? 'สิทธิ์ผู้สนับสนุนผูกระดับเซิร์ฟเวอร์ (Server-Wide) สมาชิกทุกคนใช้งานพร้อมกันได้ทันที ยอดเงินเป็นการร่วมสนับสนุนค่าเซิร์ฟเวอร์' : 'Supporter perks unlock for the entire server. TrueMoney vouchers are voluntary server contributions.',
              content: lang === 'th' ? 'ยอดเงินที่ทำรายการผ่านซองของขวัญ TrueMoney เป็นการร่วมบริจาคสนับสนุนค่าเช่าเซิร์ฟเวอร์และแบนด์วิธเพื่อขับเคลื่อนคอมมูนิตี้ สิทธิพิเศษของ Supporter จะผูกกับรหัสเซิร์ฟเวอร์ (Guild ID) ที่ระบุ เมื่อระบบเพิ่มวันใช้งานแล้ว ไม่สามารถขอคืนเงินหรือโอนย้ายสิทธิ์ข้ามเซิร์ฟเวอร์ได้ในทุกกรณี' : 'Contributions processed via TrueMoney vouchers support server infrastructure and bandwidth. Supporter benefits bind directly to the specified Guild ID. Contributions are strictly non-refundable and non-transferable once processed.'
            },
            {
              id: 'reliability',
              title: lang === 'th' ? '3. ความพร้อมใช้งานและความเสถียรของระบบ (Service Availability & SLA)' : '3. Service Availability & SLA',
              preview: lang === 'th' ? 'ให้บริการตามสภาพจริง (As-Is) พร้อมระบบ Priority Slot และระบบสลับโหนดสำรองอัจฉริยะ' : 'Provided on an As-Is basis with Priority Fast Slot access and multi-node fallback redundancy.',
              content: lang === 'th' ? 'ระบบให้บริการตามสภาพจริง (As-Is) ไม่รับประกันการออนไลน์ 100% ตลอด 24 ชั่วโมง โดยผู้สนับสนุนจะได้รับสิทธิ์เข้าใช้งาน Priority Fast Slot เพื่อเปิดเพลงได้ทันที และระบบขอสงวนสิทธิ์ในการตัดสายอัตโนมัติเมื่อไม่มีผู้ฟังในห้องเสียง (Auto-Leave) เพื่อประหยัดทรัพยากรส่วนรวม' : 'Services are delivered on an As-Is basis without guarantee of 100% continuous uptime. Supporters receive Priority Fast Slot access for instant playback. The bot reserves the right to disconnect from empty voice channels to optimize shared resources.'
            },
            {
              id: 'maintenance',
              title: lang === 'th' ? '4. การบำรุงรักษาโหนดและเครือข่าย (Node Maintenance & Fair Usage)' : '4. Node Maintenance & Fair Usage',
              preview: lang === 'th' ? 'การปรับปรุงคลัสเตอร์และฟิลเตอร์เสียงเพื่อรักษาเสถียรภาพการสตรีมเสียงของส่วนรวมเป็นหลัก' : 'Dynamic cluster maintenance and audio filter adjustments to maintain global platform stability.',
              content: lang === 'th' ? 'ฟังก์ชันและตัวเลือกการประมวลผลเสียงเสริมต่าง ๆ (เช่น DSP Filter, Smart Autoplay) อาจได้รับการปรับปรุง หรือระงับชั่วคราวตามสถานะภาระเครื่องเซิร์ฟเวอร์และการเปลี่ยนแปลงของแพลตฟอร์มต้นทาง เพื่อรักษาเสถียรภาพการสตรีมเสียงของส่วนรวมเป็นหลัก' : 'Supplemental features such as audio DSP filters and Smart Autoplay may undergo maintenance or temporary throttling based on hardware load and upstream provider updates to ensure optimal stability.'
            }
          ].map((item, idx) => {
            const isOpen = openAccordion === idx;
            return (
              <div
                key={item.id}
                style={{
                  background: isOpen ? 'rgba(255, 255, 255, 0.04)' : 'rgba(255, 255, 255, 0.015)',
                  border: '1px solid ' + (isOpen ? 'rgba(0, 255, 135, 0.25)' : 'rgba(255, 255, 255, 0.06)'),
                  borderRadius: 10,
                  overflow: 'hidden',
                  transition: 'all 0.2s ease'
                }}
              >
                <button
                  type="button"
                  onClick={() => setOpenAccordion(isOpen ? null : idx)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'none',
                    border: 'none',
                    color: '#FFFFFF',
                    cursor: 'pointer',
                    textAlign: 'left',
                    gap: 12
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: isOpen ? 'var(--slime-green)' : '#E2E8F0' }}>
                      {item.title}
                    </div>
                    {!isOpen && (
                      <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {item.preview}
                      </div>
                    )}
                  </div>
                  <div style={{ color: isOpen ? 'var(--slime-green)' : 'var(--text-dim)', display: 'flex', alignItems: 'center' }}>
                    {isOpen ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
                  </div>
                </button>
                {isOpen && (
                  <div style={{
                    padding: '0 16px 14px 16px',
                    fontSize: 11.5,
                    color: '#CBD5E1',
                    lineHeight: 1.65,
                    borderTop: '1px solid rgba(255, 255, 255, 0.04)',
                    paddingTop: 10
                  }}>
                    {item.content}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* MODAL 1: HOW TO CREATE TRUEMONEY VOUCHER GUIDE */}
      {showVoucherGuideModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 1000,
          background: 'rgba(5, 7, 12, 0.85)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20
        }} onClick={() => setShowVoucherGuideModal(false)}>
          <div style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-light)',
            borderRadius: 18,
            width: '100%',
            maxWidth: 520,
            overflow: 'hidden',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.8)'
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '18px 22px',
              borderBottom: '1px solid var(--border-subtle)'
            }}>
              <div style={{ fontWeight: 800, fontSize: 15, color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: 8 }}>
                <IconTrueMoneyVoucher size={18} stroke={2} />
                <span>{lang === 'th' ? `วิธีสร้างซองของขวัญ ${priceRate} บาท` : `How to Create ${priceRate} THB Voucher`}</span>
              </div>
              <button
                type="button"
                onClick={() => setShowVoucherGuideModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-sub)',
                  cursor: 'pointer'
                }}
              >
                <IconX size={18} />
              </button>
            </div>

            <div style={{ padding: '20px 22px', fontSize: 12.5, color: 'var(--text-sub)', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(0, 255, 135, 0.15)', color: 'var(--slime-green)', fontWeight: 800, fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>1</div>
                <div>{lang === 'th' ? 'เปิดแอปพลิเคชัน TrueMoney ในโทรศัพท์ของคุณ' : 'Open the TrueMoney app on your phone'}</div>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(0, 255, 135, 0.15)', color: 'var(--slime-green)', fontWeight: 800, fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>2</div>
                <div>{lang === 'th' ? 'เลือกเมนู "ส่งของขวัญ" หรือ "ซองของขวัญ"' : 'Select "Send Gift" or "Gift Voucher" menu'}</div>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(0, 255, 135, 0.15)', color: 'var(--slime-green)', fontWeight: 800, fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>3</div>
                <div>
                  {lang === 'th' ? `กรอกยอดเงิน ` : 'Enter amount '}
                  <strong style={{ color: 'var(--slime-green)' }}>{priceRate} {lang === 'th' ? 'บาท' : 'THB'}</strong>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(0, 255, 135, 0.15)', color: 'var(--slime-green)', fontWeight: 800, fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>4</div>
                <div>
                  {lang === 'th' ? 'เลือกประเภท ' : 'Choose '}
                  <strong style={{ color: '#FFFFFF' }}>"{lang === 'th' ? 'แบ่งจำนวนเงินเท่ากัน' : 'Equal amount'}"</strong>
                  {lang === 'th' ? ' และระบุจำนวนคนรับ ' : ' and set recipients to '}
                  <strong style={{ color: 'var(--slime-green)' }}>1 {lang === 'th' ? 'คน' : 'person'}</strong>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(0, 255, 135, 0.15)', color: 'var(--slime-green)', fontWeight: 800, fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>5</div>
                <div>{lang === 'th' ? 'กดสร้างซอง แล้วกด "คัดลอกลิงก์" นำมาวางในช่องลิงก์ซองของขวัญ' : 'Generate voucher, copy the link, and paste into the voucher input'}</div>
              </div>

              <button
                type="button"
                onClick={() => setShowVoucherGuideModal(false)}
                style={{
                  marginTop: 10,
                  padding: '11px',
                  borderRadius: 10,
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.16)',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: 'pointer'
                }}
              >
                {lang === 'th' ? 'เข้าใจแล้ว' : 'Got it'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: FULL TERMS OF SERVICE DIALOG */}
      {showTosModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 1000,
          background: 'rgba(5, 7, 12, 0.85)',
          backdropFilter: 'blur(12px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20
        }} onClick={() => setShowTosModal(false)}>
          <div style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-light)',
            borderRadius: 18,
            width: '100%',
            maxWidth: 720,
            maxHeight: '85vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 24px 48px rgba(0, 0, 0, 0.85), 0 0 24px rgba(0, 255, 135, 0.08)',
            overflow: 'hidden'
          }} onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '20px 26px',
              borderBottom: '1px solid var(--border-subtle)',
              background: 'rgba(255, 255, 255, 0.02)'
            }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 16, color: '#FFF', letterSpacing: '-0.01em' }}>
                  {lang === 'th' ? 'ข้อตกลงและเงื่อนไขการใช้งาน (Terms of Service)' : 'Terms of Service (Full Agreement)'}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-sub)', marginTop: 2 }}>
                  {lang === 'th' ? 'GOOLIX Audio Engine • อัปเดตล่าสุด: พฤศจิกายน 2026' : 'GOOLIX Audio Engine • Last Updated: November 2026'}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowTosModal(false)}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-sub)',
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.18s ease'
                }}
              >
                <IconX size={16} />
              </button>
            </div>

            {/* Modal Content */}
            <div style={{
              padding: '26px',
              overflowY: 'auto',
              fontSize: 12.5,
              lineHeight: 1.7,
              color: 'var(--text-sub)',
              display: 'flex',
              flexDirection: 'column',
              gap: 22
            }}>
              <p style={{ margin: 0, color: 'var(--text-dim)', fontStyle: 'italic', paddingBottom: 12, borderBottom: '1px solid var(--border-subtle)' }}>
                {lang === 'th'
                  ? 'การใช้งานบอทและการทำรายการบนหน้าเว็บไซต์ของ GOOLIX ถือว่าผู้ใช้งานได้อ่าน เข้าใจ และยอมรับข้อตกลงดังต่อไปนี้ทุกประการ:'
                  : 'By using the GOOLIX bot and web portal, you acknowledge that you have read, understood, and agreed to all terms below:'}
              </p>

              {/* Section 1 */}
              <div>
                <h4 style={{ margin: '0 0 8px 0', fontSize: 13.5, fontWeight: 700, color: '#FFF' }}>
                  {lang === 'th'
                    ? '1. สถานะตัวกลางส่งผ่านข้อมูลและเนื้อหา (Mere Conduit & Content Disclaimer)'
                    : '1. Mere Conduit & Content Disclaimer'}
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingLeft: 12 }}>
                  <div>
                    <strong style={{ color: 'var(--slime-green)' }}>{lang === 'th' ? '• ไม่มีการจัดเก็บไฟล์ถาวร:' : '• No Permanent Storage:'}</strong>{' '}
                    {lang === 'th'
                      ? 'ระบบทำงานในฐานะท่อส่งผ่านข้อมูลชั่วคราว (Transmission Buffer) จากแหล่งต้นทางที่ผู้ใช้งานเป็นผู้ระบุคำสั่งไปยังห้องเสียงของ Discord เท่านั้น ไม่มีการจัดเก็บ ดัดแปลง หรือเผยแพร่ไฟล์เสียงและวิดีโอไว้ในฐานข้อมูลถาวร (ระบบแคชทำงานแบบชั่วคราวเพื่อลดความหน่วงของเครือข่ายและถูกลบออกอัตโนมัติ)'
                      : 'The system functions solely as a transient transmission buffer routing stream data requested by users directly to Discord voice channels. No media files are permanently hosted, altered, or distributed.'}
                  </div>
                  <div>
                    <strong style={{ color: 'var(--slime-green)' }}>{lang === 'th' ? '• ความรับผิดชอบต่อเนื้อหา:' : '• Content Responsibility:'}</strong>{' '}
                    {lang === 'th'
                      ? 'ผู้ใช้งานเป็นผู้รับผิดชอบต่อลิงก์และคำค้นหาที่สั่งให้บอทประมวลผลแต่เพียงผู้เดียว ทางผู้พัฒนาไม่สามารถตรวจสอบหรือควบคุมเนื้อหาต้นทางจากผู้ให้บริการภายนอกได้ และไม่มีส่วนรับผิดชอบต่อเนื้อหาที่ถูกส่งต่อไปยังเซิร์ฟเวอร์ของผู้ใช้งาน'
                      : 'Users bear sole legal responsibility for all media queries dispatched to the bot. Developers do not curate external content and assume no liability for relayed streams.'}
                  </div>
                </div>
              </div>

              {/* Section 2 */}
              <div>
                <h4 style={{ margin: '0 0 8px 0', fontSize: 13.5, fontWeight: 700, color: '#FFF' }}>
                  {lang === 'th'
                    ? '2. เงื่อนไขการร่วมสนับสนุนและสิทธิประโยชน์ (Supporter & Billing Terms)'
                    : '2. Supporter & Billing Terms'}
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingLeft: 12 }}>
                  <div>
                    <strong style={{ color: 'var(--cyber-pink)' }}>{lang === 'th' ? '• ลักษณะการสนับสนุน:' : '• Voluntary Contribution:'}</strong>{' '}
                    {lang === 'th'
                      ? 'ยอดเงินที่ทำรายการผ่านลิงก์ซองของขวัญ TrueMoney เป็นการร่วมบริจาคสนับสนุนค่าเช่าเซิร์ฟเวอร์และแบนด์วิธเพื่อขับเคลื่อนคอมมูนิตี้ ไม่ใช่การซื้อขายสินค้าหรือบริการเชิงพาณิชย์ เมื่อทำรายการสำเร็จแล้วไม่สามารถขอคืนเงินหรือยกเลิกได้ทุกกรณี'
                      : 'Contributions via TrueMoney gift vouchers represent voluntary server hardware donations, not commercial purchases. All contributions are final and strictly non-refundable.'}
                  </div>
                  <div>
                    <strong style={{ color: 'var(--cyber-pink)' }}>{lang === 'th' ? '• สิทธิ์ระดับเซิร์ฟเวอร์ (Server-Wide Access):' : '• Server-Wide Access:'}</strong>{' '}
                    {lang === 'th'
                      ? 'สิทธิพิเศษของผู้สนับสนุน (Supporter) จะผูกกับรหัสเซิร์ฟเวอร์ (Guild ID) ที่ระบุขณะทำรายการ โดยสมาชิกทุกคนที่เข้าฟังเพลงในเซิร์ฟเวอร์นั้นจะได้รับสิทธิพิเศษพร้อมกันทั้งหมด สิทธิ์นี้ไม่สามารถโอนย้ายไปยังเซิร์ฟเวอร์อื่นได้'
                      : 'Supporter perks bind strictly to the designated Guild ID, benefiting all active listeners within that server. Perks cannot be transferred between guilds.'}
                  </div>
                </div>
              </div>

              {/* Section 3 */}
              <div>
                <h4 style={{ margin: '0 0 8px 0', fontSize: 13.5, fontWeight: 700, color: '#FFF' }}>
                  {lang === 'th'
                    ? '3. การจำกัดความรับผิดชอบและความพร้อมใช้งาน (Availability & Liability)'
                    : '3. Availability & Liability'}
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingLeft: 12 }}>
                  <div>
                    <strong style={{ color: '#94A3B8' }}>{lang === 'th' ? '• การรับประกันสถานะออนไลน์:' : '• Uptime Warranty:'}</strong>{' '}
                    {lang === 'th'
                      ? 'ทางทีมพัฒนาพยายามดูแลให้ระบบทำงานได้อย่างราบรื่นที่สุด แต่ไม่รับประกันว่าบอทจะออนไลน์ตลอด 24 ชั่วโมงโดยไม่มีอาการกระตุกหรือดีเลย์ เนื่องจากคุณภาพสัญญาณขึ้นอยู่กับเซิร์ฟเวอร์ต้นทาง ระบบ Discord Gateway และโควตาเครือข่ายในแต่ละช่วงเวลา'
                      : 'While the team strives for maximum stability, continuous 24/7 uninterrupted uptime cannot be guaranteed due to dependencies on Discord gateways and upstream providers.'}
                  </div>
                  <div>
                    <strong style={{ color: '#94A3B8' }}>{lang === 'th' ? '• การปรับปรุงและยุติบริการ:' : '• Maintenance & Suspension:'}</strong>{' '}
                    {lang === 'th'
                      ? 'ทีมพัฒนาขอสงวนสิทธิ์ในการรีสตาร์ทโหนด ปิดปรับปรุงระบบชั่วคราว ปรับเปลี่ยนโควตาช่องสัญญาณ หรือยุติการให้บริการเมื่อใดก็ได้โดยไม่จำเป็นต้องแจ้งให้ทราบล่วงหน้า'
                      : 'We reserve the right to deploy maintenance updates, adjust audio buffer parameters, or modify service endpoints without prior notification.'}
                  </div>
                  <div>
                    <strong style={{ color: '#94A3B8' }}>{lang === 'th' ? '• ความปลอดภัยของเซิร์ฟเวอร์:' : '• Indemnification:'}</strong>{' '}
                    {lang === 'th'
                      ? 'ทีมพัฒนาไม่รับผิดชอบต่อความเสียหายใดๆ ที่อาจเกิดขึ้นกับเซิร์ฟเวอร์ Discord หรือบัญชีของผู้ใช้งานจากการนำบอทไปติดตั้งใช้งาน'
                      : 'The development team shall not be held liable for any damages, strikes, or penalties incurred on Discord guilds or accounts.'}
                  </div>
                </div>
              </div>

              {/* Section 4 */}
              <div>
                <h4 style={{ margin: '0 0 8px 0', fontSize: 13.5, fontWeight: 700, color: '#FFF' }}>
                  {lang === 'th'
                    ? '4. นโยบายการใช้งานที่เหมาะสม (Fair Use & Anti-Abuse Policy)'
                    : '4. Fair Use & Anti-Abuse Policy'}
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingLeft: 12 }}>
                  <div>
                    <strong style={{ color: 'var(--red-alert)' }}>{lang === 'th' ? '• การจัดการทรัพยากรอัตโนมัติ:' : '• Automated Resource Governance:'}</strong>{' '}
                    {lang === 'th'
                      ? 'เพื่อรักษาคุณภาพเสียงของส่วนรวม ระบบจะตัดการเชื่อมต่อจากห้องเสียงอัตโนมัติหากไม่มีผู้ฟังอยู่ในห้อง หรือมีการเปิดสตรีมต่อเนื่องยาวนานเกินเกณฑ์ที่กำหนดโดยไม่มีการโต้ตอบ'
                      : 'To conserve cluster resources, the bot will auto-disconnect from empty voice channels or prolonged unmonitored streams.'}
                  </div>
                  <div>
                    <strong style={{ color: 'var(--red-alert)' }}>{lang === 'th' ? '• การระงับสิทธิ์ (Ban Policy):' : '• Abuse & Ban Policy:'}</strong>{' '}
                    {lang === 'th'
                      ? 'ห้ามใช้บอทหรือสคริปต์อัตโนมัติเฝ้าห้องเพื่อดึงแบนด์วิธตลอด 24 ชั่วโมง ห้ามยิงคำสั่งรัวเพื่อก่อกวนระบบ (Spam/Flood) และห้ามอาศัยช่องโหว่ในการปั๊มวันใช้งานฟรี หากระบบตรวจพบการกระทำดังกล่าว ทีมพัฒนาขอสงวนสิทธิ์ในการระงับการใช้งานเซิร์ฟเวอร์นั้นถาวร (Ban Guild) และยกเลิกวันใช้งานคงเหลือทั้งหมดทันทีโดยไม่ต้องแจ้งให้ทราบล่วงหน้า'
                      : 'Automated 24/7 socket idling, command flooding, and exploitation of promotional codes are strictly prohibited. Violating guilds are subject to immediate permanent guild bans and forfeiture of remaining days.'}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '16px 26px',
              borderTop: '1px solid var(--border-subtle)',
              background: 'rgba(255, 255, 255, 0.02)',
              display: 'flex',
              justifyContent: 'flex-end'
            }}>
              <button
                type="button"
                onClick={() => setShowTosModal(false)}
                className="btn btn-primary"
                style={{ padding: '9px 24px', fontSize: 13 }}
              >
                {lang === 'th' ? 'เข้าใจและยอมรับข้อตกลง' : 'I Understand & Agree'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
