// JWT payload parser helper
export const parseJwt = (token) => {
  try {
    if (!token) return null;
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      window.atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
};

// Formatter timestamp dengan milidetik (misal: 3/7/2026, 16.26.42.123)
export const formatTimestamp = (dateString) => {
  if (!dateString) return '—';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return dateString;

  const day = d.getDate();
  const month = d.getMonth() + 1;
  const year = d.getFullYear();

  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  const ms = String(d.getMilliseconds()).padStart(3, '0');

  return `${day}/${month}/${year}, ${hours}.${minutes}.${seconds}.${ms}`;
};

// Helper mapper range status
export const mapRangeItemToVerifyStatus = (item) => {
  const statusMap = {
    success: 'success',
    pending: 'pending',
    failed_local: 'failed_local',
    failed_onchain: 'failed_onchain',
  };
  const status = statusMap[item.verify_status] || 'failed';

  return {
    status,
    message: item.message,
    data: {
      log_id: item.log_id,
      is_valid: status === 'success',
      message: item.message,
      expected_hash: item.expected_hash || item.hash_value,
      actual_hash: item.actual_hash,
      blockchain_tx_id: item.blockchain_tx_id,
      db_root: item.merkle_root,
    },
  };
};

// Formatter cell metadata (container JSON horizontal scrollable)
export const renderMetadataCell = (metadata) => {
  if (!metadata) return <span style={{ color: 'var(--color-outline)', fontSize: '11px' }}>—</span>;
  let displayStr = '';
  if (typeof metadata === 'string') {
    displayStr = metadata;
  } else {
    try {
      displayStr = JSON.stringify(metadata);
    } catch (e) {
      displayStr = String(metadata);
    }
  }
  return (
    <div className="ac-metadata-box" title={displayStr}>
      {displayStr}
    </div>
  );
};
