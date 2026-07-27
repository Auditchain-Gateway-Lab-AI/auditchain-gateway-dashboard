import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import Icon from '../components/common/Icon';
import { parseJwt, formatTimestamp } from '../utils/formatters';

function AdminPage({ onLogout }) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('clients');
  const [clients, setClients] = useState([]);
  const [kafkaConfigs, setKafkaConfigs] = useState([]);
  const [summary, setSummary] = useState({ total_clients: 0, active_streams: 0 });
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Modal states
  const [showClientModal, setShowClientModal] = useState(false);
  const [showKafkaModal, setShowKafkaModal] = useState(false);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [newApiKey, setNewApiKey] = useState('');
  const [apiKeyCopied, setApiKeyCopied] = useState(false);
  const [customTailscaleKey, setCustomTailscaleKey] = useState('');
  const [setupCmdCopied, setSetupCmdCopied] = useState(false);

  // Quick Setup Modal states (for existing clients)
  const [showQuickSetupModal, setShowQuickSetupModal] = useState(false);
  const [selectedQuickSetupClient, setSelectedQuickSetupClient] = useState(null);

  // Installer Script Helpers
  const getInstallerScriptUrl = useCallback(() => {
    const baseURL = api.defaults.baseURL || 'http://localhost:8080/api';
    const cleanBase = baseURL.replace(/\/$/, '');
    return `${cleanBase}/install.sh`;
  }, []);

  const buildInstallCommand = useCallback((apiKey, tailscaleKey) => {
    const baseURL = api.defaults.baseURL || 'http://localhost:8080/api';
    const cleanBase = baseURL.replace(/\/$/, '');
    const scriptUrl = `${cleanBase}/install.sh`;
    let cmd = `GATEWAY_URL="${cleanBase}" CLIENT_KEY="${apiKey || '<YOUR_CLIENT_API_KEY>'}"`;
    if (tailscaleKey && tailscaleKey.trim()) {
      cmd += ` TAILSCALE_AUTHKEY="${tailscaleKey.trim()}"`;
    }
    cmd += ` sudo -E bash -c "$(curl -fsSL ${scriptUrl})"`;
    return cmd;
  }, []);

  const handleCopySetupCmd = useCallback((cmdText) => {
    navigator.clipboard.writeText(cmdText).then(() => {
      setSetupCmdCopied(true);
      setTimeout(() => setSetupCmdCopied(false), 2000);
    }).catch(() => {
      const el = document.createElement('textarea');
      el.value = cmdText;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setSetupCmdCopied(true);
      setTimeout(() => setSetupCmdCopied(false), 2000);
    });
  }, []);

  // Agent Lapis 3 Modal states
  const [showAgentModal, setShowAgentModal] = useState(false);
  const [selectedAgentClient, setSelectedAgentClient] = useState(null);
  const [agentConfig, setAgentConfig] = useState(null);
  const [agentLoading, setAgentLoading] = useState(false);
  const [agentActionLoading, setAgentActionLoading] = useState(false);
  const [agentActionError, setAgentActionError] = useState('');
  const [agentActionSuccess, setAgentActionSuccess] = useState('');
  const [agentPingLoading, setAgentPingLoading] = useState(false);
  const [agentPingResult, setAgentPingResult] = useState(null);
  const [agentForm, setAgentForm] = useState({
    agent_url: '',
    verify_token: '',
    timeout_seconds: 5,
  });

  // Manage client users state
  const [manageUsersClient, setManageUsersClient] = useState(null);
  const [clientUsers, setClientUsers] = useState([]);
  const [newUserUsername, setNewUserUsername] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserConfirmPassword, setNewUserConfirmPassword] = useState('');
  const [userActionLoading, setUserActionLoading] = useState(false);
  const [userActionError, setUserActionError] = useState('');

  // Client form state
  const [clientForm, setClientForm] = useState({
    company_name: '', subscription_tier: 'basic', rate_limit_per_sec: 50,
    status: 'active', actor_field: 'actor', fallback_actor_field: '',
    action_field: 'action', resource_field: 'resource',
  });

  // Kafka form state
  const [kafkaForm, setKafkaForm] = useState({
    client_id: '', kafka_brokers: '', topic_prefix: '',
    source_system: '', pk_field: 'ID', actor_field: '__user_name',
  });

  const clientInfo = useMemo(() => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    return parseJwt(token);
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const [summaryRes, clientsRes, kafkaRes] = await Promise.all([
        api.get('/admin/summary'),
        api.get('/admin/clients'),
        api.get('/admin/kafka-configs')
      ]);
      setSummary(summaryRes.data || { total_clients: 0, active_streams: 0 });
      setClients(clientsRes.data || []);
      setKafkaConfigs(kafkaRes.data || []);
    } catch (err) {
      console.error("Gagal load admin dashboard data:", err);
      if (err.response?.status === 401) {
        onLogout();
      }
    }
  }, [onLogout]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleToggleClientStatus = useCallback(async (client) => {
    let actionText = client.status === 'active' ? 'deactivate' : 'activate';
    let confirmMsg = `Are you sure you want to ${actionText} the client "${client.company_name}"?`;
    if (client.status === 'pending_setup') {
      confirmMsg = `Verify & activate client "${client.company_name}"? Client status will be changed to Active.`;
    }
    if (!window.confirm(confirmMsg)) {
      return;
    }
    try {
      await api.patch(`/admin/clients/${client.id}/toggle`);
      fetchData();
    } catch (err) {
      console.error("Gagal mengubah status klien:", err);
      alert(err.response?.data?.error || "Failed to update client status.");
    }
  }, [fetchData]);

  const handleDeleteClient = useCallback(async (client) => {
    if (!window.confirm(`Are you sure you want to permanently delete the client "${client.company_name}"? All associated users will also lose access.`)) {
      return;
    }
    try {
      await api.delete(`/admin/clients/${client.id}`);
      fetchData();
    } catch (err) {
      console.error("Gagal menghapus klien:", err);
      alert(err.response?.data?.error || "Failed to delete client.");
    }
  }, [fetchData]);

  const fetchClientUsers = useCallback(async (clientId) => {
    try {
      setUserActionLoading(true);
      setUserActionError('');
      const res = await api.get(`/admin/clients/${clientId}/users`);
      setClientUsers(res.data || []);
    } catch (err) {
      console.error("Gagal load user klien:", err);
      setUserActionError(err.response?.data?.error || "Failed to load client users.");
    } finally {
      setUserActionLoading(false);
    }
  }, []);

  const handleManageUsers = useCallback((client) => {
    setManageUsersClient(client);
    setClientUsers([]);
    setNewUserUsername('');
    setNewUserPassword('');
    setNewUserConfirmPassword('');
    setUserActionError('');
    fetchClientUsers(client.id);
  }, [fetchClientUsers]);

  const handleAddClientUser = useCallback(async (e) => {
    e.preventDefault();
    if (!manageUsersClient) return;
    if (newUserPassword !== newUserConfirmPassword) {
      setUserActionError("Passwords do not match.");
      return;
    }
    try {
      setUserActionLoading(true);
      setUserActionError('');
      await api.post(`/admin/clients/${manageUsersClient.id}/users`, {
        username: newUserUsername,
        password: newUserPassword
      });
      setNewUserUsername('');
      setNewUserPassword('');
      setNewUserConfirmPassword('');
      fetchClientUsers(manageUsersClient.id);
    } catch (err) {
      console.error("Gagal menambahkan user klien:", err);
      setUserActionError(err.response?.data?.error || "Failed to create user account.");
    } finally {
      setUserActionLoading(false);
    }
  }, [manageUsersClient, newUserUsername, newUserPassword, newUserConfirmPassword, fetchClientUsers]);

  const handleDeleteClientUser = useCallback(async (user) => {
    if (!window.confirm(`Are you sure you want to delete the user account "${user.username}"?`)) {
      return;
    }
    try {
      setUserActionLoading(true);
      setUserActionError('');
      await api.delete(`/admin/users/${user.id}`);
      if (manageUsersClient) {
        fetchClientUsers(manageUsersClient.id);
      }
    } catch (err) {
      console.error("Gagal menghapus user klien:", err);
      setUserActionError(err.response?.data?.error || "Failed to delete user account.");
    } finally {
      setUserActionLoading(false);
    }
  }, [manageUsersClient, fetchClientUsers]);

  const handleSubmitClient = useCallback(async (e) => {
    e.preventDefault();
    try {
      const response = await api.post('/admin/clients', {
        company_name: clientForm.company_name,
        status: clientForm.status,
        actor_field: clientForm.actor_field,
        fallback_actor_field: clientForm.fallback_actor_field,
        action_field: clientForm.action_field,
        resource_field: clientForm.resource_field
      });
      setNewApiKey(response.data.api_key);
      setShowClientModal(false);
      setShowApiKeyModal(true);
      setClientForm({
        company_name: '', subscription_tier: 'basic', rate_limit_per_sec: 50,
        status: 'active', actor_field: 'actor', fallback_actor_field: '',
        action_field: 'action', resource_field: 'resource',
      });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Gagal mendaftarkan klien');
    }
  }, [clientForm, fetchData]);

  const handleSubmitKafka = useCallback(async (e) => {
    e.preventDefault();
    try {
      await api.post('/admin/kafka-config', {
        client_id: kafkaForm.client_id,
        kafka_brokers: kafkaForm.kafka_brokers,
        topic_prefix: kafkaForm.topic_prefix,
        source_system: kafkaForm.source_system,
        pk_field: kafkaForm.pk_field,
        actor_field: kafkaForm.actor_field,
      });
      setShowKafkaModal(false);
      setKafkaForm({ client_id: '', kafka_brokers: '', topic_prefix: '', source_system: '', pk_field: 'ID', actor_field: '__user_name' });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Gagal menyimpan konfigurasi Kafka');
    }
  }, [kafkaForm, fetchData]);

  const handleToggleKafka = useCallback(async (configId) => {
    try {
      await api.patch(`/admin/kafka-config/${configId}/toggle`);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Gagal memperbarui status konfigurasi Kafka');
    }
  }, [fetchData]);

  const handleCopyApiKey = useCallback(() => {
    navigator.clipboard.writeText(newApiKey).then(() => {
      setApiKeyCopied(true);
      setTimeout(() => setApiKeyCopied(false), 2000);
    }).catch(() => {
      const el = document.createElement('textarea');
      el.value = newApiKey;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setApiKeyCopied(true);
      setTimeout(() => setApiKeyCopied(false), 2000);
    });
  }, [newApiKey]);

  // ======= AGENT LAPIS 3 HANDLERS =======
  const fetchAgentConfig = useCallback(async (clientId) => {
    try {
      setAgentLoading(true);
      setAgentActionError('');
      const res = await api.get(`/admin/clients/${clientId}/agent-config`);
      setAgentConfig(res.data);
      setAgentForm({
        agent_url: res.data.agent_url || '',
        verify_token: '',
        timeout_seconds: res.data.timeout_seconds || 5,
      });
    } catch (err) {
      if (err.response?.status === 404) {
        setAgentConfig(null);
        setAgentForm({ agent_url: '', verify_token: '', timeout_seconds: 5 });
      } else {
        console.error("Gagal load agent config:", err);
        setAgentActionError(err.response?.data?.error || "Gagal memuat konfigurasi Agent.");
      }
    } finally {
      setAgentLoading(false);
    }
  }, []);

  const handleOpenAgentModal = useCallback((client) => {
    setSelectedAgentClient(client);
    setShowAgentModal(true);
    setAgentConfig(null);
    setAgentPingResult(null);
    setAgentActionError('');
    setAgentActionSuccess('');
    fetchAgentConfig(client.id);
  }, [fetchAgentConfig]);

  const handleSaveAgentConfig = useCallback(async (e) => {
    e.preventDefault();
    if (!selectedAgentClient) return;
    try {
      setAgentActionLoading(true);
      setAgentActionError('');
      setAgentActionSuccess('');
      const res = await api.post(`/admin/clients/${selectedAgentClient.id}/agent-config`, {
        agent_url: agentForm.agent_url,
        verify_token: agentForm.verify_token,
        timeout_seconds: parseInt(agentForm.timeout_seconds, 10) || 5,
      });
      setAgentActionSuccess(res.data.message || "Konfigurasi Agent berhasil disimpan!");
      fetchAgentConfig(selectedAgentClient.id);
    } catch (err) {
      console.error("Gagal menyimpan agent config:", err);
      setAgentActionError(err.response?.data?.error || "Gagal menyimpan konfigurasi Agent.");
    } finally {
      setAgentActionLoading(false);
    }
  }, [selectedAgentClient, agentForm, fetchAgentConfig]);

  const handleDeleteAgentConfig = useCallback(async () => {
    if (!selectedAgentClient) return;
    if (!window.confirm(`Apakah Anda yakin ingin mencabut (revoke) akses Agent untuk klien "${selectedAgentClient.company_name}"?`)) {
      return;
    }
    try {
      setAgentActionLoading(true);
      setAgentActionError('');
      setAgentActionSuccess('');
      const res = await api.delete(`/admin/clients/${selectedAgentClient.id}/agent-config`);
      setAgentActionSuccess(res.data.message || "Konfigurasi Agent berhasil dihapus.");
      setAgentConfig(null);
      setAgentPingResult(null);
      setAgentForm({ agent_url: '', verify_token: '', timeout_seconds: 5 });
    } catch (err) {
      console.error("Gagal menghapus agent config:", err);
      setAgentActionError(err.response?.data?.error || "Gagal menghapus konfigurasi Agent.");
    } finally {
      setAgentActionLoading(false);
    }
  }, [selectedAgentClient]);

  const handlePingAgent = useCallback(async () => {
    if (!selectedAgentClient) return;
    try {
      setAgentPingLoading(true);
      setAgentPingResult(null);
      const startTime = performance.now();
      const res = await api.get(`/admin/clients/${selectedAgentClient.id}/agent-ping`);
      const endTime = performance.now();
      const latency = Math.round(endTime - startTime);
      setAgentPingResult({ ...res.data, latency });
    } catch (err) {
      console.error("Gagal ping agent:", err);
      if (err.response?.data) {
        setAgentPingResult({ ...err.response.data, latency: null });
      } else {
        setAgentPingResult({ reachable: false, error: err.message || "Gagal menghubungi server Agent.", latency: null });
      }
    } finally {
      setAgentPingLoading(false);
    }
  }, [selectedAgentClient]);

  const handleDeleteKafkaConfig = useCallback(async (configId, companyName) => {
    if (!window.confirm(`Apakah Anda yakin ingin menghapus konfigurasi Kafka untuk "${companyName || 'klien'}"?`)) {
      return;
    }
    try {
      await api.delete(`/admin/kafka-config/${configId}`);
      fetchData();
    } catch (err) {
      console.error("Gagal menghapus konfigurasi Kafka:", err);
      alert(err.response?.data?.error || "Gagal menghapus konfigurasi Kafka.");
    }
  }, [fetchData]);

  return (
    <div className="ac-shell">

      {/* ======= TOP NAV ======= */}
      <header className="ac-topnav">
        <div className="ac-topnav__brand">
          <button className="ac-topnav__menu-btn" onClick={() => setSidebarOpen(o => !o)}>
            <Icon name="menu" size={22} />
          </button>
          <img src="/logo/Group 1000009984.png" alt="Auditchain Logo" style={{ height: 38, width: 'auto', display: 'block', flexShrink: 0 }} />
          <div>
            <div className="ac-topnav__brand-name">Auditchain Gateway</div>
            <div className="ac-topnav__brand-sub ac-admin-portal-label">Admin Portal</div>
          </div>
        </div>
        <div className="ac-topnav__right">
          <div className="ac-topnav__client-pill ac-admin-pill">
            <span className="ac-topnav__client-dot ac-admin-dot" />
            <span className="ac-topnav__client-label">SUPER ADMIN</span>
          </div>
          <div className="ac-topnav__user">
            <div className="ac-topnav__user-info">
              <div className="ac-topnav__user-name">{clientInfo?.username || 'Admin'}</div>
              <div className="ac-topnav__user-role">{clientInfo?.role || 'System Administrator'}</div>
            </div>
            <div className="ac-topnav__avatar">
              {(clientInfo?.username || 'A').charAt(0).toUpperCase()}
            </div>
          </div>
          <button className="ac-topnav__logout" onClick={onLogout}>
            <Icon name="logout" size={16} />
            Logout
          </button>
        </div>
      </header>

      {/* ======= SIDEBAR ======= */}
      <aside className={`ac-sidebar${sidebarOpen ? ' ac-sidebar--open' : ''}`}>
        <div className="ac-sidebar__header">
          <div className="ac-sidebar__section-label">Admin Panel</div>
          <div className="ac-sidebar__section-sub">Client System Management</div>
        </div>
        <nav className="ac-sidebar__nav">
          <button
            className={`ac-sidebar__nav-item${activeTab === 'clients' ? ' ac-sidebar__nav-item--active' : ''}`}
            onClick={() => { setActiveTab('clients'); setSidebarOpen(false); }}
          >
            <Icon name="database" size={18} />
            Client Registry
          </button>
          <button
            className={`ac-sidebar__nav-item${activeTab === 'kafka' ? ' ac-sidebar__nav-item--active' : ''}`}
            onClick={() => { setActiveTab('kafka'); setSidebarOpen(false); }}
          >
            <Icon name="link" size={18} />
            Kafka Configuration
          </button>
          <div style={{ height: 1, background: 'var(--color-outline-variant)', margin: '8px 14px' }} />
          <button className="ac-sidebar__nav-item" onClick={() => navigate('/dashboard')}>
            <Icon name="dashboard" size={18} />
            Auditor Dashboard
          </button>
        </nav>
        <div className="ac-sidebar__footer">
          {clientInfo && (
            <div className="ac-sidebar__identity-card">
              <div className="ac-sidebar__identity-label">Session Identity</div>
              <div className="ac-sidebar__identity-user">
                <span className="ac-sidebar__identity-avatar">
                  {clientInfo.username.charAt(0).toUpperCase()}
                </span>
                <div className="ac-sidebar__identity-details">
                  <span className="ac-sidebar__identity-name" title={clientInfo.username}>{clientInfo.username}</span>
                  <span className="ac-sidebar__identity-role">{clientInfo.role}</span>
                </div>
              </div>
            </div>
          )}
          <button className="ac-sidebar__nav-item" style={{ marginTop: 6 }} onClick={onLogout}>
            <Icon name="logout" size={18} />
            Logout
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 35, background: 'rgba(0,0,0,0.3)' }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ======= MAIN CONTENT ======= */}
      <main className="ac-main">
        <div className="ac-main__container">

          {/* ===== HERO ADMIN ===== */}
          <section className="ac-hero">
            <div className="ac-hero__pattern" />
            <div className="ac-hero__content">
              <div className="ac-hero__left">
                <h1 className="ac-hero__title">⚙️ Admin Panel</h1>
                <p className="ac-hero__subtitle">
                  Register and manage all client systems connected to the AuditChain Gateway.
                  Each client is provisioned with a unique API Key, Kafka stream configuration, and isolated database storage.
                </p>
              </div>
              <div style={{ display: 'flex', gap: 12, flexShrink: 0 }}>
                <div className="ac-admin-hero-stat">
                  <div className="ac-admin-hero-stat__val">{summary.total_clients}</div>
                  <div className="ac-admin-hero-stat__label">Registered Clients</div>
                </div>
                <div className="ac-admin-hero-stat">
                  <div className="ac-admin-hero-stat__val">{summary.active_streams}</div>
                  <div className="ac-admin-hero-stat__label">Active Streams</div>
                </div>
              </div>
            </div>
          </section>

          {/* ===== TAB: DAFTAR KLIEN ===== */}
          {activeTab === 'clients' && (
            <section className="ac-card" style={{ animation: 'fadeIn 0.3s ease' }}>
              <div className="ac-card__header">
                <div>
                  <div className="ac-card__title">Client Registry</div>
                  <div className="ac-admin-card-sub">All client companies and systems registered under the AuditChain Gateway</div>
                </div>
                <button className="ac-btn-primary" onClick={() => setShowClientModal(true)}>
                  + Register New Client
                </button>
              </div>
              <div className="ac-table-wrap">
                <table className="ac-table">
                  <thead>
                    <tr>
                      <th>Company Name</th>
                      <th>Status</th>
                      <th>Field Mapping</th>
                      <th>Registration Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clients.length === 0 && (
                      <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--color-outline)', padding: '32px 0' }}>No registered clients found.</td></tr>
                    )}
                    {clients.map(client => {
                      const matchingKafka = kafkaConfigs.find(k => k.client_id === client.id);
                      return (
                        <tr key={client.id}>
                          <td>
                            <div style={{ fontWeight: 600, color: 'var(--color-on-surface)' }}>{client.company_name}</div>
                            <div style={{ fontSize: 11, color: 'var(--color-outline)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>{client.id}</div>
                            {matchingKafka && (
                              <div style={{ fontSize: 10, color: 'var(--color-outline)', marginTop: 3, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                🖥️ <span>{matchingKafka.source_system}</span> <code className="ac-code-chip" style={{ fontSize: '9px', padding: '1px 4px' }}>{matchingKafka.kafka_brokers}</code>
                              </div>
                            )}
                          </td>
                          <td>
                            <span className={`ac-dot-status${client.status === 'active' ? ' ac-dot-status--active' : client.status === 'pending_setup' ? ' ac-dot-status--pending' : ' ac-dot-status--inactive'}`}>
                              {client.status === 'active' ? 'Active' : client.status === 'pending_setup' ? 'Pending Setup 🟡' : 'Inactive'}
                            </span>
                          </td>
                          <td>
                            <div className="ac-field-map">
                              <div className="ac-field-map__item"><span className="ac-field-map__key">actor</span> {client.actor_field || '—'}</div>
                              <div className="ac-field-map__item"><span className="ac-field-map__key">action</span> {client.action_field || '—'}</div>
                              <div className="ac-field-map__item"><span className="ac-field-map__key">resource</span> {client.resource_field || '—'}</div>
                            </div>
                          </td>
                          <td className="ac-table__time">{formatTimestamp(client.created_at)}</td>
                          <td>
                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                              <button
                                className={`ac-btn-primary ${client.status === 'active' ? 'ac-btn-primary--warning' : 'ac-btn-primary--success'}`}
                                style={{ padding: '6px 10px', fontSize: '11px', minWidth: '96px', justifyContent: 'center' }}
                                onClick={() => handleToggleClientStatus(client)}
                              >
                                {client.status === 'active' ? '🚫 Block' : client.status === 'pending_setup' ? '✅ Verify & Activate' : '✅ Activate'}
                              </button>
                              <button
                                className="ac-btn-primary"
                                style={{ padding: '6px 10px', fontSize: '11px', backgroundColor: '#455a64' }}
                                onClick={() => {
                                  setSelectedQuickSetupClient(client);
                                  setShowQuickSetupModal(true);
                                }}
                                title="View 1-Command Setup Guide"
                              >
                                ⚡ Setup
                              </button>
                              <button
                                className="ac-btn-primary"
                                style={{ padding: '6px 10px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: 'var(--color-tertiary, #388e3c)' }}
                                onClick={() => handleOpenAgentModal(client)}
                              >
                                🤖 Agent
                              </button>
                              <button
                                className="ac-btn-primary"
                                style={{ padding: '6px 10px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
                                onClick={() => handleManageUsers(client)}
                              >
                                👥 Users
                              </button>
                              <button
                                className="ac-btn-primary ac-btn-primary--danger"
                                style={{ padding: '6px 10px', fontSize: '11px' }}
                                onClick={() => handleDeleteClient(client)}
                              >
                                🗑️
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* ===== TAB: KONFIGURASI KAFKA ===== */}
          {activeTab === 'kafka' && (
            <section className="ac-card" style={{ animation: 'fadeIn 0.3s ease' }}>
              <div className="ac-card__header">
                <div>
                  <div className="ac-card__title">Kafka Stream Configuration</div>
                  <div className="ac-admin-card-sub">Kafka consumer configurations per client for real-time audit log ingestion</div>
                </div>
                <button className="ac-btn-primary" onClick={() => setShowKafkaModal(true)}>
                  + Add Configuration
                </button>
              </div>
              <div className="ac-table-wrap">
                <table className="ac-table">
                  <thead>
                    <tr>
                      <th>Client</th>
                      <th>Kafka Brokers</th>
                      <th>Topic Prefix</th>
                      <th>Source System</th>
                      <th>PK Field</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'center' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {kafkaConfigs.length === 0 && (
                      <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--color-outline)', padding: '32px 0' }}>No Kafka configurations found. Click "+ Add Configuration" to get started.</td></tr>
                    )}
                    {kafkaConfigs.map(cfg => (
                      <tr key={cfg.id}>
                        <td>
                          <div style={{ fontWeight: 600 }}>{cfg.company_name}</div>
                          <div style={{ fontSize: 11, color: 'var(--color-outline)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>{cfg.client_id}</div>
                        </td>
                        <td><code className="ac-code-chip">{cfg.kafka_brokers}</code></td>
                        <td><code className="ac-code-chip">{cfg.topic_prefix}</code></td>
                        <td>{cfg.source_system}</td>
                        <td><code className="ac-code-chip">{cfg.pk_field}</code></td>
                        <td>
                          <label className="ac-toggle-wrap" title={cfg.is_active ? 'Click to deactivate' : 'Click to activate'}>
                            <input
                              type="checkbox"
                              checked={cfg.is_active}
                              onChange={() => handleToggleKafka(cfg.id)}
                              style={{ display: 'none' }}
                            />
                            <span className={`ac-toggle${cfg.is_active ? ' ac-toggle--on' : ''}`} />
                            <span className={`ac-toggle-label${cfg.is_active ? ' ac-toggle-label--on' : ''}`}>
                              {cfg.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </label>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            className="ac-btn-primary ac-btn-primary--danger"
                            style={{ padding: '4px 10px', fontSize: '11px' }}
                            onClick={() => handleDeleteKafkaConfig(cfg.id, cfg.company_name)}
                          >
                            🗑️ Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

        </div>
      </main>

      {/* ===== MODAL: DAFTARKAN KLIEN BARU ===== */}
      {showClientModal && (
        <div className="ac-modal-overlay" onClick={() => setShowClientModal(false)}>
          <div className="ac-modal ac-modal--sm" onClick={e => e.stopPropagation()}>
            <div className="ac-modal__header">
              <div>
                <div className="ac-modal__title">🏢 Register New Client</div>
                <div className="ac-modal__subtitle">Fill in the details for the new client company to establish connection</div>
              </div>
              <button className="ac-modal__close" onClick={() => setShowClientModal(false)}>×</button>
            </div>
            <div className="ac-modal__body">
              <form onSubmit={handleSubmitClient}>
                <div className="ac-form-grid">
                  <div className="ac-form-field" style={{ gridColumn: '1 / -1' }}>
                    <label className="ac-form-label">Company Name <span style={{ color: 'var(--color-error)' }}>*</span></label>
                    <input className="ac-form-input" required placeholder="PT Contoh Indonesia"
                      value={clientForm.company_name}
                      onChange={e => setClientForm(f => ({ ...f, company_name: e.target.value }))} />
                  </div>
                  <div className="ac-form-field">
                    <label className="ac-form-label">Status</label>
                    <select className="ac-form-input" value={clientForm.status}
                      onChange={e => setClientForm(f => ({ ...f, status: e.target.value }))}>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                  <div className="ac-form-field">
                    <label className="ac-form-label">Fallback Actor Field</label>
                    <input className="ac-form-input" placeholder="(optional — e.g., db_user)"
                      value={clientForm.fallback_actor_field}
                      onChange={e => setClientForm(f => ({ ...f, fallback_actor_field: e.target.value }))} />
                  </div>
                </div>
                <div style={{ height: 1, background: 'var(--color-outline-variant)', margin: '16px 0' }} />
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-on-surface-variant)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>Custom Field Mapping</div>
                <div className="ac-form-grid">
                  <div className="ac-form-field">
                    <label className="ac-form-label">Actor Field</label>
                    <input className="ac-form-input" placeholder="actor"
                      value={clientForm.actor_field}
                      onChange={e => setClientForm(f => ({ ...f, actor_field: e.target.value }))} />
                  </div>
                  <div className="ac-form-field">
                    <label className="ac-form-label">Action Field</label>
                    <input className="ac-form-input" placeholder="action"
                      value={clientForm.action_field}
                      onChange={e => setClientForm(f => ({ ...f, action_field: e.target.value }))} />
                  </div>
                  <div className="ac-form-field">
                    <label className="ac-form-label">Resource Field</label>
                    <input className="ac-form-input" placeholder="resource"
                      value={clientForm.resource_field}
                      onChange={e => setClientForm(f => ({ ...f, resource_field: e.target.value }))} />
                  </div>
                </div>
                <div className="ac-form-actions">
                  <button type="button" className="ac-btn-ghost-action" onClick={() => setShowClientModal(false)}>Cancel</button>
                  <button type="submit" className="ac-btn-primary">Register Client</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL: API KEY REVEAL & 1-COMMAND INSTALLER ===== */}
      {showApiKeyModal && (
        <div className="ac-modal-overlay">
          <div className="ac-modal" style={{ maxWidth: '680px', width: '92%' }} onClick={e => e.stopPropagation()}>
            <div className="ac-modal__header">
              <div>
                <div className="ac-modal__title">🎉 Client Successfully Registered!</div>
                <div className="ac-modal__subtitle">Save credentials & copy the 1-command installer script for client server setup</div>
              </div>
            </div>
            <div className="ac-modal__body" style={{ maxHeight: '80vh', overflowY: 'auto' }}>
              
              {/* API Key Box */}
              <div className="ac-api-key-box">
                <div className="ac-api-key-box__label">🔑 Client API Key</div>
                <div className="ac-api-key-box__key">{newApiKey}</div>
                <button
                  className={`ac-btn-primary${apiKeyCopied ? ' ac-btn-primary--success' : ''}`}
                  style={{ marginTop: 12, width: '100%' }}
                  onClick={handleCopyApiKey}
                >
                  {apiKeyCopied ? '✅ API Key Copied!' : '📋 Copy API Key'}
                </button>
              </div>

              <div className="ac-api-key-box__warning">
                ⚠️ <strong>Security Note:</strong> This API Key is displayed <strong>ONLY ONCE</strong>. After closing this dialog, the full key cannot be retrieved again.
              </div>

              {/* 1-Command Installer Script Box */}
              <div style={{ marginTop: '20px' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-on-surface)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  🚀 1-Command Automated Agent & CDC Installer
                </div>
                <div style={{ fontSize: '11px', color: 'var(--color-outline)', marginTop: '2px' }}>
                  Run this command on the Client's Linux VPS/Server terminal as Root/Sudo:
                </div>

                <div className="ac-terminal-box">
                  <div className="ac-terminal-box__header">
                    <div className="ac-terminal-box__title">
                      <span>💻 BASH ONE-LINER</span>
                    </div>
                    <span style={{ fontSize: '10px', color: '#8b949e' }}>Auto-Configured</span>
                  </div>
                  <div className="ac-terminal-box__code">
                    {buildInstallCommand(newApiKey, customTailscaleKey)}
                  </div>
                  <div className="ac-terminal-box__actions">
                    <button
                      type="button"
                      className={`ac-btn-primary ${setupCmdCopied ? 'ac-btn-primary--success' : ''}`}
                      style={{ padding: '6px 12px', fontSize: '11px' }}
                      onClick={() => handleCopySetupCmd(buildInstallCommand(newApiKey, customTailscaleKey))}
                    >
                      {setupCmdCopied ? '✅ Command Copied!' : '📋 Copy Setup Command'}
                    </button>
                    <a
                      href={getInstallerScriptUrl()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ac-btn-ghost-action"
                      style={{ padding: '6px 12px', fontSize: '11px', textDecoration: 'none', color: '#79c0ff', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    >
                      📥 Download install.sh
                    </a>
                  </div>
                </div>

                {/* Advanced Customization (Custom Tailscale Auth Key) */}
                <details className="ac-adv-customization">
                  <summary>⚙️ Advanced Customization (Custom Tailscale Auth Key)</summary>
                  <div style={{ marginTop: '10px' }}>
                    <label className="ac-form-label" style={{ fontSize: '11px' }}>Custom Tailscale Auth Key (Optional)</label>
                    <input
                      className="ac-form-input"
                      style={{ fontSize: '12px', padding: '6px 10px' }}
                      placeholder="tskey-auth-xxxx"
                      value={customTailscaleKey}
                      onChange={e => setCustomTailscaleKey(e.target.value)}
                    />
                    <div className="ac-security-warning">
                      ⚠️ <strong>Network Security Warning:</strong> Leaving this field empty uses the default VPN mesh authkey in <code>install.sh</code>. For production deployments, inject your organization's custom Tailscale Auth Key.
                    </div>
                  </div>
                </details>

              </div>

              <div style={{ marginTop: 20 }}>
                <button
                  className="ac-btn-primary"
                  style={{ width: '100%', justifyContent: 'center' }}
                  onClick={() => {
                    setShowApiKeyModal(false);
                    setNewApiKey('');
                    setCustomTailscaleKey('');
                  }}
                >
                  I Have Saved & Copied — Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL: QUICK SETUP GUIDE (FOR EXISTING CLIENTS) ===== */}
      {showQuickSetupModal && selectedQuickSetupClient && (
        <div className="ac-modal-overlay" onClick={() => setShowQuickSetupModal(false)}>
          <div className="ac-modal" style={{ maxWidth: '640px', width: '90%' }} onClick={e => e.stopPropagation()}>
            <div className="ac-modal__header">
              <div>
                <div className="ac-modal__title">⚡ Installer Command — {selectedQuickSetupClient.company_name}</div>
                <div className="ac-modal__subtitle">Client ID: {selectedQuickSetupClient.id} | Prefix: {selectedQuickSetupClient.api_key_prefix}</div>
              </div>
              <button className="ac-modal__close" onClick={() => setShowQuickSetupModal(false)}>×</button>
            </div>
            <div className="ac-modal__body" style={{ padding: '20px 24px' }}>
              
              <div style={{ fontSize: '12px', color: 'var(--color-on-surface-variant)', lineHeight: 1.6, marginBottom: '14px' }}>
                Run the 1-command installer script below on the client server terminal. Replace <code>&lt;YOUR_CLIENT_API_KEY&gt;</code> with the original API Key generated during client creation.
              </div>

              <div className="ac-terminal-box">
                <div className="ac-terminal-box__header">
                  <div className="ac-terminal-box__title">
                    <span>💻 BASH INSTALLER COMMAND</span>
                  </div>
                </div>
                <div className="ac-terminal-box__code">
                  {buildInstallCommand('<YOUR_CLIENT_API_KEY>', customTailscaleKey)}
                </div>
                <div className="ac-terminal-box__actions">
                  <button
                    type="button"
                    className={`ac-btn-primary ${setupCmdCopied ? 'ac-btn-primary--success' : ''}`}
                    style={{ padding: '6px 12px', fontSize: '11px' }}
                    onClick={() => handleCopySetupCmd(buildInstallCommand('<YOUR_CLIENT_API_KEY>', customTailscaleKey))}
                  >
                    {setupCmdCopied ? '✅ Command Copied!' : '📋 Copy Command Template'}
                  </button>
                  <a
                    href={getInstallerScriptUrl()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ac-btn-ghost-action"
                    style={{ padding: '6px 12px', fontSize: '11px', textDecoration: 'none', color: '#79c0ff', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  >
                    📥 Download install.sh
                  </a>
                </div>
              </div>

              <div className="ac-api-key-box__warning" style={{ marginTop: '14px' }}>
                ℹ️ <strong>Note:</strong> API Keys are single-use credentials displayed only once at registration. For security, full keys cannot be retrieved later.
              </div>

              <div style={{ marginTop: '20px', textAlign: 'right' }}>
                <button className="ac-btn-ghost-action" onClick={() => setShowQuickSetupModal(false)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL: TAMBAH KONFIGURASI KAFKA ===== */}
      {showKafkaModal && (
        <div className="ac-modal-overlay" onClick={() => setShowKafkaModal(false)}>
          <div className="ac-modal ac-modal--sm" onClick={e => e.stopPropagation()}>
            <div className="ac-modal__header">
              <div>
                <div className="ac-modal__title">⚙️ Add Kafka Configuration</div>
                <div className="ac-modal__subtitle">Establish a connection between the client and a Kafka stream for log ingestion</div>
              </div>
              <button className="ac-modal__close" onClick={() => setShowKafkaModal(false)}>×</button>
            </div>
            <div className="ac-modal__body">
              <form onSubmit={handleSubmitKafka}>
                <div className="ac-form-grid">
                  <div className="ac-form-field" style={{ gridColumn: '1 / -1' }}>
                    <label className="ac-form-label">Client <span style={{ color: 'var(--color-error)' }}>*</span></label>
                    <select className="ac-form-input" required value={kafkaForm.client_id}
                      onChange={e => setKafkaForm(f => ({ ...f, client_id: e.target.value }))}>
                      <option value="">-- Select Client --</option>
                      {clients.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
                    </select>
                  </div>
                  <div className="ac-form-field">
                    <label className="ac-form-label">Kafka Brokers <span style={{ color: 'var(--color-error)' }}>*</span></label>
                    <input className="ac-form-input" required placeholder="192.168.1.1:9092"
                      value={kafkaForm.kafka_brokers}
                      onChange={e => setKafkaForm(f => ({ ...f, kafka_brokers: e.target.value }))} />
                  </div>
                  <div className="ac-form-field">
                    <label className="ac-form-label">Topic Prefix <span style={{ color: 'var(--color-error)' }}>*</span></label>
                    <input className="ac-form-input" required placeholder="cdc_simrs"
                      value={kafkaForm.topic_prefix}
                      onChange={e => setKafkaForm(f => ({ ...f, topic_prefix: e.target.value }))} />
                  </div>
                  <div className="ac-form-field">
                    <label className="ac-form-label">Source System <span style={{ color: 'var(--color-error)' }}>*</span></label>
                    <input className="ac-form-input" required placeholder="SIMRS-Prod"
                      value={kafkaForm.source_system}
                      onChange={e => setKafkaForm(f => ({ ...f, source_system: e.target.value }))} />
                  </div>
                  <div className="ac-form-field">
                    <label className="ac-form-label">PK Field</label>
                    <input className="ac-form-input" placeholder="ID"
                      value={kafkaForm.pk_field}
                      onChange={e => setKafkaForm(f => ({ ...f, pk_field: e.target.value }))} />
                  </div>
                  <div className="ac-form-field">
                    <label className="ac-form-label">Actor Field</label>
                    <input className="ac-form-input" placeholder="__user_name"
                      value={kafkaForm.actor_field}
                      onChange={e => setKafkaForm(f => ({ ...f, actor_field: e.target.value }))} />
                  </div>
                </div>
                <div className="ac-form-actions">
                  <button type="button" className="ac-btn-ghost-action" onClick={() => setShowKafkaModal(false)}>Cancel</button>
                  <button type="submit" className="ac-btn-primary">Add Configuration</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL: KELOLA USER KLIEN ===== */}
      {manageUsersClient && (
        <div className="ac-modal-overlay" onClick={() => setManageUsersClient(null)}>
          <div className="ac-modal" style={{ maxWidth: '800px', width: '90%' }} onClick={e => e.stopPropagation()}>
            <div className="ac-modal__header">
              <div>
                <div className="ac-modal__title">👥 Manage Users: {manageUsersClient.company_name}</div>
                <div className="ac-modal__subtitle">Add or remove auditor accounts for this client to access the gateway dashboard</div>
              </div>
              <button className="ac-modal__close" onClick={() => setManageUsersClient(null)}>×</button>
            </div>
            
            <div className="ac-modal__body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', padding: '20px 24px' }}>
              {/* Form Add User */}
              <div style={{ borderRight: '1px solid var(--color-outline-variant)', paddingRight: '24px' }}>
                <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-primary)', marginBottom: '16px' }}>Create New User Account</div>
                
                {userActionError && (
                  <div style={{ 
                    padding: '10px 14px', 
                    borderRadius: 'var(--radius-sm)', 
                    backgroundColor: 'rgba(186, 26, 26, 0.1)', 
                    color: 'var(--color-error)', 
                    fontSize: '12px', 
                    fontWeight: 600,
                    marginBottom: '16px'
                  }}>
                    ⚠️ {userActionError}
                  </div>
                )}
                
                <form onSubmit={handleAddClientUser}>
                  <div className="ac-form-field" style={{ marginBottom: '12px' }}>
                    <label className="ac-form-label">Username <span style={{ color: 'var(--color-error)' }}>*</span></label>
                    <input 
                      className="ac-form-input" 
                      required 
                      minLength={4}
                      placeholder="e.g. auditor_senior"
                      value={newUserUsername}
                      onChange={e => setNewUserUsername(e.target.value)}
                      disabled={userActionLoading}
                    />
                  </div>
                  <div className="ac-form-field" style={{ marginBottom: '12px' }}>
                    <label className="ac-form-label">Password <span style={{ color: 'var(--color-error)' }}>*</span></label>
                    <input 
                      className="ac-form-input" 
                      type="password"
                      required 
                      minLength={6}
                      placeholder="••••••"
                      value={newUserPassword}
                      onChange={e => setNewUserPassword(e.target.value)}
                      disabled={userActionLoading}
                    />
                  </div>
                  <div className="ac-form-field" style={{ marginBottom: '20px' }}>
                    <label className="ac-form-label">Confirm Password <span style={{ color: 'var(--color-error)' }}>*</span></label>
                    <input 
                      className="ac-form-input" 
                      type="password"
                      required 
                      minLength={6}
                      placeholder="••••••"
                      value={newUserConfirmPassword}
                      onChange={e => setNewUserConfirmPassword(e.target.value)}
                      disabled={userActionLoading}
                    />
                  </div>
                  <button 
                    type="submit" 
                    className="ac-btn-primary" 
                    style={{ width: '100%', justifyContent: 'center' }}
                    disabled={userActionLoading}
                  >
                    {userActionLoading ? 'Saving...' : 'Add Account'}
                  </button>
                </form>
              </div>

              {/* List Users */}
              <div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-on-surface)', marginBottom: '16px' }}>Registered Accounts</div>
                {userActionLoading && clientUsers.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--color-outline)' }}>Loading user accounts...</div>
                ) : (
                  <div className="ac-table-wrap" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                    <table className="ac-table">
                      <thead>
                        <tr>
                          <th>Username</th>
                          <th>Role</th>
                          <th style={{ textAlign: 'center' }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {clientUsers.length === 0 && (
                          <tr>
                            <td colSpan={3} style={{ textAlign: 'center', color: 'var(--color-outline)', padding: '24px 0', fontSize: '12px' }}>
                              No user accounts registered.
                            </td>
                          </tr>
                        )}
                        {clientUsers.map(user => (
                          <tr key={user.id}>
                            <td>
                              <div style={{ fontWeight: 600, fontSize: '13px' }}>{user.username}</div>
                              <div style={{ fontSize: '10px', color: 'var(--color-outline)' }}>ID: {user.id.substring(0, 8)}...</div>
                            </td>
                            <td>
                              <span className="ac-status ac-status--pending" style={{ fontSize: '10px', padding: '2px 6px' }}>{user.role}</span>
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <button 
                                className="ac-btn-primary ac-btn-primary--danger"
                                style={{ padding: '4px 8px', fontSize: '11px' }}
                                onClick={() => handleDeleteClientUser(user)}
                                disabled={userActionLoading}
                              >
                                ❌ Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL: KONFIGURASI AGENT LAPIS 3 ===== */}
      {showAgentModal && selectedAgentClient && (
        <div className="ac-modal-overlay" onClick={() => setShowAgentModal(false)}>
          <div className="ac-modal" style={{ maxWidth: '650px', width: '90%' }} onClick={e => e.stopPropagation()}>
            <div className="ac-modal__header">
              <div>
                <div className="ac-modal__title">🤖 Agent Lapis 3: {selectedAgentClient.company_name}</div>
                <div className="ac-modal__subtitle">Konfigurasi Agent lokal milik perusahaan untuk verifikasi & integrasi Gateway</div>
              </div>
              <button className="ac-modal__close" onClick={() => setShowAgentModal(false)}>×</button>
            </div>

            <div className="ac-modal__body" style={{ padding: '20px 24px' }}>

              {/* Status Bar */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                borderRadius: 'var(--radius-sm, 8px)',
                backgroundColor: agentConfig ? 'rgba(76, 175, 80, 0.1)' : 'rgba(255, 152, 0, 0.1)',
                border: agentConfig ? '1px solid rgba(76, 175, 80, 0.3)' : '1px solid rgba(255, 152, 0, 0.3)',
                marginBottom: '16px'
              }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-on-surface)' }}>
                    {agentConfig ? '✅ Agent Terdaftar & Aktif' : '⚠️ Belum Ada Agent Terdaftar'}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--color-outline)', marginTop: 2 }}>
                    {agentConfig ? `URL: ${agentConfig.agent_url} | Timeout: ${agentConfig.timeout_seconds}s` : 'Daftarkan URL Agent lokal di bawah ini.'}
                  </div>
                </div>

                {agentConfig && (
                  <button
                    type="button"
                    className="ac-btn-primary"
                    style={{ padding: '6px 14px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                    onClick={handlePingAgent}
                    disabled={agentPingLoading}
                  >
                    {agentPingLoading ? '📡 Testing Connection...' : '📡 Test Connection'}
                  </button>
                )}
              </div>

              {/* Ping Result Banner */}
              {agentPingResult && (
                <div style={{
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-sm, 8px)',
                  marginBottom: '16px',
                  backgroundColor: agentPingResult.reachable ? 'rgba(46, 125, 50, 0.15)' : 'rgba(211, 47, 47, 0.15)',
                  border: agentPingResult.reachable ? '1px solid #2e7d32' : '1px solid #d32f2f',
                  color: agentPingResult.reachable ? '#1b5e20' : '#c62828',
                  fontSize: '12px'
                }}>
                  <div style={{ fontWeight: 700, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {agentPingResult.reachable ? '🟢 Agent Connected Successfully!' : '🔴 Connection Failed / Unreachable'}
                  </div>
                  <div><strong>Target URL:</strong> {agentPingResult.agent_url}</div>
                  {agentPingResult.http_status && <div><strong>HTTP Status:</strong> {agentPingResult.http_status}</div>}
                  {agentPingResult.latency !== null && agentPingResult.latency !== undefined && (
                    <div><strong>Latency (RTT):</strong> {agentPingResult.latency} ms</div>
                  )}
                  {agentPingResult.error && <div><strong>Error Details:</strong> {agentPingResult.error}</div>}
                </div>
              )}

              {/* Action Alerts */}
              {agentActionError && (
                <div style={{ padding: '10px 14px', borderRadius: '6px', backgroundColor: 'rgba(186,26,26,0.1)', color: 'var(--color-error)', fontSize: '12px', fontWeight: 600, marginBottom: '16px' }}>
                  ⚠️ {agentActionError}
                </div>
              )}
              {agentActionSuccess && (
                <div style={{ padding: '10px 14px', borderRadius: '6px', backgroundColor: 'rgba(76,175,80,0.1)', color: '#2e7d32', fontSize: '12px', fontWeight: 600, marginBottom: '16px' }}>
                  ✅ {agentActionSuccess}
                </div>
              )}

              {/* Agent Form */}
              {agentLoading ? (
                <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--color-outline)' }}>Loading Agent configuration...</div>
              ) : (
                <form onSubmit={handleSaveAgentConfig}>
                  <div className="ac-form-grid">
                    <div className="ac-form-field" style={{ gridColumn: '1 / -1' }}>
                      <label className="ac-form-label">Agent Server URL <span style={{ color: 'var(--color-error)' }}>*</span></label>
                      <input
                        className="ac-form-input"
                        required
                        placeholder="http://192.168.11.50:9090"
                        value={agentForm.agent_url}
                        onChange={e => setAgentForm(f => ({ ...f, agent_url: e.target.value }))}
                        disabled={agentActionLoading}
                      />
                      <div style={{ fontSize: '11px', color: 'var(--color-outline)', marginTop: 4 }}>
                        Endpoint HTTP/HTTPS ke Agent Lapis 3 lokal perusahaan klien.
                      </div>
                    </div>

                    <div className="ac-form-field">
                      <label className="ac-form-label">Secret Verify Token <span style={{ color: 'var(--color-error)' }}>*</span></label>
                      <input
                        className="ac-form-input"
                        type="password"
                        required
                        placeholder="Secret verification token"
                        value={agentForm.verify_token}
                        onChange={e => setAgentForm(f => ({ ...f, verify_token: e.target.value }))}
                        disabled={agentActionLoading}
                      />
                    </div>

                    <div className="ac-form-field">
                      <label className="ac-form-label">Timeout (Seconds)</label>
                      <input
                        className="ac-form-input"
                        type="number"
                        min={1}
                        max={30}
                        placeholder="5"
                        value={agentForm.timeout_seconds}
                        onChange={e => setAgentForm(f => ({ ...f, timeout_seconds: e.target.value }))}
                        disabled={agentActionLoading}
                      />
                    </div>
                  </div>

                  <div className="ac-form-actions" style={{ marginTop: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      {agentConfig && (
                        <button
                          type="button"
                          className="ac-btn-primary ac-btn-primary--danger"
                          style={{ padding: '8px 14px', fontSize: '12px' }}
                          onClick={handleDeleteAgentConfig}
                          disabled={agentActionLoading}
                        >
                          🗑️ Revoke Agent
                        </button>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button type="button" className="ac-btn-ghost-action" onClick={() => setShowAgentModal(false)}>Cancel</button>
                      <button type="submit" className="ac-btn-primary" disabled={agentActionLoading}>
                        {agentActionLoading ? 'Saving...' : (agentConfig ? 'Update Agent Config' : 'Register Agent')}
                      </button>
                    </div>
                  </div>
                </form>
              )}

            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export { AdminPage };
export default AdminPage;
