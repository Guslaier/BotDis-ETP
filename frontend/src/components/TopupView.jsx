import React, { useState, useEffect } from 'react';
import { 
  Sparkles, CheckCircle2, AlertCircle, Gift, Server, ShieldCheck, 
  Clock, ArrowRight, Share2, Copy, Zap, Music2, Award,
  FileText, X, ChevronRight, Check
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
    <div style={{ maxWidth: 940, margin: '36px auto', padding: '0 20px' }} className="fade-in">
      {/* Top Banner: Early Bird Drop (if active on server) */}
      {guildData?.campaign && (
        <div className="glass-panel" style={{
          padding: '18px 24px',
          marginBottom: 28,
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
              width: 44,
              height: 44,
              borderRadius: 12,
              background: 'rgba(0, 255, 135, 0.12)',
              border: '1px solid rgba(0, 255, 135, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--slime-green)'
            }}>
              <Gift size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontWeight: 800, fontSize: 15, color: '#FFF', letterSpacing: '-0.01em' }}>
                  {guildData.campaign.name}
                </span>
                <span className="slime-badge" style={{ fontSize: 10, padding: '2px 8px' }}>
                  FREE {guildData.campaign.days || 30} DAYS
                </span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-sub)', marginTop: 3 }}>
                {lang === 'th' ? 'แคมเปญสิทธิ์พิเศษเปิดตัวเซิร์ฟเวอร์ เหลือเพียง' : 'Limited Launch Drop remaining:'}{' '}
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
              style={{ width: 150, padding: '8px 12px', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}
            />
            <button type="submit" disabled={submittingPromo} className="btn btn-sm btn-primary">
              {submittingPromo ? '...' : (lang === 'th' ? 'รับสิทธิ์' : 'Claim')}
            </button>
          </form>
        </div>
      )}

      {/* Main Studio Grid: Left Server Info & Right Topup Console */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: 24,
        marginBottom: 32
      }}>
        {/* Left Column: Server Status Console */}
        <div className="glass-panel" style={{ padding: 26, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, color: '#FFF' }}>
              <Server size={17} style={{ color: 'var(--slime-green)' }} />
              <span>{lang === 'th' ? 'ข้อมูลเซิร์ฟเวอร์เป้าหมาย' : 'Target Server Node'}</span>
            </h2>
            <span style={{ fontSize: 11, color: 'var(--text-dim)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              {lang === 'th' ? 'สเตจเสียง' : 'Audio Node'}
            </span>
          </div>

          {/* Search Box */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            <input
              type="text"
              placeholder={lang === 'th' ? 'ระบุ Discord Server ID (เช่น 123456...)' : 'Discord Server ID...'}
              value={guildId}
              onChange={(e) => setGuildId(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && verifyGuild()}
              style={{ flex: 1 }}
            />
            <button
              onClick={() => verifyGuild()}
              disabled={loadingGuild}
              className="btn btn-primary"
              style={{ padding: '0 18px', whiteSpace: 'nowrap' }}
            >
              {loadingGuild ? '...' : (lang === 'th' ? 'ค้นหา' : 'Inspect')}
            </button>
          </div>

          {guildData?.guild ? (
            <div style={{
              background: 'rgba(5, 7, 11, 0.65)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 14,
              padding: 18,
              display: 'flex',
              flexDirection: 'column',
              gap: 14
            }}>
              {/* Guild Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                {guildData.guild.icon ? (
                  <img
                    src={guildData.guild.icon}
                    alt=""
                    style={{
                      width: 50,
                      height: 50,
                      borderRadius: 12,
                      objectFit: 'cover',
                      border: '1px solid var(--border-light)'
                    }}
                  />
                ) : (
                  <div style={{
                    width: 50,
                    height: 50,
                    borderRadius: 12,
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: 19,
                    color: 'var(--text-sub)'
                  }}>
                    {guildData.guild.name.charAt(0)}
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontWeight: 800,
                    fontSize: 16,
                    color: '#FFF',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    letterSpacing: '-0.01em'
                  }}>
                    {guildData.guild.name}
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-dim)', marginTop: 2 }}>
                    ID: <span style={{ fontFamily: 'var(--font-mono)' }}>{guildData.guild.id}</span> • {guildData.guild.memberCount} {lang === 'th' ? 'สมาชิก' : 'members'}
                  </div>
                </div>
              </div>

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
                <span style={{ fontSize: 12, color: 'var(--text-sub)' }}>
                  {lang === 'th' ? 'สถานะแพ็กเกจ:' : 'Current Tier:'}
                </span>
                <span style={{
                  fontWeight: 800,
                  fontSize: 12,
                  letterSpacing: '0.04em',
                  color: guildData.guild.isSupporter ? 'var(--slime-green)' : 'var(--text-dim)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}>
                  {guildData.guild.isSupporter ? <ShieldCheck size={14} /> : null}
                  {guildData.guild.isSupporter ? 'SUPPORTER (HQ PASS)' : (lang === 'th' ? 'ทั่วไป (STANDARD)' : 'STANDARD')}
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
                  <Clock size={13} style={{ color: 'var(--cyan-freq)' }} />
                  {lang === 'th' ? 'วันใช้งานคงเหลือ:' : 'Remaining Time:'}
                </span>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#FFF' }}>
                  {formatExpiry(guildData.guild.expiresAt)}
                </span>
              </div>

              {/* Referral Pass Widget */}
              {guildData.guild.referralCode && (
                <div style={{
                  padding: '14px 16px',
                  background: 'linear-gradient(145deg, rgba(255, 43, 133, 0.08) 0%, rgba(14, 20, 34, 0.7) 100%)',
                  border: '1px solid rgba(255, 43, 133, 0.25)',
                  borderRadius: 12
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--cyber-pink)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {lang === 'th' ? 'รหัสชวนเพื่อนรับวันฟรี' : 'Referral Invite Code'}
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
                        fontWeight: 700
                      }}
                    >
                      <Copy size={12} /> {lang === 'th' ? 'คัดลอกลิงก์' : 'Copy Link'}
                    </button>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                    <div style={{
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 800,
                      fontSize: 15,
                      color: '#FFF',
                      letterSpacing: '0.06em'
                    }}>
                      {guildData.guild.referralCode}
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--slime-green)' }}>
                      {lang === 'th'
                        ? `ชวนสำเร็จ: ${guildData.guild.referralCount || 0} / ${guildData?.referralConfig?.maxInvites ?? guildData.guild.maxReferralMonths ?? 6}`
                        : `Invited: ${guildData.guild.referralCount || 0} / ${guildData?.referralConfig?.maxInvites ?? guildData.guild.maxReferralMonths ?? 6}`}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-sub)', marginTop: 8, lineHeight: 1.5 }}>
                    {guildData?.referralConfig?.enabled === false ? (
                      <span style={{ color: 'var(--red-alert)', fontWeight: 600 }}>
                        {lang === 'th' ? '● แคมเปญชวนเพื่อนปิดรับสิทธิ์ชั่วคราว' : '● Referral program is currently paused'}
                      </span>
                    ) : (guildData?.referralConfig?.expiresAt && Date.now() > guildData.referralConfig.expiresAt) ? (
                      <span style={{ color: 'var(--red-alert)', fontWeight: 600 }}>
                        {lang === 'th'
                          ? `⛔ หมดเขตโปรโมชั่น Season นี้แล้ว (${new Date(guildData.referralConfig.expiresAt).toLocaleDateString('th-TH')})`
                          : `⛔ Season ended (${new Date(guildData.referralConfig.expiresAt).toLocaleDateString()})`}
                      </span>
                    ) : (
                      <>
                        <span>
                          {lang === 'th'
                            ? `เพื่อนเติมเงินด้วยโค้ดนี้ (ขั้นต่ำ ${guildData?.referralConfig?.minTopup ?? 29} บาท): ผู้แนะนำได้รับวันฟรี +${guildData?.referralConfig?.rewardDays ?? 30} วัน`
                            : `Friends top up with code (${guildData?.referralConfig?.minTopup ?? 29}+ THB): You get +${guildData?.referralConfig?.rewardDays ?? 30} free days`}
                        </span>
                        {guildData?.referralConfig?.expiresAt && (
                          <div style={{ color: 'var(--amber-warn)', marginTop: 4, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span>⏳</span>
                            <span>
                              {lang === 'th'
                                ? `หมดเขต: ${new Date(guildData.referralConfig.expiresAt).toLocaleString('th-TH')} (${formatCountdown(guildData.referralConfig.expiresAt, 'th')})`
                                : `Ends: ${new Date(guildData.referralConfig.expiresAt).toLocaleString()} (${formatCountdown(guildData.referralConfig.expiresAt, 'en')})`}
                            </span>
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
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              padding: '36px 16px',
              color: 'var(--text-dim)',
              fontSize: 12.5,
              border: '1px dashed var(--border-subtle)',
              borderRadius: 14,
              background: 'rgba(5, 7, 11, 0.3)'
            }}>
              <Server size={28} style={{ color: 'var(--text-dim)', marginBottom: 10, opacity: 0.6 }} />
              <div>{lang === 'th' ? 'ระบุ Discord Server ID ด้านบนเพื่อเริ่มรายการ' : 'Enter Discord Server ID above to inspect status'}</div>
            </div>
          )}
        </div>

        {/* Right Column: Support & Voucher Console */}
        <div className="glass-panel" style={{ padding: 26, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, color: '#FFF' }}>
              <Sparkles size={17} style={{ color: 'var(--cyber-pink)' }} />
              <span>{lang === 'th' ? 'ร่วมสนับสนุน & ปลดล็อกสิทธิ์' : 'Server Contribution & Perks'}</span>
            </h2>
            <span style={{ fontSize: 11, color: 'var(--text-dim)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              {lang === 'th' ? 'ช่องทางทำรายการ' : 'Channel'}
            </span>
          </div>

          {/* Tab Switcher */}
          <div style={{
            display: 'flex',
            gap: 6,
            marginBottom: 20,
            background: 'rgba(5, 7, 11, 0.65)',
            padding: 4,
            borderRadius: 12,
            border: '1px solid var(--border-subtle)'
          }}>
            <button
              type="button"
              onClick={() => setFormTab('voucher')}
              style={{
                flex: 1,
                padding: '9px 12px',
                borderRadius: 9,
                border: 'none',
                background: formTab === 'voucher' ? 'var(--cyber-pink)' : 'transparent',
                color: formTab === 'voucher' ? '#FFF' : 'var(--text-sub)',
                fontWeight: formTab === 'voucher' ? 700 : 500,
                fontSize: 12,
                cursor: 'pointer',
                transition: 'all 0.18s ease',
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
                padding: '9px 12px',
                borderRadius: 9,
                border: 'none',
                background: formTab === 'promo' ? 'var(--slime-green)' : 'transparent',
                color: formTab === 'promo' ? '#05070B' : 'var(--text-sub)',
                fontWeight: formTab === 'promo' ? 700 : 500,
                fontSize: 12,
                cursor: 'pointer',
                transition: 'all 0.18s ease',
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
            <form onSubmit={handleTopup} style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
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
                <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 5 }}>
                  {lang === 'th' ? 'สร้างซองของขวัญแบบ "แบ่งเท่ากัน 1 คน" ในแอป TrueMoney' : 'Set voucher to "1 recipient" in TrueMoney app'}
                </div>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-sub)', marginBottom: 6 }}>
                  {lang === 'th' ? 'รหัสชวนเพื่อน (Referral Code - ถ้ามี)' : 'Referral Code (Optional)'}
                </label>
                {guildData?.referralConfig?.enabled === false ? (
                  <div style={{ padding: '10px 12px', background: 'rgba(255, 51, 75, 0.08)', border: '1px solid rgba(255, 51, 75, 0.25)', borderRadius: 8, fontSize: 12, color: 'var(--red-alert)' }}>
                    ⛔ {lang === 'th' ? 'แคมเปญชวนเพื่อนปิดรับสิทธิ์ชั่วคราวครับ' : 'Referral program is temporarily paused'}
                  </div>
                ) : (guildData?.referralConfig?.expiresAt && Date.now() > guildData.referralConfig.expiresAt) ? (
                  <div style={{ padding: '10px 12px', background: 'rgba(255, 51, 75, 0.08)', border: '1px solid rgba(255, 51, 75, 0.25)', borderRadius: 8, fontSize: 12, color: 'var(--red-alert)' }}>
                    ⛔ {lang === 'th'
                      ? `โปรโมชั่นโค้ดชวนเพื่อนหมดเขตแล้ว (${new Date(guildData.referralConfig.expiresAt).toLocaleDateString('th-TH')})`
                      : `Referral promo has ended (${new Date(guildData.referralConfig.expiresAt).toLocaleDateString()})`}
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
                      style={{ letterSpacing: '0.04em' }}
                    />
                    {referrerName && (
                      <div style={{ fontSize: 11.5, color: 'var(--slime-green)', marginTop: 6, display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
                        <CheckCircle2 size={13} />
                        <span>
                          {lang === 'th'
                            ? `ผู้แนะนำ: เซิร์ฟเวอร์ ${referrerName} (ผู้ชวนรับโบนัส +${guildData?.referralConfig?.rewardDays ?? 30} วัน เมื่อยอดเติมขั้นต่ำ ${guildData?.referralConfig?.minTopup ?? 29} บาท)`
                            : `Referrer: ${referrerName} (Gets +${guildData?.referralConfig?.rewardDays ?? 30} days on ${guildData?.referralConfig?.minTopup ?? 29}+ THB)`}
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>

              <div style={{ marginTop: 'auto' }}>
                <button
                  type="submit"
                  disabled={submittingTopup}
                  className="btn btn-pink"
                  style={{ width: '100%', padding: '13px 18px', fontSize: 14 }}
                >
                  {submittingTopup ? (
                    <span>{lang === 'th' ? 'กำลังตรวจสอบยอดและทำรายการ...' : 'Verifying Voucher...'}</span>
                  ) : (
                    <>
                      <Sparkles size={16} />
                      <span>{lang === 'th' ? 'ยืนยันการร่วมสนับสนุน' : 'Confirm Server Contribution'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
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
                  style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}
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
                      <Gift size={16} />
                      <span>{lang === 'th' ? 'ยืนยันรับสิทธิ์โปรโมชัน' : 'Claim Promo Perk'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Pricing Standard Tag */}
          <div style={{
            marginTop: 20,
            padding: '11px 14px',
            borderRadius: 10,
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid var(--border-subtle)',
            fontSize: 12,
            color: 'var(--text-sub)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span>{lang === 'th' ? 'เรตผู้สนับสนุนมาตรฐาน:' : 'Standard Supporter Rate:'}</span>
            <strong style={{ color: '#FFF', letterSpacing: '-0.01em' }}>
              {guildData?.config?.price30Days ?? 29} {lang === 'th' ? 'บาท = 30 วัน (Supporter)' : 'THB = 30 Days (Supporter)'}
            </strong>
          </div>
        </div>
      </div>

      {/* Feature Comparison Matrix */}
      <div className="glass-panel" style={{ padding: 28, marginBottom: 32 }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <h3 style={{ fontSize: 17, fontWeight: 800, color: '#FFF', letterSpacing: '-0.02em', marginBottom: 4 }}>
            {lang === 'th' ? 'เปรียบเทียบสิทธิประโยชน์แพ็กเกจ' : 'Tier Specifications & Audio Matrix'}
          </h3>
          <p style={{ fontSize: 12, color: 'var(--text-dim)' }}>
            {lang === 'th' ? 'สิทธิ์ระดับเซิร์ฟเวอร์ ปลดล็อกพร้อมกันทุกคนในห้องเสียง' : 'Server-wide unlock • Shared equally across every voice listener'}
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: 20
        }}>
          {/* General / Free Tier */}
          <div style={{
            background: 'rgba(5, 7, 11, 0.6)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 16,
            padding: 24,
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, paddingBottom: 12, borderBottom: '1px solid var(--border-subtle)' }}>
              <div>
                <span style={{ fontWeight: 800, fontSize: 15, color: 'var(--text-sub)' }}>
                  {lang === 'th' ? 'ทั่วไป' : 'STANDARD'}
                </span>
                <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>
                  {lang === 'th' ? 'สำหรับผู้เริ่มต้นใช้งาน' : 'Essential baseline tier'}
                </div>
              </div>
              <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-dim)' }}>
                {lang === 'th' ? 'ฟรีตลอดชีพ' : 'Free Forever'}
              </span>
            </div>

            <ul style={{ listStyle: 'none', fontSize: 12.5, color: 'var(--text-sub)', display: 'flex', flexDirection: 'column', gap: 12, margin: 0, padding: 0 }}>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <CheckCircle2 size={15} style={{ color: 'var(--slime-green)', flexShrink: 0, marginTop: 2 }} />
                <span>{lang === 'th' ? 'คุณภาพเสียงระดับมาตรฐาน (64 kbps)' : 'Standard audio quality (64 kbps)'}</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <CheckCircle2 size={15} style={{ color: 'var(--slime-green)', flexShrink: 0, marginTop: 2 }} />
                <span>{lang === 'th' ? 'รองรับลิงก์สตรีมเสียงและวิดีโอชั้นนำ (นกแดง / เมฆส้ม)' : 'Supports leading streaming providers'}</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: 10, color: 'var(--text-dim)' }}>
                <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 2 }} />
                <span>{lang === 'th' ? 'คิวเพลงสูงสุด 10 เพลง (เพลย์ลิสต์ 5 เพลง)' : 'Queue limit 10 songs (5 per playlist)'}</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: 10, color: 'var(--text-dim)' }}>
                <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 2 }} />
                <span>{lang === 'th' ? 'ความยาวคลิปไม่เกิน 30 นาทีต่อเพลง' : 'Maximum track duration 30 minutes'}</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: 10, color: 'var(--text-dim)' }}>
                <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 2 }} />
                <span>{lang === 'th' ? 'แชร์ช่องสัญญาณทั่วไป (หากเต็มต้องรอคิว)' : 'Shared stream slots (subject to wait queue)'}</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: 10, color: 'var(--text-dim)' }}>
                <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 2 }} />
                <span>{lang === 'th' ? 'ไม่รองรับระบบเล่นเพลงต่อเนื่องอัตโนมัติ (Autoplay)' : 'No continuous Autoplay'}</span>
              </li>
            </ul>
          </div>

          {/* Supporter VIP Soundstage Tier */}
          <div className="deck-panel-highlight" style={{
            borderRadius: 16,
            padding: 24,
            display: 'flex',
            flexDirection: 'column',
            position: 'relative'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, paddingBottom: 12, borderBottom: '1px solid rgba(0, 255, 135, 0.2)' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontWeight: 800, fontSize: 16, color: 'var(--slime-green)', letterSpacing: '0.04em' }}>SUPPORTER</span>
                  <span className="slime-badge" style={{ fontSize: 10, padding: '2px 8px' }}>RECOMMENDED</span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-sub)', marginTop: 2 }}>
                  {lang === 'th' ? 'สิทธิ์ระดับเซิร์ฟเวอร์แบบ Full Access' : 'Server-Wide Soundstage HQ'}
                </div>
              </div>
              <span style={{ fontWeight: 800, fontSize: 15, color: '#FFF', letterSpacing: '-0.01em' }}>
                {guildData?.config?.price30Days ?? 29} {lang === 'th' ? 'บาท / 30 วัน' : 'THB / 30 Days'}
              </span>
            </div>

            <ul style={{ listStyle: 'none', fontSize: 12.5, color: '#FFF', display: 'flex', flexDirection: 'column', gap: 12, margin: 0, padding: 0 }}>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: 10, paddingBottom: 8, borderBottom: '1px solid rgba(0, 255, 135, 0.12)' }}>
                <ShieldCheck size={16} style={{ color: 'var(--slime-green)', flexShrink: 0, marginTop: 1 }} />
                <strong style={{ color: 'var(--slime-green)', fontSize: 13, lineHeight: 1.4 }}>
                  {lang === 'th' ? 'ปลดล็อกสิทธิ์ใช้งานร่วมกันทั้งเซิร์ฟเวอร์ (ไม่ต้องจ่ายรายคน)' : 'Unlocks perks for the entire server (No per-user fees)'}
                </strong>
              </li>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <Zap size={15} style={{ color: 'var(--slime-green)', flexShrink: 0, marginTop: 2 }} />
                <strong>{lang === 'th' ? 'คุณภาพเสียงคมชัดสูงพิเศษ (96 kbps Studio HQ)' : 'Pristine Opus 96k Studio HQ audio streaming'}</strong>
              </li>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <Music2 size={15} style={{ color: 'var(--slime-green)', flexShrink: 0, marginTop: 2 }} />
                <span>{lang === 'th' ? 'ช่องสัญญาณด่วนพิเศษ (Priority Slot) เปิดเพลงได้ทันที ไม่ต้องรอคิว' : 'Dedicated Priority Slot — instant playback, bypass wait queue'}</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <Clock size={15} style={{ color: 'var(--slime-green)', flexShrink: 0, marginTop: 2 }} />
                <span>{lang === 'th' ? 'ฟังเพลงและไลฟ์สดยาวได้ไม่จำกัดความยาว (เกิน 30 นาทีได้)' : 'Unlimited duration for full albums and live broadcasts'}</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <Award size={15} style={{ color: 'var(--slime-green)', flexShrink: 0, marginTop: 2 }} />
                <span>{lang === 'th' ? 'ขยายคิวเพลงสูงสุด 50 เพลง (เพลย์ลิสต์ครั้งละ 25 เพลง)' : 'Expanded queue up to 50 songs (25 songs per playlist)'}</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <Sparkles size={15} style={{ color: 'var(--slime-green)', flexShrink: 0, marginTop: 2 }} />
                <span>{lang === 'th' ? 'ระบบเล่นเพลงต่อเนื่องอัตโนมัติ (Autoplay) ปาร์ตี้ไม่มีสะดุด' : 'Intelligent continuous Autoplay stream continuation'}</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Short Terms of Service & Legal Disclaimer */}
      <div style={{
        padding: '20px 24px',
        borderRadius: 16,
        background: 'rgba(255, 255, 255, 0.02)',
        border: '1px solid var(--border-subtle)',
        color: 'var(--text-sub)',
        fontSize: 12,
        lineHeight: 1.65,
        marginBottom: 20
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 14,
          paddingBottom: 12,
          borderBottom: '1px solid var(--border-subtle)',
          flexWrap: 'wrap',
          gap: 12
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 13, color: '#FFF' }}>
            <FileText size={16} style={{ color: 'var(--slime-green)' }} />
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
            <ArrowRight size={13} />
          </button>
        </div>

        <ol style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 9, color: 'var(--text-dim)', fontSize: 11.5 }}>
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
          <li>
            <strong style={{ color: 'var(--text-sub)' }}>{lang === 'th' ? 'การปรับเปลี่ยนและบำรุงรักษาฟังก์ชัน:' : 'Feature Maintenance & Availability:'}</strong>{' '}
            {lang === 'th'
              ? 'ฟังก์ชันและตัวเลือกการประมวลผลเสียงเสริมต่าง ๆ (เช่น ระบบเล่นต่อเนื่อง หรือฟิลเตอร์เสียง) อาจถูกเปิด-ปิด ปรับปรุง หรือระงับชั่วคราวตามสถานะภาระเครื่องเซิร์ฟเวอร์และการเปลี่ยนแปลงของแพลตฟอร์มต้นทาง เพื่อรักษาเสถียรภาพการสตรีมเสียงของส่วนรวมเป็นหลัก'
              : 'Add-on audio features and processing options may undergo temporary maintenance, throttling, or toggling based on cluster hardware load and upstream platform changes to ensure overall streaming stability.'}
          </li>
        </ol>
      </div>

      {/* Full Terms of Service Modal Dialog */}
      {showTosModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 1000,
          background: 'rgba(5, 7, 11, 0.85)',
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
                <X size={16} />
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
                      ? 'ระบบคำนวณวันใช้งานตามสัดส่วนยอดเงินสนับสนุนจริง ตามอัตรามาตรฐานที่ระบุไว้บนหน้าเว็บไซต์ ณ ขณะทำรายการ หากทำรายการซ้ำก่อนวันหมดอายุ ระบบจะบวกทบเวลาต่อท้ายจากวันหมดอายุเดิมให้ตามจริงโดยไม่ตัดวันคงเหลือทิ้ง (จำกัดการสะสมวันใช้งานสูงสุดไม่เกิน 365 วันต่อเซิร์ฟเวอร์)'
                      : 'Durations calculate pro-rata based on actual contributions at the standard rate displayed on the web portal at the time of redemption. Consecutive contributions stack cumulatively from the current expiration date up to a 365-day safety ceiling.'}
                  </div>
                  <div>
                    <strong style={{ color: 'var(--cyber-pink)' }}>{lang === 'th' ? '• เงื่อนไขรหัสชวนเพื่อนและโค้ดกิจกรรม:' : '• Referral & Drop Codes:'}</strong>{' '}
                    {lang === 'th'
                      ? 'โบนัสวันใช้งานพิเศษสำหรับผู้ชวน จะทำงานเมื่อเซิร์ฟเวอร์ผู้ถูกชวนทำรายการสนับสนุนด้วยยอดเงินตามเกณฑ์ขั้นต่ำที่กำหนดในรอบซีซั่นนั้น ๆ และต้องอยู่ภายในระยะเวลาของแคมเปญ ส่วนโค้ดกิจกรรม (Early-Bird Drop) จำกัดสิทธิ์การใช้งาน 1 โค้ดต่อ 1 เซิร์ฟเวอร์และมีจำนวนจำกัดตามโควตาที่กำหนด'
                      : 'Referral bonus days trigger only when the referred server contributes the qualifying minimum amount set for that campaign season. Early-Bird Drop codes are single-use per server and strictly quota-governed.'}
                  </div>
                  <div>
                    <strong style={{ color: 'var(--cyber-pink)' }}>{lang === 'th' ? '• นโยบายไม่คืนเงิน (No Refund Policy):' : '• No Refund Policy:'}</strong>{' '}
                    {lang === 'th'
                      ? 'เมื่อระบบทำการรับซองของขวัญและอนุมัติวันใช้งานเข้าสู่ระบบสำเร็จแล้ว ไม่สามารถขอคืนเงิน ยกเลิก หรือแลกเปลี่ยนเป็นสิ่งอื่นได้ในทุกกรณี'
                      : 'Once a voucher is successfully redeemed and days are credited, all contributions are strictly non-refundable and irrevocable.'}
                  </div>
                  <div>
                    <strong style={{ color: 'var(--cyber-pink)' }}>{lang === 'th' ? '• ความพร้อมใช้งานและการปรับปรุงฟังก์ชัน (Feature Availability & Maintenance):' : '• Feature Availability & Maintenance:'}</strong>{' '}
                    {lang === 'th'
                      ? 'สิทธิประโยชน์ของผู้สนับสนุนเน้นการขยายขีดความสามารถหลัก ได้แก่ โควตาสตรีม คิวเพลง และสิทธิ์เข้าใช้งานช่องสัญญาณด่วน (Priority Slot) โดยฟังก์ชันเสริมเฉพาะทาง (เช่น Autoplay หรือตัวปรับแต่งเสียงขั้นสูง) อาจมีการปิดปรับปรุงชั่วคราว ปรับเปลี่ยน หรือจำกัดสิทธิ์ตามสถานการณ์ภาระเซิร์ฟเวอร์และการอัปเดตของ API ต้นทาง เพื่อรักษาความต่อเนื่องของสัญญาณเสียงส่วนรวมเป็นสำคัญ โดยไม่ถือเป็นการผิดข้อตกลงหรือเงื่อนไขการสนับสนุน'
                      : 'Supporter privileges primarily ensure elevated stream capacity, extended queues, and Priority Slot access. Add-on features (such as Autoplay or advanced audio filters) may be temporarily suspended or adjusted based on server load and upstream changes to guarantee collective audio stability, without constituting a breach of service terms.'}
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
