import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import Icon from '../components/common/Icon';
import ActionBadge from '../components/common/ActionBadge';
import StatCards from '../components/dashboard/StatCards';
import AuditLogTable from '../components/dashboard/AuditLogTable';
import VerificationModal from '../components/dashboard/VerificationModal';
import ResourceDetailModal from '../components/dashboard/ResourceDetailModal';
import { parseJwt, formatTimestamp, mapRangeItemToVerifyStatus } from '../utils/formatters';

function DashboardPage({ onLogout }) {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ total_logs: 0, pending_logs: 0, anchored_logs: 0 });
  const [recentLogs, setRecentLogs] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [verifyStatuses, setVerifyStatuses] = useState({});
  const [inventoryStatuses] = useState({});
  const [selectedVerifyResult, setSelectedVerifyResult] = useState(null);
  const [totalLogsCount, setTotalLogsCount] = useState(0);
  const [isServerPaginated, setIsServerPaginated] = useState(false);

  const verifyStatusesRef = useRef(verifyStatuses);
  const inventoryStatusesRef = useRef(inventoryStatuses);

  useEffect(() => {
    verifyStatusesRef.current = verifyStatuses;
  }, [verifyStatuses]);

  useEffect(() => {
    inventoryStatusesRef.current = inventoryStatuses;
  }, [inventoryStatuses]);

  const [selectedResource, setSelectedResource] = useState(null);
  const [selectedTableModal, setSelectedTableModal] = useState(null);

  // State untuk Modal Level 1 — records per tabel, di-fetch secara on-demand
  const [tableModalRecords, setTableModalRecords] = useState([]);
  const [isTableRecordsLoading, setIsTableRecordsLoading] = useState(false);
  const [tableRecordsError, setTableRecordsError] = useState('');
  const [modalSearchQuery, setModalSearchQuery] = useState('');
  const [modalCurrentPage, setModalCurrentPage] = useState(1);
  const modalRowsPerPage = 10;

  const [searchQuery, setSearchQuery] = useState('');
  const [filterAction, setFilterAction] = useState('ALL');
  const [filterVerification, setFilterVerification] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeView, setActiveView] = useState('dashboard');
  const [tempDateFrom, setTempDateFrom] = useState('');
  const [tempDateTo, setTempDateTo] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  // Decode JWT info for Workspace Context Indicator
  const clientInfo = useMemo(() => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    return parseJwt(token);
  }, []);

  const [selectedClient, setSelectedClient] = useState(clientInfo?.client_id || '');
  const [adminClients, setAdminClients] = useState([]);

  // Fetch client list for admin dropdown
  useEffect(() => {
    if (clientInfo?.role?.toLowerCase() === 'admin') {
      api.get('/admin/clients')
        .then(res => {
          setAdminClients(res.data || []);
        })
        .catch(err => {
          console.error("Failed to load admin clients list:", err);
        });
    }
  }, [clientInfo]);

  // Update selectedClient if clientInfo changes
  useEffect(() => {
    if (clientInfo?.client_id) {
      setSelectedClient(clientInfo.client_id);
    }
  }, [clientInfo]);

  const [isLogsLoading, setIsLogsLoading] = useState(false);

  // Fetch summary stats & inventory (Otomatis & Cepat menggunakan tabel client_tables baru, auto-refresh 5s)
  useEffect(() => {
    const fetchSummaryAndInventory = async () => {
      try {
        const params = {};
        if (selectedClient) {
          params.client_id = selectedClient;
        }

        const [statsRes, invRes] = await Promise.all([
          api.get('/dashboard/stats', { params }),
          api.get('/dashboard/inventory', { params }),
        ]);

        setStats(statsRes.data);
        setInventory(invRes.data || []);
      } catch (err) {
        if (err.response?.status === 401) onLogout();
      }
    };

    fetchSummaryAndInventory();
    const id = setInterval(fetchSummaryAndInventory, 5000);
    return () => clearInterval(id);
  }, [onLogout, selectedClient]);

  // Fetch logs transaksi SECARA ON-DEMAND saat rentang tanggal ditentukan
  const handleApplyLogsRange = useCallback(async (fromDate, toDate) => {
    const fromVal = fromDate || tempDateFrom;
    const toVal = toDate || tempDateTo;
    if (!fromVal || !toVal) return;

    setIsLogsLoading(true);
    setFilterDateFrom(fromVal);
    setFilterDateTo(toVal);
    setCurrentPage(1);

    try {
      const params = {
        page: 1,
        page_size: 1000,
      };
      if (selectedClient) {
        params.client_id = selectedClient;
      }

      const logsRes = await api.get('/dashboard/logs', { params });
      let logsArray = [];
      let serverTotal = 0;
      let serverPaginated = false;

      if (Array.isArray(logsRes.data)) {
        logsArray = logsRes.data;
        serverTotal = logsRes.data.length;
        serverPaginated = false;
      } else if (logsRes.data?.data) {
        logsArray = logsRes.data.data;
        serverTotal = logsRes.data.pagination?.total_items ?? logsRes.data.data.length;
        serverPaginated = true;
      }

      setRecentLogs(logsArray);
      setTotalLogsCount(serverTotal);
      setIsServerPaginated(serverPaginated);
    } catch (err) {
      console.error("Failed to load transaction logs:", err);
      if (err.response?.status === 401) onLogout();
    } finally {
      setIsLogsLoading(false);
    }
  }, [tempDateFrom, tempDateTo, selectedClient, onLogout]);

  // Auto-trigger logs fetch ketika kedua tanggal (From & To) dipilih
  useEffect(() => {
    if (tempDateFrom && tempDateTo) {
      handleApplyLogsRange(tempDateFrom, tempDateTo);
    }
  }, [tempDateFrom, tempDateTo, handleApplyLogsRange]);

  const [rangeVerifyResult, setRangeVerifyResult] = useState(null);
  const [isVerifyRangeLoading, setIsVerifyRangeLoading] = useState(false);

  // Clear Range handler
  const handleClearRange = useCallback(() => {
    setTempDateFrom('');
    setTempDateTo('');
    setFilterDateFrom('');
    setFilterDateTo('');
    setRecentLogs([]);
    setTotalLogsCount(0);
    setRangeVerifyResult(null);
    setFilterVerification('ALL');
    setCurrentPage(1);
  }, []);

  // Verifikasi satu log SECARA ON-DEMAND
  const handleVerifyLog = useCallback((logId) => {
    setVerifyStatuses(prev => ({
      ...prev,
      [logId]: { status: 'loading' }
    }));

    const params = selectedClient ? { client_id: selectedClient } : {};

    api.get(`/dashboard/verify/${logId}`, { params })
      .then(res => {
        setVerifyStatuses(prev => ({ ...prev, [logId]: res.data }));
        setSelectedVerifyResult(res.data);
      })
      .catch(err => {
        const data = err.response?.data || { status: 'failed', message: 'Failed to contact verification server.' };
        setVerifyStatuses(prev => ({ ...prev, [logId]: data }));
        setSelectedVerifyResult(data);
      });
  }, [selectedClient]);

  // Verify range using backend API — Integrated into Main Table (Opsi A)
  const handleVerifyRange = useCallback(async () => {
    if (!filterDateFrom || !filterDateTo) return;
    setIsVerifyRangeLoading(true);
    try {
      const fromISO = new Date(filterDateFrom).toISOString();
      const toISO = new Date(filterDateTo).toISOString();

      const params = {
        from: fromISO,
        to: toISO
      };
      if (selectedClient) {
        params.client_id = selectedClient;
      }

      const res = await api.get('/dashboard/verify-range', { params });
      const results = res.data.results || [];

      setVerifyStatuses(prev => {
        const next = { ...prev };
        results.forEach(item => {
          next[item.log_id] = mapRangeItemToVerifyStatus(item);
        });
        return next;
      });

      setRangeVerifyResult({
        range: { from: filterDateFrom, to: filterDateTo },
        summary: res.data.summary || {
          total: results.length,
          valid: results.filter(r => r.verify_status === 'success' || r.verify_status === 'valid').length,
          invalid: results.filter(r => r.verify_status === 'tampered' || r.verify_status === 'failed_local' || r.verify_status === 'failed_onchain').length,
          pending: results.filter(r => r.verify_status === 'pending').length
        },
        results
      });
    } catch (err) {
      console.error("Failed to verify range:", err);
      setRangeVerifyResult({
        range: { from: filterDateFrom, to: filterDateTo },
        summary: { total: 0, valid: 0, invalid: 0, pending: 0 },
        results: [],
        status: 'failed_local',
        message: err.response?.data?.error || 'Connection error while verifying log range.'
      });
    } finally {
      setIsVerifyRangeLoading(false);
    }
  }, [filterDateFrom, filterDateTo, selectedClient]);

  // Grouping inventory by table name — mendukung dua format:
  // 1. Format baru ClientTable: { table_name, row_count, last_action, last_updated_at, ... }
  // 2. Format lama AuditLog:    { source_table, resource, action, timestamp, ... }
  const groupedInventory = useMemo(() => {
    return inventory.reduce((acc, item) => {
      let tableName;
      if (item?.table_name) {
        // Format baru dari tabel client_tables (setelah optimasi Plan-V8)
        tableName = item.table_name;
      } else {
        // Format lama dari audit_logs
        const resource = item?.source_table || item?.resource || '';
        tableName = resource.includes(':') ? resource.split(':')[0] : resource;
      }
      if (!tableName) return acc; // skip item tanpa nama tabel
      if (!acc[tableName]) acc[tableName] = [];
      acc[tableName].push(item);
      return acc;
    }, {});
  }, [inventory]);

  const tableNames = Object.keys(groupedInventory).sort();

  // Fetch records per tabel secara on-demand saat Modal Level 1 dibuka
  // Endpoint: GET /dashboard/verify-resource/:tableName
  // Backend mendeteksi nama tabel (tanpa ':') dan mengembalikan semua resource unik di dalamnya.
  // Response: { resource, chain_status, total_logs, logs: [ResourceLogVerification] }
  useEffect(() => {
    if (!selectedTableModal) {
      setTableModalRecords([]);
      setTableRecordsError('');
      setModalSearchQuery('');
      setModalCurrentPage(1);
      return;
    }

    setIsTableRecordsLoading(true);
    setTableRecordsError('');
    setTableModalRecords([]);
    setModalSearchQuery('');
    setModalCurrentPage(1);

    const params = {};
    if (selectedClient) params.client_id = selectedClient;

    api.get(`/dashboard/verify-resource/${encodeURIComponent(selectedTableModal)}`, { params })
      .then(res => {
        // Backend mengembalikan { resource, chain_status, total_logs, logs: [...] }
        setTableModalRecords(res.data?.logs || []);
      })
      .catch(err => {
        const msg = err.response?.data?.error || 'Gagal memuat daftar records tabel.';
        setTableRecordsError(msg);
      })
      .finally(() => setIsTableRecordsLoading(false));
  }, [selectedTableModal, selectedClient]);

  // Filter & pagination
  const filteredLogs = useMemo(() => {
    return recentLogs.filter(log => {
      const matchSearch =
        (log?.source_table?.toLowerCase() || log?.resource?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (log?.actor?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (log?.source_system?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (log?.metadata?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (log?.hash_value?.toLowerCase() || '').includes(searchQuery.toLowerCase());

      const matchAction = filterAction === 'ALL' || log?.action === filterAction;

      let matchDate = true;
      if (log?.timestamp) {
        const logTime = new Date(log.timestamp).getTime();
        if (filterDateFrom) {
          const fromTime = new Date(filterDateFrom).getTime();
          if (logTime < fromTime) matchDate = false;
        }
        if (filterDateTo) {
          const toTime = new Date(filterDateTo).getTime();
          if (logTime > toTime) matchDate = false;
        }
      } else if (filterDateFrom || filterDateTo) {
        matchDate = false;
      }

      // Verification status filter (Dropdown: ALL | VALID | INVALID)
      let matchVerification = true;
      if (filterVerification !== 'ALL') {
        const v = verifyStatuses[log.log_id];
        const isValid = v && (v.status === 'success' || v.status === 'valid');
        if (filterVerification === 'VALID') {
          matchVerification = isValid;
        } else if (filterVerification === 'INVALID') {
          matchVerification = !isValid;
        }
      }

      return matchSearch && matchAction && matchDate && matchVerification;
    });
  }, [recentLogs, searchQuery, filterAction, filterDateFrom, filterDateTo, filterVerification, verifyStatuses]);
  const isLocalPaginated = !isServerPaginated || filterDateFrom || filterDateTo;

  const totalPages = isLocalPaginated
    ? (Math.ceil(filteredLogs.length / rowsPerPage) || 1)
    : (Math.ceil(totalLogsCount / rowsPerPage) || 1);

  const paginatedLogs = isLocalPaginated
    ? filteredLogs.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage)
    : filteredLogs;

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [isLocalPaginated, totalLogsCount, filteredLogs.length, currentPage, totalPages]);

  const isFiltered = searchQuery || filterAction !== 'ALL' || filterDateFrom || filterDateTo;
  const displayTotal = isLocalPaginated
    ? filteredLogs.length
    : (isFiltered ? filteredLogs.length : totalLogsCount);

  // Status badge for transaction table
  const renderStatusBadge = (log) => {
    if (!log || !log.log_id || !log.hash_value) return <span className="ac-status ac-status--invalid">🚨 INVALID</span>;
    const v = verifyStatuses[log.log_id];

    if (!v) {
      return (
        <button
          className="ac-btn-ghost"
          style={{ padding: '4px 10px', fontSize: '11px' }}
          onClick={(e) => { e.stopPropagation(); handleVerifyLog(log.log_id); }}
        >
          🔍 Verify
        </button>
      );
    }

    if (v.status === 'loading')
      return <span className="ac-status ac-status--checking">⏳ Memeriksa...</span>;
    if (v.status === 'success')
      return <span className="ac-status ac-status--valid" onClick={() => setSelectedVerifyResult(v)}>✅ VALID</span>;
    if (v.status === 'pending')
      return <span className="ac-status ac-status--pending" onClick={() => setSelectedVerifyResult(v)}>⏱️ PENDING</span>;
    return <span className="ac-status ac-status--invalid" onClick={() => setSelectedVerifyResult(v)}>🚨 INVALID</span>;
  };


  // Pagination page numbers
  const renderPageNumbers = () => {
    const pages = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');
      for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
        pages.push(i);
      }
      if (currentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className="ac-shell">
      {/* ======= TOP NAV ======= */}
      <header className="ac-topnav">
        <div className="ac-topnav__brand">
          <button className="ac-topnav__menu-btn" onClick={() => setSidebarOpen(o => !o)}>
            <Icon name="menu" size={22} />
          </button>
          <img src="/logo/Group 1000009984.png" alt="Auditchain Logo" style={{ height: 36, width: 'auto', display: 'block', flexShrink: 0 }} />
          <div>
            <div className="ac-topnav__brand-name">Auditchain Gateway</div>
            <div className="ac-topnav__brand-sub">Gateway Portal</div>
          </div>
        </div>
        <div className="ac-topnav__right">
          {clientInfo && (
            <div className="ac-topnav__client-pill">
              <span className="ac-topnav__client-dot" />
              <span className="ac-topnav__client-label">{clientInfo.client_id}</span>
            </div>
          )}
          <div className="ac-topnav__user">
            <div className="ac-topnav__user-info">
              <div className="ac-topnav__user-name">{clientInfo?.username || 'Auditor'}</div>
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
          <div className="ac-sidebar__section-label">Audit Manager</div>
          <div className="ac-sidebar__section-sub">Secure Data Integrity</div>
        </div>
        <nav className="ac-sidebar__nav">
          <button
            className={`ac-sidebar__nav-item${activeView === 'dashboard' ? ' ac-sidebar__nav-item--active' : ''}`}
            onClick={() => { setActiveView('dashboard'); setSidebarOpen(false); }}
          >
            <Icon name="dashboard" size={18} />
            Dashboard
          </button>
          {clientInfo && clientInfo.role?.toLowerCase() === 'admin' && (
            <button
              className="ac-sidebar__nav-item"
              onClick={() => navigate('/admin')}
              style={{ marginTop: 4 }}
            >
              <Icon name="shield" size={18} />
              Admin Panel
            </button>
          )}
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
                  <span className="ac-sidebar__identity-name" title={clientInfo.username}>
                    {clientInfo.username}
                  </span>
                  <span className="ac-sidebar__identity-role">
                    {clientInfo.role}
                  </span>
                </div>
              </div>
              <div className="ac-sidebar__identity-client">
                <span className="ac-sidebar__identity-client-title">Client Workspace</span>
                <span className="ac-sidebar__identity-client-val" title={clientInfo.client_id}>
                  {clientInfo.client_id}
                </span>
              </div>
            </div>
          )}
          <button className="ac-sidebar__nav-item" style={{ marginTop: 6 }} onClick={onLogout}>
            <Icon name="logout" size={18} />
            Logout
          </button>
        </div>
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 35, background: 'rgba(0,0,0,0.3)' }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ======= MAIN CONTENT ======= */}
      <main className="ac-main">
        <div className="ac-main__container">

          {/* ===== CLIENT IDENTITY BANNER ===== */}
          {clientInfo && (
            <div className="ac-cib">
              <div className="ac-cib__bg-grid" />
              <div className="ac-cib__top-row">
                <div className="ac-cib__client-block">
                  <div className="ac-cib__client-icon">🏢</div>
                  <div className="ac-cib__client-meta">
                    <div className="ac-cib__client-eyebrow">Auditchain Gateway System</div>
                    {clientInfo.role?.toLowerCase() === 'admin' ? (
                      <select
                        value={selectedClient}
                        onChange={e => setSelectedClient(e.target.value)}
                        style={{
                          background: 'rgba(255,255,255,0.12)',
                          border: '1.5px solid rgba(255,255,255,0.2)',
                          color: '#fff',
                          padding: '6px 12px',
                          borderRadius: 'var(--radius-md)',
                          fontSize: '14px',
                          fontWeight: '700',
                          outline: 'none',
                          cursor: 'pointer',
                          marginTop: '4px',
                          minWidth: '240px'
                        }}
                      >
                        <option style={{ color: '#000' }} value={clientInfo.client_id}>
                          {clientInfo.client_id} (Admin Default)
                        </option>
                        {adminClients.length === 0 ? (
                          <>
                            <option style={{ color: '#000' }} value="ed067ad4-e549-4baa-9c9d-3d27ff24194d">
                              SIMRS Dummy 2 (ed067ad4-e549-4baa-9c9d-3d27ff24194d)
                            </option>
                            <option style={{ color: '#000' }} value="7f2bc265-d419-48fe-9892-d6ef198751e1">
                              Satu Peta Debezium (7f2bc265-d419-48fe-9892-d6ef198751e1)
                            </option>
                          </>
                        ) : (
                          adminClients.map(client => {
                            if (client.id === clientInfo.client_id) return null;
                            return (
                              <option style={{ color: '#000' }} key={client.id} value={client.id}>
                                {client.company_name || 'Klien'} ({client.id})
                              </option>
                            );
                          })
                        )}
                      </select>
                    ) : (
                      <div className="ac-cib__client-name" title={clientInfo.client_id}>
                        {clientInfo.client_id}
                      </div>
                    )}
                    <div className="ac-cib__client-badge">
                      <span className="ac-cib__live-dot" />
                      Active Session
                    </div>
                  </div>
                </div>

                <div className="ac-cib__divider" />

                <div className="ac-cib__admin-block">
                  <div className="ac-cib__admin-avatar">
                    {clientInfo.username.charAt(0).toUpperCase()}
                  </div>
                  <div className="ac-cib__admin-meta">
                    <div className="ac-cib__admin-eyebrow">Logged in as</div>
                    <div className="ac-cib__admin-name">{clientInfo.username}</div>
                    <div className="ac-cib__admin-role">
                      <span className="ac-cib__role-chip">{clientInfo.role}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="ac-cib__notice-bar">
                <span className="ac-cib__notice-icon">🔒</span>
                <span className="ac-cib__notice-text">
                  <strong>Data Isolation Active</strong> — Audit logs are exclusively scoped to the{' '}
                  <span className="ac-cib__notice-highlight">{selectedClient}</span>{' '}
                  workspace. Cross-client access is blocked at the gateway level.
                </span>
              </div>
            </div>
          )}

          <>
            {/* Hero Section */}
            <section className="ac-hero">
              <div className="ac-hero__pattern" />
              <div className="ac-hero__content">
                <div className="ac-hero__left">
                  <h1 className="ac-hero__title">
                    🛡️ Auditchain Gateway Dashboard
                  </h1>
                  <p className="ac-hero__subtitle">
                    Monitor audit logs and verify blockchain transactions in real-time.
                    Ensure the highest data integrity across the database infrastructure network.
                  </p>
                </div>
              </div>
            </section>

            {/* Stats Grid */}
            <StatCards stats={stats} />

            {/* Verification Detail (Single log modal inspection) */}
            {selectedVerifyResult && !selectedVerifyResult.range && (
              <VerificationModal
                result={selectedVerifyResult}
                onClose={() => setSelectedVerifyResult(null)}
              />
            )}

            {/* DATA INVENTORY */}
            <section className="ac-card">
              <div className="ac-card__header">
                <div className="ac-card__header-left">
                  <span className="ac-card__icon">🗄️</span>
                  <span className="ac-card__title">Data Inventory</span>
                </div>
                <span className="ac-card__subtitle">{tableNames.length} tables monitored — click to view records</span>
              </div>
              <div className="ac-table-wrap">
                <table className="ac-table">
                  <thead>
                    <tr>
                      <th>Table Name</th>
                      <th>Total Monitored Records</th>
                      <th style={{ textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tableNames.length === 0 ? (
                      <tr>
                        <td colSpan={3}>
                          <div className="ac-empty">
                            <div className="ac-empty__icon">📦</div>
                            No inventory data available.
                          </div>
                        </td>
                      </tr>
                    ) : tableNames.map(tableName => {
                      const tableItems = groupedInventory[tableName] || [];
                      const firstItem = tableItems[0] || {};
                      const recordCount = firstItem.row_count !== undefined
                        ? firstItem.row_count
                        : tableItems.length;

                      return (
                        <tr key={tableName} onClick={() => setSelectedTableModal(tableName)}>
                          <td>
                            <div className="ac-table__icon-cell">
                              <div className="ac-table__row-icon">
                                <Icon name="database" size={14} />
                              </div>
                              <strong>{tableName}</strong>
                            </div>
                          </td>
                          <td>{Number(recordCount).toLocaleString()} Records</td>
                          <td style={{ textAlign: 'right' }}>
                            <button className="ac-btn-ghost" onClick={e => { e.stopPropagation(); setSelectedTableModal(tableName); }}>
                              View Rows
                              <Icon name="chevronRight" size={13} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            {/* AUDIT TRANSACTIONS */}
            <AuditLogTable
              paginatedLogs={paginatedLogs}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              filterAction={filterAction}
              setFilterAction={setFilterAction}
              filterVerification={filterVerification}
              setFilterVerification={setFilterVerification}
              rowsPerPage={rowsPerPage}
              setRowsPerPage={setRowsPerPage}
              tempDateFrom={tempDateFrom}
              setTempDateFrom={setTempDateFrom}
              tempDateTo={tempDateTo}
              setTempDateTo={setTempDateTo}
              filterDateFrom={filterDateFrom}
              filterDateTo={filterDateTo}
              setFilterDateFrom={setFilterDateFrom}
              setFilterDateTo={setFilterDateTo}
              handleApplyLogsRange={handleApplyLogsRange}
              handleClearRange={handleClearRange}
              isLogsLoading={isLogsLoading}
              handleVerifyRange={handleVerifyRange}
              rangeVerifyResult={rangeVerifyResult}
              setRangeVerifyResult={setRangeVerifyResult}
              isVerifyRangeLoading={isVerifyRangeLoading}
              onSelectResource={setSelectedResource}
              renderStatusBadge={renderStatusBadge}
              displayTotal={displayTotal}
              currentPage={currentPage}
              setCurrentPage={setCurrentPage}
              totalPages={totalPages}
              renderPageNumbers={renderPageNumbers}
            />
          </>

        </div>
      </main>

      {/* MODAL LEVEL 1: Table Records */}
      {selectedTableModal && (
        <div className="ac-modal-overlay" onClick={() => setSelectedTableModal(null)}>
          <div className="ac-modal ac-modal--sm" onClick={e => e.stopPropagation()}>
            <div className="ac-modal__header">
              <div>
                <div className="ac-modal__title">🗂️ Table: {selectedTableModal}</div>
                <div className="ac-modal__subtitle">
                  {isTableRecordsLoading
                    ? 'Loading records...'
                    : tableRecordsError
                      ? 'Failed to load'
                      : `${tableModalRecords.length} records found`}
                </div>
              </div>
              <button className="ac-modal__close" onClick={() => setSelectedTableModal(null)}>×</button>
            </div>
            <div className="ac-modal__body" style={{ padding: 0 }}>
              {/* State: Loading */}
              {isTableRecordsLoading && (
                <div className="ac-empty" style={{ padding: '32px 0' }}>
                  <div className="ac-empty__icon">⏳</div>
                  <span>Loading records list...</span>
                </div>
              )}

              {/* State: Error (endpoint missing or server error) */}
              {!isTableRecordsLoading && tableRecordsError && (
                <div className="ac-empty" style={{ padding: '32px 16px', textAlign: 'center' }}>
                  <div className="ac-empty__icon">⚠️</div>
                  <span style={{ color: 'var(--color-danger, #ef4444)', fontSize: 13 }}>
                    {tableRecordsError}
                  </span>
                  <div style={{ fontSize: 12, color: 'var(--color-muted, #6b7280)', marginTop: 8 }}>
                    This feature requires a backend update. Please contact the backend team.
                  </div>
                </div>
              )}

              {/* State: Empty */}
              {!isTableRecordsLoading && !tableRecordsError && tableModalRecords.length === 0 && (
                <div className="ac-empty" style={{ padding: '32px 0' }}>
                  <div className="ac-empty__icon">📭</div>
                  <span>No records found for this table.</span>
                </div>
              )}

              {/* State: Data tersedia */}
              {!isTableRecordsLoading && !tableRecordsError && tableModalRecords.length > 0 && (() => {
                const filteredModalRecords = tableModalRecords.filter(item => {
                  const resource = item.resource || item.source_table || '';
                  const action = item.last_action || item.action || '';
                  const q = modalSearchQuery.toLowerCase();
                  return resource.toLowerCase().includes(q) || action.toLowerCase().includes(q);
                });

                const modalTotalPages = Math.ceil(filteredModalRecords.length / modalRowsPerPage) || 1;
                const paginatedModalRecords = filteredModalRecords.slice(
                  (modalCurrentPage - 1) * modalRowsPerPage,
                  modalCurrentPage * modalRowsPerPage
                );

                return (
                  <div>
                    {/* Search & Meta Bar in Modal */}
                    <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-border, #e5e7eb)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                      <input
                        type="text"
                        placeholder="🔍 Cari Resource ID / Action..."
                        value={modalSearchQuery}
                        onChange={e => { setModalSearchQuery(e.target.value); setModalCurrentPage(1); }}
                        style={{
                          padding: '6px 12px',
                          borderRadius: 6,
                          border: '1px solid var(--color-border, #d1d5db)',
                          fontSize: 13,
                          width: 240
                        }}
                      />
                      <span style={{ fontSize: 12, color: 'var(--color-muted, #6b7280)' }}>
                        Showing {paginatedModalRecords.length} of {filteredModalRecords.length} records
                      </span>
                    </div>

                    <div className="ac-table-wrap">
                      <table className="ac-table">
                        <thead>
                          <tr>
                            <th>Resource ID</th>
                            <th>Last Action</th>
                            <th>Last Updated</th>
                            <th>Chain Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedModalRecords.map(item => {
                            const resource = item.resource || item.source_table || '';
                            const resourceID = resource.includes(':') ? resource.split(':')[1] : resource;
                            const action = item.last_action || item.action || '';
                            const ts = item.last_updated_at || item.timestamp || '';
                            const chainSt = item.chain_status || item.integrity_status || '';

                            const chainBadge = (() => {
                              switch (chainSt) {
                                case 'valid':       return <span className="ac-chain-badge ac-status--valid">✅ Valid</span>;
                                case 'tampered':    return <span className="ac-chain-badge ac-status--invalid">🚨 Tampered</span>;
                                case 'pending':     return <span className="ac-chain-badge ac-status--pending">⏱️ Pending</span>;
                                case 'unreachable': return <span className="ac-chain-badge ac-status--checking">⚠️ Unreachable</span>;
                                default:            return <span className="ac-chain-badge ac-status--checking">⏳</span>;
                              }
                            })();

                            return (
                              <tr
                                key={resource || item.log_id}
                                onClick={() => { setSelectedResource(resource); setSelectedTableModal(null); }}
                              >
                                <td>
                                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600 }}>
                                    🔍 {resourceID || resource}
                                  </span>
                                </td>
                                <td><ActionBadge action={action} /></td>
                                <td className="ac-table__time">{formatTimestamp(ts)}</td>
                                <td onClick={(e) => e.stopPropagation()}>{chainBadge}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Modal Pagination Bar */}
                    {modalTotalPages > 1 && (
                      <div style={{ padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--color-border, #e5e7eb)' }}>
                        <button
                          className="ac-btn-ghost"
                          style={{ padding: '4px 12px', fontSize: 12 }}
                          disabled={modalCurrentPage <= 1}
                          onClick={() => setModalCurrentPage(p => Math.max(1, p - 1))}
                        >
                          ‹ Previous
                        </button>
                        <span style={{ fontSize: 12, fontWeight: 600 }}>
                          Page {modalCurrentPage} of {modalTotalPages}
                        </span>
                        <button
                          className="ac-btn-ghost"
                          style={{ padding: '4px 12px', fontSize: 12 }}
                          disabled={modalCurrentPage >= modalTotalPages}
                          onClick={() => setModalCurrentPage(p => Math.min(modalTotalPages, p + 1))}
                        >
                          Next ›
                        </button>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* MODAL LEVEL 2: Resource Log History */}
      {selectedResource && (
        <ResourceDetailModal
          resource={selectedResource}
          selectedClient={selectedClient}
          onClose={() => setSelectedResource(null)}
        />
      )}
    </div>
  );
}

export { DashboardPage };
export default DashboardPage;
