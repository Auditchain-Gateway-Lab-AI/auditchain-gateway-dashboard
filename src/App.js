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
      active: true,
      pass: true,
    },
    {
      id: 2,
      label: 'Lapis 2',
      sub: 'Re-Hash Lokal',
      active: true,
      pass: result.status !== 'failed_local',
    },
    {
      id: 3,
      label: 'Lapis 3',
      sub: 'Konsensus Blockchain',
      active: !isPending && result.status !== 'failed_local',
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

        {data.db_root && (
          <div><span style={{ color: '#6c757d' }}>Merkle Root: </span>
            <code style={{ fontSize: '11px' }}>{data.db_root}</code>
          </div>
        )}

        {/* Tampilkan hash mismatch jika Lapis 2 gagal */}
        {result.status === 'failed_local' && (
          <div style={{ marginTop: '8px', padding: '8px', backgroundColor: '#f8d7da', borderRadius: '4px' }}>
            <div style={{ fontWeight: 'bold', color: '#842029', marginBottom: '4px' }}>Detail Manipulasi:</div>
            <div><span style={{ color: '#842029' }}>Hash tersimpan: </span><code style={{ fontSize: '11px' }}>{data.expected_hash}</code></div>
            <div><span style={{ color: '#842029' }}>Hash aktual: </span><code style={{ fontSize: '11px' }}>{data.actual_hash}</code></div>
          </div>
        )}

        {/* Tampilkan mismatch Blockchain jika Lapis 3 gagal */}
        {result.status === 'failed_onchain' && (
          <div style={{ marginTop: '8px', padding: '8px', backgroundColor: '#f8d7da', borderRadius: '4px' }}>
            <div style={{ fontWeight: 'bold', color: '#842029', marginBottom: '4px' }}>Detail Mismatch Blockchain:</div>
            <div><span style={{ color: '#842029' }}>Merkle Root di DB: </span><code style={{ fontSize: '11px' }}>{data.db_root}</code></div>
            <div><span style={{ color: '#842029' }}>Merkle Root di Chain: </span><code style={{ fontSize: '11px' }}>{data.chain_root}</code></div>
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
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const response = await api.post('/auth/login', { username, password });
      localStorage.setItem('token', response.data.token);
      onLogin(true);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Gagal login. Periksa kembali kredensial Anda.');
    } finally {
      setIsLoading(false);
    }
  };

  const styles = {
    page: {
      display: 'flex',
      minHeight: '100vh',
      width: '100%',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      backgroundColor: '#f0f4f8',
      overflow: 'hidden',
    },
    // ---- HERO (LEFT) ----
    hero: {
      flex: '0 0 58%',
      background: 'linear-gradient(135deg, #0d47a1 0%, #1565c0 40%, #1e88e5 75%, #42a5f5 100%)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      padding: '48px 56px',
      position: 'relative',
      overflow: 'hidden',
    },
    heroBg: {
      position: 'absolute',
      inset: 0,
      overflow: 'hidden',
      pointerEvents: 'none',
    },
    heroBrand: {
      position: 'relative',
      zIndex: 2,
      display: 'flex',
      alignItems: 'center',
      gap: '14px',
    },
    heroIconBox: {
      width: '52px',
      height: '52px',
      background: 'rgba(255,255,255,0.2)',
      backdropFilter: 'blur(8px)',
      borderRadius: '14px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      border: '1px solid rgba(255,255,255,0.35)',
    },
    heroBrandText: {
      display: 'flex',
      flexDirection: 'column',
    },
    heroBrandName: {
      fontSize: '22px',
      fontWeight: '800',
      color: '#ffffff',
      letterSpacing: '0.04em',
      lineHeight: 1.1,
    },
    heroBrandSub: {
      fontSize: '11px',
      fontWeight: '600',
      color: 'rgba(255,255,255,0.65)',
      letterSpacing: '0.12em',
      textTransform: 'uppercase',
    },
    heroContent: {
      position: 'relative',
      zIndex: 2,
    },
    heroHeadline: {
      fontSize: '38px',
      fontWeight: '700',
      color: '#ffffff',
      lineHeight: '1.2',
      marginBottom: '18px',
      letterSpacing: '-0.02em',
    },
    heroDesc: {
      fontSize: '15px',
      color: 'rgba(255,255,255,0.78)',
      lineHeight: '1.7',
      maxWidth: '420px',
    },
    heroInfoBox: {
      position: 'relative',
      zIndex: 2,
      background: 'rgba(255,255,255,0.12)',
      backdropFilter: 'blur(12px)',
      borderRadius: '16px',
      border: '1px solid rgba(255,255,255,0.25)',
      padding: '20px 24px',
      display: 'flex',
      gap: '16px',
      alignItems: 'flex-start',
    },
    heroInfoIconBox: {
      width: '40px',
      height: '40px',
      background: 'rgba(255,255,255,0.2)',
      borderRadius: '10px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    heroInfoTitle: {
      fontSize: '14px',
      fontWeight: '700',
      color: '#ffffff',
      marginBottom: '4px',
    },
    heroInfoText: {
      fontSize: '12px',
      color: 'rgba(255,255,255,0.70)',
      lineHeight: '1.5',
    },
    // ---- FORM (RIGHT) ----
    formPanel: {
      flex: 1,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 32px',
      backgroundColor: '#f7f9fc',
    },
    formCard: {
      width: '100%',
      maxWidth: '420px',
      backgroundColor: '#ffffff',
      borderRadius: '20px',
      boxShadow: '0 8px 40px rgba(13, 71, 161, 0.10), 0 2px 8px rgba(0,0,0,0.04)',
      border: '1px solid rgba(203,213,225,0.6)',
      padding: '40px 40px 32px',
    },
    formTitle: {
      fontSize: '26px',
      fontWeight: '700',
      color: '#0d1b2e',
      marginBottom: '4px',
      letterSpacing: '-0.02em',
    },
    formSubtitle: {
      fontSize: '14px',
      color: '#64748b',
      marginBottom: '32px',
    },
    fieldGroup: {
      marginBottom: '20px',
    },
    fieldLabel: {
      display: 'block',
      fontSize: '11px',
      fontWeight: '700',
      color: '#334155',
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      marginBottom: '8px',
    },
    fieldWrapper: {
      position: 'relative',
    },
    fieldIcon: {
      position: 'absolute',
      left: '14px',
      top: '50%',
      transform: 'translateY(-50%)',
      color: '#94a3b8',
      display: 'flex',
      alignItems: 'center',
      pointerEvents: 'none',
    },
    fieldInput: {
      width: '100%',
      boxSizing: 'border-box',
      paddingLeft: '44px',
      paddingRight: '14px',
      paddingTop: '12px',
      paddingBottom: '12px',
      fontSize: '14px',
      color: '#0d1b2e',
      backgroundColor: '#f8fafc',
      border: '1.5px solid #e2e8f0',
      borderRadius: '10px',
      outline: 'none',
      transition: 'border-color 0.2s, box-shadow 0.2s, background 0.2s',
      fontFamily: 'inherit',
    },
    fieldInputError: {
      borderColor: '#ef4444',
      backgroundColor: '#fff5f5',
    },
    fieldInputPrRight: {
      paddingRight: '44px',
    },
    toggleBtn: {
      position: 'absolute',
      right: '12px',
      top: '50%',
      transform: 'translateY(-50%)',
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      color: '#94a3b8',
      display: 'flex',
      alignItems: 'center',
      padding: '4px',
      borderRadius: '6px',
      transition: 'color 0.2s',
    },
    rememberRow: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      marginBottom: '28px',
    },
    checkbox: {
      width: '16px',
      height: '16px',
      borderRadius: '4px',
      accentColor: '#1e88e5',
      cursor: 'pointer',
    },
    rememberLabel: {
      fontSize: '13px',
      color: '#64748b',
      cursor: 'pointer',
    },
    submitBtn: {
      width: '100%',
      padding: '13px',
      fontSize: '15px',
      fontWeight: '600',
      color: '#ffffff',
      background: 'linear-gradient(135deg, #1565c0 0%, #1e88e5 100%)',
      border: 'none',
      borderRadius: '10px',
      cursor: 'pointer',
      letterSpacing: '0.01em',
      boxShadow: '0 4px 14px rgba(30, 136, 229, 0.35)',
      transition: 'opacity 0.2s, transform 0.15s, box-shadow 0.2s',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      fontFamily: 'inherit',
    },
    errorBox: {
      display: 'flex',
      alignItems: 'flex-start',
      gap: '10px',
      backgroundColor: '#fef2f2',
      border: '1px solid #fecaca',
      borderRadius: '10px',
      padding: '12px 14px',
      marginBottom: '20px',
    },
    errorText: {
      fontSize: '13px',
      color: '#b91c1c',
      lineHeight: '1.5',
    },
    divider: {
      borderTop: '1px solid #e2e8f0',
      margin: '24px 0',
    },
    securityBox: {
      display: 'flex',
      gap: '10px',
      alignItems: 'flex-start',
      backgroundColor: '#fef9ec',
      border: '1px solid #fde68a',
      borderRadius: '10px',
      padding: '12px 14px',
    },
    securityText: {
      fontSize: '11.5px',
      color: '#92400e',
      lineHeight: '1.5',
    },
    footer: {
      textAlign: 'center',
      marginTop: '24px',
      fontSize: '12px',
      color: '#94a3b8',
    },
  };

  return (
    <div style={styles.page} className="lp-page">
      {/* ===== HERO PANEL ===== */}
      <div style={styles.hero} className="lp-hero">
        {/* Decorative background SVG */}
        <div style={styles.heroBg}>
          <svg width="100%" height="100%" viewBox="0 0 700 900" preserveAspectRatio="xMidYMid slice" style={{ position: 'absolute', inset: 0 }}>
            {/* Grid dots */}
            {Array.from({ length: 12 }).map((_, r) =>
              Array.from({ length: 8 }).map((_, c) => (
                <circle key={`${r}-${c}`} cx={c * 100 + 30} cy={r * 80 + 30} r="1.5" fill="rgba(255,255,255,0.15)" />
              ))
            )}
            {/* Blockchain network lines */}
            <line x1="120" y1="180" x2="280" y2="300" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" />
            <line x1="280" y1="300" x2="460" y2="220" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" />
            <line x1="460" y1="220" x2="580" y2="380" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" />
            <line x1="120" y1="180" x2="460" y2="220" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
            <line x1="280" y1="300" x2="580" y2="380" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
            <line x1="200" y1="500" x2="400" y2="560" stroke="rgba(255,255,255,0.10)" strokeWidth="1.5" />
            <line x1="400" y1="560" x2="560" y2="480" stroke="rgba(255,255,255,0.10)" strokeWidth="1.5" />
            {/* Blockchain nodes */}
            <circle cx="120" cy="180" r="10" fill="rgba(255,255,255,0.25)" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" />
            <circle cx="280" cy="300" r="14" fill="rgba(255,255,255,0.20)" stroke="rgba(255,255,255,0.45)" strokeWidth="1.5" />
            <circle cx="460" cy="220" r="10" fill="rgba(255,255,255,0.25)" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" />
            <circle cx="580" cy="380" r="8" fill="rgba(255,255,255,0.20)" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" />
            <circle cx="200" cy="500" r="12" fill="rgba(255,255,255,0.18)" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" />
            <circle cx="400" cy="560" r="16" fill="rgba(255,255,255,0.20)" stroke="rgba(255,255,255,0.45)" strokeWidth="1.5" />
            <circle cx="560" cy="480" r="9" fill="rgba(255,255,255,0.20)" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" />
            {/* Hash symbols inside nodes */}
            <text x="274" y="305" fontSize="8" textAnchor="middle" fill="rgba(255,255,255,0.7)" fontFamily="monospace">#</text>
            <text x="395" y="565" fontSize="9" textAnchor="middle" fill="rgba(255,255,255,0.7)" fontFamily="monospace">#</text>
            {/* Large decorative circle */}
            <circle cx="620" cy="100" r="180" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="40" />
            <circle cx="-30" cy="750" r="200" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="60" />
          </svg>
        </div>

        {/* Brand */}
        <div style={styles.heroBrand}>
          <div style={styles.heroIconBox}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" fill="rgba(255,255,255,0.9)" />
              <path d="M10 17l-3-3 1.4-1.4 1.6 1.6 4.6-4.6 1.4 1.4L10 17z" fill="#1565c0" />
            </svg>
          </div>
          <div style={styles.heroBrandText}>
            <span style={styles.heroBrandName}>AuditChain</span>
            <span style={styles.heroBrandSub}>Powered by Morbis</span>
          </div>
        </div>

        {/* Headline */}
        <div style={styles.heroContent}>
          <h1 style={styles.heroHeadline}>
            Secure Audit<br />Portal
          </h1>
          <p style={styles.heroDesc}>
            Blockchain-based Audit Log Monitoring System for Hospital Information Systems.
            Ensuring absolute data integrity and regulatory compliance across clinical environments.
          </p>
        </div>

        {/* Info box */}
        <div style={styles.heroInfoBox}>
          <div style={styles.heroInfoIconBox}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" fill="rgba(255,255,255,0.85)" />
            </svg>
          </div>
          <div>
            <div style={styles.heroInfoTitle}>Authorized Access Only</div>
            <div style={styles.heroInfoText}>
              Only authorized auditors and administrators can access this system.
              Your IP address and session are being logged.
            </div>
          </div>
        </div>
      </div>

      {/* ===== FORM PANEL ===== */}
      <div style={styles.formPanel} className="lp-form-panel">
        <div style={styles.formCard} className="lp-form-card">

          {/* Mobile brand header — hidden on desktop, shown on mobile via CSS */}
          <div className="lp-mobile-brand">
            <div style={{
              width: '40px', height: '40px',
              background: 'linear-gradient(135deg, #1565c0, #1e88e5)',
              borderRadius: '11px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(30,136,229,0.35)',
              flexShrink: 0,
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" fill="rgba(255,255,255,0.95)" />
                <path d="M10 17l-3-3 1.4-1.4 1.6 1.6 4.6-4.6 1.4 1.4L10 17z" fill="#1565c0" />
              </svg>
            </div>
            <div>
              <div style={{ fontSize: '18px', fontWeight: '800', color: '#0d1b2e', letterSpacing: '0.02em' }}>AuditChain</div>
              <div style={{ fontSize: '10px', fontWeight: '600', color: '#94a3b8', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Powered by Morbis</div>
            </div>
          </div>

          <div style={{ marginBottom: '28px' }}>
            <h2 style={styles.formTitle}>Sign In</h2>
            <p style={styles.formSubtitle}>Please authenticate to access the portal.</p>
          </div>

          {/* Error */}
          {error && (
            <div style={styles.errorBox}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, marginTop: '1px' }}>
                <circle cx="12" cy="12" r="10" fill="#ef4444" />
                <path d="M12 7v5M12 16v1" stroke="white" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <span style={styles.errorText}>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin}>
            {/* Username */}
            <div style={styles.fieldGroup}>
              <label style={styles.fieldLabel} htmlFor="login-username">Username</label>
              <div style={styles.fieldWrapper}>
                <span style={styles.fieldIcon}>
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2" />
                    <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </span>
                <input
                  id="login-username"
                  type="text"
                  placeholder="Enter your username"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  required
                  autoComplete="username"
                  style={{
                    ...styles.fieldInput,
                    ...(error ? styles.fieldInputError : {}),
                  }}
                  onFocus={e => { e.target.style.borderColor = '#1e88e5'; e.target.style.boxShadow = '0 0 0 3px rgba(30,136,229,0.15)'; e.target.style.backgroundColor = '#fff'; }}
                  onBlur={e => { e.target.style.borderColor = error ? '#ef4444' : '#e2e8f0'; e.target.style.boxShadow = 'none'; e.target.style.backgroundColor = '#f8fafc'; }}
                />
              </div>
            </div>

            {/* Password */}
            <div style={styles.fieldGroup}>
              <label style={styles.fieldLabel} htmlFor="login-password">Password</label>
              <div style={styles.fieldWrapper}>
                <span style={styles.fieldIcon}>
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
                    <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    <circle cx="12" cy="16" r="1.5" fill="currentColor" />
                  </svg>
                </span>
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  style={{
                    ...styles.fieldInput,
                    ...styles.fieldInputPrRight,
                    ...(error ? styles.fieldInputError : {}),
                  }}
                  onFocus={e => { e.target.style.borderColor = '#1e88e5'; e.target.style.boxShadow = '0 0 0 3px rgba(30,136,229,0.15)'; e.target.style.backgroundColor = '#fff'; }}
                  onBlur={e => { e.target.style.borderColor = error ? '#ef4444' : '#e2e8f0'; e.target.style.boxShadow = 'none'; e.target.style.backgroundColor = '#f8fafc'; }}
                />
                <button
                  type="button"
                  style={styles.toggleBtn}
                  onClick={() => setShowPassword(v => !v)}
                  tabIndex={-1}
                  onMouseEnter={e => e.currentTarget.style.color = '#1e88e5'}
                  onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}
                >
                  {showPassword ? (
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      <line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  ) : (
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="2" />
                      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Remember me */}
            <div style={styles.rememberRow}>
              <input
                id="remember-me"
                type="checkbox"
                style={styles.checkbox}
                checked={rememberMe}
                onChange={e => setRememberMe(e.target.checked)}
              />
              <label htmlFor="remember-me" style={styles.rememberLabel}>Remember me</label>
            </div>

            {/* Submit */}
            <button
              type="submit"
              style={{
                ...styles.submitBtn,
                opacity: isLoading ? 0.75 : 1,
                cursor: isLoading ? 'not-allowed' : 'pointer',
              }}
              disabled={isLoading}
              onMouseEnter={e => { if (!isLoading) { e.currentTarget.style.opacity = '0.9'; e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(30,136,229,0.45)'; } }}
              onMouseLeave={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(30,136,229,0.35)'; }}
              onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.98)'; }}
              onMouseUp={e => { e.currentTarget.style.transform = 'none'; }}
            >
              {isLoading ? (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ animation: 'spin 1s linear infinite' }}>
                    <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.35)" strokeWidth="3" />
                    <path d="M12 2a10 10 0 0 1 10 10" stroke="white" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                  Signing in...
                </>
              ) : (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" fill="rgba(255,255,255,0.85)" />
                  </svg>
                  Sign In
                </>
              )}
            </button>
          </form>

          {/* Security notice */}
          <div style={styles.divider} />
          <div style={styles.securityBox}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, marginTop: '1px' }}>
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" fill="#f59e0b" stroke="#d97706" strokeWidth="0.5" />
              <line x1="12" y1="9" x2="12" y2="13" stroke="white" strokeWidth="2" strokeLinecap="round" />
              <line x1="12" y1="17" x2="12.01" y2="17" stroke="white" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <p style={styles.securityText}>
              This portal is restricted to authorized personnel only. All activities are monitored and recorded for security and compliance purposes.
            </p>
          </div>

          {/* Footer */}
          <div style={styles.footer}>
            © 2024 AuditChain by Morbis &nbsp;·&nbsp; Hospital Log Management v2.4.1
          </div>
        </div>
      </div>

      {/* Global styles + responsive */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

        /* ---- Desktop default: hide mobile brand ---- */
        .lp-mobile-brand {
          display: none;
        }

        /* ---- Tablet: collapse hero to narrower strip ---- */
        @media (max-width: 1024px) {
          .lp-hero {
            flex: 0 0 45% !important;
          }
        }

        /* ---- Mobile: hide hero, show top brand header ---- */
        @media (max-width: 768px) {
          .lp-page {
            flex-direction: column !important;
            background: linear-gradient(160deg, #1565c0 0%, #1e88e5 30%, #f7f9fc 30%) !important;
            min-height: 100vh;
          }
          .lp-hero {
            display: none !important;
          }
          .lp-form-panel {
            flex: 1;
            padding: 80px 16px 32px !important;
            background: transparent !important;
            align-items: flex-start !important;
          }
          .lp-form-card {
            border-radius: 16px !important;
            padding: 28px 24px 24px !important;
            box-shadow: 0 8px 40px rgba(0,0,0,0.14) !important;
          }
          .lp-mobile-brand {
            display: flex !important;
            align-items: center;
            gap: 12px;
            margin-bottom: 24px;
          }
        }

        /* ---- Small phones ---- */
        @media (max-width: 480px) {
          .lp-form-panel {
            padding: 70px 12px 24px !important;
          }
          .lp-form-card {
            border-radius: 14px !important;
            padding: 24px 18px 20px !important;
          }
        }
      `}</style>
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