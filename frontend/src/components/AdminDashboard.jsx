import React, { useState, useEffect, useRef } from 'react';
import Modal from './Modal';
import { IconShield, IconServer, IconDatabase, IconWifi, IconActivity, IconCpu, IconRotateClockwise, IconTrash, IconPlayerPlay, IconPlayerStop, IconPlayerSkipForward, IconSearch, IconPlus, IconBan, IconCircleCheck, IconAlertTriangle, IconSettings, IconRefresh, IconPower, IconRadio, IconAdjustments, IconExternalLink, IconUsers, IconGlobe, IconMapPin, IconCloud, IconDeviceFloppy, IconGift, IconChevronLeft, IconChevronRight, IconCalendar, IconMinus, IconArrowRight, IconEye, IconEdit, IconShare, IconToggleLeft, IconToggleRight, IconCheck, IconX, IconSparkles, IconClock, IconVolume, IconRepeat, IconHeart, IconList, IconArrowsShuffle } from '@tabler/icons-react';

export default function AdminDashboard({ lang, token, setToken, onToast }) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [activeSubTab, setActiveSubTab] = useState('nodes'); // 'nodes' | 'streams' | 'guilds' | 'drops' | 'tx' | 'settings'
  const [selectedNodeId, setSelectedNodeId] = useState('local-0');

  // Search & Filter
  const [guildSearch, setGuildSearch] = useState('');
  const [nodeSearchTerm, setNodeSearchTerm] = useState('');

  // Modals
  const [banModal, setBanModal] = useState(null); // { guildId, guildName }
  const [banDays, setBanDays] = useState(7);
  const [banReason, setBanReason] = useState('ละเมิดข้อกำหนดการใช้งาน');

  // Custom Adjust Days Modal State
  const [adjustDaysModal, setAdjustDaysModal] = useState(null); // { guildId, guildName, expiresAt, isSupporter }
  const [adjustMode, setAdjustMode] = useState('offset'); // 'offset' | 'date'
  const [adjustType, setAdjustType] = useState('add'); // 'add' | 'deduct'
  const [adjustDaysValue, setAdjustDaysValue] = useState(7);
  const [adjustDateValue, setAdjustDateValue] = useState('');
  const [adjustReason, setAdjustReason] = useState('');

  const [editNodeModal, setEditNodeModal] = useState(null); // node obj
  const [nodeNameInput, setNodeNameInput] = useState('');
  const [nodeMaxRoomsInput, setNodeMaxRoomsInput] = useState(15);
  const [nodeMaxFreeRoomsInput, setNodeMaxFreeRoomsInput] = useState(15);
  const [savingNodeConfig, setSavingNodeConfig] = useState(false);

  // Add Node Modal State
  const [addNodeModal, setAddNodeModal] = useState(false);
  const [addNodeName, setAddNodeName] = useState('');
  const [addNodeHost, setAddNodeHost] = useState('');
  const [addNodePort, setAddNodePort] = useState(2333);
  const [addNodeMaxRooms, setAddNodeMaxRooms] = useState(15);
  const [addNodeMaxFreeRooms, setAddNodeMaxFreeRooms] = useState(15);

  // New Drop Form State
  const [dropCode, setDropCode] = useState('');
  const [dropClaims, setDropClaims] = useState(50);
  const [dropDays, setDropDays] = useState(30);
  const [dropExpireMode, setDropExpireMode] = useState('7'); // '7' | '14' | '30' | 'custom' | 'never'
  const [dropCustomDate, setDropCustomDate] = useState('');

  // Edit Drop Modal State
  const [editDropModal, setEditDropModal] = useState(null); // drop object
  const [editDropName, setEditDropName] = useState('');
  const [editDropClaims, setEditDropClaims] = useState(50);
  const [editDropDays, setEditDropDays] = useState(30);
  const [editDropExpireMode, setEditDropExpireMode] = useState('never');
  const [editDropCustomDate, setEditDropCustomDate] = useState('');

  // View Claimed Guilds Modal State
  const [viewClaimedModal, setViewClaimedModal] = useState(null); // drop object

  // Reset Referral Season Modal State
  const [resetReferralModal, setResetReferralModal] = useState(false);
  const [resetSeasonName, setResetSeasonName] = useState('');

  // Referral Campaign Form State
  const [referralForm, setReferralForm] = useState({
    enabled: true,
    minTopup: 29,
    rewardDays: 30,
    maxInvites: 6,
    expireMode: 'never',
    customDate: ''
  });
  const hasInitializedReferralRef = useRef(false);
  const isReferralDirtyRef = useRef(false);

  // Settings Form State & Protection against Polling Overwrites
  const [settingsForm, setSettingsForm] = useState({
    paymentMode: 'sandbox',
    price30Days: 29,
    maxFreeStreams: 2,
    maxTotalStreams: 4,
    maxReferralMonths: 6,
    phoneNumber: '',
    publicWebUrl: ''
  });
  const hasInitializedSettingsRef = useRef(false);
  const isSettingsDirtyRef = useRef(false);

  // Feature Flags State
  const [featureFlags, setFeatureFlags] = useState({
    seek: { id: 'seek', name: 'Playback Scrubbing & Seek', command: '/gseek, /gforward, /gbackward', description: 'Jump to specific track timestamp and fast-forward or rewind audio playback', mode: 'disabled', customMessage: '' },
    filter: { id: 'filter', name: 'Audio Equalizer & Filter', command: '/gfilter', description: 'DSP audio equalizer presets and acoustic tone processing (Bass Boost, Nightcore, etc.)', mode: 'supporter_only', customMessage: '' },
    autoplay: { id: 'autoplay', name: 'Autoplay Engine', command: '/gautoplay', description: 'Autonomous continuous smart track queueing when playlist reaches end', mode: 'supporter_only', customMessage: '' },
    volume: { id: 'volume', name: 'Volume Adjustment', command: '/gvolume', description: 'Digital audio volume gain amplification and attenuation (0-150%)', mode: 'all', customMessage: '' },
    loop: { id: 'loop', name: 'Track & Queue Loop', command: '/gloop', description: 'Repeat single track or infinite cyclic playback for queue', mode: 'all', customMessage: '' },
    shuffle: { id: 'shuffle', name: 'Queue Shuffle', command: '/gshuffle', description: 'Randomize and permute order of queued tracks', mode: 'all', customMessage: '' },
    lyrics: { id: 'lyrics', name: 'Lyrics Search', command: '/glyrics', description: 'Online synchronized and plain text song lyrics retrieval', mode: 'all', customMessage: '' },
    playlist: { id: 'playlist', name: 'Playlist Loading', command: '/gplaylist', description: 'Batch enqueue YouTube/SoundCloud public music playlists into queue', mode: 'all', customMessage: '' },
    favorite: { id: 'favorite', name: 'Personal Favorites', command: '/gfav', description: 'User-saved custom song bookmarks and instant playlist recalls', mode: 'all', customMessage: '' },
    queue_control: { id: 'queue_control', name: 'Advanced Queue Operations', command: '/gjump, /gmove, /gremove, /gclear', description: 'Reorder, jump to song, delete track index, or purge current song queue', mode: 'all', customMessage: '' }
  });
  const [savingFeatures, setSavingFeatures] = useState(false);
  const hasInitializedFeaturesRef = useRef(false);
  const isFeaturesDirtyRef = useRef(false);

  // Dynamic System Campaigns State
  const [campaignModal, setCampaignModal] = useState(null); // null | { mode: 'create' | 'edit', campaign: obj }
  const [campForm, setCampForm] = useState({
    id: '',
    name: '',
    isActive: true,
    startsAt: '',
    endsAt: '',
    grantSupporterToAll: true,
    maxConcurrentRooms: 50,
    allowTopup: true,
    expiryPolicy: 'deferred_stack',
    fixedTargetDate: '',
    maxAccumulatedDays: 37,
    badgeText: '✦ BETA LAUNCH',
    bannerTitle: '✦ GOOLIX ฉลองเปิดตัว! ปลดล็อก SUPPORTER ให้ลองฟรีทุกเซิร์ฟ',
    bannerSubtitle: 'มาเปิดให้ลองของจริงกันก่อน! จัดเต็ม หน้า UI คุมเพลงสวยๆ กดง่ายไม่ต้องพิมพ์คำสั่งบ่อย, อัดคิวเพลงยาวๆ, แล้วก็ เล่นตรงจากลิงก์ 100% เพลงไม่เพี้ยน ไม่สลับเวอร์ชัน แน่นอน ฟังฟรีได้เลย 7 วันเต็ม',
    infoPoint1: 'จำกัด 50 ห้องพร้อมกันนะ: ช่วงนี้เปิดเพื่อเทสระบบ ดูว่าเซิร์ฟรับไหวแค่ไหน เลยจำกัดให้เปิดพร้อมกันได้มากสุด 50 ห้อง ณ ช่วงเวลานั้น ถ้าเต็มอาจจะต้องรอคิวแป๊บนึง',
    infoPoint2: 'ครบ 7 วันแล้วเป็นไงต่อ?: ระบบจะเปิดห้องสายฟรีให้ใช้งานตามปกติ ส่วนสิทธิ์ SUPPORTER กับช่อง Priority ลัดคิว จะกลับไปเป็นของคนที่ร่วมโดเนทช่วยค่าเซิร์ฟตามเดิม',
    infoPoint3: 'ช่วยกันดันได้นะ: ถ้าชอบบอทตัวนี้ แล้วมีคนช่วยโดเนทซัพพอร์ตมากพอจนเซิร์ฟเวอร์อยู่รอด เดี๋ยวเราเอาเงินไปเปิดโหนดเพิ่ม แล้วขยายห้องให้สายฟรีได้ฟังกันเยอะขึ้นอีกแน่นอน!',
    showCountdown: true
  });
  const [savingCampaign, setSavingCampaign] = useState(false);

  const handleOpenCreateCampaign = () => {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const toLocalIso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    
    setCampForm({
      id: `camp-${Date.now().toString(36)}`,
      name: 'GOOLIX Grand Launch Beta (7 Days Free Supporter)',
      isActive: true,
      startsAt: toLocalIso(now),
      endsAt: toLocalIso(new Date(now.getTime() + 7 * 24 * 3600 * 1000)),
      grantSupporterToAll: true,
      maxConcurrentRooms: 50,
      allowTopup: true,
      expiryPolicy: 'deferred_stack',
      fixedTargetDate: '',
      maxAccumulatedDays: 37,
      badgeText: '✦ BETA LAUNCH',
      bannerTitle: '✦ GOOLIX ฉลองเปิดตัว! ปลดล็อก SUPPORTER ให้ลองฟรีทุกเซิร์ฟ',
      bannerSubtitle: 'มาเปิดให้ลองของจริงกันก่อน! จัดเต็ม หน้า UI คุมเพลงสวยๆ กดง่ายไม่ต้องพิมพ์คำสั่งบ่อย, อัดคิวเพลงยาวๆ, แล้วก็ เล่นตรงจากลิงก์ 100% เพลงไม่เพี้ยน ไม่สลับเวอร์ชัน แน่นอน ฟังฟรีได้เลย 7 วันเต็ม',
      infoPoint1: 'จำกัด 50 ห้องพร้อมกันนะ: ช่วงนี้เปิดเพื่อเทสระบบ ดูว่าเซิร์ฟรับไหวแค่ไหน เลยจำกัดให้เปิดพร้อมกันได้มากสุด 50 ห้อง ณ ช่วงเวลานั้น ถ้าเต็มอาจจะต้องรอคิวแป๊บนึง',
      infoPoint2: 'ครบ 7 วันแล้วเป็นไงต่อ?: ระบบจะเปิดห้องสายฟรีให้ใช้งานตามปกติ ส่วนสิทธิ์ SUPPORTER กับช่อง Priority ลัดคิว จะกลับไปเป็นของคนที่ร่วมโดเนทช่วยค่าเซิร์ฟตามเดิม',
      infoPoint3: 'ช่วยกันดันได้นะ: ถ้าชอบบอทตัวนี้ แล้วมีคนช่วยโดเนทซัพพอร์ตมากพอจนเซิร์ฟเวอร์อยู่รอด เดี๋ยวเราเอาเงินไปเปิดโหนดเพิ่ม แล้วขยายห้องให้สายฟรีได้ฟังกันเยอะขึ้นอีกแน่นอน!',
      showCountdown: true
    });
    setCampaignModal({ mode: 'create' });
  };

  const handleOpenEditCampaign = (camp) => {
    const pad = (n) => String(n).padStart(2, '0');
    const toLocalIso = (timestamp) => {
      if (!timestamp) return '';
      const d = new Date(timestamp);
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };

    setCampForm({
      id: camp.id,
      name: camp.name || '',
      isActive: camp.isActive !== false,
      startsAt: toLocalIso(camp.startsAt),
      endsAt: toLocalIso(camp.endsAt),
      grantSupporterToAll: Boolean(camp.perks?.grantSupporterToAll),
      maxConcurrentRooms: camp.perks?.maxConcurrentRooms || 50,
      allowTopup: camp.topupPolicy?.allowTopup !== false,
      expiryPolicy: camp.topupPolicy?.expiryPolicy || 'deferred_stack',
      fixedTargetDate: toLocalIso(camp.topupPolicy?.fixedTargetDate),
      maxAccumulatedDays: camp.topupPolicy?.maxAccumulatedDays || 37,
      badgeText: camp.announcement?.badgeText || '✦ CAMPAIGN',
      bannerTitle: camp.announcement?.bannerTitle || '',
      bannerSubtitle: camp.announcement?.bannerSubtitle || '',
      infoPoint1: camp.announcement?.infoPoints?.[0] || '',
      infoPoint2: camp.announcement?.infoPoints?.[1] || '',
      infoPoint3: camp.announcement?.infoPoints?.[2] || '',
      showCountdown: camp.announcement?.showCountdown !== false
    });
    setCampaignModal({ mode: 'edit', campaign: camp });
  };

  const handleSaveCampaign = async (e) => {
    if (e) e.preventDefault();
    setSavingCampaign(true);
    try {
      const payload = {
        id: campForm.id,
        name: campForm.name,
        isActive: campForm.isActive,
        startsAt: campForm.startsAt ? new Date(campForm.startsAt).getTime() : Date.now(),
        endsAt: campForm.endsAt ? new Date(campForm.endsAt).getTime() : Date.now() + 7 * 24 * 3600 * 1000,
        perks: {
          grantSupporterToAll: campForm.grantSupporterToAll,
          maxConcurrentRooms: parseInt(campForm.maxConcurrentRooms, 10) || 50
        },
        topupPolicy: {
          allowTopup: campForm.allowTopup,
          expiryPolicy: campForm.expiryPolicy,
          fixedTargetDate: campForm.fixedTargetDate ? new Date(campForm.fixedTargetDate).getTime() : null,
          maxAccumulatedDays: parseInt(campForm.maxAccumulatedDays, 10) || 37
        },
        announcement: {
          badgeText: campForm.badgeText,
          bannerTitle: campForm.bannerTitle,
          bannerSubtitle: campForm.bannerSubtitle,
          infoPoints: [campForm.infoPoint1, campForm.infoPoint2, campForm.infoPoint3].filter(Boolean),
          showCountdown: campForm.showCountdown
        }
      };

      const isEdit = campaignModal?.mode === 'edit';
      const url = isEdit ? `/api/admin/system-campaigns/${encodeURIComponent(campForm.id)}` : '/api/admin/system-campaigns';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const resJson = await res.json();
      if (resJson.success) {
        onToast('success', lang === 'th' ? 'สำเร็จ' : 'Success', lang === 'th' ? 'บันทึกข้อมูลแคมเปญเรียบร้อยแล้ว' : 'Campaign saved successfully');
        setCampaignModal(null);
        fetchData();
      } else {
        onToast('error', lang === 'th' ? 'เกิดข้อผิดพลาด' : 'Error', resJson.error || 'Failed to save');
      }
    } catch (err) {
      onToast('error', 'Error', err.message);
    } finally {
      setSavingCampaign(false);
    }
  };

  const handleToggleCampaign = async (id, currentIsActive) => {
    try {
      const res = await fetch(`/api/admin/system-campaigns/${encodeURIComponent(id)}/toggle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ isActive: !currentIsActive })
      });
      const resJson = await res.json();
      if (resJson.success) {
        onToast('success', lang === 'th' ? 'สำเร็จ' : 'Success', !currentIsActive ? (lang === 'th' ? 'เปิดใช้งานแคมเปญแล้ว' : 'Campaign activated') : (lang === 'th' ? 'ปิดการใช้งานแคมเปญแล้ว' : 'Campaign deactivated'));
        fetchData();
      } else {
        onToast('error', 'Error', resJson.error || 'Failed to toggle');
      }
    } catch (err) {
      onToast('error', 'Error', err.message);
    }
  };

  const handleDeleteCampaign = async (id, name) => {
    if (!window.confirm(lang === 'th' ? `คุณแน่ใจหรือไม่ว่าต้องการลบแคมเปญ "${name}"?` : `Are you sure you want to delete campaign "${name}"?`)) {
      return;
    }
    try {
      const res = await fetch(`/api/admin/system-campaigns/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const resJson = await res.json();
      if (resJson.success) {
        onToast('success', lang === 'th' ? 'สำเร็จ' : 'Success', lang === 'th' ? 'ลบแคมเปญเรียบร้อยแล้ว' : 'Campaign deleted');
        fetchData();
      } else {
        onToast('error', 'Error', resJson.error || 'Failed to delete');
      }
    } catch (err) {
      onToast('error', 'Error', err.message);
    }
  };

  const fetchData = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/admin/overview', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.status === 401) {
        setToken('');
        localStorage.removeItem('goolix_admin_token');
        onToast('error', 'Session Expired', 'Please log in again');
        return;
      }
      const json = await res.json();
      if (json.success) {
        setData(json);
        // Only initialize settings form ONCE or when not dirty, never overwrite while typing!
        if (json.config && !hasInitializedSettingsRef.current && !isSettingsDirtyRef.current) {
          hasInitializedSettingsRef.current = true;
          setSettingsForm({
            paymentMode: json.config.paymentMode || 'sandbox',
            price30Days: json.config.price30Days ?? 29,
            maxFreeStreams: json.config.maxFreeStreams ?? 2,
            maxTotalStreams: json.config.maxTotalStreams ?? 4,
            maxReferralMonths: json.config.maxReferralMonths ?? 6,
            phoneNumber: json.config.phoneNumber || '',
            publicWebUrl: json.config.publicWebUrl || ''
          });
        }
        if (json.config && !hasInitializedReferralRef.current && !isReferralDirtyRef.current) {
          hasInitializedReferralRef.current = true;
          const exp = json.config.referralExpiresAt;
          setReferralForm({
            enabled: json.config.referralEnabled !== false,
            minTopup: json.config.referralMinTopup ?? 29,
            rewardDays: json.config.referralRewardDays ?? 30,
            maxInvites: json.config.maxReferralMonths ?? 6,
            expireMode: exp ? 'custom' : 'never',
            customDate: exp ? new Date(exp).toISOString().split('T')[0] : ''
          });
        }
        if (json.features && !hasInitializedFeaturesRef.current && !isFeaturesDirtyRef.current) {
          hasInitializedFeaturesRef.current = true;
          setFeatureFlags(json.features);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchData();
    const timer = setInterval(fetchData, 4000);
    return () => clearInterval(timer);
  }, [token]);

  // Node Actions
  const handleClearNodeCache = async (nodeId) => {
    if (!confirm(lang === 'th' ? `ยืนยันการล้างแคชเพลงของโหนด ${nodeId}?` : `Clear cache for node ${nodeId}?`)) return;
    try {
      const res = await fetch(`/api/admin/nodes/${nodeId}/cache/clear`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const resJson = await res.json();
      if (resJson.success) {
        onToast('success', lang === 'th' ? 'ล้างแคชสำเร็จ' : 'Cache Cleared', `Deleted ${resJson.deletedFiles || 0} files (${resJson.freedMb || 0} MB freed)`);
        fetchData();
      } else {
        onToast('error', 'Failed', resJson.error);
      }
    } catch (err) {
      onToast('error', 'Error', err.message);
    }
  };

  const handleSwitchNodeVpn = async (nodeId) => {
    try {
      onToast('info', lang === 'th' ? 'กำลังสลับ VPN...' : 'Switching VPN...');
      const res = await fetch(`/api/admin/nodes/${nodeId}/vpn/switch`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const resJson = await res.json();
      if (resJson.success) {
        onToast('success', lang === 'th' ? 'สลับ VPN สำเร็จ' : 'VPN Switched', `New Exit IP: ${resJson.newExitIp || 'Updated'}`);
        fetchData();
      } else {
        onToast('error', 'Failed', resJson.error);
      }
    } catch (err) {
      onToast('error', 'Error', err.message);
    }
  };

  const handleResetNodeCircuit = async (nodeId) => {
    try {
      const res = await fetch(`/api/admin/nodes/${nodeId}/circuit/reset`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const resJson = await res.json();
      if (resJson.success) {
        onToast('success', lang === 'th' ? 'รีเซ็ต Circuit สำเร็จ' : 'Circuit Reset');
        fetchData();
      }
    } catch (err) {
      onToast('error', 'Error', err.message);
    }
  };

  const handleToggleDrain = async (nodeId) => {
    try {
      const res = await fetch(`/api/admin/nodes/${nodeId}/drain`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const resJson = await res.json();
      if (resJson.success) {
        onToast('success', lang === 'th' ? 'เปลี่ยนสถานะ Drain สำเร็จ' : 'Drain Status Updated');
        fetchData();
      } else {
        onToast('error', lang === 'th' ? 'ไม่สามารถเปิดโหมด Drain ได้' : 'Cannot Drain Node', resJson.error);
      }
    } catch (err) {
      onToast('error', 'Error', err.message);
    }
  };

  const handleSaveNodeConfig = async () => {
    if (!editNodeModal || savingNodeConfig) return;
    const maxRoomsNum = parseInt(nodeMaxRoomsInput, 10);
    if (isNaN(maxRoomsNum) || maxRoomsNum < 1) {
      onToast('warning', lang === 'th' ? 'กรุณาระบุจำนวนห้องที่ถูกต้อง' : 'Valid room count required');
      return;
    }
    const maxFreeNum = parseInt(nodeMaxFreeRoomsInput, 10);
    if (isNaN(maxFreeNum) || maxFreeNum < 0 || maxFreeNum > maxRoomsNum) {
      onToast('warning', lang === 'th' ? 'โควตาสายฟรีต้องอยู่ระหว่าง 0 ถึง Max Rooms' : 'Free slots must be between 0 and Max Rooms');
      return;
    }
    setSavingNodeConfig(true);
    try {
      const res = await fetch(`/api/admin/nodes/${editNodeModal.id}/config`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: nodeNameInput,
          maxRooms: maxRoomsNum,
          maxFreeRooms: maxFreeNum
        })
      });
      const resJson = await res.json();
      if (resJson.success) {
        onToast('success', lang === 'th' ? 'บันทึกการตั้งค่าโหนดแล้ว' : 'Node Config Saved');
        setEditNodeModal(null);
        fetchData();
      } else {
        onToast('error', 'Failed', resJson.error);
      }
    } catch (err) {
      onToast('error', 'Error', err.message);
    } finally {
      setSavingNodeConfig(false);
    }
  };

  const handleAddNode = async (e) => {
    e.preventDefault();
    if (!addNodeHost.trim()) {
      onToast('warning', lang === 'th' ? 'กรุณาระบุ Host หรือ IP' : 'Host is required');
      return;
    }
    const maxRoomsNum = parseInt(addNodeMaxRooms, 10) || 15;
    const maxFreeNum = Math.min(maxRoomsNum, parseInt(addNodeMaxFreeRooms, 10) || maxRoomsNum);
    try {
      const res = await fetch('/api/admin/nodes', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: addNodeName.trim(),
          host: addNodeHost.trim(),
          port: parseInt(addNodePort, 10) || 2333,
          maxRooms: maxRoomsNum,
          maxFreeRooms: maxFreeNum
        })
      });
      const resJson = await res.json();
      if (resJson.success) {
        onToast('success', lang === 'th' ? 'เพิ่มโหนดเข้าคลัสเตอร์สำเร็จ!' : 'Node Connected!', `Hot-plugged ${resJson.node.name}`);
        setAddNodeModal(false);
        setAddNodeName('');
        setAddNodeHost('');
        fetchData();
      } else {
        onToast('error', 'Failed', resJson.error);
      }
    } catch (err) {
      onToast('error', 'Error', err.message);
    }
  };

  const handleDeleteNode = async (nodeId, nodeName) => {
    if (!confirm(lang === 'th' ? `ยืนยันการลบโหนด "${nodeName || nodeId}" ออกจากคลัสเตอร์?` : `Remove node "${nodeName || nodeId}"?`)) return;
    try {
      const res = await fetch(`/api/admin/nodes/${nodeId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const resJson = await res.json();
      if (resJson.success) {
        onToast('success', lang === 'th' ? 'ลบโหนดออกจากคลัสเตอร์แล้ว' : 'Node Removed');
        if (selectedNodeId === nodeId) setSelectedNodeId('local-0');
        fetchData();
      } else {
        onToast('error', 'Failed', resJson.error);
      }
    } catch (err) {
      onToast('error', 'Error', err.message);
    }
  };

  // Player Actions
  const handlePlayerAction = async (guildId, action) => {
    try {
      await fetch(`/api/admin/players/${guildId}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action })
      });
      onToast('success', action === 'skip' ? 'Skipped Track' : 'Stopped Player');
      fetchData();
    } catch (err) {
      onToast('error', 'Error', err.message);
    }
  };

  // Guild Subscription Actions
  const handleAdjustGuildDays = async (guildId, days, reason = '') => {
    try {
      const res = await fetch(`/api/admin/guilds/${guildId}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ addDays: days, reason })
      });
      const resJson = await res.json();
      if (resJson.success) {
        onToast('success', lang === 'th' ? 'ปรับวันใช้งานสำเร็จ' : 'Days Adjusted');
        fetchData();
      }
    } catch (err) {
      onToast('error', 'Error', err.message);
    }
  };

  const handleResetGuild = async (guildId) => {
    try {
      const res = await fetch(`/api/admin/guilds/${guildId}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action: 'reset' })
      });
      const resJson = await res.json();
      if (resJson.success) {
        onToast('success', lang === 'th' ? 'รีเซ็ตสถานะเป็น FREE สำเร็จ' : 'Reset to FREE successfully');
        fetchData();
      }
    } catch (err) {
      onToast('error', 'Error', err.message);
    }
  };

  const handleConfirmCustomAdjust = async () => {
    if (!adjustDaysModal) return;
    try {
      let bodyData = {};
      if (adjustMode === 'offset') {
        const numDays = Math.max(1, parseInt(adjustDaysValue, 10) || 1);
        const delta = adjustType === 'add' ? numDays : -numDays;
        bodyData = { addDays: delta, reason: adjustReason || undefined };
      } else {
        const targetMs = new Date(adjustDateValue).getTime();
        if (isNaN(targetMs)) {
          onToast('error', 'Invalid Date', lang === 'th' ? 'กรุณาระบุวันที่ที่ถูกต้อง' : 'Please select a valid date');
          return;
        }
        bodyData = { action: 'set', targetExpiry: targetMs, reason: adjustReason || undefined };
      }

      const res = await fetch(`/api/admin/guilds/${adjustDaysModal.guildId}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(bodyData)
      });
      const resJson = await res.json();
      if (resJson.success) {
        onToast('success', lang === 'th' ? 'ปรับวันใช้งานสำเร็จ' : 'Days Adjusted Successfully');
        setAdjustDaysModal(null);
        fetchData();
      }
    } catch (err) {
      onToast('error', 'Error', err.message);
    }
  };

  const handleBanGuild = async () => {
    if (!banModal) return;
    try {
      const res = await fetch(`/api/admin/guilds/${banModal.guildId}/ban`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          days: banDays,
          reason: banReason,
          guildName: banModal.guildName
        })
      });
      const resJson = await res.json();
      if (resJson.success) {
        onToast('success', lang === 'th' ? 'แบนเซิร์ฟเวอร์แล้ว' : 'Guild Banned');
        setBanModal(null);
        fetchData();
      }
    } catch (err) {
      onToast('error', 'Error', err.message);
    }
  };

  const handleUnbanGuild = async (guildId) => {
    try {
      const res = await fetch(`/api/admin/guilds/${guildId}/unban`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const resJson = await res.json();
      if (resJson.success) {
        onToast('success', lang === 'th' ? 'ปลดแบนเซิร์ฟเวอร์แล้ว' : 'Guild Unbanned');
        fetchData();
      }
    } catch (err) {
      onToast('error', 'Error', err.message);
    }
  };

  // Campaign Actions
  const handleCreateDrop = async (e) => {
    e.preventDefault();
    if (!dropCode.trim()) return;

    const payload = {
      code: dropCode.trim(),
      maxClaims: parseInt(dropClaims, 10) || 50,
      days: parseInt(dropDays, 10) || 30
    };

    if (dropExpireMode === 'custom') {
      if (!dropCustomDate) {
        onToast('warning', lang === 'th' ? 'กรุณาระบุวันหมดอายุแคมเปญ' : 'Please specify expiry date');
        return;
      }
      payload.expiresAt = new Date(dropCustomDate + 'T23:59:59').getTime();
    } else if (dropExpireMode !== 'never') {
      payload.expiresInDays = parseInt(dropExpireMode, 10);
    }

    try {
      const res = await fetch('/api/admin/campaigns', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      const resJson = await res.json();
      if (resJson.success) {
        onToast('success', lang === 'th' ? 'สร้างแคมเปญสำเร็จ' : 'Campaign Created');
        setDropCode('');
        setDropCustomDate('');
        fetchData();
      } else {
        onToast('error', 'Error', resJson.error);
      }
    } catch (err) {
      onToast('error', 'Error', err.message);
    }
  };

  const handleDeleteDrop = async (code) => {
    if (!confirm(lang === 'th' ? `ลบแคมเปญ ${code}?` : `Delete drop ${code}?`)) return;
    try {
      await fetch(`/api/admin/campaigns/${encodeURIComponent(code)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      onToast('success', 'Drop Deleted');
      fetchData();
    } catch (err) {
      onToast('error', 'Error', err.message);
    }
  };

  const handleOpenEditDrop = (drop) => {
    setEditDropModal(drop);
    setEditDropName(drop.name || '');
    setEditDropClaims(drop.maxClaims || 50);
    setEditDropDays(drop.days || 30);
    if (drop.expiresAt) {
      setEditDropExpireMode('custom');
      setEditDropCustomDate(new Date(drop.expiresAt).toISOString().split('T')[0]);
    } else {
      setEditDropExpireMode('never');
      setEditDropCustomDate('');
    }
  };

  const handleSaveEditDrop = async (e) => {
    e.preventDefault();
    if (!editDropModal) return;

    let targetExpiresAt = null;
    if (editDropExpireMode === 'custom') {
      if (!editDropCustomDate) {
        onToast('warning', lang === 'th' ? 'กรุณาระบุวันหมดอายุแคมเปญ' : 'Please specify expiry date');
        return;
      }
      targetExpiresAt = new Date(editDropCustomDate + 'T23:59:59').getTime();
    } else if (editDropExpireMode !== 'never') {
      targetExpiresAt = Date.now() + parseInt(editDropExpireMode, 10) * 24 * 3600 * 1000;
    }

    try {
      const res = await fetch(`/api/admin/campaigns/${encodeURIComponent(editDropModal.code)}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: editDropName.trim() || editDropModal.name,
          maxClaims: parseInt(editDropClaims, 10) || editDropModal.maxClaims,
          days: parseInt(editDropDays, 10) || editDropModal.days,
          expiresAt: targetExpiresAt
        })
      });
      const resJson = await res.json();
      if (resJson.success) {
        onToast('success', lang === 'th' ? 'บันทึกการแก้ไขแคมเปญสำเร็จ' : 'Campaign Updated');
        setEditDropModal(null);
        fetchData();
      } else {
        onToast('error', 'Error', resJson.error);
      }
    } catch (err) {
      onToast('error', 'Error', err.message);
    }
  };

  const handleSaveReferralSettings = async (e) => {
    if (e) e.preventDefault();
    let targetExpiresAt = null;
    if (referralForm.expireMode === 'custom') {
      if (referralForm.customDate) {
        targetExpiresAt = new Date(referralForm.customDate + 'T23:59:59').getTime();
      }
    } else if (referralForm.expireMode !== 'never') {
      targetExpiresAt = Date.now() + parseInt(referralForm.expireMode, 10) * 24 * 3600 * 1000;
    }

    const payload = {
      ...(data?.config || {}),
      referralEnabled: referralForm.enabled,
      referralMinTopup: parseInt(referralForm.minTopup, 10) || 29,
      referralRewardDays: parseInt(referralForm.rewardDays, 10) || 30,
      maxReferralMonths: parseInt(referralForm.maxInvites, 10) || 6,
      referralExpiresAt: targetExpiresAt
    };

    try {
      const res = await fetch('/api/admin/config', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      const resJson = await res.json();
      if (resJson.success) {
        onToast('success', lang === 'th' ? 'บันทึกการตั้งค่าแคมเปญชวนเพื่อนแล้ว' : 'Referral Campaign Saved');
        isReferralDirtyRef.current = false;
        fetchData();
      } else {
        onToast('error', 'Error', resJson.error);
      }
    } catch (err) {
      onToast('error', 'Error', err.message);
    }
  };

  const handleConfirmResetReferralSeason = async () => {
    try {
      const res = await fetch('/api/admin/referral/reset', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          seasonName: resetSeasonName.trim() || 'New Season'
        })
      });
      const resJson = await res.json();
      if (resJson.success) {
        onToast('success', lang === 'th' ? 'รีเซ็ตซีซั่นชวนเพื่อนสำเร็จ!' : 'Season Reset Successful!', `Reset ${resJson.resetCount || 0} guilds progress`);
        setResetReferralModal(false);
        setResetSeasonName('');
        fetchData();
      } else {
        onToast('error', 'Error', resJson.error);
      }
    } catch (err) {
      onToast('error', 'Error', err.message);
    }
  };

  // Config Actions
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    const clusterCap = data?.stats?.clusterCapacity;
    if (clusterCap) {
      if (settingsForm.maxTotalStreams > clusterCap.clusterMaxTotal) {
        onToast('warning',
          lang === 'th' ? 'เกินภาระสตรีมจริงของคลัสเตอร์' : 'Exceeds Cluster Capacity',
          lang === 'th'
            ? `โควตาสตรีมรวม (${settingsForm.maxTotalStreams} ห้อง) เกินภาระสตรีมจริงที่ทุกโหนดรองรับได้ (${clusterCap.clusterMaxTotal} ห้อง) กรุณาปรับไม่เกิน ${clusterCap.clusterMaxTotal}`
            : `Total quota (${settingsForm.maxTotalStreams}) cannot exceed combined physical capacity (${clusterCap.clusterMaxTotal})`
        );
        return;
      }
      if (settingsForm.maxFreeStreams > clusterCap.clusterMaxFree) {
        onToast('warning',
          lang === 'th' ? 'เกินความจุสายฟรีของคลัสเตอร์' : 'Exceeds Free Capacity',
          lang === 'th'
            ? `โควตาสายฟรี (${settingsForm.maxFreeStreams} ห้อง) เกินความจุสายฟรีจริงที่ทุกโหนดรวมกัน (${clusterCap.clusterMaxFree} ห้อง)`
            : `Free quota (${settingsForm.maxFreeStreams}) cannot exceed combined free capacity (${clusterCap.clusterMaxFree})`
        );
        return;
      }
    }
    try {
      const res = await fetch('/api/admin/config', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(settingsForm)
      });
      const resJson = await res.json();
      if (resJson.success) {
        onToast('success', lang === 'th' ? 'บันทึกการตั้งค่าแล้ว' : 'Settings Saved');
        isSettingsDirtyRef.current = false;
        fetchData();
      } else {
        onToast('error', 'Error', resJson.error);
      }
    } catch (err) {
      onToast('error', 'Error', err.message);
    }
  };

  const handleSaveFeatures = async (e) => {
    if (e) e.preventDefault();
    setSavingFeatures(true);
    try {
      const res = await fetch('/api/admin/features', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(featureFlags)
      });
      const resJson = await res.json();
      if (resJson.success) {
        onToast('success', lang === 'th' ? 'บันทึกสถานะฟังก์ชันและข้อความแจ้งเตือนสำเร็จ' : 'Feature Flags Saved');
        isFeaturesDirtyRef.current = false;
        if (resJson.features) {
          setFeatureFlags(resJson.features);
        }
        fetchData();
      } else {
        onToast('error', 'Error', resJson.error || 'Failed to update feature flags');
      }
    } catch (err) {
      onToast('error', 'Error', err.message);
    } finally {
      setSavingFeatures(false);
    }
  };

  const handleForceSweep = async () => {
    try {
      await fetch('/api/admin/sweep', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      onToast('success', 'Sweep Performed');
      fetchData();
    } catch (err) {
      onToast('error', 'Error', err.message);
    }
  };

  // Filtered Guilds
  const filteredGuilds = (data?.guilds || []).filter((g) => {
    if (!guildSearch.trim()) return true;
    const term = guildSearch.toLowerCase();
    return (g.guildName || '').toLowerCase().includes(term) || (g.guildId || '').includes(term);
  });

  const nodesList = data?.nodes || [];
  const selectedNode = nodesList.find(n => n.id === selectedNodeId) || nodesList[0] || null;

  const filteredNodes = nodesList.filter(n => {
    if (!nodeSearchTerm.trim()) return true;
    const term = nodeSearchTerm.toLowerCase();
    return (
      (n.name && n.name.toLowerCase().includes(term)) ||
      (n.id && n.id.toLowerCase().includes(term)) ||
      (n.host && n.host.toLowerCase().includes(term)) ||
      (n.type && n.type.toLowerCase().includes(term)) ||
      (n.status && n.status.toLowerCase().includes(term))
    );
  });

  return (
    <div style={{ maxWidth: 1280, margin: '24px auto', padding: '0 20px' }} className="fade-in">
      {/* Top Controller Overview Bar */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: 16,
        marginBottom: 24
      }}>
        <div className="glass-panel" style={{ padding: 18 }}>
          <div style={{ fontSize: 11, color: 'var(--text-sub)', fontWeight: 600, textTransform: 'uppercase' }}>
            {lang === 'th' ? 'สล็อตสตรีมเสียง (LIVE SLOTS)' : 'Live Stream Slots'}
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--slime-green)', margin: '6px 0 2px' }}>
            {data?.stats?.slots?.total ?? 0} / {data?.stats?.slots?.maxTotal ?? data?.config?.maxTotalStreams ?? 4}
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--text-sub)' }}>
            Free: {data?.stats?.slots?.free ?? 0}/{data?.stats?.slots?.maxFree ?? data?.config?.maxFreeStreams ?? 2} • Supporter Max: {data?.stats?.slots?.dynamicVipMax ?? Math.max(0, (data?.stats?.slots?.maxTotal ?? data?.config?.maxTotalStreams ?? 4) - (data?.stats?.slots?.free ?? 0))}
          </div>
        </div>

        <div className="glass-panel" style={{ padding: 18 }}>
          <div style={{ fontSize: 11, color: 'var(--text-sub)', fontWeight: 600, textTransform: 'uppercase' }}>
            {lang === 'th' ? 'โหนดประมวลผล (AUDIO CLUSTER)' : 'Audio Processing Nodes'}
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--accent-blue)', margin: '6px 0 2px' }}>
            {nodesList.filter(n => n.status === 'online').length} / {nodesList.length} Online
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--text-sub)' }}>
            {nodesList.some(n => n.type === 'remote' && n.status === 'online') ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: 'var(--accent-blue)' }}>
                <IconGlobe size={13} />
                <span>Hybrid Cloud & Residential Active</span>
              </span>
            ) : (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <IconMapPin size={13} style={{ color: 'var(--text-dim)' }} />
                <span>Local Core Only</span>
              </span>
            )}
          </div>
        </div>

        <div className="glass-panel" style={{ padding: 18 }}>
          <div style={{ fontSize: 11, color: 'var(--text-sub)', fontWeight: 600, textTransform: 'uppercase' }}>
            {lang === 'th' ? 'เซิร์ฟเวอร์ที่ติดตั้งบอท (GUILDS)' : 'Total Guilds'}
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#FFF', margin: '6px 0 2px' }}>
            {data?.guilds?.length || 0}
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--text-sub)' }}>
            {data?.guilds?.filter(g => g.isSupporter).length || 0} Supporters
          </div>
        </div>

        <div className="glass-panel" style={{ padding: 18 }}>
          <div style={{ fontSize: 11, color: 'var(--text-sub)', fontWeight: 600, textTransform: 'uppercase' }}>
            {lang === 'th' ? 'โหมดบิลลิ่ง (PAYMENT MODE)' : 'Billing Mode'}
          </div>
          <div style={{
            fontSize: 22,
            fontWeight: 800,
            color: data?.config?.paymentMode === 'production' ? 'var(--slime-green)' : 'var(--accent-yellow)',
            margin: '6px 0 2px'
          }}>
            {(data?.config?.paymentMode || 'sandbox').toUpperCase()}
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--text-sub)' }}>
            เรต: {data?.config?.price30Days ?? 29} บาท / 30 วัน
          </div>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 8,
        borderBottom: '1px solid var(--card-border)',
        paddingBottom: 12,
        marginBottom: 24
      }}>
        {[
          { id: 'nodes', label: lang === 'th' ? 'โหนดประมวลผลเสียง (Cluster)' : 'Audio Nodes', icon: <IconServer size={15} /> },
          { id: 'streams', label: `${lang === 'th' ? 'ห้องที่กำลังเล่น' : 'Live Streams'} (${data?.players?.length || 0})`, icon: <IconRadio size={15} /> },
          { id: 'guilds', label: lang === 'th' ? 'จัดการเซิร์ฟเวอร์ (Subscriptions)' : 'Guilds', icon: <IconShield size={15} /> },
          { id: 'campaigns', label: lang === 'th' ? 'ระบบแคมเปญ & เปิดตัว (Campaigns)' : 'Campaigns', icon: <IconSparkles size={15} /> },
          { id: 'drops', label: lang === 'th' ? 'แจกโค้ด (Promo Drops)' : 'Promo Drops', icon: <IconPlus size={15} /> },
          { id: 'tx', label: lang === 'th' ? 'ประวัติธุรกรรม (Audit Log)' : 'Transactions', icon: <IconActivity size={15} /> },
          { id: 'settings', label: lang === 'th' ? 'ตั้งค่าระบบ (Settings)' : 'Settings', icon: <IconSettings size={15} /> }
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setActiveSubTab(t.id)}
            className={`btn btn-sm ${activeSubTab === t.id ? 'btn-primary' : ''}`}
            style={{
              borderRadius: 8,
              padding: '8px 14px',
              fontSize: 12.5,
              whiteSpace: 'nowrap',
              border: activeSubTab === t.id ? '1px solid var(--slime-green)' : '1px solid var(--card-border)',
              background: activeSubTab === t.id ? 'var(--slime-green)' : 'rgba(17, 22, 32, 0.6)',
              color: activeSubTab === t.id ? '#080B10' : 'var(--text-sub)'
            }}
          >
            {t.icon}
            <span>{t.label}</span>
          </button>
        ))}
        <div style={{ marginLeft: 'auto' }}>
          <button
            onClick={fetchData}
            className="btn btn-sm"
            style={{ padding: '8px 12px' }}
            title="Refresh"
          >
            <IconRefresh size={13} />
          </button>
        </div>
      </div>

      {/* --- TAB 1: AUDIO PROCESSING NODES (CLUSTER & TELEMETRY) --- */}
      {activeSubTab === 'nodes' && (
        <div className="fade-in">
          {/* Scalable Node Controller Bar */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            marginBottom: 20,
            flexWrap: 'wrap',
            background: 'rgba(17, 22, 32, 0.75)',
            padding: '12px 18px',
            borderRadius: 12,
            border: '1px solid var(--card-border)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', flex: 1, minWidth: 280 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-sub)', fontSize: 13, fontWeight: 700 }}>
                <IconServer size={16} style={{ color: 'var(--slime-green)' }} />
                <span>{lang === 'th' ? 'เลือกโหนดประมวลผลเสียง:' : 'Select Audio Node:'}</span>
              </div>

              {/* Scalable Dropdown Selector */}
              <div style={{ minWidth: 260, maxWidth: 380, flex: 1 }}>
                <select
                  value={selectedNode?.id || ''}
                  onChange={(e) => setSelectedNodeId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 14px',
                    borderRadius: 9,
                    fontSize: 13,
                    fontWeight: 600,
                    background: '#0B0F17',
                    border: '1px solid var(--card-border)',
                    color: '#FFF',
                    cursor: 'pointer',
                    outline: 'none'
                  }}
                >
                  {nodesList.map(node => (
                    <option key={node.id} value={node.id}>
                      {node.status === 'online' ? '[ONLINE]' : node.status === 'draining' ? '[DRAIN]' : '[OFFLINE]'} {node.name || node.id} ({node.type?.toUpperCase()}) — {node.activeRooms || 0}/{node.maxRooms} Rooms
                    </option>
                  ))}
                </select>
              </div>

              {/* Quick Prev / Next Switchers */}
              {nodesList.length > 1 && (
                <div style={{ display: 'flex', gap: 4 }}>
                  <button
                    onClick={() => {
                      const idx = nodesList.findIndex(n => n.id === selectedNode?.id);
                      const prevIdx = (idx - 1 + nodesList.length) % nodesList.length;
                      setSelectedNodeId(nodesList[prevIdx].id);
                    }}
                    className="btn btn-sm"
                    style={{ padding: '6px 8px', borderRadius: 8 }}
                    title={lang === 'th' ? 'โหนดก่อนหน้า' : 'Previous Node'}
                  >
                    <IconChevronLeft size={14} />
                  </button>
                  <button
                    onClick={() => {
                      const idx = nodesList.findIndex(n => n.id === selectedNode?.id);
                      const nextIdx = (idx + 1) % nodesList.length;
                      setSelectedNodeId(nodesList[nextIdx].id);
                    }}
                    className="btn btn-sm"
                    style={{ padding: '6px 8px', borderRadius: 8 }}
                    title={lang === 'th' ? 'โหนดถัดไป' : 'Next Node'}
                  >
                    <IconChevronRight size={14} />
                  </button>
                </div>
              )}

              {/* Selected Node Status Pill */}
              {selectedNode && (
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 12px',
                  borderRadius: 8,
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid var(--card-border)',
                  fontSize: 12
                }}>
                  <span style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: selectedNode.status === 'online' ? 'var(--slime-green)' : (selectedNode.status === 'draining' ? 'var(--accent-yellow)' : 'var(--danger)')
                  }} />
                  <span style={{ fontWeight: 700, color: selectedNode.status === 'online' ? 'var(--slime-green)' : (selectedNode.status === 'draining' ? 'var(--accent-yellow)' : 'var(--danger)') }}>
                    {selectedNode.status?.toUpperCase()}
                  </span>
                  <span style={{ color: 'var(--text-dim)' }}>•</span>
                  <span style={{ color: 'var(--text-sub)' }}>{selectedNode.activeRooms || 0}/{selectedNode.maxRooms} Rooms</span>
                  <span style={{ color: 'var(--text-dim)' }}>•</span>
                  <span style={{ color: 'var(--text-sub)' }}>
                    {selectedNode.type === 'remote'
                      ? (selectedNode.status === 'online'
                          ? `${selectedNode.latency >= 0 ? selectedNode.latency : 0}ms • Remote`
                          : (lang === 'th' ? 'ขาดการเชื่อมต่อ • Remote' : 'Offline • Remote'))
                      : 'Local Controller'}
                  </span>
                </div>
              )}
            </div>

            {/* Add Node Action Button */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button
                onClick={() => setAddNodeModal(true)}
                className="btn btn-sm btn-primary"
                style={{
                  borderRadius: 9,
                  padding: '8px 16px',
                  fontSize: 12.5,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                <IconPlus size={14} />
                <span>{lang === 'th' ? 'เพิ่มโหนด (Add Node)' : 'Add Node'}</span>
              </button>
            </div>
          </div>

          {selectedNode ? (() => {
            const isOffline = selectedNode.status === 'offline';
            const isRemote = selectedNode.type === 'remote';

            return (
              <div style={{ marginBottom: 28 }}>
                {/* Node Metrics Cards */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))',
                  gap: 16,
                  marginBottom: 20
                }}>
                  {/* 1. Storage & Cache Card */}
                  <div className="glass-panel" style={{ padding: 20, position: 'relative' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-sub)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <IconDatabase size={14} style={{ color: 'var(--slime-green)' }} />
                          <span>{lang === 'th' ? 'ดิสก์ & แคชเพลง (STORAGE)' : 'Disk & Song Cache'}</span>
                        </div>
                        <div style={{ fontSize: 20, fontWeight: 800, color: isOffline ? 'var(--danger)' : '#FFF', margin: '8px 0 4px' }}>
                          {isOffline
                            ? (lang === 'th' ? 'โหนดออฟไลน์' : 'Node Offline')
                            : (isRemote
                                ? `${selectedNode.cache?.usedMb || 0} / ${selectedNode.cache?.maxMb || 0} MB (Cache)`
                                : `${data?.stats?.cache?.usedMb || 0} / ${data?.stats?.cache?.maxMb || 350} MB`)}
                        </div>
                        <div style={{ fontSize: 11.5, color: isOffline ? 'var(--text-dim)' : 'var(--slime-green)' }}>
                          {isOffline
                            ? (lang === 'th' ? 'ขาดการเชื่อมต่อกับโหนด' : 'Node unreachable')
                            : (isRemote
                                ? (selectedNode.disk ? `Disk รวม: ${selectedNode.disk.usedGb}G / ${selectedNode.disk.totalGb}G (ว่าง ${selectedNode.disk.freeMb}M)` : 'Disk: พร้อมใช้งาน')
                                : `Disk ว่าง: ${data?.stats?.disk?.freeMb || 0} MB`)}
                        </div>
                      </div>
                      <button
                        onClick={() => handleClearNodeCache(selectedNode.id)}
                        className="btn btn-sm btn-danger"
                        style={{ padding: '6px 10px', fontSize: 11 }}
                        title="Clear Cache"
                        disabled={isOffline}
                      >
                        <IconTrash size={12} />
                        <span>{lang === 'th' ? 'ล้างแคช' : 'Clear'}</span>
                      </button>
                    </div>
                    {/* Cache usage progress bar */}
                    <div style={{ width: '100%', height: 4, background: '#1E2838', borderRadius: 2, overflow: 'hidden', marginTop: 10 }}>
                      <div style={{
                        width: isOffline
                          ? '0%'
                          : `${Math.min(100, Math.round(((isRemote ? (selectedNode.cache?.usedMb || 0) : (data?.stats?.cache?.usedMb || 0)) / (isRemote ? (selectedNode.cache?.maxMb || 1) : (data?.stats?.cache?.maxMb || 350))) * 100))}%`,
                        height: '100%',
                        background: 'var(--slime-green)'
                      }} />
                    </div>
                  </div>

                  {/* 2. Bandwidth Monthly Quota Card */}
                  <div className="glass-panel" style={{ padding: 20 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-sub)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <IconWifi size={14} style={{ color: 'var(--accent-blue)' }} />
                      <span>{lang === 'th' ? 'แบนด์วิธ (MONTHLY QUOTA)' : 'Bandwidth Quota'}</span>
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: isOffline ? 'var(--danger)' : '#FFF', margin: '8px 0 4px' }}>
                      {isOffline
                        ? (lang === 'th' ? 'โหนดออฟไลน์' : 'Node Offline')
                        : (isRemote
                            ? `${selectedNode.bandwidth?.usedGb || 0} GB / ${selectedNode.bandwidth?.quotaGb || 1000} GB (${selectedNode.bandwidth?.percent || 0}%)`
                            : `${data?.stats?.bandwidth?.usedGb || 0} GB / ${data?.stats?.bandwidth?.quotaGb || 800} GB (${data?.stats?.bandwidth?.percent || 0}%)`)}
                    </div>
                    <div style={{ fontSize: 11.5, color: isOffline ? 'var(--text-dim)' : 'var(--slime-green)' }}>
                      {isOffline
                        ? 'Tx: - • Rx: -'
                        : (isRemote
                            ? `Tx: ${selectedNode.bandwidth?.txGb || 0} GB • Rx: ${selectedNode.bandwidth?.rxGb || 0} GB`
                            : `Tx: ${data?.stats?.bandwidth?.txGb || 0} GB • Rx: ${data?.stats?.bandwidth?.rxGb || 0} GB`)}
                    </div>
                    <div style={{ width: '100%', height: 4, background: '#1E2838', borderRadius: 2, overflow: 'hidden', marginTop: 10 }}>
                      <div style={{
                        width: isOffline
                          ? '0%'
                          : `${isRemote ? (selectedNode.bandwidth?.percent || 0) : (data?.stats?.bandwidth?.percent || 0)}%`,
                        height: '100%',
                        background: 'var(--accent-blue)'
                      }} />
                    </div>
                  </div>

                  {/* 3. Network & VPN Card */}
                  <div className="glass-panel" style={{ padding: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-sub)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <IconRadio size={14} style={{ color: 'var(--cyber-pink)' }} />
                          <span>{lang === 'th' ? 'เครือข่าย & VPN' : 'Network & VPN'}</span>
                        </div>
                        <div style={{ fontSize: 17, fontWeight: 800, color: '#FFF', margin: '8px 0 4px' }}>
                          {isRemote
                            ? (selectedNode.vpn?.server || 'Residential / Direct')
                            : (data?.stats?.vpn?.server || 'Direct')}
                          <span style={{
                            fontSize: 11,
                            color: isOffline ? 'var(--danger)' : 'var(--slime-green)',
                            marginLeft: 8
                          }}>
                            {isOffline
                              ? '(Offline)'
                              : (isRemote
                                  ? '(Online)'
                                  : (data?.stats?.vpn?.connected ? '(VPN Active)' : '(Online)'))}
                          </span>
                        </div>
                        <div style={{ fontSize: 11.5, color: 'var(--text-sub)' }}>
                          Exit IP: <strong style={{ color: isOffline ? 'var(--text-sub)' : 'var(--slime-green)' }}>
                            {isOffline
                              ? (selectedNode.host || '-')
                              : (isRemote
                                  ? (selectedNode.vpn?.exitIp || selectedNode.host || 'Direct')
                                  : (data?.stats?.vpn?.exitIp || 'Direct'))}
                          </strong>
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>
                          Circuit: <strong style={{ color: isOffline ? 'var(--danger)' : (isRemote ? (selectedNode.circuit?.isOpen ? 'var(--danger)' : 'var(--slime-green)') : (data?.stats?.circuit?.isOpen ? 'var(--danger)' : 'var(--slime-green)')) }}>
                            {isOffline
                              ? 'DISCONNECTED'
                              : (isRemote
                                  ? (selectedNode.circuit?.status || 'CLOSED')
                                  : (data?.stats?.circuit?.status || 'CLOSED'))}
                          </strong>
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <button
                          onClick={() => handleSwitchNodeVpn(selectedNode.id)}
                          className="btn btn-sm btn-pink"
                          style={{ padding: '4px 8px', fontSize: 11 }}
                          title="Switch VPN Server"
                          disabled={isOffline || isRemote}
                        >
                          <IconRotateClockwise size={11} />
                          <span>{lang === 'th' ? 'สลับ' : 'Switch'}</span>
                        </button>
                        {((isRemote && selectedNode.circuit?.isOpen) || (!isRemote && data?.stats?.circuit?.isOpen)) && (
                          <button
                            onClick={() => handleResetNodeCircuit(selectedNode.id)}
                            className="btn btn-sm btn-danger"
                            style={{ padding: '4px 8px', fontSize: 11 }}
                            disabled={isOffline}
                          >
                            Reset
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 4. Streams & Compute Load */}
                  <div className="glass-panel" style={{ padding: 20 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-sub)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <IconActivity size={14} style={{ color: 'var(--accent-yellow)' }} />
                      <span>{lang === 'th' ? 'ภาระสตรีม & โหลดซีพียู (STREAMS & LOAD)' : 'Streams & Compute Load'}</span>
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: '#FFF', margin: '8px 0 4px' }}>
                      Streams: <span style={{ color: isOffline ? 'var(--danger)' : 'var(--slime-green)' }}>
                        {isOffline ? '0' : (selectedNode.activeRooms || 0)}
                      </span> / {selectedNode.maxRooms || (selectedNode.id === 'local-0' ? (data?.config?.maxTotalStreams ?? 4) : 15)}
                      <span style={{ fontSize: 12, color: 'var(--text-sub)', marginLeft: 6 }}>
                        {isOffline ? '(Offline)' : `Rooms (${Math.round(((selectedNode.activeRooms || 0) / Math.max(1, selectedNode.maxRooms || 4)) * 100)}%)`}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 12, fontSize: 11.5, color: 'var(--text-sub)', margin: '2px 0 6px' }}>
                      <span>Free: <strong style={{ color: 'var(--slime-green)' }}>{selectedNode.activeFreeRooms || 0}/{selectedNode.maxFreeRooms ?? selectedNode.maxRooms ?? 4}</strong></span>
                      <span>VIP: <strong style={{ color: 'var(--cyber-pink)' }}>{selectedNode.activeSupporterRooms || 0}/{Math.max(0, (selectedNode.maxRooms || 4) - (selectedNode.maxFreeRooms ?? selectedNode.maxRooms ?? 4))}</strong></span>
                    </div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-sub)' }}>
                      Stream Guard: <strong style={{ color: isOffline ? 'var(--text-dim)' : 'var(--accent-yellow)' }}>
                        {isOffline ? '-' : `${selectedNode.activeSpawns || 0} / ${selectedNode.maxSpawns || (isRemote ? 2 : 1)} Spawns (Queue: ${selectedNode.queuedSpawns || 0})`}
                      </strong>
                    </div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-sub)', marginTop: 2 }}>
                      CPU: {isOffline ? 'Offline' : (isRemote ? (selectedNode.cpu || '-') : (data?.stats?.cpuDisplay || '-'))}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>
                      RAM: {isOffline ? 'Offline' : (isRemote ? (selectedNode.hostRam || selectedNode.ram || '-') : (data?.stats?.hostRam?.display || '-'))}
                    </div>
                  </div>
                </div>

                {/* Node Management Actions */}
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => handleToggleDrain(selectedNode.id)}
                    className={`btn btn-sm ${selectedNode.status === 'draining' ? 'btn-primary' : 'btn-danger'}`}
                  >
                    <IconPower size={13} />
                    <span>{selectedNode.status === 'draining' ? (lang === 'th' ? 'ยกเลิกโหมด Drain (กลับสู่ปกติ)' : 'Resume Node') : (lang === 'th' ? 'เปิดโหมด Drain (ไม่รับงานใหม่)' : 'Drain Node')}</span>
                  </button>
                  <button
                    onClick={() => {
                      setEditNodeModal(selectedNode);
                      setNodeNameInput(selectedNode.name || selectedNode.id);
                      const maxR = selectedNode.maxRooms ?? (selectedNode.id === 'local-0' ? (data?.config?.maxTotalStreams ?? 4) : 15);
                      setNodeMaxRoomsInput(maxR);
                      setNodeMaxFreeRoomsInput(selectedNode.maxFreeRooms !== undefined ? selectedNode.maxFreeRooms : maxR);
                    }}
                    className="btn btn-sm"
                  >
                    <IconAdjustments size={13} />
                    <span>{lang === 'th' ? 'แก้ไขชื่อ / ความจุโหนด' : 'Edit Node Settings'}</span>
                  </button>
                </div>
              </div>
            );
          })() : null}

          {/* All Nodes Cluster Table */}
          <div className="glass-panel" style={{ padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <IconServer size={16} style={{ color: 'var(--slime-green)' }} />
                <span>{lang === 'th' ? `รายชื่อโหนดในคลัสเตอร์ทั้งหมด (${nodesList.length})` : `Cluster Nodes (${nodesList.length})`}</span>
              </h3>

              {/* Node Search Bar for Scalable Cluster Management */}
              <div style={{ position: 'relative', width: 260, maxWidth: '100%' }}>
                <IconSearch size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-sub)' }} />
                <input
                  type="text"
                  value={nodeSearchTerm}
                  onChange={(e) => setNodeSearchTerm(e.target.value)}
                  placeholder={lang === 'th' ? 'ค้นหาโหนด (ชื่อ, IP, ประเภท)...' : 'Filter nodes by name, IP...'}
                  style={{
                    width: '100%',
                    padding: '7px 12px 7px 30px',
                    borderRadius: 8,
                    fontSize: 12,
                    background: '#0B0F17',
                    border: '1px solid var(--card-border)',
                    color: '#FFF',
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>{lang === 'th' ? 'ชื่อโหนด' : 'Node Name'}</th>
                    <th>{lang === 'th' ? 'ประเภท' : 'Type'}</th>
                    <th>Host / IP</th>
                    <th>{lang === 'th' ? 'สถานะ' : 'Status'}</th>
                    <th>CPU / RAM</th>
                    <th>{lang === 'th' ? 'ภาระสตรีม' : 'Streams'}</th>
                    <th>{lang === 'th' ? 'สล็อต Spawn' : 'Spawns'}</th>
                    <th>Latency</th>
                    <th>{lang === 'th' ? 'จัดการ' : 'Action'}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredNodes.length === 0 ? (
                    <tr>
                      <td colSpan="9" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-dim)', fontSize: 13 }}>
                        {lang === 'th' ? 'ไม่พบโหนดที่ตรงกับคำค้นหา' : 'No matching nodes found'}
                      </td>
                    </tr>
                  ) : (
                    filteredNodes.map(n => (
                      <tr 
                        key={n.id}
                        onClick={() => setSelectedNodeId(n.id)}
                        style={{
                          cursor: 'pointer',
                          background: selectedNodeId === n.id ? 'rgba(0, 255, 136, 0.08)' : undefined,
                          borderLeft: selectedNodeId === n.id ? '3px solid var(--slime-green)' : '3px solid transparent',
                          transition: 'background 0.15s ease'
                        }}
                      >
                        <td style={{ fontWeight: 700, color: '#FFF' }}>{n.name || n.id}</td>
                        <td>
                          <span style={{
                            fontSize: 10,
                            padding: '2px 8px',
                            borderRadius: 6,
                            background: n.type === 'remote' ? 'rgba(0, 210, 255, 0.15)' : 'rgba(255, 255, 255, 0.08)',
                            color: n.type === 'remote' ? 'var(--accent-blue)' : '#FFF'
                          }}>
                            {n.type?.toUpperCase()}
                          </span>
                        </td>
                        <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{n.host}:{n.port || 2333}</td>
                        <td>
                          <span style={{
                            fontWeight: 700,
                            fontSize: 11,
                            color: n.status === 'online' ? 'var(--slime-green)' : (n.status === 'draining' ? 'var(--accent-yellow)' : 'var(--danger)')
                          }}>
                            ● {n.status?.toUpperCase()}
                          </span>
                        </td>
                        <td style={{ fontSize: 11.5 }}>
                          {n.cpu || '-'} • {n.ram || '-'}
                        </td>
                        <td style={{ fontWeight: 700 }}>
                          <div>
                            <span style={{ color: 'var(--slime-green)' }}>{n.activeRooms ?? 0}</span> / {n.maxRooms ?? (n.id === 'local-0' ? (data?.config?.maxTotalStreams ?? 4) : 15)}
                          </div>
                          <div style={{ fontSize: 10, color: 'var(--text-sub)', fontWeight: 500 }}>
                            F: {n.activeFreeRooms ?? 0}/{n.maxFreeRooms ?? n.maxRooms} • VIP: {n.activeSupporterRooms ?? 0}/{Math.max(0, (n.maxRooms || 0) - (n.maxFreeRooms ?? n.maxRooms))}
                          </div>
                        </td>
                        <td style={{ fontSize: 11.5 }}>
                          {n.activeSpawns || 0}/{n.maxSpawns || 2} (Q: {n.queuedSpawns || 0})
                        </td>
                        <td style={{ fontSize: 11.5 }}>
                          {n.latency >= 0 ? `${n.latency} ms` : '-'}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 6 }} onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => setSelectedNodeId(n.id)}
                              className="btn btn-sm"
                              style={{ padding: '4px 8px', fontSize: 11 }}
                            >
                              {lang === 'th' ? 'เลือกดู' : 'Inspect'}
                            </button>
                            {n.type === 'remote' && (
                              <button
                                onClick={() => handleDeleteNode(n.id, n.name)}
                                className="btn btn-sm btn-danger"
                                style={{ padding: '4px 8px', fontSize: 11 }}
                                title="Delete Node"
                              >
                                <IconTrash size={11} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* --- TAB 2: LIVE STREAMS / PLAYERS --- */}
      {activeSubTab === 'streams' && (
        <div className="glass-panel fade-in" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <IconRadio size={16} style={{ color: 'var(--slime-green)' }} />
            <span>{lang === 'th' ? 'ห้องที่กำลังเล่นเพลง (Live Streams)' : 'Active Discord Audio Sessions'}</span>
          </h3>

          <div style={{ overflowX: 'auto' }}>
            <table className="custom-table">
              <thead>
                <tr>
                  <th>{lang === 'th' ? 'เซิร์ฟเวอร์' : 'Guild'}</th>
                  <th>{lang === 'th' ? 'เพลงที่เล่นอยู่' : 'Track Title'}</th>
                  <th>{lang === 'th' ? 'ต้นทาง' : 'Source'}</th>
                  <th>{lang === 'th' ? 'ความยาว & ผู้ฟัง' : 'Progress & Listeners'}</th>
                  <th>{lang === 'th' ? 'โหนด' : 'Node'}</th>
                  <th>{lang === 'th' ? 'จัดการ' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody>
                {(data?.players || []).length > 0 ? (
                  data.players.map(p => (
                    <tr key={p.guildId}>
                      <td style={{ fontWeight: 700, color: '#FFF' }}>
                        {p.guildName}
                        {p.isSupporter && <span className="slime-badge" style={{ marginLeft: 6, fontSize: 9 }}>SUPPORTER</span>}
                      </td>
                      <td style={{ maxWidth: 280, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {p.trackTitle}
                      </td>
                      <td>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5,
                          fontSize: 11,
                          fontWeight: 600,
                          padding: '2px 8px',
                          borderRadius: 6,
                          background: (p.sourceType === 'soundcloud' || p.source?.toLowerCase().includes('soundcloud')) ? 'rgba(255, 85, 0, 0.15)' : 'rgba(255, 0, 0, 0.15)',
                          color: (p.sourceType === 'soundcloud' || p.source?.toLowerCase().includes('soundcloud')) ? '#FF7700' : '#FF4444',
                          border: `1px solid ${(p.sourceType === 'soundcloud' || p.source?.toLowerCase().includes('soundcloud')) ? 'rgba(255, 85, 0, 0.3)' : 'rgba(255, 0, 0, 0.3)'}`
                        }}>
                          {(p.sourceType === 'soundcloud' || p.source?.toLowerCase().includes('soundcloud')) ? (
                            <IconCloud size={12} />
                          ) : (
                            <IconPlayerPlay size={10} fill="currentColor" />
                          )}
                          <span>{(p.sourceType === 'soundcloud' || p.source?.toLowerCase().includes('soundcloud')) ? 'SoundCloud' : 'YouTube'}</span>
                        </span>
                      </td>
                      <td style={{ fontSize: 12 }}>
                        {p.elapsed} • <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><IconUsers size={12} /> {p.listeners || 0}</span>
                      </td>
                      <td>
                        <span style={{ fontSize: 11, padding: '2px 6px', borderRadius: 4, background: '#1A2230' }}>
                          {p.nodeName}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            onClick={() => handlePlayerAction(p.guildId, 'skip')}
                            className="btn btn-sm"
                            style={{ padding: '4px 8px' }}
                            title="Skip"
                          >
                            <IconPlayerSkipForward size={12} />
                          </button>
                          <button
                            onClick={() => handlePlayerAction(p.guildId, 'stop')}
                            className="btn btn-sm btn-danger"
                            style={{ padding: '4px 8px' }}
                            title="Stop"
                          >
                            <IconPlayerStop size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-dim)' }}>
                      {lang === 'th' ? 'ไม่มีห้องที่กำลังเล่นเพลงอยู่ครับ' : 'No active playback sessions'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- TAB 3: GUILD SUBSCRIPTIONS & COMPENSATION --- */}
      {activeSubTab === 'guilds' && (
        <div className="glass-panel fade-in" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
              <IconShield size={16} style={{ color: 'var(--slime-green)' }} />
              <span>{lang === 'th' ? 'จัดการวันใช้งานเซิร์ฟเวอร์ (Subscriptions)' : 'Guild Subscriptions'}</span>
            </h3>
            <div style={{ width: 260 }}>
              <input
                type="text"
                placeholder={lang === 'th' ? 'ค้นหาชื่อ หรือ Guild ID...' : 'Search guild...'}
                value={guildSearch}
                onChange={(e) => setGuildSearch(e.target.value)}
                style={{ padding: '6px 12px', fontSize: 12 }}
              />
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="custom-table">
              <thead>
                <tr>
                  <th>{lang === 'th' ? 'ชื่อเซิร์ฟเวอร์' : 'Guild Name'}</th>
                  <th>{lang === 'th' ? 'สถานะ' : 'Status'}</th>
                  <th>{lang === 'th' ? 'วันหมดอายุ' : 'Expiry'}</th>
                  <th>{lang === 'th' ? 'รหัสชวน' : 'Referral'}</th>
                  <th>{lang === 'th' ? 'ชดเชยวัน' : 'Adjust Days'}</th>
                  <th>{lang === 'th' ? 'การจัดการ' : 'Action'}</th>
                </tr>
              </thead>
              <tbody>
                {filteredGuilds.map(g => (
                  <tr key={g.guildId}>
                    <td>
                      <div style={{ fontWeight: 700, color: '#FFF' }}>{g.guildName}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>ID: {g.guildId}</div>
                    </td>
                    <td>
                      {g.isBanned ? (
                        <span style={{ color: 'var(--danger)', fontWeight: 700, fontSize: 11 }}>BANNED</span>
                      ) : g.isSupporter ? (
                        <span className="slime-badge" style={{ fontSize: 10 }}>SUPPORTER</span>
                      ) : (
                        <span style={{ color: 'var(--text-dim)', fontSize: 11 }}>FREE</span>
                      )}
                    </td>
                    <td style={{ fontSize: 12 }}>
                      {g.expiresAt && g.expiresAt > Date.now() ? (
                        <span>{new Date(g.expiresAt).toLocaleDateString('th-TH')} ({Math.ceil((g.expiresAt - Date.now()) / (1000 * 60 * 60 * 24))} วัน)</span>
                      ) : (
                        <span style={{ color: 'var(--text-dim)' }}>-</span>
                      )}
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: 12 }}>
                      {g.referralCode || '-'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                        <button
                          onClick={() => handleAdjustGuildDays(g.guildId, 7)}
                          className="btn btn-sm"
                          style={{ padding: '3px 7px', fontSize: 11 }}
                          title={lang === 'th' ? 'เพิ่ม 7 วันทันที' : 'Add 7 days'}
                        >
                          +7d
                        </button>
                        <button
                          onClick={() => handleAdjustGuildDays(g.guildId, 30)}
                          className="btn btn-sm btn-primary"
                          style={{ padding: '3px 7px', fontSize: 11 }}
                          title={lang === 'th' ? 'เพิ่ม 30 วันทันที' : 'Add 30 days'}
                        >
                          +30d
                        </button>
                        <button
                          onClick={() => {
                            setAdjustDaysModal(g);
                            setAdjustMode('offset');
                            setAdjustType('add');
                            setAdjustDaysValue(7);
                            setAdjustReason('');
                            setAdjustDateValue(g.expiresAt && g.expiresAt > Date.now() ? new Date(g.expiresAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
                          }}
                          className="btn btn-sm"
                          style={{
                            padding: '3px 8px',
                            fontSize: 11,
                            background: 'rgba(0, 210, 255, 0.12)',
                            border: '1px solid var(--accent-blue)',
                            color: 'var(--accent-blue)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 3
                          }}
                          title={lang === 'th' ? 'ปรับแต่งวันใช้งานแบบกำหนดเอง (เพิ่ม/หักวัน หรือกำหนดวันที่)' : 'Custom adjustment (Add/Deduct/Set Date)'}
                        >
                          <IconAdjustments size={11} />
                          <span>{lang === 'th' ? 'กำหนดเอง' : 'Custom'}</span>
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(lang === 'th' ? `ยืนยันรีเซ็ตวันใช้งานของ ${g.guildName} เป็น FREE?` : `Reset ${g.guildName} to FREE?`)) {
                              handleResetGuild(g.guildId);
                            }
                          }}
                          className="btn btn-sm btn-danger"
                          style={{ padding: '3px 7px', fontSize: 11 }}
                          title={lang === 'th' ? 'รีเซ็ตสถานะเป็น FREE ทันที' : 'Reset to FREE'}
                        >
                          Reset
                        </button>
                      </div>
                    </td>
                    <td>
                      {g.isBanned ? (
                        <button
                          onClick={() => handleUnbanGuild(g.guildId)}
                          className="btn btn-sm btn-primary"
                          style={{ padding: '3px 8px', fontSize: 11 }}
                        >
                          Unban
                        </button>
                      ) : (
                        <button
                          onClick={() => setBanModal({ guildId: g.guildId, guildName: g.guildName })}
                          className="btn btn-sm btn-danger"
                          style={{ padding: '3px 8px', fontSize: 11 }}
                        >
                          Ban
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- TAB: DYNAMIC EVENTS & SYSTEM CAMPAIGNS --- */}
      {activeSubTab === 'campaigns' && (() => {
        const campaigns = data?.systemCampaigns || [];
        const now = Date.now();
        const activeCamp = campaigns.find(c => c.isActive && now >= c.startsAt && now <= c.endsAt);

        const formatDt = (ts) => {
          if (!ts) return '-';
          const d = new Date(ts);
          return `${d.toLocaleDateString(lang === 'th' ? 'th-TH' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' })} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
        };

        const getStatusBadge = (c) => {
          if (!c.isActive) {
            return <span className="slime-badge" style={{ background: 'rgba(100, 116, 139, 0.2)', color: '#94A3B8', border: '1px solid rgba(100, 116, 139, 0.4)' }}>{lang === 'th' ? 'ปิดใช้งาน' : 'Disabled'}</span>;
          }
          if (now < c.startsAt) {
            return <span className="slime-badge slime-badge-warning">{lang === 'th' ? 'ตั้งเวลาล่วงหน้า' : 'Scheduled'}</span>;
          }
          if (now > c.endsAt) {
            return <span className="slime-badge slime-badge-danger">{lang === 'th' ? 'สิ้นสุดแล้ว' : 'Ended'}</span>;
          }
          return <span className="slime-badge" style={{ background: 'rgba(0, 255, 136, 0.15)', color: 'var(--slime-green)', border: '1px solid rgba(0, 255, 136, 0.4)' }}>{lang === 'th' ? 'กำลังทำงาน' : 'Active'}</span>;
        };

        return (
          <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* 1. Header & Actions */}
            <div className="glass-panel" style={{ padding: 22 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    background: 'rgba(0, 255, 136, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--slime-green)'
                  }}>
                    <IconSparkles size={22} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: 17, fontWeight: 700, margin: 0, color: '#FFF' }}>
                      {lang === 'th' ? 'ระบบแคมเปญ & จัดการการเปิดตัว (Dynamic Events & Launch)' : 'System Campaigns & Launch Engine'}
                    </h3>
                    <div style={{ fontSize: 12, color: 'var(--text-sub)', marginTop: 2 }}>
                      {lang === 'th'
                        ? 'สร้างและควบคุมแคมเปญเปิดตัว ปลดล็อกสิทธิ์ทดลองฟรี คุมเพดานห้องสตรีม และนโยบายวันหมดอายุ'
                        : 'Manage launch events, free trials, concurrent room quotas, and dynamic topup expiry policies'}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <button
                    onClick={handleOpenCreateCampaign}
                    className="btn btn-sm btn-primary"
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', fontWeight: 700 }}
                  >
                    <IconPlus size={15} />
                    <span>{lang === 'th' ? 'สร้างแคมเปญใหม่' : 'Create Campaign'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* 2. Active Campaign Status Card */}
            {activeCamp ? (
              <div className="glass-panel" style={{
                padding: 22,
                border: '1px solid rgba(0, 255, 136, 0.45)',
                boxShadow: '0 0 25px rgba(0, 255, 136, 0.08)',
                background: 'linear-gradient(180deg, rgba(0, 255, 136, 0.05) 0%, rgba(17, 24, 39, 0.7) 100%)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 14, marginBottom: 16 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <span className="slime-badge" style={{ background: 'rgba(0, 255, 136, 0.2)', color: 'var(--slime-green)', border: '1px solid var(--slime-green)', fontWeight: 800 }}>
                        {activeCamp.announcement?.badgeText || '✦ ACTIVE CAMPAIGN'}
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--text-sub)' }}>ID: {activeCamp.id}</span>
                    </div>
                    <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0, color: '#FFFFFF' }}>
                      {activeCamp.name}
                    </h2>
                    <div style={{ fontSize: 13, color: '#94A3B8', marginTop: 4, maxWidth: 700 }}>
                      {activeCamp.announcement?.bannerSubtitle || 'ไม่มีรายละเอียด'}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button
                      onClick={() => handleToggleCampaign(activeCamp.id, activeCamp.isActive)}
                      className="btn btn-sm"
                      style={{
                        background: 'rgba(239, 68, 68, 0.15)',
                        border: '1px solid rgba(239, 68, 68, 0.4)',
                        color: '#EF4444',
                        fontWeight: 700,
                        padding: '7px 14px'
                      }}
                      title="Kill Switch"
                    >
                      <IconPower size={14} />
                      <span>{lang === 'th' ? 'ปิดแคมเปญทันที (Kill Switch)' : 'Kill Switch'}</span>
                    </button>
                    <button
                      onClick={() => handleOpenEditCampaign(activeCamp)}
                      className="btn btn-sm"
                      style={{ padding: '7px 14px' }}
                    >
                      <IconEdit size={14} />
                      <span>{lang === 'th' ? 'แก้ไข' : 'Edit'}</span>
                    </button>
                  </div>
                </div>

                {/* Specs Grid */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: 12,
                  padding: 14,
                  borderRadius: 12,
                  background: 'rgba(10, 15, 25, 0.6)',
                  border: '1px solid var(--card-border)'
                }}>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 2 }}>{lang === 'th' ? 'สิทธิ์ SUPPORTER' : 'Supporter Perks'}</div>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: activeCamp.perks?.grantSupporterToAll ? 'var(--slime-green)' : '#FFF' }}>
                      {activeCamp.perks?.grantSupporterToAll ? (lang === 'th' ? 'ปลดล็อกทุกเซิร์ฟเวอร์ (Free for All)' : 'Free for All Servers') : (lang === 'th' ? 'เฉพาะผู้ร่วมโดเนท' : 'Standard')}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 2 }}>{lang === 'th' ? 'เพดานห้องพร้อมกัน' : 'Max Concurrent Rooms'}</div>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: '#38BDF8' }}>
                      {activeCamp.perks?.maxConcurrentRooms || 50} {lang === 'th' ? 'ห้องทั่วระบบ' : 'Rooms Total'}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 2 }}>{lang === 'th' ? 'นโยบายวันหมดอายุ' : 'Expiry Policy'}</div>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: '#FBBF24' }}>
                      {activeCamp.topupPolicy?.expiryPolicy === 'deferred_stack'
                        ? (lang === 'th' ? 'Deferred Stack (นับต่อจากวันจบแคมเปญ)' : 'Deferred Stack')
                        : (activeCamp.topupPolicy?.expiryPolicy === 'fixed_target'
                          ? (lang === 'th' ? 'Fixed Target (ตัดจบตามวันที่กำหนด)' : 'Fixed Target')
                          : (lang === 'th' ? 'Standard (ทบปกติ)' : 'Standard'))}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 2 }}>{lang === 'th' ? 'เพดานสะสมสูงสุด' : 'Max Accumulated Days'}</div>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: '#FFF' }}>
                      {activeCamp.topupPolicy?.maxAccumulatedDays || 37} {lang === 'th' ? 'วัน' : 'days'}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 2 }}>{lang === 'th' ? 'ระยะเวลาแคมเปญ' : 'Campaign Duration'}</div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#E2E8F0' }}>
                      {formatDt(activeCamp.startsAt)} - {formatDt(activeCamp.endsAt)}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="glass-panel" style={{ padding: '24px 20px', textAlign: 'center', border: '1px dashed var(--card-border)' }}>
                <div style={{ color: 'var(--text-sub)', fontSize: 13.5 }}>
                  {lang === 'th'
                    ? 'ขณะนี้ไม่มีแคมเปญที่เปิดใช้งานอยู่ — ระบบกำลังทำงานในโหมดปกติ (Standard Mode โควตาปกติ)'
                    : 'No active campaign running — the system is currently operating in Standard Mode.'}
                </div>
              </div>
            )}

            {/* 3. All Campaigns List Table */}
            <div className="glass-panel" style={{ padding: 22 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h4 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: '#FFF' }}>
                  {lang === 'th' ? 'รายการแคมเปญทั้งหมด' : 'All Campaigns'} ({campaigns.length})
                </h4>
              </div>

              {campaigns.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-dim)', fontSize: 13 }}>
                  {lang === 'th' ? 'ยังไม่มีข้อมูลแคมเปญ' : 'No campaigns created yet'}
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="custom-table" style={{ margin: 0 }}>
                    <thead>
                      <tr>
                        <th>{lang === 'th' ? 'ชื่อแคมเปญ' : 'Campaign Name'}</th>
                        <th>{lang === 'th' ? 'สถานะ' : 'Status'}</th>
                        <th>{lang === 'th' ? 'ระยะเวลา' : 'Timeframe'}</th>
                        <th>{lang === 'th' ? 'สิทธิ์ / โควตาห้อง' : 'Perks & Rooms'}</th>
                        <th>{lang === 'th' ? 'นโยบายเติมเงิน' : 'Topup Rules'}</th>
                        <th style={{ textAlign: 'right' }}>{lang === 'th' ? 'จัดการ' : 'Actions'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {campaigns.map(c => (
                        <tr key={c.id}>
                          <td>
                            <div style={{ fontWeight: 700, color: '#FFF', fontSize: 13 }}>{c.name}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: 'monospace' }}>{c.id}</div>
                          </td>
                          <td>{getStatusBadge(c)}</td>
                          <td style={{ fontSize: 12, color: 'var(--text-sub)', whiteSpace: 'nowrap' }}>
                            <div>{formatDt(c.startsAt)}</div>
                            <div style={{ color: 'var(--text-dim)' }}>ถึง {formatDt(c.endsAt)}</div>
                          </td>
                          <td style={{ fontSize: 12 }}>
                            <div style={{ color: c.perks?.grantSupporterToAll ? 'var(--slime-green)' : '#94A3B8' }}>
                              {c.perks?.grantSupporterToAll ? (lang === 'th' ? 'ปลด Supporter ทุกเซิร์ฟ' : 'Supporter for All') : (lang === 'th' ? 'โหมดปกติ' : 'Standard')}
                            </div>
                            <div style={{ fontSize: 11, color: '#38BDF8' }}>
                              {c.perks?.maxConcurrentRooms || 50} {lang === 'th' ? 'ห้องพร้อมกัน' : 'rooms cap'}
                            </div>
                          </td>
                          <td style={{ fontSize: 12, color: '#E2E8F0' }}>
                            <div>
                              <span style={{ color: '#FBBF24', fontWeight: 600 }}>{c.topupPolicy?.expiryPolicy || 'deferred_stack'}</span>
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                              {lang === 'th' ? `เพดาน ${c.topupPolicy?.maxAccumulatedDays || 37} วัน` : `Cap ${c.topupPolicy?.maxAccumulatedDays || 37}d`}
                            </div>
                          </td>
                          <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                            <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                              <button
                                onClick={() => handleToggleCampaign(c.id, c.isActive)}
                                className="btn btn-sm"
                                style={{
                                  padding: '5px 10px',
                                  fontSize: 11,
                                  color: c.isActive ? 'var(--slime-green)' : 'var(--text-dim)',
                                  background: c.isActive ? 'rgba(0, 255, 136, 0.1)' : 'rgba(255, 255, 255, 0.05)'
                                }}
                                title={c.isActive ? 'Disable' : 'Enable'}
                              >
                                {c.isActive ? <IconToggleRight size={16} /> : <IconToggleLeft size={16} />}
                              </button>
                              <button
                                onClick={() => handleOpenEditCampaign(c)}
                                className="btn btn-sm"
                                style={{ padding: '5px 10px', fontSize: 11 }}
                                title="Edit"
                              >
                                <IconEdit size={14} />
                              </button>
                              <button
                                onClick={() => handleDeleteCampaign(c.id, c.name)}
                                className="btn btn-sm"
                                style={{ padding: '5px 10px', fontSize: 11, color: '#EF4444' }}
                                title="Delete"
                              >
                                <IconTrash size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* --- TAB 4: CAMPAIGNS & PROMOTIONS (REFERRAL + EARLY-BIRD DROPS) --- */}
      {activeSubTab === 'drops' && (() => {
        const guildList = data?.guilds || [];
        const referralActiveGuilds = guildList.filter(g => (g.referralCount || 0) > 0);
        const totalReferralSuccess = referralActiveGuilds.reduce((acc, g) => acc + (g.referralCount || 0), 0);
        const refExp = data?.config?.referralExpiresAt;
        const isRefExpired = refExp && refExp <= Date.now();

        return (
          <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* 1. REFERRAL SEASON CAMPAIGN MANAGER */}
            <div className="glass-panel" style={{ padding: 22 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, flexWrap: 'wrap', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: 'rgba(255, 46, 147, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--cyber-pink)'
                  }}>
                    <IconShare size={18} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span>{lang === 'th' ? 'แคมเปญชวนเพื่อนรับวันฟรี (Referral Season)' : 'Referral Season Campaign'}</span>
                      <span className={`slime-badge ${!referralForm.enabled ? 'slime-badge-danger' : (isRefExpired ? 'slime-badge-warning' : '')}`} style={{
                        fontSize: 10.5
                      }}>
                        {referralForm.enabled ? (!isRefExpired ? (lang === 'th' ? 'กำลังเปิดรับสิทธิ์' : 'ACTIVE') : (lang === 'th' ? 'หมดเขต Season แล้ว' : 'EXPIRED')) : (lang === 'th' ? 'ปิดรับสิทธิ์ชั่วคราว' : 'PAUSED')}
                      </span>
                    </h3>
                    <div style={{ fontSize: 11.5, color: 'var(--text-sub)', marginTop: 2 }}>
                      {lang === 'th' ? 'ควบคุมกติกาการชวนเพื่อน ยอดเติมขั้นต่ำ วันรางวัล และวันหมดเขตของซีซั่น' : 'Configure minimum topup threshold, reward days, max cap, and season expiration'}
                    </div>
                  </div>
                </div>

                {/* Season Quick Stats */}
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <div style={{ padding: '6px 12px', background: 'rgba(255, 255, 255, 0.04)', borderRadius: 8, border: '1px solid var(--card-border)', fontSize: 11.5 }}>
                    <span style={{ color: 'var(--text-sub)' }}>{lang === 'th' ? 'กิลด์ที่เริ่มชวน:' : 'Active Referrers:'} </span>
                    <strong style={{ color: '#FFF' }}>{referralActiveGuilds.length}</strong>
                  </div>
                  <div style={{ padding: '6px 12px', background: 'rgba(255, 255, 255, 0.04)', borderRadius: 8, border: '1px solid var(--card-border)', fontSize: 11.5 }}>
                    <span style={{ color: 'var(--text-sub)' }}>{lang === 'th' ? 'ชวนสำเร็จรวม:' : 'Total Invites:'} </span>
                    <strong style={{ color: 'var(--cyber-pink)' }}>{totalReferralSuccess}</strong>
                  </div>
                  <button
                    type="button"
                    onClick={() => setResetReferralModal(true)}
                    className="btn btn-sm btn-danger"
                    style={{ padding: '6px 12px', fontSize: 11.5, display: 'inline-flex', alignItems: 'center', gap: 5 }}
                    title={lang === 'th' ? 'รีเซ็ตจำนวนการชวนของทุกเซิร์ฟเวอร์เพื่อเริ่ม Season ใหม่' : 'Reset all guilds referral progress for a new season'}
                  >
                    <IconRotateClockwise size={12} />
                    <span>{lang === 'th' ? 'เริ่ม Season ใหม่ (Reset All)' : 'Reset Season'}</span>
                  </button>
                </div>
              </div>

              {/* Referral Settings Form */}
              <form onSubmit={handleSaveReferralSettings} style={{ background: 'rgba(0, 0, 0, 0.25)', padding: 16, borderRadius: 12, border: '1px solid var(--card-border)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 14, marginBottom: 16 }}>
                  {/* 1. Master Toggle */}
                  <div>
                    <label style={{ display: 'block', fontSize: 11, color: 'var(--text-sub)', marginBottom: 5 }}>
                      {lang === 'th' ? 'สถานะระบบชวนเพื่อน' : 'Referral System Status'}
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        isReferralDirtyRef.current = true;
                        setReferralForm(prev => ({ ...prev, enabled: !prev.enabled }));
                      }}
                      className={`btn btn-sm ${referralForm.enabled ? 'btn-primary' : 'btn-danger'}`}
                      style={{ width: '100%', padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                    >
                      {referralForm.enabled ? <IconToggleRight size={16} /> : <IconToggleLeft size={16} />}
                      <span>{referralForm.enabled ? (lang === 'th' ? 'เปิดใช้งาน (ENABLED)' : 'ENABLED') : (lang === 'th' ? 'ปิดระบบ (DISABLED)' : 'DISABLED')}</span>
                    </button>
                  </div>

                  {/* 2. Min Topup Threshold */}
                  <div>
                    <label style={{ display: 'block', fontSize: 11, color: 'var(--text-sub)', marginBottom: 5 }}>
                      {lang === 'th' ? 'ยอดเติมขั้นต่ำ (บาท) *' : 'Min Topup (THB)'}
                    </label>
                    <input
                      type="number"
                      min="1"
                      placeholder="29"
                      value={referralForm.minTopup}
                      onChange={(e) => {
                        isReferralDirtyRef.current = true;
                        const v = e.target.value;
                        setReferralForm(prev => ({ ...prev, minTopup: v === '' ? '' : (parseInt(v, 10) || 0) }));
                      }}
                      style={{ width: '100%' }}
                      required
                    />
                  </div>

                  {/* 3. Reward Days */}
                  <div>
                    <label style={{ display: 'block', fontSize: 11, color: 'var(--text-sub)', marginBottom: 5 }}>
                      {lang === 'th' ? 'วันรางวัลผู้ชวน (วันต่อเซิร์ฟ) *' : 'Reward Days / Invite'}
                    </label>
                    <input
                      type="number"
                      min="1"
                      placeholder="30"
                      value={referralForm.rewardDays}
                      onChange={(e) => {
                        isReferralDirtyRef.current = true;
                        const v = e.target.value;
                        setReferralForm(prev => ({ ...prev, rewardDays: v === '' ? '' : (parseInt(v, 10) || 0) }));
                      }}
                      style={{ width: '100%' }}
                      required
                    />
                  </div>

                  {/* 4. Max Invites Cap */}
                  <div>
                    <label style={{ display: 'block', fontSize: 11, color: 'var(--text-sub)', marginBottom: 5 }}>
                      {lang === 'th' ? 'โควตาสูงสุด (ครั้งต่อกิลด์)' : 'Max Invites Cap'}
                    </label>
                    <input
                      type="number"
                      min="1"
                      placeholder="6"
                      value={referralForm.maxInvites}
                      onChange={(e) => {
                        isReferralDirtyRef.current = true;
                        const v = e.target.value;
                        setReferralForm(prev => ({ ...prev, maxInvites: v === '' ? '' : (parseInt(v, 10) || 0) }));
                      }}
                      style={{ width: '100%' }}
                      required
                    />
                  </div>

                  {/* 5. Expiry Preset */}
                  <div>
                    <label style={{ display: 'block', fontSize: 11, color: 'var(--text-sub)', marginBottom: 5 }}>
                      {lang === 'th' ? 'อายุรอบซีซั่น (Season Expiry)' : 'Season Expiry'}
                    </label>
                    <select
                      value={referralForm.expireMode}
                      onChange={(e) => {
                        isReferralDirtyRef.current = true;
                        setReferralForm(prev => ({ ...prev, expireMode: e.target.value }));
                      }}
                      style={{ width: '100%' }}
                    >
                      <option value="never">ไม่มีวันหมดอายุ (Never Expire)</option>
                      <option value="14">จบซีซั่นใน 14 วัน</option>
                      <option value="30">จบซีซั่นใน 30 วัน (1 เดือน)</option>
                      <option value="60">จบซีซั่นใน 60 วัน (2 เดือน)</option>
                      <option value="90">จบซีซั่นใน 90 วัน (3 เดือน)</option>
                      <option value="custom">กำหนดวันที่สิ้นสุดเอง...</option>
                    </select>
                  </div>

                  {/* Custom Date Picker */}
                  {referralForm.expireMode === 'custom' && (
                    <div>
                      <label style={{ display: 'block', fontSize: 11, color: 'var(--text-sub)', marginBottom: 5 }}>
                        {lang === 'th' ? 'ระบุวันสิ้นสุด Season' : 'Season End Date'}
                      </label>
                      <input
                        type="date"
                        value={referralForm.customDate}
                        onChange={(e) => {
                          isReferralDirtyRef.current = true;
                          setReferralForm(prev => ({ ...prev, customDate: e.target.value }));
                        }}
                        min={new Date().toISOString().split('T')[0]}
                        style={{ width: '100%' }}
                        required
                      />
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255, 255, 255, 0.06)', paddingTop: 12 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                    [Rule] {lang === 'th' ? `ปัจจุบัน: เพื่อนเติมขั้นต่ำ ${data?.config?.referralMinTopup ?? 29} บาท -> ผู้ชวนรับ +${data?.config?.referralRewardDays ?? 30} วัน (จำกัด ${data?.config?.maxReferralMonths ?? 6} ครั้ง)` : `Active rule: Min ${data?.config?.referralMinTopup ?? 29} THB topup -> +${data?.config?.referralRewardDays ?? 30} days`}
                  </div>
                  <button type="submit" className="btn btn-sm btn-primary" style={{ padding: '8px 18px', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <IconDeviceFloppy size={13} />
                    <span>{lang === 'th' ? 'บันทึกการตั้งค่า Referral Season' : 'Save Referral Campaign'}</span>
                  </button>
                </div>
              </form>
            </div>

            {/* 2. EARLY-BIRD PROMO DROPS MANAGER */}
            <div className="glass-panel" style={{ padding: 22 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <IconGift size={16} style={{ color: 'var(--slime-green)' }} />
                <span>{lang === 'th' ? 'แคมเปญแจกโค้ดวันฟรี (Early-Bird Drops)' : 'Early-Bird Promo Drops'}</span>
              </h3>

              {/* Create Drop Form */}
              <form onSubmit={handleCreateDrop} style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 24 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, color: 'var(--text-sub)', marginBottom: 4 }}>
                    {lang === 'th' ? 'รหัสโค้ด (Code)' : 'Code'}
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น DROP1 หรือ VIP30"
                    value={dropCode}
                    onChange={(e) => setDropCode(e.target.value.toUpperCase())}
                    style={{ width: 170 }}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, color: 'var(--text-sub)', marginBottom: 4 }}>
                    {lang === 'th' ? 'โควตาสิทธิ์ (Claims)' : 'Claims'}
                  </label>
                  <input
                    type="number"
                    placeholder="50"
                    value={dropClaims}
                    onChange={(e) => {
                      const v = e.target.value;
                      setDropClaims(v === '' ? '' : (parseInt(v, 10) || 0));
                    }}
                    style={{ width: 110 }}
                    min="1"
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, color: 'var(--text-sub)', marginBottom: 4 }}>
                    {lang === 'th' ? 'วันใช้งานที่ได้รับ (Days)' : 'Reward Days'}
                  </label>
                  <input
                    type="number"
                    placeholder="30"
                    value={dropDays}
                    onChange={(e) => {
                      const v = e.target.value;
                      setDropDays(v === '' ? '' : (parseInt(v, 10) || 0));
                    }}
                    style={{ width: 120 }}
                    min="1"
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, color: 'var(--text-sub)', marginBottom: 4 }}>
                    {lang === 'th' ? 'อายุแคมเปญ (Expiration)' : 'Campaign Expiry'}
                  </label>
                  <select
                    value={dropExpireMode}
                    onChange={(e) => setDropExpireMode(e.target.value)}
                    style={{ width: 180 }}
                  >
                    <option value="7">หมดอายุใน 7 วัน</option>
                    <option value="14">หมดอายุใน 14 วัน</option>
                    <option value="30">หมดอายุใน 30 วัน</option>
                    <option value="60">หมดอายุใน 60 วัน</option>
                    <option value="custom">กำหนดวันที่เอง...</option>
                    <option value="never">ไม่มีวันหมดอายุ (Never)</option>
                  </select>
                </div>
                {dropExpireMode === 'custom' && (
                  <div>
                    <label style={{ display: 'block', fontSize: 11, color: 'var(--text-sub)', marginBottom: 4 }}>
                      {lang === 'th' ? 'ระบุวันหมดเขต' : 'Expiry Date'}
                    </label>
                    <input
                      type="date"
                      value={dropCustomDate}
                      onChange={(e) => setDropCustomDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      style={{ width: 150 }}
                      required
                    />
                  </div>
                )}
                <div style={{ marginTop: 18 }}>
                  <button type="submit" className="btn btn-primary" style={{ padding: '9px 18px', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <IconPlus size={14} />
                    <span>{lang === 'th' ? 'สร้างแคมเปญ' : 'Create Drop'}</span>
                  </button>
                </div>
              </form>

              {/* Drops Table */}
              <div style={{ overflowX: 'auto' }}>
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>{lang === 'th' ? 'รหัสโค้ด' : 'Code'}</th>
                      <th>{lang === 'th' ? 'ชื่อแคมเปญ' : 'Name'}</th>
                      <th>{lang === 'th' ? 'สิทธิ์ที่เคลมแล้ว' : 'Claims'}</th>
                      <th>{lang === 'th' ? 'วันใช้งานที่ได้' : 'Reward Days'}</th>
                      <th>{lang === 'th' ? 'อายุแคมเปญ' : 'Campaign Expiry'}</th>
                      <th style={{ textAlign: 'center' }}>{lang === 'th' ? 'จัดการ' : 'Action'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.values(data?.campaigns || {}).map((c) => (
                      <tr key={c.code}>
                        <td style={{ fontWeight: 700, color: 'var(--slime-green)', fontFamily: 'monospace' }}>{c.code}</td>
                        <td>{c.name}</td>
                        <td>
                          <button
                            type="button"
                            onClick={() => setViewClaimedModal(c)}
                            className="btn btn-sm"
                            style={{
                              padding: '2px 8px',
                              fontSize: 11.5,
                              background: 'rgba(0, 210, 255, 0.1)',
                              border: '1px solid rgba(0, 210, 255, 0.3)',
                              color: 'var(--accent-blue)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4
                            }}
                            title={lang === 'th' ? 'คลิกดูรายชื่อเซิร์ฟเวอร์ที่กดรับโค้ดนี้' : 'View claimed guilds'}
                          >
                            <IconEye size={11} />
                            <span>{c.claimedCount || 0} / {c.maxClaims}</span>
                          </button>
                        </td>
                        <td>+{c.days} วัน</td>
                        <td>
                          {!c.expiresAt ? (
                            <span className="slime-badge slime-badge-blue" style={{ fontSize: 11 }}>
                              {lang === 'th' ? 'ไม่มีวันหมดอายุ' : 'Never Expire'}
                            </span>
                          ) : c.expiresAt <= Date.now() ? (
                            <span className="slime-badge slime-badge-danger" style={{ fontSize: 11 }}>
                              {lang === 'th' ? 'หมดอายุแล้ว' : 'Expired'} ({new Date(c.expiresAt).toLocaleDateString('th-TH')})
                            </span>
                          ) : (
                            <span style={{ fontSize: 12, fontWeight: 600, color: (c.expiresAt - Date.now() < 3 * 24 * 3600 * 1000) ? 'var(--accent-yellow)' : 'var(--slime-green)' }}>
                              {lang === 'th'
                                ? `เหลือ ${Math.ceil((c.expiresAt - Date.now()) / (24 * 3600 * 1000))} วัน (${new Date(c.expiresAt).toLocaleDateString('th-TH')})`
                                : `${Math.ceil((c.expiresAt - Date.now()) / (24 * 3600 * 1000))}d left (${new Date(c.expiresAt).toLocaleDateString()})`}
                            </span>
                          )}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                            <button
                              type="button"
                              onClick={() => handleOpenEditDrop(c)}
                              className="btn btn-sm"
                              style={{
                                padding: '4px 8px',
                                background: 'rgba(0, 210, 255, 0.1)',
                                border: '1px solid var(--accent-blue)',
                                color: 'var(--accent-blue)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 3
                              }}
                              title={lang === 'th' ? 'แก้ไขโควตาสิทธิ์ หรือขยายวันหมดอายุ' : 'Edit Drop'}
                            >
                              <IconEdit size={11} />
                              <span style={{ fontSize: 11 }}>{lang === 'th' ? 'แก้ไข' : 'Edit'}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteDrop(c.code)}
                              className="btn btn-sm btn-danger"
                              style={{ padding: '4px 8px' }}
                              title={lang === 'th' ? 'ลบแคมเปญนี้' : 'Delete Drop'}
                            >
                              <IconTrash size={12} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })()}

      {/* --- TAB 5: TRANSACTIONS & AUDIT LOG --- */}
      {activeSubTab === 'tx' && (
        <div className="glass-panel fade-in" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <IconActivity size={16} style={{ color: 'var(--slime-green)' }} />
            <span>{lang === 'th' ? 'ประวัติธุรกรรมและการเงินล่าสุด (Audit Log)' : 'Transactions & Topup Audit Log'}</span>
          </h3>

          <div style={{ overflowX: 'auto', maxHeight: 500, overflowY: 'auto' }}>
            <table className="custom-table">
              <thead>
                <tr>
                  <th>{lang === 'th' ? 'วันเวลา' : 'Time'}</th>
                  <th>{lang === 'th' ? 'เซิร์ฟเวอร์' : 'Guild'}</th>
                  <th>{lang === 'th' ? 'ยอดเงิน' : 'Amount'}</th>
                  <th>{lang === 'th' ? 'รหัสซอง / โค้ด' : 'Voucher / Code'}</th>
                  <th>{lang === 'th' ? 'ผู้ทำรายการ' : 'User'}</th>
                  <th>{lang === 'th' ? 'สถานะ' : 'Status'}</th>
                </tr>
              </thead>
              <tbody>
                {(data?.transactions || []).map(tx => (
                  <tr key={tx.id || tx.timestamp}>
                    <td style={{ fontSize: 11.5, color: 'var(--text-sub)' }}>
                      {new Date(tx.timestamp).toLocaleString('th-TH')}
                    </td>
                    <td style={{ fontWeight: 600, color: '#FFF' }}>
                      {tx.guildName || tx.guildId}
                    </td>
                    <td style={{ fontWeight: 700, color: 'var(--slime-green)' }}>
                      {tx.amount ? `${tx.amount} ฿` : '-'}
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: 11.5 }}>
                      {tx.voucherCode || tx.code || '-'}
                    </td>
                    <td style={{ fontSize: 11.5 }}>
                      {tx.userId || 'system'}
                    </td>
                    <td>
                      <span style={{ fontSize: 11, color: 'var(--slime-green)', fontWeight: 600 }}>SUCCESS</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- TAB 6: SETTINGS & CONFIG --- */}
      {activeSubTab === 'settings' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))', gap: 20, alignItems: 'start' }}>
          {/* Card 1: System Live Configuration */}
          <div className="glass-panel fade-in" style={{ padding: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
              <IconSettings size={18} style={{ color: 'var(--slime-green)' }} />
              <span>{lang === 'th' ? 'ตั้งค่าระบบด่วน (Live Config)' : 'System Configuration'}</span>
            </h3>

            {/* Cluster Physical Capacity Reference Banner */}
            {data?.stats?.clusterCapacity && (
              <div style={{
                background: 'rgba(0, 210, 255, 0.08)',
                border: '1px solid rgba(0, 210, 255, 0.25)',
                borderRadius: 10,
                padding: '12px 16px',
                marginBottom: 20,
                fontSize: 12
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontWeight: 700, color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <IconServer size={14} />
                    {lang === 'th' ? 'ภาระสตรีมจริงของทุกโหนดรวมกัน:' : 'Cluster Total Physical Capacity:'}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      isSettingsDirtyRef.current = true;
                      setSettingsForm(prev => ({
                        ...prev,
                        maxTotalStreams: data.stats.clusterCapacity.clusterMaxTotal,
                        maxFreeStreams: data.stats.clusterCapacity.clusterMaxFree
                      }));
                    }}
                    className="btn btn-sm"
                    style={{ fontSize: 10.5, padding: '3px 8px', background: 'rgba(0, 210, 255, 0.15)', color: 'var(--accent-blue)', border: 'none' }}
                  >
                    {lang === 'th' ? 'ซิงค์ตามโหนดจริง' : 'Auto-Sync with Nodes'}
                  </button>
                </div>
                <div style={{ color: '#FFF', fontSize: 13, fontWeight: 700 }}>
                  {data.stats.clusterCapacity.clusterMaxTotal} {lang === 'th' ? 'ห้องรวมสูงสุด' : 'Total Max Rooms'} 
                  <span style={{ fontWeight: 400, color: 'var(--text-sub)', fontSize: 11.5, marginLeft: 8 }}>
                    (Free: {data.stats.clusterCapacity.clusterMaxFree} ห้อง • Supporter Reserved: {data.stats.clusterCapacity.clusterSupporterReserved} ห้อง)
                  </span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>
                  {lang === 'th' 
                    ? `* โควตาสตรีมรวมที่ตั้งด้านล่างไม่ควรเกินภาระสตรีมจริง (${data.stats.clusterCapacity.clusterMaxTotal} ห้อง) เพื่อป้องกันเครื่องทำงานหนักเกินพิกัด`
                    : `* System quotas should not exceed physical cluster capacity (${data.stats.clusterCapacity.clusterMaxTotal} rooms)`}
                </div>
              </div>
            )}

            <form onSubmit={handleSaveSettings}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-sub)', marginBottom: 6 }}>
                  {lang === 'th' ? 'โหมดการชำระเงิน (Payment Mode)' : 'Payment Mode'}
                </label>
                <select
                  value={settingsForm.paymentMode}
                  onChange={(e) => {
                    isSettingsDirtyRef.current = true;
                    setSettingsForm(prev => ({ ...prev, paymentMode: e.target.value }));
                  }}
                >
                  <option value="sandbox">โหมดทดสอบ (SANDBOX - ปลอดภัย ไม่เสียเงินจริง)</option>
                  <option value="production">โหมดใช้งานจริง (PRODUCTION - รับซอง TrueMoney จริง)</option>
                </select>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-sub)', marginBottom: 6 }}>
                  {lang === 'th' ? 'โดเมนสาธารณะ (Public Web URL)' : 'Public Web URL'}
                </label>
                <input
                  type="text"
                  placeholder="https://goolix.nattawooth.space"
                  value={settingsForm.publicWebUrl || ''}
                  onChange={(e) => {
                    isSettingsDirtyRef.current = true;
                    setSettingsForm(prev => ({ ...prev, publicWebUrl: e.target.value }));
                  }}
                />
                <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>
                  {lang === 'th'
                    ? '* โดเมนหลักสำหรับลิงก์บริจาคและปุ่มของบอท Discord (เช่น https://goolix.nattawooth.space) หากเว้นว่างจะใช้ IP และพอร์ตตามค่าตั้งต้น'
                    : '* Primary public URL for Discord bot donate buttons and links. Leave empty to use default IP and port.'}
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-sub)', marginBottom: 6 }}>
                  {lang === 'th' ? 'ราคาผู้สนับสนุน (บาท / 30 วัน)' : 'Supporter Price (THB / 30 Days)'}
                </label>
                <input
                  type="number"
                  value={settingsForm.price30Days}
                  onChange={(e) => {
                    isSettingsDirtyRef.current = true;
                    const v = e.target.value;
                    setSettingsForm(prev => ({ ...prev, price30Days: v === '' ? '' : (parseInt(v, 10) || 0) }));
                  }}
                  min="0"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-sub)', marginBottom: 6 }}>
                    {lang === 'th' ? 'โควตาสตรีมสายฟรี (Max Free)' : 'Max Free Slots'}
                  </label>
                  <input
                    type="number"
                    value={settingsForm.maxFreeStreams}
                    onChange={(e) => {
                      isSettingsDirtyRef.current = true;
                      const v = e.target.value;
                      setSettingsForm(prev => ({ ...prev, maxFreeStreams: v === '' ? '' : (parseInt(v, 10) || 0) }));
                    }}
                    min="0"
                    style={data?.stats?.clusterCapacity && settingsForm.maxFreeStreams > data.stats.clusterCapacity.clusterMaxFree ? { borderColor: 'var(--danger)' } : undefined}
                  />
                  {data?.stats?.clusterCapacity && settingsForm.maxFreeStreams > data.stats.clusterCapacity.clusterMaxFree && (
                    <div style={{ color: 'var(--danger)', fontSize: 11, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <IconAlertTriangle size={12} />
                      <span>{lang === 'th' ? `เกินโควตาสายฟรีของโหนด (${data.stats.clusterCapacity.clusterMaxFree} ห้อง)` : `Exceeds cluster free limit (${data.stats.clusterCapacity.clusterMaxFree})`}</span>
                    </div>
                  )}
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-sub)', marginBottom: 6 }}>
                    {lang === 'th' ? 'โควตาสตรีมรวมสูงสุด (Max Total)' : 'Max Total Slots'}
                  </label>
                  <input
                    type="number"
                    value={settingsForm.maxTotalStreams}
                    onChange={(e) => {
                      isSettingsDirtyRef.current = true;
                      const v = e.target.value;
                      setSettingsForm(prev => ({ ...prev, maxTotalStreams: v === '' ? '' : (parseInt(v, 10) || 0) }));
                    }}
                    min="1"
                    style={data?.stats?.clusterCapacity && settingsForm.maxTotalStreams > data.stats.clusterCapacity.clusterMaxTotal ? { borderColor: 'var(--danger)' } : undefined}
                  />
                  {data?.stats?.clusterCapacity && settingsForm.maxTotalStreams > data.stats.clusterCapacity.clusterMaxTotal && (
                    <div style={{ color: 'var(--danger)', fontSize: 11, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <IconAlertTriangle size={12} />
                      <span>{lang === 'th' ? `เกินภาระสตรีมจริงของโหนด (${data.stats.clusterCapacity.clusterMaxTotal} ห้อง)` : `Exceeds cluster hardware limit (${data.stats.clusterCapacity.clusterMaxTotal})`}</span>
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => {
                    if (data?.config) {
                      isSettingsDirtyRef.current = false;
                      setSettingsForm({
                        paymentMode: data.config.paymentMode || 'sandbox',
                        price30Days: data.config.price30Days ?? 29,
                        maxFreeStreams: data.config.maxFreeStreams ?? 2,
                        maxTotalStreams: data.config.maxTotalStreams ?? 4,
                        maxReferralMonths: data.config.maxReferralMonths ?? 6,
                        phoneNumber: data.config.phoneNumber || '',
                        publicWebUrl: data.config.publicWebUrl || ''
                      });
                      onToast('info', lang === 'th' ? 'คืนค่าล่าสุดจากเซิร์ฟเวอร์แล้ว' : 'Reset to server config');
                    }
                  }}
                  className="btn btn-sm"
                  style={{ flex: '0 0 auto', padding: '12px 18px' }}
                  title="Reset to current server values"
                >
                  <IconRefresh size={14} />
                  <span>{lang === 'th' ? 'รีเซ็ตค่าเดิม' : 'Reset'}</span>
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1, padding: '12px 18px' }}>
                  <IconDeviceFloppy size={15} />
                  <span>{lang === 'th' ? 'บันทึกการตั้งค่าระบบ' : 'Save System Settings'}</span>
                </button>
              </div>
            </form>

            <div style={{ borderTop: '1px solid var(--card-border)', paddingTop: 16, marginTop: 16 }}>
              <button
                onClick={handleForceSweep}
                className="btn btn-sm"
                style={{ width: '100%', padding: '10px' }}
              >
                <IconRefresh size={14} />
                <span>{lang === 'th' ? 'สั่ง Sweep เคลียร์ห้องหมดอายุทันที (Force Sweep)' : 'Force Sweep Idle Rooms'}</span>
              </button>
            </div>
          </div>

          {/* Card 2: Feature Flags & Maintenance Notices */}
          <div className="glass-panel fade-in" style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <IconAdjustments size={18} style={{ color: 'var(--cyber-pink)' }} />
                  <span>{lang === 'th' ? 'สวิตช์ฟังก์ชัน & ข้อความแจ้งเตือน (Feature Flags)' : 'Feature Flags & Maintenance'}</span>
                </h3>
                <div style={{ fontSize: 12, color: 'var(--text-sub)', marginTop: 4 }}>
                  {lang === 'th'
                    ? 'สลับสิทธิ์การใช้งาน (ทุกคน / เฉพาะ VIP / ปิดปรับปรุง) พร้อมกำหนดข้อความแจ้งเตือนพิเศษเมื่อคำสั่งถูกระงับ'
                    : 'Toggle feature access tiers (Public, VIP Supporter, or Disabled) and configure custom notice messages'}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 20 }}>
              {Object.entries(featureFlags).map(([key, feat]) => {
                const isAll = feat.mode === 'all';
                const isSupporter = feat.mode === 'supporter_only';
                const isDisabled = feat.mode === 'disabled';

                return (
                  <div
                    key={key}
                    style={{
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: `1px solid ${isDisabled ? 'rgba(239, 68, 68, 0.4)' : (isSupporter ? 'rgba(255, 46, 147, 0.3)' : 'var(--card-border)')}`,
                      borderRadius: 10,
                      padding: 16,
                      transition: 'border-color 0.2s'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {key === 'seek' && <IconPlayerSkipForward size={16} style={{ color: '#F59E0B' }} />}
                        {key === 'filter' && <IconAdjustments size={16} style={{ color: '#00D2FF' }} />}
                        {key === 'autoplay' && <IconRotateClockwise size={16} style={{ color: '#FF2E93' }} />}
                        {key === 'volume' && <IconVolume size={16} style={{ color: '#38BDF8' }} />}
                        {key === 'loop' && <IconRepeat size={16} style={{ color: '#A855F7' }} />}
                        {key === 'shuffle' && <IconArrowsShuffle size={16} style={{ color: '#EC4899' }} />}
                        {key === 'lyrics' && <IconSearch size={16} style={{ color: '#10B981' }} />}
                        {key === 'playlist' && <IconList size={16} style={{ color: '#FBBF24' }} />}
                        {key === 'favorite' && <IconHeart size={16} style={{ color: '#F43F5E' }} />}
                        {key === 'queue_control' && <IconActivity size={16} style={{ color: '#6366F1' }} />}
                        <span style={{ fontWeight: 700, fontSize: 14 }}>{feat.name}</span>
                        <code style={{ fontSize: 11, background: 'rgba(255, 255, 255, 0.08)', padding: '2px 6px', borderRadius: 4, color: 'var(--accent-blue)' }}>
                          {feat.command}
                        </code>
                      </div>
                      <div>
                        {isAll && (
                          <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6, background: 'rgba(16, 185, 129, 0.15)', color: '#10B981', fontWeight: 600 }}>
                            {lang === 'th' ? 'เปิดทุกคน' : 'Public'}
                          </span>
                        )}
                        {isSupporter && (
                          <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6, background: 'rgba(255, 46, 147, 0.15)', color: '#FF2E93', fontWeight: 600 }}>
                            {lang === 'th' ? 'เฉพาะ VIP' : 'Supporter'}
                          </span>
                        )}
                        {isDisabled && (
                          <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6, background: 'rgba(239, 68, 68, 0.15)', color: '#EF4444', fontWeight: 600 }}>
                            {lang === 'th' ? 'ปิดปรับปรุง' : 'Disabled'}
                          </span>
                        )}
                      </div>
                    </div>

                    <p style={{ fontSize: 11.5, color: 'var(--text-sub)', margin: '0 0 12px 0' }}>
                      {feat.description}
                    </p>

                    {/* Segmented Mode Selector */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr 1fr',
                      gap: 6,
                      background: 'rgba(0, 0, 0, 0.25)',
                      padding: 4,
                      borderRadius: 8,
                      marginBottom: 12
                    }}>
                      <button
                        type="button"
                        onClick={() => {
                          isFeaturesDirtyRef.current = true;
                          setFeatureFlags(prev => ({
                            ...prev,
                            [key]: { ...prev[key], mode: 'all' }
                          }));
                        }}
                        style={{
                          border: 'none',
                          borderRadius: 6,
                          padding: '6px 8px',
                          fontSize: 11,
                          fontWeight: isAll ? 700 : 500,
                          cursor: 'pointer',
                          background: isAll ? '#10B981' : 'transparent',
                          color: isAll ? '#FFFFFF' : 'var(--text-sub)',
                          transition: 'all 0.15s'
                        }}
                      >
                        {lang === 'th' ? 'ทุกคน (Public)' : 'Public'}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          isFeaturesDirtyRef.current = true;
                          setFeatureFlags(prev => ({
                            ...prev,
                            [key]: { ...prev[key], mode: 'supporter_only' }
                          }));
                        }}
                        style={{
                          border: 'none',
                          borderRadius: 6,
                          padding: '6px 8px',
                          fontSize: 11,
                          fontWeight: isSupporter ? 700 : 500,
                          cursor: 'pointer',
                          background: isSupporter ? '#FF2E93' : 'transparent',
                          color: isSupporter ? '#FFFFFF' : 'var(--text-sub)',
                          transition: 'all 0.15s'
                        }}
                      >
                        {lang === 'th' ? 'เฉพาะ VIP' : 'VIP Only'}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          isFeaturesDirtyRef.current = true;
                          setFeatureFlags(prev => ({
                            ...prev,
                            [key]: { ...prev[key], mode: 'disabled' }
                          }));
                        }}
                        style={{
                          border: 'none',
                          borderRadius: 6,
                          padding: '6px 8px',
                          fontSize: 11,
                          fontWeight: isDisabled ? 700 : 500,
                          cursor: 'pointer',
                          background: isDisabled ? '#EF4444' : 'transparent',
                          color: isDisabled ? '#FFFFFF' : 'var(--text-sub)',
                          transition: 'all 0.15s'
                        }}
                      >
                        {lang === 'th' ? 'ปิดปรับปรุง' : 'Disabled'}
                      </button>
                    </div>

                    {/* Custom Maintenance / VIP Notice */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-sub)' }}>
                          {lang === 'th' ? 'ข้อความแจ้งเตือนผู้ใช้กรณีพิเศษ (Custom Notice):' : 'Custom Notice Message:'}
                        </label>
                        {feat.customMessage && (
                          <button
                            type="button"
                            onClick={() => {
                              isFeaturesDirtyRef.current = true;
                              setFeatureFlags(prev => ({
                                ...prev,
                                [key]: { ...prev[key], customMessage: '' }
                              }));
                            }}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: 'var(--text-dim)',
                              fontSize: 10.5,
                              cursor: 'pointer',
                              padding: '0 4px'
                            }}
                          >
                            {lang === 'th' ? 'เคลียร์ข้อความ' : 'Clear'}
                          </button>
                        )}
                      </div>
                      <input
                        type="text"
                        value={feat.customMessage || ''}
                        onChange={(e) => {
                          isFeaturesDirtyRef.current = true;
                          const val = e.target.value;
                          setFeatureFlags(prev => ({
                            ...prev,
                            [key]: { ...prev[key], customMessage: val }
                          }));
                        }}
                        placeholder={
                          isDisabled
                            ? (lang === 'th' ? 'เช่น ปิดปรับปรุงชั่วคราวเนื่องจาก YouTube อัปเดต API คาดว่าจะเปิดเวลา 22:00 น.' : 'e.g. Maintenance due to upstream API update...')
                            : isSupporter
                              ? (lang === 'th' ? 'เช่น ฟังก์ชันนี้เปิดเฉพาะ Supporter VIP เท่านั้น พิมพ์ /gdonate เพื่อร่วมสนับสนุน' : 'e.g. Supporter VIP only...')
                              : (lang === 'th' ? 'ปกติเปิดให้ทุกคนใช้งานได้ (เว้นว่างเพื่อใช้ค่าเริ่มต้น)' : 'Default: Public access for all')
                        }
                        style={{
                          fontSize: 12,
                          padding: '7px 10px',
                          borderColor: feat.customMessage ? 'rgba(0, 210, 255, 0.4)' : undefined
                        }}
                      />
                      <div style={{ fontSize: 10.5, marginTop: 4, color: feat.customMessage ? 'var(--accent-blue)' : 'var(--text-dim)' }}>
                        {feat.customMessage 
                          ? `[Custom Notice] ${lang === 'th' ? 'กำลังใช้ข้อความกำหนดเองข้างต้น แจ้งเตือนใน Discord' : 'Using custom notice in Discord responses'}`
                          : `[Default] ${lang === 'th' ? 'เว้นว่างไว้ ระบบจะใช้ข้อความมาตรฐานอัตโนมัติ' : 'Empty: system will use default notice'}`}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom Actions for Feature Flags */}
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                onClick={() => {
                  if (data?.features) {
                    isFeaturesDirtyRef.current = false;
                    setFeatureFlags(data.features);
                    onToast('info', lang === 'th' ? 'คืนค่าสถานะฟังก์ชันล่าสุดแล้ว' : 'Reset features to server');
                  }
                }}
                className="btn btn-sm"
                style={{ flex: '0 0 auto', padding: '12px 18px' }}
                title="Reset to current server values"
              >
                <IconRefresh size={14} />
                <span>{lang === 'th' ? 'รีเซ็ตค่าเดิม' : 'Reset'}</span>
              </button>
              <button
                type="button"
                onClick={handleSaveFeatures}
                disabled={savingFeatures}
                className="btn btn-primary"
                style={{ flex: 1, padding: '12px 18px' }}
              >
                <IconDeviceFloppy size={15} />
                <span>
                  {savingFeatures
                    ? (lang === 'th' ? 'กำลังบันทึก...' : 'Saving...')
                    : (lang === 'th' ? 'บันทึกการตั้งค่าฟังก์ชัน' : 'Save Feature Flags')}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- BAN MODAL --- */}
      {banModal && (
        <Modal onClose={() => setBanModal(null)}>
          <div className="glass-panel" style={{ width: 420, maxWidth: '94vw', padding: 24, borderRadius: 16 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 14, color: 'var(--danger)' }}>
              {lang === 'th' ? 'แบนเซิร์ฟเวอร์' : 'Ban Guild'}: {banModal.guildName}
            </h3>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 12, color: 'var(--text-sub)', marginBottom: 6 }}>
                {lang === 'th' ? 'จำนวนวันแบน' : 'Ban Days'}
              </label>
              <input
                type="number"
                value={banDays}
                onChange={(e) => setBanDays(parseInt(e.target.value, 10))}
                min="1"
              />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 12, color: 'var(--text-sub)', marginBottom: 6 }}>
                {lang === 'th' ? 'เหตุผล' : 'Reason'}
              </label>
              <input
                type="text"
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setBanModal(null)} className="btn btn-sm">
                {lang === 'th' ? 'ยกเลิก' : 'Cancel'}
              </button>
              <button onClick={handleBanGuild} className="btn btn-sm btn-danger">
                {lang === 'th' ? 'ยืนยันการแบน' : 'Confirm Ban'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* --- EDIT NODE MODAL --- */}
      {editNodeModal && (
        <Modal onClose={() => setEditNodeModal(null)}>
          <div className="glass-panel" style={{ width: 420, maxWidth: '94vw', padding: 24, borderRadius: 16 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 14 }}>
              {lang === 'th' ? 'ตั้งค่าโหนด' : 'Configure Node'}: {editNodeModal.id}
            </h3>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 12, color: 'var(--text-sub)', marginBottom: 6 }}>
                {lang === 'th' ? 'ชื่อที่แสดง (Display Name)' : 'Display Name'}
              </label>
              <input
                type="text"
                value={nodeNameInput}
                onChange={(e) => setNodeNameInput(e.target.value)}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: 'var(--text-sub)', marginBottom: 6 }}>
                  {lang === 'th' ? 'ความจุห้องสูงสุด (Max Rooms)' : 'Max Rooms'}
                </label>
                <input
                  type="number"
                  value={nodeMaxRoomsInput}
                  onChange={(e) => {
                    const v = e.target.value;
                    const parsed = v === '' ? '' : (parseInt(v, 10) || 0);
                    setNodeMaxRoomsInput(parsed);
                    if (typeof parsed === 'number' && typeof nodeMaxFreeRoomsInput === 'number' && nodeMaxFreeRoomsInput > parsed) {
                      setNodeMaxFreeRoomsInput(parsed);
                    }
                  }}
                  min="1"
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: 'var(--text-sub)', marginBottom: 6 }}>
                  {lang === 'th' ? 'โควตาสายฟรี (Max Free)' : 'Max Free Slots'}
                </label>
                <input
                  type="number"
                  value={nodeMaxFreeRoomsInput}
                  onChange={(e) => {
                    const v = e.target.value;
                    const parsed = v === '' ? '' : (parseInt(v, 10) || 0);
                    setNodeMaxFreeRoomsInput(parsed);
                  }}
                  min="0"
                  max={typeof nodeMaxRoomsInput === 'number' ? nodeMaxRoomsInput : undefined}
                />
              </div>
            </div>

            {/* Live Capacity Ratio Indicator */}
            {typeof nodeMaxRoomsInput === 'number' && typeof nodeMaxFreeRoomsInput === 'number' && (
              <div style={{
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid var(--card-border)',
                borderRadius: 10,
                padding: '12px 14px',
                marginBottom: 20,
                fontSize: 12
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ color: 'var(--text-sub)' }}>{lang === 'th' ? 'สัดส่วนจัดสรรช่องสัญญาณ:' : 'Slot Allocation:'}</span>
                  <span style={{ fontWeight: 700 }}>
                    {nodeMaxFreeRoomsInput} Free / {Math.max(0, nodeMaxRoomsInput - nodeMaxFreeRoomsInput)} Supporter
                  </span>
                </div>
                {/* Visual Ratio Progress Bar */}
                <div style={{
                  height: 6,
                  borderRadius: 3,
                  background: 'rgba(255, 255, 255, 0.1)',
                  display: 'flex',
                  overflow: 'hidden',
                  marginBottom: 8
                }}>
                  <div style={{
                    width: `${Math.min(100, Math.round((nodeMaxFreeRoomsInput / Math.max(1, nodeMaxRoomsInput)) * 100))}%`,
                    background: 'var(--slime-green)',
                    transition: 'width 0.2s'
                  }} title="Free Slots" />
                  <div style={{
                    width: `${Math.min(100, Math.max(0, 100 - Math.round((nodeMaxFreeRoomsInput / Math.max(1, nodeMaxRoomsInput)) * 100)))}%`,
                    background: 'var(--cyber-pink)',
                    transition: 'width 0.2s'
                  }} title="Supporter Slots" />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-sub)' }}>
                  <span>Free: {nodeMaxFreeRoomsInput} ห้อง</span>
                  <span style={{ color: 'var(--cyber-pink)' }}>VIP Reserved: {Math.max(0, nodeMaxRoomsInput - nodeMaxFreeRoomsInput)} ห้อง</span>
                </div>
              </div>
            )}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setEditNodeModal(null)} disabled={savingNodeConfig} className="btn btn-sm">
                {lang === 'th' ? 'ยกเลิก' : 'Cancel'}
              </button>
              <button onClick={handleSaveNodeConfig} disabled={savingNodeConfig} className="btn btn-sm btn-primary">
                {savingNodeConfig ? (lang === 'th' ? 'กำลังบันทึก...' : 'Saving...') : (lang === 'th' ? 'บันทึก' : 'Save')}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* --- EDIT DROP MODAL --- */}
      {editDropModal && (
        <Modal onClose={() => setEditDropModal(null)}>
          <div className="glass-panel" style={{ width: 440, maxWidth: '94vw', padding: 24, borderRadius: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: 'rgba(0, 210, 255, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent-blue)'
              }}>
                <IconEdit size={18} />
              </div>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: '#FFF' }}>
                  {lang === 'th' ? 'แก้ไขแคมเปญ' : 'Edit Campaign'}: <span style={{ color: 'var(--slime-green)', fontFamily: 'monospace' }}>{editDropModal.code}</span>
                </h3>
                <div style={{ fontSize: 11.5, color: 'var(--text-sub)', marginTop: 2 }}>
                  {lang === 'th' ? `เคลมไปแล้วแล้ว ${editDropModal.claimedCount || 0} จาก ${editDropModal.maxClaims} สิทธิ์` : `Claimed: ${editDropModal.claimedCount || 0} / ${editDropModal.maxClaims}`}
                </div>
              </div>
            </div>

            <form onSubmit={handleSaveEditDrop}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 11.5, color: 'var(--text-sub)', marginBottom: 5 }}>
                  {lang === 'th' ? 'ชื่อแคมเปญ (Name)' : 'Campaign Name'}
                </label>
                <input
                  type="text"
                  value={editDropName}
                  onChange={(e) => setEditDropName(e.target.value)}
                  style={{ width: '100%' }}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11.5, color: 'var(--text-sub)', marginBottom: 5 }}>
                    {lang === 'th' ? 'โควตาสิทธิ์ (Claims)' : 'Max Claims'}
                  </label>
                  <input
                    type="number"
                    min={editDropModal.claimedCount || 1}
                    value={editDropClaims}
                    onChange={(e) => {
                      const v = e.target.value;
                      setEditDropClaims(v === '' ? '' : (parseInt(v, 10) || 0));
                    }}
                    style={{ width: '100%' }}
                    required
                  />
                  <div style={{ fontSize: 10.5, color: 'var(--text-dim)', marginTop: 3 }}>
                    {lang === 'th' ? `ขั้นต่ำ: ${editDropModal.claimedCount || 0} (ตามที่เคลมแล้ว)` : `Min: ${editDropModal.claimedCount || 0}`}
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 11.5, color: 'var(--text-sub)', marginBottom: 5 }}>
                    {lang === 'th' ? 'วันใช้งาน (Reward Days)' : 'Reward Days'}
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={editDropDays}
                    onChange={(e) => {
                      const v = e.target.value;
                      setEditDropDays(v === '' ? '' : (parseInt(v, 10) || 0));
                    }}
                    style={{ width: '100%' }}
                    required
                  />
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 11.5, color: 'var(--text-sub)', marginBottom: 5 }}>
                  {lang === 'th' ? 'อายุแคมเปญ (Expiry)' : 'Campaign Expiry'}
                </label>
                <select
                  value={editDropExpireMode}
                  onChange={(e) => setEditDropExpireMode(e.target.value)}
                  style={{ width: '100%', marginBottom: 8 }}
                >
                  <option value="never">ไม่มีวันหมดอายุ (Never Expire)</option>
                  <option value="7">หมดอายุใน 7 วัน</option>
                  <option value="14">หมดอายุใน 14 วัน</option>
                  <option value="30">หมดอายุใน 30 วัน</option>
                  <option value="60">หมดอายุใน 60 วัน</option>
                  <option value="custom">กำหนดวันที่สิ้นสุดเอง...</option>
                </select>

                {editDropExpireMode === 'custom' && (
                  <input
                    type="date"
                    value={editDropCustomDate}
                    onChange={(e) => setEditDropCustomDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    style={{ width: '100%' }}
                    required
                  />
                )}
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setEditDropModal(null)} className="btn btn-sm">
                  {lang === 'th' ? 'ยกเลิก' : 'Cancel'}
                </button>
                <button type="submit" className="btn btn-sm btn-primary">
                  {lang === 'th' ? 'บันทึกการแก้ไข' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </Modal>
      )}

      {/* --- VIEW CLAIMED GUILDS MODAL --- */}
      {viewClaimedModal && (
        <Modal onClose={() => setViewClaimedModal(null)}>
          <div className="glass-panel" style={{ width: 560, maxWidth: '94vw', padding: 24, borderRadius: 16, maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: 'rgba(0, 255, 136, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--slime-green)'
                }}>
                  <IconEye size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: '#FFF' }}>
                    {lang === 'th' ? 'เซิร์ฟเวอร์ที่เคลมโค้ด' : 'Claimed Guilds'}: <span style={{ color: 'var(--slime-green)', fontFamily: 'monospace' }}>{viewClaimedModal.code}</span>
                  </h3>
                  <div style={{ fontSize: 11.5, color: 'var(--text-sub)', marginTop: 2 }}>
                    {viewClaimedModal.name} • {viewClaimedModal.claimedCount || 0} / {viewClaimedModal.maxClaims} {lang === 'th' ? 'สิทธิ์' : 'claims'}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewClaimedModal(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-sub)', cursor: 'pointer', padding: 4 }}
              >
                <IconX size={18} />
              </button>
            </div>

            <div style={{ overflowY: 'auto', flex: 1, border: '1px solid var(--card-border)', borderRadius: 10, marginBottom: 16 }}>
              {(!viewClaimedModal.claimedGuilds || viewClaimedModal.claimedGuilds.length === 0) ? (
                <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-dim)', fontSize: 12 }}>
                  {lang === 'th' ? 'ยังไม่มีเซิร์ฟเวอร์ใดเข้ามากดเคลมโค้ดนี้ครับ' : 'No guilds have claimed this drop yet.'}
                </div>
              ) : (
                <table className="custom-table" style={{ margin: 0 }}>
                  <thead>
                    <tr>
                      <th style={{ fontSize: 11 }}>#</th>
                      <th style={{ fontSize: 11 }}>{lang === 'th' ? 'ชื่อเซิร์ฟเวอร์' : 'Guild'}</th>
                      <th style={{ fontSize: 11 }}>Guild ID</th>
                      <th style={{ fontSize: 11 }}>{lang === 'th' ? 'วันเวลาที่เคลม' : 'Claimed At'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {viewClaimedModal.claimedGuilds.map((cg, idx) => (
                      <tr key={cg.guildId + '_' + idx}>
                        <td style={{ fontSize: 11, color: 'var(--text-dim)' }}>{idx + 1}</td>
                        <td style={{ fontWeight: 600, color: '#FFF' }}>{cg.guildName || 'Unknown Guild'}</td>
                        <td style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--text-sub)' }}>{cg.guildId}</td>
                        <td style={{ fontSize: 11, color: 'var(--slime-green)' }}>
                          {cg.claimedAt ? new Date(cg.claimedAt).toLocaleString('th-TH') : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setViewClaimedModal(null)} className="btn btn-sm">
                {lang === 'th' ? 'ปิดหน้าต่าง' : 'Close'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* --- RESET REFERRAL SEASON MODAL --- */}
      {resetReferralModal && (
        <Modal onClose={() => setResetReferralModal(false)}>
          <div className="glass-panel" style={{ width: 440, maxWidth: '94vw', padding: 24, borderRadius: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <div style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: 'rgba(255, 75, 75, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--danger)'
              }}>
                <IconRotateClockwise size={18} />
              </div>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: 'var(--danger)' }}>
                  {lang === 'th' ? 'รีเซ็ตซีซั่นชวนเพื่อน (Reset Season)' : 'Reset Referral Season'}
                </h3>
                <div style={{ fontSize: 11.5, color: 'var(--text-sub)', marginTop: 2 }}>
                  {lang === 'th' ? 'เริ่มต้นรอบซีซั่นใหม่สำหรับทุกเซิร์ฟเวอร์' : 'Start a new referral season for all guilds'}
                </div>
              </div>
            </div>

            <div style={{ background: 'rgba(255, 75, 75, 0.08)', border: '1px solid rgba(255, 75, 75, 0.25)', borderRadius: 10, padding: '12px 14px', marginBottom: 16, fontSize: 12, color: 'var(--text-main)', lineHeight: 1.5 }}>
              <strong style={{ color: 'var(--danger)' }}>[Warning] ผลลัพธ์ของการรีเซ็ต:</strong>
              <ul style={{ margin: '6px 0 0', paddingLeft: 18, color: 'var(--text-sub)' }}>
                <li>จำนวนเพื่อนที่ชวนสำเร็จ (<code style={{ color: '#FFF' }}>referralCount</code>) ของทุกกิลด์จะกลับเป็น 0</li>
                <li>ทุกกิลด์จะสามารถชวนเพื่อนเพื่อรับสิทธิ์รอบใหม่ได้อีกครั้ง</li>
                <li><strong style={{ color: 'var(--slime-green)' }}>วันใช้งาน Supporter ที่กิลด์ได้รับไปแล้วจะไม่หาย</strong> (ปลอดภัย ไม่กระทบวันใช้งานเดิม)</li>
              </ul>
            </div>

            <div style={{ marginBottom: 18 }}>
              <label style={{ display: 'block', fontSize: 11.5, color: 'var(--text-sub)', marginBottom: 5 }}>
                {lang === 'th' ? 'ชื่อซีซั่นใหม่ (Audit Note)' : 'New Season Label / Name'}
              </label>
              <input
                type="text"
                placeholder="เช่น Season 2 หรือ Summer Festival"
                value={resetSeasonName}
                onChange={(e) => setResetSeasonName(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setResetReferralModal(false)} className="btn btn-sm">
                {lang === 'th' ? 'ยกเลิก' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleConfirmResetReferralSeason}
                className="btn btn-sm btn-danger"
                style={{ padding: '8px 18px', fontWeight: 700 }}
              >
                {lang === 'th' ? 'ยืนยันเริ่ม Season ใหม่' : 'Confirm Season Reset'}
              </button>
            </div>
          </div>
        </Modal>
      )}
      {addNodeModal && (
        <Modal onClose={() => setAddNodeModal(false)}>
          <div className="glass-panel" style={{ width: 440, maxWidth: '94vw', padding: 24, borderRadius: 16 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <IconServer size={18} style={{ color: 'var(--slime-green)' }} />
              <span>{lang === 'th' ? 'เพิ่มโหนดประมวลผลเสียงเข้าคลัสเตอร์' : 'Add Audio Node to Cluster'}</span>
            </h3>

            <form onSubmit={handleAddNode}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 12, color: 'var(--text-sub)', marginBottom: 6 }}>
                  {lang === 'th' ? 'ชื่อที่แสดงของโหนด (Node Name)' : 'Node Name'}
                </label>
                <input
                  type="text"
                  placeholder="เช่น Orikami Win-Node หรือ Residential 2"
                  value={addNodeName}
                  onChange={(e) => setAddNodeName(e.target.value)}
                />
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 12, color: 'var(--text-sub)', marginBottom: 6 }}>
                  {lang === 'th' ? 'Host / IP / Domain / TrueDDNS' : 'Host / IP'}
                </label>
                <input
                  type="text"
                  placeholder="เช่น orikami.trueddns.com หรือ 192.168.1.50"
                  value={addNodeHost}
                  onChange={(e) => setAddNodeHost(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: 'var(--text-sub)', marginBottom: 6 }}>
                    Port
                  </label>
                  <input
                    type="number"
                    placeholder="2333 หรือ 28422"
                    value={addNodePort}
                    onChange={(e) => setAddNodePort(parseInt(e.target.value, 10))}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: 'var(--text-sub)', marginBottom: 6 }}>
                    {lang === 'th' ? 'ความจุห้อง (Max Rooms)' : 'Max Rooms'}
                  </label>
                  <input
                    type="number"
                    value={addNodeMaxRooms}
                    onChange={(e) => {
                      const v = e.target.value;
                      const parsed = v === '' ? '' : (parseInt(v, 10) || 0);
                      setAddNodeMaxRooms(parsed);
                      if (typeof parsed === 'number' && addNodeMaxFreeRooms > parsed) {
                        setAddNodeMaxFreeRooms(parsed);
                      }
                    }}
                    min="1"
                    required
                  />
                </div>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 12, color: 'var(--text-sub)', marginBottom: 6 }}>
                  {lang === 'th' ? 'โควตาสตรีมสายฟรี (Max Free Slots)' : 'Max Free Slots'}
                </label>
                <input
                  type="number"
                  value={addNodeMaxFreeRooms}
                  onChange={(e) => {
                    const v = e.target.value;
                    setAddNodeMaxFreeRooms(v === '' ? '' : (parseInt(v, 10) || 0));
                  }}
                  min="0"
                  max={typeof addNodeMaxRooms === 'number' ? addNodeMaxRooms : undefined}
                />
                <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>
                  {lang === 'th' 
                    ? `* ที่เหลือ (${Math.max(0, (parseInt(addNodeMaxRooms, 10) || 0) - (parseInt(addNodeMaxFreeRooms, 10) || 0))} ห้อง) จะสงวนสิทธิ์ให้ผู้สนับสนุน (Supporter VIP)` 
                    : `* Remaining slots reserved for Supporter VIP`}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setAddNodeModal(false)} className="btn btn-sm">
                  {lang === 'th' ? 'ยกเลิก' : 'Cancel'}
                </button>
                <button type="submit" className="btn btn-sm btn-primary">
                  <IconPlus size={13} />
                  <span>{lang === 'th' ? 'บันทึกและเชื่อมต่อทันที' : 'Connect Node'}</span>
                </button>
              </div>
            </form>
          </div>
        </Modal>
      )}
      {/* --- CUSTOM ADJUST DAYS MODAL --- */}
      {adjustDaysModal && (() => {
        const now = Date.now();
        const isCurrentlySupporter = adjustDaysModal.expiresAt && adjustDaysModal.expiresAt > now;
        const currentRemainingDays = isCurrentlySupporter ? Math.ceil((adjustDaysModal.expiresAt - now) / (1000 * 60 * 60 * 24)) : 0;
        const baseTime = isCurrentlySupporter ? adjustDaysModal.expiresAt : now;

        let previewExpiry = 0;
        let previewRemainingDays = 0;
        if (adjustMode === 'offset') {
          const numDays = Math.max(1, parseInt(adjustDaysValue, 10) || 1);
          const deltaMs = (adjustType === 'add' ? numDays : -numDays) * 24 * 3600 * 1000;
          previewExpiry = baseTime + deltaMs;
          previewRemainingDays = previewExpiry > now ? Math.ceil((previewExpiry - now) / (1000 * 60 * 60 * 24)) : 0;
        } else {
          const targetMs = new Date(adjustDateValue).getTime();
          previewExpiry = !isNaN(targetMs) ? targetMs : 0;
          previewRemainingDays = previewExpiry > now ? Math.ceil((previewExpiry - now) / (1000 * 60 * 60 * 24)) : 0;
        }

        const willBeDowngraded = previewExpiry <= now;

        return (
          <Modal onClose={() => setAdjustDaysModal(null)}>
            <div className="glass-panel" style={{ width: 480, maxWidth: '94vw', padding: 24, borderRadius: 16 }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <div style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  background: 'rgba(0, 210, 255, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--accent-blue)'
                }}>
                  <IconAdjustments size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: '#FFF' }}>
                    {lang === 'th' ? 'ปรับแต่งวันใช้งาน (Custom Adjust Days)' : 'Custom Adjust Days'}
                  </h3>
                  <div style={{ fontSize: 12, color: 'var(--text-sub)', marginTop: 2 }}>
                    {adjustDaysModal.guildName} <span style={{ fontFamily: 'monospace', opacity: 0.7 }}>({adjustDaysModal.guildId})</span>
                  </div>
                </div>
              </div>

              {/* Current Expiry Info Card */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid var(--card-border)',
                borderRadius: 10,
                padding: '10px 14px',
                marginBottom: 18,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span style={{ fontSize: 12, color: 'var(--text-sub)' }}>
                  {lang === 'th' ? 'สถานะปัจจุบัน:' : 'Current Status:'}
                </span>
                <span style={{ fontSize: 12, fontWeight: 700, color: isCurrentlySupporter ? 'var(--slime-green)' : 'var(--text-dim)' }}>
                  {isCurrentlySupporter ? `SUPPORTER (${currentRemainingDays} วัน • หมดอายุ: ${new Date(adjustDaysModal.expiresAt).toLocaleDateString('th-TH')})` : 'FREE (ยังไม่มีวันใช้งาน)'}
                </span>
              </div>

              {/* Adjustment Mode Selector */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 16 }}>
                <button
                  type="button"
                  onClick={() => { setAdjustMode('offset'); setAdjustType('add'); }}
                  className="btn btn-sm"
                  style={{
                    padding: '8px 10px',
                    fontSize: 12,
                    borderRadius: 8,
                    background: adjustMode === 'offset' && adjustType === 'add' ? 'rgba(0, 255, 136, 0.15)' : 'rgba(17, 22, 32, 0.6)',
                    border: adjustMode === 'offset' && adjustType === 'add' ? '1px solid var(--slime-green)' : '1px solid var(--card-border)',
                    color: adjustMode === 'offset' && adjustType === 'add' ? 'var(--slime-green)' : 'var(--text-sub)',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 4
                  }}
                >
                  <IconPlus size={13} />
                  <span>{lang === 'th' ? 'เพิ่มวัน (Add)' : 'Add Days'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => { setAdjustMode('offset'); setAdjustType('deduct'); }}
                  className="btn btn-sm"
                  style={{
                    padding: '8px 10px',
                    fontSize: 12,
                    borderRadius: 8,
                    background: adjustMode === 'offset' && adjustType === 'deduct' ? 'rgba(255, 75, 75, 0.15)' : 'rgba(17, 22, 32, 0.6)',
                    border: adjustMode === 'offset' && adjustType === 'deduct' ? '1px solid var(--danger)' : '1px solid var(--card-border)',
                    color: adjustMode === 'offset' && adjustType === 'deduct' ? 'var(--danger)' : 'var(--text-sub)',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 4
                  }}
                >
                  <IconMinus size={13} />
                  <span>{lang === 'th' ? 'หักวัน (Deduct)' : 'Deduct Days'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAdjustMode('date')}
                  className="btn btn-sm"
                  style={{
                    padding: '8px 10px',
                    fontSize: 12,
                    borderRadius: 8,
                    background: adjustMode === 'date' ? 'rgba(0, 210, 255, 0.15)' : 'rgba(17, 22, 32, 0.6)',
                    border: adjustMode === 'date' ? '1px solid var(--accent-blue)' : '1px solid var(--card-border)',
                    color: adjustMode === 'date' ? 'var(--accent-blue)' : 'var(--text-sub)',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 4
                  }}
                >
                  <IconCalendar size={13} />
                  <span>{lang === 'th' ? 'ระบุวันที่ (Date)' : 'Set Date'}</span>
                </button>
              </div>

              {/* Input Controls */}
              {adjustMode === 'offset' ? (
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 12, color: 'var(--text-sub)', marginBottom: 6 }}>
                    {adjustType === 'add' ? (lang === 'th' ? 'จำนวนวันที่ต้องการเพิ่ม (วัน)' : 'Days to Add') : (lang === 'th' ? 'จำนวนวันที่ต้องการหักออก (วัน)' : 'Days to Deduct')}
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="3650"
                    value={adjustDaysValue}
                    onChange={(e) => {
                      const v = e.target.value;
                      setAdjustDaysValue(v === '' ? '' : (parseInt(v, 10) || 0));
                    }}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: 8,
                      fontSize: 14,
                      fontWeight: 700,
                      background: '#0B0F17',
                      border: `1px solid ${adjustType === 'add' ? 'var(--slime-green)' : 'var(--danger)'}`,
                      color: '#FFF'
                    }}
                  />
                  {/* Quick Chips Presets */}
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                    {(adjustType === 'add' ? [1, 3, 7, 14, 30, 60, 90] : [1, 3, 7, 14, 30]).map(val => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setAdjustDaysValue(val)}
                        className="btn btn-sm"
                        style={{
                          padding: '3px 8px',
                          fontSize: 11,
                          borderRadius: 6,
                          background: adjustDaysValue === val ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid var(--card-border)'
                        }}
                      >
                        {adjustType === 'add' ? `+${val}d` : `-${val}d`}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 12, color: 'var(--text-sub)', marginBottom: 6 }}>
                    {lang === 'th' ? 'เลือกวันหมดอายุใหม่' : 'Select New Expiry Date'}
                  </label>
                  <input
                    type="date"
                    value={adjustDateValue}
                    onChange={(e) => setAdjustDateValue(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: 8,
                      fontSize: 14,
                      background: '#0B0F17',
                      border: '1px solid var(--accent-blue)',
                      color: '#FFF'
                    }}
                  />
                </div>
              )}

              {/* Live Preview Box */}
              <div style={{
                background: willBeDowngraded ? 'rgba(255, 75, 75, 0.08)' : 'rgba(0, 255, 136, 0.06)',
                border: `1px solid ${willBeDowngraded ? 'var(--danger)' : 'var(--slime-green)'}`,
                borderRadius: 10,
                padding: '12px 14px',
                marginBottom: 16
              }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: willBeDowngraded ? 'var(--danger)' : 'var(--slime-green)', marginBottom: 6 }}>
                  {lang === 'th' ? 'ผลลัพธ์หลังการปรับ (Live Preview):' : 'Adjustment Preview:'}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, color: '#FFF' }}>
                  <span>{isCurrentlySupporter ? `${currentRemainingDays} วัน` : 'FREE'}</span>
                  <IconArrowRight size={14} style={{ color: 'var(--text-sub)' }} />
                  <span style={{ color: willBeDowngraded ? 'var(--danger)' : 'var(--slime-green)', fontWeight: 800 }}>
                    {willBeDowngraded ? (lang === 'th' ? 'FREE (หมดอายุทันที)' : 'Expired -> FREE') : `${previewRemainingDays} วัน (${new Date(previewExpiry).toLocaleDateString('th-TH')})`}
                  </span>
                </div>
                {willBeDowngraded && (
                  <div style={{ fontSize: 11, color: 'var(--danger)', marginTop: 6 }}>
                    {lang === 'th' ? '[Warning] วันที่ผลลัพธ์น้อยกว่าปัจจุบัน เซิร์ฟเวอร์จะถูกลดระดับเป็น FREE ทันที' : '[Warning] Resulting date is past/zero. Server will downgrade to FREE.'}
                  </div>
                )}
              </div>

              {/* Reason Input */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 12, color: 'var(--text-sub)', marginBottom: 6 }}>
                  {lang === 'th' ? 'บันทึกเหตุผล (Reason / Audit Note)' : 'Reason / Audit Note'}
                </label>
                <input
                  type="text"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder={lang === 'th' ? 'เช่น ชดเชยระบบ, หักวันคืนเงิน, เพิ่มโบนัส...' : 'e.g., Compensation, Refund, Bonus...'}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 8,
                    fontSize: 12,
                    background: '#0B0F17',
                    border: '1px solid var(--card-border)',
                    color: '#FFF'
                  }}
                />
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setAdjustDaysModal(null)}
                  className="btn btn-sm"
                  style={{ padding: '8px 16px', borderRadius: 8 }}
                >
                  {lang === 'th' ? 'ยกเลิก' : 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={handleConfirmCustomAdjust}
                  className={`btn btn-sm ${adjustType === 'deduct' || willBeDowngraded ? 'btn-danger' : 'btn-primary'}`}
                  style={{ padding: '8px 18px', borderRadius: 8, fontWeight: 700 }}
                >
                  {lang === 'th' ? 'ยืนยันการปรับวัน' : 'Apply Adjustment'}
                </button>
              </div>
            </div>
          </Modal>
        );
      })()}

      {/* --- SYSTEM CAMPAIGN CREATE / EDIT MODAL --- */}
      {campaignModal && (
        <Modal onClose={() => setCampaignModal(null)}>
          <div className="glass-panel" style={{ width: 680, maxWidth: '95vw', padding: 24, borderRadius: 16, maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, borderBottom: '1px solid var(--card-border)', paddingBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: 'rgba(0, 255, 136, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--slime-green)'
                }}>
                  <IconSparkles size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: '#FFF' }}>
                    {campaignModal.mode === 'edit'
                      ? (lang === 'th' ? 'แก้ไขแคมเปญ' : 'Edit Campaign')
                      : (lang === 'th' ? 'สร้างแคมเปญใหม่' : 'Create Campaign')}
                  </h3>
                  <div style={{ fontSize: 11.5, color: 'var(--text-sub)', marginTop: 2 }}>
                    ID: <span style={{ fontFamily: 'monospace', color: 'var(--slime-green)' }}>{campForm.id}</span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCampaignModal(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-sub)', cursor: 'pointer', padding: 4 }}
              >
                <IconX size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveCampaign} style={{ overflowY: 'auto', flex: 1, paddingRight: 4, display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* 1. Basic Info */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--slime-green)', display: 'block', marginBottom: 8 }}>
                  1. {lang === 'th' ? 'ข้อมูลแคมเปญทั่วไป' : 'General Info'}
                </label>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-sub)', display: 'block', marginBottom: 4 }}>
                    {lang === 'th' ? 'ชื่อแคมเปญ' : 'Campaign Name'}
                  </label>
                  <input
                    type="text"
                    className="custom-input"
                    value={campForm.name}
                    onChange={(e) => setCampForm({ ...campForm, name: e.target.value })}
                    placeholder="เช่น GOOLIX Grand Launch Beta"
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10 }}>
                  <div>
                    <label style={{ fontSize: 11, color: 'var(--text-sub)', display: 'block', marginBottom: 4 }}>
                      {lang === 'th' ? 'วันและเวลาเริ่มต้น' : 'Starts At'}
                    </label>
                    <input
                      type="datetime-local"
                      className="custom-input"
                      value={campForm.startsAt}
                      onChange={(e) => setCampForm({ ...campForm, startsAt: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: 'var(--text-sub)', display: 'block', marginBottom: 4 }}>
                      {lang === 'th' ? 'วันและเวลาสิ้นสุด' : 'Ends At'}
                    </label>
                    <input
                      type="datetime-local"
                      className="custom-input"
                      value={campForm.endsAt}
                      onChange={(e) => setCampForm({ ...campForm, endsAt: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="checkbox"
                    id="campIsActive"
                    checked={campForm.isActive}
                    onChange={(e) => setCampForm({ ...campForm, isActive: e.target.checked })}
                    style={{ accentColor: 'var(--slime-green)' }}
                  />
                  <label htmlFor="campIsActive" style={{ fontSize: 12, color: '#FFF', cursor: 'pointer' }}>
                    {lang === 'th' ? 'เปิดใช้งานแคมเปญนี้ทันที (Active)' : 'Enable this campaign now (Active)'}
                  </label>
                </div>
              </div>

              {/* 2. Perks & Scaling */}
              <div style={{ borderTop: '1px solid var(--card-border)', paddingTop: 14 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--slime-green)', display: 'block', marginBottom: 8 }}>
                  2. {lang === 'th' ? 'สิทธิ์การใช้งาน & เพดานห้อง (Perks & Scaling)' : 'Perks & Scaling'}
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div style={{ padding: 12, borderRadius: 10, background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--card-border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <input
                        type="checkbox"
                        id="campGrantSupporter"
                        checked={campForm.grantSupporterToAll}
                        onChange={(e) => setCampForm({ ...campForm, grantSupporterToAll: e.target.checked })}
                        style={{ accentColor: 'var(--slime-green)' }}
                      />
                      <label htmlFor="campGrantSupporter" style={{ fontSize: 12, fontWeight: 700, color: '#FFF', cursor: 'pointer' }}>
                        {lang === 'th' ? 'แจก SUPPORTER ฟรีทุกเซิร์ฟ' : 'Grant Supporter to All'}
                      </label>
                    </div>
                    <div style={{ fontSize: 10.5, color: 'var(--text-dim)', paddingLeft: 22 }}>
                      {lang === 'th' ? 'ปลดล็อกคิว 100 เพลง, HQ Audio ให้ทุกกิลด์โดยไม่ต้องเติมเงิน' : 'Unlocks 100-queue and HQ for all servers'}
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: 11, color: 'var(--text-sub)', display: 'block', marginBottom: 4 }}>
                      {lang === 'th' ? 'จำกัดห้องพร้อมกันทั้งระบบ (Max Rooms)' : 'Max Concurrent Rooms'}
                    </label>
                    <input
                      type="number"
                      min="1"
                      className="custom-input"
                      value={campForm.maxConcurrentRooms}
                      onChange={(e) => setCampForm({ ...campForm, maxConcurrentRooms: e.target.value })}
                      required
                    />
                    <div style={{ fontSize: 10.5, color: 'var(--text-dim)', marginTop: 4 }}>
                      {lang === 'th' ? 'เพดานห้องสตรีมรวมช่วงทดสอบ เช่น 50 ห้อง' : 'Cluster room cap, e.g. 50'}
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. Topup & Expiry Rules */}
              <div style={{ borderTop: '1px solid var(--card-border)', paddingTop: 14 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--slime-green)', display: 'block', marginBottom: 8 }}>
                  3. {lang === 'th' ? 'นโยบายการเติมเงิน & วันหมดอายุ (Topup Policy)' : 'Topup Policy'}
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 11, color: 'var(--text-sub)', display: 'block', marginBottom: 4 }}>
                      {lang === 'th' ? 'รูปแบบการคำนวณวันหมดอายุ (Expiry Policy)' : 'Expiry Policy'}
                    </label>
                    <select
                      className="custom-input"
                      value={campForm.expiryPolicy}
                      onChange={(e) => setCampForm({ ...campForm, expiryPolicy: e.target.value })}
                    >
                      <option value="deferred_stack">Deferred Stack (นับต่อจากวันสิ้นสุดแคมเปญ)</option>
                      <option value="fixed_target">Fixed Target (ตัดจบตามวันที่กำหนด)</option>
                      <option value="standard">Standard (ทบปกติ)</option>
                    </select>
                    <div style={{ fontSize: 10.5, color: '#FBBF24', marginTop: 4 }}>
                      {campForm.expiryPolicy === 'deferred_stack'
                        ? (lang === 'th' ? 'เติมช่วงนี้ 30 วัน จะเริ่มนับต่อจากวันที่ 7 ฟรี (ได้ 7+30 = 37 วัน ไม่กินสิทธิ์ฟรี)' : 'Stacks after trial ends')
                        : (campForm.expiryPolicy === 'fixed_target'
                          ? (lang === 'th' ? 'วันหมดอายุจะถูกล็อกให้สิ้นสุด ณ วันที่กำหนดของรอบนี้' : 'Snaps to designated end date')
                          : (lang === 'th' ? 'ทบวันตามเวลาปัจจุบันตามปกติ' : 'Normal stacking'))}
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: 11, color: 'var(--text-sub)', display: 'block', marginBottom: 4 }}>
                      {lang === 'th' ? 'เพดานสะสมวันสูงสุด (Max Accumulated Days)' : 'Max Days Cap'}
                    </label>
                    <input
                      type="number"
                      min="1"
                      className="custom-input"
                      value={campForm.maxAccumulatedDays}
                      onChange={(e) => setCampForm({ ...campForm, maxAccumulatedDays: e.target.value })}
                      required
                    />
                    <div style={{ fontSize: 10.5, color: 'var(--text-dim)', marginTop: 4 }}>
                      {lang === 'th' ? 'เช่น 37 วัน (7 วันฟรี + 30 วันเติม)' : 'e.g. 37 days'}
                    </div>
                  </div>
                </div>

                {campForm.expiryPolicy === 'fixed_target' && (
                  <div style={{ marginTop: 10 }}>
                    <label style={{ fontSize: 11, color: 'var(--text-sub)', display: 'block', marginBottom: 4 }}>
                      {lang === 'th' ? 'วันที่กำหนดตัดจบ (Fixed Target Date)' : 'Fixed Target Date'}
                    </label>
                    <input
                      type="datetime-local"
                      className="custom-input"
                      value={campForm.fixedTargetDate}
                      onChange={(e) => setCampForm({ ...campForm, fixedTargetDate: e.target.value })}
                      required={campForm.expiryPolicy === 'fixed_target'}
                    />
                  </div>
                )}
              </div>

              {/* 4. Announcement Banner (Public Web) */}
              <div style={{ borderTop: '1px solid var(--card-border)', paddingTop: 14 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--slime-green)', display: 'block', marginBottom: 8 }}>
                  4. {lang === 'th' ? 'ข้อความประชาสัมพันธ์หน้าเว็บ (Public Announcement)' : 'Announcement'}
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 10, marginBottom: 10 }}>
                  <div>
                    <label style={{ fontSize: 11, color: 'var(--text-sub)', display: 'block', marginBottom: 4 }}>
                      {lang === 'th' ? 'ข้อความ Badge' : 'Badge Text'}
                    </label>
                    <input
                      type="text"
                      className="custom-input"
                      value={campForm.badgeText}
                      onChange={(e) => setCampForm({ ...campForm, badgeText: e.target.value })}
                      placeholder="✦ BETA LAUNCH"
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: 'var(--text-sub)', display: 'block', marginBottom: 4 }}>
                      {lang === 'th' ? 'พาดหัวแบนเนอร์ (Banner Title)' : 'Banner Title'}
                    </label>
                    <input
                      type="text"
                      className="custom-input"
                      value={campForm.bannerTitle}
                      onChange={(e) => setCampForm({ ...campForm, bannerTitle: e.target.value })}
                      placeholder="✦ GOOLIX ฉลองเปิดตัว! ปลดล็อก SUPPORTER ให้ลองฟรีทุกเซิร์ฟ"
                      required
                    />
                  </div>
                </div>

                <div style={{ marginBottom: 10 }}>
                  <label style={{ fontSize: 11, color: 'var(--text-sub)', display: 'block', marginBottom: 4 }}>
                    {lang === 'th' ? 'คำอธิบายแบนเนอร์ (Banner Subtitle)' : 'Banner Subtitle'}
                  </label>
                  <textarea
                    className="custom-input"
                    rows="2"
                    value={campForm.bannerSubtitle}
                    onChange={(e) => setCampForm({ ...campForm, bannerSubtitle: e.target.value })}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 11, color: 'var(--text-sub)' }}>
                    {lang === 'th' ? 'จุดเด่น 3 ข้อ (Info Bullet Points)' : '3 Bullet Points'}
                  </label>
                  <input
                    type="text"
                    className="custom-input"
                    value={campForm.infoPoint1}
                    onChange={(e) => setCampForm({ ...campForm, infoPoint1: e.target.value })}
                    placeholder="ข้อ 1: เช่น จำกัด 50 ห้องพร้อมกันนะ..."
                  />
                  <input
                    type="text"
                    className="custom-input"
                    value={campForm.infoPoint2}
                    onChange={(e) => setCampForm({ ...campForm, infoPoint2: e.target.value })}
                    placeholder="ข้อ 2: เช่น ครบ 7 วันแล้วเป็นไงต่อ?..."
                  />
                  <input
                    type="text"
                    className="custom-input"
                    value={campForm.infoPoint3}
                    onChange={(e) => setCampForm({ ...campForm, infoPoint3: e.target.value })}
                    placeholder="ข้อ 3: เช่น ช่วยกันดันได้นะ..."
                  />
                </div>

                <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="checkbox"
                    id="campShowCountdown"
                    checked={campForm.showCountdown}
                    onChange={(e) => setCampForm({ ...campForm, showCountdown: e.target.checked })}
                    style={{ accentColor: 'var(--slime-green)' }}
                  />
                  <label htmlFor="campShowCountdown" style={{ fontSize: 12, color: '#FFF', cursor: 'pointer' }}>
                    {lang === 'th' ? 'แสดงตัวนับเวลาถอยหลัง (Live Countdown)' : 'Show Live Countdown'}
                  </label>
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 12, borderTop: '1px solid var(--card-border)', paddingTop: 14 }}>
                <button type="button" onClick={() => setCampaignModal(null)} className="btn btn-sm">
                  {lang === 'th' ? 'ยกเลิก' : 'Cancel'}
                </button>
                <button type="submit" disabled={savingCampaign} className="btn btn-sm btn-primary" style={{ fontWeight: 700 }}>
                  {savingCampaign ? (lang === 'th' ? 'กำลังบันทึก...' : 'Saving...') : (lang === 'th' ? 'บันทึกข้อมูล' : 'Save Campaign')}
                </button>
              </div>
            </form>
          </div>
        </Modal>
      )}
    </div>
  );
}
