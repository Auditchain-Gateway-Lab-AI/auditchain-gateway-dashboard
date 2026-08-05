import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import Icon from '../components/common/Icon';
import StatCards from '../components/dashboard/StatCards';
import AuditLogTable from '../components/dashboard/AuditLogTable';
import ResourceDetailModal from '../components/dashboard/ResourceDetailModal';
import { parseJwt, mapRangeItemToVerifyStatus } from '../utils/formatters';

function DashboardPage({ onLogout }) {
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
    <div className="ac-shell">
      {/* ======= TOP NAV ======= */}
      <header className="ac-topnav">
        <div className="ac-topnav__brand">
          <button className="ac-topnav__menu-btn" onClick={() => setSidebarOpen(o => !o)}>
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
            <div className="ac-topnav__client-pill" style={{ background: 'rgba(3,40,93,0.05)', color: '#03285D', border: '1px solid rgba(3,40,93,0.1)' }}>
              <span className="ac-topnav__client-dot" style={{ background: '#008862' }} />
              <span className="ac-topnav__client-label">{clientInfo.client_id}</span>
            </div>
          ) : null}
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
          <button
            className={`ac-sidebar__nav-item${activeView === 'settings' ? ' ac-sidebar__nav-item--active' : ''}`}
            onClick={() => { setActiveView('settings'); setSidebarOpen(false); }}
            style={{ marginTop: 4 }}
          >
            <Icon name="settings" size={18} />
            Profile & Settings
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
                <span className="ac-sidebar__identity-client-val" title={clientInfo.client_id} style={{ marginBottom: 2 }}>
                  {clientInfo.client_id}
                </span>
                <span className="ac-sidebar__identity-client-title" style={{ marginTop: 4, color: '#008862', fontWeight: 700 }}>
                  🏢 {adminClients.find(c => c.id === clientInfo.client_id)?.company_name || clientInfo.company_name || "PT. Hari selasa"}
                </span>
              </div>
            </div>
          )}
          <button className="ac-sidebar__nav-item ac-sidebar__nav-item--logout" style={{ marginTop: 6 }} onClick={onLogout}>
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



          {activeView === 'settings' ? (
            <section className="ac-hero">
              <div className="ac-hero__pattern" />
              <div className="ac-hero__content">
                <div className="ac-hero__left">
                  <h1 className="ac-hero__title">⚙️ Profile & Settings</h1>
                  <p className="ac-hero__subtitle">
                    Manage your account details and workspace preferences.
                  </p>
                </div>
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
