import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import Icon from '../components/common/Icon';
import StatCards from '../components/dashboard/StatCards';
import AuditLogTable from '../components/dashboard/AuditLogTable';
import ResourceDetailModal from '../components/dashboard/ResourceDetailModal';
import { parseJwt, mapRangeItemToVerifyStatus } from '../utils/formatters';

function DashboardPage({ onLogout, onProfileUpdated, view = 'dashboard' }) {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ total_logs: 0, pending_logs: 0, anchored_logs: 0 });
  const [recentLogs, setRecentLogs] = useState([]);
  const [verifyStatuses, setVerifyStatuses] = useState({});
  const [selectedVerifyResult, setSelectedVerifyResult] = useState(null);
  const [totalLogsCount, setTotalLogsCount] = useState(0);
  const [isServerPaginated, setIsServerPaginated] = useState(false);

  const verifyStatusesRef = useRef(verifyStatuses);

  useEffect(() => {
    verifyStatusesRef.current = verifyStatuses;
  }, [verifyStatuses]);

  const [selectedResource, setSelectedResource] = useState(null);

  // State Plan V12: Table Filter, Sort Order, & Table Names
  const [sortOrder, setSortOrder] = useState('desc');
  const [filterTable, setFilterTable] = useState('');
  const [tableNames, setTableNames] = useState([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterAction, setFilterAction] = useState('ALL');
  const [filterVerification, setFilterVerification] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem('auditchain_sidebar_collapsed') === 'true');
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [tempDateFrom, setTempDateFrom] = useState('');
  const [tempDateTo, setTempDateTo] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  // Decode JWT info for Workspace Context Indicator
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  const clientInfo = useMemo(() => parseJwt(token), [token]);

  const displayName = clientInfo?.full_name || clientInfo?.username || 'Auditor';
  const initials = (displayName || 'A')
    .split(' ')
    .map(part => part.charAt(0))
    .join('')
    .slice(0, 2)
    .toUpperCase();

  useEffect(() => {
    localStorage.setItem('auditchain_sidebar_collapsed', sidebarCollapsed ? 'true' : 'false');
  }, [sidebarCollapsed]);

  const [selectedClient, setSelectedClient] = useState(clientInfo?.client_id || '');
  const [adminClients, setAdminClients] = useState([]);
  const [profileForm, setProfileForm] = useState({
    full_name: '',
    username: '',
    current_password: '',
    new_password: '',
    confirm_password: ''
  });
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');

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

  useEffect(() => {
    if (view !== 'profile') return;

    let cancelled = false;
    setProfileLoading(true);
    setProfileError('');

    api.get('/auth/me')
      .then(res => {
        if (cancelled) return;
        setProfileForm(form => ({
          ...form,
          full_name: res.data?.full_name || '',
          username: res.data?.username || clientInfo?.username || '',
          current_password: '',
          new_password: '',
          confirm_password: ''
        }));
      })
      .catch(err => {
        if (cancelled) return;
        if (err.response?.status === 401) onLogout();
        setProfileError(err.response?.data?.error || 'Failed to load profile data.');
      })
      .finally(() => {
        if (!cancelled) setProfileLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [view, clientInfo?.username, onLogout]);

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileError('');
    setProfileSuccess('');

    if (profileForm.new_password && profileForm.new_password !== profileForm.confirm_password) {
      setProfileError('Password baru dan konfirmasi password belum sama.');
      return;
    }

    try {
      setProfileSaving(true);
      const tokenStorage = localStorage.getItem('token') ? localStorage : sessionStorage;
      const res = await api.put('/auth/me', {
        full_name: profileForm.full_name,
        username: profileForm.username,
        current_password: profileForm.current_password,
        new_password: profileForm.new_password
      });

      if (res.data?.token) {
        tokenStorage.setItem('token', res.data.token);
        if (onProfileUpdated) onProfileUpdated();
      }

      setProfileForm(form => ({
        ...form,
        current_password: '',
        new_password: '',
        confirm_password: ''
      }));
      setProfileSuccess('Profile updated successfully.');
    } catch (err) {
      if (err.response?.status === 401 && !profileForm.new_password) onLogout();
      setProfileError(err.response?.data?.error || 'Failed to update profile.');
    } finally {
      setProfileSaving(false);
    }
  };

  const [isLogsLoading, setIsLogsLoading] = useState(false);

  // Fetch logs transaksi SECARA ON-DEMAND saat rentang tanggal ditentukan
  const handleApplyLogsRange = useCallback(async (fromDate, toDate, overrideSort, overrideTable) => {
    const fromVal = fromDate || tempDateFrom;
    const toVal = toDate || tempDateTo;
    if (!fromVal || !toVal) return;

    setIsLogsLoading(true);
    setFilterDateFrom(fromVal);
    setFilterDateTo(toVal);
    setCurrentPage(1);

    const activeSort = overrideSort !== undefined ? overrideSort : sortOrder;
    const activeTable = overrideTable !== undefined ? overrideTable : filterTable;

    try {
      const fromObj = new Date(fromVal);
      const toObj = new Date(toVal);
      // Sertakan detik & milidetik terakhir pada tanggal TO (:59.999) agar transaksi menit tersebut tidak terpotong
      toObj.setSeconds(59, 999);

      const params = {
        page: 1,
        page_size: 1000,
        sort_order: activeSort,
        from: fromObj.toISOString(),
        to: toObj.toISOString(),
      };
      if (activeTable) {
        params.source_table = activeTable;
      }
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
  }, [tempDateFrom, tempDateTo, selectedClient, onLogout, sortOrder, filterTable]);

  const prevTotalLogsRef = useRef(null);
  const filterDateFromRef = useRef(filterDateFrom);
  const filterDateToRef = useRef(filterDateTo);
  const handleApplyLogsRangeRef = useRef(handleApplyLogsRange);

  useEffect(() => { filterDateFromRef.current = filterDateFrom; }, [filterDateFrom]);
  useEffect(() => { filterDateToRef.current = filterDateTo; }, [filterDateTo]);
  useEffect(() => { handleApplyLogsRangeRef.current = handleApplyLogsRange; }, [handleApplyLogsRange]);

  // Fetch summary stats (Auto-refresh 5s & Smart Polling for Table Auto-Refresh)
  useEffect(() => {
    const fetchSummaryStats = async () => {
      try {
        const params = selectedClient ? { client_id: selectedClient } : {};
        const statsRes = await api.get('/dashboard/stats', { params });
        setStats(statsRes.data);

        // Smart Polling: Otomatis re-fetch tabel transaksi jika total_logs berubah & date range aktif
        const newTotal = statsRes.data.total_logs;
        if (prevTotalLogsRef.current !== null &&
            newTotal !== prevTotalLogsRef.current &&
            filterDateFromRef.current && filterDateToRef.current) {
          handleApplyLogsRangeRef.current(filterDateFromRef.current, filterDateToRef.current);
        }
        prevTotalLogsRef.current = newTotal;
      } catch (err) {
        if (err.response?.status === 401) onLogout();
      }
    };

    fetchSummaryStats();
    const id = setInterval(fetchSummaryStats, 5000);
    return () => clearInterval(id);
  }, [onLogout, selectedClient]);

  // Fetch daftar nama tabel (Sekali saat mount / client berubah — bukan polling)
  useEffect(() => {
    const fetchTableNames = async () => {
      try {
        const params = selectedClient ? { client_id: selectedClient } : {};
        const res = await api.get('/dashboard/inventory', { params });
        const tables = (res.data || []).map(t => t.table_name).filter(Boolean).sort();
        setTableNames(tables);
      } catch (err) {
        console.error("Failed to load table names:", err);
      }
    };
    fetchTableNames();
  }, [selectedClient]);



  const handleSortOrderChange = (newSort) => {
    setSortOrder(newSort);
    const fDate = filterDateFrom || tempDateFrom;
    const tDate = filterDateTo || tempDateTo;
    if (fDate && tDate) {
      handleApplyLogsRange(fDate, tDate, newSort, filterTable);
    }
  };

  const handleFilterTableChange = (newTable) => {
    setFilterTable(newTable);
    const fDate = filterDateFrom || tempDateFrom;
    const tDate = filterDateTo || tempDateTo;
    if (fDate && tDate) {
      handleApplyLogsRange(fDate, tDate, sortOrder, newTable);
    }
  };

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
    setSortOrder('desc');
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



  // Filter & pagination
  const filteredLogs = useMemo(() => {
    const list = recentLogs.filter(log => {
      const matchSearch =
        (log?.source_table?.toLowerCase() || log?.resource?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (log?.actor?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (log?.source_system?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (log?.metadata?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (log?.hash_value?.toLowerCase() || '').includes(searchQuery.toLowerCase());

      const matchAction = filterAction === 'ALL' || log?.action === filterAction;

      let matchDate = true;
      if (log?.timestamp) {
        let tsStr = String(log.timestamp);
        if (tsStr.includes(' ') && !tsStr.includes('T')) {
          tsStr = tsStr.replace(' ', 'T');
        }
        const logTime = new Date(tsStr).getTime();

        const activeFrom = filterDateFrom || tempDateFrom;
        const activeTo = filterDateTo || tempDateTo;

        if (!isNaN(logTime)) {
          if (activeFrom) {
            const fromTime = new Date(activeFrom).getTime();
            if (!isNaN(fromTime) && logTime < fromTime) matchDate = false;
          }
          if (activeTo) {
            const toObj = new Date(activeTo);
            toObj.setSeconds(59, 999);
            const toTime = toObj.getTime();
            if (!isNaN(toTime) && logTime > toTime) matchDate = false;
          }
        }
      } else if (filterDateFrom || filterDateTo || tempDateFrom || tempDateTo) {
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

    // Urutkan data secara aman berdasarkan sortOrder:
    // 'desc' (Newest First) -> Dari TO ke FROM (timestamp terbaru ke terlama)
    // 'asc'  (Oldest First) -> Dari FROM ke TO (timestamp terlama ke terbaru)
    return list.sort((a, b) => {
      let tsA = String(a?.timestamp || '');
      if (tsA.includes(' ') && !tsA.includes('T')) tsA = tsA.replace(' ', 'T');
      let tsB = String(b?.timestamp || '');
      if (tsB.includes(' ') && !tsB.includes('T')) tsB = tsB.replace(' ', 'T');

      const timeA = new Date(tsA).getTime() || 0;
      const timeB = new Date(tsB).getTime() || 0;

      if (sortOrder === 'asc') {
        return timeA - timeB;
      }
      return timeB - timeA;
    });
  }, [recentLogs, searchQuery, filterAction, filterDateFrom, filterDateTo, tempDateFrom, tempDateTo, filterVerification, verifyStatuses, sortOrder]);
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
    <div className={`ac-shell ac-shell--user${sidebarCollapsed ? ' ac-shell--sidebar-collapsed' : ''}`}>
      {/* ======= TOP NAV ======= */}
      <header className="ac-topnav">
        <div className="ac-topnav__brand">
          <button
            className="ac-topnav__menu-btn ac-topnav__menu-btn--visible"
            onClick={() => {
              if (window.innerWidth <= 768) {
                setSidebarOpen(o => !o);
              } else {
                setSidebarCollapsed(o => !o);
              }
            }}
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <Icon name="menu" size={22} />
          </button>
          <img src="/logo/logo-with-background.png" alt="Auditchain Logo" style={{ height: 36, width: 'auto', display: 'block', flexShrink: 0, borderRadius: 6 }} />
          <div>
            <div className="ac-topnav__brand-name">Auditchain Gateway</div>
            <div className="ac-topnav__brand-sub">Gateway Portal</div>
          </div>
        </div>
        <div className="ac-topnav__right">
          {clientInfo && clientInfo.role?.toLowerCase() === 'admin' ? (
            <select
              value={selectedClient}
              onChange={e => setSelectedClient(e.target.value)}
              className="ac-topnav__client-select"
              style={{
                background: 'rgba(3,40,93,0.05)',
                border: '1px solid rgba(3,40,93,0.1)',
                color: '#03285D',
                padding: '6px 12px',
                borderRadius: 'var(--radius-md)',
                fontSize: '13px',
                fontWeight: '700',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value={clientInfo.client_id}>
                {clientInfo.client_id} (Admin Default)
              </option>
              {adminClients.length === 0 ? (
                <>
                  <option value="ed067ad4-e549-4baa-9c9d-3d27ff24194d">
                    SIMRS Dummy 2 (ed067ad4-e549-4baa-9c9d-3d27ff24194d)
                  </option>
                  <option value="7f2bc265-d419-48fe-9892-d6ef198751e1">
                    Satu Peta Debezium (7f2bc265-d419-48fe-9892-d6ef198751e1)
                  </option>
                </>
              ) : (
                adminClients.map(client => {
                  if (client.id === clientInfo.client_id) return null;
                  return (
                    <option key={client.id} value={client.id}>
                      {client.company_name || 'Klien'} ({client.id})
                    </option>
                  );
                })
              )}
            </select>
          ) : clientInfo ? (
            <div className="ac-topnav__client-pill">
              <span className="ac-topnav__client-dot" style={{ background: '#008862' }} />
              <span className="ac-topnav__client-label">{clientInfo.client_id}</span>
            </div>
          ) : null}
          {clientInfo && (
            <div className="ac-profile-menu">
              <button
                className={`ac-topnav__profile-btn${view === 'profile' ? ' ac-topnav__profile-btn--active' : ''}`}
                onClick={() => setProfileMenuOpen(open => !open)}
                title="Open user menu"
              >
                <span className="ac-topnav__avatar ac-topnav__avatar--compact">{initials}</span>
                <span className="ac-topnav__profile-copy">
                  <span className="ac-topnav__user-name">{displayName}</span>
                  <span className="ac-topnav__user-role">{clientInfo.role || 'Auditor'}</span>
                </span>
                <Icon name="chevronDown" size={14} />
              </button>
              {profileMenuOpen && (
                <div className="ac-profile-menu__panel">
                  <button onClick={() => { setProfileMenuOpen(false); navigate('/profile'); }}>
                    <Icon name="user" size={15} />
                    Profile
                  </button>
                  <button onClick={onLogout} className="ac-profile-menu__danger">
                    <Icon name="logout" size={15} />
                    Logout
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      {/* ======= SIDEBAR ======= */}
      <aside className={`ac-sidebar${sidebarOpen ? ' ac-sidebar--open' : ''}`}>
        <div className="ac-sidebar__header">
          <img className="ac-sidebar__compact-logo" src="/logo/Mask group.png" alt="AG" />
          <div className="ac-sidebar__section-label">Audit Manager</div>
          <div className="ac-sidebar__section-sub">Secure Data Integrity</div>
        </div>
        <nav className="ac-sidebar__nav">
          <button
            className={`ac-sidebar__nav-item${view === 'dashboard' ? ' ac-sidebar__nav-item--active' : ''}`}
            onClick={() => { navigate('/dashboard'); setSidebarOpen(false); }}
            title="Dashboard"
          >
            <Icon name="dashboard" size={18} />
            <span className="ac-sidebar__nav-label">Dashboard</span>
          </button>
          <button
            className={`ac-sidebar__nav-item${view === 'profile' ? ' ac-sidebar__nav-item--active' : ''}`}
            onClick={() => { navigate('/profile'); setSidebarOpen(false); }}
            style={{ marginTop: 4 }}
            title="Profile"
          >
            <Icon name="user" size={18} />
            <span className="ac-sidebar__nav-label">Profile</span>
          </button>
          {clientInfo && clientInfo.role?.toLowerCase() === 'admin' && (
            <button
              className="ac-sidebar__nav-item"
              onClick={() => navigate('/admin')}
              style={{ marginTop: 4 }}
              title="Admin Panel"
            >
              <Icon name="shield" size={18} />
              <span className="ac-sidebar__nav-label">Admin Panel</span>
            </button>
          )}
        </nav>
        <div className="ac-sidebar__footer">
          {clientInfo && (
            <div className="ac-sidebar__identity-card">
              <div className="ac-sidebar__identity-user">
                <span className="ac-sidebar__identity-avatar">
                  {initials}
                </span>
                <div className="ac-sidebar__identity-details">
                  <span className="ac-sidebar__identity-name" title={displayName}>
                    {displayName}
                  </span>
                  <span className="ac-sidebar__identity-role">
                    {clientInfo.role}
                  </span>
                </div>
              </div>
              <div className="ac-sidebar__identity-client">
                <Icon name="database" size={14} />
                <span className="ac-sidebar__identity-workspace">
                  <strong>{adminClients.find(c => c.id === clientInfo.client_id)?.company_name || clientInfo.company_name || 'Client Workspace'}</strong>
                  <small title={clientInfo.client_id}>{clientInfo.client_id}</small>
                </span>
              </div>
            </div>
          )}
          <button className="ac-sidebar__nav-item ac-sidebar__nav-item--logout" style={{ marginTop: 6 }} onClick={onLogout} title="Logout">
            <Icon name="logout" size={18} />
            <span className="ac-sidebar__nav-label">Logout</span>
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



          {view === 'profile' ? (
            <section className="ac-hero">
              <div className="ac-hero__pattern" />
              <div className="ac-hero__content">
                <div className="ac-hero__left">
                  <span className="ac-page-kicker">Account Center</span>
                  <h1 className="ac-hero__title">{displayName}</h1>
                  <p className="ac-hero__subtitle">
                    Manage the identity used across your Auditchain workspace.
                  </p>
                </div>
              </div>
              <div className="ac-profile-layout">
                <form className="ac-profile-card ac-profile-form" onSubmit={handleProfileSubmit}>
                  <div className="ac-profile-card__header">
                    <div>
                      <h2>Profile Details</h2>
                      <p>Update display name, username, and password.</p>
                    </div>
                    <span className="ac-profile-card__icon">
                      <Icon name="user" size={18} />
                    </span>
                  </div>

                  {profileLoading ? (
                    <div className="ac-profile-loading">
                      <Icon name="spinner" size={18} />
                      Loading profile...
                    </div>
                  ) : (
                    <>
                      {profileError && <div className="ac-profile-alert ac-profile-alert--error">{profileError}</div>}
                      {profileSuccess && <div className="ac-profile-alert ac-profile-alert--success">{profileSuccess}</div>}

                      <label className="ac-form-field">
                        <span className="ac-form-label">Full Name</span>
                        <input
                          className="ac-form-input ac-form-input--lg"
                          value={profileForm.full_name}
                          onChange={e => setProfileForm(form => ({ ...form, full_name: e.target.value }))}
                          placeholder="Your display name"
                        />
                      </label>

                      <label className="ac-form-field">
                        <span className="ac-form-label">Username</span>
                        <input
                          className="ac-form-input ac-form-input--lg"
                          value={profileForm.username}
                          onChange={e => setProfileForm(form => ({ ...form, username: e.target.value }))}
                          placeholder="Username"
                          required
                          minLength={4}
                        />
                      </label>

                      <div className="ac-profile-password-grid">
                        <label className="ac-form-field">
                          <span className="ac-form-label">Current Password</span>
                          <input
                            className="ac-form-input ac-form-input--lg"
                            type="password"
                            value={profileForm.current_password}
                            onChange={e => setProfileForm(form => ({ ...form, current_password: e.target.value }))}
                            placeholder="Required for password change"
                          />
                        </label>

                        <label className="ac-form-field">
                          <span className="ac-form-label">New Password</span>
                          <input
                            className="ac-form-input ac-form-input--lg"
                            type="password"
                            value={profileForm.new_password}
                            onChange={e => setProfileForm(form => ({ ...form, new_password: e.target.value }))}
                            placeholder="Minimum 6 characters"
                          />
                        </label>
                      </div>

                      <label className="ac-form-field">
                        <span className="ac-form-label">Confirm New Password</span>
                        <input
                          className="ac-form-input ac-form-input--lg"
                          type="password"
                          value={profileForm.confirm_password}
                          onChange={e => setProfileForm(form => ({ ...form, confirm_password: e.target.value }))}
                          placeholder="Repeat new password"
                        />
                      </label>

                      <div className="ac-profile-actions">
                        <button type="button" className="ac-btn-ghost-action" onClick={() => navigate('/dashboard')}>
                          Back to Dashboard
                        </button>
                        <button type="submit" className="ac-btn-primary" disabled={profileSaving}>
                          <Icon name={profileSaving ? 'spinner' : 'checkmark'} size={15} />
                          {profileSaving ? 'Saving...' : 'Save Changes'}
                        </button>
                      </div>
                    </>
                  )}
                </form>

                <aside className="ac-profile-card ac-profile-summary">
                  <div className="ac-profile-card__header">
                    <div>
                      <h2>Workspace</h2>
                      <p>Session identity assigned by admin.</p>
                    </div>
                    <span className="ac-profile-card__icon ac-profile-card__icon--teal">
                      <Icon name="shield" size={18} />
                    </span>
                  </div>
                  <div className="ac-profile-summary__row">
                    <span>Role</span>
                    <strong>{clientInfo?.role || 'Auditor'}</strong>
                  </div>
                  <div className="ac-profile-summary__row">
                    <span>Client ID</span>
                    <code>{clientInfo?.client_id || '-'}</code>
                  </div>
                  <div className="ac-profile-summary__row">
                    <span>Company</span>
                    <strong>{clientInfo?.company_name || adminClients.find(c => c.id === clientInfo?.client_id)?.company_name || 'Workspace'}</strong>
                  </div>
                </aside>
              </div>
              <div style={{ marginTop: '30px', background: '#fff', padding: '24px', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.05)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                <h3 style={{ marginBottom: '16px', color: '#03285D' }}>Notification Settings</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                    <input type="checkbox" style={{ marginRight: '8px', width: '16px', height: '16px' }} defaultChecked />
                    <span style={{ fontSize: '14px', color: '#4b5563' }}>Enable Email Alerts</span>
                  </label>
                </div>
              </div>
            </section>
          ) : (
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

            {/* AUDIT TRANSACTIONS */}
            <AuditLogTable
              paginatedLogs={paginatedLogs}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              filterAction={filterAction}
              setFilterAction={setFilterAction}
              filterVerification={filterVerification}
              setFilterVerification={setFilterVerification}
              sortOrder={sortOrder}
              setSortOrder={handleSortOrderChange}
              filterTable={filterTable}
              setFilterTable={handleFilterTableChange}
              tableNames={tableNames}
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
              selectedVerifyResult={selectedVerifyResult}
              setSelectedVerifyResult={setSelectedVerifyResult}
              onSelectResource={setSelectedResource}
              renderStatusBadge={renderStatusBadge}
              displayTotal={displayTotal}
              currentPage={currentPage}
              setCurrentPage={setCurrentPage}
              totalPages={totalPages}
              renderPageNumbers={renderPageNumbers}
            />
          </>
          )}

        </div>
      </main>

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

