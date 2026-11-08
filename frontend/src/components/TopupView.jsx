import React, { useState, useEffect } from 'react';
import { 
  IconSparkles, IconCircleCheck, IconAlertCircle, IconGift, IconServer, IconShieldCheck, 
  IconClock, IconArrowRight, IconCopy, IconBolt, IconMusic, IconAward,
  IconFileText, IconX, IconCheck, IconHeadphones, IconVolume, IconLock,
  IconQrcode, IconBulb, IconUsers, IconFlame, IconHelp
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
  const [paymentTab, setPaymentTab] = useState('voucher'); // 'voucher' | 'promptpay'
  const [showTosModal, setShowTosModal] = useState(false);
  const [showVoucherGuideModal, setShowVoucherGuideModal] = useState(false);

  // Forms
  const [voucher, setVoucher] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [referrerName, setReferrerName] = useState('');
  const [submittingTopup, setSubmittingTopup] = useState(false);

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

  const copyReferralLink = () => {
    if (!guildData?.guild?.referralCode) return;
    const link = `${window.location.origin}/?ref=${guildData.guild.referralCode}`;
    navigator.clipboard.writeText(link);
    onToast('success', lang === 'th' ? 'คัดลอกลิงก์แล้ว' : 'Copied Link', link);
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

  const priceRate = guildData?.config?.price30Days ?? 29;

  return (
    <div style={{ maxWidth: 1080, margin: '24px auto', padding: '0 18px' }} className="fade-in">
      {/* MAIN WORKFLOW: 2-COLUMN COMMAND LAYOUT */}
      <div className="donate-grid-layout" style={{ marginBottom: 28 }}>
        
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

            {/* Guild ID Input Bar */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <input
                type="text"
                placeholder={lang === 'th' ? '809106810929807361' : 'Discord Server ID...'}
                value={guildId}
                onChange={(e) => setGuildId(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && verifyGuild()}
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  borderRadius: 10,
                  background: 'rgba(5, 7, 12, 0.75)',
                  border: '1px solid var(--border-light)',
                  color: '#FFFFFF',
                  fontSize: 13,
                  fontFamily: 'var(--font-mono)'
                }}
              />
              <button
                type="button"
                onClick={() => verifyGuild()}
                disabled={loadingGuild}
                style={{
                  padding: '0 20px',
                  borderRadius: 10,
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.16)',
                  color: '#FFFFFF',
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  whiteSpace: 'nowrap'
                }}
              >
                {loadingGuild ? '...' : (lang === 'th' ? 'ค้นหา' : 'Search')}
              </button>
            </div>

            {/* Verified Guild Status Plate */}
            {guildData?.guild ? (
              <div style={{
                background: 'rgba(5, 7, 12, 0.85)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 14,
                padding: '14px 16px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                    {guildData.guild.icon ? (
                      <img
                        src={guildData.guild.icon}
                        alt=""
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 10,
                          objectFit: 'cover',
                          border: '1px solid rgba(255, 255, 255, 0.12)'
                        }}
                      />
                    ) : (
                      <div style={{
                        width: 44,
                        height: 44,
                        borderRadius: 10,
                        background: 'rgba(0, 255, 135, 0.12)',
                        border: '1px solid rgba(0, 255, 135, 0.35)',
                        color: 'var(--slime-green)',
                        fontWeight: 800,
                        fontSize: 16,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        {guildData.guild.name ? guildData.guild.name.substring(0, 2).toUpperCase() : 'BN'}
                      </div>
                    )}
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{
                          fontWeight: 800,
                          fontSize: 14.5,
                          color: '#FFFFFF',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}>
                          {guildData.guild.name}
                        </span>
                        <IconCircleCheck size={15} style={{ color: 'var(--slime-green)', flexShrink: 0 }} />
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span>ID: {guildData.guild.id}</span>
                        <span>•</span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <IconUsers size={12} />
                          {guildData.guild.memberCount || 0} {lang === 'th' ? 'สมาชิก' : 'members'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 10.5, color: 'var(--text-dim)', marginBottom: 2 }}>
                      {lang === 'th' ? 'สถานะแพ็กเกจ' : 'Tier Status'}
                    </div>
                    <div style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: guildData.guild.isSupporter ? 'var(--slime-green)' : 'var(--text-sub)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 5,
                      justifyContent: 'flex-end'
                    }}>
                      <span style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: guildData.guild.isSupporter ? 'var(--slime-green)' : '#64748B',
                        display: 'inline-block'
                      }} />
                      <span>{guildData.guild.isSupporter ? 'Supporter (HQ Pass)' : 'Standard (Free)'}</span>
                    </div>
                  </div>
                </div>

                {/* Bottom Status Info Strip */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingTop: 12,
                  marginTop: 12,
                  borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                  fontSize: 11.5,
                  color: 'var(--text-sub)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <IconHeadphones size={14} style={{ color: 'var(--slime-green)' }} />
                    <span>{lang === 'th' ? 'สถานะบอท: พร้อมสตรีมเสียง HQ' : 'Bot Engine: Ready for HQ Audio'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-dim)' }}>
                    <IconVolume size={14} style={{ color: 'var(--cyan-freq)' }} />
                    <span>{guildData.guild.voiceChannel || (lang === 'th' ? 'ห้องฟังเพลง #1' : 'Audio Channel #1')}</span>
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
                fontSize: 11,
                fontWeight: 700,
                color: 'var(--text-sub)',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                padding: '3px 10px',
                borderRadius: 999,
                whiteSpace: 'nowrap'
              }}>
                {priceRate} {lang === 'th' ? 'บาท / 30 วัน' : 'THB / 30 Days'}
              </span>
            </div>

            {/* 2-Column Comparison Layout */}
            <div className="benefit-grid-columns">
              
              {/* Column A: Standard Free */}
              <div style={{
                background: 'rgba(5, 7, 12, 0.5)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                borderRadius: 12,
                padding: '14px 16px'
              }}>
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-sub)' }}>
                    {lang === 'th' ? 'ทั่วไป (Standard Free)' : 'Standard Free'}
                  </div>
                  <div style={{ fontSize: 10.5, color: 'var(--text-dim)', marginTop: 1 }}>
                    {lang === 'th' ? 'หรือบอทฟรี' : 'Baseline Bot'}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 11.5 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-sub)' }}>
                    <IconCheck size={14} style={{ color: 'var(--slime-green)', flexShrink: 0 }} />
                    <span>{lang === 'th' ? 'คุณภาพเสียงมาตรฐาน 64 kbps' : 'Standard 64 kbps audio'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-sub)' }}>
                    <IconCheck size={14} style={{ color: 'var(--slime-green)', flexShrink: 0 }} />
                    <span>{lang === 'th' ? 'คิวเพลงสูงสุด 10 เพลง' : 'Max 10 songs in queue'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-dim)' }}>
                    <IconX size={14} style={{ color: '#EF4444', flexShrink: 0 }} />
                    <span>{lang === 'th' ? 'จำกัดความยาว 30 นาที/เพลง' : 'Track capped at 30 mins'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-dim)' }}>
                    <IconX size={14} style={{ color: '#EF4444', flexShrink: 0 }} />
                    <span>{lang === 'th' ? 'แชร์ช่องสัญญาณ (หากเต็มต้องรอคิว)' : 'Shared stream slot queue'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-dim)' }}>
                    <IconX size={14} style={{ color: '#EF4444', flexShrink: 0 }} />
                    <span>{lang === 'th' ? 'ไม่มีระบบเล่นเพลงต่อเนื่อง (Autoplay)' : 'No continuous Autoplay'}</span>
                  </div>
                </div>
              </div>

              {/* Column B: Supporter HQ Pass (Highlighted) */}
              <div style={{
                background: 'rgba(0, 255, 135, 0.03)',
                border: '1px solid rgba(0, 255, 135, 0.35)',
                borderRadius: 12,
                padding: '14px 16px',
                position: 'relative'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--slime-green)' }}>
                    SUPPORTER (HQ PASS)
                  </div>
                  <span style={{
                    fontSize: 9.5,
                    fontWeight: 800,
                    color: 'var(--slime-green)',
                    background: 'rgba(0, 255, 135, 0.1)',
                    border: '1px solid rgba(0, 255, 135, 0.3)',
                    padding: '2px 7px',
                    borderRadius: 6,
                    letterSpacing: '0.04em'
                  }}>
                    RECOMMENDED
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 11.5 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#E2E8F0', fontWeight: 600 }}>
                    <IconCheck size={14} style={{ color: 'var(--slime-green)', flexShrink: 0 }} />
                    <span>{lang === 'th' ? 'ปลดล็อกทั้งเซิร์ฟเวอร์ (ไม่ต้องจ่ายรายคน)' : 'Unlocks for whole server'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#E2E8F0' }}>
                    <IconCheck size={14} style={{ color: 'var(--slime-green)', flexShrink: 0 }} />
                    <span>{lang === 'th' ? 'คุณภาพเสียงสูงสุด 96 kbps Studio HQ' : '96 kbps Studio HQ sound'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#E2E8F0' }}>
                    <IconCheck size={14} style={{ color: 'var(--slime-green)', flexShrink: 0 }} />
                    <span>{lang === 'th' ? 'Priority Fast Slot เปิดเพลงได้ทันที' : 'Priority Slot: instant access'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#E2E8F0' }}>
                    <IconCheck size={14} style={{ color: 'var(--slime-green)', flexShrink: 0 }} />
                    <span>{lang === 'th' ? 'ไม่จำกัดความยาวเพลง (เกิน 30 นาทีได้)' : 'No track length limit'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#E2E8F0' }}>
                    <IconCheck size={14} style={{ color: 'var(--slime-green)', flexShrink: 0 }} />
                    <span>{lang === 'th' ? 'ขยายคิวเพลงสูงสุด 50 เพลง' : 'Expand queue to 50 songs'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#E2E8F0' }}>
                    <IconCheck size={14} style={{ color: 'var(--slime-green)', flexShrink: 0 }} />
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
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div className="terminal-badge">2</div>
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 800, color: '#FFFFFF', margin: 0, letterSpacing: '-0.01em' }}>
                  {lang === 'th' ? 'ทำรายการสนับสนุน' : 'Checkout Terminal'}
                </h2>
                <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>
                  Checkout Terminal
                </div>
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{
                fontSize: 24,
                fontWeight: 800,
                color: 'var(--slime-green)',
                fontFamily: 'var(--font-mono)',
                lineHeight: 1
              }}>
                ฿{priceRate}
              </div>
              <div style={{ fontSize: 10.5, color: 'var(--text-dim)', marginTop: 3 }}>
                {lang === 'th' ? '/ 30 วัน (Auto)' : '/ 30 Days (Auto)'}
              </div>
            </div>
          </div>

          {/* Payment Method Selector Tabs */}
          <div style={{
            display: 'flex',
            gap: 6,
            background: 'rgba(5, 7, 12, 0.75)',
            padding: 4,
            borderRadius: 10,
            border: '1px solid rgba(255, 255, 255, 0.08)',
            marginBottom: 20
          }}>
            <button
              type="button"
              onClick={() => setPaymentTab('voucher')}
              style={{
                flex: 1,
                padding: '8px 14px',
                borderRadius: 8,
                border: 'none',
                background: paymentTab === 'voucher' ? 'var(--slime-green)' : 'transparent',
                color: paymentTab === 'voucher' ? '#05070B' : 'var(--text-sub)',
                fontWeight: paymentTab === 'voucher' ? 700 : 500,
                fontSize: 12.5,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 7,
                transition: 'all 0.15s ease'
              }}
            >
              <IconTrueMoneyVoucher size={16} stroke={2} />
              <span>{lang === 'th' ? 'ซอง TrueMoney' : 'TrueMoney'}</span>
            </button>

            <button
              type="button"
              onClick={() => setPaymentTab('promptpay')}
              style={{
                flex: 1,
                padding: '8px 14px',
                borderRadius: 8,
                border: 'none',
                background: paymentTab === 'promptpay' ? 'var(--slime-green)' : 'transparent',
                color: paymentTab === 'promptpay' ? '#05070B' : 'var(--text-sub)',
                fontWeight: paymentTab === 'promptpay' ? 700 : 500,
                fontSize: 12.5,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 7,
                transition: 'all 0.15s ease'
              }}
            >
              <IconQrcode size={16} />
              <span>PromptPay QR</span>
            </button>
          </div>

          {/* Form Content */}
          {paymentTab === 'voucher' ? (
            <form onSubmit={handleTopup} style={{ display: 'flex', flexDirection: 'column' }}>
              
              {/* Voucher URL Input */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-sub)' }}>
                    {lang === 'th' ? 'ลิงก์ซองของขวัญ TrueMoney' : 'TrueMoney Voucher Link'} <span style={{ color: '#EF4444' }}>*</span>
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
                  placeholder="https://gift.truemoney.com/campaign/?v=..."
                  value={voucher}
                  onChange={(e) => setVoucher(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '11px 14px',
                    borderRadius: 10,
                    background: 'rgba(5, 7, 12, 0.8)',
                    border: '1px solid var(--border-light)',
                    color: '#FFFFFF',
                    fontSize: 12.5
                  }}
                  required
                />

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 11,
                  color: 'var(--amber-warn)',
                  marginTop: 6
                }}>
                  <IconBulb size={13} style={{ flexShrink: 0 }} />
                  <span>
                    {lang === 'th'
                      ? `กำหนดจำนวนเงิน ${priceRate} บาท สุ่มหรือแบ่งเท่ากัน 1 คน ในแอป TrueMoney`
                      : `Set amount to ${priceRate} THB, 1 recipient in TrueMoney app`}
                  </span>
                </div>
              </div>

              {/* Referral Code Input */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-sub)', marginBottom: 6 }}>
                  {lang === 'th' ? 'รหัสแนะนำเพื่อน (Referral Code - ถ้ามี)' : 'Referral Code (Optional)'}
                </label>
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
                    style={{
                      flex: 1,
                      padding: '10px 14px',
                      borderRadius: 10,
                      background: 'rgba(5, 7, 12, 0.8)',
                      border: '1px solid var(--border-light)',
                      color: '#FFFFFF',
                      fontSize: 12.5,
                      fontFamily: 'var(--font-mono)',
                      letterSpacing: '0.04em'
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleApplyReferral}
                    style={{
                      padding: '0 16px',
                      borderRadius: 10,
                      background: 'rgba(255, 255, 255, 0.08)',
                      border: '1px solid rgba(255, 255, 255, 0.16)',
                      color: '#FFFFFF',
                      fontWeight: 600,
                      fontSize: 12.5,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {lang === 'th' ? 'ใช้โค้ด' : 'Apply'}
                  </button>
                </div>

                {referrerName && (
                  <div style={{ fontSize: 11.5, color: 'var(--slime-green)', marginTop: 6, display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
                    <IconCircleCheck size={13} />
                    <span>{lang === 'th' ? `ผู้แนะนำ: เซิร์ฟเวอร์ ${referrerName} (+30 วันเมื่อเติมเงิน)` : `Referrer: ${referrerName}`}</span>
                  </div>
                )}
              </div>

              {/* Price Breakdown Summary */}
              <div style={{
                paddingTop: 16,
                borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                marginBottom: 18
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-sub)', marginBottom: 7 }}>
                  <span>{lang === 'th' ? 'แพ็กเกจ Supporter Pass (30 วัน)' : 'Supporter Pass (30 Days)'}</span>
                  <span style={{ color: '#FFFFFF', fontFamily: 'var(--font-mono)' }}>฿{priceRate}.00</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-sub)', marginBottom: 12 }}>
                  <span>{lang === 'th' ? 'ค่าธรรมเนียมเกตเวย์' : 'Gateway Processing Fee'}</span>
                  <span style={{ color: 'var(--slime-green)' }}>{lang === 'th' ? 'ฟรี (฿0.00)' : 'Free (฿0.00)'}</span>
                </div>

                <div style={{ height: 1, background: 'rgba(255, 255, 255, 0.08)', marginBottom: 12 }} />

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 14.5, fontWeight: 700, color: '#FFFFFF' }}>
                    {lang === 'th' ? 'ยอดชำระสุทธิ' : 'Total Amount'}
                  </span>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{
                      fontSize: 20,
                      fontWeight: 800,
                      color: 'var(--slime-green)',
                      fontFamily: 'var(--font-mono)',
                      lineHeight: 1
                    }}>
                      ฿{priceRate}.00
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 3 }}>
                      {lang === 'th' ? 'รวมภาษีมูลค่าเพิ่มแล้ว' : 'VAT Included'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Confirm Support Button */}
              <button
                type="submit"
                disabled={submittingTopup}
                style={{
                  width: '100%',
                  padding: '13px 18px',
                  borderRadius: 12,
                  background: 'var(--slime-green)',
                  color: '#05070B',
                  border: 'none',
                  fontWeight: 800,
                  fontSize: 13.5,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  transition: 'all 0.15s ease',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.4)'
                }}
              >
                {submittingTopup ? (
                  <span>{lang === 'th' ? 'กำลังตรวจสอบยอดและทำรายการ...' : 'Processing Transaction...'}</span>
                ) : (
                  <>
                    <IconLock size={17} stroke={2.2} />
                    <span>
                      {lang === 'th'
                        ? `ยืนยันการสนับสนุน ฿${priceRate} (เปิดใช้งานทันที)`
                        : `Confirm Support ฿${priceRate} (Instant Unlock)`}
                    </span>
                  </>
                )}
              </button>
            </form>
          ) : (
            /* PromptPay QR Interface / Notice */
            <div style={{
              background: 'rgba(5, 7, 12, 0.6)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: 14,
              padding: '28px 20px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 12
            }}>
              <div style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: 'rgba(0, 229, 255, 0.1)',
                border: '1px solid rgba(0, 229, 255, 0.28)',
                color: 'var(--cyan-freq)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <IconQrcode size={26} />
              </div>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#FFFFFF' }}>
                {lang === 'th' ? 'ระบบ PromptPay QR Gateway' : 'PromptPay QR Gateway'}
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-sub)', maxWidth: 300, margin: 0, lineHeight: 1.55 }}>
                {lang === 'th'
                  ? 'ช่องทาง PromptPay QR อัตโนมัติกำลังเตรียมเปิดให้บริการ กรุณาใช้ช่องทาง "ซอง TrueMoney" เพื่อรับสิทธิ์ทันทีใน 5 วินาที'
                  : 'PromptPay QR is currently under scheduled deployment. Please use TrueMoney Voucher for instant automated unlock.'}
              </p>
              <button
                type="button"
                onClick={() => setPaymentTab('voucher')}
                style={{
                  marginTop: 6,
                  padding: '9px 18px',
                  borderRadius: 10,
                  background: 'var(--slime-green)',
                  color: '#05070B',
                  border: 'none',
                  fontWeight: 700,
                  fontSize: 12.5,
                  cursor: 'pointer'
                }}
              >
                {lang === 'th' ? 'กลับไปที่ซอง TrueMoney' : 'Switch to TrueMoney'}
              </button>
            </div>
          )}

          {/* Security & Automation Badges */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: 16,
            marginTop: 18,
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

      {/* FOOTER: TERMS OF SERVICE SUMMARY STRIP */}
      <div style={{
        padding: '16px 20px',
        borderRadius: 14,
        background: 'rgba(255, 255, 255, 0.02)',
        border: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12,
        fontSize: 11.5,
        color: 'var(--text-dim)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <IconFileText size={15} style={{ color: 'var(--slime-green)' }} />
          <span>{lang === 'th' ? 'การสนับสนุนเซิร์ฟเวอร์ผูกตาม Guild ID • บอททำหน้าที่เป็นตัวกลางส่งผ่านเสียงชั่วคราว (Data Forwarder)' : 'Server contribution bound to Guild ID • Transient audio forwarder'}</span>
        </div>
        <button
          type="button"
          onClick={() => setShowTosModal(true)}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--slime-green)',
            fontSize: 11.5,
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 4
          }}
        >
          <span>{lang === 'th' ? 'ข้อกำหนดการใช้งานฉบับเต็ม' : 'Read Full Terms'}</span>
          <IconArrowRight size={13} />
        </button>
      </div>

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

      {/* MODAL 2: FULL TERMS OF SERVICE */}
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
            boxShadow: '0 24px 48px rgba(0, 0, 0, 0.85)',
            overflow: 'hidden'
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '20px 26px',
              borderBottom: '1px solid var(--border-subtle)'
            }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 16, color: '#FFFFFF' }}>
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
                  cursor: 'pointer'
                }}
              >
                <IconX size={16} />
              </button>
            </div>

            <div style={{
              padding: '24px 26px',
              overflowY: 'auto',
              fontSize: 12.5,
              lineHeight: 1.7,
              color: 'var(--text-sub)',
              display: 'flex',
              flexDirection: 'column',
              gap: 18
            }}>
              <div>
                <strong style={{ color: 'var(--slime-green)' }}>{lang === 'th' ? '1. การส่งผ่านข้อมูลชั่วคราว:' : '1. Transient Forwarding:'}</strong>{' '}
                {lang === 'th'
                  ? 'ระบบทำงานเป็นตัวกลางส่งผ่านสัญญาณเสียงชั่วคราว (Data Forwarder) ไปยัง Discord โดยตรง ไม่มีการเก็บบันทึกไฟล์สื่อถาวรไว้บนเซิร์ฟเวอร์'
                  : 'The system functions solely as a transient audio forwarder without hosting or saving media files.'}
              </div>
              <div>
                <strong style={{ color: 'var(--slime-green)' }}>{lang === 'th' ? '2. สิทธิ์ผู้สนับสนุน:' : '2. Supporter Tier:'}</strong>{' '}
                {lang === 'th'
                  ? 'การร่วมสนับสนุนผ่านซอง TrueMoney เป็นการสนับสนุนค่าบำรุงรักษาระบบเซิร์ฟเวอร์โดยสมัครใจ ผูกสิทธิ์ตาม Guild ID ไม่สามารถขอคืนเงินหรือโอนสิทธิ์ข้ามเซิร์ฟเวอร์ได้'
                  : 'TrueMoney contributions support server maintenance and bind to target Guild ID. Strictly non-refundable.'}
              </div>
              <div>
                <strong style={{ color: 'var(--slime-green)' }}>{lang === 'th' ? '3. ความเสถียรของระบบ:' : '3. Service Reliability:'}</strong>{' '}
                {lang === 'th'
                  ? 'ให้บริการตามสภาพจริง (As-Is) เพื่อเสถียรภาพของส่วนรวม ระบบอาจมีการตัดสายเมื่อไม่มีผู้ฟังในห้องเสียง หรือปิดบำรุงรักษาชั่วคราวตามความจำเป็น'
                  : 'Provided on an As-Is basis. Empty channels may auto-disconnect to optimize resource allocation.'}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
