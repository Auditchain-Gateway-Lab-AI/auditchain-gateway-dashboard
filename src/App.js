// src/App.js
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import api from './api';
import './App.css'; 

// --- KOMPONEN LOGIN ---
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
        <input 
          type="text" 
          placeholder="Username" 
          value={username} 
          onChange={(e) => setUsername(e.target.value)} 
          required 
          style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
        />
        <input 
          type="password" 
          placeholder="Password" 
          value={password} 
          onChange={(e) => setPassword(e.target.value)} 
          required 
          style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
        />
        <button type="submit" style={{ padding: '10px', backgroundColor: '#007BFF', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
          Login
        </button>
      </form>
    </div>
  );
}

// --- KOMPONEN DASHBOARD ---
function Dashboard({ onLogout }) {
  const [stats, setStats] = useState({ total_logs: 0, pending_logs: 0, anchored_logs: 0 });
  const [recentLogs, setRecentLogs] = useState([]);
  const [inventory, setInventory] = useState([]); 
  
  // Cache untuk menyimpan status valid/invalid
  const [verifyStatuses, setVerifyStatuses] = useState({}); // Untuk log individual
  const [inventoryStatuses, setInventoryStatuses] = useState({}); // Untuk rantai riwayat inventory
  
  const [selectedDetail, setSelectedDetail] = useState(null); 

  // State Kontrol Tabel Transaksi
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAction, setFilterAction] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // 1. Worker Pengambil Data Utama (Tiap 3 Detik)
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, logsRes, invRes] = await Promise.all([
          api.get('/dashboard/stats'),
          api.get('/dashboard/logs'),
          api.get('/dashboard/inventory') 
        ]);
        setStats(statsRes.data);
        setRecentLogs(logsRes.data || []);
        setInventory(invRes.data || []);
      } catch (err) {
        if (err.response?.status === 401) onLogout();
      }
    };
    fetchData();
    const intervalId = setInterval(fetchData, 3000);
    return () => clearInterval(intervalId);
  }, [onLogout]);

  // 2. Logika Pemfilteran & Pencarian (Tabel Transaksi)
  const filteredLogs = recentLogs.filter(log => {
    const matchesSearch = 
      log.resource.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.actor.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.hash_value.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesAction = filterAction === 'ALL' || log.action === filterAction;
    return matchesSearch && matchesAction;
  });

  // 3. Logika Pagination (Tabel Transaksi)
  const totalPages = Math.ceil(filteredLogs.length / rowsPerPage) || 1;
  const startIndex = (currentPage - 1) * rowsPerPage;
  const paginatedLogs = filteredLogs.slice(startIndex, startIndex + rowsPerPage);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(1);
  }, [filteredLogs.length, currentPage, totalPages]);

  // 4. Background Worker: Auto-Verify terpisah untuk Tabel 1 dan Tabel 2
  useEffect(() => {
    // 4A. Verifikasi Transaksi Individual (Tabel Bawah)
    paginatedLogs.forEach(log => {
      setVerifyStatuses(prev => {
        if (prev[log.hash_value] && prev[log.hash_value].status !== 'pending' && prev[log.hash_value].status !== 'loading') return prev;

        api.get(`/dashboard/verify/${log.hash_value}`)
          .then(res => setVerifyStatuses(p => ({ ...p, [log.hash_value]: res.data })))
          .catch(err => setVerifyStatuses(p => ({ ...p, [log.hash_value]: err.response?.data || { status: 'failed' } })));

        return { ...prev, [log.hash_value]: { status: 'loading' } };
      });
    });

    // 4B. Verifikasi Seluruh Rantai Masa Lalu (Tabel Atas / Inventory)
    inventory.forEach(item => {
      setInventoryStatuses(prev => {
        if (prev[item.resource] && prev[item.resource].status !== 'pending' && prev[item.resource].status !== 'loading') return prev;

        // Tembak endpoint baru yang mengecek sejarah dari awal sampai akhir
        api.get(`/dashboard/verify-resource/${encodeURIComponent(item.resource)}`)
          .then(res => setInventoryStatuses(p => ({ ...p, [item.resource]: res.data })))
          .catch(err => setInventoryStatuses(p => ({ ...p, [item.resource]: err.response?.data || { status: 'failed' } })));

        return { ...prev, [item.resource]: { status: 'loading' } };
      });
    });
  }, [paginatedLogs, inventory]);

  // 5A. Render Badge Status untuk Tabel Riwayat Transaksi (Individual Log)
  const renderStatusBadge = (log) => {
    const v = verifyStatuses[log.hash_value];
    if (!v || v.status === 'loading') return <span style={{ color: '#6c757d', fontStyle: 'italic', fontSize: '12px' }}>⏳ Memeriksa...</span>;
    
    const badgeStyle = { cursor: 'pointer', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' };
    
    if (v.status === 'success') {
      return <span onClick={() => setSelectedDetail(v)} style={{ ...badgeStyle, backgroundColor: '#d1e7dd', color: '#0f5132' }}>✅ VALID</span>;
    }
    if (v.status === 'pending') {
      return <span onClick={() => setSelectedDetail(v)} style={{ ...badgeStyle, backgroundColor: '#fff3cd', color: '#856404' }}>⏱️ PENDING</span>;
    }
    return <span onClick={() => setSelectedDetail(v)} style={{ ...badgeStyle, backgroundColor: '#f8d7da', color: '#842029' }}>🚨 INVALID</span>;
  };

  // 5B. Render Badge Status untuk Tabel Data Inventory (Full Chain History)
  const renderInventoryStatusBadge = (item) => {
    const v = inventoryStatuses[item.resource];
    if (!v || v.status === 'loading') return <span style={{ color: '#6c757d', fontStyle: 'italic', fontSize: '12px' }}>⏳ Memeriksa Riwayat...</span>;
    
    const badgeStyle = { cursor: 'pointer', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' };
    
    if (v.status === 'success') {
      return <span onClick={() => setSelectedDetail(v)} style={{ ...badgeStyle, backgroundColor: '#d1e7dd', color: '#0f5132' }}>✅ VALID</span>;
    }
    if (v.status === 'pending') {
      return <span onClick={() => setSelectedDetail(v)} style={{ ...badgeStyle, backgroundColor: '#fff3cd', color: '#856404' }}>⏱️ PENDING</span>;
    }
    return <span onClick={() => setSelectedDetail(v)} style={{ ...badgeStyle, backgroundColor: '#f8d7da', color: '#842029' }}>🚨 INVALID</span>;
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1100px', margin: 'auto', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>🛡️ AuditChain Dashboard</h1>
        <button onClick={onLogout} style={{ padding: '8px 15px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>Logout</button>
      </div>

      {/* --- KARTU STATISTIK --- */}
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

      {/* --- POPUP DETAIL VERIFIKASI --- */}
      {selectedDetail && (
        <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#e9ecef', borderRadius: '5px', borderLeft: (selectedDetail.status === 'success' || selectedDetail.status === 'pending') ? '5px solid #28a745' : '5px solid #dc3545' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <h3 style={{ margin: '0 0 10px 0' }}>Detail Audit: {(selectedDetail.status === 'success' || selectedDetail.status === 'pending') ? 'DATA OTENTIK / PENDING' : 'TERMANIPULASI'}</h3>
            <button onClick={() => setSelectedDetail(null)} style={{ border: 'none', background: 'none', fontWeight: 'bold', cursor: 'pointer', fontSize: '16px' }}>X</button>
          </div>
          <pre style={{ whiteSpace: 'pre-wrap', wordWrap: 'break-word', fontSize: '13px', margin: 0 }}>
            {JSON.stringify(selectedDetail.data || selectedDetail, null, 2)}
          </pre>
        </div>
      )}

      {/* ==========================================
          TABEL 2: DATA INVENTORY (STATUS PER BARIS)
      ========================================== */}
      <div style={{ border: '1px solid #ccc', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#fff', marginBottom: '40px' }}>
        <h3 style={{ padding: '15px', margin: 0, backgroundColor: '#f0f4f8', borderBottom: '1px solid #ccc' }}>
          📦 Data Inventory
        </h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#e9ecef' }}>
                <th style={{ padding: '12px', borderBottom: '1px solid #ccc' }}>Resource ID</th>
                <th style={{ padding: '12px', borderBottom: '1px solid #ccc' }}>Pembaruan Terakhir</th>
                <th style={{ padding: '12px', borderBottom: '1px solid #ccc' }}>Aktor Terakhir</th>
                <th style={{ padding: '12px', borderBottom: '1px solid #ccc' }}>Aksi Terakhir</th>
                <th style={{ padding: '12px', borderBottom: '1px solid #ccc' }}>Status Integritas</th>
              </tr>
            </thead>
            <tbody>
              {inventory.map((item) => (
                <tr key={`inv-${item.resource}`} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '12px', fontWeight: 'bold', fontFamily: 'monospace', fontSize: '13px' }}>{item.resource}</td>
                  <td style={{ padding: '12px', fontSize: '13px' }}>{new Date(item.timestamp).toLocaleString('id-ID')}</td>
                  <td style={{ padding: '12px', fontSize: '13px' }}>{item.actor}</td>
                  <td style={{ padding: '12px' }}>
                    <span style={{ backgroundColor: '#6c757d', color: 'white', padding: '3px 6px', borderRadius: '4px', fontSize: '11px' }}>{item.action}</span>
                  </td>
                  <td style={{ padding: '12px' }}>
                    {renderInventoryStatusBadge(item)}
                  </td>
                </tr>
              ))}
              {inventory.length === 0 && (
                <tr>
                  <td colSpan="5" style={{ padding: '30px', textAlign: 'center', color: '#6c757d' }}>
                    Belum ada data inventaris.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ==========================================
          TABEL 1: RIWAYAT TRANSAKSI (LOGS)
      ========================================== */}
      <div style={{ border: '1px solid #ccc', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#fff' }}>
        <div style={{ padding: '15px', backgroundColor: '#f8f9fa', borderBottom: '1px solid #ccc', display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
          <h3 style={{ margin: 0, marginRight: 'auto' }}>📜 Riwayat Transaksi</h3>
          <input 
            type="text" 
            placeholder="🔍 Cari Aktor, Resource, atau Hash..." 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)} 
            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc', width: '250px' }}
          />
          <select value={filterAction} onChange={(e) => setFilterAction(e.target.value)} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}>
            <option value="ALL">Semua Aksi</option>
            <option value="INSERT">INSERT</option>
            <option value="UPDATE">UPDATE</option>
            <option value="DELETE">DELETE</option>
          </select>
          <select value={rowsPerPage} onChange={(e) => {setRowsPerPage(Number(e.target.value)); setCurrentPage(1);}} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}>
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
              {paginatedLogs.map((log) => (
                <tr key={log.log_id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '12px', fontSize: '13px' }}>{new Date(log.timestamp).toLocaleString('id-ID')}</td>
                  <td style={{ padding: '12px', fontSize: '13px', fontWeight: 'bold' }}>{log.actor}</td>
                  <td style={{ padding: '12px' }}>
                    <span style={{ backgroundColor: '#007bff', color: 'white', padding: '3px 6px', borderRadius: '4px', fontSize: '11px' }}>{log.action}</span>
                  </td>
                  <td style={{ padding: '12px', fontSize: '13px', fontFamily: 'monospace' }}>{log.resource}</td>
                  <td style={{ padding: '12px' }}>
                    {renderStatusBadge(log)}
                  </td>
                </tr>
              ))}
              {paginatedLogs.length === 0 && (
                <tr>
                  <td colSpan="5" style={{ padding: '30px', textAlign: 'center', color: '#6c757d' }}>
                    Tidak ada transaksi yang cocok dengan filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Pagination */}
        <div style={{ padding: '15px', backgroundColor: '#f8f9fa', borderTop: '1px solid #ccc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '14px', color: '#6c757d' }}>Menampilkan {paginatedLogs.length} dari {filteredLogs.length} hasil</span>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} style={{ padding: '6px 12px', cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}>
              &laquo; Prev
            </button>
            <span style={{ fontSize: '14px', fontWeight: 'bold' }}>Hal {currentPage} / {totalPages}</span>
            <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} style={{ padding: '6px 12px', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer' }}>
              Next &raquo;
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}

// --- ROUTER UTAMA ---
function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('token'));

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsAuthenticated(false);
  };

  return (
    <Router>
      <Routes>
        <Route 
          path="/login" 
          element={!isAuthenticated ? <Login onLogin={setIsAuthenticated} /> : <Navigate to="/dashboard" />} 
        />
        <Route 
          path="/dashboard" 
          element={isAuthenticated ? <Dashboard onLogout={handleLogout} /> : <Navigate to="/login" />} 
        />
        <Route path="*" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} />} />
      </Routes>
    </Router>
  );
}

export default App;