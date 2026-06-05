// src/App.js
import React, { useState, useEffect, useMemo } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import api from './api';
import './App.css';

// ================================================================
// KOMPONEN: Diff Viewer — tampilkan perubahan data_lama vs data_baru
// ================================================================
function DiffViewer({ dataLama, dataBaru }) {
  if (!dataLama && !dataBaru) return <span style={{ color: '#6c757d' }}>—</span>;

  const SKIP = new Set(['modified_at', 'id']);

  if (!dataLama) {
    // INSERT — tidak ada data_lama
    const entries = Object.entries(dataBaru).filter(([k]) => !SKIP.has(k));
    return (
      <table style={{ fontSize: '12px', width: '100%', borderCollapse: 'collapse' }}>
        <tbody>
          {entries.map(([k, v]) => (
            <tr key={k}>
              <td style={{ padding: '2px 6px', color: '#495057', fontWeight: 'bold', whiteSpace: 'nowrap' }}>{k}</td>
              <td style={{ padding: '2px 6px', backgroundColor: '#d1e7dd', borderRadius: '3px' }}>{String(v ?? '—')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  if (!dataBaru) {
    // DELETE
    const entries = Object.entries(dataLama).filter(([k]) => !SKIP.has(k));
    return (
      <table style={{ fontSize: '12px', width: '100%', borderCollapse: 'collapse' }}>
        <tbody>
          {entries.map(([k, v]) => (
            <tr key={k}>
              <td style={{ padding: '2px 6px', color: '#495057', fontWeight: 'bold', whiteSpace: 'nowrap' }}>{k}</td>
              <td style={{ padding: '2px 6px', backgroundColor: '#f8d7da', borderRadius: '3px', textDecoration: 'line-through' }}>{String(v ?? '—')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  // UPDATE — tampilkan hanya yang berubah
  const allKeys = [...new Set([...Object.keys(dataLama), ...Object.keys(dataBaru)])].filter(k => !SKIP.has(k));
  const changed = allKeys.filter(k => String(dataLama[k] ?? '') !== String(dataBaru[k] ?? ''));

  if (changed.length === 0) return <span style={{ color: '#6c757d', fontSize: '12px' }}>Tidak ada perubahan field</span>;

  return (
    <table style={{ fontSize: '12px', width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr style={{ backgroundColor: '#f8f9fa' }}>
          <th style={{ padding: '3px 6px', textAlign: 'left', color: '#495057' }}>Field</th>
          <th style={{ padding: '3px 6px', textAlign: 'left', color: '#842029' }}>Sebelum</th>
          <th style={{ padding: '3px 6px', textAlign: 'left', color: '#0f5132' }}>Sesudah</th>
        </tr>
      </thead>
      <tbody>
        {changed.map(k => (
          <tr key={k} style={{ borderTop: '1px solid #dee2e6' }}>
            <td style={{ padding: '3px 6px', fontWeight: 'bold', color: '#495057', whiteSpace: 'nowrap' }}>{k}</td>
            <td style={{ padding: '3px 6px', backgroundColor: '#f8d7da', borderRadius: '3px' }}>{String(dataLama[k] ?? '—')}</td>
            <td style={{ padding: '3px 6px', backgroundColor: '#d1e7dd', borderRadius: '3px' }}>{String(dataBaru[k] ?? '—')}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ================================================================
// KOMPONEN: Modal Detail Log per Resource (LEVEL 2)
// ================================================================
function ResourceDetailModal({ resource, logs, verifyStatus, onClose }) {
  const resourceLogs = logs
    .filter(l => l.resource === resource)
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  const actionColor = { INSERT: '#0f5132', UPDATE: '#664d03', DELETE: '#842029' };
  const actionBg    = { INSERT: '#d1e7dd', UPDATE: '#fff3cd', DELETE: '#f8d7da' };

  function parseMetadata(raw) {
    try { return typeof raw === 'string' ? JSON.parse(raw) : raw; }
    catch { return {}; }
  }

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
          backgroundColor: '#fff', borderRadius: '10px', width: '90%', maxWidth: '860px',
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
                const meta = parseMetadata(log.metadata);
                const dataLama = meta.data_lama || null;
                const dataBaru = meta.data_baru || null;
                const isLast = idx === resourceLogs.length - 1;

                return (
                  <div
                    key={log.log_id}
                    style={{
                      border: `1px solid ${isLast ? '#0d6efd' : '#dee2e6'}`,
                      borderRadius: '8px', overflow: 'hidden',
                      boxShadow: isLast ? '0 0 0 2px rgba(13,110,253,0.15)' : 'none'
                    }}
                  >
                    {/* Log header */}
                    <div style={{ padding: '10px 14px', backgroundColor: isLast ? '#e7f1ff' : '#f8f9fa', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
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
                      {isLast && <span style={{ marginLeft: 'auto', fontSize: '11px', color: '#0d6efd', fontWeight: 'bold' }}>● Terbaru</span>}
                    </div>

                    {/* Diff */}
                    {(dataLama || dataBaru) && (
                      <div style={{ padding: '10px 14px', borderTop: '1px solid #dee2e6' }}>
                        <DiffViewer dataLama={dataLama} dataBaru={dataBaru} />
                      </div>
                    )}

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
  const [stats, setStats]             = useState({ total_logs: 0, pending_logs: 0, anchored_logs: 0 });
  const [recentLogs, setRecentLogs]   = useState([]);
  const [inventory, setInventory]     = useState([]);
  const [verifyStatuses, setVerifyStatuses]     = useState({});
  const [inventoryStatuses, setInventoryStatuses] = useState({});
  const [selectedDetail, setSelectedDetail]     = useState(null);

  // State Modal Detail Log (Modal Level 2)
  const [selectedResource, setSelectedResource] = useState(null);
  
  // State Modal Daftar Record (Modal Level 1)
  const [selectedTableModal, setSelectedTableModal] = useState(null);

  // State tabel transaksi
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
    const id = setInterval(fetchData, 3000);
    return () => clearInterval(id);
  }, [onLogout]);

  // Logika Grouping Nama Tabel untuk Data Inventory
  const groupedInventory = useMemo(() => {
    return inventory.reduce((acc, item) => {
      const tableName = item.resource.includes(':') ? item.resource.split(':')[0] : 'lainnya';
      if (!acc[tableName]) acc[tableName] = [];
      acc[tableName].push(item);
      return acc;
    }, {});
  }, [inventory]);

  const tableNames = Object.keys(groupedInventory);

  // Filter & pagination tabel transaksi
  const filteredLogs = recentLogs.filter(log => {
    const matchSearch =
      log.resource.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.actor.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.hash_value.toLowerCase().includes(searchQuery.toLowerCase());
    const matchAction = filterAction === 'ALL' || log.action === filterAction;
    return matchSearch && matchAction;
  });
  const totalPages   = Math.ceil(filteredLogs.length / rowsPerPage) || 1;
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
    if (v.status === 'success') return <span onClick={() => setSelectedDetail(v)} style={{ ...s, backgroundColor: '#d1e7dd', color: '#0f5132' }}>✅ VALID</span>;
    if (v.status === 'pending') return <span onClick={() => setSelectedDetail(v)} style={{ ...s, backgroundColor: '#fff3cd', color: '#856404' }}>⏱️ PENDING</span>;
    return <span onClick={() => setSelectedDetail(v)} style={{ ...s, backgroundColor: '#f8d7da', color: '#842029' }}>🚨 INVALID</span>;
  };

  // Badge verify inventory
  const renderInventoryBadge = (item) => {
    const v = inventoryStatuses[item.resource];
    if (!v || v.status === 'loading') return <span style={{ color: '#6c757d', fontStyle: 'italic', fontSize: '12px' }}>⏳ Memeriksa...</span>;
    const s = { cursor: 'pointer', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' };
    if (v.status === 'success') return <span onClick={() => setSelectedDetail(v)} style={{ ...s, backgroundColor: '#d1e7dd', color: '#0f5132' }}>✅ VALID</span>;
    if (v.status === 'pending') return <span onClick={() => setSelectedDetail(v)} style={{ ...s, backgroundColor: '#fff3cd', color: '#856404' }}>⏱️ PENDING</span>;
    return <span onClick={() => setSelectedDetail(v)} style={{ ...s, backgroundColor: '#f8d7da', color: '#842029' }}>🚨 INVALID</span>;
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
            {/* Header Modal Level 1 */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #dee2e6', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8f9fa', borderRadius: '10px 10px 0 0' }}>
              <h3 style={{ margin: 0, fontSize: '16px', textTransform: 'uppercase' }}>🗂️ Tabel: {selectedTableModal}</h3>
              <button onClick={() => setSelectedTableModal(null)} style={{ border: 'none', background: 'none', fontSize: '20px', cursor: 'pointer', color: '#6c757d' }}>×</button>
            </div>

            {/* Isi Daftar Record */}
            <div style={{ overflowY: 'auto', padding: '0' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead style={{ position: 'sticky', top: 0, backgroundColor: '#e9ecef', zIndex: 1 }}>
                  <tr>
                    <th style={{ padding: '12px', borderBottom: '1px solid #ccc' }}>Resource ID</th>
                    <th style={{ padding: '12px', borderBottom: '1px solid #ccc' }}>Pembaruan Terakhir</th>
                    <th style={{ padding: '12px', borderBottom: '1px solid #ccc' }}>Status Rantai</th>
                  </tr>
                </thead>
                <tbody>
                  {groupedInventory[selectedTableModal].map(item => (
                    <tr
                      key={item.resource}
                      onClick={() => setSelectedResource(item.resource)}
                      style={{ borderBottom: '1px solid #eee', cursor: 'pointer', transition: 'background-color 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = '#e7f1ff'}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <td style={{ padding: '12px', fontWeight: 'bold', fontFamily: 'monospace', fontSize: '13px' }}>🔍 {item.resource}</td>
                      <td style={{ padding: '12px', fontSize: '13px' }}>{new Date(item.timestamp).toLocaleString('id-ID')}</td>
                      <td style={{ padding: '12px' }}>{renderInventoryBadge(item)}</td>
                    </tr>
                  ))}
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

      {/* Popup detail verifikasi (JSON Transaksi Error/Valid) */}
      {selectedDetail && (
        <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#e9ecef', borderRadius: '5px', borderLeft: (selectedDetail.status === 'success' || selectedDetail.status === 'pending') ? '5px solid #28a745' : '5px solid #dc3545' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <h3 style={{ margin: '0 0 10px 0' }}>Detail Audit</h3>
            <button onClick={() => setSelectedDetail(null)} style={{ border: 'none', background: 'none', fontWeight: 'bold', cursor: 'pointer', fontSize: '16px' }}>X</button>
          </div>
          <pre style={{ whiteSpace: 'pre-wrap', wordWrap: 'break-word', fontSize: '13px', margin: 0 }}>
            {JSON.stringify(selectedDetail.data || selectedDetail, null, 2)}
          </pre>
        </div>
      )}

      {/* =================== TABEL INVENTORY (GROUPED BY TABLE) =================== */}
      <div style={{ border: '1px solid #ccc', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#fff', marginBottom: '40px' }}>
        <h3 style={{ padding: '15px', margin: 0, backgroundColor: '#f0f4f8', borderBottom: '1px solid #ccc' }}>
          📦 Data Inventory
          <span style={{ fontWeight: 'normal', fontSize: '13px', color: '#6c757d', marginLeft: '10px' }}>— klik tabel untuk melihat daftar baris data (record)</span>
        </h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#e9ecef' }}>
                <th style={{ padding: '12px', borderBottom: '1px solid #ccc' }}>Nama Tabel</th>
                <th style={{ padding: '12px', borderBottom: '1px solid #ccc' }}>Total Record</th>
                <th style={{ padding: '12px', borderBottom: '1px solid #ccc', width: '150px' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {tableNames.map(tableName => {
                const totalRecords = groupedInventory[tableName].length;
                return (
                  <tr
                    key={tableName}
                    onClick={() => setSelectedTableModal(tableName)}
                    style={{ borderBottom: '1px solid #eee', cursor: 'pointer', transition: 'background-color 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f5f5f5'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <td style={{ padding: '12px', fontWeight: 'bold', fontSize: '14px', textTransform: 'uppercase' }}>
                      🗄️ {tableName}
                    </td>
                    <td style={{ padding: '12px', fontSize: '13px' }}>
                      {totalRecords} Record Terekam
                    </td>
                    <td style={{ padding: '12px' }}>
                      <button style={{ padding: '6px 12px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>
                        Lihat Daftar Record
                      </button>
                    </td>
                  </tr>
                );
              })}
              {tableNames.length === 0 && (
                <tr><td colSpan="3" style={{ padding: '30px', textAlign: 'center', color: '#6c757d' }}>Belum ada data tabel inventaris.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* =================== TABEL TRANSAKSI (SEMUA LOGS) =================== */}
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
                <tr key={log.log_id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '12px', fontSize: '13px' }}>{new Date(log.timestamp).toLocaleString('id-ID')}</td>
                  <td style={{ padding: '12px', fontSize: '13px', fontWeight: 'bold' }}>{log.actor}</td>
                  <td style={{ padding: '12px' }}>
                    <span style={{ backgroundColor: '#007bff', color: 'white', padding: '3px 6px', borderRadius: '4px', fontSize: '11px' }}>{log.action}</span>
                  </td>
                  <td style={{ padding: '12px', fontSize: '13px', fontFamily: 'monospace' }}>{log.resource}</td>
                  <td style={{ padding: '12px' }}>{renderStatusBadge(log)}</td>
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