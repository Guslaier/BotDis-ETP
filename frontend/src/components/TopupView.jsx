import React, { useState, useEffect } from 'react';
import { 
  Sparkles, CheckCircle2, AlertCircle, Gift, Server, ShieldCheck, 
  Clock, ArrowRight, Share2, Copy, Zap, Music2, Sliders, Award,
  FileText, X
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
    e.preventDefault();
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
        onToast('success', lang === 'th' ? 'เคลมสิทธิ์สำเร็จ!' : 'Code Redeemed!', lang === 'th' ? `ยินดีด้วยครับ! ได้รับสิทธิ์ ${data.campaignName} (+${data.addedDays} วัน)` : `Received +${data.addedDays} days`);
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
    onToast('success', lang === 'th' ? 'คัดลอกลิงก์แล้ว!' : 'Copied Link!', link);
  };

  const formatExpiry = (timestamp) => {
    if (!timestamp || timestamp <= Date.now()) {
      return lang === 'th' ? 'ยังไม่มีแพ็กเกจ (ทั่วไป)' : 'No Active Supporter';
    }
    const diff = timestamp - Date.now();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    return `${days} ${lang === 'th' ? 'วัน' : 'days'} ${hours} ${lang === 'th' ? 'ชม.' : 'hrs'} (${new Date(timestamp).toLocaleDateString('th-TH')})`;
  };

  return (
    <div style={{ maxWidth: 860, margin: '32px auto', padding: '0 16px' }} className="fade-in">
      {/* Top Banner: Early Bird Drop */}
      {guildData?.campaign && (
        <div className="glass-panel" style={{
          padding: '16px 20px',
          marginBottom: 24,
          border: '1px solid rgba(0, 255, 136, 0.4)',
          background: 'linear-gradient(135deg, rgba(0, 255, 136, 0.12) 0%, rgba(17, 22, 32, 0.95) 100%)',
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
              background: 'rgba(0, 255, 136, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--slime-green)'
            }}>
              <Gift size={24} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontWeight: 800, fontSize: 15, color: '#FFF' }}>
                  {guildData.campaign.name}
                </span>
                <span className="slime-badge" style={{ fontSize: 10, padding: '2px 8px' }}>
                  FREE {guildData.campaign.days || 30} DAYS
                </span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-sub)', marginTop: 2 }}>
                {lang === 'th' ? 'แคมเปญสิทธิ์พิเศษเปิดตัวเซิร์ฟเวอร์ เหลือเพียง' : 'Limited Early-Bird Drop remaining:'}{' '}
                <strong style={{ color: 'var(--slime-green)' }}>{guildData.campaign.remaining}</strong> / {guildData.campaign.maxClaims} {lang === 'th' ? 'สิทธิ์' : 'claims'}
                {guildData.campaign.expiresAt && (
                  <span style={{ marginLeft: 6 }}>
                    • {lang === 'th' ? 'หมดเขต:' : 'Ends:'} <strong style={{ color: 'var(--accent-yellow)' }}>{new Date(guildData.campaign.expiresAt).toLocaleDateString('th-TH')}</strong>
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
              style={{ width: 140, padding: '7px 12px', fontSize: 12 }}
            />
            <button type="submit" disabled={submittingPromo} className="btn btn-sm btn-primary">
              {submittingPromo ? '...' : (lang === 'th' ? 'กดรับสิทธิ์' : 'Claim')}
            </button>
          </form>
        </div>
      )}

      {/* Main Grid: Left Server Info & Right Topup Form */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: 24,
        marginBottom: 32
      }}>
        {/* Left Column: Server Status Card */}
        <div className="glass-panel" style={{ padding: 24 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Server size={18} style={{ color: 'var(--slime-green)' }} />
            <span>{lang === 'th' ? 'ค้นหา & ข้อมูลเซิร์ฟเวอร์' : 'Target Server'}</span>
          </h2>

          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            <input
              type="text"
              placeholder={lang === 'th' ? 'ระบุ Discord Guild ID (เช่น 1234567890)' : 'Discord Guild ID...'}
              value={guildId}
              onChange={(e) => setGuildId(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && verifyGuild()}
            />
            <button
              onClick={() => verifyGuild()}
              disabled={loadingGuild}
              className="btn btn-primary"
              style={{ padding: '0 18px', whiteSpace: 'nowrap' }}
            >
              {loadingGuild ? '...' : (lang === 'th' ? 'ตรวจสอบ' : 'Check')}
            </button>
          </div>

          {guildData?.guild ? (
            <div style={{
              background: 'rgba(8, 11, 16, 0.6)',
              border: '1px solid var(--card-border)',
              borderRadius: 14,
              padding: 16
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
                {guildData.guild.icon ? (
                  <img
                    src={guildData.guild.icon}
                    alt=""
                    style={{ width: 52, height: 52, borderRadius: 12, objectFit: 'cover' }}
                  />
                ) : (
                  <div style={{
                    width: 52,
                    height: 52,
                    borderRadius: 12,
                    background: '#1A2230',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: 20,
                    color: 'var(--text-sub)'
                  }}>
                    {guildData.guild.name.charAt(0)}
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: 16, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {guildData.guild.name}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-sub)', marginTop: 2 }}>
                    ID: {guildData.guild.id} • {guildData.guild.memberCount} {lang === 'th' ? 'สมาชิก' : 'members'}
                  </div>
                </div>
              </div>

              {/* Status Pill */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px',
                borderRadius: 10,
                background: guildData.guild.isSupporter ? 'rgba(0, 255, 136, 0.1)' : 'rgba(255, 255, 255, 0.04)',
                border: '1px solid ' + (guildData.guild.isSupporter ? 'rgba(0, 255, 136, 0.3)' : 'var(--card-border)'),
                marginBottom: 12
              }}>
                <span style={{ fontSize: 12, color: 'var(--text-sub)' }}>
                  {lang === 'th' ? 'สถานะแพ็กเกจ:' : 'Plan Status:'}
                </span>
                <span style={{
                  fontWeight: 700,
                  fontSize: 12,
                  color: guildData.guild.isSupporter ? 'var(--slime-green)' : '#94A3B8',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}>
                  {guildData.guild.isSupporter ? <ShieldCheck size={14} /> : null}
                  {guildData.guild.isSupporter ? 'SUPPORTER' : (lang === 'th' ? 'ทั่วไป' : 'STANDARD')}
                </span>
              </div>

              {/* Expiry */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px',
                borderRadius: 10,
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid var(--card-border)',
                marginBottom: 16
              }}>
                <span style={{ fontSize: 12, color: 'var(--text-sub)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Clock size={13} /> {lang === 'th' ? 'วันใช้งานคงเหลือ:' : 'Time Left:'}
                </span>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#FFF' }}>
                  {formatExpiry(guildData.guild.expiresAt)}
                </span>
              </div>

              {/* Referral Code Box */}
              {guildData.guild.referralCode && (
                <div style={{
                  padding: '12px 14px',
                  background: 'rgba(255, 46, 147, 0.08)',
                  border: '1px solid rgba(255, 46, 147, 0.3)',
                  borderRadius: 10
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--cyber-pink)', textTransform: 'uppercase' }}>
                      {lang === 'th' ? 'รหัสชวนเพื่อนรับวันฟรี' : 'Referral Code'}
                    </span>
                    <button
                      onClick={copyReferralLink}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--cyber-pink)',
                        cursor: 'pointer',
                        fontSize: 11,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        fontWeight: 600
                      }}
                    >
                      <Copy size={12} /> {lang === 'th' ? 'คัดลอกลิงก์' : 'Copy'}
                    </button>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                    <div style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 14, color: '#FFF' }}>
                      {guildData.guild.referralCode}
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--slime-green)' }}>
                      {lang === 'th'
                        ? `ชวนสำเร็จ: ${guildData.guild.referralCount || 0} / ${guildData?.referralConfig?.maxInvites ?? guildData.guild.maxReferralMonths ?? 6} เซิร์ฟเวอร์`
                        : `Invites: ${guildData.guild.referralCount || 0} / ${guildData?.referralConfig?.maxInvites ?? guildData.guild.maxReferralMonths ?? 6}`}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-sub)', marginTop: 5, lineHeight: 1.4 }}>
                    {guildData?.referralConfig?.enabled === false ? (
                      <span style={{ color: 'var(--accent-yellow)', fontWeight: 600 }}>
                        {lang === 'th' ? '● แคมเปญชวนเพื่อนปิดรับสิทธิ์ชั่วคราว' : '● Referral campaign is currently paused'}
                      </span>
                    ) : (
                      <>
                        <span>
                          {lang === 'th'
                            ? `เพื่อนเติมเงินด้วยโค้ดนี้ (ขั้นต่ำ ${guildData?.referralConfig?.minTopup ?? 29} บาท): คุณได้รับวันฟรี +${guildData?.referralConfig?.rewardDays ?? 30} วัน (สูงสุด ${guildData?.referralConfig?.maxInvites ?? guildData.guild.maxReferralMonths ?? 6} เซิร์ฟเวอร์)`
                            : `Friends top up with code (${guildData?.referralConfig?.minTopup ?? 29}+ THB): Referrer gets +${guildData?.referralConfig?.rewardDays ?? 30} days (Max ${guildData?.referralConfig?.maxInvites ?? guildData.guild.maxReferralMonths ?? 6} servers)`}
                        </span>
                        {guildData?.referralConfig?.expiresAt && (
                          <div style={{ color: 'var(--accent-yellow)', marginTop: 2, fontWeight: 600 }}>
                            {lang === 'th'
                              ? `• หมดเขต Season นี้: ${new Date(guildData.referralConfig.expiresAt).toLocaleDateString('th-TH')}`
                              : `• Season ends: ${new Date(guildData.referralConfig.expiresAt).toLocaleDateString()}`}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div style={{
              textAlign: 'center',
              padding: '32px 16px',
              color: 'var(--text-dim)',
              fontSize: 13,
              border: '1px dashed var(--card-border)',
              borderRadius: 14
            }}>
              {lang === 'th' ? 'ระบุ Guild ID เพื่อดูข้อมูลสถานะการใช้งานครับ' : 'Enter Discord Guild ID to inspect status'}
            </div>
          )}
        </div>

        {/* Right Column: Support & Voucher Form */}
        <div className="glass-panel" style={{ padding: 24 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Sparkles size={18} style={{ color: 'var(--cyber-pink)' }} />
            <span>{lang === 'th' ? 'ร่วมสนับสนุนค่าเซิร์ฟเวอร์' : 'Server Support & Contribution'}</span>
          </h2>

          {/* Support Method Tabs */}
          <div style={{
            display: 'flex',
            gap: 6,
            marginBottom: 20,
            background: 'rgba(255, 255, 255, 0.04)',
            padding: 4,
            borderRadius: 12,
            border: '1px solid var(--card-border)'
          }}>
            <button
              type="button"
              onClick={() => setFormTab('voucher')}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: 8,
                border: 'none',
                background: formTab === 'voucher' ? 'var(--cyber-pink)' : 'transparent',
                color: formTab === 'voucher' ? '#FFF' : 'var(--text-sub)',
                fontWeight: formTab === 'voucher' ? 700 : 500,
                fontSize: 12,
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6
              }}
            >
              <Sparkles size={14} />
              <span>{lang === 'th' ? 'ซองของขวัญ TrueMoney' : 'TrueMoney Voucher'}</span>
            </button>
            <button
              type="button"
              onClick={() => setFormTab('promo')}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: 8,
                border: 'none',
                background: formTab === 'promo' ? 'var(--slime-green)' : 'transparent',
                color: formTab === 'promo' ? '#080B10' : 'var(--text-sub)',
                fontWeight: formTab === 'promo' ? 700 : 500,
                fontSize: 12,
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6
              }}
            >
              <Gift size={14} />
              <span>{lang === 'th' ? 'โค้ดกิจกรรม (Drop)' : 'Promo Code'}</span>
            </button>
          </div>

          {formTab === 'voucher' ? (
            <form onSubmit={handleTopup}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-sub)', marginBottom: 6 }}>
                  {lang === 'th' ? 'ลิงก์ซองของขวัญ TrueMoney (Gift Voucher Link)' : 'Gift Voucher URL'}
                </label>
                <input
                  type="text"
                  placeholder="https://gift.truemoney.com/campaign/?v=..."
                  value={voucher}
                  onChange={(e) => setVoucher(e.target.value)}
                  required
                />
                <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>
                  {lang === 'th' ? 'สร้างซองของขวัญแบบ "แบ่งเท่ากัน 1 คน" ในแอป TrueMoney' : 'Create voucher set to 1 recipient in TrueMoney app'}
                </div>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-sub)', marginBottom: 6 }}>
                  {lang === 'th' ? 'รหัสชวนเพื่อน (Referral Code - ถ้ามี)' : 'Referral Code (Optional)'}
                </label>
                {guildData?.referralConfig?.enabled === false ? (
                  <div style={{ padding: '9px 12px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--card-border)', borderRadius: 8, fontSize: 12, color: 'var(--text-dim)' }}>
                    {lang === 'th' ? 'แคมเปญชวนเพื่อนปิดรับสิทธิ์ชั่วคราวครับ' : 'Referral campaign is temporarily paused'}
                  </div>
                ) : (
                  <>
                    <input
                      type="text"
                      placeholder="REF-XXXXXX"
                      value={referralCode}
                      onChange={(e) => {
                        const val = e.target.value.toUpperCase();
                        setReferralCode(val);
                        verifyReferral(val);
                      }}
                    />
                    {referrerName && (
                      <div style={{ fontSize: 11, color: 'var(--slime-green)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <CheckCircle2 size={12} />
                        <span>
                          {lang === 'th'
                            ? `ผู้แนะนำ: เซิร์ฟเวอร์ ${referrerName} (ผู้ชวนได้รับโบนัส +${guildData?.referralConfig?.rewardDays ?? 30} วัน เมื่อยอดเติมขั้นต่ำ ${guildData?.referralConfig?.minTopup ?? 29} บาท)`
                            : `Referrer: ${referrerName} (Referrer gets +${guildData?.referralConfig?.rewardDays ?? 30} days on ${guildData?.referralConfig?.minTopup ?? 29}+ THB)`}
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>

              <button
                type="submit"
                disabled={submittingTopup}
                className="btn btn-pink"
                style={{ width: '100%', padding: '12px 18px', fontSize: 14 }}
              >
                {submittingTopup ? (
                  <span>{lang === 'th' ? 'กำลังตรวจสอบยอดและร่วมสนับสนุน...' : 'Verifying Voucher...'}</span>
                ) : (
                  <>
                    <Sparkles size={16} />
                    <span>{lang === 'th' ? 'ยืนยันการร่วมสนับสนุน' : 'Confirm Server Support'}</span>
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRedeemPromo}>
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
                />
                <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>
                  {lang === 'th' ? 'รหัสโปรโมชันแจกสิทธิ์ผู้สนับสนุนเซิร์ฟเวอร์ฟรี 30 วัน' : 'Redeem limited campaign code for 30 free Supporter days'}
                </div>
              </div>

              <button
                type="submit"
                disabled={submittingPromo}
                className="btn btn-primary"
                style={{ width: '100%', padding: '12px 18px', fontSize: 14 }}
              >
                {submittingPromo ? (
                  <span>{lang === 'th' ? 'กำลังตรวจสอบสิทธิ์...' : 'Claiming...'}</span>
                ) : (
                  <>
                    <Gift size={16} />
                    <span>{lang === 'th' ? 'ยืนยันรับสิทธิ์โปรโมชัน' : 'Claim Promo Perk'}</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* Pricing Rate Tag */}
          <div style={{
            marginTop: 20,
            padding: '12px 14px',
            borderRadius: 10,
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid var(--card-border)',
            fontSize: 12,
            color: 'var(--text-sub)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span>{lang === 'th' ? 'เรตผู้สนับสนุนมาตรฐาน:' : 'Standard Supporter Rate:'}</span>
            <strong style={{ color: '#FFF' }}>29 บาท = 30 วัน (Supporter)</strong>
          </div>
        </div>
      </div>

      {/* Feature Comparison Matrix */}
      <div className="glass-panel" style={{ padding: 24, marginBottom: 32 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, textAlign: 'center' }}>
          {lang === 'th' ? 'เปรียบเทียบสิทธิประโยชน์แพ็กเกจ' : 'Tier Comparison'}
        </h3>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 16
        }}>
          {/* General / Free Tier */}
          <div style={{
            background: 'rgba(8, 11, 16, 0.5)',
            border: '1px solid var(--card-border)',
            borderRadius: 14,
            padding: 20
          }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 14 }}>
              <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-sub)' }}>{lang === 'th' ? 'ทั่วไป' : 'STANDARD'}</span>
            </div>
            <ul style={{ listStyle: 'none', fontSize: 12.5, color: 'var(--text-sub)', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <li style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <CheckCircle2 size={14} style={{ color: 'var(--slime-green)' }} />
                <span>{lang === 'th' ? 'คุณภาพเสียงระดับมาตรฐาน (64 kbps)' : 'Standard audio quality (64 kbps)'}</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <CheckCircle2 size={14} style={{ color: 'var(--slime-green)' }} />
                <span>{lang === 'th' ? 'รองรับลิงก์สตรีมเสียงและวิดีโอชั้นนำ (นกแดง / เมฆส้ม)' : 'Supports leading audio & video platforms'}</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-dim)' }}>
                <AlertCircle size={14} />
                <span>{lang === 'th' ? 'คิวเพลงสูงสุด 10 เพลง (เพลย์ลิสต์ 5 เพลง)' : 'Queue limit 10 songs (5 per playlist)'}</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-dim)' }}>
                <AlertCircle size={14} />
                <span>{lang === 'th' ? 'ความยาวคลิปไม่เกิน 30 นาทีต่อเพลง' : 'Maximum track duration 30 minutes'}</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-dim)' }}>
                <AlertCircle size={14} />
                <span>{lang === 'th' ? 'แชร์ช่องสัญญาณทั่วไป (หากเต็มต้องรอคิว)' : 'Shared stream slots (subject to wait time)'}</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-dim)' }}>
                <AlertCircle size={14} />
                <span>{lang === 'th' ? 'ไม่รองรับระบบ Equalizer และ Autoplay' : 'No Equalizer filters or continuous Autoplay'}</span>
              </li>
            </ul>
          </div>

          {/* Supporter Tier */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(0, 255, 136, 0.03) 0%, rgba(12, 16, 24, 0.98) 100%)',
            border: '1px solid rgba(0, 255, 136, 0.3)',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5), 0 0 10px rgba(0, 255, 136, 0.06)',
            borderRadius: 14,
            padding: 20,
            position: 'relative'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div>
                <span style={{ fontWeight: 800, fontSize: 16, color: 'var(--slime-green)' }}>SUPPORTER</span>
                <span className="slime-badge" style={{ marginLeft: 8, fontSize: 10, background: 'rgba(0, 255, 136, 0.08)', border: '1px solid rgba(0, 255, 136, 0.25)', boxShadow: 'none' }}>RECOMMENDED</span>
              </div>
              <span style={{ fontWeight: 700, fontSize: 14, color: '#FFF' }}>{lang === 'th' ? '29 บาท / 30 วัน' : '29 THB / 30 Days'}</span>
            </div>
            <ul style={{ listStyle: 'none', fontSize: 12.5, color: '#FFF', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <li style={{ display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 6, borderBottom: '1px solid rgba(0, 255, 136, 0.15)' }}>
                <ShieldCheck size={15} style={{ color: 'var(--slime-green)', flexShrink: 0 }} />
                <strong style={{ color: 'var(--slime-green)', fontSize: 13 }}>
                  {lang === 'th' ? 'ปลดล็อกสิทธิ์ใช้งานร่วมกันทั้งเซิร์ฟเวอร์ (ไม่ต้องจ่ายรายคน)' : 'Unlocks perks for the entire server (No per-user fees)'}
                </strong>
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Zap size={14} style={{ color: 'var(--slime-green)' }} />
                <strong>{lang === 'th' ? 'คุณภาพเสียงคมชัดสูงพิเศษ (96 kbps Studio HQ)' : 'Pristine audio quality (96 kbps Studio HQ)'}</strong>
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Music2 size={14} style={{ color: 'var(--slime-green)' }} />
                <span>{lang === 'th' ? 'ช่องสัญญาณด่วนพิเศษ (Priority Slot) เปิดเพลงได้ทันที ไม่ต้องรอคิว' : 'Guaranteed Priority Slot — instant playback, zero waiting'}</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Clock size={14} style={{ color: 'var(--slime-green)' }} />
                <span>{lang === 'th' ? 'ฟังเพลงและไลฟ์สดยาวได้ไม่จำกัดความยาว (เกิน 30 นาทีได้)' : 'Unlimited playback length for long tracks and live streams'}</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Award size={14} style={{ color: 'var(--slime-green)' }} />
                <span>{lang === 'th' ? 'ขยายคิวเพลงสูงสุด 50 เพลง (เพลย์ลิสต์ครั้งละ 25 เพลง)' : 'Expanded queue up to 50 songs (25 songs per playlist)'}</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Sliders size={14} style={{ color: 'var(--slime-green)' }} />
                <span>{lang === 'th' ? 'ปลดล็อกตัวปรับแต่งเสียง Equalizer (Bass Boost, Nightcore, Pop ฯลฯ)' : 'Unlock Equalizer audio presets (Bass Boost, Nightcore, Pop)'}</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Sparkles size={14} style={{ color: 'var(--slime-green)' }} />
                <span>{lang === 'th' ? 'ระบบเล่นเพลงต่อเนื่องอัตโนมัติ (Autoplay) ปาร์ตี้ไม่มีสะดุด' : 'Intelligent continuous Autoplay when queue ends'}</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Short Terms of Service & Legal Disclaimer */}
      <div style={{
        padding: '18px 22px',
        borderRadius: 14,
        background: 'rgba(255, 255, 255, 0.02)',
        border: '1px solid var(--card-border)',
        color: 'var(--text-sub)',
        fontSize: 12,
        lineHeight: 1.65,
        marginTop: 10
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 12,
          paddingBottom: 10,
          borderBottom: '1px solid var(--card-border)',
          flexWrap: 'wrap',
          gap: 10
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 13, color: '#FFF' }}>
            <FileText size={16} style={{ color: 'var(--slime-green)' }} />
            <span>{lang === 'th' ? 'ข้อกำหนดและเงื่อนไขการสนับสนุน (Disclaimer & Terms of Use)' : 'Terms of Service & Disclaimer'}</span>
          </div>
          <button
            type="button"
            onClick={() => setShowTosModal(true)}
            style={{
              background: 'rgba(0, 255, 136, 0.08)',
              border: '1px solid rgba(0, 255, 136, 0.25)',
              color: 'var(--slime-green)',
              borderRadius: 8,
              padding: '4px 10px',
              fontSize: 11.5,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              transition: 'all 0.2s'
            }}
          >
            <span>{lang === 'th' ? 'อ่านข้อตกลงฉบับเต็ม' : 'Read Full Terms'}</span>
            <ArrowRight size={13} />
          </button>
        </div>

        <ol style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 8, color: 'var(--text-dim)', fontSize: 11.5 }}>
          <li>
            <strong style={{ color: 'var(--text-sub)' }}>{lang === 'th' ? 'สถานะผู้ส่งผ่านข้อมูล:' : 'Data Forwarder Status:'}</strong>{' '}
            {lang === 'th'
              ? 'GOOLIX ทำหน้าที่เป็นเพียงตัวกลางส่งผ่านสัญญาณเสียงแบบชั่วคราว (Data Forwarder) ไปยัง Discord โดยไม่มีการเก็บรวบรวมหรือบันทึกไฟล์สื่อถาวรไว้บนเซิร์ฟเวอร์'
              : 'GOOLIX operates strictly as a transient data forwarder (Mere Conduit) to Discord without retaining or hosting permanent media files.'}
          </li>
          <li>
            <strong style={{ color: 'var(--text-sub)' }}>{lang === 'th' ? 'การร่วมสนับสนุนค่าเซิร์ฟเวอร์:' : 'Server Contribution:'}</strong>{' '}
            {lang === 'th'
              ? 'การทำรายการผ่านซองของขวัญ TrueMoney เป็นการร่วมสนับสนุนค่าบำรุงรักษาเซิร์ฟเวอร์โดยสมัครใจ (ผูกสิทธิ์ตาม Guild ID ให้ใช้งานได้ทั้งเซิร์ฟเวอร์) เมื่อระบบเพิ่มวันใช้งานแล้ว ไม่สามารถขอคืนเงินหรือโอนย้ายสิทธิ์ข้ามเซิร์ฟเวอร์ได้ในทุกกรณี'
              : 'TrueMoney voucher redemptions are voluntary server contributions bound to the target Guild ID. Once processed, contributions are strictly non-refundable and non-transferable.'}
          </li>
          <li>
            <strong style={{ color: 'var(--text-sub)' }}>{lang === 'th' ? 'ความเสถียรของระบบ:' : 'System Reliability:'}</strong>{' '}
            {lang === 'th'
              ? 'ระบบให้บริการตามสภาพจริง (As-Is) ไม่รับประกันการออนไลน์ 100% ตลอด 24 ชั่วโมง และขอสงวนสิทธิ์ในการตัดสายอัตโนมัติเมื่อไม่มีผู้ฟังในห้องเสียง ปิดปรับปรุงชั่วคราว หรือระงับสิทธิ์เซิร์ฟเวอร์ที่ใช้งานผิดปกติโดยไม่ต้องแจ้งให้ทราบล่วงหน้า'
              : 'Service is provided on an "As-Is" basis with no guarantee of uninterrupted 24/7 uptime. We reserve the right to auto-disconnect empty channels, perform maintenance, or suspend abusive guilds without prior notice.'}
          </li>
        </ol>
      </div>

      {/* Full Terms of Service Modal Dialog */}
      {showTosModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 1000,
          background: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20
        }} onClick={() => setShowTosModal(false)}>
          <div style={{
            background: '#0D1117',
            border: '1px solid var(--card-border)',
            borderRadius: 16,
            width: '100%',
            maxWidth: 720,
            maxHeight: '85vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 20px 40px rgba(0,0,0,0.8), 0 0 20px rgba(0, 255, 136, 0.1)',
            overflow: 'hidden'
          }} onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '18px 24px',
              borderBottom: '1px solid var(--card-border)',
              background: 'rgba(255, 255, 255, 0.02)'
            }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 16, color: '#FFF' }}>
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
                  border: '1px solid var(--card-border)',
                  color: 'var(--text-sub)',
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Content */}
            <div style={{
              padding: '24px',
              overflowY: 'auto',
              fontSize: 12.5,
              lineHeight: 1.7,
              color: 'var(--text-sub)',
              display: 'flex',
              flexDirection: 'column',
              gap: 20
            }}>
              <p style={{ margin: 0, color: 'var(--text-dim)', fontStyle: 'italic', paddingBottom: 12, borderBottom: '1px solid var(--card-border)' }}>
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
                    <strong style={{ color: 'var(--cyber-pink)' }}>{lang === 'th' ? '• ลักษณะการสนับสนุน:' : '• Voluntary Nature:'}</strong>{' '}
                    {lang === 'th'
                      ? 'ยอดเงินที่ทำรายการผ่านลิงก์ซองของขวัญ TrueMoney เป็นการร่วมบริจาคสนับสนุนค่าเช่าเซิร์ฟเวอร์และแบนด์วิธเพื่อขับเคลื่อนคอมมูนิตี้ ไม่ใช่การซื้อขายสินค้าหรือบริการเชิงพาณิชย์'
                      : 'Redemptions via TrueMoney vouchers represent voluntary community contributions toward server hosting and bandwidth infrastructure, not commercial retail transactions.'}
                  </div>
                  <div>
                    <strong style={{ color: 'var(--cyber-pink)' }}>{lang === 'th' ? '• สิทธิ์ระดับเซิร์ฟเวอร์ (Server-Wide Access):' : '• Server-Wide Access:'}</strong>{' '}
                    {lang === 'th'
                      ? 'สิทธิพิเศษของผู้สนับสนุน (Supporter) จะผูกกับรหัสเซิร์ฟเวอร์ (Guild ID) ที่ระบุเท่านั้น สมาชิกทุกคนในเซิร์ฟเวอร์ดังกล่าวสามารถรับสิทธิ์ร่วมกันได้ทันที โดยไม่สามารถขอเปลี่ยนหรือโอนย้ายวันใช้งานไปยังเซิร์ฟเวอร์อื่นได้ในทุกกรณี'
                      : 'Supporter privileges bind exclusively to the specified Guild ID and extend to all members in that guild. Perks cannot be transferred to alternative servers.'}
                  </div>
                  <div>
                    <strong style={{ color: 'var(--cyber-pink)' }}>{lang === 'th' ? '• การคำนวณและการทบวันใช้งาน:' : '• Duration Stacking:'}</strong>{' '}
                    {lang === 'th'
                      ? 'ระบบคำนวณวันใช้งานตามสัดส่วนยอดเงินจริง (อัตราอ้างอิง 29 บาท = 30 วัน) หากทำรายการซ้ำก่อนวันหมดอายุ ระบบจะบวกทบเวลาต่อท้ายจากวันหมดอายุเดิมให้ตามจริงโดยไม่ตัดวันคงเหลือทิ้ง (จำกัดการสะสมวันใช้งานสูงสุดไม่เกิน 365 วันต่อเซิร์ฟเวอร์)'
                      : 'Durations calculate pro-rata based on contributions (nominal rate: 29 THB = 30 days). Consecutive contributions stack cumulatively up to a maximum safety ceiling of 365 days.'}
                  </div>
                  <div>
                    <strong style={{ color: 'var(--cyber-pink)' }}>{lang === 'th' ? '• เงื่อนไขรหัสชวนเพื่อนและโค้ดกิจกรรม:' : '• Referral & Drop Codes:'}</strong>{' '}
                    {lang === 'th'
                      ? `โบนัสวันใช้งานพิเศษสำหรับผู้ชวน จะทำงานเมื่อเซิร์ฟเวอร์ผู้ถูกชวนทำรายการสนับสนุนด้วยซองของขวัญที่มียอดตั้งแต่ ${guildData?.referralConfig?.minTopup ?? 29} บาทขึ้นไป เท่านั้น และต้องอยู่ภายในระยะเวลาของรอบซีซั่น ส่วนโค้ดกิจกรรม (Early-Bird Drop) จำกัดสิทธิ์การใช้งาน 1 โค้ดต่อ 1 เซิร์ฟเวอร์และมีจำนวนจำกัดตามโควตาที่กำหนด`
                      : `Referral bonus days trigger only when the referred server contributes ${guildData?.referralConfig?.minTopup ?? 29} THB or greater within the active season period. Early-Bird Drop codes are single-use per server and strictly quota-governed.`}
                  </div>
                  <div>
                    <strong style={{ color: 'var(--cyber-pink)' }}>{lang === 'th' ? '• นโยบายไม่คืนเงิน (No Refund Policy):' : '• No Refund Policy:'}</strong>{' '}
                    {lang === 'th'
                      ? 'เมื่อระบบทำการรับซองของขวัญและอนุมัติวันใช้งานเข้าสู่ระบบสำเร็จแล้ว ไม่สามารถขอคืนเงิน ยกเลิก หรือแลกเปลี่ยนเป็นสิ่งอื่นได้ในทุกกรณี'
                      : 'Once a voucher is successfully redeemed and days are credited, all contributions are strictly non-refundable and irrevocable.'}
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
                    <strong style={{ color: '#F87171' }}>{lang === 'th' ? '• การจัดการทรัพยากรอัตโนมัติ:' : '• Automated Resource Governance:'}</strong>{' '}
                    {lang === 'th'
                      ? 'เพื่อรักษาคุณภาพเสียงของส่วนรวม ระบบจะตัดการเชื่อมต่อจากห้องเสียงอัตโนมัติหากไม่มีผู้ฟังอยู่ในห้อง หรือมีการเปิดสตรีมต่อเนื่องยาวนานเกินเกณฑ์ที่กำหนดโดยไม่มีการโต้ตอบ'
                      : 'To conserve cluster resources, the bot will auto-disconnect from empty voice channels or prolonged unmonitored streams.'}
                  </div>
                  <div>
                    <strong style={{ color: '#F87171' }}>{lang === 'th' ? '• การระงับสิทธิ์ (Ban Policy):' : '• Abuse & Ban Policy:'}</strong>{' '}
                    {lang === 'th'
                      ? 'ห้ามใช้บอทหรือสคริปต์อัตโนมัติเฝ้าห้องเพื่อดึงแบนด์วิธตลอด 24 ชั่วโมง ห้ามยิงคำสั่งรัวเพื่อก่อกวนระบบ (Spam/Flood) และห้ามอาศัยช่องโหว่ในการปั๊มวันใช้งานฟรี หากระบบตรวจพบการกระทำดังกล่าว ทีมพัฒนาขอสงวนสิทธิ์ในการระงับการใช้งานเซิร์ฟเวอร์นั้นถาวร (Ban Guild) และยกเลิกวันใช้งานคงเหลือทั้งหมดทันทีโดยไม่ต้องแจ้งให้ทราบล่วงหน้า'
                      : 'Automated 24/7 socket idling, command flooding, and exploitation of promotional codes are strictly prohibited. Violating guilds are subject to immediate permanent guild bans and forfeiture of remaining days.'}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '14px 24px',
              borderTop: '1px solid var(--card-border)',
              background: 'rgba(255, 255, 255, 0.02)',
              display: 'flex',
              justifyContent: 'flex-end'
            }}>
              <button
                type="button"
                onClick={() => setShowTosModal(false)}
                className="btn btn-primary"
                style={{ padding: '8px 20px', fontSize: 13 }}
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
