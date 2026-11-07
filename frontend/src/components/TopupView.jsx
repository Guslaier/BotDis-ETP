import React, { useState, useEffect } from 'react';
import { 
  Sparkles, CheckCircle2, AlertCircle, Gift, Server, ShieldCheck, 
  Clock, ArrowRight, Share2, Copy, Zap, Music2, Sliders, Award
} from 'lucide-react';

export default function TopupView({ lang, onToast }) {
  const [guildId, setGuildId] = useState('');
  const [userId, setUserId] = useState('');
  const [guildData, setGuildData] = useState(null);
  const [loadingGuild, setLoadingGuild] = useState(false);

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
    const g = params.get('guildId') || '';
    const u = params.get('userId') || '';
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
      onToast('warning', lang === 'th' ? 'กรุณาระบุ Guild ID' : 'Missing Guild ID', lang === 'th' ? 'เลือกหรือกรอกไอดีเซิร์ฟเวอร์ก่อนค่ะ' : 'Provide Guild ID first');
      return;
    }
    if (!voucher.trim()) {
      onToast('warning', lang === 'th' ? 'กรุณาระบุลิงก์ซอง' : 'Missing Voucher', lang === 'th' ? 'วางลิงก์ซองของขวัญ TrueMoney ค่ะ' : 'Enter voucher link');
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
        onToast('success', lang === 'th' ? 'เติมเงินสำเร็จ!' : 'Topup Successful!', lang === 'th' ? `เพิ่มวันใช้งาน +${data.addedDays} วัน (ยอด ${data.amount} บาท)` : `Added +${data.addedDays} days (${data.amount} THB)`);
        setVoucher('');
        verifyGuild(guildId, userId);
      } else {
        onToast('error', lang === 'th' ? 'เติมเงินไม่สำเร็จ' : 'Topup Failed', data.error || 'Voucher invalid');
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
        onToast('success', lang === 'th' ? 'เคลมสิทธิ์สำเร็จ!' : 'Code Redeemed!', lang === 'th' ? `ยินดีด้วยค่ะ! ได้รับสิทธิ์ ${data.campaignName} (+${data.addedDays} วัน)` : `Received +${data.addedDays} days`);
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
      return lang === 'th' ? 'ยังไม่มีแพ็กเกจ (สายฟรี)' : 'Free Tier (No Active VIP)';
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
                  FREE 30 DAYS
                </span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-sub)', marginTop: 2 }}>
                {lang === 'th' ? 'แคมเปญสิทธิ์พิเศษเปิดตัวเซิร์ฟเวอร์ เหลือเพียง' : 'Limited Early-Bird Drop remaining:'}{' '}
                <strong style={{ color: 'var(--slime-green)' }}>{guildData.campaign.remaining}</strong> / {guildData.campaign.maxClaims} {lang === 'th' ? 'สิทธิ์' : 'claims'}
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
                  {guildData.guild.isSupporter ? 'VIP SUPPORTER' : 'FREE TIER'}
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
                  <div style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 14, color: '#FFF' }}>
                    {guildData.guild.referralCode}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-sub)', marginTop: 4 }}>
                    {lang === 'th' ? 'เพื่อนใช้โค้ดนี้เติมเงิน: คุณได้รับ +7 วัน เพื่อนได้รับ +7 วัน' : 'Invite friends: Both get +7 bonus days!'}
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
              {lang === 'th' ? 'ระบุ Guild ID เพื่อดูข้อมูลสถานะการใช้งานค่ะ' : 'Enter Discord Guild ID to inspect status'}
            </div>
          )}
        </div>

        {/* Right Column: TrueMoney Voucher Topup Form */}
        <div className="glass-panel" style={{ padding: 24 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Sparkles size={18} style={{ color: 'var(--cyber-pink)' }} />
            <span>{lang === 'th' ? 'เติมเงินด้วยซองของขวัญ TrueMoney' : 'TrueMoney Gift Voucher'}</span>
          </h2>

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
                  <span>{lang === 'th' ? `ผู้แนะนำ: เซิร์ฟเวอร์ ${referrerName} (รับโบนัสคนละ +7 วัน)` : `Referrer: ${referrerName} (+7 days bonus)`}</span>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={submittingTopup}
              className="btn btn-pink"
              style={{ width: '100%', padding: '12px 18px', fontSize: 14 }}
            >
              {submittingTopup ? (
                <span>{lang === 'th' ? 'กำลังตรวจสอบยอดและเติมเงิน...' : 'Verifying Voucher...'}</span>
              ) : (
                <>
                  <Sparkles size={16} />
                  <span>{lang === 'th' ? 'ยืนยันการเติมเงินทันที' : 'Redeem Voucher Now'}</span>
                </>
              )}
            </button>
          </form>

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
            <span>{lang === 'th' ? 'อัตราค่าบริการมาตรฐาน:' : 'Standard Pricing:'}</span>
            <strong style={{ color: '#FFF' }}>29 บาท = 30 วัน VIP</strong>
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
          {/* Free Tier */}
          <div style={{
            background: 'rgba(8, 11, 16, 0.5)',
            border: '1px solid var(--card-border)',
            borderRadius: 14,
            padding: 20
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-sub)' }}>FREE TIER</span>
              <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>0 บาท</span>
            </div>
            <ul style={{ listStyle: 'none', fontSize: 12.5, color: 'var(--text-sub)', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <li style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <CheckCircle2 size={14} style={{ color: 'var(--slime-green)' }} /> 64 kbps Audio Quality
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <CheckCircle2 size={14} style={{ color: 'var(--slime-green)' }} /> YouTube & SoundCloud
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-dim)' }}>
                <AlertCircle size={14} /> โควตาสตรีมจำกัด (แชร์ช่องสัญญาณ)
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-dim)' }}>
                <AlertCircle size={14} /> ไม่รองรับฟิลเตอร์ปรับแต่งเสียง
              </li>
            </ul>
          </div>

          {/* VIP Supporter */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(0, 255, 136, 0.08) 0%, rgba(17, 22, 32, 0.95) 100%)',
            border: '1px solid var(--slime-green)',
            boxShadow: '0 0 24px var(--slime-glow)',
            borderRadius: 14,
            padding: 20,
            position: 'relative'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div>
                <span style={{ fontWeight: 800, fontSize: 16, color: 'var(--slime-green)' }}>VIP SUPPORTER</span>
                <span className="slime-badge" style={{ marginLeft: 8, fontSize: 10 }}>RECOMMENDED</span>
              </div>
              <span style={{ fontWeight: 700, fontSize: 14, color: '#FFF' }}>29฿ / 30 วัน</span>
            </div>
            <ul style={{ listStyle: 'none', fontSize: 12.5, color: '#FFF', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <li style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Zap size={14} style={{ color: 'var(--slime-green)' }} />
                <strong>96 kbps Studio Quality (เสียงคมชัดสูงสุด)</strong>
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Music2 size={14} style={{ color: 'var(--slime-green)' }} />
                <span>การันตีสล็อตสตรีมเสียงเฉพาะ VIP ไม่ต้องรอคิว</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Sliders size={14} style={{ color: 'var(--slime-green)' }} />
                <span>Audio Filters: Bass Boost, 8D Audio, Nightcore, Pop</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Award size={14} style={{ color: 'var(--slime-green)' }} />
                <span>Fast-track Stream Guard Bypass</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
