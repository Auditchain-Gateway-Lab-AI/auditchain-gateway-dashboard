// src/App.js
import React, { useState, useEffect, useMemo } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import api from './api';
import './App.css';

// ================================================================
// KOMPONEN: Snapshot Viewer — tampilkan data pada log tertentu
// dibandingkan dengan log sebelumnya untuk mendeteksi perubahan
// ================================================================
function SnapshotViewer({ currentLog, previousLog }) {
  const SKIP = new Set(['_id', 'id', 'ogc_fid', 'fid', 'gid', 'objectid']);

  function parseMetadata(raw) {
    if (!raw) return {};
    try { return typeof raw === 'string' ? JSON.parse(raw) : raw; }
    catch { return {}; }
  }

  const currentData = parseMetadata(currentLog?.metadata);
  const previousData = parseMetadata(previousLog?.metadata);

  const allKeys = [...new Set([
    ...Object.keys(currentData),
    ...Object.keys(previousData)
  ])].filter(k => !SKIP.has(k));

  if (allKeys.length === 0) {
    return <span style={{ color: '#6c757d', fontSize: '12px' }}>Tidak ada data metadata</span>;
  }

  // INSERT — tidak ada log sebelumnya, tampilkan semua nilai baru
  if (!previousLog || Object.keys(previousData).length === 0) {
    return (
      <table style={{ fontSize: '12px', width: '100%', borderCollapse: 'collapse' }}>
        <tbody>
          {allKeys.map(k => (
            <tr key={k}>
              <td style={{ padding: '2px 6px', color: '#495057', fontWeight: 'bold', whiteSpace: 'nowrap', width: '30%' }}>{k}</td>
              <td style={{ padding: '2px 6px', backgroundColor: '#d1e7dd', borderRadius: '3px' }}>
                {String(currentData[k] ?? '—')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  // DELETE — tampilkan data terakhir yang ada dengan strikethrough
  if (currentLog?.action === 'DELETE') {
    return (
      <table style={{ fontSize: '12px', width: '100%', borderCollapse: 'collapse' }}>
        <tbody>
          {allKeys.map(k => (
            <tr key={k}>
              <td style={{ padding: '2px 6px', color: '#495057', fontWeight: 'bold', whiteSpace: 'nowrap', width: '30%' }}>{k}</td>
              <td style={{ padding: '2px 6px', backgroundColor: '#f8d7da', borderRadius: '3px', textDecoration: 'line-through' }}>
                {String(previousData[k] ?? '—')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  // UPDATE — tampilkan hanya field yang berubah
  const changed = allKeys.filter(k =>
    String(currentData[k] ?? '') !== String(previousData[k] ?? '')
  );

  const unchanged = allKeys.filter(k =>
    String(currentData[k] ?? '') === String(previousData[k] ?? '')
  );

  if (changed.length === 0) {
    return (
      <div>
        <span style={{ color: '#6c757d', fontSize: '12px' }}>Tidak ada perubahan field yang terdeteksi</span>
        <table style={{ fontSize: '12px', width: '100%', borderCollapse: 'collapse', marginTop: '6px' }}>
          <tbody>
            {unchanged.map(k => (
              <tr key={k} style={{ borderTop: '1px solid #f0f0f0' }}>
                <td style={{ padding: '2px 6px', color: '#adb5bd', whiteSpace: 'nowrap', width: '30%' }}>{k}</td>
                <td style={{ padding: '2px 6px', color: '#adb5bd' }}>{String(currentData[k] ?? '—')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div>
      {/* Field yang berubah */}
      <table style={{ fontSize: '12px', width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ backgroundColor: '#f8f9fa' }}>
            <th style={{ padding: '3px 6px', textAlign: 'left', color: '#495057', width: '25%' }}>Field</th>
            <th style={{ padding: '3px 6px', textAlign: 'left', color: '#842029' }}>Sebelum</th>
            <th style={{ padding: '3px 6px', textAlign: 'left', color: '#0f5132' }}>Sesudah</th>
          </tr>
        </thead>
        <tbody>
          {changed.map(k => (
            <tr key={k} style={{ borderTop: '1px solid #dee2e6' }}>
              <td style={{ padding: '3px 6px', fontWeight: 'bold', color: '#495057', whiteSpace: 'nowrap' }}>{k}</td>
              <td style={{ padding: '3px 6px', backgroundColor: '#f8d7da', borderRadius: '3px' }}>
                {String(previousData[k] ?? '—')}
              </td>
              <td style={{ padding: '3px 6px', backgroundColor: '#d1e7dd', borderRadius: '3px' }}>
                {String(currentData[k] ?? '—')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Field yang tidak berubah — collapsible */}
      {unchanged.length > 0 && (
        <details style={{ marginTop: '6px' }}>
          <summary style={{ fontSize: '11px', color: '#adb5bd', cursor: 'pointer' }}>
            {unchanged.length} field tidak berubah
          </summary>
          <table style={{ fontSize: '11px', width: '100%', borderCollapse: 'collapse', marginTop: '4px' }}>
            <tbody>
              {unchanged.map(k => (
                <tr key={k} style={{ borderTop: '1px solid #f0f0f0' }}>
                  <td style={{ padding: '2px 6px', color: '#adb5bd', whiteSpace: 'nowrap', width: '30%' }}>{k}</td>
                  <td style={{ padding: '2px 6px', color: '#adb5bd' }}>{String(currentData[k] ?? '—')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      )}
    </div>
  );
}

// ================================================================
// KOMPONEN: Detail Verifikasi — tampilkan hasil verifikasi per lapis
// ================================================================
function VerificationDetail({ result, onClose }) {
  if (!result) return null;

  const isSuccess = result.status === 'success' || result.data?.is_valid;
  const isPending = result.status === 'pending';
  const data = result.data || result;

  const layers = [
    {
      id: 1,
      label: 'Lapis 1',
      sub: 'Eksistensi DB',
      // Lapis 1 selalu pass jika log ditemukan
      active: true,
      pass: true,
    },
    {
      id: 2,
      label: 'Lapis 2',
      sub: 'Re-Hash Lokal',
      active: result.status !== 'failed_local' ? true : true,
      pass: result.status !== 'failed_local',
    },
    {
      id: 3,
      label: 'Lapis 3',
      sub: 'Verifikasi Agent',
      active: data.agent_used === true,
      pass: data.agent_used === true && result.status !== 'failed_source',
    },
    {
      id: 4,
      label: 'Lapis 4',
      sub: 'Konsensus Blockchain',
      active: !isPending && result.status !== 'failed_local' && result.status !== 'failed_source',
      pass: isSuccess,
    },
  ];

  const headerBg = isSuccess ? '#d1e7dd' : isPending ? '#fff3cd' : '#f8d7da';
  const headerColor = isSuccess ? '#0f5132' : isPending ? '#856404' : '#842029';
  const headerIcon = isSuccess ? '✅' : isPending ? '⏳' : '🚨';

  return (
    <div style={{
      marginBottom: '20px',
      border: `1px solid ${isSuccess ? '#a3cfbb' : isPending ? '#ffe69c' : '#f1aeb5'}`,
      borderRadius: '8px',
      overflow: 'hidden',
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 16px',
        backgroundColor: headerBg,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <div style={{ fontWeight: 'bold', color: headerColor, fontSize: '14px' }}>
            {headerIcon} {isSuccess ? 'Verifikasi Berhasil' : isPending ? 'Menunggu Blockchain' : 'Verifikasi Gagal'}
          </div>
          <div style={{ fontSize: '12px', color: headerColor, marginTop: '2px' }}>
            {data.message || result.message || ''}
          </div>
        </div>
        <button onClick={onClose} style={{ border: 'none', background: 'none', fontSize: '18px', cursor: 'pointer', color: headerColor }}>×</button>
      </div>

      {/* Layer indicators */}
      <div style={{ padding: '16px', borderBottom: '1px solid #dee2e6' }}>
        <div style={{ fontSize: '11px', color: '#6c757d', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Lapisan Verifikasi
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
          {layers.map((layer, idx) => (
            <React.Fragment key={layer.id}>
              <div style={{
                padding: '6px 12px',
                borderRadius: '6px',
                backgroundColor: !layer.active ? '#f8f9fa' : layer.pass ? '#d1e7dd' : '#f8d7da',
                border: `1px solid ${!layer.active ? '#dee2e6' : layer.pass ? '#a3cfbb' : '#f1aeb5'}`,
                textAlign: 'center',
                minWidth: '90px'
              }}>
                <div style={{
                  fontSize: '12px',
                  fontWeight: 'bold',
                  color: !layer.active ? '#adb5bd' : layer.pass ? '#0f5132' : '#842029'
                }}>
                  {!layer.active ? '○' : layer.pass ? '✅' : '❌'} {layer.label}
                </div>
                <div style={{
                  fontSize: '10px',
                  color: !layer.active ? '#adb5bd' : layer.pass ? '#0f5132' : '#842029',
                  marginTop: '2px'
                }}>
                  {layer.sub}
                </div>
              </div>
              {idx < layers.length - 1 && (
                <div style={{ color: '#adb5bd', fontSize: '14px' }}>→</div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Detail info */}
      <div style={{ padding: '12px 16px', fontSize: '12px', color: '#495057', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <div>
          <span style={{ color: '#6c757d' }}>Agent digunakan: </span>
          {data.agent_used
            ? <span style={{ color: '#0f5132' }}>✅ Ya ({data.source_found ? 'data ditemukan' : 'data tidak ditemukan'})</span>
            : <span style={{ color: '#6c757d' }}>✗ Tidak (log bukan dari Agent)</span>
          }
        </div>

        {data.log_id && (
          <div><span style={{ color: '#6c757d' }}>Log ID: </span>
            <code style={{ fontSize: '11px' }}>{data.log_id}</code>
          </div>
        )}

        {data.blockchain_tx_id && (
          <div><span style={{ color: '#6c757d' }}>Blockchain TxID: </span>
            <code style={{ fontSize: '11px' }}>{data.blockchain_tx_id}</code>
          </div>
        )}

        {data.expected_hash && (
          <div><span style={{ color: '#6c757d' }}>Hash: </span>
            <code style={{ fontSize: '11px' }}>{data.expected_hash || data.hash_value}</code>
          </div>
        )}

        {/* Discrepancies jika ada */}
        {data.source_discrepancies && data.source_discrepancies.length > 0 && (
          <div style={{ marginTop: '8px' }}>
            <div style={{ fontWeight: 'bold', color: '#842029', marginBottom: '4px' }}>Perbedaan yang ditemukan:</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8d7da' }}>
                  <th style={{ padding: '3px 6px', textAlign: 'left' }}>Field</th>
                  <th style={{ padding: '3px 6px', textAlign: 'left' }}>Di Log</th>
                  <th style={{ padding: '3px 6px', textAlign: 'left' }}>Di Sumber</th>
                </tr>
              </thead>
              <tbody>
                {data.source_discrepancies.map((d, i) => (
                  <tr key={i} style={{ borderTop: '1px solid #f1aeb5' }}>
                    <td style={{ padding: '3px 6px', fontWeight: 'bold' }}>{d.field}</td>
                    <td style={{ padding: '3px 6px' }}>{d.in_log}</td>
                    <td style={{ padding: '3px 6px' }}>{d.in_agent}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ================================================================
// KOMPONEN: Modal Detail Log per Resource (LEVEL 2)
// ================================================================
function ResourceDetailModal({ resource, logs, verifyStatus, onClose }) {
  // sortedAsc dipakai untuk mencari prevLog (log sebelumnya secara kronologis)
  const sortedAsc = logs
    .filter(l => l.resource === resource)
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  // resourceLogs ditampilkan terbaru di atas
  const resourceLogs = [...sortedAsc].reverse();

  const actionColor = { INSERT: '#0f5132', UPDATE: '#664d03', DELETE: '#842029' };
  const actionBg    = { INSERT: '#d1e7dd', UPDATE: '#fff3cd', DELETE: '#f8d7da' };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          backgroundColor: '#fff', borderRadius: '10px', width: '90%', maxWidth: '900px',
          maxHeight: '85vh', overflow: 'hidden', display: 'flex', flexDirection: 'column',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
        }}
      >
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #dee2e6', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8f9fa' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '15px' }}>📋 Riwayat Log</h3>
            <code style={{ fontSize: '12px', color: '#6c757d' }}>{resource}</code>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            {verifyStatus && (
              <span style={{
                padding: '4px 10px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold',
                backgroundColor: verifyStatus.status === 'success' ? '#d1e7dd' : verifyStatus.status === 'pending' ? '#fff3cd' : '#f8d7da',
                color: verifyStatus.status === 'success' ? '#0f5132' : verifyStatus.status === 'pending' ? '#856404' : '#842029'
              }}>
                {verifyStatus.status === 'success' ? '✅ Rantai Valid' : verifyStatus.status === 'pending' ? '⏱️ Pending' : '🚨 Terdeteksi Masalah'}
              </span>
            )}
            <span style={{ color: '#6c757d', fontSize: '13px' }}>{resourceLogs.length} log ditemukan</span>
            <button onClick={onClose} style={{ border: 'none', background: 'none', fontSize: '20px', cursor: 'pointer', color: '#6c757d', lineHeight: 1 }}>×</button>
          </div>
        </div>

        {/* Body */}
        <div style={{ overflowY: 'auto', padding: '16px 20px', flex: 1 }}>
          {resourceLogs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#6c757d' }}>
              Tidak ada log untuk resource ini dalam 500 log terakhir.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {resourceLogs.map((log, idx) => {
                // prevLog = log sebelumnya secara kronologis (dari sortedAsc)
                const ascIdx = sortedAsc.findIndex(l => l.log_id === log.log_id);
                const prevLog = ascIdx > 0 ? sortedAsc[ascIdx - 1] : null;
                // isFirst = log terbaru (idx === 0 karena urutan dibalik)
                const isFirst = idx === 0;

                return (
                  <div
                    key={log.log_id}
                    style={{
                      border: `1px solid ${isFirst ? '#0d6efd' : '#dee2e6'}`,
                      borderRadius: '8px', overflow: 'hidden',
                      boxShadow: isFirst ? '0 0 0 2px rgba(13,110,253,0.15)' : 'none'
                    }}
                  >
                    {/* Log header */}
                    <div style={{ padding: '10px 14px', backgroundColor: isFirst ? '#e7f1ff' : '#f8f9fa', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '12px', color: '#6c757d', minWidth: '140px' }}>
                        {new Date(log.timestamp).toLocaleString('id-ID')}
                      </span>
                      <span style={{
                        backgroundColor: actionBg[log.action] || '#e9ecef',
                        color: actionColor[log.action] || '#333',
                        padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold'
                      }}>
                        {log.action}
                      </span>
                      <span style={{ fontSize: '13px', fontWeight: 'bold' }}>👤 {log.actor}</span>
                      <span style={{ fontSize: '12px', color: '#6c757d' }}>📡 {log.source_system}</span>
                      {isFirst && <span style={{ marginLeft: 'auto', fontSize: '11px', color: '#0d6efd', fontWeight: 'bold' }}>● Terbaru</span>}
                    </div>

                    {/* Snapshot & Diff */}
                    <div style={{ padding: '10px 14px', borderTop: '1px solid #dee2e6' }}>
                      <div style={{ fontSize: '11px', color: '#adb5bd', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        {log.action === 'INSERT' ? 'Data Baru' :
                         log.action === 'DELETE' ? 'Data Dihapus' :
                         `Perubahan (dibanding log sebelumnya)`}
                      </div>
                      <SnapshotViewer currentLog={log} previousLog={prevLog} />
                    </div>

                    {/* Hash */}
                    <div style={{ padding: '6px 14px', borderTop: '1px solid #f0f0f0', backgroundColor: '#fdfdfd' }}>
                      <code style={{ fontSize: '10px', color: '#adb5bd', wordBreak: 'break-all' }}>
                        🔑 {log.hash_value}
                      </code>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ================================================================
// KOMPONEN: Login
// ================================================================
function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post('/auth/login', { username, password });
      localStorage.setItem('token', response.data.token);
      onLogin(true);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Gagal login. Periksa kembali kredensial Anda.');
    }
  };

  return (
    <div style={{ padding: '50px', maxWidth: '400px', margin: 'auto' }}>
      <h2>Login Auditor</h2>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <input type="text" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} required
          style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }} />
        <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required
          style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }} />
        <button type="submit" style={{ padding: '10px', backgroundColor: '#007BFF', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
          Login
        </button>
      </form>
    </div>
  );
}

// ================================================================
// KOMPONEN: Dashboard
// ================================================================
function Dashboard({ onLogout }) {
  const [stats, setStats]           = useState({ total_logs: 0, pending_logs: 0, anchored_logs: 0 });
  const [recentLogs, setRecentLogs] = useState([]);
  const [inventory, setInventory]   = useState([]);
  const [verifyStatuses, setVerifyStatuses]       = useState({});
  const [inventoryStatuses, setInventoryStatuses] = useState({});
  const [selectedVerifyResult, setSelectedVerifyResult] = useState(null);

  const [selectedResource, setSelectedResource]     = useState(null);
  const [selectedTableModal, setSelectedTableModal] = useState(null);

  const [searchQuery, setSearchQuery]   = useState('');
  const [filterAction, setFilterAction] = useState('ALL');
  const [currentPage, setCurrentPage]   = useState(1);
  const [rowsPerPage, setRowsPerPage]   = useState(10);

  // Fetch data utama
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, logsRes, invRes] = await Promise.all([
          api.get('/dashboard/stats'),
          api.get('/dashboard/logs'),
          api.get('/dashboard/inventory'),
        ]);
        setStats(statsRes.data);
        setRecentLogs(logsRes.data || []);
        setInventory(invRes.data || []);
      } catch (err) {
        if (err.response?.status === 401) onLogout();
      }
    };
    fetchData();
    const id = setInterval(fetchData, 5000);
    return () => clearInterval(id);
  }, [onLogout]);

  // Grouping inventory by table name (bagian sebelum ":")
  const groupedInventory = useMemo(() => {
    return inventory.reduce((acc, item) => {
      const tableName = item.resource.includes(':') ? item.resource.split(':')[0] : item.resource;
      if (!acc[tableName]) acc[tableName] = [];
      acc[tableName].push(item);
      return acc;
    }, {});
  }, [inventory]);

  const tableNames = Object.keys(groupedInventory).sort();

  // Filter & pagination tabel transaksi
  const filteredLogs = recentLogs.filter(log => {
    const matchSearch =
      log.resource.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.actor.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.hash_value.toLowerCase().includes(searchQuery.toLowerCase());
    const matchAction = filterAction === 'ALL' || log.action === filterAction;
    return matchSearch && matchAction;
  });
  const totalPages    = Math.ceil(filteredLogs.length / rowsPerPage) || 1;
  const paginatedLogs = filteredLogs.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  useEffect(() => { if (currentPage > totalPages) setCurrentPage(1); }, [filteredLogs.length, currentPage, totalPages]);

  // Background verify — tabel transaksi individual
  useEffect(() => {
    paginatedLogs.forEach(log => {
      setVerifyStatuses(prev => {
        if (prev[log.hash_value] && prev[log.hash_value].status !== 'pending' && prev[log.hash_value].status !== 'loading') return prev;
        api.get(`/dashboard/verify/${log.hash_value}`)
          .then(res => setVerifyStatuses(p => ({ ...p, [log.hash_value]: res.data })))
          .catch(err => setVerifyStatuses(p => ({ ...p, [log.hash_value]: err.response?.data || { status: 'failed' } })));
        return { ...prev, [log.hash_value]: { status: 'loading' } };
      });
    });
  }, [paginatedLogs]);

  // Background verify — inventory chain
  useEffect(() => {
    inventory.forEach(item => {
      setInventoryStatuses(prev => {
        if (prev[item.resource] && prev[item.resource].status !== 'pending' && prev[item.resource].status !== 'loading') return prev;
        api.get(`/dashboard/verify-resource/${encodeURIComponent(item.resource)}`)
          .then(res => setInventoryStatuses(p => ({ ...p, [item.resource]: res.data })))
          .catch(err => setInventoryStatuses(p => ({ ...p, [item.resource]: err.response?.data || { status: 'failed' } })));
        return { ...prev, [item.resource]: { status: 'loading' } };
      });
    });
  }, [inventory]);

  // Badge verify transaksi
  const renderStatusBadge = (log) => {
    const v = verifyStatuses[log.hash_value];
    if (!v || v.status === 'loading') return <span style={{ color: '#6c757d', fontStyle: 'italic', fontSize: '12px' }}>⏳ Memeriksa...</span>;
    const s = { cursor: 'pointer', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' };
    if (v.status === 'success') return <span onClick={() => setSelectedVerifyResult(v)} style={{ ...s, backgroundColor: '#d1e7dd', color: '#0f5132' }}>✅ VALID</span>;
    if (v.status === 'pending') return <span onClick={() => setSelectedVerifyResult(v)} style={{ ...s, backgroundColor: '#fff3cd', color: '#856404' }}>⏱️ PENDING</span>;
    return <span onClick={() => setSelectedVerifyResult(v)} style={{ ...s, backgroundColor: '#f8d7da', color: '#842029' }}>🚨 INVALID</span>;
  };

  // Badge verify inventory
  const renderInventoryBadge = (item) => {
    const v = inventoryStatuses[item.resource];
    if (!v || v.status === 'loading') return <span style={{ color: '#6c757d', fontStyle: 'italic', fontSize: '12px' }}>⏳ Memeriksa...</span>;
    const s = { cursor: 'pointer', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' };
    if (v.status === 'success') return <span onClick={() => setSelectedVerifyResult(v)} style={{ ...s, backgroundColor: '#d1e7dd', color: '#0f5132' }}>✅ VALID</span>;
    if (v.status === 'pending') return <span onClick={() => setSelectedVerifyResult(v)} style={{ ...s, backgroundColor: '#fff3cd', color: '#856404' }}>⏱️ PENDING</span>;
    return <span onClick={() => setSelectedVerifyResult(v)} style={{ ...s, backgroundColor: '#f8d7da', color: '#842029' }}>🚨 INVALID</span>;
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1100px', margin: 'auto', fontFamily: 'sans-serif' }}>

      {/* Modal Level 2: Detail resource log */}
      {selectedResource && (
        <ResourceDetailModal
          resource={selectedResource}
          logs={recentLogs}
          verifyStatus={inventoryStatuses[selectedResource]}
          onClose={() => setSelectedResource(null)}
        />
      )}

      {/* Modal Level 1: Daftar Record per Tabel */}
      {selectedTableModal && (
        <div
          onClick={() => setSelectedTableModal(null)}
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ backgroundColor: '#fff', borderRadius: '10px', width: '90%', maxWidth: '800px', maxHeight: '80vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}
          >
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #dee2e6', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8f9fa', borderRadius: '10px 10px 0 0' }}>
              <h3 style={{ margin: 0, fontSize: '16px' }}>🗂️ Tabel: {selectedTableModal}</h3>
              <button onClick={() => setSelectedTableModal(null)} style={{ border: 'none', background: 'none', fontSize: '20px', cursor: 'pointer', color: '#6c757d' }}>×</button>
            </div>
            <div style={{ overflowY: 'auto', padding: '0' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead style={{ position: 'sticky', top: 0, backgroundColor: '#e9ecef', zIndex: 1 }}>
                  <tr>
                    <th style={{ padding: '12px', borderBottom: '1px solid #ccc' }}>Resource ID</th>
                    <th style={{ padding: '12px', borderBottom: '1px solid #ccc' }}>Aksi Terakhir</th>
                    <th style={{ padding: '12px', borderBottom: '1px solid #ccc' }}>Pembaruan Terakhir</th>
                    <th style={{ padding: '12px', borderBottom: '1px solid #ccc' }}>Status Rantai</th>
                  </tr>
                </thead>
                <tbody>
                  {groupedInventory[selectedTableModal].map(item => {
                    const resourceID = item.resource.includes(':') ? item.resource.split(':')[1] : item.resource;
                    return (
                      <tr
                        key={item.resource}
                        onClick={() => { setSelectedResource(item.resource); setSelectedTableModal(null); }}
                        style={{ borderBottom: '1px solid #eee', cursor: 'pointer', transition: 'background-color 0.15s' }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = '#e7f1ff'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <td style={{ padding: '12px', fontWeight: 'bold', fontFamily: 'monospace', fontSize: '13px' }}>
                          🔍 ID: {resourceID}
                        </td>
                        <td style={{ padding: '12px' }}>
                          <span style={{
                            backgroundColor: item.action === 'INSERT' ? '#d1e7dd' : item.action === 'DELETE' ? '#f8d7da' : '#fff3cd',
                            color: item.action === 'INSERT' ? '#0f5132' : item.action === 'DELETE' ? '#842029' : '#664d03',
                            padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold'
                          }}>
                            {item.action}
                          </span>
                        </td>
                        <td style={{ padding: '12px', fontSize: '13px' }}>
                          {new Date(item.timestamp).toLocaleString('id-ID')}
                        </td>
                        <td style={{ padding: '12px' }}>{renderInventoryBadge(item)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Header Utama */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>🛡️ AuditChain Dashboard</h1>
        <button onClick={onLogout} style={{ padding: '8px 15px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>Logout</button>
      </div>

      {/* Statistik */}
      <div style={{ display: 'flex', gap: '20px', margin: '20px 0' }}>
        <div style={{ flex: 1, padding: '20px', border: '1px solid #ccc', borderRadius: '8px', textAlign: 'center' }}>
          <h3>Total Log</h3><h2>{stats.total_logs}</h2>
        </div>
        <div style={{ flex: 1, padding: '20px', border: '1px solid #ccc', borderRadius: '8px', textAlign: 'center', backgroundColor: '#fff3cd' }}>
          <h3>Pending</h3><h2>{stats.pending_logs}</h2>
        </div>
        <div style={{ flex: 1, padding: '20px', border: '1px solid #ccc', borderRadius: '8px', textAlign: 'center', backgroundColor: '#d1e7dd' }}>
          <h3>Anchored (Blockchain)</h3><h2>{stats.anchored_logs}</h2>
        </div>
      </div>

      {/* Detail Verifikasi */}
      {selectedVerifyResult && (
        <VerificationDetail
          result={selectedVerifyResult}
          onClose={() => setSelectedVerifyResult(null)}
        />
      )}

      {/* =================== TABEL INVENTORY =================== */}
      <div style={{ border: '1px solid #ccc', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#fff', marginBottom: '40px' }}>
        <h3 style={{ padding: '15px', margin: 0, backgroundColor: '#f0f4f8', borderBottom: '1px solid #ccc' }}>
          📦 Data Inventory
          <span style={{ fontWeight: 'normal', fontSize: '13px', color: '#6c757d', marginLeft: '10px' }}>
            — {tableNames.length} tabel, klik untuk lihat daftar record
          </span>
        </h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#e9ecef' }}>
                <th style={{ padding: '12px', borderBottom: '1px solid #ccc' }}>Nama Tabel</th>
                <th style={{ padding: '12px', borderBottom: '1px solid #ccc' }}>Total Record Terpantau</th>
                <th style={{ padding: '12px', borderBottom: '1px solid #ccc', width: '150px' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {tableNames.map(tableName => (
                <tr
                  key={tableName}
                  onClick={() => setSelectedTableModal(tableName)}
                  style={{ borderBottom: '1px solid #eee', cursor: 'pointer', transition: 'background-color 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f5f5f5'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <td style={{ padding: '12px', fontWeight: 'bold', fontSize: '14px' }}>
                    🗄️ {tableName}
                  </td>
                  <td style={{ padding: '12px', fontSize: '13px' }}>
                    {groupedInventory[tableName].length} Record
                  </td>
                  <td style={{ padding: '12px' }}>
                    <button style={{ padding: '6px 12px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>
                      Lihat Record
                    </button>
                  </td>
                </tr>
              ))}
              {tableNames.length === 0 && (
                <tr><td colSpan="3" style={{ padding: '30px', textAlign: 'center', color: '#6c757d' }}>Belum ada data inventaris.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* =================== TABEL TRANSAKSI =================== */}
      <div style={{ border: '1px solid #ccc', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#fff' }}>
        <div style={{ padding: '15px', backgroundColor: '#f8f9fa', borderBottom: '1px solid #ccc', display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
          <h3 style={{ margin: 0, marginRight: 'auto' }}>📜 Semua Riwayat Transaksi</h3>
          <input type="text" placeholder="🔍 Cari Aktor, Resource, atau Hash..." value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc', width: '250px' }} />
          <select value={filterAction} onChange={e => setFilterAction(e.target.value)} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}>
            <option value="ALL">Semua Aksi</option>
            <option value="INSERT">INSERT</option>
            <option value="UPDATE">UPDATE</option>
            <option value="DELETE">DELETE</option>
          </select>
          <select value={rowsPerPage} onChange={e => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); }} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}>
            <option value={5}>5 Baris</option>
            <option value={10}>10 Baris</option>
            <option value={20}>20 Baris</option>
            <option value={50}>50 Baris</option>
          </select>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#e9ecef' }}>
                <th style={{ padding: '12px', borderBottom: '1px solid #ccc' }}>Waktu</th>
                <th style={{ padding: '12px', borderBottom: '1px solid #ccc' }}>Aktor</th>
                <th style={{ padding: '12px', borderBottom: '1px solid #ccc' }}>Aksi</th>
                <th style={{ padding: '12px', borderBottom: '1px solid #ccc' }}>Resource</th>
                <th style={{ padding: '12px', borderBottom: '1px solid #ccc' }}>Integritas Log</th>
              </tr>
            </thead>
            <tbody>
              {paginatedLogs.map(log => (
                <tr
                  key={log.log_id}
                  style={{ borderBottom: '1px solid #eee', cursor: 'pointer' }}
                  onClick={() => setSelectedResource(log.resource)}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f5f5f5'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <td style={{ padding: '12px', fontSize: '13px' }}>{new Date(log.timestamp).toLocaleString('id-ID')}</td>
                  <td style={{ padding: '12px', fontSize: '13px', fontWeight: 'bold' }}>{log.actor}</td>
                  <td style={{ padding: '12px' }}>
                    <span style={{
                      backgroundColor: log.action === 'INSERT' ? '#d1e7dd' : log.action === 'DELETE' ? '#f8d7da' : '#fff3cd',
                      color: log.action === 'INSERT' ? '#0f5132' : log.action === 'DELETE' ? '#842029' : '#664d03',
                      padding: '3px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold'
                    }}>{log.action}</span>
                  </td>
                  <td style={{ padding: '12px', fontSize: '13px', fontFamily: 'monospace' }}>{log.resource}</td>
                  <td style={{ padding: '12px' }} onClick={e => e.stopPropagation()}>{renderStatusBadge(log)}</td>
                </tr>
              ))}
              {paginatedLogs.length === 0 && (
                <tr><td colSpan="5" style={{ padding: '30px', textAlign: 'center', color: '#6c757d' }}>Tidak ada transaksi yang cocok.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div style={{ padding: '15px', backgroundColor: '#f8f9fa', borderTop: '1px solid #ccc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '14px', color: '#6c757d' }}>Menampilkan {paginatedLogs.length} dari {filteredLogs.length} hasil</span>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} style={{ padding: '6px 12px', cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}>« Prev</button>
            <span style={{ fontSize: '14px', fontWeight: 'bold' }}>Hal {currentPage} / {totalPages}</span>
            <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} style={{ padding: '6px 12px', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer' }}>Next »</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ================================================================
// ROUTER UTAMA
// ================================================================
function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('token'));
  const handleLogout = () => { localStorage.removeItem('token'); setIsAuthenticated(false); };

  return (
    <Router>
      <Routes>
        <Route path="/login" element={!isAuthenticated ? <Login onLogin={setIsAuthenticated} /> : <Navigate to="/dashboard" />} />
        <Route path="/dashboard" element={isAuthenticated ? <Dashboard onLogout={handleLogout} /> : <Navigate to="/login" />} />
        <Route path="*" element={<Navigate to={isAuthenticated ? '/dashboard' : '/login'} />} />
      </Routes>
    </Router>
  );
}

export default App;