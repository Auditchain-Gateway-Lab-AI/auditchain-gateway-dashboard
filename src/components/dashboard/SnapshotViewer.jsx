import React from 'react';

// ================================================================
// KOMPONEN: Snapshot Viewer — diff view
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
    return <span style={{ color: 'var(--color-on-surface-variant)', fontSize: '12px' }}>Tidak ada data metadata</span>;
  }

  // INSERT — no previous, show all new values
  if (!previousLog || Object.keys(previousData).length === 0) {
    return (
      <table className="ac-diff">
        <tbody>
          {allKeys.map(k => (
            <tr key={k}>
              <td className="field">{k}</td>
              <td className="val-new">{String(currentData[k] ?? '—')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  // DELETE — show last data with strikethrough
  if (currentLog?.action === 'DELETE') {
    return (
      <table className="ac-diff">
        <tbody>
          {allKeys.map(k => (
            <tr key={k}>
              <td className="field">{k}</td>
              <td className="val-deleted">{String(previousData[k] ?? '—')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  // UPDATE — only show changed fields
  const changed = allKeys.filter(k => String(currentData[k] ?? '') !== String(previousData[k] ?? ''));
  const unchanged = allKeys.filter(k => String(currentData[k] ?? '') === String(previousData[k] ?? ''));

  if (changed.length === 0) {
    return (
      <div>
        <span style={{ color: 'var(--color-on-surface-variant)', fontSize: '12px' }}>No column changes detected</span>
        <table className="ac-diff" style={{ marginTop: '6px' }}>
          <tbody>
            {unchanged.map(k => (
              <tr key={k}>
                <td className="field" style={{ color: 'var(--color-outline)' }}>{k}</td>
                <td className="val-unchanged">{String(currentData[k] ?? '—')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div>
      <table className="ac-diff">
        <thead>
          <tr>
            <th>Column</th>
            <th className="before">Before</th>
            <th className="after">After</th>
          </tr>
        </thead>
        <tbody>
          {changed.map(k => (
            <tr key={k}>
              <td className="field">{k}</td>
              <td className="val-before">{String(previousData[k] ?? '—')}</td>
              <td className="val-after">{String(currentData[k] ?? '—')}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {unchanged.length > 0 && (
        <details style={{ marginTop: '6px' }}>
          <summary style={{ fontSize: '11px', color: 'var(--color-on-surface-variant)', cursor: 'pointer' }}>
            {unchanged.length} columns unchanged
          </summary>
          <table className="ac-diff" style={{ marginTop: '4px' }}>
            <tbody>
              {unchanged.map(k => (
                <tr key={k}>
                  <td className="field" style={{ color: 'var(--color-outline)' }}>{k}</td>
                  <td className="val-unchanged">{String(currentData[k] ?? '—')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      )}
    </div>
  );
}

export { SnapshotViewer };
export default SnapshotViewer;
