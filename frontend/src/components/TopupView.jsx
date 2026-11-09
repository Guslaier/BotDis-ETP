import React, { useState, useEffect } from 'react';
import { 
  IconSparkles, IconCircleCheck, IconAlertCircle, IconGift, IconServer, IconShieldCheck, 
  IconClock, IconArrowRight, IconCopy, IconBolt, IconMusic, IconAward,
  IconFileText, IconX, IconCheck, IconHeadphones, IconLock,
  IconBulb, IconUsers, IconFlame, IconHelp, IconSearch, IconChevronDown, IconChevronUp,
  IconQrcode, IconUpload, IconReceipt2, IconClipboard, IconExternalLink
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
  const [guildError, setGuildError] = useState(null);
  const [botInviteUrl, setBotInviteUrl] = useState('https://discord.com/oauth2/authorize?client_id=1525402020096249856&permissions=8&scope=bot%20applications.commands');
  const [loadingGuild, setLoadingGuild] = useState(false);
  const [formTab, setFormTab] = useState('voucher'); // 'voucher' | 'promo'
  const [showTosModal, setShowTosModal] = useState(false);
  const [showVoucherGuideModal, setShowVoucherGuideModal] = useState(false);
  const [openAccordion, setOpenAccordion] = useState(null);

  // Forms & PromptPay SlipOK
  const [voucher, setVoucher] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [referrerName, setReferrerName] = useState('');
  const [promoCode, setPromoCode] = useState('');
  const [submittingTopup, setSubmittingTopup] = useState(false);
  const [submittingPromo, setSubmittingPromo] = useState(false);

  const [promptpayData, setPromptpayData] = useState(null);
  const [loadingQr, setLoadingQr] = useState(false);
  const [slipFile, setSlipFile] = useState(null);
  const [slipPreview, setSlipPreview] = useState('');
  const [submittingSlip, setSubmittingSlip] = useState(false);

  const fetchPromptPayQr = async (amount = 29) => {
    setLoadingQr(true);
    try {
      const res = await fetch(`/api/public/promptpay-qr?amount=${amount}`);
      const data = await res.json();
      if (data.success) {
        setPromptpayData(data);
      }
    } catch (err) {
      console.error('Failed to load PromptPay QR:', err);
    } finally {
      setLoadingQr(false);
    }
  };

  const remainingDays = (guildData?.guild?.isSupporter && guildData?.guild?.expiresAt && guildData.guild.expiresAt > Date.now())
    ? Math.ceil((guildData.guild.expiresAt - Date.now()) / (24 * 3600 * 1000))
    : (guildData?.guild?.remainingDays || 0);

  const isAdvanceLocked = Boolean(remainingDays > 60 || guildData?.guild?.isAdvanceLocked);
  const isMaxStacked = isAdvanceLocked;

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
    fetchPromptPayQr(29);
  }, []);

  const verifyGuild = async (targetGuildId = guildId, targetUserId = userId) => {
    if (!targetGuildId.trim()) return;
    setLoadingGuild(true);
    try {
      const res = await fetch(`/api/public/verify-guild?guildId=${encodeURIComponent(targetGuildId.trim())}&userId=${encodeURIComponent(targetUserId.trim())}`);
      const data = await res.json();
      if (data.success) {
        setGuildData(data);
        setGuildError(null);
        if (data.inviteUrl) setBotInviteUrl(data.inviteUrl);
      } else {
        setGuildData(null);
        setGuildError(data.error || 'NOT_FOUND');
        if (data.inviteUrl) setBotInviteUrl(data.inviteUrl);
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

  const handleSlipChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      onToast('warning', lang === 'th' ? 'กรุณาเลือกไฟล์รูปภาพ' : 'Image files only', lang === 'th' ? 'รองรับ JPG, PNG' : 'JPG or PNG supported');
      return;
    }
    setSlipFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      setSlipPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleVerifySlip = async (e) => {
    if (e) e.preventDefault();
    if (isAdvanceLocked) {
      onToast(
        'warning',
        lang === 'th' ? 'จำกัดการเติมล่วงหน้า' : 'Advance Top-up Locked',
        lang === 'th'
          ? `เซิร์ฟเวอร์นี้มีวันใช้งานคงเหลือเกิน 60 วันแล้ว (เหลือ ${remainingDays} วัน) จะสามารถเติมรอบใหม่ได้เมื่อวันคงเหลือต่ำกว่า 60 วัน`
          : `This server has more than 60 days remaining (${remainingDays} days left). You will be able to top up when remaining days are below 60 days.`
      );
      return;
    }
    if (!guildId.trim()) {
      onToast('warning', lang === 'th' ? 'กรุณาระบุ Guild ID' : 'Missing Guild ID', lang === 'th' ? 'เลือกหรือกรอกไอดีเซิร์ฟเวอร์ก่อนครับ' : 'Provide Guild ID first');
      return;
    }
    if (!slipPreview) {
      onToast('warning', lang === 'th' ? 'กรุณาแนบรูปสลิป' : 'Missing Slip Image', lang === 'th' ? 'กรุณาเลือกรูปสลิปธนาคารที่มี QR Code ชัดเจนครับ' : 'Attach payslip image with QR');
      return;
    }

    setSubmittingSlip(true);
    try {
      const res = await fetch('/api/public/verify-slip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guildId: guildId.trim(),
          userId: userId.trim(),
          slipImage: slipPreview,
          referralCode: referralCode.trim()
        })
      });
      const data = await res.json();
      if (data.success) {
        onToast('success', lang === 'th' ? 'ตรวจสอบสลิปสำเร็จ!' : 'Slip Verified!', lang === 'th' ? `ปลดล็อกผู้สนับสนุน +${data.addedDays} วัน (ยอด ${data.amount} บาท โดย ${data.senderName})` : `Added +${data.addedDays} Supporter days (${data.amount} THB)`);
        setSlipFile(null);
        setSlipPreview('');
        verifyGuild(guildId, userId);
      } else {
        onToast('error', lang === 'th' ? 'ตรวจสอบสลิปไม่สำเร็จ' : 'Verification Failed', data.error || 'Invalid slip');
      }
    } catch (err) {
      onToast('error', 'Error', err.message);
    } finally {
      setSubmittingSlip(false);
    }
  };

  const handleTopup = async (e) => {
    if (e) e.preventDefault();
    if (isAdvanceLocked) {
      onToast(
        'warning',
        lang === 'th' ? 'จำกัดการเติมล่วงหน้า' : 'Advance Top-up Locked',
        lang === 'th'
          ? `เซิร์ฟเวอร์นี้มีวันใช้งานคงเหลือเกิน 60 วันแล้ว (เหลือ ${remainingDays} วัน) จะสามารถเติมรอบใหม่ได้เมื่อวันคงเหลือต่ำกว่า 60 วัน`
          : `This server has more than 60 days remaining (${remainingDays} days left). You will be able to top up when remaining days are below 60 days.`
      );
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
        if (data.cyclesUnlocked > 0) {
          const remText = data.currentBalance > 0
            ? (lang === 'th' ? ` (คงเหลือเศษสะสม ${data.currentBalance} บาทรอบหน้า)` : ` (${data.currentBalance} THB carried forward)`)
            : '';
          onToast(
            'success',
            lang === 'th' ? 'ปลดล็อกสถานะสำเร็จ!' : 'Supporter Unlocked!',
            lang === 'th'
              ? `ปลดล็อกวันผู้สนับสนุน +${data.addedDays} วัน (ยอด ${data.amount} บาท)${remText}`
              : `Added +${data.addedDays} Supporter days (${data.amount} THB)${remText}`
          );
        } else {
          onToast(
            'info',
            lang === 'th' ? 'สะสมยอดสำเร็จ!' : 'Deposit Accumulated!',
            lang === 'th'
              ? `สะสมแล้ว ${data.currentBalance}/29 บาท (ขาดอีก ${data.neededBaht} บาท เพื่อปลดล็อก 30 วัน)`
              : `Progress: ${data.currentBalance}/29 THB (needs ${data.neededBaht} THB more for 30 days)`
          );
        }
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
            gap: 7,
            padding: '5px 16px',
            borderRadius: 999,
            background: 'rgba(0, 255, 135, 0.12)',
            border: '1px solid rgba(0, 255, 135, 0.45)',
            color: '#00FF88',
            fontSize: 12,
            fontWeight: 800,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            marginBottom: 16,
            boxShadow: '0 0 16px rgba(0, 255, 135, 0.15)'
          }}>
            <IconBolt size={14} stroke={2.2} />
            <span>{lang === 'th' ? '✦ GOOLIX สตรีมเสียงระดับ HQ' : '✦ GOOLIX High-Fidelity Audio Core'}</span>
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
            color: '#F1F5F9',
            fontSize: 'clamp(14px, 2vw, 15.5px)',
            fontWeight: 500,
            lineHeight: 1.65,
            letterSpacing: '-0.01em'
          }}>
            {lang === 'th'
              ? 'สมาชิกทุกคนในห้องเสียงฟังเสียงคุณภาพสูงทันที ฟังเพลงคุณภาพสูงต่อเนื่องยาวนาน เพียงร่วมสนับสนุนค่าบริการเซิร์ฟเวอร์'
              : 'Instant high-quality audio for everyone in your voice channel with continuous high-fidelity listening, simply by supporting server infrastructure.'}
          </p>

          {/* Understated Feature Strip */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            flexWrap: 'wrap',
            fontSize: 12,
            color: '#E2E8F0',
            padding: '7px 20px',
            borderRadius: 999,
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.12)'
          }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <IconHeadphones size={13} stroke={2} style={{ color: '#00FF88' }} />
              <span style={{ fontWeight: 600, color: '#FFFFFF' }}>96 kbps HQ</span>
            </div>
            <span style={{ color: 'rgba(255, 255, 255, 0.25)' }}>•</span>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <IconBolt size={13} stroke={2} style={{ color: '#00FF88' }} />
              <span style={{ fontWeight: 600, color: '#FFFFFF' }}>Priority Fast Slot</span>
            </div>
            <span style={{ color: 'rgba(255, 255, 255, 0.25)' }}>•</span>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <IconClock size={13} stroke={2} style={{ color: '#00FF88' }} />
              <span style={{ fontWeight: 600, color: '#FFFFFF' }}>Extended Playback</span>
            </div>
            <span style={{ color: 'rgba(255, 255, 255, 0.25)' }}>•</span>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <IconMusic size={13} stroke={2} style={{ color: '#00FF88' }} />
              <span style={{ fontWeight: 600, color: '#FFFFFF' }}>50-Track Queue</span>
            </div>
            <span style={{ color: 'rgba(255, 255, 255, 0.25)' }}>•</span>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <IconSparkles size={13} stroke={2} style={{ color: '#00FF88' }} />
              <span style={{ fontWeight: 600, color: '#FFFFFF' }}>Smart Autoplay</span>
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
                onChange={(e) => {
                  setGuildId(e.target.value.trim());
                  if (guildError) setGuildError(null);
                }}
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  borderRadius: 10,
                  background: 'rgba(5, 7, 12, 0.75)',
                  border: '1px solid ' + (guildError ? 'rgba(239, 68, 68, 0.5)' : 'var(--border-light)'),
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

            {/* Verified Guild Status Plate or Error State */}
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

                {/* Status Pill Plate */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  borderRadius: 10,
                  background: guildData.guild.isSupporter ? 'rgba(0, 255, 135, 0.08)' : 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid ' + (guildData.guild.isSupporter ? 'rgba(0, 255, 135, 0.28)' : 'var(--border-subtle)')
                }}>
                  <span style={{ fontSize: 13, color: 'var(--text-sub)', whiteSpace: 'nowrap' }}>
                    {lang === 'th' ? 'สถานะ:' : 'Status:'}
                  </span>
                  <span style={{
                    fontWeight: 800,
                    fontSize: 13,
                    letterSpacing: '0.04em',
                    color: guildData.guild.isSupporter ? 'var(--slime-green)' : 'var(--text-dim)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    whiteSpace: 'nowrap'
                  }}>
                    {guildData.guild.isSupporter ? <IconShieldCheck size={16} /> : null}
                    {guildData.guild.isSupporter ? 'SUPPORTER' : (lang === 'th' ? 'ทั่วไป (STANDARD)' : 'STANDARD')}
                  </span>
                </div>
              </div>
            ) : guildError ? (
              <div style={{
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.35)',
                borderRadius: 14,
                padding: '20px 18px',
                textAlign: 'center',
                color: '#FCA5A5',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 10
              }}>
                <div style={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#EF4444'
                }}>
                  <IconAlertCircle size={24} />
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 14, color: '#FFFFFF', marginBottom: 4 }}>
                    {lang === 'th' ? 'ไม่พบบอท GOOLIX ในเซิร์ฟเวอร์นี้' : 'GOOLIX Bot Not Found'}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-sub)', lineHeight: 1.5, maxWidth: 360, margin: '0 auto' }}>
                    {lang === 'th'
                      ? 'ไม่พบบอทในเซิร์ฟเวอร์ ID นี้ กรุณาตรวจสอบ ID ให้ถูกต้อง หรือเชิญบอท GOOLIX เข้าเซิร์ฟเวอร์ก่อนเติมเงิน'
                      : 'Bot is not in this server. Please check the Guild ID or invite GOOLIX to your server before top-up.'}
                  </div>
                </div>
                <a
                  href={botInviteUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    marginTop: 4,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 7,
                    padding: '9px 18px',
                    borderRadius: 10,
                    background: '#5865F2',
                    color: '#FFFFFF',
                    fontSize: 12.5,
                    fontWeight: 700,
                    textDecoration: 'none',
                    boxShadow: '0 4px 12px rgba(88, 101, 242, 0.4)',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <IconExternalLink size={15} />
                  <span>{lang === 'th' ? 'เชิญบอทเข้าเซิร์ฟเวอร์ (Invite Bot)' : 'Invite GOOLIX Bot'}</span>
                </a>
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#CBD5E1' }}>
                    <IconCheck size={15} style={{ color: 'var(--slime-green)', flexShrink: 0 }} />
                    <span>{lang === 'th' ? 'ใส่เพลย์ลิสต์ ครั้งละ 5 เพลง' : 'Add up to 5 songs per playlist'}</span>
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
                    <span>{lang === 'th' ? 'เล่นเพลงและคลิปขนาดยาวได้ (เกิน 30 นาที)' : 'Extended track playback (> 30 min)'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#F8FAFC' }}>
                    <IconCheck size={15} style={{ color: 'var(--slime-green)', flexShrink: 0 }} />
                    <span>{lang === 'th' ? 'ขยายคิวเพลงสูงสุด 50 เพลง' : 'Expand queue to 50 songs'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#F8FAFC' }}>
                    <IconCheck size={15} style={{ color: 'var(--slime-green)', flexShrink: 0 }} />
                    <span>{lang === 'th' ? 'ใส่เพลย์ลิสต์ ครั้งละ 25 เพลง' : 'Add up to 25 songs per playlist'}</span>
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
                {lang === 'th' ? 'ร่วมสมทบทุนค่าเซิร์ฟเวอร์ (Infrastructure Donation)' : 'Infrastructure Donation'}
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
            {lang === 'th' ? 'ร่วมสมทบทุนค่าใช้จ่ายด้านเซิร์ฟเวอร์เพื่อรับสิทธิ์ Priority Slot และสถานะ SUPPORTER (ไม่คืนเงินทุกกรณี)' : 'Contribute to server costs for Priority Slot & SUPPORTER status (Non-refundable)'}
          </p>

          {/* Segmented Form Tabs: TrueMoney Voucher | Promo Drop */}
          <div style={{
            display: 'flex',
            gap: 8,
            background: 'rgba(255, 255, 255, 0.04)',
            padding: 3,
            borderRadius: 10,
            border: '1px solid var(--border-subtle)',
            marginBottom: 18
          }}>
            <button
              type="button"
              onClick={() => setFormTab('voucher')}
              style={{
                flex: 1,
                padding: '9px 12px',
                borderRadius: 8,
                border: formTab === 'voucher' ? '1px solid rgba(0, 255, 135, 0.35)' : '1px solid transparent',
                background: formTab === 'voucher' ? 'rgba(0, 255, 135, 0.12)' : 'transparent',
                color: formTab === 'voucher' ? 'var(--slime-green)' : 'var(--text-sub)',
                fontWeight: formTab === 'voucher' ? 700 : 500,
                fontSize: 12.5,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 7,
                boxShadow: formTab === 'voucher' ? '0 2px 8px rgba(0, 255, 135, 0.2)' : 'none'
              }}
            >
              <IconTrueMoneyVoucher size={16} stroke={1.8} />
              <span>{lang === 'th' ? 'ซอง TrueMoney (สะสม 29 บาท/เดือน)' : 'TrueMoney Voucher (29 THB/Mo)'}</span>
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
                fontSize: 12.5,
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
              <span>{lang === 'th' ? 'โค้ดกิจกรรม (Promo Drop)' : 'Promo Drop'}</span>
            </button>
          </div>

          {/* Form Content */}
          {formTab === 'voucher' ? (
            <form onSubmit={handleTopup} style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
              
              {/* Supporter Accumulation Pot (หลอดสะสมเศษซอง 29 บาท/เดือน) */}
              {(() => {
                const potBalance = guildData?.guild?.balanceBaht || 0;
                const potNeeded = Math.max(0, 29 - potBalance);
                const potPercent = Math.min(100, Math.round((potBalance / 29) * 100));
                return (
                  <div style={{
                    marginBottom: 14,
                    padding: '13px 15px',
                    borderRadius: 12,
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid ' + (potBalance > 0 ? 'rgba(0, 255, 135, 0.3)' : 'rgba(255, 255, 255, 0.08)'),
                    position: 'relative'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 9 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <IconFlame size={15} style={{ color: 'var(--slime-green)' }} />
                        <span style={{ fontSize: 12.5, fontWeight: 700, color: '#FFFFFF' }}>
                          {lang === 'th' ? 'หลอดสะสมยอดสนับสนุน (29 บาท = 30 วัน)' : 'Supporter Accumulation Pot (29 THB = 30 Days)'}
                        </span>
                      </div>
                      <div style={{
                        fontSize: 11.5,
                        fontWeight: 800,
                        color: potBalance > 0 ? 'var(--slime-green)' : 'var(--text-dim)',
                        background: potBalance > 0 ? 'rgba(0, 255, 135, 0.12)' : 'rgba(255, 255, 255, 0.05)',
                        padding: '2px 8px',
                        borderRadius: 6,
                        border: '1px solid ' + (potBalance > 0 ? 'rgba(0, 255, 135, 0.3)' : 'rgba(255, 255, 255, 0.08)')
                      }}>
                        {potBalance} / 29 {lang === 'th' ? 'บาท' : 'THB'}
                      </div>
                    </div>

                    {/* Progress Bar Track */}
                    <div style={{
                      height: 9,
                      width: '100%',
                      borderRadius: 999,
                      background: 'rgba(255, 255, 255, 0.08)',
                      overflow: 'hidden',
                      position: 'relative'
                    }}>
                      <div style={{
                        height: '100%',
                        width: `${potPercent}%`,
                        background: 'linear-gradient(90deg, #00FF87, #60EFFF)',
                        borderRadius: 999,
                        transition: 'width 0.4s ease',
                        boxShadow: potBalance > 0 ? '0 0 10px rgba(0, 255, 135, 0.5)' : 'none'
                      }} />
                    </div>

                    {/* Status Pill / Caption */}
                    <div style={{
                      fontSize: 11.5,
                      marginTop: 8,
                      color: potBalance > 0 ? '#E2E8F0' : 'var(--text-dim)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 8
                    }}>
                      <span>
                        {guildData?.guild ? (
                          potBalance > 0
                            ? (lang === 'th' ? `สะสมแล้ว ${potBalance}/29 บาท (ขาดอีก ${potNeeded} บาท เพื่อปลดล็อก 30 วัน)` : `Progress: ${potBalance}/29 THB (needs ${potNeeded} THB more)`)
                            : (lang === 'th' ? 'สะสม 0/29 บาท (เติมซองขั้นต่ำ 10 บาทเพื่อเริ่มสะสม หรือส่ง 29-30 บาทเพื่อปลดล็อกทันที)' : '0/29 THB (send 10+ THB to start or 29-30 THB to unlock)')
                        ) : (
                          lang === 'th' ? 'กรอก Guild ID ด้านบนเพื่อดูหลอดสะสมของเซิร์ฟเวอร์' : 'Enter Guild ID above to view server pot'
                        )}
                      </span>
                      <span style={{ fontWeight: 700, color: 'var(--slime-green)', fontSize: 11 }}>
                        {potPercent}%
                      </span>
                    </div>

                    {/* Micro-rules note */}
                    <div style={{
                      fontSize: 10,
                      color: 'var(--text-dim)',
                      marginTop: 8,
                      paddingTop: 8,
                      borderTop: '1px dashed rgba(255, 255, 255, 0.08)',
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 10
                    }}>
                      <span>{lang === 'th' ? '• รับซองขั้นต่ำ 10 บาท/ซอง' : '• Min voucher: 10 THB'}</span>
                      <span>{lang === 'th' ? '• ครบ 29 บ. ปลดล็อก 30 วันทันที' : '• 29 THB unlocks 30 days'}</span>
                      <span>{lang === 'th' ? '• เศษเงินยกยอดสะสมรอบหน้า' : '• Excess carried forward'}</span>
                      <span>{lang === 'th' ? '• ยอดสะสมมีอายุ 60 วัน' : '• Pot expires in 60 days'}</span>
                      <span style={{ width: '100%', color: '#94A3B8', marginTop: 2 }}>
                        {lang === 'th'
                          ? '• สะสมวันใช้งานได้สูงสุด 90 วัน (เติมรอบใหม่ได้เมื่อวันคงเหลือต่ำกว่า 60 วัน)'
                          : '• Max 90 days total (top-up unlocks when < 60 days remain)'}
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* Non-refundable Policy Warning Alert */}
              <div style={{
                marginBottom: 14,
                padding: '9px 12px',
                borderRadius: 10,
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                fontSize: 11,
                lineHeight: 1.5,
                color: '#FCA5A5'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, marginBottom: 2, color: '#EF4444' }}>
                  <IconAlertCircle size={14} />
                  <span>{lang === 'th' ? 'นโยบายการไม่คืนเงิน (Non-refundable):' : 'Non-refundable Policy:'}</span>
                </div>
                <div>
                  {lang === 'th'
                    ? 'เนื่องจากเงินสมทบทุนจะถูกนำไปจัดสรรทรัพยากรเซิร์ฟเวอร์ล่วงหน้าทันที จึงขอสงวนสิทธิ์ไม่คืนเงินทุกกรณี รวมถึงกรณีระบบหยุดให้บริการจากเหตุสุดวิสัย'
                    : 'Infrastructure donations are allocated immediately and are non-refundable under any circumstances.'}
                </div>
              </div>

              {/* Advance Lock Alert (When remainingDays > 60) */}
              {isAdvanceLocked && (
                <div style={{
                  marginBottom: 14,
                  padding: '12px 15px',
                  borderRadius: 12,
                  background: 'rgba(245, 158, 11, 0.1)',
                  border: '1px solid rgba(245, 158, 11, 0.35)',
                  fontSize: 12.5,
                  lineHeight: 1.5,
                  color: '#FDE68A',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 10
                }}>
                  <IconLock size={18} style={{ color: '#FBBF24', flexShrink: 0, marginTop: 1 }} />
                  <div>
                    <div style={{ fontWeight: 800, color: '#FBBF24', marginBottom: 2 }}>
                      {lang === 'th' ? 'จำกัดการเติมล่วงหน้า (Advance Lock)' : 'Advance Top-up Locked'}
                    </div>
                    <div>
                      {lang === 'th'
                        ? `เซิร์ฟเวอร์นี้มีวันใช้งานคงเหลือเกิน 60 วันแล้ว (เหลือ ${remainingDays} วัน) จะสามารถเติมรอบใหม่ได้เมื่อวันคงเหลือต่ำกว่า 60 วัน`
                        : `This server has more than 60 days remaining (${remainingDays} days left). You will be able to top up when remaining days are below 60 days.`}
                    </div>
                  </div>
                </div>
              )}

              {/* Voucher URL Input */}
              <div style={{ marginBottom: 14 }}>
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
                    <span>{lang === 'th' ? 'วิธีสร้างซองของขวัญ' : 'How to create voucher?'}</span>
                  </button>
                </div>

                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    type="text"
                    placeholder={isAdvanceLocked ? (lang === 'th' ? `เซิร์ฟเวอร์มีวันคงเหลือเกิน 60 วันแล้ว (เหลือ ${remainingDays} วัน)` : `Remaining days > 60 days (${remainingDays}d left)`) : "https://gift.truemoney.com/campaign/?v=..."}
                    value={voucher}
                    onChange={(e) => setVoucher(e.target.value)}
                    disabled={isAdvanceLocked}
                    style={{
                      flex: 1,
                      padding: '11px 14px',
                      borderRadius: 10,
                      background: isAdvanceLocked ? 'rgba(255, 255, 255, 0.03)' : 'rgba(5, 7, 12, 0.8)',
                      border: '1px solid ' + (isAdvanceLocked ? 'rgba(255, 255, 255, 0.1)' : 'var(--border-light)'),
                      color: isAdvanceLocked ? 'var(--text-dim)' : '#FFFFFF',
                      fontSize: 12.5,
                      cursor: isAdvanceLocked ? 'not-allowed' : 'text'
                    }}
                    required={!isAdvanceLocked}
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      if (isMaxStacked) return;
                      try {
                        const text = await navigator.clipboard.readText();
                        if (text && text.trim()) {
                          setVoucher(text.trim());
                          onToast('info', lang === 'th' ? 'วางสำเร็จ' : 'Pasted', lang === 'th' ? 'วางลิงก์จากคลิปบอร์ดแล้ว' : 'Pasted from clipboard');
                        } else {
                          onToast('warning', lang === 'th' ? 'คลิปบอร์ดว่างเปล่า' : 'Empty Clipboard', lang === 'th' ? 'ไม่พบข้อความในคลิปบอร์ดครับ' : 'No text in clipboard');
                        }
                      } catch {
                        onToast('warning', lang === 'th' ? 'ไม่สามารถเข้าถึงคลิปบอร์ด' : 'Permission Required', lang === 'th' ? 'กรุณากดวาง (Paste) ด้วยตนเองครับ' : 'Please paste manually');
                      }
                    }}
                    disabled={isMaxStacked}
                    title={lang === 'th' ? 'กดเพื่อวางลิงก์ซองจากคลิปบอร์ด' : 'Paste voucher link from clipboard'}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '11px 14px',
                      borderRadius: 10,
                      background: 'rgba(0, 255, 135, 0.1)',
                      border: '1px solid rgba(0, 255, 135, 0.3)',
                      color: 'var(--slime-green)',
                      fontSize: 12.5,
                      fontWeight: 700,
                      cursor: isMaxStacked ? 'not-allowed' : 'pointer',
                      whiteSpace: 'nowrap',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <IconClipboard size={15} />
                    <span>{lang === 'th' ? 'วางลิงก์' : 'Paste'}</span>
                  </button>
                </div>

                <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 5 }}>
                  {lang === 'th' ? 'สร้างซองของขวัญแบบ "แบ่งเท่ากัน 1 คน" (ขั้นต่ำ 10 บาทขึ้นไป เช่น 10, 20, 29, 30 หรือ 60 บาท) ในแอป TrueMoney' : 'Set to equal amount, 1 recipient (min 10 THB, e.g. 10, 20, 29, 30 or 60 THB)'}
                </div>
              </div>

              {/* Referral Code Input */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-sub)', marginBottom: 6 }}>
                  {lang === 'th' ? 'รหัสชวนเพื่อน (Referral Code - ถ้ามี)' : 'Referral Code (Optional)'}
                </label>
                {guildData?.referralConfig?.enabled === false ? (
                  <div style={{ padding: '8px 12px', background: 'rgba(255, 51, 75, 0.08)', border: '1px solid rgba(255, 51, 75, 0.25)', borderRadius: 8, fontSize: 11.5, color: 'var(--red-alert)' }}>
                    [Paused] {lang === 'th' ? 'แคมเปญชวนเพื่อนปิดรับสิทธิ์ชั่วคราวครับ' : 'Referral program is temporarily paused'}
                  </div>
                ) : (guildData?.referralConfig?.expiresAt && Date.now() > guildData.referralConfig.expiresAt) ? (
                  <div style={{ padding: '8px 12px', background: 'rgba(255, 51, 75, 0.08)', border: '1px solid rgba(255, 51, 75, 0.25)', borderRadius: 8, fontSize: 11.5, color: 'var(--red-alert)' }}>
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
                          padding: '9px 12px',
                          borderRadius: 10,
                          background: isMaxStacked ? 'rgba(255, 255, 255, 0.03)' : 'rgba(5, 7, 12, 0.8)',
                          border: '1px solid ' + (isMaxStacked ? 'rgba(255, 255, 255, 0.1)' : 'var(--border-light)'),
                          color: isMaxStacked ? 'var(--text-dim)' : '#FFFFFF',
                          fontSize: 12,
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
                          padding: '0 14px',
                          borderRadius: 10,
                          background: 'rgba(255, 255, 255, 0.08)',
                          border: '1px solid rgba(255, 255, 255, 0.16)',
                          color: isMaxStacked ? 'var(--text-dim)' : '#FFFFFF',
                          fontWeight: 600,
                          fontSize: 12,
                          cursor: isMaxStacked ? 'not-allowed' : 'pointer',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {lang === 'th' ? 'ใช้โค้ด' : 'Apply'}
                      </button>
                    </div>

                    {referrerName && (
                      <div style={{ fontSize: 11, color: 'var(--slime-green)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
                        <IconCircleCheck size={13} />
                        <span>{lang === 'th' ? `ผู้แนะนำ: เซิร์ฟเวอร์ ${referrerName}` : `Referrer: ${referrerName}`}</span>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Discord Support Help Strip */}
              <div style={{
                marginBottom: 16,
                padding: '9px 12px',
                borderRadius: 10,
                background: 'rgba(88, 101, 242, 0.08)',
                border: '1px solid rgba(88, 101, 242, 0.25)',
                fontSize: 11,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                color: '#CBD5E1'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ color: '#5865F2', fontWeight: 800 }}>Discord</span>
                  <span>{lang === 'th' ? 'พบปัญหาทางเทคนิคหรือสถานะไม่อัปเดต?' : 'Technical issues?'}</span>
                </div>
                <a
                  href="https://discord.com/users/640276519603929103"
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    color: '#5865F2',
                    fontWeight: 700,
                    textDecoration: 'none',
                    fontSize: 11,
                    background: 'rgba(88, 101, 242, 0.15)',
                    padding: '3px 8px',
                    borderRadius: 6,
                    border: '1px solid rgba(88, 101, 242, 0.3)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4
                  }}
                >
                  <span>{lang === 'th' ? 'ติดต่อทีมงาน (DM)' : 'Contact Support'}</span>
                  <IconArrowRight size={11} />
                </a>
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
                  {isAdvanceLocked ? (
                    <>
                      <IconLock size={16} />
                      <span>{lang === 'th' ? `วันคงเหลือเกิน 60 วัน (เหลือ ${remainingDays} วัน)` : `Locked: ${remainingDays} Days Left`}</span>
                    </>
                  ) : submittingTopup ? (
                    <span>{lang === 'th' ? 'กำลังตรวจสอบยอดและทำรายการ...' : 'Verifying Voucher...'}</span>
                  ) : (
                    <>
                      <IconSparkles size={16} />
                      <span>{lang === 'th' ? 'ยืนยันการร่วมสมทบทุนค่าเซิร์ฟเวอร์' : 'Confirm Infrastructure Contribution'}</span>
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
                  {lang === 'th' ? 'รหัสโปรโมชันแจกสิทธิ์ผู้สนับสนุนเซิร์ฟเวอร์ฟรี' : 'Redeem limited campaign code for free Supporter perks'}
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
              <span>{lang === 'th' ? 'ระบบประมวลผลอัตโนมัติ' : 'Automated Verification'}</span>
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
              id: 'donation',
              title: lang === 'th' ? '1. โมเดลการสนับสนุนและหลอดสะสมยอด (29 THB / 30 Days Pot)' : '1. 29 THB / 30 Days Supporter Pot Model',
              preview: lang === 'th' ? 'ระบบสะสมยอด 29 บาท = 30 วัน (รับซอง TrueMoney ขั้นต่ำ 10 บาท สะสมครบ 29 บาท ปลดล็อกทันที)' : 'Accumulation pot: 29 THB = 30 Supporter days. Accepts TrueMoney vouchers (min 10 THB); unlocks every 29 THB reached.',
              content: lang === 'th' ? 'ระบบกำหนดอัตราการสนับสนุนเซิร์ฟเวอร์ที่ 29 บาท ต่อระยะเวลา 30 วัน (สถานะ SUPPORTER) โดยรับผ่านลิงก์ซองของขวัญ TrueMoney (ขั้นต่ำ 10 บาท/ซอง) ผู้สนับสนุนสามารถส่งซองสะสมยอดได้เรื่อยๆ เมื่อยอดรวมแตะ 29 บาท ระบบจะเปิดสถานะ SUPPORTER 30 วันให้อัตโนมัติทันที และหากมีเงินเศษเกิน (เช่น ส่ง 30 บาท หรือ 60 บาท) ระบบจะเก็บเศษที่เหลือ (1 หรือ 2 บาท) ไว้ในหลอดสะสมสำหรับรอบถัดไป' : 'Server support operates on a fixed 29 THB / 30 days SUPPORTER threshold. Top-up via TrueMoney gift vouchers (minimum 10 THB per voucher). Progress accumulates in the server pot; every 29 THB unlocks 30 days immediately. Any excess (e.g. from 30 THB or 60 THB vouchers) is safely carried forward into the next billing cycle.'
            },
            {
              id: 'nonrefundable',
              title: lang === 'th' ? '2. อายุของยอดสะสมและนโยบายไม่คืนเงิน (Pot Validity & Non-refundable)' : '2. Pot Validity & Non-refundable Policy',
              preview: lang === 'th' ? 'ยอดสะสมที่ยังไม่ครบ 29 บาท มีอายุ 60 วันนับจากการเติมล่าสุด และขอสงวนสิทธิ์ไม่คืนเงินทุกกรณี' : 'Unfinished pots expire after 60 days of inactivity. All contributions are strictly non-refundable.',
              content: lang === 'th' ? 'ยอดเงินสะสมที่ยังไม่ครบ 29 บาท จะมีอายุ 60 วันนับจากวันที่เติมเงินครั้งล่าสุด หากไม่มีการเติมต่อภายในระยะเวลาดังกล่าว ยอดค้างสะสมจะถูกตัดเข้ากองทุนบำรุงรักษาโครงสร้างพื้นฐานเซิร์ฟเวอร์ และเนื่องจากเงินสมทบทุนจะถูกนำไปจัดสรรทรัพยากรเซิร์ฟเวอร์ล่วงหน้าทันที จึงขอสงวนสิทธิ์ไม่คืนเงินทุกกรณี รวมถึงกรณีที่ระบบจำเป็นต้องยุติหรือระงับการให้บริการชั่วคราว/ถาวร อันเนื่องมาจากการเปลี่ยนแปลงนโยบายหรือข้อจำกัดทางเทคนิคของแพลตฟอร์มภายนอก (เช่น Discord หรือ YouTube)' : 'Pending balances below 29 THB expire 60 days after the latest deposit and are transferred to the infrastructure maintenance fund if left inactive. Furthermore, because donations are immediately allocated toward upstream node operations, all contributions are non-refundable under any circumstances, including temporary or permanent service cessations arising from upstream platform policy shifts.'
            },
            {
              id: 'support',
              title: lang === 'th' ? '3. กรณีพบปัญหาทางเทคนิค (Technical Support)' : '3. Technical Support & Verification',
              preview: lang === 'th' ? 'หากสถานะไม่ปรับเป็น SUPPORTER อัตโนมัติ สามารถนำลิงก์ซองและ Guild ID ติดต่อทีมงานได้ทันที' : 'If status does not update automatically, contact Discord Support with voucher link and Guild ID.',
              content: lang === 'th' ? 'หากส่งการสนับสนุนแล้วสถานะไม่ปรับเป็น SUPPORTER อัตโนมัติ หรือพบปัญหาการใช้งาน สามารถนำลิงก์ซองและ Guild ID มาติดต่อทีมงานได้ที่ช่องทาง Discord Support เพื่อให้ทีมงานตรวจสอบและเปิดสิทธิ์ให้โดยตรง' : 'If supporter perks do not activate automatically upon voucher redemption or technical glitches occur, please contact our support team on Discord with your voucher link and Guild ID for direct manual activation.'
            },
            {
              id: 'disclaimer',
              title: lang === 'th' ? '4. ข้อจำกัดความรับผิดชอบ (Content & Media Disclaimer)' : '4. Legal Disclaimer & Fair Use',
              preview: lang === 'th' ? 'GOOLIX เป็นเพียงเครื่องมืออำนวยความสะดวกในการเล่นสื่อตามคำสั่ง ไม่ได้จัดเก็บหรือโฮสต์ไฟล์ใดๆ' : 'GOOLIX functions strictly as a playback automation tool and does not host or store media files.',
              content: lang === 'th' ? 'GOOLIX เป็นเพียงเครื่องมืออำนวยความสะดวกในการเล่นสื่อตามคำสั่งของผู้ใช้ ระบบไม่ได้จัดเก็บ ทำซ้ำ หรือโฮสต์ไฟล์เสียงใดๆ ไว้บนเซิร์ฟเวอร์ และทำงานในฐานะตัวกลางส่งผ่านข้อมูลชั่วคราว (Mere Conduit) เท่านั้น' : 'GOOLIX operates solely as an interactive media playback tool responding to user instructions. The system does not permanently store, copy, distribute, or host audio files on its servers and acts strictly as a transient transmission buffer (Mere Conduit).'
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
                <span>{lang === 'th' ? 'วิธีสร้างซองของขวัญ TrueMoney' : 'How to Create TrueMoney Voucher'}</span>
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
                  {lang === 'th' ? 'กรอกยอดเงิน ' : 'Enter amount '}
                  <strong style={{ color: 'var(--slime-green)' }}>{lang === 'th' ? 'ขั้นต่ำ 10 บาทขึ้นไป' : 'min 10 THB'}</strong>
                  <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>
                    {lang === 'th' ? '(เช่น 10, 20, 29, 30 หรือ 60 บาท — ระบบจะสะสมในหลอด เมื่อครบ 29 บาท ปลดล็อก 30 วันทันที เศษเงินที่เกินจะยกยอดสะสมต่อไป)' : '(e.g. 10, 20, 29, 30 or 60 THB — accumulates into pot; unlocks 30 days every 29 THB reached)'}
                  </div>
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
                    ? '1. โมเดลการสนับสนุนและหลอดสะสมยอด (29 THB / 30 Days Supporter Pot Model)'
                    : '1. 29 THB / 30 Days Supporter Pot Model'}
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingLeft: 12 }}>
                  <div>
                    {lang === 'th'
                      ? 'ระบบกำหนดอัตราการสนับสนุนเซิร์ฟเวอร์ที่ 29 บาท ต่อระยะเวลา 30 วัน (สถานะ SUPPORTER) โดยรับผ่านลิงก์ซองของขวัญ TrueMoney (ขั้นต่ำ 10 บาท/ซอง) ผู้สนับสนุนสามารถส่งซองสะสมยอดได้เรื่อยๆ เมื่อยอดรวมแตะ 29 บาท ระบบจะเปิดสถานะ SUPPORTER 30 วันให้อัตโนมัติทันที และหากมีเงินเศษเกิน (เช่น ส่ง 30 บาท หรือ 60 บาท) ระบบจะเก็บเศษที่เหลือ (1 หรือ 2 บาท) ไว้ในหลอดสะสมสำหรับรอบถัดไป'
                      : 'Server support operates on a fixed 29 THB / 30 days SUPPORTER threshold. Top-up via TrueMoney gift vouchers (minimum 10 THB per voucher). Progress accumulates in the server pot; every 29 THB unlocks 30 days immediately. Any excess (e.g. from 30 THB or 60 THB vouchers) is safely carried forward into the next billing cycle.'}
                  </div>
                </div>
              </div>

              {/* Section 2 */}
              <div>
                <h4 style={{ margin: '0 0 8px 0', fontSize: 13.5, fontWeight: 700, color: '#FFF' }}>
                  {lang === 'th'
                    ? '2. อายุของยอดสะสมและนโยบายไม่คืนเงิน (Pot Validity & Non-refundable Policy)'
                    : '2. Pot Validity & Non-refundable Policy'}
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingLeft: 12 }}>
                  <div>
                    {lang === 'th'
                      ? 'ยอดเงินสะสมที่ยังไม่ครบ 29 บาท จะมีอายุ 60 วันนับจากวันที่เติมเงินครั้งล่าสุด หากไม่มีการเติมต่อภายในระยะเวลาดังกล่าว ยอดค้างสะสมจะถูกตัดเข้ากองทุนบำรุงรักษาโครงสร้างพื้นฐานเซิร์ฟเวอร์ และเนื่องจากเงินสมทบทุนจะถูกนำไปจัดสรรทรัพยากรเซิร์ฟเวอร์ล่วงหน้าทันที จึงขอสงวนสิทธิ์ไม่คืนเงินทุกกรณี รวมถึงกรณีที่ระบบจำเป็นต้องยุติหรือระงับการให้บริการชั่วคราว/ถาวร อันเนื่องมาจากการเปลี่ยนแปลงนโยบายหรือข้อจำกัดทางเทคนิคของแพลตฟอร์มภายนอก (เช่น Discord หรือ YouTube)'
                      : 'Pending balances below 29 THB expire 60 days after the latest deposit and are transferred to the infrastructure maintenance fund if left inactive. Furthermore, because donations are immediately allocated toward upstream node operations, all contributions are non-refundable under any circumstances, including temporary or permanent service cessations arising from upstream platform policy shifts.'}
                  </div>
                </div>
              </div>

              {/* Section 3 */}
              <div>
                <h4 style={{ margin: '0 0 8px 0', fontSize: 13.5, fontWeight: 700, color: '#FFF' }}>
                  {lang === 'th'
                    ? '3. กรณีพบปัญหาทางเทคนิค (Technical Support)'
                    : '3. Technical Support & Manual Activation'}
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingLeft: 12 }}>
                  <div>
                    {lang === 'th'
                      ? 'หากส่งการสนับสนุนแล้วสถานะไม่ปรับเป็น SUPPORTER อัตโนมัติ หรือพบปัญหาการใช้งาน สามารถนำลิงก์ซองและ Guild ID มาติดต่อทีมงานได้ที่ช่องทาง Discord Support เพื่อให้ทีมงานตรวจสอบและเปิดสิทธิ์ให้โดยตรง:'
                      : 'If supporter perks do not activate automatically upon voucher redemption or technical glitches occur, please contact our support team on Discord with your voucher link and Guild ID for direct manual activation:'}
                  </div>
                  <div style={{ marginTop: 4 }}>
                    <a
                      href="https://discord.com/users/640276519603929103"
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        color: '#5865F2',
                        background: 'rgba(88, 101, 242, 0.12)',
                        border: '1px solid rgba(88, 101, 242, 0.3)',
                        padding: '4px 10px',
                        borderRadius: 6,
                        fontSize: 11.5,
                        fontWeight: 700,
                        textDecoration: 'none'
                      }}
                    >
                      <span>Discord: Guslaier (ID: 640276519603929103)</span>
                      <IconArrowRight size={12} />
                    </a>
                  </div>
                </div>
              </div>

              {/* Section 4 */}
              <div>
                <h4 style={{ margin: '0 0 8px 0', fontSize: 13.5, fontWeight: 700, color: '#FFF' }}>
                  {lang === 'th'
                    ? '4. ข้อจำกัดความรับผิดชอบ (Content & Media Disclaimer)'
                    : '4. Legal Disclaimer & Mere Conduit'}
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingLeft: 12 }}>
                  <div>
                    {lang === 'th'
                      ? 'GOOLIX เป็นเพียงเครื่องมืออำนวยความสะดวกในการเล่นสื่อตามคำสั่งของผู้ใช้ ระบบไม่ได้จัดเก็บ ทำซ้ำ หรือโฮสต์ไฟล์เสียงใดๆ ไว้บนเซิร์ฟเวอร์ และทำงานในฐานะตัวกลางส่งผ่านข้อมูลชั่วคราว (Mere Conduit) เท่านั้น'
                      : 'GOOLIX operates solely as an interactive media playback tool responding to user instructions. The system does not permanently store, copy, distribute, or host audio files on its servers and acts strictly as a transient transmission buffer (Mere Conduit).'}
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
