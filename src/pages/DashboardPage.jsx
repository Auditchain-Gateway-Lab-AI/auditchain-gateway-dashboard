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
          console.error("Gagal memuat daftar klien admin:", err);
        });
    }
  }, [clientInfo]);

  // Update selectedClient if clientInfo changes
  useEffect(() => {
    if (clientInfo?.client_id) {
      setSelectedClient(clientInfo.client_id);
    }
  }, [clientInfo]);

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const params = {};
        if (selectedClient) {
          params.client_id = selectedClient;
        }

        // Hanya aktifkan jika kedua filter tanggal (From dan To) terisi
        const isDateFilterActive = !!(filterDateFrom && filterDateTo);

        let statsRes, logsRes, invRes;

        if (isDateFilterActive) {
          // Tarik data dalam jumlah besar (page_size: 1000) agar penyaringan frontend bekerja
          const logsPage = 1;
          const logsPageSize = 1000;

          [statsRes, logsRes, invRes] = await Promise.all([
            api.get('/dashboard/stats', { params }),
            api.get('/dashboard/logs', { params: { ...params, page: logsPage, page_size: logsPageSize } }),
            api.get('/dashboard/inventory', { params }),
          ]);
        } else {
          // Jika filter tanggal tidak aktif, jangan panggil api logs untuk menghemat performa
          [statsRes, invRes] = await Promise.all([
            api.get('/dashboard/stats', { params }),
            api.get('/dashboard/inventory', { params }),
          ]);
          logsRes = { data: [] };
        }

        setStats(statsRes.data);

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
        setInventory(invRes.data || []);
      } catch (err) {
        if (err.response?.status === 401) onLogout();
      }
    };
    fetchData();
    const id = setInterval(fetchData, 5000);
    return () => clearInterval(id);
  }, [onLogout, currentPage, rowsPerPage, selectedClient, filterDateFrom, filterDateTo]);

  // Verifikasi satu log SECARA ON-DEMAND
  const handleVerifyLog = useCallback((logId) => {
    setVerifyStatuses(prev => ({
      ...prev,
      [logId]: { status: 'loading' }
    }));

    api.get(`/dashboard/verify/${logId}`)
      .then(res => {
        setVerifyStatuses(prev => ({ ...prev, [logId]: res.data }));
        setSelectedVerifyResult(res.data);
      })
      .catch(err => {
        const data = err.response?.data || { status: 'failed', message: 'Gagal menghubungi server verifikasi.' };
        setVerifyStatuses(prev => ({ ...prev, [logId]: data }));
        setSelectedVerifyResult(data);
      });
  }, []);

  // Verify range using backend API
  const handleVerifyRange = useCallback(async () => {
    if (!filterDateFrom || !filterDateTo) return;
    try {
      const fromISO = new Date(filterDateFrom).toISOString();
      const toISO = new Date(filterDateTo).toISOString();

      setSelectedVerifyResult({ status: 'loading' });

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

      setSelectedVerifyResult({
        range: { from: filterDateFrom, to: filterDateTo },
        summary: res.data.summary || {
          total: results.length,
          valid: results.filter(r => r.verify_status === 'success').length,
          invalid: results.filter(r => r.verify_status === 'tampered' || r.verify_status === 'failed_local' || r.verify_status === 'failed_onchain').length,
          pending: results.filter(r => r.verify_status === 'pending').length
        },
        results
      });
    } catch (err) {
      console.error("Gagal verifikasi range:", err);
      setSelectedVerifyResult({
        range: { from: filterDateFrom, to: filterDateTo },
        summary: { total: 0, valid: 0, invalid: 0, pending: 0 },
        results: [],
        status: 'failed_local',
        message: err.response?.data?.error || 'Kesalahan koneksi saat memverifikasi range log.'
      });
    }
  }, [filterDateFrom, filterDateTo, selectedClient]);

  // Grouping inventory by table name
  const groupedInventory = useMemo(() => {
    return inventory.reduce((acc, item) => {
      const resource = item?.source_table || item?.resource || '';
      const tableName = resource.includes(':') ? resource.split(':')[0] : resource;
      if (!acc[tableName]) acc[tableName] = [];
      acc[tableName].push(item);
      return acc;
    }, {});
  }, [inventory]);

  const tableNames = Object.keys(groupedInventory).sort();

  // Filter & pagination
  const filteredLogs = recentLogs.filter(log => {
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

    return matchSearch && matchAction && matchDate;
  });
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

  // Status badge for inventory
  const renderInventoryBadge = (item) => {
    const resource = item?.source_table || item?.resource;
    const v = inventoryStatuses[resource];
    if (!v || v.status === 'loading')
      return <span className="ac-chain-badge ac-status--checking">⏳</span>;
    if (v.chain_status === 'valid' || v.status === 'success')
      return <span className="ac-chain-badge ac-status--valid" style={{ cursor: 'pointer' }} onClick={() => setSelectedVerifyResult(v)}>✅ Valid</span>;
    if (v.chain_status === 'pending' || v.status === 'pending')
      return <span className="ac-chain-badge ac-status--pending" style={{ cursor: 'pointer' }} onClick={() => setSelectedVerifyResult(v)}>⏱️ Pending</span>;
    return <span className="ac-chain-badge ac-status--invalid" style={{ cursor: 'pointer' }} onClick={() => setSelectedVerifyResult(v)}>🚨 Invalid</span>;
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

            {/* Verification Detail (inline) */}
            {selectedVerifyResult && (
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
                    ) : tableNames.map(tableName => (
                      <tr key={tableName} onClick={() => setSelectedTableModal(tableName)}>
                        <td>
                          <div className="ac-table__icon-cell">
                            <div className="ac-table__row-icon">
                              <Icon name="database" size={14} />
                            </div>
                            <strong>{tableName}</strong>
                          </div>
                        </td>
                        <td>{groupedInventory[tableName].length.toLocaleString()} Records</td>
                        <td style={{ textAlign: 'right' }}>
                          <button className="ac-btn-ghost" onClick={e => { e.stopPropagation(); setSelectedTableModal(tableName); }}>
                            View Rows
                            <Icon name="chevronRight" size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
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
              handleVerifyRange={handleVerifyRange}
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
                <div className="ac-modal__subtitle">{groupedInventory[selectedTableModal]?.length} records found</div>
              </div>
              <button className="ac-modal__close" onClick={() => setSelectedTableModal(null)}>×</button>
            </div>
            <div className="ac-modal__body" style={{ padding: 0 }}>
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
                    {groupedInventory[selectedTableModal].map(item => {
                      const resource = item.source_table || item.resource || '';
                      const resourceID = resource.includes(':') ? resource.split(':')[1] : resource;
                      return (
                        <tr
                          key={resource}
                          onClick={() => { setSelectedResource(resource); setSelectedTableModal(null); }}
                        >
                          <td>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600 }}>
                              🔍 {resourceID}
                            </span>
                          </td>
                          <td><ActionBadge action={item.action} /></td>
                          <td className="ac-table__time">{formatTimestamp(item.timestamp)}</td>
                          <td onClick={(e) => e.stopPropagation()}>{renderInventoryBadge(item)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL LEVEL 2: Resource Log History */}
      {selectedResource && (
        <ResourceDetailModal
          resource={selectedResource}
          onClose={() => setSelectedResource(null)}
        />
      )}
    </div>
  );
}

export { DashboardPage };
export default DashboardPage;
