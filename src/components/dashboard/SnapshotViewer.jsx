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

  // DELETE — show before (green, normal) and after (red, strikethrough)
  if (currentLog?.action === 'DELETE') {
    const deleteSource = Object.keys(previousData).length > 0 ? previousData : currentData;
    const deleteKeys = [...new Set([...Object.keys(deleteSource)])].filter(k => !SKIP.has(k));

    return (
      <table className="ac-diff">
        <thead>
          <tr>
            <th>Column</th>
            <th className="after">Before</th>
            <th className="before">After</th>
          </tr>
        </thead>
        <tbody>
          {deleteKeys.map(k => {
            const beforeVal = String(deleteSource[k] ?? '—');
            return (
              <tr key={k}>
                <td className="field">{k}</td>
                <td className="val-after">{beforeVal}</td>
                <td className="val-deleted">{beforeVal}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    );
  }

  // UPDATE — show all columns directly (both changed and unchanged)
  const changedKeysSet = new Set(
    allKeys.filter(k => String(currentData[k] ?? '') !== String(previousData[k] ?? ''))
  );

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
          {allKeys.map(k => {
            const isChanged = changedKeysSet.has(k);
            const beforeVal = String(previousData[k] ?? '—');
            const afterVal = String(currentData[k] ?? '—');

            return (
              <tr key={k} style={!isChanged ? { opacity: 0.85 } : undefined}>
                <td className="field" style={!isChanged ? { color: 'var(--color-outline)', fontWeight: 'normal' } : {}}>
                  {k} {!isChanged && <span style={{ fontSize: '10px', color: 'var(--color-outline)', fontWeight: 'normal', marginLeft: '4px' }}>(unchanged)</span>}
                </td>
                <td className={isChanged ? 'val-before' : 'val-unchanged'}>{beforeVal}</td>
                <td className={isChanged ? 'val-after' : 'val-unchanged'}>{afterVal}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export { SnapshotViewer };
export default SnapshotViewer;
