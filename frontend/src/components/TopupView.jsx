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
  const [formTab, setFormTab] = useState('voucher'); // 'voucher' | 'promo'

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
                    <span>{lang === 'th' ? `ผู้แนะนำ: เซิร์ฟเวอร์ ${referrerName} (รับโบนัสคนละ +7 วันเมื่อยอด 29บ. ขึ้นไป)` : `Referrer: ${referrerName} (+7 days bonus on 29+ THB)`}</span>
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

      {/* Terms of Service & Legal Mere Conduit Disclaimer */}
      <div style={{
        padding: '16px 20px',
        borderRadius: 12,
        background: 'rgba(255, 255, 255, 0.02)',
        border: '1px solid var(--card-border)',
        color: 'var(--text-dim)',
        fontSize: 11.5,
        lineHeight: 1.6,
        textAlign: 'center'
      }}>
        <div style={{ fontWeight: 600, color: 'var(--text-sub)', marginBottom: 4 }}>
          {lang === 'th' ? 'ข้อกำหนดและเงื่อนไข (Terms of Service & Disclaimer)' : 'Terms of Service & Disclaimer'}
        </div>
        <div>
          {lang === 'th'
            ? 'ระบบทำหน้าที่เป็นเพียงท่อส่งผ่านข้อมูลชั่วคราว (Mere Conduit) โดยไม่เก็บไฟล์สื่อถาวรบนเซิร์ฟเวอร์ ไม่รับประกันสถานะออนไลน์ 100% เงินสนับสนุนเป็นการร่วมสมทบทุนค่าใช้จ่ายเซิร์ฟเวอร์โดยสมัครใจ และไม่สามารถขอคืนได้ทุกกรณี'
            : 'This service operates strictly as a transient conduit (Mere Conduit) without persistent storage of media files. 100% uptime is not guaranteed. Voluntary contributions help offset operational server costs and are non-refundable.'}
        </div>
      </div>
    </div>
  );
}
