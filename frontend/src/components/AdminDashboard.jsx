import React, { useState, useEffect } from 'react';
import { 
  Shield, Server, HardDrive, Wifi, Activity, Cpu, RotateCw, 
  Trash2, Play, Square, FastForward, Search, Plus, Ban, CheckCircle, 
  AlertTriangle, Settings, RefreshCw, Power, Radio, Sliders, ExternalLink,
  Users, Globe, MapPin, Cloud, Save, Gift, ChevronLeft, ChevronRight
} from 'lucide-react';

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

  const [editNodeModal, setEditNodeModal] = useState(null); // node obj
  const [nodeNameInput, setNodeNameInput] = useState('');
  const [nodeMaxRoomsInput, setNodeMaxRoomsInput] = useState(15);

  // Add Node Modal State
  const [addNodeModal, setAddNodeModal] = useState(false);
  const [addNodeName, setAddNodeName] = useState('');
  const [addNodeHost, setAddNodeHost] = useState('');
  const [addNodePort, setAddNodePort] = useState(2333);
  const [addNodeMaxRooms, setAddNodeMaxRooms] = useState(15);

  // New Drop
  const [dropCode, setDropCode] = useState('');
  const [dropClaims, setDropClaims] = useState(50);
  const [dropDays, setDropDays] = useState(30);

  // Settings
  const [settingsForm, setSettingsForm] = useState({
    paymentMode: 'sandbox',
    price30Days: 29,
    maxFreeStreams: 6,
    maxTotalStreams: 12
  });

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
        if (json.config) {
          setSettingsForm({
            paymentMode: json.config.paymentMode || 'sandbox',
            price30Days: json.config.price30Days || 29,
            maxFreeStreams: json.config.maxFreeStreams || 6,
            maxTotalStreams: json.config.maxTotalStreams || 12
          });
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
      }
    } catch (err) {
      onToast('error', 'Error', err.message);
    }
  };

  const handleSaveNodeConfig = async () => {
    if (!editNodeModal) return;
    try {
      const res = await fetch(`/api/admin/nodes/${editNodeModal.id}/config`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: nodeNameInput,
          maxRooms: parseInt(nodeMaxRoomsInput, 10)
        })
      });
      const resJson = await res.json();
      if (resJson.success) {
        onToast('success', lang === 'th' ? 'บันทึกการตั้งค่าโหนดแล้ว' : 'Node Config Saved');
        setEditNodeModal(null);
        fetchData();
      }
    } catch (err) {
      onToast('error', 'Error', err.message);
    }
  };

  const handleAddNode = async (e) => {
    e.preventDefault();
    if (!addNodeHost.trim()) {
      onToast('warning', lang === 'th' ? 'กรุณาระบุ Host หรือ IP' : 'Host is required');
      return;
    }
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
          port: parseInt(addNodePort, 10),
          maxRooms: parseInt(addNodeMaxRooms, 10)
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
  const handleAdjustGuildDays = async (guildId, days) => {
    try {
      const res = await fetch(`/api/admin/guilds/${guildId}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ addDays: days, plan: days < 0 ? 'FREE' : 'SUPPORTER' })
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
    try {
      const res = await fetch('/api/admin/campaigns', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          code: dropCode.trim(),
          maxClaims: dropClaims,
          days: dropDays
        })
      });
      const resJson = await res.json();
      if (resJson.success) {
        onToast('success', lang === 'th' ? 'สร้างแคมเปญสำเร็จ' : 'Campaign Created');
        setDropCode('');
        fetchData();
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

  // Config Actions
  const handleSaveSettings = async (e) => {
    e.preventDefault();
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
        fetchData();
      } else {
        onToast('error', 'Error', resJson.error);
      }
    } catch (err) {
      onToast('error', 'Error', err.message);
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
            {data?.stats?.slots?.total || 0} / {data?.stats?.slots?.maxTotal || 12}
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--text-sub)' }}>
            Free: {data?.stats?.slots?.free || 0}/{data?.stats?.slots?.maxFree || 6} • VIP Max: {data?.stats?.slots?.dynamicVipMax || 0}
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
                <Globe size={13} />
                <span>Hybrid Cloud & Residential Active</span>
              </span>
            ) : (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <MapPin size={13} style={{ color: 'var(--text-dim)' }} />
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
            {data?.guilds?.filter(g => g.isSupporter).length || 0} VIP Supporters
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
            เรต: {data?.config?.price30Days || 29} บาท / 30 วัน
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
          { id: 'nodes', label: lang === 'th' ? 'โหนดประมวลผลเสียง (Cluster)' : 'Audio Nodes', icon: <Server size={15} /> },
          { id: 'streams', label: `${lang === 'th' ? 'ห้องที่กำลังเล่น' : 'Live Streams'} (${data?.players?.length || 0})`, icon: <Radio size={15} /> },
          { id: 'guilds', label: lang === 'th' ? 'จัดการเซิร์ฟเวอร์ (Subscriptions)' : 'Guilds', icon: <Shield size={15} /> },
          { id: 'drops', label: lang === 'th' ? 'แคมเปญ Early-Bird' : 'Drops', icon: <Plus size={15} /> },
          { id: 'tx', label: lang === 'th' ? 'ประวัติธุรกรรม (Audit Log)' : 'Transactions', icon: <Activity size={15} /> },
          { id: 'settings', label: lang === 'th' ? 'ตั้งค่าระบบ (Settings)' : 'Settings', icon: <Settings size={15} /> }
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
            <RefreshCw size={13} />
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
                <Server size={16} style={{ color: 'var(--slime-green)' }} />
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
                    <ChevronLeft size={14} />
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
                    <ChevronRight size={14} />
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
                  <span style={{ fontWeight: 700, color: selectedNode.status === 'online' ? 'var(--slime-green)' : '#FFF' }}>
                    {selectedNode.status?.toUpperCase()}
                  </span>
                  <span style={{ color: 'var(--text-dim)' }}>•</span>
                  <span style={{ color: 'var(--text-sub)' }}>{selectedNode.activeRooms || 0}/{selectedNode.maxRooms} Rooms</span>
                  <span style={{ color: 'var(--text-dim)' }}>•</span>
                  <span style={{ color: 'var(--text-sub)' }}>{selectedNode.latency >= 0 ? `${selectedNode.latency}ms` : 'Local'}</span>
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
                <Plus size={14} />
                <span>{lang === 'th' ? 'เพิ่มโหนด (Add Node)' : 'Add Node'}</span>
              </button>
            </div>
          </div>

          {selectedNode ? (
            <div style={{ marginBottom: 28 }}>
              {/* Node Metrics Cards (The 3 cards user requested!) */}
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
                        <HardDrive size={14} style={{ color: 'var(--slime-green)' }} />
                        <span>{lang === 'th' ? 'ดิสก์ & แคชเพลง (STORAGE)' : 'Disk & Song Cache'}</span>
                      </div>
                      <div style={{ fontSize: 20, fontWeight: 800, color: '#FFF', margin: '8px 0 4px' }}>
                        {selectedNode.cache ? `${selectedNode.cache.usedMb} / ${selectedNode.cache.maxMb} MB (Cache)` : `${data?.stats?.cache?.usedMb || 0} / ${data?.stats?.cache?.maxMb || 350} MB`}
                      </div>
                      <div style={{ fontSize: 11.5, color: 'var(--slime-green)' }}>
                        {selectedNode.disk ? `Disk รวม: ${selectedNode.disk.usedGb}G / ${selectedNode.disk.totalGb}G (ว่าง ${selectedNode.disk.freeMb}M)` : `Disk ว่าง: ${data?.stats?.disk?.freeMb || 0} MB`}
                      </div>
                    </div>
                    <button
                      onClick={() => handleClearNodeCache(selectedNode.id)}
                      className="btn btn-sm btn-danger"
                      style={{ padding: '6px 10px', fontSize: 11 }}
                      title="Clear Cache"
                    >
                      <Trash2 size={12} />
                      <span>{lang === 'th' ? 'ล้างแคช' : 'Clear'}</span>
                    </button>
                  </div>
                  {/* Cache usage progress bar */}
                  <div style={{ width: '100%', height: 4, background: '#1E2838', borderRadius: 2, overflow: 'hidden', marginTop: 10 }}>
                    <div style={{
                      width: `${Math.min(100, Math.round(((selectedNode.cache?.usedMb || 0) / (selectedNode.cache?.maxMb || 1)) * 100))}%`,
                      height: '100%',
                      background: 'var(--slime-green)'
                    }} />
                  </div>
                </div>

                {/* 2. Bandwidth Monthly Quota Card */}
                <div className="glass-panel" style={{ padding: 20 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-sub)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Wifi size={14} style={{ color: 'var(--accent-blue)' }} />
                    <span>{lang === 'th' ? 'แบนด์วิธ (MONTHLY QUOTA)' : 'Bandwidth Quota'}</span>
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#FFF', margin: '8px 0 4px' }}>
                    {selectedNode.bandwidth ? `${selectedNode.bandwidth.usedGb} GB / ${selectedNode.bandwidth.quotaGb} GB (${selectedNode.bandwidth.percent}%)` : `${data?.stats?.bandwidth?.usedGb || 0} GB / ${data?.stats?.bandwidth?.quotaGb || 800} GB (${data?.stats?.bandwidth?.percent || 0}%)`}
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--slime-green)' }}>
                    Tx: {selectedNode.bandwidth?.txGb || data?.stats?.bandwidth?.txGb || 0} GB • Rx: {selectedNode.bandwidth?.rxGb || data?.stats?.bandwidth?.rxGb || 0} GB
                  </div>
                  <div style={{ width: '100%', height: 4, background: '#1E2838', borderRadius: 2, overflow: 'hidden', marginTop: 10 }}>
                    <div style={{
                      width: `${selectedNode.bandwidth?.percent || data?.stats?.bandwidth?.percent || 0}%`,
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
                        <Radio size={14} style={{ color: 'var(--cyber-pink)' }} />
                        <span>{lang === 'th' ? 'เครือข่าย & VPN' : 'Network & VPN'}</span>
                      </div>
                      <div style={{ fontSize: 17, fontWeight: 800, color: '#FFF', margin: '8px 0 4px' }}>
                        {selectedNode.vpn?.server || (selectedNode.type === 'remote' ? 'Residential / Direct' : 'Direct')}
                        <span style={{ fontSize: 11, color: 'var(--slime-green)', marginLeft: 8 }}>
                          (Online)
                        </span>
                      </div>
                      <div style={{ fontSize: 11.5, color: 'var(--text-sub)' }}>
                        Exit IP: <strong style={{ color: 'var(--slime-green)' }}>{selectedNode.vpn?.exitIp || selectedNode.host || 'Direct'}</strong>
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>
                        Circuit: <strong style={{ color: selectedNode.circuit?.isOpen ? 'var(--danger)' : 'var(--slime-green)' }}>{selectedNode.circuit?.status || 'CLOSED'}</strong>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <button
                        onClick={() => handleSwitchNodeVpn(selectedNode.id)}
                        className="btn btn-sm btn-pink"
                        style={{ padding: '4px 8px', fontSize: 11 }}
                        title="Switch VPN Server"
                      >
                        <RotateCw size={11} />
                        <span>{lang === 'th' ? 'สลับ' : 'Switch'}</span>
                      </button>
                      {selectedNode.circuit?.isOpen && (
                        <button
                          onClick={() => handleResetNodeCircuit(selectedNode.id)}
                          className="btn btn-sm btn-danger"
                          style={{ padding: '4px 8px', fontSize: 11 }}
                        >
                          Reset
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* 4. Stream Guard & Compute Load */}
                <div className="glass-panel" style={{ padding: 20 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-sub)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Cpu size={14} style={{ color: 'var(--accent-yellow)' }} />
                    <span>{lang === 'th' ? 'STREAM GUARD & CPU' : 'Stream Guard & Load'}</span>
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#FFF', margin: '8px 0 4px' }}>
                    Spawns: <span style={{ color: 'var(--slime-green)' }}>{selectedNode.activeSpawns || 0}</span> / {selectedNode.maxSpawns || 2}
                    <span style={{ fontSize: 12, color: 'var(--text-sub)', marginLeft: 6 }}>
                      (Queue: {selectedNode.queuedSpawns || 0})
                    </span>
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-sub)' }}>
                    CPU: {selectedNode.cpu || '-'}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>
                    RAM: {selectedNode.hostRam || selectedNode.ram || '-'}
                  </div>
                </div>
              </div>

              {/* Node Management Actions */}
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button
                  onClick={() => handleToggleDrain(selectedNode.id)}
                  className={`btn btn-sm ${selectedNode.status === 'draining' ? 'btn-primary' : 'btn-danger'}`}
                >
                  <Power size={13} />
                  <span>{selectedNode.status === 'draining' ? (lang === 'th' ? 'ยกเลิกโหมด Drain (กลับสู่ปกติ)' : 'Resume Node') : (lang === 'th' ? 'เปิดโหมด Drain (ไม่รับงานใหม่)' : 'Drain Node')}</span>
                </button>
                <button
                  onClick={() => {
                    setEditNodeModal(selectedNode);
                    setNodeNameInput(selectedNode.name || selectedNode.id);
                    setNodeMaxRoomsInput(selectedNode.maxRooms || 15);
                  }}
                  className="btn btn-sm"
                >
                  <Sliders size={13} />
                  <span>{lang === 'th' ? 'แก้ไขชื่อ / ความจุโหนด' : 'Edit Node Settings'}</span>
                </button>
              </div>
            </div>
          ) : null}

          {/* All Nodes Cluster Table */}
          <div className="glass-panel" style={{ padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Server size={16} style={{ color: 'var(--slime-green)' }} />
                <span>{lang === 'th' ? `รายชื่อโหนดในคลัสเตอร์ทั้งหมด (${nodesList.length})` : `Cluster Nodes (${nodesList.length})`}</span>
              </h3>

              {/* Node Search Bar for Scalable Cluster Management */}
              <div style={{ position: 'relative', width: 260, maxWidth: '100%' }}>
                <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-sub)' }} />
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
                          <span style={{ color: 'var(--slime-green)' }}>{n.activeRooms || 0}</span> / {n.maxRooms || 15}
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
                                <Trash2 size={11} />
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
            <Radio size={16} style={{ color: 'var(--slime-green)' }} />
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
                        {p.isSupporter && <span className="slime-badge" style={{ marginLeft: 6, fontSize: 9 }}>VIP</span>}
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
                            <Cloud size={12} />
                          ) : (
                            <Play size={10} fill="currentColor" />
                          )}
                          <span>{(p.sourceType === 'soundcloud' || p.source?.toLowerCase().includes('soundcloud')) ? 'SoundCloud' : 'YouTube'}</span>
                        </span>
                      </td>
                      <td style={{ fontSize: 12 }}>
                        {p.elapsed} • <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Users size={12} /> {p.listeners || 0}</span>
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
                            <FastForward size={12} />
                          </button>
                          <button
                            onClick={() => handlePlayerAction(p.guildId, 'stop')}
                            className="btn btn-sm btn-danger"
                            style={{ padding: '4px 8px' }}
                            title="Stop"
                          >
                            <Square size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-dim)' }}>
                      {lang === 'th' ? 'ไม่มีห้องที่กำลังเล่นเพลงอยู่ค่ะ' : 'No active playback sessions'}
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
              <Shield size={16} style={{ color: 'var(--slime-green)' }} />
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
                        <span className="slime-badge" style={{ fontSize: 10 }}>VIP SUPPORTER</span>
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
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button
                          onClick={() => handleAdjustGuildDays(g.guildId, 7)}
                          className="btn btn-sm"
                          style={{ padding: '3px 8px', fontSize: 11 }}
                        >
                          +7d
                        </button>
                        <button
                          onClick={() => handleAdjustGuildDays(g.guildId, 30)}
                          className="btn btn-sm btn-primary"
                          style={{ padding: '3px 8px', fontSize: 11 }}
                        >
                          +30d
                        </button>
                        <button
                          onClick={() => handleAdjustGuildDays(g.guildId, -1)}
                          className="btn btn-sm btn-danger"
                          style={{ padding: '3px 8px', fontSize: 11 }}
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

      {/* --- TAB 4: CAMPAIGNS & EARLY BIRD DROPS --- */}
      {activeSubTab === 'drops' && (
        <div className="glass-panel fade-in" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Gift size={16} style={{ color: 'var(--slime-green)' }} />
            <span>{lang === 'th' ? 'แคมเปญ Early-Bird Drops' : 'Early-Bird Drops'}</span>
          </h3>

          {/* Create Drop Form */}
          <form onSubmit={handleCreateDrop} style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 24 }}>
            <input
              type="text"
              placeholder={lang === 'th' ? 'รหัสโค้ด เช่น DROP1' : 'Code e.g. DROP1'}
              value={dropCode}
              onChange={(e) => setDropCode(e.target.value.toUpperCase())}
              style={{ width: 180 }}
              required
            />
            <input
              type="number"
              placeholder="Claims Limit"
              value={dropClaims}
              onChange={(e) => setDropClaims(parseInt(e.target.value, 10))}
              style={{ width: 120 }}
              min="1"
            />
            <input
              type="number"
              placeholder="Days"
              value={dropDays}
              onChange={(e) => setDropDays(parseInt(e.target.value, 10))}
              style={{ width: 100 }}
              min="1"
            />
            <button type="submit" className="btn btn-primary">
              <Plus size={14} />
              <span>{lang === 'th' ? 'สร้างแคมเปญ' : 'Create Drop'}</span>
            </button>
          </form>

          {/* Drops Table */}
          <div style={{ overflowX: 'auto' }}>
            <table className="custom-table">
              <thead>
                <tr>
                  <th>{lang === 'th' ? 'รหัสโค้ด' : 'Code'}</th>
                  <th>{lang === 'th' ? 'ชื่อแคมเปญ' : 'Name'}</th>
                  <th>{lang === 'th' ? 'สิทธิ์ที่เคลมแล้ว' : 'Claims'}</th>
                  <th>{lang === 'th' ? 'จำนวนวัน' : 'Days'}</th>
                  <th>{lang === 'th' ? 'จัดการ' : 'Action'}</th>
                </tr>
              </thead>
              <tbody>
                {Object.values(data?.campaigns || {}).map((c) => (
                  <tr key={c.code}>
                    <td style={{ fontWeight: 700, color: 'var(--slime-green)', fontFamily: 'monospace' }}>{c.code}</td>
                    <td>{c.name}</td>
                    <td>{c.claimedCount || 0} / {c.maxClaims}</td>
                    <td>+{c.days} วัน</td>
                    <td>
                      <button
                        onClick={() => handleDeleteDrop(c.code)}
                        className="btn btn-sm btn-danger"
                        style={{ padding: '4px 8px' }}
                      >
                        <Trash2 size={12} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- TAB 5: TRANSACTIONS & AUDIT LOG --- */}
      {activeSubTab === 'tx' && (
        <div className="glass-panel fade-in" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Activity size={16} style={{ color: 'var(--slime-green)' }} />
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
        <div className="glass-panel fade-in" style={{ padding: 24, maxWidth: 640 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Settings size={18} style={{ color: 'var(--slime-green)' }} />
            <span>{lang === 'th' ? 'ตั้งค่าระบบด่วน (Live Config)' : 'System Configuration'}</span>
          </h3>

          <form onSubmit={handleSaveSettings}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-sub)', marginBottom: 6 }}>
                {lang === 'th' ? 'โหมดการชำระเงิน (Payment Mode)' : 'Payment Mode'}
              </label>
              <select
                value={settingsForm.paymentMode}
                onChange={(e) => setSettingsForm({ ...settingsForm, paymentMode: e.target.value })}
              >
                <option value="sandbox">โหมดทดสอบ (SANDBOX - ปลอดภัย ไม่เสียเงินจริง)</option>
                <option value="production">โหมดใช้งานจริง (PRODUCTION - รับซอง TrueMoney จริง)</option>
              </select>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-sub)', marginBottom: 6 }}>
                {lang === 'th' ? 'ราคาผู้สนับสนุน (บาท / 30 วัน)' : 'Supporter Price (THB / 30 Days)'}
              </label>
              <input
                type="number"
                value={settingsForm.price30Days}
                onChange={(e) => setSettingsForm({ ...settingsForm, price30Days: parseInt(e.target.value, 10) })}
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
                  onChange={(e) => setSettingsForm({ ...settingsForm, maxFreeStreams: parseInt(e.target.value, 10) })}
                  min="0"
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-sub)', marginBottom: 6 }}>
                  {lang === 'th' ? 'โควตาสตรีมรวมสูงสุด (Max Total)' : 'Max Total Slots'}
                </label>
                <input
                  type="number"
                  value={settingsForm.maxTotalStreams}
                  onChange={(e) => setSettingsForm({ ...settingsForm, maxTotalStreams: parseInt(e.target.value, 10) })}
                  min="1"
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '12px 18px', marginBottom: 16 }}>
              <Save size={15} />
              <span>{lang === 'th' ? 'บันทึกการตั้งค่าระบบ' : 'Save System Settings'}</span>
            </button>
          </form>

          <div style={{ borderTop: '1px solid var(--card-border)', paddingTop: 16 }}>
            <button
              onClick={handleForceSweep}
              className="btn btn-sm"
              style={{ width: '100%', padding: '10px' }}
            >
              <RefreshCw size={14} />
              <span>{lang === 'th' ? 'สั่ง Sweep เคลียร์ห้องหมดอายุทันที (Force Sweep)' : 'Force Sweep Idle Rooms'}</span>
            </button>
          </div>
        </div>
      )}

      {/* --- BAN MODAL --- */}
      {banModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 999
        }}>
          <div className="glass-panel" style={{ width: 420, padding: 24 }}>
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
        </div>
      )}

      {/* --- EDIT NODE MODAL --- */}
      {editNodeModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 999
        }}>
          <div className="glass-panel" style={{ width: 420, padding: 24 }}>
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
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 12, color: 'var(--text-sub)', marginBottom: 6 }}>
                {lang === 'th' ? 'ความจุห้องสูงสุด (Max Rooms)' : 'Max Rooms'}
              </label>
              <input
                type="number"
                value={nodeMaxRoomsInput}
                onChange={(e) => setNodeMaxRoomsInput(parseInt(e.target.value, 10))}
                min="1"
              />
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setEditNodeModal(null)} className="btn btn-sm">
                {lang === 'th' ? 'ยกเลิก' : 'Cancel'}
              </button>
              <button onClick={handleSaveNodeConfig} className="btn btn-sm btn-primary">
                {lang === 'th' ? 'บันทึก' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- ADD NODE MODAL --- */}
      {addNodeModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 999
        }}>
          <div className="glass-panel" style={{ width: 440, padding: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Server size={18} style={{ color: 'var(--slime-green)' }} />
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
                    onChange={(e) => setAddNodeMaxRooms(parseInt(e.target.value, 10))}
                    min="1"
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setAddNodeModal(false)} className="btn btn-sm">
                  {lang === 'th' ? 'ยกเลิก' : 'Cancel'}
                </button>
                <button type="submit" className="btn btn-sm btn-primary">
                  <Plus size={13} />
                  <span>{lang === 'th' ? 'บันทึกและเชื่อมต่อทันที' : 'Connect Node'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
